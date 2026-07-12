
// Fonction pour auditer une consigne via le backend (pour sécuriser la clé API)
export async function auditConsigne(consigne: string, contextAnswers: any) {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ consigne, contextAnswers }),
    });

    const text = await response.text();
    
    if (!response.ok) {
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Erreur lors de l'appel au serveur d'analyse.");
      } catch (e) {
        // Si ce n'est pas du JSON (ex: erreur 500/504 Vercel HTML)
        console.error("Erreur non-JSON du serveur:", text);
        if (text.includes("timeout") || response.status === 504) {
          throw new Error("Le serveur a mis trop de temps à répondre (Timeout). L'analyse est trop complexe.");
        }
        throw new Error(`Erreur serveur (${response.status}). Le service est temporairement indisponible.`);
      }
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Réponse invalide:", text);
      throw new Error("Le serveur a renvoyé une réponse invalide (non-JSON).");
    }
  } catch (error: any) {
    console.error("Erreur Audit:", error);
    throw new Error(error.message || "L'analyse a échoué. Veuillez vérifier votre connexion.");
  }
}
