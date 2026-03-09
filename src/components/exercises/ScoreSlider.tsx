'use client';

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export default function ScoreSlider({ label, value, onChange }: ScoreSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-teal-600">{value}/10</span>
      </div>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 10 }, (_, i) => {
          const score = i + 1;
          const isActive = score <= value;
          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              className={`w-full h-3 rounded-full transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-teal-500'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`${score} sur 10`}
            />
          );
        })}
      </div>
    </div>
  );
}
