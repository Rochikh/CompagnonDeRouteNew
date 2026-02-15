
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

export async function auditConsigne(consigne: string, contextAnswers: any) {
  // On initialise le client directement avec la clé de l'environnement
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
  ANALYSE DE CONSIGNE :
  "${consigne}"

  CONTEXTE :
  - Modalité : ${contextAnswers.synchrone}
  - Données : ${contextAnswers.donnees}
  - Processus : ${contextAnswers.processus}

  Instructions : Produire un audit pédagogique rigoureux en format JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
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
    if (!text) throw new Error("Aucune réponse reçue du moteur d'analyse.");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Détails de l'erreur Gemini:", error);
    // On propage une erreur plus descriptive
    throw new Error(error.message || "Erreur de communication avec l'IA.");
  }
}
