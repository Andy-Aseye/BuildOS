'use client';

import { useState, useCallback } from 'react';
import { formatDate } from '@/lib/format';
import {
  useAttendanceLogs,
  useAttendanceSummary,
  useCreateAttendance,
  useImportAttendance,
} from '@/lib/hooks/use-project-queries';
import { usePagination } from '@/lib/hooks/use-pagination';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonCards, SkeletonSectionCard } from '@/components/ui/skeleton';
import { CsvImportButton } from './csv-import-button';
import { toast } from 'sonner';

export function ProjectAttendance({ projectId }: { projectId: string }) {
  const { data: logs, isLoading: loadingLogs, error } = useAttendanceLogs(projectId);
  const { data: summary, isLoading: loadingSummary } = useAttendanceSummary(projectId);
  const createAttendance = useCreateAttendance(projectId);
  const importAttendance = useImportAttendance(projectId);

  const rows = logs ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 15 });

  const [showForm, setShowForm] = useState(false);
  const [workerCount, setWorkerCount] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setWorkerCount('');
    setLogDate(new Date().toISOString().slice(0, 10));
    setFormError(null);
    setShowForm(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const count = parseInt(workerCount, 10);
    if (isNaN(count) || count < 0) {
      setFormError('Enter a valid worker count');
      return;
    }
    try {
      await createAttendance.mutateAsync({ workerCount: count, logDate });
      resetForm();
      toast.success('Attendance logged');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log attendance';
      setFormError(msg);
      toast.error(msg);
    }
  }

  if (loadingLogs && !logs) {
    return (
      <div className="space-y-6">
        <SkeletonSectionCard lines={3} />
        <SkeletonCards count={5} cols={1} />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load attendance'}</p>;
  }

  const inputCls =
    'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

  return (
    <div className="space-y-6">
      {/* Weekly summary bar chart */}
      <SectionCard title="Weekly Summary" subtitle="Last 7 days worker attendance">
        {loadingSummary || !summary ? (
          <div className="flex items-end gap-2 h-32 py-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex-1 bg-slate-100 rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 70}%` }} />
            ))}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-2 h-32">
              {summary.days.map((day) => {
                const maxW = Math.max(...summary.days.map((d) => d.workerCount), 1);
                const pct = (day.workerCount / maxW) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">{day.workerCount}</span>
                    <div className="w-full bg-slate-100 rounded-t relative" style={{ height: '80px' }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t bg-blue-500 transition-all"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">Total worker-days:</span>{' '}
                <span className="font-semibold text-[var(--text-primary)]">{summary.totalWorkerDays}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Daily avg:</span>{' '}
                <span className="font-semibold text-[var(--text-primary)]">{summary.averageDailyCount.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Log attendance form toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Attendance Log</h3>
        <div className="flex items-center gap-2">
          <CsvImportButton
            label="Import CSV"
            templateFilename="attendance_template.csv"
            columns={[
              { key: 'logDate', label: 'Date (YYYY-MM-DD)', required: true },
              { key: 'workerCount', label: 'Worker Count', required: true },
            ]}
            onImport={async (rows) => { await importAttendance.mutateAsync(rows); toast.success('Attendance data imported'); }}
          />
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-xl transition-colors"
          >
            {showForm ? 'Cancel' : '+ Log Attendance'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl bg-white border border-[var(--border)] p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Date</label>
                <input type="date" required value={logDate} onChange={(e) => setLogDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Worker Count</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={workerCount}
                  onChange={(e) => setWorkerCount(e.target.value)}
                  placeholder="e.g. 12"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={createAttendance.isPending}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors"
            >
              {createAttendance.isPending ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {/* Attendance table */}
      {!rows.length ? (
        <EmptyState
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          title="No attendance logged yet"
          description="Log daily attendance to track worker presence."
        />
      ) : (
        <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50/50">
                  <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">Date</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">Workers</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">Reported By</th>
                  <th className="text-left px-5 py-3 font-medium text-[var(--text-muted)]">Logged</th>
                </tr>
              </thead>
              <tbody>
                {pagination.paginatedData.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-3 font-medium text-[var(--text-primary)]">{formatDate(log.logDate)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                        {log.workerCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[var(--text-secondary)]">{log.reportedBy?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > pagination.pageSize && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
            />
          )}
        </div>
      )}
    </div>
  );
}
