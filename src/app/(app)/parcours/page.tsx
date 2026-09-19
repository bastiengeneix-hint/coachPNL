'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Sparkline from '@/components/suivi/Sparkline';
import MesureSlider from '@/components/suivi/MesureSlider';
import { PROTOCOLS } from '@/lib/pnl/protocols';
import type { CoachingSnapshot } from '@/types';

// ─── LE PARCOURS ────────────────────────────────────────────────────────────
// La page du travail : l'objectif, les jalons, les courbes, les pratiques, ce
// qui a déjà été travaillé. C'est ici qu'on voit qu'on progresse — et un
// progrès qu'on ne voit pas ne motive personne.

type SnapshotResponse = CoachingSnapshot & { agenda: string[] };

export default function ParcoursPage() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewPractice, setShowNewPractice] = useState(false);
  const [newPractice, setNewPractice] = useState({ label: '', declencheur: '' });
  const [newProgram, setNewProgram] = useState({ objectif: '', semaines: '10' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshot');
      if (res.ok) setSnapshot(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createProgram = async () => {
    if (!newProgram.objectif.trim()) return;
    setBusy(true);
    try {
      const semaines = Math.min(52, Math.max(2, Number(newProgram.semaines) || 10));
      await fetch('/api/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectif: newProgram.objectif.trim(),
          echeance: new Date(Date.now() + semaines * 7 * 86400000).toISOString().slice(0, 10),
        }),
      });
      setNewProgram({ objectif: '', semaines: '10' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const toggleMilestone = async (id: string, done: boolean) => {
    await fetch('/api/program', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_id: id, done }),
    });
    await load();
  };

  const recordMeasure = async (measureId: string, value: number) => {
    await fetch('/api/measures', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ measure_id: measureId, value }),
    });
    await load();
  };

  const createPractice = async () => {
    if (!newPractice.label.trim()) return;
    setBusy(true);
    try {
      await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPractice, cadence: 'daily' }),
      });
      setNewPractice({ label: '', declencheur: '' });
      setShowNewPractice(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const archivePractice = async (id: string) => {
    await fetch('/api/practices', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ practice_id: id, archive: true }),
    });
    await load();
  };

  const resolveRun = async (runId: string, holds: boolean) => {
    await fetch('/api/protocols/revisit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        holds
          ? { run_id: runId, note: 'Ça tient.' }
          : { run_id: runId, postpone_days: 3 }
      ),
    });
    await load();
  };

  const progress = useMemo(() => {
    if (!snapshot?.program) return null;
    const { milestonesDone, milestonesTotal, week, totalWeeks } = snapshot.derived;
    if (milestonesTotal > 0) return Math.round((milestonesDone / milestonesTotal) * 100);
    if (week && totalWeeks) return Math.min(100, Math.round((week / totalWeeks) * 100));
    return null;
  }, [snapshot]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <NavBar active="parcours" />
        <div className="flex items-center justify-center pt-40">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
            <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  const program = snapshot?.program ?? null;

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar active="parcours" />

      <main className="md:pt-20 pt-6 pb-24 md:pb-16 px-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mt-8 mb-6">Ton parcours</h1>

        {/* Pas de parcours */}
        {!program && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <p className="text-[15px] font-medium text-gray-800 mb-1">Rien de posé pour l&apos;instant</p>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Le mieux, c&apos;est que le coach le pose avec toi en séance : il t&apos;aidera à le
              formuler au positif et à le rendre vérifiable. Mais tu peux l&apos;écrire ici si tu
              sais déjà où tu vas.
            </p>

            <textarea
              value={newProgram.objectif}
              onChange={(e) => setNewProgram((p) => ({ ...p, objectif: e.target.value }))}
              rows={2}
              placeholder="Ce que je veux avoir changé dans 10 semaines…"
              className="w-full resize-none rounded-xl py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 bg-stone-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all mb-3"
            />

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500" htmlFor="semaines">
                Sur
              </label>
              <input
                id="semaines"
                type="number"
                min={2}
                max={52}
                value={newProgram.semaines}
                onChange={(e) => setNewProgram((p) => ({ ...p, semaines: e.target.value }))}
                className="w-16 rounded-xl py-2 px-3 text-[15px] text-gray-800 bg-stone-50 border border-gray-200 focus:border-teal-500 focus:outline-none"
              />
              <span className="text-sm text-gray-500">semaines</span>

              <button
                onClick={createProgram}
                disabled={busy || !newProgram.objectif.trim()}
                className="ml-auto px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Démarrer
              </button>
            </div>

            <button
              onClick={() => router.push('/session?mode=deblocage')}
              className="mt-4 text-sm text-teal-600 font-medium hover:text-teal-700 cursor-pointer"
            >
              Ou en parler au coach →
            </button>
          </section>
        )}

        {/* Le parcours */}
        {program && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 mb-2">
              Objectif
              {snapshot?.derived.week
                ? ` · semaine ${snapshot.derived.week}${snapshot.derived.totalWeeks ? `/${snapshot.derived.totalWeeks}` : ''}`
                : ''}
            </p>
            <p className="text-lg text-gray-800 leading-snug mb-4">{program.objectif}</p>

            {progress !== null && (
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mb-4">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            <dl className="space-y-2 text-sm">
              {program.pourquoi_maintenant && (
                <div>
                  <dt className="text-gray-400">Pourquoi maintenant</dt>
                  <dd className="text-gray-700 leading-snug">{program.pourquoi_maintenant}</dd>
                </div>
              )}
              {program.etat_present && (
                <div>
                  <dt className="text-gray-400">Point de départ</dt>
                  <dd className="text-gray-700 leading-snug">{program.etat_present}</dd>
                </div>
              )}
              {program.etat_desire && (
                <div>
                  <dt className="text-gray-400">Là où tu vas</dt>
                  <dd className="text-gray-700 leading-snug">{program.etat_desire}</dd>
                </div>
              )}
              {program.criteres_reussite.length > 0 && (
                <div>
                  <dt className="text-gray-400">C&apos;est gagné quand</dt>
                  <dd className="text-gray-700 leading-snug">{program.criteres_reussite.join(' · ')}</dd>
                </div>
              )}
            </dl>

            {/* Jalons */}
            {snapshot && snapshot.milestones.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                {snapshot.milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMilestone(m.id, !m.done)}
                    className="w-full flex items-start gap-3 text-left cursor-pointer group"
                  >
                    <span
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        m.done ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300 group-hover:border-teal-500'
                      }`}
                    >
                      {m.done && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-[15px] leading-snug ${m.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Mesures */}
        {snapshot && snapshot.measures.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Ce qui bouge
            </h2>
            <div className="space-y-3">
              {snapshot.measures.map((m) => {
                const values = [...m.entries].reverse().map((e) => e.value);
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-gray-800 leading-snug">{m.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {m.last ? `${m.last.value}/10` : 'pas encore relevée'}
                          {m.delta !== null && m.delta !== 0 && (
                            <span className={m.delta > 0 === (m.direction === 'up') ? 'text-teal-600' : 'text-amber-600'}>
                              {' '}· {m.delta > 0 ? '+' : ''}
                              {m.delta}
                            </span>
                          )}
                          {m.cible !== null ? ` · cible ${m.cible}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto -mx-1 px-1">
                      <Sparkline values={values} direction={m.direction} cible={m.cible} />
                    </div>

                    {m.due && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <MesureSlider
                          label={m.label}
                          question={m.question || `De 0 à 10, où tu en es sur « ${m.label} » ?`}
                          initial={m.last?.value ?? 5}
                          onSubmit={(value) => recordMeasure(m.id, value)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pratiques */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Tes pratiques
            </h2>
            <button
              onClick={() => setShowNewPractice((v) => !v)}
              className="text-sm text-teal-600 font-medium hover:text-teal-700 cursor-pointer"
            >
              {showNewPractice ? 'Annuler' : 'Ajouter'}
            </button>
          </div>

          {showNewPractice && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-3 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Une pratique qui tient a la forme « <span className="text-gray-700">quand [moment précis], je [action]</span> ».
                Attachée à un moment qui existe déjà dans ta journée, pas à une bonne résolution.
              </p>
              <input
                type="text"
                value={newPractice.label}
                onChange={(e) => setNewPractice((p) => ({ ...p, label: e.target.value }))}
                placeholder="L'action, en moins de 5 minutes"
                className="w-full rounded-xl py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 bg-stone-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
              />
              <input
                type="text"
                value={newPractice.declencheur}
                onChange={(e) => setNewPractice((p) => ({ ...p, declencheur: e.target.value }))}
                placeholder="Quand ? Avant chaque call, en fermant l'ordi le soir…"
                className="w-full rounded-xl py-3 px-4 text-[15px] text-gray-800 placeholder:text-gray-400 bg-stone-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 focus:outline-none transition-all"
              />
              <button
                onClick={createPractice}
                disabled={busy || !newPractice.label.trim()}
                className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Créer
              </button>
            </div>
          )}

          {snapshot && snapshot.practices.length > 0 ? (
            <div className="space-y-3">
              {snapshot.practices.map((p) => {
                const doneDays = new Set(p.logs.filter((l) => l.done).map((l) => l.done_on));
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(Date.now() - (6 - i) * 86400000);
                  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  return { iso, done: doneDays.has(iso), label: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }) };
                });

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border p-5 ${p.slipping ? 'border-amber-300' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-gray-800 leading-snug">{p.label}</p>
                        {p.declencheur && <p className="text-xs text-gray-400 mt-0.5">{p.declencheur}</p>}
                        {p.pourquoi && <p className="text-sm text-gray-500 mt-1.5 leading-snug">{p.pourquoi}</p>}
                      </div>
                      <button
                        onClick={() => archivePractice(p.id)}
                        aria-label="Archiver la pratique"
                        className="p-1.5 -mr-1 -mt-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4">
                      {days.map((d) => (
                        <div key={d.iso} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              d.done ? 'bg-teal-600 text-white' : 'bg-gray-100'
                            }`}
                          >
                            {d.done && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 uppercase">{d.label}</span>
                        </div>
                      ))}
                      <span className="ml-auto text-xs text-gray-400">
                        {p.last_7}/7 cette semaine
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !showNewPractice && (
              <p className="text-sm text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300 p-5 leading-relaxed">
                Aucune pratique en cours. C&apos;est entre les séances que ça s&apos;installe — le coach
                t&apos;en proposera une quand ce sera le bon moment.
              </p>
            )
          )}
        </section>

        {/* Protocoles conduits */}
        {snapshot && snapshot.recentRuns.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Ce que vous avez travaillé
            </h2>
            <div className="space-y-3">
              {snapshot.recentRuns.map((run) => {
                const protocol = PROTOCOLS[run.protocol_id as keyof typeof PROTOCOLS];
                const days = Math.round((Date.now() - new Date(run.ran_at).getTime()) / 86400000);
                const due = !run.revisited && run.revisit_at !== null && run.revisit_at <= new Date().toISOString().slice(0, 10);

                return (
                  <div
                    key={run.id}
                    className={`bg-white rounded-2xl border p-5 ${due ? 'border-teal-300' : 'border-gray-200'}`}
                  >
                    <p className="text-[15px] font-medium text-gray-800 leading-snug">
                      {protocol?.nom || run.protocol_id}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      il y a {days} jour{days > 1 ? 's' : ''}
                      {run.sujet ? ` · ${run.sujet}` : ''}
                      {run.intensite_avant !== null && run.intensite_apres !== null
                        ? ` · ${run.intensite_avant} → ${run.intensite_apres}`
                        : ''}
                    </p>
                    {run.resultat && (
                      <p className="text-sm text-gray-600 mt-2 leading-snug">{run.resultat}</p>
                    )}

                    {due ? (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-700 mb-3">Est-ce que ça tient ?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => resolveRun(run.id, true)}
                            className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer"
                          >
                            Ça tient
                          </button>
                          <button
                            onClick={() => resolveRun(run.id, false)}
                            className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:border-teal-400 transition-colors cursor-pointer"
                          >
                            Pas vraiment
                          </button>
                        </div>
                      </div>
                    ) : (
                      run.revisit_note && (
                        <p className="text-xs text-teal-700 mt-2">Réévalué : {run.revisit_note}</p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Le fil rouge des livres */}
        {snapshot && snapshot.insights.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Ce que tes lectures disent de ton travail
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {snapshot.insights.map((insight) => (
                <div key={insight.id} className="p-4">
                  <p className="text-[15px] text-gray-800 leading-snug">{insight.idee}</p>
                  {insight.pourquoi && (
                    <p className="text-sm text-gray-500 leading-snug mt-1">{insight.pourquoi}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    {insight.source}
                    {insight.transmise_le
                      ? ` · vu ensemble le ${new Date(insight.transmise_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                      : ' · pas encore abordé'}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Ces idées sont choisies en fin de séance à partir de ton objectif et de ce qui
              s&apos;est réellement dit. Le coach en sort une quand le moment s&apos;y prête, pas
              parce qu&apos;elle est dans la liste.
            </p>
          </section>
        )}

        {/* Check-ins */}
        {snapshot && snapshot.recentCheckins.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-3">
              Tes derniers jours
              {snapshot.derived.checkinStreak > 1 ? ` · ${snapshot.derived.checkinStreak} d'affilée` : ''}
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {snapshot.recentCheckins.map((c) => (
                <div key={c.id} className="p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    {new Date(c.day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} ·{' '}
                    {c.moment}
                    {c.energie !== null ? ` · énergie ${c.energie}/10` : ''}
                  </p>
                  {c.intention && <p className="text-sm text-gray-800 leading-snug">{c.intention}</p>}
                  {c.wins.length > 0 && (
                    <p className="text-sm text-gray-700 leading-snug">✓ {c.wins.join(' · ')}</p>
                  )}
                  {c.frictions.length > 0 && (
                    <p className="text-sm text-gray-500 leading-snug">↯ {c.frictions.join(' · ')}</p>
                  )}
                  {c.coach_reply && (
                    <p className="text-sm text-teal-800 leading-snug mt-1.5 pl-3 border-l-2 border-teal-200">
                      {c.coach_reply}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
