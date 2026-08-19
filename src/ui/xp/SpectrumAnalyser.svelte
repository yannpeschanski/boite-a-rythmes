<script lang="ts">
  /* L'analyseur de spectre — le visualiseur de Winamp, et rien d'autre.
   *
   * Ce que la skin d'origine faisait et qu'on refait ici :
   *   - des barres larges de quelques pixels, séparées d'un pixel de vide ;
   *   - un dégradé VERTICAL fixe (vert en bas, ambre au milieu, rouge en
   *     haut) : la couleur ne suit pas la barre, elle est peinte sur la
   *     colonne — une barre haute traverse donc les trois zones, et c'est ce
   *     qui fait qu'on lit un niveau et pas une teinte ;
   *   - un capuchon qui monte d'un coup et RETOMBE lentement. Sans lui on ne
   *     voit que le présent ; avec lui on voit le maximum récent, et c'est ce
   *     détail qui fait « analyseur » plutôt que « barres animées ».
   *
   * Le spectre vient du vrai AnalyserNode maître du graphe (`engine.getSpectrum`),
   * branché sur `finalGain` — donc sur ce qu'on entend. Le composant ne calcule
   * aucun audio : il lit un tableau d'octets et le dessine.
   */
  import { onMount } from 'svelte';
  import { niveauBarre, CHUTE_CAPUCHON } from './spectrumBands';

  let {
    getSpectrum,
    size = 0,
    bars = 24,
    height = 40,
  }: {
    /* Remplit le tableau fourni et dit si le graphe existe. Passé en fonction
       plutôt que le moteur entier : ce composant sert l'Atelier et le Mode
       Live, qui n'ont pas le même objet moteur sous la main. */
    getSpectrum: (out: Uint8Array<ArrayBuffer>) => boolean;
    size?: number;
    bars?: number;
    height?: number;
  } = $props();

  let canvas: HTMLCanvasElement = $state()!;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Couleurs lues une fois au montage : un canvas ne sait pas résoudre une
    // variable CSS (même piège que TransportRings et StepCircle).
    const lire = (nom: string, repli: string) =>
      getComputedStyle(canvas).getPropertyValue(nom).trim() || repli;
    const vert = lire('--xp-lcd', '#2ee23c');
    const ambre = lire('--xp-playhead', '#ffd54a');
    const rouge = lire('--cell-kick', '#ff5a2b');
    const fond = lire('--xp-lcd-bg', '#050806');
    const capuchon = lire('--xp-text', '#c8c8d8');

    const data = new Uint8Array(new ArrayBuffer(Math.max(size, 256)));
    const pics = new Float32Array(bars); // hauteur du capuchon, 0..1
    let raf = 0;
    let degrade: CanvasGradient | null = null;
    let hauteurDegrade = 0;

    function frame() {
      raf = requestAnimationFrame(frame);
      const r = canvas.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w < 4 || h < 4) return;
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        degrade = null;
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = fond;
      ctx!.fillRect(0, 0, w, h);

      // Le dégradé est peint sur la COLONNE, pas sur la barre : il ne change
      // jamais, seule la hauteur découpée dedans change.
      if (!degrade || hauteurDegrade !== h) {
        degrade = ctx!.createLinearGradient(0, 0, 0, h);
        degrade.addColorStop(0, rouge);
        degrade.addColorStop(0.35, ambre);
        degrade.addColorStop(1, vert);
        hauteurDegrade = h;
      }

      const vivant = getSpectrum(data);
      const pas = w / bars;
      const largeur = Math.max(1, Math.floor(pas) - 1);

      for (let i = 0; i < bars; i++) {
        const v = vivant ? niveauBarre(data, i, bars, size || data.length) : 0;
        pics[i] = v > pics[i] ? v : Math.max(v, pics[i] - CHUTE_CAPUCHON);

        const x = Math.round(i * pas);
        const hb = Math.round(v * (h - 3));
        if (hb > 0) {
          ctx!.fillStyle = degrade;
          ctx!.fillRect(x, h - hb, largeur, hb);
        }
        const hp = Math.round(pics[i] * (h - 3));
        if (hp > 1) {
          ctx!.fillStyle = capuchon;
          ctx!.fillRect(x, h - hp - 2, largeur, 1);
        }
      }
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas bind:this={canvas} style:height="{height}px" aria-hidden="true"></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    border-radius: 2px;
    background: var(--xp-lcd-bg);
  }
</style>
