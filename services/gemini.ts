
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

export async function auditConsigne(consigne: string, contextAnswers: any) {
  // On ré-initialise l'instance pour s'assurer d'avoir la clé à jour
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const userPrompt = `
AUDIT DE LA CONSIGNE SUIVANTE :
"${consigne}"

INFORMATIONS CONTEXTUELLES FOURNIES PAR L'ENSEIGNANT·E :
- Présence/Synchrone : ${contextAnswers.synchrone}
- Nature des données : ${contextAnswers.donnees}
- Évaluation du processus : ${contextAnswers.processus}

EXIGENCE : Produis un audit technique complet au format JSON.
Le score_total doit être la somme exacte de : reproductibilite + contextualisation + tacitite + multimodalite (max 12).
Le statut est déterminé par le score :
- 10-12 : Robuste
- 7-9 : Vulnérabilité modérée
- 4-6 : Vulnérabilité élevée
- 0-3 : Vulnérabilité critique
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash est plus rapide pour éviter le "spin" infini
      contents: [{ parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reproductibilite: { type: Type.INTEGER, description: "Score de 0 à 3" },
            contextualisation: { type: Type.INTEGER, description: "Score de 0 à 3" },
            tacitite: { type: Type.INTEGER, description: "Score de 0 à 3" },
            multimodalite: { type: Type.INTEGER, description: "Score de 0 à 3" },
            score_total: { type: Type.INTEGER },
            statut: { 
              type: Type.STRING, 
              description: "Valeur obligatoire : 'Robuste', 'Vulnérabilité modérée', 'Vulnérabilité élevée' ou 'Vulnérabilité critique'" 
            },
            points_vigilance: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Liste des risques identifiés"
            },
            recommandations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING },
                  fiche: { type: Type.STRING, description: "Nom complet de la fiche, ex: 'Fiche 5 — Soutenance orale sans écrit préalable'" }
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
              },
              required: ["reproductibilite", "contextualisation", "tacitite", "multimodalite"]
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

    const resultText = response.text;
    if (!resultText) {
      throw new Error("L'IA n'a retourné aucune réponse.");
    }

    // On s'assure que c'est du JSON pur (certains modèles peuvent ajouter des délimiteurs malgré la config)
    const jsonStr = resultText.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Erreur lors de l'analyse. Vérifiez votre connexion.");
  }
}
