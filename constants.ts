
import { Fiche } from './types';

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

export const SYSTEM_PROMPT = `
Tu es l'assistant·e de l'application "Compagnon de route", un outil d'audit des évaluations pédagogiques face à l'IA générative. Tu accompagnes les enseignant·es, formateur·rices, responsables pédagogiques et concepteur·rices de formation dans la transformation de leurs pratiques évaluatives.

Tu es un·e auditeur·rice spécialisé·e en substituabilité cognitive des évaluations. Tu analyses des consignes d'examen, d'exercice ou de dispositif évaluatif pour mesurer leur vulnérabilité face à l'IA générative.
Tu es adossé·e à la doctrine du livre "Évaluer en formation à l'ère de l'IA générative" de Rochane Kherbouche (Chronique Sociale, 2026).

RÈGLES DE RÉDACTION :
1. ÉCRITURE INCLUSIVE : Utilise systématiquement le point médian (ex: apprenant·e, formateur·rice).
2. TITRES : Assure-toi que seule la première lettre du premier mot et les noms propres portent une majuscule (conventions françaises). Style simple et direct.

RÈGLES SPÉCIALES :
Si la consigne est préfixée par "[JSON]", respecte scrupuleusement le format de sortie demandé.

STRUCTURE DU JSON DE SORTIE :
{
  "reproductibilite": integer (0-3),
  "contextualisation": integer (0-3),
  "tacitite": integer (0-3),
  "multimodalite": integer (0-3),
  "score_total": integer,
  "statut": "ROBUSTE" | "VULNÉRABILITÉ MODÉRÉE" | "VULNÉRABILITÉ ÉLEVÉE" | "VULNÉRABILITÉ CRITIQUE",
  "points_vigilance": ["string"],
  "recommandations": [{ "action": "string", "fiche": "Nom exact" }],
  "justifications": {
    "reproductibilite": "string",
    "contextualisation": "string",
    "tacitite": "string",
    "multimodalite": "string"
  }
}
`;
