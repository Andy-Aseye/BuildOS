'use client';

import { useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import { useDeleteFile, useProjectFiles, useUploadFile } from '@/lib/hooks/use-project-queries';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonTable } from '@/components/ui/skeleton';
import { usePagination } from '@/lib/hooks/use-pagination';
import { toast } from 'sonner';

const FOLDERS = ['DRAWINGS', 'CONTRACTS', 'PERMITS', 'REPORTS', 'OTHER'] as const;

function fileIcon(mimeType: string | null) {
  if (mimeType?.startsWith('image/')) return '🖼️';
  if (mimeType?.includes('pdf')) return '📄';
  if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📊';
  return '📎';
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function ProjectFiles({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useProjectFiles(projectId);
  const upload = useUploadFile(projectId);
  const remove = useDeleteFile(projectId);
  const [folder, setFolder] = useState<string>('OTHER');
  const [filterFolder, setFilterFolder] = useState<string>('ALL');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const rows = data ?? [];
  const filtered = filterFolder === 'ALL' ? rows : rows.filter((f) => f.folder === filterFolder);
  const pagination = usePagination(filtered, { defaultPageSize: 10 });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    try {
      await upload.mutateAsync({ file: files[0], folder });
      if (fileRef.current) fileRef.current.value = '';
      toast.success('File uploaded');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      toast.error(msg);
    }
  }

  if (isLoading) {
    return data ? (
      <LoadingSpinner />
    ) : (
      <div className="space-y-4">
        <SkeletonTable rows={6} cols={4} />
      </div>
    );
  }
  if (error) return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load files'}</p>;

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); void handleFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${isDragging ? 'border-[var(--primary)] bg-blue-50/50' : 'border-[var(--border)] bg-white'}`}
      >
        <svg className="mx-auto mb-3 text-[var(--text-muted)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-sm text-[var(--text-muted)] mb-3">Drag and drop a file here, or click to browse</p>
        {uploadError && <p className="text-xs text-[var(--status-red)] mb-3">{uploadError}</p>}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-xl text-sm">
            {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <label className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
            {upload.isPending ? 'Uploading…' : 'Browse files'}
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => void handleFiles(e.target.files)} disabled={upload.isPending} />
          </label>
        </div>
      </div>

      {/* Filter pills */}
      {rows.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto">
          {['ALL', ...FOLDERS].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilterFolder(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterFolder === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-[var(--text-secondary)] hover:bg-slate-200'}`}
            >
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      )}

      {/* File list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          title="No files yet"
          description="Upload files to get started."
        />
      ) : (
        <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">File</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Folder</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Size</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Added</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pagination.paginatedData.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <a href={f.storageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[var(--primary)] hover:underline font-medium">
                        <span>{fileIcon(f.mimeType)}</span>
                        <span className="truncate max-w-[200px]">{f.name}</span>
                      </a>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={f.folder} variant="slate" /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-[var(--text-muted)]">{formatSize(f.fileSize)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-[var(--text-muted)]">{formatDate(f.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <button type="button" disabled={remove.isPending} onClick={() => void remove.mutateAsync(f.id).then(() => toast.success('File deleted')).catch((err) => toast.error(err instanceof Error ? err.message : 'Delete failed'))} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Delete</button>
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
