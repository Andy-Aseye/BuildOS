import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { PhaseRow } from '@/lib/hooks/use-project-queries';

export type ClientProgressReportData = {
  projectName: string;
  projectCode: string;
  clientName: string;
  periodLabel: string;
  generatedAtLabel: string;
  phases: PhaseRow[];
  diaryHighlights: { logDate: string; text: string }[];
  budgetSummary?: {
    totalSpentGhs: number;
    budgetGhs: number | null;
    percentConsumedGhs: number | null;
    totalSpentUsd: number;
    budgetUsd: number | null;
    percentConsumedUsd: number | null;
  } | null;
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  title: { fontSize: 20, marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  subtitle: { fontSize: 11, color: '#475569', marginBottom: 20 },
  section: { marginTop: 14, marginBottom: 6, fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 6 },
  cell: { flex: 1, paddingRight: 6 },
  cellNarrow: { width: 56, paddingRight: 4 },
  cellPct: { width: 40, textAlign: 'right' },
  muted: { fontSize: 9, color: '#64748b', marginBottom: 16 },
  diaryItem: { marginBottom: 10 },
  diaryDate: { fontSize: 9, color: '#64748b', marginBottom: 2 },
  diaryText: { fontSize: 10, lineHeight: 1.4 },
  box: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 4,
    marginTop: 6,
  },
});

function formatMoney(n: number, ccy: string) {
  const sym = ccy === 'USD' ? 'USD' : 'GHS';
  return `${sym} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ClientProgressReportDocument({ data }: { data: ClientProgressReportData }) {
  const { phases, diaryHighlights, budgetSummary } = data;

  return (
    <Document title={`${data.projectCode} — ${data.periodLabel}`} author="BuildOS">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>Project progress report</Text>
        <Text style={styles.subtitle}>
          {data.projectName} · {data.projectCode}
        </Text>
        <Text style={styles.muted}>
          Client: {data.clientName} · Period: {data.periodLabel} · Generated: {data.generatedAtLabel}
        </Text>

        {budgetSummary ? (
          <>
            <Text style={styles.section}>Financial snapshot</Text>
            <View style={styles.box}>
              <Text style={{ marginBottom: 4 }}>
                GHS spent: {formatMoney(budgetSummary.totalSpentGhs, 'GHS')}
                {budgetSummary.budgetGhs != null ? ` · Budget: ${formatMoney(budgetSummary.budgetGhs, 'GHS')}` : ''}
                {budgetSummary.percentConsumedGhs != null
                  ? ` · ${budgetSummary.percentConsumedGhs.toFixed(0)}% of GHS budget`
                  : ''}
              </Text>
              <Text>
                USD spent: {formatMoney(budgetSummary.totalSpentUsd, 'USD')}
                {budgetSummary.budgetUsd != null ? ` · Budget: ${formatMoney(budgetSummary.budgetUsd, 'USD')}` : ''}
                {budgetSummary.percentConsumedUsd != null
                  ? ` · ${budgetSummary.percentConsumedUsd.toFixed(0)}% of USD budget`
                  : ''}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.muted}>
            Financial detail is omitted from this export (restricted role).
          </Text>
        )}

        <Text style={styles.section}>Site timeline (phases)</Text>
        {phases.length === 0 ? (
          <Text style={styles.muted}>No phases recorded for this project.</Text>
        ) : (
          <>
            <View style={[styles.row, { borderBottomColor: '#94a3b8' }]}>
              <Text style={[styles.cell, { fontFamily: 'Helvetica-Bold' }]}>Phase</Text>
              <Text style={[styles.cellNarrow, { fontFamily: 'Helvetica-Bold' }]}>Status</Text>
              <Text style={[styles.cellPct, { fontFamily: 'Helvetica-Bold' }]}>%</Text>
              <Text style={[styles.cell, { fontFamily: 'Helvetica-Bold' }]}>Planned</Text>
            </View>
            {phases.map((p) => (
              <View key={p.id} style={styles.row} wrap={false}>
                <Text style={styles.cell}>{p.name}</Text>
                <Text style={styles.cellNarrow}>{p.status}</Text>
                <Text style={styles.cellPct}>{p.percentComplete}</Text>
                <Text style={styles.cell}>
                  {shortDate(p.plannedStart)} — {shortDate(p.plannedEnd)}
                </Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.section}>Site diary highlights</Text>
        {diaryHighlights.length === 0 ? (
          <Text style={styles.muted}>No diary entries in this period.</Text>
        ) : (
          diaryHighlights.map((d, i) => (
            <View key={i} style={styles.diaryItem} wrap={false}>
              <Text style={styles.diaryDate}>{d.logDate}</Text>
              <Text style={styles.diaryText}>{d.text}</Text>
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}
