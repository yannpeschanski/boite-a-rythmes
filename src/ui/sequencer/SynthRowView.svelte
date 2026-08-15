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
  import { translatePadArpToMelody } from '../../engine/generators';
  import XpSlider from '../xp/XpSlider.svelte';

  let {
    name,
    label,
    playheadCol = -1,
    onChanged,
  }: {
    name: SynthRowName;
    label: string;
    playheadCol?: number;
    onChanged?: () => void;
  } = $props();

  const row = $derived(pattern.state.synthRows[name]);
  const chords = $derived(chordsFor(pattern.state));
  const isPad = $derived(name === 'pad');
  const sg = $derived(pattern.state.synthGlobal);
  const voicePresets = $derived(SYNTH_VOICE_PRESETS[name] ?? []);

  let openGroups = $state({
    sequence: false,
    oscillator: false,
    detune: false,
    filter: false,
    space: false,
    arpege: false,
    drone: false,
  });

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

  // Densité des repères de temps (correctif A5). Un temps ne mérite un trait
  // que s'il reste plus espacé que les cases : sinon on ne marque plus le
  // rythme, on raye les cases. Cas concret qui l'a révélé — la Nappe part à
  // `cycleBars: 4` pour 4 cases (defaults.ts), donc 16 temps sur 4 cases :
  // trois traits AU TRAVERS de chaque case, illisible.
  // Au-delà de 8 temps, on retombe donc sur les seules barres de mesure (en
  // faisant coïncider les deux périodes : la couche « mesure », dessinée
  // par-dessus et plus marquée, recouvre exactement celle des temps).
  // Le seuil est volontairement haut pour préserver LE cas qui compte —
  // hat à 3 pas contre 4 temps, la polyrythmie qu'on cherche justement à
  // rendre lisible — et ne couper que là où le trait cesse d'informer.
  const MAX_BEAT_LINES = 8;
  const beatLines = $derived(4 * row.cycleBars <= MAX_BEAT_LINES ? 4 * row.cycleBars : row.cycleBars);

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

  // Arpège/Bourdon (PLAN.md §6) : sous-catégories de la ligne Nappe (retour
  // de Yann, 2026-08-14 : « les options d'arpeggiator et de bourdon
  // devraient être en sous catégorie de nappe ») plutôt que des fieldsets à
  // part dans SynthModule.svelte — ils portent sur `synthGlobal`
  // (padArpEnabled/padDroneEnabled…), pas sur `row`, mais ne concernent QUE
  // la Nappe : `rng = Math.random` comme les autres boutons 🎲 de l'Atelier
  // (édition ponctuelle, pas le rendu déterministe de l'export).
  function translateArpToMelody() {
    translatePadArpToMelody(pattern.state, Math.random);
  }
</script>

<div class="synth-row">
  <div class="row-head">
    <!-- Portée du cycle accolée au libellé (correctif A5). Sur Rythme, une
         case est toujours une subdivision d'UNE mesure ; sur Synthé, elle
         peut valoir une mesure entière (la Nappe démarre à 4). Sans cette
         mention, deux grilles d'apparence identique ne représentent pas du
         tout la même durée, et les repères de temps semblent incohérents
         d'une ligne à l'autre. Porté par le libellé existant plutôt que par
         un badge séparé : aucun élément permanent de plus, aucune hauteur
         gagnée (règle du §7.5). Masqué à 1 mesure, le cas par défaut. -->
    <span class="row-label"
      >{label}{#if row.cycleBars > 1}<span class="cycle-span" title="Cette ligne se déroule sur {row.cycleBars} mesures : une case y dure {row.cycleBars / row.subdivisions >= 1 ? 'une mesure ou plus' : 'une fraction de mesure'}"
          >&nbsp;· {row.cycleBars} mes.</span
        >{/if}</span
    >
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

  <!-- Repères de temps (audit A5, styles dans styles/global.css). Une ligne
       synthé couvre `cycleBars` mesures — donc `4 × cycleBars` temps — et non
       une seule comme la batterie.
       Volontairement DÉSACTIVÉS en affichage par paquets : un paquet ne montre
       que 8 pas sur les `subdivisions` du cycle, il commence donc à une
       fraction quelconque de la mesure. Les traits seraient déphasés, c'est-
       à-dire faux — mieux vaut aucun repère qu'un repère qui ment. -->
  <div
    class="cells"
    class:beat-grid={!packetized}
    style:--cols={visibleCols.length}
    style:--bars={row.cycleBars}
    style:--beats={beatLines}
  >
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

  <!-- Chaque groupe se déploie toujours indépendamment (retour de Yann), mais
       les `<fieldset>` empilés sont devenus UNE rangée de pastilles (audit
       A4). C'est ici que le gain est le plus fort : cinq groupes par ligne
       synthé, sept sur la Nappe (arpège + bourdon), soit une vingtaine de
       bandes vides sur l'onglet Synthé avant cette passe. Arpégiateur et
       Bourdon restent réservés à la Nappe, comme avant. -->
  <div class="group-bar">
    <button class="chip" class:on={openGroups.sequence} aria-expanded={openGroups.sequence}
      onclick={() => (openGroups.sequence = !openGroups.sequence)}>Séquence</button>
    <button class="chip" class:on={openGroups.oscillator} aria-expanded={openGroups.oscillator}
      onclick={() => (openGroups.oscillator = !openGroups.oscillator)}>Oscillateur</button>
    <button class="chip" class:on={openGroups.detune} aria-expanded={openGroups.detune}
      onclick={() => (openGroups.detune = !openGroups.detune)}>Détune</button>
    <button class="chip" class:on={openGroups.filter} aria-expanded={openGroups.filter}
      onclick={() => (openGroups.filter = !openGroups.filter)}>Filtre</button>
    <button class="chip" class:on={openGroups.space} aria-expanded={openGroups.space}
      onclick={() => (openGroups.space = !openGroups.space)}>Espace</button>
    {#if isPad}
      <button class="chip" class:on={openGroups.arpege} aria-expanded={openGroups.arpege}
        onclick={() => (openGroups.arpege = !openGroups.arpege)}>Arpégiateur</button>
      <button class="chip" class:on={openGroups.drone} aria-expanded={openGroups.drone}
        onclick={() => (openGroups.drone = !openGroups.drone)}>Bourdon</button>
    {/if}
  </div>
  {#if openGroups.sequence}
    <div class="group-panel" data-group="synth-sequence">
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
    </div>
  {/if}
  {#if openGroups.oscillator}
    <div class="group-panel" data-group="synth-oscillateur">
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
    </div>
  {/if}
  {#if openGroups.detune}
    <div class="group-panel" data-group="synth-detune">
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
    </div>
  {/if}
  {#if openGroups.filter}
    <div class="group-panel" data-group="synth-filtre">
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
    </div>
  {/if}
  {#if openGroups.space}
    <div class="group-panel" data-group="synth-espace">
      <XpSlider label="Réverbe" min={0} max={100} unit="%"
        value={Math.round(row.reverbSend * 100)} onchange={(v) => { row.reverbSend = v / 100; onChanged?.(); }} />
      <XpSlider label="Delay" min={0} max={100} unit="%"
        value={Math.round(row.delaySend * 100)} onchange={(v) => { row.delaySend = v / 100; onChanged?.(); }} />
    </div>
  {/if}
  {#if isPad}
    {#if openGroups.arpege}
      <div class="group-panel" data-group="synth-arpege">
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
      </div>
    {/if}
    {#if openGroups.drone}
      <div class="group-panel" data-group="synth-drone">
        <label class="chk"><input type="checkbox" bind:checked={sg.padDroneEnabled} /> Actif</label>
        <p class="hint">
          La Nappe devient un son tenu en continu, qui ne s'arrête jamais : un seul accord
          programmé sur sa grille = un drone fixe ; plusieurs accords = le même son qui glisse de
          l'un à l'autre au lieu de rejouer une nouvelle note à chaque fois. Cycle et pas de la
          ligne Nappe gardent leur effet habituel, c'est juste la façon dont le son est produit
          qui change.
        </p>
      </div>
    {/if}
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
  .row-label {
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    color: var(--xp-accent-violet);
  }
  .cycle-span {
    font-weight: 400;
    text-transform: none;
    color: var(--xp-muted);
    font-size: 11px;
  }
  /* Cibles tactiles (audit A3) : mute, test et octave se visent en pleine
     composition — le remplissage passe de 1px à 6px vertical, sans toucher
     à la police (le gabarit visuel XP reste le même). */
  .mini,
  .octbtn {
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-out);
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    padding: 6px 8px;
    min-height: 28px;
    line-height: 1;
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
  .group-panel label {
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 2px 0;
  }
  .group-panel select {
    font-family: var(--xp-font);
    font-size: 12px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
  /* Rangée de pastilles (audit A4) : remplace jusqu'à sept `<fieldset>`
     repliés pleine largeur par ligne. Cible tactile conservée à 28px
     (audit A3). Accent violet, la famille « Synthé ». */
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
    border: 1px solid color-mix(in srgb, var(--xp-accent-violet) 40%, var(--xp-line));
    border-radius: 13px;
    background: linear-gradient(180deg, #fff, var(--xp-face-dark));
    color: var(--xp-accent-violet);
    cursor: pointer;
    box-shadow: var(--xp-bevel-out);
  }
  .chip.on {
    background: var(--xp-accent-violet);
    border-color: var(--xp-accent-violet);
    color: #fff;
    box-shadow: var(--xp-bevel-in);
  }
  .group-panel {
    border: 1px solid var(--xp-line);
    border-top: 2px solid var(--xp-accent-violet);
    background: color-mix(in srgb, var(--xp-accent-violet) 6%, transparent);
    margin: 4px 0 0;
    padding: 5px 7px;
  }
  /* Arpège/Bourdon (sous-catégories de la Nappe) : mêmes styles que les
     boutons 🎲/bulle d'aide du reste de l'Atelier, portés ici avec eux. */
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
  }
  .hint {
    font-size: 11px;
    color: var(--xp-muted);
    margin: 4px 0 0;
  }
</style>
