// ─── PIPELINE DE COACHING ───────────────────────────────────────────────────
// Orchestrateur : Session Tracker → Diagnostic → Intervention → Coach
//
// 1. Session Tracker (code, instant) — détecte boucles, techniques utilisées
// 2. Diagnostic (Haiku) — pattern recognition PNL profond
// 3. Intervention (Haiku, séquentiel après diagnostic) — plan d'exécution
// 4. Les 3 outputs alimentent le system prompt pour le Coach (Sonnet)

import { runDiagnostic, Diagnostic } from './diagnostic';
import { planIntervention, Intervention } from './intervention';
import { analyzeSession, SessionAnalysis } from './session-tracker';

export interface CoachingIntelligence {
  diagnostic: Diagnostic;
  intervention: Intervention;
  session: SessionAnalysis;
}

export type { Diagnostic, Intervention, SessionAnalysis };

export async function runCoachingPipeline(params: {
  apiKey: string;
  userName: string;
  userMessage: string;
  recentCoachMessages: string[];
  recentUserMessages: string[];
  ragPassages: { livre: string; content: string }[];
  profile: { projets: string[]; patterns_sabotage: string[]; croyances_limitantes: string[] };
  totalMessages: number;
}): Promise<CoachingIntelligence> {
  // 1. Session Tracker (instant, code-based)
  const session = analyzeSession({
    coachMessages: params.recentCoachMessages,
    userMessages: params.recentUserMessages,
    totalMessages: params.totalMessages,
  });

  // 2. Diagnostic Agent (Haiku ~200ms)
  const diagnostic = await runDiagnostic({
    apiKey: params.apiKey,
    userName: params.userName,
    userMessage: params.userMessage,
    recentCoachMessages: params.recentCoachMessages,
    recentUserMessages: params.recentUserMessages,
    profile: params.profile,
  });

  // 3. Intervention Agent (Haiku ~200ms) — needs diagnostic result
  const intervention = await planIntervention({
    apiKey: params.apiKey,
    userName: params.userName,
    userMessage: params.userMessage,
    diagnostic,
    recentCoachMessages: params.recentCoachMessages,
    ragPassages: params.ragPassages,
    isLooping: session.is_looping,
    techniquesUsed: session.techniques_used,
  });

  console.log(`[Pipeline] Diagnostic: ${diagnostic.core_pattern} @ ${diagnostic.dilts_level} | Intervention: ${intervention.technique} (${intervention.stance}) | Loop: ${session.is_looping} | Stage: ${session.conversation_stage}`);

  return { diagnostic, intervention, session };
}
