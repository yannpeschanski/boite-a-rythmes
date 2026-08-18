# -*- coding: utf-8 -*-
"""Winamp 2.x décliné sur les six écrans de l'appli."""
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B, modes as M, variants_c

W1 = [v for v in variants_c.V if v[0] == 'w1'][0]
css = B.BASE + B.SYNTH_CSS + M.MODES_CSS + W1[3]

SCREENS = [
    ('Écran d’accueil', 'le premier contact', M.screen_splash),
    ('Atelier · Rythme', 'l’écran de référence', B.screen),
    ('Atelier · Synthé', 'le plus dense', B.screen_synth),
    ('Atelier · Production', 'trois fenêtres empilées', M.screen_prod),
    ('Mode jeu', 'aujourd’hui en palette « noir »', M.screen_game),
    ('Mode Live', 'PAYSAGE — le plus éloigné de l’Atelier', M.screen_live),
]
cards = ''.join(
    '<div class="cell%s" data-k="%d">\n  <div class="cap"><b>%s</b><span>%s</span></div>\n  %s\n</div>\n'
    % (' wide' if i == 5 else '', i, nom, sub, fn('w1'))
    for i, (nom, sub, fn) in enumerate(SCREENS))

io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'winamp-modes.html'),
        'w', encoding='utf-8').write(
    '<!doctype html>\n<meta charset="utf-8"><title>Winamp 2.x — tous les modes</title>\n'
    '<style>%s\n.cell.wide { width: 844px; }</style>\n%s' % (css, cards))
print('écrit winamp-modes.html —', len(SCREENS), 'écrans')
