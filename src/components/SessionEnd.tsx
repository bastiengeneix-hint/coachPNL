'use client';

import { Session } from '@/types';

interface SessionEndProps {
  session: Session;
  onClose: () => void;
}

export default function SessionEnd({ session, onClose }: SessionEndProps) {
  const lastCoachMessage = [...session.messages]
    .reverse()
    .find((m) => m.role === 'coach');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-6">
      <div className="w-full max-w-sm bg-[var(--color-bg-secondary)] rounded-3xl border border-[var(--color-border-custom)] p-6 space-y-5">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Session terminée
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {session.mode === 'deblocage' ? 'Déblocage' : 'Journal'} — {new Date(session.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Insight clé */}
        {lastCoachMessage && (
          <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-4">
            <p className="text-xs text-[var(--color-text-muted)] mb-2">Dernière note du coach</p>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-4">
              {lastCoachMessage.content}
            </p>
          </div>
        )}

        {/* Thèmes */}
        {session.themes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {session.themes.map((theme) => (
              <span
                key={theme}
                className="px-3 py-1 rounded-full text-xs bg-[var(--color-accent-soft)] text-[var(--color-accent)] border border-[var(--color-accent)] border-opacity-20"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Exercice */}
        {session.exercice_propose && (
          <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-4">
            <p className="text-xs text-[var(--color-accent)] mb-1">Exercice proposé</p>
            <p className="text-sm text-[var(--color-text-primary)]">
              {session.exercice_propose}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
