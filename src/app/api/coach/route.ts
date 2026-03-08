import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/prompts/system-prompt';
import { createServerClient } from '@/lib/supabase/server';
import { retrievePassages } from '@/lib/rag/retrieve';
import { SessionMode, Profile, ActiveContext } from '@/types';

function getAnthropic() {
  return new Anthropic();
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

    // 7. RAG retrieval
    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
    const recentUserMessages = messages
      .filter((m: { role: string }) => m.role === 'user')
      .slice(-5)
      .map((m: { content: string }) => m.content);

    let ragPassages: Awaited<ReturnType<typeof retrievePassages>> = [];
    if (lastUserMessage?.content) {
      ragPassages = await retrievePassages(lastUserMessage.content, recentUserMessages);
    }

    // 8. Build system prompt
    const systemPrompt = buildSystemPrompt({
      userName,
      profile: profileData,
      activeContext: contextData,
      mode: mode as SessionMode,
      ragPassages,
      isFirstMessage,
    });

    // 9. Call Anthropic
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

    // 10. Extract text response
    const textContent = response.content.find((block) => block.type === 'text');
    const messageText = textContent ? textContent.text : '';

    return NextResponse.json({ message: messageText });
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
