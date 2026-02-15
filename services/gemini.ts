
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

// Fonction utilitaire pour récupérer la clé API depuis diverses sources d'environnement
export function getSystemApiKey(): string | undefined {
  // 1. Essayer Vite (standard pour les SPA modernes)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  
  // 2. Essayer Next.js ou Create React App
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NEXT_PUBLIC_API_KEY) return process.env.NEXT_PUBLIC_API_KEY;
    if (process.env.REACT_APP_API_KEY) return process.env.REACT_APP_API_KEY;
    if (process.env.API_KEY) return process.env.API_KEY;
  }

  return undefined;
}

// Fonction pour auditer une consigne avec l'IA Gemini
export async function auditConsigne(consigne: string, contextAnswers: any, userApiKey?: string) {
  
  // Priorité : 
  // 1. Clé utilisateur (saisie manuelle)
  // 2. Clé système (variable d'environnement exposée)
  const systemKey = getSystemApiKey();
  const apiKey = userApiKey || systemKey;
  
  if (!apiKey) {
    throw new Error("Aucune clé API détectée. L'administrateur doit configurer une clé (VITE_API_KEY) ou vous devez en saisir une manuellement.");
  }

  // Initialisation du client
  const ai = new GoogleGenAI({ apiKey });
  
  const userPrompt = `
ANALYSE REQUISE POUR LA CONSIGNE :
"${consigne}"

CONTEXTE DE L'ÉVALUATION :
- Modalité : ${contextAnswers.synchrone}
- Données : ${contextAnswers.donnees}
- Processus : ${contextAnswers.processus}

INSTRUCTIONS DE CALCUL :
1. Attribue un score de 0 à 3 pour chaque dimension (Reproductibilité, Contextualisation, Tacitité, Multimodalité).
2. Le score_total DOIT être la somme exacte de ces 4 notes (0 à 12).
3. Détermine le statut selon le score_total :
   - 10-12 : "Robuste"
   - 7-9 : "Vulnérabilité modérée"
   - 4-6 : "Vulnérabilité élevée"
   - 0-3 : "Vulnérabilité critique"
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reproductibilite: { type: Type.INTEGER },
            contextualisation: { type: Type.INTEGER },
            tacitite: { type: Type.INTEGER },
            multimodalite: { type: Type.INTEGER },
            score_total: { type: Type.INTEGER },
            statut: { type: Type.STRING },
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
          required: ["reproductibilite", "contextualisation", "tacitite", "multimodalite", "score_total", "statut", "points_vigilance", "recommandations"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Le moteur d'IA n'a pas renvoyé de données.");
    
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanJson);
    }
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    // On propage l'erreur pour la gérer dans l'UI (ex: clé invalide)
    if (error.message?.includes("API key")) {
        throw new Error("Clé API invalide ou quota dépassé.");
    }
    throw new Error(error.message || "L'analyse a échoué. Vérifiez votre connexion.");
  }
}
