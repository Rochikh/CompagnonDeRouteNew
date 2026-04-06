import { GoogleGenAI } from "@google/genai";

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
    const { consigne, contextAnswers, language = 'fr' } = body || {};

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

    // Utilisation de gemini-3-flash-preview pour éviter les timeouts Vercel (limite de 10s en gratuit)
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT[language as keyof typeof SYSTEM_PROMPT] || SYSTEM_PROMPT.fr,
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

    res.status(200).json(result);

  } catch (error: any) {
    console.error("Erreur Gemini Server:", error);
    // Ensure we always return JSON
    res.status(500).json({ error: error.message || "Erreur interne du serveur lors de l'analyse." });
  }
}
