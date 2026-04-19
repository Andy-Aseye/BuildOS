'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useAiQuery,
  useAiChatHistory,
  useClearAiChatHistory,
  type AiQueryResult,
  type AiChatHistoryMessage,
} from '@/lib/hooks/use-project-queries';
import { useAuth } from '@/lib/auth-context';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: AiQueryResult;
  timestamp: Date;
};

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v1m0 16v1m-7.07-2.93l.71-.71M5.64 5.64l-.71-.71M3 12h1m16 0h1m-2.93 7.07l-.71-.71M18.36 5.64l.71-.71" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-[var(--border)]">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
              {columns.map((col) => (
                <td key={col} className="px-3 py-1.5 text-[var(--text-primary)] whitespace-nowrap max-w-[250px] truncate">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <p className="px-3 py-2 text-xs text-[var(--text-muted)] bg-slate-50 border-t border-[var(--border)]">
          Showing 50 of {rows.length} rows
        </p>
      )}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toLocaleDateString();
    return JSON.stringify(value);
  }
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return str;
}

const SUGGESTION_CHIPS = [
  'Which projects are currently over budget?',
  'How many open RFIs are overdue?',
  'Show me total confirmed spending by project',
  'What are the most common delay causes this month?',
  'Which team members are most active this week?',
  'Show attendance trends for the last 30 days',
];

function historyToMessages(history: AiChatHistoryMessage[]): Message[] {
  return history.map((m) => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    content: m.content,
    data: m.resultData
      ? {
          answer: m.content,
          sql: m.sqlQuery ?? '',
          rows: m.resultData.rows,
          rowCount: m.resultData.rowCount,
          error: null,
        }
      : undefined,
    timestamp: new Date(m.createdAt),
  }));
}

export function AiChat() {
  const { user } = useAuth();
  const query = useAiQuery();
  const { data: historyData, isLoading: historyLoading, isError: historyError } = useAiChatHistory();
  const clearHistory = useClearAiChatHistory();
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [expandedData, setExpandedData] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const serverMessages = useMemo(
    () => (historyData ? historyToMessages(historyData) : []),
    [historyData],
  );

  const messages = useMemo(() => {
    const serverIds = new Set(serverMessages.map((m) => m.id));
    const pending = optimisticMessages.filter((m) => !serverIds.has(m.id));
    return [...serverMessages, ...pending];
  }, [serverMessages, optimisticMessages]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (historyData) {
      setOptimisticMessages([]);
    }
  }, [historyData]);

  async function handleSend(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput('');

    const userMsg: Message = {
      id: `pending-user-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date(),
    };
    setOptimisticMessages((prev) => [...prev, userMsg]);

    try {
      const result = await query.mutateAsync({ question: q });

      if (result.error) {
        const assistantMsg: Message = {
          id: `pending-error-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
        };
        setOptimisticMessages((prev) => [...prev, assistantMsg]);
      } else {
        const assistantMsg: Message = {
          id: `pending-assistant-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          data: result,
          timestamp: new Date(),
        };
        setOptimisticMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `pending-err-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error
          ? (err.message.includes('timed out')
            ? "I'm taking too long to respond. Please try again."
            : 'Something went wrong. Please try again.')
          : 'Something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setOptimisticMessages((prev) => [...prev, errorMsg]);
    }
  }

  function handleNewChat() {
    clearHistory.mutate();
    setOptimisticMessages([]);
    setExpandedData(new Set());
  }

  function toggleData(id: string) {
    setExpandedData((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const isThinking = query.isPending;
  const hasMessages = messages.length > 0;

  if (historyLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
          <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          <span className="text-sm text-[var(--text-muted)] ml-2">Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat */}
      {hasMessages && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Assistant</h3>
          <button
            type="button"
            onClick={handleNewChat}
            disabled={clearHistory.isPending}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {clearHistory.isPending ? 'Clearing...' : 'New Chat'}
          </button>
        </div>
      )}

      {/* Error banner if history failed to load */}
      {historyError && (
        <div className="px-4 sm:px-6 py-2 bg-amber-50 border-b border-amber-200">
          <p className="text-xs text-amber-700">Could not load previous messages. New messages will still be saved.</p>
        </div>
      )}

      {/* Chat messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v1m0 16v1m-7.07-2.93l.71-.71M5.64 5.64l-.71-.71M3 12h1m16 0h1m-2.93 7.07l-.71-.71M18.36 5.64l.71-.71" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">AI Assistant</h2>
            <p className="text-sm text-[var(--text-muted)] mb-8">
              Ask me anything about your projects, costs, team, RFIs, and more.
              I can query all your BuildOS data in real-time.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void handleSend(chip)}
                  className="text-left px-4 py-3 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <SparkleIcon />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-[var(--border)]'
                    }`}
                  >
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' ? 'text-white' : 'text-[var(--text-primary)]'
                    }`}>
                      {msg.content}
                    </p>
                  </div>

                  {msg.data && msg.data.rowCount > 0 && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => toggleData(msg.id)}
                        className="text-xs font-medium text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors"
                      >
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`transition-transform ${expandedData.has(msg.id) ? 'rotate-90' : ''}`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        View data ({msg.data.rowCount} rows)
                      </button>
                      {expandedData.has(msg.id) && (
                        <div className="mt-2 space-y-2">
                          <DataTable rows={msg.data.rows} />
                          {msg.data.sql && (
                            <details className="group">
                              <summary className="text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                                SQL query
                              </summary>
                              <pre className="mt-1 p-2 bg-slate-50 rounded-lg text-[11px] overflow-x-auto font-mono text-slate-600">
                                {msg.data.sql}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5">
                    {(user?.name ?? user?.email ?? 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <SparkleIcon />
                </div>
                <div className="bg-white border border-[var(--border)] rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                    <span className="text-xs text-[var(--text-muted)] ml-2">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-[var(--border)] px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your projects, costs, team..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-[var(--border)] rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isThinking || !input.trim()}
              className="px-4 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
            AI queries all your BuildOS data in real-time. Only available to Owners and Project Managers.
          </p>
        </div>
      </div>
    </div>
  );
}
