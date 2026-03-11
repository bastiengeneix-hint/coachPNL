import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { retrievePassages } from '@/lib/rag/retrieve';
import Anthropic from '@anthropic-ai/sdk';

function getAnthropic() {
  const key = process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Fetch profile + context
    const [{ data: profileRow }, { data: contextRow }] = await Promise.all([
      supabase
        .from('profiles')
        .select('projets, patterns_sabotage, croyances_limitantes')
        .eq('user_id', session.user.id)
        .single(),
      supabase
        .from('active_contexts')
        .select('recent_themes, summary')
        .eq('user_id', session.user.id)
        .single(),
    ]);

    const themes = contextRow?.recent_themes || [];
    const croyances = profileRow?.croyances_limitantes || [];
    const patterns = profileRow?.patterns_sabotage || [];

    // RAG: search for exercise suggestions based on dominant themes
    const searchQuery = `exercice développement personnel ${themes.slice(0, 2).join(' ')} ${croyances.slice(0, 1).join(' ')}`.trim();
    const ragPassages = await retrievePassages(searchQuery);

    const ragBlock = ragPassages.length > 0
      ? `\nPassages de livres :\n${ragPassages.slice(0, 3).map((p) => `- ${p.livre} : ${p.content.slice(0, 200)}`).join('\n')}`
      : '';

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Tu es un assistant qui recommande des exercices de développement personnel.
Les exercices disponibles sont :
1. "roue_vie" — Roue de la Vie (noter 8 domaines de vie sur 10)
2. "triangle_equilibre" — Triangle d'Équilibre (équilibrer 3 domaines)
3. "ikigai" — IKIGAI (trouver son ikigai via 4 cercles)
4. "systeme12" — Système 1/Système 2 (analyser une question ou décision avec l'instinct vs la réflexion, basé sur Kahneman)

Réponds UNIQUEMENT en JSON : un tableau de 1 à 3 objets [{"type": "...", "reason": "..."}]
- type : l'identifiant exact de l'exercice
- reason : 1 phrase expliquant pourquoi cet exercice est pertinent pour cette personne maintenant`,
      messages: [
        {
          role: 'user',
          content: `Profil de l'utilisateur :
- Thèmes récents : ${themes.join(', ') || 'aucun'}
- Croyances limitantes : ${croyances.join(', ') || 'aucune'}
- Patterns de sabotage : ${patterns.join(', ') || 'aucun'}
- Projets : ${profileRow?.projets?.join(', ') || 'aucun'}${ragBlock}

Quels exercices recommandes-tu en priorité ?`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json([]);
    }

    try {
      const suggestions = JSON.parse(textContent.text);
      return NextResponse.json(Array.isArray(suggestions) ? suggestions : []);
    } catch {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Exercise suggest error:', error);
    return NextResponse.json([]);
  }
}
