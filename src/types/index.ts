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
  ended: boolean;
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
    /** Prénom du coach — l'incarnation commence par un nom. */
    coach_name?: string;
    /** Ses mots à lui, ceux qu'il emploie pour se décrire. Le coach les reprend tels quels. */
    lexique?: string[];
    tts_enabled?: boolean;
    tts_voice?: string;
    tts_model?: string;
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
  /** Barrières ULP (Hendricks) — le champ existait en base mais rien ne l'alimentait. */
  add_barrieres?: string[];
  remove_barrieres?: string[];
  /** Expressions récurrentes de l'utilisateur, pour que le coach parle sa langue. */
  add_lexique?: string[];
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

/**
 * Ce qu'on récolte d'une séance pour faire avancer le PARCOURS (et pas
 * seulement pour en garder un résumé). Extrait par un appel dédié en fin de
 * séance, appliqué côté serveur.
 */
export interface SessionHarvest {
  program: {
    /** Objectif bien formulé, au positif, dans ses mots. */
    objectif: string | null;
    pourquoi_maintenant: string | null;
    etat_present: string | null;
    etat_desire: string | null;
    criteres_reussite: string[];
    /** Nombre de semaines de travail visé (converti en date côté serveur). */
    duree_semaines: number | null;
    /** true seulement si la séance a explicitement redéfini l'objectif. */
    revise_objectif: boolean;
  } | null;
  milestones_new: string[];
  milestones_done: string[];
  measures_new: Array<{
    label: string;
    question: string;
    direction: 'up' | 'down';
    baseline: number | null;
    cible: number | null;
  }>;
  measure_readings: Array<{ label: string; value: number; note: string | null }>;
  practices_new: Array<{
    label: string;
    pourquoi: string | null;
    declencheur: string | null;
    cadence: PracticeCadence;
    protocol_id: string | null;
  }>;
  protocol_run: {
    protocol_id: string;
    sujet: string | null;
    resultat: string | null;
    intensite_avant: number | null;
    intensite_apres: number | null;
    revisit_in_days: number | null;
  } | null;
  /** Protocoles anciens réévalués pendant cette séance (ids). */
  protocols_revisited: Array<{ protocol_id: string; note: string | null }>;
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
  message?: string | null;
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

// ─── LE PARCOURS ────────────────────────────────────────────────────────────
// Un coach qui vaut son prix ne fait pas des séances : il conduit un travail.
// Un objectif bien formulé, des mesures, des pratiques quotidiennes, des
// protocoles qu'on réévalue. Tout ce qui suit est cette colonne vertébrale.

export type ProgramStatus = 'actif' | 'atteint' | 'abandonne' | 'en_pause';

export interface Program {
  id: string;
  objectif: string;
  pourquoi_maintenant: string | null;
  etat_present: string | null;
  etat_desire: string | null;
  criteres_reussite: string[];
  echeance: string | null;
  statut: ProgramStatus;
  started_at: string;
  closed_at: string | null;
  bilan_final: string | null;
}

export interface ProgramMilestone {
  id: string;
  program_id: string;
  label: string;
  ordre: number;
  target_date: string | null;
  done: boolean;
  done_at: string | null;
}

export interface Measure {
  id: string;
  program_id: string | null;
  label: string;
  question: string | null;
  /** 'up' = on veut que ça monte (confiance), 'down' = qu'on veut voir baisser (anxiété). */
  direction: 'up' | 'down';
  baseline: number | null;
  cible: number | null;
  cadence_days: number;
  active: boolean;
  created_at: string;
}

export interface MeasureEntry {
  id: string;
  measure_id: string;
  value: number;
  note: string | null;
  source: 'app' | 'session' | 'checkin';
  recorded_at: string;
}

/** Une mesure avec son historique et ce qu'on en déduit. */
export interface MeasureWithHistory extends Measure {
  entries: MeasureEntry[];
  last: MeasureEntry | null;
  /** Écart avec le relevé d'il y a ~2 semaines. null si pas assez de données. */
  delta: number | null;
  /** true si le prochain relevé est dû (cadence dépassée). */
  due: boolean;
}

export type PracticeCadence = 'daily' | 'weekdays' | 'weekly';

export interface Practice {
  id: string;
  program_id: string | null;
  label: string;
  pourquoi: string | null;
  declencheur: string | null;
  cadence: PracticeCadence;
  target_per_week: number;
  /** Protocole PNL dont la pratique découle, si elle vient d'une séance. */
  protocol_id: string | null;
  active: boolean;
  created_at: string;
}

export interface PracticeLog {
  id: string;
  practice_id: string;
  done_on: string;
  done: boolean;
  note: string | null;
}

/** Une pratique avec sa série et son état du jour. */
export interface PracticeWithProgress extends Practice {
  done_today: boolean;
  /** Jours consécutifs (en ne comptant que les jours attendus). */
  streak: number;
  /** Nombre de fois faite sur les 7 derniers jours. */
  last_7: number;
  /** true si elle est due aujourd'hui et pas encore cochée. */
  due_today: boolean;
  /** true si elle a décroché : attendue mais pas faite depuis 3 jours ou plus. */
  slipping: boolean;
  logs: PracticeLog[];
}

export interface ProtocolRun {
  id: string;
  session_id: string | null;
  protocol_id: string;
  sujet: string | null;
  resultat: string | null;
  intensite_avant: number | null;
  intensite_apres: number | null;
  revisit_at: string | null;
  revisited: boolean;
  revisit_note: string | null;
  ran_at: string;
}

export type CheckinMoment = 'matin' | 'soir';

export interface Checkin {
  id: string;
  day: string;
  moment: CheckinMoment;
  intention: string | null;
  wins: string[];
  frictions: string[];
  energie: number | null;
  note: string | null;
  coach_reply: string | null;
  created_at: string;
}

/**
 * L'état du suivi à un instant donné. Une seule lecture, utilisée par
 * l'accueil, la page parcours, le superviseur ET le prompt du coach — pour que
 * tout le monde travaille sur la même vérité.
 */
export interface CoachingSnapshot {
  program: Program | null;
  milestones: ProgramMilestone[];
  measures: MeasureWithHistory[];
  practices: PracticeWithProgress[];
  /** Protocoles dont la réévaluation est due. */
  protocolsToRevisit: ProtocolRun[];
  recentRuns: ProtocolRun[];
  checkinToday: { matin: Checkin | null; soir: Checkin | null };
  recentCheckins: Checkin[];
  /** Actions non soldées, extraites des séances récentes. */
  pendingActions: Array<{ text: string; days_ago: number }>;
  derived: {
    /** Semaine en cours du parcours (1-indexée). */
    week: number | null;
    /** Nombre de semaines prévu jusqu'à l'échéance. */
    totalWeeks: number | null;
    milestonesDone: number;
    milestonesTotal: number;
    /** Pratiques dues aujourd'hui et pas encore faites. */
    practicesDueToday: number;
    /** Mesures dont le relevé est dû. */
    measuresDue: number;
    /** Jours consécutifs avec au moins un check-in. */
    checkinStreak: number;
    /** Dernière séance, en jours. null si aucune. */
    daysSinceLastSession: number | null;
  };
}
