
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, AuditResult, ContextAnswers } from './types';
import { auditConsigne } from './services/gemini';
import Rapport from './components/Rapport';
import TestRapide from './components/TestRapide';
import Matrice from './components/Matrice';
import { MiniRegle } from './components/RegleGraduee';
import { STATUT_COLORS } from './components/couleurs';
import { t, LOADING_MESSAGES } from './texts';

const btnPrimary = "inline-flex min-h-11 items-center justify-center rounded-md bg-bleu-regle px-5 py-2.5 font-semibold text-white transition-colors hover:bg-encre disabled:pointer-events-none disabled:opacity-30";
const btnSecondary = "inline-flex min-h-11 items-center justify-center rounded-md border border-trait bg-white px-5 py-2.5 font-semibold transition-colors hover:border-bleu-regle hover:text-bleu-regle";

// Les 3 questions de contexte (§7.3), libellés et exemples dans texts.ts.
const CONTEXT_QUESTIONS: Array<{
  field: keyof ContextAnswers;
  title: string;
  desc: string;
  options: Array<{ label: string; ex: string }>;
}> = [
  { field: 'synchrone', title: t.q1Title, desc: t.q1Desc, options: t.q1Options },
  { field: 'donnees', title: t.q2Title, desc: t.q2Desc, options: t.q2Options },
  { field: 'processus', title: t.q3Title, desc: t.q3Desc, options: t.q3Options },
];

// Fusion d'un portefeuille importé : les entrées valides dont l'id n'existe pas
// encore sont ajoutées, les doublons sont ignorés (§7.7). Exportée pour la
// vérification de l'étape.
export function fusionnerPortefeuille(
  existants: AuditResult[],
  importes: unknown
): { portefeuille: AuditResult[]; ajoutes: number; doublons: number } {
  if (!Array.isArray(importes)) throw new Error('format invalide');
  const valides = importes.filter(
    (x): x is AuditResult => !!x && typeof x.id === 'string' && !!x.dimensions && typeof x.statut === 'string'
  );
  if (valides.length === 0) throw new Error('format invalide');
  const ids = new Set(existants.map(p => p.id));
  const nouveaux = valides.filter(x => !ids.has(x.id));
  return {
    portefeuille: [...existants, ...nouveaux],
    ajoutes: nouveaux.length,
    doublons: valides.length - nouveaux.length,
  };
}

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [consigne, setConsigne] = useState('');
  const [contextAnswers, setContextAnswers] = useState<ContextAnswers>({
    synchrone: '',
    donnees: '',
    processus: ''
  });
  const [currentResult, setCurrentResult] = useState<AuditResult | null>(null);

  // Gestion du Portefeuille
  const [portfolio, setPortfolio] = useState<AuditResult[]>(() => {
    try {
      const saved = localStorage.getItem('compagnon_portfolio');
      // Écarte les entrées au format v1 (plat), incompatibles avec le contrat v2.
      return saved ? JSON.parse(saved).filter((x: any) => x?.dimensions) : [];
    } catch { return []; }
  });

  // États UI
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadingIntervalRef = useRef<number | null>(null);

  const [showAbout, setShowAbout] = useState(false);

  // Ré-audit en cours : id de l'audit d'origine, attaché au prochain résultat.
  const [parentReaudit, setParentReaudit] = useState<string | null>(null);
  // Portefeuille : bascule liste / matrice impact-faisabilité.
  const [vueMatrice, setVueMatrice] = useState(false);
  const fichierImportRef = useRef<HTMLInputElement | null>(null);

  // Synchronisation locale du portefeuille
  useEffect(() => {
    localStorage.setItem('compagnon_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const startLoadingMessages = () => {
    let index = 0;
    setLoadingStep(LOADING_MESSAGES[0]);
    loadingIntervalRef.current = window.setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingStep(LOADING_MESSAGES[index]);
    }, 2500);
  };

  const stopLoadingMessages = () => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  };

  const handleAuditSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    startLoadingMessages();

    try {
      const data = await auditConsigne(consigne, contextAnswers);

      const result: AuditResult = {
        id: Math.random().toString(36).substr(2, 9),
        title: consigne.trim().substring(0, 50) + (consigne.length > 50 ? '...' : ''),
        consigne,
        contextAnswers,
        ...data,
        date: new Date().toLocaleDateString(t.dateLocale),
        parentId: parentReaudit ?? undefined
      };

      setCurrentResult(result);
      setPortfolio(prev => [result, ...prev]);
      setParentReaudit(null);
      setStep(AppStep.AUDIT_RESULT);
    } catch (err: any) {
      console.error("Audit fail:", err);
      setError(err.message || t.analysisInterrupted);
    } finally {
      setLoading(false);
      stopLoadingMessages();
    }
  };

  const copyAsJson = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(JSON.stringify(currentResult, null, 2));
    alert(t.copied);
  };

  // Export PDF : les fiches sont dépliées pour que le rapport s'imprime intégral,
  // la mise en page A4 vit dans index.css (@page, @media print).
  const exporterPdf = () => {
    document.querySelectorAll('details').forEach(d => { d.open = true; });
    window.print();
  };

  // Ré-audit (§7.5) : consigne et contexte pré-remplis, filiation mémorisée.
  const demarrerReaudit = () => {
    if (!currentResult) return;
    setConsigne(currentResult.consigne);
    setContextAnswers(currentResult.contextAnswers);
    setParentReaudit(currentResult.id);
    setError(null);
    setStep(AppStep.AUDIT_INPUT);
  };

  // Curseurs impact/faisabilité : mise à jour du rapport courant et du portefeuille.
  const majPriorisation = (champ: 'impact' | 'faisabilite', valeur: number) => {
    if (!currentResult) return;
    const maj = { ...currentResult, [champ]: valeur };
    setCurrentResult(maj);
    setPortfolio(prev => prev.map(item => (item.id === maj.id ? maj : item)));
  };

  const ouvrirRapport = (audit: AuditResult) => {
    setCurrentResult(audit);
    setStep(AppStep.AUDIT_RESULT);
  };

  const exporterJson = () => {
    const blob = new Blob([JSON.stringify(portfolio, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'compagnon-de-route-portefeuille.json';
    lien.click();
    URL.revokeObjectURL(url);
  };

  const importerJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const resultat = fusionnerPortefeuille(portfolio, JSON.parse(String(lecteur.result)));
        setPortfolio(resultat.portefeuille);
        alert(`${resultat.ajoutes} ${t.importAjoutes}, ${resultat.doublons} ${t.importDoublons}.`);
      } catch {
        alert(t.importInvalide);
      }
    };
    lecteur.readAsText(fichier);
  };

  return (
    <div className="relative min-h-screen pb-20">
      <header className="sticky top-0 z-40 border-b border-trait bg-papier print:hidden">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <button
            onClick={() => { setStep(AppStep.WELCOME); setError(null); }}
            className="flex min-h-11 items-center gap-3"
          >
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-md bg-bleu-regle font-bold text-white">C</span>
            <span className="font-semibold tracking-tight">{t.appTitle}</span>
          </button>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setShowAbout(true)}
              title={t.about}
              aria-label={t.about}
              className="flex h-11 w-11 items-center justify-center rounded-md text-encre/70 transition-colors hover:text-bleu-regle"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button
              onClick={() => { setStep(AppStep.PORTFOLIO); setError(null); }}
              className={`min-h-11 rounded-md px-3 text-15 font-medium transition-colors ${step === AppStep.PORTFOLIO ? 'text-bleu-regle' : 'text-encre/80 hover:text-bleu-regle'}`}
            >
              {t.portfolio} ({portfolio.length})
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {error && (
          <div role="alert" className="mb-6 rounded-md border border-trait border-l-4 border-l-garance bg-white p-5">
            <h3 className="font-semibold">{t.analysisInterrupted}</h3>
            <p className="mt-1 font-serif text-15">{error}</p>
          </div>
        )}

        {step === AppStep.WELCOME && (
          <div className="space-y-12 py-10 md:py-16">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-34 font-bold tracking-tight md:text-48">
                {t.heroTitle1} {t.heroTitle2}<br />
                <span className="text-bleu-regle">{t.heroTitle3}</span>
              </h2>
              <p className="max-w-xl font-serif text-18">
                {t.heroSubtitle}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => { setParentReaudit(null); setStep(AppStep.AUDIT_INPUT); setError(null); }}
                className="rounded-lg border border-trait bg-white p-6 text-left shadow-sm transition-colors hover:border-bleu-regle"
              >
                <h3 className="text-18 font-semibold">{t.btnAuditTitle}</h3>
                <p className="mt-1.5 font-serif text-15 text-encre/80">{t.btnAuditDesc}</p>
              </button>
              <button
                onClick={() => setStep(AppStep.QUICK_TEST)}
                className="rounded-lg border border-trait bg-white p-6 text-left shadow-sm transition-colors hover:border-bleu-regle"
              >
                <h3 className="text-18 font-semibold">{t.btnQuickTitle}</h3>
                <p className="mt-1.5 font-serif text-15 text-encre/80">{t.btnQuickDesc}</p>
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_INPUT && (
          <div className="mx-auto max-w-2xl">
            <div className="space-y-5 rounded-lg border border-trait bg-white p-6 md:p-8">
              <h2 className="text-24 font-bold">{t.step1Title}</h2>
              <textarea
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                placeholder={t.step1Placeholder}
                className="h-56 w-full resize-none rounded-md border border-trait bg-white p-4 font-serif text-15"
              />
              <button
                disabled={!consigne.trim()}
                onClick={() => setStep(AppStep.AUDIT_QUESTIONS)}
                className={`${btnPrimary} w-full`}
              >
                {t.btnNextContext}
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_QUESTIONS && (
          <div className="mx-auto max-w-2xl">
            <div className="space-y-8 rounded-lg border border-trait bg-white p-6 md:p-8">
              <div className="space-y-1.5">
                <h2 className="text-24 font-bold">{t.step2Title}</h2>
                <p className="text-15 text-encre/70">{t.step2Subtitle}</p>
              </div>

              {CONTEXT_QUESTIONS.map((q, qi) => (
                <div key={q.field} className="space-y-3">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 font-semibold">
                      <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-kraft text-13 font-bold">{qi + 1}</span>
                      {q.title}
                    </p>
                    <p className="ml-8 text-13 text-encre/70">{q.desc}</p>
                  </div>
                  <div className="grid gap-2">
                    {q.options.map(o => {
                      const selected = contextAnswers[q.field] === o.label;
                      return (
                        <button
                          key={o.label}
                          aria-pressed={selected}
                          onClick={() => setContextAnswers(prev => ({ ...prev, [q.field]: o.label }))}
                          className={`min-h-11 rounded-md border px-4 py-3 text-left transition-colors ${selected ? 'border-bleu-regle ring-1 ring-bleu-regle' : 'border-trait hover:border-encre/40'}`}
                        >
                          <span className={`block text-15 ${selected ? 'font-semibold text-bleu-regle' : 'font-medium'}`}>{o.label}</span>
                          <span className="block text-13 text-encre/70">{t.examplePrefix} {o.ex}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border-t border-trait pt-6">
                <button
                  disabled={loading || !contextAnswers.synchrone || !contextAnswers.donnees || !contextAnswers.processus}
                  onClick={handleAuditSubmit}
                  className="w-full rounded-md bg-bleu-regle py-4 font-semibold text-white transition-colors hover:bg-encre disabled:pointer-events-none disabled:opacity-30"
                >
                  {loading ? (
                    <span className="flex flex-col items-center gap-1.5">
                      <span className="flex items-center gap-3">
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span aria-live="polite">{loadingStep}</span>
                      </span>
                      <span className="text-13 font-medium opacity-70">{t.loadingWait}</span>
                    </span>
                  ) : t.btnLaunchAudit}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_RESULT && currentResult && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-34 font-bold tracking-tight">{t.reportTitle}</h2>
                <p className="mt-1 text-13 text-encre/70">{currentResult.date} · {currentResult.title}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
                <button onClick={demarrerReaudit} className={btnSecondary}>{t.btnReaudit}</button>
                <button onClick={exporterPdf} className={btnSecondary}>{t.btnExportPdf}</button>
                <button onClick={copyAsJson} className={btnSecondary}>{t.btnCopyJson}</button>
                <button onClick={() => setStep(AppStep.WELCOME)} className={btnPrimary}>{t.btnNewAudit}</button>
              </div>
            </div>
            <Rapport
              result={currentResult}
              parent={portfolio.find(item => item.id === currentResult.parentId)}
              onPriorisation={majPriorisation}
              onVoirMatrice={() => { setVueMatrice(true); setStep(AppStep.PORTFOLIO); }}
            />
          </div>
        )}

        {step === AppStep.PORTFOLIO && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-34 font-bold tracking-tight">{t.portfolio}</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setVueMatrice(v => !v)} className={btnSecondary} disabled={portfolio.length === 0}>
                  {vueMatrice ? t.btnVueListe : t.btnVueMatrice}
                </button>
                <button onClick={exporterJson} className={btnSecondary} disabled={portfolio.length === 0}>{t.btnExportJson}</button>
                <button onClick={() => fichierImportRef.current?.click()} className={btnSecondary}>{t.btnImportJson}</button>
                <input
                  ref={fichierImportRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={importerJson}
                  className="hidden"
                  aria-hidden
                  tabIndex={-1}
                />
              </div>
            </div>

            {portfolio.length === 0 ? (
              <div className="rounded-lg border border-dashed border-encre/30 py-20 text-center text-encre/70">
                <p className="font-medium">{t.portfolioEmpty}</p>
                <button
                  onClick={() => { setParentReaudit(null); setStep(AppStep.AUDIT_INPUT); setError(null); }}
                  className="mt-3 min-h-11 rounded-md px-3 font-medium text-bleu-regle hover:underline"
                >
                  {t.portfolioStart}
                </button>
              </div>
            ) : vueMatrice ? (
              <Matrice audits={portfolio} onOuvrir={ouvrirRapport} />
            ) : (
              <ul className="space-y-3">
                {portfolio.map(item => {
                  const parent = item.parentId ? portfolio.find(p => p.id === item.parentId) : undefined;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => ouvrirRapport(item)}
                        className="w-full rounded-lg border border-trait bg-white p-4 text-left shadow-sm transition-colors hover:border-bleu-regle md:px-5"
                      >
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          <div className="min-w-0 flex-1 basis-52">
                            <p className="truncate font-semibold">{item.title}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-13 text-encre/70">
                              {item.date}
                              {item.parentId && (
                                <span className="rounded-xs bg-kraft px-1.5 py-0.5 text-[11px] font-semibold text-encre">
                                  {t.badgeRevision} « {(parent?.title ?? '?').slice(0, 40)} »
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <MiniRegle score={item.score_robustesse} className="w-28 md:w-36" />
                            <span className="w-12 whitespace-nowrap text-right text-18 font-bold">
                              {item.score_robustesse}<span className="text-13 font-medium text-encre/70">/12</span>
                            </span>
                            <span className="flex w-32 items-center gap-1.5 whitespace-nowrap text-13 font-medium">
                              <span aria-hidden className="h-2 w-2 shrink-0 rounded-xs" style={{ background: STATUT_COLORS[item.statut] }} />
                              {item.statut}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {step === AppStep.QUICK_TEST && (
          <TestRapide onBack={() => setStep(AppStep.WELCOME)} />
        )}
      </main>

      <footer className="border-t border-trait print:hidden">
        <div className="mx-auto max-w-4xl px-4 py-6 text-13 text-encre/70">
          {t.footerBy}{' '}
          <a
            href={t.footerAuthorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-encre underline decoration-trait underline-offset-2 transition-colors hover:text-bleu-regle"
          >
            {t.footerAuthor}
          </a>
        </div>
      </footer>

      {/* Modal À propos / Confidentialité */}
      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-encre/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apropos-titre"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-trait bg-papier p-6 shadow-lg md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="apropos-titre" className="text-24 font-bold">{t.aboutTitle}</h3>
              <button
                onClick={() => setShowAbout(false)}
                aria-label={t.aboutBtnClose}
                className="-m-2 flex h-11 w-11 items-center justify-center rounded-md text-encre/70 hover:text-encre"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mt-4 space-y-4 text-15">
              <p className="font-serif">
                <strong className="font-sans font-semibold">{t.appTitle}</strong> {t.aboutP1}
              </p>

              <div className="space-y-2 rounded-md bg-kraft p-4">
                <h4 className="flex items-center gap-2 font-semibold">
                  <svg className="h-4 w-4 shrink-0 text-bleu-regle" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-.727-.061-1.44-.178-2.072z" /></svg>
                  {t.aboutPrivacyTitle}
                </h4>
                <ul className="ml-4 list-disc space-y-1">
                  <li>{t.aboutPrivacyDesc1}</li>
                  <li>{t.aboutPrivacyDesc2}</li>
                  <li>{t.aboutPrivacyDesc3}</li>
                </ul>
              </div>

              <p className="font-serif">
                {t.aboutP2}
              </p>
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className={`${btnPrimary} mt-6 w-full`}
            >
              {t.aboutBtnClose}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
