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
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isCoach
            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-tl-md'
            : 'bg-[var(--color-accent)] text-white rounded-tr-md'
        }`}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="block mt-1 text-[10px] opacity-40">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
