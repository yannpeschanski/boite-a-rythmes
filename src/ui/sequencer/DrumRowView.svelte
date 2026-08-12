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

  let showSettings = $state(false);

  const row = $derived(pattern.state.rows[name]);
  // kick = binaire ; snare/hat = 3 états (normal/rim, fermé/ouvert)
  const maxState = $derived(name === 'kick' ? 1 : 2);

  function cycleCell(col: number) {
    history.push();
    const cur = row.pattern[col];
    const next = ((cur + 1) % (maxState + 1)) as DrumStep;
    row.pattern[col] = next;
    if (next === 0) row.rolls[col] = 1;
    if (next > 0) onPreview?.(name, next);
  }

  // Anti double-rafale : sur mobile, un appui long déclenche à la fois notre
  // minuteur JS ET le contextmenu natif du navigateur pour le même geste —
  // sans garde, la rafale avancerait deux fois d'un coup (même souci que
  // StepCircle.svelte, ROLL_DEBOUNCE_MS).
  const ROLL_DEBOUNCE_MS = 350;
  let lastRollAt = 0;
  function bumpRoll(col: number) {
    const now = Date.now();
    if (now - lastRollAt < ROLL_DEBOUNCE_MS) return;
    lastRollAt = now;
    if (row.pattern[col] > 0) row.rolls[col] = (row.rolls[col] % 4) + 1;
  }

  function cycleRoll(col: number, e: Event) {
    e.preventDefault();
    bumpRoll(col);
  }

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  function pressStart(col: number, e: PointerEvent) {
    // Clic droit : uniquement géré par oncontextmenu (cycleRoll). Sans ce
    // garde-fou, le pointerup qui suit le clic droit relance aussi
    // cycleCell via pressEnd — la rafale ET l'état de la case avancaient
    // en même temps sur un simple clic droit.
    if (e.button === 2) return;
    longPressTimer = setTimeout(() => {
      bumpRoll(col);
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
        onpointerdown={(e) => pressStart(col, e)}
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
  <button class="more" onclick={() => (showSettings = !showSettings)}>
    {showSettings ? '▾' : '▸'} ⚙️ Réglages
  </button>
  {#if showSettings}
    <!-- Un paramètre par ligne plutôt que compressé en 2 colonnes : ce
         panneau n'est visible qu'une fois déployé, pas de pression d'espace
         comme sur les curseurs toujours affichés (retour de Yann). Regroupé
         par encarts cohérents plutôt qu'une liste plate. -->
    <fieldset>
      <legend>Séquence</legend>
      <XpSlider label="Pas" min={1} max={32} bind:value={row.subdiv} />
      <XpSlider label="Décalage" min={-50} max={50} unit="%" bind:value={row.shiftPct} />
      <XpSlider label="Volume" min={0} max={100} unit="%"
        value={Math.round(row.volume * 100)}
        onchange={(v) => (row.volume = v / 100)} />
    </fieldset>
    <fieldset>
      <legend>Timbre</legend>
      <XpSlider label="Pitch" min={-24} max={24} unit=" ½t" bind:value={row.pitch} />
      <XpSlider label="Attaque" min={0} max={100} bind:value={row.attack} />
      <XpSlider label="Decay" min={-50} max={50} bind:value={row.decay} />
      <XpSlider label="Tone" min={-100} max={100} bind:value={row.tone} />
    </fieldset>
    <fieldset>
      <legend>Filtre & espace</legend>
      <XpSlider label="Filtre passe-bas" min={200} max={20000} step={100} unit=" Hz"
        bind:value={row.filterCutoff} />
      <XpSlider label="Réverbe" min={0} max={100} unit="%"
        value={Math.round(row.reverbSend * 100)}
        onchange={(v) => { row.reverbSend = v / 100; onFxChanged?.(); }} />
      <XpSlider label="Delay" min={0} max={100} unit="%"
        value={Math.round(row.delaySend * 100)}
        onchange={(v) => { row.delaySend = v / 100; onFxChanged?.(); }} />
    </fieldset>
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
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
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
  /* Cases VIDES teintées par ligne (au lieu d'un gris neutre partagé) — port
     de #rowKick/#rowSnare/#rowHat .cell:not(.active) de l'original
     (l. 759-761) : même quand rien n'est posé, on voit quelle ligne est
     quelle rien qu'à la couleur. */
  .cell.kick.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-kick) 10%, #fff),
      color-mix(in srgb, var(--cell-kick) 28%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-kick) 45%, var(--xp-line));
  }
  .cell.snare.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-snare) 10%, #fff),
      color-mix(in srgb, var(--cell-snare) 28%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-snare) 45%, var(--xp-line));
  }
  .cell.hat.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-hat) 10%, #fff),
      color-mix(in srgb, var(--cell-hat) 28%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-hat) 45%, var(--xp-line));
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
  .more {
    background: none;
    border: none;
    color: var(--xp-muted);
    font-size: 11px;
    cursor: pointer;
    padding: 2px 0;
    font-family: inherit;
  }
  fieldset {
    border: 1px solid var(--xp-line);
    margin: 5px 0;
    padding: 4px 6px;
  }
  legend {
    font-size: 11px;
    font-weight: 700;
    color: var(--xp-accent-amber);
  }
</style>
