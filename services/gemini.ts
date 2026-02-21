
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erreur lors de l'appel au serveur d'analyse.");
    }

    return await response.json();
  } catch (error: any) {
    console.error("Erreur Audit:", error);
    throw new Error(error.message || "L'analyse a échoué. Veuillez vérifier votre connexion.");
  }
}
