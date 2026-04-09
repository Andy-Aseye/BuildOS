'use client';

import { useState } from 'react';
import { formatDate } from '@/lib/format';
import {
  useCreateMaterialsRequest,
  useMaterialsRequests,
  useRecordDelivery,
  useUpdateMaterialsRequest,
  type MaterialsLineInput,
  type MaterialsRequestRow,
} from '@/lib/hooks/use-project-queries';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { usePagination } from '@/lib/hooks/use-pagination';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonSectionCard, SkeletonCards } from '@/components/ui/skeleton';
import { CsvImportButton } from './csv-import-button';
import { useImportMaterials } from '@/lib/hooks/use-project-queries';

const STATUS_OPTIONS = [
  'DRAFT',
  'SUBMITTED',
  'AWAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'ORDERED',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'CANCELLED',
] as const;

function emptyLine(): MaterialsLineInput {
  return { description: '', quantity: 1, unit: 'ea', estimatedUnitCost: 0 };
}

const inputFocus =
  'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

export function ProjectMaterials({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useMaterialsRequests(projectId);
  const create = useCreateMaterialsRequest(projectId);
  const update = useUpdateMaterialsRequest(projectId);
  const recordDelivery = useRecordDelivery(projectId);
  const importMaterials = useImportMaterials(projectId);

  const [currency, setCurrency] = useState<'GHS' | 'USD'>('GHS');
  const [notes, setNotes] = useState('');
  const [requiresOwnerApproval, setRequiresOwnerApproval] = useState(false);
  const [lines, setLines] = useState<MaterialsLineInput[]>([emptyLine()]);
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('DRAFT');
  const [editRejection, setEditRejection] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const rows = data ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 10 });

  function setLine(i: number, patch: Partial<MaterialsLineInput>) {
    setLines((prev) => prev.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const cleaned = lines.filter((l) => l.description.trim());
    if (!cleaned.length) {
      setFormError('Add at least one line with a description.');
      return;
    }
    try {
      await create.mutateAsync({
        currency,
        notes: notes.trim() || undefined,
        requiresOwnerApproval,
        items: cleaned.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity) || 0,
          unit: l.unit.trim() || 'ea',
          estimatedUnitCost: l.estimatedUnitCost,
        })),
      });
      setNotes('');
      setRequiresOwnerApproval(false);
      setLines([emptyLine()]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create request');
    }
  }

  async function saveStatus(m: MaterialsRequestRow) {
    setEditError(null);
    try {
      await update.mutateAsync({
        requestId: m.id,
        body: {
          status: editStatus,
          ...(editStatus === 'REJECTED' && editRejection.trim()
            ? { rejectionReason: editRejection.trim() }
            : {}),
        },
      });
      setEditId(null);
      setEditRejection('');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-8 max-w-4xl">
        <SkeletonSectionCard lines={6} />
        <SkeletonCards count={3} cols={1} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load materials'}
      </p>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <CsvImportButton
          label="Import Materials CSV"
          templateFilename="materials_template.csv"
          columns={[
            { key: 'description', label: 'Description', required: true },
            { key: 'quantity', label: 'Quantity', required: true },
            { key: 'unit', label: 'Unit (e.g. bags, pcs)', required: true },
            { key: 'estimatedUnitCost', label: 'Unit Cost' },
          ]}
          onImport={async (rows) => { await importMaterials.mutateAsync({ rows }); }}
        />
      </div>
      <SectionCard title="New materials request">
        <form onSubmit={onCreate} className="space-y-4">
          {formError && (
            <p className="text-xs text-[var(--status-red)] bg-red-50 border border-red-100 rounded px-2 py-1">
              {formError}
            </p>
          )}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'GHS' | 'USD')}
                className={`text-sm border border-slate-300 rounded-xl px-2 py-1 ${inputFocus}`}
              >
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={requiresOwnerApproval}
                onChange={(e) => setRequiresOwnerApproval(e.target.checked)}
              />
              Requires owner approval
            </label>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 border border-slate-300 rounded-xl text-sm ${inputFocus}`}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Line items</p>
            {lines.map((line, i) => (
              <div
                key={i}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end border border-[var(--border)] rounded-md p-2"
              >
                <div className="sm:col-span-5">
                  <label className="text-xs text-[var(--text-muted)]">Description</label>
                  <input
                    value={line.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    className={`w-full px-2 py-1 border border-slate-300 rounded-xl text-sm ${inputFocus}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[var(--text-muted)]">Qty</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) => setLine(i, { quantity: Number(e.target.value) })}
                    className={`w-full px-2 py-1 border border-slate-300 rounded-xl text-sm ${inputFocus}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[var(--text-muted)]">Unit</label>
                  <input
                    value={line.unit}
                    onChange={(e) => setLine(i, { unit: e.target.value })}
                    className={`w-full px-2 py-1 border border-slate-300 rounded-xl text-sm ${inputFocus}`}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-[var(--text-muted)]">Unit cost</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={line.estimatedUnitCost ?? ''}
                    onChange={(e) =>
                      setLine(i, { estimatedUnitCost: Number(e.target.value) || 0 })
                    }
                    className={`w-full px-2 py-1 border border-slate-300 rounded-xl text-sm ${inputFocus}`}
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-[var(--status-red)]"
                      onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-xs text-[var(--primary)] font-medium"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              + Add line
            </button>
          </div>

          <button
            type="submit"
            disabled={create.isPending}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-sm rounded-xl transition-colors disabled:opacity-60"
          >
            {create.isPending ? 'Saving…' : 'Submit request'}
          </button>
        </form>
      </SectionCard>

      {editError && (
        <p className="text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {editError}
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No materials requests yet." />
      ) : (
        <>
        <ul className="space-y-4">
          {pagination.paginatedData.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl bg-white border border-[var(--border)] p-4 space-y-2"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {m.currency}{' '}
                    {typeof m.estimatedTotal === 'string'
                      ? Number(m.estimatedTotal).toLocaleString()
                      : m.estimatedTotal.toLocaleString()}{' '}
                    estimated
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Requested by {m.requestedBy.name || m.requestedBy.email || '—'} ·{' '}
                    {formatDate(m.createdAt)}
                  </p>
                  {m.notes && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{m.notes}</p>
                  )}
                </div>
                <StatusBadge status={m.status} />
              </div>
              <ul className="text-xs border-t border-[var(--border)] pt-2 space-y-2">
                {m.items.map((it) => (
                  <li key={it.id} className="flex flex-wrap justify-between gap-2 items-center">
                    <div className="flex-1 min-w-0">
                      <span>{it.description}</span>
                      <span className="text-[var(--text-muted)] ml-2">
                        {String(it.quantity)} {it.unit}
                        {it.estimatedUnitCost != null &&
                          ` @ ${m.currency}${Number(it.estimatedUnitCost).toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {it.deliveredQuantity != null && Number(it.deliveredQuantity) > 0 ? (
                        <span className="text-emerald-700">
                          Delivered: {String(it.deliveredQuantity)} {it.unit}
                        </span>
                      ) : (
                        <span className="text-amber-700">Not delivered</span>
                      )}
                      {(m.status === 'ORDERED' ||
                        m.status === 'PARTIALLY_DELIVERED' ||
                        m.status === 'APPROVED') && (
                        <button
                          type="button"
                          className="text-[var(--primary)] font-medium"
                          disabled={recordDelivery.isPending}
                          onClick={() => {
                            const qty = prompt(
                              `Delivered quantity for "${it.description}" (ordered ${String(it.quantity)} ${it.unit}):`,
                              String(it.quantity),
                            );
                            if (qty == null) return;
                            const n = Number(qty);
                            if (Number.isNaN(n) || n < 0) return;
                            void recordDelivery.mutateAsync({
                              requestId: m.id,
                              itemId: it.id,
                              deliveredQuantity: n,
                            });
                          }}
                        >
                          Record
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {editId === m.id ? (
                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-xs text-[var(--text-secondary)]">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className={`text-sm border border-slate-300 rounded-xl px-2 py-1 ${inputFocus}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  {editStatus === 'REJECTED' && (
                    <div>
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">
                        Rejection reason
                      </label>
                      <input
                        value={editRejection}
                        onChange={(e) => setEditRejection(e.target.value)}
                        className={`w-full px-2 py-1 border border-slate-300 rounded-xl text-sm ${inputFocus}`}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-sm rounded-xl transition-colors disabled:opacity-60"
                      disabled={update.isPending}
                      onClick={() => void saveStatus(m)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-md"
                      onClick={() => {
                        setEditId(null);
                        setEditRejection('');
                      }}
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
                    setEditId(m.id);
                    setEditStatus(m.status);
                    setEditRejection(m.rejectionReason ?? '');
                  }}
                >
                  Update status
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
