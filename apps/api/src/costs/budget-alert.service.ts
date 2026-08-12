import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma.module';
import { WhatsAppCloudService } from '../whatsapp/whatsapp-cloud.service';
import { env } from '../config/env';
import { CostsService } from './costs.service';

const THRESHOLDS = [100, 90, 75] as const;

function tierFromPercent(pct: number): number {
  if (pct >= 100) return 100;
  if (pct >= 90) return 90;
  if (pct >= 75) return 75;
  return 0;
}

@Injectable()
export class BudgetAlertService {
  private readonly logger = new Logger(BudgetAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppCloudService,
    @Inject(forwardRef(() => CostsService)) private readonly costs: CostsService,
  ) {}

  /** Call after confirmed spend changes or project budget changes. */
  async onBudgetChanged(projectId: string, tenantId: string): Promise<void> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
      this.logger.debug('Twilio WhatsApp not configured; skipping budget alerts');
      return;
    }

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    if (!project) return;

    const summary = await this.costs.budgetSummary(projectId, tenantId);

    let state = await this.prisma.projectBudgetAlertState.findUnique({
      where: { projectId },
    });
    if (!state) {
      state = await this.prisma.projectBudgetAlertState.create({
        data: { projectId, tenantId, lastGhsLevel: 0, lastUsdLevel: 0 },
      });
    }

    const recipients = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        role: { in: [UserRole.OWNER, UserRole.PROJECT_MANAGER] },
        whatsappPhone: { not: null },
      },
      select: { whatsappPhone: true },
    });
    const phones = [...new Set(recipients.map((r) => r.whatsappPhone).filter(Boolean))] as string[];
    if (!phones.length) {
      this.logger.debug(`No Owner/PM WhatsApp numbers for tenant ${tenantId}; skipping alert`);
      return;
    }

    let lastGhs = state.lastGhsLevel;
    let lastUsd = state.lastUsdLevel;

    if (summary.budgetGhs != null && summary.budgetGhs > 0 && summary.percentConsumedGhs != null) {
      const pct = summary.percentConsumedGhs;
      const tier = tierFromPercent(pct);
      const { nextLast, notifyTier } = this.computeNextTier(lastGhs, tier);
      if (notifyTier != null) {
        const msg = this.message({
          code: project.code,
          name: project.name,
          currency: 'GHS',
          notifyTier,
          pct,
          spent: summary.totalSpentGhs,
          budget: summary.budgetGhs,
        });
        await this.sendToAll(phones, msg);
      }
      lastGhs = nextLast;
    }

    if (summary.budgetUsd != null && summary.budgetUsd > 0 && summary.percentConsumedUsd != null) {
      const pct = summary.percentConsumedUsd;
      const tier = tierFromPercent(pct);
      const { nextLast, notifyTier } = this.computeNextTier(lastUsd, tier);
      if (notifyTier != null) {
        const msg = this.message({
          code: project.code,
          name: project.name,
          currency: 'USD',
          notifyTier,
          pct,
          spent: summary.totalSpentUsd,
          budget: summary.budgetUsd,
        });
        await this.sendToAll(phones, msg);
      }
      lastUsd = nextLast;
    }

    await this.prisma.projectBudgetAlertState.update({
      where: { projectId },
      data: { lastGhsLevel: lastGhs, lastUsdLevel: lastUsd },
    });
  }

  private computeNextTier(
    lastNotified: number,
    currentTier: number,
  ): { nextLast: number; notifyTier: (typeof THRESHOLDS)[number] | null } {
    if (currentTier < lastNotified) {
      return { nextLast: currentTier, notifyTier: null };
    }
    const crossed = THRESHOLDS.find((t) => t <= currentTier && t > lastNotified);
    if (crossed != null) {
      return { nextLast: currentTier, notifyTier: crossed };
    }
    return { nextLast: lastNotified, notifyTier: null };
  }

  private message(args: {
    code: string;
    name: string;
    currency: 'GHS' | 'USD';
    notifyTier: number;
    pct: number;
    spent: number;
    budget: number;
  }): string {
    const sym = args.currency === 'USD' ? 'USD' : 'GHS';
    const spent = args.spent.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const bud = args.budget.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const headline =
      args.notifyTier >= 100
        ? 'Budget fully used'
        : args.notifyTier >= 90
          ? 'Critical: 90% budget threshold'
          : 'Warning: 75% budget threshold';
    return [
      `BuildOS — ${args.code} ${headline}`,
      `${args.name}`,
      `${sym} spend ${spent} of ${bud} (${args.pct.toFixed(1)}%).`,
      'Review costs in the BuildOS dashboard.',
    ].join('\n');
  }

  private async sendToAll(phones: string[], body: string): Promise<void> {
    for (const phone of phones) {
      try {
        await this.whatsapp.sendTextMessage(phone, body);
      } catch (e) {
        this.logger.warn(`Budget alert WhatsApp failed for ${phone}: ${e}`);
      }
    }
  }
}
