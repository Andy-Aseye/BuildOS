import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.module';
import { CreateProjectDto, UpdateProjectDto, AddMemberDto } from './projects.dto';
import { UserRole } from '@prisma/client';
import { BudgetAlertService } from '../costs/budget-alert.service';
import { WhatsAppCloudService } from '../whatsapp/whatsapp-cloud.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetAlerts: BudgetAlertService,
    private readonly whatsapp: WhatsAppCloudService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        phases: { select: { id: true, percentComplete: true }, orderBy: { order: 'asc' } },
        _count: { select: { costEntries: true, dailyLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true, whatsappPhone: true, lastActiveAt: true } } } },
        phases: { orderBy: { order: 'asc' } },
        _count: { select: { costEntries: true, dailyLogs: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(tenantId: string, data: CreateProjectDto) {
    const code = await this.generateCode(tenantId, data.name);

    return this.prisma.project.create({
      data: {
        tenantId,
        code,
        name: data.name,
        clientName: data.clientName,
        description: data.description,
        budgetGhs: data.budgetGhs,
        budgetUsd: data.budgetUsd,
        fxRateGhsUsd: data.fxRateGhsUsd,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
      },
    });
  }

  async update(id: string, tenantId: string, data: UpdateProjectDto) {
    await this.requireProject(id, tenantId);
    const budgetTouched = data.budgetGhs !== undefined || data.budgetUsd !== undefined;
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : undefined,
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : undefined,
      },
    });
    if (budgetTouched) {
      void this.budgetAlerts.onBudgetChanged(id, tenantId).catch((err) => {
        this.logger.warn(`Budget alert check after project update failed: ${err}`);
      });
    }
    return updated;
  }

  async softDelete(id: string, tenantId: string) {
    await this.requireProject(id, tenantId);
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async requireProject(id: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async addMember(projectId: string, tenantId: string, data: AddMemberDto) {
    if (!data.userId && !data.phone) {
      throw new BadRequestException('Provide either userId or phone');
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    let user;
    if (data.userId) {
      user = await this.prisma.user.findFirst({
        where: { id: data.userId, tenantId, deletedAt: null },
      });
      if (!user) throw new NotFoundException('User not found in this organisation');
    } else {
      user = await this.prisma.user.findUnique({
        where: { whatsappPhone: data.phone },
      });
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            tenantId,
            whatsappPhone: data.phone!,
            name: data.name,
            role: data.role as UserRole,
          },
        });
      }
    }

    const existing = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    if (existing) throw new ConflictException('User is already a member of this project');

    const member = await this.prisma.projectMember.create({
      data: { projectId, userId: user.id, role: data.role as UserRole },
      include: { user: { select: { id: true, name: true, whatsappPhone: true, role: true } } },
    });

    const phone = user.whatsappPhone;
    if (phone) {
      void this.sendProjectWelcome(phone, project.code, project.name).catch((err) => {
        this.logger.warn(`Welcome WhatsApp to ${phone} for ${project.code} failed: ${err}`);
      });
    }

    return member;
  }

  private async sendProjectWelcome(phone: string, code: string, name: string): Promise<void> {
    const body =
      `You have been added to project *${code}* (${name}) on BuildOS.\n\n` +
      `To send updates, message this number. Include *#${code}* if you are on multiple projects.\n\n` +
      `You can send:\n` +
      `- Site photos with a caption\n` +
      `- Text updates, costs, or attendance counts`;
    await this.whatsapp.sendTextMessage(phone, body);
  }

  async removeMember(projectId: string, tenantId: string, userId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { leftAt: new Date() },
    });
  }

  private async generateCode(tenantId: string, projectName: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const prefix = tenant.slug.slice(0, 3).toUpperCase();
    const count = await this.prisma.project.count({ where: { tenantId } });
    const code = `${prefix}-${String(count + 1).padStart(2, '0')}`;

    const exists = await this.prisma.project.findUnique({ where: { code } });
    if (exists) return `${prefix}-${String(count + 2).padStart(2, '0')}`;

    return code;
  }
}
