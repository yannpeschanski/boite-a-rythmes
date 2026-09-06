/* La bascule de motif quantisée à la mesure — la pièce porteuse du
 * macro-séquenceur (bande d'architecture, docs/plan/06).
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Enchaîner deux séquences en direct ne demande
 * pas d'appeler `pattern.loadJson` au bon moment : `SCHEDULE_AHEAD` vaut
 * 0,25 s, soit DEUX pas de doubles croches à 120 BPM. Une bascule faite depuis
 * l'interface, même à l'instant perçu comme le bon, laisse les deux premiers
 * pas de la nouvelle section jouer l'ANCIEN motif. On l'entend, et on cherche
 * la cause dans le motif au lieu de la chercher dans l'horizon.
 *
 * La sortie n'est donc pas une meilleure synchronisation côté UI mais une
 * propriété du moteur, et c'est elle qui est verrouillée ici :
 *
 *   1. tant qu'une bascule est en attente, RIEN n'est programmé au-delà de la
 *      mesure — c'est ce qui rend le point 2 possible ;
 *   2. au basculement, les curseurs repartent de zéro SANS doubler une note
 *      déjà programmée (ce serait le cas si l'horizon n'était pas écrêté) ;
 *   3. la mesure de section repart à zéro, pour que les fills tombent à la fin
 *      d'une section et non à la mesure 3 de la lecture ;
 *   4. et la bascule demandée À LA MAIN tombe à la fin du CYCLE, pas de la
 *      mesure (voir le second bloc, docs/plan/07).
 *
 * Le moteur est monté à la main (`Object.create(AudioEngine.prototype)`),
 * même technique que `tests/latence-audio.test.ts` : ni Web Audio, ni DOM.
 */
import { describe, it, expect } from 'vitest';
import { AudioEngine } from '../src/engine/AudioEngine';
import { defaultState } from '../src/model/defaults';
import { barDuration } from '../src/engine/groove';
import { makeRecorders } from './helpers/rejeu';
import type { PatternStateV2 } from '../src/model/types';

/** Un moteur pilotable pas à pas, sans contexte audio. */
function monterMoteur(etat: () => PatternStateV2) {
  const events: string[] = [];
  const { drum, synth } = makeRecorders(events);
  const ctx = { currentTime: 0, outputLatency: 0.02 };
  const engine = Object.create(AudioEngine.prototype) as AudioEngine;
  Object.assign(engine, {
    ctx,
    graph: {},
    kit: drum,
    synth,
    isPlaying: true,
    getState: etat,
    ghostTargetRow: 'snare',
    cursors: {
      kick: { stepIndex: 0, nextStepTime: 0 },
      snare: { stepIndex: 0, nextStepTime: 0 },
      hat: { stepIndex: 0, nextStepTime: 0 },
      clap: { stepIndex: 0, nextStepTime: 0 },
      shaker: { stepIndex: 0, nextStepTime: 0 },
    },
    synthCursors: {
      bass: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
      pad: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
      melody: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
    },
    currentBar: 0,
    sectionStartBar: 0,
    nextBarTime: barDuration(etat().tempo),
    pendingSwap: null,
    pendingSwapBar: null,
    breakRequested: false,
    breakWindow: null,
    fillRequested: false,
    forcedFillBar: null,
    playheadQueue: [],
    liveMute: {},
    liveHatRoll: null,
    liveKickRoll: null,
    liveSnareRoll: null,
    liveSidechainDepth: null,
    liveGrooveOverride: {},
    liveSynthOverride: {},
    liveSynthGlobalOverride: {},
    liveVoicePresetIndex: {},
  });
  const prive = engine as unknown as { tick(): void };
  /** Avance l'horloge audio par pas de 25 ms (LOOKAHEAD) et tique. */
  const avancer = (secondes: number) => {
    const pas = 0.025;
    for (let t = 0; t < secondes; t += pas) {
      ctx.currentTime += pas;
      prive.tick();
    }
  };
  return { engine, events, ctx, avancer, tick: () => prive.tick() };
}

/** Les instants des coups de kick programmés, dans l'ordre. */
const instantsKick = (events: string[]) =>
  events.filter((e) => e.startsWith('kick ')).map((e) => Number(e.split(' ')[1]));

describe('bascule de motif — quantisée à la mesure', () => {
  it('ne programme RIEN au-delà de la mesure tant qu’une bascule est en attente', () => {
    const etat = defaultState();
    const { engine, events, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    engine.queueSwapAtNextBar(() => {});
    // On avance jusqu'à frôler la mesure sans l'atteindre : sans écrêtage,
    // l'horizon (0,25 s) aurait largement débordé dedans.
    avancer(mesure - 0.2);

    const instants = instantsKick(events);
    // ⚠️ Non-vacuité : sans cette ligne, le test passerait aussi si le moteur
    // ne programmait rien du tout.
    expect(instants.length).toBeGreaterThan(0);
    /* ⚠️ La borne est `>=`, pas `>` — et c'est tout le test. Le pas qui tombe
       EXACTEMENT sur la mesure est le PREMIER pas de la section suivante,
       donc précisément celui qui ne doit pas être écrit avec l'ancien motif.
       Écrit d'abord avec `>`, ce test passait sans l'écrêtage : il regardait
       un pas plus loin que le défaut. */
    const debordent = instants.filter((t) => t >= mesure - 1e-9);
    expect(debordent).toEqual([]);
  });

  it('bascule AVANT la mesure — la nouvelle section sonne dès son premier pas', () => {
    let etat = defaultState();
    const { engine, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    const suivant = defaultState();
    engine.queueSwapAtNextBar(() => {
      etat = suivant;
    });
    // Juste avant la mesure : la bascule doit déjà avoir eu lieu, sinon les
    // premiers pas de la section suivante seraient programmés avec l'ancien
    // motif (le défaut que ce fichier existe pour interdire).
    avancer(mesure - 0.01);
    expect(etat).toBe(suivant);
  });

  it('ne double aucune note en remettant les curseurs à zéro', () => {
    const etat = defaultState();
    const { engine, events, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    engine.queueSwapAtNextBar(() => {});
    avancer(mesure * 2);

    const instants = instantsKick(events);
    // Chaque instant programmé est unique : un doublon signifierait qu'un pas
    // déjà écrit avec l'ancien motif a été réécrit après la remise à zéro.
    expect(new Set(instants).size).toBe(instants.length);
    // Et la suite reste croissante — aucun retour en arrière du curseur.
    expect([...instants].sort((a, b) => a - b)).toEqual(instants);
  });

  it('fait repartir la mesure de section à zéro — c’est ce qui recale les fills', () => {
    const etat = defaultState();
    const { engine, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    avancer(mesure * 3);
    expect(engine.bar).toBeGreaterThanOrEqual(2);
    expect(engine.barDansSection).toBe(engine.bar);

    engine.queueSwapAtNextBar(() => {});
    avancer(mesure);
    // La section vient de commencer : sa première mesure porte le numéro 0,
    // quelle que soit la mesure absolue de la lecture.
    expect(engine.barDansSection).toBe(0);
    expect(engine.bar).toBeGreaterThan(0);
  });

  it('applique tout de suite à l’arrêt — il n’y a pas de mesure à attendre', () => {
    let applique = false;
    const etat = defaultState();
    const { engine } = monterMoteur(() => etat);
    Object.assign(engine, { isPlaying: false });

    engine.queueSwapAtNextBar(() => {
      applique = true;
    });
    expect(applique).toBe(true);
  });
});

/* LA BASCULE À LA FIN DU CYCLE — le défaut mesuré dans docs/plan/07.
 *
 * ⚠️ POURQUOI CE SECOND BLOC. L'avance AUTOMATIQUE de la bande tombait déjà
 * sur une frontière de cycle : une section se compte en tours du motif. La
 * bascule DEMANDÉE À LA MAIN, elle, tombait à la mesure suivante — mesuré sur
 * les 34 presets, dont 30 ont un cycle propre de 4 mesures, elle tombait juste
 * 27,9 % du temps. Sept appuis sur dix coupaient la progression d'accords en
 * plein milieu, et `resetCursorsAt` la faisait recommencer : on l'entendait
 * deux fois. Les deux méthodes coexistent parce que les deux gestes existent.
 */
describe('bascule de motif — quantisée au CYCLE', () => {
  it('attend la fin du cycle, pas la mesure suivante', () => {
    let applique = false;
    const etat = defaultState();
    const { engine, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    engine.queueSwapAtEndOfCycle(4, () => {
      applique = true;
    });
    // Trois mesures plus tard, on est encore DANS le cycle : rien ne bouge.
    avancer(mesure * 3 - 0.05);
    expect(applique).toBe(false);
    // La quatrième la porte.
    avancer(mesure);
    expect(applique).toBe(true);
  });

  it('tombe sur la frontière du cycle même si on appuie en plein milieu', () => {
    let barreALaBascule: number | null = null;
    const etat = defaultState();
    const { engine, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    // On laisse passer deux mesures : on appuie donc au milieu du premier
    // cycle de quatre.
    avancer(mesure * 2 + 0.1);
    expect(engine.barDansSection).toBe(2);
    engine.queueSwapAtEndOfCycle(4, () => {
      barreALaBascule = engine.bar;
    });
    avancer(mesure * 3);
    /* ⚠️ Le point du test : la bascule tombe à la mesure 4 (la fin du premier
       cycle), pas à la 3 (la mesure suivante). La bascule s'applique JUSTE
       AVANT la mesure qu'elle ouvre, donc le compteur vaut encore 3. */
    expect(barreALaBascule).toBe(3);
    expect(engine.barDansSection).toBeLessThan(4);
  });

  it('un cycle de 1 mesure se comporte comme l’ancienne bascule', () => {
    let applique = false;
    const etat = defaultState();
    const { engine, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    engine.queueSwapAtEndOfCycle(1, () => {
      applique = true;
    });
    avancer(mesure);
    expect(applique).toBe(true);
  });

  it('ne bride PAS l’horizon pendant l’attente — seulement à l’approche', () => {
    /* ⚠️ L'écrêtage de l'horizon est ce qui empêche la section suivante d'être
       écrite avec l'ancien motif. Il n'a de raison d'être qu'à la mesure de la
       bascule : le maintenir pendant quatre mesures programmerait court pour
       rien. On vérifie donc qu'on programme bien AU-DELÀ de la mesure tant que
       la bascule est lointaine. */
    const etat = defaultState();
    const { engine, events, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    engine.queueSwapAtEndOfCycle(4, () => {});
    avancer(mesure - 0.05);
    const instants = instantsKick(events);
    expect(instants.length).toBeGreaterThan(0);
    expect(instants.some((t) => t >= mesure)).toBe(true);
  });

  it('annonce combien de mesures il reste — sinon le bouton a l’air cassé', () => {
    const etat = defaultState();
    const { engine, avancer } = monterMoteur(() => etat);
    const mesure = barDuration(etat.tempo);

    expect(engine.mesuresAvantBascule).toBeNull();
    engine.queueSwapAtEndOfCycle(4, () => {});
    expect(engine.mesuresAvantBascule).toBe(4);
    avancer(mesure * 2 + 0.1);
    expect(engine.mesuresAvantBascule).toBe(2);
    engine.cancelQueuedSwap();
    expect(engine.mesuresAvantBascule).toBeNull();
  });

  it('applique tout de suite à l’arrêt — on entend ce qu’on choisit avant ▶', () => {
    let applique = false;
    const etat = defaultState();
    const { engine } = monterMoteur(() => etat);
    Object.assign(engine, { isPlaying: false });

    engine.queueSwapAtEndOfCycle(4, () => {
      applique = true;
    });
    expect(applique).toBe(true);
  });
});
