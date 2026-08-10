// Rendu offline + écriture WAV. Le graphe et les voix sont EXACTEMENT ceux du
// live (buildGraph/DrumKit/SynthKit sur un OfflineAudioContext) — plus de
// duplication du graphe ni de sauvegarde/restauration de globales comme dans
// l'original : c'est le gain principal de la réécriture.
//
// PRNG à graine fixe : deux exports du même rythme produisent exactement le
// même fichier (ghost notes et rafales spontanées identiques).
import type { PatternStateV2 } from '../model/types';
import { buildGraph } from './graph';
import { DrumKit } from './voices/drums';
import { SynthKit } from './voices/synth';
import { scheduleDrumWindow, scheduleSynthWindow, type Cursors, type SynthCursors } from './scheduler';
import { barDuration, isFillBar } from './groove';
import { makeSeededRng } from './rng';

export const EXPORT_SEED = 1337;

// ~20 s ciblées : l'encodage MP3 en JS pur reste raisonnable à cette durée.
export function barsForExport(state: PatternStateV2, targetSeconds = 20): number {
  return Math.max(2, Math.round(targetSeconds / barDuration(state.tempo)));
}

export async function renderPattern(
  state: PatternStateV2,
  bars = barsForExport(state),
  seed = EXPORT_SEED,
  sampleRate = 44100,
): Promise<AudioBuffer> {
  const barDur = barDuration(state.tempo);
  // Marge de queue : laisse s'éteindre réverbe, delay et releases longs.
  const duration = bars * barDur + 2.5;
  const OfflineCtor =
    (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext })
      .OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new OfflineCtor(1, Math.ceil(duration * sampleRate), sampleRate);

  const graph = buildGraph(ctx, state);
  const kit = new DrumKit(graph);
  const synth = new SynthKit(graph, true); // offline : jamais de budget de voix
  const rng = makeSeededRng(seed);

  const cursors: Cursors = {
    kick: { stepIndex: 0, nextStepTime: 0 },
    snare: { stepIndex: 0, nextStepTime: 0 },
    hat: { stepIndex: 0, nextStepTime: 0 },
  };
  const synthCursors: SynthCursors = {
    bass: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
    pad: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
    melody: { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null },
  };

  // Mesure par mesure : `currentBar` pilote les fills (isFillBar), donc la
  // fenêtre de scheduling doit avancer d'une mesure à la fois. Ordre
  // d'itération figé (drum puis synthé) — c'est lui qui garantit que le PRNG
  // est consommé dans le même ordre à chaque export.
  const noop = () => {};
  for (let bar = 0; bar < bars; bar++) {
    const horizon = (bar + 1) * barDur;
    void isFillBar(state, bar);
    scheduleDrumWindow(
      {
        state,
        kit,
        cursors,
        rng,
        currentBar: bar,
        breakWindow: null,
        ghostTargetRow: state.ghostRow ?? 'snare',
        emitPlayhead: noop,
      },
      horizon,
    );
    scheduleSynthWindow(
      { state, synth, cursors: synthCursors, rng, breakWindow: null, emitPlayhead: noop },
      horizon,
    );
  }

  return ctx.startRendering();
}

// Écrivain WAV RIFF/PCM 16 bits mono — partagé par l'export offline et
// l'enregistrement en direct.
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const data = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const bytes = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(bytes);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + data.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, data.length * 2, true);
  let offset = 44;
  for (let i = 0; i < data.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

// Encodage MP3 par blocs de 1152 échantillons, avec yield périodique pour ne
// pas geler l'interface, et progression rapportée à l'appelant.
export async function encodeMp3(
  buffer: AudioBuffer,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const encoder = new Mp3Encoder(1, buffer.sampleRate, 128);
  const src = buffer.getChannelData(0);
  const samples = new Int16Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const s = Math.max(-1, Math.min(1, src[i]));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const blocks: Uint8Array[] = [];
  const CHUNK = 1152;
  let lastYield = performance.now();
  for (let i = 0; i < samples.length; i += CHUNK) {
    const buf = encoder.encodeBuffer(samples.subarray(i, i + CHUNK));
    if (buf.length) blocks.push(new Uint8Array(buf));
    if (performance.now() - lastYield > 40) {
      onProgress?.(i / samples.length);
      await new Promise((r) => setTimeout(r, 0));
      lastYield = performance.now();
    }
  }
  const end = encoder.flush();
  if (end.length) blocks.push(new Uint8Array(end));
  onProgress?.(1);
  return new Blob(blocks as BlobPart[], { type: 'audio/mpeg' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
