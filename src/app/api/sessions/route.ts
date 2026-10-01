import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

const CLIENT_WRITABLE = [
  'id',
  'date',
  'mode',
  'messages',
  'insights',
  'themes',
  'exercice_propose',
  'exercice_fait',
  'summary',
  'coach_summary',
  'actions',
  'ended',
] as const;

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

    // Seulement les colonnes que le navigateur a le droit d'écrire. La lettre et
    // le retour de fin de séance sont écrits côté serveur : un objet de séance
    // renvoyé tel quel ne doit ni les écraser, ni casser la sauvegarde si une
    // colonne manque encore en base.
    const body = (await request.json()) as Record<string, unknown>;
    const sessionData: Record<string, unknown> = { user_id: userId };
    for (const key of CLIENT_WRITABLE) {
      if (key in body) sessionData[key] = body[key];
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('sessions')
      .upsert(sessionData as Database['public']['Tables']['sessions']['Insert'], { onConflict: 'id' })
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
