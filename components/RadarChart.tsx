import React from 'react';
import { DIMENSIONS } from '../lib/doctrine';
import type { AuditStatut, DimensionKey } from '../lib/doctrine';

interface RadarChartProps {
  notes: Record<DimensionKey, number>;
  // Conserve pour le contrat du composant : la lecture du statut passe par la
  // regle graduee, le radar reste monochrome (accent unique du systeme).
  statut?: AuditStatut;
  // Libelles traduits des axes, pour le rendu seul.
  labels?: Record<DimensionKey, string>;
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

// Radar des 4 dimensions, en trait bleu unique et trois opacites (aplat 0,14,
// trait porteur 0,5), a la grammaire des pictogrammes du systeme. Surface
// pleine = robuste. Les etiquettes sont posees en HTML au-dessus du trace :
// elles restent selectionnables et suivent la meme echelle mono que le reste.
const RadarChart: React.FC<RadarChartProps> = ({ notes, labels }) => {
  const points = DIMENSIONS.map((dim, i) => {
    const note = notes[dim.key] ?? 0;
    return { ...pointAt(i, note), note, label: dim.label, index: i };
  });

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')} Z`;
  const resume = points.map(p => `${p.label} ${p.note} sur 3`).join(', ');

  const etiquettes = points.map(p => {
    const exterieur = pointAt(p.index, 3.55);
    const lateral = Math.abs(exterieur.x - CENTER) > 1;
    const x = lateral ? pointAt(p.index, 3.3).x : exterieur.x;
    const y = lateral ? CENTER - 22 : exterieur.y;
    return { ...p, left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[340px]">
        {etiquettes.map(e => (
          <span
            key={`label-${e.index}`}
            className="absolute z-1 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[0.66rem] tracking-[0.04em] text-encre"
            style={{ left: e.left, top: e.top }}
          >
            {/* Libelle traduit hors police mono et sans espacement : l'arabe garde ses liaisons. */}
            {labels ? <bdi className="font-sans tracking-normal">{labels[DIMENSIONS[e.index].key]}</bdi> : e.label} · {e.note}/3
          </span>
        ))}
        <svg
          width="100%"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block overflow-visible"
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
          <path
            d={pathData}
            fill="var(--color-bleu-regle)"
            fillOpacity="0.14"
            stroke="var(--color-bleu-regle)"
            strokeOpacity="0.5"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map(p => (
            <rect
              key={`pt-${p.index}`}
              x={p.x - 3.5}
              y={p.y - 3.5}
              width="7"
              height="7"
              rx="1"
              fill="var(--color-bleu-regle)"
            />
          ))}
        </svg>
      </div>

      {/* Legende de direction (semantique visuelle explicite) */}
      <p className="mt-2 text-center font-mono text-label tracking-[0.02em] text-gris-meta">
        Plus la surface est étendue, plus l'évaluation est robuste.
      </p>
    </div>
  );
};

export default RadarChart;
