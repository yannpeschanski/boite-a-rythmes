<script lang="ts">
  // Bascule Atelier / Mode jeu — remplace switchMode() et les 3 écrans de
  // l'original. Le splash devient un simple choix d'entrée : il servait aussi
  // de geste de déverrouillage audio (politique d'autoplay des navigateurs),
  // rôle conservé puisqu'on n'ouvre l'AudioContext qu'au premier clic.
  import { onMount } from 'svelte';
  import AtelierView from './ui/atelier/AtelierView.svelte';
  import GameView from './ui/game/GameView.svelte';
  import LiveView from './ui/live/LiveView.svelte';
  import { game } from './stores/game.svelte';
  import { pattern } from './stores/pattern.svelte';
  import { loadFromHash } from './stores/share';

  let view = $state<'splash' | 'atelier' | 'game' | 'live'>('splash');

  onMount(() => {
    game.load();
    // Rythme partagé par URL : on entre directement dans l'Atelier.
    if (loadFromHash()) view = 'atelier';
    // Mode Live — phase 1 (squelette), volontairement pas dans la navigation
    // normale : accessible seulement en connaissant l'URL, pour tester sur un
    // vrai téléphone sans l'exposer aux autres visiteurs (PLAN.md §7).
    if (location.hash === '#mode-live') view = 'live';
  });
</script>

{#if view === 'live'}
  <LiveView onExit={() => (view = 'atelier')} />
{:else if view === 'splash'}
  <div class="splash">
    <h1>Boîte à rythmes</h1>
    <p>Un séquenceur rétro, et une campagne pour apprendre le rythme à l’oreille.</p>
    <div class="choices">
      <button class="big" onclick={() => (view = 'atelier')}>🥁 Atelier<small>Composer librement</small></button>
      <button class="big" onclick={() => (view = 'game')}>🎮 Mode jeu<small>34 niveaux</small></button>
    </div>
  </div>
{:else}
  <nav class="switcher">
    <button class:on={view === 'atelier'} onclick={() => (view = 'atelier')}>🥁 Atelier</button>
    <button class:on={view === 'game'} onclick={() => (view = 'game')}>🎮 Mode jeu</button>
  </nav>
  {#if view === 'atelier'}
    <AtelierView />
  {:else}
    <GameView onGoAtelier={() => (view = 'atelier')} />
  {/if}
{/if}

<style>
  .splash {
    text-align: center;
    padding: 48px 12px;
    color: #fff;
    text-shadow: 0 2px 6px rgba(0, 0, 40, 0.5);
  }
  h1 {
    font-size: 34px;
    margin: 0 0 6px;
  }
  .splash p {
    margin: 0 0 24px;
    font-size: 14px;
  }
  .choices {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .big {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 18px 28px;
    font-size: 18px;
    font-family: inherit;
    border: 1px solid #003c74;
    border-radius: 6px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out), 0 4px 14px rgba(0, 0, 30, 0.35);
    cursor: pointer;
    color: var(--xp-text);
    text-shadow: none;
  }
  .big small {
    font-size: 11px;
    color: var(--xp-muted);
  }
  .switcher {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
  }
  .switcher button {
    padding: 5px 14px;
    border: 1px solid #003c74;
    border-radius: 3px 3px 0 0;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
  }
  .switcher button.on {
    font-weight: 700;
    box-shadow: var(--xp-bevel-in);
  }
</style>
