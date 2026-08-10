<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    icon = '🥁',
    accent = 'amber',
    children,
  }: {
    title: string;
    icon?: string;
    accent?: 'amber' | 'violet' | 'teal' | 'none';
    children: Snippet;
  } = $props();

  let collapsed = $state(false);
  let shutdown = $state(false);

  // Boutons de fenêtre détournés, comme l'original : _ replie, □ déplie,
  // × = gag « Extinction en cours… » qui se referme tout seul.
  function fakeShutdown() {
    shutdown = true;
    setTimeout(() => (shutdown = false), 1800);
  }
</script>

<section class="xp-window accent-{accent}">
  <header class="titlebar">
    <span class="icon">{icon}</span>
    <span class="title">{title}</span>
    <span class="buttons">
      <button class="wbtn" title="Replier" onclick={() => (collapsed = true)}>_</button>
      <button class="wbtn" title="Déplier" onclick={() => (collapsed = false)}>□</button>
      <button class="wbtn close" title="Fermer" onclick={fakeShutdown}>×</button>
    </span>
  </header>
  {#if !collapsed}
    <div class="body">
      {@render children()}
    </div>
  {/if}
  {#if shutdown}
    <div class="shutdown">Extinction en cours…</div>
  {/if}
</section>

<style>
  .xp-window {
    background: var(--xp-face);
    border: 1px solid #0831d9;
    border-radius: 8px 8px 3px 3px;
    box-shadow: 0 4px 14px rgba(0, 0, 30, 0.35);
    margin-bottom: 14px;
    overflow: hidden;
    position: relative;
  }
  .titlebar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: var(--xp-title-grad);
    color: var(--xp-title-text);
    font-weight: 700;
    text-shadow: 1px 1px 1px rgba(0, 0, 40, 0.6);
    user-select: none;
  }
  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .buttons {
    display: flex;
    gap: 2px;
  }
  .wbtn {
    width: 22px;
    height: 22px;
    border: 1px solid #fff;
    border-radius: 3px;
    background: linear-gradient(180deg, #7ba2e7 0%, #3d6fe0 50%, #2a54c4 100%);
    color: #fff;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    text-shadow: none;
  }
  .wbtn.close {
    background: var(--xp-close-grad);
  }
  .wbtn:active {
    filter: brightness(0.85);
  }
  .body {
    padding: 10px;
  }
  .accent-amber .body {
    border-top: 3px solid var(--xp-accent-amber);
    background: linear-gradient(180deg, var(--xp-accent-amber-soft), var(--xp-face) 60px);
  }
  .accent-violet .body {
    border-top: 3px solid var(--xp-accent-violet);
    background: linear-gradient(180deg, var(--xp-accent-violet-soft), var(--xp-face) 60px);
  }
  .accent-teal .body {
    border-top: 3px solid var(--xp-accent-teal);
    background: linear-gradient(180deg, var(--xp-accent-teal-soft), var(--xp-face) 60px);
  }
  .shutdown {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: #04246a;
    color: #fff;
    font-size: 18px;
    z-index: 5;
  }
</style>
