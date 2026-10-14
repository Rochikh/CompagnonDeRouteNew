// Banc de mesure de l'audit : N appels séquentiels de POST /api/audit par
// consigne de référence, statistiques par consigne, sauvegarde des rapports
// bruts pour relecture (contradictions note/justification).
//
//   npx tsx bench/banc.ts [--url https://compagnon.rochane.fr] [--runs 5] [--only cegep] [--label claude]
//
// Le fournisseur (AUDIT_PROVIDER) est choisi côté serveur ; --label ne sert
// qu'à nommer le fichier de résultats. Tokens et cache se lisent dans les logs
// du conteneur (voir bench/README.md).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIMENSIONS } from '../lib/doctrine.js';
import type { AuditReport, ContextAnswers } from '../types.js';

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const URL_BASE = arg('url', 'https://compagnon.rochane.fr').replace(/\/$/, '');
const RUNS = parseInt(arg('runs', '5'), 10);
const ONLY = arg('only', '');
const LABEL = arg('label', 'banc');

interface Consigne { id: string; fichier: string; attendu: number; contextAnswers: ContextAnswers }
interface Run { consigne: string; run: number; secondes: number; report?: AuditReport; erreur?: string }

const consignes: Consigne[] = JSON.parse(readFileSync(join(here, 'consignes.json'), 'utf8'));

function mediane(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function ecartType(xs: number[]): number {
  const moy = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - moy) ** 2, 0) / xs.length);
}

async function audit(consigne: string, contextAnswers: ContextAnswers): Promise<AuditReport> {
  const res = await fetch(`${URL_BASE}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consigne, contextAnswers })
  });
  const body: any = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status} : ${body?.error ?? ''}`);
  return body as AuditReport;
}

const runs: Run[] = [];
const debut = new Date();
for (const c of consignes) {
  if (ONLY && c.id !== ONLY) continue;
  if (Object.values(c.contextAnswers).some(v => !v)) {
    console.warn(`${c.id} : réponses de contexte incomplètes, consigne ignorée`);
    continue;
  }
  const texte = readFileSync(join(here, c.fichier), 'utf8').trim();
  for (let i = 1; i <= RUNS; i++) {
    const t0 = Date.now();
    try {
      const report = await audit(texte, c.contextAnswers);
      const secondes = Math.round((Date.now() - t0) / 1000);
      runs.push({ consigne: c.id, run: i, secondes, report });
      const notes = DIMENSIONS.map(d => report.dimensions[d.key].note).join('/');
      console.log(`${c.id} #${i} : ${report.score_robustesse}/12 (${notes}) en ${secondes} s`);
    } catch (e: any) {
      const secondes = Math.round((Date.now() - t0) / 1000);
      runs.push({ consigne: c.id, run: i, secondes, erreur: e.message });
      console.log(`${c.id} #${i} : ERREUR ${e.message} après ${secondes} s`);
    }
  }
}

mkdirSync(join(here, 'resultats'), { recursive: true });
const sortie = join(here, 'resultats', `${LABEL}-${debut.toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(sortie, JSON.stringify({ url: URL_BASE, debut: debut.toISOString(), runs }, null, 2));

console.log('\n| Consigne | Attendu | Médiane /12 | R/C/T/M médianes | Écart type | Durée médiane | Erreurs |');
console.log('|---|---|---|---|---|---|---|');
for (const c of consignes) {
  const ok = runs.filter(r => r.consigne === c.id && r.report);
  const nb = runs.filter(r => r.consigne === c.id).length;
  if (!nb) continue;
  if (!ok.length) { console.log(`| ${c.id} | ${c.attendu} | – | – | – | – | ${nb} |`); continue; }
  const scores = ok.map(r => r.report!.score_robustesse);
  const dims = DIMENSIONS.map(d => mediane(ok.map(r => r.report!.dimensions[d.key].note))).join('/');
  console.log(`| ${c.id} | ${c.attendu} | ${mediane(scores)} | ${dims} | ${ecartType(scores).toFixed(2)} | ${mediane(ok.map(r => r.secondes))} s | ${nb - ok.length} |`);
}
console.log(`\nRapports bruts : ${sortie}`);
