<script lang="ts">
  // Mode Live — Phase 1 du plan (PLAN.md §7) : squelette visuel + verrouillage
  // d'orientation + flux de permission DeviceOrientationEvent, à tester sur un
  // vrai téléphone (accessible via #mode-live, volontairement absent de la
  // navigation normale — voir App.svelte).
  //
  // Ce que ce composant NE fait PAS encore (phases suivantes) :
  //  - les boutons/le pad ne pilotent aucun paramètre réel du moteur (phase 2) ;
  //  - le séquenceur linéaire et le visualiseur tournent sur une animation
  //    synthétique, pas sur les vrais GainNode par ligne (phase 2) ;
  //  - le bouton ⚙ d'assignation est désactivé, pas encore câblé (phase 3).
  //
  // Esthétique et diagnostic ergonomie détaillés dans PLAN.md §7 : contrôles
  // interactifs volontairement plus grands que le vrai skin Winamp (pensé
  // souris de bureau), toggle "inclinaison" sorti de la zone de drag du pad,
  // inclinaison jamais requise (repli tactile pur toujours complet).
  import { onMount, onDestroy } from 'svelte';

  let { onExit }: { onExit: () => void } = $props();

  let isPortrait = $state(true);
  let tiltEnabled = $state(false);
  let tiltDenied = $state(false);
  let tiltGamma = $state(0); // inclinaison gauche/droite en degrés, lecture brute pour valider le flux sur device réel

  let padX = $state(0.5);
  let padY = $state(0.5);
  let pressed = $state<Record<string, boolean>>({});

  const BUTTONS = [
    { id: 'break', label: 'BREAK', color: 'var(--cell-kick)', assign: 'Break (déclencheur)' },
    { id: 'fill', label: 'FILL', color: 'var(--cell-snare)', assign: 'Fill forcé (déclencheur)' },
    { id: 'mutek', label: 'MUTE K', color: 'var(--cell-kick)', assign: 'Muet — Kick' },
    { id: 'mutes', label: 'MUTE S', color: 'var(--cell-snare)', assign: 'Muet — Snare' },
    { id: 'muteh', label: 'MUTE H', color: 'var(--cell-hat)', assign: 'Muet — Hat' },
    { id: 'roll', label: 'ROLL×2', color: 'var(--cell-hat)', assign: 'Rafale hat ×2 (déclencheur)' },
  ] as const;

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

  function onOrientationEvent(e: DeviceOrientationEvent) {
    tiltGamma = e.gamma ?? 0;
  }

  async function toggleTilt() {
    if (tiltEnabled) {
      window.removeEventListener('deviceorientation', onOrientationEvent);
      tiltEnabled = false;
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
    window.addEventListener('deviceorientation', onOrientationEvent);
    tiltEnabled = true;
  }

  function setPad(clientX: number, clientY: number, rect: DOMRect) {
    padX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    padY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
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

  function press(id: string, on: boolean) {
    pressed = { ...pressed, [id]: on };
  }

  // ---- Séquenceur linéaire + visualiseur — synthétiques pour l'instant ----
  const CONTRIB = [
    { hex: '#ff6a4a', steps: [0, 4, 8, 12], decay: 0.45, amp: 1.0 },
    { hex: '#ffcf5c', steps: [4, 12], decay: 0.5, amp: 0.9 },
    { hex: '#4fd8d8', steps: [0, 2, 4, 6, 8, 10, 12, 14], decay: 0.16, amp: 0.5 },
    { hex: '#7c8bff', steps: [0, 6, 8, 10], decay: 0.65, amp: 0.85 },
    { hex: '#cf8bff', steps: [0, 8], decay: 1.5, amp: 0.6 },
    { hex: '#ff8ce0', steps: [2, 5, 9, 11, 14], decay: 0.35, amp: 0.55 },
  ];
  const BPM = 120;
  const STEP_DUR = 60 / BPM / 4;
  const STEPS = 16;

  let linCanvas: HTMLCanvasElement = $state()!;
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

  function drawLinSeq(ctx: CanvasRenderingContext2D, now: number) {
    const r = linCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const top = 11;
    const gridH = h - top;
    const rows = CONTRIB.length;
    const rowH = gridH / rows;
    const colW = w / STEPS;
    const curStepF = (now / STEP_DUR) % STEPS;
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(Math.floor(curStepF) * colW, top, colW, gridH);
    for (let ri = 0; ri < rows; ri++) {
      const c = CONTRIB[ri];
      const y = top + ri * rowH;
      for (let i = 0; i < STEPS; i++) {
        const on = c.steps.includes(i);
        const x = i * colW;
        ctx.fillStyle = on ? c.hex : 'rgba(255,255,255,.06)';
        roundRectPath(ctx, x + 1, y + 1, colW - 2, rowH - 2, 1.5);
        ctx.fill();
      }
    }
    const cursorX = (curStepF / STEPS) * w;
    ctx.fillStyle = '#eafff0';
    ctx.fillRect(cursorX - 0.75, top, 1.5, gridH);
  }

  function drawViz(ctx: CanvasRenderingContext2D, now: number) {
    const r = vizCanvas.getBoundingClientRect();
    const w = r.width,
      h = r.height;
    ctx.clearRect(0, 0, w, h);
    const barW = w / STEPS;
    const curStepF = (now / STEP_DUR) % STEPS;
    for (let i = 0; i < STEPS; i++) {
      if (Math.floor(curStepF) === i) {
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(i * barW, 0, barW, h);
      }
      let y = h - 2;
      const x = i * barW + 1;
      const bw = Math.max(1, barW - 2);
      for (const c of CONTRIB) {
        if (!c.steps.includes(i)) continue;
        let stepsSince = curStepF - i;
        if (stepsSince < 0) stepsSince += STEPS;
        const dt = stepsSince * STEP_DUR;
        const bounce = Math.exp(-dt / c.decay) * (1 + 0.28 * Math.cos(dt * 24));
        const segH = c.amp * Math.max(0, bounce) * h * 0.3;
        if (segH < 1.5) continue;
        ctx.fillStyle = c.hex;
        roundRectPath(ctx, x, y - segH, bw, segH, 2.5);
        ctx.fill();
        y -= segH + 1.5;
      }
    }
  }

  function loop() {
    const now = performance.now() / 1000;
    if (linCanvas) {
      const linCtx = linCanvas.getContext('2d');
      if (linCtx) {
        ensureSize(linCanvas, linCtx);
        drawLinSeq(linCtx, now);
      }
    }
    if (vizCanvas) {
      const vizCtx = vizCanvas.getContext('2d');
      if (vizCtx) {
        ensureSize(vizCanvas, vizCtx);
        drawViz(vizCtx, now);
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
  onDestroy(() => cancelAnimationFrame(raf));
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
        <button class="amp-btn stop">■ STOP</button>
        <div class="lcd-block">
          <span class="lcd">MOTOWN / SOUL · 120 BPM</span>
          <span class="lcd-sub">APERÇU · PAS ENCORE RELIÉ AU MOTEUR</span>
        </div>
        <button
          class="tilt-btn"
          class:on={tiltEnabled}
          onclick={toggleTilt}
          title="Inclinaison (optionnelle)"
        >
          <span class="led"></span>{tiltEnabled ? `${Math.round(tiltGamma)}°` : 'TILT'}
        </button>
        <button class="amp-btn gear" disabled title="Assignation — bientôt (phase 3)">⚙</button>
      </div>
      {#if tiltDenied}
        <p class="tilt-warn">Capteur refusé — le mode reste jouable au tactile seul.</p>
      {/if}
      <div class="seekbar"><div class="seekbar-fill"></div><div class="seekbar-grip"></div></div>
      <div class="main">
        <div class="buttons">
          {#each BUTTONS as b (b.id)}
            <button
              class="abtn"
              class:pressed={pressed[b.id]}
              onpointerdown={() => press(b.id, true)}
              onpointerup={() => press(b.id, false)}
              onpointerleave={() => press(b.id, false)}
            >
              <span class="dot" style:background={b.color}></span>
              <span>{b.label}</span>
              <span class="assign-label">{b.assign}</span>
            </button>
          {/each}
        </div>
        <div class="mid-col">
          <div class="lin-seq">
            <span class="lin-label">SÉQUENCEUR</span>
            <canvas bind:this={linCanvas}></canvas>
          </div>
          <div class="viz-wrap">
            <span class="viz-label">SPECTRE</span>
            <canvas bind:this={vizCanvas}></canvas>
          </div>
        </div>
        <div class="pad-col">
          <div
            class="pad"
            role="slider"
            aria-label="Filtre / Reverb"
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
              <span class="eq-lbl">FILTRE</span>
              <div class="eq-track"><div class="eq-fill" style:width="{padX * 100}%"></div></div>
              <span class="eq-val">{Math.round(padX * 100)}%</span>
            </div>
            <div class="eq-band">
              <span class="eq-lbl">REVERB</span>
              <div class="eq-track"><div class="eq-fill" style:width="{(1 - padY) * 100}%"></div></div>
              <span class="eq-val">{Math.round((1 - padY) * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
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
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, var(--amp-bg-1), var(--amp-bg-2) 12%, var(--amp-bg-3));
    display: grid;
    grid-template-rows: auto auto auto auto 1fr;
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
    margin: 0;
    font-size: 9px;
    color: #ffb0a0;
    padding: 0 4px;
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

  .main {
    display: grid;
    grid-template-columns: 1fr 1.15fr 1fr;
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
</style>
