import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--border)] bg-white p-12 text-center">
      {icon && <div className="mx-auto mb-4 text-[var(--text-muted)]">{icon}</div>}
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)] mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
