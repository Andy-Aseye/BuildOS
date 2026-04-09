'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatMoney } from '@/lib/format';
import { canViewFinancials } from '@/lib/rbac';
import {
  COST_CATEGORIES,
  useBudgetSummary,
  useCosts,
  useCreateManualCost,
  useUpdateCostStatus,
  type ManualCostInput,
} from '@/lib/hooks/use-project-queries';
import { BudgetAlertBanner } from '@/components/project/budget-alert-banner';
import { BudgetCategoryChart } from '@/components/project/budget-category-chart';
import { usePagination } from '@/lib/hooks/use-pagination';
import { StatCard } from '@/components/ui/stat-card';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonStatCards, SkeletonTable } from '@/components/ui/skeleton';
import { CsvImportButton } from './csv-import-button';
import { useImportCosts } from '@/lib/hooks/use-project-queries';

function DollarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ManualCostForm({ projectId }: { projectId: string }) {
  const create = useCreateManualCost(projectId);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ManualCostInput['category']>('MATERIALS');
  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const [amount, setAmount] = useState('');
  const [fxRateAtEntry, setFxRateAtEntry] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const n = Number(amount);
    if (!description.trim() || Number.isNaN(n) || n <= 0) {
      setFormError('Enter a description and a positive amount.');
      return;
    }
    const body: ManualCostInput = {
      description: description.trim(),
      category,
      currency,
      amount: n,
      ...(entryDate ? { entryDate: `${entryDate}T12:00:00.000Z` } : {}),
      ...(currency === 'USD' && fxRateAtEntry !== '' ? { fxRateAtEntry: Number(fxRateAtEntry) } : {}),
    };
    try {
      await create.mutateAsync(body);
      setDescription('');
      setAmount('');
      setFxRateAtEntry('');
      setOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add cost');
    }
  }

  const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors">
        + Log cost
      </button>
    );
  }

  return (
    <SectionCard title="Log manual cost" subtitle="Submitted as pending until confirmed.">
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && (
          <p className="text-xs text-[var(--status-red)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <input required value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ManualCostInput['category'])} className={inputCls}>
              {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Date</label>
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Currency</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as 'GHS' | 'USD')} className={inputCls}>
              <option value="GHS">GHS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Amount</label>
            <input type="number" required min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </div>
          {currency === 'USD' && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">FX rate (GHS/USD)</label>
              <input type="number" step="0.0001" value={fxRateAtEntry} onChange={(e) => setFxRateAtEntry(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={create.isPending} className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors">
            {create.isPending ? 'Saving…' : 'Add cost line'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

export function ProjectCosts({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const allowed = canViewFinancials(user?.role);
  const { data, isLoading, error } = useCosts(projectId, allowed);
  const { data: budgetSummary, isLoading: loadingBudget } = useBudgetSummary(projectId, allowed);
  const updateStatus = useUpdateCostStatus(projectId);
  const importCosts = useImportCosts(projectId);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = data ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 10 });

  async function confirm(costId: string) {
    setBusyId(costId);
    try { await updateStatus.mutateAsync({ costId, status: 'CONFIRMED' }); } finally { setBusyId(null); }
  }
  async function reject(costId: string) {
    const reason = window.prompt('Rejection reason (optional)') ?? undefined;
    setBusyId(costId);
    try { await updateStatus.mutateAsync({ costId, status: 'REJECTED', ...(reason ? { rejectionReason: reason } : {}) }); } finally { setBusyId(null); }
  }

  if (!allowed) {
    return <p className="text-sm text-[var(--text-muted)]">Cost details are only visible to Owner and Project Manager roles.</p>;
  }

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-6">
        <SkeletonStatCards count={3} />
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }
  if (error) return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load costs'}</p>;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {!loadingBudget && budgetSummary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<DollarIcon />} label="Total Spent (GHS)" value={formatMoney(budgetSummary.totalSpentGhs, 'GHS')} color="blue" />
            <StatCard icon={<DollarIcon />} label="Budget Remaining" value={budgetSummary.budgetGhs != null ? formatMoney(budgetSummary.budgetGhs - budgetSummary.totalSpentGhs, 'GHS') : '—'} color="green" />
            <StatCard icon={<DollarIcon />} label="% Consumed" value={budgetSummary.percentConsumedGhs != null ? `${budgetSummary.percentConsumedGhs.toFixed(1)}%` : '—'} color={budgetSummary.percentConsumedGhs != null && budgetSummary.percentConsumedGhs > 90 ? 'red' : budgetSummary.percentConsumedGhs != null && budgetSummary.percentConsumedGhs > 75 ? 'amber' : 'slate'} />
          </div>
          <BudgetAlertBanner summary={budgetSummary} />
          <SectionCard title="Category Breakdown"><BudgetCategoryChart summary={budgetSummary} /></SectionCard>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <ManualCostForm projectId={projectId} />
        <CsvImportButton
          label="Import CSV"
          templateFilename="costs_template.csv"
          columns={[
            { key: 'description', label: 'Description', required: true },
            { key: 'category', label: 'Category (MATERIALS|LABOUR|EQUIPMENT|SUBCONTRACTORS|TRANSPORT|MISCELLANEOUS)', required: true },
            { key: 'currency', label: 'Currency (GHS|USD)', required: true },
            { key: 'amount', label: 'Amount', required: true },
            { key: 'entryDate', label: 'Date (YYYY-MM-DD)' },
          ]}
          onImport={async (rows) => { await importCosts.mutateAsync(rows); }}
        />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No cost entries yet.</p>
      ) : (
        <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pagination.paginatedData.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-[var(--text-secondary)]">{formatDate(r.entryDate)}</td>
                    <td className="px-5 py-3.5 max-w-xs truncate font-medium text-[var(--text-primary)]">{r.description}</td>
                    <td className="px-5 py-3.5 text-[var(--text-secondary)]">{r.category}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap font-medium">{formatMoney(r.amount, r.currency)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      {r.status === 'PENDING_CONFIRMATION' ? (
                        <div className="flex gap-2">
                          <button type="button" disabled={busyId === r.id} onClick={() => void confirm(r.id)} className="text-xs font-medium text-emerald-600 hover:underline disabled:opacity-50">Confirm</button>
                          <button type="button" disabled={busyId === r.id} onClick={() => void reject(r.id)} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Reject</button>
                        </div>
                      ) : <span className="text-xs text-[var(--text-muted)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border)]">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        </div>
      )}
    </div>
  );
}
