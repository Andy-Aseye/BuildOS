import { Injectable, Logger } from '@nestjs/common';
import {
  CostSource,
  CostStatus,
  MessageType,
  Prisma,
  ProcessingStatus,
  MessageDirection,
  ProjectStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { env } from '../config/env';
import { supabaseAdmin } from '../auth/supabase';
import { WhatsAppCloudService } from './whatsapp-cloud.service';
import { WhatsAppOpenAiService } from './whatsapp-openai.service';
import type { Classification } from './whatsapp-openai.service';
import type { WhatsAppInboundMessage, WhatsAppWebhookPayload } from './whatsapp.types';

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
  ) {}

  async processWebhookPayload(payload: WhatsAppWebhookPayload): Promise<void> {
    const entries = payload.entry ?? [];
    for (const entry of entries) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        const messages = value?.messages ?? [];
        const phoneNumberId = value?.metadata?.phone_number_id;
        const toPhone = value?.metadata?.display_phone_number ?? phoneNumberId ?? '';

        for (const msg of messages) {
          try {
            await this.processOneInbound(msg, toPhone);
          } catch (e) {
            this.logger.error(`Message ${msg.id} failed`, e);
          }
        }
      }
    }
  }

  private async processOneInbound(msg: WhatsAppInboundMessage, toPhone: string): Promise<void> {
    const fromPhone = normalizePhone(msg.from);
    const whatsappMsgId = msg.id;

    const existing = await this.prisma.whatsappMessage.findUnique({
      where: { whatsappMsgId },
    });
    if (existing) {
      this.logger.debug(`Duplicate message ${whatsappMsgId}, skipping`);
      return;
    }

    const extracted = await this.extractContent(msg);
    const { messageType, textBody, publicMedia } = extracted;

    const user = await this.findUserByPhone(fromPhone);
    if (!user) {
      await this.prisma.whatsappMessage.create({
        data: {
          direction: MessageDirection.INBOUND,
          whatsappMsgId,
          fromPhone,
          toPhone: normalizePhone(toPhone) || 'unknown',
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
      });
      await this.safeReply(
        fromPhone,
        'Welcome to BuildOS. Ask your company admin to add your WhatsApp number to your account, then try again.',
      );
      return;
    }

    const project = await this.resolveProject(user.tenantId, user.id, textBody);
    if (!project) {
      await this.prisma.whatsappMessage.create({
        data: {
          tenantId: user.tenantId,
          direction: MessageDirection.INBOUND,
          whatsappMsgId,
          fromPhone,
          toPhone: normalizePhone(toPhone) || 'unknown',
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
      });
      await this.safeReply(
        fromPhone,
        'Please include your project code in the message, e.g. #ABC-01, or ask your PM which project to use.',
      );
      return;
    }

    const combinedText = [textBody, publicMedia?.transcription].filter(Boolean).join('\n').trim();
    const classification = await this.openai.classify(combinedText || textBody || '');

    let wmId: string;
    try {
      const row = await this.prisma.whatsappMessage.create({
        data: {
          tenantId: user.tenantId,
          projectId: project.id,
          direction: MessageDirection.INBOUND,
          whatsappMsgId,
          fromPhone,
          toPhone: normalizePhone(toPhone) || 'unknown',
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
      });
      wmId = row.id;
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? (e as { code: string }).code : '';
      if (code === 'P2002') return;
      throw e;
    }

    await this.applyIntent({
      tenantId: user.tenantId,
      projectId: project.id,
      projectCode: project.code,
      userId: user.id,
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
    await this.safeReply(fromPhone, `✅ Logged to ${project.code} — ${summary}`);
  }

  private async extractContent(msg: WhatsAppInboundMessage): Promise<{
    messageType: MessageType;
    textBody: string | null;
    publicMedia: PublicMedia | null;
  }> {
    const t = msg.type;
    if (t === 'text') {
      return { messageType: MessageType.TEXT, textBody: msg.text?.body ?? null, publicMedia: null };
    }
    if (t === 'image') {
      const stored = await this.downloadAndStoreMedia(msg.image?.id, msg.image?.mime_type, 'jpg');
      return {
        messageType: MessageType.IMAGE,
        textBody: msg.image?.caption ?? null,
        publicMedia: stored ? this.toPublicMedia(stored) : null,
      };
    }
    if (t === 'audio') {
      const stored = await this.downloadAndStoreMedia(msg.audio?.id, msg.audio?.mime_type, 'ogg');
      if (!stored) {
        return { messageType: MessageType.VOICE_NOTE, textBody: null, publicMedia: null };
      }
      const transcription = await this.openai.transcribeAudio(stored.buffer, 'voice.ogg');
      return {
        messageType: MessageType.VOICE_NOTE,
        textBody: null,
        publicMedia: {
          publicUrl: stored.publicUrl,
          mimeType: stored.mimeType,
          transcription: transcription || null,
        },
      };
    }
    if (t === 'video') {
      const stored = await this.downloadAndStoreMedia(msg.video?.id, msg.video?.mime_type, 'mp4');
      return { messageType: MessageType.VIDEO, textBody: null, publicMedia: stored ? this.toPublicMedia(stored) : null };
    }
    if (t === 'document') {
      const stored = await this.downloadAndStoreMedia(msg.document?.id, msg.document?.mime_type, 'bin');
      return { messageType: MessageType.DOCUMENT, textBody: null, publicMedia: stored ? this.toPublicMedia(stored) : null };
    }

    return { messageType: MessageType.TEXT, textBody: JSON.stringify(msg).slice(0, 2000), publicMedia: null };
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

  private async downloadAndStoreMedia(
    mediaId: string | undefined,
    mimeType: string | undefined,
    ext: string,
  ): Promise<null | {
    publicUrl: string | null;
    mimeType: string | null;
    transcription: null;
    buffer: Buffer;
  }> {
    if (!mediaId) return null;
    try {
      const meta = await this.cloud.getMediaUrl(mediaId);
      const buffer = await this.cloud.downloadMediaFromUrl(meta.url);
      const bucket = env.WHATSAPP_MEDIA_BUCKET ?? 'whatsapp-media';
      const path = `inbound/${mediaId}.${ext}`;
      const { error } = await supabaseAdmin.storage.from(bucket).upload(path, buffer, {
        contentType: mimeType ?? 'application/octet-stream',
        upsert: true,
      });
      if (error) {
        this.logger.warn(`Supabase upload skipped (${bucket}): ${error.message}`);
        return {
          publicUrl: null,
          mimeType: mimeType ?? meta.mime_type ?? null,
          transcription: null,
          buffer,
        };
      }
      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      return {
        publicUrl: data.publicUrl,
        mimeType: mimeType ?? meta.mime_type ?? null,
        transcription: null,
        buffer,
      };
    } catch (e) {
      this.logger.error('downloadAndStoreMedia failed', e);
      return null;
    }
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

  private async applyIntent(args: {
    tenantId: string;
    projectId: string;
    projectCode: string;
    userId: string;
    messageType: MessageType;
    textBody: string;
    classification: Classification;
    rawMessageId: string;
    media: PublicMedia | null;
  }): Promise<void> {
    const { tenantId, projectId, userId, messageType, textBody, classification, rawMessageId, media } = args;
    const intent = classification.intent;
    const now = new Date();

    if (intent === 'cost_entry' && classification.amount != null && classification.amount > 0) {
      await this.prisma.costEntry.create({
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
      });
    }

    if (intent === 'attendance') {
      const wc = classification.workerCount ?? 1;
      await this.prisma.attendanceLog.create({
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
      const log = await this.prisma.dailyLog.create({
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
        await this.prisma.dailyLogPhoto.create({
          data: {
            dailyLogId: log.id,
            storageUrl: media.publicUrl,
            caption: null,
          },
        });
      }
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
