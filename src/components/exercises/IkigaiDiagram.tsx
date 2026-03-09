'use client';

interface IkigaiDiagramProps {
  passion: string[];
  mission: string[];
  vocation: string[];
  profession: string[];
}

const CIRCLES = [
  { key: 'passion', label: 'Ce que tu adores', color: 'rgba(239, 68, 68, 0.15)', stroke: '#ef4444', cx: 120, cy: 110 },
  { key: 'mission', label: 'Ce dont le monde a besoin', color: 'rgba(234, 179, 8, 0.15)', stroke: '#eab308', cx: 180, cy: 110 },
  { key: 'vocation', label: 'Ce pour quoi on te paierait', color: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e', cx: 180, cy: 170 },
  { key: 'profession', label: 'Ce dans quoi tu excelles', color: 'rgba(59, 130, 246, 0.15)', stroke: '#3b82f6', cx: 120, cy: 170 },
] as const;

export default function IkigaiDiagram({ passion, mission, vocation, profession }: IkigaiDiagramProps) {
  const data: Record<string, string[]> = { passion, mission, vocation, profession };

  // Find items in 3+ circles
  const allItems = [...new Set([...passion, ...mission, ...vocation, ...profession])];
  const convergences = allItems.filter((item) => {
    let count = 0;
    if (passion.includes(item)) count++;
    if (mission.includes(item)) count++;
    if (vocation.includes(item)) count++;
    if (profession.includes(item)) count++;
    return count >= 3;
  });

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 300 280" className="w-full max-w-[280px] mx-auto">
        {/* Circles */}
        {CIRCLES.map((c) => (
          <g key={c.key}>
            <circle cx={c.cx} cy={c.cy} r={70} fill={c.color} stroke={c.stroke} strokeWidth={1.5} opacity={0.8} />
            {/* Label */}
            <text
              x={c.key === 'passion' ? c.cx - 30 : c.key === 'mission' ? c.cx + 30 : c.key === 'vocation' ? c.cx + 30 : c.cx - 30}
              y={c.key === 'passion' || c.key === 'mission' ? c.cy - 50 : c.cy + 55}
              textAnchor="middle"
              className="text-[7px] fill-gray-500 font-medium"
            >
              {c.label}
            </text>
            {/* Items */}
            {data[c.key]?.slice(0, 3).map((item, i) => (
              <text
                key={i}
                x={c.key === 'passion' ? c.cx - 20 : c.key === 'mission' ? c.cx + 20 : c.key === 'vocation' ? c.cx + 20 : c.cx - 20}
                y={(c.key === 'passion' || c.key === 'mission' ? c.cy - 30 : c.cy + 25) + i * 12}
                textAnchor="middle"
                className="text-[7px] fill-gray-700"
              >
                {item.length > 15 ? item.slice(0, 15) + '...' : item}
              </text>
            ))}
          </g>
        ))}

        {/* Center IKIGAI label */}
        <text x="150" y="140" textAnchor="middle" dominantBaseline="middle" className="text-[10px] fill-teal-600 font-bold">
          IKIGAI
        </text>
      </svg>

      {/* Convergences */}
      {convergences.length > 0 && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
          <p className="text-xs font-medium text-teal-600 mb-1 uppercase tracking-wide">
            Zones de convergence
          </p>
          <div className="flex flex-wrap gap-1.5">
            {convergences.map((item) => (
              <span key={item} className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
