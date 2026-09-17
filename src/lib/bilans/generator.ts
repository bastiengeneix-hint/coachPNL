import Anthropic from '@anthropic-ai/sdk';
import type { BilanContent, BilanType } from '@/types';
import { ANALYSIS_MODEL } from '@/lib/ai/models';
import { parseModelJson, stringArray } from '@/lib/ai/json';

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

const BILAN_PROMPT = `Tu es le coach personnel de l'utilisateur. On te donne les données RÉELLES de ses sessions sur une période donnée. Génère un bilan chaleureux et personnel.

RÈGLE ABSOLUE : Tu ne travailles QU'AVEC les données fournies ci-dessous. Tu n'INVENTES JAMAIS :
- Pas de thèmes qui ne sont pas explicitement dans les sessions
- Pas de prises de conscience que l'utilisateur n'a pas eues
- Pas de sujets (argent, famille, anxiété, etc.) qui n'apparaissent pas dans les résumés ou thèmes fournis
- Si les données sont pauvres ou vagues, ton bilan est court et honnête : "On a échangé cette semaine, mais les sujets restent à creuser."
- MIEUX VAUT un bilan court et vrai qu'un bilan riche et inventé

Retourne un JSON avec exactement cette structure :

{
  "summary": "Résumé chaleureux basé UNIQUEMENT sur ce qui est dans les sessions. 2-4 phrases.",
  "themes_dominants": ["uniquement les thèmes présents dans les données"],
  "breakthroughs": ["uniquement les prises de conscience explicites dans les sessions"],
  "actions_completed": 5,
  "actions_total": 8,
  "sessions_count": 12,
  "exercises_done": 3,
  "profile_evolution": "Ce qui a RÉELLEMENT bougé selon les sessions. Si rien de clair, dis-le : 'Pas d'évolution majeure visible cette semaine.'",
  "coach_note": "Note personnelle du coach basée sur ce qu'il a VU dans les sessions. 2-3 phrases.",
  "coach_lesson": "La leçon clé qui ressort des sessions. Si rien de fort, une observation simple sur la régularité ou l'engagement.",
  "next_action": "Une action concrète EN LIEN avec les vrais sujets abordés. Pas une action générique."
}

Règles :
- summary : chaleureux, en tutoyant. UNIQUEMENT basé sur les résumés et thèmes des sessions fournies.
- themes_dominants : UNIQUEMENT les thèmes qui apparaissent dans les données. Si aucun thème clair, tableau vide [].
- breakthroughs : UNIQUEMENT les insights marqués comme breakthroughs dans les données. Si aucun, tableau vide [].
- actions_completed / actions_total : compte exact des actions faites vs total dans les données.
- profile_evolution : ce qui a changé SELON LES DONNÉES. Si pas d'évolution visible, dis-le honnêtement.
- coach_note : personnelle mais ANCRÉE dans les sessions réelles.
- coach_lesson : tirée des VRAIS échanges. Si les sessions sont légères, la leçon porte sur la présence ou la régularité.
- next_action : EN LIEN DIRECT avec un sujet réellement abordé. Jamais d'action inventée sur un thème absent.

Si un bloc « Son parcours » est fourni, il est PRIORITAIRE sur le reste :
- Tu cites les chiffres exacts des mesures (« 4 → 6 »), jamais une appréciation floue à leur place.
- Une pratique tenue se dit, une pratique lâchée se dit aussi — sans reproche, mais sans la passer sous silence.
- profile_evolution parle d'abord de ce qui a bougé dans les mesures et les pratiques.
- next_action sert l'objectif du parcours, et rien d'autre.

Retourne UNIQUEMENT le JSON, sans commentaire ni markdown.`;

/** L'état du parcours sur la période : c'est ça qui montre la progression. */
export interface BilanSuivi {
  objectif: string | null;
  semaine: number | null;
  total_semaines: number | null;
  jalons: string[];
  mesures: Array<{ label: string; debut: number | null; fin: number | null; cible: number | null; direction: 'up' | 'down' }>;
  pratiques: Array<{ label: string; faites: number; attendues: number; serie: number }>;
  protocoles: Array<{ nom: string; sujet: string | null; tient: boolean | null }>;
  checkins: number;
}

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
  exercisesCount: number,
  suivi?: BilanSuivi | null
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
      const regular = s.insights.filter((i) => !i.isBreakthrough);
      if (breakthroughs.length > 0) parts.push(`Breakthroughs: ${breakthroughs.map((b) => b.text).join('; ')}`);
      if (regular.length > 0) parts.push(`Insights: ${regular.map((i) => i.text).join('; ')}`);
    }
    if (s.actions.length > 0) {
      parts.push(`Actions: ${s.actions.map((a) => `${a.done ? '[FAIT]' : '[EN COURS]'} ${a.text}`).join('; ')}`);
    }
    if (s.exercice_propose) parts.push(`Exercice proposé: ${s.exercice_propose}`);
    // Flag if session has no real content
    if (!s.coach_summary && !s.summary && s.themes.length === 0 && s.insights.length === 0) {
      parts.push('(Session sans contenu analysé)');
    }
    return parts.join(' | ');
  }).join('\n');

  const totalActions = sessions.reduce((sum, s) => sum + (s.actions?.length || 0), 0);
  const doneActions = sessions.reduce((sum, s) => sum + (s.actions?.filter((a) => a.done).length || 0), 0);

  // Les chiffres du suivi sont des FAITS : le modèle n'a pas à les deviner, et
  // il n'a pas le droit de les contredire.
  const suiviBlock = suivi
    ? `## Son parcours (données réelles, non négociables)
Objectif : ${suivi.objectif || 'aucun parcours défini'}${suivi.semaine ? ` — semaine ${suivi.semaine}${suivi.total_semaines ? `/${suivi.total_semaines}` : ''}` : ''}
${suivi.jalons.length > 0 ? `Jalons : ${suivi.jalons.join(' · ')}` : 'Aucun jalon.'}
${
  suivi.mesures.length > 0
    ? `Mesures sur la période :\n${suivi.mesures
        .map(
          (m) =>
            `- « ${m.label} » : ${m.debut ?? '?'} → ${m.fin ?? '?'}${m.cible !== null ? ` (cible ${m.cible})` : ''} — ${m.direction === 'up' ? 'on veut que ça monte' : 'on veut que ça baisse'}`
        )
        .join('\n')}`
    : 'Aucune mesure suivie.'
}
${
  suivi.pratiques.length > 0
    ? `Pratiques quotidiennes :\n${suivi.pratiques
        .map((p) => `- « ${p.label} » : ${p.faites}/${p.attendues} sur la période, série actuelle ${p.serie}`)
        .join('\n')}`
    : 'Aucune pratique quotidienne.'
}
${
  suivi.protocoles.length > 0
    ? `Travaux conduits :\n${suivi.protocoles
        .map((pr) => `- ${pr.nom}${pr.sujet ? ` sur « ${pr.sujet} »` : ''}${pr.tient === null ? '' : pr.tient ? ' — ça tient' : ' — pas encore réévalué'}`)
        .join('\n')}`
    : ''
}
Check-ins remplis : ${suivi.checkins}
`
    : '';

  const userMessage = `## Bilan ${periodLabel}
Période : ${new Date(periodStart).toLocaleDateString('fr-FR')} — ${new Date(periodEnd).toLocaleDateString('fr-FR')}
Nombre de sessions : ${sessions.length}
Exercices faits : ${exercisesCount}
Actions : ${doneActions}/${totalActions} complétées

${suiviBlock}
## Sessions
${sessionsSummary || 'Aucune session sur cette période.'}`;

  try {
    const response = await getAnthropic().messages.create({
      model: ANALYSIS_MODEL,
      max_tokens: 1500,
      system: BILAN_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const textContent = response.content.find((block: { type: string }) => block.type === 'text') as { type: 'text'; text: string } | undefined;
    if (!textContent) return defaultBilanContent(sessions.length, exercisesCount, doneActions, totalActions);

    const parsed = parseModelJson<Record<string, unknown>>(textContent.text);
    if (!parsed) return defaultBilanContent(sessions.length, exercisesCount, doneActions, totalActions);

    return {
      summary: (parsed.summary as string) || '',
      themes_dominants: stringArray(parsed.themes_dominants, 8),
      breakthroughs: stringArray(parsed.breakthroughs, 8),
      actions_completed: typeof parsed.actions_completed === 'number' ? parsed.actions_completed : doneActions,
      actions_total: typeof parsed.actions_total === 'number' ? parsed.actions_total : totalActions,
      sessions_count: sessions.length,
      exercises_done: exercisesCount,
      profile_evolution: (parsed.profile_evolution as string) || '',
      coach_note: (parsed.coach_note as string) || '',
      coach_lesson: (parsed.coach_lesson as string) || '',
      next_action: (parsed.next_action as string) || '',
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
