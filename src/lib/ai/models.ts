// ─── MODÈLES ────────────────────────────────────────────────────────────────
// Un seul endroit pour les IDs de modèles. Avant, chaque fichier avait le sien
// et l'un d'eux (`claude-haiku-4-20250414`, dans le RAG) n'existait pas : l'appel
// échouait en silence à chaque message.

// Le coach lui-même — c'est lui qui parle, il prend le meilleur modèle.
export const COACH_MODEL = 'claude-sonnet-5';

// Le superviseur de séance : appelé avant CHAQUE réponse, doit être rapide.
export const SUPERVISOR_MODEL = 'claude-haiku-4-5-20251001';

// Analyse de fin de séance, bilans, exercices : hors temps de parole.
export const ANALYSIS_MODEL = 'claude-haiku-4-5-20251001';

// Petites tâches utilitaires (reformulation de requête RAG).
export const UTILITY_MODEL = 'claude-haiku-4-5-20251001';
