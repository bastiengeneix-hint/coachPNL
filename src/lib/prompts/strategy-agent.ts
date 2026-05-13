// ─── AGENT STRATÉGISTE ──────────────────────────────────────────────────────
// Haiku analyse la conversation et donne une DIRECTION légère au coach.
// Il ne micro-manage pas. Il détecte ce que le coach pourrait rater.

import Anthropic from '@anthropic-ai/sdk';

export interface CoachingStrategy {
  // Profondeur — le plus important
  depth: 'surface' | 'explore' | 'dig';
  // Émotion détectée chez l'utilisateur
  user_emotion: string;
  // Ce qui se dit sous les mots
  subtext: string;
  // Technique PNL pertinente pour ce message
  pnl_technique: { technique: string; how_to_apply: string } | null;
  // Concept de livre à utiliser
  book_concept: { idea: string; how_to_use: string } | null;
  // Patterns à éviter (répétitions du coach)
  avoid: string[];
  // L'utilisateur conteste l'analyse du coach ?
  user_pushback: boolean;
  // Sujet personnel ou professionnel ?
  topic_domain: 'personal' | 'professional' | 'mixed';
  // Instruction libre pour ce message
  specific_instruction: string;
}

const STRATEGY_SYSTEM_PROMPT = `Tu es le superviseur de session d'un coach PNL. Tu ne parles JAMAIS au coaché — tu donnes des indications au coach.

Tu es expert en PNL, coaching, et dynamiques conversationnelles.

TON RÔLE : Détecter ce que le coach pourrait rater. Pas micro-manager chaque mot.

PRIORITÉ ABSOLUE : la PROFONDEUR. Un bon coaching CREUSE. Le pire défaut c'est de valider trop vite ("c'est bien, continue") au lieu de pousser plus loin. Le champ "depth" est le plus important de ta réponse.

Tu réponds UNIQUEMENT en JSON valide, sans markdown.`;

function buildStrategyUserPrompt(params: {
  userName: string;
  userMessage: string;
  recentCoachMessages: string[];
  recentUserMessages: string[];
  ragPassages: { livre: string; content: string }[];
  profile: { projets: string[]; patterns_sabotage: string[]; croyances_limitantes: string[] };
  sessionMessageCount: number;
}): string {
  const coachHistory = params.recentCoachMessages.length > 0
    ? params.recentCoachMessages.map((m, i) => `Coach msg ${i + 1}: ${m.slice(0, 300)}`).join('\n')
    : 'Aucun message précédent du coach.';

  const userHistory = params.recentUserMessages.length > 0
    ? params.recentUserMessages.slice(0, -1).map((m, i) => `${params.userName} msg ${i + 1}: ${m.slice(0, 200)}`).join('\n')
    : '';

  const bookPassages = params.ragPassages.length > 0
    ? params.ragPassages.map((p) => `[${p.livre}]: ${p.content.slice(0, 200)}`).join('\n')
    : 'Aucun passage pertinent.';

  const profileInfo = [
    params.profile.projets.length > 0 ? `Projets: ${params.profile.projets.join(', ')}` : '',
    params.profile.patterns_sabotage.length > 0 ? `Patterns: ${params.profile.patterns_sabotage.join(', ')}` : '',
    params.profile.croyances_limitantes.length > 0 ? `Croyances: ${params.profile.croyances_limitantes.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return `ANALYSE ET DONNE UNE DIRECTION AU COACH.

## ${params.userName}
${profileInfo || 'Profil pas encore renseigné.'}

## Son dernier message :
"${params.userMessage}"

## Historique (${params.sessionMessageCount} messages) :
${userHistory ? `${params.userName} :\n${userHistory}\n` : ''}Coach :\n${coachHistory}

## Passages de livres :
${bookPassages}

Réponds en JSON :
{
  "depth": "surface|explore|dig",
  "user_emotion": "émotion principale (1-3 mots)",
  "subtext": "ce qui se dit sous les mots (1 phrase)",
  "pnl_technique": {"technique": "nom", "how_to_apply": "comment ici"} ou null,
  "book_concept": {"idea": "concept", "how_to_use": "comment"} ou null,
  "avoid": ["patterns/phrases que le coach a déjà utilisés et qu'il ne doit pas répéter"],
  "user_pushback": true/false,
  "topic_domain": "personal|professional|mixed",
  "specific_instruction": "1 phrase d'instruction libre"
}

RÈGLES :
1. "depth" est le champ LE PLUS IMPORTANT.
   - "surface" = RARE. Seulement si ${params.userName} fait du small talk ou si c'est un moment de pause émotionnelle.
   - "explore" = défaut. Le coach doit creuser, poser des questions pertinentes, ouvrir de nouveaux angles.
   - "dig" = ${params.userName} est sur quelque chose de profond. Le coach doit aller AU FOND. Questions incisives, PNL active.
2. "user_pushback" = true si ${params.userName} conteste ou corrige l'analyse du coach. Le coach DOIT changer de direction.
3. "topic_domain" = "personal" si couple/famille/quotidien. NE PAS relier au pro sauf si ${params.userName} le fait.
4. "pnl_technique" — propose une technique concrète avec son application ICI. Pas juste le nom.
5. "avoid" — détecte les patterns répétitifs du coach (mêmes structures, mêmes questions reformulées, mêmes angles).
6. Le coach ne doit JAMAIS dire : "Tu viens de dire quelque chose d'énorme", "Stop !", "Wahou", "C'est courageux de...", "Dis-m'en plus", "Si je reformule...", "C'est intéressant". Mets-les dans avoid si le coach risque de les utiliser.`;
}

export async function getCoachingStrategy(params: {
  apiKey: string;
  userName: string;
  userMessage: string;
  recentCoachMessages: string[];
  recentUserMessages: string[];
  ragPassages: { livre: string; content: string }[];
  profile: { projets: string[]; patterns_sabotage: string[]; croyances_limitantes: string[] };
  sessionMessageCount: number;
}): Promise<CoachingStrategy> {
  const defaultStrategy: CoachingStrategy = {
    depth: 'explore',
    user_emotion: 'inconnu',
    subtext: '',
    pnl_technique: null,
    book_concept: null,
    avoid: [],
    user_pushback: false,
    topic_domain: 'mixed',
    specific_instruction: '',
  };

  try {
    const anthropic = new Anthropic({ apiKey: params.apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: STRATEGY_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildStrategyUserPrompt(params),
        },
      ],
    });

    const text = response.content[0];
    if (text.type !== 'text') return defaultStrategy;

    let jsonStr = text.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    return {
      depth: ['surface', 'explore', 'dig'].includes(parsed.depth) ? parsed.depth : 'explore',
      user_emotion: parsed.user_emotion || defaultStrategy.user_emotion,
      subtext: parsed.subtext || '',
      pnl_technique: parsed.pnl_technique || null,
      book_concept: parsed.book_concept || null,
      avoid: Array.isArray(parsed.avoid) ? parsed.avoid : [],
      user_pushback: typeof parsed.user_pushback === 'boolean' ? parsed.user_pushback : false,
      topic_domain: parsed.topic_domain || 'mixed',
      specific_instruction: parsed.specific_instruction || '',
    };
  } catch (error) {
    console.error('Strategy agent error:', error);
    return defaultStrategy;
  }
}
