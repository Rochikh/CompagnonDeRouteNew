import React from 'react';
import { AuditResult } from '../types';
import { DIMENSIONS, FICHES } from '../lib/doctrine';
import type { DimensionKey } from '../lib/doctrine';
import RegleGraduee from './RegleGraduee';
import RadarChart from './RadarChart';
import Comparaison from './Comparaison';
import { t } from '../texts';

// Retire guillemets et espaces déjà présents aux extrémités d'une preuve pour ne
// pas doubler les « » typographiés par l'UI.
const nettoyerCitation = (s: string) => s.replace(/^[\s"«]+/, '').replace(/[\s"»]+$/, '');

const sousTitre = "text-13 font-semibold uppercase tracking-widest text-encre/70";

interface RapportProps {
  result: AuditResult;
  // Audit d'origine si celui-ci est un ré-audit : active la vue avant/après (§7.5).
  parent?: AuditResult;
  // Rappelé quand un curseur impact/faisabilité change (§2.5).
  onPriorisation?: (champ: 'impact' | 'faisabilite', valeur: number) => void;
}

// Rapport d'audit (§7.4) : chaque champ du contrat §4 est affiché, rien n'est jeté.
const Rapport: React.FC<RapportProps> = ({ result, parent, onPriorisation }) => {
  const notes = Object.fromEntries(
    DIMENSIONS.map(d => [d.key, result.dimensions[d.key].note])
  ) as Record<DimensionKey, number>;

  return (
    <div className="space-y-6">
      {/* En-tête : règle graduée (signature), statut et double lecture inclus */}
      <section className="rounded-lg border border-trait bg-white p-6 md:p-8">
        <RegleGraduee score={result.score_robustesse} />
      </section>

      {/* Ré-audit : vue avant/après avec deltas par dimension */}
      {parent && <Comparaison avant={parent} apres={result} />}

      {/* Stress-test simulé */}
      <section className="rounded-lg border border-trait bg-white p-6 md:p-8" aria-labelledby="stress-test-titre">
        <h3 id="stress-test-titre" className={sousTitre}>{t.stressTestTitle}</h3>
        <p className="mt-2 text-24 font-bold">
          ~{result.stress_test.minutes_estimees}&nbsp;{t.stressTestMin}
          <span aria-hidden className="text-encre/40"> · </span>
          {t.stressTestPilotage} {result.stress_test.pilotage}
        </p>
        <p className="mt-3 max-w-2xl font-serif text-15">{result.stress_test.verdict}</p>
      </section>

      {/* Les 4 dimensions : note, justification, preuves citées si note 0 */}
      <section className="rounded-lg border border-trait bg-white p-6 md:p-8" aria-labelledby="dimensions-titre">
        <h3 id="dimensions-titre" className="text-24 font-bold">{t.dimensionsTitle}</h3>
        <div className="mt-6 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <RadarChart notes={notes} statut={result.statut} />
          <div className="divide-y divide-trait">
            {DIMENSIONS.map(dim => {
              const d = result.dimensions[dim.key];
              return (
                <article key={dim.key} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <h4 className="text-18 font-semibold">{dim.label}</h4>
                    <p className="whitespace-nowrap text-18 font-bold">
                      {d.note}<span className="text-13 font-medium text-encre/70">/3</span>
                    </p>
                  </div>
                  <p className="mt-1.5 font-serif text-15">{d.justification}</p>
                  {d.preuves && d.preuves.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-13 font-medium text-encre/70">{t.preuvesLabel}</p>
                      {d.preuves.map((p, i) => (
                        <blockquote key={i} className="rounded-md bg-kraft px-4 py-3 font-serif text-15">
                          «&nbsp;{nettoyerCitation(p)}&nbsp;»
                        </blockquote>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Points de vigilance */}
      <section className="rounded-lg border border-trait bg-white p-6 md:p-8" aria-labelledby="vigilance-titre">
        <h3 id="vigilance-titre" className="text-24 font-bold">{t.vigilancePoints}</h3>
        <ul className="mt-4 space-y-3">
          {result.points_vigilance.map((v, i) => (
            <li key={i} className="flex gap-3">
              <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-xs bg-brique" />
              <p className="font-serif text-15">{v}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Recommandations triées (tri serveur : vulnérabilité croissante des fiches),
          cartes-fiches à onglet kraft, dépliables sur le contenu intégral de la fiche */}
      <section aria-labelledby="recs-titre">
        <h3 id="recs-titre" className="text-24 font-bold">{t.recsTitle}</h3>
        <p className="mt-1 text-13 text-encre/70">{t.recsSorted}</p>
        <div className="mt-4 space-y-4">
          {result.recommandations.map((rec, i) => {
            const fiche = FICHES[rec.fiche];
            return (
              <details key={i} className="group overflow-hidden rounded-lg border border-trait bg-white shadow-sm">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4 border-b border-trait bg-kraft px-4 py-2.5 md:px-6">
                    <span className="text-13 font-semibold">{rec.fiche}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-13 font-medium text-encre/70 print:hidden">
                      {t.ficheDeplier}
                      <svg aria-hidden className="h-3.5 w-3.5 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </span>
                  <span className="block px-4 py-4 font-serif text-15 md:px-6">{rec.action}</span>
                </summary>
                <div className="border-t border-trait px-4 pb-5 pt-4 md:px-6">
                  {fiche ? (
                    <div className="space-y-4">
                      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                        {([
                          [t.ficheFormat, fiche.format],
                          [t.ficheDuree, fiche.duree],
                          [t.fichePublics, fiche.publics],
                          [t.ficheCharge, fiche.charge],
                        ] as const).map(([label, valeur]) => (
                          <div key={label}>
                            <dt className={sousTitre}>{label}</dt>
                            <dd className="mt-0.5 font-serif text-15">{valeur}</dd>
                          </div>
                        ))}
                      </dl>
                      <div>
                        <h4 className={sousTitre}>{t.fichePrincipe}</h4>
                        <p className="mt-0.5 font-serif text-15">{fiche.principe}</p>
                      </div>
                      <div>
                        <h4 className={sousTitre}>{t.ficheAdaptations}</h4>
                        <ul className="mt-1 space-y-1">
                          {fiche.adaptations.map((a, j) => (
                            <li key={j} className="flex gap-2 font-serif text-15">
                              <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-xs bg-bleu-regle" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    // Anti-régression 7 : jamais de trou muet sur une clé de fiche inconnue.
                    <p className="font-serif text-15">{t.ficheInconnue}</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Curseurs impact/faisabilité pour la matrice du portefeuille (§2.5) */}
      {onPriorisation && (
        <section className="rounded-lg border border-trait bg-white p-6 md:p-8" aria-labelledby="prio-titre">
          <h3 id="prio-titre" className="text-24 font-bold">{t.prioTitle}</h3>
          <p className="mt-1 text-13 text-encre/70">{t.prioAide}</p>
          <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {([['impact', t.prioImpact], ['faisabilite', t.prioFaisabilite]] as const).map(([champ, libelle]) => (
              <div key={champ}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{libelle}</span>
                  <span className="text-13 text-encre/70">
                    {result[champ] !== undefined ? `${result[champ]}/5` : t.prioNonRenseigne}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 print:hidden" role="group" aria-label={libelle}>
                  {[1, 2, 3, 4, 5].map(valeur => {
                    const selected = result[champ] === valeur;
                    return (
                      <button
                        key={valeur}
                        aria-pressed={selected}
                        onClick={() => onPriorisation(champ, valeur)}
                        className={`h-11 flex-1 rounded-md border text-15 transition-colors ${selected ? 'border-bleu-regle font-semibold text-bleu-regle ring-1 ring-bleu-regle' : 'border-trait font-medium hover:border-encre/40'}`}
                      >
                        {valeur}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Rapport;
