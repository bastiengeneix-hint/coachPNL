'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Session } from '@/types';
import { getSessions } from '@/lib/memory/store';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  useEffect(() => {
    const all = getSessions();
    setSessions(all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border-custom)]">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Sessions</h1>
      </header>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-tertiary)] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
              <path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Aucune session pour le moment</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Tes conversations apparaîtront ici</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--color-border-custom)]">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
              className="w-full px-4 py-4 text-left hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    session.mode === 'deblocage' ? 'bg-orange-500/10' : 'bg-blue-500/10'
                  }`}>
                    {session.mode === 'deblocage' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {session.mode === 'deblocage' ? 'Déblocage' : 'Journal'}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(session.date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {session.themes.length > 0 && (
                  <div className="flex gap-1">
                    {session.themes.slice(0, 2).map((theme) => (
                      <span key={theme} className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Transcript détail */}
              {selectedSession?.id === session.id && (
                <div className="mt-4 space-y-2 animate-fade-in">
                  {session.messages.map((msg) => (
                    <div key={msg.id} className={`text-xs leading-relaxed ${
                      msg.role === 'coach' ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'
                    }`}>
                      <span className="font-medium">{msg.role === 'coach' ? 'Coach' : 'Toi'} :</span>{' '}
                      {msg.content}
                    </div>
                  ))}

                  {session.insights.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-[var(--color-bg-tertiary)]">
                      <p className="text-[10px] text-[var(--color-accent)] mb-1">Insights</p>
                      {session.insights.map((insight, i) => (
                        <p key={i} className="text-xs text-[var(--color-text-secondary)]">
                          {insight.isBreakthrough ? '⚡ ' : '• '}{insight.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-custom)] safe-bottom">
        <div className="flex justify-around items-center h-14 max-w-sm mx-auto">
          <button onClick={() => router.push('/')} className="flex flex-col items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            <span className="text-[10px]">Accueil</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[var(--color-accent)] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
            <span className="text-[10px]">Sessions</span>
          </button>
          <button onClick={() => router.push('/settings')} className="flex flex-col items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            <span className="text-[10px]">Réglages</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
