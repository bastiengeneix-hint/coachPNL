export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  onboarding_complete: boolean;
  created_at: string;
}

export type SessionMode = 'deblocage' | 'journal';

export interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: number;
}

export interface SessionInsight {
  text: string;
  isBreakthrough: boolean;
}

export interface SessionAction {
  text: string;
  done: boolean;
}

export interface Session {
  id: string;
  date: string;
  mode: SessionMode;
  messages: Message[];
  insights: SessionInsight[];
  themes: string[];
  exercice_propose: string | null;
  exercice_fait: boolean;
  summary: string | null;
  coach_summary: string | null;
  actions: SessionAction[];
}

export interface Profile {
  projets: string[];
  patterns_sabotage: string[];
  barrieres_ulp: string[];
  croyances_limitantes: string[];
  preferences: {
    ce_qui_aide: string[];
    ce_qui_bloque: string[];
    ton: 'direct' | 'doux' | 'mix';
  };
}

export interface ActiveContext {
  summary: string;
  last_updated: string;
  recent_themes: string[];
  pending_exercice: string | null;
}

export interface RAGChunk {
  id: string;
  source_id: string;
  livre: string;
  auteur: string;
  chapitre: string;
  page_start: number;
  page_end: number;
  content: string;
  embedding?: number[];
}

export interface RAGSource {
  id: string;
  titre: string;
  auteur: string;
  domaine: string;
  active: boolean;
  chunks_count: number;
  indexed_at: string;
}

// --- Exercise types ---

export type ExerciseType = 'triangle_equilibre' | 'ikigai' | 'roue_vie' | 'systeme12';

export interface ExerciseResult {
  id: string;
  exercise_type: ExerciseType;
  data: TriangleEquilibreData | IkigaiData | RoueVieData | Systeme12Data;
  insights: string[];
  completed_at: string;
}

export interface TriangleEquilibreData {
  areas: { label: string; score: number }[];
  reflection: string;
}

export interface IkigaiData {
  passion: string[];
  mission: string[];
  vocation: string[];
  profession: string[];
  reflection: string;
}

export interface RoueVieData {
  axes: { label: string; score: number }[];
  lowest_area_action: string;
  reflection: string;
}

export interface Systeme12Data {
  input: string;
  input_type: 'question' | 'decision' | 'souhait';
  systeme1: string;
  systeme2: string;
  conclusion: string;
}

export interface ExerciseDefinition {
  type: ExerciseType;
  title: string;
  description: string;
  estimatedMinutes: number;
}

export interface ExerciseReview {
  observation: string;
  question: string;
  piste: string;
}

export interface ExerciseSuggestion {
  type: ExerciseType;
  reason: string;
}

// --- Profile evolution ---

export interface ProfileEvolution {
  add_croyances?: string[];
  remove_croyances?: string[];
  add_patterns?: string[];
  remove_patterns?: string[];
  add_projets?: string[];
}

export interface SessionAnalysis {
  insights: SessionInsight[];
  themes: string[];
  exercice_propose: string | null;
  reminder_config: ReminderConfig | null;
  actions: SessionAction[];
  coach_summary: string;
  summary: string;
  profile_evolution: ProfileEvolution;
}

// --- Reminder types ---

export interface ReminderConfig {
  frequency: 'daily' | 'every_2_days' | 'every_3_days' | 'weekly';
  duration_days: number;
  message: string;
}

export interface ExerciseReminder {
  id: string;
  exercise_description: string;
  frequency: string;
  start_date: string;
  end_date: string;
  next_reminder_at: string;
  completed: boolean;
}

// --- Bilan types ---

export type BilanType = 'weekly' | 'monthly' | 'yearly';

export interface BilanContent {
  summary: string;
  themes_dominants: string[];
  breakthroughs: string[];
  actions_completed: number;
  actions_total: number;
  sessions_count: number;
  exercises_done: number;
  profile_evolution: string;
  coach_note: string;
  coach_lesson: string;
  next_action: string;
}

export interface Bilan {
  id: string;
  type: BilanType;
  period_start: string;
  period_end: string;
  content: BilanContent;
  generated_at: string;
}
