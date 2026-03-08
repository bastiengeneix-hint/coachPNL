'use client';

import { Message } from '@/types';

interface CoachMessageProps {
  message: Message;
}

export default function CoachMessage({ message }: CoachMessageProps) {
  const isCoach = message.role === 'coach';

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
        <span
          className={`block mt-1.5 text-[11px] ${
            isCoach
              ? 'text-gray-400'
              : 'text-white/60'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
