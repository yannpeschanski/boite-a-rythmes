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
