<script lang="ts">
  import type { ClasseNote } from '../model/types';
  import type { CelluleManche } from './types';

  interface Props {
    accordage: number[];
    nbCases: number;
    cellules: CelluleManche[][];
    onCliqueCellule?: (classe: ClasseNote) => void;
  }

  let { accordage, nbCases, cellules, onCliqueCellule }: Props = $props();

  const REPERES = [3, 5, 7, 9, 12];
</script>

<div class="manche" style={`--cols: ${nbCases + 1}`}>
  <div class="reperes">
    <div class="repere-case"></div>
    {#each Array.from({ length: nbCases }) as _, i (i)}
      <div class="repere-case">{REPERES.includes(i + 1) ? '●' : ''}</div>
    {/each}
  </div>
  {#each accordage as _, corde (corde)}
    <div class="corde">
      {#each cellules[corde] as cellule, caseIdx (caseIdx)}
        <button
          type="button"
          class="case accent-{cellule.accent ?? 'vide'}"
          class:visible={cellule.visible}
          class:sillet={caseIdx === 0}
          disabled={!onCliqueCellule}
          onclick={() => onCliqueCellule?.(cellule.classe)}
        >
          {#if cellule.visible}<span class="libelle">{cellule.libelle}</span>{/if}
        </button>
      {/each}
    </div>
  {/each}
</div>

<style>
  .manche {
    background: var(--bois);
    border-radius: 8px;
    padding: 0.5rem;
    overflow-x: auto;
  }

  .reperes,
  .corde {
    display: grid;
    grid-template-columns: repeat(var(--cols), 1fr);
    align-items: center;
    min-width: 480px;
  }

  .reperes {
    color: #d9c7a8;
    font-size: 0.7rem;
    text-align: center;
    height: 1rem;
  }

  .corde {
    height: 44px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  }

  .corde:last-child {
    border-bottom: none;
  }

  .case {
    position: relative;
    height: 100%;
    border: none;
    border-right: 2px solid var(--bois-clair);
    background: transparent;
    padding: 0;
    cursor: default;
  }

  .case:not(:disabled) {
    cursor: pointer;
  }

  .case.sillet {
    border-left: 4px solid #d9c7a8;
  }

  .case.visible::before {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: #888;
    z-index: 0;
  }

  .case.accent-fondamentale.visible::before {
    background: var(--fondamentale);
  }
  .case.accent-tierce.visible::before {
    background: var(--tierce);
  }
  .case.accent-quinte.visible::before {
    background: var(--quinte);
  }
  .case.accent-selection.visible::before {
    background: var(--selection);
  }

  .libelle {
    position: relative;
    z-index: 1;
    display: block;
    font-size: 0.7rem;
    color: var(--texte);
  }
</style>
