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
    <div className="w-full max-w-[420px] animate-fade-in">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-teal-50 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4A9E8F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10" />
            <path d="M12 2c3 4 5 8 5 10a5 5 0 0 1-10 0c0-2 2-6 5-10z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          Inner Coach
        </h1>
        <p className="mt-2 text-gray-500 text-[15px]">
          Crée ton espace personnel
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-2">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1 animate-fade-in">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 animate-fade-in">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-2">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1 animate-fade-in">
                {errors.password}
              </p>
            )}
          </div>

          {/* Global error */}
          {globalError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6" />
                <path d="M9 9l6 6" />
              </svg>
              <p className="text-sm text-red-600">{globalError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-5 py-3.5 text-base font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Création...
              </span>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-teal-600 font-medium hover:text-teal-700 transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
