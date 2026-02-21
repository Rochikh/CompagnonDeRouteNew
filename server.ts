import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "./constants";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Route for auditing
app.post("/api/audit", async (req, res) => {
  const { consigne, contextAnswers } = req.body;

  if (!consigne || !contextAnswers) {
    return res.status(400).json({ error: "Missing consigne or contextAnswers" });
  }

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
   - 0-3 : "Robuste"
   - 4-6 : "Vulnérabilité modérée"
   - 7-9 : "Vulnérabilité élevée"
   - 10-12 : "Vulnérabilité critique"
`;

    // Utilisation de gemini-3-pro-preview comme demandé initialement
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            reproductibilite: { type: "INTEGER" as any },
            contextualisation: { type: "INTEGER" as any },
            tacitite: { type: "INTEGER" as any },
            multimodalite: { type: "INTEGER" as any },
            score_total: { type: "INTEGER" as any },
            statut: { type: "STRING" as any },
            points_vigilance: {
              type: "ARRAY" as any,
              items: { type: "STRING" as any }
            },
            recommandations: {
              type: "ARRAY" as any,
              items: {
                type: "OBJECT" as any,
                properties: {
                  action: { type: "STRING" as any },
                  fiche: { type: "STRING" as any }
                },
                required: ["action", "fiche"]
              }
            },
            justifications: {
              type: "OBJECT" as any,
              properties: {
                reproductibilite: { type: "STRING" as any },
                contextualisation: { type: "STRING" as any },
                tacitite: { type: "STRING" as any },
                multimodalite: { type: "STRING" as any }
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

    res.json(result);

  } catch (error: any) {
    console.error("Erreur Gemini Server:", error);
    res.status(500).json({ error: error.message || "Erreur interne du serveur lors de l'analyse." });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  // Serve static files in production (if built)
  app.use(express.static("dist"));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
