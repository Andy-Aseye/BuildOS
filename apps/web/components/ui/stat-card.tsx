import { type ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  loading?: boolean;
  onClick?: () => void;
}

const iconBg: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function StatCard({ icon, label, value, trend, color = 'blue', loading, onClick }: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-2xl bg-white border border-[var(--border)] p-5 flex items-start gap-4 text-left${onClick ? ' hover:border-slate-300 hover:shadow-sm transition-all' : ''}`}
    >
      <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-muted)] mb-1">{label}</p>
        {loading ? (
          <div className="flex items-center gap-2 h-8">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin text-slate-400">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-20" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-[var(--text-primary)] leading-none">{value}</p>
            {trend && <p className="text-xs text-[var(--text-muted)] mt-1">{trend}</p>}
          </>
        )}
      </div>
    </Tag>
  );
}
