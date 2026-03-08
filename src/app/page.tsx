'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [isEvening, setIsEvening] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsEvening(hour >= 18 || hour < 4);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6">
      {/* Logo */}
      <div className="mb-16 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Inner Coach
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Ton espace. Ton rythme.
        </p>
      </div>

      {/* Boutons principaux */}
      <div className="w-full max-w-sm space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => router.push('/session?mode=deblocage')}
          className={`w-full rounded-2xl border transition-all duration-300 p-6 text-left cursor-pointer ${
            !isEvening
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
              : 'border-[var(--color-border-custom)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">
                J&apos;ai quelque chose à dire
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Déblocage — libère ce qui te pèse
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push('/session?mode=journal')}
          className={`w-full rounded-2xl border transition-all duration-300 p-6 text-left cursor-pointer ${
            isEvening
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
              : 'border-[var(--color-border-custom)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-tertiary)] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-medium text-[var(--color-text-primary)]">
                Raconter ma journée
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Journal du soir — pose ta journée
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-custom)] safe-bottom">
        <div className="flex justify-around items-center h-14 max-w-sm mx-auto">
          <button className="flex flex-col items-center gap-1 text-[var(--color-accent)] cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            <span className="text-[10px]">Accueil</span>
          </button>
          <button onClick={() => router.push('/sessions')} className="flex flex-col items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
            <span className="text-[10px]">Sessions</span>
          </button>
          <button onClick={() => router.push('/settings')} className="flex flex-col items-center gap-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            <span className="text-[10px]">Réglages</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
