# État de l'art — les commandes du Mode Live

> Demandé par Yann le 2026-09-09 : *« ça manque d'énormément de paramètres dans
> le mode live. Le seul paramètre que j'utilise, c'est le filtre et le break.
> Rafale & fill : plutôt inaudible. Jouer à la main : inaudible. Cumuler les
> effets n'apporte pas grand chose et on perd en lisibilité : à supprimer. Ça
> manque de boutons où on règle un curseur, je ne comprends pas pourquoi ils ont
> disparu. Fais d'abord un benchmark avant de faire une vraie proposition. »*
>
> ⚠️ **Précision du même jour, et elle change l'axe de tout le document :**
> *« quand je disais inaudible, je voulais dire INUTILE VOIRE DÉSAGRÉABLE aux
> oreilles, c'était une manière de parler ».*
>
> La première version mesurait le NIVEAU et répondait à côté : un geste peut
> être parfaitement audible **et** musicalement faux. Le niveau reste au §1.A
> — il dit quand un geste n'arrive pas jusqu'à l'oreille, et il reste vrai —
> mais le vrai sujet est au §1.B.
>
> Ce document ne propose rien. Il mesure, il regarde ce que font les machines,
> il pose les questions à arbitrer. La proposition vient après, sur fiche
> annotable.

---

## 0. Le résumé en six lignes

1. **La rafale empile deux frappes AU MÊME INSTANT dès que le morceau swingue.**
   L'écart au pas suivant vaut `pas × (1/N − swing)` : il devient nul à swing
   25 % en ×4, puis négatif. Mesuré : **7 frappes empilées par mesure** à
   swing 25 %, **14** à 50 %, **21** à 75 %. Tout l'acte 2 enseigne le swing.
2. **La rafale fait de la bouillie que le moteur s'interdit ailleurs.** Le
   scheduler pose `MIN_ROLL_GAP = 45 ms` — *« en dessous, deux frappes de snare
   se confondent »* — et le FILL le respecte. **La rafale ne le consulte pas** :
   39 à 40 ms mesurés sur trois lignes de presets du catalogue.
3. **La rafale RETOURNE l'accent : −9,1 dB sur la frappe qui tombe sur le
   temps.** La rampe de vélocité part à 0,35 et monte à 1,0, donc tenir la
   rafale affaiblit le contretemps porteur et accentue ce qui est entre. Le
   groove s'écroule pendant qu'on tient le bouton.
4. **La frappe à la main n'est pas quantifiée du tout** — écart possible à la
   grille : ±81 ms (boom bap) à ±334 ms (motif d'accueil). Elle ne tombe pas
   « un peu à côté », elle tombe où le doigt tombe.
5. **Le FILL arrive 0,75 à 1,75 mesure après l'appui** (1,5 à 4,5 s), et ne
   touche que le dernier quart de mesure. On ne le PLACE pas — il arrive.
6. Et **les curseurs n'ont pas disparu** : la surface expose **2** commandes
   continues là où la catégorie en pose **8 ou 9**. Le mode FADER existe, 55
   axes existent, et le seul chemin est ⚙.

⚠️ **Ce que ça implique pour la suite, et qui n'est pas anodin :** deux des huit
pistes de la première version étaient à l'envers. « Faire passer la frappe à la
main devant le mix » rendrait plus SONORE une frappe qui tombe à côté — donc
plus désagréable, pas moins. Un geste faux qu'on amplifie reste faux.

---

## 1. Ce que nos gestes font vraiment — mesuré

`scripts/banc-live.cjs` (`npm run dev` puis `node scripts/banc-live.cjs`).
Cinq motifs, dont quatre presets du catalogue.

⚠️ **Compter les événements ne dit rien, ni sur un axe ni sur l'autre.** Une
rafale ×4 sur le charley fait passer une mesure de boom bap de 17 à 72 frappes :
au compte, un geste énorme. Au niveau, **0,0 dB**. À l'oreille, une bouillie
inégale. Trois mesures, trois réponses.

### 1.A — Ce qui arrive jusqu'à l'oreille (le niveau)

Repères : ~1 dB seuil de perception, ~3 dB nettement, ~6 dB franc.

| Geste | Ce qu'il change | Retard après l'appui |
|---|---|---|
| **BREAK** | **−21 dB** sur les 3/4 de la mesure | 0 à 1 mesure |
| **FILTRE** (pad) | tout le mix, en continu | aucun |
| **FILL** | +1,8 dB (house) à +12,4 dB (dembow), dernier quart seulement | **0,75 à 1,75 mesure** |
| **Rafale kick** | +1,6 à +7,9 dB dans le mix | 0,2 s puis 1 noire par cran |
| **Rafale caisse** | **+0,4 à +2,7 dB** dans le mix (mais +10 à +17 dB sur sa ligne) | idem |
| **Rafale charley** | **+0,0 dB** dans le mix, jusqu'à **−1,1 dB** sur sa ligne | idem |
| **Frappe main** (charley) | **10 à 19 dB SOUS** le mix | aucun |

Ce que ce tableau dit et ne dit pas. Il dit que **les deux gestes que Yann
utilise sont les deux seuls qui soient gros ET immédiats** — un break à −21 dB
pendant une mesure, personne ne peut le rater. Il dit aussi que le moteur fait
son travail : la caisse monte de +10 à +17 dB **sur sa ligne**, c'est le mix qui
l'avale.

Il ne dit **pas** pourquoi c'est désagréable. C'est le §1.B.

### 1.B — Ce qui rend un geste désagréable

#### B1. La rafale fait de la bouillie que le moteur s'interdit ailleurs

Intervalle médian entre deux frappes de rafale, en ms. `!` = sous les **45 ms**
que le scheduler se donne à lui-même.

```
motif                    ligne    ×2     ×3     ×4
défaut (Motown)          kick     250    167    125
défaut (Motown)          snare    250    167    125
défaut (Motown)          hat      333    222    167
Boom bap 90s             kick     161    108     81
Boom bap 90s             snare    161    108     81
Boom bap 90s             hat       81     54     40 !
House four-on-the-floor  kick     240    160    120
House four-on-the-floor  snare    240    160    120
House four-on-the-floor  hat      120     80     60
Trap moderne             kick     214    143    107
Trap moderne             snare    429    286    214
Trap moderne             hat      107     71     54
Dembow / reggaeton       kick      79     53     39 !
Dembow / reggaeton       snare     79     53     39 !
Dembow / reggaeton       hat      158    105     79
```

⚠️ **Le seuil existe déjà dans le code, et le FILL le respecte.**
`scheduler.ts` l. 128 : `const MIN_ROLL_GAP = 0.045; // en dessous, deux frappes
de snare se confondent`, utilisé juste après pour borner la rafale du fill
« dans la limite de ce que la durée permet **sans bouillie** ». Le chemin de la
rafale du Live (`forcedRoll`) passe à côté de cette borne : il applique le
multiplicateur tel quel. Ce n'est pas un désaccord de goût, c'est **la même
équipe qui a écrit la règle et le chemin qui l'ignore.**

À 39 ms sur un kick dont l'enveloppe dure plus longtemps que ça, les coups ne se
succèdent pas : ils s'additionnent. C'est ce que dit l'autre mesure — +15,6 dB
sur la ligne de kick du dembow.

#### B2. ⚠️ La rafale empile deux frappes au même instant dès qu'il y a du swing

La rafale subdivise le pas **linéairement** (`rollDur = stepDur / roll`) alors
que le swing **retarde le départ** du pas impair. L'écart entre la dernière
frappe de la rafale et la première frappe du pas suivant vaut donc :

```
écart = pas × (1/N − swing)
```

Il s'annule quand `swing = 1/N`, et devient **négatif** au-delà : la rafale
déborde sur le pas suivant. Mesuré sur le boom bap, ligne de charley :

```
swing  0 %  ×2 : IOI 81 à  81 ms    empilées : 0
swing  0 %  ×4 : IOI 40 à  40 ms    empilées : 0
swing  8 %  ×2 : IOI 68 à  94 ms    empilées : 0      <- le preset livré
swing  8 %  ×4 : IOI 27 à  53 ms    empilées : 0      <- déjà inégal, et sous 45 ms
swing 25 %  ×4 : IOI  0 à  81 ms    empilées : 7  !
swing 50 %  ×2 : IOI  0 à 161 ms    empilées : 7  !
swing 50 %  ×4 : IOI  0 à 121 ms    empilées : 14 !
swing 75 %  ×4 : IOI  0 à 161 ms    empilées : 21 !
```

Deux frappes au même instant sur la même voix, ce n'est pas un flam : c'est le
même échantillon doublé, +6 dB d'un coup, une attaque épaissie. Vingt et une
fois par mesure au swing maximum.

Et même sans empilement, le cas courant est déjà mauvais : à **swing 8 %**, qui
est ce que le preset boom bap livre, la rafale ×4 donne des intervalles de
**27 à 53 ms** — irréguliers, et la moitié sous le plancher de bouillie. Ce
n'est pas un roulement, c'est un tremblement.

⚠️ Le swing est le sujet de tout l'acte 2 du Mode jeu. Le geste de scène le plus
évident casse précisément sur la première chose que le jeu enseigne.

#### B3. ⚠️ La rafale RETOURNE l'accent

Gain de la frappe qui tombe **sur le temps**, rafale ×4 tenue :

```
défaut (Motown)          0,90 -> 0,32    −9,1 dB
Boom bap 90s             0,90 -> 0,32    −9,1 dB
House four-on-the-floor  0,80 -> 0,28    −9,1 dB
Trap moderne             0,95 -> 0,33    −9,1 dB
Dembow / reggaeton       0,90 -> 0,32    −9,1 dB
```

La rampe de vélocité va de 0,35 à 1,0 sur la durée du pas. Elle a du sens pour
une **montée vers** quelque chose — c'est le fill. Tenue en boucle, elle fait
l'inverse de ce qu'un pupitre demande : **la frappe qui porte le temps devient
la plus faible de la mesure**, et l'accent part sur ce qui est entre les temps.
Le groove ne se densifie pas, il se dissout. Neuf décibels, à chaque pas, tant
qu'on tient.

C'est probablement le « désagréable » le plus direct des trois.

#### B4. La frappe à la main n'est pas quantifiée

`AudioEngine.preview()` joue la voix à `currentTime + 8 ms`. Il n'existe **aucune
quantification, aucun aimant, aucun réglage** — l'écart maximum à la grille est
un demi-pas :

```
défaut (Motown)          pas de charley 667 ms  ->  ±334 ms
Boom bap 90s             pas de charley 161 ms  ->  ±81 ms
House four-on-the-floor  pas de charley 240 ms  ->  ±120 ms
Trap moderne             pas de charley 214 ms  ->  ±107 ms
Dembow / reggaeton       pas de charley 316 ms  ->  ±158 ms
```

⚠️ **Et le Mode Live est le seul écran qui mesure une frappe sans rien en
faire.** Le Mode jeu a tout l'appareillage : `ui/game/latence.svelte.ts` calibre
le décalage de l'appareil, `justesseDesFrappes` juge le placement,
`quantize.test.ts` verrouille la règle. Rien de tout ça n'est branché ici. La
frappe à la main du Live est la seule du projet qui tombe où elle tombe.

Ajouté à ça : `preview()` ne déclenche pas le sidechain (`onSidechainTrigger`
n'existe que dans le chemin de l'ordonnanceur), donc un kick joué à la main ne
fait pas respirer la basse alors que son jumeau programmé le fait. Il sonne à la
fois **à côté** et **plus petit**.

#### B5. Le FILL n'est pas mauvais — il est impossible à placer

Le fill, lui, respecte `MIN_ROLL_GAP` : ce n'est pas de la bouillie. Ses défauts
sont ailleurs, et ils suffisent.

- **Il arrive 0,75 à 1,75 mesure après l'appui.** `liveRequestFill()` lève un
  drapeau, `tick` ne le consomme qu'au passage de mesure suivant, et le fill ne
  touche alors que le dernier quart de CETTE mesure. Soit 1,5 à 3,5 s à
  120 BPM, 1,9 à 4,5 s à 93 BPM.
- **C'est toujours le même fill** : une montée sur le dernier quart de la
  caisse, plus des claps ajoutés. Aucun choix, aucune variante.
- **Il ne touche qu'un quart de mesure**, donc sur un motif régulier il pèse
  +1,8 dB — rien.

Un fill qu'on ne place pas n'est pas un fill, c'est un accident qui arrive.
C'est exactement la différence avec le BREAK, qui prend la mesure entière au
prochain temps fort.

#### B6. CHAOS

`triggerChaos` tire un axe au hasard parmi 55 et lui donne une valeur au hasard.
**43 de ces 55 axes sont des réglages de VOIX de synthé** (`VIBRATO BASSE`,
`FERM. FILTRE NAPPE`…). Un appui a donc ~4 chances sur 5 de bouger un paramètre
de voix, souvent sur une ligne muette, et rien à l'écran ne dit lequel. Par
construction, on ne peut pas apprendre ce que fait ce bouton.

### 1.C — Bilan : la surface par défaut

Les six boutons livrés sont BREAK · FILL · KICK · CAISSE · CHARLEY · CHAOS.

| Bouton | Ce qu'il fait vraiment |
|---|---|
| BREAK | franc et immédiat — **il marche** |
| FILL | +1,8 à +12,4 dB, **1,5 à 4,5 s trop tard**, toujours le même |
| KICK | frappe hors grille ; rafale en bouillie sur deux presets, accent retourné |
| CAISSE | frappe hors grille ; rafale à +0,4 dB dans le mix, accent retourné |
| CHARLEY | frappe **19 dB sous le mix** ; rafale à 27–40 ms, tremblante |
| CHAOS | tire dans 55 axes dont 43 de préparation, sans rien dire |

Plus le pad, qui porte le seul vrai paramètre. **Un bouton sur six tient sa
promesse.**

---

## 2. Ce que les machines mettent sous les doigts

### 2.1 Le compte, avant tout le reste

| Machine | Commandes CONTINUES toujours présentes sur la surface |
|---|---|
| Novation **Circuit Tracks** | **8** encodeurs macro + **1** filtre master à cran central |
| Ableton **Rack** (défaut) | **8** macros (jusqu'à 16) |
| Roland **TR-8S** | **1 knob CTRL assignable par instrument** (11) + master |
| Pioneer **DJM** | **1 knob Color FX par voie** + 1 knob de paramètre |
| NI **Maschine** MK3 | **8** encodeurs + 1 ruban tactile (Perform FX) |
| **Face B — Mode Live** | **2** (les axes X et Y du pad, un seul doigt) + volume master |

Le catalogue en contient 55 ; la surface en montre 2, sur le même doigt : on ne
peut pas balayer le filtre et pousser la réverbe indépendamment.

⚠️ Le filtre master de Circuit est décrit comme « **toujours actif** », avec un
cran central. Aucune machine ne demande d'aller le chercher.

### 2.2 Les quatre mécaniques que la catégorie a standardisées

**a) Le NOTE REPEAT à division CHOISIE.** MPC : on tient le bouton Note Repeat
et on frappe un pad ; **le taux suit la quantification courante** (1/8, 1/16,
1/32, triolets), et un mode *latch* évite de tenir. C'est l'outil qui fait les
charleys en triolets du hip-hop.

→ C'est le contre-modèle exact de notre rafale sur les quatre points mesurés :
la division est **choisie** (pas d'escalade automatique ×2→×3→×4 à une noire par
cran), elle est **musicale** (1/32, pas « le pas divisé par 4 », donc jamais 27
ms), elle **répète la frappe qu'on tient** au lieu de remplir toute la ligne, et
elle est **quantifiée**, donc elle ne peut pas déborder sur le pas suivant.

**b) Le FILL qui répond TOUT DE SUITE.** TR-8S : *« par défaut le bouton de fill
manuel fonctionne comme sur la 808 : appuyé vers le DÉBUT d'une mesure il met en
file un fill d'une mesure entière ; appuyé vers la FIN il déclenche un fill
partiel immédiat. »* Et on **choisit** le fill : deux motifs utilisateur, l'effet
Scatter, ou n'importe quelle variation.

→ Notre retard est un problème résolu en 1980, et notre fill unique est une
variante sur les huit qu'une 8S propose.

**c) Le MOMENTANÉ À POSITION.** Maschine : *« par défaut les Perform FX sont en
mode **Touch Enable** : on entre, on ajoute un intérêt momentané, on lâche, et on
revient au signal propre. »* Le geste est **un maintien ET un curseur** — la
position dose, le relâché rend le morceau.

→ Nos six MAINTENUS font l'aller-retour sans la dose ; nos faders font la dose
sans l'aller-retour. Ailleurs, c'est le même contrôle.

**d) La MACRO NOMMÉE, pas l'empilement d'étiquettes.** Circuit pilote « n'importe
quels quatre paramètres depuis chaque knob, avec réglage individuel de plage et
de profondeur ». Ableton pose 8 macros par défaut, extensibles à 16. Dans les
deux cas le contrôle porte **un nom**, et les destinations sont un réglage
interne avec leur propre course.

→ Ce qu'on a fait n'est pas la macro de l'état de l'art, c'est sa caricature :
`FILTRE + REVERB` écrit sur un bouton de 127 px. La demande de suppression tient
sur le fond comme sur la forme.

### 2.3 Deux confirmations pour ce qu'on a déjà

- **Les snapshots.** Ableton stocke des « variations » de macros ; Maschine
  jusqu'à 64 snapshots rappelables aux pads. Notre mécanique est dans la norme.
- **Le tirage au hasard.** Ableton a un bouton *Rand* qui randomise les macros
  mappées, lui-même assignable à un contrôleur. Le 🎲 (« le random marche très
  bien ») a un précédent exact. ⚠️ Mais chez Ableton il tire dans **les macros
  mappées**, c'est-à-dire dans ce qu'on a soi-même choisi de mettre sous les
  doigts — pas dans 55 paramètres dont 43 de préparation. C'est toute la
  différence avec notre CHAOS.

### 2.4 Et le filtre, encore

Le filtre est décrit comme *« le seul knob qui peut vous faire sonner comme un
pro : contrairement à l'EQ qui découpe des bandes fixes, il balaie tout le
morceau, l'amincit ou le passe sous l'eau d'un seul geste »*. Sur les tables
Pioneer, c'est une **rangée de knobs, un par voie**, toujours visibles.

⚠️ Donc *« le seul paramètre que j'utilise, c'est le filtre »* n'est pas un aveu,
c'est le résultat attendu. La question n'est pas pourquoi il n'en utilise qu'un
— c'est pourquoi il n'y en a qu'un.

---

## 3. Pourquoi les curseurs ont « disparu »

Ils n'ont pas disparu. **Mesuré dans le navigateur, en 844 × 390 :**

- surface de jeu : **6 boutons en mode ACTIONS, 0 en mode FADER**, 1 pad,
  1 volume master ;
- loquet ASSIGNER + tap sur un bouton → sélecteur « BOUTON 1 — plusieurs
  possibles », **31 entrées, toutes des ACTIONS**, et **aucun bouton ne
  mentionne FADER** ;
- le seul chemin vers un curseur : ⚙ → ASSIGNATION → basculer « ⏻ ACTIONS » en
  « ≈ FADER » sur la ligne du bouton → rouvrir le sélecteur → choisir un axe →
  refermer. **Six gestes, dans un menu.**

⚠️ C'est une violation directe de la règle que ce mode s'est donnée : *« Rien de
ce qui se fait EN JOUANT ne vit derrière ⚙ »*. Le loquet ASSIGNER a été écrit
pour la faire respecter — et il ne montre que la moitié du catalogue. Le défaut
livré met les six boutons en mode ACTIONS, donc **personne ne rencontre jamais un
fader** sans passer par les réglages.

Quatrième épisode du même problème dans ce mode : ce qui n'est pas ÉCRIT sur la
surface n'existe pas. Les trois premiers étaient des appuis longs ; celui-ci est
un mode caché.

### Le catalogue, en chiffres

| | nombre |
|---|---|
| ACTIONS (boutons) | **30** — 4 déclencheurs, 4 bascules, 9 pas, 8 maintenus, 5 lignes |
| AXES (continus) | **55** |
| … dont réglages de VOIX de synthé | **43** (78 %) |
| … dont macros de scène (filtre, réverbe, groove, bus, mix) | **12** |
| Emplacements sur la surface | **6** boutons + 2 axes de pad + 1 inclinaison |

Deux lectures. **On a 12 vraies macros de scène et on en montre 2.** Et
**43 axes sur 55 sont de la préparation** — un `VIBRATO NAPPE` ne se règle pas en
plein morceau. C'est exactement le principe que la cure du 2026-09-02 avait posé
pour les BOUTONS en s'interdisant explicitement de l'appliquer aux axes :
*« un balayage de cutoff sur la basse EST un geste de scène »*. C'est vrai du
cutoff ; ce n'est pas vrai des treize autres réglages par voix.

---

## 4. Le diagnostic

Le Mode Live a un catalogue de studio et une surface de scène. Quatre symptômes,
et le premier est le plus grave parce qu'il ne se corrige pas en ajoutant :

1. ⚠️ **Les gestes rythmiques sont musicalement faux.** Ce n'est pas une
   question de dosage : la rafale ignore un plancher que le moteur applique
   ailleurs, empile des frappes dès qu'il y a du swing, et retourne l'accent de
   9 dB. La frappe à la main n'est quantifiée par rien alors que le Mode jeu a
   toute la machinerie pour ça. **Aucun de ces quatre défauts ne se répare en
   montant le gain — trois se réparent dans la programmation des notes.**
2. **Trop peu de continu.** 2 commandes contre 8 ou 9 partout ailleurs, sur le
   même doigt, alors que 12 macros de scène existent déjà dans le code.
3. **Ce qui est riche est caché.** 55 axes, un seul chemin, six gestes dans ⚙.
4. **Rien ne se règle par LIGNE.** Filtre, réverbe, saturation sont globaux. La
   table de mixage DJ pose un filtre par voie — c'est ce qui permet de filtrer
   la basse en gardant le kick net.

---

## 5. Les pistes que le benchmark ouvre — à arbitrer, pas encore proposées

Rien n'est décidé. Chacune sera une carte de la fiche annotable. Elles sont
classées par **rapport effet / risque**, pas par ambition.

**P1 — Réparer la rafale (quatre corrections, un seul chemin de code).**
Borner par `MIN_ROLL_GAP`, l'aligner sur le swing (ou la quantifier), et arrêter
de retourner l'accent — une rafale tenue devrait garder le temps fort et
accentuer la fin, pas l'inverse. Aucune décision de produit là-dedans : c'est du
code qui contredit une règle que le projet a déjà écrite. **La première chose à
faire.**

**P2 — Le FILL de la 808.** Appui tôt dans la mesure = fill d'une mesure entière
en file ; appui tard = fill partiel immédiat depuis l'instant de l'appui.
Supprime le retard de 1,5 à 4,5 s. Question ouverte : faut-il aussi plusieurs
fills, comme la 8S en propose huit ?

**P3 — Quantifier la frappe à la main.** ⚠️ **Piste corrigée.** La première
version disait « la faire passer devant le mix (accent, sidechain) » : une
frappe qui tombe à ±120 ms de la grille, amplifiée, est plus désagréable, pas
moins. L'ordre est donc : d'abord un aimant vers le pas le plus proche (avec le
décalage calibré du Mode jeu, qui existe), ensuite seulement la question du
niveau. Et à décider : aimant toujours, ou réglable (une machine sérieuse
propose les deux).

**P4 — Faire de la surface une rangée de curseurs.** Passer le défaut de 6
boutons / 0 fader à un mélange, et rendre la bascule ACTIONS/FADER atteignable
depuis ASSIGNER. Coût nul côté moteur, le mode fader existe. Question ouverte :
combien de curseurs tiennent en 844 × 390 à côté du séquenceur et du pad.

**P5 — Fusionner MAINTENU et CURSEUR (le Touch Enable de Maschine).** Toucher
engage, la position dose, le relâché rend le morceau. Remplace les six maintenus
binaires ET les faders par un seul type de contrôle.

**P6 — Supprimer l'empilement affiché** (demandé). Et décider si la macro nommée
à destinations réglées reviendra un jour, ou si le sujet est clos.

**P7 — CHAOS ne tire que dans les 12 macros de scène**, et dit ce qu'il a tiré.
Sinon c'est un bouton qu'on n'apprend jamais. Chez Ableton, *Rand* tire dans les
macros qu'on a soi-même mappées.

**P8 — Du réglage PAR LIGNE.** Le filtre par voie de la table de mixage. Le plus
gros des huit, et le seul qui touche le graphe audio.

---

## 6. Les questions qui n'ont pas de réponse par défaut

1. **La rafale se répare ou se remplace ?** P1 corrige ce qu'on a. Le note
   repeat de la MPC est un autre geste : division choisie, frappe répétée, latch.
   Les deux se tiennent — le second est plus juste et plus cher.
2. **Trois curseurs, ou six ?** Le Mode Live garde-t-il des boutons de geste, ou
   devient-il une rangée de curseurs avec deux ou trois déclencheurs ?
3. **La frappe à la main est-elle aimantée par défaut ?** Aimanter, c'est
   corriger le joueur — dans un jeu qui note le placement par ailleurs, ce n'est
   pas neutre.
4. **Le réglage par LIGNE est-il dans le périmètre ?** Seul point qui demande de
   toucher `buildGraph`, donc le seul qui ne soit pas un après-midi.

---

## Sources

- [Novation Circuit Tracks — Sound On Sound](https://www.soundonsound.com/reviews/novation-circuit-tracks) ·
  [aperçu matériel, guides Novation](https://userguides.novationmusic.com/hc/en-gb/articles/25494476280850-Circuit-Tracks-hardware-overview)
- [Roland TR-8S — créer et jouer les fills](https://rolandcorp.com.au/blog/the-ultimate-guide-to-the-tr-8s-rhythm-performer-creating-and-playing-fills) ·
  [assigner et automatiser les knobs CTRL](https://rolandcorp.com.au/blog/the-ultimate-guide-to-the-tr-8s-rhythm-performer-assign-and-automate-the-control-knobs) ·
  [choisir une variation de fill-in](https://rolandus.zendesk.com/hc/en-us/articles/360006803271-TR-8S-Selecting-a-Fill-In-Variation)
- [Akai MPC — Note Repeat (guide utilisateur)](http://www.akai-pro.jp/mpc-one/data/MPC-User-Guide_small-v2.7.2) ·
  [tutoriel Note Repeat](https://www.topbeatmakers.com/akai-mpc-1-9-6-tutorial-how-to-use-note-repeat/)
- [Native Instruments Maschine MK3 — Perform FX](https://manualzz.com/doc/o/130457/native-instruments-maschine-mk3-manual-perform-fx) ·
  [Maschine+ overview](https://www.native-instruments.com/ni-tech-manuals/maschine-plus-manual/en/maschine--overview)
- [Ableton — Racks, macros et variations](https://www.ableton.com/en/manual/instrument-drum-and-effect-racks/) ·
  [FAQ macros et variations](https://help.ableton.com/hc/en-us/articles/360019103480-Macros-and-Variations-FAQ)
- [Teenage Engineering — guides Pocket Operator](https://teenage.engineering/guides/po-33/en)
- [Pioneer DJ / DJM — Sound Color FX](https://www.virtualdj.com/manuals/hardware/pioneer/djm850/layout/colorfx.html) ·
  [le filtre, un knob qui raconte](https://djlearn.de/en/how-to-use-filters-dj)

## Reproduire les mesures

```bash
npm run dev                  # dans un terminal
node scripts/banc-live.cjs   # §A le niveau, §B la bouillie / l'empilement /
                             # l'accent retourné / le hors-grille
```
