<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { game, LEVELS, tierForAttempts, GAME_DRUM_ROWS } from '../../stores/game.svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { GameDrumRowName } from '../../model/presets/levels';
  import type { SynthRowName } from '../../model/types';
  import { parametre } from '../../model/parametres';
  import { repereDeNiveau, acteParId } from '../../model/carriere';
  import { analyserLigne } from '../../model/locuteurs';
  import { noterSession, sessionReprise } from '../../stores/session.svelte';
  import { noteNameForScaleDegree } from '../../model/presets/scales';
  import { chordsFor, scaleFor } from '../../engine/harmony';
  import { PRESETS } from '../../model/presets/songs';
  import XpSlider from '../xp/XpSlider.svelte';
  import {
    PARFAIT_MS,
    TOLERANCE_MS,
    SEUIL_JUSTESSE,
    ecartAuClic,
    medianeDesEcarts,
    aUneVersion,
    type ExerciseKind,
  } from '../../model/exercises';
  import { latence } from '../latence.svelte';
  import CalibrageLatence from '../xp/CalibrageLatence.svelte';
  import XpWindow from '../xp/XpWindow.svelte';
  import CarriereView from './CarriereView.svelte';
  import RappelCalibrage from '../xp/RappelCalibrage.svelte';

  let {
    onGoAtelier,
    onGoScene,
    onGoMontage,
  }: { onGoAtelier?: () => void; onGoScene?: () => void; onGoMontage?: () => void } = $props();

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
   * (docs/plan/03-journal-migration.md, « Architecture du Mode jeu » ;
   * arbitrage du 2026-08-23). La
   * salle de répétition — les 41 niveaux — reste atteignable d'un bouton :
   * « pas de scénario qui enferme l'outil » (HISTOIRE.md). */
  /* ⚠️ L'ÉCRAN SE RETIENT, mais seulement si l'étape est TOUJOURS un exercice.
     Un rechargement au milieu d'un exercice renvoyait à la carrière, donc à un
     « Au travail ▸ » de plus. Restaurer sans la garde serait pire : rien ne
     force cet écran à revenir à la carrière (`continuerCarriere` le fait à la
     main), donc sur une étape de RÉCIT on afficherait la grille d'un niveau du
     réservoir comme si c'était l'étape en cours.
     ⚠️ La GRILLE, elle, ne revient pas : la cible est tirée au sort à chaque
     `startLevel`, donc la restaurer demanderait d'enregistrer la cible avec.
     On retrouve l'exercice, pas les cases déjà posées. */
  let ecran = $state<'carriere' | 'exercice'>(
    sessionReprise()?.ecranJeu === 'exercice' && game.etapeCourante?.kind === 'exercice'
      ? 'exercice'
      : 'carriere',
  );
  $effect(() => noterSession({ ecranJeu: ecran }));

  // Curseur visuel : consommé à chaque frame contre l'horloge audio, comme
  // dans l'Atelier (AtelierView.svelte) — sans cette boucle, aucune case ne
  // s'illumine pendant la lecture et il est impossible de suivre le rythme.
  let playhead = $state<Record<GameDrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
  /* La ligne de synthé a son propre curseur : elle ne fait pas partie des trois
     lignes de batterie, et `PlayheadEvent.name` couvre déjà les lignes de
     synthé. ⚠️ Elle n'est plus forcément la BASSE — le niveau la déclare
     (`melodie.ligne`), depuis que l'acte 3 travaille aussi la mélodie. */
  let playheadBass = $state(-1);
  /* ⚠️ L'ARRANGEMENT joue N lignes de deux natures : un curseur par NOM, pas
     un par nature. Les deux curseurs ci-dessus restent — ils servent les
     verbes qui n'ont qu'une grille — mais celui-ci ne suppose rien. */
  let playheadArr = $state<Record<string, number>>({});
  /* Le nom des trois lignes de synthé, du point de vue du joueur. Une seule
     définition : deux libellés pour la même ligne finissent par diverger. */
  const LIBELLE_LIGNE: Record<SynthRowName, string> = {
    bass: 'la basse',
    pad: 'la nappe',
    melody: 'la mélodie',
  };
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as GameDrumRowName] = ev.col;
      if (ev.name === game.level.melodie.ligne) playheadBass = ev.col;
      if (ex === 'arrangement') playheadArr[ev.name] = ev.col;
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
  /* Où en est la lecture SUR L'ÉCRAN, quand les lignes n'ont pas la même
   * longueur.
   *
   * ⚠️ Le moteur donne le pas DANS LA LIGNE : une batterie d'une mesure renvoie
   * 0..7 même pendant la deuxième mesure. Afficher ce nombre tel quel allumerait
   * la première moitié de l'écran pendant toute la boucle — la tête de lecture
   * mentirait sur l'endroit où on est. On retrouve donc la mesure courante sur
   * la ligne la plus LONGUE (la seule qui compte les mesures) et on décale les
   * autres d'autant. */
  function mesureCourante(): number {
    const a = game.level.arrangement;
    if (!a) return 0;
    let max = 0;
    let col = -1;
    for (const l of game.arrLignes) {
      const n = game.arrCible[l.nom]?.length ?? 0;
      const c = playheadArr[l.nom];
      if (n > max && c !== undefined && c >= 0) {
        max = n;
        col = c;
      }
    }
    return col < 0 || !a.subdiv ? 0 : Math.floor(col / a.subdiv);
  }
  function playheadCol(l: { nom: string }, col: number, n: number): boolean {
    const c = playheadArr[l.nom];
    if (c === undefined || c < 0 || !n) return false;
    const total = game.arrColonnes || n;
    // Une ligne aussi longue que la boucle : le pas EST la colonne.
    if (n >= total) return c === col;
    const a = game.level.arrangement;
    return col === mesureCourante() * (a?.subdiv ?? n) + c;
  }

  function resetPlayhead() {
    playhead = { kick: -1, snare: -1, hat: -1 };
    playheadBass = -1;
    playheadArr = {};
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
    /* ⚠️ Un « jouer » se valide TOUT SEUL — retour de jeu : « ce n'est pas
       clair qu'il suffit de dépasser 70 % ». Il n'y a plus de bouton à
       trouver ; dès que dix frappes tiennent le seuil, le niveau est gagné et
       la lecture s'arrête (`verify` appelle `stopAll`).
       ⚠️ On DEMANDE d'abord (`jouerPret`) au lieu de laisser `verify` trancher :
       `verify` compte un essai à chaque appel, donc un appel par frappe
       coûterait les étoiles du niveau. */
    if (game.jouerPret()) verify();
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
    /* ⚠️ Les quatre mesures d'`intrus` sont de la MATIÈRE à écouter, pas « ma
     * version » : comptées dans le `else` jusqu'au 2026-09-19, elles faisaient
     * dire au roast « et en plus t'as réécouté ta propre version » à un verbe
     * qui n'en a pas. `guessPlays` ne compte que le bouton « 🎧 Écouter ma
     * version », donc les seuls verbes de `VERBES_AVEC_VERSION`. */
    if (which === 'guess') game.guessPlays++;
    else game.loopPlays++;
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
    // Compté : c'est la seule écoute qu'un verbe de paramètre produise, et le
    // roast de fin s'en sert (voir `composerRoast`).
    game.paramEcoutes++;
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

  // Un raté ne laisse AUCUNE trace pour « intrus » : il n'y a pas de case à
  // verrouiller, donc rien à l'écran ne dirait que la réponse a été examinée.
  // Sans ce drapeau, cliquer sur ✓ Vérifier semble ne rien faire.
  //
  // ⚠️ `Partial`, et « jouer » n'y est plus : sa validation est automatique,
  // donc il n'a plus d'essai RATÉ — un message écrit pour un chemin que rien
  // n'emprunte est du code que la prochaine lecture croira vivant.
  let echec = $state(false);
  const MSG_ECHEC: Partial<Record<ExerciseKind, string>> = {
    style: 'Ce n’est pas ce genre-là. Réécoute : le tempo, la place de la caisse claire, ce que fait le hi-hat.',
    laverie: 'Ce n’est pas celle-là. Compare les deux haut-parleurs : ce qui compte, c’est ce qui reste.',
    melodie: 'Pas encore. Les notes justes sont verrouillées ✓ — reprends les autres.',
    arrangement: 'Pas encore. Ce qui est juste est verrouillé ✓ — ligne par ligne, reprends le reste.',
    silence: 'Ce n’est pas là. Réécoute la boucle : le trou est ailleurs.',
    reproduire: 'Pas encore. Les cases justes sont verrouillées ✓ — reprends les autres.',
    completer: 'Pas encore. Les cases justes du temps manquant sont verrouillées ✓.',
    intrus: 'Ce n’est pas celle-là. Réécoute les quatre mesures.',
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
  function allerAuNiveau(id: number) {
    stopAll();
    echec = false;
    // Choisir un niveau dans la carte, c'est répéter, pas avancer dans le
    // récit : sans cette ligne, réussir un niveau choisi à la main ferait
    // progresser la carrière d'une étape qu'on n'a pas jouée.
    game.enCarriere = false;
    // ⚠️ Par IDENTIFIANT. C'était `startLevel(id - 1)`, une position déduite
    // d'un id — faux pour huit niveaux, dont les arrangements 75-78 : on
    // cliquait « 77 » et on jouait le 78.
    game.startLevelById(id);
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
  /* ⚠️ La salle parle en ACTES, pas en numéros de tableau. Elle affichait
     l'`id` brut — « 39 », « 67 » — alors que son propre commentaire disait déjà
     qu'on refait « celui d'avant, pas le 39 ». Un id est un identifiant : il ne
     situe rien pour le joueur, et depuis que le tableau n'est plus trié il ne
     dit même plus l'ordre. On regroupe donc par acte, et chaque exercice porte
     son rang DANS l'acte (voir `repereDeNiveau`). */
  /* ⚠️ Les CAHIERS aussi (2026-09-04) : *« les exercices en ateliers, on doit
     pouvoir y retourner dans la salle de répétition »*. Ils n'y étaient pas
     parce que la salle listait des NIVEAUX — or une commande n'est pas un
     niveau, elle n'a pas d'`id`. Conséquence à ne pas rater : un acte peut
     n'avoir AUCUN exercice et quand même des cahiers (l'acte 4 se joue
     entièrement à l'Atelier), donc le groupement se construit sur les deux
     sources, pas sur les niveaux avec les cahiers en supplément. */
  type GroupeSalle = {
    acte: number;
    titre: string;
    niveaux: { l: (typeof LEVELS)[number]; rang: number }[];
    cahiers: { acte: number; etape: number; entete: string; client: string }[];
  };
  const parActe = $derived.by(() => {
    const groupes: GroupeSalle[] = [];
    const groupe = (acte: number): GroupeSalle => {
      let g = groupes.find((x) => x.acte === acte);
      if (!g) {
        g = { acte, titre: acteParId(acte).titre, niveaux: [], cahiers: [] };
        groupes.push(g);
      }
      return g;
    };
    for (const l of niveauxOuverts) {
      const r = repereDeNiveau(l.id);
      if (!r) continue; // le réservoir n'a pas de nom dans le jeu
      groupe(r.acte).niveaux.push({ l, rang: r.rang });
    }
    for (const c of game.commandesDeRepetition) groupe(c.acte).cahiers.push(c);
    for (const g of groupes) g.niveaux.sort((a, b) => a.rang - b.rang);
    return groupes.sort((a, b) => a.acte - b.acte);
  });
  const compteAffiche = $derived(parActe.reduce((n, g) => n + g.niveaux.length, 0));
  const compteCahiers = $derived(parActe.reduce((n, g) => n + g.cahiers.length, 0));

  /* Refaire un cahier : le store retient l'étape et ouvre l'Atelier sur elle,
     sans toucher au curseur du récit. La vue ne fait que naviguer — et coupe
     ce qu'elle faisait sonner, comme pour la scène. */
  function repeterCahier(acte: number, etape: number) {
    if (!game.repeterCommande(acte, etape)) return;
    stopAll();
    showMap = false;
    onGoAtelier?.();
  }
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
  /* Le nom d'une ligne d'arrangement — batterie ou synthé, même carte : la
     vue ne sait pas d'avance laquelle des huit le niveau va citer. */
  const NOM_LIGNE: Record<string, string> = {
    kick: 'Kick', snare: 'Snare', hat: 'Hat', clap: 'Clap', shaker: 'Shaker',
    bass: 'Basse', melody: 'Mélodie', pad: 'Nappe',
  };

  /* Les degrés, du plus HAUT en haut — comme sur une portée, et comme sur le
     pad de l'Atelier. Une grille de hauteurs qui monterait vers le bas
     demanderait de retourner ce qu'on entend avant de le poser. */
  /* Le CLAVIER de l'exercice de mélodie : les degrés dans l'ordre, grave à
     gauche, comme un instrument. L'ancien rouleau les listait à l'envers
     (aigu en haut) parce qu'ils étaient un AXE ; ils sont maintenant des
     touches. */
  const clavier = $derived(Array.from({ length: lvl.melodie.degreMax }, (_, i) => i + 1));

  /* ⚠️ LE NOM RÉEL DE CHAQUE DEGRÉ, comme sur le clavier de l'Atelier.
   *
   * *« La manière de remplir est très différente du clavier. Il faut
   * s'accorder. En effet, l'idée du mode carrière, c'est de pouvoir
   * s'approprier les outils. »* (Yann, 2026-09-16). Le pad de l'Atelier écrit
   * « Do / 1 » sur chaque touche : le nom qu'on cherche en jouant, le chiffre
   * qui permet de retrouver la case. Ici il n'y avait que le chiffre — donc un
   * geste qui ressemble à l'outil sans en parler la langue, sur l'acte qui
   * existe pour y préparer.
   *
   * Lu sur l'état que le niveau fait sonner (`buildState`), jamais sur une
   * liste en dur : un niveau qui change de tonalité rebaptise ses touches,
   * exactement comme dans le Synthé. */
  const nomsDegres = $derived.by(() => {
    const st = game.buildState('target');
    return [1, 2, 3, 4, 5, 6, 7].map((d) =>
      noteNameForScaleDegree(scaleFor(st), st.synthGlobal.rootMidi, d),
    );
  });

  /* Et pour la NAPPE, le nom de la FONDAMENTALE de chaque accord plus son
     chiffrage — même service que `nomsDegres`, même source que le pad de
     l'Atelier (`NotePad.nomsAccords`). « I » ne dit rien à qui ne lit pas le
     chiffrage, « Do » si. La case de la nappe porte un index d'accord, pas un
     degré : la touche `d` écrit l'accord `d − 1`. */
  const nomsAccords = $derived.by(() => {
    const st = game.buildState('target');
    return chordsFor(st).map((c) => ({
      nom: noteNameForScaleDegree(scaleFor(st), st.synthGlobal.rootMidi, c.root),
      chiffre: c.roman,
    }));
  });

  /* Ce que la touche `d` écrit sur la ligne visée, dit en deux lignes comme
     dans l'Atelier : le nom au-dessus, le repère de la grille dessous. */
  function libelleTouche(ligne: string, d: number): { nom: string; deg: string } {
    if (ligne === 'pad') {
      const a = nomsAccords[d - 1];
      return { nom: a?.nom ?? String(d), deg: a?.chiffre ?? String(d) };
    }
    return { nom: nomsDegres[d - 1] ?? String(d), deg: String(d) };
  }

  /* ⚠️ LE SON À LA TOUCHE — *« c'est dommage de ne pas entendre le son à la
   * touche »* (Yann, 2026-09-16). Le clavier de l'Atelier joue la note qu'il
   * s'apprête à écrire (`NotePad.tap` → `onPreview`) ; celui du Mode jeu
   * écrivait en silence, dans un exercice où la seule chose à juger est une
   * hauteur. On reposait une phrase de mémoire sans pouvoir s'accorder.
   *
   * Même aiguillage que l'Atelier : la nappe joue un ACCORD (son index vaut
   * degré − 1), les deux autres lignes un degré. Une nappe passée à
   * `playDegreePreview` ne sonnerait pas ce que la grille joue. */
  function entendreDegre(ligne: string, d: number): void {
    if (ligne === 'pad') engine.playChordPreview(d - 1);
    else if (ligne === 'bass' || ligne === 'melody') engine.playDegreePreview(ligne, d, 0);
  }

  /* Le pas sélectionné — c'est lui que le clavier écrit. La tonique du premier
     pas étant donnée et verrouillée, on démarre sur le pas suivant : rien à
     faire sur le premier, et une sélection qui n'accepte rien se lit comme un
     bouton mort. */
  let melSel = $state(1);

  /** Le prochain pas où l'on peut écrire, en tournant. */
  function prochainLibre(depuis: number): number {
    const n = game.melodieCible.length;
    for (let k = 1; k <= n; k++) {
      const i = (depuis + k) % n;
      if (!game.melodieLocked[i]) return i;
    }
    return depuis;
  }

  /* Écrire un degré sur le pas choisi, puis AVANCER — c'est le geste
     d'écriture, pas un formulaire : on entend la phrase, on la pose de gauche
     à droite. Reposer le même degré l'efface (même geste que la case de
     batterie qui s'éteint), et on ne bouge alors pas : effacer puis sauter
     ferait perdre la case qu'on voulait corriger. */
  function ecrireDegre(d: number): void {
    if (game.melodieLocked[melSel]) return;
    const avant = game.melodieGuess[melSel];
    game.poserNote(melSel, d);
    echec = false;
    if (avant !== d) melSel = prochainLibre(melSel);
  }

  /* ⚠️ EFFACER EST UNE TOUCHE, et elle AVANCE — la même que dans l'Atelier
     (« ∅ / vide », `NotePad.silence`). Le `⌫` d'ici rejouait le degré déjà
     posé pour l'annuler et restait sur place : un geste qui n'existe nulle
     part ailleurs dans l'appli, et qui demandait de savoir ce qu'on avait
     écrit pour l'effacer. */
  function effacerPas(): void {
    if (game.melodieLocked[melSel]) return;
    const pose = game.melodieGuess[melSel];
    if (pose) game.poserNote(melSel, pose);
    echec = false;
    melSel = prochainLibre(melSel);
  }

  /* La sélection suit la grille : un niveau qui change, ou une case qui vient
     de se verrouiller, la déplacent vers le prochain pas où l'on peut écrire.
     
     ⚠️ Le `n === 0` n'est pas de la prudence : au tout premier rendu la cible
     n'est pas encore tirée, et sans cette garde l'effet ramenait la sélection
     sur le pas 0 — celui de la tonique, verrouillé. Le clavier n'écrivait
     alors nulle part, ce qui se lit exactement comme un bouton mort. */
  $effect(() => {
    const n = game.melodieCible.length;
    if (n === 0) return;
    if (melSel >= n || game.melodieLocked[melSel]) melSel = prochainLibre(-1);
  });

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

  /* LES PARTIES ENREGISTRÉES, telles qu'on peut les reprendre.
   *
   * `game.progress` est un Record indexé par pseudo, et `load()` le lit au
   * démarrage — AVANT qu'un pseudo soit choisi. La liste existait donc déjà
   * en mémoire, sans écran pour la dire.
   *
   * ⚠️ « master » est exclu : il ne persiste rien (`setPseudo` efface sa clé
   * pour ne pas devenir un accès total invisible), donc une entrée à son nom
   * ne serait qu'un mirage — et la proposer inviterait à s'en servir.
   *
   * ⚠️ On lit `carriere`, pas `level` : c'est le RÉCIT qui dit où l'on
   * reprend. `level` décrit le réservoir, que la carrière cite dans le
   * désordre — il ne situe personne.
   *
   * Le repli `?? { acte: 0, etape: 0 }` couvre les sauvegardes d'avant le
   * double curseur : elles reprennent au début, ce qui est vrai.
   */
  /* Le profil dont on vient de demander la suppression — la confirmation est
     écrite dans la liste, pas dans une boîte du navigateur. */
  let aSupprimer = $state<string | null>(null);

  const reprises = $derived.by(() =>
    Object.entries(game.progress)
      .filter(([nom]) => nom.toLowerCase() !== 'master')
      .map(([nom, p]) => {
        const acte = p.carriere?.acte ?? 0;
        const etape = p.carriere?.etape ?? 0;
        const a = acteParId(acte);
        const e = a.etapes[etape];
        // Toutes les étapes n'ont pas d'entête — un exercice cite un niveau.
        // Pas de libellé inventé : on dit l'acte, et l'entête quand elle existe.
        const entete = e && 'entete' in e ? e.entete : null;
        return { pseudo: nom, acte, ou: `ACTE ${acte} — ${a.titre}${entete ? ` · ${entete}` : ''}` };
      })
      // Le plus avancé d'abord : on vient ici pour REPRENDRE.
      .sort((x, y) => y.acte - x.acte || x.pseudo.localeCompare(y.pseudo, 'fr')),
  );
</script>

<!-- ÉTAPE 5 : data-theme="noir" retiré. Le Mode jeu avait son propre
     thème sombre ; il parle désormais la langue commune. -->
<svelte:window onkeydown={surTouche} />

<div class="game">
  {#if !game.pseudo}
    <XpWindow title="Face B" icon="🎮" accent="none">
      <!-- ⚠️ Les parties enregistrées viennent AVANT le champ, et pas par
           politesse : cet écran ne s'affiche qu'à deux moments — un joueur
           tout neuf (la liste est alors vide, donc rien ne bouge) et un clic
           sur « Changer de joueur ». Dans le second cas, on vient précisément
           pour en reprendre une. La progression était déjà rangée par pseudo
           (`game.progress`) : il ne manquait que de la MONTRER — retaper son
           nom à l'identique était le seul chemin vers sa propre partie. -->
      {#if reprises.length}
        <p class="lead">Reprendre une partie :</p>
        <ul class="reprises">
          {#each reprises as r (r.pseudo)}
            <li>
              <!-- ⚠️ SUPPRIMER UN PROFIL — *« il faut pouvoir supprimer les
                   profils »* (Yann, 2026-09-16). Une liste de parties qui ne
                   sait que grandir finit par présenter le jeu par les essais
                   des autres : trois « test », deux « aaa », et sa propre
                   partie quelque part dedans.
                   Deux gestes, pas un : un profil porte des heures de travail
                   et quatre jeux de données (progression, besace,
                   discographie, banque). D'où la confirmation ÉCRITE plutôt
                   qu'un `confirm()` du navigateur — le seul élément clair de
                   l'écran serait une boîte système.
                   ⚠️ Et elle REMPLACE la ligne au lieu de s'y ajouter : posée
                   à côté, elle rognait la partie à 104 px de large (mesuré) et
                   ses deux boutons tombaient à 18 px de haut. Une ligne, une
                   question. -->
              {#if aSupprimer === r.pseudo}
                <span class="confirme">
                  <span class="avert">Effacer la partie de {r.pseudo} ?</span>
                  <span class="confirme-actions">
                    <button
                      class="xp-btn tap44-y"
                      onclick={() => {
                        game.supprimerJoueur(r.pseudo);
                        aSupprimer = null;
                      }}
                    >
                      Oui, effacer
                    </button>
                    <button class="xp-btn tap44-y" onclick={() => (aSupprimer = null)}>
                      Annuler
                    </button>
                  </span>
                </span>
              {:else}
                <button
                  class="reprise tap44-y"
                  onclick={() => {
                    game.setPseudo(r.pseudo);
                    ecran = 'carriere';
                  }}
                >
                  <span class="qui">{r.pseudo}</span>
                  <span class="ou">{r.ou}</span>
                </button>
                <button
                  class="xp-btn supprime tap44-y"
                  title="Supprimer la partie de {r.pseudo}"
                  onclick={() => (aSupprimer = r.pseudo)}
                >
                  ✕
                </button>
              {/if}
            </li>
          {/each}
        </ul>
        <p class="lead">Ou commence une nouvelle partie :</p>
      {:else}
        <p class="lead">Choisis un pseudo — c’est là que ta progression sera rangée.</p>
      {/if}
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
      onScene={() => {
        // Le concert : on coupe tout ce que le Mode jeu faisait sonner avant
        // de passer la main au Mode Live, sinon deux moteurs jouent ensemble.
        stopAll();
        onGoScene?.();
      }}
      onMontage={() => {
        // Monter le morceau : même précaution, l'Atelier a son propre moteur.
        stopAll();
        onGoMontage?.();
      }}
    />
  {:else}
    <XpWindow title={titreFenetre} icon="🎮" accent="none">
      <div class="head">
        <button class="xp-btn tiny" onclick={() => { stopAll(); ecran = 'carriere'; }}>◂ Carrière</button>
        <button class="player tap44-y" onclick={() => game.clearPseudo()} title="Changer de joueur">
          👤 {game.pseudo}
        </button>
        <!-- ⚠️ UN SEUL NOM. Ce bouton s'appelait « Carte » et ouvrait EXACTEMENT
             le panneau que le Mode carrière appelle « Salle de répétition » :
             deux noms pour un seul endroit, donc deux endroits dans la tête du
             joueur. « Répétition » plutôt que le nom complet parce que la barre
             en porte quatre à 390 px. -->
        <button class="xp-btn tiny" onclick={() => (showMap = !showMap)}>🗺️ Répétition</button>
        <button class="xp-btn tiny" onclick={() => (showBag = !showBag)}>🎒 Besace ({game.bag.length})</button>
      </div>
      <!-- La consigne d'un exercice de carrière est souvent une réplique de
           Sol : elle porte son nom comme partout ailleurs dans le récit
           (`model/locuteurs.ts`). -->
      {#if commande}
        {@const dite = analyserLigne(commande)}
        <p class="commande">
          {#if dite.qui}<span class="qui">{dite.qui.nom} —</span>{/if}{dite.texte}
        </p>
      {/if}
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
        <p class="salle-titre">SALLE DE RÉPÉTITION — <b>REFAIRE UN EXERCICE</b></p>
        {#each parActe as g (g.acte)}
          <p class="salle-acte">ACTE {g.acte} — {g.titre}</p>
          <div class="map">
            {#each g.niveaux as { l, rang } (l.id)}
              {@const stars = game.playerProgress.stars[String(l.id)] ?? 0}
              <button
                class="map-cell tap44-y"
                class:current={l.id === lvl.id && !game.enCarriere}
                title="{l.teach} (niveau {l.id})"
                aria-label="Acte {g.acte}, exercice {rang} — {l.teach}"
                onclick={() => {
                  allerAuNiveau(l.id);
                  showMap = false;
                }}
              >
                <span class="num">{rang}</span>
                <span class="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
              </button>
            {/each}
          </div>
          <!-- Les cahiers de l'acte. Ils portent un NOM, pas un rang : un
               cahier ne se numérote pas dans son acte, il s'appelle « LE
               TUNNEL — DEUXIÈME ENVOI ». -->
          {#each g.cahiers as c (c.acte + '.' + c.etape)}
            {@const etoiles = game.etoilesDeCommande(c.acte, c.etape)}
            <button
              class="cahier"
              title="Refaire ce cahier des charges — {c.client}"
              onclick={() => repeterCahier(c.acte, c.etape)}
            >
              <span class="cahier-nom">📠 {c.entete}</span>
              <span class="stars">{'★'.repeat(etoiles)}{'☆'.repeat(3 - etoiles)}</span>
            </button>
          {/each}
        {/each}
        <!-- ⚠️ Le compte est celui de ce qui est AFFICHÉ, pas des niveaux
             ouverts. Il disait « 78 exercices » sous un écran qui en montrait
             34 : la différence, c'est le réservoir, qui n'a pas de repère et
             donc pas de place ici. Un compte qui ne correspond pas à ce qu'on
             voit se lit comme un écran incomplet. -->
        {#if compteAffiche + compteCahiers === 0}
          <p class="muted">
            Rien à répéter pour l’instant : les exercices arrivent avec l’histoire.
          </p>
        {:else}
          <p class="muted">
            {compteAffiche} exercice{compteAffiche > 1 ? 's' : ''}{compteCahiers
              ? ` et ${compteCahiers} cahier${compteCahiers > 1 ? 's' : ''} des charges`
              : ''} —
            tout est rejouable, autant de fois que tu veux.
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
                  ? `🔊 Écouter ${LIBELLE_LIGNE[game.level.melodie.ligne]}`
                  : '🔊 Écouter le rythme à trouver'}
          </button>
          {#if aUneVersion(ex)}
            <!-- ⚠️ Pas de « ma version » pour le silence ni pour le style : on
                 ne pose rien sur la grille, on désigne un pas ou un genre. Le
                 bouton ne jouait donc jamais que du vide — et un bouton qui ne
                 fait rien se lit comme une panne, pas comme une absence.
                 ⚠️ La liste vit dans `VERBES_AVEC_VERSION` (`model/exercises`)
                 depuis le 2026-09-19 : le roast de fin la lisait AUSSI, en la
                 devinant, et reprochait ici une réécoute impossible. -->
            <button class="xp-btn" onclick={() => play('guess')}>
              {playingWhat === 'guess' ? '■ Stop' : '🎧 Écouter ma version'}
            </button>
          {/if}
        {/if}
        {#if ex !== 'melodie' && ex !== 'silence' && ex !== 'style' && ex !== 'jouer'}
          <!-- ⚠️ Pas de « Vérifier » ici pour la mélodie : le transport est
               au-dessus de la grille, et on lirait le bouton de validation
               avant ce qu'il valide. Il est repris sous le rouleau.
               ⚠️ Et plus aucun pour « jouer » : sa validation est AUTOMATIQUE
               (voir `frapper`). Le bouton ne pouvait réussir qu'à l'instant
               même où l'automatisme vient de le faire — donc un bouton qui ne
               fait jamais rien, et c'est lui qu'on croyait devoir trouver. -->
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
      {:else if ex === 'arrangement'}
        <!-- ⚠️ L'ARRANGEMENT : les DEUX grammaires d'édition du jeu, côte à
             côte, chacune gardée telle qu'elle est ailleurs.

             Une ligne de BATTERIE est un damier qu'on allume au clic — le
             geste de `reproduire`. Une ligne de SYNTHÉ est une bande de cases
             qui portent un degré : on VISE une case, et le clavier du bas
             l'écrit — le geste de `melodie`, et celui du pad de l'Atelier.

             Les deux partagent la même colonne : c'est ce qui permet de lire
             qui joue au même moment, et c'est le sujet de l'exercice. -->
        {#each game.arrLignes as l (l.nom)}
          {@const n = game.arrCible[l.nom]?.length ?? 0}
          {@const total = game.arrColonnes || n}
          {@const posees = (game.arrGuess[l.nom] ?? []).filter((v) => v > 0).length}
          {@const attendues = (game.arrCible[l.nom] ?? []).filter((v) => v > 0).length}
          {@const entendue = game.arrEcoute[l.nom] !== false}
          <div class="row" class:coupee={!entendue}>
            <div class="row-head">
              <!-- ⚠️ Le libellé EST le bouton d'écoute : une ligne coupée doit
                   se voir et se rendre au même endroit, et un second bouton par
                   ligne coûterait une colonne de plus sur un téléphone. -->
              <button
                class="row-label ecoute tap44-y"
                class:synthe={l.nature === 'degres'}
                class:muette={!entendue}
                aria-pressed={!entendue}
                title={entendue ? 'Couper cette ligne à l’écoute' : 'Rendre cette ligne à l’écoute'}
                onclick={() => game.arrBasculerEcoute(l.nom)}
              >
                <span class="hp">{entendue ? '🔊' : '🔇'}</span>{NOM_LIGNE[l.nom] ?? l.nom}
              </button>
              {#if n < total}
                <!-- Une ligne plus courte que la boucle : elle se répète, et
                     l'écran le dit plutôt que de laisser croire à un trou. -->
                <span class="cycle">×{total / n}</span>
              {/if}
              <span class="count" class:ok={posees === attendues}>{posees}/{attendues}</span>
            </div>
            <div class="cells" style:--cols={total}>
              {#each { length: total } as _, col (col)}
                {@const vrai = n ? col % n : 0}
                {@const echo = col >= n}
                {@const debutMesure = col > 0 && col % (game.level.arrangement?.subdiv ?? 8) === 0}
                {@const pose = game.arrGuess[l.nom][vrai]}
                {@const verrou = game.arrLocked[l.nom][vrai]}
                {@const montre = (game.solved || game.revealed) ? game.arrCible[l.nom][vrai] : pose}
                {#if l.nature === 'drum'}
                  <button
                    class="cell state-{montre}"
                    class:locked={verrou}
                    class:echo
                    class:debut-mesure={debutMesure}
                    class:revealed={game.revealed && game.arrCible[l.nom][vrai] > 0 && !verrou}
                    class:playing={playheadCol(l, col, n)}
                    class:win-flash={winFlash}
                    aria-label="{NOM_LIGNE[l.nom]}, pas {col + 1}{echo ? ' (répétition)' : ''}"
                    onclick={() => { game.arrCycler(l.nom, vrai); echec = false; }}
                  >
                    {#if verrou && !echo}<span class="mark">✓</span>{/if}
                  </button>
                {:else}
                  <button
                    class="cell arr-note"
                    class:vide={!montre}
                    class:echo
                    class:debut-mesure={debutMesure}
                    class:sel={game.arrSel?.ligne === l.nom && game.arrSel?.pas === vrai && !echo && !game.solved && !game.revealed}
                    class:locked={verrou}
                    class:revealed={game.revealed && game.arrCible[l.nom][vrai] > 0 && !verrou}
                    class:playing={playheadCol(l, col, n)}
                    class:win-flash={winFlash}
                    aria-label="{NOM_LIGNE[l.nom]}, pas {col + 1}{montre ? `, degré ${montre}` : ', vide'}{echo ? ' (répétition)' : ''}"
                    onclick={() => { game.arrViser(l.nom, vrai); echec = false; }}
                  >{montre > 0 ? montre : ''}</button>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
        {#if game.arrDesLignesCoupees}
          <p class="muted arr-coupe">
            Des lignes sont coupées à l’écoute — <b>elles restent à reposer</b>.
            <button class="lien" onclick={() => game.arrToutEntendre()}>Tout réentendre</button>
          </p>
        {/if}
        <!-- Le clavier écrit sur la case VISÉE, et dit laquelle : sans ce
             rappel, sept touches sans destination affichée sont un piège. -->
        {#if game.arrSel}
          {@const sel = game.arrSel}
          <p class="muted arr-vise">
            Le clavier écrit sur <b>{NOM_LIGNE[sel.ligne] ?? sel.ligne}</b>, pas
            {sel.pas + 1} — choisis une autre case pour le déplacer.
          </p>
          <div class="mel-clavier">
            <!-- ⚠️ Le clavier suit la LIGNE visée : la nappe joue des accords et
                 il n'y en a que quatre. Une cinquième touche y proposerait un
                 accord qui n'existe pas. -->
            <!-- ⚠️ Le son à la touche ici AUSSI, et les mêmes libellés : c'est
                 le même clavier que l'exercice de mélodie, et un degré qu'on
                 pose sans l'entendre se vise au hasard. La NAPPE suit la même
                 règle que dans l'Atelier — sa touche sonne un ACCORD et porte
                 le nom de sa fondamentale au-dessus de son chiffrage
                 (« Fa / IV »), parce que sa case porte un index d'accord et
                 pas un degré. Un seul `libelleTouche` pour les deux claviers :
                 deux libellés qui doivent rester d'accord finissent par ne
                 plus l'être. -->
            {#each Array.from({ length: game.arrDegreMax(sel.ligne) }, (_, i) => i + 1) as d (d)}
              {@const lib = libelleTouche(sel.ligne, d)}
              <button
                class="mel-touche tap44-y"
                class:actif={game.arrGuess[sel.ligne]?.[sel.pas] === d}
                disabled={game.solved || game.revealed}
                title="{lib.nom} ({lib.deg})"
                onpointerdown={(e) => {
                  e.preventDefault();
                  if (game.solved || game.revealed) return;
                  entendreDegre(sel.ligne, d);
                  game.arrPoserNote(d);
                  echec = false;
                }}
              >
                <span class="nom">{lib.nom}</span>
                <span class="deg">{lib.deg}</span>
              </button>
            {/each}
            <button
              class="mel-touche efface tap44-y"
              disabled={game.solved || game.revealed || !game.arrGuess[sel.ligne]?.[sel.pas]}
              aria-label="Effacer la note visée"
              onclick={() => game.arrPoserNote(game.arrGuess[sel.ligne][sel.pas])}
            >
              <span class="nom">∅</span>
              <span class="deg">vide</span>
            </button>
          </div>
        {/if}
      {:else if ex === 'melodie'}
        <!-- ⚠️ CELLULES + CLAVIER, comme dans l'Atelier (retour de Yann :
             « on devrait avoir la même interface que dans l'atelier non ? des
             cellules et un clavier ? comme ça, ça nous prépare »).
             
             C'était un ROULEAU : degrés en ordonnée, pas en abscisse, cinq
             rangées de huit boutons. Deux défauts. Il ne ressemblait à rien de
             ce que le joueur retrouvera dans le Synthé — l'acte 3 est censé
             l'y préparer — et quarante cases pour poser trois notes se lisent
             comme un tableur, pas comme un instrument.
             
             Ici : une ligne de cases qui EST la ligne de synthé visée, chacune
             portant son degré, et un clavier dessous. On choisit une case, on
             appuie sur un degré, la sélection avance — c'est le geste
             d'écriture du pad de l'Atelier. -->
        <!-- ⚠️ Une MESURE par rangée, cases et numéros ENTRELACÉS.
             Au-delà de huit pas la grille passe à la ligne (voir `.mel-cases`),
             et deux grilles empilées séparément mettaient alors les numéros
             1-8 sous la SECONDE rangée de cases : un « 5 » qui désigne le pas
             13. On découpe donc par tranches de huit, et chaque rangée porte
             ses propres numéros — c'est le même rendu qu'avant à huit pas. -->
        {#each Array.from({ length: Math.ceil(game.melodieCible.length / 8) }, (_, m) => m) as mes (mes)}
          {@const cols = Math.min(game.melodieCible.length - mes * 8, 8)}
          <div class="mel-cases" style:--cols={cols}>
            {#each game.melodieCible.slice(mes * 8, mes * 8 + 8) as _, i (i)}
              {@const col = mes * 8 + i}
              {@const pose = game.melodieGuess[col]}
              {@const montre = (game.solved || game.revealed) ? game.melodieCible[col] : pose}
              <button
                class="mel-case"
                class:vide={!montre}
                class:sel={melSel === col && !game.solved && !game.revealed}
                class:verrou={game.melodieLocked[col]}
                class:revelee={(game.solved || game.revealed) && !pose && game.melodieCible[col] > 0}
                class:playing={playheadBass === col}
                class:win-flash={winFlash}
                aria-label="Pas {col + 1}{montre ? `, degré ${montre}` : ', vide'}"
                onclick={() => {
                  melSel = col;
                  echec = false;
                }}
              >
                {montre > 0 ? montre : '·'}
              </button>
            {/each}
          </div>
          <div class="mel-pieds" style:--cols={cols}>
            {#each game.melodieCible.slice(mes * 8, mes * 8 + 8) as _, i (i)}
              <span class="mel-pas" class:fort={(mes * 8 + i) % 4 === 0}>{mes * 8 + i + 1}</span>
            {/each}
          </div>
        {/each}
        <!-- ⚠️ LE CLAVIER PARLE LA LANGUE DE CELUI DE L'ATELIER (2026-09-16).
             Trois écarts corrigés, et les trois se voient en jouant : la
             touche porte le NOM de la note au-dessus de son degré (« Do / 1 »,
             comme `NotePad`), elle SONNE quand on appuie, et effacer est une
             touche « ∅ vide » qui efface ET avance au lieu d'un `⌫` qui
             rejouait le degré posé pour l'annuler.
             `onpointerdown` + `preventDefault` comme dans l'Atelier : sur un
             écran tactile, attendre le `click` ajoute ~120 ms entre le doigt
             et le son, et le clic fantôme qui suit jouerait la note deux
             fois. -->
        <div class="mel-clavier">
          {#each clavier as d (d)}
            {@const lib = libelleTouche(lvl.melodie.ligne, d)}
            <button
              class="mel-touche tap44-y"
              class:actif={game.melodieGuess[melSel] === d}
              disabled={game.solved || game.revealed}
              title="{lib.nom} (degré {lib.deg})"
              onpointerdown={(e) => {
                e.preventDefault();
                if (game.solved || game.revealed) return;
                entendreDegre(lvl.melodie.ligne, d);
                ecrireDegre(d);
              }}
            >
              <span class="nom">{lib.nom}</span>
              <span class="deg">{lib.deg}</span>
            </button>
          {/each}
          <button
            class="mel-touche efface tap44-y"
            disabled={game.solved || game.revealed}
            aria-label="Effacer la note du pas {melSel + 1} et avancer"
            onpointerdown={(e) => {
              e.preventDefault();
              if (game.solved || game.revealed) return;
              effacerPas();
            }}
          >
            <span class="nom">∅</span>
            <span class="deg">vide</span>
          </button>
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
        <!-- ⚠️ Le rappel de calibrage ne vit QUE sur les verbes qui MESURENT une
             frappe — les quatre niveaux chronométrés que la carrière cite (64,
             65, 66 à l'acte 0, et le 38 à la balance de l'acte 7). Ailleurs, un
             retard ne change pas la note ; ici il la fausse entièrement tant que
             l'appareil n'est pas mesuré. Et surtout : pas un mot sur le
             navigateur, contrairement à `AvisLatence` — ce qui se mesure se
             corrige, il n'y a rien à fuir. -->
        <RappelCalibrage onCalibrer={ouvrirCalibrage} />
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
          <!-- ⚠️ Le seuil est MARQUÉ sur la jauge, et la barre passe au vert en
               le franchissant : le vert dit « fait » (CLAUDE.md), donc il dit
               ici exactement ce que « 70 % suffisent » essayait d'expliquer en
               mots sous un bouton qu'il fallait trouver. -->
          <div
            class="jauge"
            role="meter"
            aria-valuenow={game.justesse()}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="barre" class:atteint={game.justesse() >= SEUIL_JUSTESSE} style:width="{game.justesse()}%"></div>
            <span class="seuil" style:left="{SEUIL_JUSTESSE}%" aria-hidden="true"></span>
          </div>
          <!-- « 4/2 frappes » se lisait comme une erreur : la boucle tourne, les
               frappes s'accumulent d'un tour à l'autre, dépasser le compte est
               normal. On dit donc combien il en faut, pas une fraction.
               ⚠️ Et la RÈGLE est écrite là, sous la jauge qui la mesure : elle
               vivait dans un « (70 % suffisent) » qui ne disait pas que le
               niveau se validerait tout seul, ni combien de temps il faut
               tenir. Deux phrases, toutes deux vraies — celle qui reste à faire
               quand le seuil est tenu, celle qui énonce la règle sinon. -->
          <p class="chiffres">
            {game.frappes.length} frappe{game.frappes.length > 1 ? 's' : ''} — justesse {game.justesse()}&nbsp;%
            <br />
            <span class="muted">
              {#if game.solved}
                <!-- Une fois gagné, la règle est du passé : l'écran dit ce qui
                     vient d'arriver, pas ce qu'il reste à faire. -->
                Rythme tenu — le niveau s’est validé tout seul.
              {:else if game.justesse() >= SEUIL_JUSTESSE && game.frappes.length < game.coupsAValider}
                Tiens ce rythme : encore {game.coupsAValider - game.frappes.length} frappe{game.coupsAValider - game.frappes.length > 1 ? 's' : ''} et le niveau se valide.
              {:else}
                Le niveau se valide tout seul dès que {game.coupsAValider} frappes tiennent {SEUIL_JUSTESSE}&nbsp;%.
              {/if}
            </span>
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
          <!-- ⚠️ « Nouveau rythme » ment sur un niveau à GRILLE ÉCRITE : la
               cible y est posée dans les données, relancer redonne exactement
               la même — seul le tempo peut changer. Le bouton reste (il efface
               la proposition et remet le compteur d'essais à zéro), mais il
               dit ce qu'il fait. Même famille de défaut que le préambule qui
               annonce un rim shot jamais posé : c'est l'écran qui promet ce
               que le code ne tient pas. -->
          <button class="xp-btn tiny" onclick={() => { game.giveUp(); allerAuNiveau(game.levelIndex); }}>
            {game.level.grille ? 'Recommencer' : 'Nouveau rythme'}
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
  /* La ligne de basse : une case par pas, comme une ligne du séquenceur. */
  /* ⚠️ HUIT COLONNES AU PLUS, et une phrase de seize pas passe donc sur DEUX
     rangées. Mesuré : à seize colonnes, `min-height: 34px` sur la case donne
     589 px de large dans un conteneur de 330 — la grille débordait et se
     faisait COUPER, donc les six derniers pas étaient injoignables et
     l'exercice impossible. La page, elle, ne débordait pas : c'est un
     débordement de CONTENEUR, invisible à une mesure qui ne regarde que
     `document.documentElement`.
     Huit plutôt qu'un `auto-fill` : une rangée = une mesure, et c'est ce qui
     rend lisible un motif dont la seconde moitié reprend la première. */
  .mel-cases {
    margin: 8px 0 2px;
    display: grid;
    grid-template-columns: repeat(var(--cols, 8), 1fr);
    gap: 3px;
  }
  /* ⚠️ UNE CASE POSÉE N'EST PAS UNE CASE VALIDÉE — *« les touches sont vertes
     ce qui ne facilitent pas la lecture quand elles sont validées »* (Yann,
     2026-09-16). Les deux étaient du même vert plein : impossible de lire, sur
     une grille à moitié juste, ce qui était acquis et ce qui restait à
     corriger — donc impossible de savoir où reprendre.
     La grammaire du projet tranche : le VERT dit « allumé / fait » (CLAUDE.md),
     donc il appartient à la case verrouillée. Une note qu'on vient de poser
     n'est pas un état acquis, c'est une proposition : ambre sur le chrome,
     comme partout ailleurs dans l'appli. */
  .mel-case {
    aspect-ratio: 1;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--xp-btn-face);
    color: var(--xp-accent-amber);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    border-radius: 2px;
    cursor: pointer;
    padding: 0;
    font: inherit;
    font-size: var(--xp-size-body);
    font-weight: 700;
  }
  /* Une case vide est CREUSÉE et éteinte, une case posée est en relief et
     allumée : c'est la grammaire du séquenceur, pas une couleur de plus. */
  .mel-case.vide {
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd-dim);
    box-shadow: var(--xp-bevel-in);
    font-weight: 400;
  }
  .mel-case.sel {
    outline: 2px solid var(--xp-accent-amber);
    outline-offset: -2px;
  }
  .mel-case.playing {
    border-color: var(--xp-accent-amber);
  }
  /* Validée : verte et pleine, comme le ✓ d'une case de batterie verrouillée.
     Plus d'`opacity` — un vert délavé se lisait comme un vert un peu moins
     vert, ce qui ne dit rien. */
  .mel-case.verrou {
    cursor: default;
    background: var(--xp-lcd);
    color: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-in);
  }
  .mel-case.revelee {
    background: #123018;
    color: var(--xp-lcd);
  }
  .mel-case.win-flash:not(.vide) {
    background: #7dffa0;
  }
  /* Les numéros suivent les cases, colonne pour colonne : deux grilles qui
     doivent rester alignées ne peuvent pas avoir deux comptes de colonnes. */
  .mel-pieds {
    display: grid;
    grid-template-columns: repeat(var(--cols, 8), 1fr);
    gap: 3px;
    margin-bottom: 8px;
  }
  .mel-pieds .mel-pas {
    font-size: var(--xp-size-tag);
    color: var(--xp-lcd-dim);
    text-align: center;
  }
  .mel-pieds .mel-pas.fort {
    color: var(--xp-muted);
  }
  /* Le clavier — des touches, pas des cases : elles ne portent pas d'état de
     grille, elles écrivent dans celle du dessus. */
  /* Une case de DEGRÉ dans la grille de l'arrangement : c'est une case du
     damier (même taille, même biseau) qui porte un chiffre au lieu d'un état.
     Elle emprunte sa teinte à la ligne de synthé de l'Atelier — le violet —
     pour qu'on voie d'un coup d'œil quelles lignes se jouent au clavier. */
  /* Une ligne COUPÉE à l'écoute : elle reste lisible et éditable — ce n'est
     pas un verrou, c'est un casque qu'on enlève. */
  .row.coupee .cells { opacity: 0.55; }
  .row-label.ecoute {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .row-label.ecoute .hp { font-size: 0.9em; opacity: 0.75; }
  .row-label.muette { color: var(--xp-text-dim, #8a8fa3); }
  .cycle {
    margin-left: 6px;
    font-size: var(--xp-size-xs, 10px);
    color: var(--xp-accent-amber, #d9a441);
  }
  /* Les mesures RÉPÉTÉES d'une ligne courte : même contenu, moins fort. On les
     montre plutôt que de laisser un blanc — le blanc se lirait comme un
     silence, alors que la ligne joue. */
  .cell.echo { opacity: 0.45; }
  /* ⚠️ Le trait de MESURE. Sans lui, seize cases se lisent comme une seule
     mesure de seize — c'est-à-dire deux fois plus vite — et « la deuxième
     moitié n'est pas la copie de la première » devient invérifiable à l'œil. */
  .cell.debut-mesure { box-shadow: inset 2px 0 0 var(--xp-accent-amber, #d9a441); }
  .arr-coupe .lien {
    background: none;
    border: 0;
    padding: 0;
    font: inherit;
    color: var(--xp-accent-amber, #d9a441);
    text-decoration: underline;
    cursor: pointer;
  }

  .salle-titre {
    margin: 10px 0 2px;
    font-size: var(--xp-size-tag);
    letter-spacing: var(--xp-ls-tag);
    color: var(--xp-muted);
  }
  /* Un cahier prend toute la largeur : son nom est une phrase, pas un numéro,
     et le tronquer sur une grille de cases le rendrait illisible. */
  .cahier {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    margin: 0 0 4px;
    padding: 7px 9px;
    text-align: left;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    border: 0;
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-family: var(--xp-font);
    font-size: var(--xp-size-btn);
    letter-spacing: var(--xp-ls-btn);
  }
  .cahier:active {
    box-shadow: var(--xp-bevel-in);
  }
  .cahier .cahier-nom {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cahier .stars {
    color: var(--xp-lcd);
    flex: 0 0 auto;
  }
  .salle-acte {
    margin: 10px 0 4px;
    font-size: var(--xp-size-small);
    letter-spacing: 0.12em;
    color: var(--xp-accent-amber);
  }

  .cell.arr-note {
    color: var(--xp-lcd);
    font-weight: 700;
    font-size: 11px;
  }
  .cell.arr-note.vide { color: transparent; }
  .cell.arr-note.sel {
    outline: 2px solid var(--xp-accent-amber);
    outline-offset: -2px;
  }
  .row-label.synthe { color: var(--xp-accent-amber); }
  .arr-vise { margin: 2px 0 0; }

  .mel-clavier {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  /* Deux lignes par touche — le NOM au-dessus, le DEGRÉ dessous : exactement
     la touche du pad de l'Atelier (`NotePad`, `.key .nom` / `.key .deg`).
     44 px de haut : c'est la cible tactile de référence du projet, et une
     touche à deux lignes n'a plus de raison de descendre à 40. */
  .mel-touche {
    flex: 1 1 0;
    min-width: 38px;
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    padding: 2px 0;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    border-radius: 2px;
    cursor: pointer;
    font: inherit;
    font-size: var(--xp-size-body);
    font-weight: 700;
    touch-action: manipulation;
  }
  .mel-touche:active {
    box-shadow: var(--xp-bevel-in);
  }
  .mel-touche .nom {
    display: block;
    font-size: 11px;
    line-height: 1.1;
  }
  /* Le degré s'efface sans disparaître : c'est le nom qu'on cherche en
     jouant, le chiffre sert à retrouver la case de la grille — même
     hiérarchie que dans l'Atelier. */
  .mel-touche .deg {
    display: block;
    font-size: 9px;
    font-weight: 400;
    color: var(--xp-muted);
    font-variant-numeric: tabular-nums;
  }
  .mel-touche.actif {
    color: var(--xp-lcd);
    border-color: var(--xp-lcd-dim);
  }
  .mel-touche.actif .deg {
    color: var(--xp-lcd);
  }
  /* « vide » est un mot, pas un chiffre : 44 px ne le contiennent pas. */
  .mel-touche.efface {
    flex: 0 0 56px;
    color: var(--xp-muted);
    font-weight: 400;
  }
  .mel-touche:disabled {
    opacity: 0.45;
    cursor: not-allowed;
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
  /* Le nom de qui parle, même grammaire que dans le Mode carrière : ambre,
     interlettré, devant le tiret. */
  .commande .qui {
    color: var(--xp-accent-amber);
    letter-spacing: var(--xp-ls-tag);
    /* L'espace est ici et pas dans le texte : entre deux `<span>` collés, un
       blanc de balisage serait avalé par la compilation. */
    margin-right: 5px;
  }
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
  .reprises {
    list-style: none;
    margin: 0 0 10px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  /* La ligne porte la partie ET son ✕ : la partie prend la place qui reste,
     la croix garde la sienne. */
  .reprises li {
    display: flex;
    align-items: stretch;
    gap: 4px;
    flex-wrap: wrap;
  }
  /* ⚠️ 44 px de LARGE, pas seulement de haut : `.tap44-y` ne monte que la
     hauteur, et une croix mesurée à 24 px de large reste une croix qu'on
     rate. La cible est la boîte elle-même — la rangée n'est pas serrée, mais
     un pseudo-élément de `.tap44` déborderait sur la ligne voisine. */
  .supprime {
    flex: 0 0 44px;
    color: var(--xp-accent-amber);
  }
  /* La confirmation PREND la ligne : un « Effacer X ? » qui s'ouvrirait
     ailleurs ne dirait pas de quelle partie il parle, et posé à côté d'elle il
     l'écrasait. */
  .confirme {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-face-dark);
  }
  .confirme .avert {
    font-size: 9px;
    letter-spacing: var(--xp-ls-1);
    color: var(--xp-accent-amber);
  }
  .confirme-actions {
    display: flex;
    gap: 6px;
  }
  .confirme-actions button {
    flex: 1;
  }
  .reprise {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 6px 8px;
    font-family: var(--xp-font);
    text-align: left;
    border: 1px solid var(--xp-line);
    background: var(--xp-btn-face);
    color: var(--xp-text);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
  }
  .reprise:active {
    box-shadow: var(--xp-bevel-in);
  }
  .reprise .qui {
    font-size: var(--xp-size-body);
  }
  /* Ambre et non vert : le vert dit « allumé / fait », et un point de reprise
     n'est pas un état accompli (CLAUDE.md, les tokens de couleur). */
  .reprise .ou {
    font-size: 9px;
    color: var(--xp-accent-amber);
    letter-spacing: var(--xp-ls-1);
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
    position: relative;
    height: 8px;
    margin-top: 8px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-lcd-bg);
  }
  .barre {
    height: 100%;
    /* Sous le seuil, la jauge n'annonce pas « fait » : l'ambre est la couleur
       de ce qui est posé mais pas validé (même règle que les cases de mélodie
       qu'on vient de poser). */
    background: var(--xp-accent-amber);
    transition: width 0.12s linear;
  }
  .barre.atteint {
    background: var(--xp-lcd);
  }
  /* Le trait du seuil, sur l'afficheur : le seul repère qui dise OÙ est la barre
     à atteindre.
     ⚠️ `--xp-lcd-dim` et pas `--xp-lcd` : le trait doit rester lisible DEVANT la
     barre (à 100 % un trait vert sur du vert n'existe plus) comme sur
     l'afficheur vide. Le segment ÉTEINT est le seul ton qui tienne les deux —
     et c'est la surface pour laquelle ce token est fait (CLAUDE.md), un fond
     d'afficheur noir. */
  .seuil {
    position: absolute;
    top: -1px;
    bottom: -1px;
    width: 2px;
    background: var(--xp-lcd-dim);
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
    /* ⚠️ LES CASES DU SILENCE grandissent aussi, et pour la même raison.
       Mesuré au doigt après le passage du niveau 52 à SEIZE pas (2026-09-04) :
       quatre rangées de boutons de 30 px, et seule la dernière atteignait
       44 px — les trois autres voyaient leur enveloppe recouverte par la
       rangée du dessous, si bien qu'un doigt posé en haut d'un numéro tombait
       sur celui d'au-dessus. Un bouton de choix n'est pas un dessin : il peut
       grandir. */
    .choix-pas .choix-btn {
      min-height: 44px;
    }
    /* ⚠️ LE CAHIER GRANDIT POUR DE VRAI, il ne prend pas d'enveloppe.
       Mesuré au doigt (`elementFromPoint` après `scrollIntoView`, en contexte
       tactile — `getBoundingClientRect` ne voit pas le pseudo-élément) : avec
       `.tap44-y`, quatorze lignes de 26 px empilées à 4 px d'écart voyaient
       leurs zones de 44 px se recouvrir de 14 px, si bien qu'un doigt posé en
       haut d'un cahier tombait sur celui du dessus. C'est le piège documenté
       dans CLAUDE.md — les enveloppes débordent et se marchent dessus — et ici
       il n'y a rien à protéger : une ligne de liste peut grandir, contrairement
       à une case de séquenceur. */
    .cahier {
      min-height: 44px;
      margin-bottom: 8px;
    }
  }
</style>
