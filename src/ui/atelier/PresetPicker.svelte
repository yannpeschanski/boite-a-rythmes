<script lang="ts">
  // Sélecteur des 34 presets, rangés par catégorie (mêmes optgroups que
  // l'original), avec les textes pédagogiques `history`/`demo` affichés
  // sous le sélecteur.
  import { PRESETS, PRESET_CATEGORIES, type SongPresetData } from '../../model/presets/songs';
  import { presetToState } from '../../model/presetAdapter';
  import { pattern } from '../../stores/pattern.svelte';

  let { onApplied }: { onApplied?: () => void } = $props();

  let selectedId = $state('');
  const selected = $derived(PRESETS.find((p) => p.id === selectedId) ?? null);
  let keepSynthAndTempo = $state(false);

  function byCat(cat: string): SongPresetData[] {
    return PRESETS.filter((p) => p.cat === cat);
  }

  function apply() {
    if (!selected) return;
    pattern.replace(presetToState(selected, keepSynthAndTempo ? pattern.snapshot() : undefined, keepSynthAndTempo));
    onApplied?.();
  }
</script>

<div class="picker">
  <select bind:value={selectedId}>
    <option value="" disabled>— Choisir un morceau…</option>
    {#each PRESET_CATEGORIES as cat (cat)}
      <optgroup label={cat}>
        {#each byCat(cat) as p (p.id)}
          <option value={p.id}>{p.label}</option>
        {/each}
      </optgroup>
    {/each}
  </select>
  <button class="xp-btn" disabled={!selected} onclick={apply}>Charger</button>
</div>
<label class="keep">
  <input type="checkbox" bind:checked={keepSynthAndTempo} />
  Garder le synthé et le tempo actuels
</label>
{#if selected}
  <div class="texts">
    <p class="history">{selected.history}</p>
    <p class="demo">💡 {selected.demo}</p>
  </div>
{/if}

<style>
  .picker {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
  }
  select {
    flex: 1;
    font-family: var(--xp-font);
    font-size: 13px;
    padding: 3px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
  .xp-btn {
    padding: 4px 14px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  .keep {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: var(--xp-text);
    margin-bottom: 6px;
  }
  .texts {
    font-size: 12px;
    color: var(--xp-text);
    background: #fffef5;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    padding: 6px 8px;
    margin-bottom: 6px;
  }
  .history {
    margin: 0 0 4px;
  }
  .demo {
    margin: 0;
    color: var(--xp-muted);
  }
</style>
