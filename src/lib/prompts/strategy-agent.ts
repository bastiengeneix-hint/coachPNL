// ─── AGENT STRATÉGISTE ──────────────────────────────────────────────────────
// Haiku analyse la conversation et décide la stratégie AVANT que le coach parle.
// C'est le "superviseur de session" — il voit ce que le coach ne voit pas.

import Anthropic from '@anthropic-ai/sdk';

export interface CoachingStrategy {
  // Quel mouvement de coaching utiliser
  move: 'mirror' | 'observation' | 'metaphor' | 'confrontation' | 'celebration' | 'silence' | 'provocation' | 'personal_share' | 'zoom_out' | 'reframe' | 'teach' | 'exercise';
  // Longueur de la réponse
  length: 'short' | 'medium' | 'long';
  // Ton émotionnel
  tone: 'warm' | 'direct' | 'playful' | 'serious' | 'tender';
  // Température émotionnelle détectée chez l'utilisateur
  user_emotion: string;
  // Ce que le stratégiste voit sous la surface
  subtext: string;
  // Concept de livre à utiliser (null si pas pertinent)
  book_concept: { idea: string; how_to_use: string } | null;
  // Technique PNL à utiliser (null si pas pertinent pour ce message)
  pnl_technique: { technique: string; how_to_apply: string } | null;
  // Patterns à éviter (répétitions détectées dans les derniers messages)
  avoid: string[];
  // Faut-il poser une question ?
  should_ask_question: boolean;
  // L'utilisateur conteste-t-il l'analyse du coach ?
  user_pushback: boolean;
  // Le sujet est-il personnel (couple, famille, quotidien) ou professionnel ?
  topic_domain: 'personal' | 'professional' | 'mixed';
  // Instruction spécifique pour ce message
  specific_instruction: string;
}

const STRATEGY_SYSTEM_PROMPT = `Tu es le superviseur de session d'un coach PNL. Tu ne parles JAMAIS au coaché — tu analyses la conversation et tu donnes des instructions au coach.

Tu es un expert en :
- PNL (Programmation Neuro-Linguistique) — ancrage, recadrage, ligne du temps, parties en conflit, positions perceptuelles, dissociation, meta-model, niveaux logiques de Dilts
- Coaching professionnel
- Dynamiques conversationnelles
- Psychologie émotionnelle

TON RÔLE : Avant chaque réponse du coach, tu analyses la situation et tu décides la meilleure stratégie. Tu es le cerveau derrière le coach.

RÈGLES CRITIQUES :
1. PUSHBACK — Si le coaché conteste, rejette ou corrige l'analyse du coach, user_pushback = true. Le coach DOIT reconnaître son erreur et changer d'angle. JAMAIS doubler dessus.
2. PRO/PERSO — Détecte si le sujet est personnel (couple, famille, quotidien) ou professionnel. Si c'est personnel, NE PAS donner l'instruction de le relier au travail.
3. PNL — Le coach est un coach PNL. Propose une technique PNL concrète au moins 1 message sur 2. Pas juste nommer la technique — explique comment l'appliquer dans ce contexte précis.
4. FORMULES INTERDITES — Mets TOUJOURS dans "avoid" : "Tu viens de dire quelque chose d'énorme", "Stop", "Attends", "Pause", "Là tu touches quelque chose d'important", "Wahou", "C'est courageux de", "Si je reformule", "Dis-m'en plus", "C'est intéressant".

Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.`;

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
    : 'Aucun message précédent du coach dans cette session.';

  const userHistory = params.recentUserMessages.length > 0
    ? params.recentUserMessages.slice(0, -1).map((m, i) => `${params.userName} msg ${i + 1}: ${m.slice(0, 200)}`).join('\n')
    : '';

  const bookPassages = params.ragPassages.length > 0
    ? params.ragPassages.map((p) => `[${p.livre}]: ${p.content.slice(0, 200)}`).join('\n')
    : 'Aucun passage de livre pertinent trouvé.';

  const profileInfo = [
    params.profile.projets.length > 0 ? `Projets: ${params.profile.projets.join(', ')}` : '',
    params.profile.patterns_sabotage.length > 0 ? `Patterns sabotage: ${params.profile.patterns_sabotage.join(', ')}` : '',
    params.profile.croyances_limitantes.length > 0 ? `Croyances limitantes: ${params.profile.croyances_limitantes.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return `ANALYSE CETTE SITUATION ET DÉCIDE LA STRATÉGIE DU COACH.

## Coaché : ${params.userName}
${profileInfo || 'Profil pas encore renseigné.'}

## Dernier message de ${params.userName} :
"${params.userMessage}"

## Historique récent de la session (${params.sessionMessageCount} messages) :
${userHistory ? `Messages de ${params.userName} :\n${userHistory}\n` : ''}
Messages du coach :
${coachHistory}

## Passages de livres disponibles :
${bookPassages}

## ANALYSE ET DÉCIDE :

Réponds en JSON avec cette structure exacte :
{
  "move": "mirror|observation|metaphor|confrontation|celebration|silence|provocation|personal_share|zoom_out|reframe|teach|exercise",
  "length": "short|medium|long",
  "tone": "warm|direct|playful|serious|tender",
  "user_emotion": "l'émotion principale que tu détectes (1-3 mots)",
  "subtext": "ce qui se dit SOUS les mots, ce que ${params.userName} n'ose pas dire (1 phrase)",
  "book_concept": {"idea": "concept du livre à utiliser", "how_to_use": "comment l'intégrer naturellement"} ou null,
  "pnl_technique": {"technique": "nom de la technique PNL", "how_to_apply": "comment l'appliquer concrètement ici"} ou null,
  "avoid": ["patterns détectés dans les messages récents du coach à NE PAS répéter"],
  "should_ask_question": true/false,
  "user_pushback": true/false,
  "topic_domain": "personal|professional|mixed",
  "specific_instruction": "instruction précise pour ce message spécifique (1-2 phrases)"
}

RÈGLES D'ANALYSE :
1. Si le coach a posé une question dans son dernier message, should_ask_question = false (on ne bombarde pas de questions)
2. Si le coach a utilisé la même structure dans ses 2 derniers messages, mets cette structure dans "avoid"
3. "length" = "short" par défaut. "medium" si le sujet nécessite du développement. "long" UNIQUEMENT si c'est un moment de teaching avec des concepts de livres, un zoom arrière sur le parcours, ou un partage personnel du coach
4. Si des passages de livres sont pertinents, UTILISE-LES — c'est le savoir du coach
5. "silence" = réponse très courte (1 phrase) après un moment émotionnel fort
6. Détecte les répétitions thématiques du coach (mêmes questions reformulées, mêmes angles)
7. "user_pushback" = true si ${params.userName} conteste, rejette ou dit que l'analyse du coach est fausse. Quand c'est true, le move NE PEUT PAS être "confrontation" — utilise "mirror", "observation" ou "personal_share" à la place
8. "topic_domain" = "personal" si le sujet est couple, famille, amitié, quotidien, émotions perso. "professional" si c'est travail, projets, carrière. "mixed" seulement si ${params.userName} fait LUI-MÊME le lien
9. Si topic_domain = "personal", le specific_instruction NE DOIT PAS mentionner les projets pro, les patterns de sabotage au travail, ou les objectifs professionnels
10. "pnl_technique" — propose une technique PNL concrète au moins 1 message sur 2. Pas juste le nom : explique comment le coach doit l'utiliser dans CE contexte précis
11. TOUJOURS inclure dans "avoid" : "Tu viens de dire quelque chose d'énorme", "Stop", "Attends", "Là tu touches quelque chose d'important", "Wahou", "C'est courageux de", "Dis-m'en plus"`;
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
  const bannedPhrases = [
    'Tu viens de dire quelque chose d\'énorme',
    'Stop',
    'Attends',
    'Pause',
    'Là tu touches quelque chose d\'important',
    'Wahou',
    'C\'est courageux de',
    'Dis-m\'en plus',
    'Si je reformule',
    'C\'est intéressant',
  ];

  const defaultStrategy: CoachingStrategy = {
    move: 'observation',
    length: 'short',
    tone: 'warm',
    user_emotion: 'inconnu',
    subtext: '',
    book_concept: null,
    pnl_technique: null,
    avoid: bannedPhrases,
    should_ask_question: false,
    user_pushback: false,
    topic_domain: 'mixed',
    specific_instruction: 'Réagis naturellement à ce que tu entends.',
  };

  try {
    const anthropic = new Anthropic({ apiKey: params.apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
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

    // Parse JSON — handle potential markdown wrapping
    let jsonStr = text.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);

    const parsedAvoid = Array.isArray(parsed.avoid) ? parsed.avoid : [];
    const mergedAvoid = [...new Set([...bannedPhrases, ...parsedAvoid])];

    return {
      move: parsed.user_pushback && parsed.move === 'confrontation' ? 'mirror' : (parsed.move || defaultStrategy.move),
      length: parsed.length || defaultStrategy.length,
      tone: parsed.tone || defaultStrategy.tone,
      user_emotion: parsed.user_emotion || defaultStrategy.user_emotion,
      subtext: parsed.subtext || defaultStrategy.subtext,
      book_concept: parsed.book_concept || null,
      pnl_technique: parsed.pnl_technique || null,
      avoid: mergedAvoid,
      should_ask_question: typeof parsed.should_ask_question === 'boolean' ? parsed.should_ask_question : false,
      user_pushback: typeof parsed.user_pushback === 'boolean' ? parsed.user_pushback : false,
      topic_domain: parsed.topic_domain || 'mixed',
      specific_instruction: parsed.specific_instruction || defaultStrategy.specific_instruction,
    };
  } catch (error) {
    console.error('Strategy agent error:', error);
    return defaultStrategy;
  }
}
