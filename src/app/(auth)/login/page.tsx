'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/');
      }
    } catch {
      setError('Une erreur est survenue. Réessaye.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight gradient-text">
          Inner Coach
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Ton espace. Ton rythme.
        </p>
      </div>

      {/* Card */}
      <div className="glass p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
              autoComplete="email"
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-[var(--color-error)] animate-fade-in">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-5 py-3 text-sm font-medium text-white bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end))] hover:brightness-110 active:brightness-95 shadow-lg shadow-[var(--color-accent-soft)] spring cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
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
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Link to register */}
        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Pas encore de compte ?{' '}
          <Link
            href="/register"
            className="text-[var(--color-accent)] hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
