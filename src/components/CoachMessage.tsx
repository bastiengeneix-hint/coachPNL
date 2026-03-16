'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Message } from '@/types';

interface CoachMessageProps {
  message: Message;
  ttsEnabled?: boolean;
  autoPlay?: boolean;
}

type TtsState = 'idle' | 'loading' | 'playing' | 'error';

export default function CoachMessage({ message, ttsEnabled, autoPlay }: CoachMessageProps) {
  const isCoach = message.role === 'coach';
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
        body: JSON.stringify({ text: message.content }),
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
  }, [ttsState, message.content, cleanup]);

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
          {message.content}
        </p>
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
