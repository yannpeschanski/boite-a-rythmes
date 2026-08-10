// Construction du graphe audio — UN SEUL builder, ctx en paramètre (live ou
// offline). Les nœuds sont possédés par l'objet retourné (jamais des
// globales) : c'est ce qui supprime le hack "sauvegarder/restaurer 18
// globales" de l'export MP3 original.
import type { PatternStateV2, DrumRowName, SynthRowName } from '../model/types';
import {
  driveCurve,
  bitcrushCurve,
  softClipCurve,
  applyCompressionAmount,
  makeupGainForCompression,
  buildReverbImpulse,
} from './fx';

export interface GraphNodes {
  ctx: BaseAudioContext;
  // Étage final : mixBus reçoit drum + synthé, puis limiteur de sécurité,
  // saturateur doux anti-clic, volume général, destination.
  mixBus: GainNode;
  finalLimiter: DynamicsCompressorNode;
  finalGain: GainNode;
  // Bus drum : chaîne d'effets globaux (saturation/compression/bitcrush).
  masterGain: GainNode;
  sat: WaveShaperNode;
  crush: WaveShaperNode;
  comp: DynamicsCompressorNode;
  makeup: GainNode;
  // Point de sommation par ligne drum (gain=1) : permet d'y brancher les
  // envois réverbe/delay sans toucher au volume par note.
  drumLineGain: Record<DrumRowName, GainNode>;
  // Réverbe et delay PARTAGÉS par les 6 lignes — un seul convolver + un seul
  // delay, chaque ligne y envoie sa propre quantité.
  reverb: ConvolverNode;
  delayNode: DelayNode;
  delayFeedback: GainNode;
  lineReverbSend: Record<DrumRowName | SynthRowName, GainNode>;
  lineDelaySend: Record<DrumRowName | SynthRowName, GainNode>;
  // Chaîne synthé : notes -> synthLineGain[x] -> limiteur de ligne -> softClip
  // -> duckGain (sidechain) -> synthGain(0.7) -> mixBus. Les envois
  // réverbe/delay partent de la sortie du limiteur (softClip) : la traîne de
  // réverbe n'est pas coupée par le sidechain — choix délibéré, plus musical.
  synthGain: GainNode;
  synthLineGain: Record<SynthRowName, GainNode>;
  synthLineLimiter: Record<SynthRowName, DynamicsCompressorNode>;
  synthDuckGain: Record<SynthRowName, GainNode>;
  // Bruit blanc partagé (snare/rim) — recréé par contexte, jamais mis en
  // cache entre live et offline.
  noiseBuffer: AudioBuffer;
}

// Delay partagé : temps synchronisé au tempo (fraction de noire).
export function delayTimeSeconds(state: PatternStateV2): number {
  const frac = parseFloat(state.synthGlobal.delayDivision) || 0.25;
  return frac * (240 / state.tempo / 4);
}

// Plafonné à 90% : au-delà, la boucle de feedback peut s'auto-entretenir
// indéfiniment plutôt que s'éteindre.
export function delayFeedbackAmount(state: PatternStateV2): number {
  return Math.min(0.9, state.synthGlobal.delayFeedback / 100);
}

export function buildGraph(ctx: BaseAudioContext, state: PatternStateV2): GraphNodes {
  const now = ctx.currentTime;

  // --- Étage final. Réglages volontairement plus doux qu'un brickwall :
  // seuil proche de 0dB, knee progressif, attaque 3ms (1ms clique sur un
  // transitoire de kick). Désactivé : ratio 1:1 + seuil 0dB = transparent.
  const mixBus = ctx.createGain();
  mixBus.gain.value = 1;
  const finalLimiter = ctx.createDynamicsCompressor();
  const enabled = state.synthGlobal.limitersEnabled;
  finalLimiter.threshold.setValueAtTime(enabled ? -1 : 0, now);
  finalLimiter.knee.setValueAtTime(6, now);
  finalLimiter.ratio.setValueAtTime(enabled ? 12 : 1, now);
  finalLimiter.attack.setValueAtTime(0.003, now);
  finalLimiter.release.setValueAtTime(0.15, now);
  const softClip = ctx.createWaveShaper();
  softClip.curve = softClipCurve(1.6);
  softClip.oversample = '4x'; // limite l'aliasing introduit par la saturation
  const finalGain = ctx.createGain();
  finalGain.gain.setValueAtTime(state.finalVolume / 100 || 1, now);
  mixBus.connect(finalLimiter);
  finalLimiter.connect(softClip);
  softClip.connect(finalGain);
  finalGain.connect(ctx.destination);

  // --- Bus drum + chaîne d'effets globaux.
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.7;
  const sat = ctx.createWaveShaper();
  sat.curve = driveCurve(state.globalSaturation / 100);
  const crush = ctx.createWaveShaper();
  crush.curve = bitcrushCurve(state.globalBitcrush / 100);
  const comp = ctx.createDynamicsCompressor();
  applyCompressionAmount(comp, state.globalCompression / 100, ctx);
  const makeup = ctx.createGain();
  makeup.gain.setValueAtTime(makeupGainForCompression(state.globalCompression / 100), now);
  masterGain.connect(sat);
  sat.connect(crush);
  crush.connect(comp);
  comp.connect(makeup);
  makeup.connect(mixBus);

  // --- Réverbe + delay partagés.
  const reverb = ctx.createConvolver();
  reverb.buffer = buildReverbImpulse(ctx, state.synthGlobal.reverbSize / 100);
  reverb.normalize = true;
  reverb.connect(mixBus);
  const delayNode = ctx.createDelay(2.0);
  delayNode.delayTime.setValueAtTime(delayTimeSeconds(state), now);
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.setValueAtTime(delayFeedbackAmount(state), now);
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(mixBus);

  // --- Lignes drum : point de sommation + envois.
  const drumLineGain = {} as Record<DrumRowName, GainNode>;
  const lineReverbSend = {} as GraphNodes['lineReverbSend'];
  const lineDelaySend = {} as GraphNodes['lineDelaySend'];
  (['kick', 'snare', 'hat'] as DrumRowName[]).forEach((name) => {
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(masterGain);
    drumLineGain[name] = g;
    const rs = ctx.createGain();
    rs.gain.setValueAtTime(state.rows[name].reverbSend || 0, now);
    g.connect(rs);
    rs.connect(reverb);
    lineReverbSend[name] = rs;
    const ds = ctx.createGain();
    ds.gain.setValueAtTime(state.rows[name].delaySend || 0, now);
    g.connect(ds);
    ds.connect(delayNode);
    lineDelaySend[name] = ds;
  });
  // --- Lignes synthé. Mini-limiteur PAR LIGNE : seuil plus bas que le
  // limiteur final (-6dB au lieu de -1dB) car il doit rattraper des pics
  // locaux à une ligne AVANT le mélange (une Nappe avec accord + Sub +
  // Détune + Chorus peut sommer plusieurs oscillateurs sur les mêmes notes).
  // Désactivable : ratio 1:1 + seuil 0dB = transparent, sans reconstruire le
  // graphe. Sa sortie passe par un saturateur doux (voir softClipCurve) —
  // c'est ICI que des notes à release long s'empilent le plus.
  const synthGain = ctx.createGain();
  synthGain.gain.value = 0.7;
  synthGain.connect(mixBus);
  const synthLineGain = {} as Record<SynthRowName, GainNode>;
  const synthLineLimiter = {} as Record<SynthRowName, DynamicsCompressorNode>;
  const synthDuckGain = {} as Record<SynthRowName, GainNode>;
  (['bass', 'pad', 'melody'] as SynthRowName[]).forEach((name) => {
    // Le volume de ligne synthé s'applique ici (bus), pas par note — les
    // gains de note (0.3/0.65/0.32) sont des équilibres fixes du moteur.
    const lineGain = ctx.createGain();
    lineGain.gain.value = state.synthRows[name].volume;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(enabled ? -6 : 0, now);
    limiter.knee.setValueAtTime(6, now);
    limiter.ratio.setValueAtTime(enabled ? 10 : 1, now);
    limiter.attack.setValueAtTime(0.003, now);
    limiter.release.setValueAtTime(0.15, now);
    const clip = ctx.createWaveShaper();
    clip.curve = softClipCurve(1.4);
    clip.oversample = '4x';
    const duck = ctx.createGain();
    duck.gain.value = 1;
    lineGain.connect(limiter);
    limiter.connect(clip);
    clip.connect(duck);
    duck.connect(synthGain);
    const rs = ctx.createGain();
    rs.gain.setValueAtTime(state.synthRows[name].reverbSend || 0, now);
    clip.connect(rs);
    rs.connect(reverb);
    lineReverbSend[name] = rs;
    const ds = ctx.createGain();
    ds.gain.setValueAtTime(state.synthRows[name].delaySend || 0, now);
    clip.connect(ds);
    ds.connect(delayNode);
    lineDelaySend[name] = ds;
    synthLineGain[name] = lineGain;
    synthLineLimiter[name] = limiter;
    synthDuckGain[name] = duck;
  });

  // --- Bruit blanc partagé.
  const len = ctx.sampleRate * 1.0;
  const noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  return {
    ctx,
    mixBus,
    finalLimiter,
    finalGain,
    masterGain,
    sat,
    crush,
    comp,
    makeup,
    drumLineGain,
    reverb,
    delayNode,
    delayFeedback,
    lineReverbSend,
    lineDelaySend,
    synthGain,
    synthLineGain,
    synthLineLimiter,
    synthDuckGain,
    noiseBuffer,
  };
}

// Application en direct des réglages de mix/fx sans reconstruire le graphe —
// appelée quand les curseurs concernés bougent.
export function applyMixSettings(g: GraphNodes, state: PatternStateV2): void {
  const now = g.ctx.currentTime;
  g.sat.curve = driveCurve(state.globalSaturation / 100);
  g.crush.curve = bitcrushCurve(state.globalBitcrush / 100);
  applyCompressionAmount(g.comp, state.globalCompression / 100, g.ctx);
  g.makeup.gain.setValueAtTime(makeupGainForCompression(state.globalCompression / 100), now);
  g.finalGain.gain.setValueAtTime(state.finalVolume / 100 || 1, now);
  const enabled = state.synthGlobal.limitersEnabled;
  g.finalLimiter.threshold.setValueAtTime(enabled ? -1 : 0, now);
  g.finalLimiter.ratio.setValueAtTime(enabled ? 12 : 1, now);
  g.delayNode.delayTime.setValueAtTime(delayTimeSeconds(state), now);
  g.delayFeedback.gain.setValueAtTime(delayFeedbackAmount(state), now);
  (['kick', 'snare', 'hat'] as DrumRowName[]).forEach((name) => {
    g.lineReverbSend[name].gain.setValueAtTime(state.rows[name].reverbSend || 0, now);
    g.lineDelaySend[name].gain.setValueAtTime(state.rows[name].delaySend || 0, now);
  });
  (['bass', 'pad', 'melody'] as SynthRowName[]).forEach((name) => {
    g.synthLineGain[name].gain.setValueAtTime(state.synthRows[name].volume, now);
    g.lineReverbSend[name].gain.setValueAtTime(state.synthRows[name].reverbSend || 0, now);
    g.lineDelaySend[name].gain.setValueAtTime(state.synthRows[name].delaySend || 0, now);
    const lim = g.synthLineLimiter[name];
    lim.threshold.setValueAtTime(enabled ? -6 : 0, now);
    lim.ratio.setValueAtTime(enabled ? 10 : 1, now);
  });
  // La taille de réverbe demande une nouvelle impulsion (pas un simple gain).
  g.reverb.buffer = buildReverbImpulse(g.ctx, state.synthGlobal.reverbSize / 100);
}
