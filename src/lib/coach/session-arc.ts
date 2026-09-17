// ─── ARC DE SÉANCE ──────────────────────────────────────────────────────────
// Une séance de coaching a une forme : on accueille, on cadre ce qu'on cherche,
// on creuse, on travaille, on fait atterrir, on referme sur un engagement.
// Avant, le coach n'avait aucune notion du temps qui passe : il pouvait ouvrir un
// sujet neuf au 30e message et laisser la séance se terminer sans rien de concret.
//
// La phase est calculée ici (déterministe, pas de modèle) à partir du nombre
// d'échanges et du temps écoulé. Le superviseur la reçoit, le coach la reçoit.

export type SessionPhase = 'ouverture' | 'cadrage' | 'exploration' | 'travail' | 'atterrissage' | 'cloture';

export interface SessionArc {
  phase: SessionPhase;
  label: string;
  /** Consigne injectée dans le prompt du coach. */
  instruction: string;
  /** true dès qu'il faut commencer à refermer plutôt qu'ouvrir. */
  shouldLand: boolean;
  exchangeCount: number;
  elapsedMinutes: number;
}

const PHASE_LABELS: Record<SessionPhase, string> = {
  ouverture: 'Ouverture',
  cadrage: 'Cadrage',
  exploration: 'Exploration',
  travail: 'Travail',
  atterrissage: 'Atterrissage',
  cloture: 'Clôture',
};

const PHASE_INSTRUCTIONS: Record<SessionPhase, string> = {
  ouverture:
    'Tu accueilles. Tu laisses venir. Aucune technique, aucun protocole, aucun conseil. Tu montres que tu es là et que tu écoutes vraiment.',
  cadrage:
    "C'est le moment de savoir ce qu'on cherche aujourd'hui — sans en faire un formulaire. Une fois, une seule, tu demandes ce qu'elle voudrait avoir démêlé en fin d'échange (\"tu veux qu'on aille où avec ça ?\"). Puis tu le gardes en tête tout du long. Si elle a déjà dit ce qu'elle veut, tu ne redemandes pas : tu le reformules et tu avances.",
  exploration:
    "Tu creuses. Tu calibres : ses mots, ses répétitions, ce qui monte quand elle parle de quoi. C'est ici que le Meta-Modèle sert, et nulle part ailleurs en rafale. Tu n'as pas à résoudre : tu cherches le vrai sujet, qui n'est presque jamais celui annoncé.",
  travail:
    "Le vrai sujet est sur la table. C'est le moment d'un protocole, d'un recadrage, d'une confrontation douce ou d'un enseignement. Tu prends un angle et tu le tiens — pas trois pistes en parallèle.",
  atterrissage:
    "On ne creuse plus, on fait atterrir. Tu récapitules ce qui s'est joué avec SES mots, tu vérifies que ça tient pour elle, et tu l'amènes vers du concret. N'ouvre AUCUN sujet nouveau, même s'il est intéressant : tu le notes pour la prochaine fois et tu le dis (\"ça, on le garde pour la prochaine\").",
  cloture:
    "Tu refermes. Une action concrète, datée, formulée par elle — pas par toi. Puis une phrase courte et humaine pour finir. Si rien de concret n'est sorti, c'est ça ta priorité absolue dans ce message.",
};

export function computeSessionArc(params: {
  /** Tous les messages de la séance (utilisateur + coach). */
  messageCount: number;
  /** Timestamp du premier message, si connu. */
  startedAt?: number | null;
  mode?: 'deblocage' | 'journal';
}): SessionArc {
  const exchangeCount = Math.max(0, Math.floor(params.messageCount / 2));
  const elapsedMinutes = params.startedAt
    ? Math.max(0, Math.round((Date.now() - params.startedAt) / 60000))
    : 0;

  // Le journal du soir est plus court qu'un déblocage : on serre le rythme.
  const budget = params.mode === 'journal' ? 0.7 : 1;

  const phase = pickPhase(exchangeCount, elapsedMinutes, budget);

  return {
    phase,
    label: PHASE_LABELS[phase],
    instruction: PHASE_INSTRUCTIONS[phase],
    shouldLand: phase === 'atterrissage' || phase === 'cloture',
    exchangeCount,
    elapsedMinutes,
  };
}

function pickPhase(exchanges: number, minutes: number, budget: number): SessionPhase {
  // Le temps peut faire basculer plus vite que le nombre d'échanges (silences longs).
  const timePressure = minutes >= 45 * budget ? 'cloture' : minutes >= 32 * budget ? 'atterrissage' : null;

  const byExchanges: SessionPhase =
    exchanges <= 1 ? 'ouverture'
    : exchanges <= 2 ? 'cadrage'
    : exchanges <= Math.round(7 * budget) ? 'exploration'
    : exchanges <= Math.round(12 * budget) ? 'travail'
    : exchanges <= Math.round(16 * budget) ? 'atterrissage'
    : 'cloture';

  if (timePressure === 'cloture') return 'cloture';
  if (timePressure === 'atterrissage' && byExchanges !== 'cloture') {
    return byExchanges === 'ouverture' || byExchanges === 'cadrage' ? byExchanges : 'atterrissage';
  }
  return byExchanges;
}

/** Bloc court pour le prompt du coach. */
export function buildArcBlock(arc: SessionArc): string {
  const elapsed = arc.elapsedMinutes > 0 ? `, ${arc.elapsedMinutes} min` : '';
  return `## Où on en est dans la séance

Phase : **${arc.label}** (${arc.exchangeCount} échange${arc.exchangeCount > 1 ? 's' : ''}${elapsed}).

${arc.instruction}`;
}
