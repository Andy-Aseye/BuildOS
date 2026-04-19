'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">
        An unexpected error occurred. Your data is safe — try refreshing the page.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
