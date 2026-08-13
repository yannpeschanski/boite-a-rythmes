<script lang="ts">
  // Vue circulaire unifiée (Atelier ET futur mode jeu). Port fidèle de
  // drawCircle / ringGeometry / stepFromEvent (boite-a-rythme-69.html
  // l. 5078–5218) et attachLongPress (l. 2996 : 480 ms, tolérance 10 px).
  // Le composant ne touche jamais l'état : il calcule la case visée
  // (anneau + colonne) et remonte onCellTap / onCellRoll ; le parent applique
  // le cycle d'état, comme pour la grille linéaire (DrumRowView).
  // Pas de boucle rAF permanente : un $effect redessine quand rows/playhead
  // changent — c'est le parent qui pilote le curseur.
  import type { DrumRowName, DrumStep } from '../../model/types';

  let {
    rows,
    playhead,
    editable = true,
    onCellTap,
    onCellRoll,
  }: {
    rows: Record<
      DrumRowName,
      { subdiv: number; pattern: DrumStep[]; rolls: number[]; muted: boolean }
    >;
    playhead: Record<DrumRowName, number>; // -1 = pas de curseur
    editable?: boolean;
    onCellTap?: (name: DrumRowName, col: number) => void;
    onCellRoll?: (name: DrumRowName, col: number) => void;
  } = $props();

  // Vue circulaire volontairement limitée à kick/snare/hat (PLAN.md §6) — pas
  // clap/shaker : 5 anneaux concentriques tasseraient l'anneau intérieur au
  // point de devenir difficile à viser au doigt. Type local plutôt que
  // `DrumRowName` (élargi) pour RING_ORDER/FALLBACK/radii/ringColor
  // ci-dessous — clap/shaker restent éditables en vue linéaire (DrumRowView)
  // seulement.
  type CircleRowName = 'kick' | 'snare' | 'hat';

  // Ordre de dessin ; rayons comme l'original : kick à l'extérieur (0.92),
  // snare au milieu (0.62), hat à l'intérieur (0.34).
  const RING_ORDER: CircleRowName[] = ['kick', 'snare', 'hat'];

  // Couleurs d'anneau : les tokens --cell-* du design system (mêmes teintes
  // que la grille linéaire), lus au montage ; repli sur les valeurs de
  // tokens.css si la variable est absente (canvas hors d'un thème).
  const FALLBACK: Record<CircleRowName, string> = {
    kick: '#d84315',
    snare: '#c8881a',
    hat: '#2b8a8a',
  };
  // Bleu "luna" de l'original : curseur de lecture, cases vides, rafales, texte.
  const INK = '#0a246a';

  // Constantes d'interaction (identiques à l'original)
  const LONG_PRESS_MS = 480;
  const MOVE_TOLERANCE = 10;
  const ROLL_DEBOUNCE_MS = 350; // long-press tactile + contextmenu natif = même geste

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  const ringColor: Record<CircleRowName, string> = { ...FALLBACK };

  // ---- Géométrie (port de ringGeometry) ----
  function ringGeometry(w: number, h: number) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.46;
    const thickness = maxR * 0.16;
    const radii: Record<CircleRowName, number> = {
      kick: maxR * 0.92,
      snare: maxR * 0.62,
      hat: maxR * 0.34,
    };
    return { cx, cy, maxR, thickness, radii };
  }

  // ---- Canvas net quel que soit le devicePixelRatio (port de resizeCanvas) ----
  function resize() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- Dessin (port de drawCircle) ----
  function draw() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    ctx.clearRect(0, 0, w, h);
    const { cx, cy, thickness, radii } = ringGeometry(w, h);

    for (const name of RING_ORDER) {
      const row = rows[name];
      const r = radii[name];
      const n = Math.max(1, row.subdiv);
      const cursor = row.muted ? -1 : playhead[name];
      const gap = Math.min(0.06, ((2 * Math.PI) / n) * 0.18);
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap / 2;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap / 2;
        const state = (row.pattern[i] ?? 0) as DrumStep;
        const active = state > 0;
        // état 2 (rim shot / hat ouvert) : trait plus fin et plus clair
        const isAlt = state === 2;
        const isCurrent = i === cursor;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a1);
        ctx.lineWidth = isAlt ? thickness * 0.5 : thickness;
        if (row.muted) {
          ctx.strokeStyle = active ? 'rgba(10,36,106,0.4)' : 'rgba(10,36,106,0.15)';
          ctx.globalAlpha = 1;
        } else if (active) {
          ctx.strokeStyle = isCurrent ? INK : ringColor[name];
          ctx.globalAlpha = isCurrent ? 1 : isAlt ? 0.6 : 0.9;
        } else {
          ctx.strokeStyle = isCurrent ? 'rgba(10,36,106,0.45)' : 'rgba(10,36,106,0.22)';
          ctx.globalAlpha = 1;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Rafale : point au milieu du secteur actif
        if ((row.rolls[i] ?? 1) > 1 && active) {
          const mid = (a0 + a1) / 2;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = INK;
          ctx.fill();
        }
      }
    }

    // Signature polyrythmique au centre (kick:snare:hat)
    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(10,36,106,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(`${rows.kick.subdiv}:${rows.snare.subdiv}:${rows.hat.subdiv}`, cx, cy + 4);
  }

  // ---- Case visée : angle + rayon → anneau + colonne (port de stepFromEvent) ----
  function hitFromPoint(
    clientX: number,
    clientY: number
  ): { name: DrumRowName; col: number } | null {
    const rect = canvas.getBoundingClientRect();
    const { cx, cy, thickness, radii } = ringGeometry(rect.width, rect.height);
    const dx = clientX - rect.left - cx;
    const dy = clientY - rect.top - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    let name: DrumRowName | null = null;
    for (const candidate of RING_ORDER) {
      if (Math.abs(r - radii[candidate]) < thickness / 2) name = candidate;
    }
    if (!name) return null;
    let angle = Math.atan2(dy, dx) + Math.PI / 2; // 0 = midi, sens horaire
    if (angle < 0) angle += Math.PI * 2;
    const subdiv = rows[name].subdiv;
    const col = Math.floor((angle / (Math.PI * 2)) * subdiv) % subdiv;
    return { name, col };
  }

  // ---- Interactions ----
  let suppressClickUntil = 0; // avale le click fantôme qui suit un appui long
  let lastRollAt = 0; // anti double-rafale (contextmenu natif + long-press)

  function fireRoll(clientX: number, clientY: number) {
    const now = Date.now();
    if (now - lastRollAt < ROLL_DEBOUNCE_MS) return;
    lastRollAt = now;
    const hit = hitFromPoint(clientX, clientY);
    if (hit) onCellRoll?.(hit.name, hit.col);
  }

  function handleClick(e: MouseEvent) {
    if (!editable || Date.now() < suppressClickUntil) return;
    const hit = hitFromPoint(e.clientX, e.clientY);
    if (hit) onCellTap?.(hit.name, hit.col);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    if (!editable) return;
    fireRoll(e.clientX, e.clientY);
  }

  // Appui long tactile — mêmes constantes que attachLongPress (480 ms, 10 px),
  // avec la vibration de confirmation de l'original.
  let lpTimer: ReturnType<typeof setTimeout> | null = null;
  let lpX = 0;
  let lpY = 0;

  function handleTouchStart(e: TouchEvent) {
    if (!editable) return;
    const t = e.touches[0];
    if (!t) return;
    lpX = t.clientX;
    lpY = t.clientY;
    if (lpTimer) clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      lpTimer = null;
      suppressClickUntil = Date.now() + 600;
      fireRoll(lpX, lpY);
      navigator.vibrate?.(12);
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(e: TouchEvent) {
    if (!lpTimer) return;
    const t = e.touches[0];
    if (!t) return;
    if (Math.abs(t.clientX - lpX) > MOVE_TOLERANCE || Math.abs(t.clientY - lpY) > MOVE_TOLERANCE) {
      clearTimeout(lpTimer);
      lpTimer = null;
    }
  }

  function cancelLongPress() {
    if (lpTimer) {
      clearTimeout(lpTimer);
      lpTimer = null;
    }
  }

  // ---- Montage : contexte, tokens, dimensionnement, listeners ----
  // Les redraws déclenchés ici (resize, observer) passent par des callbacks
  // asynchrones : ils ne créent aucune dépendance réactive dans cet effet.
  $effect(() => {
    ctx = canvas.getContext('2d');
    const cs = getComputedStyle(canvas);
    for (const name of RING_ORDER) {
      const v = cs.getPropertyValue(`--cell-${name}`).trim();
      if (v) ringColor[name] = v;
    }
    const redraw = () => {
      resize();
      draw();
    };
    const ro = new ResizeObserver(redraw);
    ro.observe(canvas);
    // resize fenêtre : couvre aussi le changement de zoom (devicePixelRatio)
    window.addEventListener('resize', redraw);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', cancelLongPress);
    canvas.addEventListener('touchcancel', cancelLongPress);
    resize();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', redraw);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', cancelLongPress);
      canvas.removeEventListener('touchcancel', cancelLongPress);
      cancelLongPress();
    };
  });

  // ---- Redessin réactif : suit rows (subdiv/pattern/rolls/muted) + playhead.
  // Les dépendances sont touchées explicitement AVANT draw() : si draw sortait
  // tôt (canvas encore à 0×0), l'effet resterait quand même abonné.
  $effect(() => {
    for (const name of RING_ORDER) {
      const row = rows[name];
      void row.muted;
      void playhead[name];
      for (let i = 0; i < row.subdiv; i++) {
        void row.pattern[i];
        void row.rolls[i];
      }
    }
    draw();
  });
</script>

<canvas
  bind:this={canvas}
  class:editable
  aria-label="Vue circulaire du rythme : kick (anneau extérieur), snare, hat (anneau intérieur)"
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    max-width: 100%;
    aspect-ratio: 1 / 1;
    touch-action: manipulation;
  }
  canvas.editable {
    cursor: pointer;
  }
</style>
