'use client';

import { useState } from 'react';
import type { BilanContent, BilanType } from '@/types';

interface BilanCardProps {
  type: BilanType;
  periodStart: string;
  periodEnd: string;
  content: BilanContent;
}

const TYPE_LABELS: Record<BilanType, string> = {
  weekly: 'Bilan de la semaine',
  monthly: 'Bilan du mois',
  yearly: 'Bilan annuel',
};

export default function BilanCard({ type, periodStart, periodEnd, content }: BilanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const periodLabel = `${new Date(periodStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left flex items-center gap-4 cursor-pointer"
      >
        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-gray-800 font-semibold text-[15px]">{TYPE_LABELS[type]}</p>
          <p className="text-gray-400 text-sm mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-600 font-medium">
            {content.sessions_count} sessions
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in border-t border-gray-100 pt-4">
          {/* Summary */}
          {content.summary && (
            <p className="text-sm text-gray-600 leading-relaxed">{content.summary}</p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-teal-600">{content.sessions_count}</p>
              <p className="text-xs text-gray-400">Sessions</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-teal-600">{content.actions_completed}/{content.actions_total}</p>
              <p className="text-xs text-gray-400">Actions</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-teal-600">{content.exercises_done}</p>
              <p className="text-xs text-gray-400">Exercices</p>
            </div>
          </div>

          {/* Themes */}
          {content.themes_dominants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Thèmes dominants</p>
              <div className="flex flex-wrap gap-2">
                {content.themes_dominants.map((t, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-600">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Breakthroughs */}
          {content.breakthroughs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Prises de conscience</p>
              <div className="space-y-2">
                {content.breakthroughs.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5 pl-3 border-l-2 border-amber-400">
                    <p className="text-sm text-gray-600 leading-relaxed">{b}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile evolution */}
          {content.profile_evolution && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Évolution</p>
              <p className="text-sm text-gray-600 leading-relaxed">{content.profile_evolution}</p>
            </div>
          )}

          {/* Coach lesson */}
          {content.coach_lesson && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">La leçon de la semaine</p>
              <p className="text-sm text-amber-900 leading-relaxed font-medium">{content.coach_lesson}</p>
            </div>
          )}

          {/* Next action */}
          {content.next_action && (
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Action à faire</p>
              <p className="text-sm text-indigo-900 leading-relaxed font-medium">{content.next_action}</p>
            </div>
          )}

          {/* Coach note */}
          {content.coach_note && (
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Note du coach</p>
              <p className="text-sm text-teal-800 leading-relaxed italic">{content.coach_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
