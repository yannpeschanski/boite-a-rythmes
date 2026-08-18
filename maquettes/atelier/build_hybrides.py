# -*- coding: utf-8 -*-
"""Les 4 croisements, sur les deux écrans."""
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B, variants_d

css = B.BASE + B.SYNTH_CSS + '\n'.join(v[3] for v in variants_d.V)
cards = ''.join(
    '<div class="cell" data-k="%s">\n  <div class="cap"><b>%s</b><span>%s</span></div>\n'
    '  <div class="pair">%s%s</div>\n</div>\n'
    % (k, n, r, B.screen(k), B.screen_synth(k))
    for k, n, r, _ in variants_d.V)
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hybrides.html'),
        'w', encoding='utf-8').write(
    '<!doctype html>\n<meta charset="utf-8"><title>4 croisements</title>\n<style>%s\n'
    '.pair { display:flex; gap:14px; } .cell { width:794px; }</style>\n%s' % (css, cards))
print('écrit hybrides.html —', len(variants_d.V), 'croisements × 2 écrans')
