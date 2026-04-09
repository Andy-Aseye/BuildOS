import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma.module';
import { DiaryQueryDto, CreateDiaryDto } from './diary.dto';
import { env } from '../config/env';
import type { PaginatedResult } from '../common/pagination';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private buildLogWhere(
    projectId: string,
    query: DiaryQueryDto,
    cursorLog?: { logDate: Date; id: string },
  ): Prisma.DailyLogWhereInput {
    const parts: Prisma.DailyLogWhereInput[] = [{ projectId }];

    if (query.type) {
      const allowed = Object.values(MessageType) as string[];
      if (allowed.includes(query.type)) {
        parts.push({ source: query.type as MessageType });
      }
    }
    if (query.senderId) parts.push({ submittedById: query.senderId });
    if (query.from || query.to) {
      parts.push({
        logDate: {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        },
      });
    }
    if (query.search?.trim()) {
      const q = query.search.trim();
      parts.push({
        OR: [
          { rawContent: { contains: q, mode: 'insensitive' } },
          { aiSummary: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    if (cursorLog) {
      parts.push({
        OR: [
          { logDate: { lt: cursorLog.logDate } },
          { AND: [{ logDate: cursorLog.logDate }, { id: { lt: cursorLog.id } }] },
        ],
      });
    }

    return parts.length === 1 ? parts[0] : { AND: parts };
  }

  async findAll(
    projectId: string,
    tenantId: string,
    query: DiaryQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    await this.requireProject(projectId, tenantId);
    const limit = query.limit ?? 20;

    let cursorLog: { logDate: Date; id: string } | undefined;
    if (query.cursor) {
      const row = await this.prisma.dailyLog.findFirst({
        where: { id: query.cursor, projectId },
        select: { logDate: true, id: true },
      });
      cursorLog = row ?? undefined;
    }

    const where = this.buildLogWhere(projectId, query, cursorLog ?? undefined);
    const rows = await this.prisma.dailyLog.findMany({
      where,
      take: limit + 1,
      orderBy: [{ logDate: 'desc' }, { id: 'desc' }],
      include: {
        photos: true,
        submittedBy: { select: { id: true, name: true, role: true } },
      },
    });

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? data[data.length - 1]?.id : undefined;

    return {
      data,
      meta: { limit, hasMore, nextCursor },
    };
  }

  async create(
    projectId: string,
    tenantId: string,
    submittedById: string,
    data: CreateDiaryDto,
  ) {
    await this.requireProject(projectId, tenantId);

    let aiSummary = data.aiSummary;
    if (!aiSummary && env.OPENAI_API_KEY) {
      aiSummary = await this.generateSummary(data.rawContent, data.activities, data.incidents);
    }

    return this.prisma.dailyLog.create({
      data: {
        projectId,
        tenantId,
        submittedById,
        rawContent: data.rawContent,
        logDate: new Date(data.logDate),
        aiSummary,
        activities: data.activities ?? [],
        incidents: data.incidents ?? [],
        weather: data.weather,
        source: 'WEB' as MessageType,
      },
      include: {
        photos: true,
        submittedBy: { select: { id: true, name: true, role: true } },
      },
    });
  }

  private async generateSummary(
    rawContent: string,
    activities?: string[],
    incidents?: string[],
  ): Promise<string | undefined> {
    try {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
      const parts = [rawContent];
      if (activities?.length) parts.push(`Activities: ${activities.join('; ')}`);
      if (incidents?.length) parts.push(`Incidents: ${incidents.join('; ')}`);

      const result = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'Summarise this construction site diary entry in 1-2 concise sentences. Be factual.',
          },
          { role: 'user', content: parts.join('\n') },
        ],
      });
      return result.choices[0]?.message?.content?.trim() || undefined;
    } catch (err) {
      this.logger.warn(`AI diary summary failed: ${err}`);
      return undefined;
    }
  }

  async getPhotos(projectId: string, tenantId: string, from?: string, to?: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.dailyLogPhoto.findMany({
      where: {
        dailyLog: {
          projectId,
          ...(from || to
            ? {
                logDate: {
                  ...(from ? { gte: new Date(from) } : {}),
                  ...(to ? { lte: new Date(to) } : {}),
                },
              }
            : {}),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        dailyLog: { select: { id: true, logDate: true } },
      },
    });
  }
}
