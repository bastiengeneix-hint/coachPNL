'use client';

interface ActionItemProps {
  text: string;
  done: boolean;
  sessionDate?: string;
  onToggle: () => void;
}

export default function ActionItem({ text, done, sessionDate, onToggle }: ActionItemProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <button
        onClick={onToggle}
        className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
          done
            ? 'bg-teal-500 border-teal-500'
            : 'border-gray-300 hover:border-teal-400'
        }`}
      >
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
          {text}
        </p>
        {sessionDate && (
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(sessionDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>
    </div>
  );
}
