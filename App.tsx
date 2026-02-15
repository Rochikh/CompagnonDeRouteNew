
import React, { useState, useEffect } from 'react';
import { AppStep, AuditResult, VulnerabilityStatus } from './types';
import { auditConsigne } from './services/gemini';
import { FICHES } from './constants';
import RadarChart from './components/RadarChart';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [consigne, setConsigne] = useState('');
  const [contextAnswers, setContextAnswers] = useState({
    synchrone: '',
    donnees: '',
    processus: ''
  });
  const [currentResult, setCurrentResult] = useState<AuditResult | null>(null);
  
  // Gestion du Portefeuille
  const [portfolio, setPortfolio] = useState<AuditResult[]>(() => {
    try {
      const saved = localStorage.getItem('compagnon_portfolio');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Gestion de la Clé API
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [isKeyConfigured, setIsKeyConfigured] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');

  // États UI
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialisation : Vérifier si une clé existe (Env ou LocalStorage)
  useEffect(() => {
    // 1. Vérifier variable d'env (Build time)
    if (process.env.API_KEY) {
      setIsKeyConfigured(true);
      return;
    }
    // 2. Vérifier LocalStorage (Client side)
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setUserApiKey(storedKey);
      setIsKeyConfigured(true);
    } else {
      setIsKeyConfigured(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('compagnon_portfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  const handleSaveKey = () => {
    if (tempKeyInput.trim().length > 10) {
      localStorage.setItem('gemini_api_key', tempKeyInput.trim());
      setUserApiKey(tempKeyInput.trim());
      setIsKeyConfigured(true);
      setShowKeyModal(false);
      setError(null);
    } else {
      alert("La clé semble invalide (trop courte).");
    }
  };

  const handleRemoveKey = () => {
    if(confirm("Voulez-vous supprimer la clé API enregistrée ?")) {
        localStorage.removeItem('gemini_api_key');
        setUserApiKey('');
        setIsKeyConfigured(false);
        setTempKeyInput('');
    }
  };

  const handleAuditSubmit = async () => {
    if (loading) return;
    
    // Vérification ultime avant lancement
    if (!isKeyConfigured) {
        setError("Clé API requise. Veuillez cliquer sur 'Activer l'accès IA' en haut à droite.");
        setShowKeyModal(true);
        return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep('Initialisation de l\'analyse...');
    
    try {
      setLoadingStep('Analyse doctrinale en cours (IA)...');
      // On passe la clé utilisateur explicitement
      const data = await auditConsigne(consigne, contextAnswers, userApiKey);
      
      setLoadingStep('Génération des recommandations...');
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
      setError(err.message || "Erreur inconnue lors de l'analyse.");
      if (err.message?.includes("Clé API")) {
        setShowKeyModal(true); // Réouvrir la modale si la clé est rejetée
      }
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const copyAsJson = () => {
    if (!currentResult) return;
    navigator.clipboard.writeText(JSON.stringify(currentResult, null, 2));
    alert("Copié !");
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes('robuste')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('modérée')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (s.includes('élevée')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s.includes('critique')) return 'bg-rose-100 text-rose-800 border-rose-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* MODAL CONFIGURATION CLE API */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-slate-900">Configuration API Gemini</h3>
                    <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="text-sm text-slate-600">
                    <p className="mb-2">Pour fonctionner, cette application nécessite une clé API Google Gemini valide.</p>
                    <p>Vous pouvez en obtenir une gratuitement sur <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a>.</p>
                </div>
                <div>
                    <input 
                        type="password" 
                        value={tempKeyInput}
                        onChange={(e) => setTempKeyInput(e.target.value)}
                        placeholder="Collez votre clé API ici (ex: AIzaSy...)"
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800"
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowKeyModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Annuler</button>
                    <button onClick={handleSaveKey} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100">Enregistrer la clé</button>
                </div>
            </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setStep(AppStep.WELCOME); setError(null); }}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">C</div>
            <h1 className="font-bold text-slate-800 tracking-tight">Compagnon de route</h1>
          </div>
          <div className="flex items-center gap-4">
            {!isKeyConfigured ? (
              <button 
                onClick={() => setShowKeyModal(true)}
                className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full border border-amber-200 hover:bg-amber-200 transition-colors flex items-center gap-2 animate-pulse"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Activer l'accès IA
              </button>
            ) : (
                <button 
                onClick={handleRemoveKey}
                title="Clé configurée (cliquer pour supprimer)"
                className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-200 transition-all flex items-center gap-2 group"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:bg-rose-500"></span>
                <span className="group-hover:hidden">IA Active</span>
                <span className="hidden group-hover:inline">Déconnecter</span>
              </button>
            )}
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
                <h3 className="font-bold">Problème d'analyse</h3>
              </div>
              <button onClick={() => setError(null)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">{error}</p>
            {(error.includes('Clé') || error.includes('API')) && (
              <button onClick={() => setShowKeyModal(true)} className="mt-4 w-full bg-rose-200 hover:bg-rose-300 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">
                Configurer la clé API maintenant
              </button>
            )}
          </div>
        )}

        {step === AppStep.WELCOME && (
          <div className="space-y-12 py-12 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                Évaluez la robustesse <br className="hidden md:block"/>
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
              <h2 className="text-2xl font-bold text-slate-900">2. Contexte de passage</h2>
              
              <div className="space-y-4">
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                  Composante orale ou synchrone ?
                </p>
                <div className="grid gap-2">
                  {['Oui obligatoire', 'Oui optionnelle', 'Non, asynchrone'].map(o => (
                    <button key={o} onClick={() => setContextAnswers(prev => ({...prev, synchrone: o}))} className={`text-left px-5 py-3.5 rounded-2xl border transition-all ${contextAnswers.synchrone === o ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                  Nature des données ?
                </p>
                <div className="grid gap-2">
                  {['Données locales / confidentielles', 'Partiellement spécifiques', 'Données génériques'].map(o => (
                    <button key={o} onClick={() => setContextAnswers(prev => ({...prev, donnees: o}))} className={`text-left px-5 py-3.5 rounded-2xl border transition-all ${contextAnswers.donnees === o ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">3</span>
                  Évaluation du processus ?
                </p>
                <div className="grid gap-2">
                  {['Processus documenté et évalué', 'Demandé mais non évalué', 'Seul le produit final'].map(o => (
                    <button key={o} onClick={() => setContextAnswers(prev => ({...prev, processus: o}))} className={`text-left px-5 py-3.5 rounded-2xl border transition-all ${contextAnswers.processus === o ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-bold shadow-sm' : 'border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{o}</button>
                  ))}
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <button 
                  disabled={loading || !contextAnswers.synchrone || !contextAnswers.donnees || !contextAnswers.processus} 
                  onClick={handleAuditSubmit} 
                  className={`w-full font-bold py-5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] shadow-xl ${
                    loading ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } disabled:opacity-20`}
                >
                  {loading ? (
                    <>
                      <div className="flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>{loadingStep}</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest opacity-60 font-medium">Analyse doctrinale IA en cours</span>
                    </>
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
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Audit de Robustesse</h2>
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
                <div className="mt-8 text-center space-y-2">
                  <div className={`px-5 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${getStatusColor(currentResult.statut)}`}>{currentResult.statut}</div>
                  <div className="text-6xl font-black text-slate-900">{currentResult.score_total}<span className="text-2xl text-slate-300 font-bold">/12</span></div>
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
              <div className="space-y-1">
                <h3 className="text-2xl font-black tracking-tight">Recommandations stratégiques</h3>
                <p className="text-slate-400 text-sm">Actions prioritaires pour renforcer votre évaluation</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {currentResult.recommandations.map((rec, i) => {
                  const fiche = FICHES[rec.fiche];
                  return (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all group">
                      <p className="font-medium text-slate-200 leading-relaxed mb-4">{rec.action}</p>
                      {fiche && (
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{fiche.name}</span>
                          <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs group-hover:bg-indigo-500 group-hover:text-white transition-all">→</span>
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
              {portfolio.length > 0 && (
                <button 
                  onClick={() => { if(confirm("Vider tout ?")) setPortfolio([]); }} 
                  className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
                >Vider tout</button>
              )}
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
                    <div className="flex items-center gap-6">
                      <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusColor(item.statut)}`}>{item.statut.split(' ')[0]}</span>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-2xl">{item.score_total}</span>
                        <span className="text-slate-300 text-xs font-bold ml-0.5">/12</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === AppStep.QUICK_TEST && (
           <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center">
              <p className="text-slate-500 mb-4">Le diagnostic rapide n'utilise pas l'IA et ne nécessite pas de clé.</p>
              <h2 className="text-2xl font-bold mb-4">Fonctionnalité simplifiée</h2>
              {/* Contenu du quick test simplifié ici si besoin, ou retour à l'accueil */}
               <button onClick={() => setStep(AppStep.WELCOME)} className="text-indigo-600 font-bold hover:underline">Retour</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
