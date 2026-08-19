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
  <div class="menu align-right">
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
        <!-- Le marqueur d'accès total vivait dans la barre elle-même, sur une
             ligne à lui. Il en sort : c'était du chrome PERMANENT pour une
             information qu'on consulte une fois, quand le doute survient. Le
             raisonnement qui le mettait dans l'Atelier plutôt que sur l'accueil
             tient toujours — c'est ici qu'on se demande si ce qu'on voit est
             bien ce que voient les autres — mais un menu est le bon domicile
             d'une information qu'on va CHERCHER. -->
        {#if unlocks.totalAccess}
          <div class="sep">Session</div>
          <span class="info" title={unlocks.totalAccessHint}
            >🔓 Accès total{unlocks.totalAccess === 'master' ? ' (master)' : ''}</span
          >
        {/if}
      </div>
    {/if}
  </div>

  <div class="spacer"></div>
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
    /* UNE ligne, toujours. `wrap` laissait la barre passer à deux rangées dès
       que la place manquait — une rangée entière de chrome permanent en haut
       de chaque écran, pour cinq libellés courts et deux flèches. C'est le
       remplissage horizontal qui absorbe l'étroitesse (requête média plus
       bas), plus un retour à la ligne. */
    flex-wrap: nowrap;
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
  /* Le dernier menu s'ancre à DROITE : posée à gauche de son libellé, sa liste
     de 190px partait au-delà du bord de l'écran sur téléphone et se faisait
     couper. Le défaut existait déjà ; il est devenu visible en ajoutant une
     entrée à ce menu-là. */
  .align-right .dropdown {
    left: auto;
    right: 0;
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
  /* Une ligne d'INFORMATION dans un menu : pas un bouton, donc ni survol ni
     curseur de clic. Alignée sur les entrées voisines pour ne pas casser la
     colonne, mais en retrait — on la lit, on ne la choisit pas. */
  .info {
    display: block;
    padding: 7px 10px;
    font-size: var(--xp-size-small);
    color: var(--xp-muted);
    cursor: help;
    white-space: nowrap;
  }
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
    /* Sur téléphone, les cinq menus + les deux outils ne tiennent sur une seule
     ligne qu'en resserrant les libellés — c'est ce qui supprime la deuxième
     rangée (~36px de chrome permanent). La cible tactile ne bouge pas : seul
     le remplissage HORIZONTAL est réduit, la hauteur reste à 28px. */
  /* Sur téléphone, les cinq menus et les deux flèches doivent tenir sur UNE
     ligne — c'est le seul endroit où on peut prendre de la place, puisque les
     libellés eux-mêmes sont ceux de la maquette et que le corps de 9px fait
     partie de la grammaire. On resserre donc le remplissage horizontal et on
     supprime l'écart : les libellés en capitales espacées restent séparables à
     l'œil sans blanc entre eux, c'est justement ce que l'interlettrage fait. */
  @media (max-width: 460px) {
    .menubar {
      gap: 0;
      padding-left: 2px;
      padding-right: 2px;
    }
    .menu-btn {
      padding-left: 5px;
      padding-right: 5px;
    }
    .tool {
      padding-left: 4px;
      padding-right: 4px;
      min-width: 0;
    }
  }
  /* Le dernier cran, pour les écrans de 320px (iPhone SE de première
     génération et compagnie) : sans lui la ligne déborde de 19px, et comme la
     barre ne se replie plus, déborder veut dire pousser la page entière.
     Trois pixels de remplissage suffisent à la faire rentrer — au-delà, il
     faudrait toucher aux libellés ou au corps, c'est-à-dire à la maquette. */
  @media (max-width: 360px) {
    .menu-btn {
      padding-left: 3px;
      padding-right: 3px;
    }
  }
  /* Cible tactile (audit A3) : 19px de haut avant. ↶ et ↷ faisaient 27×19
     alors qu'ils sont utilisés en rafale — `min-width` leur donne aussi une
     largeur décente. */
  /* Annuler/Rétablir parlaient une troisième langue dans cette barre : les
     menus sont du texte plat, le marqueur d'accès était un cadre pointillé, et
     ces deux-là des poussoirs biseautés avec leur dégradé. Une barre de menus
     n'a qu'un seul registre — du libellé posé sur la face du chrome, qui
     s'allume au survol. Ils le rejoignent : même famille, même corps, même
     surlignage bleu. Le biseau reste réservé à ce qui est VRAIMENT un bouton
     ailleurs sur l'écran ; ici il faisait du bruit. */
  .tool {
    font-family: inherit;
    font-size: var(--xp-size-menu);
    letter-spacing: var(--xp-ls-menu);
    padding: 9px 10px;
    min-width: 30px;
    line-height: 1;
    border: none;
    background: none;
    color: var(--xp-text);
    cursor: pointer;
  }
  .tool:hover:not(:disabled),
  .tool:active:not(:disabled) {
    background: var(--xp-select-blue);
    color: var(--xp-title-text);
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
      margin-bottom: 14px;
    }
    /* L'écart ne subsiste QU'ICI. Entre deux libellés de menu, une frappe qui
       dérape ouvre le mauvais menu : on le referme, il ne s'est rien passé.
       Entre Annuler et Rétablir, elle défait ce qu'on venait de refaire — ce
       sont les deux seules commandes de la barre dont l'erreur coûte quelque
       chose, et les deux seules qui gardent donc du blanc autour d'elles.
       L'écart de RANGÉE a disparu avec les rangées : la barre ne se replie
       plus. */
    .tools {
      gap: 8px;
    }
  }
</style>
