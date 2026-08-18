# -*- coding: utf-8 -*-
"""Moodboard des deux finalistes : Cassette et Winamp 2.x, sans croisement.
Les spécimens sont du CSS VIVANT et non des captures : pastilles de couleur,
spécimens typographiques et composants sont rendus dans les tokens réels lus
dans variants_b.py / variants_c.py."""
import io, base64
S = '/tmp/claude-0/-home-user-boite-a-rythmes/6d685c3a-41ef-534c-97ef-3481ca447e3b/scratchpad/shots'
def img(n): return 'data:image/jpeg;base64,'+base64.b64encode(open('%s/%s.jpg'%(S,n),'rb').read()).decode()

PAL = {
 'ca': [
  ('Fonds', [('#d8d2c6','Carton','le fond, visible autour des blocs — le carton de la jaquette'),
             ('#f4f1e8','Papier','panneaux et plan de travail : un seul et même blanc cassé'),
             ('#e6e1d4','Papier creusé','case vide, bandeau d’état')]),
  ('Encres', [('#23211c','Encre','texte, filets, barre de titre. Un seul noir, jamais pur — celui d’un ruban usé'),
              ('#7a736a','Encre pâle','libellés secondaires'),
              ('#a8a094','Encre effacée','valeurs secondaires du bandeau')]),
  ('Traits', [('#bdb6a8','Diode éteinte','le seul gris de l’ensemble'),
              ('#23211c','Filet','même encre que le texte : il n’y a pas de gris de bordure')]),
  ('Accent', [('#c94f2e','Vermillon','le filet de face, à gauche de chaque bloc. La deuxième encre du fanzine')]),
 ],
 'w1': [
  ('Fonds', [('#000000','Bureau','noir pur : la fenêtre flotte, elle n’a pas de décor'),
             ('#4b4b57 → #1e1e26','Chrome','le dégradé des panneaux, clair en haut, sombre en bas'),
             ('#25252e','Plan de travail','l’intérieur de la fenêtre'),
             ('#050806','Verre','le fond du LCD et des cases vides — noir verdâtre')]),
  ('Encres', [('#c8c8d8','Encre','texte courant, légèrement bleutée'),
              ('#75758a','Encre pâle','libellés secondaires'),
              ('#b8b8e8','Encre de titre','sur le bandeau de fenêtre')]),
  ('Reliefs', [('#7d7d92','Lumière','le pixel clair, en haut à gauche de chaque relief'),
               ('#0a0a10','Ombre','le pixel sombre, en bas à droite')]),
  ('Accent', [('#2ee23c','Vert LCD','l’état et les valeurs — jamais une décoration'),
              ('#3a3a8c → #2a2a66','Indigo','le bandeau de fenêtre, seule zone colorée du chrome')]),
 ],
}
ROWS = {
 'ca': [('Kick','#c94f2e'),('Snare','#c99a2e'),('Hat','#2e8c88'),('Clap','#4a8c3e'),
        ('Shaker','#3e6f9c'),('Basse','#3e5f9c'),('Nappe','#7a4e8c'),('Mélodie','#a8465e')],
 'w1': [('Kick','#ff5a2b'),('Snare','#ffb020'),('Hat','#2ee23c'),('Clap','#33d9d6'),
        ('Shaker','#8a8ad8'),('Basse','#4f8cff'),('Nappe','#c06bff'),('Mélodie','#ff5ac8')],
}
SCALE = {
 'ca': [('Titre de fenêtre','12 px','700','+0,12 em','—','Séquenceur','tt'),
        ('Menus','11 px','400','+0,06 em','—','Fichier','menu'),
        ('Onglet actif','11 px','700','—','—','Rythme','tabon'),
        ('Nom de ligne','10 px','700','+0,10 em','capitales','KICK','tag'),
        ('Bouton','12 px','400','—','—','▶ Lecture','btn'),
        ('Légende de cadre','9 px','700','+0,20 em','capitales','SIDECHAIN','leg'),
        ('Champ','10 px','400','—','—','Rhodes chaud','field'),
        ('Pastille','9 px','400','+0,06 em','—','Séquence','pill'),
        ('Bandeau d’état','10 px','400','+0,06 em','—','TON 42','lcd'),
        ('Chiffres','15 px','700','—','—','120','num')],
 'w1': [('Titre de fenêtre','8,5 px','700','+0,22 em','capitales','SÉQUENCEUR','tt'),
        ('Menus','9 px','700','+0,10 em','capitales','FICHIER','menu'),
        ('Onglet actif','9 px','700','+0,12 em','capitales','RYTHME','tabon'),
        ('Nom de ligne','8,5 px','700','+0,14 em','capitales','KICK','tag'),
        ('Bouton','9 px','700','+0,12 em','capitales','LECTURE','btn'),
        ('Légende de cadre','8,5 px','700','+0,16 em','capitales','SIDECHAIN','leg'),
        ('Champ','9,5 px','400','—','—','Rhodes chaud','field'),
        ('Pastille','8,5 px','400','+0,06 em','—','Séquence','pill'),
        ('Bandeau d’état','9 px','400','+0,06 em','—','TON 42','lcd'),
        ('Chiffres','22 px','700','—','—','120','num')],
}
REFS = {
 'ca': ["La J-card d’une TDK ou d’une BASF, remplie à la main",
        "Les jaquettes de démos autoproduites, photocopiées puis pliées",
        "La frappe d’une Olivetti Lettera, avec son ruban bicolore",
        "Les fanzines où le rouge est la seule deuxième encre",
        "Une pochette de 45 tours de label indépendant",
        "Un carton d’archives étiqueté à la machine"],
 'w1': ["Winamp 2.x, 1998 — et rien d’autre : c’est une citation, pas une inspiration",
        "Les skins de skins.winamp.com, où chaque pixel était dessiné à la main",
        "Les façades d’ampli en plastique brossé des années 90",
        "Un afficheur LCD vert de chaîne hi-fi",
        "Les boîtiers gris-violet des cartes son ISA",
        "It really whips the llama’s ass"],
}
ETATS = {
 'ca': [('Pas éteint','#e6e1d4','#23211c','Cadre à l’encre, fond papier creusé. Un emplacement vide sur une feuille, pas un bouton désactivé.'),
        ('Pas actif','ROW','ROW','Aplat plein dans la teinte de la ligne, cerné du même filet noir. Écrit ou pas écrit — il n’y a pas d’entre-deux.'),
        ('Ligne muette','#e6e1d4','#23211c','La diode passe au gris, le nom reste noir. Rien d’autre ne change : une ligne muette est une ligne qu’on n’a pas encore remplie.')],
 'w1': [('Pas éteint','#050806','','Verre noir verdâtre, creusé d’un pixel : lumière en bas à droite, ombre en haut à gauche. C’est un trou.'),
        ('Pas actif','ROW','','Aplat saturé, bombé d’un pixel — la lumière passe en haut à gauche. Le relief s’inverse, exactement comme un poussoir enfoncé qui remonte.'),
        ('Ligne muette','#050806','','La diode s’éteint et passe au gris ardoise. Le nom garde sa couleur : c’est la piste, pas son état.')],
}
RISQ = {
 'ca': ["<b>Le Mode Live est un écran de scène.</b> Un plan clair en pénombre éblouit, et c’est l’écran "
        "qu’on regarde le moins souvent mais le plus longtemps. Il faudra soit une variante sombre pour "
        "le Live, soit assumer deux ambiances dans le même produit.",
        "<b>C’est la plus haute des cinq finalistes</b> — 744 px pour l’écran Synthé, contre 657 pour "
        "Winamp. Les marges généreuses font partie du style ; les resserrer, c’est glisser vers le "
        "croisement H3 que tu viens d’écarter.",
        "<b>Le vermillon est aussi la teinte du kick.</b> Le filet de face et la ligne kick partagent "
        "#c94f2e : il faudra vérifier qu’on ne confonde jamais « la piste kick » et « l’élément actif »."],
 'w1': ["<b>Des cibles de 1998.</b> Capitales de 8,5 px, reliefs d’un pixel, boutons de fenêtre de "
        "24 px : c’est dessiné pour une souris. Sur un téléphone, il faudra agrandir les zones tactiles "
        "sans agrandir le dessin — c’est faisable, mais c’est le vrai chantier de cette direction.",
        "<b>Le relief d’un pixel ne survit pas à tous les écrans.</b> Sur un affichage à haute densité, "
        "un trait d’un pixel logique en fait deux ou trois physiques ; le biseau s’épaissit et le dessin "
        "s’alourdit. À vérifier tôt sur un vrai appareil.",
        "<b>C’est une citation littérale.</b> Personne ne s’y trompera, et c’est autant un atout qu’un "
        "risque : le projet portera pour toujours une référence datée de 1998, qu’une partie du public "
        "ne reconnaîtra pas."],
}
DIFF = [
 ("Ce qui les rapproche",
  ["La chasse fixe, seul point commun avéré de toute ta shortlist — l’une en machine à écrire, l’autre en terminal.",
   "Aucun rayon : pas un seul angle arrondi dans les deux directions.",
   "Un seul accent chacune, et il ne sert qu’à dire « actif » : le vermillon pour Cassette, le vert LCD pour Winamp.",
   "La même densité de mots : les libellés sont courts, en capitales, posés à même la surface."]),
 ("Ce qui les sépare",
  ["<b>Le fond.</b> Papier contre verre noir — et donc le contraste allumé/éteint : Cassette le règle à 80 %, Winamp à 100 %.",
   "<b>Le relief.</b> Cassette n’a aucune profondeur, tout est à plat avec des ombres portées dures. Winamp est entièrement construit sur un biseau d’un pixel.",
   "<b>L’échelle.</b> Cassette lit à 11-12 px, Winamp à 8,5-9. C’est un rapport de 1,3 sur toute l’interface.",
   "<b>L’origine.</b> Cassette est un objet imprimé qu’on a fabriqué soi-même ; Winamp est un logiciel qu’on a téléchargé. L’un se tient dans la main, l’autre a toujours été un écran."]),
]

def swatches(k):
    o=''
    for g,items in PAL[k]:
        o+='<div class="pgroup"><h4>%s</h4><div class="chips">'%g
        for hx,nom,role in items:
            style = ('background:linear-gradient(180deg,%s)'%hx.replace(' → ',',')) if '→' in hx else 'background:%s'%hx
            o+='<div class="chip"><i style="%s"></i><div><b>%s</b><code>%s</code><span>%s</span></div></div>'%(style,nom,hx,role)
        o+='</div></div>'
    return o
def hues(k): return ''.join('<div class="hue"><i style="background:%s"></i><b>%s</b><code>%s</code></div>'%(h,n,h) for n,h in ROWS[k])
def scale(k): return ''.join('<tr><td class="sp"><span class="%s">%s</span></td><td>%s</td><td class="n">%s</td><td class="n">%s</td><td class="n">%s</td><td class="n">%s</td></tr>'%(c,ex,r,t,g,tr,ca) for r,t,g,tr,ca,ex,c in SCALE[k])
def etats(k):
    o=''
    for nom,fond,bord,txt in ETATS[k]:
        if fond=='ROW':
            box='<i class="cellspec on" style="background:%s;border-color:%s"></i>'%(ROWS[k][0][1], bord if bord!='ROW' else ROWS[k][0][1])
        else:
            box='<i class="cellspec" style="background:%s%s"></i>'%(fond, (';border-color:%s'%bord) if bord else '')
        o+='<div class="etat">%s<div><b>%s</b><span>%s</span></div></div>'%(box,nom,txt)
    return o
def lis(d,k): return ''.join('<li>%s</li>'%x for x in d[k])
def diff():
    o=''
    for titre, items in DIFF:
        o+='<div class="dhalf"><h3>%s</h3><ul class="plain">%s</ul></div>'%(titre, ''.join('<li>%s</li>'%i for i in items))
    return o

TPL = io.open('/tmp/claude-0/-home-user-boite-a-rythmes/6d685c3a-41ef-534c-97ef-3481ca447e3b/scratchpad/mood.tpl.html', encoding='utf-8').read()
o = TPL.replace('__DIFF__', diff())
for k, shot in (('ca','cassette'), ('w1','w1')):
    K = k.upper()
    o = (o.replace('__SWATCH_%s__'%K, swatches(k)).replace('__HUES_%s__'%K, hues(k))
          .replace('__SCALE_%s__'%K, scale(k)).replace('__ETATS_%s__'%K, etats(k))
          .replace('__REFS_%s__'%K, lis(REFS,k)).replace('__RISQ_%s__'%K, lis(RISQ,k))
          .replace('__IMG_%sR__'%K, img('mb-%s-rythme'%shot)).replace('__IMG_%sS__'%K, img('mb-%s-synthe'%shot)))
io.open('/tmp/claude-0/-home-user-boite-a-rythmes/6d685c3a-41ef-534c-97ef-3481ca447e3b/scratchpad/moodboard.html','w',encoding='utf-8').write(o)
print('écrit — %.2f Mo' % (len(o)/1024/1024))
