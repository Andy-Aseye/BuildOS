const VARIANT_MAP: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNING: 'blue',
  IN_PROGRESS: 'amber',
  ON_HOLD: 'slate',
  COMPLETED: 'green',
  OPEN: 'amber',
  CLOSED: 'green',
  RESPONDED: 'blue',
  OVERDUE: 'red',
  DRAFT: 'slate',
  SUBMITTED: 'blue',
  UNDER_REVIEW: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  PENDING: 'amber',
  CONFIRMED: 'green',
  CANCELLED: 'slate',
  AWAITING_APPROVAL: 'amber',
  ORDERED: 'blue',
  PARTIALLY_DELIVERED: 'purple',
  DELIVERED: 'green',
  NOT_STARTED: 'slate',
  AT_RISK: 'amber',
  DELAYED: 'red',
  REVISION_REQUIRED: 'amber',
  RESUBMITTED: 'blue',
  ACKNOWLEDGED: 'amber',
  ANSWERED: 'blue',
  FIELD_WORKER: 'slate',
  FOREMAN: 'amber',
  ARCHITECT: 'blue',
  PROJECT_MANAGER: 'green',
  PENDING_CONFIRMATION: 'amber',
};

interface StatusBadgeProps {
  status: string;
  variant?: string;
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const color = variant ?? STATUS_COLORS[status] ?? 'slate';
  const classes = VARIANT_MAP[color] ?? VARIANT_MAP.slate;
  const label = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${classes}`}>
      {label}
    </span>
  );
}
