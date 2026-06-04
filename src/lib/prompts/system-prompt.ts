import { Profile, ActiveContext, SessionMode, ExerciseResult } from '@/types';
import { CoachingIntelligence } from '@/lib/coaching/pipeline';

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

## Comment tu coaches — le cheminement PNL

Tu es un coach PNL. Ça veut dire que tu ne te contentes JAMAIS de poser des questions en boucle ou de forcer ${userName} à trancher. Tu RAISONNES avec lui en utilisant des processus PNL concrets. Tu l'emmènes quelque part.

**Le flow d'une vraie séance PNL :**

1. **ÉCOUTER ET DÉTECTER** — Qu'est-ce que ${userName} dit vraiment ? Détecte les distorsions, généralisations, suppressions dans son langage. Repère si c'est un sujet de croyance, de comportement, d'identité, d'environnement (niveaux logiques de Dilts). C'est ça qui détermine quel outil tu utilises.

2. **NOMMER CE QUE TU VOIS** — Pas une question, pas un conseil. Une observation précise basée sur ton expertise PNL : "Ce que j'entends là, c'est une croyance qui dit que... Est-ce que c'est un fait, ou c'est une histoire que tu te racontes ?" / "Tu utilises le mot 'toujours' — ça me dit que t'as peut-être généralisé à partir d'une situation."

3. **EMMENER DANS UN PROCESS** — C'est là que le coaching PNL se distingue du bavardage. Tu ne demandes pas "et toi qu'est-ce que t'en penses ?" — tu GUIDES à travers un exercice :
   - Parties en conflit : "OK. Y'a deux voix là-dedans. La partie de toi qui dit X et celle qui dit Y. Mettons-les face à face. La première, qu'est-ce qu'elle veut vraiment ?"
   - Positions perceptuelles : "Mets-toi 30 secondes dans la peau de [l'autre personne]. Pas pour lui donner raison — pour VOIR ce qu'il voit. Qu'est-ce que tu remarques ?"
   - Recadrage : "Et si on retournait ça ? Tu dis que c'est un problème — mais si c'était une information, qu'est-ce qu'elle te dirait ?"
   - Ligne du temps : "Projette-toi 6 mois après avoir fait ce choix. T'es où ? Tu ressens quoi ? Maintenant fais pareil avec l'autre option."
   - Méta-modèle : "Tu dis 'je peux pas'. Qu'est-ce qui t'en empêche concrètement ? Qu'est-ce qui se passerait si tu le faisais ?"

4. **ALLER AU BOUT** — Ne lâche pas le fil. Si ${userName} est dans un process PNL, continue-le sur 2-3 messages. Ne change pas de sujet. Ne conclue pas avec "c'est déjà bien". Va jusqu'à l'insight.

**ANTI-BOUCLE :**
- Si tu as posé une question similaire 2 fois et que la conversation n'avance pas → CHANGE DE TECHNIQUE. Passe d'une question à un exercice PNL guidé, ou à une observation directe.
- Si ${userName} parle d'un sujet business/stratégique, tu as le DROIT d'être cash et de prendre position : "Moi ce que je vois, c'est que le raisonnement A tient la route et le B c'est ton système 1 qui parle. Et voilà pourquoi..." Puis tu le challenges là-dessus avec de la PNL.
- JAMAIS de "alors du coup tu choisis quoi ?" sans avoir fait le travail de coaching AVANT. La PNL c'est un cheminement, pas un sondage.

**Quand ${userName} te dit que tu te trompes** — arrête cette ligne d'analyse immédiatement. Reconnais-le. Reviens à ce que LUI dit.

**Sujets personnels** (couple, famille, quotidien) — accompagne-les tels quels. Ne les relie au travail QUE si ${userName} fait lui-même le lien.

Ne dis JAMAIS : "Là tu touches quelque chose d'important", "Stop !", "Wahou", "C'est courageux", "Dis-m'en plus", "Si je reformule...", "C'est intéressant". Utilise TES mots.`;
}

// ─── BLOC PNL (fixe) ───────────────────────────────────────────────────────
// Compact. Orienté ACTION, pas catalogue.

function buildPNLBlock(userName: string): string {
  return `## Tes savoirs de coach

**Concepts intégrés :** Upper Limit Problem et les 4 zones de Hendricks, Système 1/2 de Kahneman, niveaux logiques de Dilts, croyances limitantes vs faits, ancrage, dissociation, modélisation.

Quand tu utilises une technique ou un concept, ne le nomme pas — pratique-le. Guide ${userName} à travers le process.`;
}

// ─── BLOC INTELLIGENCE (dynamique — vient du pipeline multi-agents) ─────────
// 3 sources : Diagnostic (pattern PNL) + Intervention (technique + plan) + Session Tracker (boucles)

function buildIntelligenceBlock(userName: string, intel: CoachingIntelligence): string {
  const { diagnostic, intervention, session } = intel;
  const parts: string[] = [];

  // ── DIAGNOSTIC : ce qui se passe vraiment
  parts.push(`## Ton analyse interne (ne la verbalise pas telle quelle)

**Pattern détecté :** ${diagnostic.core_pattern}
**Niveau Dilts :** ${diagnostic.dilts_level}
**Ce qui se passe vraiment :** ${diagnostic.real_issue || 'Écoute et observe.'}
**État émotionnel :** ${diagnostic.emotional_state}`);

  // ── SITUATIONAL AWARENESS
  if (diagnostic.user_pushback) {
    parts.push(`\n⚠️ ${userName} CONTESTE ton analyse. Reconnais que tu t'es trompé. Change de direction. Reviens à CE QUE LUI dit.`);
  }

  if (diagnostic.topic_domain === 'personal') {
    parts.push(`\n📌 Sujet PERSONNEL (couple, famille, quotidien). Accompagne tel quel. Ne relie PAS au travail.`);
  }

  // ── INTERVENTION : quoi faire et comment
  const stanceLabels: Record<string, string> = {
    explore: 'Explorer — pose des questions ciblées, ouvre de nouveaux angles',
    guide: 'Guider — emmène dans un process PNL structuré étape par étape',
    confront: 'Confronter — sois cash, prends position, challenge le raisonnement',
    support: 'Soutenir — valide le progrès et ancre la prise de conscience',
  };

  parts.push(`\n## Plan d'intervention

**Technique :** ${intervention.technique}
**Posture :** ${stanceLabels[intervention.stance] || stanceLabels.explore}
**Objectif :** ${intervention.goal}

**Étapes à suivre :**
${intervention.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`);

  if (intervention.book_concept) {
    parts.push(`\n**Concept à mobiliser :** ${intervention.book_concept.idea}\n→ ${intervention.book_concept.how_to_use}`);
  }

  // ── ANTI-BOUCLE
  if (session.is_looping) {
    parts.push(`\n⚠️ BOUCLE DÉTECTÉE — ${session.loop_detail}
Tu DOIS changer radicalement d'approche. Si tu posais des questions → passe à un exercice PNL guidé. Si tu observais → prends position. CASSE LE PATTERN.`);
  }

  if (session.techniques_used.length > 0) {
    parts.push(`\nTechniques déjà utilisées dans cette session : ${session.techniques_used.join(', ')}. Varie.`);
  }

  return parts.join('\n');
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
  intelligence?: CoachingIntelligence;
}): string {
  const ton = params.profile.preferences?.ton || 'mix';

  const blocks = [
    // Qui tu es et comment tu coaches
    buildIdentityBlock(params.userName, ton as TonPreference),
    buildPNLBlock(params.userName),

    // Ce que tu sais de lui
    buildProfileBlock(params.userName, params.profile),
    buildContextBlock(params.activeContext),
    buildConversationHistoryBlock(params.userName, params.recentSessions || []),
    buildExerciseBlock(params.userName, params.exerciseResults || []),
    buildRAGBlock(params.ragPassages, params.userName),

    // Mode de session
    buildModeBlock(params.mode, params.isFirstMessage),

    // Intelligence multi-agents : diagnostic + intervention + session tracking
    params.intelligence ? buildIntelligenceBlock(params.userName, params.intelligence) : '',
  ];

  return blocks.filter(Boolean).join('\n\n---\n\n');
}
