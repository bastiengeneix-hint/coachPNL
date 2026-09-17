'use client';

import { useState } from 'react';

// Un relevé, c'est un geste de trois secondes. Pas un formulaire.

interface MesureSliderProps {
  label: string;
  question: string;
  initial?: number;
  onSubmit: (value: number) => Promise<void> | void;
  compact?: boolean;
}

export default function MesureSlider({ label, question, initial = 5, onSubmit, compact }: MesureSliderProps) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit(value);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-700">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>
          {label} : {value}/10 — noté.
        </span>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'space-y-3'}>
      <p className="text-[15px] text-gray-800 leading-snug">{question}</p>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label={question}
          className="flex-1 accent-teal-600"
        />
        <span className="w-12 shrink-0 text-right text-lg font-semibold text-gray-800 tabular-nums">
          {value}
          <span className="text-xs text-gray-400">/10</span>
        </span>
        <button
          onClick={submit}
          disabled={saving}
          className="shrink-0 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-40 transition-colors cursor-pointer"
        >
          {saving ? '…' : 'Noter'}
        </button>
      </div>
    </div>
  );
}
