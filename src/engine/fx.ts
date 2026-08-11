// Courbes et étages d'effets — fonctions pures sur un BaseAudioContext passé
// en paramètre : le même code sert au contexte live et à l'OfflineAudioContext
// de l'export (c'était la duplication la plus fragile de l'original).

// Waveshaper de saturation douce pour le "Tone" du kick et la saturation de
// bus — à drive=0, la courbe est linéaire (identité) : aucun changement
// audible tant qu'on ne touche pas le curseur.
const driveCurveCache: Record<number, Float32Array<ArrayBuffer>> = {};
export function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const key = Math.round(amount * 100);
  if (driveCurveCache[key]) return driveCurveCache[key];
  const n = 256;
  const curve = new Float32Array(n);
  const k = amount * 18; // intensité de saturation
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = k === 0 ? x : Math.tanh(k * x) / Math.tanh(k);
  }
  driveCurveCache[key] = curve;
  return curve;
}

// Bitcrush : réduction du nombre de paliers d'amplitude (quantification), via
// une courbe en escalier. À amount=0, ~256 paliers = quasi transparent ;
// à amount=1, ~8 paliers = grain lo-fi très marqué.
const bitcrushCurveCache: Record<number, Float32Array<ArrayBuffer>> = {};
export function bitcrushCurve(amount: number): Float32Array<ArrayBuffer> {
  const key = Math.round(amount * 100);
  if (bitcrushCurveCache[key]) return bitcrushCurveCache[key];
  const n = 1024;
  const curve = new Float32Array(n);
  const steps = Math.max(4, Math.round(256 - amount * 248));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  bitcrushCurveCache[key] = curve;
  return curve;
}

// Compression/glue de bus : un seul curseur d'intensité qui pilote tous les
// paramètres du DynamicsCompressorNode ensemble (seuil, ratio, knee, attaque,
// release), du quasi-transparent (0%) à très serré/pêchu (100%).
// À 0%, la compression est neutre (seuil à 0dB, ratio 1:1 = rien n'est
// compressé) : avant, même à 0%, un seuil à -6dB et un ratio 2:1
// compressaient déjà tout ce qui dépassait -6dB.
export function applyCompressionAmount(
  compNode: DynamicsCompressorNode,
  amount: number,
  ctx: BaseAudioContext,
): void {
  const t = amount; // 0..1
  const now = ctx.currentTime;
  compNode.threshold.setValueAtTime(0 - t * 36, now);
  compNode.ratio.setValueAtTime(1 + t * 15, now);
  compNode.knee.setValueAtTime(10 - t * 8, now);
  compNode.attack.setValueAtTime(0.02 - t * 0.015, now);
  compNode.release.setValueAtTime(0.15 + t * 0.1, now);
}

// Gain de compensation ("makeup gain") : une compression plus forte réduit le
// niveau global, donc on regonfle le signal en sortie pour que le volume perçu
// reste à peu près constant — jusqu'à +3.5dB à 100% (abaissé depuis +6dB :
// plus prudent, laisse plus de marge avant le limiteur final).
export function makeupGainForCompression(amount: number): number {
  return Math.pow(10, (amount * 3.5) / 20);
}

// Saturateur doux (courbe tanh) placé après les limiteurs : le
// DynamicsCompressor de Web Audio n'a pas de lookahead — il peut laisser
// passer un pic transitoire ponctuel sans avoir eu le temps de réagir, ce qui
// sonne comme un clic. En dessous du seuil ce saturateur est quasi
// transparent ; au-dessus il arrondit au lieu d'écrêter net.
export function softClipCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  const k = amount; // pente — modéré, reste transparent sur signal normal
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

// Réponse en fréquence (dB) d'un filtre passe-bas biquad — mêmes formules que
// le filtre "lowpass" de Web Audio (RBJ Audio EQ Cookbook), réimplémentées en
// JS pur pour ne PAS dépendre d'un AudioContext : sert au visuel de courbe de
// filtre synthé (FilterCurve.svelte), qui doit pouvoir s'afficher avant même
// qu'un son ait été joué.
export function biquadLowpassResponseDb(
  freq: number,
  cutoff: number,
  q: number,
  sampleRate: number,
): number {
  const w0 = (2 * Math.PI * cutoff) / sampleRate;
  const alpha = Math.sin(w0) / (2 * q);
  const cosw0 = Math.cos(w0);
  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;
  const w = (2 * Math.PI * freq) / sampleRate;
  const numRe = nb0 + nb1 * Math.cos(w) + nb2 * Math.cos(2 * w);
  const numIm = -nb1 * Math.sin(w) - nb2 * Math.sin(2 * w);
  const denRe = 1 + na1 * Math.cos(w) + na2 * Math.cos(2 * w);
  const denIm = -na1 * Math.sin(w) - na2 * Math.sin(2 * w);
  const numMag = Math.sqrt(numRe * numRe + numIm * numIm);
  const denMag = Math.sqrt(denRe * denRe + denIm * denIm);
  const mag = numMag / Math.max(denMag, 1e-9);
  return 20 * Math.log10(Math.max(mag, 1e-6));
}

// Impulsion synthétique (bruit + décroissance exponentielle) pour la réverbe
// partagée — pas de fichier audio externe. Recréée à chaque (re)création du
// contexte : une AudioBuffer n'est pas garantie de fonctionner de façon
// fiable d'un contexte à l'autre (live vs offline). `sizeAmount` (0..1)
// contrôle à la fois la durée (0.5s -> 3.5s) et la vitesse de décroissance
// pour un rendu perceptuellement cohérent "petite pièce" -> "grande salle".
export function buildReverbImpulse(ctx: BaseAudioContext, sizeAmount = 0.4): AudioBuffer {
  const duration = 0.5 + sizeAmount * 3.0;
  const decay = 5.5 - sizeAmount * 3.5;
  const len = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < len; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buffer;
}
