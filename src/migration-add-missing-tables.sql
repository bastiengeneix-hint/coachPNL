-- Migration: Add missing tables and columns
-- Run this in Supabase SQL Editor if your database was created from the old schema

-- 1. Add missing columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS coach_summary TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '[]';

-- 2. Create exercise_results table
CREATE TABLE IF NOT EXISTS exercise_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  insights TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create exercise_reminders table
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

-- 4. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create bilans table
CREATE TABLE IF NOT EXISTS bilans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Add indexes
CREATE INDEX IF NOT EXISTS idx_exercise_results_user ON exercise_results(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_reminders_next ON exercise_reminders(user_id, next_reminder_at)
  WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_bilans_user_period ON bilans(user_id, period_start DESC);

-- 7. Enable RLS on new tables
ALTER TABLE exercise_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bilans ENABLE ROW LEVEL SECURITY;

-- 8. RLS policies (users can only access their own data)
CREATE POLICY "Users can manage their own exercise_results"
  ON exercise_results FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own exercise_reminders"
  ON exercise_reminders FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own push_subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own bilans"
  ON bilans FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
