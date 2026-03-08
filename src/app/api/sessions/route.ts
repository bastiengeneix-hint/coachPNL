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
    const userId = session.user.id;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const recent = searchParams.get('recent');

    let query = supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (recent) {
      const days = parseInt(recent, 10);
      if (!isNaN(days) && days > 0) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        query = query.gte('date', cutoff.toISOString());
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Sessions GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const sessionData = {
      ...body,
      user_id: userId,
    };

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('sessions')
      .upsert(sessionData, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('Error upserting session:', error);
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Sessions POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
