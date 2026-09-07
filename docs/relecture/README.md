# Les fiches de relecture

`mode-jeu.html` — un fichier autonome (aucune dépendance, aucun serveur) qui
liste **tout** le Mode jeu, une carte annotable par acte, par étape, par écran
et par niveau du réservoir. Ouvrir dans un navigateur, annoter, puis
« Exporter mes notes » : le Markdown produit se recolle tel quel dans une
conversation.

Les annotations vivent dans le `localStorage` du navigateur qui les a saisies —
donc **le même navigateur, le même profil**, et rien ne part sur le réseau.
Exporter avant de vider ses données de navigation.

## La régénérer

```bash
npx vite-node scripts/relecture-mode-jeu.ts
```

Elle est **dérivée des données** (`ACTES`, `EPILOGUE`, `LEVELS`) : ce qui est
annoté est ce que le jeu contient au moment de la génération. Une seule partie
est écrite à la main dans le script — la liste des ÉCRANS qui n'appartiennent à
aucune étape (splash, calibrage, carnet, salle de répétition, cahier vivant,
discographie…). Si un de ces écrans apparaît ou disparaît, c'est là qu'il faut
le dire.

⚠️ Régénérer **ne perd pas** les annotations : elles sont indexées par
identifiant de carte (`a3-e11`, `res-45`…). Mais insérer une étape au milieu
d'un acte décale les identifiants des suivantes — exporter avant, dans le doute.

## `assemblage.html` — la fiche de décision du Mode Live

Vingt-cinq cartes : le cadrage, ce que la mesure a trouvé, **les six choix que
j'ai tranchés seul sur la branche** (et qui peuvent tous être renversés), le
plan tranche par tranche, et les questions ouvertes. Mêmes gestes que ci-dessus
(D'ACCORD / À DISCUTER / NON, une note, export Markdown).

⚠️ **Celle-ci n'est PAS dérivée des données** — son contenu est l'audit
[`docs/plan/07-audit-assemblage-de-morceau.md`](../plan/07-audit-assemblage-de-morceau.md),
pas l'état du jeu. Elle n'a donc pas de script de régénération : elle se modifie
à la main, comme le document qu'elle accompagne.

## `assemblage-2.html` — deuxième tour

Onze cartes, après les quatorze réponses du premier tour. Trois choses : les
trois points que je n'avais pas su expliquer (deux répondent **en image**, les
captures sont embarquées dans le fichier), l'état de l'art demandé, et le plan
révisé — la réponse de Yann sur l'export **annule** la recommandation
principale de l'audit 07.

Écrite à la main comme la précédente, pas dérivée des données.
