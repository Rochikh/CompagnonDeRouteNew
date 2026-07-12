
export enum VulnerabilityStatus {
  ROBUSTE = "Robuste",
  MODEREE = "Vulnérabilité modérée",
  ELEVEE = "Vulnérabilité élevée",
  CRITIQUE = "Vulnérabilité critique"
}

export interface AuditResult {
  id: string;
  title: string;
  consigne: string;
  contextAnswers: {
    synchrone: string;
    donnees: string;
    processus: string;
  };
  reproductibilite: number;
  contextualisation: number;
  tacitite: number;
  multimodalite: number;
  score_total: number;
  statut: VulnerabilityStatus;
  points_vigilance: string[];
  recommandations: Array<{
    action: string;
    fiche: string;
  }>;
  justifications: Record<string, string>;
  date: string;
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
