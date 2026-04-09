'use client';

import { useState } from 'react';
import { useDiaryPhotos } from '@/lib/hooks/use-project-queries';
import { EmptyState } from '@/components/ui/empty-state';

export function ProjectPhotos({ projectId }: { projectId: string }) {
  const { data, isLoading, error } = useDiaryPhotos(projectId);
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading photos…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--status-red)]">
        {error instanceof Error ? error.message : 'Failed to load photos'}
      </p>
    );
  }

  const photos = data ?? [];
  if (!photos.length) {
    return (
      <EmptyState
        icon={
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
        }
        title="No photos yet"
        description="Photos linked to diary entries will appear here."
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setSelected(p.storageUrl)}
              className="group relative w-full aspect-square rounded-2xl overflow-hidden border border-[var(--border)] bg-slate-50 hover:shadow-md transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.storageUrl} alt={p.caption ?? ''} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              {p.dailyLog && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-[11px] text-white font-medium">
                    {new Date(p.dailyLog.logDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected} alt="" className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" />
        </div>
      )}
    </>
  );
}
