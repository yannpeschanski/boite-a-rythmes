// AudioEngine — possède son contexte, son graphe et son état runtime.
// Modèle lookahead classique (Chris Wilson) : setInterval(25ms) programme
// tout ce qui tombe dans les 0.25s à venir sur l'horloge audioCtx.currentTime
// (jamais setTimeout). SCHEDULE_AHEAD élargi (était 0.12) : plus de tolérance
// si le fil principal est occupé un instant.
import type { PatternStateV2, DrumRowName, SynthRowName, SynthVoice, SynthRowState, SynthGlobalState } from '../model/types';
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
import { LiveRecorder } from './recorder';
import { scheduleClick } from './metronome';
import { chordsFor, chordFreqs, degreeFreq, SCALE_LIBRARY } from './harmony';
import { driveCurve, bitcrushCurve, applyCompressionAmount, makeupGainForCompression } from './fx';
import { SYNTH_VOICE_PRESETS, resolveVoicePreset } from '../model/presets/voices';

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
  private liveRecorder: LiveRecorder | null = null;

  // Déclencheurs du Mode Live (phase 2, PLAN.md §7) — par-dessus le pattern,
  // jamais écrits dans l'état : un bouton relâché ou un STOP y remet
  // toujours l'ordre initial, contrairement à un mute posé dans l'Atelier.
  private liveMute: Partial<Record<DrumRowName, boolean>> = {};
  private fillRequested = false;
  private forcedFillBar: number | null = null;
  private liveHatRoll: number | null = null;
  // Catalogue d'actions étendu (PLAN.md §7) : rafale forcée kick/snare, même
  // principe que le hat (liveHatRoll) — un pas vide se met à sonner tant que
  // le bouton est maintenu (voir scheduler.ts, forceKickRoll/forceSnareRoll).
  private liveKickRoll: number | null = null;
  private liveSnareRoll: number | null = null;
  // Catalogue étendu (PLAN.md §7) : sidechain n'a pas de nœud continu (juste
  // une valeur relue à chaque déclenchement, voir triggerSidechainDuck) ; le
  // groove (swing/traîne/ghost/fill) et les réglages de voix synthé sont des
  // champs d'état simples relus à chaque fenêtre de scheduling plutôt que des
  // nœuds de graphe — un override appliqué juste avant chaque fenêtre
  // (withLiveOverrides) plutôt qu'un nœud dédié à construire pour chacun.
  private liveSidechainDepth: number | null = null;
  private liveGrooveOverride: Partial<Pick<PatternStateV2, 'swing' | 'drag' | 'ghostDensity' | 'fillIntensity'>> = {};
  private liveSynthOverride: Partial<
    Record<SynthRowName, { voice?: Partial<SynthVoice>; glide?: number; strum?: number; muted?: boolean }>
  > = {};
  // Tonalité/gamme/arpège nappe — bouton PAS du Mode Live (PLAN.md §7, retour
  // de Yann : « je propose d'agencer les boutons selon 3 types », bouton pas
  // confirmé sur de nouveaux paramètres discrets). Même mécanisme d'override
  // relu à chaque fenêtre que le groove ci-dessus, jamais écrit dans le
  // pattern.
  private liveSynthGlobalOverride: Partial<Pick<SynthGlobalState, 'rootMidi' | 'scaleId' | 'padArpEnabled'>> = {};
  // Index courant dans SYNTH_VOICE_PRESETS[name] pour le bouton PAS "voix" —
  // distinct de liveSynthOverride[name].voice (qui ne porte que les valeurs
  // résolues, pas quel preset les a produites) : sert à savoir où reprendre
  // le cycle au prochain appui.
  private liveVoicePresetIndex: Partial<Record<SynthRowName, number>> = {};
  // Évite de réassigner `.curve` (WaveShaper) à la même valeur arrondie à
  // chaque frame de drag du pad — la réassignation est un changement discret
  // de la table de correspondance, pas interpolé comme un AudioParam.
  private liveSatBucket: number | null = null;
  private liveCrushBucket: number | null = null;

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
      clap: { stepIndex: 0, nextStepTime: 0 },
      shaker: { stepIndex: 0, nextStepTime: 0 },
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
    const depth = this.liveSidechainDepth ?? sg.sidechainDepth / 100;
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

  // Applique les overrides du Mode Live (groove global + tonalité/gamme/
  // arpège + voix/ligne synthé par ligne) à un clone superficiel de l'état,
  // jamais au store — comme liveMute, un override relâché ou un STOP
  // retrouve les réglages de l'Atelier intacts. No-op (retourne `state` tel
  // quel) si rien n'est overridé, pour ne payer aucun coût hors Mode Live.
  private withLiveOverrides(state: PatternStateV2): PatternStateV2 {
    const hasGroove = Object.keys(this.liveGrooveOverride).length > 0;
    const hasSynth = Object.keys(this.liveSynthOverride).length > 0;
    const hasGlobal = Object.keys(this.liveSynthGlobalOverride).length > 0;
    if (!hasGroove && !hasSynth && !hasGlobal) return state;
    let next = state;
    if (hasGroove) next = { ...next, ...this.liveGrooveOverride };
    if (hasGlobal) next = { ...next, synthGlobal: { ...next.synthGlobal, ...this.liveSynthGlobalOverride } };
    if (hasSynth) {
      const synthRows = { ...next.synthRows };
      (Object.keys(this.liveSynthOverride) as SynthRowName[]).forEach((name) => {
        const ov = this.liveSynthOverride[name];
        if (!ov) return;
        const rowOverride: Partial<SynthRowState> = {};
        if (ov.glide !== undefined) rowOverride.glide = ov.glide;
        if (ov.strum !== undefined) rowOverride.strum = ov.strum;
        if (ov.muted !== undefined) rowOverride.muted = ov.muted;
        synthRows[name] = {
          ...synthRows[name],
          ...rowOverride,
          voice: ov.voice ? { ...synthRows[name].voice, ...ov.voice } : synthRows[name].voice,
        };
      });
      next = { ...next, synthRows };
    }
    return next;
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
    this.fillRequested = false;
    this.forcedFillBar = null;
    // Filet de sécurité : si un live take était en cours de capture sans
    // avoir été arrêté explicitement (STOP pressé pendant l'enregistrement),
    // on détache proprement le tap plutôt que de laisser des nœuds pendus
    // sur un contexte sur le point d'être fermé. L'appelant qui veut le WAV
    // doit appeler stopCapture() lui-même AVANT stop() pour récupérer le
    // buffer — ici on jette juste le résultat.
    if (this.liveRecorder) {
      this.liveRecorder.stop();
      this.liveRecorder = null;
    }
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
      // Le prochain start() reconstruit un graphe neuf (sat/crush initialisés
      // depuis l'état, pas depuis le dernier réglage live) — sans ce reset,
      // un pad qui retombe sur le même palier arrondi qu'avant le STOP
      // sauterait sa réapplication (voir setLiveSaturation/setLiveBitcrush).
      this.liveSatBucket = null;
      this.liveCrushBucket = null;
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

  // Bouton FILL du Mode Live : même principe que Break (pris en compte au
  // prochain début de mesure), mais un fill n'a besoin que d'un bar entier —
  // pas de fenêtre dépouillé/explosion à suivre dans le temps.
  liveRequestFill(): void {
    if (this.isPlaying) this.fillRequested = true;
  }

  get fillPending(): boolean {
    return this.fillRequested || this.forcedFillBar === this.currentBar;
  }

  // Boutons MUTE K/S/H : superposés au `muted` du pattern, jamais écrits
  // dedans — repartir de l'Atelier après le Mode Live retrouve la même
  // ligne, mutée ou non, qu'avant.
  liveSetMute(name: DrumRowName, muted: boolean): void {
    this.liveMute = { ...this.liveMute, [name]: muted };
  }

  // Catalogue étendu (PLAN.md §7) — MUTE Basse/Nappe/Mélodie, même principe
  // que liveSetMute mais via l'override de ligne synthé déjà en place pour
  // cutoff/résonance/glide (withLiveOverrides) plutôt qu'un second mécanisme :
  // `muted` n'est écrit dans l'override QUE quand on coupe (jamais `false`),
  // pour ne jamais forcer un démutage d'une ligne coupée dans l'Atelier —
  // même garde-fou que liveMute pour la batterie.
  liveSetSynthMute(name: SynthRowName, muted: boolean): void {
    if (muted) {
      this.liveSynthOverride = { ...this.liveSynthOverride, [name]: { ...this.liveSynthOverride[name], muted: true } };
    } else {
      const { muted: _drop, ...rest } = this.liveSynthOverride[name] ?? {};
      this.liveSynthOverride = { ...this.liveSynthOverride, [name]: rest };
    }
  }

  // Bouton ROLL×2 (maintenu) : force le hat en rafale tant qu'il est
  // enfoncé ; `null` relâche le forçage.
  liveSetHatRoll(multiplier: number | null): void {
    this.liveHatRoll = multiplier;
  }

  // Catalogue étendu (PLAN.md §7) — ROLL kick/snare, même principe que le
  // hat (scheduler.ts, forceKickRoll/forceSnareRoll).
  liveSetKickRoll(multiplier: number | null): void {
    this.liveKickRoll = multiplier;
  }

  liveSetSnareRoll(multiplier: number | null): void {
    this.liveSnareRoll = multiplier;
  }

  // Pad XY du Mode Live — balayage de filtre (axe X) et voile de réverbe
  // (axe Y), tous deux appliqués en direct sur des nœuds toujours neutres
  // ailleurs (voir liveFilter/liveReverbSend dans graph.ts). setTargetAtTime
  // plutôt que setValueAtTime : lisse le geste de drag, évite les clics.
  setLiveFilterCutoff(hz: number): void {
    if (!this.graph || !this.ctx) return;
    this.graph.liveFilter.frequency.setTargetAtTime(hz, this.ctx.currentTime, 0.01);
  }

  setLiveReverbWet(amount01: number): void {
    if (!this.graph || !this.ctx) return;
    // Plafonné à 0.5 : à 1.0 le mix entier partirait noyer la réverbe
    // partagée, au détriment des envois par ligne déjà réglés dans l'Atelier.
    const gain = Math.max(0, Math.min(1, amount01)) * 0.5;
    this.graph.liveReverbSend.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
  }

  // Catalogue étendu (PLAN.md §7) — six paramètres globaux ouverts au
  // pad/inclinaison, appliqués DIRECTEMENT sur les nœuds du bus déjà
  // construits par buildGraph (jamais écrits dans le pattern : rien ne les
  // relit tant que refreshMixSettings() n'est pas rappelé, et le Mode Live ne
  // l'appelle jamais). Mêmes fonctions et mêmes plages que applyMixSettings
  // (graph.ts) — pas de nouvelle formule inventée pour le direct, cohérent
  // avec ce que fait déjà l'Atelier quand on bouge ces curseurs.

  // Saturation/bitcrush : bus DRUM uniquement (sat/crush dans graph.ts, pas
  // la chaîne synthé). `.curve` n'est pas un AudioParam interpolé — on ne
  // réassigne que si le palier arrondi a changé, pour éviter de recalculer/
  // réaffecter la courbe à chaque frame de drag pour la même valeur.
  setLiveSaturation(amount01: number): void {
    if (!this.graph) return;
    const bucket = Math.round(amount01 * 100);
    if (bucket === this.liveSatBucket) return;
    this.liveSatBucket = bucket;
    this.graph.sat.curve = driveCurve(amount01);
  }

  setLiveBitcrush(amount01: number): void {
    if (!this.graph) return;
    const bucket = Math.round(amount01 * 100);
    if (bucket === this.liveCrushBucket) return;
    this.liveCrushBucket = bucket;
    this.graph.crush.curve = bitcrushCurve(amount01);
  }

  setLiveCompression(amount01: number): void {
    if (!this.graph || !this.ctx) return;
    applyCompressionAmount(this.graph.comp, amount01, this.ctx);
    this.graph.makeup.gain.setValueAtTime(makeupGainForCompression(amount01), this.ctx.currentTime);
  }

  // 50..150 % — même plage que le curseur "Volume général" de l'Atelier.
  setLiveVolume(amount01: number): void {
    if (!this.graph || !this.ctx) return;
    this.graph.finalGain.gain.setValueAtTime(0.5 + amount01, this.ctx.currentTime);
  }

  setLiveDelayFeedback(amount01: number): void {
    if (!this.graph || !this.ctx) return;
    this.graph.delayFeedback.gain.setValueAtTime(Math.min(0.9, amount01), this.ctx.currentTime);
  }

  // Pas de nœud continu : juste relu au prochain déclenchement sidechain
  // (triggerSidechainDuck) — un bouton relâché ou un STOP retombe sur le
  // réglage de l'Atelier (sg.sidechainDepth), jamais écrasé.
  setLiveSidechainDepth(amount01: number): void {
    this.liveSidechainDepth = amount01;
  }

  // Catalogue étendu (PLAN.md §7) — bouton BYPASS LIMITEURS : mêmes valeurs
  // exactes que buildGraph (graph.ts) pour enabled/disabled, appliquées
  // directement sur le limiteur déjà construit plutôt que reconstruire le
  // graphe.
  setLiveLimiters(enabled: boolean): void {
    if (!this.graph || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.graph.finalLimiter.threshold.setValueAtTime(enabled ? -1 : 0, now);
    this.graph.finalLimiter.ratio.setValueAtTime(enabled ? 12 : 1, now);
  }

  // Groove global (swing/traîne/densité de ghost notes/intensité de fill) —
  // relu à chaque fenêtre de scheduling (withLiveOverrides), jamais écrit
  // dans le pattern : mêmes champs que les curseurs Groove de l'Atelier,
  // mêmes unités (0..100, voir AtelierView.svelte).
  setLiveGrooveParam(key: 'swing' | 'drag' | 'ghostDensity' | 'fillIntensity', value: number): void {
    this.liveGrooveOverride = { ...this.liveGrooveOverride, [key]: value };
  }

  // Réglages de voix synthé par ligne — posés PAR NOTE (chaque voix crée son
  // propre BiquadFilterNode/gain au déclenchement, voices/synth.ts), donc pas
  // de nœud permanent à moduler ici : l'override est relu à la prochaine
  // note programmée (voir withLiveOverrides). Un seul setter générique plutôt
  // qu'une méthode par champ de SynthVoice (cutoff, résonance, attack,
  // release, detune…) — le catalogue (liveActions.ts) sait déjà quel champ
  // il pilote.
  setLiveSynthVoiceParam<K extends keyof SynthVoice>(name: SynthRowName, key: K, value: SynthVoice[K]): void {
    this.liveSynthOverride = {
      ...this.liveSynthOverride,
      [name]: { ...this.liveSynthOverride[name], voice: { ...this.liveSynthOverride[name]?.voice, [key]: value } },
    };
  }

  // Glide et étalement (strum, nappe seulement) vivent sur la ligne, pas
  // dans SynthVoice — même principe, mêmes unités que row.glide/row.strum
  // (0..1, voir SynthRowView.svelte).
  setLiveSynthRowParam(name: SynthRowName, key: 'glide' | 'strum', value: number): void {
    this.liveSynthOverride = {
      ...this.liveSynthOverride,
      [name]: { ...this.liveSynthOverride[name], [key]: value },
    };
  }

  // Interrupteur générique pour un booléen de synthGlobal (arpège nappe pour
  // l'instant) — même familier que les autres setLive* ci-dessus.
  setLiveSynthGlobalBool(key: 'padArpEnabled', value: boolean): void {
    this.liveSynthGlobalOverride = { ...this.liveSynthGlobalOverride, [key]: value };
  }

  // Boutons PAS (PLAN.md §7) : avancent des paramètres discrets par
  // incréments, contrairement au pad/tilt qui pilotent des valeurs
  // continues. ±1 demi-ton par appui, borné à ±1 octave autour de la
  // tonalité de l'Atelier — un dial chromatique plutôt qu'une roue infinie,
  // pour rester dans un ambitus qui reste musical pendant un set.
  liveStepTranspose(deltaSemitones: number): void {
    const base = this.getState().synthGlobal.rootMidi;
    const current = this.liveSynthGlobalOverride.rootMidi ?? base;
    const next = Math.max(base - 12, Math.min(base + 12, current + deltaSemitones));
    this.liveSynthGlobalOverride = { ...this.liveSynthGlobalOverride, rootMidi: next };
  }

  // Cycle circulaire dans SCALE_LIBRARY (5 modes) — contrairement à la
  // tonalité, il n'y a pas de "trop loin", donc ça boucle plutôt que de se
  // bloquer en bout de liste.
  liveStepScale(delta: number): void {
    const base = this.getState().synthGlobal.scaleId;
    const current = this.liveSynthGlobalOverride.scaleId ?? base;
    const idx = Math.max(0, SCALE_LIBRARY.findIndex((s) => s.id === current));
    const nextIdx = (idx + delta + SCALE_LIBRARY.length) % SCALE_LIBRARY.length;
    this.liveSynthGlobalOverride = { ...this.liveSynthGlobalOverride, scaleId: SCALE_LIBRARY[nextIdx].id };
  }

  // Cycle circulaire dans SYNTH_VOICE_PRESETS[name] — remplace le voice
  // complet plutôt que de fusionner champ à champ, comme le ferait un vrai
  // changement de preset dans l'Atelier (SynthRowView.svelte) : les réglages
  // fins déjà réglés en direct sur d'autres axes pour cette ligne sont donc
  // écrasés par le preset, pas conservés en dessous.
  liveStepVoicePreset(name: SynthRowName, delta: number): void {
    const list = SYNTH_VOICE_PRESETS[name];
    const idx = this.liveVoicePresetIndex[name] ?? 0;
    const nextIdx = (idx + delta + list.length) % list.length;
    this.liveVoicePresetIndex[name] = nextIdx;
    const voice = resolveVoicePreset(name, list[nextIdx].id);
    if (!voice) return;
    this.liveSynthOverride = {
      ...this.liveSynthOverride,
      [name]: { ...this.liveSynthOverride[name], voice },
    };
  }

  // Fréquence effective d'un degré/octave pour la mélodie jouée à la main
  // (bouton SOLO MÉLO, LiveView.playSoloMelody) — relit la tonalité/gamme
  // EFFECTIVES (withLiveOverrides) : un pas de transposition/gamme donné en
  // direct s'entend donc aussi au pad, pas seulement sur le séquenceur.
  liveMelodyFreqForDegree(degree: number, octaveShift: number): number {
    return degreeFreq(this.withLiveOverrides(this.getState()), degree, octaveShift, 0);
  }

  // Niveau crête 0..1 par ligne (batterie + synthé), lu à chaque frame par le
  // visualiseur du Mode Live — jamais par le moteur lui-même.
  getLineLevels(): Partial<Record<DrumRowName | SynthRowName, number>> {
    if (!this.graph) return {};
    const buf = new Uint8Array(32);
    const levels: Partial<Record<DrumRowName | SynthRowName, number>> = {};
    for (const [name, analyser] of Object.entries(this.graph.lineAnalyser)) {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
      levels[name as DrumRowName | SynthRowName] = peak / 128;
    }
    return levels;
  }

  // Spectre du mix — 0..1 par bande, du grave à l'aigu. Rempli DANS un tableau
  // fourni par l'appelant plutôt que renvoyé : le visualiseur tourne à 60 Hz,
  // allouer 256 octets par frame ferait travailler le ramasse-miettes pour
  // rien. Le moteur ne le lit jamais lui-même.
  // `Uint8Array<ArrayBuffer>` et non `Uint8Array` tout court : depuis que les
  // types DOM paramètrent les tableaux typés par leur tampon, `getByteFrequency
  // Data` refuse un tableau qui pourrait être adossé à un SharedArrayBuffer.
  getSpectrum(out: Uint8Array<ArrayBuffer>): boolean {
    if (!this.graph) return false;
    this.graph.spectrum.getByteFrequencyData(out);
    return true;
  }

  // Taille attendue du tableau ci-dessus (fftSize / 2).
  get spectrumSize(): number {
    return this.graph ? this.graph.spectrum.frequencyBinCount : 0;
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
    const state = this.withLiveOverrides(this.getState());
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
      if (this.fillRequested) {
        this.forcedFillBar = this.currentBar;
        this.fillRequested = false;
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
        // En direct, rien n'est reproductible de toute façon : le second flux
        // du fill de clap est simplement Math.random comme le premier. Il ne
        // devient distinct qu'à l'export (render-offline.ts), là où la
        // reproductibilité compte.
        fillRng: Math.random,
        currentBar: this.currentBar,
        breakWindow: this.breakWindow,
        ghostTargetRow: state.ghostRow ?? this.ghostTargetRow,
        onSidechainTrigger: (name, time) => this.maybeTriggerSidechain(name, time),
        emitPlayhead: (ev) => this.playheadQueue.push(ev),
        liveMute: this.liveMute,
        forceFill: this.forcedFillBar === this.currentBar,
        forceHatRoll: this.liveHatRoll,
        forceKickRoll: this.liveKickRoll,
        forceSnareRoll: this.liveSnareRoll,
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
          now,
        },
        now + SCHEDULE_AHEAD,
      );
    }
  }

  /* L'horloge du son ENTENDU, en secondes.
   *
   * `ctx.currentTime` avance dès qu'un échantillon est traité, pas quand il
   * sort du haut-parleur ; `outputLatency` est cet écart. Même compensation
   * que `consumePlayhead` ci-dessous, exposée séparément parce que le Mode jeu
   * en a besoin pour dater une frappe : mesurer un placement contre
   * `performance.now()` mesure l'horloge du fil principal, qui n'est pas celle
   * qu'on entend. Renvoie null tant qu'aucun contexte n'existe.
   */
  audioTime(): number | null {
    if (!this.ctx) return null;
    return this.ctx.currentTime - (this.ctx.outputLatency || 0);
  }

  // Appelée à chaque frame rAF par l'UI : renvoie les événements dont le
  // temps audio programmé est déjà passé selon l'horloge de l'AudioContext.
  // Compensée par outputLatency : ctx.currentTime avance dès qu'un
  // échantillon est TRAITÉ, pas quand il sort réellement du haut-parleur —
  // avec latencyHint 'playback' (choisi pour la robustesse Bluetooth, voir
  // ensureAudio), cet écart peut être significatif. Sans compensation, le
  // curseur visuel semble en avance sur ce qu'on entend.
  consumePlayhead(): PlayheadEvent[] {
    if (!this.ctx || this.playheadQueue.length === 0) return [];
    const now = this.ctx.currentTime - (this.ctx.outputLatency || 0);
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

  // Mode Live — enregistrement du live take (PLAN.md §7) : contrairement à
  // startLiveRecording ci-dessous (durée fixée en mesures, relance la
  // lecture depuis le début), ici la lecture est déjà en cours et n'a pas de
  // durée connue d'avance — start/stop au bouton, sur le graphe qui tourne
  // déjà. Même principe de tap sur finalGain (post-limiteur/soft-clip).
  async startCapture(): Promise<void> {
    if (!this.ctx || !this.graph || this.liveRecorder) return;
    const recorder = new LiveRecorder();
    await recorder.start(this.ctx, this.graph.finalGain);
    this.liveRecorder = recorder;
  }

  get isCapturing(): boolean {
    return this.liveRecorder !== null;
  }

  // Renvoie null si aucune capture n'était en cours (bouton relâché deux
  // fois, ou lecture arrêtée entretemps sans capture démarrée).
  stopCapture(): AudioBuffer | null {
    if (!this.liveRecorder) return null;
    const buffer = this.liveRecorder.stop();
    this.liveRecorder = null;
    return buffer;
  }

  // Précompte avant l'enregistrement du direct (PLAN.md §6, retour de
  // Yann : « métronome + précompte avant l'enregistrement WAV »). Une
  // mesure 4/4 de clics au tempo courant, premier temps accentué — le
  // précompte standard de n'importe quel logiciel d'enregistrement.
  // `onTick` laisse l'appelant afficher le décompte sans dupliquer le
  // calcul du tempo/timing ; la promesse ne se résout qu'une fois les 4
  // clics passés, avant que startLiveRecording ne commence à capturer.
  async countIn(onTick?: (beat: number) => void): Promise<void> {
    this.ensureAudio();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume();
    const beatDur = 60 / this.getState().tempo;
    const startAt = ctx.currentTime + 0.05;
    for (let beat = 0; beat < 4; beat++) {
      scheduleClick(ctx, startAt + beat * beatDur, beat === 0);
    }
    await new Promise<void>((resolve) => {
      for (let beat = 0; beat < 4; beat++) {
        setTimeout(() => onTick?.(beat + 1), Math.max(0, (startAt - ctx.currentTime + beat * beatDur) * 1000));
      }
      setTimeout(resolve, Math.max(0, (startAt - ctx.currentTime + 4 * beatDur) * 1000));
    });
  }

  // Enregistrement du direct : démarre une lecture depuis le tout début du
  // pattern (comme le bouton ▶) et capture la sortie finale (finalGain,
  // post-limiteur/soft-clip, déjà connectée à destination) pendant `bars`
  // mesures réelles. Contrairement au rendu offline (render-offline.ts),
  // c'est vraiment ce qui joue — un curseur bougé pendant l'enregistrement
  // s'entend dans le résultat, comme dans l'original (LiveRecorder). Le tap
  // se fait via un AudioWorklet (recorder.ts) plutôt que le ScriptProcessorNode
  // déprécié de l'original.
  async startLiveRecording(bars: number): Promise<AudioBuffer> {
    this.stop();
    this.ensureAudio();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume();
    this.liveRecorder = new LiveRecorder();
    await this.liveRecorder.start(ctx, this.graph!.finalGain);
    await this.start();
    const durationMs = (barDuration(this.getState().tempo) * bars + 1.0) * 1000;
    return new Promise((resolve) => {
      setTimeout(() => {
        const buffer = this.liveRecorder!.stop();
        this.liveRecorder = null;
        this.stop();
        resolve(buffer);
      }, durationMs);
    });
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
    else if (name === 'hat') stepState === 2 ? kit.playHatOpen(t, row.volume, row) : kit.playHatClosed(t, row.volume, row);
    else if (name === 'clap') kit.playClap(t, row.volume, row);
    else kit.playShaker(t, row.volume, row);
  }

  // Aperçu d'une voix synthé isolée (bouton ▶ Tester) : joue la voix actuelle
  // d'une ligne telle quelle (preset chargé + réglages manuels), sans poser
  // de notes ni lancer la lecture générale — un accord I pour la Nappe, une
  // note (degré 1, octave par défaut) pour Basse/Mélodie. Mêmes gains/durées
  // que l'original (testSynthVoice, l. 2586).
  previewSynth(name: SynthRowName): void {
    this.ensureAudio();
    const ctx = this.ctx!;
    void ctx.resume();
    const synth = this.synth!;
    const state = this.getState();
    const row = state.synthRows[name];
    const t = ctx.currentTime + 0.05;
    if (name === 'pad') {
      const freqs = chordFreqs(state, chordsFor(state), 0);
      synth.playPadChord(freqs, t, 0.6, 0.3, row.voice, 0, 0, null);
    } else {
      const freq = degreeFreq(state, 1, 0, name === 'bass' ? -24 : 0);
      const gain = name === 'bass' ? 0.45 : 0.4;
      if (name === 'bass') synth.playBassNote(freq, t, 0.5, gain, row.voice, null);
      else synth.playMelodyNote(freq, t, 0.5, gain, row.voice, null);
    }
  }

  // Aperçu d'un DEGRÉ précis sur Basse/Mélodie — pour le pad d'écriture de
  // l'Atelier (retour de Yann : « pouvoir ouvrir un pad depuis l'atelier pour
  // jouer/enregistrer une mélodie qui s'inscrit dans la grille »).
  //
  // `previewSynth` ne savait jouer que le degré 1, et `playLiveMelodyNote`
  // ne sert que la Mélodie et veut une fréquence déjà calculée : ni l'un ni
  // l'autre ne répond à « fais-moi entendre le degré 5 de la Basse ». D'où
  // cette méthode, qui reste le seul endroit connaissant le registre de
  // chaque ligne — les -24 demi-tons de la basse sont les MÊMES que ceux du
  // scheduler (scheduler.ts, `name === 'bass' ? -24 : 0`), pour que le pad
  // sonne exactement comme la grille jouera.
  playDegreePreview(name: 'bass' | 'melody', degree: number, octave: number): void {
    this.ensureAudio();
    const ctx = this.ctx!;
    void ctx.resume();
    const state = this.getState();
    const row = state.synthRows[name];
    const freq = degreeFreq(state, degree, octave, name === 'bass' ? -24 : 0);
    const t = ctx.currentTime + 0.02;
    if (name === 'bass') this.synth!.playBassNote(freq, t, 0.45, 0.45, row.voice, null);
    else this.synth!.playMelodyNote(freq, t, 0.45, 0.4, row.voice, null);
  }

  // Son de victoire du Mode jeu (original playChime/playWinSound,
  // l. 8321-8340, jamais porté — PLAN.md §7.3). Connecté à `finalGain`
  // plutôt qu'au « masterGain » de l'original : là-bas ce nom désigne en
  // réalité le bus batterie (passe par saturation/bitcrush/compression du
  // pattern cible) — un hasard de nommage, pas un choix documenté pour ce
  // son précis. Le Mode jeu part toujours d'un état neutre sur ces réglages
  // donc le résultat est identique à l'oreille ; connecter au vrai master
  // reste plus direct si un futur niveau venait à dérégler le bus batterie.
  // Mêmes fréquences/durées/gains que l'original : tier 1 = arpège éclatant
  // qui monte (« ouahou »), tier 2 = simple et positif (« bien »), tier 3 =
  // petite descente tiède (« mouais »).
  playWinChime(tier: 1 | 2 | 3): void {
    this.ensureAudio();
    const ctx = this.ctx!;
    void ctx.resume();
    const out = this.graph!.finalGain;
    const chime = (freqs: number[], dur: number, gain: number) => {
      freqs.forEach((f, i) => {
        const t = ctx.currentTime + i * dur;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
        osc.connect(g);
        g.connect(out);
        osc.start(t);
        osc.stop(t + dur);
      });
    };
    if (tier === 1) chime([523, 659, 784, 1047], 0.14, 0.35);
    else if (tier === 2) chime([523, 659], 0.16, 0.28);
    else chime([392, 370], 0.22, 0.2);
  }

  // Bouton SOLO du Mode Live (maintenu, PLAN.md §7) : joue une note de
  // mélodie à la demande — glisser/tapoter sur le pad pendant que SOLO est
  // tenu remplace le séquenceur pour cette ligne (mutée en direct pendant ce
  // temps, voir liveSetSynthMute). Ponctuel comme preview()/previewSynth(),
  // jamais écrit dans le pattern. `glideFrom` réutilise le mécanisme de
  // portamento déjà utilisé par le scheduler pas à pas — un glissé du doigt
  // d'une zone à l'autre du pad glisse la note comme s'il s'agissait de deux
  // pas successifs, avec exactement la même formule glideTime = glide*0.12
  // (scheduler.ts) : si l'axe glide de la mélodie n'est pas assigné/monté en
  // direct, aucun portamento, comme au pas à pas. Mêmes durée/gain que
  // l'aperçu ▶ Tester (previewSynth). withLiveOverrides (et non l'état brut) :
  // un cutoff/résonance mélodie réglé en direct sur un autre axe s'entend
  // aussi ici.
  playLiveMelodyNote(freq: number, glideFrom: number | null): void {
    if (!this.ctx || !this.synth) return;
    void this.ctx.resume();
    const row = this.withLiveOverrides(this.getState()).synthRows.melody;
    const t = this.ctx.currentTime + 0.01;
    const glideTime = (row.glide || 0) * 0.12;
    const glide = glideTime > 0 && glideFrom != null ? { fromFreq: glideFrom, glideTime } : null;
    this.synth.playMelodyNote(freq, t, 0.5, 0.4, row.voice, glide);
  }
}
