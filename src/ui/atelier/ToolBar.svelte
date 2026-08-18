<script lang="ts">
  // Barre de menus XP (Fichier / Édition / Affichage) + les outils ajoutés
  // par la réécriture : partage par URL, undo/redo, tap tempo.
  import { history } from '../../stores/history.svelte';
  import { buildShareUrl } from '../../stores/share';
  import { systemSoundsEnabled, setSystemSoundsEnabled, playSystemSound } from '../xp/systemSounds';
  import { paramHintsSettings } from '../xp/paramHints.svelte';
  import { PRESETS, PRESET_CATEGORIES, type SongPresetData } from '../../model/presets/songs';
  import { sequenceBank } from '../../stores/bank.svelte';
  import { unlocks } from '../../stores/unlocks.svelte';
  import { unlockLevelFor } from '../../model/unlocks';

  let {
    onExport,
    onImport,
    onReset,
    onSwitchView,
    onLoadPreset,
    onLoadBank,
    circleView = $bindable(false),
  }: {
    onExport: () => void;
    onImport: () => void;
    onReset: () => void;
    // Bascule d'écran, remontée depuis App.svelte : la barre de navigation
    // séparée a disparu de l'Atelier (audit A1), son rôle vit ici.
    onSwitchView?: (v: 'atelier' | 'game' | 'live') => void;
    // Chargements : la barre de menus ne fait que déclencher, l'état (morceau
    // courant, rafraîchissement du mix) reste chez AtelierView — ce composant
    // n'écrit jamais dans `pattern`.
    onLoadPreset?: (p: SongPresetData, keepSynthAndTempo: boolean) => void;
    onLoadBank?: (id: string) => void;
    circleView?: boolean;
  } = $props();

  // Chargement d'un morceau depuis la barre de menus (audit A6 : le bloc
  // preset répétait des commandes déjà présentes dans les menus, et pesait
  // ~230px). Un `<select>` de 34 entrées EST déjà une liste déroulante :
  // la passer en menu ne change rien à l'interaction et coûte zéro pixel.
  // Les catégories deviennent des titres de section, comme les `<optgroup>`
  // qu'elles remplacent.
  let keepSynthAndTempo = $state(false);
  function byCat(cat: string): SongPresetData[] {
    return PRESETS.filter((p) => p.cat === cat);
  }

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
  <!-- Menu « Mode » : remplace la barre de navigation qui vivait au-dessus
       de la barre de menus (audit A1). Coche l'écran courant comme un menu
       XP, plutôt qu'un onglet enfoncé — même information, zéro pixel de
       hauteur en plus. -->
  <div class="menu">
    <button
      class="menu-btn tap44"
      class:on={openMenu === 'mode'}
      onclick={(e) => {
        e.stopPropagation();
        openMenu = openMenu === 'mode' ? '' : 'mode';
      }}>Mode</button
    >
    {#if openMenu === 'mode'}
      <div class="dropdown">
        <button onclick={() => choose(() => onSwitchView?.('atelier'))}>✓ 🥁 Atelier</button>
        <button onclick={() => choose(() => onSwitchView?.('game'))}>&nbsp;&nbsp; 🎮 Mode jeu</button>
        <button
          disabled={!unlocks.has('live')}
          title={unlocks.has('live') ? '' : `Se débloque au niveau ${unlockLevelFor('live')} du Mode jeu`}
          onclick={() => choose(() => onSwitchView?.('live'))}
          >&nbsp;&nbsp; {unlocks.has('live') ? '🎛' : '🔒'} Mode Live</button
        >
      </div>
    {/if}
  </div>
  <div class="menu">
    <button
      class="menu-btn tap44"
      class:on={openMenu === 'file'}
      onclick={(e) => {
        e.stopPropagation();
        openMenu = openMenu === 'file' ? '' : 'file';
      }}>Fichier</button
    >
    {#if openMenu === 'file'}
      <!-- Les morceaux et la banque sont DANS Fichier, pas dans un menu à
           part (audit B7) : un sixième menu de premier niveau refaisait
           passer la barre à deux lignes sur téléphone, soit 30px de chrome
           permanent — pour une entrée qui est de toute façon un « ouvrir ».
           Le menu défile (`.tall`), les 34 morceaux y tiennent. -->
      <div class="dropdown tall">
        <button onclick={() => choose(onReset)}>Nouveau rythme</button>
        <button onclick={() => choose(onImport)}>Ouvrir…</button>
        <button onclick={() => choose(onExport)}>Enregistrer sous…</button>
        <button onclick={() => choose(share)}>Partager par lien</button>
        <button
          class="opt"
          onclick={(e) => {
            // Ne referme PAS le menu : c'est une option du chargement à venir,
            // pas une action — la refermer obligerait à rouvrir pour choisir.
            e.stopPropagation();
            keepSynthAndTempo = !keepSynthAndTempo;
          }}>{keepSynthAndTempo ? '☑' : '☐'} Garder le synthé et le tempo actuels</button
        >
        {#each PRESET_CATEGORIES as cat (cat)}
          <div class="sep">{cat}</div>
          {#each byCat(cat) as p (p.id)}
            <button onclick={() => choose(() => onLoadPreset?.(p, keepSynthAndTempo))}>{p.label}</button>
          {/each}
        {/each}
        <div class="sep">Banque de séquences</div>
        {#if sequenceBank.entries.length === 0}
          <div class="empty">Vide — enregistre une séquence depuis l’onglet Production.</div>
        {:else}
          {#each sequenceBank.entries as e (e.id)}
            <button onclick={() => choose(() => onLoadBank?.(e.id))}>{e.name}</button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
  <div class="menu">
    <button
      class="menu-btn tap44"
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
      class="menu-btn tap44"
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
      class="menu-btn tap44"
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
  <!-- Marqueur d'accès total. N'existe QUE pendant un contournement : zéro
       pixel pour un visiteur normal, donc rien à échanger au titre de la
       règle n°1 du §7.5. Il est ici parce que l'accueil n'est pas l'endroit
       où le doute survient — on est dans l'Atelier quand on se demande si ce
       qu'on voit est bien ce que voient les autres. -->
  {#if unlocks.totalAccess}
    <span class="boss-flag" title={unlocks.totalAccessHint}
      >🔓 accès total{unlocks.totalAccess === 'master' ? ' (master)' : ''}</span
    >
  {/if}
  <!-- Ne restent en accès direct que Annuler/Rétablir (audit A6/B7).
       « 🔗 Partager » est parti : il existait à l'identique dans le menu
       Fichier, et partager un rythme n'est pas un geste qu'on répète — un
       menu est son bon domicile. « 👆 Tap tempo » a déménagé à côté du
       curseur Tempo, dans le bloc preset : il RÈGLE le tempo, sa place est
       contre le contrôle qu'il pilote, pas dans une barre d'outils trois
       blocs plus haut (et un menu lui serait interdit — on ne peut pas
       taper un rythme dans un menu qui se referme).
       Annuler/Rétablir restent ici malgré leur doublon dans le menu
       Édition : sur téléphone il n'y a pas de Ctrl+Z, ce sont les seuls
       accès à un clic. Groupés dans un conteneur `nowrap` pour ne plus
       jamais être séparés l'un de l'autre par un retour à la ligne. -->
  <div class="tools">
    <button class="tool tap44" disabled={!history.canUndo} onclick={() => history.undo()} title="Annuler (Ctrl+Z)">↶</button>
    <button class="tool tap44" disabled={!history.canRedo} onclick={() => history.redo()} title="Rétablir (Ctrl+Y)">↷</button>
  </div>
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
  /* Cible tactile (audit A3) : 20px de haut avant, sous le minimum de 24px.
     Le remplissage vertical suffit — un menu XP garde sa police de 12px. */
  .menu-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-size: var(--xp-size-menu);
    font-weight: 700;
    letter-spacing: var(--xp-ls-menu);
    text-transform: uppercase;
    padding: 9px 11px;
    cursor: pointer;
    color: var(--xp-text);
  }
  .menu-btn.on,
  .menu-btn:hover {
    background: var(--xp-select-blue);
    color: var(--xp-title-text);
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
    font-size: var(--xp-size-body);
    padding: 4px 10px;
    cursor: pointer;
    color: var(--xp-text);
  }
  .dropdown button:hover:not(:disabled) {
    background: var(--xp-select-blue);
    color: var(--xp-title-text);
  }
  .dropdown button:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  /* Le menu Fichier compte 34 morceaux plus la banque : il défile au lieu de
     déborder de l'écran. Hauteur bornée à la moitié du viewport pour qu'on
     voie toujours ce qu'il y a derrière. */
  .dropdown.tall {
    max-height: 50vh;
    overflow-y: auto;
    min-width: 210px;
  }
  /* Reprend le rôle des <optgroup> du sélecteur remplacé. */
  .sep {
    font-size: var(--xp-size-small);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--xp-muted);
    padding: 6px 10px 2px;
    border-top: 1px solid var(--xp-line);
    margin-top: 2px;
  }
  .dropdown .sep:first-child {
    border-top: 0;
    margin-top: 0;
  }
  .empty {
    font-size: 9px;
    color: var(--xp-muted);
    padding: 4px 10px 6px;
    max-width: 210px;
  }
  .dropdown .opt {
    font-family: var(--xp-mono);
  }
  .spacer {
    flex: 1;
  }
  /* Les outils passent à la ligne ENSEMBLE ou pas du tout (audit B7) : avant,
     ↶ et ↷ pouvaient se retrouver de part et d'autre d'un retour à la ligne. */
  .tools {
    display: flex;
    flex-wrap: nowrap;
    gap: 2px;
  }
  /* Lisible sans être criard : c'est un état à connaître, pas une alerte. */
  .boss-flag {
    align-self: center;
    font-size: var(--xp-size-small);
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 2px 6px;
    margin-right: 4px;
    border: 1px dashed var(--xp-line);
    border-radius: 3px;
    color: var(--xp-muted);
    white-space: nowrap;
    cursor: help;
  }
  /* Sur téléphone, les cinq menus + les deux outils ne tiennent sur une seule
     ligne qu'en resserrant les libellés — c'est ce qui supprime la deuxième
     rangée (~36px de chrome permanent). La cible tactile ne bouge pas : seul
     le remplissage HORIZONTAL est réduit, la hauteur reste à 28px. */
  @media (max-width: 460px) {
    .menu-btn {
      padding-left: 6px;
      padding-right: 6px;
    }
    .tool {
      padding-left: 7px;
      padding-right: 7px;
    }
  }
  /* Cible tactile (audit A3) : 19px de haut avant. ↶ et ↷ faisaient 27×19
     alors qu'ils sont utilisés en rafale — `min-width` leur donne aussi une
     largeur décente. */
  .tool {
    font-family: inherit;
    font-size: 9px;
    padding: 6px 10px;
    min-height: 28px;
    min-width: 32px;
    line-height: 1;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-btn-face);
    color: var(--xp-text);
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
    font-size: var(--xp-size-body);
    background: var(--xp-lcd-bg);
    color: var(--xp-accent-amber);
    border: 1px solid var(--xp-accent-amber);
    padding: 5px 8px;
    margin: 0 0 8px;
  }
  /* Chantier tactile (cf. styles/global.css) : les enveloppes invisibles de
     `.tap44` débordent des boutons, donc elles se marchent dessus dès que
     deux commandes sont voisines à 2px — et c'est la dernière du DOM qui
     gagne le point, pas la plus probable. On écarte donc le rythme vertical
     sous pointeur grossier. Aucun dessin ne change : l'espace n'est pas
     dessiné, et sur un téléphone il ne coûte rien puisque la page défile. */
  @media (pointer: coarse) {
    .menubar {
      /* Deux valeurs : à 390px la barre passe à deux rangées, et c'est
         l'écart VERTICAL qui empêche « Aide » de manger la cible de ↶. */
      gap: 18px 8px;
      margin-bottom: 14px;
      padding: 2px 10px;
    }
    .tools {
      gap: 14px;
    }
  }
</style>
