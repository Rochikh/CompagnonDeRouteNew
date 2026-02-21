import { GoogleGenAI, Type } from "@google/genai";

// Inline constant to avoid import resolution issues in serverless environment
const SYSTEM_PROMPT = `Tu es l'expert·e en pédagogie "Compagnon de route", spécialisé·e dans l'audit des évaluations face à l'IA générative.
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

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  try {
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

    // Body parsing safety
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { consigne, contextAnswers } = body || {};

    if (!consigne || !contextAnswers) {
      return res.status(400).json({ error: "Missing consigne or contextAnswers" });
    }

    // Support multiple environment variable names for the API Key
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      console.error("API Key is missing on server.");
      return res.status(500).json({ error: "Server configuration error: API Key missing." });
    }

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
    // Ensure we always return JSON
    res.status(500).json({ error: error.message || "Erreur interne du serveur lors de l'analyse." });
  }
}
