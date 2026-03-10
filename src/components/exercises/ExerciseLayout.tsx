'use client';

import { ReactNode } from 'react';
import NavBar from '@/components/NavBar';

interface ExerciseLayoutProps {
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  showNav?: boolean;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'bg-teal-500 w-7'
              : i + 1 < current
                ? 'bg-teal-500 w-2 opacity-50'
                : 'bg-gray-300 w-2 opacity-30'
          }`}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function ExerciseLayout({
  title,
  subtitle,
  currentStep,
  totalSteps,
  children,
  onBack,
  onNext,
  nextLabel = 'Suivant',
  nextDisabled = false,
  loading = false,
  showNav = true,
}: ExerciseLayoutProps) {
  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      {showNav && <NavBar active="exercices" />}

      {/* Progress */}
      <div className={`${showNav ? 'pt-20' : 'pt-10'} pb-4 px-6`}>
        <ProgressDots current={currentStep} total={totalSteps} />
      </div>

      {/* Title */}
      <div className="px-6 pb-4 text-center">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-4 max-w-lg mx-auto w-full">
        <div className="animate-fade-in">{children}</div>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium bg-transparent text-teal-600 border border-teal-500 hover:bg-teal-50 transition-colors cursor-pointer"
            >
              Précédent
            </button>
          ) : (
            <div />
          )}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <>
                  <Spinner />
                  Un instant...
                </>
              ) : (
                nextLabel
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
