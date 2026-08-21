<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { game, LEVELS, tierForAttempts, GAME_DRUM_ROWS } from '../../stores/game.svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { GameDrumRowName } from '../../model/presets/levels';
  import {
    PARFAIT_MS,
    TOLERANCE_MS,
    ecartAuClic,
    medianeDesEcarts,
    type ExerciseKind,
  } from '../../model/exercises';
  import { latence } from '../latence.svelte';
  import XpWindow from '../xp/XpWindow.svelte';

  let { onGoAtelier }: { onGoAtelier?: () => void } = $props();

  // État lu EN DIRECT par le moteur à chaque tick (comme pattern.snapshot()
  // pour l'Atelier), pas figé une fois pour toutes au clic sur ▶ — sinon,
  // modifier sa proposition PENDANT « Écouter ma version » continuerait de
  // jouer l'ancien état : le son se décale de ce qui est affiché sur la
  // grille. buildState() est bon marché (quelques tableaux de 32 cases), pas
  // de souci à le reconstruire à chaque tick (25 ms).
  let playingWhat = $state<'' | 'target' | 'guess' | 'intrus'>('');
  const engine = new AudioEngine(() => game.buildState(playingWhat || 'target'));
  let showMap = $state(false);
  let showBag = $state(false);

  // Curseur visuel : consommé à chaque frame contre l'horloge audio, comme
  // dans l'Atelier (AtelierView.svelte) — sans cette boucle, aucune case ne
  // s'illumine pendant la lecture et il est impossible de suivre le rythme.
  let playhead = $state<Record<GameDrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as GameDrumRowName] = ev.col;
      // Repère temporel du pas courant du kick : c'est contre lui que se
      // mesure l'écart d'une frappe.
      if (ev.name === 'kick' && ev.col !== dernierKickVu && game.target.kick[ev.col] > 0) {
        dernierKickVu = ev.col;
        // ⚠️ `ev.time` (horloge audio, temps PROGRAMMÉ du coup) et non l'instant
        // où cette frame le consomme : rAF ne tourne qu'à 60 Hz et ne passe
        // jamais pile sur le coup, ce qui ajoutait jusqu'à 16 ms d'erreur à
        // chaque mesure — sur une tolérance de 130, ce n'est pas du bruit.
        dernierKickAudio = ev.time;
      }
    }
    raf = requestAnimationFrame(loop);
  }
  function resetPlayhead() {
    playhead = { kick: -1, snare: -1, hat: -1 };
    // Oublier l'ancre avec le curseur : sans ça, la première frappe du tour
    // suivant se mesurerait contre un repère vieux de plusieurs secondes.
    dernierKickVu = -1;
  }

  /* « Jouer en rythme » — mesurer l'écart au COUP, sur l'horloge du SON.
   *
   * Quatre façons de se tromper, écartées ici. Les deux premières viennent de
   * l'essai des pilotes, les deux suivantes du retour de Yann (« doute sur le
   * temps de réponse entre le toucher et la remontée dans le système ») :
   *
   * 1. Quantifier puis comparer les cases. Une frappe posée 80 ms trop tard
   *    tombe encore dans le bon pas : elle serait déclarée parfaite, alors
   *    qu'elle s'entend en retard. On garde donc la DISTANCE, pas la case.
   * 2. Mesurer contre le pas courant quel qu'il soit. Sur une boucle à 8 pas
   *    qui porte 3 kicks, cinq pas sur huit sont silencieux : frapper sur un
   *    silence bien aligné aurait donné 100 %. L'ancre est donc le dernier pas
   *    ACTIF du kick, et l'intervalle est celui qui le sépare du prochain pas
   *    actif — pas la durée d'un pas.
   * 3. Dater le coup de référence avec `performance.now()` au moment où la
   *    frame le consomme. rAF ne tourne qu'à 60 Hz : jusqu'à 16 ms d'erreur
   *    ajoutés à chaque mesure. On prend `ev.time`, le temps AUDIO programmé.
   * 4. Dater la frappe au moment où le gestionnaire s'exécute. Entre le
   *    contact du doigt et l'appel du code il y a la file d'événements du
   *    navigateur, et elle n'est pas régulière. `event.timeStamp` porte
   *    l'instant où le navigateur a REÇU l'événement : la différence avec
   *    `performance.now()` est exactement le retard de remontée, et on le
   *    retranche.
   *
   * Reste ce qu'aucun code ne peut voir : la latence de la dalle tactile
   * elle-même. D'où `decalageMedian`, affiché à côté de la note — un biais
   * franc et constant est de la latence, pas un défaut de placement.
   */
  let dernierKickVu = $state(-1);
  let dernierKickAudio = 0;
  function dureeDunPas(): number {
    return 60 / game.tempo / Math.max(1, game.subdiv.kick / 4);
  }
  function frapper(e?: Event) {
    if (playingWhat !== 'target' || !enregistre || enPrecompte || dernierKickVu < 0) return;
    const maintenant = engine.audioTime();
    if (maintenant === null) return;
    // Retard de remontée de l'événement, retranché (point 4 ci-dessus).
    const retard = e && e.timeStamp > 0 ? Math.max(0, (performance.now() - e.timeStamp) / 1000) : 0;
    const n = game.subdiv.kick;
    // Combien de pas jusqu'au prochain kick (en tournant : le dernier kick de
    // la boucle enchaîne sur le premier).
    let pas = 1;
    while (pas <= n && game.target.kick[(dernierKickVu + pas) % n] === 0) pas++;
    const intervalle = pas * dureeDunPas();
    // Le décalage mesuré au calibrage, retranché comme le retard de remontée :
    // c'est ce que la chaîne d'entrée ajoute et qu'aucune API ne déclare.
    const ecoule = maintenant - retard - latence.ms / 1000 - dernierKickAudio;
    // Écart signé au kick le plus proche : en retard (positif) ou en avance sur
    // le suivant (négatif). Le signe compte — voir `decalageMedian`.
    const ecart = ecoule > intervalle / 2 ? ecoule - intervalle : ecoule;
    // Position dans la mesure, pour afficher la séquence réellement jouée.
    const visee = ecart >= 0 ? dernierKickVu : (dernierKickVu + pas) % n;
    const phase = (visee + ecart / dureeDunPas()) / n;
    game.enregistrerFrappe(ecart * 1000, ((phase % 1) + 1) % 1);
  }

  onMount(() => {
    // `latence.charger()` est fait une fois au démarrage (App.svelte) : le
    // réglage vaut pour tous les modes, pas seulement pour celui-ci.
    raf = requestAnimationFrame(loop);
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    clearInterval(relance);
    engine.stop();
  });

  async function play(which: 'target' | 'guess' | 'intrus') {
    if (playingWhat === which) {
      engine.stop();
      playingWhat = '';
      resetPlayhead();
      return;
    }
    engine.stop();
    resetPlayhead();
    if (which === 'target') game.loopPlays++;
    else game.guessPlays++;
    // Avant start() : le tout premier tick doit déjà lire la bonne cible via
    // le getState() ci-dessus, sinon la toute première fenêtre programmée
    // (jusqu'à 0.25s) jouerait encore l'ancienne.
    playingWhat = which;
    await engine.start();
  }

  function stopAll() {
    engine.stop();
    playingWhat = '';
    enPrecompte = false;
    enregistre = false;
    resetPlayhead();
  }

  // Son de victoire + flash des cases (original showGameResult, l. 8558-8564,
  // jamais porté — PLAN.md §7.3). `game.solved` ne peut passer à true QUE
  // par CET appel : le bouton ✓ Vérifier est désactivé dès que solved (voir
  // plus bas), donc pas besoin de retenir l'état "avant" pour détecter la
  // victoire.
  let winFlash = $state(false);
  function triggerWinFlash() {
    winFlash = true;
    setTimeout(() => (winFlash = false), 1100);
  }

  // Un raté ne laisse AUCUNE trace pour « intrus » et « jouer » : il n'y a pas
  // de case à verrouiller, donc rien à l'écran ne dirait que la réponse a été
  // examinée. Sans ce drapeau, cliquer sur ✓ Vérifier semble ne rien faire.
  let echec = $state(false);
  const MSG_ECHEC: Record<ExerciseKind, string> = {
    reproduire: 'Pas encore. Les cases justes sont verrouillées ✓ — reprends les autres.',
    completer: 'Pas encore. Les cases justes du temps manquant sont verrouillées ✓.',
    intrus: 'Ce n’est pas celle-là. Réécoute les quatre mesures.',
    jouer: 'Trop loin du temps. Relance la boucle et repose tes frappes.',
  };

  function verify() {
    stopAll();
    const ok = game.verify();
    echec = !ok;
    if (game.solved) {
      engine.playWinChime(tierForAttempts(game.attempts));
      triggerWinFlash();
    }
  }

  /* « Jouer » — précompte, puis on repart de zéro frappe.
   *
   * Le précompte est le geste standard de n'importe quel logiciel
   * d'enregistrement, et il manquait : sans lui la boucle démarrait sur un
   * joueur qui n'a pas encore le tempo, et les deux ou trois premières frappes
   * étaient perdues d'avance. Quatre clics au tempo du niveau — c'est
   * `engine.countIn`, écrit pour l'enregistrement du direct et réutilisé tel
   * quel plutôt que redécoupé ici.
   *
   * Relancer efface les frappes du tour précédent (sinon la justesse
   * mélange deux essais) ; ARRÊTER ne les efface pas — on veut pouvoir
   * stopper puis vérifier.
   */
  let enPrecompte = $state(false);
  let clicPrecompte = $state(0);
  /* Écouter n'est pas jouer.
   *
   * Le premier essai du niveau 37 était trop dur pour une raison qui n'a rien à
   * voir avec la précision : on demandait de reproduire À L'OREILLE un rythme
   * qu'on n'avait jamais entendu, dès la première mesure. Écouter la boucle
   * autant qu'on veut d'abord, puis armer, c'est ce que fait n'importe qui
   * devant un instrument. `enregistre` sépare les deux : même lecture, mais les
   * frappes ne comptent que dans le second cas.
   */
  let enregistre = $state(false);

  function ecouterBoucle() {
    if (playingWhat === 'target') {
      stopAll();
      return;
    }
    enregistre = false;
    play('target');
  }

  async function toggleJouer() {
    if ((playingWhat === 'target' && enregistre) || enPrecompte) {
      if (playingWhat === 'target') play('target');
      enPrecompte = false;
      enregistre = false;
      return;
    }
    stopAll();
    game.reinitialiserFrappes();
    echec = false;
    enPrecompte = true;
    clicPrecompte = 0;
    await engine.countIn((beat) => (clicPrecompte = beat));
    // Un Stop pendant le précompte doit rester un Stop : sans ce test, la
    // boucle démarrerait quand même quatre temps plus tard.
    if (!enPrecompte) return;
    enPrecompte = false;
    enregistre = true;
    play('target');
  }

  /* ---- Calibrage du décalage d'entrée ----
   *
   * Un métronome nu, une douzaine de clics, et on compare les frappes aux temps
   * PROGRAMMÉS de ces clics. Aucune estimation de navigateur ne remplace cette
   * mesure : WebKit ne déclare pas `outputLatency`, et personne ne déclare la
   * latence d'entrée d'une dalle tactile.
   */
  /* ⚠️ Le métronome CONTINUE tant que le panneau est ouvert.
   *
   * La première version programmait une salve unique de douze clics à
   * l'ouverture, puis jetait EN SILENCE toute frappe hors de cette fenêtre de
   * 7 secondes. Le temps de lire la consigne, la fenêtre était passée : le
   * compteur restait à zéro et rien à l'écran ne disait pourquoi. Retour de
   * Yann : « je n'arrive pas à faire fonctionner le réglage de latence ».
   *
   * Les salves s'enchaînent donc bout à bout (`apresQuoi`), sans rupture de
   * phase : la grille `debut + n × intervalle` reste vraie du début à la fin, et
   * il n'y a plus de « hors fenêtre » à part avant le tout premier clic — cas
   * qui, lui, est DIT au lieu d'être ignoré.
   */
  const CLICS_PAR_SALVE = 8;
  const BPM_CALIBRAGE = 100;
  const FRAPPES_MINIMUM = 6;
  let calibrage = $state(false);
  let calibrageEcarts = $state<number[]>([]);
  let calibrageAttente = $state(false); // le métronome n'a pas encore commencé
  let calibrageDebut = 0;
  let calibrageIntervalle = 0;
  let calibrageFin = 0;
  let relance = 0;

  async function ouvrirCalibrage() {
    stopAll();
    calibrage = true;
    calibrageEcarts = [];
    calibrageAttente = true;
    const m = await engine.metronome(CLICS_PAR_SALVE, BPM_CALIBRAGE);
    if (!calibrage) return; // fermé pendant la reprise du contexte
    calibrageDebut = m.debut;
    calibrageIntervalle = m.intervalle;
    calibrageFin = m.fin;
    // Réarme une salve avant que la précédente ne s'épuise. Un intervalle
    // d'avance suffit : le scheduling est bon marché et l'horloge audio ne
    // dérive pas.
    clearInterval(relance);
    relance = setInterval(async () => {
      const t = engine.audioTime();
      if (!calibrage || t === null) return;
      if (calibrageAttente && t >= calibrageDebut) calibrageAttente = false;
      if (t > calibrageFin - 2 * calibrageIntervalle) {
        const suite = await engine.metronome(CLICS_PAR_SALVE, BPM_CALIBRAGE, calibrageFin);
        if (calibrage) calibrageFin = suite.fin;
      }
    }, 300) as unknown as number;
  }

  function fermerCalibrage() {
    calibrage = false;
    calibrageAttente = false;
    clearInterval(relance);
  }

  function frapperCalibrage(e?: Event) {
    const maintenant = engine.audioTime();
    if (maintenant === null || !calibrage) return;
    const retard = e && e.timeStamp > 0 ? Math.max(0, (performance.now() - e.timeStamp) / 1000) : 0;
    const t = maintenant - retard;
    // Avant le premier clic : on ne jette pas la frappe en silence, on le dit.
    if (t < calibrageDebut - calibrageIntervalle / 2) {
      calibrageAttente = true;
      return;
    }
    calibrageAttente = false;
    // Écart au clic le plus proche : la frappe est datée, les clics aussi. Le
    // calcul vit dans model/exercises.ts — une erreur de signe ici corrigerait
    // la latence à l'envers, et c'est exactement le genre de faute qu'on ne
    // voit pas en relisant.
    calibrageEcarts = [...calibrageEcarts, ecartAuClic(t, calibrageDebut, calibrageIntervalle)];
  }

  const calibrageMediane = $derived(medianeDesEcarts(calibrageEcarts));

  function validerCalibrage() {
    // Additif : les frappes du calibrage sont déjà corrigées par le réglage en
    // place, leur médiane est donc ce qu'il RESTE à corriger.
    latence.affiner(calibrageMediane);
    fermerCalibrage();
  }

  // Un seul point d'entrée vers un niveau : le drapeau d'échec est local à la
  // vue, il ne se remettrait pas à zéro tout seul en changeant de niveau.
  function allerAuNiveau(index: number) {
    stopAll();
    echec = false;
    game.startLevel(index);
  }

  /* La barre d'espace frappe aussi : sur un clavier, viser un pad à la souris
   * ajoute une latence de visée à ce qu'on mesure — et ce qu'on mesure ici est
   * précisément une latence. */
  function surTouche(e: KeyboardEvent) {
    if (ex !== 'jouer' || e.code !== 'Space' || e.repeat) return;
    if (calibrage) {
      e.preventDefault();
      frapperCalibrage(e);
      return;
    }
    if (!enregistre) return;
    e.preventDefault();
    frapper(e);
  }

  function saveToAtelier() {
    pattern.replace(game.toAtelierState());
    onGoAtelier?.();
  }

  const lvl = $derived(game.level);
  const ex = $derived(lvl.exercise);
  // À vue, le guide montre le motif ; à l'oreille il ne montre que la grille
  // vide et le curseur. Jamais les deux canaux ensemble — voir jouerIndice.
  const montrerLeMotif = $derived(lvl.jouerIndice === 'lecture');

  // Verdict d'une frappe, pour la couleur du repère sur la séquence jouée.
  // Mêmes seuils que la note : ce qu'on voit et ce qui est compté sont la même
  // chose, sans quoi une frappe verte pourrait rapporter zéro.
  function verdict(ecartMs: number): 'parfait' | 'dedans' | 'dehors' {
    const a = Math.abs(ecartMs);
    if (a <= PARFAIT_MS) return 'parfait';
    return a < TOLERANCE_MS ? 'dedans' : 'dehors';
  }
  const rowLabels: Record<GameDrumRowName, string> = { kick: 'Kick', snare: 'Snare', hat: 'Hat' };

  // La mesure à remplir, en Set : la grille interroge l'appartenance à chaque
  // case, et un `includes` sur un tableau le referait à chaque rendu.
  const zone = $derived.by(() => {
    const out: Record<GameDrumRowName, Set<number>> = { kick: new Set(), snare: new Set(), hat: new Set() };
    for (const n of GAME_DRUM_ROWS) for (const c of game.zoneACompleter[n] ?? []) out[n].add(c);
    return out;
  });

  /* Quelle mesure passe, pendant la lecture des quatre de « l'intrus ».
   * Le curseur court sur la grille fabriquée (4 mesures mises bout à bout) :
   * une division par la longueur d'UNE mesure suffit à la retrouver. */
  const mesureEnCours = $derived(
    playingWhat === 'intrus' && playhead.kick >= 0
      ? Math.floor(playhead.kick / Math.max(1, game.subdiv.kick))
      : -1,
  );
</script>

<!-- ÉTAPE 5 : data-theme="noir" retiré. Le Mode jeu avait son propre
     thème sombre ; il parle désormais la langue commune. -->
<svelte:window onkeydown={surTouche} />

<div class="game">
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
        <button class="player" onclick={() => game.clearPseudo()} title="Changer de joueur">
          👤 {game.pseudo}
        </button>
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
                allerAuNiveau(l.id - 1);
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

      <!-- Le transport dit ce que le VERBE demande d'écouter : les quatre
           mesures pour l'intrus, la boucle à suivre pour « jouer », la cible et
           sa propre version pour les deux exercices de grille. -->
      <div class="transport">
        {#if ex === 'intrus'}
          <button class="xp-btn" onclick={() => play('intrus')}>
            {playingWhat === 'intrus' ? '■ Stop' : '🔊 Écouter les 4 mesures'}
          </button>
        {:else if ex === 'jouer'}
          <button class="xp-btn" onclick={ecouterBoucle}>
            {playingWhat === 'target' && !enregistre ? '■ Stop' : '🔊 Écouter la boucle'}
          </button>
          <button class="xp-btn rec" onclick={toggleJouer}>
            {(playingWhat === 'target' && enregistre) || enPrecompte ? '■ Stop' : '⏺ Jouer (précompte)'}
          </button>
          <button class="xp-btn" disabled={game.frappes.length === 0} onclick={() => game.reinitialiserFrappes()}>
            ↺ Effacer
          </button>
          <button class="xp-btn" onclick={ouvrirCalibrage}>
            🎚 Latence{latence.ms ? ` (${latence.ms > 0 ? '+' : ''}${latence.ms} ms)` : ''}
          </button>
        {:else}
          <button class="xp-btn" onclick={() => play('target')}>
            {playingWhat === 'target'
              ? '■ Stop'
              : ex === 'completer'
                ? '🔊 Écouter la boucle entière'
                : '🔊 Écouter le rythme à trouver'}
          </button>
          <button class="xp-btn" onclick={() => play('guess')}>
            {playingWhat === 'guess' ? '■ Stop' : '🎧 Écouter ma version'}
          </button>
        {/if}
        <button
          class="xp-btn primary"
          disabled={game.solved || game.revealed || (ex === 'intrus' && game.intrusChoix === null)}
          onclick={verify}
        >
          ✓ Vérifier
        </button>
      </div>

      {#if echec && !game.solved && !game.revealed}
        <p class="echec">✗ {MSG_ECHEC[ex]}</p>
      {/if}

      {#if ex === 'intrus'}
        <!-- Aucune grille : l'exercice n'a rien à manipuler. Quatre boutons,
             et le curseur de lecture qui dit où on en est — sans lui, compter
             les mesures à l'oreille devient l'exercice, ce qui n'est pas la
             question posée. -->
        <div class="intrus">
          <p class="consigne">Laquelle des quatre mesures est différente&nbsp;?</p>
          <div class="choix">
            {#each { length: 4 } as _, m (m)}
              <button
                class="xp-btn choix-btn tap44-y"
                class:actif={game.intrusChoix === m}
                class:en-cours={mesureEnCours === m}
                class:bonne={(game.solved || game.revealed) && game.intrusReponse === m}
                disabled={game.solved || game.revealed}
                onclick={() => {
                  game.intrusChoix = m;
                  echec = false;
                }}
              >
                Mesure {m + 1}
              </button>
            {/each}
          </div>
        </div>
      {:else if ex === 'jouer' && calibrage}
        <!-- Calibrage : un métronome nu, et on compare les frappes aux temps
             PROGRAMMÉS des clics. Aucune estimation de navigateur ne remplace
             cette mesure — WebKit ne déclare pas `outputLatency`, et personne ne
             déclare la latence d'entrée d'une dalle tactile. -->
        <div class="jouer calibrage">
          <p class="consigne">
            Le métronome tourne <strong>en continu</strong> : prends ton temps, puis tape
            sur le pad à chaque clic. Ne cherche pas à bien faire — on mesure le retard
            de ton appareil, pas ton sens du rythme. Il faut {FRAPPES_MINIMUM} frappes.
          </p>
          <button class="pad" onpointerdown={frapperCalibrage} aria-label="Frapper pour calibrer">
            {#if calibrageAttente}
              le métronome démarre…
            {:else if calibrageEcarts.length < FRAPPES_MINIMUM}
              TAPE SUR LES CLICS
            {:else}
              C’EST BON — tu peux appliquer
            {/if}
          </button>
          <div class="jauge" role="meter" aria-valuenow={calibrageEcarts.length} aria-valuemin="0" aria-valuemax={FRAPPES_MINIMUM}>
            <div class="barre" style:width="{Math.min(100, (calibrageEcarts.length / FRAPPES_MINIMUM) * 100)}%"></div>
          </div>
          <p class="chiffres">
            {calibrageEcarts.length} frappe{calibrageEcarts.length > 1 ? 's' : ''} — il en faut
            {FRAPPES_MINIMUM}
            {#if calibrageEcarts.length >= FRAPPES_MINIMUM}
              — décalage mesuré {calibrageMediane > 0 ? '+' : ''}{calibrageMediane}&nbsp;ms
            {/if}
            <br />
            <span class="muted">
              Réglage actuel {latence.ms > 0 ? '+' : ''}{latence.ms}&nbsp;ms · le navigateur en
              déclare {engine.latenceSortieMs()}&nbsp;ms
            </span>
          </p>
          <div class="footer-btns">
            <button
              class="xp-btn primary"
              disabled={calibrageEcarts.length < FRAPPES_MINIMUM}
              onclick={validerCalibrage}
            >
              ✓ Appliquer {calibrageMediane > 0 ? '+' : ''}{calibrageMediane}&nbsp;ms
            </button>
            <button class="xp-btn" onclick={() => (calibrageEcarts = [])}>↺ Effacer mes frappes</button>
            <button class="xp-btn" onclick={() => { latence.regler(0); fermerCalibrage(); }}>
              Remettre à zéro
            </button>
            <button class="xp-btn" onclick={fermerCalibrage}>Fermer</button>
          </div>
        </div>
      {:else if ex === 'jouer'}
        <!-- UN SEUL des deux canaux, jamais les deux (voir jouerIndice) :
             montrer la grille pendant que le kick sonne ne demanderait que de
             suivre un point lumineux. À l'oreille le guide reste vide ; à vue
             il montre le motif et c'est le kick qui se tait. -->
        <div class="jouer">
          <div class="guide" style:--cols={game.subdiv.kick}>
            {#each { length: game.subdiv.kick } as _, col (col)}
              <span
                class="pas"
                class:actif={montrerLeMotif && game.target.kick[col] > 0}
                class:playing={playhead.kick === col}
              ></span>
            {/each}
          </div>

          <!-- Ce qui a été joué, à sa place réelle dans la mesure. Un
               pourcentage seul ne dit pas OÙ ça déraille ; ici on voit qu'on
               traîne toujours sur le même temps.
               ⚠️ Les repères creux (les coups attendus) sont CACHÉS tant que le
               niveau « à l'oreille » n'est pas fini : les afficher rendait
               visible exactement ce que ce niveau demande d'entendre — trouvé
               en scriptant le pilote, le robot les lisait pour savoir où
               frapper. À vue il n'y a rien à cacher, ils restent. -->
          <div class="sequence" aria-hidden="true">
            {#if montrerLeMotif || game.solved || game.revealed}
              {#each { length: game.subdiv.kick } as _, col (col)}
                {#if game.target.kick[col] > 0}
                  <span class="attendu" style:left="{(col / game.subdiv.kick) * 100}%"></span>
                {/if}
              {/each}
            {/if}
            {#each game.frappes as f, i (i)}
              <span
                class="frappe {verdict(f.ecartMs)}"
                style:left="{f.phase01 * 100}%"
                title="{Math.round(f.ecartMs)} ms"
              ></span>
            {/each}
          </div>

          {#if game.frappes.length > 0}
            <p class="legende">
              <span class="pastille parfait"></span> juste
              <span class="pastille dedans"></span> acceptable
              <span class="pastille dehors"></span> à côté
              {#if montrerLeMotif || game.solved || game.revealed}· traits fins&nbsp;: les coups attendus{/if}
            </p>
          {/if}

          <button
            class="pad"
            class:precompte={enPrecompte}
            disabled={!enregistre && !enPrecompte}
            onpointerdown={frapper}
            aria-label="Frapper"
          >
            {#if enPrecompte}
              <span class="decompte">{clicPrecompte || 4}</span>
            {:else if enregistre}
              FRAPPE
            {:else if playingWhat === 'target'}
              écoute — « ⏺ Jouer » quand tu l’as
            {:else}
              Écoute d’abord, joue ensuite
            {/if}
          </button>
          <div class="jauge" role="meter" aria-valuenow={game.justesse()} aria-valuemin="0" aria-valuemax="100">
            <div class="barre" style:width="{game.justesse()}%"></div>
          </div>
          <!-- « 4/2 frappes » se lisait comme une erreur : la boucle tourne, les
               frappes s'accumulent d'un tour à l'autre, dépasser le compte est
               normal. On dit donc combien il en faut, pas une fraction. -->
          <p class="chiffres">
            {game.frappes.length} frappe{game.frappes.length > 1 ? 's' : ''} — il en faut au moins
            {game.frappesAttendues} — justesse {game.justesse()}&nbsp;%
            <span class="muted">(70&nbsp;% suffisent)</span>
            {#if game.frappes.length >= 3}
              <br />
              <!-- Diagnostic, jamais noté : un biais franc et constant, c'est de
                   la latence de la chaîne d'entrée, pas un défaut de placement. -->
              <span class="muted">
                écart médian {game.decalageMedian() > 0 ? '+' : ''}{game.decalageMedian()}&nbsp;ms
                ({Math.abs(game.decalageMedian()) <= 15
                  ? 'centré'
                  : game.decalageMedian() > 0
                    ? 'tu traînes'
                    : 'tu anticipes'})
              </span>
            {/if}
          </p>
          {#if game.frappes.length >= 4 && Math.abs(game.decalageMedian()) > 25}
            <!-- Un biais franc et constant n'est pas un défaut de placement,
                 c'est de la latence : la partie qui vient d'être jouée EST une
                 mesure, autant s'en servir plutôt que de refaire un calibrage. -->
            <button
              class="xp-btn"
              onclick={() => {
                latence.affiner(game.decalageMedian());
                // Les frappes affichées ont été mesurées avec l'ANCIEN réglage :
                // les garder montrerait un biais qui n'existe déjà plus.
                game.reinitialiserFrappes();
                stopAll();
              }}
            >
              🎚 Compenser ce décalage ({game.decalageMedian() > 0 ? '+' : ''}{game.decalageMedian()}&nbsp;ms)
            </button>
          {/if}
        </div>
      {:else}
        {#each GAME_DRUM_ROWS as name (name)}
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
                    class:donne={ex === 'completer' && !zone[name].has(col)}
                    class:a-remplir={ex === 'completer' && zone[name].has(col)}
                    class:win-flash={winFlash}
                    onclick={() => game.cycleCell(name, col)}
                    oncontextmenu={(e) => {
                      e.preventDefault();
                      game.cycleRoll(name, col);
                    }}
                  >
                    {#if locked}<span class="mark">{ex === 'completer' && !zone[name].has(col) ? '·' : '✓'}</span>
                    {:else if game.revealed && game.target[name][col] > 0}<span class="mark">○</span>{/if}
                    {#if game.guessRolls[name][col] > 1}<span class="roll">×{game.guessRolls[name][col]}</span>{/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}

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
              <button class="xp-btn primary" onclick={() => allerAuNiveau(game.levelIndex + 1)}>
                Niveau suivant →
              </button>
            {/if}
            {#if ex === 'reproduire' || ex === 'completer'}
              <!-- Rien à sauvegarder pour « intrus » et « jouer » : leur grille
                   de proposition est vide par construction, le bouton
                   n'enverrait dans l'Atelier qu'un rythme muet. -->
              <button class="xp-btn" onclick={saveToAtelier}>💾 Sauvegarder dans l’Atelier</button>
            {/if}
          </div>
        </div>
      {:else}
        <div class="footer-btns">
          <button class="xp-btn tiny" onclick={() => { stopAll(); game.revealSolution(); game.giveUp(); }}>
            {ex === 'intrus' ? 'Donner la réponse (0★)' : ex === 'jouer' ? 'Abandonner (0★)' : 'Voir la solution (0★)'}
          </button>
          <button class="xp-btn tiny" onclick={() => { game.giveUp(); allerAuNiveau(game.levelIndex); }}>
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
    font-size: 10px;
  }
  .pseudo-form {
    display: flex;
    gap: 6px;
  }
  input {
    flex: 1;
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 4px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  /* Devenu cliquable (changer de joueur) sans devenir un bouton à l'œil :
     l'en-tête en compte déjà deux, un troisième relief brouillerait la
     hiérarchie. Cible tactile tenue à 24px (audit A3). */
  .player {
    font-size: var(--xp-size-body);
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .preamble {
    font-size: var(--xp-size-body);
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
    font-size: var(--xp-size-body);
  }
  .map-cell.locked {
    opacity: 0.45;
    cursor: default;
  }
  .map-cell.current {
    outline: 2px solid var(--xp-playhead);
  }
  .stars {
    font-size: 9px;
    color: var(--xp-playhead);
  }
  .bag {
    max-height: 180px;
    overflow-y: auto;
    font-size: var(--xp-size-body);
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
    font-size: 9px;
  }
  .transport {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.primary {
    font-weight: 700;
    background: linear-gradient(180deg, #2f8a3c, #1c5a24 50%, #123f18);
  }
  .xp-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  /* Le vert est celui de la VALIDATION dans tout le Mode jeu ; deux boutons
     verts côte à côte se disputaient l'œil. « Jouer » prend le rouge
     d'enregistrement — c'est son sens, et ça les sépare. */
  .xp-btn.rec {
    font-weight: 700;
    background: linear-gradient(180deg, #a83a2a, #7a2418 50%, #551208);
  }
  .xp-btn.tiny {
    font-size: var(--xp-size-small);
    padding: 2px 8px;
  }
  .row {
    margin-bottom: 10px;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9px;
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
    color: var(--xp-lcd);
  }
  .badge {
    color: var(--xp-playhead);
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
    background: var(--xp-btn-face);
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
    outline: 2px dashed var(--xp-playhead);
  }
  .cell.playing {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  /* Flash de victoire (original, l. 441-442) : 3 pulsations de luminosité,
     déclenché sur toutes les cases à la résolution (triggerWinFlash). */
  @keyframes cellFlash {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.6);
    }
  }
  .cell.win-flash {
    animation: cellFlash 0.35s ease 3;
  }
  .mark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--xp-title-text);
  }
  .roll {
    position: absolute;
    right: 2px;
    bottom: 0;
    font-size: 9px;
    font-family: var(--xp-mono);
    color: var(--xp-title-text);
  }
  .result {
    border: 1px solid var(--xp-line);
    background: rgba(0, 0, 0, 0.25);
    padding: 10px;
    margin-top: 10px;
  }
  .result.won {
    border-color: var(--xp-lcd-dim);
  }
  .stars-big {
    font-size: 24px;
    color: var(--xp-playhead);
    margin: 0 0 4px;
  }
  .roast,
  .context,
  .loot {
    font-size: var(--xp-size-body);
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
  .echec {
    font-size: var(--xp-size-body);
    color: var(--cell-kick);
    background: rgba(0, 0, 0, 0.25);
    border-left: 3px solid var(--cell-kick);
    padding: 5px 8px;
    margin: -4px 0 10px;
  }

  /* « Compléter » : deux états de plus sur la même case.
     Le donné est en creux et éteint — présent, mais hors jeu. La mesure à
     remplir garde le relief : c'est là que la main travaille, et le biseau est
     ce qui dit « cliquable » dans cette skin. */
  .cell.donne {
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-in);
    opacity: 0.55;
  }
  .cell.donne.state-1,
  .cell.donne.state-2 {
    background: #2b4c68;
    opacity: 0.7;
  }
  .cell.a-remplir {
    outline: 1px solid var(--xp-accent-teal);
    outline-offset: 1px;
  }

  /* --- « Trouve l'intrus » --- */
  .consigne {
    font-size: var(--xp-size-body);
    margin: 0 0 6px;
  }
  .choix {
    display: grid;
    /* minmax(0, …) et non 1fr seul : `1fr` vaut `minmax(auto, 1fr)`, le
       min-content de chaque bouton s'impose et les quatre colonnes divergent —
       mesuré à l'écran avant correction. */
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 10px;
  }
  .choix-btn {
    padding: 8px 4px;
  }
  .choix-btn.actif {
    background: linear-gradient(180deg, #2f7fd0, #1d5590);
    box-shadow: var(--xp-bevel-in);
    font-weight: 700;
  }
  /* Le curseur de lecture, sur un bouton : c'est le même vocabulaire que la
     case en cours de la grille, et il rend le comptage des mesures inutile. */
  .choix-btn.en-cours {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  .choix-btn.bonne {
    background: #2f8a4f;
    opacity: 1;
  }

  /* --- « Joue en rythme » --- */
  .guide {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 3px;
    margin-bottom: 8px;
  }
  .pas {
    height: 10px;
    border: 1px solid var(--xp-line);
    border-radius: 2px;
    background: var(--xp-btn-face);
    box-shadow: var(--xp-bevel-in);
  }
  .pas.actif {
    background: var(--xp-lcd-dim);
  }
  .pas.playing {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  /* La séquence réellement jouée, sur une mesure.
     Les repères creux sont les coups attendus, les pleins ce qui a été frappé,
     à leur place réelle et non quantifiés — c'est tout l'intérêt : une frappe
     posée juste après le repère se VOIT en retard. */
  .sequence {
    position: relative;
    height: 16px;
    margin-bottom: 8px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-lcd-bg);
    overflow: hidden;
  }
  .attendu,
  .frappe {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
  }
  .attendu {
    background: var(--xp-lcd-dim);
    box-shadow: 0 0 3px var(--xp-lcd-dim);
  }
  .frappe {
    top: 3px;
    bottom: 3px;
    border-radius: 1px;
  }
  .frappe.parfait {
    background: var(--xp-lcd);
  }
  .frappe.dedans {
    background: var(--xp-playhead);
  }
  .frappe.dehors {
    background: var(--cell-kick);
  }

  .legende {
    font-size: var(--xp-size-small);
    color: var(--xp-muted);
    margin: 0 0 8px;
  }
  .pastille {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 1px;
    vertical-align: baseline;
  }
  .pastille.parfait {
    background: var(--xp-lcd);
  }
  .pastille.dedans {
    background: var(--xp-playhead);
  }
  .pastille.dehors {
    background: var(--cell-kick);
  }

  .pad {
    display: block;
    width: 100%;
    height: 96px;
    font-family: var(--xp-font);
    font-size: var(--xp-size-title);
    letter-spacing: var(--xp-ls-title);
    text-transform: uppercase;
    color: var(--xp-lcd);
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    /* Frapper vite, c'est frapper deux fois au même endroit : sans ça, le
       navigateur y voit un double-tap et zoome au lieu de laisser jouer. */
    touch-action: manipulation;
    user-select: none;
  }
  .pad:active {
    box-shadow: var(--xp-bevel-in);
    background: #0d1a0e;
  }
  .pad:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  /* Pendant le précompte le pad reste NOIR et affiche le chiffre : il ne se
     grise pas comme un bouton désactivé, parce qu'il n'est pas hors service —
     il compte. */
  .pad.precompte {
    color: var(--xp-playhead);
    cursor: default;
  }
  .decompte {
    font-size: 40px;
    letter-spacing: 0;
    font-weight: 700;
  }
  .jauge {
    height: 8px;
    margin-top: 8px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-lcd-bg);
  }
  .barre {
    height: 100%;
    background: var(--xp-lcd);
    transition: width 0.12s linear;
  }
  .chiffres {
    font-family: var(--xp-mono);
    font-size: var(--xp-size-lcd);
    margin: 4px 0 10px;
  }
  .chiffres .muted {
    font-size: var(--xp-size-lcd);
  }

  /* Chantier tactile (cf. styles/global.css) — EN FIN DE BLOC, sans quoi les
     règles écrites plus bas l'écraseraient à specificité égale.
     ⚠️ Les enveloppes 44px débordent des boutons (30-32px de haut ici, donc
     ~7px de débordement en haut et en bas) et se marchent dessus : la rangée
     du dessous, plus tard dans le DOM, passe AU-DESSUS et vole les derniers
     pixels de celle du dessus. Mesuré : les boutons « Mesure 1..3 » ne
     répondaient plus que sur 22px de leurs 30px visibles, mangés par l'enveloppe
     de « Donner la réponse ». D'où ces écartements — 16px au minimum, soit deux
     débordements. */
  @media (pointer: coarse) {
    .pseudo-form {
      gap: 14px;
    }
    .head {
      gap: 16px;
      margin-bottom: 14px;
    }
    .transport {
      gap: 16px;
      margin-bottom: 18px;
    }
    .echec {
      margin: 0 0 18px;
    }
    .choix {
      gap: 10px;
      margin-bottom: 20px;
    }
    .chiffres {
      margin-bottom: 18px;
    }
    .map {
      gap: 12px;
      margin-bottom: 18px;
    }
    .result-btns,
    .footer-btns {
      gap: 16px;
      margin-top: 18px;
    }
  }
</style>
