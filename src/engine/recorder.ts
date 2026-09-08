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
import { versInt16, wavDepuisInt16 } from './render-offline';

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

/* ⚠️ POURQUOI ON ACCUMULE EN INT16, ET PAS EN FLOTTANTS.
 *
 * La première version empilait des `Float32Array` de 128 échantillons dans un
 * tableau JS, puis les FUSIONNAIT en un seul, puis en faisait un `AudioBuffer`,
 * puis un WAV — quatre copies, dont les deux premières coexistent. Mesuré à
 * 48 kHz mono : 1 min = 26 Mo de pic, 5 min = 128 Mo, **10 min = 256 Mo**, sur
 * le fil principal d'un téléphone.
 *
 * Ça n'avait pas d'importance tant que ⏺ était une commodité. Depuis que
 * l'export hors ligne d'un morceau est écarté, il est **la seule sortie audio
 * de l'appli** — et une sortie qui étouffe la page au bout de cinq minutes n'en
 * est pas une.
 *
 * Ici chaque bloc est converti tout de suite dans le format du fichier (PCM
 * 16 bits), écrit dans un tampon qui grandit par PALIERS, et le WAV se pose
 * dessus sans autre copie. 10 min = 57,6 Mo au lieu de 256, et il n'y a plus
 * d'instant où deux représentations complètes coexistent.
 *
 * ⚠️ Le palier est FIXE, pas un doublement. Doubler ferait un pic transitoire
 * de 2× la taille courante au pire moment — précisément ce qu'on vient de
 * supprimer. Trente secondes coûtent 2,9 Mo à recopier, une fois toutes les
 * trente secondes.
 */
const SECONDES_PAR_PALIER = 30;

/* Plafond dur. `06-audit` §7.3 le chiffrait déjà : au-delà, on ne rend service
   à personne. On s'arrête proprement et on le DIT (voir `plafondAtteint`)
   plutôt que de laisser la page mourir sans un mot. */
export const MINUTES_MAX_CAPTURE = 10;

export class LiveRecorder {
  private ctx: AudioContext | null = null;
  private tap: AudioNode | null = null;
  private node: AudioWorkletNode | null = null;
  private mute: GainNode | null = null;
  /* Le fichier en train de s'écrire, déjà au format du WAV. */
  private donnees = new Int16Array(0);
  private longueur = 0;
  private sampleRate = 44100;
  /** Vrai dès que la capture a atteint le plafond et cessé d'accumuler. */
  plafondAtteint = false;

  /** Ce qui est capturé jusqu'ici, en secondes — pour l'afficher pendant qu'on joue. */
  get secondes(): number {
    return this.longueur / this.sampleRate;
  }

  private pousser(bloc: Float32Array): void {
    if (this.plafondAtteint) return;
    const max = MINUTES_MAX_CAPTURE * 60 * this.sampleRate;
    if (this.longueur + bloc.length > max) {
      this.plafondAtteint = true;
      return;
    }
    if (this.longueur + bloc.length > this.donnees.length) {
      const palier = SECONDES_PAR_PALIER * this.sampleRate;
      const taille = Math.ceil((this.longueur + bloc.length) / palier) * palier;
      const suivant = new Int16Array(taille);
      suivant.set(this.donnees.subarray(0, this.longueur));
      this.donnees = suivant;
    }
    for (let i = 0; i < bloc.length; i++) this.donnees[this.longueur + i] = versInt16(bloc[i]);
    this.longueur += bloc.length;
  }

  // `tap` : le nœud de sortie finale du graphe live déjà en train de jouer
  // (finalGain dans graph.ts) — dérivation en lecture seule, rien d'autre
  // dans le graphe n'est touché.
  async start(ctx: AudioContext, tap: AudioNode): Promise<void> {
    await ensureCaptureModule(ctx);
    this.ctx = ctx;
    this.tap = tap;
    this.sampleRate = ctx.sampleRate;
    this.donnees = new Int16Array(SECONDES_PAR_PALIER * ctx.sampleRate);
    this.longueur = 0;
    this.plafondAtteint = false;
    this.node = new AudioWorkletNode(ctx, 'boite-a-rythmes-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    this.node.port.onmessage = (ev: MessageEvent<Float32Array>) => this.pousser(ev.data);
    // Un AudioWorkletNode doit être connecté jusqu'à la destination pour que
    // process() se déclenche sur certains navigateurs — muté à gain 0 pour
    // ne jamais s'entendre en double.
    this.mute = ctx.createGain();
    this.mute.gain.value = 0;
    tap.connect(this.node);
    this.node.connect(this.mute);
    this.mute.connect(ctx.destination);
  }

  /* Détache le tap et renvoie le WAV. ⚠️ Un Blob, plus un AudioBuffer : le
     fichier est déjà écrit au fil de l'eau, en refaire un AudioBuffer pour le
     reconvertir aussitôt était exactement la copie qu'on supprime. */
  stop(): Blob {
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
    const sampleRate = this.sampleRate;
    this.node = null;
    this.mute = null;
    this.tap = null;
    this.ctx = null;

    // `subarray` et non `slice` : une VUE sur ce qui est déjà écrit, donc
    // aucune copie de plus avant le Blob.
    const pcm = this.donnees.subarray(0, this.longueur);
    const blob = wavDepuisInt16(pcm, sampleRate);
    this.donnees = new Int16Array(0);
    this.longueur = 0;
    return blob;
  }
}
