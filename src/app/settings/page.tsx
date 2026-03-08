'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Profile } from '@/types';
import { getProfile, updateProfile } from '@/lib/memory/store';

function EditableList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </label>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-[var(--color-bg-tertiary)] rounded-lg px-3 py-2"
          >
            <span className="flex-1 text-sm text-[var(--color-text-primary)]">{item}</span>
            <button
              onClick={() => removeItem(i)}
              className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Ajouter..."
          className="flex-1 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-lg px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const handleUpdate = (field: keyof Profile, value: string[] | Profile['preferences']) => {
    if (!profile) return;
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    updateProfile(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[var(--color-bg-primary)]">
        <div className="animate-pulse-soft text-[var(--color-text-muted)]">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg-primary)] pb-20">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-border-custom)]">
        <button
          onClick={() => router.push('/')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Réglages</h1>
        {saved && (
          <span className="ml-auto text-xs text-[var(--color-success)] animate-fade-in">
            Sauvegardé
          </span>
        )}
      </header>

      <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">
        {/* Profil */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Profil</h2>

          <div className="space-y-6">
            <EditableList
              label="Projets en cours"
              items={profile.projets}
              onChange={(items) => handleUpdate('projets', items)}
            />

            <EditableList
              label="Patterns de sabotage identifiés"
              items={profile.patterns_sabotage}
              onChange={(items) => handleUpdate('patterns_sabotage', items)}
            />

            <EditableList
              label="Barrières ULP"
              items={profile.barrieres_ulp}
              onChange={(items) => handleUpdate('barrieres_ulp', items)}
            />

            <EditableList
              label="Croyances limitantes"
              items={profile.croyances_limitantes}
              onChange={(items) => handleUpdate('croyances_limitantes', items)}
            />
          </div>
        </section>

        {/* Sources */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Bibliothèque de sources</h2>

          <div className="space-y-3">
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-custom)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">The Big Leap</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Gay Hendricks — ULP / Génie</p>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] bg-[var(--color-success)]/10 text-[var(--color-success)]">
                  v1
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-custom)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Système 1 / Système 2</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Daniel Kahneman — Cognition</p>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] bg-[var(--color-success)]/10 text-[var(--color-success)]">
                  v1
                </span>
              </div>
            </div>

            <button
              className="w-full py-3 rounded-xl border border-dashed border-[var(--color-border-custom)] text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
            >
              + Ajouter un livre (PDF)
            </button>
            <p className="text-xs text-[var(--color-text-muted)] text-center">
              Upload PDF disponible en v2
            </p>
          </div>
        </section>

        {/* Données */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Données</h2>
          <div className="space-y-3">
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border-custom)] p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Stockage local</p>
                <p className="text-xs text-[var(--color-text-muted)]">Toutes les données restent sur ton appareil</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
        </section>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-custom)] safe-bottom">
        <div className="flex justify-around items-center h-14 max-w-sm mx-auto">
          <button onClick={() => router.push('/')} className="flex flex-col items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            <span className="text-[10px]">Accueil</span>
          </button>
          <button onClick={() => router.push('/sessions')} className="flex flex-col items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
            <span className="text-[10px]">Sessions</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-[var(--color-accent)] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            <span className="text-[10px]">Réglages</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
