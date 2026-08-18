# -*- coding: utf-8 -*-
"""Assemble les 20 écrans d'Atelier complets."""
import io, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import base as B
import variants_a, variants_b

V = variants_a.V + variants_b.V
assert len(V) == 20, len(V)

cards = ''.join(
    '<div class="cell" data-k="%s">\n  <div class="cap"><b>%s</b><span>%s</span></div>\n  %s\n</div>\n'
    % (k, name, ref, B.screen(k))
    for k, name, ref, _ in V)

css = B.BASE + '\n'.join(v[3] for v in V)

out = ('<!doctype html>\n<meta charset="utf-8"><title>20 Ateliers</title>\n'
       '<style>%s</style>\n%s' % (css, cards))
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'index.html'),
        'w', encoding='utf-8').write(out)
print('écrit index.html —', len(V), 'écrans')
