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

// Extend Window for webkitSpeechRecognition
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
      finalTranscriptRef.current = '';

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
        // Send progressive transcription to parent — fills textarea in real-time
        const fullText = finalTranscriptRef.current + interim;
        onInterimTranscript?.(fullText);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        // Deliver final transcript
        const final = finalTranscriptRef.current.trim();
        if (final) {
          onTranscript(final);
        }
        setIsRecording(false);
      };

      recognition.start();
      setIsRecording(true);
    }, [isSupported, disabled, onTranscript, onInterimTranscript]);

    const stopRecording = useCallback(() => {
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

    // Expose methods to parent for auto-start
    useImperativeHandle(ref, () => ({
      startRecording,
      stopRecording,
      isRecording,
    }), [startRecording, stopRecording, isRecording]);

    if (!isSupported) return null;

    return (
      <div className="flex flex-col items-center">
        {/* Bouton micro */}
        <button
          onClick={toggleRecording}
          disabled={disabled}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
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

        {isRecording && (
          <span className="mt-2 text-xs text-red-500 animate-pulse font-medium">
            Enregistrement...
          </span>
        )}
      </div>
    );
  }
);

export default VoiceInput;
