import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { generateBilan } from '@/lib/bilans/generator';
import type { BilanType } from '@/types';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('bilans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('period_start', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error fetching bilans:', error);
      return NextResponse.json({ error: 'Failed to fetch bilans' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Bilans GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { type } = (await req.json()) as { type: BilanType };

    if (!['weekly', 'monthly', 'yearly'].includes(type)) {
      return NextResponse.json({ error: 'Invalid bilan type' }, { status: 400 });
    }

    // Calculate period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (type === 'weekly') {
      periodEnd = new Date(now);
      periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - 7);
    } else if (type === 'monthly') {
      periodEnd = new Date(now);
      periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // last day of prev month
    } else {
      periodStart = new Date(now.getFullYear() - 1, 0, 1);
      periodEnd = new Date(now.getFullYear() - 1, 11, 31);
    }

    const startStr = periodStart.toISOString().split('T')[0];
    const endStr = periodEnd.toISOString().split('T')[0];

    const supabase = createServerClient();

    // Check if bilan already exists for this period
    const { data: existing } = await supabase
      .from('bilans')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('type', type)
      .eq('period_start', startStr)
      .single();

    if (existing) {
      // Return existing bilan
      const { data: existingBilan } = await supabase
        .from('bilans')
        .select('*')
        .eq('id', existing.id)
        .single();
      return NextResponse.json(existingBilan);
    }

    // Fetch sessions for the period
    const { data: sessions } = await supabase
      .from('sessions')
      .select('date, mode, themes, insights, summary, coach_summary, actions, exercice_propose')
      .eq('user_id', session.user.id)
      .gte('date', periodStart.toISOString())
      .lte('date', periodEnd.toISOString())
      .order('date', { ascending: true });

    // Count exercises
    const { count: exercisesCount } = await supabase
      .from('exercise_results')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .gte('completed_at', periodStart.toISOString())
      .lte('completed_at', periodEnd.toISOString());

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

    if (sessionData.length === 0) {
      return NextResponse.json({ error: 'Pas de sessions sur cette période' }, { status: 400 });
    }

    // Generate bilan
    const content = await generateBilan(type, startStr, endStr, sessionData, exercisesCount ?? 0);

    // Save
    const { data: bilan, error } = await supabase
      .from('bilans')
      .insert({
        user_id: session.user.id,
        type,
        period_start: startStr,
        period_end: endStr,
        content: JSON.parse(JSON.stringify(content)),
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving bilan:', error);
      return NextResponse.json({ error: 'Failed to save bilan' }, { status: 500 });
    }

    return NextResponse.json(bilan);
  } catch (error) {
    console.error('Bilans POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
