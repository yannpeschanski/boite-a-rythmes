<script lang="ts">
  // Pad d'écriture de notes pour une ligne Basse/Mélodie (retour de Yann,
  // 2026-08-16 : « pouvoir ouvrir un pad depuis l'atelier pour
  // jouer/enregistrer une mélodie qui s'inscrit dans la grille » — et,
  // au-dessus, « simplifier grandement le choix des notes »).
  //
  // POURQUOI DANS L'ATELIER, ALORS QUE LE PAD EXISTE DÉJÀ DANS LE MODE LIVE.
  // Le pad XY du Mode Live joue déjà la mélodie au doigt, mais il ne l'ÉCRIT
  // nulle part (son ⏺ REC capture de l'audio). J'avais recommandé de faire
  // l'inverse — poser l'enregistrement là-bas, l'Atelier étant la surface
  // saturée. Yann a tranché dans l'autre sens, et il a raison sur l'usage :
  // la grille est ici, un aller-retour entre deux modes n'a pas de sens pour
  // écrire quatre notes. La règle du §7.5 est tenue autrement : ce pad est un
  // panneau qu'on OUVRE, pas une barre de plus (zéro pixel fermé).
  //
  // POURQUOI SEPT TOUCHES ET PAS UN PIANO. Le modèle d'état n'est pas fait de
  // notes fixes mais de DEGRÉS de gamme 1-7 (+ octave) : un clavier de piano
  // obligerait à traduire dans les deux sens et laisserait poser des notes
  // hors gamme, que le reste de l'appli s'interdit. Sept touches, c'est
  // exactement le modèle — et sur un téléphone, sept cibles larges valent
  // mieux que douze étroites dont cinq noires.
  //
  // CE QUE ÇA REMPLACE (§7.5, règle n°1). Le choix d'une note se faisait en
  // tapant plusieurs fois sur la case : `cycleCell` fait défiler
  // silence -> 1 -> 2 … -> 7 -> silence. Poser un degré 5 coûtait 5 appuis,
  // corriger 6 en 3 en coûtait 5 de plus (il faut traverser le silence), une
  // mélodie de 4 notes ~15 appuis. Ici, une note = un appui.
  import { pattern } from '../../stores/pattern.svelte';
  import type { SynthRowName, SynthNote } from '../../model/types';
  import { chordsFor, scaleFor, stepsForLine, stepDurForLine } from '../../engine/harmony';
  import { noteNameForScaleDegree } from '../../model/presets/scales';
  import { barDuration } from '../../engine/groove';
  import { quantizeToStep } from '../../engine/quantize';
  import { latence } from '../latence.svelte';

  let {
    name,
    playing = false,
    playheadCol = -1,
    stepStartedAt = 0,
    horloge,
    cursor = $bindable(0),
    onPreview,
    onChanged,
    onClose,
  }: {
    name: 'bass' | 'melody';
    playing?: boolean;
    playheadCol?: number;
    /** `performance.now()` de l'arrivée du pas courant — sert à quantifier. */
    /* Temps AUDIO du pas courant, en millisecondes (voir AtelierView). */
    stepStartedAt?: number;
    /* L'horloge du son ENTENDU, en millisecondes — la même que `stepStartedAt`.
       Passée en fonction et non en valeur : elle doit être lue au moment de la
       FRAPPE, pas au moment du rendu. */
    horloge?: () => number;
    /** Pas visé à l'arrêt — partagé avec la grille, qui l'entoure. */
    cursor?: number;
    onPreview?: (degree: number, octave: number) => void;
    onChanged?: () => void;
    onClose?: () => void;
  } = $props();

  const row = $derived(pattern.state.synthRows[name as SynthRowName]);
  const chords = $derived(chordsFor(pattern.state));
  // Nom réel de chaque degré dans la tonalité courante (« Do », « Ré »…).
  // Un chiffre de degré ne dit rien à qui ne pense pas en degrés — or l'appli
  // CONNAÎT la tonalité et la gamme, et savait déjà nommer les notes
  // (`noteNameForScaleDegree`, utilisé pour les libellés d'accords). Le
  // chiffre reste, en petit : c'est lui qui figure dans la case de la grille,
  // les deux doivent pouvoir se raccorder.
  const noms = $derived(
    [1, 2, 3, 4, 5, 6, 7].map((d) =>
      noteNameForScaleDegree(scaleFor(pattern.state), pattern.state.synthGlobal.rootMidi, d),
    ),
  );

  // Curseur d'écriture pas-à-pas, utilisé QUAND LA LECTURE EST À L'ARRÊT.
  // Deux comportements sans bouton de mode, parce que la situation le dit
  // déjà : à l'arrêt on écrit pas à pas (le curseur avance tout seul, comme
  // une machine à écrire), en lecture on joue et ça s'enregistre là où la
  // musique en est. C'est ce que fait n'importe quelle boîte à rythmes, et ça
  // évite un troisième bouton à comprendre.
  //
  // REMONTÉ chez le parent (2026-08-17, retour de Yann : « difficile à
  // prendre en main »). Il vivait ici, donc la GRILLE ne savait pas où la
  // prochaine note allait tomber : on écrivait à l'aveugle, avec pour seul
  // repère un « pas 3 / 8 » en petit gris. Partagé, la case visée peut
  // s'entourer dans la grille, et un appui sur une case peut y amener le
  // curseur.
  const steps = $derived(stepsForLine(row));
  // Le curseur ne doit jamais désigner un pas qui n'existe plus (le nombre de
  // pas de la ligne est réglable pendant que le pad est ouvert).
  const safeCursor = $derived(steps > 0 ? cursor % steps : 0);

  // Pas visé par le prochain appui : le curseur à l'arrêt, la tête de lecture
  // pendant la lecture.
  const target = $derived(playing && playheadCol >= 0 ? playheadCol : safeCursor);

  let octave = $state(0);

  // Degrés de l'accord de nappe en cours SUR CE PAS : le pad indique lesquels
  // « tombent juste », de la même façon que le point de justesse des cases.
  // Une aide, pas une contrainte — les autres degrés restent jouables.
  const chordDegrees = $derived.by(() => {
    const s = pattern.state;
    const pad = s.synthRows.pad;
    if (!pad || pad.subdivisions <= 0) return new Set<number>();
    const barPos = (target * row.cycleBars) / Math.max(1, row.subdivisions);
    const stepBars = pad.cycleBars / pad.subdivisions;
    const inCycle = ((barPos % pad.cycleBars) + pad.cycleBars) % pad.cycleBars;
    const idx = Math.min(pad.subdivisions - 1, Math.floor(inCycle / stepBars));
    const v = pad.pattern[idx];
    const chord = typeof v === 'number' && v >= 0 ? chords[v] : null;
    return new Set((chord?.degrees ?? []).map((d) => ((d - 1) % 7) + 1));
  });

  function write(col: number, note: SynthNote | null) {
    if (col < 0 || col >= steps) return;
    row.pattern[col] = note;
    if (note === null) row.rolls[col] = 1;
    onChanged?.();
  }

  /* Pendant la lecture : on vise le pas le PLUS PROCHE, pas celui en cours.
   * La règle elle-même vit dans `engine/quantize.ts` (pur, testé) ; ici on ne
   * fait que lui donner l'horloge — et il faut la lui donner juste.
   *
   * Deux corrections, les mêmes que dans le Mode jeu :
   *   - `stepStartedAt` est désormais le temps AUDIO du pas (voir AtelierView),
   *     et `horloge()` lit la même horloge. Comparer deux horloges différentes
   *     revenait à mesurer leur écart plutôt que le geste.
   *   - `latence.ms` est le décalage d'entrée MESURÉ de l'appareil (dalle
   *     tactile, casque). Sans lui, un joueur en place mais mesuré 60 ms en
   *     retard voit sa note basculer sur le pas suivant — la faute la plus
   *     agaçante qui soit, puisqu'elle est SILENCIEUSE : rien ne dit qu'on
   *     vient d'écrire à côté.
   */
  function quantizedCol(): number {
    if (!playing || playheadCol < 0) return safeCursor;
    if (!stepStartedAt) return playheadCol;
    const maintenant = horloge?.() ?? performance.now();
    return quantizeToStep({
      playheadCol,
      elapsedMs: maintenant - stepStartedAt - latence.ms,
      stepMs: stepDurForLine(row, barDuration(pattern.state.tempo)) * 1000,
      steps,
    });
  }

  function tap(degree: number) {
    onPreview?.(degree, octave);
    const col = quantizedCol();
    write(col, { degree, octave });
    if (!playing) cursor = (safeCursor + 1) % steps;
  }

  function silence() {
    const col = quantizedCol();
    write(col, null);
    if (!playing) cursor = (safeCursor + 1) % steps;
  }

  function back() {
    cursor = (safeCursor - 1 + steps) % steps;
  }
</script>

<div class="note-pad" data-group="synth-pad">
  <div class="note-pad-head">
    <strong>Pad — {name === 'bass' ? 'Basse' : 'Mélodie'}</strong>
    <span class="where">
      {#if playing}
        enregistre en direct
      {:else}
        pas {target + 1} / {steps}
      {/if}
    </span>
    <button class="mini tap44" onclick={onClose} title="Fermer le pad">✕</button>
  </div>

  <!-- `onpointerdown` et non `onclick` (retour de Yann, 2026-08-17 : « il y a
       un petit délai entre la touche de la case et la note qui se joue »).
       Sur mobile, un `click` ne part qu'au RELÂCHEMENT du doigt : la note
       attendait qu'on lève la main. Les cases de batterie écoutaient déjà
       `onpointerdown` — l'écart était chez le pad. `preventDefault` empêche
       le click fantôme qui suivrait et jouerait la note une seconde fois. -->
  <div class="keys">
    {#each [1, 2, 3, 4, 5, 6, 7] as d (d)}
      <button
        class="key"
        class:inchord={chordDegrees.has(d)}
        onpointerdown={(e) => {
          e.preventDefault();
          tap(d);
        }}
        title={chordDegrees.has(d) ? `${noms[d - 1]} (degré ${d}) — dans l’accord en cours` : `${noms[d - 1]} (degré ${d})`}
      >
        <span class="nom">{noms[d - 1]}</span>
        <span class="deg">{d}</span>
      </button>
    {/each}
    <!-- Le silence est une TOUCHE, pas un petit bouton relégué en bas
         (retour de Yann : « difficile de supprimer une note »). Effacer est
         un geste aussi fréquent que poser : il mérite la même cible que les
         sept degrés, au même endroit, dans le même geste. -->
    <button
      class="key silence"
      onpointerdown={(e) => {
        e.preventDefault();
        silence();
      }}
      title="Effacer ce pas et avancer"
    >
      <span class="nom">∅</span>
      <span class="deg">vide</span>
    </button>
  </div>

  <div class="bar">
    <div class="oct">
      <span class="lab">Octave</span>
      {#each [-1, 0, 1] as o (o)}
        <button class="mini tap44" class:on={octave === o} onclick={() => (octave = o)}>
          {o === 0 ? '0' : o > 0 ? '+1' : '−1'}
        </button>
      {/each}
    </div>
    <div class="acts">
      <button class="mini tap44" onclick={back} disabled={playing} title="Reculer d’un pas">← pas précédent</button>
    </div>
  </div>

  <p class="hint">
    {#if playing}
      Chaque appui écrit la note sur le pas le plus proche.
    {:else}
      Chaque appui écrit une note et avance d’un pas. Lance la lecture pour jouer en direct.
    {/if}
  </p>
</div>

<style>
  .note-pad {
    border: 1px solid var(--xp-line);
    border-radius: 4px;
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-out);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 6px;
  }
  .note-pad-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--xp-size-body);
  }
  .note-pad-head strong {
    font-size: 9px;
  }
  .where {
    flex: 1;
    color: var(--xp-muted);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  /* Sept touches larges plutôt qu'un clavier : sur 390px chacune fait ~48px
     de large pour 48 de haut — bien au-delà du minimum de 24px (audit A3),
     parce qu'ici on vise vite et à répétition, pas une fois. */
  .keys {
    display: grid;
    /* minmax(0, 1fr) et non 1fr : une piste de grille a un minimum
       `auto`, donc elle refuse de descendre sous la largeur de son
       contenu — « Sol » plus son remplissage. À 320px les sept touches
       débordaient de 14px. Même piège que celui corrigé sur XpSlider
       (audit A2), côté grille plutôt que flexbox. */
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 4px;
  }
  .key {
    min-height: 48px;
    border: 1px solid var(--xp-line);
    border-radius: 4px;
    background: var(--xp-btn-face);
    box-shadow: var(--xp-bevel-out);
    font-family: var(--xp-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--xp-text);
    cursor: pointer;
    touch-action: manipulation;
    /* Aucun remplissage horizontal : le libellé est centré, le remplissage
       ne servait qu'à rogner la place disponible pour « Sol ». */
    padding: 2px 0;
  }
  .key:active {
    box-shadow: var(--xp-bevel-in);
  }
  .key .nom {
    display: block;
    font-size: 11px;
    line-height: 1.1;
  }
  /* Sur téléphone, sept noms de note ne tiennent qu'en resserrant. Seuil à
     400px et pas 360 : à 360 pile, « Sol » débordait encore de 3px de sa
     touche — mesuré, pas supposé. Seul l'horizontal est resserré, la HAUTEUR
     de cible reste à 48px (audit A3). */
  @media (max-width: 399px) {
    .keys {
      gap: 3px;
    }
    .key .nom {
      font-size: 12.5px;
    }
  }
  /* Le degré reste lisible mais s'efface : c'est le nom qu'on cherche en
     jouant, le chiffre sert à retrouver la case correspondante dans la
     grille, qui affiche le degré. */
  .key .deg {
    display: block;
    font-size: 9.5px;
    font-weight: 400;
    color: var(--xp-muted);
    line-height: 1.1;
  }
  /* Degré appartenant à l'accord en cours : même information que le point de
     justesse des cases, au moment où elle sert — avant de poser la note. */
  /* Le silence se distingue des degrés sans crier : c'est une touche du même
     format, mais neutre — elle ne joue rien. */
  .key.silence {
    background: var(--xp-btn-face);
    border-style: dashed;
    color: var(--xp-muted);
  }
  .key.inchord {
    background: color-mix(in srgb, var(--cell-melody) 34%, var(--xp-face));
    border-color: color-mix(in srgb, var(--cell-melody) 60%, var(--xp-line));
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .oct,
  .acts {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .acts {
    margin-left: auto;
  }
  .lab {
    font-size: 9px;
    color: var(--xp-muted);
  }
  .mini {
    min-height: 26px;
    padding: 2px 8px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-btn-face);
    box-shadow: var(--xp-bevel-out);
    font-family: inherit;
    font-size: 9px;
    color: var(--xp-text);
    cursor: pointer;
  }
  .mini.on {
    box-shadow: var(--xp-bevel-in);
    font-weight: 700;
  }
  .mini:disabled {
    color: var(--xp-muted);
    cursor: not-allowed;
  }
  .hint {
    margin: 0;
    font-size: var(--xp-size-small);
    color: var(--xp-muted);
  }
  /* Chantier tactile (cf. styles/global.css) : les enveloppes invisibles de
     `.tap44` se marchent dessus dès que deux commandes sont voisines à
     quelques pixels. On écarte sous pointeur grossier — l'espace n'est pas
     du dessin, et sur un téléphone la page défile de toute façon. */
  @media (pointer: coarse) {
    .mini {
      margin: 6px;
    }
  }
</style>
