import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { parseFeedback } from '@/lib/coach/feedback';
import type { Json } from '@/lib/supabase/types';

// ─── RETOUR DE FIN DE SÉANCE ────────────────────────────────────────────────
// Quatre curseurs posés sur l'écran de fin. Ils repartent dans le prompt de la
// séance suivante : c'est comme ça que le coach apprend ce qui marche pour
// cette personne-là.

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
    const feedback = parseFeedback(body.feedback, new Date().toISOString());
    if (!sessionId || !feedback) {
      return NextResponse.json({ error: 'Retour incomplet' }, { status: 400 });
    }

    const supabase = createServerClient();
    // Le filtre sur user_id fait le contrôle d'appartenance : une séance d'un
    // autre compte ne renvoie aucune ligne.
    const { data, error } = await supabase
      .from('sessions')
      .update({ feedback: feedback as unknown as Json })
      .eq('id', sessionId)
      .eq('user_id', session.user.id)
      .select('id');

    if (error) {
      console.error('Feedback: update failed:', error.message);
      return NextResponse.json({ error: "Le retour n'a pas pu être enregistré" }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Séance introuvable' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
