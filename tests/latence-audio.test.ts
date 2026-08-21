/* Les deux constantes de latence du moteur, et pourquoi elles ont un plancher.
 *
 * Écrit après une régression MISE EN LIGNE : l'avance de déclenchement avait été
 * ramenée à 5 ms pour gagner de la latence, et le son s'est dégradé — « ça marche
 * très bien mais le son est devenu moche » (Yann, 2026-08-21).
 *
 * La raison tient en deux lignes, celles que TOUTES les voix exécutent :
 *
 *     g.gain.setValueAtTime(0.0001, time);
 *     g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
 *
 * L'attaque dure 4 ms. Si l'avance est du même ordre, l'attaque entière tient
 * dans la marge : que le fil principal prenne quelques millisecondes de retard
 * entre la lecture de `currentTime` et le rendu, et `setValueAtTime` tombe dans
 * le passé. Web Audio l'applique alors immédiatement, la rampe est sautée, le
 * gain saute — un clic à chaque note.
 *
 * Ce test ne mesure pas du son : il verrouille le RAPPORT entre l'avance et
 * l'attaque, pour que la prochaine tentative d'optimisation bute sur une
 * assertion au lieu d'aller s'entendre en production.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/engine/AudioEngine.ts', import.meta.url), 'utf8');

function constante(nom: string): string {
  const m = source.match(new RegExp(`const ${nom}[^=]*=\\s*([^;]+);`));
  if (!m) throw new Error(`constante introuvable : ${nom}`);
  return m[1].trim();
}

/** La plus courte attaque du banc de voix, en secondes (drums.ts, snare/rimshot). */
const ATTAQUE_LA_PLUS_COURTE = 0.003;

describe('avance de déclenchement — le plancher qu’impose l’attaque des voix', () => {
  const avance = Number(constante('AVANCE_DECLENCHEMENT'));

  it('est un nombre de secondes plausible', () => {
    expect(Number.isFinite(avance)).toBe(true);
    expect(avance).toBeGreaterThan(0);
    expect(avance).toBeLessThan(0.1);
  });

  it('laisse à l’attaque au moins cinq fois sa durée pour se dérouler', () => {
    // À 5 ms d'avance pour 3-4 ms d'attaque, le moindre retard du fil principal
    // fait tomber `setValueAtTime` dans le passé et la rampe est sautée. C'est
    // la régression qui a motivé ce fichier.
    expect(avance).toBeGreaterThanOrEqual(ATTAQUE_LA_PLUS_COURTE * 5);
  });

  it('reste sous le seuil de perception d’un instrument', () => {
    // L'autre bord : au-delà de ~30 ms le décalage s'entend. L'avance seule ne
    // doit donc jamais manger tout le budget — le tampon de sortie s'y ajoute.
    expect(avance).toBeLessThanOrEqual(0.025);
  });
});

describe('tampon de sortie — un préréglage sûr, pas le minimum matériel', () => {
  const tampon = constante('TAMPON_SORTIE');

  it('n’est pas revenu à « playback » : 72 ms mesurés, hors budget', () => {
    expect(tampon).not.toContain('playback');
  });

  it('n’est pas une valeur numérique agressive', () => {
    // `latencyHint: 0.001` donne 128 échantillons et 8 ms — essayé en
    // production, le son s'est dégradé. Le préréglage 'interactive' est
    // dimensionné par le navigateur pour ne pas décrocher.
    expect(tampon).toContain('interactive');
  });
});
