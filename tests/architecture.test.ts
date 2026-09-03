/* L'ARCHITECTURE DE MORCEAU — et son piège central, le mot « cycle ».
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. « 8 cycles de A » n'a pas une valeur mais
 * deux, et l'écart est un facteur quatre : une ligne de batterie boucle en une
 * mesure pile, mais la nappe s'étale sur `cycleBars` mesures — QUATRE dans 30
 * presets sur 34. Lu comme « 8 mesures », la nappe joue deux fois ; lu comme
 * « 8 tours du motif », huit fois.
 *
 * Le choix est fait : un cycle est un TOUR DU MOTIF, calculé et jamais
 * supposé. Ce que ça achète, et que ce fichier vérifie : une longueur de
 * section qui coupe une phrase en deux devient IMPOSSIBLE À ÉCRIRE, au lieu
 * d'être un défaut qu'on entend une fois sur deux sans savoir d'où il vient.
 */
import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import {
  cycleDuMotif,
  mesuresDeSection,
  dureeSecondes,
  formaterDuree,
  MODELES,
  modeleFrais,
} from '../src/model/architecture';
import type { PatternStateV2 } from '../src/model/types';

/** Un motif où seule la batterie sonne : toutes les lignes font une mesure. */
function batterieSeule(): PatternStateV2 {
  const s = defaultState();
  for (const n of ['bass', 'pad', 'melody'] as const) {
    s.synthRows[n].pattern = s.synthRows[n].pattern.map(() => (n === 'pad' ? -1 : null));
  }
  return s;
}

/** Le même, plus une nappe qui sonne sur `bars` mesures. */
function avecNappe(bars: number): PatternStateV2 {
  const s = batterieSeule();
  s.synthRows.pad.cycleBars = bars;
  s.synthRows.pad.subdivisions = 4;
  s.synthRows.pad.pattern = [0, 1, 2, 3];
  return s;
}

describe('cycleDuMotif — le cycle se CALCULE, il ne se suppose pas', () => {
  it('vaut 1 quand seule la batterie sonne', () => {
    expect(cycleDuMotif(batterieSeule())).toBe(1);
  });

  it('vaut 4 dès que la nappe s’étale sur quatre mesures — le cas des 30 presets', () => {
    expect(cycleDuMotif(avecNappe(4))).toBe(4);
  });

  it('prend le PPCM quand deux lignes ont des longueurs différentes', () => {
    const s = avecNappe(3);
    s.synthRows.bass.cycleBars = 2;
    s.synthRows.bass.subdivisions = 8;
    s.synthRows.bass.pattern = [{ degree: 1, octave: 0 }, null, null, null, null, null, null, null];
    // 2 et 3 premiers entre eux : le motif ne se répète vraiment qu'à 6.
    expect(cycleDuMotif(s)).toBe(6);
  });

  it('ignore une ligne MUETTE — sinon une nappe coupée imposerait ses 16 mesures', () => {
    const s = avecNappe(16);
    expect(cycleDuMotif(s)).toBe(16);
    s.synthRows.pad.muted = true;
    expect(cycleDuMotif(s)).toBe(1);
  });

  it('ignore une ligne VIDE — même raison, et c’est le cas par défaut', () => {
    const s = avecNappe(8);
    s.synthRows.pad.pattern = s.synthRows.pad.pattern.map(() => -1);
    expect(cycleDuMotif(s)).toBe(1);
  });
});

describe('une section se compte en tours, et s’affiche en mesures', () => {
  it('« ×8 » sur un motif de 4 mesures fait 32 mesures, pas 8', () => {
    const sec = MODELES[0].sections[0];
    expect(mesuresDeSection({ ...sec, cycles: 8 }, 4)).toBe(32);
    expect(mesuresDeSection({ ...sec, cycles: 8 }, 1)).toBe(8);
  });

  it('ne peut PAS décrire une longueur qui coupe une phrase', () => {
    /* Le point de tout le fichier : sur un cycle de 4, aucune valeur entière
       de `cycles` ne donne 6 mesures. Compter en mesures l'autoriserait, et la
       nappe serait coupée en plein milieu une fois sur deux. */
    const sec = MODELES[0].sections[0];
    const longueurs = new Set<number>();
    for (let c = 1; c <= 32; c++) longueurs.add(mesuresDeSection({ ...sec, cycles: c }, 4));
    expect(longueurs.has(6)).toBe(false);
    for (const l of longueurs) expect(l % 4).toBe(0);
  });

  it('donne une durée qui suit le tempo', () => {
    const sections = MODELES[0].sections;
    // Sur un motif d'une mesure, POP fait 30 tours -> 30 mesures.
    expect(dureeSecondes(sections, 1, 120)).toBeCloseTo(30 * 2, 5);
    // Le même morceau dure DEUX FOIS plus long à 60 BPM : une limite en
    // mesures ne veut rien dire pour l'utilisateur, seule la durée compte.
    expect(dureeSecondes(sections, 1, 60)).toBeCloseTo(dureeSecondes(sections, 1, 120) * 2, 5);
  });

  it('formate une durée lisible', () => {
    expect(formaterDuree(104)).toBe('1 min 44');
    expect(formaterDuree(16)).toBe('16 s');
  });
});

describe('les modèles livrés d’usine', () => {
  it('ne citent que des sections d’au moins un tour et sans séquence imposée', () => {
    for (const m of MODELES) {
      expect(m.sections.length).toBeGreaterThan(0);
      for (const s of m.sections) {
        expect(s.cycles).toBeGreaterThan(0);
        // Un modèle POSE la forme, il n'impose aucun contenu : c'est
        // l'utilisateur qui dépose ses séquences.
        expect(s.sequenceId).toBeNull();
      }
    }
  });

  it('ARC est un arc d’INTENSITÉ — il joue sur les LIGNES, pas sur les motifs', () => {
    const arc = MODELES.find((m) => m.nom === 'ARC')!;
    /* ⚠️ Le compte est là exprès : si plus aucune section ne portait de calque,
       le champ `lignes` serait déclaré et lu par personne — la famille de
       défaut de `forceVariantCount`. C'est ARC qui le rend porteur. */
    const avecCalque = arc.sections.filter((s) => s.lignes !== null);
    expect(avecCalque.length).toBeGreaterThan(0);
    // Et l'intensité MONTE : chaque section a au moins autant de lignes que la
    // précédente, jusqu'au climax qui les a toutes.
    const climax = arc.sections.findIndex((s) => s.nom === 'CLIMAX');
    expect(climax).toBeGreaterThan(0);
    expect(arc.sections[climax].lignes).toBeNull(); // « toutes »
    for (let i = 1; i < climax; i++) {
      expect(arc.sections[i].lignes!.length).toBeGreaterThan(arc.sections[i - 1].lignes!.length);
    }
  });

  it('donne une copie fraîche, jamais le modèle lui-même', () => {
    const a = modeleFrais('POP')!;
    const b = modeleFrais('POP')!;
    a.sections[0].cycles = 99;
    expect(b.sections[0].cycles).not.toBe(99);
    expect(MODELES[0].sections[0].cycles).not.toBe(99);
    // Les identifiants aussi sont neufs : deux chaînes chargées à la suite ne
    // doivent pas partager de clés (`{#each}` les utilise).
    expect(a.sections[0].id).not.toBe(b.sections[0].id);
  });
});
