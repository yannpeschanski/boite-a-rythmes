<script lang="ts">
  // Onglets XP — même composant que les boîtes de dialogue à onglets de
  // Windows XP (Propriétés d'affichage, etc.), prévu dans PLAN.md §2 mais
  // jamais construit. Sert ici à séparer Rythme / Synthé / Effets en pages
  // courtes au lieu d'un unique long scroll : le séquenceur d'une page
  // redevient visible sans avoir à traverser les réglages des deux autres.
  let {
    tabs,
    active = $bindable(),
  }: {
    tabs: { id: string; label: string }[];
    active: string;
  } = $props();
</script>

<div class="xp-tabs" role="tablist">
  {#each tabs as t (t.id)}
    <button
      role="tab"
      aria-selected={active === t.id}
      class="tab"
      class:active={active === t.id}
      onclick={() => (active = t.id)}
    >
      {t.label}
    </button>
  {/each}
</div>

<style>
  .xp-tabs {
    display: flex;
    gap: 2px;
    padding: 6px 4px 0;
  }
  .tab {
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 6px 16px;
    border: 1px solid var(--xp-line);
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: var(--xp-face-dark);
    color: var(--xp-muted);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.06);
    cursor: pointer;
    position: relative;
    top: 1px;
  }
  .tab:hover:not(.active) {
    color: var(--xp-text);
  }
  .tab.active {
    background: var(--xp-face);
    color: var(--xp-text);
    box-shadow: none;
    border-bottom: 1px solid var(--xp-face);
  }
</style>
