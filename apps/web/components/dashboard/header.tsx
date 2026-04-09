'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSearch, type SearchResults } from '@/lib/hooks/use-project-queries';
import { NotificationsPanel, useNotificationCount } from './notifications-panel';

function initials(name: string | null, email: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

function roleLabel(role: string | undefined) {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SearchDropdown({ results, onSelect }: { results: SearchResults; onSelect: () => void }) {
  const router = useRouter();
  const total = results.projects.length + results.rfis.length + results.users.length;
  if (!total) {
    return (
      <div className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No results found</div>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
      {results.projects.length > 0 && (
        <div className="py-2">
          <p className="px-4 py-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Projects</p>
          {results.projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { router.push(`/projects/${p.id}`); onSelect(); }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{p.code} · {p.clientName}</p>
            </button>
          ))}
        </div>
      )}
      {results.rfis.length > 0 && (
        <div className="py-2">
          <p className="px-4 py-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">RFIs</p>
          {results.rfis.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { router.push(`/projects/${r.projectId}/rfis`); onSelect(); }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{r.referenceNo}: {r.title}</p>
              <p className="text-xs text-[var(--text-muted)]">{r.status}</p>
            </button>
          ))}
        </div>
      )}
      {results.users.length > 0 && (
        <div className="py-2">
          <p className="px-4 py-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Team</p>
          {results.users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { router.push('/team'); onSelect(); }}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{u.name || u.email}</p>
              <p className="text-xs text-[var(--text-muted)]">{u.role}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = useNotificationCount();
  const bellRef = useRef<HTMLButtonElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { data: searchResults } = useSearch(searchQuery);

  const showDropdown = searchFocused && searchQuery.trim().length >= 2;

  const toggleNotif = useCallback(() => setNotifOpen((v) => !v), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  return (
    <header className="h-14 sm:h-18 border-b border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between px-4 sm:px-6 shrink-0 gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-[var(--text-muted)] transition-colors shrink-0"
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
        )}
        <div ref={searchRef} className="relative hidden sm:flex items-center flex-1 max-w-md">
          <div className="relative w-full border border-[var(--border)] rounded-2xl px-3 py-2 flex items-center">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search projects, RFIs, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="ml-2 w-full bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
          {showDropdown && searchResults && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-2xl border border-[var(--border)] shadow-xl z-50 overflow-hidden">
              <SearchDropdown results={searchResults} onSelect={() => { setSearchFocused(false); setSearchQuery(''); }} />
            </div>
          )}
        </div>
        <button
          type="button"
          className="sm:hidden p-1.5 rounded-lg hover:bg-slate-100 text-[var(--text-muted)] transition-colors"
          aria-label="Search"
        >
          <SearchIcon />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="relative">
          <button
            ref={bellRef}
            onClick={toggleNotif}
            className="relative p-1.5 rounded-lg hover:bg-slate-100 text-[var(--text-muted)] transition-colors"
            aria-label="Notifications"
          >
            <BellIcon />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>
          <NotificationsPanel open={notifOpen} onClose={closeNotif} triggerRef={bellRef} />
        </div>

        <div className="hidden sm:block w-px h-6 bg-[var(--border)]" />

        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0"
            aria-hidden
          >
            {initials(user?.name ?? null, user?.email ?? null)}
          </div>
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[160px]">
              {user?.name || user?.email || '—'}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate max-w-[160px]">
              {roleLabel(user?.role)}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
