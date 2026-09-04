import type { AuditStatut, QuickVerdict } from '../lib/doctrine';

// Semantique visuelle, systeme « Copie corrigee » : accent bleu unique pour le
// pole robuste, rouge du correcteur pour l'annotation de risque, gris entre les
// deux. Aucune couleur hors palette. Direction robustesse : HAUT = ROBUSTE.
export const STATUT_COLORS: Record<AuditStatut, string> = {
  'Risque critique': 'var(--color-rouge)',
  'Risque élevé': 'color-mix(in srgb, var(--color-rouge) 55%, var(--color-papier))',
  'Risque modéré': 'var(--color-gris-meta)',
  'Risque faible': 'var(--color-bleu-regle)',
};

// Verdicts du test rapide (direction inverse, canonique : haut = vulnérable).
export const VERDICT_COLORS: Record<QuickVerdict, string> = {
  'Robustesse élevée': 'var(--color-bleu-regle)',
  'Vulnérabilité modérée': 'var(--color-gris-meta)',
  'Vulnérabilité critique': 'var(--color-rouge)',
};
