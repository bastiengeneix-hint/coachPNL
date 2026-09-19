-- Inner Coach v2 - Supabase Schema
-- Run this SQL in the Supabase SQL editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  projets TEXT[] NOT NULL DEFAULT '{}',
  patterns_sabotage TEXT[] NOT NULL DEFAULT '{}',
  barrieres_ulp TEXT[] NOT NULL DEFAULT '{}',
  croyances_limitantes TEXT[] NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{"ce_qui_aide": [], "ce_qui_bloque": [], "ton": "mix"}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_user_id_unique UNIQUE (user_id)
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  mode TEXT NOT NULL CHECK (mode IN ('deblocage', 'journal')),
  messages JSONB NOT NULL DEFAULT '[]',
  insights JSONB NOT NULL DEFAULT '[]',
  themes TEXT[] NOT NULL DEFAULT '{}',
  exercice_propose TEXT,
  exercice_fait BOOLEAN NOT NULL DEFAULT false,
  summary TEXT,
  coach_summary TEXT,
  actions JSONB NOT NULL DEFAULT '[]',
  -- false = séance en cours (reprenable), true = séance refermée et analysée.
  ended BOOLEAN NOT NULL DEFAULT false
);

-- Active contexts table (one per user)
CREATE TABLE active_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  recent_themes TEXT[] NOT NULL DEFAULT '{}',
  pending_exercice TEXT,
  CONSTRAINT active_contexts_user_id_unique UNIQUE (user_id)
);

-- Sources table (RAG knowledge base books/documents)
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  auteur TEXT NOT NULL,
  domaine TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  chunks_count INTEGER NOT NULL DEFAULT 0,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunks table (RAG document chunks with embeddings)
CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_start INTEGER,
  page_end INTEGER,
  chapitre TEXT,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exercise results table
CREATE TABLE exercise_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  insights TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exercise reminders table
CREATE TABLE exercise_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  exercise_description TEXT NOT NULL,
  message TEXT,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  next_reminder_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bilans table (weekly/monthly/yearly reviews)
CREATE TABLE bilans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Sessions: lookup by user and date
CREATE INDEX idx_sessions_user_date ON sessions(user_id, date DESC);

-- Chunks: lookup by source
CREATE INDEX idx_chunks_source ON chunks(source_id);

-- Chunks: HNSW index for fast vector similarity search
CREATE INDEX idx_chunks_embedding ON chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Users: email lookup
CREATE INDEX idx_users_email ON users(email);

-- Exercise results: lookup by user
CREATE INDEX idx_exercise_results_user ON exercise_results(user_id, completed_at DESC);

-- Exercise reminders: lookup for pending reminders
CREATE INDEX idx_exercise_reminders_next ON exercise_reminders(user_id, next_reminder_at)
  WHERE completed = false;

-- Bilans: lookup by user and period
CREATE INDEX idx_bilans_user_period ON bilans(user_id, period_start DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- match_chunks: RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  source_id UUID,
  content TEXT,
  page_start INTEGER,
  page_end INTEGER,
  chapitre TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.source_id,
    c.content,
    c.page_start,
    c.page_end,
    c.chapitre,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  INNER JOIN sources s ON s.id = c.source_id
  WHERE s.active = true
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- LE SUIVI (parcours, mesures, pratiques, protocoles, check-ins)
-- Voir README « Le parcours ». Le meme DDL est rejouable via src/migration.sql.
-- ============================================

-- ─── 2. LE PARCOURS — la colonne vertébrale du suivi ────────────────────────
-- Un parcours actif par utilisateur : l'objectif bien formulé, l'état présent,
-- l'état désiré, l'échéance. Tout le reste (mesures, pratiques, protocoles)
-- s'accroche dessus. Sans ça, une app de coaching n'est qu'une suite de
-- conversations agréables.

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objectif TEXT NOT NULL,
  pourquoi_maintenant TEXT,
  etat_present TEXT,
  etat_desire TEXT,
  criteres_reussite TEXT[] NOT NULL DEFAULT '{}',
  echeance DATE,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'atteint', 'abandonne', 'en_pause')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  bilan_final TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un seul parcours actif à la fois : c'est une contrainte de méthode, pas technique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_one_active
  ON programs(user_id) WHERE statut = 'actif';

CREATE TABLE IF NOT EXISTS program_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  target_date DATE,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_program ON program_milestones(program_id, ordre);

-- ─── 3. MESURES — rendre la transformation visible ──────────────────────────
-- 2 à 4 indicateurs subjectifs, nommés AVEC SES MOTS, relevés régulièrement.
-- C'est ce qui permet de dire « il y a trois semaines t'étais à 3, t'es à 6 ».

CREATE TABLE IF NOT EXISTS measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  question TEXT,
  direction TEXT NOT NULL DEFAULT 'up' CHECK (direction IN ('up', 'down')),
  baseline INTEGER CHECK (baseline BETWEEN 0 AND 10),
  cible INTEGER CHECK (cible BETWEEN 0 AND 10),
  cadence_days INTEGER NOT NULL DEFAULT 7,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measures_user ON measures(user_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS measure_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_id UUID NOT NULL REFERENCES measures(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value BETWEEN 0 AND 10),
  note TEXT,
  source TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app', 'session', 'checkin')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_measure_entries ON measure_entries(measure_id, recorded_at DESC);

-- ─── 4. PRATIQUES QUOTIDIENNES — là où la PNL agit vraiment ─────────────────
-- Un ancrage se consolide par répétition, pas par une séance. 1 à 3
-- micro-pratiques ancrées dans le réel, cochées depuis l'accueil.

CREATE TABLE IF NOT EXISTS practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  pourquoi TEXT,
  declencheur TEXT,
  cadence TEXT NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily', 'weekdays', 'weekly')),
  target_per_week INTEGER NOT NULL DEFAULT 7,
  protocol_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_practices_user ON practices(user_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS practice_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  done_on DATE NOT NULL DEFAULT CURRENT_DATE,
  done BOOLEAN NOT NULL DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT practice_logs_unique UNIQUE (practice_id, done_on)
);

CREATE INDEX IF NOT EXISTS idx_practice_logs ON practice_logs(user_id, done_on DESC);

-- ─── 5. PROTOCOLES CONDUITS — un protocole non retesté ne tient pas ─────────
-- Doctrine PNL : on teste, on fait un pont vers le futur, puis on RÉÉVALUE.
-- `revisit_at` est ce qui fait revenir le coach dessus une semaine plus tard.

CREATE TABLE IF NOT EXISTS protocol_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  protocol_id TEXT NOT NULL,
  sujet TEXT,
  resultat TEXT,
  intensite_avant INTEGER CHECK (intensite_avant BETWEEN 0 AND 10),
  intensite_apres INTEGER CHECK (intensite_apres BETWEEN 0 AND 10),
  revisit_at DATE,
  revisited BOOLEAN NOT NULL DEFAULT false,
  revisit_note TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_protocol_runs_user ON protocol_runs(user_id, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_protocol_runs_revisit
  ON protocol_runs(user_id, revisit_at) WHERE revisited = false;

-- ─── 6. CHECK-IN QUOTIDIEN — 60 secondes, pas une conversation ──────────────

CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  moment TEXT NOT NULL CHECK (moment IN ('matin', 'soir')),
  intention TEXT,
  wins TEXT[] NOT NULL DEFAULT '{}',
  frictions TEXT[] NOT NULL DEFAULT '{}',
  energie INTEGER CHECK (energie BETWEEN 0 AND 10),
  note TEXT,
  coach_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT checkins_unique UNIQUE (user_id, day, moment)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id, day DESC);

-- ============================================
-- RLS — PARCOURS
-- ============================================

ALTER TABLE programs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE measures           ENABLE ROW LEVEL SECURITY;
ALTER TABLE measure_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins           ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS programs_updated_at ON programs;
CREATE TRIGGER programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── 9. LE FIL ROUGE — les idées de ses livres, choisies pour SON travail ───
-- Ajouté le 2026-09-19. Avant, les livres étaient interrogés à chaque message
-- et le coach plaquait le passage qui remontait. Ici on garde une poignée
-- d'idées, choisies en fin de séance selon l'objectif et les thèmes réels,
-- et on sait lesquelles ont déjà été transmises — donc plus de radotage, et
-- une continuité d'une séance à l'autre.

CREATE TABLE IF NOT EXISTS coach_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  idee TEXT NOT NULL,
  pourquoi TEXT,
  comment_utiliser TEXT,
  theme TEXT,
  transmise_le TIMESTAMPTZ,
  fois_utilisee INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coach_insights_user ON coach_insights(user_id, created_at DESC);

ALTER TABLE coach_insights ENABLE ROW LEVEL SECURITY;
