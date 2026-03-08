'use client';

import { Session, Profile, ActiveContext } from '@/types';

// --- Sessions ---

export async function getSessions(): Promise<Session[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) return [];
  return res.json();
}

export async function getRecentSessions(days: number = 7): Promise<Session[]> {
  const res = await fetch(`/api/sessions?recent=${days}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getSession(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function saveSession(session: Session): Promise<void> {
  await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
}

// --- Profile ---

export async function getProfile(): Promise<Profile> {
  const res = await fetch('/api/profile');
  if (!res.ok) return defaultEmptyProfile;
  return res.json();
}

export async function updateProfile(updates: Partial<Profile>): Promise<void> {
  await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

// --- Active Context ---

export async function getActiveContext(): Promise<ActiveContext> {
  const res = await fetch('/api/context');
  if (!res.ok) return defaultEmptyContext;
  return res.json();
}

export async function updateActiveContext(context: ActiveContext): Promise<void> {
  await fetch('/api/context', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });
}

// --- Defaults ---

const defaultEmptyProfile: Profile = {
  projets: [],
  patterns_sabotage: [],
  barrieres_ulp: [],
  croyances_limitantes: [],
  preferences: { ce_qui_aide: [], ce_qui_bloque: [], ton: 'mix' as const },
};

const defaultEmptyContext: ActiveContext = {
  summary: '',
  last_updated: new Date().toISOString(),
  recent_themes: [],
  pending_exercice: null,
};
