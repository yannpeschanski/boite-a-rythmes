// AudioEngine — possède son contexte, son graphe et son état runtime.
// Modèle lookahead classique (Chris Wilson) : setInterval(25ms) programme
// tout ce qui tombe dans les 0.25s à venir sur l'horloge audioCtx.currentTime
// (jamais setTimeout). SCHEDULE_AHEAD élargi (était 0.12) : plus de tolérance
// si le fil principal est occupé un instant.
import type { PatternStateV2, DrumRowName, SynthRowName } from '../model/types';
import { buildGraph, applyMixSettings, type GraphNodes } from './graph';
import { DrumKit } from './voices/drums';
import { SynthKit } from './voices/synth';
import {
  scheduleDrumWindow,
  scheduleSynthWindow,
  type Cursors,
  type SynthCursors,
  type PlayheadEvent,
} from './scheduler';
import { barDuration, type BreakWindow } from './groove';

const LOOKAHEAD = 25; // ms
const SCHEDULE_AHEAD = 0.25; // s

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private graph: GraphNodes | null = null;
  private kit: DrumKit | null = null;
  private synth: SynthKit | null = null;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private cursors: Cursors = AudioEngine.freshCursors();
  private synthCursors: SynthCursors = AudioEngine.freshSynthCursors();
  private currentBar = 0;
  private nextBarTime: number | null = null;
  private breakRequested = false;
  private breakWindow: BreakWindow | null = null;
  // Curseur visuel découplé : file d'événements consommée contre l'horloge
  // audio à chaque frame (voir consumePlayhead) — jamais via setTimeout, qui
  // tourne sur une horloge différente et dérive par rapport au son.
  private playheadQueue: PlayheadEvent[] = [];

  isPlaying = false;
  ghostTargetRow: DrumRowName = 'snare';

  // L'état est lu à chaque tick via ce getter : les changements de curseurs
  // dans l'UI s'appliquent naturellement au prochain pas programmé.
  constructor(private getState: () => PatternStateV2) {}

  private static freshCursors(): Cursors {
    return {
      kick: { stepIndex: 0, nextStepTime: 0 },
      snare: { stepIndex: 0, nextStepTime: 0 },
      hat: { stepIndex: 0, nextStepTime: 0 },
    };
  }

  private static freshSynthCursors(): SynthCursors {
    const c = () => ({ stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null });
    return { bass: c(), pad: c(), melody: c() };
  }

  // Sidechain : creuse puis relâche le gain des lignes ciblées à l'instant
  // `time`. setValueAtTime direct sur le plancher (pas de rampe d'attaque) :
  // c'est la brutalité de la chute qui fait le "pompe". cancelScheduledValues
  // d'abord, pour qu'une frappe rapprochée re-déclenche proprement.
  private triggerSidechainDuck(time: number): void {
    const graph = this.graph;
    if (!graph) return;
    const sg = this.getState().synthGlobal;
    const depth = sg.sidechainDepth / 100;
    const release = sg.sidechainRelease / 1000;
    const floor = Math.max(0.001, 1 - depth);
    const targets: SynthRowName[] = [];
    if (sg.sidechainTargetBass) targets.push('bass');
    if (sg.sidechainTargetPad) targets.push('pad');
    if (sg.sidechainTargetMelody) targets.push('melody');
    targets.forEach((name) => {
      const g = graph.synthDuckGain[name];
      g.gain.cancelScheduledValues(time);
      g.gain.setValueAtTime(floor, time);
      g.gain.linearRampToValueAtTime(1, time + release);
    });
  }

  // Appelé à chaque frappe RÉELLE de kick/snare (pas les ghost notes ni les
  // montées de fill).
  private maybeTriggerSidechain(rowName: DrumRowName, time: number): void {
    const sg = this.getState().synthGlobal;
    const triggered =
      (rowName === 'kick' && sg.sidechainTriggerKick) ||
      (rowName === 'snare' && sg.sidechainTriggerSnare);
    if (triggered) this.triggerSidechainDuck(time);
  }

  // latencyHint 'playback' : robustesse (Bluetooth notamment) plutôt que
  // latence minimale — on programme tout en avance de toute façon.
  private ensureAudio(): void {
    if (this.ctx && this.graph) return;
    this.ctx = new AudioContext({ latencyHint: 'playback' });
    this.graph = buildGraph(this.ctx, this.getState());
    this.kit = new DrumKit(this.graph);
    this.synth = new SynthKit(this.graph, false);
  }

  async start(): Promise<void> {
    this.ensureAudio();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume(); // autoplay policy : resume sur geste utilisateur
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentBar = 0;
    this.playheadQueue = [];
    const startAt = ctx.currentTime + 0.06;
    this.nextBarTime = startAt + barDuration(this.getState().tempo);
    (Object.keys(this.cursors) as DrumRowName[]).forEach((n) => {
      this.cursors[n] = { stepIndex: 0, nextStepTime: startAt };
    });
    this.synthCursors = AudioEngine.freshSynthCursors();
    (Object.keys(this.synthCursors) as SynthRowName[]).forEach((n) => {
      this.synthCursors[n].nextStepTime = startAt;
    });
    this.tick();
    this.schedulerTimer = setInterval(() => this.tick(), LOOKAHEAD);
  }

  stop(): void {
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    this.schedulerTimer = null;
    this.isPlaying = false;
    this.playheadQueue = [];
    this.breakRequested = false;
    this.breakWindow = null;
    // Couper vraiment les oscillateurs synthé déjà programmés (release
    // jusqu'à 4s qui continueraient de coûter du CPU), puis recréer le
    // contexte au prochain start() — le moyen le plus sûr de couper net
    // toutes les queues (notes programmées, réverbe, delay).
    this.synth?.stopAll();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.graph = null;
      this.kit = null;
      this.synth = null;
    }
  }

  // Bouton 🫨 Break : pris en compte au prochain début de mesure
  // (déclenchement immédiat = coupure disgracieuse en plein temps).
  requestBreak(): void {
    if (this.isPlaying) this.breakRequested = true;
  }

  get breakPending(): boolean {
    return this.breakRequested || this.breakWindow !== null;
  }

  // Réglages de mix/fx appliqués en direct sans reconstruire le graphe.
  refreshMixSettings(): void {
    if (this.graph) applyMixSettings(this.graph, this.getState());
  }

  private tick(): void {
    const ctx = this.ctx;
    const graph = this.graph;
    const kit = this.kit;
    if (!ctx || !graph || !kit || !this.isPlaying) return;
    const state = this.getState();
    const now = ctx.currentTime;
    const barDur = barDuration(state.tempo);

    if (this.nextBarTime !== null && now >= this.nextBarTime) {
      const justStartedBarTime = this.nextBarTime; // avant incrément : début de la mesure qui démarre tout juste
      this.currentBar++;
      this.nextBarTime += barDur;
      if (this.breakRequested) {
        this.breakWindow = { startTime: justStartedBarTime, endTime: justStartedBarTime + barDur };
        this.breakRequested = false;
      }
    }
    // Expiration explicite : si le scheduler tourne en retard d'un cycle, le
    // break ne doit pas rester actif au-delà de sa fenêtre.
    if (this.breakWindow && now >= this.breakWindow.endTime) this.breakWindow = null;

    scheduleDrumWindow(
      {
        state,
        kit,
        cursors: this.cursors,
        rng: Math.random,
        currentBar: this.currentBar,
        breakWindow: this.breakWindow,
        ghostTargetRow: state.ghostRow ?? this.ghostTargetRow,
        onSidechainTrigger: (name, time) => this.maybeTriggerSidechain(name, time),
        emitPlayhead: (ev) => this.playheadQueue.push(ev),
      },
      now + SCHEDULE_AHEAD,
    );
    if (this.synth) {
      scheduleSynthWindow(
        {
          state,
          synth: this.synth,
          cursors: this.synthCursors,
          rng: Math.random,
          breakWindow: this.breakWindow,
          emitPlayhead: (ev) => this.playheadQueue.push(ev),
        },
        now + SCHEDULE_AHEAD,
      );
    }
  }

  // Appelée à chaque frame rAF par l'UI : renvoie les événements dont le
  // temps audio programmé est déjà passé selon l'horloge de l'AudioContext.
  consumePlayhead(): PlayheadEvent[] {
    if (!this.ctx || this.playheadQueue.length === 0) return [];
    const now = this.ctx.currentTime;
    const due: PlayheadEvent[] = [];
    const remaining: PlayheadEvent[] = [];
    this.playheadQueue.sort((a, b) => a.time - b.time);
    for (const ev of this.playheadQueue) {
      if (ev.time <= now) due.push(ev);
      else remaining.push(ev);
    }
    this.playheadQueue = remaining;
    return due;
  }

  // Aperçu d'un son isolé (clic sur une case, test de timbre).
  preview(name: DrumRowName, stepState: number): void {
    this.ensureAudio();
    const ctx = this.ctx!;
    void ctx.resume();
    const kit = this.kit!;
    const row = this.getState().rows[name];
    const t = ctx.currentTime + 0.02;
    if (name === 'kick') kit.playKick(t, row.volume, row);
    else if (name === 'snare') stepState === 2 ? kit.playRimshot(t, row.volume, row) : kit.playSnare(t, row.volume, row);
    else stepState === 2 ? kit.playHatOpen(t, row.volume, row) : kit.playHatClosed(t, row.volume, row);
  }
}
