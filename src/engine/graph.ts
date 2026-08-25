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

/* Les constantes du petit haut-parleur, ici plutôt qu'en dur dans le corps :
 * c'est ce qui permet de les mesurer dans un test sans les recopier.
 *
 * 450 Hz = un boîtier de radio-réveil ou de téléphone : mesuré dans un
 * `OfflineAudioContext`, le grave d'un kick y perd plus de quatorze fois son
 * énergie. La bosse de présence à 3 kHz est le « sifflement » du texte — elle
 * ne sert pas à faire joli, elle empêche le petit haut-parleur de passer pour
 * une simple baisse de volume, à laquelle on répondrait au vu-mètre. */
export const PETIT_HP_COUPURE_HZ = 450;
export const PETIT_HP_PRESENCE_HZ = 3000;
export const PETIT_HP_PRESENCE_DB = 6;

export interface GraphNodes {
  ctx: BaseAudioContext;
  // Étage final : mixBus reçoit drum + synthé, puis un filtre passe-bas
  // "macro live" (neutre par défaut, cutoff au maximum — seul le Mode Live y
  // touche), limiteur de sécurité, saturateur doux anti-clic, volume
  // général, destination.
  mixBus: GainNode;
  liveFilter: BiquadFilterNode;
  /* Le petit haut-parleur de la laverie (acte 4). Les deux filtres tournent en
   * permanence, dans une BRANCHE PARALLÈLE dont le gain est nul au repos : ce
   * sont `petitHPSec` (1 au repos) et `petitHPHumide` (0) qui font la bascule,
   * en fondu. Voir le commentaire du montage pour ce que ça évite. */
  petitHautParleur: BiquadFilterNode;
  petitHautParleurPresence: BiquadFilterNode;
  petitHPSec: GainNode;
  petitHPHumide: GainNode;
  finalLimiter: DynamicsCompressorNode;
  finalGain: GainNode;
  // Envoi réverbe additionnel pour le Mode Live (gain à 0 par défaut, donc
  // sans effet ailleurs) : monter le mix entier dans la réverbe partagée
  // sans reconstruire son impulsion (coûteux), contrairement à reverbSize.
  liveReverbSend: GainNode;
  // Analyseur de spectre MAÎTRE, branché en tap sur `finalGain` — donc sur ce
  // qu'on entend réellement, après le limiteur, l'écrêteur doux et le volume
  // général. C'est ce qui le distingue de `lineAnalyser` : celui-ci mesure un
  // niveau par ligne (fftSize 32, un chiffre par frame), celui-là rend un vrai
  // spectre du mix. Tap : jamais connecté en aval, aucun effet sur le son.
  spectrum: AnalyserNode;
  // Un AnalyserNode par ligne (batterie + synthé), pour le visualiseur du
  // Mode Live — tap seulement, jamais connecté en aval, donc sans effet sur
  // le son. Créés systématiquement (live/offline/jeu) comme le reste du
  // graphe : rien ne les lit en dehors du Mode Live.
  lineAnalyser: Record<DrumRowName | SynthRowName, AnalyserNode>;
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
  // Filtre passe-bas "macro live" : cutoff au maximum (quasi Nyquist) par
  // défaut, donc transparent partout ailleurs — seul le pad XY du Mode Live
  // (phase 2, PLAN.md §7) le referme pour un balayage de filtre en direct.
  const liveFilter = ctx.createBiquadFilter();
  liveFilter.type = 'lowpass';
  liveFilter.frequency.setValueAtTime(20000, now);
  liveFilter.Q.setValueAtTime(0.7, now);
  /* Le PETIT HAUT-PARLEUR — deux nœuds neutres par défaut, comme `liveFilter`.
   *
   * C'est l'acte 4 de `HISTOIRE.md` : *« Ton morceau est bon dans ton
   * ordinateur. Ici, il est mauvais. »* Sol branche le haut-parleur de la
   * laverie et la basse disparaît, la grosse caisse aussi ; il reste les aigus
   * et un sifflement. On ne peut pas enseigner ça sans le FAIRE ENTENDRE — un
   * texte qui décrit un défaut de mixage n'apprend rien.
   *
   * Un passe-haut (les graves, qu'un boîtier de huit centimètres ne peut pas
   * produire) et une bosse de présence (le sifflement).
   *
   * ⚠️ MONTÉS EN PARALLÈLE, et c'est une correction payée par la mesure. La
   * première version les mettait EN SÉRIE, réglés « neutres » au repos
   * (coupure à 10 Hz, bosse à 0 dB), en se disant qu'un passe-haut sous
   * l'audible ne s'entend pas. C'est vrai de son AMPLITUDE et faux de sa
   * PHASE : un biquad déplace le signal même là où il ne l'atténue pas.
   * Mesuré sur un kick, à 10 Hz, contre le même kick sans filtre — 41 176
   * échantillons différents sur 44 100, écart maximal de 6,4e-2 pour un RMS de
   * 5,1e-2. Autrement dit : l'étage aurait modifié TOUS les exports du projet,
   * inaudiblement et pour toujours, pour un exercice de Mode jeu.
   *
   * En parallèle, le trajet au repos est celui d'avant, échantillon pour
   * échantillon : `petitHPSec` à 1, `petitHPHumide` à 0. La bascule est un
   * fondu entre les deux — ce qui a un second mérite, celui de ne pas claquer
   * quand on change de haut-parleur pendant que la boucle tourne, ce qui est
   * précisément le geste de l'exercice.
   *
   * ⚠️ Placés AVANT `finalGain`, donc avant le tap de l'analyseur : celui-ci
   * doit montrer ce qu'on entend (règle du fichier), et ce qu'on entend sur le
   * petit haut-parleur n'a plus de grave. Le voir disparaître de l'analyseur
   * fait la moitié de la démonstration. */
  const petitHautParleur = ctx.createBiquadFilter();
  petitHautParleur.type = 'highpass';
  petitHautParleur.frequency.setValueAtTime(PETIT_HP_COUPURE_HZ, now);
  petitHautParleur.Q.setValueAtTime(0.7, now);
  const petitHautParleurPresence = ctx.createBiquadFilter();
  petitHautParleurPresence.type = 'peaking';
  petitHautParleurPresence.frequency.setValueAtTime(PETIT_HP_PRESENCE_HZ, now);
  petitHautParleurPresence.Q.setValueAtTime(1.2, now);
  petitHautParleurPresence.gain.setValueAtTime(PETIT_HP_PRESENCE_DB, now);
  const petitHPSec = ctx.createGain();
  petitHPSec.gain.setValueAtTime(1, now);
  const petitHPHumide = ctx.createGain();
  petitHPHumide.gain.setValueAtTime(0, now);
  mixBus.connect(liveFilter);
  liveFilter.connect(finalLimiter);
  finalLimiter.connect(softClip);
  softClip.connect(petitHPSec);
  petitHPSec.connect(finalGain);
  softClip.connect(petitHautParleur);
  petitHautParleur.connect(petitHautParleurPresence);
  petitHautParleurPresence.connect(petitHPHumide);
  petitHPHumide.connect(finalGain);
  finalGain.connect(ctx.destination);
  // fftSize 512 → 256 bandes, ce qui laisse de quoi regrouper en 20-30 barres
  // sans que le grave soit tassé sur une seule. Le lissage de 0,72 est ce qui
  // donne la descente caractéristique d'un analyseur d'ampli : sans lui les
  // barres clignotent à 60 Hz et ne se lisent plus.
  const spectrum = ctx.createAnalyser();
  spectrum.fftSize = 512;
  spectrum.smoothingTimeConstant = 0.72;
  // Fenêtre resserrée : de -84 à -12 dB, un motif de batterie ordinaire ne
  // remplissait que le tiers bas de l'afficheur. C'est la plage utile d'un
  // mix, pas la plage théorique du format.
  spectrum.minDecibels = -72;
  spectrum.maxDecibels = -18;
  finalGain.connect(spectrum);
  // Envoi réverbe additionnel pour le Mode Live, gain nul par défaut — câblé
  // vers `reverb` plus bas, une fois le convolver créé.
  const liveReverbSend = ctx.createGain();
  liveReverbSend.gain.setValueAtTime(0, now);
  mixBus.connect(liveReverbSend);

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
  liveReverbSend.connect(reverb);
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
  // Un AnalyserNode par ligne pour le visualiseur du Mode Live — simple tap
  // (jamais connecté en aval), fftSize minimal car on ne lit qu'un niveau
  // crête par frame, pas un vrai spectre.
  const lineAnalyser = {} as GraphNodes['lineAnalyser'];
  function tapAnalyser(name: DrumRowName | SynthRowName, source: AudioNode): void {
    const a = ctx.createAnalyser();
    a.fftSize = 32;
    source.connect(a);
    lineAnalyser[name] = a;
  }
  (['kick', 'snare', 'hat', 'clap', 'shaker'] as DrumRowName[]).forEach((name) => {
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(masterGain);
    drumLineGain[name] = g;
    tapAnalyser(name, g);
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
    tapAnalyser(name, duck);
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
    liveFilter,
    petitHautParleur,
    petitHautParleurPresence,
    petitHPSec,
    petitHPHumide,
    finalLimiter,
    finalGain,
    liveReverbSend,
    spectrum,
    lineAnalyser,
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
  (['kick', 'snare', 'hat', 'clap', 'shaker'] as DrumRowName[]).forEach((name) => {
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
