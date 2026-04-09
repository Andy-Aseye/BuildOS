'use client';

import { useMemo, useState } from 'react';
import {
  useDelayLogs,
  usePhases,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  type PhaseRow,
} from '@/lib/hooks/use-project-queries';
import { formatDateOnly } from '@/lib/format';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonCards, SkeletonSectionCard } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'DELAYED', 'COMPLETED'] as const;

const inputClassName =
  'w-full text-sm border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

function dateInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toIsoDay(value: string) {
  if (!value) return undefined;
  return `${value}T12:00:00.000Z`;
}

function PhaseBlock({
  projectId,
  phase,
}: {
  projectId: string;
  phase: PhaseRow;
}) {
  const update = useUpdatePhase(projectId);
  const del = useDeletePhase(projectId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(phase.name);
  const [order, setOrder] = useState(String(phase.order));
  const [plannedStart, setPlannedStart] = useState(dateInput(phase.plannedStart));
  const [plannedEnd, setPlannedEnd] = useState(dateInput(phase.plannedEnd));
  const [actualStart, setActualStart] = useState(dateInput(phase.actualStart));
  const [actualEnd, setActualEnd] = useState(dateInput(phase.actualEnd));
  const [percent, setPercent] = useState(String(phase.percentComplete));
  const [status, setStatus] = useState(phase.status);
  const [notes, setNotes] = useState(phase.notes ?? '');
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    const o = Number(order);
    const pc = Number(percent);
    if (!name.trim() || Number.isNaN(o) || Number.isNaN(pc) || pc < 0 || pc > 100) {
      setErr('Check name, order, and percent (0–100).');
      return;
    }
    try {
      await update.mutateAsync({
        phaseId: phase.id,
        body: {
          name: name.trim(),
          order: o,
          plannedStart: toIsoDay(plannedStart),
          plannedEnd: toIsoDay(plannedEnd),
          actualStart: toIsoDay(actualStart),
          actualEnd: toIsoDay(actualEnd),
          percentComplete: pc,
          status,
          notes: notes.trim() || undefined,
        },
      });
      setEditing(false);
      toast.success('Phase updated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      setErr(msg);
      toast.error(msg);
    }
  }

  async function remove() {
    if (!window.confirm(`Remove phase “${phase.name}”?`)) return;
    setErr(null);
    try {
      await del.mutateAsync(phase.id);
      toast.success('Phase removed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setErr(msg);
      toast.error(msg);
    }
  }

  return (
    <li className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
      <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-[var(--text-muted)]">#{phase.order}</span>
            <StatusBadge status={phase.status} />
          </div>
          <div className="font-medium text-[var(--text-primary)] mt-1">{phase.name}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1 space-y-0.5">
            <div>
              Planned: {formatDateOnly(phase.plannedStart)} → {formatDateOnly(phase.plannedEnd)}
            </div>
            {(phase.actualStart || phase.actualEnd) && (
              <div>
                Actual: {formatDateOnly(phase.actualStart)} → {formatDateOnly(phase.actualEnd)}
              </div>
            )}
          </div>
          {phase.notes ? (
            <p className="text-sm text-[var(--text-secondary)] mt-2">{phase.notes}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-48 shrink-0">
          <div className="text-right">
            <div className="text-lg font-semibold text-[var(--primary)]">{phase.percentComplete}%</div>
            <div className="text-xs text-[var(--text-muted)]">complete</div>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, phase.percentComplete))}%` }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setEditing(!editing);
                setErr(null);
                setName(phase.name);
                setOrder(String(phase.order));
                setPlannedStart(dateInput(phase.plannedStart));
                setPlannedEnd(dateInput(phase.plannedEnd));
                setActualStart(dateInput(phase.actualStart));
                setActualEnd(dateInput(phase.actualEnd));
                setPercent(String(phase.percentComplete));
                setStatus(phase.status);
                setNotes(phase.notes ?? '');
              }}
              className="text-xs font-medium text-[var(--primary)] hover:underline"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={del.isPending}
              className="text-xs font-medium text-[var(--status-red)] hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="border-t border-[var(--border)] bg-slate-50 p-4 space-y-3">
          {err && <p className="text-xs text-[var(--status-red)]">{err}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClassName}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">% complete</label>
              <input
                type="number"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Planned start</label>
                <input
                  type="date"
                  value={plannedStart}
                  onChange={(e) => setPlannedStart(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Planned end</label>
                <input
                  type="date"
                  value={plannedEnd}
                  onChange={(e) => setPlannedEnd(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Actual start</label>
                <input
                  type="date"
                  value={actualStart}
                  onChange={(e) => setActualStart(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Actual end</label>
                <input
                  type="date"
                  value={actualEnd}
                  onChange={(e) => setActualEnd(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputClassName}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={update.isPending}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            {update.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </li>
  );
}

function AddPhaseForm({ projectId, nextOrder }: { projectId: string; nextOrder: number }) {
  const create = useCreatePhase(projectId);
  const [name, setName] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) {
      setErr('Enter a phase name.');
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        order: nextOrder,
        ...(plannedStart ? { plannedStart: toIsoDay(plannedStart) } : {}),
        ...(plannedEnd ? { plannedEnd: toIsoDay(plannedEnd) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setName('');
      setPlannedStart('');
      setPlannedEnd('');
      setNotes('');
      toast.success('Phase added');
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : 'Could not add phase';
      setErr(msg);
      toast.error(msg);
    }
  }

  return (
    <SectionCard
      title="Add phase"
      subtitle="Break the job into phases (e.g. Substructure, Frame, Finishes). Update % complete as work on site progresses."
    >
      <form onSubmit={submit} className="space-y-3">
        {err && <p className="text-xs text-[var(--status-red)]">{err}</p>}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Superstructure"
            className={inputClassName}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Planned start</label>
            <input
              type="date"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Planned end</label>
            <input
              type="date"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputClassName}
          />
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
        >
          {create.isPending ? 'Adding…' : 'Add phase'}
        </button>
      </form>
    </SectionCard>
  );
}

function causeLabel(c: string) {
  return c.charAt(0) + c.slice(1).toLowerCase();
}

export function ProjectTimeline({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = usePhases(projectId);
  const { data: delays = [] } = useDelayLogs(projectId);

  const nextOrder = useMemo(() => {
    const phases = data ?? [];
    if (!phases.length) return 0;
    return Math.max(...phases.map((p) => p.order)) + 1;
  }, [data]);

  const totalDelayHours = useMemo(() => {
    return delays.reduce((sum, d) => sum + Number(d.durationHours), 0);
  }, [delays]);

  const delayCauseSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of delays) {
      const cause = d.cause;
      map.set(cause, (map.get(cause) ?? 0) + Number(d.durationHours));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [delays]);

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-4">
        <SkeletonSectionCard lines={4} />
        <SkeletonCards count={4} cols={1} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load phases'}
      </p>
    );
  }

  const phases = data ?? [];
  const sorted = [...phases].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6 max-w-3xl">
      <AddPhaseForm projectId={projectId} nextOrder={nextOrder} />

      {!sorted.length ? (
        <EmptyState
          title="No phases yet"
          description="Add the first phase above."
        />
      ) : (
        <ul className="space-y-4">
          {sorted.map((p) => (
            <PhaseBlock key={p.id} projectId={projectId} phase={p} />
          ))}
        </ul>
      )}

      {delays.length > 0 && (
        <SectionCard title={`Delay impact — ${totalDelayHours.toFixed(1)} hours total`}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              {delayCauseSummary.map(([cause, hours]) => (
                <div
                  key={cause}
                  className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-amber-900">{causeLabel(cause)}</span>
                  <span className="text-amber-700 ml-1">{hours.toFixed(1)} h</span>
                </div>
              ))}
            </div>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1 max-h-40 overflow-y-auto">
              {delays.slice(0, 20).map((d) => (
                <li key={d.id}>
                  <span className="font-mono">{formatDateOnly(d.delayDate)}</span>{' '}
                  — {causeLabel(d.cause)} ({String(d.durationHours)} h):{' '}
                  {d.description.slice(0, 120)}
                </li>
              ))}
            </ul>
            <a
              href={`/projects/${projectId}/delays`}
              className="text-xs text-[var(--primary)] font-medium"
            >
              View all delays →
            </a>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
