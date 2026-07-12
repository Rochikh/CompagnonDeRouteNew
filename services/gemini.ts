import { DIMENSIONS } from '../lib/doctrine';
import { AuditReport, ContextAnswers } from '../types';

// Garde-fou léger : la validation stricte du contrat est faite côté serveur (lib/auditCore),
// on vérifie seulement ici que la forme générale est présente avant de la donner à l'UI.
function looksLikeAuditReport(data: any): data is AuditReport {
  return !!data
    && DIMENSIONS.every(d => Number.isInteger(data.dimensions?.[d.key]?.note))
    && typeof data.score_robustesse === 'number'
    && typeof data.statut === 'string'
    && typeof data.stress_test?.verdict === 'string'
    && Array.isArray(data.points_vigilance)
    && Array.isArray(data.recommandations);
}

// Fonction pour auditer une consigne via le backend (pour sécuriser la clé API)
export async function auditConsigne(consigne: string, contextAnswers: ContextAnswers): Promise<AuditReport> {
  try {
    // Chemin relatif : résolu contre l'URL de la page, donc /api/audit en prod
    // (app servie à la racine) et /absproxy/3000/api/audit sous le proxy code-server.
    const response = await fetch('api/audit', {
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

    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Réponse invalide:", text);
      throw new Error("Le serveur a renvoyé une réponse invalide (non-JSON).");
    }

    if (!looksLikeAuditReport(data)) {
      console.error("Rapport incomplet:", data);
      throw new Error("Le serveur a renvoyé un rapport incomplet. Relancez l'audit.");
    }
    return data;
  } catch (error: any) {
    console.error("Erreur Audit:", error);
    throw new Error(error.message || "L'analyse a échoué. Veuillez vérifier votre connexion.");
  }
}
