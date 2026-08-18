# -*- coding: utf-8 -*-
"""Croisements des cinq finalistes.
Toutes gardent le seul point commun de la shortlist — la CHASSE FIXE — et
chacune est construite pour régler un défaut précis relevé au test sur écran
dense, pas pour mélanger des goûts."""

V = []

# --------------------------------------------------------------------- H1
# Défaut visé : le halo du Néon se répand partout et fait rayonner un bouton
# secondaire comme une action principale. Ici UNE SEULE chose a le droit de
# briller — le pas actif. Densité reprise de Winamp 2.x, fond plat de la
# skin de nuit, pas un seul biseau.
V.append(('h1', 'Skin dense', 'Winamp 2.x × Skin de nuit × Néon', """
.s-h1 {
  --bg:#08090b; --surf:#101318; --surf2:#161a21; --edge:#232830; --ink:#d6dae2; --muted:#6b7480;
  --radius:2px; --bevel:none; --pad: 8px 7px; --gap: 6px; --bar-pad: 6px 8px; --bar-gap: 11px;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.14em; --menu-tf: uppercase;
  --font-flag: 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --flag-ls:.14em;
  --font-btn: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.16em; --btn-tf: uppercase;
  --font-bpm: 700 21px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.16em; --tab-tf: uppercase;
  --font-title: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.26em; --tt-tf: uppercase;
  --font-ruler: 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.16em;
  --font-lcd: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-pill: 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-field: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-legend: 700 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-pad: 9px 12px; --btn-border:1px solid #2c323c; --btn-bg:#161a21; --btn-ink:#aeb6c2;
  --play-bg:#161a21; --play-ink:#3ff0ff;
  --tab-border:1px solid #232830; --tab-bg:#101318; --tab-ink:#6b7480; --tab-pad: 8px 3px;
  --tab-on-bg:#161a21; --tab-on-ink:#3ff0ff; --tab-on-edge:#3ff0ff;
  --win-border:1px solid #232830; --win-radius:2px;
  --tt-bg:#101318; --tt-ink:#8f98a6; --wb-bg:#161a21; --wb-ink:#6b7480; --wb-border:1px solid #232830;
  --work-bg:#0a0c10; --work-ink:#d6dae2; --work-top:1px solid #232830; --work-pad: 8px;
  --ruler-ink:#4d5866; --ruler-line:1px solid #1c212a;
  --cell-off:#0d1015; --cell-border:1px solid #1a1f27; --cell-h: 32px; --cell-gap:3px; --row-gap:5px;
  /* le seul halo de tout l'écran */
  --cell-on-shadow: 0 0 12px var(--h), 0 0 3px var(--h);
  --led-off:#232830; --lcd-bg:#0d1015; --lcd-ink:#3ff0ff; --lcd-dim:#2a5c66;
  --lcd-border:1px solid #1c2a30;
  --sel-bg:#0d1015; --sel-border:1px solid #2c323c; --sel-ink:#d6dae2; --sel-pad: 6px 8px;
  --pill-border:1px solid #2c323c; --pill-ink:#8f98a6; --pill-radius:2px; --pill-pad: 5px 8px;
  --fs-border:1px solid #232830; --legend-ink:#3ff0ff; --legend-ls:.16em;
  --chk-on-bg:#3ff0ff; --chk-on-ink:#08090b; --chk-on-edge:#3ff0ff;
  --slider-bg:#0d1015; --knob-bg:#3ff0ff; --knob-border:0;
  --c-kick:#ff3d5e; --c-snare:#ff9a2b; --c-hat:#3ff0ff; --c-clap:#4fff9a; --c-shaker:#7aa8ff;
  --c-bass:#6a6aff; --c-pad:#c04dff; --c-melody:#ff5ac8;
}
.s-h1 .bpm { color:#3ff0ff; }
.s-h1 .flag { color:#6b7480; }
"""))

# --------------------------------------------------------------------- H2
# Défaut visé : la palette DOS n'a aucun ton intermédiaire, donc chaque
# libellé secondaire devient un cas particulier. Ici on garde le bleu — la
# signature qu'aucun concurrent n'a — mais on lui construit une VRAIE échelle
# de gris-bleus, et on emprunte à la cassette la hiérarchie par filets.
V.append(('h2', 'Terminal bleu', 'Turbo × Winamp 2.x × Cassette', """
.s-h2 {
  --bg:#00006e; --surf:#c4c4d0; --surf2:#d8d8e2; --edge:#000; --ink:#0b0b1a; --muted:#4a4a66;
  --radius:0; --bevel: inset 1px 1px 0 #fff, inset -1px -1px 0 #6a6a86;
  --pad: 9px 8px; --gap: 7px; --bar-pad: 4px 8px; --bar-gap: 13px;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 11.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-flag: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 11.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-bpm: 700 17px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 11px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-title: 700 11px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.16em;
  --font-ruler: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.1em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-pill: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-field: 10.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-legend: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-pad: 9px 13px; --btn-shadow: 2px 2px 0 rgba(0,0,0,.55);
  --tab-shadow: 2px 2px 0 rgba(0,0,0,.5); --tab-on-bg:#0b0b1a; --tab-on-ink:#7dff7d;
  --win-shadow: 4px 4px 0 rgba(0,0,0,.5); --tt-bg:#0b0b1a; --tt-ink:#8fe8ff;
  --wb-bg:#c4c4d0; --wb-ink:#0b0b1a;
  /* l'échelle qui manquait : trois bleus, deux gris-bleus lisibles dessus */
  --work-bg:#151538; --work-ink:#e2e2f2; --work-top:1px solid #000;
  --label-ink:#9a9ac4; --legend-ink:#8fe8ff; --pill-ink:#b6b6dc;
  --ruler-ink:#8fe8ff; --ruler-line:1px solid #3a3a6e;
  --cell-off:#0d0d28; --cell-border:1px solid #2e2e5c; --cell-h: 34px;
  --led-off:#3a3a6e; --lcd-bg:#000; --lcd-ink:#7dff7d; --lcd-dim:#2a7a2a;
  --sel-bg:#c4c4d0; --sel-ink:#0b0b1a; --sel-border:1px solid #000; --sel-pad: 5px 8px;
  --pill-border:1px solid #4a4a86; --pill-radius:0; --pill-pad: 5px 8px;
  --fs-border:1px solid #4a4a86;
  --chk-on-bg:#0b0b1a; --chk-on-ink:#7dff7d; --chk-on-edge:#000;
  --slider-bg:#0d0d28; --slider-border:1px solid #000; --knob-bg:#c4c4d0; --knob-border:1px solid #000;
  --c-kick:#ff6b6b; --c-snare:#ffe066; --c-hat:#66e8ff; --c-clap:#7dff7d; --c-shaker:#8f9aff;
  --c-bass:#6b6bff; --c-pad:#e06bff; --c-melody:#ffffff;
}
.s-h2 .flag { background:#8fe8ff; color:#0b0b1a; padding:1px 6px; }
"""))

# --------------------------------------------------------------------- H3
# Défaut visé : la cassette est la plus haute des cinq (744px). Ici on lui
# applique la densité de Winamp 2.x — paddings serrés, capitales courtes — et
# on réserve le rouge à la seule chose active de l'écran.
V.append(('h3', 'Papier machine', 'Cassette × Winamp 2.x', """
.s-h3 {
  --bg:#e6e0d2; --surf:#f7f3ea; --surf2:#efe9dc; --edge:#23211c; --ink:#23211c; --muted:#7a736a;
  --radius:0; --bevel:none; --pad: 9px 8px; --gap: 7px; --bar-pad: 5px 9px; --bar-gap: 13px;
  --font: 'Courier New','DejaVu Sans Mono',monospace;
  --font-menu: 11.5px 'Courier New','DejaVu Sans Mono',monospace; --menu-ls:.04em;
  --font-flag: 9.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-btn: 700 11.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-bpm: 700 17px 'Courier New','DejaVu Sans Mono',monospace;
  --font-small: 8.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tab: 11px 'Courier New','DejaVu Sans Mono',monospace;
  --font-title: 700 11.5px 'Courier New','DejaVu Sans Mono',monospace; --tt-ls:.14em;
  --font-ruler: 9.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tag: 700 9.5px 'Courier New','DejaVu Sans Mono',monospace; --tag-ls:.1em;
  --font-lcd: 9.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tempo: 10.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-pill: 9px 'Courier New','DejaVu Sans Mono',monospace;
  --font-field: 10px 'Courier New','DejaVu Sans Mono',monospace;
  --font-legend: 700 9px 'Courier New','DejaVu Sans Mono',monospace;
  --btn-pad: 8px 12px; --btn-shadow: 2px 2px 0 rgba(35,33,28,.22);
  --tab-shadow:none; --tab-pad: 7px 3px; --tab-on-bg:#23211c; --tab-on-ink:#f7f3ea;
  --win-shadow: 3px 3px 0 rgba(35,33,28,.16);
  --tt-bg:#23211c; --tt-ink:#f7f3ea; --wb-bg:#f7f3ea; --wb-ink:#23211c;
  --work-bg:#fbf8f1; --work-ink:#23211c; --work-top:1px solid #23211c; --work-pad: 8px;
  --ruler-line:1px solid #c6bfae;
  --cell-off:#ece6d8; --cell-border:1px solid #b4ad9c; --cell-h: 32px; --cell-gap:3px; --row-gap:5px;
  --led-off:#c6bfae; --lcd-bg:#ece6d8; --lcd-ink:#7a736a; --lcd-dim:#a89f90;
  --lcd-border:1px solid #23211c;
  --sel-bg:#fff; --sel-border:1px solid #23211c; --sel-pad: 5px 8px;
  --pill-border:1px solid #b4ad9c; --pill-radius:0; --pill-ink:#5c564d; --pill-pad: 4px 8px;
  --fs-border:1px solid #b4ad9c; --legend-ink:#c94f2e; --legend-ls:.16em; --legend-tf: uppercase;
  --chk-on-bg:#c94f2e; --chk-on-ink:#fff; --chk-on-edge:#23211c;
  --slider-bg:#ece6d8; --knob-bg:#23211c; --knob-border:0;
  --c-kick:#c94f2e; --c-snare:#c99a2e; --c-hat:#2e8c88; --c-clap:#4a8c3e; --c-shaker:#3e6f9c;
  --c-bass:#3e5f9c; --c-pad:#7a4e8c; --c-melody:#a8465e;
}
/* Le filet rouge ne borde plus tous les blocs : il ne marque QUE l'actif. */
.s-h3 .tab.on { box-shadow: inset 3px 0 0 #c94f2e; }
.s-h3 .win { border-left: 3px solid #c94f2e; }
"""))

# --------------------------------------------------------------------- H4
# La question ouverte de la shortlist : la cassette y est-elle pour son PAPIER
# ou pour sa TYPOGRAPHIE ? H4 applique son système — filets, graisses, ombres
# dures, aucun halo — sur fond noir. Si elle plaît autant, c'était la typo.
V.append(('h4', 'Nuit imprimée', 'Cassette × Skin de nuit', """
.s-h4 {
  --bg:#0b0b0d; --surf:#131316; --surf2:#1a1a1e; --edge:#e8e6e0; --ink:#e8e6e0; --muted:#86847c;
  --radius:0; --bevel:none; --pad: 9px 8px; --gap: 7px; --bar-pad: 5px 9px; --bar-gap: 13px;
  --bar-border:1px solid #3a3a40;
  --font: 'Courier New','DejaVu Sans Mono',monospace;
  --font-menu: 11.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-flag: 9.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-btn: 700 11.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-bpm: 700 17px 'Courier New','DejaVu Sans Mono',monospace;
  --font-small: 8.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tab: 11px 'Courier New','DejaVu Sans Mono',monospace;
  --font-title: 700 11.5px 'Courier New','DejaVu Sans Mono',monospace; --tt-ls:.14em;
  --font-ruler: 9.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tag: 700 9.5px 'Courier New','DejaVu Sans Mono',monospace; --tag-ls:.1em;
  --font-lcd: 9.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tempo: 10.5px 'Courier New','DejaVu Sans Mono',monospace;
  --font-pill: 9px 'Courier New','DejaVu Sans Mono',monospace;
  --font-field: 10px 'Courier New','DejaVu Sans Mono',monospace;
  --font-legend: 700 9px 'Courier New','DejaVu Sans Mono',monospace;
  --btn-border:1px solid #4a4a52; --btn-bg:#1a1a1e; --btn-pad: 8px 12px;
  --btn-shadow: 2px 2px 0 rgba(0,0,0,.7);
  --tab-border:1px solid #3a3a40; --tab-bg:#131316; --tab-ink:#86847c; --tab-shadow:none;
  --tab-pad: 7px 3px; --tab-on-bg:#e8e6e0; --tab-on-ink:#0b0b0d; --tab-on-edge:#e8e6e0;
  --win-border:1px solid #3a3a40; --win-shadow: 3px 3px 0 rgba(0,0,0,.6);
  --tt-bg:#e8e6e0; --tt-ink:#0b0b0d; --wb-bg:#131316; --wb-ink:#e8e6e0; --wb-border:1px solid #4a4a52;
  --work-bg:#0d0d10; --work-ink:#e8e6e0; --work-top:1px solid #3a3a40; --work-pad: 8px;
  --ruler-line:1px solid #2a2a30;
  --cell-off:#141418; --cell-border:1px solid #33333a; --cell-h: 32px; --cell-gap:3px; --row-gap:5px;
  --led-off:#33333a; --lcd-bg:#141418; --lcd-ink:#86847c; --lcd-dim:#4d4c46;
  --lcd-border:1px solid #33333a;
  --sel-bg:#0b0b0d; --sel-border:1px solid #4a4a52; --sel-ink:#e8e6e0; --sel-pad: 5px 8px;
  --pill-border:1px solid #3a3a40; --pill-radius:0; --pill-ink:#9a988e; --pill-pad: 4px 8px;
  --fs-border:1px solid #33333a; --legend-ink:#e2603c; --legend-ls:.16em; --legend-tf: uppercase;
  --chk-on-bg:#e2603c; --chk-on-ink:#0b0b0d; --chk-on-edge:#4a4a52;
  --slider-bg:#141418; --knob-bg:#e8e6e0; --knob-border:0;
  --c-kick:#e2603c; --c-snare:#d8a83c; --c-hat:#3ca8a2; --c-clap:#5aa84e; --c-shaker:#4e88bc;
  --c-bass:#5878bc; --c-pad:#9a68ac; --c-melody:#c2586e;
}
.s-h4 .tab.on { box-shadow: inset 3px 0 0 #e2603c; }
.s-h4 .win { border-left: 3px solid #e2603c; }
"""))
