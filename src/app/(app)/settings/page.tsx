'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { getProfile, updateProfile } from '@/lib/memory/store';

interface Profile {
  projets: string[];
  patterns_sabotage: string[];
  barrieres_ulp: string[];
  croyances_limitantes: string[];
  preferences: {
    ce_qui_aide: string[];
    ce_qui_bloque: string[];
    ton: 'direct' | 'doux' | 'mix';
  };
}

interface RAGSource {
  id: string;
  titre: string;
  auteur: string;
  domaine: string;
  active: boolean;
  chunks_count: number;
  indexed_at: string;
}

const defaultProfile: Profile = {
  projets: [],
  patterns_sabotage: [],
  barrieres_ulp: [],
  croyances_limitantes: [],
  preferences: { ce_qui_aide: [], ce_qui_bloque: [], ton: 'mix' },
};

const tonOptions: { value: 'direct' | 'doux' | 'mix'; label: string; description: string }[] = [
  { value: 'direct', label: 'Direct', description: 'Franc, sans filtre, va droit au but' },
  { value: 'doux', label: 'Doux', description: 'Bienveillant, encourageant, progressif' },
  { value: 'mix', label: 'Mix', description: 'Adapte le ton selon la situation' },
];

const profileSections: { key: keyof Omit<Profile, 'preferences'>; label: string }[] = [
  { key: 'projets', label: 'Projets en cours' },
  { key: 'patterns_sabotage', label: 'Patterns de sabotage' },
  { key: 'barrieres_ulp', label: 'Barri\u00e8res ULP' },
  { key: 'croyances_limitantes', label: 'Croyances limitantes' },
];

function EditableList({
  items,
  onUpdate,
  placeholder,
}: {
  items: string[];
  onUpdate: (items: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onUpdate([...items, trimmed]);
      setInputValue('');
    }
  };

  const handleRemove = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--color-accent)',
            }}
          >
            {item}
            <button
              onClick={() => handleRemove(index)}
              className="ml-1 hover:opacity-70 transition-opacity"
              aria-label={`Supprimer ${item}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/30 outline-none transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary, rgba(255,255,255,0.06))',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--color-glass-border)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-glass-border)')}
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent), #d97706)',
            color: '#0f0d0a',
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [sources, setSources] = useState<RAGSource[]>([]);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitre, setUploadTitre] = useState('');
  const [uploadAuteur, setUploadAuteur] = useState('');
  const [uploadDomaine, setUploadDomaine] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const p = await getProfile();
        if (p) setProfile(p);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadSources = async () => {
      try {
        const res = await fetch('/api/rag/sources');
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources || data);
        }
      } catch (err) {
        console.error('Failed to load sources:', err);
      }
    };
    loadSources();
  }, []);

  const showSavedIndicator = useCallback(() => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, []);

  const handleUpdate = async (field: keyof Profile, value: Profile[keyof Profile]) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    await updateProfile(updated);
    showSavedIndicator();
  };

  const handleTonChange = async (newTon: 'direct' | 'doux' | 'mix') => {
    const updated: Profile = {
      ...profile,
      preferences: { ...profile.preferences, ton: newTon },
    };
    setProfile(updated);
    await updateProfile({ preferences: { ...profile.preferences, ton: newTon } });
    showSavedIndicator();
  };

  const handleToggleSource = async (id: string, active: boolean) => {
    try {
      await fetch('/api/rag/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      });
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch('/api/rag/sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitre || !uploadAuteur || !uploadDomaine) return;

    try {
      setUploadStatus('Extraction...');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('titre', uploadTitre);
      formData.append('auteur', uploadAuteur);
      formData.append('domaine', uploadDomaine);

      setUploadStatus('Chunking...');
      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadStatus('Indexation...');
      const data = await res.json();

      if (res.ok) {
        setUploadStatus(`Termin\u00e9 (${data.chunks_count || 0} chunks)`);
        setUploadFile(null);
        setUploadTitre('');
        setUploadAuteur('');
        setUploadDomaine('');

        // Reload sources
        const sourcesRes = await fetch('/api/rag/sources');
        if (sourcesRes.ok) {
          const sourcesData = await sourcesRes.json();
          setSources(sourcesData.sources || sourcesData);
        }

        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus(`Erreur: ${data.error || 'Upload \u00e9chou\u00e9'}`);
        setTimeout(() => setUploadStatus(null), 5000);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('Erreur lors de l\u2019upload');
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg-primary)' }}
      >
        <p className="text-sm animate-pulse" style={{ color: 'var(--color-accent)' }}>
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <div
        className="glass sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white">R\u00e9glages</h1>
        </div>
        {showSaved && (
          <span
            className="text-sm animate-fade-in"
            style={{ color: 'var(--color-accent)' }}
          >
            Sauvegard\u00e9
          </span>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Ton preference section */}
        <section className="space-y-4">
          <h2 className="text-white font-medium text-base">Style de coaching</h2>
          <div className="grid grid-cols-3 gap-3">
            {tonOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleTonChange(option.value)}
                className="glass p-4 rounded-xl text-left transition-all"
                style={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor:
                    profile.preferences.ton === option.value
                      ? 'var(--color-accent)'
                      : 'var(--color-glass-border)',
                  backgroundColor:
                    profile.preferences.ton === option.value
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'var(--color-glass)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor:
                        profile.preferences.ton === option.value
                          ? 'var(--color-accent)'
                          : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {profile.preferences.ton === option.value && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                      />
                    )}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        profile.preferences.ton === option.value
                          ? 'var(--color-accent)'
                          : 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {option.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Profile sections */}
        <section className="space-y-4">
          {profileSections.map(({ key, label }) => (
            <div key={key} className="glass rounded-xl p-4 space-y-3">
              <h3 className="text-white font-medium text-sm">{label}</h3>
              <EditableList
                items={(profile[key] as string[]) || []}
                onUpdate={(items) => handleUpdate(key, items)}
                placeholder={`Ajouter un \u00e9l\u00e9ment...`}
              />
            </div>
          ))}
        </section>

        {/* Sources section */}
        <section className="space-y-4">
          <h2 className="text-white font-medium text-base">Biblioth\u00e8que de sources</h2>
          {sources.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Aucune source index\u00e9e
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="glass rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white text-sm font-medium truncate">{source.titre}</h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {source.chunks_count} chunks
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {source.auteur} &middot; {source.domaine}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleToggleSource(source.id, !source.active)}
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        title={source.active ? 'D\u00e9sactiver' : 'Activer'}
                      >
                        <div
                          className="w-8 h-5 rounded-full relative transition-colors"
                          style={{
                            backgroundColor: source.active
                              ? 'var(--color-accent)'
                              : 'rgba(255,255,255,0.15)',
                          }}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all"
                            style={{ left: source.active ? '15px' : '3px' }}
                          />
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-red-400"
                        title="Supprimer"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upload PDF section (admin only) */}
        {isAdmin && (
          <section className="space-y-4">
            <h2 className="text-white font-medium text-base">Ajouter un livre</h2>
            <div className="glass rounded-xl p-4 space-y-4">
              {/* File drop zone */}
              <label
                className="block rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-white/5"
                style={{
                  border: '2px dashed var(--color-glass-border)',
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                {uploadFile ? (
                  <div className="space-y-1">
                    <svg
                      className="mx-auto mb-2"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p className="text-sm text-white">{uploadFile.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {(uploadFile.size / 1024 / 1024).toFixed(1)} Mo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg
                      className="mx-auto mb-2"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      Cliquez pour s\u00e9lectionner un PDF
                    </p>
                  </div>
                )}
              </label>

              {/* Metadata inputs */}
              <div className="space-y-3">
                <input
                  type="text"
                  value={uploadTitre}
                  onChange={(e) => setUploadTitre(e.target.value)}
                  placeholder="Titre du livre"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary, rgba(255,255,255,0.06))',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--color-glass-border)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-glass-border)')}
                />
                <input
                  type="text"
                  value={uploadAuteur}
                  onChange={(e) => setUploadAuteur(e.target.value)}
                  placeholder="Auteur"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary, rgba(255,255,255,0.06))',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--color-glass-border)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-glass-border)')}
                />
                <input
                  type="text"
                  value={uploadDomaine}
                  onChange={(e) => setUploadDomaine(e.target.value)}
                  placeholder="Domaine (ex: PNL, coaching, d\u00e9veloppement personnel)"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/30 outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--color-bg-secondary, rgba(255,255,255,0.06))',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--color-glass-border)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-glass-border)')}
                />
              </div>

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadTitre || !uploadAuteur || !uploadDomaine || !!uploadStatus}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent), #d97706)',
                  color: '#0f0d0a',
                }}
              >
                {uploadStatus || 'Indexer'}
              </button>
            </div>
          </section>
        )}

        {/* Account section */}
        <section className="space-y-4">
          <div className="glass rounded-xl p-4 space-y-4">
            {session?.user?.email && (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, var(--color-accent), #d97706)',
                    color: '#0f0d0a',
                  }}
                >
                  {session.user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm">{session.user.email}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {isAdmin ? 'Administrateur' : 'Utilisateur'}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors hover:bg-red-500/10"
              style={{
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
              }}
            >
              Se d\u00e9connecter
            </button>
          </div>
        </section>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
