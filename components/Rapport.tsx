import React from 'react';
import { AuditResult, RapportTraduit } from '../types';
import { DIMENSIONS, FICHES } from '../lib/doctrine';
import type { DimensionKey } from '../lib/doctrine';
import RegleGraduee from './RegleGraduee';
import RadarChart from './RadarChart';
import Comparaison from './Comparaison';
import { t } from '../texts';

// Retire guillemets et espaces deja presents aux extremites d'une preuve pour ne
// pas doubler les « » typographies par l'UI.
const nettoyerCitation = (s: string) => s.replace(/^[\s"«]+/, '').replace(/[\s"»]+$/, '');

// Etiquette de section du systeme : tiret rouge de 20x2px suivi d'un mot en mono
// majuscule bleu. Remplace les anciens titres de section en gras.
const Etiquette: React.FC<{ id?: string; children: React.ReactNode }> = ({ id, children }) => (
  <p
    id={id}
    className="flex items-center gap-2.5 font-mono text-label font-medium uppercase tracking-label-wide text-bleu-regle"
  >
    <span aria-hidden className="h-0.5 w-5 shrink-0 bg-rouge" />
    {children}
  </p>
);

const champ = 'font-mono text-[0.68rem] font-medium uppercase tracking-label text-gris-meta';
const carte = 'rounded-card border border-trait bg-white p-6 md:p-8';

interface RapportProps {
  result: AuditResult;
  // Libelles traduits (dimensions, titres de fiches) quand le rapport est affiche traduit.
  libelles?: RapportTraduit['libelles'];
  // Statut et pilotage traduits, pour le rendu seul.
  statutAffiche?: string;
  pilotageAffiche?: string;
  // Audit d'origine si celui-ci est un re-audit : active la vue avant/apres.
  parent?: AuditResult;
  // Rappele quand un curseur impact/faisabilite change.
  onPriorisation?: (champ: 'impact' | 'faisabilite', valeur: number) => void;
  // Ouvre le portefeuille en vue matrice, propose quand les deux curseurs sont renseignes.
  onVoirMatrice?: () => void;
}

// Rapport d'audit : chaque champ du contrat API est affiche, rien n'est jete.
const Rapport: React.FC<RapportProps> = ({ result, libelles, statutAffiche, pilotageAffiche, parent, onPriorisation, onVoirMatrice }) => {
  const notes = Object.fromEntries(
    DIMENSIONS.map(d => [d.key, result.dimensions[d.key].note])
  ) as Record<DimensionKey, number>;

  return (
    <div className="space-y-6">
      {/* En-tete : regle graduee (signature), statut et double lecture inclus */}
      <RegleGraduee score={result.score_robustesse} statutAffiche={statutAffiche} />

      {/* Re-audit : vue avant/apres avec deltas par dimension */}
      {parent && <Comparaison avant={parent} apres={result} />}

      {/* Stress-test simule, en encart chiffre a bord gauche accentue */}
      <section className="space-y-3" aria-labelledby="stress-test-titre">
        <Etiquette id="stress-test-titre">{t.stressTestTitle}</Etiquette>
        <div className="flex items-baseline gap-4.5 rounded-card border border-trait-fort border-l-[3px] border-l-bleu-regle bg-white px-6 py-5">
          <p className="shrink-0 font-mono text-[1.9rem] font-semibold leading-none tracking-titre text-bleu-regle">
            ~{result.stress_test.minutes_estimees}&nbsp;{t.stressTestMin}
          </p>
          <p dir="auto" className="text-15 text-gris">
            {result.stress_test.verdict}{' '}
            <span className="whitespace-nowrap font-mono text-[0.75rem] text-gris-meta">
              {t.stressTestPilotage} <span dir="auto">{pilotageAffiche ?? result.stress_test.pilotage}</span>
            </span>
          </p>
        </div>
      </section>

      {/* Les 4 dimensions : note, justification, preuves citees si note 0 */}
      <section className={carte} aria-labelledby="dimensions-titre">
        <Etiquette id="dimensions-titre">{t.dimensionsTitle}</Etiquette>
        <div className="mt-6 grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
          <RadarChart notes={notes} statut={result.statut} />
          <div>
            {DIMENSIONS.map(dim => {
              const d = result.dimensions[dim.key];
              return (
                <article key={dim.key} className="space-y-2 border-b border-trait py-4.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h4 dir="auto" className="font-display text-18 font-bold tracking-[-0.01em]">{libelles?.dimensions[dim.key] ?? dim.label}</h4>
                    <p className="whitespace-nowrap font-mono text-[0.95rem] font-semibold text-bleu-regle">
                      {d.note}<span className="font-normal text-label text-gris-meta"> / 3</span>
                    </p>
                  </div>
                  <p dir="auto" className="text-15">{d.justification}</p>
                  {d.preuves && d.preuves.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className={champ}>{t.preuvesLabel}</p>
                      {d.preuves.map((p, i) => (
                        <blockquote key={i} dir="auto" className="border-l-2 border-rouge py-0.5 pl-3.5 text-15 text-gris">
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

      {/* Points de vigilance, en liste a filets et tirets rouges */}
      <section className={carte} aria-labelledby="vigilance-titre">
        <Etiquette id="vigilance-titre">{t.vigilancePoints}</Etiquette>
        <ul className="mt-4">
          {result.points_vigilance.map((v, i) => (
            <li key={i} className="flex items-baseline gap-3.5 border-b border-trait py-3">
              <span aria-hidden className="h-0.5 w-3 shrink-0 -translate-y-1 bg-rouge" />
              <p dir="auto" className="text-15">{v}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Recommandations triees (tri serveur : vulnerabilite croissante des fiches),
          cartes-fiches a onglet gris, depliables sur le contenu integral de la fiche */}
      <section className="space-y-4" aria-labelledby="recs-titre">
        <div className="space-y-1.5">
          <Etiquette id="recs-titre">{t.recsTitle}</Etiquette>
          <p className="text-desc text-gris">{t.recsSorted}</p>
        </div>
        <div className="space-y-3">
          {result.recommandations.map((rec, i) => {
            const fiche = FICHES[rec.fiche];
            const [reference, nom] = rec.fiche.split(' — ');
            return (
              <details
                key={i}
                className="group overflow-hidden rounded-card border border-trait bg-white transition-colors duration-[220ms] ease-cc hover:border-bleu-regle"
              >
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-trait bg-bande px-4 py-2.5 md:px-6">
                    <span className="flex flex-wrap items-center gap-2.5">
                      <span className="rounded-xs bg-bleu-clair px-2 py-0.5 font-mono text-label font-medium uppercase tracking-[0.06em] text-bleu-regle">
                        {reference}
                      </span>
                      <span dir="auto" className="text-desc font-semibold">{libelles?.fiches[rec.fiche] ?? nom ?? rec.fiche}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-label uppercase tracking-label text-gris-meta print:hidden">
                      {t.ficheDeplier}
                      <svg
                        aria-hidden
                        className="h-3 w-3 group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </span>
                  <span dir="auto" className="block px-4 py-4 text-15 md:px-6">{rec.action}</span>
                </summary>
                <div className="space-y-4 border-t border-dashed border-trait-fort px-4 pb-5 pt-4 md:px-6">
                  {fiche ? (
                    <>
                      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                        {([
                          [t.ficheFormat, fiche.format],
                          [t.ficheDuree, fiche.duree],
                          [t.fichePublics, fiche.publics],
                          [t.ficheCharge, fiche.charge],
                        ] as const).map(([label, valeur]) => (
                          <div key={label}>
                            <dt className={champ}>{label}</dt>
                            <dd className="mt-0.5 text-15">{valeur}</dd>
                          </div>
                        ))}
                      </dl>
                      <div>
                        <h5 className={champ}>{t.fichePrincipe}</h5>
                        <p className="mt-0.5 text-15">{fiche.principe}</p>
                      </div>
                      <div>
                        <h5 className={champ}>{t.ficheAdaptations}</h5>
                        <ul className="mt-1.5 flex flex-wrap gap-2">
                          {fiche.adaptations.map((a, j) => (
                            <li
                              key={j}
                              className="rounded-xs border border-trait px-2.5 py-1 font-mono text-label uppercase tracking-[0.06em] text-gris"
                            >
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : (
                    // Anti-regression : jamais de trou muet sur une cle de fiche inconnue.
                    <p className="text-15">{t.ficheInconnue}</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* Curseurs impact/faisabilite pour la matrice du portefeuille */}
      {onPriorisation && (
        <section className={carte} aria-labelledby="prio-titre">
          <div className="space-y-1.5">
            <Etiquette id="prio-titre">{t.prioTitle}</Etiquette>
            <p className="text-desc text-gris">{t.prioAide}</p>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {([['impact', t.prioImpact], ['faisabilite', t.prioFaisabilite]] as const).map(([champField, libelle]) => (
              <div key={champField}>
                <div className="flex items-baseline justify-between">
                  <span className="text-15 font-semibold">{libelle}</span>
                  <span className="font-mono text-[0.72rem] text-gris-meta">
                    {result[champField] !== undefined ? `${result[champField]}/5` : t.prioNonRenseigne}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 print:hidden" role="group" aria-label={libelle}>
                  {[1, 2, 3, 4, 5].map(valeur => {
                    const selected = result[champField] === valeur;
                    return (
                      <button
                        key={valeur}
                        aria-pressed={selected}
                        onClick={() => onPriorisation(champField, valeur)}
                        className={`h-11 flex-1 rounded-btn border font-mono text-meta transition-colors duration-[220ms] ease-cc ${
                          selected
                            ? 'border-bleu-regle bg-bleu-regle font-semibold text-white'
                            : 'border-trait-fort text-gris hover:border-bleu-regle hover:text-bleu-regle'
                        }`}
                      >
                        {valeur}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {onVoirMatrice && result.impact !== undefined && result.faisabilite !== undefined && (
            <button
              onClick={onVoirMatrice}
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-btn border-[1.5px] border-trait-fort px-6 py-3 text-[0.9rem] font-semibold transition-colors duration-[220ms] ease-cc hover:border-bleu-regle hover:text-bleu-regle print:hidden"
            >
              {t.prioVoirMatrice} →
            </button>
          )}
        </section>
      )}
    </div>
  );
};

export default Rapport;
