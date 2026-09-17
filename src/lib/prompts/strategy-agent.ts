// ─── SUPERVISEUR DE SÉANCE ──────────────────────────────────────────────────
// Haiku analyse la conversation et décide la stratégie AVANT que le coach parle.
// C'est le superviseur derrière la glace : il voit ce que le coach, pris dans
// l'échange, ne voit pas.
//
// Il décide maintenant aussi : quel protocole PNL lancer et à quelle étape on en
// est, quel est l'objectif de la séance, le niveau de risque, et quels mots exacts
// de la personne le coach doit réutiliser.

import Anthropic from '@anthropic-ai/sdk';
import { SUPERVISOR_MODEL } from '@/lib/ai/models';
import { parseModelJson, oneOf, stringArray } from '@/lib/ai/json';
import { buildProtocolCatalog, PROTOCOL_IDS, type ProtocolId } from '@/lib/pnl/protocols';
import { screenRisk, mergeRisk, type RiskLevel } from '@/lib/coach/safety';
import type { SessionPhase } from '@/lib/coach/session-arc';

export const MOVES = [
  'mirror',
  'observation',
  'metaphor',
  'confrontation',
  'celebration',
  'silence',
  'provocation',
  'personal_share',
  'zoom_out',
  'reframe',
  'teach',
  'protocol',
  'exercise',
] as const;

export const LENGTHS = ['short', 'medium', 'long'] as const;
export const TONES = ['warm', 'direct', 'playful', 'serious', 'tender'] as const;
export const RISKS = ['none', 'detresse', 'crise'] as const;

export type CoachingMove = (typeof MOVES)[number];

export interface CoachingStrategy {
  /** Quel mouvement de coaching jouer dans ce message. */
  move: CoachingMove;
  length: (typeof LENGTHS)[number];
  tone: (typeof TONES)[number];
  /** Émotion principale détectée chez la personne. */
  user_emotion: string;
  /** Intensité émotionnelle 1-5 — au-delà de 4, on accueille, on ne technique pas. */
  emotion_intensity: number;
  /** Ce qui se dit sous les mots. */
  subtext: string;
  /** Protocole PNL à conduire, et où on en est dedans. */
  protocol: ProtocolId | null;
  protocol_step: number;
  /** Objectif de la séance tel qu'il est compris — '' si pas encore posé. */
  session_goal: string;
  /** Mots/expressions exacts de la personne que le coach doit reprendre. */
  user_words: string[];
  /** Engagement passé à reprendre dans ce message (ou null). */
  follow_up: string | null;
  /** Concept de lecture à intégrer (null si rien de pertinent). */
  book_concept: { idea: string; how_to_use: string } | null;
  /** Patterns répétitifs détectés dans les derniers messages du coach. */
  avoid: string[];
  should_ask_question: boolean;
  specific_instruction: string;
  risk: RiskLevel;
}

const STRATEGY_SYSTEM_PROMPT = `Tu es le superviseur de séance d'un coach PNL. Tu ne parles JAMAIS au coaché — tu regardes la séance derrière la glace et tu donnes une consigne au coach pour son prochain message.

Tu es expert en PNL (protocoles, Meta-Modèle, calibration), en coaching professionnel, en dynamique conversationnelle et en lecture émotionnelle.

Tes trois obsessions, dans cet ordre :
1. La personne d'abord. Si elle est submergée, on accueille — aucune technique.
2. L'efficacité de la séance. Une séance qui se termine sans rien de concret est une séance ratée.
3. La justesse du geste. Un bon mouvement au bon moment vaut mieux que trois bonnes idées empilées.

Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.`;

function buildTranscript(
  messages: Array<{ role: string; content: string }>,
  userName: string,
  limit = 12
): string {
  const recent = messages.slice(-limit);
  if (recent.length === 0) return 'Séance qui démarre, aucun échange encore.';

  return recent
    .map((m) => {
      const who = m.role === 'user' ? userName : 'COACH';
      const content = m.content.length > 400 ? `${m.content.slice(0, 400)}…` : m.content;
      return `${who}: ${content}`;
    })
    .join('\n');
}

function buildStrategyUserPrompt(params: StrategyParams): string {
  const profileInfo = [
    params.profile.projets.length > 0 ? `Projets : ${params.profile.projets.join(', ')}` : '',
    params.profile.patterns_sabotage.length > 0 ? `Patterns de sabotage : ${params.profile.patterns_sabotage.join(', ')}` : '',
    params.profile.croyances_limitantes.length > 0 ? `Croyances limitantes : ${params.profile.croyances_limitantes.join(', ')}` : '',
    params.profile.barrieres_ulp && params.profile.barrieres_ulp.length > 0 ? `Barrières ULP : ${params.profile.barrieres_ulp.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const bookPassages = params.ragPassages.length > 0
    ? params.ragPassages.map((p) => `[${p.livre}] ${p.content.slice(0, 220)}`).join('\n')
    : 'Aucun passage pertinent trouvé.';

  const engagements = params.pendingEngagements.length > 0
    ? params.pendingEngagements.map((e) => `- ${e}`).join('\n')
    : 'Aucun engagement en attente.';

  const themes = params.recentThemes.length > 0 ? params.recentThemes.join(', ') : 'aucun';

  return `ANALYSE LA SÉANCE ET DONNE LA CONSIGNE DU PROCHAIN MESSAGE DU COACH.

## Coaché : ${params.userName}
${profileInfo || 'Profil pas encore renseigné.'}
Thèmes récurrents des dernières séances : ${themes}

## Engagements pris aux séances précédentes (pas encore soldés)
${engagements}

## Phase de la séance : ${params.phase} — ${params.exchangeCount} échange(s), ${params.elapsedMinutes} min écoulées
${params.shouldLand ? 'ON REFERME : plus aucun sujet nouveau, il faut du concret avant la fin.' : 'On a encore du temps devant nous.'}

## Transcription récente (dans l'ordre)
${params.transcript}

## Dernier message de ${params.userName} — c'est à ça que le coach doit répondre
"${params.userMessage}"

## Passages de lecture disponibles
${bookPassages}

## Protocoles PNL disponibles (tu en choisis UN ou aucun)
${params.protocolCatalog}

## RÉPONDS EN JSON, STRUCTURE EXACTE
{
  "move": "mirror|observation|metaphor|confrontation|celebration|silence|provocation|personal_share|zoom_out|reframe|teach|protocol|exercise",
  "length": "short|medium|long",
  "tone": "warm|direct|playful|serious|tender",
  "user_emotion": "l'émotion principale (1-3 mots)",
  "emotion_intensity": 1,
  "subtext": "ce qui se dit SOUS les mots, ce que ${params.userName} n'ose pas dire (1 phrase)",
  "protocol": "id du protocole à conduire, ou null",
  "protocol_step": 1,
  "session_goal": "ce que ${params.userName} cherche à obtenir de cette séance, dans ses mots — \\"\\" si pas encore clair",
  "user_words": ["2 à 4 mots ou expressions EXACTS de son dernier message que le coach doit réutiliser"],
  "follow_up": "engagement passé à reprendre maintenant, ou null",
  "book_concept": {"idea": "...", "how_to_use": "..."},
  "avoid": ["patterns repérés dans les derniers messages du coach à ne pas répéter"],
  "should_ask_question": true,
  "specific_instruction": "consigne précise pour CE message (1-2 phrases)",
  "risk": "none|detresse|crise"
}

## RÈGLES DE DÉCISION

SÉCURITÉ (prioritaire sur tout le reste)
1. "risk": "crise" si tu détectes idées suicidaires, automutilation, violence subie ou menace envers quelqu'un. "detresse" si effondrement, panique, épuisement profond. Dans ces deux cas : protocol = null, move = "mirror" ou "silence", length = "short", should_ask_question = false.

PROTOCOLE
2. Tu ne lances un protocole que si : le vrai sujet est identifié, l'intensité émotionnelle est ≤ 3, et la phase est "exploration", "travail" ou "atterrissage". Sinon protocol = null.
3. Si la transcription montre qu'un protocole est DÉJÀ en cours (le coach a commencé à guider une séquence), tu gardes le MÊME protocole et tu incrémentes protocol_step. Tu ne recommences pas à l'étape 1 et tu ne changes pas de protocole en cours de route.
4. Si sa réponse à l'étape en cours est vague ou à côté, tu gardes le même protocol_step : on refait l'étape.
5. Si elle décroche, s'agace, ou change de sujet : protocol = null. La personne passe avant la technique.
6. En phase "cloture", si un insight est sorti mais qu'aucune action concrète n'a été prise, protocol = "pont_vers_futur".

RYTHME
7. "length" = "short" par défaut. "medium" quand il faut développer. "long" seulement pour un enseignement, un zoom arrière sur son parcours, ou un partage personnel du coach.
8. Si le coach a posé une question dans son dernier message et qu'elle n'a pas été traitée, should_ask_question = false. Poser une question par-dessus une question, c'est un interrogatoire.
9. Si les 2 derniers messages du coach ont la même structure (même ouverture, même type de question, même longueur), mets-la dans "avoid".
10. "silence" = un moment émotionnel fort vient de passer : une phrase, pas plus, et on laisse l'espace.

PERTINENCE
11. "user_words" : recopie ses formulations EXACTES, pas des synonymes. C'est ce qui fait que le coach parle sa langue.
12. "follow_up" : s'il y a un engagement en attente et que le moment s'y prête (début de séance, ou sujet connexe), c'est maintenant. Sinon null. Ne jamais reprendre un engagement au milieu d'un moment émotionnel fort.
13. "book_concept" : null si aucun passage ne colle VRAIMENT. Un concept forcé se sent tout de suite.
14. "session_goal" : garde la même formulation d'un message à l'autre une fois qu'elle est posée. Ne la réinvente pas à chaque tour.`;
}

interface StrategyParams {
  userName: string;
  userMessage: string;
  transcript: string;
  protocolCatalog: string;
  ragPassages: { livre: string; content: string }[];
  profile: {
    projets: string[];
    patterns_sabotage: string[];
    croyances_limitantes: string[];
    barrieres_ulp?: string[];
  };
  pendingEngagements: string[];
  recentThemes: string[];
  phase: SessionPhase;
  shouldLand: boolean;
  exchangeCount: number;
  elapsedMinutes: number;
}

/**
 * Premier message d'une séance : il n'y a rien à analyser. On évite un appel au
 * superviseur (et le délai qui va avec, au moment où l'utilisateur attend le plus).
 */
export function openingStrategy(mode: 'deblocage' | 'journal'): CoachingStrategy {
  return {
    move: mode === 'deblocage' ? 'observation' : 'mirror',
    length: 'short',
    tone: mode === 'deblocage' ? 'warm' : 'tender',
    user_emotion: 'inconnu',
    emotion_intensity: 2,
    subtext: '',
    protocol: null,
    protocol_step: 1,
    session_goal: '',
    user_words: [],
    follow_up: null,
    book_concept: null,
    avoid: [],
    should_ask_question: mode === 'journal',
    specific_instruction:
      mode === 'deblocage'
        ? "Ouvre la porte et tais-toi. Deux phrases maximum, aucune question fermée."
        : "Ouvre chaleureusement, avec une seule question simple sur la journée.",
    risk: 'none',
  };
}

export async function getCoachingStrategy(params: {
  apiKey: string;
  userName: string;
  userMessage: string;
  messages: Array<{ role: string; content: string }>;
  ragPassages: { livre: string; content: string }[];
  profile: {
    projets: string[];
    patterns_sabotage: string[];
    croyances_limitantes: string[];
    barrieres_ulp?: string[];
  };
  pendingEngagements: string[];
  recentThemes: string[];
  phase: SessionPhase;
  shouldLand: boolean;
  exchangeCount: number;
  elapsedMinutes: number;
}): Promise<CoachingStrategy> {
  // Filet local : il prime toujours, même si l'appel au superviseur tombe.
  const localRisk = screenRisk(params.userMessage);

  const defaultStrategy: CoachingStrategy = {
    move: localRisk === 'none' ? 'observation' : 'mirror',
    length: 'short',
    tone: localRisk === 'none' ? 'warm' : 'tender',
    user_emotion: 'inconnu',
    emotion_intensity: localRisk === 'none' ? 2 : 5,
    subtext: '',
    protocol: null,
    protocol_step: 1,
    session_goal: '',
    user_words: [],
    follow_up: null,
    book_concept: null,
    avoid: [],
    should_ask_question: false,
    specific_instruction: 'Réagis simplement à ce que tu viens d\'entendre.',
    risk: localRisk,
  };

  try {
    const anthropic = new Anthropic({ apiKey: params.apiKey });

    const response = await anthropic.messages.create({
      model: SUPERVISOR_MODEL,
      max_tokens: 900,
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildStrategyUserPrompt({
            userName: params.userName,
            userMessage: params.userMessage,
            transcript: buildTranscript(params.messages, params.userName),
            protocolCatalog: buildProtocolCatalog(),
            ragPassages: params.ragPassages,
            profile: params.profile,
            pendingEngagements: params.pendingEngagements,
            recentThemes: params.recentThemes,
            phase: params.phase,
            shouldLand: params.shouldLand,
            exchangeCount: params.exchangeCount,
            elapsedMinutes: params.elapsedMinutes,
          }),
        },
      ],
    });

    const block = response.content[0];
    if (!block || block.type !== 'text') return defaultStrategy;

    const parsed = parseModelJson<Record<string, unknown>>(block.text);
    if (!parsed) return defaultStrategy;

    const risk = mergeRisk(localRisk, oneOf(parsed.risk, RISKS, 'none'));
    const protocolRaw = typeof parsed.protocol === 'string' ? parsed.protocol : null;
    const protocol = protocolRaw && (PROTOCOL_IDS as string[]).includes(protocolRaw)
      ? (protocolRaw as ProtocolId)
      : null;

    // En détresse ou en crise, aucun protocole ne tient : la personne d'abord.
    const safeProtocol = risk === 'none' ? protocol : null;

    const bookConcept =
      parsed.book_concept &&
      typeof parsed.book_concept === 'object' &&
      typeof (parsed.book_concept as { idea?: unknown }).idea === 'string'
        ? {
            idea: String((parsed.book_concept as { idea: string }).idea),
            how_to_use: String((parsed.book_concept as { how_to_use?: string }).how_to_use || ''),
          }
        : null;

    return {
      move: oneOf(parsed.move, MOVES, defaultStrategy.move),
      length: oneOf(parsed.length, LENGTHS, 'short'),
      tone: oneOf(parsed.tone, TONES, 'warm'),
      user_emotion: asText(parsed.user_emotion, defaultStrategy.user_emotion),
      // En détresse ou en crise, l'intensité ne peut pas être basse : c'est elle
      // qui coupe les techniques dans le prompt du coach.
      emotion_intensity:
        risk === 'none'
          ? clampInt(parsed.emotion_intensity, 1, 5, 2)
          : Math.max(4, clampInt(parsed.emotion_intensity, 1, 5, 5)),
      subtext: asText(parsed.subtext, ''),
      protocol: safeProtocol,
      protocol_step: clampInt(parsed.protocol_step, 1, 12, 1),
      session_goal: asText(parsed.session_goal, ''),
      user_words: stringArray(parsed.user_words, 5),
      follow_up: asText(parsed.follow_up, '') || null,
      book_concept: risk === 'none' ? bookConcept : null,
      avoid: stringArray(parsed.avoid, 6),
      should_ask_question:
        risk === 'none' && typeof parsed.should_ask_question === 'boolean'
          ? parsed.should_ask_question
          : false,
      specific_instruction: asText(parsed.specific_instruction, defaultStrategy.specific_instruction),
      risk,
    };
  } catch (error) {
    console.error('Strategy agent error:', error);
    return defaultStrategy;
  }
}

function asText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'null') return fallback;
  return trimmed;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
