import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

const defaultEmptyProfile: Profile = {
  projets: [],
  patterns_sabotage: [],
  barrieres_ulp: [],
  croyances_limitantes: [],
  preferences: { ce_qui_aide: [], ce_qui_bloque: [], ton: 'mix' as const },
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
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json(defaultEmptyProfile);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile GET error:', error);
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

    const body: Partial<Profile> = await request.json();

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('profiles')
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
      console.error('Error upserting profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
