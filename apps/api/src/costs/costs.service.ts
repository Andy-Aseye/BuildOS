import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CostCategory, CostStatus, Currency } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { CreateCostDto, UpdateCostStatusDto } from './costs.dto';
import { BudgetAlertService } from './budget-alert.service';

function alertBand(pct: number | null): 'none' | 'warning' | 'critical' {
  if (pct == null) return 'none';
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'warning';
  return 'none';
}

@Injectable()
export class CostsService {
  private readonly logger = new Logger(CostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => BudgetAlertService))
    private readonly budgetAlerts: BudgetAlertService,
  ) {}

  private async requireProject(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findAll(projectId: string, tenantId: string) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.costEntry.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { entryDate: 'desc' },
      include: {
        loggedBy: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
    });
  }

  async create(projectId: string, tenantId: string, loggedById: string, data: CreateCostDto) {
    await this.requireProject(projectId, tenantId);
    return this.prisma.costEntry.create({
      data: {
        projectId,
        tenantId,
        source: 'MANUAL',
        status: 'PENDING_CONFIRMATION',
        description: data.description,
        category: data.category as CostCategory,
        currency: data.currency as Currency,
        amount: data.amount,
        fxRateAtEntry: data.fxRateAtEntry,
        loggedById,
        entryDate: data.entryDate ? new Date(data.entryDate) : undefined,
      },
      include: {
        loggedBy: { select: { id: true, name: true } },
      },
    });
  }

  async updateStatus(
    projectId: string,
    tenantId: string,
    id: string,
    confirmedById: string,
    data: UpdateCostStatusDto,
  ) {
    await this.requireProject(projectId, tenantId);
    const existing = await this.prisma.costEntry.findFirst({
      where: { id, projectId, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Cost entry not found');

    const status = data.status as CostStatus;
    const updated = await this.prisma.costEntry.update({
      where: { id },
      data: {
        status,
        rejectionReason: status === 'REJECTED' ? data.rejectionReason ?? null : null,
        confirmedAt: status === 'CONFIRMED' ? new Date() : null,
        confirmedById: status === 'CONFIRMED' ? confirmedById : null,
      },
      include: {
        loggedBy: { select: { id: true, name: true } },
        confirmedBy: { select: { id: true, name: true } },
      },
    });

    if (status === 'CONFIRMED') {
      void this.budgetAlerts.onBudgetChanged(projectId, tenantId).catch((err) => {
        this.logger.warn(`Budget alert check failed: ${err}`);
      });
    }

    return updated;
  }

  async softDelete(projectId: string, tenantId: string, id: string) {
    const existing = await this.prisma.costEntry.findFirst({
      where: { id, projectId, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Cost entry not found');
    await this.prisma.costEntry.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async budgetSummary(projectId: string, tenantId: string) {
    const project = await this.requireProject(projectId, tenantId);
    const entries = await this.prisma.costEntry.findMany({
      where: { projectId, deletedAt: null, status: 'CONFIRMED' },
      select: { category: true, currency: true, amount: true },
    });

    let totalSpentGhs = 0;
    let totalSpentUsd = 0;
    const breakdownMap = new Map<
      CostCategory,
      { totalGhs: number; totalUsd: number }
    >();

    for (const cat of Object.values(CostCategory)) {
      breakdownMap.set(cat, { totalGhs: 0, totalUsd: 0 });
    }

    for (const e of entries) {
      const amt = Number(e.amount);
      if (e.currency === 'GHS') {
        totalSpentGhs += amt;
        const b = breakdownMap.get(e.category)!;
        b.totalGhs += amt;
      } else {
        totalSpentUsd += amt;
        const b = breakdownMap.get(e.category)!;
        b.totalUsd += amt;
      }
    }

    const breakdown = [...breakdownMap.entries()].map(([category, totals]) => ({
      category,
      ...totals,
    }));

    const budgetGhs = project.budgetGhs != null ? Number(project.budgetGhs) : null;
    const budgetUsd = project.budgetUsd != null ? Number(project.budgetUsd) : null;

    const percentConsumedGhs =
      budgetGhs != null && budgetGhs > 0 ? (totalSpentGhs / budgetGhs) * 100 : null;
    const percentConsumedUsd =
      budgetUsd != null && budgetUsd > 0 ? (totalSpentUsd / budgetUsd) * 100 : null;

    return {
      totalSpentGhs,
      totalSpentUsd,
      breakdown,
      budgetGhs,
      budgetUsd,
      percentConsumedGhs,
      percentConsumedUsd,
      alertBands: {
        ghs: alertBand(percentConsumedGhs),
        usd: alertBand(percentConsumedUsd),
      },
    };
  }
}
