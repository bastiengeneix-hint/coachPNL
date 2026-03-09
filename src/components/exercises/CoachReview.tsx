'use client';

import { ExerciseReview } from '@/types';

interface CoachReviewProps {
  review: ExerciseReview;
  onClose: () => void;
}

export default function CoachReview({ review, onClose }: CoachReviewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 animate-fade-in px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-5 border border-gray-100">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-teal-600">
            Retour du coach
          </h2>
        </div>

        {/* Observation */}
        {review.observation && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Observation
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {review.observation}
            </p>
          </div>
        )}

        {/* Question */}
        {review.question && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
            <p className="text-xs font-medium text-teal-600 mb-1.5 uppercase tracking-wide">
              Question
            </p>
            <p className="text-sm text-teal-800 leading-relaxed font-medium">
              {review.question}
            </p>
          </div>
        )}

        {/* Piste */}
        {review.piste && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
              Piste
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {review.piste}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
