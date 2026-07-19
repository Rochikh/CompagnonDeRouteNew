# CLAUDE.md — Compagnon de route (v2)

Règles de conduite pour Claude Code sur ce repo. À lire avec PLAN.md (spec exécutable). En cas de conflit, PLAN.md décrit QUOI construire, ce fichier décrit COMMENT travailler.
## Environnement d'exécution

Claude Code CLI, modèle Claude Fable 5, fixé au niveau du projet dans `.claude/settings.json` (`{"model": "fable"}`), pas seulement rappelé ici. Requiert Claude Code v2.1.170 ou plus (`claude update` sinon). Terminal d'origine indifférent (natif, VS Code, code-server) : Claude Code CLI lit `.claude/settings.json` et CLAUDE.md de façon identique quel que soit l'émulateur de terminal. Vérifier `/status` en début de session pour confirmer que Fable est bien actif ; un `--model` ou `ANTHROPIC_MODEL` positionné dans l'environnement prendrait le pas sur le réglage du projet.

Une première passe de l'étape 1 a été explorée hors Claude Code (build, greps, serveur de dev vérifiés dans un environnement séparé, jamais poussé sur ce dépôt). Aucun patch à appliquer : exécuter l'étape 1 directement depuis ce repo, critères de vérification du §8 PLAN.md inclus, en s'appuyant sur ce qui suit comme repères déjà validés :
- Tailwind v4 s'installe proprement via `@tailwindcss/vite`, aucun souci de compatibilité rencontré.
- `@fontsource/source-serif-4` n'exporte pas de bloc italique générique : importer l'index par défaut de chaque paquet fontsource (pas de sous-chemin `/italic.css`), le choix fin de graisses/styles revient à l'étape 6.
- `vite build` ne type-check pas (pas de `tsc --noEmit` dans le script `build`) : un défaut supplémentaire existe dans le modal À propos (8 clés `aboutTitle`, `aboutP1`, `aboutPrivacyTitle`, `aboutPrivacyDesc1-3`, `aboutP2`, `aboutBtnClose` référencées dans App.tsx mais absentes de locales.ts, rendu `undefined` silencieux). Migrer tel quel vers texts.ts sans inventer de contenu, correction prévue étape 7 comme déjà planifié pour cet écran.
- `FICHES` et le paramètre de langue resteront lang-keyés jusqu'aux étapes 2 et 3 respectivement : pendant l'étape 1, fixer `'fr'` en dur aux points d'appel plutôt que de restructurer constants.ts par anticipation.

## Contexte

Application web qui mesure la robustesse d'une évaluation pédagogique face à l'IA générative, selon la doctrine du livre "Évaluer en formation à l'ère de l'IA générative" (Rochane Kherbouche, 2026). Réécriture v2 dans ce même repo. Production : https://ia-cr.rochane.fr/ (Vercel, domaine custom). Langue unique v1 : français.

## Invariant doctrinal absolu

**Score d'audit complet : HAUT = ROBUSTE.** Échelle 0-3 par dimension (3 = pôle robuste), somme /12. Seuils : 0-3 Risque critique, 4-6 Risque élevé, 7-9 Risque modéré, 10-12 Risque faible. La v1 du code faisait l'inverse : toute trace de l'ancienne direction (prompts, seuils, couleurs, radar, libellés "Vulnérabilité X") est un bug à éradiquer, pas un style à imiter.

**Exception canonique :** le test rapide (autodiagnostic 8 questions) reste en direction inverse, score de vulnérabilité brut /16, 3 seuils (0-4 robustesse élevée, 5-9 vulnérabilité modérée, 10-16 vulnérabilité critique). Les deux directions coexistent dans le livre. Ne pas "corriger" cette asymétrie. L'UI doit libeller chaque score explicitement (robustesse /12 vs vulnérabilité /16).

## Source unique de vérité

Toute la doctrine vit dans `lib/doctrine.ts` : définitions des 4 dimensions, seuils, statuts, les 8 fiches (clés exactes avec tiret cadratin, ne pas les modifier), les 8 questions du test rapide. Les prompts système sont CONSTRUITS à l'exécution depuis ce module (`lib/prompt.ts`). Interdiction de dupliquer une clé de fiche, un seuil, une définition ou un texte de prompt ailleurs. La v1 avait 4 copies des noms de fiches et 3 copies des prompts : c'est la cause racine du bug dev/prod documenté.

## Anti-régression (erreurs déjà payées, ne pas les reproduire)

Héritées du hub PEDA-IA (apps précédentes) :
1. Jamais de clé API côté client ni dans le code. Clé serveur uniquement, `DEEPSEEK_API_KEY` (supprimer les fallbacks `VITE_API_KEY`/`API_KEY`). L'app appelle l'API DeepSeek en direct (`api.deepseek.com`, modèle `deepseek-v4-flash`) ; OpenRouter a été abandonné, l'ancienne clé est révoquée.
2. Sortie LLM structurée imposée au niveau API (`response_format: json_object`) + validation serveur avant renvoi. Jamais de parsing de texte libre.
3. Prompt système = couche métier : interdictions explicites (aucune mention de styles d'apprentissage, mythe débunké ; max une référence théorique par sortie), obligations de forme (concret, actionnable, mesurable).
4. CI/CD : permissions explicites, pas de config implicite.

Issues de l'audit v1 de CE repo (14 défauts, détail en PLAN.md §9) — les interdictions qui en découlent :
5. Aucune logique métier dupliquée entre `server.ts` (dev) et `api/audit.ts` (prod) : les deux sont des adaptateurs fins autour de `lib/auditCore.ts`.
6. Aucune donnée du contrat API jetée par l'UI : justifications, preuves, stress-test, tout champ renvoyé est affiché.
7. Pas de `{x && ...}` qui masque silencieusement une clé de fiche inconnue : si le LLM renvoie une clé invalide, la validation serveur la rejette ou la remappe, jamais un trou muet dans l'UI.
8. Pas de Tailwind CDN, pas d'importmap esm.sh, pas de dépendance fantôme, pas de double script de montage dans index.html.
9. Pas de vestige AI Studio (`window.aistudio`, `@google/genai`).
10. Sémantique visuelle explicite : toute jauge, radar ou couleur porte une légende de direction. Un radar plein doit signifier robuste.

## Règles de code

Réfléchir avant de coder : énoncer les hypothèses, présenter les interprétations multiples au lieu d'en choisir une en silence, signaler l'approche plus simple si elle existe.

Simplicité d'abord : le minimum de code qui résout le problème. Pas de fonctionnalité non demandée, pas d'abstraction pour du code à usage unique, pas de gestion d'erreur pour des scénarios impossibles. Dépendances : uniquement celles listées en PLAN.md (fontsource, @upstash/ratelimit, @upstash/redis, @tailwindcss/vite). Toute dépendance supplémentaire se justifie explicitement avant installation.

Changements chirurgicaux : ne toucher que ce que l'étape en cours exige. Nettoyer ses propres orphelins (imports/variables rendus inutiles par SES changements), ne pas "améliorer" le reste.

Exécution pilotée par le but : chaque étape du PLAN a des critères de vérification. Les exécuter réellement (build, typecheck, test manuel décrit) avant de déclarer l'étape finie.

## Protocole de travail

Une étape du PLAN.md à la fois, dans l'ordre. À la fin de chaque étape : critères de vérification exécutés, un commit (`v2-etape-N: <résumé>`), rapport court à Rochane (fait, vérifié, écarts éventuels), attendre son retour avant l'étape suivante. Ne jamais enchaîner deux étapes sans validation.

## Écriture

Toute l'UI et toutes les sorties LLM en écriture inclusive à point médian (apprenant·e, formateur·rice, évalué·e). Ton de l'interface : sobre, direct, voix active, verbes concrets sur les boutons ("Lancer l'audit", pas "Soumettre"). Pas de point d'exclamation, pas de langage promotionnel. Les erreurs disent ce qui s'est passé et comment corriger, sans s'excuser. Registre : professionnel chaleureux, jamais infantilisant. Public : formateur·rice·s, enseignant·e·s du supérieur et du secondaire.
