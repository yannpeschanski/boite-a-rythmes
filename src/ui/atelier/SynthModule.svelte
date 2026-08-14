<script lang="ts">
  // Module Synthé : harmonie générative, les 3 lignes, arpégiateur de nappe,
  // sidechain, réglages globaux réverbe/delay.
  import { pattern } from '../../stores/pattern.svelte';
  import { SCALE_LIBRARY } from '../../model/presets/scales';
  import { ROOT_NOTE_NAMES } from '../../model/presets/scales';
  import { chordsFor } from '../../engine/harmony';
  import { randomizeSynth, randomizePad, randomizePitchedLine, translatePadArpToMelody } from '../../engine/generators';
  import type { SynthRowName } from '../../model/types';
  import XpWindow from '../xp/XpWindow.svelte';
  import XpSlider from '../xp/XpSlider.svelte';
  import SynthRowView from '../sequencer/SynthRowView.svelte';

  let {
    playhead,
    onFxChanged,
    onTest,
  }: {
    playhead: Record<SynthRowName, number>;
    onFxChanged?: () => void;
    onTest?: (name: SynthRowName) => void;
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

  function translateArpToMelody() {
    translatePadArpToMelody(st, Math.random);
  }
</script>

<XpWindow title="Synthé — Basse / Nappe / Mélodie" icon="🎹" accent="violet">
  <div class="harmony" data-group="synth-harmonie">
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

  {#each [['bass', 'Basse'], ['pad', 'Nappe'], ['melody', 'Mélodie']] as [name, label] (name)}
    <div class="line-block">
      <button class="xp-btn tiny" onclick={() => randomLine(name as SynthRowName)} title="Remplir cette ligne seulement">🎲</button>
      <SynthRowView
        name={name as SynthRowName}
        {label}
        playheadCol={playhead[name as SynthRowName]}
        onChanged={onFxChanged}
        {onTest}
      />
    </div>
  {/each}

  <fieldset data-group="synth-arpege">
    <legend>Arpégiateur de nappe</legend>
    <label class="chk"><input type="checkbox" bind:checked={sg.padArpEnabled} /> Actif</label>
    <label>
      Motif
      <select bind:value={sg.padArpPattern}>
        <option value="up">Montant</option>
        <option value="down">Descendant</option>
        <option value="updown">Montant-descendant</option>
        <option value="random">Aléatoire</option>
      </select>
    </label>
    <label>
      Vitesse
      <select bind:value={sg.padArpRate}>
        <option value="2">2 notes / pas</option>
        <option value="4">4 notes / pas</option>
        <option value="8">8 notes / pas</option>
      </select>
    </label>
    <button
      class="xp-btn tiny"
      onclick={translateArpToMelody}
      title="Écrit l'arpège actuel comme de vraies notes sur la ligne Mélodie — remplace son contenu"
    >
      ✍️ Traduire l'arpège en Mélodie
    </button>
  </fieldset>

  <fieldset data-group="synth-drone">
    <legend>Bourdon de nappe</legend>
    <label class="chk"><input type="checkbox" bind:checked={sg.padDroneEnabled} /> Actif</label>
    <p class="hint">
      La Nappe devient un son tenu en continu, qui ne s'arrête jamais : un seul accord programmé
      sur sa grille = un drone fixe ; plusieurs accords = le même son qui glisse de l'un à l'autre
      au lieu de rejouer une nouvelle note à chaque fois. Cycle et pas de la ligne Nappe gardent
      leur effet habituel, c'est juste la façon dont le son est produit qui change.
    </p>
  </fieldset>

  <fieldset data-group="synth-sidechain">
    <legend>Sidechain — le synthé « respire » avec la batterie</legend>
    <div class="chk-row">
      <span>Déclencheurs :</span>
      <label class="chk"><input type="checkbox" bind:checked={sg.sidechainTriggerKick} /> Kick</label>
      <label class="chk"><input type="checkbox" bind:checked={sg.sidechainTriggerSnare} /> Snare</label>
    </div>
    <div class="chk-row">
      <span>Cibles :</span>
      <label class="chk"><input type="checkbox" bind:checked={sg.sidechainTargetBass} /> Basse</label>
      <label class="chk"><input type="checkbox" bind:checked={sg.sidechainTargetPad} /> Nappe</label>
      <label class="chk"><input type="checkbox" bind:checked={sg.sidechainTargetMelody} /> Mélodie</label>
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
  .fill-bar :global(.xp-slider) {
    min-width: 220px;
  }
  .chords {
    font-family: var(--xp-mono);
    font-size: 11px;
    color: var(--xp-muted);
  }
  .hint {
    font-size: 11px;
    color: var(--xp-muted);
    margin: 4px 0 0;
  }
  label {
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  select {
    font-family: var(--xp-font);
    font-size: 12px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
  .xp-btn {
    padding: 4px 12px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-size: 12px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.tiny {
    font-size: 11px;
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
    font-size: 11px;
    font-weight: 700;
    color: var(--xp-accent-violet);
  }
  .chk,
  .chk-row {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
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
</style>
