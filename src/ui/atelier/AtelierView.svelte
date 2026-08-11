<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { DrumRowName, DrumStep, SynthRowName } from '../../model/types';
  import XpWindow from '../xp/XpWindow.svelte';
  import XpSlider from '../xp/XpSlider.svelte';
  import DrumRowView from '../sequencer/DrumRowView.svelte';
  import StepCircle from '../sequencer/StepCircle.svelte';
  import SynthModule from './SynthModule.svelte';
  import PresetPicker from './PresetPicker.svelte';
  import ExportBar from './ExportBar.svelte';
  import ToolBar from './ToolBar.svelte';
  import { history } from '../../stores/history.svelte';
  import { scheduleAutosave, hasAutosave, restoreAutosave } from '../../stores/share';
  import { findClosestPreset } from '../../engine/similarity';

  const engine = new AudioEngine(() => pattern.snapshot());

  let playing = $state(false);
  let recording = $state(false);
  let breakArmed = $state(false);
  let circleView = $state(false);
  let playhead = $state<Record<DrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
  let synthPlayhead = $state<Record<SynthRowName, number>>({ bass: -1, pad: -1, melody: -1 });
  let fileInput: HTMLInputElement;

  // Curseur visuel : consommé à chaque frame contre l'horloge audio.
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as DrumRowName] = ev.col;
      else synthPlayhead[ev.name as SynthRowName] = ev.col;
    }
    breakArmed = engine.breakPending;
    raf = requestAnimationFrame(loop);
  }
  // Indicateur « le plus proche de ce que tu joues » — throttlé (le calcul
  // teste les 34 presets × 6 permutations de lignes).
  // Débouncé, pas throttlé : un throttle à early-return abandonnerait la
  // dernière modification d'une rafale (ex. le chargement d'un preset juste
  // après un clic) et laisserait un résultat périmé à l'écran.
  let closest = $state<{ label: string; score: number } | null>(null);
  $effect(() => {
    void pattern.state.rows.kick.pattern;
    void pattern.state.rows.snare.pattern;
    void pattern.state.rows.hat.pattern;
    void pattern.state.rows.kick.subdiv;
    void pattern.state.rows.snare.subdiv;
    void pattern.state.rows.hat.subdiv;
    const snapshot = pattern.snapshot();
    const t = setTimeout(() => {
      const m = findClosestPreset(snapshot);
      closest = m ? { label: m.preset.label, score: m.score } : null;
    }, 300);
    return () => clearTimeout(t);
  });

  // Sauvegarde automatique du pattern — l'original ne persistait que la
  // progression du jeu : un rechargement perdait toute la composition.
  $effect(() => {
    void JSON.stringify(pattern.state);
    scheduleAutosave();
  });

  let canRestore = $state(false);

  onMount(() => {
    raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', onKey);
    canRestore = hasAutosave();
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    engine.stop();
  });

  // Raccourcis clavier (absents de l'original) : Espace = lecture/stop,
  // B = break, 1/2/3 = mute des lignes drum.
  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? history.redo() : history.undo();
      refreshFx();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      history.redo();
      refreshFx();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if (e.code === 'Space') {
      e.preventDefault();
      void togglePlay();
    } else if (e.key.toLowerCase() === 'b') {
      engine.requestBreak();
    } else if (e.key >= '1' && e.key <= '3') {
      const name = (['kick', 'snare', 'hat'] as DrumRowName[])[Number(e.key) - 1];
      pattern.state.rows[name].muted = !pattern.state.rows[name].muted;
    }
  }

  async function togglePlay() {
    if (playing) {
      engine.stop();
      playing = false;
      playhead = { kick: -1, snare: -1, hat: -1 };
      synthPlayhead = { bass: -1, pad: -1, melody: -1 };
    } else {
      await engine.start();
      playing = true;
    }
  }

  // Les réglages de bus (fx, delay, sends, volumes de ligne, limiteurs)
  // s'appliquent en direct, sans reconstruire le graphe.
  function refreshFx() {
    engine.refreshMixSettings();
  }

  // Enregistrement du direct (WAV) : contrairement à l'export (rendu offline
  // déterministe), ceci capture vraiment ce qui joue — curseurs bougés
  // pendant la lecture inclus. `playing`/`recording` pilotent l'affichage du
  // transport pendant toute la durée, gérée par AudioEngine.startLiveRecording.
  async function recordLive(bars: number) {
    recording = true;
    playing = true;
    try {
      return await engine.startLiveRecording(bars);
    } finally {
      playing = false;
      recording = false;
      playhead = { kick: -1, snare: -1, hat: -1 };
      synthPlayhead = { bass: -1, pad: -1, melody: -1 };
    }
  }

  function exportJson() {
    const blob = new Blob([pattern.toJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rythme-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      pattern.loadJson(await file.text());
      refreshFx();
    } catch {
      alert('Fichier illisible — ce n’est pas une sauvegarde de rythme valide.');
    }
    fileInput.value = '';
  }

  // Édition depuis le cercle — mêmes règles que la grille linéaire.
  function tapCell(name: DrumRowName, col: number) {
    const row = pattern.state.rows[name];
    const maxState = name === 'kick' ? 1 : 2;
    const next = (((row.pattern[col] ?? 0) + 1) % (maxState + 1)) as DrumStep;
    row.pattern[col] = next;
    if (next === 0) row.rolls[col] = 1;
    else if (!playing) engine.preview(name, next);
  }
  function rollCell(name: DrumRowName, col: number) {
    const row = pattern.state.rows[name];
    if ((row.pattern[col] ?? 0) > 0) row.rolls[col] = (row.rolls[col] % 4) + 1;
  }

  const st = $derived(pattern.state);
</script>

<div class="atelier" data-theme="luna">
  <ToolBar
    bind:circleView
    onExport={exportJson}
    onImport={() => fileInput.click()}
    onReset={() => {
      history.push();
      pattern.reset();
      refreshFx();
    }}
  />
  {#if canRestore}
    <p class="restore">
      Une session précédente a été retrouvée.
      <button onclick={() => { history.push(); restoreAutosave(); refreshFx(); canRestore = false; }}>Restaurer</button>
      <button onclick={() => (canRestore = false)}>Ignorer</button>
    </p>
  {/if}
  <XpWindow title="Boîte à rythmes — Atelier" icon="🥁" accent="amber">
    <div class="transport">
      <button class="xp-btn primary" disabled={recording} onclick={togglePlay}>
        {playing ? '■ Stop' : '▶ Lecture'}
      </button>
      <button
        class="xp-btn"
        class:armed={breakArmed}
        disabled={recording}
        title="À la prochaine mesure : dépouillé puis explosion"
        onclick={() => engine.requestBreak()}>🫨 Break</button
      >
      <button class="xp-btn" onclick={() => (circleView = !circleView)}>
        {circleView ? '▤ Vue linéaire' : '◎ Vue circulaire'}
      </button>
      <button class="xp-btn" onclick={exportJson}>💾 Sauver</button>
      <button class="xp-btn" onclick={() => fileInput.click()}>📂 Charger</button>
      <input type="file" accept="application/json" hidden bind:this={fileInput} onchange={importJson} />
    </div>
    <p class="hint">
      Espace : lecture/stop · B : break · 1/2/3 : couper une ligne · Ctrl+Z : annuler
      {#if closest}
        <span class="closest">— le plus proche : <strong>{closest.label}</strong> ({Math.round(closest.score * 100)} %)</span>
      {/if}
    </p>

    <XpSlider label="Tempo" min={40} max={200} step={10} unit=" BPM" bind:value={st.tempo} />
    <PresetPicker onApplied={refreshFx} />

    {#if circleView}
      <div class="circle-holder">
        <StepCircle rows={st.rows} {playhead} onCellTap={tapCell} onCellRoll={rollCell} />
      </div>
    {:else}
      <DrumRowView name="kick" label="Kick" playheadCol={playhead.kick}
        onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
      <DrumRowView name="snare" label="Snare" playheadCol={playhead.snare}
        onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
      <DrumRowView name="hat" label="Hat" playheadCol={playhead.hat}
        onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
    {/if}
  </XpWindow>

  <SynthModule playhead={synthPlayhead} onFxChanged={refreshFx}
    onTest={(n) => !playing && engine.previewSynth(n)} />

  <XpWindow title="Groove & variation humaine" icon="🎛️" accent="teal">
    <div class="two-col">
      <XpSlider label="Swing" min={0} max={75} unit="%" bind:value={st.swing} />
      <XpSlider label="Traîne" min={0} max={30} unit="%" bind:value={st.drag} />
      <XpSlider label="Rafales spontanées" min={0} max={100} unit="%" bind:value={st.spontRoll} />
      <XpSlider label="Ghost notes" min={0} max={40} unit="%" bind:value={st.ghostDensity} />
      <XpSlider label="Vélocité aléatoire" min={0} max={100} unit="%" bind:value={st.randomVelocity} />
      <XpSlider label="Intensité du fill" min={0} max={100} unit="%" bind:value={st.fillIntensity} />
    </div>
    <div class="inline-row">
      <label>
        Fill toutes les
        <select bind:value={st.fillEvery}>
          <option value={0}>— jamais</option>
          <option value={2}>2 mesures</option>
          <option value={4}>4 mesures</option>
          <option value={8}>8 mesures</option>
        </select>
      </label>
      <label>
        Ghost notes sur
        <select bind:value={st.ghostRow}>
          <option value="kick">Kick</option>
          <option value="snare">Snare</option>
        </select>
      </label>
    </div>
  </XpWindow>

  <XpWindow title="Effets de bus & mix" icon="🔊" accent="teal">
    <div class="two-col">
      <XpSlider label="Saturation" min={0} max={100} unit="%" bind:value={st.globalSaturation} onchange={refreshFx} />
      <XpSlider label="Compression" min={0} max={100} unit="%" bind:value={st.globalCompression} onchange={refreshFx} />
      <XpSlider label="Bitcrush" min={0} max={100} unit="%" bind:value={st.globalBitcrush} onchange={refreshFx} />
      <XpSlider label="Volume général" min={50} max={150} unit="%" bind:value={st.finalVolume} onchange={refreshFx} />
    </div>
    <label class="chk">
      <input type="checkbox" bind:checked={st.synthGlobal.limitersEnabled} onchange={refreshFx} />
      Limiteurs de sécurité
    </label>
  </XpWindow>

  <ExportBar {engine} {playing} {recordLive} />
</div>

<style>
  .transport {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 4px;
  }
  .hint {
    font-size: 11px;
    color: var(--xp-muted);
    margin: 0 0 8px;
  }
  .closest strong {
    color: var(--xp-accent-amber);
  }
  .restore {
    font-size: 12px;
    background: #fffbe6;
    border: 1px solid var(--xp-accent-amber);
    padding: 5px 8px;
    margin: 0 0 8px;
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .restore button {
    font-family: inherit;
    font-size: 11px;
    padding: 2px 8px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    cursor: pointer;
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
  .xp-btn.primary {
    font-weight: 700;
  }
  .xp-btn.armed {
    background: linear-gradient(180deg, #ffe9a8, #f4c542);
  }
  .circle-holder {
    max-width: 340px;
    margin: 0 auto;
  }
  .two-col {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0 18px;
  }
  .inline-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 6px;
  }
  label,
  .chk {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  select {
    font-family: var(--xp-font);
    font-size: 12px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
</style>
