// Capture du graphe LIVE pendant une lecture réelle — remplace le
// ScriptProcessorNode de l'original (LiveRecorder, déprécié, tourne sur le
// thread principal) par un AudioWorklet, comme recommandé pour la
// réécriture. Aucune duplication de graphe : on tape en parallèle sur un
// nœud déjà existant (le son continue de sortir normalement), exactement le
// principe d'origine — la seule chose qui change est le mécanisme de tap.
//
// Le processeur est fourni en source inline (Blob URL) plutôt que comme
// fichier séparé chargé via addModule('/chemin.js') : ça reste compatible
// avec le build singlefile, qui ne peut pas servir de fichier statique à
// côté du HTML.
const CAPTURE_PROCESSOR_SOURCE = `
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) this.port.postMessage(channel.slice());
    return true;
  }
}
registerProcessor('boite-a-rythmes-capture', CaptureProcessor);
`;

// Un seul chargement de module par AudioContext (addModule est idempotent
// par URL, mais autant éviter de recréer un Blob à chaque enregistrement).
const loadedContexts = new WeakSet<BaseAudioContext>();

async function ensureCaptureModule(ctx: AudioContext): Promise<void> {
  if (loadedContexts.has(ctx)) return;
  const blob = new Blob([CAPTURE_PROCESSOR_SOURCE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    await ctx.audioWorklet.addModule(url);
    loadedContexts.add(ctx);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export class LiveRecorder {
  private ctx: AudioContext | null = null;
  private tap: AudioNode | null = null;
  private node: AudioWorkletNode | null = null;
  private mute: GainNode | null = null;
  private chunks: Float32Array[] = [];

  // `tap` : le nœud de sortie finale du graphe live déjà en train de jouer
  // (finalGain dans graph.ts) — dérivation en lecture seule, rien d'autre
  // dans le graphe n'est touché.
  async start(ctx: AudioContext, tap: AudioNode): Promise<void> {
    await ensureCaptureModule(ctx);
    this.ctx = ctx;
    this.tap = tap;
    this.chunks = [];
    this.node = new AudioWorkletNode(ctx, 'boite-a-rythmes-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    this.node.port.onmessage = (ev: MessageEvent<Float32Array>) => this.chunks.push(ev.data);
    // Un AudioWorkletNode doit être connecté jusqu'à la destination pour que
    // process() se déclenche sur certains navigateurs — muté à gain 0 pour
    // ne jamais s'entendre en double.
    this.mute = ctx.createGain();
    this.mute.gain.value = 0;
    tap.connect(this.node);
    this.node.connect(this.mute);
    this.mute.connect(ctx.destination);
  }

  // Détache le tap et renvoie l'audio capturé sous forme d'AudioBuffer —
  // même type que le rendu offline, pour réutiliser audioBufferToWavBlob.
  stop(): AudioBuffer {
    if (this.tap && this.node) {
      try {
        this.tap.disconnect(this.node);
      } catch {
        /* déjà déconnecté */
      }
    }
    if (this.node && this.mute) {
      try {
        this.node.disconnect(this.mute);
      } catch {
        /* déjà déconnecté */
      }
    }
    if (this.mute) {
      try {
        this.mute.disconnect();
      } catch {
        /* déjà déconnecté */
      }
    }
    const sampleRate = this.ctx?.sampleRate ?? 44100;
    this.node = null;
    this.mute = null;
    this.tap = null;
    this.ctx = null;

    const total = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(Math.max(1, total));
    let offset = 0;
    for (const c of this.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];

    const buffer = new AudioBuffer({ length: merged.length, numberOfChannels: 1, sampleRate });
    buffer.copyToChannel(merged, 0);
    return buffer;
  }
}
