'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useTenantRfis,
  type NotificationRow,
} from '@/lib/hooks/use-project-queries';

const PAGE_SIZE = 20;

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotifIcon({ type }: { type: string }) {
  if (type.includes('overdue') || type.includes('delay')) {
    return (
      <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    );
  }
  if (type.includes('rfi')) {
    return (
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    );
  }
  if (type.includes('cost') || type.includes('material')) {
    return (
      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>
  );
}

type MergedNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
  source: 'api' | 'derived';
};

function useMergedNotifications(): MergedNotification[] {
  const { data: apiNotifs } = useNotifications(50);
  const { data: allRfis } = useTenantRfis({});

  const merged: MergedNotification[] = [];
  const seenIds = new Set<string>();

  if (apiNotifs) {
    for (const n of apiNotifs) {
      merged.push({ ...n, source: 'api' });
      seenIds.add(n.id);
    }
  }

  if (allRfis) {
    const now = new Date();
    for (const rfi of allRfis) {
      const due = new Date(rfi.dueDate);
      if (due < now && rfi.status !== 'CLOSED' && rfi.status !== 'ANSWERED') {
        const id = `derived-overdue-${rfi.id}`;
        if (!seenIds.has(id)) {
          merged.push({
            id,
            type: 'rfi_overdue',
            title: `RFI Overdue: ${rfi.referenceNo}`,
            body: `"${rfi.title}" was due ${relativeTime(rfi.dueDate)}${rfi.project ? ` — ${rfi.project.code}` : ''}`,
            link: rfi.project ? `/projects/${rfi.project.id}/rfis` : null,
            read: false,
            createdAt: rfi.dueDate,
            source: 'derived',
          });
        }
      }
    }
  }

  merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return merged;
}

export function NotificationsPanel({ open, onClose, triggerRef }: { open: boolean; onClose: () => void; triggerRef?: React.RefObject<HTMLButtonElement | null> }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLLIElement>(null);
  const allNotifications = useMergedNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (open) setVisibleCount(PAGE_SIZE);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target) &&
          !(triggerRef?.current && triggerRef.current.contains(target))) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose, triggerRef]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, allNotifications.length));
  }, [allNotifications.length]);

  useEffect(() => {
    if (!open) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root: panelRef.current?.querySelector('[data-scroll-area]'), threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, loadMore]);

  const visibleItems = allNotifications.slice(0, visibleCount);
  const hasMore = visibleCount < allNotifications.length;
  const unreadCount = allNotifications.filter((n) => !n.read).length;

  function handleClick(n: MergedNotification) {
    if (n.source === 'api' && !n.read) {
      markRead.mutate(n.id);
    }
    if (n.link) {
      router.push(n.link);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-h-[480px] bg-white rounded-2xl border border-[var(--border)] shadow-xl z-50 flex flex-col overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
            {allNotifications.length > 0 && ` · ${allNotifications.length} total`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" data-scroll-area>
        {allNotifications.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">No notifications yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Activity from your projects will appear here</p>
          </div>
        ) : (
          <ul>
            {visibleItems.map((n) => (
              <li
                key={n.id}
                className={`px-5 py-3.5 border-b border-[var(--border)] last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer ${
                  !n.read ? 'bg-blue-50/40' : ''
                }`}
                onClick={() => handleClick(n)}
              >
                <div className="flex gap-3">
                  <NotifIcon type={n.type} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">{relativeTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  )}
                </div>
              </li>
            ))}
            {hasMore && (
              <li ref={sentinelRef} className="px-5 py-4 text-center">
                <span className="text-xs text-[var(--text-muted)]">Loading more...</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export function useNotificationCount() {
  const { data } = useUnreadNotificationCount();
  const { data: allRfis } = useTenantRfis({});

  let count = data?.count ?? 0;
  if (allRfis) {
    const now = new Date();
    for (const rfi of allRfis) {
      const due = new Date(rfi.dueDate);
      if (due < now && rfi.status !== 'CLOSED' && rfi.status !== 'ANSWERED') count++;
    }
  }
  return count;
}
