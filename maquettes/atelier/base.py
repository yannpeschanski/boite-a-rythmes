# -*- coding: utf-8 -*-
"""Base structurelle des 20 écrans d'Atelier complets.
La STRUCTURE et le CONTENU sont identiques partout — barre de menus (5 menus,
outils, drapeau d'accès), transport, onglets, fenêtre séquenceur à 5 lignes,
bandeau tempo. Chaque variante ne fournit que des tokens de couleur/typo, plus
quelques extras quand sa langue a une particularité structurelle (vis du rack,
trame de points de l'afficheur, filet de la jaquette…).
"""

ROWS = [
    ('KICK', 'kick', [1, 0, 1, 0]),
    ('SNARE', 'snare', [0, 1, 0, 1]),
    ('HAT', 'hat', [1, 1, 1, 1, 1, 1, 1, 1]),
    ('CLAP', 'clap', [0, 0, 0, 0]),
    ('SHAKER', 'shaker', [0, 0, 0, 0, 0, 0, 0, 0]),
]

def rows_html():
    out = []
    for name, key, pat in ROWS:
        live = any(pat)
        cells = ''.join('<i class="%s"></i>' % ('on' if v else '') for v in pat)
        out.append(
            '<div class="row" style="--h:var(--c-%s)">'
            '<span class="tag"><i class="led%s"></i>%s</span>'
            '<span class="cells">%s</span></div>' % (key, '' if live else ' off', name, cells))
    return '\n        '.join(out)

def screen(key):
    return '''<div class="screen s-%s">
  <div class="bar">
    <button class="m">Mode</button><button class="m">Fichier</button><button class="m">Édition</button><button class="m">Affichage</button><button class="m">Aide</button>
    <span class="tools"><button class="ic">↶</button><button class="ic">↷</button></span>
    <span class="flag">🔒 accès total</span>
  </div>
  <div class="transport">
    <button class="btn play">▶ Lecture</button><button class="btn">🫨 Break</button>
    <span class="bpm">120<small>BPM</small></span>
  </div>
  <div class="tabs"><button class="tab on">🥁 Rythme</button><button class="tab">🎹 Synthé</button><button class="tab">🎚 Production</button></div>
  <div class="win">
    <div class="tt"><span class="tic">🥁</span><span class="t">Séquenceur</span><button class="wb">⌄</button></div>
    <div class="work">
      <div class="ruler"><span>1</span><span>2</span><span>3</span><span>4</span></div>
      %s
      <div class="lcd"><span>KICK · TON 42 · DÉCLIN 220</span><span class="dim">RÉV 12 %%</span></div>
    </div>
  </div>
  <div class="tempo"><span class="tl">Tempo</span><span class="slider"><i></i></span><b>120</b></div>
</div>''' % (key, rows_html())

# ------------------------------------------------------------------ CSS de base
BASE = """
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #202429; padding: 20px; display: flex; flex-wrap: wrap; gap: 24px;
       font-family: system-ui, sans-serif; }
.cell { width: 390px; }
.cap { color: #eef1f4; margin-bottom: 9px; }
.cap b { font: 700 13px system-ui; letter-spacing: .1em; text-transform: uppercase; }
.cap span { display: block; font-size: 12px; color: #98a0aa; margin-top: 2px; }

/* ---- structure commune, sans une seule couleur ---- */
.screen {
  --c-bass: var(--c-hat); --c-pad: var(--c-clap); --c-melody: var(--c-snare);
  --font-field: var(--font-tempo);
  --font-pill: var(--font-tag);
  --font-legend: var(--font-tag);
  --font-deg: var(--font-lcd);
  width: 390px; height: 844px; overflow: hidden; padding: var(--pad, 10px 9px);
  background: var(--bg); color: var(--ink); font-family: var(--font);
  display: flex; flex-direction: column; gap: var(--gap, 9px); }

.bar { display: flex; align-items: center; flex-wrap: wrap; row-gap: 4px;
  gap: var(--bar-gap, 13px); padding: var(--bar-pad, 5px 8px);
  background: var(--bar-bg, var(--surf)); border: var(--bar-border, 1px solid var(--edge));
  border-radius: var(--bar-radius, var(--radius)); box-shadow: var(--bar-shadow, var(--bevel)); }
.bar .m { border: 0; background: none; font: var(--font-menu); color: var(--ink);
  letter-spacing: var(--menu-ls, 0); text-transform: var(--menu-tf, none); cursor: default; }
.tools { display: flex; gap: 4px; margin-left: auto; }
.bar .ic { width: 28px; height: 24px; display: grid; place-items: center; line-height: 1;
  border: var(--ic-border, 1px solid var(--edge)); border-radius: var(--radius);
  background: var(--ic-bg, var(--surf2)); color: var(--ink); font-size: 13px; cursor: default;
  box-shadow: var(--ic-shadow, none); }
.flag { margin-left: 8px; white-space: nowrap; font: var(--font-flag); color: var(--muted);
  letter-spacing: var(--flag-ls, .04em); }

.transport { display: flex; align-items: center; gap: 8px; padding: var(--pan-pad, 7px 9px);
  background: var(--pan-bg, var(--surf)); border: var(--pan-border, 1px solid var(--edge));
  border-radius: var(--radius); box-shadow: var(--bevel); }
.btn { font: var(--font-btn); color: var(--btn-ink, var(--ink)); padding: var(--btn-pad, 10px 14px);
  border: var(--btn-border, 1px solid var(--edge)); border-radius: var(--btn-radius, var(--radius));
  background: var(--btn-bg, var(--surf2)); box-shadow: var(--btn-shadow, var(--bevel));
  letter-spacing: var(--btn-ls, 0); text-transform: var(--btn-tf, none); cursor: default; }
.btn.play { background: var(--play-bg, var(--btn-bg, var(--surf2))); color: var(--play-ink, var(--btn-ink, var(--ink))); }
.bpm { margin-left: auto; font: var(--font-bpm); color: var(--bpm-ink, var(--ink));
  display: flex; align-items: baseline; gap: 4px; }
.bpm small { font: var(--font-small); color: var(--muted); }

.tabs { display: flex; gap: var(--tab-gap, 5px); padding: var(--tabs-pad, 0);
  background: var(--tabs-bg, transparent); }
.tab { flex: 1; text-align: center; font: var(--font-tab); padding: var(--tab-pad, 9px 3px);
  border: var(--tab-border, 1px solid var(--edge)); border-radius: var(--tab-radius, var(--radius));
  background: var(--tab-bg, var(--surf2)); color: var(--tab-ink, var(--ink));
  box-shadow: var(--tab-shadow, var(--bevel)); letter-spacing: var(--tab-ls, 0);
  text-transform: var(--tab-tf, none); cursor: default; }
.tab.on { background: var(--tab-on-bg); color: var(--tab-on-ink); font-weight: 700;
  border-color: var(--tab-on-edge, var(--edge)); box-shadow: var(--tab-on-shadow, none); }

.win { border: var(--win-border, 1px solid var(--edge)); border-radius: var(--win-radius, var(--radius));
  overflow: hidden; box-shadow: var(--win-shadow, none); }
.tt { display: flex; align-items: center; gap: 6px; padding: var(--tt-pad, 4px 6px);
  background: var(--tt-bg); color: var(--tt-ink); font: var(--font-title);
  letter-spacing: var(--tt-ls, 0); text-transform: var(--tt-tf, none);
  text-shadow: var(--tt-shadow, none); }
.tt .t { flex: 1; }
.tt .wb { width: 24px; height: 22px; border: var(--wb-border, 1px solid var(--edge));
  border-radius: var(--radius); background: var(--wb-bg, var(--surf2)); color: var(--wb-ink, var(--ink));
  font-size: 12px; cursor: default; }
.tt .tic { font-size: 14px; }

.work { padding: var(--work-pad, 9px); background: var(--work-bg);
  border-top: var(--work-top, 0); color: var(--work-ink); }
.ruler { display: flex; margin: 0 0 6px calc(var(--tag-w, 60px) + 8px); }
.ruler span { flex: 1; font: var(--font-ruler); color: var(--ruler-ink, var(--muted));
  border-left: var(--ruler-line, 1px solid var(--edge)); padding-left: 4px; letter-spacing: .08em; }

.row { display: flex; align-items: center; gap: 8px; margin-bottom: var(--row-gap, 6px); }
.tag { width: var(--tag-w, 60px); flex: none; display: flex; align-items: center; gap: 5px;
  font: var(--font-tag); color: var(--tag-ink, var(--h)); letter-spacing: var(--tag-ls, .1em);
  text-transform: var(--tag-tf, none); }
.led { width: 7px; height: 7px; border-radius: 50%; flex: none; background: var(--h);
  box-shadow: 0 0 5px var(--h); }
.led.off { background: var(--led-off, #999); box-shadow: none; }
.cells { flex: 1; display: flex; gap: var(--cell-gap, 3px); height: var(--cell-h, 38px); }
.cells i { flex: 1; border-radius: var(--cell-radius, 2px); background: var(--cell-off);
  border: var(--cell-border, 0); box-shadow: var(--cell-off-shadow, none); }
.cells i.on { background: var(--h); border-color: var(--h);
  box-shadow: var(--cell-on-shadow, none); }

.lcd { margin-top: 7px; padding: var(--lcd-pad, 5px 7px); background: var(--lcd-bg);
  color: var(--lcd-ink); border-radius: var(--lcd-radius, 3px); font: var(--font-lcd);
  letter-spacing: var(--lcd-ls, .06em); display: flex; justify-content: space-between;
  border: var(--lcd-border, 0); }
.lcd .dim { color: var(--lcd-dim); }

.tempo { display: flex; align-items: center; gap: 10px; padding: var(--pan-pad, 7px 9px);
  background: var(--pan-bg, var(--surf)); border: var(--pan-border, 1px solid var(--edge));
  border-radius: var(--radius); box-shadow: var(--bevel); font: var(--font-tempo); }
.tempo .tl { color: var(--muted); }
/* Règle générique : la glissière n'était stylée que dans le bandeau tempo, si
   bien que celles des écrans Synthé, Production et Live ne se voyaient pas. */
.slider { flex: 1; height: 6px; border-radius: 3px; background: var(--slider-bg, var(--surf2));
  border: var(--slider-border, 1px solid var(--edge)); position: relative; }
.slider i { position: absolute; left: 42%; top: -5px; width: 13px; height: 15px;
  border-radius: var(--radius); background: var(--knob-bg, var(--surf2));
  border: var(--knob-border, 1px solid var(--edge)); box-shadow: var(--bevel); }
.tempo b { font-variant-numeric: tabular-nums; }
"""


# ============================================================ écran Synthé
# Deuxième écran, volontairement le plus dense de l'appli : c'est celui qui
# contient les contrôles de formulaire (menus déroulants, cases à cocher,
# cadres, curseurs numérotés) qu'aucune des 29 premières maquettes ne montrait
# — et c'est exactement là qu'un habillage lourd casse.

SYNTH_ROWS = [
    ('BASSE', 'bass', [1, 0, 0, 1], '808 profond', ['Séquence', 'Timbre', 'Détune', 'Filtre']),
    ('NAPPE', 'pad', [1, 0, 1, 0], 'Rhodes chaud', ['Séquence', 'Timbre', 'Détune', 'Filtre', 'Jeu']),
    ('MÉLODIE', 'melody', [0, 1, 0, 1], 'Pluck trap', ['Séquence', 'Timbre', 'Détune', 'Filtre']),
]

def synth_rows_html():
    out = []
    for name, key, pat, voice, pills in SYNTH_ROWS:
        cells = ''.join('<i class="%s"></i>' % ('on' if v else '') for v in pat)
        chips = ''.join('<span class="pill">%s</span>' % p for p in pills)
        out.append(
            '<div class="srow" style="--h:var(--c-%s)">'
            '<div class="shead"><span class="tag"><i class="led"></i>%s</span>'
            '<button class="mini">🎹</button>'
            '<span class="sel">%s <b>▾</b></span>'
            '<button class="mini">🎲</button></div>'
            '<div class="cells">%s</div>'
            '<div class="pills">%s</div></div>' % (key, name, voice, cells, chips))
    return '\n        '.join(out)

def screen_synth(key):
    return '''<div class="screen s-%s">
  <div class="bar">
    <button class="m">Mode</button><button class="m">Fichier</button><button class="m">Édition</button><button class="m">Affichage</button><button class="m">Aide</button>
    <span class="tools"><button class="ic">↶</button><button class="ic">↷</button></span>
    <span class="flag">🔒 accès total</span>
  </div>
  <div class="transport">
    <button class="btn play">▶ Lecture</button><button class="btn">🫨 Break</button>
    <span class="bpm">120<small>BPM</small></span>
  </div>
  <div class="tabs"><button class="tab">🥁 Rythme</button><button class="tab on">🎹 Synthé</button><button class="tab">🎚 Production</button></div>
  <div class="win">
    <div class="tt"><span class="tic">🎹</span><span class="t">Synthé — Basse / Nappe / Mélodie</span><button class="wb">⌄</button></div>
    <div class="work">
      %s
      <fieldset class="fs">
        <legend>Harmonie &amp; remplissage</legend>
        <div class="frow"><label>Tonalité</label><span class="sel">Do <b>▾</b></span>
          <label>Mode</label><span class="sel">Majeur <b>▾</b></span></div>
        <div class="frow"><label>Nb d'accords</label><span class="slider"><i></i></span><span class="num">4</span>
          <span class="deg">I · IV · V · vi</span></div>
        <div class="frow"><label>Remplissage</label><span class="slider"><i style="left:62%%"></i></span><span class="num">65 %%</span></div>
        <button class="btn wide">🎲 Remplissage aléatoire harmonieux</button>
      </fieldset>
      <fieldset class="fs">
        <legend>Sidechain</legend>
        <div class="frow"><label>Déclencheurs</label>
          <span class="chk on"><i>✓</i>Kick</span><span class="chk"><i></i>Snare</span></div>
      </fieldset>
    </div>
  </div>
  <div class="tempo"><span class="tl">Tempo</span><span class="slider"><i></i></span><b>120</b></div>
</div>''' % (key, synth_rows_html())


# CSS additionnel pour l'écran Synthé — toujours sans une seule couleur en dur.
SYNTH_CSS = """
.srow { margin-bottom: var(--srow-gap, 10px); }
.shead { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.shead .tag { width: auto; }
.mini { width: 26px; height: 24px; flex: none; display: grid; place-items: center;
  border: var(--ic-border, 1px solid var(--edge)); border-radius: var(--radius);
  background: var(--ic-bg, var(--surf2)); color: var(--ink); font-size: 12px;
  box-shadow: var(--ic-shadow, none); cursor: default; }
.shead .mini:last-child { margin-left: auto; }

/* Le menu déroulant : le contrôle que les 29 premières maquettes n'avaient pas. */
.sel { display: inline-flex; align-items: center; gap: 6px; padding: var(--sel-pad, 5px 8px);
  border: var(--sel-border, 1px solid var(--edge)); border-radius: var(--sel-radius, var(--radius));
  background: var(--sel-bg, var(--white-field, var(--surf2))); color: var(--sel-ink, var(--ink));
  font: var(--font-field); white-space: nowrap; }
.sel b { font-weight: 400; opacity: .7; margin-left: auto; }
.shead .sel { flex: 1; min-width: 0; overflow: hidden; }

.pills { display: flex; gap: 4px; flex-wrap: wrap; }
.pill { font: var(--font-pill); letter-spacing: var(--pill-ls, .06em);
  text-transform: var(--pill-tf, none); padding: var(--pill-pad, 5px 9px);
  border: var(--pill-border, 1px solid var(--edge)); border-radius: var(--pill-radius, 999px);
  background: var(--pill-bg, transparent); color: var(--pill-ink, var(--muted)); }

.fs { margin-top: 10px; border: var(--fs-border, 1px solid var(--edge));
  border-radius: var(--radius); padding: var(--fs-pad, 8px 10px 10px); }
.fs legend { font: var(--font-legend); color: var(--legend-ink, var(--muted));
  letter-spacing: var(--legend-ls, .1em); text-transform: var(--legend-tf, none);
  padding: 0 5px; }
.frow { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; font: var(--font-field); }
.frow:last-of-type { margin-bottom: 0; }
.frow label { color: var(--label-ink, var(--muted)); white-space: nowrap; }
.frow .num { font-variant-numeric: tabular-nums; min-width: 34px; text-align: right;
  padding: 3px 6px; border: var(--sel-border, 1px solid var(--edge));
  background: var(--sel-bg, var(--white-field, var(--surf2))); color: var(--sel-ink, var(--ink));
  border-radius: var(--radius); }
.frow .deg { margin-left: auto; font: var(--font-deg); color: var(--label-ink, var(--muted)); white-space: nowrap; }
.btn.wide { display: block; width: 100%; margin-top: 9px; text-align: center; }

/* Case à cocher : l'autre contrôle absent des 29 premières. */
.chk { display: inline-flex; align-items: center; gap: 6px; color: var(--work-ink, var(--ink)); }
.chk i { width: 15px; height: 15px; display: grid; place-items: center; font-size: 10px;
  border: var(--sel-border, 1px solid var(--edge)); border-radius: var(--chk-radius, 2px);
  background: var(--sel-bg, var(--white-field, var(--surf2))); color: var(--chk-ink, var(--accent-ink, var(--ink))); }
.chk.on i { background: var(--chk-on-bg, var(--tab-on-bg)); color: var(--chk-on-ink, var(--tab-on-ink));
  border-color: var(--chk-on-edge, var(--edge)); }
"""
