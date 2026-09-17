'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import type { Checkin, MeasureWithHistory } from '@/types';
import MesureSlider from '@/components/suivi/MesureSlider';

// ─── CHECK-IN ───────────────────────────────────────────────────────────────
// 60 secondes. Deux champs, un curseur. Si on met plus, personne ne le fait
// tous les jours — et un suivi qu'on ne tient pas ne sert à rien.

function CheckinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const hour = useMemo(() => new Date().getHours(), []);
  const moment: 'matin' | 'soir' = params.get('moment') === 'matin' || (params.get('moment') !== 'soir' && hour < 14) ? 'matin' : 'soir';

  const [intention, setIntention] = useState('');
  const [win, setWin] = useState('');
  const [friction, setFriction] = useState('');
  const [energie, setEnergie] = useState(6);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Checkin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dueMeasures, setDueMeasures] = useState<MeasureWithHistory[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/snapshot');
        if (!res.ok) return;
        const snapshot = await res.json();
        setDueMeasures((snapshot.measures || []).filter((m: MeasureWithHistory) => m.due).slice(0, 2));
      } catch {
        // Non bloquant
      }
    }
    load();
  }, []);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moment,
          intention: moment === 'matin' ? intention : null,
          wins: moment === 'soir' && win.trim() ? [win.trim()] : [],
          frictions: moment === 'soir' && friction.trim() ? [friction.trim()] : [],
          energie,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const recordMeasure = async (measureId: string, value: number) => {
    await fetch('/api/measures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ measure_id: measureId, value }),
    });
  };

  const canSubmit = moment === 'matin' ? intention.trim().length > 0 : win.trim().length > 0 || friction.trim().length > 0;

  if (result) {
    return (
      <div className="min-h-dvh bg-stone-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full animate-fade-in">
            <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center mb-5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <p className="text-sm text-gray-400 mb-2">C&apos;est noté.</p>

            {result.coach_reply ? (
              <p className="text-xl text-gray-800 leading-relaxed mb-8">{result.coach_reply}</p>
            ) : (
              <p className="text-xl text-gray-800 leading-relaxed mb-8">À demain.</p>
            )}

            {dueMeasures.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Tant qu&apos;on y est
                </p>
                {dueMeasures.map((m) => (
                  <MesureSlider
                    key={m.id}
                    label={m.label}
                    question={m.question || `De 0 à 10, où tu en es sur « ${m.label} » ?`}
                    initial={m.last?.value ?? 5}
                    onSubmit={(value) => recordMeasure(m.id, value)}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors cursor-pointer"
              >
                Terminé
              </button>
              <button
                onClick={() => router.push(`/session?mode=${moment === 'soir' ? 'journal' : 'deblocage'}`)}
                className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:border-teal-400 transition-colors cursor-pointer"
              >
                En parler
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      <header className="px-6 pt-6">
        <button
          onClick={() => router.push('/')}
          className="p-2 -ml-2 rounded-xl text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Retour"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
      </header>

      <main className="flex-1 px-6 pb-10 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-semibold text-gray-800 mt-6 mb-1">
          {moment === 'matin' ? 'Ton intention du jour' : 'Ta journée'}
        </h1>
        <p className="text-gray-500 text-[15px] mb-8">
          {moment === 'matin'
            ? 'Une phrase. Ce que tu veux tenir aujourd’hui.'
            : 'Deux lignes suffisent. Le coach les lira avant votre prochaine séance.'}
        </p>

        <div className="space-y-6">
          {moment === 'matin' ? (
            <div>
              <label htmlFor="intention" className="block text-sm font-medium text-gray-700 mb-2">
                Aujourd&apos;hui, je…
              </label>
              <textarea
                id="intention"
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                rows={3}
                autoFocus
                placeholder="j'envoie le devis sans me justifier"
                className="w-full resize-none rounded-2xl py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="win" className="block text-sm font-medium text-gray-700 mb-2">
                  Ce qui a marché
                </label>
                <textarea
                  id="win"
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                  rows={2}
                  autoFocus
                  placeholder="j'ai dit non à la réunion de 19h"
                  className="w-full resize-none rounded-2xl py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="friction" className="block text-sm font-medium text-gray-700 mb-2">
                  Ce qui a coincé
                </label>
                <textarea
                  id="friction"
                  value={friction}
                  onChange={(e) => setFriction(e.target.value)}
                  rows={2}
                  placeholder="j'ai encore repoussé l'appel à Pierre"
                  className="w-full resize-none rounded-2xl py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
                />
              </div>
            </>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="energie" className="block text-sm font-medium text-gray-700">
                Ton énergie
              </label>
              <span className="text-lg font-semibold text-gray-800 tabular-nums">
                {energie}
                <span className="text-xs text-gray-400">/10</span>
              </span>
            </div>
            <input
              id="energie"
              type="range"
              min={0}
              max={10}
              step={1}
              value={energie}
              onChange={(e) => setEnergie(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="w-full py-3.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {saving ? 'Un instant…' : 'Envoyer'}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-stone-50" />}>
      <CheckinContent />
    </Suspense>
  );
}
