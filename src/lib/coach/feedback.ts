// ─── LE RETOUR DE FIN DE SÉANCE ─────────────────────────────────────────────
// Quatre curseurs, dix secondes, sur le modèle de la Session Rating Scale.
// Jusqu'ici le coach ne savait jamais si sa façon de faire convenait : les
// seuls retours étaient ceux remontés à la main, des jours plus tard, quand
// une séance avait mal tourné. Demander, et renvoyer la réponse au praticien,
// fait partie de ce qui améliore le plus les résultats d'un accompagnement.

import type { SessionFeedback } from '@/types';

export const FEEDBACK_ITEMS = [
  { key: 'ecoute', label: "Ce que j'ai dit a été entendu" },
  { key: 'sujet', label: 'On a parlé de ce qui compte pour moi' },
  { key: 'approche', label: 'La façon de faire me convient' },
  { key: 'global', label: "Globalement, cette séance m'a servi" },
] as const;

export type FeedbackKey = (typeof FEEDBACK_ITEMS)[number]['key'];

/** En dessous, la note est un signal : on en parle à la séance suivante. */
export const FEEDBACK_LOW = 7;

const NOTE_MAX = 500;

function score(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 0 || n > 10) return null;
  return Math.round(n);
}

/** Valide un retour venu du client ou de la base. null si incomplet. */
export function parseFeedback(value: unknown, at?: string): SessionFeedback | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const ecoute = score(v.ecoute);
  const sujet = score(v.sujet);
  const approche = score(v.approche);
  const global = score(v.global);
  if (ecoute === null || sujet === null || approche === null || global === null) return null;

  const note = typeof v.note === 'string' && v.note.trim() ? v.note.trim().slice(0, NOTE_MAX) : null;
  const when = typeof v.at === 'string' ? v.at : at ?? new Date().toISOString();

  return { ecoute, sujet, approche, global, note, at: when };
}

/** Les items notés en dessous du seuil, du plus bas au moins bas. */
export function lowItems(feedback: SessionFeedback): Array<{ key: FeedbackKey; label: string; value: number }> {
  return FEEDBACK_ITEMS.map((item) => ({ key: item.key, label: item.label, value: feedback[item.key] }))
    .filter((item) => item.value < FEEDBACK_LOW)
    .sort((a, b) => a.value - b.value);
}

/** Une ligne compacte, pour le superviseur. */
export function formatFeedbackLine(feedback: SessionFeedback): string {
  return `écoute ${feedback.ecoute} · sujet ${feedback.sujet} · approche ${feedback.approche} · global ${feedback.global}`;
}

// Ce que le coach change dans sa façon de faire, item par item. Ce sont des
// ajustements de posture, pas des sujets à aborder.
const ADJUSTMENTS: Record<FeedbackKey, string> = {
  ecoute:
    "Plus de reflets, moins de questions, et tu ne pars pas vers une technique avant d'être sûr d'avoir compris.",
  sujet:
    "Vérifie tôt que vous parlez de ce qui compte vraiment pour lui ou elle (« c'est de ça que tu veux qu'on parle aujourd'hui ? »), et laisse choisir.",
  approche:
    "Ta façon de faire n'a pas convenu. Change de registre plutôt que d'insister, et demande ce qui aurait mieux marché.",
  global:
    "La séance n'a pas servi. Avant la fin de celle-ci, assure-toi qu'il en sort quelque chose d'utile à ses yeux, pas aux tiens.",
};

export function adjustmentFor(key: FeedbackKey): string {
  return ADJUSTMENTS[key];
}
