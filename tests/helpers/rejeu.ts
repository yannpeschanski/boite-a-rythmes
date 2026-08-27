/* Rejeu du scheduler SANS Web Audio — le harnais, partagé.
 *
 * ⚠️ Extrait de `tests/scheduler.test.ts`, où il vivait, le jour où un second
 * fichier en a eu besoin (`feel-ecrit.test.ts`). Deux copies d'un harnais qui
 * doit rester aligné sur `renderPattern` finiraient par diverger, et celle qui
 * diverge cesse silencieusement de protéger ce qu'elle croit protéger — même
 * raison que le comparateur unique de `comparerGrilles` (CLAUDE.md).
 *
 * Il rejoue EXACTEMENT la boucle de `renderPattern` (render-offline.ts) :
 * mesure par mesure, drum puis synthé, mêmes curseurs initiaux, même RNG
 * seedé. Si cette boucle diverge un jour de celle de l'export, le rejeu cesse
 * de protéger l'export — le garder aligné fait partie du contrat.
 */
import type { PatternStateV2 } from '../../src/model/types';
import {
  scheduleDrumWindow,
  scheduleSynthWindow,
  type Cursors,
  type SynthCursors,
} from '../../src/engine/scheduler';
import type { DrumKit } from '../../src/engine/voices/drums';
import type { SynthKit } from '../../src/engine/voices/synth';
import { barDuration } from '../../src/engine/groove';
import { makeSeededRng } from '../../src/engine/rng';

export type Ev = string;

export function makeRecorders(events: Ev[]) {
  // Temps et gains arrondis : on verrouille la SÉQUENCE des tirages, pas la
  // dernière décimale d'un flottant, qui peut bouger avec le moteur JS sans
  // que le rendu change.
  const n = (v: number) => v.toFixed(4);

  const drum = {
    playKick: (t: number, g: number) => events.push(`kick ${n(t)} ${n(g)}`),
    playSnare: (t: number, g: number) => events.push(`snare ${n(t)} ${n(g)}`),
    playRimshot: (t: number, g: number) => events.push(`rim ${n(t)} ${n(g)}`),
    playClap: (t: number, g: number) => events.push(`clap ${n(t)} ${n(g)}`),
    playShaker: (t: number, g: number) => events.push(`shaker ${n(t)} ${n(g)}`),
    playHatClosed: (t: number, g: number) => events.push(`hatC ${n(t)} ${n(g)}`),
    playHatOpen: (t: number, g: number) => events.push(`hatO ${n(t)} ${n(g)}`),
  } as unknown as DrumKit;

  const synth = {
    syncDroneMode: () => {},
    stopDrone: (t: number) => events.push(`droneStop ${n(t)}`),
    updateDrone: (f: number[], t: number) => events.push(`drone ${f.map(n).join(',')} ${n(t)}`),
    playPadChord: (f: number[], t: number) => events.push(`pad ${f.map(n).join(',')} ${n(t)}`),
    playPadArp: (f: number[], t: number) => events.push(`arp ${f.map(n).join(',')} ${n(t)}`),
    playBassNote: (f: number, t: number) => {
      events.push(`bass ${n(f)} ${n(t)}`);
      return f;
    },
    playMelodyNote: (f: number, t: number) => {
      events.push(`melody ${n(f)} ${n(t)}`);
      return f;
    },
  } as unknown as SynthKit;

  return { drum, synth };
}

// Rejoue EXACTEMENT la boucle de `renderPattern` (render-offline.ts) : mesure
// par mesure, drum puis synthé, mêmes curseurs initiaux, même RNG seedé. Si
// cette boucle diverge un jour de celle de l'export, ce test cesse de
// protéger l'export — le garder aligné fait partie du contrat.
// `fillSeed` : graine du SECOND flux, celui réservé aux frappes ajoutées par
// le fill de clap. Séparé pour pouvoir le faire varier SEUL — c'est comme ça
// qu'on prouve qu'il ne touche pas au flux principal.
export function renderEvents(state: PatternStateV2, bars: number, seed: number, fillSeed = 999): Ev[] {
  const events: Ev[] = [];
  const { drum, synth } = makeRecorders(events);
  const rng = makeSeededRng(seed);
  const fillRng = makeSeededRng(fillSeed);
  const barDur = barDuration(state.tempo);

  const cursors: Cursors = {
    kick: { stepIndex: 0, nextStepTime: 0 },
    snare: { stepIndex: 0, nextStepTime: 0 },
    hat: { stepIndex: 0, nextStepTime: 0 },
    clap: { stepIndex: 0, nextStepTime: 0 },
    shaker: { stepIndex: 0, nextStepTime: 0 },
  };
  const synthCursors: SynthCursors = {
    bass: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
    pad: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
    melody: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
  };

  const noop = () => {};
  for (let bar = 0; bar < bars; bar++) {
    const horizon = (bar + 1) * barDur;
    scheduleDrumWindow(
      {
        state,
        kit: drum,
        cursors,
        rng,
        fillRng,
        currentBar: bar,
        breakWindow: null,
        ghostTargetRow: state.ghostRow ?? 'snare',
        emitPlayhead: noop,
      },
      horizon,
    );
    scheduleSynthWindow(
      { state, synth, cursors: synthCursors, rng, breakWindow: null, emitPlayhead: noop, now: bar * barDur },
      horizon,
    );
  }
  return events;
}
