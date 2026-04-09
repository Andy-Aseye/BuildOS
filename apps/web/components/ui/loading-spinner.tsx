'use client';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ label = 'Loading data', size = 'md' }: LoadingSpinnerProps) {
  const sizeMap = { sm: 24, md: 36, lg: 48 };
  const px = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin text-slate-400"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="opacity-20"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <p className="text-sm text-[var(--text-muted)] font-medium">{label}</p>
      )}
    </div>
  );
}
