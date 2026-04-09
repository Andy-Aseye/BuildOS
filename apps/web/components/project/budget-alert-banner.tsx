'use client';

import type { BudgetSummary } from '@/lib/hooks/use-project-queries';

function fallbackBand(pct: number | null): 'none' | 'warning' | 'critical' {
  if (pct == null) return 'none';
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'warning';
  return 'none';
}

export function BudgetAlertBanner({ summary }: { summary: BudgetSummary }) {
  const bands = summary.alertBands ?? {
    ghs: fallbackBand(summary.percentConsumedGhs),
    usd: fallbackBand(summary.percentConsumedUsd),
  };
  const g = bands.ghs;
  const u = bands.usd;
  if (g === 'none' && u === 'none') return null;

  const isCrit = g === 'critical' || u === 'critical';

  return (
    <div
      role="status"
      className={
        isCrit
          ? 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900'
          : 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'
      }
    >
      <p className="font-medium">{isCrit ? 'Critical budget use (90%+)' : 'Budget warning (75%+)'}</p>
      <ul className="mt-2 list-disc list-inside space-y-1 text-[var(--text-secondary)]">
        {g !== 'none' && summary.percentConsumedGhs != null && (
          <li>
            GHS: {summary.percentConsumedGhs.toFixed(1)}% of budget spent
            {g === 'critical' ? ' — immediate review suggested.' : '.'}
          </li>
        )}
        {u !== 'none' && summary.percentConsumedUsd != null && (
          <li>
            USD: {summary.percentConsumedUsd.toFixed(1)}% of budget spent
            {u === 'critical' ? ' — immediate review suggested.' : '.'}
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Alerts are also sent by WhatsApp to Owner / Project Manager numbers on file at 75%, 90%, and 100%.
      </p>
    </div>
  );
}
