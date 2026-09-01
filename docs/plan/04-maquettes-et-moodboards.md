# Maquettes — les sept séries de propositions

> Archive détachée de `PLAN.md` le 2026-09-01, **sans une ligne
> réécrite ni réordonnée**. Le journal vivant est resté dans `PLAN.md`.

Les sept séries d'habillages proposées entre le 17 et le 18 août, jusqu'aux deux
finalistes (Cassette et Winamp 2.x) et à la décision. Une série écartée et une
classée y sont conservées avec la raison du refus — c'est ce qui évite de les
reproposer.

---

### ⭐ Moodboard des deux finalistes — Cassette et Winamp 2.x (2026-08-18)

> « fais moi un moodboard détaillé des deux finalistes »
> « les deux finalistes, ce sont cassette et winamp 2.x sans croisement »

Moodboard : <https://claude.ai/code/artifact/51cc5fb9-e9b6-4b98-a343-0dbab615de12>
Sources `maquettes/atelier/build_moodboard.py` + `mood.tpl.html`.

⚠️ **Les 4 croisements de la 7e série sont écartés.** Yann a tranché : les deux
finalistes sont les **originales**, sans hybridation. H1-H4 restent consultables
mais ne sont plus dans la course.

**Le moodboard contient, pour chacune :** palette complète (fonds / encres /
traits / accent, chaque valeur avec son rôle), les 8 teintes de lignes, l'échelle
typographique en 10 rôles (taille, graisse, approche, casse), les états d'un pas,
une planche de composants (barre de titre, bouton, menu déroulant, champ, pastille,
cadre + légende, case à cocher, curseur, bandeau d'état, cases), les références
culturelles et les risques. **Les spécimens sont du CSS vivant**, rendus dans les
tokens réels lus dans `variants_b.py` / `variants_c.py` — pas des captures.

**Ce que le moodboard établit :** ces deux-là ne sont pas deux variantes d'une même
idée, ce sont **deux objets différents — un imprimé et un logiciel**. Cassette se
fabrique et se tient dans la main ; Winamp se télécharge et n'a jamais existé
qu'à l'écran. Elles partagent la chasse fixe et rien d'autre.

| | Cassette | Winamp 2.x |
|---|---|---|
| Fond | papier #f4f1e8 | verre noir #050806 sur bureau #000 |
| Relief | aucun — ombres portées dures | biseau d'1 px, partout |
| Échelle | 11-12 px | 8,5-9 px (rapport 1,3) |
| Accent | vermillon #c94f2e | vert LCD #2ee23c |
| Teintes de lignes | désaturées vers l'encre | saturées, couleurs d'écran |
| Contraste allumé/éteint | réglé à 80 % | réglé à 100 % |
| Écran Synthé | 744px | **657px** |

**Risques principaux.** *Cassette* : le Mode Live est un écran de scène et un plan
clair éblouit en pénombre ; c'est aussi la plus haute des cinq ; et son vermillon
est **aussi la teinte du kick** (risque de confusion « piste » / « actif »).
*Winamp* : cibles de 1998 (capitales 8,5px, reliefs d'1px) à agrandir sans
agrandir le dessin ; le biseau d'1px s'épaissit sur écran haute densité, à
vérifier tôt sur un vrai appareil ; et c'est une citation littérale qu'une partie
du public ne reconnaîtra pas.

**Coût en code — ce qui les distingue :**
1. **La police** : les deux exigent une chasse fixe auto-hébergée (fontsource) —
   Courier New n'existe pas partout et le rendu change du tout au tout selon la
   plateforme. **Seul poste qui alourdit le fichier livré**, identique pour les deux.
2. **Le thème sombre existe déjà** (`data-theme="noir"`, utilisé par le Mode jeu) :
   Winamp s'y branche presque directement, Cassette demande un 3e thème clair.
3. **Le relief** : Cassette *supprime* les 3 tokens de biseau au profit d'un filet
   (simplification) ; Winamp les garde mais en fait la grammaire unique, appliquée
   partout — un peu plus de travail, mieux balisé.
4. Le poste principal est le même dans les deux cas : les **225 couleurs en dur**
   dans 18 `.svelte` à passer en tokens.

### 7e série — 4 croisements des finalistes (2026-08-17) — ⛔ ÉCARTÉE

Planche : <https://claude.ai/code/artifact/98863af1-a8a5-4b0f-8836-4a1e4f1769e0>
Fichiers `maquettes/atelier/variants_d.py` + `build_hybrides.py` -> `hybrides.html`.

Yann n'ayant pas de préférence sur la suite, j'ai pris ma recommandation :
croiser les cinq. **Chaque hybride règle un défaut précis relevé au test sur
écran dense**, pas un mélange de goûts. Tous gardent la chasse fixe, seul point
commun avéré de la shortlist.

| | Croisement | Défaut visé | Synthé |
|---|---|---|---|
| **H1** Skin dense | Winamp 2.x × Skin de nuit × Néon | le halo du Néon partout → **une seule chose brille : le pas actif** | 687px |
| **H2** Terminal bleu | Turbo × Winamp 2.x × Cassette | les 16 couleurs DOS sans ton intermédiaire → **une vraie échelle de bleus**, le fond signature conservé | 709px |
| **H3** Papier machine | Cassette × Winamp 2.x | cassette la plus haute (744) → **684px**, et le filet rouge ne marque plus que l'actif | 684px |
| **H4** Nuit imprimée | Cassette × Skin de nuit | *pas un compromis, une question* | 684px |

**H4 est le vrai instrument de cette série.** H3 et H4 sont rigoureusement le
même dessin à la couleur de fond près. La cassette est dans la shortlist pour
son **papier** ou pour sa **typographie** ? Si H4 plaît autant que H3, c'était
la typo — et toute la branche claire peut être abandonnée. Si H4 plaît moins,
c'était bien le papier, et il faut garder une direction claire dans la course.

Repères : Winamp 2.x tenait le Synthé en **657px** (record), Cassette en **744**.
Les quatre croisements atterrissent entre 684 et 709.

**Prochaine étape utile**, une fois réduit à un ou deux : décliner le vainqueur
sur les écrans qui ne se ressemblent pas — splash, Mode jeu, et surtout **Mode
Live en paysage**. C'est là qu'une identité casse, pas sur l'Atelier.

### ⭐ Shortlist de Yann + test sur écran dense (2026-08-17)

> « pour le moment, voici celles que j'aime bien : winamp 2.x, skin de nuit,
> neon, turbo et cassette »

Planche : <https://claude.ai/code/artifact/47334e5f-201b-41b2-9c4b-21d34036ec7a>
Fichier `maquettes/atelier/build_synth.py` -> `finalistes.html` (5 directions ×
2 écrans).

**🔑 Ce que la sélection révèle — à retenir pour toute la suite du projet.**
Les 29 écrans se répartissent en deux moitiés selon la typographie des menus :
**12 en chasse fixe, 17 en proportionnelle**. Les cinq choix de Yann sont
**5/5 en chasse fixe, 0/17 en proportionnelle** (vérifié par comptage, pas à
l'œil). Et **aucune des cinq n'est une machine** : ni TR-808, ni rack, ni
eurorack, ni console, ni OP-1 — ce sont quatre *écrans* et un *imprimé*.

**La piste du projet est donc : écran + chasse fixe.** La couleur vient après.

⚠️ **Mes trois recommandations successives sont toutes éliminées** : Amp
(« la direction B complète »), Console (« la plus intéressante des vingt »),
HUD (« la plus solide des neuf »). Je jugeais sur la cohérence de l'état et la
justesse de la métaphore instrumentale — ce n'est pas le critère de Yann. Amp
avait pourtant ses menus en chasse fixe, mais son *cadre* restait Luna, ce qui
suffit à la sortir.

**Le test que les 29 premières maquettes ne faisaient pas.** Elles montraient
toutes l'onglet Rythme : cinq lignes, des cases, **aucun menu déroulant, aucune
case à cocher, aucun cadre de réglages**. L'écran Synthé a donc été construit
(`base.py` → `screen_synth()` + `SYNTH_CSS`) : 3 lignes avec sélecteur de voix,
4-5 pastilles chacune, cadre « Harmonie & remplissage » (2 menus, 2 curseurs
numérotés, bouton pleine largeur), cadre « Sidechain » avec cases à cocher.

| | Écran Synthé | Tenue sous charge |
|---|---|---|
| **Winamp 2.x** | **657px** | Tient très bien ; champs et boutons tombent dans la grammaire de skin. Défaut tactile (capitales 9px, cibles de 1998), réparable via Winamp 5. |
| **Skin de nuit** | 710px | Tient. Le halo se multiplie sur l'écran dense : il faudra décider *une seule* chose qui a le droit de briller. |
| **Néon** | 724px | Tient, mais le magenta est partout : le bouton « Remplissage aléatoire » rayonne comme une action principale alors qu'il n'en est pas une. Problème de hiérarchie. |
| **Turbo** | 740px | ⚠️ **A cassé** — libellés secondaires en gris foncé sur le bleu, illisibles. La palette DOS a 16 couleurs et **aucun ton intermédiaire**. Réparé (gris clair sur bleu, champs gris moyen) mais chaque nouvel élément demandera une assignation explicite. |
| **Cassette** | 744px | **C'est elle que l'écran dense avantage** : pas de halo, et menus/cases/cadres se lisent nativement — ce sont des objets imprimés. Mais la plus haute, et elle perd le contraste allumé/éteint gratuit du fond noir. |

**Bug corrigé au passage :** `--c-bass/--c-pad/--c-melody` n'étaient définis
nulle part — les lignes synthé sortaient invisibles. Défauts ajoutés dans
`base.py` pour que ça ne puisse plus passer inaperçu, plus des teintes propres
par variante.

**Reste à trancher avant de coder :** une seule direction, ou un croisement ?
Les cinq partagent déjà la chasse fixe ; ce qui les sépare est la couleur de
fond et le traitement des bords. Un croisement est réaliste (densité de Winamp
2.x + noir de Skin de nuit + hiérarchie de couleur de Cassette) mais c'est un
choix, pas une évidence.

### 5e série — 9 écrans sans aucune trace de XP (2026-08-17)

> « peux tu ajouter 3 propositions de chaque idée suivante : winamp totale
> (aucun XP) / analogique-mécanique / cyberpunk »

Planche : <https://claude.ai/code/artifact/5c400f39-5990-43bb-994e-c4bbc5069a19>
Fichier `maquettes/atelier/variants_c.py` — même système de tokens, `build.py`
assemble maintenant **29 écrans**.

| | Écran | Référence | Barre | 1re case |
|---|---|---|---|---|
| W1 | Winamp 2.x | la skin d'origine, poignée à points | 53 | **204** |
| W2 | Skin de nuit | custom de skins.winamp.com | 59 | 225 |
| W3 | Winamp 5 | « modern skin », brossée et ronde | 64 | 243 |
| A1 | Bakélite | magnétophone à lampes, vumètre à aiguille | 68 | 258 |
| A2 | Mécanique | palettes de tableau d'affichage | 58 | 233 |
| A3 | Eurorack | modulaire, jacks ronds, sérigraphie | 64 | 232 |
| C1 | Néon | ruelle de Kowloon, magenta/cyan | 63 | 238 |
| C2 | Phosphore | terminal cathodique vert | 65 | 239 |
| C3 | HUD | surcouche tactique cyan + ambre | 63 | 235 |

**Le fil qui relie les trois pistes, non cherché :** elles cessent toutes de
faire porter l'état d'un pas par sa *couleur*. La palette mécanique le fait par
la **position**, le phosphore par l'**intensité**, le jack eurorack par la
**lumière**. C'est la réponse la plus solide à la charge n°1 de l'audit (le
contraste à l'envers) — et elle vient de contraintes physiques, pas d'un choix
graphique. À rapprocher de System 7, qui faisait la même chose par la trame.

**Retenues :**
1. **C3 · HUD** — une seule couleur d'état (l'ambre), un seul niveau de halo,
   des équerres qui cadrent la zone de travail au lieu de l'entourer d'un cadre.
   Le cyberpunk le plus lisible à 390px et celui qui vieillira le mieux.
2. **A2 · Mécanique** — la plus originale : règle le contraste sans couleur ni
   lumière, et promet un mouvement (le retournement de la palette au pas
   suivant) qu'aucune autre n'a.
3. **W1 · Winamp 2.x** — record de densité des 29 (1re case à **204px** contre
   318 aujourd'hui). Prix : des cibles de 1998, il faudrait W3 pour le tactile.

⚠️ **Deux réserves :** C2 Phosphore perd les 8 couleurs de lignes, qui sont du
*contenu* et pas de l'habillage. A1 Bakélite est la seule des 29 qui engage du
**code d'animation** — une aiguille de vumètre qui ne bouge pas n'est pas un
vumètre, c'est un dessin de vumètre.

**Deux pièges CSS à retenir** (les deux ont produit un rendu faux avant
correction) : `.s-c2 .screen` ne matche rien, l'écran **est** `.screen.s-c2` et
pas un descendant — les lignes de balayage n'apparaissaient jamais. Et
`border-radius: 50%` sur un élément flex étiré donne une **ellipse**, pas un
cercle : les jacks eurorack ont dû passer en taille fixe + `space-around`.

### 4e série — 20 écrans d'Atelier complets (2026-08-17)

> « mais il faut me montrer pas seulement la barre fichier mais aussi l'atelier »

Planche : <https://claude.ai/code/artifact/181e852c-3818-4d8d-b474-20f1a41a714c>
Fichiers `maquettes/atelier/` (`base.py` + `variants_a/b.py` -> `build.py`).

Les vingt habillages de la 3e série, appliqués à **l'écran entier** : barre,
transport, onglets, fenêtre du séquenceur, tempo. Organisation inchangée.

**Architecture des maquettes à réutiliser :** `base.py` porte la structure et
un CSS **sans une seule couleur** — tout passe par des tokens. Chaque variante
tient alors en ~30 lignes, plus quelques extras quand sa langue a une
particularité structurelle (vis du rack, trame de points de l'afficheur, filet
de la jaquette, LED de la console, coloration par groupe de temps de la 808).
C'est ce qui a rendu 20 écrans complets réalisables.

**Périmètre du cadre :** barre + transport + onglets + séquenceur + tempo. **Pas**
le bandeau d'astuce ni le panneau du bas (banque, analyseur), soit 353px de plus
en réel. La comparaison honnête est donc la hauteur de la 1re case jouable :
**318px aujourd'hui**, 224 à 261 dans les vingt — dont une part vient du bandeau
d'astuce absent, pas seulement de la barre.

| Écran | Barre | 1re case | | Écran | Barre | 1re case |
|---|---|---|---|---|---|---|
| Luna (actuelle) | 70 | 255 | | Rhythm Composer | 66 | 244 |
| **Luna resserrée** | **41** | **225** | | Pocket | 67 | 242 |
| Aqua | 67 | 248 | | Rack 19″ | 71 | 247 |
| System 7 | 57 | 237 | | Afficheur | 68 | 244 |
| Workbench | 58 | 237 | | **Console** | **50** | **226** |
| Motif | 56 | 228 | | Bloc | 80 | 261 |
| Turbo | 61 | 237 | | Cahier | 71 | 249 |
| Amp | 65 | 247 | | Cassette | 66 | 245 |
| **Skin** | 56 | **224** | | Étiqueteuse | 65 | 239 |
| | | | | Tracker | 63 | 241 |
| | | | | Plat (témoin) | 73 | 258 |

**Ce que l'écran entier apprend, et que la barre seule ne disait pas :**

1. **Amp est enfin cohérente.** La 3e série laissait une barre Luna sur un plan
   de travail sombre ; ici barre et corps parlent la même langue, et la fenêtre
   cesse d'avoir une tête et un corps dissociés. C'est ça, la direction B
   complète.
2. **Console devient la plus intéressante des vingt.** La LED au-dessus du menu
   ouvert *et* l'onglet actif au même vert font que tout l'écran signale l'état
   de la même façon. 50px de barre. À instruire en premier si on quitte Luna
   sans vouloir de pastiche.
3. **Rhythm Composer est réparée.** Le problème de lisibilité de la 1re série
   (couleur prise par le repère de temps) est réglé en colorant les pas **par
   groupe de temps** et en faisant porter l'état par la matière (mat/creux vs
   plein/brillant). C'est devenu une vraie candidate.
4. **System 7 démontre qu'on peut se passer de couleur** : chaque ligne est
   distinguée par sa **trame** (plein / hachures / rayures) et le motif reste
   lisible. Utile à garder en tête pour l'accessibilité.

⚠️ **Deux chantiers que l'habillage ne touche pas**, quelle que soit la
direction : le menu Fichier mélange toujours 4 commandes et 34 morceaux, et
l'anatomie de la ligne (99px dont 34 de musique) n'est traitée dans aucune de
ces maquettes, qui affichent une ligne simplifiée. Ce sont les deux vrais
chantiers mesurés de l'audit.

### 3e série — 20 habillages de la barre de menus (2026-08-17)

> « je ne souhaite pas remettre en cause l'organisation de fonctionnalités. je
> pense qu'il faut garder la barre fichier mais adapter son design à chaque
> fois. peux tu me montrer 20 propositions ? »

Planche : <https://claude.ai/code/artifact/a576f1e1-86e9-4e07-aa0d-9b722c58eb6a>
Fichiers `maquettes/barre/` (`build.py` génère `index.html`).

**Arbitrage acté : l'organisation des fonctionnalités ne bouge pas.** La 2e
série (architecture des commandes) est donc classée — elle reste consultable,
mais aucune de ses dix propositions n'est à instruire. La barre de menus est
conservée telle quelle ; c'est son habillage qui s'adapte à chaque direction
visuelle.

⚠️ **Chiffre corrigé (2e fois sur cet audit).** J'ai écrit deux fois que la
barre range 49 entrées dans **28px**. C'est la hauteur d'*un* rang de menus. La
barre complète fait **64px** : à 390px, les cinq mots + le drapeau « accès
total » + annuler/rétablir ne tiennent pas sur une ligne et se replient sur deux
rangs. Chaque variante de cette série se replie comme la vraie, et sa hauteur
est mesurée dans le DOM.

**Résultat le plus actionnable, indépendant de toute direction :**
**« Luna resserrée » passe de 72 à 40px sans changer de langue visuelle** — en
rendant les zones cliquables jointives comme dans un vrai menu Windows au lieu
d'espacer des mots. ~24px repris sur la barre réelle, sur tous les écrans.

| Famille | Variantes (hauteur en px) |
|---|---|
| Nostalgies d'interface | Luna 72 · **Luna resserrée 40** · Aqua 74 · System 7 53 · Workbench 56 · Motif 48 · Turbo 53 |
| Nostalgies de matériel | Amp 64 · Skin 53 · Rhythm Composer 66 · Pocket 66 · Rack 19″ 65 · Afficheur 64 · **Console 49** |
| Ailleurs | Bloc 83 · Cahier 73 · Cassette 62 · Étiqueteuse 65 · Tracker 61 · Plat 74 |

**À retenir :**

1. **Luna resserrée** — à faire quoi qu'il arrive, aucun débat à ouvrir.
2. **Amp** — la barre qui va avec la direction B ; si le plan de travail devient
   un instrument, la barre doit suivre sous peine d'une fenêtre à tête et corps
   dissociés.
3. **Console** — trouvaille de la série : une LED au-dessus du menu ouvert
   remplace le fond bleu de sélection. Plus juste pour un produit musical, tient
   en 49px, et donne à la barre un rôle d'afficheur.
4. **Skin** et **Workbench** — gardent le rétro sans garder Windows ; Workbench
   a l'argument que les autres n'ont pas (la machine où la musique à motifs est
   née).

⚠️ **Défaut partagé par les vingt, qu'aucun habillage ne répare** : le menu
Fichier mélange 4 commandes et 34 morceaux. Sur chacune des vingt images, la
moitié basse du déroulant est un catalogue coincé dans une liste de commandes.
Le problème est dans le contenu, pas dans le style — c'est le seul point de la
2e série qui survit à l'arbitrage.

**Limite de rendu à connaître :** la machine n'a ni Tahoma, ni Helvetica Neue,
ni Georgia ; les polices retombent sur DejaVu/Liberation. Structures et couleurs
justes, personnalité typographique aplatie sur les captures.

### 2e série — architecture des commandes (2026-08-17) — ⛔ CLASSÉE le 2026-08-17

> « prends bien en compte comment rentrer toutes les fonctionnalités, notamment
> celles qu'on a mises dans la barre du haut. en ça, XP nous a aidé… »
> « Credo important : accueillant pour les non initiés, capacité pour aller loin »

Planche : <https://claude.ai/code/artifact/aca306d0-d787-47bc-9e2f-2ee7f0a83845>
Fichiers `maquettes/arch/k.html` … `t.html`.

⚠️ **Reproche fondé sur la 1re série.** Les dix premières maquettes montraient
le séquenceur et escamotaient la barre de menus — c'est-à-dire précisément
l'endroit où XP fait le travail. Cette série ne porte que là-dessus, et toutes
les maquettes gardent la même peau pour que la seule variable soit
l'architecture.

**La taille réelle du problème (mesurée) :**

| | |
|---|---|
| Barre de menus | **49 entrées** (34 morceaux, 14 commandes, 1 option) en **28px** |
| Onglet Rythme, replié | **63 commandes** visibles |
| Onglet Rythme, tout déplié | **288 commandes** sur **3 388px** (4 écrans) |

**Les trois propriétés de la barre de menus à ne pas perdre :** son coût en
pixels ne dépend pas du nombre d'entrées ; le rangement est stable et nommé
donc mémorisable ; on peut l'ouvrir pour regarder sans rien déclencher — c'est
ce qui la rend explorable par quelqu'un qui ne sait pas encore. **Cette
troisième propriété est la plus facile à perdre** : P (recherche) et Q (roue au
pouce) sont excellents pour qui sait déjà et ne montrent rien à qui découvre.

| | Architecture | Accueil | Profondeur | Découverte | Tactile |
|---|---|---|---|---|---|
| — | *aujourd'hui* | *63* | 4 écrans | bonne | moyen |
| K | Menus assumés | 11 | illimitée | bonne | **faible** |
| L | Interface qui pousse | **4** | totale | **excellente** | bon |
| M | Établi et tiroir | 13 | bonne | bonne | excellent |
| N | Inspecteur | 11 | constante | bonne | bon |
| O | Simple / Studio | 5 | totale | **faible** | moyen |
| P | Palette | 12 | maximale | **nulle** | moyen |
| Q | Roue au pouce | 11 | 6 par objet | **nulle** | excellent |
| R | Une chose à la fois | **3** | correcte | excellente | excellent |
| S | Boutons de mode | 7 | bonne | excellente | excellent |
| T | Le guide qui parle | 6 | entière | excellente | bon |

**Résultat de la série : aucune ne tient les deux moitiés du credo seule.**
Celles qui accueillent le mieux (R, L, T) coûtent cher ou imposent un parcours ;
celles qui vont loin pour rien (P, Q) ne montrent rien. Le credo demande des
**couches**, pas un choix.

**Empilement recommandé, dans cet ordre :**

1. **S · Boutons de mode** comme squelette — c'est la barre de menus retournée :
   mêmes trois propriétés, mais tactiles. Quatre mots permanents en bas
   remplacent cinq mots en haut faits pour une souris.
2. **N · Inspecteur** dans le mode « Son » — absorbe les 288 réglages de ligne
   sans jamais faire grandir l'écran.
3. **L · Interface qui pousse** comme calendrier d'ouverture — les contrôles
   arrivent un par un, chacun avec l'exercice qui l'explique. Le Mode jeu
   finance déjà cette moitié du credo.
4. **P · Palette** en filet de sécurité — une pastille, coût quasi nul, seule
   réponse au « j'ai oublié où est ce réglage ».

⚠️ **Et une chose à sortir des menus quelle que soit la décision : les 34
morceaux.** Ils occupent 34 des 49 entrées. Ce n'est pas une liste de commandes
mais un catalogue à parcourir (noms, familles, envie d'écouter avant de choisir)
— un menu déroulant est le pire endroit pour ça, sur n'importe laquelle des dix
architectures.

**R est écartée malgré son meilleur score d'accueil** : elle perd la vue
d'ensemble, or un rythme s'entend *par* la superposition des lignes. Voir le
kick sans la snare, c'est ne pas voir le rythme.

### 1re série — dix peaux (2026-08-17, « je souhaite que tu fasses 10 propositions »)

Planche complète : <https://claude.ai/code/artifact/e0aa9107-85d0-49f3-a157-6b70de8b3c42>
Fichiers `maquettes/a.html` … `j.html`.

Les sept ajoutées après les trois premières, chacune ancrée sur une famille
réelle plutôt qu'une déclinaison de sombre :

| | Direction | Référence | Résout | Coût |
|---|---|---|---|---|
| D | Rhythm Composer | Roland TR-808/909 | 2·3·4 | élevé |
| E | Pocket | Pocket Operator, EP-133 | 1·2·3·4 | très élevé |
| F | Skin | Winamp | 1·2·3·4 | **moyen** |
| G | Bloc | Teenage Engineering OP-1 | 1·2·4 | élevé |
| H | Cahier de rythme | papier réglé, portée | 1·2·3·4 | élevé |
| I | Aqua | revival Y2K 2026 | 1·4 | moyen |
| J | Tracker | Polyend Tracker, Renoise | 1·2·3·4 + le format | très élevé |

(Charges de l'audit : 1 contraste allumé/éteint · 2 barre de titre inerte ·
3 nostalgie du contenant · 4 identité pas appliquée.)

**Trois enseignements que les images ajoutent :**

1. **F · Skin est la découverte de la série.** C'est le cousin *musical* de la
   nostalgie XP — même époque, même bureau, mais vocabulaire d'appareil audio.
   Elle garde l'atout de XP (rétro reconnaissable en une seconde) et remplace
   son argument faible (le bureau Windows). Le Mode Live prouve qu'elle tient
   déjà. F est B poussé d'un cran ; le choix entre les deux revient à décider
   si le cadre Luna doit survivre.
2. **D bute sur un problème réel, visible sur l'image.** La couleur y est déjà
   prise pour marquer le temps (les quatre groupes de la 808), donc l'état
   allumé/éteint doit passer par la matière. Sur la vraie machine c'est une LED
   qui tranche ; à l'écran il faut inventer cet équivalent. Première version
   illisible, corrigée en creux mat contre plein brillant — ça reste le point
   dur de cette direction.
3. **J · Tracker est la seule à remettre en cause le FORMAT et pas la peau.**
   Le temps descend au lieu d'aller à droite : un écran haut et étroit devient
   le bon format, et le téléphone cesse d'être une contrainte. Même non
   retenue, l'idée mérite d'être gardée — c'est la seule réponse structurelle à
   l'arbitrage D4 (test mobile uniquement).

### Les trois premières maquettes

Fichiers : `maquettes/a.html`, `b.html`, `c.html` — **jetables, hors de
`src/`**, rien n'est branché sur le vrai code. Même écran (onglet Rythme),
contenu tenu constant : mêmes 5 lignes, mêmes nombres de pas, même motif
(kick 1&3, snare 2&4, hat plein, clap et shaker vides). Seule la langue
visuelle change.

| | Page | Part des cases |
|---|---|---|
| Aujourd'hui | 1 253px (1,5 écran) | 14 % |
| A · XP resserré | **844px** (1 écran) | 26 % |
| B · Cadre XP + instrument | **844px** | 24 % |
| C · Rupture | **844px** | 25 % |

⚠️ **Le gain d'écran est commun aux trois et ne vient d'aucune des trois
identités** — il vient du traitement de la ligne, identique partout. C'est la
démonstration visuelle du résultat de mesure : la question du look et la
question de la place sont deux sujets distincts.

Ce que les images apprennent en plus :

- **A** — l'écran respire, mais la charge n°1 est intacte : sur fond beige, une
  case vide reste un rectangle pâle en relief, indiscernable d'un contrôle
  désactivé. A règle un problème de place, pas un problème de lecture.
- **B** — cadre strictement identique à aujourd'hui (Bliss, panneaux Luna,
  barre de titre, onglets) ; seul le corps de la fenêtre bascule sur les
  tokens `--amp-*` de `LiveView.svelte:1842-1852`. Pas éteint = creux noir, pas
  actif = émission dans la couleur de la ligne, bandeau LCD vert à la place des
  trois pastilles. Le clap et le shaker vides se lisent enfin « rien ici » et
  non « interdit ».
- **C** — propre, compétent, et **anonyme**. Retire le titre en haut à gauche
  et c'est n'importe laquelle des sept boîtes à rythmes en ligne gratuites de
  la revue. Le coût de C ne se voit pas dans ce qu'elle ajoute, il se voit dans
  ce qu'elle efface.

### Trois directions

- **A — Garder XP, resserrer.** On n'attaque que les 34 %. Plus gros gain
  d'écran mesurable, aucun risque d'identité, mais ne répond pas à la question
  posée.
- **B — Deux couches : cadre XP, plan de travail instrument. ★ recommandée.**
  XP reste le cadre (splash, menus, fenêtres, dialogues, Mode jeu) ;
  l'intérieur du séquenceur devient un panneau sombre à la Mode Live. Répond
  aux charges 1, 3 et 4, rend la nostalgie plus juste (matériel là où l'on
  joue, système là où l'on range), et **coûte peu parce que le vocabulaire
  existe déjà en prod**.
- **C — Sortir de XP.** Cohérence immédiate, mais 225 couleurs, tout
  `src/ui/xp/`, le splash, le Mode jeu, les sons système — et on dépense
  l'unique trait distinctif du projet pour ressembler à sept concurrents
  gratuits.

**Recommandation : B, avec une condition d'ordre.** La première pierre n'est
pas le thème, c'est les 34 %. Repeindre en sombre sans traiter les pastilles
donnerait une version sombre du même écran encombré. Ordre proposé :
(1) pastilles → étiquettes sérigraphiées, panneaux → surcouches ;
(2) corps du séquenceur sur la palette Live, cases éteintes creusées, cases
actives émettrices ; (3) barre de titre réduite à un chevron de repli, le gag
`×` retiré ; (4) `CLAUDE.md` réécrit sur la règle réelle — *XP est le cadre,
l'instrument est sombre*.

**Rien n'est engagé tant que Yann n'a pas tranché entre A, B et C.**
