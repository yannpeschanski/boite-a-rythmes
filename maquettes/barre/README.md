# 20 habillages de la barre de menus — 2026-08-17

> « je ne souhaite pas remettre en cause l'organisation de fonctionnalités.
> je pense qu'il faut garder la barre fichier mais adapter son design à chaque
> fois. peux tu me montrer 20 propositions ? »

Planche : <https://claude.ai/code/artifact/a576f1e1-86e9-4e07-aa0d-9b722c58eb6a>

**L'organisation ne change pas** : mêmes cinq menus (Mode / Fichier / Édition /
Affichage / Aide), mêmes 49 entrées, mêmes outils (annuler, rétablir, drapeau
d'accès total). Seul l'habillage change.

`build.py` génère `index.html` — 20 cartes, chacune montrant la barre fermée
puis la même barre avec « Fichier » ouvert (39 des 49 entrées y vivent).
Ouvrir à 900px de large ; chaque scène fait 390px.

## Le chiffre à retenir

La barre réelle fait **64px**, pas 28 : à 390px, les cinq mots + le drapeau +
annuler/rétablir ne tiennent pas sur un rang. Chaque variante se replie donc
comme la vraie, et la hauteur obtenue est mesurée.

**Luna resserrée passe de 72 à 40px sans changer de langue visuelle** — en
collant les zones cliquables comme dans un vrai menu Windows au lieu d'espacer
des mots. 32px repris sur tous les écrans, quelle que soit la direction.

## Les vingt

**Nostalgies d'interface** — Luna (72) · Luna resserrée (40) · Aqua (74) ·
System 7 (53) · Workbench Amiga (56) · Motif (48) · Turbo (53)

**Nostalgies de matériel** — Amp (64) · Skin/Winamp (53) · Rhythm Composer
TR-808 (66) · Pocket (66) · Rack 19″ (65) · Afficheur LED (64) · Console (49)

**Ailleurs** — Bloc/OP-1 (83) · Cahier (73) · Cassette (62) · Étiqueteuse (65) ·
Tracker (61) · Plat (74, témoin sans style)

## Limite de rendu

La machine de rendu n'a ni Tahoma, ni Helvetica Neue, ni Georgia : les polices
retombent sur DejaVu/Liberation. Structures et couleurs justes, personnalité
typographique aplatie. Sur un vrai appareil, chaque variante sera plus marquée.
