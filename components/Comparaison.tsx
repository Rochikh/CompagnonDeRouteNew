import React from 'react';
import { AuditResult } from '../types';
import { DIMENSIONS } from '../lib/doctrine';
import { MiniRegle } from './RegleGraduee';
import { t } from '../texts';

const signe = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');
const couleurDelta = (n: number) =>
  n > 0 ? 'var(--color-sapin)' : n < 0 ? 'var(--color-garance)' : 'rgb(34 48 60 / 0.7)';

interface ComparaisonProps {
  avant: AuditResult;
  apres: AuditResult;
}

// Vue avant/après d'un ré-audit (§7.5) : deux mini-règles et le delta de
// robustesse par dimension (direction robustesse : +N = gain, −N = recul).
const Comparaison: React.FC<ComparaisonProps> = ({ avant, apres }) => {
  const deltaTotal = apres.score_robustesse - avant.score_robustesse;

  return (
    <section className="rounded-lg border border-trait bg-white p-6 md:p-8" aria-labelledby="comparaison-titre">
      <h3 id="comparaison-titre" className="text-24 font-bold">{t.comparaisonTitle}</h3>

      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {([[t.comparaisonAvant, avant], [t.comparaisonApres, apres]] as const).map(([libelle, audit]) => (
          <div key={libelle}>
            <p className="mb-1.5 flex items-baseline justify-between text-13">
              <span className="font-semibold uppercase tracking-widest text-encre/70">{libelle}</span>
              <span className="text-encre/70">
                {audit.date} · <strong className="text-15 text-encre">{audit.score_robustesse}/12</strong>
              </span>
            </p>
            <MiniRegle score={audit.score_robustesse} />
          </div>
        ))}
      </div>

      <ul className="mt-5 divide-y divide-trait border-t border-trait">
        {DIMENSIONS.map(dim => {
          const noteAvant = avant.dimensions[dim.key].note;
          const noteApres = apres.dimensions[dim.key].note;
          const delta = noteApres - noteAvant;
          return (
            <li key={dim.key} className="flex items-center justify-between gap-4 py-2.5 text-15">
              <span className="font-medium">{dim.label}</span>
              <span className="flex items-baseline gap-3 whitespace-nowrap">
                <span className="text-encre/70">{noteAvant}/3 → {noteApres}/3</span>
                <strong className="w-9 text-right" style={{ color: couleurDelta(delta) }}>{signe(delta)}</strong>
              </span>
            </li>
          );
        })}
        <li className="flex items-center justify-between gap-4 py-2.5 text-15">
          <span className="font-semibold">{t.comparaisonTotal}</span>
          <span className="flex items-baseline gap-3 whitespace-nowrap">
            <span className="text-encre/70">{avant.score_robustesse}/12 → {apres.score_robustesse}/12</span>
            <strong className="w-9 text-right" style={{ color: couleurDelta(deltaTotal) }}>{signe(deltaTotal)}</strong>
          </span>
        </li>
      </ul>
    </section>
  );
};

export default Comparaison;
