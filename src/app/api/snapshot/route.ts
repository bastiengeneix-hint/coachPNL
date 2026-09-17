import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { getCoachingSnapshot } from '@/lib/program/snapshot';
import { buildFollowUpAgenda } from '@/lib/prompts/program-block';

// L'état du suivi, tel que l'accueil et la page parcours l'affichent — et tel
// que le coach le lit. Une seule source pour les deux, sinon ils divergent.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const supabase = createServerClient();
    const snapshot = await getCoachingSnapshot(supabase, session.user.id);

    return NextResponse.json({ ...snapshot, agenda: buildFollowUpAgenda(snapshot) });
  } catch (error) {
    console.error('Snapshot error:', error);
    return NextResponse.json({ error: 'Erreur lors de la lecture du suivi' }, { status: 500 });
  }
}
