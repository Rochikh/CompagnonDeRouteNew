import React from 'react';
import { DIMENSIONS } from '../lib/doctrine';
import type { AuditStatut, DimensionKey } from '../lib/doctrine';
import { STATUT_COLORS, STATUT_TRAITS } from './couleurs';

interface RadarChartProps {
  notes: Record<DimensionKey, number>;
  statut: AuditStatut;
}

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 104;

function pointAt(index: number, value: number): { x: number; y: number } {
  const angle = (index * 2 * Math.PI) / DIMENSIONS.length - Math.PI / 2;
  return {
    x: CENTER + RADIUS * (value / 3) * Math.cos(angle),
    y: CENTER + RADIUS * (value / 3) * Math.sin(angle),
  };
}

function ringPath(level: number): string {
  const pts = DIMENSIONS.map((_, i) => pointAt(i, level));
  return `M ${pts.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
}

const RadarChart: React.FC<RadarChartProps> = ({ notes, statut }) => {
  const couleur = STATUT_COLORS[statut];
  const trait = STATUT_TRAITS[statut];

  const points = DIMENSIONS.map((dim, i) => {
    const note = notes[dim.key] ?? 0;
    const outer = pointAt(i, 3.55); // position des étiquettes, au-delà de l'anneau externe
    return { ...pointAt(i, note), note, label: dim.label, outer, index: i };
  });

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;

  const resume = points.map(p => `${p.label} ${p.note} sur 3`).join(', ');

  return (
    <div className="flex flex-col items-center">
      <svg
        width="100%"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="max-w-[340px] overflow-visible"
        role="img"
        aria-label={`Radar des 4 dimensions, direction robustesse : ${resume}.`}
      >
        {/* Anneaux de graduation (1/3, 2/3, 3/3) */}
        {[1, 2, 3].map(level => (
          <path key={level} d={ringPath(level)} fill="none" stroke="var(--color-trait)" strokeWidth="1" />
        ))}

        {/* Axes */}
        {points.map(p => (
          <line
            key={`axe-${p.index}`}
            x1={CENTER}
            y1={CENTER}
            x2={pointAt(p.index, 3).x}
            y2={pointAt(p.index, 3).y}
            stroke="var(--color-trait)"
            strokeWidth="1"
          />
        ))}

        {/* Surface de robustesse : pleine = robuste */}
        <path d={pathData} fill={couleur} fillOpacity="0.15" stroke={trait} strokeWidth="2" strokeLinejoin="round" />
        {points.map(p => (
          <circle key={`pt-${p.index}`} cx={p.x} cy={p.y} r="3.5" fill={trait} />
        ))}

        {/* Étiquettes des axes, avec la note. Les axes latéraux portent leur
            étiquette centrée juste au-dessus du sommet pour rester lisibles
            sans déborder de la carte. */}
        {points.map(p => {
          const lateral = Math.abs(p.outer.x - CENTER) > 1;
          const lx = lateral ? pointAt(p.index, 3.3).x : p.outer.x;
          const ly = lateral ? CENTER - 12 : p.outer.y;
          return (
            <text
              key={`label-${p.index}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline={!lateral && p.outer.y > CENTER ? 'hanging' : 'auto'}
              className="text-[13px] font-medium"
              fill="var(--color-encre)"
            >
              {p.label} · {p.note}/3
            </text>
          );
        })}
      </svg>

      {/* Légende de direction (§6 : sémantique visuelle explicite) */}
      <p className="mt-2 text-13 text-center" style={{ color: 'rgb(34 48 60 / 0.7)' }}>
        Plus la surface est étendue, plus l'évaluation est robuste.
      </p>
    </div>
  );
};

export default RadarChart;
