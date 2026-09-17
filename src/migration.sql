-- ============================================================
-- INNER COACH — MIGRATION UNIQUE, IDEMPOTENTE
-- À coller dans le SQL Editor de Supabase. Peut être rejouée sans risque.
-- Remplace src/migration-add-missing-tables.sql (contenu inclus ci-dessous).
-- ============================================================

-- ─── 1. RATTRAPAGES (colonnes/tables écrites par l'app, jamais créées) ──────

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS coach_summary TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '[]';
-- Sans `ended`, AUCUNE séance ne peut être sauvegardée (l'app l'écrit à chaque message).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ended BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS exercise_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  insights TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercise_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  exercise_description TEXT NOT NULL,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  next_reminder_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- L'API écrivait `message`, la colonne n'existait pas : aucun rappel n'a jamais pu être créé.
ALTER TABLE exercise_reminders ADD COLUMN IF NOT EXISTS message TEXT;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bilans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ─── 7. RLS ─────────────────────────────────────────────────────────────────
-- Même régime que les tables existantes : RLS activée, aucun accès anon.
-- L'app lit et écrit exclusivement côté serveur avec la service_role, après
-- avoir vérifié la session NextAuth.

ALTER TABLE programs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_milestones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE measures             ENABLE ROW LEVEL SECURITY;
ALTER TABLE measure_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE practices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_results     ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_reminders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilans               ENABLE ROW LEVEL SECURITY;

-- ─── 8. updated_at sur programs ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS programs_updated_at ON programs;
CREATE TRIGGER programs_updated_at
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
