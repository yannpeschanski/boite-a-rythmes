<script lang="ts">
  import SelecteurGamme from './ui/SelecteurGamme.svelte';
  import SelecteurNotes from './ui/SelecteurNotes.svelte';

  let onglet: 'gammes' | 'notes' = $state('gammes');
</script>

<main>
  <h1>Manche de guitare</h1>
  <nav class="onglets">
    <button type="button" class:actif={onglet === 'gammes'} onclick={() => (onglet = 'gammes')}>
      Gammes
    </button>
    <button type="button" class:actif={onglet === 'notes'} onclick={() => (onglet = 'notes')}>
      Notes sur le manche
    </button>
  </nav>

  {#if onglet === 'gammes'}
    <SelecteurGamme />
  {:else}
    <SelecteurNotes />
  {/if}
</main>
