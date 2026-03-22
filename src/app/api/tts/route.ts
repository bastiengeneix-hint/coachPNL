import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import OpenAI from 'openai';

const MAX_TEXT_LENGTH = 4096;

const VALID_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'] as const;
const VALID_MODELS = ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'] as const;

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

    const { text, voice: requestedVoice, model: requestedModel } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const truncated = text.slice(0, MAX_TEXT_LENGTH);

    // Validate voice and model, fallback to defaults
    const voice = VALID_VOICES.includes(requestedVoice) ? requestedVoice : 'ash';
    const model = VALID_MODELS.includes(requestedModel) ? requestedModel : 'gpt-4o-mini-tts';

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Only gpt-4o-mini-tts supports instructions and speed
    const createParams: Parameters<typeof openai.audio.speech.create>[0] = {
      model,
      voice,
      input: truncated,
      response_format: 'mp3',
    };

    if (model === 'gpt-4o-mini-tts') {
      createParams.instructions = 'Parle comme un ami proche dans une vraie conversation. Rythme naturel et fluide — ni trop lent, ni robotique. Enchaîne les phrases sans pauses artificielles. Ton chaleureux mais pas théâtral. Comme si tu parlais à quelqu\'un en face de toi autour d\'un café.';
      createParams.speed = 1.0;
    }

    const response = await openai.audio.speech.create(createParams);

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
