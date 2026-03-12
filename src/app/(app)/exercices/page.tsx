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

        {/* Exercise cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {EXERCISE_DEFINITIONS.map((def, i) => {
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
