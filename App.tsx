
import React, { useState } from 'react';
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
  const [portfolio, setPortfolio] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quickTestIndex, setQuickTestIndex] = useState(0);
  const [quickTestScores, setQuickTestScores] = useState<number[]>([]);

  const quickTestQuestions = [
    "Cette évaluation repose-t-elle sur une production écrite réalisée hors surveillance ?",
    "La consigne pourrait-elle être copiée telle quelle dans un assistant IA pour obtenir un résultat recevable ?",
    "L'évaluation mobilise-t-elle des données génériques accessibles en ligne plutôt que des données locales ou personnelles ?",
    "Le produit final est-il le seul objet évalué, sans trace du processus de production ?",
    "L'évaluation se déroule-t-elle entièrement en mode asynchrone, sans interaction en temps réel avec l'apprenant·e ?",
    "Les critères d'évaluation portent-ils exclusivement sur le contenu, sans dimension réflexive ou métacognitive ?",
    "Un·e apprenant·e pourrait-il·elle obtenir une note satisfaisante sans pouvoir expliquer oralement ses choix ?",
    "Vos collègues utilisent-ils·elles des consignes identiques ou très similaires d'une session à l'autre ?"
  ];

  const handleAuditSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditConsigne(consigne, contextAnswers);
      
      const result: AuditResult = {
        id: Math.random().toString(36).substr(2, 9),
        title: consigne.trim().substring(0, 50) + (consigne.length > 50 ? '...' : ''),
        consigne,
        contextAnswers,
        reproductibilite: data.reproductibilite,
        contextualisation: data.contextualisation,
        tacitite: data.tacitite,
        multimodalite: data.multimodalite,
        score_total: data.score_total,
        statut: data.statut as VulnerabilityStatus,
        points_vigilance: data.points_vigilance,
        recommandations: data.recommandations,
        justifications: data.justifications || {},
        date: new Date().toLocaleDateString('fr-FR')
      };

      setCurrentResult(result);
      setPortfolio(prev => [...prev, result]);
      setStep(AppStep.AUDIT_RESULT);
    } catch (err: any) {
      console.error("Submit Error:", err);
      setError("Désolé·e, l'analyse a échoué. Vérifiez votre connexion ou réessayez avec une consigne plus courte.");
    } finally {
      setLoading(false);
    }
  };

  const copyAsJson = () => {
    if (!currentResult) return;
    const exportData = {
      reproductibilite: currentResult.reproductibilite,
      contextualisation: currentResult.contextualisation,
      tacitite: currentResult.tacitite,
      multimodalite: currentResult.multimodalite,
      score_total: currentResult.score_total,
      statut: currentResult.statut,
      points_vigilance: currentResult.points_vigilance,
      recommandations: currentResult.recommandations
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    alert("Copié dans le presse-papier !");
  };

  const handleQuickTestAnswer = (score: number) => {
    const newScores = [...quickTestScores, score];
    if (quickTestIndex < quickTestQuestions.length - 1) {
      setQuickTestScores(newScores);
      setQuickTestIndex(quickTestIndex + 1);
    } else {
      setQuickTestScores(newScores);
      const total = newScores.reduce((a, b) => a + b, 0);
      let status = VulnerabilityStatus.ROBUSTE;
      if (total >= 12) status = VulnerabilityStatus.CRITIQUE;
      else if (total >= 8) status = VulnerabilityStatus.ELEVEE;
      else if (total >= 4) status = VulnerabilityStatus.MODEREE;

      const mockResult: AuditResult = {
        id: 'qt-' + Date.now(),
        title: "Autodiagnostic rapide",
        consigne: "Test rapide des 8 points de vigilance",
        contextAnswers: { synchrone: 'N/A', donnees: 'N/A', processus: 'N/A' },
        reproductibilite: 1,
        contextualisation: 1,
        tacitite: 1,
        multimodalite: 1,
        score_total: total,
        statut: status,
        points_vigilance: ["Audit rapide basé sur vos réponses déclaratives."],
        recommandations: [{ action: "Réalisez un audit détaillé pour des recommandations précises.", fiche: "Fiche 5 — Soutenance orale sans écrit préalable" }],
        justifications: {},
        date: new Date().toLocaleDateString('fr-FR')
      };
      setCurrentResult(mockResult);
      setStep(AppStep.AUDIT_RESULT);
    }
  };

  const getStatusColor = (status: VulnerabilityStatus) => {
    switch (status) {
      case VulnerabilityStatus.ROBUSTE: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case VulnerabilityStatus.MODEREE: return 'bg-amber-100 text-amber-800 border-amber-200';
      case VulnerabilityStatus.ELEVEE: return 'bg-orange-100 text-orange-800 border-orange-200';
      case VulnerabilityStatus.CRITIQUE: return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setStep(AppStep.WELCOME); setError(null); }}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="font-bold text-slate-800 tracking-tight">Compagnon de route</h1>
          </div>
          <nav className="flex items-center gap-4">
             <button 
              onClick={() => { setStep(AppStep.PORTFOLIO); setError(null); }}
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
             >
              Portefeuille ({portfolio.length})
             </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-medium flex items-center gap-3">
            {error}
          </div>
        )}

        {step === AppStep.WELCOME && (
          <div className="space-y-12 py-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
                Évaluez la robustesse de vos examens <br/>
                <span className="text-indigo-600">à l'ère de l'IA générative</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Basé sur le protocole d'audit développé dans "Évaluer en formation à l'ère de l'IA générative" (Rochane Kherbouche, 2026).
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button onClick={() => setStep(AppStep.AUDIT_INPUT)} className="p-8 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-600 transition-all group shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Audit détaillé</h3>
                <p className="text-slate-500">Analysez une consigne précise sur 4 dimensions critiques.</p>
              </button>
              <button onClick={() => { setQuickTestIndex(0); setQuickTestScores([]); setStep(AppStep.QUICK_TEST); }} className="p-8 bg-white border border-slate-200 rounded-2xl text-left hover:border-indigo-600 transition-all group shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Diagnostic rapide</h3>
                <p className="text-slate-500">8 questions pour évaluer votre profil de vulnérabilité global.</p>
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_INPUT && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Nouvel audit</h2>
              <textarea 
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                placeholder="Rédigez ou collez ici la consigne de votre évaluation... (Optionnel : préfixez par [JSON])"
                className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button disabled={!consigne.trim()} onClick={() => setStep(AppStep.AUDIT_QUESTIONS)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                Suivant : contexte
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_QUESTIONS && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
              <h2 className="text-2xl font-bold text-slate-900">Questions contextuelles</h2>
              <div className="space-y-4">
                <p className="font-medium">1. Composante orale ou synchrone ?</p>
                <div className="flex flex-col gap-2">
                  {['Oui obligatoire', 'Oui optionnelle', 'Non, entièrement asynchrone'].map(o => (
                    <button key={o} onClick={() => setContextAnswers(prev => ({...prev, synchrone: o}))} className={`text-left px-4 py-3 rounded-xl border ${contextAnswers.synchrone === o ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-medium">2. Données locales ou confidentielles ?</p>
                <div className="flex flex-col gap-2">
                  {['Oui exclusivement', 'Partiellement', 'Non, données génériques'].map(o => (
                    <button key={o} onClick={() => setContextAnswers(prev => ({...prev, donnees: o}))} className={`text-left px-4 py-3 rounded-xl border ${contextAnswers.donnees === o ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <p className="font-medium">3. Processus de production évalué ?</p>
                <div className="flex flex-col gap-2">
                  {['Oui documenté ET évalué', 'Demandé mais non évalué', 'Non, seul le produit final'].map(o => (
                    <button key={o} onClick={() => setContextAnswers(prev => ({...prev, processus: o}))} className={`text-left px-4 py-3 rounded-xl border ${contextAnswers.processus === o ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'border-slate-200'}`}>{o}</button>
                  ))}
                </div>
              </div>
              <button disabled={loading} onClick={handleAuditSubmit} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                {loading ? 'Audit en cours...' : 'Lancer l\'audit'}
              </button>
            </div>
          </div>
        )}

        {step === AppStep.AUDIT_RESULT && currentResult && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-extrabold">Résultats</h2>
              <button onClick={copyAsJson} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1 border border-slate-200 px-3 py-1 rounded-lg">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                Copier en JSON
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                <RadarChart scores={{
                  reproductibilite: currentResult.reproductibilite,
                  contextualisation: currentResult.contextualisation,
                  tacitite: currentResult.tacitite,
                  multimodalite: currentResult.multimodalite
                }} />
                <div className="mt-8 text-center">
                  <div className={`px-4 py-1 rounded-full text-xs font-bold mb-2 inline-block border ${getStatusColor(currentResult.statut)}`}>{currentResult.statut}</div>
                  <div className="text-5xl font-black text-indigo-600">{currentResult.score_total}<span className="text-2xl text-slate-300">/12</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg">Points de vigilance</h3>
                <div className="space-y-2">
                  {currentResult.points_vigilance.map((v, i) => (
                    <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm leading-relaxed">{v}</div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="text-xl font-bold">Recommandations stratégiques</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {currentResult.recommandations.map((rec, i) => {
                  const fiche = FICHES[rec.fiche];
                  return (
                    <div key={i} className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                      <p className="font-medium text-indigo-900 leading-relaxed">{rec.action}</p>
                      {fiche && <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{fiche.name}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setStep(AppStep.WELCOME)} className="w-full py-4 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Nouveau diagnostic</button>
          </div>
        )}

        {step === AppStep.PORTFOLIO && (
          <div className="space-y-8">
            <h2 className="text-3xl font-extrabold">Portefeuille d'audits</h2>
            {portfolio.length === 0 ? (
               <div className="p-20 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">Aucun audit enregistré.</div>
            ) : (
              <div className="grid gap-4">
                {portfolio.map(item => (
                  <div key={item.id} onClick={() => { setCurrentResult(item); setStep(AppStep.AUDIT_RESULT); }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-600 transition-all flex justify-between items-center">
                    <div>
                      <h4 className="font-bold">{item.title}</h4>
                      <p className="text-xs text-slate-400">{item.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(item.statut)}`}>{item.statut}</span>
                      <span className="font-black text-indigo-600 text-xl">{item.score_total}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === AppStep.QUICK_TEST && (
           <div className="max-w-2xl mx-auto py-12">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1.5 bg-indigo-600 transition-all" style={{ width: `${(quickTestIndex / quickTestQuestions.length) * 100}%` }} />
              <div className="mb-8">
                <span className="text-indigo-600 font-bold text-xs tracking-widest uppercase">Question {quickTestIndex + 1}/{quickTestQuestions.length}</span>
                <h2 className="text-2xl font-bold mt-2">{quickTestQuestions[quickTestIndex]}</h2>
              </div>
              <div className="space-y-3">
                {[{l: "Oui", s: 2}, {l: "Partiellement", s: 1}, {l: "Non", s: 0}].map(a => (
                  <button key={a.l} onClick={() => handleQuickTestAnswer(a.s)} className="w-full text-left p-6 rounded-2xl border border-slate-100 bg-slate-50 font-semibold hover:bg-indigo-50 hover:border-indigo-100 transition-all">{a.l}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 py-20 border-t border-slate-200 text-center">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12">
            <a href="https://ia.rochane.fr" target="_blank" rel="noopener noreferrer" className="text-xl font-black text-slate-900 hover:text-indigo-600 transition-colors">ia.rochane.fr</a>
            <a href="mailto:ia@rochane.fr" className="text-xl font-bold text-indigo-600 hover:underline">ia@rochane.fr</a>
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Conférence (2h) • Atelier (demi-journée) • Audit institutionnel de portefeuille évaluatif
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
