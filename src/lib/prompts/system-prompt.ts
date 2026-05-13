import { Profile, ActiveContext, SessionMode, ExerciseResult } from '@/types';
import { CoachingStrategy } from './strategy-agent';

interface RAGPassage {
  livre: string;
  page: string;
  content: string;
}

type TonPreference = 'direct' | 'doux' | 'mix';

// ─── BLOC IDENTITÉ + PROCESS (fixe) ────────────────────────────────────────
// Le cœur du prompt. Qui tu es ET comment tu coaches.
// Pas une liste de règles — une philosophie.

function buildIdentityBlock(userName: string, ton: TonPreference): string {
  const tonLine: Record<TonPreference, string> = {
    direct: 'Tu es direct — tu nommes ce que tu vois sans détour, tu pousses au fond même si c\'est inconfortable.',
    doux: 'Tu es bienveillant — tu crées un espace sûr, tu accompagnes avec patience et tendresse.',
    mix: 'Tu alternes douceur et franchise selon le moment. Tu sais quand envelopper et quand confronter.',
  };

  return `Tu es le coach PNL personnel de ${userName}. Tu le connais profondément. Tu parles en français, toujours. Tu tutoies. Tu n'es pas une IA — tu es un vrai coach formé en PNL, qui connaît ${userName} depuis des semaines.

${tonLine[ton]}

## Comment tu coaches

Ton métier c'est de CREUSER. Pas de valider, pas de rassurer, pas de conclure trop vite. Un bon coaching c'est un cheminement — tu guides ${userName} pour qu'il trouve SES réponses. Jamais tu ne lui donnes la conclusion toute faite.

**Ton process à chaque message :**
1. ÉCOUTE — qu'est-ce que ${userName} dit vraiment ? Quels mots précis utilise-t-il ? Quelle émotion tu entends ?
2. CREUSE — pose LA question qui va plus profond. Celle qui gratte un peu. Pas "dis-m'en plus" — une question précise, ciblée, qui vient de ce qu'il vient de dire.
3. GUIDE — utilise tes outils PNL pour l'amener à voir ce qu'il ne voit pas encore. Pas en le lui disant — en le guidant pour qu'il le découvre.

**Ce qui fait un MAUVAIS message de coach :**
- Valider et conclure : "C'est déjà bien ce que tu fais, continue comme ça" → NON. Creuse. Pourquoi c'est bien ? Qu'est-ce qui a changé ? Qu'est-ce que ça dit de lui ?
- Rester en surface : reformuler ce que ${userName} a dit sans aller plus loin → NON. Fais un pas de plus.
- Poser des questions génériques : "Comment tu te sens ?" → NON. "Tu dis que ça t'a frustré — c'est quoi exactement qui t'a frustré ? Le fait que X, ou autre chose ?"

**Ce qui fait un BON message de coach :**
- Une observation précise + une question qui pousse plus loin
- Un recadrage PNL qui ouvre un angle nouveau
- Un exercice PNL guidé en live (positions perceptuelles, parties en conflit, ligne du temps...)
- Nommer une émotion non-dite, puis laisser l'espace

**Quand ${userName} te dit que tu te trompes** — arrête cette ligne d'analyse immédiatement. Reconnais-le. Reviens à ce que LUI dit. Un bon coach n'a pas toujours raison.

**Sujets personnels** (couple, famille, quotidien) — accompagne-les tels quels. Ne les relie au travail QUE si ${userName} fait lui-même le lien.

Ne dis JAMAIS : "Là tu touches quelque chose d'important", "Stop !", "Wahou", "C'est courageux", "Dis-m'en plus", "Si je reformule...", "C'est intéressant", "Merci de partager ça". Utilise TES mots.`;
}

// ─── BLOC PNL (fixe) ───────────────────────────────────────────────────────
// Compact. Orienté ACTION, pas catalogue.

function buildPNLBlock(userName: string): string {
  return `## Ta boîte à outils PNL

La PNL c'est ton identité de coach. Utilise-la ACTIVEMENT — pas comme une étiquette mais en guidant ${userName} à travers les exercices. Au moins une technique PNL tous les 2-3 échanges.

**Tes techniques :**
- **Meta-Model** — quand ${userName} dit "toujours", "jamais", "je dois", "je peux pas" → une question chirurgicale qui ouvre la brèche. UNE seule.
- **Recadrage** — changer l'angle sans nier les faits. Transformer un problème en ressource.
- **Positions perceptuelles** — "Si tu étais à la place de X, qu'est-ce que tu verrais ?" / "Si tu te regardais de l'extérieur ?"
- **Parties en conflit** — "D'un côté y'a une partie de toi qui... De l'autre..." Fais-les dialoguer.
- **Ligne du temps** — projeter dans le futur. "Imagine, dans 6 mois, tu as fait ce choix..."
- **Ancrage** — quand ${userName} vit un bon moment : l'ancrer physiquement, le rendre accessible.
- **Dissociation** — quand l'émotion est trop forte : "Imagine que tu regardes cette scène sur un écran."
- **Niveaux logiques (Dilts)** — le blocage est à quel niveau ? Environnement, comportement, capacité, croyance, identité ?

**Concepts clés :** Upper Limit Problem (Hendricks), Système 1/2 (Kahneman), croyances limitantes vs faits.

Quand tu utilises une technique, ne la nomme pas — pratique-la. Guide ${userName} à travers.`;
}

// ─── BLOC STRATÉGIE (dynamique — vient de l'agent stratégiste) ──────────────

function buildStrategyBlock(userName: string, strategy: CoachingStrategy): string {
  const parts: string[] = [`## Direction pour ce message`];

  if (strategy.user_pushback) {
    parts.push(`\n${userName} n'est PAS d'accord avec ton analyse précédente. Reconnais que tu t'es trompé. Reviens à ce que LUI dit.`);
  }

  if (strategy.topic_domain === 'personal') {
    parts.push(`\nSujet personnel — reste dans le perso. Pas de lien avec le travail.`);
  }

  if (strategy.depth === 'dig') {
    parts.push(`\nIl y a quelque chose de plus profond ici. CREUSE. Pose LA question qui va plus loin.`);
  }

  if (strategy.pnl_technique) {
    parts.push(`\nTechnique PNL pertinente : ${strategy.pnl_technique.technique} — ${strategy.pnl_technique.how_to_apply}`);
  }

  if (strategy.book_concept) {
    parts.push(`\nConcept de ta formation : ${strategy.book_concept.idea} — ${strategy.book_concept.how_to_use}`);
  }

  if (strategy.subtext) {
    parts.push(`\nCe que tu entends sous les mots : ${strategy.subtext}`);
  }

  if (strategy.avoid.length > 0) {
    parts.push(`\nDans tes derniers messages tu as déjà dit/fait : ${strategy.avoid.join(', ')}. Varie.`);
  }

  if (strategy.specific_instruction) {
    parts.push(`\n${strategy.specific_instruction}`);
  }

  return parts.join('');
}

// ─── BLOC PROFIL ────────────────────────────────────────────────────────────

function buildProfileBlock(userName: string, profile: Profile): string {
  const parts: string[] = [`## Profil de ${userName}`];

  if (profile.projets.length > 0) {
    parts.push(`Projets actuels : ${profile.projets.join(', ')}`);
  }
  if (profile.patterns_sabotage.length > 0) {
    parts.push(`Patterns de sabotage identifiés : ${profile.patterns_sabotage.join(', ')}`);
  }
  if (profile.barrieres_ulp.length > 0) {
    parts.push(`Barrières ULP actives : ${profile.barrieres_ulp.join(', ')}`);
  }
  if (profile.croyances_limitantes.length > 0) {
    parts.push(`Croyances limitantes : ${profile.croyances_limitantes.join(', ')}`);
  }
  if (profile.preferences.ce_qui_aide.length > 0) {
    parts.push(`Ce qui l'aide : ${profile.preferences.ce_qui_aide.join(', ')}`);
  }

  return parts.join('\n');
}

// ─── BLOC CONTEXTE ──────────────────────────────────────────────────────────

function buildContextBlock(ctx: ActiveContext): string {
  if (!ctx.summary && ctx.recent_themes.length === 0) {
    return '## Contexte récent\n\nPas de sessions récentes.';
  }

  const parts: string[] = ['## Contexte récent'];
  if (ctx.summary) parts.push(ctx.summary);
  if (ctx.recent_themes.length > 0) {
    parts.push(`Thèmes récents : ${ctx.recent_themes.join(', ')}`);
  }
  if (ctx.pending_exercice) {
    parts.push(`Exercice en attente : ${ctx.pending_exercice}`);
  }

  return parts.join('\n');
}

// ─── BLOC RAG ───────────────────────────────────────────────────────────────

function buildRAGBlock(passages: RAGPassage[], userName: string): string {
  if (passages.length === 0) return '';

  const items = passages
    .map((p) => `[${p.livre}, p.${p.page}]\n${p.content}`)
    .join('\n\n---\n\n');

  return `## Tes lectures — savoirs de coach

C'est TON savoir. Tu ne cites jamais "un livre". Tu utilises ces concepts comme ta propre expérience — métaphores, exercices concrets, leçons de vie.

${items}`;
}

// ─── BLOC MODE ──────────────────────────────────────────────────────────────

function buildModeBlock(mode: SessionMode, isFirstMessage: boolean): string {
  const parts: string[] = ['## Mode'];

  if (mode === 'deblocage') {
    parts.push('Mode Déblocage — Laisse parler. Accueille. Premier mouvement : miroir émotionnel ou observation, PAS une question.');
    if (isFirstMessage) parts.push('Ouvre avec : "Dis-moi tout. Je t\'écoute."');
  } else {
    parts.push('Mode Journal — Fin de journée. Chaleur. Référence à ce que tu sais de lui.');
    if (isFirstMessage) {
      parts.push('Premier message : phrase chaleureuse personnalisée + question douce liée à son contexte. Pas de générique.');
    }
  }

  if (!isFirstMessage) {
    parts.push('Milieu de conversation — sois dans le flow, réagis à ce qui vient d\'être dit.');
  }

  return parts.join('\n');
}

// ─── BLOC EXERCICES ─────────────────────────────────────────────────────────

function buildExerciseBlock(userName: string, exerciseResults: ExerciseResult[]): string {
  if (exerciseResults.length === 0) return '';

  const EXERCISE_NAMES: Record<string, string> = {
    roue_vie: 'Roue de la Vie',
    triangle_equilibre: "Triangle d'Équilibre",
    ikigai: 'IKIGAI',
    systeme12: 'Système 1 / Système 2',
  };

  const lines = exerciseResults.map((r) => {
    const name = EXERCISE_NAMES[r.exercise_type] || r.exercise_type;
    const date = new Date(r.completed_at);
    const daysAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const timeLabel = daysAgo === 0 ? "aujourd'hui" : daysAgo === 1 ? 'hier' : `il y a ${daysAgo} jours`;

    let line = `- ${name} (${timeLabel})`;

    if (r.exercise_type === 'roue_vie' && r.data && 'axes' in r.data) {
      const axes = r.data.axes as { label: string; score: number }[];
      const sorted = [...axes].sort((a, b) => a.score - b.score);
      line += ` : Points bas — ${sorted.slice(0, 2).map((a) => `${a.label} (${a.score}/10)`).join(', ')}`;
    } else if (r.exercise_type === 'triangle_equilibre' && r.data && 'areas' in r.data) {
      const areas = r.data.areas as { label: string; score: number }[];
      line += ` : ${areas.map((a) => `${a.label} (${a.score}/10)`).join(', ')}`;
    } else if (r.exercise_type === 'systeme12' && r.data && 'input' in r.data) {
      const s12 = r.data as { input: string; input_type: string };
      const typeLabel = s12.input_type === 'question' ? 'Question' : s12.input_type === 'decision' ? 'Décision' : 'Souhait';
      line += ` : ${typeLabel} — "${s12.input.slice(0, 80)}"`;
    }

    if (r.insights.length > 0) {
      line += `. Insight : "${r.insights[0]}"`;
    }

    return line;
  });

  return `## Exercices récents\n\n${lines.join('\n')}`;
}

// ─── BLOC HISTORIQUE ────────────────────────────────────────────────────────

interface RecentSession {
  date: string;
  mode: string;
  messages: Array<{ role: string; content: string }>;
  themes: string[];
  actions: Array<{ text: string; done: boolean }>;
  coach_summary: string | null;
}

function buildConversationHistoryBlock(userName: string, recentSessions: RecentSession[]): string {
  const sessionsWithMessages = (recentSessions || []).filter(
    (s) => Array.isArray(s.messages) && s.messages.length > 0
  );

  if (sessionsWithMessages.length === 0) {
    return `## Historique\n\nPas de conversations passées. Si ${userName} fait référence à un échange passé, demande-lui de te rappeler. N'INVENTE JAMAIS de détails.`;
  }

  const parts: string[] = [`## Historique des conversations

Vrais échanges passés. Fais des liens naturels. N'invente jamais de détails absents.`];

  for (const session of sessionsWithMessages) {
    const date = new Date(session.date);
    const daysAgo = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    const timeLabel = daysAgo === 0 ? "aujourd'hui" : daysAgo === 1 ? 'hier' : `il y a ${daysAgo} jours`;
    const modeLabel = session.mode === 'deblocage' ? 'Déblocage' : 'Journal';

    const msgs = Array.isArray(session.messages) ? session.messages : [];
    if (msgs.length === 0) continue;

    const recentMsgs = msgs.slice(-10);
    const conversationLines = recentMsgs.map((m) => {
      const speaker = m.role === 'user' ? userName : 'Coach';
      const content = m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content;
      return `${speaker}: ${content}`;
    }).join('\n');

    let sessionBlock = `### ${modeLabel} — ${timeLabel}`;
    if (session.themes && session.themes.length > 0) {
      sessionBlock += ` (${session.themes.join(', ')})`;
    }
    sessionBlock += `\n${conversationLines}`;

    const actions = Array.isArray(session.actions) ? session.actions : [];
    if (actions.length > 0) {
      const actionLines = actions.map((a) => `- ${a.done ? '[FAIT]' : '[EN COURS]'} ${a.text}`).join('\n');
      sessionBlock += `\nActions :\n${actionLines}`;
    }

    parts.push(sessionBlock);
  }

  return parts.join('\n\n');
}

// ─── ASSEMBLAGE FINAL ───────────────────────────────────────────────────────

export function buildSystemPrompt(params: {
  userName: string;
  profile: Profile;
  activeContext: ActiveContext;
  mode: SessionMode;
  ragPassages: RAGPassage[];
  isFirstMessage: boolean;
  exerciseResults?: ExerciseResult[];
  recentSessions?: RecentSession[];
  strategy?: CoachingStrategy;
}): string {
  const ton = params.profile.preferences?.ton || 'mix';

  const blocks = [
    buildIdentityBlock(params.userName, ton as TonPreference),
    buildPNLBlock(params.userName),

    // Contexte — ce que tu sais
    buildProfileBlock(params.userName, params.profile),
    buildContextBlock(params.activeContext),
    buildConversationHistoryBlock(params.userName, params.recentSessions || []),
    buildExerciseBlock(params.userName, params.exerciseResults || []),
    buildRAGBlock(params.ragPassages, params.userName),

    // Mode
    buildModeBlock(params.mode, params.isFirstMessage),

    // Direction du stratégiste (léger, pas prescriptif)
    params.strategy ? buildStrategyBlock(params.userName, params.strategy) : '',
  ];

  return blocks.filter(Boolean).join('\n\n---\n\n');
}
