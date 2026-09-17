import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

const STATUTS = ['actif', 'atteint', 'abandonne', 'en_pause'] as const;

/** Créer ou mettre à jour le parcours à la main (le coach le fait, lui, en séance). */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const objectif = typeof body.objectif === 'string' ? body.objectif.trim() : '';
    if (!objectif) return NextResponse.json({ error: 'Objectif manquant' }, { status: 400 });

    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from('programs')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('statut', 'actif')
      .limit(1);

    const patch = {
      objectif,
      pourquoi_maintenant: str(body.pourquoi_maintenant),
      etat_present: str(body.etat_present),
      etat_desire: str(body.etat_desire),
      criteres_reussite: Array.isArray(body.criteres_reussite)
        ? body.criteres_reussite.filter((c: unknown) => typeof c === 'string').slice(0, 6)
        : [],
      echeance: str(body.echeance),
    };

    if (existing?.[0]) {
      const { error } = await supabase.from('programs').update(patch).eq('id', existing[0].id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ id: existing[0].id, created: false });
    }

    const { data, error } = await supabase
      .from('programs')
      .insert({ user_id: session.user.id, ...patch })
      .select('id')
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ id: data.id, created: true });
  } catch (error) {
    console.error('Program POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement du parcours' }, { status: 500 });
  }
}

/** Cocher un jalon, ou refermer le parcours. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { milestone_id, done, statut, bilan_final } = await req.json();
    const supabase = createServerClient();

    if (milestone_id) {
      const { error } = await supabase
        .from('program_milestones')
        .update({ done: done !== false, done_at: done !== false ? new Date().toISOString() : null })
        .eq('id', milestone_id)
        .eq('user_id', session.user.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (statut && (STATUTS as readonly string[]).includes(statut)) {
      const { error } = await supabase
        .from('programs')
        .update({
          statut,
          closed_at: statut === 'actif' ? null : new Date().toISOString(),
          bilan_final: str(bilan_final),
        })
        .eq('user_id', session.user.id)
        .eq('statut', 'actif');
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  } catch (error) {
    console.error('Program PATCH error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
