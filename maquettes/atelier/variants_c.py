# -*- coding: utf-8 -*-
"""Trois pistes demandées par Yann, trois écrans chacune.
AUCUNE ne garde quoi que ce soit de XP : ni fond Bliss, ni panneaux Luna, ni
bandeau de fenêtre bleu. L'organisation, elle, ne bouge toujours pas."""

V = []

# ===================================================================== WINAMP
V.append(('w1', 'Winamp 2.x', 'la skin d’origine, au pixel',
"""
.s-w1 {
  --bg:#000; --surf: linear-gradient(180deg,#4b4b57,#2e2e38 55%,#1e1e26);
  --surf2: linear-gradient(180deg,#5c5c6a,#333340); --edge:#0a0a10; --ink:#c8c8d8; --muted:#75758a;
  --radius:0; --bevel: inset 1px 1px 0 #7d7d92, inset -1px -1px 0 #0a0a10;
  --pad: 8px 7px; --gap: 6px; --bar-pad: 3px 5px; --bar-gap: 9px; --bar-border:0;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.1em; --menu-tf: uppercase;
  --font-flag: 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.12em; --btn-tf: uppercase;
  --font-bpm: 700 22px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.12em; --tab-tf: uppercase;
  --font-title: 700 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.22em; --tt-tf: uppercase;
  --font-ruler: 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.14em; --tag-w: 52px;
  --font-lcd: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-border:0; --btn-pad: 9px 11px;
  --tab-border:0; --tab-on-bg:#0b1a0d; --tab-on-ink:#2ee23c; --tab-on-shadow: inset 1px 1px 0 #0a0a10;
  --win-border:0; --win-shadow: inset 1px 1px 0 #7d7d92, inset -1px -1px 0 #0a0a10;
  --tt-bg: linear-gradient(180deg,#3a3a8c,#1c1c46 50%,#2a2a66); --tt-ink:#b8b8e8;
  --wb-bg: linear-gradient(180deg,#5c5c6a,#2e2e38); --wb-border:0; --wb-ink:#c8c8d8;
  --work-bg:#25252e; --work-ink:#c8c8d8; --work-pad: 7px;
  --ruler-ink:#2ee23c; --ruler-line:1px solid #3d3d4a;
  --cell-off:#050806; --cell-h: 30px; --cell-gap:2px; --row-gap:4px;
  --cell-off-shadow: inset 1px 1px 0 #0a0a10, inset -1px -1px 0 rgba(255,255,255,.09);
  --cell-on-shadow: inset 1px 1px 0 rgba(255,255,255,.35);
  --led-off:#33333f; --lcd-bg:#050806; --lcd-ink:#2ee23c; --lcd-dim:#0f5c17;
  --slider-bg:#1a1a22; --knob-bg: linear-gradient(180deg,#7d7d92,#33333f);
  --c-kick:#ff5a2b; --c-snare:#ffb020; --c-hat:#2ee23c; --c-clap:#33d9d6; --c-shaker:#8a8ad8;
}
/* La poignée à points de la barre de titre : la signature de la skin. */
.s-w1 .bar { position: relative; padding-right: 60px; }
.s-w1 .bar::after { content:''; position:absolute; right:8px; top:50%; width:44px; height:7px;
  margin-top:-3.5px; background-image: radial-gradient(rgba(255,255,255,.45) 1px, transparent 1.2px);
  background-size: 3px 3px; }
.s-w1 .flag { color:#2ee23c; background:#050806; padding:2px 5px;
  box-shadow: inset 1px 1px 0 #0a0a10; }
.s-w1 .bpm { color:#2ee23c; text-shadow: 0 0 6px rgba(46,226,60,.5); }
"""))

V.append(('w2', 'Skin de nuit', 'une skin custom de skins.winamp.com',
"""
.s-w2 {
  --bg:#050507; --surf: linear-gradient(180deg,#16161c,#0b0b0f); --surf2:#101016;
  --edge:#26263a; --ink:#d6d6ee; --muted:#6a6a8c; --radius:0;
  --bevel: inset 0 1px 0 #34344e, inset 0 -1px 0 #000;
  --pad: 8px 7px; --gap: 7px; --bar-pad: 6px 8px; --bar-gap: 11px;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.14em; --menu-tf: uppercase;
  --font-flag: 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --flag-ls:.14em;
  --font-btn: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.16em; --btn-tf: uppercase;
  --font-bpm: 700 20px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.16em; --tab-tf: uppercase;
  --font-title: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.24em; --tt-tf: uppercase;
  --font-ruler: 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.16em;
  --font-lcd: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-border:1px solid #2c2c46; --btn-pad: 10px 13px; --btn-ink:#a8a8ff;
  --tab-border:1px solid #2c2c46; --tab-ink:#6a6a8c;
  --tab-on-bg:#1a0a24; --tab-on-ink:#ff3ff0; --tab-on-edge:#ff3ff0;
  --win-border:1px solid #2c2c46; --win-shadow: 0 0 24px rgba(255,63,240,.12);
  --tt-bg: linear-gradient(90deg,#1a0a24,#0b0b0f 70%); --tt-ink:#ff3ff0;
  --wb-bg:#101016; --wb-ink:#a8a8ff; --wb-border:1px solid #2c2c46;
  --work-bg:#08080c; --work-ink:#d6d6ee; --work-top:1px solid #2c2c46;
  --ruler-ink:#3ff0ff; --ruler-line:1px solid #1c2c38;
  --cell-off:#0d0d14; --cell-border:1px solid #1a1a28;
  --cell-on-shadow: 0 0 12px var(--h), inset 0 0 6px rgba(255,255,255,.25);
  --led-off:#23233a; --lcd-bg:#08080c; --lcd-ink:#3ff0ff; --lcd-dim:#1c5c66;
  --lcd-border:1px solid #1c2c38;
  --slider-bg:#101016; --knob-bg:#ff3ff0; --knob-border:0;
  --c-kick:#ff2f6a; --c-snare:#ff8a1f; --c-hat:#3ff0ff; --c-clap:#4fff9a; --c-shaker:#a8a8ff;
}
.s-w2 .bar .m { text-shadow: 0 0 8px rgba(168,168,255,.45); }
.s-w2 .flag { color:#ff3ff0; }
.s-w2 .bpm { color:#3ff0ff; text-shadow: 0 0 10px rgba(63,240,255,.6); }
"""))

V.append(('w3', 'Winamp 5', 'la « modern skin », brossée et ronde',
"""
.s-w3 {
  --bg: linear-gradient(180deg,#1b2027,#0e1116);
  --surf: linear-gradient(180deg,#3d4650,#252c34 55%,#1b2027);
  --surf2: linear-gradient(180deg,#4d5761,#2a323b); --edge:#0d1116; --ink:#cdd5dd; --muted:#7a8794;
  --radius:6px; --bevel: inset 0 1px 0 rgba(255,255,255,.16), 0 1px 3px rgba(0,0,0,.5);
  --pad: 10px 9px; --gap: 8px; --bar-pad: 7px 10px; --bar-gap: 13px; --bar-radius: 8px;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 600 11.5px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-flag: 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.1em;
  --font-btn: 700 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-bpm: 700 19px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 600 11.5px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-title: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.14em; --tt-tf: uppercase;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.1em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 11px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-radius: 20px; --btn-pad: 11px 16px; --btn-border:1px solid #10151b;
  --play-bg: linear-gradient(180deg,#ffb84d,#e07f10); --play-ink:#1b2027;
  --tab-radius: 16px; --tab-ink:#8f9caa;
  --tab-on-bg: linear-gradient(180deg,#ffb84d,#e07f10); --tab-on-ink:#1b2027;
  --win-radius:10px; --win-border:1px solid #0d1116; --win-shadow: 0 6px 18px rgba(0,0,0,.55);
  --tt-bg: linear-gradient(180deg,#4d5761,#2a323b); --tt-ink:#e8eef4;
  --wb-bg: linear-gradient(180deg,#5a6470,#333c46); --wb-ink:#cdd5dd;
  --work-bg: linear-gradient(180deg,#131820,#0c1015); --work-ink:#cdd5dd;
  --work-top:1px solid #3d4650;
  --ruler-ink:#e07f10; --ruler-line:1px solid #2a323b;
  --cell-off:#0a0e13; --cell-radius:5px; --cell-off-shadow: inset 0 2px 4px rgba(0,0,0,.8);
  --cell-on-shadow: 0 0 10px var(--h), inset 0 1px 0 rgba(255,255,255,.3);
  --led-off:#39424c; --lcd-bg:#0a0e13; --lcd-ink:#ffb84d; --lcd-dim:#7a5518; --lcd-radius:6px;
  --slider-bg:#141a21; --knob-bg: linear-gradient(180deg,#ffb84d,#e07f10); --knob-border:0;
  --c-kick:#ff6a45; --c-snare:#ffb84d; --c-hat:#4fd6d2; --c-clap:#6ee07a; --c-shaker:#63b6ff;
}
.s-w3 .bpm { color:#ffb84d; }
.s-w3 .flag { color:#8f9caa; }
"""))

# ================================================== ANALOGIQUE / MÉCANIQUE
V.append(('a1', 'Bakélite', 'magnétophone à lampes, vumètre à aiguille',
"""
.s-a1 {
  --bg: linear-gradient(160deg,#3b2317,#241209 55%,#33200f);
  --surf: linear-gradient(180deg,#f1e6cd,#ddcfae 60%,#c9b992);
  --surf2: linear-gradient(180deg,#fdf6e6,#dccfae); --edge:#8a7550; --ink:#2a2013; --muted:#7a6844;
  --radius:3px; --bevel: inset 0 1px 0 rgba(255,255,255,.8), 0 1px 2px rgba(0,0,0,.35);
  --pad: 11px 9px; --gap: 9px; --bar-pad: 7px 10px; --bar-gap: 14px;
  --bar-bg: linear-gradient(180deg,#4a2f1c,#2c1a0d); --bar-border:1px solid #120a04;
  --bar-shadow: inset 0 1px 0 rgba(255,255,255,.14);
  --font: Georgia,'DejaVu Serif',serif;
  --font-menu: 12px Georgia,'DejaVu Serif',serif; --menu-ls:.06em;
  --font-flag: italic 10px Georgia,'DejaVu Serif',serif;
  --font-btn: 700 12px Georgia,'DejaVu Serif',serif; --btn-ls:.1em; --btn-tf: uppercase;
  --font-bpm: 700 17px Georgia,'DejaVu Serif',serif;
  --font-small: italic 9px Georgia,'DejaVu Serif',serif;
  --font-tab: 11px Georgia,'DejaVu Serif',serif; --tab-ls:.12em; --tab-tf: uppercase;
  --font-title: 700 12px Georgia,'DejaVu Serif',serif; --tt-ls:.2em; --tt-tf: uppercase;
  --font-ruler: italic 10px Georgia,'DejaVu Serif',serif;
  --font-tag: 700 10px Georgia,'DejaVu Serif',serif; --tag-ls:.1em;
  --font-lcd: 10px Georgia,'DejaVu Serif',serif;
  --font-tempo: 11px Georgia,'DejaVu Serif',serif;
  --btn-pad: 10px 15px; --btn-border:1px solid #8a7550;
  --play-bg: linear-gradient(180deg,#e8d9b4,#c2a86f); 
  --tab-on-bg: linear-gradient(180deg,#8c1f14,#5e1108); --tab-on-ink:#f1e6cd; --tab-on-edge:#3d0b05;
  --win-border:1px solid #8a7550; --win-shadow: 0 4px 12px rgba(0,0,0,.45);
  --tt-bg: linear-gradient(180deg,#4a2f1c,#2c1a0d); --tt-ink:#e8d9b4;
  --wb-bg: linear-gradient(180deg,#e8d9b4,#c2a86f); --wb-ink:#2a2013;
  --work-bg: linear-gradient(180deg,#e6d9bb,#d3c39c); --work-ink:#2a2013;
  --work-top:2px solid #8c1f14;
  --ruler-ink:#7a6844; --ruler-line:1px solid #b8a67e;
  --cell-off: linear-gradient(180deg,#cbbb95,#b7a781); --cell-border:1px solid #8a7550;
  --cell-off-shadow: inset 0 2px 3px rgba(60,40,15,.4);
  --cell-on-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 1px 2px rgba(0,0,0,.35);
  --led-off:#a2916c; --lcd-bg:#2c1a0d; --lcd-ink:#e8b34d; --lcd-dim:#8a6420;
  --slider-bg: linear-gradient(180deg,#c9b992,#e0d2b0); --knob-bg: linear-gradient(180deg,#fdf6e6,#b8a67e);
  --c-kick:#8c1f14; --c-snare:#a8701a; --c-hat:#4a6b4a; --c-clap:#5c7a3d; --c-shaker:#3d5f6b;
}
/* Le vumètre : cadran ivoire, aiguille, échelle rouge. Il remplace le BPM nu —
   c'est le seul cadran de la série qui BOUGE au son. */
.s-a1 .bpm { position: relative; width: 104px; height: 44px; border-radius: 3px;
  background: linear-gradient(180deg,#fdf6e6,#e6d6ae); border: 1px solid #8a7550;
  box-shadow: inset 0 2px 5px rgba(90,65,25,.35); overflow: hidden;
  display: block; padding: 0; font-size: 10px; color:#7a6844; }
.s-a1 .bpm small { position: absolute; right: 5px; bottom: 2px; font-size: 8px; }
/* L'échelle : arc clair, zone rouge à droite comme sur un vrai vumètre. */
.s-a1 .bpm::before { content:''; position:absolute; left:9px; right:9px; top:8px; height:22px;
  border-top: 1.5px solid #7a6844; border-right: 1.5px solid #8c1f14;
  border-radius: 50% / 100% 100% 0 0; }
.s-a1 .bpm::after { content:''; position:absolute; left:50%; bottom:4px; width:1.5px; height:30px;
  background:#2a2013; transform-origin: bottom center; transform: rotate(-24deg); }
.s-a1 .bpm { padding-left: 6px; padding-top: 2px; }
.s-a1 .flag { color:#e0c893; }
.s-a1 .bar .m { color:#e8d9b4; }
.s-a1 .bar .ic { background: linear-gradient(180deg,#e8d9b4,#c2a86f); border-color:#120a04; color:#2a2013; }
"""))

V.append(('a2', 'Mécanique', 'palettes de tableau d’affichage, cartes perforées',
"""
.s-a2 {
  --bg:#1c1e22; --surf: linear-gradient(180deg,#3c4046,#2a2e34); --surf2: linear-gradient(180deg,#4a4f57,#33383f);
  --edge:#14161a; --ink:#e8e6e0; --muted:#8e948c; --radius:2px;
  --bevel: inset 0 1px 0 rgba(255,255,255,.14), 0 1px 2px rgba(0,0,0,.5);
  --pad: 10px 9px; --gap: 8px; --bar-pad: 0; --bar-gap: 3px; --bar-border:0; --bar-bg: transparent;
  --bar-shadow: none;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.12em; --menu-tf: uppercase;
  --font-flag: 8.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.14em;
  --font-btn: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.14em; --btn-tf: uppercase;
  --font-bpm: 700 20px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-small: 8px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.14em; --tab-tf: uppercase;
  --font-title: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.2em; --tt-tf: uppercase;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.14em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-pad: 11px 14px;
  --tab-on-bg: linear-gradient(180deg,#f0efe9,#cfcdc4); --tab-on-ink:#1c1e22; --tab-on-edge:#14161a;
  --win-border:1px solid #14161a; --win-shadow: 0 3px 9px rgba(0,0,0,.5);
  --tt-bg: linear-gradient(180deg,#4a4f57,#2f343a); --tt-ink:#e8e6e0;
  --wb-bg: linear-gradient(180deg,#4a4f57,#33383f); --wb-ink:#e8e6e0;
  --work-bg:#22252a; --work-ink:#e8e6e0; --work-top:1px solid #4a4f57;
  --ruler-ink:#8e948c; --ruler-line:1px solid #3a3f46;
  --cell-h: 36px; --cell-gap: 4px;
  --led-off:#4a4f57; --lcd-bg:#14161a; --lcd-ink:#e8e6e0; --lcd-dim:#6b7169;
  --slider-bg:#14161a; --knob-bg: linear-gradient(180deg,#f0efe9,#c9c7be); --knob-border:1px solid #14161a;
  --c-kick:#e8e6e0; --c-snare:#e8e6e0; --c-hat:#e8e6e0; --c-clap:#e8e6e0; --c-shaker:#e8e6e0;
}
/* La palette : deux demi-cartes séparées par la charnière. Éteint = face noire,
   allumé = face claire. Il n'y a pas de couleur, il y a une POSITION. */
.s-a2 .cells i { background:#111316; border:1px solid #000; border-radius:2px;
  position: relative; box-shadow: inset 0 -6px 10px rgba(0,0,0,.55); }
.s-a2 .cells i::after { content:''; position:absolute; left:0; right:0; top:50%; height:1px;
  background:#000; box-shadow: 0 1px 0 rgba(255,255,255,.09); }
.s-a2 .cells i.on { background: linear-gradient(180deg,#f4f3ee,#d8d6cc 49%,#c2c0b6 51%,#e6e4da);
  box-shadow: inset 0 -4px 8px rgba(0,0,0,.15); }
.s-a2 .cells i.on::after { background: rgba(0,0,0,.45); box-shadow: 0 1px 0 rgba(255,255,255,.5); }
/* Les menus sont des touches mécaniques, pas des mots. */
.s-a2 .bar .m { background: linear-gradient(180deg,#4a4f57,#2f343a); padding: 9px 8px;
  border-radius: 3px; border: 1px solid #14161a;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.18), 0 2px 0 #14161a; }
.s-a2 .flag { color:#c9a24a; }
"""))

V.append(('a3', 'Eurorack', 'modulaire : jacks, câbles, sérigraphie blanche',
"""
.s-a3 {
  --bg:#0e0f11; --surf: linear-gradient(180deg,#26282c,#191b1e); --surf2:#202226;
  --edge:#000; --ink:#e6e8ea; --muted:#878c92; --radius:1px;
  --bevel: inset 0 1px 0 rgba(255,255,255,.09);
  --pad: 9px 8px; --gap: 7px; --bar-pad: 8px 10px; --bar-gap: 12px;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.22em; --menu-tf: uppercase;
  --font-flag: 7.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.2em;
  --font-btn: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.2em; --btn-tf: uppercase;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 7.5px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.2em; --tab-tf: uppercase;
  --font-title: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.26em; --tt-tf: uppercase;
  --font-ruler: 8px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 8.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.18em; --tag-w: 64px;
  --font-lcd: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-pad: 11px 13px; --btn-border:1px solid #000;
  --tab-on-bg:#e6e8ea; --tab-on-ink:#0e0f11; --tab-on-edge:#e6e8ea;
  --win-border:1px solid #000; --win-shadow: 0 3px 10px rgba(0,0,0,.6);
  --tt-bg: linear-gradient(180deg,#26282c,#141518); --tt-ink:#e6e8ea;
  --wb-bg:#202226; --wb-ink:#878c92;
  --work-bg: linear-gradient(180deg,#1b1d20,#131417); --work-ink:#e6e8ea;
  --work-top:1px solid #3a3d42; --work-pad: 11px 9px;
  --ruler-ink:#878c92; --ruler-line:1px solid #2c2f33;
  --cell-off:#0a0b0d; --cell-radius:50%; --cell-h: 26px; --cell-gap: 6px;
  --cell-border:2px solid #3a3d42;
  --cell-off-shadow: inset 0 2px 4px rgba(0,0,0,.9);
  --cell-on-shadow: 0 0 10px var(--h), inset 0 0 0 3px #0a0b0d;
  --led-off:#2c2f33; --lcd-bg:#0a0b0d; --lcd-ink:#8de0ff; --lcd-dim:#2a5c70;
  --lcd-border:1px solid #2c2f33;
  --slider-bg:#0a0b0d; --knob-bg: radial-gradient(circle at 35% 30%, #6d737a, #1a1c1f 72%);
  --knob-border:1px solid #000;
  --c-kick:#ff5a3c; --c-snare:#ffc73c; --c-hat:#3cd6c8; --c-clap:#7ce03c; --c-shaker:#5ba8ff;
}
/* Les pas deviennent des JACKS : un trou noir cerclé, allumé quand il est
   patché. La ligne porte son nom en sérigraphie, à gauche du panneau. */
.s-a3 .row { border-bottom: 1px solid #24262a; padding-bottom: 7px; }
/* Un jack est rond, pas ovale : taille fixe et répartition régulière, ce qui
   garde les positions rythmiques justes aussi bien à 4 pas qu'à 8. */
.s-a3 .cells { gap: 0; justify-content: space-around; }
.s-a3 .cells i { flex: 0 0 26px; width: 26px; height: 26px; }
.s-a3 .tag { color:#e6e8ea; }
.s-a3 .led { border-radius: 0; width: 5px; height: 5px; }
.s-a3 .flag { color:#8de0ff; }
"""))

# =================================================================== CYBERPUNK
V.append(('c1', 'Néon', 'ruelle de Kowloon, magenta et cyan',
"""
.s-c1 {
  --bg: radial-gradient(120% 60% at 80% 0%, rgba(255,0,128,.16), rgba(0,0,0,0) 60%),
        radial-gradient(100% 50% at 10% 100%, rgba(0,229,255,.14), rgba(0,0,0,0) 60%),
        #05030a;
  --surf: rgba(255,255,255,.03); --surf2: rgba(255,255,255,.06);
  --edge: rgba(255,0,128,.35); --ink:#f2e9ff; --muted:#8a72a8; --radius:0;
  --bevel: 0 0 0 1px rgba(255,0,128,.12);
  --pad: 10px 9px; --gap: 8px; --bar-pad: 7px 10px; --bar-gap: 12px;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.18em; --menu-tf: uppercase;
  --font-flag: 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --flag-ls:.18em;
  --font-btn: 700 10.5px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.2em; --btn-tf: uppercase;
  --font-bpm: 700 22px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.18em; --tab-tf: uppercase;
  --font-title: 700 9.5px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.3em; --tt-tf: uppercase;
  --font-ruler: 8.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.18em;
  --font-lcd: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-border:1px solid #ff0080; --btn-ink:#ff0080; --btn-bg: rgba(255,0,128,.07);
  --btn-pad: 11px 14px; --play-bg: rgba(0,229,255,.09); --play-ink:#00e5ff;
  --tab-border:1px solid rgba(255,0,128,.3); --tab-bg: transparent; --tab-ink:#8a72a8;
  --tab-on-bg: rgba(255,0,128,.16); --tab-on-ink:#ff3ba0; --tab-on-edge:#ff0080;
  --win-border:1px solid rgba(255,0,128,.4); --win-shadow: 0 0 30px rgba(255,0,128,.18);
  --tt-bg: linear-gradient(90deg, rgba(255,0,128,.25), rgba(0,0,0,0) 70%); --tt-ink:#ff3ba0;
  --wb-bg: transparent; --wb-ink:#00e5ff; --wb-border:1px solid rgba(0,229,255,.4);
  --work-bg: rgba(0,0,0,.55); --work-ink:#f2e9ff; --work-top:1px solid rgba(255,0,128,.3);
  --ruler-ink:#00e5ff; --ruler-line:1px solid rgba(0,229,255,.25);
  --cell-off: rgba(255,255,255,.035); --cell-border:1px solid rgba(255,255,255,.09);
  --cell-on-shadow: 0 0 16px var(--h), 0 0 40px var(--h), inset 0 0 8px rgba(255,255,255,.4);
  --led-off:#2a1c3a; --lcd-bg: rgba(0,0,0,.6); --lcd-ink:#00e5ff; --lcd-dim:#2a6a78;
  --lcd-border:1px solid rgba(0,229,255,.25);
  --slider-bg: rgba(255,255,255,.06); --knob-bg:#ff0080; --knob-border:0;
  --c-kick:#ff0080; --c-snare:#ff8a00; --c-hat:#00e5ff; --c-clap:#39ff88; --c-shaker:#b14bff;
}
.s-c1 .bar .m { text-shadow: 0 0 10px rgba(255,0,128,.6); color:#ff3ba0; }
.s-c1 .flag { color:#00e5ff; text-shadow: 0 0 10px rgba(0,229,255,.6); }
.s-c1 .bpm { color:#ff3ba0; text-shadow: 0 0 14px rgba(255,0,128,.7); }
/* Lignes de balayage : l'écran est filmé, pas affiché. */
.s-c1 .win { position: relative; }
.s-c1 .win::after { content:''; position:absolute; inset:0; pointer-events:none;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 3px); }
"""))

V.append(('c2', 'Phosphore', 'terminal cathodique, vert sur noir',
"""
.s-c2 {
  --bg:#000; --surf: rgba(0,255,102,.04); --surf2: rgba(0,255,102,.07);
  --edge: rgba(0,255,102,.35); --ink:#00ff66; --muted:#0a8a3a; --radius:0;
  --bevel: none; --pad: 10px 9px; --gap: 7px; --bar-pad: 6px 9px; --bar-gap: 13px;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 11.5px ui-monospace,'DejaVu Sans Mono',monospace; --menu-tf: uppercase; --menu-ls:.08em;
  --font-flag: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 11.5px ui-monospace,'DejaVu Sans Mono',monospace; --btn-tf: uppercase; --btn-ls:.12em;
  --font-bpm: 700 20px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 11px ui-monospace,'DejaVu Sans Mono',monospace; --tab-tf: uppercase; --tab-ls:.12em;
  --font-title: 11px ui-monospace,'DejaVu Sans Mono',monospace; --tt-tf: uppercase; --tt-ls:.24em;
  --font-ruler: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 10.5px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.1em;
  --font-lcd: 10.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-border:1px solid rgba(0,255,102,.5); --btn-ink:#00ff66; --btn-pad: 10px 13px;
  --tab-border:1px solid rgba(0,255,102,.3); --tab-ink:#0a8a3a; --tab-bg: transparent;
  --tab-on-bg:#00ff66; --tab-on-ink:#000; --tab-on-edge:#00ff66;
  --win-border:1px solid rgba(0,255,102,.5); --win-shadow: 0 0 26px rgba(0,255,102,.12);
  --tt-bg: rgba(0,255,102,.12); --tt-ink:#00ff66;
  --wb-bg: transparent; --wb-ink:#00ff66; --wb-border:1px solid rgba(0,255,102,.4);
  --work-bg:#000; --work-ink:#00ff66; --work-top:1px solid rgba(0,255,102,.3);
  --ruler-ink:#0a8a3a; --ruler-line:1px solid rgba(0,255,102,.2);
  --cell-off: transparent; --cell-border:1px solid rgba(0,255,102,.25);
  --cell-on-shadow: 0 0 14px rgba(0,255,102,.7), inset 0 0 10px rgba(0,255,102,.35);
  --led-off:#063a1a; --lcd-bg: transparent; --lcd-ink:#00ff66; --lcd-dim:#0a8a3a;
  --lcd-border:1px solid rgba(0,255,102,.3);
  --slider-bg: transparent; --slider-border:1px solid rgba(0,255,102,.4);
  --knob-bg:#00ff66; --knob-border:0;
  --c-kick:#00ff66; --c-snare:#00ff66; --c-hat:#00ff66; --c-clap:#00ff66; --c-shaker:#00ff66;
}
/* Un seul phosphore, donc l'état ne peut pas passer par la teinte : il passe
   par l'INTENSITÉ. C'est la même contrainte que System 7, en luminance. */
.s-c2 .cells i.on { background: rgba(0,255,102,.85); }
.screen.s-c2 { position: relative; }
.screen.s-c2::after { content:''; position:absolute; inset:0; pointer-events:none; z-index:5;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,.35) 0 1px, transparent 1px 3px),
    radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.65) 100%); }
.s-c2 .bar .m, .s-c2 .bpm, .s-c2 .tt { text-shadow: 0 0 8px rgba(0,255,102,.55); }
"""))

V.append(('c3', 'HUD', 'surcouche tactique, cyan filaire et alerte ambre',
"""
.s-c3 {
  --bg: linear-gradient(180deg,#05090e,#02050a);
  --surf: rgba(10,30,45,.55); --surf2: rgba(10,30,45,.75);
  --edge: rgba(90,200,235,.32); --ink:#cfeaf5; --muted:#5a8ba0; --radius:0;
  --bevel: none; --pad: 10px 9px; --gap: 8px; --bar-pad: 7px 10px; --bar-gap: 12px;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.22em; --menu-tf: uppercase;
  --font-flag: 8px ui-monospace,'DejaVu Sans Mono',monospace; --flag-ls:.18em;
  --font-btn: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.22em; --btn-tf: uppercase;
  --font-bpm: 700 21px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 7.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 700 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.2em; --tab-tf: uppercase;
  --font-title: 700 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.3em; --tt-tf: uppercase;
  --font-ruler: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 8.5px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.16em;
  --font-lcd: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-border:1px solid rgba(90,200,235,.5); --btn-ink:#7fd4ec; --btn-bg: rgba(20,60,85,.4);
  --btn-pad: 11px 14px; --play-bg: rgba(255,170,40,.13); --play-ink:#ffaa28;
  --tab-border:1px solid rgba(90,200,235,.25); --tab-bg: transparent; --tab-ink:#5a8ba0;
  --tab-on-bg: rgba(255,170,40,.14); --tab-on-ink:#ffaa28; --tab-on-edge:#ffaa28;
  --win-border:1px solid rgba(90,200,235,.4); --win-shadow: 0 0 26px rgba(40,140,180,.16);
  --tt-bg: rgba(20,60,85,.55); --tt-ink:#7fd4ec;
  --wb-bg: transparent; --wb-ink:#7fd4ec; --wb-border:1px solid rgba(90,200,235,.4);
  --work-bg: rgba(3,12,20,.75); --work-ink:#cfeaf5; --work-top:1px solid rgba(90,200,235,.3);
  --ruler-ink:#ffaa28; --ruler-line:1px solid rgba(255,170,40,.25);
  --cell-off: rgba(90,200,235,.05); --cell-border:1px solid rgba(90,200,235,.22);
  --cell-on-shadow: 0 0 12px var(--h), inset 0 0 0 1px rgba(255,255,255,.35);
  --led-off:#1b3a48; --lcd-bg: rgba(20,60,85,.4); --lcd-ink:#7fd4ec; --lcd-dim:#3d6f84;
  --lcd-border:1px solid rgba(90,200,235,.3);
  --slider-bg: rgba(90,200,235,.1); --slider-border:1px solid rgba(90,200,235,.3);
  --knob-bg:#ffaa28; --knob-border:0;
  --c-kick:#ff6a4a; --c-snare:#ffaa28; --c-hat:#4fd8ff; --c-clap:#5fe8a8; --c-shaker:#7f9fff;
}
/* Les équerres d'angle : la marque du HUD. Elles cadrent la zone active
   au lieu de la border. */
.s-c3 .win { position: relative; }
.s-c3 .win::before, .s-c3 .win::after { content:''; position:absolute; width:16px; height:16px;
  border-color:#ffaa28; border-style:solid; pointer-events:none; z-index:4; }
.s-c3 .win::before { left:-1px; top:-1px; border-width:2px 0 0 2px; }
.s-c3 .win::after { right:-1px; bottom:-1px; border-width:0 2px 2px 0; }
.s-c3 .bar { position: relative; }
.s-c3 .bar::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px;
  background:#ffaa28; }
.s-c3 .flag { color:#ffaa28; }
.s-c3 .bpm { color:#7fd4ec; }
"""))
