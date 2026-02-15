
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

export const SYSTEM_PROMPT = `Tu es l'expert·e en pédagogie "Compagnon de route", spécialisé·e dans l'audit des évaluations face à l'IA générative.
Ta mission est d'analyser la robustesse d'une consigne d'évaluation en te basant sur la doctrine de Rochane Kherbouche (2026).

DOCTRINE D'ANALYSE :
1. Reproductibilité : Capacité de l'IA à produire un résultat recevable à partir de la consigne brute (0=IA parfaite, 3=IA incapable).
2. Contextualisation : Degré d'ancrage dans des données locales, personnelles ou non documentées en ligne (0=Générique, 3=Ultra-spécifique).
3. Tacitité : Présence de dimensions métacognitives ou de justification orale des choix (0=Produit pur, 3=Réflexivité forte).
4. Multimodalité : Diversité des supports et composante synchrone/physique (0=Texte asynchrone, 3=Présence physique/synchrone).

TON ANALYSE DOIT :
- Utiliser l'écriture inclusive (point médian).
- Être rigoureuse et ne pas hésiter à pointer les vulnérabilités réelles.
- Recommander des actions concrètes liées aux fiches de remédiation.
`;
