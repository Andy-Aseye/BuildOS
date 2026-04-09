'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCreateProject } from '@/lib/hooks/use-project-queries';
import { SectionCard } from '@/components/ui/section-card';

export function CreateProjectForm() {
  const router = useRouter();
  const create = useCreateProject();
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [budgetGhs, setBudgetGhs] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [fxRateGhsUsd, setFxRateGhsUsd] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await create.mutateAsync({
        name: name.trim(),
        clientName: clientName.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(budgetGhs ? { budgetGhs: Number(budgetGhs) } : {}),
        ...(budgetUsd ? { budgetUsd: Number(budgetUsd) } : {}),
        ...(fxRateGhsUsd ? { fxRateGhsUsd: Number(fxRateGhsUsd) } : {}),
        ...(startDate ? { startDate: `${startDate}T12:00:00.000Z` } : {}),
        ...(expectedEndDate ? { expectedEndDate: `${expectedEndDate}T12:00:00.000Z` } : {}),
      });
      router.push(`/projects/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    }
  }

  return (
    <div className="max-w-2xl">
      <SectionCard title="New Project" subtitle="Fill in the details to create a new construction project.">
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <p className="text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Project name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Client name *</label>
              <input required value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Budget (GHS)</label>
              <input type="number" step="0.01" value={budgetGhs} onChange={(e) => setBudgetGhs(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Budget (USD)</label>
              <input type="number" step="0.01" value={budgetUsd} onChange={(e) => setBudgetUsd(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">FX rate GHS/USD</label>
            <input type="number" step="0.0001" value={fxRateGhsUsd} onChange={(e) => setFxRateGhsUsd(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Expected end</label>
              <input type="date" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={create.isPending}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors"
            >
              {create.isPending ? 'Creating…' : 'Create project'}
            </button>
            <Link href="/projects" className="px-5 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl text-[var(--text-secondary)] hover:bg-slate-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
