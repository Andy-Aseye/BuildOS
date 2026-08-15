import { Injectable, Logger } from '@nestjs/common';
import {
  CostSource,
  CostStatus,
  MessageType,
  Prisma,
  ProcessingStatus,
  MessageDirection,
  ProjectStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { env } from '../config/env';
import { supabaseAdmin } from '../auth/supabase';
import { WhatsAppCloudService } from './whatsapp-cloud.service';
import { WhatsAppOpenAiService } from './whatsapp-openai.service';
import { AiQueryService } from '../ai-query/ai-query.service';
import type { Classification } from './whatsapp-openai.service';
import type { TwilioInboundMessage, WhatsAppWebhookPayload } from './whatsapp.types';

const CODE_IN_TEXT = /(?:^|\s)#([A-Za-z0-9]+-[A-Za-z0-9]+)/;

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

type PublicMedia = {
  publicUrl: string | null;
  mimeType: string | null;
  transcription: string | null;
};

@Injectable()
export class WhatsAppProcessorService {
  private readonly logger = new Logger(WhatsAppProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: WhatsAppCloudService,
    private readonly openai: WhatsAppOpenAiService,
    private readonly aiQuery: AiQueryService,
  ) {}

  async processWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
    const message = this.parseTwilioPayload(payload);
    this.logger.log(`processWebhookPayload — twilio message id=${message.id} from=${message.from} numMedia=${message.numMedia}`);
    try {
      await this.processOneInbound(message);
    } catch (e) {
      this.logger.error(`Message ${message.id} failed`, e);
    }
  }

  private parseTwilioPayload(payload: WhatsAppWebhookPayload): TwilioInboundMessage {
    const numMedia = Number(payload.NumMedia ?? '0') || 0;
    const media = [] as { url: string; contentType?: string }[];
    for (let i = 0; i < numMedia; i += 1) {
      const url = payload[`MediaUrl${i}`];
      const contentType = payload[`MediaContentType${i}`];
      if (url) {
        media.push({ url, contentType });
      }
    }

    return {
      from: payload.From ?? '',
      to: payload.To ?? '',
      id: payload.MessageSid ?? payload.SmsMessageSid ?? payload.SmsSid ?? 'unknown',
      timestamp: payload.Timestamp ?? `${Math.floor(Date.now() / 1000)}`,
      body: payload.Body ?? null,
      numMedia,
      media,
    };
  }

  private async processOneInbound(msg: TwilioInboundMessage): Promise<void> {
    const fromPhone = normalizePhone(msg.from);
    const whatsappMsgId = msg.id;
    this.logger.log(`Processing inbound message id=${whatsappMsgId} from=${fromPhone}`);

    // Only short-circuit on terminal states. PROCESSING/PENDING means a previous attempt
    // crashed mid-flight; let the retry proceed and we'll UPDATE the row instead of INSERT.
    const existing = await this.prisma.whatsappMessage.findUnique({
      where: { whatsappMsgId },
    });
    if (
      existing &&
      (existing.processingStatus === ProcessingStatus.COMPLETED ||
        existing.processingStatus === ProcessingStatus.FAILED)
    ) {
      this.logger.warn(`Message ${whatsappMsgId} already in terminal state ${existing.processingStatus} — skipping`);
      return;
    }

    const extracted = await this.extractContent(msg);
    const { messageType, textBody, publicMedia } = extracted;

    const user = await this.findUserByPhone(fromPhone);
    if (!user) {
      await this.prisma.whatsappMessage.upsert({
        where: { whatsappMsgId },
        create: {
          direction: MessageDirection.INBOUND,
          whatsappMsgId,
          fromPhone,
          toPhone: normalizePhone(msg.to) || 'unknown',
          messageType,
          textContent: textBody,
          mediaUrl: publicMedia?.publicUrl ?? null,
          mediaType: publicMedia?.mimeType ?? null,
          transcription: publicMedia?.transcription ?? null,
          processingStatus: ProcessingStatus.COMPLETED,
          receivedAt: new Date(Number(msg.timestamp) * 1000),
          processedAt: new Date(),
          classifiedAs: 'unknown_sender',
        },
        update: {
          processingStatus: ProcessingStatus.COMPLETED,
          processedAt: new Date(),
          classifiedAs: 'unknown_sender',
        },
      });
      await this.safeReply(
        fromPhone,
        'Welcome to BuildOS. Ask your company admin to add your WhatsApp number to your account, then try again.',
      );
      return;
    }

    const combinedText = [textBody, publicMedia?.transcription].filter(Boolean).join('\n').trim();
    const classification = await this.openai.classify(combinedText || textBody || '');

    // Questions use the same tenant-scoped assistant as the dashboard. A project
    // code is not required because the assistant can query all permitted data in
    // the sender's tenant.
    if (classification.intent === 'question') {
      await this.processAiQuestion({
        whatsappMsgId,
        fromPhone,
        toPhone: normalizePhone(msg.to) || 'unknown',
        receivedAt: new Date(Number(msg.timestamp) * 1000),
        messageType,
        textBody: combinedText || textBody || '',
        publicMedia,
        tenantId: user.tenantId,
        userId: user.id,
        userRole: user.role,
      });
      return;
    }

    const project = await this.resolveProject(user.tenantId, user.id, textBody);
    if (!project) {
      await this.prisma.whatsappMessage.upsert({
        where: { whatsappMsgId },
        create: {
          tenantId: user.tenantId,
          direction: MessageDirection.INBOUND,
          whatsappMsgId,
          fromPhone,
          toPhone: normalizePhone(msg.to) || 'unknown',
          messageType,
          textContent: textBody,
          mediaUrl: publicMedia?.publicUrl ?? null,
          mediaType: publicMedia?.mimeType ?? null,
          transcription: publicMedia?.transcription ?? null,
          senderId: user.id,
          processingStatus: ProcessingStatus.COMPLETED,
          receivedAt: new Date(Number(msg.timestamp) * 1000),
          processedAt: new Date(),
          classifiedAs: 'no_project',
        },
        update: {
          tenantId: user.tenantId,
          senderId: user.id,
          processingStatus: ProcessingStatus.COMPLETED,
          processedAt: new Date(),
          classifiedAs: 'no_project',
        },
      });
      await this.safeReply(
        fromPhone,
        'Please include your project code in the message, e.g. #ABC-01, or ask your PM which project to use.',
      );
      return;
    }

    // Use upsert so retries on a stuck PROCESSING row update in place rather than
    // hitting the @unique whatsappMsgId constraint.
    const row = await this.prisma.whatsappMessage.upsert({
      where: { whatsappMsgId },
      create: {
        tenantId: user.tenantId,
        projectId: project.id,
        direction: MessageDirection.INBOUND,
        whatsappMsgId,
        fromPhone,
        toPhone: normalizePhone(msg.to) || 'unknown',
        messageType,
        textContent: textBody,
        mediaUrl: publicMedia?.publicUrl ?? null,
        mediaType: publicMedia?.mimeType ?? null,
        transcription: publicMedia?.transcription ?? null,
        senderId: user.id,
        processingStatus: ProcessingStatus.PROCESSING,
        receivedAt: new Date(Number(msg.timestamp) * 1000),
        classifiedAs: classification.intent,
        extractedData: classification as unknown as Prisma.InputJsonValue,
      },
      update: {
        tenantId: user.tenantId,
        projectId: project.id,
        senderId: user.id,
        processingStatus: ProcessingStatus.PROCESSING,
        classifiedAs: classification.intent,
        extractedData: classification as unknown as Prisma.InputJsonValue,
      },
    });
    const wmId = row.id;

    try {
      await this.applyIntent({
        tenantId: user.tenantId,
        projectId: project.id,
        projectCode: project.code,
        userId: user.id,
        userName: user.name ?? null,
        messageType,
        textBody: combinedText || textBody || '',
        classification,
        rawMessageId: wmId,
        media: publicMedia,
      });

      await this.prisma.whatsappMessage.update({
        where: { id: wmId },
        data: { processingStatus: ProcessingStatus.COMPLETED, processedAt: new Date() },
      });

      const summary = classification.summary ?? combinedText.slice(0, 120) ?? 'Received';
      this.logger.log(`Message ${whatsappMsgId} processed — intent=${classification.intent}, project=${project.code}`);
      await this.safeReply(fromPhone, `✅ Logged to ${project.code} — ${summary}`);
    } catch (err) {
      this.logger.error(`Message ${whatsappMsgId} processing failed`, err);
      await this.prisma.whatsappMessage
        .update({
          where: { id: wmId },
          data: { processingStatus: ProcessingStatus.FAILED, processedAt: new Date() },
        })
        .catch((e) => this.logger.warn(`Failed to mark message FAILED: ${e}`));

      // Always reply, even on failure. Duplicates from
      // pg-boss retries are acceptable; for tighter UX, configure pg-boss retry options
      // in whatsapp-worker.registrar so this only fires after final retry exhaustion.
      await this.safeReply(
        fromPhone,
        "Sorry — we couldn't process your last message. Please try again, or contact your project manager.",
      );

      throw err; // rethrow so pg-boss records the failure and applies its retry policy
    }
  }

  private async extractContent(msg: TwilioInboundMessage): Promise<{
    messageType: MessageType;
    textBody: string | null;
    publicMedia: PublicMedia | null;
  }> {
    const textBody = msg.body ?? null;
    if (msg.media.length === 0) {
      return { messageType: MessageType.TEXT, textBody, publicMedia: null };
    }

    const primaryMedia = msg.media[0];
    const mediaType = primaryMedia.contentType?.toLowerCase() ?? '';
    const isImage = mediaType.startsWith('image/');
    const isAudio = mediaType.startsWith('audio/');
    const isVideo = mediaType.startsWith('video/');
    const ext = isAudio ? 'ogg' : isVideo ? 'mp4' : isImage ? 'jpg' : 'bin';
    const stored = await this.downloadAndStoreMediaUrl(primaryMedia.url, primaryMedia.contentType, ext);

    if (isAudio) {
      if (!stored) {
        return { messageType: MessageType.VOICE_NOTE, textBody, publicMedia: null };
      }
      const transcription = await this.openai.transcribeAudio(stored.buffer, 'voice.ogg');
      return {
        messageType: MessageType.VOICE_NOTE,
        textBody,
        publicMedia: {
          publicUrl: stored.publicUrl,
          mimeType: stored.mimeType,
          transcription: transcription || null,
        },
      };
    }

    if (isImage) {
      return {
        messageType: MessageType.IMAGE,
        textBody,
        publicMedia: stored ? this.toPublicMedia(stored) : null,
      };
    }

    if (isVideo) {
      return {
        messageType: MessageType.VIDEO,
        textBody,
        publicMedia: stored ? this.toPublicMedia(stored) : null,
      };
    }

    return {
      messageType: MessageType.DOCUMENT,
      textBody,
      publicMedia: stored ? this.toPublicMedia(stored) : null,
    };
  }

  private async downloadAndStoreMediaUrl(
    url: string,
    mimeType: string | undefined,
    ext: string,
  ): Promise<null | { publicUrl: string | null; mimeType: string | null; transcription: string | null; buffer: Buffer }> {
    if (!url) return null;
    try {
      const buffer = await this.cloud.downloadMediaFromUrl(url);
      const bucket = env.WHATSAPP_MEDIA_BUCKET ?? 'whatsapp-media';
      const path = `inbound/${encodeURIComponent(url)}.${ext}`;
      const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
        contentType: mimeType ?? 'application/octet-stream',
        upsert: true,
      });
      if (error) {
        this.logger.warn(`Supabase upload skipped (${bucket}): ${error.message}`);
        return {
          publicUrl: null,
          mimeType: mimeType ?? null,
          transcription: null,
          buffer,
        };
      }
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      return {
        publicUrl: data.publicUrl,
        mimeType: mimeType ?? null,
        transcription: null,
        buffer,
      };
    } catch (e) {
      this.logger.error('downloadAndStoreMediaUrl failed', e);
      return null;
    }
  }

  private toPublicMedia(stored: {
    publicUrl: string | null;
    mimeType: string | null;
    transcription: string | null;
  }): PublicMedia {
    return {
      publicUrl: stored.publicUrl,
      mimeType: stored.mimeType,
      transcription: stored.transcription,
    };
  }


  private async findUserByPhone(digits: string) {
    const withPlus = digits.startsWith('0') ? digits : `+${digits}`;
    const tail = digits.length >= 10 ? digits.slice(-10) : digits;
    const or: Prisma.UserWhereInput[] = [{ whatsappPhone: digits }, { whatsappPhone: withPlus }];
    if (tail.length >= 10) or.push({ whatsappPhone: { endsWith: tail } });
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: or,
      },
    });
  }

  private async resolveProject(
    tenantId: string,
    userId: string,
    textBody: string | null,
  ): Promise<{ id: string; code: string } | null> {
    const m = textBody?.match(CODE_IN_TEXT);
    if (m?.[1]) {
      const code = m[1].toUpperCase();
      const p = await this.prisma.project.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          code: { equals: code, mode: 'insensitive' },
        },
        select: { id: true, code: true },
      });
      if (p) return p;
    }

    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId,
        leftAt: null,
        project: { tenantId, deletedAt: null, status: ProjectStatus.ACTIVE },
      },
      select: { project: { select: { id: true, code: true } } },
    });
    if (memberships.length === 1) {
      const p = memberships[0].project;
      return { id: p.id, code: p.code };
    }

    const last = await this.prisma.whatsappMessage.findFirst({
      where: { senderId: userId, tenantId, projectId: { not: null } },
      orderBy: { receivedAt: 'desc' },
      select: { projectId: true },
    });
    if (last?.projectId) {
      const p = await this.prisma.project.findFirst({
        where: { id: last.projectId, tenantId, deletedAt: null },
        select: { id: true, code: true },
      });
      if (p) return p;
    }

    return null;
  }

  private async processAiQuestion(args: {
    whatsappMsgId: string;
    fromPhone: string;
    toPhone: string;
    receivedAt: Date;
    messageType: MessageType;
    textBody: string;
    publicMedia: PublicMedia | null;
    tenantId: string;
    userId: string;
    userRole: UserRole;
  }): Promise<void> {
    const {
      whatsappMsgId,
      fromPhone,
      toPhone,
      receivedAt,
      messageType,
      textBody,
      publicMedia,
      tenantId,
      userId,
      userRole,
    } = args;

    const row = await this.prisma.whatsappMessage.upsert({
      where: { whatsappMsgId },
      create: {
        tenantId,
        direction: MessageDirection.INBOUND,
        whatsappMsgId,
        fromPhone,
        toPhone,
        messageType,
        textContent: textBody || null,
        mediaUrl: publicMedia?.publicUrl ?? null,
        mediaType: publicMedia?.mimeType ?? null,
        transcription: publicMedia?.transcription ?? null,
        senderId: userId,
        processingStatus: ProcessingStatus.PROCESSING,
        receivedAt,
        classifiedAs: 'question',
      },
      update: {
        tenantId,
        senderId: userId,
        processingStatus: ProcessingStatus.PROCESSING,
        classifiedAs: 'question',
      },
    });

    try {
      if (userRole !== UserRole.OWNER && userRole !== UserRole.PROJECT_MANAGER) {
        await this.safeReply(
          fromPhone,
          'The BuildOS AI assistant is available to owners and project managers. You can still send site updates, attendance, and costs here.',
        );
      } else if (!textBody.trim()) {
        await this.safeReply(fromPhone, 'Please send your question as text, or include a voice note with a clear transcription.');
      } else {
        const { answer } = await this.aiQuery.query(tenantId, userId, textBody.trim());
        await this.safeReply(fromPhone, answer);
      }

      await this.prisma.whatsappMessage.update({
        where: { id: row.id },
        data: { processingStatus: ProcessingStatus.COMPLETED, processedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.whatsappMessage
        .update({
          where: { id: row.id },
          data: { processingStatus: ProcessingStatus.FAILED, processedAt: new Date() },
        })
        .catch((e) => this.logger.warn(`Failed to mark AI question FAILED: ${e}`));
      await this.safeReply(
        fromPhone,
        "Sorry — I couldn't answer that question right now. Please try again shortly.",
      );
      throw err;
    }
  }

  private async applyIntent(args: {
    tenantId: string;
    projectId: string;
    projectCode: string;
    userId: string;
    userName: string | null;
    messageType: MessageType;
    textBody: string;
    classification: Classification;
    rawMessageId: string;
    media: PublicMedia | null;
  }): Promise<void> {
    const {
      tenantId,
      projectId,
      projectCode,
      userId,
      userName,
      messageType,
      textBody,
      classification,
      rawMessageId,
      media,
    } = args;
    const intent = classification.intent;
    const now = new Date();

    // Collect side-effects to run AFTER the transaction commits, so we never send
    // a WhatsApp/notification for data that ultimately rolled back.
    type PostCommitNotice = {
      pmPhones: string[];
      whatsappBody: string;
    };

    const postCommit = await this.prisma.$transaction<PostCommitNotice | null>(async (tx) => {
      let createdCost: { id: string; amount: Prisma.Decimal; currency: string } | null = null;

      if (intent === 'cost_entry' && classification.amount != null && classification.amount > 0) {
        createdCost = await tx.costEntry.create({
          data: {
            projectId,
            tenantId,
            source: CostSource.WHATSAPP_AI,
            status: CostStatus.PENDING_CONFIRMATION,
            description: classification.summary ?? textBody.slice(0, 500),
            category: this.openai.mapCategory(classification.category),
            currency: this.openai.mapCurrency(classification.currency),
            amount: new Prisma.Decimal(classification.amount),
            loggedById: userId,
            rawMessageId,
          },
          select: { id: true, amount: true, currency: true },
        });
      }

      if (intent === 'attendance') {
        const wc = classification.workerCount ?? 1;
        await tx.attendanceLog.create({
          data: {
            projectId,
            tenantId,
            logDate: now,
            workerCount: wc,
            reportedById: userId,
            rawMessageId,
          },
        });
      }

      if (
        intent === 'site_update' ||
        intent === 'incident' ||
        intent === 'question' ||
        intent === 'material_delivery' ||
        intent === 'unclassified' ||
        intent === 'cost_entry'
      ) {
        const log = await tx.dailyLog.create({
          data: {
            projectId,
            tenantId,
            logDate: now,
            submittedById: userId,
            rawContent: textBody.slice(0, 20_000),
            aiSummary: classification.summary ?? null,
            activities: [],
            incidents: intent === 'incident' ? [textBody.slice(0, 500)] : [],
            source: messageType,
            rawMessageId,
          },
        });

        if (messageType === MessageType.IMAGE && media?.publicUrl) {
          await tx.dailyLogPhoto.create({
            data: {
              dailyLogId: log.id,
              storageUrl: media.publicUrl,
              caption: null,
            },
          });
        }
      }

      // PM notification on WhatsApp cost submission — write Notification rows inside
      // the transaction so they roll back with the cost. WhatsApp send happens after commit.
      if (!createdCost) return null;

      const pms = await tx.user.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          role: { in: [UserRole.OWNER, UserRole.PROJECT_MANAGER] },
        },
        select: { id: true, whatsappPhone: true },
      });

      const submitterName = userName ?? 'A team member';
      const amount = Number(createdCost.amount).toLocaleString(undefined, { maximumFractionDigits: 2 });
      const currency = createdCost.currency;
      const summary = classification.summary ?? textBody.slice(0, 120);
      const title = `New cost on ${projectCode}: ${currency} ${amount}`;
      const body = `${submitterName} submitted ${currency} ${amount} (${summary}) — pending confirmation.`;
      const whatsappBody = `${projectCode}: ${currency} ${amount} ${summary} submitted by ${submitterName}. Open BuildOS dashboard to confirm or reject.`;

      if (pms.length) {
        await tx.notification.createMany({
          data: pms.map((pm) => ({
            tenantId,
            userId: pm.id,
            type: 'cost.submitted',
            title,
            body,
            link: `/projects/${projectId}/costs`,
          })),
        });
      }

      return {
        pmPhones: [...new Set(pms.map((pm) => pm.whatsappPhone).filter(Boolean) as string[])],
        whatsappBody,
      };
    });

    if (postCommit && postCommit.pmPhones.length) {
      const phones = postCommit.pmPhones;
      const whatsappBody = postCommit.whatsappBody;
      void Promise.allSettled(
        phones.map((phone: string) =>
          this.cloud.sendTextMessage(phone, whatsappBody).catch((e) => {
            this.logger.warn(`PM cost-submission notify failed for ${phone}: ${e}`);
          }),
        ),
      );
    }
  }

  private async safeReply(toDigits: string, body: string): Promise<void> {
    try {
      await this.cloud.sendTextMessage(toDigits, body);
    } catch (e) {
      this.logger.error('Outbound reply failed', e);
    }
  }
}
