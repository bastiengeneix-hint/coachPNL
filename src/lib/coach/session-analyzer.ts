import Anthropic from '@anthropic-ai/sdk';
import { Message, SessionAnalysis, Profile } from '@/types';
import { ANALYSIS_MODEL } from '@/lib/ai/models';
import { parseModelJson, stringArray } from '@/lib/ai/json';

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

const ANALYSIS_PROMPT = `Tu es le superviseur d'un coach PNL. Tu relis une séance et tu en extrais ce qui doit rester en mémoire pour les prochaines. Ce que tu écris ici, le coach s'en servira dans quinze jours : sois exact, jamais décoratif.

Retourne un JSON avec exactement cette structure :

{
  "insights": [
    { "text": "la prise de conscience, dans les mots de l'utilisateur", "isBreakthrough": false }
  ],
  "themes": ["thème1", "thème2"],
  "exercice_propose": "l'exercice concret proposé par le coach, ou null",
  "reminder_config": {
    "frequency": "daily",
    "duration_days": 7,
    "message": "Rappel court et motivant"
  },
  "actions": [
    { "text": "action concrète que l'utilisateur s'est engagé à faire", "done": false }
  ],
  "coach_summary": "résumé chaleureux écrit du point de vue du coach, en le tutoyant",
  "summary": "résumé factuel en 2-3 phrases",
  "profile_evolution": {
    "add_croyances": [],
    "remove_croyances": [],
    "add_patterns": [],
    "remove_patterns": [],
    "add_projets": [],
    "add_barrieres": [],
    "remove_barrieres": [],
    "add_lexique": []
  }
}

Règles :
- insights : les vraies prises de conscience DE L'UTILISATEUR, pas les belles phrases du coach. Un breakthrough = il voit quelque chose qu'il ne voyait pas, une croyance se fissure, une émotion est nommée pour la première fois. S'il n'y en a pas, tableau vide — c'est une réponse valable.
- themes : mots simples en français ("légitimité", "peur du regard", "relation au père", "procrastination", "argent", "perfectionnisme", "confiance"). Uniquement ce qui a été réellement abordé.
- exercice_propose : l'exercice concret proposé par le coach pendant la séance. null si aucun.
- reminder_config : seulement si un exercice à répéter a été proposé. frequency = "daily" | "every_2_days" | "every_3_days" | "weekly". duration_days = durée du rappel. null si l'exercice est ponctuel ou s'il n'y en a pas.
- actions : les engagements concrets qu'il a pris, avec ses mots. "Appeler Pierre demain", "Écrire ma lettre de démission". Pas les prises de conscience, pas les intentions vagues ("faire plus attention à moi" n'est pas une action). Tableau vide si aucun.
- coach_summary : 2-3 phrases, chaleureuses, adressées à lui. Émotionnel, pas factuel. Exemple : "Aujourd'hui t'as osé regarder en face cette peur qui te paralyse depuis des mois. C'est pas rien."
- summary : factuel, court, utile à relire.
- profile_evolution : compare avec le profil actuel fourni. N'ajoute QUE du nouveau, et uniquement ce qui est explicitement sorti de la séance.
  - add_barrieres / remove_barrieres : les barrières cachées de l'Upper Limit Problem (Hendricks), uniquement si la séance en montre une clairement. Les quatre, formulées ainsi : "Je suis fondamentalement défaillant" · "Réussir, c'est trahir les miens" · "Je suis un fardeau" · "Si je brille, j'éteins les autres". N'invente pas de cinquième barrière.
  - add_lexique : 1 à 3 expressions EXACTES et récurrentes de l'utilisateur pour se décrire ou décrire ce qu'il vit ("mon cinéma intérieur", "le mode robot", "la boule"). Ses mots, pas des reformulations. Tableau vide s'il n'y a rien de marquant.

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
    profile.preferences?.lexique?.length ? `Lexique déjà connu: ${profile.preferences.lexique.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const userMessage = `## Profil actuel de l'utilisateur
${profileSummary || 'Profil vide'}

## Conversation
${conversation}`;

  try {
    const response = await getAnthropic().messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1800,
      system: ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = response.content.find((block: { type: string }) => block.type === 'text') as { type: 'text'; text: string } | undefined;
    if (!textContent) {
      return defaultAnalysis();
    }

    // Avant, un simple JSON.parse : dès que le modèle enveloppait sa réponse
    // dans une fence markdown, toute l'analyse partait à la poubelle en silence
    // (aucun insight, aucun thème, aucune action, profil jamais mis à jour).
    const parsed = parseModelJson<Record<string, unknown>>(textContent.text);
    if (!parsed) {
      console.error('Session analysis: unparseable model response');
      return defaultAnalysis();
    }

    const evolution = (parsed.profile_evolution || {}) as Record<string, unknown>;

    return {
      insights: Array.isArray(parsed.insights) ? (parsed.insights as SessionAnalysis['insights']) : [],
      themes: stringArray(parsed.themes, 8),
      exercice_propose: (parsed.exercice_propose as string) || null,
      reminder_config: (parsed.reminder_config as SessionAnalysis['reminder_config']) || null,
      actions: Array.isArray(parsed.actions) ? (parsed.actions as SessionAnalysis['actions']) : [],
      coach_summary: (parsed.coach_summary as string) || '',
      summary: (parsed.summary as string) || '',
      profile_evolution: {
        add_croyances: stringArray(evolution.add_croyances, 5),
        remove_croyances: stringArray(evolution.remove_croyances, 5),
        add_patterns: stringArray(evolution.add_patterns, 5),
        remove_patterns: stringArray(evolution.remove_patterns, 5),
        add_projets: stringArray(evolution.add_projets, 5),
        add_barrieres: stringArray(evolution.add_barrieres, 4),
        remove_barrieres: stringArray(evolution.remove_barrieres, 4),
        add_lexique: stringArray(evolution.add_lexique, 3),
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
    reminder_config: null,
    actions: [],
    coach_summary: '',
    summary: '',
    profile_evolution: {},
  };
}
