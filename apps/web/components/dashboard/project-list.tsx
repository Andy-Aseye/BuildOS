'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';

type ProjectMember = {
  user: { id: string; name: string | null; role: string };
};

export type ProjectListItem = {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  members?: ProjectMember[];
  phases?: { id: string; percentComplete: number }[];
  _count?: { costEntries: number; dailyLogs: number };
};

type EnrichedProject = ProjectListItem & {
  imageUrl: string;
  managerName: string;
  managerRole: string;
  managerInitials: string;
  completion: number;
};

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80',
  'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&q=80',
  'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&q=80',
  'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&q=80',
];

function pickCoverImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return COVER_IMAGES[Math.abs(hash) % COVER_IMAGES.length];
}

function statusToCompletion(status: string, phases?: { percentComplete: number }[]): number {
  if (phases?.length) {
    const sum = phases.reduce((acc, p) => acc + p.percentComplete, 0);
    return Math.round(sum / phases.length);
  }
  switch (status.toUpperCase()) {
    case 'COMPLETED': return 100;
    case 'CANCELLED': return 0;
    default: return 0;
  }
}

function ProjectCardSkeleton() {
  return (
    <div className="flex flex-col h-full rounded-2xl bg-[var(--card-bg)] shadow-sm overflow-hidden border border-[var(--border)]">
      <div className="relative h-44 w-full bg-slate-200 animate-pulse" />
      <div className="flex flex-col flex-1 p-5 space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-8 rounded bg-slate-200 animate-pulse" />
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 animate-pulse" />
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCardSkeletonGrid() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-9 w-full max-w-sm rounded-lg bg-slate-200 animate-pulse" />
        <div className="flex items-center gap-1.5 pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="sm:ml-auto h-10 w-32 rounded-xl bg-slate-200 animate-pulse" />
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <ProjectCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_BADGE_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  ON_HOLD: 'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-blue-50 text-blue-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

function ProjectCard({ project }: { project: EnrichedProject }) {
  const badgeCls = STATUS_BADGE_COLOR[project.status] ?? 'bg-slate-100 text-slate-600';

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col h-full rounded-2xl bg-[var(--card-bg)] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-[var(--border)]"
    >
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={project.imageUrl}
          alt={project.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-sm backdrop-blur-sm ${badgeCls}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {project.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-semibold text-base text-[var(--text-primary)] leading-snug mb-1">
          {project.name}
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">{project.clientName}</p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Completion</span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">{project.completion}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
              style={{ width: `${project.completion}%` }}
            />
          </div>
        </div>

        {project.managerName && (
          <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
              {project.managerInitials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{project.managerName}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{project.managerRole}</p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProjectList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<ProjectListItem[]>('/projects'),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const enrichedData: EnrichedProject[] = useMemo(
    () =>
      (data ?? []).map((p) => {
        const pm = p.members?.find((m) => m.user.role === 'PROJECT_MANAGER') ?? p.members?.[0];
        const name = pm?.user.name ?? '';
        const initials = name
          ? name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
          : '';
        return {
          ...p,
          imageUrl: pickCoverImage(p.id),
          managerName: name,
          managerRole: pm?.user.role.replace(/_/g, ' ') ?? '',
          managerInitials: initials,
          completion: statusToCompletion(p.status, p.phases),
        };
      }),
    [data],
  );

  const STATUS_FILTERS = ['ALL', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

  const filtered = useMemo(() => {
    let list = enrichedData;
    if (statusFilter !== 'ALL') {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [enrichedData, search, statusFilter]);

  if (isLoading) {
    return <ProjectCardSkeletonGrid />;
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Could not load projects'}
      </p>
    );
  }

  if (!enrichedData.length) {
    return (
      <EmptyState
        icon={
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        }
        title="No projects yet"
        description="Create your first project to get started."
        action={
          <Link
            href="/projects/new"
            className="inline-flex px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors"
          >
            + New project
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Search + filters + action */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide border-b border-[var(--border)] pb-4">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <Link
            href="/projects/new"
            className="inline-flex px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors"
          >
            + New project
          </Link>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-10">No projects match your filters.</p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
