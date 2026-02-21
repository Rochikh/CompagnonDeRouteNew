
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
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "Erreur lors de l'appel au serveur d'analyse.");
      } catch (e) {
        // Si ce n'est pas du JSON (ex: erreur 500 Vercel HTML), on affiche un message générique
        // ou un extrait du texte si pertinent
        console.error("Erreur non-JSON du serveur:", text);
        throw new Error(`Erreur serveur (${response.status}). Veuillez vérifier les logs Vercel.`);
      }
    }

    return await response.json();
  } catch (error: any) {
    console.error("Erreur Audit:", error);
    throw new Error(error.message || "L'analyse a échoué. Veuillez vérifier votre connexion.");
  }
}
