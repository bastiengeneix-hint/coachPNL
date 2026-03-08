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
          Ton espace de coaching personnel
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-2">
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all"
            />
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:bg-white transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 animate-fade-in">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E17055" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6" />
                <path d="M9 9l6 6" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
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
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          Pas encore de compte ?{' '}
          <Link href="/register" className="text-teal-600 font-medium hover:text-teal-700 transition-colors">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
