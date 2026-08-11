<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { game, LEVELS } from '../../stores/game.svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { DrumRowName, PatternStateV2 } from '../../model/types';
  import { DRUM_ROW_NAMES } from '../../model/types';
  import XpWindow from '../xp/XpWindow.svelte';

  let { onGoAtelier }: { onGoAtelier?: () => void } = $props();

  // Un état tampon joué par le moteur : la cible ou la proposition, selon le
  // bouton — le même AudioEngine que l'Atelier, aucun scheduler dédié.
  let playState: PatternStateV2 = game.buildState('target');
  const engine = new AudioEngine(() => playState);
  let playingWhat = $state<'' | 'target' | 'guess'>('');
  let showMap = $state(false);
  let showBag = $state(false);

  // Curseur visuel : consommé à chaque frame contre l'horloge audio, comme
  // dans l'Atelier (AtelierView.svelte) — sans cette boucle, aucune case ne
  // s'illumine pendant la lecture et il est impossible de suivre le rythme.
  let playhead = $state<Record<DrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as DrumRowName] = ev.col;
    }
    raf = requestAnimationFrame(loop);
  }
  function resetPlayhead() {
    playhead = { kick: -1, snare: -1, hat: -1 };
  }

  onMount(() => {
    raf = requestAnimationFrame(loop);
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    engine.stop();
  });

  async function play(which: 'target' | 'guess') {
    if (playingWhat === which) {
      engine.stop();
      playingWhat = '';
      resetPlayhead();
      return;
    }
    engine.stop();
    resetPlayhead();
    playState = game.buildState(which);
    if (which === 'target') game.loopPlays++;
    else game.guessPlays++;
    await engine.start();
    playingWhat = which;
  }

  function stopAll() {
    engine.stop();
    playingWhat = '';
    resetPlayhead();
  }

  function verify() {
    stopAll();
    game.verify();
  }

  function saveToAtelier() {
    pattern.replace(game.toAtelierState());
    onGoAtelier?.();
  }

  const lvl = $derived(game.level);
  const rowLabels: Record<DrumRowName, string> = { kick: 'Kick', snare: 'Snare', hat: 'Hat' };
</script>

<div class="game" data-theme="noir">
  {#if !game.pseudo}
    <XpWindow title="Boîte à rythmes — Mode jeu" icon="🎮" accent="none">
      <p class="lead">Choisis ton pseudo pour commencer la campagne.</p>
      <form
        class="pseudo-form"
        onsubmit={(e) => {
          e.preventDefault();
          const input = (e.currentTarget as HTMLFormElement).elements.namedItem('pseudo') as HTMLInputElement;
          game.setPseudo(input.value);
        }}
      >
        <input name="pseudo" placeholder="Ton pseudo…" autocomplete="off" />
        <button class="xp-btn">C’est parti</button>
      </form>
    </XpWindow>
  {:else}
    <XpWindow title="Niveau {lvl.id} / {LEVELS.length} — {lvl.teach}" icon="🎮" accent="none">
      <div class="head">
        <span class="player">👤 {game.pseudo}</span>
        <button class="xp-btn tiny" onclick={() => (showMap = !showMap)}>🗺️ Carte</button>
        <button class="xp-btn tiny" onclick={() => (showBag = !showBag)}>🎒 Besace ({game.bag.length})</button>
      </div>
      {#if lvl.preamble}<p class="preamble">{lvl.preamble}</p>{/if}

      {#if showMap}
        <div class="map">
          {#each LEVELS as l (l.id)}
            {@const unlocked = game.isUnlocked(l.id)}
            {@const stars = game.playerProgress.stars[String(l.id)] ?? 0}
            <button
              class="map-cell"
              class:locked={!unlocked}
              class:current={l.id === lvl.id}
              disabled={!unlocked}
              title={l.teach}
              onclick={() => {
                stopAll();
                game.startLevel(l.id - 1);
                showMap = false;
              }}
            >
              <span class="num">{unlocked ? l.id : '🔒'}</span>
              <span class="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if showBag}
        <div class="bag">
          {#if game.bag.length === 0}
            <p class="muted">Besace vide. Gagne des niveaux pour la remplir de trucs discutables.</p>
          {:else}
            {#each Object.entries(game.bag.reduce((acc: Record<string, { item: (typeof game.bag)[0]; n: number }>, it) => { const k = it.emoji + it.name; acc[k] = acc[k] ? { item: it, n: acc[k].n + 1 } : { item: it, n: 1 }; return acc; }, {})) as [key, entry] (key)}
              <div class="bag-item">
                <span class="emoji">{entry.item.emoji}</span>
                {entry.item.name}{entry.n > 1 ? ` ×${entry.n}` : ''}
              </div>
            {/each}
            <p class="muted">{new Set(game.bag.map((i) => i.name)).size}/{31} objets découverts</p>
          {/if}
        </div>
      {/if}

      <div class="transport">
        <button class="xp-btn" onclick={() => play('target')}>
          {playingWhat === 'target' ? '■ Stop' : '🔊 Écouter le rythme à trouver'}
        </button>
        <button class="xp-btn" onclick={() => play('guess')}>
          {playingWhat === 'guess' ? '■ Stop' : '🎧 Écouter ma version'}
        </button>
        <button class="xp-btn primary" disabled={game.solved || game.revealed} onclick={verify}>
          ✓ Vérifier
        </button>
      </div>

      {#each DRUM_ROW_NAMES as name (name)}
        {#if game.target[name].some((v) => v > 0) || game.guess[name].some((v) => v > 0)}
          {@const c = game.counts(name)}
          <div class="row">
            <div class="row-head">
              <span class="row-label">{rowLabels[name]}</span>
              <span class="count" class:ok={c.placed === c.expected}>{c.placed}/{c.expected}</span>
              {#if game.shift[name] !== 0}
                <span class="badge" title="Cette ligne est décalée">{game.shift[name] < 0 ? '◀' : '▶'}</span>
              {/if}
            </div>
            <div class="cells" style:--cols={game.subdiv[name]}>
              {#each { length: game.subdiv[name] } as _, col (col)}
                {@const st = game.guess[name][col]}
                {@const locked = game.locked[name][col]}
                <button
                  class="cell state-{st}"
                  class:locked
                  class:revealed={game.revealed && game.target[name][col] > 0 && !locked}
                  class:playing={playhead[name] === col}
                  onclick={() => game.cycleCell(name, col)}
                  oncontextmenu={(e) => {
                    e.preventDefault();
                    game.cycleRoll(name, col);
                  }}
                >
                  {#if locked}<span class="mark">✓</span>
                  {:else if game.revealed && game.target[name][col] > 0}<span class="mark">○</span>{/if}
                  {#if game.guessRolls[name][col] > 1}<span class="roll">×{game.guessRolls[name][col]}</span>{/if}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      {#if game.lastResult}
        <div class="result" class:won={game.solved}>
          <p class="stars-big">{'★'.repeat(game.lastResult.stars)}{'☆'.repeat(3 - game.lastResult.stars)}</p>
          <p class="roast">{game.lastResult.roast}</p>
          {#if game.lastResult.presetLabel}
            <p class="context">🎵 Le plus proche : <strong>{game.lastResult.presetLabel}</strong>{#if game.lastResult.history} — {game.lastResult.history}{/if}</p>
          {/if}
          {#if game.lastResult.items.length}
            <p class="loot">
              Tu récoltes : {#each game.lastResult.items as it, i (i)}<span>{it.emoji} {it.name}</span>{#if i < game.lastResult.items.length - 1}, {/if}{/each}
            </p>
          {/if}
          <div class="result-btns">
            {#if game.solved && game.levelIndex < LEVELS.length - 1}
              <button class="xp-btn primary" onclick={() => { stopAll(); game.startLevel(game.levelIndex + 1); }}>
                Niveau suivant →
              </button>
            {/if}
            <button class="xp-btn" onclick={saveToAtelier}>💾 Sauvegarder dans l’Atelier</button>
          </div>
        </div>
      {:else}
        <div class="footer-btns">
          <button class="xp-btn tiny" onclick={() => { stopAll(); game.revealSolution(); game.giveUp(); }}>
            Voir la solution (0★)
          </button>
          <button class="xp-btn tiny" onclick={() => { stopAll(); game.giveUp(); game.startLevel(game.levelIndex); }}>
            Nouveau rythme
          </button>
        </div>
      {/if}
    </XpWindow>
  {/if}
</div>

<style>
  .game {
    color: var(--xp-text);
  }
  .lead {
    font-size: 13px;
  }
  .pseudo-form {
    display: flex;
    gap: 6px;
  }
  input {
    flex: 1;
    font-family: var(--xp-font);
    font-size: 13px;
    padding: 4px;
    border: 1px solid var(--xp-line);
    background: #fff;
    color: #111;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .player {
    font-size: 12px;
    font-weight: 700;
  }
  .preamble {
    font-size: 12px;
    background: rgba(255, 255, 255, 0.06);
    border-left: 3px solid var(--xp-accent-teal);
    padding: 6px 8px;
    margin: 0 0 8px;
  }
  .map {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 10px;
  }
  .map-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    color: var(--xp-text);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-size: 12px;
  }
  .map-cell.locked {
    opacity: 0.45;
    cursor: default;
  }
  .map-cell.current {
    outline: 2px solid #ffd54a;
  }
  .stars {
    font-size: 9px;
    color: #ffce3d;
  }
  .bag {
    max-height: 180px;
    overflow-y: auto;
    font-size: 12px;
    margin-bottom: 10px;
    background: rgba(0, 0, 0, 0.15);
    padding: 6px;
  }
  .bag-item {
    padding: 1px 0;
  }
  .emoji {
    margin-right: 4px;
  }
  .muted {
    color: var(--xp-muted);
    font-size: 11px;
  }
  .transport {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .xp-btn {
    padding: 5px 12px;
    border: 1px solid #1b2440;
    border-radius: 3px;
    background: linear-gradient(180deg, #6a6a7a, #43434f 50%, #35353f);
    color: #fff;
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-size: 12px;
    font-family: inherit;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.primary {
    font-weight: 700;
    background: linear-gradient(180deg, #4d8f4d, #2f6b2f 50%, #235023);
  }
  .xp-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .xp-btn.tiny {
    font-size: 11px;
    padding: 2px 8px;
  }
  .row {
    margin-bottom: 10px;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    margin-bottom: 3px;
  }
  .row-label {
    font-weight: 700;
    text-transform: uppercase;
  }
  .count {
    font-family: var(--xp-mono);
    color: var(--xp-muted);
  }
  .count.ok {
    color: #6ce06c;
  }
  .badge {
    color: #ffce3d;
  }
  .cells {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 3px;
  }
  .cell {
    position: relative;
    height: 34px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #55555f, #3a3a44);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    padding: 0;
    touch-action: manipulation;
  }
  .cell.state-1 {
    background: #2f7fd0;
    box-shadow: var(--xp-bevel-in);
  }
  .cell.state-2 {
    background: #7fb6ea;
    box-shadow: var(--xp-bevel-in);
  }
  .cell.locked {
    background: #2f8a4f;
    cursor: default;
  }
  .cell.revealed {
    outline: 2px dashed #ffce3d;
  }
  .cell.playing {
    outline: 2px solid #ffd54a;
    outline-offset: -1px;
  }
  .mark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    color: #fff;
  }
  .roll {
    position: absolute;
    right: 2px;
    bottom: 0;
    font-size: 9px;
    font-family: var(--xp-mono);
    color: #fff;
  }
  .result {
    border: 1px solid var(--xp-line);
    background: rgba(0, 0, 0, 0.25);
    padding: 10px;
    margin-top: 10px;
  }
  .result.won {
    border-color: #4d8f4d;
  }
  .stars-big {
    font-size: 24px;
    color: #ffce3d;
    margin: 0 0 4px;
  }
  .roast,
  .context,
  .loot {
    font-size: 12px;
    margin: 4px 0;
  }
  .context {
    color: var(--xp-muted);
  }
  .result-btns,
  .footer-btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
</style>
