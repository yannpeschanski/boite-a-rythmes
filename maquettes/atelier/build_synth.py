# -*- coding: utf-8 -*-
"""Les 5 finalistes de Yann, sur les DEUX écrans : Rythme et Synthé.
L'écran Synthé est le test dur — menus déroulants, cadres, cases à cocher,
curseurs numérotés — que les 29 premières maquettes ne montraient pas."""
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B
import variants_a, variants_b, variants_c

ALL = {v[0]: v for v in variants_a.V + variants_b.V + variants_c.V}
FINAL = ['w1', 'w2', 'c1', 'tui', 'cassette']

css = B.BASE + B.SYNTH_CSS + '\n'.join(ALL[k][3] for k in FINAL)

cards = ''
for k in FINAL:
    name, ref = ALL[k][1], ALL[k][2]
    cards += ('<div class="cell" data-k="%s">\n  <div class="cap"><b>%s</b><span>%s</span></div>\n'
              '  <div class="pair">%s%s</div>\n</div>\n'
              % (k, name, ref, B.screen(k), B.screen_synth(k)))

extra = """
.pair { display: flex; gap: 14px; }
.cell { width: 794px; }
"""
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'finalistes.html'),
        'w', encoding='utf-8').write(
    '<!doctype html>\n<meta charset="utf-8"><title>5 finalistes</title>\n<style>%s%s</style>\n%s'
    % (css, extra, cards))
print('écrit finalistes.html —', len(FINAL), 'directions × 2 écrans')
