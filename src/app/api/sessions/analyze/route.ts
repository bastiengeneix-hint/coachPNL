import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { analyzeSession } from '@/lib/coach/session-analyzer';
import type { Message, Profile } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { messages } = (await req.json()) as { messages: Message[] };

    if (!messages || messages.length < 2) {
      return NextResponse.json({ error: 'Pas assez de messages à analyser' }, { status: 400 });
    }

    // Fetch profile for evolution comparison
    const supabase = createServerClient();
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    const defaultPrefs = { ce_qui_aide: [] as string[], ce_qui_bloque: [] as string[], ton: 'mix' as const };
    const profile: Profile = profileRow
      ? {
          projets: profileRow.projets || [],
          patterns_sabotage: profileRow.patterns_sabotage || [],
          barrieres_ulp: profileRow.barrieres_ulp || [],
          croyances_limitantes: profileRow.croyances_limitantes || [],
          preferences: profileRow.preferences && typeof profileRow.preferences === 'object' && !Array.isArray(profileRow.preferences)
            ? { ...defaultPrefs, ...(profileRow.preferences as Record<string, unknown>) } as Profile['preferences']
            : defaultPrefs,
        }
      : {
          projets: [],
          patterns_sabotage: [],
          barrieres_ulp: [],
          croyances_limitantes: [],
          preferences: defaultPrefs,
        };

    const analysis = await analyzeSession(messages, profile);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Session analyze error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'analyse' }, { status: 500 });
  }
}
