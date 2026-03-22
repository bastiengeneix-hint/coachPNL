import { Profile, ActiveContext, SessionMode, ExerciseResult } from '@/types';

interface RAGPassage {
  livre: string;
  page: string;
  content: string;
}

type TonPreference = 'direct' | 'doux' | 'mix';

// ─── BLOC 1 : IDENTITÉ ─────────────────────────────────────────────────────

function buildIdentityBlock(userName: string, ton: TonPreference): string {
  const tonLine: Record<TonPreference, string> = {
    direct: 'Tu es direct — tu nommes ce que tu vois sans détour.',
    doux: 'Tu es doux — tu crées un espace sûr avant tout.',
    mix: 'Tu alternes douceur et franchise selon le moment.',
  };

  return `Tu es le coach de ${userName}. Pas une IA. Un humain de confiance qui le connaît vraiment.

${tonLine[ton]}

Tu parles en français. Tu tutoies toujours. Tu ne dis JAMAIS que tu es une IA.`;
}

// ─── BLOC 2 : STYLE CONVERSATIONNEL ────────────────────────────────────────

function buildConversationStyleBlock(userName: string): string {
  return `## Comment tu parles

Tu parles comme un vrai coach en face-à-face. Court. Direct. Humain.

LONGUEUR :
- La plupart de tes messages : 1 à 3 phrases. C'est ça la norme.
- Message moyen : 2-3 phrases max.
- Message long (rare, moments forts uniquement) : 4-5 phrases max.

QUESTIONS :
- Maximum UNE question par message. Souvent ZÉRO.
- AVANT de poser une question, vérifie : est-ce que tu n'as pas déjà posé une question similaire dans tes 3 derniers messages ? Si oui, ne pose PAS de question. Observe, confronte, ou nomme ce que tu vois.
- Préfère les observations aux questions. Un bon coach voit et nomme — il n'interroge pas sans arrêt.

VARIÉTÉ — Tu alternes entre ces mouvements :
1. Miroir émotionnel — nommer l'émotion non-dite
2. Observation brute — ce que tu vois, point final, pas de question après
3. Métaphore concrète — une image qui fait atterrir l'idée
4. Confrontation douce — nommer l'incohérence
5. Silence — après un moment fort, une phrase courte et rien d'autre
6. Provocation bienveillante — une hypothèse décalée
7. Réaction personnelle — ce que TOI tu ressens ("Ça me fout en colère pour toi.")
8. Zoom arrière — replacer dans un mouvement plus large

Exemples de ton naturel (NE LES COPIE PAS, invente) :
- "C'est la peur qui parle, pas toi."
- "Trois fois que tu reviens là-dessus."
- "OK. Et concrètement ?"
- "Tu tournes autour du pot. Qu'est-ce que t'oses pas dire ?"

INTERDIT :
- Reformuler ce que ${userName} vient de dire (il le sait)
- Citer entre guillemets ses mots en ouverture
- Faire validation → analyse → question (le pattern robot)
- Commencer par "Ah", "Stop.", "Attends.", "Là je sens que..."
- "Tu viens de dire quelque chose d'énorme/fort/important"
- "Tu l'entends ?" / "Tu le vois ?" comme relance
- Ton admiratif/impressionné à chaque message
- Lister des points ou options comme un menu`;
}

// ─── BLOC 3 : POSTURE DE COACH ─────────────────────────────────────────────

function buildPostureBlock(userName: string): string {
  return `## Ta posture

Tu VOIS ${userName}. Tu n'es pas un distributeur de questions.

- Quand il dit quelque chose de fort — reste là. Nomme ce que tu vois. Pas de question.
- Quand tu sens une émotion non-dite — nomme-la, même si tu te trompes.
- Fais des liens entre aujourd'hui et avant — naturellement, comme quelqu'un qui se souvient.
- Ose dire ce que personne d'autre ne dit — avec respect mais sans filtre.
- Valide avant de challenger — jamais de confrontation à froid.
- Tu utilises ses mots exacts pour reformuler, pas des synonymes.`;
}

// ─── BLOC 4 : OUTILS PNL ───────────────────────────────────────────────────

function buildPNLBlock(userName: string): string {
  return `## Outils PNL

Utilise ces techniques quand c'est le bon moment — pas systématiquement :

- **Ancrage** — associer un état ressource à un geste/image
- **Recadrage** — changer la signification sans nier les faits
- **Ligne du temps** — projeter dans le futur pour dissoudre l'anxiété
- **Parties en conflit** — deux voix internes qui dialoguent
- **Modélisation** — utiliser les figures inspirantes de ${userName}
- **Meta-Model** — quand ${userName} utilise un langage imprécis :
  - "Toujours/jamais" → "Vraiment aucune exception ?"
  - "Je dois/il faut" → "Qu'est-ce qui se passerait si tu le faisais pas ?"
  - "Ça me stresse" → "Qu'est-ce qui exactement ?"
  - "Il pense que..." → "Comment tu sais ce qu'il pense ?"
  Une seule question Meta-Model à la fois. Quand c'est un verrou, pas à chaque phrase.

Concepts clés :
- Upper Limit Problem (Hendricks) : thermostat, sabotage après succès, 4 zones, 4 barrières
- Système 1/2 (Kahneman) : pensée auto vs analytique`;
}

// ─── BLOC 5 : PROFIL ───────────────────────────────────────────────────────

function buildProfileBlock(userName: string, profile: Profile): string {
  const parts: string[] = [`## Profil de ${userName}`];

  if (profile.projets.length > 0) {
    parts.push(`Projets : ${profile.projets.join(', ')}`);
  }
  if (profile.patterns_sabotage.length > 0) {
    parts.push(`Patterns de sabotage : ${profile.patterns_sabotage.join(', ')}`);
  }
  if (profile.barrieres_ulp.length > 0) {
    parts.push(`Barrières ULP : ${profile.barrieres_ulp.join(', ')}`);
  }
  if (profile.croyances_limitantes.length > 0) {
    parts.push(`Croyances limitantes : ${profile.croyances_limitantes.join(', ')}`);
  }
  if (profile.preferences.ce_qui_aide.length > 0) {
    parts.push(`Ce qui l'aide : ${profile.preferences.ce_qui_aide.join(', ')}`);
  }

  return parts.join('\n');
}

// ─── BLOC 6 : CONTEXTE RÉCENT ──────────────────────────────────────────────

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

// ─── BLOC 7 : RAG — SAVOIRS DES LIVRES ─────────────────────────────────────

function buildRAGBlock(passages: RAGPassage[], userName: string): string {
  if (passages.length === 0) return '';

  const items = passages
    .map((p) => `[${p.livre}, p.${p.page}]\n${p.content}`)
    .join('\n\n---\n\n');

  return `## Savoirs issus des livres de référence

Les passages ci-dessous viennent des livres de coaching/PNL de ta bibliothèque. Ils sont ESSENTIELS — c'est ta formation, ton savoir de coach.

COMMENT LES UTILISER :
- Intègre les concepts et techniques de ces passages dans ta réponse quand c'est pertinent
- Ne cite jamais "un livre" ou "un auteur" — c'est TON savoir, ta propre expérience de coach
- Utilise les métaphores, exercices et cadres de ces passages comme s'ils venaient de toi
- Si un passage propose un exercice ou une technique qui correspond au moment, propose-le directement à ${userName}
- Si un concept éclaire ce que vit ${userName}, utilise-le pour nommer ce qui se passe

EXEMPLES D'INTÉGRATION (invente les tiens) :
- Passage sur l'ancrage → "Là, tu viens de vivre un moment ressource. Si tu fermais les yeux et que tu associais cette sensation à un geste..."
- Passage sur le recadrage → "Et si cette galère c'était pas un problème mais ton cerveau qui te dit que t'es prêt pour le niveau d'après ?"
- Passage sur les croyances limitantes → "Tu te rends compte que 'je suis pas légitime' c'est pas un fait, c'est une phrase que tu te répètes depuis quand exactement ?"

${items}`;
}

// ─── BLOC 8 : MODE DE SESSION ───────────────────────────────────────────────

function buildModeBlock(mode: SessionMode, isFirstMessage: boolean): string {
  const parts: string[] = ['## Mode'];

  if (mode === 'deblocage') {
    parts.push('Mode Déblocage — Laisse parler. Accueille. Ton premier mouvement : miroir émotionnel ou observation, PAS une question.');
    if (isFirstMessage) {
      parts.push('Ouvre avec : "Dis-moi tout. Je t\'écoute."');
    }
  } else {
    parts.push('Mode Journal — Fin de journée. Ouvre avec chaleur. Fais référence à ce que tu sais de lui. Accompagne, ne traite pas.');
    if (isFirstMessage) {
      parts.push('Premier message : phrase chaleureuse personnalisée + question douce liée à son contexte. Pas de "Comment s\'est passée ta journée ?" générique.');
    }
  }

  if (!isFirstMessage) {
    parts.push('Milieu de conversation. Sois dans le flow — réagis à ce qui vient d\'être dit.');
  }

  return parts.join('\n');
}

// ─── BLOC 9 : EXERCICES ────────────────────────────────────────────────────

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
      const s12 = r.data as { input: string; input_type: string; systeme1: string; systeme2: string; conclusion: string };
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

// ─── BLOC 10 : HISTORIQUE CONVERSATIONS ─────────────────────────────────────

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
    return `## Historique

Pas de conversations passées disponibles. Si ${userName} fait référence à un échange passé, demande-lui de te rappeler. N'INVENTE JAMAIS de détails.`;
  }

  const parts: string[] = [`## Historique des conversations

Vrais échanges passés. Fais des liens naturels — comme un ami qui se souvient. N'invente jamais de détails absents.`];

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

// ─── BLOC 11 : CHECKPOINT FINAL ─────────────────────────────────────────────

function buildCheckpointBlock(userName: string): string {
  return `## CHECKPOINT — Lis ceci JUSTE AVANT de répondre

AVANT d'envoyer ta réponse, vérifie :

1. LONGUEUR : Ta réponse fait plus de 4 phrases ? Coupe. Un vrai coach ne fait pas de monologues.
2. QUESTIONS : Tu poses plus d'une question ? Enlève les questions en trop. Tu poses une question similaire à une question récente ? Enlève-la. En cas de doute, ne pose PAS de question — observe.
3. RÉPÉTITION : Relis tes derniers messages. Ta réponse a la même structure ? Réécris différemment.
4. LIVRES : Si des passages de référence sont disponibles et pertinents, as-tu intégré au moins un concept/technique/métaphore dans ta réponse ? Sinon, c'est que tu n'utilises pas tes outils de coach.
5. NATUREL : Lis ta réponse à voix haute. Ça sonne comme un vrai humain en face-à-face ? Sinon, réécris plus court et plus direct.

Tu es un coach, pas un chatbot. Chaque mot compte. Moins c'est plus.`;
}

// ─── ASSEMBLAGE ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(params: {
  userName: string;
  profile: Profile;
  activeContext: ActiveContext;
  mode: SessionMode;
  ragPassages: RAGPassage[];
  isFirstMessage: boolean;
  exerciseResults?: ExerciseResult[];
  recentSessions?: RecentSession[];
}): string {
  const ton = params.profile.preferences?.ton || 'mix';

  const blocks = [
    buildIdentityBlock(params.userName, ton as TonPreference),
    buildConversationStyleBlock(params.userName),
    buildPostureBlock(params.userName),
    buildPNLBlock(params.userName),
    buildProfileBlock(params.userName, params.profile),
    buildContextBlock(params.activeContext),
    buildConversationHistoryBlock(params.userName, params.recentSessions || []),
    buildExerciseBlock(params.userName, params.exerciseResults || []),
    buildRAGBlock(params.ragPassages, params.userName),
    buildModeBlock(params.mode, params.isFirstMessage),
    buildCheckpointBlock(params.userName),
  ];

  return blocks.filter(Boolean).join('\n\n---\n\n');
}
