<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { game, LEVELS, tierForAttempts, GAME_DRUM_ROWS } from '../../stores/game.svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { GameDrumRowName } from '../../model/presets/levels';
  import { parametre } from '../../model/parametres';
  import { PRESETS } from '../../model/presets/songs';
  import XpSlider from '../xp/XpSlider.svelte';
  import {
    PARFAIT_MS,
    TOLERANCE_MS,
    ecartAuClic,
    medianeDesEcarts,
    type ExerciseKind,
  } from '../../model/exercises';
  import { latence } from '../latence.svelte';
  import CalibrageLatence from '../xp/CalibrageLatence.svelte';
  import XpWindow from '../xp/XpWindow.svelte';
  import CarriereView from './CarriereView.svelte';

  let { onGoAtelier }: { onGoAtelier?: () => void } = $props();

  // État lu EN DIRECT par le moteur à chaque tick (comme pattern.snapshot()
  // pour l'Atelier), pas figé une fois pour toutes au clic sur ▶ — sinon,
  // modifier sa proposition PENDANT « Écouter ma version » continuerait de
  // jouer l'ancien état : le son se décale de ce qui est affiché sur la
  // grille. buildState() est bon marché (quelques tableaux de 32 cases), pas
  // de souci à le reconstruire à chaque tick (25 ms).
  let playingWhat = $state<'' | 'target' | 'guess' | 'intrus' | 'param'>('');
  const engine = new AudioEngine(() => game.buildState(playingWhat || 'target'));
  let showMap = $state(false);
  let showBag = $state(false);

  /* Le Mode jeu a désormais DEUX écrans, et la carrière est celui d'entrée :
   * c'est le récit qui donne le pourquoi, les niveaux donnent le comment
   * (PLAN.md, « Architecture du Mode jeu » ; arbitrage du 2026-08-23). La
   * salle de répétition — les 41 niveaux — reste atteignable d'un bouton :
   * « pas de scénario qui enferme l'outil » (HISTOIRE.md). */
  let ecran = $state<'carriere' | 'exercice'>('carriere');

  // Curseur visuel : consommé à chaque frame contre l'horloge audio, comme
  // dans l'Atelier (AtelierView.svelte) — sans cette boucle, aucune case ne
  // s'illumine pendant la lecture et il est impossible de suivre le rythme.
  let playhead = $state<Record<GameDrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
  /* La basse a son propre curseur : elle ne fait pas partie des trois lignes de
     batterie, et `PlayheadEvent.name` couvre déjà les lignes de synthé. */
  let playheadBass = $state(-1);
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as GameDrumRowName] = ev.col;
      if (ev.name === 'bass') playheadBass = ev.col;
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
    playheadBass = -1;
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
    // Le métronome du calibrage n'est plus arrêté ici : il appartient au
    // panneau (`CalibrageLatence`), qui le coupe lui-même en se démontant.
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
    // Le monitoring suit la lecture, ici aussi : le graphe est neuf à chaque
    // ouverture du contexte, et il naît neutre.
    engine.setPetitHautParleur(game.ecoutePetite);
  }

  /* ---- Verbes de paramètre : écouter une version ----
   * `-1` fait sonner le réglage du JOUEUR, pour qu'il puisse comparer sa
   * version à la cible sans avoir à mémoriser. */
  let versionEnCours = $state<number | null>(null);
  async function ecouterVersion(i: number) {
    if (versionEnCours === i) {
      stopAll();
      return;
    }
    engine.stop();
    resetPlayhead();
    game.paramVersionJouee = i;
    versionEnCours = i;
    playingWhat = 'param';
    await engine.start();
    // ⚠️ APRÈS `start()`, et pas seulement au clic sur le sélecteur : le graphe
    // n'existe pas tant que le contexte n'est pas ouvert, donc un réglage posé
    // avant la première lecture serait perdu en silence — et le joueur
    // entendrait le studio en croyant écouter la laverie.
    engine.setPetitHautParleur(game.ecoutePetite);
  }

  /* Changer de haut-parleur EN COURS DE LECTURE, sans rien relancer : c'est le
     geste de l'exercice, et c'est aussi ce qui le rend démonstratif — la même
     boucle, deux endroits, la différence saute. */
  function basculerEcoute(petite: boolean) {
    game.ecoutePetite = petite;
    engine.setPetitHautParleur(petite);
  }

  const descripteur = $derived(parametre(game.paramId));

  function stopAll() {
    engine.stop();
    playingWhat = '';
    enPrecompte = false;
    enregistre = false;
    versionEnCours = null;
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
    style: 'Ce n’est pas ce genre-là. Réécoute : le tempo, la place de la caisse claire, ce que fait le hi-hat.',
    laverie: 'Ce n’est pas celle-là. Compare les deux haut-parleurs : ce qui compte, c’est ce qui reste.',
    melodie: 'Pas encore. Les notes justes sont verrouillées ✓ — reprends les autres.',
    silence: 'Ce n’est pas là. Réécoute la boucle : le trou est ailleurs.',
    reproduire: 'Pas encore. Les cases justes sont verrouillées ✓ — reprends les autres.',
    completer: 'Pas encore. Les cases justes du temps manquant sont verrouillées ✓.',
    intrus: 'Ce n’est pas celle-là. Réécoute les quatre mesures.',
    jouer: 'Trop loin du temps. Relance la boucle et repose tes frappes.',
    lequel: 'Ce n’est pas celle-là. Réécoute les versions l’une après l’autre.',
    nommer: 'Ce n’est pas ce réglage-là. Réécoute A puis B, et cherche ce qui bouge.',
    regler: 'Pas encore. Compare ta version à la cible et déplace le curseur.',
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
   * La mesure elle-même vit dans `ui/xp/CalibrageLatence.svelte` depuis le
   * 2026-08-24 : le pad d'écriture de l'Atelier en a besoin aussi (un casque
   * Bluetooth décale ce qu'on y enregistre), et deux mesures qui doivent rester
   * d'accord finissent toujours par ne plus l'être. Il ne reste ici que
   * l'ouverture du panneau — et l'arrêt de tout ce qui sonnait, sans quoi on
   * calibrerait sur un métronome couvert par l'exercice en cours.
   */
  let calibrage = $state(false);

  function ouvrirCalibrage() {
    stopAll();
    calibrage = true;
  }

  // Un seul point d'entrée vers un niveau : le drapeau d'échec est local à la
  // vue, il ne se remettrait pas à zéro tout seul en changeant de niveau.
  function allerAuNiveau(index: number) {
    stopAll();
    echec = false;
    // Choisir un niveau dans la carte, c'est répéter, pas avancer dans le
    // récit : sans cette ligne, réussir un niveau choisi à la main ferait
    // progresser la carrière d'une étape qu'on n'a pas jouée.
    game.enCarriere = false;
    game.startLevel(index);
  }

  /* Étape suivante du récit, après un exercice de carrière.
   *
   * On ne repasse par l'écran de carrière que s'il a quelque chose à dire —
   * une fin d'acte à annoncer, ou un récit à lire. Deux exercices qui se
   * suivent s'enchaînent directement : une page « Continuer » entre chaque
   * ferait trois clics pour une sonnerie. */
  function continuerCarriere() {
    stopAll();
    echec = false;
    game.avancerCarriere();
    if (game.acteTermineAAnnoncer || game.etapeCourante?.kind !== 'exercice') ecran = 'carriere';
  }

  /* La barre d'espace frappe aussi : sur un clavier, viser un pad à la souris
   * ajoute une latence de visée à ce qu'on mesure — et ce qu'on mesure ici est
   * précisément une latence. */
  function surTouche(e: KeyboardEvent) {
    // Pendant le calibrage, c'est le panneau qui écoute la barre d'espace :
    // deux auditeurs enregistreraient la même frappe deux fois, une fois comme
    // mesure de latence et une fois comme frappe de jeu.
    if (calibrage) return;
    if (ex !== 'jouer' || e.code !== 'Space' || e.repeat) return;
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
  /* Le nom du genre tel qu'il s'écrit dans les données des presets — le jeu et
     l'Atelier doivent nommer la même chose de la même façon, sinon le jeu
     n'apprend rien d'utilisable dans le menu des presets. */
  function nomDuGenre(id: string): string {
    return PRESETS.find((p) => p.id === id)?.label ?? id;
  }
  /* ⚠️ « Trois versions du même SON » était écrit en dur — juste tant que les
     verbes de paramètre ne servaient que la famille `timbre`. Le groove ne
     change aucun son : il change QUAND ils tombent. Poser la question sur le
     son y envoie écouter la mauvaise chose. */
  const sujetDesVersions = $derived(
    lvl.familleParam === 'groove' ? 'de la même boucle' : 'du même son',
  );
  /* Les niveaux de la salle de répétition, dans l'ordre où le récit les a
     fait rencontrer — pas dans l'ordre de leur numéro. C'est ce qui compte
     pour s'y retrouver : on refait « celui d'avant », pas « le 39 ». */
  const niveauxOuverts = $derived(
    game.niveauxDeRepetition
      .map((id) => LEVELS.find((l) => l.id === id))
      .filter((l): l is (typeof LEVELS)[number] => !!l),
  );
  /* Dans la carrière, la consigne affichée est le BRIEF du client, pas la
     fiche pédagogique du niveau : « La deuxième. La snare entre. » plutôt que
     « La snare (caisse claire) entre en jeu à son tour ». Le préambule reste
     dessous — il explique la mécanique, et c'est toujours utile. */
  const commande = $derived.by(() => {
    if (!game.enCarriere) return '';
    const e = game.etapeCourante;
    return e && e.kind === 'exercice' ? (e.commande ?? '') : '';
  });
  const titreFenetre = $derived(
    game.enCarriere
      ? `Acte ${game.acteCourant.id} — ${game.acteCourant.titre} · ${game.etapeActive + 1}/${game.acteCourant.etapes.length}`
      : // Hors carrière : plus de « / 41 ». Le total annonçait le nombre de
        // niveaux existants à quelqu'un qui n'en a rencontré que trois — un
        // compteur qui ne compte rien de ce que le joueur voit, et un
        // avant-goût de tout ce qui reste.
        `Répétition — ${lvl.teach}`,
  );
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

  /* Les degrés, du plus HAUT en haut — comme sur une portée, et comme sur le
     pad de l'Atelier. Une grille de hauteurs qui monterait vers le bas
     demanderait de retourner ce qu'on entend avant de le poser. */
  const degres = $derived(
    Array.from({ length: lvl.melodie.degreMax }, (_, i) => lvl.melodie.degreMax - i),
  );

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
    <XpWindow title="Face B" icon="🎮" accent="none">
      <p class="lead">
        Tu vas apprendre à fabriquer des rythmes <strong>à l’oreille</strong>, dans un petit label de
        disques qui a cinq mois devant lui. Huit actes, des exercices courts, et l’Atelier qui
        s’ouvre en chemin.
      </p>
      <p class="lead">Choisis un pseudo — c’est là que ta progression sera rangée.</p>
      <form
        class="pseudo-form"
        onsubmit={(e) => {
          e.preventDefault();
          const input = (e.currentTarget as HTMLFormElement).elements.namedItem('pseudo') as HTMLInputElement;
          game.setPseudo(input.value);
          ecran = 'carriere';
        }}
      >
        <input name="pseudo" placeholder="Ton pseudo…" autocomplete="off" />
        <button class="xp-btn">C’est parti</button>
      </form>
    </XpWindow>
  {:else if ecran === 'carriere'}
    <CarriereView
      onExercice={() => {
        stopAll();
        echec = false;
        ecran = 'exercice';
      }}
      onRepetition={() => {
        game.enCarriere = false;
        showMap = true;
        ecran = 'exercice';
      }}
      onLivraison={() => {
        stopAll();
        saveToAtelier();
      }}
      onCommande={() => {
        // ⚠️ On n'emporte PAS la grille du dernier exercice : une commande est
        // un travail à faire, pas une correction à retoucher. L'Atelier garde
        // ce qu'il avait — et l'acte 6, lui, part d'une page blanche.
        stopAll();
        onGoAtelier?.();
      }}
    />
  {:else}
    <XpWindow title={titreFenetre} icon="🎮" accent="none">
      <div class="head">
        <button class="xp-btn tiny" onclick={() => { stopAll(); ecran = 'carriere'; }}>◂ Carrière</button>
        <button class="player tap44-y" onclick={() => game.clearPseudo()} title="Changer de joueur">
          👤 {game.pseudo}
        </button>
        <button class="xp-btn tiny" onclick={() => (showMap = !showMap)}>🗺️ Carte</button>
        <button class="xp-btn tiny" onclick={() => (showBag = !showBag)}>🎒 Besace ({game.bag.length})</button>
      </div>
      {#if commande}<p class="commande">{commande}</p>{/if}
      {#if lvl.preamble}<p class="preamble">{lvl.preamble}</p>{/if}

      {#if showMap}
        <!-- La salle de répétition ne liste QUE les niveaux déjà rencontrés
             dans le récit, et les liste tous comme rejouables.
             Deux corrections d'un coup :
             · « il faut pouvoir refaire les niveaux » — l'ancien seuil
               `id <= level` verrouillait les niveaux 39-41 de l'acte 0 (ils
               portent des numéros de fin de liste) et n'ouvrait jamais un
               exercice abandonné, qui n'avance pas `level` ;
             · « no spoil » — les 41 niveaux s'affichaient, cadenas compris,
               y compris ceux d'actes qui ne sont pas encore écrits. -->
        <div class="map">
          {#each niveauxOuverts as l (l.id)}
            {@const stars = game.playerProgress.stars[String(l.id)] ?? 0}
            <button
              class="map-cell"
              class:current={l.id === lvl.id && !game.enCarriere}
              title={l.teach}
              onclick={() => {
                allerAuNiveau(l.id - 1);
                showMap = false;
              }}
            >
              <span class="num">{l.id}</span>
              <span class="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
            </button>
          {/each}
        </div>
        {#if niveauxOuverts.length === 0}
          <p class="muted">
            Rien à répéter pour l’instant : les exercices arrivent avec l’histoire.
          </p>
        {:else}
          <p class="muted">
            {niveauxOuverts.length} exercice{niveauxOuverts.length > 1 ? 's' : ''} rencontré{niveauxOuverts.length >
            1
              ? 's'
              : ''} — tous rejouables, autant de fois que tu veux.
          </p>
        {/if}
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
      <!-- ⚠️ Pas de transport pour les verbes de PARAMÈTRE, et c'est un
           correctif de lisibilité : il n'y portait que « ✓ Vérifier », donc il
           affichait le bouton de validation AVANT la question à laquelle il
           répond. On lisait « Vérifier » puis « Laquelle est la plus… ? ».
           Le bouton est descendu dans le corps de l'exercice, sous les
           réponses. -->
      {#if ex !== 'lequel' && ex !== 'nommer' && ex !== 'regler' && ex !== 'laverie'}
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
                : ex === 'style'
                  ? '🔊 Écouter la boucle'
                : ex === 'silence'
                  ? '🔊 Écouter la pulsation'
                  : ex === 'melodie'
                  ? '🔊 Écouter la basse'
                  : '🔊 Écouter le rythme à trouver'}
          </button>
          {#if ex !== 'silence' && ex !== 'style'}
            <!-- ⚠️ Pas de « ma version » pour le silence : on ne pose rien sur
                 la grille, on désigne un pas. Le bouton ne jouait donc jamais
                 que du vide — et un bouton qui ne fait rien se lit comme une
                 panne, pas comme une absence. -->
            <button class="xp-btn" onclick={() => play('guess')}>
              {playingWhat === 'guess' ? '■ Stop' : '🎧 Écouter ma version'}
            </button>
          {/if}
        {/if}
        {#if ex !== 'melodie' && ex !== 'silence' && ex !== 'style'}
          <!-- ⚠️ Pas de « Vérifier » ici pour la mélodie : le transport est
               au-dessus de la grille, et on lirait le bouton de validation
               avant ce qu'il valide. Il est repris sous le rouleau. -->
          <button
            class="xp-btn primary"
            disabled={game.solved || game.revealed || (ex === 'intrus' && game.intrusChoix === null)}
            onclick={verify}
          >
            ✓ Vérifier
          </button>
        {/if}
      </div>
      {/if}

      {#if echec && !game.solved && !game.revealed}
        <p class="echec">✗ {MSG_ECHEC[ex]}</p>
      {/if}

      {#if descripteur && (ex === 'lequel' || ex === 'nommer' || ex === 'regler' || ex === 'laverie')}
        <div class="param">
          {#if ex === 'laverie'}
            <!-- ⚠️ Le sélecteur de haut-parleur EST l'exercice, pas un réglage
                 de confort : c'est en passant de l'un à l'autre qu'on entend
                 que le problème n'est pas dans le son mais dans l'endroit. Il
                 est donc au-dessus de la question, et pas rangé ailleurs. -->
            <div class="ecoute">
              <button
                class="xp-btn ecoute-btn tap44-y"
                class:actif={!game.ecoutePetite}
                onclick={() => basculerEcoute(false)}
              >
                🖥 Le studio
              </button>
              <button
                class="xp-btn ecoute-btn tap44-y"
                class:actif={game.ecoutePetite}
                onclick={() => basculerEcoute(true)}
              >
                📻 La laverie
              </button>
            </div>
          {/if}
          <p class="consigne">
            {#if ex === 'laverie'}
              Trois versions du même kick. Laquelle <strong>tient encore</strong> sur
              le petit haut-parleur&nbsp;?
            {:else if ex === 'lequel'}
              <!-- « sonne » et non « est » : les libellés du catalogue portent un
                   article masculin (« le plus rond », « le plus sec ») tandis que
                   le sujet, « une version », est féminin — « Laquelle est le plus
                   rond ? » était fautif sur les sept boutons. « Sonner » prend
                   l'adjectif en adverbe et accorde tout seul, en plus de mieux
                   dire ce qu'on écoute. -->
              Trois versions {sujetDesVersions}. Laquelle sonne <strong>{game.paramSens === 'plus'
                ? descripteur.plus
                : descripteur.moins}</strong>&nbsp;?
            {:else if ex === 'nommer'}
              Écoute <strong>A</strong>, puis <strong>B</strong>. Quel réglage a bougé&nbsp;?
            {:else}
              Retrouve le réglage de la cible. Le bouton&nbsp;: <strong>{descripteur.label}</strong>.
            {/if}
          </p>

          <!-- Les versions à écouter. Étiquetées A/B/C et jamais par leur
               valeur : un chiffre affiché transformerait un exercice d'oreille
               en exercice de lecture. -->
          <div class="versions">
            {#if ex === 'regler'}
              <button class="xp-btn version" class:joue={versionEnCours === 0} onclick={() => ecouterVersion(0)}>
                {versionEnCours === 0 ? '■' : '🔊'} La cible
              </button>
              <button class="xp-btn version" class:joue={versionEnCours === -1} onclick={() => ecouterVersion(-1)}>
                {versionEnCours === -1 ? '■' : '🎧'} Ma version
              </button>
            {:else}
              {#each game.paramVersions as _, i (i)}
                <button
                  class="xp-btn version"
                  class:joue={versionEnCours === i}
                  class:actif={game.paramChoix === i && (ex === 'lequel' || ex === 'laverie')}
                  class:bonne={(game.solved || game.revealed) &&
                    game.paramReponse === i &&
                    (ex === 'lequel' || ex === 'laverie')}
                  onclick={() => ecouterVersion(i)}
                >
                  {versionEnCours === i ? '■' : '🔊'} {String.fromCharCode(65 + i)}
                </button>
              {/each}
            {/if}
          </div>

          {#if ex === 'lequel' || ex === 'laverie'}
            <p class="consigne">Ta réponse&nbsp;:</p>
            <div class="choix">
              {#each game.paramVersions as _, i (i)}
                <button
                  class="xp-btn choix-btn tap44-y"
                  class:actif={game.paramChoix === i}
                  class:bonne={(game.solved || game.revealed) && game.paramReponse === i}
                  disabled={game.solved || game.revealed}
                  onclick={() => { game.paramChoix = i; echec = false; }}
                >
                  {String.fromCharCode(65 + i)}
                </button>
              {/each}
            </div>
          {:else if ex === 'nommer'}
            <div class="choix choix-noms">
              {#each game.paramCandidats as id, i (id)}
                <button
                  class="xp-btn choix-btn tap44-y"
                  class:actif={game.paramChoix === i}
                  class:bonne={(game.solved || game.revealed) && game.paramReponse === i}
                  disabled={game.solved || game.revealed}
                  onclick={() => { game.paramChoix = i; echec = false; }}
                >
                  {parametre(id)?.label ?? id}
                </button>
              {/each}
            </div>
          {:else}
            <!-- Aucune valeur n'est affichée pour la cible : on cherche le SON.
                 Le curseur, lui, montre la sienne — c'est un instrument, pas une
                 devinette. -->
            <div class="reglage">
              <XpSlider
                label={descripteur.label}
                min={descripteur.min}
                max={descripteur.max}
                step={descripteur.step}
                unit={descripteur.unite}
                bind:value={game.paramValeur}
              />
            </div>
            {#if game.solved || game.revealed}
              <p class="chiffres">
                Cible&nbsp;: {game.paramVersions[0]}{descripteur.unite} · toi&nbsp;:
                {game.paramValeur}{descripteur.unite}
              </p>
            {/if}
          {/if}

          <div class="valider">
            <button
              class="xp-btn primary tap44-y"
              disabled={game.solved || game.revealed || (ex !== 'regler' && game.paramChoix === null)}
              onclick={verify}
            >
              ✓ Vérifier
            </button>
          </div>
        </div>
      {:else if ex === 'intrus'}
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
      {:else if ex === 'style'}
        <!-- Rien à reposer, rien à mesurer : on écoute une boucle et on met un
             nom dessus. Les quatre propositions viennent de quatre CATÉGORIES
             différentes — on reconnaît une famille, pas un sous-genre (voir
             `tirerStyle`). -->
        <div class="silence">
          <p class="consigne">Quel genre&nbsp;?</p>
          <div class="choix choix-noms">
            {#each game.styleCandidats as id, i (id)}
              <button
                class="xp-btn choix-btn tap44-y"
                class:actif={game.styleChoix === i}
                class:bonne={(game.solved || game.revealed) && game.styleReponse === i}
                disabled={game.solved || game.revealed}
                onclick={() => {
                  game.styleChoix = i;
                  echec = false;
                }}
              >
                {nomDuGenre(id)}
              </button>
            {/each}
          </div>
          <div class="valider">
            <button
              class="xp-btn primary tap44-y"
              disabled={game.solved || game.revealed || game.styleChoix === null}
              onclick={verify}
            >
              ✓ Vérifier
            </button>
          </div>
        </div>
      {:else if ex === 'silence'}
        <!-- Aucune grille : une pulsation, un trou, et un bouton par pas. Même
             mécanique que « l'intrus » — on désigne, on ne construit pas. -->
        <div class="silence">
          <p class="consigne">Quel coup manque&nbsp;?</p>
          <div class="choix choix-pas">
            {#each { length: game.subdiv.hat } as _, i (i)}
              <button
                class="xp-btn choix-btn tap44-y"
                class:actif={game.silenceChoix === i}
                class:en-cours={playhead.hat === i}
                class:bonne={(game.solved || game.revealed) && game.silenceReponse === i}
                disabled={i === 0 || game.solved || game.revealed}
                title={i === 0 ? 'Le premier temps donne le départ : il ne manque jamais' : ''}
                onclick={() => {
                  game.silenceChoix = i;
                  echec = false;
                }}
              >
                {i + 1}
              </button>
            {/each}
          </div>
          <p class="muted">
            Le kick marque le premier temps — c'est de là qu'on compte. Le trou est
            toujours ailleurs.
          </p>
          <div class="valider">
            <button
              class="xp-btn primary tap44-y"
              disabled={game.solved || game.revealed || game.silenceChoix === null}
              onclick={verify}
            >
              ✓ Vérifier
            </button>
          </div>
        </div>
      {:else if ex === 'melodie'}
        <!-- La grille de HAUTEURS : un rouleau, degrés en ordonnée, pas en
             abscisse. Monophonique — une seule note par colonne, donc poser
             un degré remplace celui qui s'y trouvait. C'est ce qui permet à
             une case de porter un nombre et au comparateur de rester le même
             que pour la batterie. -->
        <div class="melodie" style:--pas={game.melodieCible.length}>
          {#each degres as d (d)}
            <div class="mel-ligne">
              <span class="mel-degre">{d}</span>
              {#each game.melodieCible as _, col (col)}
                {@const pose = game.melodieGuess[col] === d}
                {@const cible = game.melodieCible[col] === d}
                {@const verrou = game.melodieLocked[col] && cible}
                <button
                  class="mel-case"
                  class:pose
                  class:verrou
                  class:revelee={(game.solved || game.revealed) && cible && !pose}
                  class:playing={playheadBass === col}
                  class:win-flash={winFlash}
                  aria-label="Degré {d}, pas {col + 1}"
                  onclick={() => {
                    game.poserNote(col, d);
                    echec = false;
                  }}
                >
                  {#if verrou}<span class="mark">✓</span>
                  {:else if (game.solved || game.revealed) && cible}<span class="mark">○</span>{/if}
                </button>
              {/each}
            </div>
          {/each}
          <div class="mel-ligne mel-pieds">
            <span class="mel-degre"></span>
            {#each game.melodieCible as _, col (col)}
              <span class="mel-pas" class:fort={col % 4 === 0}>{col + 1}</span>
            {/each}
          </div>
        </div>
        {@const posees = game.melodieGuess.filter((v) => v > 0).length}
        {@const attendues = game.melodieCible.filter((v) => v > 0).length}
        <p class="muted">
          {posees} note{posees > 1 ? 's' : ''} posée{posees > 1 ? 's' : ''} sur {attendues} · le degré
          1 est la tonique, celui sur lequel la phrase se repose.
        </p>
        <div class="valider">
          <button
            class="xp-btn primary tap44-y"
            disabled={game.solved || game.revealed}
            onclick={verify}
          >
            ✓ Vérifier
          </button>
        </div>
      {:else if ex === 'jouer' && calibrage}
        <!-- Calibrage : un métronome nu, et on compare les frappes aux temps
             PROGRAMMÉS des clics. Aucune estimation de navigateur ne remplace
             cette mesure — WebKit ne déclare pas `outputLatency`, et personne ne
             déclare la latence d'entrée d'une dalle tactile. -->
        <CalibrageLatence {engine} onClose={() => (calibrage = false)} />
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
            {#if game.enCarriere}
              <!-- Pas de game over dans cette histoire (HISTOIRE.md) : on
                   continue même après avoir vu la solution. Ce qui se perd,
                   ce sont les étoiles, pas la suite du récit. -->
              <button class="xp-btn primary" onclick={continuerCarriere}>Continuer ▸</button>
            {:else if game.solved && game.levelIndex < LEVELS.length - 1}
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
  /* Le rouleau de hauteurs. Même grammaire que la grille de batterie — cases
     creusées, biseau d'un pixel, vert d'afficheur quand c'est allumé — mais en
     deux dimensions : le temps en abscisse, la hauteur en ordonnée. */
  .melodie {
    margin: 8px 0 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .mel-ligne {
    display: grid;
    grid-template-columns: 16px repeat(var(--pas, 8), 1fr);
    gap: 2px;
    align-items: center;
  }
  .mel-degre {
    font-size: var(--xp-size-tag);
    color: var(--xp-muted);
    text-align: right;
    padding-right: 2px;
  }
  .mel-case {
    aspect-ratio: 1;
    min-height: 22px;
    background: var(--xp-lcd-bg);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    border-radius: 2px;
    cursor: pointer;
    padding: 0;
    color: var(--xp-lcd);
    font: inherit;
    font-size: var(--xp-size-tag);
  }
  .mel-case.playing {
    border-color: var(--xp-lcd-dim);
  }
  .mel-case.pose {
    background: var(--xp-lcd);
    box-shadow: var(--xp-bevel-out);
  }
  .mel-case.verrou {
    background: var(--xp-lcd);
    color: var(--xp-lcd-bg);
  }
  .mel-case.revelee {
    background: #123018;
  }
  .mel-case.win-flash.pose {
    background: #7dffa0;
  }
  .mel-pieds .mel-pas {
    font-size: var(--xp-size-tag);
    color: var(--xp-lcd-dim);
    text-align: center;
  }
  .mel-pieds .mel-pas.fort {
    color: var(--xp-muted);
  }

  /* Une touche par pas : ça tient sur une ligne à 390 px pour huit pas, et le
     bouton du premier temps est désactivé — il donne le départ, il ne manque
     jamais. */
  /* Le sélecteur de haut-parleur : deux touches d'ampli, celle qui est
     enfoncée est allumée. Même grammaire que le reste — le biseau dit ce qui
     est en relief, la couleur LCD dit ce qui est actif. */
  .ecoute {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }
  .ecoute-btn {
    flex: 1;
  }
  .ecoute-btn.actif {
    color: var(--xp-lcd);
    box-shadow: inset 1px 1px 0 var(--xp-shadow), inset -1px -1px 0 var(--xp-light);
  }

  .choix-pas {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
  }

  .valider {
    margin-top: 10px;
  }
  /* Le brief du client passe AVANT la fiche du niveau, et se lit comme une
     phrase dite : c'est la seule chose de cet écran qui ne soit pas de la
     documentation. */
  .commande {
    margin: 0 0 6px;
    padding: 6px 8px;
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    border-radius: 2px;
    font-size: var(--xp-size-body);
    line-height: 1.45;
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

  /* --- Verbes de paramètre --- */
  .versions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .version {
    flex: 1 1 0;
    min-width: 90px;
    padding: 10px 6px;
  }
  .version.joue {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  .choix-noms {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .reglage {
    margin-bottom: 10px;
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
