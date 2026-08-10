<script lang="ts">
  // Une ligne drum : grille linéaire + réglages. Contrairement à l'original
  // (innerHTML + listeners reconstruits à chaque clic), Svelte ne re-rend que
  // la cellule touchée. Clic = cycle d'état ; clic droit / long-press = rafale.
  import { pattern } from '../../stores/pattern.svelte';
  import type { DrumRowName, DrumStep } from '../../model/types';
  import XpSlider from '../xp/XpSlider.svelte';
  import { history } from '../../stores/history.svelte';

  let {
    name,
    label,
    playheadCol = -1,
    onPreview,
    onFxChanged,
  }: {
    name: DrumRowName;
    label: string;
    playheadCol?: number;
    onPreview?: (name: DrumRowName, stepState: number) => void;
    onFxChanged?: () => void;
  } = $props();

  let showTimbre = $state(false);

  const row = $derived(pattern.state.rows[name]);
  // kick = binaire ; snare/hat = 3 états (normal/rim, fermé/ouvert)
  const maxState = $derived(name === 'kick' ? 1 : 2);

  function cycleCell(col: number) {
    history.push();
    const cur = row.pattern[col];
    const next = ((cur + 1) % (maxState + 1)) as DrumStep;
    row.pattern[col] = next;
    if (next > 0) onPreview?.(name, next);
  }

  function cycleRoll(col: number, e: Event) {
    e.preventDefault();
    row.rolls[col] = (row.rolls[col] % 4) + 1;
  }

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  function pressStart(col: number) {
    longPressTimer = setTimeout(() => {
      row.rolls[col] = (row.rolls[col] % 4) + 1;
      longPressTimer = null;
    }, 480);
  }
  function pressEnd(col: number, fire: boolean) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (fire) cycleCell(col);
    }
  }
</script>

<div class="drum-row">
  <div class="row-head">
    <span class="row-label" style:--row-color="var(--cell-{name})">{label}</span>
    <button
      class="mute"
      class:muted={row.muted}
      title={row.muted ? 'Réactiver' : 'Couper'}
      onclick={() => (row.muted = !row.muted)}>{row.muted ? '🔇' : '🔊'}</button
    >
  </div>
  <div class="cells" style:--cols={row.subdiv}>
    {#each { length: row.subdiv } as _, col (col)}
      {@const state = row.pattern[col]}
      {@const roll = row.rolls[col]}
      <button
        class="cell state-{state} {name}"
        class:playing={playheadCol === col}
        onpointerdown={() => pressStart(col)}
        onpointerup={() => pressEnd(col, true)}
        onpointerleave={() => pressEnd(col, false)}
        oncontextmenu={(e) => cycleRoll(col, e)}
        title="Clic : activer/changer — clic droit ou appui long : rafale ×{roll}"
      >
        {#if state === 2}<span class="alt">{name === 'snare' ? 'R' : 'O'}</span>{/if}
        {#if roll > 1}<span class="roll">×{roll}</span>{/if}
      </button>
    {/each}
  </div>
  <div class="row-settings">
    <XpSlider label="Pas" min={1} max={32} bind:value={row.subdiv} />
    <XpSlider label="Décalage" min={-50} max={50} unit="%" bind:value={row.shiftPct} />
    <XpSlider label="Volume" min={0} max={100} unit="%"
      value={Math.round(row.volume * 100)}
      onchange={(v) => (row.volume = v / 100)} />
  </div>
  <button class="more" onclick={() => (showTimbre = !showTimbre)}>
    {showTimbre ? '▾' : '▸'} Timbre, filtre & espace
  </button>
  {#if showTimbre}
    <div class="row-settings">
      <XpSlider label="Pitch" min={-24} max={24} unit=" ½t" bind:value={row.pitch} />
      <XpSlider label="Attaque" min={0} max={100} bind:value={row.attack} />
      <XpSlider label="Decay" min={-50} max={50} bind:value={row.decay} />
      <XpSlider label="Tone" min={-100} max={100} bind:value={row.tone} />
      <XpSlider label="Filtre passe-bas" min={200} max={20000} step={100} unit=" Hz"
        bind:value={row.filterCutoff} />
      <XpSlider label="Réverbe" min={0} max={100} unit="%"
        value={Math.round(row.reverbSend * 100)}
        onchange={(v) => { row.reverbSend = v / 100; onFxChanged?.(); }} />
      <XpSlider label="Delay" min={0} max={100} unit="%"
        value={Math.round(row.delaySend * 100)}
        onchange={(v) => { row.delaySend = v / 100; onFxChanged?.(); }} />
    </div>
  {/if}
</div>

<style>
  .drum-row {
    margin-bottom: 12px;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .row-label {
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--row-color, var(--xp-text));
  }
  .mute {
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-out);
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
  }
  .mute.muted {
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-face-dark);
  }
  .cells {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 3px;
  }
  .cell {
    position: relative;
    height: 34px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #fdfcf8, var(--xp-face-dark));
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    padding: 0;
    touch-action: manipulation;
  }
  .cell:active {
    box-shadow: var(--xp-bevel-in);
  }
  .cell.playing {
    outline: 2px solid #ffd54a;
    outline-offset: -1px;
  }
  .cell.state-1,
  .cell.state-2 {
    box-shadow: var(--xp-bevel-in);
  }
  .cell.kick.state-1 {
    background: var(--cell-kick);
  }
  .cell.snare.state-1 {
    background: var(--cell-snare);
  }
  .cell.snare.state-2 {
    background: color-mix(in srgb, var(--cell-snare) 55%, white);
  }
  .cell.hat.state-1 {
    background: var(--cell-hat);
  }
  .cell.hat.state-2 {
    background: color-mix(in srgb, var(--cell-hat) 55%, white);
  }
  .alt {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 12px;
    color: #333;
  }
  .roll {
    position: absolute;
    right: 2px;
    bottom: 1px;
    font-size: 9px;
    font-family: var(--xp-mono);
    color: #222;
    background: rgba(255, 255, 255, 0.75);
    border-radius: 2px;
    padding: 0 2px;
  }
  .row-settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0 16px;
    margin-top: 4px;
  }
  .more {
    background: none;
    border: none;
    color: var(--xp-muted);
    font-size: 11px;
    cursor: pointer;
    padding: 2px 0;
    font-family: inherit;
  }
</style>
