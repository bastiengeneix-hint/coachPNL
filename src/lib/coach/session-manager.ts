import { Session, SessionMode, Message } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export function createSession(mode: SessionMode): Session {
  return {
    id: uuidv4(),
    date: new Date().toISOString(),
    mode,
    messages: [],
    insights: [],
    themes: [],
    exercice_propose: null,
    exercice_fait: false,
    summary: null,
    coach_summary: null,
    actions: [],
  };
}

export function addMessage(
  session: Session,
  role: 'user' | 'coach',
  content: string
): Session {
  const message: Message = {
    id: uuidv4(),
    role,
    content,
    timestamp: Date.now(),
  };
  return { ...session, messages: [...session.messages, message] };
}

export function shouldEndSession(session: Session): boolean {
  if (session.messages.length < 4) return false;

  const firstMsg = session.messages[0];
  const elapsedMinutes = (Date.now() - firstMsg.timestamp) / 1000 / 60;
  if (elapsedMinutes > 25) return true;
  if (session.messages.length > 15) return true;

  return false;
}

export function extractThemes(messages: Message[]): string[] {
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ');

  const themeKeywords: Record<string, string[]> = {
    légitimité: ['légitime', 'légitimité', 'imposteur', 'pas assez'],
    'peur du regard': ['regard', 'jugement', 'autres pensent', 'image'],
    argent: ['argent', 'revenus', 'prix', 'facturer', 'business'],
    procrastination: ['procrastin', 'reporte', 'plus tard', 'pas fait'],
    perfectionnisme: ['parfait', 'perfecti', 'pas assez bien', 'jamais satisfait'],
    famille: ['famille', 'enfant', 'partenaire', 'couple', 'équilibre'],
    anxiété: ['anxiét', 'anxieux', 'stress', 'pression', 'boule au ventre'],
    confiance: ['confiance', 'croire en moi', 'capable', 'doute'],
    visibilité: ['visibil', 'montrer', 'exposer', 'linkedin', 'contenu'],
    sabotage: ['sabote', 'sabotage', 'auto-sabotage', 'limite'],
  };

  const detected: string[] = [];
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some((kw) => userText.includes(kw))) {
      detected.push(theme);
    }
  }
  return detected;
}

export function formatMessagesForAPI(
  messages: Message[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map((m) => ({
    role: m.role === 'coach' ? ('assistant' as const) : ('user' as const),
    content: m.content,
  }));
}
