import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { RFIStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRfiDto, ListTenantRfisQueryDto, UpdateRfiDto } from './rfis.dto';

const rfiInclude = {
  raisedBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class RfisService {
  private readonly logger = new Logger(RfisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true, code: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async nextReferenceNo(projectId: string, projectCode: string) {
    const count = await this.prisma.rFI.count({ where: { projectId } });
    const n = count + 1;
    return `${projectCode}-RFI-${String(n).padStart(4, '0')}`;
  }

  async findAllForProject(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.rFI.findMany({
      where: { projectId, tenantId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: rfiInclude,
    });
  }

  async findOneForProject(id: string, projectId: string, tenantId: string) {
    const row = await this.prisma.rFI.findFirst({
      where: { id, projectId, tenantId },
      include: rfiInclude,
    });
    if (!row) throw new NotFoundException('RFI not found');
    return row;
  }

  async create(
    projectId: string,
    tenantId: string,
    raisedById: string,
    data: CreateRfiDto,
  ) {
    const project = await this.requireProject(projectId, tenantId);
    const referenceNo = await this.nextReferenceNo(projectId, project.code);

    if (data.assignedToId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId, deletedAt: null },
      });
      if (!assignee) throw new BadRequestException('Assigned user not in this workspace');
    }

    const rfi = await this.prisma.rFI.create({
      data: {
        projectId,
        tenantId,
        referenceNo,
        title: data.title,
        description: data.description,
        dueDate: new Date(data.dueDate),
        raisedById,
        assignedToId: data.assignedToId,
        linkedDrawingId: data.linkedDrawingId,
        status: RFIStatus.OPEN,
      },
      include: rfiInclude,
    });

    if (data.assignedToId) {
      void this.notifications.create({
        tenantId,
        userId: data.assignedToId,
        type: 'rfi_assigned',
        title: `New RFI assigned: ${referenceNo}`,
        body: data.title,
        link: `/projects/${projectId}/rfis`,
      }).catch((e) => this.logger.warn(`Notification failed: ${e}`));
    }

    return rfi;
  }

  async update(
    id: string,
    projectId: string,
    tenantId: string,
    data: UpdateRfiDto,
  ) {
    await this.findOneForProject(id, projectId, tenantId);

    const patch: Prisma.RFIUpdateInput = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.dueDate !== undefined) patch.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) {
      patch.status = data.status;
      if (data.status === RFIStatus.CLOSED) {
        patch.closedAt = new Date();
      }
    }
    if (data.response !== undefined) {
      patch.response = data.response;
      patch.respondedAt = new Date();
    }
    if (data.clearAssigned) {
      patch.assignedTo = { disconnect: true };
    } else if (data.assignedToId !== undefined) {
      if (data.assignedToId) {
        const assignee = await this.prisma.user.findFirst({
          where: { id: data.assignedToId, tenantId, deletedAt: null },
        });
        if (!assignee) throw new BadRequestException('Assigned user not in this workspace');
        patch.assignedTo = { connect: { id: data.assignedToId } };
      } else {
        patch.assignedTo = { disconnect: true };
      }
    }

    const existing = await this.prisma.rFI.findFirst({
      where: { id },
      select: { raisedById: true, referenceNo: true, title: true },
    });

    const updated = await this.prisma.rFI.update({
      where: { id },
      data: patch,
      include: rfiInclude,
    });

    if (data.response && existing) {
      void this.notifications.create({
        tenantId,
        userId: existing.raisedById,
        type: 'rfi_answered',
        title: `RFI answered: ${existing.referenceNo}`,
        body: existing.title,
        link: `/projects/${projectId}/rfis`,
      }).catch((e) => this.logger.warn(`Notification failed: ${e}`));
    }

    return updated;
  }

  async findAllForTenant(tenantId: string, query: ListTenantRfisQueryDto) {
    const parts: Prisma.RFIWhereInput[] = [{ tenantId }];

    if (query.projectId) {
      parts.push({ projectId: query.projectId });
    }
    if (query.status) {
      parts.push({ status: query.status });
    }
    if (query.overdueOnly) {
      parts.push({ status: { not: RFIStatus.CLOSED } });
      parts.push({ dueDate: { lt: new Date() } });
    } else if (query.openOnly) {
      parts.push({ status: { not: RFIStatus.CLOSED } });
    }

    const where: Prisma.RFIWhereInput =
      parts.length === 1 ? parts[0] : { AND: parts };

    return this.prisma.rFI.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        ...rfiInclude,
        project: { select: { id: true, code: true, name: true } },
      },
    });
  }
}
