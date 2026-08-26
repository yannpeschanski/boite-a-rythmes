# Reprise — brief de session

> À lire en premier, avant `PLAN.md` (7 400 lignes, c'est le journal détaillé ;
> ceci en est la carte). `CLAUDE.md` reste la source des règles.
>
> Dernière mise à jour : 2026-08-26, après l'acte 4 en deux temps.

## Où en est le projet

Séquenceur / boîte à rythmes web en Svelte 5, skin Winamp 2.x, déployé sur
<https://boite-a-rythmes.vercel.app>. Quatre modules : **Atelier** (composition),
**Synthé**, **Production**, **Mode Live**, plus le **Mode jeu**.

`main` est vert, 287 tests, 0 erreur de types, les deux builds passent.

Le gros du travail récent porte sur le **Mode jeu**, dont le Mode carrière est
devenu l'écran d'entrée : les huit actes de `HISTOIRE.md` sont écrits, plus
l'épilogue. Le récit est **entièrement porté** — il n'y a plus de texte en
attente dans `HISTOIRE.md`.

| | |
|---|---|
| Actes jouables | 8 sur 8, plus l'épilogue |
| Verbes d'exercice | 11 (`ExerciseKind`) |
| Niveaux | 58 |
| Commandes (production à livrer) | 5, aux actes 2 à 6 |

## Le déverrouillage — tranché le 2026-08-26

**C'était LA décision en attente ; elle est prise et livrée.** Les quatre
modules se déverrouillaient tous à la fin de l'acte 0, ce qui vidait le
déverrouillage narratif — le principe même du Mode carrière — de son rôle.

**Arbitrage de Yann : le plancher gelé** (sortie 1 des trois proposées).

`PlayerProgress.plancher` est le `level` d'AVANT la carrière, gelé une fois pour
toutes dans `load()`, et c'est LUI que lisent les seuils de `moduleUnlocked` —
plus jamais `level`, que la carrière fait monter en citant des niveaux du
réservoir. Un joueur neuf gèle `1` : le récit gouverne seul. Un vétéran gèle ce
qu'il avait : il ne perd aucun module. La règle qui en découle, inscrite dans
`CLAUDE.md` : **une porte déjà ouverte ne se referme jamais.**

Vérifié par `scripts/parcours-carriere.cjs` depuis un joueur neuf — les modules
s'ouvrent un par un (Atelier à la livraison de l'acte 1, Synthé à l'acte 4,
Production à l'acte 5, Live à l'épilogue), là où tout tombait d'un coup avant.

**Sur la sauvegarde, qui était la vraie question :** rien n'était à écrire.
La reprise existait et était juste — curseur `{ acte, etape }` persisté par
étape franchie, jamais reculant, restauré par `setPseudo` → `load()`, et les
modules **dérivés** de l'acte plutôt que stockés (une seule source de vérité).
Deux limites connues et non traitées, par choix : rien ne traverse les appareils
(il faudrait un code de reprise, `share.ts` saurait le porter), et la
granularité est l'étape, pas l'exercice — un exercice abandonné reprend à son
début.

## Le chantier en cours — revoir les niveaux en profondeur

Retours de Yann (2026-08-26) sur la difficulté et l'amusement : *« bizarre les
exercices pour la production »*, *« il faut pousser les exercices à faire en
atelier »*, *« les livraisons en atelier, c'est vraiment bien, il faut pousser
le jeu dans cette direction à fond »*.

Diagnostic : le jeu enseigne en faisant RETROUVER, et la seule chose qui
l'intéresse — produire — n'apparaît qu'à la fin de chaque acte, sans lien avec
les exercices qui précèdent.

**Tranche 1 — LIVRÉE.** Les fiches de style (`src/model/styles.ts`) :
description, validation par part de critères avec seuil réglable, verrou de
provenance sur les presets, basse exigée. Calibrée et testée sur **un** genre,
dancehall. Voir `PLAN.md`, « Les fiches de style ».

**Tranche 2 — LIVRÉE.** L'acte 4 en deux temps : produire un morceau techno
(fiche `techno`), puis le régler pour qu'il tienne à la laverie. L'arbitrage
« qu'est-ce qui compte comme mieux mixé » a été délégué et tranché ainsi : on
mesure l'ÉTAT et non l'audio rendu (sinon le cahier vivant devient asynchrone),
trois critères et pas dix, et **chacun exige un geste** — un critère coché sans
rien toucher est du théâtre. Le seuil du drive vient de la mesure du petit
haut-parleur. Voir `PLAN.md`, « L'acte 4 en deux temps ».

**Tranche 3 — à faire.** Sortir les niveaux `reproduire` 4/12/13/27/32 de l'acte
5 vers la salle de répétition, et les remplacer par des commandes de style (une
fiche par genre). Les verbes de paramètre 54-57 de l'acte 4 sont à déplacer de
la même façon : ils ne sont pas mauvais, ils sont au mauvais endroit.

## Ce qui est vérifié, et ce qui ne l'est pas

**Vérifié** — types, 287 tests (les tests aléatoires affirment ce qui est vrai à
chaque tirage et répètent 60 fois), les deux builds, et un parcours Playwright
par acte en 390×840.

**La chaîne des actes est saine.** `scripts/parcours-carriere.cjs` joue la
carrière entière depuis un joueur neuf : les huit actes s'enchaînent, les cinq
commandes sont acceptées, l'épilogue est atteint, aucune erreur console, et les
modules s'ouvrent désormais un par un. Il ne trouve plus rien.

**Angle mort à ne pas repayer :** chaque acte avait été vérifié isolément avec
une fixture `localStorage` où `level` était posé à la main. C'est ce qui a caché
le défaut du déverrouillage pendant sept PR — une fixture ne joue pas le jeu.
**Relancer `scripts/parcours-carriere.cjs` après toute modification du
déverrouillage, de la progression ou de la chaîne des actes** (`npm run dev`
dans un terminal, puis `node scripts/parcours-carriere.cjs`). Même raison pour
`tests/plancher.test.ts`, qui monte un vrai `localStorage` en mémoire plutôt que
de poser l'objet attendu.

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
- **Le HMR de Vite fait mentir `parcours-carriere.cjs`.** Après une
  modification, le script reçoit une SECONDE instance de `game` pendant que le
  store `unlocks` garde la première : la colonne « modules » affiche « — » sur
  les huit actes, ce qui ressemble trait pour trait à une régression du
  déverrouillage. Redémarrer `npm run dev` avant de conclure — d'un script comme
  d'une capture Playwright.
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
- **Une porte déjà ouverte ne se referme jamais** (Yann, 2026-08-26) — d'où le
  plancher gelé, et son repli sur `level` pour les sauvegardes d'avant.
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
  sombre ») est resté en attente depuis août — c'est la plus ancienne décision
  ouverte, et elle conditionne toute passe d'UI.
- **Le Mode Live reste à l'acte 7**, donc derrière tout le récit, alors qu'il est
  le seul mode pensé pour le téléphone en paysage. Cohérent narrativement (l'acte
  7 *est* le concert), jamais essayé sur un vrai téléphone. À trancher dans la
  reprise du Mode Live.
- **Rien ne traverse les appareils** : téléphone et ordinateur sont deux joueurs
  distincts. Un « code de reprise » encodant la progression comme `share.ts`
  encode un rythme réglerait ça — chantier à part, non engagé.
