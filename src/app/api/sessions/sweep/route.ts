import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { analyzeSession } from '@/lib/coach/session-analyzer';
import { applyProfileEvolution } from '@/lib/memory/apply-evolution';
import { buildActiveContext } from '@/lib/memory/context-builder';
import type { Json } from '@/lib/supabase/types';
import type { Message, Profile, Session } from '@/types';

// ─── BALAYAGE DES SÉANCES ABANDONNÉES ───────────────────────────────────────
// L'analyse de fin de séance ne tournait QUE si l'utilisateur cliquait sur
// « Terminer ». Une séance quittée en fermant l'onglet — le cas le plus courant
// sur mobile — n'était jamais analysée : aucun insight, aucun thème, aucune
// action, profil jamais mis à jour. Le coach perdait la mémoire de tout ce qui
// n'avait pas été proprement refermé.
//
// Cette route rattrape ces séances. Appelée depuis l'accueil, sans bloquer l'UI.

const STALE_AFTER_HOURS = 8;
const MIN_MESSAGES_TO_ANALYZE = 4;
const MAX_SESSIONS_PER_SWEEP = 3;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const userId = session.user.id;
    const supabase = createServerClient();

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - STALE_AFTER_HOURS);

    const { data: stale, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('ended', false)
      .lt('date', cutoff.toISOString())
      .order('date', { ascending: false })
      .limit(MAX_SESSIONS_PER_SWEEP);

    if (error) {
      console.error('Sweep: failed to fetch stale sessions:', error);
      return NextResponse.json({ analyzed: 0, closed: 0 });
    }

    if (!stale || stale.length === 0) {
      return NextResponse.json({ analyzed: 0, closed: 0 });
    }

    // Profil de référence pour comparer l'évolution.
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const defaultPrefs = { ce_qui_aide: [] as string[], ce_qui_bloque: [] as string[], ton: 'mix' as const };
    const profile: Profile = {
      projets: profileRow?.projets || [],
      patterns_sabotage: profileRow?.patterns_sabotage || [],
      barrieres_ulp: profileRow?.barrieres_ulp || [],
      croyances_limitantes: profileRow?.croyances_limitantes || [],
      preferences:
        profileRow?.preferences && typeof profileRow.preferences === 'object' && !Array.isArray(profileRow.preferences)
          ? ({ ...defaultPrefs, ...(profileRow.preferences as Record<string, unknown>) } as Profile['preferences'])
          : defaultPrefs,
    };

    let analyzed = 0;
    let closed = 0;

    for (const row of stale) {
      const messages = (Array.isArray(row.messages) ? row.messages : []) as unknown as Message[];

      // Trop courte pour dire quoi que ce soit : on la referme, point.
      if (messages.length < MIN_MESSAGES_TO_ANALYZE) {
        await supabase.from('sessions').update({ ended: true }).eq('id', row.id);
        closed++;
        continue;
      }

      const analysis = await analyzeSession(messages, profile);

      await supabase
        .from('sessions')
        .update({
          ended: true,
          insights: analysis.insights as unknown as Json,
          themes: analysis.themes,
          exercice_propose: analysis.exercice_propose,
          summary: analysis.summary,
          coach_summary: analysis.coach_summary || null,
          actions: analysis.actions as unknown as Json,
        })
        .eq('id', row.id);

      try {
        await applyProfileEvolution(supabase, userId, analysis.profile_evolution);
      } catch (evolutionError) {
        console.warn('Sweep: profile evolution skipped:', evolutionError);
      }

      analyzed++;
      closed++;
    }

    // Le contexte actif doit refléter ce qu'on vient d'apprendre.
    if (analyzed > 0) {
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 14);
      const { data: recent } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('date', recentCutoff.toISOString())
        .order('date', { ascending: false })
        .limit(10);

      const context = buildActiveContext((recent || []) as unknown as Session[]);
      await supabase
        .from('active_contexts')
        .upsert({ user_id: userId, ...context }, { onConflict: 'user_id' });
    }

    console.log(`Sweep: ${analyzed} session(s) analysed, ${closed} closed for user ${userId}`);
    return NextResponse.json({ analyzed, closed });
  } catch (error) {
    console.error('Sessions sweep error:', error);
    return NextResponse.json({ analyzed: 0, closed: 0 });
  }
}
