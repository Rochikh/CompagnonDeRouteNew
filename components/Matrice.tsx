import React from 'react';
import { AuditResult } from '../types';
import { MATRICE_QUADRANTS } from '../lib/doctrine';
import { STATUT_COLORS } from './couleurs';
import { t } from '../texts';

// Position d'un curseur 1-5 sur l'axe, avec marges pour ne pas coller aux bords.
const pos = (valeur: number) => 10 + ((valeur - 1) / 4) * 80;

// Les statuts à risque remontent visuellement (§2.5) ; les autres sont en retrait.
const estSaillant = (a: AuditResult) => a.statut === 'Risque critique' || a.statut === 'Risque élevé';

interface MatriceProps {
  audits: AuditResult[];
  onOuvrir: (audit: AuditResult) => void;
}

const Matrice: React.FC<MatriceProps> = ({ audits, onOuvrir }) => {
  const positionnes = audits.filter(a => a.impact !== undefined && a.faisabilite !== undefined);
  const nonPositionnes = audits.length - positionnes.length;

  // Décale horizontalement les points qui partagent la même case, pour rester lisible.
  const occupation = new Map<string, number>();
  const points = positionnes.map(audit => {
    const cle = `${audit.impact}-${audit.faisabilite}`;
    const rang = occupation.get(cle) ?? 0;
    occupation.set(cle, rang + 1);
    return { audit, rang };
  });

  return (
    <div>
      <p className="text-13 text-encre/70">{t.matriceLegende}</p>

      <div className="mt-4 flex">
        <div className="flex w-6 shrink-0 items-center justify-center" aria-hidden>
          <span className="-rotate-90 whitespace-nowrap text-13 font-medium text-encre/60">
            {t.matriceAxeImpact} : {t.matriceFaible} → {t.matriceFort}
          </span>
        </div>

        <div className="relative aspect-square w-full max-w-xl rounded-lg border border-trait bg-white">
          {/* Médianes des quadrants */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-trait" aria-hidden />
          <div className="absolute inset-x-0 top-1/2 h-px bg-trait" aria-hidden />

          {/* Libellés canoniques des 4 quadrants (§2.5) */}
          <span className="absolute right-2 top-2 max-w-[45%] text-right text-[11px] font-semibold uppercase tracking-wide text-encre/50">{MATRICE_QUADRANTS.prioritaires}</span>
          <span className="absolute left-2 top-2 max-w-[45%] text-[11px] font-semibold uppercase tracking-wide text-encre/50">{MATRICE_QUADRANTS.chantiers}</span>
          <span className="absolute bottom-2 right-2 max-w-[45%] text-right text-[11px] font-semibold uppercase tracking-wide text-encre/50">{MATRICE_QUADRANTS.gains}</span>
          <span className="absolute bottom-2 left-2 max-w-[45%] text-[11px] font-semibold uppercase tracking-wide text-encre/50">{MATRICE_QUADRANTS.surveiller}</span>

          {points.map(({ audit, rang }) => {
            const saillant = estSaillant(audit);
            return (
              <button
                key={audit.id}
                onClick={() => onOuvrir(audit)}
                title={`${audit.title} — ${audit.statut} (${t.matriceAxeImpact} ${audit.impact}, ${t.matriceAxeFaisabilite} ${audit.faisabilite})`}
                aria-label={`${audit.title}, ${audit.statut}, ${t.matriceAxeImpact} ${audit.impact} sur 5, ${t.matriceAxeFaisabilite} ${audit.faisabilite} sur 5. Ouvrir le rapport.`}
                className="absolute -translate-x-1/2 translate-y-1/2 rounded-full hover:ring-2 hover:ring-bleu-regle"
                style={{
                  left: `calc(${pos(audit.faisabilite!)}% + ${rang * 14}px)`,
                  bottom: `${pos(audit.impact!)}%`,
                  width: saillant ? '18px' : '10px',
                  height: saillant ? '18px' : '10px',
                  background: saillant ? STATUT_COLORS[audit.statut] : 'rgb(34 48 60 / 0.25)',
                }}
              />
            );
          })}

          {positionnes.length === 0 && (
            <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-15 text-encre/60">
              {t.matriceVide}
            </p>
          )}
        </div>
      </div>
      <p className="mt-1 pl-6 text-center text-13 font-medium text-encre/60" aria-hidden>
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
                  className={`flex min-h-11 items-center gap-2 rounded-md border border-trait bg-white px-3 py-1.5 text-13 transition-colors hover:border-bleu-regle ${saillant ? '' : 'text-encre/60'}`}
                >
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: saillant ? STATUT_COLORS[audit.statut] : 'rgb(34 48 60 / 0.25)' }}
                  />
                  <span className="max-w-56 truncate font-medium">{audit.title}</span>
                  <span className="whitespace-nowrap text-[11px] text-encre/50">
                    {t.matriceAxeImpact} {audit.impact} · {t.matriceAxeFaisabilite} {audit.faisabilite}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {nonPositionnes > 0 && (
        <p className="mt-3 text-13 text-encre/70">{nonPositionnes} {t.matriceNonPositionnes}</p>
      )}
    </div>
  );
};

export default Matrice;
