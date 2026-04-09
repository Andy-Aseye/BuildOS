import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.module';
import { CreateAttendanceDto, AttendanceQueryDto } from './attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findAll(projectId: string, tenantId: string, query: AttendanceQueryDto) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.attendanceLog.findMany({
      where: {
        projectId,
        ...(query.from || query.to
          ? {
              logDate: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { logDate: 'desc' },
      include: {
        reportedBy: { select: { id: true, name: true } },
      },
    });
  }

  async create(
    projectId: string,
    tenantId: string,
    reportedById: string,
    data: CreateAttendanceDto,
  ) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.attendanceLog.create({
      data: {
        projectId,
        tenantId,
        workerCount: data.workerCount,
        logDate: new Date(data.logDate),
        reportedById,
      },
      include: {
        reportedBy: { select: { id: true, name: true } },
      },
    });
  }

  async weeklySummary(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);

    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);

    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        projectId,
        logDate: { gte: start, lte: end },
      },
      orderBy: { logDate: 'asc' },
    });

    const byDay = new Map<string, number>();
    for (const log of logs) {
      const key = log.logDate.toISOString().slice(0, 10);
      byDay.set(key, log.workerCount);
    }

    const days: { date: string; workerCount: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, workerCount: byDay.get(key) ?? 0 });
    }

    const totalWorkerDays = days.reduce((s, x) => s + x.workerCount, 0);
    const averageDailyCount = totalWorkerDays / 7;

    return { days, totalWorkerDays, averageDailyCount };
  }
}
