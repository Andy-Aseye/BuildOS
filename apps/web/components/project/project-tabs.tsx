'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { canViewFinancials } from '@/lib/rbac';

const TABS: { label: string; segment: string; financial?: boolean }[] = [
  { label: 'Overview', segment: '' },
  { label: 'Diary', segment: '/diary' },
  { label: 'Attendance', segment: '/attendance' },
  { label: 'Photos', segment: '/photos' },
  { label: 'Costs', segment: '/costs', financial: true },
  { label: 'Team', segment: '/team' },
  { label: 'Files', segment: '/files' },
  { label: 'Timeline', segment: '/timeline' },
  { label: 'Drawings', segment: '/drawings' },
  { label: 'RFIs', segment: '/rfis' },
  { label: 'Materials', segment: '/materials' },
  { label: 'Delays', segment: '/delays' },
  { label: 'Reports', segment: '/reports' },
];

export function ProjectTabs() {
  const pathname = usePathname();
  const { user } = useAuth();
  const showFinancials = canViewFinancials(user?.role);
  const projectBase = pathname.match(/\/projects\/[^/]+/)?.[0] || '';

  const visibleTabs = TABS.filter((t) => !t.financial || showFinancials);

  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-0 border-b border-[var(--border)] scrollbar-hide">
      {visibleTabs.map((tab) => {
        const href = `${projectBase}${tab.segment}`;
        const isActive =
          tab.segment === ''
            ? pathname === projectBase || pathname === `${projectBase}/`
            : pathname.startsWith(href);

        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-full transition-colors',
              isActive
                ? 'bg-slate-900 text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
