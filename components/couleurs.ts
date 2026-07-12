import type { AuditStatut } from '../lib/doctrine';

// Sémantique visuelle §6, direction robustesse : chaque statut porte sa couleur,
// du risque critique (garance) au risque faible (sapin).
export const STATUT_COLORS: Record<AuditStatut, string> = {
  'Risque critique': 'var(--color-garance)',
  'Risque élevé': 'var(--color-brique)',
  'Risque modéré': 'var(--color-ocre)',
  'Risque faible': 'var(--color-sapin)',
};

// Variante pour les LIGNES sur fond clair (tracé du radar) : l'ocre pur est à
// 2,95:1 sur carte blanche, sous le seuil AA graphique de 3:1 ; on l'assombrit
// d'une pointe d'encre sans toucher au token.
export const STATUT_TRAITS: Record<AuditStatut, string> = {
  'Risque critique': 'var(--color-garance)',
  'Risque élevé': 'var(--color-brique)',
  'Risque modéré': 'color-mix(in srgb, var(--color-ocre) 80%, var(--color-encre))',
  'Risque faible': 'var(--color-sapin)',
};
