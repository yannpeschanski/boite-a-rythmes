// Moteur de voix synthé — port fidèle de playSynthNote/playPadChord/
// playPadArp/playBassNote/playMelodyNote (l. 6790–7074). Une classe par
// moteur : budget de voix et registre d'oscillateurs deviennent des champs
// d'instance (le rendu offline a le sien, sans budget).
//
// Un oscillateur + filtre passe-bas + enveloppe d'ampli, PLUS des options
// facultatives par preset : filterEnvAmount/Release (le filtre s'ouvre à
// l'attaque puis se referme — souvent ce qui donne le plus de caractère),
// subGain (sub une octave dessous, corps de la Basse), detuneCents/Gain
// (largeur statique), chorusMix (mouvement), vibratoDepth, tone (drive).
import type { SynthVoice, SynthRowName } from '../../model/types';
import type { GraphNodes } from '../graph';
import type { ChordDef } from '../../model/presets/scales';
import { driveCurve } from '../fx';
import type { Rng } from '../rng';

// Budget de voix (chantier "ça rame sur enceinte Bluetooth") : au-delà, on
// saute les couches les plus coûteuses et les moins essentielles (chorus,
// puis sub — pas detune/vibrato, qui portent trop le caractère de la voix)
// sur les NOUVELLES notes. Jamais appliqué en rendu offline : l'export doit
// toujours rendre fidèlement tous les réglages, même très denses.
const MAX_SYNTH_VOICES = 40;

interface NoteOpts extends SynthVoice {
  bus?: AudioNode;
  glideFrom?: number | null;
  glideTime?: number;
}

function rampGain(
  param: AudioParam,
  curve: 'linear' | 'exponential' | undefined,
  value: number,
  time: number,
): void {
  if (curve === 'linear') param.linearRampToValueAtTime(value, time);
  else param.exponentialRampToValueAtTime(value, time);
}

export class SynthKit {
  private ctx: BaseAudioContext;
  private graph: GraphNodes;
  private isOffline: boolean;
  private activeVoiceCount = 0;
  // Registre de TOUS les oscillateurs programmés — Stop coupe vraiment le son
  // (sinon les releases jusqu'à 4s continuent de coûter du CPU).
  private activeOscillators = new Set<OscillatorNode>();

  constructor(graph: GraphNodes, isOffline = false) {
    this.ctx = graph.ctx;
    this.graph = graph;
    this.isOffline = isOffline;
  }

  private track(node: OscillatorNode): void {
    this.activeOscillators.add(node);
    node.addEventListener('ended', () => this.activeOscillators.delete(node));
  }

  stopAll(): void {
    const now = this.ctx.currentTime;
    this.activeOscillators.forEach((node) => {
      try {
        node.stop(now);
      } catch {
        /* déjà arrêté */
      }
    });
    this.activeOscillators.clear();
  }

  playSynthNote(freq: number, time: number, dur: number, gain: number, opts: NoteOpts = {}): void {
    const ctx = this.ctx;
    // Plafond de release relatif à la durée : sans lui, un release long +
    // subdivision rapide fait s'empiler des traînes qui ne s'éteignent
    // jamais — exactement le symptôme "ça rame". Large marge (dur*4 + 2s).
    const requestedRelease = opts.release != null ? opts.release : 0.15;
    const releaseCap = dur * 4 + 2;
    if (!this.isOffline && requestedRelease > releaseCap) opts = { ...opts, release: releaseCap };
    const overBudget = !this.isOffline && this.activeVoiceCount > MAX_SYNTH_VOICES;
    this.activeVoiceCount++;
    const osc = ctx.createOscillator();
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = opts.type || 'sawtooth';
    // Glide : la fréquence part de la note précédente et glisse vers la
    // nouvelle — mais l'enveloppe d'amplitude redémarre quand même (pas un
    // vrai legato mono). Sans glide : saut instantané, comme avant.
    if (opts.glideFrom && (opts.glideTime || 0) > 0) {
      osc.frequency.setValueAtTime(opts.glideFrom, time);
      osc.frequency.exponentialRampToValueAtTime(Math.max(freq, 0.01), time + (opts.glideTime || 0));
    } else {
      osc.frequency.setValueAtTime(freq, time);
    }
    filt.type = 'lowpass';
    const baseCutoff = opts.cutoff || 1800;
    const attack = opts.attack != null ? opts.attack : 0.02;
    const release = opts.release != null ? opts.release : 0.15;
    // Garde-fou : si l'attaque dépasse la fenêtre totale (dur+release), les
    // deux rampes se retrouvent programmées dans le désordre — Web Audio
    // gère mal ce cas, ça s'entend comme un clic net. On raccourcit
    // l'attaque plutôt que d'ignorer le réglage demandé.
    const effectiveAttack = Math.min(attack, Math.max(dur + release - 0.001, 0.001));
    const attackCurve = opts.attackCurve || 'exponential';
    const releaseCurve = opts.releaseCurve || 'exponential';
    const envAmount = opts.filterEnvAmount || 0;
    if (envAmount !== 0) {
      const envRelease = opts.filterEnvRelease != null ? opts.filterEnvRelease : release;
      filt.frequency.setValueAtTime(baseCutoff + envAmount, time);
      filt.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff, 40), time + envRelease);
    } else {
      filt.frequency.setValueAtTime(baseCutoff, time);
    }
    filt.Q.value = opts.resonance != null ? opts.resonance : 0.7;
    g.gain.setValueAtTime(0.0001, time);
    rampGain(g.gain, attackCurve, Math.max(gain, 0.001), time + effectiveAttack);
    rampGain(g.gain, releaseCurve, 0.0001, time + dur + release);
    const bus = opts.bus || this.graph.synthGain;
    // Tone (drive) : saturation en amont du filtre (osc -> drive -> filtre),
    // un nœud créé uniquement si le réglage est audible.
    const toneAmount = (opts.tone || 0) / 100;
    if (toneAmount > 0.03) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = driveCurve(toneAmount);
      osc.connect(shaper);
      shaper.connect(filt);
    } else {
      osc.connect(filt);
    }
    filt.connect(g);
    g.connect(bus);
    osc.start(time);
    osc.stop(time + dur + release + 0.02);
    osc.onended = () => {
      this.activeVoiceCount = Math.max(0, this.activeVoiceCount - 1);
    };
    this.track(osc);

    // Vibrato : LFO sur l'oscillateur principal uniquement (pas le sub, pour
    // un sub-bass stable). ±30 cents max à profondeur 1.
    if (opts.vibratoDepth) {
      const vibRate = opts.vibratoRate != null ? opts.vibratoRate : 5.5; // Hz, vibrato naturel
      const vibLfo = ctx.createOscillator();
      vibLfo.type = 'sine';
      vibLfo.frequency.setValueAtTime(vibRate, time);
      const vibDepthGain = ctx.createGain();
      const vibDepthHz = freq * (Math.pow(2, (opts.vibratoDepth * 30) / 1200) - 1);
      vibDepthGain.gain.setValueAtTime(vibDepthHz, time);
      vibLfo.connect(vibDepthGain);
      vibDepthGain.connect(osc.frequency);
      vibLfo.start(time);
      vibLfo.stop(time + dur + release + 0.02);
      this.track(vibLfo);
    }
    // Chorus : délai court modulé par un LFO lent, en parallèle du signal
    // principal — du mouvement, là où le détune n'ajoute qu'une largeur
    // statique. Taux/profondeur du LFO fixes ; seul le mix est réglable.
    if (opts.chorusMix && !overBudget) {
      const chorusDelay = ctx.createDelay(0.05);
      chorusDelay.delayTime.setValueAtTime(0.012, time);
      const chorusLfo = ctx.createOscillator();
      chorusLfo.type = 'sine';
      chorusLfo.frequency.setValueAtTime(0.6, time);
      const chorusLfoGain = ctx.createGain();
      chorusLfoGain.gain.setValueAtTime(0.004, time);
      chorusLfo.connect(chorusLfoGain);
      chorusLfoGain.connect(chorusDelay.delayTime);
      const chorusOutGain = ctx.createGain();
      chorusOutGain.gain.setValueAtTime(0.0001, time);
      rampGain(chorusOutGain.gain, attackCurve, Math.max(gain * opts.chorusMix, 0.001), time + effectiveAttack);
      rampGain(chorusOutGain.gain, releaseCurve, 0.0001, time + dur + release);
      osc.connect(chorusDelay);
      chorusDelay.connect(chorusOutGain);
      chorusOutGain.connect(bus);
      chorusLfo.start(time);
      chorusLfo.stop(time + dur + release + 0.02);
      this.track(chorusLfo);
    }
    // Sub désactivé au-delà du budget : la couche la plus gourmande en graves
    // — celle à couper en premier quand ça sature.
    if (opts.subGain && !overBudget) {
      const subOsc = ctx.createOscillator();
      const subG = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq / 2, time);
      subG.gain.setValueAtTime(0.0001, time);
      rampGain(subG.gain, attackCurve, Math.max(gain * opts.subGain, 0.001), time + effectiveAttack);
      rampGain(subG.gain, releaseCurve, 0.0001, time + dur + release);
      subOsc.connect(subG);
      subG.connect(bus);
      subOsc.start(time);
      subOsc.stop(time + dur + release + 0.02);
      this.track(subOsc);
    }
    if (opts.detuneCents) {
      const osc2 = ctx.createOscillator();
      const filt2 = ctx.createBiquadFilter();
      const g2 = ctx.createGain();
      osc2.type = osc.type;
      osc2.frequency.setValueAtTime(freq, time);
      osc2.detune.setValueAtTime(opts.detuneCents, time);
      filt2.type = 'lowpass';
      filt2.frequency.setValueAtTime(baseCutoff, time);
      filt2.Q.value = filt.Q.value;
      g2.gain.setValueAtTime(0.0001, time);
      rampGain(g2.gain, attackCurve, Math.max(gain * (opts.detuneGain != null ? opts.detuneGain : 0.6), 0.001), time + effectiveAttack);
      rampGain(g2.gain, releaseCurve, 0.0001, time + dur + release);
      osc2.connect(filt2);
      filt2.connect(g2);
      g2.connect(bus);
      osc2.start(time);
      osc2.stop(time + dur + release + 0.02);
      this.track(osc2);
    }
  }

  // Nappe : accord tenu, filtre plus fermé, attaque lente ("coussin").
  // Glide PAR VOIX : chaque note glisse depuis la note à la MÊME POSITION
  // dans l'accord précédent (voice leading simple par position). Renvoie les
  // fréquences jouées, à mémoriser pour le glide du prochain accord.
  playPadChord(
    chordFreqs: number[],
    time: number,
    dur: number,
    gain: number,
    voice: SynthVoice,
    strumSpread: number,
    glideTime: number,
    lastFreqs: number[] | null,
  ): number[] {
    const perNoteOffset = strumSpread && chordFreqs.length > 1 ? strumSpread / (chordFreqs.length - 1) : 0;
    chordFreqs.forEach((f, i) => {
      const fromFreq = glideTime > 0 && lastFreqs && lastFreqs[i] ? lastFreqs[i] : null;
      this.playSynthNote(f, time + perNoteOffset * i, dur, gain, {
        type: 'sawtooth',
        cutoff: 900,
        attack: 0.08,
        release: 0.3,
        ...voice,
        bus: this.graph.synthLineGain.pad,
        glideFrom: fromFreq,
        glideTime: fromFreq ? glideTime : 0,
      });
    });
    return chordFreqs;
  }

  // Arpégiateur Nappe : égrène les notes de l'accord au lieu de les jouer en
  // bloc — même source, juste un déclenchement en rafale rythmée.
  // Attaque/release resserrés sur la durée de chaque micro-note.
  playPadArp(
    chordFreqs: number[],
    time: number,
    dur: number,
    gain: number,
    voice: SynthVoice,
    rate: number,
    pattern: string,
    rng: Rng,
  ): number[] {
    if (!chordFreqs.length) return chordFreqs;
    const count = Math.max(1, rate || 4);
    const order = arpNoteOrder(pattern, chordFreqs.length, count, rng);
    const noteDur = dur / count;
    const env = Math.min(0.05, noteDur * 0.35);
    order.forEach((idx, i) => {
      this.playSynthNote(chordFreqs[idx], time + i * noteDur, noteDur * 0.85, gain, {
        type: 'sawtooth',
        cutoff: 900,
        ...voice,
        bus: this.graph.synthLineGain.pad,
        attack: 0.005,
        release: env,
      });
    });
    return chordFreqs;
  }

  // Basse : même modèle degré+octave que la mélodie, voix grave. Renvoie la
  // fréquence jouée (point de départ du glide de la note suivante).
  playBassNote(freq: number, time: number, dur: number, gain: number, voice: SynthVoice, glide: { fromFreq: number; glideTime: number } | null): number {
    this.playSynthNote(freq, time, dur, gain, {
      type: 'sine',
      cutoff: 600,
      attack: 0.005,
      release: 0.08,
      ...voice,
      bus: this.graph.synthLineGain.bass,
      glideFrom: glide && glide.fromFreq,
      glideTime: glide ? glide.glideTime : 0,
    });
    return freq;
  }

  // Mélodie : lead plus brillant, filtre ouvert, attaque nette.
  playMelodyNote(freq: number, time: number, dur: number, gain: number, voice: SynthVoice, glide: { fromFreq: number; glideTime: number } | null): number {
    this.playSynthNote(freq, time, dur, gain, {
      type: 'sawtooth',
      cutoff: 2600,
      attack: 0.01,
      release: 0.1,
      ...voice,
      bus: this.graph.synthLineGain.melody,
      glideFrom: glide && glide.fromFreq,
      glideTime: glide ? glide.glideTime : 0,
    });
    return freq;
  }
}

// Ordre des notes de l'arpège — indices dans le tableau de fréquences.
// 'updown' ne répète pas la note du sommet ; 'random' mélange par cycle
// plutôt qu'un tirage indépendant note à note (évite les répétitions
// immédiates qui sonneraient hasardeuses plutôt qu'"aléatoires mais justes").
export function arpNoteOrder(pattern: string, chordSize: number, count: number, rng: Rng): number[] {
  const base: number[] = [];
  if (pattern === 'down') {
    for (let i = chordSize - 1; i >= 0; i--) base.push(i);
  } else if (pattern === 'updown') {
    for (let i = 0; i < chordSize; i++) base.push(i);
    for (let i = chordSize - 2; i > 0; i--) base.push(i);
  } else if (pattern === 'random') {
    for (let i = 0; i < chordSize; i++) base.push(i);
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
  } else {
    for (let i = 0; i < chordSize; i++) base.push(i); // 'up' par défaut
  }
  const order: number[] = [];
  for (let i = 0; i < count; i++) order.push(base[i % base.length]);
  return order;
}

// Fréquences d'un accord de nappe. -12 demi-tons (1 octave) : la Nappe n'a
// pas de contrôle d'octave par accord, sans cet ancrage elle restait bloquée
// au registre médium ("ne descend pas dans les basses").
export function chordFreqsOf(
  chords: ChordDef[],
  chordIdx: number,
  scaleDegreeFreq: (degree: number, octaveShift: number, registerSemitones: number) => number,
): number[] {
  const chord = chords[chordIdx];
  if (!chord) return [];
  return chord.degrees.map((d) => scaleDegreeFreq(d, 0, -12));
}
