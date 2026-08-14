// Logique de déclenchement + fenêtre de scheduling — UN SEUL endroit où vit
// la règle "fill / pattern / ghost note" (port de l. 4067–4264), partagé par
// le live, le futur export offline et le futur mode jeu. `rng` est injecté
// (Math.random en direct, PRNG seedé à l'export) pour que l'aléatoire soit
// reproductible à l'export.
import type { PatternStateV2, DrumRowName, SynthRowName, SynthNote } from '../model/types';
import type { DrumKit } from './voices/drums';
import type { SynthKit } from './voices/synth';
import { chordFreqs, degreeFreq, stepsForLine, stepDurForLine, chordsFor } from './harmony';
import {
  stepDurationFor,
  isFillBar,
  isLastSteps,
  breakPhaseFor,
  randomizeGain,
  barDuration,
  type BreakWindow,
} from './groove';
import type { Rng } from './rng';

// Curseurs runtime par ligne (jamais sérialisés).
export interface RowCursor {
  stepIndex: number;
  nextStepTime: number;
}
export type Cursors = Record<DrumRowName, RowCursor>;

// Curseurs synthé : en plus du pas courant, la mémoire de glide (dernière
// fréquence jouée par ligne, dernières fréquences d'accord pour la nappe).
export interface SynthCursor extends RowCursor {
  lastFreq: number | null;
  lastFreqs: number[] | null;
}
export type SynthCursors = Record<SynthRowName, SynthCursor>;

export interface PlayheadEvent {
  name: DrumRowName | SynthRowName;
  col: number;
  time: number;
  ghosted: boolean;
}

export interface ScheduleContext {
  state: PatternStateV2;
  kit: DrumKit;
  cursors: Cursors;
  rng: Rng;
  currentBar: number;
  breakWindow: BreakWindow | null;
  ghostTargetRow: DrumRowName;
  // Sidechain : prévenu à chaque frappe RÉELLE de kick/snare (pas les ghost
  // notes ni les montées de fill) — branché quand le synthé sera porté.
  onSidechainTrigger?: (rowName: DrumRowName, time: number) => void;
  emitPlayhead: (ev: PlayheadEvent) => void;
  // Déclencheurs Mode Live (phase 2, PLAN.md §7) : par-dessus le pattern,
  // jamais écrits dedans — un bouton MUTE en direct n'altère pas la ligne
  // sauvegardée. Optionnels : absents pour l'Atelier/l'export offline/le jeu.
  liveMute?: Partial<Record<DrumRowName, boolean>>;
  forceFill?: boolean;
  forceHatRoll?: number | null;
  // Rafale forcée kick/snare (Mode Live, PLAN.md §7) — même principe que
  // forceHatRoll : un pas vide se met à sonner tant que le bouton est
  // maintenu, plutôt qu'une rafale qui ne s'applique qu'aux pas déjà actifs.
  forceKickRoll?: number | null;
  forceSnareRoll?: number | null;
}

// Renvoie true si un ghost note a été déclenché (flash visuel en direct).
// Clap (PLAN.md §6) suit ce même modèle plutôt qu'un chemin dédié — c'est un
// coup ponctuel comme kick/snare (candidat aux ghost notes/breaks), à la
// différence du shaker qui suit le modèle "hat" (triggerHatStep ci-dessous).
function triggerKickSnareStep(
  cx: SchedueCtxAlias,
  name: 'kick' | 'snare' | 'clap',
  col: number,
  time: number,
  stepDur: number,
  fillNow: boolean,
): boolean {
  const { state, kit, rng } = cx;
  const row = state.rows[name];
  if (row.muted || cx.liveMute?.[name]) return false;
  const play = (t: number, g: number, rim: boolean) => {
    if (name === 'kick') kit.playKick(t, g, row);
    else if (name === 'clap') kit.playClap(t, g, row);
    else if (rim) kit.playRimshot(t, g, row);
    else kit.playSnare(t, g, row);
  };
  // Fill de snare : montée progressive sur le dernier quart de la mesure,
  // ponctuée d'une petite rafale sur le tout dernier pas.
  const fillZone = name === 'snare' && fillNow && isLastSteps(col, row.subdiv);
  if (fillZone) {
    const intensity = state.fillIntensity / 100; // 0..1 — dose le fill
    const zoneSize = Math.max(1, Math.round(row.subdiv * 0.25));
    const posInZone = col - (row.subdiv - zoneSize);
    const isLastStep = col === row.subdiv - 1;
    if (isLastStep) {
      // Le nombre de frappes s'adapte à la durée réelle du pas ET à
      // l'intensité : < 25% pas de rafale (juste un accent) ; au-delà, le
      // nombre croît avec l'intensité dans la limite de ce que la durée
      // permet sans bouillie.
      const MIN_ROLL_GAP = 0.045; // en dessous, deux frappes de snare se confondent
      const rollCap = intensity < 0.25 ? 1 : intensity < 0.6 ? 2 : 4;
      const roll = Math.min(rollCap, Math.max(1, Math.floor(stepDur / MIN_ROLL_GAP)));
      const rollDur = stepDur / roll;
      const accentMult = 1 + 0.15 * intensity;
      for (let k = 0; k < roll; k++) {
        const t = time + k * rollDur;
        const velocity = roll > 1 ? 0.6 + 0.4 * (k / (roll - 1)) : 1;
        const g = randomizeGain(
          Math.min(row.volume * accentMult, 1) * velocity,
          state.randomVelocity / 100,
          rng,
        );
        kit.playSnare(t, g, row);
      }
    } else {
      const rampVelocity = 0.5 + 0.4 * (posInZone / Math.max(1, zoneSize - 1));
      // à intensité 0 : aucune montée, tout sonne normal
      const velocity = 1 * (1 - intensity) + rampVelocity * intensity;
      const g = randomizeGain(row.volume * velocity, state.randomVelocity / 100, rng);
      kit.playSnare(time, g, row);
    }
    return false;
  }
  // ROLL×2/3/4 (Mode Live) : forcé exactement comme le ferait un fill — un
  // pas vide se met à sonner tant que le bouton est maintenu, même logique
  // que le hat (triggerHatStep) plutôt qu'un chemin séparé.
  // Le clap n'a pas de rafale forcée dédiée en Mode Live (pas d'équivalent
  // forceClapRoll — portée du Mode Live volontairement pas étendue à
  // clap/shaker dans cette passe, PLAN.md §6).
  const forcedRoll = name === 'kick' ? cx.forceKickRoll : name === 'snare' ? cx.forceSnareRoll : null;
  let stepState = row.pattern[col]; // kick/clap: 0/1 — snare: 0/1(normal)/2(rim shot)
  if (forcedRoll != null && !stepState) stepState = 1;
  if (stepState) {
    const isRim = name === 'snare' && stepState === 2;
    // Un seul déclenchement de sidechain par pas, même en rafale (4 coups
    // rapides ne déclenchent pas 4 pompes).
    cx.onSidechainTrigger?.(name, time);
    const roll = forcedRoll ?? (row.rolls ? row.rolls[col] : 1);
    if (roll > 1) {
      const rollDur = stepDur / roll;
      for (let k = 0; k < roll; k++) {
        const t = time + k * rollDur;
        const velocity = 0.35 + 0.65 * (k / (roll - 1));
        const g = randomizeGain(row.volume * velocity, state.randomVelocity / 100, rng);
        play(t, g, isRim);
      }
    } else {
      const g = randomizeGain(row.volume, state.randomVelocity / 100, rng);
      play(time, g, isRim);
    }
    return false;
  }
  if (name === cx.ghostTargetRow && rng() * 100 < state.ghostDensity) {
    const ghostGain = randomizeGain(row.volume * 0.35, state.randomVelocity / 100, rng);
    play(time, ghostGain, false);
    return true;
  }
  return false;
}

function triggerHatStep(
  cx: SchedueCtxAlias,
  col: number,
  baseTime: number,
  stepDur: number,
  fillNow: boolean,
): void {
  const { state, kit, rng } = cx;
  const hat = state.rows.hat;
  if (hat.muted || cx.liveMute?.hat) return;
  const fillHere = fillNow && isLastSteps(col, hat.subdiv);
  // ROLL×2 (Mode Live) : forcé exactement comme le ferait un fill — un pas
  // vide se met à sonner tant que le bouton est maintenu, même logique que
  // fillHere ci-dessous plutôt qu'un chemin séparé.
  const rollForced = cx.forceHatRoll != null;
  let stepState = hat.pattern[col];
  if ((fillHere || rollForced) && stepState === 0) stepState = 1;
  if (stepState === 0) return;

  let roll = hat.rolls[col];
  if (fillHere) {
    roll = 4;
  } else if (rollForced) {
    roll = cx.forceHatRoll!;
  } else if (roll === 1 && rng() * 100 < state.spontRoll) {
    roll = 2 + Math.floor(rng() * 3); // rafale spontanée 2-4, cette passe seulement
  }

  const rollDur = stepDur / roll;
  for (let k = 0; k < roll; k++) {
    const t = baseTime + k * rollDur;
    const velocity = roll > 1 ? 0.35 + 0.65 * (k / (roll - 1)) : 1;
    const g = randomizeGain(hat.volume * velocity, state.randomVelocity / 100, rng);
    // Hat ouvert : seule la DERNIÈRE frappe d'une rafale est ouverte (les
    // précédentes chokent la suivante de toute façon).
    if (stepState === 2 && k === roll - 1) kit.playHatOpen(t, g, hat);
    else kit.playHatClosed(t, g, hat);
  }
}

type SchedueCtxAlias = SchedulingContextInternal;
interface SchedulingContextInternal extends ScheduleContext {}

// Programme toutes les notes drum dont l'échéance tombe avant `horizon`
// (now + SCHEDULE_AHEAD en live ; la durée totale en offline).
export function scheduleDrumWindow(cx: SchedulingContextInternal, horizon: number): void {
  const { state, cursors } = cx;
  // FILL (Mode Live) : force la mesure en cours à se comporter comme une
  // mesure de fill normale — même logique de montée/rafale, juste déclenchée
  // à la demande plutôt que par fillEvery.
  const fillNow = isFillBar(state, cx.currentBar) || !!cx.forceFill;
  const barDur = barDuration(state.tempo);

  // Clap (PLAN.md §6) rejoint ce tableau plutôt qu'une boucle séparée — même
  // fonction de déclenchement que kick/snare (triggerKickSnareStep), donc
  // même traitement break/fill/ghost pour les trois. Ajouté APRÈS kick/snare
  // (jamais entre eux) : à motif vide par défaut, ça ne consomme aucun tirage
  // aléatoire tant qu'on n'y programme rien, donc ça ne perturbe pas l'ordre
  // de consommation du générateur pour les patterns déjà sauvegardés
  // (contrainte CLAUDE.md).
  (['kick', 'snare', 'clap'] as const).forEach((name) => {
    const cursor = cursors[name];
    const row = state.rows[name];
    while (cursor.nextStepTime < horizon) {
      const col = cursor.stepIndex % row.subdiv;
      const stepDur = stepDurationFor(state, name);
      const swing = col % 2 === 1 ? (state.swing / 100) * stepDur : 0;
      const shift = (row.shiftPct / 100) * stepDur;
      const drag = (state.drag / 100) * stepDur;
      const time = cursor.nextStepTime + shift + swing + drag;

      // Break : dépouillé -> kick/snare/clap coupés (seul le hat tient le
      // temps) ; explosion -> fill forcé par-dessus le fill normal éventuel.
      const breakPhase = breakPhaseFor(time, cx.breakWindow, barDur);
      if (breakPhase !== 'strip') {
        const ghosted = triggerKickSnareStep(
          cx,
          name,
          col,
          time,
          stepDur,
          fillNow || breakPhase === 'explode',
        );
        cx.emitPlayhead({ name, col, time, ghosted });
      }

      cursor.nextStepTime += stepDur;
      cursor.stepIndex++;
    }
  });

  scheduleHatRows(cx, horizon);
  scheduleShakerRows(cx, horizon);
}

function scheduleHatRows(cx: SchedulingContextInternal, horizon: number): void {
  const { state, cursors } = cx;
  const fillNow = isFillBar(state, cx.currentBar) || !!cx.forceFill;
  const barDur = barDuration(state.tempo);
  const hatCursor = cursors.hat;
  const hat = state.rows.hat;
  while (hatCursor.nextStepTime < horizon) {
    const col = hatCursor.stepIndex % hat.subdiv;
    const stepDur = stepDurationFor(state, 'hat');
    const swing = col % 2 === 1 ? (state.swing / 100) * stepDur : 0;
    const shift = (hat.shiftPct / 100) * stepDur;
    const drag = (state.drag / 100) * stepDur;
    const baseTime = hatCursor.nextStepTime + shift + swing + drag;

    // Break : le hat continue pendant le dépouillement (c'est lui qui tient
    // le temps), et se densifie comme les autres à l'explosion.
    const hatBreakPhase = breakPhaseFor(baseTime, cx.breakWindow, barDur);
    triggerHatStep(cx, col, baseTime, stepDur, fillNow || hatBreakPhase === 'explode');
    cx.emitPlayhead({ name: 'hat', col, time: baseTime, ghosted: false });

    hatCursor.nextStepTime += stepDur;
    hatCursor.stepIndex++;
  }
}

// Shaker (PLAN.md §6) : version simplifiée du hat — binaire (pas de variante
// ouverte/fermée ni de choke), pas de rafales spontanées ni de fill/break
// (texture discrète en continu plutôt qu'un élément qui doit « exploser »
// avec le reste — portée volontairement réduite dans cette passe, à revoir
// si le besoin s'en fait sentir à l'usage).
function triggerShakerStep(cx: SchedueCtxAlias, col: number, time: number, stepDur: number): void {
  const { state, kit, rng } = cx;
  const shaker = state.rows.shaker;
  if (shaker.muted || cx.liveMute?.shaker) return;
  const stepState = shaker.pattern[col];
  if (!stepState) return;
  const roll = shaker.rolls[col];
  if (roll > 1) {
    const rollDur = stepDur / roll;
    for (let k = 0; k < roll; k++) {
      const t = time + k * rollDur;
      const velocity = 0.35 + 0.65 * (k / (roll - 1));
      const g = randomizeGain(shaker.volume * velocity, state.randomVelocity / 100, rng);
      kit.playShaker(t, g, shaker);
    }
  } else {
    const g = randomizeGain(shaker.volume, state.randomVelocity / 100, rng);
    kit.playShaker(time, g, shaker);
  }
}

function scheduleShakerRows(cx: SchedulingContextInternal, horizon: number): void {
  const { state, cursors } = cx;
  const shakerCursor = cursors.shaker;
  const shaker = state.rows.shaker;
  while (shakerCursor.nextStepTime < horizon) {
    const col = shakerCursor.stepIndex % shaker.subdiv;
    const stepDur = stepDurationFor(state, 'shaker');
    const swing = col % 2 === 1 ? (state.swing / 100) * stepDur : 0;
    const shift = (shaker.shiftPct / 100) * stepDur;
    const drag = (state.drag / 100) * stepDur;
    const time = shakerCursor.nextStepTime + shift + swing + drag;

    triggerShakerStep(cx, col, time, stepDur);
    cx.emitPlayhead({ name: 'shaker', col, time, ghosted: false });

    shakerCursor.nextStepTime += stepDur;
    shakerCursor.stepIndex++;
  }
}

// ---------- Scheduling synthé ----------
// Basse / Nappe / Mélodie : même principe de boucle que le hat, chacune sur
// son propre cycle (cycleBars mesures divisées en `subdivisions` notes) — un
// seul mécanisme générique pour les 3 lignes. Swing/traîne indépendants du
// groove batterie (synthSwing/synthDrag).
export interface SynthScheduleContext {
  state: PatternStateV2;
  synth: SynthKit;
  cursors: SynthCursors;
  rng: Rng;
  breakWindow: BreakWindow | null;
  emitPlayhead: (ev: PlayheadEvent) => void;
  // Horloge réelle de l'appelant (ctx.currentTime) : sert uniquement à couper
  // le bourdon proprement (avec release) quand padDroneEnabled bascule à OFF
  // en cours de lecture — voir syncDroneMode. Distinct de `horizon`, qui est
  // la fin de la fenêtre de lookahead, pas l'instant présent.
  now: number;
}

export function scheduleSynthWindow(cx: SynthScheduleContext, horizon: number): void {
  const { state, synth, cursors, rng } = cx;
  const barDur = barDuration(state.tempo);
  const chords = chordsFor(state);

  // Bourdon (PLAN.md §6, v2) : bascule ON->OFF détectée une fois par fenêtre
  // plutôt que par pas — sinon un OFF entre deux pas actifs ne serait jamais
  // vu tant qu'aucun pas de Nappe ne tombe dans la fenêtre.
  synth.syncDroneMode(state.synthGlobal.padDroneEnabled, cx.now);

  (['bass', 'pad', 'melody'] as SynthRowName[]).forEach((name) => {
    const row = state.synthRows[name];
    const cursor = cursors[name];
    const droneMode = name === 'pad' && state.synthGlobal.padDroneEnabled;
    const totalSteps = stepsForLine(row);
    const stepDur = stepDurForLine(row, barDur);
    while (cursor.nextStepTime < horizon) {
      const col = cursor.stepIndex % totalSteps;
      // Décalage : ±50% d'un pas de CETTE ligne.
      const shift = (row.shiftPct / 100) * stepDur;
      const synthSwing = col % 2 === 1 ? (state.synthSwing / 100) * stepDur : 0;
      const synthDrag = (state.synthDrag / 100) * stepDur;
      const time = cursor.nextStepTime + shift + synthSwing + synthDrag;
      const value = row.pattern[col];
      // Break : dépouillé -> ligne coupée comme muted ; explosion -> rafale
      // forcée (x2 à x4 minimum) pour la sensation de "tout explose". Pas en
      // bourdon : une rafale sur une note tenue romprait tout le principe.
      const breakPhase = breakPhaseFor(time, cx.breakWindow, barDur);
      const stripped = row.muted || breakPhase === 'strip';
      let roll = row.rolls ? row.rolls[col] : 1;
      if (!droneMode && breakPhase === 'explode') roll = Math.max(roll, 2 + Math.floor(rng() * 3));
      if (droneMode) {
        // Bourdon : on suit le vrai motif de la Nappe (plus un accord figé
        // sur le 1er pas) — chaque pas qui porte un accord fait glisser le
        // MÊME drone vers ce nouvel accord (voir SynthKit.updateDrone),
        // jamais de nouvelle attaque. Un pas vide ne fait RIEN : le drone
        // continue de tenir le dernier accord rencontré, c'est le principe
        // même d'un bourdon. Ni roll ni arpège ici : une rafale ou un
        // égrenage sur une note tenue romprait le principe.
        const chordIdx = typeof value === 'number' ? value : -1;
        if (stripped) {
          synth.stopDrone(time, 0.3);
          cursor.lastFreqs = null;
        } else if (chordIdx >= 0) {
          const glideTime = (row.glide || 0) * 0.12; // 0..1 -> 0..120ms, même échelle que Basse/Mélodie
          const freqs = chordFreqs(state, chords, chordIdx);
          synth.updateDrone(freqs, time, 0.3, row.voice, glideTime);
          cursor.lastFreqs = freqs;
        }
        cx.emitPlayhead({ name, col, time, ghosted: false });
        cursor.nextStepTime += stepDur;
        cursor.stepIndex++;
        continue;
      }
      if (!stripped) {
        if (name === 'pad') {
          const chordIdx = typeof value === 'number' ? value : -1;
          if (chordIdx >= 0) {
            const rollDur = stepDur / roll;
            const strumSpread = (row.strum || 0) * 0.08; // 0..1 -> 0..80ms
            const glideTime = (row.glide || 0) * 0.12; // 0..1 -> 0..120ms, même échelle que Basse/Mélodie
            const arpOn = state.synthGlobal.padArpEnabled;
            const freqs = chordFreqs(state, chords, chordIdx);
            for (let k = 0; k < roll; k++) {
              // Glide uniquement sur la 1ère frappe d'une rafale — les
              // répétitions rejouent le même accord sans re-glisser dessus.
              const t = time + k * rollDur;
              if (arpOn) {
                cursor.lastFreqs = synth.playPadArp(
                  freqs,
                  t,
                  rollDur * 0.95,
                  0.3,
                  row.voice,
                  parseInt(state.synthGlobal.padArpRate, 10),
                  state.synthGlobal.padArpPattern,
                  rng,
                );
              } else {
                cursor.lastFreqs = synth.playPadChord(
                  freqs,
                  t,
                  rollDur * 0.95,
                  0.3,
                  row.voice,
                  strumSpread,
                  k === 0 ? glideTime : 0,
                  k === 0 ? cursor.lastFreqs : null,
                );
              }
            }
            cx.emitPlayhead({ name, col, time, ghosted: false });
          } else {
            cursor.lastFreqs = null;
            cx.emitPlayhead({ name, col, time, ghosted: false });
          }
        } else if (value && typeof value === 'object') {
          const note = value as SynthNote;
          const rollDur = stepDur / roll;
          // Écart volontaire : la basse (ancrée grave, ~65Hz) perd en
          // audibilité perçue à amplitude égale (courbes isosoniques + petits
          // haut-parleurs) — gain plus haut. La mélodie sonne facilement
          // agressive (filterEnv/tone des presets) — gain réduit.
          const gainVal = name === 'bass' ? 0.65 : 0.32;
          for (let k = 0; k < roll; k++) {
            const t = time + k * rollDur;
            // Glide uniquement sur la 1ère frappe d'une rafale, depuis la
            // note précédente sur CETTE ligne.
            const glideTime = k === 0 ? (row.glide || 0) * 0.12 : 0;
            const glide = glideTime > 0 && cursor.lastFreq ? { fromFreq: cursor.lastFreq, glideTime } : null;
            // -24 demi-tons pour la basse : octaveShift=0 tombe autour du Do2
            // (~65Hz), un vrai registre de basse.
            const freq = degreeFreq(state, note.degree, note.octave, name === 'bass' ? -24 : 0);
            cursor.lastFreq =
              name === 'bass'
                ? synth.playBassNote(freq, t, rollDur * 0.85, gainVal, row.voice, glide)
                : synth.playMelodyNote(freq, t, rollDur * 0.85, gainVal, row.voice, glide);
          }
          cx.emitPlayhead({ name, col, time, ghosted: false });
        } else {
          cursor.lastFreq = null;
          cx.emitPlayhead({ name, col, time, ghosted: false });
        }
      } else {
        // Dépouillé (mute ou break) : la note ne sonne pas — on invalide
        // quand même la référence de glide, pour qu'une note qui rejoue plus
        // tard ne glisse pas depuis une note qui n'a pas sonné.
        if (name === 'pad') cursor.lastFreqs = null;
        else cursor.lastFreq = null;
      }
      cursor.nextStepTime += stepDur;
      cursor.stepIndex++;
    }
  });
}
