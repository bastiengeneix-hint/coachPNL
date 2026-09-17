import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';

const MAX_ACTIVE = 4;

/** Créer une mesure (2 à 4 maximum : au-delà on ne suit plus rien). */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (!label) return NextResponse.json({ error: 'Libellé manquant' }, { status: 400 });

    const supabase = createServerClient();

    const { count } = await supabase
      .from('measures')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('active', true);

    if ((count ?? 0) >= MAX_ACTIVE) {
      return NextResponse.json(
        { error: `Tu suis déjà ${MAX_ACTIVE} mesures. Archive-en une avant d'en ajouter.` },
        { status: 409 }
      );
    }

    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('statut', 'actif')
      .limit(1);

    const baseline = num(body.baseline);

    const { data, error } = await supabase
      .from('measures')
      .insert({
        user_id: session.user.id,
        program_id: program?.[0]?.id ?? null,
        label: label.slice(0, 80),
        question: typeof body.question === 'string' && body.question.trim()
          ? body.question.trim()
          : `De 0 à 10, où tu en es sur « ${label} » ?`,
        direction: body.direction === 'down' ? 'down' : 'up',
        baseline,
        cible: num(body.cible),
        cadence_days: Math.min(30, Math.max(1, Math.round(Number(body.cadence_days) || 7))),
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    // Le point de départ est un relevé : sinon la courbe commence dans le vide.
    if (baseline !== null) {
      await supabase.from('measure_entries').insert({
        measure_id: data.id,
        user_id: session.user.id,
        value: baseline,
        source: 'app',
        note: 'Point de départ',
      });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Measures POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}

/** Enregistrer un relevé, ou archiver une mesure. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { measure_id, value, note, archive } = await req.json();
    if (!measure_id) return NextResponse.json({ error: 'measure_id manquant' }, { status: 400 });

    const supabase = createServerClient();

    if (archive) {
      const { error } = await supabase
        .from('measures')
        .update({ active: false })
        .eq('id', measure_id)
        .eq('user_id', session.user.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    const v = num(value);
    if (v === null) return NextResponse.json({ error: 'Valeur entre 0 et 10 attendue' }, { status: 400 });

    // La mesure doit appartenir à l'utilisateur : on ne fait pas confiance à l'id reçu.
    const { data: measure } = await supabase
      .from('measures')
      .select('id')
      .eq('id', measure_id)
      .eq('user_id', session.user.id)
      .single();

    if (!measure) return NextResponse.json({ error: 'Mesure introuvable' }, { status: 404 });

    const { error } = await supabase.from('measure_entries').insert({
      measure_id,
      user_id: session.user.id,
      value: v,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      source: 'app',
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Measures PATCH error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 });
  }
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0 || n > 10) return null;
  return Math.round(n);
}
