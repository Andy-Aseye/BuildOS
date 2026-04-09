'use client';

import { type ReactNode } from 'react';
import { usePagination } from '@/lib/hooks/use-pagination';
import { Pagination } from './pagination';

interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** Set to 0 or false to disable pagination */
  defaultPageSize?: number | false;
  pageSizeOptions?: number[];
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = 'No data',
  defaultPageSize = 10,
  pageSizeOptions,
}: DataTableProps<T>) {
  const paginate = defaultPageSize !== false && defaultPageSize > 0;
  const pagination = usePagination(data, {
    defaultPageSize: paginate ? defaultPageSize : data.length || 1,
  });

  const rows = paginate ? pagination.paginatedData : data;

  if (!data.length) {
    return (
      <div className="rounded-2xl bg-white border border-[var(--border)] p-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50/50 transition-colors`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-3.5 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginate && data.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={pageSizeOptions}
          />
        </div>
      )}
    </div>
  );
}
