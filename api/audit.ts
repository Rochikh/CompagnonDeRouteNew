import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { runAudit, AuditError } from "../lib/auditCore";

export const config = {
  runtime: 'nodejs',
};

// Fenêtre glissante : 10 requêtes / 10 minutes / IP. Sans variables Upstash
// (dev local), avertissement loggué et passage sans limite.
const ratelimit = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "10 m"),
      prefix: "compagnon-audit",
    })
  : null;

if (!ratelimit) {
  console.warn("Rate limiting inactif : UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN absentes de l'environnement.");
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  }

  if (ratelimit) {
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' && forwarded.split(',')[0].trim())
      || req.socket?.remoteAddress
      || 'ip-inconnue';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return res.status(429).json({
        error: "Limite atteinte : 10 audits par période de 10 minutes pour cette adresse. Patientez quelques minutes avant de relancer."
      });
    }
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
