'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMemo, useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import type { ExerciseReminder } from '@/types';

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeReminders, setActiveReminders] = useState<ExerciseReminder[]>([]);

  const isEvening = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 5;
  }, []);

  const firstName = session?.user?.name?.split(' ')[0];
  const greeting = isEvening ? 'Bonsoir' : 'Bonjour';

  useEffect(() => {
    async function loadReminders() {
      try {
        const res = await fetch('/api/reminders');
        if (res.ok) {
          const data = await res.json();
          setActiveReminders(data);
        }
      } catch {
        // Non-blocking
      }
    }
    loadReminders();
  }, []);

  const handleCompleteReminder = async (id: string) => {
    setActiveReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true }),
      });
    } catch {
      // Non-blocking
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar active="home" />

      <main className="md:pt-20 pt-6 pb-24 md:pb-16 px-6 max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="mt-10 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
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

        {/* Active exercise reminders */}
        {activeReminders.length > 0 && (
          <div className="mb-8 space-y-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
            {activeReminders.map((reminder) => {
              const endDate = new Date(reminder.end_date);
              const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

              return (
                <div
                  key={reminder.id}
                  className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium leading-snug">
                      {reminder.exercise_description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {daysLeft > 0 ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : 'Dernier jour'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCompleteReminder(reminder.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer"
                  >
                    Fait
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Mode Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <button
            onClick={() => router.push('/session?mode=deblocage')}
            className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
              !isEvening ? 'border-l-4 border-l-teal-500' : ''
            }`}
            style={{ animationDelay: '100ms' }}
          >
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-teal-600" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-base mb-1">
              J&apos;ai quelque chose à dire
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">Déblocage guidé</p>
          </button>

          <button
            onClick={() => router.push('/session?mode=journal')}
            className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
              isEvening ? 'border-l-4 border-l-teal-500' : ''
            }`}
            style={{ animationDelay: '200ms' }}
          >
            <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-teal-600" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-base mb-1">
              Raconter ma journée
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">Journal du soir</p>
          </button>
        </div>
      </main>
    </div>
  );
}
