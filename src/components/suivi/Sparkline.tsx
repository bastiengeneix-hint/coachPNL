'use client';

// Courbe d'une mesure. SVG à la main : pas de librairie de graphes pour tracer
// huit points, et ça reste lisible sur un téléphone.

interface SparklineProps {
  values: number[];
  /** 'up' = monter c'est bien. Décide la couleur de la tendance. */
  direction?: 'up' | 'down';
  cible?: number | null;
  width?: number;
  height?: number;
}

export default function Sparkline({
  values,
  direction = 'up',
  cible = null,
  width = 240,
  height = 56,
}: SparklineProps) {
  if (values.length === 0) {
    return <div className="text-xs text-gray-400">Pas encore de relevé.</div>;
  }

  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const max = 10;

  const x = (i: number) => (values.length === 1 ? w / 2 : (i / (values.length - 1)) * w) + pad;
  const y = (v: number) => h - (v / max) * h + pad;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(values.length - 1).toFixed(1)} ${(h + pad).toFixed(1)} L ${x(0).toFixed(1)} ${(h + pad).toFixed(1)} Z`;

  const first = values[0];
  const last = values[values.length - 1];
  const progress = direction === 'up' ? last - first : first - last;
  const stroke = progress > 0 ? '#0d9488' : progress < 0 ? '#f59e0b' : '#9ca3af';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {cible !== null && (
        <line
          x1={pad}
          y1={y(cible)}
          x2={w + pad}
          y2={y(cible)}
          stroke="#d1d5db"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      )}
      <path d={area} fill={stroke} opacity="0.08" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={i === values.length - 1 ? 3.5 : 2}
          fill={i === values.length - 1 ? stroke : '#fff'}
          stroke={stroke}
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}
