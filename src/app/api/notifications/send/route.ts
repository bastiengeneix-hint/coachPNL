import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/program/snapshot';

// ─── CRON DE NOTIFICATIONS ──────────────────────────────────────────────────
// Toutes les 2 heures : les rappels d'exercice, puis les relances du quotidien
// (intention du matin, pratique du jour, dépôt du soir).
//
// Vercel déclenche les crons en GET : la route n'exposait que POST, donc elle
// répondait 405 à chaque passage. D'où le GET ci-dessous.

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Find due reminders
    const { data: dueReminders, error: remindersError } = await supabase
      .from('exercise_reminders')
      .select('*')
      .eq('completed', false)
      .lte('next_reminder_at', now)
      .limit(100);

    if (remindersError) {
      console.error('Notifications: reminders query failed:', remindersError);
    }

    const FREQUENCY_HOURS: Record<string, number> = {
      daily: 24,
      every_2_days: 48,
      every_3_days: 72,
      weekly: 168,
    };

    let sent = 0;

    // Try to load web-push dynamically (it's an optional dependency)
    let webpush: typeof import('web-push') | null = null;
    try {
      webpush = await import('web-push');

      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      const vapidEmail = process.env.VAPID_EMAIL || 'mailto:contact@innercoach.app';

      if (vapidPublicKey && vapidPrivateKey) {
        webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
      } else {
        webpush = null;
      }
    } catch {
      // web-push not installed — skip push notifications, just update reminder schedule
    }

    for (const reminder of dueReminders ?? []) {
      // Send push notification if possible
      if (webpush) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('subscription')
          .eq('user_id', reminder.user_id);

        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              sub.subscription as never,
              JSON.stringify({
                title: 'Inner Coach',
                body: reminder.message || `Rappel : ${reminder.exercise_description}`,
                tag: `reminder-${reminder.id}`,
                url: '/exercices',
              })
            );
            sent++;
          } catch (err) {
            console.error('Push send error:', err);
            // If subscription is invalid, remove it
            if ((err as { statusCode?: number }).statusCode === 410) {
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', reminder.user_id);
            }
          }
        }
      }

      // Update next_reminder_at
      const hours = FREQUENCY_HOURS[reminder.frequency] || 24;
      const nextReminder = new Date();
      nextReminder.setHours(nextReminder.getHours() + hours);

      const endDate = new Date(reminder.end_date);

      if (nextReminder > endDate) {
        // Reminder period is over
        await supabase
          .from('exercise_reminders')
          .update({ completed: true })
          .eq('id', reminder.id);
      } else {
        await supabase
          .from('exercise_reminders')
          .update({ next_reminder_at: nextReminder.toISOString() })
          .eq('id', reminder.id);
      }
    }

    const nudges = webpush ? await sendDailyNudges(supabase, webpush) : 0;

    return NextResponse.json({ sent, processed: dueReminders?.length ?? 0, nudges });
  } catch (error) {
    console.error('Notification send cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── RELANCES DU QUOTIDIEN ──────────────────────────────────────────────────
// Une seule notification par personne et par passage, et uniquement dans la
// fenêtre horaire qui correspond. Un rappel qui arrive au mauvais moment ou
// trois fois de suite, c'est une app qu'on désinstalle.

type WebPush = typeof import('web-push');

async function sendDailyNudges(
  supabase: ReturnType<typeof createServerClient>,
  webpush: WebPush
): Promise<number> {
  // Heure locale française : les crons tournent en UTC.
  const parisHour = Number(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }).format(new Date())
  );

  const kind: 'matin' | 'pratique' | 'soir' | null =
    parisHour >= 7 && parisHour < 10
      ? 'matin'
      : parisHour >= 17 && parisHour < 20
        ? 'pratique'
        : parisHour >= 20 && parisHour < 23
          ? 'soir'
          : null;

  if (!kind) return 0;

  const today = todayISO();

  const [{ data: subs }, { data: checkins }, { data: practices }, { data: logs }] = await Promise.all([
    supabase.from('push_subscriptions').select('user_id, subscription').limit(500),
    supabase.from('checkins').select('user_id, moment').eq('day', today),
    supabase.from('practices').select('id, user_id, label, cadence').eq('active', true),
    supabase.from('practice_logs').select('practice_id, done').eq('done_on', today),
  ]);

  if (!subs?.length) return 0;

  const doneMoments = new Map<string, Set<string>>();
  for (const c of checkins ?? []) {
    const set = doneMoments.get(c.user_id) || new Set<string>();
    set.add(c.moment);
    doneMoments.set(c.user_id, set);
  }

  const loggedToday = new Set((logs ?? []).filter((l) => l.done).map((l) => l.practice_id));
  const practicesByUser = new Map<string, Array<{ id: string; label: string; cadence: string }>>();
  for (const p of practices ?? []) {
    const list = practicesByUser.get(p.user_id) || [];
    list.push({ id: p.id, label: p.label, cadence: p.cadence });
    practicesByUser.set(p.user_id, list);
  }

  const parisWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(new Date());
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(parisWeekday);

  // Une personne peut avoir plusieurs appareils : un message par personne,
  // envoyé à chacun de ses appareils.
  const byUser = new Map<string, unknown[]>();
  for (const s of subs) {
    const list = byUser.get(s.user_id) || [];
    list.push(s.subscription);
    byUser.set(s.user_id, list);
  }

  let sent = 0;

  for (const [userId, subscriptions] of byUser) {
    const moments = doneMoments.get(userId) || new Set<string>();
    let payload: { title: string; body: string; url: string; tag: string } | null = null;

    if (kind === 'matin' && !moments.has('matin')) {
      payload = {
        title: 'Ton intention du jour',
        body: 'Une phrase, et tu y vas.',
        url: '/checkin?moment=matin',
        tag: `checkin-matin-${today}`,
      };
    } else if (kind === 'soir' && !moments.has('soir')) {
      payload = {
        title: 'Déposer ta journée',
        body: 'Ce qui a marché, ce qui a coincé. Une minute.',
        url: '/checkin?moment=soir',
        tag: `checkin-soir-${today}`,
      };
    } else if (kind === 'pratique') {
      const pending = (practicesByUser.get(userId) || []).filter(
        (p) => !loggedToday.has(p.id) && (p.cadence === 'daily' || (p.cadence === 'weekdays' && isWeekday))
      );
      if (pending.length > 0) {
        payload = {
          title: pending[0].label,
          body: pending.length > 1 ? `Et ${pending.length - 1} autre${pending.length > 2 ? 's' : ''} pratique${pending.length > 2 ? 's' : ''}.` : 'Tu la fais maintenant ?',
          url: '/',
          tag: `pratique-${today}`,
        };
      }
    }

    if (!payload) continue;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(subscription as never, JSON.stringify(payload));
        sent++;
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('user_id', userId);
        } else {
          console.warn('Nudge send error:', err);
        }
      }
    }
  }

  console.log(`Nudges: kind=${kind} sent=${sent}`);
  return sent;
}
