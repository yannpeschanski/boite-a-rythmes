/* La mélodie par motif (R1(b)) — et les deux garde-fous qui l'encadrent.
 *
 * Écrit à partir des mesures qui ont servi à régler le générateur, pour que
 * les deux propriétés qu'on cherchait ne repartent pas en silence : la
 * mélodie doit REVENIR (c'est ce qui la rend mémorisable) et elle ne doit pas
 * redevenir la ligne la plus chargée (c'est le reproche d'origine de Yann).
 */
import { describe, it, expect } from 'vitest';
import { PRESETS } from '../src/model/presets/songs';
import { presetToState } from '../src/model/presetAdapter';

function longueurMotif(subdivisions: number, cycleBars: number, pas: number): number {
  if (cycleBars <= 1) return Math.max(2, Math.floor(pas / 2));
  const parMesure = Math.max(1, Math.round(pas / cycleBars));
  return Math.min(pas, parMesure < 4 ? parMesure * 2 : parMesure);
}

describe('mélodie par motif — sur les 34 presets', () => {
  it('répète son motif : hors dernière mesure, tout pas ressemble à celui d’un motif plus tôt', () => {
    let ok = 0;
    let total = 0;
    for (const p of PRESETS) {
      const m = presetToState(p).synthRows.melody;
      const L = longueurMotif(m.subdivisions, m.cycleBars, m.pattern.length);
      // La dernière mesure varie exprès (fin de phrase) : elle est exclue.
      const fin = Math.max(0, m.pattern.length - L);
      for (let i = L; i < fin; i++) {
        total++;
        if ((m.pattern[i] == null) === (m.pattern[i - L] == null)) ok++;
      }
    }
    expect(total).toBeGreaterThan(0);
    // Avant le motif : 0 % de mesures répétées. C'est la propriété centrale.
    expect(ok / total).toBe(1);
  });

  it('ne redevient pas la ligne la plus chargée', () => {
    let melodie = 0;
    let basse = 0;
    let pire = 0;
    for (const p of PRESETS) {
      const st = presetToState(p);
      const m = st.synthRows.melody;
      const b = st.synthRows.bass;
      const dm = m.pattern.filter((v) => v != null).length / Math.max(1, m.cycleBars);
      melodie += dm;
      pire = Math.max(pire, dm);
      basse += b.pattern.filter((v) => v != null).length / Math.max(1, b.cycleBars);
    }
    const n = PRESETS.length;
    // Le critère que la session du 2026-08-17 s'était donné, et qui reste le
    // bon : la mélodie sous la basse. 1,08 contre 1,15 au moment du réglage.
    expect(melodie / n).toBeLessThan(basse / n);
    expect(pire).toBeLessThanOrEqual(4.5);
  });

  it('ne laisse jamais une ligne de mélodie entièrement vide', () => {
    for (const p of PRESETS) {
      const m = presetToState(p).synthRows.melody;
      expect(m.pattern.some((v) => v != null)).toBe(true);
    }
  });
});
