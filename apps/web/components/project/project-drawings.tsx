'use client';

import { useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import {
  useAddDrawingRevision,
  useCreateDrawingReview,
  useDrawingReviews,
  useOrgUsers,
  useUpdateDrawingReview,
  type DrawingReviewRow,
} from '@/lib/hooks/use-project-queries';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/lib/hooks/use-pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonSectionCard, SkeletonCards } from '@/components/ui/skeleton';

const STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REVISION_REQUIRED',
  'RESUBMITTED',
  'APPROVED',
] as const;

export function ProjectDrawings({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useDrawingReviews(projectId);
  const { data: orgUsers } = useOrgUsers();
  const create = useCreateDrawingReview(projectId);
  const update = useUpdateDrawingReview(projectId);
  const addRevision = useAddDrawingRevision(projectId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('DRAFT');
  const [editReviewerId, setEditReviewerId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [revComments, setRevComments] = useState<Record<string, string>>({});

  const rows = data ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 10 });

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    try {
      await create.mutateAsync({
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setTitle('');
      setDescription('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create drawing package');
    }
  }

  async function saveMeta(d: DrawingReviewRow) {
    setEditError(null);
    try {
      await update.mutateAsync({
        drawingId: d.id,
        body: {
          status: editStatus,
          reviewerId: editReviewerId || null,
        },
      });
      setEditId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function uploadRevision(drawingId: string) {
    const input = fileRefs.current[drawingId];
    const file = input?.files?.[0];
    if (!file) return;
    setEditError(null);
    try {
      await addRevision.mutateAsync({
        drawingId,
        file,
        comments: revComments[drawingId],
      });
      if (input) input.value = '';
      setRevComments((m) => ({ ...m, [drawingId]: '' }));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-8 max-w-4xl">
        <SkeletonSectionCard lines={6} />
        <SkeletonCards count={4} cols={1} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load drawings'}
      </p>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <SectionCard
        title="New drawing package"
        subtitle="Group related sheets; upload revision files below each package. Files are stored in your workspace bucket."
      >
        <form onSubmit={onCreate} className="space-y-3">
          {formError && (
            <p className="text-xs text-[var(--status-red)] bg-red-50 border border-red-100 rounded px-2 py-1">
              {formError}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-sm rounded-xl transition-colors disabled:opacity-60"
          >
            {create.isPending ? 'Creating…' : 'Create package'}
          </button>
        </form>
      </SectionCard>

      {editError && (
        <p className="text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {editError}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          title="No drawing packages yet"
          description="Create a package above to group related sheets and upload revisions."
        />
      ) : (
        <>
        <ul className="space-y-4">
          {pagination.paginatedData.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl bg-white border border-[var(--border)] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-[var(--text-primary)]">{d.title}</h4>
                  {d.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">
                      {d.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Updated {formatDate(d.updatedAt)}
                  </p>
                </div>
                <StatusBadge status={d.status} />
              </div>

              {d.revisions.length > 0 && (
                <div className="text-xs space-y-1">
                  <p className="font-medium text-[var(--text-secondary)]">Revisions</p>
                  <ul className="space-y-1">
                    {d.revisions.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-mono">{r.revisionNumber}</span>
                        <a
                          href={r.storageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--primary)] underline"
                        >
                          Open file
                        </a>
                        <span className="text-[var(--text-muted)]">
                          {(r.fileSize / 1024).toFixed(0)} KB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end border-t border-[var(--border)] pt-3">
                <div className="flex-1 space-y-1 w-full sm:w-auto">
                  <label className="text-xs text-[var(--text-muted)]">Upload new revision</label>
                  <input
                    ref={(el) => {
                      fileRefs.current[d.id] = el;
                    }}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.dwg,.zip"
                    className="block text-xs w-full"
                  />
                  <input
                    type="text"
                    placeholder="Optional comment"
                    value={revComments[d.id] ?? ''}
                    onChange={(e) =>
                      setRevComments((m) => ({ ...m, [d.id]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={addRevision.isPending}
                  onClick={() => void uploadRevision(d.id)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-md text-sm hover:bg-[var(--content-bg)] disabled:opacity-60"
                >
                  {addRevision.isPending ? 'Uploading…' : 'Upload'}
                </button>
              </div>

              {editId === d.id ? (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-xs text-[var(--text-secondary)]">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="text-sm border border-slate-300 rounded-xl px-3 py-2"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">
                      Reviewer (optional)
                    </label>
                    <select
                      value={editReviewerId}
                      onChange={(e) => setEditReviewerId(e.target.value)}
                      className="w-full max-w-xs text-sm border border-slate-300 rounded-xl px-3 py-2"
                    >
                      <option value="">—</option>
                      {(orgUsers ?? [])
                        .filter((u) => u.isActive)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email || u.id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-sm rounded-xl transition-colors"
                      disabled={update.isPending}
                      onClick={() => void saveMeta(d)}
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
                    setEditStatus(d.status);
                    setEditReviewerId(d.reviewer?.id ?? '');
                  }}
                >
                  Edit status / reviewer
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
