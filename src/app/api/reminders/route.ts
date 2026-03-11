import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

const FREQUENCY_HOURS: Record<string, number> = {
  daily: 24,
  every_2_days: 48,
  every_3_days: 72,
  weekly: 168,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('exercise_reminders')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Reminders GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { session_id, exercise_description, frequency, end_date, message } = await req.json();

    if (!exercise_description || !frequency || !end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const hours = FREQUENCY_HOURS[frequency] || 24;
    const nextReminder = new Date();
    nextReminder.setHours(nextReminder.getHours() + hours);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('exercise_reminders')
      .insert({
        user_id: session.user.id,
        session_id: session_id || null,
        exercise_description,
        frequency,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(end_date).toISOString().split('T')[0],
        next_reminder_at: nextReminder.toISOString(),
        message: message || `Rappel : ${exercise_description}`,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reminders POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id, completed } = await req.json();

    const supabase = createServerClient();
    const { error } = await supabase
      .from('exercise_reminders')
      .update({ completed: completed ?? true })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error updating reminder:', error);
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reminders PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
