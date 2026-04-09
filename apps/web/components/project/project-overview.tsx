'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatMoney } from '@/lib/format';
import { canViewFinancials } from '@/lib/rbac';
import {
  useAttendanceSummary,
  useBudgetSummary,
  useDiary,
  useProject,
} from '@/lib/hooks/use-project-queries';
import { BudgetAlertBanner } from '@/components/project/budget-alert-banner';
import { BudgetCategoryChart } from '@/components/project/budget-category-chart';
import { StatCard } from '@/components/ui/stat-card';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonStatCards, SkeletonSectionCard } from '@/components/ui/skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';

function budgetBarClass(band: 'none' | 'warning' | 'critical' | undefined) {
  if (band === 'critical') return 'bg-red-600';
  if (band === 'warning') return 'bg-amber-500';
  return 'bg-[var(--primary)]';
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
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
function ActivityIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const showFinancials = canViewFinancials(user?.role);
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: summary, isLoading: loadingSummary } = useBudgetSummary(projectId, showFinancials);
  const { data: diaryPage, isLoading: loadingDiary } = useDiary(projectId, 5);
  const { data: attendance, isLoading: loadingAtt } = useAttendanceSummary(projectId);

  const isInitialLoad = loadingProject && !project;

  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        <SkeletonStatCards count={3} />
        <SkeletonSectionCard lines={6} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonSectionCard lines={5} />
          </div>
          <div className="lg:col-span-1">
            <SkeletonSectionCard lines={4} />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-[var(--text-muted)]">No project data available.</p>;
  }

  const budgetGhs = project.budgetGhs != null ? Number(project.budgetGhs) : null;
  const budgetUsd = project.budgetUsd != null ? Number(project.budgetUsd) : null;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<ActivityIcon />}
          label="Status"
          value={project.status.replace(/_/g, ' ')}
          color={project.status === 'IN_PROGRESS' ? 'green' : project.status === 'COMPLETED' ? 'blue' : 'amber'}
        />
        <StatCard
          icon={<CalendarIcon />}
          label="Expected End"
          value={project.expectedEndDate ? formatDate(project.expectedEndDate) : '—'}
          color="slate"
        />
        <StatCard
          icon={<UsersIcon />}
          label="Team Size"
          value={project.members?.length ?? 0}
          color="blue"
        />
      </div>

      {/* Budget */}
      {showFinancials && (
        <SectionCard title="Budget" subtitle="Financial overview">
          {loadingSummary ? (
            <LoadingSpinner />
          ) : summary ? (
            <div className="space-y-6">
              <BudgetAlertBanner summary={summary} />
              <BudgetCategoryChart summary={summary} />
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-3">GHS</div>
                  <div className="flex justify-between text-sm"><span>Budget</span><span className="font-medium">{budgetGhs != null ? formatMoney(budgetGhs, 'GHS') : '—'}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span>Spent</span><span className="font-medium">{formatMoney(summary.totalSpentGhs, 'GHS')}</span></div>
                  {summary.percentConsumedGhs != null && (
                    <div className="mt-3">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', budgetBarClass(summary.alertBands?.ghs))} style={{ width: `${Math.min(100, summary.percentConsumedGhs)}%` }} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{summary.percentConsumedGhs.toFixed(1)}% consumed</p>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="text-xs font-semibold text-[var(--text-muted)] mb-3">USD</div>
                  <div className="flex justify-between text-sm"><span>Budget</span><span className="font-medium">{budgetUsd != null ? formatMoney(budgetUsd, 'USD') : '—'}</span></div>
                  <div className="flex justify-between text-sm mt-1"><span>Spent</span><span className="font-medium">{formatMoney(summary.totalSpentUsd, 'USD')}</span></div>
                  {summary.percentConsumedUsd != null && (
                    <div className="mt-3">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', budgetBarClass(summary.alertBands?.usd))} style={{ width: `${Math.min(100, summary.percentConsumedUsd)}%` }} />
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{summary.percentConsumedUsd.toFixed(1)}% consumed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </SectionCard>
      )}

      {/* Two-column: Diary + Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Latest Diary Entries"
            actions={<Link href={`/projects/${projectId}/diary`} className="text-xs font-medium text-[var(--primary)] hover:underline">View all</Link>}
          >
            {loadingDiary ? (
              <LoadingSpinner />
            ) : diaryPage?.data?.length ? (
              <div className="space-y-4">
                {diaryPage.data.map((row) => (
                  <div key={row.id} className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold">
                      {(row.submittedBy.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{row.submittedBy.name ?? 'Unknown'}</span>
                        <span className="text-xs text-[var(--text-muted)]">{formatDate(row.logDate)}</span>
                      </div>
                      {row.aiSummary && (
                        <p className="mt-1 text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 inline-block">{row.aiSummary}</p>
                      )}
                      <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{row.rawContent}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No diary entries yet.</p>
            )}
          </SectionCard>
        </div>

        <div className="lg:col-span-1">
          <SectionCard title="Attendance" subtitle="Last 7 days">
            {loadingAtt ? (
              <LoadingSpinner />
            ) : attendance && attendance.days.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{attendance.totalWorkerDays}</span>
                  <span className="text-xs text-[var(--text-muted)]">worker-days (avg {attendance.averageDailyCount.toFixed(1)}/day)</span>
                </div>
                {(() => {
                  const maxCount = Math.max(1, ...attendance.days.map((d) => d.workerCount));
                  return (
                    <div className="flex items-end gap-1.5 h-28">
                      {attendance.days.map((d) => {
                        const pct = (d.workerCount / maxCount) * 100;
                        const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' });
                        return (
                          <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.workerCount}`}>
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">{d.workerCount}</span>
                            <div className="w-full flex justify-center">
                              <div className="w-full max-w-[28px] rounded-t bg-[var(--primary)] transition-all" style={{ height: `${Math.max(4, (pct / 100) * 80)}px` }} />
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">{dayLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No attendance data.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
