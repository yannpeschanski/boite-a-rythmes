# Journal — la migration et la peau Winamp

> Archive détachée de `PLAN.md` le 2026-09-01, **sans une ligne
> réécrite ni réordonnée**. Le journal vivant est resté dans `PLAN.md`.

Les livraisons depuis le verrou des modules (16 août) jusqu'aux quatre pilotes
du Mode jeu et aux trois verbes de paramètre (21 août) : le pad d'écriture, les
fills de clap, l'audit du synthé, les 24 étapes de la bascule vers la peau
Winamp 2.x, la latence mesurée, et la proposition d'architecture du Mode jeu qui
attendait un arbitrage.

---

## ✅ Verrou dur des modules + accès `#boss` — 2026-08-16

> « je suis plutôt pour le verrou dur / je propose également que tu crées un
> url pour que je puisse accéder directement à tout, par exemple
> https://boite-a-rythmes.vercel.app/#boss »

**Livré.** Premier morceau réel du chantier D2 : la colonne vertébrale du
déblocage. Le `#boss` ne pouvait pas être livré seul — c'est le contournement
d'une serrure qui n'existait pas encore.

### Périmètre volontairement réduit aux MODULES

Verrouillés : **Atelier, Synthé, Production, Mode Live**. Le déblocage
contrôle par contrôle (rafale au 11, swing au 14…) proposé dans le 3ᵉ lot
**n'est pas fait** : cette grille-là n'a pas encore été validée, et la câbler
sur une trentaine de contrôles avant validation, c'est du travail à refaire.
Les seuils posés ici sont ceux qui étaient **déjà décidés**.

| Module | Seuil | D'où il vient |
|---|---|---|
| Atelier | 2 | réussir le niveau 1 — arbitrage D2 de Yann |
| Synthé | 13 | **verbatim de l'original** |
| Production | 27 | **verbatim de l'original** |
| Mode Live | 34 | dernier niveau — arbitrage D2 (l'original n'avait pas ce mode) |

### Trois pièges rencontrés, dont deux invisibles à la relecture

**1. Le seuil de l'Atelier ne pouvait pas être 1.** `PlayerProgress.level` est
le niveau ATTEINT, et un joueur tout neuf démarre déjà à `{ level: 1 }` ; c'est
réussir le niveau N qui écrit `N + 1`. Un seuil à 1 aurait donc ouvert
l'Atelier à tout le monde dès la première visite — un verrou qui ne verrouille
rien, et qui aurait eu l'air de marcher. (L'original portait bien `drum: 1`,
mais chez lui ça voulait dire « jamais verrouillé », cohérent avec son
`return true`.) Le seuil est à **2**, et un test tombe si quelqu'un remet 1.

**2. Un seuil au-dessus de `LEVELS.length` casserait « master » en silence.**
Le pseudo de test renvoie `level = LEVELS.length` (34), et l'original comptait
là-dessus pour n'avoir « aucun cas particulier à gérer » sur les modules.
Mettre `live: 35` (« campagne finie ») aurait donc rendu le Mode Live
inaccessible **au contournement lui-même**, et à quiconque a tout terminé.
D'où `live: 34`, plus une assertion au chargement du module ET un test.

**3. Le pseudo n'était jamais mémorisé — et ça rendait le verrou absurde.**
Trouvé **en testant**, pas en relisant : `pseudo = $state('')`, redemandé à
chaque visite. Or la progression est rangée PAR pseudo. Donc au moindre
rechargement, `playerProgress` retombait à `{ level: 1 }` et **l'Atelier se
reverrouillait pour quelqu'un qui l'avait ouvert vingt niveaux plus tôt.**
Le défaut existait avant (il fallait déjà retaper son nom à l'identique pour
retrouver ses étoiles), mais il était sans conséquence tant que rien ne
dépendait de la progression. Corrigé : `boite-a-rythme:pseudo` persiste le
dernier pseudo.
- **Conséquence à assumer** : le formulaire de pseudo ne réapparaît plus à
  chaque visite — or c'est lui qui servait, de fait, à changer de joueur. Le
  `👤 pseudo` de l'en-tête du jeu est donc devenu cliquable (`clearPseudo()`),
  souligné en pointillés plutôt que transformé en troisième bouton. La
  progression et les besaces ne sont pas touchées : elles reviennent en
  retapant le nom.

### `#boss` — les détails qui comptent

- `#boss` ouvre tout, **`#boss=off`** revient à la vue d'un vrai visiteur.
  Sans issue, un contournement permanent empêcherait de jamais revoir ce que
  voit quelqu'un d'autre — c'est-à-dire de tester le verrou qu'on vient
  d'écrire.
- **Mémorisé** (`boite-a-rythme:boss`) : une visite suffit, pas besoin de
  remettre le hash à chaque fois.
- **Écouteur `hashchange`** : taper `#boss` dans la barre d'adresse d'une page
  DÉJÀ ouverte ne la recharge pas. Sans ça la bascule n'aurait pris effet
  qu'au rechargement suivant, et aurait eu l'air cassée. Trouvé en testant
  `#boss=off`. Couper l'accès depuis un module désormais verrouillé renvoie à
  l'accueil plutôt que d'y laisser l'utilisateur.
- Un bandeau discret sur l'accueil rappelle qu'on est en accès total —
  sinon on teste sans le savoir une appli qui n'est pas celle des autres.
- Le pseudo **« master »** reste valable et n'est pas remplacé : il sert
  toujours dans le jeu. `#boss` existe parce que le pseudo se saisit *dans le
  Mode jeu*, or c'est précisément le chemin qu'un verrou dur sur l'Atelier
  coupe.

### Un lien de partage continue de fonctionner

`#r=…` ouvre l'Atelier **même verrouillé**, pour cette session et sans rien
débloquer d'autre. Sinon un lien envoyé à quelqu'un qui n'a jamais joué serait
tombé sur un écran de verrou : le partage, déjà livré, aurait cessé de
marcher du jour au lendemain. Le lien EST l'intention d'ouvrir l'Atelier.

### « Dur » porte sur l'accès, pas sur la visibilité

Les entrées verrouillées restent **affichées**, éteintes, avec 🔒 et le niveau
qui les ouvre. C'est ce que faisait l'original (un overlay de verrouillage, pas
un module escamoté) : une entrée qui disparaît se lit comme une panne, une
entrée cadenassée se lit comme une suite. Si Yann veut l'invisibilité totale,
c'est un `{#if}` à ajouter, pas une reprise.

### Vérifications

- `npm run check` 0 erreur · **21 tests** (7 nouveaux) · les deux builds.
- **Tests validés par régressions simulées**, comme pour le scheduler : remettre
  `atelier: 1` fait tomber le test du verrou initial ; passer `live` à 35 fait
  échouer le chargement du module avec le message attendu. Un test vert sur un
  verrou qu'on vient d'écrire ne prouve rien tant qu'on ne l'a pas vu rougir.
- **Parcours réels vérifiés au navigateur** (390×844) : visiteur neuf (Atelier
  et Live cadenassés, clic sans effet) ; `#boss` (tout ouvert) ; `#boss=off` à
  chaud sans rechargement ; éjection vers l'accueil quand l'accès est coupé
  depuis l'Atelier ; joueur « yann » niveau 14 **après rechargement** (Atelier
  et Synthé ouverts, Production et Live fermés) ; lien de partage reçu par
  quelqu'un qui n'a jamais joué (Atelier ouvert, Synthé et Production fermés).

### Reste à faire sur D2

- La **grille contrôle par contrôle** du 3ᵉ lot, à valider avant câblage.
- Le **2ᵉ type d'exercice** (l'accord de fond de D2), pas commencé.
- Une **explication dans le Mode jeu** de ce que le prochain palier va ouvrir :
  aujourd'hui le verrou dit « niveau 13 » sans dire ce qu'on y gagne.

---

## Correctif — « master » ne doit pas être mémorisé (2026-08-16)

Signalé par Yann (« le boss mode est toujours activé j'ai l'impression »),
puis « c'est compris, j'avais mal lu » : le cas qu'il voyait était bien
`#boss` persisté, annoncé par sa bannière. **Mais la reproduction a mis au
jour un vrai défaut, introduit la veille en persistant le pseudo.**

`playerProgress` renvoie le niveau MAXIMUM pour le pseudo « master ». Tant
que le pseudo n'était pas mémorisé, c'était un contournement de session.
Depuis qu'il l'est, taper « master » une fois débloquait tout **à chaque
visite ensuite**, avec deux aggravations :
- **rien à l'écran ne l'expliquait** (la bannière ne couvrait que `#boss`) ;
- **`#boss=off` n'y pouvait rien**, puisque ça ne passe pas par `#boss`.

Autrement dit, le seul moyen d'en sortir était de vider le stockage local.
Vérifié en reproduisant : pseudo `master` mémorisé → Atelier ouvert, aucune
bannière, aucune sortie.

**Correctif :** « master » n'est plus jamais écrit dans
`boite-a-rythme:pseudo`, et une valeur héritée est **effacée au chargement**
— sans ce nettoyage, quiconque avait tapé « master » avant le correctif
resterait bloqué en accès total.

**Et l'accès total devient visible partout** : `unlocks.totalAccess` dit
*pourquoi* c'est ouvert (`#boss` ou pseudo master) et comment en sortir ; la
bannière d'accueil le reprend, et un marqueur `🔓 accès total` apparaît dans
la barre d'outils de l'Atelier. Il n'existe QUE pendant un contournement :
zéro pixel pour un visiteur normal, donc rien à échanger au titre de la
règle n°1 du §7.5. Il est là parce que l'accueil n'est pas l'endroit où le
doute survient — on est dans l'Atelier quand on se demande si ce qu'on voit
est ce que voient les autres. À retirer sans regret si c'est de trop.

**Vérifié** (390×844, six parcours) : visiteur neuf verrouillé · `#boss`
ouvert avec sa bannière · `master`/`Master` hérités **nettoyés
automatiquement**, Atelier de nouveau verrouillé · joueur normal niveau 14
ouvert par sa vraie progression, sans marqueur · « master » tapé en session
marche mais **ne survit pas au rechargement** · marqueur présent en `#boss`,
absent pour un joueur normal.

---

## ✅ Tempo à l'unité + densité des mélodies (R1a) — 2026-08-17

Deux premiers items de la file exécutable du plan consolidé.

### Tempo réglable à l'unité

Le curseur de l'Atelier était déclaré `step={10}`, et `XpSlider` arrondit
**aussi la valeur tapée au clavier** (`XpSlider.svelte:72`) : taper « 123 »
donnait 120, le réglage à l'unité était littéralement impossible. Passé à
`step={1}`.

L'impression d'incohérence de Yann (« on le règle un peu partout ») venait
de là plus que du nombre d'endroits : il n'y en a que deux (bandeau de
l'Atelier, Mode Live) plus le Tap — mais le Mode Live faisait **déjà** ±1 BPM
(`LiveView.svelte:420`). Le même réglage n'obéissait pas aux mêmes règles
selon l'écran. Vérifié au navigateur : saisie « 123 » → 123, ↑ → 124,
Page↑ → 134 (le geste « par dizaines » ne se perd pas).

### Densité de la mélodie : facteur 0.6

La mélodie recevait `fillRate` **plein pot** là où la basse reçoit
`fillRate * 0.75`, au moment précis où c'est elle qui a la subdivision la
plus fine. Elle finissait la ligne la plus dense dans **21 presets sur 34**.

**Correction d'un chiffre déjà écrit ici** : les analyses précédentes
disaient « 31 presets sur 34 ». C'était un comptage fait à l'œil sur un
tableau ; le script dit **21**. Corrigé aux deux endroits du document.
L'argument tient toujours (la mélodie reste la plus dense en moyenne), mais
le chiffre était faux et il avait déjà été répété.

Facteur choisi **par mesure sur les 34 presets**, pas au jugé :

| facteur | mélodie | pire cas | ligne la plus dense |
|---|---|---|---|
| 1.00 (avant) | 1,86 note/mes. | 7,0 | 21/34 |
| **0.60** | **1,12** | **4,5** | **10/34** |
| 0.50 | 0,99 | 4,5 | 8/34 |

0.6 est le point où la mélodie repasse **sous la basse** (1,12 < 1,15),
c'est-à-dire où elle cesse d'être la ligne la plus chargée. Descendre à 0.5
ne gagne plus rien sur les pires cas et creuse l'écart sans raison — le plus
petit changement qui règle le problème.

### Le filet qui a manqué de sortir en silence

Avec le facteur seul, **`clave23` se chargeait avec une mélodie entièrement
vide**. Une ligne vide n'a pas l'air aérée, elle a l'air cassée. Un plafond
au lieu d'un facteur ne réglait rien (mesuré : le vide réapparaît dès 0,40) —
parce que ce n'est pas une question de courbe mais **un accident de graine** :
chaque pas étant un tirage indépendant, une ligne à 8 pas peut sortir vide.

D'où un filet dans `randomizePitchedLine` : si la ligne ressort entièrement
vide, une note est posée **sur le premier pas**, à la **fondamentale de
l'accord actif** — l'endroit et la note qui ne peuvent pas sonner faux. Et
**aucun tirage supplémentaire** (`degrees[0]`, pas `randomChordToneDegree`),
donc le flux du générateur n'est pas décalé.

### Ce que ça change, et ce que ça ne change pas

- Les **34 presets** sonnent avec une mélodie plus aérée. C'est le but.
- Les **morceaux sauvegardés ne bougent pas** : la sérialisation stocke les
  notes, pas la graine.
- Le **déterminisme est intact** : à graine égale le rendu reste
  reproductible. C'est le résultat qui change, pas sa stabilité — un test le
  vérifie sur les 34 presets.

### Vérifications

`npm run check` 0 erreur · **24 tests** (3 nouveaux, `tests/generators.test.ts`)
· les deux builds. **Tests validés par régressions simulées** : retirer le
filet fait tomber le test des lignes vides ; remettre la mélodie à plein pot
fait tomber celui de la densité.

Piège TypeScript à connaître : `pattern.every(v => v == null)` fait inférer
un prédicat de type et réduit le tableau à `null[]`, ce qui interdit d'y
écrire ensuite. `!pattern.some(v => v != null)` ne narrow pas.

### Reste de R1

**R1(b)** — la mélodie par motif court répété — n'est pas fait. C'est le vrai
correctif musical : aujourd'hui chaque pas reste un tirage indépendant, donc
une texture plus aérée, mais toujours pas une phrase.

---

## ✅ B8 — les cases synthé vides n'ont plus l'air désactivées (2026-08-17)

Dernier constat visuel de l'audit qui restait sur les lignes synthé : « une
ligne vide = des rectangles gris avec un « · » centré, qui ont l'air
désactivés à côté des cases batterie franchement colorées ».

**Vérifié avant de coder** (deux constats de l'audit s'étaient déjà révélés
périmés) : celui-ci est réel, mais **pas pour la raison écrite**. La teinte
des cases vides n'était pas absente — le port l'avait bien faite, avec la
MÊME recette que la batterie (10 % / 26-28 %, bordure à 45 %). Deux autres
causes, trouvées en comparant les deux grilles au pixel :

1. **Le « · ».** C'est un signe : il dit « il y a quelque chose ici, en tout
   petit ». Le vide, lui, se lit très bien tout seul — c'est exactement ce
   que font les cases de batterie éteintes, qui ne portent rien. Supprimé.
2. **La même recette ne donne pas le même résultat selon la teinte.** À
   10 %, l'orange du kick reste franc ; l'indigo, le violet et le rose des
   lignes synthé virent au lavande pâle. Une formule identique produisait donc
   une grille prête d'un côté et éteinte de l'autre. Relevé à **18 % / 40 %,
   bordure 60 %** sur les trois lignes synthé — on égalise **ce qu'on voit**,
   pas ce qu'on écrit.

**Ce que ça ne change pas** : aucune hauteur, aucun élément ajouté ou retiré
de l'écran (un glyphe en moins, deux pourcentages changés). Aucun coût.

**Reste ouvert sur ces cases**, et qui relève du chantier « choix des notes »
(N1) plutôt que de B8 : les deux boutons d'octave ▲▼ n'apparaissent que sous
les cases actives, ce qui donne une seconde rangée en dents de scie.

---

## ✅ Pad d'écriture des notes dans l'Atelier (R6 + N1) — 2026-08-17

> « pouvoir ouvrir un pad depuis l'atelier pour jouer/enregistrer une mélodie
> qui s'inscrit dans la grille » — et, au-dessus, « simplifier grandement le
> choix des notes ».

`src/ui/sequencer/NotePad.svelte`, ouvert par un 🎹 dans l'en-tête des lignes
**Basse** et **Mélodie**.

### Ce que ça remplace (§7.5, règle n°1)

Le choix d'une note se faisait en **tapant plusieurs fois sur la case** :
`cycleCell` fait défiler silence → 1 → 2 … → 7 → silence. Mesuré : poser un
degré 5 coûtait **5 appuis**, corriger un 6 en 3 en coûtait **5 de plus** (il
faut retraverser le silence), une mélodie de 4 notes ≈ **15 appuis**. Avec le
pad, **une note = un appui**. Le défilement par la case reste là pour les
retouches ponctuelles — on n'enlève rien, on ajoute le chemin direct.

**Coût écran : zéro tant qu'il est fermé.** C'est un panneau, pas une barre —
la condition posée en acceptant que le pad vive dans l'Atelier plutôt que
dans le Mode Live (surface déjà saturée).

### Deux comportements, aucun bouton de mode

- **À l'arrêt** : écriture pas-à-pas, le curseur avance tout seul et l'en-tête
  affiche « pas 3 / 8 ». C'est ce qui répond à « simplifier le choix des
  notes ».
- **En lecture** : enregistrement en direct, chaque appui écrit sur le pas le
  plus proche.

La situation dit déjà lequel s'applique ; un troisième bouton à comprendre
n'apporterait rien. C'est aussi ce que fait n'importe quelle boîte à rythmes.

### Sept touches, pas un piano

Le modèle d'état n'est pas fait de notes fixes mais de **degrés de gamme 1-7**
(+ octave). Un clavier de piano obligerait à traduire dans les deux sens et
laisserait poser des notes hors gamme, que le reste de l'appli s'interdit.
Sept touches, c'est exactement le modèle — et sur un téléphone, sept cibles de
48px valent mieux que douze étroites dont cinq noires.

Les degrés qui appartiennent à **l'accord en cours sur le pas visé** sont
teintés : la même information que le point de justesse des cases, mais donnée
**avant** de poser la note plutôt qu'après. Une aide, pas une contrainte — les
autres degrés restent jouables.

### La quantification, et le défaut qu'elle évite

Un doigt tombe toujours un peu après le temps. Écrire sur le pas **en cours**
rangerait une note jouée juste avant le pas suivant sur le précédent, et tout
ce qu'on enregistre sonnerait **en retard d'un pas** — un défaut qui ne se
voit pas, qui s'entend. On arrondit donc au pas le plus proche.

Ça demandait de savoir non pas quel pas joue, mais **depuis combien de temps**.
`AtelierView` horodate désormais l'arrivée de chaque pas synthé
(`performance.now()` au moment où le moteur relâche l'événement, donc calé sur
l'horloge AUDIO comme l'aiguille de l'anneau). Volontairement **pas** un
`$state` : personne n'a besoin de réagir à cette valeur, elle n'est lue qu'au
moment d'un appui — en faire un état réactif déclencherait un rendu à chaque
pas de chaque ligne.

La règle elle-même est sortie du composant dans **`engine/quantize.ts`**, pur
et testé : c'est le genre de décalage d'un pas qui reste invisible tant que
personne n'a enregistré une vraie mélodie.

### Moteur

Une méthode ajoutée, `AudioEngine.playDegreePreview(name, degree, octave)` :
`previewSynth` ne savait jouer que le degré 1, et `playLiveMelodyNote` ne sert
que la Mélodie et veut une fréquence déjà calculée. Elle reste le seul endroit
qui connaît le registre de chaque ligne — les −24 demi-tons de la basse sont
les **mêmes** que ceux du scheduler, pour que le pad sonne comme la grille
jouera.

### Vérifications

`npm run check` 0 erreur · **31 tests** (7 nouveaux) · les deux builds.

- **Tests de quantification validés par régressions simulées** : écrire
  toujours sur le pas en cours fait tomber 3 tests ; passer l'inégalité de
  stricte à large en fait tomber 1 (celui de la frontière exacte).
- **Parcours réels au navigateur** (390×844). À l'arrêt : 5, 3, 7, silence →
  motif `5 3 7 ·`, curseur qui avance et se replie, octave +1 appliquée.
  En lecture (200 BPM, 8 pas) : quatre notes jouées, **écart maximum 1 pas**
  entre la tête de lecture et le pas écrit — c'est l'arrondi au plus proche,
  pas une dérive.

### Reste ouvert

- La **Nappe n'a pas de pad** : elle pose des accords, pas des degrés — un pad
  à 7 touches n'y voudrait rien dire. À traiter séparément si le besoin vient.
- Les opérations **sur la ligne entière** (transposer, dupliquer la première
  moitié, décaler, inverser) — le raccourci proposé pour éviter la
  multi-sélection tactile — ne sont pas faites.
- Le nit d'octave des cases (les ▲▼ en dents de scie sous les cases actives)
  reste ouvert ; le pad le contourne sans le supprimer.

---

## ✅ Fill de clap (R4) — 2026-08-17

> « Pour les claps : il faudrait proposer un fill de clap »

Le clap traversait les mesures de fill sans rien faire : la zone de fill était
réservée à la snare (`fillZone = name === 'snare' && …`).

### Le piège, et comment il est évité

Un fill fait sonner des pas aujourd'hui silencieux, donc **des tirages
aléatoires en plus** — et un tirage de plus, même inaudible, décale tout ce
qui suit. C'est l'interdit de `CLAUDE.md`, et les anciens exports MP3
cesseraient d'être reproductibles.

Solution retenue : un **second générateur**, `fillRng`, réservé aux frappes
ajoutées. Le flux principal consomme exactement ce qu'il consommait avant.

Deux choix qui font que ça tient :

1. **Le fill de clap AJOUTE, il ne remplace pas.** Celui de la snare détourne
   le chemin normal et fait sonner tous les pas de la zone. Ici on laisse le
   chemin normal se dérouler intact et on ne garnit **que les pas vides** —
   d'où l'absence totale de contact avec le flux principal. C'est aussi le
   bon choix musical : un clap qui double la fin de mesure, pas un clap qui
   écrase ce qu'on a programmé.
2. **`fillRng` est OBLIGATOIRE dans le contexte**, pas optionnel avec repli
   sur `rng` : un repli réintroduirait silencieusement le décalage qu'on
   cherche à éviter. Le compilateur a d'ailleurs trouvé les trois appelants
   tout seul (AudioEngine, render-offline, le test).

À l'export, le second flux est dérivé de la **même graine** (`seed ^
0x9e3779b9`) : reproductible à l'octet près, mais décorrélé du premier —
sinon les deux avanceraient de concert et le clap suivrait la vélocité des
autres lignes. En direct, c'est `Math.random` des deux côtés, rien n'y est
reproductible de toute façon.

### Le critère annoncé est tenu

« `tests/scheduler.test.ts` reste vert **sans être mis à jour** — s'il faut le
modifier, c'est que la solution est ratée. » L'instantané de référence **n'a
pas bougé** : le fixture du test a `fillEvery: 0`, aucun fill ne s'y déclenche,
et surtout le flux principal est intact.

Deux tests ajoutés (33 au total) :
- un fill de clap garnit bien la fin de la mesure de fill ;
- **le fill ne consomme rien sur le flux principal** — prouvé en faisant
  varier UNIQUEMENT la graine du second flux : toutes les autres lignes
  doivent rester rigoureusement identiques, seuls les claps bougent. Avec son
  jumeau (deux graines différentes donnent des claps différents), sans quoi le
  test serait vide de sens.

**Validés par régressions simulées** : faire puiser le fill dans `rng` fait
tomber le test de non-interférence ; retirer le fill en fait tomber deux.

### Un fixture qui ne prouvait rien, corrigé

Premier jet des tests : ils échouaient. Cause trouvée — `busyState` donne 4
pas au clap, la zone de fill se réduit donc au **dernier pas seul**, qui porte
déjà une note ; le fill ne garnissant que les pas vides, il ne se déclenchait
jamais. C'était le fixture qui était faux, pas la règle. Les tests ont
désormais leur propre état (clap à 8 pas, deux derniers libres).

---

## ✅ Pad — reprise en main (2026-08-17)

> « le pad : difficile à prendre en main, on peut mieux faire »

Retour volontairement vague, donc diagnostic avant redesign. Quatre points de
friction **mesurés dans l'appli**, pas devinés — trois d'entre eux étaient
invisibles à la relecture du code parce qu'ils tiennent à ce qu'on VOIT, pas à
ce que le composant fait.

### 1. On écrivait à l'aveugle — c'était le problème principal

Constaté en listant les classes des huit cases de la Mélodie, pad ouvert :
elles étaient **rigoureusement identiques**. Rien, dans la grille, n'indiquait
où la prochaine note allait tomber. Le seul repère était un « pas 3 / 8 » en
petit gris dans l'en-tête du pad — il fallait donc compter les cases pour le
traduire.

Cause structurelle : le curseur vivait **dans** le pad, la grille ne pouvait
pas le connaître. Il est remonté dans `SynthRowView` et partagé
(`bind:cursor`) ; la case visée porte désormais un contour net.

Trait **plein et sombre**, pas la teinte ambre de la tête de lecture : les
deux ne s'affichent jamais en même temps (le curseur ne sert qu'à l'arrêt),
mais s'ils se ressemblaient on confondrait « là où ça joue » et « là où
j'écris ».

### 2. On ne pouvait pas viser un pas

Pour écrire sur le pas 5 en partant du pas 1, il fallait **quatre appuis sur
« ← »** — et « ← » est désactivé pendant la lecture. Désormais, pad ouvert et
lecture à l'arrêt, **un appui sur une case y amène le curseur**.

C'est un changement de comportement de la case, assumé : tant que le pad est
ouvert, la grille sert à viser ; refermé, elle refait défiler les notes comme
avant. Ce qui rend le mode acceptable, c'est qu'il est **visible** — le pad
est ouvert à l'écran et la case visée est entourée.

### 3. Les touches étaient des chiffres abstraits

`1 2 3 4 5 6 7`. Un degré de gamme ne dit rien à qui ne pense pas en degrés —
or l'appli **connaît** la tonalité et le mode, et savait déjà nommer les notes
(`noteNameForScaleDegree`, qui sert aux libellés d'accords). Les touches
affichent maintenant **Do Ré Mi Fa Sol La Si**, avec le degré en petit
dessous : c'est lui qui figure dans la case de la grille, les deux doivent
pouvoir se raccorder. Les noms suivent la tonalité choisie.

### 4. Le pad s'ouvrait hors écran

Mesuré à 390×900 : le pad de la Mélodie s'ouvrait **sous la ligne de
flottaison**. On appuyait sur 🎹 et il ne se passait rien de visible. Il
défile maintenant dans la vue à l'ouverture.

Piège rencontré : `queueMicrotask` ne suffit pas. Svelte 5 groupe ses mises à
jour du DOM, le microtask s'exécute **avant** que le panneau existe et on
faisait défiler vers un élément absent — le pad restait coupé de 30px, et ça
ne se voyait qu'en mesurant. `await tick()` règle le cas.

### Deux mesures qui ont corrigé mes propres réglages

- **Débordement à 320px** : les sept touches sortaient de 14px. Les pistes de
  grille ont un minimum `auto`, donc elles refusent de descendre sous la
  largeur de leur contenu — `minmax(0, 1fr)`, le même piège que celui corrigé
  sur `XpSlider` (audit A2), côté grille plutôt que flexbox.
- **Seuil de resserrement à 400px et non 360** : à 360 pile, « Sol »
  débordait encore de 3px. Vérifié ensuite sur **320 / 360 / 390 / 430 /
  768** — aucun débordement, hauteur de cible tenue à 48px partout.

### Vérifications

`npm run check` 0 erreur · 33 tests · les deux builds. Parcours au navigateur :
case visée entourée dès l'ouverture · un appui sur la 5ᵉ case donne « pas
5 / 8 » · une touche écrit le degré et la visée avance · touches lues
« Do Ré Mi Fa Sol La Si ».

### Ce que je n'ai pas touché, et pourquoi

Le **double comportement** (pas-à-pas à l'arrêt, direct en lecture) est
conservé : les quatre défauts ci-dessus expliquent la difficulté sans qu'il
soit en cause, et avec le curseur visible il devient lisible. À rouvrir si la
gêne persiste — c'est le prochain suspect.

---

## ✅ Audit design de l'onglet Synthé — 2026-08-17

> « il faut faire un audit design du synthé ! il y a trop d'espace entre le
> haut et la partie Séquenceurs. / tempo : est-ce nécessaire de le régler
> ici ? / tonalité, nb de notes, ça peut descendre dans une partie plus bas /
> sous sections des lignes de synthé : il faut que ça rentre dans une seule
> ligne »

### Le constat, chiffré

L'onglet Rythme avait été ramené à **32 %** de chrome sur le premier écran
(audit A1). **L'onglet Synthé n'avait jamais été mesuré : il était à 66 %.**
561px avant la première case jouable à 390×844, soit deux tiers de l'écran
d'un téléphone consommés avant de pouvoir poser une note.

Trois blocs se partageaient ces 561px, et aucun n'avait à être là :

| Bloc | Hauteur | Sort |
|---|---|---|
| Bandeau tempo | 66px | retiré de cet onglet |
| Tonalité / Mode / Nb d'accords | 82px | descendu sous les lignes |
| Taux de remplissage + 🎲 global | 64px | descendu sous les lignes |

### Tempo : non, il n'a rien à faire ici

Il tombait juste sous la barre sticky **par accident de mise en page** : il
est placé sous le séquenceur batterie, et sur Synthé il n'y a pas de
séquenceur batterie au-dessus de lui. Réservé à l'onglet Rythme — on pose un
tempo avec le rythme, on n'y revient pas en écrivant une mélodie. Il reste
réglable là-bas, et dans le Mode Live.

### Harmonie et remplissage : descendus, pas déplacés dans une ligne

Ils restent **globaux** — `chordsFor` gouverne les trois lignes à la fois. Les
mettre *dans* une ligne mentirait sur leur portée. Ils passent donc **sous**
le séquenceur, exactement comme le tempo au 2ᵉ lot.

### Pastilles sur une seule ligne

Mesuré avant : **324px nécessaires pour 322 disponibles** sur Basse et
Mélodie — il manquait **deux pixels** — et **484px** sur la Nappe, qui en
portait six.

- Remplissage horizontal resserré (10px → 7px), hauteur de cible inchangée à
  28px (audit A3).
- Libellés raccourcis : « Oscillateur » → **Timbre** (le nom qu'utilisent
  déjà les lignes de batterie pour le même panneau), « Filtre & espace » →
  **Filtre**, « Arpégiateur » → **Arpège**. Les titres des panneaux gardent
  leur nom complet.
- Ça suffisait pour Basse et Mélodie (229px), **pas pour la Nappe** (352px
  pour 322). D'où une fusion : **Arpège et Bourdon deviennent une pastille
  « Jeu »** — les deux répondent à la même question, comment la Nappe joue
  l'accord, égrené ou tenu. Le panneau les sépare par deux sous-titres au
  lieu de deux replis. Nappe : **268px, une ligne**.

### Résultat mesuré

| | Avant | Après |
|---|---|---|
| Avant la 1re case jouable (390px) | **561px — 66 %** du 1er écran | **323px — 38 %** |
| Hauteur de page | 1 312px (1,55 écran) | **1 134px (1,34)** |
| Pastilles par ligne | 2 lignes partout | **1 ligne**, de 320 à 768px |

Vérifié sur **320 / 360 / 390 / 768**. À 320px il a fallu un cran de
resserrement supplémentaire pour que la Nappe tienne encore sur une ligne.

Les débordements de **+2px** relevés sur `.xp-slider` / `.two-col` sont
**antérieurs** à cette passe (artefact sous-pixel du `input[type=range]`, déjà
présent dans les relevés précédents) — ni introduits, ni corrigés ici.

### Reste ouvert

Le **🎲 par ligne** flotte toujours à droite de l'en-tête de ligne ; Yann
l'avait demandé « dans la sous-section séquence ». Pas fait dans cette passe,
qui portait sur la hauteur du haut de page.

> ⛔ **Périmé — 2026-08-19.** Yann a abandonné cette demande, jugée obsolète.
> Le 🎲 reste dans « Harmonie & remplissage ».

---

## ✅ Pad : délai d'attaque et suppression · bloc du bas rangé — 2026-08-17

### « un petit délai entre la touche et la note qui se joue »

**Cause trouvée, et ce n'était pas l'audio.** Les touches du pad écoutaient
`onclick`. Sur mobile, un `click` ne part qu'au **relâchement** du doigt : la
note attendait qu'on lève la main. Le délai ressenti n'était pas une latence
de moteur, c'était la durée de l'appui.

L'écart était propre au pad : les cases de batterie écoutaient déjà
`onpointerdown` (`DrumRowView.svelte:109`). Aligné. `preventDefault` empêche
le click fantôme qui suivrait et rejouerait la note.

*Ce que ce n'était pas*, vérifié avant de conclure : l'aperçu est programmé à
`currentTime + 0.02` et les attaques des voix vont de 5 à 80ms — de quoi
expliquer quelques millisecondes, pas un délai perceptible.

### « difficile de supprimer une note »

Le silence était un petit bouton relégué en bas à droite, à côté de « ← ».
Effacer est pourtant un geste aussi fréquent que poser. Il devient une
**huitième touche**, au même format que les sept degrés, dans la même rangée :
`∅ vide`. Supprimer coûte maintenant deux gestes — viser la case, appuyer sur
∅ — tous deux sur des cibles de 48px.

Vérifié de 320 à 768px : huit touches, aucun débordement, hauteur de cible
maintenue à 48px.

### « il faudrait aussi que ce soit mieux rangé sous le synthé »

En descendant l'harmonie et le remplissage sous les lignes (passe
précédente), je les avais laissés **nus** : deux rangées de contrôles
flottant entre le séquenceur et le cadre « Sidechain », sans titre, alors que
tout ce qui les entoure en a un. Ils sont désormais dans un
`<fieldset>` **« Harmonie & remplissage »**, comme Sidechain et Groove — le
bas de l'onglet redevient une suite de blocs nommés plutôt qu'un ruban.

### ⚠️ Le vrai désordre restant : la ligne à 128 pas

Visible sur la capture de Yann : une Mélodie réglée sur 128 notes affiche
**seize boutons de paquets sur trois rangées** (1-8, 9-16, … 121-128) avant
même la grille. C'est de loin le plus gros bloc de l'onglet, et ce n'est pas
traité ici. Ça relève de la question ci-dessous.

---

## ⚠️ « du fait du clavier, on peut se poser la question du design des lignes de synthé »

Question ouverte par Yann, à trancher — pas de code écrit dessus.

Le pad change la donne : il est désormais le chemin direct pour écrire une
note (un appui contre jusqu'à sept), et il rend visible ce que la grille
faisait porter à la case. Trois éléments de la ligne deviennent discutables :

1. **Le défilement au clic sur la case** (`cycleCell`). Sa seule qualité
   était d'être le SEUL moyen de poser une note. Il reste utile pour une
   retouche d'un cran, mais ce n'est plus le chemin principal. Pad ouvert, il
   est d'ailleurs déjà remplacé par « viser ce pas ».
2. **Les deux boutons d'octave ▲▼ sous chaque case active.** Ils créent une
   seconde rangée en dents de scie (ils n'existent que sous les cases
   pleines), et le pad a déjà un réglage d'octave. Candidats sérieux à la
   suppression.
3. **Les seize boutons de paquets** d'une ligne longue. Le pad, lui, se
   déplace pas à pas sans pagination — il n'a pas besoin de voir les 128
   cases pour en remplir une.

**Ce que je propose de trancher**, dans l'ordre de gain :
- retirer les ▲▼ des cases (l'octave vit dans le pad) ;
- remplacer la pagination par paquets par un défilement horizontal de la
  grille, ou par un affichage compressé quand la ligne dépasse ~32 pas ;
- garder le défilement au clic, mais comme geste secondaire assumé.

Rien de tout ça n'est fait : ce sont des choix de conception, et le premier
retire une capacité (régler l'octave case par case) qu'il faut accepter de
perdre.

---

## ✅ Design des lignes de synthé, après le pad — 2026-08-17

> « oui, tu peux lâcher » (les boutons d'octave par case)

Arbitrage rendu, les trois nettoyages proposés sont faits.

### Les ▲▼ d'octave quittent les cases

Deux boutons apparaissaient sous **chaque case pleine**, donc une seconde
rangée en dents de scie qui n'existait qu'à moitié. L'octave se règle
désormais au pad, et `shiftOctave` (plus aucun appelant) est supprimé, avec
ses styles.

**Retirer le contrôle ne devait pas retirer l'information.** Sans rien, une
note à l'octave supérieure serait devenue indistinguable d'une note normale —
et plus rien nulle part ne l'aurait dit. Les cases portent donc une marque
discrète **▴ / ▾** quand l'octave n'est pas neutre.

### Les seize boutons de paquets disparaissent

Une ligne à 128 pas affichait **seize boutons « 1-8 · 9-16 … 121-128 » sur
trois rangées**, pour ne montrer que huit cases à la fois. Remplacés par un
**défilement horizontal** de la grille complète, au-delà de 16 pas.

**Et ça rend les repères de temps, que la pagination interdisait.** Un paquet
commençait à une fraction quelconque de la mesure : les traits auraient été
déphasés, donc faux, et ils étaient désactivés dès qu'une ligne dépassait huit
pas (audit A5 : « mieux vaut aucun repère qu'un repère qui ment »). Une grille
complète garde la mesure entière sous les yeux.

⚠️ **Piège rencontré, qui aurait rendu ma propre affirmation fausse.** Les
repères sont dessinés par un `::after` en `position: absolute` : il se cale
sur la zone **visible** d'un élément qui défile. Posé tel quel, les traits
seraient restés **fixes pendant que les cases glissent dessous** — exactement
le repère menteur qu'A5 refusait. D'où un conteneur de défilement séparé de la
grille, celle-ci prenant la largeur de son contenu (`max-content`) pour que
ses repères couvrent le cycle entier et défilent avec lui. Vérifié sur le
`::after`, pas sur l'élément.

### Le défilement au clic reste

Geste secondaire assumé : il sert à retoucher d'un cran sans ouvrir le pad.
Pad ouvert, il est déjà remplacé par « viser ce pas ».

### Résultat mesuré (390px)

| | Avant | Après |
|---|---|---|
| Ligne Mélodie à 128 pas | 221px | **101px** (−54 %) |
| Ligne Basse, notes actives | 127px | **97px** (−24 %) |
| Page de l'onglet Synthé | 1 314px | **1 164px** |
| Boutons de paquets | 16 sur 3 rangées | **0** |
| Boutons ▲▼ | 2 par case pleine | **0** |

Repères de temps actifs sur une ligne à 128 pas : **oui** (ils ne l'étaient
plus au-delà de 8). Pastilles toujours sur une ligne de 320 à 768px.

### Reste ouvert

Le **🎲 par ligne** flotte encore à droite de l'en-tête, au lieu d'être dans
la sous-section Séquence comme demandé au 3ᵉ lot.

> ⛔ **Périmé — 2026-08-19.** Demande abandonnée par Yann.

---

---

## Audit design × DAW comparables — 2026-08-17

> « il me semblait avoir demandé un audit sur le design pour voir les autres
> types de daw. je souhaite remettre en cause le design XP »

**Rapport visuel complet :** <https://claude.ai/code/artifact/397c1f0b-c76e-4af5-bdc9-36831375ef3c>
(mesures, planche contact des trois langues visuelles, cinq familles du marché,
trois directions chiffrées). Ce qui suit en est le résumé exécutable.

### Pourquoi il n'avait pas été fait

Yann avait raison de le chercher : la demande est bien dans ce document, au
point **N4 — « Audit des DAW comparables »** (2026-08-16), avec sa question
d'origine citée. Mais N4 **recadre** l'audit avant de l'exécuter : puisque
`CLAUDE.md` pose que le design XP est l'identité du projet et pas un héritage
à moderniser, la partie *visuelle* a été retirée du périmètre (« ce qu'on peut
emprunter, ce sont les INTERACTIONS ») et le reste classé « chantier neuf à
cadrer ». L'audit n'a donc jamais tourné.

⚠️ **La demande du 2026-08-17 lève cette contrainte.** Si la direction B ou C
ci-dessous est retenue, `CLAUDE.md` doit être réécrit : en l'état il interdit
exactement ce qui vient d'être demandé.

### La mesure retourne la question (390×844, lu dans le DOM rendu)

⚠️ **Chiffre corrigé le jour même.** La première version de cette section
annonçait « 31 à 34 % de pastilles ». **Faux d'un facteur trois** : j'avais
sommé la hauteur de *chaque* pastille alors que trois d'entre elles partagent
une même ligne. L'emprise verticale réelle est de 11 % (Rythme) et 7 %
(Synthé). Le piège est exactement celui que ce document nomme déjà — « ne
jamais conclure sans mesurer » — sauf qu'ici la mesure elle-même était mal
posée. Comptabilité complète refaite ci-dessous, poste par poste.

**Onglet Rythme, page = 1 253px :**

| Poste | Hauteur | Part |
|---|---|---|
| Barre de menus | 64px | 5 % |
| Transport + astuce + onglets | 142px | 11 % |
| **Barres de titre XP** (2) | **64px** | **5 %** |
| **Cases du séquenceur** (5 rangs) | **170px** | **14 %** |
| **Pastilles** (5 bandes) | **140px** | **11 %** |
| En-têtes de ligne (5) | 140px | 11 % |
| Bandeau tempo + panneau du bas | 353px | 28 % |

**Anatomie d'une ligne de batterie — 99px :** `row-head` 28px (nom + 🔊) ·
`cells` **34px** · `group-bar` 28px (les 3 pastilles) · 9px de marges.

**Le look XP coûte 5 % de la page (10 % sur Production, qui empile cinq
fenêtres). Chaque ligne fait 99px et n'en consacre que 34 à la musique.**
Jeter XP ne rendrait donc pas l'écran plus utilisable ; le poste de dépense
est que chaque ligne dépense deux fois plus de hauteur à se présenter qu'à se
laisser jouer.

Corollaire pour §7.5 : le constat A1 (« 64 % de chrome ») est **éteint**, le
travail a été fait. Il est remplacé par un constat neuf, **A1′ — 65px de tour
de taille par ligne, pour 34px de cases**.

### Les cinq familles du marché (ce qu'on en prend)

1. **Grille sombre à LED** (Ableton Note, drumbit, SEQ-16, Shuffle Drummer,
   orDrumbox, BandLab) — le consensus, devenu indifférencié. *On prend le
   contraste allumé/éteint, pas le look.*
2. **Panneau sérigraphié** (TE EP-133 K.O. II, Pocket Operator, Novation
   Circuit, Polyend Play) — « futurisme cassette × brutalisme », étiquettes au
   pochoir à même la surface, aucun panneau à ouvrir. *L'antidote direct aux
   34 %.*
3. **Anti-tableur tactile** (Auxy) — conçu contre le « spreadsheet
   music-making ». *Petit clavier de référence à côté de la grille,
   appui-glissé pour poser puis ajuster — terrain du pad déjà livré.*
4. **Rack de pads** (Koala Sampler / SP-404) — la surface de jeu est
   permanente, les réglages sont des surcouches temporaires. *Aujourd'hui
   c'est l'inverse ici.*
5. **Rétro assumé** (là où le projet est déjà) — le revival Y2K est un courant
   actif en 2026. Conseil récurrent : *évoquer l'époque, pas rejouer son
   ergonomie cassée*.

### Quatre charges contre XP qui tiennent

1. **Le contraste est à l'envers.** Fond beige + ciel Bliss clair, case vide en
   dégradé pâle. Déjà remonté comme bug (B8), corrigé une fois, sur un terrain
   qui le reproduira.
2. **La barre de titre promet ce que le téléphone ne tient pas.** `×` est un
   gag, `_`/`□` sont un interrupteur en deux boutons : 3 cibles de 24px par
   fenêtre, **15 sur l'onglet Production**, pour un repli.
3. **La nostalgie ne pointe pas vers la musique.** 808/909 dans le moteur, un
   OS à l'écran. XP habille le contenant ; la nostalgie du contenu serait
   TR-808 / SP-404 / Pocket Operator. Seule charge que la mesure ne tranche pas.
4. **L'identité n'est déjà pas appliquée** — voir ci-dessous.

Trois charges **tombent** : « le chrome mange l'écran » (mesuré 3-10 %),
« c'est daté » (2026 : c'est de la différenciation face à huit concurrents
sombres identiques), « ça coûte trop cher » (à moitié : les reliefs tiennent en
3 tokens et `data-theme="noir"` existe déjà — ce qui coûte, ce sont les **225
couleurs en dur dans 18 `.svelte`**, dette indépendante de la direction choisie).

### Le vrai résultat : l'appli parle déjà trois langues

- **Atelier** — Luna beige + Bliss + fenêtres à barre de titre.
- **Mode jeu** — même grammaire XP, palette `noir` (`GameView.svelte:98`).
- **Mode Live** — bleu nuit, étiquettes monospace en capitales posées à même la
  surface, LED de couleur, faders ambre. **Aucune trace de Luna** — et c'est
  déjà, livré et en ligne, la direction « panneau sérigraphié » de la famille 2.

La question n'est donc pas « faut-il quitter XP ? » mais **« laquelle des trois
langues déjà présentes gagne ? »**.

## 🏁 DÉCISION — Winamp 2.x pour tous les modes (2026-08-18)

> « on va partir sur winamp 2.x pour tous les modes »

Planche des six écrans + plan d'implémentation :
<https://claude.ai/code/artifact/65d53f3f-00b0-4baa-8327-3eeed181b72e>
Maquettes : `maquettes/atelier/build_modes.py` -> `winamp-modes.html`.

**L'audit de design est clos.** `CLAUDE.md` a été réécrit : la règle qui posait
le design XP comme identité intouchable est remplacée par la règle Winamp 2.x.

### Le gain principal n'est pas esthétique

L'audit avait relevé dès le premier jour que l'appli parlait **trois langues
visuelles** — Atelier en Luna beige, Mode jeu en `data-theme="noir"`, Mode Live
avec ses propres tokens `--amp-*`. C'était le 4e reproche, et le seul non chiffré.

| | |
|---|---|
| Langues visuelles | **3 → 1** |
| Thèmes à maintenir | **−1** (`data-theme="noir"` n'a plus de raison d'être) |
| Tokens propres au Live | **−12** (`--amp-*` fusionnent) |

Les deux écrans les plus éloignés de l'Atelier étaient **déjà sombres**, chacun
dans son coin : une langue sombre unique ne leur demande aucun sacrifice, elle
leur retire une exception.

### Ce que la déclinaison sur les six écrans a appris

- **Accueil** : le fond Bliss disparaît, la fenêtre flotte sur du noir pur. C'est
  littéralement l'écran d'accueil de Winamp, rien à inventer.
- **Production** : c'est là que la langue gagne le plus contre Luna. Trois
  bandeaux indigo sombres s'empilent bien mieux que trois bandeaux bleu vif —
  **l'écran le plus chargé devient le plus calme des six**.
- **Mode jeu** : rejoint la langue commune sans rien perdre ; carte de
  progression et bandeau d'essais deviennent des afficheurs.
- **Mode Live (paysage)** : le vrai test. Pads biseautés, afficheurs verts,
  faders ambre — tout était déjà du vocabulaire Winamp. Le pad XY et sa bille
  verte n'ont pas eu besoin d'être retouchés.

### Plan d'implémentation, dans l'ordre

1. ✅ **La fonte — FAIT le 2026-08-18.** Voir ci-dessous.
   ~~chasse fixe auto-hébergée (fontsource)~~
2. ✅ **Les tokens — FAIT le 2026-08-18.** Voir ci-dessous.
3. ✅ **Les composants de base — FAIT le 2026-08-18.** Voir ci-dessous.
4. **Les 225 couleurs en dur** (18 `.svelte`) en tokens, fichier par fichier.
5. **Fusion des thèmes** : retirer `data-theme="noir"` et les `--amp-*` du Live.
   C'est ce qui transforme le choix esthétique en simplification réelle.
6. **Les cibles tactiles**, en dernier, une fois le dessin stabilisé.

### ✅ Étape 1 — fonte auto-hébergée (2026-08-18)

**Fichiers :** `src/styles/fonts.css` (nouveau), `src/styles/global.css`,
`src/ui/xp/tokens.css`, `package.json`.

**Découverte en ouvrant le chantier :** `--xp-mono: 'JetBrains Mono', monospace`
était déclaré dans `tokens.css` et utilisé à **11 endroits** (`DrumRowView`,
`SynthRowView`, `NotePad`, `GameView` ×2, `RhythmAnalyser` ×3, `SynthModule`,
`ToolBar`, `.beat-ruler`)… mais **la fonte n'a jamais été installée**. Elle
retombait silencieusement sur le monospace générique du navigateur depuis le
début du projet. L'étape 1 corrige donc un bug dormant en plus d'installer la
fonte.

**Choix : `@fontsource/jetbrains-mono`, sous-ensemble latin, graisses 400 et 700.**
JetBrains Mono était déjà le nom déclaré dans le projet ; c'est aussi la chasse
fixe la mieux dessinée pour les petites tailles (grande hauteur d'x, contreformes
ouvertes), ce dont la direction Winamp a besoin — elle lit à 8,5-9 px.

⚠️ **`@font-face` écrits à la main plutôt que d'importer la CSS de fontsource.**
Celle-ci référence aussi un `.woff` de repli, inutile pour les navigateurs visés
(Web Audio, Svelte 5) — et surtout **le build monofichier inline les binaires en
base64**, donc chaque octet inutile y compte double. Vite résout les chemins de
paquet dans `url()`, donc pas besoin de copier les binaires dans le dépôt.

**Coût mesuré** (c'est le poste que le plan annonçait comme le seul à alourdir
le fichier livré) :

| | avant | après | écart |
|---|---|---|---|
| `dist/` (assets) | 532 676 o | 575 566 o | **+42 890 o (+8,1 %)** |
| monofichier | 534 975 o | 592 756 o | **+57 781 o (+10,8 %)** |

Soit 522 Ko → 578 Ko pour le monofichier. Les deux woff2 pèsent 21,2 et 21,9 Ko.

**Vérifications faites :**
- le woff2 400 est bien téléchargé au chargement (200), et la face 700 se charge
  **à la demande** — normal, aucun texte mono en gras sur l'écran d'accueil ;
  vérifié explicitement via `document.fonts.load('700 12px …')` → `loaded`.
- `getComputedStyle` sur `.beat-ruler span` renvoie bien `"JetBrains Mono"` en tête.
- comparaison de pixels avant/après sur la règle de temps : **captures différentes**,
  donc le dessin des glyphes a réellement changé.
- ⚠️ *Piège de mesure* : comparer la largeur d'un `.beat-ruler span` ne prouve rien,
  c'est une cellule de grille dont la largeur est imposée par la grille. Et comparer
  la chasse ne prouve pas grand-chose non plus — JetBrains Mono et DejaVu Sans Mono
  ont toutes deux une approche de ~0,6 em, donc 0,36 px d'écart sur 15 caractères.
  **La seule preuve solide est la comparaison de pixels.**

**Pile de repli conservée** : `'JetBrains Mono', ui-monospace, SFMono-Regular,
Menlo, Consolas, 'DejaVu Sans Mono', monospace` — si la fonte tarde ou échoue, on
retombe sur une chasse fixe correcte et pas sur le monospace par défaut.

`font-display: swap` : la fonte est légère et auto-hébergée, le clignotement est
bref, et `optional` risquerait de ne jamais l'afficher — or toute l'identité
repose dessus.

**Non fait à cette étape, volontairement** : `--xp-font` (le corps de texte)
reste en Tahoma. Le basculement général appartient à l'étape 2, pour que chaque
étape reste vérifiable seule.

### ✅ Étapes 2 et 3 — tokens et composants (2026-08-18)

**Étape 2 — `src/ui/xp/tokens.css` réécrit.** Les valeurs changent, les noms
restent : toute l'appli bascule d'un seul commit sans qu'un composant soit
touché.

Trois vérifications ont guidé l'écriture, et chacune a évité une casse :

- `--xp-white` et `--xp-shadow` ne servent **que** dans les deux formules de
  biseau (2 usages chacun, tous les deux dans le fichier). Leurs noms sont
  hérités de XP, leur rôle réel est « la lumière » et « l'ombre » du relief.
  **`--xp-white` n'est donc plus du blanc**, et c'est voulu.
- **`--xp-face` doit rester une couleur UNIE** : elle termine trois dégradés de
  module (`linear-gradient(…, var(--xp-accent-X-soft), var(--xp-face) 60px)`) et
  un dégradé ne s'imbrique pas. Le dégradé vertical des panneaux appartient donc
  au composant, pas au token.
- `--xp-select-blue` est toujours accompagné d'un `color: #fff` côté composant
  (3 usages vérifiés) : n'importe quel fond sombre convient.

Les variantes `-soft` des accents de module deviennent des teintes **sombres** :
elles servent de haut de dégradé aux corps de fenêtre ; en pastel elles se
seraient allumées sur un chrome sombre.

`[data-theme='noir']` est **vidé de ses valeurs** plutôt que supprimé, pour que
l'attribut encore posé par `GameView` retombe sur `:root`. Le retrait de
l'attribut appartient à l'étape 5.

**Étape 3 — les composants, et le constat C6 enfin fermé.**

⚠️ **`.xp-btn` était recopié dans SEPT fichiers**, à l'identique à la taille
près : même bordure `#003c74`, même dégradé clair, même biseau. C'était le
constat **C6** de l'audit de design, et c'est ce qui a fait que l'étape 2 a
laissé sept séries de boutons clairs sur un chrome sombre. Une **définition
unique** vit désormais dans `styles/global.css` ; les composants ne gardent que
leurs surcharges de *taille* (padding, min-height, font-size).

Deux autres classes portaient le même relief sans partager de classe
(`.tool` dans ToolBar, `.restore button` dans AtelierView) : d'où un token
**`--xp-btn-face`**, une seule source de vérité pour la face de bouton.

`XpWindow` : bordure `#0831d9` → `--xp-line`, corps en dégradé vertical Winamp,
boutons de fenêtre débarrassés de leur liseré blanc et de leur bleu Luna, écran
d'extinction passé au noir verdâtre de l'afficheur. **Plus une seule couleur
Luna en dur dans le fichier.**

**Deux bugs réels trouvés par la vérification, pas à l'œil :**

1. **`XpTabs` — régression de contraste.** `.tab` avait
   `linear-gradient(180deg, #fff, var(--xp-face-dark))` : un dégradé blanc →
   presque noir, avec du texte gris dessus. Les onglets inactifs étaient
   illisibles après l'étape 2.
2. **`--xp-muted` était calibré pour le fond clair de Luna.** À `#75758a` il
   tombait à **2,49:1** sur la face de bouton sombre. Remonté à `#a5a5b8` :
   **4,63:1** sur le bouton, **5,08:1** sur `--xp-face`, tout en restant
   nettement en retrait de `--xp-text`.

**Une correction de grammaire :** le liseré de module utilisait le vert LCD
`#2ee23c`, alors que **ce vert doit rester réservé à l'ÉTAT** — c'est exactement
le reproche fait à la direction « Néon ». Les trois accents de module sont du
*chrome* : ils sont désaturés (`#d9931c`, `#8a7cc0`, `#3f9c96`) pour rester plus
calmes que les couleurs de contenu.

**Mesure de contraste : 13 éléments sous 3:1 après l'étape 2 → 1 après
l'étape 3** (un bouton d'emoji, faux positif : la couleur du texte ne s'applique
pas à un emoji).

⚠️ **Angle mort de la sonde de contraste, à connaître** : elle lit
`backgroundColor`, qui est **transparent quand le fond est un dégradé** — elle
remonte alors au parent et sur-signale. Les `.xp-btn` étaient des faux positifs.
Pour les cas réels, calculer le ratio sur les valeurs de tokens plutôt que sur
le DOM.

⚠️ **`npm run check` ne suffit pas.** Un commentaire CSS mal refermé dans
`tokens.css` passait `svelte-check` sans un mot et cassait `npm run build`
(postcss). **Toujours lancer les deux builds**, comme le dit la convention.

**Reste visible après l'étape 3, et c'est le périmètre de l'étape 4** : les
cases vides sont encore des dégradés pâles (`#fff` → teinte claire) dans
`DrumRowView`/`SynthRowView` — or « un pas éteint est un trou » est le cœur de
la direction ; et les champs numériques et menus déroulants natifs restent
blancs (10 `background: #fff` codés en dur).

### ✅ Étapes 4 et 5 — les couleurs en dur, puis la fusion des trois langues (2026-08-18)

**Étape 4** — 182 → 113 couleurs codées en dur. Deux prises qui comptent :

- `DrumRowView` : les cases vides ne sont plus des dégradés pâles mais du verre
  (`--xp-lcd-bg`) teinté à 20 % de la couleur de la ligne via
  `color-mix()`. C'est là que le **biseau s'inverse** : `.cell` est creusé
  (`--xp-bevel-in`), `.cell.state-1/2` est bombé (`--xp-bevel-out`). L'ancienne
  lecture XP (« actif = bouton enfoncé ») est retournée : **un pas actif émet,
  donc il est en relief**. C'est le reproche n°1 de l'audit, et le cœur de la
  direction.
- `TransportRings` et `StepCircle` sont des canvas : ils ne peuvent pas lire une
  variable CSS. Ils recopiaient donc les couleurs de lignes en constantes JS —
  restées en Luna après l'étape 2. Ils les lisent maintenant au montage
  (`getComputedStyle(el).getPropertyValue('--cell-' + name)`), les constantes ne
  servant plus que de repli.

**Étape 5** — les 11 déclarations `--amp-*` du Mode Live deviennent des **alias**
sur les tokens partagés (`--amp-lcd-fg: var(--xp-lcd)`, `--amp-amber:
var(--xp-playhead)`…). Choix délibéré : les 82 points d'appel ne bougent pas.
La palette fusionne, le risque de régression est nul. `GameView` perd son
attribut `data-theme="noir"`. **L'appli ne parle plus qu'une langue visuelle** —
c'était l'argument principal de la décision, et il n'était pas esthétique.

### ✅ Étape 6 — le tactile, 44px de zone et 0px de dessin (2026-08-18)

> ⚠️ C'était **le** chantier ouvert de la direction, celui que `CLAUDE.md`
> énonce littéralement : « toute zone touchable doit monter à 44px **sans que
> le dessin grandisse** ».

**Le mécanisme.** Un pseudo-élément transparent, centré sur le bouton
(`styles/global.css`, classes `.tap44`, `.tap44-y`, `.tap44-d`) :

```css
.tap44::after { position: absolute; top: 50%; left: 50%; translate: -50% -50%;
                height: max(100%, 44px); width: max(100%, 44px); }
```

Le test de collision d'un pseudo-élément **renvoie son élément d'origine** : le
doigt qui tombe dans la marge invisible clique bien le bouton, alors que le
bouton n'a pas bougé d'un pixel. Un `padding` aurait poussé le dessin, un
`transform: scale` l'aurait déformé. Le tout sous `@media (pointer: coarse)`
uniquement — à la souris, la densité de l'écran est un acquis de la direction,
pas un défaut à corriger.

**Deux variantes, parce que les deux axes ne se valent pas :**

| classe | ce qu'elle fait | pour quoi |
|---|---|---|
| `.tap44` | les deux axes | boutons isolés (transport, outils, pastilles) |
| `.tap44-y` | la hauteur seule | ce qui vit dans une grille dont la largeur est dictée par le nombre de pas |

> Une troisième variante `.tap44-d` (l'enveloppe descend au lieu de s'étaler) a
> existé le temps de l'étape 6 : elle servait uniquement aux trois boutons de
> fenêtre, coincés sous un bord qui les recadrait. Elle est partie avec eux à
> l'étape 7.

**Le piège qui a coûté trois itérations.** Les enveloppes invisibles débordent,
donc elles **se marchent dessus** dès que deux commandes sont voisines à 2px — et
en cas de recouvrement c'est la **dernière du DOM** qui gagne le point, pas la
plus probable. Le pseudo-élément seul faisait donc passer `.cell` de 34 à 40px,
pas à 44 : la pastille « Séquence » juste en dessous lui volait le bas. La
seconde moitié de l'étape est donc un **écartement du rythme vertical** sous
pointeur grossier (`.row-head`, `.drum-row`, `.group-bar`, `.menubar`,
`.transport`, `.btns`, `.chk-row`, `.buttons`, `.body`…). L'espace n'est pas du
dessin, et sur un téléphone il ne coûte rien puisque la page défile.

**Second piège, plus bête :** un bloc `@media (pointer: coarse)` posé au milieu
d'un `<style>` Svelte est **écrasé par les règles de même spécificité écrites
plus bas** dans le même fichier. Trois réglages n'ont rien fait tant que les
blocs n'ont pas été déplacés en **fin** de `<style>`. Ils y sont tous.

**Éléments remplacés.** `<select>` et `<input type="text">` ne rendent aucun
`::after` dans Chromium : l'astuce ne marche pas. Écart assumé, le seul de la
passe — c'est la boîte elle-même qui passe à `min-height: 44px`. Elle n'a ni
biseau ni petites capitales à préserver, la grammaire de la skin ne se joue pas
là. Même logique pour `.production-hint`, dont l'`overflow: hidden` (l'ellipse
d'une seule ligne) recadre le pseudo-élément : remplissage vertical compensé par
une marge négative.

**Mesure — la seule qui compte.** `getBoundingClientRect()` **ne voit pas** le
pseudo-élément : il fallait sonder la zone réellement touchée avec
`elementFromPoint` autour de chaque contrôle. Deux pièges dans le script de
mesure lui-même : un élément sous la ligne de flottaison renvoie `null` (d'où le
`scrollIntoView` avant chaque sonde), et une case à cocher est un élément
remplacé dont le doigt vise en réalité le `<label>`.

| écran (390×844, `hasTouch`) | avant | après |
|---|---|---|
| Atelier · Rythme | 93 | **15** |
| Atelier · Synthé | — | **8** |
| Atelier · Production | — | **5** |
| Mode jeu | 4 | **0** |
| Mode Live (paysage 844×390) | 33 | **28** |

**Ce qui reste, et pourquoi ça reste** — trois exceptions revendiquées, aucune
subie :

1. **La largeur des cases (8 × 41px).** 16 pas × 44px = 704px sur un écran de
   390. La contrainte est *physiquement* insoluble en largeur. La hauteur, elle,
   est à nous : elle est prise, les cases font 45px de zone pour 34px de dessin.
2. **Les libellés d'aide (20 × 30px de haut).** `.lab.has-hint` n'est pas une
   commande : il annote le curseur d'à côté et son appui n'ouvre qu'une bulle.
   Lui donner 44px, ce serait les prendre à la piste qu'il annote — un doigt qui
   vise le réglage tomberait sur l'explication. Bande doublée (13 → 30px), on
   s'arrête là.
3. **Le Mode Live (21 `.corner-icon` + 7 commandes de 22px).** Les icônes de coin
   sont **posées sur** les pads : les agrandir revient à voler la surface du pad,
   c'est-à-dire de l'instrument. Et en paysage la largeur est le seul luxe — elle
   a été prise (`.topbar`, `.seq-bar`), la hauteur des barres de 22px est ce qui
   reste après les pads. C'est le seul écran où le chantier n'est pas clos.

**Fichiers touchés :** `styles/global.css` (l'utilitaire + `.xp-btn` + `select` /
`input`), `App.svelte`, `ui/xp/{XpWindow,XpTabs,XpSlider}.svelte`,
`ui/sequencer/{DrumRowView,SynthRowView,NotePad}.svelte`,
`ui/atelier/{ToolBar,AtelierView,ExportBar,SynthModule}.svelte`,
`ui/live/LiveView.svelte`, `ui/game/GameView.svelte`.

**Vérifié :** `npm run check` 0 erreur · 33 tests · les deux builds · captures
Playwright à 1280 (souris — densité **inchangée**) et 390 (doigt).

### ✅ Étape 7 — la barre de titre perd son chrome XP (2026-08-18)

> « cette barre n'est plus utile, on n'a plus besoin de faire référence à XP
> ici comme ça »

Le triplet `_ □ ×` est **la** citation Windows de l'appli : minimiser, agrandir,
fermer. Il part, avec ce qui pendait au bout — le gag « Extinction en cours… »
derrière la croix, et les deux appels à `playSystemSound` sur le repli/dépliage.
Le bandeau indigo garde son icône et son titre : c'est la seule zone colorée du
chrome dans le moodboard, elle n'est pas en cause.

**Ce que ça emporte, et c'est voulu :** le repli des fenêtres disparaît (`_` le
faisait réellement, ce n'était pas qu'un décor) — état `collapsed`, état
`shutdown`, et les trois fonctions qui allaient avec. `XpWindow` passe de 8 à 0
ligne de logique : c'est un conteneur, plus un composant.

**Deux orphelins débusqués et retirés dans la foulée :** le token
`--xp-close-grad` (le rouge de la croix, plus aucun consommateur) et la variante
tactile `.tap44-d`, créée à l'étape 6 pour ces seuls trois boutons.
`ui/xp/systemSounds.ts` **reste** — `AtelierView` et `ToolBar` s'en servent
encore (son d'erreur, réglage) ; son sort est une décision à part, toujours dans
les chantiers ouverts.

**Effet de bord agréable :** les 90px libérés rendent le titre entier — l'écran
Rythme affichait « Séquenceur — Kick / Snare / Hat / … », il affiche maintenant
« Séquenceur — Kick / Snare / Hat / Clap / Shaker ».

**Vérifié :** `check` 0 erreur (aucun sélecteur CSS orphelin signalé) · 33 tests ·
les deux builds · cibles tactiles inchangées (Rythme 15, Mode jeu 0) · capture.

### ✅ Étape 8 — la typographie, l'autre moitié de la grammaire (2026-08-18)

> Née d'une question de Yann : « j'espère que ça colle exactement au moodboard ».
> Vérification faite plutôt qu'espérée — et non, ça ne collait pas.

**Le constat.** La palette était juste : 12 des 13 valeurs du moodboard reprises
telles quelles (seule dérive assumée, `--xp-muted`, remonté pour le contraste).
La typographie, elle, n'avait pas bougé :

| | maquette | avant l'étape 8 |
|---|---|---|
| menu | 700 **9px** CAPS, ls .1em | 12px 400, bas de casse |
| onglet | 700 **9px** CAPS, ls .12em | 11px 700, bas de casse |
| bouton | 700 **9px** CAPS, ls .12em | 13px 700, bas de casse |
| barre de titre | 700 **8,5px** CAPS, ls .22em | 14px 700, bas de casse |
| pastille | 700 **8,5px**, ls .14em | 11px 700 |

**Et surtout, la famille.** `--xp-font` valait encore
`Tahoma, 'Noto Sans', Verdana…` — l'étape 1 avait auto-hébergé JetBrains Mono
mais ne l'avait câblée que sur `--xp-mono`, c'est-à-dire sur les douze
afficheurs LCD. **L'interface entière était restée en Tahoma, donc en XP.** La
chasse fixe est la moitié de la grammaire, l'autre étant le biseau ; on n'en
avait posé qu'une. `--xp-font` devient un alias sur `--xp-mono` — le nom du
token est conservé, une dizaine de composants le lisent.

**Ce que ça change en pratique.** Onze tokens d'échelle (`--xp-size-menu`,
`--xp-ls-menu`, … `--xp-size-body`, `--xp-size-small`) posés dans `tokens.css`,
appliqués aux six familles de chrome : menu, onglets, boutons, barre de titre,
pastilles, noms de ligne — plus le sélecteur de mode du Mode jeu, qui remplit la
même fonction que les onglets. Taille et interlettrage séparés plutôt qu'un
raccourci `font` : celui-ci réinitialise `line-height`, dont plusieurs boutons
dépendent.

Les **68 déclarations `font-size` restantes** (texte courant, sous-titres,
aides, verdicts de l'analyseur) sont passées par le rapport de 1,3 que le
moodboard nomme lui-même — 14→11, 13→10, 12→9,5, 11→9, 10→8,5. La hiérarchie
relative est conservée : un titre reste plus gros qu'un sous-titre, tout descend
du même facteur. Le splash garde son gros titre, c'est un moment délibéré.

**Un ajout hors périmètre, assumé :** `color-scheme: dark` sur `body`. Les cases
à cocher, les listes déroulantes et les ascenseurs sont dessinés par le
navigateur, pas par nous — sans ce mot, il les peignait en clair, et les seules
zones claires de l'écran devenaient des widgets natifs au milieu du verre noir.
Un mot pour aligner tout ce qu'on ne dessine pas.

**Piège évité de justesse :** quatre `.xp-btn.tiny` étaient figés à 11px. Le
bouton de base passant à 9px, « tiny » serait devenu **plus gros** que la base.
Même chose pour l'`.xp-btn` à 13px d'`ExportBar` et celui à 10px d'`AtelierView`
(Lecture/Break). Tous ramenés sur les tokens ; ce qui distingue Lecture et Break,
c'est leur remplissage et leur hauteur minimale, pas un corps plus gros.

**Vérifié** — et c'était le vrai risque, une chasse fixe étant plus large par
caractère :

- **débordement horizontal : 0px** sur les trois onglets, à 390 comme à 1280.
  Seul texte tronqué : `.production-hint`, dont c'est le comportement voulu
  (une ligne, déplié au tap).
- **contraste** : plus aucun texte ne bénéficie de l'exemption « grand texte »
  à cette échelle, le seuil passe donc à 4,5:1 partout. Un seul cas sous le
  seuil, et c'est le faux positif connu (l'émoji 🔊 du bouton muet, dont la
  couleur calculée ne s'applique pas au glyphe).
- **cibles tactiles inchangées** : Rythme 15, Synthé 8, Production 5, Mode jeu 0,
  Live 28. Le remplissage des boutons est monté de 5 à 9px pour compenser le
  corps plus petit — la cible ne rétrécit pas avec le mot.
- `check` 0 erreur · 33 tests · les deux builds · captures des six écrans.

**Ce qui reste hors de cette étape, et qui est la vraie suite :** la *structure*
de la maquette. Le grand afficheur BPM vert du transport, le bandeau LCD d'état
en bas de fenêtre (`KICK · TON 42 · DÉCLIN 220 · REV 12 %`), et les LED rondes
devant chaque nom de ligne (l'appli a un bouton 🔊 à la place). Ça touche le
balisage, pas seulement le CSS — c'est une étape à part entière.

### ✅ Étape 9 — la structure de la maquette (2026-08-19)

Ce qui restait après l'étape 8 : trois éléments que la maquette de référence
montre et que l'appli n'avait pas. Ça touche le balisage, pas seulement le CSS —
d'où une étape à part.

**1. L'afficheur BPM du transport.** 22px, vert LCD, l'unité en retrait et
alignée sur la ligne de base. C'est la seule grande typographie de l'Atelier, et
c'est voulu : un ampli a un cadran, et c'est le nombre qu'on lit de loin. C'est
un **afficheur, pas un réglage** — la glissière sous le séquenceur reste la
commande, il n'y a donc rien à désambiguïser entre les deux.

**2. La diode devant le nom de ligne, et c'est elle l'interrupteur.** L'émoji 🔊
tenait ce rôle : il disait l'action, pas l'état, et c'était le dernier glyphe de
couleur du chrome. La diode fait 7px, elle est teintée de la ligne et elle
**rayonne** (`box-shadow: 0 0 5px`) — c'est le halo qui la fait lire comme
allumée plutôt que comme une pastille peinte, et c'est lui qu'on retire pour
l'éteindre. Trois états, là où le bouton n'en montrait que deux :

| état | dessin | ce que ça dit |
|---|---|---|
| allumée | couleur de la ligne + halo | la ligne sonne |
| éteinte | gris ardoise `--xp-led-off`, sans halo | la ligne est coupée |
| creuse | contour seul | la ligne est vide |

Le moodboard le disait déjà : « la diode s'éteint et passe au gris ardoise, le
nom garde sa couleur — c'est la piste, pas son état ». Le bouton reste un
poussoir biseauté : une diode nue qui commande quelque chose serait une
affordance invisible, et le biseau est justement ce qui dit « ceci s'appuie ».
Le libellé d'état part dans un `.sr` visuellement masqué : la diode ne dit rien
à qui ne la voit pas.

**3. Le bandeau LCD en bas de la fenêtre du séquenceur** (`StatusLcd.svelte`).
Verre noir, vert LCD, 9px avec 0,06em d'interlettrage — c'est ce dernier qui
l'empêche de se lire comme du texte courant : un cadran, pas une phrase. Il
affiche la ligne qu'on vient de manipuler et ses réglages à gauche, la réverbe
en retrait à droite, exactement la forme de la maquette
(« KICK · TON 42 · DÉCLIN 220 » / « RÉV 12 % »).

**Ce que ça a demandé :** un `$state` de plus, `ui/atelier/lastTouched.svelte.ts`
— la dernière ligne touchée, et rien d'autre. Volontairement **hors du modèle
v2** : ce n'est pas de l'état de morceau, ça ne se sérialise pas, ça ne passe
pas dans l'historique d'annulation et le moteur audio ne doit jamais le lire.
Même esprit que `ui/xp/paramHints.svelte.ts`. Il est marqué là où
l'utilisateur agit vraiment sur la ligne — dans `cycleCell` et sur la diode,
pas sur le `pointerdown` : un appui long qui ne modifie rien n'a pas « touché »
la ligne. Tant qu'on n'a touché à rien, l'afficheur n'invente pas de ligne
courante : il annonce le morceau (`120 BPM · 3 LIGNES EN JEU`).

**Vérifié :**

- **comportement** : scénario Playwright — au départ le résumé global, après un
  clic sur une case `SNARE · TON 0 · DÉCLIN 0 · PAS 4 / RÉV 0 %`, après une
  coupure `KICK · …`, et les cinq diodes rendent bien `coupée / allumée /
  allumée / vide / vide`.
- **contraste : plus aucun cas sous le seuil.** Le seul faux positif qui
  traînait depuis l'étape 6 (l'émoji 🔊, dont la couleur calculée ne s'applique
  pas au glyphe) a disparu avec l'émoji lui-même.
- **cibles tactiles inchangées** — après un correctif : sans l'émoji qui la
  remplissait, la boîte du bouton de coupure du Synthé s'était rétrécie sur les
  7px de la diode, et la cible avec elle (34px). `min-width: 32px`, comme les
  lignes de batterie.
- débordement horizontal 0px à 390 et 1280 · `check` 0 erreur · 33 tests · les
  deux builds · captures des six écrans.

**Piège du détecteur de troncature :** il signalait les `.sr` comme « tronqués ».
Un texte réservé aux lecteurs d'écran EST recadré exprès — c'est la technique,
pas un défaut. Le détecteur ignore désormais ce qui porte un `clip-path`.

### ✅ Étape 10 — la barre de menus (2026-08-19)

> « pas fan de cette barre : manque de cohérence / indication "accès total" un
> peu superflue / prend trop de place, ça doit tenir en 1 ligne »

**Trois langues dans une barre de sept éléments.** Les menus étaient du texte
plat, le marqueur d'accès un cadre pointillé, et Annuler/Rétablir des poussoirs
biseautés avec leur dégradé. Une barre de menus n'a qu'un seul registre : du
libellé posé sur la face du chrome, qui s'allume au survol. ↶ et ↷ le
rejoignent — même famille, même corps de 9px, même surlignage bleu. **Le biseau
reste réservé à ce qui est vraiment un bouton ailleurs sur l'écran** ; dans une
barre de menus, il faisait du bruit.

**« Accès total » déménage dans le menu Aide.** Le raisonnement qui le mettait
dans l'Atelier plutôt que sur l'accueil tient toujours — c'est ici qu'on se
demande si ce qu'on voit est bien ce que voient les autres — mais il occupait
une **rangée entière de chrome permanent** pour une information qu'on consulte
une fois. Un menu est le bon domicile de ce qu'on va *chercher*.

**Une ligne, garantie par `nowrap`.** La barre passait à deux rangées dès que la
place manquait. Elle ne se replie plus ; c'est le remplissage horizontal qui
absorbe l'étroitesse, en deux crans : 5px de part et d'autre des libellés sous
460px, 3px sous 360px. Mesuré à six largeurs :

| | avant | après |
|---|---|---|
| hauteur de la barre | 64px (deux rangées) | **36px, à toutes les largeurs** |
| débordement de page | — | **0px de 320 à 1280** |

Le « débordement de barre » résiduel de 5px que rapporte la sonde est
l'enveloppe tactile invisible du dernier bouton, pas du dessin : aucun élément
ne dépasse le bord (vérifié élément par élément).

**Défaut débusqué en chemin :** la liste du menu Aide, ancrée à gauche de son
libellé avec 190px de large, partait **au-delà du bord de l'écran** sur
téléphone et se faisait couper. Le défaut préexistait ; il est devenu visible en
ajoutant une entrée à ce menu-là. Le dernier menu s'ancre désormais à droite.

**Le prix, dit clairement.** Deux cibles tactiles passent sous 44px, **en
largeur seulement** : un `.menu-btn` à 40×45 et un `.tool` à 38×44, sous 460px.
C'est le coût direct de la ligne unique — les libellés sont côte à côte sans
blanc, donc leurs enveloppes se recouvrent et c'est la dernière du DOM qui
gagne le point. Arbitrage assumé : entre deux libellés de menu, une frappe qui
dérape ouvre le mauvais menu, on le referme et il ne s'est rien passé. C'est
pour ça que le seul écart qui subsiste dans la barre est **entre Annuler et
Rétablir** (8px) : ce sont les deux seules commandes dont l'erreur coûte
quelque chose.

**Vérifié :** `check` 0 erreur · 33 tests · les deux builds · contraste **aucun
cas** sous le seuil · débordement de page 0px sur les trois onglets à 390 et
1280 · captures de la barre à 390 et 1280, et du menu Aide ouvert.

### ✅ Étape 11 — l'analyseur de spectre (2026-08-19)

> « il faut en effet l'analyseur de spectre winamp / mode atelier : à droite de
> "break", on peut supprimer la vision circulaire / dans le mode live, s'il y a
> une place toute indiquée, allons y »

**Un vrai analyseur, pas une animation.** `graph.ts` gagne un `AnalyserNode`
maître branché en tap sur `finalGain` — donc sur **ce qu'on entend**, après le
limiteur, l'écrêteur doux et le volume général. C'est ce qui le distingue des
`lineAnalyser` existants : ceux-là mesurent un niveau par ligne (fftSize 32, un
chiffre par frame), celui-ci rend un spectre du mix. Tap seulement, jamais
connecté en aval : aucun effet sur le son, ni en direct ni au rendu hors ligne.

`AudioEngine` expose `getSpectrum(out)` — il **remplit** un tableau fourni par
l'appelant au lieu d'en renvoyer un : le visualiseur tourne à 60 Hz, allouer
256 octets par frame ferait travailler le ramasse-miettes pour rien.

**Les anneaux de transport disparaissent** (`TransportRings.svelte` supprimé).
Ils redisaient la position de lecture, que la tête de lecture montre déjà sur
chaque grille, ligne par ligne et au pas près. L'analyseur, lui, montre ce
qu'aucun autre élément de l'écran ne montre : le son qui sort.

**Le Mode Live y gagne aussi**, et c'est là que le remplacement est le plus
net. Son mode « BARRES » répartissait les six niveaux de ligne sur 22 barres
via une cloche centrée sur la position *supposée* de chaque élément dans le
spectre. Joli relief, mais construit sur un **classement arbitraire** : un kick
filtré en aigu s'y affichait toujours dans les graves. C'est maintenant une
mesure.

**Trois réglages qui font la différence entre « ça marche » et « ça ressemble à
Winamp »**, tous trouvés à l'œil sur captures successives :

1. **Répartition géométrique des bandes**, plafonnée à 30 % des bins (≈7 kHz).
   La première version montait à 78 % : la moitié droite de l'afficheur restait
   vide en permanence, et un afficheur à moitié vide se lit comme cassé.
2. **Pente croissante vers l'aigu** (×1 à ×2,5). Un spectre musical décroît
   d'environ 3 dB par octave ; sans compensation le hat s'entend mais ne se voit
   pas. Correction d'affichage assumée — un analyseur d'ampli n'a jamais été un
   instrument de mesure.
3. **Fenêtre de décibels resserrée** (-72 à -18 au lieu de -84 à -12) : c'est la
   plage utile d'un mix, pas la plage théorique du format.

Plus le **capuchon** qui monte d'un coup et retombe en ~0,75 s. C'est ce
détail-là qui fait « analyseur » plutôt que « barres animées » : sans lui on ne
voit que le présent, avec lui on voit le maximum récent.

Le dégradé est peint sur la **colonne** et non sur la barre — vert en bas, ambre
au milieu, rouge en haut. Une barre haute traverse donc les trois zones, et
c'est ce qui fait qu'on lit un niveau et pas une teinte.

**Facteur commun extrait** (`ui/xp/spectrumBands.ts`) : la lecture d'une barre
sert à deux dessins différents — le composant de l'Atelier et le canvas du Live.
Le projet s'est déjà fait avoir par un `.xp-btn` recopié dans six fichiers
(constat C6), on ne recommence pas avec la répartition des bandes.

**Vérifié :** l'analyseur **bouge vraiment** — scénario Playwright qui compare
la signature du canvas à l'arrêt puis en lecture, puis deux frames consécutives
en lecture (une capture unique ne distingue pas un visualiseur figé d'un
visualiseur vivant). `check` 0 erreur · 33 tests, **instantané du scheduler
compris** : aucun tirage aléatoire n'a été ajouté, les exports restent
reproductibles · les deux builds · captures Atelier et Live en lecture.

### ✅ Étape 12 — la barre de transport, répartition et dimensionnement (2026-08-19)

> « répartition/dimensionnement des espaces à revoir »

Mesuré avant de toucher quoi que ce soit, et le diagnostic était pire que ce
que la capture laissait voir. **Deux défauts, une seule cause** — un
`.spacer { flex: 1 }` qui poussait tout à droite pendant que `.transport`
était en `flex-wrap: wrap` :

| largeur | avant | après |
|---|---|---|
| 360-430px | barre **78px**, Lecture et Break **empilés** | 32px, sur une ligne |
| 768px | 301px de vide au milieu | 90px, en une seule coupure |
| 1280px | **492px** de vide au milieu | 302px, en une seule coupure |

**1. Lecture et Break ne se séparent plus jamais** (`flex-wrap: nowrap`). Sous
500px ils passaient l'un sous l'autre : la barre doublait de hauteur, sur les
écrans où la hauteur est justement comptée, et pour les deux boutons les plus
utilisés de l'application.

**2. L'analyseur absorbe la place libre** au lieu qu'un `.spacer` la laisse
vide : `flex: 1 1 0` à la place d'une largeur figée. Le vide disparaît par
construction — c'est aussi ce que fait la fenêtre de Winamp, le visualiseur
occupe ce qui reste.

**3. Le reste de l'espace se regroupe en UNE coupure**, via `margin-left: auto`
sur l'afficheur BPM. La barre se lit désormais en deux blocs — transport à
gauche, afficheur + analyseur à droite — au lieu de trois îlots séparés par des
trous de tailles arbitraires.

**Le nombre de barres suit la largeur, pas l'inverse.** Le composant reçoit une
largeur de barre visée (8px) et en déduit le nombre : à 1280 la boîte fait
380px, sur un téléphone une soixantaine. Un nombre fixe aurait donné des barres
de 26px d'un côté et de 2px de l'autre.

**Défaut débusqué en le faisant :** l'analyseur paraissait à moitié vide à
1280px. Ce n'était pas le contenu — c'était **104 barres pour 74 bandes utiles**,
donc trente barres qui répétaient la dernière valeur, silencieuse. D'où
`barresMax()` : le nombre de barres est plafonné par le nombre de bandes
réellement distinctes du spectre. Et `max-width: 380px`, parce que le spectre
d'une boîte à rythmes vit dans les graves — étalé sur 520px il restait clairsemé
en permanence, et 380 est de toute façon l'ordre de grandeur du visualiseur de
Winamp, qui était une petite fenêtre à côté de l'afficheur, pas un bandeau.

**Un renoncement assumé :** sous 400px, ce qui reste après Lecture/Break et
l'afficheur fait une quarantaine de pixels. À cette largeur un analyseur ne dit
plus rien, il ressemble à un rectangle noir oublié — il s'efface, et l'afficheur
BPM se cale à droite.

**Vérifié :** `check` 0 erreur · 33 tests · les deux builds · contraste aucun cas
sous le seuil · débordement de page 0px sur les trois onglets à 390 et 1280 ·
cibles tactiles inchangées · captures à 390, 430 et 1280 en lecture.

### ✅ Étape 13 — Mode Live : 28 cibles tactiles, il n'en reste aucune (2026-08-19)

**Deux mouvements, et le premier corrige une conclusion trop rapide de l'étape 6.**

Les **21 icônes de coin** (verrou, 🎲, assignation) faisaient 22px, posées SUR
les pads. Mesuré : 3 × 44 = 132px pour un bouton large de 128 — elles ne
pouvaient pas atteindre la cible sans manger la surface qu'on frappe en jouant.
Mais l'overlay ⚙ **portait déjà les trois, en pleine taille** : c'était un
doublon, pas un raccourci indispensable. Elles partent, une seule surface de
réglage reste (règle A6), et le pad redevient entièrement jouable. Verrouiller
ou rebrasser un bouton est un geste de préparation, pas un geste de scène.

⚠️ Le verrou et le 🎲 **du pad XY**, eux, n'existaient nulle part ailleurs : ils
descendent dans l'overlay AVANT la suppression, sinon on perdait deux fonctions.

**Second mouvement.** L'étape 6 avait conclu que la hauteur ne se prenait nulle
part parce que « les pads SONT l'instrument ». C'était faux, et c'est la mesure
qui le dit : les deux barres coûtent 44px sur 390, les pads passent de 94 à
**81px** de haut — presque le double de la cible minimale. **PLAY, lui, était à
34px.** Le bouton le plus important de l'écran ne peut pas être celui qu'on rate.

| | avant | après |
|---|---|---|
| Mode Live | 28 cibles sous 44×44 | **0** |
| hauteur d'un pad | 94px | 81px |

Le Mode jeu était déjà à 0 ; l'Atelier n'a plus que ses deux exceptions
revendiquées (largeur des cases, libellés d'aide). **L'application entière est
tactile.**

### ✅ Étape 14 — R1(b) : la mélodie devient un motif (2026-08-19)

> Le vrai correctif musical, ouvert depuis l'audit et repoussé parce qu'il
> change les notes des 34 presets.

**Le diagnostic tenait en une mesure, faite avant d'écrire une ligne :** sur les
34 presets, **aucune** mesure de mélodie n'était identique à une autre — 0 sur
94, silences exclus. Chaque pas était un tirage indépendant. Une mélodie se
reconnaît parce qu'elle revient ; celle-ci ne revenait jamais.

On tire donc **un motif d'une mesure et on le répète**. Le piège qui distingue
une vraie répétition d'un copier-coller : la nappe change d'accord d'une mesure
à l'autre, des degrés recopiés sonneraient faux dès le deuxième accord. Le motif
mémorise donc des **rôles** (« la n-ième note de l'accord en cours ») et non des
degrés ; un rôle se résout contre l'accord en vigueur à l'endroit où il tombe.
Le motif garde sa forme et suit l'harmonie — ce que fait n'importe quel thème
transposé. La dernière mesure varie : une phrase qui se répète à l'identique
jusqu'au bout est une boucle.

**Deux défauts trouvés en mesurant, pas en relisant :**

1. **Un motif court sort vide bien plus souvent qu'une ligne entière** — une
   fois sur trois à 2 pas — et le filet ne posait alors qu'UNE note pour tout le
   morceau. `boombap` et `trapmodern` étaient exactement dans ce cas, constaté
   sur la sortie du générateur. La tête du motif porte donc toujours une note :
   le cas disparaît par construction, et la phrase se pose sur le temps fort.
2. **Avec cette note garantie, le facteur 0.6 hérité du tirage pas à pas
   remontait la mélodie à 1,40 note/mesure**, au-dessus de la basse (1,15) —
   très exactement le défaut que 0.6 avait corrigé en août. Re-balayé sur les
   34 presets :
   `0.35 → 1,14 (pire 3,0)` · `0.40 → 1,22 (pire 3,5)` · `0.60 → 1,40 (pire 5,0)`.

| | avant | après |
|---|---|---|
| périodicité de la mélodie | **0 %** | **100 %** |
| densité | 1,13 note/mesure | 1,08 (sous la basse, 1,15) |
| pire cas | 4,5 | 4,0 |

Trois tests permanents (`tests/melody-motif.test.ts`) verrouillent la
périodicité, le fait que la mélodie reste sous la basse, et le filet
anti-ligne-vide.

**Portée assumée, dite explicitement :** les mélodies des 34 presets changent,
et **les rafales des trois lignes de synthé avec elles** — `applyRandomRolls`
poursuit le même générateur après le remplissage. La basse et la nappe gardent
leurs notes (elles sont tirées avant la mélodie). Les morceaux **sauvegardés ne
bougent pas** : la sérialisation stocke les notes, pas la graine.

### ✅ Étape 15 — le menu de voix synthé (2026-08-19)

Deux défauts, **et le second était plus grave que celui qui était noté au plan**.

1. Le menu n'avait aucune liaison de valeur : il retombait toujours sur
   « — Voix… » et n'a jamais dit quelle voix était en place. Il affiche
   maintenant le preset en place, ou « — Voix modifiée » quand les curseurs ont
   écarté la voix de tout preset. Ce troisième cas est celui qui manquait : sans
   lui, afficher encore « Rhodes chaud » après un tour de curseur aurait été un
   mensonge de plus, dans l'autre sens.
2. **Le patch d'un preset était fusionné sur la voix COURANTE** au lieu de la
   voix par défaut de la ligne. La bibliothèque dit pourtant noir sur blanc « un
   champ non précisé revient au défaut » : choisir « Pincée » (filterEnvAmount
   1200) puis « 808 profond » (qui n'y touche pas) laissait l'enveloppe de
   filtre de Pincée sur un son censé être rond. `resolveVoicePreset` faisait
   déjà le bon calcul — il n'était appelé que par le moteur, jamais par l'UI.

Six tests ajoutés sur ces deux contrats.

**Piège rencontré en vérifiant :** `XpSlider` ignore les événements du
`<input type=range>`, qui est purement visuel (`pointer-events: none`) — c'est
l'enveloppe `.wrap` qui capte le geste. Un `dispatchEvent` sur le range ne change
rien, il faut glisser pour de vrai. Une vérification qui passait « sans rien
changer » ne prouvait donc rien.

### ✅ Étape 16 — plus de verrou, plus de brassage total : un dé par chose (2026-08-19)

> « je pense que le dé par touche permet de se passer d'un brassage total. dans
> ce cas, on peut faire sauter le principe de verrou par bouton. par conséquent,
> il faut un dé pour le pad aussi. »

**La chaîne se tient, et elle enlève trois concepts pour en garder un.** Le dé
par bouton rend le brassage total (🔀) inutile ; or le verrou n'existait QUE
pour protéger du brassage ; sans brassage, il ne protège de rien. Ce qui reste
s'explique en une phrase : **un dé par chose assignable, et rien d'autre.**

Partent : le bouton 🔀 de la barre supérieure, `shuffleAssignments`,
`slotLocked`, `padLocked`, `toggleSlotLock`, `togglePadLock`, et les huit
boutons de verrou de l'overlay.

**Ce que la demande ne couvrait pas, et qu'il fallait voir :** l'inclinaison
n'était rebrassée **que** par 🔀 — elle n'a jamais eu de dé. Sans correctif,
elle serait devenue la seule assignation qu'on ne peut plus tirer au hasard.
Elle reçoit le sien (`randomizeTilt`). Le pad avait déjà le sien, descendu dans
l'overlay à l'étape 13.

Total : **8 dés** — six boutons, le pad (X+Y ensemble), l'inclinaison.

**Compatibilité des réglages enregistrés.** `LiveAssignments` est persisté en
`localStorage` et le validateur RÉCLAMAIT `slotLocked` et `padLocked` : les
retirer du type sans les retirer du validateur aurait rejeté chaque réglage
existant, donc réinitialisé l'assignation de tout le monde. Ils sortent des deux
ensemble ; les clés en trop d'un ancien enregistrement sont simplement ignorées.
Vérifié en semant un réglage à l'ancien format dans le navigateur avant de
charger : il se recharge intact, sans erreur.

**Vérifié :** `check` 0 erreur · 42 tests · les deux builds · Mode Live toujours
à 0 cible sous 44×44 · scénario Playwright — 🔀 absent, 0 verrou, 8 dés, un tir
qui change bien l'assignation (BREAK → ROLL K×3), aucune erreur console.

### ✅ Étape 17 — Mode jeu : la charpente des exercices, et un pilote de chacun (2026-08-19)

> « attaquons maintenant le mode jeu, as tu un plan précis sur le sujet ? » →
> « je pense qu'on peut tous les faire » (les trois nouveaux types) →
> **« Fais moi un test de chaque exercice stp »**

**Le constat de départ.** Les 34 niveaux font varier les PARAMÈTRES — subdivision,
swing, traîne, polyrythmie, rafales — mais jamais la TÂCHE. Le seul verbe est
« reproduire », et `verify()` était une comparaison case à case câblée en dur
dans le store. Ajouter un exercice sans charpente aurait donné un `if` de plus
dans la vue, puis un deuxième, puis un troisième.

**Ce qui a été fait, en deux temps.** D'abord la charpente (`src/model/exercises.ts`,
neuf, pur, testable sans navigateur) : le discriminant `ExerciseKind`, la
comparaison `comparerGrilles` **déplacée sans être changée**, et le découpage
`colonnesDeTranche`. Puis **un niveau jouable de chacun** des trois nouveaux
verbes, posés en 35/36/37 après la campagne — la progression existante n'est pas
touchée, et le joueur qui finit le 34 les trouve en bonus (accessibles tout de
suite avec le pseudo « master » ou `#boss`).

| Verbe | Ce qu'il demande | Ce qui est noté |
|---|---|---|
| `reproduire` | écouter, reposer la grille (les 34 niveaux) | chaque case, état **et** rafale |
| `completer` | un quart de la boucle est vidé, le reste est donné | les mêmes cases, **restreintes à la zone** |
| `intrus` | quatre mesures s'enchaînent, une seule diffère | un index, aucune grille |
| `jouer` | frapper le pad (ou l'espace) sur chaque coup de kick | le PLACEMENT, en millisecondes |

**Le point de conception, c'est le paramètre `colonnes` de `comparerGrilles`.**
Il permet à « compléter » de réutiliser **exactement** la même vérification que
« reproduire » en ne notant que la zone à remplir. Sans lui il aurait fallu un
second comparateur presque identique — et deux comparateurs qui doivent rester
d'accord finissent toujours par ne plus l'être.

**Trois choses que seule la mesure a montrées** (voir la règle « vérifier
visuellement ne suffit pas ») :

1. **« Compléter » vidait un trou, pas un temps.** À 8 pas et quatre tranches,
   le quart vidé faisait deux doubles-croches par ligne — **6 cases sur 24**,
   comptées à l'écran. La subdivision du pilote passe à 16 (12 cases sur 48), et
   le vocabulaire suit : le Mode jeu tient sur **une mesure** par ligne, donc un
   quart de boucle est un **temps** et pas une mesure. `colonnesDeMesure` devient
   `colonnesDeTranche` — générique, parce que « l'intrus » raisonne lui sur de
   vraies mesures mises bout à bout, et qu'un nom qui ment à un de ses deux
   appelants est un piège à retardement.
2. **« Jouer » notait la grille, pas le coup.** L'écart était mesuré contre le
   pas courant *quel qu'il soit*. Sur une boucle de 8 pas qui en porte 3 actifs,
   cinq pas sur huit sont silencieux : **frapper sur un silence bien aligné
   donnait 100 %**. L'ancre devient le dernier pas ACTIF du kick, et l'intervalle
   celui qui le sépare du prochain pas actif — pas la durée d'un pas. Vérifié
   dans le navigateur par un rAF qui frappe sur `.pas.playing:not(.actif)` :
   0 %, aucune victoire (contre 100 % en frappant sur `.pas.actif.playing`).
   Le pilote 37 passe aussi de 4 pas à 8 : à `kickMin/Max = 1`, la boucle sortait
   **deux** frappes — on ne joue pas en rythme sur deux frappes, on appuie deux fois.
3. **Les enveloppes tactiles se marchaient dessus, et volaient du bouton VISIBLE.**
   Les quatre boutons « Mesure 1..4 » ne répondaient que sur 22px de leurs 30px
   dessinés : l'enveloppe 44px de « Donner la réponse », plus bas dans le DOM,
   passait au-dessus. Diagnostiqué en faisant dire à la sonde *quel* élément elle
   touchait — `elementFromPoint` renvoyait bien le bouton du dessous. Écartements
   posés en fin de `<style>` dans le bloc `coarse` (16px minimum = deux
   débordements). Après : plus aucune cible sous 44 hors les deux exceptions déjà
   documentées (les cases de grille, le bouton `.player`).

**Ce que la charpente a fait tomber au passage.** `LevelDef` de `model/types.ts`
est **retiré** : déclaré, jamais lu, et son champ `kind: 'generated' | 'preset'`
décrivait la SOURCE d'un niveau, pas sa tâche. Le laisser à côté d'un vrai
discriminant en aurait fait un faux ami pour le prochain qui cherche où brancher
un exercice.

**La partie pure vit dans le modèle, pas dans le store.** `justesseDesFrappes`
et `ecartAuCoup` sont sortis de `game.svelte.ts` vers `model/exercises.ts` pour la
même raison que `comparerGrilles` : c'est de l'arithmétique, elle se teste sans
navigateur, sans Web Audio et sans runes. Le store n'en garde que le branchement.

**Fichiers touchés :** `src/model/exercises.ts` (neuf), `src/model/types.ts`
(`LevelDef` retiré), `src/model/presets/levels.ts` (champ `exercise` + 3 pilotes),
`src/stores/game.svelte.ts` (`preparerExercice`, `verify` aiguillé, frappes,
grille de l'intrus), `src/ui/game/GameView.svelte` (transport et corps par verbe,
pad, jauge, choix, zone), `src/App.svelte` (« 34 niveaux » devenu dynamique),
`tests/exercises.test.ts` (17 tests), `tests/model.test.ts`.

**Écarts de portée assumés.** Les pilotes sont des **pilotes** : un niveau de
chaque, pour comparer avant d'en écrire une campagne. La progression des 34
n'est pas retouchée, et aucun des trois verbes n'est encore intégré à la courbe
de difficulté — c'est la décision suivante, et elle appartient à Yann.

**Vérifié :** `check` 0 erreur · **59 tests** · les deux builds · scénario
Playwright de bout en bout sur les trois pilotes (intrus gagné en 3 essais avec
2★ et la bonne mesure marquée ; « jouer » gagné à 100 % de justesse en frappant
sur le curseur, 0 % en frappant sur les silences ; « compléter » verrouille les
cases justes et laisse les cases données inertes au clic) · barre d'espace
fonctionnelle · aucune erreur console · aucun débordement de page à 390px ·
cibles tactiles remesurées.

### ✅ Étape 18 — « Joue en rythme » repris sur les retours d'essai (2026-08-20)

> « le 1er type est plus simple que "reproduire" / le 2eme fonctionne en l'état
> tant que c'est un peu complexe / le 3eme peut être très sympa, plus choses à
> changer : soit ne pas voir où sont les temps à reproduire soit uniquement les
> voir mais ne pas entendre à quoi ça doit ressembler · avoir un petit décompte ·
> doute sur le temps de réponse entre le toucher et la remontée dans le système ·
> attention à avoir un bon niveau de tolérance · voir ce qu'on joue comme séquence »

**Deux verdicts à garder pour le placement dans la campagne**, sans code associé :

- **« compléter » est PLUS FACILE que « reproduire »** — l'oreille travaille sur
  un contexte au lieu du vide. Sa place est donc **avant**, pas après : c'est un
  échauffement, pas un examen.
- **« l'intrus » tient en l'état** à condition que le rythme soit un peu
  complexe. Sur une boucle pauvre, la variante d'un pas s'entend trop vite. À
  cadrer par la densité du niveau, pas par du code.

**Les cinq points sur « jouer », un par un.**

1. **Voir OU entendre, jamais les deux.** C'était le défaut de fond : montrer la
   grille pendant que le kick sonne ne demande que de suivre un point lumineux.
   Nouveau champ `GameLevel.jouerIndice` et **deux pilotes** au lieu d'un —
   37 « à l'oreille » (le kick sonne, la grille reste vide) et 38 « à vue » (la
   grille montre le motif, le kick est MUET, un hat en croches donne la
   pulsation). Le kick est coupé par `row.muted` dans `buildState`, honoré par le
   scheduler.
   ⚠️ **Le secret fuyait par où on ne l'attendait pas** : la bande de séquence
   (point 5) affichait les repères des coups attendus, donc la réponse, en
   « à l'oreille ». Trouvé en scriptant le pilote — le robot, qui n'entend rien,
   les lisait pour savoir où frapper et gagnait à 100 %. Les repères ne
   s'affichent plus qu'à vue, ou une fois le niveau fini.
2. **Précompte.** Quatre clics au tempo du niveau avant que ça compte, affichés
   en gros sur le pad. `engine.countIn`, écrit pour l'enregistrement du direct,
   réutilisé tel quel — le pad affiche le chiffre et refuse les frappes tant
   qu'il tourne. Un Stop pendant le précompte reste un Stop (sans le test, la
   boucle démarrait quand même quatre temps plus tard).
3. **Le temps de réponse — le doute était fondé, et il y avait DEUX fautes.**
   - Le coup de référence était daté par `performance.now()` au moment où la
     frame rAF consommait l'événement. rAF ne tourne qu'à 60 Hz et ne tombe
     jamais pile sur le coup : **jusqu'à 16 ms d'erreur ajoutés à chaque
     mesure**. On prend maintenant `ev.time`, le temps AUDIO programmé, via un
     `engine.audioTime()` neuf (compensé par `outputLatency`, comme
     `consumePlayhead`).
   - La frappe était datée au moment où le gestionnaire s'exécutait, pas quand
     l'événement est arrivé. `event.timeStamp` porte l'instant de réception ; la
     différence avec `performance.now()` est exactement le retard de remontée,
     et il est retranché.
   Reste ce qu'aucun code ne peut voir : la latence de la dalle tactile
   elle-même. D'où le point 4.
4. **Tolérance.** 25/90 ms → **40/130 ms**. Pas par gentillesse : la chaîne
   d'entrée d'un écran tactile ajoute ses propres dizaines de millisecondes avant
   que le geste n'arrive au code, et un joueur parfaitement en place peut être
   mesuré systématiquement en retard. Surtout, `medianeDesEcarts` est affiché à
   côté de la note — **« écart médian +60 ms (tu traînes) »**. La justesse prend
   la valeur absolue, donc « tout le monde en retard de 60 ms » et « la moitié en
   avance, l'autre en retard » lui donnent la même note : la médiane signée les
   sépare, et c'est ce qui dit si on regarde de la latence ou de l'imprécision.
   Médiane et non moyenne — une frappe complètement à côté ne doit pas déplacer
   le diagnostic de toutes les autres.
5. **Voir ce qu'on joue.** Une bande de séquence sous le guide : chaque frappe à
   sa **place réelle** dans la mesure (jamais quantifiée — c'est tout l'intérêt,
   une frappe posée juste après le repère se VOIT en retard), colorée par le même
   seuil que la note. Une frappe garde donc deux choses au lieu d'une : son écart
   signé et sa phase. Un pourcentage seul ne dit pas *où* ça déraille.

**Un test de store, le premier du projet.** `tests/jouer.test.ts` vérifie que le
kick est bien MUET à vue et bien AUDIBLE à l'oreille. Ce n'est pas un détail
d'implémentation : si le kick redevient audible au 38, l'exercice devient trivial
et **rien à l'écran ne le signalerait**. Vitest compile les runes sans réglage
supplémentaire (le plugin Svelte de `vite.config.ts` traite les `.svelte.ts`) —
vérifié avant d'écrire le fichier.

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`audioTime()`),
`src/model/exercises.ts` (seuils, `medianeDesEcarts`), `src/model/presets/levels.ts`
(`jouerIndice`, niveaux 37/38), `src/stores/game.svelte.ts` (`frappes` avec phase,
`decalageMedian`, kick muet), `src/ui/game/GameView.svelte` (précompte, horloge
audio, bande de séquence, légende), `tests/exercises.test.ts`, `tests/jouer.test.ts`
(neuf).

**Vérifié :** `check` 0 erreur · **69 tests** · les deux builds · Playwright sur
les deux sens (à vue : 10 frappes, 100 %, écart médian +7 ms ; à l'oreille : le
guide et les repères restent vides pendant le jeu et n'apparaissent qu'à
l'abandon) · frappes ignorées pendant le précompte · aucune erreur console ·
aucun débordement à 390px · cibles tactiles : aucune sous 44×44 hors les deux
exceptions documentées, sur les quatre pilotes.

### ✅ Étape 19 — le test instable qui a rendu `main` rouge, et ce qu'il cachait (2026-08-20)

**Ce qui s'est passé.** Le test de store écrit à l'étape 18 affirmait « le hat a
8 pas sur 8 ». Vert en local, vert sur la PR #88 — **rouge sur `main` avec 7**,
donc build non produit et **déploiement Vercel sauté**. La PR était mergée, le
site ne l'était pas.

**La cause immédiate : un test qui tirait au sort.** La génération d'un niveau
passe par `Math.random()`. Un test qui n'en regarde qu'un tirage n'est pas un
test, c'est une pièce lancée. Et le remplissage du hat (`genLevelRow`, branche
`fillRatio`) tire des positions au hasard avec un garde-fou à `steps * 4` :
remplir la DERNIÈRE case sur huit est un problème du collectionneur de vignettes,
32 tirages n'y suffisent pas toujours. `fillRatio: 1` ne garantit donc pas le
plein — il n'a jamais prétendu le faire, c'est l'assertion qui mentait.

**Ce que l'instabilité cachait, et qui valait bien plus que le test.** En
mesurant la vraie distribution plutôt qu'en relâchant l'assertion : le générateur
pose une ancre puis 2 ou 3 « extras » à des positions **tirées indépendamment**,
qui peuvent retomber sur l'ancre. Sur 200 000 tirages :

| Coups de kick | Part |
|---|---|
| **1** | **0,86 %** |
| 2 | 21,2 % |
| 3 | 57,5 % |
| 4 | 20,5 % |

Un niveau « jouer » sur cent sortait avec **un seul coup à jouer** — on ne joue
pas un rythme sur une frappe, on appuie une fois. Assez rare pour ne jamais se
voir en essayant, assez fréquent pour tomber sur un joueur. Un plancher de deux
coups est posé dans `preparerExercice`, **pas dans le générateur** : `genLevelRow`
sert les 34 niveaux de la campagne et y toucher changerait l'ordre de consommation
du hasard pour tout le monde. Le complément se prend sur les positions fortes,
sans tirage — il n'ajoute donc aucun appel au générateur.

**La règle à retenir.** Un test qui dépend de `Math.random()` doit affirmer ce qui
est vrai à **chaque** tirage, et répéter (60 fois ici) pour que le hasard devienne
de la couverture au lieu d'une pièce lancée. Le hat est donc noté « au moins 75 %
des pas », ce qui est la propriété qui compte — un trou occasionnel s'entend comme
une syncope, pas comme une absence de tempo.

**Et la règle de session.** Vert sur la PR ne veut pas dire vert sur `main` quand
un test est aléatoire. Vérifier le run de `main` après le merge, pas seulement
celui de la PR — c'est lui qui déploie.

**Vérifié :** `check` 0 erreur · **70 tests** · 12 exécutions consécutives du
fichier instable, toutes vertes (≈3 600 tirages par assertion) · les deux builds.

### ✅ Étape 20 — la latence se mesure, elle ne se devine pas (2026-08-21)

> « 37 trop dur, il y a clairement une latence »

**Deux problèmes distincts sous une seule phrase**, et le second n'est pas une
question de millisecondes.

#### 1. Une latence bel et bien NON compensée — et c'est un bug, pas une fatalité

`audioTime()` faisait `ctx.currentTime - (ctx.outputLatency || 0)`.
⚠️ **`outputLatency` n'est pas implémenté par WebKit** : sur iPhone et iPad il
vaut `undefined`, donc `|| 0` ne compensait **rien**. Et le projet ouvre son
contexte en `latencyHint: 'playback'` (choix de robustesse Bluetooth, voir
`ensureAudio`), c'est-à-dire avec un gros tampon de sortie. Sur un téléphone, le
Mode jeu mesurait donc les frappes contre une horloge en avance de plusieurs
dizaines de millisecondes sur ce qu'on entend. Repli posé sur `baseLatency`
(largement supporté) : c'est un plancher, pas la vérité, mais infiniment mieux
que zéro.

#### 2. Ce qui reste ne se devine pas

La dalle tactile, le système, le casque : aucune API ne les déclare. **Un
calibrage** est donc ajouté — un métronome nu, douze clics, le joueur tape
dessus, et la médiane de ses écarts EST son décalage. Le réglage est persisté
sous sa propre clé (`ui/game/latence.svelte.ts`) : ce n'est ni de l'état de
morceau ni de la progression, c'est une propriété de **l'appareil** — un même
joueur sur deux appareils n'a pas le même décalage, un même appareil partagé par
deux joueurs a le même. Il vit donc hors du format v2, comme `paramHints` et
`lastTouched`.

**Le point de conception : `affiner` est ADDITIF, pas remplaçant.** Les frappes
d'une partie sont déjà corrigées par le réglage en place ; leur médiane est donc
ce qu'il RESTE à corriger. Remplacer effacerait la correction précédente et
ferait **osciller** le réglage d'une partie à l'autre au lieu de le faire
converger — un bug invisible à la lecture, visible seulement en jouant deux fois
de suite. `tests/latence.test.ts` le verrouille.

D'où aussi le raccourci après une partie : si l'écart médian dépasse 25 ms, un
bouton **« Compenser ce décalage »** propose de l'appliquer — la partie qui vient
d'être jouée est une mesure, autant s'en servir. Il efface les frappes affichées
au passage : elles ont été mesurées avec l'ANCIEN réglage, les garder montrerait
un biais qui n'existe déjà plus.

#### 3. « Trop dur » n'était pas qu'une affaire de latence

Le niveau 37 demandait de reproduire **à l'oreille** un rythme **jamais
entendu**, dès la première mesure. Écouter, retenir, placer : trois choses, pas
une. Le transport sépare donc désormais **« 🔊 Écouter la boucle »** (autant de
fois qu'on veut, les frappes ne comptent pas) de **« ⏺ Jouer (précompte) »**.
C'est ce que fait n'importe qui devant un instrument, et ça change plus le niveau
que n'importe quel réglage de tolérance. Tempo abaissé en complément : 84/92 →
72/80.

#### Ce que la vérification a coûté, et appris

Deux robots Playwright successifs ont donné des mesures **fausses** avant qu'un
troisième ne serve à quelque chose :

- le premier tapait sur sa propre horloge, pas sur les clics du métronome : sa
  phase dérivait de 70 ms par temps, la médiane d'une phase qui balaie ne veut
  rien dire ;
- le second tapait sur tous les pas en mode « à l'oreille » — puisque les repères
  y sont **cachés par conception**, `cibles` était vide et il frappait aussi les
  silences.

Le troisième est un test **différentiel** : même niveau, même robot, une fois à
0 ms et une fois à +80 ms de réglage. **Différence mesurée : −79 ms pour un
réglage de +80.** Signe et amplitude justes, sans dépendre de la précision
absolue du robot. Et le calcul lui-même (`ecartAuClic`) est sorti dans
`model/exercises.ts` et testé unitairement : c'est le seul endroit où une erreur
de signe rendrait le calibrage **pire** que pas de calibrage, en corrigeant à
l'envers.

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`latenceSortie` avec repli,
`latenceSortieMs`, `metronome`), `src/model/exercises.ts` (`ecartAuClic`),
`src/ui/game/latence.svelte.ts` (neuf), `src/ui/game/GameView.svelte` (écoute vs
jeu, panneau de calibrage, correction appliquée, bouton rouge d'enregistrement),
`src/model/presets/levels.ts` (tempo du 37, préambules), `tests/latence.test.ts`
(neuf), `tests/exercises.test.ts`.

**Vérifié :** `check` 0 erreur · **81 tests** · les deux builds · scénario
différentiel Playwright (−79 ms attendu −80) · calibrage complet dans le
navigateur (12 clics, médiane, application, persistance, relecture après
rechargement) · les frappes ne comptent pas pendant l'écoute ni pendant le
précompte · aucune erreur console · cibles tactiles : aucune sous 44×44 sur les
quatre pilotes, transport à cinq boutons compris.

### ✅ Étape 21 — la latence hors du Mode jeu, et un pad qui ne quantifiait pas (2026-08-21)

> « (parenthèse, c'est un pb qu'on a aussi lorsqu'on joue au pad dans les autres modes) »

**Deux problèmes différents sous le mot « latence », et il faut les séparer** —
c'est le point de fond de cette étape :

- **Déclencher un son** (pads du Mode Live, aperçu d'une ligne, note jouée au
  clavier) : la latence **ne se compense pas**. On ne peut pas jouer un son avant
  la frappe. La seule réponse est de la RÉDUIRE.
- **Mesurer un placement** (Mode jeu, et le pad d'écriture de l'Atelier qui range
  ce qu'on joue dans une case) : là, un décalage mesuré se retranche.

#### 1. Réduire — `latencyHint` de 'playback' à 'interactive'

La justification d'origine (« on programme tout en avance de toute façon ») est
juste pour le séquenceur — sa robustesse vient du lookahead de 0,25 s
(`SCHEDULE_AHEAD`), pas du tampon de sortie — et **fausse pour tout ce qu'on
frappe**. Mesuré dans Chromium :

| `latencyHint` | `baseLatency` | `outputLatency` |
|---|---|---|
| `playback` | 23,2 ms | **72 ms** |
| `interactive` | 10 ms | **32 ms** |

**40 ms rendus à chaque frappe**, dans tous les modes, avant la dalle tactile et
le Bluetooth.

#### 2. Compenser — le réglage devient commun à toute l'appli

`ui/game/latence.svelte.ts` → `ui/latence.svelte.ts`, chargé une fois au
démarrage (`App.svelte`) et non plus dans l'écran qui s'en sert en premier. Le
pad d'écriture de l'Atelier le retranche comme le fait le Mode jeu, et son repère
de pas passe de `performance.now()` (au moment où la frame rAF consomme
l'événement) à `ev.time`, le temps AUDIO programmé — la même faute que celle
corrigée à l'étape 18, au même endroit du raisonnement.

#### 3. Deux bugs trouvés en VÉRIFIANT, dont un antérieur et sérieux

**(a) `quantizeToStep` avalait silencieusement toute correction positive.** Son
garde-fou `elapsedMs < 0 → pas courant` datait d'un temps où un écoulement
négatif ne pouvait être qu'une absence de repère. Depuis qu'on retranche un
décalage, un écoulement négatif veut dire « la frappe appartient au pas
PRÉCÉDENT » — et c'est le cas qu'on cherche à traiter. Mesuré au navigateur : un
réglage de 400 ms écrivait **exactement les mêmes colonnes** que 0 ms. La
fonction arrondit désormais au plus proche dans les deux sens, en conservant le
contrat d'origine — **pile à la moitié on reste sur le pas courant** (`Math.round`
arrondit 0,5 vers le haut et cassait un test existant ; d'où un arrondi dont les
égalités vont vers zéro).

**(b) Le pad d'écriture n'a JAMAIS quantifié pendant la lecture.**
`synthStepAt` était un `const` — un objet **non réactif**. Le muter ne
redéclenche rien en Svelte 5 : l'expression `stepStartedAt={stepAt?.[name] ?? 0}`
était évaluée une fois, au premier rendu, quand la valeur valait encore 0, et ne
bougeait plus jamais. `quantizedCol()` prenait donc systématiquement son repli
`if (!stepStartedAt) return playheadCol` — **il écrivait sur le pas EN COURS**,
c'est-à-dire précisément le défaut que `engine/quantize.ts` a été écrit pour
éviter. Un module pur, correctement testé, branché sur une valeur morte. Ni les
tests ni l'écran ne pouvaient le dire.

#### Ce que la vérification a coûté

Six sondes Playwright successives avant d'obtenir une mesure exploitable, et à
chaque fois **c'est la sonde qui était fausse** : sélecteur attrapant la tuile
d'aide au lieu de l'onglet, `startsWith('🎹')` attrapant l'onglet au lieu du
bouton du pad, `page.goto` vers la même URL à ancre identique qui **ne recharge
pas** (donc le réglage n'était jamais relu), deux `replace` Python sans `assert`
qui n'ont rien remplacé en silence. La leçon est celle du projet, encore : une
sonde qui ne montre rien ne prouve rien tant qu'on n'a pas vérifié qu'elle
regarde au bon endroit.

Preuve finale, différentielle et instrumentée :

| Réglage | `ecoule` vu par le pad | Colonnes écrites |
|---|---|---|
| 0 ms | +276 ms | 1, 2, 3 |
| 400 ms | **−126 ms** | **0, 1, 2** |

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`latencyHint`),
`src/engine/quantize.ts` (arrondi bidirectionnel), `src/ui/latence.svelte.ts`
(déplacé depuis `ui/game/`), `src/App.svelte` (chargement au démarrage),
`src/ui/atelier/AtelierView.svelte` (`$state`, `ev.time`, `horloge`),
`src/ui/atelier/SynthModule.svelte` + `src/ui/sequencer/SynthRowView.svelte`
(transmission), `src/ui/sequencer/NotePad.svelte` (horloge audio + décalage),
`src/ui/game/GameView.svelte`, `tests/quantize.test.ts`, `tests/latence.test.ts`.

**Vérifié :** `check` 0 erreur · **87 tests** · les deux builds · essai
différentiel instrumenté ci-dessus · sondes retirées du code livré (0 `console.log`
dans `NotePad.svelte`).

#### 4. Le budget complet de latence d'un pad, chiffré

> « l'idée de pad, c'est de pouvoir jouer en direct donc s'il y a un décalage,
> il faut le réduire, ma question : est-ce possible ? »

Oui, et il y a **trois maillons** — dont deux réductibles :

| Maillon | Avant | Après | Réductible ? |
|---|---|---|---|
| Avance de déclenchement (code) | 20 à **50 ms** | **5 ms** | ✅ gratuit |
| Tampon de sortie (`latencyHint`) | 72 ms | 32 ms | ✅ fait, et encore possible |
| Dalle tactile / OS / Bluetooth | 20-200 ms | — | ❌ hors de portée |

**L'avance de déclenchement était le pire, et le plus bête.** Les sons joués à la
demande étaient programmés à `currentTime + 0,02` (`preview`), `+ 0,02`
(`playDegreePreview`), `+ 0,01` (SOLO du Mode Live) et **`+ 0,05` pour
`previewSynth`** — 50 ms de retard ajoutés au geste, empilés SUR la latence de
sortie. Constante unique `AVANCE_DECLENCHEMENT = 0,005 s` : Web Audio traite par
blocs de 128 échantillons (≈2,9 ms), deux blocs d'avance suffisent à garantir que
l'enveloppe démarre à sa première valeur au lieu d'être rattrapée en cours de
rampe — ce qui claque. C'est la seule raison d'être de cette avance.

Total d'un appui sur le pad synthé, hors matériel : **~122 ms → ~37 ms**.

**Le maillon qui reste, et son prix.** `latencyHint` accepte aussi un NOMBRE de
secondes. Mesuré dans Chromium :

| `latencyHint` | tampon | `outputLatency` |
|---|---|---|
| `'playback'` (l'ancien) | 1024 éch. | 72 ms |
| `'interactive'` (l'actuel) | 441 éch. | 32 ms |
| `0.001` | **128 éch.** | **8 ms** |

**Tranché : `0.001`.** La question posée par Yann est celle du SEUIL, pas du
réglage — « je veux juste pouvoir jouer sur le pad une mélodie […] sans me rendre
compte de la latence ». Or il existe, et c'est lui qui commande :

| Latence geste → son | Ressenti |
|---|---|
| **< 10 ms** | imperceptible |
| 10-20 ms | acceptable, on joue sans y penser |
| 20-30 ms | sensible sur les attaques franches |
| **> 30 ms** | on entend le décalage et on ralentit pour compenser |

(Wessel & Wright, *Problems and Prospects for Intimate Musical Control of
Computers*, 2002, et la pratique des studios. Deux nuances : les attaques
percussives — un pad, un piano — sont les plus sensibles, une nappe pardonne
bien plus ; et la GIGUE gêne davantage qu'un retard constant, parce qu'on
s'adapte à un retard fixe et jamais à un retard qui varie.)

`'interactive'` laissait le budget logiciel à 37 ms : **au-dessus du seuil**,
donc à côté de la demande. Seul `0.001` passe dessous. Vérifié dans l'appli
réelle, pas seulement sur un contexte témoin : `latencyHint: 0.001` → 128
échantillons, `outputLatency` 8 ms, contexte `running` et stable après cinq
secondes de lecture avec l'analyseur à 60 Hz, zéro erreur console.

**Budget logiciel final : ~122 ms → 13 ms** (5 ms d'avance + 8 ms de tampon).

⚠️ **Le prix, assumé et réversible en une constante.** À 128 échantillons le fil
audio n'a plus que ~2,9 ms pour remplir chaque bloc : sur un appareil faible ou
chargé, un dépassement s'entend comme un CLIC, pendant le jeu comme pendant la
lecture. Le lookahead (0,25 s) ne protège pas de ça — il garantit le PLACEMENT
des notes, pas le remplissage du tampon. `TAMPON_SORTIE` est la seule chose à
changer si des craquements apparaissent ; revenir à `'interactive'` rend 24 ms
et la robustesse avec.

⚠️ **Ce que ça ne règle pas.** Le Bluetooth : 100 à 200 ms qu'aucun code ne
touche.

⚠️ **Et une erreur à ne pas refaire, commise ici puis corrigée** (Yann :
« l'écran tactile induit une latence de 40 ms a minima ?? »). Les chiffres
publiés sur la « latence tactile » — 50 à 100 ms — mesurent presque toujours le
**touch-to-display** : doigt, digitaliseur, système, application, rendu,
composition, vsync, réponse de dalle. **La moitié de ce budget est le pipeline
graphique, que le pad ne traverse pas** : il va du doigt au son, sans passer par
l'écran. Ce qui compte ici est le **touch-to-event**, dominé par la fréquence
d'échantillonnage du digitaliseur (60 à 120 Hz, soit 8 à 16 ms de granularité)
plus la pile d'entrée : **plutôt 10 à 30 ms**.

Conclusion révisée : avec 13 ms côté logiciel, **un téléphone récent peut très
bien tomber dans la zone jouable**. Affirmer le contraire était une extrapolation
à partir du mauvais chiffre. Et il n'y a pas à en débattre : **ça se mesure**,
appareil par appareil, et le calibrage du Mode jeu mesure exactement ce
trajet-là. Depuis que la sortie est compensée à 8 ms près, l'écart médian qu'il
affiche est essentiellement la latence d'ENTRÉE de l'appareil plus le biais de
jeu du joueur.

**Reste aussi, et c'est une question de placement :** le calibrage n'est
atteignable que depuis les niveaux « jouer » du Mode jeu. Le réglage, lui, vaut
pour toute l'appli. Où poser l'entrée dans l'Atelier — menu Affichage, menu Aide,
onglet Production ?

### ⚠️ Étape 22 — la latence gagnée au prix du son, et le retour en arrière (2026-08-21)

> « ça marche très bien mais le son est devenu moche ! »

**Régression mise en ligne, corrigée dans la foulée.** L'étape 21 avait descendu
les deux réglages de latence au minimum : avance de déclenchement à 5 ms, tampon
de sortie à 128 échantillons. La latence est effectivement tombée à 13 ms — et le
son avec.

**Le mécanisme, et c'est le raisonnement qui était faux, pas le chiffre.** Toutes
les voix ouvrent sur une attaque de 3 à 4 ms :

```
g.gain.setValueAtTime(0.0001, time);
g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
```

Avec 5 ms d'avance, **l'attaque entière tient dans la marge**. Il suffit que le fil
principal prenne quelques millisecondes de retard entre la lecture de
`currentTime` et le rendu pour que `setValueAtTime` tombe dans le **passé** : Web
Audio l'applique alors immédiatement, la rampe est sautée, le gain saute d'un
coup — **un clic à chaque note**. Le tampon de 128 échantillons (2,9 ms pour
remplir chaque bloc) ne faisait qu'aggraver.

L'avance n'est donc pas du rembourrage de confort : **c'est la marge dont
l'enveloppe dépend pour exister**. La raccourcir revenait à supprimer l'attaque.

**Valeurs retenues :** avance **20 ms** (celle que `preview` portait déjà, et dont
on sait qu'elle sonne juste) et tampon **`'interactive'`** (441 échantillons,
32 ms mesurés — le préréglage que le navigateur dimensionne POUR l'audio
interactif). Budget logiciel **~122 ms → ~52 ms**. Moins bien que les 13 ms visés,
mais **13 ms qui claquent ne valent rien**.

**Verrouillé par un test.** `tests/latence-audio.test.ts` importe les deux
constantes (désormais exportées) et vérifie leur RAPPORT à l'attaque la plus
courte du banc de voix — au moins cinq fois sa durée — plus le fait que le tampon
reste un préréglage nommé et jamais `'playback'`. La prochaine tentative
d'optimisation butera sur une assertion au lieu d'aller s'entendre en production.

⚠️ **Et une bourde de méthode, à ne pas refaire.** La première version de ce test
grattait `AudioEngine.ts` avec une expression régulière et `node:fs`. Elle passait
`npm test` en local et a fait **échouer la CI** : `svelte-check` vérifie aussi les
fichiers de `tests/`, et les types Node ne sont pas installés. Cause réelle :
`npm run check` avait été lancé AVANT d'écrire le test, pas après — c'est
exactement ce que la règle « avant chaque commit » existe pour empêcher. Importer
les constantes plutôt que gratter la source supprime au passage deux fragilités
(le regex et la dépendance au chemin).

**Ce qu'il faudrait pour descendre plus bas — et c'est un chantier, pas un
réglage.** Rendre les enveloppes robustes à un démarrage tardif : caler chaque
départ sur `max(time, ctx.currentTime)` et recalculer la rampe depuis la valeur
courante du paramètre plutôt que depuis zéro. Tant que ce n'est pas fait, l'avance
de 20 ms est le prix du son, et il n'est pas négociable par une constante.

**Vérifié :** `check` 0 erreur · **92 tests** · les deux builds · contexte relu
dans l'appli réelle (441 échantillons, `outputLatency` 32 ms, `running` stable).

### ✅ Étape 23 — le calibrage inutilisable, et la note qui punissait l'apprentissage (2026-08-21)

> « les niveaux 37 et 38 sont tj trop compliqués, je n'arrive pas à faire
> fonctionner le réglage de latence »

Deux défauts, et **aucun des deux n'était un réglage de difficulté**.

#### 1. Le calibrage jetait les frappes en silence

Le métronome était une salve UNIQUE de douze clics (7,2 s), lancée à l'ouverture
du panneau, et `frapperCalibrage` **abandonnait sans rien dire** toute frappe hors
de cette fenêtre. Le temps de lire la consigne, la fenêtre était passée : le
compteur restait à zéro, et rien à l'écran n'expliquait pourquoi. Reproduit au
navigateur en attendant 10 secondes avant de taper — exactement le geste de
quelqu'un qui découvre l'écran.

Trois correctifs :
- **le métronome CONTINUE** — les salves s'enchaînent bout à bout (`apresQuoi`),
  sans rupture de phase, tant que le panneau est ouvert. La grille
  `debut + n × intervalle` reste vraie du début à la fin ;
- **plus aucune frappe jetée en silence** : avant le premier clic, le pad affiche
  « le métronome démarre… » au lieu d'ignorer ;
- **`await ctx.resume()`** au lieu de `void`. Un AudioContext fraîchement créé
  démarre suspendu : `currentTime` n'avance pas, et une salve programmée avant la
  reprise part sur une horloge figée.

Vérifié : ouverture du panneau, **10 s d'attente**, puis frappes → comptées ; et à
22 s le métronome tourne toujours. Avant, tout était perdu.

#### 2. La note moyennait TOUT le tour — on ne pouvait jamais réussir une mesure

`justesseDesFrappes` moyennait chaque frappe du tour, divisée par le plus grand du
nombre attendu et du nombre joué. Or **la boucle tourne en rond** : les
tâtonnements des premières mesures plombaient la note définitivement, et plus on
jouait, plus c'était dur. Il n'existait aucun moyen de « réussir une mesure », on
ne pouvait que diluer ses erreurs. **C'était la vraie difficulté**, bien avant les
seuils de tolérance ou le tempo.

La note est désormais celle de la **meilleure fenêtre de `attendues` frappes
CONSÉCUTIVES**. Une mesure propre suffit — ce qu'un joueur cherche précisément à
faire.

⚠️ **Règle changée en connaissance de cause.** Un test affirmait « marteler le pad
fait BAISSER la note » ; il est remplacé par deux assertions qui disent la
nouvelle intention : des tâtonnements suivis d'une mesure propre donnent 100 %, et
la fenêtre est **consécutive** — des bonnes frappes éparpillées ne suffisent pas,
sans quoi le martèlement serait récompensé.

#### 3. Le tempo, en complément — et un oubli

37 : 84/92 → 72/80 → **64/72**. Et surtout **38 était resté à 84/92** : le pilote
le plus RAPIDE des trois, alors qu'il demande de lire un motif *et* de le jouer.
Passé à **68/76**. C'est un oubli de l'étape 21, pas une décision.

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`metronome` asynchrone,
enchaînable), `src/model/exercises.ts` (`justesseDesFrappes` par fenêtre),
`src/model/presets/levels.ts` (tempos), `src/ui/game/GameView.svelte` (métronome
continu, état visible, jauge de progression), `tests/exercises.test.ts`.

**Vérifié :** `check` 0 erreur · **92 tests** · les deux builds · scénario
« j'attends 10 s puis je tape » au navigateur · niveau 38 gagné après des
tâtonnements suivis d'une mesure propre · aucune erreur console.

### ✅ Les quatre pilotes du Mode jeu sont VALIDÉS (2026-08-21)

> « ça a très bien fonctionné là »

Après la mise en ligne de l'étape 23 (calibrage continu + note à la meilleure
mesure). Les quatre pilotes — 35 « compléter », 36 « intrus », 37 « jouer à
l'oreille », 38 « jouer à vue » — sont jouables et jugés bons par Yann.

**Ce qu'il aura fallu, et l'ordre dans lequel c'est tombé** — utile parce que
trois de ces quatre causes n'étaient PAS ce qu'on regardait au départ :

| Symptôme rapporté | Cause réelle |
|---|---|
| « 37 trop dur » | on demandait de reproduire à l'oreille un rythme **jamais entendu** — il manquait « écouter » séparé de « jouer » |
| « il y a clairement une latence » | `outputLatency` **non implémenté par WebKit**, donc `\|\| 0` ne compensait rien |
| « le son est devenu moche » | l'avance de déclenchement descendue à 5 ms **mangeait l'attaque de 4 ms** des voix |
| « je n'arrive pas à faire fonctionner le réglage de latence » | le métronome ne durait que **7 s** et jetait les frappes suivantes en silence |
| « toujours trop compliqués » | la note moyennait **tout le tour** : impossible de réussir une seule mesure |

Aucune de ces cinq n'était un réglage de difficulté. La leçon de la série est
dans `CLAUDE.md` : quand un module pur et testé se comporte mal, **suspecter le
câblage** ; et ne jamais ignorer en silence un geste qu'on mesure.

**Ce qui reste sur le Mode jeu est désormais du CONTENU et des ARBITRAGES**, plus
de la mécanique — voir les chantiers ouverts ci-dessous.

### ✅ Étape 24 — trois verbes de PARAMÈTRE, pilotes en famille Timbre (2026-08-21)

> « il faut inventer des jeux séquence, timbre et filtre& espace, groove &
> variation humaine puis la même pour tout le synthé en friche encore »

**Trente et un boutons. Un jeu par bouton est ingérable** — et ce n'est pas ce
qu'il faut. Les quatre verbes existants comparent des GRILLES (juste ou faux) ;
ces familles sont des VALEURS CONTINUES. D'où une seconde famille de verbes,
**paramétrés par le bouton visé**, et la même progression rejouée dans chaque
panneau :

| Verbe | Ce qu'on demande | Ce que ça enseigne |
|---|---|---|
| `lequel` | trois versions, laquelle est « la plus … » | entendre la **direction** d'un bouton |
| `nommer` | deux sons, un seul réglage diffère — lequel ? | mettre un **nom** dessus |
| `regler` | un son cible, un curseur, retrouve la valeur | viser un **son**, pas un chiffre |

#### Le catalogue est le vrai travail — `src/model/parametres.ts`

Chaque bouton y porte ses bornes, son unité, et surtout **deux jugements
musicaux que le code ne peut pas deviner** : `tolerance` (en deçà de quel écart
deux réglages s'entendent pareil) et `ecartMini` (au-delà de quel écart la
différence est franche). Les changer change le jeu.

Trois pièges rencontrés, tous vérifiés avant d'écrire une ligne d'interface :

1. **Le filtre se compare en OCTAVES, pas en hertz.** 500 Hz d'écart à 800 Hz
   change tout ; les mêmes 500 Hz à 12 kHz sont inaudibles. Une tolérance en
   hertz serait fausse à un bout ou à l'autre. D'où `echelle: 'log'` et
   `ecartPercu`.
2. **Les identifiants doivent être les VRAIS champs de l'état.** J'avais écrit
   `lowpass` : le champ s'appelle `filterCutoff`. Un identifiant inventé règle un
   champ que personne ne lit — deux sons identiques, niveau impossible, et rien
   ne le dit. Un test parcourt le catalogue et vérifie chaque clé contre
   `defaultState()`.
3. **Un bouton ne s'entend pas sur toutes les lignes.** `tone` ne pilote qu'une
   saturation sur le kick, morte sous zéro (`if (tone > 0.03)`) ; sur snare et
   hat il déplace un filtre de ±1 octave, franc dans les deux sens. D'où le champ
   `lignes`, sans quoi le tirage pourrait poser un exercice sur un bouton inerte.
   Réverbe et Delay ont, eux, un `facteurEtat` : stockés en 0..1, montrés en
   pourcents.

#### Le tirage des versions, repris après échec du test

`tirerVersions` découpait d'abord l'étendue en tranches avec une marge de 15 %.
Le test l'a attrapé au premier essai : **deux versions à 14 points d'écart pour
une tolérance de 15**, donc une question dont la bonne réponse est un tirage au
sort. Remplacé par un espacement **garanti par construction** — valeurs posées à
intervalle exact, seule leur position d'ensemble est tirée au hasard. Le hasard
décide où, jamais si c'est audible.

Et l'arrondi : un paramètre logarithmique s'arrondit **au hertz**, pas au pas du
curseur. Près de 200 Hz, le pas de 100 Hz fait des sauts de 0,35 octave — toute
la tolérance d'un coup, ce qui pouvait à lui seul rapprocher deux versions en
deçà du discernable.

#### Ce que ça ajoute côté code

`ExerciseKind` gagne trois entrées (le compilateur a immédiatement réclamé les
messages d'échec manquants — l'exhaustivité fait son travail), `GameLevel` gagne
`familleParam`, le store gagne `preparerParametre` et une branche de
vérification, `buildState` un mode `'param'` qui ne fait sonner QUE la ligne
visée. Trois pilotes : 39, 40, 41.

**Écart de portée assumé :** seule la famille **Timbre** est servie. Filtre &
espace est déjà décrit dans le catalogue et ne demandera qu'un niveau de plus ;
Groove et Séquence demanderont d'étendre le catalogue à l'état global (swing,
traîne…) plutôt qu'à la ligne ; **le synthé est un autre type de ligne** et reste
le gros morceau — `CLAUDE.md` impose d'en cartographier les points de contact
avant d'y toucher.

**Remarque sur « Séquence », à trancher :** *Pas* et *Coups euclidiens* changent
la GRILLE — c'est déjà ce que « reproduire » enseigne, et un jeu de plus ferait
doublon. *Volume* seul est un mauvais exercice d'oreille. Il ne reste vraiment
que *Décalage*. La famille mériterait d'être fondue dans les verbes existants
plutôt que servie à part.

**Vérifié :** `check` 0 erreur · **119 tests** (dont 21 neufs sur le catalogue et
le câblage) · les deux builds · les trois écrans au navigateur, niveau 39 gagné ·
aucune cible tactile sous 44×44, aucun débordement à 390px · aucune erreur console.

## ⏳ Architecture du Mode jeu — proposition (EN ATTENTE D'ARBITRAGE, 2026-08-21)

> « il faut mettre tout à plat : on a plusieurs façons de jouer, des modules à
> débloquer, ça permet d'apprendre la MAO. on a des presets à reconstruire et
> comprendre et pourquoi pas jouer avec. on peut imaginer un jeu avec une
> histoire. un jeu où on devient le meilleur producteur ! on doit pouvoir créer
> un EP. et pourquoi pas le marketer ? »

⚠️ **Partiellement arbitré le 2026-08-23** — Yann : *« on part sur le scénario
pour le moment pour développer le mode jeu »*. Les questions **1 et 2** sont
donc tranchées (l'histoire est le contenant ; la fiction, c'est `HISTOIRE.md`
en entier) et la première tranche est livrée : voir
[« Mode carrière — la charpente en huit actes »](#-mode-carrière--la-charpente-en-huit-actes-actes-0-à-2-jouables-2026-08-23).
Les questions **3 et 4** restent ouvertes — elles portent sur les actes 4 et 6,
qui ne sont pas encore écrits. Le reste de cette section garde sa valeur
d'analyse ; ce qui a été fait AUTREMENT que proposé (deux axes et non trois, pas
de migration depuis `level`) est expliqué dans l'entrée ✅.

> 📖 **L'HISTOIRE est écrite, et elle vit dans [`HISTOIRE.md`](HISTOIRE.md)**
> (2026-08-22). Elle répond à la question 2 ci-dessous (« combien de fiction ? »)
> par un décor, quatre personnages et huit actes, sans inventer un seul mécanisme
> qui n'existe pas déjà ici. Les deux documents se lisent ensemble : celui-ci dit
> ce que le jeu FAIT, l'autre ce qu'il RACONTE.

### Le vrai blocage n'est pas le contenu, c'est un entier

`PlayerProgress.level` est **un seul nombre**, et il porte trois choses qui n'ont
rien à voir :

| Axe | Ce que c'est | Aujourd'hui |
|---|---|---|
| **Compétences** | 7 verbes × 5 familles de paramètres | fondu dans le numéro de niveau |
| **Accès** | Atelier, Synthé, Production, Live | seuil arbitraire sur ce numéro |
| **Motivation** | pourquoi continuer | étoiles, besace, piques |

Tant qu'il n'y avait qu'un verbe et une ligne droite, ça tenait. Ça ne tient
plus : un seul entier ne peut pas dire « il entend un filtre mais il n'a jamais
joué en rythme ».

### L'EP comme colonne vertébrale — et ici ce n'est pas décoratif

**L'appli fabrique déjà l'objet réel** : export MP3 reproductible à l'octet près,
partage par URL. « Tu as sorti un EP » n'est donc pas une métaphore — le joueur
repart avec de vrais fichiers et de vrais liens. Un jeu sur « devenir
producteur » qui ne produit rien serait creux ; celui-là n'a pas à l'être.

La campagne devient **la production d'un EP de 4 ou 5 titres**. Chaque titre est
un projet exigeant certaines compétences ; les exercices sont comment on les
acquiert ; les modules s'ouvrent **parce que le titre en a besoin**.

Ça règle le verrou d'un coup : « le niveau 12 ouvre le Synthé » est arbitraire ;
« ton morceau a besoin d'une basse, voilà le Synthé » est un moment de récit.
Même mécanisme, plus aucun nombre à justifier.

### L'arc, et une coïncidence qui n'en est pas une

| Titre | Ce qu'il enseigne | Ce qu'il ouvre |
|---|---|---|
| 1 · Le beat | rythme seul, kick/snare/hat | **Atelier** |
| 2 · La basse | tonalité, gamme, lignes tenues | **Synthé** |
| 3 · L'espace | filtre, réverbe, delay + check de mix | **Production** |
| 4 · Le groove | swing, traîne, ghost, humanisation | — |
| 5 · La sortie | jouer son morceau devant quelqu'un | **Mode Live** |

**Les cinq étapes tombent exactement sur les quatre modules verrouillés.** Ce
n'est pas un hasard heureux : le découpage modulaire de l'appli EST déjà une
progression pédagogique, et le verrou actuel essayait de dire ça avec des numéros
de niveau, faute de récit pour le porter.

### Les 34 presets sont l'actif le plus sous-employé

Chacun porte `label`, `cat` et un **paragraphe `history`**. Ils ne servent
aujourd'hui qu'à deux choses : cible de niveau, et indice « le plus proche ».

Ils peuvent être la **couche culture** : le brief du label, la discothèque de
référence, le vocabulaire. « Reconstruire un preset » cesse d'être un exercice
pour devenir une commande, et l'enchaînement par titre devient : *écoute ce
qu'est ce style* → *reconstruis-le* → *maintenant fais le tien*.

### Le problème le plus dur : noter la création

On ne peut pas noter une composition sur la ressemblance. Réponse proposée :
**on ne note pas le goût, on note le respect du BRIEF** — vérifiable
objectivement : tempo dans la fourchette, lignes exigées actives, densité
minimale, module fraîchement ouvert effectivement utilisé, durée. La voix des
roasts commente le reste sans que ça compte en étoiles. Et **c'est le joueur qui
choisit son single**, donc l'auto-évaluation remplace le jugement de la machine
là où la machine n'a rien à dire.

### Le marketing : la version qui marche, et celle qui tue le jeu

**Celle qui tue :** streams, argent, abonnés — une couche d'idle game dont les
chiffres montent sans rapport avec ce qu'on a fait. Ça transforme un jeu sur
l'oreille en tableur.

**Celle qui marche :** que chaque décision reste **musicale ou éditoriale**.

- **Choisir le single** — écouter son propre travail d'un point de vue critique,
  ce qu'aucun exercice ne fait faire.
- **Titre, pochette, nom d'artiste** — l'identité, peu coûteuse et mémorable.
- **Le public visé** — et il **change le retour reçu**. Un public club ne juge
  pas le kick comme un public casque.
- **La sortie** — le Mode Live devient la release party, usage narratif qu'il
  attend.

⚠️ **Le check de mix est réellement faisable.** L'analyseur est déjà branché sur
`finalGain`, et l'export produit déjà un buffer hors ligne : on peut **mesurer**
l'énergie par bande et la dynamique du rendu final. Le jeu dit alors « ton kick
est enterré » avec une mesure, pas avec une opinion.

### Ce que je refuserais

- **La monnaie.** Elle ajoute de la comptabilité, invite au grind, et remplace
  « j'ai fait un truc bien » par « j'ai assez farmé ». La besace couvre déjà la
  récompense, avec le bon ton et à coût nul.
- **Le scénario qui enferme l'outil.** L'Atelier est le but, pas la récompense.
  Le mode carrière est le chemin par défaut ; un **studio libre reste toujours
  atteignable**. Sinon on perd exactement les gens venus faire des beats.

### Le modèle qui remplace l'entier unique

```
competences : Record<CompetenceId, 0|1|2|3>   // verbe × famille, en étoiles
modules     : LockedModule[]                   // ouverts par le RÉCIT
carriere    : { titres: TitreEtat[], etape }
```

Les anciennes sauvegardes se dérivent de `level` — même exigence de
compatibilité que `deserialize` pour les fichiers v1/v2.

### Ce que deviennent les 41 niveaux existants

Rien ne se jette. Ils cessent d'être *la campagne* pour devenir **le réservoir** :
chaque titre exige des compétences, les exercices servent à les obtenir ou les
prouver. Un joueur qui sait déjà entendre un filtre passe au titre ; un autre va
s'entraîner. C'est ce que le modèle par compétences permet et que l'entier unique
interdisait.

### La première tranche livrable

Une refonte qui ne se livre pas par morceaux est un piège. Première tranche
proposée : **l'écran Projet et le titre 1 seulement** —

- le modèle de compétences + la migration des sauvegardes,
- un écran « EP en cours » listant les titres, verrouillés sauf le premier,
- titre 1 : brief → étude (un preset à reconstruire, ça existe déjà) →
  composition libre dans l'Atelier → vérification du brief → validation,
- l'Atelier s'ouvre **parce que le titre l'exige**.

Le reste — les quatre autres titres, le check de mix, le single, la pochette, le
public — vient après sans rien casser.

### ⏳ Les quatre questions à trancher (mes réponses recommandées en italique)

1. **L'EP est-il le contenant de toute la campagne, ou un mode à côté ?**
   *Contenant, avec les niveaux gardés en salle de répétition : l'EP donne le
   pourquoi, les exercices le comment.*
2. **Combien de fiction ?** *Minimale : un label pour le cadre, et la voix des
   roasts — qui existe déjà et qui est bonne — comme personnage. Pas de
   distribution ni de dialogues à embranchements, ce serait des semaines
   d'écriture et ça diluerait le ton.*
3. **Le joueur compose-t-il, ou reconstruit-il des presets imposés ?**
   *Il compose ; la reconstruction devient l'étude qui précède. Et la notation
   porte sur le brief, jamais sur le goût.*
4. **Le public/contexte change-t-il le jugement ?** *Oui, comme contrainte de
   MIX mesurée sur le rendu, pas comme jugement de goût. C'est l'idée la plus
   riche de la partie marketing, et la plus technique.*

---
