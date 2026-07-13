// Cœur partagé de l'audit (PLAN §3-§4) : appel OpenRouter, parsing, validation
// stricte du contrat, retry unique sur réponse invalide. server.ts (dev) et
// api/audit.ts (prod) sont des adaptateurs fins autour de runAudit, sans logique métier.

import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { DIMENSIONS, FICHES, PILOTAGE, statutFromScore, DimensionKey } from './doctrine.js';
import { AuditInput, AuditReport, DimensionResult } from '../types.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-v4-flash';

export class AuditError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function runAudit(input: AuditInput): Promise<AuditReport> {
  const rawApiKey = process.env.OPENROUTER_API_KEY;
  const apiKey = rawApiKey ? rawApiKey.trim().replace(/^['"]|['"]$/g, '').trim() : '';
  if (!apiKey) {
    throw new AuditError(
      "Configuration serveur incomplète : la variable OPENROUTER_API_KEY est absente. Ajoutez-la à l'environnement du serveur puis relancez.",
      500
    );
  }

  let lastProblem = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await callOpenRouter(apiKey, input);
    const { report, problem } = parseAndValidate(text, input.consigne);
    if (report) return report;
    lastProblem = problem ?? 'réponse illisible';
    console.warn(`Réponse LLM invalide (tentative ${attempt}/2) : ${lastProblem}`);
  }

  throw new AuditError(
    `Le moteur d'IA a renvoyé deux réponses non conformes au contrat d'audit (${lastProblem}). Relancez l'audit ; si le problème persiste, reformulez la consigne.`,
    502
  );
}

async function callOpenRouter(apiKey: string, input: AuditInput): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ia-cr.rochane.fr',
      'X-Title': 'Compagnon de route'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(input.consigne, input.contextAnswers) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`OpenRouter ${response.status}:`, errBody.slice(0, 500));
    if (response.status === 401 || response.status === 403) {
      throw new AuditError(
        'OpenRouter a refusé la clé API. Générez une clé sur https://openrouter.ai/keys et mettez à jour OPENROUTER_API_KEY.',
        500
      );
    }
    if (response.status === 402) {
      throw new AuditError(
        'Le crédit OpenRouter de cette clé est épuisé. Rechargez sur https://openrouter.ai/credits ou changez de clé.',
        500
      );
    }
    throw new AuditError(
      `Le service d'analyse est indisponible (OpenRouter ${response.status}). Réessayez dans quelques instants.`,
      502
    );
  }

  const data: any = await response.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function normalizeForInclusion(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripOuterQuotes(s: string): string {
  return s.trim().replace(/^[«"“”'\s]+/, '').replace(/[»"“”'\s]+$/, '');
}

function parseAndValidate(text: string, consigne: string): { report?: AuditReport; problem?: string } {
  if (!text.trim()) return { problem: 'réponse vide' };

  let raw: any;
  try {
    raw = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    return { problem: 'JSON invalide' };
  }

  const consigneNorm = normalizeForInclusion(consigne);
  const dimensions = {} as Record<DimensionKey, DimensionResult>;
  let somme = 0;

  for (const dim of DIMENSIONS) {
    const d = raw?.dimensions?.[dim.key];
    if (!d || typeof d !== 'object') return { problem: `dimension ${dim.key} absente` };
    if (!Number.isInteger(d.note) || d.note < 0 || d.note > 3) {
      return { problem: `note de ${dim.key} hors échelle 0-3` };
    }
    if (typeof d.justification !== 'string' || !d.justification.trim()) {
      return { problem: `justification de ${dim.key} absente` };
    }
    const result: DimensionResult = { note: d.note, justification: d.justification.trim() };
    if (d.note === 0) {
      if (!Array.isArray(d.preuves) || d.preuves.length === 0) {
        return { problem: `preuves absentes pour ${dim.key} noté 0` };
      }
      const preuves: string[] = [];
      for (const p of d.preuves) {
        if (typeof p !== 'string') return { problem: `preuve non textuelle pour ${dim.key}` };
        const cleaned = stripOuterQuotes(p);
        if (!cleaned || !consigneNorm.includes(normalizeForInclusion(cleaned))) {
          return { problem: `preuve de ${dim.key} introuvable dans la consigne` };
        }
        preuves.push(cleaned);
      }
      result.preuves = preuves;
    }
    // Les preuves renvoyées pour une note 1-3 sont ignorées : le contrat les réserve à la note 0.
    dimensions[dim.key] = result;
    somme += d.note;
  }

  if (raw.score_robustesse !== somme) {
    return { problem: `score_robustesse (${raw.score_robustesse}) différent de la somme des notes (${somme})` };
  }

  const st = raw.stress_test;
  if (!st || typeof st !== 'object') return { problem: 'stress_test absent' };
  if (typeof st.minutes_estimees !== 'number' || !Number.isFinite(st.minutes_estimees) || st.minutes_estimees < 0) {
    return { problem: 'minutes_estimees invalide' };
  }
  if (!PILOTAGE.includes(st.pilotage)) return { problem: `pilotage "${st.pilotage}" hors référentiel` };
  if (typeof st.verdict !== 'string' || !st.verdict.trim()) return { problem: 'verdict du stress-test absent' };
  if (st.minutes_estimees < 30 && dimensions['reproductibilite'].note > 1) {
    return { problem: `incohérence stress-test : ${st.minutes_estimees} min mais reproductibilité notée ${dimensions['reproductibilite'].note}` };
  }

  const pv = raw.points_vigilance;
  if (!Array.isArray(pv) || pv.length < 2 || pv.length > 5 || pv.some((v: any) => typeof v !== 'string' || !v.trim())) {
    return { problem: 'points_vigilance hors contrat (2 à 5 chaînes attendues)' };
  }

  const recos = raw.recommandations;
  if (!Array.isArray(recos) || recos.length < 2 || recos.length > 4) {
    return { problem: 'recommandations hors contrat (2 à 4 éléments attendus)' };
  }
  for (const r of recos) {
    if (!r || typeof r.action !== 'string' || !r.action.trim()) return { problem: 'action de recommandation absente' };
    if (!(r.fiche in FICHES)) return { problem: `clé de fiche inconnue : "${r.fiche}"` };
  }
  const recommandations = recos
    .map((r: any) => ({ action: r.action.trim(), fiche: r.fiche as string }))
    .sort((a: { fiche: string }, b: { fiche: string }) =>
      parseInt(FICHES[a.fiche].vulnerabilite) - parseInt(FICHES[b.fiche].vulnerabilite));

  return {
    report: {
      dimensions,
      score_robustesse: somme,
      // Le statut LLM est écrasé : seule la déduction serveur depuis les seuils fait foi.
      statut: statutFromScore(somme),
      stress_test: {
        minutes_estimees: st.minutes_estimees,
        pilotage: st.pilotage,
        verdict: st.verdict.trim()
      },
      points_vigilance: pv.map((v: string) => v.trim()),
      recommandations
    }
  };
}
