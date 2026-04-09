import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { CreateDelayLogDto, UpdateDelayLogDto } from './delays.dto';

const delayInclude = {
  reportedBy: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class DelaysService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async assertRfiInProject(
    rfiId: string,
    projectId: string,
    tenantId: string,
  ) {
    const rfi = await this.prisma.rFI.findFirst({
      where: { id: rfiId, projectId, tenantId },
      select: { id: true },
    });
    if (!rfi) throw new BadRequestException('Linked RFI not found on this project');
  }

  async findAllForProject(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.delayLog.findMany({
      where: { projectId, tenantId },
      orderBy: [{ delayDate: 'desc' }, { createdAt: 'desc' }],
      include: delayInclude,
    });
  }

  async findOneForProject(
    id: string,
    projectId: string,
    tenantId: string,
  ) {
    const row = await this.prisma.delayLog.findFirst({
      where: { id, projectId, tenantId },
      include: delayInclude,
    });
    if (!row) throw new NotFoundException('Delay not found');
    return row;
  }

  async create(
    projectId: string,
    tenantId: string,
    userId: string,
    data: CreateDelayLogDto,
  ) {
    await this.requireProject(projectId, tenantId);
    if (data.linkedRFIId) {
      await this.assertRfiInProject(data.linkedRFIId, projectId, tenantId);
    }
    return this.prisma.delayLog.create({
      data: {
        projectId,
        tenantId,
        reportedById: userId,
        delayDate: new Date(data.delayDate),
        durationHours: new Prisma.Decimal(data.durationHours),
        cause: data.cause,
        description: data.description,
        linkedRFIId: data.linkedRFIId,
      },
      include: delayInclude,
    });
  }

  async update(
    id: string,
    projectId: string,
    tenantId: string,
    data: UpdateDelayLogDto,
  ) {
    await this.findOneForProject(id, projectId, tenantId);
    if (data.linkedRFIId) {
      await this.assertRfiInProject(data.linkedRFIId, projectId, tenantId);
    }

    const patch: Prisma.DelayLogUpdateInput = {};
    if (data.delayDate !== undefined) {
      patch.delayDate = new Date(data.delayDate);
    }
    if (data.durationHours !== undefined) {
      patch.durationHours = new Prisma.Decimal(data.durationHours);
    }
    if (data.cause !== undefined) patch.cause = data.cause;
    if (data.description !== undefined) patch.description = data.description;
    if (data.reviewedByPM !== undefined) {
      patch.reviewedByPM = data.reviewedByPM;
    }
    if (data.causeOverrideNote !== undefined) {
      patch.causeOverrideNote = data.causeOverrideNote;
    }
    if (data.linkedRFIId !== undefined) {
      patch.linkedRFIId = data.linkedRFIId ?? null;
    }

    return this.prisma.delayLog.update({
      where: { id },
      data: patch,
      include: delayInclude,
    });
  }

  async remove(id: string, projectId: string, tenantId: string) {
    await this.findOneForProject(id, projectId, tenantId);
    await this.prisma.delayLog.delete({ where: { id } });
    return { deleted: true };
  }
}
