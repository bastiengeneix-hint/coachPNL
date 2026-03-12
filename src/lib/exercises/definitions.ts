import { ExerciseDefinition } from '@/types';

export const EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
  {
    type: 'roue_vie',
    title: 'Roue de la Vie',
    description: 'Évalue 8 domaines de ta vie sur 10 et visualise ton équilibre global.',
    estimatedMinutes: 10,
  },
  {
    type: 'triangle_equilibre',
    title: 'Triangle d\'Équilibre',
    description: 'Choisis 3 domaines clés et mesure l\'équilibre entre eux.',
    estimatedMinutes: 8,
  },
  {
    type: 'ikigai',
    title: 'IKIGAI',
    description: 'Explore tes passions, ta mission, ta vocation et ta profession pour trouver ton IKIGAI.',
    estimatedMinutes: 15,
  },
  {
    type: 'systeme12',
    title: 'Système 1 / Système 2',
    description: 'Analyse une question ou décision avec tes deux modes de pensée : l\'instinct et la réflexion.',
    estimatedMinutes: 5,
  },
];

export const ROUE_VIE_AXES = [
  'Santé',
  'Carrière',
  'Relations',
  'Finances',
  'Dev. personnel',
  'Loisirs',
  'Famille',
  'Environnement',
];

export function getExerciseDefinition(type: string): ExerciseDefinition | undefined {
  return EXERCISE_DEFINITIONS.find((d) => d.type === type);
}
