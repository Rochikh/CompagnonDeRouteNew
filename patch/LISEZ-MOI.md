# Patch « Copie corrigée » pour Compagnon de route

Habillage du systeme de design de ia.rochane.fr. **La stack ne change pas** :
React 19, Vite, Tailwind v4, `lib/doctrine.ts`, `lib/prompt.ts`, `server.ts`,
`services/gemini.ts`, contrat API, direction des scores, ecriture inclusive.
Seules la feuille de tokens et les classes de presentation changent.

## Fichiers de ce dossier

Chacun remplace son homonyme, au meme chemin, dans `Rochikh/CompagnonDeRouteNew` :

| Fichier | Ce qui change |
| --- | --- |
| `index.css` | Tokens `@theme` du systeme, utilitaires `reglure-seyes`, `reglure-seyes-clair`, `souligne-rouge`, impression et `prefers-reduced-motion` conserves |
| `index.tsx` | Imports de polices : Instrument Sans et Spline Sans Mono a la place de Source Serif 4 |
| `package.json` | Meme substitution de dependances fontsource |
| `App.tsx` | En-tete 60px avec carre rouge, en-tete de copie, double soulignement du titre, marge du correcteur, cartes d'accueil, fenetre A propos defilable et fermable au clavier, pied de page sur bande grise |
| `components/couleurs.ts` | Palette de statut ramenee a bleu / rouge / gris (les quatre teintes hors palette disparaissent) |
| `components/RegleGraduee.tsx` | Regle en carte sur reglure Seyes : chiffre mono, douze cases, bandes de seuils, statut en annotation rouge. `MiniRegle` en douze cases compactes |
| `components/RadarChart.tsx` | Radar monochrome bleu (aplat 0,14 / trait 0,5), sommets carres, etiquettes en HTML positionne |
| `components/Rapport.tsx` | Etiquettes de section a tiret rouge, stress-test en encart chiffre, preuves en filet rouge, fiches a onglet gris et badge, adaptations en etiquettes |
| `components/Comparaison.tsx` | Deltas en bleu (gain) / rouge (recul) / gris |
| `components/Matrice.tsx` | Points carres, quadrant prioritaire en bleu, fond Seyes atenue |
| `components/TestRapide.tsx` | Deux colonnes, resultat collant sur carte Seyes, jauge de seize cases |

Non modifies : `texts.ts` (aucune cle ajoutee ni retiree), `types.ts`,
`lib/*`, `services/*`, `server.ts`, `index.html`, `vite.config.ts`.

## Mise en place

```bash
# depuis la racine du depot, apres avoir copie les fichiers de patch/
npm uninstall @fontsource/source-serif-4
npm install @fontsource/instrument-sans @fontsource/spline-sans-mono
npm run dev     # verification visuelle des 8 ecrans
npm run build   # verification de compilation
```

Puis un commit, et Vercel deploie.

## Points a verifier apres bascule

1. Les huit ecrans : accueil, saisie, contexte, rapport, portefeuille liste,
   portefeuille matrice, diagnostic rapide, fenetre A propos.
2. Le rapport imprime en PDF sur une page A4 sans bloc coupe.
3. Sous 400px de large : les rangees de boutons se replient, la colonne
   resultat du diagnostic passe sous les questions.
4. `prefers-reduced-motion` : le double soulignement du titre ne s'anime plus.

## Ecarts assumes par rapport a l'existant

- Source Serif 4 disparait : le systeme n'a pas de serif, le corps de texte
  passe en Instrument Sans. L'alias `--font-serif` est conserve pour que les
  classes `font-serif` restantes rendent la police de corps.
- Les quatre couleurs de statut (garance, brique, ocre, sapin) sortent de la
  palette du systeme : le statut s'ecrit desormais en annotation rouge, et la
  jauge reste bleue. La direction reste lisible par le texte et par les bandes
  de seuils, pas par la seule couleur.
- La regle graduee perd son curseur triangulaire et ses graduations animees au
  profit de douze cases : le clip-path anime rendait l'impression dependante du
  moment du declenchement.
