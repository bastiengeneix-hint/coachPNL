'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Session, SessionMode, Message } from '@/types';
import {
  createSession,
  addMessage,
  extractThemes,
  formatMessagesForAPI,
} from '@/lib/coach/session-manager';
import { saveSession, getActiveContext, updateActiveContext, getRecentSessions } from '@/lib/memory/store';
import { buildActiveContext } from '@/lib/memory/context-builder';
import CoachMessage from '@/components/CoachMessage';
import VoiceInput from '@/components/VoiceInput';
import SessionEnd from '@/components/SessionEnd';

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') as SessionMode) || 'deblocage';

  const [session, setSession] = useState<Session>(() => createSession(mode));
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Obtenir le premier message du coach au chargement
  const initSession = useCallback(async () => {
    if (initialized) return;
    setInitialized(true);
    setIsLoading(true);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          mode,
          isFirstMessage: true,
          ragPassages: [],
        }),
      });

      const data = await res.json();
      if (data.message) {
        setSession((prev) => addMessage(prev, 'coach', data.message));
      }
    } catch {
      setSession((prev) =>
        addMessage(
          prev,
          'coach',
          mode === 'deblocage'
            ? "Dis-moi tout. Je t'écoute."
            : "C'était comment aujourd'hui ?"
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [mode, initialized]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userText = text.trim();
      setInput('');

      const updatedSession = addMessage(session, 'user', userText);
      setSession(updatedSession);
      setIsLoading(true);

      try {
        const apiMessages = formatMessagesForAPI(updatedSession.messages);

        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            mode,
            isFirstMessage: false,
            ragPassages: [],
          }),
        });

        const data = await res.json();
        if (data.message) {
          const withCoach = addMessage(updatedSession, 'coach', data.message);
          const themes = extractThemes(withCoach.messages);
          const finalSession = { ...withCoach, themes };
          setSession(finalSession);
          saveSession(finalSession);

          // Mettre à jour le contexte actif
          const recent = getRecentSessions(7);
          const ctx = buildActiveContext([...recent, finalSession]);
          updateActiveContext(ctx);
        }
      } catch {
        const errorSession = addMessage(
          updatedSession,
          'coach',
          'Un problème est survenu. Reprends quand tu es prêt.'
        );
        setSession(errorSession);
      } finally {
        setIsLoading(false);
      }
    },
    [session, mode, isLoading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleVoiceTranscript = (text: string) => {
    sendMessage(text);
  };

  const handleEndSession = () => {
    const themes = extractThemes(session.messages);
    const finalSession = { ...session, themes };
    saveSession(finalSession);

    const recent = getRecentSessions(7);
    const ctx = buildActiveContext([...recent, finalSession]);
    updateActiveContext(ctx);

    setShowEnd(true);
  };

  const handleCloseEnd = () => {
    setShowEnd(false);
    router.push('/');
  };

  return (
    <div className="flex flex-col h-dvh bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-custom)] bg-[var(--color-bg-primary)]">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h1 className="text-sm font-medium text-[var(--color-text-primary)]">
            {mode === 'deblocage' ? 'Déblocage' : 'Journal du soir'}
          </h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={handleEndSession}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
        >
          Terminer
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {session.messages.map((msg: Message) => (
          <CoachMessage key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-[var(--color-bg-tertiary)] rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] animate-pulse-soft" />
                <span className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] animate-pulse-soft" style={{ animationDelay: '0.3s' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--color-text-muted)] animate-pulse-soft" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border-custom)] bg-[var(--color-bg-primary)] px-4 py-3 safe-bottom">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={mode === 'deblocage' ? 'Dis ce qui te pèse...' : 'Raconte ta journée...'}
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors disabled:opacity-40"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 shrink-0 rounded-xl bg-[var(--color-accent)] flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>

      {/* Session End Modal */}
      {showEnd && <SessionEnd session={session} onClose={handleCloseEnd} />}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-dvh bg-[var(--color-bg-primary)]">
        <div className="animate-pulse-soft text-[var(--color-text-muted)]">Chargement...</div>
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
