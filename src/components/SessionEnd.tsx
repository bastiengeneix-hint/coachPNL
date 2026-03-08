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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 animate-fade-in px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6 border border-gray-100">
        <div className="text-center">
          {/* Checkmark icon */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-teal-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-teal-600">
            Session terminée
          </h2>
          <p className="mt-1.5 text-sm text-gray-400">
            {session.mode === 'deblocage' ? 'Déblocage' : 'Journal'} —{' '}
            {new Date(session.date).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        {/* Insight cle */}
        {lastCoachMessage && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Dernière note du coach
            </p>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">
              {lastCoachMessage.content}
            </p>
          </div>
        )}

        {/* Themes */}
        {session.themes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {session.themes.map((theme) => (
              <span
                key={theme}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-teal-50 text-teal-600"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Exercice */}
        {session.exercice_propose && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-teal-600 mb-1.5 uppercase tracking-wide">
              Exercice proposé
            </p>
            <p className="text-sm text-gray-800 leading-relaxed">
              {session.exercice_propose}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
