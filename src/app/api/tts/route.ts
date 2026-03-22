import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import OpenAI from 'openai';

const MAX_TEXT_LENGTH = 4096;

export async function GET() {
  // Health check: is TTS configured?
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ available: false });
  }
  return NextResponse.json({ available: true });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'TTS not configured — add OPENAI_API_KEY to your environment' }, { status: 503 });
    }

    const { text } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const truncated = text.slice(0, MAX_TEXT_LENGTH);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'onyx',
      input: truncated,
      instructions: 'Tu es un coach PNL bienveillant et chaleureux. Parle de manière naturelle, posée et empathique, comme dans une vraie conversation. Utilise un ton calme et encourageant avec des pauses naturelles.',
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `TTS generation failed: ${message}` }, { status: 500 });
  }
}
