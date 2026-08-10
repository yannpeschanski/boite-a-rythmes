<script lang="ts">
  // Export audio. Contrairement à l'original (ScriptProcessorNode déprécié
  // pour le WAV en direct), les deux formats passent par le MÊME rendu
  // offline déterministe : plus rapide que le temps réel, sans dépendance à
  // une API dépréciée, et bit-à-bit reproductible à graine égale.
  import { pattern } from '../../stores/pattern.svelte';
  import {
    renderPattern,
    encodeMp3,
    audioBufferToWavBlob,
    downloadBlob,
    barsForExport,
  } from '../../engine/render-offline';
  import XpWindow from '../xp/XpWindow.svelte';
  import XpSlider from '../xp/XpSlider.svelte';

  let { engine, playing }: { engine: { stop: () => void }; playing: boolean } = $props();

  let seconds = $state(20);
  let busy = $state(false);
  let status = $state('');
  let progress = $state(0);

  async function doExport(format: 'mp3' | 'wav') {
    if (busy) return;
    if (playing) engine.stop();
    busy = true;
    progress = 0;
    status = 'Rendu du morceau…';
    try {
      const state = pattern.snapshot();
      const buffer = await renderPattern(state, barsForExport(state, seconds));
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      if (format === 'wav') {
        status = 'Écriture du WAV…';
        downloadBlob(audioBufferToWavBlob(buffer), `rythme-${stamp}.wav`);
      } else {
        status = 'Encodage MP3…';
        const blob = await encodeMp3(buffer, (r) => (progress = r));
        downloadBlob(blob, `rythme-${stamp}.mp3`);
      }
      status = 'Terminé ✓';
    } catch (err) {
      status = 'Échec de l’export : ' + (err instanceof Error ? err.message : String(err));
    } finally {
      busy = false;
      progress = 0;
    }
  }
</script>

<XpWindow title="Export audio" icon="💿" accent="teal">
  <XpSlider label="Durée" min={5} max={60} step={5} unit=" s" bind:value={seconds} />
  <div class="btns">
    <button class="xp-btn" disabled={busy} onclick={() => doExport('mp3')}>🎵 Exporter en MP3</button>
    <button class="xp-btn" disabled={busy} onclick={() => doExport('wav')}>🎧 Exporter en WAV</button>
  </div>
  {#if status}
    <p class="status">
      {status}
      {#if busy && progress > 0}<progress value={progress} max="1"></progress>{/if}
    </p>
  {/if}
  <p class="note">
    Rendu déterministe : le même rythme exporté deux fois donne exactement le même fichier.
  </p>
</XpWindow>

<style>
  .btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 6px;
  }
  .xp-btn {
    padding: 5px 14px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-size: 13px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn:disabled {
    color: var(--xp-muted);
    cursor: progress;
  }
  .status {
    font-size: 12px;
    margin: 8px 0 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .note {
    font-size: 11px;
    color: var(--xp-muted);
    margin: 6px 0 0;
  }
</style>
