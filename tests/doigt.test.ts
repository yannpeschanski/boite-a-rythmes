/* Quand part une note jouée AU DOIGT — le calcul (engine/doigt.ts).
 *
 * ⚠️ « Dans le Mode Live, les pads arrivent en retard » (2026-10-20). Le
 * retard de la sortie ne se retire pas ; son IRRÉGULARITÉ, si. Le câblage
 * (le moteur, l'escalier de Chrome, le remplacement d'une note) est tenu par
 * `tests/horloge-moteur.test.ts`.
 */
import { describe, it, expect } from 'vitest';
import {
  caseDuDoigt,
  instantDuDoigt,
  calerSurLaGrille,
  caseSuivante,
  RETARD_AUDIBLE_S,
  HYSTERESE_S,
  type Grille,
} from '../src/engine/doigt';
import { SEUIL_SENSIBLE } from '../src/ui/latenceVerdict';

const AVANCE = 0.008;

describe('le retard d’une note au doigt est CONSTANT', () => {
  it('quelle que soit la marche de `currentTime`, le doigt s’entend au même écart', () => {
    // Chrome Android : marches de 171 ms, 448 ms de sortie. L'escalier monte
    // d'un coup, l'heure entendue avance sans à-coups.
    const MARCHE = 0.171;
    const RETARD = 0.448;
    const avanceRendu = RETARD + MARCHE; // le haut de l'escalier
    const ecarts: number[] = [];
    const anciens: number[] = [];
    for (let doigt = 3; doigt < 5; doigt += 0.007) {
      const maintenant = (Math.floor(doigt / MARCHE) + 1) * MARCHE;
      const entendu = doigt - RETARD;
      const t = instantDuDoigt({ maintenant, entendu, avanceRendu }, AVANCE);
      expect(t).toBeGreaterThanOrEqual(maintenant + AVANCE - 1e-9);
      ecarts.push(t - entendu);
      anciens.push(maintenant + AVANCE - entendu);
    }
    expect(Math.max(...ecarts) - Math.min(...ecarts)).toBeLessThan(1e-9);
    // Ce qu'on retire : l'ancien départ variait de toute une marche.
    expect(Math.max(...anciens) - Math.min(...anciens)).toBeGreaterThan(0.16);
  });

  it('sans heure entendue ni écart mesuré : tout de suite, comme avant', () => {
    expect(instantDuDoigt({ maintenant: 2, entendu: null, avanceRendu: 0.3 }, AVANCE)).toBe(2 + AVANCE);
    expect(instantDuDoigt({ maintenant: 2, entendu: 1.7, avanceRendu: null }, AVANCE)).toBe(2 + AVANCE);
  });

  it('un doigt traité en retard ne programme jamais dans le passé', () => {
    // L'événement a attendu une demi-seconde dans la file : on part au plus tôt.
    const t = instantDuDoigt({ maintenant: 10, entendu: 9.1, avanceRendu: 0.4 }, AVANCE);
    expect(t).toBeCloseTo(10 + AVANCE, 9);
  });
});

describe('caler sur la grille seulement si le retard S’ENTEND', () => {
  it('le seuil est celui de l’avis de latence — une seule définition', () => {
    expect(SEUIL_SENSIBLE).toBe(Math.round(RETARD_AUDIBLE_S * 1000));
  });

  it('libre sous le seuil, calé au-dessus, et le retour garde un écart', () => {
    expect(calerSurLaGrille(0.03, false)).toBe(false);
    expect(calerSurLaGrille(RETARD_AUDIBLE_S, false)).toBe(true);
    expect(calerSurLaGrille(0.25, false)).toBe(true);
    // Un retard qui oscille autour du seuil ne fait pas basculer à chaque note.
    expect(calerSurLaGrille(RETARD_AUDIBLE_S - HYSTERESE_S / 2, true)).toBe(true);
    expect(calerSurLaGrille(RETARD_AUDIBLE_S - HYSTERESE_S / 2, false)).toBe(false);
    expect(calerSurLaGrille(RETARD_AUDIBLE_S - HYSTERESE_S - 0.001, true)).toBe(false);
  });
});

describe('la prochaine case de la ligne', () => {
  const droite = (pas: number, decalage: (col: number) => number = () => 0): Grille => ({
    repere: 4,
    index: 0,
    pas,
    total: 16,
    decalage,
  });

  it('une grille droite : la première case à t ou après', () => {
    const g = droite(0.125);
    expect(caseSuivante(4.3, g)).toBeCloseTo(4.375, 9);
    expect(caseSuivante(4.375, g)).toBeCloseTo(4.375, 9);
    // Avant le repère aussi : la grille s'étend des deux côtés.
    expect(caseSuivante(3.8, g)).toBeCloseTo(3.875, 9);
    expect(caseSuivante(3.9, g)).toBeCloseTo(4, 9);
  });

  it('le swing ne retarde que les cases impaires, comme l’ordonnanceur', () => {
    const pas = 0.125;
    const g = droite(pas, (col) => (col % 2 === 1 ? 0.5 * pas : 0));
    // Juste après la case 0 : la case 1, retardée d'une demi-case.
    expect(caseSuivante(4.01, g)).toBeCloseTo(4 + pas * 1.5, 9);
    // Juste après la case 1 swinguée : la case 2, droite.
    expect(caseSuivante(4 + pas * 1.5 + 0.001, g)).toBeCloseTo(4 + 2 * pas, 9);
  });

  it('jamais une case passée, même quand décalage et swing les mélangent', () => {
    const pas = 0.1;
    // Décalage négatif, swing maximal, traîne : deux cases voisines peuvent
    // sortir dans le désordre.
    const g = droite(pas, (col) => -0.5 * pas + (col % 2 === 1 ? 0.75 * pas : 0) + 0.5 * pas);
    const cases: number[] = [];
    for (let n = -5; n < 40; n++) {
      const col = (((g.index + n) % g.total) + g.total) % g.total;
      cases.push(g.repere + n * pas + g.decalage(col));
    }
    for (let t = 4; t < 7; t += 0.0037) {
      const c = caseSuivante(t, g);
      expect(c).toBeGreaterThanOrEqual(t - 1e-9);
      // C'est bien la plus proche à venir.
      const attendue = Math.min(...cases.filter((x) => x >= t - 1e-9));
      expect(c).toBeCloseTo(attendue, 9);
    }
  });
});

describe('la case visée depuis le DOIGT', () => {
  const g: Grille = { repere: 4, index: 0, pas: 0.125, total: 16, decalage: () => 0 };

  it('un gestionnaire en retard ne fait pas sauter une case encore devant', () => {
    // Le doigt vise 4,19 → case 4,25. Le gestionnaire passe 40 ms plus tard,
    // en haut de l'escalier : l'instant brut est passé, la case non.
    const d = { maintenant: 4.19, entendu: 4.19 - 0.6, avanceRendu: 0.582 };
    expect(caseDuDoigt(d, AVANCE, g)).toBeCloseTo(4.25, 9);
  });

  it('une case vraiment passée cède la place à la suivante', () => {
    const d = { maintenant: 4.25, entendu: 4.19 - 0.6, avanceRendu: 0.582 };
    expect(caseDuDoigt(d, AVANCE, g)).toBeCloseTo(4.375, 9);
  });
});
