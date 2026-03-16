'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ExerciseLayout from '@/components/exercises/ExerciseLayout';
import CoachReview from '@/components/exercises/CoachReview';
import { saveExerciseResult, getExerciseReview } from '@/lib/exercises/store';
import { evolveProfile } from '@/lib/memory/store';
import { ExerciseReview, ProfileEvolution, Systeme12Data } from '@/types';

type InputType = 'question' | 'decision' | 'souhait';

const INPUT_TYPE_LABELS: Record<InputType, { label: string; placeholder: string }> = {
  question: {
    label: 'Une question',
    placeholder: 'Ex : Est-ce que je devrais quitter mon job ?',
  },
  decision: {
    label: 'Une décision',
    placeholder: 'Ex : Je vais lancer mon projet ce mois-ci.',
  },
  souhait: {
    label: 'Un souhait',
    placeholder: 'Ex : J\'aimerais oser dire non plus souvent.',
  },
};

interface AnalysisResult {
  systeme1: string;
  systeme2: string;
  conclusion: string;
  profile_evolution?: ProfileEvolution;
}

export default function Systeme12Page() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inputType, setInputType] = useState<InputType>('question');
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<ExerciseReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/exercises/systeme12', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, input_type: inputType }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const result = await res.json();
      setAnalysis(result);
      setStep(2);
    } catch (err) {
      console.error('Systeme12 analysis error:', err);
      setError('Erreur lors de l\'analyse. Réessaie.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    setSaving(true);
    setError(null);
    try {
      const data: Systeme12Data = {
        input,
        input_type: inputType,
        systeme1: analysis.systeme1,
        systeme2: analysis.systeme2,
        conclusion: analysis.conclusion,
      };
      const insights = [
        `Analyse S1/S2 sur : "${input.slice(0, 80)}${input.length > 80 ? '...' : ''}"`,
      ];

      await saveExerciseResult({
        exercise_type: 'systeme12',
        data,
        insights,
      });

      // Evolve profile with insights from the S1/S2 analysis
      if (analysis.profile_evolution) {
        evolveProfile(analysis.profile_evolution).catch((err) =>
          console.warn('Profile evolution error (non-blocking):', err)
        );
      }

      try {
        const reviewResult = await getExerciseReview({
          exercise_type: 'systeme12',
          data,
          insights,
        });
        setReview(reviewResult);
      } catch (reviewErr) {
        console.warn('Review error (non-blocking):', reviewErr);
        // Save succeeded but review failed — still redirect
        router.push('/exercices');
      }
    } catch (err) {
      console.error('Error saving exercise:', err);
      setError('Erreur lors de l\'enregistrement. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  const stepTitles = [
    { title: 'Qu\'est-ce qui t\'occupe l\'esprit ?', subtitle: 'Une question, une décision ou un souhait' },
    { title: 'Tes deux modes de pensée', subtitle: 'L\'instinct vs la réflexion' },
  ];

  const current = stepTitles[step - 1];

  return (
    <>
      <ExerciseLayout
        title={current.title}
        subtitle={current.subtitle}
        currentStep={step}
        totalSteps={2}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onNext={
          step === 1
            ? handleAnalyze
            : !review
              ? handleSave
              : undefined
        }
        nextLabel={step === 1 ? 'Analyser' : 'Enregistrer'}
        nextDisabled={step === 1 && input.trim().length < 5}
        loading={loading || saving}
      >
        {/* Step 1: Input */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            {/* Input type selector */}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2.5">
                Type
              </p>
              <div className="flex gap-2">
                {(Object.keys(INPUT_TYPE_LABELS) as InputType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setInputType(type)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      inputType === type
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {INPUT_TYPE_LABELS[type].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input textarea */}
            <div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={INPUT_TYPE_LABELS[inputType].placeholder}
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-400 leading-relaxed">
              Kahneman distingue deux systèmes de pensée : le Système 1 (rapide, instinctif, émotionnel) et le Système 2 (lent, analytique, rationnel). Cet exercice te montre comment ces deux voix répondent à ta question.
            </p>
          </div>
        )}

        {/* Step 2: Results */}
        {step === 2 && analysis && (
          <div className="space-y-4">
            {/* User input recap */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-xs text-gray-400 mb-1">
                {INPUT_TYPE_LABELS[inputType].label}
              </p>
              <p className="text-sm text-gray-700 font-medium">{input}</p>
            </div>

            {/* Système 1 */}
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Système 1</p>
                  <p className="text-xs text-amber-600">Instinct, rapide, émotionnel</p>
                </div>
              </div>
              <p className="text-sm text-amber-900 leading-relaxed">{analysis.systeme1}</p>
            </div>

            {/* Système 2 */}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Système 2</p>
                  <p className="text-xs text-blue-600">Analyse, lent, rationnel</p>
                </div>
              </div>
              <p className="text-sm text-blue-900 leading-relaxed">{analysis.systeme2}</p>
            </div>

            {/* Conclusion du coach */}
            <div className="bg-teal-50 rounded-2xl border border-teal-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-800">Ce que j'en pense</p>
                  <p className="text-xs text-teal-600">L'avis de ton coach</p>
                </div>
              </div>
              <p className="text-sm text-teal-900 leading-relaxed">{analysis.conclusion}</p>
            </div>
          </div>
        )}
        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 rounded-xl border border-red-200 p-4 text-sm text-red-700 text-center">
            {error}
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
