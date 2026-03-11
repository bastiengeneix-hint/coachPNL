import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// Vercel Cron: every 2 hours
// Schedule: "0 */2 * * *"
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

    if (remindersError || !dueReminders?.length) {
      return NextResponse.json({ sent: 0 });
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

    for (const reminder of dueReminders) {
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
                body: `Rappel : ${reminder.exercise_description}`,
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

    return NextResponse.json({ sent, processed: dueReminders.length });
  } catch (error) {
    console.error('Notification send cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
