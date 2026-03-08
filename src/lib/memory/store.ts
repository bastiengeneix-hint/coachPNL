'use client';

import { Session, Profile, ActiveContext } from '@/types';
import { defaultProfile } from './default-profile';

const KEYS = {
  SESSIONS: 'innercoach_sessions',
  PROFILE: 'innercoach_profile',
  CONTEXT: 'innercoach_context',
} as const;

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Sessions ---

export function getSessions(): Session[] {
  return getItem<Session[]>(KEYS.SESSIONS, []);
}

export function getSession(id: string): Session | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export function saveSession(session: Session): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  setItem(KEYS.SESSIONS, sessions);
}

export function getRecentSessions(days: number = 7): Session[] {
  const sessions = getSessions();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return sessions
    .filter((s) => new Date(s.date).getTime() > cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// --- Profile ---

export function getProfile(): Profile {
  return getItem<Profile>(KEYS.PROFILE, defaultProfile);
}

export function updateProfile(updates: Partial<Profile>): void {
  const current = getProfile();
  setItem(KEYS.PROFILE, { ...current, ...updates });
}

// --- Active Context ---

const defaultContext: ActiveContext = {
  summary: '',
  last_updated: new Date().toISOString(),
  recent_themes: [],
  pending_exercice: null,
};

export function getActiveContext(): ActiveContext {
  return getItem<ActiveContext>(KEYS.CONTEXT, defaultContext);
}

export function updateActiveContext(context: ActiveContext): void {
  setItem(KEYS.CONTEXT, context);
}
