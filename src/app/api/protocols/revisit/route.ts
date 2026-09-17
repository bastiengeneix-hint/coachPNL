import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

/** Marquer un protocole comme réévalué (le coach le fait aussi en séance). */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { run_id, note, intensite_apres, postpone_days } = await req.json();
    if (!run_id) return NextResponse.json({ error: 'run_id manquant' }, { status: 400 });

    const supabase = createServerClient();

    // Repousser plutôt que solder : « pas maintenant » n'est pas « c'est réglé ».
    if (postpone_days) {
      const days = Math.min(60, Math.max(1, Math.round(Number(postpone_days))));
      const { error } = await supabase
        .from('protocol_runs')
        .update({ revisit_at: new Date(Date.now() + days * 86400000).toISOString().slice(0, 10) })
        .eq('id', run_id)
        .eq('user_id', session.user.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, postponed: days });
    }

    const apres = Number.isFinite(Number(intensite_apres))
      ? Math.min(10, Math.max(0, Math.round(Number(intensite_apres))))
      : null;

    const { error } = await supabase
      .from('protocol_runs')
      .update({
        revisited: true,
        revisit_note: typeof note === 'string' && note.trim() ? note.trim() : null,
        ...(apres !== null ? { intensite_apres: apres } : {}),
      })
      .eq('id', run_id)
      .eq('user_id', session.user.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Protocol revisit error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}
