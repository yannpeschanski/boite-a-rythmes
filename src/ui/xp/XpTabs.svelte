<script lang="ts">
  // Onglets XP — même composant que les boîtes de dialogue à onglets de
  // Windows XP (Propriétés d'affichage, etc.), prévu dans PLAN.md §2 mais
  // jamais construit. Sert ici à séparer Rythme / Synthé / Effets en pages
  // courtes au lieu d'un unique long scroll : le séquenceur d'une page
  // redevient visible sans avoir à traverser les réglages des deux autres.
  //
  // Logé DANS la barre sticky (pas juste au-dessus d'un panneau) pour rester
  // joignable sans remonter en haut de page, quel que soit l'endroit où on a
  // défilé — d'où un rendu en groupe de boutons XP plutôt qu'en onglets de
  // dossier « collés » au panneau du dessous (qui n'est plus adjacent).
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
    gap: 4px;
    margin-top: 8px;
  }
  .tab {
    flex: 1;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    padding: 7px 8px;
    border: 1px solid var(--xp-line);
    border-radius: 4px;
    background: linear-gradient(180deg, #fff, var(--xp-face-dark));
    box-shadow: var(--xp-bevel-out);
    color: var(--xp-muted);
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
  }
  .tab:active {
    box-shadow: var(--xp-bevel-in);
  }
  .tab:hover:not(.active) {
    color: var(--xp-text);
  }
  .tab.active {
    background: var(--xp-select-blue);
    color: #fff;
    box-shadow: var(--xp-bevel-in);
  }
</style>
