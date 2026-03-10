'use client';

interface TriangleCanvasProps {
  areas: { label: string; score: number }[];
}

export default function TriangleCanvas({ areas }: TriangleCanvasProps) {
  if (areas.length !== 3) return null;

  const cx = 150;
  const cy = 160;
  const maxR = 110;

  // Three vertices: top, bottom-left, bottom-right
  const angles = [-Math.PI / 2, Math.PI / 2 + Math.PI / 6, Math.PI / 2 - Math.PI / 6];

  const getPoint = (index: number, score: number) => {
    const r = (score / 10) * maxR;
    return {
      x: cx + r * Math.cos(angles[index]),
      y: cy + r * Math.sin(angles[index]),
    };
  };

  const outerPoints = areas.map((_, i) => getPoint(i, 10));
  const dataPoints = areas.map((a, i) => getPoint(i, a.score));
  const labelPoints = areas.map((_, i) => getPoint(i, 12.5));

  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-[260px] mx-auto">
      {/* Outer triangle grid */}
      {[2, 4, 6, 8, 10].map((v) => {
        const pts = areas.map((_, i) => getPoint(i, v));
        return (
          <polygon
            key={v}
            points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={v === 10 ? 1.5 : 0.5}
          />
        );
      })}

      {/* Axis lines */}
      {outerPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#d1d5db" strokeWidth={0.5} />
      ))}

      {/* Data triangle */}
      <polygon
        points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="rgba(74, 158, 143, 0.2)"
        stroke="#4A9E8F"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill="#4A9E8F" stroke="white" strokeWidth={2} />
      ))}

      {/* Labels */}
      {areas.map((a, i) => (
        <text
          key={i}
          x={labelPoints[i].x}
          y={labelPoints[i].y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-[9px] fill-gray-600 font-semibold"
        >
          {a.label} ({a.score})
        </text>
      ))}
    </svg>
  );
}
