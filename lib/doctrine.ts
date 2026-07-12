// Source unique de la doctrine (livre "Évaluer en formation à l'ère de l'IA générative",
// Rochane Kherbouche, 2026, chapitre 6). Toute définition, seuil, statut, fiche ou question
// vit ici et nulle part ailleurs.

import { Fiche } from '../types';

// Les 4 dimensions de substituabilité. Chaque dimension est notée 0 à 3, 3 = pôle ROBUSTE.
export const DIMENSIONS = [
  {
    key: 'reproductibilite',
    label: 'Reproductibilité',
    definition: "L'évaluation demande-t-elle une procédure standardisée (0, substituable) ou une production unique (3, robuste) ?"
  },
  {
    key: 'contextualisation',
    label: 'Contextualisation',
    definition: "Ancrage dans des données génériques accessibles en ligne (0) ou locales, spécifiques à une organisation, confidentielles, personnelles (3) ?"
  },
  {
    key: 'tacitite',
    label: 'Tacitité',
    definition: "L'expertise requise est-elle explicitable, facilement formalisable comme une synthèse textuelle (0), ou intuitive, fondée sur l'expérience, le ressenti, l'interaction en temps réel (3) ?"
  },
  {
    key: 'multimodalite',
    label: 'Multimodalité',
    definition: "Un seul format, type devoir écrit asynchrone monomodal (0), ou combinaison de formats, par exemple soutenance associant diaporama, démonstration technique et questions improvisées (3) ?"
  }
] as const;

// Score d'audit complet : score_robustesse = somme des 4 notes (0 à 12). HAUT = ROBUSTE.
export const AUDIT_SEUILS = [
  { min: 0, max: 3, statut: 'Risque critique', action: 'Hautement substituable, refonte totale' },
  { min: 4, max: 6, statut: 'Risque élevé', action: 'Adaptation substantielle du dispositif' },
  { min: 7, max: 9, statut: 'Risque modéré', action: 'Ajustements ciblés (contextualisation locale, consignes de transparence)' },
  { min: 10, max: 12, statut: 'Risque faible', action: 'Maintien sous vigilance active' }
] as const;

export function statutFromScore(score: number): AuditStatut {
  const seuil = AUDIT_SEUILS.find(s => score >= s.min && score <= s.max);
  if (!seuil) throw new Error(`Score de robustesse hors bornes : ${score}`);
  return seuil.statut;
}

// Types dérivés des référentiels ci-dessus (source unique, pas de duplication de littéraux).
export type AuditStatut = (typeof AUDIT_SEUILS)[number]['statut'];
export type DimensionKey = (typeof DIMENSIONS)[number]['key'];
export type Pilotage = (typeof PILOTAGE)[number];
export type QuickVerdict = (typeof QUICK_SEUILS)[number]['verdict'];

// Degrés de pilotage humain du stress-test simulé.
export const PILOTAGE = ['aucun', 'léger', 'soutenu', 'expert'] as const;

// Test rapide (autodiagnostic, encart du livre) : 8 questions fermées, Oui = 2,
// Partiellement = 1, Non = 0. Score brut /16, direction INVERSE de l'audit
// (haut = vulnérable). Canonique, ne pas harmoniser avec le score d'audit.
export const QUICK_QUESTIONS = [
  "Cette évaluation repose-t-elle sur une production écrite réalisée hors surveillance ?",
  "La consigne pourrait-elle être copiée telle quelle dans un assistant IA pour obtenir un résultat recevable ?",
  "L'évaluation mobilise-t-elle des données génériques accessibles en ligne plutôt que des données locales ou personnelles ?",
  "Le produit final est-il le seul objet évalué, sans trace du processus de production ?",
  "L'évaluation se déroule-t-elle entièrement en mode asynchrone, sans interaction en temps réel avec l'apprenant·e ?",
  "Les critères d'évaluation portent-ils exclusivement sur le contenu, sans dimension réflexive ou métacognitive ?",
  "Un·e apprenant·e pourrait-il·elle obtenir une note satisfaisante sans pouvoir expliquer oralement ses choix ?",
  "Vos collègues utilisent-ils·elles des consignes identiques ou très similaires d'une session à l'autre ?"
];

export const QUICK_SEUILS = [
  {
    min: 0, max: 4,
    verdict: 'Robustesse élevée',
    conseil: "Maintien sous vigilance active : réexaminez ce dispositif à chaque évolution notable des outils d'IA générative."
  },
  {
    min: 5, max: 9,
    verdict: 'Vulnérabilité modérée',
    conseil: "Adaptations ciblées recommandées : consultez d'abord les fiches les plus robustes, Fiche 5 (soutenance orale sans écrit préalable) et Fiche 6 (simulation professionnelle filmée), puis les Fiches 4, 7 et 8."
  },
  {
    min: 10, max: 16,
    verdict: 'Vulnérabilité critique',
    conseil: "Reprenez le protocole complet du livre et lancez l'audit détaillé de cette application pour un diagnostic dimension par dimension."
  }
] as const;

export function quickVerdictFromScore(score: number): (typeof QUICK_SEUILS)[number] {
  const seuil = QUICK_SEUILS.find(s => score >= s.min && score <= s.max);
  if (!seuil) throw new Error(`Score de vulnérabilité hors bornes : ${score}`);
  return seuil;
}

// Les 8 fiches de remédiation. Clés exactes avec tiret cadratin, ne pas les modifier.
// Le champ vulnerabilite (1/5 = fiche la plus robuste) sert au tri des recommandations.
export const FICHES: Record<string, Fiche> = {
  "Fiche 1 — Projet de recherche appliquée": {
    id: 1,
    name: "Projet de recherche appliquée",
    format: "Projet individuel ou binôme, livrable écrit + soutenance",
    duree: "12-16 semaines",
    vulnerabilite: "5/5",
    publics: "BTS, Licence Pro, M1-M2",
    principe: "Identifier une problématique terrain, collecte de données et analyse.",
    adaptations: ["Jalons intermédiaires", "Journal de bord", "Soutenance finale"],
    charge: "20-25h pour 30 apprenant·es"
  },
  "Fiche 2 — Étude de cas complexe": {
    id: 2,
    name: "Étude de cas complexe",
    format: "Analyse individuelle ou groupe, livrable écrit + restitution",
    duree: "1-4 semaines",
    vulnerabilite: "4/5",
    publics: "Tous niveaux",
    principe: "Analyse d'un cas professionnel réel avec données spécifiques.",
    adaptations: ["Contexte local", "Variable imprévisible", "Clarification orale"],
    charge: "8-12h pour 30 apprenant·es"
  },
  "Fiche 3 — Production multimodale": {
    id: 3,
    name: "Production multimodale",
    format: "Vidéo, podcast, infographie avec présence physique",
    duree: "2-6 semaines",
    vulnerabilite: "3/5",
    publics: "Communication, marketing, management",
    principe: "Combinaison de formats avec présence de l'apprenant·e.",
    adaptations: ["3 min présence écran", "Lieu lié au projet", "Objet personnel"],
    charge: "10-15h pour 30 apprenant·es"
  },
  "Fiche 4 — Portfolio réflexif avec processus documenté": {
    id: 4,
    name: "Portfolio réflexif",
    format: "Dossier évolutif, traces documentées + réflexion",
    duree: "6-16 semaines",
    vulnerabilite: "2/5",
    publics: "Master, licences pro, alternance",
    principe: "Documenter le processus avec versions successives et traces IA.",
    adaptations: ["Section Produit", "Section Processus", "Section Propos"],
    charge: "20-25h pour 30 apprenant·es"
  },
  "Fiche 5 — Soutenance orale sans écrit préalable": {
    id: 5,
    name: "Soutenance orale",
    format: "Examen oral individuel, sans document",
    duree: "10-30 minutes",
    vulnerabilite: "1/5",
    publics: "Tous niveaux",
    principe: "Défense de travaux ou questions sur programme en direct.",
    adaptations: ["Viva voce", "Entretien de compétences"],
    charge: "5h pour 30 apprenant·es"
  },
  "Fiche 6 — Simulation professionnelle filmée": {
    id: 6,
    name: "Simulation professionnelle filmée",
    format: "Mise en situation reconstituée, filmée",
    duree: "15-30 min + débriefing",
    vulnerabilite: "1/5",
    publics: "RH, santé, commerce, management",
    principe: "Situation professionnelle avec élément imprévu le jour J.",
    adaptations: ["Élément imprévu", "Débriefing immédiat", "Auto-analyse"],
    charge: "12-15h pour 30 apprenant·es"
  },
  "Fiche 7 — Évaluation par les pairs structurée": {
    id: 7,
    name: "Évaluation par les pairs",
    format: "Évaluation croisée critériée avec calibration",
    duree: "3 séances",
    vulnerabilite: "2/5",
    publics: "Tous niveaux",
    principe: "Évaluer 3 productions anonymes selon une grille explicite.",
    adaptations: ["Séance calibration", "Note feedbacks", "Débriefing formateur·rice"],
    charge: "6-8h pour 30 apprenant·es"
  },
  "Fiche 8 — Auto-évaluation justifiée": {
    id: 8,
    name: "Auto-évaluation justifiée",
    format: "Auto-notation critériée avec justification",
    duree: "2-3h + entretien",
    vulnerabilite: "2/5",
    publics: "Apprenant·es avancé·es",
    principe: "S'attribuer un score avec renvois précis au travail.",
    adaptations: ["Entretien confrontation", "Justification écrite"],
    charge: "8-10h pour 30 apprenant·es"
  }
};
