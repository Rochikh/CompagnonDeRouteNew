import React from 'react';
import RegleGraduee from './RegleGraduee';
import RadarChart from './RadarChart';
import { statutFromScore } from '../lib/doctrine';
import type { DimensionKey } from '../lib/doctrine';

// Page de démonstration TEMPORAIRE (critère de vérification étape 6).
// Accessible via /?demo, supprimée quand les écrans v2 seront en place.

const CAS: Array<{ score: number; notes: Record<DimensionKey, number> }> = [
  { score: 0, notes: { reproductibilite: 0, contextualisation: 0, tacitite: 0, multimodalite: 0 } },
  { score: 3, notes: { reproductibilite: 0, contextualisation: 1, tacitite: 1, multimodalite: 1 } },
  { score: 7, notes: { reproductibilite: 1, contextualisation: 2, tacitite: 2, multimodalite: 2 } },
  { score: 12, notes: { reproductibilite: 3, contextualisation: 3, tacitite: 3, multimodalite: 3 } },
];

const TOKENS: Array<[string, string]> = [
  ['papier', '#F7F5F0'],
  ['encre', '#22303C'],
  ['bleu-règle', '#2C5F7C'],
  ['sapin', '#2E6B4F'],
  ['ocre', '#C58B32'],
  ['brique', '#B0563B'],
  ['garance', '#8C2F2F'],
  ['kraft', '#E8DFCE'],
];

const DemoDesign: React.FC = () => (
  <main className="mx-auto max-w-3xl px-4 py-10 space-y-10">
    <header className="space-y-2">
      <p className="text-13 font-medium uppercase tracking-widest" style={{ color: 'rgb(34 48 60 / 0.7)' }}>
        Page temporaire · étape 6
      </p>
      <h1 className="text-34 font-bold">Carnet de route — système de design</h1>
      <p className="max-w-xl font-serif text-15">
        Règle graduée et radar en direction robustesse, aux quatre scores de contrôle.
        Ce paragraphe est composé en Source Serif 4, le registre des justifications
        et des contenus de fiches ; les titres et chiffres sont en Bricolage Grotesque.
      </p>
    </header>

    <section aria-label="Tokens de couleur" className="space-y-3">
      <h2 className="text-18 font-semibold">Tokens</h2>
      <ul className="flex flex-wrap gap-2">
        {TOKENS.map(([nom, hex]) => (
          <li key={nom} className="flex items-center gap-2 rounded-md border border-trait bg-white px-3 py-2">
            <span className="h-5 w-5 rounded-xs border border-trait" style={{ background: hex }} />
            <span className="text-13 font-medium">{nom}</span>
            <code className="text-13" style={{ color: 'rgb(34 48 60 / 0.7)' }}>{hex}</code>
          </li>
        ))}
      </ul>
    </section>

    <section className="space-y-6" aria-label="Composants aux scores de contrôle">
      {CAS.map(({ score, notes }) => (
        <article key={score} className="rounded-lg border border-trait bg-white p-6">
          <h2 className="mb-5 text-24 font-bold">
            {score}/12 <span className="text-18 font-semibold" style={{ color: 'rgb(34 48 60 / 0.7)' }}>— {statutFromScore(score)}</span>
          </h2>
          <div className="grid items-center gap-8 md:grid-cols-2">
            <RegleGraduee score={score} />
            <RadarChart notes={notes} statut={statutFromScore(score)} />
          </div>
        </article>
      ))}
    </section>

    <section className="rounded-lg border border-trait p-6" style={{ background: 'var(--color-kraft)' }} aria-label="Spécimen fiche">
      <h2 className="text-18 font-semibold">Fond kraft — cartes-fiches et citations</h2>
      <blockquote className="mt-2 font-serif text-15">
        « Rédigez un rapport de 5 pages sur l'impact de la RSE dans les entreprises françaises. »
      </blockquote>
    </section>
  </main>
);

export default DemoDesign;
