import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.module';
import { StorageService } from '../storage/storage.service';
import { env } from '../config/env';
import { UpdateProgressReportDto } from './progress-reports.dto';

@Injectable()
export class ProgressReportsService {
  private readonly logger = new Logger(ProgressReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  async findAllForProject(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.progressReport.findMany({
      where: { projectId, tenantId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async findOneForProject(
    id: string,
    projectId: string,
    tenantId: string,
  ) {
    const row = await this.prisma.progressReport.findFirst({
      where: { id, projectId, tenantId },
    });
    if (!row) throw new NotFoundException('Report not found');
    return row;
  }

  async createFromUpload(params: {
    projectId: string;
    tenantId: string;
    userId: string;
    file: Express.Multer.File;
    periodStart: string;
    periodEnd: string;
    narrativeSummary: string;
  }) {
    const { projectId, tenantId, userId, file } = params;
    await this.requireProject(projectId, tenantId);

    if (!file?.buffer?.length) {
      throw new BadRequestException('PDF file is required');
    }

    const narrative = params.narrativeSummary?.trim();
    if (!narrative) {
      throw new BadRequestException('narrativeSummary is required');
    }

    const periodStart = new Date(params.periodStart);
    const periodEnd = new Date(params.periodEnd);
    if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
      throw new BadRequestException('Invalid periodStart or periodEnd');
    }
    if (periodEnd < periodStart) {
      throw new BadRequestException('periodEnd must be on or after periodStart');
    }

    const storageUrl = await this.storage.uploadPublicObject({
      tenantId,
      projectId,
      folder: 'progress-reports',
      filename: file.originalname || 'report.pdf',
      buffer: file.buffer,
      contentType: file.mimetype || 'application/pdf',
    });

    return this.prisma.progressReport.create({
      data: {
        projectId,
        tenantId,
        periodStart,
        periodEnd,
        generatedById: userId,
        narrativeSummary: narrative,
        storageUrl,
      },
    });
  }

  async update(
    id: string,
    projectId: string,
    tenantId: string,
    data: UpdateProgressReportDto,
  ) {
    await this.findOneForProject(id, projectId, tenantId);
    const patch: { sentToEmail?: string | null; sentAt?: Date | null } = {};
    if (data.sentToEmail !== undefined) {
      patch.sentToEmail = data.sentToEmail;
      patch.sentAt = data.sentToEmail ? new Date() : null;
    }
    return this.prisma.progressReport.update({
      where: { id },
      data: patch,
    });
  }

  async remove(id: string, projectId: string, tenantId: string) {
    await this.findOneForProject(id, projectId, tenantId);
    await this.prisma.progressReport.delete({ where: { id } });
    return { deleted: true };
  }

  async generateNarrative(
    projectId: string,
    tenantId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ narrative: string }> {
    await this.requireProject(projectId, tenantId);
    const key = env.OPENAI_API_KEY;
    if (!key) {
      throw new BadRequestException('OPENAI_API_KEY not configured — narrative generation unavailable');
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid periodStart or periodEnd');
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { name: true, code: true, clientName: true },
    });

    const logs = await this.prisma.dailyLog.findMany({
      where: {
        projectId,
        tenantId,
        logDate: { gte: start, lte: end },
      },
      orderBy: { logDate: 'asc' },
      select: { logDate: true, aiSummary: true, rawContent: true },
      take: 40,
    });

    const phases = await this.prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      select: { name: true, percentComplete: true, status: true },
    });

    const diaryText = logs
      .map((l) => `- ${l.logDate.toISOString().slice(0, 10)}: ${(l.aiSummary || l.rawContent || '').slice(0, 300)}`)
      .join('\n');

    const phaseText = phases
      .map((p) => `- ${p.name}: ${p.percentComplete}% (${p.status})`)
      .join('\n');

    const openai = new OpenAI({ apiKey: key });
    try {
      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You write concise, professional construction progress report narratives for clients in Ghana/West Africa. Write 2-4 paragraphs covering: overall progress, key activities, and any risks or notes. Be factual and direct. Do not fabricate data.`,
          },
          {
            role: 'user',
            content: [
              `Project: ${project?.name ?? 'Unknown'} (${project?.code ?? ''})`,
              `Client: ${project?.clientName ?? 'Unknown'}`,
              `Period: ${periodStart} to ${periodEnd}`,
              '',
              'Phase progress:',
              phaseText || '(no phases defined)',
              '',
              'Site diary highlights:',
              diaryText || '(no diary entries for this period)',
            ].join('\n'),
          },
        ],
      });
      const narrative = result.choices[0]?.message?.content?.trim() ?? '';
      return { narrative };
    } catch (e) {
      this.logger.error('GPT narrative generation failed', e);
      throw new BadRequestException('AI narrative generation failed. Try again or write manually.');
    }
  }
}
