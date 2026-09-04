import React from 'react';
import { AuditResult } from '../types';
import { MATRICE_QUADRANTS } from '../lib/doctrine';
import { STATUT_COLORS } from './couleurs';
import { t } from '../texts';

// Position d'un curseur 1-5 sur l'axe, avec marges pour ne pas coller aux bords.
const pos = (valeur: number) => 10 + ((valeur - 1) / 4) * 80;

// Les statuts a risque remontent visuellement ; les autres sont en retrait.
const estSaillant = (a: AuditResult) => a.statut === 'Risque critique' || a.statut === 'Risque élevé';

const quadrant = 'absolute max-w-[45%] font-mono text-[0.62rem] uppercase tracking-[0.08em]';

interface MatriceProps {
  audits: AuditResult[];
  onOuvrir: (audit: AuditResult) => void;
}

const Matrice: React.FC<MatriceProps> = ({ audits, onOuvrir }) => {
  const positionnes = audits.filter(a => a.impact !== undefined && a.faisabilite !== undefined);
  const nonPositionnes = audits.length - positionnes.length;

  // Decale horizontalement les points qui partagent la meme case.
  const occupation = new Map<string, number>();
  const points = positionnes.map(audit => {
    const cle = `${audit.impact}-${audit.faisabilite}`;
    const rang = occupation.get(cle) ?? 0;
    occupation.set(cle, rang + 1);
    return { audit, rang };
  });

  return (
    <div>
      <p className="text-desc text-gris">{t.matriceLegende}</p>

      <div className="mt-4 flex">
        <div className="flex w-6 shrink-0 items-center justify-center" aria-hidden>
          <span className="-rotate-90 whitespace-nowrap font-mono text-[0.66rem] uppercase tracking-label text-gris-meta">
            {t.matriceAxeImpact} : {t.matriceFaible} → {t.matriceFort}
          </span>
        </div>

        <div className="reglure-seyes-clair relative aspect-square w-full max-w-xl rounded-card border border-trait-fort">
          {/* Medianes des quadrants */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-trait-fort" aria-hidden />
          <div className="absolute inset-x-0 top-1/2 h-px bg-trait-fort" aria-hidden />

          {/* Libelles canoniques des 4 quadrants */}
          <span className={`${quadrant} right-2.5 top-2.5 text-right text-bleu-regle`}>{MATRICE_QUADRANTS.prioritaires}</span>
          <span className={`${quadrant} left-2.5 top-2.5 text-gris-meta`}>{MATRICE_QUADRANTS.chantiers}</span>
          <span className={`${quadrant} bottom-2.5 right-2.5 text-right text-gris-meta`}>{MATRICE_QUADRANTS.gains}</span>
          <span className={`${quadrant} bottom-2.5 left-2.5 text-gris-meta`}>{MATRICE_QUADRANTS.surveiller}</span>

          {points.map(({ audit, rang }) => {
            const saillant = estSaillant(audit);
            return (
              <button
                key={audit.id}
                onClick={() => onOuvrir(audit)}
                title={`${audit.title} — ${audit.statut} (${t.matriceAxeImpact} ${audit.impact}, ${t.matriceAxeFaisabilite} ${audit.faisabilite})`}
                aria-label={`${audit.title}, ${audit.statut}, ${t.matriceAxeImpact} ${audit.impact} sur 5, ${t.matriceAxeFaisabilite} ${audit.faisabilite} sur 5. Ouvrir le rapport.`}
                className="absolute -translate-x-1/2 translate-y-1/2 rounded-xs hover:ring-2 hover:ring-bleu-regle"
                style={{
                  left: `calc(${pos(audit.faisabilite!)}% + ${rang * 14}px)`,
                  bottom: `${pos(audit.impact!)}%`,
                  width: saillant ? '18px' : '10px',
                  height: saillant ? '18px' : '10px',
                  background: saillant ? STATUT_COLORS[audit.statut] : 'var(--color-trait-fort)',
                }}
              />
            );
          })}

          {positionnes.length === 0 && (
            <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-15 text-gris">
              {t.matriceVide}
            </p>
          )}
        </div>
      </div>
      <p className="mt-1.5 pl-6 text-center font-mono text-[0.66rem] uppercase tracking-label text-gris-meta" aria-hidden>
        {t.matriceAxeFaisabilite} : {t.matriceFaible} → {t.matriceFort}
      </p>

      {positionnes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {positionnes.map(audit => {
            const saillant = estSaillant(audit);
            return (
              <li key={audit.id}>
                <button
                  onClick={() => onOuvrir(audit)}
                  className={`flex min-h-11 items-center gap-2.5 rounded-btn border border-trait bg-white px-3 py-1.5 text-desc transition-colors duration-[220ms] ease-cc hover:border-bleu-regle ${
                    saillant ? '' : 'text-gris'
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ background: saillant ? STATUT_COLORS[audit.statut] : 'var(--color-trait-fort)' }}
                  />
                  <span className="max-w-56 truncate font-medium">{audit.title}</span>
                  <span className="whitespace-nowrap font-mono text-[0.66rem] text-gris-meta">
                    {t.matriceAxeImpact} {audit.impact} · {t.matriceAxeFaisabilite} {audit.faisabilite}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {nonPositionnes > 0 && (
        <p className="mt-3 text-desc text-gris">{nonPositionnes} {t.matriceNonPositionnes}</p>
      )}
    </div>
  );
};

export default Matrice;
