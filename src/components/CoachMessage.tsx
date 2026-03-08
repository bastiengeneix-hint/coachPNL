'use client';

import { Message } from '@/types';

interface CoachMessageProps {
  message: Message;
}

export default function CoachMessage({ message }: CoachMessageProps) {
  const isCoach = message.role === 'coach';

  return (
    <div
      className={`flex animate-fade-in ${isCoach ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 ${
          isCoach
            ? 'bg-[var(--color-glass)] backdrop-blur-xl border border-[var(--color-glass-border)] text-[var(--color-text-primary)] rounded-2xl rounded-tl-md'
            : 'bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end))] text-white rounded-2xl rounded-tr-md shadow-lg shadow-[var(--color-accent-soft)]'
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="block mt-1 text-[10px] opacity-30">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
