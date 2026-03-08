import { Profile } from '@/types';

export const defaultProfile: Profile = {
  projets: [
    'Hint (CRO agency)',
    'Werel Sport (e-commerce Amazon)',
    'Formation Freepreneur',
  ],
  patterns_sabotage: [
    'Procrastination sur les tâches à fort enjeu',
    'Perfectionnisme paralysant',
    'Doute de légitimité après un succès',
  ],
  barrieres_ulp: [
    'Fondamentalement défaillant',
    'Peur de la déloyauté',
    "Peur d'éclipser",
  ],
  croyances_limitantes: [
    'Je ne suis pas assez légitime',
    'Le succès attire les problèmes',
  ],
  preferences: {
    ce_qui_aide: ['Questions directes', 'Pas de condescendance', 'Humour sec'],
    ce_qui_bloque: ['Psycho-jargon', 'Formules clichés', 'Condescendance'],
  },
};
