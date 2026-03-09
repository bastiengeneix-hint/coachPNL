import Anthropic from '@anthropic-ai/sdk';
import { Message, SessionAnalysis, Profile } from '@/types';

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

const ANALYSIS_PROMPT = `Tu es un analyste de sessions de coaching PNL. On te donne une conversation entre un coach et un utilisateur, ainsi que le profil actuel de l'utilisateur.

Analyse la conversation et retourne un JSON avec exactement cette structure :

{
  "insights": [
    { "text": "description de la prise de conscience", "isBreakthrough": false },
    { "text": "description d'un moment de rupture/transformation", "isBreakthrough": true }
  ],
  "themes": ["thème1", "thème2"],
  "exercice_propose": "description de l'exercice proposé par le coach, ou null",
  "summary": "résumé en 2-3 phrases de la session",
  "profile_evolution": {
    "add_croyances": ["nouvelle croyance limitante identifiée"],
    "remove_croyances": ["croyance remise en question ou dépassée"],
    "add_patterns": ["nouveau pattern de sabotage détecté"],
    "remove_patterns": ["pattern dépassé"],
    "add_projets": ["nouveau projet mentionné"]
  }
}

Règles :
- insights : extrais les vraies prises de conscience de l'utilisateur (pas les questions du coach). Un breakthrough = un moment où l'utilisateur voit quelque chose qu'il ne voyait pas avant, une croyance qui se fissure, une émotion nommée pour la première fois.
- themes : utilise des mots simples en français (ex: "légitimité", "peur du regard", "relation au père", "procrastination", "argent", "perfectionnisme", "confiance").
- exercice_propose : l'exercice concret proposé par le coach pendant la session. null si aucun.
- summary : résumé factuel et humain de ce qui s'est passé dans la session.
- profile_evolution : compare avec le profil actuel. N'ajoute que ce qui est NOUVEAU. Pour remove_croyances/remove_patterns, ne retire que ce qui a été CLAIREMENT remis en question ou dépassé pendant cette session. Si aucune évolution, laisse les tableaux vides.

Retourne UNIQUEMENT le JSON, sans commentaire ni markdown.`;

export async function analyzeSession(
  messages: Message[],
  profile: Profile
): Promise<SessionAnalysis> {
  const conversation = messages
    .map((m) => `${m.role === 'user' ? 'Utilisateur' : 'Coach'}: ${m.content}`)
    .join('\n\n');

  const profileSummary = [
    profile.projets.length > 0 ? `Projets: ${profile.projets.join(', ')}` : '',
    profile.patterns_sabotage.length > 0 ? `Patterns sabotage: ${profile.patterns_sabotage.join(', ')}` : '',
    profile.croyances_limitantes.length > 0 ? `Croyances limitantes: ${profile.croyances_limitantes.join(', ')}` : '',
    profile.barrieres_ulp.length > 0 ? `Barrières ULP: ${profile.barrieres_ulp.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userMessage = `## Profil actuel de l'utilisateur
${profileSummary || 'Profil vide'}

## Conversation
${conversation}`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = response.content.find((block: { type: string }) => block.type === 'text') as { type: 'text'; text: string } | undefined;
    if (!textContent) {
      return defaultAnalysis();
    }

    const parsed = JSON.parse(textContent.text);

    return {
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      exercice_propose: parsed.exercice_propose || null,
      summary: parsed.summary || '',
      profile_evolution: {
        add_croyances: parsed.profile_evolution?.add_croyances || [],
        remove_croyances: parsed.profile_evolution?.remove_croyances || [],
        add_patterns: parsed.profile_evolution?.add_patterns || [],
        remove_patterns: parsed.profile_evolution?.remove_patterns || [],
        add_projets: parsed.profile_evolution?.add_projets || [],
      },
    };
  } catch (error) {
    console.error('Session analysis error:', error);
    return defaultAnalysis();
  }
}

function defaultAnalysis(): SessionAnalysis {
  return {
    insights: [],
    themes: [],
    exercice_propose: null,
    summary: '',
    profile_evolution: {},
  };
}
