import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '@/lib/prompts/system-prompt';
import { getProfile, getActiveContext } from '@/lib/memory/store-server';
import { retrievePassages } from '@/lib/rag/retrieve';
import { SessionMode } from '@/types';

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      mode,
      isFirstMessage,
    }: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      mode: SessionMode;
      isFirstMessage: boolean;
    } = body;

    const profile = getProfile();
    const activeContext = getActiveContext();

    // RAG : récupérer les passages pertinents basés sur le dernier message user
    let ragPassages: Array<{ livre: string; page: string; content: string }> = [];
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      const recentUserMessages = messages
        .filter((m) => m.role === 'user')
        .slice(-3)
        .map((m) => m.content);
      ragPassages = retrievePassages(lastUserMessage.content, recentUserMessages);
    }

    const systemPrompt = buildSystemPrompt({
      profile,
      activeContext,
      mode,
      ragPassages,
      isFirstMessage,
    });

    // Pour le premier message, envoyer un message user vide pour initier
    const apiMessages =
      messages.length === 0
        ? [{ role: 'user' as const, content: 'Bonjour, je suis prêt pour cette session.' }]
        : messages;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({ message: content.text });
  } catch (error) {
    console.error('Coach API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la communication avec le coach' },
      { status: 500 }
    );
  }
}
