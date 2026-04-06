
import { Fiche } from './types';

export const FICHES: Record<string, Record<string, Fiche>> = {
  fr: {
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
  },
  en: {
    "Fiche 1 — Projet de recherche appliquée": {
      id: 1,
      name: "Applied Research Project",
      format: "Individual or pair project, written deliverable + defense",
      duree: "12-16 weeks",
      vulnerabilite: "5/5",
      publics: "BTS, Pro License, M1-M2",
      principe: "Identify a field issue, data collection and analysis.",
      adaptations: ["Intermediate milestones", "Logbook", "Final defense"],
      charge: "20-25h for 30 learners"
    },
    "Fiche 2 — Étude de cas complexe": {
      id: 2,
      name: "Complex Case Study",
      format: "Individual or group analysis, written deliverable + restitution",
      duree: "1-4 weeks",
      vulnerabilite: "4/5",
      publics: "All levels",
      principe: "Analysis of a real professional case with specific data.",
      adaptations: ["Local context", "Unpredictable variable", "Oral clarification"],
      charge: "8-12h for 30 learners"
    },
    "Fiche 3 — Production multimodale": {
      id: 3,
      name: "Multimodal Production",
      format: "Video, podcast, infographic with physical presence",
      duree: "2-6 weeks",
      vulnerabilite: "3/5",
      publics: "Communication, marketing, management",
      principe: "Combination of formats with learner's presence.",
      adaptations: ["3 min screen presence", "Project-related location", "Personal object"],
      charge: "10-15h for 30 learners"
    },
    "Fiche 4 — Portfolio réflexif avec processus documenté": {
      id: 4,
      name: "Reflective Portfolio",
      format: "Evolving folder, documented traces + reflection",
      duree: "6-16 weeks",
      vulnerabilite: "2/5",
      publics: "Master, pro licenses, work-study",
      principe: "Document the process with successive versions and AI traces.",
      adaptations: ["Product Section", "Process Section", "Purpose Section"],
      charge: "20-25h for 30 learners"
    },
    "Fiche 5 — Soutenance orale sans écrit préalable": {
      id: 5,
      name: "Oral Defense",
      format: "Individual oral exam, without document",
      duree: "10-30 minutes",
      vulnerabilite: "1/5",
      publics: "All levels",
      principe: "Defense of work or questions on live program.",
      adaptations: ["Viva voce", "Skills interview"],
      charge: "5h for 30 learners"
    },
    "Fiche 6 — Simulation professionnelle filmée": {
      id: 6,
      name: "Filmed Professional Simulation",
      format: "Reconstructed situation, filmed",
      duree: "15-30 min + debriefing",
      vulnerabilite: "1/5",
      publics: "HR, health, commerce, management",
      principe: "Professional situation with unforeseen element on D-Day.",
      adaptations: ["Unforeseen element", "Immediate debriefing", "Self-analysis"],
      charge: "12-15h for 30 learners"
    },
    "Fiche 7 — Évaluation par les pairs structurée": {
      id: 7,
      name: "Structured Peer Assessment",
      format: "Cross-evaluation with criteria and calibration",
      duree: "3 sessions",
      vulnerabilite: "2/5",
      publics: "All levels",
      principe: "Evaluate 3 anonymous productions according to an explicit grid.",
      adaptations: ["Calibration session", "Feedback grade", "Trainer debriefing"],
      charge: "6-8h for 30 learners"
    },
    "Fiche 8 — Auto-évaluation justifiée": {
      id: 8,
      name: "Justified Self-Assessment",
      format: "Self-scoring with criteria and justification",
      duree: "2-3h + interview",
      vulnerabilite: "2/5",
      publics: "Advanced learners",
      principe: "Assign a score with precise references to the work.",
      adaptations: ["Confrontation interview", "Written justification"],
      charge: "8-10h for 30 learners"
    }
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
