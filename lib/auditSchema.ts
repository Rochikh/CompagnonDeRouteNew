// Schéma JSON de la sortie d'audit pour les sorties structurées Claude
// (output_config.format). Construit à l'exécution depuis lib/doctrine.ts, comme
// les prompts : aucune clé de fiche, dimension ou statut recopiée ici.
// Les contraintes de bornes (notes 0-3, 2 à 5 points de vigilance, preuves
// présentes dans la consigne) restent vérifiées par parseAndValidate.

import { DIMENSIONS, AUDIT_SEUILS, PILOTAGE, FICHES } from './doctrine.js';

export function buildAuditSchema() {
  const dimension = {
    type: 'object',
    properties: {
      note: { type: 'integer' },
      justification: { type: 'string' },
      preuves: { type: 'array', items: { type: 'string' } }
    },
    required: ['note', 'justification'],
    additionalProperties: false
  } as const;

  return {
    type: 'object',
    properties: {
      dimensions: {
        type: 'object',
        properties: Object.fromEntries(DIMENSIONS.map(d => [d.key, dimension])),
        required: DIMENSIONS.map(d => d.key),
        additionalProperties: false
      },
      score_robustesse: { type: 'integer' },
      statut: { type: 'string', enum: AUDIT_SEUILS.map(s => s.statut) },
      stress_test: {
        type: 'object',
        properties: {
          minutes_estimees: { type: 'integer' },
          pilotage: { type: 'string', enum: [...PILOTAGE] },
          verdict: { type: 'string' }
        },
        required: ['minutes_estimees', 'pilotage', 'verdict'],
        additionalProperties: false
      },
      points_vigilance: { type: 'array', items: { type: 'string' } },
      recommandations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            fiche: { type: 'string', enum: Object.keys(FICHES) }
          },
          required: ['action', 'fiche'],
          additionalProperties: false
        }
      }
    },
    required: ['dimensions', 'score_robustesse', 'statut', 'stress_test', 'points_vigilance', 'recommandations'],
    additionalProperties: false
  } as const;
}
