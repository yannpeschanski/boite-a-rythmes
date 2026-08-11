<script lang="ts">
  // Courbe de réponse du filtre passe-bas d'une voix synthé — port de
  // drawFilterCurve (boite-a-rythme-69.html l. 2651). Calcul purement
  // mathématique (biquadLowpassResponseDb), aucun AudioContext requis : la
  // courbe s'affiche même avant qu'un son ait été joué.
  import type { SynthVoice } from '../../model/types';
  import { biquadLowpassResponseDb } from '../../engine/fx';

  let { voice, color }: { voice: SynthVoice; color: string } = $props();

  const SAMPLE_RATE = 44100; // valeur d'affichage seulement, la forme change à peine entre 44.1k et 48k
  const FREQ_MIN = 20;
  const FREQ_MAX = 12000;
  const DB_MIN = -48;
  const DB_MAX = 6;
  const LOG_MIN = Math.log10(FREQ_MIN);
  const LOG_MAX = Math.log10(FREQ_MAX);
  const INK = 'rgba(10,36,106,0.55)';

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;

  function xForFreq(f: number, w: number): number {
    return ((Math.log10(f) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * w;
  }
  function yForDb(db: number, h: number): number {
    const clamped = Math.max(DB_MIN, Math.min(DB_MAX, db));
    return h - ((clamped - DB_MIN) / (DB_MAX - DB_MIN)) * h;
  }

  function resize(): void {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(): void {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;
    const cutoff = voice.cutoff || 1800;
    const q = voice.resonance != null ? voice.resonance : 0.7;
    const envAmount = voice.filterEnvAmount || 0;

    ctx.clearRect(0, 0, w, h);

    // Repères de fréquence (100Hz/1k/10k).
    ctx.font = '8px sans-serif';
    ctx.textBaseline = 'bottom';
    for (const f of [100, 1000, 10000]) {
      if (f < FREQ_MIN || f > FREQ_MAX) continue;
      const x = xForFreq(f, w);
      ctx.strokeStyle = 'rgba(10,36,106,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = f === 10000 ? 'right' : 'left';
      ctx.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), x + (f === 10000 ? -2 : 2), h - 1);
    }

    // Ligne de repère à 0dB.
    ctx.strokeStyle = 'rgba(10,36,106,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yForDb(0, h));
    ctx.lineTo(w, yForDb(0, h));
    ctx.stroke();

    const drawCurve = (cutoffFreq: number, alpha: number) => {
      if (!ctx) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.4;
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const f = Math.pow(10, LOG_MIN + (i / steps) * (LOG_MAX - LOG_MIN));
        const db = biquadLowpassResponseDb(f, cutoffFreq, q, SAMPLE_RATE);
        const x = xForFreq(f, w);
        const y = yForDb(db, h);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    // Courbe pâle en fond : jusqu'où le filtre s'ouvre à l'attaque (Ouv. filtre).
    if (envAmount > 0) drawCurve(cutoff + envAmount, 0.3);
    drawCurve(cutoff, 1);

    // Marqueur de coupure.
    const cutoffX = xForFreq(Math.max(FREQ_MIN, Math.min(FREQ_MAX, cutoff)), w);
    const cutoffY = yForDb(biquadLowpassResponseDb(cutoff, cutoff, q, SAMPLE_RATE), h);
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cutoffX, 0);
    ctx.lineTo(cutoffX, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cutoffX, cutoffY, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '8px sans-serif';
    ctx.textBaseline = 'top';
    const label = (cutoff >= 1000 ? (cutoff / 1000).toFixed(cutoff % 1000 === 0 ? 0 : 1) + 'k' : Math.round(cutoff)) + 'Hz';
    const labelRight = cutoffX < w - 30;
    ctx.textAlign = labelRight ? 'left' : 'right';
    ctx.fillText(label, cutoffX + (labelRight ? 3 : -3), 2);
  }

  $effect(() => {
    ctx = canvas.getContext('2d');
    const redraw = () => {
      resize();
      draw();
    };
    const ro = new ResizeObserver(redraw);
    ro.observe(canvas);
    window.addEventListener('resize', redraw);
    resize();
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', redraw);
    };
  });

  $effect(() => {
    void voice.cutoff;
    void voice.resonance;
    void voice.filterEnvAmount;
    draw();
  });
</script>

<canvas bind:this={canvas} aria-label="Courbe de réponse du filtre"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    max-width: 260px;
    aspect-ratio: 260 / 40;
  }
</style>
