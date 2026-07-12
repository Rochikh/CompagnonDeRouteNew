import type { AuditStatut, DimensionKey, Pilotage } from './lib/doctrine';

// Contrat API v2 (PLAN §4). Direction robustesse : HAUT = ROBUSTE.

export interface ContextAnswers {
  synchrone: string;
  donnees: string;
  processus: string;
}

export interface AuditInput {
  consigne: string;
  contextAnswers: ContextAnswers;
}

export interface DimensionResult {
  note: number;
  justification: string;
  // Citations exactes de la consigne, présentes uniquement si note === 0.
  preuves?: string[];
}

export interface StressTest {
  minutes_estimees: number;
  pilotage: Pilotage;
  verdict: string;
}

export interface Recommandation {
  action: string;
  fiche: string;
}

export interface AuditReport {
  dimensions: Record<DimensionKey, DimensionResult>;
  score_robustesse: number;
  statut: AuditStatut;
  stress_test: StressTest;
  points_vigilance: string[];
  recommandations: Recommandation[];
}

// Entrée du portefeuille : rapport + métadonnées client.
export interface AuditResult extends AuditReport {
  id: string;
  title: string;
  consigne: string;
  contextAnswers: ContextAnswers;
  date: string;
  // Filiation d'un ré-audit : id de l'audit dont celui-ci est la version corrigée.
  parentId?: string;
  // Curseurs 1-5 de la matrice impact-faisabilité (§2.5), renseignés côté client.
  impact?: number;
  faisabilite?: number;
}

export interface Fiche {
  id: number;
  name: string;
  format: string;
  duree: string;
  vulnerabilite: string;
  publics: string;
  principe: string;
  adaptations: string[];
  charge: string;
}

export enum AppStep {
  WELCOME,
  AUDIT_INPUT,
  AUDIT_QUESTIONS,
  AUDIT_RESULT,
  QUICK_TEST,
  PORTFOLIO
}
