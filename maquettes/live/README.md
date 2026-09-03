# Mode Live — la bande d'architecture (2026-09-02)

> « fais la maquette de la bande » — Yann, après
> [`docs/plan/06-audit-architectures-de-morceau.md`](../../docs/plan/06-audit-architectures-de-morceau.md).

`bande-architecture.html` — trois propositions, chacune dans l'écran réel en
**844 × 390** (le paysage cible), à la place de l'actuel bandeau « banque de
séquences ». Tokens et couleurs repris tels quels de `src/ui/xp/tokens.css` et
de `LiveView.svelte` : aucune nouvelle langue visuelle.

Le morceau montré est le même dans les trois :
`INTRO ×2 · COUPLET ×4 · REFRAIN ×4 · COUPLET ×4 · REFRAIN ×4 · PONT ×2 ·
REFRAIN ×8 · OUTRO ×2` — 30 cycles, 2 min à 120 BPM.

## Les trois

| | | Mesuré |
|---|---|---|
| **①** | **Cases à largeur égale** — le « séquenceur-ception » : une case = une section, comme un pas est un pas | 8 cases à **85 px** |
| **②** | **Cases proportionnelles à leur durée** — une vraie ligne de temps, on voit la forme du morceau d'un coup d'œil | INTRO/PONT/OUTRO à **46 px**, REFRAIN ×8 à **180 px** |
| **③** | **① + masque de lignes** — 8 points par case : les lignes qui jouent dans cette section | 8 cases à **85 px** |

## Ce que la maquette a tranché

**② est écartée par la mesure.** La lecture est plus belle — la forme du
morceau se lit sans lire un chiffre — mais les cases courtes tombent à 46 px
pour un seuil tactile de 44, et **une section d'UN cycle tomberait à 22 px**.
Une bande dont certaines cases ne sont pas frappables n'est pas une bande de
scène. La durée se dit dans le `×N` et dans le LCD, elle n'a pas besoin d'être
dessinée.

**③ est ① plus une information, pas une variante concurrente.** Les huit
points montrent qu'ici l'intro, le couplet et le refrain sont la **même
séquence** : seules les lignes allumées changent. Une entrée de banque au lieu
de trois. C'est le masque de lignes de l'audit, rendu visible.

⚠️ **Les points sont un TÉMOIN, pas une cible** — 3 px. On les lit, on ne les
tape pas ; le masque s'édite dans la bande de mutes (`05-audit-mode-live.md`,
§3), jamais ici.

## Ce que la maquette ne dit pas

- Elle est **statique** : le remplissage ambre de la case en cours et son filet
  de tête de lecture sont figés à 50 %.
- Elle n'a **pas tourné sur un vrai téléphone**, comme le reste du Mode Live.
- Les huit cases sont un cas favorable ; le plafond sans défilement reste
  **18 cases à 46 px** (mesuré dans l'audit).


---

## Les mutes DANS le séquenceur — 2026-09-02

> « je préférerais que les mutes soient gérés dans le séquenceur, quitte à
> changer un peu la disposition dans le mode live » — Yann.

`mutes-dans-le-sequenceur.html`, deux écrans.

### La contrainte, mesurée d'abord

Sous le bandeau et la bande d'architecture, il reste **252 px**. Huit lignes à
44 px en demanderaient **366**. **Aucune disposition ne rend les huit lignes
conformes au seuil tactile sur l'axe vertical** — l'écran ne fait que 390 px.
Ce n'est donc pas un choix de mise en page, c'est une borne.

D'où la règle qui donne de la hauteur : **on n'affiche que les lignes qui
SONNENT**. Muter une ligne vide ne veut rien dire. Le clap et le shaker sont
vides dans 21 presets sur 34 ; le cas courant est donc à six lignes.

| Lignes qui sonnent | Hauteur d'une ligne | Cible réelle |
|---|---|---|
| 5 | 47,6 px | ✅ conforme |
| **6 (cas courant)** | **40,8 px** | 290 × 41 |
| 7 | 33,4 px | 290 × 33 |
| **8 (pire cas)** | **30,1 px** | 290 × 30 |

### Ce que la disposition change

- le séquenceur prend **toute la colonne centrale** (252 px au lieu de 76) ;
- le visualiseur perd son cadre et passe **en fond du pad**, qui était une
  grande surface vide — il ne perd rien, il gagne de la place ;
- chaque ligne porte **son nom à gauche** (61 px) et **la ligne entière est le
  bouton de mute** ;
- ⚠️ **les trois boutons MUTE K/S/H quittent la colonne des six boutons** :
  trois emplacements assignables rendus, ce qui répond en passant à la
  première remarque (« des boutons redondants »).

### Comment se lit une ligne coupée

Par le **biseau**, pas par une icône : la ligne qui sonne est en **relief**,
la ligne coupée est **creusée**, son nom passe en ambre barré, ses cases
perdent leur couleur. C'est la grammaire de la peau, appliquée telle quelle.

⚠️ Et c'est ici que se répare le défaut relevé à l'audit
([`05-audit-mode-live.md`](../../docs/plan/05-audit-mode-live.md), §3.2) : le
séquenceur d'aujourd'hui ne lit jamais `row.muted`, donc une ligne coupée dans
l'Atelier s'affiche allumée. Avec cette disposition, l'état affiché est l'état
entendu.

### L'arbitrage qui reste

**30 px sur l'axe vertical au pire cas, contre 44 exigés.** La cible fait
290 px de large, ce qui compense en pratique ; l'alternative — paginer le
séquenceur en deux onglets batterie/synthé — rendrait les lignes conformes
(50 px) mais **cacherait la moitié de l'état pendant un set**. Je recommande
d'accepter les 30 px et de le dire, plutôt que de cacher.


---

## Cases carrées — 2026-09-02

> « on peut resserrer un peu le séquenceur pour que les cases soient de forme
> carrée » — Yann.

`sequenceur-cases-carrees.html`, quatre écrans (A, B, C, puis B au pire cas).

### Le principe : le DESSIN rétrécit, la CIBLE reste

C'est la règle `.tap44` de la maison, appliquée ici : la case devient un carré
**centré dans sa tranche de temps**, la LIGNE garde toute sa hauteur — c'est
elle le bouton de mute. On gagne la forme carrée sans rien perdre au doigt.

⚠️ **Effet de bord qui corrige une inexactitude.** Des cases collées en
`flex: 1` faisaient croire qu'une ligne à 4 pas (la nappe) est plus courte
qu'une ligne à 16 (le kick) — alors qu'elles couvrent la même mesure. Avec des
carrés POSITIONNÉS sur une piste de temps, tous les carrés font la même
taille et les lignes peu denses sont simplement plus espacées. Le temps se lit
enfin correctement, et un filet tous les quatre pas donne les temps.

### Les trois largeurs, mesurées

| | Colonnes (boutons / séq. / pad) | Case | Pad | Bouton |
|---|---|---|---|---|
| **A** | 260 / 300 / 260 *(inchangé)* | **11,4 px** | 260 | 127 |
| **B** ✅ | 200 / 400 / 220 | **17,7 px** | 220 | 97 |
| **C** | 150 / 500 / 170 | **23,9 px** | 170 | 72 |

La hauteur de ligne ne change pas d'une variante à l'autre (40,8 px à six
lignes, 30,1 à huit) : c'est la LARGEUR de colonne qui fait la taille du
carré, puisque c'est la ligne à 16 pas qui commande.

**Recommandation : B.** A donne des carrés de 11 px — on retombe sur des
confettis, la forme carrée ne se voit plus. C se lit magnifiquement mais paie
170 px de pad, et le pad est l'instrument : c'est la seule surface où l'on
JOUE, pas celle où l'on lit. B garde un pad de 220 px et des boutons de 97, et
la case passe de 11 à 18 px — le saut de lisibilité est là.

Au pire cas (huit lignes, `carre-B8`), le carré reste à 17,7 px : c'est la
largeur qui commande, donc ajouter des lignes ne rétrécit que la hauteur de
ligne, jamais la case.
