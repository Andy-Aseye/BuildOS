'use client';

import { useRef, useState } from 'react';

type Props = {
  label: string;
  columns: { key: string; label: string; required?: boolean }[];
  onImport: (rows: Record<string, unknown>[]) => Promise<void>;
  templateFilename: string;
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

export function CsvImportButton({ label, columns, onImport, templateFilename }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success?: string; error?: string } | null>(null);

  function downloadTemplate() {
    const header = columns.map((c) => c.key).join(',');
    const example = columns.map((c) => c.required ? `example_${c.key}` : '').join(',');
    const csv = `${header}\n${example}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setImporting(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('No data rows found in CSV');

      const typedRows = rows.map((r, i) => {
        const out: Record<string, unknown> = {};
        for (const col of columns) {
          const val = r[col.key];
          if (col.required && !val) throw new Error(`Row ${i + 2}: "${col.key}" is required`);
          if (val !== undefined && val !== '') {
            const asNum = Number(val);
            out[col.key] = isNaN(asNum) ? val : asNum;
          }
        }
        return out;
      });

      await onImport(typedRows);
      setResult({ success: `${typedRows.length} rows imported` });
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="px-4 py-2 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {importing ? 'Importing…' : label}
      </button>
      <button
        type="button"
        onClick={downloadTemplate}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] underline"
      >
        Template
      </button>
      {result?.success && <span className="text-xs text-green-600">{result.success}</span>}
      {result?.error && <span className="text-xs text-red-600">{result.error}</span>}
    </div>
  );
}
