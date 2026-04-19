'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useOrgUsers,
  useUpdateUser,
  useDeleteUser,
  useInvites,
  useCreateInvite,
  useRevokeInvite,
} from '@/lib/hooks/use-project-queries';
import { useAuth } from '@/lib/auth-context';
import { usePagination } from '@/lib/hooks/use-pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Pagination } from '@/components/ui/pagination';
import { SkeletonCards } from '@/components/ui/skeleton';

const ROLES = ['OWNER', 'PROJECT_MANAGER', 'ARCHITECT', 'FOREMAN', 'FIELD_WORKER'] as const;

function timeAgo(iso: string | null) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const inputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent';
const selectCls = `${inputCls} bg-white`;
const btnPrimary = 'px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors';
const btnDanger = 'px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl disabled:opacity-60 transition-colors';

type EditState = {
  id: string;
  name: string;
  role: string;
  whatsappPhone: string;
  isActive: boolean;
} | null;

export function OrgTeam() {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'OWNER';
  const { data, isLoading, error } = useOrgUsers();
  const { data: invites, isError: invitesError } = useInvites();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editUser, setEditUser] = useState<EditState>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('FIELD_WORKER');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = data ?? [];
  const filtered = roleFilter === 'ALL' ? rows : rows.filter((u) => u.role === roleFilter);
  const pagination = usePagination(filtered, { defaultPageSize: 12 });

  const resetInviteForm = useCallback(() => {
    setInviteEmail('');
    setInviteName('');
    setInvitePhone('');
    setInviteRole('FIELD_WORKER');
    setInviteLink(null);
    setFormError(null);
  }, []);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setFormError(null);
    try {
      await updateUser.mutateAsync({
        userId: editUser.id,
        body: {
          name: editUser.name,
          role: editUser.role,
          whatsappPhone: editUser.whatsappPhone,
          isActive: editUser.isActive,
        },
      });
      toast.success('Member updated');
      setEditUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(msg);
      setFormError(msg);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      toast.success('Member removed');
      setDeleteTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(msg);
      setFormError(msg);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      const result = await createInvite.mutateAsync({
        email: inviteEmail,
        name: inviteName || undefined,
        phone: invitePhone.trim() || undefined,
        role: inviteRole,
      });
      toast.success('Invite created');
      setInviteLink(`${window.location.origin}/invite/${result.token}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invite failed';
      toast.error(msg);
      setFormError(msg);
    }
  }

  if (isLoading) {
    return data ? <LoadingSpinner /> : <SkeletonCards count={6} cols={3} />;
  }
  if (error) return <p className="text-sm text-[var(--status-red)]">{error instanceof Error ? error.message : 'Failed to load team'}</p>;

  const ROLE_ORDER = ['ALL', 'OWNER', 'PROJECT_MANAGER', 'ARCHITECT', 'FOREMAN', 'FIELD_WORKER'];
  const presentRoles = new Set(rows.map((u) => u.role));
  const roles = ROLE_ORDER.filter((r) => r === 'ALL' || presentRoles.has(r));
  const extraRoles = [...presentRoles].filter((r) => !ROLE_ORDER.includes(r));
  if (extraRoles.length) roles.push(...extraRoles);

  const pendingInvites = invites ?? [];

  if (!rows.length) {
    return (
      <div className="space-y-4">
        {isOwner && (
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowInvite(true)} className={btnPrimary}>+ Invite Member</button>
          </div>
        )}
        <EmptyState
          icon={<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
          title="No team members yet"
          description="Invite members to your organization."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5 pb-0 overflow-x-auto scrollbar-hide">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                roleFilter === r ? 'bg-slate-900 text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {r === 'ALL' ? 'All roles' : r.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {isOwner && (
          <div className="flex gap-2">
            {pendingInvites.length > 0 && (
              <button type="button" onClick={() => setShowInvites(!showInvites)} className="px-4 py-1.5 rounded-xl text-xs font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:bg-slate-50 transition-colors">
                Pending ({pendingInvites.length})
              </button>
            )}
            <button type="button" onClick={() => { resetInviteForm(); setShowInvite(true); }} className={btnPrimary}>
              + Invite Member
            </button>
          </div>
        )}
      </div>

      <div className="border-b border-[var(--border)]" />

      {/* Pending invites */}
      {invitesError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">Failed to load pending invites. They may still exist.</p>
        </div>
      )}
      {showInvites && pendingInvites.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-amber-800">Pending Invites</h4>
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 text-sm">
              <span className="text-amber-700 font-medium">{inv.email}</span>
              <StatusBadge status={inv.role} />
              <span className="text-xs text-amber-600 ml-auto">
                Expires {new Date(inv.expiresAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await revokeInvite.mutateAsync(inv.id);
                    toast.success('Invite revoked');
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Failed to revoke invite');
                  }
                }}
                disabled={revokeInvite.isPending}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[60vh] content-start">
        {pagination.paginatedData.map((u) => (
          <div key={u.id} className="rounded-2xl bg-white border border-[var(--border)] p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {(u.name ?? u.email ?? 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.name ?? '—'}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{u.email ?? '—'}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={u.role} />
                {!u.isActive && (
                  <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Inactive</span>
                )}
              </div>
              {u.whatsappPhone && <p className="text-xs font-mono text-[var(--text-muted)] mt-2">{u.whatsappPhone}</p>}
              <p className="text-xs text-[var(--text-muted)] mt-1">Active {timeAgo(u.lastActiveAt)}</p>
              {isOwner && u.id !== currentUser?.id && (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditUser({
                        id: u.id,
                        name: u.name ?? '',
                        role: u.role,
                        whatsappPhone: u.whatsappPhone ?? '',
                        isActive: u.isActive,
                      })
                    }
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    Edit
                  </button>
                  {u.role !== 'OWNER' && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: u.id, name: u.name ?? u.email ?? 'this user' })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="rounded-2xl bg-white border border-[var(--border)] overflow-hidden">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[12, 24, 48, 96]}
          />
        </div>
      )}

      {/* ── Edit dialog ──────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setEditUser(null)} />
          <div className="relative bg-white rounded-2xl border border-[var(--border)] p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Edit Member</h3>
              <button type="button" onClick={() => setEditUser(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><CloseIcon /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name</label>
                <input required value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} className={selectCls}>
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">WhatsApp Phone</label>
                <input value={editUser.whatsappPhone} onChange={(e) => setEditUser({ ...editUser, whatsappPhone: e.target.value })} placeholder="+233..." className={inputCls} />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editUser.isActive}
                  onChange={(e) => setEditUser({ ...editUser, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="isActive" className="text-sm text-[var(--text-secondary)]">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={updateUser.isPending} className={btnPrimary}>
                  {updateUser.isPending ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl border border-[var(--border)] p-6 w-full max-w-sm shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove Member</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Are you sure you want to remove <span className="font-medium text-[var(--text-primary)]">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button type="button" onClick={handleDelete} disabled={deleteUser.isPending} className={btnDanger}>
                {deleteUser.isPending ? 'Removing…' : 'Remove'}
              </button>
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invite dialog ────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowInvite(false); resetInviteForm(); }} />
          <div className="relative bg-white rounded-2xl border border-[var(--border)] p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Invite Member</h3>
              <button type="button" onClick={() => { setShowInvite(false); resetInviteForm(); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><CloseIcon /></button>
            </div>

            {inviteLink ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Invite created! Share this link:</p>
                  <div className="flex gap-2">
                    <input readOnly value={inviteLink} className={`${inputCls} text-xs font-mono`} />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success('Copied to clipboard')).catch(() => toast.error('Failed to copy — please copy manually'))}
                      className="shrink-0 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl hover:bg-black transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-green-600 mt-2">Link expires in 7 days</p>
                </div>
                <button type="button" onClick={() => { setShowInvite(false); resetInviteForm(); }} className={btnPrimary}>Done</button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{formError}</p>}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                  <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Name (optional)</label>
                  <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Kwame Asante" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">WhatsApp Phone (optional)</label>
                  <input value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+233… or 024…" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={selectCls}>
                    {ROLES.filter((r) => r !== 'OWNER').map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={createInvite.isPending} className={btnPrimary}>
                    {createInvite.isPending ? 'Sending…' : 'Create Invite'}
                  </button>
                  <button type="button" onClick={() => { setShowInvite(false); resetInviteForm(); }} className="px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
