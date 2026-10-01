// ─── LA LETTRE DE SÉANCE ────────────────────────────────────────────────────
// Avant, la personne repartait avec deux ou trois phrases chaleureuses et une
// liste d'actions. Une séance qui ne laisse rien à relire s'évapore. La
// lettre garde ce qu'on a vu (la boucle, avec ses mots), la phrase où quelque
// chose a bougé, et ce qu'elle repart faire. Elle est relue le lendemain
// matin, et c'est sur elle que s'ouvre la séance suivante.
//
// Écrite par le modèle du coach : c'est sa voix, pas un compte rendu.

import Anthropic from '@anthropic-ai/sdk';
import { COACH_MODEL } from '@/lib/ai/models';
import { screenRisk } from '@/lib/coach/safety';
import type { Message, SessionMode } from '@/types';

const MIN_USER_MESSAGES = 2;
const MIN_USER_CHARS = 300;
const MAX_LETTER_CHARS = 2000;

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY,
  });
}

function buildLetterPrompt(coachName: string, userName: string, mode: SessionMode): string {
  const contenu =
    mode === 'journal'
      ? `C'était un journal du soir, pas une séance de travail. La lettre est courte : ce qui a compté dans la journée de ${userName}, avec ses mots, et une seule chose à emporter. Pas d'expérience à mener, pas de devoir.

Règles :
- 50 à 90 mots, un ou deux courts paragraphes.`
      : `Ce qu'elle contient, dans cet ordre, en prose (pas de liste, pas de titre) :
1. Ce qu'on a vu. La mécanique qui s'est dessinée : ce qui déclenche, ce que ${userName} se dit, ce que ça lui fait faire, ce que ça lui coûte. AVEC SES MOTS. Si la séance n'a pas fait apparaître de mécanique, tu dis simplement ce qui s'est éclairci.
2. Une phrase de ${userName}, citée mot pour mot entre guillemets : celle où quelque chose a bougé.
3. Ce que ${userName} repart faire : l'engagement ou l'expérience décidés en séance, avec la prédiction si elle a été dite. Si rien n'a été décidé, tu ne l'inventes pas : tu proposes UNE chose à observer d'ici la prochaine fois, formulée comme une proposition.
4. Une phrase de fin : la prochaine fois qu'on se parle, on part de là.

Règles :
- 100 à 180 mots, deux à quatre courts paragraphes.`;

  return `Tu es ${coachName}, le coach de ${userName}. La séance vient de se terminer. Tu lui écris une courte lettre qu'il ou elle relira demain matin, et peut-être au moment précis où ça recoince.

${contenu}
- Tu tutoies. Ta voix : français oral, phrases courtes. Aucun jargon de développement personnel (« cheminement », « zone de confort », « lâcher-prise », « aligné », « potentiel », « bienveillance »).
- Pas de « Cher… », pas de signature, pas de formule de politesse, pas d'emoji, pas de gras.
- Tu n'inventes RIEN : pas un fait, pas une émotion, pas une décision qui ne soit pas dans la séance. Pas de diagnostic, pas de conseil médical.
- Pas de compliment général. Si tu valorises quelque chose, c'est un acte précis qui a eu lieu dans la séance.
- Tu ne nommes aucune technique, aucun protocole, aucun livre.

Réponds avec la lettre seule.`;
}

/**
 * La lettre, ou null quand il n'y a pas matière (séance trop courte) ou quand
 * la séance a touché à une crise : là, on ne résume pas, et ce n'est pas une
 * lettre qui doit rester sur l'écran le lendemain matin.
 */
export async function writeSessionLetter(params: {
  coachName: string;
  userName: string;
  mode: SessionMode;
  messages: Message[];
}): Promise<string | null> {
  const userMessages = params.messages.filter((m) => m.role === 'user');
  const userChars = userMessages.reduce((n, m) => n + m.content.length, 0);
  if (userMessages.length < MIN_USER_MESSAGES || userChars < MIN_USER_CHARS) return null;
  if (userMessages.some((m) => screenRisk(m.content) === 'crise')) return null;

  const conversation = params.messages
    .map((m) => `${m.role === 'user' ? params.userName : params.coachName}: ${m.content}`)
    .join('\n\n');

  try {
    const response = await getAnthropic().messages.create({
      model: COACH_MODEL,
      max_tokens: 700,
      system: buildLetterPrompt(params.coachName, params.userName, params.mode),
      messages: [{ role: 'user', content: `## La séance\n\n${conversation}` }],
    });

    const block = response.content.find((b) => b.type === 'text');
    const text = block && block.type === 'text' ? block.text.trim() : '';
    if (!text) {
      console.warn(`Letter: empty response (stop_reason=${response.stop_reason})`);
      return null;
    }
    return text.slice(0, MAX_LETTER_CHARS);
  } catch (error) {
    console.error('Letter: generation failed:', error);
    return null;
  }
}
