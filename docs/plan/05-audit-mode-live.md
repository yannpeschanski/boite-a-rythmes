# Audit du Mode Live — 2026-09-02

> Commandé par Yann : *« on peut retravailler en parallèle le mode live, fais moi
> un audit complet »*, avec quatre remarques et une demande d'étude
> (les architectures de morceau).
>
> **Rien n'est codé dans ce document.** C'est l'état mesuré, les causes, et les
> arbitrages à rendre avant d'écrire une ligne. La règle de la maison s'applique :
> ce qui est affirmé ici est mesuré, pas supposé.

## Méthode

Mesuré sur `main d6c4221`, appli en marche, Chromium headless en **844 × 390**
(le paysage d'un iPhone 12/13, la cible déclarée du mode), entrée par `#boss`
puis le bouton « 🎛 Mode Live ». Zéro erreur console. Les probabilités du
catalogue sont calculées sur les données (`liveActions.ts`), pas estimées.

Ce que le mode pèse aujourd'hui : `LiveView.svelte` **2 644 lignes**,
`liveActions.ts` **528 lignes**, **31 actions** et **55 axes** au catalogue.

---

## 1. « Des boutons pas très utiles, redondants, et qui tombent en même temps »

**C'est mesurable, et le chiffre est net.**

| | part du catalogue |
|---|---|
| Rafales (`roll-{kick,snare,hat}-x{2,3,4}`) | **9 sur 31 — 29 %** |
| Boutons PAS (`step-*`, dont 5 paires ←/→) | **10 sur 31 — 32 %** |
| **Les deux familles réunies** | **19 sur 31 — 61 %** |

Le catalogue est donc, aux deux tiers, deux familles de variantes quasi
identiques. Et le tirage 🎲 (`pickAction`) tire **uniformément dans les 31** :

- **56 %** des brassages complets posent au moins **deux boutons de rafale**
  côte à côte sur les six ;
- **63 %** posent au moins deux boutons PAS ;
- **31 %** posent deux rafales **sur la même ligne** — et là ce n'est plus une
  redondance, c'est un défaut : `rollHeld.kick` ne porte qu'un multiplicateur,
  donc relâcher ROLL K×4 coupe le ROLL K×2 encore tenu sous l'autre doigt.

C'est exactement ce que décrit la remarque : « pas très utiles » (une variante
de plus n'apporte rien), « redondants » (trois boutons pour un geste),
« tombent en même temps » (56 %).

### Ce que je recommande

**A. Les neuf rafales deviennent trois** — `roll-kick`, `roll-snare`,
`roll-hat`. Le multiplicateur cesse d'être une propriété du BOUTON pour devenir
une propriété du GESTE : la rafale part en ×2 et monte d'un cran par temps tenu
(×2 → ×3 → ×4). C'est ce que fait une rafale sur un instrument — elle
accélère — et ça supprime par construction le conflit de deux boutons sur une
même ligne.

**B. Les entrées MIROIR sortent du tirage, pas du catalogue.** `GAMME ←`,
`VOIX BASSE ←`… restent assignables à la main (elles servent), mais un drapeau
`tirable: false` les retire du 🎲. Cinq lignes de code.

Après A + B : catalogue **31 → 25**, réservoir de tirage **20**, part des
rafales **29 % → 12 %**, deux rafales sur la même ligne **31 % → 10 %**.

⚠️ **Le piège de migration, à ne pas découvrir en production.** `isValid()`
(`liveActions.ts`) est **tout ou rien** : une assignation enregistrée qui cite
`roll-kick-x3` après le renommage échoue la validation, et
`loadLiveAssignments()` rend **les défauts** — Yann perdrait ses six boutons ET
ses trois snapshots d'un coup, sans un mot. Le renommage doit donc passer par une
**table de correspondance appliquée avant validation** (`roll-*-x2|x3|x4` →
`roll-*`), pas par une suppression d'identifiants.

---

## 2. « Ça sélectionne le texte et ça ouvre le menu de Chrome »

**Confirmé, cause trouvée, correctif à quatre lignes.**

Mesuré dans l'appli : sur `.abtn`, `getComputedStyle()` rend
`user-select: auto` et `-webkit-user-select: auto`. Le libellé d'un bouton
(`BREAK`, `Break (déclencheur)`) est du texte ordinaire dans un `<button>` :
un appui long dessus déclenche la sélection puis le menu « Sélectionner /
Copier / Coller » d'Android Chrome. Et un appui long, sur ce mode, c'est le
geste NORMAL — les rafales sont des actions `hold`.

`touch-action: none` est bien posé (il empêche le défilement et le zoom), mais
il ne dit **rien** de la sélection ni du *callout* : ce sont trois propriétés
différentes.

**Le correctif existe déjà dans le dépôt, il n'a simplement jamais été appliqué
ici.** `DrumRowView.svelte` (l. 278-281) porte le trio complet :

```css
touch-action: manipulation;
user-select: none;
-webkit-user-select: none;
-webkit-touch-callout: none;
```

À poser sur `.live-root` (donc sur tout le mode d'un coup) plutôt que bouton par
bouton — il n'y a aucun texte à sélectionner en Mode Live, pas une seule zone.
En prime : `-webkit-tap-highlight-color: transparent`, absent de tout le projet,
qui est le rectangle gris qui clignote sous chaque appui sur Android.

⚠️ Une exception à vérifier au moment de le faire : les `<input>` s'il en
apparaît un (nommer un snapshot, nommer une section — voir §5). `user-select`
posé sur la racine se transmet ; le champ devra le reprendre à `text`.

---

## 3. « Muter chaque ligne à tout moment, sur le séquenceur apparent »

C'est la remarque qui touche le vrai défaut de conception du mode. **Trois
choses, dont deux sont des bugs.**

### 3.1 Deux lignes sur huit ne peuvent pas être coupées du tout

Le catalogue porte 6 mutes : kick, snare, hat, basse, nappe, mélodie. **Le clap
et le shaker n'en ont aucun** — exclusion assumée en son temps
(`01-plan-de-migration.md`, « Mode Live — actions »), mais l'exclusion voisine
avait été refusée : le séquenceur linéaire et l'égaliseur les AFFICHENT, et ils
sonnent (le motif est partagé avec l'Atelier). On voit donc deux lignes jouer,
qu'aucun bouton n'atteint.

### 3.2 Une ligne mutée dans l'Atelier s'affiche comme si elle jouait

`drawLinSeq()` lit `row.pattern` et `row.subdiv`. Il ne lit **jamais**
`row.muted`. Une ligne coupée dans l'Atelier arrive donc en Live avec ses cases
allumées et sa tête de lecture qui court — en silence. Le séquenceur ment sur ce
qu'on entend, ce qui est le seul reproche qu'on ne puisse pas faire à un
séquenceur.

### 3.3 Le Live peut couper une ligne, jamais la rouvrir

`liveSetMute` / `liveSetSynthMute` n'AJOUTENT un mute que par-dessus le motif,
« jamais retirer un mute posé dans l'Atelier ». Le garde-fou est juste tant que
le bouton est aveugle : il empêche une session live de réécrire l'Atelier en
douce. Il devient faux dès qu'on met à l'écran **l'état réel** d'une ligne —
une bande qui montre « coupé » et refuse de rouvrir n'est pas un garde-fou,
c'est une panne.

Le passage à faire : l'override live devient **ternaire** — `null` = suivre le
motif, `true` = couper, `false` = forcer ouvert. Ce qui reste garanti est ce que
le garde-fou protégeait vraiment : **rien n'est écrit dans le motif**, on repart
de l'Atelier exactement comme on y était.

### 3.4 Où la bande peut vivre — mesuré

| | mesuré en 844 × 390 |
|---|---|
| `.main` | 832 × **252** |
| `.lin-seq` (le séquenceur) | 299,4 × **75,6** |
| → hauteur d'une ligne, 8 lignes | **9,4 px** |
| `.seq-bar` (bandeau banque) | 832 × **44** |

**9,4 px par ligne : le séquenceur lui-même n'est pas une cible tactile**, et
aucune redistribution de la colonne centrale ne l'amène à 44 (même en donnant
au séquenceur toute la hauteur du visualiseur : 22 px). Poser les mutes
« sur le séquenceur apparent » au sens littéral est donc exclu par la mesure.

Ce qui tient, en revanche : une **bande de huit pastilles en pleine largeur**,
44 px de haut, 832 / 8 = **104 px** chacune — largement au-delà du seuil, sur
les deux axes. Elle prend une rangée de la grille (`.live` est en
`grid-template-rows: auto auto auto 1fr`, donc une rangée `auto` de plus).
Arithmétique : `.main` passerait de 252 à ~208 px, les six boutons de 80,7 à
~65 px de haut (toujours > 44), le pad de 216 à ~172. **À mesurer, pas à
supposer**, au moment de le faire.

Et la bande sert deux fois : c'est aussi l'éditeur de section du §5.

---

## 4. Audit des architectures de morceau

C'était la demande d'étude. Voici ce que les formes courantes exigent
réellement d'un mode live — et le résultat principal, qui n'est pas celui
qu'on attend.

| Forme | Découpe typique (mesures) | Ce qui CHANGE d'une section à l'autre |
|---|---|---|
| Couplet / refrain (pop, variété) | intro 4 · couplet 8 · refrain 8 · couplet 8 · refrain 8 · pont 4 · refrain 8 · outro 4 | **le motif entier** |
| AABA (chanson, 32 mesures) | A 8 · A 8 · B 8 · A 8 | le motif du seul B |
| Hip-hop (boom bap 2005) | intro 4 · 16 · hook 8 · 16 · hook 8 · 16 · hook 8 · outro 4 | peu — surtout la densité |
| Blues 12 mesures | cyclique, 12 | **l'harmonie** — hors de portée, la boîte n'a pas de grille d'accords |
| House / techno (2005) | intro 16 · montée 16 · drop 32 · break 16 · montée 16 · drop 32 · outro 16 | **l'intensité** : lignes qui entrent et sortent, filtre qui s'ouvre |
| Dancehall / dembow (riddim) | boucle + *reloads* | des coupures ponctuelles |
| **Sonnerie** (le sujet de Face B, 2005) | 8 mesures, un seul hook | rien |

### Le résultat : les deux exemples de Yann sont les deux BOUTS, pas deux cas du même type

- **« intro, couplet, refrain, couplet, refrain, pont, outro »** est une
  **chaîne de MOTIFS**. Chaque section est une séquence différente ; il faut la
  banque, et il faut savoir en changer proprement.
- **« intro, montée, climax, descente »** est un **ARC D'INTENSITÉ**. On peut le
  jouer d'un bout à l'autre **sur une seule séquence** : on ajoute des lignes,
  on ouvre un filtre, on lâche une rafale. Aucune nouvelle séquence n'est
  nécessaire — c'est le point 3 (les mutes) et le pad qui le jouent.

Les traiter comme un seul mécanisme serait l'erreur de conception du chantier.
Les traiter comme deux fonctionnalités séparées en serait une autre : **une
seule forme de section les couvre toutes les deux**, à condition que chacun de
ses champs soit facultatif.

```
Section = {
  nom,                  // « REFRAIN », « MONTÉE » — affiché en gros pendant le set
  mesures,              // 4, 8, 16, 32
  sequence?  : id de banque,   // ABSENT → on garde le motif courant  ← l'arc d'intensité
  lignes?    : masque de mute, // ce que la bande du §3 vient d'écrire ← l'arc d'intensité
  axe?       : { id, versValeur } // interpolé sur la durée de la section ← la MONTÉE, littéralement
}
```

Trois lectures de la même structure, et c'est ce qui la rend juste :

- pop → chaque section porte `sequence`, jamais `axe` ;
- montée/climax → aucune section ne porte `sequence`, toutes portent `lignes`
  et la montée porte `axe: { filter, vers 1 }` — le filtre s'ouvre sur seize
  mesures parce que c'est écrit, pas parce qu'un doigt tient le pad ;
- riddim → une section, et la bande de mutes fait le reste à la main.

**Le blues 12 mesures est le seul à sortir** : ce qu'il fait changer est
l'harmonie, et la boîte n'a pas de grille d'accords. À dire plutôt qu'à
contourner.

---

## 5. « Prédéfinir une architecture avec un nombre de cycles, affecter les séquences en banque »

C'est faisable, et l'essentiel existe déjà : la banque
(`stores/bank.svelte.ts`, entrées nommées, JSON v2, `localStorage`, sans
plafond) et le compteur de mesures du moteur (`currentBar`).

### Les trois modèles livrés d'usine

Un modèle pose les sections et leurs mesures ; on n'a plus qu'à déposer une
séquence de banque dans chaque case.

| Modèle | Sections | Total | Durée à 120 BPM |
|---|---|---|---|
| **POP** | intro 4 · couplet 8 · refrain 8 · couplet 8 · refrain 8 · pont 4 · refrain 8 · outro 4 | 52 mes. | **1 min 44** |
| **ARC** | intro 8 · montée 16 · climax 16 · descente 8 | 48 mes. | **1 min 36** |
| **SONNERIE** | un hook, 8 mesures | 8 mes. | **16 s** |

Le troisième n'est pas une blague : c'est le format que le jeu vend en 2005, et
c'est le seul modèle dont la durée soit un argument.

### Ce que ça exige du MOTEUR — trois pièces, et elles sont porteuses

**1. Le changement de motif doit être quantisé À LA MESURE, dans le moteur.**
`sequenceBank.load()` appelle `pattern.loadJson()` **immédiatement**, au milieu
de la mesure. Et le faire depuis l'interface au bon moment ne suffirait pas :
`SCHEDULE_AHEAD = 0,25 s` — à 120 BPM en doubles croches (0,125 s le pas),
**deux pas de la nouvelle section sont déjà programmés à l'ancien motif** quand
la bascule arrive. Un enchaînement de sections fait comme ça s'entend bavé, une
fois sur deux. Il faut une file dans le moteur (`queuePatternSwap`), appliquée
là où `currentBar` s'incrémente dans `tick()` — au même endroit exactement que
le break et le fill, qui ont déjà réglé ce problème.

**2. La bascule doit remettre les curseurs de ligne à zéro.** `cursors[n]`
garde un `stepIndex` par ligne. Une section qui commence au pas 7 d'un motif à
12 pas commence au milieu d'une phrase ; et si le nouveau motif a moins de pas,
l'index de départ est arbitraire.

**3. La bascule ne doit PAS emporter le tempo.** `loadJson()` remplace tout
l'état, tempo compris : une séquence rangée à 90 BPM ferait décrocher le set au
refrain. Le transport garde son tempo, la section apporte tout le reste — **le
feel compris** (swing, traîne, décalage), qui fait partie de l'identité d'une
section et non du transport.

Accessoirement, `currentBar` est `private` sans accesseur : l'afficheur
« MESURE 3/8 » en a besoin.

### Où ça vit à l'écran

- **On COMPOSE l'architecture dans l'Atelier**, à côté de la banque, qui y est
  déjà. Éditer une chaîne sur un téléphone en paysage de 390 px de haut est le
  contraire de jouer.
- **On la JOUE en Mode Live**, dans une bande : le nom de la section en gros,
  `mesure 3 / 8`, ce qui vient après, et deux boutons — **SUIVANT** (saute à la
  prochaine mesure) et **TENIR** (boucle la section courante). Un set n'obéit
  jamais au compte : sans ces deux boutons la chaîne joue contre le musicien.
- **La chaîne n'entre pas dans le format v2.** C'est une *set list*, pas un
  morceau : même domicile que la banque. Le contrat central n'est pas touché.

### Ce que ça remplace

La rangée `.seq-bar` d'aujourd'hui (44 px sur 390, soit **11 % de la hauteur**)
porte un sélecteur de séquence qui affiche « Aucune séquence » tant que la
banque est vide — donc, pour un joueur neuf, un onzième de l'écran pour rien.
C'est cette rangée que la bande d'architecture prend.

---

## Ce que je ne recommande PAS

- **Un vrai Mode Song avec timeline dans le Live.** L'édition va dans
  l'Atelier ; le Live joue.
- **Un avancement automatique sans échappatoire.** Voir SUIVANT / TENIR.
- **Ajouter des variantes au catalogue de boutons.** Le §1 dit l'inverse :
  le problème est qu'il y en a trop, pas trop peu.
- **Rendre le blues / la grille d'accords.** Ce n'est pas un manque du Mode
  Live, c'est un manque du modèle — et il n'est pas au programme.

---

## Découpage proposé

| | tranche | dépend de |
|---|---|---|
| 1 | **La sélection de texte** (§2) — quatre lignes de CSS sur `.live-root` | rien |
| 2 | **La bande de lignes** (§3) — huit pastilles, override ternaire, séquenceur qui dit la vérité sur `muted` | rien |
| 3 | **Le catalogue dégonflé** (§1) — 9 rafales → 3, drapeau `tirable`, table de correspondance à la relecture | rien |
| 4 | **Le moteur quantisé** (§5) — file de bascule à la mesure, curseurs remis à zéro, tempo gelé, `currentBar` lisible | rien |
| 5 | **L'architecture** (§4-5) — modèle de section, trois modèles d'usine, composition dans l'Atelier, bande de jeu dans le Live | 2 et 4 |

Les tranches 1 à 4 sont indépendantes et livrables séparément. La 1 se fait en
une passe ; c'est le défaut le plus visible et le moins cher.

**Ce qui n'est pas dans cet audit** : le mode n'a **toujours jamais été essayé
sur un vrai téléphone** — ni le capteur d'inclinaison, ni la tenue à deux mains
en paysage. Aucune mesure de ce document ne remplace ça.
