import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { PhaseStatus } from '@prisma/client';
import { CreatePhaseDto, UpdatePhaseDto } from './phases.dto';

@Injectable()
export class PhasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, tenantId: string) {
    await this.assertProjectInTenant(projectId, tenantId);
    return this.prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  async create(projectId: string, tenantId: string, data: CreatePhaseDto) {
    await this.assertProjectInTenant(projectId, tenantId);
    return this.prisma.projectPhase.create({
      data: {
        projectId,
        name: data.name,
        order: data.order,
        plannedStart: data.plannedStart ? new Date(data.plannedStart) : undefined,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : undefined,
        notes: data.notes,
      },
    });
  }

  async update(id: string, tenantId: string, data: UpdatePhaseDto) {
    await this.assertPhaseInTenant(id, tenantId);
    const patch: Prisma.ProjectPhaseUpdateInput = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.order !== undefined) patch.order = data.order;
    if (data.plannedStart !== undefined) {
      patch.plannedStart = data.plannedStart ? new Date(data.plannedStart) : null;
    }
    if (data.plannedEnd !== undefined) {
      patch.plannedEnd = data.plannedEnd ? new Date(data.plannedEnd) : null;
    }
    if (data.actualStart !== undefined) {
      patch.actualStart = data.actualStart ? new Date(data.actualStart) : null;
    }
    if (data.actualEnd !== undefined) {
      patch.actualEnd = data.actualEnd ? new Date(data.actualEnd) : null;
    }
    if (data.percentComplete !== undefined) patch.percentComplete = data.percentComplete;
    if (data.status !== undefined) patch.status = data.status as PhaseStatus;
    if (data.notes !== undefined) patch.notes = data.notes;
    return this.prisma.projectPhase.update({ where: { id }, data: patch });
  }

  async delete(id: string, tenantId: string) {
    await this.assertPhaseInTenant(id, tenantId);
    return this.prisma.projectPhase.delete({ where: { id } });
  }

  private async assertProjectInTenant(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
  }

  private async assertPhaseInTenant(phaseId: string, tenantId: string) {
    const phase = await this.prisma.projectPhase.findFirst({
      where: { id: phaseId, project: { tenantId, deletedAt: null } },
    });
    if (!phase) throw new NotFoundException('Phase not found');
  }
}
