import { Profile, ActiveContext } from '@/types';
import { defaultProfile } from './default-profile';
import * as fs from 'fs';
import * as path from 'path';

// Server-side store using JSON files (for API routes)
const DATA_DIR = path.join(process.cwd(), '.data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJSON<T>(filename: string, fallback: T): T {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch {
    // fallback on error
  }
  return fallback;
}

function writeJSON(filename: string, data: unknown): void {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

export function getProfile(): Profile {
  return readJSON<Profile>('profile.json', defaultProfile);
}

export function updateProfile(updates: Partial<Profile>): void {
  const current = getProfile();
  writeJSON('profile.json', { ...current, ...updates });
}

const defaultContext: ActiveContext = {
  summary: '',
  last_updated: new Date().toISOString(),
  recent_themes: [],
  pending_exercice: null,
};

export function getActiveContext(): ActiveContext {
  return readJSON<ActiveContext>('context.json', defaultContext);
}

export function updateActiveContext(context: ActiveContext): void {
  writeJSON('context.json', context);
}
