// ─── L'ÉTAT DU SUIVI ────────────────────────────────────────────────────────
// Une seule lecture, une seule vérité. L'accueil, la page parcours, le
// superviseur et le prompt du coach lisent tous CE snapshot : c'est ce qui fait
// que le coach sait exactement ce que l'app affiche, et inversement.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type {
  Checkin,
  CoachingSnapshot,
  Measure,
  MeasureEntry,
  MeasureWithHistory,
  Practice,
  PracticeCadence,
  PracticeLog,
  PracticeWithProgress,
  Program,
  ProgramMilestone,
  ProtocolRun,
} from '@/types';

const DAY = 86400000;

// Les serveurs tournent en UTC. Un journal du soir rempli à 00 h 30 à Paris
// serait daté de la veille, et la série du jour compterait à côté. Tout ce qui
// touche à une DATE (séries, check-ins, pratiques) se calcule donc en heure
// française, pas en heure serveur.
export const APP_TIMEZONE = 'Europe/Paris';

const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

function toISODate(d: Date): string {
  // en-CA formate en YYYY-MM-DD.
  return DAY_FORMATTER.format(d);
}

/** Jour de la semaine (0 = dimanche) en heure française. */
function localWeekday(d: Date): number {
  const label = new Intl.DateTimeFormat('en-US', { timeZone: APP_TIMEZONE, weekday: 'short' }).format(d);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(label);
}

function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  const t1 = typeof a === 'string' ? new Date(a).getTime() : a.getTime();
  const t2 = typeof b === 'string' ? new Date(b).getTime() : b.getTime();
  return Math.floor((t2 - t1) / DAY);
}

/** Une pratique quotidienne n'est pas attendue le dimanche si elle est 'weekdays'. */
export function isExpectedOn(cadence: PracticeCadence, date: Date): boolean {
  if (cadence === 'daily') return true;
  if (cadence === 'weekdays') {
    const d = localWeekday(date);
    return d >= 1 && d <= 5;
  }
  return true; // 'weekly' : géré à la semaine, pas au jour
}

export async function getCoachingSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CoachingSnapshot> {
  const today = todayISO();
  const since30 = toISODate(new Date(Date.now() - 30 * DAY));
  const since120 = new Date(Date.now() - 120 * DAY).toISOString();
  const since14 = new Date(Date.now() - 14 * DAY).toISOString();

  const [
    programRes,
    measuresRes,
    practicesRes,
    runsRes,
    checkinsRes,
    sessionsRes,
  ] = await Promise.all([
    supabase.from('programs').select('*').eq('user_id', userId).eq('statut', 'actif').limit(1),
    supabase.from('measures').select('*').eq('user_id', userId).eq('active', true).order('created_at'),
    supabase.from('practices').select('*').eq('user_id', userId).eq('active', true).order('created_at'),
    supabase.from('protocol_runs').select('*').eq('user_id', userId).gte('ran_at', since120).order('ran_at', { ascending: false }),
    supabase.from('checkins').select('*').eq('user_id', userId).gte('day', since30).order('day', { ascending: false }),
    supabase.from('sessions').select('date, actions').eq('user_id', userId).gte('date', since14).order('date', { ascending: false }).limit(10),
  ]);

  const programRow = programRes.data?.[0] ?? null;
  const program: Program | null = programRow
    ? {
        id: programRow.id,
        objectif: programRow.objectif,
        pourquoi_maintenant: programRow.pourquoi_maintenant,
        etat_present: programRow.etat_present,
        etat_desire: programRow.etat_desire,
        criteres_reussite: programRow.criteres_reussite || [],
        echeance: programRow.echeance,
        statut: programRow.statut as Program['statut'],
        started_at: programRow.started_at,
        closed_at: programRow.closed_at,
        bilan_final: programRow.bilan_final,
      }
    : null;

  // Jalons + relevés : deux requêtes dépendantes, lancées ensemble.
  const measureIds = (measuresRes.data || []).map((m) => m.id);
  const [milestonesRes, entriesRes, logsRes] = await Promise.all([
    program
      ? supabase.from('program_milestones').select('*').eq('program_id', program.id).order('ordre')
      : Promise.resolve({ data: [] as Database['public']['Tables']['program_milestones']['Row'][] }),
    measureIds.length > 0
      ? supabase.from('measure_entries').select('*').in('measure_id', measureIds).gte('recorded_at', since120).order('recorded_at', { ascending: false })
      : Promise.resolve({ data: [] as Database['public']['Tables']['measure_entries']['Row'][] }),
    supabase.from('practice_logs').select('*').eq('user_id', userId).gte('done_on', since30).order('done_on', { ascending: false }),
  ]);

  const milestones: ProgramMilestone[] = (milestonesRes.data || []).map((m) => ({
    id: m.id,
    program_id: m.program_id,
    label: m.label,
    ordre: m.ordre,
    target_date: m.target_date,
    done: m.done,
    done_at: m.done_at,
  }));

  // ── Mesures ───────────────────────────────────────────────────────────────
  const entriesByMeasure = new Map<string, MeasureEntry[]>();
  for (const e of entriesRes.data || []) {
    const list = entriesByMeasure.get(e.measure_id) || [];
    list.push({
      id: e.id,
      measure_id: e.measure_id,
      value: e.value,
      note: e.note,
      source: e.source as MeasureEntry['source'],
      recorded_at: e.recorded_at,
    });
    entriesByMeasure.set(e.measure_id, list);
  }

  const measures: MeasureWithHistory[] = (measuresRes.data || []).map((row) => {
    const measure: Measure = {
      id: row.id,
      program_id: row.program_id,
      label: row.label,
      question: row.question,
      direction: (row.direction as Measure['direction']) || 'up',
      baseline: row.baseline,
      cible: row.cible,
      cadence_days: row.cadence_days,
      active: row.active,
      created_at: row.created_at,
    };
    const entries = entriesByMeasure.get(row.id) || [];
    const last = entries[0] ?? null;

    // Écart avec le relevé le plus proche d'il y a ~2 semaines, sinon la baseline.
    let delta: number | null = null;
    if (last) {
      const older = entries.find((e) => daysBetween(e.recorded_at, new Date(last.recorded_at)) >= 10);
      const reference = older ? older.value : measure.baseline;
      if (reference !== null && reference !== undefined) {
        delta = last.value - reference;
      }
    }

    const due = !last || daysBetween(last.recorded_at) >= measure.cadence_days;

    return { ...measure, entries, last, delta, due };
  });

  // ── Pratiques ─────────────────────────────────────────────────────────────
  const logsByPractice = new Map<string, PracticeLog[]>();
  for (const l of logsRes.data || []) {
    const list = logsByPractice.get(l.practice_id) || [];
    list.push({ id: l.id, practice_id: l.practice_id, done_on: l.done_on, done: l.done, note: l.note });
    logsByPractice.set(l.practice_id, list);
  }

  const practices: PracticeWithProgress[] = (practicesRes.data || []).map((row) => {
    const practice: Practice = {
      id: row.id,
      program_id: row.program_id,
      label: row.label,
      pourquoi: row.pourquoi,
      declencheur: row.declencheur,
      cadence: (row.cadence as PracticeCadence) || 'daily',
      target_per_week: row.target_per_week,
      protocol_id: row.protocol_id,
      active: row.active,
      created_at: row.created_at,
    };
    const logs = logsByPractice.get(row.id) || [];
    const doneDays = new Set(logs.filter((l) => l.done).map((l) => l.done_on));

    const done_today = doneDays.has(today);
    const expectedToday = isExpectedOn(practice.cadence, new Date());

    const last_7 = countDoneInLastDays(doneDays, 7);
    const streak = computeStreak(practice.cadence, doneDays);
    const missed = countMissedInARow(practice.cadence, doneDays);

    return {
      ...practice,
      logs,
      done_today,
      streak,
      last_7,
      due_today:
        practice.cadence === 'weekly'
          ? last_7 === 0
          : expectedToday && !done_today,
      slipping: practice.cadence === 'weekly' ? daysSinceLastDone(doneDays) > 10 : missed >= 3,
    };
  });

  // ── Protocoles ────────────────────────────────────────────────────────────
  const runs: ProtocolRun[] = (runsRes.data || []).map((r) => ({
    id: r.id,
    session_id: r.session_id,
    protocol_id: r.protocol_id,
    sujet: r.sujet,
    resultat: r.resultat,
    intensite_avant: r.intensite_avant,
    intensite_apres: r.intensite_apres,
    revisit_at: r.revisit_at,
    revisited: r.revisited,
    revisit_note: r.revisit_note,
    ran_at: r.ran_at,
  }));

  const protocolsToRevisit = runs.filter(
    (r) => !r.revisited && r.revisit_at !== null && r.revisit_at <= today
  );

  // ── Check-ins ─────────────────────────────────────────────────────────────
  const checkins: Checkin[] = (checkinsRes.data || []).map((c) => ({
    id: c.id,
    day: c.day,
    moment: c.moment as Checkin['moment'],
    intention: c.intention,
    wins: c.wins || [],
    frictions: c.frictions || [],
    energie: c.energie,
    note: c.note,
    coach_reply: c.coach_reply,
    created_at: c.created_at,
  }));

  const checkinToday = {
    matin: checkins.find((c) => c.day === today && c.moment === 'matin') ?? null,
    soir: checkins.find((c) => c.day === today && c.moment === 'soir') ?? null,
  };

  // ── Engagements non soldés ────────────────────────────────────────────────
  const pendingActions: Array<{ text: string; days_ago: number }> = [];
  for (const s of (sessionsRes.data || []) as unknown as Array<{
    date: string;
    actions?: Array<{ text: string; done: boolean }>;
  }>) {
    const actions = Array.isArray(s.actions) ? s.actions : [];
    for (const a of actions) {
      if (!a.done && a.text && pendingActions.length < 6) {
        pendingActions.push({ text: a.text, days_ago: Math.max(0, daysBetween(s.date)) });
      }
    }
  }

  const lastSessionDate = (sessionsRes.data || [])[0]?.date ?? null;

  return {
    program,
    milestones,
    measures,
    practices,
    protocolsToRevisit,
    recentRuns: runs.slice(0, 6),
    checkinToday,
    recentCheckins: checkins.slice(0, 7),
    pendingActions,
    derived: {
      week: program ? Math.max(1, Math.floor(daysBetween(program.started_at) / 7) + 1) : null,
      totalWeeks:
        program?.echeance && program.started_at
          ? Math.max(1, Math.round(daysBetween(program.started_at, new Date(program.echeance)) / 7))
          : null,
      milestonesDone: milestones.filter((m) => m.done).length,
      milestonesTotal: milestones.length,
      practicesDueToday: practices.filter((p) => p.due_today).length,
      measuresDue: measures.filter((m) => m.due).length,
      checkinStreak: computeCheckinStreak(checkins),
      daysSinceLastSession: lastSessionDate ? Math.max(0, daysBetween(lastSessionDate)) : null,
    },
  };
}

// ─── CALCULS ────────────────────────────────────────────────────────────────

function countDoneInLastDays(doneDays: Set<string>, days: number): number {
  let count = 0;
  for (let i = 0; i < days; i++) {
    if (doneDays.has(toISODate(new Date(Date.now() - i * DAY)))) count++;
  }
  return count;
}

function daysSinceLastDone(doneDays: Set<string>): number {
  for (let i = 0; i < 60; i++) {
    if (doneDays.has(toISODate(new Date(Date.now() - i * DAY)))) return i;
  }
  return 999;
}

/**
 * Jours attendus consécutifs cochés. La journée en cours ne casse pas la série
 * si elle n'est pas encore faite : on ne punit personne à 9 h du matin.
 */
function computeStreak(cadence: PracticeCadence, doneDays: Set<string>): number {
  if (cadence === 'weekly') {
    let streak = 0;
    for (let w = 0; w < 12; w++) {
      let doneThisWeek = false;
      for (let d = 0; d < 7; d++) {
        if (doneDays.has(toISODate(new Date(Date.now() - (w * 7 + d) * DAY)))) {
          doneThisWeek = true;
          break;
        }
      }
      if (doneThisWeek) streak++;
      else if (w > 0) break;
    }
    return streak;
  }

  let streak = 0;
  for (let i = 0; i < 180; i++) {
    const date = new Date(Date.now() - i * DAY);
    if (!isExpectedOn(cadence, date)) continue;
    const iso = toISODate(date);
    if (doneDays.has(iso)) {
      streak++;
      continue;
    }
    if (i === 0) continue; // aujourd'hui pas encore fait : on ne casse pas
    break;
  }
  return streak;
}

/** Jours attendus manqués d'affilée, en ignorant la journée en cours. */
function countMissedInARow(cadence: PracticeCadence, doneDays: Set<string>): number {
  let missed = 0;
  for (let i = 1; i < 30; i++) {
    const date = new Date(Date.now() - i * DAY);
    if (!isExpectedOn(cadence, date)) continue;
    if (doneDays.has(toISODate(date))) break;
    missed++;
  }
  return missed;
}

function computeCheckinStreak(checkins: Checkin[]): number {
  const days = new Set(checkins.map((c) => c.day));
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const iso = toISODate(new Date(Date.now() - i * DAY));
    if (days.has(iso)) {
      streak++;
      continue;
    }
    if (i === 0) continue;
    break;
  }
  return streak;
}
