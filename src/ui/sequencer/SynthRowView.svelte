<script lang="ts">
  // Une ligne synthé (Basse / Nappe / Mélodie). Un seul composant instancié
  // 3 fois — remplace les ~24 lignes de HTML triplées à la main de l'original.
  //
  // Modèle par DEGRÉS de gamme, pas par notes fixes : basse/mélodie portent
  // {degree 1-7, octave -1/0/+1}, la nappe un index d'accord (ou -1).
  // L'indicateur de justesse (point vert = note de l'accord en cours, ambre =
  // note de passage) est purement informatif.
  import { pattern } from '../../stores/pattern.svelte';
  import type { SynthRowName, SynthNote } from '../../model/types';
  import { chordsFor, justesseForStep } from '../../engine/harmony';
  import { SYNTH_VOICE_PRESETS } from '../../model/presets/voices';
  import XpSlider from '../xp/XpSlider.svelte';
  import FilterCurve from './FilterCurve.svelte';

  let {
    name,
    label,
    playheadCol = -1,
    onChanged,
    onTest,
  }: {
    name: SynthRowName;
    label: string;
    playheadCol?: number;
    onChanged?: () => void;
    onTest?: (name: SynthRowName) => void;
  } = $props();

  const row = $derived(pattern.state.synthRows[name]);
  const chords = $derived(chordsFor(pattern.state));
  const isPad = $derived(name === 'pad');
  const voicePresets = $derived(SYNTH_VOICE_PRESETS[name] ?? []);
  // Couleurs d'aperçu par ligne — mêmes teintes que SYNTH_WAVE_COLORS de
  // l'original (boite-a-rythme-69.html l. 2617).
  const PREVIEW_COLOR: Record<SynthRowName, string> = {
    bass: '#6a7bff',
    pad: '#b06bff',
    melody: '#ff6bd6',
  };

  let showSettings = $state(false);

  // Regroupement par paquets de 8 au-delà de 8 pas (port de
  // renderPacketizedRow) : une grille de 128 notes d'un bloc est illisible.
  const PACKET_SIZE = 8;
  const PACKET_THRESHOLD = 8;
  let openPacket = $state(0);
  const packetCount = $derived(Math.ceil(row.subdivisions / PACKET_SIZE));
  const packetized = $derived(row.subdivisions > PACKET_THRESHOLD);
  const visibleCols = $derived.by(() => {
    if (!packetized) return Array.from({ length: row.subdivisions }, (_, i) => i);
    const start = openPacket * PACKET_SIZE;
    return Array.from({ length: Math.min(PACKET_SIZE, row.subdivisions - start) }, (_, i) => start + i);
  });

  function cycleCell(col: number) {
    if (isPad) {
      // Nappe : -1 (silence) puis les accords disponibles, en boucle.
      const cur = row.pattern[col];
      const idx = typeof cur === 'number' ? cur : -1;
      row.pattern[col] = idx + 1 >= chords.length ? -1 : idx + 1;
    } else {
      // Basse/Mélodie : silence -> degré 1..7 -> silence.
      const cur = row.pattern[col] as SynthNote | null;
      if (!cur) row.pattern[col] = { degree: 1, octave: 0 };
      else if (cur.degree >= 7) row.pattern[col] = null;
      else row.pattern[col] = { degree: cur.degree + 1, octave: cur.octave };
    }
    if (row.pattern[col] === null || row.pattern[col] === -1) row.rolls[col] = 1;
    onChanged?.();
  }

  function cycleRoll(col: number, e: Event) {
    e.preventDefault();
    const v = row.pattern[col];
    const active = isPad ? typeof v === 'number' && v >= 0 : v != null;
    if (active) row.rolls[col] = (row.rolls[col] % 4) + 1;
  }

  function shiftOctave(col: number, delta: number, e: Event) {
    e.stopPropagation();
    const cur = row.pattern[col] as SynthNote | null;
    if (!cur) return;
    row.pattern[col] = { degree: cur.degree, octave: Math.max(-1, Math.min(1, cur.octave + delta)) };
  }

  function cellLabel(col: number): string {
    const v = row.pattern[col];
    if (isPad) return typeof v === 'number' && v >= 0 ? chords[v]?.roman ?? '?' : '·';
    const n = v as SynthNote | null;
    return n ? String(n.degree) : '·';
  }

  function applyVoicePreset(id: string) {
    const p = voicePresets.find((v: { id: string }) => v.id === id);
    if (p) row.voice = { ...row.voice, ...p.voice };
  }

  function resize(cols: number) {
    const n = Math.max(1, Math.round(cols));
    const fill = isPad ? -1 : null;
    const pat = new Array(n).fill(fill);
    const rolls = new Array(n).fill(1);
    for (let i = 0; i < Math.min(n, row.pattern.length); i++) pat[i] = row.pattern[i];
    for (let i = 0; i < Math.min(n, row.rolls.length); i++) rolls[i] = row.rolls[i];
    row.subdivisions = n;
    row.pattern = pat;
    row.rolls = rolls;
    if (openPacket >= Math.ceil(n / PACKET_SIZE)) openPacket = 0;
  }
</script>

<div class="synth-row">
  <div class="row-head">
    <span class="row-label">{label}</span>
    <button class="mini" class:on={row.muted} onclick={() => (row.muted = !row.muted)}>
      {row.muted ? '🔇' : '🔊'}
    </button>
    <select
      class="voice-select"
      onchange={(e) => applyVoicePreset((e.currentTarget as HTMLSelectElement).value)}
    >
      <option value="">— Voix…</option>
      {#each voicePresets as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
    </select>
    <button class="mini test" onclick={() => onTest?.(name)} title="Joue la voix actuelle de cette ligne">▶ Tester</button>
    <div class="preview"><FilterCurve voice={row.voice} color={PREVIEW_COLOR[name]} /></div>
  </div>

  {#if packetized}
    <div class="packets">
      {#each { length: packetCount } as _, p (p)}
        <button class="mini" class:on={openPacket === p} onclick={() => (openPacket = p)}>
          {p * PACKET_SIZE + 1}–{Math.min((p + 1) * PACKET_SIZE, row.subdivisions)}
        </button>
      {/each}
    </div>
  {/if}

  <div class="cells" style:--cols={visibleCols.length}>
    {#each visibleCols as col (col)}
      {@const v = row.pattern[col]}
      {@const active = isPad ? typeof v === 'number' && v >= 0 : v != null}
      {@const just = isPad ? null : justesseForStep(pattern.state, chords, row, col, v as SynthNote | null)}
      <div class="cell-wrap">
        <button
          class="cell {name}"
          class:active
          class:playing={playheadCol === col}
          onclick={() => cycleCell(col)}
          oncontextmenu={(e) => cycleRoll(col, e)}
          title="Clic : note suivante — clic droit : rafale"
        >
          <span class="lbl">{cellLabel(col)}</span>
          {#if just}<span class="just {just}"></span>{/if}
          {#if row.rolls[col] > 1}<span class="roll">×{row.rolls[col]}</span>{/if}
        </button>
        {#if !isPad && active}
          <div class="oct">
            <button class="octbtn" onclick={(e) => shiftOctave(col, 1, e)} title="Octave +">▲</button>
            <button class="octbtn" onclick={(e) => shiftOctave(col, -1, e)} title="Octave −">▼</button>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <button class="more" onclick={() => (showSettings = !showSettings)}>
    {showSettings ? '▾' : '▸'} ⚙️ Réglages
  </button>
  {#if showSettings}
    <!-- Un paramètre par ligne plutôt que compressé en 2 colonnes : ce
         panneau n'est visible qu'une fois déployé, pas de pression d'espace
         comme sur les curseurs toujours affichés (retour de Yann). Regroupé
         par encarts cohérents plutôt qu'une liste plate. -->
    <fieldset>
      <legend>Séquence</legend>
      <XpSlider label="Cycles (mesures)" min={1} max={16} value={row.cycleBars}
        onchange={(v) => (row.cycleBars = v)} />
      <XpSlider label="Notes du cycle" min={1} max={128} value={row.subdivisions} onchange={resize} />
      <XpSlider label="Décalage" min={-50} max={50} unit="%" bind:value={row.shiftPct} />
      <XpSlider label="Volume" min={0} max={150} unit="%"
        value={Math.round(row.volume * 100)} onchange={(v) => { row.volume = v / 100; onChanged?.(); }} />
      <XpSlider label="Glide" min={0} max={100} unit="%"
        value={Math.round(row.glide * 100)} onchange={(v) => (row.glide = v / 100)} />
      {#if isPad}
        <XpSlider label="Étalement" min={0} max={100} unit="%"
          value={Math.round((row.strum ?? 0) * 100)} onchange={(v) => (row.strum = v / 100)} />
      {/if}
    </fieldset>
    <fieldset>
      <legend>Oscillateur & enveloppe</legend>
      <label>
        Onde
        <select bind:value={row.voice.type} onchange={() => onChanged?.()}>
          <option value="sine">Sinus</option>
          <option value="triangle">Triangle</option>
          <option value="square">Carré</option>
          <option value="sawtooth">Scie</option>
        </select>
      </label>
      <XpSlider label="Attaque" min={0} max={200} step={5} unit=" ms"
        value={Math.round((row.voice.attack ?? 0) * 1000)}
        onchange={(v) => { row.voice.attack = v / 1000; onChanged?.(); }} />
      <label>
        Forme attaque
        <select bind:value={row.voice.attackCurve} onchange={() => onChanged?.()}>
          <option value="exponential">Naturelle</option>
          <option value="linear">Linéaire</option>
        </select>
      </label>
      <XpSlider label="Release" min={0} max={4000} step={20} unit=" ms"
        value={Math.round((row.voice.release ?? 0) * 1000)}
        onchange={(v) => { row.voice.release = v / 1000; onChanged?.(); }} />
      <label>
        Forme release
        <select bind:value={row.voice.releaseCurve} onchange={() => onChanged?.()}>
          <option value="exponential">Naturelle</option>
          <option value="linear">Linéaire</option>
        </select>
      </label>
      <XpSlider label="Sub" min={0} max={100} unit="%"
        value={Math.round((row.voice.subGain ?? 0) * 100)}
        onchange={(v) => { row.voice.subGain = v / 100; onChanged?.(); }} />
    </fieldset>
    <fieldset>
      <legend>Détune & modulation</legend>
      <XpSlider label="Détune" min={0} max={30} unit=" c"
        value={row.voice.detuneCents ?? 0}
        onchange={(v) => { row.voice.detuneCents = v; onChanged?.(); }} />
      <XpSlider label="Mix détune" min={0} max={100} unit="%"
        value={Math.round((row.voice.detuneGain ?? 0) * 100)}
        onchange={(v) => { row.voice.detuneGain = v / 100; onChanged?.(); }} />
      <XpSlider label="Chorus" min={0} max={100} unit="%"
        value={Math.round((row.voice.chorusMix ?? 0) * 100)}
        onchange={(v) => { row.voice.chorusMix = v / 100; onChanged?.(); }} />
      <XpSlider label="Vibrato" min={0} max={100} unit="%"
        value={Math.round((row.voice.vibratoDepth ?? 0) * 100)}
        onchange={(v) => { row.voice.vibratoDepth = v / 100; onChanged?.(); }} />
    </fieldset>
    <fieldset>
      <legend>Filtre</legend>
      <XpSlider label="Tone" min={0} max={100} unit="%"
        value={row.voice.tone ?? 0}
        onchange={(v) => { row.voice.tone = v; onChanged?.(); }} />
      <XpSlider label="Filtre" min={100} max={4000} step={50} unit=" Hz"
        value={row.voice.cutoff ?? 1800}
        onchange={(v) => { row.voice.cutoff = v; onChanged?.(); }} />
      <XpSlider label="Ouv. filtre" min={0} max={4000} step={50} unit=" Hz"
        value={row.voice.filterEnvAmount ?? 0}
        onchange={(v) => { row.voice.filterEnvAmount = v; onChanged?.(); }} />
      <XpSlider label="Ferm. filtre" min={0} max={4000} step={20} unit=" ms"
        value={Math.round((row.voice.filterEnvRelease ?? 0) * 1000)}
        onchange={(v) => { row.voice.filterEnvRelease = v / 1000; onChanged?.(); }} />
    </fieldset>
    <fieldset>
      <legend>Espace</legend>
      <XpSlider label="Réverbe" min={0} max={100} unit="%"
        value={Math.round(row.reverbSend * 100)} onchange={(v) => { row.reverbSend = v / 100; onChanged?.(); }} />
      <XpSlider label="Delay" min={0} max={100} unit="%"
        value={Math.round(row.delaySend * 100)} onchange={(v) => { row.delaySend = v / 100; onChanged?.(); }} />
    </fieldset>
  {/if}
</div>

<style>
  .synth-row {
    margin-bottom: 14px;
  }
  .row-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 4px;
  }
  .row-head .mini.test {
    font-weight: 700;
  }
  .preview {
    width: 130px;
    margin-left: auto;
  }
  .row-label {
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--xp-accent-violet);
  }
  .mini,
  .octbtn {
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-out);
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    padding: 1px 5px;
  }
  .mini.on {
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-face-dark);
  }
  .voice-select {
    font-family: var(--xp-font);
    font-size: 11px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
  .packets {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-bottom: 4px;
  }
  .cells {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 3px;
  }
  .cell-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cell {
    position: relative;
    height: 32px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #fdfcf8, var(--xp-face-dark));
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    padding: 0;
    font-family: var(--xp-mono);
    font-size: 12px;
    touch-action: manipulation;
  }
  .cell.active {
    box-shadow: var(--xp-bevel-in);
    color: #fff;
  }
  /* Une couleur par ligne (au lieu du même violet pour les 3) — port de
     .cell-select.active.bass/pad/melody de l'original (--indigo/--violet/
     --pink), mêmes teintes que la courbe de filtre (PREVIEW_COLOR) et le
     point médian de rafale de StepCircle. */
  .cell.bass.active {
    background: var(--cell-bass);
  }
  .cell.pad.active {
    background: color-mix(in srgb, var(--cell-pad) 78%, white);
    color: #16101f;
  }
  .cell.melody.active {
    background: var(--cell-melody);
  }
  /* Cases VIDES teintées par ligne, comme la grille batterie — port de
     #rowBass/#rowPad/#rowMelody .cell-select:not(.active) de l'original
     (l. 762-764). */
  .cell.bass:not(.active) {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-bass) 10%, #fff),
      color-mix(in srgb, var(--cell-bass) 26%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-bass) 45%, var(--xp-line));
  }
  .cell.pad:not(.active) {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-pad) 10%, #fff),
      color-mix(in srgb, var(--cell-pad) 26%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-pad) 45%, var(--xp-line));
  }
  .cell.melody:not(.active) {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-melody) 10%, #fff),
      color-mix(in srgb, var(--cell-melody) 26%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-melody) 45%, var(--xp-line));
  }
  .cell.playing {
    outline: 2px solid #ffd54a;
    outline-offset: -1px;
  }
  .just {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .just.chord {
    background: #35c05a;
  }
  .just.tension {
    background: #e0a52b;
  }
  .roll {
    position: absolute;
    right: 2px;
    bottom: 0;
    font-size: 9px;
    background: rgba(255, 255, 255, 0.8);
    color: #222;
    border-radius: 2px;
    padding: 0 2px;
  }
  .oct {
    display: flex;
    gap: 2px;
    justify-content: center;
  }
  fieldset label {
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 2px 0;
  }
  fieldset select {
    font-family: var(--xp-font);
    font-size: 12px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
  .more {
    background: none;
    border: none;
    color: var(--xp-muted);
    font-size: 11px;
    cursor: pointer;
    padding: 2px 0;
    font-family: inherit;
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
</style>
