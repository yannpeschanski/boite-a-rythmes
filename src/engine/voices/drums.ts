// Voix drum — port fidèle de l'original (l. 3911–4065). Une classe par
// instance de moteur : l'état du choke (activeOpenHat) devient un champ
// d'instance au lieu d'une globale, ce qui rend le live et l'offline
// rigoureusement indépendants.
import type { GraphNodes } from '../graph';
import { driveCurve } from '../fx';

// Un `voice` neutre (toutes valeurs à 0) reproduit EXACTEMENT le son fixe
// d'origine — tout appel qui ne passe pas de voice (Mode jeu) sonne comme avant.
export interface DrumVoice {
  pitch: number;
  attack: number;
  decay: number;
  tone: number;
  filterCutoff: number;
}
export const NEUTRAL_VOICE: DrumVoice = { pitch: 0, attack: 0, decay: 0, tone: 0, filterCutoff: 20000 };

const resolveVoice = (v?: Partial<DrumVoice> | null): Partial<DrumVoice> => v || NEUTRAL_VOICE;
const pitchMult = (v: Partial<DrumVoice>) => Math.pow(2, (v.pitch || 0) / 12); // ±24 demi-tons
// -50..+50 -> x0.71..x1.41 (resserré : x0.5..x2 faisait déborder les traînes
// sur le pas suivant à tempo rapide)
const decayMult = (v: Partial<DrumVoice>) => Math.pow(2, (v.decay || 0) / 100);
const attackAdd = (v: Partial<DrumVoice>) => ((v.attack || 0) / 100) * 0.08; // 0..100 -> +0..80ms

// Hat métallique façon 808/909 : 6 oscillateurs carrés désaccordés (ratios
// classiques documentés, cf. Sound On Sound / Gordon Reid) plutôt que du
// bruit filtré — c'est ce qui donne le vrai timbre "cloche". Passe-bande puis
// passe-haut en série, même principe que le circuit d'origine.
const HAT_OSC_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];
const HAT_FUNDAMENTAL = 40; // Hz, avant application de Pitch

export class DrumKit {
  private ctx: BaseAudioContext;
  private graph: GraphNodes;
  private activeOpenHat: { gainNode: GainNode; endTime: number } | null = null;

  constructor(graph: GraphNodes) {
    this.ctx = graph.ctx;
    this.graph = graph;
  }

  // Filtre passe-bas optionnel, intercalé juste avant le bus de ligne.
  // Renvoie le bus inchangé au max du curseur (pas de nœud créé pour rien).
  private filterDest(voice: Partial<DrumVoice>, busNode: AudioNode): AudioNode {
    const cutoff = voice.filterCutoff || 20000;
    if (cutoff >= 19900) return busNode;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cutoff;
    filt.connect(busNode);
    return filt;
  }

  playKick(time: number, gain: number, voice?: Partial<DrumVoice>): void {
    const v = resolveVoice(voice);
    const mult = pitchMult(v);
    const dMult = decayMult(v);
    const aAdd = attackAdd(v);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(Math.min(1200, 140 * mult), time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, 38 * mult), time + 0.09);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.001), time + 0.004 + aAdd);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.15 * dMult + aAdd);
    const dest = this.filterDest(v, this.graph.drumLineGain.kick);
    const tone = (v.tone || 0) / 100; // 0..1 : quantité de saturation
    if (tone > 0.03) {
      // seuil : en dessous, la saturation est inaudible — évite un nœud audio par kick pour rien
      const shaper = this.ctx.createWaveShaper();
      shaper.curve = driveCurve(tone);
      osc.connect(shaper);
      shaper.connect(g);
      g.connect(dest as AudioNode);
    } else {
      osc.connect(g);
      g.connect(dest as AudioNode);
    }
    osc.start(time);
    osc.stop(time + 0.17 * dMult + aAdd);
  }

  playSnare(time: number, gain: number, voice?: Partial<DrumVoice>): void {
    const v = resolveVoice(voice);
    const mult = pitchMult(v);
    const dMult = decayMult(v);
    const aAdd = attackAdd(v);
    // Tone (snare) : décale la fréquence du filtre bandpass du bruit,
    // ±1 octave autour de 1800Hz (tone=0 -> 1800Hz, inchangé).
    const bpFreq = 1800 * Math.pow(2, (v.tone || 0) / 50);

    const src = this.ctx.createBufferSource();
    src.buffer = this.graph.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpFreq;
    bp.Q.value = 0.9;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, time);
    ng.gain.exponentialRampToValueAtTime(Math.max(gain * 0.9, 0.001), time + 0.003 + aAdd);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.14 * dMult + aAdd);
    const snareDest = this.filterDest(v, this.graph.drumLineGain.snare);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(snareDest as AudioNode);
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190 * mult, time);
    og.gain.setValueAtTime(0.0001, time);
    og.gain.exponentialRampToValueAtTime(Math.max(gain * 0.6, 0.001), time + 0.003 + aAdd);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.1 * dMult + aAdd);
    osc.connect(og);
    og.connect(snareDest as AudioNode);
    src.start(time);
    src.stop(time + 0.16 * dMult + aAdd);
    osc.start(time);
    osc.stop(time + 0.12 * dMult + aAdd);
  }

  playRimshot(time: number, gain: number, voice?: Partial<DrumVoice>): void {
    const v = resolveVoice(voice);
    const mult = pitchMult(v);
    const dMult = decayMult(v);
    const aAdd = attackAdd(v);
    // Même logique de Tone que playSnare, mais recentré beaucoup plus haut et
    // beaucoup plus court : le "clic" sec du rim, pas le corps plein de la
    // caisse claire.
    const bpFreq = 3200 * Math.pow(2, (v.tone || 0) / 50);

    const src = this.ctx.createBufferSource();
    src.buffer = this.graph.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(14000, Math.max(1200, bpFreq));
    bp.Q.value = 3.5;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, time);
    ng.gain.exponentialRampToValueAtTime(Math.max(gain, 0.001), time + 0.001 + aAdd);
    ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.04 * dMult + aAdd);
    const rimDest = this.filterDest(v, this.graph.drumLineGain.snare);
    src.connect(bp);
    bp.connect(ng);
    ng.connect(rimDest as AudioNode);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(900 * mult, time);
    og.gain.setValueAtTime(0.0001, time);
    og.gain.exponentialRampToValueAtTime(Math.max(gain * 0.5, 0.001), time + 0.001 + aAdd);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.025 * dMult + aAdd);
    osc.connect(og);
    og.connect(rimDest as AudioNode);

    src.start(time);
    src.stop(time + 0.05 * dMult + aAdd);
    osc.start(time);
    osc.stop(time + 0.03 * dMult + aAdd);
  }

  // Choke : un hat fermé coupe le hat ouvert encore en train de sonner —
  // comme les vraies machines où fermé/ouvert partagent le même canal.
  chokeOpenHat(atTime: number): void {
    if (this.activeOpenHat && this.activeOpenHat.endTime > atTime) {
      try {
        this.activeOpenHat.gainNode.gain.cancelScheduledValues(atTime);
        this.activeOpenHat.gainNode.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.012);
      } catch {
        /* nœud déjà libéré */
      }
      this.activeOpenHat = null;
    }
  }

  private triggerHatOscBank(time: number, stopTime: number, fundamental: number, dest: AudioNode): void {
    HAT_OSC_RATIOS.forEach((ratio) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(fundamental * ratio, time);
      osc.connect(dest);
      osc.start(time);
      osc.stop(stopTime);
    });
  }

  playHatClosed(time: number, gain: number, voice?: Partial<DrumVoice>): void {
    const v = resolveVoice(voice);
    const mult = pitchMult(v); // pilote la fondamentale des 6 oscillateurs (le vrai timbre)
    const dMult = decayMult(v);
    const aAdd = attackAdd(v);
    // Tone (hat) : couleur du passe-bande, ±1 octave autour de 10000Hz (référence 808)
    const bpFreq = 10000 * Math.pow(2, (v.tone || 0) / 50);
    this.chokeOpenHat(time);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpFreq;
    bp.Q.value = 1;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = Math.max(2000, bpFreq * 0.7); // suit le passe-bande, sinon un Tone négatif fait chevaucher les deux filtres
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    // ×0.7 (au lieu de ×0.5) : les 6 oscillateurs sont sommés à pleine
    // amplitude AVANT ce filtre, donc une compensation est légitime — mais
    // ×0.5 rendait le curseur "Volume Hat" inutilisable sur sa 1ère moitié.
    g.gain.exponentialRampToValueAtTime(Math.max(gain * 0.7, 0.001), time + 0.002 + aAdd);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045 * dMult + aAdd);
    bp.connect(hp);
    hp.connect(g);
    g.connect(this.filterDest(v, this.graph.drumLineGain.hat) as AudioNode);
    this.triggerHatOscBank(time, time + 0.06 * dMult + aAdd, HAT_FUNDAMENTAL * mult, bp);
  }

  playHatOpen(time: number, gain: number, voice?: Partial<DrumVoice>): void {
    const v = resolveVoice(voice);
    const mult = pitchMult(v);
    const dMult = decayMult(v);
    const aAdd = attackAdd(v);
    const bpFreq = 10000 * Math.pow(2, (v.tone || 0) / 50);
    this.chokeOpenHat(time);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = bpFreq;
    bp.Q.value = 1;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = Math.max(2000, bpFreq * 0.7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(gain * 0.7, 0.001), time + 0.003 + aAdd);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.35 * dMult + aAdd);
    bp.connect(hp);
    hp.connect(g);
    g.connect(this.filterDest(v, this.graph.drumLineGain.hat) as AudioNode);
    this.triggerHatOscBank(time, time + 0.4 * dMult + aAdd, HAT_FUNDAMENTAL * mult, bp);
    this.activeOpenHat = { gainNode: g, endTime: time + 0.35 * dMult + aAdd };
  }
}
