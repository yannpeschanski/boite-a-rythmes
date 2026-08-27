import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import { LEVELS, type GrilleEcrite } from '../src/model/presets/levels';
import { ACTES } from '../src/model/carriere';
import { renderEvents } from './helpers/rejeu';
import type { PatternStateV2 } from '../src/model/types';

/* Le FEEL d'une grille écrite s'ENTEND — mesuré, pas supposé.
 *
 * ⚠️ Pourquoi ce fichier existe. Une grille écrite pose des cases ; le swing,
 * le décalage et la traîne ne changent AUCUNE case, ils changent l'instant où
 * elles sonnent. Trois pièges, tous vérifiables ici et invisibles à la
 * lecture :
 *
 *   - le swing ne retarde que les pas IMPAIRS. Un motif posé sur [0, 2, 4, 6]
 *     ne bouge pas d'un micro-seconde, quel que soit le réglage — c'est le
 *     défaut déjà documenté dans `parametres.ts` ;
 *   - le décalage était FORCÉ à zéro sur toute grille écrite. Un niveau qui
 *     l'enseigne n'en jouait aucun ;
 *   - la traîne est GLOBALE, donc inaudible dans une boucle. C'est la raison
 *     pour laquelle les niveaux 15 et 18 ne sont pas ressuscités, et ce
 *     fichier en fait la preuve plutôt qu'une affirmation.
 *
 * On rejoue le scheduler sans Web Audio (`tests/helpers/rejeu.ts`) et on lit
 * les INSTANTS des frappes.
 */

/** Un état bâti comme `startLevel` le fait à partir d'une grille écrite. */
function etatDe(g: GrilleEcrite, tempo = 90): PatternStateV2 {
  const s = defaultState();
  s.tempo = tempo;
  // Rien qui consomme le hasard : on mesure des instants, pas des tirages.
  s.ghostDensity = 0;
  s.spontRoll = 0;
  s.randomVelocity = 0;
  s.fillEvery = 0;
  s.swing = g.swing ?? 0;
  s.drag = g.drag ?? 0;
  for (const r of ['kick', 'snare', 'hat'] as const) {
    s.rows[r].subdiv = g.subdiv[r];
    s.rows[r].pattern = g[r].slice(0, g.subdiv[r]) as PatternStateV2['rows']['kick']['pattern'];
    s.rows[r].rolls = new Array(g.subdiv[r]).fill(1);
    s.rows[r].shiftPct = g.shift?.[r] ?? 0;
  }
  for (const r of ['clap', 'shaker'] as const) s.rows[r].pattern = new Array(s.rows[r].subdiv).fill(0);
  for (const r of ['bass', 'pad', 'melody'] as const) s.synthRows[r].muted = true;
  return s;
}

/** Les instants d'une ligne, sur une mesure. */
function instants(s: PatternStateV2, prefixe: string): number[] {
  return renderEvents(s, 1, 1)
    .filter((e) => e.startsWith(prefixe + ' '))
    .map((e) => Number(e.split(' ')[1]));
}

const grilleDe = (id: number) => LEVELS.find((l) => l.id === id)!.grille!;

describe('le balancement écrit s’entend, et il ne bouge que ce qu’il doit', () => {
  const leger = etatDe(grilleDe(14));
  const franc = etatDe(grilleDe(17));

  it('les deux niveaux ont bien la même grille — sinon la comparaison ne dit rien', () => {
    const g14 = grilleDe(14);
    const g17 = grilleDe(17);
    expect([g14.subdiv, g14.kick, g14.snare, g14.hat]).toEqual([g17.subdiv, g17.kick, g17.snare, g17.hat]);
  });

  it('le charley d’un balancement franc ne tombe PAS aux mêmes instants', () => {
    const a = instants(leger, 'hatC');
    const b = instants(franc, 'hatC');
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(b).not.toEqual(a);
  });

  it('⚠️ et seuls les pas IMPAIRS bougent — c’est ça, le swing', () => {
    // Le piège de `parametres.ts` : un motif sur les pas pairs ne bouge pas
    // d'un micro-seconde. C'est pour ça que la grille est en croches pleines.
    const a = instants(leger, 'hatC');
    const b = instants(franc, 'hatC');
    a.forEach((t, i) => {
      if (i % 2 === 0) expect(b[i], `pas pair ${i}`).toBeCloseTo(t, 6);
      else expect(b[i], `pas impair ${i}`).toBeGreaterThan(t);
    });
  });

  it('le kick, lui, ne bouge pas — il est sur les temps', () => {
    expect(instants(franc, 'kick')).toEqual(instants(leger, 'kick'));
  });
});

describe('le décalage par ligne s’entend CONTRE les autres lignes', () => {
  const droit = etatDe(grilleDe(14));
  const decale = etatDe(grilleDe(23));

  it('⚠️ le niveau 23 pose un décalage réel — il était forcé à zéro', () => {
    // Le défaut que ce chantier corrige : `startLevel` écrasait le décalage de
    // toute grille écrite. Le niveau demandait d'entendre ce qui n'était pas
    // joué.
    expect(grilleDe(23).shift?.hat).toBeGreaterThan(0);
  });

  it('le charley arrive plus tard, le kick et la claire ne bougent pas', () => {
    const sansSwing = etatDe({ ...grilleDe(23), swing: 0, shift: {} });
    const hatDroit = instants(sansSwing, 'hatC');
    const hatDecale = instants(decale, 'hatC');
    expect(hatDecale.length).toBe(hatDroit.length);
    hatDecale.forEach((t, i) => expect(t, `charley ${i}`).toBeGreaterThan(hatDroit[i]));
    expect(instants(decale, 'kick')).toEqual(instants(sansSwing, 'kick'));
    expect(instants(decale, 'snare')).toEqual(instants(sansSwing, 'snare'));
  });

  it('et il ne se confond pas avec le balancement : ici tous les pas glissent', () => {
    // Le swing ne retarde qu'un pas sur deux ; le décalage les retarde TOUS.
    // C'est exactement ce que le niveau 47 (« swing ou décalage ? ») demande
    // de distinguer.
    const sansSwing = etatDe({ ...grilleDe(23), swing: 0, shift: {} });
    const ecarts = instants(decale, 'hatC').map((t, i) => +(t - instants(sansSwing, 'hatC')[i]).toFixed(6));
    expect(new Set(ecarts).size, 'un décalage est CONSTANT').toBe(1);
    expect(ecarts[0]).toBeGreaterThan(0);
    expect(droit).toBeTruthy();
  });
});

describe('⚠️ la TRAÎNE, elle, est inaudible dans une boucle', () => {
  /* La preuve, en code, de la décision de ne PAS ressusciter les niveaux 15 et
   * 18 (« Traîne (drag) »). `drag` est un champ GLOBAL du format v2 : il
   * retarde tout, du même montant. Dans une boucle qui tourne, retarder tout
   * de la même quantité ne s'entend contre rien — c'est déjà la raison pour
   * laquelle la traîne est hors du catalogue de `parametres.ts`.
   *
   * Un exercice « reproduis ce rythme, il traîne » demanderait donc d'entendre
   * une différence qui n'existe pas. */
  it('elle décale TOUT du même montant — donc rien, relativement', () => {
    const sans = etatDe(grilleDe(14));
    const avec = etatDe({ ...grilleDe(14), drag: 15 });
    const lignes = ['kick', 'snare', 'hatC'] as const;
    const ecarts = lignes.flatMap((l) => {
      const a = instants(sans, l);
      const b = instants(avec, l);
      return b.map((t, i) => +(t - a[i]).toFixed(6));
    });
    expect(new Set(ecarts).size, 'la traîne n’est pas uniforme').toBe(1);
    expect(ecarts[0], 'la traîne ne fait rien du tout').toBeGreaterThan(0);
  });

  it('et aucun acte ne cite un niveau de traîne', () => {
    // Si un acte venait à en citer un, ce test le dirait — et il faudrait
    // d'abord expliquer contre quoi la traîne s'entendrait.
    const traine = LEVELS.filter((l) => l.teach.toLowerCase().includes('traîne')).map((l) => l.id);
    expect(traine.length, 'les niveaux de traîne ont disparu du réservoir').toBeGreaterThan(0);
    const cites = ACTES.flatMap((a) =>
      a.etapes.filter((e) => e.kind === 'exercice').map((e) => (e as { niveau: number }).niveau),
    );
    for (const id of traine) expect(cites, `niveau ${id} cité`).not.toContain(id);
  });
});
