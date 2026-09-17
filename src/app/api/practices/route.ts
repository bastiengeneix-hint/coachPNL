import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/program/snapshot';

const CADENCES = ['daily', 'weekdays', 'weekly'] as const;

/** Créer une pratique quotidienne (le coach en crée aussi en fin de séance). */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) return NextResponse.json({ error: 'Libellé manquant' }, { status: 400 });

    const cadence = (CADENCES as readonly string[]).includes(body.cadence) ? body.cadence : 'daily';
    const supabase = createServerClient();

    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('statut', 'actif')
      .limit(1);

    const { data, error } = await supabase
      .from('practices')
      .insert({
        user_id: session.user.id,
        program_id: program?.[0]?.id ?? null,
        label: label.slice(0, 160),
        pourquoi: str(body.pourquoi),
        declencheur: str(body.declencheur),
        cadence,
        target_per_week: cadence === 'weekly' ? 1 : cadence === 'weekdays' ? 5 : 7,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Practices POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}

/** Cocher (ou décocher) la pratique du jour, ou l'archiver. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { practice_id, done, note, archive, done_on } = await req.json();
    if (!practice_id) return NextResponse.json({ error: 'practice_id manquant' }, { status: 400 });

    const supabase = createServerClient();

    if (archive) {
      const { error } = await supabase
        .from('practices')
        .update({ active: false, archived_at: new Date().toISOString() })
        .eq('id', practice_id)
        .eq('user_id', session.user.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    // On ne coche pas la pratique de quelqu'un d'autre : l'id vient du client.
    const { data: owned } = await supabase
      .from('practices')
      .select('id')
      .eq('id', practice_id)
      .eq('user_id', session.user.id)
      .single();

    if (!owned) return NextResponse.json({ error: 'Pratique introuvable' }, { status: 404 });

    // Le jour est fixé côté serveur sauf rattrapage explicite d'hier.
    const day = typeof done_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(done_on) ? done_on : todayISO();

    const { error } = await supabase.from('practice_logs').upsert(
      {
        practice_id,
        user_id: session.user.id,
        done_on: day,
        done: done !== false,
        note: str(note),
      },
      { onConflict: 'practice_id,done_on' }
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, done_on: day });
  } catch (error) {
    console.error('Practices PATCH error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 });
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
