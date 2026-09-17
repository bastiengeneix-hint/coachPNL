import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { applyProfileEvolution } from '@/lib/memory/apply-evolution';
import type { ProfileEvolution } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const evolution: ProfileEvolution = await request.json();
    const supabase = createServerClient();

    const result = await applyProfileEvolution(supabase, session.user.id, evolution);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Profile evolve error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Profile not found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
