import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { UTILITY_MODEL } from '@/lib/ai/models';
import { getCoachingSnapshot, todayISO } from '@/lib/program/snapshot';
import { buildSnapshotBriefing } from '@/lib/prompts/program-block';
import { DEFAULT_COACH_NAME } from '@/lib/prompts/system-prompt';
import { screenRisk } from '@/lib/coach/safety';

// ─── CHECK-IN QUOTIDIEN ─────────────────────────────────────────────────────
// 60 secondes, pas une conversation. C'est le fil entre deux séances : sans lui,
// le coach ne sait rien de ce qui s'est passé dans la vraie vie.
// Il repart avec UNE phrase du coach — courte, précise, jamais un compliment
// générique. C'est ce qui donne envie de revenir le lendemain.

const MOMENTS = ['matin', 'soir'] as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const supabase = createServerClient();
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('day', todayISO())
      .order('created_at');

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error('Checkins GET error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const moment = (MOMENTS as readonly string[]).includes(body.moment) ? body.moment : 'soir';

    const payload = {
      user_id: session.user.id,
      day: todayISO(),
      moment,
      intention: str(body.intention),
      wins: arr(body.wins),
      frictions: arr(body.frictions),
      energie: num(body.energie),
      note: str(body.note),
    };

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('checkins')
      .upsert(payload, { onConflict: 'user_id,day,moment' })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    // Réaction du coach : une phrase. On la calcule après l'écriture pour que le
    // check-in soit enregistré même si le modèle tombe.
    const reply = await buildCoachReply(supabase, session.user.id, {
      moment,
      intention: payload.intention,
      wins: payload.wins,
      frictions: payload.frictions,
      energie: payload.energie,
      note: payload.note,
    });

    if (reply) {
      await supabase.from('checkins').update({ coach_reply: reply }).eq('id', data.id);
    }

    return NextResponse.json({ ...data, coach_reply: reply ?? data.coach_reply });
  } catch (error) {
    console.error('Checkins POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 });
  }
}

async function buildCoachReply(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  checkin: {
    moment: string;
    intention: string | null;
    wins: string[];
    frictions: string[];
    energie: number | null;
    note: string | null;
  }
): Promise<string | null> {
  const apiKey = process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const written = [checkin.intention, checkin.note, ...checkin.wins, ...checkin.frictions]
    .filter(Boolean)
    .join(' ');

  // Un check-in qui contient de la détresse n'appelle pas une petite phrase de
  // coach : il appelle une vraie séance. On le dit, et on s'arrête là.
  const risk = screenRisk(written);
  if (risk !== 'none') {
    return risk === 'crise'
      ? "Ce que tu écris là, je ne le laisse pas passer dans un check-in. Ouvre une séance maintenant, ou appelle le 3114 (gratuit, 24h/24) — et parle à quelqu'un ce soir."
      : "Là c'est plus qu'un check-in. Ouvre une séance de déblocage quand tu peux, on regarde ça ensemble.";
  }

  if (!written.trim()) return null;

  try {
    const [{ data: userRow }, { data: profileRow }] = await Promise.all([
      supabase.from('users').select('name').eq('id', userId).single(),
      supabase.from('profiles').select('preferences').eq('user_id', userId).single(),
    ]);

    const prefs = (profileRow?.preferences || {}) as Record<string, unknown>;
    const coachName = typeof prefs.coach_name === 'string' && prefs.coach_name ? prefs.coach_name : DEFAULT_COACH_NAME;
    const userName = userRow?.name || 'ami';

    const snapshot = await getCoachingSnapshot(supabase, userId);

    const content = [
      checkin.intention ? `Intention : ${checkin.intention}` : '',
      checkin.wins.length > 0 ? `Ce qui a marché : ${checkin.wins.join(' · ')}` : '',
      checkin.frictions.length > 0 ? `Ce qui a coincé : ${checkin.frictions.join(' · ')}` : '',
      checkin.energie !== null ? `Énergie : ${checkin.energie}/10` : '',
      checkin.note ? `Note : ${checkin.note}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: UTILITY_MODEL,
      max_tokens: 160,
      system: `Tu es ${coachName}, le coach de ${userName}. Tu réagis à son check-in ${checkin.moment === 'matin' ? 'du matin' : 'du soir'} en UNE phrase, deux au maximum.

Règles :
- Tu tutoies, tu écris en français oral, court.
- Tu t'appuies sur ce qu'il vient d'écrire ET sur son suivi. Tu nommes un fait précis, pas un encouragement générique.
- INTERDIT : "bravo", "c'est super", "continue comme ça", "je comprends", "n'oublie pas de", tout emoji, toute liste.
- Si ce qu'il écrit contredit son objectif ou une pratique décrochée, tu le dis franchement, sans faire la morale.
- Tu ne poses pas plus d'UNE question, et seulement si elle sert vraiment.
- Tu ne dis jamais que tu es une IA, tu ne parles pas de toi.

Réponds avec la phrase seule, sans guillemets.`,
      messages: [
        {
          role: 'user',
          content: `## Son suivi
${buildSnapshotBriefing(snapshot)}

## Son check-in ${checkin.moment}
${content}`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return null;

    const text = block.text.trim().replace(/^["«\s]+|["»\s]+$/g, '');
    return text.slice(0, 400) || null;
  } catch (error) {
    console.warn('Checkin coach reply skipped:', error);
    return null;
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 600) : null;
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 200))
    .slice(0, 4);
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n) || n < 0 || n > 10) return null;
  return Math.round(n);
}
