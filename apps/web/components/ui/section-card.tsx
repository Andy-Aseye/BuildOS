import { type ReactNode } from 'react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({ title, subtitle, actions, children, className = '', noPadding }: SectionCardProps) {
  return (
    <div className={`rounded-2xl bg-white border border-[var(--border)] overflow-hidden h-full flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div>
            {title && <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>}
            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`flex-1 ${noPadding ? '' : 'p-6'}`}>{children}</div>
    </div>
  );
}
