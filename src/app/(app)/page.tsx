'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMemo, useEffect, useState, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import MesureSlider from '@/components/suivi/MesureSlider';
import type { CoachingSnapshot, ExerciseReminder, Session } from '@/types';

// ─── AUJOURD'HUI ────────────────────────────────────────────────────────────
// L'accueil n'est plus un menu à deux boutons : c'est le tableau de bord du
// jour. Ce qui est dû, ce qui est fait, où on en est du parcours. C'est ce qui
// transforme une app de conversation en accompagnement quotidien.

type SnapshotResponse = CoachingSnapshot & { agenda: string[] };

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeReminders, setActiveReminders] = useState<ExerciseReminder[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPractice, setBusyPractice] = useState<string | null>(null);

  // Figé au montage : appeler Date.now() pendant le rendu rend l'affichage instable.
  const now = useMemo(() => Date.now(), []);
  const hour = useMemo(() => new Date().getHours(), []);
  const isEvening = hour >= 18 || hour < 5;
  const moment: 'matin' | 'soir' = hour < 14 ? 'matin' : 'soir';

  const firstName = session?.user?.name?.split(' ')[0];
  const greeting = hour < 5 ? 'Bonne nuit' : hour < 12 ? 'Bonjour' : isEvening ? 'Bonsoir' : 'Bon après-midi';

  const loadSnapshot = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshot');
      if (res.ok) setSnapshot(await res.json());
    } catch {
      // Non bloquant : l'accueil reste utilisable sans le suivi.
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      // Les séances quittées sans « Terminer » n'étaient jamais analysées : le
      // coach perdait leur contenu. On les rattrape ici, en tâche de fond.
      fetch('/api/sessions/sweep', { method: 'POST' })
        .then(() => loadSnapshot())
        .catch(() => {});

      try {
        const [remindersRes, activeRes] = await Promise.all([
          fetch('/api/reminders'),
          fetch('/api/sessions/active'),
        ]);
        if (remindersRes.ok) setActiveReminders(await remindersRes.json());
        if (activeRes.ok) {
          const data = await activeRes.json();
          if (data && data.id) setActiveSession(data);
        }
      } catch {
        // Non bloquant
      }

      await loadSnapshot();
      setLoading(false);
    }
    loadData();
  }, [loadSnapshot]);

  const togglePractice = async (practiceId: string, done: boolean) => {
    setBusyPractice(practiceId);
    // Optimiste : cocher doit être instantané, sinon on ne le fait pas.
    setSnapshot((prev) =>
      prev
        ? {
            ...prev,
            practices: prev.practices.map((p) =>
              p.id === practiceId
                ? { ...p, done_today: done, streak: done ? p.streak + 1 : Math.max(0, p.streak - 1), due_today: !done }
                : p
            ),
          }
        : prev
    );
    try {
      await fetch('/api/practices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practice_id: practiceId, done }),
      });
      await loadSnapshot();
    } catch {
      await loadSnapshot();
    } finally {
      setBusyPractice(null);
    }
  };

  const recordMeasure = async (measureId: string, value: number) => {
    await fetch('/api/measures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ measure_id: measureId, value }),
    });
    await loadSnapshot();
  };

  const handleCompleteReminder = async (id: string) => {
    setActiveReminders((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: true }),
      });
    } catch {
      // Non bloquant
    }
  };

  const program = snapshot?.program ?? null;
  const dueMeasure = snapshot?.measures.find((m) => m.due) ?? null;
  const checkinDone = snapshot?.checkinToday[moment] ?? null;
  const practices = snapshot?.practices ?? [];
  const toRevisit = snapshot?.protocolsToRevisit ?? [];

  const progress = useMemo(() => {
    if (!program || !snapshot) return null;
    const { milestonesDone, milestonesTotal, week, totalWeeks } = snapshot.derived;
    if (milestonesTotal > 0) return Math.round((milestonesDone / milestonesTotal) * 100);
    if (week && totalWeeks) return Math.min(100, Math.round((week / totalWeeks) * 100));
    return null;
  }, [program, snapshot]);

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar active="home" />

      <main className="md:pt-20 pt-6 pb-24 md:pb-16 px-6 max-w-2xl mx-auto">
        {/* Salutation */}
        <div className="mt-8 mb-6 animate-fade-in">
          <h1 className="text-2xl font-semibold text-gray-800">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <p className="text-gray-500 text-[15px] mt-1 capitalize">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Le parcours */}
        {program ? (
          <button
            onClick={() => router.push('/parcours')}
            className="w-full mb-6 text-left bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-teal-400 transition-colors cursor-pointer animate-fade-in"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 mb-1">
                  Ton parcours
                  {snapshot?.derived.week
                    ? ` · semaine ${snapshot.derived.week}${snapshot.derived.totalWeeks ? `/${snapshot.derived.totalWeeks}` : ''}`
                    : ''}
                </p>
                <p className="text-[15px] font-medium text-gray-800 leading-snug">{program.objectif}</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-gray-300 shrink-0 mt-1">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>

            {progress !== null && (
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            {snapshot && snapshot.derived.milestonesTotal > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {snapshot.derived.milestonesDone}/{snapshot.derived.milestonesTotal} jalons franchis
              </p>
            )}
          </button>
        ) : (
          !loading && (
            <div className="mb-6 bg-white rounded-2xl border border-dashed border-gray-300 p-5 animate-fade-in">
              <p className="text-[15px] font-medium text-gray-800 mb-1">Pas encore de parcours</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Ouvre une séance de déblocage : le coach posera avec toi l&apos;objectif des prochaines
                semaines, et tout se rattachera dessus.
              </p>
            </div>
          )
        )}

        {/* Reprendre la séance en cours */}
        {activeSession && (
          <button
            onClick={() => router.push(`/session?mode=${activeSession.mode}&resume=true`)}
            className="w-full mb-6 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-left transition-all duration-200 animate-fade-in hover:shadow-lg cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base">Reprendre la conversation</p>
                <p className="text-teal-100 text-sm mt-0.5">
                  {activeSession.mode === 'deblocage' ? 'Déblocage' : 'Journal'} &middot;{' '}
                  {activeSession.messages.length} messages
                </p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-teal-200 group-hover:text-white transition-colors shrink-0">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* Aujourd'hui */}
        {(practices.length > 0 || dueMeasure || !checkinDone || toRevisit.length > 0) && (
          <section className="mb-6 animate-fade-in">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Aujourd&apos;hui
            </h2>

            <div className="space-y-3">
              {/* Check-in */}
              {checkinDone ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-teal-600">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <p className="text-sm font-medium text-gray-700">
                      Check-in du {moment} fait
                      {snapshot && snapshot.derived.checkinStreak > 1
                        ? ` · ${snapshot.derived.checkinStreak} jours d'affilée`
                        : ''}
                    </p>
                  </div>
                  {checkinDone.coach_reply && (
                    <p className="text-[15px] text-gray-800 leading-relaxed mt-2 pl-1 border-l-2 border-teal-200 ml-1">
                      <span className="pl-3 block">{checkinDone.coach_reply}</span>
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push(`/checkin?moment=${moment}`)}
                  className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-teal-400 transition-colors cursor-pointer text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0 text-teal-600">
                    {moment === 'matin' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-800">
                      {moment === 'matin' ? 'Poser ton intention du jour' : 'Déposer ta journée'}
                    </p>
                    <p className="text-sm text-gray-500">Une minute, pas plus.</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-gray-300 shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}

              {/* Pratiques */}
              {practices.map((practice) => (
                <div
                  key={practice.id}
                  className={`bg-white rounded-2xl border p-4 flex items-start gap-3 ${
                    practice.slipping ? 'border-amber-300' : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => togglePractice(practice.id, !practice.done_today)}
                    disabled={busyPractice === practice.id}
                    aria-label={practice.done_today ? 'Décocher' : 'Marquer comme faite'}
                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      practice.done_today
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-gray-300 hover:border-teal-500'
                    }`}
                  >
                    {practice.done_today && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] leading-snug ${
                        practice.done_today ? 'text-gray-400 line-through' : 'text-gray-800'
                      }`}
                    >
                      {practice.label}
                    </p>
                    {practice.declencheur && (
                      <p className="text-xs text-gray-400 mt-0.5">{practice.declencheur}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      {practice.streak > 0 && (
                        <span className="text-teal-700 font-medium">
                          {practice.streak} jour{practice.streak > 1 ? 's' : ''} d&apos;affilée
                        </span>
                      )}
                      <span className="text-gray-400">{practice.last_7}/7 cette semaine</span>
                      {practice.slipping && <span className="text-amber-600 font-medium">décrochée</span>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Relevé dû */}
              {dueMeasure && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    Relevé · {dueMeasure.label}
                  </p>
                  <MesureSlider
                    label={dueMeasure.label}
                    question={dueMeasure.question || `De 0 à 10, où tu en es sur « ${dueMeasure.label} » ?`}
                    initial={dueMeasure.last?.value ?? 5}
                    onSubmit={(value) => recordMeasure(dueMeasure.id, value)}
                  />
                </div>
              )}

              {/* Protocole à réévaluer */}
              {toRevisit.length > 0 && (
                <button
                  onClick={() => router.push('/session?mode=deblocage')}
                  className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left hover:border-teal-400 transition-colors cursor-pointer"
                >
                  <p className="text-[15px] font-medium text-gray-800">
                    {toRevisit.length === 1 ? 'Un travail à réévaluer' : `${toRevisit.length} travaux à réévaluer`}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                    {toRevisit[0].sujet
                      ? `« ${toRevisit[0].sujet} » — est-ce que ça tient ?`
                      : 'Le coach revient dessus à la prochaine séance.'}
                  </p>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Rappels d'exercices */}
        {activeReminders.length > 0 && (
          <div className="mb-6 space-y-3 animate-fade-in">
            {activeReminders.map((reminder) => {
              const daysLeft = Math.max(
                0,
                Math.ceil((new Date(reminder.end_date).getTime() - now) / 86400000)
              );

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

        {/* Ouvrir une séance */}
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Ouvrir une séance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/session?mode=deblocage')}
            className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
              !isEvening ? 'border-l-4 border-l-teal-500' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center mb-3">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="text-teal-600" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-[15px] mb-0.5">J&apos;ai quelque chose à dire</p>
            <p className="text-gray-500 text-sm">Déblocage guidé</p>
          </button>

          <button
            onClick={() => router.push('/session?mode=journal')}
            className={`group bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left transition-all duration-200 animate-fade-in hover:shadow-md hover:border-teal-500 cursor-pointer ${
              isEvening ? 'border-l-4 border-l-teal-500' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center mb-3">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" className="text-teal-600" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-800 font-semibold text-[15px] mb-0.5">Raconter ma journée</p>
            <p className="text-gray-500 text-sm">Journal du soir</p>
          </button>
        </div>
      </main>
    </div>
  );
}
