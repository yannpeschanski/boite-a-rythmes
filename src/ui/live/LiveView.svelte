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
  import { AudioEngine } from '../../engine/AudioEngine';
  import { barDuration } from '../../engine/groove';
  import { audioBufferToWavBlob, downloadBlob } from '../../engine/render-offline';
  import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';
  import type { DrumRowName, SynthRowName } from '../../model/types';
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
  let rollHeld = $state<Record<DrumRowName, number | null>>({ kick: null, snare: null, hat: null });
  let muted = $state<Record<DrumRowName | SynthRowName, boolean>>({
    kick: false,
    snare: false,
    hat: false,
    bass: false,
    pad: false,
    melody: false,
  });
  // Bypass limiteurs (catalogue étendu, PLAN.md §7) : false = normal, comme
  // les mutes qui démarrent tous éteints plutôt que de refléter le réglage
  // réel du pattern.
  let limitersBypassed = $state(false);
  // ARPÈGE NAPPE (interrupteur, PLAN.md §7) : false = normal, même
  // convention que les mutes/bypass ci-dessus (démarre éteint).
  let arpOn = $state(false);
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

  let playhead = $state<Record<DrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
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
      case 'mute-kick':
        return muted.kick;
      case 'mute-snare':
        return muted.snare;
      case 'mute-hat':
        return muted.hat;
      case 'mute-bass':
        return muted.bass;
      case 'mute-pad':
        return muted.pad;
      case 'mute-melody':
        return muted.melody;
      case 'roll-kick-x2':
        return rollHeld.kick === 2;
      case 'roll-kick-x3':
        return rollHeld.kick === 3;
      case 'roll-kick-x4':
        return rollHeld.kick === 4;
      case 'roll-snare-x2':
        return rollHeld.snare === 2;
      case 'roll-snare-x3':
        return rollHeld.snare === 3;
      case 'roll-snare-x4':
        return rollHeld.snare === 4;
      case 'roll-hat-x2':
        return rollHeld.hat === 2;
      case 'roll-hat-x3':
        return rollHeld.hat === 3;
      case 'roll-hat-x4':
        return rollHeld.hat === 4;
      case 'bypass-limiters':
        return limitersBypassed;
      case 'solo-melody':
        return soloMelodyHeld;
      case 'toggle-pad-arp':
        return arpOn;
      default:
        return false;
    }
  }

  function toggleMute(name: DrumRowName) {
    muted[name] = !muted[name];
    engine.liveSetMute(name, muted[name]);
  }

  function toggleSynthMute(name: SynthRowName) {
    muted[name] = !muted[name];
    engine.liveSetSynthMute(name, muted[name]);
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
      case 'mute-kick':
        if (on) toggleMute('kick');
        break;
      case 'mute-snare':
        if (on) toggleMute('snare');
        break;
      case 'mute-hat':
        if (on) toggleMute('hat');
        break;
      case 'mute-bass':
        if (on) toggleSynthMute('bass');
        break;
      case 'mute-pad':
        if (on) toggleSynthMute('pad');
        break;
      case 'mute-melody':
        if (on) toggleSynthMute('melody');
        break;
      case 'roll-kick-x2':
        engine.liveSetKickRoll(on ? 2 : null);
        rollHeld.kick = on ? 2 : null;
        break;
      case 'roll-kick-x3':
        engine.liveSetKickRoll(on ? 3 : null);
        rollHeld.kick = on ? 3 : null;
        break;
      case 'roll-kick-x4':
        engine.liveSetKickRoll(on ? 4 : null);
        rollHeld.kick = on ? 4 : null;
        break;
      case 'roll-snare-x2':
        engine.liveSetSnareRoll(on ? 2 : null);
        rollHeld.snare = on ? 2 : null;
        break;
      case 'roll-snare-x3':
        engine.liveSetSnareRoll(on ? 3 : null);
        rollHeld.snare = on ? 3 : null;
        break;
      case 'roll-snare-x4':
        engine.liveSetSnareRoll(on ? 4 : null);
        rollHeld.snare = on ? 4 : null;
        break;
      case 'roll-hat-x2':
        engine.liveSetHatRoll(on ? 2 : null);
        rollHeld.hat = on ? 2 : null;
        break;
      case 'roll-hat-x3':
        engine.liveSetHatRoll(on ? 3 : null);
        rollHeld.hat = on ? 3 : null;
        break;
      case 'roll-hat-x4':
        engine.liveSetHatRoll(on ? 4 : null);
        rollHeld.hat = on ? 4 : null;
        break;
      case 'bypass-limiters':
        if (on) toggleLimitersBypass();
        break;
      case 'solo-melody':
        soloMelodyHeld = on;
        engine.liveSetSynthMute('melody', on);
        if (on) lastMelodyFreq = null;
        break;
      case 'chaos':
        if (on) triggerChaos();
        break;
      case 'toggle-pad-arp':
        if (on) {
          arpOn = !arpOn;
          engine.setLiveSynthGlobalBool('padArpEnabled', arpOn);
        }
        break;
      default:
        // Boutons PAS (PLAN.md §7) : chaque entrée porte directement son
        // geste (def.step, comme apply() côté axes) plutôt qu'un cas par
        // paramètre discret ici — un coup au pointerdown, rien au relâché.
        if (on) {
          const def = actionById(actionId);
          if (def.kind === 'step') def.step?.(engine);
        }
    }
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
  const pickAction = () => LIVE_ACTIONS[Math.floor(Math.random() * LIVE_ACTIONS.length)].id;
  const pickAxis = () => LIVE_AXES[Math.floor(Math.random() * LIVE_AXES.length)].id;

  // Bouton 🔀 (séparé, PLAN.md §7 — piste "brasser") : réassigne aléatoirement
  // tout le catalogue d'un coup plutôt que de choisir soi-même via l'overlay
  // ⚙ — un "surprends-moi" complémentaire du chaos ci-dessus, qui lui ne
  // change QUE la valeur d'un paramètre sans toucher aux associations. Un
  // seul élément par slot/axe (pas de combo aléatoire) : le multi-paramètre
  // est un choix délibéré via le panneau de sélection, pas une surprise.
  function shuffleAssignments() {
    assignments = {
      ...assignments,
      // Un bouton en mode fader n'a pas d'actions à tirer au hasard (et
      // vice-versa) — seul le tableau correspondant à son mode ACTUEL est
      // rebrassé, l'autre reste tel quel (repris tel quel si on rebascule le
      // mode plus tard, plutôt que perdu). Un bouton verrouillé (retour de
      // Yann, PLAN.md §7 : « verrouiller un bouton qu'on veut garder avant
      // le brassage ») garde ses DEUX tableaux tels quels, quel que soit son
      // mode courant — seul 🔀 le respecte, le reste de l'UI l'ignore.
      slots: assignments.slotModes.map((mode, i) =>
        assignments.slotLocked[i] || mode === 'fader' ? assignments.slots[i] : [pickAction()],
      ),
      slotFaders: assignments.slotModes.map((mode, i) =>
        assignments.slotLocked[i] || mode !== 'fader' ? assignments.slotFaders[i] : [pickAxis()],
      ),
      axisX: [pickAxis()],
      axisY: [pickAxis()],
      axisTilt: [pickAxis()],
    };
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

  function toggleSlotMode(i: number) {
    assignments.slotModes[i] = assignments.slotModes[i] === 'fader' ? 'actions' : 'fader';
    saveLiveAssignments(assignments);
  }

  function toggleFaderOrientation(i: number) {
    assignments.faderOrientation[i] = assignments.faderOrientation[i] === 'horizontal' ? 'vertical' : 'horizontal';
    saveLiveAssignments(assignments);
  }

  function toggleSlotLock(i: number) {
    assignments.slotLocked[i] = !assignments.slotLocked[i];
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
    | { kind: 'viz' };
  let picker = $state<Picker | null>(null);

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
      playhead = { kick: -1, snare: -1, hat: -1 };
      synthPlayhead = { bass: -1, pad: -1, melody: -1 };
    } else {
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
  // TransportRings.DRUM_COLOR/SYNTH_COLOR) — un canvas ne peut pas lire une
  // variable CSS, donc dupliquées ici comme ailleurs dans le code.
  const DRUM_COLOR = { kick: '#d84315', snare: '#c8881a', hat: '#2b8a8a' } as const;
  const SYNTH_COLOR = { bass: '#6a7bff', pad: '#b06bff', melody: '#ff6bd6' } as const;
  const LINE_COLOR = { ...DRUM_COLOR, ...SYNTH_COLOR } as Record<DrumRowName | SynthRowName, string>;
  const LINE_NAMES = [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES] as (DrumRowName | SynthRowName)[];

  // Position 0..1 (grave → aigu) de chaque ligne dans le spectre décoratif de
  // viz① — pas une vraie analyse fréquentielle (les AnalyserNode du graphe
  // sont volontairement en fftSize minimal, voir graph.ts), un classement
  // approximatif du registre de chaque élément pour donner un vrai look de
  // spectre plutôt que 6 barres pleine hauteur redondantes avec le
  // séquenceur linéaire juste au-dessus.
  const LINE_EQ_POS: Record<DrumRowName | SynthRowName, number> = {
    kick: 0.03,
    bass: 0.22,
    snare: 0.42,
    pad: 0.58,
    hat: 0.78,
    melody: 0.95,
  };
  const EQ_BAR_COUNT = 22;
  const EQ_SIGMA = 0.26; // étalement de la cloche : plusieurs barres voisines réagissent à un même élément

  let linCanvas: HTMLCanvasElement = $state()!;
  let vizCanvas: HTMLCanvasElement = $state()!;
  let raf = 0;
  const levelSmooth: Partial<Record<DrumRowName | SynthRowName, number>> = {};

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

  // Une bande par ligne (comme les anneaux de TransportRings, mais linéaires) :
  // chacune à l'échelle de son propre nombre de pas, pas d'une grille commune
  // — kick à 16 pas et basse à 8 ne s'alignent pas forcément, et c'est normal.
  function drawLinSeq(ctx: CanvasRenderingContext2D) {
    const r = linCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const top = 11; // sous le libellé "SÉQUENCEUR"
    const gridH = h - top;
    const rows = [
      ...DRUM_ROW_NAMES.map((name) => {
        const row = st.rows[name];
        return {
          color: DRUM_COLOR[name],
          active: row.pattern.slice(0, row.subdiv).map((v) => v > 0),
          current: playhead[name],
        };
      }),
      ...SYNTH_ROW_NAMES.map((name) => {
        const row = st.synthRows[name];
        const active = row.pattern
          .slice(0, row.subdivisions)
          .map((v) => (name === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
        return { color: SYNTH_COLOR[name], active, current: synthPlayhead[name] };
      }),
    ];
    const rowH = gridH / rows.length;
    rows.forEach((row, ri) => {
      const n = row.active.length;
      if (n === 0) return;
      const colW = w / n;
      const y = top + ri * rowH;
      for (let i = 0; i < n; i++) {
        const isCurrent = i === row.current;
        const x = i * colW;
        ctx.fillStyle = isCurrent ? '#eafff0' : row.active[i] ? row.color : 'rgba(255,255,255,.06)';
        roundRectPath(ctx, x + 1, y + 1, colW - 2, rowH - 2, 1.5);
        ctx.fill();
      }
    });
  }

  // Égaliseur — PLAN.md §7 (« à refaire ») : la première version faisait une
  // barre pleine hauteur par ligne, ce qui doublonnait le séquenceur linéaire
  // juste au-dessus. Ici : EQ_BAR_COUNT barres façon spectre, CHACUNE
  // composée de petits segments empilés représentant la contribution des 6
  // éléments à cet instant — pas une barre = une ligne. Chaque ligne pèse
  // sur toutes les barres via une cloche centrée sur sa position dans
  // LINE_EQ_POS (grave → aigu) : les barres proches de sa position montrent
  // un gros segment, les lointaines un segment minuscule voire nul — ça
  // donne un vrai relief de spectre à partir des 6 niveaux réels (pas de
  // fausse donnée), avec le même relâchement exponentiel qu'avant pour le
  // rebond.
  function drawVizBars(ctx: CanvasRenderingContext2D) {
    const r = vizCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const levels = engine.getLineLevels();
    const boosted: Partial<Record<DrumRowName | SynthRowName, number>> = {};
    LINE_NAMES.forEach((name) => {
      const raw = levels[name] ?? 0;
      const prev = levelSmooth[name] ?? 0;
      const smoothed = Math.max(raw, prev * 0.88);
      levelSmooth[name] = smoothed;
      // Boost d'affichage : les crêtes réelles mesurées avant le bus/limiteur
      // final tournent souvent bien en dessous de 1.0 (~0.05-0.3) — sans ce
      // facteur, les barres resteraient quasi invisibles pour un pattern normal.
      boosted[name] = Math.min(1, smoothed * 3.5);
    });
    const barW = w / EQ_BAR_COUNT;
    const bw = Math.max(1, barW - 2);
    const segGap = 1;
    for (let i = 0; i < EQ_BAR_COUNT; i++) {
      const barPos = i / (EQ_BAR_COUNT - 1);
      const x = i * barW + 1;
      let y = h;
      const top = h * 0.05;
      for (const name of LINE_NAMES) {
        const d = barPos - LINE_EQ_POS[name];
        const weight = Math.exp(-(d * d) / (2 * EQ_SIGMA * EQ_SIGMA));
        const raw = (boosted[name] ?? 0) * weight * h * 0.95;
        const segH = Math.max(0, Math.min(raw - segGap, y - top));
        if (segH < 1) continue;
        ctx.fillStyle = LINE_COLOR[name];
        roundRectPath(ctx, x, y - segH, bw, segH, 1.5);
        ctx.fill();
        y -= segH + segGap;
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
    if (linCanvas) {
      const linCtx = linCanvas.getContext('2d');
      if (linCtx) {
        ensureSize(linCanvas, linCtx);
        drawLinSeq(linCtx);
      }
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
        <button class="win-dots" onclick={onExit} title="Quitter le Mode Live" aria-label="Quitter">
          <span></span><span></span><span></span>
        </button>
      </div>
      <div class="topbar">
        <button class="amp-btn stop" onclick={togglePlay}>{playing ? '■ STOP' : '▶ PLAY'}</button>
        <button
          class="amp-btn rec"
          class:on={recording}
          disabled={!playing}
          onclick={toggleRecord}
          title={playing ? "Enregistrer le live take en WAV" : 'Lance PLAY pour pouvoir enregistrer'}
        >
          <span class="rec-dot"></span>{recording ? 'REC…' : 'REC'}
        </button>
        <div class="lcd-block">
          <span class="lcd">{Math.round(st.tempo)} BPM · {playing ? 'LECTURE' : 'ARRÊT'}{recording ? ' · ENREGISTREMENT' : ''}</span>
          <span class="lcd-sub">TOUT RÉEL · ⚙ POUR RÉASSIGNER BOUTONS ET PAD</span>
        </div>
        <button class="tilt-btn" class:on={tiltEnabled} onclick={toggleTilt} title="Inclinaison (optionnelle)">
          <span class="led"></span>{tiltEnabled ? `${Math.round(tiltGamma)}°` : 'TILT'}
        </button>
        <button class="amp-btn shuffle" onclick={shuffleAssignments} title="Brasser — réassigne tout le catalogue au hasard">
          🔀
        </button>
        <button class="amp-btn gear" onclick={() => (assignOpen = true)} title="Assignation">⚙</button>
      </div>
      <div class="seekbar"><div class="seekbar-fill"></div><div class="seekbar-grip"></div></div>
      {#if tiltDenied}
        <!-- Hors du flux de la grille exprès : un enfant de grille conditionnel
             décale l'auto-placement des rangées suivantes (voir le commentaire
             sur .main plus bas) — un toast en position absolute n'a pas ce
             problème. -->
        <p class="tilt-warn">Capteur refusé — le mode reste jouable au tactile seul.</p>
      {/if}
      <div class="main">
        <div class="buttons">
          {#each assignments.slots as actionIds, i (i)}
            {#if assignments.slotModes[i] === 'fader'}
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
          {/each}
        </div>
        <div class="mid-col">
          <div class="lin-seq">
            <span class="lin-label">SÉQUENCEUR</span>
            <canvas bind:this={linCanvas}></canvas>
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
                    <button
                      class="mode-toggle lock-toggle"
                      class:on={assignments.slotLocked[i]}
                      onclick={() => toggleSlotLock(i)}
                      title={assignments.slotLocked[i] ? 'Déverrouiller (🔀 pourra le rebrasser)' : 'Verrouiller (🔀 le laissera tel quel)'}
                    >
                      {assignments.slotLocked[i] ? '🔒' : '🔓'}
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
              <button class="assign-row" onclick={() => (picker = { kind: 'axis', which: 'axisX' })}>
                <span class="assign-row-label">PAD — AXE X (↔)</span>
                <span class="assign-row-val">{axesFor(assignments.axisX).map((a) => a.label).join(' + ')}</span>
              </button>
              <button class="assign-row" onclick={() => (picker = { kind: 'axis', which: 'axisY' })}>
                <span class="assign-row-label">PAD — AXE Y (↕)</span>
                <span class="assign-row-val">{axesFor(assignments.axisY).map((a) => a.label).join(' + ')}</span>
              </button>
              <button class="assign-row" onclick={() => (picker = { kind: 'axis', which: 'axisTilt' })}>
                <span class="assign-row-label">INCLINAISON</span>
                <span class="assign-row-val">{axesFor(assignments.axisTilt).map((a) => a.label).join(' + ')}</span>
              </button>
              <button class="assign-row" onclick={() => (picker = { kind: 'viz' })}>
                <span class="assign-row-label">VISUALISEUR</span>
                <span class="assign-row-val">{vizById(assignments.viz).label}</span>
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

            <button class="amp-btn assign-close" onclick={() => (assignOpen = false)}>FERMÉ · RETOUR AU LIVE</button>
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
                      : 'PARAMÈTRE'}
                {#if picker.kind !== 'viz'}<span class="picker-hint">— plusieurs possibles</span>{/if}
              </h4>
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
                {:else}
                  {#each LIVE_VIZ as v (v.id)}
                    <button class="picker-row" class:current={v.id === assignments.viz} onclick={() => commitViz(v.id)}>
                      <span class="picker-label">{v.label}</span>
                    </button>
                  {/each}
                {/if}
              </div>
              <button class="amp-btn picker-close" onclick={() => (picker = null)}>FERMÉ</button>
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
    --amp-bg-1: #6a6a9c;
    --amp-bg-2: #3a3a64;
    --amp-bg-3: #1c1c34;
    --amp-line: #0a0a18;
    --amp-hi: #9a9ad0;
    --amp-title-grad: linear-gradient(180deg, #5a5ad0 0%, #3232a0 45%, #26266e 55%, #3a3a8c 100%);
    --amp-lcd-bg: #050806;
    --amp-lcd-fg: #33ff44;
    --amp-lcd-dim: #145520;
    --amp-amber: #ffb020;
    --amp-text: #cfd0f0;
    font-family: ui-monospace, 'JetBrains Mono', monospace;
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
    /* Exactement les rangées TOUJOURS présentes (titlebar/topbar/seekbar/
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
  .seekbar {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.7);
  }
  .seekbar-fill {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 38%;
    background: linear-gradient(90deg, #145520, var(--amp-lcd-fg));
    border-radius: 3px 0 0 3px;
  }
  .seekbar-grip {
    position: absolute;
    left: 38%;
    top: 50%;
    width: 6px;
    height: 10px;
    transform: translate(-50%, -50%);
    background: linear-gradient(180deg, var(--amp-hi), var(--amp-bg-3));
    border: 1px solid var(--amp-line);
    border-radius: 1px;
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
  .amp-btn.shuffle {
    width: 22px;
    padding: 4px 0;
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
  .lin-seq {
    background: var(--amp-lcd-bg);
    border: 1px solid var(--amp-line);
    border-radius: 5px;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.7);
    position: relative;
    flex: 0 0 30%;
    min-height: 0;
    overflow: hidden;
  }
  .lin-seq canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
  .lin-label {
    position: absolute;
    top: 2px;
    left: 3px;
    font-size: 7px;
    color: var(--amp-lcd-fg);
    letter-spacing: 0.08em;
    z-index: 1;
    background: rgba(2, 3, 2, 0.72);
    padding: 1px 4px;
    border-radius: 2px;
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
  /* Verrou de bouton (PLAN.md §7) : même gabarit que le toggle actions/fader
     voisin, distingué par la couleur ambre une fois verrouillé (même accent
     que les emplacements de snapshot remplis, .snapshot-slot.filled). */
  .lock-toggle.on {
    color: var(--amp-amber);
    border-color: var(--amp-amber);
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
</style>
