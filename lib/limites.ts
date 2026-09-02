// Plafond de la consigne (texte saisi plus transcriptions cumulées), partagé
// entre le client (refus d'un ajout qui le dépasserait) et le serveur
// (refus d'une transcription qui le dépasserait). Reste sous les 100 ko du
// corps accepté par /api/audit.
export const MAX_CONSIGNE_CHARS = 20_000;
