import { runAudit, AuditError } from "../lib/auditCore";

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { consigne, contextAnswers } = body ?? {};
  if (!consigne || !contextAnswers) {
    return res.status(400).json({ error: "Consigne ou contexte manquant dans la requête." });
  }

  try {
    res.status(200).json(await runAudit({ consigne, contextAnswers }));
  } catch (error: any) {
    console.error("Erreur audit:", error);
    const status = error instanceof AuditError ? error.status : 500;
    res.status(status).json({ error: error?.message || "Erreur interne du serveur pendant l'analyse." });
  }
}
