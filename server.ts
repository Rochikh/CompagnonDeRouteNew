import express from "express";
import { createServer as createViteServer } from "vite";
import { rateLimit } from "express-rate-limit";
import { runAudit, AuditError } from "./lib/auditCore";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json());

// Limite de débit : 10 requêtes par IP par 10 minutes (même règle qu'Upstash avant).
const auditLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requêtes. Réessayez dans quelques minutes." },
});

// Deux chemins pour la même route : accès direct (localhost:3000) et accès via
// le proxy code-server /absproxy/3000/, qui conserve le préfixe (cf. vite.config.ts).
app.post(["/api/audit", "/absproxy/3000/api/audit"], auditLimiter, async (req, res) => {
  const { consigne, contextAnswers } = req.body ?? {};
  if (!consigne || !contextAnswers) {
    return res.status(400).json({ error: "Consigne ou contexte manquant dans la requête." });
  }
  try {
    res.json(await runAudit({ consigne, contextAnswers }));
  } catch (error: any) {
    console.error("Erreur audit:", error);
    const status = error instanceof AuditError ? error.status : 500;
    res.status(status).json({ error: error?.message || "Erreur interne du serveur pendant l'analyse." });
  }
});

if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static("dist"));
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
