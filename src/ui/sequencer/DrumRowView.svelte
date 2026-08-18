<script lang="ts">
  // Une ligne drum : grille linéaire + réglages. Contrairement à l'original
  // (innerHTML + listeners reconstruits à chaque clic), Svelte ne re-rend que
  // la cellule touchée. Clic = cycle d'état ; clic droit / long-press = rafale.
  import { pattern } from '../../stores/pattern.svelte';
  import type { DrumRowName, DrumStep } from '../../model/types';
  import XpSlider from '../xp/XpSlider.svelte';
  import { history } from '../../stores/history.svelte';
  import { applyEuclideanRhythm } from '../../engine/generators';

  let {
    name,
    label,
    playheadCol = -1,
    onPreview,
    onFxChanged,
  }: {
    name: DrumRowName;
    label: string;
    playheadCol?: number;
    onPreview?: (name: DrumRowName, stepState: number) => void;
    onFxChanged?: () => void;
  } = $props();

  let openGroups = $state({ sequence: false, timbre: false, space: false });

  const row = $derived(pattern.state.rows[name]);
  // snare/hat = 3 états (normal/rim, fermé/ouvert) ; kick/clap/shaker = binaire
  const maxState = $derived(name === 'snare' || name === 'hat' ? 2 : 1);

  // Générateur euclidien (PLAN.md §6) : nombre de coups à répartir, réglage
  // ponctuel comme fillRate côté Synthé (SynthModule.svelte) — pas un champ
  // du pattern, recalculé à chaque appui sur Répartir.
  let euclidPulses = $state(4);
  function applyEuclid() {
    history.push();
    applyEuclideanRhythm(pattern.state, name, euclidPulses);
  }

  function cycleCell(col: number) {
    history.push();
    const cur = row.pattern[col];
    const next = ((cur + 1) % (maxState + 1)) as DrumStep;
    row.pattern[col] = next;
    if (next === 0) row.rolls[col] = 1;
    if (next > 0) onPreview?.(name, next);
  }

  // Anti double-rafale : sur mobile, un appui long déclenche à la fois notre
  // minuteur JS ET le contextmenu natif du navigateur pour le même geste —
  // sans garde, la rafale avancerait deux fois d'un coup (même souci que
  // StepCircle.svelte, ROLL_DEBOUNCE_MS).
  const ROLL_DEBOUNCE_MS = 350;
  let lastRollAt = 0;
  function bumpRoll(col: number) {
    const now = Date.now();
    if (now - lastRollAt < ROLL_DEBOUNCE_MS) return;
    lastRollAt = now;
    if (row.pattern[col] > 0) row.rolls[col] = (row.rolls[col] % 4) + 1;
  }

  function cycleRoll(col: number, e: Event) {
    e.preventDefault();
    bumpRoll(col);
  }

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  function pressStart(col: number, e: PointerEvent) {
    // Clic droit : uniquement géré par oncontextmenu (cycleRoll). Sans ce
    // garde-fou, le pointerup qui suit le clic droit relance aussi
    // cycleCell via pressEnd — la rafale ET l'état de la case avancaient
    // en même temps sur un simple clic droit.
    if (e.button === 2) return;
    longPressTimer = setTimeout(() => {
      bumpRoll(col);
      longPressTimer = null;
    }, 480);
  }
  function pressEnd(col: number, fire: boolean) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (fire) cycleCell(col);
    }
  }
</script>

<div class="drum-row">
  <div class="row-head">
    <span class="row-label" style:--row-color="var(--cell-{name})">{label}</span>
    <button
      class="mute"
      class:muted={row.muted}
      title={row.muted ? 'Réactiver' : 'Couper'}
      onclick={() => (row.muted = !row.muted)}>{row.muted ? '🔇' : '🔊'}</button
    >
  </div>
  <!-- `beat-grid` (audit A5, styles dans styles/global.css) : une ligne drum
       couvre toujours exactement une mesure de 4 temps, d'où --bars:1 et
       --beats:4 — les repères tombent aux mêmes x sur toutes les lignes,
       même quand leurs cases ne s'alignent pas. -->
  <div class="cells beat-grid" style:--cols={row.subdiv} style:--bars="1" style:--beats="4">
    {#each { length: row.subdiv } as _, col (col)}
      {@const state = row.pattern[col]}
      {@const roll = row.rolls[col]}
      <button
        class="cell state-{state} {name}"
        class:playing={playheadCol === col}
        onpointerdown={(e) => pressStart(col, e)}
        onpointerup={() => pressEnd(col, true)}
        onpointerleave={() => pressEnd(col, false)}
        oncontextmenu={(e) => cycleRoll(col, e)}
        title="Clic : activer/changer — clic droit ou appui long : rafale ×{roll}"
      >
        {#if state === 2}<span class="alt">{name === 'snare' ? 'R' : 'O'}</span>{/if}
        {#if roll > 1}<span class="roll">×{roll}</span>{/if}
      </button>
    {/each}
  </div>
  <!-- Chaque groupe se déploie toujours indépendamment (retour de Yann), mais
       les trois `<fieldset>` empilés sont devenus UNE rangée de pastilles
       (audit A4) : replié, un fieldset dessinait quand même un rectangle
       pleine largeur pour ne contenir qu'un mot de légende — trois bandes
       vides par ligne, quinze sur l'onglet Rythme, au milieu desquelles les
       cases du séquenceur se perdaient. Une rangée au lieu de trois bandes,
       et le panneau ne prend de la place que lorsqu'il est réellement
       ouvert. `data-group` reste sur le conteneur des curseurs : l'aide à la
       production le retrouve par `closest()` exactement comme avant. -->
  <div class="group-bar">
    <button class="chip" class:on={openGroups.sequence} aria-expanded={openGroups.sequence}
      onclick={() => (openGroups.sequence = !openGroups.sequence)}>Séquence</button>
    <button class="chip" class:on={openGroups.timbre} aria-expanded={openGroups.timbre}
      onclick={() => (openGroups.timbre = !openGroups.timbre)}>Timbre</button>
    <button class="chip" class:on={openGroups.space} aria-expanded={openGroups.space}
      onclick={() => (openGroups.space = !openGroups.space)}>Filtre &amp; espace</button>
  </div>
  {#if openGroups.sequence}
    <div class="group-panel" data-group="drum-sequence">
      <XpSlider label="Pas" min={1} max={32} bind:value={row.subdiv} />
      <XpSlider label="Décalage" min={-50} max={50} unit="%" bind:value={row.shiftPct} />
      <XpSlider label="Volume" min={0} max={100} unit="%"
        value={Math.round(row.volume * 100)}
        onchange={(v) => (row.volume = v / 100)} />
      <div class="euclid-row">
        <XpSlider label="Coups euclidiens" min={1} max={row.subdiv} bind:value={euclidPulses} />
        <button
          class="xp-btn tiny"
          onclick={applyEuclid}
          title="Répartit ce nombre de coups le plus uniformément possible sur les pas — remplace le contenu de la ligne"
        >
          🔵 Répartir
        </button>
      </div>
    </div>
  {/if}
  {#if openGroups.timbre}
    <div class="group-panel" data-group="drum-timbre">
      <XpSlider label="Pitch" min={-24} max={24} unit=" ½t" bind:value={row.pitch} />
      <XpSlider label="Attaque" min={0} max={100} bind:value={row.attack} />
      <XpSlider label="Decay" min={-50} max={50} bind:value={row.decay} />
      <XpSlider label="Tone" min={-100} max={100} bind:value={row.tone} />
    </div>
  {/if}
  {#if openGroups.space}
    <div class="group-panel" data-group="drum-filtre">
      <XpSlider label="Filtre passe-bas" min={200} max={20000} step={100} unit=" Hz"
        bind:value={row.filterCutoff} />
      <XpSlider label="Réverbe" min={0} max={100} unit="%"
        value={Math.round(row.reverbSend * 100)}
        onchange={(v) => { row.reverbSend = v / 100; onFxChanged?.(); }} />
      <XpSlider label="Delay" min={0} max={100} unit="%"
        value={Math.round(row.delaySend * 100)}
        onchange={(v) => { row.delaySend = v / 100; onFxChanged?.(); }} />
    </div>
  {/if}
</div>

<style>
  .drum-row {
    margin-bottom: 12px;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .row-label {
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--row-color, var(--xp-text));
  }
  /* 29×18px avant l'audit A3 — un bouton qu'on vise en pleine composition,
     ramené à une vraie cible carrée. */
  .mute {
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-out);
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
    min-width: 32px;
    min-height: 28px;
    line-height: 1;
  }
  .mute.muted {
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-face-dark);
  }
  .cells {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 3px;
  }
  .cell {
    position: relative;
    height: 34px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-in);
    cursor: pointer;
    padding: 0;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .cell:active {
    box-shadow: var(--xp-bevel-out);
  }
  .cell.playing {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  /* Le relief s'INVERSE par rapport à l'ancienne lecture XP (« actif = bouton
     enfoncé »). Ici un pas actif émet : il est bombé, la lumière passe en haut
     à gauche. Un pas vide reste creusé — c'est un trou, pas un bouton pâle.
     C'est le reproche n°1 de l'audit de design, et le cœur de la direction. */
  .cell.state-1,
  .cell.state-2 {
    box-shadow: var(--xp-bevel-out);
  }
  .cell.kick.state-1 {
    background: var(--cell-kick);
  }
  .cell.snare.state-1 {
    background: var(--cell-snare);
  }
  .cell.snare.state-2 {
    background: color-mix(in srgb, var(--cell-snare) 45%, var(--xp-lcd-bg));
  }
  .cell.hat.state-1 {
    background: var(--cell-hat);
  }
  .cell.hat.state-2 {
    background: color-mix(in srgb, var(--cell-hat) 45%, var(--xp-lcd-bg));
  }
  .cell.clap.state-1 {
    background: var(--cell-clap);
  }
  .cell.shaker.state-1 {
    background: var(--cell-shaker);
  }
  /* Cases VIDES teintées par ligne (au lieu d'un gris neutre partagé) — port
     de #rowKick/#rowSnare/#rowHat .cell:not(.active) de l'original
     (l. 759-761) : même quand rien n'est posé, on voit quelle ligne est
     quelle rien qu'à la couleur. */
  .cell.kick.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-kick) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-kick) 9%, var(--xp-lcd-bg))
    );
    border-color: color-mix(in srgb, var(--cell-kick) 30%, var(--xp-line));
  }
  .cell.snare.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-snare) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-snare) 9%, var(--xp-lcd-bg))
    );
    border-color: color-mix(in srgb, var(--cell-snare) 30%, var(--xp-line));
  }
  .cell.hat.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-hat) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-hat) 9%, var(--xp-lcd-bg))
    );
    border-color: color-mix(in srgb, var(--cell-hat) 30%, var(--xp-line));
  }
  .cell.clap.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-clap) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-clap) 9%, var(--xp-lcd-bg))
    );
    border-color: color-mix(in srgb, var(--cell-clap) 30%, var(--xp-line));
  }
  .cell.shaker.state-0 {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-shaker) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-shaker) 9%, var(--xp-lcd-bg))
    );
    border-color: color-mix(in srgb, var(--cell-shaker) 30%, var(--xp-line));
  }
  .alt {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 12px;
    color: var(--xp-lcd-bg);
  }
  .roll {
    position: absolute;
    right: 2px;
    bottom: 1px;
    font-size: 9px;
    font-family: var(--xp-mono);
    color: var(--xp-lcd);
    background: rgba(0, 0, 0, 0.55);
    border-radius: 2px;
    padding: 0 2px;
  }
  /* Rangée de pastilles (audit A4) : remplace trois `<fieldset>` repliés
     pleine largeur. Cible tactile conservée à 28px (audit A3). */
  .group-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 5px 0 0;
  }
  .chip {
    font-family: inherit;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    min-height: 28px;
    padding: 6px 10px;
    border: 1px solid color-mix(in srgb, var(--xp-accent-amber) 40%, var(--xp-line));
    border-radius: 13px;
    background: var(--xp-btn-face);
    color: var(--xp-accent-amber);
    cursor: pointer;
    box-shadow: var(--xp-bevel-out);
  }
  .chip.on {
    background: var(--xp-accent-amber);
    border-color: var(--xp-accent-amber);
    color: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-in);
  }
  .group-panel {
    border: 1px solid var(--xp-line);
    border-top: 2px solid var(--xp-accent-amber);
    background: color-mix(in srgb, var(--xp-accent-amber) 6%, transparent);
    margin: 4px 0 0;
    padding: 5px 7px;
  }
  /* Le bouton « 🔵 Répartir » portait `class="xp-btn tiny"` alors que ce
     fichier ne définissait NI l'un NI l'autre : le style de `.xp-btn` est
     redéfini localement dans six composants (AtelierView, SynthRowView,
     GameView, ExportBar, PresetPicker, SequenceBank) et le CSS de Svelte
     étant scopé par composant, aucun ne l'atteignait ici — le bouton
     tombait sur le rendu natif du navigateur. Repéré en mesurant les
     cibles tactiles (audit A3). Styles alignés sur ceux de
     `SynthRowView`, avec la hauteur de cible en plus.
     À noter pour plus tard : c'est exactement le composant `XpButton`
     prévu au §2 du plan et jamais construit (voir aussi C6). */
  /* Apparence dans styles/global.css ; ici, la taille seule. */
  .xp-btn {
    padding: 4px 12px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.tiny {
    font-size: 11px;
    padding: 6px 10px;
    min-height: 28px;
    line-height: 1;
    white-space: nowrap;
  }
  .euclid-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /* Cible l'enveloppe, devenue la racine de XpSlider depuis qu'il porte
     une requête de conteneur (audit A2) — c'est elle l'enfant flex ici. */
  .euclid-row :global(.xp-slider-outer) {
    flex: 1;
    min-width: 0;
  }
</style>
