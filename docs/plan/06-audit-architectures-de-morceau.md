# Audit — décrire une architecture de morceau (le macro-séquenceur)

> Demandé par Yann le 2026-09-02 : *« fais un véritable audit sur la possibilité
> de décrire des architectures type de morceaux […] j'imagine un
> macro-séquenceur-ception à faire apparaître dans le mode live. Par défaut,
> c'est mono-cycle mais on pourrait paramétrer 8 cycles de A puis 8 cycles de B
> etc. »*, avec trois cadrages : **oublier le jeu et 2005**, une durée libre
> (limite éventuelle à 10 min, à évaluer), et **tout au même tempo**.
>
> Suite de [`05-audit-mode-live.md`](05-audit-mode-live.md), qui traitait le
> mode tel qu'il est. Celui-ci ne traite qu'une question : peut-on **décrire**
> une architecture, et avec quel vocabulaire.

---

## 0. Ce qui a été mesuré

Sur `main d6c4221`, dans le code et dans les 34 presets — pas de mémoire.
Trois choses ont changé mes conclusions en cours de route, et elles sont toutes
dans le format d'état, pas dans l'interface.

---

## 1. Le format sait déjà plus que je ne le croyais — et c'est ça qui recadre la question

### 1.1 Une ligne de BATTERIE fait exactement une mesure. Toujours.

`stepDurationFor = barDuration / subdiv` (`engine/groove.ts`). Quelle que soit
la subdivision — 3, 7, 16, 32 — une ligne de batterie boucle en **une mesure
pile**. La polyrythmie de la boîte est une affaire de subdivisions *dans* la
mesure, jamais de longueurs de boucle inégales.

### 1.2 Une ligne de SYNTHÉ fait 1 à 16 mesures — et la nappe en fait 4

`SynthRowState.cycleBars: 1..16`, et
`stepDurForLine = cycleBars × barDur / subdivisions` (`engine/harmony.ts`).
Compté dans les données :

| | |
|---|---|
| Presets dont la nappe fait **4 mesures** | **30 sur 34** |
| Presets dont la nappe fait **2 mesures** | 4 |
| Presets au-delà de 4 | **aucun** |
| `defaultState()` | nappe **4**, basse et mélodie 1 |

**Donc le motif a DÉJÀ un cycle propre, et il ne vaut pas 1.** Il vaut 4 mesures
par défaut et dans 30 presets sur 34. « Par défaut c'est mono-cycle » décrit ce
qu'on croit voir, pas ce que l'appli joue : elle joue une boucle de quatre
mesures dont la batterie se répète quatre fois.

C'est la mesure la plus importante de cet audit, et tout le §4 en découle.

### 1.3 La nappe porte une PROGRESSION D'ACCORDS

Son motif n'est pas un rythme mais une suite d'index d'accords sur
`chordCount` triades diatoniques (4 à 7), sur `cycleBars` mesures. Une nappe à
12 mesures / 12 pas écrit littéralement `I I I I · IV IV I I · V IV I I`.

⚠️ **Ceci corrige ce que j'ai écrit dans l'audit précédent** (« le blues
12 mesures est le seul à sortir, la boîte n'a pas de grille d'accords »).
C'était faux : elle en a une. Un blues 12 mesures **tient dans un seul motif**,
sans macro-séquenceur. La correction change la conclusion, d'où le §1.4.

### 1.4 ⇒ Où le macro-séquenceur gagne sa place — deux endroits, et deux seulement

1. **Au-delà de 16 mesures** — le plafond de `cycleBars`. Un AABA de
   32 mesures ne rentre pas dans un motif ; un blues de 12, si.
2. **Dès que la BATTERIE change.** Une ligne de batterie fait une mesure,
   toujours (§1.1). **Rien, dans le format actuel, ne peut faire jouer à la
   batterie un couplet et un refrain différents.** C'est une impossibilité
   structurelle, pas un manque d'interface — et c'est de très loin la
   meilleure justification du chantier.

Tout le reste (une progression d'accords, une mélodie de 4 ou 8 mesures, un
riff qui respire) est déjà faisable aujourd'hui sans rien ajouter.

---

## 2. Les architectures, classées par MÉCANISME et non par genre

Un tableau de genres ne dit rien à un développeur : deux genres voisins peuvent
demander deux mécanismes opposés, et deux genres éloignés le même. Voici ce que
les formes demandent *à la machine*. Quatre familles, et elles se distinguent
par **ce qui change d'une section à l'autre**.

| | Famille | Ce qui CHANGE | Exemples |
|---|---|---|---|
| **1** | **Sectionnelle** (les formes « à lettres ») | **le motif entier** | AABA (32 mes., le standard de jazz et de chanson), couplet-refrain (la quasi-totalité de la pop et du rock), ABA ternaire, rondo ABACA, blues 12 mesures |
| **2** | **Additive / processus** | **l'instrumentation**, sur un motif inchangé | le *Boléro* de Ravel (un seul thème, l'orchestration EST l'arrangement), le minimalisme de Reich, la techno de Detroit, l'afrobeat de Fela (vingt minutes sur deux accords), le dub |
| **3** | **Continue / paramétrique** | **une valeur, progressivement** | la montée d'un morceau électronique, un breakdown, un riser, un crescendo orchestral |
| **4** | **Non répétitive** (*through-composed*) | tout, à chaque fois | *Bohemian Rhapsody*, le prog, une musique de film, beaucoup de post-rock |

Ce que chaque famille exige, traduit en structure de données :

| Famille | Il faut… | Coût ici |
|---|---|---|
| 1 | une liste ordonnée de (motif, nombre de répétitions) | **faible** — le motif est déjà un objet nommé (la banque) |
| 4 | la même liste, sans réutilisation | **faible** — mais consomme des entrées de banque |
| 2 | **un masque d'instrumentation par section**, sur le MÊME motif | **faible**, à une condition : que le masque soit un *calque* et pas une copie du motif (§6) |
| 3 | **une automation** : une valeur interpolée sur N mesures | **le seul poste cher** — voir §5.3 |

**Les familles 1 et 4 sont le même mécanisme.** La proposition de Yann les
couvre toutes les deux. La question de l'audit est donc : que fait-on de 2 et 3.

---

## 3. « 8 cycles de A puis 8 cycles de B » — confrontation

### Ce que ça couvre, et c'est beaucoup

Les familles 1 et 4, soit la structure de la majorité de la musique
enregistrée. AABA, couplet-refrain, rondo, blues, *through-composed* : tous
sont une liste plate de (motif, répétitions). La répétition d'une lettre ne
coûte rien — `A A B A` est quatre entrées qui pointent deux motifs.

**Le modèle est le bon.** Ce qui suit ne le remet pas en cause : ce sont trois
choses qu'il ne dit pas, et qui décident si le résultat sonne.

### 3.1 Il ne dit pas ce que « cycle » veut dire — c'est le §4, et c'est bloquant

### 3.2 Il ne dit rien de la TRANSITION — c'est le §5, et c'est ce qui sépare « ça marche » de « ça sonne »

### 3.3 Il ne peut pas exprimer une MONTÉE

Une montée de 16 mesures est une valeur qui bouge en continu. En liste plate,
il faudrait un motif par mesure — seize entrées de banque pour un geste. C'est
la famille 3, et c'est le seul endroit où le modèle atteint sa limite pour de
bon. Ce que je recommande d'en faire est au §5.3.

---

## 4. Le mot « cycle » est le bon — à condition que l'appli le CALCULE

C'est le point à trancher avant d'écrire une ligne, parce qu'il change le sens
de tous les nombres que l'utilisateur va taper.

**Le problème.** Le cycle propre d'un motif est le plus petit commun multiple
des longueurs de ses lignes : 1 mesure pour toute la batterie (§1.1),
`cycleBars` pour chaque ligne synthé (§1.2). Avec les valeurs réelles, il vaut
**4 mesures** dans 30 presets sur 34 — et il pourrait valoir 6 (basse à 2,
nappe à 3) ou 12.

Donc « 8 cycles de A » n'a pas une valeur mais deux, et l'écart est un facteur
quatre :

| Lecture | « 8 cycles » sur un motif à nappe de 4 mesures | |
|---|---|---|
| cycle = **mesure** | 8 mesures | la nappe joue **deux fois** |
| cycle = **tour de motif** | 32 mesures | la nappe joue **huit fois** |

**Ce que je recommande : cycle = tour de motif, calculé, jamais supposé.**
Trois raisons, dans cet ordre :

1. **C'est le mot de Yann, et c'est le bon mot** — un cycle est ce qui se
   répète, pas une unité de mesure arbitraire.
2. **Ça rend la coupure de phrase impossible par construction.** Compter en
   mesures autorise « 6 mesures » sur un motif à cycle de 4 : la nappe est
   coupée en plein milieu de sa progression, une fois sur deux. Compter en
   cycles interdit d'écrire cette section.
3. **Ça se calcule en trois lignes** — `ppcm(1, cycleBars.bass, cycleBars.pad,
   cycleBars.melody)`, en ignorant les lignes muettes.

**Et l'interface affiche les deux** : `A × 8` avec, en petit, `32 mesures ·
1 min 04`. Le musicien pense en cycles, l'ingénieur lit des mesures, et
personne ne se trompe.

⚠️ **Le corollaire à ne pas rater** : une ligne muette ne doit pas compter
dans le ppcm. Sinon un motif dont la nappe est coupée mais laissée à
`cycleBars: 16` impose des sections de seize mesures pour rien.

---

## 5. La transition — ce qui sépare « ça marche » de « ça sonne comme un morceau »

Une liste de motifs mis bout à bout ne fait pas un morceau. Ce qui fait un
morceau, c'est ce qui se passe **au joint**. Trois choses, par ordre
décroissant de rentabilité.

### 5.1 ⚠️ Le fill tomberait AU MAUVAIS ENDROIT — défaut à corriger, pas à ajouter

`isFillBar(state, currentBar)` (`engine/groove.ts`) lit `currentBar`, qui est
le compteur **absolu** de mesures depuis ▶ (`AudioEngine.tick`). Avec
`fillEvery = 4`, les fills tombent donc sur les mesures 3, 7, 11, 15…
**de la lecture**, pas de la section.

Conséquence concrète : une section A de 5 mesures, puis B — les fills de B
tombent sur ses mesures 2 et 6. Le fill, qui est exactement le geste qui
annonce un changement de section, atterrirait n'importe où. Le morceau
sonnerait décousu, et on chercherait la cause dans l'enchaînement alors qu'elle
est dans le compteur.

**Le correctif est un décalage, pas une fonctionnalité** : `isFillBar` doit
recevoir la mesure **dans la section** (`currentBar − débutDeSection`). La
machinerie existe déjà et se met alors à travailler *pour* l'arrangement :
`fillEvery` calé sur la longueur de section fait un fill sur la dernière
mesure de chaque section, gratuitement.

### 5.2 La bascule doit être quantisée DANS le moteur

Déjà démontré dans l'audit précédent, rappelé ici parce que c'est la pièce sans
laquelle rien ne tient : `SCHEDULE_AHEAD = 0,25 s`, soit **deux pas de doubles
croches déjà programmés à 120 BPM**. Une bascule faite depuis l'interface, même
au bon instant, laisse les deux premiers pas de la nouvelle section jouer
l'ancien motif. Il faut une file appliquée là où `currentBar` s'incrémente —
au même endroit que le break et le fill, qui ont déjà réglé ce problème.

S'y ajoutent deux choses mesurées : les curseurs de ligne doivent repartir à
zéro (sinon une section commence au milieu d'une phrase), et **le tempo de
l'entrée de banque ne doit pas être appliqué** — ce que Yann a tranché de
lui-même (« on met tout au même tempo »), et qui est le bon arbitrage : le
tempo appartient au morceau, pas à la section.

### 5.3 L'automation (famille 3) : je recommande de NE PAS la faire d'abord

Une vraie automation — une valeur d'axe interpolée sur la durée d'une section —
est le seul poste cher : il faut une piste par section, une courbe, une
interpolation lue à chaque fenêtre de scheduling, et une interface pour la
dessiner sur un téléphone en paysage.

**Le substitut coûte zéro et s'entend correctement** : une section porte un état
complet, donc une montée de 16 mesures s'écrit en **quatre sections de
4 mesures** dont le filtre s'ouvre par paliers. C'est un escalier au lieu d'une
rampe. C'est aussi, littéralement, ce que fait une boîte à rythmes matérielle,
et personne ne s'en est jamais plaint.

**À ne trancher qu'après avoir entendu l'escalier.** S'il déçoit, l'automation
se rajoute sans rien casser : c'est un champ facultatif de plus sur la section.

---

## 6. Le modèle proposé

```
Section = {
  motif      : id d'entrée de banque,
  cycles     : nombre de tours du cycle propre du motif (§4),
  lignes?    : masque d'instrumentation — 8 bits, un par ligne   ← famille 2
  fill?      : fill sur la dernière mesure (défaut : oui)        ← §5.1
}

Architecture = { nom, sections: Section[] }   // le tempo n'y est PAS : il est du transport
```

Quatre remarques, dans l'ordre où elles ont été tranchées.

**Le masque de lignes est un CALQUE, pas une copie du motif.** C'est ce qui
rend la famille 2 gratuite : un seul motif en banque sert d'intro, de couplet
et de refrain en masquant des lignes. Sans le calque, il faudrait trois copies
du même motif, et corriger le kick voudrait dire le corriger trois fois. C'est
aussi, exactement, la bande de mutes proposée au §3 de l'audit précédent :
**la bande de mutes EST l'éditeur de section**, et voilà enfin la raison — la
famille 2 est une matrice d'instrumentation, rien d'autre.

**Une section pointe un motif, elle ne le contient pas.** Corriger un motif
corrige toutes les sections qui le citent. C'est ce qu'on veut : dans une forme
AABA, les trois A sont le même matériau, pas trois copies qui divergent au
premier réglage.

**Le tempo est hors de l'architecture.** Arbitré par Yann, et il a raison.

**« Mono-cycle par défaut » est gratuit et ne migre rien.** Architecture vide =
une section implicite, motif courant, cycles infinis — c'est-à-dire le
comportement d'aujourd'hui, au bit près. Aucun état enregistré ne change,
aucune sauvegarde ne se relit autrement.

---

## 7. La durée — la vraie limite n'est pas là où on la cherche

### 7.1 Une limite en mesures n'est pas une limite en minutes

| Tempo | 1 mesure | 10 min font | 64 mesures font |
|---|---|---|---|
| 40 BPM | 6,00 s | 100 mesures | **6 min 24** |
| 90 BPM | 2,67 s | 225 mesures | 2 min 51 |
| 120 BPM | 2,00 s | 300 mesures | 2 min 07 |
| 174 BPM | 1,38 s | 434 mesures | 1 min 28 |
| 200 BPM | 1,20 s | 500 mesures | **1 min 17** |

Le même morceau écrit en mesures dure **cinq fois plus long** à 40 qu'à
200 BPM. Une limite en mesures ne veut donc rien dire pour l'utilisateur, et
une limite en minutes se traduit par un nombre de sections différent à chaque
tempo. **Ne pas plafonder la durée : l'AFFICHER.** Le total en minutes se
recalcule à chaque changement de tempo, et c'est l'information utile.

### 7.2 Le morceau lui-même ne coûte rien

Une section est un id et deux entiers. Trois cents mesures d'arrangement pèsent
quelques centaines d'octets. Il n'y a aucune raison technique de brider la
longueur d'un morceau.

### 7.3 Là où les 10 minutes deviennent un vrai chiffre : la CAPTURE

C'est le ⏺ REC qui paie, et il paie cher. `LiveRecorder` (`engine/recorder.ts`)
accumule des `Float32Array` de 128 échantillons dans un tableau JS, puis
fusionne, puis crée un `AudioBuffer`, puis encode un WAV — chaque étape est une
copie complète, et les deux premières coexistent. Mesuré à 48 kHz, mono :

| Durée | Fragments accumulés | Pic à la fusion | AudioBuffer | WAV livré |
|---|---|---|---|---|
| 1 min | 22 500 | 26 Mo | 23 Mo | 6 Mo |
| 3 min | 67 500 | 77 Mo | 69 Mo | 17 Mo |
| 5 min | 112 500 | **128 Mo** | 115 Mo | 29 Mo |
| **10 min** | **225 000** | **256 Mo** | **230 Mo** | **58 Mo** |

Un quart de gigaoctet sur le fil principal d'un téléphone, pour un mode conçu
pour être joué sur un téléphone. **Voilà le seul endroit où une limite de dix
minutes se justifie par un chiffre plutôt que par un avis** — et elle porte sur
l'enregistrement, pas sur le morceau.

Deux sorties existent, hors périmètre de cet audit mais à noter puisque la
mesure est faite : accumuler dans un tampon pré-alloué qui grandit par blocs
(supprime le pic de fusion), ou encoder en WAV au fil de l'eau. La seconde
rendrait la durée quasi illimitée.

---

## 8. L'écran — le « -ception » est la bonne image, et il est mesurable

Un séquenceur dont les pas sont des motifs et dont la durée d'un pas est une
section : c'est exactement `drawLinSeq` (le séquenceur linéaire du Live) monté
d'un étage. Même dessin, même tête de lecture, même code de couleur — une
bande de cases, une par section, la case courante allumée, remplie à
proportion de son avancement.

Mesuré en 844 × 390, la bande fait **832 px** de large :

| Sections | Largeur d'une case | |
|---|---|---|
| 8 | 104 px | ✅ |
| 12 | 69 px | ✅ |
| 16 | 52 px | ✅ |
| **18** | **46 px** | ✅ **le plafond sans défilement** |
| 24 | 35 px | ❌ sous le seuil tactile |
| 32 | 26 px | ❌ |

**18 sections tiennent en pleine largeur à 44 px et plus** — largement de quoi
écrire un AABA, un couplet-refrain complet ou une montée en escalier. Au-delà,
la bande défile ; ce n'est pas un plafond de modèle, seulement d'affichage.

Deux boutons restent nécessaires quoi qu'il arrive, parce qu'un set n'obéit
jamais au compte : **SUIVANT** (saute à la section suivante à la prochaine
mesure) et **TENIR** (boucle la section courante tant qu'on ne relâche pas).

Et une règle d'écran, la même que dans l'audit précédent : **on COMPOSE
l'architecture dans l'Atelier** (à côté de la banque, qui y est déjà), **on la
JOUE en Mode Live**. Éditer une chaîne sur 390 px de haut est le contraire de
jouer.

---

## 9. Ce que je ne recommande pas

- **Compter en mesures.** §4 : c'est ce qui autorise à couper une phrase.
- **Copier le motif dans la section.** §6 : les trois A d'un AABA divergeraient.
- **Plafonner la longueur d'un morceau.** §7.2 : ça ne coûte rien. Plafonner
  la capture, oui — §7.3.
- **Commencer par l'automation.** §5.3 : l'escalier d'abord, et on écoute.
- **Un éditeur d'arrangement dans le Mode Live.** §8.
- **Des sous-répétitions imbriquées** (« ×2 le bloc couplet-refrain »). Ça a
  l'air économique et ça ne l'est pas : ça double le vocabulaire pour éviter de
  dupliquer deux entrées dans une liste qui en tient dix-huit.

---

## 10. Découpage

| | tranche | ce qu'elle livre | dépend de |
|---|---|---|---|
| **A** | **Le cycle calculé** | `cycleDuMotif(state)` = ppcm des lignes non muettes, affiché partout où on parle de longueur | rien |
| **B** | **La bascule quantisée** | file de bascule à la mesure dans `AudioEngine`, curseurs remis à zéro, tempo non appliqué, `currentBar` lisible | rien |
| **C** | **Le fill recalé** | `isFillBar` reçoit la mesure DANS la section — corrige un défaut qui existe déjà | B |
| **D** | **Le modèle et la bande** | `Section`/`Architecture`, la bande dans le Live, SUIVANT / TENIR | A, B |
| **E** | **L'éditeur d'Atelier** | composer une architecture à côté de la banque | D |
| **F** | *(optionnel, après écoute)* | l'automation de la famille 3 | D |

A, B et C sont indépendantes de l'idée elle-même : **B et C corrigent des
défauts qui existent aujourd'hui**, avec ou sans macro-séquenceur.

---

## Ce que cet audit ne dit pas

- **Rien n'a été essayé sur un vrai téléphone**, ni ce mode ni ce chantier.
- **La famille 2 n'est jouable qu'une fois la bande de mutes faite**
  ([`05-audit-mode-live.md`](05-audit-mode-live.md), §3) : le masque de section
  et la bande de mutes sont le même objet, et il n'existe pas encore.
- **Le seuil des 18 sections est un plafond d'affichage mesuré, pas un
  arbitrage** : il tombe si la bande défile.
