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
  import { onMount, onDestroy } from 'svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { sequenceBank } from '../../stores/bank.svelte';
  import { architecture } from '../../stores/architecture.svelte';
  import {
    cycleDuMotif,
    mesuresDeSection,
    dureeSecondes,
    formaterDuree,
    MODELES,
  } from '../../model/architecture';
  import { AudioEngine, type PadMode } from '../../engine/AudioEngine';
  import { barDuration, coupee } from '../../engine/groove';
  import { audioBufferToWavBlob, downloadBlob } from '../../engine/render-offline';
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
    loadLiveSnapshots,
    saveLiveSnapshots,
    vizById,
    ACTIONS_TIRABLES,
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
  let rollHeld = $state<Record<DrumRowName, number | null>>({ kick: null, snare: null, hat: null, clap: null, shaker: null });
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
  let limitersBypassed = $state(false);
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
      case 'ligne-kick':
        return rollHeld.kick !== null;
      case 'ligne-snare':
        return rollHeld.snare !== null;
      case 'ligne-hat':
        return rollHeld.hat !== null;
      case 'bypass-limiters':
        return limitersBypassed;
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

  function toggleLimitersBypass() {
    limitersBypassed = !limitersBypassed;
    engine.setLiveLimiters(!limitersBypassed);
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

      case 'bypass-limiters':
        if (on) toggleLimitersBypass();
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
        /* LIGNES — tap = un coup, maintenu = la rafale. Le coup part au
           pointerdown et non au relâché : attendre pour distinguer un tap d'un
           maintien ajouterait 200 ms à un DÉCLENCHEUR, exactement ce
           qu'AVANCE_DECLENCHEMENT passe sa vie à éviter. */
        if (def.kind === 'ligne' && def.ligne) {
          if (on) frapperLigne(def.ligne);
          else relacherLigne(def.ligne);
          break;
        }
        // Boutons PAS : chaque entrée porte directement son geste.
        if (on && def.kind === 'step') {
          def.step?.(engine);
          padMode = engine.padMode;
        }
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

  /* Frappe à la main : le coup sonne TOUT DE SUITE (engine.preview, le même
     appel que le clic sur une case de l'Atelier), puis, si le doigt reste
     posé, la rafale prend le relais et monte d'un cran par temps.
     ⚠️ Clap et shaker n'ont pas de rafale dans l'ordonnanceur : leur maintien
     ne fait rien de plus, et c'est dit dans le libellé du catalogue. */
  const DELAI_RAFALE = 0.2; // s avant que le maintien devienne une rafale
  const rafaleTimers: Partial<Record<DrumRowName, ReturnType<typeof setTimeout>[]>> = {};

  function poserRafale(name: DrumRowName, mult: number) {
    if (name === 'kick') engine.liveSetKickRoll(mult);
    else if (name === 'snare') engine.liveSetSnareRoll(mult);
    else if (name === 'hat') engine.liveSetHatRoll(mult);
    else return;
    rollHeld[name] = mult;
  }

  function frapperLigne(name: DrumRowName) {
    engine.preview(name, 1);
    if (name === 'clap' || name === 'shaker') return;
    const temps = 60 / Math.max(1, st.tempo); // une noire
    rafaleTimers[name] = [
      setTimeout(() => poserRafale(name, 2), DELAI_RAFALE * 1000),
      setTimeout(() => poserRafale(name, 3), (DELAI_RAFALE + temps) * 1000),
      setTimeout(() => poserRafale(name, 4), (DELAI_RAFALE + 2 * temps) * 1000),
    ];
  }

  function relacherLigne(name: DrumRowName) {
    (rafaleTimers[name] ?? []).forEach(clearTimeout);
    rafaleTimers[name] = [];
    if (name === 'clap' || name === 'shaker') return;
    if (name === 'kick') engine.liveSetKickRoll(null);
    else if (name === 'snare') engine.liveSetSnareRoll(null);
    else engine.liveSetHatRoll(null);
    rollHeld[name] = null;
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

  function onSlotDown(i: number) {
    if (assignments.slotModes[i] === 'fader') return; // le fader se pilote au glisser (faderPointerDown), pas au tap
    hapticTick();
    pressed = { ...pressed, [i]: true };
    assignments.slots[i].forEach((id) => runAction(id, true));
  }
  function onSlotUp(i: number) {
    if (assignments.slotModes[i] === 'fader') return;
    pressed = { ...pressed, [i]: false };
    assignments.slots[i].forEach((id) => runAction(id, false));
  }

  // Bouton en mode FADER (PLAN.md §7) : glisser sur le bouton lui-même
  // pilote un ou plusieurs axes du même catalogue que le pad/l'inclinaison
  // (applyAxisValue), position = valeur. Orientation par bouton (retour de
  // Yann : « un fader gauche-droite où haut-bas ») — vertical garde la
  // convention du pad (haut = 100%, frac inversée) ; horizontal suit le sens
  // de lecture (gauche = 0%, droite = 100%, frac direct). Un seul drag actif
  // à la fois (comme le pad, `dragging`), le multi-touch simultané sur deux
  // faders n'est pas géré.
  let faderDraggingIndex: number | null = null;
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
  function faderPointerUp() {
    faderDraggingIndex = null;
  }

  // Volume master toujours accessible dans le bandeau (PLAN.md §7, audit du
  // 13/08 : seul moyen d'y toucher en plein set jusqu'ici était de l'avoir
  // explicitement assigné à un fader/axe). Même mécanique que setFader
  // horizontal, mais écrit directement dans le catalogue d'axes
  // (`applyAxisValue(['volume'], …)`) plutôt qu'un nœud dédié — reste donc
  // synchronisé si 'volume' est AUSSI assigné à un bouton/axe ailleurs
  // (dernière source qui écrit fait foi, même convention que pad/fader/
  // inclinaison).
  let volDragging = false;
  function setVolumeFromClientX(clientX: number, rect: DOMRect) {
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    applyAxisValue(['volume'], frac);
  }
  function volPointerDown(e: PointerEvent, el: HTMLDivElement) {
    volDragging = true;
    el.setPointerCapture(e.pointerId);
    setVolumeFromClientX(e.clientX, el.getBoundingClientRect());
  }
  function volPointerMove(e: PointerEvent, el: HTMLDivElement) {
    if (volDragging) setVolumeFromClientX(e.clientX, el.getBoundingClientRect());
  }
  function volPointerUp() {
    volDragging = false;
  }

  // Tempo toujours accessible dans le bandeau (même audit) — un stepper
  // ±1 BPM plutôt qu'un glisser sur le LCD (piste initiale de PLAN.md) :
  // plus précis et sans risque de dérailler le tempo en plein set d'un
  // geste imprécis sur une zone minuscule. Appui maintenu = défilement
  // automatique (400 ms avant le premier cran, puis un cran toutes les
  // 120 ms), même charte que les vrais steppers de tempo des boîtes à
  // rythmes matérielles. Écrit directement dans pattern.state.tempo, comme
  // tapTempo() dans ToolBar.svelte (Atelier) — pas un axe du catalogue Live,
  // le tempo n'en a jamais fait partie.
  let tempoRepeatDelay: ReturnType<typeof setTimeout> | null = null;
  let tempoRepeatTimer: ReturnType<typeof setInterval> | null = null;
  function stepTempo(delta: number) {
    pattern.state.tempo = Math.max(40, Math.min(200, Math.round(pattern.state.tempo) + delta));
  }
  function tempoPointerDown(delta: number) {
    stepTempo(delta);
    tempoRepeatDelay = setTimeout(() => {
      tempoRepeatTimer = setInterval(() => stepTempo(delta), 120);
    }, 400);
  }
  function tempoPointerUp() {
    if (tempoRepeatDelay) clearTimeout(tempoRepeatDelay);
    if (tempoRepeatTimer) clearInterval(tempoRepeatTimer);
    tempoRepeatDelay = null;
    tempoRepeatTimer = null;
  }

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
  function randomizeSlot(i: number) {
    if (assignments.slotModes[i] === 'fader') assignments.slotFaders[i] = [pickAxis()];
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
    | { kind: 'bank' }
    | { kind: 'archi' }
    | { kind: 'archiSection'; index: number };
  let picker = $state<Picker | null>(null);
  // Index dans sequenceBank.entries de la dernière séquence chargée depuis
  // CE bandeau (cycleBankSequence) — -1 tant qu'on n'a pas encore basculé.
  let bankIndex = $state(-1);
  const bankCurrent = $derived(
    bankIndex >= 0 && bankIndex < sequenceBank.entries.length ? sequenceBank.entries[bankIndex] : null,
  );

  function toggleActionInSlot(id: LiveActionId) {
    if (picker?.kind !== 'slot') return;
    const current = assignments.slots[picker.index];
    if (current.includes(id)) {
      if (current.length > 1) assignments.slots[picker.index] = current.filter((x) => x !== id);
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
      if (current.length > 1) assignments.slotFaders[picker.index] = current.filter((x) => x !== id);
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

  // Bascule vers une séquence de la banque (PLAN.md §6, retour de Yann :
  // « pouvoir basculer de l'une à l'autre depuis le mode live ») — pas une
  // assignation persistée comme les autres kinds de picker (rien à retenir
  // dans LiveAssignments), un chargement immédiat comme un rappel de
  // snapshot : `pattern.replace` en direct, le pattern joué change tout de
  // suite (playhead/scheduler le relisent au prochain tick).
  function commitBankLoad(id: string) {
    sequenceBank.load(id);
    picker = null;
    bankIndex = sequenceBank.entries.findIndex((e) => e.id === id);
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
  const mesuresCourantes = $derived(sectionCourante ? mesuresDeSection(sectionCourante, cycleMotif) : 0);
  const dureeMorceau = $derived(
    archSections.length ? formaterDuree(dureeSecondes(archSections, cycleMotif, st.tempo)) : '',
  );

  /* Applique une section : charge son motif (SANS son tempo) et pose son
     calque de lignes. Appelée DANS la file du moteur, donc exactement au
     début de la mesure. */
  function appliquerSection(i: number) {
    const s = architecture.sections[i];
    sectionIndex = i;
    basculeEnAttente = false;
    if (!s) return;
    if (s.sequenceId) sequenceBank.loadGardantTempo(s.sequenceId);
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

  function chargerModele(nom: string) {
    architecture.chargerModele(nom);
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

  // Bascule directe depuis le bandeau du haut (retour de Yann, 2026-08-14 :
  // « pouvoir basculer de séquence directement... sans passer par le menu de
  // réglage ») — remplace la seekbar décorative (voir plus bas) par un vrai
  // contrôle : ‹/› avance/recule dans la banque et charge tout de suite,
  // zéro overlay à ouvrir. `bankIndex` ne suit que CE bandeau (pas un état
  // de la banque elle-même) — un chargement depuis l'overlay ⚙ ou
  // l'Atelier reste possible en parallèle, sans lien avec ce curseur.
  function cycleBankSequence(dir: number) {
    const entries = sequenceBank.entries;
    if (!entries.length) return;
    bankIndex = bankIndex < 0 ? 0 : (bankIndex + dir + entries.length) % entries.length;
    sequenceBank.load(entries[bankIndex].id);
  }

  function downloadCapture(buffer: AudioBuffer) {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadBlob(audioBufferToWavBlob(buffer), `rythme-live-${stamp}.wav`);
  }

  async function togglePlay() {
    if (playing) {
      // Un live take en cours n'a de sens que pendant la lecture — STOP le
      // termine et livre le WAV plutôt que de le jeter silencieusement.
      if (recording) {
        const buffer = engine.stopCapture();
        recording = false;
        if (buffer) downloadCapture(buffer);
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
    if (!playing) return;
    if (recording) {
      const buffer = engine.stopCapture();
      recording = false;
      if (buffer) downloadCapture(buffer);
    } else {
      await engine.startCapture();
      recording = true;
    }
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
    tempoPointerUp(); // au cas où on quitte le Mode Live avec le stepper de tempo maintenu
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
          disabled={!playing}
          onclick={toggleRecord}
          title={playing ? "Enregistrer le live take en WAV" : 'Lance PLAY pour pouvoir enregistrer'}
        >
          <span class="rec-dot"></span>{recording ? 'REC…' : 'REC'}
        </button>
        <div class="lcd-block">
          <div class="lcd-tempo">
            <button
              class="tempo-btn tap44"
              onpointerdown={() => tempoPointerDown(-1)}
              onpointerup={tempoPointerUp}
              onpointerleave={tempoPointerUp}
              title="Tempo −1 (maintenir pour défiler)"
            >−</button>
            <span class="lcd">{Math.round(st.tempo)} BPM · {playing ? 'LECTURE' : 'ARRÊT'}{recording ? ' · ENREGISTREMENT' : ''}{sectionCourante ? ` · ${sectionCourante.nom}` : ''}</span>
            <button
              class="tempo-btn tap44"
              onpointerdown={() => tempoPointerDown(1)}
              onpointerup={tempoPointerUp}
              onpointerleave={tempoPointerUp}
              title="Tempo +1 (maintenir pour défiler)"
            >+</button>
          </div>
          <!-- Le musicien pense en CYCLES, l'ingénieur lit des MESURES : les
               deux sont affichés, et personne ne se trompe sur ce que « ×8 »
               veut dire. -->
          <span class="lcd-sub">
            {#if sectionCourante}
              MESURE {Math.min(mesureDansSection, mesuresCourantes - 1) + 1}/{mesuresCourantes} · CYCLE DU MOTIF {cycleMotif} MES. · MORCEAU {dureeMorceau}
            {:else}
              TOUT RÉEL · ⚙ POUR RÉASSIGNER BOUTONS ET PAD
            {/if}
          </span>
        </div>
        <div
          class="vol-slider tap44"
          role="slider"
          aria-label="Volume"
          aria-valuenow={Math.round(axisValues['volume'] * 100)}
          tabindex="0"
          onpointerdown={(e) => volPointerDown(e, e.currentTarget as HTMLDivElement)}
          onpointermove={(e) => volPointerMove(e, e.currentTarget as HTMLDivElement)}
          onpointerup={volPointerUp}
          onpointerleave={volPointerUp}
          title="Volume master"
        >
          <div class="vol-fill" style:width="{axisValues['volume'] * 100}%"></div>
          <span class="vol-val">{Math.round(axisValues['volume'] * 100)}%</span>
        </div>
        <button class="tilt-btn tap44" class:on={tiltEnabled} onclick={toggleTilt} title="Inclinaison (optionnelle)">
          <span class="led"></span>{tiltEnabled ? `${Math.round(tiltGamma)}°` : 'TILT'}
        </button>
        <button class="amp-btn gear tap44" onclick={() => (assignOpen = true)} title="Assignation">⚙</button>
      </div>
      <!-- LA BANDE D'ARCHITECTURE. Elle remplace le bandeau de banque, qui
           prenait 44 px sur 390 (11 % de la hauteur) pour afficher « Aucune
           séquence » tant que la banque était vide. Sans architecture chargée
           elle redevient ce bandeau : mono-cycle par défaut, rien ne change. -->
      {#if archSections.length}
        <div class="strip">
          <div class="cases">
            {#each archSections as sec, i (sec.id)}
              <button
                class="case"
                class:on={i === sectionIndex}
                class:done={i < sectionIndex}
                onclick={() => engine.queueSwapAtNextBar(() => appliquerSection(i))}
                title="{sec.nom} — {mesuresDeSection(sec, cycleMotif)} mesures"
              >
                {#if i === sectionIndex}
                  <span class="fill" style:width="{avancement * 100}%"></span>
                {/if}
                <span class="case-nom">{sec.nom}</span>
                <span class="case-n">×{sec.cycles}</span>
              </button>
            {/each}
          </div>
          <div class="strip-tools">
            <button class="amp-btn strip-btn next tap44" onclick={sauterSection}>SUIVANT ▸</button>
            <button
              class="amp-btn strip-btn tap44"
              class:on={tenirSection}
              onpointerdown={() => (tenirSection = true)}
              onpointerup={() => (tenirSection = false)}
              onpointerleave={() => (tenirSection = false)}
            >TENIR</button>
          </div>
        </div>
      {:else}
        <!-- Bascule directe dans la banque, sans passer par ⚙ (retour de Yann,
             2026-08-14 : « un curseur vert que je ne comprends pas »). -->
        <div class="seq-bar">
          <button
            class="seq-nav tap44"
            onclick={() => cycleBankSequence(-1)}
            disabled={sequenceBank.entries.length < 2}
            title="Séquence précédente"
          >‹</button>
          <button
            class="seq-current tap44"
            onclick={() => cycleBankSequence(1)}
            disabled={sequenceBank.entries.length === 0}
            title={sequenceBank.entries.length ? 'Séquence suivante' : 'Aucune séquence enregistrée — dans l’Atelier, ➕ pour en sauvegarder une'}
          >
            🗄 {bankCurrent?.name ?? (sequenceBank.entries.length ? 'Choisir une séquence…' : 'Aucune séquence')}
          </button>
          <button
            class="seq-nav tap44"
            onclick={() => cycleBankSequence(1)}
            disabled={sequenceBank.entries.length < 2}
            title="Séquence suivante"
          >›</button>
        </div>
      {/if}
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
              {#if mode === 'fader'}
                {@const faderIds = assignments.slotFaders[i]}
                {@const val = axisValues[faderIds[0]] ?? 0.5}
                {@const horizontal = assignments.faderOrientation[i] === 'horizontal'}
                <div
                  class="abtn fader-btn"
                  class:horizontal
                  role="slider"
                  aria-label={axesFor(faderIds)
                    .map((a) => a.label)
                    .join(' + ')}
                  aria-valuenow={Math.round(val * 100)}
                  tabindex="0"
                  onpointerdown={(e) => faderPointerDown(i, e, e.currentTarget as HTMLDivElement)}
                  onpointermove={(e) => faderPointerMove(i, e, e.currentTarget as HTMLDivElement)}
                  onpointerup={faderPointerUp}
                  onpointerleave={faderPointerUp}
                >
                  {#if horizontal}
                    <div class="fader-fill" style:width="{val * 100}%"></div>
                  {:else}
                    <div class="fader-fill" style:height="{val * 100}%"></div>
                  {/if}
                  <span class="fader-label">{axesFor(faderIds).map((a) => a.label).join(' + ')}</span>
                  <span class="fader-val">{Math.round(val * 100)}%</span>
                </div>
              {:else}
                {@const defs = actionsFor(actionIds)}
                <button
                  class="abtn"
                  class:pressed={pressed[i]}
                  class:active={actionIds.some((id) => isActionActive(id))}
                  onpointerdown={() => onSlotDown(i)}
                  onpointerup={() => onSlotUp(i)}
                  onpointerleave={() => onSlotUp(i)}
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
          <div class="seq" style:--ligne-h="{lignesVisibles.length > 6 ? 22 : 26}px">
            {#each lignesVisibles as name (name)}
              {@const muet = ligneCoupee(name)}
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
              <button class="assign-row" onclick={() => (picker = { kind: 'archi' })}>
                <span class="assign-row-label">ARCHITECTURE</span>
                <span class="assign-row-val"
                  >{architecture.courante
                    ? `${architecture.courante.nom} · ${archSections.length} section${archSections.length > 1 ? 's' : ''}`
                    : 'Mono-cycle'}</span
                >
              </button>
              {#each archSections as sec, i (sec.id)}
                <button class="assign-row assign-sous" onclick={() => (picker = { kind: 'archiSection', index: i })}>
                  <span class="assign-row-label">↳ {sec.nom} ×{sec.cycles}</span>
                  <span class="assign-row-val"
                    >{sec.sequenceId
                      ? (sequenceBank.entries.find((e) => e.id === sec.sequenceId)?.name ?? 'séquence absente')
                      : 'motif courant'}</span
                  >
                </button>
              {/each}
              <button class="assign-row" onclick={() => (picker = { kind: 'bank' })}>
                <span class="assign-row-label">BANQUE DE SÉQUENCES</span>
                <span class="assign-row-val">{sequenceBank.entries.length} enregistrée{sequenceBank.entries.length === 1 ? '' : 's'}</span>
              </button>
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

          {#if picker}
            {@const currentActionIds = picker.kind === 'slot' ? assignments.slots[picker.index] : []}
            {@const currentAxisIds = picker.kind === 'axis' ? assignments[picker.which] : picker.kind === 'slotFader' ? assignments.slotFaders[picker.index] : []}
            <div class="picker-card">
              <h4>
                {picker.kind === 'slot'
                  ? `BOUTON ${picker.index + 1}`
                  : picker.kind === 'slotFader'
                    ? `BOUTON ${picker.index + 1} — FADER`
                    : picker.kind === 'viz'
                      ? 'VISUALISEUR'
                      : picker.kind === 'bank'
                        ? 'BANQUE DE SÉQUENCES'
                        : picker.kind === 'archi'
                          ? 'ARCHITECTURE'
                          : picker.kind === 'archiSection'
                            ? `SECTION — ${archSections[picker.index]?.nom ?? ''}`
                            : 'PARAMÈTRE'}
                {#if picker.kind === 'slot' || picker.kind === 'slotFader' || picker.kind === 'axis'}<span
                  class="picker-hint">— plusieurs possibles</span
                >{/if}
              </h4>
              {#if picker.kind === 'bank'}
                <p class="picker-caption">
                  Les séquences enregistrées dans l'Atelier (bouton ➕ à côté des presets) — un tap
                  charge tout de suite le pattern joué, sans perdre les assignations du Live.
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
                {:else if picker.kind === 'archi'}
                  <p class="picker-caption">
                    Un modèle pose les sections et leurs longueurs ; il ne reste qu'à déposer une séquence
                    de banque dans chacune. On compte en TOURS du motif — ici {cycleMotif} mesure{cycleMotif > 1 ? 's' : ''}
                    par tour, calculé sur les lignes qui sonnent.
                  </p>
                  <button class="picker-row" class:current={!architecture.courante} onclick={quitterArchitecture}>
                    <span class="picker-label">MONO-CYCLE</span>
                    <span class="picker-desc">un seul motif qui tourne — le comportement d'avant</span>
                  </button>
                  {#each MODELES as m (m.nom)}
                    {@const mes = m.sections.reduce((t, x) => t + mesuresDeSection(x, cycleMotif), 0)}
                    <button
                      class="picker-row"
                      class:current={architecture.courante?.nom === m.nom}
                      onclick={() => chargerModele(m.nom)}
                    >
                      <span class="picker-label">{m.nom}</span>
                      <span class="picker-desc"
                        >{m.sections.length} section{m.sections.length > 1 ? 's' : ''} · {mes} mesure{mes > 1
                          ? 's'
                          : ''} · {formaterDuree((mes * 240) / st.tempo)}</span
                      >
                    </button>
                  {/each}
                {:else if picker.kind === 'archiSection'}
                  {@const idx = picker.index}
                  <p class="picker-caption">
                    Le motif joué par cette section, et sa longueur en tours. « Garder le motif courant »
                    est ce qui permet à un arc d'intensité de tenir sur une seule séquence.
                  </p>
                  <div class="picker-cycles">
                    <button class="amp-btn" onclick={() => architecture.poserCycles(idx, archSections[idx].cycles - 1)}>−</button>
                    <span
                      >×{archSections[idx]?.cycles ?? 1} · {mesuresDeSection(archSections[idx], cycleMotif)} mesures</span
                    >
                    <button class="amp-btn" onclick={() => architecture.poserCycles(idx, archSections[idx].cycles + 1)}>+</button>
                  </div>
                  <button
                    class="picker-row"
                    class:current={!archSections[idx]?.sequenceId}
                    onclick={() => architecture.poserSequence(idx, null)}
                  >
                    <span class="picker-label">GARDER LE MOTIF COURANT</span>
                  </button>
                  {#each sequenceBank.entries as e (e.id)}
                    <button
                      class="picker-row"
                      class:current={archSections[idx]?.sequenceId === e.id}
                      onclick={() => architecture.poserSequence(idx, e.id)}
                    >
                      <span class="picker-label">{e.name}</span>
                    </button>
                  {/each}
                {:else if picker.kind === 'viz'}
                  {#each LIVE_VIZ as v (v.id)}
                    <button class="picker-row" class:current={v.id === assignments.viz} onclick={() => commitViz(v.id)}>
                      <span class="picker-label">{v.label}</span>
                    </button>
                  {/each}
                {:else if sequenceBank.entries.length === 0}
                  <p class="picker-empty">
                    Aucune séquence enregistrée — dans l'Atelier, bandeau des presets, ➕ pour en sauvegarder une.
                  </p>
                {:else}
                  {#each sequenceBank.entries as e (e.id)}
                    <button class="picker-row" onclick={() => commitBankLoad(e.id)}>
                      <span class="picker-label">{e.name}</span>
                    </button>
                  {/each}
                {/if}
              </div>
              <button class="amp-btn picker-close tap44" onclick={() => (picker = null)}>FERMÉ</button>
            </div>
          {/if}
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
  .tempo-btn {
    flex: none;
    width: 15px;
    height: 15px;
    padding: 0;
    border-radius: 3px;
    border: 1px solid var(--amp-line);
    background: var(--amp-bg-1);
    color: var(--amp-lcd-fg);
    font-size: 11px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: none;
  }
  .tempo-btn:active {
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
  }
  /* Volume master toujours accessible (même audit) — mini-fader horizontal
     dans le bandeau, même mécanique que .fader-btn.horizontal mais hors
     catalogue d'assignation (volPointerDown/Move dans le script). */
  .vol-slider {
    position: relative;
    flex: none;
    width: 54px;
    height: 22px;
    border-radius: 4px;
    border: 1px solid var(--amp-line);
    background: rgba(255, 255, 255, 0.06);
    overflow: hidden;
    cursor: ew-resize;
    touch-action: none;
  }
  .vol-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, #7a4a08, var(--amp-amber));
    box-shadow: 0 0 4px rgba(255, 176, 32, 0.55);
  }
  .vol-val {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 8px;
    font-weight: 700;
    color: var(--amp-text);
  }
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
  .seq-bar {
    display: flex;
    align-items: stretch;
    gap: 4px;
    height: 22px;
  }
  .seq-nav {
    flex: none;
    width: 26px;
    font-size: 13px;
    font-weight: 700;
    border-radius: 3px;
    border: 1px solid var(--amp-line);
    background: linear-gradient(180deg, var(--amp-hi), var(--amp-bg-2) 55%, var(--amp-bg-3));
    color: var(--amp-text);
    cursor: pointer;
  }
  .seq-nav:disabled {
    color: var(--amp-lcd-dim);
    cursor: default;
    opacity: 0.5;
  }
  .seq-current {
    flex: 1;
    min-width: 0;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
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
  .seq-current:disabled {
    color: var(--amp-lcd-dim);
    text-shadow: none;
    cursor: default;
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
  .picker-empty {
    font-size: 10.5px;
    color: #9aa0a6;
    line-height: 1.5;
    padding: 10px 4px;
    margin: 0;
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
    .seq-bar {
      gap: 12px;
      height: 44px;
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
    /* 26px de large : les deux flèches de séquence encadrent un libellé qui
       prend tout le reste, elles peuvent s'élargir sans rien coûter. */
    .seq-nav {
      width: 44px;
    }
    /* Le curseur de volume est un `<div>` en `overflow: hidden` : il recadre
       le pseudo-élément de `.tap44`, comme les éléments remplacés. C'est donc
       sa propre boîte qui monte. */
    .vol-slider {
      height: 44px;
    }
    /* Les cases de la bande d'architecture. Mesurées à 36 px : personne ne les
       avait vues, parce que sans architecture chargée la bande n'existe pas —
       et jusqu'à la scène de l'acte 6, aucun écran n'en chargeait une. Deux
       lignes de texte dans 44 px tiennent (85 px de large), et la bande est la
       seule de sa rangée : les huit cases montent ensemble sans rien pousser. */
    .strip .case {
      min-height: 44px;
    }
  }
</style>
