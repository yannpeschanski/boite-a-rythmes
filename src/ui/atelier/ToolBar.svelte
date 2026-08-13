<script lang="ts">
  // Barre de menus XP (Fichier / Édition / Affichage) + les outils ajoutés
  // par la réécriture : partage par URL, undo/redo, tap tempo.
  import { pattern } from '../../stores/pattern.svelte';
  import { history } from '../../stores/history.svelte';
  import { buildShareUrl } from '../../stores/share';
  import { systemSoundsEnabled, setSystemSoundsEnabled, playSystemSound } from '../xp/systemSounds';
  import { paramHintsSettings } from '../xp/paramHints.svelte';

  let {
    onExport,
    onImport,
    onReset,
    circleView = $bindable(false),
  }: {
    onExport: () => void;
    onImport: () => void;
    onReset: () => void;
    circleView?: boolean;
  } = $props();

  let openMenu = $state('');
  let shareMsg = $state('');

  // Sons système XP (PLAN.md §2/§6) : réglage global, persisté en
  // localStorage par systemSounds.ts — état local juste pour que le libellé
  // du menu reflète le réglage courant sans le relire à chaque rendu.
  let soundsOn = $state(systemSoundsEnabled());
  function toggleSystemSounds() {
    soundsOn = !soundsOn;
    setSystemSoundsEnabled(soundsOn);
    if (soundsOn) playSystemSound('open'); // confirmation audible du réglage qu'on vient d'activer
  }

  // Tap tempo : on garde les intervalles récents et on en prend la moyenne.
  // Absent de l'original, alors que régler un tempo « à l'oreille » sur un
  // morceau existant est le cas d'usage le plus courant.
  let taps: number[] = [];
  function tapTempo() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = []; // trop long : nouvelle série
    taps.push(now);
    if (taps.length > 5) taps.shift();
    if (taps.length < 2) return;
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avg / 10) * 10; // le tempo va par pas de 10
    pattern.state.tempo = Math.max(40, Math.min(200, bpm));
  }

  async function share() {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      shareMsg = 'Lien copié ! Colle-le où tu veux, il contient tout le rythme.';
    } catch {
      // Presse-papiers refusé (contexte non sécurisé) : on met le lien dans
      // l'URL pour que l'utilisateur puisse le copier lui-même.
      location.hash = url.split('#')[1] ?? '';
      shareMsg = 'Lien placé dans la barre d’adresse — copie-la.';
    }
    setTimeout(() => (shareMsg = ''), 5000);
  }

  function choose(action: () => void) {
    openMenu = '';
    action();
  }

  // Bouton retour utilisateur (retour de Yann, 2026-08-13) : pas de backend,
  // un simple mailto: pré-rempli est la solution la plus légère — marche
  // partout, ne demande aucun compte, aucun serveur à maintenir.
  function reportFeedback() {
    const subject = encodeURIComponent('Boîte à rythmes — retour');
    const body = encodeURIComponent(
      `Bug, correction ou idée — écris ici :\n\n\n---\n${location.href}`,
    );
    location.href = `mailto:yann.peschanski@gmail.com?subject=${subject}&body=${body}`;
  }
</script>

<svelte:window onclick={() => (openMenu = '')} />

<div class="menubar" role="menubar">
  <div class="menu">
    <button
      class="menu-btn"
      class:on={openMenu === 'file'}
      onclick={(e) => {
        e.stopPropagation();
        openMenu = openMenu === 'file' ? '' : 'file';
      }}>Fichier</button
    >
    {#if openMenu === 'file'}
      <div class="dropdown">
        <button onclick={() => choose(onReset)}>Nouveau rythme</button>
        <button onclick={() => choose(onImport)}>Ouvrir…</button>
        <button onclick={() => choose(onExport)}>Enregistrer sous…</button>
        <button onclick={() => choose(share)}>Partager par lien</button>
      </div>
    {/if}
  </div>
  <div class="menu">
    <button
      class="menu-btn"
      class:on={openMenu === 'edit'}
      onclick={(e) => {
        e.stopPropagation();
        openMenu = openMenu === 'edit' ? '' : 'edit';
      }}>Édition</button
    >
    {#if openMenu === 'edit'}
      <div class="dropdown">
        <button disabled={!history.canUndo} onclick={() => choose(() => history.undo())}>Annuler</button>
        <button disabled={!history.canRedo} onclick={() => choose(() => history.redo())}>Rétablir</button>
      </div>
    {/if}
  </div>
  <div class="menu">
    <button
      class="menu-btn"
      class:on={openMenu === 'view'}
      onclick={(e) => {
        e.stopPropagation();
        openMenu = openMenu === 'view' ? '' : 'view';
      }}>Affichage</button
    >
    {#if openMenu === 'view'}
      <div class="dropdown">
        <button onclick={() => choose(() => (circleView = false))}>Vue linéaire</button>
        <button onclick={() => choose(() => (circleView = true))}>Vue circulaire</button>
        <button onclick={() => choose(toggleSystemSounds)}>{soundsOn ? '🔊' : '🔈'} Sons système : {soundsOn ? 'Activés' : 'Désactivés'}</button>
        <button onclick={() => choose(() => paramHintsSettings.toggle())}
          >{paramHintsSettings.enabled ? '💡' : '🌑'} Aide contextuelle : {paramHintsSettings.enabled ? 'Activée' : 'Désactivée'}</button
        >
      </div>
    {/if}
  </div>
  <div class="menu">
    <button
      class="menu-btn"
      class:on={openMenu === 'help'}
      onclick={(e) => {
        e.stopPropagation();
        openMenu = openMenu === 'help' ? '' : 'help';
      }}>Aide</button
    >
    {#if openMenu === 'help'}
      <div class="dropdown">
        <button onclick={() => choose(reportFeedback)}>✉️ Signaler un bug / une idée</button>
      </div>
    {/if}
  </div>

  <div class="spacer"></div>
  <button class="tool" onclick={tapTempo} title="Tape le tempo en rythme">👆 Tap tempo</button>
  <button class="tool" disabled={!history.canUndo} onclick={() => history.undo()} title="Annuler (Ctrl+Z)">↶</button>
  <button class="tool" disabled={!history.canRedo} onclick={() => history.redo()} title="Rétablir (Ctrl+Y)">↷</button>
  <button class="tool" onclick={share} title="Copier un lien contenant ce rythme">🔗 Partager</button>
</div>
{#if shareMsg}<p class="share-msg">{shareMsg}</p>{/if}

<style>
  .menubar {
    display: flex;
    align-items: center;
    gap: 2px;
    background: var(--xp-face);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    padding: 2px 4px;
    margin-bottom: 8px;
    border-radius: 3px;
    flex-wrap: wrap;
  }
  .menu {
    position: relative;
  }
  .menu-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 12px;
    padding: 3px 9px;
    cursor: pointer;
    color: var(--xp-text);
  }
  .menu-btn.on,
  .menu-btn:hover {
    background: var(--xp-select-blue);
    color: #fff;
  }
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 20;
    min-width: 190px;
    background: var(--xp-face);
    border: 1px solid var(--xp-line);
    box-shadow: 2px 2px 6px rgba(0, 0, 30, 0.35);
    padding: 2px;
  }
  .dropdown button {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    font-family: inherit;
    font-size: 12px;
    padding: 4px 10px;
    cursor: pointer;
    color: var(--xp-text);
  }
  .dropdown button:hover:not(:disabled) {
    background: var(--xp-select-blue);
    color: #fff;
  }
  .dropdown button:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  .spacer {
    flex: 1;
  }
  .tool {
    font-family: inherit;
    font-size: 11px;
    padding: 2px 8px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
  }
  .tool:active {
    box-shadow: var(--xp-bevel-in);
  }
  .tool:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  .share-msg {
    font-size: 12px;
    background: #fffbe6;
    border: 1px solid var(--xp-accent-amber);
    padding: 5px 8px;
    margin: 0 0 8px;
  }
</style>
