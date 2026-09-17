'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Message } from '@/types';

// ─── EXERCICES CLIQUABLES ───────────────────────────────────────────────────
// Le coach peut proposer un des exercices de l'app en collant un marqueur
// [[exercice:roue_vie]] dans son message. Avant, les exercices existaient dans
// un coin de l'app et la conversation n'y menait jamais.

const EXERCISE_LINKS: Record<string, { label: string; href: string }> = {
  roue_vie: { label: 'Roue de la Vie', href: '/exercices/roue' },
  triangle_equilibre: { label: "Triangle d'Équilibre", href: '/exercices/triangle' },
  ikigai: { label: 'IKIGAI', href: '/exercices/ikigai' },
  systeme12: { label: 'Système 1 / Système 2', href: '/exercices/systeme12' },
};

const EXERCISE_MARKER = /\[\[exercice\s*:\s*([a-z0-9_]+)\]\]/gi;

function splitExerciseMarkers(content: string): { text: string; exercises: string[] } {
  const exercises: string[] = [];

  const text = content
    .replace(EXERCISE_MARKER, (_match, id: string) => {
      const key = id.toLowerCase();
      if (EXERCISE_LINKS[key] && !exercises.includes(key)) exercises.push(key);
      return '';
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, exercises };
}

interface CoachMessageProps {
  message: Message;
  ttsEnabled?: boolean;
  autoPlay?: boolean;
  onTtsEnd?: () => void;
  ttsVoice?: string;
  ttsModel?: string;
}

type TtsState = 'idle' | 'loading' | 'playing' | 'error';

export default function CoachMessage({ message, ttsEnabled, autoPlay, onTtsEnd, ttsVoice, ttsModel }: CoachMessageProps) {
  const isCoach = message.role === 'coach';
  const { text: displayText, exercises } = useMemo(
    () => splitExerciseMarkers(message.content),
    [message.content]
  );
  const [ttsState, setTtsState] = useState<TtsState>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const hasAutoPlayed = useRef(false);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const playTts = useCallback(async () => {
    if (ttsState === 'playing') {
      cleanup();
      setTtsState('idle');
      return;
    }

    if (ttsState === 'loading') return;

    setTtsState('loading');
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: displayText, voice: ttsVoice, model: ttsModel }),
      });

      if (!res.ok) {
        console.warn('TTS API error:', res.status);
        setTtsState('error');
        setTimeout(() => setTtsState('idle'), 2000);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('audio')) {
        console.warn('TTS returned non-audio:', contentType);
        setTtsState('error');
        setTimeout(() => setTtsState('idle'), 2000);
        return;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        console.warn('TTS returned empty audio');
        setTtsState('error');
        setTimeout(() => setTtsState('idle'), 2000);
        return;
      }

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        cleanup();
        setTtsState('idle');
        // Signal parent that TTS finished — used to auto-activate mic
        onTtsEnd?.();
      };

      audio.onerror = () => {
        console.warn('Audio playback error');
        cleanup();
        setTtsState('error');
        setTimeout(() => setTtsState('idle'), 2000);
      };

      await audio.play();
      setTtsState('playing');
    } catch (err) {
      console.warn('TTS error:', err);
      cleanup();
      setTtsState('error');
      setTimeout(() => setTtsState('idle'), 2000);
    }
  }, [ttsState, displayText, cleanup, onTtsEnd, ttsVoice, ttsModel]);

  // Auto-play on mount if requested (only once)
  useEffect(() => {
    if (autoPlay && ttsEnabled && isCoach && !hasAutoPlayed.current) {
      hasAutoPlayed.current = true;
      // Small delay to let the UI render first
      const timer = setTimeout(() => playTts(), 300);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, ttsEnabled, isCoach]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`flex ${isCoach ? 'justify-start' : 'justify-end'}`}
    >
      {isCoach && (
        <div className="coach-avatar shrink-0 mr-3 mt-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
            <path d="M12 2c3 4 5 8 5 10a5 5 0 0 1-10 0c0-2 2-6 5-10z" />
          </svg>
        </div>
      )}

      <div
        className={`max-w-[85%] px-4 py-3 ${
          isCoach
            ? 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm'
            : 'bg-teal-600 text-white rounded-2xl rounded-tr-sm'
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>

        {isCoach && exercises.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {exercises.map((key) => (
              <Link
                key={key}
                href={EXERCISE_LINKS[key].href}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-sm font-medium hover:bg-teal-100 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                {EXERCISE_LINKS[key].label}
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={`text-[11px] ${
              isCoach ? 'text-gray-400' : 'text-white/60'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {isCoach && ttsEnabled && (
            <button
              onClick={playTts}
              className={`p-0.5 rounded-md transition-colors ${
                ttsState === 'error'
                  ? 'text-red-400'
                  : ttsState === 'playing'
                    ? 'text-teal-600'
                    : 'text-gray-400 hover:text-teal-600'
              }`}
              aria-label={ttsState === 'playing' ? 'Arrêter' : 'Écouter'}
            >
              {ttsState === 'loading' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : ttsState === 'playing' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : ttsState === 'error' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
