/* LES TROIS VARIANTES — ce que le Mode Live propose sans qu'on ait rien
 * préparé (docs/plan/07-audit-mode-live-variantes.md).
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Le défaut qu'on répare est qu'un modèle
 * d'architecture chargé à froid jouait TRENTE FOIS LE MÊME MOTIF : ses huit
 * cases attendaient une séquence de banque que personne n'avait préparée. La
 * sortie est de DÉRIVER le matériau de la boucle qu'on a sous la main — et une
 * dérivation ne vaut que si elle donne trois états DISTINCTS et AUDIBLES sur
 * tout ce que l'appli sait produire. C'est ce que ce fichier mesure, contre le
 * catalogue entier plutôt que contre un exemple choisi.
 */
import { describe, it, expect } from 'vitest';
import { variantesDe, calqueDe, lignesQuiSonnent } from '../src/model/variantes';
import { defaultState } from '../src/model/defaults';
import { presetToState } from '../src/model/presetAdapter';
import { PRESETS } from '../src/model/presets/songs';
import { cycleDuMotif } from '../src/model/architecture';
import type { PatternStateV2 } from '../src/model/types';

/** Les 34 presets PLUS le motif d'accueil — c'est lui le cas limite. */
function tousLesMotifs(): Array<[string, PatternStateV2]> {
  const l: Array<[string, PatternStateV2]> = PRESETS.map((p) => [p.id, presetToState(p)]);
  l.push(['motif d’accueil', defaultState()]);
  return l;
}

describe('la dérivation se CALIBRE sur le catalogue, elle ne s’affirme pas', () => {
  it('donne trois variantes DISTINCTES sur les 34 presets et sur le motif d’accueil', () => {
    const motifs = tousLesMotifs();
    // ⚠️ Non-vacuité : sans ce compte, vider PRESETS rendrait le test vert.
    expect(motifs.length).toBe(35);
    for (const [nom, st] of motifs) {
      const vs = variantesDe(st);
      expect(vs.length, nom).toBe(3);
      const signatures = new Set(vs.map((v) => v.lignes.join(' ')));
      expect(signatures.size, nom).toBe(3);
      for (const v of vs) expect(v.lignes.length, `${nom} · ${v.nom}`).toBeGreaterThan(0);
    }
  });

  it('⚠️ échoue avec une liste FIXE — le motif d’accueil est le cas qui l’a montré', () => {
    /* La première version retirait `clap`, `shaker`, `melody` — nommées. Zéro
       collision sur les 34 presets, et RETENUE = PLEIN sur le motif d'accueil,
       qui n'a aucune des trois : deux boutons identiques sur le seul motif que
       le Mode Live propose à froid. Le test reproduit l'ancienne règle pour
       que le jour où quelqu'un la restaure, ce soit lui qui le dise. */
    const accueil = defaultState();
    const plein = lignesQuiSonnent(accueil);
    const listeFixe = plein.filter((l) => !['clap', 'shaker', 'melody'].includes(l));
    expect(listeFixe).toEqual(plein); // l'ancienne règle ne retirait RIEN ici

    const vs = variantesDe(accueil);
    const retenue = vs.find((v) => v.id === 'retenue')!;
    expect(retenue.lignes).not.toEqual(plein); // la nouvelle, si
  });

  it('n’invente aucune ligne : chaque variante est incluse dans ce qui sonne', () => {
    for (const [nom, st] of tousLesMotifs()) {
      const plein = lignesQuiSonnent(st);
      for (const v of variantesDe(st)) {
        for (const l of v.lignes) expect(plein, `${nom} · ${v.nom} · ${l}`).toContain(l);
      }
    }
  });

  it('ignore une ligne MUETTE ou VIDE — c’est ce qui sonne qui compte', () => {
    const st = presetToState(PRESETS[0]);
    const avant = lignesQuiSonnent(st);
    expect(avant).toContain('hat');
    st.rows.hat.muted = true;
    expect(lignesQuiSonnent(st)).not.toContain('hat');
    for (const v of variantesDe(st)) expect(v.lignes).not.toContain('hat');
  });
});

describe('un bouton qui ne change rien n’existe pas', () => {
  it('ne rend qu’UNE variante sur une boucle d’une seule ligne', () => {
    /* Il n'y a rien à retirer d'un kick seul : RETENUE serait vide et RUPTURE
       aussi. Deux boutons de plus qui ne changent rien seraient exactement le
       théâtre que ce chantier retire. */
    const st = defaultState();
    st.rows.snare.pattern = st.rows.snare.pattern.map(() => 0);
    st.rows.hat.pattern = st.rows.hat.pattern.map(() => 0);
    expect(lignesQuiSonnent(st)).toEqual(['kick']);
    const vs = variantesDe(st);
    expect(vs.length).toBe(1);
    expect(vs[0].id).toBe('plein');
  });

  it('garde PLEIN quand une autre variante lui est identique', () => {
    /* Une boucle sans socle (ni kick, ni caisse, ni clap) rend RUPTURE égale à
       PLEIN. C'est PLEIN qu'on garde : c'est la boucle telle qu'elle a été
       composée, donc la référence. */
    const st = defaultState();
    st.rows.kick.pattern = st.rows.kick.pattern.map(() => 0);
    st.rows.snare.pattern = st.rows.snare.pattern.map(() => 0);
    const vs = variantesDe(st);
    expect(vs.map((v) => v.id)).toContain('plein');
    expect(vs.map((v) => v.id)).not.toContain('rupture');
  });

  it('rend les variantes dans l’ordre A B C, lettres fixes par identité', () => {
    const vs = variantesDe(presetToState(PRESETS[0]));
    expect(vs.map((v) => v.lettre)).toEqual(['A', 'B', 'C']);
    expect(vs.map((v) => v.id)).toEqual(['retenue', 'plein', 'rupture']);
  });
});

describe('le calque, et ce qu’il ne fait PAS', () => {
  it('PLEIN RELÂCHE au lieu de forcer — une ligne coupée dans l’Atelier le reste', () => {
    /* ⚠️ Le piège : PLEIN contient les lignes qui sonnent, donc s'en servir
       comme masque forcerait `liveMute = false` dessus. Le Mode Live n'a pas à
       rouvrir dans le dos de qui a coupé. `null` veut dire « suivre le motif ». */
    const vs = variantesDe(presetToState(PRESETS[0]));
    expect(calqueDe(vs.find((v) => v.id === 'plein')!)).toBeNull();
    expect(calqueDe(vs.find((v) => v.id === 'retenue')!)).not.toBeNull();
    expect(calqueDe(vs.find((v) => v.id === 'rupture')!)).not.toBeNull();
  });

  it('ne touche jamais au MOTIF — le cycle propre est le même pour les trois', () => {
    /* Une variante est un calque, pas une copie : c'est ce qui rend le retour
       au PLEIN gratuit, et ce qui garantit qu'une bascule tombe toujours sur
       la même frontière de cycle. */
    for (const [nom, st] of tousLesMotifs()) {
      const avant = cycleDuMotif(st);
      const copie = JSON.stringify(st);
      variantesDe(st);
      expect(JSON.stringify(st), nom).toBe(copie);
      expect(cycleDuMotif(st), nom).toBe(avant);
    }
  });
});
