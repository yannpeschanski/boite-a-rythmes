<script lang="ts">
  // Module Synthé : harmonie générative, les 3 lignes (arpège/bourdon en
  // sous-catégories de la Nappe, voir SynthRowView), sidechain, réglages
  // globaux réverbe/delay.
  import { pattern } from '../../stores/pattern.svelte';
  import { SCALE_LIBRARY } from '../../model/presets/scales';
  import { ROOT_NOTE_NAMES } from '../../model/presets/scales';
  import { chordsFor } from '../../engine/harmony';
  import { randomizeSynth, randomizePad, randomizePitchedLine } from '../../engine/generators';
  import type { SynthRowName } from '../../model/types';
  import XpWindow from '../xp/XpWindow.svelte';
  import XpSlider from '../xp/XpSlider.svelte';
  import SynthRowView from '../sequencer/SynthRowView.svelte';

  let {
    playhead,
    playing = false,
    stepAt,
    horloge,
    onPreviewDegree,
    onPreviewChord,
    onCalibrer,
    onFxChanged,
  }: {
    playhead: Record<SynthRowName, number>;
    /** Lecture en cours : décide si le pad écrit pas-à-pas ou en direct. */
    playing?: boolean;
    /** `performance.now()` de l'arrivée du pas courant, par ligne. */
    stepAt?: Record<SynthRowName, number>;
    horloge?: () => number;
    onPreviewDegree?: (name: 'bass' | 'melody', degree: number, octave: number) => void;
    onPreviewChord?: (chordIdx: number) => void;
    onCalibrer?: () => void;
    onFxChanged?: () => void;
  } = $props();

  const st = $derived(pattern.state);
  const sg = $derived(pattern.state.synthGlobal);
  const chords = $derived(chordsFor(pattern.state));

  // Taux de remplissage : les 3 lignes suivent le même curseur, avec les
  // proportions relatives d'origine (basse plus clairsemée, mélodie plus dense).
  let fillRate = $state(65);

  function randomAll() {
    randomizeSynth(st, fillRate / 100, Math.random);
  }
  // Random par ligne : ne réaligne pas les cycles (contrairement au bouton
  // global) — on retire juste les notes de CETTE ligne.
  function randomLine(name: SynthRowName) {
    if (name === 'pad') randomizePad(st, fillRate / 100, Math.random);
    else if (name === 'bass') randomizePitchedLine(st, 'bass', (fillRate / 100) * 0.75, 0.85, Math.random);
    else randomizePitchedLine(st, 'melody', fillRate / 100, 0.7, Math.random);
  }

</script>

<XpWindow title="Synthé — Basse / Nappe / Mélodie" icon="🎹" accent="violet">
  {#each [['bass', 'Basse'], ['pad', 'Nappe'], ['melody', 'Mélodie']] as [name, label] (name)}
    <div class="line-block">
      <button class="xp-btn tiny" onclick={() => randomLine(name as SynthRowName)} title="Remplir cette ligne seulement">🎲</button>
      <SynthRowView
        name={name as SynthRowName}
        {label}
        playheadCol={playhead[name as SynthRowName]}
        {playing}
        stepStartedAt={stepAt?.[name as SynthRowName] ?? 0}
        {horloge}
        {onPreviewDegree}
        {onPreviewChord}
        {onCalibrer}
        onChanged={onFxChanged}
      />
    </div>
  {/each}

  <!-- Harmonie et remplissage DESCENDUS sous les trois lignes (retour de
       Yann, 2026-08-17 : « tonalité, nb de notes, ça peut descendre dans une
       partie plus bas »). Ils occupaient 146px en tête d'un onglet qui en
       comptait 561 avant la première case jouable — soit 66 % du premier
       écran de téléphone, là où l'onglet Rythme est à 32 %.
       Ils restent GLOBAUX (ils gouvernent les trois lignes à la fois, voir
       `chordsFor`) : les descendre SOUS le séquenceur, comme le tempo au 2e
       lot, plutôt que DANS une ligne, qui mentirait sur leur portée. -->
  <fieldset data-group="synth-harmonie">
    <legend>Harmonie &amp; remplissage</legend>
  <div class="harmony">
    <label>
      Tonalité
      <select bind:value={sg.rootMidi}>
        {#each ROOT_NOTE_NAMES as n, i (n)}<option value={60 + i}>{n}</option>{/each}
      </select>
    </label>
    <label>
      Mode
      <select bind:value={sg.scaleId}>
        {#each SCALE_LIBRARY as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
      </select>
    </label>
    <XpSlider label="Nb d'accords" min={4} max={7} bind:value={sg.chordCount} />
    <span class="chords">{chords.map((c) => c.roman).join(' · ')}</span>
  </div>

  <div class="fill-bar">
    <XpSlider label="Taux de remplissage" min={0} max={100} unit="%" bind:value={fillRate} />
    <button class="xp-btn" onclick={randomAll}>🎲 Remplissage aléatoire harmonieux</button>
  </div>
  </fieldset>


  <fieldset data-group="synth-sidechain">
    <legend>Sidechain — le synthé « respire » avec la batterie</legend>
    <div class="chk-row">
      <span>Déclencheurs :</span>
      <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.sidechainTriggerKick} /> Kick</label>
      <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.sidechainTriggerSnare} /> Snare</label>
    </div>
    <div class="chk-row">
      <span>Cibles :</span>
      <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.sidechainTargetBass} /> Basse</label>
      <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.sidechainTargetPad} /> Nappe</label>
      <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.sidechainTargetMelody} /> Mélodie</label>
    </div>
    <div class="two-col">
      <XpSlider label="Profondeur" min={0} max={100} unit="%" bind:value={sg.sidechainDepth} />
      <XpSlider label="Retour" min={20} max={600} unit=" ms" step={10} bind:value={sg.sidechainRelease} />
    </div>
  </fieldset>

  <fieldset data-group="synth-groove">
    <legend>Groove synthé & espace</legend>
    <div class="two-col">
      <XpSlider label="Swing synthé" min={0} max={75} unit="%" bind:value={st.synthSwing} />
      <XpSlider label="Traîne synthé" min={0} max={30} unit="%" bind:value={st.synthDrag} />
      <XpSlider label="Taille réverbe" min={0} max={100} unit="%" bind:value={sg.reverbSize} onchange={onFxChanged} />
      <XpSlider label="Feedback delay" min={0} max={90} unit="%" bind:value={sg.delayFeedback} onchange={onFxChanged} />
    </div>
    <label>
      Division du delay
      <select bind:value={sg.delayDivision} onchange={() => onFxChanged?.()}>
        <option value="0.25">1/16</option>
        <option value="0.5">1/8</option>
        <option value="0.75">croche pointée</option>
        <option value="1">1/4</option>
      </select>
    </label>
  </fieldset>
</XpWindow>

<style>
  .harmony,
  .fill-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
  }
  /* Le curseur prend une ligne entière quand la rangée est trop étroite
     pour lui, au lieu de se tasser à côté des deux listes déroulantes. */
  .harmony :global(.xp-slider-outer) {
    flex: 1 1 200px;
  }
  /* Cible l'enveloppe, devenue la racine de XpSlider depuis qu'il porte
     une requête de conteneur (audit A2). */
  .fill-bar :global(.xp-slider-outer) {
    min-width: 220px;
    flex: 1;
  }
  .chords {
    font-family: var(--xp-mono);
    font-size: 9px;
    color: var(--xp-muted);
  }
  label {
    font-size: var(--xp-size-body);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  select {
    font-family: var(--xp-font);
    font-size: var(--xp-size-body);
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  /* Apparence dans styles/global.css ; ici, la taille seule. */
  .xp-btn {
    padding: 4px 12px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.tiny {
    font-size: var(--xp-size-small);
    padding: 1px 6px;
    float: right;
  }
  .line-block {
    border-top: 1px dashed var(--xp-line);
    padding-top: 5px;
  }
  fieldset {
    border: 1px solid var(--xp-line);
    margin: 5px 0;
    padding: 4px 6px;
  }
  legend {
    font-size: 9px;
    font-weight: 700;
    color: var(--xp-accent-violet);
  }
  .chk,
  .chk-row {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: var(--xp-size-body);
    margin-right: 10px;
  }
  .chk-row {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 2px;
  }
  .two-col {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    gap: 0 10px;
  }
  /* Chantier tactile (cf. styles/global.css) : les enveloppes invisibles de
     `.tap44` se marchent dessus dès que deux commandes sont voisines à
     quelques pixels. On écarte sous pointeur grossier — l'espace n'est pas
     du dessin, et sur un téléphone la page défile de toute façon. */
  @media (pointer: coarse) {
    .chk,
    .chk-row {
      gap: 12px;
    }
    .chk {
      margin: 9px 10px 9px 0;
    }
    .chk-row {
      margin-bottom: 12px;
    }
  }
</style>
