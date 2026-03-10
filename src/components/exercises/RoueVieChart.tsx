'use client';

interface RoueVieChartProps {
  axes: { label: string; score: number }[];
}

export default function RoueVieChart({ axes }: RoueVieChartProps) {
  const cx = 150;
  const cy = 150;
  const maxR = 120;
  const n = axes.length;

  const getPoint = (index: number, score: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (score / 10) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Grid circles
  const gridCircles = [2, 4, 6, 8, 10];

  // Data polygon
  const points = axes.map((a, i) => getPoint(i, a.score));
  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[280px] mx-auto">
      {/* Grid circles */}
      {gridCircles.map((v) => (
        <circle
          key={v}
          cx={cx}
          cy={cy}
          r={(v / 10) * maxR}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={v === 10 ? 1.5 : 0.5}
        />
      ))}

      {/* Axis lines + labels */}
      {axes.map((a, i) => {
        const end = getPoint(i, 10);
        const labelPos = getPoint(i, 12.5);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#d1d5db" strokeWidth={0.5} />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] fill-gray-500 font-medium"
            >
              {a.label}
            </text>
          </g>
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="rgba(74, 158, 143, 0.2)"
        stroke="#4A9E8F"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#4A9E8F" stroke="white" strokeWidth={2} />
      ))}
    </svg>
  );
}
