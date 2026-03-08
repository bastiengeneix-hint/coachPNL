'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { getSessions } from '@/lib/memory/store';
import type { Session } from '@/types';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen relative z-10 pb-20">
      {/* Header */}
      <div className="glass backdrop-blur-xl sticky top-0 z-20 border-b border-[var(--color-glass-border)]">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-xl glass glass-hover flex items-center justify-center border border-[var(--color-glass-border)] transition-all spring"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-text-secondary)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Sessions
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse"
                style={{ animationDelay: '200ms' }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent)] animate-pulse"
                style={{ animationDelay: '400ms' }}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="glass rounded-2xl border border-[var(--color-glass-border)] p-8 text-center max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent-soft)] flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-[var(--color-text-primary)] font-semibold mb-1">
                Aucune session
              </p>
              <p className="text-[var(--color-text-muted)] text-sm">
                Tes conversations apparaîtront ici.
              </p>
            </div>
          </div>
        )}

        {/* Session List */}
        {!loading && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {sessions.map((s, i) => {
              const isDeblocage = s.mode === 'deblocage';
              const isExpanded = expandedId === s.id;

              return (
                <div
                  key={s.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Session Card */}
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full glass glass-hover rounded-2xl border border-[var(--color-glass-border)] p-4 text-left transition-all spring"
                  >
                    <div className="flex items-start gap-3">
                      {/* Mode Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isDeblocage
                            ? 'bg-[var(--color-accent-soft)]'
                            : 'bg-rose-500/10'
                        }`}
                      >
                        {isDeblocage ? (
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--color-text-primary)] font-medium text-sm">
                            {isDeblocage ? 'Déblocage' : 'Journal'}
                          </p>
                          <div className="flex-1" />
                          {s.themes.slice(0, 2).map((theme, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] truncate max-w-[100px]"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                        <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                          {formatDate(s.date)}
                        </p>
                      </div>

                      {/* Expand chevron */}
                      <svg
                        className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-200 shrink-0 mt-1 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-2 glass rounded-2xl border border-[var(--color-glass-border)] p-4 animate-fade-in">
                      {/* Messages */}
                      {s.messages.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {s.messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-1">
                              <span
                                className={`text-xs font-medium ${
                                  msg.role === 'user'
                                    ? 'text-[var(--color-accent)]'
                                    : 'text-[var(--color-text-muted)]'
                                }`}
                              >
                                {msg.role === 'user' ? 'Toi' : 'Coach'}
                              </span>
                              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                                {msg.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[var(--color-text-muted)] text-sm text-center py-2">
                          Pas de messages enregistrés.
                        </p>
                      )}

                      {/* Insights */}
                      {s.insights.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[var(--color-glass-border)]">
                          <p className="text-xs font-medium text-[var(--color-accent)] mb-2">
                            Insights
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {s.insights.map((insight, idx) => (
                              <p
                                key={idx}
                                className={`text-sm ${
                                  insight.isBreakthrough
                                    ? 'text-[var(--color-accent)] font-medium'
                                    : 'text-[var(--color-text-secondary)]'
                                }`}
                              >
                                {insight.isBreakthrough && '★ '}
                                {insight.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NavBar active="sessions" />
    </div>
  );
}
