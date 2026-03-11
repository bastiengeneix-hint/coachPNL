import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateBilan } from '@/lib/bilans/generator';

// Vercel Cron: monthly on the 1st at 8am, yearly on Jan 1st
// Schedule: "0 8 1 * *" (monthly) — yearly is just the January run
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const now = new Date();

    // Get all active users (who have sessions in the last 60 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);

    const { data: activeUsers } = await supabase
      .from('sessions')
      .select('user_id')
      .gte('date', cutoff.toISOString())
      .limit(500);

    const uniqueUserIds = [...new Set((activeUsers ?? []).map((u) => u.user_id))];
    let generated = 0;

    for (const userId of uniqueUserIds) {
      // Monthly bilan for previous month
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Check if already exists
      const { data: existing } = await supabase
        .from('bilans')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'monthly')
        .eq('period_start', monthStart.toISOString().split('T')[0])
        .single();

      if (!existing) {
        const { data: sessions } = await supabase
          .from('sessions')
          .select('date, mode, themes, insights, summary, coach_summary, actions, exercice_propose')
          .eq('user_id', userId)
          .gte('date', monthStart.toISOString())
          .lte('date', monthEnd.toISOString())
          .order('date', { ascending: true });

        const { count: exercisesCount } = await supabase
          .from('exercise_results')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('completed_at', monthStart.toISOString())
          .lte('completed_at', monthEnd.toISOString());

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

        if (sessionData.length > 0) {
          const content = await generateBilan(
            'monthly',
            monthStart.toISOString().split('T')[0],
            monthEnd.toISOString().split('T')[0],
            sessionData,
            exercisesCount ?? 0
          );

          await supabase.from('bilans').insert({
            user_id: userId,
            type: 'monthly',
            period_start: monthStart.toISOString().split('T')[0],
            period_end: monthEnd.toISOString().split('T')[0],
            content: JSON.parse(JSON.stringify(content)),
          });

          generated++;
        }
      }

      // Yearly bilan (only on January)
      if (now.getMonth() === 0) {
        const yearStart = new Date(now.getFullYear() - 1, 0, 1);
        const yearEnd = new Date(now.getFullYear() - 1, 11, 31);

        const { data: existingYearly } = await supabase
          .from('bilans')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'yearly')
          .eq('period_start', yearStart.toISOString().split('T')[0])
          .single();

        if (!existingYearly) {
          const { data: sessions } = await supabase
            .from('sessions')
            .select('date, mode, themes, insights, summary, coach_summary, actions, exercice_propose')
            .eq('user_id', userId)
            .gte('date', yearStart.toISOString())
            .lte('date', yearEnd.toISOString())
            .order('date', { ascending: true });

          const { count: exercisesCount } = await supabase
            .from('exercise_results')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('completed_at', yearStart.toISOString())
            .lte('completed_at', yearEnd.toISOString());

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

          if (sessionData.length > 0) {
            const content = await generateBilan(
              'yearly',
              yearStart.toISOString().split('T')[0],
              yearEnd.toISOString().split('T')[0],
              sessionData,
              exercisesCount ?? 0
            );

            await supabase.from('bilans').insert({
              user_id: userId,
              type: 'yearly',
              period_start: yearStart.toISOString().split('T')[0],
              period_end: yearEnd.toISOString().split('T')[0],
              content: JSON.parse(JSON.stringify(content)),
            });

            generated++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, generated, users: uniqueUserIds.length });
  } catch (error) {
    console.error('Bilan generation cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
