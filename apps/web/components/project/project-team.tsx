'use client';

import { useState } from 'react';
import { useProject, useAddProjectMember, useRemoveProjectMember } from '@/lib/hooks/use-project-queries';
import { StatusBadge } from '@/components/ui/status-badge';
import { SectionCard } from '@/components/ui/section-card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

function normalizeWhatsAppPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const noSep = trimmed.replace(/[\s()-]/g, '');
  if (noSep.startsWith('+')) {
    const digits = noSep.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  const digits = noSep.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) return `+233${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('233')) return `+${digits}`;
  if (digits.length >= 9) return `+${digits}`;
  return trimmed;
}

const MEMBER_ROLES = [
  { value: 'FIELD_WORKER', label: 'Field worker' },
  { value: 'FOREMAN', label: 'Foreman' },
  { value: 'ARCHITECT', label: 'Architect' },
  { value: 'PROJECT_MANAGER', label: 'Project manager' },
] as const;

export function ProjectTeam({ projectId }: { projectId: string }) {
  const { user: currentUser } = useAuth();
  const { data, isLoading, error } = useProject(projectId);
  const addMember = useAddProjectMember(projectId);
  const removeMember = useRemoveProjectMember(projectId);
  const [showForm, setShowForm] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('FIELD_WORKER');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'PROJECT_MANAGER';

  if (isLoading) return <p className="text-sm text-[var(--text-muted)]">Loading team…</p>;
  if (error || !data) return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load team'}</p>;

  const members = data.members ?? [];
  const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const normalized = normalizeWhatsAppPhone(phone);
    if (!normalized) { setFormError('Enter a WhatsApp number.'); return; }
    try {
      await addMember.mutateAsync({ phone: normalized, role, ...(name.trim() ? { name: name.trim() } : {}) });
      setPhone(''); setName(''); setShowForm(false);
      toast.success('Team member added');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add member';
      setFormError(msg);
      toast.error(msg);
    }
  }

  async function handleRemove(userId: string) {
    try {
      await removeMember.mutateAsync(userId);
      setConfirmRemove(null);
      toast.success('Member removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }

  return (
    <div className="space-y-6">
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl transition-colors">
          + Add member
        </button>
      ) : (
        <SectionCard title="Add team member" subtitle="Uses WhatsApp number to find or create a user.">
          <form onSubmit={onAdd} className="space-y-4 max-w-md">
            {formError && <p className="text-xs text-[var(--status-red)] bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">WhatsApp number</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233… or 024…" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Display name (optional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Role on site</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
                {MEMBER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={addMember.isPending} className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors">
                {addMember.isPending ? 'Adding…' : 'Add member'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            </div>
          </form>
        </SectionCard>
      )}

      {!members.length ? (
        <EmptyState
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
          title="No team members yet"
          description="Add members by their WhatsApp number."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="rounded-2xl bg-white border border-[var(--border)] p-5 flex items-start gap-4 group">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {(m.user.name ?? 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{m.user.name ?? '—'}</p>
                <div className="mt-1"><StatusBadge status={m.role} /></div>
                {m.user.whatsappPhone && <p className="text-xs font-mono text-[var(--text-muted)] mt-2">{m.user.whatsappPhone}</p>}
              </div>
              {canManage && m.user.id !== currentUser?.id && (
                <div className="shrink-0">
                  {confirmRemove === m.user.id ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemove(m.user.id)}
                        disabled={removeMember.isPending}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {removeMember.isPending ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(null)}
                        className="text-xs px-2 py-1 border border-[var(--border)] rounded-lg hover:bg-slate-50"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemove(m.user.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all"
                      title="Remove from project"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
