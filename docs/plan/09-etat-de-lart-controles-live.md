# État de l'art — les commandes du Mode Live

> Demandé par Yann le 2026-09-09 : *« ça manque d'énormément de paramètres dans
> le mode live. Le seul paramètre que j'utilise, c'est le filtre et le break.
> Rafale & fill : plutôt inaudible. Jouer à la main : inaudible. Cumuler les
> effets n'apporte pas grand chose et on perd en lisibilité : à supprimer. Ça
> manque de boutons où on règle un curseur, je ne comprends pas pourquoi ils ont
> disparu. Fais d'abord un benchmark avant de faire une vraie proposition. »*
>
> Ce document ne propose rien. Il mesure ce que nos gestes font vraiment, il
> regarde ce que font les machines, et il pose les questions à arbitrer. La
> proposition vient après, sur fiche annotable.

---

## 0. Le résumé en cinq lignes

1. **Aucune des cinq remarques n'est une impression : les cinq se mesurent**, et
   les chiffres sont plus durs que les mots. La rafale de charley change le mix
   de **0,0 dB**. Une frappe de charley à la main arrive **10 à 19 dB SOUS** le
   mix. Le FILL s'entend **1,5 à 4,5 s après l'appui**.
2. **Le Mode Live expose 2 commandes continues** (les deux axes du pad, un seul
   doigt) là où la catégorie en pose **8 ou 9**, toujours visibles.
3. **Les curseurs n'ont pas disparu — ils n'ont jamais été atteignables en
   jouant.** Le mode FADER existe, 55 axes existent ; le seul chemin est ⚙.
   Mesuré : ASSIGNER sur un bouton propose **31 entrées, dont 0 axe**.
4. **Ce que Yann utilise est exactement ce que la catégorie considère comme
   l'essentiel** : le filtre balayé (le knob le plus utilisé du DJing) et une
   coupure franche. Ce n'est pas un usage pauvre, c'est le seul qui soit servi.
5. **« Cumuler » n'est pas absurde en soi — mais personne ne cumule des
   ÉTIQUETTES.** Circuit et Ableton empilent jusqu'à 4 destinations sous **un
   seul nom choisi**. Nous affichons `FILTRE + REVERB` sur un bouton de 127 px.

---

## 1. Ce que nos gestes font vraiment — mesuré, pas relu

Méthode : `scripts/banc-live.cjs` rend le motif hors ligne deux fois, sans puis
avec le geste, et compare les **niveaux**. Repères d'écoute : ~1 dB est le seuil
de différence perceptible sur un large bande, ~3 dB s'entend nettement, ~6 dB est
un geste franc. Cinq motifs, dont quatre presets du catalogue.

⚠️ **Compter les événements aurait menti.** Une rafale ×4 sur le charley
multiplie les frappes par quatre (17 → 72 sur une mesure de boom bap) : au
compte, c'est un geste énorme. Au niveau, c'est **zéro**. Même piège que
`params-alea.test.ts`, pris par l'autre bout.

### 1.1 Les deux gestes qui marchent — et pourquoi

| Geste | Ce qu'il change | Retard après l'appui |
|---|---|---|
| **BREAK** | **−21 dB** sur les 3/4 de la mesure | 0 à 1 mesure |
| **FILTRE** (pad) | tout le mix, en continu | aucun |

Un geste de scène se reconnaît à ça : **il est gros, il est immédiat, et il
porte sur tout.** −21 dB pendant une mesure et demie de musique, personne ne peut
le rater. Ce ne sont pas les deux préférés de Yann, ce sont les deux seuls qui
remplissent le contrat.

### 1.2 FILL — trop tard, et trop peu

```
motif                    effet sur le dernier quart de mesure
défaut (Motown)          +2,3 dB
House four-on-the-floor  +1,8 dB      <- sous le seuil de perception
Boom bap 90s             +6,2 dB
Trap moderne            +10,6 dB
Dembow / reggaeton      +12,4 dB
```

Deux défauts, et le second est le vrai.

**Il ne porte que sur le dernier quart de mesure.** Sur un motif régulier — la
house, notre motif d'accueil — il ajoute **1,8 dB**, c'est-à-dire rien.

⚠️ **Il arrive entre 0,75 et 1,75 mesure après l'appui.** `liveRequestFill()`
lève un drapeau ; `AudioEngine.tick` ne le consomme qu'au passage de mesure
suivant ; et le fill ne touche alors que le dernier quart de CETTE mesure. Soit,
à 120 BPM, **1,5 à 3,5 s** ; à 93 BPM (boom bap), **1,9 à 4,5 s**. À cette
distance, l'oreille n'attribue plus l'effet au geste — c'est la définition
d'un bouton mort, même quand il fait +12 dB.

Le BREAK, lui, s'applique au début de la mesure suivante et change la mesure
ENTIÈRE. Même mécanique d'attente, dix fois plus lisible.

### 1.3 RAFALE — deux boutons sur trois ne s'entendent pas

Rafale ×4, en dB. « mix » = ce qu'on entend ; « sa ligne » = la même mesure avec
les autres lignes coupées, pour montrer que le moteur fait bien son travail.

```
motif                    KICK             CAISSE           CHARLEY
                         mix / sa ligne   mix / sa ligne   mix / sa ligne
défaut (Motown)          +7,9 / +9,4      +2,7 / +6,3      +0,0 / +5,0
Boom bap 90s             +4,4 / +10,6     +1,4 / +10,3     +0,2 / +6,5
House four-on-the-floor  +1,6 / +5,1      +0,4 / +6,3      +0,0 / −0,7
Trap moderne             +4,2 / +10,6     +0,5 / +10,2     +0,0 / +3,1
Dembow / reggaeton       +5,0 / +15,6     +1,2 / +16,8     +0,0 / −1,1
```

⚠️ **Le charley est à +0,0 dB dans le mix sur quatre motifs sur cinq**, et sur sa
propre ligne il descend jusqu'à **−1,1 dB** : la rafale le rend parfois plus
FAIBLE. Deux causes cumulées — la ligne est déjà en doubles-croches, donc ×4
donne des quadruples-croches que l'oreille lit comme un bruit et non comme une
rafale ; et la rampe de vélocité part à 0,35, donc trois frappes sur quatre sont
plus faibles que celle qu'elles remplacent.

La caisse claire monte de +10 à +17 dB **sur sa ligne** et de +0,4 à +2,7 dB
**dans le mix** : le moteur fait ce qu'on lui demande, le mix l'avale. Seul le
kick passe (+1,6 à +7,9).

Ajouté à ça, la rafale n'est pas jouable : elle s'installe seule après 0,2 s de
maintien, puis monte ×2 → ×3 → ×4 **à raison d'une noire par cran**. Il faut
tenir 1,2 s pour atteindre ×4, et on ne choisit jamais la division.

### 1.4 JOUER À LA MAIN — trois lignes sur cinq sont sous le mix

Une frappe posée hors grille (3/8 de mesure + 1/32), pesée contre le mix sur la
même fenêtre de 150 ms. Un chiffre négatif = **la frappe est plus faible que ce
qui joue déjà**.

```
motif                    kick    caisse  charley  clap    shaker
Boom bap 90s             +8,4    +2,9    −10,0    −5,9    −5,1
House four-on-the-floor  +5,1    −2,1    −19,0    −11,1   −11,0
Trap moderne            +17,4   +10,5     −3,5    +4,0    +3,8
Dembow / reggaeton       +8,8    +1,7    −16,1   −10,3   −14,1
```

⚠️ **Le charley joué à la main est 10 à 19 dB sous le mix.** Ce n'est pas
« discret », c'est masqué. `preview()` joue la voix au volume NOMINAL de la
ligne — le même que les frappes programmées — sans accent, sans quantification,
et **sans déclencher le sidechain** (`onSidechainTrigger` n'existe que dans le
chemin de l'ordonnanceur). Une frappe de kick à la main ne fait donc pas
respirer la basse, alors que celle de la boucle le fait : elle sonne plus petite
que sa jumelle programmée.

*(Le motif d'accueil donne des écarts absurdes — +165 dB — parce qu'à cet
instant précis il ne joue rien du tout : la mesure se fait contre du silence.
Elle est écartée, mais elle dit autre chose : sur le motif par défaut, l'endroit
où le doigt tombe est un trou.)*

### 1.5 CHAOS — le sixième bouton par défaut

`triggerChaos` tire un axe au hasard parmi 55 et lui donne une valeur au hasard.
43 de ces 55 axes sont des réglages de VOIX de synthé (`VIBRATO BASSE`,
`FERM. FILTRE NAPPE`…). Un appui a donc **environ 4 chances sur 5** de bouger un
paramètre de voix, souvent sur une ligne muette, et l'écran ne dit pas lequel.
Non mesuré en dB — mais le problème n'est pas le niveau, c'est qu'aucun retour
ne permet d'apprendre ce que le bouton vient de faire.

### 1.6 Bilan : la surface par défaut

Les six boutons livrés sont BREAK · FILL · KICK · CAISSE · CHARLEY · CHAOS.
D'après ce qui précède : **un geste franc (BREAK), un geste en retard (FILL),
un geste audible (KICK), deux gestes masqués (CAISSE, CHARLEY), un geste
indéchiffrable (CHAOS)**. Plus le pad, qui porte le seul vrai paramètre.

Yann décrit exactement ça.

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

C'est le chiffre central de ce document. Le catalogue en contient 55 ; la surface
en montre 2. Et les deux sont sur le même doigt : on ne peut pas balayer le
filtre et pousser la réverbe indépendamment.

⚠️ Le filtre master de Circuit est décrit comme « **toujours actif** », avec un
cran central. Aucune machine ne demande d'aller le chercher.

### 2.2 Les quatre mécaniques que la catégorie a standardisées

**a) La MACRO NOMMÉE, pas l'empilement d'étiquettes.** Circuit permet de piloter
« n'importe quels quatre paramètres depuis chaque knob, avec réglage individuel
de plage et de profondeur ». Ableton pose 8 macros par défaut, extensibles à 16.
Dans les deux cas, le contrôle porte **un nom**, et les destinations sont un
réglage interne avec leur propre course. Personne n'affiche `FILTRE + REVERB` sur
la façade.

→ La remarque de Yann est juste sur le fond ET sur la forme : ce qu'on a fait
n'est pas la macro de l'état de l'art, c'est sa caricature. Ce qui est à
supprimer, c'est l'empilement affiché. Ce qui pourrait revenir un jour, sous un
autre nom, c'est la macro à destinations réglées.

**b) Le MOMENTANÉ À POSITION.** Sur Maschine, « par défaut les Perform FX sont en
mode **Touch Enable** : on entre, on ajoute un intérêt momentané, on lâche, et on
revient au signal propre ». Le geste est donc à la fois **un maintien** et **un
curseur** — la position dans le ruban dose l'effet, le relâché rend le morceau.

→ Nos six MAINTENUS font la première moitié (aller et retour) et pas la seconde
(la dose). Nos faders font la seconde et pas la première. **Le même contrôle fait
les deux ailleurs.**

**c) Le FILL qui répond TOUT DE SUITE.** Sur TR-8S : *« par défaut le bouton de
fill manuel fonctionne comme sur la 808 : appuyé vers le DÉBUT d'une mesure il
met en file un fill d'une mesure entière ; appuyé vers la FIN il déclenche un
fill partiel immédiat. »*

→ C'est notre bug de conception, résolu depuis 1980. Nous n'avons que la
première moitié de la règle, et appliquée au quart de mesure suivant. Le
TR-8S ajoute par-dessus **le choix du fill** (deux motifs utilisateur, Scatter,
ou n'importe quelle variation), au lieu d'un fill unique.

**d) Le NOTE REPEAT à division CHOISIE.** MPC : on tient le bouton Note Repeat et
on frappe un pad ; le taux suit la quantification courante (1/8, 1/16, 1/32,
triolets), et un mode « latch » évite de tenir. C'est l'outil qui fait les
charleys en triolets du hip-hop.

→ Notre rafale choisit à notre place, monte toute seule d'un cran par noire, et
n'est ni quantifiée ni latchable. Et surtout elle **remplit toute la ligne** au
lieu de répéter la frappe qu'on tient : ce n'est pas le même geste.

### 2.3 Deux confirmations pour ce qu'on a déjà

- **Les snapshots.** Ableton stocke des « variations » de macros ; Maschine
  jusqu'à 64 snapshots rappelables aux pads. Notre mécanique d'instantanés est
  dans la norme.
- **Le tirage au hasard.** Ableton a un bouton *Rand* qui randomise les macros
  mappées, et il est lui-même assignable à un contrôleur. Le 🎲 de Yann
  (« le random marche très bien ») a un précédent exact.

### 2.4 Et le filtre, encore

Le filtre est décrit comme *« le seul knob qui peut vous faire sonner comme un
pro : contrairement à l'EQ qui découpe des bandes fixes, il balaie tout le
morceau, l'amincit ou le passe sous l'eau d'un seul geste »*. Sur les tables
Pioneer, c'est une **rangée de knobs, un par voie**, toujours visibles.

⚠️ Donc : *« le seul paramètre que j'utilise, c'est le filtre »* n'est pas un
aveu, c'est un résultat attendu. La question n'est pas pourquoi il n'en utilise
qu'un — c'est pourquoi il n'y en a qu'un.

---

## 3. Pourquoi les curseurs ont « disparu »

Ils n'ont pas disparu. **Mesuré dans le navigateur, en 844 × 390 :**

- surface de jeu : **6 boutons en mode ACTIONS, 0 en mode FADER**, 1 pad,
  1 volume master ;
- loquet ASSIGNER + tap sur un bouton → un sélecteur intitulé
  « BOUTON 1 — plusieurs possibles », **31 entrées, toutes des ACTIONS**, et
  **aucun bouton ne mentionne FADER** ;
- le seul chemin vers un curseur : ⚙ → ASSIGNATION → basculer « ⏻ ACTIONS » en
  « ≈ FADER » sur la ligne du bouton → rouvrir le sélecteur → choisir un axe →
  refermer. **Six gestes, dans un menu.**

⚠️ C'est une violation directe de la règle que ce mode s'est donnée :
*« Rien de ce qui se fait EN JOUANT ne vit derrière ⚙ »* (CLAUDE.md). Le loquet
ASSIGNER a été écrit pour la faire respecter — et il ne montre que la moitié du
catalogue. Le défaut livré (`DEFAULT_ASSIGNMENTS`) met les six boutons en mode
ACTIONS ; donc **personne ne rencontre jamais un fader** sans passer par les
réglages.

C'est le quatrième épisode du même problème dans ce mode : ce qui n'est pas ÉCRIT
sur la surface n'existe pas. Les trois premiers étaient des appuis longs ; celui-ci
est un mode caché.

### Le catalogue, en chiffres

| | nombre |
|---|---|
| ACTIONS (boutons) | **30** — 4 déclencheurs, 4 bascules, 9 pas, 8 maintenus, 5 lignes |
| AXES (continus) | **55** |
| … dont réglages de VOIX de synthé | **43** (78 %) |
| … dont macros de scène (filtre, réverbe, groove, bus, mix) | **12** |
| Emplacements sur la surface | **6** boutons + 2 axes de pad + 1 inclinaison |

Deux lectures. La première : **on a 12 vraies macros de scène et on en montre 2.**
La seconde : **43 axes sur 55 sont de la préparation** — un `VIBRATO NAPPE` ne se
règle pas en plein morceau, et c'est exactement le principe que la cure du
2026-09-02 avait posé pour les BOUTONS, en s'interdisant explicitement de
l'appliquer aux axes. La note de `liveActions.ts` dit : *« un balayage de cutoff
sur la basse EST un geste de scène »*. C'est vrai du cutoff ; ce n'est pas vrai
des treize autres réglages par voix.

---

## 4. Le diagnostic

Le Mode Live a un catalogue de studio et une surface de scène. Les trois
symptômes n'en font qu'un :

1. **Trop peu de continu.** 2 commandes contre 8 ou 9 partout ailleurs, sur le
   même doigt, alors que 12 macros de scène existent déjà dans le code.
2. **Du discret qui ne s'entend pas.** Trois des six boutons par défaut changent
   le mix de moins de 3 dB, et un quatrième arrive jusqu'à 4,5 s trop tard. Le
   moteur n'est pas en cause — chaque geste fait +5 à +17 dB **sur sa propre
   ligne**. C'est le mix qui les avale, et rien ne compense.
3. **Ce qui est riche est caché.** 55 axes, un seul chemin, six gestes dans ⚙.

Et une quatrième chose, transversale : **rien ne se règle par LIGNE.** Le filtre,
la réverbe, la saturation sont globaux. La table de mixage DJ, elle, pose un
filtre par voie — c'est ce qui permet de filtrer la basse en gardant le kick net.

---

## 5. Les pistes que le benchmark ouvre — à arbitrer, pas encore proposées

Rien de ce qui suit n'est décidé. Chacune sera une carte de la fiche annotable.

**P1 — Faire de la surface une rangée de curseurs.** Passer le défaut de 6
boutons/0 fader à un mélange (par ex. 3 gestes + 3 curseurs), et rendre la
bascule ACTIONS/FADER atteignable depuis ASSIGNER. Coût : nul côté moteur, le
mode fader existe. Question ouverte : combien de curseurs tiennent en 844 × 390 à
côté du séquenceur et du pad.

**P2 — Fusionner MAINTENU et CURSEUR (le Touch Enable de Maschine).** Toucher
engage, la position dose, le relâché rend le morceau. Ça remplace les six
maintenus binaires ET les faders par un seul type de contrôle, et c'est le geste
de scène le plus courant de la catégorie.

**P3 — Le FILL de la 808.** Appui tôt dans la mesure = fill d'une mesure entière
en file ; appui tard = fill partiel immédiat depuis l'instant de l'appui.
Supprime le retard de 1,5 à 4,5 s. Sans doute le meilleur rapport effet/coût du
document.

**P4 — La rafale devient un NOTE REPEAT.** Division choisie (1/8, 1/16, 1/32,
triolets) plutôt qu'une escalade automatique, et elle répète la frappe qu'on
tient au lieu de remplir la ligne. Et il faudra trancher le niveau : une rafale
qui ne s'entend pas doit-elle monter en gain, ou renoncer au charley ?

**P5 — La frappe à la main doit passer devant.** Accent, sidechain déclenché,
peut-être une quantification optionnelle. Un charley 19 dB sous le mix n'est pas
un instrument.

**P6 — Supprimer l'empilement affiché** (demandé). Et décider si la macro
nommée à destinations réglées reviendra un jour, ou si le sujet est clos.

**P7 — Du réglage PAR LIGNE.** Le filtre par voie de la table de mixage.
Le plus gros des sept, et le seul qui touche le graphe audio.

**P8 — CHAOS ne devrait tirer que dans les 12 macros de scène**, et dire ce
qu'il a tiré. Sinon c'est un bouton qu'on n'apprend jamais.

---

## 6. Les questions qui n'ont pas de réponse par défaut

1. **Trois curseurs, ou six ?** Autrement dit : le Mode Live garde-t-il des
   boutons de geste, ou devient-il une rangée de curseurs avec deux ou trois
   déclencheurs ?
2. **Le charley reste-t-il jouable à la main ?** On peut le faire passer devant
   le mix (accent, duck), ou admettre que trois lignes sur cinq ne se jouent pas
   à la main dans un mix dense.
3. **Le réglage par LIGNE est-il dans le périmètre ?** C'est le seul point qui
   demande de toucher `buildGraph`, donc le seul qui ne soit pas un après-midi.

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
node scripts/banc-live.cjs   # FILL, rafales, frappes à la main, en dB
```
