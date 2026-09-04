import React from 'react';
import { AUDIT_SEUILS, statutFromScore } from '../lib/doctrine';
import { STATUT_COLORS } from './couleurs';

const MAX = 12;

const cellules = (score: number) =>
  Array.from({ length: MAX }, (_, i) => i < score);

// Mini-regle : version compacte pour les listes du portefeuille et la vue
// avant/apres. Douze cases, remplies jusqu'au score. Direction robustesse.
export const MiniRegle: React.FC<{ score: number; className?: string }> = ({ score, className }) => (
  <div
    role="img"
    aria-label={`Robustesse ${score} sur ${MAX} : ${statutFromScore(score)}.`}
    className={`flex gap-[2px] ${className ?? 'w-full'}`}
  >
    {cellules(score).map((pleine, i) => (
      <span
        key={i}
        aria-hidden
        className={`h-2 flex-1 rounded-xs ${pleine ? 'bg-bleu-regle' : 'bg-vide'}`}
      />
    ))}
  </div>
);

interface RegleGradueeProps {
  score: number;
}

// Signature du rapport : carte sur reglure Seyes, chiffre en mono, douze cases
// remplies jusqu'au score, bandes de seuils sous la regle, statut ecrit en
// annotation rouge du correcteur. Aucune animation de remplissage : l'etat de
// base est l'etat final, le rapport s'imprime complet.
const RegleGraduee: React.FC<RegleGradueeProps> = ({ score }) => {
  const statut = statutFromScore(score);
  const couleur = STATUT_COLORS[statut];
  const seuil = AUDIT_SEUILS.find(s => score >= s.min && score <= s.max)!;

  return (
    <div
      role="img"
      aria-label={`Score de robustesse ${score} sur ${MAX} : ${statut}. ${seuil.action}. Substituabilité ${MAX - score} sur ${MAX}.`}
      className="reglure-seyes rounded-card border border-trait-fort p-6 md:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <p className="font-mono text-label font-medium uppercase tracking-label text-gris-meta">
            Robustesse
          </p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-figure font-semibold tracking-titre text-bleu-regle">{score}</span>
            <span className="font-mono text-meta text-gris-meta">/ {MAX}</span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <span
            className="flex items-center gap-2.5 font-mono text-[0.74rem] font-medium uppercase tracking-label"
            style={{ color: couleur }}
          >
            <span aria-hidden className="h-0.5 w-5 shrink-0" style={{ background: couleur }} />
            {statut}
          </span>
          <span className="text-desc text-gris">{seuil.action}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-[3px]" aria-hidden>
        {cellules(score).map((pleine, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-xs ${pleine ? 'bg-bleu-regle' : 'bg-vide'}`} />
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-4 gap-[3px]" aria-hidden>
        {AUDIT_SEUILS.map(z => {
          const actif = z.statut === statut;
          return (
            <div
              key={z.statut}
              className={`pt-1 font-mono text-[0.64rem] tracking-[0.04em] ${
                actif ? 'border-t-2 border-rouge font-semibold text-rouge' : 'border-t border-trait text-gris-meta'
              }`}
            >
              {z.min}–{z.max} · {z.statut.replace('Risque ', '')}
            </div>
          );
        })}
      </div>

      {/* Double lecture (decision 4) */}
      <p className="mt-5 border-t border-dashed border-trait-fort pt-3 font-mono text-[0.72rem] text-gris-meta">
        <span className="font-medium text-encre">Robustesse {score}/12</span> · Substituabilité {MAX - score}/12
      </p>
    </div>
  );
};

export default RegleGraduee;
