
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

export async function auditConsigne(consigne: string, contextAnswers: any) {
  // Initialisation du client avec la clé d'environnement
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
  ANALYSE DE CONSIGNE PEDAGOGIQUE :
  "${consigne}"

  CONTEXTE DE L'EVALUATION :
  - Modalité de passage : ${contextAnswers.synchrone}
  - Nature des données : ${contextAnswers.donnees}
  - Évaluation du processus : ${contextAnswers.processus}

  Instructions : Produire un audit pédagogique rigoureux au format JSON selon le schéma défini.
  Assurez-vous que le score_total est bien la somme des 4 dimensions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Passage sur le modèle Pro pour plus de fiabilité sur le raisonnement
      contents: prompt, // Utilisation d'une chaîne directe pour plus de robustesse
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reproductibilite: { type: Type.INTEGER, description: "Score de 0 à 3" },
            contextualisation: { type: Type.INTEGER, description: "Score de 0 à 3" },
            tacitite: { type: Type.INTEGER, description: "Score de 0 à 3" },
            multimodalite: { type: Type.INTEGER, description: "Score de 0 à 3" },
            score_total: { type: Type.INTEGER },
            statut: { 
              type: Type.STRING, 
              description: "Must be exactly: Robuste, Vulnérabilité modérée, Vulnérabilité élevée, or Vulnérabilité critique" 
            },
            points_vigilance: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommandations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  fiche: { type: Type.STRING }
                },
                required: ["action", "fiche"]
              }
            },
            justifications: {
              type: Type.OBJECT,
              properties: {
                reproductibilite: { type: Type.STRING },
                contextualisation: { type: Type.STRING },
                tacitite: { type: Type.STRING },
                multimodalite: { type: Type.STRING }
              }
            }
          },
          required: [
            "reproductibilite", 
            "contextualisation", 
            "tacitite", 
            "multimodalite", 
            "score_total", 
            "statut", 
            "points_vigilance", 
            "recommandations",
            "justifications"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Le moteur d'IA n'a pas renvoyé de contenu.");
    }
    
    // Nettoyage éventuel si l'IA a inclus des backticks markdown (bien que responseMimeType: "application/json" l'empêche normalement)
    const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Erreur détaillée de l'API Gemini:", error);
    
    // Gestion spécifique des erreurs courantes
    if (error.message?.includes("API key")) {
      throw new Error("Clé API invalide ou manquante.");
    }
    if (error.message?.includes("safety")) {
      throw new Error("Le contenu a été bloqué par les filtres de sécurité.");
    }
    
    throw new Error(error.message || "Erreur de communication avec l'IA.");
  }
}
