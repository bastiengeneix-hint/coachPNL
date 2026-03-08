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
  const greeting = isEvening ? 'Bonsoir' : 'Bonjour';

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar active="home" />

      <main className="pt-20 pb-16 px-6 max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="mt-10 mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            {/* Small leaf icon */}
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              className="text-teal-600 opacity-60"
            >
              <path
                d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 8.5-3 9-8 .5-5-2-8-2-8s-1 1-5 3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11 12c1-1.5 3-3.5 6-4"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h1 className="text-2xl font-semibold text-gray-800">
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </h1>
          </div>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            Qu&apos;est-ce qu&apos;on travaille aujourd&apos;hui&#8239;?
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Deblocage */}
          <button
            onClick={() => router.push('/session?mode=deblocage')}
            className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
              !isEvening ? 'border-l-4 border-l-teal-500' : ''
            }`}
            style={{ animationDelay: '100ms' }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                className="text-teal-600"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-base mb-1">
              J&apos;ai quelque chose à dire
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              Déblocage guidé
            </p>
          </button>

          {/* Journal */}
          <button
            onClick={() => router.push('/session?mode=journal')}
            className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
              isEvening ? 'border-l-4 border-l-teal-500' : ''
            }`}
            style={{ animationDelay: '200ms' }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                className="text-teal-600"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-base mb-1">
              Raconter ma journée
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              Journal du soir
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
