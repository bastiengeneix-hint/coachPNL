'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { EXERCISE_DEFINITIONS } from '@/lib/exercises/definitions';
import { getExerciseResults, getExerciseSuggestions } from '@/lib/exercises/store';
import { ExerciseResult, ExerciseSuggestion, ExerciseType } from '@/types';

const EXERCISE_ICONS: Record<ExerciseType, string> = {
  roue_vie: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm0-14v6l4 4',
  triangle_equilibre: 'M12 2L2 20h20L12 2zm0 4l7 12H5l7-12z',
  ikigai: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 14a4 4 0 100-8 4 4 0 000 8zm4-4a4 4 0 100-8 4 4 0 000 8z',
  systeme12: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
};

const EXERCISE_ROUTES: Record<ExerciseType, string> = {
  roue_vie: '/exercices/roue',
  triangle_equilibre: '/exercices/triangle',
  ikigai: '/exercices/ikigai',
  systeme12: '/exercices/systeme12',
};

export default function ExercicesPage() {
  const router = useRouter();
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [suggestions, setSuggestions] = useState<ExerciseSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    getExerciseResults().then(setResults);
    getExerciseSuggestions()
      .then(setSuggestions)
      .finally(() => setLoadingSuggestions(false));
  }, []);

  const getLastDate = (type: ExerciseType): string | null => {
    const result = results.find((r) => r.exercise_type === type);
    if (!result) return null;
    return new Date(result.completed_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
    });
  };

  const suggestedTypes = suggestions.map((s) => s.type);

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar active="exercices" />

      <main className="md:pt-20 pt-6 pb-24 md:pb-16 px-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mt-10 mb-8 animate-fade-in">
          <h1 className="text-2xl font-semibold text-gray-800">Exercices</h1>
          <p className="text-gray-500 text-[15px] mt-1">
            Des outils concrets pour aller plus loin
          </p>
        </div>

        {/* Suggestions */}
        {!loadingSuggestions && suggestions.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <h2 className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-3">
              Recommandé pour toi
            </h2>
            <div className="space-y-2">
              {suggestions.map((s) => {
                const def = EXERCISE_DEFINITIONS.find((d) => d.type === s.type);
                if (!def) return null;
                return (
                  <button
                    key={s.type}
                    onClick={() => router.push(EXERCISE_ROUTES[s.type])}
                    className="w-full bg-teal-50 border border-teal-100 rounded-xl p-4 text-left hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-semibold text-teal-700">{def.title}</p>
                    <p className="text-xs text-teal-600 mt-0.5">{s.reason}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Système 1/2 — featured card */}
        <button
          onClick={() => router.push('/exercices/systeme12')}
          className="w-full mb-8 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 text-left transition-all duration-200 animate-fade-in hover:shadow-lg hover:from-teal-500 hover:to-teal-600 cursor-pointer group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d={EXERCISE_ICONS.systeme12} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-lg mb-1">
                Système 1 / Système 2
              </p>
              <p className="text-teal-100 text-sm leading-relaxed">
                Soumets une question, une décision ou un souhait. Découvre ce que ton instinct et ta raison en disent — et ce que l&apos;écart révèle.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-teal-200 bg-white/10 px-2.5 py-1 rounded-full">
                  ~5 min
                </span>
                {getLastDate('systeme12') && (
                  <span className="text-xs text-teal-200">
                    Dernier : {getLastDate('systeme12')}
                  </span>
                )}
                <span className="ml-auto text-xs text-teal-200 group-hover:text-white transition-colors flex items-center gap-1">
                  Lancer
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Exercise cards */}
        <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Exercices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXERCISE_DEFINITIONS.filter((def) => def.type !== 'systeme12').map((def, i) => {
            const lastDate = getLastDate(def.type);
            const isSuggested = suggestedTypes.includes(def.type);

            return (
              <button
                key={def.type}
                onClick={() => router.push(EXERCISE_ROUTES[def.type])}
                className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
                  isSuggested ? 'border-l-4 border-l-teal-500' : ''
                }`}
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                  <svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-teal-600"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={EXERCISE_ICONS[def.type]} />
                  </svg>
                </div>

                <p className="text-gray-800 font-semibold text-base mb-1">
                  {def.title}
                </p>
                <p className="text-gray-500 text-sm leading-relaxed mb-2">
                  {def.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    ~{def.estimatedMinutes} min
                  </span>
                  {lastDate && (
                    <span className="text-xs text-teal-600">
                      Fait le {lastDate}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
