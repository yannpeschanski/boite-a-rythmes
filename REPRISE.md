# Reprise — brief de session

> À lire en premier, avant `PLAN.md` (7 400 lignes, c'est le journal détaillé ;
> ceci en est la carte). `CLAUDE.md` reste la source des règles.
>
> Dernière mise à jour : 2026-08-25, après `fb1554f`.

## Où en est le projet

Séquenceur / boîte à rythmes web en Svelte 5, skin Winamp 2.x, déployé sur
<https://boite-a-rythmes.vercel.app>. Quatre modules : **Atelier** (composition),
**Synthé**, **Production**, **Mode Live**, plus le **Mode jeu**.

`main` est vert, 253 tests, 0 erreur de types, les deux builds passent.

Le gros du travail récent porte sur le **Mode jeu**, dont le Mode carrière est
devenu l'écran d'entrée : les huit actes de `HISTOIRE.md` sont écrits, plus
l'épilogue. Le récit est **entièrement porté** — il n'y a plus de texte en
attente dans `HISTOIRE.md`.

| | |
|---|---|
| Actes jouables | 8 sur 8, plus l'épilogue |
| Verbes d'exercice | 11 (`ExerciseKind`) |
| Niveaux | 59 |
| Commandes (production à livrer) | 5, aux actes 2 à 6 |

## ⚠️ La décision en attente — à trancher avant de coder autre chose

**Les quatre modules se déverrouillent tous à la fin de l'acte 0.** Le
déverrouillage narratif, qui est le principe même du Mode carrière, ne fait donc
plus rien : quatre actes annoncent l'ouverture d'un module déjà ouvert.

Mesuré par un parcours complet depuis un joueur neuf :

```
── ACTE 0 « LE CAFÉ »   — modules: —
── ACTE 1 « LE RYTHME » — modules: atelier,synth,production,live
```

**Cause.** `saveProgress` (`stores/game.svelte.ts`) fait
`level = max(level, id + 1)`. L'acte 0 cite les niveaux 49 à 52 ; réussir le 52
écrit `level = 53`, au-dessus des quatre seuils de `MODULE_UNLOCK_LEVEL`
(2 / 13 / 27 / 34) d'un coup. Le second membre du OU de `moduleUnlocked`
(`model/unlocks.ts`) ouvre alors tout.

**Le fond.** `level >= 34` voulait dire « a joué 34 niveaux de la campagne
linéaire ». La carrière a supprimé cet ordre — elle cite les niveaux dans le
désordre et au-delà de 34. Le seuil ne mesure plus rien.

**Portée.** `PlayerProgress.level` n'est plus lu que par cette seule ligne
(`unlocks.ts:101`) ; `niveauxDeRepetition` est passé à `niveauxRencontres`.

**Les trois sorties**, recommandation en premier :

1. **Geler le plancher avant la carrière.** Enregistrer une fois le `level` que
   le joueur avait *avant* de commencer le récit, et s'en servir comme plancher.
   Un vétéran garde ses modules, un joueur neuf part de zéro et le récit
   gouverne. C'est exactement l'intention écrite dans `unlocks.ts`.
2. **Retirer le seuil.** Le récit devient l'unique voie. Plus simple, mais un
   vétéran perd l'accès jusqu'à refaire la carrière.
3. **Ne rien faire**, en sachant que le déverrouillage narratif est décoratif.

*Yann n'a pas encore tranché. Ne pas choisir à sa place.*

## Ce qui est vérifié, et ce qui ne l'est pas

**Vérifié** — types, 253 tests (les tests aléatoires affirment ce qui est vrai à
chaque tirage et répètent 60 fois), les deux builds, et un parcours Playwright
par acte en 390×840.

**La chaîne des actes est saine.** `scripts/parcours-carriere.cjs` joue la
carrière entière depuis un joueur neuf : les huit actes s'enchaînent, les cinq
commandes sont acceptées, l'épilogue est atteint, aucune erreur console. Le seul
défaut qu'il trouve est le déverrouillage ci-dessus.

**Angle mort découvert cette session, à ne pas repayer :** chaque acte avait été
vérifié isolément avec une fixture `localStorage` où `level` était posé à la
main. C'est ce qui a caché le défaut ci-dessus pendant sept PR — une fixture ne
joue pas le jeu. **Relancer `scripts/parcours-carriere.cjs` après toute
modification du déverrouillage, de la progression ou de la chaîne des actes**
(`npm run dev` dans un terminal, puis `node scripts/parcours-carriere.cjs`).

**Pas encore vérifié :** un vrai parcours à la souris/au doigt de bout en bout
(le script pilote le store, il ne clique pas). Et le Mode Live n'a pas été
retouché de la session.

## Les pièges qui ont coûté du temps

- **Le squash-merge.** La branche de travail garde l'ancien historique (déjà
  mergé) et entre en conflit avec `main`. Avant tout nouveau commit :
  `git fetch origin main && git checkout -B <branche> origin/main`, puis
  cherry-pick. Ça a mis la PR #112 en conflit — zéro check lancé, `dirty`.
- **Un étage « neutre » en série dans la chaîne audio ne l'est jamais.** Un
  passe-haut à 10 Hz changeait 41 176 échantillons sur 44 100 (phase, pas
  amplitude). Tout nouvel étage va dans une **branche parallèle à gain nul**.
- **`defaultState()` n'est pas une grille vide, c'est du Motown** —
  `rankPresets` lui donne 100 %. Toute commande doit exiger qu'on y ait touché.
- **Les tests qui expirent en série complète** ne sont pas fragiles : ils
  prennent 440-580 ms pour un budget de 5 s, et échouent quand un serveur de dev
  et des builds tournent en même temps. Arrêter le reste avant de conclure.

## Décisions actées, à ne pas rouvrir

- **L'export n'est pas reproductible à l'octet près, et c'est un choix**
  (Yann, 2026-08-25). Le bruit blanc partagé et l'impulsion de réverbe sont
  tirés hors du `rng` injecté. Ce que le `rng` garantit, ce sont les **notes**.
- **La skin Winamp 2.x est un choix, pas un héritage.** Le biseau d'un pixel est
  la grammaire.
- **Un acte cite des niveaux du réservoir, il n'en fabrique jamais.**
- **Une commande vérifie un cahier des charges, jamais une cible.**

## Où lire quoi

| Fichier | Ce qu'il porte |
|---|---|
| `CLAUDE.md` | les règles, les pièges, les invariants — **fait autorité** |
| `PLAN.md` | le journal détaillé, une entrée ✅ par livraison |
| `HISTOIRE.md` | le récit source (entièrement porté) |
| `src/model/carriere.ts` | les huit actes + l'épilogue |
| `src/model/exercises.ts` | les 11 verbes, et la notation pure |
| `src/model/parametres.ts` | le catalogue des boutons enseignables |
| `src/model/commande.ts` | ce que Sol vérifie en recevant un morceau |
| `original/boite-a-rythme-69.html` | la source de vérité pour l'audio |

## Pistes ouvertes, si rien d'autre n'est demandé

Aucune n'est engagée — demander avant de plonger.

- Le découpage en ~130 exercices évoqué dans `HISTOIRE.md` (les actes en citent
  aujourd'hui bien moins).
- Les quatre presets hors époque (trap moderne, drill, amapiano, gqom) ne sont
  jamais commandés pendant la campagne — c'est voulu, mais jamais vérifié par un
  test.
- L'arbitrage design A/B/C de `PLAN.md` (« XP est le cadre, l'instrument est
  sombre ») est resté en attente depuis août.
