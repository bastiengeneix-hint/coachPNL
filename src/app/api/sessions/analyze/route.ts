import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { analyzeSession } from '@/lib/coach/session-analyzer';
import { applyProfileEvolution } from '@/lib/memory/apply-evolution';
import { getCoachingSnapshot } from '@/lib/program/snapshot';
import { extractHarvest, applyHarvest } from '@/lib/program/harvest';
import type { Message, Profile } from '@/types';

const FREQUENCY_HOURS: Record<string, number> = {
  daily: 24,
  every_2_days: 48,
  every_3_days: 72,
  weekly: 168,
};

// ─── FIN DE SÉANCE ──────────────────────────────────────────────────────────
// Tout se passe ici, côté serveur : l'analyse, l'évolution du profil, la
// récolte du parcours (objectif, mesures, pratiques, protocole conduit) et le
// rappel d'exercice. Avant, une partie était orchestrée par le navigateur —
// donc perdue dès que l'utilisateur fermait l'onglet.

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const userId = session.user.id;

    const { messages, sessionId } = (await req.json()) as { messages: Message[]; sessionId?: string };

    if (!messages || messages.length < 2) {
      return NextResponse.json({ error: 'Pas assez de messages à analyser' }, { status: 400 });
    }

    const supabase = createServerClient();

    const [{ data: profileRow }, { data: userRow }, snapshot] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).single(),
      supabase.from('users').select('name').eq('id', userId).single(),
      getCoachingSnapshot(supabase, userId),
    ]);

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

    const userName = userRow?.name || 'ami';

    // Deux lectures indépendantes de la même séance : le résumé et la récolte.
    // Séparées exprès — un seul appel qui fait les deux fait mal les deux.
    const [analysis, harvest] = await Promise.all([
      analyzeSession(messages, profile),
      extractHarvest({ userName, messages, snapshot }),
    ]);

    // Profil : croyances, patterns, barrières ULP, lexique.
    try {
      await applyProfileEvolution(supabase, userId, analysis.profile_evolution);
    } catch (error) {
      console.warn('Analyze: profile evolution skipped:', error);
    }

    // Parcours : objectif, jalons, mesures, pratiques, protocole conduit.
    let harvestResult = null;
    try {
      harvestResult = await applyHarvest(supabase, userId, sessionId ?? null, harvest, snapshot);
      console.log('Harvest:', JSON.stringify(harvestResult));
    } catch (error) {
      console.warn('Analyze: harvest skipped:', error);
    }

    // Rappel d'exercice, si le coach en a proposé un à répéter.
    if (analysis.exercice_propose && analysis.reminder_config) {
      try {
        const cfg = analysis.reminder_config;
        const hours = FREQUENCY_HOURS[cfg.frequency] || 24;
        const endDate = new Date(Date.now() + cfg.duration_days * 86400000);
        const nextReminder = new Date(Date.now() + hours * 3600000);

        const { error } = await supabase.from('exercise_reminders').insert({
          user_id: userId,
          session_id: sessionId ?? null,
          exercise_description: analysis.exercice_propose,
          frequency: cfg.frequency,
          end_date: endDate.toISOString().slice(0, 10),
          next_reminder_at: nextReminder.toISOString(),
          message: cfg.message || `Rappel : ${analysis.exercice_propose}`,
        });
        if (error) console.warn('Analyze: reminder not created:', error.message);
      } catch (error) {
        console.warn('Analyze: reminder skipped:', error);
      }
    }

    return NextResponse.json({ ...analysis, harvest: harvestResult });
  } catch (error) {
    console.error('Session analyze error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
