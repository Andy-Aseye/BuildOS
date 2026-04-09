'use client';

import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/lib/auth-context';
import { formatDate, formatDateOnly } from '@/lib/format';
import { canViewFinancials } from '@/lib/rbac';
import {
  useBudgetSummary,
  useCreateProgressReport,
  useDiary,
  useGenerateNarrative,
  usePhases,
  useProgressReports,
  useProject,
  useUpdateProgressReport,
} from '@/lib/hooks/use-project-queries';
import type { ClientProgressReportData } from '@/lib/pdf/client-progress-report-document';

type Preset = '7' | '30' | 'month';

const inputFocusClass =
  'focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400';

function rangeForPreset(preset: Preset): { start: Date; end: Date; label: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  if (preset === '7') {
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Last 7 days' };
  }
  if (preset === '30') {
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return { start, end, label: 'Last 30 days' };
  }
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return {
    start,
    end,
    label: `${start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} (month to date)`,
  };
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d >= start && d <= end;
}

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function ProjectReports({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const showBudget = canViewFinancials(user?.role);
  const { data: project, isLoading: loadingProject } = useProject(projectId);
  const { data: phases = [], isLoading: loadingPhases } = usePhases(projectId);
  const { data: diaryPage, isLoading: loadingDiary } = useDiary(projectId, 80);
  const { data: budget, isLoading: loadingBudget } = useBudgetSummary(projectId, showBudget);
  const { data: storedReports = [], isLoading: loadingStored } = useProgressReports(projectId);
  const createStored = useCreateProgressReport(projectId);
  const updateStored = useUpdateProgressReport(projectId);
  const generateNarrative = useGenerateNarrative(projectId);

  const [preset, setPreset] = useState<Preset>('30');
  const [narrative, setNarrative] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentEmailDraft, setSentEmailDraft] = useState<Record<string, string>>({});

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.order - b.order),
    [phases],
  );

  async function buildPdfBlob(): Promise<{
    blob: Blob;
    start: Date;
    end: Date;
    periodLabel: string;
    data: ClientProgressReportData;
  } | null> {
    if (!project) return null;
    const { start, end, label: periodLabel } = rangeForPreset(preset);
    const entries = (diaryPage?.data ?? []).filter((e) => inRange(e.logDate, start, end));
    const diaryHighlights = entries.slice(0, 25).map((e) => ({
      logDate: formatDateOnly(e.logDate),
      text: truncate(e.aiSummary?.trim() || e.rawContent?.trim() || '—', 650),
    }));

    const data: ClientProgressReportData = {
      projectName: project.name,
      projectCode: project.code,
      clientName: project.clientName,
      periodLabel,
      generatedAtLabel: new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      phases: sortedPhases,
      diaryHighlights,
      budgetSummary:
        showBudget && budget
          ? {
              totalSpentGhs: budget.totalSpentGhs,
              budgetGhs: budget.budgetGhs,
              percentConsumedGhs: budget.percentConsumedGhs,
              totalSpentUsd: budget.totalSpentUsd,
              budgetUsd: budget.budgetUsd,
              percentConsumedUsd: budget.percentConsumedUsd,
            }
          : null,
    };

    const [{ pdf }, { ClientProgressReportDocument }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('@/lib/pdf/client-progress-report-document'),
    ]);
    const blob = await pdf(<ClientProgressReportDocument data={data} />).toBlob();
    return { blob, start, end, periodLabel, data };
  }

  async function downloadPdf() {
    if (!project) return;
    setError(null);
    setDownloading(true);
    try {
      const built = await buildPdfBlob();
      if (!built) return;
      const url = URL.createObjectURL(built.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BuildOS-${project.code}-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build PDF');
    } finally {
      setDownloading(false);
    }
  }

  async function saveToProject() {
    if (!project) return;
    setError(null);
    const summary =
      narrative.trim() ||
      `Client progress report for ${project.name} (${rangeForPreset(preset).label}). Generated in BuildOS.`;
    setSaving(true);
    try {
      const built = await buildPdfBlob();
      if (!built) return;
      const file = new File(
        [built.blob],
        `BuildOS-${project.code}-report.pdf`,
        { type: 'application/pdf' },
      );
      await createStored.mutateAsync({
        file,
        periodStart: built.start.toISOString(),
        periodEnd: built.end.toISOString(),
        narrativeSummary: summary,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save report');
    } finally {
      setSaving(false);
    }
  }

  async function recordSent(reportId: string) {
    const email = sentEmailDraft[reportId]?.trim();
    if (!email) return;
    try {
      await updateStored.mutateAsync({ reportId, body: { sentToEmail: email } });
      setSentEmailDraft((m) => ({ ...m, [reportId]: '' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update');
    }
  }

  const loading = loadingProject || loadingPhases || loadingDiary || (showBudget && loadingBudget);

  if (loading && !project) {
    return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  }

  if (!project) {
    return <p className="text-sm text-[var(--status-red)]">Project not found.</p>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <p className="text-sm text-[var(--text-secondary)]">
        Generate a client-ready PDF with site timeline (phases), diary highlights for the selected
        period, and an optional financial snapshot for Owner / Project Manager roles. You can also
        save a copy to the project for a permanent record in Supabase Storage.
      </p>

      <SectionCard title="Generate Report">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Report period</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['7', 'Last 7 days'],
                ['30', 'Last 30 days'],
                ['month', 'Month to date'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreset(value)}
                className={
                  preset === value
                    ? 'px-3 py-1.5 rounded-full text-sm font-medium bg-slate-900 text-white'
                    : 'px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Narrative summary (stored with the PDF)
          </label>
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={3}
            placeholder="Optional. Defaults to a short auto summary if left blank."
            className={`w-full px-3 py-2 border border-slate-300 rounded-xl text-sm ${inputFocusClass}`}
          />
          <button
            type="button"
            disabled={generateNarrative.isPending || loading}
            onClick={async () => {
              setError(null);
              try {
                const { start, end } = rangeForPreset(preset);
                const result = await generateNarrative.mutateAsync({
                  periodStart: start.toISOString(),
                  periodEnd: end.toISOString(),
                });
                if (result.narrative) setNarrative(result.narrative);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'AI narrative generation failed');
              }
            }}
            className="mt-2 px-3 py-1.5 text-sm border border-[var(--border)] rounded-xl hover:bg-[var(--content-bg)] disabled:opacity-60"
          >
            {generateNarrative.isPending ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>

        {error && (
          <p className="mt-6 text-sm text-[var(--status-red)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={downloading || loading}
            onClick={() => void downloadPdf()}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            {downloading ? 'Building PDF…' : 'Download PDF report'}
          </button>
          <button
            type="button"
            disabled={saving || loading || downloading}
            onClick={() => void saveToProject()}
            className="px-4 py-2 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--content-bg)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save PDF to project'}
          </button>
        </div>
      </SectionCard>

      <p className="text-xs text-[var(--text-muted)]">
        Tip: keep phases updated on the Timeline tab so the report reflects current construction
        progress. Ensure the API env includes a Supabase bucket (see PROJECT_STORAGE_BUCKET).
      </p>

      <SectionCard title="Stored Reports">
        {loadingStored ? (
          <p className="text-sm text-[var(--text-muted)]">Loading stored reports…</p>
        ) : storedReports.length === 0 ? (
          <EmptyState
            title="No reports yet"
            description="Save a PDF to the project from Generate Report to keep a permanent record here."
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white border border-[var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Period
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Generated
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    PDF
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {storedReports.map((r) => (
                  <tr key={r.id} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDateOnly(r.periodStart)} – {formatDateOnly(r.periodEnd)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.generatedAt)}</td>
                    <td className="px-3 py-2">
                      <a
                        href={r.storageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--primary)] underline"
                      >
                        Open
                      </a>
                      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs line-clamp-2">
                        {r.narrativeSummary}
                      </p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {r.sentToEmail ? (
                        <div className="space-y-1">
                          <StatusBadge status="Sent" variant="green" />
                          <p className="text-xs text-emerald-800">{r.sentToEmail}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          <input
                            type="email"
                            placeholder="client@…"
                            value={sentEmailDraft[r.id] ?? ''}
                            onChange={(e) =>
                              setSentEmailDraft((m) => ({ ...m, [r.id]: e.target.value }))
                            }
                            className={`text-xs px-2 py-1 border border-slate-300 rounded-xl ${inputFocusClass}`}
                          />
                          <button
                            type="button"
                            className="text-xs text-[var(--primary)] font-medium text-left"
                            disabled={updateStored.isPending}
                            onClick={() => void recordSent(r.id)}
                          >
                            Record sent
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
