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
      instructions: 'Parle comme un ami proche dans une vraie conversation. Rythme naturel et fluide — ni trop lent, ni robotique. Enchaîne les phrases sans pauses artificielles. Ton chaleureux mais pas théâtral. Comme si tu parlais à quelqu\'un en face de toi autour d\'un café.',
      speed: 1.15,
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
