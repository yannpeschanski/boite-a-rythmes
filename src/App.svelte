<script lang="ts">
  // Bascule Atelier / Mode jeu — remplace switchMode() et les 3 écrans de
  // l'original. Le splash devient un simple choix d'entrée : il servait aussi
  // de geste de déverrouillage audio (politique d'autoplay des navigateurs),
  // rôle conservé puisqu'on n'ouvre l'AudioContext qu'au premier clic.
  import { onMount, onDestroy } from 'svelte';
  import AtelierView from './ui/atelier/AtelierView.svelte';
  import GameView from './ui/game/GameView.svelte';
  import LiveView from './ui/live/LiveView.svelte';
  import Diag from './ui/Diag.svelte';
  import { AudioEngine } from './engine/AudioEngine';
  import { game } from './stores/game.svelte';
  import { latence } from './ui/latence.svelte';
  import { sortie } from './ui/sortie.svelte';
  import { pattern } from './stores/pattern.svelte';
  import { loadFromHash } from './stores/share';
  import { unlocks } from './stores/unlocks.svelte';
  import { type LockedModule } from './model/unlocks';

  let view = $state<'splash' | 'atelier' | 'game' | 'live' | 'diag'>('splash');

  /* La première panne JS de la session, ou `null`. Voir le capteur dans
     `onMount` — c'est ce qui rend une erreur du moteur lisible sans console. */
  let panne = $state<string | null>(null);
  let nettoyer: (() => void) | null = null;

  onMount(() => {
    game.load();
    // Le décalage d'entrée vaut pour TOUS les modes (Mode jeu, pad d'écriture
    // de l'Atelier) : il se charge une fois, au démarrage, pas dans l'écran qui
    // s'en sert en premier.
    latence.charger();
    // Même domicile, même moment : le tampon de sortie est lui aussi une
    // propriété de l'appareil, et il doit être posé AVANT le premier
    // AudioContext — celui-ci naît au premier son, donc après ce onMount.
    sortie.charger();
    // ⚠️ LE SEUL BRANCHEMENT de l'aveu de sortie. Le crochet est statique parce
    // que les trois vues construisent chacune leur moteur et qu'il n'y a qu'une
    // sortie : trois branchements, ce serait trois occasions d'en oublier un.
    AudioEngine.onSortieRefusee = (refusee) => (sortie.bloquee = refusee);
    AudioEngine.onLatenceSortie = (baseMs) => (sortie.baseMs = baseMs);
    /* ⚠️ UNE PANNE DU MOTEUR NE DOIT PAS ÊTRE SILENCIEUSE — et elle l'était.
     *
     * Retour de jeu du 2026-09-15 : sur Firefox, « on appuie sur lecture et il
     * ne se passe rien », sans un mot à l'écran. Les deux chemins par lesquels
     * une exception du moteur se perd :
     *   - `togglePlay` fait `await engine.start()` sans `catch` — un rejet part
     *     en `unhandledrejection`, visible dans une console que personne n'a
     *     sur un téléphone ;
     *   - le scheduler tourne dans un `setInterval` — une exception par tick
     *     part en `error`, au même endroit invisible.
     * Deux écouteurs globaux, une seule ligne à l'écran, et le diagnostic
     * devient un aller-retour au lieu de six.
     *
     * On garde la PREMIÈRE panne : c'est celle qui explique, les suivantes n'en
     * sont souvent que l'écho (un tick qui échoue échoue 40 fois par seconde). */
    const noter = (quoi: string) => {
      if (!panne && quoi) panne = quoi.slice(0, 180);
    };
    const surErreur = (e: ErrorEvent) => noter(e.message || String(e.error ?? ''));
    const surRejet = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string } | undefined;
      noter(r?.message ?? String(r ?? ''));
    };
    window.addEventListener('error', surErreur);
    window.addEventListener('unhandledrejection', surRejet);
    nettoyer = () => {
      window.removeEventListener('error', surErreur);
      window.removeEventListener('unhandledrejection', surRejet);
    };
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
    /* ⚠️ `#diag` n'est PAS un contournement de verrou (voir « un seul
       contournement, et il est le pseudo master ») : il n'ouvre aucun module et
       ne touche à aucune progression. C'est un banc d'essai de la SORTIE AUDIO,
       atteint seulement si on tape l'adresse — donc si on me l'a donnée. */
    if (location.hash === '#diag') view = 'diag';
  });

  onDestroy(() => nettoyer?.());

  /* ⚠️ Plus d'écouteur `hashchange` : il n'existait que pour #boss, dont la
     bascule devait prendre effet sans rechargement. Le contournement retiré,
     plus aucun verrou ne change en cours de page — et #mode-live, seul hash
     restant, se lit une fois au montage. */

  // Verrou DUR (arbitrage D2 de Yann, 2026-08-16) : le module n'est pas
  // utilisable tant que le Mode jeu ne l'a pas ouvert. Il reste VISIBLE avec
  // son cadenas et le niveau qui l'ouvre — comme l'original, qui posait un
  // overlay de verrouillage plutôt que d'escamoter le module. Une entrée qui
  // disparaît se lit comme une panne ; une entrée cadenassée se lit comme une
  // suite. « Dur » porte sur l'accès, pas sur la visibilité.
  /* Le concert emprunte le Mode Live et le REND. Sans ce drapeau, la sortie du
     Live retomberait sur l'Atelier — hors du récit, au milieu de l'acte 7. */
  let retourDeScene = $state(false);

  /* ⚠️ CE QUE LA SCÈNE MET SUR LA SURFACE DU LIVE, ou `null` en jeu libre.
   *
   * Le titre vient de l'ACTE et de l'entête de l'étape (« ACTE 7 · LE SET ») ;
   * la ligne vient de la donnée (`EtapeScene.surScene`). Lu ici plutôt que dans
   * `LiveView` : la vue ne connaît pas le récit, et c'est ce qui lui permet de
   * rester le même écran pour tout le monde. */
  const sceneLive = $derived.by(() => {
    if (!retourDeScene) return null;
    const e = game.scene;
    if (!e) return null;
    return { titre: `ACTE ${game.acteActif} · ${e.entete}`, consigne: e.surScene };
  });

  function enter(v: 'atelier' | 'game' | 'live', mod?: LockedModule) {
    if (mod && !unlocks.has(mod)) return;
    view = v;
  }
</script>

{#if view === 'diag'}
  <Diag onExit={() => (view = 'atelier')} />
{:else if view === 'live'}
  <!-- ⚠️ D'où l'on vient décide où l'on retourne. Le Mode Live rendait TOUJOURS
       la main à l'Atelier ; monter sur scène pendant le concert et redescendre
       dans l'Atelier ferait sortir du récit au milieu de l'acte 7. -->
  <LiveView
    scene={sceneLive}
    onExit={() => {
      if (retourDeScene) {
        retourDeScene = false;
        game.terminerScene();
        view = 'game';
      } else {
        view = 'atelier';
      }
    }}
  />
{:else if view === 'splash'}
  <div class="splash">
    <h1>Face B</h1>
    <!-- ⚠️ Ce qui est VERROUILLÉ ne s'affiche pas — arbitrage de Yann après
         une partie complète (« on devrait masquer tout ce qui est
         verrouillé »). Ça renverse la décision de 2026-08-16, qui gardait les
         entrées cadenassées visibles pour qu'elles se lisent « comme une
         suite » plutôt que comme une panne. Le verdict d'un joueur réel prime :
         un écran d'accueil où deux entrées sur trois sont barrées présente le
         jeu par ce qu'on ne peut PAS faire. -->
    <div class="choices">
      <!-- ⚠️ AUCUN sous-titre, et c'est délibéré. Les trois glosaient un bouton
           qui se suffit. Le dernier à tomber est « Manette paysage » sous le Mode
           Live (2026-09-14) : l'horizontale n'a pas besoin d'être annoncée AVANT,
           parce que la porte elle-même la dit — « 📱 TOURNE TON TÉLÉPHONE », avec
           un « ← Retour ». Une ligne sous un bouton devrait apprendre quelque
           chose qu'on ne peut pas deviner, et celle-ci doublait un écran qui
           existe déjà. -->
      {#if unlocks.has('atelier')}
        <button class="big" onclick={() => enter('atelier', 'atelier')}>🥁 Atelier</button>
      {/if}
      <!-- ⚠️ Pas de COMPTE ici. « 78 niveaux » comptait le réservoir tout
           entier — la carrière n'en cite que 38, et le reste n'a même pas de
           nom dans le jeu — et « huit actes » annonçait la longueur du récit à
           qui n'en a pas encore vu un seul. C'est la règle qui a déjà retiré le
           « / 41 » du titre de fenêtre et les actes non atteints du carnet :
           rien de non atteint ne s'affiche, et surtout pas un total. -->
      <button class="big" onclick={() => enter('game')}>🎮 Jouer</button>
      {#if unlocks.has('live')}
        <button class="big" onclick={() => enter('live', 'live')}>🎛 Mode Live</button>
      {/if}
    </div>
    <!-- ⚠️ L'accès total reste ANNONCÉ, même s'il n'a plus qu'une porte : un
         doute sur l'état d'un contournement coûte plus cher que le
         contournement (« le boss mode est toujours activé j'ai l'impression »). -->
    {#if unlocks.totalAccess}
      <p class="acces-total">🔓 Accès total — <code>{unlocks.totalAccessHint}</code></p>
    {/if}
    <!-- Le stockage refusé était SILENCIEUX : les modules se reverrouillaient
         à chaque visite et rien ne disait pourquoi. Un verrou qui revient sans
         explication se lit comme une panne du jeu, pas comme un réglage du
         navigateur. -->
    {#if game.persistanceRefusee}
      <p class="sansmemoire">
        ⚠ Ce navigateur refuse d’enregistrer (navigation privée ?). Le jeu marche, mais la
        progression sera perdue en fermant l’onglet.
      </p>
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
    <!-- ⚠️ Une barre de bascule à UNE entrée ne bascule vers rien — et cette
         entrée est celle de l'écran où on se trouve déjà. Tant que le récit
         n'a rien ouvert (actes 0 et 1), elle disparaît : même règle que la
         barre d'onglets de l'Atelier, et même raison — c'est un indice de ce
         qui reste fermé, sans dire quoi. Elle revient d'elle-même avec
         l'Atelier, qui est la première porte que le récit ouvre. -->
    {#if unlocks.has('atelier') || unlocks.has('live')}
      <nav class="switcher">
        {#if unlocks.has('atelier')}
          <button onclick={() => enter('atelier', 'atelier')}>🥁 Atelier</button>
        {/if}
        <button class="on" onclick={() => enter('game')}>🎮 Jouer</button>
        {#if unlocks.has('live')}
          <button onclick={() => enter('live', 'live')}>🎛 Mode Live</button>
        {/if}
      </nav>
    {/if}
    <GameView
      onGoAtelier={() => (view = 'atelier')}
      onGoScene={() => {
        retourDeScene = true;
        view = 'live';
      }}
    />
  {/if}
{/if}

<!-- ⚠️ Un refus de sortie était SILENCIEUX : le bouton ▶ s'allumait, rien ne
     sortait, et la console restait vide (voir `reprendreSortie`). Le bandeau
     vit ici, hors des trois vues, parce que la sortie est unique — et il dit le
     geste qui répare, pas la cause, qui n'apprend rien au joueur. -->
{#if sortie.bloquee}
  <p class="sortie-bloquee" role="status">
    ⚠ Le navigateur a refusé d’ouvrir le son. Appuie de nouveau sur ▶.
  </p>
{:else if panne}
  <!-- Le message BRUT, pas une reformulation : c'est lui qu'on veut pouvoir
       lire à voix haute depuis un téléphone, et le reformuler le rendrait
       inutile. -->
  <p class="sortie-bloquee" role="status">⚠ Le son a échoué — {panne}</p>
{/if}

<style>
  /* Amber, jamais `--xp-lcd-dim` : ce vert-là est fait pour un segment sur fond
     d'afficheur noir, il tombe à 1,5:1 sur du chrome (CLAUDE.md). */
  .sortie-bloquee {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 50;
    margin: 0;
    padding: 6px 10px;
    padding-top: calc(6px + env(safe-area-inset-top, 0px));
    text-align: center;
    background: var(--xp-accent-amber-soft);
    color: var(--xp-accent-amber);
    border-bottom: 1px solid var(--xp-line);
    font-size: var(--xp-size-body);
  }

  .splash {
    text-align: center;
    padding: 48px 12px;
    color: var(--xp-title-text);
    text-shadow: 0 2px 6px rgba(0, 0, 40, 0.5);
  }
  h1 {
    font-size: 34px;
    margin: 0 0 24px;
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
  /* Verrouillé : le relief sortant disparaît (rien à enfoncer) et le bouton
     s'éteint, mais il garde sa taille et sa place — c'est ce qui le fait lire
     comme « pas encore » et non comme « absent ». */
  .splash .sansmemoire {
    margin: 10px auto 0;
    max-width: 42ch;
    font-size: var(--xp-size-body);
    color: var(--xp-accent-amber);
    opacity: 0.95;
  }
  .splash .acces-total {
    margin: 10px 0 0;
    font-size: var(--xp-size-body);
    opacity: 0.95;
  }
  .splash .acces-total code {
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
    /* Même traitement que les onglets de l'Atelier : c'est la même fonction,
       naviguer entre les grandes parties de l'appli. */
    font-size: var(--xp-size-tab);
    font-weight: 700;
    letter-spacing: var(--xp-ls-tab);
    text-transform: uppercase;
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
