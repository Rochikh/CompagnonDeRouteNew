
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, AuditResult, VulnerabilityStatus } from './types';
import { auditConsigne } from './services/gemini';
import { FICHES } from './constants';
import RadarChart from './components/RadarChart';

const QUICK_QUESTIONS = [
  "Cette évaluation repose-t-elle sur une production écrite réalisée hors surveillance ?",
  "La consigne pourrait-elle être copiée telle quelle dans un assistant IA pour obtenir un résultat recevable ?",
  "L'évaluation mobilise-t-elle des données génériques accessibles en ligne (plutôt que locales/personnelles) ?",
  "Le produit final est-il le seul objet évalué, sans trace du processus de production ?",
  "L'évaluation se déroule-t-elle entièrement en mode asynchrone, sans interaction temps réel ?",
  "Les critères d'évaluation portant-ils exclusivement sur le contenu (sans dimension réflexive) ?",
  "Un apprenant pourrait-il obtenir une note satisfaisante sans pouvoir expliquer oralement ses choix ?",
  "Vos collègues utilisent-ils des consignes identiques ou très similaires d'une session à l'autre ?"
];

const LOADING_MESSAGES = [
  "Analyse de la structure sémantique...",
  "Évaluation du potentiel de reproduction par l'IA...",
  "Calcul du degré de contextualisation requis...",
  "Identification des dimensions tacites et réflexives...",
  "Vérification des leviers de multimodalité...",
  "Consultation de la base de remédiation (Fiches 1-8)...",
  "Génération des recommandations stratégiques...",
  "Finalisation du diagnostic de robustesse...",
  "L'IA peaufine ses conseils pédagogiques...",
  "Encore quelques secondes, le rapport arrive !"
];

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [consigne, setConsigne] = useState('');
  const [contextAnswers, setContextAnswers] = useState({
    synchrone: '',
    donnees: '',
    processus: ''
  });
  const [currentResult, setCurrentResult] = useState<AuditResult | null>(null);
  
  // State pour le Quick Test
  const [quickAnswers, setQuickAnswers] = useState<Record<number, number>>({});

  // Gestion du Portefeuille
  const [portfolio, setPortfolio] = useState<AuditResult[]>(() => {
    try {
      const saved = localStorage.getItem('compagnon_portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // États UI
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadingIntervalRef = useRef<number | null>(null);

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
      // L'API Key est gérée directement dans le service gemini
      const data = await auditConsigne(consigne, contextAnswers);
      
      const result: AuditResult = {
        id: Math.random().toString(36).substr(2, 9),
        title: consigne.trim().substring(0, 50) + (consigne.length > 50 ? '...' : ''),
        consigne,
        contextAnswers,
        reproductibilite: data.reproductibilite ?? 0,
        contextualisation: data.contextualisation ?? 0,
        tacitite: data.tacitite ?? 0,
        multimodalite: data.multimodalite ?? 0,
        score_total: data.score_total ?? 0,
        statut: (data.statut as VulnerabilityStatus) || VulnerabilityStatus.MODEREE,
        points_vigilance: data.points_vigilance ?? [],
        recommandations: data.recommandations ?? [],
        justifications: data.justifications || {},
        date: new Date().toLocaleDateString('fr-FR')
      };

      setCurrentResult(result);
      setPortfolio(prev => [result, ...prev]);
      setStep(AppStep.AUDIT_RESULT);
    } catch (err: any) {
      console.error("Audit fail:", err);
      setError(err.message || "L'analyse a pris trop de temps ou a échoué. Veuillez réessayer.");
    } finally {
      setLoading(false);
      stopLoadingMessages();
    }
  };

  const copyAsJson = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(JSON.stringify(currentResult, null, 2));
    alert("Copié dans le presse-papier !");
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes('robuste')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('modérée')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s.includes('élevée')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s.includes('critique')) return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  const getProgressColor = (score: number) => {
    if (score >= 10) return 'bg-emerald-500';
    if (score >= 7) return 'bg-amber-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const getQuickTestResult = () => {
    const values = Object.values(quickAnswers) as number[];
    // Calcul inversé : on part de 16 (robustesse max théorique ici) et on enlève les points de vulnérabilité
    // Chaque réponse "Oui" (2 pts) ou "Partiellement" (1 pt) dans le questionnaire actuel mesure la VULNÉRABILITÉ.
    // Donc Score Robustesse = Max - Score Vulnérabilité
    const vulnerabilityScore = values.reduce((acc: number, val: number) => acc + val, 0);
    const maxVulnerability = 16; // 8 questions * 2 pts
    
    // On convertit en score de robustesse sur 12 pour s'aligner avec l'audit IA
    // Produit en croix : (16 - vulnerabilityScore) / 16 * 12
    const robustnessScore = Math.round(((maxVulnerability - vulnerabilityScore) / maxVulnerability) * 12);
    
    const answered = Object.keys(quickAnswers).length;
    let status = "";
    let colorClass = "";
    let advice = "";

    // Échelle alignée sur l'audit IA (0-12)
    if (robustnessScore >= 10) {
      status = "Robustesse ÉLEVÉE";
      colorClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
      advice = "Votre évaluation semble solide. Les Fiches 5 et 6 permettent d'affiner.";
    } else if (robustnessScore >= 5) {
      status = "Vulnérabilité MODÉRÉE";
      colorClass = "bg-amber-100 text-amber-800 border-amber-200";
      advice = "Consultez les Fiches 1 à 4 pour des adaptations ciblées.";
    } else {
      status = "Vulnérabilité CRITIQUE";
      colorClass = "bg-rose-100 text-rose-800 border-rose-200";
      advice = "Reprendre le protocole complet du chapitre. Consigne très exposée.";
    }
    
    return { score: robustnessScore, status, colorClass, advice, answered };
  };

  return (
    <div className="min-h-screen pb-20 relative">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setStep(AppStep.WELCOME); setError(null); }}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">C</div>
            <h1 className="font-bold text-slate-800 tracking-tight">Compagnon de route</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setStep(AppStep.PORTFOLIO); setError(null); }}
              className={`text-sm font-medium transition-colors ${step === AppStep.PORTFOLIO ? 'text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
            >
              Portefeuille ({portfolio.length})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="font-bold">Analyse interrompue</h3>
              </div>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">{error}</p>
          </div>
        )}

        {step === AppStep.WELCOME && (
          <div className="space-y-12 py-12 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Mesurez la robustesse <br className="hidden md:block"/>
                de vos évaluations <br className="hidden md:block"/>
                <span className="text-indigo-600">à l'ère de l'IA générative</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Basé sur le protocole d'audit développé dans <strong>"Évaluer en formation à l'ère de l'IA générative"</strong> (Rochane Kherbouche, 2026).
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button onClick={() => { setStep(AppStep.AUDIT_INPUT); setError(null); }} className="p-8 bg-white border border-slate-200 rounded-3xl text-left hover:border-indigo-600 transition-all group shadow-sm hover:shadow-xl active:scale-[0.99]">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Audit détaillé</h3>
                <p className="text-slate-500 leading-relaxed">Analysez une consigne précise sur 4 dimensions critiques avec l'IA.</p>
              </button>
              <button onClick={() => setStep(AppStep.QUICK_TEST)} className="p-8 bg-white border border-slate-200 rounded-3xl text-left hover:border-indigo-600 transition-all group shadow-sm hover:shadow-xl active:scale-[0.99]">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Diagnostic rapide</h3>
                <p className="text-slate-500 leading-relaxed">8 questions pour évaluer votre profil de vulnérabilité sans IA.</p>
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_INPUT && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">1. Saisie de la consigne</h2>
              <textarea 
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                placeholder="Ex: 'Rédigez un rapport de 5 pages sur l'impact de la RSE...'"
                className="w-full h-56 p-5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-slate-700 leading-relaxed"
              />
              <button 
                disabled={!consigne.trim()} 
                onClick={() => setStep(AppStep.AUDIT_QUESTIONS)} 
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                Suivant : Définir le contexte
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_QUESTIONS && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">2. Contexte de passage</h2>
                <p className="text-sm text-slate-500 leading-relaxed">Précisez les conditions réelles de l'examen pour affiner le diagnostic.</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                    Composante orale ou synchrone ?
                  </p>
                  <p className="text-xs text-slate-500 italic ml-8">L'apprenant·e doit-il/elle s'exprimer de vive voix ou en direct ?</p>
                </div>
                <div className="grid gap-2">
                  {[
                    { label: 'Oui obligatoire', ex: 'Soutenance devant jury, examen oral en classe.' },
                    { label: 'Oui optionnelle', ex: 'Participation orale possible mais non notée.' },
                    { label: 'Non, asynchrone', ex: 'Dépôt d\'un document PDF ou fichier à distance.' }
                  ].map(o => (
                    <button key={o.label} onClick={() => setContextAnswers(prev => ({...prev, synchrone: o.label}))} className={`text-left px-5 py-3 rounded-2xl border transition-all ${contextAnswers.synchrone === o.label ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <span className="block text-sm">{o.label}</span>
                      <span className="block text-[10px] font-normal opacity-60">Exemple : {o.ex}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                    Nature des données ?
                  </p>
                  <p className="text-xs text-slate-500 italic ml-8">Le sujet est-il généraliste ou ancré dans un vécu unique ?</p>
                </div>
                <div className="grid gap-2">
                  {[
                    { label: 'Données locales / confidentielles', ex: 'Problématique interne à une PME précise, vécu personnel.' },
                    { label: 'Partiellement spécifiques', ex: 'Étude d\'un secteur d\'activité mais sans entreprise précise.' },
                    { label: 'Données génériques', ex: 'Sujet théorique (ex: "Le rôle de l\'IA en RH"), trouvable sur le web.' }
                  ].map(o => (
                    <button key={o.label} onClick={() => setContextAnswers(prev => ({...prev, donnees: o.label}))} className={`text-left px-5 py-3 rounded-2xl border transition-all ${contextAnswers.donnees === o.label ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <span className="block text-sm">{o.label}</span>
                      <span className="block text-[10px] font-normal opacity-60">Exemple : {o.ex}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">3</span>
                    Évaluation du processus ?
                  </p>
                  <p className="text-xs text-slate-500 italic ml-8">Notez-vous uniquement le résultat final ou les étapes de création ?</p>
                </div>
                <div className="grid gap-2">
                  {[
                    { label: 'Processus documenté et évalué', ex: 'Journal de bord requis, étapes notées au fil de l\'eau.' },
                    { label: 'Demandé mais non évalué', ex: 'Brouillons demandés mais seule la note finale compte.' },
                    { label: 'Seul le produit final', ex: 'Seul le rapport final est rendu et noté.' }
                  ].map(o => (
                    <button key={o.label} onClick={() => setContextAnswers(prev => ({...prev, processus: o.label}))} className={`text-left px-5 py-3 rounded-2xl border transition-all ${contextAnswers.processus === o.label ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <span className="block text-sm">{o.label}</span>
                      <span className="block text-[10px] font-normal opacity-60">Exemple : {o.ex}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <button 
                  disabled={loading || !contextAnswers.synchrone || !contextAnswers.donnees || !contextAnswers.processus} 
                  onClick={handleAuditSubmit} 
                  className={`w-full font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-xl ${
                    loading ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } disabled:opacity-30`}
                >
                  {loading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span className="animate-pulse">{loadingStep}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest opacity-60 font-bold">L'analyse IA peut prendre jusqu'à 15 secondes</span>
                    </div>
                  ) : "Lancer l'audit de robustesse"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_RESULT && currentResult && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rapport de Robustesse</h2>
                <p className="text-slate-500 text-sm">{currentResult.date} — {currentResult.title}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={copyAsJson} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all">Copier JSON</button>
                <button onClick={() => setStep(AppStep.WELCOME)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Nouveau diagnostic</button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                <RadarChart scores={{
                  reproductibilite: currentResult.reproductibilite,
                  contextualisation: currentResult.contextualisation,
                  tacitite: currentResult.tacitite,
                  multimodalite: currentResult.multimodalite
                }} />
                
                <div className="mt-8 w-full max-w-xs space-y-3 text-center">
                    <h4 className="text-slate-400 font-bold text-xs uppercase tracking-widest">Score de Robustesse</h4>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-6xl font-black text-slate-900">{currentResult.score_total}</span>
                        <span className="text-2xl text-slate-300 font-bold">/12</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ${getProgressColor(currentResult.score_total)}`} style={{ width: `${(currentResult.score_total / 12) * 100}%` }}></div>
                    </div>
                    <div className={`mt-4 px-4 py-2 rounded-xl text-sm font-bold border inline-block ${getStatusColor(currentResult.statut)}`}>
                        {currentResult.statut}
                    </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="font-bold text-lg text-slate-800 border-b border-slate-50 pb-4">Points de vigilance</h3>
                <div className="space-y-3">
                  {currentResult.points_vigilance.map((v, i) => (
                    <div key={i} className="flex gap-3 text-sm text-slate-600 leading-relaxed group">
                      <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">!</span>
                      <p>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-8">
              <h3 className="text-2xl font-black tracking-tight">Recommandations stratégiques</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {currentResult.recommandations.map((rec, i) => {
                  const fiche = FICHES[rec.fiche];
                  return (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all group">
                      <p className="font-medium text-slate-200 leading-relaxed mb-4">{rec.action}</p>
                      {fiche && (
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{fiche.name}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === AppStep.PORTFOLIO && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900">Portefeuille</h2>
            </div>
            {portfolio.length === 0 ? (
               <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                  <p className="font-medium">Votre portefeuille est vide.</p>
                  <button onClick={() => setStep(AppStep.WELCOME)} className="mt-4 text-indigo-600 font-bold hover:underline">Analyser une première consigne</button>
               </div>
            ) : (
              <div className="grid gap-4">
                {portfolio.map(item => (
                  <div key={item.id} onClick={() => { setCurrentResult(item); setStep(AppStep.AUDIT_RESULT); }} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-600 transition-all cursor-pointer flex justify-between items-center group shadow-sm hover:shadow-md">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <span className="font-black text-slate-900 text-2xl">{item.score_total}</span>
                      <span className="text-slate-300 text-xs font-bold ml-0.5">/12</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === AppStep.QUICK_TEST && (
           <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
              <div className="text-center mb-10">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wide">3 minutes chrono</span>
                <h2 className="text-3xl font-black text-slate-900 mt-4 mb-2">Diagnostic Rapide</h2>
                <p className="text-slate-600 max-w-lg mx-auto">Répondez aux 8 questions suivantes. Plus votre score sur 12 est élevé, plus votre évaluation est robuste face à l'IA.</p>
              </div>

              <div className="space-y-6">
                {QUICK_QUESTIONS.map((q, idx) => (
                  <div key={idx} className="pb-6 border-b border-slate-100 last:border-0 animate-in fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                    <p className="font-medium text-slate-800 mb-3">{q}</p>
                    <div className="flex gap-2">
                      {[
                        { val: 2, label: 'Oui (+2)' },
                        { val: 1, label: 'Partiellement (+1)' },
                        { val: 0, label: 'Non (0)' }
                      ].map(opt => (
                        <button key={opt.val} onClick={() => setQuickAnswers(prev => ({...prev, [idx]: opt.val}))} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${quickAnswers[idx] === opt.val ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {getQuickTestResult().answered > 0 && (
                <div className={`sticky bottom-6 mx-auto max-w-xl p-6 rounded-2xl shadow-2xl border-2 backdrop-blur-md animate-in slide-in-from-bottom-10 ${getQuickTestResult().colorClass}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-black uppercase tracking-widest opacity-70">Score de Robustesse (Estimé)</div>
                        <div className="text-xs font-bold opacity-60">{getQuickTestResult().answered}/8 répondue(s)</div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-baseline">
                            <span className="text-5xl font-black">{getQuickTestResult().score}</span>
                            <span className="text-xl font-bold opacity-50 ml-1">/12</span>
                        </div>
                        <div>
                            <div className="font-bold text-lg leading-tight">{getQuickTestResult().status}</div>
                            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">Indice de confiance</div>
                        </div>
                    </div>
                    <p className="font-medium text-sm leading-relaxed border-t border-current border-opacity-20 pt-3 opacity-90">
                        {getQuickTestResult().advice}
                    </p>
                </div>
            )}
            
            <div className="text-center pt-8">
               <button onClick={() => { setStep(AppStep.WELCOME); setQuickAnswers({}); }} className="text-indigo-600 font-bold hover:underline">Retour à l'accueil</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
