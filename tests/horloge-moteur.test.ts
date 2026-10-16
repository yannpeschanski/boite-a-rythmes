/* Le moteur branché sur l'horloge ENTENDUE — le câblage, sur un téléphone feint.
 *
 * ⚠️ « Il s'agit avant tout de bien synchroniser le son à l'image et que le
 * tempo soit propre » (2026-10-15). `tests/horloge-entendue.test.ts` tient le
 * calcul ; celui-ci tient ce que le moteur en fait (CLAUDE.md : quand un module
 * pur est testé et que le comportement reste faux, suspecter le câblage).
 *
 * Le contexte feint est le téléphone de Yann sous Chrome : `currentTime` monte
 * par MARCHES de 171 ms, `outputLatency` déclare 448 ms, et l'horodatage de
 * sortie avance sans à-coups. L'horloge murale (`performance.now`) est
 * pilotée, l'ordonnanceur tique toutes les 25 ms, l'image tourne à 60 Hz.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { AudioEngine } from '../src/engine/AudioEngine';
import { defaultState } from '../src/model/defaults';
import { barDuration } from '../src/engine/groove';
import { makeRecorders } from './helpers/rejeu';
import { oublierSortie, sortieLente } from '../src/engine/tampon';
import type { PatternStateV2 } from '../src/model/types';

vi.mock('../src/engine/metronome', () => ({ scheduleClick: () => {} }));

const MARCHE = 0.171;
const RETARD = 0.448;

/** Un téléphone feint : l'horloge murale avance quand on le dit. */
function telephone(opts: { gecko?: boolean } = {}) {
  let murMs = 50_000;
  const debutMs = murMs;
  vi.spyOn(performance, 'now').mockImplementation(() => murMs);
  const ecoule = () => (murMs - debutMs) / 1000;
  const entendu = (m = murMs) => (m - debutMs) / 1000 - RETARD;
  let lecturesSortie = 0;
  let horodatages = 0;
  const ctx = {
    state: 'running',
    sampleRate: 48000,
    baseLatency: opts.gecko ? 0 : MARCHE,
    get currentTime() {
      return (Math.floor(ecoule() / MARCHE) + 1) * MARCHE;
    },
    get outputLatency() {
      lecturesSortie++;
      return RETARD;
    },
    getOutputTimestamp() {
      horodatages++;
      if (opts.gecko) {
        return { contextTime: this.currentTime - RETARD, performanceTime: murMs - RETARD * 1000 };
      }
      const k = Math.floor(ecoule() / MARCHE);
      const p = debutMs + k * MARCHE * 1000;
      const c = entendu(p);
      return c > 0 ? { contextTime: c, performanceTime: p } : { contextTime: 0, performanceTime: 0 };
    },
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  };
  return {
    ctx,
    entendu,
    avancer: (ms: number) => (murMs += ms),
    get murMs() {
      return murMs;
    },
    lectures: () => ({ sortie: lecturesSortie, horodatages }),
  };
}

function moteur(ctx: object, etat: () => PatternStateV2 = () => defaultState()) {
  const events: string[] = [];
  const { drum, synth } = makeRecorders(events);
  Object.assign(synth, { stopAll() {} });
  const engine = new AudioEngine(etat);
  Object.assign(engine, {
    ctx,
    graph: { finalGain: { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} } } },
    kit: drum,
    synth,
    /* 448 ms déclarés : une sortie LENTE, donc le gros tampon (engine/tampon.ts).
       Sans ça, la première bascule de tampon voudrait rouvrir ce contexte
       feint, et il n'y a pas d'AudioContext sous Node. */
    tamponDemande: 'playback',
  });
  return { engine, events, prive: engine as unknown as { tick(): void } };
}

/** Pose les curseurs comme `start()` le fait, sans passer par la reprise. */
function lancerA(engine: AudioEngine, t: number, mesure: number) {
  const e = engine as unknown as {
    cursors: Record<string, { stepIndex: number; nextStepTime: number }>;
    synthCursors: Record<string, { nextStepTime: number }>;
  };
  for (const c of Object.values(e.cursors)) Object.assign(c, { stepIndex: 0, nextStepTime: t });
  for (const c of Object.values(e.synthCursors)) c.nextStepTime = t;
  Object.assign(engine, {
    isPlaying: true,
    nextBarTime: t + mesure,
    debutsDeMesure: [{ t, bar: 0, dansSection: 0 }],
  });
}

/** Fait tourner l'ordonnanceur (25 ms) et l'image (60 Hz) pendant `ms`. */
function rouler(
  tel: ReturnType<typeof telephone>,
  prive: { tick(): void },
  ms: number,
  image: () => void = () => {},
) {
  const fin = tel.murMs + ms;
  let prochainTick = tel.murMs;
  let prochaineImage = tel.murMs + 7;
  while (tel.murMs < fin) {
    const suivant = Math.min(prochainTick, prochaineImage);
    tel.avancer(suivant - tel.murMs);
    if (suivant === prochainTick) {
      prive.tick();
      prochainTick += 25;
    } else {
      image();
      prochaineImage += 1000 / 60;
    }
  }
}

beforeEach(() => {
  AudioEngine.oublierSortieConnue();
  // La lenteur de sortie vue par un test précédent ferait rouvrir le contexte.
  oublierSortie();
});
afterEach(() => vi.restoreAllMocks());

describe('la case allumée suit le son, pas l’escalier de currentTime', () => {
  it('audioTime() avance sans marche et colle à ce qu’on entend', () => {
    const tel = telephone();
    const { engine } = moteur(tel.ctx);
    tel.avancer(1500);
    const ecarts: number[] = [];
    const colonnes: number[] = [];
    for (let i = 0; i < 400; i++) {
      tel.avancer(1000 / 60);
      const t = engine.audioTime()!;
      ecarts.push(Math.abs(t - tel.entendu()));
      colonnes.push(Math.floor(t / 0.125));
    }
    expect(Math.max(...ecarts.slice(30))).toBeLessThan(0.003);
    for (let k = 1; k < colonnes.length; k++) expect(colonnes[k] - colonnes[k - 1]).toBeLessThanOrEqual(1);
  });

  it('une frappe se date à l’instant du DOIGT, pas à celui du gestionnaire', () => {
    const tel = telephone();
    const { engine } = moteur(tel.ctx);
    tel.avancer(3000);
    for (let i = 0; i < 20; i++) {
      tel.avancer(16);
      engine.audioTime();
    }
    const doigt = tel.murMs - 40; // l'événement a attendu 40 ms dans la file
    expect(Math.abs(engine.audioTimeA(doigt)! - tel.entendu(doigt))).toBeLessThan(0.003);
  });
});

describe('Firefox : `outputLatency` ne se lit pas trop tôt', () => {
  it('ni lui ni l’horodatage ne sont touchés pendant la première seconde et demie', () => {
    const tel = telephone({ gecko: true });
    const { engine, prive } = moteur(tel.ctx);
    Object.assign(engine, { isPlaying: true, nextBarTime: 2 });
    rouler(tel, prive, 1300, () => {
      engine.consumePlayhead();
      engine.diagnostic();
    });
    // ⚠️ Gecko GARDE la première valeur lue : une lecture ici la figerait.
    expect(tel.lectures().sortie).toBe(0);
    // Et `getOutputTimestamp` ne s'appelle jamais là où `baseLatency` vaut 0 :
    // il relit `outputLatency` en douce.
    expect(tel.lectures().horodatages).toBe(0);
    rouler(tel, prive, 600, () => engine.consumePlayhead());
    expect(tel.lectures().sortie).toBeGreaterThan(0);
    expect(tel.lectures().horodatages).toBe(0);
  });

  it('un contexte neuf réutilise le retard lu sur le précédent', () => {
    const tel = telephone({ gecko: true });
    const { engine, prive } = moteur(tel.ctx);
    Object.assign(engine, { isPlaying: true, nextBarTime: 2 });
    rouler(tel, prive, 2000, () => engine.consumePlayhead());
    const neuf = telephone({ gecko: true });
    const second = moteur(neuf.ctx).engine;
    expect(second.diagnostic().outputLatencyMs).toBe(Math.round(RETARD * 1000));
    expect(neuf.lectures().sortie).toBe(0);
  });
});

describe('Firefox : la première écoute de la page', () => {
  /* ⚠️ Trouvé par la revue du 2026-10-16 : pendant la seconde et demie où
     `outputLatency` ne se lit pas, le retard valait 0 — image en avance de TOUT
     le retard, puis figée 183 ms quand il devenait lisible. */
  function suivre(tel: ReturnType<typeof telephone>, engine: AudioEngine, prive: { tick(): void }, ms: number) {
    const images: Array<{ m: number; lu: number; vrai: number }> = [];
    rouler(tel, prive, ms, () => {
      engine.consumePlayhead();
      const lu = engine.audioTime();
      if (lu !== null) images.push({ m: tel.murMs, lu, vrai: tel.entendu() });
    });
    return images;
  }
  const gel = (xs: Array<{ lu: number }>) => {
    let max = 0;
    let n = 0;
    for (let k = 1; k < xs.length; k++) {
      n = xs[k].lu <= xs[k - 1].lu ? n + 1 : 0;
      max = Math.max(max, n);
    }
    return max;
  };

  it('le retard retenu de la visite précédente vaut dès le premier son', () => {
    AudioEngine.poserSortieConnue(RETARD);
    const tel = telephone({ gecko: true });
    const { engine, prive } = moteur(tel.ctx);
    Object.assign(engine, { isPlaying: true, nextBarTime: 2 });
    const images = suivre(tel, engine, prive, 3000);
    const debut = images[0].m;
    for (const i of images.filter((x) => x.m > debut + 600)) expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.02);
    // … et toujours sans lire `outputLatency` trop tôt.
    expect(tel.lectures().horodatages).toBe(0);
  });

  it('sans retard retenu : rattrapé sans gel dès que le retard se lit', () => {
    /* Rien n'est deviné pendant la seconde et demie (un a priori de deux
       marches faisait 84 ms, plus que le vrai retard d'un haut-parleur sous
       Firefox) : l'image est en avance du retard, puis le rejoint à
       mi-vitesse, sans jamais se figer. */
    const tel = telephone({ gecko: true });
    const { engine, prive } = moteur(tel.ctx);
    Object.assign(engine, { isPlaying: true, nextBarTime: 2 });
    const images = suivre(tel, engine, prive, 4000);
    const debut = images[0].m;
    expect(gel(images.filter((x) => x.m > debut + 300))).toBe(0);
    for (const i of images.filter((x) => x.m > debut + 3000)) expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.02);
  });

  it('le retard retenu d’hier ne fait pas basculer le tampon d’aujourd’hui', () => {
    // Hier au casque (448 ms retenus), aujourd'hui au haut-parleur (30 ms) :
    // la détection ne se persiste pas (engine/tampon.ts).
    AudioEngine.poserSortieConnue(RETARD);
    const tel = telephone();
    Object.defineProperty(tel.ctx, 'outputLatency', { get: () => 0.03 });
    const { engine, prive } = moteur(tel.ctx);
    Object.assign(engine, { isPlaying: true, nextBarTime: 2 });
    rouler(tel, prive, 1000, () => engine.consumePlayhead());
    expect(sortieLente()).toBe(false);
    expect(engine.latenceSortieMs()).toBe(30);
  });

  it('le retard lu est rendu à l’interface pour la visite suivante', () => {
    const lus: number[] = [];
    AudioEngine.onSortieLue = (secondes) => lus.push(secondes);
    try {
      const tel = telephone({ gecko: true });
      const { engine, prive } = moteur(tel.ctx);
      Object.assign(engine, { isPlaying: true, nextBarTime: 2 });
      rouler(tel, prive, 2500, () => engine.consumePlayhead());
      // Une fois, pas à chaque image.
      expect(lus).toEqual([RETARD]);
    } finally {
      AudioEngine.onSortieLue = null;
    }
  });
});

describe('le tempo propre sur une horloge en marches', () => {
  it('la bascule tombe AVANT la mesure, jamais après — et rien ne part en retard', () => {
    const tel = telephone();
    let etat = defaultState();
    const { engine, events, prive } = moteur(tel.ctx, () => etat);
    const mesure = barDuration(etat.tempo);
    /* La frontière tombe 100 ms après une marche : la dernière valeur lue
       avant elle en est donc à 100 ms — plus que les 60 ms de l'ancien seuil,
       qui ne voyait la bascule qu'à la marche SUIVANTE, après la mesure. Ce
       test échoue sur l'ancien moteur (vérifié en remettant l'ancien seuil). */
    const frontiereAttendue = 13 * MARCHE + 0.1;
    lancerA(engine, frontiereAttendue - mesure, mesure);
    const enRetard: number[] = [];
    // Tout coup programmé dans le PASSÉ est un coup qui part en retard.
    const kit = engine as unknown as { kit: Record<string, (t: number, g: number) => void> };
    const playKick = kit.kit.playKick;
    kit.kit.playKick = (t, g) => {
      if (t < tel.ctx.currentTime - 1e-9) enRetard.push(t);
      playKick(t, g);
    };
    let appliqueA: number | null = null;
    let frontiereVue: number | null = null;
    const suivant = defaultState();
    rouler(tel, prive, (mesure - 0.6) * 1000);
    engine.queueSwapAtNextBar((frontiere) => {
      appliqueA = tel.ctx.currentTime;
      frontiereVue = frontiere;
      etat = suivant;
    });
    rouler(tel, prive, 1500);
    expect(frontiereVue).toBeCloseTo(frontiereAttendue, 9);
    // Le rendu n'avait pas encore atteint la mesure quand on a basculé.
    expect(appliqueA!).toBeLessThan(frontiereAttendue);
    // ⚠️ Non-vacuité : des coups ont bien été programmés.
    expect(events.length).toBeGreaterThan(10);
    expect(enRetard).toEqual([]);
    // Et la nouvelle section sonne sur son premier temps, pile.
    const kicks = events.filter((e) => e.startsWith('kick ')).map((e) => Number(e.split(' ')[1]));
    expect(kicks.some((t) => Math.abs(t - frontiereAttendue) < 1e-3)).toBe(true);
  });

  it('le mix de la scène suivante change À LA FRONTIÈRE, pas au tick qui bascule', () => {
    // Revue du 2026-10-16 : posé à `currentTime`, il devançait la frontière de
    // 61 à 229 ms sur Chrome Android.
    const tel = telephone();
    const etat = defaultState();
    const { engine, prive } = moteur(tel.ctx, () => etat);
    const ecritures: number[] = [];
    const profond = (): unknown =>
      new Proxy(function () {}, {
        get: (_c, k) =>
          k === 'setValueAtTime'
            ? (_v: number, t: number) => ecritures.push(t)
            : k === 'derniereTailleReverbe'
              ? etat.synthGlobal.reverbSize
              : k === 'ctx'
                ? tel.ctx
                : profond(),
        set: () => true,
      });
    Object.assign(engine, { graph: profond() });
    const mesure = barDuration(etat.tempo);
    const frontiere = 13 * MARCHE + 0.1;
    lancerA(engine, frontiere - mesure, mesure);
    rouler(tel, prive, (mesure - 0.6) * 1000);
    engine.queueSwapAtNextBar(() => engine.refreshMixSettings());
    rouler(tel, prive, 800);
    expect(ecritures.length).toBeGreaterThan(5);
    for (const t of ecritures) expect(t).toBeCloseTo(frontiere, 9);
    // Hors bascule (un curseur de l'Atelier), le mix change tout de suite.
    ecritures.length = 0;
    engine.refreshMixSettings();
    for (const t of ecritures) expect(t).toBeCloseTo(tel.ctx.currentTime, 9);
  });

  it('un saut demandé trop tard pour cette mesure part à la suivante — sans doubler le premier temps', () => {
    const tel = telephone();
    let etat = defaultState();
    const { engine, events, prive } = moteur(tel.ctx, () => etat);
    const mesure = barDuration(etat.tempo);
    const debut = tel.ctx.currentTime + 0.06;
    lancerA(engine, debut, mesure);
    // Le rendu est à ~0,18 s de la frontière : l'horizon (0,42 s ici) l'a
    // déjà dépassée, la scène sortante est écrite par-delà.
    rouler(tel, prive, 1950);
    expect(debut + mesure - tel.ctx.currentTime).toBeLessThan(0.25);
    let frontiereVue: number | null = null;
    const suivant = defaultState();
    engine.queueSwapAtNextBar((f) => {
      frontiereVue = f;
      etat = suivant;
    });
    rouler(tel, prive, 3000);
    expect(frontiereVue).toBeCloseTo(debut + 2 * mesure, 6);
    const kicks = events.filter((e) => e.startsWith('kick ')).map((e) => e.split(' ')[1]);
    expect(new Set(kicks).size).toBe(kicks.length);
  });

  it('ce qui attend d’être ENTENDU attend vraiment l’oreille', () => {
    const tel = telephone();
    const etat = defaultState();
    const { engine, prive } = moteur(tel.ctx, () => etat);
    const mesure = barDuration(etat.tempo);
    const debut = tel.ctx.currentTime + 0.06;
    lancerA(engine, debut, mesure);
    let entenduA: number | null = null;
    rouler(tel, prive, (mesure - 0.6) * 1000);
    engine.queueSwapAtNextBar(() => {
      engine.quandOnEntendra(() => (entenduA = tel.entendu()));
    });
    let sectionVue = -1;
    rouler(tel, prive, 2000, () => {
      engine.consumePlayhead();
      const m = engine.mesureEntendue();
      if (m.dansSection === 0 && m.bar === 1 && sectionVue < 0) sectionVue = tel.entendu();
    });
    // La scène change à l'écran quand on ENTEND la frontière — pas 448 ms plus
    // tôt, quand elle est rendue.
    expect(entenduA).not.toBeNull();
    expect(Math.abs(entenduA! - (debut + mesure))).toBeLessThan(0.02);
    expect(Math.abs(sectionVue - (debut + mesure))).toBeLessThan(0.02);
  });
});

describe('le précompte et la boucle partagent une grille', () => {
  it('start(depart) part de l’instant rendu par le précompte, sur le même contexte', async () => {
    const tel = telephone();
    const { engine, events } = moteur(tel.ctx);
    tel.avancer(2000);
    const avant = tel.ctx.currentTime;
    const depart = await engine.countIn(undefined, { enchainer: true });
    const beat = 60 / defaultState().tempo;
    expect(depart).toBeCloseTo(avant + 0.05 + 4 * beat, 6);
    await engine.start(depart);
    // Rien avant le départ : le précompte a la place pour lui seul.
    expect(events.filter((e) => e.startsWith('kick '))).toEqual([]);
    rouler(tel, engine as unknown as { tick(): void }, 4 * beat * 1000 + 300);
    const premier = Number(events.find((e) => e.startsWith('kick '))!.split(' ')[1]);
    expect(premier).toBeCloseTo(depart, 4);
    engine.stop();
  });

  it('les chiffres du précompte s’affichent quand on ENTEND chaque clic', async () => {
    // Contexte NEUF : l'horloge entendue n'a encore aucun relevé. Une minuterie
    // posée sur cette première estimation avait 225 ms d'avance (mesuré).
    const tel = telephone();
    const { engine, prive } = moteur(tel.ctx);
    tel.avancer(600);
    const vus: Array<{ beat: number; entendu: number }> = [];
    const avant = tel.ctx.currentTime;
    const depart = await engine.countIn((beat) => vus.push({ beat, entendu: tel.entendu() }), { enchainer: true });
    const beat = (depart - (avant + 0.05)) / 4;
    rouler(tel, prive, 4000, () => engine.consumePlayhead());
    expect(vus.map((v) => v.beat)).toEqual([1, 2, 3, 4]);
    vus.forEach((v, k) => {
      const clic = avant + 0.05 + k * beat;
      expect(v.entendu - clic).toBeGreaterThanOrEqual(-0.005);
      expect(v.entendu - clic).toBeLessThan(0.025); // au plus une image et demie après
    });
  });

  it('un départ déjà passé retombe sur maintenant', async () => {
    const tel = telephone();
    const { engine, events } = moteur(tel.ctx);
    tel.avancer(2000);
    await engine.start(0.5);
    const premier = Number(events.find((e) => e.startsWith('kick '))!.split(' ')[1]);
    expect(premier).toBeGreaterThan(tel.ctx.currentTime);
    engine.stop();
  });
});

describe('le métronome du calibrage', () => {
  it('rend l’instant PROGRAMMÉ — celui où on entend le clic', async () => {
    const tel = telephone();
    const { engine } = moteur(tel.ctx);
    tel.avancer(2000);
    const ct = tel.ctx.currentTime;
    const m = await engine.metronome(8, 100);
    // Plus de `− latenceSortie()` : un son programmé à T s'entend quand
    // `audioTime()` vaut T.
    expect(m.debut).toBeCloseTo(ct + 0.3, 9);
  });

  it('une salve relancée en retard saute des temps entiers, sans décaler la grille', async () => {
    const tel = telephone();
    const { engine } = moteur(tel.ctx);
    tel.avancer(2000);
    const m = await engine.metronome(8, 100);
    tel.avancer(6000); // la relance arrive après la fin de la salve
    const suite = await engine.metronome(8, 100, m.fin);
    const pas = (suite.debut - m.debut) / m.intervalle;
    expect(Math.abs(pas - Math.round(pas))).toBeLessThan(1e-9);
    expect(suite.debut).toBeGreaterThan(tel.ctx.currentTime);
  });
});
