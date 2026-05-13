// Inline constant to avoid import resolution issues in serverless environment
const SYSTEM_PROMPT = {
  fr: `Tu es l'expert·e en pédagogie "Compagnon de route", spécialisé·e dans l'audit des évaluations face à l'IA générative.
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
- Les noms des fiches DOIVENT correspondre exactement à ces clés : "Fiche 1 — Projet de recherche appliquée", "Fiche 2 — Étude de cas complexe", "Fiche 3 — Production multimodale", "Fiche 4 — Portfolio réflexif avec processus documenté", "Fiche 5 — Soutenance orale sans écrit préalable", "Fiche 6 — Simulation professionnelle filmée", "Fiche 7 — Évaluation par les pairs structurée", "Fiche 8 — Auto-évaluation justifiée".
`,
  en: `You are the pedagogical expert "Journey Companion", specialized in auditing assessments against generative AI.
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
`
};

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

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  try {
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

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { consigne, contextAnswers, language = 'fr' } = body || {};

    if (!consigne || !contextAnswers) {
      return res.status(400).json({ error: "Missing consigne or contextAnswers" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      console.error("API Key is missing on server.");
      return res.status(500).json({ error: "Server configuration error: API Key missing." });
    }

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
            content: (SYSTEM_PROMPT[language as keyof typeof SYSTEM_PROMPT] || SYSTEM_PROMPT.fr)
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

    res.status(200).json(result);

  } catch (error: any) {
    console.error("Erreur OpenRouter Server:", error);
    res.status(500).json({ error: error.message || "Erreur interne du serveur lors de l'analyse." });
  }
}
