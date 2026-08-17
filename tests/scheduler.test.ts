// Filet de sécurité du déterminisme de l'export (PLAN.md §4, prévu dès le
// départ puis jamais écrit — repéré par l'audit du 2026-08-15, constat C4).
//
// CE QUE CE FICHIER PROTÈGE, et pourquoi ça compte :
// `CLAUDE.md` pose une règle dure — « ne pas changer l'ordre d'itération des
// lignes dans le scheduler (kick → snare → hat → bass → pad → melody), il
// détermine l'ordre de consommation du générateur ». C'est cet ordre qui rend
// l'export MP3 reproductible à l'octet près : le PRNG est seedé, donc deux
// exports du même rythme ne donnent le même fichier QUE si les tirages sont
// consommés dans le même ordre. Réordonner deux lignes, ou insérer un
// `rng()` avant un autre, casse cette garantie **silencieusement** : aucun
// type ne bronche, aucun test ne tombait, et ça ne se voit qu'en comparant
// deux fichiers exportés à des mois d'intervalle.
//
// La technique est celle prévue au §4 : rejouer le scheduler avec de FAUX
// kits qui enregistrent les appels au lieu de produire du son. Aucun Web
// Audio, donc ça tourne en CI en quelques millisecondes — « 95 % des
// régressions pour presque rien », selon les termes du plan.
import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import type { PatternStateV2 } from '../src/model/types';
import {
  scheduleDrumWindow,
  scheduleSynthWindow,
  type Cursors,
  type SynthCursors,
} from '../src/engine/scheduler';
import type { DrumKit } from '../src/engine/voices/drums';
import type { SynthKit } from '../src/engine/voices/synth';
import { barDuration } from '../src/engine/groove';
import { makeSeededRng } from '../src/engine/rng';
import { EXPORT_SEED } from '../src/engine/render-offline';

// --- Faux kits ---------------------------------------------------------
// Ils n'implémentent QUE ce que le scheduler appelle. Le cast en DrumKit/
// SynthKit est assumé : implémenter les vraies classes demanderait un
// AudioContext, exactement ce qu'on veut éviter ici. Si le scheduler se met
// à appeler une méthode non couverte, le test échoue avec un TypeError
// explicite plutôt que de laisser passer une régression — c'est le
// comportement voulu.
type Ev = string;

function makeRecorders(events: Ev[]) {
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
function renderEvents(state: PatternStateV2, bars: number, seed: number, fillSeed = 999): Ev[] {
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

// Un état qui SOLLICITE le générateur aléatoire sur les huit lignes — sinon
// le test de reproductibilité serait vide de sens (deux listes identiques
// parce qu'aucun tirage n'a lieu). Ghost notes, rafales spontanées et
// vélocité aléatoire sont les trois consommateurs de `rng` côté batterie.
function busyState(): PatternStateV2 {
  const s = defaultState();
  s.tempo = 120;
  s.rows.kick.pattern = [1, 0, 1, 0];
  s.rows.snare.pattern = [0, 1, 0, 2];
  s.rows.hat.pattern = [1, 1, 2, 1];
  s.rows.clap.pattern = [0, 1, 0, 1];
  s.rows.shaker.pattern = [1, 1, 1, 1];
  s.rows.kick.subdiv = 4;
  s.rows.snare.subdiv = 4;
  s.rows.hat.subdiv = 4;
  s.rows.clap.subdiv = 4;
  s.rows.shaker.subdiv = 4;
  s.ghostDensity = 35;
  s.spontRoll = 40;
  s.randomVelocity = 60;
  s.swing = 20;
  s.synthRows.bass.pattern = [{ degree: 0, octave: 0 }, null, { degree: 4, octave: 0 }, null];
  s.synthRows.pad.pattern = [0, -1, 2, -1];
  s.synthRows.melody.pattern = [{ degree: 2, octave: 1 }, null, null, { degree: 5, octave: 0 }];
  return s;
}

describe('déterminisme du scheduler (verrouille la reproductibilité de l’export)', () => {
  it('deux rendus à la même graine produisent exactement la même séquence', () => {
    const a = renderEvents(busyState(), 4, EXPORT_SEED);
    const b = renderEvents(busyState(), 4, EXPORT_SEED);
    expect(a.length).toBeGreaterThan(40); // le test ne doit pas passer sur une liste vide
    expect(b).toEqual(a);
  });

  it('une graine différente produit une séquence différente', () => {
    // Sans ça, le test précédent pourrait passer alors que le PRNG n'est
    // jamais consulté — il prouve que l'aléatoire est bien branché.
    const a = renderEvents(busyState(), 4, EXPORT_SEED);
    const b = renderEvents(busyState(), 4, EXPORT_SEED + 1);
    expect(b).not.toEqual(a);
  });

  it('l’ordre d’itération des lignes est figé (contrainte CLAUDE.md)', () => {
    // C'EST le test qui protège l'invariant. L'ordre d'apparition des lignes
    // dans la liste d'appels EST l'ordre de consommation du générateur :
    // réordonner deux lignes dans `scheduleDrumWindow`/`scheduleSynthWindow`
    // fait tomber cette assertion.
    //
    // Noter que l'ordre réel est kick → snare → CLAP → hat → SHAKER → bass →
    // pad → melody : clap et shaker se sont intercalés lors de leur ajout
    // (clap avec kick/snare parce qu'il partage `triggerKickSnareStep`,
    // shaker après le hat). `CLAUDE.md` en cite encore la version à six
    // lignes, antérieure à clap/shaker — la contrainte est la même, la liste
    // y est juste incomplète.
    const events = renderEvents(busyState(), 1, EXPORT_SEED);
    const seen: string[] = [];
    for (const e of events) {
      const row = e.split(' ')[0].replace(/^(hatC|hatO)$/, 'hat').replace(/^rim$/, 'snare');
      if (!seen.includes(row)) seen.push(row);
    }
    expect(seen).toEqual(['kick', 'snare', 'clap', 'hat', 'shaker', 'bass', 'pad', 'melody']);
  });

  it('la séquence complète est conforme à la référence', () => {
    // Instantané de référence : la vraie régression se voit ici. S'il tombe,
    // la question à se poser n'est PAS « comment mettre le snapshot à jour »
    // mais « ai-je changé quelque chose qui rend les anciens exports non
    // reproductibles ? ». Si le changement est voulu et assumé, mettre à
    // jour ce fichier — et le dire dans le message de commit.
    const events = renderEvents(busyState(), 2, EXPORT_SEED);
    expect(events).toMatchSnapshot();
  });

  it('une ligne au motif vide ne consomme aucun tirage, quel que soit son nombre de pas', () => {
    // Propriété sur laquelle repose l'ajout de clap/shaker sans casser les
    // patterns déjà exportés (PLAN.md §6) : « le early-return sur pas
    // inactif précède tout appel à rng() », donc une ligne silencieuse ne
    // décale pas l'ordre de consommation des autres.
    //
    // Comment on la vérifie sans pouvoir rejouer le code d'avant clap/shaker :
    // en faisant VARIER le nombre de pas des lignes vides. Si un pas inactif
    // consommait ne serait-ce qu'un tirage, passer de 4 à 32 pas en
    // consommerait 28 de plus par mesure et par ligne — la séquence des
    // autres lignes divergerait aussitôt. Elle reste identique : la
    // propriété tient.
    const few = busyState();
    few.rows.clap.pattern = new Array(4).fill(0);
    few.rows.shaker.pattern = new Array(4).fill(0);
    few.rows.clap.subdiv = 4;
    few.rows.shaker.subdiv = 4;

    const many = busyState();
    many.rows.clap.pattern = new Array(32).fill(0);
    many.rows.shaker.pattern = new Array(32).fill(0);
    many.rows.clap.subdiv = 32;
    many.rows.shaker.subdiv = 32;

    const a = renderEvents(few, 4, EXPORT_SEED);
    const b = renderEvents(many, 4, EXPORT_SEED);

    // Aucune des deux ne fait sonner ces lignes...
    expect(a.some((e) => e.startsWith('clap') || e.startsWith('shaker'))).toBe(false);
    expect(b.some((e) => e.startsWith('clap') || e.startsWith('shaker'))).toBe(false);
    // ...et les six autres lignes sont rigoureusement identiques.
    expect(b).toEqual(a);
  });
  // ---- Fill de clap (2026-08-17) -----------------------------------------
  // Le piège de cette fonctionnalité n'est pas le son mais le déterminisme :
  // un fill fait sonner des pas silencieux, donc des tirages en plus, donc un
  // décalage de tout ce qui suit. D'où un SECOND générateur, et les deux tests
  // ci-dessous : que le fill existe, et qu'il ne coûte rien au premier flux.

  // Un état dont la ZONE DE FILL du clap est libre. `busyState` ne convient
  // pas ici : son clap fait 4 pas, la zone de fill se réduit donc au dernier
  // seul — qui porte déjà une note, et le fill ne garnit que les pas vides.
  // Le fixture ne prouvait rien, la règle est correcte.
  function clapFillState(): PatternStateV2 {
    const s = busyState();
    s.rows.clap.subdiv = 8;
    s.rows.clap.pattern = [0, 1, 0, 1, 0, 1, 0, 0]; // les 2 derniers pas libres
    s.fillEvery = 1; // chaque mesure est une mesure de fill
    s.fillIntensity = 100;
    return s;
  }

  it('un fill de clap garnit la fin de la mesure de fill', () => {
    const sans = clapFillState();
    sans.fillEvery = 0;
    const avec = clapFillState();

    const nbClaps = (evs: Ev[]) => evs.filter((e) => e.startsWith('clap')).length;
    expect(nbClaps(renderEvents(avec, 2, EXPORT_SEED))).toBeGreaterThan(
      nbClaps(renderEvents(sans, 2, EXPORT_SEED)),
    );
  });

  it('le fill de clap ne consomme RIEN sur le flux principal', () => {
    // La preuve tient en une comparaison : on fait varier UNIQUEMENT la graine
    // du second flux. Si le fill puisait dans le premier, la moindre frappe
    // ajoutée décalerait tous les tirages suivants et TOUTES les autres lignes
    // changeraient de vélocité. Elles doivent rester rigoureusement
    // identiques ; seuls les claps doivent bouger.
    const s = clapFillState();
    const a = renderEvents(s, 3, EXPORT_SEED, 1);
    const b = renderEvents(s, 3, EXPORT_SEED, 2);

    const sansClap = (evs: Ev[]) => evs.filter((e) => !e.startsWith('clap'));
    expect(sansClap(b)).toEqual(sansClap(a));
    // Et le second flux sert bien à quelque chose : deux graines différentes
    // donnent des claps différents (sinon le test ci-dessus serait vide de
    // sens, comme le serait un test de reproductibilité sans son jumeau).
    const claps = (evs: Ev[]) => evs.filter((e) => e.startsWith('clap'));
    expect(claps(a).length).toBeGreaterThan(0);
    expect(claps(b)).not.toEqual(claps(a));
  });
});
