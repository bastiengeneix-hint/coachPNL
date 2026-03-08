import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import type { ActiveContext } from '@/types';

const defaultEmptyContext: ActiveContext = {
  summary: '',
  last_updated: new Date().toISOString(),
  recent_themes: [],
  pending_exercice: null,
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('active_contexts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json(defaultEmptyContext);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Context GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body: ActiveContext = await request.json();

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('active_contexts')
      .upsert(
        {
          user_id: userId,
          ...body,
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting context:', error);
      return NextResponse.json({ error: 'Failed to update context' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Context PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
