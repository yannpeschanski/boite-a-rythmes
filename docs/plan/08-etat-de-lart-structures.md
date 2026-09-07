# État de l'art — structures de morceau et modèles clé en main

> Demandé par Yann le 2026-09-07, sur la fiche `assemblage.html`, carte
> « Cinq montages » : *« Sonnerie, je ne vois pas l'intérêt. Il faut que tu
> regardes ce qui existe par ailleurs, une vraie analyse de l'état de l'art
> pour sortir quelques modèles clé en main. »*
>
> Suite de [`07-audit-assemblage-de-morceau.md`](07-audit-assemblage-de-morceau.md).
> Celui-ci ne traite qu'une question : **quels modèles livrer, et sur quoi les
> fonder.** Il rapporte aussi une trouvaille qui recadre le §4 de l'audit
> précédent — le cadrage de Yann n'est pas une exception, c'est la norme de la
> catégorie.

---

## 1. Ce que font les machines — et les trois surprises

### 1.1 ⚠️ Beaucoup de grooveboxes n'ont PAS de mode morceau, et c'est délibéré

> *« Many grooveboxes don't have traditional song modes because they are often
> created to be performed in real time, with users "performing" the patterns to
> define the song structure. »*

C'est, mot pour mot, le cadrage que Yann a posé sur la fiche : *« l'intérêt,
c'est aussi de pouvoir faire bouger les paramètres en direct et créer un morceau
vivant […] on n'a pas le choix de mélanger les aspects live / établi de
morceau »*. Sa question — *« c'est un peu à l'ancienne non ? »* — appelle une
réponse nette : **non, c'est la façon dont la catégorie entière fonctionne
aujourd'hui.** Le mode morceau y est l'exception tardive, pas la règle.

Preuve par le calendrier : le **Song Mode d'Elektron** (Digitakt, Digitone,
Syntakt) est arrivé par **mise à jour de firmware**, des années après les
machines. Avant lui, *« pattern chains would always have to be set up by the
user in the moment »* — on jouait la structure, on ne l'écrivait pas.

**Conséquence pour nous :** le §4 de l'audit 07 posait un choix binaire
(scène OU établi). Il était mal posé. La catégorie a tranché depuis longtemps :
**on prépare de la matière, on joue la structure.** C'est le cadrage (D)
ci-dessous, et il rend caduque une partie du plan précédent.

### 1.2 Le mot juste existe, et ce n'est pas « section » : c'est **SCÈNE**

Une scène, au sens groovebox et au sens de la *Session View* d'Ableton, est
**un jeu de comportements de pistes déclenchable en temps réel** — quelles
pistes jouent, lesquelles sont coupées, dans quel état. On la déclenche à la
main, ou on en enchaîne plusieurs.

C'est exactement ce que fait notre bande : une case = un motif + un masque de
lignes. Le vocabulaire existe donc déjà, il est compris de tout le monde, et il
dit mieux que « section » que **la chaîne est un ordre suggéré, pas une
timeline**.

### 1.3 ⚠️ Personne ne livre de modèles de structure dans une machine

Vérifié : ni Elektron, ni Novation (Circuit chaîne jusqu'à 32 patterns, et des
chaînes de chaînes — mais on part d'une chaîne vide), ni les DAW. Les modèles
de structure **existent**, mais comme **produit tiers payant** : packs de
templates Ableton, structures de morceaux d'artistes vendues à part.

**C'est la trouvaille qui compte pour la décision.** Il n'y a **aucune liste de
référence à recopier** : livrer des modèles clé en main est un choix de produit,
pas une convention. Deux conséquences :

- on ne peut pas se tromper « contre le standard », il n'y en a pas ;
- mais on ne peut pas non plus s'abriter derrière lui : le choix des modèles est
  éditorial, et il t'appartient.

---

## 2. Les longueurs — la seule chose qui soit vraiment conventionnelle

La musique de danse est en 4/4, et ses sections sont bâties sur des phrases de
**8, 16 ou 32 mesures**. Les valeurs rapportées :

| | longueur usuelle |
|---|---|
| Intro | 8 à 32 mesures |
| Montée / *build* | 8 à 16 |
| *Drop* | 8 à 16 |
| *Breakdown* | 8, 16 ou 32 |
| Section principale | 32 à 64 |

**Pourquoi la convention existe** : elle sert au DJ à enchaîner deux disques
sans se tromper de point d'entrée. Ce n'est pas une règle musicale, c'est une
règle de mixage — utile à savoir, parce qu'elle ne s'applique pas à un morceau
qu'on ne mixera pas.

### 2.1 ⚠️ Ce que ça donne chez nous, et la bonne surprise

Notre cycle propre vaut **4 mesures** dès qu'une nappe s'étale sur quatre — le
cas de 30 presets sur 34. Donc :

| en tours | en mesures | à 120 BPM |
|---|---|---|
| ×1 | 4 | 8 s |
| ×2 | **8** | 16 s |
| ×4 | **16** | 32 s |
| ×8 | **32** | 1 min 04 |

**Les tours tombent exactement sur les phrases conventionnelles.** ×2 = 8
mesures, ×4 = 16, ×8 = 32. Le choix de compter en tours plutôt qu'en mesures
(audit 06 §4) se trouve donc être aussi le choix qui aligne l'appli sur la
convention, sans que personne ait à y penser.

### 2.2 ⚠️ Et ce qu'il ne faut PAS copier

Un morceau EDM complet fait cinq à sept minutes, avec des sections de 32 à 64
mesures. **Viser ça ici n'a pas de sens** : sans automation — et Yann vient de
l'exclure explicitement, *« ça rend l'exercice trop fastidieux par rapport à
l'ambition de l'app »* — six minutes de morceau, c'est six minutes de gestes à
la main. Les modèles ci-dessous visent **1 à 2 minutes**.

---

## 3. Les formes, classées par ce qui CHANGE

Un tableau de genres ne dit rien. Voici ce que chaque forme demande à la
machine.

| Forme | Ce qui change d'une section à l'autre | Lettres | Où on la trouve |
|---|---|---|---|
| **AABA** (32 mesures) | **le seul B** | 2 | le standard de chanson et de jazz, la forme la plus documentée |
| **Couplet / refrain** | le motif entier, en alternance | 2 | la quasi-totalité de la pop et du rock |
| **A B B′** | deux motifs, plus un calque sur B | 2 | ton second exemple ; très courant en électro |
| **Arc d'intensité** | **rien du motif** — l'instrumentation et le filtre | **1** | house, techno, tout l'EDM |
| **Riddim / dub** | des coupures ponctuelles, à la main | 1 | dancehall, dub |
| **Rondo ABACA** | le motif entier, avec **deux** contrastes | **3** | forme classique, rare en musique populaire |

⚠️ **Cinq des six formes tiennent avec DEUX lettres**, et deux n'en demandent
qu'une. C'est l'argument le plus fort pour ton « partons sur 3 déjà » : trois
suffit largement, et la troisième est du confort, pas une nécessité.

---

## 4. Les modèles proposés — quatre, plus le défaut

Durées calculées sur un cycle de 4 mesures à 120 BPM. `A′` = A avec un calque de
lignes (ce n'est pas un motif de plus à composer).

### BOUCLE — le défaut
`A ×4` · **16 mesures · 32 s · 1 lettre**
Ce n'est pas un modèle, c'est l'absence de chaîne : un motif qui tourne, et les
mains font tout. C'est le comportement d'aujourd'hui, et le point de départ de
la moitié des grooveboxes.

### COUPLET / REFRAIN — ton exemple 1
`INTRO A′×1 · A×2 · B×2 · A×2 · B×2 · PONT A′×1 · B×2 · OUTRO B′×1`
**52 mesures · 1 min 44 · 2 lettres**
Écrit ligne pour ligne d'après ton message. L'intro entre par un calque, le pont
est A allégé, l'outro est B qui s'efface.

### A B B′ — ton exemple 2
`A×2 · B×2 · B′×2 · A×2 · B×2 · B′×2 · A′×1 · OUTRO A′×1`
**56 mesures · 1 min 52 · 2 lettres**

### AABA — la forme de 32 mesures
`A×2 · A×2 · B×2 · A×2` · **32 mesures · 1 min 04 · 2 lettres**
⚠️ Jolie coïncidence, et elle mérite d'être dite : sur un cycle de 4, `×2` vaut
8 mesures, donc ce modèle tombe **exactement** sur la forme historique
A(8) A(8) B(8) A(8). C'est la plus ancienne et la plus documentée des quatre, et
la seule où **une seule section contraste**.

### CLUB — l'arc d'intensité
`INTRO A′×2 · MONTÉE A′×2 · DROP A×4 · BREAK A′×2 · DROP A×4 · SORTIE A′×2`
**64 mesures · 2 min 08 · UNE lettre**
Le seul qui ne demande **qu'un motif** : ce sont les calques qui font le morceau.
Longueurs conformes à la convention du §2 (intro 16, montée 16, drop 32).
C'est aussi celui qui justifie que le calque existe.

### Ce qui SORT

**SONNERIE est retiré**, comme demandé. Il ne décrivait pas une forme — un hook
de huit mesures, c'est `BOUCLE` avec un autre nom — et son seul argument était
le récit de 2005, ce qui n'a rien à faire dans un outil.

### ⚠️ Une conséquence à regarder en face : la lettre C ne sert jamais

Aucun des quatre modèles n'utilise C. Trois sorties :

1. **L'assumer** : C est de la place libre pour les chaînes qu'on écrit soi-même.
   *(Recommandé — c'est cohérent avec « deux lettres suffisent ».)*
2. **Ajouter un rondo `ABACA`** (`A×2 · B×2 · A×2 · C×2 · A×2`, 40 mesures,
   1 min 20), le seul modèle qui demande trois motifs. Forme classique, rare en
   musique populaire.
3. **Redescendre à deux lettres.** Cohérent avec la mesure, mais ferme la porte
   à toute chaîne à trois matières écrite à la main.

---

## 5. Ce que ce document change au plan de l'audit 07

Le cadrage de Yann (mélanger scène et établi, pas de choix binaire) est
maintenant écrit et étayé. Il **annule** et **ajoute** :

| | Tranche de l'audit 07 | Devient |
|---|---|---|
| 5 | Export d'une chaîne hors ligne | ❌ **Annulée.** Un morceau dont l'intérêt est le geste en direct ne se rend pas hors ligne sans automation, et l'automation est exclue |
| — | — | ✅ **Nouveau : sauvegarder un morceau monté en JSON** (« avant le wav ») |
| — | — | ✅ **Nouveau : ⏺ REC devient LA sortie audio**, donc il faut le regarder : 256 Mo de pic à dix minutes, WAV et pas MP3 |
| — | — | ✅ **Nouveau : ranger la banque et les morceaux** |
| 4 | Le mix qui suit la bascule | ⚠️ **Reformulée** — voir la fiche : la vraie question est de savoir si une lettre porte un SON ou seulement des NOTES |

⚠️ **Et un préalable qui bloque tout le reste :** *« il faut tester pour
juger »*. Les pull requests sont **testées mais jamais déployées**
(`.github/workflows/ci.yml`, `if: github.event_name == 'push'`), et le seul
artefact récupérable est le fichier HTML autonome — qui, ouvert en `file://`,
**n'est pas un contexte sécurisé**, donc le capteur d'inclinaison n'y marche
pas. C'est la raison, jamais nommée en trois audits, pour laquelle *« rien n'a
jamais été essayé sur un vrai téléphone »*. Sortie : un déploiement de
prévisualisation par pull request. Quelques lignes de CI, un secret déjà en
place — mais ça touche le pipeline de déploiement, donc à valider.

---

## Sources

- [Elektron Song Mode Firmware Update — Perfect Circuit](https://www.perfectcircuit.com/signal/elektron-song-mode-update)
- [Drum machines / grooveboxes with song mode — Gearspace](https://gearspace.com/board/electronic-music-instruments-and-electronic-music-production/1322197-drum-machines-groove-boxes-song-mode.html)
- [Novation Circuit 1.7 adds song mode — CDM](https://cdm.link/newswires/novation-circuit-1-7-adds-song-mode-and-more-in-yet-another-update/)
- [Groovebox — Wikipedia](https://en.wikipedia.org/wiki/Groovebox)
- [Thirty-two-bar form — Wikipedia](https://en.wikipedia.org/wiki/Thirty-two_bar_form)
- [EDM Song Structure — Hyperbits](https://hyperbits.com/blog/edm-song-structure/)
- [How to arrange a Dance Music track — Mixed In Key](https://mixedinkey.com/captain-plugins/wiki/how-to-arrange-a-dance-music-track/)
- [Ableton Live Song Structure Templates — CloudBounce](https://www.cloudbounce.com/packs/ableton-song-structure-templates)
