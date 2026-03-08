// RAG Retrieval - MVP avec recherche par mots-clés
// En v2 : embeddings + vector DB (pgvector/ChromaDB)

interface RAGPassage {
  livre: string;
  page: string;
  content: string;
}

// Base de connaissances intégrée (concepts clés des sources v1)
// En v2 : remplacé par le vrai pipeline d'embeddings sur les PDFs
const KNOWLEDGE_BASE: Array<{
  livre: string;
  auteur: string;
  page: string;
  content: string;
  keywords: string[];
}> = [
  // The Big Leap — Gay Hendricks
  {
    livre: 'The Big Leap — Hendricks',
    auteur: 'Gay Hendricks',
    page: '12',
    content:
      "I have a limited tolerance for feeling good. When I hit my Upper Limit, I manufacture thoughts that make me feel bad. The Upper Limit Problem is the human tendency to put the brakes on our positive energy when we've exceeded our internal thermostat setting for how much success, wealth, happiness, love, and intimacy we think we deserve.",
    keywords: ['limite', 'sabotage', 'succès', 'bonheur', 'thermostat', 'frein', 'ulp', 'upper limit'],
  },
  {
    livre: 'The Big Leap — Hendricks',
    auteur: 'Gay Hendricks',
    page: '34',
    content:
      "There are four hidden barriers that keep us from reaching our Zone of Genius: the belief that we are fundamentally flawed, the fear that we will be disloyal to our roots, the belief that more success will bring a bigger burden, and the fear that we will outshine others.",
    keywords: ['barrière', 'génie', 'zone', 'défaillant', 'déloyauté', 'fardeau', 'éclipser', 'croyance'],
  },
  {
    livre: 'The Big Leap — Hendricks',
    auteur: 'Gay Hendricks',
    page: '56',
    content:
      "The Zone of Incompetence is made up of activities we're not good at. The Zone of Competence is where we do things competently but others can do them just as well. The Zone of Excellence is where we do things extremely well. The Zone of Genius is where we do what we are uniquely suited to do — it draws upon our special abilities.",
    keywords: ['zone', 'incompétence', 'compétence', 'excellence', 'génie', 'talent', 'unique'],
  },
  {
    livre: 'The Big Leap — Hendricks',
    auteur: 'Gay Hendricks',
    page: '78',
    content:
      "A Wonder Question opens up new possibilities by shifting from fear-based thinking to wonder-based thinking. Instead of worrying about what might go wrong, ask: How much love and abundance am I willing to let in? What is my genius? How can I bring my genius to every moment?",
    keywords: ['wonder', 'question', 'amour', 'abondance', 'génie', 'possibilité', 'peur'],
  },
  // Système 1 / Système 2 — Kahneman
  {
    livre: 'Système 1 & 2 — Kahneman',
    auteur: 'Daniel Kahneman',
    page: '20',
    content:
      "System 1 operates automatically and quickly, with little or no effort and no sense of voluntary control. System 2 allocates attention to effortful mental activities, including complex computations. When we think of ourselves, we identify with System 2, the conscious, reasoning self. But it is the automatic System 1 that effortlessly originates impressions and feelings that are the main sources of the explicit beliefs and deliberate choices of System 2.",
    keywords: ['système', 'automatique', 'rapide', 'effort', 'attention', 'conscient', 'impression', 'croyance'],
  },
  {
    livre: 'Système 1 & 2 — Kahneman',
    auteur: 'Daniel Kahneman',
    page: '98',
    content:
      "A reliable way to make people believe in falsehoods is frequent repetition, because familiarity is not easily distinguished from truth. The emotional tail wags the rational dog. The confidence that individuals have in their beliefs depends mostly on the quality of the story they can tell about what they see.",
    keywords: ['croyance', 'répétition', 'émotion', 'confiance', 'histoire', 'biais', 'vérité', 'rationnel'],
  },
  {
    livre: 'Système 1 & 2 — Kahneman',
    auteur: 'Daniel Kahneman',
    page: '134',
    content:
      "Loss aversion refers to the relative strength of two motives: we are driven more strongly to avoid losses than to achieve gains. The response to losses is stronger than the response to corresponding gains. This asymmetry is a powerful conservative force that favors minimal changes from the status quo.",
    keywords: ['perte', 'aversion', 'gain', 'changement', 'status quo', 'risque', 'décision', 'peur'],
  },
  {
    livre: 'Système 1 & 2 — Kahneman',
    auteur: 'Daniel Kahneman',
    page: '186',
    content:
      "Nothing in life is as important as you think it is when you are thinking about it. The focusing illusion creates a bias in favor of goods and experiences that are initially exciting but that become less pleasurable over time.",
    keywords: ['focus', 'illusion', 'important', 'attention', 'bonheur', 'perspective', 'recul'],
  },
];

export function retrievePassages(
  userMessage: string,
  _recentMessages: string[] = []
): RAGPassage[] {
  if (userMessage.length < 15) return [];

  const query = userMessage.toLowerCase();
  const scored = KNOWLEDGE_BASE.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (query.includes(kw)) {
        score += 2;
      }
    }
    // Bonus pour correspondance partielle
    const words = query.split(/\s+/);
    for (const word of words) {
      if (word.length < 3) continue;
      for (const kw of entry.keywords) {
        if (kw.includes(word) || word.includes(kw)) {
          score += 1;
        }
      }
    }
    return { ...entry, score };
  });

  return scored
    .filter((s) => s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => ({
      livre: s.livre,
      page: s.page,
      content: s.content,
    }));
}
