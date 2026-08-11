<script lang="ts">
  // Rappel coloré compact du rythme dans la barre de transport — anneau
  // batterie (Kick/Snare/Hat) et anneau synthé (Basse/Nappe/Mélodie) côte à
  // côte, à droite de Lecture/Break. Volontairement un aperçu, pas un second
  // éditeur : ni clic ni curseur de lecture, juste "il y a du monde ici" en
  // un coup d'œil pendant qu'on est sur un autre onglet — remplace l'idée
  // (abandonnée) d'ancrer tout le séquenceur éditable en permanence.
  import type { PatternStateV2 } from '../../model/types';
  import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';

  let { state }: { state: PatternStateV2 } = $props();

  // Mêmes valeurs que --cell-* de tokens.css (StepCircle.FALLBACK,
  // SynthRowView.PREVIEW_COLOR) — un canvas ne peut pas lire une variable
  // CSS directement, donc dupliquées ici comme ailleurs dans le code.
  const DRUM_COLOR = { kick: '#d84315', snare: '#c8881a', hat: '#2b8a8a' } as const;
  const SYNTH_COLOR = { bass: '#6a7bff', pad: '#b06bff', melody: '#ff6bd6' } as const;
  const SIZE = 50;

  let drumCanvas: HTMLCanvasElement;
  let synthCanvas: HTMLCanvasElement;

  function mix(hex: string, pct: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    const mr = Math.round(r + (255 - r) * (1 - pct / 100));
    const mg = Math.round(g + (255 - g) * (1 - pct / 100));
    const mb = Math.round(b + (255 - b) * (1 - pct / 100));
    return `rgb(${mr},${mg},${mb})`;
  }

  function drawRing(canvas: HTMLCanvasElement, rings: { active: boolean[]; color: string }[]) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const radii = [SIZE * 0.46, SIZE * 0.32, SIZE * 0.18];
    const thickness = SIZE * 0.11;
    rings.forEach((ring, idx) => {
      const n = ring.active.length;
      if (n === 0) return;
      const r = radii[idx];
      const gap = Math.min(0.14, ((2 * Math.PI) / n) * 0.24);
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + gap / 2;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - gap / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, a0, a1);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = ring.active[i] ? ring.color : mix(ring.color, 18);
        ctx.stroke();
      }
    });
  }

  $effect(() => {
    const drumRings = DRUM_ROW_NAMES.map((name) => {
      const row = state.rows[name];
      return {
        color: DRUM_COLOR[name],
        active: row.pattern.slice(0, row.subdiv).map((v) => v > 0),
      };
    });
    if (drumCanvas) drawRing(drumCanvas, drumRings);

    const synthRings = SYNTH_ROW_NAMES.map((name) => {
      const row = state.synthRows[name];
      const active = row.pattern
        .slice(0, row.subdivisions)
        .map((v) => (name === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
      return { color: SYNTH_COLOR[name], active };
    });
    if (synthCanvas) drawRing(synthCanvas, synthRings);
  });
</script>

<div class="rings">
  <div class="ring-unit" title="Batterie — la mesure en cours (Kick/Snare/Hat)">
    <canvas bind:this={drumCanvas} style:width="{SIZE}px" style:height="{SIZE}px" aria-hidden="true"></canvas>
  </div>
  <div class="ring-unit" title="Synthé — le cycle en cours (Basse/Nappe/Mélodie)">
    <canvas bind:this={synthCanvas} style:width="{SIZE}px" style:height="{SIZE}px" aria-hidden="true"></canvas>
  </div>
</div>

<style>
  .rings {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ring-unit canvas {
    display: block;
  }
</style>
