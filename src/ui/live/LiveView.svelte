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
  import { audioBufferToWavBlob, downloadBlob } from '../../engine/render-offline';
  import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';
  import type { DrumRowName, SynthRowName } from '../../model/types';
  import {
    actionById,
    axisById,
    cycleAction,
    cycleAxis,
    cycleViz,
    loadLiveAssignments,
    saveLiveAssignments,
    vizById,
    type LiveActionId,
  } from './liveActions';

  let { onExit }: { onExit: () => void } = $props();

  const engine = new AudioEngine(() => pattern.snapshot());
  const st = $derived(pattern.state);

  let playing = $state(false);
  let recording = $state(false);
  let breakArmed = $state(false);
  let fillArmed = $state(false);
  let rollHeld = $state<number | null>(null); // multiplicateur en cours (2/3/4), ou null
  let muted = $state<Record<DrumRowName, boolean>>({ kick: false, snare: false, hat: false });

  let assignments = $state(loadLiveAssignments());
  let assignOpen = $state(false);

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
      case 'roll-hat-x2':
        return rollHeld === 2;
      case 'roll-hat-x3':
        return rollHeld === 3;
      case 'roll-hat-x4':
        return rollHeld === 4;
      default:
        return false;
    }
  }

  function toggleMute(name: DrumRowName) {
    muted[name] = !muted[name];
    engine.liveSetMute(name, muted[name]);
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
      case 'roll-hat-x2':
        engine.liveSetHatRoll(on ? 2 : null);
        rollHeld = on ? 2 : null;
        break;
      case 'roll-hat-x3':
        engine.liveSetHatRoll(on ? 3 : null);
        rollHeld = on ? 3 : null;
        break;
      case 'roll-hat-x4':
        engine.liveSetHatRoll(on ? 4 : null);
        rollHeld = on ? 4 : null;
        break;
    }
  }

  function onSlotDown(i: number) {
    pressed = { ...pressed, [i]: true };
    runAction(assignments.slots[i], true);
  }
  function onSlotUp(i: number) {
    pressed = { ...pressed, [i]: false };
    runAction(assignments.slots[i], false);
  }

  function cycleSlot(i: number) {
    assignments.slots[i] = cycleAction(assignments.slots[i]);
    saveLiveAssignments(assignments);
  }
  function cycleAxisAssign(which: 'axisX' | 'axisY' | 'axisTilt') {
    assignments[which] = cycleAxis(assignments[which]);
    saveLiveAssignments(assignments);
  }
  function cycleVizAssign() {
    assignments.viz = cycleViz(assignments.viz);
    saveLiveAssignments(assignments);
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
  let axisValues = $state<Record<'filter' | 'reverb', number>>({ filter: 0.5, reverb: 0.5 });

  // Le paramètre assigné à chaque axe (filtre par défaut en X, reverb en Y,
  // réassignables depuis l'overlay ⚙). Filtre en courbe exponentielle
  // (200 Hz étouffé à 20 kHz grand ouvert, plus naturel à l'oreille qu'une
  // échelle linéaire).
  function applyAxisValue(axisId: 'filter' | 'reverb', value01: number) {
    axisValues[axisId] = value01;
    if (axisId === 'filter') {
      const hz = 200 * Math.pow(20000 / 200, value01);
      engine.setLiveFilterCutoff(hz);
    } else {
      engine.setLiveReverbWet(value01);
    }
  }

  // Les deux paramètres sont inversés pour l'axe Y du pad (haut du pad =
  // 100%), pas pour l'axe X ni pour l'inclinaison.
  function setPad(clientX: number, clientY: number, rect: DOMRect) {
    padX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    padY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
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

  // VU-mètre par ligne — niveau crête réel (AudioEngine.getLineLevels(),
  // lui-même lu depuis les AnalyserNode ajoutés au graphe), avec un
  // relâchement exponentiel côté UI pour un rebond lisible plutôt qu'un
  // clignotement pas-à-pas.
  function drawVizBars(ctx: CanvasRenderingContext2D) {
    const r = vizCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const levels = engine.getLineLevels();
    const barW = w / LINE_NAMES.length;
    LINE_NAMES.forEach((name, i) => {
      const raw = levels[name] ?? 0;
      const prev = levelSmooth[name] ?? 0;
      const smoothed = Math.max(raw, prev * 0.88);
      levelSmooth[name] = smoothed;
      // Boost d'affichage : les crêtes réelles mesurées avant le bus/limiteur
      // final tournent souvent bien en dessous de 1.0 (~0.05-0.3) — sans ce
      // facteur, les barres resteraient quasi invisibles pour un pattern normal.
      const boosted = Math.min(1, smoothed * 3.5);
      const barH = boosted * h * 0.95;
      if (barH < 1) return;
      const x = i * barW + 2;
      const bw = Math.max(1, barW - 4);
      ctx.fillStyle = LINE_COLOR[name];
      roundRectPath(ctx, x, h - barH, bw, barH, 3);
      ctx.fill();
    });
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
  let runnerJumpSmooth = 0;
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
    const scroll = now * 70;
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
    const kick = engine.getLineLevels().kick ?? 0;
    runnerJumpSmooth = Math.max(kick, runnerJumpSmooth * 0.8);
    const jump = Math.min(1, runnerJumpSmooth * 3) * h * 0.16;
    const cy = groundY - jump - h * 0.05;
    const run = now * 12;
    ctx.strokeStyle = '#eafff0';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(charX, cy);
    ctx.lineTo(charX + Math.sin(run) * 8, cy + h * 0.09);
    ctx.moveTo(charX, cy);
    ctx.lineTo(charX - Math.sin(run) * 8, cy + h * 0.09);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(charX, cy - h * 0.03);
    ctx.lineTo(charX + Math.cos(run) * 7, cy + h * 0.02);
    ctx.moveTo(charX, cy - h * 0.03);
    ctx.lineTo(charX - Math.cos(run) * 7, cy + h * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(charX, cy - h * 0.03);
    ctx.lineTo(charX, cy - h * 0.12);
    ctx.stroke();
    ctx.fillStyle = '#eafff0';
    ctx.beginPath();
    ctx.arc(charX, cy - h * 0.17, h * 0.05, 0, Math.PI * 2);
    ctx.fill();
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
          {#each assignments.slots as actionId, i (i)}
            {@const a = actionById(actionId)}
            <button
              class="abtn"
              class:pressed={pressed[i]}
              class:active={isActionActive(actionId)}
              onpointerdown={() => onSlotDown(i)}
              onpointerup={() => onSlotUp(i)}
              onpointerleave={() => onSlotUp(i)}
            >
              <span class="dot" style:background={a.color}></span>
              <span>{a.label}</span>
              <span class="assign-label">{a.desc}</span>
            </button>
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
            aria-label="{axisById(assignments.axisX).label} / {axisById(assignments.axisY).label}"
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
              <span class="eq-lbl">{axisById(assignments.axisX).label}</span>
              <div class="eq-track"><div class="eq-fill" style:width="{axisValues[assignments.axisX] * 100}%"></div></div>
              <span class="eq-val">{Math.round(axisValues[assignments.axisX] * 100)}%</span>
            </div>
            <div class="eq-band">
              <span class="eq-lbl">{axisById(assignments.axisY).label}</span>
              <div class="eq-track"><div class="eq-fill" style:width="{axisValues[assignments.axisY] * 100}%"></div></div>
              <span class="eq-val">{Math.round(axisValues[assignments.axisY] * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
      {#if assignOpen}
        <div class="assign-overlay show">
          <div class="assign-card">
            <h4>ASSIGNATION</h4>
            <div class="assign-list">
              {#each assignments.slots as actionId, i (i)}
                {@const a = actionById(actionId)}
                <button class="assign-row" onclick={() => cycleSlot(i)}>
                  <span class="assign-row-label">BOUTON {i + 1}</span>
                  <span class="assign-row-val" style:color={a.color}>{a.label}</span>
                </button>
              {/each}
              <button class="assign-row" onclick={() => cycleAxisAssign('axisX')}>
                <span class="assign-row-label">PAD — AXE X (↔)</span>
                <span class="assign-row-val">{axisById(assignments.axisX).label}</span>
              </button>
              <button class="assign-row" onclick={() => cycleAxisAssign('axisY')}>
                <span class="assign-row-label">PAD — AXE Y (↕)</span>
                <span class="assign-row-val">{axisById(assignments.axisY).label}</span>
              </button>
              <button class="assign-row" onclick={() => cycleAxisAssign('axisTilt')}>
                <span class="assign-row-label">INCLINAISON</span>
                <span class="assign-row-val">{axisById(assignments.axisTilt).label}</span>
              </button>
              <button class="assign-row" onclick={cycleVizAssign}>
                <span class="assign-row-label">VISUALISEUR</span>
                <span class="assign-row-val">{vizById(assignments.viz).label}</span>
              </button>
            </div>
            <button class="amp-btn assign-close" onclick={() => (assignOpen = false)}>FERMÉ · RETOUR AU LIVE</button>
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
    width: 30px;
    flex-shrink: 0;
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
  /* Appui = option suivante dans le catalogue (cycle) — pas de sous-menu à
     ouvrir, le geste le plus rapide sur un petit écran tactile. */
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
</style>
