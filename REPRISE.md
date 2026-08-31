# Reprise — brief de session

> À lire en premier, avant `PLAN.md` (7 400 lignes, c'est le journal détaillé ;
> ceci en est la carte). `CLAUDE.md` reste la source des règles.
>
> Dernière mise à jour : 2026-08-27, après la partie complète de Yann.

## Où en est le projet

**Face B** — séquenceur web en Svelte 5, skin Winamp 2.x, déployé sur
<https://boite-a-rythmes.vercel.app>. Quatre modules : **Atelier** (composition),
**Synthé**, **Production**, **Mode Live**, plus le **Mode jeu**.

`main` est vert, 411 tests, 0 erreur de types, les deux builds passent.

Le gros du travail récent porte sur le **Mode jeu**, dont le Mode carrière est
devenu l'écran d'entrée : les huit actes de `HISTOIRE.md` sont écrits, plus
l'épilogue. Le récit est **entièrement porté** — il n'y a plus de texte en
attente dans `HISTOIRE.md`.

| | |
|---|---|
| Actes jouables | 8 sur 8, plus l'épilogue |
| Verbes d'exercice | 11 (`ExerciseKind`) |
| Niveaux | 61 (34 de campagne + le reste du réservoir) |
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

## Le retour de partie de Yann (2026-08-27) — ce qui est fait, ce qui reste

Une partie complète jouée à la main. **12 points sur 19 sont traités** ; le
reste est là, dans l'ordre où je propose de le prendre.

### Fait

| | |
|---|---|
| L'acte 3 était un cul-de-sac | `modulesRequis` — la commande ouvre le Synthé qu'elle exige |
| La check-list déjà cochée | `etatVierge()` — une commande part d'un Atelier vide |
| Le jeu s'appelle **Face B** | et l'entrée s'appelle **Jouer**, plus « Mode jeu » |
| Le verrouillé est masqué | plus aucun cadenas à l'écran |
| Les dates | 2005, une seule date écrite, le reste déduit |
| La mélodie | cases + clavier comme l'Atelier, tonique donnée |
| Les promesses de l'acte 1 | le forçage variante/rafale enfin porté |
| L'export de la sonnerie | sorti de l'onglet verrouillé |
| L'acte 1 monte en difficulté | huit rythmes ÉCRITS, une nouveauté chacun (`GrilleEcrite`) |
| Le jeu réagit à ce qu'on livre | réaction calculée sur l'état, calibrée sur les 34 presets |
| Les productions restent | discographie par pseudo — réécouter, reprendre dans l'Atelier |

### Reste — plus aucun bug signalé en attente

1. ~~**Acte 3, « bug sur la basse à deviner »**~~ — traité au mieux de ce qui
   était reproductible. La logique était saine (poser exactement la cible est
   accepté, vérifié aux niveaux 42 et 43) ; ce qui ne l'était pas : la tonique
   annoncée comme repère n'était pas posée, et l'interface était un rouleau de
   quarante cases. Refondue en cases + clavier, tonique donnée. **Si le défaut
   persiste, il est dans le SON — c'est la piste qui reste.**
2. ~~**Acte 1, les promesses non tenues**~~ — corrigé. `forceVariantCount` /
   `forceRollCount` n'étaient lus par personne : 0 variante et 0 rafale sur 60
   tirages aux niveaux 5, 8 et 9. Le forçage est porté, y compris sur les
   niveaux preset. Les gestes, eux, existaient bien (clic pour la variante,
   clic droit pour la rafale) et le préambule les explique.
3. ~~**Acte 1, exporter sa sonnerie**~~ — corrigé. L'export a quitté l'onglet
   Production : il vit hors des onglets, toujours atteignable. Exporter n'est
   pas un réglage de production, c'est finir.

### Reste — forme du récit

4. **Indiquer qui parle**, à chaque réplique.
5. **Faire défiler le texte** (révélation progressive).

Les deux touchent les 44 écrans de récit et demandent la même passe : attribuer
chaque ligne à un locuteur. À faire ensemble.

### Reste — l'acte 0, qui ne marche pas

6. « En l'état ça marche pas, c'est pas fun, trop dur à comprendre. » La trame
   proposée : faire un tempo → le tempo désigne un style → deviner le style
   parmi quatre séquences → puis répéter la mesure (l'intrus, le pitch en
   hausse, l'attaque au minimum), **le tout sur une seule séquence**.

### Reste — la courbe et le contenu

7. **Acte 2** : remplacer les quiz « lequel » par des réglages.
8. **Acte 2** : la commande en plusieurs étapes (« fais d'abord un poom check
   poom poom chack », puis le reste du cahier).
9. ~~**Monter la difficulté de l'acte 1**~~ — fait. Cinq exercices → huit, tous
   à **grille écrite** : backbeat, trio, syncope, puis rim shot, charley ouvert,
   les deux ensemble, rafale, tout ensemble. Chacun n'ajoute qu'une chose, ce
   qu'un tirage ne sait pas faire (`GrilleEcrite`, `tests/grilles-ecrites.test.ts`).
   **Reste l'acte 2** : beaucoup d'exercices d'atelier.
10. **Étendre les grilles écrites au-delà de l'acte 1** — les autres actes citent
    encore des niveaux générés (~28 exercices de grille). Même chantier, même
    méthode : une promesse par test.
11. **Les roasts d'EXERCICE** (`gameData.ts`) : tous les textes à revoir. Ceux
    de LIVRAISON sont faits (`reactions.ts`) — la différence compte : les
    premiers commentent la façon de jouer, les seconds le morceau produit.
12. **Les besaces** : introduire le concept (aujourd'hui on en gagne sans
    savoir ce que c'est), et leur donner un usage à la fin. Piste retenue par
    Yann : une fin alternative, un EP si on a tous les objets.

⚠️ Le retour s'arrêtait sur « Acte 4 » sans contenu — il manque peut-être la
fin de la liste.

## Ce qui est vérifié, et ce qui ne l'est pas

**Vérifié** — types, 411 tests (les tests aléatoires affirment ce qui est vrai à
chaque tirage et répètent 60 fois), les deux builds, et un parcours Playwright
par acte en 390×840. Les huit grilles écrites de l'acte 1 ont en plus été
mesurées dans l'appli en marche : elles sont posées au bit près, rafales
comprises.

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

## L'audit du 27 août — ce qu'il a trouvé

Mesuré sur le code, pas de mémoire (`main de2eaa4`) :

- **29 niveaux sur 61 ne sont cités par aucun acte**, dont 19 des 21 niveaux de
  la plage 14 à 34 : swing, traîne, ghost notes, fill, décalage, polyrythmie,
  mesure longue. C'est la moitié du jeu qui n'existe que dans le tableau (seuls
  les presets 27 et 32 sont rattrapés par l'acte 5).
- **La carrière dure 60 à 125 min**, la cible de Yann est 120 au minimum.
- ~~10 boutons enseignés sur 155 réglages~~ → **14 depuis le 2026-08-31** :
  ghost notes, vélocité aléatoire, rafales spontanées et saturation, tous mesurés
  en rejouant le scheduler. Deux candidats **écartés par la mesure** (compression
  et bitcrush, effet non monotone). Toujours **aucun du synthé** : la
  cartographie est faite, c'est un chantier à part (le machinery des verbes de
  paramètre construit une grille de batterie, pas une ligne de synthé).
- Un verbe porte 13 des 32 exercices ; `completer` et `intrus` ne sont jamais
  cités ; l'acte 6 n'a aucun exercice.

**Chantier A — tranche 1 FAITE.** Les niveaux 14, 17 et 23 (balancement léger,
balancement franc, décalage du charley) sont réécrits en grilles écrites et
cités par l'acte 2, qui passe de 9 à 12 étapes. Il a fallu d'abord que
`GrilleEcrite` porte le FEEL : le décalage était **forcé à zéro** sur toute
grille écrite, donc le niveau 23 n'en jouait aucun.

Deux décisions prises au passage, mesurées et non supposées :

- **la traîne n'est pas un exercice** — `drag` est global, il décale tout du
  même montant, donc rien relativement. Les niveaux 15 et 18 restent orphelins
  par décision (`tests/feel-ecrit.test.ts` en fait la preuve) ;
- **`GameLevel.ghost` et `GameLevel.fill` ne sont lus par personne** — même
  famille que `forceVariantCount`. Les niveaux 20 et 21 promettent ce que le
  code ne pose pas. Une ghost note est une affaire de vélocité, qu'une grille
  ne dessine pas : leur place est dans un cahier de commande, pas dans
  `reproduire`.

**Chantier A — tranche 2 FAITE.** Quatre presets de l'époque rendus à l'acte 5
(UK Garage, French touch, Tresillo, Clave), qui passe de 12 à 16 étapes. Et
l'anachronisme trouvé en route, corrigé (voir ci-dessus).

**Chantier A — tranche 3 FAITE.** Cinq polyrythmies enseignaient deux idées
(leurs propres préambules le disaient : « le même rapport 4:3 qu'au niveau
précédent », « le vrai défi de lecture »). Deux restent, réécrites : 24 (trois
cycles premiers entre eux) et 29 (le 4:3 afro-cubain), citées à l'acte 5 juste
après la clave — la polyrythmie est l'idée dont le tresillo et la clave
descendent. L'acte passe à 18 étapes.

⚠️ **Une fragilité corrigée au passage** : `demarrerEtape` faisait
`startLevel(niveau - 1)`, une recherche POSITIONNELLE à partir d'un id. Un
niveau inséré au milieu aurait décalé tous les exercices de tous les actes, en
silence. La recherche se fait par id ; « poser en fin de tableau » reste une
bonne pratique mais n'est plus load-bearing. Et **un niveau ne se supprime
jamais** — il cesse d'être cité.

**CHANTIER A TERMINÉ. Compteur d'orphelins : 29 → 20**, 41 niveaux joués sur 61
contre 32 à l'audit, sans qu'un seul niveau ait été écrit de zéro. Les 20 qui
restent le sont chacun pour une raison écrite (voir PLAN.md, tranche 3) — plus
aucun par accident.

**Chantier B — tranche 1 FAITE (2026-08-28).** L'acte 2 est la première commande
qui TRANSFORME : l'Atelier s'ouvre sur le rythme du niveau 17 que le joueur
vient de reproduire, et le cahier de Kelvin a été réécrit contre ce rythme —
check-list à **0/4** à l'ouverture, mesuré dans l'appli.

⚠️ **Le conflit à ne pas rouvrir.** Deux règles écrites disaient « une commande
part d'un Atelier vide ». Elles ne sont pas annulées : ce qu'elles interdisent
est une case cochée d'avance, pas un Atelier non vide. Partir d'un rythme est
permis **à condition que le cahier exige ce que ce rythme n'a pas**, et
`tests/transformer.test.ts` est cette condition. Deux corollaires trouvés en
route : `Contrainte.interdit` (une interdiction est légitimement cochée au
départ) et le fait qu'un état « qui satisfait tous les cahiers » n'existe pas —
la fiche techno veut un charley plein, Kelvin veut un charley troué.

**Les ghost notes existent enfin.** Les niveaux 20 et 21 les annonçaient sans
que le code les pose ; le niveau 62 (« Ce qui bouge tout seul ») les fait
entendre pour de bon, cité par l'acte 2. Piège trouvé au passage : enrichir la
famille `groove` aurait fait du niveau 47 (« Swing ou décalage ? ») une question
à quatre choix dont le titre en annonce deux — sa liste est explicite désormais.

**Reste du chantier B** : les cinq autres commandes partent encore d'une table
rase. Chacune demande le même travail — choisir le rythme de départ, puis
réécrire son cahier contre ce rythme. C'est la moitié coûteuse et elle ne se
délègue pas à un test. Les ghost notes et les fills (niveaux 20, 21) attendent
toujours leur maison : un cahier sait demander « ajoute des ghost notes », une
grille ne sait pas les dessiner.

## La COURBE de difficulté — retour de testeur, 2026-08-31

> « Le jeu reste trop longtemps trop facile. »

Mesuré dans l'ordre où la carrière joue ses 42 exercices : **le premier
exercice plus dur que la fin de l'acte 1 arrivait au 33e sur 42**, et l'acte 2
était même un cran EN ARRIÈRE (24 cases sans variante contre 24 avec deux).
Chaque acte était cohérent avec lui-même ; c'est l'**enchaînement** qui ne
l'était pas, et aucun test ne le regardait.

Le niveau 63 (seize cases par ligne) donne son palier à l'acte 2 : le seuil
passe au **21e exercice**, de 79 % à 49 % du parcours. Un test empêche
désormais l'acte 2 de repasser sous l'acte 1.

**Les deux creux qui restent, mesurés, à arbitrer :**

- **Exercices 22 à 30 : neuf d'affilée sans aucune grille** (actes 3 et 4).
  Leur sujet est la mélodie et la production ; y poser une reproduction demande
  de décider ce qu'elle enseigne.
- **L'acte 5 repart à 16 cases** après le palier à 48, puis serpente : 16, 16,
  20, 40, 36, 32, 24, 24, 28, 22. Le trier est trivial côté données, mais chaque
  preset est attaché à une réplique (« Kelvin vérifie le hip-hop ») — trier
  demande de réécrire ces lignes.

## Pistes ouvertes, si rien d'autre n'est demandé

Aucune n'est engagée — demander avant de plonger.

- Le découpage en ~130 exercices évoqué dans `HISTOIRE.md` (les actes en citent
  aujourd'hui bien moins).
- ~~Les quatre presets hors époque ne sont jamais commandés~~ — **c'était faux.**
  Mesuré : le verbe `style` les tirait, 39 % des parties en affichaient un et
  10 % du temps c'était la bonne réponse. Corrigé (`HORS_EPOQUE`), et le test
  existe maintenant. À retenir : « voulu mais jamais vérifié » veut dire « pas
  fait ».
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
