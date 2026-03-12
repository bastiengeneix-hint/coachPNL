import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { input, input_type } = await request.json();
    if (!input || !input_type) {
      return NextResponse.json({ error: 'Missing input or input_type' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch user profile for context
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('projets, patterns_sabotage, croyances_limitantes')
      .eq('user_id', session.user.id)
      .single();

    // RAG: search for relevant passages about Kahneman / decision-making
    const searchQuery = `système 1 système 2 Kahneman pensée rapide lente ${input}`.trim();
    const ragPassages = await retrievePassages(searchQuery);

    const ragBlock = ragPassages.length > 0
      ? `\nPassages de livres pertinents :\n${ragPassages.map((p) => `- ${p.livre} (p.${p.page}) : ${p.content.slice(0, 300)}`).join('\n')}`
      : '';

    const profileBlock = profileRow
      ? `\nProfil : projets=${JSON.stringify(profileRow.projets)}, croyances limitantes=${JSON.stringify(profileRow.croyances_limitantes)}, patterns de sabotage=${JSON.stringify(profileRow.patterns_sabotage)}`
      : '';

    const typeLabel = input_type === 'question' ? 'une question' : input_type === 'decision' ? 'une décision' : 'un souhait';

    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: `Tu es un coach PNL expert en sciences cognitives. Tu utilises le modèle Système 1 / Système 2 de Daniel Kahneman pour analyser les pensées de ton client. Tu le tutoies.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{"systeme1": "...", "systeme2": "...", "conclusion": "...", "profile_evolution": {"add_croyances": [], "remove_croyances": [], "add_patterns": [], "remove_patterns": []}}

- systeme1 : La réponse du Système 1 (pensée rapide, instinctive, émotionnelle). C'est ce que l'utilisateur ressent immédiatement, son réflexe, ses biais. Écris comme si tu donnais voix à son instinct. 2-4 phrases, ton direct.
- systeme2 : La réponse du Système 2 (pensée lente, analytique, rationnelle). C'est l'analyse posée, les faits, la logique. Ce que dirait la partie rationnelle. 2-4 phrases, ton posé.
- conclusion : TON avis de coach. Ce que cet écart entre les deux systèmes révèle sur l'utilisateur. Où est le vrai blocage ? Quelle croyance sous-jacente ? Et une piste concrète. 3-5 phrases, incisif et personnel.
- profile_evolution : Ce que cet exercice révèle sur le profil de l'utilisateur. Compare avec son profil actuel et n'ajoute que ce qui est NOUVEAU :
  - add_croyances : croyances limitantes qui se révèlent dans l'écart entre S1 et S2 (ex: "Je ne mérite pas le succès")
  - remove_croyances : croyances du profil actuel que cet exercice semble remettre en question
  - add_patterns : patterns de sabotage qui émergent (ex: "Rationalise pour éviter d'agir")
  - remove_patterns : patterns du profil actuel qui semblent dépassés
  Si rien de nouveau, laisse les tableaux vides.

Utilise le profil de l'utilisateur pour personnaliser l'analyse — fais des liens avec ses patterns et croyances.`,
      messages: [
        {
          role: 'user',
          content: `L'utilisateur soumet ${typeLabel} à l'exercice Système 1 / Système 2.

Sa formulation : "${input}"
${profileBlock}${ragBlock}`,
        },
      ],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response' }, { status: 500 });
    }

    let raw = textContent.text.trim();
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) raw = fenceMatch[1].trim();

    const parsed = JSON.parse(raw);
    return NextResponse.json({
      systeme1: parsed.systeme1 || '',
      systeme2: parsed.systeme2 || '',
      conclusion: parsed.conclusion || '',
      profile_evolution: {
        add_croyances: parsed.profile_evolution?.add_croyances || [],
        remove_croyances: parsed.profile_evolution?.remove_croyances || [],
        add_patterns: parsed.profile_evolution?.add_patterns || [],
        remove_patterns: parsed.profile_evolution?.remove_patterns || [],
      },
    });
  } catch (error) {
    console.error('Systeme12 exercise error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
