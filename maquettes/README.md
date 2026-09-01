# Maquettes de direction visuelle — 2026-08-17

Trois propositions pour l'audit design × DAW (voir
`docs/plan/03-journal-migration.md`, section « Audit design × DAW comparables »). **Jetables** : ce sont des fichiers HTML
statiques autonomes, aucun lien avec `src/`. Ils servent à trancher sur des
images plutôt que sur des descriptions.

Ouvrir tel quel dans un navigateur, à 390px de large.

Planche de comparaison des dix :
<https://claude.ai/code/artifact/e0aa9107-85d0-49f3-a157-6b70de8b3c42>

- `a.html` — **XP resserré.** Palette et reliefs strictement ceux de
  `tokens.css`. La `group-bar` de 28px disparaît, ses trois pastilles
  deviennent une étiquette sérigraphiée dans l'en-tête, les 34px gagnés vont
  aux cases.
- `b.html` — **Cadre XP, plan de travail instrument.** Le chrome est inchangé ;
  seul le corps de la fenêtre séquenceur bascule sur les tokens `--amp-*` lus
  dans `LiveView.svelte:1842-1852` — la langue du Mode Live, déjà en
  production.
- `c.html` — **Grille sombre.** Plus de Bliss, plus de Luna, plus de barre de
  titre : le consensus du secteur (Ableton Note, drumbit, BandLab).
- `d.html` — **Rhythm Composer.** Roland TR-808/909, que le moteur cite déjà :
  panneau crème, flancs bois, pas colorés par groupe de temps.
- `e.html` — **Pocket.** Pocket Operator / EP-133 : carte nue, un grand LCD
  monochrome porte tout, seize poussoirs numérotés.
- `f.html` — **Skin.** Winamp : le cousin *musical* de la nostalgie XP — même
  époque, vocabulaire d'appareil audio au lieu de bureau Windows.
- `g.html` — **Bloc.** Teenage Engineering OP-1 : fond blanc, aplats francs,
  chiffres comme identité graphique.
- `h.html` — **Cahier de rythme.** Aucune machine : papier réglé, encre, notes
  pleines ou en silence. Vise la moitié pédagogique du produit.
- `i.html` — **Aqua.** Le revival Y2K de 2026 : gel brillant, verre, chrome.
  Pousse l'époque au lieu de la retirer.
- `j.html` — **Tracker.** Polyend Tracker / Renoise : le temps descend au lieu
  d'aller à droite. La seule qui remette en cause le *format* et pas la peau.

Contenu tenu constant entre les trois (mêmes lignes, mêmes pas, même motif que
l'écran réel) : la seule variable est la langue visuelle.


---

## 2e série — architecture des commandes (`arch/`)

> « prends bien en compte comment rentrer toutes les fonctionnalités, notamment
> celles qu'on a mises dans la barre du haut. en ça, XP nous a aidé… »
> « Credo important : accueillant pour les non initiés, capacité pour aller loin »

Planche : <https://claude.ai/code/artifact/aca306d0-d787-47bc-9e2f-2ee7f0a83845>

**Toutes portent la même peau** (cadre XP + plan de travail instrument) pour que
la seule variable soit l'endroit où vivent les fonctions. Chaque fichier montre
**deux états côte à côte** : ce que voit quelqu'un qui découvre, ce qu'atteint
quelqu'un qui sait. Ouvrir à 846px de large.

`arch/common.css` porte la peau partagée, `arch/grid.js` la grille commune —
tout élément qui compte comme une commande porte la classe `.c`, ce qui rend les
chiffres d'accueil mesurables plutôt que déclaratifs.

| | Architecture | Accueil | Idée |
|---|---|---|---|
| K | Barre de menus assumée | 11 | tout est commande, donc tout va en menu |
| L | Interface qui pousse | 4 | l'UI grandit avec le Mode jeu, contrôle par contrôle |
| M | Établi et tiroir | 13 | grille permanente, tiroir bas à 3 crans |
| N | Inspecteur contextuel | 11 | un seul panneau : celui de l'objet visé |
| O | Simple / Studio | 5 | deux interfaces déclarées, un interrupteur |
| P | Palette de commandes | 12 | un champ atteint les 288 par leur nom |
| Q | Roue au pouce | 11 | appui long, six actions autour du doigt |
| R | Une chose à la fois | 3 | une ligne plein écran, on glisse |
| S | Boutons de mode | 7 | Motif/Son/Mix/Morceau, la barre de menus retournée |
| T | Le guide qui parle | 6 | l'accueil est un contenu, pas une réduction |

(Aujourd'hui : **63** commandes visibles au premier écran de l'onglet Rythme.)
