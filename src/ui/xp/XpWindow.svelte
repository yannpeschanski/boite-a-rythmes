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
</script>

<section class="xp-window accent-{accent}">
  <header class="titlebar">
    <span class="icon">{icon}</span>
    <span class="title">{title}</span>
  </header>
  <div class="body">
    {@render children()}
  </div>
</section>

<style>
  .xp-window {
    background: linear-gradient(180deg, #4b4b57, #2e2e38 55%, #1e1e26);
    border: 1px solid var(--xp-line);
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
    font-size: var(--xp-size-title);
    font-weight: 700;
    letter-spacing: var(--xp-ls-title);
    text-transform: uppercase;
    text-shadow: 1px 1px 1px rgba(0, 0, 40, 0.6);
    user-select: none;
  }
  .title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
</style>
