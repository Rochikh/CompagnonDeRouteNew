import React, { useState } from 'react';
import { QUICK_QUESTIONS, quickVerdictFromScore } from '../lib/doctrine';
import { VERDICT_COLORS } from './couleurs';
import { t } from '../texts';

const REPONSES = [
  { val: 2, label: t.quickTestYes },
  { val: 1, label: t.quickTestPartial },
  { val: 0, label: t.quickTestNo },
];

const btnReponse =
  'min-h-11 rounded-btn border px-4 font-mono text-[0.74rem] tracking-[0.02em] whitespace-nowrap transition-colors duration-[220ms] ease-cc';

interface TestRapideProps {
  onBack: () => void;
  // Reponses pre-remplies, utilisees par la verification de l'etape (rendu serveur).
  initialAnswers?: Record<number, number>;
}

// Test rapide : 8 questions verbatim du livre, score BRUT de vulnerabilite /16,
// direction inverse de l'audit (canonique, ne pas harmoniser). Le verdict et son
// conseil viennent de QUICK_SEUILS et ne s'affichent qu'une fois les 8 reponses
// donnees. Mise en page en deux colonnes : questions a gauche, resultat collant
// a droite, empile sous 1024px.
const TestRapide: React.FC<TestRapideProps> = ({ onBack, initialAnswers }) => {
  const [answers, setAnswers] = useState<Record<number, number>>(initialAnswers ?? {});

  const answered = Object.keys(answers).length;
  const score = (Object.values(answers) as number[]).reduce((acc, val) => acc + val, 0);
  const seuil = answered === QUICK_QUESTIONS.length ? quickVerdictFromScore(score) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <p className="flex items-center gap-2.5 font-mono text-label font-medium uppercase tracking-label-wide text-bleu-regle">
          <span aria-hidden className="h-0.5 w-5 shrink-0 bg-rouge" />
          Sans IA
        </p>
        <h2 className="font-display text-34 font-extrabold tracking-section">{t.btnQuickTitle}</h2>
        <p className="max-w-prose text-15 text-gris">{t.quickTestPositionnement}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-3">
          <p className="text-desc text-gris">{t.quickTestIntro}</p>
          {QUICK_QUESTIONS.map((question, idx) => (
            <div key={idx} className="flex items-baseline gap-3.5 rounded-card border border-trait bg-white p-5">
              <span aria-hidden className="min-w-6 font-mono text-[0.72rem] font-medium text-bleu-regle/65">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 space-y-3">
                <p className="text-15 font-semibold">{question}</p>
                <div className="flex flex-wrap gap-2">
                  {REPONSES.map(rep => {
                    const selected = answers[idx] === rep.val;
                    return (
                      <button
                        key={rep.val}
                        aria-pressed={selected}
                        onClick={() => setAnswers(prev => ({ ...prev, [idx]: rep.val }))}
                        className={`${btnReponse} ${
                          selected
                            ? 'border-bleu-regle bg-bleu-regle font-semibold text-white'
                            : 'border-trait-fort bg-white text-gris hover:border-bleu-regle hover:text-bleu-regle'
                        }`}
                      >
                        {rep.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4 lg:sticky lg:top-[76px]">
          <div className="reglure-seyes rounded-card border border-trait-fort p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-mono text-label font-medium uppercase tracking-label text-gris-meta">
                {t.quickTestScoreLabel}
              </p>
              <p className="whitespace-nowrap font-mono text-label text-gris-meta">
                {answered} / {QUICK_QUESTIONS.length}
              </p>
            </div>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-figure font-semibold tracking-titre text-bleu-regle">{score}</span>
              <span className="font-mono text-meta text-gris-meta">/ 16</span>
            </p>
            <div className="mt-4 flex gap-[3px]" aria-hidden>
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className={`h-2 flex-1 rounded-xs ${i < score ? 'bg-bleu-regle' : 'bg-vide'}`} />
              ))}
            </div>
            {seuil ? (
              <>
                <p
                  className="mt-4 flex items-center gap-2.5 font-mono text-[0.74rem] font-medium uppercase tracking-label"
                  style={{ color: VERDICT_COLORS[seuil.verdict] }}
                >
                  <span aria-hidden className="h-0.5 w-5 shrink-0" style={{ background: VERDICT_COLORS[seuil.verdict] }} />
                  {seuil.verdict}
                </p>
                <p className="mt-2 text-desc text-gris">{seuil.conseil}</p>
              </>
            ) : (
              <p className="mt-4 text-desc text-gris">{t.quickTestPending}</p>
            )}
            <p className="mt-5 border-t border-dashed border-trait-fort pt-3 font-mono text-[0.72rem] text-gris-meta">
              Direction inverse de l'audit : haut = vulnérable
            </p>
          </div>

          <button
            onClick={onBack}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-btn border-[1.5px] border-trait-fort px-6 py-3 text-[0.9rem] font-semibold whitespace-nowrap transition-colors duration-[220ms] ease-cc hover:border-bleu-regle hover:text-bleu-regle"
          >
            {t.quickTestBack}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestRapide;
