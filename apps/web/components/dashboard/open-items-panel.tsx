'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDateOnly } from '@/lib/format';
import { useTenantRfis, type RfiRow } from '@/lib/hooks/use-project-queries';
import { usePagination } from '@/lib/hooks/use-pagination';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SkeletonStatCards, SkeletonTable } from '@/components/ui/skeleton';

type Tab = 'overdue' | 'open' | 'closed' | 'all';

function isOverdue(r: RfiRow) {
  if (r.status === 'CLOSED') return false;
  return new Date(r.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

export function OpenItemsPanel() {
  const [tab, setTabRaw] = useState<Tab>('all');
  const { data: allRfis, isLoading, error } = useTenantRfis({});

  const { stats, filtered } = useMemo(() => {
    const all = allRfis ?? [];
    const open = all.filter((r) => r.status !== 'CLOSED');
    const overdue = all.filter((r) => isOverdue(r));
    const closed = all.filter((r) => r.status === 'CLOSED');

    let filtered: RfiRow[];
    switch (tab) {
      case 'overdue':
        filtered = overdue;
        break;
      case 'open':
        filtered = open;
        break;
      case 'closed':
        filtered = closed;
        break;
      default:
        filtered = all;
    }

    return {
      stats: { open: open.length, overdue: overdue.length, closed: closed.length },
      filtered,
    };
  }, [allRfis, tab]);

  const pagination = usePagination(filtered, { defaultPageSize: 10 });

  function setTab(t: Tab) {
    setTabRaw(t);
    pagination.setPage(1);
  }

  const TABS: [Tab, string, number][] = [
    ['all', 'All', allRfis?.length ?? 0],
    ['overdue', 'Overdue', stats.overdue],
    ['open', 'Open', stats.open],
    ['closed', 'Closed', stats.closed],
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          label="Open" value={stats.open} color="amber"
          onClick={() => setTab('open')}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
          label="Overdue" value={stats.overdue} color="red"
          onClick={() => setTab('overdue')}
        />
        <StatCard
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          label="Closed" value={stats.closed} color="green"
          onClick={() => setTab('closed')}
        />
      </div>

      <div className="flex gap-1.5 pb-4 border-b border-[var(--border)] overflow-x-auto scrollbar-hide">
        {TABS.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-slate-900 text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {isLoading && !allRfis && (
        <>
          <SkeletonStatCards count={3} />
          <SkeletonTable rows={5} cols={5} />
        </>
      )}
      {isLoading && allRfis && <LoadingSpinner />}
      {error && <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load RFIs'}</p>}

      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState title="No RFIs in this view" description="Try switching tabs to see more items." />
      )}

      {filtered.length > 0 && (
        <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Project</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ref</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Title</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Due</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pagination.paginatedData.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono text-[var(--primary)]">{r.project?.code}</span>
                      <div className="text-sm text-[var(--text-secondary)]">{r.project?.name}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--text-muted)]">{r.referenceNo}</td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="font-medium text-[var(--text-primary)]">{r.title}</div>
                      {isOverdue(r) && <span className="text-xs text-red-600 font-medium">Overdue</span>}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-[var(--text-muted)]">{formatDateOnly(r.dueDate)}</td>
                    <td className="px-5 py-3.5">
                      {r.project?.id && (
                        <Link href={`/projects/${r.project.id}/rfis`} className="text-xs font-medium text-[var(--primary)] hover:underline">
                          View
                        </Link>
                      )}
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
