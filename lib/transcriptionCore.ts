// Transcription d'une image de consigne en texte par le modèle vision DeepSeek.
// Chaîne indépendante de l'audit : aucune image ne transite par runAudit, le
// texte transcrit repasse par le textarea et la relecture de l'utilisateur·rice.

import { buildTranscriptionPrompt, TRANSCRIPTION_VIDE } from './prompt.js';
import { AuditError, DEEPSEEK_URL, deepSeekHttpError, readApiKey } from './auditCore.js';
import { MAX_CONSIGNE_CHARS } from './limites.js';

const VISION_MODEL = 'deepseek-v4-flash-vision-exp';
// Une seule tentative ; mesuré 3 à 9 s par page A4.
const TIMEOUT_MS = 60_000;
// Taille de la data URL, alignée sur la limite du parseur JSON de la route (4 Mo).
const MAX_DATA_URL_CHARS = 4 * 1024 * 1024;
const DATA_URL_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const MSG_INDISPONIBLE = "La transcription d'images est indisponible pour le moment. Saisissez la consigne au clavier.";
const MSG_ILLISIBLE = "Aucun texte lisible dans cette image. Réessayez avec une image plus nette ou saisissez la consigne au clavier.";

export async function transcrireImage(image: unknown): Promise<string> {
  if (typeof image !== 'string' || !DATA_URL_IMAGE.test(image)) {
    throw new AuditError('Fichier illisible comme image : PNG, JPEG, WebP ou GIF attendu.', 400);
  }
  if (image.length > MAX_DATA_URL_CHARS) {
    throw new AuditError('Image trop lourde après réduction, 4 Mo au maximum.', 413);
  }
  const apiKey = readApiKey();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: image, detail: 'original' } },
            { type: 'text', text: buildTranscriptionPrompt() }
          ]
        }],
        thinking: { type: 'disabled' },
        temperature: 0
      })
    });
  } catch (e) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      console.warn(`Transcription expirée après ${TIMEOUT_MS / 1000} s`);
      throw new AuditError(MSG_INDISPONIBLE, 503);
    }
    throw e;
  }

  try {
    if (!response.ok) {
      const errBody = await response.text();
      // Modèle retiré ou renommé : DeepSeek répond 404, ou 400 en nommant le modèle.
      if (response.status === 404 || (response.status === 400 && /model/i.test(errBody))) {
        console.error(`Modèle vision indisponible (DeepSeek ${response.status}):`, errBody.slice(0, 500));
        throw new AuditError(MSG_INDISPONIBLE, 503);
      }
      throw deepSeekHttpError(response.status, errBody);
    }
    const data: any = await response.json();
    const texte = String(data?.choices?.[0]?.message?.content ?? '')
      .replace(/```[a-z]*\n?|\n?```/g, '')
      .trim();
    if (!texte || texte === TRANSCRIPTION_VIDE) throw new AuditError(MSG_ILLISIBLE, 502);
    if (texte.length > MAX_CONSIGNE_CHARS) {
      throw new AuditError(`La transcription dépasse ${MAX_CONSIGNE_CHARS} caractères. Déposez une page à la fois.`, 422);
    }
    return texte;
  } finally {
    clearTimeout(timer);
  }
}
