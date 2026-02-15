
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

export async function auditConsigne(consigne: string, contextAnswers: any) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
  Voici une consigne d'évaluation à auditer :
  "${consigne}"

  Réponses au contexte :
  1. Composante synchrone : ${contextAnswers.synchrone}
  2. Données mobilisées : ${contextAnswers.donnees}
  3. Documentation du processus : ${contextAnswers.processus}

  Réalise l'audit complet selon le protocole de Rochane Kherbouche. Utilise l'écriture inclusive.
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

    let text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA générative.");
    
    // Nettoyage de la chaîne JSON au cas où l'IA inclurait des backticks Markdown
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error details:", error);
    throw error;
  }
}
