# 20 écrans d'Atelier complets — 2026-08-17

> « mais il faut me montrer pas seulement la barre fichier mais aussi l'atelier »

Planche : <https://claude.ai/code/artifact/181e852c-3818-4d8d-b474-20f1a41a714c>

Les vingt habillages de `maquettes/barre/`, appliqués cette fois à **l'écran
entier** : barre de menus, transport, onglets, fenêtre du séquenceur, tempo.
**L'organisation ne change pas** — c'est la 4e série et elle respecte
l'arbitrage de Yann.

## Fichiers

- `base.py` — la structure et le CSS de base, **sans une seule couleur** :
  tout passe par des tokens. C'est ce qui permet à 20 variantes de tenir en
  ~30 lignes chacune.
- `variants_a.py` / `variants_b.py` — les 20 jeux de tokens, plus quelques
  extras quand la langue a une particularité structurelle (les vis du rack, la
  trame de points de l'afficheur, le filet de la jaquette, la LED de la
  console, la coloration par groupe de temps de la 808).
- `build.py` — assemble `index.html`. Ouvrir à 900px de large.

## Ce qui est dans le cadre

Barre, transport, onglets, séquenceur (5 lignes), tempo. **Pas** le bandeau
d'astuce ni le panneau du bas (banque de séquences, analyseur) — 353px de plus
dans l'appli réelle. La comparaison honnête est donc la hauteur de la première
case jouable : **318px aujourd'hui**, 224 à 261px dans les vingt.

## Mesures

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

## Limite de rendu

Machine sans Tahoma, Helvetica Neue, Georgia ni Courier : les polices retombent
sur DejaVu/Liberation. Structures, couleurs et proportions justes ; personnalité
typographique aplatie.


---

## 5e série — 9 écrans sans aucune trace de XP (2026-08-17)

> « peux tu ajouter 3 propositions de chaque idée suivante : winamp totale
> (aucun XP) / analogique-mécanique / cyberpunk »

Planche : <https://claude.ai/code/artifact/5c400f39-5990-43bb-994e-c4bbc5069a19>
Fichier : `variants_c.py` (même système de tokens, `build.py` assemble les 29).

Ni fond Bliss, ni panneau Luna, ni bandeau de fenêtre bleu. L'organisation ne
bouge toujours pas.

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

**Le fil qui relie les trois pistes**, non cherché : elles cessent toutes de
faire porter l'état d'un pas par sa *couleur*. Palette mécanique = position,
phosphore = intensité, jack eurorack = lumière. C'est la réponse la plus solide
à la charge n°1 de l'audit, et elle vient de contraintes physiques.

**Retenues :** C3 HUD (une seule couleur d'état, équerres qui cadrent au lieu
d'entourer, vieillira le mieux) · A2 Mécanique (règle le contraste sans couleur
ni lumière, et promet un mouvement) · W1 Winamp 2.x (record de densité des 29,
mais cibles de 1998).

**Deux réserves :** C2 Phosphore perd les 8 couleurs de lignes, qui sont du
*contenu* ; A1 Bakélite est la seule des 29 qui engage du code d'animation —
une aiguille qui ne bouge pas n'est pas un vumètre.

**Pièges rencontrés :** `.s-c2 .screen` ne matche rien (l'écran EST `.screen.s-c2`,
pas un descendant) — les lignes de balayage n'apparaissaient jamais. Et
`border-radius: 50%` sur un élément flex étiré donne des ellipses, pas des
cercles : les jacks eurorack ont dû passer en taille fixe + `space-around`.
