<script lang="ts">
  // Aperçu combiné batterie + synthé pour l'onglet Effets (PLAN.md §7,
  // retour de Yann) : remplace le séquenceur Kick/Snare/Hat qui y était
  // dupliqué sans raison — les effets de bus touchent tout le mix, pas
  // seulement la batterie, donc l'aperçu doit montrer les 6 lignes. Même
  // philosophie que TransportRings : un aperçu en bandes colorées, pas un
  // second éditeur (aucun clic, aucune modification possible ici).
  import type { DrumRowName, PatternStateV2, SynthRowName } from '../../model/types';
  import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';

  let {
    state,
    playhead,
    synthPlayhead,
  }: {
    state: PatternStateV2;
    playhead: Record<DrumRowName, number>;
    synthPlayhead: Record<SynthRowName, number>;
  } = $props();

  const LABEL: Record<DrumRowName | SynthRowName, string> = {
    kick: 'Kick',
    snare: 'Snare',
    hat: 'Hat',
    clap: 'Clap',
    shaker: 'Shaker',
    bass: 'Basse',
    pad: 'Nappe',
    melody: 'Mélodie',
  };

  // Même calcul d'« actif » que TransportRings (pattern.svelte), dupliqué ici
  // comme là-bas — un canvas ne peut pas partager de logique de rendu DOM,
  // et ce composant-ci reste volontairement en DOM (boutons/divs) plutôt
  // qu'en canvas, pour rester cohérent avec le reste de l'Atelier (aucun
  // canvas ailleurs dans l'édition — StepCircle mis à part, qui lui édite).
  const rows = $derived([
    ...DRUM_ROW_NAMES.map((name) => {
      const row = state.rows[name];
      return {
        name,
        color: `var(--cell-${name})`,
        active: row.pattern.slice(0, row.subdiv).map((v) => v > 0),
        current: playhead[name],
      };
    }),
    ...SYNTH_ROW_NAMES.map((name) => {
      const row = state.synthRows[name];
      const active = row.pattern
        .slice(0, row.subdivisions)
        .map((v) => (name === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
      return { name, color: `var(--cell-${name})`, active, current: synthPlayhead[name] };
    }),
  ]);
</script>

<div class="general-seq">
  {#each rows as row (row.name)}
    <div class="seq-row">
      <span class="seq-label" style:color={row.color}>{LABEL[row.name]}</span>
      <div class="seq-strip">
        {#each row.active as on, i (i)}
          <span class="seq-cell" class:on class:current={i === row.current} style:--seq-color={row.color}></span>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .general-seq {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .seq-row {
    display: grid;
    grid-template-columns: 52px 1fr;
    align-items: center;
    gap: 6px;
  }
  .seq-label {
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .seq-strip {
    display: flex;
    gap: 1px;
    height: 14px;
    background: var(--xp-face-dark);
    border: 1px solid var(--xp-line);
    border-radius: 2px;
    padding: 1px;
    overflow: hidden;
  }
  .seq-cell {
    flex: 1;
    min-width: 1px;
    border-radius: 1px;
    background: transparent;
  }
  .seq-cell.on {
    background: var(--seq-color);
  }
  .seq-cell.current {
    outline: 1px solid var(--xp-playhead);
    outline-offset: -1px;
  }
</style>
