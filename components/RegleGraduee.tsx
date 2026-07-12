import React from 'react';
import { AUDIT_SEUILS, statutFromScore } from '../lib/doctrine';
import { STATUT_COLORS } from './couleurs';

const MAX = 12;

// Limites visuelles des zones : la frontière passe à mi-chemin entre deux bandes
// de seuils (un score de 3 est critique, un score de 4 est élevé).
const ZONES = AUDIT_SEUILS.map(s => ({
  from: s.min === 0 ? 0 : s.min - 0.5,
  to: s.max === MAX ? MAX : s.max + 0.5,
  couleur: STATUT_COLORS[s.statut],
}));

const ZONES_GRADIENT = `linear-gradient(to right, ${ZONES.map(
  z => `${z.couleur} ${(z.from / MAX) * 100}% ${(z.to / MAX) * 100}%`
).join(', ')})`;

// Graduations fines au demi-point, franches à l'entier.
const TICKS = Array.from({ length: MAX * 2 + 1 }, (_, i) => ({
  pos: (i / (MAX * 2)) * 100,
  entier: i % 2 === 0,
}));

interface RegleGradueeProps {
  score: number;
}

const RegleGraduee: React.FC<RegleGradueeProps> = ({ score }) => {
  const statut = statutFromScore(score);
  const couleur = STATUT_COLORS[statut];
  const pct = (score / MAX) * 100;

  const labelStyle: React.CSSProperties =
    pct < 14 ? { left: 0 }
    : pct > 86 ? { right: 0 }
    : { left: `${pct}%`, transform: 'translateX(-50%)' };

  return (
    <div role="img" aria-label={`Score de robustesse ${score} sur 12 : ${statut}. Substituabilité ${MAX - score} sur 12.`} className="w-full select-none">
      {/* Statut, imprimé au-dessus du curseur après le remplissage */}
      <div className="relative h-8">
        <span
          className="absolute bottom-0 inline-flex items-center gap-2 whitespace-nowrap text-18 font-semibold"
          style={{
            ...labelStyle,
            animation: 'regle-imprimer 400ms ease-out 700ms backwards',
          }}
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-xs" style={{ background: couleur }} />
          {statut}
        </span>
      </div>

      {/* Curseur triangulaire, glisse jusqu'à la valeur */}
      <div className="relative h-2.5" aria-hidden>
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{
            left: `${pct}%`,
            width: 0,
            height: 0,
            borderLeft: '7px solid transparent',
            borderRight: '7px solid transparent',
            borderTop: '9px solid var(--color-encre)',
            animation: 'regle-curseur 700ms ease-out',
          }}
        />
      </div>

      {/* La règle : zones en attente, remplissage jusqu'à la valeur, graduations */}
      <div className="relative h-7 overflow-hidden rounded-md border border-trait" aria-hidden>
        <div className="absolute inset-0" style={{ background: ZONES_GRADIENT, opacity: 0.22 }} />
        <div
          className="absolute inset-0"
          style={{
            background: ZONES_GRADIENT,
            clipPath: `inset(0 ${100 - pct}% 0 0)`,
            animation: 'regle-remplir 700ms ease-out',
          }}
        />
        {TICKS.map(t => (
          <div
            key={t.pos}
            className="absolute top-0 w-px"
            style={{
              left: `${t.pos}%`,
              height: t.entier ? '11px' : '6px',
              background: 'rgb(34 48 60 / 0.45)',
            }}
          />
        ))}
      </div>

      {/* Numéros de graduation */}
      <div className="relative mt-1 h-4 text-[11px] font-medium" aria-hidden style={{ color: 'rgb(34 48 60 / 0.7)' }}>
        {Array.from({ length: MAX + 1 }, (_, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              left: `${(i / MAX) * 100}%`,
              transform: i === 0 ? 'none' : i === MAX ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {i}
          </span>
        ))}
      </div>

      {/* Double lecture (décision 4) */}
      <p className="mt-2 text-15">
        <span className="font-semibold">Robustesse {score}/12</span>
        <span style={{ color: 'rgb(34 48 60 / 0.7)' }}> · Substituabilité {MAX - score}/12</span>
      </p>
    </div>
  );
};

export default RegleGraduee;
