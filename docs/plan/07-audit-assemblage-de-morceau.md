# Audit — assembler un morceau, et pourquoi la première tentative a raté

> Demandé par Yann le 2026-09-07, après une livraison qu'il n'avait pas
> demandée : *« je me serais attendu à un vrai travail d'audit avec la
> proposition d'un plan sérieux sur la base de mes constats. Trop focalisé dans
> l'exécution directe. »*
>
> **Il a raison, et ce document existe pour ça.** Son message posait un
> DIAGNOSTIC (« on fait fausse route ») ; j'ai répondu par une implémentation,
> donc en tranchant à sa place des questions qu'il n'avait pas posées. La
> branche `claude/mode-livre-params-sequences-oiwtul` est le résultat de cette
> exécution : ce document la traite comme **une proposition parmi d'autres**, et
> le §6 dit explicitement ce qui, dedans, est mesuré et ce qui est un pari.
>
> Suite de [`05-audit-mode-live.md`](05-audit-mode-live.md) et
> [`06-audit-architectures-de-morceau.md`](06-audit-architectures-de-morceau.md),
> qui restent valides sur le moteur et sur le vocabulaire des sections.
> Ce document-ci pose la question qu'aucun des deux n'avait posée : **à quoi
> sert ce mode.**

---

## 1. Méthode

Mesuré sur la branche, appli en marche, Chromium headless : 844 × 390 pointeur
grossier pour le Live (le paysage d'un iPhone 12/13, la cible déclarée),
390 × 844 et 1280 × 900 pour l'Atelier. Les prototypes de mesure vivent hors de
`src/` — ce sont des mesures, pas des livraisons.

La règle de la maison s'applique : ce qui est affirmé ici est mesuré. Les cinq
trouvailles du §3 viennent toutes d'une mesure ou d'une lecture de code
vérifiée, et **quatre sur cinq ne sont pas dans les constats de Yann** — c'est
la part que seul un audit produit.

---

## 2. Les constats de Yann, confrontés

### 2.1 « Trop compliqué » — chiffré

Monter un morceau à deux parties et l'écouter, en gestes, sur `main` :

| | geste |
|---|---|
| 1 | composer A dans l'Atelier |
| 2-4 | onglet Production → panneau Banque → ➕ → **taper un nom dans un `prompt()`** |
| 5 | modifier pour obtenir B |
| 6-8 | ➕ → `prompt()` → nommer |
| 9 | entrer en Mode Live |
| 10 | ouvrir ⚙ |
| 11-12 | ligne ARCHITECTURE → sélecteur → choisir POP |
| 13-28 | **huit sections × (ligne ↳ → sélecteur → choisir la séquence)** |
| 29 | fermer ⚙ |

**Vingt-neuf gestes, dont seize pour la seule assignation**, et deux passages par
un `prompt()` natif. Le constat est juste, et il est pire que « compliqué » :
seize des vingt-neuf gestes sont de la saisie répétitive.

### 2.2 « Pas du tout audible » — la cause est structurelle, pas ergonomique

`Section.sequenceId` était `string | null`, et `null` voulait dire **« garder le
motif courant »**. Un modèle fraîchement chargé porte donc huit sections à
`null` : les huit jouent la même chose. **L'état par défaut de la fonctionnalité
était l'inaudible**, et aucun test ne le regardait — les tests vérifiaient
l'arithmétique des cycles, jamais que la chaîne fasse entendre quelque chose.

C'est le vrai reproche, et il ne se règle pas en raccourcissant le chemin : tant
qu'une section peut ne rien citer, l'inaudible reste atteignable.

### 2.3 « Éviter à tout le monde d'aller dans les réglages » — confirmé, et plus large qu'annoncé

Derrière ⚙ vivaient : l'assignation des six boutons, les deux axes du pad,
l'axe d'inclinaison, le visualiseur, le mode fader et son orientation, les
snapshots, le chargement d'une séquence de banque, **le choix du modèle
d'architecture et l'assignation de chaque section**. Soit, sur quatorze lignes,
**onze qui sont des gestes de scène ou de montage**, c'est-à-dire des choses
qu'on fait pendant qu'on joue.

⚠️ Et une contrainte que le constat ne dit pas : **l'appui long est déjà pris sur
les boutons** (la rafale de `kind: 'ligne'`, le maintien de TENIR et de SOLO
MÉLO). « Une touche longue permet d'accéder à un choix plus vaste » ne peut donc
pas être un geste posé sur le bouton lui-même. C'est cette contrainte qui décide
de la forme de la solution, et elle est mesurable dans le catalogue.

### 2.4 « Le dénominatif mode live est peut-être abusif »

C'est le constat le plus important des quatre, et c'est celui que j'ai traité
comme une question d'étiquette. Il n'en est pas une — voir le §4.

---

## 3. Ce que la mesure ajoute, et qu'aucun constat ne disait

### 3.1 ⚠️ On ne peut PAS sortir un morceau monté

`renderPattern(state, bars)` (`engine/render-offline.ts`) rend **un seul état**
pendant N mesures. Il n'existe aucun chemin qui rende une chaîne. Le seul moyen
d'obtenir un fichier d'un morceau monté est le ⏺ REC du Live, c'est-à-dire :
**le jouer en temps réel**, sans reprise possible, dans un tampon RAM que
`06-audit` a chiffré à **256 Mo de pic pour dix minutes**, et qui sort du WAV
et pas du MP3. La glissière d'export, elle, plafonne à **60 s** — un montage
« couplet / refrain » en fait 62 à 104 selon les parties.

C'est le trou le plus grave, et il touche exactement la phrase de Yann :
*« l'idée, c'est de constituer un morceau »*. `CLAUDE.md` porte déjà la règle
qui le condamne — **« exporter n'est pas un réglage de production, c'est
FINIR »**. On peut assembler et on ne peut pas finir.

**Prototypé, et ça marche.** Un rendu hors ligne de la chaîne (boucle sur les
sections, état remplacé, curseurs remis à zéro, calque appliqué en mute) :

| | |
|---|---|
| Sections rendues | 8 |
| Mesures | 31 |
| Audio produit | **64,5 s** |
| Temps de rendu (headless) | **27,6 s**, soit ~0,43 × temps réel |
| RMS par section | de **0,0099** (OUTRO B′) à **0,1614** (COUPLET A) |

Les RMS sont la preuve que ce n'est pas décoratif : le calque de sortie fait
tomber la section finale d'un facteur seize. Et le temps de rendu est une
information d'interface — ce n'est pas instantané, il faudra une barre de
progression et l'encodage MP3 vient par-dessus.

### 3.2 ⚠️ Le MIX ne suit pas une bascule de section

Mesuré sur les nœuds réels du graphe. Deux parties, même grille, mix différent :

| | gain kick | envoi réverbe kick | volume final |
|---|---|---|---|
| A chargée (mix « couplet ») | 1 | 0 | 1 |
| **après bascule sur B** | 1 | **0** | **1** |
| si `refreshMixSettings()` était appelé | 1 | **0,8** | **1,3** |

`buildGraph` n'est appelé qu'une fois, dans `ensureAudio()`. `applyMixSettings`
est le seul écrivain de ces nœuds, et son unique site d'appel est
`AtelierView.svelte` — **le Mode Live ne l'appelle jamais** (le commentaire de
`AudioEngine.ts` le dit, sans en tirer la conséquence).

Or une partie porte un **état v2 complet**, mix compris. Le joueur qui range un
refrain avec sa réverbe entendra ses notes avec le mix du couplet. Volumes de
ligne, envois réverbe/delay, saturation, compression, bitcrush, taille de
réverbe, volume final, limiteurs : rien ne suit.

⚠️ **Corollaire qui rend l'affaire structurante** : mon prototype de rendu hors
ligne, lui, reconstruit un graphe par section, donc il APPLIQUE le mix. Le
fichier exporté ne sonnerait pas comme la lecture en direct. **Deux vérités pour
un même morceau** — c'est exactement le genre de divergence que `CLAUDE.md`
interdit ailleurs (« une règle à deux domiciles n'est appliquée qu'à un seul »).
Il faut trancher lequel des deux a raison AVANT d'écrire l'export.

### 3.3 ⚠️ La durée affichée ment, d'un facteur quatre

`cycleDuMotif` est calculé sur le motif **courant** et appliqué à **toutes** les
sections. Deux parties dont les cycles propres diffèrent (une nappe de quatre
mesures dans A, pas dans B — le cas de 30 presets sur 34) donnent, pour la
**même** chaîne :

| ce que l'écran affiche | |
|---|---|
| si A est chargée | **1 min 44** |
| si B est chargée | **26 s** |
| la vraie durée | **1 min 02** (31 mesures) |

Le déroulé à l'exécution est juste (la longueur se recalcule après chaque
bascule) ; c'est l'AFFICHAGE — le total du morceau et le « ×2 · 8 mesures » de
chaque case — qui est faux. Le défaut préexiste à la branche ; la branche ne l'a
pas vu parce qu'elle n'a mesuré que la géométrie.

### 3.4 Un morceau monté n'est ni partageable ni restauré

`buildShareUrl()` sérialise `pattern.snapshot()` : le lien porte **le motif
courant**, pas les parties ni la chaîne. Idem pour l'autosave. Un rythme se
partage par URL depuis toujours ; un morceau, non.

### 3.5 Deux domiciles pour le matériel

La banque (entrées à noms libres, sans plafond, utilisée par le jeu pour les
neuf boucles de l'acte 6) et les parties (quatre lettres) coexistent. La
distinction est défendable — matériel contre morceau, et `CLAUDE.md` la porte
déjà — mais elle est **invisible à l'écran** : deux listes, deux vocabulaires,
et rien qui dise laquelle sert à quoi. C'est une dette assumée, pas un bug ; il
faut la nommer avant qu'elle passe pour un oubli.

---

## 4. La question de cadrage — celle que je n'ai pas posée

> « Le dénominatif "mode live" est peut-être abusif, l'idée, c'est de constituer
> un morceau très facilement et de faire des variations comme dans un morceau
> électronique. »

Ce n'est pas une question de nom. Un **mode de scène** et un **établi de
morceau** n'ont ni les mêmes contraintes, ni la même surface, ni la même sortie.

| | Mode de SCÈNE | Établi de MORCEAU |
|---|---|---|
| Geste dominant | déclencher, tenir, réassigner au vol | ranger, essayer, comparer, refaire |
| Orientation | paysage, deux pouces, sans regarder | peu importe ; on lit |
| Erreur | fait partie du jeu | s'annule (undo) |
| Sortie | ⏺ REC, une prise | un fichier rendu, reproductible |
| L'objet | une SET LIST, jetable | un MORCEAU, qu'on garde et qu'on partage |
| Où il vit | plein écran, hors des onglets | dans l'Atelier, à côté de la grille |

**Les quatre trouvailles du §3 tombent toutes du même côté.** L'export, le
partage, la durée juste, le mix qui suit : ce sont des exigences d'**établi**.
Aucune n'a de sens pour une set list qu'on joue une fois.

Trois cadrages possibles, et c'est la première décision :

**(A) Rester un mode de scène.** La chaîne est une set list, on la joue, ⏺ REC
suffit. Cohérent, peu coûteux — et il faut alors assumer qu'on ne « constitue »
pas un morceau, on l'improvise. Contredit la phrase de Yann.

**(B) Le morceau devient un objet, le Live en est la VUE DE SCÈNE.**
Parties + chaîne forment un MORCEAU : sérialisable, exportable hors ligne,
partageable par URL, éditable dans l'Atelier. Le mode paysage reste, mais il
joue un objet qui existe ailleurs. C'est ce que les quatre trouvailles
réclament. Coût réel : un troisième format à côté de v2 (ou une extension de v2,
à trancher), l'export de chaîne, et le §3.2 à arbitrer.

**(C) Dissoudre le mode.** La chaîne devient une rangée de l'Atelier ; le
« Live » n'est plus qu'un plein-écran paysage du même écran. Le plus simple
conceptuellement, le plus cher en interface, et il faudrait vérifier ce que ça
fait au récit (les scènes des actes 6 et 7 envoient « dans le Mode Live » et
`HISTOIRE.md` en parle comme d'un lieu).

**Ma recommandation : (B).** Elle est la seule qui rende vraies les quatre
mesures du §3 sans casser le récit, et elle garde la scène — qui marche, et que
l'acte 7 utilise. Mais c'est une décision de produit, pas de code, et elle est
la tienne.

---

## 5. Le modèle — les options, et pourquoi les lettres

### 5.1 Ce qu'il faut décrire, d'après tes exemples

```
un A qui entre progressivement : Intro
A : couplet · B : refrain · A : couplet · B : refrain
A' ou B' : pont
B qui s'efface : outro                        → 2 motifs, 3 calques

A B B' A B B' A' outro                        → 2 motifs, 2 calques
```

Deux motifs suffisent aux deux formes. **Ce sont les CALQUES qui font le reste**,
et c'est la seule observation de conception qui compte ici : « A′ » n'est pas un
troisième motif, c'est A avec des lignes en moins. Une modélisation qui demande
d'écrire un motif par section demande huit motifs pour un morceau qui en a deux.

### 5.2 Trois modélisations

| | Ce que c'est | Pour | Contre |
|---|---|---|---|
| **Lettres fixes (A-D) + calque** | 4 emplacements, le prime est un masque de lignes | le vocabulaire du musicien ; deux motifs suffisent ; la bande tient à 56 px | plafond dur à 4 ; « D » ne veut rien dire |
| **Banque nommée, section = référence** | ce qu'il y a aujourd'hui | pas de plafond | c'est le §2.1 et le §2.2 : rien ne dit qui est A, et une section peut ne rien citer |
| **Sections autonomes** (chaque section porte son motif) | pas de référence | simple | les trois A d'un AABA divergent au premier réglage ; corriger le kick, c'est le corriger huit fois |

**Recommandation : les lettres**, pour la raison de ton message — « je pars d'une
idée A, de celle-ci on développe B ». Le plafond de quatre est une mesure, pas
un avis : la bande fait 832 px et porte aussi la chaîne et les commandes de jeu ;
quatre pastilles y tiennent à 56 px, six les ramènent sous le seuil tactile.
**À vérifier avec toi quand même** : est-ce que quatre suffit, ou est-ce que
« C » et « D » sont déjà de trop et trois auraient été plus clairs ?

### 5.3 L'invariant qui règle « pas du tout audible »

Quelle que soit la modélisation : **une section cite toujours quelque chose de
DÉFINI, jamais « le motif courant »**. Et le repli d'une lettre vide doit être
une lettre (A), pas « ce qui traîne ». C'est ce qui rend l'inaudible impossible
à écrire, au lieu d'en faire un défaut qu'on entend sans savoir d'où il vient.

Un test le tient (« deux sections qui se suivent doivent différer »). C'est le
seul morceau de la branche dont je suis certain qu'il faut le garder quel que
soit le cadrage retenu.

---

## 6. Ce qui est sur la branche — ce qui tient, ce qui est un pari

Honnêtement trié. La branche n'est pas mergée et peut être jetée en entier.

### Mesuré, et valable quel que soit le cadrage

- **`Section.partie` obligatoire + repli sur A** — règle le §2.2 par construction.
- **Le prime EST le calque** — deux motifs couvrent les deux formes.
- **La migration** — les `sequenceId` enregistrés deviennent des lettres, leur
  contenu est recopié, la forme migrée est réécrite une fois. Pure et testée
  (6 tests), rejouée dans le navigateur sur un `localStorage` à l'ancien format.
- **Le sélecteur sorti de l'overlay ⚙** — il y était imbriqué, donc il ne
  s'ouvrait que depuis ⚙.
- **La géométrie** — bande 832 × 44, pastilles 56 × 44, huit cases 52,7 × 44,
  `.main` inchangé à 252 px.

### Des paris, que je n'aurais pas dû prendre seul

| | Le pari | Ce qui pourrait le contredire |
|---|---|---|
| **Le loquet 🎲** | réassigner devient un MODE, la surface cesse de jouer | c'est un mode de plus à comprendre ; un bandeau permanent d'assignation sous les boutons ferait le même travail sans mode. Non comparé, non mesuré |
| **Quatre lettres** | A-D | trois suffiraient peut-être et se liraient mieux |
| **Cinq montages** | dont deux repris de tes exemples | les trois autres (BOUCLE, CLUB, SONNERIE) sont mon invention |
| **Un montage ÉCRASE les six boutons** | sans prévenir, sans retour arrière | c'est destructeur et silencieux ; ça mériterait au moins un « annuler » |
| **La bande PARTIES dans l'Atelier** | dans la barre sticky, visible seulement une fois le Live ouvert | place et condition d'affichage choisies sans toi |
| **Le geste tap/appui-long sur les pastilles** | tap = jouer, long = ranger | « ranger » est destructeur et se déclenche par un maintien, sans confirmation |

### Faux, et à corriger quoi qu'il arrive

- **La durée affichée** (§3.3) : elle ment d'un facteur quatre. C'est un bug de
  la branche autant que de `main`.

---

## 7. Le plan proposé

Tranches ordonnées par **ce qu'elles débloquent**, pas par difficulté. Chacune
est livrable seule et vérifiable seule.

| | Tranche | Ce qu'elle règle | Dépend de |
|---|---|---|---|
| **0** | **La décision de cadrage** (§4) et les six paris du §6 | rien ne se code avant | toi |
| **1** | **Le modèle** : lettres, section non nulle, prime = calque, migration | §2.2 — l'inaudible devient impossible à écrire | 0 |
| **2** | **La durée juste** : chaque section comptée avec le cycle de SA partie | §3.3 | 1 |
| **3** | **Les gestes sur la surface** : bande, chaîne, montages, réassignation en place | §2.1 et §2.3 | 1 |
| **4** | **Le mix qui suit la bascule** — ou la décision inverse, assumée et écrite | §3.2, et la divergence direct/export | 1 |
| **5** | **L'export d'une chaîne** hors ligne, MP3, avec progression | §3.1 — « c'est FINIR » | 2, 4 |
| **6** | **Le morceau comme objet** : sauvegarde, partage par URL, restauration | §3.4 | 5 |
| **7** | *(à rouvrir seulement après écoute)* le fill recalé sur la section, l'automation | `06-audit` §5.1 et §5.3 | 5 |

La branche actuelle couvre **1 et 3**, une partie des paris du §6, et rien de
2, 4, 5, 6. C'est le vrai bilan : elle a réglé la friction d'ASSEMBLAGE et
laissé intacte celle qui décide si on peut FINIR.

⚠️ **La tranche 4 avant la 5, et pas l'inverse.** Écrire l'export d'abord fige
la divergence du §3.2 dans un fichier qu'on distribue.

---

## 8. Ce que je ne recommande pas

- **Merger la branche telle quelle.** Elle contient six paris non discutés et un
  affichage faux.
- **Écrire l'export avant d'arbitrer le mix** (§3.2) : deux vérités, dont une
  gravée dans un MP3.
- **Ouvrir l'automation** avant d'avoir écouté l'escalier de sections — c'est
  déjà l'arbitrage de `06-audit` §5.3, et il tient.
- **Renommer le mode avant d'avoir tranché le §4.** Le nom découle du cadrage ;
  choisi avant, il ne décrit rien.
- **Élargir le catalogue de boutons.** `05-audit` §1 dit l'inverse et n'a pas
  bougé.

---

## 9. Les décisions qui sont les tiennes

Elles sont reprises une par une dans la fiche annotable
`docs/relecture/assemblage.html` (même mécanique que celle du Mode jeu :
PRIORITAIRE / À REVOIR / OK plus une note, export Markdown à recoller ici).

1. **Le cadrage** — (A) mode de scène, (B) le morceau devient un objet et le
   Live en est la vue, (C) dissoudre le mode. *Recommandé : B.*
2. **Combien de lettres** — trois ou quatre.
3. **Le mix suit-il une bascule** de section ? *(Si oui : une partie est un son
   complet. Si non : le mix appartient au morceau, pas à la partie — et il faut
   alors dire d'où il vient.)*
4. **La réassignation** — un loquet (ce qui est sur la branche) ou un bandeau
   permanent, sans mode ?
5. **Un montage a-t-il le droit d'écraser tes six boutons** sans prévenir ?
6. **L'export d'un morceau monté** — à faire, et à quelle priorité par rapport
   au reste ?
7. **Le nom**, une fois le §4 tranché.
8. **La branche** — on la garde comme base des tranches 1 et 3, on la reprend,
   ou on la jette ?

---

## Ce que cet audit ne dit pas

- **Rien n'a jamais été essayé sur un vrai téléphone** — ni le capteur
  d'inclinaison, ni la tenue à deux mains en paysage. C'était déjà la dernière
  ligne des deux audits précédents ; ça reste vrai, et aucune mesure headless ne
  le remplace.
- **Le temps de rendu du §3.1 est mesuré en headless**, sur une machine de CI.
  L'ordre de grandeur tient, le chiffre exact non.
- **Je n'ai pas comparé le loquet à une autre forme d'assignation.** C'est le
  pari le plus visible de la branche et le moins étayé.
