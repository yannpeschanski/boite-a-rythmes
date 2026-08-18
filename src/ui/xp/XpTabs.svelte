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
  // `locked` (2026-08-16) : un onglet peut être verrouillé tant que le Mode
  // jeu ne l'a pas ouvert (arbitrage D2). Il reste affiché, avec son cadenas
  // et une infobulle disant quel niveau l'ouvre — cf. le commentaire dans
  // App.svelte : une entrée qui disparaît se lit comme une panne.
  let {
    tabs,
    active = $bindable(),
  }: {
    tabs: { id: string; label: string; locked?: boolean; lockHint?: string }[];
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
      class:locked={t.locked}
      disabled={t.locked}
      title={t.locked ? (t.lockHint ?? '') : ''}
      onclick={() => (active = t.id)}
    >
      {t.locked ? `🔒 ${t.label}` : t.label}
    </button>
  {/each}
</div>

<style>
  .xp-tabs {
    display: flex;
    gap: 3px;
    margin-top: 6px;
  }
  /* Compressés (padding/police réduits) : ils libèrent la hauteur qu'ont
     prise les anneaux ajoutés à côté de Lecture/Break, dans la même barre
     sticky — la barre entière ne doit pas grossir d'autant. */
  /* 23px de haut avant l'audit A3, juste sous le minimum de 24 — pour la
     navigation principale de l'Atelier. Passé à 30px. */
  .tab {
    flex: 1;
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    padding: 8px 6px;
    min-height: 30px;
    border: 1px solid var(--xp-line);
    border-radius: 4px;
    background: var(--xp-btn-face);
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
  .tab.locked {
    background: var(--xp-face-dark);
    box-shadow: none;
    color: var(--xp-muted);
    cursor: not-allowed;
  }
</style>
