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
| 29 | VPS | Écarté pour l'hébergement de l'app. Vercel Hobby suffit (profil de trafic faible, pas d'usage commercial). Contrepartie technique : `maxDuration` explicite dans `vercel.json` (§3). Ce VPS sert uniquement d'environnement Claude Code |
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
