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
import {
  saveSession,
  updateActiveContext,
  getRecentSessions,
} from '@/lib/memory/store';
import { buildActiveContext } from '@/lib/memory/context-builder';
import CoachMessage from '@/components/CoachMessage';
import VoiceInput from '@/components/VoiceInput';
import SessionEnd from '@/components/SessionEnd';

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') as SessionMode) || 'deblocage';

  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<Session | null>(null);

  // Keep sessionRef in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Initialize session
  const initSession = useCallback(async () => {
    const newSession = createSession(mode);
    setSession(newSession);
    setIsLoading(true);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          mode,
          isFirstMessage: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to get coach response');

      const data = await response.json();
      const updatedSession = addMessage(newSession, 'coach', data.message);
      setSession(updatedSession);
    } catch (error) {
      console.error('Error initializing session:', error);
      const errorSession = addMessage(
        newSession,
        'coach',
        "Desolee, je n'ai pas pu demarrer la session. Veuillez reessayer."
      );
      setSession(errorSession);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionRef.current || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const currentSession = sessionRef.current;
    const withUserMsg = addMessage(currentSession, 'user', userMessage);
    setSession(withUserMsg);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: formatMessagesForAPI(withUserMsg.messages),
          mode,
          isFirstMessage: false,
        }),
      });

      if (!response.ok) throw new Error('Failed to get coach response');

      const data = await response.json();
      const finalSession = addMessage(withUserMsg, 'coach', data.message);
      setSession(finalSession);

      // Persist session and update context (all async)
      await saveSession(finalSession);
      const recent = await getRecentSessions(7);
      const ctx = buildActiveContext([...recent, finalSession]);
      await updateActiveContext(ctx);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorSession = addMessage(
        withUserMsg,
        'coach',
        "Desolee, une erreur est survenue. Pouvez-vous reformuler ?"
      );
      setSession(errorSession);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, mode]);

  // End session
  const handleEndSession = useCallback(async () => {
    if (!sessionRef.current) return;

    const currentSession = sessionRef.current;
    const themes = extractThemes(currentSession.messages);
    const finalSession: Session = {
      ...currentSession,
      themes,
    };

    setSession(finalSession);

    try {
      await saveSession(finalSession);
      const recent = await getRecentSessions(7);
      const ctx = buildActiveContext([...recent, finalSession]);
      await updateActiveContext(ctx);
    } catch (error) {
      console.error('Error ending session:', error);
    }

    setIsEnded(true);
  }, []);

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle voice input
  const handleVoiceInput = (transcript: string) => {
    setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    textareaRef.current?.focus();
  };

  const modeTitle = mode === 'deblocage' ? 'Déblocage' : 'Journal du soir';
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (isEnded && session) {
    return <SessionEnd session={session} onClose={() => router.push('/')} />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0f0d0a]">
      {/* Header */}
      <header className="glass border-b border-[var(--color-glass-border)] px-4 py-3 animate-fade-in">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="glass-hover p-2 rounded-xl text-white/60 hover:text-white transition-colors"
            aria-label="Retour"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-sm font-semibold text-white">{modeTitle}</h1>
            <p className="text-xs text-white/40 capitalize">{today}</p>
          </div>

          <button
            onClick={handleEndSession}
            className="text-sm text-amber-500 hover:text-amber-400 font-medium transition-colors px-3 py-1.5 rounded-lg glass-hover"
          >
            Terminer
          </button>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {session?.messages.map((message: Message, index: number) => (
            <div
              key={message.id || index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CoachMessage message={message} />
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="animate-fade-in">
              <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 inline-block">
                <div className="flex space-x-1.5">
                  <div
                    className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="glass border-t border-[var(--color-glass-border)] px-4 py-3 safe-bottom">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <VoiceInput onTranscript={handleVoiceInput} />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ecrivez votre message..."
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="shrink-0 p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-500/20 transition-all spring active:scale-95"
            aria-label="Envoyer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[100dvh] bg-[#0f0d0a]">
          <div className="flex space-x-1.5">
            <div
              className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-amber-500/60 rounded-full animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
