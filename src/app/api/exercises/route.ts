import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = supabase
      .from('exercise_results')
      .select('*')
      .eq('user_id', session.user.id)
      .order('completed_at', { ascending: false });

    if (type) {
      query = query.eq('exercise_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching exercise results:', error);
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Exercises GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exercise_type, data, insights } = body;

    if (!exercise_type || !data) {
      return NextResponse.json({ error: 'Missing exercise_type or data' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: result, error } = await supabase
      .from('exercise_results')
      .insert({
        user_id: session.user.id,
        exercise_type,
        data,
        insights: insights || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving exercise result:', error);
      return NextResponse.json({ error: 'Failed to save exercise' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Exercises POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
