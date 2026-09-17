import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateBilan, type BilanSuivi } from '@/lib/bilans/generator';
import { getCoachingSnapshot, isExpectedOn } from '@/lib/program/snapshot';
import { PROTOCOLS } from '@/lib/pnl/protocols';
import type { BilanType } from '@/types';

// ─── GÉNÉRATION DES BILANS (cron) ───────────────────────────────────────────
// Hebdo le lundi matin, mensuel le 1er, annuel le 1er janvier. Le bilan est le
// miroir de la progression : il s'appuie sur les mesures et les pratiques, pas
// seulement sur le souvenir des conversations.
//
// Vercel Cron : "0 6 * * 1" (?type=weekly) et "0 8 1 * *" (mensuel + annuel).

type Period = { type: BilanType; start: Date; end: Date };

// Vercel déclenche les crons en GET.
export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requested = new URL(req.url).searchParams.get('type');
    const now = new Date();
    const supabase = createServerClient();

    const periods: Period[] = [];

    if (requested === 'weekly') {
      // Semaine écoulée, lundi → dimanche.
      const lastMonday = new Date(now);
      const dow = (lastMonday.getDay() + 6) % 7; // 0 = lundi
      lastMonday.setDate(lastMonday.getDate() - dow - 7);
      lastMonday.setHours(0, 0, 0, 0);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      periods.push({ type: 'weekly', start: lastMonday, end: lastSunday });
    } else {
      periods.push({
        type: 'monthly',
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      });
      if (now.getMonth() === 0) {
        periods.push({
          type: 'yearly',
          start: new Date(now.getFullYear() - 1, 0, 1),
          end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
        });
      }
    }

    // Utilisateurs actifs : une séance ou un check-in dans les 60 derniers jours.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);

    const [{ data: sessionUsers }, { data: checkinUsers }] = await Promise.all([
      supabase.from('sessions').select('user_id').gte('date', cutoff.toISOString()).limit(500),
      supabase.from('checkins').select('user_id').gte('day', cutoff.toISOString().slice(0, 10)).limit(500),
    ]);

    const uniqueUserIds = [
      ...new Set([...(sessionUsers ?? []), ...(checkinUsers ?? [])].map((u) => u.user_id)),
    ];

    let generated = 0;

    for (const userId of uniqueUserIds) {
      for (const period of periods) {
        const created = await buildAndStore(supabase, userId, period);
        if (created) generated++;
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      users: uniqueUserIds.length,
      types: periods.map((p) => p.type),
    });
  } catch (error) {
    console.error('Bilan generation cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildAndStore(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  period: Period
): Promise<boolean> {
  const startISO = period.start.toISOString();
  const endISO = period.end.toISOString();
  const startDay = startISO.slice(0, 10);
  const endDay = endISO.slice(0, 10);

  const { data: existing } = await supabase
    .from('bilans')
    .select('id')
    .eq('user_id', userId)
    .eq('type', period.type)
    .eq('period_start', startDay)
    .limit(1);

  if (existing?.[0]) return false;

  const [{ data: sessions }, { count: exercisesCount }, snapshot] = await Promise.all([
    supabase
      .from('sessions')
      .select('date, mode, themes, insights, summary, coach_summary, actions, exercice_propose')
      .eq('user_id', userId)
      .gte('date', startISO)
      .lte('date', endISO)
      .order('date', { ascending: true }),
    supabase
      .from('exercise_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', startISO)
      .lte('completed_at', endISO),
    getCoachingSnapshot(supabase, userId),
  ]);

  const sessionData = (sessions ?? []).map((s) => ({
    date: s.date,
    mode: s.mode,
    themes: s.themes || [],
    insights: (Array.isArray(s.insights) ? s.insights : []) as Array<{ text: string; isBreakthrough: boolean }>,
    summary: s.summary,
    coach_summary: s.coach_summary,
    actions: (Array.isArray(s.actions) ? s.actions : []) as Array<{ text: string; done: boolean }>,
    exercice_propose: s.exercice_propose,
  }));

  const suivi = buildSuivi(snapshot, period);

  // On génère s'il y a de la matière : des séances OU un parcours qui vit.
  const hasSuiviMatter =
    suivi !== null && (suivi.mesures.length > 0 || suivi.pratiques.length > 0 || suivi.checkins > 0);
  if (sessionData.length === 0 && !hasSuiviMatter) return false;

  const content = await generateBilan(
    period.type,
    startDay,
    endDay,
    sessionData,
    exercisesCount ?? 0,
    suivi
  );

  const { error } = await supabase.from('bilans').insert({
    user_id: userId,
    type: period.type,
    period_start: startDay,
    period_end: endDay,
    content: JSON.parse(JSON.stringify(content)),
  });

  if (error) {
    console.warn(`Bilan ${period.type} not stored for ${userId}:`, error.message);
    return false;
  }
  return true;
}

/** Ce que le parcours dit de la période : le début, la fin, l'assiduité. */
function buildSuivi(
  snapshot: Awaited<ReturnType<typeof getCoachingSnapshot>>,
  period: Period
): BilanSuivi | null {
  if (!snapshot.program && snapshot.measures.length === 0 && snapshot.practices.length === 0) {
    return null;
  }

  const inPeriod = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= period.start.getTime() && t <= period.end.getTime();
  };

  const mesures = snapshot.measures.map((m) => {
    const within = m.entries.filter((e) => inPeriod(e.recorded_at));
    // Les relevés arrivent du plus récent au plus ancien.
    const fin = within[0]?.value ?? m.last?.value ?? null;
    const debut = within.length > 0 ? within[within.length - 1].value : m.baseline;
    return { label: m.label, debut, fin, cible: m.cible, direction: m.direction };
  });

  // Nombre de jours attendus sur la période, selon la cadence de la pratique.
  const pratiques = snapshot.practices.map((p) => {
    let attendues = 0;
    for (let d = new Date(period.start); d <= period.end; d.setDate(d.getDate() + 1)) {
      if (p.cadence === 'weekly') continue;
      if (isExpectedOn(p.cadence, new Date(d))) attendues++;
    }
    if (p.cadence === 'weekly') {
      attendues = Math.max(1, Math.round((period.end.getTime() - period.start.getTime()) / (7 * 86400000)));
    }
    const faites = p.logs.filter((l) => l.done && inPeriod(l.done_on)).length;
    return { label: p.label, faites, attendues, serie: p.streak };
  });

  const protocoles = snapshot.recentRuns
    .filter((r) => inPeriod(r.ran_at))
    .map((r) => ({
      nom: PROTOCOLS[r.protocol_id as keyof typeof PROTOCOLS]?.nom || r.protocol_id,
      sujet: r.sujet,
      tient: r.revisited ? true : null,
    }));

  return {
    objectif: snapshot.program?.objectif ?? null,
    semaine: snapshot.derived.week,
    total_semaines: snapshot.derived.totalWeeks,
    jalons: snapshot.milestones.map((m) => `${m.done ? '✓' : '○'} ${m.label}`),
    mesures,
    pratiques,
    protocoles,
    checkins: snapshot.recentCheckins.filter((c) => inPeriod(c.day)).length,
  };
}
