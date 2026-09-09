/* LES RÉGLAGES PAR LIGNE — et la seule question qui compte : est-ce que ça
 * ARRIVE jusqu'à l'ordonnanceur ?
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Le catalogue peut être parfait et le réglage
 * ne rien faire : `setLiveDrumParam` écrit une couche que seul
 * `withLiveOverrides` fait redescendre, et cette fonction est appelée une seule
 * fois par tick, entre la bascule de section et l'ordonnancement. Un module pur
 * testé dont le comportement reste faux, c'est le CÂBLAGE qu'il faut suspecter
 * (CLAUDE.md) — alors on teste le câblage.
 *
 * On mesure sur `shiftPct` parce que c'est le seul de la famille dont l'effet
 * se lit dans ce que le harnais enregistre : il DÉPLACE les frappes dans le
 * temps. Pitch, decay et filtre passent par le même chemin, au même endroit —
 * s'ils devaient tomber, ils tomberaient ensemble avec lui.
 */
import { describe, it, expect } from 'vitest';
import { AudioEngine } from '../src/engine/AudioEngine';
import { defaultState } from '../src/model/defaults';
import { barDuration } from '../src/engine/groove';
import { makeRecorders } from './helpers/rejeu';
import type { PatternStateV2 } from '../src/model/types';

/** Le moteur, construit puis privé de son audio — même méthode que
    `bascule-mesure.test.ts` : aucun état privé recopié à la main. */
function monterMoteur(etat: () => PatternStateV2) {
  const events: string[] = [];
  const { drum, synth } = makeRecorders(events);
  const ctx = { currentTime: 0, outputLatency: 0.02 };
  const engine = new AudioEngine(etat);
  Object.assign(engine, { ctx, graph: {}, kit: drum, synth, isPlaying: true, nextBarTime: barDuration(etat().tempo) });
  const tick = () => (engine as unknown as { tick(): void }).tick();
  const kicks = () =>
    events.filter((e) => e.startsWith('kick ')).map((e) => Number(e.split(' ')[1]));
  return { engine, tick, kicks, vider: () => (events.length = 0) };
}

/** Un motif nu : un kick sur chaque temps, rien d'autre. */
function motif(): PatternStateV2 {
  const st = defaultState();
  st.tempo = 120;
  for (const l of ['kick', 'snare', 'hat', 'clap', 'shaker'] as const) {
    st.rows[l].pattern = new Array(32).fill(0) as never;
    st.rows[l].subdiv = 8;
    st.rows[l].shiftPct = 0;
  }
  [0, 2, 4, 6].forEach((i) => (st.rows.kick.pattern[i] = 1 as never));
  for (const l of ['bass', 'pad', 'melody'] as const) st.synthRows[l].muted = true;
  st.swing = 0;
  st.drag = 0;
  st.ghostDensity = 0;
  st.randomVelocity = 0;
  st.spontRoll = 0;
  st.fillEvery = 0;
  return st;
}

describe('un réglage par ligne arrive jusqu’à l’ordonnanceur', () => {
  it('déplace les frappes de SA ligne, sans toucher au motif', () => {
    const st = motif();
    const { engine, tick, kicks, vider } = monterMoteur(() => st);
    tick();
    const sans = kicks();
    expect(sans.length).toBeGreaterThan(0);

    vider();
    // Un quart de pas de retard sur le kick — le geste « faire glisser une
    // ligne contre les autres ».
    engine.setLiveDrumParam('kick', 'shiftPct', 25);
    (engine as unknown as { cursors: Record<string, { stepIndex: number; nextStepTime: number }> }).cursors.kick = {
      stepIndex: 0,
      nextStepTime: 0,
    };
    tick();
    const avec = kicks();

    const pas = barDuration(st.tempo) / st.rows.kick.subdiv;
    expect(avec[0] - sans[0]).toBeCloseTo(pas * 0.25, 4);
    // ⚠️ Et le MOTIF n'a pas bougé : un réglage en direct ne s'écrit jamais
    // dans l'état — on repart de l'Atelier exactement comme on y était.
    expect(st.rows.kick.shiftPct).toBe(0);
  });

  it('rend la ligne au morceau quand le réglage est effacé', () => {
    const st = motif();
    const { engine, tick, kicks, vider } = monterMoteur(() => st);
    const curseurs = (engine as unknown as { cursors: Record<string, { stepIndex: number; nextStepTime: number }> })
      .cursors;
    tick();
    const sans = kicks();

    engine.setLiveDrumParam('kick', 'shiftPct', 25);
    engine.clearLiveDrumParam('kick', 'shiftPct');
    vider();
    curseurs.kick = { stepIndex: 0, nextStepTime: 0 };
    tick();
    expect(kicks()[0]).toBeCloseTo(sans[0], 6);
  });

  it('ne touche QUE la ligne visée', () => {
    const st = motif();
    [1, 3].forEach((i) => (st.rows.snare.pattern[i] = 1 as never));
    const { engine } = monterMoteur(() => st);
    engine.setLiveDrumParam('kick', 'pitch', 12);
    // La caisse claire n'a aucun override : son état effectif reste celui du
    // morceau. On le lit par la couche elle-même plutôt que par l'audio —
    // c'est ce que l'ordonnanceur recevra.
    const effectif = (engine as unknown as { withLiveOverrides(s: PatternStateV2): PatternStateV2 }).withLiveOverrides(
      st,
    );
    expect(effectif.rows.kick.pitch).toBe(12);
    expect(effectif.rows.snare).toBe(st.rows.snare);
  });

  /* Le VOLUME d'une ligne de batterie emprunte le même chemin que le reste —
     c'est ce qui permet au mini séquenceur de le régler en direct sans rien
     écrire dans le morceau. (Celui d'une ligne de SYNTHÉ, lui, est un nœud du
     graphe : il se mesure au rendu, pas ici.) */
  it('fait passer le volume d’une ligne de batterie par la même couche', () => {
    const st = motif();
    const { engine } = monterMoteur(() => st);
    const lu = () =>
      (engine as unknown as { withLiveOverrides(x: PatternStateV2): PatternStateV2 }).withLiveOverrides(st);
    engine.setLiveDrumParam('kick', 'volume', 0.2);
    expect(lu().rows.kick.volume).toBe(0.2);
    expect(st.rows.kick.volume).toBe(1);
    engine.clearLiveDrumParam('kick', 'volume');
    expect(lu().rows.kick.volume).toBe(1);
  });

  /* Le VOLUME d'une ligne de batterie emprunte le même chemin que le reste —
     c'est ce qui permet au mini séquenceur de le régler en direct sans rien
     écrire dans le morceau. (Celui d'une ligne de SYNTHÉ, lui, est un nœud du
     graphe : il se mesure au rendu, pas ici.) */
  it('fait passer le volume d’une ligne de batterie par la même couche', () => {
    const st = motif();
    const { engine } = monterMoteur(() => st);
    engine.setLiveDrumParam('kick', 'volume', 0.2);
    const lu = (s2: PatternStateV2) =>
      (engine as unknown as { withLiveOverrides(x: PatternStateV2): PatternStateV2 }).withLiveOverrides(s2);
    expect(lu(st).rows.kick.volume).toBe(0.2);
    expect(st.rows.kick.volume).toBe(1);
    engine.clearLiveDrumParam('kick', 'volume');
    expect(lu(st).rows.kick.volume).toBe(1);
  });
});

/* ---- TOUT RENDRE À LA BASCULE DE SCÈNE ----
 *
 * ⚠️ L'ASYMÉTRIE EST TRANCHÉE (2026-09-09) : « il faut qu'on puisse revenir
 * comme c'était avant […] quand on passe à la partie suivante ». Les nœuds du
 * morceau étaient déjà repris par `refreshMixSettings` ; les OVERRIDES, eux,
 * survivaient — un volume de batterie posé à la main tenait à travers les
 * scènes, son jumeau du synthé non. Les deux familles rendent la main ensemble.
 */
describe('une bascule de scène rend les réglages au morceau', () => {
  it('efface les quatre couches d’override', () => {
    const st = motif();
    const { engine } = monterMoteur(() => st);
    const lu = () =>
      (engine as unknown as { withLiveOverrides(x: PatternStateV2): PatternStateV2 }).withLiveOverrides(st);

    engine.setLiveGrooveParam('spontRoll', 80);
    engine.setLiveDrumParam('kick', 'volume', 0.2);
    engine.setLiveSynthVoiceParam('bass', 'chorusMix', 0.9);
    engine.setLiveBourdon(true);
    expect(lu().spontRoll).toBe(80);
    expect(lu().rows.kick.volume).toBe(0.2);
    expect(lu().synthRows.bass.voice.chorusMix).toBe(0.9);
    expect(engine.padMode).not.toBe('normal');

    engine.relacherReglagesLive();
    expect(lu().spontRoll).toBe(st.spontRoll);
    expect(lu().rows.kick.volume).toBe(1);
    expect(lu().synthRows.bass.voice.chorusMix).toBe(st.synthRows.bass.voice.chorusMix);
    expect(engine.padMode).toBe('normal');
  });

  /* ⚠️ CE QU'ELLE NE DOIT PAS TOUCHER, et c'est ce qui la rend compatible avec
     le mode : les MUTES. `appliquerSection` les repose déjà, ligne par ligne,
     d'après le calque de la scène — les effacer ici ferait deux écrivains pour
     une même chose, et une ligne coupée par le calque se rouvrirait sous nos
     pieds au moment même où la scène la coupe. */
  it('laisse les coupures au calque de la scène', () => {
    const st = motif();
    const { engine } = monterMoteur(() => st);
    engine.liveSetMute('kick', true);
    engine.liveSetSynthMute('pad', true);
    engine.setLiveSynthVoiceParam('pad', 'chorusMix', 0.9);

    engine.relacherReglagesLive();
    expect(engine.liveMuteDe('kick')).toBe(true);
    expect(engine.liveMuteSynthDe('pad')).toBe(true);
    // …mais le réglage de voix de la MÊME ligne, lui, est bien rendu.
    const lu = (engine as unknown as { withLiveOverrides(x: PatternStateV2): PatternStateV2 }).withLiveOverrides(st);
    expect(lu.synthRows.pad.voice.chorusMix).toBe(st.synthRows.pad.voice.chorusMix);
  });
});
