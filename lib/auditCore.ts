// Cœur partagé de l'audit (PLAN §3-§4) : appel LLM, parsing, validation
// stricte du contrat, retry unique sur réponse invalide. server.ts est un
// adaptateur fin autour de runAudit, sans logique métier.
// Fournisseur choisi par AUDIT_PROVIDER (deepseek par défaut, ou claude) ;
// même prompt, même contrat, même validation pour les deux.

import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { buildAuditSchema } from './auditSchema.js';
import { DIMENSIONS, FICHES, PILOTAGE, statutFromScore, DimensionKey } from './doctrine.js';
import { AuditInput, AuditReport, DimensionResult } from '../types.js';

export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-v4-flash';
const CLAUDE_MODEL = 'claude-opus-5-5';
// Raisonnement adaptatif toujours actif sur Opus 5.5 ; `high` est l'équivalent
// retenu du raisonnement DeepSeek complet. Le défaut de l'API serait `medium`.
const CLAUDE_EFFORT = 'high';
// Le raisonnement compte dans max_tokens même s'il n'est pas renvoyé.
const CLAUDE_MAX_TOKENS = 16_000;

type Provider = 'deepseek' | 'claude';

function readProvider(): Provider {
  const p = (process.env.AUDIT_PROVIDER ?? 'deepseek').trim().toLowerCase();
  if (p === 'claude' || p === 'deepseek') return p;
  throw new AuditError(
    `Configuration serveur invalide : AUDIT_PROVIDER vaut "${p}", valeurs acceptées : deepseek ou claude.`,
    500
  );
}

// Budget d'un audit : 290 s au total, sous la limite de 300 s retenue pour la
// requête HTTP (Node, proxy Traefik illimité). Le premier appel reçoit 280 s :
// la génération avec raisonnement dépasse 100 s une fois sur deux sur une
// consigne longue (médiane 103 s, maximum mesuré 130 s). Le retry, utile après
// une réponse invalide, reçoit le reliquat du budget ; après une expiration il
// ne reste rien d'exploitable, donc pas de second appel.
const TOTAL_BUDGET_MS = 290_000;
const FIRST_CALL_TIMEOUT_MS = 280_000;

// Expiration d'un appel : traitée comme une tentative échouée, pas comme une erreur fatale.
class CallTimeout extends Error {}
// 429 Claude (limite de connexions simultanées du workspace) : l'audit se
// replie immédiatement sur DeepSeek, sans nouvel appel Claude.
class ClaudeRateLimited extends Error {}

export class AuditError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Clé API lue dans l'environnement. DEEPSEEK_API_KEY par défaut, partagée par
// l'audit DeepSeek et la transcription (lib/transcriptionCore.ts).
export function readApiKey(varName = 'DEEPSEEK_API_KEY'): string {
  const rawApiKey = process.env[varName];
  const apiKey = rawApiKey ? rawApiKey.trim().replace(/^['"]|['"]$/g, '').trim() : '';
  if (!apiKey) {
    throw new AuditError(
      `Configuration serveur incomplète : la variable ${varName} est absente. Ajoutez-la à l'environnement du serveur puis relancez.`,
      500
    );
  }
  return apiKey;
}

// Erreur HTTP DeepSeek vers erreur applicative, corps logué côté serveur.
export function deepSeekHttpError(status: number, errBody: string): AuditError {
  console.error(`DeepSeek ${status}:`, errBody.slice(0, 500));
  if (status === 401 || status === 403) {
    return new AuditError(
      'DeepSeek a refusé la clé API. Générez une clé sur https://platform.deepseek.com/api_keys et mettez à jour DEEPSEEK_API_KEY.',
      500
    );
  }
  if (status === 402) {
    return new AuditError(
      'Le crédit DeepSeek de cette clé est épuisé. Rechargez sur https://platform.deepseek.com ou changez de clé.',
      500
    );
  }
  return new AuditError(
    `Le service d'analyse est indisponible (DeepSeek ${status}). Réessayez dans quelques instants.`,
    502
  );
}

export async function runAudit(input: AuditInput): Promise<AuditReport> {
  // Fournisseur effectif de l'audit : passe de claude à deepseek sur 429 et y reste.
  let provider = readProvider();
  let apiKey = readApiKey(provider === 'claude' ? 'ANTHROPIC_API_KEY' : 'DEEPSEEK_API_KEY');

  let lastProblem = '';
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const timeoutMs = attempt === 1 ? FIRST_CALL_TIMEOUT_MS : deadline - Date.now();
    const providerLabel = provider === 'claude' ? 'Claude' : 'DeepSeek';
    let text: string;
    try {
      if (provider === 'claude') {
        try {
          text = await callClaude(apiKey, input, timeoutMs);
        } catch (e) {
          if (!(e instanceof ClaudeRateLimited)) throw e;
          provider = 'deepseek';
          apiKey = readApiKey('DEEPSEEK_API_KEY');
          console.warn('Repli sur DeepSeek pour cet audit : Claude 429, limite de connexions simultanées atteinte');
          text = await callDeepSeek(apiKey, input, Math.min(timeoutMs, deadline - Date.now()));
        }
      } else {
        text = await callDeepSeek(apiKey, input, timeoutMs);
      }
    } catch (e) {
      if (!(e instanceof CallTimeout)) throw e;
      lastProblem = `pas de réponse de ${providerLabel} en ${Math.round(timeoutMs / 1000)} s`;
      console.warn(`Appel ${providerLabel} expiré (tentative ${attempt}/2)`);
      break;
    }
    const { report, problem } = parseAndValidate(text, input.consigne);
    if (report) return report;
    lastProblem = problem ?? 'réponse illisible';
    console.warn(`Réponse LLM invalide (tentative ${attempt}/2) : ${lastProblem}`);
  }

  throw new AuditError(
    `Le moteur d'IA n'a pas fourni de réponse conforme au contrat d'audit (${lastProblem}). Relancez l'audit ; si le problème persiste, reformulez la consigne.`,
    502
  );
}

async function callDeepSeek(apiKey: string, input: AuditInput, timeoutMs: number): Promise<string> {
  // Le timer couvre l'appel COMPLET, lecture du corps incluse : DeepSeek peut
  // envoyer les en-têtes tôt et le corps en fin de génération.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(input.consigne, input.contextAnswers) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw deepSeekHttpError(response.status, await response.text());
    }

    const data: any = await response.json();
    const u = data?.usage ?? {};
    console.info(
      `Audit DeepSeek ${DEEPSEEK_MODEL} : ${Math.round((Date.now() - started) / 1000)} s, ` +
      `entrée=${u.prompt_tokens}, sortie=${u.completion_tokens}, ` +
      `cache manqué=${u.prompt_cache_miss_tokens ?? 0}, cache lu=${u.prompt_cache_hit_tokens ?? 0}`
    );
    return data?.choices?.[0]?.message?.content ?? '';
  } catch (e) {
    if (e instanceof AuditError) throw e;
    if (controller.signal.aborted) throw new CallTimeout();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Erreur Claude vers erreur applicative, même grille que deepSeekHttpError.
function claudeError(e: unknown): Error {
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new CallTimeout();
  if (e instanceof Anthropic.APIError) {
    console.error(`Claude ${e.status}:`, e.message.slice(0, 500));
    if (e.status === 429) return new ClaudeRateLimited();
    if (e.status === 401 || e.status === 403) {
      return new AuditError(
        'Claude a refusé la clé API. Générez une clé sur https://platform.claude.com et mettez à jour ANTHROPIC_API_KEY.',
        500
      );
    }
    return new AuditError(
      `Le service d'analyse est indisponible (Claude ${e.status ?? 'réseau'}). Réessayez dans quelques instants.`,
      502
    );
  }
  return e instanceof Error ? e : new Error(String(e));
}

async function callClaude(apiKey: string, input: AuditInput, timeoutMs: number): Promise<string> {
  // Timeout en millisecondes sur la requête complète ; maxRetries à 0, sinon le
  // SDK relancerait de lui-même après une expiration.
  const client = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 });
  const started = Date.now();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      // Bloc système stable (doctrine + barème) mis en cache ; la consigne varie
      // et reste hors cache.
      system: [{ type: 'text', text: buildSystemPrompt(), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserPrompt(input.consigne, input.contextAnswers) }],
      thinking: { type: 'adaptive' },
      output_config: { effort: CLAUDE_EFFORT, format: jsonSchemaOutputFormat(buildAuditSchema()) }
    });
  } catch (e) {
    throw claudeError(e);
  }

  const u = response.usage;
  console.info(
    `Audit Claude ${CLAUDE_MODEL} effort=${CLAUDE_EFFORT} : ${Math.round((Date.now() - started) / 1000)} s, ` +
    `stop=${response.stop_reason}, entrée=${u.input_tokens}, sortie=${u.output_tokens}, ` +
    `cache créé=${u.cache_creation_input_tokens ?? 0}, cache lu=${u.cache_read_input_tokens ?? 0}`
  );

  if (response.stop_reason === 'refusal') {
    throw new AuditError(
      "Claude a refusé d'analyser cette consigne. Reformulez-la ou retirez les passages qui pourraient être lus comme sensibles.",
      502
    );
  }
  // max_tokens ou autre arrêt anormal : le texte tronqué échouera au parsing et
  // passera par le retry.
  return response.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

function normalizeForInclusion(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Clé de fiche telle que renvoyée par le LLM : séquences \uXXXX restées
// littérales après JSON.parse (observé sur « documenté » rendu « documenté »)
// décodées, puis forme Unicode NFC, celle des clés de doctrine.ts.
function normalizeFicheKey(s: string): string {
  return s
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .normalize('NFC')
    .trim();
}

function stripOuterQuotes(s: string): string {
  return s.trim().replace(/^[«"“”'\s]+/, '').replace(/[»"“”'\s]+$/, '');
}

// Exporté pour le banc de mesure (scripts hors dépôt), sans autre usage applicatif.
export function parseAndValidate(text: string, consigne: string): { report?: AuditReport; problem?: string } {
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
    if (typeof r.fiche !== 'string') return { problem: 'clé de fiche non textuelle' };
    r.fiche = normalizeFicheKey(r.fiche);
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
