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
  summary TEXT
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
