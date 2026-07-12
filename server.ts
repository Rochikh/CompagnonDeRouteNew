import express from "express";
import { createServer as createViteServer } from "vite";
import { FICHES } from "./lib/doctrine";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const FICHE_KEYS = Object.keys(FICHES).map(k => `"${k}"`).join(", ");

const SYSTEM_PROMPT = `Tu es l'expert·e en pédagogie "Compagnon de route", spécialisé·e dans l'audit des évaluations face à l'IA générative.
Ta mission est d'analyser la robustesse d'une consigne d'évaluation en te basant sur la doctrine de Rochane Kherbouche (2026).

DOCTRINE D'ANALYSE (échelle de VULNÉRABILITÉ : 0 = robuste contre l'IA, 3 = vulnérable à l'IA) :
1. Reproductibilité : Capacité de l'IA à produire un résultat recevable à partir de la consigne brute (0=IA incapable / consigne robuste, 3=IA parfaite / consigne reproductible).
2. Contextualisation : Degré d'ancrage dans des données locales, personnelles ou non documentées en ligne (0=Ultra-spécifique / robuste, 3=Générique / vulnérable).
3. Tacitité : Présence de dimensions métacognitives ou de justification orale des choix (0=Réflexivité forte / robuste, 3=Produit pur / vulnérable).
4. Multimodalité : Diversité des supports et composante synchrone/physique (0=Présence physique ou synchrone / robuste, 3=Texte asynchrone / vulnérable).

RÈGLE D'AGRÉGATION : score_total = somme des 4 dimensions (0 à 12). Plus le total est élevé, plus la consigne est vulnérable à l'IA.

TON ANALYSE DOIT :
- Utiliser l'écriture inclusive (point médian).
- Être rigoureuse et ne pas hésiter à pointer les vulnérabilités réelles.
- Recommander des actions concrètes liées aux fiches de remédiation.
- Les noms des fiches DOIVENT correspondre exactement à ces clés : ${FICHE_KEYS}.
`;

const JSON_FORMAT_INSTRUCTION_FR = `

FORMAT DE SORTIE :
Tu DOIS répondre exclusivement avec un objet JSON valide (sans texte autour, sans bloc markdown) avec EXACTEMENT cette structure :
{
  "reproductibilite": <entier 0-3>,
  "contextualisation": <entier 0-3>,
  "tacitite": <entier 0-3>,
  "multimodalite": <entier 0-3>,
  "score_total": <entier 0-12, somme exacte des 4 notes>,
  "statut": <chaîne>,
  "points_vigilance": [<chaînes>],
  "recommandations": [{"action": <chaîne>, "fiche": <clé exacte de fiche>}],
  "justifications": {
    "reproductibilite": <chaîne>,
    "contextualisation": <chaîne>,
    "tacitite": <chaîne>,
    "multimodalite": <chaîne>
  }
}
`;

const SYSTEM_PROMPT_EN = `You are the pedagogical expert "Journey Companion", specialized in auditing assessments against generative AI.
Your mission is to analyze the robustness of an assessment prompt based on Rochane Kherbouche's doctrine (2026).

ANALYSIS DOCTRINE (VULNERABILITY scale: 0 = robust against AI, 3 = vulnerable to AI):
1. Reproducibility: AI's ability to produce an acceptable result from the raw prompt (0=Incapable AI / robust prompt, 3=Perfect AI / reproducible prompt).
2. Contextualization: Degree of anchoring in local, personal, or non-online documented data (0=Ultra-specific / robust, 3=Generic / vulnerable).
3. Tacitness: Presence of metacognitive dimensions or oral justification of choices (0=Strong reflexivity / robust, 3=Pure product / vulnerable).
4. Multimodality: Diversity of media and synchronous/physical component (0=Physical or synchronous presence / robust, 3=Asynchronous text / vulnerable).

AGGREGATION RULE: score_total = sum of the 4 dimensions (0 to 12). The higher the total, the more vulnerable the assessment is to AI.

YOUR ANALYSIS MUST:
- Be rigorous and not hesitate to point out real vulnerabilities.
- Recommend concrete actions linked to the remediation sheets.
- The names of the sheets MUST exactly match these keys: ${FICHE_KEYS}.
- CRITICAL: You MUST write your entire response (points_vigilance, action descriptions, justifications) in ENGLISH, regardless of the language of the prompt.

OUTPUT FORMAT:
You MUST respond ONLY with a valid JSON object (no surrounding text, no markdown fences) following EXACTLY this structure:
{
  "reproductibilite": <int 0-3>,
  "contextualisation": <int 0-3>,
  "tacitite": <int 0-3>,
  "multimodalite": <int 0-3>,
  "score_total": <int 0-12, exact sum of the 4 scores>,
  "statut": <string>,
  "points_vigilance": [<strings>],
  "recommandations": [{"action": <string>, "fiche": <exact sheet key>}],
  "justifications": {
    "reproductibilite": <string>,
    "contextualisation": <string>,
    "tacitite": <string>,
    "multimodalite": <string>
  }
}
`;

app.use(express.json());

app.post("/api/audit", async (req, res) => {
  const { consigne, contextAnswers, language = 'fr' } = req.body;

  if (!consigne || !contextAnswers) {
    return res.status(400).json({ error: "Missing consigne or contextAnswers" });
  }

  const rawApiKey = process.env.OPENROUTER_API_KEY;
  const apiKey = rawApiKey
    ? rawApiKey.trim().replace(/^['"]|['"]$/g, "").trim()
    : "";

  if (!apiKey) {
    console.error("API Key is missing on server.");
    return res.status(500).json({
      error: "Server configuration error: OpenRouter API key missing. Add OPENROUTER_API_KEY to your .env file and restart the dev server."
    });
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
`;

    const systemInstruction = language === 'en'
      ? SYSTEM_PROMPT_EN
      : SYSTEM_PROMPT + JSON_FORMAT_INSTRUCTION_FR;

    const orResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Compagnon de route"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!orResponse.ok) {
      const errBody = await orResponse.text();
      console.error(`OpenRouter ${orResponse.status}:`, errBody);

      if (orResponse.status === 401 || orResponse.status === 403) {
        return res.status(500).json({
          error: "OpenRouter rejected the API key. Generate a key at https://openrouter.ai/keys and update OPENROUTER_API_KEY."
        });
      }

      if (orResponse.status === 402) {
        return res.status(500).json({
          error: "OpenRouter credit/quota exhausted for this key. Top up at https://openrouter.ai/credits or switch the key."
        });
      }

      return res.status(500).json({
        error: `OpenRouter error (${orResponse.status}): ${errBody.slice(0, 300)}`
      });
    }

    const data: any = await orResponse.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
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
    console.error("Erreur audit:", error);
    res.status(500).json({ error: error?.message || "Erreur interne du serveur lors de l'analyse." });
  }
});

if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
