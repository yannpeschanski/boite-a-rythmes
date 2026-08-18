# -*- coding: utf-8 -*-
"""Variantes 11 à 20."""

V = []

V.append(('pocket', 'Pocket', 'Pocket Operator / EP-133', """
.s-pocket {
  --bg:#121316; --surf:#1c1e22; --surf2:#1c1e22; --edge:#4a4e54; --ink:#f2f3f0; --muted:#7e8288;
  --radius:2px; --bevel:none; --bar-pad: 8px 4px; --bar-gap: 16px; --bar-border:0;
  --bar-shadow: 0 1px 0 #34383a; --bar-bg: transparent;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 10px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.16em; --menu-tf: uppercase;
  --font-flag: 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --flag-ls:.2em;
  --font-btn: 10px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.14em; --btn-tf: uppercase;
  --font-bpm: 700 20px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 10px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.14em; --tab-tf: uppercase;
  --font-title: 9px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.2em; --tt-tf: uppercase;
  --font-ruler: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 9px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.16em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --pan-bg: transparent; --pan-border: 0; --pan-pad: 4px 0;
  --btn-pad: 12px 0; --tab-pad: 11px 0;
  --tab-on-bg:#f2f3f0; --tab-on-ink:#121316; --tab-on-edge:#f2f3f0;
  --win-border:0; --win-radius:2px;
  --tt-bg: transparent; --tt-ink:#7e8288;
  --wb-bg:#1c1e22; --wb-ink:#7e8288;
  /* L'écran LCD porte le motif : la fenêtre EST l'afficheur. */
  --work-bg:#b9c4a4; --work-ink:#16180f; --work-pad: 12px;
  --ruler-ink:#8f9a7c; --ruler-line:1px solid rgba(22,24,15,.35);
  --cell-off: transparent; --cell-border:1px solid #16180f; --cell-radius:1px;
  --cell-h: 22px; --row-gap: 5px; --led-off: rgba(22,24,15,.25);
  --lcd-bg: transparent; --lcd-ink:#16180f; --lcd-dim:#6d7a5a;
  --lcd-border:1px solid rgba(22,24,15,.35);
  --slider-bg:#1c1e22; --knob-bg:#f2f3f0;
  --c-kick:#16180f; --c-snare:#16180f; --c-hat:#16180f; --c-clap:#16180f; --c-shaker:#16180f;
}
.s-pocket .btn { flex: 1; text-align: center; }
.s-pocket .work { box-shadow: inset 0 0 0 2px #2a2d24, 0 0 0 3px #34383a; }
.s-pocket .tag { color:#16180f; }
.s-pocket .bpm { color:#f2f3f0; }
"""))

V.append(('rack', 'Rack 19″', 'plaque brossée, vis, gravure', """
.s-rack {
  --bg:#17191c;
  --surf: repeating-linear-gradient(90deg, rgba(255,255,255,.045) 0 1px, transparent 1px 3px),
          linear-gradient(180deg,#5a5f66,#3b4046 40%,#2c3036);
  --surf2: linear-gradient(180deg,#767c85,#33373d); --edge:#14161a; --ink:#d6dae0; --muted:#8d949c;
  --radius:2px; --bevel: inset 0 1px 0 #767c85, 0 1px 2px rgba(0,0,0,.5);
  --bar-pad: 10px 26px; --bar-gap: 14px;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.2em; --menu-tf: uppercase;
  --font-flag: 8px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.18em;
  --font-btn: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.16em; --btn-tf: uppercase;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.16em; --tab-tf: uppercase;
  --font-title: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.2em; --tt-tf: uppercase;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.16em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --tab-on-bg: linear-gradient(180deg,#ffc95a,#ffb020); --tab-on-ink:#1a1c20; --tab-on-edge:#8a6010;
  --tt-bg: linear-gradient(180deg,#4a4f57,#33373d); --tt-ink:#d6dae0;
  --work-bg: linear-gradient(180deg,#33373d,#22252a); --work-top:1px solid #5a5f66;
  --work-ink:#d6dae0; --ruler-ink:#ffb020; --ruler-line:1px solid #4a4f57;
  --cell-off:#15171a; --cell-off-shadow: inset 0 2px 4px rgba(0,0,0,.85);
  --cell-on-shadow: 0 0 8px var(--h); --led-off:#3a3e45;
  --lcd-bg:#0e1013; --lcd-ink:#ffb020; --lcd-dim:#7a5410;
  --c-kick:#d84315; --c-snare:#c8881a; --c-hat:#2b8a8a; --c-clap:#3fae54; --c-shaker:#22a6c9;
}
/* Les deux vis de la plaque : elles ne servent à rien, et c'est exactement ce
   qui fait qu'on lit « appareil » plutôt que « logiciel ». */
.s-rack .bar { position: relative; }
.s-rack .bar::before, .s-rack .bar::after { content:''; position:absolute; top:50%;
  width:11px; height:11px; margin-top:-5.5px; border-radius:50%;
  background: radial-gradient(circle at 35% 30%, #9aa0a8, #33373d 70%);
  box-shadow: inset 0 -1px 1px rgba(0,0,0,.6); }
.s-rack .bar::before { left:7px; } .s-rack .bar::after { right:7px; }
"""))

V.append(('led', 'Afficheur', 'matrice à points de façade', """
.s-led {
  --bg:#0c0d10; --surf:#121418; --surf2:#16181d; --edge:#23262c; --ink:#ff6a1f; --muted:#7a4418;
  --radius:3px; --bevel:none; --bar-pad: 9px 10px; --bar-gap: 13px;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.14em; --menu-tf: uppercase;
  --font-flag: 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --flag-ls:.16em;
  --font-btn: 700 11px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.14em; --btn-tf: uppercase;
  --font-bpm: 700 18px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 10px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.14em; --tab-tf: uppercase;
  --font-title: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.18em; --tt-tf: uppercase;
  --font-ruler: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.14em;
  --font-lcd: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-ink:#ff6a1f; --tab-ink:#c9560f;
  --tab-on-bg:#16181d; --tab-on-ink:#ffd23f; --tab-on-edge:#4a3418;
  --tt-bg:#16181d; --tt-ink:#ffd23f; --wb-bg:#16181d; --wb-ink:#ff6a1f;
  --work-bg:#0f1114; --work-top:1px solid #23262c; --work-ink:#ff6a1f;
  --ruler-ink:#7a4418; --ruler-line:1px solid #23262c;
  --cell-off:#15171b; --cell-off-shadow: inset 0 0 0 1px #1e2127;
  --cell-on-shadow: 0 0 12px var(--h); --led-off:#2c1a0c;
  --lcd-bg:#0a0b0e; --lcd-ink:#ff6a1f; --lcd-dim:#5f3410;
  --c-kick:#ff4a1f; --c-snare:#ffb020; --c-hat:#ffd23f; --c-clap:#ff8a2f; --c-shaker:#ff6a1f;
}
/* La trame de points : tout ce qui est « allumé » est affiché, pas imprimé. */
.s-led .bar, .s-led .tt, .s-led .cells i.on { position: relative; }
.s-led .bar::after, .s-led .tt::after, .s-led .cells i.on::after {
  content:''; position:absolute; inset:0; pointer-events:none;
  background-image: radial-gradient(rgba(0,0,0,.5) 45%, transparent 46%);
  background-size: 3px 3px; }
.s-led .bar .m, .s-led .tt { text-shadow: 0 0 7px rgba(255,106,31,.7); }
"""))

V.append(('console', 'Console', 'sérigraphie sur table de mixage', """
.s-console {
  --bg:#1a1d21; --surf: linear-gradient(180deg,#31353b,#22252a);
  --surf2: linear-gradient(180deg,#4a4f57,#2a2e34); --edge:#0e1013; --ink:#b9bfc7; --muted:#6f767f;
  --radius:2px; --bevel: inset 0 1px 0 #4a4f57;
  --bar-pad: 8px 10px; --bar-gap: 0; --bar-border:0;
  --bar-shadow: inset 0 1px 0 #4a4f57, 0 2px 0 #0e1013;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.2em; --menu-tf: uppercase;
  --font-flag: 8px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.18em;
  --font-btn: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.16em; --btn-tf: uppercase;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.16em; --tab-tf: uppercase;
  --font-title: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.2em; --tt-tf: uppercase;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.14em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --tab-on-bg: linear-gradient(180deg,#2a3e2c,#1a2d1e); --tab-on-ink:#6be07a; --tab-on-edge:#0e1013;
  --tt-bg: linear-gradient(180deg,#3a3f46,#2a2e34); --tt-ink:#c6ccd4;
  --work-bg: linear-gradient(180deg,#2a2e34,#1f2227); --work-top:1px solid #4a4f57;
  --work-ink:#c6ccd4; --ruler-ink:#6f767f; --ruler-line:1px solid #3a3f46;
  --cell-off:#14171b; --cell-off-shadow: inset 0 1px 3px rgba(0,0,0,.8);
  --cell-on-shadow: 0 0 6px var(--h); --led-off:#343a41;
  --lcd-bg:#0e1013; --lcd-ink:#6be07a; --lcd-dim:#2c6634;
  --c-kick:#d84315; --c-snare:#c8881a; --c-hat:#2b8a8a; --c-clap:#3fae54; --c-shaker:#22a6c9;
}
/* Chaque menu est une tranche séparée par un filet, et l'état actif est une
   LED au-dessus — pas un fond bleu. C'est la trouvaille de la série barre. */
.s-console .bar .m { padding: 0 11px; border-right: 1px solid #14171b;
  box-shadow: 1px 0 0 #43484f; position: relative; }
.s-console .bar .m:first-child { padding-left: 0; }
.s-console .bar .m:nth-child(2) { color:#6be07a; }
.s-console .bar .m:nth-child(2)::before { content:''; position:absolute; left:50%; top:-6px;
  width:5px; height:5px; margin-left:-2.5px; border-radius:50%; background:#6be07a;
  box-shadow: 0 0 6px #6be07a; }
"""))

V.append(('te', 'Bloc', 'Teenage Engineering OP-1', """
.s-te {
  --bg:#f0f0ee; --surf:#fff; --surf2:#e2e2e0; --edge:transparent; --ink:#16161a; --muted:#9a9a9e;
  --radius:3px; --bevel:none; --bar-pad: 10px 2px; --bar-gap: 18px;
  --bar-bg: transparent; --bar-border:0; --bar-shadow: 0 2px 0 #16161a;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-flag: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.16em;
  --font-btn: 700 12px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.1em; --btn-tf: uppercase;
  --font-bpm: 700 24px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-small: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.08em; --tab-tf: uppercase;
  --font-title: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.14em; --tt-tf: uppercase;
  --font-ruler: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.14em; --tag-tf: uppercase;
  --font-lcd: 11px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tempo: 11px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --pan-bg: transparent; --pan-border:0; --pan-pad: 4px 0;
  --btn-border:0; --btn-pad: 14px 18px; --btn-ink:#fff; --btn-bg:#f5c518;
  --play-bg:#2fbf6a; --play-ink:#fff;
  --tab-border:0; --tab-bg:#fff; --tab-ink:#9a9a9e; --tab-pad: 11px 0;
  --tab-on-bg:#16161a; --tab-on-ink:#fff;
  --win-border:0; --win-radius:3px; --tt-bg:#16161a; --tt-ink:#fff;
  --wb-bg:#3a3a3e; --wb-ink:#fff; --wb-border:0;
  --work-bg:#fff; --work-ink:#16161a; --work-pad: 12px 10px;
  --ruler-ink:#9a9a9e; --ruler-line:0;
  --cell-off:#e2e2e0; --cell-radius:3px; --cell-h: 42px; --cell-gap: 5px; --row-gap: 9px;
  --led-off:#d2d2d0; --lcd-bg:#f0f0ee; --lcd-ink:#16161a; --lcd-dim:#9a9a9e;
  --slider-bg:#e2e2e0; --slider-border:0; --knob-bg:#16161a; --knob-border:0;
  --c-kick:#f0432c; --c-snare:#f5c518; --c-hat:#17b8d4; --c-clap:#2fbf6a; --c-shaker:#1d5fd8;
}
.s-te .flag { background:#f0432c; color:#fff; padding:4px 8px; border-radius:3px; }
.s-te .bar .ic { background:#e2e2e0; border:0; }
"""))

V.append(('cahier', 'Cahier', 'papier réglé, encre', """
.s-cahier {
  --bg:#f6f1e4; --surf: transparent; --surf2:#efe8d6; --edge:#cfc4a8; --ink:#23201a; --muted:#6a6153;
  --radius:2px; --bevel:none; --bar-pad: 7px 2px; --bar-gap: 18px;
  --bar-border:0; --bar-shadow: 0 2px 0 #23201a;
  --font: Georgia,'DejaVu Serif',serif; --font-menu: 13px Georgia,'DejaVu Serif',serif;
  --font-flag: italic 11px Georgia,'DejaVu Serif',serif;
  --font-btn: 14px Georgia,'DejaVu Serif',serif;
  --font-bpm: 17px Georgia,'DejaVu Serif',serif;
  --font-small: italic 10px Georgia,'DejaVu Serif',serif;
  --font-tab: 13px Georgia,'DejaVu Serif',serif;
  --font-title: 15px Georgia,'DejaVu Serif',serif;
  --font-ruler: italic 11px Georgia,'DejaVu Serif',serif;
  --font-tag: 12px Georgia,'DejaVu Serif',serif; --tag-ls:.04em;
  --font-lcd: italic 11.5px Georgia,'DejaVu Serif',serif;
  --font-tempo: 12px Georgia,'DejaVu Serif',serif;
  --pan-bg: transparent; --pan-border:0; --pan-pad: 5px 0;
  --btn-border: 1.5px solid #23201a; --btn-bg:#efe8d6; --btn-pad: 9px 16px;
  --tab-border:0; --tab-bg: transparent; --tab-shadow:none; --tab-ink:#6a6153;
  --tab-on-bg: transparent; --tab-on-ink:#23201a; --tab-on-shadow: 0 8px 0 -6px #b4342a;
  --win-border: 1.5px solid #23201a; --win-shadow: 3px 3px 0 rgba(35,32,26,.16);
  --tt-bg:#efe8d6; --tt-ink:#23201a; --wb-bg:#f6f1e4; --wb-border:1px solid #23201a;
  --work-bg:#fdfaf2; --work-ink:#23201a; --work-top:1px solid #23201a; --work-pad: 11px 10px;
  --ruler-ink:#6a6153; --ruler-line:1px solid #cfc4a8;
  --cell-off: transparent; --cell-border:1px solid #cfc4a8; --cell-radius:1px; --cell-h: 36px;
  --led-off:#cfc4a8; --lcd-bg: transparent; --lcd-ink:#6a6153; --lcd-dim:#a89e88;
  --lcd-border:1px solid #cfc4a8;
  --slider-bg:#efe8d6; --knob-bg:#23201a; --knob-border:0;
  --c-kick:#9c3b1f; --c-snare:#a8791b; --c-hat:#2f6f6c; --c-clap:#3d7a45; --c-shaker:#2a6e86;
}
.s-cahier { background-image: repeating-linear-gradient(0deg, transparent 0 27px, #e2d9c1 27px 28px); }
.s-cahier .tag { font-variant: small-caps; }
"""))

V.append(('cassette', 'Cassette', 'la jaquette d’une K7', """
.s-cassette {
  --bg:#d8d2c6; --surf:#f4f1e8; --surf2:#f4f1e8; --edge:#23211c; --ink:#23211c; --muted:#7a736a;
  --radius:0; --bevel:none; --bar-pad: 7px 10px; --bar-gap: 14px;
  --bar-shadow: none;
  --font: 'Courier New','DejaVu Sans Mono',monospace;
  --font-menu: 11px 'Courier New','DejaVu Sans Mono',monospace; --menu-ls:.06em;
  --font-flag: 9px 'Courier New','DejaVu Sans Mono',monospace; --flag-ls:.1em;
  --font-btn: 12px 'Courier New','DejaVu Sans Mono',monospace;
  --font-bpm: 700 15px 'Courier New','DejaVu Sans Mono',monospace;
  --font-small: 9px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tab: 11px 'Courier New','DejaVu Sans Mono',monospace;
  --font-title: 700 12px 'Courier New','DejaVu Sans Mono',monospace; --tt-ls:.12em;
  --font-ruler: 10px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tag: 700 10px 'Courier New','DejaVu Sans Mono',monospace; --tag-ls:.1em;
  --font-lcd: 10px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tempo: 11px 'Courier New','DejaVu Sans Mono',monospace;
  --btn-pad: 9px 14px;
  --tab-on-bg:#23211c; --tab-on-ink:#f4f1e8;
  --win-shadow: 4px 4px 0 rgba(35,33,28,.2); --tt-bg:#23211c; --tt-ink:#f4f1e8;
  --wb-bg:#f4f1e8; --wb-ink:#23211c;
  --work-bg:#f4f1e8; --work-ink:#23211c; --work-top:1px solid #23211c;
  --ruler-line:1px solid rgba(35,33,28,.35);
  --cell-off:#e6e1d4; --cell-border:1px solid #23211c; --cell-radius:0;
  --led-off:#bdb6a8; --lcd-bg:#e6e1d4; --lcd-ink:#7a736a; --lcd-dim:#a8a094;
  --lcd-border:1px solid #23211c;
  --c-kick:#c94f2e; --c-snare:#c99a2e; --c-hat:#2e8c88; --c-clap:#4a8c3e; --c-shaker:#3e6f9c;
}
/* Le filet coloré à gauche : sur une jaquette, c'est lui qui dit la face. */
.s-cassette .bar, .s-cassette .transport, .s-cassette .tempo { border-left: 7px solid #c94f2e; }
.s-cassette .win { border-left: 7px solid #c94f2e; }
"""))

V.append(('dymo', 'Étiqueteuse', 'ruban embossé de home studio', """
.s-dymo {
  --bg:#2a2622; --surf:#1d1a17; --surf2:#4a463f; --edge:#0f0d0b; --ink:#fff; --muted:#8d8471;
  --radius:2px; --bevel: inset 0 1px 0 rgba(255,255,255,.25);
  --bar-pad: 7px 8px; --bar-gap: 6px; --bar-border:0;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.16em; --menu-tf: uppercase;
  --font-flag: 700 8px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.16em;
  --font-btn: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.16em; --btn-tf: uppercase;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.16em; --tab-tf: uppercase;
  --font-title: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.18em; --tt-tf: uppercase;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.14em;
  --font-lcd: 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tempo: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-border:0; --btn-bg:#3d6fb5; --btn-ink:#fff; --btn-pad: 11px 14px;
  --play-bg:#2f8a4a;
  --tab-border:0; --tab-bg:#4a463f; --tab-ink:#fff; --tab-pad: 10px 2px;
  --tab-on-bg:#c0392b; --tab-on-ink:#fff;
  --win-border:0; --tt-bg:#c0392b; --tt-ink:#fff; --wb-bg:#4a463f; --wb-border:0;
  --work-bg:#241f1b; --work-ink:#d8cfbf;
  --ruler-ink:#8d8471; --ruler-line:1px solid #3a3630;
  --cell-off:#3a3630; --cell-off-shadow: inset 0 1px 0 rgba(255,255,255,.12);
  --cell-on-shadow: inset 0 1px 0 rgba(255,255,255,.3); --led-off:#4a463f;
  --lcd-bg:#3a3630; --lcd-ink:#d9cfa8; --lcd-dim:#8d8471;
  --c-kick:#c0392b; --c-snare:#c9922b; --c-hat:#2b8f8a; --c-clap:#3f9a4e; --c-shaker:#3d6fb5;
}
/* Chaque libellé EST une étiquette embossée, y compris dans la barre. */
.s-dymo .bar .m { background:#3d6fb5; padding:5px 8px; border-radius:2px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 0 1px 2px rgba(0,0,0,.5); }
.s-dymo .flag { background:#d9cfa8; color:#1d1a17; padding:4px 7px; border-radius:2px; }
.s-dymo .tag { background:#3a3630; padding:4px 5px; border-radius:2px; width:56px; }
"""))

V.append(('tracker', 'Tracker', 'Polyend / Renoise', """
.s-tracker {
  --bg:#0a0b0d; --surf:#101216; --surf2:#0a0b0d; --edge:#2a2f38; --ink:#c8cdd6; --muted:#5a6068;
  --radius:0; --bevel:none; --bar-pad: 7px 10px; --bar-gap: 14px;
  --bar-border:0; --bar-shadow: 0 1px 0 #1d2026;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 11px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-flag: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 11px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.1em; --btn-tf: uppercase;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 10.5px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.1em; --tab-tf: uppercase;
  --font-title: 10px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.14em; --tt-tf: uppercase;
  --font-ruler: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 10px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.1em;
  --font-lcd: 10.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --pan-bg:#101216; --pan-border:1px solid #1d2026;
  --btn-bg:#16191f; --btn-border:1px solid #2a2f38; --btn-pad: 10px 13px;
  --tab-bg:#101216; --tab-border:1px solid #1d2026; --tab-ink:#5a6068; --tab-shadow:none;
  --tab-on-bg:#c8cdd6; --tab-on-ink:#0a0b0d; --tab-on-edge:#c8cdd6;
  --win-border:1px solid #1d2026; --tt-bg:#101216; --tt-ink:#b48cff;
  --wb-bg:#16191f; --wb-ink:#5a6068;
  --work-bg:#0a0b0d; --work-ink:#c8cdd6; --ruler-ink:#b48cff; --ruler-line:1px solid #1d2026;
  --cell-off:#131519; --cell-border:0; --cell-radius:0; --cell-gap:2px;
  --led-off:#23262c; --lcd-bg:#101216; --lcd-ink:#c8cdd6; --lcd-dim:#5a6068;
  --lcd-border:1px solid #1d2026; --lcd-radius:0;
  --c-kick:#ff6a45; --c-snare:#ffc043; --c-hat:#3ad6cf; --c-clap:#63e07a; --c-shaker:#4bb6ff;
}
.s-tracker .flag { color:#b48cff; }
"""))

V.append(('plat', 'Plat', 'la version sans style — témoin', """
.s-plat {
  --bg:#f5f6f7; --surf:#fff; --surf2:#f1f3f5; --edge:#e3e5e8; --ink:#111418; --muted:#8b939d;
  --radius:10px; --bevel: 0 1px 2px rgba(15,20,28,.06);
  --bar-pad: 9px 10px; --bar-gap: 16px; --bar-border:0;
  --bar-shadow: 0 1px 0 #e3e5e8;
  --font: -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 500 13px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-flag: 11px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-btn: 600 14px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-bpm: 600 16px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-small: 10px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 500 13px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-title: 600 14px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-ruler: 10px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 600 11px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif; --tag-tf: uppercase;
  --font-lcd: 11.5px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tempo: 12.5px -apple-system,'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-border:0; --btn-radius: 10px; --btn-bg:#f1f3f5; --btn-pad: 13px 18px;
  --play-bg:#111418; --play-ink:#fff;
  --tab-border:0; --tab-radius: 8px; --tab-bg:#f1f3f5; --tab-ink:#5b6470; --tab-shadow:none;
  --tab-on-bg:#111418; --tab-on-ink:#fff;
  --win-border:0; --win-radius:12px; --win-shadow: 0 2px 8px rgba(15,20,28,.08);
  --tt-bg:#fff; --tt-ink:#111418; --wb-bg:#f1f3f5; --wb-border:0;
  --work-bg:#fff; --work-ink:#111418; --work-top:1px solid #eceef1;
  --ruler-ink:#8b939d; --ruler-line:0;
  --cell-off:#f1f3f5; --cell-radius:6px; --cell-h: 40px; --cell-gap:4px;
  --led-off:#d8dce1; --lcd-bg:#f8f9fa; --lcd-ink:#5b6470; --lcd-dim:#8b939d; --lcd-radius:8px;
  --slider-bg:#e9ecef; --slider-border:0; --knob-bg:#111418; --knob-border:0;
  --c-kick:#ef5a2b; --c-snare:#e0a021; --c-hat:#22b0ae; --c-clap:#3cc866; --c-shaker:#2fa8e3;
}
"""))
