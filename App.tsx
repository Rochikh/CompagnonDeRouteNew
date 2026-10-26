
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, AuditResult, ContextAnswers, RapportTraduit } from './types';
import { auditConsigne, transcrireImage, traduireRapport } from './services/gemini';
import { MAX_CONSIGNE_CHARS } from './lib/limites';
import Rapport from './components/Rapport';
import TestRapide from './components/TestRapide';
import Matrice from './components/Matrice';
import { MiniRegle } from './components/RegleGraduee';
import { STATUT_COLORS } from './components/couleurs';
import { t, LOADING_MESSAGES } from './texts';

const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-btn px-6 py-3 text-[0.9rem] font-semibold transition-colors duration-[220ms] ease-cc';
const btnPrimary = `${btnBase} bg-bleu-regle text-white hover:bg-bleu-survol disabled:pointer-events-none disabled:opacity-45`;
const btnSecondary = `${btnBase} border-[1.5px] border-trait-fort bg-transparent hover:border-bleu-regle hover:text-bleu-regle disabled:pointer-events-none disabled:opacity-45`;
const carte = 'rounded-card border border-trait bg-white p-6 md:p-8';
const etiquette =
  'flex items-center gap-2.5 font-mono text-label font-medium uppercase tracking-label-wide text-bleu-regle';
const tiret = 'h-0.5 w-5 shrink-0 bg-rouge';

// Champs de l'en-tete de copie (signature du systeme) : cle en mono grise,
// valeur en bleu, filet Seyes sous chaque champ.
const EnteteCopie: React.FC<{ champs: Array<[string, string]> }> = ({ champs }) => (
  <div className="flex flex-wrap gap-x-9 gap-y-1.5 font-mono text-[0.72rem] tracking-[0.04em]">
    {champs.map(([cle, valeur]) => (
      <div key={cle} className="flex items-baseline gap-2 whitespace-nowrap border-b border-seyes pb-1">
        <span className="uppercase tracking-label text-gris-meta">{cle}</span>
        <span className="font-medium text-bleu-regle">{valeur}</span>
      </div>
    ))}
  </div>
);

// Les 3 questions de contexte, libelles et exemples dans texts.ts.
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

// Fusion d'un portefeuille importe : les entrees valides dont l'id n'existe pas
// encore sont ajoutees, les doublons sont ignores. Exportee pour la verification.
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
      // Ecarte les entrees au format v1 (plat), incompatibles avec le contrat v2.
      return saved ? JSON.parse(saved).filter((x: any) => x?.dimensions) : [];
    } catch { return []; }
  });

  // Etats UI
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState(t.analysisInterrupted);
  const loadingIntervalRef = useRef<number | null>(null);

  // Transcription d'image : appel en cours, puis bandeau de relecture jusqu'a la sortie de l'ecran.
  const [transcribing, setTranscribing] = useState(false);
  const [transcrit, setTranscrit] = useState(false);
  const fichierImageRef = useRef<HTMLInputElement | null>(null);

  const [showAbout, setShowAbout] = useState(false);

  // Re-audit en cours : id de l'audit d'origine, attache au prochain resultat.
  const [parentReaudit, setParentReaudit] = useState<string | null>(null);
  // Portefeuille : bascule liste / matrice impact-faisabilite.
  const [vueMatrice, setVueMatrice] = useState(false);
  const fichierImportRef = useRef<HTMLInputElement | null>(null);

  // Traduction du rapport affiche, pour la lecture seule : currentResult et le
  // portefeuille restent en francais.
  const [langue, setLangue] = useState('');
  const [traduction, setTraduction] = useState<RapportTraduit | null>(null);
  const [traduisant, setTraduisant] = useState(false);
  const [erreurTraduction, setErreurTraduction] = useState<string | null>(null);

  // Changement de rapport : retour a la version francaise.
  useEffect(() => {
    setTraduction(null);
    setErreurTraduction(null);
  }, [currentResult?.id]);

  const lancerTraduction = async () => {
    if (!currentResult || !langue.trim()) return;
    const { dimensions, score_robustesse, statut, stress_test, points_vigilance, recommandations } = currentResult;
    setTraduisant(true);
    setErreurTraduction(null);
    try {
      setTraduction(await traduireRapport(
        { dimensions, score_robustesse, statut, stress_test, points_vigilance, recommandations },
        langue
      ));
    } catch (err: any) {
      setErreurTraduction(err.message || t.traductionEchec);
    } finally {
      setTraduisant(false);
    }
  };

  // Synchronisation locale du portefeuille
  useEffect(() => {
    localStorage.setItem('compagnon_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // Fermeture de la fenetre A propos au clavier.
  useEffect(() => {
    if (!showAbout) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowAbout(false); };
    window.addEventListener('keydown', surTouche);
    return () => window.removeEventListener('keydown', surTouche);
  }, [showAbout]);

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

  useEffect(() => { setTranscrit(false); }, [step]);

  // Ajout du texte transcrit a la suite de la consigne, jamais en ecrasement.
  const ajouterTranscription = async (fichier: File) => {
    if (transcribing) return;
    setTranscribing(true);
    setError(null);
    try {
      const texte = (await transcrireImage(fichier)).trim();
      const base = consigne.trimEnd();
      const nouveau = base ? `${base}\n\n${texte}` : texte;
      if (nouveau.length > MAX_CONSIGNE_CHARS) throw new Error(t.transcriptionTropLongue);
      setConsigne(nouveau);
      setTranscrit(true);
    } catch (err: any) {
      setErrorTitle(t.transcriptionInterrompue);
      setError(err.message || t.transcriptionEchec);
    } finally {
      setTranscribing(false);
    }
  };

  const handleAuditSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setErrorTitle(t.analysisInterrupted);
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

  // Export PDF : les fiches sont depliees pour que le rapport s'imprime integral,
  // la mise en page A4 vit dans index.css (@page, @media print).
  const exporterPdf = () => {
    document.querySelectorAll('details').forEach(d => { d.open = true; });
    window.print();
  };

  // Re-audit : consigne et contexte pre-remplis, filiation memorisee.
  const demarrerReaudit = () => {
    if (!currentResult) return;
    setConsigne(currentResult.consigne);
    setContextAnswers(currentResult.contextAnswers);
    setParentReaudit(currentResult.id);
    setError(null);
    setStep(AppStep.AUDIT_INPUT);
  };

  // Curseurs impact/faisabilite : mise a jour du rapport courant et du portefeuille.
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
    <div className="relative flex min-h-screen flex-col">
      {/* Marge du correcteur : filet rouge vertical, visible sur grand ecran */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[1.5px] bg-rouge/[0.38] print:hidden"
        style={{ left: 'max(calc(50vw - 560px), -10px)' }}
      />

      <header className="sticky top-0 z-40 border-b border-trait bg-papier/[0.92] backdrop-blur-[16px] print:hidden">
        <div className="mx-auto flex h-[60px] max-w-4xl items-center justify-between px-4">
          <button
            onClick={() => { setStep(AppStep.WELCOME); setError(null); }}
            className="flex min-h-11 items-center font-display text-[0.98rem] font-bold tracking-[-0.01em]"
          >
            {t.appTitle}
            <span aria-hidden className="ml-1 mb-0.5 inline-block h-1.5 w-1.5 rounded-[1px] bg-rouge align-middle" />
          </button>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setShowAbout(true)}
              title={t.about}
              aria-label={t.about}
              className="flex h-11 w-11 items-center justify-center rounded-btn text-gris transition-colors duration-[220ms] ease-cc hover:text-bleu-regle"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button
              onClick={() => { setStep(AppStep.PORTFOLIO); setError(null); }}
              className={`min-h-11 rounded-btn px-3 text-[0.82rem] transition-colors duration-[220ms] ease-cc ${
                step === AppStep.PORTFOLIO
                  ? 'font-semibold text-encre underline decoration-rouge decoration-2 underline-offset-[6px]'
                  : 'font-medium text-gris hover:text-bleu-regle'
              }`}
            >
              {t.portfolio} ({portfolio.length})
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 md:py-14">
        {error && (
          <div role="alert" className="mb-6 rounded-card border border-trait-fort border-l-[3px] border-l-rouge bg-white p-5">
            <h3 className="font-semibold">{errorTitle}</h3>
            <p className="mt-1 text-15 text-gris">{error}</p>
          </div>
        )}

        {step === AppStep.WELCOME && (
          <div className="space-y-11">
            <div className="max-w-2xl space-y-6">
              <EnteteCopie champs={[['Outil', t.appTitle], ['Appui', 'Chronique\u00A0Sociale,\u00A02026']]} />
              <h2 className="font-display text-34 font-extrabold tracking-titre md:text-48">
                {t.heroTitle1} {t.heroTitle2}{' '}
                <em className="souligne-rouge not-italic">{t.heroTitle3}</em>
              </h2>
              <p className="max-w-xl text-[1.03rem] leading-[1.75] text-gris">
                {t.heroSubtitle}
              </p>
            </div>

            <div className="grid gap-3.5 md:grid-cols-2">
              {([
                [t.btnAuditTitle, t.btnAuditDesc, 'Audit', () => { setParentReaudit(null); setStep(AppStep.AUDIT_INPUT); setError(null); }],
                [t.btnQuickTitle, t.btnQuickDesc, 'Diagnostic', () => setStep(AppStep.QUICK_TEST)],
              ] as const).map(([titre, desc, label, action]) => (
                <button
                  key={titre}
                  onClick={action}
                  className="flex flex-col gap-3 rounded-card border border-trait bg-white p-6 text-left transition-[color,border-color,transform,box-shadow] duration-[220ms] ease-cc hover:-translate-y-[3px] hover:border-bleu-regle hover:shadow-hover"
                >
                  <span className={etiquette}>
                    <span aria-hidden className={tiret} />
                    {label}
                  </span>
                  <span className="font-display text-24 font-bold tracking-[-0.01em]">{titre}</span>
                  <span className="text-15 text-gris">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_INPUT && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="space-y-2.5">
              <p className={etiquette}>
                <span aria-hidden className={tiret} />
                Étape 1 sur 2
              </p>
              <h2 className="font-display text-34 font-extrabold tracking-section">{t.step1Title.replace('1. ', '')}</h2>
            </div>
            <div className={`space-y-4.5 ${carte}`}>
              <textarea
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                onPaste={(e) => {
                  const fichier = e.clipboardData.files[0];
                  if (fichier?.type.startsWith('image/')) { e.preventDefault(); ajouterTranscription(fichier); }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fichier = e.dataTransfer.files[0];
                  if (fichier) ajouterTranscription(fichier);
                }}
                disabled={transcribing}
                placeholder={t.step1Placeholder}
                className="h-56 w-full resize-y rounded-card border-[1.5px] border-trait-fort bg-white p-4 text-15 transition-colors duration-[220ms] ease-cc focus:border-bleu-regle focus:outline-none disabled:opacity-60"
              />
              <p className="text-desc text-gris">{t.consigneConfidentialite}</p>
              <div className="space-y-2.5 rounded-card border border-dashed border-trait-fort p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fichierImageRef.current?.click()}
                    disabled={transcribing}
                    className={btnSecondary}
                  >
                    {t.btnTranscrireImage}
                  </button>
                  <input
                    ref={fichierImageRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const fichier = e.target.files?.[0];
                      e.target.value = '';
                      if (fichier) ajouterTranscription(fichier);
                    }}
                    className="hidden"
                    aria-hidden
                    tabIndex={-1}
                  />
                  <p className="min-w-[200px] flex-1 text-desc text-gris">{t.imageAide}</p>
                </div>
                <p className="text-desc text-gris">{t.imageConfidentialite}</p>
                <p role="status" aria-live="polite" className="text-desc font-medium">
                  {transcribing ? t.transcriptionEnCours : transcrit ? t.transcriptionFaite : ''}
                </p>
              </div>
              <button
                disabled={!consigne.trim() || transcribing}
                onClick={() => setStep(AppStep.AUDIT_QUESTIONS)}
                className={`${btnPrimary} w-full`}
              >
                {t.btnNextContext} →
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_QUESTIONS && (
          <div className="mx-auto max-w-2xl space-y-5">
            <div className="space-y-2.5">
              <p className={etiquette}>
                <span aria-hidden className={tiret} />
                Étape 2 sur 2
              </p>
              <h2 className="font-display text-34 font-extrabold tracking-section">{t.step2Title.replace('2. ', '')}</h2>
              <p className="max-w-prose text-15 text-gris">{t.step2Subtitle}</p>
            </div>
            <div className={`space-y-7 ${carte}`}>
              {CONTEXT_QUESTIONS.map((q, qi) => (
                <div key={q.field} className="flex items-baseline gap-3.5">
                  <span aria-hidden className="min-w-6 font-mono text-[0.72rem] font-medium text-bleu-regle/65">
                    {String(qi + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-15 font-semibold">{q.title}</p>
                      <p className="mt-0.5 text-desc text-gris">{q.desc}</p>
                    </div>
                    <div className="grid gap-2">
                      {q.options.map(o => {
                        const selected = contextAnswers[q.field] === o.label;
                        return (
                          <button
                            key={o.label}
                            aria-pressed={selected}
                            onClick={() => setContextAnswers(prev => ({ ...prev, [q.field]: o.label }))}
                            className={`min-h-11 rounded-btn border px-4 py-3 text-left transition-colors duration-[220ms] ease-cc ${
                              selected ? 'border-bleu-regle bg-bleu-clair' : 'border-trait-fort bg-white hover:border-bleu-regle'
                            }`}
                          >
                            <span className={`block text-15 ${selected ? 'font-semibold text-bleu-regle' : 'font-medium'}`}>{o.label}</span>
                            <span className="block text-[0.82rem] leading-[1.5] text-gris">{t.examplePrefix} {o.ex}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <div className="space-y-2.5 border-t border-dashed border-trait-fort pt-6">
                <button
                  disabled={loading || !contextAnswers.synchrone || !contextAnswers.donnees || !contextAnswers.processus}
                  onClick={handleAuditSubmit}
                  className={`${btnPrimary} w-full`}
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span aria-live="polite">{loadingStep}</span>
                    </span>
                  ) : `${t.btnLaunchAudit} →`}
                </button>
                {loading && (
                  <p className="text-center font-mono text-[0.72rem] text-gris-meta">{t.loadingWait}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_RESULT && currentResult && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 space-y-4">
                <EnteteCopie
                  champs={[
                    ['Date', currentResult.date],
                    ['Score', `${currentResult.score_robustesse}\u00A0/\u00A012`],
                    ['Statut', (traduction?.statut_affiche ?? currentResult.statut).replace(' ', '\u00A0')],
                  ]}
                />
                <h2 className="font-display text-34 font-extrabold tracking-section">{t.reportTitle}</h2>
                <p className="max-w-[520px] text-15 text-gris">«&nbsp;{currentResult.title}&nbsp;»</p>
              </div>
              <div className="flex flex-wrap gap-2 whitespace-nowrap print:hidden">
                <button onClick={demarrerReaudit} className={btnSecondary}>{t.btnReaudit}</button>
                <button onClick={exporterPdf} className={btnSecondary} disabled={!!traduction}>{t.btnExportPdf}</button>
                <button onClick={copyAsJson} className={btnSecondary}>{t.btnCopyJson}</button>
                <button onClick={() => setStep(AppStep.WELCOME)} className={btnPrimary}>{t.btnNewAudit}</button>
              </div>
            </div>
            <Rapport
              result={traduction ? { ...currentResult, ...traduction.rapport } : currentResult}
              libelles={traduction?.libelles}
              statutAffiche={traduction?.statut_affiche}
              pilotageAffiche={traduction?.pilotage_affiche}
              parent={portfolio.find(item => item.id === currentResult.parentId)}
              onPriorisation={majPriorisation}
              onVoirMatrice={() => { setVueMatrice(true); setStep(AppStep.PORTFOLIO); }}
            />

            {/* Traduction pour la lecture, sous le rapport */}
            <section className="space-y-3 rounded-card border border-trait bg-white p-6 md:p-8 print:hidden">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                  <span className="font-mono text-[0.68rem] font-medium uppercase tracking-label text-gris-meta">{t.traductionLangue}</span>
                  <input
                    type="text"
                    value={langue}
                    onChange={(e) => setLangue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') lancerTraduction(); }}
                    maxLength={50}
                    placeholder={t.traductionPlaceholder}
                    disabled={traduisant}
                    className="min-h-11 w-full rounded-btn border-[1.5px] border-trait-fort bg-white px-4 text-15 transition-colors duration-[220ms] ease-cc focus:border-bleu-regle focus:outline-none disabled:opacity-60"
                  />
                </label>
                <button onClick={lancerTraduction} disabled={traduisant || !langue.trim()} className={btnPrimary}>
                  {traduisant ? t.traductionEnCours : t.btnTraduire}
                </button>
                {traduction && (
                  <button onClick={() => setTraduction(null)} disabled={traduisant} className={btnSecondary}>
                    {t.btnRevenirFrancais}
                  </button>
                )}
              </div>
              <p className="text-desc text-gris">{t.traductionAide}</p>
              {erreurTraduction && <p role="alert" className="text-desc text-rouge">{erreurTraduction}</p>}
            </section>
          </div>
        )}

        {step === AppStep.PORTFOLIO && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2.5">
                <p className={etiquette}>
                  <span aria-hidden className={tiret} />
                  {t.portfolio}
                </p>
                <h2 className="font-display text-34 font-extrabold tracking-section">{t.portfolio}</h2>
              </div>
              <div className="flex flex-wrap gap-2 whitespace-nowrap">
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
              <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-trait-fort py-20 text-center">
                <p className="text-15 text-gris">{t.portfolioEmpty}</p>
                <button
                  onClick={() => { setParentReaudit(null); setStep(AppStep.AUDIT_INPUT); setError(null); }}
                  className={btnPrimary}
                >
                  {t.portfolioStart} →
                </button>
              </div>
            ) : vueMatrice ? (
              <Matrice audits={portfolio} onOuvrir={ouvrirRapport} />
            ) : (
              <ul className="space-y-2.5">
                {portfolio.map(item => {
                  const parent = item.parentId ? portfolio.find(p => p.id === item.parentId) : undefined;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => ouvrirRapport(item)}
                        className="w-full rounded-card border border-trait bg-white p-4 text-left transition-[color,border-color,transform] duration-[220ms] ease-cc hover:translate-x-1 hover:border-bleu-regle md:px-5"
                      >
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
                          <div className="min-w-0 flex-1 basis-56 space-y-1">
                            <p className="truncate text-15 font-semibold">{item.title}</p>
                            <p className="flex flex-wrap items-center gap-2.5 font-mono text-[0.7rem] tracking-[0.04em] text-gris-meta">
                              {item.date}
                              {item.parentId && (
                                <span
                                  className="rounded-xs border border-trait bg-bande px-1.5 py-0.5 font-medium uppercase tracking-[0.06em]"
                                  title={`${t.badgeRevision} « ${(parent?.title ?? '?').slice(0, 40)} »`}
                                >
                                  {t.badgeRevision.replace(' de', '')}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <MiniRegle score={item.score_robustesse} className="w-24 md:w-36" />
                            <span className="w-13 whitespace-nowrap text-right font-mono text-[1rem] font-semibold text-bleu-regle">
                              {item.score_robustesse}<span className="text-label font-normal text-gris-meta">/12</span>
                            </span>
                            <span className="flex w-34 items-center gap-2 whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-[0.08em] text-gris">
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

      <footer className="border-t border-trait bg-bande print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-meta text-gris-meta">
          <div>{t.footerBy} {t.footerAuthor}</div>
          <nav aria-label="Pied de page" className="flex flex-wrap gap-5">
            <a
              href={t.footerAuthorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gris-meta transition-colors duration-[220ms] ease-cc hover:text-bleu-regle"
            >
              rochane.fr ↗
            </a>
          </nav>
        </div>
      </footer>

      {/* Fenetre A propos / Confidentialite */}
      {showAbout && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-encre/50 p-4 pb-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apropos-titre"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="m-auto max-h-[calc(100dvh-3rem)] w-full max-w-lg space-y-5 overflow-y-auto rounded-card border border-trait-fort bg-papier p-6 shadow-float md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2.5">
                <p className={etiquette}>
                  <span aria-hidden className={tiret} />
                  {t.aboutTitle}
                </p>
                <h3 id="apropos-titre" className="font-display text-24 font-bold tracking-[-0.01em]">{t.appTitle}</h3>
              </div>
              <button
                onClick={() => setShowAbout(false)}
                aria-label={t.aboutBtnClose}
                className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-gris transition-colors duration-[220ms] ease-cc hover:text-bleu-regle"
              >
                <svg className="h-5.5 w-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <p className="text-15 leading-[1.7]">
              <strong className="font-semibold">{t.appTitle}</strong> {t.aboutP1}
            </p>

            <div className="space-y-2.5 rounded-card border border-trait bg-bande p-4 md:p-5">
              <h4 className="font-mono text-label font-medium uppercase tracking-label text-bleu-regle">
                {t.aboutPrivacyTitle}
              </h4>
              <ul className="text-desc">
                {[t.aboutPrivacyDesc1, t.aboutPrivacyDesc2, t.aboutPrivacyDesc3, t.aboutPrivacyDesc4].map((ligne, i, tab) => (
                  <li key={i} className={i < tab.length - 1 ? 'border-b border-trait py-1.5' : 'py-1.5'}>{ligne}</li>
                ))}
              </ul>
            </div>

            <p className="text-desc text-gris">
              {t.aboutP2}
            </p>

            <button
              onClick={() => setShowAbout(false)}
              className={`${btnPrimary} w-full`}
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
