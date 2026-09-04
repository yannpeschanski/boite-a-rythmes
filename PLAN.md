# Plan de réécriture — « Boîte à rythmes » vers Svelte 5 + TypeScript + Vite

> Contexte : réécriture de `original/boite-a-rythme-69.html` (9 289 lignes, fichier unique).
> Analyse détaillée de l'original : voir [ANALYSE-ORIGINAL.md](ANALYSE-ORIGINAL.md).
>
> **Décisions fermes** : Svelte 5 + TS + Vite · distribution double (site + fichier HTML unique via vite-plugin-singlefile) · périmètre complet Atelier + Mode jeu (iso-fonctionnalités puis améliorations) · abandon du code dormant (ambiance splash, ~~verrouillage des modules~~ — voir ci-dessous) · design Windows XP conservé et assumé davantage.
>
> ⚠️ **Correction du 2026-08-16** : le « verrouillage des modules » n'était pas
> du code dormant mais une fonctionnalité **en attente d'arbitrage**, dite
> telle quelle dans l'original (`return true` + « TEMPORAIRE… le temps de
> décider comment relier réellement les modules à la progression du Mode
> jeu »). Yann vient de trancher cette question (D2) : la fonctionnalité
> revient. *Dormant* et *abandonné* ne sont pas synonymes — voir
> [Arbitrages D1-D4](docs/plan/02-audits-et-arbitrages.md).
>

## Les archives

⚠️ **Ce fichier ne porte plus que le journal VIVANT** — le Mode jeu et le Mode
carrière, c'est-à-dire ce sur quoi on travaille. Il faisait 9 279 lignes et
n'était plus consultable ; le reste est archivé tel quel dans `docs/plan/`, sans
une ligne réécrite ni réordonnée.

| Archive | Ce qu'elle porte |
|---|---|
| [`01-plan-de-migration.md`](docs/plan/01-plan-de-migration.md) | Plan de migration — le document d’origine |
| [`02-audits-et-arbitrages.md`](docs/plan/02-audits-et-arbitrages.md) | Audits de design et arbitrages de Yann |
| [`03-journal-migration.md`](docs/plan/03-journal-migration.md) | Journal — la migration et la peau Winamp |
| [`04-maquettes-et-moodboards.md`](docs/plan/04-maquettes-et-moodboards.md) | Maquettes — les sept séries de propositions |
| [`05-audit-mode-live.md`](docs/plan/05-audit-mode-live.md) | **Audit du Mode Live (2026-09-02)** — pas une archive : un chantier OUVERT, mesuré et pas encore arbitré |
| [`06-audit-architectures-de-morceau.md`](docs/plan/06-audit-architectures-de-morceau.md) | **Audit du macro-séquenceur (2026-09-02)** — décrire une architecture de morceau ; ouvert lui aussi |

⚠️ **Les renvois `PLAN.md §1` à `§7` semés dans le code restent valides** : ces
sections numérotées sont parties telles quelles dans
[`01-plan-de-migration.md`](docs/plan/01-plan-de-migration.md). Elles n'ont pas
été renumérotées — réécrire cent commentaires pour un déplacement de fichier
aurait coûté un diff illisible pour zéro information (même raisonnement que les
tokens `--xp-*`, gardés alors que la peau a changé).

Pour retrouver une décision : chercher son titre dans `CLAUDE.md` (la règle),
puis ici ou dans l'archive correspondante (la démonstration).

---

## Journal des livraisons — Mode jeu et Mode carrière

### ✅ Le récit se tape, et on sait qui parle (2026-09-04)

Demande de Yann : *« il faut faire défiler les textes et bien indiquer qui
parle. On pourrait d'ailleurs donner des voix aux personnages, exemple : Sol
fait un bruit de charley. Le texte off fait un bruit de machine à écrire. »*

**Fichiers touchés :** `src/model/locuteurs.ts` (neuf),
`src/engine/voixRecit.ts` (neuf), `src/ui/game/voix.ts` (neuf),
`src/ui/game/RecitLignes.svelte` (neuf), `src/model/carriere.ts`,
`src/ui/game/CarriereView.svelte`, `src/ui/game/GameView.svelte`,
`src/ui/xp/systemSounds.ts`, `tests/locuteurs.test.ts` (neuf),
`tests/carriere.test.ts`.

#### Qui parle vit dans la DONNÉE, pas dans une heuristique

Le récit marquait ses répliques d'un tiret cadratin et de rien d'autre :

```
'— Je vais vendre.',
'— Alors pourquoi on travaille encore ?',
```

Deux personnes, un signe, et le lecteur qui déduit l'alternance — fausse dès
qu'une réplique tient sur deux lignes (il y en a trente) ou qu'un troisième
personnage entre (l'acte 4 en a trois sur un écran). Les 163 répliques du jeu
portent maintenant leur nom : `'SOL: Je vais vendre.'`. Le catalogue est FERMÉ
(`model/locuteurs.ts`, six locuteurs) : un préfixe qui n'y est pas reste du
texte, sinon « FACE B — FB-015 » deviendrait la réplique d'un personnage nommé
« FACE ».

Deux heuristiques ont été écartées avant d'écrire une ligne : *alterner* (faux
dès le troisième personnage) et *« une ligne qui commence en minuscule continue
la précédente »* (juste 9 fois sur 10, donc faux sans jamais le dire).

Cinq lignes portaient la narration et la réplique ensemble
(« Sol rappelle. — Le morceau est bien. ») : elles ont été coupées en deux. Une
consigne d'exercice en portait trois d'un coup — elle est passée à une seule
voix : une consigne est UNE ligne, le dialogue a ses écrans.

#### Le nom est sur SA ligne, et c'est une mesure qui l'a décidé

Première version : le nom devant la réplique, en ambre. Mesuré sur les 68
écrans de récit du jeu en 390 px — **sept lignes se repliaient** qui ne se repliaient
pas avant, et une ligne qui se replie se lit comme du texte courant
(`CLAUDE.md`). Le nom est donc passé au-dessus, en étiquette : il ne coûte plus
que de la hauteur. Le rail d'un pixel qui relie ses lignes de suite, lui, est
posé dans la bordure intérieure du panneau — coût horizontal nul.

Mesure finale : **17 replis, exactement le compte d'avant**. (Ces 17-là sont
antérieurs et non traités : ce sont des lignes du récit écrites trop longues,
c'est de l'écriture, pas du code.)

Le rail a coûté deux corrections que seule la capture a montrées : en
`--xp-line` il existait sans se voir, et posé en marge négative sur la ligne il
était **rogné** — `overflow-y: auto` rend `overflow-x` défilant aussi.

#### Les voix sont des PERCUSSIONS

Six timbres synthétisés (`engine/voixRecit.ts`, pur) : charley pour Sol
(l'exemple de Yann, et le son le plus sec du kit), rim shot pour Kelvin — qui
tape du doigt sur la table dès sa première scène —, bois chaud pour Rachid,
tom grave pour le joueur, deux fréquences en bande étroite pour Le Tunnel, qui
ne parle qu'au téléphone, et la machine à écrire pour le texte off. Le nouveau
stagiaire de l'épilogue a la voix du joueur, exprès : c'est ce qui fait la
boucle.

Un personnage sonne **une fois par mot** (le rythme d'une parole), le texte off
une fois sur deux signes (celui d'une machine). Le contexte audio est celui des
sons système : un second contexte aurait rouvert le flux de sortie que sa
sieste sert à refermer.

#### Ce qui a été payé au passage

- **le texte est toujours entier dans le DOM**, la partie non tapée en fantôme
  invisible : sans elle, chaque ligne qui apparaît pousse les boutons vers le
  bas. Vérifié — la position de « Suite » ne bouge pas d'un pixel pendant la
  frappe ;
- **le rail et le nom attendent leur ligne** : sinon une colonne de traits
  ambre annonçait sous le curseur combien de répliques restaient, et de qui ;
- **le pseudo est interpolé APRÈS la lecture du nom** — un pseudo commençant par
  « SOL: » ne peut pas se faire passer pour Sol ;
- **le bouton 🔊 Voix ne se cache pas pendant le prologue**, seul de la barre :
  le premier écran fait du bruit dès la première lettre, et un son qu'on ne peut
  pas couper là où il commence n'est pas un réglage.

**Limite assumée :** les consignes d'exercice (`EtapeExercice.commande`) sont
attribuées quand elles sont d'une seule voix ; celles qui mêlent narration et
réplique sur une ligne restent en texte off.

**Vérification :** `npm run check` 0 erreur, 0 avertissement · **561 tests**
(8 neufs) · les deux builds · `scripts/parcours-carriere.cjs` de bout en bout
depuis un joueur neuf (les quatre modules s'ouvrent un par un, épilogue atteint,
aucune erreur console) · mesure Playwright en 390 × 844 des 68 écrans de récit :
aucun repli ajouté, aucun débordement, aucun défilement forcé, les boutons
immobiles pendant la frappe.

### ✅ La salle de répétition parle en ACTES — et huit niveaux ouvraient le voisin (2026-09-03)

Premier morceau du chantier final : *« enterrer le réservoir, fusionner carte et
salle de répétition, renuméroter par acte »*.

**⚠️ Un bug trouvé en ouvrant le chantier, et il touchait les niveaux les plus
récents.** La carte appelait `startLevel(l.id - 1)` : une POSITION déduite d'un
identifiant. Or `LEVELS` n'est pas trié par id et rien ne l'impose — le 73 s'est
retrouvé APRÈS les 74-78 le jour où le 78 a été inséré avant lui. Mesuré :
**huit niveaux** ouvraient l'exercice du VOISIN, en silence — l'écran affiche le
numéro cliqué, le contenu est celui d'à côté :

| on clique | on jouait |
|---|---|
| 62 | 63 |
| 63 | 62 |
| 73 | 74 |
| 74 | 75 |
| 75 | 76 |
| 76 | 77 |
| 77 | 78 |
| 78 | 73 |

C'est la faute déjà payée par `demarrerEtape` (« on cherche par IDENTIFIANT, pas
par position », CLAUDE.md) — elle avait juste un second domicile. `startLevelById`
la rend impossible : la vue n'a plus d'index à manipuler. Le même correctif vaut
pour `setPseudo`, qui chargeait `startLevel(prog.level - 1)`.

**La fusion carte / salle : c'était UN écran avec DEUX noms.** Le bouton
« 🗺️ Carte » du Mode jeu ouvrait exactement le panneau que le Mode carrière
appelle « Salle de répétition ». Deux noms font deux endroits dans la tête du
joueur — c'est ce qui l'avait déjà fait chercher le carnet au mauvais endroit.
Un seul nom désormais : « Répétition » sur la barre (quatre boutons à 390 px), et
le panneau porte son titre en clair.

**La renumérotation par acte, faite à l'AFFICHAGE.** La salle montrait des ids
bruts — « 39 », « 67 » — alors que son propre commentaire disait déjà qu'on refait
« celui d'avant, pas le 39 ». Elle groupe maintenant par acte et numérote **dans**
l'acte (`repereDeNiveau`) : « ACTE 3 — LA MÉLODIE · 1 2 3 4 5 6 7 ».

⚠️ **Et c'est ce qui règle le troisième point sans le risque qu'il portait.**
Changer `GameLevel.id` aurait touché `PlayerProgress.level`, les clés de `stars`
(qui SONT des ids), `partirDu` et toutes les sauvegardes déjà écrites chez les
joueurs — une migration à risque pour un bénéfice purement visuel. Les ids
restent des identifiants ; l'écran, lui, parle en coordonnées que le joueur peut
situer.

**Enterrer le réservoir, concrètement :** un niveau qu'aucun acte ne cite n'a pas
de repère, donc **pas de nom dans le jeu**, donc pas de place dans la salle. Le
compte du pied a dû suivre : il annonçait « 78 exercices rencontrés » sous un
écran qui en montrait 34 — la différence était exactement le réservoir.

**Vérifié :** 553 tests (6 neufs dans `tests/salle.test.ts`, dont « chaque niveau
s'ouvre sur LUI-MÊME » sur les 78), 0 erreur de types, les deux builds, le
parcours complet. En navigateur (390 × 844, pointeur tactile) : six groupes
d'actes, 34 cases, zone touchable de **45 px** (le dessin en fait 35 —
`.tap44-y` ajouté), aucun débordement, et un clic sur « Acte 3, exercice 3 »
ouvre bien le niveau 44 « Toute la gamme ».

**Fichiers :** `src/stores/game.svelte.ts` (`startLevelById`),
`src/ui/game/GameView.svelte`, `src/model/carriere.ts` (`repereDeNiveau`),
`tests/salle.test.ts` (neuf).

### ✅ Les boutons RELIRE marchent vraiment (2026-09-03)

> « les boutons relire ne fonctionnent pas » — Yann

**Et cette fois le bouton n'était pas en cause.** La veille, le même écran avait
un défaut inverse : relire un acte MARCHAIT, et rien ne le disait (ni titre, ni
relief, ni verbe). On a donné le mot. Il manquait de vérifier le geste **depuis
la fin du jeu** — et là, il ne se passait rien.

**La cause.** `enEpilogue` se lit sur le curseur PERSISTÉ, qui ne recule jamais :
une fois les huit actes derrière, il est vrai **pour toujours**. Or l'écran de
l'épilogue passe avant tout le reste dans le rendu. Cliquer « RELIRE » changeait
donc bien `acteActif`… et l'écran continuait d'afficher « SEPTEMBRE ·
Épilogue 1/5 ». Mesuré avant correctif :

| | avant le clic | après le clic |
|---|---|---|
| `acteActif` | 0 | **1** |
| écran affiché | SEPTEMBRE | **SEPTEMBRE** |
| position | Épilogue · 1/5 | **Épilogue · 1/5** |

**Le correctif.** Un drapeau `enRelecture`, **volatil** comme `acteActif` /
`etapeActive` — jamais persisté, il dit « le joueur regarde un acte, pas la
fin ». `ecranEpilogue` rend `null` tant qu'il est levé ; `ouvrirActe` le lève,
`reprendreCarriere` et `load` le baissent.

⚠️ **Et le retour, sans quoi la correction était un piège.** Le bouton
« ↺ Reprendre » est désactivé dès que la carrière est derrière
(`carriereEnAttente`) : une fois entré en relecture, un joueur qui a fini
n'aurait eu **aucun chemin de retour vers l'épilogue**. Il s'active donc pendant
une relecture et s'appelle alors **« ↺ Revenir à la fin » **; `reprendreCarriere`
traite le cas « fini » en rendant l'épilogue au lieu de recharger une étape de
l'acte 7 sous un écran qui l'aurait masquée.

⚠️ **Ce que le correctif a cassé dans la suite, et pourquoi c'est instructif :**
deux tests sont tombés, dont un qui ne parlait pas de relecture. `enRelecture`
est de l'état de VUE et le store est un singleton : un `ouvrirActe` d'un test
précédent laissait le joueur en relecture. Corrigé aux deux bouts — le helper
`carriereFinie()` part d'une vue neuve, et `load()` baisse le drapeau (changer
de joueur sort de toute relecture).

**Vérifié :** 546 tests (3 neufs, confrontés au bug : ils échouent bien quand on
retire la ligne), 0 erreur de types, les deux builds. Et en navigateur, depuis
une carrière **réellement jouée jusqu'au bout** : le clic affiche « BRIEF —
CLIENT · Acte 1 · 1/11 », le bouton devient « Revenir à la fin » et rend
l'épilogue, l'exercice de l'acte relu **charge son niveau** (67), et le curseur
reste à `{acte: 8}`. Zéro erreur console.

**Fichiers :** `src/stores/game.svelte.ts`, `src/ui/game/CarriereView.svelte`,
`tests/carriere.test.ts`.

### ✅ Le concert se JOUE — l'acte 7 en Mode Live (2026-09-02)

Seconde moitié de la tranche 6 : *« l'acte 7 en Mode Live jouable »*. Avec
l'épilogue livré juste avant, la tranche est close.

**Le problème.** L'acte 7 EST le concert, et il se jouait entièrement au clavier
du Mode jeu : deux exercices de frappe et sept écrans de texte. Le Mode Live —
le seul mode pensé pour ça — s'ouvrait **après**, en récompense. On décrivait au
joueur ce qu'il aurait pu faire.

**Un cinquième type d'étape : `EtapeScene`.** Le seul endroit du jeu où l'on ne
retrouve rien et où l'on ne produit rien : on JOUE. Trois décisions dans le
type :

- ⚠️ **le morceau joué est CELUI DU JOUEUR** — la production livrée à l'acte
  cité, pas un motif de démonstration. Le rappel réclame le jingle de la
  laverie ; c'est donc le jingle de la laverie **du joueur** (acte 3) qui part
  sur scène ;
- ⚠️ **la scène OUVRE le Mode Live** (`modulesRequis`), comme une commande ouvre
  le Synthé dont son cahier a besoin. Sans ça, l'étape enverrait dans un module
  cadenassé — le cul-de-sac déjà payé à l'acte 3. Le câblage a demandé de
  fusionner ce que réclament la commande ET la scène (`game.modulesRequis`) :
  `unlocks` ne lisait que la commande ;
- ⚠️ **un concert ne se NOTE pas.** Aucun score, aucune condition de sortie : on
  joue le temps qu'on veut, on redescend, le récit avance. Noter le rappel
  contredirait la seule phrase que l'acte répète — *« tu te planteras, mais
  maintenant tu sais quoi faire après »*.

**Où il tombe.** Juste avant « LE RAPPEL », qui raconte trente personnes en
train de chanter douze secondes écrites pour vendre de la lessive. Le texte
racontait déjà le joueur en train de jouer : il le raconte maintenant **après**
qu'il l'a fait. La première ligne du RAPPEL a déménagé dans la scène, pour ne
pas la dire deux fois.

**Le Mode Live mesuré en PAYSAGE, pour la première fois** (844 × 390, pointeur
grossier émulé) : 16 commandes, **une seule** sous 44 px de zone touchable
(31 px), aucun débordement de page, et le séquenceur affiche bien le morceau
chargé. ⚠️ La mesure au `getBoundingClientRect` disait « 10 boutons trop
petits » — elle ne voit pas l'enveloppe `.tap44` (pseudo-élément sous
`@media (pointer: coarse)`), exactement comme `CLAUDE.md` le dit. Mesurer la
vraie zone demande `elementFromPoint` **et** un contexte tactile.

⚠️ **Ce que la mesure a montré et qu'il a fallu dire** : en portrait, le Mode
Live n'affiche que « TOURNE TON TÉLÉPHONE ». Envoyer le joueur sur scène sans le
prévenir fait tomber le seul moment de concert du jeu sur un mur d'instructions.
L'écran de scène le dit donc avant.

**Vérifié :** 511 tests (5 de données sur la scène, 2 sur le déverrouillage),
0 erreur de types, les deux builds, le parcours complet (l'acte 7 passe à
10 étapes, « Mode Live ouvert » à la scène), et en navigateur le tour complet :
scène → Live avec le jingle dedans → retour au récit à « LE RAPPEL », curseur
avancé, `sceneEnCours` rendu, zéro erreur console.

**Fichiers :** `src/model/carriere.ts` (`EtapeScene`, acte 7),
`src/stores/game.svelte.ts` (`ouvrirScene`, `terminerScene`, `modulesRequis`),
`src/stores/unlocks.svelte.ts`, `src/ui/game/CarriereView.svelte`,
`src/ui/game/GameView.svelte`, `src/App.svelte`, `tests/carriere.test.ts`,
`tests/unlocks.test.ts`, `scripts/parcours-carriere.cjs`.

### ✅ L'épilogue fait entendre le disque du joueur (2026-09-02)

Première moitié de la tranche 6 — *« l'épilogue (« pas assez d'émotion ») »*.

**Le diagnostic.** L'épilogue est bon à lire et il ne se passe rien : cinq
écrans de texte, un « Suite ▸ », et une phrase — *« Mais FB-015 est sorti »* —
qui parle d'un disque qu'on n'entend **jamais**. Or ce disque existe : c'est la
production que le joueur a livrée à l'acte 6, sérialisée dans la discographie.
Le dépôt a déjà la règle — *une leçon de production ne se raconte pas, elle se
fait entendre* ; ici c'est la fin du jeu qui ne se racontait pas.

**Ce qui a été fait.** Le morceau du joueur démarre pendant l'épilogue et tourne
sous les écrans suivants, jusqu'à FIN.

- ⚠️ **au DEUXIÈME écran, pas au premier** : le premier finit sur « Mais FB-015
  est sorti », et un disque qui démarre avant cette phrase la devance ;
- ⚠️ **il se NOMME** — « FB-015 · ton morceau, celui qui est sorti ». Un morceau
  qui sort de l'appareil sans que rien ne dise ce qu'il est passe pour une
  musique d'ambiance, alors que c'est celui du joueur, et c'est tout l'effet ;
- ⚠️ **il s'arrête** : une fin de jeu n'impose pas sa bande-son. Et une fois
  arrêté, il ne redémarre pas à l'écran suivant — sinon le bouton d'arrêt ne
  voudrait rien dire.

⚠️ **L'acte du disque se DÉDUIT, il ne s'écrit pas — `ACTE_DU_DISQUE`.** Écrit
en dur (`6`) dans la vue, ce nombre serait devenu faux le jour où la dernière
commande changerait d'acte, et **l'épilogue se serait tu sans rien dire** — la
panne qu'on ne remarque qu'en rejouant jusqu'au bout. Il est donc dérivé : c'est
l'acte de la dernière commande du récit. Deux tests le tiennent (aucune commande
après lui ; rien que du récit après elle).

**Vérifié :** 504 tests, 0 erreur de types, les deux builds, et surtout **la
carrière entière jouée depuis un joueur neuf** (le harnais du parcours, prolongé
jusqu'à l'épilogue) : écran 1 sans disque, écrans 2 à 5 avec le disque en
lecture et nommé, zéro erreur console.

⚠️ **Reste la seconde moitié de la tranche 6** : l'acte 7 (le concert) en Mode
Live jouable. C'est une intégration à part — navigation, chargement du morceau,
chemin de retour — et le Mode Live n'a toujours jamais été essayé sur un vrai
téléphone en paysage.

**Fichiers :** `src/ui/game/CarriereView.svelte`, `src/model/carriere.ts`
(`ACTE_DU_DISQUE`), `tests/carriere.test.ts`.

### ✅ Relire un acte se VOIT, et le niveau 78 s'annonce (2026-09-02)

> « comment tu comptes intégrer ce niveau ? d'ailleurs, remarque pour tester :
> on ne peut pas refaire les actes une fois passée, seulement les niveaux dans
> la salle de répétition, ce serait bien de pouvoir retourner sur un acte,
> relire ce qui a été dit et refaire les niveaux » — Yann

**1 · Le carnet — la capacité existait, l'écran la cachait.** Vérifié en jouant
la carrière (pas en fixture, voir plus bas) : cliquer un acte du carnet ouvre
bien l'acte à son premier écran, on relit, on avance, on refait les exercices,
et le curseur enregistré ne bouge pas (`{acte:2, etape:11}` avant et après).
`ouvrirActe` est même testé depuis longtemps.

Ce qui manquait était **le mot**. Le carnet n'avait ni titre, ni relief, ni
verbe : trois lignes vertes sur fond d'afficheur se lisent comme un RÉSUMÉ, et
la seule phrase sous lui nommait… la salle de répétition — c'est-à-dire l'autre
chemin, celui que Yann a trouvé. D'où : un titre (« CARNET — **RELIRE UN ACTE**,
RÉCIT ET EXERCICES »), un verbe en ambre par ligne (`RELIRE ▸` / `REPRENDRE ▸`),
un survol et un enfoncement (le biseau d'un pixel EST la grammaire), et un pied
qui oppose enfin les deux chemins. Mesuré : lignes à 49 px (au-dessus des 44),
aucun débordement.

⚠️ **La règle qui en sort** : une capacité qu'aucun mot ne nomme n'existe pas —
corollaire direct de « ce qui n'a pas été porté n'existe pas ». Elle est à
refaire, pas à documenter.

**2 · Le niveau 78 s'annonce avant de se demander.** La question « comment tu
comptes l'intégrer ? » a une bonne réponse et une mauvaise. La mauvaise était
l'état livré : le 78 était le **cinquième exercice d'affilée** de l'acte 3, et
son idée neuve (une ligne qui ne revient plus au bout d'une mesure) n'était
expliquée que par son préambule — c'est-à-dire **dans** l'exercice, donc trop
tard. Le dépôt a déjà la règle : *une nouveauté n'est demandée qu'après avoir
été MONTRÉE à l'écran*.

Un écran de récit se pose donc avant lui, et c'est Rachid qui parle — lui qui
écoute et qui paie : *« Au bout de trois fois, je sais ce qui vient. […] Ça fait
sonnerie. Je veux un morceau. »*, et Sol : *« Alors laisse-la finir sa phrase. »*
Les mots sont ceux de Yann en jouant (« ça fait très sonnerie polyphonique…
mais pour un morceau, il faut des cycles différents »). Il coupe aussi la série
de cinq exercices.

⚠️ **Mesuré, pas relu** : une ligne se repliait (29 px contre 14) —
« Sol, sans lever les yeux : — Alors laisse-la finir sa phrase. ». Corrigée en
**coupant** la ligne, jamais en réécrivant le texte. Dix lignes, aucune qui se
replie, l'écran tient dans 844 px.

⚠️ **Le piège qui a coûté trois scripts de mesure** : `progresCarriere` est un
**getter**. `game.progresCarriere = {...}` dans un `page.evaluate` ne fait
**rien**, en silence (ce code n'est pas en mode strict). C'est ce qui avait fait
croire à un cul-de-sac à l'acte 6, et ça a resservi ici deux fois. Poser
`acteActif`/`etapeActive` — eux sont du `$state` — puis `demarrerEtape()`, ou
jouer la carrière. Inscrit dans `CLAUDE.md`.

**Vérifié :** 502 tests, 0 erreur de types, les deux builds, le parcours complet
(acte 3 à 17 étapes), et en navigateur : le carnet ouvre l'acte, le curseur ne
recule pas, zéro erreur console.

**Fichiers :** `src/ui/game/CarriereView.svelte`, `src/model/carriere.ts`,
`CLAUDE.md`.

### ✅ Couper une ligne à l'écoute, et des cycles de durées différentes (2026-09-02)

> « ce qui aiderait, ce serait de pouvoir muter des lignes quand on écoute pour
> s'y retrouver, je me demande si ça rend pas le jeu trop facile… à voir mais là,
> ça le rend inutilement difficile. […] on doit pouvoir explorer toutes les
> composantes, à savoir, des durées différentes de cycles par exemple. ce niveau
> à 8 cases est une bonne intro, d'ailleurs ça fait très sonnerie
> polyphonique… mais pour un morceau, il faut des cycles différents. » — Yann

**1 · L'ÉCOUTE se coupe, la NOTATION non.** C'est la réponse au doute (« trop
facile ? ») : couper une ligne enlève de la difficulté **d'écoute**, pas de
difficulté d'exercice. Toutes les lignes restent comparées, coupées ou non ; une
grille incomplète reste refusée. Le libellé de la ligne **est** le bouton (un
second bouton par ligne coûterait une colonne sur un téléphone), la grille passe
à 55 % d'opacité, et un bandeau rappelle que *« elles restent à reposer »* avec
un « Tout réentendre ». L'état repart neuf à chaque niveau — une coupure qui
survivrait ferait un exercice silencieux que rien n'explique.

**2 · Des cycles de durées différentes — `LigneArrangement.cycles`.** Jusqu'ici
tout revenait au bout d'une mesure : c'est une sonnerie, pas un morceau. Une
ligne peut désormais se déployer sur plusieurs mesures avant de se répéter.

⚠️ **La subdivision reste COMMUNE, et ce n'est pas un demi-choix.** Une colonne
reste un instant — sinon c'est une polyrythmie, un autre sujet déjà enseigné
(niveau 74), et la lecture croisée de six lignes devient impossible. Ce qui varie
est le nombre de **mesures**. Une ligne plus courte se **répète en face** des
suivantes, affichée en pâle : le blanc se serait lu comme un silence alors que la
ligne joue.

⚠️ **Réservé aux lignes de SYNTHÉ.** `DrumRowState` n'a pas de `cycleBars` : une
ligne de batterie reboucle sur sa mesure. Lui écrire `cycles: 2` donnerait une
ligne affichée sur deux mesures dont la seconde ne joue jamais — la moitié des
cases éditables, notées et inaudibles. `tests/arrangement.test.ts` le refuse.

⚠️ **Deux pièges de câblage, tous deux invisibles à l'œil :**

- `subdivisions` laissé à `subdiv` avec `cycleBars: 2` → la ligne affiche seize
  cases et n'en joue que huit. Le test compte les événements sur deux mesures et
  les confronte aux cases posées : il échoue bien quand on remet l'ancienne
  valeur (vérifié).
- le moteur donne le pas **dans la ligne** : une batterie d'une mesure renvoie
  0-7 même pendant la deuxième. Affiché tel quel, la tête de lecture allumerait
  la première moitié de l'écran pendant toute la boucle. On retrouve donc la
  mesure courante sur la ligne la plus **longue** et on décale les autres —
  mesuré en navigateur : les six lignes parcourent bien les colonnes 0 à 15.

**Le niveau 78 « Deux mesures »** : batterie sur une mesure, basse, mélodie et
nappe sur deux. Mesuré en 390 × 844 : **seize colonnes à 18,7 px** (exactement la
largeur déjà mesurée sur la grille de batterie), page 888 px soit 44 px de
défilement, aucun conteneur qui déborde. ⚠️ Un **trait de mesure** toutes les
huit colonnes a été ajouté : sans lui, seize cases se lisent comme une seule
mesure de seize — c'est-à-dire deux fois plus vite — et « la deuxième moitié
n'est pas la copie de la première » devient invérifiable à l'œil.

⚠️ **La règle de progression des arrangements a dû être élargie, pas contournée.**
Elle disait « le nombre de voix ne redescend jamais » ; le 78 pose six voix après
les sept du 77, exprès — empiler sept voix ET deux mesures ferait deux nouveautés
dans le même exercice. La règle est donc : **un arrangement ne recule pas sur les
DEUX axes à la fois** (voix, mesures). Ce que la série garantit encore : sept
voix quelque part, deux mesures quelque part.

**Vérifié :** 502 tests (4 neufs dans `tests/arrangement.test.ts` : la ligne
coupée reste notée, l'écoute repart à neuf, une ligne de deux mesures joue sa
seconde moitié, une ligne d'une mesure se répète), 0 erreur de types, les deux
builds, le parcours complet depuis un joueur neuf. En navigateur : le mute coupe
bien l'état, le bandeau et « Tout réentendre » fonctionnent, zéro erreur console.

**Fichiers :** `src/model/presets/levels.ts` (`cycles`, `longueurDeLigne`,
`mesuresDeLArrangement`, `colonnesDeLArrangement`, niveau 78),
`src/stores/game.svelte.ts`, `src/ui/game/GameView.svelte`,
`src/model/carriere.ts`, `tests/arrangement.test.ts`, `tests/carriere.test.ts`.

### ✅ La NAPPE et le SON d'un niveau (2026-09-02)

> « top ce niveau 77, il manque la nappe ! aussi, il faut jouer avec tous les
> paramètres même si on ne les bouge pas, ça peut rendre les son plus sympas.
> Par exemple dans ce niveau 77 : on aurait pu avoir delay et reverb sur la
> mélodie avec un son très court, une basse bien ronde au release élevé » — Yann

Deux demandes, deux mécanismes, une seule livraison.

**1 · La nappe entre dans l'arrangement — sans troisième nature de case.** Elle
en était exclue par écrit (« elle joue des accords, pas des degrés : ce serait
une troisième nature à lire et à écrire »). La sortie n'est pas de lui donner sa
grammaire mais de garder celle des autres : sa case porte un **degré**, et
`buildState` le traduit en index d'accord (`degré − 1`). Le joueur écrit « 3 »,
la nappe joue l'accord du troisième degré.

⚠️ **Ce qui se paie, et que seul un test attrape :** `scheduler.ts` lit le pas de
la nappe comme un `number`. Le `{ degree, octave }` des deux autres lignes y
devient `chordIdx = -1` — une ligne **affichée, éditable, notée et parfaitement
muette**. C'est exactement ce que le test « chaque ligne affichée s'entend »
détecte : je l'ai remis à l'ancienne version pour vérifier qu'il échoue bien.

⚠️ **Et le clavier suit la LIGNE, pas le niveau.** La nappe n'a que `chordCount`
accords (4) là où basse et mélodie montent à 5 : une cinquième touche y
proposerait un accord qui n'existe pas, donc une case impossible à remplir dans
un exercice qui exige l'exactitude. D'où `degreMaxDeLigne`, qui décide du
clavier affiché ET de ce que `arrPoserNote` accepte. Mesuré en navigateur : 6
touches sur la mélodie (5 degrés + l'effacement), 5 sur la nappe.

Le niveau 77 s'appelle donc **« Sept lignes »** : quatre de batterie, trois de
synthé. Mesuré en 390 × 844 — page 886 px, soit **42 px de défilement**, aucun
conteneur qui déborde, cases toujours à 40,4 px. Cohérent avec le huit-lignes
déjà mesuré (932 px).

**2 · Le SON d'un niveau — `src/model/sons.ts`.** Un niveau écrit décide de ses
timbres comme il décide de son feel : `sons` porte, par ligne, les envois de
réverbe et de delay, le volume, le module Timbre pour la batterie, et pour le
synthé une **voix citée au catalogue** (`SYNTH_VOICE_PRESETS`) plus des
`retouches`. Citer plutôt que réinventer : un second jeu de voix dans les niveaux
serait deux vérités qui divergent.

Trois règles, et chacune a son test :

- ⚠️ **le son n'est pas la réponse** — rien n'est comparé ni deviné ; la
  **cible et la version du joueur reçoivent exactement le même son**, sinon
  reposer une grille juste ne sonnerait pas comme le modèle et le joueur
  croirait s'être trompé ;
- ⚠️ **le décor passe AVANT la consigne** — `appliquerSons` est la première
  instruction de `buildState`, pour qu'un verbe de paramètre (qui règle
  lui-même le bouton qu'il fait entendre) gagne toujours ;
- ⚠️ **une voix inconnue ne retombe pas en silence sur le défaut** — un
  identifiant hors catalogue sonne « presque bien » et ne se voit qu'en
  connaissant le son attendu ; le test refuse tout id absent.

Ce que les trois niveaux entendent désormais : basse **ronde** au release long
(0,42 s) sur les trois ; mélodie **très courte** (release 0,06 s) avec delay 0,34
et réverbe 0,24 ; nappe **large et lointaine** (Rhodes, attaque 0,35 s, release
0,9 s, réverbe 0,45, étalement 0,35, volume baissé). Trois registres, trois
durées, trois places dans la salle — c'est le contraste qui rend l'empilement
lisible, pas le volume.

⚠️ **Un test instable est un bug, pas un test à recalibrer** — encore. La
première version du test d'ordre posait une valeur SENTINELLE (3) et vérifiait
que le champ ne la portait pas : « attack » est tombé sur 3 au bout de quelques
tirages et le test a échoué sur une réussite. Il compare désormais le **même
tirage avec et sans le son** — la seule formulation qui ne dépende d'aucun
hasard.

**Vérifié :** 497 tests (`tests/sons.test.ts`, 7 nouveaux, plus deux règles de
données dans `tests/carriere.test.ts` : le degré borné par ligne, et la nappe qui
n'arrive qu'après la basse et la mélodie), 0 erreur de types, les deux builds, le
parcours complet depuis un joueur neuf, et en navigateur : 56 cases, **les sept
têtes de lecture qui bougent**, zéro erreur console.

**Fichiers :** `src/model/sons.ts` (neuf), `src/model/presets/levels.ts`
(`degreMaxDeLigne`, `sons`, niveaux 75-77), `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/sons.test.ts` (neuf),
`tests/carriere.test.ts`.

### ✅ L'ARRANGEMENT — reposer plusieurs lignes à la fois (2026-09-02)

> « acte 3, je pensais à des exercices de reproduction de synthé avec en même
> temps plusieurs lignes ! d'ailleurs, on peut imaginer dans les actes suivants
> des reproductions à 6 voire 8 lignes (drum + synthé) » — Yann

**Un seul verbe neuf, pas deux.** La demande porte deux choses — l'acte 3 tout
de suite, les grosses reproductions plus tard — et la tentation était d'écrire
un verbe pour chacune. `arrangement` est bâti d'emblée sur **N lignes de deux
natures** : une ligne de batterie s'allume au clic (le geste de `reproduire`),
une ligne de synthé porte des degrés qu'un clavier écrit (le geste de
`melodie`). Les deux partagent la même colonne — c'est ce qui permet de lire qui
joue en même temps que qui, et c'est le sujet de l'exercice. `reproduire` et
`melodie` ne bougent pas.

**Les deux arbitrages de Yann** (posés en question, répondus avant le code) :
batterie + synthé **dès le premier** exercice multi-lignes (pas deux lignes de
synthé seules d'abord), et sur une ligne de synthé c'est le **degré exact** qui
est demandé, pas la seule présence d'une note.

| niveau | titre | lignes |
|---|---|---|
| 75 | Deux lignes à la fois | kick, snare, **basse** |
| 76 | La basse et la mélodie | kick, snare, **basse, mélodie** |
| 77 | Six lignes | kick, snare, clap, hat, **basse, mélodie** |

Ils se posent à l'acte 3 **après** les trois exercices de `melodie` : on
n'arrange pas ce qu'on ne sait pas encore écrire. L'axe de difficulté propre à
ce verbe est le **nombre de voix**, pas le nombre de cases — elles restent à
huit partout.

**Ce que la mesure a donné (390 × 844, Chromium) :**

| lignes | dernière rangée | bas du clavier | page |
|---|---|---|---|
| 3 (niveau 75) | 477 | 600 | 844, pas de défilement |
| 6 (niveau 77) | 628 | 751 | 844, pas de défilement |
| 8 (deux voix ajoutées à la main) | 746 | 869 | 932, la page défile de 88 px |

Donc : **six lignes est le plafond qui tient sans défiler**, huit passent en
faisant défiler la page, et rien n'est jamais coupé — aucun conteneur ne déborde
(`scrollWidth > clientWidth`), la largeur des cases reste à 40,4 px, les touches
du clavier à 56 × 40. Les 6-8 lignes des actes suivants ne demandent donc aucun
travail de mise en page ; c'est mesuré, pas supposé.

**Deux choses payées :**

- **le titre du niveau 77 mentait** — « Six lignes » pour cinq rangées. Corrigé
  en ajoutant le **clap** (qui double la claire sur le 2 et se tait sur le 4,
  un détail qu'on n'entend qu'en isolant une ligne), pas en changeant le titre :
  la demande parlait de six.
- ⚠️ **la coupure des lignes non citées ne peut pas passer par
  `GAME_DRUM_ROWS`** — il s'arrête à kick/snare/hat, alors que `defaultState()`
  ouvre les **cinq** lignes de batterie. Le shaker restait donc ouvert dans tous
  les arrangements (silencieux seulement parce que son motif est vide) et le
  clap du niveau 77 ne sonnait que par l'effet du déblocage explicite. Le
  balayage passe par `DRUM_ROW_NAMES`. C'est le test de câblage qui l'a montré,
  pas l'écoute.

**Vérifié :** `tests/arrangement.test.ts` (7 tests de CÂBLAGE — la cible copiée
case pour case, la tonique donnée et verrouillée, toute ligne non citée muette,
**chaque ligne affichée qui s'entend et rien d'autre** en rejouant le scheduler,
le tour complet par le vrai comparateur, le verrouillage d'une case juste) et
six tests de DONNÉES dans `tests/carriere.test.ts`. Plus, en navigateur : les
six têtes de lecture bougent pendant une vraie lecture, 48 cases affichées,
zéro erreur console. `scripts/parcours-carriere.cjs` a appris le verbe et joue
la carrière entière depuis un joueur neuf.

**Fichiers :** `src/model/exercises.ts`, `src/model/presets/levels.ts`
(`NatureLigne`, `LigneArrangement`, `GrilleArrangement`, niveaux 75-77),
`src/stores/game.svelte.ts`, `src/ui/game/GameView.svelte`,
`src/model/carriere.ts`, `tests/arrangement.test.ts`, `tests/carriere.test.ts`,
`scripts/parcours-carriere.cjs`.

### ✅ FB-015 récapitule les cinq mois — tranche 5b (2026-09-02)

> « L'acte 6, le plus complet du jeu. » — Yann

**La tension à résoudre, et c'est tout le sujet.** L'acte 6 dit noir sur blanc
*« aucun brief, aucun client, aucun style imposé »*, et la règle du dépôt qui en
découle est que **la sévérité décroît avec le récit**. « Le plus complet » ne
pouvait donc pas vouloir dire « le plus sévère » : un cahier qui jugerait un
genre ou une ressemblance contredirait la phrase même de l'acte.

**Ce que « complet » veut dire ici : la RÉCAPITULATION.** Le cahier passe de
quatre lignes à **onze**, en quatre sections — une par acte traversé :

| section | ce qu'elle redemande |
|---|---|
| 1 · LE RYTHME | les trois lignes, une variante, une rafale |
| 2 · LE GROOVE | du balancement, et de l'aléa |
| 3 · LES COUCHES | la mélodie, la basse, la nappe |
| 4 · LA PRODUCTION | des plans de volume, de l'espace dosé |

Aucune fiche de style, aucun verrou de provenance, aucun chapeau de genre —
c'est-à-dire rien de ce qui juge un goût. Les libellés restent écrits du point de
vue du joueur (« ce que tu sais faire depuis l'acte 1 ») et non d'un client qui
paie. Et c'est le seul endroit du jeu où l'on vérifie que les cinq mois ont
servi : chaque acte précédent enseigne deux ou trois gestes, rien jusqu'ici ne
les demandait ENSEMBLE.

**Le test tient les deux moitiés**, parce qu'une seule des deux se
réintroduirait sans qu'on le voie : il exige que ce cahier soit strictement le
plus long du jeu, qu'aucune de ses lignes ne soit une fiche ou un verrou de
provenance, et qu'il porte au moins quatre sections — onze lignes à plat ne
diraient pas d'où elles viennent.

⚠️ **Une fausse alerte, et la leçon qui va avec.** La capture d'écran du cahier
ne montrait pas l'onglet Synthé, alors que trois de ses lignes réclament une
ligne de synthé : le cul-de-sac de l'acte 3, à l'identique. Vérifié dans le
navigateur : `acteAtteint: 0` — ma fixture posait `progresCarriere` sans que
ça prenne, et c'est la FIXTURE qui était fausse, pas le jeu.
`scripts/parcours-carriere.cjs`, lui, joue la carrière et accepte la commande
avec « modules: atelier,synth,production ». Une fixture ne joue pas le jeu :
c'est écrit dans `CLAUDE.md` depuis sept PR, et ça vient de resservir.

**Vérifié :** 476 tests (1 neuf), 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf ; et le cahier mesuré à
l'écran en 390×840 — **0/11 à l'ouverture**, quatre sections, 0 px de
débordement.

---

### ✅ L'acte 5 produit au lieu de recopier — tranche 5a (2026-09-01)

> « Sortir les niveaux reproduire 4/12/13/27/32 de l'acte 5 vers la salle de
> répétition, et les remplacer par des commandes de style — une fiche par
> genre. » — Yann

**Ce que l'acte était** : douze reproductions, dont cinq presets recopiés case
par case, puis une commande de style. **Ce qu'il est** : quatre LIVRAISONS, une
par catégorie du fax de Zik'Mobile — hip-hop authentique, club énergie, ambiance
latino, urbain festif — et les reproductions qui restent sont celles qui
préparent une commande.

**Trois fiches neuves, et le calibrage a rejeté les deux premiers choix.**

| catégorie | premier choix | mesuré | retenu |
|---|---|---|---|
| hip-hop | `boombap` | acceptait `dilla` (5/6) | **`dilla`** (drunk beat) |
| club | `house` | acceptait `hardhouse` (5/6) | **`garage`** (UK 2-step) |
| latino | `dembow` | ✅ du premier coup | **`dembow`** |

⚠️ **La leçon, et elle vaut pour toute fiche future :** quand le genre voisin
partage tout sauf un nombre, la fiche ne décrit rien. Le drunk beat EST un boom
bap déquantifié ; le hard house EST de la house en plus rapide. La sortie n'est
pas de rétrécir la borne jusqu'à ce que le voisin tombe — c'est de décrire celui
des deux qui porte une propriété POSITIVE que l'autre n'a pas : la **traîne** et
les **ghost notes** du drunk beat (le boom bap a 0 aux deux, donc deux critères
d'écart par construction), le **shuffle à 45 %** du garage là où le catalogue
plafonne à 10.

⚠️ Un quatrième obstacle mesuré : la fiche du garage acceptait le **baile funk**
à un critère près (même tempo, même kick syncopé, même backbeat). Ce qui les
sépare est le charley — TROUÉ chez l'un, plein chez l'autre — d'où
`densiteEntre`, un plafond de densité. C'est une description de ce qu'on entend
(une ligne qui respire), pas l'exigence d'une absence : la règle qu'on ne casse
pas est « une fiche ne demande jamais qu'un instrument se taise ».

**La discographie change de clé : (acte, SÉRIE) au lieu de l'acte.** Le défaut
se voyait en jouant, pas en lisant — le joueur produisait quatre genres et n'en
retrouvait qu'un, les trois premiers écrasés par le dernier. Une chaîne d'envois
(actes 3 et 4) garde une série vide et continue de se remplacer, comme Yann l'a
demandé ; deux genres ont chacun la leur. Le champ est déclaré par l'étape
(`EtapeCommande.serie`) plutôt que déduit : une règle devinée d'un autre champ
se casse en silence.

**Deux harnais ont dû apprendre le FEEL.** `etatQuiSatisfait`
(`tests/commande.test.ts`) et `scripts/parcours-carriere.cjs` construisaient
l'état d'un genre en recopiant ses trois grilles sur un état par défaut : ils
perdaient le tempo, le swing, la traîne et les ghost notes. Tant que les fiches
ne jugeaient que des placements, ça passait. Ils partent désormais de
`presetToState`, l'adaptateur que l'appli utilise pour de vrai.

**Vérifié :** 475 tests (5 neufs), 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf — les quatre commandes
acceptées, et la discographie finit à **neuf morceaux** dont les quatre de
l'acte 5 côte à côte ; le cahier de style mesuré à l'écran en 390×840 (six
critères détaillés, essentiels marqués « sans ça, non », 0 px de débordement).

**Reste de la tranche 5 :** l'acte 6 « le plus complet du jeu ».

---

### ✅ L'acte 1 fusionne, et gagne une polyrythmie — tranche 4 (2026-09-01)

> « L'acte 1 fusionné 12 → 6-7, le niveau 2 retiré, plus une polyrythmie. »
> — Yann, relecture complète

**Ce qui est révoqué, et il faut le dire clairement :** la règle « un sujet, deux
exercices », écrite le 2026-08-31 sur *« on peut faire plus d'exercices, prendre
plus notre temps »*. Elle avait porté l'acte de huit à douze en doublant chaque
sujet — un exercice qui POSE, un qui APPLIQUE. Ce que ça donne à jouer : deux
lectures de seize cases pour une seule idée neuve. C'est de la longueur, pas de
la difficulté.

| sujet | avant | après |
|---|---|---|
| la base | 2 (12 cases) + 67 | **67** |
| le charley | 3 + 68 | **68** |
| la syncope | 7 + 69 | **69** |
| la polyrythmie | — | **74** (neuf) |
| les variantes | 5 + 59 + 60 | **60** |
| la rafale | 8 + 70 | **8** |
| tout | 61 | **61** |

**Le critère de fusion est écrit et testé : on garde le plus DENSE de chaque
paire**, jamais le plus facile. Un « on fusionne » qui garderait le premier de
chaque paire ferait redescendre l'acte, ce que toute cette section combat. La
courbe mesurée : **24, 32, 32, 44, 48, 48, 48** — monotone, et le niveau 2 (douze
cases, la grille la plus légère de la carrière) est nommément retiré.

**Ce qui remplace « une seule nouveauté à la fois ».** L'ancien test interdisait
au niveau 60 de demander le rim shot ET l'ouverture du charley ensemble. Or c'est
exactement ce que la fusion demande, et ce n'est pas un raccourci : **Sol fait les
deux gestes à l'écran**, dans l'étape de récit juste avant. L'invariant qui
comptait n'était donc pas le compte des nouveautés mais leur ORDRE par rapport à
l'explication — et le test qui le tient regarde désormais le RÉCIT, pas seulement
les grilles. Il est plus fort que celui qu'il remplace.

**La polyrythmie (niveau 74, « Trois contre quatre »).** Écrite plutôt que citée :
les cinq du réservoir sont soit déjà jouées à l'acte 5 (24, 29), soit générées
(26, 30, 31) — un tirage donnerait un point de départ différent à chaque partie.
Kick et charley en seize cases, **claire en douze**, rapport 4:3.

⚠️ Sa seule propriété qui compte ne se lit pas dans la grille : **aucun coup de
claire ne coïncide avec une case des deux autres lignes**. Posés sur 0/3/6/9 ils
seraient retombés sur les quatre temps et l'exercice n'aurait rien enseigné ; ils
sont sur 2/5/8/11. Mesuré en rejouant le scheduler : claire à 0,167 · 0,417 ·
0,667 · 0,917 de la mesure, kick à 0 · 0,25 · 0,375 · 0,5 · 0,75, **zéro
collision**.

⚠️ Elle se place **après la syncope et avant les variantes**, et ce n'est pas
esthétique : après, parce que c'est la même idée d'un cran plus loin (une ligne
qui ne tombe plus où on l'attend, puis une ligne qui ne compte plus comme les
autres) ; avant, parce que ses 44 cases s'insèrent entre les 32 du 69 et les 48
du 60 — la résolution ne redescend jamais.

**Quatre préambules réécrits**, parce qu'ils citaient un voisin qui n'est plus
joué : le 67 (« le même backbeat » que le 2), le 68 (« seize cases au lieu de
huit » que le 3), le 69 (« le second exercice de la syncope » après le 7), le 60
(« les deux variantes que tu viens d'apprendre » aux 5 et 59). Un niveau rendu au
réservoir doit tenir debout seul : on le rejoue en salle de répétition.

**Vérifié :** 471 tests, 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf (l'acte 1 passe de 16 à 11
étapes, aucune erreur console) ; la polyrythmie mesurée au scheduler ET à l'écran
en 390×840 — 16 cases de 18,7 px au kick, **12 de 25,9 px à la claire** (le cycle
différent se VOIT), 0 px de débordement.

---

### ✅ L'acte 2 règle d'abord — tranche 3 (2026-09-01)

> « Les rythmes se ressemblent trop » (cinq fois dans la même relecture), « les
> autres verbes ne sont pas forcément tous intéressants : lequel, régler et
> nommer », et la consigne de tranche : **grilles différentes, `régler` en
> premier, l'aléa dans le cahier.** — Yann

**Le trio est dissous.** Les niveaux 14, 17 et 23 partageaient une seule grille
pour rendre deux balancements comparables — mêmes cases, autres instants. C'était
défendable et c'est ce que Yann a lu comme de la répétition : trois fois le même
travail de lecture pour une seule idée. La comparaison passe désormais par
`regler`, qui la fait en un geste (un curseur visé contre une cible), et les
grilles de l'acte sont **toutes différentes** — celle du 23 est réécrite.

**L'ordre change de principe : RÉGLER, puis REPOSER.**

| | avant (12 exercices) | après (7) |
|---|---|---|
| swing | entendre → reposer léger → reposer franc → régler | **régler → reposer** |
| décalage | entendre → reposer → régler | **régler → reposer** |
| les deux | nommer → cumuler | nommer → cumuler |
| l'aléa | entendre → nommer | **dans le cahier** |
| le palier | reproduire | reproduire |

Les trois `lequel` sortent : désigner A ou B est le même jugement d'oreille que
viser un curseur, en moins engageant. `nommer` reste une fois — c'est le seul
écran du jeu qui mette les deux mots côte à côte. Les niveaux 17, 45, 46, 62 et
73 restent au réservoir : un niveau ne se supprime jamais, il cesse d'être cité.

**L'aléa passe dans le cahier de Kelvin**, qui passe de quatre à six lignes. Le
défaut que ça corrige se voyait en jouant : on traversait l'acte du GROOVE en
reconnaissant des boutons, et sa commande n'en demandait aucun — on pouvait donc
livrer une boucle carrée, exactement ce que Kelvin refuse au premier écran.

- `uneLigneQuiGlisse(6, …)` exige un décalage **et** une ligne qui ne bouge pas :
  tout décaler du même montant, c'est de la traîne, et ça ne s'entend contre rien.
  La contrainte encode la règle qui a déjà écarté `drag` du catalogue.
- `deLAlea(…)` demande **un** des trois boutons. ⚠️ Un bouton ne compte que si SA
  ligne sonne — `spontRoll` n'est consulté que dans la voie du charley,
  `ghostDensity` que sur `ghostRow`.
- ⚠️ Le swing, lui, n'est PAS exigé : la grille de départ (niveau 63) en porte
  déjà 20, donc la case serait cochée à l'ouverture.

**`ALEA_MINI` est MESURÉ, pas choisi** — rejeu du scheduler, 40 graines, ligne
déclarée : `ghostDensity` 8 (dispersion des gains 0,048 → 0,101, ×2,1),
`spontRoll` 10 (+16 % d'événements), `randomVelocity` 40 (dispersion 0,063 ; il
n'ajoute jamais un coup, par construction). Trois échelles, donc trois nombres —
`serialize.ts` clamp le premier à 0-40 et les deux autres à 0-100.
`tests/params-alea.test.ts` refait la mesure au seuil.

**Trois tests ont changé de sens, et c'est écrit dans chacun** : « le trio
partage une seule grille » devient « les grilles sont toutes différentes » ;
l'ordre des verbes passe de douze à sept ; et la mesure du balancement
(`feel-ecrit`) se fait sur **une** grille à deux réglages au lieu de deux niveaux
qui devaient rester égaux — plus juste, et débarrassé d'une coïncidence de
données que plus rien n'obligeait.

⚠️ **Un garde-fou est devenu vide et l'a dit** : « une commande de `lequel` ne
promet jamais un superlatif » commençait par `expect(commandes.length)
.toBeGreaterThan(0)`. `lequel` ayant quitté la carrière, ce compte est tombé —
c'est la seule chose qui a empêché le test de devenir décoratif. Réancré sur les
trois verbes de paramètre, il est plus large qu'avant.

**Et un trou comblé au passage** : aucune grille de l'acte 2 n'était confrontée à
son préambule (`tests/grilles-ecrites.test.ts` ne couvrait que les actes 0 et 1).
Quatre promesses ajoutées — dont celle qui se casse le plus facilement en
réécrivant une grille : le **kick sur des pas pairs**, les seuls que le swing ne
retarde pas. La confrontation a d'ailleurs trouvé une erreur de comptage dans le
préambule du 14 (« deux fois » pour trois syncopes).

**Vérifié :** 468 tests (12 neufs), 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf — l'acte 2 passe de 17 à 13
étapes, sa commande est acceptée, aucune erreur console ; et le cahier mesuré à
l'écran en 390×840 : **0/6 à l'ouverture**, 0 px de débordement.

---

### ✅ L'acte 3 empile ses couches — tranche 2 (2026-09-01)

> « Il faut que tout soit en atelier avec des cahiers des charges assez
> complexes », et pour cet acte-ci : « mélodie, basse, nappe, additionnées, plus
> les textures. » — Yann, relecture complète

**Ce que l'acte était** : trois exercices de mélodie, puis une commande de trois
lignes (« une basse », « de quoi tenir le temps ») qu'un morceau quelconque
satisfaisait. **Ce qu'il est** : les trois exercices, puis trois envois du MÊME
jingle, une couche à la fois.

| envoi | ce qu'il ajoute | part de |
|---|---|---|
| 1 | la PHRASE — quatre notes, trois hauteurs, elle se repose sur la tonique | table rase |
| 2 | la BASSE — elle pose le premier temps, tient moins de notes, a une voix | la livraison 1 |
| 3 | la NAPPE et les TEXTURES — accords qui bougent, voix, glide | la livraison 2 |

**⚠️ Les trois exercices de mélodie RESTENT**, contrairement à l'acte 4 où les
cinq sont partis. Ce ne sont pas des quiz : on y écrit des notes au clavier de
l'Atelier, donc exactement le geste que les envois demandent ensuite — et sans
eux, « la dernière note est la tonique » emploierait un mot que rien n'a
enseigné.

**Le point de conception : des contraintes RELATIONNELLES plutôt qu'une
interdiction.** Un envoi qui effacerait la mélodie livrée devrait être refusé.
La façon évidente — « ne touche pas à la mélodie », marquée `interdit` — punit
l'essai, ce que l'Atelier n'a pas à faire. `basseQuiTient` compare la densité de
la basse à celle de la mélodie : sans mélodie, elle répond faux, donc la couche
est protégée par ce qu'on demande d'AJOUTER, pas par ce qu'on interdit.
`tests/carriere.test.ts` mesure les deux sens.

**Sept contraintes neuves dans `commande.ts`** : `unePhrase` (des notes ET des
hauteurs — quatre fois la même note est un rythme), `seReposeSurLaTonique` (la
dernière note JOUÉE, pas la dernière case), `poseLePremierTemps`,
`basseQuiTient` (par MESURE : une ligne peut boucler sur plusieurs),
`nappeQuiRespire` (arpège, bourdon ou étalement — on demande le mouvement, pas
le bouton, sinon c'est `nommer` déguisé), `voixChoisie` (trois cas, pas deux :
un preset, aucun preset, ou `default` — seul le troisième ne compte pas) et
`duGlide`.

**Deux détails mesurés à l'écran, pas supposés.**

1. `voixChoisie` sur UNE seule ligne affichait « ☐ Choisis-lui une voix » suivi
   de « · basse » : un détail qui répète son libellé est du bruit. Le détail
   n'existe plus qu'à partir de deux lignes.
2. Le bouton disait **« LIVRER À SOL »** alors que le client est Rachid — défaut
   noté en livrant la tranche 1 (c'était Le Tunnel), corrigé ici : il nomme le
   client de la commande. Sol n'est pas la destinataire, elle est la patronne.

**Vérifié :** 456 tests (12 neufs), 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf — les trois envois
acceptés, la discographie de l'acte 3 affiche **JINGLE LAVERIE (V3)**, donc la
livraison est bien remplacée et non empilée ; et trois captures en 390×840,
0 px de débordement. Le script a dû apprendre les gestes neufs, comme pour
l'acte 4.

---

### ✅ L'acte 3 : le verbe `melodie` gagne sa ligne — tranche 2a (2026-09-01)

> « Acte beaucoup trop court par rapport à ce qu'on a de nouveau : il faut
> compléter avec les autres composantes du synthé. Commencer par la ligne de
> mélodie puis la basse puis la nappe, les additionner. Il y a également les
> textures à travailler à chaque fois… On a de quoi faire un acte très long. »
> Plus, sur deux des trois exercices : « trop facile ». Et sur le cahier de
> Rachid : « beaucoup trop simpliste ».

**Le verbe avait la basse en dur.** `melodie.ligne` la déclare désormais ; la
surface était petite (deux points dans le store, deux dans l'UI), la
cartographie l'a montrée avant d'écrire une ligne. ⚠️ La NAPPE reste hors du
verbe : il est monophonique par conception, elle joue des accords — un exercice
mentirait sur ce qu'elle fait. Elle s'ajoutera par un cahier (tranche 2b).

| niveau | avant | après |
|---|---|---|
| 42 | « Reposer une basse », 8 pas, 5 degrés | **« Reposer une phrase »**, ligne `melody` |
| 43 | motif, 8 pas dont 4 utiles, 3-4 notes | **basse**, 16 pas dont 8 utiles, 7 degrés, 6-8 notes |
| 44 | 8 pas, 6-7 notes | **mélodie**, 16 pas, **sans motif**, 9-11 notes |

Le motif divisait le travail par deux au niveau 43 ; il est retiré du 44, qui
devient le sommet de l'acte.

**Le cahier de Rachid** exigeait « une basse + kick/snare » alors que l'acte
venait d'enseigner deux lignes. Il demande maintenant les **trois** lignes de
synthé plus une **texture choisie sur chacune** (`voixChoisie`, comparée à
`defaultSynthVoice`). C'est le premier endroit du jeu qui enseigne un réglage de
synthé — il y en avait seize dans `SYNTH_VOICE_PRESETS`, et zéro enseigné.
⚠️ La contrainte accepte n'importe quel écart au défaut plutôt qu'un preset
nommé : exiger un preset précis ferait de la texture un QCM, ce que l'acte 4
vient justement de quitter.

**⚠️ DEUX DÉFAUTS D'AFFICHAGE TROUVÉS EN MESURANT, dont un bloquant.**

1. À seize pas, la grille de cases **débordait de son conteneur et se faisait
   couper** : les six derniers pas étaient injoignables, donc l'exercice
   impossible. Et ma mesure disait « débordement 0 » — parce qu'elle ne
   regardait que `document.documentElement`. Un conteneur qui coupe ses enfants
   ne fait pas défiler la page. Le script de mesure vérifie désormais
   `scrollWidth > clientWidth` sur **chaque** élément.
2. Une fois la grille passée à huit colonnes, les deux grilles empilées
   (cases, puis numéros) mettaient les numéros **1-8 sous la seconde rangée de
   cases** : un « 5 » qui désigne le pas 13. Cases et numéros sont maintenant
   entrelacés par mesure de huit.

**Vérifié :** 444 tests, 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf, complet ; et trois
captures en 390×840 — 40,4 px la case aux trois niveaux, y compris à seize pas.

---

### ✅ L'acte 4 devient une chaîne d'envois — tranche 1 (2026-09-01)

> « Ça ne marche pas l'exercice du petit haut-parleur… cet élément de scénario
> ne tient pas la route. Il faudrait démarrer par l'atelier avec un cahier des
> charges progressif et au niveau de difficulté poussé, toucher à beaucoup de
> composantes dont la reverb, le delay, les filtres. Les livraisons
> intermédiaires doivent être remplacées par les nouvelles jusqu'à la fin de
> l'acte. » — Yann, relecture complète, cinq « NOK » sur cinq exercices

**Ce que l'acte était** : un exercice `laverie` (entendre le défaut), puis quatre
quiz de paramètre, puis une commande en deux sections. **Ce qu'il est** : trois
commandes sur le MÊME morceau, zéro exercice.

| envoi | ce qu'il demande | part de |
|---|---|---|
| 1 | le morceau seul — fiche techno, les trois lignes, une basse | table rase |
| 2 | enlever et ranger — filtre, contraste de volume, kick qui porte | la livraison 1 |
| 3 | ajouter — réverbe dosée, delay engagé, chaque ligne retouchée | la livraison 2 |

**L'outillage, réutilisable par les tranches suivantes.**

- Cinq contraintes de production dans `commande.ts` : `filtreQuiCoupe`,
  `contrasteDeVolume`, `reverbDosee`, `delayEngage`, `chaqueLigneRetouchee`.
  ⚠️ Chacune a un **plafond** ou compare à un départ — sans quoi elle se
  satisfait en poussant un curseur à fond, ce que l'acte enseigne à ne pas faire.
- `EtapeCommande.partirDeLaLivraison` + `departCommande()` relit la production de
  l'acte dans la discographie. Repli sur la table rase si rien n'est livré (acte
  rejoué, sauvegarde ancienne) plutôt que de bloquer la carrière.
- `ContexteLivraison.depart` : une contrainte qui mesure un GESTE ne peut pas
  connaître son point de comparaison à la construction du cahier. Absent → la
  contrainte répond **faux**. `Contrainte.details` reçoit le contexte lui aussi,
  sinon « chaque ligne a été regardée » ne pourrait pas dire LAQUELLE manque —
  un refus sans retour.

**Une règle du dépôt est tombée, et c'est documenté :** « au plus une commande
par acte ». Elle valait tant qu'un acte enseignait par des exercices et concluait
par une livraison. Ce qui reste tenu : après la dernière commande d'un acte il ne
reste que du récit, et dans une chaîne, seule la première part d'autre chose
qu'une livraison. Deux tests neufs le disent.

⚠️ **`laverie` et son étage de moteur restent.** Le petit haut-parleur est une
branche parallèle à gain nul dans `graph.ts` — il garde sa valeur d'OUTIL
d'écoute pour vérifier un mixage. Il perd son rôle d'exercice noté, rien d'autre.
Les niveaux 53 à 57 restent au réservoir : un niveau ne se supprime jamais.

**Deux pièges payés.**

1. `delayFeedback` vit dans `synthGlobal`, pas sur la ligne, malgré son voisinage
   avec `delaySend`. Un envoi de delay sans retour ne s'entend pas : la
   contrainte exige les deux.
2. `tests/discographie.test.ts` posait un `localStorage` factice au niveau du
   module ; mon second `describe` en a installé un autre, et le test précédent
   s'est mis à lire un stockage vide. Deux `describe` qui se partagent un global
   doivent se le partager pour de bon — le second réutilise celui qui existe.

**Vérifié :** 444 tests (4 neufs), 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf — les trois envois
acceptés, la discographie de l'acte 4 affiche **LE TUNNEL (V3)**, donc la
livraison est bien REMPLACÉE et non empilée ; et trois captures en 390×840,
0 px de débordement. Le script a d'ailleurs bloqué au deuxième envoi avant
d'apprendre les gestes neufs — c'est exactement ce pour quoi il existe.

**Écart de portée assumé :** le libellé du bouton de livraison dit « LIVRER À
SOL » alors que le client est Le Tunnel. Défaut préexistant, hors périmètre de
cette tranche, noté ici pour ne pas le perdre.

---

### ✅ L'histoire du Mode carrière — `HISTOIRE.md` (2026-08-22)

Demande de Yann : *« un label a perdu tous ses artistes / le perso est
l'assistant qui fait uniquement le café / le label ne sait pas vers qui se
tourner / le perso doit apprendre puis faire la batterie, pareil pour les autres
modules / il doit faire des commandes spécifiques (ex. boom bap) / il y a des
accomplissements : faire son EP, faire un live. »*

**Fichier touché : `HISTOIRE.md`. Aucun code.** La section ⏳ ci-dessus reste en
attente d'arbitrage.

**Le texte final est de Yann.** Après plusieurs versions écartées (voir plus
bas), il a écrit lui-même le déroulé en huit actes ; mon travail a été une
relecture de continuité, **dix-sept corrections**, listées et justifiées dans
l'annexe de `HISTOIRE.md`. Style à préserver : lignes courtes, une idée par
ligne, beaucoup de dialogue, aucune description.

**Face B**, label fondé en 1989, quatorze artistes au catalogue, zéro en
activité. Trois pièces au-dessus d'une laverie. Le label vit de **sonneries de
téléphone** — onze centimes sur trois euros. Une grosse maison veut racheter le
catalogue ; Sol a jusqu'au **14 juin** pour signer, et elle a l'intention de le
faire. Le stagiaire fait le café jusqu'au jour où le sous-traitant des sonneries
s'en va en laissant un mot de passe qui ne marche pas.

#### ⚠️ Trois écarts payés, à ne pas refaire

1. **Version « film français »** (décor physique, escaliers, visages) — écartée :
   *« l'histoire ne colle pas avec l'esthétique winamp »*. Le défaut n'était pas
   l'époque mais la **densité**.
2. **Version transposée dans la culture technique de 2001** (netlabel, canaux de
   discussion, débits d'encodage) — écartée : *« trop geek, j'adhère pas »*.
   Corrigeait la mauvaise variable.
3. **Version « propre »**, obtenue en répondant à trois demandes successives de
   clarté — écartée : *« une histoire creuse, pas vraiment drôle, on ne parle pas
   du contexte des années 2000 »*. ⚠️ **C'est l'écart le plus instructif : à
   chaque « rends-le plus clair », une couche de texture partait.** Clarifier
   n'est pas retirer.

#### Les décisions qui tiennent

- ⚠️ **L'époque est le gagne-pain, pas le décor.** Le label vit des sonneries,
  donc le stagiaire fait de la musique **parce qu'il y a une livraison lundi** —
  pas par vocation ni par talent caché. L'arc est une échelle de dignité :
  percussions à trois euros → jingle de laverie → morceau refusé par une salle →
  quinze styles au catalogue → un disque signé de son nom.
- ⚠️ **La peau est le mobilier, pas le sujet.** Le chrome biseauté est le langage
  d'un appareil gris à boutons, pas d'un ordinateur : on ne montre jamais le
  décor, on montre les appareils du décor (afficheur LCD et compte à rebours,
  répondeur, playlist, étiquettes de cassette, analyseur). Corollaire et budget :
  si ça ne tient pas sur un afficheur, ce n'est pas dans le jeu. Et **le biseau
  gris n'est pas un parti pris graphique, c'est le budget du label.**
- **Objets ordinaires, jamais objets de niche** — un CD gravé au marqueur, tout
  le monde ; un ratio sur un serveur, personne. Aucune année ne s'affiche jamais.
- **Huit actes, quatre modules.** Atelier (acte 1), Synthé (acte 3), Production
  (acte 4), Mode Live (acte 7) ; les actes 0, 2, 5 et 6 n'ouvrent rien et sont
  donc bon marché. ⚠️ **Le synthé arrive APRÈS le groove de la batterie**
  (arbitrage de Yann) : on finit un instrument avant d'en ajouter un autre.
- **L'acte 5 « Les styles » est l'endroit où les 34 presets servent enfin** —
  commande de quinze genres pour un revendeur de sonneries, chaque genre écouté
  puis reconstruit. Il tombe après le mix et avant l'EP : on apprend le
  vocabulaire une fois qu'on sait faire, juste avant d'avoir à être personnel.
- **Le retournement se montre, il ne se raconte pas.** Sol maintient qu'elle
  vend jusqu'au bout ; ce qui la fait changer d'avis est la salle qui chante par
  cœur un jingle de lessive refusé par l'agence qui l'avait commandé.
- **Le client a toujours tort sur les mots et raison sur la musique.** Le
  commercial ne sait pas dire « dancehall », mais il le fredonne juste.

**Écarts de portée assumés :** rien n'est codé, et `PlayerProgress.level` n'est
pas touché. Restent ouverts : le découpage en ~130 exercices avec leurs axes de
difficulté, et le contrôle de mix mesuré de l'acte 4 (seul mécanisme réellement
neuf).

### ✅ Mode carrière — la charpente en huit actes, actes 0 à 2 jouables (2026-08-23)

Arbitrage de Yann, en une phrase : *« on part sur le scénario pour le moment
pour développer le mode jeu »*. Ça tranche les deux premières des quatre
questions de la section ⏳ ci-dessus — l'histoire est le CONTENANT de la
campagne, et la fiction n'est pas minimale : c'est `HISTOIRE.md`, ses huit
actes, ses quatre personnages. Les questions 3 (composer ou reconstruire) et 4
(le public change-t-il le jugement) portent sur les actes 4 et 6, elles restent
ouvertes et ne bloquaient pas cette tranche.

**Fichiers touchés :** `src/model/carriere.ts` (neuf), `src/model/unlocks.ts`,
`src/stores/game.svelte.ts`, `src/stores/unlocks.svelte.ts`,
`src/ui/game/CarriereView.svelte` (neuf), `src/ui/game/GameView.svelte`,
`src/App.svelte`, `tests/carriere.test.ts` (neuf).

#### Ce que ça change, en une image

Le Mode jeu a désormais **deux écrans** et la carrière est celui d'entrée. Le
récit donne le *pourquoi*, les 41 niveaux donnent le *comment* et deviennent la
**salle de répétition**, atteignable d'un bouton depuis la carrière — « pas de
scénario qui enferme l'outil » (`HISTOIRE.md`).

#### L'entier unique, découpé en deux — et pas en trois

Le blocage identifié dans la proposition était que `PlayerProgress.level`
portait trois choses : ce que le joueur sait, ce qui lui est ouvert, où il en
est. La proposition suggérait un `Record<CompetenceId, 0|1|2|3>`. **Ce n'est pas
ce qui a été fait, et c'est délibéré** : deux axes suffisent, parce que le
récit sait déjà répondre à la question d'accès.

| Axe | Où il vit | Ce qu'il décide |
|---|---|---|
| **Récit** | `PlayerProgress.carriere = { acte, etape }` | ce qui est ouvert |
| **Réservoir** | `level` + `stars`, inchangés | ce qui est maîtrisé |

Un troisième axe « compétences » aurait été un modèle de plus à tenir d'accord
avec les deux autres, sans rien décider que ceux-là ne décident déjà. Il
reviendra le jour où un exercice devra *vérifier* une compétence plutôt que la
décerner.

#### Un acte CITE des niveaux, il n'en fabrique pas

`Etape` est soit un `recit` (quelques lignes courtes + l'appareil qui les
affiche), soit un `exercice` qui ne porte qu'un **`niveau` du réservoir**. Ça
rend le contenu bon marché à écrire, et surtout ça garantit qu'un niveau joué
dans la carrière est *exactement* le même qu'en répétition — pas une variante
qui dériverait de son original. Le mapping actuel :

| Acte | Compétence | Niveaux cités | Ouvre |
|---|---|---|---|
| 0 · Le café | ÉCOUTE | 39, 40, 41 (les trois verbes de paramètre) | — |
| 1 · Le rythme | RYTHME | 1, 2, 3, 7 | **Atelier** |
| 2 · Le groove | GROOVE | 4, 14, 15, 20, 23 | — |

⚠️ **Les pilotes 39-41 ne sont plus un bonus de fin de campagne, ils sont le
tout premier écran du jeu.** C'est le texte qui l'a décidé, pas moi :
« Elle te fait écouter deux sons. — Lequel est le plus grave ? » EST le verbe
`lequel`. Effet de bord heureux : les trois verbes que Yann n'avait pas encore
essayés sont maintenant les trois premiers exercices qu'on rencontre.

⚠️ **Une commande ne doit promettre que ce que le tirage tient.** Première
version de l'acte 0 : la commande disait « — Lequel est le plus grave ? » et
l'écran demandait « laquelle est la plus courte ? ». Les niveaux 39-41 tirent
leur bouton au hasard dans la famille Timbre : une consigne qui NOMME le
réglage ment une fois sur quatre. Trouvé à la capture d'écran, pas au test.

#### Deux curseurs, parce qu'un seul reverrouille l'Atelier

`progresCarriere` (persisté, ne recule jamais) et `acteActif`/`etapeActive`
(volatil, ce qu'on regarde). Sans le second, **relire l'acte 1 refermerait
l'Atelier que l'acte 1 vient d'ouvrir** : le curseur reculerait, et le verrou
lit le curseur. C'est le genre de régression qui ne se voit pas en écrivant le
code — `tests/carriere.test.ts` la verrouille par le seul scénario qui la
produit.

#### Le déblocage : le récit d'abord, les niveaux en plancher

`moduleUnlocked` gagne un `acte` et devient un OU. Le récit est la voie
principale (« ton morceau a besoin d'une basse, voilà le Synthé »), mais **seuls
les actes 0 à 2 ont leurs exercices écrits** : si l'acte était la seule voie, le
Synthé (acte 3), la Production (4) et le Mode Live (7) deviendraient
inatteignables du jour où la carrière arrive — régression pour tous ceux qui les
avaient ouverts, mur pour les autres. Les seuils de niveau restent donc un
plancher. Retirer ce second membre le jour où les huit actes sont écrits sera un
changement d'une ligne, et une décision, pas un nettoyage.

**Corollaire assumé : il n'y a PAS de migration depuis `level`.** La tentation
était d'y placer un vétéran à l'acte correspondant. Elle ne marche pas :
l'acte 0 cite 39-41, des bonus posés *après* la campagne d'origine, qu'un joueur
fini au niveau 34 n'a jamais joués. Aucune dérivation ne peut le déclarer
« acte 0 acquis » sans mentir sur ce qu'il a entendu. La carrière est du contenu
neuf : tout le monde la commence au début, et personne ne perd d'accès en
chemin.

#### L'écran, et la règle qui l'a dessiné

`CarriereView.svelte` applique littéralement « on montre les appareils, pas le
décor » : jamais un visage ni une pièce, **quatre surfaces** et pas une de plus
— l'afficheur LCD (les mots de Sol, et le compte à rebours `14 JUIN · J−151`
affiché en permanence), le répondeur, le fax, l'étiquette de cassette. Les huit
actes forment un **carnet** vert sur noir, lu comme une playlist. Un seul cadre
creusé pour les quatre appareils : la variante porte sur ce qui est ÉCRIT
dessus, pas sur une forme de plus.

Les actes 3 à 7 disent « À venir » et ne s'ouvrent pas : un acte qui s'ouvre sur
du vide se lit comme une panne.

**Vérifié :** `npm run check` 0 erreur · **133 tests** · les deux builds ·
parcours Playwright à 390×844 en `pointer: coarse` — les trois actes joués bout
à bout (37 clics), l'Atelier passe de verrouillé à ouvert **pendant** le
parcours à la fin de l'acte 1, 0 px de débordement horizontal sur les deux
écrans, 0 erreur console. Zones tactiles mesurées à `elementFromPoint` (le
pseudo-élément `.tap44` est invisible à `getBoundingClientRect`) : toutes ≥ 44 px
après deux correctifs — `.player` de `GameView` n'avait jamais eu son `tap44-y`
(24 px), et les lignes du carnet tombaient à 43 px avec un `padding` de 9.

**Écarts de portée assumés :**

- **Les actes 3 à 7 ne sont pas jouables.** Leur récit est écrit, leurs
  exercices non — et trois d'entre eux demandent du mécanisme neuf (le synthé
  pour l'acte 3, le contrôle de mix mesuré pour le 4, la composition libre
  notée sur le brief pour le 6). L'acte 5 « Les styles », lui, ne demande que du
  contenu : quinze presets à reconstruire, tout existe déjà. **C'est le prochain
  acte à écrire, et de loin le moins cher.**
- **Aucun système de compétences mesurées** — voir plus haut, deux axes
  suffisent tant qu'un acte décerne au lieu de vérifier.
- **La grille de déverrouillage contrôle par contrôle** (rafale niv. 11, swing
  14, ghost 20, fill 21, décalage 23) n'est toujours pas appliquée. Elle reste
  valable : elle porte sur les contrôles de l'Atelier, pas sur les modules.
- **B6 — la mise en page** : l'écran de carrière tient sur la hauteur d'un
  téléphone sans déborder, mais l'écran d'exercice garde son bas de page vide.
  Même chantier qu'avant, pas rouvert ici.

### ✅ Le prologue — « on comprend rien », et pourquoi (2026-08-23)

Première impression de Yann sur le Mode carrière livré une heure plus tôt :
*« 1ère impression : on comprend rien. »*

**La cause n'était ni l'interface ni les exercices.** Relu écran par écran comme
quelqu'un qui arrive dessus, le premier écran du jeu disait, mot pour mot :

> Le sous-traitant qui fabrique les sonneries arrête. Il a trouvé mieux. Il
> laisse un dossier et un mot de passe.

C'est-à-dire **la première péripétie d'une histoire dont la mise en place
n'avait jamais été montrée**. Le joueur ne pouvait pas savoir où il était, qui
il était, qui était Sol, ce qu'était Face B, ni ce qu'était le 14 juin.

⚠️ **Et tout ça était écrit.** `HISTOIRE.md` consacre **cent quarante lignes**
à la mise en place avant l'acte 0 — FACE B, « Ce qui fait vivre Face B »,
« Toi », « Le 14 juin ». Je n'en avais porté **aucune ligne** : j'avais lu le
document, donc je comprenais l'écran. Le joueur, non.

**La règle à ne pas repayer : ce qui n'a pas été porté n'existe pas.** Un récit
écrit dans un document et *cité* par le code n'est pas dans le jeu. Le lecteur
du document comprend ; le joueur juge sur ce qui s'affiche.

**Fichiers touchés :** `src/model/carriere.ts`, `src/ui/game/CarriereView.svelte`,
`src/ui/game/GameView.svelte`, `tests/carriere.test.ts`.

#### Ce qui change

1. **Un prologue de quatre écrans**, porté de `HISTOIRE.md` : le label, son
   gagne-pain, toi, l'échéance. Il vit dans les étapes de l'acte 0 plutôt que
   dans une structure à part — curseur, persistance et relecture marchent alors
   sans un seul cas particulier.
2. ⚠️ **Le compte à rebours n'apparaît qu'à l'écran qui l'explique.** `J−151`
   vers une date inconnue n'est pas une tension, c'est un nombre. Il se lève
   exactement sur l'écran « LE 14 JUIN », et un test lie les deux
   (`ETAPE_DU_COMPTE_A_REBOURS`) pour qu'ils ne se désynchronisent pas.
3. **Le carnet des huit actes et les boutons d'en-tête sortent du prologue.**
   Ils ajoutaient huit titres verrouillés et deux mots non expliqués
   (« salle de répétition ») à un écran qui n'avait encore rien situé. Le
   premier écran ne montre plus que ce qu'il peut expliquer : un appareil, un
   message, un bouton.
4. **L'écran de pseudo dit enfin ce qu'on va faire** — « apprendre à fabriquer
   des rythmes à l'oreille » — au lieu de « commencer la campagne ».
5. **« ✓ Vérifier » est descendu sous la question.** Sur les verbes de
   paramètre, le transport ne portait que lui : on lisait donc le bouton de
   validation AVANT la question à laquelle il répond.
6. **Une consigne annonçait « deux sons » quand l'écran en propose trois.**
   Corrigée, et un test interdit désormais à toute consigne d'annoncer un
   nombre de versions — les niveaux 39-41 le tirent.

**Vérifié :** `check` 0 erreur · **137 tests** · les deux builds · parcours
Playwright à 390×844 : les onze étapes de l'acte 0 lues d'affilée, le décompte
apparaît bien à l'écran 4 et pas avant, le carnet à l'écran 5, 0 px de
débordement, 0 erreur console.

**Reste à faire, non traité ici :** l'acte 0 fait maintenant onze étapes, dont
quatre de lecture d'affilée. Si c'est trop long avant le premier son, la sortie
est d'intercaler un exercice plus tôt, pas de raccourcir le prologue — c'est lui
qui rendait le reste lisible.

### ✅ Sol a un écran — et un test a fait tomber un vrai défaut de jeu (2026-08-24)

Deuxième retour de Yann, en cinq mots : *« on ne présente pas Sol ? »*

**Non.** Elle porte presque toutes les répliques du jeu et n'avait qu'une
demi-phrase — « Sol dirige le label » — glissée dans l'écran qui parle du
JOUEUR. Et cette demi-phrase, je l'avais ajoutée moi-même : `HISTOIRE.md` ne la
présente pas davantage, parce qu'un lecteur arrivé là a lu les trente lignes
précédentes. **Même défaut que le prologue manquant, un cran plus fin** —
cette fois ce n'était pas le décor qui manquait, c'était le personnage.

**Fichiers touchés :** `src/model/carriere.ts`, `src/model/parametres.ts`,
`src/stores/game.svelte.ts`, `tests/carriere.test.ts`,
`tests/parametres.test.ts`.

#### L'écran de Sol, et sa place

Elle se présente par ce qu'elle FAIT — les autocollants
« LE PIRATAGE TUE LA MUSIQUE » du syndicat, dont elle se sert pour caler la
fenêtre ; la sonnerie de grenouille qui s'est mieux vendue que tout le
catalogue, et dont elle refuse de parler. Matière prise dans `HISTOIRE.md`, où
elle dormait.

⚠️ **Et elle passe AVANT l'écran des sonneries, pas après** — parce que cet
écran-là porte déjà une de ses répliques (« — Sur les trois euros, il nous en
revient onze centimes »). Placée après, elle parlait avant d'exister. **C'est le
test qui l'a trouvé**, pas la relecture : écrit pour vérifier qu'elle est
présentée avant de parler, il a échoué au premier passage et désigné l'écran
fautif.

#### Trois lignes se repliaient, et ça se mesure

Le récit est écrit en **une idée par ligne** ; une ligne qui se replie casse ce
rythme et se lit comme du texte courant. Invisible à la lecture, visible en
mesurant : un script compare la hauteur de chaque `<p class="ligne">` à celle
d'une ligne seule. **43 lignes mesurées, 3 se repliaient** — corrigées en
COUPANT plutôt qu'en réécrivant, le texte étant de Yann.

#### ⚠️ Le test instable qui cachait un défaut de jeu

En vérifiant, `npm test` a échoué une fois, puis passé la fois suivante.
Coupable : `« régler » ne place pas le curseur déjà sur la cible`
(`tests/parametres.test.ts`, livré avec les verbes de paramètre) — **il échouait
une fois sur quatre environ**, y compris sur `main`, où un échec veut dire build
non produit et **déploiement sauté**.

**Ce n'était pas un test à recalibrer, c'était un bug.** « Régler » tirait sa
cible par `tirerVersions(p, 2).slice(0, 1)` : deux valeurs bien séparées **l'une
de l'autre**, mais rien ne les séparait du MILIEU de l'étendue, là où le curseur
du joueur commence. Le niveau était donc parfois **déjà gagné sans toucher au
curseur**. Le commentaire du store disait pourtant « sinon il serait déjà
juste » : l'intention était là, la garantie non.

Corrigé par une fonction pure, `tirerCible(p, depart)`, qui applique le principe
déjà posé pour `tirerVersions` : on tire la **distance** au départ dans
`[ecartMini, étendue/2]` et le **côté**, au lieu de tirer une valeur et
d'espérer. Le catalogue le permet toujours — tous les paramètres ont
`étendue ≥ 2,2 × ecartMini` et `ecartMini > 2 × tolerance`.

Et le test devient ce que `CLAUDE.md` exige : **une assertion par tirage**
(« la cible n'est JAMAIS dans la tolérance du départ ») au lieu d'une moyenne
posée à la frontière. Plus un test pur de `tirerCible` sur trois départs — le
milieu et les deux bords, là où un seul côté est disponible.

**Vérifié :** `check` 0 erreur · **140 tests**, la suite passée **dix fois de
suite** sans un échec (c'était le point) · les deux builds · parcours Playwright
à 390×844 : les douze étapes de l'acte 0, 43 lignes de récit mesurées, **0 repli**,
0 erreur console.

**Écart de portée assumé :** le prologue passe à cinq écrans. La question posée
à Yann — quatre lectures avant le premier son, est-ce trop ? — devient donc
cinq. La réponse reste la même si elle est oui : intercaler un exercice plus
tôt, pas raccourcir le prologue.

### ✅ Solange, et le prologue entrelacé au jeu (2026-08-24)

Deux retours de Yann, dans le même message : *« sol, il faut rappeler son nom
bien franchouillard ! »* et *« ça fait en effet beaucoup de texte avant le 1er
jeu. »*

**Fichiers touchés :** `src/model/carriere.ts`, `src/ui/game/GameView.svelte`,
`tests/carriere.test.ts`.

#### Le nom

⚠️ **`HISTOIRE.md` ne donne aucun nom complet à Sol** — trente-six occurrences,
toutes « Sol ». **Solange est donc une proposition, pas une reprise**, retenue
parce que c'est le franchouillard par excellence et le diminutif dont « Sol »
sort naturellement. Elle apparaît à **un seul endroit**, et un test dit lequel :
un mot à changer si un autre est préféré.

> Sur les statuts, c'est Solange.
> Sur les pochettes, ç'a toujours été Sol.

#### Le texte avant le premier jeu : sept écrans → **cinq**

⚠️ **La sortie n'était pas de raccourcir le prologue** — c'est lui qui rend le
reste lisible, et le couper aurait ramené le « on comprend rien ». C'est de
l'**entrelacer** : quatre écrans posent le strict nécessaire, puis on joue, et
ce qui reste d'exposition revient ENTRE les exercices.

| Avant | Après |
|---|---|
| Face B · Sol · les sonneries · toi · le 14 juin · le répondeur · Sol | Face B · Sol · le 14 juin · le répondeur |
| **puis** exercice (8e écran) | **puis** exercice (5e écran) |
| | l'économie des sonneries · exercice · exercice · … |

Trois choses ont permis la coupe, et aucune n'est une perte :

1. **L'écran « TOI » disparaît en tant qu'écran** — « tu es stagiaire, tu fais
   le café » tient en deux lignes et prépare directement la réplique qui ouvre
   le premier exercice. Il rejoint l'écran du répondeur.
2. **La réplique de bascule vit dans la `commande` de l'exercice**
   (« — Tu fais quoi exactement ici ? — Le café. — Je sais. Écoute ça. ») au
   lieu d'un écran à elle : un écran pour quatre lignes de dialogue, c'était une
   lecture de plus avant le premier son.
3. **L'économie des sonneries passe APRÈS le premier exercice**, et elle y
   gagne : on explique les onze centimes à quelqu'un qui vient d'écouter des
   sons. Une seule ligne reste devant (« le label vit des sonneries »), parce
   que le message du répondeur parle du sous-traitant « qui fabrique les
   sonneries » — l'incident ne peut pas tomber dans un métier qu'on n'a pas
   nommé.

**Deux tests verrouillent le rythme**, parce qu'une propriété de rythme ne se
voit pas en relisant un fichier : *jamais plus de cinq écrans avant le premier
exercice*, et *jamais deux lectures empilées entre deux exercices*.

#### Au passage : une faute d'accord sur les sept boutons

« Trois versions du même son. Laquelle **est** *le plus rond* ? » — les libellés
du catalogue portent un article masculin (« le plus sec », « le plus sourd »)
tandis que le sujet, *une version*, est féminin. **« Laquelle sonne le plus
rond »** prend l'adjectif en adverbe, accorde tout seul sur les sept entrées, et
dit mieux ce qu'on écoute.

**Vérifié :** `check` 0 erreur · **142 tests**, la suite passée cinq fois de
suite · les deux builds · parcours Playwright à 390×844 : le premier exercice au
**5e écran**, 27 lignes de récit mesurées et **0 repli**, 0 px de débordement,
0 erreur console.

### ✅ Salle de répétition, no spoil, et un kick inaudible (2026-08-24)

Cinq retours de Yann après essai. Trois étaient des bugs, deux des choix de
mise en scène — et l'un des bugs ne se voyait qu'à la mesure.

**Fichiers touchés :** `src/model/carriere.ts`, `src/model/parametres.ts`,
`src/model/presets/levels.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `src/ui/game/CarriereView.svelte`,
`tests/carriere.test.ts`, `tests/parametres.test.ts`.

#### 1. « Il faut pouvoir refaire les niveaux » — la carte en verrouillait 40 sur 41

Mesuré : après avoir joué **tout l'acte 0**, la carte affichait **40 niveaux
verrouillés sur 41**, dont les trois qu'on venait de jouer. Deux causes
cumulées, toutes deux dans `isUnlocked(id) = id <= PlayerProgress.level` :

- l'acte 0 cite les niveaux **39-41**, qui portent des numéros de FIN de liste.
  Le seuil, hérité de la campagne linéaire, les gardait fermés ;
- un exercice **abandonné** n'avance pas `level` du tout — il ne s'ouvrait donc
  jamais, alors que c'est précisément celui qu'on veut refaire.

La salle de répétition liste désormais `niveauxRencontres(acte, etape)` : les
niveaux **rencontrés dans le récit**, tous rejouables. Rencontré, pas réussi —
les étoiles restent la mesure de la réussite.

#### 2 et 3. No spoil

- **La carte** ne montre plus que ces niveaux-là. Plus de cadenas, plus de
  numéros d'actes non écrits.
- **Le carnet** listait les HUIT actes, titres et résumés compris — « Kelvin a
  seize ans, il vient le mardi », « La salle chante un jingle de lessive ». Le
  récit se racontait lui-même cinq actes à l'avance. Il ne montre plus que les
  actes **atteints** ; ce qui suit n'est pas annoncé, pas même son titre.
- **Le titre de fenêtre** hors carrière perd son « / 41 » : un total qui
  comptait des niveaux que le joueur n'a pas vus.

#### 4. ⚠️ « On n'arrive pas à dire si c'est plus aigu ou plus grave »

**Le kick n'était pas audible, et ça se mesure.** `playKick` balaie de
`140 × mult` à `Math.max(20, 38 × mult)` : ce plancher de 20 Hz écrase toute la
moitié basse du curseur. Rendu dans un `OfflineAudioContext` réel, en RMS
au-dessus de 200 Hz — à peu près ce qu'un haut-parleur de téléphone restitue :

| pitch | −24 | −17 | −10 | 0 | +11 | +24 |
|---|---|---|---|---|---|---|
| attaque | 35 Hz | 52 Hz | 79 Hz | 140 Hz | 264 Hz | 560 Hz |
| queue | **20** | **20** | 21 | 38 | 72 | 152 |
| RMS > 200 Hz | 0,011 | 0,015 | 0,018 | 0,027 | 0,064 | 0,064 |

`tirerVersions(pitch, 3)` pouvait sortir exactement **−24 / −17 / −10** : trois
kicks indiscernables, et la question était alors un tirage au sort.

⚠️ **Corrigé dans le JEU, pas dans le moteur.** Le plancher de 20 Hz vient de
l'original et protège l'enveloppe ; c'est au jeu de ne pas poser une question
dont la réponse est inaudible. D'où `plageParLigne` sur `DescripteurParam` :
`lignes` dit OÙ un bouton s'entend, `plageParLigne` dit JUSQU'OÙ. Le pitch du
kick est borné à `[0, 24]` — 24 demi-tons, largement de quoi poser trois
versions à 7 d'écart, ce qu'un test vérifie pour chaque ligne de chaque bouton.

`pourLigne(p, ligne)` renvoie le descripteur resserré, et **tout** en découle :
les versions tirées, la cible de « régler », et le curseur affiché. Un curseur
plus large que la plage où le son bouge inviterait à chercher là où il n'y a
rien.

#### 5. Des boutons auxquels on n'a pas encore accès

À l'acte 0 l'Atelier est fermé : on demandait de **nommer** des réglages que le
joueur n'a jamais vus. Deux réponses, les deux nécessaires :

- `GameLevel.paramsAutorises` restreint le tirage à l'intérieur d'une famille.
  Les niveaux 39-41 sont limités à **pitch, decay, attack** — `tone` en sort,
  c'est le mot le plus opaque de la famille, et sur snare comme sur hat il
  déplace un filtre plutôt qu'il ne change une note.
- **Ce qu'on va écouter est nommé AVANT qu'on le demande.** La ligne « la
  hauteur, la durée, l'attaque » vivait *après* les trois exercices ; elle passe
  sur l'écran du répondeur, juste avant le premier.

**Vérifié :** `check` 0 erreur · **152 tests**, la suite passée **cinq fois de
suite** · les deux builds · parcours Playwright à 390×844 : après l'acte 0 la
salle de répétition affiche **3 exercices, 0 verrouillé**, un clic recharge bien
le niveau ; le carnet n'affiche que les actes atteints ; 28 lignes de récit
mesurées, **0 repli** ; 0 erreur console.

**Écart de portée assumé :** `PlayerProgress.level` continue d'être écrit par
`saveProgress` et sert encore de plancher aux verrous de modules
(`moduleUnlocked`). Il n'ouvre simplement plus la salle de répétition. Le jour
où les huit actes sont écrits, ce plancher disparaît et `level` avec lui.

### ✅ Le clavier du pad montre ses trois octaves (2026-08-24)

Retour de Yann : *« il faut montrer les 3 rangées de notes dans le clavier de
sélection des notes. »*

**Fichier touché :** `src/ui/sequencer/NotePad.svelte` (le seul clavier de
notes de l'appli — le pad XY du Mode Live découpe déjà son axe Y en trois
octaves, le Mode jeu n'a pas de clavier).

**Ce qui n'allait pas.** L'octave fait PARTIE de la note (`SynthNote =
{ degree, octave }`), mais le clavier n'en montrait qu'une : sept touches, et
un sélecteur −1/0/+1 rangé sous la barre. Ce sélecteur en faisait un **mode** —
on posait une note à l'octave où on avait laissé le bouton, et **rien dans la
touche ne disait laquelle**. Poser une octave grave puis une centrale coûtait
deux gestes de plus que les notes elles-mêmes.

**Ce qui a été fait.** Les trois octaves du modèle sont les trois rangées du
clavier, aiguë en haut (même sens que le pad XY du Mode Live). Une note reste
**un appui**, mais l'appui dit maintenant aussi l'octave, et le sélecteur
disparaît — il n'aurait plus rien à régler.

- Chaque touche porte, sous le nom, **l'étiquette exacte de la case qu'elle va
  écrire** : « 5 », « 5▴ », « 5▾ ». La marque est celle que la grille affiche
  déjà (`SynthRowView.octaveMark`) — le clavier montre ce qu'il écrit, vérifié
  bout en bout au navigateur (trois appuis sur trois rangées → `5▴ 5 2▾` dans
  la grille).
- **Le silence garde une seule touche**, en 8e colonne sur les trois rangées
  (`grid-row: 1 / -1`) : effacer un pas ne dépend pas de l'octave, et la cible
  reste la plus grande du pad. Placement explicite (`grid-column` /
  `grid-row` sur chaque touche) plutôt qu'auto : sinon la première rangée
  déborde dans la case que le silence laisse libre.
- Touches à **44px** de haut et non 48 : la hauteur totale est désormais
  triple, et 44 est la cible tactile de référence du projet (`.tap44`), donc
  le plancher — pas un rognage.

⚠️ **`color-mix()` sur `--xp-btn-face` détruit le biseau.** Pour distinguer les
rangées au premier coup d'œil, la première version teintait la face d'un cran
avec `color-mix(in srgb, var(--xp-btn-face) 88%, #000)`. Or `--xp-btn-face`
est un **dégradé** — le biseau lui-même — et `color-mix` n'accepte que des
couleurs : la règle tombait invalide, la touche perdait son relief et
s'aplatissait sur la face du panneau. Invisible en lisant le CSS, flagrant sur
la capture : **seule la rangée du milieu**, la seule sans teinte, avait encore
son biseau. Corrigé par un **voile superposé** (`background-image:
linear-gradient(...), var(--xp-btn-face)`), qui garde le dégradé dessous. Et un
seul cran de clarté, pas une couleur : la teinte est déjà prise par « dans
l'accord en cours », qui reste prioritaire sur les trois rangées.

**Vérifié :** `check` 0 erreur (le sélecteur `.mini.on` devenu mort a été
retiré) · 142 tests · les deux builds · Playwright à 1280, 390, 360 et 320px :
22 touches sur 3 rangées de 44px, silence à 138-140px de haut, **0 px de
débordement** de la grille comme de chaque libellé (mesuré span par span, y
compris « vide » à 23px dans une touche de 27px à 320px).

### ✅ Revenir sur un texte précédent (2026-08-24)

Retour de Yann : *« il faut pouvoir revenir sur un texte précédent. »* Le récit
n'avait qu'un sens de marche — un « Suite ▸ » et rien d'autre. Un écran passé
trop vite était perdu, et le seul moyen de le relire était de recommencer
l'acte entier depuis le carnet.

**Fichiers touchés :** `src/stores/game.svelte.ts`,
`src/ui/game/CarriereView.svelte`, `tests/carriere.test.ts`.

**Le double curseur l'offrait déjà — il ne restait qu'à le brancher.**
`acteActif`/`etapeActive` sont volatils ; seul `progresCarriere` est enregistré,
et il ne recule jamais. Reculer ne coûte donc **aucune progression** et ne
referme **aucun module** : c'est exactement l'invariant posé au moment de la
relecture d'un acte, réutilisé tel quel.

- `reculerCarriere()` recule d'un écran, **frontières d'actes comprises** : au
  début d'un acte, on revient à la dernière étape du précédent, s'il est
  atteint. `peutReculer` grise le bouton au tout premier écran.
- **Une étape d'exercice revisitée peut être re-dépassée sans être rejouée**
  (`etapeDejaFranchie`). Sans ça, reculer d'un cran depuis un récit obligerait à
  refaire l'exercice d'avant pour repartir — le retour arrière aurait coûté un
  aller-retour.

**Vérifié :** `check` 0 erreur · **156 tests**, la suite passée trois fois de
suite · les deux builds · parcours Playwright à 390×844 : « Retour » désactivé
au premier écran, deux retours ramènent bien de l'écran 4 à l'écran 2, la marche
avant repart de là, les deux boutons mesurent 44 px, 0 px de débordement, 0
erreur console.

**Note de rebase :** cette tranche a été rebasée sur `main` après l'arrivée de
la PR #104 (« Pad de notes »). Seul `PLAN.md` entrait en conflit — deux sections
ajoutées au même endroit — résolu en gardant les deux.

### ✅ Acte 3, « La mélodie » — le premier verbe qui sort de la batterie (2026-08-24)

Deux consignes de Yann : *« Solange : ok, ajoute un nom de famille »* et
*« poursuis sur la suite chronologique »* — donc l'acte 3, et pas l'acte 5.

**Fichiers touchés :** `src/model/exercises.ts`, `src/model/presets/levels.ts`,
`src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/carriere.test.ts`,
`tests/exercises.test.ts`.

**Solange Vasseur.** Toujours une proposition, toujours à un seul endroit.

#### Ce que l'acte exige, et pourquoi les boutons ne suffisaient pas

`HISTOIRE.md` est explicite : *« Tu travailles sur : les hauteurs ; les gammes ;
la basse ; les motifs ; la répétition. »* Le raccourci envisagé dans la
cartographie — ouvrir les trois verbes de PARAMÈTRE au synthé — aurait enseigné
des boutons de filtre, pas une mélodie. Il est écarté.

#### Le verbe `melodie`, et la traversée à coût réduit

Un huitième verbe : une ligne de **basse monophonique**, une note par pas, à
reposer degré par degré sur un rouleau (hauteurs en ordonnée, pas en abscisse).

⚠️ **Le coût annoncé par la cartographie a été évité, exactement là où elle le
disait.** Étendre `GameDrumRowName` aurait touché 46 endroits *plus* les formes
nommées à la main (`LevelDensity`, `rowsActive`, `SubdivSpec`, et les 41 niveaux
déjà écrits). Trois décisions l'ont contourné :

1. **Une case porte un NOMBRE.** `comparerGrilles` a été *généralisé*
   (`Grille<N>` sur `number[]`) au lieu d'être dupliqué : il ne faisait que des
   `===`, il n'a jamais eu besoin de savoir si le nombre était un coup ou un
   degré. La règle du projet — « ne pas écrire un second comparateur » — tient
   ici plus qu'ailleurs.
2. **La mélodie a son propre état** (`melodieCible`, `melodieGuess`,
   `melodieLocked`), pas une `Grid` de batterie élargie. Ni la même forme (une
   ligne), ni la même sémantique (une hauteur).
3. **Une seule octave, jamais d'accord.** Deux hauteurs à l'octave seraient « la
   même note » à l'oreille et deux réponses différentes à l'écran.

#### Trois choix de conception, pas d'arithmétique

- **La tonique tombe toujours sur le premier pas.** Sans point de départ, aucun
  degré ne se situe à l'oreille : on entendrait des intervalles sans savoir par
  rapport à quoi.
- **Le motif** (niveau 43) recopie la première moitié dans la seconde : la
  phrase à trouver est deux fois plus courte, et ce qu'on apprend est qu'une
  mélodie REVIENT.
- **La difficulté est le degré maximum**, pas le nombre de notes : 5 degrés
  (42, 43) puis les 7 de la gamme (44).

#### Ce que l'acte ouvre

Le **Synthé**, une fois l'acte 3 derrière soi — parce que le récit en a eu
besoin, pas parce qu'un compteur a atteint un seuil.

#### Au passage

`✓ Vérifier` s'affichait **au-dessus** du rouleau : le transport est en haut de
l'écran. Même défaut que sur les verbes de paramètre, même correction — le
bouton descend sous ce qu'il valide. Et « 1/3 notes posée » accordait sur le
mauvais nom.

**Vérifié :** `check` 0 erreur · **162 tests**, la suite passée trois fois de
suite · les deux builds · parcours Playwright à 390×844 jusqu'à l'acte 3 :
rouleau de 5 × 8 cases de 39 px, une note s'allume au clic, 0 px de
débordement, 0 erreur console.

**Écarts de portée assumés :**

- **Le Synthé s'ouvre, mais le Mode jeu n'y touche toujours pas.** Les exercices
  de l'acte 3 jouent une ligne de basse, ils ne font pas manipuler les boutons
  du synthé. C'est cohérent avec le récit (l'acte enseigne les hauteurs) mais ça
  laisse la famille de paramètres du synthé pour plus tard.
- **La gamme est celle par défaut** (do majeur). L'acte parle des gammes ; en
  faire varier une demanderait de l'annoncer à l'écran, sinon le joueur
  chercherait des degrés dans une échelle qu'il ne sait pas avoir changé.
- **Les actes 4 à 7 restent « à venir ».**

### ✅ Pad de la Nappe, et 12 ms rendues sur chaque frappe (2026-08-24)

Deux demandes de Yann dans le même message : *« il faut un pad pour les nappes
aussi »* et *« il y a un peu trop de délai aux écouteurs bluetooth, il faudrait
que ce soit un peu plus réactif. idée si ça nécessite une baisse de qualité de
l'audio : baisser la qualité de l'audio quand on enregistre au clavier et
remonter la qualité ensuite. »*

**Fichiers touchés :** `src/ui/sequencer/NotePad.svelte`,
`src/ui/sequencer/SynthRowView.svelte`, `src/ui/atelier/SynthModule.svelte`,
`src/ui/atelier/AtelierView.svelte`, `src/ui/xp/CalibrageLatence.svelte`
(nouveau), `src/ui/game/GameView.svelte`, `src/engine/AudioEngine.ts`,
`src/engine/depart.ts` (nouveau), `src/engine/voices/drums.ts`,
`src/engine/voices/synth.ts`, `tests/depart.test.ts` (nouveau),
`tests/latence-audio.test.ts`.

#### 1. Le pad de la Nappe — dans le MÊME composant

Ce que la Nappe pose n'est pas un degré mais un **index d'accord** (`-1` pour le
silence) : le clavier change entièrement — quatre à sept touches selon
`chordCount`, une seule rangée, pas d'octave. Tout ce qui l'entoure est
identique au millimètre : curseur pas-à-pas, enregistrement en direct,
quantification au pas le plus proche avec la latence mesurée, silence qui efface
et avance. **Un second composant aurait dupliqué exactement la partie
difficile** — celle qui a déjà coûté deux corrections de câblage (`synthStepAt`,
`latence.ms`) — pour ne varier que la partie facile. Même arbitrage que
`comparerGrilles(colonnes)` côté Mode jeu.

- Chaque touche porte le **nom réel** de la fondamentale en gros (« Do »,
  « Fa ») et le **chiffrage de la grille** en petit (« I », « IV », « vi ») :
  le clavier montre ce qu'il écrit, comme les trois rangées de degrés.
- La touche de l'accord **déjà posé sur le pas visé** est teintée : on regarde
  le clavier au moment d'appuyer, pas la grille — sans ce repère on ne sait pas
  si on pose ou si on remplace.
- Le silence écrit **-1 et non `null`** : c'est ce que dit le format v2 et ce
  qu'écrit déjà `cycleCell`. `null` marcherait à la lecture (le scheduler teste
  `>= 0`) mais ferait deux représentations du même silence dans les fichiers.
- `playChordPreview(idx)` dans le moteur, à côté de `playDegreePreview` :
  `previewSynth('pad')` ne sait jouer que l'accord 0 (c'est un test de TIMBRE).
  Les fréquences passent par `chordFreqs`, donc par le même ancrage de -12
  demi-tons que le scheduler — sinon le pad sonnerait une octave au-dessus de
  ce que la grille jouera.

#### 2. Réactivité : ce qui était possible, et ce qui ne l'est pas

⚠️ **La proposition de troquer de la qualité contre de la latence n'achète
rien, et c'est déjà documenté dans le code.** Le bouton qu'elle vise est le
tampon de sortie : `latencyHint: 0.001` donne 128 échantillons et 8 ms au lieu
de 32 — il a été essayé en production le 2026-08-21 et le verdict est dans
`AudioEngine.ts` : « ça marche très bien mais le son est devenu moche ». Et
surtout, **ce n'est pas là qu'est le délai du Bluetooth** : un casque A2DP met
100 à 200 ms à jouer ce qu'on lui envoie, dans son propre tampon, hors de portée
du navigateur. Baisser la qualité de notre côté ne touche pas ce tampon-là.

**Ce qui a été fait, et qui vaut pour tout le monde : `src/engine/depart.ts`.**
Toutes les voix ouvrent sur `setValueAtTime(0.0001, time)` puis une rampe de
4 ms. Si `time` est déjà passé, Web Audio applique les deux d'un coup : la rampe
est sautée, le gain saute — **un clic à chaque note**. C'est la régression du
2026-08-21, et l'`AVANCE_DECLENCHEMENT` de 20 ms n'était qu'une MARGE pour la
rendre rare. `departSur(currentTime, time)` traite la cause : une voix dont
l'instant est passé repart de maintenant, avec son attaque entière. C'était
explicitement le chantier annoncé dans le commentaire de la constante (« rendre
les enveloppes robustes à un démarrage tardif, pas raccourcir cette
constante ») — il est fait, donc l'avance descend à **8 ms : 12 ms rendues sur
chaque frappe**, sans rien devoir à la chance.

⚠️ **`AVANCE_DECLENCHEMENT` ne servait QU'aux frappes** — vérifié avant de la
toucher : le séquenceur programme ses pas depuis l'horloge audio avec 250 ms de
lookahead et ne la lit jamais. D'où une seule constante corrigée, pas une
seconde ajoutée à côté.

`tests/depart.test.ts` verrouille l'invariant sur les VOIX, pas sur le chiffre :
un contexte factice (Proxy) collecte tous les instants passés à Web Audio, et
aucun n'est antérieur à `currentTime` — sur les sept voix de batterie comme sur
note/basse/mélodie/accord. **Vérifié en sabotant `departSur` : trois tests
tombent.** `latence-audio.test.ts` est réécrit en conséquence — il verrouillait
l'avance comme protection de l'attaque, il verrouille maintenant qu'elle ne
REDEVIENNE pas une marge (≤ 10 ms), et cite la borne qui la remplace.

#### 3. Le calibrage sort du Mode jeu

Ce qui se sent vraiment en Bluetooth n'est pas le déclenchement — on ne peut pas
jouer un son avant la frappe, seulement réduire — mais le **placement** de ce
qu'on enregistre : on joue en place avec ce qu'on entend, et les notes tombent
un pas plus loin. Ça, le calibrage le corrige entièrement… sauf qu'il ne vivait
que dans `GameView`, alors que `ui/latence.svelte.ts` est une propriété de
l'APPAREIL, partagée par tous les écrans qui datent une frappe.

Extrait dans `ui/xp/CalibrageLatence.svelte` (métronome continu, frappes,
médiane additive) et ouvert **depuis le pad d'écriture**, là où le problème se
sent — le bouton affiche le réglage en place (`🎚 +34`). Une seule mesure
appelée de deux endroits : deux mesures qui doivent rester d'accord finissent
toujours par ne plus l'être, et celle-ci a déjà coûté une correction de signe et
une refonte du métronome.

⚠️ **Deux auditeurs pour une même barre d'espace.** Le panneau écoute Espace
pour frapper ; l'écran qui l'héberge aussi (frappe de jeu dans le Mode jeu,
lancement de la lecture dans l'Atelier). Sans garde, un appui faisait les deux —
on calibrerait le retard de l'appareil par-dessus un morceau démarré sans le
vouloir. Les deux écrans rendent la main au panneau tant qu'il est ouvert
(Échap ferme, dans l'Atelier). Mesuré au navigateur : un appui = **une** frappe,
et la lecture reste à l'arrêt.

⚠️ **`stop()` tout court passe le typecheck et n'est pas ce qu'on croit** :
c'est `window.stop()`, qui interrompt le chargement de la page. Le transport de
l'Atelier est `togglePlay` — corrigé avant que ça n'aille en ligne.

**Vérifié :** `check` 0 erreur · **165 tests** (8 nouveaux) · les deux builds ·
Playwright à 1280/390/320 px : pad de la Nappe (4 accords + silence, 0 px de
débordement, écriture `V` / `I` / vide dans la grille), calibrage ouvert depuis
l'Atelier (métronome lancé, frappes comptées, Échap), et **non-régression du
calibrage du Mode jeu** au niveau 37 (métronome, 3 clics + Espace = 4 frappes,
retour au pad de jeu). 0 erreur console.
### ✅ Actes 0, 1 et 2 refondus sur trois retours de jeu (2026-08-24)

Trois commentaires de Yann après avoir joué les trois premiers actes, et ils
disent tous la même chose sous trois formes : **un exercice n'enseigne que ce
que l'écran a déjà expliqué.**

> *acte 0 : je ne sais même pas expliquer ce que c'est decay, pourquoi c'est
> dès le début ce concept ?? l'acte 0, ça va pas, il faut proposer d'autres
> niveaux*
> *acte 1 : niveau 1 à supprimer, on peut passer au niveau 2 directement.*
> *acte 2 : pour le groove, on ne comprend pas pourquoi il y a les rafales et
> les charleys ouverts, rim shot, personne n'explique, ce n'est pas lié au
> groove. le groove, ce sont des paramètres qu'on doit pouvoir régler. Il faut
> compléter le niveau 1 avec les rafales & rim shots éventuellement, et sortir
> une vraie sonnerie de téléphone avec. ce qui peut être drôle, c'est de
> l'exporter et de proposer d'en faire la sonnerie de son téléphone/réveil
> matin.*

**Fichiers touchés :** `src/model/carriere.ts`, `src/model/parametres.ts`,
`src/model/presets/levels.ts`, `src/model/exercises.ts`,
`src/stores/game.svelte.ts`, `src/ui/game/CarriereView.svelte`,
`src/ui/game/GameView.svelte`, `tests/carriere.test.ts`,
`tests/parametres.test.ts`, `tests/exercises.test.ts`.

#### Acte 0 — les quatre mots de l'écoute, et rien d'autre

Le défaut n'était pas le mot *decay* : c'était le VERBE. L'acte citait les
niveaux 39-41, c'est-à-dire `lequel`, **`nommer` et `regler`** — deux verbes de
VOCABULAIRE, dans l'acte où l'Atelier est fermé. On demandait de mettre un nom
sur un curseur jamais vu, et de viser une valeur sur une échelle jamais
montrée. Aucun texte ne pouvait rattraper ça : le mot n'existe nulle part dans
le jeu à ce moment-là.

`HISTOIRE.md` donnait déjà la réponse, mot pour mot : *« Tu travailles sur : la
hauteur ; la durée ; l'intensité ; le silence. »* Quatre niveaux neufs, un par
mot, tous en `lequel` sauf le dernier :

| Niveau | Verbe | Bouton | Ce qui s'entend |
|---|---|---|---|
| 49 · La hauteur | `lequel` | `pitch` | plus aigu / plus grave |
| 50 · La durée | `lequel` | `decay` | traîne / s'arrête net |
| 51 · L'intensité | `lequel` | `volume` (neuf au catalogue) | plus fort / plus doux |
| 52 · Le silence | `silence` (verbe neuf) | — | le coup qui manque |

`lequel` parle en PROPRIÉTÉS et jamais en étiquettes : « laquelle sonne la plus
grave ? » ne demande pas de savoir qu'un bouton s'appelle Pitch. `nommer` et
`regler` déménagent à l'acte 2, où les mots sont enfin sur des boutons
rencontrés. Un test l'interdit désormais : aucun niveau de l'acte 0 ne peut
employer un verbe de vocabulaire.

**Le verbe `silence`** est le seul dont la bonne réponse est ce qu'on n'entend
pas. Une pulsation régulière sur le hat, un pas creusé, huit boutons. Deux
pièges payés d'avance et verrouillés par test : le trou n'est **jamais sur le
premier pas** (sans départ entendu, il n'y a rien à manquer) et le kick ne tient
que ce premier temps — posé sur le trou, il boucherait exactement ce qu'on
demande d'entendre. Et l'écran n'offre pas « écouter ma version » : on ne pose
rien, on désigne. Un bouton qui ne joue que du vide se lit comme une panne.

**`volume` entre au catalogue** avec une `plageJeu: [30, 100]` : tiré près de
zéro, la version à comparer est un silence, et « laquelle est la plus forte ? »
se répond sans écouter — même famille de défaut que le kick inaudible de la
veille.

#### Acte 1 — la grille, ses deux gestes, et on repart avec l'objet

- **Le niveau 1 saute** (Yann). Il ne faisait poser que des kicks sur une grille
  dont les deux autres lignes étaient explicitement vides : un écran sans rien à
  arbitrer. Il reste au réservoir, la carrière ne le cite plus. L'acte part
  donc du 2.
- **Les variantes et les rafales déménagent ici**, depuis l'acte 2 : ce sont
  deux gestes de GRILLE — un second clic, un appui long — donc deux gestes de
  l'acte qui enseigne la grille. Niveaux 5 (variante unique) et 8 (rafale
  unique), et **quelqu'un les explique** : Sol les fait à l'écran, avant qu'on
  les demande. Un test tient l'ordre (l'écran qui dit « rim shot » précède
  l'exercice qui en demande un).
- **L'acte ouvrait sur deux écrans de lecture** — le brief, puis « Sol
  t'apprend la grille », quatre mots sur un afficheur. Les trois mots tiennent
  dans le brief, où ils sont en plus motivés. Même règle que l'entrelacement du
  prologue.
- **La LIVRAISON** (`EtapeLivraison`, un troisième `kind` d'étape) clôt l'acte :
  *« sortir une vraie sonnerie de téléphone avec […] l'exporter et en faire la
  sonnerie de son téléphone/réveil matin »*. Elle ouvre l'Atelier sur
  `toAtelierState()` — le rythme qu'on vient de réussir, pas une grille vide —
  et l'export MP3, qui existe depuis toujours, trouve enfin son moment.

⚠️ **L'ordre dans `livrer()` est le sujet, pas un détail.** `moduleUnlocked`
lit l'acte ATTEINT (`acte > 1` pour l'Atelier). Partir de la dernière étape de
l'acte 1 sans l'avoir franchie enverrait le joueur dans un module que l'écran
d'accueil affiche encore cadenassé : **ouvert à l'aller, verrouillé au retour.**
On avance donc le curseur d'abord, et l'annonce de fin d'acte est absorbée — la
livraison EST cette annonce. Vérifié à l'écran : après « Emporter ma sonnerie »,
l'Atelier est ouvert et le Synthé et la Production restent cadenassés.

Un test vérifie ce que la livraison emporte, parce que c'est là qu'elle peut
mentir sans que rien ne le dise : les deux dernières étapes de l'acte sont du
récit puis la livraison, et un rechargement de niveau en chemin donnerait une
grille vide sous la promesse « ton rythme s'y ouvre tel quel ».

#### Acte 2 — le groove se RÈGLE, il ne se reproduit pas

L'acte citait cinq grilles à reproduire (Motown, swing, traîne, ghost notes,
décalage). Il ne cite plus que les trois verbes de PARAMÈTRE sur la famille
`groove`, dans l'ordre qui EST le contenu de l'acte : **entendre → nommer →
viser** (45, 46, 47, 48). On ne fait pas nommer ce qu'on n'a pas entendu.

C'est aussi le premier endroit où `nommer` et `regler` ont un sens : l'Atelier
est ouvert depuis l'acte 1, donc « Swing » et « Décalage » sont sur des curseurs
que le joueur a vus.

**La famille `groove` était déclarée et VIDE.** La remplir a demandé trois
choses au catalogue :

- **`cible: 'global'`** — le swing ne vit pas dans `DrumRowState` mais sur
  `PatternStateV2`. Sans cette distinction, l'exercice écrivait dans un champ
  inexistant et faisait entendre deux fois le même son. Le test de contrat suit
  désormais la cible déclarée, sinon il laissait passer exactement l'erreur
  qu'il existe pour attraper.
- **`contexte: { pas, repere }`** — et c'est mesuré, pas supposé. Le swing ne
  retarde que les pas **impairs** (`col % 2 === 1`) ; le motif par défaut des
  exercices de paramètre pose ses notes sur `[0, 2, 4, 6]`, tous pairs : le
  swing n'aurait eu **strictement aucun effet audible**. D'où des croches. Et le
  décalage ne s'entend que CONTRE un point fixe — d'où le kick en repère, seule
  ligne non coupée en plus de la ligne visée. Prouvé par rejeu du scheduler avec
  un faux kit, sans Web Audio : les trois versions produisent trois suites
  d'instants différentes, et le kick, lui, ne bouge pas.
- **La traîne (`drag`) n'y est PAS**, et l'absente est instructive : elle est
  globale et décale tout uniformément. Deux boucles séparées d'un retard
  constant sont indiscernables — il n'y a rien contre quoi l'entendre. Un test
  vérifie qu'elle reste hors du catalogue.

#### Trois défauts trouvés en mesurant, pas en relisant

1. **« Trois versions du même SON »** était écrit en dur dans la consigne. Juste
   tant que les verbes de paramètre ne servaient que le timbre ; faux pour le
   groove, qui ne change aucun son mais QUAND ils tombent. La question envoyait
   écouter la mauvaise chose.
2. **Deux libellés au féminin** (« la plus forte », « la plus en avance ») dans
   une phrase qui les prend en adverbe : « Laquelle sonne la plus en avance ? ».
   Ça ne se voit qu'en jouant le bon niveau — un test le voit toujours.
3. **Une commande promettait un SENS que le tirage ne tient pas.** « Et là,
   lequel dure le plus ? » se retrouvait une fois sur deux au-dessus d'un écran
   demandant le plus court. Même famille que le défaut déjà corrigé sur le
   BOUTON tiré ; le test interdit maintenant le superlatif dans une commande de
   `lequel` — la propriété peut être nommée, l'extrême non.

Le test de câblage des verbes de paramètre bouclait sur
`L.findIndex((l) => l.exercise === verbe)`, donc toujours sur un niveau de la
famille `timbre` — au point de l'affirmer. La famille `groove` et tout son
câblage neuf seraient passés dessous. Il boucle désormais sur **tous** les
niveaux de chaque verbe et vérifie la famille que le niveau demande.

**Vérification :** `npm run check` (0 erreur), **189 tests** (24 neufs, trois
passages consécutifs pour les tirages aléatoires), les deux builds, et un
parcours Playwright écran par écran des actes 0, 1 et 2 en 390×844 (aucune
erreur console, aucun débordement, aucune ligne de récit repliée).

### ✅ Le retard connu bat le retard court — et le pad le dit (2026-08-24)

Retour de Yann sur ma réponse à sa proposition (« baisser la qualité pendant
l'enregistrement, la remonter ensuite ») : *« l'idée était de réduire la qualité
juste pour que le délai puisse permettre d'enregistrer en rythme avec la
musique. une fois que c'est inscrit, le son doit être remis en bonne
qualité. »* — donc une dégradation TEMPORAIRE et assumée, pas un compromis
permanent. La réponse change de forme : elle devient chiffrée et exécutable.

**Fichiers touchés :** `tests/quantize.test.ts`,
`src/ui/sequencer/NotePad.svelte`, `src/ui/sequencer/SynthRowView.svelte`,
`src/ui/atelier/SynthModule.svelte`, `src/ui/atelier/AtelierView.svelte`.

#### Le raisonnement, mis en test plutôt qu'en argument

`tests/quantize.test.ts` porte cinq cas sur le cadre exact : 120 bpm, ligne de
8 pas, un pas = 250 ms, casque A2DP à 150 ms, joueur qui joue **en mesure avec
ce qu'il entend**.

- Sans correction, la note tombe sur **le pas suivant** : tout le motif sonne
  en retard d'un cran.
- **En dépensant tout ce qu'une dégradation peut rendre** — les 32 ms de tampon
  de sortie ramenées à 8, soit le réglage exact qui avait donné « le son est
  devenu moche » le 2026-08-21 — la note tombe **toujours** sur le pas suivant.
  24 ms gagnées sur 150 ne franchissent pas le demi-pas de 125 ms.
- Le retard **connu**, lui, s'annule complètement : `elapsedMs - latence.ms`
  ramène la note sur le pas visé, avec ±40 ms de jeu humain autour, et **quelle
  que soit la taille du retard** (300 ms s'annulent aussi bien que 150).

⚠️ **Ce n'est donc pas la taille du délai qui décide si on enregistre en
rythme, c'est le fait de le connaître.** Un retard uniforme ne gêne pas le jeu —
la boucle, l'aperçu et le métronome sont décalés du même montant, on joue
dessus sans y penser ; ce qui se casse, c'est l'ÉCRITURE, et elle se corrige par
soustraction. C'est aussi ce que font les DAW en monitoring à forte latence :
ils décalent la prise, ils ne dégradent pas le son.

#### Ce que ça change dans l'appli : le pad le dit, avec le chiffre

Le calibrage ne sert que si on sait qu'il faut le faire — et justement, un
retard uniforme s'entend comme « juste » puisque tout est décalé pareil. Le pad
affiche donc un mot quand `latence.ms === 0` **et** que le navigateur déclare
≥ 60 ms : « Ton appareil annonce 180 ms de retard… ça s'écrit un pas trop
loin », avec un lien qui ouvre la mesure. Seuil à 60 ms parce qu'en filaire on
mesure 32 ms — au-dessous, calibrer ne changerait presque rien. Rien ne
s'affiche dès qu'un réglage est posé, y compris remis à zéro sciemment.

⚠️ **Encore le piège de câblage de CLAUDE.md, et il a mordu.** `retardDeclare`
était un `$derived` appelant `engine.latenceSortieMs()` : cette fonction ne lit
aucune rune, donc le dérivé se calcule **une fois** — à un instant où le
contexte audio n'existe pas encore, puisqu'il naît au premier son — et ne se
recalcule jamais. Avec `outputLatency` forcé à 180 ms dans Chromium,
l'avertissement ne s'affichait pas. Devenu un `$state` rafraîchi à l'ouverture
du pad et après chaque aperçu — l'aperçu étant précisément ce qui crée le
contexte. *Le module était juste, le câblage était faux : troisième fois.*

**Vérifié :** `check` 0 erreur · **194 tests** (5 nouveaux) · les deux builds ·
Playwright avec `outputLatency` forcé : rien en filaire (32 ms), avertissement à
180 ms, le lien ouvre le calibrage, et l'avertissement disparaît une fois le
réglage posé.
### ✅ Acte 4, « La production » — le premier acte qui a demandé un étage de moteur (2026-08-25)

« Poursuis » : après la mélodie vient la production. C'est le premier acte dont
la leçon n'est **pas un son mais un endroit**, et c'est ce qui a décidé de tout
le reste.

**Fichiers touchés :** `src/engine/graph.ts`, `src/engine/AudioEngine.ts`,
`src/model/exercises.ts`, `src/model/presets/levels.ts`,
`src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/latence-audio.test.ts`,
`tests/exercises.test.ts`, `tests/carriere.test.ts`.

#### Ce que l'acte exige, et pourquoi les boutons ne suffisaient pas

`HISTOIRE.md` fait apprendre six choses ici — EQ, compression, filtre,
réverbération, delay, espace entre les instruments. Trois sont des boutons du
modèle et forment déjà la famille `filtre` : elles donnent les niveaux 54 à 57
(entendre le filtre, entendre l'espace, nommer réverbe/delay, régler l'espace),
sur le patron désormais rodé de l'acte 2.

L'EQ et la compression **ne sont pas citées**. Elles sont globales dans le
format v2 : aucune version par ligne à faire entendre. Citées à moitié, elles
auraient reproduit exactement le défaut de l'acte 0 — un mot sans bouton
derrière.

Mais le cœur de l'acte n'est aucune des six. C'est :

> — Ton morceau est bon dans ton ordinateur.
> — Ici, il est mauvais.

Et **ça ne se raconte pas**. Un écran qui décrit un défaut de mixage n'apprend
rien : c'est la leçon de « ce qui n'a pas été porté n'existe pas », appliquée
non plus à du récit mais à du son. D'où un étage de moteur, et un verbe.

#### Le petit haut-parleur (`graph.ts`)

Un passe-haut à 450 Hz et une bosse de présence à 3 kHz — les graves qu'un
boîtier de huit centimètres ne peut pas produire, et le sifflement du texte.
Mesuré dans un `OfflineAudioContext`, à travers le vrai graphe, sur un kick :

| | grave 40-200 Hz | RMS total | survie |
|---|---|---|---|
| studio | 0,00168 | 0,046 | — |
| laverie | 0,00011 | 0,0061 | 13 % |

Soit **14,8× d'énergie grave en moins**. Et en bout de chaîne, sur l'analyseur
maître d'un `AudioEngine` en marche : le grave perd plus de 20 dB à la bascule,
puis revient quand on repasse au studio.

⚠️ **Il est monté EN PARALLÈLE, et c'est une correction payée par la mesure.**
La première version mettait les deux filtres **en série**, réglés « neutres »
au repos (coupure à 10 Hz, bosse à 0 dB) — un passe-haut sous l'audible ne
s'entend pas, donc il ne fait rien. C'est vrai de son AMPLITUDE et faux de sa
PHASE : un biquad déplace le signal même là où il ne l'atténue pas. Mesuré sur
un kick, contre le même kick sans filtre :

```
41 176 échantillons différents sur 44 100 — écart maximal 6,4e-2 pour un RMS de 5,1e-2
```

L'étage aurait modifié **tous les exports du projet**, inaudiblement et pour
toujours, pour les besoins d'un exercice de Mode jeu. Le repos n'est donc plus
un réglage mais un **trajet** : les filtres vivent dans une branche parallèle à
gain nul, et `petitHPSec` / `petitHPHumide` font la bascule en fondu. Vérifié :
**0 échantillon d'écart sur 44 100** entre le trajet au repos et le trajet
d'avant. Le fondu a un second mérite — changer de haut-parleur pendant que la
boucle tourne est le geste même de l'exercice, et un saut de filtre claquerait.

Le monitoring **n'entre pas dans le format v2** : c'est une façon d'écouter, pas
un réglage de morceau — rien à sérialiser, rien à annuler, rien à exporter.
Même domicile que le décalage de latence, qui est une propriété de l'appareil.

#### Le verbe `laverie` (niveau 53)

Trois versions du même kick, séparées par le **drive**. Sur le moniteur de
studio elles se ressemblent ; sur le petit haut-parleur, une seule tient encore.
Mesuré, toujours à travers le vrai graphe :

| drive | RMS studio | RMS laverie | survie |
|---|---|---|---|
| 0 | 0,046 | 0,0061 | **13 %** |
| 55 | 0,061 | 0,0225 | **37 %** |
| 100 | 0,062 | 0,0252 | **40 %** |

Trois choix de conception en découlent :

- **les paliers sont posés, pas tirés.** Ce qu'il faut garantir n'est pas un
  écart de curseur mais un écart de SURVIE, que `tirerVersions` ne sait pas
  mesurer. Un palier intermédiaire à 30 aurait donné 30 % — trop près de 37 pour
  qu'on tranche sur un haut-parleur de téléphone ;
- **l'exercice arrive sur le petit haut-parleur.** Le drive monte aussi le
  niveau en studio (0,046 → 0,062) : posée là-bas, la question aurait une
  réponse — « la plus forte » — qui n'est pas celle qu'on enseigne ;
- **`tone` sur le kick reste hors du catalogue.** En studio il ne s'entend
  presque pas, ce qui en fait une mauvaise question de timbre — et une bonne
  question de production. Un bouton dont l'effet ne se voit qu'ailleurs est
  exactement le sujet de l'acte. Le niveau le pose donc lui-même, et `laverie`
  n'est délibérément pas un `VERBES_PARAM` : l'y mettre ferait tirer un bouton
  de la famille par `preparerParametre`, et l'exercice n'aurait plus de sujet.

Le sélecteur 🖥 / 📻 est **au-dessus de la question**, pas rangé dans un coin :
c'est en passant de l'un à l'autre qu'on entend que le problème n'est pas dans
le son mais dans l'endroit. Et on repart toujours en studio — sans cette remise
à zéro, l'exercice suivant se serait joué sans grave, muet sur la raison.

#### ⚠️ Trouvé en mesurant : l'export n'est PAS reproductible à l'octet près

En vérifiant que le nouvel étage ne changeait rien, deux rendus du **même** état
se sont révélés différents. Ce n'est pas le nouvel étage (prouvé à 0 échantillon
d'écart) — c'est antérieur, et `CLAUDE.md` l'affirme pourtant depuis toujours.

Isolé, effets coupés, deux exports du même état :

```
kick seul (aucune voix à bruit) :      0 / 286 650 échantillons différents
snare seule (voix à bruit)      :  8 465 / 286 650, écart maximal 0,531
```

La règle du `rng` injecté **tient parfaitement** : les notes, les vélocités et
les rafales sont identiques d'un rendu à l'autre. Ce qui ne l'est pas, ce sont
deux TAMPONS remplis hors de ce `rng` :

- `graph.ts` — le bruit blanc partagé (`data[i] = Math.random() * 2 - 1`),
  reconstruit à chaque `buildGraph`, donc à chaque export. Il sert la caisse
  claire, le hat, le clap et le shaker ;
- `fx.ts` — l'impulsion de réverbe, même chose.

**Non corrigé, et c'est désormais arbitré.** Le correctif (semer les deux
tampons depuis `EXPORT_SEED`) tient en deux lignes mais change les octets de
tous les exports futurs — donc une décision, pas un nettoyage. Verdict de Yann,
le jour même :

> *« pour moi, c'est pas important qu'un export ne soit pas reproductible à
> l'octet près »*

**On ne sème donc pas.** `CLAUDE.md` cesse de promettre l'octet et promet ce qui
est vrai — la reproductibilité des NOTES — et dit explicitement que les deux
tampons restent non semés par choix, pour qu'une prochaine session ne les
« corrige » pas en croyant nettoyer une dette.

Ce que l'épisode laisse quand même : la mesure elle-même. Un kick seul rend
0 échantillon d'écart sur 286 650, ce qui prouve que la règle du `rng` injecté
tient exactement ce qu'elle dit — l'ordre d'itération du scheduler, les
vélocités et les rafales sont bien déterministes. C'est cette partie-là qui
compte, et elle est intacte.

**Vérification :** `npm run check` 0 erreur · **206 tests** (12 neufs, trois
passages consécutifs) · les deux builds · parcours Playwright de l'acte 4 en
390×844 (aucune erreur console, aucun débordement, une ligne repliée trouvée et
coupée) · quatre scripts de mesure dans un `OfflineAudioContext` et sur
l'analyseur maître d'un moteur en marche.

### ✅ Acte 5, « Les styles » — l'acte qui avait l'air d'être une liste (2026-08-25)

« Poursuis ». Quinze genres à produire : la lecture évidente était quinze
niveaux de reproduction, c'est-à-dire **le même exercice quinze fois**. Ce
n'est pas ce que l'acte raconte.

**Fichiers touchés :** `src/model/exercises.ts`, `src/model/presets/levels.ts`,
`src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/exercises.test.ts`,
`tests/carriere.test.ts`.

#### La scène, et le verbe qui en sort

`HISTOIRE.md` met la leçon dans une conversation MSN, pas dans le pack livré :

> « Festif mais urbain, vous voyez :) »
> Il finit par fredonner. C'est du dancehall.
> **Tu comprends immédiatement. Il ne savait simplement pas le dire.**

Ce qui s'apprend là n'est pas de refaire un genre, c'est de **mettre un nom
dessus** — c'est précisément ce qui manquait à l'autre bout du fil. D'où le
verbe `style` : une boucle, quatre genres, aucun réglage à mesurer.

C'est le seul verbe qui interroge une **culture** plutôt qu'une oreille, et
c'est aussi le moins cher jamais ajouté : les 34 presets portaient déjà leur
`label`, leur `cat`, leur tempo, leur swing et leur timbre. Il n'a fallu que
les rendre visibles depuis `GamePresetLike` — deux champs optionnels.

#### Trois décisions de conception

- **Les leurres viennent d'AUTRES catégories.** « Boom bap » contre « Drill »
  et « Trap moderne » poserait une question dont la réponse est un tirage au
  sort pour tout le monde sauf un spécialiste — exactement le défaut que
  `tirerVersions` évite par construction pour les paramètres. On reconnaît une
  **famille**, comme dans la scène. Un test le vérifie à chaque tirage : les
  quatre propositions sont de quatre catégories distinctes.
- **Le genre est tiré à chaque partie**, jamais figé dans les données (d'où
  `stylePool` et non `presetId`). Un preset gravé aurait fait de la culture des
  styles un exercice de mémoire dès la deuxième partie.
- **La cible EST le preset**, pas seulement son nom. Le tirage se fait avant
  les trois helpers de niveau, en posant le `presetId` sur une **copie** de la
  config : le niveau hérite ainsi de la grille, de la subdivision, du tempo, du
  swing, de la traîne et du timbre du morceau réel. Un genre reconnu sur une
  grille générique à 100 BPM ne serait pas un genre — et rien à l'écran ne
  l'aurait dit. Un test compare tempo, swing, subdivision et nombre de coups au
  preset tiré, 60 fois.

#### Les reconstructions sont citées, pas fabriquées

« Tu écoutes. Tu reconstruis. Tu compares. » Ces niveaux-là existent depuis la
campagne d'origine : l'acte cite 4 (Motown), 12 (House), 13 (Dancehall), 27
(Dembow) et 32 (Funk) — une par famille du fax. Zéro ligne de données neuve, et
la règle du fichier est tenue : **un acte cite, il ne fabrique jamais.**

Détail qui n'en est pas un : les quatre catégories des presets *sont* les
quatre lignes du fax de Zik'Mobile (hip-hop, club, latino, funk/soul). Le brief
du récit et le classement du code disaient déjà la même chose.

**Vérification :** `npm run check` 0 erreur · **216 tests** (10 neufs, trois
passages consécutifs — le verbe est entièrement aléatoire, donc chaque
assertion porte sur ce qui doit être vrai à chaque tirage, répété 60 fois) ·
les deux builds · parcours Playwright de l'acte en 390×844 (aucune erreur
console, aucun débordement, aucune ligne repliée — un libellé de genre long
se replie proprement dans son bouton).

### ✅ Les COMMANDES — l'Atelier cesse d'être une récompense (2026-08-25)

Idée de Yann : *« à la fin de chaque acte où il est question d'une production à
livrer, on pourrait devoir produire quelque chose dans l'Atelier et présenter le
fichier JSON au Mode carrière pour qu'il valide l'acte ? ou meilleure idée à
envisager »*. Arbitrages retenus : **cahier des charges + note de style**, et
**acte 6 puis rétro-installation sur les actes 1 à 5**.

**Fichiers touchés :** `src/model/commande.ts` (neuf), `src/model/carriere.ts`,
`src/stores/game.svelte.ts`, `src/ui/game/CarriereView.svelte`,
`src/ui/game/GameView.svelte`, `src/ui/atelier/AtelierView.svelte`,
`tests/commande.test.ts` (neuf), `tests/carriere.test.ts`.

#### Ce qui manquait, et que l'idée nomme exactement

Les onze verbes du Mode jeu demandent tous de **retrouver** quelque chose : une
grille, un pas, un réglage, un genre. Aucun ne demande de **faire**. Or le récit
ne parle que de ça — on y livre des sonneries, un jingle, un morceau pour Le
Tunnel, un pack de quinze styles. L'Atelier existait comme récompense ; il
devient l'outil de travail.

#### Un écart assumé : pas de fichier JSON

L'Atelier et la carrière sont **la même application et le même store**. Un
aller-retour par export/import n'existerait que parce qu'on n'a pas câblé les
deux, et il coûterait cher là où le jeu se joue : 390 px, un téléchargement, un
sélecteur de fichiers. L'état passe en mémoire (`pattern.snapshot()`), comme la
livraison de l'acte 1 le fait déjà. Tout le reste de l'idée est gardé entier.

#### Le vrai travail : décider ce qui est vérifié

Trois façons de rater cette mécanique, et elles étaient toutes ouvertes :

- **ne rien vérifier** — le bouton est du théâtre, et le joueur le sent au
  deuxième acte ;
- **vérifier une cible** — ce n'est plus une commande, c'est `reproduire` avec
  des étapes en plus, et la liberté de l'Atelier ne sert à rien ;
- **vérifier trop** — une seule réponse juste, donc pas une production.

Ce qui est vérifié est donc le **cahier des charges** : des propriétés
mesurables tirées du brief du client (`model/commande.ts`, module pur).
Beaucoup de morceaux les satisfont — c'est le but.

#### ⚠️ Le piège mesuré : livrer sans rien faire

`defaultState()` ne démarre **pas** sur une grille vide. Son motif de départ est
*exactement* celui de Motown, et `rankPresets` lui donne **100 % sur « Motown /
soul » et sur « Swing »**. Un joueur entrant dans l'Atelier et en ressortant
sans rien toucher aurait livré un morceau qu'une contrainte de style aurait
accepté.

D'où `pasLeMotifDeDepart`, présente dans **toutes** les commandes, et un test
qui vérifie les deux moitiés : que le départ ressemble bien à du Motown aux yeux
du classement, *et* que la commande le refuse quand même.

#### « Dans le style de » est un RANG, pas un pourcentage

`rankPresets` compte les **cases identiques**, cases vides comprises : son score
ne veut rien dire seul (une grille clairsemée « ressemble » à tout ce qui est
clairsemé). Mesuré au banc d'essai sur boom bap, house, Motown et jungle :

| | rang du preset d'origine |
|---|---|
| le morceau lui-même | 1 |
| quatre cases de charleston inversées | 1 ou 2 |

D'où `RANG_STYLE_MAX = 3` : « dans le style » sans exiger « à l'identique ».

#### La sévérité DÉCROÎT avec le récit — et c'est l'acte 6 qui l'impose

`HISTOIRE.md` sur FB-015 : *« Aucun brief. Aucun client. Aucun style imposé.
[…] Cette fois, personne ne te dit si c'est bon. »* Une contrainte de genre y
contredirait le texte. Son cahier ne demande donc pas si c'est réussi — il
constate qu'on s'est servi de ce qu'on a appris, et ses libellés sont écrits du
point de vue du joueur (« La grille — acte 1 », « Une basse — acte 3 ») et non
d'un client. Un cahier *vide*, en revanche, aurait été un bouton qui ne juge
rien : un test exige qu'il reste au moins deux lignes.

| acte | client | ce qu'il exige |
|---|---|---|
| 2 · Kelvin | il ne sait pas le dire | les trois lignes, du swing |
| 3 · Rachid | « envie de rentrer chez soi » | une basse, de quoi tenir le temps |
| 4 · Le Tunnel | un système de club | la base propre, une basse, de l'air |
| 5 · Zik'Mobile | URBAIN FESTIF | **ça doit sonner dancehall** |
| 6 · FB-015 | personne | avoir produit, et s'être servi de tout |

**Et jamais avant l'acte 2** : on ne peut pas commander un travail dans un
module qu'on n'a pas encore ouvert. L'acte 1 garde sa `livraison` — un cadeau,
pas une épreuve : c'est lui qui donne la clé.

#### Le cahier est VIVANT pendant qu'on travaille

Les cases se cochent à chaque modification, dans un bandeau épinglé en haut de
l'Atelier, et le bouton « Livrer à Sol » reste désactivé tant que tout n'est pas
vert. Un verdict rendu seulement à la livraison aurait fait de la commande une
devinette : on clique, on se fait refuser, sans savoir laquelle des quatre
lignes bloque. Corollaire assumé : **aucune réplique de refus** — elle serait du
code mort, puisqu'une livraison refusée est inatteignable, et la liste dit déjà
mieux ce qui manque.

Le client, lui, **répond** en acceptant (`accepte`) : sans ça, on revenait de
l'Atelier sur un écran qui passait à la suite comme si de rien n'était.

#### Deux pièges de câblage, tous deux testés

- L'état de la commande **survit à un changement de vue** — on quitte le Mode
  jeu, on travaille, on revient : il ne peut donc pas vivre dans `GameView`, qui
  est démonté entre-temps.
- Il retient l'acte **et** l'étape : le curseur volatil bouge (on peut relire un
  autre acte pendant qu'on travaille), et c'est l'étape *livrée* qu'il faut
  valider au retour, pas celle qu'on regardait.

#### Sur l'instabilité constatée

Trois tests ont expiré (5 000 ms) pendant un passage complet. Diagnostic : ils
prennent 440 à 580 ms quand la machine est libre, et les échecs sont survenus
avec un serveur de dev et deux builds en concurrence. Huit passages propres
consécutifs après avoir arrêté le reste. Ce n'est donc pas la suite qui est
fragile — mais c'est noté ici plutôt que passé sous silence.

**Vérification :** `npm run check` 0 erreur · **241 tests** (25 neufs, quatre
passages consécutifs) · les deux builds · parcours Playwright de bout en bout en
390×844 : lire la commande, arriver à l'Atelier avec 1/3 coché et le bouton
inactif, produire, voir les cases se cocher en direct, livrer, et revenir sur la
réplique du client puis l'étape suivante. Aucune erreur console, aucun
débordement.

### ✅ Acte 7, « Le 14 juin » — les huit actes sont écrits (2026-08-25)

Le dernier. Il ouvre le Mode Live, et il ferme la boucle du récit.

**Fichiers touchés :** `src/model/carriere.ts`, `src/ui/game/CarriereView.svelte`,
`tests/carriere.test.ts`.

#### La mécanique portait déjà la leçon de l'acte

`HISTOIRE.md`, juste avant que Sol branche les enceintes :

> — Et si je me plante ?
> — **Tu te planteras. Mais maintenant tu sais quoi faire après.**

Or `justesseDesFrappes` retient la **meilleure fenêtre consécutive** et non la
moyenne du tour — décidé à l'étape 23, pour une raison de jouabilité (« la
boucle tourne en rond : moyenner tout ce qui a été frappé rend les tâtonnements
du début définitifs »). Autrement dit : la notation pardonne déjà un début raté
et récompense la reprise. L'acte cite donc les deux niveaux `jouer` (37 et 38)
et rien d'autre, et un test l'exige — c'est le seul acte du jeu où l'on ne
produit pas, on joue.

Le récit s'en sert explicitement, entre les deux : *« Le morceau ne s'est pas
arrêté pour t'attendre. C'est ça, la différence avec l'Atelier : ici on ne
revient pas en arrière, on rattrape. »*

#### Aucune commande, et c'est la même règle qu'à l'acte 1

Le Mode Live s'ouvre **en sortant** de l'acte — le récit décrit ce qu'on y fera
(lancer, enchaîner, rattraper), l'acte le donne en partant. Y poser une commande
aurait envoyé travailler dans un module pas encore ouvert : exactement ce que
l'acte 1 évite avec sa `livraison`.

Vérifié à l'écran, et le premier essai était mal calibré — il posait
`level: 40`, donc c'est le **seuil de niveau** (l'autre branche du OU de
`moduleUnlocked`) qui ouvrait le Live, pas le récit. Refait à `level: 1` :
`🔒 Mode Live — Acte 7` désactivé avant la dernière étape, `🎛 Mode Live` ouvert
après. C'est bien la voie narrative qui déverrouille.

#### `{pseudo}` — le seul endroit du jeu où un texte cite le joueur

Sol l'a appelé « le café » pendant cinq mois. À l'acte 6 elle lui demande enfin
son nom ; ici elle le dit au micro :

> — Je vous présente… **{pseudo}**.

Le pseudo est tapé au tout premier écran, avant le prologue — l'interpolation
est ce qui referme la boucle. Un **jeton** plutôt qu'un `kind` d'étape de plus :
une seule ligne de tout le récit en a besoin, et un genre d'étape se paierait
dans le store, le curseur, la persistance et trois tests. Deux tests le
tiennent : que la ligne existe et porte le jeton (et non un nom en dur), et que
le jeton n'apparaisse **nulle part ailleurs** — un `{pseudo}` oublié
s'afficherait tel quel, accolades comprises, sur un écran que personne ne relit.

#### Les huit actes sont écrits

| acte | compétence | ouvre |
|---|---|---|
| 0 · Le café | ÉCOUTE | — |
| 1 · Le rythme | RYTHME | l'Atelier |
| 2 · Le groove | GROOVE | — |
| 3 · La mélodie | MÉLODIE | le Synthé |
| 4 · La production | PRODUCTION | la Production |
| 5 · Les styles | CULTURE DES STYLES | — |
| 6 · FB-015 | CRÉATION | — |
| 7 · Le 14 juin | SCÈNE | le Mode Live |

`acteAVenir` ne renvoie plus jamais vrai. **Conséquence à arbitrer un jour** :
le second membre du OU de `moduleUnlocked` (les seuils de niveau) n'a plus la
raison d'être qui l'a fait écrire — « seuls les actes 0-2 ont leurs exercices
écrits ». Le retirer reste une décision, pas un nettoyage : il sert encore de
plancher à qui joue hors carrière. Non touché ici.

**Vérification :** `npm run check` 0 erreur · **247 tests** (6 neufs, trois
passages consécutifs) · les deux builds · parcours Playwright de l'acte en
390×844 : les neuf étapes, la réplique finale qui affiche bien le pseudo et non
le jeton, le verrou du Mode Live avant/après, aucune ligne repliée, aucune
erreur console.

### ✅ L'épilogue — le jeu avait huit actes et pas de fin (2026-08-25)

Dernière pièce non portée de `HISTOIRE.md`. Et surtout : jusqu'ici la carrière
s'arrêtait sur « LE MODE LIVE EST OUVERT » et **plus rien**.

**Fichiers touchés :** `src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/CarriereView.svelte`, `tests/carriere.test.ts`.

#### Pas un neuvième acte, et la distinction n'est pas cosmétique

L'épilogue n'a ni compétence, ni module, ni exercice, et il se passe des mois
après le 14 juin. L'ajouter à `ACTES` aurait cassé `ActeId`, `JOURS`, le compte
à rebours (quel J−… pour « septembre » ?) et le carnet — pour ranger du texte
dans une structure qui décrit des **épreuves**.

Il a donc sa propre constante (`EPILOGUE`) et son propre curseur dans le store,
volatil comme celui de la carrière : rien ne s'y réussit, rien ne s'y débloque,
il se relit à volonté, et il ne touche pas au curseur enregistré. Un test le
vérifie.

#### La dernière image est la première du jeu

> Puis elle lui fait écouter deux sons.
> **— Lequel est le plus grave ?**

C'est mot pour mot la question du **niveau 49**, le tout premier exercice de
l'acte 0, celle que Sol pose au joueur cinq mois plus tôt. Cette fois le joueur
est dans la pièce d'à côté, et il comprend ce qu'il entend. Un test tient la
citation *et* le niveau qu'elle désigne (`lequel` sur `pitch`) — la réécrire
casserait la boucle sans que rien ne le dise.

#### Le compte à rebours disparaît aux DEUX bouts

Il n'apparaissait déjà qu'à partir de l'écran qui explique le 14 juin — avant,
c'est un nombre vers une date inconnue. Il disparaît maintenant après : « J−0 ·
Le jour même » pendant un épilogue de septembre dirait le contraire du temps
écoulé. Même règle aux deux extrémités : **il ne s'affiche que tant qu'il veut
dire quelque chose.**

Et le dernier écran ne propose pas de « Suite ▸ » — il affiche **FIN**. Le
carnet et la salle de répétition, eux, restent ouverts : « pas de scénario qui
enferme l'outil ».

**Vérification :** `npm run check` 0 erreur · **253 tests** (6 neufs, trois
passages consécutifs) · les deux builds · parcours Playwright des cinq écrans en
390×844 : aucune ligne repliée, aucun débordement, le décompte bien absent, la
fin sans bouton d'avance, aucune erreur console.

### ✅ Le plancher gelé — le récit reprend la main sur le déverrouillage (2026-08-26)

> « il faut que le jeu ouvre les modules et qu'on puisse reprendre là où on
> s'est arrêtés ce qui permet de retrouver les modules. la question, c'est
> comment tu geres la "sauvegarde" ? »
> « faisons comme tu préconises pour le moment »

C'est la décision qui bloquait `REPRISE.md` depuis la veille : **les quatre
modules se déverrouillaient tous à la fin de l'acte 0**, donc quatre actes
annonçaient l'ouverture d'un module déjà ouvert.

#### Ce que la sauvegarde faisait déjà — et ce qu'elle ne faisait pas

La reprise n'était PAS à écrire : elle existait et elle était juste.
`memoriserCarriere` écrit `{ acte, etape }` à chaque étape franchie, le curseur
ne recule jamais, `setPseudo` → `load()` restaure `acteActif` / `etapeActive`,
et les modules ne sont pas stockés — ils se **dérivent** de l'acte. Une seule
source de vérité, donc pas de désynchronisation possible entre « où j'en suis »
et « ce que j'ai le droit d'ouvrir ».

Le seul défaut était le second membre du OU de `moduleUnlocked` : lu sur
`level`, il court-circuitait tout le récit. `saveProgress` fait
`level = max(level, id + 1)` et l'acte 0 cite les niveaux 49 à 52 ; réussir le
52 écrit `level = 53`, au-dessus des quatre seuils (2 / 13 / 27 / 34) **d'un
seul coup**.

Le fond, et c'est ce qui rend le correctif évident une fois vu : `level >= 34`
voulait dire « a joué 34 niveaux de la campagne linéaire ». La carrière a
supprimé cet ordre — elle cite les niveaux dans le désordre et au-delà de 34.
Le seuil ne mesurait plus rien.

#### Le plancher — un troisième champ, pas une lecture plus maligne

`PlayerProgress.plancher` : le `level` d'AVANT la carrière, gelé une fois pour
toutes. `moduleUnlocked` lit `plancher ?? level`.

⚠️ **Gelé dans `load()`, pas à l'entrée dans la carrière** — c'est tout le
sujet. `load()` est le seul point garanti d'être avant le premier exercice.
Gelé au premier `memoriserCarriere`, il aurait enregistré un `level` déjà gonflé
par l'exercice qu'on venait de réussir : exactement le défaut qu'il existe pour
corriger, avec l'air d'être corrigé.

Le repli `?? level` n'est pas de la prudence : c'est ce qui rend le champ
**gratuit à déployer**. Une sauvegarde d'avant se comporte comme avant, aucune
migration, aucun numéro de version à introduire.

Double effet, assumé : un joueur neuf gèle `1`, donc aucun seuil n'est franchi
et le récit gouverne seul ; un joueur déjà en cours gèle ce qu'il a et **ne perd
aucun module**. Le second est le prix du premier — on préfère qu'une poignée de
sauvegardes gardent un accès déjà donné plutôt que de refermer une porte au nez
de quelqu'un. D'où la règle inscrite dans `CLAUDE.md` : **une porte déjà ouverte
ne se referme jamais.**

#### Deux défauts trouvés en chemin, corrigés dans la même passe

1. **Les verrous mentaient sur le chemin.** L'accueil disait déjà l'acte, mais
   les onglets Synthé/Production et le bouton Mode Live annonçaient encore
   « Se débloque au niveau 13 du Mode jeu » : le même verrou nommait deux
   chemins différents selon l'écran où on le rencontrait. `libelleVerrou` /
   `verrouCourt` vivent maintenant dans `model/unlocks.ts` — une seule
   définition, testée, l'acte cité avant le niveau.
2. **Le stockage refusé était silencieux.** `writeJson` avalait l'erreur : en
   navigation privée, les modules se reverrouillaient à chaque visite et rien
   ne le disait. Le joueur ne pouvait pas distinguer « le jeu m'a oublié » de
   « mon navigateur ne le laisse pas se souvenir ». `persistanceRefusee` est
   posé au chargement par une **écriture-sonde** — `localStorage` existe en
   navigation privée stricte, il lève à l'écriture, donc tester sa présence ne
   dit rien.

#### Ce qui le vérifie

- `tests/unlocks.test.ts` (+5) — la RÈGLE. Le test de trajectoire a été écrit
  **rouge d'abord** et vérifié tel quel : sans le plancher, `atelier ouvert par
  l'acte 0: expected true to be false`. Les anciens tests, eux, vérifiaient les
  seuils un par un et n'ont rien vu pendant sept PR.
- `tests/plancher.test.ts` (+6, nouveau) — le QUAND, avec un vrai
  `localStorage` en mémoire plutôt qu'une fixture posée à la main. Joueur neuf,
  vétéran, niveau qui monte ensuite, « master », et les deux cas du stockage
  refusé.
- `scripts/parcours-carriere.cjs`, depuis un joueur neuf — le juge réel. Avant :
  `ACTE 1 — modules: atelier,synth,production,live`. Après, un par un :

  ```
  ── ACTE 0 « LE CAFÉ »       — modules: —
  ── ACTE 1 « LE RYTHME »     — modules: —
     après livraison          — modules: atelier
  ── ACTE 4 « LA PRODUCTION » — modules: atelier,synth
  ── ACTE 5 « LES STYLES »    — modules: atelier,synth,production
     ÉPILOGUE atteint         — modules: atelier,synth,production,live
  ```

- Playwright en 390×840 : splash d'un joueur neuf (« Acte 1 » / « Acte 7 »),
  ligne d'aveu du stockage refusé, onglets de l'Atelier — libellés relus dans le
  DOM, pas seulement à l'œil. Aucune erreur console.
- 264 tests, 0 erreur de types, les deux builds.

#### Fichiers touchés

`src/model/unlocks.ts` (plancher + libellés partagés), `src/stores/game.svelte.ts`
(`plancher`, `gelerPlancher`, `ecrireProgression`, `stockageEcrivable`,
`persistanceRefusee`), `src/stores/unlocks.svelte.ts`, `src/App.svelte`,
`src/ui/atelier/AtelierView.svelte`, `src/ui/atelier/ToolBar.svelte`,
`tests/unlocks.test.ts`, `tests/plancher.test.ts`, `CLAUDE.md`, `REPRISE.md`.

#### Écart de portée assumé

Le Mode Live reste à l'acte 7, donc derrière tout le récit alors qu'il est le
seul mode pensé pour le téléphone en paysage. C'est cohérent narrativement —
l'acte 7 *est* le concert — mais ça n'a jamais été essayé sur un vrai téléphone.
Laissé tel quel : à traiter dans la reprise du Mode Live, pas en affaiblissant
le récit au passage.

---

### ✅ Exporter sa sonnerie — le jeu ordonnait ce qu'il interdisait (2026-08-27)

> « L'atelier de prod est fermé, on ne peut pas exporter sa sonnerie. Il
> faudrait pouvoir le faire à travers le jeu. »

La livraison de l'acte 1 dit, mot pour mot :

> Exporte-le en MP3, mets-le sur ton téléphone :
> c'est ta sonnerie, ou ton réveil.

Et le bloc d'export vivait dans l'onglet **Production**, verrouillé jusqu'à
l'acte 4. Le commentaire de `CarriereView` l'affirmait déjà — « le rythme qu'on
vient de faire s'ouvre dans l'Atelier, d'où il s'exporte en MP3 » — sans que ce
soit vrai. Même famille que les autres défauts de ce retour : **l'écran promet
ce que le code ne fait pas.**

#### Le correctif, et pourquoi ce n'est pas de la mise en page

`<ExportBar>` sort des onglets. Ce n'est pas un arbitrage esthétique :
**exporter n'est pas un réglage de production, c'est FINIR.** On emporte ce
qu'on vient de faire, quel que soit l'onglet ouvert et quels que soient les
modules déverrouillés. Le mettre derrière un module qu'on n'a pas encore gagné
revenait à verrouiller la sortie de l'atelier.

Relevé après correctif, sur un joueur qui vient de finir l'acte 1 (Atelier
ouvert, Production fermée, un seul onglet visible) :

```
onglets : 🥁 RYTHME
fin de page : 💿 EXPORT AUDIO · Durée · 🎵 EXPORTER EN MP3 · 🎧 EXPORTER EN WAV
              🔴 ENREGISTRER LE DIRECT (WAV)
```

⚠️ **Note de méthode** : ma première sonde a conclu « absent » à tort — elle
cherchait « Exporter en MP3 » alors que le CSS rend les libellés en capitales et
qu'`innerText` renvoie le texte transformé. Vérifier une absence demande de
vérifier d'abord que la sonde saurait voir une présence.

305 tests, 0 erreur de types, les deux builds.

---

### ✅ Les promesses de l'acte 1 — un forçage jamais porté (2026-08-27)

> « Il y a des bugs. On dit qu'on introduit rim shot ou hat ouvert, ce n'est
> pas le cas, d'ailleurs on ne dit pas comment les faire. »
> « On dit qu'on a un tresillo avec rafales, ce n'est pas le cas. »

#### La cause : deux champs lus par personne

`forceVariantCount` et `forceRollCount` sont déclarés dans `GameLevel`, remplis
par `mkLevel`, documentés par un commentaire qui décrit leur rôle exact
(« utilisé pour les niveaux "une seule variante/rafale" ») — et **consommés
nulle part**. Un `grep` sur les deux noms ne renvoyait que leur déclaration et
leur affectation.

Ce n'est pas une faiblesse théorique : les niveaux concernés posent
`variantChance: 0` et `rollChance: 0` **justement parce qu'ils comptaient sur
le forçage**. Sans lui, la probabilité est nulle et la cible ne contient jamais
rien. Mesuré sur 60 tirages, avant correctif :

```
niveau 5, « Variante (une seule) »           →  0 variante sur 60
niveau 8, « Rafale (une seule) »             →  0 rafale   sur 60
niveau 9, tresillo « variante et rafale »    →  ni l'une ni l'autre
```

Après :

```
niveau 5 → 60/60 avec variante
niveau 8 → 60/60 avec rafale
niveau 9 → 60/60 avec les deux
```

#### Le correctif

`forcerVariantesEtRafales`, appliqué APRÈS le tirage probabiliste et qui
**compte ce qui est déjà là** : un niveau qui en veut une et qui en a déjà tiré
une n'en ajoute pas. Deux précautions :

- **seules la caisse claire et le charley** acceptent une variante — c'est
  pourquoi `level.variant` n'a pas de champ `kick`. Forcer un 2 sur la grosse
  caisse écrirait un état que la ligne ne sait pas jouer ;
- **une rafale ne compte que sur une case active** : posée sur une case vide,
  elle ne s'entend pas, donc elle n'enseigne rien.

⚠️ **Le forçage s'applique aussi au chemin PRESET**, et c'est ce qui manquait
au tresillo : sa cible est le pattern du preset, qui ne contient ni variante ni
rafale. Le commentaire de `mkLevel` l'avait prévu — « garantir qu'un concept
déjà enseigné est bien présent dans la cible, même si le preset original n'en
contenait pas assez » — mais rien ne l'appliquait.

#### Ce que le retour disait d'autre, et qui était juste

« On ne dit pas comment les faire » : le préambule du niveau 5 explique bien le
geste (« reclique une case déjà active pour y basculer »), il est affiché, et
`cycleCell` cycle bien 0 → 1 → 2 sur la claire et le charley (`cycleRoll` au
clic droit pour la rafale). La consigne était juste — c'est la cible qui ne
posait rien. Le sentiment « on ne dit pas comment » venait de n'avoir jamais eu
l'occasion de le faire.

#### Ce qui le vérifie

Deux tests **génériques** : tout niveau qui déclare un forçage doit le tenir, à
chaque tirage, répété 60 fois (« un test qui dépend du hasard doit affirmer ce
qui est vrai à CHAQUE tirage »). Ils valent pour les niveaux à venir sans qu'on
ait à y penser. Vérifiés rouges sans le correctif, avec les messages exacts du
retour : *« niveau 5 : 0 variante(s) alors qu'il en promet 1 »*.

305 tests, 0 erreur de types, les deux builds, parcours complet sur serveur
neuf.

---

### ✅ La mélodie s'écrit comme dans l'Atelier (2026-08-27)

> « bug sur la basse à deviner »
> « On devrait avoir la même interface que dans l'atelier non ? Des cellules et
> un clavier ? Comme ça, ça nous prépare. »

#### Ce que le « bug » était, et ce qu'il n'était pas

Diagnostic avant correctif, parce qu'un bug signalé sans cause est un bug qu'on
corrige au hasard. **La logique était saine** : en posant exactement la cible
aux niveaux 42 et 43, la vérification accepte. Le comparateur, le compteur
(calculé sur la vraie cible) et le rendu ne sont pas en cause.

Ce qui l'était : **l'écran annonçait « le degré 1 est la tonique, celui sur
lequel la phrase se repose » sans jamais la poser.** La cible commence toujours
par elle — c'est un choix documenté, « sans point de départ, aucun degré ne se
situe » — mais le joueur devait la redeviner. Un exercice qui exige de retrouver
ce qu'il présente comme acquis se joue comme un bug. Elle est désormais posée
ET verrouillée : le repère contre lequel tous les autres degrés s'entendent.

#### Cases + clavier

L'ancien écran était un ROULEAU : degrés en ordonnée, pas en abscisse, cinq
rangées de huit boutons. Deux défauts. Il ne ressemble à rien de ce que le
joueur retrouvera dans le Synthé — or l'acte 3 est censé l'y préparer — et
quarante cases pour poser trois notes se lisent comme un tableur.

Désormais : une ligne de cases qui EST la ligne de basse, chacune portant son
degré ; un clavier dessous, grave à gauche ; on choisit une case, on appuie sur
un degré, **la sélection avance**. C'est le geste d'écriture du pad de notes de
l'Atelier. Le `⌫` efface la case choisie — sans lui, retirer une note
demanderait de se souvenir du degré qu'on y avait posé.

Grammaire respectée : une case vide est creusée et éteinte, une case posée est
en relief et allumée. La sélection est un liseré ambre — pas vert, qui dit
« allumé / fait » dans cette interface.

⚠️ **Le piège de câblage, trouvé à la capture et pas au test.** Le `$effect`
qui recale la sélection s'exécute AUSSI au premier rendu, quand la cible n'est
pas encore tirée (`length === 0`) : il ramenait alors la sélection sur le pas 0,
celui de la tonique, verrouillé. Le clavier n'écrivait plus nulle part — soit
exactement le symptôme qu'on venait corriger. Une garde `n === 0` et l'effet
vise le prochain pas libre.

#### Les textes suivent

Le préambule décrivait le geste de l'ancien rouleau (« en cliquant la case qui
correspond au degré entendu »). Réécrit : un écran ne doit pas décrire un geste
qu'il ne propose plus.

#### Ce qui le vérifie

`tests/exercises.test.ts` — le test « part d'une grille vide » verrouillait
l'ANCIEN comportement ; réécrit sur le nouvel invariant (la tonique est posée,
verrouillée, inamovible ; le reste est vide et se valide case par case). 303
tests, 0 erreur de types, les deux builds, le parcours complet sur serveur neuf,
et une vérification Playwright du geste : appuyer sur « 3 » écrit 3 au pas 2 et
avance la sélection au pas 3.

#### Ce qui reste ouvert

Si le défaut que Yann a vu persiste, il est dans le SON — la basse inaudible en
contexte. C'est la seule piste non explorée, et elle demande de l'écouter.

---

### ✅ Face B — le nom, les verrous masqués, et une date (2026-08-27)

> « Le jeu devrait s'appeler "Face B" et non boîte à rythme »
> « On devrait masquer tout ce qui est verrouillé »
> « Dans l'histoire, il faut mettre des dates. Dire que c'est en 2004, 2005 ou
> 2006, je te laisse voir ce qui te semble plus pertinent. »

Lot 2 du retour de partie : ce qui se voit dans les trente premières secondes.

#### Le nom

**Face B**, le label — pas « Boîte à rythmes », qui décrivait l'outil. Le
produit n'est pas un séquenceur, c'est une carrière dans un label qui a cinq
mois pour ne pas fermer. Trois endroits visibles (`index.html`, le splash, le
titre de fenêtre du Mode jeu) plus l'objet du mail de retour. Les occurrences
en commentaire parlent de l'objet « boîte à rythmes » en général : elles
restent.

#### Les verrous masqués — une décision renversée

Le 2026-08-16, les entrées cadenassées restaient VISIBLES, et c'était motivé :
« une entrée qui disparaît se lit comme une panne ; une entrée cadenassée se
lit comme une suite ». Le verdict d'un joueur réel prime : un accueil où deux
entrées sur trois sont barrées présente le jeu par ce qu'on ne peut pas faire.
Splash, barre de navigation et onglets de l'Atelier masquent désormais ce qui
n'est pas ouvert. Mesuré après : plus **aucun** `🔒` dans le DOM d'un joueur
neuf, et le splash tient sur une seule entrée — « Mode jeu ».

Les libellés de verrou (`libelleVerrou`, `verrouCourt`) restent dans
`model/unlocks.ts` : ils décrivent toujours la règle, ils n'ont simplement plus
de surface où s'afficher. Les retirer serait un nettoyage, pas une décision.

#### La date — 2005, et une seule écrite

⚠️ **Le calendrier était déjà là.** `JOURS` porte le compte à rebours
(151, 120, 92, 61, 42, 28, 14, 0) sans qu'aucune année ne s'affiche jamais.
En posant le concert au 14 juin 2005 et en déduisant le reste, on découvre que
ces nombres n'ont rien d'arbitraire :

```
acte 0  J−151  14 janvier 2005   Cinq mois avant
acte 1  J−120  14 février 2005   Quatre mois avant
acte 2  J−92   14 mars 2005      Trois mois avant
acte 3  J−61   14 avril 2005     Deux mois avant
acte 4  J−42   3 mai 2005        Six semaines avant
acte 5  J−28   17 mai 2005       Quatre semaines avant
acte 6  J−14   31 mai 2005       Deux semaines avant
acte 7  J−0    14 juin 2005      Le jour même
```

Les quatre premiers actes tombent **exactement le 14 de leur mois**, les trois
derniers à six, quatre et deux semaines. Le calendrier n'était pas affiché,
c'est tout. D'où `ANNEE` + `dateDeLActe(id)`, et **une seule date écrite dans
le code** : deux sources de vérité pour un calendrier finiraient par ne plus
être d'accord, et cette coïncidence-là se perdrait au premier ajustement.
Quatre tests la tiennent, dont un qui vérifie que le `quand` écrit à la main
(« Trois mois avant ») reste d'accord avec le compte à rebours.

**Pourquoi 2005** plutôt que 2004 ou 2006 : c'est la seule des trois où le
postulat tient. Les sonneries mono et polyphoniques sont encore un marché dont
un petit label peut vivre — c'est littéralement ce que Face B fait — le fax, la
cassette et le répondeur sont des outils et non des accessoires nostalgiques,
et MSN est le chemin normal vers un commercial. En 2006 le marché des sonneries
s'effondre et le récit n'a plus de sol.

Le compte à rebours affiche donc `14 JUIN 2005 / J−92 / 14 mars 2005` : le
décompte dit l'urgence, la date dit l'époque — et l'époque est ce qui rend un
label de sonneries crédible.

#### Ce qui le vérifie

303 tests, 0 erreur de types, les deux builds, et une passe Playwright en
390×840 : titre d'onglet « Face B », splash à une seule entrée, aucun `🔒` dans
le DOM, compte à rebours daté relu dans le DOM.

#### Fichiers touchés

`index.html`, `src/App.svelte`, `src/ui/game/GameView.svelte`,
`src/ui/game/CarriereView.svelte`, `src/ui/atelier/AtelierView.svelte`,
`src/ui/atelier/ToolBar.svelte`, `src/model/carriere.ts` (`ANNEE`,
`dateDeLActe`), `tests/carriere.test.ts`, `CLAUDE.md`, `REPRISE.md`.

#### Ce qui reste du lot 2

« Indiquer qui parle » et « faire défiler le texte » ne sont pas faits : les
deux demandent une décision de forme sur les 44 écrans de récit (un locuteur
par ligne, et une révélation progressive), et méritent leur propre passe plutôt
qu'un ajout en fin de lot.

---

### ✅ Un sujet, deux exercices — et jamais une seule occurrence (2026-08-31)

> « Ça n'a pas assez changé, il faut modifier les niveaux pour que ce soit plus
> difficile, beaucoup plus difficile. Par exemple : on ne doit pas simplement
> changer une note en une rafale pour introduire rafale, il faut que ce soit
> bien plus difficile. Pour chaque niveau, on a le sujet. On peut faire plus
> d'exercices, prendre plus notre temps… » — Yann, après la passe précédente

**Le diagnostic tient dans l'exemple donné.** Le niveau « la rafale » posait UNE
rafale, sur la dernière double-croche du charley. On la trouve à sa POSITION —
la dernière case — sans jamais l'avoir écoutée : le geste est acquis, la leçon
ne l'est pas. Même chose pour le rim shot (une variante sur une ligne qui en
comptait deux : la mauvaise réponse est éliminée avant d'être entendue) et pour
l'ouverture du charley. La passe précédente avait corrigé la COURBE ; celle-ci
corrige ce que chaque marche contient.

**Deux règles neuves, et elles vont ensemble.**

1. **Une nouveauté se pose au PLURIEL**, de longueurs et de timbres différents.
2. **Un sujet vaut deux exercices** — le premier le pose, le second l'exige
   ailleurs. C'est le « prendre plus notre temps ».

**L'acte 1 passe de 8 à 12 exercices**, six sujets, quatre niveaux neufs
(67, 68, 69, 70) :

| # | sujet | niveau | cases | notes | var | raf |
|---|---|---|---|---|---|---|
| 1 | la base | 2 | 12 | 4 | | |
| 2 | la base | **67** Les quatre temps | 24 | 6 | | |
| 3 | le charley | 3 Le trio | 24 | 14 | | |
| 4 | le charley | **68** Le charley qui double | 32 | 22 | | |
| 5 | la syncope | 7 Le kick qui sort du temps | 32 | 22 | | |
| 6 | la syncope | **69** La claire sort du temps aussi | 32 | 23 | | |
| 7 | les variantes | 5 Les rim shots | 32 | 24 | 2 | |
| 8 | les variantes | 59 Les charleys ouverts | 32 | 22 | 3 | |
| 9 | les variantes | 60 Les deux à la fois | 48 | 25 | 5 | |
| 10 | la rafale | 8 Les rafales | 48 | 24 | | 4 |
| 11 | la rafale | **70** La relance | 48 | 21 | 2 | 2 |
| 12 | tout | 61 Tout ensemble | 48 | 26 | 5 | 3 |

Le niveau 61 — la sonnerie qu'on exporte — passe de **13 notes / 2 variantes /
1 rafale** (état de ce matin) à **26 notes / 5 variantes / 3 rafales**, sur
trois lignes de seize. Le niveau 8 pose quatre rafales de deux longueurs sur
deux lignes : la seule façon de le reposer est de COMPTER les coups de chacune.
Et le 70 donne enfin une raison aux rafales — le charley s'arrête sur le
dernier temps, la claire relance dans le trou. C'est un fill.

**L'acte 2 passe de 9 à 12**, rangé par sujet plutôt qu'en alternance : le
swing en entier (entendre → reposer léger → reposer franc → **régler**), puis le
décalage en entier (entendre → reposer → **régler**, niveau 71 neuf), puis les
deux (nommer → **les cumuler**, niveau 72 neuf : la seule grille où swing et
décalage jouent ensemble), puis l'aléa (entendre → **nommer**, niveau 73 neuf),
puis le palier. Le trio comparatif (14, 17, 23) garde sa grille unique, densifiée
à 26 notes.

⚠️ **Le plafond de résolution est atteint, et c'est mesuré.** Seize cases par
ligne font 18,7 px la case en 390 px de large ; trente-deux en feraient 9. Le
test de l'acte 2 ne peut donc plus exiger « strictement plus de cases que
l'acte 1 » — il exigerait de rendre le jeu illisible. Il exige à la place que
**toutes** les grilles de l'acte 2 portent un feel (swing, décalage, ou les
deux) et qu'**aucune** de l'acte 1 n'en porte : au-delà du plafond, la
difficulté change d'axe. Les cases ne sonnent plus là où elles sont dessinées.

**Tests.** `tests/grilles-ecrites.test.ts` : chaque promesse de préambule
réécrite contre sa nouvelle grille (5, 8, 59, 60, 61 au pluriel ; 67, 68, 70
neufs), plus deux règles génériques — « une nouveauté se pose au pluriel »
(toute variante ou rafale d'un niveau de l'acte 1 y est au moins deux fois) et
« chaque sujet a deux exercices » (l'application suit immédiatement la
découverte). La syncope acquise se mesure désormais en TEMPS et non en index,
pour rester vraie quand une ligne change de subdivision.

**Vérifié :** 441 tests, 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf (acte 1 à 16 étapes, acte
2 à 17, cinq commandes acceptées, six productions, épilogue, aucune erreur
console) ; quatre captures en 390×840 sur les grilles les plus lourdes —
0 px de débordement, 48 cases à 18,7 px.

**Écart de portée assumé :** les actes 3 à 7 gardent la passe précédente (notes
de mélodie, polyrythmie 5/7/9, densité de « jouer »). Les dix niveaux
`reproduire` de preset de l'acte 5 restent inchangés : leur difficulté est celle
des morceaux réels, la toucher voudrait dire réécrire les presets.

---

### ✅ La courbe monte deux fois plus haut — la scie de l'acte 1 (2026-08-31)

> « acte 0 : ok pour le moment. acte 1 : la progression est trop lente, tu peux
> rendre le jeu nettement plus difficile. acte 2 : idem. etc. Je préfère que ce
> soit trop difficile que pas assez. » — Yann

**Ce qui a été mesuré d'abord.** Les 43 exercices parcourus dans l'ordre réel de
la carrière, chacun réduit à ce qu'il demande : cases à lire, notes à poser,
variantes, rafales. L'acte 1 faisait une **SCIE** —

| | 2 | 3 | 7 | 5 | 59 | 60 | 8 | 61 |
|---|---|---|---|---|---|---|---|---|
| avant | 12 | 16 | 20 | **16** | **16** | 24 | **16** | 24 |
| après | 12 | 16 | 24 | 24 | 24 | 32 | 32 | 32 |

**La cause n'était pas un oubli, c'était une habitude de rédaction :** chaque
niveau réécrivait le backbeat le plus simple pour montrer sa nouveauté « au
propre ». Le rim shot, l'ouverture et la rafale s'apprenaient donc sur un
rythme PLUS FACILE que celui d'avant, et six exercices sur huit se jouaient au
niveau du deuxième. C'est ça, « la progression est trop lente » : ce n'est pas
que l'acte monte doucement, c'est qu'il redescend cinq fois.

**Ce qui a changé.**

- **Acte 1** — les six derniers rythmes partent tous du kick syncopé du niveau
  7 et n'en redescendent jamais ; le charley passe en doubles-croches au niveau
  60 (la nouveauté de ce niveau-là est la RÉSOLUTION, les deux variantes étant
  acquises) et y reste. Le niveau 61, la sonnerie qu'on exporte, passe de
  13 notes / 2 variantes / 1 rafale à **22 notes / 2 variantes / 2 rafales**,
  avec deux syncopes au lieu d'une.
- **Acte 2** — le trio comparatif (14, 23, 17) passe en **doubles-croches** :
  48 cases, 23 notes, contre 24 et 12. Le kick et la claire y sont syncopés mais
  restent sur des pas **PAIRS**, seuls non retardés par le swing : « le kick
  tient le temps » reste vrai au bit près, et `tests/feel-ecrit.test.ts` continue
  de le mesurer. Le niveau 63 perd son rôle (« le double du double » était déjà
  fait) et prend celui que le cahier de Kelvin laisse libre — **la claire**, six
  coups dont quatre sur des pas impairs, donc déplacés par le balancement. Le
  kick sur les quatre temps, le charley sur les seize cases et l'absence de
  variante sont **inchangés** : le cahier s'ouvre toujours à 0/4, vérifié.
- **Acte 3** — la mélodie : 3-4 notes → **5-6** (42), 2-3 → **3-4** (43, la
  moitié pleine du motif), 4-5 → **6-7** sur toute la gamme (44). Une phrase de
  trois notes se retient sans l'entendre.
- **Acte 5** — le niveau 24 fermait l'acte sur **12 cases**, la grille la plus
  légère du jeu après le tout premier backbeat, en 41e position sur 43. Les
  cycles restent premiers entre eux (c'est la leçon) mais passent de 3/4/5 à
  **5/7/9** : aucun pas partagé ailleurs qu'au tout début, vérifié.
- **Acte 7** — « jouer » : 2-3 coups en plus de l'ancre → **3-4** (37) et
  **4-5** (38). ⚠️ Le TEMPO n'a pas bougé — il a été baissé deux fois après
  essai, ce n'est pas lui qu'on remonte.

**Deux textes qui mentaient après coup**, corrigés dans `carriere.ts` : « les
cases sont simples » devant le trio de l'acte 2 (elles ne le sont plus), et la
commande du niveau 60, qui ne disait pas la double-croche qu'elle introduit.

**Ce que les tests regardent maintenant.** `tests/grilles-ecrites.test.ts` gagne
un bloc « la courbe ne redescend jamais » : la résolution ne recule jamais à
l'intérieur de l'acte 1, le dernier a plus du double des cases du premier,
chaque niveau après le 7 garde sa syncope, et l'acte 2 démarre au-dessus de la
fin de l'acte 1. ⚠️ Le poids mesuré est la **résolution seule** : un premier
jet comptait aussi variantes et rafales et échouait sur le niveau 8, qui repose
la claire et referme le charley EXPRÈS pour qu'on n'entende que la rafale. Un
test qui punit une décision juste mesure la mauvaise chose.

⚠️ **Le test du trio de l'acte 2 nomme désormais ses trois niveaux.** Deux
heuristiques y ont cédé successivement — « toutes les grilles de l'acte »
(cassée par l'ajout du palier 63), puis « à résolution égale, identiques »
(cassée ici, quand le trio est passé lui aussi en doubles-croches). Une
heuristique qui se re-corrige à chaque ajustement de contenu ne vérifie plus
une intention, elle décrit l'état du fichier.

**Vérifié :** 426 tests, 0 erreur de types, les deux builds ;
`scripts/parcours-carriere.cjs` depuis un joueur neuf (huit actes, cinq
commandes acceptées, six productions, épilogue atteint, aucune erreur console) ;
et quatre captures Playwright en 390×840 sur les grilles qui changent de forme —
0 px de débordement horizontal, cases de 18,7 px à seize par ligne, 35,5 px sur
le 5/7/9.

**Écart de portée assumé :** aucun exercice n'a été AJOUTÉ. « La progression est
trop lente » se corrige en montant les marches, pas en en ajoutant — allonger
les actes aurait aggravé le symptôme. Les niveaux `reproduire` de preset de
l'acte 5 (dix exercices sur dix-huit) ne bougent pas non plus : leur difficulté
est celle des presets réels, et la toucher voudrait dire réécrire les morceaux.

---

### ✅ L'acte 0 se joue avec les MAINS — les `lequel` sortent, le tap entre (2026-08-31)

> « l'acte 0 est à refaire à 0, il faut enlever les questions "lequel", mettre
> les questions de tap qu'on voit dans l'acte 8, bizarrement, elles seraient
> peut-être plus pertinentes ici » (Yann)

**Le fond, en une phrase : `lequel` demande un JUGEMENT, `jouer` demande un
GESTE.** L'acte 0 était le tout premier contact avec le jeu, et il posait
quatre questions à choix multiples à quelqu'un qui n'a encore rien touché,
à qui aucun bouton n'a été montré et dont le seul rôle jusque-là est de faire
le café. C'est un test d'entrée. Taper le temps ne demande ni mot, ni bouton,
ni vocabulaire : c'est la seule chose qu'un débutant sait déjà faire, et la
seule qui le mette *dans* le rythme plutôt que devant lui.

Ça répond aussi, par l'autre bout, au retour de testeur qui a produit le
palier de l'acte 2 (« le jeu reste trop longtemps trop facile ») : ce n'est
pas plus **dur**, c'est plus **engageant** — et les deux premières minutes du
jeu sont celles où la différence compte le plus.

#### Ce qui remplace quoi

| avant | après |
| --- | --- |
| 49 `lequel` — La hauteur | **64 `jouer` (écoute) — Le temps** |
| 50 `lequel` — La durée | **65 `jouer` (écoute) — Le contretemps** |
| 51 `lequel` — L'intensité | **66 `jouer` (lecture) — À vue** |
| 52 `silence` — Le silence | 52 `silence` — Le silence *(inchangé)* |

Le `silence` reste : ce n'est pas un `lequel`, il n'exige aucun vocabulaire, et
il est le contrepoint exact des trois frappes — on vient de taper ce qu'on
entend, on montre maintenant ce qu'on n'entend PAS.

Les niveaux 49, 50 et 51 **restent au réservoir** (un niveau ne se supprime
jamais, il cesse d'être cité) et les trois mots qu'ils portaient — hauteur,
durée, intensité — ne sont pas perdus : ils sont enseignés à l'acte 2, par
`nommer` et `regler`, c'est-à-dire à l'écran qui porte enfin les boutons
correspondants. C'est exactement l'arbitrage déjà pris sur ces deux verbes
(« je ne sais même pas expliquer ce que c'est decay »), poussé d'un cran.

#### Les trois rythmes sont ÉCRITS, et chacun n'ajoute qu'une chose

Même raison qu'à l'acte 1 : une courbe de trois exercices ne se dessine pas
avec un générateur de densité, qui ne sait pas ce qu'il vient de poser.

| niveau | kick (croches) | ce qui est neuf | tempo |
| --- | --- | --- | --- |
| 64 « Le temps » | `1 0 1 0 1 0 1 0` | rien — les quatre temps | 76-84 |
| 65 « Le contretemps » | `1 0 1 **1** 1 0 1 0` | un coup entre deux temps | 80-88 |
| 66 « À vue » | `1 0 1 0 1 **1** 1 0` | le kick devient MUET | 72-80 |

⚠️ Le contretemps du 66 est **ailleurs** que celui du 65 (le « et » du 3ᵉ
temps au lieu du 2ᵉ) : sinon « à vue » se rejouerait de mémoire au lieu de se
lire, et l'exercice ne mesurerait plus rien. Un test le tient.

⚠️ Le 66 porte un charley sur les huit croches. Le kick étant coupé (c'est ce
que fait `jouerIndice: 'lecture'` dans `buildState`), sans cette ligne
l'exercice se jouerait dans le silence, donc au hasard — c'est déjà pourquoi le
niveau 38 en porte un. Vérifié dans le navigateur : `rows.kick.muted === true`
et huit coups de charley sur le 66, kick audible et charley vide sur 64/65.

#### Ce qui a été gardé de force

**Les niveaux 37 et 38 restent à l'acte 7.** Leur citation là-bas est une
décision documentée — `justesseDesFrappes` retient la meilleure mesure
consécutive, donc la notation pardonne un début raté et récompense la reprise,
mot pour mot ce que Sol répond avant de brancher les enceintes. On **ajoute**
une paire à l'acte 0, on ne déplace pas la leur. La différence entre les deux
paires est la difficulté : ici la grille est écrite et régulière, là-bas elle
est tirée.

**La boucle de l'épilogue a suivi.** Sa dernière image est la première du jeu ;
elle citait « lequel est le plus grave ? », la question du niveau 49. Elle cite
maintenant le geste : *« Puis elle lance une boucle, quatre coups, rien
d'autre. — Écoute ça, et tape avec. »* Elle y gagne, en plus — un geste
s'entend de la pièce voisine, une question à choix multiples non, et l'écran
suivant repose entièrement sur ce que le joueur entend à travers la cloison.
⚠️ Le test ne grave plus la phrase : il la **dérive** de la commande du premier
exercice de l'acte 0, donc réécrire l'un sans l'autre le fait tomber.

#### L'écran « LA GRILLE », ajouté

Un récit de plus entre le 65 et le 66 : Sol sort une feuille quadrillée, une
colonne par croche, une croix par coup. Il prépare « à vue » (on ne demande pas
de lire ce qu'on n'a jamais vu écrit) et, sans en avoir l'air, tout l'acte 1 —
quand l'Atelier s'ouvrira, le joueur saura ce qu'il regarde. La dernière ligne
du prologue change avec : « — Écoute la hauteur, la durée, l'intensité »
devient « — Approche. Écoute, et tape avec », parce qu'un écran ne doit
annoncer que ce que l'écran suivant demande.

#### La latence, et pourquoi elle n'est pas un passage obligé

C'est désormais le **premier** écran du jeu qui expose la latence de
l'appareil. Le calibrage reste un bouton (🎚 Latence) et pas une porte : forcer
un réglage avant le premier son ferait commencer le jeu par de la
configuration. Deux filets existaient déjà et sont maintenant nommés dans le
préambule du 64 — l'écran propose de lui-même le calibrage dès que quatre
frappes tombent du même côté de plus de 25 ms.

#### Fichiers touchés

- `src/model/presets/levels.ts` — niveaux 64, 65, 66 (posés en FIN de tableau,
  comme la règle l'exige)
- `src/model/carriere.ts` — acte 0 réécrit, écran « LA GRILLE », dernière ligne
  du prologue, deux écrans de l'épilogue
- `tests/carriere.test.ts` — « les quatre mots de l'écoute » remplacé par
  quatre tests de FORME (aucun `lequel` ; `jouer ×3` puis `silence` ; les trois
  grilles écrites et leur contretemps déplacé ; une pulsation là où le kick est
  muet) ; la boucle de l'épilogue devient dérivée
- `tests/grilles-ecrites.test.ts` — un test par promesse pour 64, 65 et 66
- `tests/exercises.test.ts` — « exactement un de chaque sens » devient « les
  deux sens existent » : le compte était gravé, il ne pouvait pas l'être

#### Vérifications

`npm run check` 0 erreur · 423 tests · les deux builds ·
`scripts/parcours-carriere.cjs` sur un serveur fraîchement redémarré (les huit
actes, six productions, épilogue atteint, aucune erreur console) · les douze
étapes de l'acte 0 parcourues à la capture en 390×844, zéro débordement
horizontal, zéro erreur console.

---

### ✅ Le jeu se termine à nouveau — deux blocages trouvés EN JOUANT (2026-08-27)

> « je viens de faire une session carrière depuis le début »
> « Incohérences sur l'exercice en atelier, on n'a pas accès à la basse alors
> que c'est ce qu'il fait faire. Du coup, le jeu s'arrête là »
> « La check list dans l'atelier est déjà remplie quand on ouvre l'exercice.
> Il faut que l'atelier soit bien vide. »

Première partie complète jouée à la main par Yann. Elle a trouvé en une session
ce que neuf PR de tests n'avaient pas vu — dont un **cul-de-sac dur**.

#### 1. La carrière s'arrêtait à l'acte 3

La commande de Rachid exige une ligne de basse. Or `moduleUnlocked` n'ouvre le
Synthé qu'une fois l'acte 3 **franchi** (`acte > 3`), et cette commande est la
dernière étape de l'acte 3. Elle demandait donc quelque chose que le joueur ne
pouvait pas produire : onglet Synthé cadenassé, cahier impossible, fin de la
partie.

⚠️ **Pourquoi aucun test ne l'a vu**, et c'est la leçon à garder : les tests
vérifiaient qu'un cahier est SATISFIABLE — en construisant un état en mémoire,
où rien n'est verrouillé. Aucun ne croisait le cahier avec le VERROU à
l'instant où la commande se joue. `tests/commande.test.ts` le fait maintenant,
et il a été vérifié rouge sans le correctif : *« acte 3 — RACHID demande une
basse dans un Synthé fermé »*.

Le correctif : `EtapeCommande.modulesRequis`, honoré par `moduleUnlocked` — même
famille que `sharedPattern`, une intention explicite ouvre ce qu'il faut et rien
de plus. Vérifié dans l'appli : pendant la commande, Synthé ouvert, Production
et Live toujours fermés.

#### 2. Le cahier se cochait tout seul

`ouvrirCommande()` laissait l'Atelier sur `defaultState()` — le motif d'accueil,
qui EST du Motown. « De quoi tenir le temps dessous » était donc coché avant que
le joueur ait touché quoi que ce soit. D'où `etatVierge()` : mêmes réglages
machine (tempo, timbres, voix), contenu remis à zéro. `history.push()` avant, pour
qu'un Ctrl+Z rende son travail à qui en avait en cours.

⚠️ **Le corollaire qui a failli passer**, et qui n'apparaît qu'à l'écran : le
`DEPART` de `pasLeMotifDeDepart` comparait toujours à `defaultState()`. Comme
l'Atelier partait désormais de la table rase, les deux différaient — et « il
faut y avoir touché » se cochait à l'ouverture. Vu sur une capture, pas dans un
test. Corrigé, et le test « refuse une livraison qu'on n'a pas touchée » part
maintenant de `etatVierge()`, c'est-à-dire de ce que le joueur a sous les yeux.

#### Ce qui le vérifie

299 tests, 0 erreur de types, les deux builds, le parcours complet sur serveur
neuf, et une vérification Playwright de l'acte 3 : cahier **0/3** à l'ouverture,
onglet Synthé sans cadenas, Production cadenassée, séquenceur vide.

#### Fichiers touchés

`src/model/defaults.ts` (`etatVierge`), `src/model/carriere.ts` (`modulesRequis`,
`DEPART`), `src/model/unlocks.ts`, `src/stores/unlocks.svelte.ts`,
`src/stores/game.svelte.ts` (`ouvrirCommande` vide l'Atelier),
`tests/commande.test.ts`, `CLAUDE.md`, `REPRISE.md`.

#### Le reste du retour de Yann — non fait ici

Sa liste couvre bien plus (nom « Face B », masquer le verrouillé, qui parle,
dates, acte 0 à refaire, roasts, besaces, courbe de difficulté). Priorisé dans
`REPRISE.md` ; cette entrée ne traite que ce qui EMPÊCHAIT de jouer.

---

### ✅ Le palier de l'acte 2 — « trop longtemps trop facile », mesuré (2026-08-31)

> Retour d'un testeur : « le jeu reste trop longtemps trop facile ».

#### Ce que la mesure dit

Les 42 exercices, parcourus dans l'ordre où la carrière les joue, poids = cases
à déterminer (somme des subdivisions des lignes montrées) :

```
actes 0-1   ex. 1-12    12 → 24 cases, jusqu'à 2 variantes et 1 rafale
acte 2      ex. 13-20   24 cases, 0 variante, 0 rafale — TROIS FOIS
actes 3-4   ex. 21-29   neuf exercices d'affilée SANS AUCUNE grille
acte 5      ex. 30-40   ça remonte enfin : 40 cases à l'exercice 33
acte 7      ex. 41-42   deux « jouer »
```

Deux constats, et le second est le vrai :

1. **L'acte 2 était un cran EN ARRIÈRE de l'acte 1** — même nombre de cases,
   mais zéro variante là où l'acte 1 en posait deux.
2. **Le premier exercice plus dur que la fin de l'acte 1 arrivait au 33e sur
   42**, soit à 79 % du parcours.

⚠️ **Chaque acte était cohérent avec lui-même. C'est l'ENCHAÎNEMENT qui ne
l'était pas** — et aucun test ne regardait l'enchaînement. Les tests
vérifiaient qu'un acte monte, jamais qu'il monte plus haut que le précédent.

#### Ce qui n'a pas été touché, et pourquoi

Les trois grilles identiques de l'acte 2 (14, 23, 17) **restent identiques**.
C'est la seule façon de comparer deux balancements — on ne peut pas savoir si
ce qu'on entend vient du feel ou d'un autre motif. Le palier s'ajoute APRÈS
elles ; il ne les remplace pas.

Mon propre test de la PR #128 exigeait d'ailleurs que *toutes* les grilles de
l'acte soient identiques, et il a bloqué l'ajout. C'était une règle trop large :
elle porte sur le **groupe à comparer**, pas sur l'acte. Il regroupe désormais
par RÉSOLUTION — à subdivision égale, les grilles doivent être identiques.

#### Le niveau 63

Ce qui le rend plus dur n'est pas un empilement de nouveautés, c'est la
**résolution** : seize cases par ligne au lieu de huit, et une caisse claire qui
ne tombe plus sur les temps. Rien de neuf à apprendre, tout à entendre plus
finement.

```
kick  1 0 0 0 1 0 0 0 1 0 0 0 1 0 0 0     swing 20
snare 0 0 0 1 0 0 1 0 0 0 0 1 0 1 0 0
hat   1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
```

⚠️ Il devient le **point de départ de la commande de Kelvin** (`partirDu: 63`),
et il est écrit pour ne satisfaire AUCUNE de ses exigences : kick sur les quatre
temps (donc jamais entre deux), charley sur les seize cases (donc aucune place),
pas une variante. Vérifié dans l'appli : le cahier s'ouvre toujours à **0/4**,
sur un rythme deux fois plus dense.

#### Résultat mesuré

**Le premier exercice plus dur que la fin de l'acte 1 passe du 33e au 21e** —
de 79 % à 49 % du parcours. Et un test empêche désormais l'acte 2 de repasser
sous l'acte 1 en silence.

#### Ce qui reste, mesuré et non traité

Deux creux subsistent, tous deux structurels :

- **Exercices 22 à 30 : neuf d'affilée sans aucune grille** (actes 3 et 4). Leur
  sujet est la mélodie et la production, donc y poser une reproduction de rythme
  demande de décider ce qu'elle enseigne — c'est un arbitrage de contenu.
- **L'acte 5 repart à 16 cases** après le palier à 48, puis serpente sans ordre :
  16, 16, 20, 40, 36, 32, 24, 24, 28, 22. Le trier par difficulté est un
  changement de données trivial, mais chaque preset est attaché à une réplique
  (« Sol vérifie les classiques », « Kelvin vérifie le hip-hop ») : trier
  demande de réécrire ces lignes.

#### Ce qui le vérifie

411 tests (2 neufs, 2 réécrits), 0 erreur de types, les deux builds, parcours
complet sur serveur fraîchement démarré : acte 2 à 14 étapes, six productions au
bout, aucune erreur console. Cahier de Kelvin à 0/4 vérifié dans l'appli.

#### Fichiers touchés

`src/model/presets/levels.ts` (niveau 63), `src/model/carriere.ts` (acte 2,
`partirDu`), `tests/carriere.test.ts`, `CLAUDE.md`, `PLAN.md`, `REPRISE.md`.

---

### ✅ Les ghost notes existent enfin — quatre boutons enseignés (2026-08-31)

> « Il faudrait pouvoir progressivement jouer avec beaucoup plus de paramètres.
> Il faut aussi prendre le temps d'expliquer chaque paramètre au moment où on le
> découvre, avec une différence suffisamment audible. »

L'audit avait chiffré le manque : **10 boutons enseignés sur 155 réglages**.
Cette passe en ajoute quatre, et le principal résultat est ce qu'elle a
REFUSÉ d'ajouter.

#### La cartographie d'abord : le synthé coûte cher, les globaux ne coûtent rien

Tout le machinery des verbes de paramètre construit une grille de **batterie** —
`paramLigne` est un `GameDrumRowName`, le contexte pose des cases de kick, snare
et hat. Ajouter un bouton de synthé, c'est toucher cinq endroits (le type, le
tirage, `buildState`, la vue, le contexte), pas une table de données.

En revanche, huit boutons **globaux** passent par le chemin `cible: 'global'` qui
existe déjà. C'est là qu'était le gisement — et deux d'entre eux sont exactement
ce que les niveaux 20 et 21 promettaient sans jamais le poser.

#### ⚠️ La première mesure a menti

Rendre deux fois le morceau hors ligne et comparer les RMS donnait :

```
spontRoll  0→100   RMS relatif 0,411   (sur une caisse claire)
```

Un effet franc, apparemment. **Il n'y en a aucun** : `scheduler.ts` ne consulte
`spontRoll` que dans la voie du charley. Le RMS mesurait la différence entre
deux tirages du hasard, pas l'effet du bouton — un bouton d'aléa change le
rendu même quand il ne change rien.

Ce qui se mesure vraiment, c'est le **nombre d'événements** et la **dispersion
des gains**, en rejouant le scheduler sur 30 à 40 graines :

| bouton | ligne | 0 | milieu | max |
|---|---|---|---|---|
| `ghostDensity` | snare | 14 évts · 0,048 | 15,3 · 0,158 | 16,7 · 0,218 |
| `randomVelocity` | toutes | 14 · 0,048 | 14 · 0,089 | 14 · 0,157 |
| `spontRoll` | **charley** | 14 · 0,144 | 22,6 · 0,252 | 32,1 · 0,259 |
| `spontRoll` | claire | 14 · 0,048 | **14 · 0,048** | **14 · 0,048** |

La dernière ligne est le cas d'école du champ `lignes` : déclaré sur la caisse
claire, ce bouton aurait posé trois versions rigoureusement identiques — un
niveau impossible, et muet sur la raison.

#### Deux candidats écartés par la mesure

`globalCompression` et `globalBitcrush` ne sont **pas monotones** : mesuré deux
fois, dans deux contextes, le réglage à mi-chemin s'écarte du minimum de 0,67
quand le maximum ne s'en écarte que de 0,48. « Lequel est le plus compressé ? »
n'aurait pas de réponse fiable. Un bouton dont l'effet n'est pas monotone ne
peut pas porter un superlatif.

C'est le résultat le plus utile de la passe : **quatre boutons ajoutés, deux
refusés**, et la raison du refus est écrite dans le catalogue.

#### Le niveau 62, et le piège qu'il a révélé

`mkLevel(62, 'Ce qui bouge tout seul')` tire dans les trois boutons d'aléa, et
l'acte 2 le cite — c'est l'acte du groove, et ces boutons sont exactement ce qui
empêche une boucle de sonner comme une machine. Kelvin vient de dire « ça fait
réveil » ; c'est la réponse qui manquait.

⚠️ **En enrichissant la famille `groove`, j'ai failli casser le niveau 47.**
`nommer` prend ses leurres dans toute la famille : passant de deux boutons à
cinq, « Swing ou décalage ? » serait devenu une question à **quatre** choix dont
le titre en annonce deux — sans qu'aucun test ne bronche. Sa liste est donc
explicite désormais. Enrichir un catalogue peut casser un niveau écrit des mois
plus tôt, en silence.

#### Et une consigne qui mentait une fois sur deux

Ma première rédaction disait « Écoute laquelle en fait **le plus** ». Le test
« ne promet jamais un SENS que le tirage ne tient pas » l'a refusée
immédiatement : `paramSens` est tiré au sort, donc la question est aussi souvent
« laquelle en fait le moins ». La consigne pose maintenant la PROPRIÉTÉ (« là,
c'est la quantité qui change ») et laisse l'écran poser la question. La règle
existait, le test l'a appliquée.

#### Ce qui le vérifie

408 tests (11 neufs), 0 erreur de types, les deux builds, parcours complet sur
serveur fraîchement démarré : acte 2 à 13 étapes, six productions au bout,
aucune erreur console. Le test de `lignes` vérifié rouge par mutation.

**Le compteur : 10 boutons enseignés → 14.**

#### Fichiers touchés

`src/model/parametres.ts` (`ChampGlobalParam`, quatre entrées mesurées),
`src/model/presets/levels.ts` (niveau 62, liste explicite du 47),
`src/model/carriere.ts` (acte 2), `tests/params-alea.test.ts` (neuf),
`tests/carriere.test.ts`, `CLAUDE.md`, `PLAN.md`, `REPRISE.md`.

#### Écart de portée assumé

Les paramètres de SYNTHÉ restent hors du jeu — la cartographie ci-dessus dit
pourquoi, et le chiffrage est fait. C'est un chantier à part, pas une table de
données à rallonger.

---

### ✅ Chantier B, tranche 1 — la boucle de Kelvin se transforme (2026-08-28)

> « Pour l'acte 2 avec Calvin, on pourrait commencer par retranscrire dans le
> séquenceur le rythme demandé, puis partir directement de ce rythme dans
> l'atelier, le transformer progressivement en jouant avec différents
> paramètres, et arriver à une production correspondant à ce qu'il demande.
> C'est une bonne manière de faire découvrir les paramètres : on ne les apprend
> pas de manière abstraite, on les utilise parce qu'on en a besoin. »

Premier morceau du chantier B, sur l'exemple exact de Yann.

#### ⚠️ Le conflit, traité et non contourné

La demande contredit **deux arbitrages écrits** : « une commande part d'un
Atelier VIDE » (`etatVierge()`, CLAUDE.md) et « on n'emporte PAS la grille du
dernier exercice — une commande est un travail à faire, pas une correction à
retoucher » (GameView).

Relire *pourquoi* ces règles existent résout le conflit au lieu de choisir un
camp. Le défaut d'origine n'était pas « l'Atelier n'est pas vide » : c'était
**la check-list se cochait toute seule** (« la check-list dans l'atelier est
déjà remplie quand on ouvre l'exercice »). Partir d'un rythme est donc permis à
une condition, et une seule : **le cahier doit exiger ce que ce rythme n'a
pas.** La règle se déplace du point de départ vers le cahier — et devient
testable, ce qu'elle n'était pas.

#### Ce qui a été construit

- `etatDepuisGrille()` (`model/defaults.ts`) — un état d'Atelier bâti depuis une
  grille écrite, feel compris. Pure, donc testable.
- `EtapeCommande.partirDu?: number` — l'`id` du niveau dont on part.
- `game.departCommande()` — table rase par défaut, le rythme cité sinon.
- Deux contraintes neuves, calibrées sur les 34 presets : `kickQuiSortDuTemps`
  (16/34) et `dePlacePourLaVoix` (12/34). Satisfaisables par de vraies
  musiques, jamais gratuites.

#### Le cahier de Kelvin, réécrit contre son point de départ

L'Atelier s'ouvre sur le rythme du niveau 17 — celui que le joueur vient de
reproduire, celui que Kelvin a entendu :

```
kick  1 0 0 0 1 0 0 0      swing 30
snare 0 0 1 0 0 0 1 0
hat   1 1 1 1 1 1 1 1
```

Ce rythme ne satisfait **aucune** des trois exigences : kick sur 1 et 3 (jamais
entre deux temps), charley sur les huit cases (aucune place), pas une variante.
Mesuré dans l'appli : la check-list s'ouvre à **0/4**.

L'ancien cahier, lui, aurait été coché à 2/3 dès l'ouverture — « les trois
lignes » et « pas carré » sont vraies du rythme de départ. C'est exactement le
défaut que la nouvelle règle interdit, et c'est pourquoi le cahier a dû être
réécrit et pas seulement déplacé.

#### ⚠️ Une distinction qui manquait : tâche ou interdiction

Le test « aucune case cochée à l'ouverture » a immédiatement trouvé un cas :
« Ton morceau — pas le preset chargé depuis le menu » EST cochée au départ, et
c'est normal — c'est une **interdiction**, satisfaite tant qu'on ne triche pas.
L'exiger décochée voudrait dire « commence par tricher ».

D'où `Contrainte.interdit`, marqué dans les DONNÉES et pas nommé à la main dans
un test : une exception qu'on ne voit qu'en lisant un test est une exception que
personne ne voit. Deux tests en découlent — les tâches sont décochées à
l'ouverture, et les interdictions sont cochées (sinon le marquage serait faux).

#### Un état « qui satisfait tout » n'existe pas

Le constructeur de `tests/commande.test.ts` posait ses gestes
inconditionnellement. Les deux nouveaux **cassaient la fiche techno de l'acte
4** : un charley troué contredit un charley en doubles-croches, et redessiner le
kick efface le four-on-the-floor. Les gestes sont donc appliqués **seulement si
le cahier les demande**. Deux clients peuvent demander l'inverse l'un de
l'autre — c'est même le signe que les cahiers disent quelque chose.

Même correction dans `scripts/parcours-carriere.cjs`, qui s'est bloqué à l'acte
2 au premier essai : il jouait le jeu et ne savait pas produire les nouveaux
gestes. Il a fait son travail.

#### Ce qui le vérifie

397 tests (9 neufs), 0 erreur de types, les deux builds. Parcours complet sur
serveur fraîchement démarré : les six commandes acceptées, six productions au
bout. Et la vérification qui compte, dans l'appli en marche : l'Atelier s'ouvre
sur `kick 10001000 / snare 00100010 / hat 11111111 / swing 30`, cahier à 0/4,
aucune erreur console.

#### Fichiers touchés

`src/model/defaults.ts` (`etatDepuisGrille`), `src/model/commande.ts`
(`kickQuiSortDuTemps`, `dePlacePourLaVoix`, `Contrainte.interdit`),
`src/model/carriere.ts` (`partirDu`, cahier de Kelvin),
`src/stores/game.svelte.ts` (`departCommande`), `tests/transformer.test.ts`
(neuf), `tests/commande.test.ts`, `scripts/parcours-carriere.cjs`, `CLAUDE.md`,
`PLAN.md`, `REPRISE.md`.

#### Reste du chantier B

Les cinq autres commandes partent encore d'une table rase. Chacune demande le
même travail : choisir le rythme de départ, puis réécrire son cahier contre ce
rythme — c'est la moitié coûteuse, et elle ne se délègue pas à un test. Et les
ghost notes et les fills attendent toujours leur maison : un cahier sait
demander « ajoute des ghost notes », une grille ne sait pas les dessiner.

---

### ✅ Chantier A, tranche 3 — cinq polyrythmies pour deux idées (2026-08-27)

Dernière tranche du rattrapage. Les données disaient elles-mêmes ce qu'il
fallait faire : le préambule du niveau 30 annonce *« le même rapport 4:3 qu'au
niveau précédent »*, celui du 31 *« le vrai défi de lecture »*, et le 26 est
*« une nouvelle combinaison »* du 24. Cinq niveaux pour **deux** idées, dont un
qui admet ne mesurer que l'endurance de lecture.

Deux restent, réécrits en grilles, parce qu'ils enseignent deux choses
différentes :

- **24 · Trois cycles à la fois** — kick en 3, claire en 4, charley en 5 :
  trois cycles premiers entre eux, qui ne retombent ensemble qu'au bout de la
  mesure ;
- **29 · Quatre contre trois** — le cross-rhythm de l'afro-cubain, kick et
  charley en 8 contre une claire en 6.

Ils atterrissent à l'**acte 5**, et pas ailleurs : l'acte vient de faire le tour
de la famille latine et afro (tresillo, clave, dembow), et la polyrythmie est
l'idée dont ces trois-là descendent. La poser après eux, c'est nommer ce qu'on
vient d'entendre trois fois ; la poser à l'acte 1 l'aurait fait arriver après le
rim shot, sans rien contre quoi se situer. L'acte passe de 16 à 18 étapes.

Les trois autres (26, 30, 31) restent au réservoir sans être cités — **un niveau
ne se supprime pas**, voir ci-dessous.

#### ⚠️ La fragilité trouvée en chemin : une citation qui lisait une POSITION

`demarrerEtape` faisait :

```ts
if (e.kind === 'exercice') this.startLevel(e.niveau - 1);
```

Une recherche **positionnelle** à partir d'un **identifiant**. Ça ne marchait
que tant que `id === index + 1`, et rien ne l'imposait. Un niveau inséré au
milieu du tableau — ou un id sauté — aurait décalé **tous les exercices de tous
les actes**, en silence : chaque étape aurait lancé le niveau du voisin, sans
qu'aucun type ni aucun test ne bronche.

La règle « un niveau ajouté se pose en fin de tableau » (CLAUDE.md) existait
précisément pour éviter ça, sans jamais nommer ce qu'elle protégeait. La
recherche se fait désormais par id ; la règle reste une bonne pratique, ce n'est
plus ce qui tient le jeu debout. Trois tests le tiennent : chaque niveau cité
existe, la citation ne dépend plus de la position, et les identifiants du
réservoir sont uniques.

#### Un test réécrit sur la vraie règle

`tests/carriere.test.ts` exigeait un `presetId` sur chaque exercice de l'acte 5
— un raccourci datant du moment où l'acte n'était fait que de reconstructions de
genre. La vraie règle est plus forte et c'est elle qu'on tient maintenant :
**aucun rythme de l'acte 5 n'est tiré au sort**. Un genre reconnu sur une grille
générique n'est pas un genre, et une polyrythmie tirée n'apprend pas ce qu'est
une polyrythmie.

#### Ce qui le vérifie

388 tests (3 neufs sur la citation par id, 1 réécrit), 0 erreur de types, les
deux builds, parcours complet sur serveur fraîchement démarré : acte 5 à 18
étapes, six productions au bout, aucune erreur console.

**Compteur d'orphelins : 29 → 20**, en trois tranches. 41 niveaux joués sur 61,
contre 32 au moment de l'audit — sans qu'un seul niveau ait été écrit de zéro.

#### Fichiers touchés

`src/model/presets/levels.ts` (24 et 29 réécrits en grilles),
`src/stores/game.svelte.ts` (recherche par id), `src/model/carriere.ts`
(acte 5), `tests/carriere.test.ts`, `CLAUDE.md`, `PLAN.md`, `REPRISE.md`.

#### Ce qui reste orphelin, et pourquoi

Vingt niveaux. Aucun ne l'est plus par accident :

| Niveaux | Pourquoi |
|---|---|
| 15, 18 | la traîne est globale — inaudible dans une boucle |
| 20, 21 | ghost notes et fills : deux champs que le code ne lit pas, et une affaire de vélocité qu'une grille ne dessine pas |
| 26, 30, 31 | la même polyrythmie que 24 et 29, ou de l'endurance de lecture |
| 19, 34 | gqom et trap moderne — postérieurs à 2005 |
| 28, 33 | mesure longue et « tout combiné » : de l'endurance, et un niveau qui ne sait pas ce qu'il enseigne |
| 1, 6, 10, 11 | doublons des rythmes écrits de l'acte 1 |
| 35, 36, 39-41 | les pilotes des verbes, dont `completer` et `intrus` — jamais cités, et c'est le prochain sujet |

---

### ✅ Chantier A, tranche 2 — et un anachronisme à 39 % (2026-08-27)

Suite de la tranche 1. Objectif : rendre à l'acte 5 les presets qui dorment
dans le réservoir. Ce qui a été trouvé en route valait plus que la tranche.

#### Le verbe « style » proposait des genres qui n'existent pas encore

Le niveau 58 (« Le genre, à l'oreille ») a un `stylePool` **vide**, ce qui veut
dire « les 34 presets ». Le récit se passe en 2005 — `ANNEE`, et c'est le pilier
du postulat : la seule année où un petit label peut vivre des sonneries.

Mesuré sur **400 tirages**, en pilotant le vrai store :

```
au moins un genre hors époque parmi les 4 affichés : 156 / 400   (39 %)
la BONNE RÉPONSE est un genre hors époque         :  40 / 400   (10 %)
```

Trap moderne (années 2010), Drill (2012+), Gqom (2011), Amapiano (2016) —
proposés à un stagiaire de 2005, deux parties sur cinq.

⚠️ `REPRISE.md` listait cette règle parmi les pistes ouvertes : *« les quatre
presets hors époque ne sont jamais commandés pendant la campagne — c'est voulu,
mais jamais vérifié par un test »*. Elle n'était pas seulement non vérifiée :
elle était **fausse**. « Voulu et non vérifié » veut toujours dire « pas fait ».

Le correctif est dans le TIRAGE (`tirerStyle`), pas dans le `stylePool` du
niveau 58 : c'est une règle du récit, pas une propriété d'un exercice. Posée sur
un niveau, le prochain verbe qui tire un genre l'oublierait — et c'est
exactement comme ça que celui-ci est passé. Après correctif : **0 sur 400**.

Trois précautions dans `tests/epoque.test.ts` : le tirage répété (120 fois, un
test aléatoire doit affirmer ce qui est vrai à chaque tirage) ; le fait qu'aucun
acte ne cite un niveau `reproduire` dont le TITRE nomme un de ces genres (« 34 ·
Reproduire un preset (Trap moderne) » casserait la fiction aussi sûrement qu'un
leurre) ; et surtout que **chaque identifiant de `HORS_EPOQUE` existe vraiment**
— une coquille dans une liste d'exclusion ne filtre plus rien, en silence.
Vérifié rouge par mutation.

**L'Atelier garde les 34**, et c'est la moitié de la règle : c'est un outil, pas
le récit. Composer un amapiano aujourd'hui est permis ; le reconnaître en 2005
ne l'est pas.

#### Quatre presets rendus à l'acte 5

L'acte des styles n'en faisait rejouer que cinq. Quatre orphelins de l'époque
le rejoignent : **UK Garage** (1997-2001), **French touch** (années 90),
**Tresillo** et **Clave** (sans date). L'acte passe de 12 à 16 étapes.

Les deux autres orphelins de la famille — 19 (Gqom) et 34 (Trap moderne) —
restent dehors, et désormais un test dit pourquoi.

⚠️ **Une ligne de récit devenue fausse en même temps.** Sol sort son carnet :
*« Trente-quatre disques, un par genre »*. Quatre d'entre eux n'existent pas en
2005, et le jeu ne les propose plus. La réplique dit **trente**, ce qui est
exactement la taille du tirage. Une ligne de dialogue qui compte quelque chose
est une assertion comme une autre.

#### Ce qui le vérifie

381 tests (5 neufs), 0 erreur de types, les deux builds, parcours complet sur
serveur fraîchement démarré : acte 5 à 16 étapes, six productions au bout,
aucune erreur console.

**Le compteur d'orphelins : 29 → 22.** Sept niveaux rendus au jeu en deux
tranches, dont aucun n'a été écrit de zéro.

#### Fichiers touchés

`src/model/presets/songs.ts` (`HORS_EPOQUE`), `src/stores/game.svelte.ts`
(filtre dans `tirerStyle`), `src/model/carriere.ts` (acte 5 : quatre exercices,
le carnet à trente disques), `tests/epoque.test.ts` (neuf), `CLAUDE.md`,
`PLAN.md`, `REPRISE.md`.

---

### ✅ Chantier A, tranche 1 — le groove se repose, il ne se désigne plus (2026-08-27)

> « Je trouve pour l'instant les exercices locaux et les quiz moins
> intéressants que les exercices de reproduction et surtout que ceux de
> l'atelier. »

Suite directe de l'audit : **29 niveaux sur 61 ne sont cités par aucun acte**,
dont 19 des 21 de la plage 14-34. Cette tranche en rattrape trois — ceux qui
enseignent le groove — et documente pourquoi les autres ne le seront pas.

#### Le blocage, trouvé avant d'écrire une ligne de contenu

Une grille écrite ne pouvait pas porter ces niveaux. `startLevel` **tirait**
encore le swing dans `swingOptions`, et surtout **forçait le décalage à zéro** :

```ts
this.shift = { kick: 0, snare: 0, hat: 0 };   // avant
```

Le niveau 23 s'appelle « Décalage par ligne ». Il n'en jouait aucun. C'est la
famille du rim shot annoncé et jamais posé, et personne ne l'avait vu parce que
le niveau est orphelin depuis que la carrière a remplacé la campagne linéaire.
`GrilleEcrite` porte donc `swing`, `drag` et `shift`.

#### Les trois niveaux

**La même grille exactement**, un backbeat en croches — seul le feel change :

| # | ce qui change | feel |
|---|---|---|
| 14 · Le balancement | rien dans les cases | `swing: 12` |
| 23 · Une ligne en retard | rien dans les cases | `shift: { hat: 12 }` |
| 17 · Le balancement, prononcé | rien dans les cases | `swing: 30` |

C'est le point de conception : on ne peut comparer deux balancements que si
tout le reste est identique. Une densité tirée rendait la question impossible —
on ne savait pas si ce qu'on entendait venait du feel ou d'un autre motif. Et
le motif est en croches **pleines** parce que le swing ne retarde que les pas
impairs (`parametres.ts`) : posé sur `[0, 2, 4, 6]`, il n'aurait aucun effet.

#### Ce que la mesure a tranché : la traîne n'est pas un exercice

`drag` est un champ **global** du format v2. Mesuré en rejouant le scheduler :
il décale les trois lignes du **même** montant, donc relativement il ne fait
rien — inaudible dans une boucle qui tourne. Un exercice « reproduis ce rythme,
il traîne » demanderait d'entendre une différence qui n'existe pas.

Les niveaux 15 et 18 restent donc orphelins **par décision**, et
`tests/feel-ecrit.test.ts` en fait la preuve plutôt qu'une affirmation. C'est
déjà la raison pour laquelle la traîne est hors du catalogue de
`parametres.ts` — la constater deux fois valait mieux que de la redécouvrir.

⚠️ **Deux autres champs déclarés et lus par personne** : `GameLevel.ghost` et
`GameLevel.fill`. Vérifié — aucune lecture hors de `levels.ts`. Les niveaux 20
(« Ghost notes ») et 21 (« Fill ») annoncent donc ce que le code ne pose
jamais, exactement comme `forceVariantCount` avant la PR #124. Ils ne sont pas
cités ici : une ghost note est une affaire de **vélocité**, qu'une grille ne
sait pas dessiner, donc `reproduire` est le mauvais verbe pour elle. Leur place
est dans un cahier de commande — chantier B.

#### L'acte 2 : entendre → reposer → nommer → régler

Neuf étapes deviennent douze. Chaque reproduction suit l'écoute qui la prépare :
45 (entendre le swing) → **14** → 46 (entendre le décalage) → **23** → 47
(nommer) → 48 (régler) → **17** → la commande de Kelvin.

⚠️ **Deux arbitrages successifs, à garder tous les deux.** L'acte citait cinq
grilles générées ; elles ont été retirées parce qu'elles posaient des rafales
et des rim shots sans rapport avec le groove. Les grilles reviennent
aujourd'hui — mais écrites, sans une variante ni une rafale, et toutes
identiques. Ce n'est pas une restauration, et `tests/carriere.test.ts` tient
maintenant les deux règles au lieu d'un simple « que des verbes de paramètre ».

#### Un harnais extrait, pas recopié

Le rejeu du scheduler sans Web Audio vivait dans `tests/scheduler.test.ts`. Un
second fichier en ayant besoin, il passe dans `tests/helpers/rejeu.ts` — deux
copies d'un harnais qui doit rester aligné sur `renderPattern` finiraient par
diverger, et celle qui diverge cesse silencieusement de protéger ce qu'elle
croit protéger. Le snapshot du scheduler confirme l'extraction.

#### Ce qui le vérifie

376 tests (9 neufs sur le feel, 3 réécrits sur l'acte 2), 0 erreur de types,
les deux builds. Vingt démarrages de chaque niveau dans l'appli : **un seul
feel** à chaque fois, exactement celui qui est écrit. Le parcours complet passe
l'acte 2 à 12 étapes et rend toujours ses six productions.

#### Fichiers touchés

`src/model/presets/levels.ts` (`GrilleEcrite.swing/drag/shift`, niveaux 14, 17,
23 réécrits), `src/stores/game.svelte.ts` (le feel écrit prime sur le tirage),
`src/model/carriere.ts` (acte 2), `tests/helpers/rejeu.ts` (neuf),
`tests/feel-ecrit.test.ts` (neuf), `tests/scheduler.test.ts`,
`tests/carriere.test.ts`, `CLAUDE.md`, `PLAN.md`, `REPRISE.md`.

#### Reste du chantier A

Les 16 autres orphelins : 5 presets jamais joués (UK Garage, Gqom, House French
touch, Clave, Trap moderne) à distribuer dans l'acte 5, 5 polyrythmies à réduire
à 2, la mesure longue, « tout combiné », et les deux niveaux ghost/fill qui
demandent d'abord que le code les pose.

---

### ✅ La boucle de livraison — le jeu écoute enfin ce qu'on lui donne (2026-08-27)

> « Quand on réussit quelque chose d'important et qu'on livre une production, je
> trouve que le jeu ne récompense pas encore suffisamment le joueur. »
> « Ce serait particulièrement intéressant si le jeu pouvait réellement analyser
> ce que l'on vient de faire pour adapter sa réaction. »
> « Il faudrait que les productions réalisées restent disponibles dans le jeu. »

Jusqu'ici, livrer une commande évaluait le cahier, avançait le curseur, et
**jetait le morceau**. La réaction était une phrase écrite d'avance, la même
quel que soit ce qu'on venait de faire. Le joueur passait dix minutes dans
l'Atelier et le jeu enchaînait.

#### 1. Une réaction CALCULÉE — `src/model/reactions.ts`

Treize observations, chacune une propriété vérifiable de `PatternStateV2`. La
plus spécifique gagne (déterministe), seule la formulation varie. Quatre règles
écrites dans le module : citer un fait, ne commenter que ce qui est **audible**,
peser la **spécificité et non la sévérité**, et se taire quand il n'y a rien à
dire.

⚠️ **Le vrai travail est le CALIBRAGE, et une sonde l'a montré avant le premier
test.** Écrite d'instinct, la pique de Yann — « ta basse fait deux notes » —
tombait sur **12 presets sur 34**. Mesurée, la distribution des hauteurs de
basse est : 1 → 3 morceaux, 2 → 9, 3 → 10, 4 → 8, 5 → 4. Une basse à deux notes
est du travail honnête ; **une** note répétée est le service minimum, et c'est
rare. Même histoire pour « ton charley ne respire jamais » : 18 presets ont un
charley sur toutes les cases, 11 sans la moindre variante — c'est la norme en
house, pas une faute. Observation **retirée** plutôt que rafistolée, et
remplacée par « tout tombe sur les temps », mesurée à **1 preset sur 34**
(gqom), qui est en plus le contraire exact de ce que l'acte 1 enseigne.

Résultat mesuré sur les 34 presets : 4 piques seulement, toutes méritées, et
cinq réactions distinctes là où la première version n'en produisait que trois.

⚠️ **Et un troisième défaut, que seule la mesure pouvait trouver** : les
échelles de `types.ts` mentent. `finalVolume` va de 50 à 150 (pas 0,5-1,5),
`globalSaturation` de 0 à 100 (pas 0-1), `swing` de 0 à 75. Écrite sur les
échelles annoncées, la pique « c'est trop fort » (`finalVolume >= 1.4`) était
vraie de **tous** les états — y compris d'un Atelier vide, qui recevait donc une
remarque sur un morceau inexistant. D'où aussi la garde globale : rien ne sonne
→ `reactionA` rend `null`.

#### 2. Une discographie — `src/model/discographie.ts`

Les six productions du récit (la sonnerie de l'acte 1 + les cinq commandes) sont
gardées par pseudo, sérialisées au format v2. Une par acte, remplacée et jamais
empilée — reculer dans le récit est gratuit, et empiler ferait un journal de
tentatives. Deux gestes par morceau : le réécouter, ou le **reprendre dans
l'Atelier**, sans quoi la liste serait un musée.

Clé de stockage à part (`boite-a-rythme:productions`) plutôt qu'un champ de
`PlayerProgress` : un morceau pèse ~5 ko, et `progress` est réécrit à chaque
niveau réussi.

#### 3. L'écran de livraison

Trois choses dans l'ordre où elles ont du sens : le client accepte, on
**réécoute** ce qu'on vient de faire, il ajoute sa remarque. La remarque n'est
pas verte — le vert dit « allumé / fait » dans toute la grammaire de l'appli, et
une opinion n'est pas un état : ambre pour une pique, violet pour un compliment.

Le lecteur est un `AudioEngine` à part, qui n'ouvre son contexte qu'à la
première lecture — mesuré : **0 contexte audio avant le clic**, 1 en
`running` avec l'horloge qui avance après. C'est la règle de CLAUDE.md sur le
flux de sortie qu'on ne tient pas ouvert pour rien.

#### Un défaut de rangement corrigé en passant

L'archivage de l'acte 1 vivait dans `CarriereView`, celui des commandes dans le
store. Une règle à deux domiciles n'est appliquée qu'à un seul — et ici l'ordre
compte (archiver AVANT d'avancer, tant que le curseur désigne l'acte livré).
D'où `livrerSonnerie()`, à côté de `livrerCommande()`. `parcours-carriere.cjs`
passe désormais par ce chemin-là : en avançant à la main, il aurait sauté
l'archivage sans jamais voir une régression.

#### Ce qui le vérifie

358 tests (25 neufs), 0 erreur de types, les deux builds. Le parcours complet
sur serveur fraîchement démarré rend **6 morceaux — 1:TA SONNERIE · 2:SANS
TITRE · 3:JINGLE LAVERIE · 4:LE TUNNEL (V2) · 5:PACK ZIK'MOBILE · 6:FB-015**.
Et une livraison réelle pilotée dans l'appli : cahier de Kelvin satisfait avec
une basse d'une note → « — Ta basse joue la même note du début à la fin. C'est
un choix ? », production archivée (5 210 octets), aucune erreur console.

#### Fichiers touchés

`src/model/reactions.ts` (neuf), `src/model/discographie.ts` (neuf),
`src/model/carriere.ts` (`titre` / `client` sur les six productions),
`src/stores/game.svelte.ts` (`productions`, `archiverProduction`,
`livrerSonnerie`, `reactionLivraison`), `src/ui/game/CarriereView.svelte`
(écran de livraison, lecteur, discographie), `scripts/parcours-carriere.cjs`,
`tests/reactions.test.ts` (neuf), `tests/discographie.test.ts` (neuf),
`CLAUDE.md`, `PLAN.md`, `REPRISE.md`.

#### Écart de portée assumé

Les roasts d'EXERCICE (`gameData.ts`) ne sont pas retouchés : ils commentent la
façon de jouer, pas la production, et Yann les veut tous revus — c'est une passe
de contenu à part. La besace reste décorative. Et la réaction ne connaît pas le
cahier : elle parle du morceau, pas de la commande — suffisant pour l'exemple
demandé, à revoir si une réaction doit un jour citer une contrainte précise.

---

### ✅ Les rythmes de l'acte 1 sont ÉCRITS, pas tirés au sort (2026-08-27)

> « il n'est pas nécessaire de randomiser les exercices dans la mesure où
> chaque personne ne les ferait qu'une seule fois »
> « acte 1 : plus de rythme à refaire »

Deux demandes qui n'en font qu'une : **on ne dessine pas une courbe de
difficulté avec des tirages.** Un niveau généré ne sait pas ce qu'il vient
d'enseigner ; il tire une densité dans une fourchette, et deux passages du même
niveau n'apprennent pas la même chose. Comme un joueur ne fait un exercice
qu'une fois, tout ce que le hasard apportait était du bruit — et une famille de
bugs entière (« 0 variante sur 60 tirages » pour un préambule qui en annonce
une, corrigée la veille par un forçage) n'existait que parce que la cible était
tirée.

#### La grille écrite

`GrilleEcrite` (`presets/levels.ts`) : une subdivision par ligne, les trois
lignes en clair, les rafales en option. `startLevel` gagne une **première
branche**, avant le preset et avant la génération — la grille écrite prime sur
tout, et **aucun forçage ne lui est appliqué** : c'est elle la vérité. Ne
restent tirés que le tempo et le swing, dans les options du niveau.

```
niveau 61 « Tout ensemble »
  kick  1 0 0 1 1 0 0 0
  snare 0 0 1 0 0 0 2 0     2 = rim shot
  hat   1 1 1 1 1 1 1 2     2 = charley ouvert
  rafales du hat  1 1 1 1 1 3 1 1
```

#### La série — huit rythmes, une nouveauté chacun

L'acte 1 passe de cinq exercices à huit, et chaque niveau n'ajoute **qu'une
chose** à celui d'avant :

| # | niveau | ce qui est neuf |
|---|---|---|
| 1 | 2 · Le kick et la claire | le backbeat, deux lignes |
| 2 | 3 · Le trio | le charley, en croches |
| 3 | 7 · Le kick qui sort du temps | la syncope (huit cases) |
| — | *leçon de Sol* | elle FAIT le rim shot et la rafale à l'écran |
| 4 | 5 · Un rim shot | une variante de claire, la dernière |
| 5 | 59 · Un charley ouvert | une variante de charley, la dernière croche |
| 6 | 60 · Les deux à la fois | les deux, sur le kick syncopé |
| 7 | 8 · Une rafale | une rafale, le dernier charley |
| 8 | 61 · Tout ensemble | les quatre, dans une mesure — « c'est ta sonnerie » |

Les trois nouveaux (59, 60, 61) sont posés **en fin de tableau** : la carrière
et la salle de répétition citent les niveaux par leur `id`, en insérer au milieu
aurait déplacé tout le reste. Le niveau 1 n'est plus cité (« niveau 1 à
supprimer » — il ne faisait poser que des kicks), il reste dans le réservoir.

#### Ce qui le vérifie — et le défaut qu'on cherchait

`tests/grilles-ecrites.test.ts` (27 tests) confronte chaque grille à **son
propre préambule**, une promesse par test : « une seule des deux claires en
porte une, c'est la dernière » se lit maintenant sur les données. C'est la
famille de défauts la plus coûteuse du projet — l'écran promet ce que le code ne
tient pas — et c'est la seule que la grille écrite ne supprime pas toute seule.
Vérifié rouge par mutation (rafale du niveau 8 retirée → le test tombe).

S'y ajoutent la bonne formation (longueur = subdivision, valeurs dans 0/1/2, pas
de rafale sur une case éteinte), la **déclaration** (une variante dans la grille
exige `variant`, une rafale exige `rollMax` — sinon le niveau est impossible et
muet sur la raison), et deux tests de COURBE sur l'acte 1 : tous ses exercices
citent une grille écrite, et la série n'ajoute jamais deux nouveautés d'un coup.

Mesuré aussi dans l'appli, sur serveur de dev neuf : les huit grilles sont
posées **au bit près** telles qu'écrites (rafales comprises), et l'écran du
niveau 61 affiche bien `KICK 0/3 · SNARE 0/2 · HAT 0/8`.

⚠️ `tests/model.test.ts` comptait la campagne par `exercise === 'reproduire'` —
ce qui mesurait le réservoir en croyant mesurer la campagne dès que des
`reproduire` sont apparus hors des 34. Borné à `id <= 34`, et l'ordre des
identifiants est vérifié pour que les deux assertions parlent bien des mêmes
niveaux.

#### Un détail qui est le même défaut en petit

Le bouton « Nouveau rythme » redonne **exactement** la même grille sur un niveau
écrit. Il devient « Recommencer » dans ce cas : il fait ce qu'il dit (efface la
proposition, remet le compteur d'essais), et ne promet plus un tirage qui n'aura
pas lieu.

#### Fichiers touchés

`src/model/presets/levels.ts` (`GrilleEcrite`, niveaux 2/3/5/7/8 réécrits,
59/60/61 ajoutés), `src/stores/game.svelte.ts` (branche grille écrite dans
`startLevel`), `src/model/carriere.ts` (acte 1 à huit exercices),
`src/ui/game/GameView.svelte` (libellé du bouton),
`tests/grilles-ecrites.test.ts` (nouveau), `tests/model.test.ts`.

#### Ce qui reste de la liste de Yann

Acte 0 à refondre sur sa trame, acte 2 (réglages au lieu des quiz « lequel »,
commande en plusieurs étapes), roasts, besaces, « qui parle » et défilement du
texte. Les grilles écrites ne couvrent pour l'instant que l'acte 1 — les autres
actes citent encore des niveaux générés, et c'est le prolongement naturel.

---

### ✅ L'acte 4 en deux temps — une leçon de production qui se FAIT (2026-08-26)

> « bizarre les exercices pour la production. »
> « il faut pousser les exercices à faire en atelier. Par exemple pour le
> tunnel, il faut d'abord remplir le séquenceur avec un morceau techno. Puis
> ensuite régler les paramètres pour avoir un meilleur son. »
> « je suis ta préconisation pour l'arbitrage. »

Tranche 2. L'acte 4 avait une bonne scène d'ouverture — le petit haut-parleur
de la laverie, qui fait ENTENDRE « ton morceau est bon dans ton ordinateur, ici
il est mauvais » — et une commande qui ne vérifiait **aucun mixage** :
kick + snare + hat + une basse + une variante. Le joueur entendait le problème,
apprenait à nommer un filtre, puis livrait sans avoir jamais rien corrigé.

#### L'arbitrage : ce qui compte comme « mieux mixé »

Yann a délégué. Trois décisions, dans l'ordre où elles se posent :

**1. On mesure l'ÉTAT, pas l'audio rendu.** Rendre le morceau dans un
`OfflineAudioContext` à chaque frappe serait asynchrone et lent : le cahier
vivant — qui se coche pendant qu'on travaille, et qui est la moitié de
l'intérêt d'une commande — redeviendrait un verdict rendu au clic. Ce qu'on
perd en fidélité se récupère par le calibrage du seuil (point 2).

**2. Trois critères, pas dix — et chacun exige un GESTE.** C'est la contrainte
qui a le plus filtré les candidats : « pas trop de réverbe » seul est une case
cochée d'avance (la réverbe part à zéro), donc du théâtre. Il est devenu « de
l'espace, mais pas de la soupe », qui demande d'en mettre ET de s'arrêter.

**3. Chaque critère est une phrase de l'acte**, pas une règle de mixage
générique :

| Critère | La phrase | Le seuil |
|---|---|---|
| `kickQuiPorte` | le kick doit exister hors du grave | `tone >= 55` |
| `avoirEnleve` | « tu enlèves, ensuite seulement tu ajoutes » | une ligne ≤ 8 kHz |
| `deLEspaceSansSoupe` | la réverbe éloigne ; en trop, c'est de la bouillie | 0,10 ≤ envoi ≤ 0,40 |

⚠️ **Le seuil du premier n'est pas choisi à vue** : c'est `LAVERIE_DRIVES[1]`,
donc la mesure déjà au dossier — rendu du vrai graphe dans un
`OfflineAudioContext`, kick seul, RMS après le passe-haut du petit
haut-parleur rapporté au studio : **drive 0 → 13 %, drive 55 → ~35 %, drive
100 → 40 %**. On demande le palier que l'exercice de la laverie vient de faire
entendre. La moitié de l'énergie perdue, récupérée.

⚠️ **Le kick est EXCLU de `avoirEnleve`**, et ce n'est pas un détail : lui
couper les aigus retirerait exactement ce qui vient de lui permettre de
survivre au petit haut-parleur. Une contrainte qui l'accepterait enseignerait
le contraire de l'acte. Un test le tient.

#### La fiche techno, et ce que le calibrage a corrigé

Premier jet : kick sur les quatre temps, tempo 122-140, charley dense, une
rafale, une basse. **Le test de calibrage l'a refusé** — house, hardhouse et
amapiano passaient à 4/5. La fiche décrivait « n'importe quel morceau de club
en four-on-the-floor », pas la techno.

Les données ont tranché, et c'est un vrai discriminant musical : la techno a un
charley **en doubles-croches et entièrement fermé** ; house l'ouvre sur les
contretemps (subdiv 8), hardhouse et amapiano l'ouvrent sur [2,6,10,14]. D'où
deux critères neufs — `densiteAuMoins` avec un `subdivMini` (le DÉBIT autant
que le remplissage) et `sansOuverture`. Résultat : techno 6/6, le suivant 4/6.

⚠️ `sansOuverture` décrit le CARACTÈRE d'une ligne présente, pas une absence.
Une fiche ne doit pas exiger qu'un instrument manque (« pas de caisse
claire ») : ça punirait un morceau qui sonne juste avec une claire discrète.
Dire « ce charley ne s'ouvre jamais » est une autre chose — c'est ce qu'on
entend.

#### Le cahier en deux temps, à l'écran

`Contrainte.section` et des titres d'étape dans le panneau : « 1 · LE
MORCEAU », « 2 · LE MIXAGE — pour que ça tienne à la laverie ». Six lignes à
plat ne disent pas qu'il y a deux gestes différents à faire, ni dans quel
ordre.

⚠️ **Le contraste mesuré, pas jugé à l'œil.** Premier essai avec
`--xp-lcd-dim` : **1,5:1** contre le chrome du panneau — illisible. Ce token
est fait pour un segment sur fond d'afficheur NOIR. Passé en
`--xp-accent-amber` : **4,76:1**. Et ambre plutôt que vert parce que dans cette
grammaire le vert dit « allumé / fait », or un titre d'étape n'est pas un état.

#### Ce qui le vérifie

- `tests/mixage.test.ts` (+13, nouveau). Le test qui compte : **un morceau
  techno correct ne passe PAS le mixage** — sinon le second temps serait
  décoratif, c'est-à-dire le défaut qu'on corrige. Plus le calibrage : aucun
  des 34 presets n'arrive déjà mixé (ce sont des mixages de studio, sujet même
  de l'acte).
- `tests/commande.test.ts` : le test « aucune commande n'est un cul-de-sac » a
  attrapé la refonte du premier coup (son constructeur d'état partait toujours
  du preset dancehall). Il LIT désormais le cahier pour savoir quel genre
  produire.
- 287 tests, 0 erreur de types, les deux builds, parcours complet sur serveur
  neuf, Playwright 390×840 (sections relues dans le DOM, contraste mesuré).

#### Fichiers touchés

`src/model/styles.ts` (fiche techno, `densiteAuMoins`, `sansOuverture`,
`rafaleSur`), `src/model/commande.ts` (les trois contraintes de mixage,
`section`), `src/model/carriere.ts` (cahier du Tunnel en deux temps),
`src/ui/atelier/AtelierView.svelte`, `scripts/parcours-carriere.cjs`,
`tests/mixage.test.ts`, `tests/commande.test.ts`, `CLAUDE.md`, `REPRISE.md`.

#### Ce qui n'est PAS fait

Les verbes de paramètre 54-57 restent dans l'acte 4. Ils ne sont plus orphelins
— ils enseignent le filtre et la réverbe que la commande fait maintenant
utiliser — mais les déplacer vers la salle de répétition reste la tranche 3,
avec les `reproduire` de l'acte 5.

---

### ✅ Les fiches de style — l'acte 5 cesse d'être un menu déroulant (2026-08-26)

> « les reproductions de style, ça doit être fait en atelier, les presets
> doivent être verrouillés avant. »
> « il faut avoir une description du style éventuellement. »
> « on doit pouvoir accepter une certaine tolérance, par exemple, il faut que
> ce soit 80% de tel style pour pouvoir valider. »
> « il faut qu'il y ait du synthé dessus aussi. »

Première tranche de la révision des niveaux. Périmètre tenu : **la mécanique
complète sur UN genre**, dancehall, celui de la commande Zik'Mobile.

#### Le trou, mesuré avant d'écrire une ligne

Charger le preset `dancehall` depuis le menu Morceaux et livrer donnait
`produit=true`, `style:dancehall=true`, **accepté**. L'acte 5 ne demandait donc
aucune production. Ce n'était pas une faiblesse théorique : trois clics.

Deux autres défauts sont venus avec :

- **`dansLeStyle` ne disait rien.** Un rang dans `rankPresets` ne se traduit pas
  en geste : « pas assez dancehall » n'apprend rien à qui ne sait pas déjà.
- **Le synthé lui était invisible.** `rankPresets` ne compare que kick/snare/hat
  (les permutations passeraient de 6 à 120 avec cinq lignes). Une basse, moitié
  d'un riddim, ne comptait pas.

#### La fiche de style, et pourquoi c'est UNE donnée et pas trois

`src/model/styles.ts`. Une fiche porte un chapeau, des critères nommés et un
seuil — et sert **trois usages à la fois** : la description lue avant de
commencer, le juge de la livraison, le retour ligne par ligne pendant le
travail. C'est le point de conception : écrire la description à côté d'un juge
qui mesure autre chose, c'est deux vérités qui divergent au premier ajustement.

⚠️ **Le pourcentage demandé ne pouvait pas être celui de `rankPresets`.** Ce
score compte les cases identiques, cases vides comprises — 70 % peut vouloir
dire « deux grilles également vides ». La règle de `CLAUDE.md` reste vraie de ce
score-là ; ce qui change, c'est qu'on mesure autre chose : une part de CRITÈRES.
« 4 sur 5 » se dit au joueur, se coche à l'écran, et se corrige.

Trois décisions de conception, chacune payée par un défaut évité :

1. **Les critères se lisent en TEMPS, pas en cases.** `pasDuTemps(subdiv, temps)`
   — « sur chaque temps » vaut [0,1,2,3] en subdiv 4 et [0,4,8,12] en subdiv 16.
   Sans ça, chaque critère serait à écrire trois fois et le joueur serait puni
   d'avoir choisi une grille plus fine. Un test le tient.
2. **Le champ `essentiel`.** Un seuil à 80 % sur six critères accepterait un
   morceau qui rate précisément celui qui donne son nom au riddim. Le kick
   « steppers » et la basse sont exigés quel que soit le total — deux au plus
   par fiche, sinon le seuil ne veut plus rien dire. La basse est essentielle
   *parce que* Yann l'a demandée : facultative, la tolérance l'aurait sautée une
   fois sur deux.
3. **Le seuil est réglable PAR FICHE**, pas une constante globale : un genre très
   typé tolère moins d'écart qu'un genre large.

#### Le calibrage — ce qui rend la fiche défendable

Une fiche n'est pas juste parce qu'elle a l'air juste. Mesuré sur les 34
presets :

```
OUI  6/6 dancehall
     4/6 house, hardhouse, amapiano     ← les plus proches (four-on-the-floor)
     3/6 techno, motown, dembow, boombap…
     1/6 motif de départ de l'Atelier
```

Écart de **deux critères** au genre le plus proche, et le seuil (5/6) tombe dans
le trou. Même exigence que l'`ecartMini` de `parametres.ts` : une question dont
la réponse se joue à un critère près est un tirage au sort. `tests/styles.test.ts`
verrouille les trois : le genre satisfait sa fiche, les 33 autres échouent, et
l'écart au deuxième reste ≥ 2.

#### Le verrou des presets — provenance, pas ressemblance

C'est la nuance qui fait tout le correctif. Refuser une grille *identique* à
celle d'un preset punirait le joueur qui suit honnêtement la fiche : « kick sur
chaque temps, rim shot sur 2 et 4, charley ouvert sur les contretemps » mène tout
droit à cette grille-là — c'est précisément ce qu'on lui demande.

On refuse donc une PROVENANCE. `pattern.presetCharge` retient l'empreinte du
moment du chargement ; à la première modification elle ne correspond plus. Un
morceau tapé à la main n'a aucune empreinte enregistrée et passe, même s'il tombe
juste. Le menu Morceaux est en plus désactivé pendant une commande (le cas du
preset chargé AVANT d'ouvrir la commande est couvert par la contrainte, pas par
le menu).

La provenance est de l'état d'INTERFACE : hors format v2, non sérialisée,
invisible au moteur — et elle voyage donc par `ContexteLivraison`, une seconde
paramètre optionnel de `verifie`. Un `PatternStateV2` ne dit pas d'où il vient.

#### `dansLeStyle` retiré plutôt que gardé en réserve

Il n'avait plus d'utilisateur. Deux juges de style qui doivent rester d'accord
finissent toujours par ne plus l'être — même raison que le comparateur unique de
`comparerGrilles`. Ses tests partent avec (la mesure qu'ils portaient — « quatre
cases de charleston inversées laissent le preset au rang 1 ou 2 » — reste
consignée ici).

#### ⚠️ Le piège qui a coûté le plus de temps : le HMR, pas le code

Après une modification, `scripts/parcours-carriere.cjs` a affiché « modules : — »
sur les huit actes, avec un avertissement « COMMANDE dans un Atelier
VERROUILLÉ » — le portrait exact d'une régression du déverrouillage qu'on venait
de livrer. Diagnostic mesuré : `moduleUnlocked('atelier', {acte: 8})` répondait
`true`, mais le contexte du store `unlocks` portait `acte: 0` et **pas de champ
`plancher` du tout**. Le HMR de Vite avait ré-exécuté les modules modifiés : le
script parlait à une seconde instance de `game`, le store à la première.
Redémarrage du serveur → parcours parfait. **Toujours redémarrer `npm run dev`
avant de conclure quoi que ce soit d'un script de parcours ou d'une capture.**
Consigné dans `CLAUDE.md`.

#### Ce qui le vérifie

- `tests/styles.test.ts` (+13, nouveau) — calibrage, tolérance, `essentiel`,
  indépendance à la subdivision, verrou de provenance, lisibilité de la fiche.
- 274 tests, 0 erreur de types, les deux builds.
- `scripts/parcours-carriere.cjs` sur serveur neuf : les huit actes s'enchaînent,
  Zik'Mobile acceptée avec la nouvelle fiche, épilogue atteint, modules ouverts
  un par un, aucune erreur console.
- Playwright 390×840 : le panneau de commande (chapeau + 3 lignes de cahier + 6
  critères qui se cochent) et le menu Morceaux verrouillé — libellés relus dans
  le DOM, `tousDesactives: true`.

#### Fichiers touchés

`src/model/styles.ts` (nouveau), `src/model/commande.ts` (`ContexteLivraison`,
`details`, `dansLeStyleFiche`, `pasUnPresetCharge`, `empreinteEtat` ;
`dansLeStyle`/`RANG_STYLE_MAX` retirés), `src/model/carriere.ts` (cahier
Zik'Mobile, `chapeau`), `src/stores/pattern.svelte.ts` (provenance),
`src/stores/game.svelte.ts` (`livrerCommande` prend un contexte),
`src/ui/atelier/AtelierView.svelte`, `src/ui/atelier/ToolBar.svelte`,
`scripts/parcours-carriere.cjs`, `tests/styles.test.ts`, `tests/commande.test.ts`,
`CLAUDE.md`, `REPRISE.md`.

#### Ce qui n'est PAS fait — les tranches suivantes

- **Une seule fiche existe** (dancehall). Les autres genres commandés viendront
  avec leur fiche ; le modèle est écrit et le calibrage est un test générique qui
  s'appliquera à chacune.
- **Les niveaux 4/12/13/27/32 restent des `reproduire`** dans l'acte 5. Les
  sortir vers la salle de répétition et les remplacer par des commandes était la
  suite annoncée — non faite ici pour garder la tranche jugeable.
- **L'acte 4 (Le Tunnel en deux temps) n'est pas commencé.** C'est la tranche 2 :
  remplir le séquenceur en techno, puis régler pour que ça tienne à la laverie.
  Elle demande de décider ce qui compte comme « mieux mixé », un jugement musical
  à arbitrer avant de coder.

---

### 🗺️ Cartographie — étendre le Mode jeu au synthé (2026-08-23, avant tout code)

`CLAUDE.md` impose de cartographier tous les points de contact avant d'étendre
un type central. Fait, et le résultat change le plan : **le comptage
d'occurrences sous-estime le coût d'un côté et le surestime de l'autre.**

`GameDrumRowName` / `GAME_DRUM_ROWS` : **46 occurrences, 5 fichiers** —
`stores/game.svelte.ts` (23), `ui/game/GameView.svelte` (8),
`model/exercises.ts` (7), `model/presets/levels.ts` (6),
`model/parametres.ts` (2).

#### Ce qui est déjà là, et gratuit

- **Générer une mélodie cible** : `randomizeMelodyMotif` et
  `randomizePitchedLine` (`engine/generators.ts`) existent, prennent un `rng`
  injecté, et sont testées (`tests/melody-motif.test.ts`). C'est la partie qu'on
  croyait chère.
- **La faire sonner** : `buildGraph` sait déjà rendre une ligne de synthé, en
  direct comme hors ligne. Rien à écrire.
- **L'harmonie** : `engine/harmony.ts` (gamme, degrés, accords, `justesseForStep`).
- **La saisie de notes** : `ui/sequencer/NotePad.svelte`, déjà écrit pour l'Atelier.

#### Ce qui est un renommage mécanique

L'union `GameDrumRowName | SynthRowName` et les `Record<…>` qui la suivent.
Ennuyeux, sans risque.

#### Le vrai coût — trois choses que le renommage ne touche pas

1. **La case porte une HAUTEUR.** `DrumStep = 0 | 1 | 2` contre
   `SynthStep = SynthNote | number | null`. `comparerGrilles` compare par `===` :
   ça marche pour un **degré numérique**, pas pour un objet `SynthNote`. Et
   `cycleCell` (0→1→2→0) n'a aucun sens sur une note — il faut une seconde
   interaction de grille dans `GameView`, avec le pad de saisie.
2. **Une ligne de synthé n'a pas la même FORME.** `DrumRowState.subdiv` contre
   `SynthRowState.cycleBars` + `subdivisions` ; `buildState` écrit dans
   `state.rows[…]` et devrait savoir écrire dans `state.synthRows[…]`. Cinq
   états du store (`target`, `guess`, `locked`, `shift`, `zoneACompleter`)
   supposent une forme unique.
3. ⚠️ **Les formes nommées à la main — le coût caché.** `LevelDensity` s'appelle
   `kickMin`/`kickMax`/`snareMin`/… , `rowsActive` est `{ kick, snare, hat }`,
   `SubdivSpec` pareil. Ce ne sont **pas** des `Record<Name, …>` : ajouter une
   ligne s'y fait champ par champ, dans la génération comme dans les 41 niveaux
   déjà écrits. C'est ce qu'un `grep` sur le nom du type ne montre pas.

#### Ce que ça implique pour l'acte 3, « La mélodie »

Le raccourci existe et il est réel : **les trois verbes de PARAMÈTRE ne
touchent aucun des trois points ci-dessus** — ils ne comparent pas de grille.
Ouvrir `parametres.ts` au synthé demande trois choses : `id` accepte aussi une
clé de `SynthVoice`, `lignes` accepte `SynthRowName`, et `buildState('param')`
branche sur `state.synthRows`. Petit, et ça se teste sans écran.

Mais un acte « La mélodie » qui n'enseignerait que des boutons de filtre
n'enseignerait pas la mélodie. D'où la proposition, **en deux temps** :

1. **Les verbes de paramètre sur le synthé** — la moitié bon marché, et elle
   ouvre le Synthé pour une raison honnête : on a entendu ce que ses boutons
   font.
2. **`reproduire` sur une ligne de BASSE monophonique**, dont les cases sont des
   **degrés numériques** — ce qui laisse `comparerGrilles` intact (le point 1
   disparaît), n'ajoute qu'une seule ligne (le point 2 se réduit à un
   aiguillage), et évite la polyphonie de la nappe. La mélodie proprement dite
   viendra après, sur le même chemin.

#### ⚠️ La contrainte d'ordre, à ne pas oublier

`acteOuvert` exige que l'acte précédent soit franchi. **L'acte 5 « Les styles »
est le moins cher à écrire — et il est inatteignable tant que les actes 3 et 4
n'existent pas.** Écrire 5 avant 3 produirait du contenu que personne ne peut
ouvrir. Trois sorties possibles, à trancher : écrire 3 puis 4 dans l'ordre ;
autoriser à SAUTER un acte non écrit (le récit reste lisible, son module reste
fermé) ; ou déplacer l'acte 5 plus tôt, ce que le récit interdit — c'est là que
les 34 presets servent, « après avoir appris à mixer, avant d'avoir à faire
quelque chose de personnel ».

### ✅ Le tampon de sortie suit la sortie — le Bluetooth cesse de crachoter (2026-08-26)

> « ça marche assez mal avec le bluetooth » — puis, à la question du symptôme :
> **ça crachote pendant la lecture**, sur Android / Chrome.

#### Ce qui n'allait pas, et pourquoi c'était SI facile à défendre

`TAMPON_SORTIE = 'interactive'` était le bon choix, pour la bonne raison :
l'appli est un instrument, un pad qui répond en 72 ms au lieu de 32 ne se joue
pas (arbitrage du 2026-08-21, `AudioEngine.ts`). Ce raisonnement défend un
budget — doigt → son — et il suppose que ce budget est **encore disputable**.

En Bluetooth il ne l'est plus. Un casque A2DP joue ce qu'on lui envoie 100 à
200 ms plus tard, dans son propre tampon, hors de portée du navigateur. Les
40 ms que le petit tampon fait gagner sont 40 ms sur 250 : personne ne les
entend. Ce que le petit tampon **coûte**, en revanche, s'entend très bien — le
fil audio doit remplir un bloc court à chaque réveil d'une route lente et
irrégulière, et chaque dépassement est un bloc manqué. C'est le crachotement.

La règle qui en sort n'est pas un compromis, c'est une constatation :
**quand la sortie est déjà lente, le petit tampon n'achète plus rien et
continue de tout coûter.**

#### Ce qui a été livré

- **`src/engine/tampon.ts`** (neuf, pur — ni DOM, ni Svelte, ni `localStorage`) :
  le seuil (`SEUIL_SORTIE_LENTE = 0,1 s`), la lecture de `outputLatency`, et la
  décision `tamponPourSortie(preference, lente)`. Le seuil est posé **entre les
  deux mondes** : 32 ms en `'interactive'` et 72 ms en `'playback'` sur une
  sortie filaire (mesures du 2026-08-21) restent tous deux dessous — une sortie
  filaire ne bascule donc jamais, et ne se mettra jamais à basculer toute seule.
  Un casque A2DP commence, lui, vers 100-150 ms.
- **`AudioEngine.adapterTampon()`** : appelé au ▶, **à l'arrêt uniquement**.
  Changer de tampon veut dire fermer le contexte et le rouvrir : à chaud, ce
  serait faire un trou dans le morceau pour supprimer un crachotement.
- **`noterSortie()` dans `tick()`** : `outputLatency` vaut souvent 0 juste après
  la création du contexte — le flux n'est pas encore ouvert. Une lecture unique,
  au pire moment, raterait la bascule ; on relit à chaque tick (une comparaison
  de nombre), et ce qu'on observe s'applique au ▶ suivant. La lenteur vue ne se
  rétracte pas sur un zéro passager, sinon la bascule dépendrait de l'instant de
  lecture.
- **Un réglage manuel** — `ui/sortie.svelte.ts` (persisté, propriété de
  l'APPAREIL comme le calibrage d'entrée) et une entrée de menu Affichage :
  « 🎧 Sortie audio : Auto / Confort (Bluetooth) / Réactif (filaire) ».
  **Il existe parce que la détection automatique dépend d'un aveu volontaire :**
  WebKit ne déclare pas `outputLatency` du tout, et rien n'oblige un Android à
  y faire figurer le retard de sa route. Quelqu'un qui ENTEND crachoter en sait
  alors plus que le navigateur — sans interrupteur, sa seule sortie serait de ne
  pas se servir de l'appli. Le manuel gagne donc toujours sur l'observation.
- **Le contexte des sons système s'endort** (`ui/xp/systemSounds.ts`). Un
  `AudioContext` « running » sans rien de branché tient un **flux de sortie
  ouvert** : sur une route A2DP, deux flux vers le même appareil, ce sont deux
  réveils à servir au lieu d'un — et le bloc manqué s'entend dans le morceau,
  pas dans le chirp. Suspendu 1,5 s après sa dernière note, réveillé au son
  suivant. `chime` est passé en `async` et **attend** la reprise : sur une
  horloge gelée, les instants calculés seraient déjà passés, l'attaque serait
  sautée et un son de fenêtre claquerait.

#### Le piège trouvé en relisant les appelants

`startLiveRecording` branche son tap sur `graph.finalGain` **avant** d'appeler
`start()`. Sans garde, la bascule aurait remplacé le graphe sous le
magnétophone, qui aurait enregistré un contexte fermé : **un WAV silencieux,
sans la moindre erreur**. `liveRecorder` fait donc partie de la garde de
`adapterTampon`, au même titre que `isPlaying`.

#### Vérifié, et comment

`tests/tampon.test.ts` (10 tests) tient les deux moitiés de la règle : la
sortie normale ne bascule jamais (sinon on perdrait l'arbitrage du 2026-08-21
pour tout le monde), et le réglage manuel gagne dans les **deux** sens.

Et surtout **mesuré au navigateur** (Chromium, `outputLatency` feint à 200 ms
via un getter de prototype, moteur piloté depuis la page) — c'est `baseLatency`
qui dit si la bascule a vraiment eu lieu :

| Scénario | Contextes créés | `baseLatency` | Notes programmées |
|---|---|---|---|
| Sortie normale | `interactive`, `interactive` | 0,0100 s (441 éch.) | 14 / 14 |
| Sortie lente déclarée 200 ms | `interactive` → **`playback`**, `playback` | **0,0232 s (1024 éch.)** | 14 / 14 |
| Sortie lente + « Réactif » | `interactive`, `interactive` | 0,0100 s | 14 / 14 |
| Sortie normale + « Confort » | `playback`, `playback` | 0,0232 s | 14 / 14 |

Le tampon **plus que double** là où il faut, nulle part ailleurs, et le nombre
de notes programmées est identique dans les quatre cas — la bascule ne mange
aucune note et ne lève aucune erreur. Le surcoût est **une** création de
contexte supplémentaire, une fois par session, à la première lecture.

Menu vérifié à la capture en 390×844 (libellé, bascule, persistance sous
`boite-a-rythme:tampon-sortie`). `npm run check` 0 erreur, 274 tests, les deux
builds.

#### Ce que ça ne règle pas, et qu'il ne faut pas promettre

Les 100 à 200 ms de retard du casque lui-même. Aucune ligne de code n'y touche
— ce qui se corrige, c'est le PLACEMENT de ce qu'on écrit (le calibrage,
`ui/latence.svelte.ts`), et maintenant la propreté de ce qu'on entend. Pas la
vitesse.

### Chantiers ouverts

*Tenu à jour : ce qui est fait sort de cette liste, avec le numéro de l'étape
qui l'a fermé.*

- ~~Le tactile en Mode Live~~ — **clos à l'étape 13** : 28 → 0.
- 🔜 **Mode jeu, la suite — trois chantiers, dans cet ordre.** L'étape 17 a posé
  la charpente et un pilote de chaque verbe ; ce qui reste est du contenu et de
  l'intégration, pas de l'architecture.
  1. **Intégrer les trois verbes à la campagne** — *le prochain pas naturel, les
     pilotes étant validés.* Les pilotes 35-38 sont hors courbe. Deux verdicts d'essai de Yann (2026-08-20) à respecter :
     **« compléter » est plus facile que « reproduire »** — donc AVANT, comme
     échauffement, pas après ; et **« l'intrus » exige un rythme un peu complexe**
     pour que la variante d'un pas ne s'entende pas immédiatement. Reste à
     décider si la campagne s'allonge ou si des niveaux existants changent de
     verbe, et lequel des deux sens de « jouer » (à l'oreille / à vue) entre en
     premier. **Arbitrage de Yann**, pas une décision technique.
  2. **La grille de déverrouillage** — proposition écrite et retenue par Yann :
     rafale au niv. 11, swing 14, ghost 20, fill 21, décalage 23. À appliquer.
  3. **L'extension au synthé.** La plus grosse. ⚠️ `GameDrumRowName` touche le
     store, la génération, les presets, le moteur et la vue : **cartographier tous
     les points de contact avant de coder** (règle `CLAUDE.md`) — la surface réelle
     dépasse presque toujours l'estimation.
- 🔜 **B6 — la mise en page du splash et du Mode jeu** (contenu collé en haut,
  ~70 % de vide, constat 6 de l'audit du 2026-08-15). À traiter dans la même
  passe que le point 1 ci-dessus : c'est le même écran.
- **Le biseau en haute densité** — 1px logique = 2 ou 3 physiques. Toujours pas
  vérifié sur un vrai appareil ; toutes les mesures de cette session sont des
  mesures Playwright à `devicePixelRatio` 1 à 3.
- **Les sons système** — `ui/xp/systemSounds.ts` synthétise des sons XP. Ils ne
  collent plus à la direction, mais `AtelierView` (son d'erreur) et `ToolBar`
  (réglage dans le menu Affichage) s'en servent encore : les retirer sans les
  remplacer enlève un retour à l'utilisateur. C'est une décision, pas un détail.
- 🔜 **Le Mode Live est à reprendre — APRÈS le Mode jeu.** Demandé par Yann le
  2026-08-19, avec cet ordre explicite. Le périmètre n'est pas défini : c'est à
  lui de le donner. Ce qui est connu et qui pèsera dans la reprise :

  - **beaucoup a bougé en une session, sans passe d'ensemble.** Les icônes de
    coin ont disparu (étape 13), les barres du haut et de séquence sont montées
    à 44px et les pads sont descendus de 94 à 81px, le verrou et le brassage
    total ont été retirés au profit d'un dé par chose (étape 16), et le
    visualiseur « BARRES » est passé d'un faux spectre à une vraie mesure
    (étape 11). Chaque changement a été vérifié seul ; **l'écran entier ne l'a
    pas été**.
  - **l'overlay ⚙ est devenu la seule surface de réglage** et il s'allonge :
    six boutons, le pad, l'inclinaison, le visualiseur, la banque, les
    snapshots. C'est là que se posera la question de l'organisation.
  - **le panneau du visualiseur est bien plus haut que ce que le spectre
    remplit** — l'analyseur y dessine dans le bas du cadre. Jamais retouché
    depuis que le contenu a changé de nature.
  - **rien n'a été essayé sur un vrai téléphone en paysage**, qui est pourtant
    le seul contexte d'usage de ce mode.

- **La densité face à la maquette** — la maquette tient cinq lignes de batterie
  plus le bandeau d'état en 430px là où l'appli en prend 844. L'écart vient
  **entièrement** des pastilles « Séquence / Timbre / Filtre & espace » sous
  chaque ligne, que la maquette n'a pas. C'est de l'organisation de
  fonctionnalités, donc l'arbitrage de Yann.

**Fermés depuis :** le visualiseur (étape 11 — le panneau « Barres » du Live
affichait un faux spectre construit sur un classement supposé du registre de
chaque son ; c'est une mesure maintenant, et l'analyseur sert aussi l'Atelier).

⚠️ **Bug corrigé dans les maquettes :** `.slider` n'était stylé que sous
`.tempo`, donc **toutes les glissières des écrans Synthé, Production et Live
étaient invisibles** depuis leur création. Règle rendue générique dans
`base.py` ; le moodboard a été republié avec les images corrigées.

---

## Fichiers critiques pour l'implémentation

- `original/boite-a-rythme-69.html` — source unique de vérité pendant toute la migration (notamment l. 3630–4073 voix, 4197+ scheduler, 4583+ export, 6338+ sérialisation)
- `src/model/types.ts` — le format v2 typé, fondation de tout (stores, moteur, sérialisation, undo)
- `src/engine/AudioEngine.ts` — instance possédant contexte + graphe, clé de l'unification live/offline/jeu
- `src/engine/scheduler.ts` — le scheduler unique, cœur du feel et du déterminisme
- `src/stores/pattern.svelte.ts` — le store central qui remplace les ~60 globales et la sync DOM
