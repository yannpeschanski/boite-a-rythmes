# -*- coding: utf-8 -*-
"""Variantes 1 à 10. Chacune ne fournit que des tokens, plus des extras
quand sa langue a une particularité structurelle."""

BLISS = ("radial-gradient(120% 80% at 20% 108%, #3a7d2c 0%, #4f9838 28%, rgba(79,152,56,0) 60%),"
         "radial-gradient(150% 90% at 85% 112%, #2e6b24 0%, #57a33d 30%, rgba(87,163,61,0) 62%),"
         "linear-gradient(180deg,#2f71d1 0%,#5f9be6 45%,#a9cdf5 70%,#cfe6fa 100%)")

ROWHUES_STD = """
  --c-kick:#d84315; --c-snare:#c8881a; --c-hat:#2b8a8a; --c-clap:#3fae54; --c-shaker:#22a6c9;"""

V = []

V.append(('luna', 'Luna', "l'actuelle — référence", """
.s-luna {
  --bg: """ + BLISS + """; --surf:#ece9d8; --surf2: linear-gradient(180deg,#fff,#ece9d8 45%,#d6d2c2);
  --edge:#aca899; --ink:#1a1a1a; --muted:#6f6d64; --radius:4px;
  --bevel: inset -1px -1px 0 #808080, inset 1px 1px 0 #fff;
  --font: Tahoma,'DejaVu Sans',sans-serif; --font-menu: 13px Tahoma,'DejaVu Sans',sans-serif;
  --font-flag: 11px Tahoma,'DejaVu Sans',sans-serif; --font-btn: 700 14px Tahoma,'DejaVu Sans',sans-serif;
  --font-bpm: 700 15px Tahoma,'DejaVu Sans',sans-serif; --font-small: 9px Tahoma,'DejaVu Sans',sans-serif;
  --font-tab: 12px Tahoma,'DejaVu Sans',sans-serif; --font-title: 700 13px Tahoma,'DejaVu Sans',sans-serif;
  --font-ruler: 10px Tahoma,'DejaVu Sans',sans-serif; --font-tag: 700 11px Tahoma,'DejaVu Sans',sans-serif;
  --font-lcd: 10px Tahoma,'DejaVu Sans',sans-serif; --font-tempo: 12px Tahoma,'DejaVu Sans',sans-serif;
  --tab-on-bg: linear-gradient(180deg,#4d8cf5,#1b5bd4); --tab-on-ink:#fff;
  --win-border:1px solid #0831d9; --win-radius:8px 8px 3px 3px;
  --win-shadow: 0 4px 14px rgba(0,0,30,.35);
  --tt-bg: linear-gradient(180deg,#0997ff,#0053ee 8%,#0050ee 40%,#06f 88%,#003dd7 93%,#0997ff);
  --tt-ink:#fff; --tt-shadow: 1px 1px 1px rgba(0,0,40,.6);
  --wb-bg: linear-gradient(180deg,#7ba2e7,#3d6fe0 50%,#2a54c4); --wb-ink:#fff; --wb-border:1px solid #fff;
  --work-bg: linear-gradient(180deg,#f4e3c2,#ece9d8 60px); --work-top:3px solid #c8881a;
  --work-ink:#1a1a1a; --cell-off: linear-gradient(180deg,#fff,#e8e2d4);
  --cell-border: 1px solid #aca899; --cell-off-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #fff;
  --led-off:#c3bfae; --lcd-bg:#ece9d8; --lcd-ink:#6f6d64; --lcd-dim:#9a968a;
  --lcd-border:1px solid #d6d2c2;""" + ROWHUES_STD + """
}
.s-luna .flag { border:1px dashed #aca899; border-radius:3px; padding:3px 7px; }
"""))

V.append(('luna2', 'Luna resserrée', 'même langue, densité corrigée', """
.s-luna2 {
  --bg: """ + BLISS + """; --surf: linear-gradient(180deg,#fdfcf7,#ece9d8 60%);
  --surf2: linear-gradient(180deg,#fff,#ece9d8 45%,#d6d2c2);
  --edge:#aca899; --ink:#1a1a1a; --muted:#6f6d64; --radius:3px;
  --bevel: inset -1px -1px 0 #808080, inset 1px 1px 0 #fff;
  --bar-pad: 0 6px; --bar-gap: 0;
  --font: Tahoma,'DejaVu Sans',sans-serif; --font-menu: 12px Tahoma,'DejaVu Sans',sans-serif;
  --font-flag: 10px Tahoma,'DejaVu Sans',sans-serif; --font-btn: 700 13px Tahoma,'DejaVu Sans',sans-serif;
  --font-bpm: 700 15px Tahoma,'DejaVu Sans',sans-serif; --font-small: 9px Tahoma,'DejaVu Sans',sans-serif;
  --font-tab: 12px Tahoma,'DejaVu Sans',sans-serif; --font-title: 700 12px Tahoma,'DejaVu Sans',sans-serif;
  --font-ruler: 10px Tahoma,'DejaVu Sans',sans-serif; --font-tag: 700 11px Tahoma,'DejaVu Sans',sans-serif;
  --font-lcd: 10px Tahoma,'DejaVu Sans',sans-serif; --font-tempo: 12px Tahoma,'DejaVu Sans',sans-serif;
  --tab-on-bg: linear-gradient(180deg,#4d8cf5,#1b5bd4); --tab-on-ink:#fff;
  --win-border:1px solid #0831d9; --win-radius:6px 6px 3px 3px;
  --win-shadow: 0 4px 14px rgba(0,0,30,.35);
  --tt-bg: linear-gradient(180deg,#0997ff,#0053ee 8%,#0050ee 40%,#06f 88%,#003dd7 93%,#0997ff);
  --tt-ink:#fff; --tt-shadow: 1px 1px 1px rgba(0,0,40,.6);
  --wb-bg: linear-gradient(180deg,#7ba2e7,#3d6fe0 50%,#2a54c4); --wb-ink:#fff; --wb-border:1px solid #fff;
  --work-bg: linear-gradient(180deg,#f4e3c2,#ece9d8 60px); --work-top:3px solid #c8881a;
  --work-ink:#1a1a1a; --cell-off: linear-gradient(180deg,#fff,#e8e2d4);
  --cell-border: 1px solid #aca899; --cell-off-shadow: inset -1px -1px 0 #808080, inset 1px 1px 0 #fff;
  --led-off:#c3bfae; --lcd-bg:#ece9d8; --lcd-ink:#6f6d64; --lcd-dim:#9a968a;
  --lcd-border:1px solid #d6d2c2;""" + ROWHUES_STD + """
}
/* Zones cliquables jointives, comme dans un vrai menu Windows : c'est ça qui
   fait passer la barre de 72 à 40px, pas un rétrécissement de la police. */
.s-luna2 .bar .m { padding: 7px 9px; }
.s-luna2 .bar .ic { width: 26px; height: 22px; border-color: transparent; background: none; }
.s-luna2 .flag { color:#4c6ea8; }
"""))

V.append(('aqua', 'Aqua', 'revival Y2K 2026', """
.s-aqua {
  --bg: radial-gradient(120% 70% at 15% 0%, #3aa8ff 0%, rgba(58,168,255,0) 55%),
        radial-gradient(110% 60% at 90% 8%, #7b5bff 0%, rgba(123,91,255,0) 50%),
        linear-gradient(180deg,#0b3f8f,#061a4a 55%,#030d28);
  --surf: linear-gradient(180deg, rgba(255,255,255,.3), rgba(255,255,255,.12) 45%, rgba(255,255,255,.07));
  --surf2: linear-gradient(180deg,#fff,#bcd9f5 55%,#7fb0e6);
  --edge: rgba(255,255,255,.4); --ink:#f2f7ff; --muted:#b9d2f2; --radius:12px;
  --bevel: 0 6px 18px rgba(0,10,50,.4), inset 0 1px 0 rgba(255,255,255,.7);
  --bar-radius: 999px; --bar-pad: 7px 14px;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif; --font-menu: 600 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-flag: 9.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --font-btn: 700 14px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-bpm: 700 16px 'Helvetica Neue','DejaVu Sans',sans-serif; --font-small: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 600 12px 'Helvetica Neue','DejaVu Sans',sans-serif; --font-title: 700 13px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif; --font-tag: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-lcd: 10.5px 'Helvetica Neue','DejaVu Sans',sans-serif; --font-tempo: 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-radius: 999px; --btn-ink:#06214d; --btn-bg: linear-gradient(180deg,#fff,#c9e0f7 55%,#8ab9ec);
  --play-bg: linear-gradient(180deg,#8ef07a,#2fbf4a 55%,#159a34); --play-ink:#06214d;
  --tab-radius: 999px; --tab-bg: rgba(255,255,255,.1); --tab-ink:#b9d2f2;
  --tab-border: 1px solid rgba(255,255,255,.25); --tab-shadow: none;
  --tab-on-bg: linear-gradient(180deg,#e8f4ff,#9ccdff 55%,#5aa6ee); --tab-on-ink:#06214d;
  --win-radius:14px; --win-border:1px solid rgba(255,255,255,.4);
  --win-shadow: 0 8px 24px rgba(0,10,50,.5);
  --tt-bg: linear-gradient(180deg, rgba(255,255,255,.32), rgba(255,255,255,.12)); --tt-ink:#eaf3ff;
  --wb-bg: rgba(255,255,255,.2); --wb-ink:#fff; --wb-border:1px solid rgba(255,255,255,.45);
  --work-bg: rgba(4,14,44,.42); --work-ink:#eaf3ff;
  --cell-radius: 8px; --cell-off: rgba(255,255,255,.08);
  --cell-border: 1px solid rgba(255,255,255,.2);
  --cell-off-shadow: inset 0 2px 5px rgba(0,10,40,.5);
  --cell-on-shadow: 0 0 14px var(--h), inset 0 1px 0 rgba(255,255,255,.8);
  --led-off:#3d5versa; --led-off:#40608c;
  --lcd-bg: rgba(4,14,44,.55); --lcd-ink:#b9d2f2; --lcd-dim:#7fa3d0; --lcd-radius:10px;
  --lcd-border:1px solid rgba(255,255,255,.22);
  --slider-bg: rgba(255,255,255,.14); --knob-bg: linear-gradient(180deg,#fff,#8ab9ec);
  --c-kick:#ff4d3d; --c-snare:#ffb01f; --c-hat:#25e0d8; --c-clap:#4ff06a; --c-shaker:#43b6ff;
}
.s-aqua .flag { background: rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.35);
  padding:3px 9px; border-radius:999px; }
"""))

V.append(('system7', 'System 7', 'Macintosh, 1991', """
.s-system7 {
  --bg: #8c8c8c; --surf:#fff; --surf2:#fff; --edge:#000; --ink:#000; --muted:#555;
  --radius:0; --bevel: none; --bar-pad: 3px 8px; --bar-gap: 16px;
  --bar-border: 0; --bar-shadow: 0 1px 0 #000;
  --font: Geneva,Verdana,'DejaVu Sans',sans-serif; --font-menu: 12px Geneva,Verdana,'DejaVu Sans',sans-serif;
  --font-flag: 10px Geneva,Verdana,'DejaVu Sans',sans-serif; --font-btn: 12px Geneva,Verdana,'DejaVu Sans',sans-serif;
  --font-bpm: 700 14px Geneva,Verdana,'DejaVu Sans',sans-serif; --font-small: 9px Geneva,Verdana,'DejaVu Sans',sans-serif;
  --font-tab: 12px Geneva,Verdana,'DejaVu Sans',sans-serif; --font-title: 700 12px Geneva,Verdana,'DejaVu Sans',sans-serif;
  --font-ruler: 9px Geneva,Verdana,'DejaVu Sans',sans-serif; --font-tag: 700 10px Geneva,Verdana,'DejaVu Sans',sans-serif;
  --font-lcd: 10px Geneva,Verdana,'DejaVu Sans',sans-serif; --font-tempo: 11px Geneva,Verdana,'DejaVu Sans',sans-serif;
  --btn-radius: 6px; --btn-shadow: 2px 2px 0 rgba(0,0,0,.85);
  --tab-shadow: 1px 1px 0 rgba(0,0,0,.8); --tab-on-bg:#000; --tab-on-ink:#fff;
  --win-shadow: 3px 3px 0 rgba(0,0,0,.85);
  --tt-bg: repeating-linear-gradient(180deg,#000 0 1px,#fff 1px 3px); --tt-ink:#000;
  --wb-bg:#fff; --work-bg:#fff; --work-ink:#000; --work-top:1px solid #000;
  --cell-off:#fff; --cell-border:1px solid #000; --led-off:#bbb;
  --lcd-bg:#fff; --lcd-ink:#555; --lcd-dim:#999; --lcd-border:1px solid #000;
  --c-kick:#000; --c-snare:#555; --c-hat:#000; --c-clap:#555; --c-shaker:#000;
}
/* Le Mac de 1991 n'a pas la couleur : la ligne se distingue par sa TRAME,
   pas par sa teinte. C'est la contrainte de l'époque, et elle tient. */
.s-system7 .row:nth-child(2) .cells i.on { background: #000; }
.s-system7 .row:nth-child(3) .cells i.on { background: repeating-linear-gradient(45deg,#000 0 2px,#fff 2px 4px); }
.s-system7 .row:nth-child(4) .cells i.on { background: repeating-linear-gradient(0deg,#000 0 1px,#fff 1px 3px); }
.s-system7 .tt .t { background:#fff; padding:0 5px; }
.s-system7 .tt .tic { background:#fff; }
"""))

V.append(('amiga', 'Workbench', 'Amiga — la machine des trackers', """
.s-amiga {
  --bg:#0055aa; --surf:#aaaaaa; --surf2:#aaaaaa; --edge:#000; --ink:#000; --muted:#333;
  --radius:0; --bevel: inset 1px 1px 0 #fff, inset -1px -1px 0 #555;
  --bar-pad: 4px 8px; --bar-gap: 15px; --bar-border: 0; --bar-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #555;
  --font: 'Courier New','DejaVu Sans Mono',monospace;
  --font-menu: 700 11px 'Courier New','DejaVu Sans Mono',monospace;
  --font-flag: 700 9px 'Courier New','DejaVu Sans Mono',monospace;
  --font-btn: 700 13px 'Courier New','DejaVu Sans Mono',monospace;
  --font-bpm: 700 15px 'Courier New','DejaVu Sans Mono',monospace;
  --font-small: 9px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tab: 700 11px 'Courier New','DejaVu Sans Mono',monospace;
  --font-title: 700 12px 'Courier New','DejaVu Sans Mono',monospace;
  --font-ruler: 9px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tag: 700 10px 'Courier New','DejaVu Sans Mono',monospace;
  --font-lcd: 10px 'Courier New','DejaVu Sans Mono',monospace;
  --font-tempo: 11px 'Courier New','DejaVu Sans Mono',monospace;
  --tab-on-bg:#0055aa; --tab-on-ink:#fff; --tab-on-shadow: inset -1px -1px 0 #fff, inset 1px 1px 0 #555;
  --win-border:0; --win-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #555, 3px 3px 0 rgba(0,0,0,.4);
  --tt-bg:#0055aa; --tt-ink:#fff; --wb-bg:#aaa; --wb-border:0;
  --work-bg:#aaaaaa; --work-ink:#000;
  --cell-off:#8d8d8d; --cell-off-shadow: inset 1px 1px 0 #555, inset -1px -1px 0 #bbb;
  --cell-on-shadow: inset 1px 1px 0 #fff, inset -1px -1px 0 #555;
  --led-off:#777; --lcd-bg:#000; --lcd-ink:#ff8800; --lcd-dim:#8a4b00;
  --c-kick:#ff8800; --c-snare:#ffffff; --c-hat:#0055aa; --c-clap:#00aa55; --c-shaker:#aa00aa;
}
.s-amiga .flag { color:#ff8800; }
"""))

V.append(('motif', 'Motif', 'stations Unix, gris et angles', """
.s-motif {
  --bg:#6b7b8c; --surf:#b8c0c8; --surf2:#b8c0c8; --edge:#5d666f; --ink:#10161c; --muted:#3c4650;
  --radius:0; --bevel: inset 2px 2px 0 #e2e8ee, inset -2px -2px 0 #5d666f;
  --bar-pad: 4px 7px; --bar-gap: 4px; --bar-border: 0;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-flag: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-btn: 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-bpm: 700 15px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-small: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-title: 700 12px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-lcd: 10px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tempo: 11px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --btn-border: 0; --btn-pad: 9px 14px;
  --tab-border: 0; --tab-on-bg:#8f99a3; --tab-on-ink:#10161c;
  --tab-on-shadow: inset -2px -2px 0 #e2e8ee, inset 2px 2px 0 #5d666f;
  --win-border:0; --win-shadow: inset 2px 2px 0 #e2e8ee, inset -2px -2px 0 #5d666f;
  --tt-bg:#8f99a3; --tt-ink:#10161c; --wb-bg:#b8c0c8; --wb-border:0;
  --work-bg:#9aa4ae; --work-ink:#10161c;
  --cell-off:#7d8892; --cell-off-shadow: inset 2px 2px 0 #5d666f, inset -2px -2px 0 #aeb8c2;
  --cell-on-shadow: inset 2px 2px 0 rgba(255,255,255,.4);
  --led-off:#6b7681; --lcd-bg:#10161c; --lcd-ink:#9fd0a0; --lcd-dim:#4a6a4b;
  --c-kick:#c0392b; --c-snare:#b8860b; --c-hat:#2b7a7a; --c-clap:#3d8b4a; --c-shaker:#2b6d8b;
}
.s-motif .bar .m { padding: 3px 9px; }
.s-motif .flag { margin-left: 6px; }
"""))

V.append(('tui', 'Turbo', 'menus texte, lettre d’accès', """
.s-tui {
  --bg:#0000aa; --surf:#aaaaaa; --surf2:#aaaaaa; --edge:#000; --ink:#000; --muted:#333;
  --radius:0; --bevel: none; --bar-pad: 3px 8px; --bar-gap: 14px; --bar-border:0;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 12px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-flag: 11px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 12px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-bpm: 700 14px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 12px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-title: 12px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-ruler: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 11px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-lcd: 11px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 11px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-shadow: 2px 1px 0 rgba(0,0,0,.5); --btn-pad: 8px 12px;
  --tab-shadow: 2px 1px 0 rgba(0,0,0,.5); --tab-on-bg:#000; --tab-on-ink:#55ff55;
  --win-shadow: 4px 2px 0 rgba(0,0,0,.45); --tt-bg:#000; --tt-ink:#55ffff;
  --wb-bg:#aaa; --wb-ink:#000; --work-bg:#0000aa; --work-ink:#aaa;
  --ruler-ink:#55ffff; --ruler-line: 1px solid #5555aa;
  --cell-off:#000055; --cell-border:1px solid #000; --led-off:#333366;
  --lcd-bg:#000; --lcd-ink:#55ff55; --lcd-dim:#00aa00;
  --c-kick:#ff5555; --c-snare:#ffff55; --c-hat:#55ffff; --c-clap:#55ff55; --c-shaker:#5555ff;
  --c-bass:#5555ff; --c-pad:#ff55ff; --c-melody:#ffffff;
  --label-ink:#aaaaaa; --legend-ink:#55ffff; --pill-ink:#aaaaaa;
  --pill-border:1px solid #5555aa; --sel-bg:#aaaaaa; --sel-ink:#000; --sel-border:1px solid #000;
  --chk-on-bg:#000; --chk-on-ink:#55ff55; --chk-on-edge:#000;
}
.s-tui .flag { background:#55ffff; padding:1px 6px; color:#000; }
.s-tui .tempo, .s-tui .transport, .s-tui .bar { border:1px solid #000; }
"""))

V.append(('amp', 'Amp', 'la langue du Mode Live', """
.s-amp {
  --bg: """ + BLISS + """; --surf:#ece9d8; --surf2: linear-gradient(180deg,#fff,#ece9d8 45%,#d6d2c2);
  --edge:#aca899; --ink:#1a1a1a; --muted:#6f6d64; --radius:3px;
  --bevel: inset -1px -1px 0 #808080, inset 1px 1px 0 #fff;
  --bar-bg: linear-gradient(180deg,#6a6a9c,#3a3a64 14%,#1c1c34); --bar-border:1px solid #0a0a18;
  --bar-shadow: inset 0 1px 0 #9a9ad0; --bar-pad: 6px 8px; --bar-gap: 11px;
  --font: Tahoma,'DejaVu Sans',sans-serif;
  --font-menu: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.12em; --menu-tf: uppercase;
  --font-flag: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 700 14px Tahoma,'DejaVu Sans',sans-serif;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 12px Tahoma,'DejaVu Sans',sans-serif;
  --font-title: 700 13px Tahoma,'DejaVu Sans',sans-serif;
  --font-ruler: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-lcd: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 12px Tahoma,'DejaVu Sans',sans-serif;
  --tab-on-bg: linear-gradient(180deg,#4d8cf5,#1b5bd4); --tab-on-ink:#fff;
  --win-border:1px solid #0831d9; --win-radius:8px 8px 3px 3px;
  --win-shadow: 0 4px 14px rgba(0,0,30,.35);
  --tt-bg: linear-gradient(180deg,#0997ff,#0053ee 8%,#0050ee 40%,#06f 88%,#003dd7 93%,#0997ff);
  --tt-ink:#fff; --tt-shadow: 1px 1px 1px rgba(0,0,40,.6);
  --wb-bg: linear-gradient(180deg,#7ba2e7,#3d6fe0 50%,#2a54c4); --wb-ink:#fff; --wb-border:1px solid #fff;
  --work-bg: linear-gradient(180deg,#6a6a9c,#3a3a64 12%,#1c1c34); --work-top:1px solid #9a9ad0;
  --work-ink:#cfd0f0; --ruler-ink:#ffb020; --ruler-line:1px solid rgba(255,176,32,.4);
  --cell-off:#050806; --cell-off-shadow: inset 0 1px 2px rgba(0,0,0,.9);
  --cell-on-shadow: 0 0 7px var(--h), inset 0 1px 0 rgba(255,255,255,.35);
  --led-off:#2a2a40; --lcd-bg:#050806; --lcd-ink:#33ff44; --lcd-dim:#145520;""" + ROWHUES_STD + """
}
.s-amp .bar .m { color:#cfd0f0; }
.s-amp .bar .ic { border-color:#9a9ad0; background: linear-gradient(180deg,#9a9ad0,#3a3a64 55%,#1c1c34); color:#cfd0f0; }
.s-amp .flag { color:#33ff44; background:#050806; padding:3px 7px; border-radius:2px; }
"""))

V.append(('skin', 'Skin', 'Winamp', """
.s-skin {
  --bg:#14141c; --surf: linear-gradient(180deg,#8a8aa4,#4a4a5e 52%,#2c2c38);
  --surf2: linear-gradient(180deg,#8a8aa4,#3c3c4a); --edge:#101018; --ink:#e6e6ff; --muted:#9a9ab0;
  --radius:0; --bevel: inset 1px 1px 0 #9a9ab0, inset -1px -1px 0 #101018;
  --bar-pad: 4px 6px; --bar-gap: 8px; --bar-border:0;
  --font: ui-monospace,'DejaVu Sans Mono',monospace;
  --font-menu: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --menu-ls:.1em; --menu-tf: uppercase;
  --font-flag: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-btn: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --btn-ls:.1em; --btn-tf: uppercase;
  --font-bpm: 700 16px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tab: 700 10px ui-monospace,'DejaVu Sans Mono',monospace; --tab-ls:.1em; --tab-tf: uppercase;
  --font-title: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tt-ls:.18em; --tt-tf: uppercase;
  --font-ruler: 9px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tag: 700 9px ui-monospace,'DejaVu Sans Mono',monospace; --tag-ls:.14em;
  --font-lcd: 9.5px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --btn-border:0; --btn-pad: 10px 12px;
  --tab-border:0; --tab-on-bg: linear-gradient(180deg,#3a3a8c,#26266e); --tab-on-ink:#ffb020;
  --tab-on-shadow: inset 1px 1px 0 #101018;
  --win-border:0; --win-shadow: inset 1px 1px 0 #9a9ab0, inset -1px -1px 0 #101018;
  --tt-bg: linear-gradient(180deg,#5a5ad0,#3232a0 45%,#26266e 55%,#3a3a8c); --tt-ink:#e6e6ff;
  --wb-bg: linear-gradient(180deg,#8a8aa4,#3c3c4a); --wb-border:0;
  --work-bg:#2c2c38; --work-ink:#cfd0e4; --ruler-ink:#ffb020; --ruler-line:1px solid #4a4a5e;
  --cell-off:#050806; --cell-off-shadow: inset 1px 1px 0 #101018, inset -1px -1px 0 rgba(255,255,255,.1);
  --cell-on-shadow: inset 1px 1px 0 rgba(255,255,255,.4);
  --led-off:#3c3c4a; --lcd-bg:#050806; --lcd-ink:#33ff44; --lcd-dim:#145520;
  --c-kick:#ff5a2b; --c-snare:#ffb020; --c-hat:#33d9d6; --c-clap:#5bde72; --c-shaker:#41c9ef;
}
.s-skin .flag { color:#33ff44; background:#050806; padding:3px 6px; box-shadow: inset 1px 1px 0 #101018; }
"""))

V.append(('tr808', 'Rhythm Composer', 'Roland TR-808', """
.s-tr808 {
  --bg: linear-gradient(100deg,#7d5433,#4e3018 60%,#6b4425);
  --surf: linear-gradient(180deg,#e8e3d6,#d8d2c3 8%,#d8d2c3 92%,#b9b3a3);
  --surf2: linear-gradient(180deg,#f4f0e5,#cfc9b9); --edge:#8d8779; --ink:#23211c; --muted:#6d675a;
  --radius:2px; --bevel: inset 0 1px 0 #fff, 0 1px 2px rgba(0,0,0,.25);
  --bar-bg:#1c1a17; --bar-border:0; --bar-shadow: 0 2px 0 #cf3b23; --bar-pad: 8px 10px; --bar-gap: 15px;
  --font: 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-menu: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --menu-ls:.18em; --menu-tf: uppercase;
  --font-flag: 8px 'Helvetica Neue','DejaVu Sans',sans-serif; --flag-ls:.16em;
  --font-btn: 700 12px 'Helvetica Neue','DejaVu Sans',sans-serif; --btn-ls:.1em; --btn-tf: uppercase;
  --font-bpm: 700 15px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-small: 8px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tab: 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --tab-ls:.1em; --tab-tf: uppercase;
  --font-title: 700 11px 'Helvetica Neue','DejaVu Sans',sans-serif; --tt-ls:.16em; --tt-tf: uppercase;
  --font-ruler: 9px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --font-tag: 700 10px 'Helvetica Neue','DejaVu Sans',sans-serif; --tag-ls:.12em;
  --font-lcd: 10px ui-monospace,'DejaVu Sans Mono',monospace;
  --font-tempo: 11px 'Helvetica Neue','DejaVu Sans',sans-serif;
  --tab-on-bg:#1c1a17; --tab-on-ink:#efeade;
  --tt-bg:#1c1a17; --tt-ink:#efeade; --wb-bg: linear-gradient(180deg,#f4f0e5,#cfc9b9); --wb-ink:#23211c;
  --work-bg:#d8d2c3; --work-ink:#23211c; --ruler-line:1px solid #b0aa9a;
  --cell-off:#c3bdae; --cell-border:1px solid #8d8779;
  --cell-off-shadow: inset 0 2px 3px rgba(0,0,0,.28);
  --cell-on-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 0 6px rgba(255,90,40,.45);
  --led-off:#8d8779; --lcd-bg:#2a2f22; --lcd-ink:#b6d36a; --lcd-dim:#5c6b3a;
  --c-kick:#cf3b23; --c-snare:#e0761c; --c-hat:#e6bc21; --c-clap:#8a9a4a; --c-shaker:#a08a6a;
}
.s-tr808 .bar .m { color:#efeade; }
.s-tr808 .bar .ic { border-color:#6d675a; }
.s-tr808 .flag { color:#a9a294; }
/* Signature 808 : les pas sont colorés par groupe de temps, pas par ligne.
   La couleur dit OÙ on est dans la mesure ; l'état dit la matière. */
.s-tr808 .cells i:nth-child(4n+1).on { background:#cf3b23; }
.s-tr808 .cells i:nth-child(4n+2).on { background:#e0761c; }
.s-tr808 .cells i:nth-child(4n+3).on { background:#e6bc21; }
.s-tr808 .cells i:nth-child(4n+4).on { background:#efeade; }
"""))
