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

**Base deja creee ?** Executer `src/migration-add-missing-tables.sql` : il est idempotent et
rattrape les colonnes ajoutees apres coup (`sessions.ended`, `exercise_reminders.message`).
Sans `sessions.ended`, aucune seance ne peut etre sauvegardee ; sans `exercise_reminders.message`,
aucun rappel d'exercice ne peut etre cree.

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
    ai/                   # IDs de modeles centralises + parsing JSON des reponses
    auth/                 # Config NextAuth
    supabase/             # Clients + types Supabase
    memory/               # Store async (API calls) + evolution du profil
    pnl/                  # Bibliotheque de protocoles PNL (15 protocoles, etape par etape)
    prompts/              # Prompt systeme (bloc stable + bloc contextuel) + superviseur
    coach/                # Arc de seance, filet de securite, analyse de seance
    rag/                  # Pipeline RAG (ingest PDF + retrieve vectoriel)
  types/                  # Types TypeScript
```

## Le coach

Chaque message passe par trois etages. Le detail est dans le code, voici la carte.

**1. Superviseur** — `lib/prompts/strategy-agent.ts` (Haiku, rapide)
Il lit la conversation dans l'ordre, la phase de seance, les engagements non soldes et les
passages de lecture trouves par le RAG. Il ne parle jamais au coache : il rend une consigne
(`move`, `length`, `tone`, protocole PNL + etape, objectif de seance, mots exacts a reprendre,
intensite emotionnelle, niveau de risque, patterns a eviter).

**2. Prompt systeme** — `lib/prompts/system-prompt.ts`
Deux parties. La partie **stable** (identite, voix, posture, formation PNL, limite du role) ne
change pas d'un message a l'autre : elle est mise en cache cote API. La partie **contextuelle**
(profil, historique reel, engagements, lectures, phase, protocole en cours, consigne) est
reconstruite a chaque tour.

**3. Coach** — `app/api/coach/route.ts` (Sonnet)
Il parle. Sa longueur maximale est calee sur la consigne du superviseur.

Trois briques transverses :

- **Protocoles PNL** (`lib/pnl/protocols.ts`) : 15 protocoles decoupes en etapes (objectif bien
  formule, ancrage, recadrage en six pas, parties en conflit, positions de perception, ligne du
  temps, sous-modalites, swish, niveaux logiques, SCORE, croyance limitante, Upper Limit Problem,
  pont vers le futur...). Le superviseur en choisit un, le coach n'en recoit qu'un seul et le
  conduit **une etape par message**, sans jamais le nommer.
- **Arc de seance** (`lib/coach/session-arc.ts`) : ouverture → cadrage → exploration → travail →
  atterrissage → cloture, calcule sans modele a partir du nombre d'echanges et du temps ecoule.
  C'est ce qui empeche une seance de s'arreter sans rien de concret.
- **Filet de securite** (`lib/coach/safety.ts`) : detection en deux temps (filtre local + jugement
  du superviseur, le plus grave gagne). En detresse, aucune technique. En crise, le coach lache
  tout, reste present et oriente vers de l'aide humaine (3114, 15, 112).

Le coach peut aussi proposer un exercice de l'app en collant un marqueur `[[exercice:roue_vie]]`
dans son message : `components/CoachMessage.tsx` le transforme en bouton et le retire du texte lu
par la synthese vocale.

## Modes

- **Deblocage** : decharge emotionnelle en temps reel, questions chirurgicales
- **Journal du soir** : rituel nocturne, entree vocale, accompagnement doux

## Memoire

- **Fin de seance** : l'analyse extrait insights, themes, actions, exercice propose, et fait evoluer
  le profil (croyances, patterns, projets, barrieres ULP, lexique — les mots que l'utilisateur
  emploie pour se decrire, que le coach reprend tels quels).
- **Seances abandonnees** : une seance quittee sans cliquer sur « Terminer » est rattrapee au
  chargement de l'accueil (`POST /api/sessions/sweep`), analysee puis refermee. Avant, tout ce qui
  n'etait pas proprement termine etait perdu.
- **Engagements** : les actions non faites des 14 derniers jours sont injectees dans le prompt, et
  le superviseur decide quand le coach demande ou ca en est.

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
