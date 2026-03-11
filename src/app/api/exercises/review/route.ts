import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { createServerClient } from '@/lib/supabase/server';
import { retrievePassages } from '@/lib/rag/retrieve';
import Anthropic from '@anthropic-ai/sdk';
import { getExerciseDefinition } from '@/lib/exercises/definitions';

function getAnthropic() {
  const key = process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { exercise_type, data, insights } = await request.json();
    if (!exercise_type || !data) {
      return NextResponse.json({ error: 'Missing exercise_type or data' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch user profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('projets, patterns_sabotage, croyances_limitantes')
      .eq('user_id', session.user.id)
      .single();

    // RAG: search for relevant passages based on exercise theme + reflection
    const reflection = data.reflection || '';
    const def = getExerciseDefinition(exercise_type);
    const searchQuery = `exercice ${def?.title || exercise_type} ${reflection}`.trim();
    const ragPassages = await retrievePassages(searchQuery);

    const ragBlock = ragPassages.length > 0
      ? `\nPassages de livres pertinents :\n${ragPassages.map((p) => `- ${p.livre} (p.${p.page}) : ${p.content.slice(0, 300)}`).join('\n')}`
      : '';

    const profileBlock = profileRow
      ? `Profil : projets=${JSON.stringify(profileRow.projets)}, croyances=${JSON.stringify(profileRow.croyances_limitantes)}, patterns=${JSON.stringify(profileRow.patterns_sabotage)}`
      : '';

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `Tu es un coach PNL bienveillant et perspicace. Tu donnes un feedback structuré après un exercice de développement personnel. Sois chaleureux mais incisif. Tutoie l'utilisateur.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{"observation": "...", "question": "...", "piste": "..."}

- observation : ce que tu remarques dans les résultats (déséquilibres, cohérence, zones d'ombre, forces). 2-3 phrases max.
- question : UNE question puissante pour aller plus loin.
- piste : un conseil concret ou un lien avec un concept des livres si pertinent. 1-2 phrases.`,
      messages: [
        {
          role: 'user',
          content: `L'utilisateur vient de faire l'exercice "${def?.title || exercise_type}".

Résultats : ${JSON.stringify(data)}
${insights?.length > 0 ? `Ses insights : ${insights.join(', ')}` : ''}
${profileBlock}${ragBlock}`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from coach' }, { status: 500 });
    }

    try {
      // Strip markdown code blocks (```json...```) that Claude sometimes adds
      let raw = textContent.text.trim();
      const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) raw = fenceMatch[1].trim();

      const review = JSON.parse(raw);
      return NextResponse.json({
        observation: review.observation || '',
        question: review.question || '',
        piste: review.piste || '',
      });
    } catch {
      // If JSON parsing fails, return a structured fallback
      return NextResponse.json({
        observation: textContent.text.replace(/```(?:json)?|```/g, '').trim(),
        question: '',
        piste: '',
      });
    }
  } catch (error) {
    console.error('Exercise review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
