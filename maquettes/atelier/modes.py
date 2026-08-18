# -*- coding: utf-8 -*-
"""Les quatre écrans qui ne ressemblent pas à l'Atelier, en Winamp 2.x.
C'est le test réel d'une identité : le splash, le Mode jeu, la Production et
surtout le Mode Live, qui est en PAYSAGE. Contenu repris de l'appli réelle
(App.svelte, GameView.svelte, LiveView.svelte)."""

def screen_splash(k):
    return '''<div class="screen center s-%s">
  <div class="win">
    <div class="tt"><span class="tic">🥁</span><span class="t">Boîte à rythmes</span><button class="wb">⌄</button></div>
    <div class="work" style="padding:14px 12px 16px">
      <div class="lcd" style="margin:0 0 14px"><span>UN SÉQUENCEUR RÉTRO</span><span class="dim">V.69</span></div>
      <p class="splash-lead">Un séquenceur rétro, et une campagne pour apprendre le rythme à l’oreille.</p>
      <div class="choices">
        <button class="choice"><b>🥁 ATELIER</b><span>Composer librement</span></button>
        <button class="choice"><b>🎮 MODE JEU</b><span>34 niveaux, à l’oreille</span></button>
        <button class="choice"><b>🎛 MODE LIVE</b><span>Jouer avec les doigts</span></button>
      </div>
    </div>
  </div>
</div>''' % k


def screen_game(k):
    map_cells = ''.join(
        '<i class="%s"></i>' % ('done' if i < 11 else ('cur' if i == 11 else ''))
        for i in range(24))
    grid = ''
    for name, key, pat in [('KICK','kick',[1,0,1,0]), ('SNARE','snare',[0,1,0,1]),
                           ('HAT','hat',[1,1,1,1,1,1,1,1])]:
        grid += ('<div class="row" style="--h:var(--c-%s)"><span class="tag">'
                 '<i class="led"></i>%s</span><span class="cells">%s</span></div>'
                 % (key, name, ''.join('<i class="%s"></i>' % ('on' if v else '') for v in pat)))
    return '''<div class="screen s-%s">
  <div class="gbar">
    <button class="m">👤 yann</button>
    <button class="ic wide">🗺️ CARTE</button><button class="ic wide">🎒 BESACE (3)</button>
  </div>
  <div class="win">
    <div class="tt"><span class="tic">🎮</span><span class="t">Niveau 12 — Le contretemps</span><button class="wb">⌄</button></div>
    <div class="work">
      <div class="gmap">%s</div>
      <p class="consigne">Écoute, puis repose le rythme. Le hat tombe entre les temps —
        c’est ça qu’il faut retrouver.</p>
      %s
      <div class="lcd" style="margin-top:9px"><span>ESSAI 2 / 3</span><span class="dim">RÉCOMPENSE : SHAKER</span></div>
      <div class="gfoot"><button class="btn">▶ ÉCOUTER</button><button class="btn play">✓ VALIDER</button></div>
    </div>
  </div>
  <div class="win" style="margin-top:9px">
    <div class="tt"><span class="tic">🏆</span><span class="t">Résultat</span><button class="wb">⌄</button></div>
    <div class="work" style="padding:10px">
      <p class="roast">Presque. Ton hat est sur les temps, pas entre.</p>
      <div class="lcd"><span>SCORE 2 350</span><span class="dim">MEILLEUR 3 100</span></div>
    </div>
  </div>
</div>''' % (k, map_cells, grid)


def screen_prod(k):
    seq = ''
    for name, key, bars in [('Kick','kick',[1,0,1,0]), ('Snare','snare',[0,1,0,1]),
                            ('Hat','hat',[1,1,1,1]), ('Clap','clap',[0,0,0,0]),
                            ('Shaker','shaker',[0,0,0,0]), ('Basse','bass',[1,0,0,1]),
                            ('Nappe','pad',[1,0,1,0]), ('Mélodie','melody',[0,1,0,1])]:
        seq += ('<div class="grow" style="--h:var(--c-%s)"><span class="gname">%s</span>'
                '<span class="gbars">%s</span></div>'
                % (key, name, ''.join('<i class="%s"></i>' % ('on' if b else '') for b in bars)))
    knobs = ''.join(
        '<div class="fx"><span class="fxn">%s</span><span class="slider"><i style="left:%s"></i></span>'
        '<span class="fxv">%s</span></div>' % (n, p, v)
        for n, p, v in [('SATURATION','8%','0 %'), ('COMPRESSION','8%','0 %'),
                        ('BITCRUSH','8%','0 %'), ('VOLUME','82%','100 %')])
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
  <div class="tabs"><button class="tab">🥁 Rythme</button><button class="tab">🎹 Synthé</button><button class="tab on">🎚 Production</button></div>
  <div class="win">
    <div class="tt"><span class="tic">🎼</span><span class="t">Séquenceur général</span><button class="wb">⌄</button></div>
    <div class="work" style="padding:8px">%s</div>
  </div>
  <div class="win" style="margin-top:9px">
    <div class="tt"><span class="tic">🔊</span><span class="t">Effets de bus &amp; mix</span><button class="wb">⌄</button></div>
    <div class="work" style="padding:9px">%s
      <div class="frow" style="margin-top:9px"><span class="chk on"><i>✓</i>Limiteurs de sécurité</span></div>
    </div>
  </div>
  <div class="win" style="margin-top:9px">
    <div class="tt"><span class="tic">💿</span><span class="t">Export audio</span><button class="wb">⌄</button></div>
    <div class="work" style="padding:9px">
      <div class="frow"><label>Durée</label><span class="slider"><i style="left:34%%"></i></span><span class="num">20 s</span></div>
      <div class="exp"><button class="btn">MP3</button><button class="btn">WAV</button><button class="btn">⏺ DIRECT</button></div>
    </div>
  </div>
</div>''' % (k, seq, knobs)


def screen_live(k):
    pads = ''
    for nom, sub, col in [('BREAK','Break (déclencheur)','kick'), ('FILL','Fill forcé','snare'),
                          ('MUTE K','Muet — Kick','kick'), ('MUTE S','Muet — Snare','snare'),
                          ('MUTE H','Muet — Hat','hat'), ('ROLL H×2','Rafale hat ×2','hat')]:
        pads += ('<div class="pad"><div class="padicons"><i>🔒</i><i>🎲</i><i>✏️</i></div>'
                 '<span class="paddot" style="background:var(--c-%s)"></span>'
                 '<b>%s</b><span class="padsub">%s</span></div>' % (col, nom, sub))
    seq = ''
    for key, bars in [('kick',[1,0,1,0]), ('snare',[0,1,0,1]), ('hat',[1,1,1,1]),
                      ('clap',[0,0,0,0]), ('bass',[1,0,0,1]), ('melody',[0,1,0,1])]:
        seq += ('<div class="lrow" style="--h:var(--c-%s)">%s</div>'
                % (key, ''.join('<i class="%s"></i>' % ('on' if b else '') for b in bars)))
    return '''<div class="screen land s-%s">
  <div class="ltt"><span class="lmenu">▦</span><span class="t">BOÎTE À RYTHMES — LIVE</span><span class="lwb"><i></i><i></i><i></i></span></div>
  <div class="lbar">
    <button class="btn play">▶ PLAY</button><button class="btn">⏺ REC</button>
    <span class="lbpm"><b>−</b>120 BPM · ARRÊT<b>+</b></span>
    <span class="lhint">TOUT RÉEL · ⊙ POUR RÉASSIGNER</span>
    <span class="lfader"><i style="width:50%%"></i><b>50%%</b></span>
    <button class="btn">TILT</button><button class="ic">🔀</button><button class="ic">⚙</button>
  </div>
  <div class="lseqbar"><button class="ic">‹</button><span class="lseqname">🎞 Aucune séquence</span><button class="ic">›</button></div>
  <div class="lmain">
    <div class="lpads">%s</div>
    <div class="lcenter">
      <div class="lpanel"><span class="lcap">SÉQUENCEUR</span>%s</div>
      <div class="lpanel grow"><span class="lcap">BARRES</span></div>
    </div>
    <div class="lright">
      <div class="lpanel xy"><div class="padicons abs"><i>🔒</i><i>🎲</i><i>✏️</i></div><span class="ball"></span></div>
      <div class="lfx"><span>FILTRE</span><span class="slider"><i style="left:50%%"></i></span><b>50%%</b></div>
      <div class="lfx"><span>REVERB</span><span class="slider"><i style="left:50%%"></i></span><b>50%%</b></div>
    </div>
  </div>
</div>''' % (k, pads, seq)


MODES_CSS = """
/* ---------- splash ---------- */
.screen.center { justify-content: center; }
.splash-lead { font: var(--font-field); color: var(--work-ink); opacity:.85;
  line-height:1.55; margin-bottom: 14px; }
.choices { display: grid; gap: 8px; }
.choice { text-align: left; padding: 13px 14px; border: var(--btn-border, 1px solid var(--edge));
  border-radius: var(--btn-radius, var(--radius)); background: var(--btn-bg, var(--surf2));
  box-shadow: var(--btn-shadow, var(--bevel)); color: var(--btn-ink, var(--ink)); cursor: default; }
.choice b { display: block; font: var(--font-btn); letter-spacing: var(--btn-ls, 0);
  text-transform: var(--btn-tf, none); }
.choice span { display: block; font: var(--font-pill); color: var(--muted); margin-top: 4px; }

/* ---------- mode jeu ---------- */
.gbar { display: flex; align-items: center; gap: 6px; padding: var(--bar-pad, 5px 8px);
  background: var(--bar-bg, var(--surf)); border: var(--bar-border, 1px solid var(--edge));
  border-radius: var(--bar-radius, var(--radius)); box-shadow: var(--bar-shadow, var(--bevel)); }
.gbar .m { border:0; background:none; font: var(--font-menu); color: var(--ink);
  letter-spacing: var(--menu-ls,0); text-transform: var(--menu-tf,none); }
.gbar .ic.wide { width: auto; padding: 0 9px; height: 24px; font: var(--font-pill);
  letter-spacing: .1em; }
.gbar .ic.wide:first-of-type { margin-left: auto; }
.gmap { display: grid; grid-template-columns: repeat(12, 1fr); gap: 3px; margin-bottom: 10px; }
.gmap i { height: 9px; background: var(--cell-off); box-shadow: var(--cell-off-shadow, none); }
.gmap i.done { background: var(--lcd-ink); opacity: .55; }
.gmap i.cur { background: var(--lcd-ink); box-shadow: 0 0 6px var(--lcd-ink); }
.consigne { font: var(--font-field); color: var(--work-ink); line-height: 1.5; margin-bottom: 10px; }
.gfoot { display: flex; gap: 6px; margin-top: 9px; }
.gfoot .btn { flex: 1; text-align: center; }
.roast { font: var(--font-field); color: var(--work-ink); margin-bottom: 8px; }

/* ---------- production ---------- */
.grow { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.gname { width: 58px; flex: none; font: var(--font-tag); color: var(--h);
  letter-spacing: var(--tag-ls, .1em); }
.gbars { flex: 1; display: flex; gap: 2px; height: 14px; }
.gbars i { flex: 1; background: var(--cell-off); box-shadow: var(--cell-off-shadow, none); }
.gbars i.on { background: var(--h); box-shadow: var(--cell-on-shadow, none); }
.fx { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.fxn { width: 82px; flex: none; font: var(--font-pill); color: var(--muted);
  letter-spacing: .1em; }
.fxv { width: 40px; text-align: right; font: var(--font-lcd); color: var(--lcd-ink); }
.exp { display: flex; gap: 6px; margin-top: 9px; }
.exp .btn { flex: 1; text-align: center; }

/* ---------- mode live (paysage) ---------- */
.screen.land { width: 844px; height: 390px; }
.ltt { display: flex; align-items: center; gap: 8px; padding: 3px 6px;
  background: var(--tt-bg); color: var(--tt-ink); font: var(--font-title);
  letter-spacing: var(--tt-ls, 0); text-transform: var(--tt-tf, none); }
.ltt .t { flex: 1; text-align: center; }
.ltt .lmenu { font-size: 12px; }
.ltt .lwb { display: flex; gap: 3px; }
.ltt .lwb i { width: 9px; height: 9px; background: var(--surf2); display: block;
  box-shadow: var(--bevel); }
.lbar { display: flex; align-items: center; gap: 7px; padding: 5px 6px;
  background: var(--surf); box-shadow: var(--bevel); }
.lbpm { font: var(--font-lcd); color: var(--lcd-ink); background: var(--lcd-bg);
  padding: 4px 8px; display: inline-flex; gap: 7px; align-items: center; }
.lbpm b { color: var(--muted); }
.lhint { font: var(--font-pill); color: var(--muted); letter-spacing: .08em; }
.lfader { margin-left: auto; display: inline-flex; align-items: center; gap: 6px;
  width: 96px; height: 20px; background: var(--lcd-bg); box-shadow: var(--cell-off-shadow, none);
  position: relative; }
.lfader i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--amber, #ffb020);
  opacity: .8; }
.lfader b { position: relative; margin-left: auto; padding-right: 6px; font: var(--font-lcd);
  color: var(--tt-ink); }
.lseqbar { display: flex; align-items: center; gap: 6px; padding: 4px 6px; }
.lseqname { flex: 1; text-align: center; font: var(--font-lcd); color: var(--lcd-ink);
  background: var(--lcd-bg); padding: 6px; box-shadow: var(--cell-off-shadow, none); }
.lmain { display: flex; gap: 7px; padding: 0 6px 6px; flex: 1; min-height: 0; }
.lpads { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; width: 244px; flex: none; }
.pad { position: relative; padding: 6px; background: var(--surf2); box-shadow: var(--bevel);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.padicons { position: absolute; top: 3px; right: 3px; display: flex; gap: 2px; }
.padicons.abs { top: 5px; right: 5px; }
.padicons i { font-size: 8px; opacity: .75; }
.paddot { width: 6px; height: 6px; border-radius: 50%; }
.pad b { font: var(--font-tag); letter-spacing: var(--tag-ls,.1em); color: var(--ink); }
.padsub { font: var(--font-pill); color: var(--muted); text-align: center; line-height: 1.25; }
.lcenter { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.lpanel { background: var(--lcd-bg); box-shadow: var(--cell-off-shadow, none); padding: 6px;
  position: relative; }
.lpanel.grow { flex: 1; }
.lcap { display: block; font: var(--font-pill); color: var(--lcd-ink); letter-spacing: .14em;
  margin-bottom: 5px; }
.lrow { display: flex; gap: 2px; height: 11px; margin-bottom: 3px; }
.lrow i { flex: 1; background: rgba(255,255,255,.05); }
.lrow i.on { background: var(--h); }
.lright { width: 210px; flex: none; display: flex; flex-direction: column; gap: 5px; }
.lpanel.xy { flex: 1; background-image:
  linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px);
  background-size: 33% 33%; }
.ball { position: absolute; left: 56%; top: 46%; width: 26px; height: 26px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #9dffa8, #2ee23c 70%);
  box-shadow: 0 0 14px rgba(46,226,60,.6); }
.lfx { display: flex; align-items: center; gap: 7px; background: var(--surf2);
  box-shadow: var(--bevel); padding: 5px 7px; font: var(--font-pill); color: var(--muted); }
.lfx span:first-child { width: 46px; letter-spacing: .1em; }
.lfx b { font: var(--font-lcd); color: var(--lcd-ink); }
"""
