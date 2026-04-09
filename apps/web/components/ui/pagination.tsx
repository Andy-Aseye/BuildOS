'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-3">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <span>
          Showing <span className="font-medium text-[var(--text-primary)]">{start}</span>
          {' – '}
          <span className="font-medium text-[var(--text-primary)]">{end}</span>
          {' of '}
          <span className="font-medium text-[var(--text-primary)]">{totalItems}</span>
        </span>
        <span className="text-[var(--border)]">|</span>
        <label className="flex items-center gap-1.5">
          <span className="text-xs">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-[var(--border)] rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavButton
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            label="Previous"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </NavButton>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-[var(--text-muted)]">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 px-2 text-xs font-medium rounded-lg transition-colors ${
                  currentPage === p
                    ? 'bg-slate-900 text-white'
                    : 'text-[var(--text-secondary)] hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}

          <NavButton
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            label="Next"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </NavButton>
        </div>
      )}
    </div>
  );
}

function NavButton({ disabled, onClick, label, children }: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [];

  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...', total);
  } else if (current >= total - 3) {
    pages.push(1, '...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, '...');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('...', total);
  }

  return pages;
}
