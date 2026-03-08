'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

/* ─── Types ───────────────────────────────────────────── */

type Ton = 'direct' | 'doux' | 'mix';

interface OnboardingData {
  name: string;
  projets: string[];
  blocages: string[];
  autreBlockage: string;
  ton: Ton;
}

const BLOCAGE_OPTIONS = [
  'Procrastination',
  'Perfectionnisme',
  'Doute de légitimité',
  'Peur du regard des autres',
  'Anxiété / stress',
  'Autre',
] as const;

const TON_OPTIONS: { value: Ton; title: string; description: string }[] = [
  {
    value: 'direct',
    title: 'Direct et sans filtre',
    description: "Tu préfères qu'on te dise les choses cash, même si ça pique",
  },
  {
    value: 'doux',
    title: 'Doux et bienveillant',
    description: "Tu as besoin d'un espace safe, sans pression",
  },
  {
    value: 'mix',
    title: 'Un mix des deux',
    description:
      'Tu veux de la douceur ET de la franchise, selon le moment',
  },
];

/* ─── Progress Dots ───────────────────────────────────── */

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'bg-[var(--color-accent)] w-6'
              : i + 1 < current
                ? 'bg-[var(--color-accent)] opacity-40'
                : 'bg-[var(--color-text-muted)] opacity-30'
          }`}
        />
      ))}
    </div>
  );
}

/* ─── Spinner ─────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ─── Page ────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    name: '',
    projets: [],
    blocages: [],
    autreBlockage: '',
    ton: 'mix',
  });

  // Helpers
  const [projetInput, setProjetInput] = useState('');

  const updateField = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const addProjet = () => {
    const trimmed = projetInput.trim();
    if (trimmed && !data.projets.includes(trimmed)) {
      updateField('projets', [...data.projets, trimmed]);
      setProjetInput('');
    }
  };

  const removeProjet = (index: number) => {
    updateField(
      'projets',
      data.projets.filter((_, i) => i !== index)
    );
  };

  const toggleBlocage = (item: string) => {
    if (data.blocages.includes(item)) {
      updateField(
        'blocages',
        data.blocages.filter((b) => b !== item)
      );
      if (item === 'Autre') updateField('autreBlockage', '');
    } else {
      updateField('blocages', [...data.blocages, item]);
    }
  };

  // Navigation
  const canGoNext = (): boolean => {
    if (step === 1) return data.name.trim().length > 0;
    return true;
  };

  const goNext = () => {
    if (step < 4 && canGoNext()) setStep(step + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Submit
  const handleComplete = async () => {
    setSubmitting(true);

    try {
      // Build patterns_sabotage: replace "Autre" with the custom text
      const patterns = data.blocages
        .map((b) =>
          b === 'Autre' && data.autreBlockage.trim()
            ? data.autreBlockage.trim()
            : b
        )
        .filter((b) => b !== 'Autre');

      // 1. Update profile
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projets: data.projets,
          patterns_sabotage: patterns,
          preferences: {
            ton: data.ton,
            ce_qui_aide: [],
            ce_qui_bloque: [],
          },
        }),
      });

      // 2. Complete onboarding (sets name + onboarding_complete)
      await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name.trim() }),
      });

      // 3. Update the session token so middleware sees onboardingComplete
      await updateSession({ onboardingComplete: true });

      // 4. Navigate home
      router.push('/');
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--color-bg-primary)] flex flex-col">
      {/* Background orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.07)_0%,transparent_70%)] animate-float" />
        <div
          className="absolute -bottom-[30%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.05)_0%,transparent_70%)] animate-float"
          style={{ animationDelay: '-3s' }}
        />
      </div>

      {/* Progress */}
      <div className="pt-8 pb-4 px-6">
        <ProgressDots current={step} total={4} />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        <div className="w-full max-w-md">
          {/* ─── Step 1: Name ─────────────────────────────── */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="glass p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    Comment tu t&apos;appelles ?
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Pour que ton coach sache comment t&apos;appeler
                  </p>
                </div>

                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && goNext()}
                  placeholder="Ton prénom"
                  autoFocus
                  className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-center text-lg"
                />
              </div>
            </div>
          )}

          {/* ─── Step 2: Projects ─────────────────────────── */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="glass p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    Quels sont tes projets actuels ?
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Perso, pro, side-projects... tout compte
                  </p>
                </div>

                {/* Input + Add */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projetInput}
                    onChange={(e) => setProjetInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addProjet()}
                    placeholder="Ex : lancer mon podcast"
                    className="flex-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={addProjet}
                    disabled={!projetInput.trim()}
                    className="px-4 py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed spring"
                  >
                    Ajouter
                  </button>
                </div>

                {/* Tags */}
                {data.projets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.projets.map((projet, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-accent-soft)] text-sm text-[var(--color-accent)] animate-fade-in"
                      >
                        {projet}
                        <button
                          type="button"
                          onClick={() => removeProjet(i)}
                          className="hover:text-[var(--color-error)] transition-colors cursor-pointer"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 3: Blocages ─────────────────────────── */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="glass p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    Qu&apos;est-ce qui te bloque le plus souvent ?
                  </h2>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Pas de jugement — c&apos;est pour mieux t&apos;accompagner
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {BLOCAGE_OPTIONS.map((option) => {
                    const isChecked = data.blocages.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleBlocage(option)}
                        className={`text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 cursor-pointer spring ${
                          isChecked
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                            : 'border-[var(--color-border-custom)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-glass-border)]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                                : 'border-[var(--color-text-muted)]'
                            }`}
                          >
                            {isChecked && (
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* "Autre" custom input */}
                {data.blocages.includes('Autre') && (
                  <input
                    type="text"
                    value={data.autreBlockage}
                    onChange={(e) => updateField('autreBlockage', e.target.value)}
                    placeholder="Précise ce qui te bloque..."
                    autoFocus
                    className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors animate-fade-in"
                  />
                )}
              </div>
            </div>
          )}

          {/* ─── Step 4: Tone preference ─────────────────── */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="glass p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    Comment préfères-tu qu&apos;on te parle ?
                  </h2>
                </div>

                <div className="space-y-3">
                  {TON_OPTIONS.map((option) => {
                    const isSelected = data.ton === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField('ton', option.value)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer spring ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                            : 'border-[var(--color-border-custom)] bg-[var(--color-glass)] hover:border-[var(--color-glass-border)]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[var(--color-accent)]'
                                : 'border-[var(--color-text-muted)]'
                            }`}
                          >
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                            )}
                          </span>
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                isSelected
                                  ? 'text-[var(--color-accent)]'
                                  : 'text-[var(--color-text-primary)]'
                              }`}
                            >
                              {option.title}
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {option.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Navigation buttons ──────────────────────── */}
          <div className="flex items-center justify-between mt-8 gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium bg-transparent text-[var(--color-accent)] border border-[var(--color-glass-border)] hover:bg-[var(--color-glass-hover)] spring cursor-pointer"
              >
                Précédent
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext()}
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-medium text-white bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end))] hover:brightness-110 active:brightness-95 shadow-lg shadow-[var(--color-accent-soft)] spring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end))] hover:brightness-110 active:brightness-95 shadow-lg shadow-[var(--color-accent-soft)] spring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Spinner />
                    Un instant...
                  </>
                ) : (
                  'Terminer'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
