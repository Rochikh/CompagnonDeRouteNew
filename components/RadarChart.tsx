
import React, { useMemo } from 'react';

interface RadarChartProps {
  scores: {
    reproductibilite: number;
    contextualisation: number;
    tacitite: number;
    multimodalite: number;
  };
}

const RadarChart: React.FC<RadarChartProps> = ({ scores }) => {
  const size = 300;
  const padding = 50;
  const radius = (size - padding * 2) / 2;
  const center = size / 2;

  const points = useMemo(() => {
    const categories = [
      { key: 'reproductibilite', label: 'Reproductibilité' },
      { key: 'contextualisation', label: 'Contextualisation' },
      { key: 'tacitite', label: 'Tacitité' },
      { key: 'multimodalite', label: 'Multimodalité' }
    ];

    return categories.map((cat, i) => {
      const angle = (i * 2 * Math.PI) / categories.length - Math.PI / 2;
      const value = (scores[cat.key as keyof typeof scores] || 0) / 3;
      const x = center + radius * value * Math.cos(angle);
      const y = center + radius * value * Math.sin(angle);
      const labelX = center + (radius + 20) * Math.cos(angle);
      const labelY = center + (radius + 20) * Math.sin(angle);
      
      return { x, y, labelX, labelY, label: cat.label };
    });
  }, [scores, radius, center]);

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Grid Circles */}
        {[1, 2, 3].map(step => (
          <circle
            key={step}
            cx={center}
            cy={center}
            r={(radius * step) / 3}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}

        {/* Axis Lines */}
        {points.map((p, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.labelX}
            y2={p.labelY}
            stroke="#cbd5e1"
            strokeDasharray="4 2"
          />
        ))}

        {/* Data Shape */}
        <path
          d={pathData}
          fill="rgba(79, 70, 229, 0.2)"
          stroke="#4f46e5"
          strokeWidth="2"
        />

        {/* Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            className="text-[10px] font-medium fill-slate-500 uppercase tracking-wider"
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default RadarChart;
