# Audit — ce que le Mode Live fait PAR DÉFAUT, et ce que devient l'architecture

> Demandé par Yann le 2026-09-05 : *« les différents types d'architecture ne sont
> pas pertinents en l'état. on doit en plus affecter des presets à chaque partie
> alors que pour couplet refrain couplet refrain pont, les couplets sont à peu
> près les mêmes […] il faut définir ce que fait le mode live par défaut […] il
> faut vraiment auditer ce point là sérieusement. »*
>
> Suite de [`05-audit-mode-live.md`](05-audit-mode-live.md) (le mode tel qu'il
> est) et de [`06-audit-architectures-de-morceau.md`](06-audit-architectures-de-morceau.md)
> (peut-on DÉCRIRE une architecture). Celui-ci répond à une autre question, et
> c'est la bonne : **qu'est-ce que le Mode Live joue quand on n'a rien préparé ?**

---

## 0. Ce qui a été mesuré

Sur `main e9d1d84`, dans le code, dans les 34 presets, et **à l'écran** —
Chromium 844 × 390, pointeur grossier, `#boss`, banque vide, modèle POP chargé.
Rien de mémoire. Quatre mesures ont décidé de tout le reste ; elles sont au §1.

---

## 1. Le diagnostic — quatre mesures, et elles disent la même chose

### 1.1 ⚠️ Chargé à froid, le modèle POP joue **trente fois le même motif**

Mesuré à l'écran : les huit cases de POP affichent **toutes** « motif courant ».

```
↳ INTRO ×2 | motif courant      ↳ REFRAIN ×4 | motif courant
↳ COUPLET ×4 | motif courant    ↳ PONT ×2 | motif courant
↳ REFRAIN ×4 | motif courant    ↳ REFRAIN ×8 | motif courant
↳ COUPLET ×4 | motif courant    ↳ OUTRO ×2 | motif courant
```

`section()` (`model/architecture.ts`) pose `sequenceId: null`, et POP ne pose
aucun calque de lignes (`lignes: null` partout). Donc `appliquerSection` ne
charge rien et ne coupe rien : **les huit sections sont identiques au bit
près.** Seul le nom change sur l'afficheur.

Sur le motif d'accueil (batterie seule, cycle propre = **1 mesure**, mesuré),
ça fait 30 cycles = 30 mesures = **1 min 00 à 120 BPM du même motif d'une
mesure**, et l'afficheur annonce fièrement « MORCEAU 1 min 00 ».

C'est le défaut central, et il explique la phrase de Yann mieux que n'importe
quel argument : un modèle d'architecture qui ne change rien à ce qu'on entend
n'est pas un modèle, c'est une étiquette.

### 1.2 ⚠️ Les trois modèles ne sont pas trois architectures, mais trois MÉCANISMES

| Modèle | Ce qu'il utilise | Ce qu'il fait sans préparation |
|---|---|---|
| **POP** | `sequenceId` (8 cases à remplir) | **rien** — §1.1 |
| **ARC** | `lignes` (calque d'instrumentation) | il coupe et rouvre des lignes ✅ |
| **SONNERIE** | ni l'un ni l'autre (1 section) | il boucle |

Les deux champs de `Section` existent, et **aucun modèle ne les combine** : POP
n'utilise que `sequenceId`, ARC n'utilise que `lignes`. L'audit précédent
assumait cette différence de nature (§6 du 06) ; à l'usage elle se lit comme une
incohérence. On choisit dans une liste où « POP » et « ARC » ont l'air d'être
deux formes de morceau, alors que ce sont deux moteurs différents dont un seul
fonctionne à froid.

### 1.3 ⚠️ Le modèle confond le RÔLE et le CONTENU — 8 cases pour 5 rôles

POP a huit sections et **cinq rôles** : INTRO, COUPLET ×2, REFRAIN ×3, PONT,
OUTRO. `poserSequence(index, id)` travaille **par index** : rien ne relie les
trois REFRAIN entre eux.

Conséquences mesurées :

- il faut assigner **8 fois** pour 5 décisions — 3 assignations (37,5 %) ne
  sont que la répétition d'une décision déjà prise ;
- changer d'avis sur le refrain, c'est le changer **en trois endroits**, et rien
  n'empêche les trois de diverger en silence.

C'est exactement le mot de Yann : *« les couplets sont à peu près les mêmes »*.
Ce n'est pas une gêne d'interface, c'est un **défaut de modèle de données** : la
place dans la forme et le matériau joué sont dans le même objet.

### 1.4 ⚠️ Le chemin pour rendre POP audible est fermé depuis le Mode Live

Mesuré : charger POP coûte **4 taps** (⚙ → ARCHITECTURE → POP → fermer). Ensuite,
pour lui donner du contenu, il faut ouvrir **8 sous-lignes** dans ⚙ à 2 taps
chacune, soit **16 taps** — et surtout, avec une banque vide, le sélecteur d'une
section propose **exactement une ligne** :

> GARDER LE MOTIF COURANT

Sans un mot pour dire pourquoi. Le seul texte qui explique la banque est
ailleurs, dans le sélecteur BANQUE. Il faut donc : quitter le Live → aller dans
l'Atelier → composer une deuxième séquence → ➕ → revenir → ⚙ → assigner.
**Le Mode Live ne sait rien produire tout seul.**

### 1.5 ⚠️ Et la bascule MANUELLE ne respecte pas la règle du cycle

`queueSwapAtNextBar` bascule à la **prochaine mesure**. Or l'avance automatique,
elle, bascule à la fin de la **section**, donc sur une frontière de cycle. Les
deux chemins n'obéissent pas à la même règle.

Sur les 34 presets, le cycle propre vaut 4 mesures (30 presets) ou 2 (4 presets).
Un appui sur SUIVANT, ou sur une case, tombe donc sur une frontière de cycle :

| Cycle | Presets | Chance de tomber juste |
|---|---|---|
| 4 mesures | 30 | 1 sur 4 |
| 2 mesures | 4 | 1 sur 2 |
| | **moyenne** | **27,9 %** |

**Sept bascules manuelles sur dix coupent la progression d'accords en plein
milieu** — précisément ce que le §4 de l'audit 06 rendait « impossible par
construction »… pour les longueurs écrites, jamais pour le geste. Et
`resetCursorsAt` remet la nappe à zéro : la phrase n'est pas seulement coupée,
elle recommence.

C'est le point 2 de Yann (*« que ces boutons se lancent à la fin du cycle en
cours »*), et il a raison : ce n'est pas une préférence, c'est une incohérence
interne.

### 1.6 Trois défauts secondaires, trouvés en passant

- **La durée du morceau change PENDANT qu'il joue.** `dureeSecondes(sections,
  cycleMotif, tempo)` applique le cycle du motif **courant** à toutes les
  sections. Dès que deux sections portent des séquences de cycles différents,
  l'affichage est faux, et il bouge à chaque bascule. Idem pour « MESURE n/N ».
- **Aucun retour visuel quand une bascule est en attente.** À 90 BPM, attendre
  la fin d'un cycle de 4 mesures fait **10,7 s** sans que rien ne change à
  l'écran. Un bouton qui ne répond pas pendant dix secondes est lu comme cassé —
  et ça deviendra la règle si l'on passe la bascule à la fin du cycle (§1.5).
- **Une séquence supprimée de la banque laisse une section muette-en-silence** :
  `loadGardantTempo` ne trouve rien et ne fait rien, la section garde le motif
  précédent. Le sélecteur dit « séquence absente », la bande ne dit rien.

### 1.7 Ce qui va bien et qu'il ne faut pas casser

À l'écran, la bande tient : **832 × 44 px, huit cases de 84,8 × 44**, aucun
débordement, aucune case sous le seuil tactile. La quantification moteur
(`queueSwapAtNextBar` + horizon écrêté + `resetCursorsAt`) est juste et
testée (`tests/bascule-mesure.test.ts`). Le calcul du cycle propre
(`cycleDuMotif`) est juste et testé. **Le problème n'est ni dans le moteur ni
dans le dessin : il est dans le modèle et dans ce qu'on demande à l'utilisateur
de préparer.**

---

## 2. La proposition de Yann, prise au sérieux

Ses quatre points, confrontés au code :

| | Proposition | État | Coût |
|---|---|---|---|
| 1 | trois boutons de « presets » dérivés de la boucle, **en coupant des lignes** | le mécanisme existe (`lignes` + `liveMute` + `engine.liveSetMute`) ; la dérivation n'existe pas | **faible** |
| 2 | ils se lancent **à la fin du cycle en cours** | la bascule est à la mesure (§1.5) | **faible** |
| 3 | affecter un **nombre de cycles** à chacun | existe déjà (`Section.cycles`), mais rangé dans ⚙, par index | **nul** (déplacement) |
| 4 | des **presets d'architecture** « A B A B C B » avec les comptes | c'est ce que `MODELES` voudrait être, sans le vocabulaire pour le dire | **faible** |

Les quatre disent la même chose et je la formule ainsi :

> **Une architecture ne devrait pas contenir de contenu. Elle devrait citer des
> LETTRES, et les lettres devraient exister avant elle.**

C'est le §1.3 retourné : on sépare le RÔLE (une lettre, un nombre de cycles) du
MATÉRIAU (ce que la lettre joue). Alors « couplet refrain couplet refrain pont »
coûte **trois** décisions, pas huit, et les deux couplets ne peuvent pas diverger
puisque c'est la même lettre.

---

## 3. Ce que je recommande — le modèle VARIANTES × ARCHITECTURE

### 3.1 Deux objets au lieu d'un

```
Variante = {                      // le MATÉRIAU — ce qu'on entend
  lettre   : 'A' | 'B' | 'C' | …
  nom      : 'COUPLET' | 'REFRAIN' | …      (libellé, pas identité)
  lignes   : LineName[] | null              // calque sur le motif courant
  sequenceId?: string | null                // ou une entrée de banque
}

Architecture = {                  // la FORME — rien d'autre
  nom      : 'A B A B C B'
  pas      : Array<{ lettre, cycles }>
}
```

`Section` d'aujourd'hui = un `pas` **plus** une `Variante`, fusionnés. Les
séparer n'ajoute rien au vocabulaire : il en **retire** — un modèle
d'architecture n'a plus qu'un seul champ à porter par case.

### 3.2 Les trois variantes sont DÉRIVÉES de la boucle, pas assignées

C'est le point 1 de Yann, et c'est lui qui ferme le §1.4 : le Mode Live n'a plus
rien à préparer.

Règle proposée, **calibrée sur les 34 presets + le motif d'accueil** :

- **B — PLEIN** : toutes les lignes qui sonnent (la boucle telle qu'elle est).
- **A — RETENUE** : B moins les **deux** premières lignes présentes dans l'ordre
  de retrait `melody → clap → shaker → pad → hat → snare → bass → kick`
  (une seule si la boucle a moins de 5 lignes).
- **C — RUPTURE** : B moins le socle (`kick`, `snare`, `clap`) — ce qui plane
  reste, le sol disparaît.

Mesuré sur les 35 motifs (34 presets + l'accueil) :

| | |
|---|---|
| Lignes qui sonnent, moyenne | **6,69 sur 8** (min 3 — l'accueil ; min 6 sur les presets) |
| Taille moyenne de A / B / C | 4,71 · 6,69 · 4,31 |
| Motifs où deux variantes sont **identiques** | **0** |
| Motifs où une variante est **vide** | **0** |

⚠️ **La règle naïve échoue exactement là où elle sert le plus.** Une première
version retirait une liste FIXE de lignes (`clap`, `shaker`, `melody`) : elle
donne 0 collision sur les 34 presets… et **A = B sur le motif d'accueil**, qui
n'a ni clap, ni shaker, ni mélodie. C'est-à-dire deux boutons identiques sur le
seul motif que le Mode Live propose à froid. La version par **rang** (ci-dessus)
retire ce qui est là, pas ce qui est nommé : 0 collision sur les 35.

⚠️ **Et ce qu'elle ne fait pas, il faut le dire** : sur les 35 motifs, A ne
prend que **4 formes distinctes** — la dérivation lit l'INVENTAIRE des lignes,
pas la musique. Elle propose un point de départ jouable en zéro geste ; elle ne
compose pas. Les trois variantes doivent donc rester **éditables** (couper une
ligne de plus, ou déposer une séquence de banque), et c'est là que
`sequenceId` garde tout son sens — pour qui a préparé son set.

### 3.3 Les modèles d'architecture deviennent enfin comparables

Une fois les lettres sorties du modèle, tous les modèles sont de **même nature**
— une suite de lettres et de comptes :

| Modèle | Pas | Cases |
|---|---|---|
| **BOUCLE** (défaut) | `B×∞` | 1 |
| **COUPLET-REFRAIN** | `A×4 B×4 A×4 B×4 C×2 B×8` | 6 |
| **AABA** | `A×8 A×8 B×8 A×8` | 4 |
| **MONTÉE** | `A×2 A×4 B×4 B×8` | 4 |
| **SONNERIE** | `B×2` | 1 |

Le §1.2 disparaît : plus de mécanismes déguisés en formes. Le §1.3 aussi : les
deux `A` sont la même lettre, donc la même variante, donc une seule décision.
Et la bande garde ses mesures du §1.7 — 6 cases au lieu de 8, plus larges.

### 3.4 Ce que le Mode Live fait PAR DÉFAUT — la réponse

> **Le Mode Live est un instrument à trois variantes, pas une boucle unique.**
>
> À l'entrée : la boucle courante devient **B** ; **A** et **C** sont dérivées
> ; trois grands boutons les portent ; un appui bascule **à la fin du cycle en
> cours**, et le bouton l'annonce (case en attente clignotante) plutôt que de
> paraître mort pendant 10,7 s (§1.6).
>
> **Aucune architecture ne tourne.** L'enchaînement automatique est une seconde
> couche, optionnelle, qui cite les mêmes lettres — c'est-à-dire qu'elle ne
> demande **plus rien à préparer**, seulement une forme à choisir.

C'est le renversement : aujourd'hui il faut préparer une banque pour que
l'architecture existe ; demain l'architecture n'est qu'un enchaînement
automatique de gestes qu'on sait déjà faire à la main.

### 3.5 Deux détails qui coûtent cher si on les rate

- ⚠️ **Les lettres A–F sont DÉJÀ prises.** Les *snapshots* du ⚙ (`SNAPSHOT_COUNT`)
  s'appellent A à F et mémorisent l'**assignation des boutons**. Deux jeux de
  lettres qui ne désignent pas la même chose sur le même écran, c'est un piège.
  Sortie recommandée : les variantes portent leur **nom** en gros
  (PLEIN / RETENUE / RUPTURE, ou COUPLET / REFRAIN / PONT) et la lettre en
  petit ; les snapshots deviennent des **chiffres**.
- ⚠️ **Le calcul de durée doit devenir par-pas** (§1.6) : chaque pas connaît le
  cycle de SA variante. Sinon le seul chiffre que l'utilisateur lit vraiment
  (« MORCEAU 1 min 44 ») est faux dès qu'une variante porte une séquence.

---

## 4. Migration — ce que ça casse, et ce que ça ne casse pas

| | |
|---|---|
| Format v2 (`model/types.ts`) | **pas touché** — une architecture n'est pas de l'état de morceau |
| Banque de séquences | **pas touchée** — elle devient le contenu OPTIONNEL d'une variante |
| `localStorage` de l'architecture | la clé change de forme ; `valide()` rejette l'ancienne et retombe sur `null` = boucle simple. Une set-list perdue, pas un morceau |
| `engine/AudioEngine.ts` | un ajout (`queueSwapAtEndOfCycle`), la file existante ne bouge pas |
| `stores/game.svelte.ts` — `monterLeSet` (acte 6) | **simplifié** : trois boucles livrées → trois variantes, plus de mappage par nom de section ni de repli « première boucle » |
| `tests/architecture.test.ts` | à réécrire ; `cycleDuMotif`, `mesuresDeSection`, `dureeSecondes`, `formaterDuree` restent tels quels |
| `tests/bascule-mesure.test.ts`, `mute-live.test.ts`, `catalogue-live.test.ts` | inchangés |

---

## 5. Ce que je ne recommande pas

- **Garder `sequenceId` comme unique contenu d'une section.** §1.1 et §1.4 : ça
  fait porter à l'utilisateur une préparation qu'il n'a aucune raison d'avoir
  faite, et à froid ça ne joue rien.
- **Dériver les variantes en modifiant le MOTIF** (retirer des pas, transposer).
  Le calque de lignes est réversible et gratuit ; une dérivation qui écrit dans
  le motif rendrait la variante destructive, et « revenir à B » impossible.
- **Une liste FIXE de lignes à couper.** §3.2 : elle échoue sur le seul motif
  que le mode propose à froid.
- **Plus de trois variantes par défaut.** Quatre boutons, c'est un menu ; trois,
  c'est une main. Rien n'empêche d'en ajouter une à la main plus tard.
- **Un éditeur d'architecture dans le Mode Live.** Inchangé depuis l'audit 06 :
  on compose dans l'Atelier, on joue en Live. Ce que le Live gagne ici, c'est
  précisément de n'avoir **rien** à composer.
- **L'automation (famille 3 de l'audit 06).** Toujours pas d'abord : l'escalier
  se fait maintenant en trois variantes et une suite de lettres.

---

## 6. Découpage

| | tranche | ce qu'elle livre | dépend de |
|---|---|---|---|
| **A** | **Les trois variantes dérivées** | `variantesDe(state)` pur et testé (calibré §3.2), trois boutons dans le Live, bascule à la main | rien |
| **B** | **La bascule à la fin du CYCLE** | `queueSwapAtEndOfCycle` dans le moteur + l'attente VISIBLE sur la case (§1.6) | rien — corrige un défaut actuel (§1.5) |
| **C** | **Le modèle lettres** | `Variante` / `Architecture{pas}`, les cinq modèles du §3.3, la bande qui les joue, la durée par pas (§1.6) | A, B |
| **D** | **Le raccord du jeu** | `monterLeSet` (acte 6) en trois variantes, et l'acte 7 qui envoie sur scène | C |
| **E** | *(si besoin)* | l'édition d'une variante : couper une ligne de plus, y déposer une séquence de banque | C |

**A et B sont indépendantes du modèle** et valent d'être livrées seules : à
elles deux elles répondent déjà à *« ce que le Mode Live fait par défaut »*, et
B corrige une incohérence qui existe aujourd'hui.
