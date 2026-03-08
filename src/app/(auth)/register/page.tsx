'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = 'Ton prénom est requis';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errs.email = 'Adresse email invalide';
    }

    if (!password || password.length < 6) {
      errs.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!validate()) return;

    setLoading(true);

    try {
      // 1. Register
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || 'Erreur lors de la création du compte');
        setLoading(false);
        return;
      }

      // 2. Sign in
      const signInResult = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setGlobalError('Compte créé mais connexion échouée. Essaye de te connecter.');
        setLoading(false);
        return;
      }

      // 3. Redirect to onboarding
      router.push('/onboarding');
    } catch {
      setGlobalError('Une erreur est survenue. Réessaye.');
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
          Crée ton espace personnel
        </p>
      </div>

      {/* Card */}
      <div className="glass p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs text-[var(--color-text-muted)] uppercase tracking-wider"
            >
              Prénom
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Comment tu t'appelles ?"
              autoComplete="given-name"
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            {errors.name && (
              <p className="text-xs text-[var(--color-error)] animate-fade-in">
                {errors.name}
              </p>
            )}
          </div>

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
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              placeholder="ton@email.com"
              autoComplete="email"
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            {errors.email && (
              <p className="text-xs text-[var(--color-error)] animate-fade-in">
                {errors.email}
              </p>
            )}
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
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              placeholder="6 caractères minimum"
              autoComplete="new-password"
              className="w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border-custom)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            {errors.password && (
              <p className="text-xs text-[var(--color-error)] animate-fade-in">
                {errors.password}
              </p>
            )}
          </div>

          {/* Global error */}
          {globalError && (
            <p className="text-sm text-[var(--color-error)] animate-fade-in">
              {globalError}
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
                Création...
              </span>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        {/* Link to login */}
        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Déjà un compte ?{' '}
          <Link
            href="/login"
            className="text-[var(--color-accent)] hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
