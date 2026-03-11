import Anthropic from '@anthropic-ai/sdk';
import type { BilanContent, BilanType } from '@/types';

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

const BILAN_PROMPT = `Tu es le coach personnel de l'utilisateur. On te donne les données de ses sessions sur une période donnée. Génère un bilan chaleureux et personnel.

Retourne un JSON avec exactement cette structure :

{
  "summary": "Résumé chaleureux et personnel de la période, écrit en tutoyant l'utilisateur. 3-5 phrases.",
  "themes_dominants": ["thème1", "thème2", "thème3"],
  "breakthroughs": ["prise de conscience majeure 1", "prise de conscience majeure 2"],
  "actions_completed": 5,
  "actions_total": 8,
  "sessions_count": 12,
  "exercises_done": 3,
  "profile_evolution": "Description de comment l'utilisateur a évolué sur la période. Ce qui a bougé dans ses croyances, ses patterns, ses projets.",
  "coach_note": "Note personnelle du coach — ce qu'il retient de cette période, ce qu'il aimerait dire à l'utilisateur. 2-3 phrases intimes et encourageantes.",
  "coach_lesson": "LA leçon clé de cette période. Une phrase percutante que le coach formule comme un enseignement. Ex: 'Tu as découvert que derrière ta procrastination se cache une peur de ne pas être à la hauteur.'",
  "next_action": "L'action concrète et spécifique que le coach recommande pour la prochaine période. Pas vague. Ex: 'Chaque matin cette semaine, prends 2 minutes pour noter une chose que tu fais bien.'"
}

Règles :
- summary : chaleureux, personnel, en tutoyant. Pas un rapport clinique. "Ce mois a été un tournant pour toi..."
- themes_dominants : les 3-5 thèmes les plus présents sur la période
- breakthroughs : seulement les vraies prises de conscience marquantes (pas les petites)
- actions_completed / actions_total : compte les actions faites vs total
- profile_evolution : ce qui a changé dans la façon de penser, les croyances, les patterns
- coach_note : la note la plus personnelle. Ce que le coach dirait en fin de mois. "Si je devais retenir une chose..."
- coach_lesson : LA grande leçon de la période. Une seule phrase claire et percutante. Pas de blabla. C'est l'insight principal que le coach retient.
- next_action : UNE action concrète, spécifique, réalisable dans la prochaine semaine. Pas "continue comme ça". Quelque chose de précis et actionnable.

Retourne UNIQUEMENT le JSON, sans commentaire ni markdown.`;

interface SessionData {
  date: string;
  mode: string;
  themes: string[];
  insights: Array<{ text: string; isBreakthrough: boolean }>;
  summary: string | null;
  coach_summary: string | null;
  actions: Array<{ text: string; done: boolean }>;
  exercice_propose: string | null;
}

export async function generateBilan(
  type: BilanType,
  periodStart: string,
  periodEnd: string,
  sessions: SessionData[],
  exercisesCount: number
): Promise<BilanContent> {
  const periodLabel =
    type === 'weekly' ? 'semaine' :
    type === 'monthly' ? 'mois' : 'année';

  const sessionsSummary = sessions.map((s) => {
    const parts = [`${s.mode === 'deblocage' ? 'Déblocage' : 'Journal'} (${new Date(s.date).toLocaleDateString('fr-FR')})`];
    if (s.themes.length > 0) parts.push(`Thèmes: ${s.themes.join(', ')}`);
    if (s.coach_summary) parts.push(`Résumé coach: ${s.coach_summary}`);
    else if (s.summary) parts.push(`Résumé: ${s.summary}`);
    if (s.insights.length > 0) {
      const breakthroughs = s.insights.filter((i) => i.isBreakthrough);
      if (breakthroughs.length > 0) parts.push(`Breakthroughs: ${breakthroughs.map((b) => b.text).join('; ')}`);
    }
    if (s.actions.length > 0) {
      const done = s.actions.filter((a) => a.done).length;
      parts.push(`Actions: ${done}/${s.actions.length} faites`);
    }
    return parts.join(' | ');
  }).join('\n');

  const totalActions = sessions.reduce((sum, s) => sum + (s.actions?.length || 0), 0);
  const doneActions = sessions.reduce((sum, s) => sum + (s.actions?.filter((a) => a.done).length || 0), 0);

  const userMessage = `## Bilan ${periodLabel}
Période : ${new Date(periodStart).toLocaleDateString('fr-FR')} — ${new Date(periodEnd).toLocaleDateString('fr-FR')}
Nombre de sessions : ${sessions.length}
Exercices faits : ${exercisesCount}
Actions : ${doneActions}/${totalActions} complétées

## Sessions
${sessionsSummary || 'Aucune session sur cette période.'}`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: BILAN_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = response.content.find((block: { type: string }) => block.type === 'text') as { type: 'text'; text: string } | undefined;
    if (!textContent) return defaultBilanContent(sessions.length, exercisesCount, doneActions, totalActions);

    // Strip markdown code blocks (```json...```) that Claude sometimes adds
    let rawText = textContent.text.trim();
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) rawText = fenceMatch[1].trim();

    const parsed = JSON.parse(rawText);
    return {
      summary: parsed.summary || '',
      themes_dominants: Array.isArray(parsed.themes_dominants) ? parsed.themes_dominants : [],
      breakthroughs: Array.isArray(parsed.breakthroughs) ? parsed.breakthroughs : [],
      actions_completed: typeof parsed.actions_completed === 'number' ? parsed.actions_completed : doneActions,
      actions_total: typeof parsed.actions_total === 'number' ? parsed.actions_total : totalActions,
      sessions_count: sessions.length,
      exercises_done: exercisesCount,
      profile_evolution: parsed.profile_evolution || '',
      coach_note: parsed.coach_note || '',
      coach_lesson: parsed.coach_lesson || '',
      next_action: parsed.next_action || '',
    };
  } catch (error) {
    console.error('Bilan generation error:', error);
    return defaultBilanContent(sessions.length, exercisesCount, doneActions, totalActions);
  }
}

function defaultBilanContent(sessions: number, exercises: number, done: number, total: number): BilanContent {
  return {
    summary: '',
    themes_dominants: [],
    breakthroughs: [],
    actions_completed: done,
    actions_total: total,
    sessions_count: sessions,
    exercises_done: exercises,
    profile_evolution: '',
    coach_note: '',
    coach_lesson: '',
    next_action: '',
  };
}
