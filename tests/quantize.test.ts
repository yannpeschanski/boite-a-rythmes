import { describe, it, expect } from 'vitest';
import { quantizeToStep } from '../src/engine/quantize';

// Le pad d'écriture range un geste joué à la main sur un pas de la grille.
// Le défaut qu'on cherche à empêcher n'est pas un plantage mais un DÉCALAGE :
// écrire systématiquement sur le pas en cours ferait sonner tout ce qu'on
// enregistre en retard d'un pas, ce qui se remarque seulement à l'oreille,
// une fois la mélodie jouée.

const STEP = 200; // ms

describe('quantification vers un pas', () => {
  it("garde le pas courant quand le doigt tombe dans sa première moitié", () => {
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 0, stepMs: STEP, steps: 8 })).toBe(3);
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 99, stepMs: STEP, steps: 8 })).toBe(3);
  });

  it('vise le pas suivant au-delà de la moitié', () => {
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 101, stepMs: STEP, steps: 8 })).toBe(4);
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 199, stepMs: STEP, steps: 8 })).toBe(4);
  });

  it('bascule exactement à la moitié, pas avant', () => {
    // La frontière est le seul endroit où une erreur d'inégalité se cache.
    expect(quantizeToStep({ playheadCol: 0, elapsedMs: STEP / 2, stepMs: STEP, steps: 8 })).toBe(0);
    expect(quantizeToStep({ playheadCol: 0, elapsedMs: STEP / 2 + 1, stepMs: STEP, steps: 8 })).toBe(1);
  });

  it('replie en fin de cycle plutôt que de déborder', () => {
    expect(quantizeToStep({ playheadCol: 7, elapsedMs: 150, stepMs: STEP, steps: 8 })).toBe(0);
    expect(quantizeToStep({ playheadCol: 0, elapsedMs: 150, stepMs: STEP, steps: 1 })).toBe(0);
  });

  it('ramène un index de pas hors bornes dans le cycle', () => {
    expect(quantizeToStep({ playheadCol: 9, elapsedMs: 0, stepMs: STEP, steps: 8 })).toBe(1);
    expect(quantizeToStep({ playheadCol: -1, elapsedMs: 0, stepMs: STEP, steps: 8 })).toBe(7);
  });

  it("n'invente aucun décalage quand la durée d'un pas est inutilisable", () => {
    // Mieux vaut le pas courant qu'un arrondi tiré d'une durée absurde.
    for (const stepMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(quantizeToStep({ playheadCol: 5, elapsedMs: 1000, stepMs, steps: 8 }), `stepMs=${stepMs}`).toBe(5);
    }
    expect(quantizeToStep({ playheadCol: 5, elapsedMs: Number.NaN, stepMs: STEP, steps: 8 })).toBe(5);
  });

  it('ne divise jamais par un cycle vide', () => {
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 150, stepMs: STEP, steps: 0 })).toBe(0);
  });
});
