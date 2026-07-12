import React, { useState } from 'react';
import { QUICK_QUESTIONS, quickVerdictFromScore } from '../lib/doctrine';
import { VERDICT_COLORS } from './couleurs';
import { t } from '../texts';

const REPONSES = [
  { val: 2, label: t.quickTestYes },
  { val: 1, label: t.quickTestPartial },
  { val: 0, label: t.quickTestNo },
];

interface TestRapideProps {
  onBack: () => void;
  // Réponses pré-remplies, utilisées par la vérification de l'étape (rendu serveur).
  initialAnswers?: Record<number, number>;
}

// Test rapide (§7.6) : 8 questions verbatim du livre, score BRUT de vulnérabilité /16,
// direction inverse de l'audit (canonique, ne pas harmoniser). Le verdict et son
// conseil viennent de QUICK_SEUILS et ne s'affichent qu'une fois les 8 réponses données.
const TestRapide: React.FC<TestRapideProps> = ({ onBack, initialAnswers }) => {
  const [answers, setAnswers] = useState<Record<number, number>>(initialAnswers ?? {});

  const answered = Object.keys(answers).length;
  const score = (Object.values(answers) as number[]).reduce((acc, val) => acc + val, 0);
  const seuil = answered === QUICK_QUESTIONS.length ? quickVerdictFromScore(score) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-trait bg-white p-6 md:p-8">
        <div className="space-y-2">
          <h2 className="text-24 font-bold">{t.btnQuickTitle}</h2>
          <p className="font-serif text-15">{t.quickTestPositionnement}</p>
          <p className="text-15 text-encre/70">{t.quickTestIntro}</p>
        </div>

        <div className="mt-6 divide-y divide-trait">
          {QUICK_QUESTIONS.map((question, idx) => (
            <div key={idx} className="space-y-3 py-5 first:pt-0 last:pb-0">
              <p className="flex gap-2 font-medium">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-kraft text-13 font-bold">{idx + 1}</span>
                {question}
              </p>
              <div className="flex gap-2">
                {REPONSES.map(rep => {
                  const selected = answers[idx] === rep.val;
                  return (
                    <button
                      key={rep.val}
                      aria-pressed={selected}
                      onClick={() => setAnswers(prev => ({ ...prev, [idx]: rep.val }))}
                      className={`min-h-11 flex-1 rounded-md border px-2 text-15 transition-colors ${selected ? 'border-bleu-regle font-semibold text-bleu-regle ring-1 ring-bleu-regle' : 'border-trait font-medium hover:border-encre/40'}`}
                    >
                      {rep.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {answered > 0 && (
        <div className="sticky bottom-4 rounded-lg border border-trait bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-13 font-semibold uppercase tracking-widest text-encre/70">{t.quickTestScoreLabel}</p>
            <p className="whitespace-nowrap text-13 text-encre/70">{answered}/{QUICK_QUESTIONS.length} {t.quickTestAnswered}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-34 font-bold">
              {score}<span className="text-18 font-medium text-encre/60">/16</span>
            </p>
            {seuil ? (
              <p className="flex items-center gap-2 text-18 font-semibold">
                <span aria-hidden className="h-2.5 w-2.5 rounded-xs" style={{ background: VERDICT_COLORS[seuil.verdict] }} />
                {seuil.verdict}
              </p>
            ) : (
              <p className="text-15 text-encre/70">{t.quickTestPending}</p>
            )}
          </div>
          {seuil && (
            <p className="mt-3 border-t border-trait pt-3 font-serif text-15">{seuil.conseil}</p>
          )}
        </div>
      )}

      <div className="pt-2 text-center">
        <button onClick={onBack} className="min-h-11 rounded-md px-3 text-15 font-medium text-bleu-regle hover:underline">
          {t.quickTestBack}
        </button>
      </div>
    </div>
  );
};

export default TestRapide;
