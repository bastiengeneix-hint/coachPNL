# Inner Coach

Application de coaching personnel — Journal & Deblocage emotionnel.

Mobile-first, sombre, minimaliste. Utilise Claude (Anthropic) comme moteur de coaching avec memoire persistante et contexte dynamique.

## Setup

```bash
npm install
cp .env.example .env
# Ajouter ta cle API Anthropic dans .env
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
  app/
    page.tsx          # Ecran d'accueil (2 boutons)
    session/          # Interface de session (chat + voice)
    sessions/         # Historique des sessions
    settings/         # Profil + sources
    api/coach/        # API route Claude
  components/
    CoachMessage.tsx   # Bulles de dialogue
    VoiceInput.tsx     # Dictee vocale (Web Speech API)
    SessionEnd.tsx     # Modal de fin de session
  lib/
    memory/           # Memoire persistante (localStorage + fichiers)
    prompts/          # System prompt dynamique (5 blocs)
    coach/            # Logique de session
    rag/              # Retrieval de passages (sources)
  types/              # Types TypeScript
```

## Modes

- **Deblocage** : decharge emotionnelle en temps reel, questions chirurgicales
- **Journal du soir** : rituel nocturne, entree vocale, accompagnement doux

## Stack

- Next.js 16 + TypeScript + Tailwind CSS
- Claude Sonnet (API Anthropic)
- Web Speech API (dictee vocale)
- localStorage (persistence locale, privacy-first)
- PWA (installable sur mobile)
