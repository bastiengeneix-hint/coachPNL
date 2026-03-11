'use client';

import { useRouter } from 'next/navigation';

interface NavBarProps {
  active: 'home' | 'exercices' | 'sessions' | 'settings';
}

const NAV_ICONS: Record<string, (active: boolean) => React.ReactNode> = {
  home: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  exercices: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  ),
  sessions: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  settings: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export default function NavBar({ active }: NavBarProps) {
  const router = useRouter();

  const items = [
    { key: 'home' as const, label: 'Accueil', path: '/' },
    { key: 'exercices' as const, label: 'Exercices', path: '/exercices' },
    { key: 'sessions' as const, label: 'Sessions', path: '/sessions' },
    { key: 'settings' as const, label: 'Réglages', path: '/settings' },
  ];

  return (
    <>
      {/* Desktop: top nav */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-[60px] max-w-3xl mx-auto px-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-teal-600">
              <path d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5C5 13 8.3 10 12 10s7 3 8.7 7c.8-1.5 1.3-3.2 1.3-5 0-5.5-4.5-10-10-10z" fill="currentColor" opacity="0.2" />
              <path d="M12 22c-1.5-3-4-6-4-9 0-2.2 1.8-4 4-4s4 1.8 4 4c0 3-2.5 6-4 9z" fill="currentColor" opacity="0.6" />
              <path d="M12 2C8 2 4.5 4.5 3 8c1.5-.5 3.2-.8 5-.8 4.4 0 8.2 2.3 10.3 5.8.4-1 .7-2 .7-3C19 5.9 16 2 12 2z" fill="currentColor" opacity="0.35" />
            </svg>
            <span className="text-base font-bold text-gray-800 tracking-tight">Inner Coach</span>
          </button>

          <div className="flex items-center gap-1">
            {items.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => router.push(item.path)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? 'text-teal-600 font-semibold'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-teal-50'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-teal-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile: bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex items-center justify-around h-[60px] px-2">
          {items.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 cursor-pointer transition-colors ${
                  isActive ? 'text-teal-600' : 'text-gray-400'
                }`}
              >
                {NAV_ICONS[item.key](isActive)}
                <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
