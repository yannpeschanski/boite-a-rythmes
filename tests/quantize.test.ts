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

describe('quantizeToStep — le temps écoulé peut être négatif', () => {
  const STEP = 200;

  /* Depuis que le pad retranche le décalage d'entrée mesuré de l'appareil, un
   * `elapsedMs` négatif n'est plus une anomalie : il veut dire « la frappe
   * appartient au pas PRÉCÉDENT ». L'ancien garde-fou `elapsedMs < 0` renvoyait
   * le pas courant et rendait donc toute correction positive SILENCIEUSEMENT
   * sans effet — mesuré au navigateur, 400 ms de décalage écrivaient exactement
   * les mêmes colonnes que 0. */
  it('recule d’un pas quand la correction dépasse la moitié du pas', () => {
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: -101, stepMs: STEP, steps: 8 })).toBe(2);
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: -300, stepMs: STEP, steps: 8 })).toBe(2);
  });

  it('ne recule pas pour une correction plus petite que la moitié du pas', () => {
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: -99, stepMs: STEP, steps: 8 })).toBe(3);
  });

  it('pile à la moitié on reste, des DEUX côtés de zéro', () => {
    // Le contrat d'origine (`elapsedMs > stepMs / 2`, strictement) est conservé
    // et simplement reflété : `Math.round` aurait arrondi 0,5 vers le haut et
    // cassé le cas positif, déjà verrouillé par un test plus haut.
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: STEP / 2, stepMs: STEP, steps: 8 })).toBe(3);
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: -STEP / 2, stepMs: STEP, steps: 8 })).toBe(3);
  });

  it('recule de plusieurs pas si la correction les dépasse', () => {
    expect(quantizeToStep({ playheadCol: 5, elapsedMs: -2 * STEP, stepMs: STEP, steps: 8 })).toBe(3);
  });

  it('replie en début de cycle sans jamais sortir des bornes', () => {
    expect(quantizeToStep({ playheadCol: 0, elapsedMs: -STEP, stepMs: STEP, steps: 8 })).toBe(7);
    expect(quantizeToStep({ playheadCol: 1, elapsedMs: -5 * STEP, stepMs: STEP, steps: 8 })).toBe(4);
    for (const e of [-10 * STEP, -3.5 * STEP, -1, 0, 7 * STEP]) {
      const col = quantizeToStep({ playheadCol: 2, elapsedMs: e, stepMs: STEP, steps: 8 });
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(8);
    }
  });

  it('avance toujours comme avant pour un temps écoulé positif', () => {
    // La règle d'origine reste vraie : au-delà de la moitié, c'est le suivant.
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 99, stepMs: STEP, steps: 8 })).toBe(3);
    expect(quantizeToStep({ playheadCol: 3, elapsedMs: 101, stepMs: STEP, steps: 8 })).toBe(4);
  });
});

/* Le cas Bluetooth, en chiffres — parce que la question s'est posée deux fois.
 *
 * Proposition de Yann (2026-08-24) : « baisser la qualité de l'audio quand on
 * enregistre au clavier et remonter la qualité ensuite », l'objectif étant de
 * « pouvoir enregistrer en rythme avec la musique ».
 *
 * Ce que ces tests montrent, sans avoir à en discuter :
 *   · rogner nos propres millisecondes NE SUFFIT PAS quand le retard vient du
 *     casque — même en dépensant tout ce qu'on a (32 ms de tampon ramenées à
 *     8, soit le réglage qui avait rendu « le son moche »), la note tombe
 *     toujours sur le pas suivant ;
 *   · le retard CONNU, lui, s'annule complètement, quelle que soit sa taille.
 *
 * Autrement dit : ce n'est pas la taille du délai qui décide si on enregistre
 * en rythme, c'est le fait de le connaître. C'est l'objet du calibrage
 * (ui/latence.svelte.ts), pas d'un compromis sur la qualité.
 *
 * Cadre commun : 120 bpm, ligne de 8 pas sur une mesure -> un pas = 250 ms.
 * Casque A2DP : tout est entendu 150 ms trop tard. Le joueur joue en mesure
 * avec CE QU'IL ENTEND, donc son doigt tombe 150 ms après le pas réel.
 */
describe('enregistrer en rythme malgré un casque Bluetooth', () => {
  const PAS = 250; // ms — une croche à 120 bpm
  const RETARD_CASQUE = 150; // ms — A2DP, ordre de grandeur courant
  const VISE = 4; // le pas que le joueur croit viser

  it('sans correction, la note tombe un pas trop loin', () => {
    expect(
      quantizeToStep({ playheadCol: VISE, elapsedMs: RETARD_CASQUE, stepMs: PAS, steps: 8 }),
    ).toBe(VISE + 1);
  });

  it('rogner nos propres millisecondes ne rattrape pas le casque', () => {
    // Le maximum que l'appli puisse gagner en dégradant sa sortie : 32 ms de
    // tampon ramenées à 8 (« latencyHint: 0.001 »), soit 24 ms. Elles se
    // retranchent du retard perçu — et ne changent rien au résultat.
    const GAIN_MAXIMUM_EN_DEGRADANT = 24;
    expect(
      quantizeToStep({
        playheadCol: VISE,
        elapsedMs: RETARD_CASQUE - GAIN_MAXIMUM_EN_DEGRADANT,
        stepMs: PAS,
        steps: 8,
      }),
    ).toBe(VISE + 1);
  });

  it('le retard mesuré, lui, ramène la note sur le pas visé', () => {
    // `NotePad` calcule `elapsedMs = maintenant - stepStartedAt - latence.ms`.
    expect(
      quantizeToStep({
        playheadCol: VISE,
        elapsedMs: RETARD_CASQUE - RETARD_CASQUE,
        stepMs: PAS,
        steps: 8,
      }),
    ).toBe(VISE);
  });

  it('et il tolère l’imprécision humaine autour du temps', () => {
    // ±40 ms de jeu autour du clic : on reste sur le pas visé tant qu'on est
    // dans la demi-largeur du pas (125 ms ici).
    for (const jeu of [-40, -20, 0, 20, 40]) {
      expect(
        quantizeToStep({
          playheadCol: VISE,
          elapsedMs: RETARD_CASQUE + jeu - RETARD_CASQUE,
          stepMs: PAS,
          steps: 8,
        }),
      ).toBe(VISE);
    }
  });

  it('un retard DEUX fois plus gros s’annule tout aussi bien', () => {
    // 300 ms — un casque lent, ou un casque + une dalle tactile. La correction
    // ne dépend pas de la taille du retard, seulement de sa connaissance.
    const LENT = 300;
    expect(quantizeToStep({ playheadCol: VISE, elapsedMs: LENT, stepMs: PAS, steps: 8 })).toBe(
      (VISE + 1) % 8,
    );
    expect(quantizeToStep({ playheadCol: VISE, elapsedMs: LENT - LENT, stepMs: PAS, steps: 8 })).toBe(
      VISE,
    );
  });
});
