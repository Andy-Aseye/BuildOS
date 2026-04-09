'use client';

import { useAuth } from '@/lib/auth-context';
import { AiChat } from '@/components/dashboard/ai-chat';

export default function AiPage() {
  const { user } = useAuth();
  const allowed = user?.role === 'OWNER' || user?.role === 'PROJECT_MANAGER';

  if (!allowed) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-[var(--text-muted)]">
            AI Assistant is only available to Owners and Project Managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-3.5rem-2rem)] sm:h-[calc(100dvh-4.5rem-3rem)]">
      <AiChat />
    </div>
  );
}
