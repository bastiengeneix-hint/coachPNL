'use client';

import { Session } from '@/types';

interface SessionEndProps {
  session: Session;
  onClose: () => void;
}

export default function SessionEnd({ session, onClose }: SessionEndProps) {
  const displaySummary = session.coach_summary || session.summary;
  const lastCoachMessage = [...session.messages]
    .reverse()
    .find((m) => m.role === 'coach');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 animate-fade-in px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-5 border border-gray-100 max-h-[85dvh] overflow-y-auto">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
            <svg
              width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-teal-600">Session terminée</h2>
          <p className="mt-1.5 text-sm text-gray-400">
            {session.mode === 'deblocage' ? 'Déblocage' : 'Journal'} —{' '}
            {new Date(session.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Coach summary (warm, personal) */}
        {displaySummary && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-xs font-medium text-teal-600 mb-2 uppercase tracking-wide">
              Ce que je retiens
            </p>
            <p className="text-sm text-teal-800 leading-relaxed italic">
              {displaySummary}
            </p>
          </div>
        )}

        {/* Fallback: last coach message if no summary */}
        {!displaySummary && lastCoachMessage && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Dernière note du coach
            </p>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-4">
              {lastCoachMessage.content}
            </p>
          </div>
        )}

        {/* Actions */}
        {session.actions?.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 mb-2.5 uppercase tracking-wide">
              Tes engagements
            </p>
            <div className="space-y-2">
              {session.actions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <p className="text-sm text-gray-700 leading-relaxed">{action.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Themes */}
        {session.themes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {session.themes.map((theme) => (
              <span key={theme} className="px-3 py-1.5 rounded-full text-xs font-medium bg-teal-50 text-teal-600">
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
            <p className="text-sm text-gray-800 leading-relaxed">{session.exercice_propose}</p>
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
