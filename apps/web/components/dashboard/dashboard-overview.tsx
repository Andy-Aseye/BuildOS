'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/lib/auth-context';
import { canViewFinancials } from '@/lib/rbac';
import {
  useProjects,
  useOrgUsers,
  useTenantRfis,
  type RfiRow,
  type ProjectSummary,
} from '@/lib/hooks/use-project-queries';
import { StatCard } from '@/components/ui/stat-card';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonStatCards, SkeletonSectionCard } from '@/components/ui/skeleton';

function CardSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="animate-spin text-slate-400">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-20" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-xs text-[var(--text-muted)]">Loading data</p>
    </div>
  );
}

function CardEmpty({ message = 'No data found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <line x1="9" y1="14" x2="15" y2="14" />
        <line x1="9" y1="18" x2="13" y2="18" />
      </svg>
      <p className="text-sm text-[var(--text-muted)]">{message}</p>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Icons ──────────────────────────────────────────────────── */

function FolderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ZapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
/* ── Status Distribution (donut chart via SVG) ──────────────── */

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  ON_HOLD: '#fb923c',
  COMPLETED: '#6366f1',
  CANCELLED: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

function StatusDonut({ projects }: { projects: ProjectSummary[] }) {
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of projects) {
      map[p.status] = (map[p.status] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([status, value]) => ({
        name: STATUS_LABELS[status] ?? status.replace(/_/g, ' '),
        value,
        color: STATUS_COLORS[status] ?? '#94a3b8',
      }));
  }, [projects]);

  const total = projects.length;
  if (!total) return null;

  return (
    <div className="flex items-center gap-10 py-4">
      <div className="relative shrink-0 w-[220px] h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              cornerRadius={5}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm text-[var(--text-muted)]">Total Projects</span>
          <span className="text-4xl font-bold text-[var(--text-primary)] leading-tight">{total}</span>
        </div>
      </div>
      <div className="space-y-3 w-48">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-3">
            <span
              className="w-4 h-4 rounded shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-[var(--text-secondary)]">{entry.name}</span>
            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums ml-auto">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Overdue urgency banner ────────────────────────────────── */

function isOverdue(r: RfiRow) {
  if (r.status === 'CLOSED') return false;
  return new Date(r.dueDate) < new Date(new Date().toISOString().slice(0, 10));
}

function OverdueCallout({ rfis }: { rfis: RfiRow[] }) {
  const overdueCount = rfis.filter(isOverdue).length;
  if (!overdueCount) return null;

  return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
        <AlertIcon />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800">
          {overdueCount} overdue {overdueCount === 1 ? 'item' : 'items'} need attention
        </p>
        <p className="text-xs text-red-600 mt-0.5">RFIs past their due date across your projects</p>
      </div>
      <Link href="/open-items" className="text-xs font-medium text-red-700 hover:underline shrink-0">
        Review now &rarr;
      </Link>
    </div>
  );
}

/* ── Upcoming deadlines ────────────────────────────────────── */

function UpcomingDeadlines({ rfis }: { rfis: RfiRow[] }) {
  const upcoming = useMemo(() => {
    const now = new Date();
    const weekOut = new Date(now);
    weekOut.setDate(weekOut.getDate() + 7);
    return rfis
      .filter((r) => r.status !== 'CLOSED' && new Date(r.dueDate) >= now && new Date(r.dueDate) <= weekOut)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [rfis]);

  if (!upcoming.length) {
    return <CardEmpty message="No deadlines in the next 7 days" />;
  }

  return (
    <div className="space-y-2">
      {upcoming.map((rfi) => {
        const due = new Date(rfi.dueDate);
        const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
        return (
          <div key={rfi.id} className="flex items-center gap-3 py-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${daysLeft <= 2 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              {daysLeft}d
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{rfi.title}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{rfi.project?.name ?? 'Unknown'}</p>
            </div>
            <StatusBadge status={rfi.status} />
          </div>
        );
      })}
    </div>
  );
}

/* ── RFI Summary Row ──────────────────────────────────────── */

function RfiSummaryRow({ rfi }: { rfi: RfiRow }) {
  const overdue = isOverdue(rfi);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-red-500' : 'bg-amber-400'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{rfi.title}</p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {rfi.project?.name ?? 'Unknown project'} &middot; Due {new Date(rfi.dueDate).toLocaleDateString()}
        </p>
      </div>
      <StatusBadge status={overdue ? 'OVERDUE' : rfi.status} />
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────── */

export function DashboardOverview() {
  const { user } = useAuth();
  const showFinancials = canViewFinancials(user?.role);
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: users, isLoading: loadingUsers } = useOrgUsers();
  const { data: openRfis, isLoading: loadingOpenRfis } = useTenantRfis({ openOnly: true });
  const { data: allRfis, isLoading: loadingRfis } = useTenantRfis({});

  const initialLoading = loadingProjects && loadingUsers && loadingRfis && loadingOpenRfis;

  const totalProjects = projects?.length ?? 0;
  const activeProjects = projects?.filter((p) => p.status === 'ACTIVE').length ?? 0;
  const openCount = openRfis?.length ?? 0;
  const overdueCount = (allRfis ?? []).filter(isOverdue).length;
  const teamCount = users?.length ?? 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{today}</p>
        </div>
        <SkeletonStatCards count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonSectionCard lines={5} />
          <SkeletonSectionCard lines={5} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2"><SkeletonSectionCard lines={4} /></div>
          <div className="lg:col-span-1"><SkeletonSectionCard lines={6} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">{today}</p>
      </div>

      {/* Overdue urgency banner */}
      {allRfis && <OverdueCallout rfis={allRfis} />}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FolderIcon />} label="Total Projects" value={totalProjects} color="blue" loading={loadingProjects} />
        <StatCard icon={<ZapIcon />} label="Active Projects" value={activeProjects} color="green" loading={loadingProjects} />
        <StatCard
          icon={<AlertIcon />}
          label="Open Tasks"
          value={openCount}
          trend={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
          color="amber"
          loading={loadingOpenRfis}
        />
        <StatCard icon={<UsersIcon />} label="Team Members" value={teamCount} color="slate" loading={loadingUsers} />
      </div>

      {/* Row 2: Status distribution + Upcoming deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Project Status" subtitle="Distribution across all projects">
          {loadingProjects ? <CardSpinner /> : projects?.length ? (
            <StatusDonut projects={projects} />
          ) : (
            <CardEmpty message="No projects yet" />
          )}
        </SectionCard>

        <SectionCard
          title="Upcoming Deadlines"
          subtitle="RFIs due in the next 7 days"
          actions={
            <Link href="/open-items" className="text-xs font-medium text-[var(--primary)] hover:underline">
              View all
            </Link>
          }
        >
          {loadingRfis ? <CardSpinner /> : <UpcomingDeadlines rfis={allRfis ?? []} />}
        </SectionCard>
      </div>

      {/* Row 3: Recent Projects + Open Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Projects"
            actions={
              <Link href="/projects" className="text-xs font-medium text-[var(--primary)] hover:underline">
                View all
              </Link>
            }
          >
            {loadingProjects ? <CardSpinner /> : !projects?.length ? (
              <CardEmpty message="No projects yet" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border)] hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                      <FolderIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{p.clientName}</p>
                      <div className="mt-2">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-1">
          <SectionCard
            title="Open Tasks"
            subtitle={`${openCount} open`}
            actions={
              <Link href="/open-items" className="text-xs font-medium text-[var(--primary)] hover:underline">
                View all
              </Link>
            }
          >
            {loadingOpenRfis ? <CardSpinner /> : !openRfis?.length ? (
              <CardEmpty message="No open tasks" />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {openRfis.slice(0, 5).map((rfi) => (
                  <RfiSummaryRow key={rfi.id} rfi={rfi} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

    </div>
  );
}
