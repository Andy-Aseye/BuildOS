'use client';

import Link from 'next/link';
import { useProjects } from '@/lib/hooks/use-project-queries';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonCards } from '@/components/ui/skeleton';

export default function ReportsPage() {
  const { data, isLoading, error } = useProjects();

  return (
    <div>
      <PageHeader title="Reports" description="Generate and manage project progress reports for your clients." />

      {isLoading && <SkeletonCards count={6} cols={3} />}
      {error && <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Could not load projects'}</p>}

      {data && !data.length && (
        <EmptyState title="No projects yet" description="Create a project first, then generate reports." />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}/reports`}
              className="group rounded-2xl bg-white border border-[var(--border)] p-5 hover:shadow-md hover:border-slate-300 transition-all"
            >
              <p className="text-xs font-mono text-[var(--primary)] mb-1">{p.code}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{p.name}</p>
              <p className="text-xs text-[var(--text-muted)] mb-3">{p.clientName}</p>
              <div className="flex items-center justify-between">
                <StatusBadge status={p.status} />
                <span className="text-xs font-medium text-[var(--primary)] group-hover:underline">Reports &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
