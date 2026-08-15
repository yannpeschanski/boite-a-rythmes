<script lang="ts">
  // Rappel coloré compact du rythme dans la barre de transport, à droite de
  // Lecture/Break. Volontairement un aperçu, pas un second éditeur (ni clic,
  // ni édition) — mais le curseur de lecture, lui, doit défiler, sinon rien
  // ne dit que ça joue quand on est sur un autre onglet.
  //
  // REFONTE (retour de Yann : « un petit visuel dynamique qui prend moins de
  // place — un seul anneau sur le cycle le plus grand avec des barres
  // étroites, en excluant les lignes qui ne se jouent pas »). Avant : DEUX
  // canvas de 50px côte à côte (batterie / synthé), chacun à 3 anneaux fixes,
  // qui affichaient les six lignes même vides — d'où l'anneau synthé quasi
  // invisible du constat B5 de l'audit, trois teintes pâles délavées sur du
  // beige pour dire « rien ne joue ». Maintenant : UN canvas, et seules les
  // lignes qui sonnent réellement y prennent une bande. Le gain de place vient
  // de là plus que du diamètre.
  //
  // Trois règles qui font tout le composant :
  //  1. Une ligne n'apparaît que si elle a des notes ET n'est pas coupée.
  //  2. L'anneau représente LE PLUS GRAND CYCLE parmi ces lignes — la batterie
  //     couvre toujours une mesure, une ligne synthé en couvre `cycleBars`. Un
  //     motif plus court se répète donc autour de l'anneau, ce qui montre
  //     exactement ce qu'on entend : le kick qui tourne 4 fois pendant que la
  //     nappe fait un tour.
  //  3. Le curseur global est lu sur la ligne de référence — celle dont le
  //     cycle EST le plus grand. Sa position dans son propre motif est donc
  //     déjà la position dans l'anneau entier, sans avoir à inventer une
  //     horloge globale. (`AudioEngine.currentBar` existe mais il est privé
  //     ET en avance sur le son — c'est la mesure en cours de PROGRAMMATION,
  //     lookahead compris ; l'utiliser ferait défiler le curseur en avance.)
  import type { DrumRowName, PatternStateV2, SynthRowName } from '../../model/types';
  import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';

  let {
    state,
    playhead,
    synthPlayhead,
  }: {
    state: PatternStateV2;
    playhead: Record<DrumRowName, number>;
    synthPlayhead: Record<SynthRowName, number>;
  } = $props();

  // Mêmes valeurs que --cell-* de tokens.css (StepCircle.FALLBACK,
  // SynthRowView.PREVIEW_COLOR) — un canvas ne peut pas lire une variable CSS
  // directement, donc dupliquées ici comme ailleurs dans le code. Les huit
  // lignes y sont désormais, clap et shaker compris : la limitation à
  // kick/snare/hat n'avait de sens que tant que les anneaux étaient fixes et
  // tous dessinés en permanence.
  const COLOR: Record<string, string> = {
    kick: '#d84315',
    snare: '#c8881a',
    hat: '#2b8a8a',
    clap: '#3fae54',
    shaker: '#22a6c9',
    bass: '#6a7bff',
    pad: '#b06bff',
    melody: '#ff6bd6',
  };
  const INK = '#0a246a'; // bleu Luna, comme StepCircle
  const SIZE = 46;

  let canvasEl: HTMLCanvasElement;

  type Band = {
    color: string;
    steps: boolean[]; // pas actifs du motif de la ligne
    bars: number; // durée du motif en mesures
    pos: number; // pas en cours de lecture (-1 si à l'arrêt)
  };

  // Une ligne « joue » si elle porte au moins une note ET n'est pas coupée.
  // C'est ce test qui vide l'anneau de tout ce qui ne sonne pas.
  const bands = $derived.by<Band[]>(() => {
    const out: Band[] = [];
    for (const name of DRUM_ROW_NAMES) {
      const row = state.rows[name];
      if (row.muted) continue;
      const steps = row.pattern.slice(0, row.subdiv).map((v) => v > 0);
      if (!steps.some(Boolean)) continue;
      // Une ligne batterie couvre toujours exactement une mesure
      // (stepDuration = barDuration / subdiv, cf. engine/groove.ts).
      out.push({ color: COLOR[name], steps, bars: 1, pos: playhead[name] });
    }
    for (const name of SYNTH_ROW_NAMES) {
      const row = state.synthRows[name];
      if (row.muted) continue;
      const steps = row.pattern
        .slice(0, row.subdivisions)
        .map((v) => (name === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
      if (!steps.some(Boolean)) continue;
      out.push({ color: COLOR[name], steps, bars: Math.max(1, row.cycleBars), pos: synthPlayhead[name] });
    }
    return out;
  });

  const totalBars = $derived(bands.reduce((m, b) => Math.max(m, b.bars), 1));

  function draw() {
    const ctx = canvasEl?.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = SIZE * dpr;
    canvasEl.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const list = bands;

    // Rien ne joue : un anneau fantôme, pour que la zone ne disparaisse pas
    // d'un coup (un bloc qui apparaît/disparaît fait sauter la mise en page).
    if (list.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, SIZE * 0.36, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,40,0.12)';
      ctx.stroke();
      return;
    }

    // Les bandes se partagent le rayon disponible : à une seule ligne elle est
    // épaisse et lisible, à huit elles restent séparées. Plafonnée pour qu'une
    // ligne seule ne devienne pas un disque plein.
    const rOuter = SIZE * 0.44;
    const rInner = SIZE * 0.13;
    const span = (rOuter - rInner) / list.length;
    const thickness = Math.min(span * 0.72, 5);

    // Repères de mesure, seulement quand l'anneau en couvre plusieurs : sinon
    // un unique trait à midi n'apprend rien. Même principe que `.beat-grid`
    // sur la grille linéaire (audit A5) — on ne trace un repère que là où il
    // informe.
    if (totalBars > 1) {
      ctx.strokeStyle = 'rgba(0,0,40,0.20)';
      ctx.lineWidth = 1;
      for (let b = 0; b < totalBars; b++) {
        const a = (b / totalBars) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner);
        ctx.lineTo(cx + Math.cos(a) * (rOuter + 2), cy + Math.sin(a) * (rOuter + 2));
        ctx.stroke();
      }
    }

    list.forEach((band, idx) => {
      const r = rOuter - idx * span;
      const n = band.steps.length;
      if (n === 0) return;

      // Trace de fond : dit que la ligne existe et où passe sa bande, sans
      // peindre les pas vides un par un (c'est ce qui alourdissait l'ancien
      // rendu à six anneaux).
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,40,0.07)';
      ctx.stroke();

      // Combien de fois ce motif tourne dans l'anneau. Non entier possible
      // (une ligne de 3 mesures dans un anneau de 4) : la dernière répétition
      // est alors tronquée, ce qui est exactement ce qu'on entend.
      const reps = totalBars / band.bars;
      const stepArc = (band.bars / totalBars) * ((Math.PI * 2) / n);
      const gap = Math.min(stepArc * 0.3, 0.05);

      ctx.lineCap = 'butt';
      for (let rep = 0; rep < Math.ceil(reps); rep++) {
        for (let i = 0; i < n; i++) {
          if (!band.steps[i]) continue; // seules les notes sont peintes
          const f = (rep * band.bars + (i / n) * band.bars) / totalBars;
          if (f >= 1) break; // répétition tronquée
          const a0 = f * Math.PI * 2 - Math.PI / 2 + gap / 2;
          const a1 = Math.min(f + (band.bars / totalBars) / n, 1) * Math.PI * 2 - Math.PI / 2 - gap / 2;
          if (a1 <= a0) continue;
          ctx.beginPath();
          ctx.arc(cx, cy, r, a0, a1);
          ctx.lineWidth = thickness;
          ctx.strokeStyle = band.color;
          ctx.stroke();
        }
      }
    });

    // Curseur global : lu sur la ligne de référence, celle dont le cycle EST
    // le plus grand — sa position dans son propre motif vaut donc position
    // dans l'anneau entier. Une aiguille plutôt qu'un pas surligné : sur 46px
    // avec des bandes de 5px, un pas mis en évidence se voit beaucoup moins
    // bien qu'un trait qui balaie.
    const ref = list.find((b) => b.bars === totalBars);
    if (ref && ref.pos >= 0 && ref.steps.length > 0) {
      const f = ref.pos / ref.steps.length;
      const a = f * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (rOuter + 2), cy + Math.sin(a) * (rOuter + 2));
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }

  // Redessin réactif : suit les bandes (motifs, mutes, cycles) et le curseur.
  $effect(() => {
    void bands;
    void totalBars;
    draw();
  });

  const title = $derived(
    bands.length === 0
      ? 'Aperçu du rythme — rien ne joue pour l’instant'
      : `Aperçu du rythme — ${bands.length} ligne${bands.length > 1 ? 's' : ''} en cours sur ${totalBars} mesure${totalBars > 1 ? 's' : ''}`,
  );
</script>

<div class="ring" {title}>
  <canvas bind:this={canvasEl} style:width="{SIZE}px" style:height="{SIZE}px" aria-hidden="true"></canvas>
</div>

<style>
  .ring canvas {
    display: block;
  }
</style>
