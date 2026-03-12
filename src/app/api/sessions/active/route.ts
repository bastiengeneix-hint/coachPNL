import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Find the most recent non-ended session (within the last 24h)
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('ended', false)
      .gte('date', cutoff.toISOString())
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json(null);
    }

    // Only return if it has at least 1 message (was actually started)
    const messages = data.messages as unknown[];
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Active session error:', error);
    return NextResponse.json(null);
  }
}
