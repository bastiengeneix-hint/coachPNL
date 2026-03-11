import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get recent sessions with actions
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('id, date, mode, actions')
      .eq('user_id', session.user.id)
      .not('actions', 'is', null)
      .order('date', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching actions:', error);
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
    }

    // Flatten actions with session context
    const allActions = (sessions ?? []).flatMap((s) => {
      const actions = Array.isArray(s.actions) ? (s.actions as Array<{ text: string; done: boolean }>) : [];
      return actions.map((a, idx) => ({
        session_id: s.id,
        session_date: s.date,
        session_mode: s.mode,
        index: idx,
        text: a.text,
        done: a.done,
      }));
    });

    return NextResponse.json(allActions);
  } catch (error) {
    console.error('Actions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { session_id, index, done } = await req.json();

    const supabase = createServerClient();

    // Fetch the session
    const { data: sessionRow, error: fetchError } = await supabase
      .from('sessions')
      .select('actions')
      .eq('id', session_id)
      .eq('user_id', session.user.id)
      .single();

    if (fetchError || !sessionRow) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const actions = Array.isArray(sessionRow.actions) ? ([...sessionRow.actions] as Array<{ text: string; done: boolean }>) : [];
    if (index >= 0 && index < actions.length) {
      actions[index] = { ...actions[index], done };
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ actions })
      .eq('id', session_id)
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Error updating action:', updateError);
      return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Actions PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
