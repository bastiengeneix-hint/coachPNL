// ─── SESSION TRACKER ────────────────────────────────────────────────────────
// Analyse PROGRAMMATIQUE (pas d'IA) de la session en cours.
// Détecte les boucles, les techniques déjà utilisées, le stade de conversation.

export interface SessionAnalysis {
  is_looping: boolean;
  loop_detail: string;
  techniques_used: string[];
  conversation_stage: 'opening' | 'exploring' | 'deepening' | 'integration';
  coach_patterns: string[];
}

const PNL_KEYWORDS: Record<string, string[]> = {
  'recadrage': ['autre angle', 'si on retournait', 'et si c\'était une information', 'autrement dit'],
  'parties en conflit': ['partie de toi', 'd\'un côté', 'de l\'autre', 'deux voix', 'tiraillé'],
  'positions perceptuelles': ['à la place de', 'de l\'extérieur', 'si tu étais', '2e position', '3e position'],
  'ligne du temps': ['dans 6 mois', 'projette-toi', 'imagine-toi dans', 'futur', 'dans un an'],
  'méta-modèle': ['toujours ?', 'jamais ?', 'qui dit que', 'qu\'est-ce qui t\'empêche', 'concrètement', 'selon quels critères'],
  'ancrage': ['ancre', 'associe cette sensation', 'geste physique'],
  'dissociation': ['sur un écran', 'observe de loin', 'prends du recul'],
  'système 1/2': ['système 1', 'système 2', 'réaction automatique', 'instinct vs', 'réflexe'],
  'niveaux logiques': ['niveau', 'environnement', 'comportement', 'capacité', 'croyance', 'identité'],
  'ulp': ['upper limit', 'thermostat', 'zone de génie', 'sabotage après'],
};

function extractMessagePatterns(msg: string): string[] {
  const patterns: string[] = [];
  if (msg.includes('?')) patterns.push('question');
  if (/^(je vois|j'entends|ce que je|là ce que)/i.test(msg.trim())) patterns.push('observation');
  if (/^(ok|d'accord|je comprends|j'entends)/i.test(msg.trim())) patterns.push('validation_start');
  if (msg.length < 150) patterns.push('short');
  if (msg.length > 500) patterns.push('long');
  const questionCount = (msg.match(/\?/g) || []).length;
  if (questionCount >= 2) patterns.push('multi_question');
  if (questionCount === 1) patterns.push('single_question');
  if (questionCount === 0) patterns.push('no_question');
  return patterns;
}

function detectLooping(coachMessages: string[]): { looping: boolean; detail: string; patterns: string[] } {
  if (coachMessages.length < 3) return { looping: false, detail: '', patterns: [] };

  const last3 = coachMessages.slice(-3);
  const structures = last3.map(extractMessagePatterns);

  const repeatedPatterns: string[] = [];
  const allPatterns = structures[0] || [];
  for (const pattern of allPatterns) {
    if (structures.every(s => s.includes(pattern))) {
      repeatedPatterns.push(pattern);
    }
  }

  if (repeatedPatterns.length >= 2) {
    const detail = `Les 3 derniers messages du coach ont la même structure : ${repeatedPatterns.join(', ')}`;
    return { looping: true, detail, patterns: repeatedPatterns };
  }

  const last4User = coachMessages.slice(-4);
  const questions = last4User
    .map(m => {
      const matches = m.match(/[^.!?]*\?/g) || [];
      return matches.map(q => q.trim().toLowerCase().replace(/[^a-zàâéèêëïîôùûüÿçœæ\s]/g, ''));
    })
    .flat()
    .filter(q => q.length > 10);

  if (questions.length >= 3) {
    const words = questions.map(q => new Set(q.split(/\s+/).filter(w => w.length > 3)));
    let similarPairs = 0;
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const intersection = [...words[i]].filter(w => words[j].has(w));
        const similarity = intersection.length / Math.min(words[i].size, words[j].size);
        if (similarity > 0.5) similarPairs++;
      }
    }
    if (similarPairs >= 2) {
      return { looping: true, detail: 'Le coach pose des questions similaires reformulées.', patterns: ['repetitive_questions'] };
    }
  }

  return { looping: false, detail: '', patterns: repeatedPatterns };
}

function detectTechniques(messages: string[]): string[] {
  const found = new Set<string>();
  for (const msg of messages) {
    const lower = msg.toLowerCase();
    for (const [technique, keywords] of Object.entries(PNL_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) {
        found.add(technique);
      }
    }
  }
  return Array.from(found);
}

function detectStage(messageCount: number): 'opening' | 'exploring' | 'deepening' | 'integration' {
  if (messageCount <= 2) return 'opening';
  if (messageCount <= 8) return 'exploring';
  if (messageCount <= 16) return 'deepening';
  return 'integration';
}

export function analyzeSession(params: {
  coachMessages: string[];
  userMessages: string[];
  totalMessages: number;
}): SessionAnalysis {
  const { looping, detail, patterns } = detectLooping(params.coachMessages);
  const techniques = detectTechniques(params.coachMessages.slice(-8));
  const stage = detectStage(params.totalMessages);

  return {
    is_looping: looping,
    loop_detail: detail,
    techniques_used: techniques,
    conversation_stage: stage,
    coach_patterns: patterns,
  };
}
