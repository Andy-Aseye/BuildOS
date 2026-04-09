'use client';

import { formatMoney } from '@/lib/format';
import type { BudgetSummary } from '@/lib/hooks/use-project-queries';

type Currency = 'GHS' | 'USD';

function CategoryBars({
  summary,
  currency,
}: {
  summary: BudgetSummary;
  currency: Currency;
}) {
  const rows = summary.breakdown
    .map((b) => ({
      category: b.category,
      amount: currency === 'GHS' ? b.totalGhs : b.totalUsd,
    }))
    .filter((r) => r.amount > 0.001);

  if (!rows.length) {
    return <p className="text-xs text-[var(--text-muted)]">No confirmed {currency} costs yet.</p>;
  }

  const max = Math.max(...rows.map((r) => r.amount), 1);

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.category}>
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-0.5">
            <span>{r.category.replace(/_/g, ' ')}</span>
            <span className="font-mono">{formatMoney(r.amount, currency)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] opacity-90"
              style={{ width: `${Math.min(100, (r.amount / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BudgetCategoryChart({ summary }: { summary: BudgetSummary }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          By category (GHS)
        </h3>
        <CategoryBars summary={summary} currency="GHS" />
      </div>
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          By category (USD)
        </h3>
        <CategoryBars summary={summary} currency="USD" />
      </div>
    </div>
  );
}
