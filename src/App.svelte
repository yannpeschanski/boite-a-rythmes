<script lang="ts">
  // Bascule Atelier / Mode jeu — remplace switchMode() et les 3 écrans de
  // l'original. Le splash devient un simple choix d'entrée : il servait aussi
  // de geste de déverrouillage audio (politique d'autoplay des navigateurs),
  // rôle conservé puisqu'on n'ouvre l'AudioContext qu'au premier clic.
  import { onMount, onDestroy } from 'svelte';
  import AtelierView from './ui/atelier/AtelierView.svelte';
  import GameView from './ui/game/GameView.svelte';
  import LiveView from './ui/live/LiveView.svelte';
  import { game } from './stores/game.svelte';
  import { pattern } from './stores/pattern.svelte';
  import { loadFromHash } from './stores/share';
  import { unlocks } from './stores/unlocks.svelte';
  import { unlockLevelFor, type LockedModule } from './model/unlocks';

  let view = $state<'splash' | 'atelier' | 'game' | 'live'>('splash');

  onMount(() => {
    game.load();
    // Contournement #boss AVANT tout le reste : ce qui suit lit les verrous.
    unlocks.init(location.hash);
    // Rythme partagé par URL : on entre directement dans l'Atelier. Le lien
    // vaut intention, il ouvre l'Atelier même verrouillé (voir model/unlocks).
    if (loadFromHash()) {
      unlocks.sharedPattern = true;
      view = 'atelier';
    }
    // Lien direct/favori vers le Mode Live (en plus du bouton de nav
    // ci-dessous, pas à sa place) — pratique pour y revenir sans repasser
    // par l'écran d'accueil.
    if (location.hash === '#mode-live' && unlocks.has('live')) view = 'live';
    // Taper #boss (ou #boss=off) dans la barre d'adresse d'une page DÉJÀ
    // ouverte ne la recharge pas : sans cet écouteur, la bascule ne prendrait
    // effet qu'au rechargement suivant — et on croirait qu'elle ne marche
    // pas. Trouvé en testant #boss=off, pas en relisant le code.
    window.addEventListener('hashchange', onHashChange);
  });
  onDestroy(() => window.removeEventListener('hashchange', onHashChange));

  function onHashChange() {
    unlocks.init(location.hash);
    // Si on retire l'accès total depuis un module désormais verrouillé, on
    // ne laisse pas l'utilisateur dedans : retour à l'accueil.
    if (view === 'atelier' && !unlocks.has('atelier')) view = 'splash';
    if (view === 'live' && !unlocks.has('live')) view = 'splash';
  }

  // Verrou DUR (arbitrage D2 de Yann, 2026-08-16) : le module n'est pas
  // utilisable tant que le Mode jeu ne l'a pas ouvert. Il reste VISIBLE avec
  // son cadenas et le niveau qui l'ouvre — comme l'original, qui posait un
  // overlay de verrouillage plutôt que d'escamoter le module. Une entrée qui
  // disparaît se lit comme une panne ; une entrée cadenassée se lit comme une
  // suite. « Dur » porte sur l'accès, pas sur la visibilité.
  function enter(v: 'atelier' | 'game' | 'live', mod?: LockedModule) {
    if (mod && !unlocks.has(mod)) return;
    view = v;
  }
  function lockTitle(mod: LockedModule): string {
    return `Se débloque au niveau ${unlockLevelFor(mod)} du Mode jeu`;
  }
</script>

{#if view === 'live'}
  <LiveView onExit={() => (view = 'atelier')} />
{:else if view === 'splash'}
  <div class="splash">
    <h1>Boîte à rythmes</h1>
    <p>Un séquenceur rétro, et une campagne pour apprendre le rythme à l’oreille.</p>
    <div class="choices">
      <button
        class="big"
        class:locked={!unlocks.has('atelier')}
        disabled={!unlocks.has('atelier')}
        title={unlocks.has('atelier') ? '' : lockTitle('atelier')}
        onclick={() => enter('atelier', 'atelier')}
      >
        {unlocks.has('atelier') ? '🥁' : '🔒'} Atelier<small
          >{unlocks.has('atelier') ? 'Composer librement' : `Niveau ${unlockLevelFor('atelier')}`}</small
        ></button
      >
      <button class="big" onclick={() => enter('game')}>🎮 Mode jeu<small>34 niveaux</small></button>
      <button
        class="big"
        class:locked={!unlocks.has('live')}
        disabled={!unlocks.has('live')}
        title={unlocks.has('live') ? '' : lockTitle('live')}
        onclick={() => enter('live', 'live')}
      >
        {unlocks.has('live') ? '🎛' : '🔒'} Mode Live<small
          >{unlocks.has('live') ? 'Manette paysage' : `Niveau ${unlockLevelFor('live')}`}</small
        ></button
      >
    </div>
    {#if !unlocks.has('atelier')}
      <p class="hint">L’Atelier s’ouvre en réussissant le premier niveau du Mode jeu.</p>
    {/if}
    {#if unlocks.totalAccess}
      <p class="boss">🔓 Accès total — <code>{unlocks.totalAccessHint}</code></p>
    {/if}
  </div>
{:else}
  <!-- La barre de navigation ne subsiste que pour le Mode jeu (audit A1) :
       dans l'Atelier elle était la première des QUATRE barres empilées avant
       la première case jouable, et son contenu tient naturellement dans un
       menu « Mode » de la barre de menus juste en dessous — un menu de
       bascule d'écran, c'est exactement ce qu'une barre de menus XP sait
       faire. Le Mode jeu, lui, n'a pas de barre de menus et dispose de toute
       la hauteur : il la garde. -->
  {#if view === 'atelier'}
    <AtelierView onSwitchView={(v) => (view = v)} />
  {:else}
    <nav class="switcher">
      <button
        disabled={!unlocks.has('atelier')}
        title={unlocks.has('atelier') ? '' : lockTitle('atelier')}
        onclick={() => enter('atelier', 'atelier')}>{unlocks.has('atelier') ? '🥁' : '🔒'} Atelier</button
      >
      <button class="on" onclick={() => enter('game')}>🎮 Mode jeu</button>
      <button
        disabled={!unlocks.has('live')}
        title={unlocks.has('live') ? '' : lockTitle('live')}
        onclick={() => enter('live', 'live')}>{unlocks.has('live') ? '🎛' : '🔒'} Mode Live</button
      >
    </nav>
    <GameView onGoAtelier={() => (view = 'atelier')} />
  {/if}
{/if}

<style>
  .splash {
    text-align: center;
    padding: 48px 12px;
    color: var(--xp-title-text);
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
    border: 1px solid var(--xp-line);
    border-radius: 6px;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    box-shadow: var(--xp-bevel-out), 0 4px 14px rgba(0, 0, 30, 0.35);
    cursor: pointer;
    color: var(--xp-text);
    text-shadow: none;
  }
  .big small {
    font-size: 11px;
    color: var(--xp-muted);
  }
  /* Verrouillé : le relief sortant disparaît (rien à enfoncer) et le bouton
     s'éteint, mais il garde sa taille et sa place — c'est ce qui le fait lire
     comme « pas encore » et non comme « absent ». */
  .big.locked {
    background: var(--xp-face-dark);
    box-shadow: none;
    border-color: var(--xp-line);
    color: var(--xp-muted);
    cursor: not-allowed;
  }
  .splash .hint {
    margin: 18px 0 0;
    font-size: 12.5px;
    opacity: 0.9;
  }
  .splash .boss {
    margin: 10px 0 0;
    font-size: 12px;
    opacity: 0.95;
  }
  .splash .boss code {
    background: rgba(0, 0, 0, 0.25);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .switcher button:disabled {
    background: var(--xp-face-dark);
    color: var(--xp-muted);
    cursor: not-allowed;
  }
  .switcher {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
  }
  .switcher button {
    padding: 5px 14px;
    border: 1px solid var(--xp-line);
    border-radius: 3px 3px 0 0;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    cursor: pointer;
    font-size: 13px;
    font-family: inherit;
  }
  .switcher button.on {
    font-weight: 700;
    box-shadow: var(--xp-bevel-in);
  }
  /* Chantier tactile (cf. styles/global.css) : la navigation principale entre
     les trois modes — la cible la plus importante de l'écran d'accueil. */
  @media (pointer: coarse) {
    .switcher {
      gap: 12px;
      margin-bottom: 16px;
    }
    .switcher button {
      position: relative;
    }
    .switcher button::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      translate: -50% -50%;
      height: max(100%, 44px);
      width: max(100%, 44px);
    }
  }
</style>
