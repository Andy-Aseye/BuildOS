import { ACTIVITY_STALENESS, BUDGET_ALERT_THRESHOLDS } from '@buildos/shared';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number, currency: 'GHS' | 'USD'): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function daysSince(date: string | Date): number {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function budgetHealthColor(percentConsumed: number): string {
  if (percentConsumed >= BUDGET_ALERT_THRESHOLDS.CRITICAL) return 'var(--status-red)';
  if (percentConsumed >= BUDGET_ALERT_THRESHOLDS.WARNING) return 'var(--status-amber)';
  return 'var(--status-green)';
}

export function activityStalenessColor(daysSinceActivity: number): string {
  if (daysSinceActivity >= ACTIVITY_STALENESS.RED_DAYS) return 'var(--status-red)';
  if (daysSinceActivity >= ACTIVITY_STALENESS.AMBER_DAYS) return 'var(--status-amber)';
  return 'var(--status-green)';
}
