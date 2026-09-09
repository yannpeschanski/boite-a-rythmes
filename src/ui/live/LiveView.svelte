<script lang="ts">
  // Mode Live — Phase 4 du plan (PLAN.md §7), dernière phase prévue :
  // l'inclinaison pilote enfin un paramètre, et les visualiseurs ②/③ mis de
  // côté en phase 2 redeviennent choisissables. Toujours accessible
  // seulement via #mode-live, absent de la navigation normale — App.svelte.
  //
  // Ce qui est réel maintenant :
  //  - chacun des 6 boutons pointe vers une action du catalogue
  //    (liveActions.ts) plutôt que de coder en dur "ce qu'il fait" ; les axes
  //    X/Y du pad et l'axe d'inclinaison pointent de la même façon vers un
  //    paramètre continu ;
  //  - l'inclinaison est CALIBRÉE au moment où on l'active (le gamma courant
  //    devient le zéro), jamais un zéro absolu — tenir le téléphone penché
  //    en le sortant de sa poche ne doit pas fausser le point neutre. Plage
  //    large et tolérante (±35°) plutôt que précise, comme discuté dans le
  //    diagnostic ergonomie (PLAN.md §7) ;
  //  - le visualiseur central a 3 variantes (barres/arty/défilement),
  //    réassignable comme le reste depuis l'overlay ⚙, toutes réagissant au
  //    vrai niveau de la ligne kick plutôt qu'à une horloge synthétique ;
  //  - l'overlay ⚙ permet de changer toutes ces associations (appui =
  //    option suivante, cycle) et les persiste dans localStorage ;
  //  - BREAK/FILL/MUTE/ROLL et le filtre/reverb restent les mêmes appels
  //    moteur qu'en phase 2 (AudioEngine.requestBreak/liveRequestFill/
  //    liveSetMute/liveSetHatRoll/setLiveFilterCutoff/setLiveReverbWet),
  //    juste indirectés par l'assignation courante.
  import { onMount, onDestroy, untrack } from 'svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { architecture } from '../../stores/architecture.svelte';
  import { parties } from '../../stores/parties.svelte';
  import { PARTIES, type PartieId } from '../../model/parties';
  import {
    cycleDuMotif,
    mesuresDeSection,
    dureeSecondes,
    mesuresTotales,
    formaterDuree,
    libelleDePartie,
    MONTAGES,
  } from '../../model/architecture';
  import { AudioEngine, type PadMode } from '../../engine/AudioEngine';
  import { barDuration, coupee } from '../../engine/groove';
  import { downloadBlob } from '../../engine/render-offline';
  import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';
  import type { DrumRowName, SynthRowName } from '../../model/types';
  import { niveauBarre, CHUTE_CAPUCHON } from '../xp/spectrumBands';
  import {
    actionById,
    axisById,
    actionsFor,
    axesFor,
    loadLiveAssignments,
    saveLiveAssignments,
    tirerMode,
    loadLiveSnapshots,
    saveLiveSnapshots,
    vizById,
    ACTIONS_TIRABLES,
    LIVE_ACTIONS,
    LIVE_AXES,
    AXIS_GROUPS,
    ACTION_GROUPS,
    LIVE_VIZ,
    SLOT_COUNT,
    SNAPSHOT_COUNT,
    type LiveActionId,
    type LiveAxisId,
    type LiveVizId,
    type SlotMode,
    type LiveAssignments,
  } from './liveActions';

  let { onExit }: { onExit: () => void } = $props();

  const engine = new AudioEngine(() => pattern.snapshot());
  const st = $derived(pattern.state);

  let playing = $state(false);
  let recording = $state(false);
  let breakArmed = $state(false);
  let fillArmed = $state(false);
  // Multiplicateur en cours (2/3/4) par ligne drum, ou null — chaque ligne
  // roll indépendamment des deux autres (catalogue étendu, PLAN.md §7).
  // rollHeld/muted n'ont pas d'entrée réellement utilisée pour clap/shaker —
  // portée du Mode Live pas étendue à ces deux lignes (PLAN.md §6, mute/roll
  // exclus de cette passe), présentes seulement pour satisfaire le type
  // Record<DrumRowName, …> désormais élargi.
  /* Mute du Mode Live — TERNAIRE : une clé absente veut dire « suivre le
     motif », `true` couper, `false` forcer ouvert. C'est ce qui permet au
     séquenceur ci-dessous de rouvrir une ligne coupée dans l'Atelier tout en
     n'écrivant jamais dans le motif (engine.liveSetMute, groove.coupee). */
  let liveMute = $state<Partial<Record<DrumRowName | SynthRowName, boolean>>>({});

  /** L'état RÉEL d'une ligne : ce qu'on entend, donc ce qu'on affiche. */
  function ligneCoupee(name: DrumRowName | SynthRowName): boolean {
    const motif =
      name in st.rows ? st.rows[name as DrumRowName].muted : st.synthRows[name as SynthRowName].muted;
    return coupee(motif, liveMute[name]);
  }
  // Bypass limiteurs (catalogue étendu, PLAN.md §7) : false = normal, comme
  // les mutes qui démarrent tous éteints plutôt que de refléter le réglage
  // réel du pattern.
  /* MODE NAPPE — trois états exclusifs, tenus par le moteur (padMode) parce
     que le bourdon court-circuite l'arpège dans l'ordonnanceur. Le miroir
     local sert seulement à l'affichage du bouton. */
  let padMode = $state<PadMode>('normal');
  // Écoute petit haut-parleur : false = sortie normale, comme les autres
  // bascules du Live, qui démarrent toutes éteintes.
  let petitHP = $state(false);
  // SOLO MÉLO (maintenu) : pendant que c'est tenu, le pad joue la mélodie au
  // doigt au lieu de ses axes habituels — voir padPointerDown/Move. Dernière
  // fréquence jouée gardée hors réactivité (juste pour le glide, pas pour
  // l'affichage) — reset à chaque nouvelle prise du bouton.
  let soloMelodyHeld = $state(false);
  let lastMelodyFreq: number | null = null;

  let assignments = $state(loadLiveAssignments());
  let assignOpen = $state(false);
  // Snapshots d'assignation (PLAN.md §7) : 3 emplacements A/B/C, appui court
  // = sauvegarde, appui long = rappel (voir onSnapshotPointerDown/Up).
  let snapshots = $state<(LiveAssignments | null)[]>(loadLiveSnapshots());

  let playhead = $state<Record<DrumRowName, number>>({ kick: -1, snare: -1, hat: -1, clap: -1, shaker: -1 });
  let synthPlayhead = $state<Record<SynthRowName, number>>({ bass: -1, pad: -1, melody: -1 });

  let isPortrait = $state(true);
  let tiltEnabled = $state(false);
  let tiltDenied = $state(false);
  let tiltGamma = $state(0); // inclinaison gauche/droite en degrés, lecture brute pour valider le flux sur device réel
  // Point neutre calibré au moment de l'activation (pas un zéro absolu) —
  // null tant qu'aucune lecture n'est encore arrivée depuis l'activation.
  let tiltCalibration = $state<number | null>(null);
  const TILT_RANGE = 35; // degrés de part et d'autre du point neutre pour couvrir 0..1 — large et tolérant, pas précis

  let padX = $state(0.5);
  let padY = $state(0.5);
  let pressed = $state<Record<number, boolean>>({});

  function isActionActive(actionId: LiveActionId): boolean {
    switch (actionId) {
      case 'break':
        return breakArmed;
      case 'fill':
        return fillArmed;
      case 'mute-drums':
        return DRUM_ROW_NAMES.every((n) => ligneCoupee(n));
      case 'mute-synth':
        return SYNTH_ROW_NAMES.every((n) => ligneCoupee(n));
      case 'petit-hp':
        return petitHP;
      case 'solo-melody':
        return soloMelodyHeld;
      case 'section-hold':
        return tenirSection;
      case 'step-pad-mode':
        // Un bouton PAS n'a pas d'état « engagé », sauf celui-ci : NORMAL est
        // le repos, arpège et bourdon s'entendent et doivent se voir.
        return padMode !== 'normal';
      default:
        return false;
    }
  }

  /* Bascule une ligne — appelée par le séquenceur (tap sur la ligne) comme
     par une action du catalogue. Elle part de l'état RÉEL, pas d'un compteur
     local : couper une ligne déjà coupée dans l'Atelier ne doit pas demander
     deux appuis. */
  function basculerLigne(name: DrumRowName | SynthRowName) {
    const suivant = !ligneCoupee(name);
    liveMute[name] = suivant;
    if (name in st.rows) engine.liveSetMute(name as DrumRowName, suivant);
    else engine.liveSetSynthMute(name as SynthRowName, suivant);
    hapticTick();
  }

  function toggleMute(name: DrumRowName) {
    basculerLigne(name);
  }

  function toggleSynthMute(name: SynthRowName) {
    basculerLigne(name);
  }

  // Dispatch générique : chaque slot ne sait plus "ce qu'il fait", seulement
  // quelle action lui est assignée — un bouton MUTE réassigné en ROLL doit se
  // comporter EXACTEMENT comme le bouton ROLL d'origine.
  function runAction(actionId: LiveActionId, on: boolean) {
    switch (actionId) {
      case 'break':
        if (on) engine.requestBreak();
        break;
      case 'fill':
        if (on) engine.liveRequestFill();
        break;
      case 'chaos':
        if (on) triggerChaos();
        break;
      case 'section-next':
        if (on) sauterSection();
        break;
      case 'section-hold':
        tenirSection = on;
        break;

      /* COUPURES DE GROUPE — le geste du drop. On lit l'état effectif du
         groupe pour décider du sens : si tout est déjà coupé, on rouvre. */
      case 'mute-drums':
        if (on) basculerGroupe(DRUM_ROW_NAMES);
        break;
      case 'mute-synth':
        if (on) basculerGroupe(SYNTH_ROW_NAMES);
        break;

      case 'petit-hp':
        if (on) {
          petitHP = !petitHP;
          engine.setPetitHautParleur(petitHP);
        }
        break;
      case 'solo-melody':
        soloMelodyHeld = on;
        engine.liveSetSynthMute('melody', on ? true : null);
        if (on) lastMelodyFreq = null;
        break;

      default: {
        const def = actionById(actionId);
        // Boutons PAS : chaque entrée porte directement son geste.
        if (on && def.kind === 'step') {
          def.step?.(engine);
          padMode = engine.padMode;
        }
        /* MAINTENUS : l'entrée est appelée à l'appui ET au relâché, et c'est
           elle qui sait revenir au repos. On lui passe le morceau courant —
           rouvrir un filtre « à 20 kHz » serait faux si le morceau le ferme. */
        if (def.kind === 'hold' && def.hold) def.hold(engine, on, st);
      }
    }
  }

  /* Coupe tout un groupe, ou le rouvre s'il est déjà entièrement coupé. */
  function basculerGroupe(noms: (DrumRowName | SynthRowName)[]) {
    const toutCoupe = noms.every((n) => ligneCoupee(n));
    for (const n of noms) {
      liveMute[n] = !toutCoupe;
      if (n in st.rows) engine.liveSetMute(n as DrumRowName, !toutCoupe);
      else engine.liveSetSynthMute(n as SynthRowName, !toutCoupe);
    }
    hapticTick();
  }

  // Bouton CHAOS (assignable comme les autres, PLAN.md §7) : tire un
  // paramètre du catalogue d'axes au hasard et lui donne une valeur
  // aléatoire, via applyAxisValue — exactement le même chemin qu'un geste de
  // pad, donc si le paramètre tiré est aussi celui assigné au pad/à
  // l'inclinaison, la lecture (bandes ambrées) se met à jour normalement.
  function triggerChaos() {
    const axis = LIVE_AXES[Math.floor(Math.random() * LIVE_AXES.length)];
    applyAxisValue([axis.id], Math.random());
  }

  // Tirage au hasard dans les catalogues — partagé par 🔀 (tout le monde) et
  // 🎲 (une seule ligne, voir randomizeSlot plus bas).
  // ⚠️ Tire dans les entrées TIRABLES, pas dans tout le catalogue : les
  // entrées miroir (TON −1, GAMME ←) restent assignables à la main mais les
  // tirer revenait à poser deux fois le même bouton.
  const pickAction = () => ACTIONS_TIRABLES[Math.floor(Math.random() * ACTIONS_TIRABLES.length)].id;
  const pickAxis = () => LIVE_AXES[Math.floor(Math.random() * LIVE_AXES.length)].id;

  /* Il n'y a plus de brassage total (🔀), ni de verrou — arbitrage de Yann,
     2026-08-19, et la chaîne se tient : le dé PAR bouton rend le brassage
     total inutile ; or le verrou n'existait QUE pour protéger du brassage ;
     sans brassage il ne protège de rien. Ce qui reste est plus simple à
     expliquer — un dé par chose assignable, et rien d'autre.

     L'inclinaison n'avait pas de dé : elle n'était rebrassée que par 🔀. Elle
     en reçoit un (`randomizeTilt`), sinon elle serait devenue la seule
     assignation qu'on ne peut plus tirer au hasard. */
  function randomizeTilt() {
    assignments = { ...assignments, axisTilt: [pickAxis()] };
    saveLiveAssignments(assignments);
  }

  // 🎲 du pad (retour de Yann, PLAN.md §7 : « les mêmes options sur le pad »
  // que les boutons) — tire un nouveau réglage pour X ET Y d'un coup, comme
  // randomizeSlot le fait pour un seul bouton.
  function randomizePad() {
    assignments = { ...assignments, axisX: [pickAxis()], axisY: [pickAxis()] };
    saveLiveAssignments(assignments);
  }

  // Vibration au trigger (PLAN.md §7, réserve) : un tick court (12ms) à
  // chaque appui sur un bouton catalogue — pas sur le pad/fader, gestes
  // continus où ça spammerait. `navigator.vibrate` est absent de Safari iOS,
  // d'où l'optional chaining plutôt qu'un throw silencieux évité à la main.
  function hapticTick(ms = 12) {
    navigator.vibrate?.(ms);
  }

  /* ---- LE LOQUET D'ASSIGNATION ----
   *
   * ⚠️ « Il faut éviter à tout le monde d'aller dans les réglages » (Yann,
   * 2026-09-07). Réassigner un bouton demandait d'ouvrir ⚙, donc de quitter la
   * surface de jeu — pour un geste qu'on fait justement en jouant.
   *
   * Et ça ne peut PAS être un geste posé sur le bouton lui-même : l'appui long
   * y est déjà pris, c'est la rafale (`kind: 'ligne'`, escalade ×2 -> ×3 -> ×4)
   * et le maintien de TENIR / SOLO MÉLO. Un loquet règle les deux problèmes
   * d'un coup — allumé, toute la surface (les six boutons, le pad, l'inclinaison)
   * se réassigne au lieu de jouer : tap = un tirage au hasard, appui long = la
   * liste complète, sur place. Éteint, rien n'a changé.
   */
  /* ⚠️ DEUX LOQUETS, ET PLUS AUCUN GESTE CACHÉ. La première version n'en avait
   * qu'un : tap = tirage au hasard, APPUI LONG = la liste complète. Le tirage a
   * plu (« le random marche très bien ») ; la liste, personne ne l'a trouvée —
   * parce qu'un appui long ne s'annonce nulle part. Yann : « il faut donc un
   * bouton similaire pour pouvoir assigner un bouton sans aller dans les
   * réglages ».
   *
   * D'où deux loquets de même forme, un geste chacun, et le geste est écrit sur
   * le bouton : 🎲 tire au hasard, ASSIGNER ouvre la liste. C'est la troisième
   * fois qu'un appui long coûte cher dans ce mode (les pastilles, la bande, ici)
   * — la règle est acquise : sur cette surface, ce qui n'est pas écrit n'existe
   * pas. */
  type ModeAssign = 'hasard' | 'choisir' | null;
  let modeAssign = $state<ModeAssign>(null);

  /** Le sélecteur du slot `i`, dans le catalogue de son mode courant. */
  function ouvrirListeSlot(i: number) {
    picker =
      assignments.slotModes[i] === 'fader'
        ? { kind: 'slotFader', index: i }
        : { kind: 'slot', index: i };
  }

  /* ⚠️ LA BASCULE DE MODE VIT DANS LE SÉLECTEUR, pas dans ⚙.
   *
   * C'est la raison d'être de ce lot. Le mode fader existait depuis toujours et
   * n'était atteignable que par ⚙ → ASSIGNATION → « ⏻ ACTIONS » → rouvrir la
   * liste → choisir → refermer : six gestes, dans un menu, pour une chose qu'on
   * fait en jouant. Mesuré : ASSIGNER + tap sur un bouton proposait 31 entrées
   * dont ZÉRO axe, donc aucun chemin ne menait à un curseur depuis la surface.
   * D'où : « ça manque de boutons où on règle un curseur, je ne comprends pas
   * pourquoi ils ont disparu. »
   *
   * Les trois modes sont ÉCRITS sur trois boutons, jamais devinés — quatrième
   * fois que ce mode paie un geste caché. */
  function choisirMode(i: number, mode: SlotMode, momentane: boolean) {
    // Changer de type, c'est changer ce que le bouton fait : il rend d'abord.
    if (assignments.slotModes[i] !== mode) relacherSlot(i);
    assignments.slotModes[i] = mode;
    assignments.faderMomentane[i] = momentane;
    saveLiveAssignments(assignments);
    picker = mode === 'fader' ? { kind: 'slotFader', index: i } : { kind: 'slot', index: i };
  }

  /* Un axe qui ne sait pas revenir au repos ne peut pas être momentané : le
     bouton MOMENTANÉ se désactive plutôt que de mentir. Aujourd'hui tous les
     axes portent un `repos` — la garde reste parce que c'est ce qui protège le
     jour où on en ajoute un sans. */
  function peutEtreMomentane(i: number): boolean {
    return assignments.slotFaders[i].every((id) => typeof axisById(id).repos === 'function');
  }

  function onSlotDown(i: number) {
    if (modeAssign) return; // sous loquet, tout se joue au relâché
    if (assignments.slotModes[i] === 'fader') return; // le fader se pilote au glisser (faderPointerDown), pas au tap
    hapticTick();
    pressed = { ...pressed, [i]: true };
    assignments.slots[i].forEach((id) => runAction(id, true));
  }
  function onSlotUp(i: number) {
    if (modeAssign) {
      hapticTick(modeAssign === 'choisir' ? 25 : 12);
      if (modeAssign === 'hasard') randomizeSlot(i);
      else ouvrirListeSlot(i);
      return;
    }
    if (assignments.slotModes[i] === 'fader') return;
    pressed = { ...pressed, [i]: false };
    assignments.slots[i].forEach((id) => runAction(id, false));
  }
  function onSlotLeave(i: number) {
    if (modeAssign) return;
    onSlotUp(i);
  }

  /* Le pad et l'inclinaison suivent la même règle, avec la même paire de
     gestes — sinon le loquet ne vaudrait que pour les boutons, et Yann demande
     explicitement que « ce point s'applique au pad et à l'inclinaison ». */
  function onAxeDown(_which: 'axisX' | 'axisY' | 'axisTilt', e?: PointerEvent) {
    /* ⚠️ Les deux moitiés vivent DANS le pad : sans ça, l'appui descend au
       gestionnaire du pad, qui capture le pointeur et déplace la valeur de
       l'axe qu'on est en train de réassigner. */
    e?.stopPropagation();
  }
  function onAxeUp(which: 'axisX' | 'axisY' | 'axisTilt', e?: PointerEvent) {
    e?.stopPropagation();
    if (modeAssign === 'choisir') {
      hapticTick(25);
      picker = { kind: 'axis', which };
      return;
    }
    assignments = { ...assignments, [which]: [pickAxis()] };
    saveLiveAssignments(assignments);
    hapticTick();
  }
  function onAxeLeave(e?: PointerEvent) {
    e?.stopPropagation();
  }

  // Bouton en mode FADER (PLAN.md §7) : glisser sur le bouton lui-même
  // pilote un ou plusieurs axes du même catalogue que le pad/l'inclinaison
  // (applyAxisValue), position = valeur. Orientation par bouton (retour de
  // Yann : « un fader gauche-droite où haut-bas ») — vertical garde la
  // convention du pad (haut = 100%, frac inversée) ; horizontal suit le sens
  // de lecture (gauche = 0%, droite = 100%, frac direct). Un seul drag actif
  // à la fois (comme le pad, `dragging`), le multi-touch simultané sur deux
  // faders n'est pas géré.
  /* ⚠️ `$state` obligatoire depuis que le rendu en DÉRIVE : un curseur
     momentané n'affiche sa valeur que sous le doigt, donc le template lit
     `faderDraggingIndex`. Muté sans `$state`, il resterait figé et le bouton
     n'aurait jamais l'air tenu (CLAUDE.md : « un objet muté doit être $state,
     sinon le prop qui en dérive est figé »). */
  let faderDraggingIndex = $state<number | null>(null);
  function setFader(i: number, clientX: number, clientY: number, rect: DOMRect) {
    const horizontal = assignments.faderOrientation[i] === 'horizontal';
    const frac = horizontal
      ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      : Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    applyAxisValue(assignments.slotFaders[i], horizontal ? frac : 1 - frac);
  }
  function faderPointerDown(i: number, e: PointerEvent, el: HTMLDivElement) {
    faderDraggingIndex = i;
    el.setPointerCapture(e.pointerId);
    setFader(i, e.clientX, e.clientY, el.getBoundingClientRect());
  }
  function faderPointerMove(i: number, e: PointerEvent, el: HTMLDivElement) {
    if (faderDraggingIndex === i) setFader(i, e.clientX, e.clientY, el.getBoundingClientRect());
  }
  /* ⚠️ LE RELÂCHÉ D'UN CURSEUR MOMENTANÉ REND LE RÉGLAGE AU MORCEAU.
   *
   * Même contrat que la seconde moitié d'un maintenu : le doigt lâche, le
   * morceau reprend la main — et « le morceau » se relit (`repos` efface
   * l'override), il ne se grave pas. Un doigt qui glisse hors du bouton passe
   * par `onpointerleave`, donc par ici : c'est ce qui rend un maintien sûr.
   *
   * Un axe sans `repos` ne peut pas être momentané (le sélecteur refuse de le
   * proposer), donc `?.` n'avale rien ici — il ne fait que dire au typage ce
   * que le sélecteur garantit. */
  function faderPointerUp(i: number) {
    faderDraggingIndex = null;
    if (!assignments.faderMomentane[i]) return;
    for (const id of assignments.slotFaders[i]) axisById(id).repos?.(engine, st);
  }

  // Volume master toujours accessible dans le bandeau (PLAN.md §7, audit du
  // 13/08 : seul moyen d'y toucher en plein set jusqu'ici était de l'avoir
  // explicitement assigné à un fader/axe). Même mécanique que setFader
  // horizontal, mais écrit directement dans le catalogue d'axes
  // (`applyAxisValue(['volume'], …)`) plutôt qu'un nœud dédié — reste donc
  // synchronisé si 'volume' est AUSSI assigné à un bouton/axe ailleurs
  // (dernière source qui écrit fait foi, même convention que pad/fader/
  // inclinaison).

  /* ⚠️ LE TEMPO ET LE VOLUME MASTER ONT QUITTÉ LE BANDEAU (2026-09-09).
     Rien de coché sur leur carte de la fiche, et « ne rien cocher » y voulait
     dire « ça reste dans l'Atelier ». Les deux y sont, en pleine taille : ici
     ils prenaient de la largeur sur une rangée qui porte aussi le transport,
     ⏺ REC, les deux loquets et ⚙. Le tempo garde un affichage en LCD — le
     LIRE en jouant reste utile, le RÉGLER est de la préparation.
     ⚠️ L'axe `volume` est parti du catalogue avec eux : un mini-fader qui
     écrivait un axe que plus personne ne peut assigner serait un doublon
     orphelin. */
  function toggleSlotMode(i: number) {
    assignments.slotModes[i] = assignments.slotModes[i] === 'fader' ? 'actions' : 'fader';
    saveLiveAssignments(assignments);
  }

  function toggleFaderOrientation(i: number) {
    assignments.faderOrientation[i] = assignments.faderOrientation[i] === 'horizontal' ? 'vertical' : 'horizontal';
    saveLiveAssignments(assignments);
  }

  // Bouton 🎲 par ligne (retour de Yann, PLAN.md §7 : « un bouton
  // d'assignement et un bouton random à côté de chacun » — l'assignement,
  // c'est déjà la ligne elle-même, tapée elle ouvre le panneau de sélection ;
  // ce qui manquait, c'est un tirage direct sans ouvrir ce panneau). Tire un
  // nouveau réglage pour CE bouton seul, dans le catalogue de son mode
  // courant — contrairement à 🔀 qui rebrasse tout d'un coup. Agit même sur
  // un bouton verrouillé : le verrou protège du brassage global accidentel
  // par 🔀, pas d'un geste posé délibérément sur sa propre ligne.
  /* ⚠️ CE QU'UN BOUTON TENAIT DOIT ÊTRE RENDU QUAND IL CHANGE (2026-09-09,
   * retour de Yann après test : « quand on bascule un paramètre — exemple :
   * arpégiateur — il faut qu'on puisse revenir comme c'était avant, soit
   * lorsqu'on change le bouton, soit quand on passe à la partie suivante »).
   *
   * Sans ça, réassigner un bouton ABANDONNE son réglage : la nappe reste en
   * arpège, la batterie reste coupée, et plus AUCUNE commande de l'écran ne
   * peut les défaire — le seul bouton qui savait le faire vient d'être
   * réassigné. C'est un cul-de-sac qu'on ne voit qu'en jouant.
   *
   * On appelle donc le `repos` des entrées SORTANTES, des deux catalogues : les
   * axes l'ont depuis le curseur momentané, les actions qui latchent viennent
   * de le recevoir. Une entrée sans `repos` ne latche rien — rien à rendre. */
  function relacherSlot(i: number) {
    /* Les deux catalogues : un slot porte TOUJOURS les deux assignations, et on
       ignore laquelle jouait — relâcher ce qui n'était pas engagé est un
       no-op, alors qu'oublier ce qui l'était laisse un cul-de-sac. */
    const sortantes = [...assignments.slotFaders[i], ...assignments.slots[i]];
    for (const id of assignments.slotFaders[i]) axisById(id).repos?.(engine, st);
    for (const id of assignments.slots[i]) actionById(id).repos?.(engine, st);
    // La VUE doit suivre ce que le moteur vient de rendre, sinon l'écran
    // affiche un état que plus personne ne joue.
    if (sortantes.includes('petit-hp')) petitHP = false;
    padMode = engine.padMode;
    resynchroniserMutes();
  }

  /** Recale l'affichage des coupures sur ce que le moteur dit vraiment. */
  function resynchroniserMutes() {
    for (const n of [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES]) {
      const ov = n in st.rows ? engine.liveMuteDe(n as DrumRowName) : engine.liveMuteSynthDe(n as SynthRowName);
      if (ov === undefined) delete liveMute[n];
      else liveMute[n] = ov;
    }
  }

  function randomizeSlot(i: number) {
    relacherSlot(i);
    const { mode, momentane } = tirerMode(); // le TYPE fait partie du tirage
    assignments.slotModes[i] = mode;
    assignments.faderMomentane[i] = momentane;
    if (mode === 'fader') assignments.slotFaders[i] = [pickAxis()];
    else assignments.slots[i] = [pickAction()];
    saveLiveAssignments(assignments);
  }

  // Snapshots d'assignation (PLAN.md §7, réserve : « rappelable par appui
  // long »). Appui court = sauvegarder (geste anodin, jamais destructeur) ;
  // appui long = rappeler (geste délibéré, écrase toute l'assignation
  // courante en plein set — protégé comme le reste des gestes à risque de
  // mistap déjà identifiés dans le diagnostic ergonomie). `$state.snapshot`
  // des deux côtés (et non `structuredClone`, qui échoue sur un proxy
  // `$state` — DataCloneError) : un snapshot est une COPIE figée plain-objet,
  // pas une référence vers `assignments` qui continuerait à changer sous lui.
  const LONG_PRESS_MS = 550;
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  let snapshotLongPressed = false;

  function saveSnapshot(i: number) {
    snapshots[i] = $state.snapshot(assignments);
    saveLiveSnapshots(snapshots);
    hapticTick(12);
  }
  function recallSnapshot(i: number) {
    const snap = snapshots[i];
    if (!snap) return;
    assignments = $state.snapshot(snap);
    saveLiveAssignments(assignments);
    hapticTick(25);
  }
  function onSnapshotPointerDown(i: number) {
    snapshotLongPressed = false;
    snapshotTimer = setTimeout(() => {
      snapshotLongPressed = true;
      recallSnapshot(i);
    }, LONG_PRESS_MS);
  }
  function onSnapshotPointerUp(i: number) {
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
      snapshotTimer = null;
    }
    if (!snapshotLongPressed) saveSnapshot(i);
  }
  function onSnapshotPointerLeave() {
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
      snapshotTimer = null;
    }
  }

  // Panneau de sélection (remplace le cycle pas-à-pas, catalogue trop large
  // depuis l'extension PLAN.md §7 — Yann : « je voulais choisir dans une
  // liste ») : une ligne d'assignation ouvre `picker`, plutôt que de cycler
  // sur place, avec la liste complète des options (groupée par catégorie
  // pour les axes). Multi-sélection (PLAN.md §7, retour de Yann : « on peut
  // assigner plusieurs paramètres à un même contrôleur ») : un tap BASCULE
  // l'entrée dans le slot/axe plutôt que de committer-et-fermer, on referme
  // explicitement une fois fini. Toujours au moins une entrée par slot/axe —
  // retirer la dernière est un no-op silencieux plutôt qu'un slot vide.
  type Picker =
    | { kind: 'slot'; index: number }
    | { kind: 'axis'; which: 'axisX' | 'axisY' | 'axisTilt' }
    | { kind: 'slotFader'; index: number }
    | { kind: 'viz' }
    | { kind: 'montage' }
    | { kind: 'section'; index: number };
  let picker = $state<Picker | null>(null);

  function toggleActionInSlot(id: LiveActionId) {
    if (picker?.kind !== 'slot') return;
    const current = assignments.slots[picker.index];
    if (current.includes(id)) {
      if (current.length > 1) {
        /* Une entrée qu'on RETIRE rend ce qu'elle tenait — sinon elle laisse
           son réglage derrière elle sans plus aucun bouton pour le défaire. */
        actionById(id).repos?.(engine, st);
        padMode = engine.padMode;
        if (id === 'petit-hp') petitHP = false;
        resynchroniserMutes();
        assignments.slots[picker.index] = current.filter((x) => x !== id);
      }
    } else {
      assignments.slots[picker.index] = [...current, id];
    }
    saveLiveAssignments(assignments);
  }
  function toggleAxisInSlot(id: LiveAxisId) {
    if (picker?.kind !== 'axis') return;
    const which = picker.which;
    const current = assignments[which];
    if (current.includes(id)) {
      if (current.length > 1) assignments[which] = current.filter((x) => x !== id);
    } else {
      assignments[which] = [...current, id];
    }
    saveLiveAssignments(assignments);
  }
  // Même bascule que toggleAxisInSlot ci-dessus, mais pour le fader d'un
  // bouton (assignments.slotFaders[i]) plutôt qu'un des 3 axes nommés —
  // fonction séparée plutôt qu'un `which` généralisé, `assignments[which]`
  // n'a pas de sens pour un tableau indexé.
  function toggleFaderAxisInSlot(id: LiveAxisId) {
    if (picker?.kind !== 'slotFader') return;
    const current = assignments.slotFaders[picker.index];
    if (current.includes(id)) {
      if (current.length > 1) {
        axisById(id).repos?.(engine, st); // même règle que pour les actions
        assignments.slotFaders[picker.index] = current.filter((x) => x !== id);
      }
    } else {
      assignments.slotFaders[picker.index] = [...current, id];
    }
    saveLiveAssignments(assignments);
  }
  function commitViz(id: LiveVizId) {
    if (picker?.kind === 'viz') {
      assignments.viz = id;
      saveLiveAssignments(assignments);
    }
    picker = null;
  }


  /* ---- LA BANDE D'ARCHITECTURE (macro-séquenceur) ----
   *
   * Une case = une section, comme un pas est un pas. La case courante se
   * remplit au fil de ses tours ; SUIVANT saute à la prochaine mesure, TENIR
   * boucle la section tant qu'on le maintient — un set n'obéit jamais au
   * compte, et sans ces deux boutons la chaîne joue contre le musicien.
   *
   * ⚠️ On compte en TOURS DU MOTIF, pas en mesures : le cycle propre d'un
   * motif vaut 4 mesures dès que la nappe s'étale sur 4 (30 presets sur 34).
   * Compter en mesures autoriserait « 6 mesures » sur un cycle de 4, donc une
   * nappe coupée en plein milieu une fois sur deux.
   */
  let sectionIndex = $state(0);
  let tenirSection = $state(false);
  // Une seule bascule peut être en attente : sans ce drapeau, chaque frame de
  // la dernière mesure en programmerait une nouvelle.
  let basculeEnAttente = false;

  const archSections = $derived(architecture.sections);
  const cycleMotif = $derived(cycleDuMotif(st));
  const sectionCourante = $derived(archSections[sectionIndex] ?? null);

  /* ⚠️ LA CHAÎNE PEUT RACCOURCIR SOUS LES PIEDS DU CURSEUR. Depuis que le
     panneau Montage de l'Atelier retire et déplace des scènes, `sectionIndex`
     peut pointer au-delà de la dernière : la tête de lecture n'aurait plus de
     section courante, donc plus de longueur, donc plus d'avance automatique —
     un morceau qui s'arrête sans rien dire. On le ramène dans la chaîne. */
  $effect(() => {
    const n = archSections.length;
    if (n && sectionIndex >= n) sectionIndex = n - 1;
  });
  /* La longueur de la section EN COURS se lit sur le motif chargé — c'est lui
     qui joue. Les longueurs AFFICHÉES, elles, se lisent lettre par lettre. */
  const mesuresCourantes = $derived(sectionCourante ? mesuresDeSection(sectionCourante, cycleMotif) : 0);
  const cycleDe = $derived((id: PartieId) => parties.cycle(id));
  const dureeMorceau = $derived(
    archSections.length ? formaterDuree(dureeSecondes(archSections, cycleDe, st.tempo)) : '',
  );

  /* Applique une section : charge son motif (SANS son tempo) et pose son
     calque de lignes. Appelée DANS la file du moteur, donc exactement au
     début de la mesure. */
  function appliquerSection(i: number) {
    const s = architecture.sections[i];
    sectionIndex = i;
    basculeEnAttente = false;
    if (!s) return;
    /* ⚠️ REPLI SUR A, jamais sur « le motif courant ». Une lettre encore vide
       est le cas normal quand on vient de charger un montage et qu'on n'a rangé
       que A : garder le motif courant ferait jouer ce que la bascule
       précédente avait laissé, c'est-à-dire n'importe quoi. Se replier sur A
       rend la chaîne audible dès la PREMIÈRE partie rangée, et remplir B
       l'améliore au lieu de la faire exister. */
    if (!parties.chargerGardantTempo(s.partie)) {
      if (s.partie !== 'A') parties.chargerGardantTempo('A');
    }
    /* ⚠️ LE MIX SUIT LA BASCULE — arbitré par Yann : « on passe du temps à
       chercher un son, il ne faut pas l'écraser ». Une lettre porte donc un SON
       complet, pas seulement des notes. Sans cet appel, le graphe garde le mix
       de la lettre chargée au démarrage et le refrain jouait ses notes avec le
       son du couplet (mesuré : envoi réverbe à 0 au lieu de 0,8).

       ⚠️ Deux choses que ça ne touche PAS, et c'est ce qui le rend compatible
       avec « bouger les paramètres en direct » :
        - le TEMPO, qui appartient au transport (`chargerGardantTempo`) — le
          seul point que Yann a explicitement exclu ;
        - `liveFilter` et `liveReverbSend`, qui sont des nœuds SÉPARÉS que
          `applyMixSettings` n'écrit jamais. Le pad, l'inclinaison et les faders
          gardent donc la main pendant qu'une section passe. */
    engine.refreshMixSettings();
    /* ⚠️ ET CE QU'IL REPREND, LUI, DOIT CESSER D'ÊTRE AFFICHÉ COMME RÉGLÉ.
       Les volumes de ligne du synthé passent par les nœuds du MORCEAU
       (`synthLineGain`), donc `refreshMixSettings` vient de les remettre à ce
       que dit la lettre. Garder la valeur posée à la main afficherait un
       chiffre que plus personne ne joue — et le séquenceur est le seul écran
       qui dit le niveau d'une ligne.
       ⚠️ L'ASYMÉTRIE EST TRANCHÉE (2026-09-09) : « il faut qu'on puisse revenir
       comme c'était avant […] quand on passe à la partie suivante ». Les nœuds
       du morceau étaient déjà repris par `refreshMixSettings` ; les OVERRIDES,
       eux, survivaient — un volume de batterie posé à la main tenait à travers
       les scènes, son jumeau du synthé non. Les deux familles rendent
       maintenant la main ensemble.
       ⚠️ `relacherReglagesLive` épargne les deux nœuds DÉDIÉS (filtre, réverbe)
       et les mutes : le pad garde la main pendant qu'une scène passe, et le
       calque ci-dessous reste seul maître des coupures. */
    engine.relacherReglagesLive();
    volLive = {};
    padMode = engine.padMode;
    /* Calque de lignes — c'est ce qui permet à un arc d'intensité de se jouer
       sur une seule séquence.
       ⚠️ `null` veut dire TOUTES, donc RELÂCHER le calque, pas « ne rien
       toucher ». Trouvé en jouant le modèle ARC, pas en relisant le code :
       la MONTÉE coupait quatre lignes, et le CLIMAX — qui doit tout rouvrir —
       les laissait coupées, parce qu'on sortait sans rien faire. Relâcher,
       c'est repasser l'override à `null` (suivre le motif), et non forcer
       ouvert : une ligne coupée dans l'Atelier reste coupée. */
    const actives = s.lignes ? new Set<DrumRowName | SynthRowName>(s.lignes) : null;
    for (const name of [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES]) {
      const valeur = actives === null ? null : !actives.has(name);
      if (valeur === null) delete liveMute[name];
      else liveMute[name] = valeur;
      if (name in st.rows) engine.liveSetMute(name as DrumRowName, valeur);
      else engine.liveSetSynthMute(name as SynthRowName, valeur);
    }
  }

  function sectionSuivante(): number {
    return archSections.length ? (sectionIndex + 1) % archSections.length : 0;
  }

  /** Saute à la section suivante à la prochaine mesure (bouton SUIVANT). */
  function sauterSection() {
    if (!archSections.length) return;
    hapticTick();
    const cible = sectionSuivante();
    basculeEnAttente = true;
    engine.queueSwapAtNextBar(() => appliquerSection(cible));
  }

  /* Avance automatique — appelée à chaque frame. On programme la bascule
     pendant la DERNIÈRE mesure de la section : `queueSwapAtNextBar` l'applique
     au début de la suivante, qui est exactement la frontière. */
  function suivreArchitecture() {
    if (!playing || !archSections.length || tenirSection || basculeEnAttente) return;
    if (mesuresCourantes <= 0) return;
    if (engine.barDansSection >= mesuresCourantes - 1) {
      const cible = sectionSuivante();
      basculeEnAttente = true;
      engine.queueSwapAtNextBar(() => appliquerSection(cible));
    }
  }

  /** Avancement dans la section courante, 0..1 — le remplissage de la case. */
  function avancementSection(): number {
    if (!playing || mesuresCourantes <= 0) return 0;
    const m = Math.min(engine.barDansSection, mesuresCourantes - 1);
    return Math.max(0, Math.min(1, (m + engine.barProgress()) / mesuresCourantes));
  }
  let avancement = $state(0);
  /* ⚠️ `engine.barDansSection` est un getter d'une classe ordinaire, pas du
     `$state` : lu directement dans le balisage, il ne redéclenche aucun rendu
     et l'afficheur reste figé sur la valeur qu'il avait au dernier changement
     de section — c'est-à-dire 0, puisque le compteur venait d'être remis à
     zéro. Trouvé en jouant une architecture, pas en relisant le code. On en
     tient donc un miroir réactif, rafraîchi à chaque frame comme
     `avancement`. Plancher à 0 : entre la bascule (60 ms avant la mesure) et
     l'incrément du compteur, la valeur vaut brièvement −1. */
  let mesureDansSection = $state(0);

  /* ⚠️ UN MONTAGE NE TOUCHE PLUS AUX BOUTONS (2026-09-09). Il en portait six,
     posés ici par un `$effect` parce que le JEU charge lui aussi des montages
     (`game.monterLeSet`) et qu'une règle à deux domiciles n'est appliquée qu'à
     un seul. Yann, après essai : « on peut laisser tomber le choix des boutons
     associés aux paramètres, ça ne fait pas ses preuves. » Ce que ça enlève de
     l'écran : le loquet « CONSERVER MES BOUTONS » de ⚙, qui n'existait que
     pour se protéger de ce remplacement. Ce qu'il reste : les assignations
     réglées à la main sont gardées, toujours. */

  /* Charger un MONTAGE : la chaîne et les calques de lignes. */
  function chargerMontage(nom: string) {
    architecture.chargerMontage(nom);
    basculeEnAttente = false;
    engine.cancelQueuedSwap();
    /* ⚠️ La PREMIÈRE section doit être appliquée, pas seulement pointée.
       Trouvé en jouant : le modèle ARC démarrait sur une INTRO qui n'avait
       coupé aucune ligne, parce que `appliquerSection` n'était appelée qu'au
       moment d'une BASCULE — et la première n'en est pas une. */
    appliquerSection(0);
    picker = null;
  }

  function quitterArchitecture() {
    architecture.effacer();
    sectionIndex = 0;
    basculeEnAttente = false;
    engine.cancelQueuedSwap();
    picker = null;
  }

  /* ---- LES PARTIES A / B / C / D ----
   *
   * ⚠️ C'EST LA RÉPONSE À « TROP COMPLIQUÉ ET PAS DU TOUT AUDIBLE ». Avant :
   * composer dans l'Atelier, taper un nom dans un `prompt()`, ouvrir ⚙, puis
   * un aller-retour dans un sélecteur PAR SECTION — huit pour le modèle POP —
   * et tant que ces huit voyages n'étaient pas faits, les huit sections
   * jouaient le même motif. Ici : quatre pastilles sous le pouce, un tap pour
   * JOUER une lettre, un appui long pour y RANGER ce qu'on entend.
   *
   * « De A on développe B » n'a pas besoin d'un verbe à lui : c'est ce même
   * appui long sur B après avoir modifié A.
   */
  function jouerPartie(id: PartieId) {
    hapticTick();
    /* Avec une chaîne chargée, taper une lettre SAUTE À SA SECTION plutôt que
       de charger le motif dans le vide : sinon la chaîne reprendrait la main à
       la mesure suivante et le geste n'aurait servi à rien. */
    const cible = archSections.findIndex((sec) => sec.partie === id);
    if (cible >= 0) {
      basculeEnAttente = true;
      engine.queueSwapAtNextBar(() => appliquerSection(cible));
      return;
    }
    if (!parties.remplie(id)) return;
    engine.queueSwapAtNextBar(() => {
      parties.chargerGardantTempo(id);
      partieHorsChaine = id;
    });
  }

  /** La lettre jouée hors chaîne — pour allumer la bonne pastille. */
  let partieHorsChaine = $state<PartieId | null>(null);

  /* ⚠️ RANGER A QUITTÉ LE MODE LIVE, et ce n'est pas un renoncement.
   *
   * L'appui long sur une pastille y rangeait le motif courant — donc écrasait
   * une lettre, sans confirmation, par un simple doigt qui traîne. Expliqué
   * deux fois à Yann, pas compris deux fois : après deux tentatives, ce n'est
   * plus un problème de rédaction, c'est le geste qui est mauvais. Un geste
   * qu'on ne comprend pas en le LISANT, on ne le trouvera pas en JOUANT.
   *
   * La règle qui tranche est déjà dans la maison : ce qu'on fait AVANT de jouer
   * est de la préparation, et sa place est dans l'Atelier. Ranger une lettre en
   * est. Ici les pastilles ne font plus qu'une chose — jouer — et il n'y a plus
   * rien de destructeur sur la surface de scène.
   */
  /* Appui long sur une CASE de la chaîne = l'éditer sur place (sa lettre, ses
     tours). C'est la moitié « séquences » de la demande de Yann : plus rien de
     la chaîne n'oblige à ouvrir ⚙. */
  let caseTimer: ReturnType<typeof setTimeout> | null = null;
  let caseLongue = false;
  function onCaseDown(i: number) {
    caseLongue = false;
    caseTimer = setTimeout(() => {
      caseLongue = true;
      hapticTick(25);
      picker = { kind: 'section', index: i };
    }, LONG_PRESS_MS);
  }
  function onCaseUp(i: number) {
    if (caseTimer) {
      clearTimeout(caseTimer);
      caseTimer = null;
    }
    if (caseLongue) return;
    basculeEnAttente = true;
    engine.queueSwapAtNextBar(() => appliquerSection(i));
  }
  function onCaseLeave() {
    if (caseTimer) {
      clearTimeout(caseTimer);
      caseTimer = null;
    }
  }

  /* La bascule directe ‹ › dans la banque a quitté le bandeau : les quatre
     PARTIES font le même geste en mieux — nommées, sous le pouce, et calées sur
     la mesure. La banque reste atteignable depuis ⚙ (kind: 'bank'), comme
     matériel : c'est là que vivent les neuf boucles de l'acte 6, dont trois
     seulement montent dans les lettres. */

  /* Le magnétophone rend désormais le WAV directement : il l'écrit au fil de
     l'eau (engine/recorder.ts), il n'y a plus d'AudioBuffer à reconvertir. */
  function downloadCapture(wav: Blob) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadBlob(wav, `rythme-live-${stamp}.wav`);
  }

  async function togglePlay() {
    if (playing) {
      // Un live take en cours n'a de sens que pendant la lecture — STOP le
      // termine et livre le WAV plutôt que de le jeter silencieusement.
      if (recording) {
        const wav = engine.stopCapture();
        recording = false;
        if (wav) downloadCapture(wav);
      }
      engine.stop();
      playing = false;
      playhead = { kick: -1, snare: -1, hat: -1, clap: -1, shaker: -1 };
      synthPlayhead = { bass: -1, pad: -1, melody: -1 };
    } else {
      // Un morceau repart de sa première section, calque compris (même raison
      // qu'au chargement : la première section n'est pas une bascule).
      if (archSections.length) appliquerSection(0);
      await engine.start();
      playing = true;
    }
  }

  // Bouton ⏺ REC du Mode Live : start/stop au bouton (pas de durée fixée en
  // mesures comme l'enregistrement de l'Atelier) — capture tout ce qui est
  // réellement joué (triggers/pad/inclinaison compris), voir PLAN.md §7.
  async function toggleRecord() {
    if (recording) {
      const wav = engine.stopCapture();
      recording = false;
      if (wav) downloadCapture(wav);
      return;
    }
    /* ⚠️ À L'ARRÊT, ⏺ LANCE LE MORCEAU DEPUIS SON DÉBUT. Le bouton était
     * `disabled` tant qu'on ne jouait pas : pour enregistrer un morceau entier
     * il fallait lancer la lecture puis courir appuyer sur REC, et la prise
     * commençait donc quelque part au milieu de la première scène. Or depuis
     * que l'export hors ligne d'un morceau est écarté, ⏺ EST la sortie audio —
     * il ne peut pas rater le début de ce qu'il est seul à pouvoir livrer.
     *
     * ⚠️ Le magnétophone se branche AVANT `start()`, jamais après : c'est la
     * même règle que la bascule de tampon de sortie (`engine/tampon.ts`), et
     * c'est ce qui garantit que la première mesure est dans la prise. */
    if (!playing) {
      if (archSections.length) appliquerSection(0);
      await engine.startCapture();
      recording = true;
      await engine.start();
      playing = true;
      return;
    }
    await engine.startCapture();
    recording = true;
  }

  function checkOrientation() {
    isPortrait = window.matchMedia('(orientation: portrait)').matches;
  }

  function needsMotionPermission(): boolean {
    return (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error — API iOS non typée
      typeof DeviceOrientationEvent.requestPermission === 'function'
    );
  }

  // Calibré au premier échantillon reçu après activation (pas un zéro
  // absolu) : sortir le téléphone incliné d'une poche ne doit pas fausser le
  // point neutre. Plage ±35° volontairement large pour rester un axe
  // tolérant, pas un contrôle de précision (diagnostic ergonomie, PLAN.md §7).
  function onOrientationEvent(e: DeviceOrientationEvent) {
    const gamma = e.gamma ?? 0;
    tiltGamma = gamma;
    if (tiltCalibration === null) tiltCalibration = gamma;
    const value01 = Math.max(0, Math.min(1, 0.5 + (gamma - tiltCalibration) / (2 * TILT_RANGE)));
    applyAxisValue(assignments.axisTilt, value01);
  }

  async function toggleTilt() {
    if (tiltEnabled) {
      window.removeEventListener('deviceorientation', onOrientationEvent);
      tiltEnabled = false;
      tiltCalibration = null;
      return;
    }
    if (needsMotionPermission()) {
      try {
        // @ts-expect-error — API iOS non typée
        const res: string = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') {
          tiltDenied = true;
          return;
        }
      } catch {
        tiltDenied = true;
        return;
      }
    }
    tiltDenied = false;
    tiltCalibration = null; // recalibré sur la 1ère lecture qui arrive
    window.addEventListener('deviceorientation', onOrientationEvent);
    tiltEnabled = true;
  }

  // Pad XY et inclinaison peuvent viser le MÊME paramètre (les deux sont
  // assignables indépendamment) — la dernière source qui a écrit fait foi,
  // aussi bien pour le son que pour la lecture affichée : sans ce state
  // partagé, l'inclinaison changerait le son sans que les bandes ambrées ne
  // bougent, ce qui serait trompeur.
  let axisValues = $state<Record<LiveAxisId, number>>(Object.fromEntries(LIVE_AXES.map((a) => [a.id, 0.5])));

  // Le ou les paramètres assignés à chaque axe (filtre par défaut en X,
  // reverb en Y, réassignables depuis l'overlay ⚙, catalogue étendu
  // PLAN.md §7). Un axe peut piloter plusieurs paramètres à la fois (retour
  // de Yann : « assigner plusieurs paramètres à un même contrôleur ») — même
  // valeur 0..1 appliquée à chacun, en macro. Chaque entrée du catalogue
  // sait déjà quoi faire de cette valeur (courbe, plage, quelle méthode
  // d'AudioEngine appeler) — plus de switch ici.
  function applyAxisValue(axisIds: LiveAxisId[], value01: number) {
    for (const axisId of axisIds) {
      axisValues[axisId] = value01;
      axisById(axisId).apply(engine, value01);
    }
  }

  // SOLO MÉLO tenu : le pad ne pilote plus ses axes habituels, il joue la
  // mélodie au doigt — X quantisé en 7 zones = degré de la gamme courante,
  // Y en tiers = octave (même inversion « haut du pad = plus haut » que pour
  // les axes normaux ci-dessous). Ne redéclenche que si la zone a changé,
  // pour qu'un doigt immobile ne répète pas la note ; le glissé d'une zone à
  // l'autre glisse via glideFrom (playLiveMelodyNote), comme un pas à pas.
  // liveMelodyFreqForDegree (et non degreeFreq(st, ...) directement) : un
  // bouton PAS "tonalité"/"gamme" tenu en direct pendant qu'on joue au pad
  // doit s'entendre ici aussi, pas seulement sur le séquenceur programmé.
  function playSoloMelody(px: number, py: number) {
    const degree = Math.min(7, Math.floor(px * 7) + 1);
    const yInverted = 1 - py;
    const octave = yInverted < 1 / 3 ? -1 : yInverted < 2 / 3 ? 0 : 1;
    const freq = engine.liveMelodyFreqForDegree(degree, octave);
    if (freq !== lastMelodyFreq) {
      engine.playLiveMelodyNote(freq, lastMelodyFreq);
      lastMelodyFreq = freq;
    }
  }

  // Les deux paramètres sont inversés pour l'axe Y du pad (haut du pad =
  // 100%), pas pour l'axe X ni pour l'inclinaison.
  function setPad(clientX: number, clientY: number, rect: DOMRect) {
    padX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    padY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    if (soloMelodyHeld) {
      playSoloMelody(padX, padY);
      return;
    }
    applyAxisValue(assignments.axisX, padX);
    applyAxisValue(assignments.axisY, 1 - padY);
  }

  let dragging = false;
  function padPointerDown(e: PointerEvent, el: HTMLDivElement) {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    setPad(e.clientX, e.clientY, el.getBoundingClientRect());
  }
  function padPointerMove(e: PointerEvent, el: HTMLDivElement) {
    if (dragging) setPad(e.clientX, e.clientY, el.getBoundingClientRect());
  }

  // ---- Séquenceur linéaire (vrai pattern) + visualiseur (vrais niveaux) ----
  // Mêmes valeurs que --cell-* de tokens.css (StepCircle.FALLBACK,
  // les couleurs de ligne du séquenceur) — un canvas ne peut pas lire une
  // variable CSS, donc dupliquées ici comme ailleurs dans le code.
  const DRUM_COLOR = {
    kick: '#d84315',
    snare: '#c8881a',
    hat: '#2b8a8a',
    clap: '#3fae54',
    shaker: '#22a6c9',
  } as const;
  const SYNTH_COLOR = { bass: '#6a7bff', pad: '#b06bff', melody: '#ff6bd6' } as const;
  const LINE_COLOR = { ...DRUM_COLOR, ...SYNTH_COLOR } as Record<DrumRowName | SynthRowName, string>;

  // 22 barres : assez pour lire un spectre, assez larges pour rester visibles
  // dans un panneau de Mode Live en paysage.
  const EQ_BAR_COUNT = 22;

  let vizCanvas: HTMLCanvasElement = $state()!;
  let raf = 0;

  function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
    const rr = Math.max(0, Math.min(rad, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  // Les canvas n'existent dans le DOM qu'en paysage (l'écran portrait ne les
  // monte pas) : on ne peut pas les dimensionner une seule fois dans
  // onMount, il faut re-vérifier à chaque frame qu'ils existent et sont à la
  // bonne taille (comparaison bon marché, no-op la plupart des frames).
  function ensureSize(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /* ---- Le séquenceur du Mode Live ----
   *
   * Trois décisions, chacune payée par une mesure ou par un défaut réel.
   *
   * 1. ON N'AFFICHE QUE LES LIGNES QUI SONNENT. Muter une ligne vide ne veut
   *    rien dire, et c'est ce qui donne de la hauteur aux autres : mesuré, huit
   *    lignes à 44 px demanderaient 366 px là où l'écran n'en offre que 252
   *    sous le bandeau. Six lignes (le cas courant, clap et shaker vides dans
   *    21 presets sur 34) tiennent à 26 px, huit à 22.
   *
   * 2. LA LIGNE ENTIÈRE EST LE BOUTON DE MUTE, et elle affiche l'état RÉEL
   *    (`coupee`) — l'ancien séquenceur ne lisait jamais `row.muted`, donc une
   *    ligne coupée dans l'Atelier s'y affichait allumée, tête de lecture
   *    comprise. Une ligne coupée est CREUSÉE, son nom barré en ambre : c'est
   *    le biseau qui dit l'état, comme partout ailleurs.
   *
   * 3. LES CASES SONT DES CARRÉS POSÉS SUR UNE PISTE DE TEMPS, pas des cases
   *    collées. Des cases en `flex: 1` faisaient croire qu'une ligne à 4 pas
   *    (la nappe) est plus courte qu'une ligne à 16 (le kick), alors qu'elles
   *    couvrent la même mesure. Une seule taille de carré pour tout le
   *    séquenceur, commandée par la ligne la plus dense ; les lignes moins
   *    denses sont simplement plus espacées.
   */
  const LIGNES_ORDRE: (DrumRowName | SynthRowName)[] = [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES];

  function nbPas(name: DrumRowName | SynthRowName): number {
    return name in st.rows ? st.rows[name as DrumRowName].subdiv : st.synthRows[name as SynthRowName].subdivisions;
  }

  function pasActif(name: DrumRowName | SynthRowName, i: number): boolean {
    if (name in st.rows) return (st.rows[name as DrumRowName].pattern[i] ?? 0) > 0;
    const v = st.synthRows[name as SynthRowName].pattern[i];
    return name === 'pad' ? typeof v === 'number' && v >= 0 : v != null;
  }

  /* ---- LE MINI SÉQUENCEUR RÈGLE AUSSI LES VOLUMES (2026-09-09) ----
   *
   * ⚠️ Demandé deux fois sur la fiche à cocher, pour la batterie puis pour le
   * synthé : « il faudrait pouvoir régler le volume au niveau du mini
   * séquenceur, quitte à revoir le design ici ». C'est le geste le plus
   * universel d'un pupitre, et il n'existait nulle part — ni ici, ni comme axe.
   *
   * ⚠️ POURQUOI UN MODE ÉCRIT, ET PAS UN GESTE SUR LA LIGNE. La ligne est déjà
   * prise : elle coupe au tap, sur toute sa surface. Y ajouter un glisser
   * ferait le quatrième geste caché de ce mode — « sur cette surface, ce qui
   * n'est pas ÉCRIT n'existe pas ». Deux boutons nommés au-dessus du bloc
   * disent lequel des deux on règle, et rien ne change de sens sous le doigt.
   *
   * ⚠️ Le volume live est un ÉTAT DE VUE, pas du morceau : `null` veut dire
   * « suis le morceau ». Le moteur, lui, reçoit un override (batterie) ou un
   * nœud (synthé) — jamais une écriture dans `PatternStateV2`. */
  let seqMode = $state<'pas' | 'volume'>('pas');
  let volLive = $state<Partial<Record<DrumRowName | SynthRowName, number>>>({});

  /** Le volume EFFECTIF d'une ligne : le live s'il existe, sinon le morceau. */
  function volumeDe(name: DrumRowName | SynthRowName): number {
    const live = volLive[name];
    if (live !== undefined) return live;
    return name in st.rows ? st.rows[name as DrumRowName].volume : st.synthRows[name as SynthRowName].volume;
  }

  /* Le plafond diffère : la batterie va à 1, le synthé à 1,5 — mêmes bornes
     que les curseurs de l'Atelier, le Live n'invente pas une échelle. */
  const volMax = (name: DrumRowName | SynthRowName) => (name in st.rows ? 1 : 1.5);

  function poserVolume(name: DrumRowName | SynthRowName, frac: number) {
    const v = Math.max(0, Math.min(1, frac)) * volMax(name);
    volLive[name] = v;
    if (name in st.rows) engine.setLiveDrumParam(name as DrumRowName, 'volume', v);
    else engine.setLiveSynthLineVolume(name as SynthRowName, v);
  }

  let volDrag: DrumRowName | SynthRowName | null = null;
  function volDown(name: DrumRowName | SynthRowName, e: PointerEvent, el: HTMLElement) {
    volDrag = name;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    poserVolume(name, (e.clientX - r.left) / r.width);
  }
  function volMove(name: DrumRowName | SynthRowName, e: PointerEvent, el: HTMLElement) {
    if (volDrag !== name) return;
    const r = el.getBoundingClientRect();
    poserVolume(name, (e.clientX - r.left) / r.width);
  }
  function volUp() {
    volDrag = null;
  }

  const lignesQuiSonnent = $derived(
    LIGNES_ORDRE.filter((name) => {
      const n = nbPas(name);
      for (let i = 0; i < n; i++) if (pasActif(name, i)) return true;
      return false;
    }),
  );
  /* Un motif entièrement vide n'a aucune ligne à montrer : on garde la
     batterie plutôt qu'un cadre noir, pour que la géométrie reste stable
     pendant qu'on charge une séquence. */
  const lignesVisibles = $derived(lignesQuiSonnent.length ? lignesQuiSonnent : DRUM_ROW_NAMES);

  const LIGNE_LIBELLE: Record<DrumRowName | SynthRowName, string> = {
    kick: 'KICK',
    snare: 'CAISSE',
    hat: 'CHARLEY',
    clap: 'CLAP',
    shaker: 'SHAKER',
    bass: 'BASSE',
    pad: 'NAPPE',
    melody: 'MÉLODIE',
  };

  // Un canvas par ligne : la géométrie vient du DOM (une seule source), et
  // chaque ligne reste un vrai <button> — donc une vraie cible et un vrai
  // libellé accessible, ce qu'un canvas unique avec test de collision aurait
  // perdu.
  let pisteCanvas = $state<Partial<Record<DrumRowName | SynthRowName, HTMLCanvasElement>>>({});

  function teteDe(name: DrumRowName | SynthRowName): number {
    return name in st.rows ? playhead[name as DrumRowName] : synthPlayhead[name as SynthRowName];
  }

  function drawPiste(name: DrumRowName | SynthRowName, ctx: CanvasRenderingContext2D, taille: number) {
    const canvas = pisteCanvas[name]!;
    const r = canvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const n = nbPas(name);
    if (n === 0 || w <= 0) return;
    const muet = ligneCoupee(name);
    const couleur = LINE_COLOR[name];
    const tete = teteDe(name);

    // Repères de temps : un filet par temps, pour lire la mesure sans compter.
    const parTemps = Math.max(1, Math.round(n / 4));
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    for (let i = parTemps; i < n; i += parTemps) ctx.fillRect(Math.round((i / n) * w), 1, 1, h - 2);

    const y = (h - taille) / 2;
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n) * w - taille / 2;
      const actif = pasActif(name, i);
      ctx.fillStyle = muet
        ? actif
          ? 'rgba(255,255,255,.11)'
          : 'rgba(255,255,255,.05)'
        : i === tete
          ? '#eafff0'
          : actif
            ? couleur
            : 'rgba(255,255,255,.10)';
      roundRectPath(ctx, x, y, taille, taille, 2);
      ctx.fill();
    }
  }

  /* UNE taille de carré pour tout le séquenceur, commandée par la ligne la
     plus dense affichée puis plafonnée par la hauteur de ligne. Mesuré : dans
     la colonne centrale de 300 px, la piste utile fait 219 px, donc à 16 pas
     le carré est plafonné à ~11 px PAR LA LARGEUR — réduire la hauteur du
     séquenceur n'y changerait rien. */
  function tailleCarre(): number {
    const premier = lignesVisibles[0];
    const canvas = premier ? pisteCanvas[premier] : undefined;
    if (!canvas) return 8;
    const r = canvas.getBoundingClientRect();
    if (r.width <= 0) return 8;
    const nMax = Math.max(1, ...lignesVisibles.map((n) => nbPas(n)));
    return Math.max(4, Math.min(r.width / nMax - 2, r.height - 6));
  }

  /* Analyseur de spectre — le visualiseur de Winamp, et cette fois pour de bon.
   *
   * Deux versions ont précédé celle-ci. La première faisait une barre pleine
   * hauteur par ligne : elle doublonnait le séquenceur linéaire juste au-
   * dessus. La deuxième répartissait les six niveaux de ligne sur 22 barres
   * via une cloche centrée sur la position supposée de chaque élément dans le
   * spectre — un joli relief, mais construit sur un CLASSEMENT arbitraire du
   * registre de chaque son, pas sur une mesure. Un kick filtré en aigu s'y
   * affichait toujours dans les graves.
   *
   * Ici : le vrai AnalyserNode maître du graphe (`engine.getSpectrum`), branché
   * sur `finalGain`, donc sur ce qu'on entend — limiteur et volume compris.
   * Répartition logarithmique des bandes parce que l'oreille entend en octaves,
   * crête par bande et non moyenne parce qu'une moyenne écrase les
   * transitoires — et un analyseur de percussions qui écrase les transitoires
   * ne montre plus rien. Capuchon qui monte d'un coup et retombe lentement :
   * c'est ce détail-là qui fait « analyseur » plutôt que « barres animées ».
   */
  // Ambre de la zone médiane du dégradé. En dur comme LINE_COLOR juste au-
  // dessus, et pour la même raison : un canvas ne résout pas une variable CSS.
  const EQ_AMBRE = '#ffd54a';
  const EQ_BINS = new Uint8Array(new ArrayBuffer(512));
  const EQ_PICS = new Float32Array(EQ_BAR_COUNT);

  function drawVizBars(ctx: CanvasRenderingContext2D) {
    const r = vizCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const taille = engine.spectrumSize || 256;
    const vivant = engine.getSpectrum(EQ_BINS);

    // Dégradé peint sur la COLONNE et non sur la barre : il ne bouge jamais,
    // seule la hauteur découpée dedans change. C'est ce qui fait qu'on lit un
    // niveau et pas une teinte.
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, LINE_COLOR.kick);
    grad.addColorStop(0.35, EQ_AMBRE);
    grad.addColorStop(1, LINE_COLOR.hat);

    const barW = w / EQ_BAR_COUNT;
    const bw = Math.max(1, barW - 2);
    for (let i = 0; i < EQ_BAR_COUNT; i++) {
      const v = vivant ? niveauBarre(EQ_BINS, i, EQ_BAR_COUNT, taille) : 0;
      EQ_PICS[i] = v > EQ_PICS[i] ? v : Math.max(v, EQ_PICS[i] - CHUTE_CAPUCHON);
      const x = i * barW + 1;
      const hb = Math.round(v * (h - 3));
      if (hb > 0) {
        ctx.fillStyle = grad;
        roundRectPath(ctx, x, h - hb, bw, hb, 1.5);
        ctx.fill();
      }
      const hp = Math.round(EQ_PICS[i] * (h - 3));
      if (hp > 1) {
        ctx.fillStyle = '#c8c8d8';
        ctx.fillRect(x, h - hp - 2, bw, 1);
      }
    }
  }

  // ---- Viz ② et ③ (phase 4) — mises de côté en phase 2 au profit des
  // barres, reprises ici en option plutôt qu'abandonnées (PLAN.md §7). Dans
  // la maquette d'origine les deux tournaient sur une horloge synthétique ;
  // ici le "beat" vient du vrai niveau de la ligne kick (getLineLevels()),
  // avec le même relâchement exponentiel que les barres pour un rebond net
  // plutôt qu'un clignotement pas-à-pas.
  let artyBeatSmooth = 0;
  function drawVizArty(ctx: CanvasRenderingContext2D, now: number) {
    const r = vizCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.fillStyle = 'rgba(4,3,12,.32)';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2,
      cy = h / 2;
    const kick = engine.getLineLevels().kick ?? 0;
    artyBeatSmooth = Math.max(kick, artyBeatSmooth * 0.85);
    const beat = Math.min(1, artyBeatSmooth * 3.5);
    const baseR = Math.min(w, h) * 0.14 * (1 + beat * 0.7);
    const rays = 40;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + now * 0.5;
      const len = baseR * (1.7 + Math.sin(now * 2.2 + i * 0.5) * 0.55 + beat * 0.9);
      const hue = (now * 46 + i * (360 / rays)) % 360;
      ctx.strokeStyle = `hsla(${hue},92%,66%,.55)`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * baseR * 0.5, cy + Math.sin(a) * baseR * 0.5);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR);
    grad.addColorStop(0, `hsla(${(now * 60) % 360},95%,72%,.95)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fill();
  }

  function terrainY(x: number, scroll: number, h: number) {
    return h * 0.66 + Math.sin((x + scroll) * 0.018) * h * 0.07 + Math.sin((x + scroll) * 0.045 + 1.3) * h * 0.035;
  }
  // Viz ③ — lapin coureur (PLAN.md §7, « à refaire ») : le bâton générique
  // précédent réagissait au seul niveau de la ligne kick pour son unique
  // geste (le saut). Ici chaque tambour pilote un geste distinct — détecté
  // par un FRONT MONTANT du niveau réel de sa ligne (getLineLevels(), même
  // source que la viz① et l'arty) plutôt que par le niveau continu : ça
  // distingue un coup d'un simple maintien au-dessus du seuil. Cooldown
  // court pour éviter qu'une même frappe, dont la crête oscille en
  // redescendant, ne redéclenche plusieurs fois de suite.
  const RUNNER_TRIGGER_THRESHOLD = 0.1;
  const RUNNER_TRIGGER_COOLDOWN = 0.08; // s
  const runnerPrevLevel: Partial<Record<DrumRowName, number>> = {};
  const runnerLastTrigger: Partial<Record<DrumRowName, number>> = {};
  function runnerEdge(
    name: DrumRowName,
    levels: Partial<Record<DrumRowName | SynthRowName, number>>,
    now: number,
  ): boolean {
    const level = levels[name] ?? 0;
    const prev = runnerPrevLevel[name] ?? 0;
    runnerPrevLevel[name] = level;
    const last = runnerLastTrigger[name] ?? -10;
    if (level > RUNNER_TRIGGER_THRESHOLD && prev <= RUNNER_TRIGGER_THRESHOLD && now - last > RUNNER_TRIGGER_COOLDOWN) {
      runnerLastTrigger[name] = now;
      return true;
    }
    return false;
  }

  let runnerKickT = -10;
  let runnerSnareT = -10;
  let runnerHatT = -10;

  // Horloge de course : n'avance que pendant la lecture (retour de Yann,
  // 2026-08-13 — le lapin courait sur une horloge murale indépendante de la
  // musique, y compris à l'arrêt). `now` reste l'horloge murale (utilisée
  // ailleurs pour le cooldown des déclencheurs) ; `runnerClock` est ce que
  // le décor/lapin doit suivre.
  let runnerClock = 0;
  let runnerLastNow = 0;

  // Distance « monde » d'un pas de la ligne kick — la vitesse de défilement
  // s'en déduit (px/s = distance / durée réelle du pas), donc suit le tempo
  // au lieu d'une constante figée. Calibré pour retrouver ~70px/s au réglage
  // par défaut (120 BPM, kick à 4 pas).
  const RUNNER_STEP_PX = 35;
  function runnerStepDur(): number {
    return barDuration(st.tempo) / (st.rows.kick.subdiv || 1);
  }
  function runnerScrollSpeed(): number {
    return RUNNER_STEP_PX / runnerStepDur();
  }

  // Carottes le long du chemin, en coordonnées « monde » (indépendantes du
  // défilement — leur position à l'écran se déduit de `scroll`). Espacées
  // sur le pattern réel de la ligne kick (une carotte par pas actif, pas
  // silencieux comptés) plutôt qu'à intervalle aléatoire — manger une
  // carotte doit correspondre à un coup de kick effectivement programmé.
  let runnerCarrots: { world: number; bite: number }[] = [];
  let runnerStepCursor = 0;
  let runnerCursorWorld = 0;
  function runnerSeedCarrots(startWorld: number) {
    runnerCarrots = [];
    runnerStepCursor = 0;
    runnerCursorWorld = startWorld + 90;
  }
  function runnerRefillCarrots(aheadWorld: number) {
    const kick = st.rows.kick;
    const subdiv = kick.subdiv || 1;
    let guard = subdiv * 4; // au plus quelques tours de pattern par frame
    while (guard-- > 0 && (runnerCarrots.length < 5 || runnerCursorWorld < aheadWorld)) {
      if ((kick.pattern[runnerStepCursor] ?? 0) > 0) runnerCarrots.push({ world: runnerCursorWorld, bite: 0 });
      runnerStepCursor = (runnerStepCursor + 1) % subdiv;
      runnerCursorWorld += RUNNER_STEP_PX;
    }
  }
  // Mange la carotte la plus proche devant le lapin — tolérant plutôt que
  // strict sur la distance : au tempo réel un kick tombe naturellement près
  // d'une carotte grâce à leur espacement régulier.
  function runnerEatNextCarrot(scroll: number, charX: number) {
    let best: { world: number; bite: number } | null = null;
    for (const c of runnerCarrots) {
      const sx = c.world - scroll;
      if (sx > charX - 60 && (!best || sx < best.world - scroll)) best = c;
    }
    if (best) best.bite = 0.001; // > 0 amorce l'animation de disparition
  }

  function drawVizRunner(ctx: CanvasRenderingContext2D, now: number) {
    const r = vizCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0c1030');
    sky.addColorStop(1, '#1c2450');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const dt = runnerLastNow ? Math.min(now - runnerLastNow, 1 / 20) : 0;
    runnerLastNow = now;
    if (playing) runnerClock += dt;
    const scrollSpeed = runnerScrollSpeed();
    const scroll = runnerClock * scrollSpeed;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, terrainY(x, scroll * 0.35, h) - h * 0.1);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = '#243068';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, h);
    const groundPts: [number, number][] = [];
    for (let x = 0; x <= w; x += 6) {
      const y = terrainY(x, scroll, h);
      groundPts.push([x, y]);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = '#123a24';
    ctx.fill();
    ctx.beginPath();
    groundPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = '#35e07a';
    ctx.lineWidth = 2;
    ctx.stroke();

    const charX = w * 0.3;
    const groundY = terrainY(charX, scroll, h);

    const levels = engine.getLineLevels();
    if (runnerEdge('kick', levels, now)) {
      runnerEatNextCarrot(scroll, charX);
      runnerKickT = now;
    }
    if (runnerEdge('snare', levels, now)) runnerSnareT = now;
    if (runnerEdge('hat', levels, now)) runnerHatT = now;

    // ---- Ravitaillement des carottes ----
    if (runnerCarrots.length === 0) runnerSeedCarrots(scroll + charX);
    runnerCarrots = runnerCarrots.filter((c) => c.world - scroll > charX - 140 && c.bite < 1);
    runnerRefillCarrots(scroll + w + 140);

    // ---- Carottes ----
    runnerCarrots.forEach((c) => {
      const sx = c.world - scroll;
      if (sx < -20 || sx > w + 20) return;
      const gy = terrainY(sx, scroll, h);
      const bounce = c.bite > 0 ? c.bite : 0;
      const scale = 1 - bounce;
      if (scale <= 0.02) return;
      const cw = 8 * scale,
        ch = 12 * scale;
      const cy = gy - ch * 0.5 - bounce * 14;
      ctx.save();
      ctx.translate(sx, cy);
      ctx.fillStyle = '#ff8f3c';
      ctx.beginPath();
      ctx.moveTo(-cw / 2, -ch * 0.15);
      ctx.lineTo(cw / 2, -ch * 0.15);
      ctx.lineTo(0, ch * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#35e07a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-2.5, -ch * 0.15);
      ctx.lineTo(-3.5, -ch * 0.7);
      ctx.moveTo(0, -ch * 0.15);
      ctx.lineTo(0, -ch * 0.85);
      ctx.moveTo(2.5, -ch * 0.15);
      ctx.lineTo(3.5, -ch * 0.7);
      ctx.stroke();
      ctx.restore();
      if (c.bite > 0) c.bite = Math.min(1, c.bite + 0.09);
    });

    // ---- Lapin ----
    const sinceSnare = now - runnerSnareT;
    const sinceHat = now - runnerHatT;
    const sinceKick = now - runnerKickT;
    const snareDur = 0.42;
    const hatDur = 0.18;
    const snareArc = sinceSnare >= 0 && sinceSnare < snareDur ? Math.sin((sinceSnare / snareDur) * Math.PI) : 0;
    const hatArc = sinceHat >= 0 && sinceHat < hatDur ? Math.sin((sinceHat / hatDur) * Math.PI) : 0;
    const jump = snareArc * h * 0.22 + hatArc * h * 0.06;
    const squash = sinceSnare >= 0 && sinceSnare < snareDur ? 1 - snareArc * 0.28 : 1;
    const chomp = sinceKick >= 0 && sinceKick < 0.22 ? Math.sin((sinceKick / 0.22) * Math.PI) : 0;

    const run = runnerClock * 12 * (scrollSpeed / 70);
    const bodyBob = Math.sin(run) * h * 0.012 * (1 - snareArc);
    const cy = groundY - jump - h * 0.05 + bodyBob;
    const u = h * 0.0105; // unité de base — toutes les proportions du lapin en dérivent

    // ombre au sol : rétrécit et s'estompe avec la hauteur du saut, pour
    // ancrer le personnage même quand il décolle du terrain.
    const shadowScale = Math.max(0.35, 1 - (jump / (h * 0.26)) * 0.65);
    ctx.save();
    ctx.translate(charX, groundY + 1);
    ctx.scale(shadowScale, shadowScale * 0.38);
    const shGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, u * 9);
    shGrad.addColorStop(0, 'rgba(5,5,10,0.4)');
    shGrad.addColorStop(1, 'rgba(5,5,10,0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.arc(0, 0, u * 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(charX, cy);
    ctx.scale(1 / squash, squash);

    const legSwing = Math.sin(run) * u * 2 * (1 - snareArc * 0.6);
    const legSwingF = Math.cos(run) * u * 1.4 * (1 - snareArc * 0.6);
    const furStroke = '#c9a97a';

    // patte arrière — courte et trapue, dessinée en premier pour passer
    // sous le corps.
    ctx.strokeStyle = '#ded2ae';
    ctx.lineWidth = u * 2.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-u * 3, u * 3);
    ctx.quadraticCurveTo(-u * 3 + legSwing * 0.4, u * 5.6, -u * 3 + legSwing, u * 7.8);
    ctx.stroke();
    ctx.fillStyle = '#ded2ae';
    ctx.beginPath();
    ctx.ellipse(-u * 3 + legSwing, u * 8.2, u * 1.7, u * 1, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // queue — petit pompon dégradé
    const tailGrad = ctx.createRadialGradient(-u * 7.6, -u * 1, 0, -u * 7.6, -u * 1, u * 2.7);
    tailGrad.addColorStop(0, '#fffaf0');
    tailGrad.addColorStop(1, '#e4d5ac');
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.arc(-u * 7.6, -u * 1, u * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // corps — silhouette en courbes de Bézier (poitrail relevé, croupe
    // arrondie) plutôt qu'une ellipse plate, avec un léger dégradé pour le
    // volume.
    const bodyGrad = ctx.createLinearGradient(0, -u * 9, 0, u * 6);
    bodyGrad.addColorStop(0, '#fffdf6');
    bodyGrad.addColorStop(1, '#e4d9bd');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-u * 8, u * 3);
    ctx.bezierCurveTo(-u * 9.2, -u * 4, -u * 4, -u * 8.6, u * 2, -u * 8);
    ctx.bezierCurveTo(u * 8, -u * 7.4, u * 10, -u * 1.8, u * 8.4, u * 3.2);
    ctx.bezierCurveTo(u * 6.8, u * 6.6, -u * 6, u * 6.6, -u * 8, u * 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = furStroke;
    ctx.lineWidth = u * 0.5;
    ctx.stroke();

    // tête
    const headX = u * 9.6,
      headY = -u * 8.6;
    const headR = u * 4.7;
    const headGrad = ctx.createRadialGradient(
      headX - headR * 0.3,
      headY - headR * 0.3,
      headR * 0.2,
      headX,
      headY,
      headR * 1.25,
    );
    headGrad.addColorStop(0, '#fffdf6');
    headGrad.addColorStop(1, '#ecdfc0');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(headX, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = furStroke;
    ctx.lineWidth = u * 0.45;
    ctx.stroke();

    // oreilles — se couchent en arrière au sprint, se dressent au saut,
    // dégradé + pavillon interne rosé pour la profondeur.
    const earLean = -0.32 + snareArc * 0.5 - Math.max(0, Math.sin(run)) * 0.09;
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(headX + side * headR * 0.4, headY - headR * 0.55);
      ctx.rotate(side * 0.24 + earLean);
      const earGrad = ctx.createLinearGradient(0, -headR * 2.35, 0, 0);
      earGrad.addColorStop(0, '#fffdf6');
      earGrad.addColorStop(1, '#ecdfc0');
      ctx.fillStyle = earGrad;
      ctx.beginPath();
      ctx.ellipse(0, -headR * 1.15, headR * 0.34, headR * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = furStroke;
      ctx.lineWidth = u * 0.35;
      ctx.stroke();
      ctx.fillStyle = '#ffc9d6';
      ctx.beginPath();
      ctx.ellipse(0, -headR * 1.1, headR * 0.17, headR * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // joue — petit renflement pour donner du volume au museau
    ctx.fillStyle = '#fffdf6';
    ctx.beginPath();
    ctx.arc(headX + headR * 0.55, headY + headR * 0.45, headR * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // nez + bouche (s'ouvre au chomp) + moustaches
    const mouthOpen = chomp * headR * 0.55;
    ctx.save();
    ctx.translate(headX + headR * 0.85, headY + headR * 0.25);
    ctx.fillStyle = '#ff9e8f';
    ctx.beginPath();
    ctx.moveTo(0, -headR * 0.12);
    ctx.quadraticCurveTo(headR * 0.16, 0, 0, headR * 0.12);
    ctx.quadraticCurveTo(-headR * 0.16, 0, 0, -headR * 0.12);
    ctx.fill();
    ctx.strokeStyle = '#7a5230';
    ctx.lineWidth = u * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, headR * 0.1);
    ctx.lineTo(-headR * 0.05 - mouthOpen * 0.5, headR * 0.1 + mouthOpen);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,70,0.5)';
    ctx.lineWidth = u * 0.25;
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(headR * 0.05, s * headR * 0.06 * (i + 1));
        ctx.lineTo(headR * 0.75, s * headR * 0.24 * (i + 1));
        ctx.stroke();
      }
    });
    ctx.restore();

    // œil avec reflet
    ctx.fillStyle = '#2a1f14';
    ctx.beginPath();
    ctx.arc(headX + headR * 0.28, headY - headR * 0.08, headR * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headX + headR * 0.33, headY - headR * 0.15, headR * 0.05, 0, Math.PI * 2);
    ctx.fill();

    // patte avant — dessinée en dernier, au premier plan devant le corps
    ctx.strokeStyle = '#ded2ae';
    ctx.lineWidth = u * 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(u * 7.6, u * 1.5);
    ctx.quadraticCurveTo(u * 7.6 + legSwingF * 0.4, u * 4.4, u * 7.6 + legSwingF, u * 6.6);
    ctx.stroke();
    ctx.fillStyle = '#ded2ae';
    ctx.beginPath();
    ctx.ellipse(u * 7.6 + legSwingF, u * 7, u * 1.25, u * 0.8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawVisualizer(ctx: CanvasRenderingContext2D, now: number) {
    if (assignments.viz === 'arty') drawVizArty(ctx, now);
    else if (assignments.viz === 'runner') drawVizRunner(ctx, now);
    else drawVizBars(ctx);
  }

  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as DrumRowName] = ev.col;
      else synthPlayhead[ev.name as SynthRowName] = ev.col;
    }
    breakArmed = engine.breakPending;
    fillArmed = engine.fillPending;
    suivreArchitecture();
    avancement = avancementSection();
    mesureDansSection = Math.max(0, engine.barDansSection);
    const taille = tailleCarre();
    for (const name of lignesVisibles) {
      const canvas = pisteCanvas[name];
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ensureSize(canvas, ctx);
      drawPiste(name, ctx, taille);
    }
    if (vizCanvas) {
      const vizCtx = vizCanvas.getContext('2d');
      if (vizCtx) {
        ensureSize(vizCanvas, vizCtx);
        drawVisualizer(vizCtx, performance.now() / 1000);
      }
    }
    raf = requestAnimationFrame(loop);
  }

  onMount(() => {
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    loop();
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('deviceorientation', onOrientationEvent);
      cancelAnimationFrame(raf);
    };
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    // Quitter le Mode Live (×) pendant un enregistrement en cours livre quand
    // même le WAV plutôt que de le jeter — même geste que STOP (togglePlay).
    if (recording) {
      const buffer = engine.stopCapture();
      if (buffer) downloadCapture(buffer);
    }
    engine.stop();
  });
</script>

<div class="live-root">
  {#if isPortrait}
    <div class="rotate-screen">
      <div class="rotate-icon">📱</div>
      <div class="msg">TOURNE TON TÉLÉPHONE</div>
      <button class="exit-link" onclick={onExit}>← Retour</button>
    </div>
  {:else}
    <div class="live">
      <div class="titlebar">
        <span class="grip"></span>
        <span class="app-name">BOÎTE À RYTHMES — LIVE</span>
        <button class="win-dots tap44" onclick={onExit} title="Quitter le Mode Live" aria-label="Quitter">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="topbar">
        <button class="amp-btn stop tap44" onclick={togglePlay}>{playing ? '■ STOP' : '▶ PLAY'}</button>
        <button
          class="amp-btn rec tap44"
          class:on={recording}
          onclick={toggleRecord}
          title={recording
            ? 'Arrêter et récupérer le WAV'
            : playing
              ? 'Enregistrer à partir de maintenant'
              : 'Lancer le morceau depuis le début ET enregistrer'}
        >
          <span class="rec-dot"></span>{recording ? 'REC…' : 'REC'}
        </button>
        <div class="lcd-block">
          <div class="lcd-tempo">
            <span class="lcd">{Math.round(st.tempo)} BPM · {playing ? 'LECTURE' : 'ARRÊT'}{recording ? ' · ENREGISTREMENT' : ''}{sectionCourante ? ` · ${sectionCourante.nom}` : ''}</span>
          </div>
          <!-- Le musicien pense en CYCLES, l'ingénieur lit des MESURES : les
               deux sont affichés, et personne ne se trompe sur ce que « ×8 »
               veut dire. -->
          <span class="lcd-sub">
            {#if sectionCourante}
              MESURE {Math.min(mesureDansSection, mesuresCourantes - 1) + 1}/{mesuresCourantes} · CYCLE DU MOTIF {cycleMotif} MES. · MORCEAU {dureeMorceau}
            {:else}
              TOUT RÉEL · 🎲 AU HASARD · ASSIGNER POUR CHOISIR
            {/if}
          </span>
        </div>
        {#if modeAssign}
          <!-- Sous le loquet, l'inclinaison se RÉASSIGNE au lieu de s'activer :
               tap = un tirage, appui long = la liste. -->
          <button
            class="tilt-btn assignable tap44"
            onpointerdown={() => onAxeDown('axisTilt')}
            onpointerup={() => onAxeUp('axisTilt')}
            onpointerleave={onAxeLeave}
            title="Inclinaison — tap : au hasard · appui long : choisir"
          >
            <span class="led"></span>{axesFor(assignments.axisTilt).map((a) => a.label).join(' + ')}
          </button>
        {:else}
          <button class="tilt-btn tap44" class:on={tiltEnabled} onclick={toggleTilt} title="Inclinaison (optionnelle)">
            <span class="led"></span>{tiltEnabled ? `${Math.round(tiltGamma)}°` : 'TILT'}
          </button>
        {/if}
        <!-- LES DEUX LOQUETS. Ils viennent AVANT ⚙ parce qu'ils le remplacent
             dans neuf cas sur dix : ⚙ ne garde que ce qui n'est pas un geste de
             scène (mode fader, visualiseur, snapshots, banque).
             ⚠️ Le geste est ÉCRIT sur le bouton. Un seul loquet où l'appui long
             ouvrait la liste, personne ne l'a trouvée. -->
        <button
          class="amp-btn gear tap44"
          class:on={modeAssign === 'hasard'}
          onclick={() => (modeAssign = modeAssign === 'hasard' ? null : 'hasard')}
          title="Tirer au hasard — puis taper un bouton, le pad ou l’inclinaison"
        >🎲</button>
        <button
          class="amp-btn assigner tap44"
          class:on={modeAssign === 'choisir'}
          onclick={() => (modeAssign = modeAssign === 'choisir' ? null : 'choisir')}
          title="Assigner — puis taper le bouton, le pad ou l’inclinaison à régler"
        >ASSIGNER</button>
        <button class="amp-btn gear tap44" onclick={() => (assignOpen = true)} title="Réglages">⚙</button>
      </div>
      <!-- LA BANDE — quatre PARTIES, la chaîne, et les deux commandes de jeu,
           sur une seule rangée de 44 px.
           ⚠️ Elle remplace le bandeau de banque, qui prenait 44 px sur 390
           (11 % de la hauteur) pour afficher « Aucune séquence » tant que la
           banque était vide, et la bande d'architecture, qui n'existait qu'une
           fois un modèle chargé depuis ⚙. Une seule rangée porte les deux :
           ce qu'on JOUE (les lettres) et ce qui les ENCHAÎNE (la chaîne). -->
      <div class="strip">
        <div class="parties">
          {#each PARTIES as id (id)}
            {@const remplie = parties.remplie(id)}
            {@const jouee = sectionCourante ? sectionCourante.partie === id : partieHorsChaine === id}
            <button
              class="partie"
              class:remplie
              class:on={remplie && jouee}
              disabled={!remplie}
              onclick={() => jouerPartie(id)}
              title={remplie
                ? `Jouer ${id}${parties.get(id)?.nom ? ` — ${parties.get(id)?.nom}` : ''}`
                : `${id} est vide — on range une lettre dans l’Atelier, onglet Production`}
            >
              <span class="partie-lettre">{id}</span>
              <span class="partie-etat">{remplie ? (parties.get(id)?.nom || 'RANGÉE') : 'vide'}</span>
            </button>
          {/each}
        </div>
        {#if archSections.length}
          <div class="cases">
            {#each archSections as sec, i (sec.id)}
              <button
                class="case"
                class:on={i === sectionIndex}
                class:done={i < sectionIndex}
                class:vide={!parties.remplie(sec.partie)}
                onpointerdown={() => onCaseDown(i)}
                onpointerup={() => onCaseUp(i)}
                onpointerleave={onCaseLeave}
                title="{sec.nom} — {libelleDePartie(sec)} · {mesuresDeSection(sec, cycleDe(sec.partie))} mesures · appui long : changer la lettre ou la longueur"
              >
                {#if i === sectionIndex}
                  <span class="fill" style:width="{avancement * 100}%"></span>
                {/if}
                <span class="case-nom">{sec.nom}</span>
                <span class="case-n">{libelleDePartie(sec)} ×{sec.cycles}</span>
              </button>
            {/each}
          </div>
          <div class="strip-tools">
            <button class="amp-btn strip-btn next tap44" onclick={sauterSection} title="Scène suivante, à la mesure">▸</button>
            <button
              class="amp-btn strip-btn tap44"
              class:on={tenirSection}
              onpointerdown={() => (tenirSection = true)}
              onpointerup={() => (tenirSection = false)}
              onpointerleave={() => (tenirSection = false)}
              title="Boucler la scène courante tant qu'on tient"
            >TENIR</button>
            <button
              class="amp-btn strip-btn tap44"
              onclick={() => (picker = { kind: 'montage' })}
              title="Changer de montage"
            >≡</button>
          </div>
        {:else}
          <!-- Sans chaîne : le montage se choisit ICI, pas dans ⚙. C'est le
               bouton le plus large de la rangée parce que c'est le geste par
               lequel on commence un morceau. -->
          <button class="montage-vide tap44" onclick={() => (picker = { kind: 'montage' })}>
            ≡ MONTER UN MORCEAU — INTRO · COUPLET · REFRAIN…
          </button>
        {/if}
      </div>
      {#if tiltDenied}
        <!-- Hors du flux de la grille exprès : un enfant de grille conditionnel
             décale l'auto-placement des rangées suivantes (voir le commentaire
             sur .main plus bas) — un toast en position absolute n'a pas ce
             problème. -->
        <p class="tilt-warn">Capteur refusé — le mode reste jouable au tactile seul.</p>
      {/if}
      <div class="main">
        <div class="buttons">
          <!-- Les six boutons n'ont plus d'icônes de coin. Elles portaient le
               verrou, le 🎲 et l'assignation en 22px posés SUR le pad : trois
               cibles qu'on ne pouvait pas amener à 44px sans manger la surface
               qu'on frappe en jouant — 3 × 44 = 132px pour un bouton large de
               128. Or l'overlay ⚙ portait déjà les trois, en pleine taille. On
               garde donc une seule surface de réglage (règle A6), et le pad
               redevient entièrement jouable. Verrouiller ou rebrasser un bouton
               est un geste de préparation, pas un geste de scène. -->
          {#each assignments.slots as actionIds, i (i)}
            {@const mode = assignments.slotModes[i]}
            <div class="abtn-wrap">
              {#if modeAssign}
                <!-- Sous le loquet, un bouton n'agit plus : il montre ce qu'il
                     porte et se réassigne. Tap = un tirage, appui long = la
                     liste complète — sur place, sans overlay. -->
                {@const label =
                  assignments.slotModes[i] === 'fader'
                    ? axesFor(assignments.slotFaders[i]).map((a) => a.label).join(' + ')
                    : actionsFor(actionIds).map((d) => d.label).join(' + ')}
                <button
                  class="abtn assignable"
                  onpointerdown={() => onSlotDown(i)}
                  onpointerup={() => onSlotUp(i)}
                  onpointerleave={() => onSlotLeave(i)}
                >
                  <span class="assign-mark">{modeAssign === 'hasard' ? '🎲' : '✎'}</span>
                  <span>{label}</span>
                  <span class="assign-label"
                    >{modeAssign === 'hasard' ? 'taper : au hasard' : 'taper : choisir dans la liste'}</span
                  >
                </button>
              {:else if mode === 'fader'}
                {@const faderIds = assignments.slotFaders[i]}
                {@const momentane = assignments.faderMomentane[i]}
                {@const tenu = faderDraggingIndex === i}
                <!-- ⚠️ Un momentané AU REPOS n'affiche pas de valeur : il n'en
                     porte pas. Le réglage est au morceau, pas au bouton — la
                     barre serait un chiffre inventé, et c'est la même erreur
                     que le maintenu qui « rouvre à 20 kHz ». Il montre donc son
                     nom et le mot MOMENTANÉ, et ne se remplit que sous le
                     doigt. -->
                {@const val = momentane && !tenu ? 0 : (axisValues[faderIds[0]] ?? 0.5)}
                {@const horizontal = assignments.faderOrientation[i] === 'horizontal'}
                <div
                  class="abtn fader-btn"
                  class:momentane
                  class:tenu
                  class:horizontal
                  role="slider"
                  aria-label={axesFor(faderIds)
                    .map((a) => a.label)
                    .join(' + ')}
                  aria-valuenow={Math.round(val * 100)}
                  tabindex="0"
                  onpointerdown={(e) => faderPointerDown(i, e, e.currentTarget as HTMLDivElement)}
                  onpointermove={(e) => faderPointerMove(i, e, e.currentTarget as HTMLDivElement)}
                  onpointerup={() => faderPointerUp(i)}
                  onpointerleave={() => faderPointerUp(i)}
                >
                  {#if horizontal}
                    <div class="fader-fill" style:width="{val * 100}%"></div>
                  {:else}
                    <div class="fader-fill" style:height="{val * 100}%"></div>
                  {/if}
                  <span class="fader-label">{axesFor(faderIds).map((a) => a.label).join(' + ')}</span>
                  <span class="fader-val">{momentane && !tenu ? 'MOMENTANÉ' : `${Math.round(val * 100)}%`}</span>
                </div>
              {:else}
                {@const defs = actionsFor(actionIds)}
                <button
                  class="abtn"
                  class:pressed={pressed[i]}
                  class:active={actionIds.some((id) => isActionActive(id))}
                  onpointerdown={() => onSlotDown(i)}
                  onpointerup={() => onSlotUp(i)}
                  onpointerleave={() => onSlotLeave(i)}
                >
                  <span class="dot-row">
                    {#each defs as d (d.id)}<span class="dot" style:background={d.color}></span>{/each}
                  </span>
                  <span>{defs.map((d) => d.label).join(' + ')}</span>
                  {#if defs.length === 1}<span class="assign-label">{defs[0].desc}</span>{/if}
                </button>
              {/if}
            </div>
          {/each}
        </div>
        <div class="mid-col">
          <!-- Le séquenceur EST le panneau de mutes : on coupe une ligne là où
               on la voit. Chaque ligne est un vrai bouton — la piste dessinée
               au canvas n'est que son contenu. -->
          <!-- La hauteur de ligne suit le NOMBRE de lignes qui sonnent : au-delà
               de six, elle descend à 22 px pour que le visualiseur garde une
               place lisible (mesuré : 8 lignes à 26 px ne lui laisseraient que
               17 px). Le séquenceur prend ce qu'il faut, le visualiseur le reste. -->
          <!-- Les deux modes du bloc, ÉCRITS. Le bloc n'avait pas de titre ;
               il en a un maintenant, et c'est lui qui dit ce qu'on règle. -->
          <div class="seq-modes">
            <button class="seq-mode tap44-y" class:on={seqMode === 'pas'} onclick={() => (seqMode = 'pas')}>▦ PAS</button>
            <button class="seq-mode tap44-y" class:on={seqMode === 'volume'} onclick={() => (seqMode = 'volume')}
              >▮ VOLUMES</button
            >
          </div>
          <div class="seq" style:--ligne-h="{lignesVisibles.length > 6 ? 22 : 26}px">
            {#each lignesVisibles as name (name)}
              {@const muet = ligneCoupee(name)}
              {#if seqMode === 'pas'}
                <!-- Mode PAS : la ligne entière coupe, exactement comme avant. -->
                <button
                  class="ligne"
                  class:muet
                  onpointerdown={() => basculerLigne(name)}
                  aria-pressed={muet}
                  title={muet ? `${LIGNE_LIBELLE[name]} — coupée, taper pour rouvrir` : `${LIGNE_LIBELLE[name]} — taper pour couper`}
                >
                  <span class="pastille" style:background={LINE_COLOR[name]}></span>
                  <span class="nom">{LIGNE_LIBELLE[name]}</span>
                  <canvas class="piste" bind:this={pisteCanvas[name]}></canvas>
                </button>
              {:else}
                <!-- Mode VOLUMES : le nom coupe, la piste devient le curseur.
                     Deux cibles distinctes plutôt qu'un bouton contenant un
                     curseur — un interactif dans un interactif ne se tape pas
                     de façon prévisible. -->
                {@const v = volumeDe(name)}
                {@const frac = v / volMax(name)}
                <div class="ligne" class:muet>
                  <button
                    class="ligne-mute"
                    onpointerdown={() => basculerLigne(name)}
                    aria-pressed={muet}
                    title={muet ? `${LIGNE_LIBELLE[name]} — coupée, taper pour rouvrir` : `${LIGNE_LIBELLE[name]} — taper pour couper`}
                  >
                    <span class="pastille" style:background={LINE_COLOR[name]}></span>
                    <span class="nom">{LIGNE_LIBELLE[name]}</span>
                  </button>
                  <div
                    class="ligne-vol"
                    role="slider"
                    tabindex="0"
                    aria-label="Volume {LIGNE_LIBELLE[name]}"
                    aria-valuenow={Math.round(frac * 100)}
                    onpointerdown={(e) => volDown(name, e, e.currentTarget as HTMLDivElement)}
                    onpointermove={(e) => volMove(name, e, e.currentTarget as HTMLDivElement)}
                    onpointerup={volUp}
                    onpointerleave={volUp}
                  >
                    <div class="ligne-vol-fill" style:width="{frac * 100}%" style:background={LINE_COLOR[name]}></div>
                    <span class="ligne-vol-val">{Math.round(v * 100)}%</span>
                  </div>
                </div>
              {/if}
            {/each}
          </div>
          <div class="viz-wrap">
            <span class="viz-label">{vizById(assignments.viz).label}</span>
            <canvas bind:this={vizCanvas}></canvas>
          </div>
        </div>
        <div class="pad-col">
          <div
            class="pad"
            role="slider"
            aria-label="{axesFor(assignments.axisX).map((a) => a.label).join(' + ')} / {axesFor(assignments.axisY).map((a) => a.label).join(' + ')}"
            aria-valuenow={Math.round(padX * 100)}
            tabindex="0"
            onpointerdown={(e) => padPointerDown(e, e.currentTarget as HTMLDivElement)}
            onpointermove={(e) => padPointerMove(e, e.currentTarget as HTMLDivElement)}
            onpointerup={() => (dragging = false)}
          >
            <div class="pad-thumb" style:left="{padX * 100}%" style:top="{padY * 100}%"></div>
            {#if modeAssign}
              <!-- Deux moitiés plutôt qu'un pad qui change de sens : X à
                   gauche, Y à droite, chacune avec la même paire de gestes que
                   les boutons. Le pad garde ses deux axes distincts, ce qu'un
                   seul bouton d'assignation ne saurait pas faire. -->
              <div class="pad-assign">
                <button
                  class="pad-half"
                  onpointerdown={(e) => onAxeDown('axisX', e)}
                  onpointerup={(e) => onAxeUp('axisX', e)}
                  onpointerleave={(e) => onAxeLeave(e)}
                >
                  <span class="pad-half-axe">X</span>
                  <span class="pad-half-val">{axesFor(assignments.axisX).map((a) => a.label).join(' + ')}</span>
                </button>
                <button
                  class="pad-half"
                  onpointerdown={(e) => onAxeDown('axisY', e)}
                  onpointerup={(e) => onAxeUp('axisY', e)}
                  onpointerleave={(e) => onAxeLeave(e)}
                >
                  <span class="pad-half-axe">Y</span>
                  <span class="pad-half-val">{axesFor(assignments.axisY).map((a) => a.label).join(' + ')}</span>
                </button>
              </div>
            {/if}
          </div>
          <div class="eq-readout">
            <div class="eq-band">
              <span class="eq-lbl">{axesFor(assignments.axisX).map((a) => a.label).join(' + ')}</span>
              <div class="eq-track"><div class="eq-fill" style:width="{axisValues[assignments.axisX[0]] * 100}%"></div></div>
              <span class="eq-val">{Math.round(axisValues[assignments.axisX[0]] * 100)}%</span>
            </div>
            <div class="eq-band">
              <span class="eq-lbl">{axesFor(assignments.axisY).map((a) => a.label).join(' + ')}</span>
              <div class="eq-track"><div class="eq-fill" style:width="{axisValues[assignments.axisY[0]] * 100}%"></div></div>
              <span class="eq-val">{Math.round(axisValues[assignments.axisY[0]] * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
      {#if assignOpen}
        <div class="assign-overlay show">
          <div class="assign-card">
            <h4>ASSIGNATION</h4>
            <div class="assign-list">
              {#each assignments.slots as actionIds, i (i)}
                {@const mode = assignments.slotModes[i]}
                {@const defs = actionsFor(actionIds)}
                {@const faderDefs = axesFor(assignments.slotFaders[i])}
                <div class="assign-row-wrap">
                  <div class="toggle-row">
                    <button class="mode-toggle" onclick={() => toggleSlotMode(i)} title="Basculer actions / fader">
                      {mode === 'fader' ? '≈ FADER' : '⏻ ACTIONS'}
                    </button>
                    <button class="mode-toggle random-toggle" onclick={() => randomizeSlot(i)} title="Tirer un nouveau réglage au hasard pour ce bouton">
                      🎲
                    </button>
                    {#if mode === 'fader'}
                      <button
                        class="mode-toggle"
                        onclick={() => toggleFaderOrientation(i)}
                        title="Basculer le sens du glisser (vertical / horizontal)"
                      >
                        {assignments.faderOrientation[i] === 'horizontal' ? '↔' : '↕'}
                      </button>
                    {/if}
                  </div>
                  <button
                    class="assign-row"
                    onclick={() => (picker = mode === 'fader' ? { kind: 'slotFader', index: i } : { kind: 'slot', index: i })}
                  >
                    <span class="assign-row-label">BOUTON {i + 1}</span>
                    {#if mode === 'fader'}
                      <span class="assign-row-val">{faderDefs.map((a) => a.label).join(' + ')}</span>
                    {:else}
                      <span class="assign-row-val" style:color={defs[0].color}>{defs.map((d) => d.label).join(' + ')}</span>
                    {/if}
                  </button>
                </div>
              {/each}
              <!-- Le verrou et le 🎲 du pad vivaient UNIQUEMENT dans ses icônes
                   de coin ; en les retirant on aurait perdu deux fonctions.
                   Il descend donc ici, au-dessus des deux axes qu'il gouverne
                   — même rangée d'outils que les six boutons. -->
              <div class="toggle-row pad-tools">
                <span class="assign-row-label">PAD</span>
                <button
                  class="mode-toggle random-toggle"
                  onclick={randomizePad}
                  title="Tirer un nouveau réglage au hasard pour X et Y"
                >
                  🎲
                </button>
              </div>
              <button class="assign-row" onclick={() => (picker = { kind: 'axis', which: 'axisX' })}>
                <span class="assign-row-label">PAD — AXE X (↔)</span>
                <span class="assign-row-val">{axesFor(assignments.axisX).map((a) => a.label).join(' + ')}</span>
              </button>
              <button class="assign-row" onclick={() => (picker = { kind: 'axis', which: 'axisY' })}>
                <span class="assign-row-label">PAD — AXE Y (↕)</span>
                <span class="assign-row-val">{axesFor(assignments.axisY).map((a) => a.label).join(' + ')}</span>
              </button>
              <!-- L'inclinaison n'était rebrassée que par 🔀. Il a disparu ;
                   sans ce dé, elle serait la seule assignation qu'on ne peut
                   plus tirer au hasard. -->
              <div class="toggle-row pad-tools">
                <span class="assign-row-label">INCLINAISON</span>
                <button
                  class="mode-toggle random-toggle"
                  onclick={randomizeTilt}
                  title="Tirer un nouveau réglage au hasard pour l'inclinaison"
                >
                  🎲
                </button>
              </div>
              <button class="assign-row" onclick={() => (picker = { kind: 'axis', which: 'axisTilt' })}>
                <span class="assign-row-label">INCLINAISON — RÉGLAGE</span>
                <span class="assign-row-val">{axesFor(assignments.axisTilt).map((a) => a.label).join(' + ')}</span>
              </button>
              <button class="assign-row" onclick={() => (picker = { kind: 'viz' })}>
                <span class="assign-row-label">VISUALISEUR</span>
                <span class="assign-row-val">{vizById(assignments.viz).label}</span>
              </button>
              <button class="assign-row" onclick={() => (picker = { kind: 'montage' })}>
                <span class="assign-row-label">MONTAGE</span>
                <span class="assign-row-val"
                  >{architecture.courante
                    ? `${architecture.courante.nom} · ${archSections.length} scène${archSections.length > 1 ? 's' : ''}`
                    : 'Aucun — un seul motif qui tourne'}</span
                >
              </button>
              {#each archSections as sec, i (sec.id)}
                <button class="assign-row assign-sous" onclick={() => (picker = { kind: 'section', index: i })}>
                  <span class="assign-row-label">↳ {sec.nom}</span>
                  <span class="assign-row-val">{libelleDePartie(sec)} ×{sec.cycles}</span>
                </button>
              {/each}
              <!-- ⚠️ LA BANQUE A QUITTÉ ⚙ (2026-09-09). Rien de coché sur sa carte
                   de la fiche, et sur la carte « charger un preset » la réponse
                   est écrite : « les LETTRES A/B/C font déjà ce travail, et
                   mieux — elles portent le morceau qu'on a préparé ». Un second
                   chemin vers un motif, plus pauvre que le premier et caché dans
                   un menu, n'avait pas à rester. La banque elle-même n'a pas
                   bougé : elle est dans l'Atelier, où on la range.
                   ⚠️ Ce qui reste, et qui n'est PAS la banque : la bande de
                   scènes A/B/C. L'option de la fiche les confondait sous le mot
                   « séquenceur » ; retirer la bande viderait le mode de ce qu'il
                   est. -->
            </div>

            <h4 class="snapshots-title">SNAPSHOTS <span class="picker-hint">— appui court sauvegarde, appui long rappelle</span></h4>
            <div class="snapshots-row">
              {#each Array(SNAPSHOT_COUNT) as _, i (i)}
                <button
                  class="snapshot-slot"
                  class:filled={!!snapshots[i]}
                  onpointerdown={() => onSnapshotPointerDown(i)}
                  onpointerup={() => onSnapshotPointerUp(i)}
                  onpointerleave={onSnapshotPointerLeave}
                >
                  <span class="snapshot-letter">{String.fromCharCode(65 + i)}</span>
                  <span class="snapshot-state">{snapshots[i] ? 'RÉGLÉ' : 'VIDE'}</span>
                </button>
              {/each}
            </div>

            <button class="amp-btn assign-close tap44" onclick={() => (assignOpen = false)}>FERMÉ · RETOUR AU LIVE</button>
          </div>
        </div>
      {/if}
      <!-- ⚠️ LE SÉLECTEUR VIT HORS DE L'OVERLAY ⚙. Il y était imbriqué, donc il
           ne s'affichait QUE si ⚙ était ouvert — ce qui annulait exactement ce
           que le chantier cherche : choisir un montage, une lettre ou une
           action SANS quitter la surface de jeu. Trouvé en jouant le chemin
           réel (cliquer la bande), pas en relisant le code. -->
      {#if picker}
        {@const currentActionIds = picker.kind === 'slot' ? assignments.slots[picker.index] : []}
        {@const currentAxisIds = picker.kind === 'axis' ? assignments[picker.which] : picker.kind === 'slotFader' ? assignments.slotFaders[picker.index] : []}
        <div class="assign-overlay show">
            <div class="picker-card">
              <h4>
                {picker.kind === 'slot'
                  ? `BOUTON ${picker.index + 1}`
                  : picker.kind === 'slotFader'
                    ? `BOUTON ${picker.index + 1} — FADER`
                    : picker.kind === 'viz'
                      ? 'VISUALISEUR'
                        : picker.kind === 'montage'
                          ? 'MONTER UN MORCEAU'
                          : picker.kind === 'section'
                            ? `SCÈNE — ${archSections[picker.index]?.nom ?? ''}`
                            : picker.kind === 'axis'
                              ? picker.which === 'axisX'
                                ? 'PAD — AXE X'
                                : picker.which === 'axisY'
                                  ? 'PAD — AXE Y'
                                  : 'INCLINAISON'
                              : 'PARAMÈTRE'}
                {#if picker.kind === 'slot' || picker.kind === 'slotFader' || picker.kind === 'axis'}<span
                  class="picker-hint">— plusieurs possibles</span
                >{/if}
              </h4>
              {#if picker.kind === 'slot' || picker.kind === 'slotFader'}
                {@const i = picker.index}
                {@const estFader = assignments.slotModes[i] === 'fader'}
                {@const estMomentane = estFader && assignments.faderMomentane[i]}
                <!-- Les trois modes d'un bouton, ÉCRITS. C'est le chemin qui
                     manquait : depuis la surface de jeu, ASSIGNER + tap ne
                     proposait que des actions, et le mode curseur n'existait
                     que dans ⚙. -->
                <div class="picker-modes">
                  <button
                    class="picker-mode"
                    class:on={!estFader}
                    onclick={() => choisirMode(i, 'actions', false)}
                  >⏻ ACTIONS</button>
                  <button
                    class="picker-mode"
                    class:on={estFader && !estMomentane}
                    onclick={() => choisirMode(i, 'fader', false)}
                  >≈ CURSEUR</button>
                  <button
                    class="picker-mode"
                    class:on={estMomentane}
                    disabled={estFader && !peutEtreMomentane(i)}
                    title="Le doigt se pose : le curseur prend la main et dose. Le doigt lâche : le morceau reprend."
                    onclick={() => choisirMode(i, 'fader', true)}
                  >≋ MOMENTANÉ</button>
                  {#if estFader}
                    <button
                      class="picker-mode"
                      onclick={() => toggleFaderOrientation(i)}
                      title="Sens du glisser (vertical / horizontal)"
                    >{assignments.faderOrientation[i] === 'horizontal' ? '↔' : '↕'}</button>
                  {/if}
                </div>
                <p class="picker-caption">
                  {#if estMomentane}
                    Le doigt se pose : le curseur prend la main et dose. Le doigt lâche : le réglage
                    revient à ce que dit le morceau.
                  {:else if estFader}
                    On glisse sur le bouton : la position donne la valeur, et elle reste.
                  {:else}
                    Un tap déclenche, un maintien tient — le bouton porte une ou plusieurs actions.
                  {/if}
                </p>
              {/if}
              <div class="picker-list">
                {#if picker.kind === 'slot'}
                  {#each ACTION_GROUPS as group (group.name)}
                    <div class="picker-group">{group.name}</div>
                    {#each group.items as a (a.id)}
                      <button
                        class="picker-row"
                        class:current={currentActionIds.includes(a.id)}
                        onclick={() => toggleActionInSlot(a.id)}
                      >
                        <span class="picker-dot" style:background={a.color}></span>
                        <span class="picker-label">{a.label}</span>
                        <span class="picker-desc">{a.desc}</span>
                      </button>
                    {/each}
                  {/each}
                {:else if picker.kind === 'slotFader'}
                  {#each AXIS_GROUPS as group (group.name)}
                    <div class="picker-group">{group.name}</div>
                    {#each group.items as ax (ax.id)}
                      <button
                        class="picker-row"
                        class:current={currentAxisIds.includes(ax.id)}
                        onclick={() => toggleFaderAxisInSlot(ax.id)}
                      >
                        <span class="picker-label">{ax.label}</span>
                      </button>
                    {/each}
                  {/each}
                {:else if picker.kind === 'axis'}
                  {#each AXIS_GROUPS as group (group.name)}
                    <div class="picker-group">{group.name}</div>
                    {#each group.items as ax (ax.id)}
                      <button
                        class="picker-row"
                        class:current={currentAxisIds.includes(ax.id)}
                        onclick={() => toggleAxisInSlot(ax.id)}
                      >
                        <span class="picker-label">{ax.label}</span>
                      </button>
                    {/each}
                  {/each}
                {:else if picker.kind === 'montage'}
                  <p class="picker-caption">
                    Un montage pose la CHAÎNE (intro, couplet, refrain…) et les LIGNES que chaque
                    scène laisse sonner. Il ne reste qu'à ranger un motif sous A — et un second
                    sous B si la forme en demande deux. On compte en TOURS du motif : ici {cycleMotif}
                    mesure{cycleMotif > 1 ? 's' : ''} par tour, calculé sur les lignes qui sonnent.
                    Tes boutons ne bougent pas : un montage n'y touche plus.
                  </p>
                  <button class="picker-row" class:current={!architecture.courante} onclick={quitterArchitecture}>
                    <span class="picker-label">AUCUN</span>
                    <span class="picker-desc">un seul motif qui tourne — le comportement d'avant</span>
                  </button>
                  {#each MONTAGES as m (m.nom)}
                    {@const mes = mesuresTotales(m.sections, cycleDe)}
                    {@const lettres = new Set(m.sections.map((x) => x.partie))}
                    <button
                      class="picker-row"
                      class:current={architecture.courante?.nom === m.nom}
                      onclick={() => chargerMontage(m.nom)}
                    >
                      <span class="picker-label">{m.nom}</span>
                      <span class="picker-desc"
                        >{m.desc} · {lettres.size} partie{lettres.size > 1 ? 's' : ''} · {mes} mesure{mes > 1
                          ? 's'
                          : ''} · {formaterDuree((mes * 240) / st.tempo)}</span
                      >
                    </button>
                  {/each}
                {:else if picker.kind === 'section'}
                  {@const idx = picker.index}
                  <p class="picker-caption">
                    La LETTRE que joue cette scène, et sa longueur en tours. Une lettre encore vide
                    joue A — une chaîne dit toujours ce qu'elle joue. Pour AJOUTER, retirer ou
                    déplacer des scènes, et choisir les lignes que chacune laisse sonner : Atelier,
                    onglet Production, panneau Montage.
                  </p>
                  <div class="picker-cycles">
                    <button class="amp-btn" onclick={() => architecture.poserCycles(idx, archSections[idx].cycles - 1)}>−</button>
                    <span
                      >×{archSections[idx]?.cycles ?? 1} · {mesuresDeSection(archSections[idx], cycleDe(archSections[idx].partie))} mesures</span
                    >
                    <button class="amp-btn" onclick={() => architecture.poserCycles(idx, archSections[idx].cycles + 1)}>+</button>
                  </div>
                  {#each PARTIES as id (id)}
                    <button
                      class="picker-row"
                      class:current={archSections[idx]?.partie === id}
                      onclick={() => architecture.poserPartie(idx, id)}
                    >
                      <span class="picker-label">{id}</span>
                      <span class="picker-desc"
                        >{parties.remplie(id) ? (parties.get(id)?.nom || 'rangée') : 'vide — jouera A'}</span
                      >
                    </button>
                  {/each}
                {:else if picker.kind === 'viz'}
                  {#each LIVE_VIZ as v (v.id)}
                    <button class="picker-row" class:current={v.id === assignments.viz} onclick={() => commitViz(v.id)}>
                      <span class="picker-label">{v.label}</span>
                    </button>
                  {/each}
                {/if}
              </div>
              <button class="amp-btn picker-close tap44" onclick={() => (picker = null)}>FERMÉ</button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .live-root {
    position: fixed;
    inset: 0;
    z-index: 100;
    /* ÉTAPE 5 — fusion des palettes. Le Mode Live avait ici sa PROPRE langue
       visuelle : l'appli en parlait trois (Atelier en Luna, Mode jeu en thème
       « noir », Live avec ces onze tokens). C'était le 4e reproche de l'audit
       de design, et c'est l'argument principal du choix de Winamp 2.x.

       Ces onze déclarations deviennent des ALIAS sur les tokens partagés. Le
       choix est délibéré : 82 sites d'appel utilisent `var(--amp-*)` dans ce
       fichier, et les renommer serait du churn à risque pour zéro gain visuel.
       La palette est fusionnée — c'est ce qui compte ; les noms locaux ne sont
       plus qu'une façade au-dessus du jeu commun. */
    --amp-bg-1: #4b4b57;
    --amp-bg-2: #2e2e38;
    --amp-bg-3: #1e1e26;
    --amp-line: var(--xp-line);
    --amp-hi: var(--xp-white);
    --amp-title-grad: var(--xp-title-grad);
    --amp-lcd-bg: var(--xp-lcd-bg);
    --amp-lcd-fg: var(--xp-lcd);
    --amp-lcd-dim: var(--xp-lcd-dim);
    /* L'ambre du Live (faders, verrous) est de l'ÉTAT, pas du chrome : il
       rejoint la tête de lecture plutôt que l'accent de module désaturé. */
    --amp-amber: var(--xp-playhead);
    --amp-text: var(--xp-text);
    font-family: ui-monospace, 'JetBrains Mono', monospace;

    /* ⚠️ L'appui LONG est le geste normal de ce mode (une rafale se tient),
       et le libellé d'un bouton est du texte ordinaire : sans ces trois
       lignes, Chrome Android sélectionne le mot et ouvre son menu
       « Sélectionner / Copier / Coller » par-dessus l'instrument.
       `touch-action` ne dit rien de tout ça — ce sont trois propriétés
       différentes, et seule la première était posée.

       Le trio existait déjà dans le dépôt (`DrumRowView.svelte`) ; il n'avait
       simplement jamais été appliqué ici. Posé sur la RACINE plutôt que
       bouton par bouton : il n'y a pas une seule zone de texte à sélectionner
       en Mode Live. ⚠️ Un futur champ de saisie (nommer une section, nommer
       un snapshot) devra reprendre `user-select: text` pour lui-même. */
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    /* Le rectangle gris qui clignote sous chaque appui sur Android — le
       retour tactile est déjà porté par le biseau (.pressed) et la vibration. */
    -webkit-tap-highlight-color: transparent;
  }

  .rotate-screen {
    width: 100%;
    height: 100%;
    background: linear-gradient(160deg, #1a1b1e, #0a0a0b);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    color: var(--amp-text);
  }
  .rotate-icon {
    font-size: 40px;
    animation: spin 1.8s ease-in-out infinite;
  }
  @keyframes spin {
    0%,
    100% {
      transform: rotate(0deg);
    }
    50% {
      transform: rotate(-90deg);
    }
  }
  .rotate-screen .msg {
    font-size: 13px;
    letter-spacing: 0.04em;
    color: #9aa0a6;
  }
  .exit-link {
    margin-top: 20px;
    font-family: inherit;
    font-size: 11px;
    background: none;
    border: none;
    color: #6a7bff;
    cursor: pointer;
  }

  .live {
    position: relative;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, var(--amp-bg-1), var(--amp-bg-2) 12%, var(--amp-bg-3));
    display: grid;
    /* Exactement les rangées TOUJOURS présentes (titlebar/topbar/seq-bar/
       main) — un enfant en plus ou en moins décale l'auto-placement des
       rangées suivantes et empêche la dernière (1fr) d'être occupée, donc
       de s'étirer. Le toast .tilt-warn, conditionnel, est sorti du flux de
       grille pour cette raison (position: absolute plus bas). */
    grid-template-rows: auto auto auto 1fr;
    gap: 4px;
    padding: 6px;
  }
  .titlebar {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--amp-title-grad);
    border: 1px solid var(--amp-line);
    border-radius: 3px 3px 0 0;
    padding: 2px 6px;
    height: 16px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
  .titlebar .grip {
    width: 16px;
    align-self: stretch;
    background-image: radial-gradient(rgba(255, 255, 255, 0.55) 1px, transparent 1.2px);
    background-size: 3px 3px;
  }
  .titlebar .app-name {
    flex: 1;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #e8e8ff;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
    text-align: center;
  }
  .titlebar .win-dots {
    display: flex;
    gap: 3px;
    background: none;
    border: none;
    padding: 4px 2px;
    cursor: pointer;
  }
  .titlebar .win-dots span {
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: rgba(255, 255, 255, 0.5);
    display: block;
  }
  .topbar {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    border-radius: 4px;
    padding: 4px 8px;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
  }
  .lcd-block {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .lcd-block .lcd {
    color: var(--amp-lcd-fg);
    font-size: 11px;
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 0 4px rgba(53, 224, 122, 0.5);
  }
  .lcd-block .lcd-sub {
    color: var(--amp-lcd-dim);
    font-size: 7px;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Stepper de tempo (PLAN.md §7, audit du bandeau du haut) : ±1 BPM par
     tap, défilement au maintien (tempoPointerDown/Up dans le script) —
     seul moyen de changer le tempo sans quitter le Mode Live. */
  .lcd-tempo {
    display: flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
    max-width: 100%;
    min-width: 0;
  }
  .lcd-tempo .lcd {
    min-width: 0;
  }
  /* Volume master toujours accessible (même audit) — mini-fader horizontal
     dans le bandeau, même mécanique que .fader-btn.horizontal mais hors
     catalogue d'assignation (volPointerDown/Move dans le script). */
  .tilt-warn {
    position: absolute;
    left: 6px;
    right: 6px;
    top: 44px;
    z-index: 5;
    margin: 0;
    font-size: 9px;
    color: #ffb0a0;
    background: rgba(10, 10, 11, 0.85);
    border: 1px solid var(--amp-line);
    border-radius: 3px;
    padding: 3px 6px;
  }
  .tilt-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: inherit;
    font-size: 8px;
    font-weight: 700;
    padding: 4px 7px;
    border-radius: 3px;
    background: linear-gradient(180deg, var(--amp-hi), var(--amp-bg-2) 55%, var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    color: var(--amp-text);
    cursor: pointer;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.35);
  }
  .tilt-btn .led {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4a4c52;
  }
  .tilt-btn.on .led {
    background: var(--amp-lcd-fg);
    box-shadow: 0 0 4px var(--amp-lcd-fg);
  }
  /* ---- LES PARTIES ----
     Quatre pastilles à gauche de la bande. 56 px chacune en 844 × 390 (mesuré),
     donc au-dessus du seuil tactile sur les deux axes sans que la chaîne y
     perde sa place. Le bandeau de banque qu'elles remplacent occupait la même
     rangée pour afficher « Aucune séquence ». */
  .parties {
    display: flex;
    gap: 3px;
    flex: none;
  }
  .partie {
    width: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    border-radius: 3px;
    border: 1px dashed #5a5a6b;
    background: transparent;
    color: var(--amp-lcd-dim);
    font-family: inherit;
    cursor: pointer;
    touch-action: none;
  }
  /* Une lettre RANGÉE est en relief ; une lettre vide reste un contour en
     pointillé — le biseau dit ce qui existe, comme partout ailleurs. */
  .partie.remplie {
    border-style: solid;
    border-color: var(--amp-line);
    background: linear-gradient(180deg, #3c3c48, var(--amp-bg-2) 55%, var(--amp-bg-3));
    color: var(--amp-text);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
  .partie.on {
    border-color: var(--amp-amber);
    color: #fff3cf;
  }
  .partie-lettre {
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
  }
  .partie-etat {
    font-size: 7px;
    letter-spacing: 0.04em;
    max-width: 52px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Sans chaîne, le montage se choisit ICI : c'est le geste par lequel on
     commence un morceau, il ne peut pas vivre derrière ⚙. */
  .montage-vide {
    flex: 1;
    min-width: 0;
    font-family: inherit;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0 8px;
    border-radius: 3px;
    border: 1px solid var(--amp-line);
    background: var(--amp-lcd-bg);
    color: var(--amp-lcd-fg);
    text-shadow: 0 0 4px rgba(51, 255, 68, 0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }
  /* Une case dont la lettre n'est pas encore rangée : elle jouera A, et elle le
     DIT — l'ancienne bande se contentait de ne rien faire entendre. */
  .strip .case.vide .case-n {
    color: var(--amp-amber);
  }
  /* ---- LE LOQUET D'ASSIGNATION ----
     Une surface sous loquet ne joue plus : elle le montre par le pointillé
     ambre, le même vocabulaire que la pastille de partie vide. */
  .abtn.assignable,
  .tilt-btn.assignable {
    border-style: dashed;
    border-color: var(--amp-amber);
    color: #fff3cf;
  }
  .assign-mark {
    font-size: 13px;
    line-height: 1;
  }
  .gear.on,
  .assigner.on {
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5), 0 0 0 2px var(--amp-amber);
    color: #fff3cf;
  }
  /* Le seul bouton du bandeau qui porte un MOT : « assigner » est le verbe de
     Yann, et un pictogramme de plus n'aurait rien annoncé. */
  .assigner {
    font-size: 8px;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  /* Le pad garde ses DEUX axes sous le loquet : une seule cible ne saurait pas
     dire lequel on réassigne. */
  .pad-assign {
    position: absolute;
    inset: 0;
    display: flex;
    gap: 3px;
    padding: 3px;
    box-sizing: border-box;
  }
  .pad-half {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: 3px;
    border: 1px dashed var(--amp-amber);
    background: rgba(20, 20, 26, 0.82);
    color: #fff3cf;
    font-family: inherit;
    cursor: pointer;
    touch-action: none;
  }
  .pad-half-axe {
    font-size: 14px;
    font-weight: 700;
  }
  .pad-half-val {
    font-size: 8px;
    letter-spacing: 0.03em;
    text-align: center;
    padding: 0 4px;
  }
  .amp-btn {
    font-family: inherit;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    text-align: center;
    background: linear-gradient(180deg, var(--amp-hi), var(--amp-bg-2) 55%, var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    color: var(--amp-text);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.4);
  }
  .amp-btn:active {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.6);
    transform: translateY(1px);
  }
  .amp-btn.stop {
    color: #ff8f7a;
  }
  .amp-btn.gear {
    width: 22px;
    padding: 4px 0;
    opacity: 0.45;
    cursor: not-allowed;
  }
  .amp-btn.rec {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .amp-btn.rec:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .amp-btn.rec .rec-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #7a2a20;
  }
  .amp-btn.rec.on {
    color: #ff8f7a;
  }
  .amp-btn.rec.on .rec-dot {
    background: #ff3b30;
    box-shadow: 0 0 5px #ff3b30;
    animation: rec-pulse 1s ease-in-out infinite;
  }
  @keyframes rec-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  /* ---- LA BANDE D'ARCHITECTURE ----
     Cases à largeur ÉGALE, jamais proportionnelles à leur durée : mesuré, une
     section d'un seul cycle tomberait à 22 px dans une bande proportionnelle,
     et une case qu'on ne peut pas viser n'a pas sa place sur scène. La durée
     se dit dans le ×N et dans le LCD. 18 cases tiennent à 46 px en pleine
     largeur ; au-delà la bande défilerait. */
  .strip {
    display: flex;
    align-items: stretch;
    gap: 3px;
    height: 44px;
    padding: 3px;
    box-sizing: border-box;
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    border-radius: 4px;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.6);
  }
  .strip .cases {
    flex: 1;
    display: flex;
    gap: 3px;
    min-width: 0;
    overflow-x: auto;
  }
  .strip .case {
    flex: 1 1 0;
    min-width: 42px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    border-radius: 3px;
    border: 1px solid var(--amp-line);
    cursor: pointer;
    font-family: inherit;
    color: var(--amp-text);
    background: linear-gradient(180deg, #3c3c48, var(--amp-bg-2) 55%, var(--amp-bg-3));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    touch-action: none;
  }
  .strip .case-nom {
    position: relative;
    z-index: 2;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .strip .case-n {
    position: relative;
    z-index: 2;
    font-size: 8px;
    color: #8e8ea3;
  }
  .strip .case.done {
    opacity: 0.55;
  }
  .strip .case.on {
    border-color: var(--amp-amber);
  }
  .strip .case.on .case-nom {
    color: #fff3cf;
  }
  /* Le remplissage EST l'avancement dans la section, et son filet ambre est la
     tête de lecture — la même mécanique que le séquenceur, un étage au-dessus. */
  .strip .fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1;
    background: linear-gradient(180deg, rgba(255, 213, 74, 0.42), rgba(255, 213, 74, 0.16));
    border-right: 2px solid var(--amp-amber);
  }
  .strip-tools {
    display: flex;
    gap: 3px;
    flex: none;
  }
  .strip-btn {
    display: flex;
    align-items: center;
    font-size: 8.5px;
    padding: 0 8px;
  }
  .strip-btn.next {
    color: #fff3cf;
  }
  .strip-btn.on {
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5), 0 0 0 2px var(--amp-amber);
  }
  /* Les sections listées sous la ligne ARCHITECTURE de l'overlay. */
  .assign-sous {
    margin-left: 12px;
  }
  .picker-cycles {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 6px 0;
    font-size: 10px;
    color: var(--amp-text);
  }

  .main {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
    /* Sans ligne explicite, une grille à une seule rangée implicite reste
       dimensionnée à son contenu ("auto") même si .main elle-même occupe
       toute la hauteur restante — visible en aspect large/carré (desktop,
       tablette), pas sur un téléphone en paysage assez allongé pour que ça
       ne se voie pas. Devenu joignable depuis la navigation normale (plus
       seulement via #mode-live sur un vrai téléphone), donc à corriger. */
    grid-template-rows: 1fr;
    gap: 6px;
    min-height: 0;
  }

  .buttons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: 1fr;
    gap: 5px;
  }
  /* Conteneur d'un bouton de la grille. Il portait les icônes de coin en
     absolu par-dessus le bouton ; elles sont parties (voir le commentaire au-
     dessus du template), mais il reste : c'est lui l'item de grille, et le
     bouton s'étire dedans. */
  .abtn-wrap {
    position: relative;
  }
  .abtn-wrap .abtn {
    width: 100%;
    height: 100%;
  }
  .abtn {
    position: relative;
    border-radius: 5px;
    cursor: pointer;
    background: linear-gradient(180deg, var(--amp-hi), var(--amp-bg-2) 50%, var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 2px 3px rgba(0, 0, 0, 0.35);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--amp-text);
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-align: center;
    padding: 2px 4px;
    touch-action: none;
  }
  .abtn.pressed {
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.6);
  }
  /* État "engagé" persistant (mute posé, break/fill en attente, roll
     maintenu) — distinct du simple retour tactile .pressed, qui ne dure que
     le temps du contact. */
  .abtn.active {
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5), 0 0 0 2px var(--amp-amber);
  }
  .abtn .dot-row {
    display: flex;
    gap: 2px;
  }
  .abtn .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .abtn .assign-label {
    color: #9aa0a6;
    font-weight: 400;
    font-size: 8px;
  }

  /* Bouton en mode FADER (PLAN.md §7) : même carcasse que .abtn (fond,
     bordure, coins arrondis), mais le remplissage fait office de curseur —
     glisser dessus pilote l'axe assigné comme le ferait le pad, voir
     faderPointerDown/Move dans le script. Orientation par bouton (retour de
     Yann, PLAN.md §7) : verticale par défaut (remplissage en hauteur,
     ancré en bas) ou horizontale (.horizontal, remplissage en largeur,
     ancré à gauche — sens de lecture, gauche = 0%). */
  /* La rangée de MODE en tête du sélecteur — trois cibles de 44 px, ÉCRITES,
     dans le vocabulaire du mode (mêmes couleurs que .picker-row). L'ambre dit
     l'état, comme partout ailleurs ici : c'est de l'ÉTAT, pas du chrome. */
  .picker-modes {
    display: flex;
    gap: 5px;
    padding: 0 0 7px;
    flex-wrap: wrap;
  }
  .picker-mode {
    flex: 1 1 auto;
    min-height: 44px;
    padding: 6px 8px;
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    color: var(--amp-text);
    background: var(--amp-bg-2);
    border: 1px solid var(--amp-line);
  }
  .picker-mode.on {
    color: var(--amp-amber);
    background: var(--amp-bg-1);
    border-color: var(--amp-hi);
  }
  .picker-mode:disabled {
    opacity: 0.4;
    cursor: default;
  }

  /* Un curseur MOMENTANÉ au repos ne montre pas de valeur : il est en attente,
     pas à zéro. Il s'allume sous le doigt. */
  .fader-btn.momentane:not(.tenu) .fader-val {
    color: var(--amp-amber);
  }
  .fader-btn.tenu {
    border-color: var(--amp-hi);
  }

  .fader-btn {
    overflow: hidden;
    justify-content: flex-end;
    cursor: ns-resize;
    touch-action: none;
  }
  .fader-btn.horizontal {
    justify-content: center;
    cursor: ew-resize;
  }
  .fader-fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(180deg, var(--amp-amber), #a56a12);
    opacity: 0.35;
    transition: height 0.03s linear;
  }
  .fader-btn.horizontal .fader-fill {
    right: auto;
    top: 0;
    background: linear-gradient(90deg, var(--amp-amber), #a56a12);
    transition: width 0.03s linear;
  }
  .fader-label,
  .fader-val {
    position: relative;
    z-index: 1;
  }
  .fader-val {
    color: var(--amp-amber);
    font-weight: 400;
    font-size: 8px;
  }

  .mid-col {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 0;
  }
  /* ---- Le séquenceur : des lignes qu'on coupe au doigt ----
     Hauteur NON figée : c'est le nombre de lignes qui sonnent qui la fait
     (une ligne = 26 px, plafonnée par la place disponible), et le
     visualiseur prend le reste. Six lignes laissent ~83 px au visualiseur,
     huit ~59 — ça tient dans les deux cas. */
  /* Les deux modes du bloc — 44 px pleins, c'est la seule rangée du séquenceur
     qui n'est pas une exception revendiquée. Elle sert aussi de titre : le
     bloc n'en avait pas, et « ce qui n'est pas écrit n'existe pas ». */
  .seq-modes {
    display: flex;
    gap: 4px;
    flex: none;
    margin-bottom: 4px;
  }
  .seq-mode {
    flex: 1 1 0;
    min-height: 30px;
    font-family: inherit;
    font-size: 8.5px;
    letter-spacing: 0.09em;
    border-radius: 4px;
    cursor: pointer;
    color: var(--amp-text);
    background: var(--amp-bg-2);
    border: 1px solid var(--amp-line);
  }
  .seq-mode.on {
    color: var(--amp-amber);
    background: var(--amp-bg-1);
    border-color: var(--amp-hi);
  }
  /* Mode VOLUMES : le nom coupe, la piste devient le curseur. Deux cibles
     distinctes — un interactif dans un interactif ne se tape pas de façon
     prévisible. */
  .seq .ligne .ligne-mute {
    display: flex;
    align-items: center;
    gap: 3px;
    flex: none;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
  }
  .seq .ligne .ligne-vol {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 100%;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.45);
    box-shadow: inset 0 0 0 1px var(--amp-line);
    cursor: ew-resize;
    touch-action: none;
    overflow: hidden;
  }
  .seq .ligne .ligne-vol-fill {
    position: absolute;
    inset: 0 auto 0 0;
    opacity: 0.55;
  }
  .seq .ligne .ligne-vol-val {
    position: absolute;
    inset: 0 4px 0 auto;
    display: flex;
    align-items: center;
    font-size: 8.5px;
    letter-spacing: 0.05em;
    color: var(--amp-text);
  }

  .seq {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 3px;
    flex: none;
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    border-radius: 5px;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.7);
    min-height: 0;
    overflow: hidden;
  }
  /* Une ligne EST un bouton. En relief = elle sonne ; le biseau dit l'état,
     comme partout ailleurs dans cette peau. 26 px de haut : sous les 44 px
     de la règle tactile, mais 290 px de large — et huit lignes à 44 px
     demanderaient 366 px là où l'écran n'en offre que 252. */
  .seq .ligne {
    display: flex;
    align-items: center;
    gap: 3px;
    height: var(--ligne-h, 26px);
    flex: none;
    padding: 2px 4px 2px 2px;
    border-radius: 3px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    background: linear-gradient(180deg, #33333e, #262630);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset -1px -1px 0 var(--amp-line);
    touch-action: none;
  }
  .seq .ligne .pastille {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .seq .ligne .nom {
    flex: none;
    width: 52px;
    text-align: left;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.07em;
    color: var(--amp-text);
    white-space: nowrap;
    overflow: hidden;
  }
  .seq .ligne .piste {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: block;
  }
  /* Coupée : la ligne est CREUSÉE et son nom barré en ambre. C'est le seul
     endroit où le Live dit « cette ligne ne sonne pas », et il doit le dire
     aussi pour une ligne coupée dans l'Atelier — l'ancien séquenceur ne
     lisait jamais `row.muted`. */
  .seq .ligne.muet {
    background: #16161c;
    box-shadow: inset 1px 1px 0 var(--amp-line), inset -1px -1px 0 rgba(255, 255, 255, 0.1);
  }
  .seq .ligne.muet .nom {
    color: var(--amp-amber);
    text-decoration: line-through;
    opacity: 0.8;
  }
  .seq .ligne.muet .pastille {
    background: #2a2a34 !important;
    box-shadow: inset 0 0 0 1px #12121a;
  }
  .seq .ligne:active {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.55);
  }

  .viz-wrap {
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    border-radius: 5px;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    flex: 1;
    min-height: 0;
  }
  .viz-wrap canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  .viz-label {
    position: absolute;
    top: 4px;
    left: 6px;
    font-size: 8px;
    color: var(--amp-lcd-dim);
    letter-spacing: 0.08em;
  }

  .pad-col {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .pad {
    flex: 1;
    position: relative;
    border-radius: 8px;
    background: linear-gradient(145deg, var(--amp-bg-2), var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.7), inset 0 -1px 0 rgba(255, 255, 255, 0.06);
    touch-action: none;
    cursor: pointer;
    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 20% 20%;
  }
  .pad-thumb {
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #6fe0a0, #1f8f52 70%);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5), 0 0 10px rgba(53, 224, 122, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }
  .eq-readout {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    border-radius: 4px;
    padding: 4px 6px;
  }
  .eq-band {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .eq-lbl {
    font-size: 6.5px;
    color: var(--amp-lcd-dim);
    letter-spacing: 0.04em;
    width: 40px;
    flex-shrink: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .eq-track {
    flex: 1;
    height: 5px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.06);
    overflow: hidden;
  }
  .eq-fill {
    height: 100%;
    background: linear-gradient(90deg, #7a4a08, var(--amp-amber));
    box-shadow: 0 0 4px rgba(255, 176, 32, 0.55);
  }
  .eq-val {
    font-size: 7px;
    color: var(--amp-amber);
    width: 22px;
    text-align: right;
    flex-shrink: 0;
  }

  /* ---- Overlay d'assignation (phase 3) ---- */
  .assign-overlay {
    position: absolute;
    inset: 0;
    background: rgba(10, 10, 11, 0.92);
    display: none;
    align-items: center;
    justify-content: center;
    padding: 10px;
    z-index: 10;
  }
  .assign-overlay.show {
    display: flex;
  }
  .assign-card {
    background: linear-gradient(180deg, var(--amp-bg-1), var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    border-radius: 8px;
    padding: 10px;
    width: 100%;
    max-width: 420px;
    max-height: 100%;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .assign-card h4 {
    margin: 0 0 8px;
    font-size: 10px;
    color: var(--amp-text);
    letter-spacing: 0.06em;
  }
  .assign-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
  }
  /* Un bouton (pas les 3 axes du pad/l'inclinaison, ni le visualiseur) porte
     en plus un petit interrupteur ACTIONS/FADER au-dessus de sa ligne
     d'assignation — bascule le catalogue que la ligne ouvre (voir
     toggleSlotMode, PLAN.md §7). */
  .assign-row-wrap {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .toggle-row {
    display: flex;
    gap: 4px;
  }
  .mode-toggle {
    align-self: flex-start;
    font-family: inherit;
    font-size: 7px;
    padding: 2px 6px;
    border-radius: 3px;
    cursor: pointer;
    color: var(--amp-lcd-dim);
    background: var(--amp-bg-1);
    border: 1px solid var(--amp-line);
    letter-spacing: 0.04em;
  }
  .mode-toggle:active {
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
  }
  /* Ouvre le panneau de sélection correspondant au mode (actions ou fader) —
     tap = ouvrir le panneau, pas un cycle sur place, catalogue trop large
     pour ça (PLAN.md §7). */
  .assign-row {
    font-family: inherit;
    font-size: 9px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--amp-text);
    background: var(--amp-bg-2);
    border: 1px solid var(--amp-line);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
  }
  .assign-row:active {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  .assign-row-label {
    font-size: 7px;
    color: #9aa0a6;
    letter-spacing: 0.04em;
  }
  .assign-row-val {
    font-size: 10.5px;
    font-weight: 700;
    color: var(--amp-text);
  }
  .assign-close {
    margin-top: 10px;
    width: 100%;
  }

  /* Snapshots d'assignation (PLAN.md §7) — 3 emplacements fixes, appui court
     sauvegarde / appui long rappelle (voir onSnapshotPointerDown/Up). */
  .assign-card h4.snapshots-title {
    margin: 10px 0 6px;
    font-size: 10px;
    color: var(--amp-text);
    letter-spacing: 0.06em;
  }
  .snapshots-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
  }
  .snapshot-slot {
    font-family: inherit;
    padding: 8px 4px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--amp-text);
    background: var(--amp-bg-2);
    border: 1px solid var(--amp-line);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    touch-action: none;
  }
  .snapshot-slot:active {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  .snapshot-slot.filled {
    border-color: var(--amp-amber);
  }
  .snapshot-letter {
    font-size: 12px;
    font-weight: 700;
  }
  .snapshot-state {
    font-size: 7px;
    color: #9aa0a6;
    letter-spacing: 0.06em;
  }
  .snapshot-slot.filled .snapshot-state {
    color: var(--amp-amber);
  }

  /* ---- Panneau de sélection (catalogue étendu, PLAN.md §7) — recouvre la
     carte d'assignation plutôt que de cycler sur place, trop de paramètres
     pour ça désormais (55 axes + 9 actions). ---- */
  .picker-card {
    position: absolute;
    inset: 10px;
    background: linear-gradient(180deg, var(--amp-bg-1), var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  }
  .picker-card h4 {
    margin: 0 0 8px;
    font-size: 10px;
    color: var(--amp-text);
    letter-spacing: 0.06em;
  }
  .picker-hint {
    font-weight: 400;
    color: var(--amp-lcd-dim);
    text-transform: none;
    letter-spacing: normal;
  }
  .picker-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .picker-group {
    margin-top: 6px;
    font-size: 7.5px;
    color: var(--amp-lcd-dim);
    letter-spacing: 0.08em;
  }
  .picker-group:first-child {
    margin-top: 0;
  }
  .picker-row {
    font-family: inherit;
    font-size: 9.5px;
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--amp-text);
    background: var(--amp-bg-2);
    border: 1px solid var(--amp-line);
    display: flex;
    align-items: center;
    gap: 6px;
    text-align: left;
  }
  .picker-row:active {
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  }
  .picker-row.current {
    box-shadow: 0 0 0 2px var(--amp-amber);
  }
  .picker-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .picker-label {
    font-weight: 700;
  }
  .picker-desc {
    font-size: 8px;
    color: #9aa0a6;
    font-weight: 400;
  }
  .picker-close {
    margin-top: 10px;
    width: 100%;
  }
  .picker-caption {
    font-size: 10.5px;
    color: #9aa0a6;
    line-height: 1.5;
    padding: 0 4px 6px;
    margin: 0;
  }
  /* Chantier tactile. En paysage la largeur est le luxe du Mode Live : on
     écarte horizontalement, ce qui débloque les cibles collées à leur voisine.

     La hauteur, on la prend aussi — c'était l'erreur de la passe précédente,
     qui avait conclu trop vite que « les pads SONT l'instrument, donc on ne
     leur enlève rien ». Mesuré : les deux barres coûtent 44px sur 390, les
     pads passent de 94 à 78px de haut. Un pad de 78px reste presque deux fois
     la cible minimale ; **PLAY à 34px, lui, ne l'atteignait pas**. Le bouton
     le plus important de l'écran ne peut pas être celui qu'on rate.

     Les six pads et le pad XY ne sont pas touchés : ils étaient déjà bien
     au-dessus de 44px, ce sont les barres qui montent. */
  @media (pointer: coarse) {
    .topbar {
      gap: 14px;
    }
    .amp-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 4px 10px;
    }
    .win-dots {
      min-height: 44px;
    }
    .tilt-btn {
      min-height: 44px;
    }
    /* Le curseur de volume est un `<div>` en `overflow: hidden` : il recadre
       le pseudo-élément de `.tap44`, comme les éléments remplacés. C'est donc
       sa propre boîte qui monte. */
    /* Les cases de la bande d'architecture. Mesurées à 36 px : personne ne les
       avait vues, parce que sans architecture chargée la bande n'existe pas —
       et jusqu'à la scène de l'acte 6, aucun écran n'en chargeait une. Deux
       lignes de texte dans 44 px tiennent (85 px de large), et la bande est la
       seule de sa rangée : les huit cases montent ensemble sans rien pousser. */
    .strip .case,
    .partie,
    .montage-vide {
      min-height: 44px;
    }
  }
</style>
