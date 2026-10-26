// Traduction d'un rapport d'audit déjà validé. Chaîne indépendante de runAudit :
// le rapport français reste la référence (historique, export JSON, PDF), la
// version traduite n'est qu'affichée. Seules les valeurs textuelles partent au
// modèle, sous forme de liste ; elles sont réinjectées à leur place, si bien que
// clés, notes, score, statut, pilotage et clés de fiche ne peuvent pas changer.
// Fournisseur actif (AUDIT_PROVIDER), même repli que l'audit.

import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { buildTraductionPrompt } from './prompt.js';
import { DIMENSIONS, FICHES } from './doctrine.js';
import { AuditError, CLAUDE_MODEL, DEEPSEEK_MODEL, DEEPSEEK_URL, deepSeekHttpError, readApiKey, readProvider } from './auditCore.js';
import { AuditReport, RapportTraduit } from '../types.js';

const MAX_LANGUE_CHARS = 50;
const DEEPSEEK_TIMEOUT_MS = 90_000;
const CLAUDE_TIMEOUT_MS = 120_000;
const CLAUDE_MAX_TOKENS = 16_000;

// Indisponibilité passagère du premier fournisseur : déclenche le repli.
class Indisponible extends Error {}

// Parcourt les valeurs textuelles du rapport dans un ordre fixe et renvoie une
// copie où chacune est remplacée par f(texte).
function parcourir(r: AuditReport, f: (s: string) => string): AuditReport {
  return {
    ...r,
    dimensions: Object.fromEntries(DIMENSIONS.map(d => {
      const dim = r.dimensions[d.key];
      return [d.key, {
        ...dim,
        justification: f(dim.justification),
        ...(dim.preuves ? { preuves: dim.preuves.map(f) } : {})
      }];
    })) as AuditReport['dimensions'],
    stress_test: { ...r.stress_test, verdict: f(r.stress_test.verdict) },
    points_vigilance: r.points_vigilance.map(f),
    recommandations: r.recommandations.map(rec => ({ ...rec, action: f(rec.action) }))
  };
}

const texte = (s: unknown) => typeof s === 'string' && s.trim() !== '';

// Contrôle de forme du rapport reçu du client : chaque champ parcouru doit exister.
function rapportLisible(r: any): r is AuditReport {
  return !!r
    && DIMENSIONS.every(d => texte(r.dimensions?.[d.key]?.justification)
      && (r.dimensions[d.key].preuves === undefined
        || (Array.isArray(r.dimensions[d.key].preuves) && r.dimensions[d.key].preuves.every(texte))))
    && texte(r.stress_test?.verdict)
    && Array.isArray(r.points_vigilance) && r.points_vigilance.every(texte)
    && Array.isArray(r.recommandations)
    && r.recommandations.every((rec: any) => texte(rec?.action) && typeof rec.fiche === 'string' && rec.fiche in FICHES);
}

// Libellé traduit suivi du terme français entre parenthèses.
const avecFrancais = (trad: string, fr: string) =>
  trad.trim().toLowerCase() === fr.toLowerCase() ? fr : `${trad.trim()} (${fr})`;

export async function traduireRapport(rapport: unknown, langue: unknown): Promise<RapportTraduit> {
  if (typeof langue !== 'string' || !langue.trim() || langue.trim().length > MAX_LANGUE_CHARS) {
    throw new AuditError(`Indiquez la langue cible, ${MAX_LANGUE_CHARS} caractères au maximum.`, 400);
  }
  if (!rapportLisible(rapport)) {
    throw new AuditError('Rapport illisible : relancez la traduction depuis un rapport affiché.', 400);
  }

  const textes: string[] = [];
  parcourir(rapport, s => { textes.push(s); return s; });
  const nbRapport = textes.length;
  // Noms des dimensions et titres des fiches citées, à la suite du rapport.
  const fiches = [...new Set(rapport.recommandations.map(r => r.fiche))];
  textes.push(...DIMENSIONS.map(d => d.label), ...fiches.map(k => FICHES[k].name));

  const traduits = await appelerFournisseur(JSON.stringify({ langue: langue.trim(), textes }), textes.length);

  let i = 0;
  const rapportTraduit = parcourir(rapport, () => traduits[i++]);
  return {
    rapport: {
      dimensions: rapportTraduit.dimensions,
      score_robustesse: rapport.score_robustesse,
      statut: rapport.statut,
      stress_test: rapportTraduit.stress_test,
      points_vigilance: rapportTraduit.points_vigilance,
      recommandations: rapportTraduit.recommandations
    },
    libelles: {
      dimensions: Object.fromEntries(DIMENSIONS.map((d, j) => [d.key, avecFrancais(traduits[nbRapport + j], d.label)])) as RapportTraduit['libelles']['dimensions'],
      fiches: Object.fromEntries(fiches.map((k, j) => [k, avecFrancais(traduits[nbRapport + DIMENSIONS.length + j], FICHES[k].name)]))
    }
  };
}

// Fournisseur actif d'abord, l'autre en repli sur indisponibilité ou expiration.
// Une réponse hors contrat est relancée une fois sur le même fournisseur.
async function appelerFournisseur(entree: string, attendu: number): Promise<string[]> {
  const ordre = readProvider() === 'claude' ? [callClaude, callDeepSeek] : [callDeepSeek, callClaude];
  let probleme = '';
  for (const [rang, appel] of ordre.entries()) {
    try {
      for (let tentative = 1; tentative <= 2; tentative++) {
        const liste = lireTextes(await appel(entree), attendu);
        if (typeof liste !== 'string') return liste;
        probleme = liste;
        console.warn(`Traduction hors contrat (tentative ${tentative}/2) : ${probleme}`);
      }
      break;
    } catch (e) {
      if (!(e instanceof Indisponible)) throw e;
      probleme = e.message;
      if (rang === 0) console.warn(`Repli pour cette traduction : ${probleme}`);
    }
  }
  throw new AuditError(`La traduction a échoué (${probleme}). Relancez-la dans quelques instants.`, 502);
}

// Liste traduite, ou description du problème.
function lireTextes(brut: string, attendu: number): string[] | string {
  let data: any;
  try {
    data = JSON.parse(brut.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return 'JSON invalide';
  }
  const liste = data?.textes;
  if (!Array.isArray(liste) || liste.length !== attendu) {
    return `${Array.isArray(liste) ? liste.length : 0} textes reçus, ${attendu} attendus`;
  }
  if (!liste.every(texte)) return 'texte vide ou non textuel';
  return liste.map((s: string) => s.trim());
}

async function callDeepSeek(entree: string): Promise<string> {
  const apiKey = readApiKey('DEEPSEEK_API_KEY');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: buildTraductionPrompt() },
          { role: 'user', content: entree }
        ],
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const err = deepSeekHttpError(response.status, await response.text());
      if (response.status === 402 || response.status === 429 || response.status >= 500) {
        throw new Indisponible(`DeepSeek ${response.status}`);
      }
      throw err;
    }
    const data: any = await response.json();
    const u = data?.usage ?? {};
    console.info(`Traduction DeepSeek ${DEEPSEEK_MODEL} : ${Math.round((Date.now() - started) / 1000)} s, entrée=${u.prompt_tokens}, sortie=${u.completion_tokens}`);
    return data?.choices?.[0]?.message?.content ?? '';
  } catch (e) {
    if (controller.signal.aborted) throw new Indisponible(`pas de réponse de DeepSeek en ${DEEPSEEK_TIMEOUT_MS / 1000} s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callClaude(entree: string): Promise<string> {
  const client = new Anthropic({ apiKey: readApiKey('ANTHROPIC_API_KEY'), timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0 });
  const started = Date.now();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: buildTraductionPrompt(),
      messages: [{ role: 'user', content: entree }],
      output_config: {
        effort: 'low',
        format: jsonSchemaOutputFormat({
          type: 'object',
          properties: { textes: { type: 'array', items: { type: 'string' } } },
          required: ['textes'],
          additionalProperties: false
        } as const)
      }
    });
  } catch (e) {
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new Indisponible(`pas de réponse de Claude en ${CLAUDE_TIMEOUT_MS / 1000} s`);
    if (e instanceof Anthropic.APIError) {
      console.error(`Claude ${e.status}:`, e.message.slice(0, 500));
      if (e.status === 429 || (e.status ?? 0) >= 500) throw new Indisponible(`Claude ${e.status}`);
      throw new AuditError(`Le service de traduction est indisponible (Claude ${e.status ?? 'réseau'}).`, 502);
    }
    throw e;
  }
  const u = response.usage;
  console.info(`Traduction Claude ${CLAUDE_MODEL} : ${Math.round((Date.now() - started) / 1000)} s, stop=${response.stop_reason}, entrée=${u.input_tokens}, sortie=${u.output_tokens}`);
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('');
}
