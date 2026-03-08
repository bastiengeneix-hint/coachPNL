'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import NavBar from '@/components/NavBar';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const isEvening = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 5;
  }, []);

  const firstName = session?.user?.name?.split(' ')[0];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-20 relative z-10">
      {/* Logo */}
      <div className="animate-fade-in mb-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-soft)] border border-[var(--color-glass-border)] backdrop-blur-xl flex items-center justify-center">
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1
        className="text-4xl font-bold gradient-text animate-fade-in mb-2"
        style={{ animationDelay: '100ms' }}
      >
        Inner Coach
      </h1>

      {/* Subtitle */}
      <p
        className="text-[var(--color-text-muted)] text-lg mb-2 animate-fade-in"
        style={{ animationDelay: '200ms' }}
      >
        Ton espace. Ton rythme.
      </p>

      {/* Greeting */}
      {firstName && (
        <p
          className="text-[var(--color-text-secondary)] text-base mb-8 animate-fade-in"
          style={{ animationDelay: '300ms' }}
        >
          Bonjour, {firstName}
        </p>
      )}
      {!firstName && <div className="mb-8" />}

      {/* Mode Cards */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Deblocage */}
        <button
          onClick={() => router.push('/session?mode=deblocage')}
          className={`glass glass-hover rounded-2xl border p-5 text-left transition-all spring animate-fade-in ${
            !isEvening
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
              : 'border-[var(--color-glass-border)]'
          }`}
          style={{ animationDelay: '400ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--color-text-primary)] font-semibold text-lg">
                J&apos;ai quelque chose à dire
              </p>
              <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
                Déblocage guidé
              </p>
            </div>
          </div>
        </button>

        {/* Journal */}
        <button
          onClick={() => router.push('/session?mode=journal')}
          className={`glass glass-hover rounded-2xl border p-5 text-left transition-all spring animate-fade-in ${
            isEvening
              ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
              : 'border-[var(--color-glass-border)]'
          }`}
          style={{ animationDelay: '500ms' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-soft)] flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--color-text-primary)] font-semibold text-lg">
                Raconter ma journée
              </p>
              <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
                Journal du soir
              </p>
            </div>
          </div>
        </button>
      </div>

      <NavBar active="home" />
    </div>
  );
}
