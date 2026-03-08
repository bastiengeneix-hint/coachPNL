'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/components/NavBar';
import { getSessions } from '@/lib/memory/store';
import type { Session } from '@/types';

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-stone-50 relative z-10 pb-24">
      {/* Header */}
      <div className="pt-20 max-w-3xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            Mes sessions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ton historique de conversations
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"
                style={{ animationDelay: '200ms' }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"
                style={{ animationDelay: '400ms' }}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="currentColor"
                    className="text-teal-600"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-gray-800 font-semibold mb-1">
                Aucune session
              </p>
              <p className="text-gray-400 text-sm">
                Tes conversations apparaîtront ici.
              </p>
            </div>
          </div>
        )}

        {/* Session List */}
        {!loading && sessions.length > 0 && (
          <div className="flex flex-col gap-3">
            {sessions.map((s, i) => {
              const isDeblocage = s.mode === 'deblocage';
              const isExpanded = expandedId === s.id;

              return (
                <div
                  key={s.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Session Card */}
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-left transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Mode Icon */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isDeblocage
                            ? 'bg-teal-50'
                            : 'bg-rose-50'
                        }`}
                      >
                        {isDeblocage ? (
                          <svg
                            className="w-5 h-5 text-teal-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-rose-500"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-800 font-semibold text-[15px]">
                            {isDeblocage ? 'Déblocage' : 'Journal'}
                          </p>
                          <div className="flex-1" />
                          {s.themes.slice(0, 2).map((theme, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium truncate max-w-[100px]"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                        <p className="text-gray-400 text-sm mt-0.5">
                          {formatDate(s.date)}
                        </p>
                      </div>

                      {/* Expand chevron */}
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 mt-1 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-2 bg-white rounded-2xl border border-gray-200 p-5 animate-fade-in">
                      {/* Messages */}
                      {s.messages.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          {s.messages.map((msg) => (
                            <div key={msg.id} className="flex flex-col gap-1">
                              <span
                                className={`text-xs font-semibold tracking-wide uppercase ${
                                  msg.role === 'user'
                                    ? 'text-teal-600'
                                    : 'text-gray-400'
                                }`}
                              >
                                {msg.role === 'user' ? 'Toi' : 'Coach'}
                              </span>
                              <p className="text-gray-600 text-sm leading-relaxed">
                                {msg.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm text-center py-2">
                          Pas de messages enregistrés.
                        </p>
                      )}

                      {/* Insights */}
                      {s.insights.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-gray-200">
                          <p className="text-xs font-semibold text-teal-600 mb-3 uppercase tracking-wide">
                            Insights
                          </p>
                          <div className="flex flex-col gap-2">
                            {s.insights.map((insight, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2.5 pl-3 border-l-2 border-teal-500"
                              >
                                <p
                                  className={`text-sm leading-relaxed ${
                                    insight.isBreakthrough
                                      ? 'text-teal-600 font-medium'
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {insight.text}
                                </p>
                              </div>
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
      </div>

      <NavBar active="sessions" />
    </div>
  );
}
