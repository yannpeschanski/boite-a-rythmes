# Manche de guitare

Outil web pour visualiser le manche d'une guitare (accordage standard
EADGBE, 12 cases). Projet indépendant, sans lien de code avec
`boite-a-rythmes`, mais construit sur la même architecture : état et
théorie musicale typés dans `model/`, logique pure dans `engine/` (aucune
dépendance UI, testée sans navigateur), état réactif en runes Svelte 5 dans
`stores/`, composants dans `ui/`.

## Fonctionnalités

1. **Gammes** — choisir une tonique et une gamme : le manche affiche les
   notes de la gamme en distinguant fondamentale, tierce et quinte.
2. **Notes sur le manche** — cliquer des notes directement sur le manche
   (toutes leurs octaves s'allument automatiquement) ; les gammes du
   catalogue qui contiennent exactement ces notes sont listées, et on peut
   en choisir une pour l'afficher au complet.

## Commandes

```bash
npm install
npm run dev     # serveur de dev
npm test        # Vitest — logique pure du manche et des gammes
npm run check   # svelte-check (types)
npm run build   # site déployable -> dist/
```
