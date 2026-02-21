import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { consigne, contextAnswers } = req.body;

  if (!consigne || !contextAnswers) {
    return res.status(400).json({ error: "Missing consigne or contextAnswers" });
  }

  // Support multiple environment variable names for the API Key
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    console.error("API Key is missing on server.");
    return res.status(500).json({ error: "Server configuration error: API Key missing." });
  }

  try {
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
    
    let result;
    try {
      result = JSON.parse(text.trim());
    } catch (e) {
      const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanJson);
    }

    res.status(200).json(result);

  } catch (error: any) {
    console.error("Erreur Gemini Server:", error);
    res.status(500).json({ error: error.message || "Erreur interne du serveur lors de l'analyse." });
  }
}
