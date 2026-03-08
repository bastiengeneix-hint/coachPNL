'use client';

import { useRouter } from 'next/navigation';

interface NavBarProps {
  active: 'home' | 'sessions' | 'settings';
}

export default function NavBar({ active }: NavBarProps) {
  const router = useRouter();

  const items = [
    { key: 'home' as const, label: 'Accueil', path: '/' },
    { key: 'sessions' as const, label: 'Sessions', path: '/sessions' },
    { key: 'settings' as const, label: 'Réglages', path: '/settings' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-[60px] max-w-3xl mx-auto px-6">
        {/* Brand */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 cursor-pointer"
        >
          {/* Leaf / lotus icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-teal-600"
          >
            <path
              d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5C5 13 8.3 10 12 10s7 3 8.7 7c.8-1.5 1.3-3.2 1.3-5 0-5.5-4.5-10-10-10z"
              fill="currentColor"
              opacity="0.2"
            />
            <path
              d="M12 22c-1.5-3-4-6-4-9 0-2.2 1.8-4 4-4s4 1.8 4 4c0 3-2.5 6-4 9z"
              fill="currentColor"
              opacity="0.6"
            />
            <path
              d="M12 2C8 2 4.5 4.5 3 8c1.5-.5 3.2-.8 5-.8 4.4 0 8.2 2.3 10.3 5.8.4-1 .7-2 .7-3C19 5.9 16 2 12 2z"
              fill="currentColor"
              opacity="0.35"
            />
          </svg>
          <span className="text-base font-bold text-gray-800 tracking-tight">
            Inner Coach
          </span>
        </button>

        {/* Nav links */}
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
  );
}
