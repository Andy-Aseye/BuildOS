'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject, useUpdateProject } from '@/lib/hooks/use-project-queries';
import { api } from '@/lib/api-client';
import { SectionCard } from '@/components/ui/section-card';

const STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export function EditProjectForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: project, isLoading, error } = useProject(projectId);
  const update = useUpdateProject(projectId);

  const deleteProject = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      toast.success('Project archived');
      void qc.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Archive failed');
    },
  });

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('ACTIVE');
  const [budgetGhs, setBudgetGhs] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [fxRateGhsUsd, setFxRateGhsUsd] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setClientName(project.clientName);
    setDescription(project.description ?? '');
    setStatus(project.status);
    setBudgetGhs(project.budgetGhs != null ? String(project.budgetGhs) : '');
    setBudgetUsd(project.budgetUsd != null ? String(project.budgetUsd) : '');
    setFxRateGhsUsd(project.fxRateGhsUsd != null ? String(project.fxRateGhsUsd) : '');
    setStartDate(project.startDate ? project.startDate.slice(0, 10) : '');
    setExpectedEndDate(project.expectedEndDate ? project.expectedEndDate.slice(0, 10) : '');
    setActualEndDate(project.actualEndDate ? project.actualEndDate.slice(0, 10) : '');
  }, [project]);

  const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await update.mutateAsync({
        name: name.trim(),
        clientName: clientName.trim(),
        description: description.trim() || undefined,
        status,
        ...(budgetGhs !== '' ? { budgetGhs: Number(budgetGhs) } : {}),
        ...(budgetUsd !== '' ? { budgetUsd: Number(budgetUsd) } : {}),
        ...(fxRateGhsUsd !== '' ? { fxRateGhsUsd: Number(fxRateGhsUsd) } : {}),
        ...(startDate ? { startDate: `${startDate}T12:00:00.000Z` } : {}),
        ...(expectedEndDate ? { expectedEndDate: `${expectedEndDate}T12:00:00.000Z` } : {}),
        ...(actualEndDate ? { actualEndDate: `${actualEndDate}T12:00:00.000Z` } : {}),
      });
      toast.success('Project updated');
      router.push(`/projects/${projectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(msg);
      setFormError(msg);
    }
  }

  if (isLoading || !project) return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  if (error) return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load project'}</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title="Edit Project" subtitle={`Code: ${project.code}`}>
        <form onSubmit={onSubmit} className="space-y-5">
          {formError && (
            <p className="text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Client</label>
              <input required value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Budget GHS</label>
              <input type="number" step="0.01" value={budgetGhs} onChange={(e) => setBudgetGhs(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Budget USD</label>
              <input type="number" step="0.01" value={budgetUsd} onChange={(e) => setBudgetUsd(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">FX GHS/USD</label>
            <input type="number" step="0.0001" value={fxRateGhsUsd} onChange={(e) => setFxRateGhsUsd(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Start</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Expected end</label>
              <input type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Actual end</label>
              <input type="date" value={actualEndDate} onChange={(e) => setActualEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={update.isPending}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors"
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <Link href={`/projects/${projectId}`} className="px-5 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl text-[var(--text-secondary)] hover:bg-slate-50 transition-colors">
              Cancel
            </Link>
            <button
              type="button"
              disabled={deleteProject.isPending}
              onClick={() => {
                if (window.confirm('Archive this project? It will be hidden from active lists.')) {
                  void deleteProject.mutate();
                }
              }}
              className="px-5 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl ml-auto hover:bg-red-50 transition-colors"
            >
              {deleteProject.isPending ? 'Archiving…' : 'Archive project'}
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
