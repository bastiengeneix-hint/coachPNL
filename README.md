# Inner Coach

Application de coaching personnel — Journal & Deblocage emotionnel.

Mobile-first, glassmorphism chaud, multi-utilisateurs. Utilise Claude (Anthropic) comme moteur de coaching avec memoire persistante, contexte dynamique et RAG vectoriel.

## Setup

```bash
npm install
cp .env.example .env
# Remplir les cles API dans .env (Anthropic, Supabase, OpenAI, NextAuth)
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Supabase

1. Creer un projet Supabase
2. Executer `src/supabase-schema.sql` dans le SQL Editor
3. Copier les cles dans `.env`

## Architecture

```
src/
  app/
    (auth)/
      login/              # Page de connexion
      register/           # Page d'inscription
    (app)/
      page.tsx            # Ecran d'accueil (2 boutons)
      session/            # Interface de session (chat + voice)
      sessions/           # Historique des sessions
      settings/           # Profil + sources + upload PDF (admin)
      onboarding/         # Wizard 4 etapes (premier lancement)
    api/
      auth/               # NextAuth (login, register)
      coach/              # API route Claude (multi-user)
      sessions/           # CRUD sessions
      profile/            # CRUD profil
      context/            # CRUD contexte actif
      rag/                # Sources + upload PDF (admin)
      onboarding/         # Completion onboarding
  components/
    CoachMessage.tsx       # Bulles de dialogue (glass)
    VoiceInput.tsx         # Dictee vocale (Web Speech API)
    SessionEnd.tsx         # Modal de fin de session
    NavBar.tsx             # Navigation bottom bar (glass)
    Providers.tsx          # SessionProvider NextAuth
    ui/                   # Design system (GlassCard, GradientButton, etc.)
  lib/
    auth/                 # Config NextAuth
    supabase/             # Clients + types Supabase
    memory/               # Store async (API calls)
    prompts/              # System prompt dynamique (5 blocs)
    coach/                # Logique de session
    rag/                  # Pipeline RAG (ingest PDF + retrieve vectoriel)
  types/                  # Types TypeScript
```

## Modes

- **Deblocage** : decharge emotionnelle en temps reel, questions chirurgicales
- **Journal du soir** : rituel nocturne, entree vocale, accompagnement doux

## Fonctionnalites v2

- **Multi-utilisateurs** : auth email/mdp, profils individuels
- **Role admin** : upload PDF, gestion des sources partagees
- **Onboarding** : wizard 4 etapes (prenom, projets, blocages, ton)
- **RAG vectoriel** : PDF -> chunks -> embeddings OpenAI -> pgvector cosinus
- **Design glassmorphism** : palette chaude ambre/rose/corail, fond anime

## Stack

- Next.js 16 + TypeScript + Tailwind CSS 4
- Claude Sonnet (API Anthropic)
- NextAuth.js (email/mdp, JWT)
- Supabase (PostgreSQL + pgvector + Storage)
- OpenAI text-embedding-3-small (embeddings RAG)
- Web Speech API (dictee vocale)
- PWA (installable sur mobile)
