
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";

// Fonction pour auditer une consigne avec l'IA Gemini
export async function auditConsigne(consigne: string, contextAnswers: any) {
  // On récupère la clé depuis l'environnement (injectée ou sélectionnée via le dialogue)
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Clé API non configurée. Veuillez cliquer sur 'Activer l'accès' en haut de page.");
  }

  // Initialisation du client avec la clé la plus récente
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Passage au modèle Pro pour une meilleure analyse doctrinale (tâche complexe)
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
    
    // Parsing sécurisé du JSON retourné par le modèle
    try {
      return JSON.parse(text.trim());
    } catch (e) {
      // Nettoyage en cas de blocs de code markdown inclus par erreur
      const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanJson);
    }
  } catch (error: any) {
    console.error("Erreur Gemini:", error);
    throw new Error(error.message || "L'analyse a échoué. Vérifiez votre connexion.");
  }
}
