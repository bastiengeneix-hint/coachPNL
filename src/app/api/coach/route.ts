import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPromptParts } from '@/lib/prompts/system-prompt';
import { getCoachingStrategy, openingStrategy } from '@/lib/prompts/strategy-agent';
import { createServerClient } from '@/lib/supabase/server';
import { retrievePassages } from '@/lib/rag/retrieve';
import { COACH_MODEL } from '@/lib/ai/models';
import { computeSessionArc } from '@/lib/coach/session-arc';
import { getCoachingSnapshot } from '@/lib/program/snapshot';
import { buildFollowUpAgenda, buildSnapshotBriefing } from '@/lib/prompts/program-block';
import { SessionMode, Profile, ActiveContext, ExerciseResult } from '@/types';

function getAnthropicKey(): string {
  const key = process.env.INNER_COACH_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is not set. Add INNER_COACH_ANTHROPIC_KEY to your .env file.');
  }
  return key;
}

// Le coach a le droit de développer quand le superviseur le demande ; il n'a pas
// le droit d'être coupé au milieu d'une phrase.
const MAX_TOKENS_BY_LENGTH: Record<string, number> = {
  short: 400,
  medium: 800,
  long: 1600,
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // 2. Parse request body
    const { messages, mode, isFirstMessage, startedAt } = await req.json();

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

    // 6c. Depuis quand on se connaît, et combien de séances — la mémoire du lien.
    const { data: firstSessionRow, count: sessionsTotal } = await supabase
      .from('sessions')
      .select('date', { count: 'exact' })
      .eq('user_id', session.user.id)
      .order('date', { ascending: true })
      .limit(1);

    // 6d. LE SUIVI — parcours, mesures, pratiques, protocoles à réévaluer,
    // check-ins, engagements non soldés. Une seule lecture, partagée par le
    // superviseur et le prompt du coach : ils travaillent sur la même vérité.
    const snapshot = await getCoachingSnapshot(supabase, session.user.id);
    const agenda = buildFollowUpAgenda(snapshot);
    const pendingActions = snapshot.pendingActions.map(
      (a) => `${a.text} (pris il y a ${a.days_ago} j)`
    );

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

    // ─── 9. ARC DE SÉANCE (déterministe, sans modèle) ──────────────────────

    const arc = computeSessionArc({
      messageCount: Array.isArray(messages) ? messages.length : 0,
      startedAt: typeof startedAt === 'number' ? startedAt : null,
      mode: mode as SessionMode,
    });

    // ─── 10. SUPERVISEUR (Haiku — rapide) ──────────────────────────────────
    // Il voit la conversation dans l'ordre, la phase, les engagements, et il
    // décide : mouvement, protocole PNL + étape, risque, mots à reprendre.

    // Rien à superviser sur le message d'ouverture : on ne paie ni l'appel ni l'attente.
    const strategy = !lastUserMessage?.content
      ? openingStrategy(mode === 'journal' ? 'journal' : 'deblocage')
      : await getCoachingStrategy({
          apiKey: getAnthropicKey(),
          userName,
          userMessage: lastUserMessage.content,
          messages: (messages || []) as Array<{ role: string; content: string }>,
          ragPassages: ragPassages.map((p) => ({ livre: p.livre, content: p.content })),
          profile: {
            projets: profileData.projets,
            patterns_sabotage: profileData.patterns_sabotage,
            croyances_limitantes: profileData.croyances_limitantes,
            barrieres_ulp: profileData.barrieres_ulp,
          },
          pendingEngagements: pendingActions,
          recentThemes: contextData.recent_themes,
          phase: arc.phase,
          shouldLand: arc.shouldLand,
          exchangeCount: arc.exchangeCount,
          elapsedMinutes: arc.elapsedMinutes,
          snapshotBriefing: buildSnapshotBriefing(snapshot),
          agenda,
        });

    console.log(
      `Coach strategy: phase=${arc.phase} move=${strategy.move} protocol=${strategy.protocol ?? 'none'}:${strategy.protocol_step} len=${strategy.length} tone=${strategy.tone} q=${strategy.should_ask_question} intensity=${strategy.emotion_intensity} risk=${strategy.risk} agenda=${strategy.agenda_item ?? '-'}/${agenda.length} book=${strategy.book_concept ? 'yes' : 'no'} avoid=${strategy.avoid.length}`
    );

    // ─── 11. PROMPT SYSTÈME ────────────────────────────────────────────────
    // Deux blocs : le bloc stable (qui est le coach) est mis en cache côté API,
    // le bloc contextuel change à chaque tour.

    const { stable, contextual } = buildSystemPromptParts({
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
      arc,
      snapshot,
      agenda,
      sessionsTotal: sessionsTotal ?? 0,
      firstSessionDate: firstSessionRow?.[0]?.date ?? null,
    });

    const sessionsWithMessages = (recentSessions || []).filter(
      (s: Record<string, unknown>) => Array.isArray(s.messages) && (s.messages as unknown[]).length > 0
    );
    console.log(
      `Coach: ${sessionsWithMessages.length} sessions with history. Prompt: ${stable.length} chars stable (cached) + ${contextual.length} chars contextual`
    );

    // ─── 12. APPEL DU COACH ────────────────────────────────────────────────

    const apiMessages =
      messages.length === 0
        ? [{ role: 'user' as const, content: 'Bonjour, je suis prêt pour cette session.' }]
        : messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          }));

    const anthropic = new Anthropic({ apiKey: getAnthropicKey() });

    const response = await anthropic.messages.create({
      model: COACH_MODEL,
      max_tokens: MAX_TOKENS_BY_LENGTH[strategy.length] ?? 800,
      system: [
        { type: 'text', text: stable, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: contextual },
      ],
      messages: apiMessages,
    });

    // 13. Extract text response
    const textContent = response.content.find((block) => block.type === 'text');
    const messageText = textContent ? textContent.text : '';

    if (!messageText) {
      return NextResponse.json(
        { error: 'Le coach n\'a pas pu générer de réponse. Réessaye.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: messageText,
      // Méta non affichée — utile pour déboguer une séance qui part de travers.
      meta: {
        phase: arc.phase,
        move: strategy.move,
        protocol: strategy.protocol,
        protocol_step: strategy.protocol_step,
        risk: strategy.risk,
        agenda_item: strategy.agenda_item,
        has_program: snapshot.program !== null,
      },
    });
  } catch (error) {
    console.error('Coach API error:', error);
    const message = error instanceof Error ? error.message : 'Erreur interne du serveur';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
