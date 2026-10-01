'use client';

import { useState } from 'react';
import { FEEDBACK_ITEMS, FEEDBACK_LOW, type FeedbackKey } from '@/lib/coach/feedback';

// Quatre curseurs, dix secondes. Rien n'est prérempli : une note déjà posée à
// 5 se valide sans y penser, et c'est une note qui ne dit rien.

type Scores = Record<FeedbackKey, number | null>;

const EMPTY: Scores = { ecoute: null, sujet: null, approche: null, global: null };

export default function SessionFeedback({ sessionId }: { sessionId: string }) {
  const [scores, setScores] = useState<Scores>(EMPTY);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const complete = FEEDBACK_ITEMS.every((item) => scores[item.key] !== null);
  const hasLow = FEEDBACK_ITEMS.some((item) => {
    const v = scores[item.key];
    return v !== null && v < FEEDBACK_LOW;
  });

  const submit = async () => {
    if (!complete) return;
    setStatus('saving');
    try {
      const res = await fetch('/api/sessions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, feedback: { ...scores, note: hasLow ? note : null } }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-xl p-4">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Merci. J&apos;en tiens compte la prochaine fois.</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ton retour, dix secondes</p>
        <p className="text-xs text-gray-400 mt-1">Pour que je m&apos;ajuste la prochaine fois. De 0 à 10.</p>
      </div>

      {FEEDBACK_ITEMS.map((item) => {
        const value = scores[item.key];
        return (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-gray-700 leading-snug">{item.label}</p>
              <span className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                {value === null ? '–' : value}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={value ?? 5}
              onChange={(e) => setScores((s) => ({ ...s, [item.key]: Number(e.target.value) }))}
              onClick={(e) =>
                // Un tap sans glisser doit aussi compter comme une note.
                setScores((s) => ({ ...s, [item.key]: Number((e.target as HTMLInputElement).value) }))
              }
              aria-label={item.label}
              className={`w-full ${value === null ? 'accent-gray-300 opacity-60' : 'accent-teal-600'}`}
            />
          </div>
        );
      })}

      {hasLow && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Qu'est-ce qui aurait dû être différent ? (facultatif)"
          className="w-full resize-none rounded-xl py-2.5 px-3 text-sm text-gray-800 placeholder:text-gray-400 bg-white border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none"
        />
      )}

      {status === 'error' && (
        <p className="text-xs text-rose-600">Pas pu l&apos;enregistrer. Tu peux réessayer.</p>
      )}

      <button
        onClick={submit}
        disabled={!complete || status === 'saving'}
        className="w-full py-2.5 rounded-xl bg-white border border-teal-600 text-teal-700 font-medium text-sm transition-all hover:bg-teal-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {status === 'saving' ? '…' : 'Envoyer mon retour'}
      </button>
    </div>
  );
}
