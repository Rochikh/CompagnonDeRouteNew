import { DIMENSIONS } from '../lib/doctrine';
import { AuditReport, ContextAnswers, RapportTraduit } from '../types';
import { t } from '../texts';

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

// Réduction avant envoi : DeepSeek rééchantillonne vers 800 px environ, 1600 px
// de grand côté conserve un facteur 2 de marge (banc du 02/09/2026) pour un
// poids divisé par trois.
const MAX_COTE_PX = 1600;
const JPEG_QUALITE = 0.85;

async function reduireImage(fichier: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(fichier);
  } catch {
    throw new Error(t.transcriptionFichierInvalide);
  }
  const ratio = Math.min(1, MAX_COTE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', JPEG_QUALITE);
}

// Transcription d'une image de consigne par le serveur (route distincte de l'audit).
export async function transcrireImage(fichier: File): Promise<string> {
  // HEIC/HEIF d'iPhone : le type MIME peut être vide, l'extension fait foi.
  if (/^image\/hei[cf]$/.test(fichier.type) || /\.hei[cf]$/i.test(fichier.name)) {
    throw new Error(t.transcriptionHeic);
  }
  if (!fichier.type.startsWith('image/')) throw new Error(t.transcriptionFichierInvalide);
  const image = await reduireImage(fichier);

  const response = await fetch('api/transcription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }),
  });
  // Corps refusé par le parseur avant la route : réponse hors JSON.
  if (response.status === 413) throw new Error(t.transcriptionTropLourde);

  let data: any;
  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new Error(t.transcriptionEchec);
  }
  if (!response.ok) throw new Error(data?.error || t.transcriptionEchec);
  if (typeof data?.texte !== 'string' || !data.texte.trim()) throw new Error(t.transcriptionEchec);
  return data.texte;
}

// Traduction du rapport pour l'affichage (route distincte, le rapport français ne change pas).
export async function traduireRapport(rapport: AuditReport, langue: string): Promise<RapportTraduit> {
  const response = await fetch('api/traduction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rapport, langue }),
  });
  let data: any;
  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new Error(t.traductionEchec);
  }
  if (!response.ok) throw new Error(data?.error || t.traductionEchec);
  if (!looksLikeAuditReport(data?.rapport) || !data?.libelles?.dimensions || !data?.libelles?.fiches) {
    throw new Error(t.traductionEchec);
  }
  return data;
}
