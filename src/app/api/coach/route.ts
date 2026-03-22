import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/prompts/system-prompt';
import { getCoachingStrategy } from '@/lib/prompts/strategy-agent';
import { createServerClient } from '@/lib/supabase/server';
import { retrievePassages } from '@/lib/rag/retrieve';
import { SessionMode, Profile, ActiveContext, ExerciseResult } from '@/types';

function getAnthropicKey(): string {
  const key = process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add INNER_COACH_ANTHROPIC_KEY to your .env file.');
  }
  return key;
}

function getAnthropic() {
  return new Anthropic({ apiKey: getAnthropicKey() });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. Parse request body
    const { messages, mode, isFirstMessage } = await req.json();

    // 3. Create Supabase client
    const supabase = createServerClient();

    // 4. Fetch user name
    const { data: userRow } = await supabase
      .from('users')
      .select('name')
      .eq('id', session.user.id)
      .single();

    const userName = userRow?.name || 'ami';

    // 5. Fetch profile
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    const defaultPrefs = { ce_qui_aide: [] as string[], ce_qui_bloque: [] as string[], ton: 'mix' as const };
    const prefs = profileRow?.preferences && typeof profileRow.preferences === 'object' && !Array.isArray(profileRow.preferences)
      ? { ...defaultPrefs, ...(profileRow.preferences as Record<string, unknown>) } as Profile['preferences']
      : defaultPrefs;

    const profileData: Profile = profileRow
      ? {
          projets: profileRow.projets || [],
          patterns_sabotage: profileRow.patterns_sabotage || [],
          barrieres_ulp: profileRow.barrieres_ulp || [],
          croyances_limitantes: profileRow.croyances_limitantes || [],
          preferences: prefs,
        }
      : {
          projets: [],
          patterns_sabotage: [],
          barrieres_ulp: [],
          croyances_limitantes: [],
          preferences: defaultPrefs,
        };

    // 6. Fetch active context
    const { data: contextRow } = await supabase
      .from('active_contexts')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    const contextData: ActiveContext = contextRow
      ? {
          summary: contextRow.summary || '',
          last_updated: contextRow.last_updated || new Date().toISOString(),
          recent_themes: contextRow.recent_themes || [],
          pending_exercice: contextRow.pending_exercice || null,
        }
      : {
          summary: '',
          last_updated: new Date().toISOString(),
          recent_themes: [],
          pending_exercice: null,
        };

    // 6b. Fetch recent session messages
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    const { data: recentSessions, error: recentSessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', cutoffDate.toISOString())
      .order('date', { ascending: false })
      .limit(5);

    if (recentSessionsError) {
      console.error('Coach: failed to fetch recent sessions:', recentSessionsError);
    }

    // 7. Fetch recent exercise results
    const { data: exerciseResults } = await supabase
      .from('exercise_results')
      .select('*')
      .eq('user_id', session.user.id)
      .order('completed_at', { ascending: false })
      .limit(5);

    // 8. RAG retrieval
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
    const recentUserMessages = messages
      .filter((m: { role: string }) => m.role === 'user')
      .slice(-5)
      .map((m: { content: string }) => m.content);

    let ragPassages: Awaited<ReturnType<typeof retrievePassages>> = [];
    if (lastUserMessage?.content) {
      ragPassages = await retrievePassages(lastUserMessage.content, recentUserMessages);
    }

    // ─── 9. AGENT STRATÉGISTE (Haiku — rapide) ─────────────────────────────
    // Analyse la conversation et décide la stratégie AVANT que le coach parle

    const recentCoachMessages = messages
      .filter((m: { role: string }) => m.role === 'assistant')
      .slice(-4)
      .map((m: { content: string }) => m.content);

    const strategy = await getCoachingStrategy({
      apiKey: getAnthropicKey(),
      userName,
      userMessage: lastUserMessage?.content || '',
      recentCoachMessages,
      recentUserMessages,
      ragPassages: ragPassages.map((p) => ({ livre: p.livre, content: p.content })),
      profile: {
        projets: profileData.projets,
        patterns_sabotage: profileData.patterns_sabotage,
        croyances_limitantes: profileData.croyances_limitantes,
      },
      sessionMessageCount: messages.length,
    });

    console.log(`Coach strategy: move=${strategy.move}, length=${strategy.length}, tone=${strategy.tone}, question=${strategy.should_ask_question}, book=${strategy.book_concept ? 'yes' : 'no'}, avoid=${strategy.avoid.length} patterns`);

    // ─── 10. BUILD DYNAMIC SYSTEM PROMPT ────────────────────────────────────

    const systemPrompt = buildSystemPrompt({
      userName,
      profile: profileData,
      activeContext: contextData,
      mode: mode as SessionMode,
      ragPassages,
      isFirstMessage,
      exerciseResults: (exerciseResults || []) as unknown as ExerciseResult[],
      recentSessions: (recentSessions || []) as unknown as Array<{
        date: string;
        mode: string;
        messages: Array<{ role: string; content: string }>;
        themes: string[];
        actions: Array<{ text: string; done: boolean }>;
        coach_summary: string | null;
      }>,
      strategy,
    });

    const sessionsWithMessages = (recentSessions || []).filter(
      (s: Record<string, unknown>) => Array.isArray(s.messages) && (s.messages as unknown[]).length > 0
    );
    console.log(`Coach: ${sessionsWithMessages.length} sessions with history. System prompt: ${systemPrompt.length} chars`);

    // ─── 11. CALL COACH (Sonnet — with focused strategy) ───────────────────

    const apiMessages =
      messages.length === 0
        ? [{ role: 'user' as const, content: 'Bonjour, je suis prêt pour cette session.' }]
        : messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }));

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    });

    // 12. Extract text response
    const textContent = response.content.find((block) => block.type === 'text');
    const messageText = textContent ? textContent.text : '';

    if (!messageText) {
      return NextResponse.json(
        { error: 'Le coach n\'a pas pu générer de réponse. Réessaye.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: messageText });
  } catch (error) {
    console.error('Coach API error:', error);
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
