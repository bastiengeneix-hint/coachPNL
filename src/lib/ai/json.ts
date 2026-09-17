// ─── PARSING JSON DES RÉPONSES MODÈLE ───────────────────────────────────────
// Trois routes faisaient `JSON.parse(text)` brut : dès que le modèle enveloppait
// sa réponse dans ```json, tout le résultat partait au fallback silencieux
// (analyse de séance vide, suggestions d'exercices vides). Un seul parseur ici.

/**
 * Extrait un objet/tableau JSON d'une réponse de modèle.
 * Tolère : fences markdown, texte avant/après, virgules traînantes.
 * Renvoie `null` si rien d'exploitable — au caller de décider du fallback.
 */
export function parseModelJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;

  let text = raw.trim();

  // 1. Fence markdown éventuelle
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  // 2. Tentative directe
  const direct = tryParse<T>(text);
  if (direct !== null) return direct;

  // 3. Découpe sur le premier { ou [ jusqu'au dernier } ou ]
  const start = firstIndexOf(text, ['{', '[']);
  const end = lastIndexOf(text, ['}', ']']);
  if (start === -1 || end === -1 || end <= start) return null;

  const sliced = text.slice(start, end + 1);
  const parsed = tryParse<T>(sliced);
  if (parsed !== null) return parsed;

  // 4. Dernier recours : virgules traînantes
  return tryParse<T>(sliced.replace(/,\s*([}\]])/g, '$1'));
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function firstIndexOf(text: string, chars: string[]): number {
  const found = chars.map((c) => text.indexOf(c)).filter((i) => i !== -1);
  return found.length > 0 ? Math.min(...found) : -1;
}

function lastIndexOf(text: string, chars: string[]): number {
  return Math.max(...chars.map((c) => text.lastIndexOf(c)));
}

/** Garde-fou d'enum : renvoie `value` si elle fait partie des valeurs permises. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Garde-fou de tableau de chaînes, avec plafond. */
export function stringArray(value: unknown, max = 10): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim())
    .slice(0, max);
}
