'use client';

import Link from 'next/link';
import { useProject } from '@/lib/hooks/use-project-queries';
import { StatusBadge } from '@/components/ui/status-badge';

export function ProjectHeader({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="mb-4 animate-pulse">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-3 w-16 bg-slate-200/70 rounded" />
            <div className="h-7 w-56 bg-slate-200/70 rounded" />
            <div className="h-4 w-36 bg-slate-200/70 rounded" />
          </div>
          <div className="h-10 w-20 bg-slate-200/70 rounded-xl" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-6 w-24 bg-slate-200/70 rounded-full" />
          <div className="h-3 w-28 bg-slate-200/70 rounded" />
          <div className="h-3 w-24 bg-slate-200/70 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error instanceof Error ? error.message : 'Project not found.'}{' '}
        <Link href="/" className="font-medium underline">
          Back to portfolio
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-mono font-medium text-[var(--primary)] tracking-wider">{data.code}</p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">{data.name}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{data.clientName}</p>
        </div>
        <Link
          href={`/projects/${projectId}/edit`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-xl px-4 py-2 hover:bg-slate-50 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <StatusBadge status={data.status} />
        {data._count != null && (
          <>
            <span className="text-xs text-[var(--text-muted)]">{data._count.dailyLogs} diary entries</span>
            <span className="text-xs text-[var(--text-muted)]">&middot;</span>
            <span className="text-xs text-[var(--text-muted)]">{data._count.costEntries} cost lines</span>
          </>
        )}
        {data.members && (
          <>
            <span className="text-xs text-[var(--text-muted)]">&middot;</span>
            <span className="text-xs text-[var(--text-muted)]">{data.members.length} team members</span>
          </>
        )}
      </div>
    </div>
  );
}
