import express from "express";
import { createServer as createViteServer } from "vite";
import { SYSTEM_PROMPT } from "./constants";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reproductibilite: { type: "integer" },
    contextualisation: { type: "integer" },
    tacitite: { type: "integer" },
    multimodalite: { type: "integer" },
    score_total: { type: "integer" },
    statut: { type: "string" },
    points_vigilance: {
      type: "array",
      items: { type: "string" }
    },
    recommandations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          fiche: { type: "string" }
        },
        required: ["action", "fiche"],
        additionalProperties: false
      }
    },
    justifications: {
      type: "object",
      properties: {
        reproductibilite: { type: "string" },
        contextualisation: { type: "string" },
        tacitite: { type: "string" },
        multimodalite: { type: "string" }
      },
      required: ["reproductibilite", "contextualisation", "tacitite", "multimodalite"],
      additionalProperties: false
    }
  },
  required: ["reproductibilite", "contextualisation", "tacitite", "multimodalite", "score_total", "statut", "points_vigilance", "recommandations", "justifications"],
  additionalProperties: false
};

// API Route for auditing
app.post("/api/audit", async (req, res) => {
  const { consigne, contextAnswers, language = 'fr' } = req.body;

  if (!consigne || !contextAnswers) {
    return res.status(400).json({ error: "Missing consigne or contextAnswers" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing on server.");
    return res.status(500).json({ error: "Server configuration error: API Key missing." });
  }

  try {
    const userPrompt = language === 'en' ? `
REQUIRED ANALYSIS FOR THE PROMPT:
"${consigne}"

ASSESSMENT CONTEXT:
- Modality: ${contextAnswers.synchrone}
- Data: ${contextAnswers.donnees}
- Process: ${contextAnswers.processus}

CALCULATION INSTRUCTIONS:
1. Assign a score from 0 to 3 for each dimension (Reproducibility, Contextualization, Tacitness, Multimodality).
2. The score_total MUST be the exact sum of these 4 scores (0 to 12).
3. Determine the status according to the score_total:
   - 0-3: "ROBUST"
   - 4-6: "MODERATE Vulnerability"
   - 7-9: "HIGH Vulnerability"
   - 10-12: "CRITICAL Vulnerability"

CRITICAL REQUIREMENT: ALL generated text in your JSON response (except the exact sheet keys) MUST be in ENGLISH.
Respond ONLY with a valid JSON object matching the required schema, with no markdown fences or commentary.
` : `
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

Réponds UNIQUEMENT avec un objet JSON valide conforme au schéma requis, sans balises markdown ni commentaire.
`;

    const systemInstruction = language === 'en' ? `You are the pedagogical expert "Journey Companion", specialized in auditing assessments against generative AI.
Your mission is to analyze the robustness of an assessment prompt based on Rochane Kherbouche's doctrine (2026).

ANALYSIS DOCTRINE:
1. Reproducibility: AI's ability to produce an acceptable result from the raw prompt (0=Perfect AI, 3=Incapable AI).
2. Contextualization: Degree of anchoring in local, personal, or non-online documented data (0=Generic, 3=Ultra-specific).
3. Tacitness: Presence of metacognitive dimensions or oral justification of choices (0=Pure product, 3=Strong reflexivity).
4. Multimodality: Diversity of media and synchronous/physical component (0=Asynchronous text, 3=Physical/synchronous presence).

YOUR ANALYSIS MUST:
- Be rigorous and not hesitate to point out real vulnerabilities.
- Recommend concrete actions linked to the remediation sheets.
- The names of the sheets MUST exactly match these keys: "Fiche 1 — Projet de recherche appliquée", "Fiche 2 — Étude de cas complexe", "Fiche 3 — Production multimodale", "Fiche 4 — Portfolio réflexif avec processus documenté", "Fiche 5 — Soutenance orale sans écrit préalable", "Fiche 6 — Simulation professionnelle filmée", "Fiche 7 — Évaluation par les pairs structurée", "Fiche 8 — Auto-évaluation justifiée".
- CRITICAL: You MUST write your entire response (points_vigilance, action descriptions, justifications) in ENGLISH, regardless of the language of the prompt.
` : SYSTEM_PROMPT;

    const openrouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content: systemInstruction
              + "\n\nRESPONSE JSON SCHEMA (respond with a single JSON object matching this schema, no markdown):\n"
              + JSON.stringify(RESPONSE_SCHEMA),
          },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openrouterRes.ok) {
      const errText = await openrouterRes.text();
      console.error("OpenRouter error:", openrouterRes.status, errText);
      return res.status(500).json({ error: `OpenRouter error ${openrouterRes.status}: ${errText}` });
    }

    const data = await openrouterRes.json();
    const text = data?.choices?.[0]?.message?.content;
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
    console.error("Erreur OpenRouter Server:", error);
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
