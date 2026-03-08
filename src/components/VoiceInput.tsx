'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Extend Window for webkitSpeechRecognition
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      }
    }
  }, []);

  function createRecognition() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    return recognition;
  }

  const startRecording = useCallback(() => {
    if (!isSupported || disabled) return;

    const recognition = createRecognition();
    recognitionRef.current = recognition;

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
    setTranscript('');
  }, [isSupported, disabled]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);

    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript('');
    }
  }, [transcript, onTranscript]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-center">
      {/* Transcription en cours */}
      {isRecording && transcript && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-[var(--color-glass)] backdrop-blur-xl border border-[var(--color-glass-border)] text-sm text-[var(--color-text-secondary)] max-w-full overflow-hidden animate-fade-in">
          <p className="line-clamp-3">{transcript}</p>
        </div>
      )}

      {/* Bouton micro */}
      <button
        onClick={toggleRecording}
        disabled={disabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center spring cursor-pointer ${
          isRecording
            ? 'bg-rose-500 mic-recording'
            : 'bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end))] hover:brightness-110 shadow-lg shadow-[var(--color-accent-soft)]'
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
        aria-label={isRecording ? 'Arreter' : 'Parler'}
      >
        {isRecording ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
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

      {isRecording && (
        <span className="mt-2 text-xs text-[var(--color-accent)] animate-pulse-warm">
          Enregistrement...
        </span>
      )}
    </div>
  );
}
