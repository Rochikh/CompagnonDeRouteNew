import express from "express";
import { createServer as createViteServer } from "vite";
import { runAudit, AuditError } from "./lib/auditCore";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// No-op assumé : la limite Upstash (10 req / 10 min / IP) ne s'applique qu'en
// production, dans api/audit.ts.
console.warn("Rate limiting inactif en dev : /api/audit est servi sans limite de débit.");

// Deux chemins pour la même route : accès direct (localhost:3000) et accès via
// le proxy code-server /absproxy/3000/, qui conserve le préfixe (cf. vite.config.ts).
app.post(["/api/audit", "/absproxy/3000/api/audit"], async (req, res) => {
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
