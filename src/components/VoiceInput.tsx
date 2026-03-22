'use client';

import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface VoiceInputHandle {
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
}

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  disabled?: boolean;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

const VoiceInput = forwardRef<VoiceInputHandle, VoiceInputProps>(
  function VoiceInput({ onTranscript, onInterimTranscript, disabled }, ref) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
    const finalTranscriptRef = useRef('');
    // Track whether the user explicitly pressed stop vs recognition dying on its own
    const userStoppedRef = useRef(false);
    // Store latest callbacks to avoid stale closures in recognition handlers
    const onTranscriptRef = useRef(onTranscript);
    const onInterimRef = useRef(onInterimTranscript);

    useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
    useEffect(() => { onInterimRef.current = onInterimTranscript; }, [onInterimTranscript]);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) setIsSupported(false);
      }
    }, []);

    function createRecognition() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      return recognition;
    }

    const startRecording = useCallback(() => {
      if (!isSupported || disabled) return;

      // Clean up any existing recognition
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }

      const recognition = createRecognition();
      recognitionRef.current = recognition;
      finalTranscriptRef.current = '';
      userStoppedRef.current = false;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscriptRef.current += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
        const fullText = finalTranscriptRef.current + interim;
        onInterimRef.current?.(fullText);
      };

      recognition.onerror = (event: { error: string }) => {
        // 'aborted' is expected when we call .abort(), 'no-speech' is a timeout
        if (event.error === 'aborted') return;
        if (event.error === 'no-speech') {
          // On mobile, no-speech fires after silence — auto-restart
          return;
        }
        console.warn('Speech recognition error:', event.error);
      };

      recognition.onend = () => {
        if (userStoppedRef.current) {
          // User explicitly stopped — deliver final transcript
          const final = finalTranscriptRef.current.trim();
          if (final) {
            onTranscriptRef.current(final);
          }
          setIsRecording(false);
        } else {
          // Recognition died on its own (mobile timeout, TTS audio, etc.)
          // Auto-restart to keep recording
          try {
            const newRecognition = createRecognition();
            recognitionRef.current = newRecognition;

            newRecognition.onresult = recognition.onresult;
            newRecognition.onerror = recognition.onerror;
            newRecognition.onend = recognition.onend;

            newRecognition.start();
          } catch {
            // If restart fails, stop cleanly
            const final = finalTranscriptRef.current.trim();
            if (final) {
              onTranscriptRef.current(final);
            }
            setIsRecording(false);
          }
        }
      };

      try {
        recognition.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    }, [isSupported, disabled]);

    const stopRecording = useCallback(() => {
      userStoppedRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }, []);

    const toggleRecording = useCallback(() => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }, [isRecording, startRecording, stopRecording]);

    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
      isRecording,
    }), [startRecording, stopRecording, isRecording]);

    if (!isSupported) return null;

    return (
      <button
        onClick={toggleRecording}
        disabled={disabled}
        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isRecording
            ? 'bg-red-500 mic-recording'
            : 'bg-teal-600 hover:bg-teal-700'
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        aria-label={isRecording ? 'Arrêter' : 'Parler'}
      >
        {isRecording ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
    );
  }
);

export default VoiceInput;
