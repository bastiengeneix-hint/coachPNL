'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { Session, SessionMode, Message } from '@/types';
import {
  createSession,
  addMessage,
  formatMessagesForAPI,
} from '@/lib/coach/session-manager';
import {
  saveSession,
  updateActiveContext,
  getRecentSessions,
  evolveProfile,
  getProfile,
} from '@/lib/memory/store';
import type { SessionAnalysis } from '@/types';
import { buildActiveContext } from '@/lib/memory/context-builder';
import CoachMessage from '@/components/CoachMessage';
import VoiceInput, { VoiceInputHandle } from '@/components/VoiceInput';
import SessionEnd from '@/components/SessionEnd';

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get('mode') as SessionMode) || 'deblocage';
  const shouldResume = searchParams.get('resume') === 'true';

  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsAvailable, setTtsAvailable] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<Session | null>(null);
  const voiceInputRef = useRef<VoiceInputHandle>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Keep sessionRef in sync
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Check TTS availability and load preference
  useEffect(() => {
    async function initTts() {
      try {
        const [ttsRes, profile] = await Promise.all([
          fetch('/api/tts'),
          getProfile(),
        ]);
        if (ttsRes.ok) {
          const { available } = await ttsRes.json();
          setTtsAvailable(available);
          if (available && profile?.preferences?.tts_enabled) {
            setTtsEnabled(true);
          }
        }
      } catch {
        // TTS not available
      }
    }
    initTts();
  }, []);

  // Track which message is the latest coach message (for autoplay)
  const lastCoachMsgIdRef = useRef<string | null>(null);
  const [autoPlayMsgId, setAutoPlayMsgId] = useState<string | null>(null);

  useEffect(() => {
    if (!ttsEnabled || !session?.messages.length) return;
    const lastMsg = session.messages[session.messages.length - 1];
    if (lastMsg.role === 'coach' && lastMsg.id !== lastCoachMsgIdRef.current) {
      lastCoachMsgIdRef.current = lastMsg.id;
      setAutoPlayMsgId(lastMsg.id);
    }
  }, [session?.messages, ttsEnabled]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Initialize or resume session
  const initSession = useCallback(async () => {
    // Try to resume active session
    if (shouldResume) {
      try {
        const res = await fetch('/api/sessions/active');
        if (res.ok) {
          const activeSession = await res.json();
          if (activeSession && activeSession.messages?.length > 0) {
            setSession(activeSession);
            return;
          }
        }
      } catch {
        // Fall through to create new session
      }
    }

    // Create new session
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

      const data = await response.json();
      if (!response.ok) {
        console.error('Coach API error:', data);
        throw new Error(data.error || 'Failed to get coach response');
      }
      const updatedSession = addMessage(newSession, 'coach', data.message);
      setSession(updatedSession);
    } catch (error) {
      console.error('Error initializing session:', error);
      const errMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      const errorSession = addMessage(
        newSession,
        'coach',
        `Désolée, je n'ai pas pu démarrer la session : ${errMsg}`
      );
      setSession(errorSession);
    } finally {
      setIsLoading(false);
    }
  }, [mode, shouldResume]);

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

      const data = await response.json();
      if (!response.ok) {
        console.error('Coach API error:', data);
        throw new Error(data.error || 'Failed to get coach response');
      }
      const finalSession = addMessage(withUserMsg, 'coach', data.message);
      setSession(finalSession);

      // Persist session and update context (non-blocking, don't fail the UI)
      try {
        await saveSession(finalSession);
        const recent = await getRecentSessions(7);
        const ctx = buildActiveContext([...recent, finalSession]);
        await updateActiveContext(ctx);
      } catch (persistError) {
        console.warn('Session persistence error (non-blocking):', persistError);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorSession = addMessage(
        withUserMsg,
        'coach',
        "Désolée, une erreur est survenue. Pouvez-vous reformuler ?"
      );
      setSession(errorSession);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, mode]);

  // End session with AI analysis
  const handleEndSession = useCallback(async () => {
    if (!sessionRef.current) return;

    const currentSession = sessionRef.current;
    setIsLoading(true);

    let finalSession: Session = { ...currentSession, ended: true };

    try {
      // Analyze session via Claude (extracts insights, themes, exercises, profile evolution)
      const analyzeRes = await fetch('/api/sessions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: currentSession.messages }),
      });

      if (analyzeRes.ok) {
        const analysis: SessionAnalysis = await analyzeRes.json();
        finalSession = {
          ...finalSession,
          insights: analysis.insights,
          themes: analysis.themes,
          exercice_propose: analysis.exercice_propose,
          summary: analysis.summary,
          coach_summary: analysis.coach_summary || null,
          actions: analysis.actions || [],
        };

        // Evolve profile based on session analysis (non-blocking)
        evolveProfile(analysis.profile_evolution).catch((err) =>
          console.warn('Profile evolution error (non-blocking):', err)
        );

        // Create exercise reminder if the coach proposed one with a schedule
        if (analysis.exercice_propose && analysis.reminder_config) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + analysis.reminder_config.duration_days);
          fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: finalSession.id,
              exercise_description: analysis.exercice_propose,
              frequency: analysis.reminder_config.frequency,
              end_date: endDate.toISOString(),
              message: analysis.reminder_config.message,
            }),
          }).catch((err) => console.warn('Reminder creation error (non-blocking):', err));
        }
      }
    } catch (error) {
      console.warn('Session analysis error (non-blocking):', error);
    }

    setSession(finalSession);

    try {
      await saveSession(finalSession);
      const recent = await getRecentSessions(7);
      const ctx = buildActiveContext([...recent, finalSession]);
      await updateActiveContext(ctx);
    } catch (error) {
      console.error('Error ending session:', error);
    }

    setIsLoading(false);
    setIsEnded(true);
  }, []);

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle voice input — final transcript
  const handleVoiceInput = (transcript: string) => {
    setInput(transcript);
    setIsVoiceActive(false);
    textareaRef.current?.focus();
  };

  // Handle interim transcription — fills textarea progressively in real-time
  const handleInterimTranscript = useCallback((text: string) => {
    setInput(text);
    setIsVoiceActive(true);
  }, []);

  // Auto-activate mic when TTS finishes playing (conversational flow)
  const handleTtsEnd = useCallback(() => {
    if (ttsEnabled && voiceInputRef.current && !voiceInputRef.current.isRecording) {
      // Small delay so the user hears the silence before mic activates
      setTimeout(() => {
        voiceInputRef.current?.startRecording();
      }, 400);
    }
  }, [ttsEnabled]);

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
    <div className="flex flex-col h-[100dvh] bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 animate-fade-in">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            aria-label="Retour"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-[15px] font-semibold text-gray-800">{modeTitle}</h1>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{today}</p>
          </div>

          <div className="flex items-center gap-1">
            {ttsAvailable && (
            <button
              onClick={() => setTtsEnabled((v) => !v)}
              className={`p-2 rounded-xl transition-colors ${
                ttsEnabled
                  ? 'text-teal-600 bg-teal-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              aria-label={ttsEnabled ? 'Désactiver audio' : 'Activer audio'}
            >
              {ttsEnabled ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>
            )}
            <button
              onClick={handleEndSession}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors px-3 py-2 rounded-xl hover:bg-teal-50"
            >
              Terminer
            </button>
          </div>
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto bg-stone-50 px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {session?.messages.map((message: Message, index: number) => (
            <div
              key={message.id || index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CoachMessage
                message={message}
                ttsEnabled={ttsEnabled}
                autoPlay={message.id === autoPlayMsgId}
                onTtsEnd={handleTtsEnd}
              />
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="animate-fade-in flex items-start gap-3">
              <div className="coach-avatar shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
                  <path d="M12 2c3 4 5 8 5 10a5 5 0 0 1-10 0c0-2 2-6 5-10z" />
                </svg>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex space-x-1.5">
                  <div
                    className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
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
      <footer className="bg-white border-t border-gray-200 px-6 py-4 safe-bottom">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <VoiceInput
            ref={voiceInputRef}
            onTranscript={handleVoiceInput}
            onInterimTranscript={handleInterimTranscript}
          />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isVoiceActive ? 'Je t\'écoute...' : 'Écris ici...'}
              rows={1}
              disabled={isLoading}
              className="w-full resize-none rounded-2xl py-4 px-5 text-base text-gray-800 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-11 h-11 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="flex items-center justify-center h-[100dvh] bg-stone-50">
          <div className="flex space-x-1.5">
            <div
              className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <div
              className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"
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
