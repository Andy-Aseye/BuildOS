'use client';

import { type ReactNode } from 'react';

function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`}
      style={style}
    />
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-[var(--border)] p-5 flex items-start gap-4">
          <Shimmer className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSectionCard({ lines = 4, title }: { lines?: number; title?: boolean }) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden h-full">
      {title !== false && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="space-y-1.5">
            <Shimmer className="h-4 w-32" />
            <Shimmer className="h-3 w-48" />
          </div>
          <Shimmer className="h-4 w-14" />
        </div>
      )}
      <div className="p-6 space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Shimmer
            key={i}
            className="h-4"
            style={{ width: `${75 + Math.random() * 25}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
      <div className="bg-slate-50 px-5 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex gap-6">
            {Array.from({ length: cols }).map((_, j) => (
              <Shimmer
                key={j}
                className="h-4 flex-1"
                style={{ maxWidth: j === 0 ? '120px' : undefined } as React.CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 4, cols = 2 }: { count?: number; cols?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-[var(--border)] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-3/4" />
              <Shimmer className="h-3 w-1/2" />
            </div>
          </div>
          <Shimmer className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="space-y-6 animate-pulse">
      {children ?? (
        <>
          <div className="space-y-2">
            <Shimmer className="h-7 w-48" />
            <Shimmer className="h-4 w-72" />
          </div>
          <SkeletonStatCards count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonSectionCard lines={5} />
            <SkeletonSectionCard lines={5} />
          </div>
          <SkeletonTable rows={5} cols={5} />
        </>
      )}
    </div>
  );
}

export { Shimmer };
