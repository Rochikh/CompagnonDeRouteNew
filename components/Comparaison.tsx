import React from 'react';
import { AuditResult } from '../types';
import { DIMENSIONS } from '../lib/doctrine';
import { MiniRegle } from './RegleGraduee';
import { t } from '../texts';

const signe = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');
// Gain en accent bleu, recul en rouge du correcteur, stabilite en gris.
const couleurDelta = (n: number) =>
  n > 0 ? 'var(--color-bleu-regle)' : n < 0 ? 'var(--color-rouge)' : 'var(--color-gris-meta)';

interface ComparaisonProps {
  avant: AuditResult;
  apres: AuditResult;
}

// Vue avant/apres d'un re-audit : deux mini-regles et le delta de robustesse
// par dimension (direction robustesse : +N = gain, −N = recul).
const Comparaison: React.FC<ComparaisonProps> = ({ avant, apres }) => {
  const deltaTotal = apres.score_robustesse - avant.score_robustesse;

  return (
    <section className="rounded-card border border-trait bg-white p-6 md:p-8" aria-labelledby="comparaison-titre">
      <h3
        id="comparaison-titre"
        className="flex items-center gap-2.5 font-mono text-label font-medium uppercase tracking-label-wide text-bleu-regle"
      >
        <span aria-hidden className="h-0.5 w-5 shrink-0 bg-rouge" />
        {t.comparaisonTitle}
      </h3>

      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {([[t.comparaisonAvant, avant], [t.comparaisonApres, apres]] as const).map(([libelle, audit]) => (
          <div key={libelle}>
            <p className="mb-2 flex items-baseline justify-between font-mono text-[0.72rem] tracking-[0.04em]">
              <span className="uppercase tracking-label text-gris-meta">{libelle}</span>
              <span className="whitespace-nowrap text-gris-meta">
                {audit.date} · <strong className="font-semibold text-bleu-regle">{audit.score_robustesse}/12</strong>
              </span>
            </p>
            <MiniRegle score={audit.score_robustesse} />
          </div>
        ))}
      </div>

      <ul className="mt-5 border-t border-trait">
        {DIMENSIONS.map(dim => {
          const noteAvant = avant.dimensions[dim.key].note;
          const noteApres = apres.dimensions[dim.key].note;
          const delta = noteApres - noteAvant;
          return (
            <li
              key={dim.key}
              className="flex items-center justify-between gap-4 border-b border-trait py-2.5 text-15"
            >
              <span className="font-medium">{dim.label}</span>
              <span className="flex items-baseline gap-3 whitespace-nowrap font-mono text-[0.78rem]">
                <span className="text-gris-meta">{noteAvant}/3 → {noteApres}/3</span>
                <strong className="w-10 text-right font-semibold" style={{ color: couleurDelta(delta) }}>
                  {signe(delta)}
                </strong>
              </span>
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-4 border-b border-trait py-2.5 text-15">
          <span className="font-semibold">{t.comparaisonTotal}</span>
          <span className="flex items-baseline gap-3 whitespace-nowrap font-mono text-[0.78rem]">
            <span className="text-gris-meta">
              {avant.score_robustesse}/12 → {apres.score_robustesse}/12
            </span>
            <strong className="w-10 text-right font-semibold" style={{ color: couleurDelta(deltaTotal) }}>
              {signe(deltaTotal)}
            </strong>
          </span>
        </li>
      </ul>
    </section>
  );
};

export default Comparaison;
