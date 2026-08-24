/* Aucune voix ne programme son enveloppe dans le passé.
 *
 * Ce test remplace la moitié de `latence-audio.test.ts` qui verrouillait
 * l'AVANCE comme marge de sécurité. Le raisonnement d'alors : l'attaque dure
 * 4 ms, donc l'avance doit valoir plusieurs fois 4 ms, sinon un retard du fil
 * principal fait tomber `setValueAtTime` dans le passé, la rampe est sautée et
 * le gain saute — un clic à chaque note (régression du 2026-08-21).
 *
 * Le raisonnement était juste, la protection insuffisante : une marge rend
 * l'accident rare, elle ne l'interdit pas. Une tâche de 30 ms sur le fil
 * principal — un rendu Svelte, un `scrollIntoView`, un GC — passe au travers
 * de n'importe quelle avance raisonnable. `depart.ts` traite la cause : la
 * voix repart de maintenant, avec son attaque entière.
 *
 * Ce qu'on verrouille ici est donc l'INVARIANT, pas le chiffre : quel que soit
 * l'instant demandé, rien n'est programmé avant `currentTime`. C'est ce qui
 * autorise l'avance courte — la retirer, et le clic revient.
 *
 * Le contexte factice est un Proxy : les voix créent une douzaine de types de
 * nœuds et lisent une trentaine de propriétés, les énumérer serait un
 * deuxième moteur à maintenir. On n'observe qu'une chose — les INSTANTS
 * passés à Web Audio.
 */
import { describe, it, expect } from 'vitest';
import { departSur } from '../src/engine/depart';
import { DrumKit } from '../src/engine/voices/drums';
import { SynthKit } from '../src/engine/voices/synth';
import type { GraphNodes } from '../src/engine/graph';
import type { SynthVoice } from '../src/model/types';

describe('departSur — la borne elle-même', () => {
  it('laisse passer un instant futur sans y toucher', () => {
    expect(departSur(10, 10.02)).toBe(10.02);
  });
  it('ramène un instant déjà passé à maintenant', () => {
    expect(departSur(10, 9.97)).toBe(10);
  });
  it("traite l'instant présent comme utilisable", () => {
    expect(departSur(10, 10)).toBe(10);
  });
  it('vaut 0 hors ligne, où tout est dans le futur', () => {
    // OfflineAudioContext : currentTime reste à 0 pendant la programmation,
    // donc la borne ne se déclenche jamais et l'export reste reproductible.
    expect(departSur(0, 3.5)).toBe(3.5);
  });
});

/** Instants programmés, collectés sur tous les nœuds créés. */
let instants: number[] = [];

function faireParam(): Record<string, unknown> {
  const noter = (_v: number, t: number) => {
    instants.push(t);
  };
  return {
    value: 0,
    setValueAtTime: noter,
    linearRampToValueAtTime: noter,
    exponentialRampToValueAtTime: noter,
    setTargetAtTime: (_v: number, t: number) => instants.push(t),
    setValueCurveAtTime: (_c: unknown, t: number) => instants.push(t),
    cancelScheduledValues: (t: number) => instants.push(t),
    cancelAndHoldAtTime: (t: number) => instants.push(t),
  };
}

const NOMS_DE_PARAM = new Set([
  'gain', 'frequency', 'detune', 'Q', 'playbackRate', 'pan', 'delayTime',
  'threshold', 'knee', 'ratio', 'attack', 'release', 'reduction',
]);

function faireNoeud(): unknown {
  const socle: Record<string, unknown> = {};
  return new Proxy(socle, {
    get(cible, prop: string) {
      if (prop in cible) return cible[prop];
      if (NOMS_DE_PARAM.has(prop)) {
        const p = faireParam();
        cible[prop] = p;
        return p;
      }
      if (prop === 'start' || prop === 'stop') {
        return (t?: number) => {
          if (typeof t === 'number') instants.push(t);
        };
      }
      if (prop === 'connect') return () => faireNoeud();
      if (prop === 'disconnect' || prop === 'addEventListener') return () => {};
      if (prop === 'getChannelData') return () => new Float32Array(1024);
      return undefined;
    },
    set(cible, prop: string, valeur) {
      cible[prop] = valeur;
      return true;
    },
  });
}

const MAINTENANT = 12;

function faireContexte(): AudioContext {
  const ctx: Record<string, unknown> = {
    currentTime: MAINTENANT,
    sampleRate: 44100,
    createBuffer: (_c: number, longueur: number) => ({
      getChannelData: () => new Float32Array(longueur),
      length: longueur,
    }),
  };
  return new Proxy(ctx, {
    get(cible, prop: string) {
      if (prop in cible) return cible[prop];
      if (prop.startsWith('create')) return () => faireNoeud();
      return undefined;
    },
  }) as unknown as AudioContext;
}

/** Un graphe factice : les voix n'en lisent que le contexte et des bus. */
function faireGraphe(ctx: AudioContext): GraphNodes {
  return new Proxy(
    { ctx },
    {
      get(cible: Record<string, unknown>, prop: string) {
        if (prop in cible) return cible[prop];
        const n = faireNoeud();
        cible[prop] = n;
        return n;
      },
    },
  ) as unknown as GraphNodes;
}

const VOIX_SYNTHE: SynthVoice = {
  type: 'sawtooth',
  cutoff: 900,
  resonance: 1,
  attack: 0.01,
  release: 0.3,
  detune: 0,
  subLevel: 0,
  chorusMix: 0,
  vibratoDepth: 0,
  tone: 0,
} as SynthVoice;

describe('les voix ne programment jamais dans le passé', () => {
  /* 40 ms de retard : l'ordre de grandeur d'une longue tâche du fil principal
     (rendu Svelte, défilement, GC). C'est le cas que l'ancienne marge de 20 ms
     ne couvrait pas. */
  const INSTANT_PASSE = MAINTENANT - 0.04;

  it('batterie — les sept voix repartent de maintenant', () => {
    const ctx = faireContexte();
    const kit = new DrumKit(faireGraphe(ctx));
    instants = [];
    kit.playKick(INSTANT_PASSE, 0.8);
    kit.playSnare(INSTANT_PASSE, 0.8);
    kit.playRimshot(INSTANT_PASSE, 0.8);
    kit.playClap(INSTANT_PASSE, 0.8);
    kit.playShaker(INSTANT_PASSE, 0.8);
    kit.playHatClosed(INSTANT_PASSE, 0.8);
    kit.playHatOpen(INSTANT_PASSE, 0.8);
    expect(instants.length).toBeGreaterThan(20);
    expect(Math.min(...instants)).toBeGreaterThanOrEqual(MAINTENANT);
  });

  it('synthé — note, basse, mélodie et accord repartent de maintenant', () => {
    const ctx = faireContexte();
    const kit = new SynthKit(faireGraphe(ctx), false);
    instants = [];
    kit.playBassNote(110, INSTANT_PASSE, 0.5, 0.45, VOIX_SYNTHE, null);
    kit.playMelodyNote(440, INSTANT_PASSE, 0.5, 0.4, VOIX_SYNTHE, null);
    kit.playPadChord([220, 277, 330], INSTANT_PASSE, 0.6, 0.3, VOIX_SYNTHE, 0, 0, null);
    expect(instants.length).toBeGreaterThan(10);
    expect(Math.min(...instants)).toBeGreaterThanOrEqual(MAINTENANT);
  });

  it("l'attaque garde sa durée entière malgré le retard", () => {
    // Le vrai symptôme n'était pas « un instant dans le passé », c'était une
    // RAMPE ÉCRASÉE : départ et arrivée tous deux passés, donc appliqués
    // ensemble. On vérifie qu'il reste un écart entre le premier instant et
    // le suivant — l'attaque existe encore.
    const ctx = faireContexte();
    const kit = new DrumKit(faireGraphe(ctx));
    instants = [];
    kit.playKick(INSTANT_PASSE, 0.8);
    const tries = [...new Set(instants)].sort((a, b) => a - b);
    expect(tries.length).toBeGreaterThan(1);
    expect(tries[1] - tries[0]).toBeGreaterThan(0);
  });

  it('un instant futur reste intact — la borne ne déplace rien d’autre', () => {
    const ctx = faireContexte();
    const kit = new DrumKit(faireGraphe(ctx));
    instants = [];
    const futur = MAINTENANT + 0.25;
    kit.playKick(futur, 0.8);
    expect(Math.min(...instants)).toBe(futur);
  });
});
