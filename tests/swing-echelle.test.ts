/* L'ÉCHELLE DU CURSEUR SWING — mesurée, plus devinée.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Un commentaire de `styles.ts` affirmait
 * « 50 est le triolet EXACT ». C'était faux, et personne ne pouvait le voir :
 * aucun test ne regardait OÙ tombe le contretemps. La fiche du garage a donc
 * été bornée 30-55 sur cette fausse échelle, et son preset posé à 45 — au-delà
 * du triolet. Yann l'a signalé deux fois à l'oreille (« pas sûr que ça
 * ressemble à qqch », puis « ça me semble toujours très élevé ») avant que la
 * mesure lui donne raison.
 *
 * Ce qui se mesure ici est un INSTANT, en rejouant le vrai scheduler : la
 * position du contretemps dans sa paire, d'où le ratio de swing. C'est la même
 * méthode que `feel-ecrit.test.ts`, pour la même raison — un balancement ne se
 * lit pas dans une grille.
 */
import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import type { PatternStateV2 } from '../src/model/types';
import { PRESETS } from '../src/model/presets/songs';
import { renderEvents } from './helpers/rejeu';

/** Un charley en seize, toutes les cases, rien d'autre et aucun aléa. */
function etatSwing(swing: number): PatternStateV2 {
  const s = defaultState();
  s.tempo = 120;
  s.swing = swing;
  s.drag = 0;
  s.ghostDensity = 0;
  s.spontRoll = 0;
  s.randomVelocity = 0;
  s.fillEvery = 0;
  /* ⚠️ `rolls` rempli de 1 : à 0 la ligne ne sonne pas du tout. C'est ce qui a
   * rendu ma première sonde muette — le piège coûte dix minutes. */
  s.rows.hat.subdiv = 16;
  s.rows.hat.pattern = new Array(16).fill(1) as PatternStateV2['rows']['hat']['pattern'];
  s.rows.hat.rolls = new Array(16).fill(1) as PatternStateV2['rows']['hat']['rolls'];
  s.rows.hat.shiftPct = 0;
  for (const r of ['kick', 'snare', 'clap', 'shaker'] as const)
    s.rows[r].pattern = new Array(s.rows[r].subdiv).fill(0) as PatternStateV2['rows']['kick']['pattern'];
  for (const r of ['bass', 'pad', 'melody'] as const) s.synthRows[r].muted = true;
  return s;
}

/** Le ratio de swing effectif : 1 = droit, 2 = triolet. */
function ratioMesure(swing: number): number {
  const t = renderEvents(etatSwing(swing), 1, 1)
    .filter((e) => e.startsWith('hatC ') || e.startsWith('hatO '))
    .map((e) => Number(e.split(' ')[1]))
    .sort((a, b) => a - b);
  expect(t.length, `swing ${swing} : la ligne ne sonne pas`).toBeGreaterThan(2);
  return (t[1] - t[0]) / (t[2] - t[1]);
}

describe('où tombe le contretemps', () => {
  it('à 0, la boucle est DROITE', () => {
    expect(ratioMesure(0)).toBeCloseTo(1, 2);
  });

  /* ⚠️ LE CHIFFRE QUI COMPTE, et celui que la documentation donnait faux. 33
   * est le shuffle : au-dessous ça balance à peine, au-dessus ça dépasse le
   * triolet. Toute fourchette de shuffle se centre là. */
  it('⚠️ le TRIOLET tombe à 33 — pas à 50', () => {
    expect(ratioMesure(33), 'le triolet a bougé').toBeCloseTo(2, 1);
    expect(ratioMesure(50), '50 n’est PAS le triolet').toBeCloseTo(3, 1);
  });

  it('⚠️ à 75, le contretemps est collé à la frappe suivante', () => {
    // 7:1 — ce n'est plus un balancement, c'est un flam.
    expect(ratioMesure(75)).toBeGreaterThan(6);
  });

  it('l’échelle est MONOTONE — un curseur qui monte balance plus', () => {
    let precedent = 0;
    for (const v of [0, 10, 20, 33, 45, 60, 75]) {
      const r = ratioMesure(v);
      expect(r, `swing ${v} ne balance pas plus que ${precedent}`).toBeGreaterThan(precedent);
      precedent = r;
    }
  });
});

/* ⚠️ ET LE CATALOGUE NE DOIT PAS DÉPASSER LE TRIOLET. Aucun des 34 morceaux
 * n'est censé sonner « cassé » : c'est un catalogue de genres, pas d'effets.
 * Le garage y était à 45 (2,63:1) et c'est ce que l'oreille a attrapé. Le
 * curseur, lui, garde sa course jusqu'à 75 — l'Atelier est un outil, y
 * composer quelque chose de cassé reste permis. */
describe('⚠️ aucun des 34 presets ne dépasse le triolet', () => {
  it('le plus balancé du catalogue tombe AU PLUS sur le triolet', () => {
    const pires = PRESETS.map((p) => ({ id: p.id, swing: p.swing ?? 0 })).sort((a, b) => b.swing - a.swing);
    expect(pires[0].swing, `« ${pires[0].id} » balance au-delà du triolet`).toBeLessThanOrEqual(35);
    // Et la mesure le confirme, au lieu de faire confiance au nombre.
    expect(ratioMesure(pires[0].swing)).toBeLessThan(2.2);
  });
});
