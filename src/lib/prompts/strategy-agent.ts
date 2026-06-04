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

TON RÔLE : Détecter 3 choses :
1. Est-ce que la conversation AVANCE ou tourne en rond ? Si les 2-3 derniers échanges se ressemblent → dis au coach de CHANGER DE TECHNIQUE PNL.
2. Quel PROCESS PNL serait pertinent ici ? Pas juste un nom de technique — un process concret que le coach peut guider.
3. Est-ce que le coach doit prendre position / être cash, ou continuer à explorer ?

ANTI-BOUCLE : Si les messages du coach se ressemblent (même structure, mêmes questions), le champ "specific_instruction" DOIT dire au coach de changer d'approche radicalement. Propose un process PNL différent.

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
1. "depth":
   - "surface" = RARE. Small talk ou pause émotionnelle.
   - "explore" = défaut. Creuser, ouvrir de nouveaux angles.
   - "dig" = sujet profond ou business concret. Le coach doit aller AU FOND, être cash si nécessaire, utiliser un process PNL complet.
2. "user_pushback" = true si ${params.userName} conteste l'analyse du coach.
3. "topic_domain" = "personal" si couple/famille/quotidien. NE PAS relier au pro.
4. "pnl_technique" — propose un PROCESS PNL concret, pas juste un nom. Décris les étapes que le coach doit suivre avec ${params.userName}. Exemples :
   - Parties en conflit : "Identifier les 2 voix, les faire dialoguer tour à tour, chercher ce que chaque partie veut vraiment"
   - Méta-modèle : "Il dit 'je peux pas' — challenger avec 'qu'est-ce qui t'en empêche concrètement ? qu'est-ce qui se passerait si tu le faisais ?'"
   - Positions perceptuelles : "Le faire se mettre à la place de X, décrire ce qu'il voit, puis revenir en 1ère position"
   - Recadrage + prise de position : "Retourner le problème, donner son avis de coach, challenger le raisonnement avec Système 1/2"
5. "avoid" — SURTOUT détecte si la conversation TOURNE EN ROND. Si les derniers messages du coach ont la même structure → mets cette structure dans avoid ET dans specific_instruction dis de changer radicalement d'approche.
6. "specific_instruction" — si tu détectes que la conversation stagne, sois DIRECTIF : "Le coach doit arrêter de poser des questions et lancer un exercice de [technique PNL]" ou "Le coach doit prendre position et être cash sur [sujet]".`;
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
