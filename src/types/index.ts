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
