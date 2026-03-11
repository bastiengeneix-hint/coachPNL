'use client';

import { useEffect, useState, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import BilanCard from '@/components/BilanCard';
import ActionItem from '@/components/ActionItem';
import type { Session, Bilan, BilanContent } from '@/types';

interface FlatAction {
  session_id: string;
  session_date: string;
  session_mode: string;
  index: number;
  text: string;
  done: boolean;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bilans, setBilans] = useState<Bilan[]>([]);
  const [actions, setActions] = useState<FlatAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingBilan, setGeneratingBilan] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [sessionsRes, bilansRes, actionsRes] = await Promise.all([
          fetch('/api/sessions'),
          fetch('/api/bilans'),
          fetch('/api/actions'),
        ]);

        if (sessionsRes.ok) setSessions(await sessionsRes.json());
        if (bilansRes.ok) setBilans(await bilansRes.json());
        if (actionsRes.ok) setActions(await actionsRes.json());
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const handleToggleAction = useCallback(async (action: FlatAction) => {
    const newDone = !action.done;

    setActions((prev) =>
      prev.map((a) =>
        a.session_id === action.session_id && a.index === action.index
          ? { ...a, done: newDone }
          : a
      )
    );

    try {
      await fetch('/api/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: action.session_id,
          index: action.index,
          done: newDone,
        }),
      });
    } catch (err) {
      console.error('Failed to update action:', err);
      setActions((prev) =>
        prev.map((a) =>
          a.session_id === action.session_id && a.index === action.index
            ? { ...a, done: !newDone }
            : a
        )
      );
    }
  }, []);

  const handleGenerateWeeklyBilan = useCallback(async () => {
    setGeneratingBilan(true);
    try {
      const res = await fetch('/api/bilans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'weekly' }),
      });

      if (res.ok) {
        const bilan = await res.json();
        if (bilan.id) {
          setBilans((prev) => [bilan, ...prev.filter((b) => b.id !== bilan.id)]);
        }
      }
    } catch (err) {
      console.error('Failed to generate bilan:', err);
    } finally {
      setGeneratingBilan(false);
    }
  }, []);

  const pendingActions = actions.filter((a) => !a.done);

  return (
    <div className="min-h-screen bg-stone-50 relative z-10 pb-24">
      <div className="pt-20 max-w-3xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Mon suivi</h1>
          <p className="text-sm text-gray-500 mt-1">Sessions, actions et bilans</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '200ms' }} />
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        {!loading && (
          <div className="space-y-8">
            {/* === Zone 1: Bilans === */}
            {(bilans.length > 0 || sessions.length > 0) && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Bilans</h2>
                  <button
                    onClick={handleGenerateWeeklyBilan}
                    disabled={generatingBilan}
                    className="text-sm text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {generatingBilan ? 'Génération...' : 'Bilan de la semaine'}
                  </button>
                </div>

                {bilans.length > 0 ? (
                  <div className="space-y-3">
                    {bilans.map((bilan) => (
                      <BilanCard
                        key={bilan.id}
                        type={bilan.type}
                        periodStart={bilan.period_start}
                        periodEnd={bilan.period_end}
                        content={bilan.content as BilanContent}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                    <p className="text-sm text-gray-400">
                      Pas encore de bilan. Clique sur &quot;Bilan de la semaine&quot; pour en générer un.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* === Zone 2: Actions en cours === */}
            {pendingActions.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Actions en cours
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {pendingActions.length} restante{pendingActions.length > 1 ? 's' : ''}
                  </span>
                </h2>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="divide-y divide-gray-100">
                    {pendingActions.map((action) => (
                      <ActionItem
                        key={`${action.session_id}-${action.index}`}
                        text={action.text}
                        done={action.done}
                        sessionDate={action.session_date}
                        onToggle={() => handleToggleAction(action)}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* === Zone 3: Historique sessions === */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Historique</h2>

              {sessions.length === 0 ? (
                <div className="flex items-center justify-center py-12 animate-fade-in">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-xs">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" className="text-teal-600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-gray-800 font-semibold mb-1">Aucune session</p>
                    <p className="text-gray-400 text-sm">Tes conversations apparaîtront ici.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {sessions.map((s, i) => {
                    const isDeblocage = s.mode === 'deblocage';
                    const isExpanded = expandedId === s.id;
                    const mainBreakthrough = s.insights?.find((ins) => ins.isBreakthrough);
                    const sessionActions = s.actions || [];
                    const coachSummary = s.coach_summary || s.summary;

                    return (
                      <div key={s.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                        <button
                          onClick={() => toggleExpand(s.id)}
                          className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left transition-all duration-200 hover:shadow-md"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isDeblocage ? 'bg-teal-50' : 'bg-rose-50'}`}>
                              {isDeblocage ? (
                                <svg className="w-5 h-5 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-gray-800 font-semibold text-[15px]">
                                  {isDeblocage ? 'Déblocage' : 'Journal'}
                                </p>
                                <div className="flex-1" />
                                {s.themes?.slice(0, 2).map((theme, idx) => (
                                  <span key={idx} className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium truncate max-w-[100px]">
                                    {theme}
                                  </span>
                                ))}
                              </div>
                              <p className="text-gray-400 text-xs mt-1">{formatDate(s.date)}</p>

                              {coachSummary && (
                                <p className="text-gray-500 text-sm leading-relaxed mt-2.5 line-clamp-2">
                                  {coachSummary}
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-2.5">
                                {mainBreakthrough && (
                                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium flex items-center gap-1 max-w-[200px] truncate">
                                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
                                    {mainBreakthrough.text}
                                  </span>
                                )}
                                {sessionActions.length > 0 && (
                                  <span className="text-xs text-gray-400">
                                    {sessionActions.filter((a) => a.done).length}/{sessionActions.length} actions
                                  </span>
                                )}
                              </div>
                            </div>

                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 mt-1 ${isExpanded ? 'rotate-180' : ''}`}
                              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 bg-white rounded-2xl border border-gray-200 p-5 animate-fade-in">
                            {s.messages.length > 0 ? (
                              <div className="flex flex-col gap-4">
                                {s.messages.map((msg) => (
                                  <div key={msg.id} className="flex flex-col gap-1">
                                    <span className={`text-xs font-semibold tracking-wide uppercase ${msg.role === 'user' ? 'text-teal-600' : 'text-gray-400'}`}>
                                      {msg.role === 'user' ? 'Toi' : 'Coach'}
                                    </span>
                                    <p className="text-gray-600 text-sm leading-relaxed">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-400 text-sm text-center py-2">Pas de messages enregistrés.</p>
                            )}

                            {s.insights?.length > 0 && (
                              <div className="mt-5 pt-4 border-t border-gray-200">
                                <p className="text-xs font-semibold text-teal-600 mb-3 uppercase tracking-wide">Insights</p>
                                <div className="flex flex-col gap-2">
                                  {s.insights.map((insight, idx) => (
                                    <div key={idx} className="flex items-start gap-2.5 pl-3 border-l-2 border-teal-500">
                                      <p className={`text-sm leading-relaxed ${insight.isBreakthrough ? 'text-teal-600 font-medium' : 'text-gray-600'}`}>
                                        {insight.text}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {sessionActions.length > 0 && (
                              <div className="mt-5 pt-4 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Actions</p>
                                <div className="divide-y divide-gray-100">
                                  {sessionActions.map((action, idx) => (
                                    <ActionItem
                                      key={idx}
                                      text={action.text}
                                      done={action.done}
                                      onToggle={() => {
                                        handleToggleAction({
                                          session_id: s.id,
                                          session_date: s.date,
                                          session_mode: s.mode,
                                          index: idx,
                                          text: action.text,
                                          done: action.done,
                                        });
                                        setSessions((prev) =>
                                          prev.map((sess) =>
                                            sess.id === s.id
                                              ? { ...sess, actions: sess.actions.map((a, ai) => ai === idx ? { ...a, done: !a.done } : a) }
                                              : sess
                                          )
                                        );
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <NavBar active="sessions" />
    </div>
  );
}
