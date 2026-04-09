'use client';

import { Fragment, useState } from 'react';
import { formatDateOnly } from '@/lib/format';
import {
  useCreateRfi,
  useDrawingReviews,
  useOrgUsers,
  useProjectRfis,
  useUpdateRfi,
  type RfiRow,
} from '@/lib/hooks/use-project-queries';
import { usePagination } from '@/lib/hooks/use-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonStatCards, SkeletonSectionCard, SkeletonTable } from '@/components/ui/skeleton';

const STATUSES = ['OPEN', 'ACKNOWLEDGED', 'ANSWERED', 'CLOSED'] as const;

const inputClassName =
  'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400';

function isOverdue(r: RfiRow) {
  if (r.status === 'CLOSED') return false;
  return new Date(r.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

function rfiStatusBadgeVariant(status: string): string | undefined {
  if (status === 'ACKNOWLEDGED') return 'amber';
  if (status === 'ANSWERED') return 'blue';
  return undefined;
}

function OpenRfisIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function OverdueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ClosedRfisIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function ProjectRfis({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useProjectRfis(projectId);
  const { data: orgUsers } = useOrgUsers();
  const { data: drawings } = useDrawingReviews(projectId);
  const create = useCreateRfi(projectId);
  const update = useUpdateRfi(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [linkedDrawingId, setLinkedDrawingId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('OPEN');
  const [editResponse, setEditResponse] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !description.trim() || !dueDate) {
      setFormError('Title, description, and due date are required.');
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        dueDate: `${dueDate}T12:00:00.000Z`,
        ...(assignedToId ? { assignedToId } : {}),
        ...(linkedDrawingId ? { linkedDrawingId } : {}),
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignedToId('');
      setLinkedDrawingId('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create RFI');
    }
  }

  async function saveEdit(rfi: RfiRow) {
    setEditError(null);
    try {
      await update.mutateAsync({
        rfiId: rfi.id,
        body: {
          status: editStatus,
          response: editResponse.trim() || undefined,
        },
      });
      setEditId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  const rows = data ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 10 });
  const openCount = rows.filter((r) => r.status !== 'CLOSED').length;
  const overdueCount = rows.filter((r) => isOverdue(r)).length;
  const closedCount = rows.filter((r) => r.status === 'CLOSED').length;

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-8 max-w-4xl">
        <SkeletonStatCards count={3} />
        <SkeletonSectionCard lines={6} />
        <SkeletonTable rows={5} cols={7} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load RFIs'}
      </p>
    );
  }

  const primaryBtnClass =
    'px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60';

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<OpenRfisIcon />} label="Open" value={openCount} color="amber" />
        <StatCard icon={<OverdueIcon />} label="Overdue" value={overdueCount} color="red" />
        <StatCard icon={<ClosedRfisIcon />} label="Closed" value={closedCount} color="green" />
      </div>

      <SectionCard
        title="Raise RFI"
        subtitle="Reference numbers are generated automatically (e.g. BIL-01-RFI-0001)."
      >
        <form onSubmit={onCreate} className="space-y-3">
          {formError && (
            <p className="text-xs text-[var(--status-red)] bg-red-50 border border-red-100 rounded px-2 py-1">{formError}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Due date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Assign to (optional)</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className={inputClassName}
              >
                <option value="">—</option>
                {(orgUsers ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email ?? u.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Link drawing (optional)</label>
            <select
              value={linkedDrawingId}
              onChange={(e) => setLinkedDrawingId(e.target.value)}
              className={`${inputClassName} max-w-md`}
            >
              <option value="">—</option>
              {(drawings ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.status.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={create.isPending} className={primaryBtnClass}>
            {create.isPending ? 'Creating…' : 'Create RFI'}
          </button>
        </form>
      </SectionCard>

      {!rows.length ? (
        <EmptyState title="No RFIs yet" description="Create your first RFI using the form above." />
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Ref</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Due</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Raised by</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Assigned</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pagination.paginatedData.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--primary)]">{r.referenceNo}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-[var(--text-primary)]">{r.title}</div>
                      <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{r.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} variant={rfiStatusBadgeVariant(r.status)} />
                      {isOverdue(r) && (
                        <span className="ml-1 text-xs text-[var(--status-red)]">Overdue</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDateOnly(r.dueDate)}</td>
                    <td className="px-4 py-3">{r.raisedBy.name ?? '—'}</td>
                    <td className="px-4 py-3">{r.assignedTo?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(editId === r.id ? null : r.id);
                          setEditStatus(r.status);
                          setEditResponse(r.response ?? '');
                          setEditError(null);
                        }}
                        className="text-xs font-medium text-[var(--primary)] hover:underline"
                      >
                        {editId === r.id ? 'Close' : 'Update'}
                      </button>
                    </td>
                  </tr>
                  {editId === r.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-4 py-4">
                        {editError && (
                          <p className="text-xs text-[var(--status-red)] mb-2">{editError}</p>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
                            <select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value)}
                              className={inputClassName}
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Response</label>
                          <textarea
                            value={editResponse}
                            onChange={(e) => setEditResponse(e.target.value)}
                            rows={3}
                            placeholder="Answer or notes for the record"
                            className={inputClassName}
                          />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit(r)}
                            disabled={update.isPending}
                            className={primaryBtnClass}
                          >
                            {update.isPending ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="px-4 py-2 border border-slate-300 text-sm rounded-xl transition-colors hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
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
