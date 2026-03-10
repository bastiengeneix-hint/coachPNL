'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExerciseLayout from '@/components/exercises/ExerciseLayout';
import TagInput from '@/components/exercises/TagInput';
import IkigaiDiagram from '@/components/exercises/IkigaiDiagram';
import CoachReview from '@/components/exercises/CoachReview';
import { saveExerciseResult, getExerciseReview } from '@/lib/exercises/store';
import { getProfile } from '@/lib/memory/store';
import { ExerciseReview, IkigaiData } from '@/types';

export default function IkigaiPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<ExerciseReview | null>(null);
  const [profileSuggestions, setProfileSuggestions] = useState<string[]>([]);

  const [passion, setPassion] = useState<string[]>([]);
  const [mission, setMission] = useState<string[]>([]);
  const [vocation, setVocation] = useState<string[]>([]);
  const [profession, setProfession] = useState<string[]>([]);
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    getProfile().then((profile) => {
      if (profile.projets.length > 0) {
        setProfileSuggestions(profile.projets.slice(0, 5));
      }
    });
  }, []);

  // Find convergences
  const allItems = [...new Set([...passion, ...mission, ...vocation, ...profession])];
  const convergences = allItems.filter((item) => {
    let count = 0;
    if (passion.includes(item)) count++;
    if (mission.includes(item)) count++;
    if (vocation.includes(item)) count++;
    if (profession.includes(item)) count++;
    return count >= 3;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: IkigaiData = { passion, mission, vocation, profession, reflection };
      const insights: string[] = [];
      if (convergences.length > 0) {
        insights.push(`Pistes IKIGAI fortes : ${convergences.join(', ')}`);
      }
      insights.push(`${allItems.length} éléments explorés dans 4 domaines`);

      await saveExerciseResult({
        exercise_type: 'ikigai',
        data,
        insights,
      });

      const reviewResult = await getExerciseReview({
        exercise_type: 'ikigai',
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

  const stepConfig = [
    {
      title: 'Ce que tu adores faire',
      subtitle: 'Tes passions, ce qui te fait vibrer',
      tags: passion,
      setTags: setPassion,
      placeholder: 'Ex : écrire, voyager, créer...',
    },
    {
      title: 'Ce dont le monde a besoin',
      subtitle: 'Ta mission, ce qui te semble important',
      tags: mission,
      setTags: setMission,
      placeholder: 'Ex : accompagner, éduquer, soigner...',
    },
    {
      title: 'Ce pour quoi on te paierait',
      subtitle: 'Ta vocation, tes compétences monnayables',
      tags: vocation,
      setTags: setVocation,
      placeholder: 'Ex : coaching, design, gestion...',
    },
    {
      title: 'Ce dans quoi tu excelles',
      subtitle: 'Tes forces, ce que tu fais mieux que les autres',
      tags: profession,
      setTags: setProfession,
      placeholder: 'Ex : écouter, analyser, organiser...',
    },
    {
      title: 'Ton IKIGAI',
      subtitle: 'Observe les croisements',
    },
  ];

  const current = stepConfig[step - 1];

  return (
    <>
      <ExerciseLayout
        title={current.title}
        subtitle={current.subtitle}
        currentStep={step}
        totalSteps={5}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onNext={
          step < 5
            ? () => setStep(step + 1)
            : !review
              ? handleSave
              : undefined
        }
        nextLabel={step === 5 ? 'Enregistrer' : 'Suivant'}
        loading={saving}
      >
        {/* Steps 1-4: Tag inputs */}
        {step >= 1 && step <= 4 && 'tags' in current && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <TagInput
              tags={current.tags!}
              onChange={current.setTags!}
              placeholder={current.placeholder}
              suggestions={step === 1 ? profileSuggestions : []}
            />
          </div>
        )}

        {/* Step 5: Visualization + Reflection */}
        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <IkigaiDiagram
              passion={passion}
              mission={mission}
              vocation={vocation}
              profession={profession}
            />

            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Qu'est-ce que tu retiens ? Vois-tu des convergences ?"
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
