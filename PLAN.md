# PLAN.md — Compagnon de route v2

Spec exécutable. Réécriture dans ce repo. Production : https://ia-cr.rochane.fr/. Une étape à la fois, protocole défini dans CLAUDE.md.

---

## §1 — Décisions verrouillées (29 arbitrages, ne pas rediscuter)

| # | Sujet | Décision |
|---|-------|----------|
| 1 | Cadre 4 dimensions, 0-3, /12 | Canonique, conforme au livre |
| 2 | Pondération | Égale |
| 3 | Bandes de seuils (0-3 / 4-6 / 7-9 / 10-12) | Conservées |
| 4 | Framing du verdict | Double lecture : robustesse ET vulnérabilité affichées |
| 5 | Recommandations | Triées par robustesse croissante en vulnérabilité des fiches |
| 6 | Les 8 fiches | Conservées telles quelles (contenu et clés exactes) |
| 7 + 25 | Preuves citées | Citations extraites de la consigne pour toute dimension au pôle substituable maximal. Choix d'origine : "à partir de 3" sur l'ancienne échelle de vulnérabilité 0-3 ; équivalent post-inversion (Q26) : **note de robustesse 0**. |
| 8 | Test rapide | Refondu selon le livre : score brut /16, 3 seuils |
| 9 | Public | Tout·e éducateur·rice (sup, secondaire, formation pro) |
| 10 | Export PDF | Oui, v1 |
| 11 | Ré-audit comparatif | Oui, v1 |
| 12 | Portefeuille | localStorage + export/import JSON |
| 13 | Langues | FR seul v1, structure prête pour ré-i18n ultérieure |
| 14 | Direction visuelle | Chaleureux pédagogique, identité compagnonnage (§6) |
| 16 | Écrans | Desktop et mobile au même niveau |
| 17 | Déploiement | Vercel, logique unifiée en module partagé |
| 29 | VPS | Écarté. Vercel Hobby suffit (profil de trafic faible, pas d'usage commercial), aucun projet VPS pour cette app. Contrepartie technique : `maxDuration` explicite dans `vercel.json` (§3) |
| 18 | Modèle | `deepseek/deepseek-v4-flash` via OpenRouter |
| 19 + 24 | Protection API | Rate limiting par IP via Upstash |
| 20 | Écriture inclusive (point médian) | Partout : UI + sorties LLM |
| 21 | Livrable | Cette spec, implémentée par Claude Code |
| 22 | Repo | Celui-ci, réécriture dedans |
| 23 | Source doctrine | Extraits du livre fournis, intégrés en §2 |
| 26 | Direction score audit | **Haut = robuste** (inversion complète de la v1) |
| 27 | Stress-test simulé | Oui, v1, dans le rapport |
| 28 | Matrice impact-faisabilité | Oui, v1, au niveau portefeuille |

---

## §2 — Doctrine (source : livre, chapitre 6)

### 2.1 Les 4 dimensions de substituabilité (définitions exactes)

Modèle de substituabilité des tâches évaluatives. Chaque dimension notée 0 à 3, **3 = pôle robuste** :

- **Reproductibilité** : l'évaluation demande-t-elle une procédure standardisée (0, substituable) ou une production unique (3, robuste) ?
- **Contextualisation** : ancrage dans des données génériques accessibles en ligne (0) ou locales, spécifiques à une organisation, confidentielles, personnelles (3) ?
- **Tacitité** : l'expertise requise est-elle explicitable, facilement formalisable comme une synthèse textuelle (0), ou intuitive, fondée sur l'expérience, le ressenti, l'interaction en temps réel (3) ?
- **Multimodalité** : un seul format, type devoir écrit asynchrone monomodal (0), ou combinaison de formats, par exemple soutenance associant diaporama, démonstration technique et questions improvisées (3) ?

### 2.2 Score d'audit complet et statuts

`score_robustesse` = somme des 4 notes, 0 à 12.

| Score | Statut | Consigne d'action |
|-------|--------|-------------------|
| 0-3 | Risque critique | Hautement substituable, refonte totale |
| 4-6 | Risque élevé | Adaptation substantielle du dispositif |
| 7-9 | Risque modéré | Ajustements ciblés (contextualisation locale, consignes de transparence) |
| 10-12 | Risque faible | Maintien sous vigilance active |

Double lecture (décision 4) : l'UI affiche le score de robustesse /12 en principal et la lecture inverse en secondaire ("substituabilité : N/12", avec N = 12 − robustesse).

### 2.3 Stress-test simulé (temps 1 du protocole)

Le protocole du livre commence par un stress-test : produire une réponse recevable avec l'IA seule ; moins de 30 minutes signale une vulnérabilité ; on mesure aussi le degré de pilotage nécessaire. Le LLM le simule et le rapport l'affiche. Cohérence exigée : un temps estimé < 30 min doit correspondre à une note de reproductibilité basse (0 ou 1).

### 2.4 Test rapide (autodiagnostic, encart du livre)

8 questions fermées, Oui = 2, Partiellement = 1, Non = 0. **Score brut /16, direction inverse de l'audit : haut = vulnérable.** Canonique, ne pas harmoniser.

| Score /16 | Verdict |
|-----------|---------|
| 0-4 | Robustesse élevée |
| 5-9 | Vulnérabilité modérée |
| 10-16 | Vulnérabilité critique, reprendre le protocole complet |

Les 8 questions (verbatim livre, corrige la faute v1 "portant-ils") :
1. Cette évaluation repose-t-elle sur une production écrite réalisée hors surveillance ?
2. La consigne pourrait-elle être copiée telle quelle dans un assistant IA pour obtenir un résultat recevable ?
3. L'évaluation mobilise-t-elle des données génériques accessibles en ligne plutôt que des données locales ou personnelles ?
4. Le produit final est-il le seul objet évalué, sans trace du processus de production ?
5. L'évaluation se déroule-t-elle entièrement en mode asynchrone, sans interaction en temps réel avec l'apprenant·e ?
6. Les critères d'évaluation portent-ils exclusivement sur le contenu, sans dimension réflexive ou métacognitive ?
7. Un·e apprenant·e pourrait-il·elle obtenir une note satisfaisante sans pouvoir expliquer oralement ses choix ?
8. Vos collègues utilisent-ils·elles des consignes identiques ou très similaires d'une session à l'autre ?

Verdicts du test rapide : réécrire les conseils (les textes v1 renvoyaient vers "Fiches 1 à 4", doctrinalement faux, les fiches 1-2 étant les plus vulnérables). Conseil robustesse élevée : vigilance active. Modérée : fiches d'adaptation ciblée les plus robustes (5, 6, puis 4, 7, 8). Critique : reprendre le protocole complet + audit détaillé de l'app.

### 2.5 Matrice impact-faisabilité (temps 3 du protocole)

Croisement pour prioriser la transformation des évaluations, horizon de planification 18 mois.
- Axe vertical, **impact** : nombre d'apprenant·e·s concerné·e·s, poids de l'épreuve dans la certification, visibilité.
- Axe horizontal, **faisabilité** : temps requis, budget, compétences de l'équipe, résistances culturelles.

Implémentation : chaque audit du portefeuille reçoit deux curseurs 1-5 (impact, faisabilité), renseignables depuis le rapport ou le portefeuille. Vue matrice : nuage sur 4 quadrants. Libellés : Transformations prioritaires (impact fort × faisabilité forte), Chantiers à planifier (impact fort × faisabilité faible), Gains rapides (impact faible × faisabilité forte), À surveiller (impact faible × faisabilité faible). Seuls les audits à statut Risque critique ou élevé remontent visuellement (les autres en retrait) : la matrice sert à prioriser ce qui doit être transformé.

### 2.6 Les 8 fiches de remédiation

Contenu v1 de `constants.ts` conservé intégralement (clés exactes avec tiret cadratin, champs id/name/format/duree/vulnerabilite/publics/principe/adaptations/charge). Version FR uniquement. Le champ `vulnerabilite` ("1/5" à "5/5") sert au tri des recommandations : ordre croissant (5 et 6 d'abord, 1 en dernier).

---

## §3 — Architecture cible

```
lib/
  doctrine.ts     dimensions, seuils, statuts, FICHES, QUICK_QUESTIONS, textes de verdict
  prompt.ts       buildSystemPrompt() et buildUserPrompt(consigne, contexte)
                  construits depuis doctrine.ts (clés de fiches injectées, jamais en dur)
  auditCore.ts    runAudit(input): appel OpenRouter, parsing, validation stricte du contrat §4
api/
  audit.ts        handler Vercel : IP → rate limit → auditCore → réponse. Zéro logique métier.
server.ts         Express dev : même route /api/audit branchée sur auditCore + middleware Vite. Zéro logique métier.
src/ (racine actuelle conservée)
  App.tsx, components/, texts.ts (tous les libellés UI FR, structure à plat prête pour i18n future)
index.html        reconstruit : propre, sans importmap, sans CDN
```

Imports relatifs uniquement entre `api/` et `lib/` (Vercel bundle les imports relatifs TS ; c'est l'inline forcé de la v1 qui devient inutile).

Env : `OPENROUTER_API_KEY` (seul nom accepté), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Si les variables Upstash sont absentes (dev local), log d'avertissement et passage sans limite.

**Vercel Hobby, pas de VPS (décision 29).** Le plan Hobby autorise un `maxDuration` explicite jusqu'à 60 secondes par fonction (au-delà du défaut, il faut le déclarer). L'analyse IA annoncée à l'utilisateur va jusqu'à 15 secondes : fixer `maxDuration: 30` sur `api/audit.ts` dans `vercel.json` pour absorber la latence OpenRouter sans dépendre du défaut. Usage non commercial, aucun autre plafond Hobby (bande passante, invocations) n'est approchable au volume de cette app.

Dépendances ajoutées : `@upstash/ratelimit`, `@upstash/redis`, `@tailwindcss/vite` (Tailwind v4), `@fontsource-variable/bricolage-grotesque`, `@fontsource/source-serif-4`. Rien d'autre sans justification.

---

## §4 — Contrat API v2

`POST /api/audit`, body : `{ consigne: string, contextAnswers: { synchrone, donnees, processus }, impact?: never, ... }` (impact/faisabilité restent côté client, portefeuille).

Réponse (validée serveur avant renvoi, direction robustesse) :

```json
{
  "dimensions": {
    "reproductibilite":  { "note": 0, "justification": "…", "preuves": ["extrait exact de la consigne"] },
    "contextualisation": { "note": 2, "justification": "…" },
    "tacitite":          { "note": 1, "justification": "…" },
    "multimodalite":     { "note": 0, "justification": "…", "preuves": ["…"] }
  },
  "score_robustesse": 3,
  "statut": "Risque critique",
  "stress_test": {
    "minutes_estimees": 12,
    "pilotage": "léger",
    "verdict": "Une IA généraliste produit un rendu recevable en une douzaine de minutes avec un pilotage minimal."
  },
  "points_vigilance": ["…", "…"],
  "recommandations": [
    { "action": "…", "fiche": "Fiche 5 — Soutenance orale sans écrit préalable" }
  ]
}
```

Règles de validation serveur (rejet + retry unique côté core si invalide, sinon erreur 502 explicite) :
- notes entières 0-3 ; `score_robustesse` = somme exacte des 4 notes ; statut = celui déduit du score par les seuils (recalculé serveur, la valeur LLM est écrasée si divergente).
- `preuves` : présent et non vide si `note === 0`, absent sinon. Chaque preuve = citation courte réellement extraite de la consigne (vérification d'inclusion, tolérance espaces/casse).
- `pilotage` ∈ { "aucun", "léger", "soutenu", "expert" } ; cohérence : `minutes_estimees` < 30 ⇒ reproductibilité ≤ 1 (sinon rejet).
- `recommandations` : 2 à 4 éléments, `fiche` ∈ clés exactes de FICHES (sinon rejet), puis tri serveur par vulnérabilité croissante de fiche.
- `points_vigilance` : 2 à 5 chaînes.

---

## §5 — Prompt système v2 (FR, construit par lib/prompt.ts)

Gabarit (les blocs {…} sont injectés depuis doctrine.ts) :

```
Tu es "Compagnon de route", expert·e en ingénierie de l'évaluation, spécialisé·e dans l'audit
de la robustesse des évaluations face à l'IA générative, selon le modèle de substituabilité
des tâches évaluatives (Rochane Kherbouche, "Évaluer en formation à l'ère de l'IA générative", 2026).

DOCTRINE. Note chaque dimension de 0 à 3, où 3 = pôle ROBUSTE :
{définitions exactes des 4 dimensions, §2.1, avec les deux pôles explicités}

SCORE. score_robustesse = somme exacte des 4 notes (0 à 12).
Statuts : {seuils §2.2}.

STRESS-TEST SIMULÉ. Estime le temps (en minutes) qu'il faudrait à une IA générative grand
public pour produire une réponse recevable à cette consigne, et le degré de pilotage humain
nécessaire (aucun, léger, soutenu, expert). Moins de 30 minutes signale une substituabilité
forte et doit se refléter dans la note de reproductibilité.

PREUVES. Pour toute dimension notée 0, cite entre guillemets un ou deux extraits EXACTS de la
consigne qui fondent la note. Ne cite rien pour les notes 1 à 3.

RECOMMANDATIONS. Propose 2 à 4 actions concrètes, chacune rattachée à une fiche par sa clé
exacte parmi : {clés de FICHES injectées}. Privilégie les fiches les plus robustes pertinentes
pour ce contexte.

CONTRAINTES D'ÉCRITURE.
- Écriture inclusive à point médian.
- Concret et actionnable : chaque justification s'appuie sur la consigne analysée, pas sur des
  généralités. Critères mesurables, pas de jargon.
- Au maximum UNE référence théorique dans l'ensemble de la réponse.
- Interdiction absolue de mentionner les "styles d'apprentissage".
- Rigueur : pointe les substituabilités réelles sans les adoucir.

FORMAT DE SORTIE. Réponds exclusivement avec un objet JSON valide, sans texte autour, sans
bloc markdown, structure EXACTE : {schéma §4 sérialisé}
```

User prompt : consigne + les trois réponses de contexte (modalité, données, processus), et l'instruction de calcul (notes, somme, statut selon seuils). Appel OpenRouter : `response_format: {type:"json_object"}`, `temperature: 0.3`, header `HTTP-Referer: https://ia-cr.rochane.fr`.

---

## §6 — Design system "Carnet de route"

Identité ancrée dans le compagnonnage (le nom de l'app) : carnet d'atelier, règle graduée, fiches cartonnées. Interdits explicites (clichés IA) : indigo/violet par défaut, fond crème + accent terracotta, glassmorphism, dégradés décoratifs, emojis dans l'UI, hero "gros chiffre + gradient".

### Tokens

Couleurs (variables CSS) :
- `--papier: #F7F5F0` (fond, blanc chaud discret)
- `--encre: #22303C` (texte, bleu-noir d'encre)
- `--bleu-regle: #2C5F7C` (accent primaire, actions, liens)
- `--sapin: #2E6B4F` (pôle robuste / risque faible)
- `--ocre: #C58B32` (risque modéré)
- `--brique: #B0563B` (risque élevé)
- `--garance: #8C2F2F` (risque critique)
- `--kraft: #E8DFCE` (fonds de cartes-fiches, onglets)

Typographie : Bricolage Grotesque Variable (titres, UI, chiffres de score) + Source Serif 4 (corps des justifications, verdicts, contenus de fiches : registre livre). Échelle : 13 / 15 / 18 / 24 / 34 / 48. Interlignage généreux (1.6 corps serif).

Formes : rayons 6-10 px maximum (pas de rounded-3xl), bordures 1px `--encre` à 12 % d'opacité, ombres quasi nulles (une seule élévation légère pour les cartes cliquables).

### Signature : la règle graduée

Le score de robustesse s'affiche sur une règle horizontale graduée 0→12, style règle d'atelier : graduations fines, 4 zones colorées (garance, brique, ocre, sapin), curseur triangulaire à la valeur, libellé du statut au-dessus du curseur. Sous la règle, la double lecture : "Robustesse 3/12 · Substituabilité 9/12". C'est l'élément mémorable de l'app ; tout le reste demeure sobre. Réutilisée en miniature dans les lignes du portefeuille.

### Radar

Conservé pour les 4 dimensions, direction robustesse (forme pleine = robuste, désormais intuitif). Remplissage à la couleur du statut à 15 %, trait à la couleur du statut. Légende explicite sous le radar : "Plus la surface est étendue, plus l'évaluation est robuste." Étiquettes des 4 axes avec la note (ex. "Tacitité · 1/3").

### Motion

Une seule séquence orchestrée : à l'arrivée du rapport, la règle se remplit jusqu'à la valeur puis le statut s'imprime (léger scale-in, 400 ms). Rien d'autre d'animé hormis les états hover/focus. `prefers-reduced-motion` respecté (aucune animation).

### Accessibilité (plancher)

Contrastes AA sur `--papier`, focus visible au clavier partout, cibles tactiles ≥ 44 px, mobile 375 px sans perte de fonction.

---

## §7 — Écrans

1. **Accueil** : titre + sous-titre citant le livre (repris de la v1), deux entrées : Audit détaillé, Diagnostic rapide. Pas de hero décoratif.
2. **Saisie de la consigne** : textarea, exemple en placeholder, bouton "Suivant : définir le contexte".
3. **Contexte** : les 3 questions à choix (reprendre libellés et exemples v1, corriger le "Exemple :" codé en dur, tout passe par texts.ts), bouton "Lancer l'audit de robustesse", messages d'attente rotatifs (reprendre la liste v1, vocabulaire ajusté robustesse).
4. **Rapport** (l'écran qui doit être "hyper puissant") :
   - En-tête : règle graduée (signature) + statut + double lecture.
   - Verdict stress-test : encadré "Stress-test simulé : ~12 min, pilotage léger" + phrase de verdict.
   - Les 4 dimensions : pour chacune, note ×/3, justification (serif), et si note 0, les preuves en citations typographiées (guillemets français, fond kraft).
   - Points de vigilance.
   - Recommandations triées : cartes-fiches à onglet kraft ; chaque carte se déplie pour montrer TOUT le contenu de la fiche (format, durée, publics, principe, adaptations, charge). Plus aucun contenu de fiche caché.
   - Actions : Ré-auditer une version corrigée, Exporter en PDF, Copier JSON, Curseurs impact/faisabilité (1-5) pour la matrice.
5. **Ré-audit comparatif** : depuis un rapport, bouton ouvre la consigne pré-remplie éditable ; après le nouvel audit, vue avant/après : deux mini-règles, delta par dimension (+2, −1…), lien de filiation stocké (`parentId`) dans le portefeuille.
6. **Test rapide** : 8 questions, score brut /16 affiché en carte sticky (reprise du pattern v1, réussi), 3 verdicts §2.4, mention explicite "score de vulnérabilité sur 16".
7. **Portefeuille** : liste (titre, date, mini-règle, statut, badge "révision de…" le cas échéant), boutons Exporter JSON / Importer JSON (fusion sans doublons par id), bascule vue Matrice impact-faisabilité (§2.5).
8. **Export PDF** : feuille de style print dédiée du rapport (A4, encre sur blanc, règle graduée et fiches dépliées, sans boutons), déclenchée par `window.print()`. Zéro dépendance.
9. **À propos** : reprise du contenu v1 (confidentialité : pas de base de données, stockage local, pas de compte), icône SVG corrompue remplacée.

---

## §8 — Étapes d'implémentation (une à la fois, commit + vérification à chaque étape)

**Étape 1 — Assainir la base.**
Reconstruire index.html (title, fonts via fontsource importées dans le code, pas de CDN Tailwind, pas d'importmap esm.sh, pas de `@google/genai`, un seul script de montage, plus de lien vers index.css fantôme). Installer Tailwind v4 via `@tailwindcss/vite`. Supprimer : bloc `window.aistudio` (App.tsx + types.ts), tout le contenu EN (locales → texts.ts FR à plat), fallbacks d'env `VITE_API_KEY`/`API_KEY`.
Vérifier : `npm run build` passe ; en dev, zéro requête vers cdn.tailwindcss.com ou esm.sh ; grep `aistudio|genai|VITE_API_KEY` vide.

**Étape 2 — lib/doctrine.ts.**
Migrer FICHES (FR seul), QUICK_QUESTIONS, y ajouter : définitions des 4 dimensions (§2.1), seuils/statuts audit (§2.2), seuils/verdicts test rapide (§2.4), libellés de pilotage. Supprimer constants.ts.
Vérifier : typecheck ; `grep -r "Fiche 1 —"` ne matche que doctrine.ts.

**Étape 3 — lib/prompt.ts + lib/auditCore.ts, adaptateurs.**
Prompts construits depuis doctrine.ts (§5). auditCore : appel OpenRouter, parsing, validation §4, retry unique sur invalide. api/audit.ts et server.ts réduits à des adaptateurs (extraction IP, body, appel core).
Vérifier : `grep -rn "Tu es" api/ server.ts` vide (aucun prompt hors lib) ; appel dev réel sur une consigne test renvoie un JSON conforme au contrat.

**Étape 4 — Inversion et types v2.**
types.ts : nouveau contrat (§4), statuts "Risque critique/élevé/modéré/faible", suppression de l'enum mensonger et du cast aveugle ; parsing de réponse validé côté client aussi (garde-fou léger).
Vérifier : script node de test du mapping seuils (0→critique, 3→critique, 4→élevé, 7→modéré, 10→faible, 12→faible) vert.

**Étape 5 — Rate limiting.**
@upstash/ratelimit fenêtre glissante 10 requêtes / 10 min / IP dans api/audit.ts (et server.ts en no-op loggué). 429 avec message FR clair.
Vérifier : avec vars Upstash de test, la 11e requête rend 429 ; sans vars, warning loggué et passage.

**Étape 6 — Design system.**
Tokens CSS (§6), fonts fontsource, styles de base, composants RègleGraduée et Radar v2 (direction robustesse + légendes).
Vérifier : page de démonstration temporaire des deux composants aux scores 0, 3, 7, 12 ; contrôle visuel mobile 375 px ; contrastes AA (vérif outil).

**Étape 7 — Écrans accueil, saisie, contexte, rapport.**
§7.1 à 7.4 complets : justifications affichées, preuves typographiées, stress-test, fiches dépliables intégrales, recommandations triées, double lecture.
Vérifier : audit réel de bout en bout ; chaque champ du JSON §4 visible à l'écran ; test clavier (tab traverse tout, focus visible) ; 375 px.

**Étape 8 — Test rapide v2.**
Score brut /16, 3 verdicts, questions §2.4 verbatim, conseils réécrits.
Vérifier : combinaisons de réponses donnant 4, 5, 9, 10, 16 affichent le bon verdict ; libellé "vulnérabilité sur 16" présent.

**Étape 9 — Ré-audit, portefeuille, matrice.**
§7.5 + §7.7 : parentId, vue avant/après avec deltas, export/import JSON (fusion par id), curseurs impact/faisabilité, vue matrice 4 quadrants.
Vérifier : cycle complet audit → correction → ré-audit → deltas exacts ; export puis import sur navigateur vierge restaure tout ; matrice place correctement 3 audits factices.

**Étape 10 — PDF, QA, déploiement.**
Feuille print A4, passage final (typos, écriture inclusive partout, wording), `vercel.json` avec `maxDuration: 30` sur `api/audit.ts`, variables Vercel (OPENROUTER_API_KEY, Upstash), déploiement, vérification sur https://ia-cr.rochane.fr/.
Vérifier : PDF imprimé propre (aperçu) ; Lighthouse accessibilité ≥ 90 ; audit réel en production OK, y compris un cas d'analyse lente (proche de 15s) sans timeout ; la clé ne transite jamais côté client (onglet réseau).

---

## §9 — Les 14 défauts de la v1 (mémoire anti-régression, tous traités ci-dessus)

1. Prompt FR divergent dev/prod (clés de fiches absentes en local) → source unique lib (ét. 2-3).
2. Noms de fiches en 4 exemplaires → injection depuis doctrine.ts (ét. 3).
3. Logique métier dupliquée server.ts / api/audit.ts → auditCore (ét. 3).
4. /api/audit public sans limite, clé consommable par n'importe qui → Upstash (ét. 5).
5. Justifications générées puis jetées par l'UI → affichées (ét. 7).
6. Fiches riches réduites à un label 10px → cartes dépliables intégrales (ét. 7).
7. Radar contre-intuitif (plein = vulnérable) sans légende → inversion + légende (ét. 6).
8. Conseils du test rapide doctrinalement faux (renvoi vers les fiches les plus vulnérables) → réécrits (ét. 8).
9. Tailwind CDN play en production → build Vite (ét. 1).
10. Importmap esm.sh + @google/genai fantôme, risque de double React → purge (ét. 1).
11. Double script de montage index.tsx → un seul (ét. 1).
12. index.css lié mais inexistant, 404 permanent → purge (ét. 1).
13. Fuites i18n ("Exemple :" en dur, date fr-FR forcée) → texts.ts centralisé (ét. 1, 7).
14. SVG corrompu ("Pel") dans la modale À propos → remplacé (ét. 7 ou 10).

Erreur de direction (v1 : haut = vulnérable, livre : haut = robuste) : défaut 0, le plus grave, traité partout.

---

## §10 — Journal hub (à reporter dans PEDA-IA après livraison)

APP à documenter : Compagnon de route v2. Outil : Claude Code (spec produite dans le hub). Objectif pédagogique : auditer la robustesse des évaluations face à l'IA générative selon le protocole du livre (scoring 4 dimensions, stress-test simulé, remédiation par fiches, priorisation impact-faisabilité). Erreurs et résolutions : les 14 + l'inversion doctrinale ci-dessus. Décisions d'architecture : source doctrinale unique construite à l'exécution, validation serveur du contrat LLM avec recalcul des champs dérivés, adaptateurs fins dev/prod autour d'un core partagé, rate limiting Upstash, double lecture robustesse/substituabilité.
