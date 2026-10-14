# Banc de mesure de l'audit

Trois consignes de référence (`consignes/`), leurs réponses de contexte et le
score attendu dans `consignes.json`. Le banc appelle `POST /api/audit` du
serveur déployé ; le fournisseur dépend de `AUDIT_PROVIDER` dans
`/root/infra/env/compagnon.env` (`deepseek` ou `claude`), suivi de
`docker compose -f /root/docker-compose.yml up -d compagnon`.

    npx tsx bench/banc.ts --label claude            # 5 runs par consigne
    npx tsx bench/banc.ts --only cegep --runs 3

Sortie : tableau par consigne (médiane /12, notes R/C/T/M médianes, écart
type, durée médiane) et rapports bruts dans `resultats/` pour relire les
justifications. Tokens, cache et durée serveur se lisent dans les logs du
conteneur, une ligne par appel Claude :

    docker logs compagnon --since 2026-10-14T10:00:00 2>&1 | grep 'Audit Claude'

Référence du 14/10/2026 (5 runs par consigne) : médianes 10 / 0 / 7 pour
BTS MCO / Moodle / cégep, identiques pour DeepSeek (V4.1-Flash, raisonnement)
et Claude Opus 5.5 (effort high).
