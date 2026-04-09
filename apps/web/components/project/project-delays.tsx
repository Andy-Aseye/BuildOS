'use client';

import { useState } from 'react';
import { formatDateOnly } from '@/lib/format';
import {
  useCreateDelayLog,
  useDelayLogs,
  useProjectRfis,
  useUpdateDelayLog,
  type DelayLogRow,
} from '@/lib/hooks/use-project-queries';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { usePagination } from '@/lib/hooks/use-pagination';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonStatCards, SkeletonSectionCard, SkeletonCards } from '@/components/ui/skeleton';

const CAUSES = [
  'WEATHER',
  'MATERIALS',
  'LABOUR',
  'DESIGN',
  'CLIENT',
  'UTILITIES',
  'OTHER',
] as const;

const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400';

function causeLabel(c: string) {
  return c.charAt(0) + c.slice(1).toLowerCase();
}

function ClockHoursIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CauseChartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function delayStats(rows: DelayLogRow[]) {
  const totalDelayHours = rows.reduce((sum, d) => sum + Number(d.durationHours ?? 0), 0);
  const causeCounts = new Map<string, number>();
  for (const d of rows) {
    causeCounts.set(d.cause, (causeCounts.get(d.cause) ?? 0) + 1);
  }
  let mostCommonCauseLabel = '—';
  let maxCount = 0;
  for (const [c, count] of causeCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonCauseLabel = causeLabel(c);
    }
  }
  return { totalDelayHours, mostCommonCauseLabel };
}

export function ProjectDelays({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useDelayLogs(projectId);
  const { data: rfis } = useProjectRfis(projectId);
  const create = useCreateDelayLog(projectId);
  const update = useUpdateDelayLog(projectId);

  const [delayDate, setDelayDate] = useState('');
  const [durationHours, setDurationHours] = useState('8');
  const [cause, setCause] = useState<string>('OTHER');
  const [description, setDescription] = useState('');
  const [linkedRFIId, setLinkedRFIId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editReviewed, setEditReviewed] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const rows = data ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 10 });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!delayDate || !description.trim()) {
      setFormError('Date and description are required.');
      return;
    }
    try {
      await create.mutateAsync({
        delayDate: `${delayDate}T12:00:00.000Z`,
        durationHours: Number(durationHours) || 0,
        cause,
        description: description.trim(),
        ...(linkedRFIId ? { linkedRFIId } : {}),
      });
      setDescription('');
      setLinkedRFIId('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not log delay');
    }
  }

  async function saveReview(d: DelayLogRow) {
    setEditError(null);
    try {
      await update.mutateAsync({
        delayId: d.id,
        body: {
          reviewedByPM: editReviewed,
          causeOverrideNote: editNote.trim() || undefined,
        },
      });
      setEditId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-8 max-w-4xl">
        <SkeletonStatCards count={2} />
        <SkeletonSectionCard lines={5} />
        <SkeletonCards count={3} cols={1} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load delays'}
      </p>
    );
  }

  const { totalDelayHours, mostCommonCauseLabel } = delayStats(rows);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={<ClockHoursIcon />}
          label="Total delay hours"
          value={Number.isInteger(totalDelayHours) ? totalDelayHours : Number(totalDelayHours.toFixed(2))}
          color="amber"
        />
        <StatCard
          icon={<CauseChartIcon />}
          label="Most common cause"
          value={mostCommonCauseLabel}
          color="slate"
        />
      </div>

      <SectionCard title="Log a delay">
        <form onSubmit={onCreate} className="space-y-3">
          {formError && (
            <p className="text-xs text-[var(--status-red)] bg-red-50 border border-red-100 rounded px-2 py-1">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Date</label>
              <input
                type="date"
                required
                value={delayDate}
                onChange={(e) => setDelayDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Duration (hours)
              </label>
              <input
                type="number"
                min={0}
                step="0.25"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Cause</label>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                className={inputCls}
              >
                {CAUSES.map((c) => (
                  <option key={c} value={c}>
                    {causeLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Link RFI (optional)
            </label>
            <select
              value={linkedRFIId}
              onChange={(e) => setLinkedRFIId(e.target.value)}
              className={`${inputCls} max-w-md`}
            >
              <option value="">—</option>
              {(rfis ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.referenceNo} — {r.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-sm rounded-xl transition-colors disabled:opacity-60"
          >
            {create.isPending ? 'Saving…' : 'Add delay'}
          </button>
        </form>
      </SectionCard>

      {editError && (
        <p className="text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {editError}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No delays logged yet." />
      ) : (
        <>
          <ul className="space-y-3">
            {pagination.paginatedData.map((d) => (
              <li
                key={d.id}
                className="rounded-2xl bg-white border border-[var(--border)] p-4 space-y-2"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {formatDateOnly(d.delayDate)} · {String(d.durationHours)} h ·{' '}
                      {causeLabel(d.cause)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Reported by {d.reportedBy.name || d.reportedBy.email || '—'}
                    </p>
                  </div>
                  {d.reviewedByPM ? (
                    <StatusBadge status="Reviewed" variant="green" />
                  ) : (
                    <StatusBadge status="Pending_PM_review" variant="amber" />
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {d.description}
                </p>
                {d.causeOverrideNote && (
                  <p className="text-xs text-[var(--text-muted)]">
                    PM note: {d.causeOverrideNote}
                  </p>
                )}
                {d.linkedRFIId && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Linked RFI ID: {d.linkedRFIId}
                  </p>
                )}

                {editId === d.id ? (
                  <div className="border-t border-[var(--border)] pt-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editReviewed}
                        onChange={(e) => setEditReviewed(e.target.checked)}
                      />
                      Mark reviewed by PM
                    </label>
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        PM note (optional)
                      </label>
                      <input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-sm rounded-xl transition-colors disabled:opacity-60"
                        disabled={update.isPending}
                        onClick={() => void saveReview(d)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-md"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-[var(--primary)] font-medium"
                    onClick={() => {
                      setEditId(d.id);
                      setEditReviewed(d.reviewedByPM);
                      setEditNote(d.causeOverrideNote ?? '');
                    }}
                  >
                    PM review
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
        </>
      )}
    </div>
  );
}
