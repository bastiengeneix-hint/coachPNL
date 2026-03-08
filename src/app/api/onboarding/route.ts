import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        onboarding_complete: true,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error completing onboarding:', error);
      return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
