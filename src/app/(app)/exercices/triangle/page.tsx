'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExerciseLayout from '@/components/exercises/ExerciseLayout';
import ScoreSlider from '@/components/exercises/ScoreSlider';
import TriangleCanvas from '@/components/exercises/TriangleCanvas';
import CoachReview from '@/components/exercises/CoachReview';
import { saveExerciseResult, getExerciseReview } from '@/lib/exercises/store';
import { getProfile } from '@/lib/memory/store';
import { ExerciseReview, TriangleEquilibreData } from '@/types';

const DEFAULT_AREAS = ['Vie pro', 'Vie perso', 'Santé'];

export default function TrianglePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<ExerciseReview | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [areas, setAreas] = useState(
    DEFAULT_AREAS.map((label) => ({ label, score: 5 }))
  );
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile.projets.length > 0) {
        setSuggestions(profile.projets.slice(0, 5));
      }
    });
  }, []);

  const updateLabel = (index: number, label: string) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, label } : a)));
  };

  const updateScore = (index: number, score: number) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, score } : a)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: TriangleEquilibreData = { areas, reflection };
      const sorted = [...areas].sort((a, b) => b.score - a.score);
      const insights = [
        `Déséquilibre entre ${sorted[0].label} (${sorted[0].score}/10) et ${sorted[2].label} (${sorted[2].score}/10)`,
      ];

      await saveExerciseResult({
        exercise_type: 'triangle_equilibre',
        data,
        insights,
      });

      const reviewResult = await getExerciseReview({
        exercise_type: 'triangle_equilibre',
        data,
        insights,
      });
      setReview(reviewResult);
    } catch (error) {
      console.error('Error saving exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  const labelsValid = areas.every((a) => a.label.trim().length > 0);

  const stepTitles = [
    { title: 'Choisis 3 domaines de ta vie', subtitle: 'Ceux qui comptent le plus pour toi' },
    { title: 'Note chaque domaine', subtitle: 'De 1 (insatisfait) à 10 (épanoui)' },
    { title: 'Ton Triangle d\'Équilibre', subtitle: 'Observe et réfléchis' },
  ];

  const current = stepTitles[step - 1];

  return (
    <>
      <ExerciseLayout
        title={current.title}
        subtitle={current.subtitle}
        currentStep={step}
        totalSteps={3}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onNext={
          step < 3
            ? () => setStep(step + 1)
            : !review
              ? handleSave
              : undefined
        }
        nextLabel={step === 3 ? 'Enregistrer' : 'Suivant'}
        nextDisabled={step === 1 && !labelsValid}
        loading={saving}
      >
        {/* Step 1: Name 3 areas */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            {areas.map((area, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1 block">
                  Domaine {i + 1}
                </label>
                <input
                  type="text"
                  value={area.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  placeholder={DEFAULT_AREAS[i]}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all"
                />
              </div>
            ))}

            {/* Suggestions from profile */}
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Suggestions depuis tes projets :</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const emptyIdx = areas.findIndex((a) => DEFAULT_AREAS.includes(a.label));
                        if (emptyIdx !== -1) updateLabel(emptyIdx, s);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-colors cursor-pointer border border-gray-200"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Score each area */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <TriangleCanvas areas={areas} />
            <div className="space-y-4">
              {areas.map((area, i) => (
                <ScoreSlider
                  key={area.label}
                  label={area.label}
                  value={area.score}
                  onChange={(v) => updateScore(i, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Visualization + Reflection */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <TriangleCanvas areas={areas} />

            <div className="space-y-1.5">
              {areas.map((a) => (
                <div key={a.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{a.label}</span>
                  <span className={`font-semibold ${a.score <= 4 ? 'text-amber-600' : a.score >= 8 ? 'text-teal-600' : 'text-gray-700'}`}>
                    {a.score}/10
                  </span>
                </div>
              ))}
            </div>

            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Qu'est-ce que tu observes ? Y a-t-il un déséquilibre ?"
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all resize-none"
            />
          </div>
        )}
      </ExerciseLayout>

      {review && (
        <CoachReview
          review={review}
          onClose={() => router.push('/exercices')}
        />
      )}
    </>
  );
}
