'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExerciseLayout from '@/components/exercises/ExerciseLayout';
import ScoreSlider from '@/components/exercises/ScoreSlider';
import RoueVieChart from '@/components/exercises/RoueVieChart';
import CoachReview from '@/components/exercises/CoachReview';
import { ROUE_VIE_AXES } from '@/lib/exercises/definitions';
import { saveExerciseResult, getExerciseReview } from '@/lib/exercises/store';
import { ExerciseReview, RoueVieData } from '@/types';

export default function RoueViePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<ExerciseReview | null>(null);

  const [axes, setAxes] = useState(
    ROUE_VIE_AXES.map((label) => ({ label, score: 5 }))
  );
  const [action, setAction] = useState('');
  const [reflection, setReflection] = useState('');

  const updateScore = (index: number, score: number) => {
    setAxes((prev) => prev.map((a, i) => (i === index ? { ...a, score } : a)));
  };

  const lowest = [...axes].sort((a, b) => a.score - b.score)[0];

  // Auto-generate insights
  const generateInsights = (): string[] => {
    const sorted = [...axes].sort((a, b) => a.score - b.score);
    const bottom2 = sorted.slice(0, 2).map((a) => `${a.label} (${a.score}/10)`);
    const top2 = sorted.slice(-2).map((a) => `${a.label} (${a.score}/10)`);
    return [
      `Points forts : ${top2.join(', ')}`,
      `A travailler : ${bottom2.join(', ')}`,
    ];
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: RoueVieData = {
        axes,
        lowest_area_action: action,
        reflection,
      };
      const insights = generateInsights();

      await saveExerciseResult({
        exercise_type: 'roue_vie',
        data,
        insights,
      });

      // Get coach review
      const reviewResult = await getExerciseReview({
        exercise_type: 'roue_vie',
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

  const stepTitles = [
    { title: 'Note chaque domaine de ta vie', subtitle: 'De 1 (insatisfait) à 10 (épanoui)' },
    { title: `Ton point bas : ${lowest.label}`, subtitle: 'Quelle petite action cette semaine ?' },
    { title: 'Ta Roue de la Vie', subtitle: 'Observe et réfléchis' },
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
        nextDisabled={step === 2 && !action.trim()}
        loading={saving}
      >
        {/* Step 1: Score axes */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <RoueVieChart axes={axes} />
            <div className="space-y-4">
              {axes.map((axis, i) => (
                <ScoreSlider
                  key={axis.label}
                  label={axis.label}
                  value={axis.score}
                  onChange={(v) => updateScore(i, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Action for lowest area */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-200">
                {lowest.label} — {lowest.score}/10
              </span>
            </div>
            <textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder={`Quelle petite action pourrais-tu faire cette semaine pour améliorer "${lowest.label}" ?`}
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all resize-none"
            />
          </div>
        )}

        {/* Step 3: Visualization + Reflection */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <RoueVieChart axes={axes} />

            {/* Summary */}
            <div className="space-y-1.5">
              {[...axes].sort((a, b) => b.score - a.score).map((a) => (
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
              placeholder="Qu'est-ce que tu observes ? Qu'est-ce qui te surprend ?"
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all resize-none"
            />
          </div>
        )}
      </ExerciseLayout>

      {/* Coach Review Modal */}
      {review && (
        <CoachReview
          review={review}
          onClose={() => router.push('/exercices')}
        />
      )}
    </>
  );
}
