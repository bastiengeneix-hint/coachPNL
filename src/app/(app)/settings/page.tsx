'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { getProfile, updateProfile } from '@/lib/memory/store';
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from '@/lib/notifications/push-manager';

interface Profile {
  projets: string[];
  patterns_sabotage: string[];
  barrieres_ulp: string[];
  croyances_limitantes: string[];
  preferences: {
    ce_qui_aide: string[];
    ce_qui_bloque: string[];
    ton: 'direct' | 'doux' | 'mix';
    tts_enabled?: boolean;
    tts_voice?: string;
    tts_model?: string;
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

const voiceOptions: { value: string; label: string; description: string }[] = [
  { value: 'ash', label: 'Ash', description: 'Conversationnel, chaleureux' },
  { value: 'coral', label: 'Coral', description: 'Engageant, expressif' },
  { value: 'sage', label: 'Sage', description: 'Calme, posé, sage' },
  { value: 'nova', label: 'Nova', description: 'Dynamique, énergique' },
  { value: 'onyx', label: 'Onyx', description: 'Profond, autoritaire' },
  { value: 'alloy', label: 'Alloy', description: 'Neutre, équilibré' },
  { value: 'echo', label: 'Echo', description: 'Clair, articulé' },
  { value: 'shimmer', label: 'Shimmer', description: 'Lumineux, optimiste' },
  { value: 'ballad', label: 'Ballad', description: 'Doux, mélodique' },
  { value: 'fable', label: 'Fable', description: 'Narratif, conteur' },
];

const modelOptions: { value: string; label: string; description: string }[] = [
  { value: 'gpt-4o-mini-tts', label: '4o Mini TTS', description: 'Meilleur contrôle du ton (recommandé)' },
  { value: 'tts-1-hd', label: 'TTS HD', description: 'Qualité audio HD — 2× plus cher' },
  { value: 'tts-1', label: 'TTS Standard', description: 'Rapide, qualité standard — le moins cher' },
];

const tonOptions: { value: 'direct' | 'doux' | 'mix'; label: string; description: string }[] = [
  { value: 'direct', label: 'Direct', description: 'Franc, sans filtre, va droit au but' },
  { value: 'doux', label: 'Doux', description: 'Bienveillant, encourageant, progressif' },
  { value: 'mix', label: 'Mix', description: 'Adapte le ton selon la situation' },
];

const profileSections: { key: keyof Omit<Profile, 'preferences'>; label: string }[] = [
  { key: 'projets', label: 'Projets en cours' },
  { key: 'patterns_sabotage', label: 'Patterns de sabotage' },
  { key: 'barrieres_ulp', label: 'Barrières ULP' },
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-teal-50 text-teal-700 border border-teal-200"
          >
            {item}
            <button
              onClick={() => handleRemove(index)}
              className="ml-0.5 hover:text-red-500 transition-colors"
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
          className="flex-1 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <button
          onClick={handleAdd}
          className="px-4 py-2.5 rounded-xl text-sm font-medium bg-teal-600 text-white transition-all hover:bg-teal-700 active:scale-[0.98]"
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
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
    const loadNotificationState = async () => {
      const perm = await getNotificationPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        const subscribed = await isPushSubscribed();
        setNotificationsEnabled(subscribed);
      }
    };
    loadNotificationState();
  }, []);

  const handleToggleNotifications = useCallback(async () => {
    if (notificationsEnabled) {
      await unsubscribeFromPush();
      setNotificationsEnabled(false);
    } else {
      const granted = await requestNotificationPermission();
      setNotificationPermission(granted ? 'granted' : 'denied');
      if (granted) {
        const subscribed = await subscribeToPush();
        setNotificationsEnabled(subscribed);
      }
    }
  }, [notificationsEnabled]);

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

      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text || 'Erreur serveur' };
      }

      if (res.ok) {
        setUploadStatus(`Terminé (${data.chunksCount || data.chunks_count || 0} chunks)`);
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
        setUploadStatus(`Erreur: ${data.error || 'Upload échoué'}`);
        setTimeout(() => setUploadStatus(null), 5000);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus("Erreur lors de l'upload");
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '200ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 md:pb-24 bg-stone-50">
      {/* Header */}
      <div className="md:pt-20 pt-6 max-w-3xl mx-auto px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Réglages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Personnalise ton expérience
            </p>
          </div>
          {showSaved && (
            <span className="text-sm text-emerald-500 animate-fade-in font-medium flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Sauvegardé
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {/* Coaching style section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Style de coaching
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {tonOptions.map((option) => {
              const isSelected = profile.preferences.ton === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleTonChange(option.value)}
                  className={`p-5 rounded-2xl text-left transition-all duration-200 border-2 ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-teal-500'
                          : 'border-gray-400'
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isSelected
                          ? 'text-teal-600'
                          : 'text-gray-800'
                      }`}
                    >
                      {option.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Audio section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Audio</h2>

          {/* TTS toggle */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-800 text-sm font-medium">
                  Réponses audio
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Le coach lit ses réponses à voix haute
                </p>
              </div>
              <button
                onClick={async () => {
                  const newValue = !profile.preferences.tts_enabled;
                  const updated: Profile = {
                    ...profile,
                    preferences: { ...profile.preferences, tts_enabled: newValue },
                  };
                  setProfile(updated);
                  await updateProfile({ preferences: { ...profile.preferences, tts_enabled: newValue } });
                  showSavedIndicator();
                }}
                className="p-2 rounded-lg transition-colors hover:bg-gray-50"
              >
                <div
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    profile.preferences.tts_enabled ? 'bg-teal-500' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white absolute top-[4px] transition-all shadow-sm"
                    style={{ left: profile.preferences.tts_enabled ? '24px' : '4px' }}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* Voice selector */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <p className="text-gray-800 text-sm font-medium">Voix du coach</p>
              <p className="text-xs text-gray-400 mt-1">
                Teste chaque voix pour trouver celle qui te convient
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {voiceOptions.map((option) => {
                const isSelected = (profile.preferences.tts_voice || 'ash') === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={async () => {
                      const updated: Profile = {
                        ...profile,
                        preferences: { ...profile.preferences, tts_voice: option.value },
                      };
                      setProfile(updated);
                      await updateProfile({ preferences: { ...profile.preferences, tts_voice: option.value } });
                      showSavedIndicator();
                    }}
                    className={`p-3 rounded-xl text-left transition-all border-2 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-teal-600' : 'text-gray-800'}`}>
                      {option.label}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{option.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Test voice button */}
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: 'Salut ! C\'est ta voix de coach. Comment tu la trouves ?',
                      voice: profile.preferences.tts_voice || 'ash',
                      model: profile.preferences.tts_model || 'gpt-4o-mini-tts',
                    }),
                  });
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audio.onended = () => URL.revokeObjectURL(url);
                    await audio.play();
                  }
                } catch (err) {
                  console.error('Test TTS error:', err);
                }
              }}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors border border-teal-300 text-teal-600 hover:bg-teal-50 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Tester la voix
            </button>
          </div>

          {/* Model selector */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div>
              <p className="text-gray-800 text-sm font-medium">Modèle audio</p>
              <p className="text-xs text-gray-400 mt-1">
                Choisis le moteur de synthèse vocale
              </p>
            </div>
            <div className="space-y-2">
              {modelOptions.map((option) => {
                const isSelected = (profile.preferences.tts_model || 'gpt-4o-mini-tts') === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={async () => {
                      const updated: Profile = {
                        ...profile,
                        preferences: { ...profile.preferences, tts_model: option.value },
                      };
                      setProfile(updated);
                      await updateProfile({ preferences: { ...profile.preferences, tts_model: option.value } });
                      showSavedIndicator();
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isSelected ? 'text-teal-600' : 'text-gray-800'}`}>
                        {option.label}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-teal-500' : 'border-gray-400'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Profile sections */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Ton profil
          </h2>
          {profileSections.map(({ key, label }) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3"
            >
              <h3 className="text-gray-800 font-medium text-sm">
                {label}
              </h3>
              <EditableList
                items={(profile[key] as string[]) || []}
                onUpdate={(items) => handleUpdate(key, items)}
                placeholder="Ajouter un élément..."
              />
            </div>
          ))}
        </section>

        {/* Sources section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Bibliothèque de sources
          </h2>
          {sources.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <p className="text-sm text-gray-400">
                Aucune source indexée
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-gray-800 text-sm font-medium truncate">
                        {source.titre}
                      </h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full shrink-0 bg-teal-50 text-teal-600 font-medium">
                        {source.chunks_count} chunks
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {source.auteur} &middot; {source.domaine}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleToggleSource(source.id, !source.active)}
                        className="p-2 rounded-lg transition-colors hover:bg-gray-50"
                        title={source.active ? 'Désactiver' : 'Activer'}
                      >
                        <div
                          className={`w-9 h-5 rounded-full relative transition-colors ${
                            source.active ? 'bg-teal-500' : 'bg-gray-200'
                          }`}
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all shadow-sm"
                            style={{ left: source.active ? '17px' : '3px' }}
                          />
                        </div>
                      </button>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-500"
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
            <h2 className="text-lg font-semibold text-gray-800">
              Ajouter un livre
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              {/* File drop zone */}
              <label
                className="block rounded-xl p-6 text-center cursor-pointer transition-colors border-2 border-dashed border-gray-300 hover:border-teal-400 hover:bg-teal-50/30"
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
                      className="mx-auto mb-2 text-teal-600"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p className="text-sm text-gray-800 font-medium">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(uploadFile.size / 1024 / 1024).toFixed(1)} Mo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg
                      className="mx-auto mb-2 text-gray-400"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="text-sm text-gray-400">
                      Cliquez pour sélectionner un PDF
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
                  className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <input
                  type="text"
                  value={uploadAuteur}
                  onChange={(e) => setUploadAuteur(e.target.value)}
                  placeholder="Auteur"
                  className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <input
                  type="text"
                  value={uploadDomaine}
                  onChange={(e) => setUploadDomaine(e.target.value)}
                  placeholder="Domaine (ex: PNL, coaching, développement personnel)"
                  className="w-full py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              {/* Upload button */}
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadTitre || !uploadAuteur || !uploadDomaine || !!uploadStatus}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-teal-600 transition-all hover:bg-teal-700 active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-teal-600"
              >
                {uploadStatus || 'Indexer'}
              </button>
            </div>
          </section>
        )}

        {/* Notifications section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-800 text-sm font-medium">
                  Rappels d&apos;exercices
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {notificationPermission === 'denied'
                    ? 'Notifications bloquées dans le navigateur'
                    : 'Reçois des rappels pour tes exercices en cours'}
                </p>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={notificationPermission === 'denied'}
                className="p-2 rounded-lg transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <div
                  className={`w-11 h-6 rounded-full relative transition-colors ${
                    notificationsEnabled ? 'bg-teal-500' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full bg-white absolute top-[4px] transition-all shadow-sm"
                    style={{ left: notificationsEnabled ? '24px' : '4px' }}
                  />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Account section */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Compte
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
            {session?.user?.email && (
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center text-sm font-semibold text-white">
                  {session.user.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-gray-800 text-sm font-medium">
                    {session.user.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isAdmin ? 'Administrateur' : 'Utilisateur'}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors border border-red-300 text-red-500 hover:bg-red-50 active:scale-[0.98]"
            >
              Se déconnecter
            </button>
          </div>
        </section>
      </div>

      <NavBar active="settings" />
    </div>
  );
}
