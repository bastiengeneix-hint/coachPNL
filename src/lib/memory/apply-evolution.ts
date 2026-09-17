// ─── ÉVOLUTION DU PROFIL ────────────────────────────────────────────────────
// Même logique côté route (/api/profile/evolve, appelée par le navigateur) et
// côté serveur (le balayage des séances abandonnées). Un seul endroit pour les
// règles de déduplication et de plafonnement.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ProfileEvolution } from '@/types';

const LEXIQUE_MAX = 24;

export interface EvolutionResult {
  evolved: boolean;
  changes: Record<string, number>;
}

export function hasEvolution(evolution: ProfileEvolution): boolean {
  return (
    [
      evolution.add_croyances,
      evolution.remove_croyances,
      evolution.add_patterns,
      evolution.remove_patterns,
      evolution.add_projets,
      evolution.add_barrieres,
      evolution.remove_barrieres,
      evolution.add_lexique,
    ] as (string[] | undefined)[]
  ).some((list) => Array.isArray(list) && list.length > 0);
}

export async function applyProfileEvolution(
  supabase: SupabaseClient<Database>,
  userId: string,
  evolution: ProfileEvolution
): Promise<EvolutionResult> {
  if (!hasEvolution(evolution)) return { evolved: false, changes: {} };

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError || !profile) {
    throw new Error('Profile not found');
  }

  const currentPrefs =
    profile.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences)
      ? (profile.preferences as Record<string, unknown>)
      : {};
  const currentLexique: string[] = Array.isArray(currentPrefs.lexique)
    ? (currentPrefs.lexique as string[])
    : [];

  const updates = {
    croyances_limitantes: applyList(
      profile.croyances_limitantes || [],
      evolution.add_croyances,
      evolution.remove_croyances
    ),
    patterns_sabotage: applyList(
      profile.patterns_sabotage || [],
      evolution.add_patterns,
      evolution.remove_patterns
    ),
    projets: addUnique(profile.projets || [], evolution.add_projets),
    // `barrieres_ulp` était lu par le prompt du coach mais rien ne l'écrivait.
    barrieres_ulp: applyList(
      profile.barrieres_ulp || [],
      evolution.add_barrieres,
      evolution.remove_barrieres
    ),
    preferences: {
      ...currentPrefs,
      lexique: addUnique(currentLexique, evolution.add_lexique).slice(-LEXIQUE_MAX),
    },
  };

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    evolved: true,
    changes: {
      croyances_added: evolution.add_croyances?.length || 0,
      croyances_removed: evolution.remove_croyances?.length || 0,
      patterns_added: evolution.add_patterns?.length || 0,
      patterns_removed: evolution.remove_patterns?.length || 0,
      projets_added: evolution.add_projets?.length || 0,
      barrieres_added: evolution.add_barrieres?.length || 0,
      barrieres_removed: evolution.remove_barrieres?.length || 0,
      lexique_added: evolution.add_lexique?.length || 0,
    },
  };
}

/** Retire (comparaison souple) puis ajoute les nouveautés, sans doublon. */
function applyList(current: string[], toAdd?: string[], toRemove?: string[]): string[] {
  let result = [...current];

  if (toRemove && toRemove.length > 0) {
    const removeLower = toRemove.map((r) => r.toLowerCase());
    result = result.filter(
      (item) =>
        !removeLower.some(
          (r) => item.toLowerCase().includes(r) || r.includes(item.toLowerCase())
        )
    );
  }

  return addUnique(result, toAdd);
}

function addUnique(current: string[], toAdd?: string[]): string[] {
  if (!toAdd || toAdd.length === 0) return current;
  const currentLower = new Set(current.map((c) => c.toLowerCase()));
  return [...current, ...toAdd.filter((item) => !currentLower.has(item.toLowerCase()))];
}
