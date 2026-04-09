'use client';

import { useState, useCallback } from 'react';
import { formatDate } from '@/lib/format';
import { useDiary, useCreateDiaryEntry } from '@/lib/hooks/use-project-queries';
import { usePagination } from '@/lib/hooks/use-pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonCards } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const WEATHER_OPTIONS = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Windy', 'Hot', 'Cold'] as const;

const inputCls =
  'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

export function ProjectDiary({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useDiary(projectId, 40);
  const createEntry = useCreateDiaryEntry(projectId);
  const rows = data?.data ?? [];
  const pagination = usePagination(rows, { defaultPageSize: 10 });

  const [showForm, setShowForm] = useState(false);
  const [rawContent, setRawContent] = useState('');
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [weather, setWeather] = useState('');
  const [activities, setActivities] = useState('');
  const [incidents, setIncidents] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setRawContent('');
    setLogDate(new Date().toISOString().slice(0, 10));
    setWeather('');
    setActivities('');
    setIncidents('');
    setFormError(null);
    setShowForm(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await createEntry.mutateAsync({
        rawContent: rawContent.trim(),
        logDate,
        weather: weather || undefined,
        activities: activities.trim() ? activities.split('\n').map((a) => a.trim()).filter(Boolean) : undefined,
        incidents: incidents.trim() ? incidents.split('\n').map((i) => i.trim()).filter(Boolean) : undefined,
      });
      resetForm();
      toast.success('Diary entry created');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create entry';
      setFormError(msg);
      toast.error(msg);
    }
  }

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-4">
        <SkeletonCards count={5} cols={1} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load diary'}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Diary Entries</h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-xl transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      {/* Create form */}
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Weather</label>
                <select value={weather} onChange={(e) => setWeather(e.target.value)} className={`${inputCls} bg-white`}>
                  <option value="">Select weather</option>
                  {WEATHER_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Daily Report</label>
              <textarea
                required
                rows={4}
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Describe today's work, progress, and any issues..."
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Activities (one per line)</label>
                <textarea
                  rows={3}
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  placeholder="Foundation work&#10;Rebar installation"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Incidents (one per line)</label>
                <textarea
                  rows={3}
                  value={incidents}
                  onChange={(e) => setIncidents(e.target.value)}
                  placeholder="Minor delay due to rain"
                  className={inputCls}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={createEntry.isPending}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors"
            >
              {createEntry.isPending ? 'Saving…' : 'Save Entry'}
            </button>
          </form>
        </div>
      )}

      {/* Entries list */}
      {!rows.length ? (
        <EmptyState
          icon={
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
          title="No diary entries yet"
          description="Create an entry using the button above, or diary entries from WhatsApp messages will appear here."
        />
      ) : (
        <div className="relative max-w-3xl">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--border)]" />
          <div className="space-y-6">
            {pagination.paginatedData.map((row) => (
              <div key={row.id} className="relative pl-10">
                <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-white border-2 border-[var(--primary)]" />
                <div className="rounded-2xl bg-white border border-[var(--border)] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold shrink-0">
                      {(row.submittedBy.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{row.submittedBy.name ?? 'Unknown'}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(row.logDate)} &middot; {row.source}</p>
                    </div>
                  </div>
                  {row.aiSummary && (
                    <div className="mb-3 bg-blue-50 rounded-xl px-4 py-2.5">
                      <p className="text-xs font-medium text-blue-700">{row.aiSummary}</p>
                    </div>
                  )}
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{row.rawContent}</p>
                  {row.photos?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.photos.map((ph) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={ph.id} src={ph.storageUrl} alt={ph.caption ?? ''} className="h-20 w-20 rounded-lg object-cover border border-[var(--border)]" />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {rows.length > 0 && (
            <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden mt-6">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
