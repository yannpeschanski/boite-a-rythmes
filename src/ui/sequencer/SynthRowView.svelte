<script lang="ts">
  // Une ligne synthé (Basse / Nappe / Mélodie). Un seul composant instancié
  // 3 fois — remplace les ~24 lignes de HTML triplées à la main de l'original.
  //
  // Modèle par DEGRÉS de gamme, pas par notes fixes : basse/mélodie portent
  // {degree 1-7, octave -1/0/+1}, la nappe un index d'accord (ou -1).
  // L'indicateur de justesse (point vert = note de l'accord en cours, ambre =
  // note de passage) est purement informatif.
  import { tick } from 'svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import type { SynthRowName, SynthNote } from '../../model/types';
  import { chordsFor, justesseForStep } from '../../engine/harmony';
  import { SYNTH_VOICE_PRESETS } from '../../model/presets/voices';
  import { translatePadArpToMelody } from '../../engine/generators';
  import XpSlider from '../xp/XpSlider.svelte';
  import NotePad from './NotePad.svelte';
  import { lastTouched } from '../atelier/lastTouched.svelte';

  let {
    name,
    label,
    playheadCol = -1,
    playing = false,
    stepStartedAt = 0,
    onPreviewDegree,
    onChanged,
  }: {
    name: SynthRowName;
    label: string;
    playheadCol?: number;
    playing?: boolean;
    stepStartedAt?: number;
    onPreviewDegree?: (name: 'bass' | 'melody', degree: number, octave: number) => void;
    onChanged?: () => void;
  } = $props();

  // Pad d'écriture (Basse/Mélodie seulement — la Nappe pose des ACCORDS, pas
  // des degrés, un pad à 7 touches n'y voudrait rien dire). Fermé par défaut :
  // tant qu'il l'est, il ne coûte pas un pixel.
  let padOpen = $state(false);
  // Curseur du pad, tenu ICI et pas dans le pad (retour de Yann : « difficile
  // à prendre en main »). C'est ce qui permet à la GRILLE d'entourer la case
  // visée : sans ça on écrivait à l'aveugle, le seul repère étant un
  // « pas 3 / 8 » en petit gris dans l'en-tête du pad.
  let padCursor = $state(0);
  let padEl = $state<HTMLElement | null>(null);

  async function togglePad() {
    padOpen = !padOpen;
    // Ouvrir un panneau qui apparaît SOUS la ligne de flottaison donne
    // l'impression que le bouton n'a rien fait — mesuré : à 390x900, le pad
    // de la Mélodie s'ouvrait hors écran, coupé de 30px.
    // `tick()` et non `queueMicrotask` : Svelte 5 groupe ses mises à jour du
    // DOM, un microtask s'exécute AVANT que le panneau existe et on ferait
    // défiler vers un élément encore absent (constaté en mesurant, le pad
    // restait coupé).
    if (padOpen) {
      await tick();
      padEl?.scrollIntoView({ block: 'nearest' });
    }
  }

  // Pad ouvert et lecture à l'arrêt : un appui sur une case y AMÈNE le
  // curseur au lieu de faire défiler la note. C'est la seule façon de viser
  // un pas — sinon atteindre le pas 5 depuis le pas 1 demandait quatre appuis
  // sur « ← ». Le défilement par la case reste le comportement dès que le pad
  // est refermé, et la case visée est entourée, donc le changement se voit.
  function onCellClick(col: number) {
    if (padOpen && !isPad && !playing) padCursor = col;
    else cycleCell(col);
  }

  const row = $derived(pattern.state.synthRows[name]);
  const chords = $derived(chordsFor(pattern.state));
  const isPad = $derived(name === 'pad');
  // Une ligne de synthé « sonne » si au moins un pas porte une note. Le
  // silence s'écrit `null` (basse/mélodie) ou -1 (nappe, index d'accord).
  const sonne = $derived(
    row.pattern.some((v) => v !== null && v !== undefined && v !== -1),
  );
  const sg = $derived(pattern.state.synthGlobal);
  const voicePresets = $derived(SYNTH_VOICE_PRESETS[name] ?? []);

  let openGroups = $state({
    sequence: false,
    oscillator: false,
    detune: false,
    filter: false,
    play: false,
  });

  // La grille montre TOUS les pas, et défile horizontalement quand ils ne
  // tiennent pas (2026-08-17). Avant : un regroupement par paquets de 8, donc
  // seize boutons « 1-8 · 9-16 … 121-128 » sur trois rangées pour une ligne à
  // 128 pas — de loin le plus gros bloc de l'onglet, et pour ne montrer que
  // huit cases à la fois.
  //
  // Le défilement fait mieux que remplacer la pagination : il REND les repères
  // de temps, qu'elle interdisait. Un paquet commençait à une fraction
  // quelconque de la mesure, les traits auraient été déphasés — donc faux —
  // et ils étaient désactivés dès qu'une ligne dépassait huit pas (audit A5).
  // Une grille complète qui défile garde la mesure entière sous les yeux : les
  // repères redeviennent justes.
  const visibleCols = $derived(Array.from({ length: row.subdivisions }, (_, i) => i));
  // Au-delà de ce nombre de pas, les cases cessent de se partager la largeur
  // et prennent une taille fixe : c'est ce qui déclenche le défilement plutôt
  // que des cases de trois pixels.
  const SCROLL_THRESHOLD = 16;
  const scrolls = $derived(row.subdivisions > SCROLL_THRESHOLD);

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
    // Voir DrumRowView : c'est ce qui alimente le bandeau LCD du bas.
    lastTouched.synth(name);
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



  // Marque d'octave sur la case. Les deux boutons ▲▼ qui vivaient sous chaque
  // case active sont partis (arbitrage de Yann, 2026-08-17 : « oui, tu peux
  // lâcher ») — l'octave se règle au pad. Mais retirer le CONTRÔLE ne doit pas
  // retirer l'INFORMATION : sans cette marque, une note à l'octave supérieure
  // serait indistinguable d'une note normale, et plus rien nulle part ne le
  // dirait.
  function octaveMark(col: number): string {
    if (isPad) return '';
    const n = row.pattern[col] as SynthNote | null;
    if (!n || !n.octave) return '';
    return n.octave > 0 ? '▴' : '▾';
  }

  // Case vide = AUCUN glyphe (audit B8). Elle affichait un « · », qui est un
  // signe : il dit « il y a quelque chose ici, en tout petit », alors que le
  // vide se lit très bien tout seul — c'est exactement ce que font les cases
  // de batterie, qui ne portent rien quand elles sont éteintes. Le point
  // était la principale raison pour laquelle une ligne synthé vide avait
  // l'air désactivée à côté d'une ligne de batterie vide.
  function cellLabel(col: number): string {
    const v = row.pattern[col];
    if (isPad) return typeof v === 'number' && v >= 0 ? (chords[v]?.roman ?? '?') : '';
    const n = v as SynthNote | null;
    return n ? String(n.degree) : '';
  }

  // --- Macros de filtre (retour de Yann : « filtre on comprend rien, on peut
  // pas résumer en un ou deux paramètres… de manière à fusionner avec
  // espace ? ») ---------------------------------------------------------
  //
  // Le panneau « Filtre » exposait QUATRE réglages en unités techniques
  // (Tone %, Filtre Hz, Ouv. filtre Hz, Ferm. filtre ms) — et en mélangeait
  // deux choses sans rapport : `voice.tone` n'est PAS un filtre mais un drive
  // de waveshaper (`driveCurve`, voices/synth.ts l. 121-124), rangé là par
  // hasard. Il part donc dans « Oscillateur & enveloppe » sous son vrai nom,
  // Saturation.
  //
  // Restent deux macros, qui décrivent ce qu'on ENTEND plutôt que le nœud
  // audio qu'elles pilotent. Les champs d'état ne bougent pas : le format v2
  // est le contrat central (CLAUDE.md), aucun n'est supprimé, seule l'UI est
  // résumée — un preset qui règle finement `filterEnvRelease` continue de
  // sonner pareil tant qu'on ne touche pas à la macro.
  const CUT_MIN = 100;
  const CUT_MAX = 4000;
  // Exponentiel : l'oreille perçoit les fréquences en RATIOS, pas en écarts.
  // Linéaire, tout le haut du curseur aurait sonné pareil.
  const brillance = $derived(
    Math.round(
      (100 * Math.log(Math.min(CUT_MAX, Math.max(CUT_MIN, row.voice.cutoff ?? 1800)) / CUT_MIN)) /
        Math.log(CUT_MAX / CUT_MIN),
    ),
  );
  function setBrillance(v: number) {
    row.voice.cutoff = Math.round(CUT_MIN * Math.pow(CUT_MAX / CUT_MIN, v / 100));
    onChanged?.();
  }
  // « Mouvement » = de combien le filtre s'ouvre au début de la note, et donc
  // à quel point on entend le son « bouger ». Pilote l'ampleur ET le temps de
  // fermeture ensemble : à faible mouvement une fermeture longue ne s'entend
  // pas, à fort mouvement une fermeture instantanée fait un clic.
  const mouvement = $derived(Math.round(Math.min(100, ((row.voice.filterEnvAmount ?? 0) / 4000) * 100)));
  function setMouvement(v: number) {
    row.voice.filterEnvAmount = Math.round((v / 100) * 4000);
    row.voice.filterEnvRelease = 0.05 + (v / 100) * 0.55;
    onChanged?.();
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
    // Le curseur du pad ne doit pas désigner un pas qui vient de disparaître.
    if (padCursor >= n) padCursor = 0;
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
    <!-- Même diode que les lignes de batterie : allumée elle sonne, éteinte
         elle est coupée, creuse elle est vide. -->
    <button
      class="mini led-btn tap44"
      class:on={row.muted}
      class:vide={!sonne}
      style:--led-color="var(--cell-{name})"
      aria-pressed={row.muted}
      title={row.muted ? 'Réactiver la ligne' : 'Couper la ligne'}
      onclick={() => {
        lastTouched.synth(name);
        row.muted = !row.muted;
      }}
    >
      <i class="led"></i><span class="sr">{row.muted ? 'Coupé' : 'Actif'}</span>
    </button>
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
    {#if !isPad}
      <button
        class="mini tap44"
        class:on={padOpen}
        onclick={togglePad}
        title="Pad : écrire la ligne en tapant les degrés, ou l'enregistrer en direct"
      >
        🎹
      </button>
    {/if}
    <select
      class="voice-select"
      onchange={(e) => applyVoicePreset((e.currentTarget as HTMLSelectElement).value)}
    >
      <option value="">— Voix…</option>
      {#each voicePresets as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
    </select>
  </div>


  <!-- Repères de temps (audit A5, styles dans styles/global.css). Une ligne
       synthé couvre `cycleBars` mesures — donc `4 × cycleBars` temps — et non
       une seule comme la batterie.
       Volontairement DÉSACTIVÉS en affichage par paquets : un paquet ne montre
       que 8 pas sur les `subdivisions` du cycle, il commence donc à une
       fraction quelconque de la mesure. Les traits seraient déphasés, c'est-
       à-dire faux — mieux vaut aucun repère qu'un repère qui ment. -->
  <!-- Conteneur de défilement SÉPARÉ de la grille. Les repères de temps sont
       dessinés par un `::after` en `position: absolute`, qui se cale sur la
       zone VISIBLE d'un élément qui défile — sur une ligne longue, les traits
       seraient restés fixes pendant que les cases glissent dessous, c'est-à-
       dire auraient menti. La grille intérieure fait la largeur de son
       contenu (`max-content`), ses repères couvrent donc le cycle entier et
       défilent avec lui. -->
  <div class="cells-wrap" class:scrolls>
  <div
    class="cells beat-grid"
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
          class="cell tap44-y {name}"
          class:active
          class:playing={playheadCol === col}
          class:padtarget={padOpen && !isPad && !playing && padCursor % Math.max(1, row.subdivisions) === col}
          onclick={() => onCellClick(col)}
          oncontextmenu={(e) => cycleRoll(col, e)}
          title={padOpen && !isPad && !playing
            ? 'Clic : viser ce pas avec le pad'
            : 'Clic : note suivante — clic droit : rafale'}
        >
          <span class="lbl">{cellLabel(col)}</span>
          {#if octaveMark(col)}<span class="oct-mark">{octaveMark(col)}</span>{/if}
          {#if just}<span class="just {just}"></span>{/if}
          {#if row.rolls[col] > 1}<span class="roll">×{row.rolls[col]}</span>{/if}
        </button>
      </div>
    {/each}
  </div>
  </div>

  {#if padOpen && !isPad}
    <div bind:this={padEl}>
      <NotePad
        name={name as 'bass' | 'melody'}
        {playing}
        {playheadCol}
        {stepStartedAt}
        bind:cursor={padCursor}
        onPreview={(d, o) => onPreviewDegree?.(name as 'bass' | 'melody', d, o)}
        {onChanged}
        onClose={() => (padOpen = false)}
      />
    </div>
  {/if}

  <!-- Chaque groupe se déploie toujours indépendamment (retour de Yann), mais
       les `<fieldset>` empilés sont devenus UNE rangée de pastilles (audit
       A4). C'est ici que le gain est le plus fort : cinq groupes par ligne
       synthé, sept sur la Nappe (arpège + bourdon), soit une vingtaine de
       bandes vides sur l'onglet Synthé avant cette passe. Arpégiateur et
       Bourdon restent réservés à la Nappe, comme avant. -->
  <div class="group-bar">
    <button class="chip tap44" class:on={openGroups.sequence} aria-expanded={openGroups.sequence}
      onclick={() => (openGroups.sequence = !openGroups.sequence)}>Séquence</button>
    <button class="chip tap44" class:on={openGroups.oscillator} aria-expanded={openGroups.oscillator}
      onclick={() => (openGroups.oscillator = !openGroups.oscillator)}>Timbre</button>
    <button class="chip tap44" class:on={openGroups.detune} aria-expanded={openGroups.detune}
      onclick={() => (openGroups.detune = !openGroups.detune)}>Détune</button>
    <button class="chip tap44" class:on={openGroups.filter} aria-expanded={openGroups.filter}
      onclick={() => (openGroups.filter = !openGroups.filter)}>Filtre</button>
    {#if isPad}
      <!-- Arpège et Bourdon fondus en une pastille « Jeu » : les six
           pastilles de la Nappe demandaient 352px pour 322 disponibles, et
           les deux répondent à la MÊME question — comment la Nappe joue
           l'accord, égrené ou tenu. -->
      <button class="chip tap44" class:on={openGroups.play} aria-expanded={openGroups.play}
        onclick={() => (openGroups.play = !openGroups.play)}>Jeu</button>
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
      <!-- Anciennement « Tone », dans le panneau Filtre : c'est en réalité un
           drive de waveshaper, pas un filtre. Renommé et déplacé ici. -->
      <XpSlider label="Saturation" min={0} max={100} unit="%"
        value={row.voice.tone ?? 0}
        onchange={(v) => { row.voice.tone = v; onChanged?.(); }} />
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
      <XpSlider label="Brillance" min={0} max={100} unit="%" value={brillance} onchange={setBrillance} />
      <XpSlider label="Mouvement" min={0} max={100} unit="%" value={mouvement} onchange={setMouvement} />
      <XpSlider label="Réverbe" min={0} max={100} unit="%"
        value={Math.round(row.reverbSend * 100)} onchange={(v) => { row.reverbSend = v / 100; onChanged?.(); }} />
      <XpSlider label="Delay" min={0} max={100} unit="%"
        value={Math.round(row.delaySend * 100)} onchange={(v) => { row.delaySend = v / 100; onChanged?.(); }} />
    </div>
  {/if}
  {#if isPad}
    {#if openGroups.play}
      <div class="group-panel" data-group="synth-arpege">
        <p class="sub">Arpège — l'accord est égrené note par note</p>
        <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.padArpEnabled} /> Actif</label>
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
        <p class="sub">Bourdon — l'accord est tenu en continu</p>
        <label class="chk tap44-y"><input type="checkbox" bind:checked={sg.padDroneEnabled} /> Actif</label>
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
    font-size: var(--xp-size-body);
    text-transform: uppercase;
    color: var(--xp-accent-violet);
  }
  .cycle-span {
    font-weight: 400;
    text-transform: none;
    color: var(--xp-muted);
    font-size: 9px;
  }
  /* Cibles tactiles (audit A3) : mute, test et octave se visent en pleine
     composition — le remplissage passe de 1px à 6px vertical, sans toucher
     à la police (le gabarit visuel XP reste le même). */
  .mini {
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-out);
    border-radius: 3px;
    cursor: pointer;
    font-size: var(--xp-size-small);
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
    font-size: 9px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
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
  /* Ligne longue : cases à largeur fixe, le CONTENEUR défile. `touch-action`
     autorise le défilement horizontal du doigt tout en laissant la page
     défiler verticalement. */
  .cells-wrap.scrolls {
    overflow-x: auto;
    overscroll-behavior-x: contain;
    touch-action: pan-x pan-y;
    padding-bottom: 4px;
  }
  .cells-wrap.scrolls > .cells {
    grid-template-columns: repeat(var(--cols), 34px);
    width: max-content;
  }
  /* Marque d'octave — discrète : c'est un rappel, pas une valeur qu'on lit
     en premier. */
  .oct-mark {
    position: absolute;
    top: 1px;
    left: 3px;
    font-size: 9px;
    line-height: 1;
    opacity: 0.75;
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
    background: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-in);
    cursor: pointer;
    padding: 0;
    font-family: var(--xp-mono);
    font-size: var(--xp-size-body);
    touch-action: manipulation;
  }
  /* Relief inversé, comme sur la batterie : un pas actif émet. */
  .cell.active {
    box-shadow: var(--xp-bevel-out);
    color: var(--xp-lcd-bg);
  }
  /* Une couleur par ligne (au lieu du même violet pour les 3) — port de
     .cell-select.active.bass/pad/melody de l'original (--indigo/--violet/
     --pink), mêmes teintes que la courbe de filtre (PREVIEW_COLOR) et le
     point médian de rafale de StepCircle. */
  .cell.bass.active {
    background: var(--cell-bass);
  }
  .cell.pad.active {
    background: color-mix(in srgb, var(--cell-pad) 88%, white);
    color: var(--xp-lcd-bg);
  }
  .cell.melody.active {
    background: var(--cell-melody);
  }
  /* Cases VIDES teintées par ligne, comme la grille batterie — port de
     #rowBass/#rowPad/#rowMelody .cell-select:not(.active) de l'original
     (l. 762-764).
     Dosage RELEVÉ à 18/40 % au lieu des 10/28 % de la batterie (audit B8).
     Ce n'est pas une incohérence : la recette était bien la même des deux
     côtés, mais elle ne donne pas le même résultat selon la teinte. À 10 %,
     l'orange du kick reste franc là où l'indigo/violet/rose des lignes
     synthé vire au lavande pâle — la même formule produisait une grille
     éteinte d'un côté et prête de l'autre. On égalise ce qu'on VOIT, pas ce
     qu'on écrit. */
  .cell.bass:not(.active) {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-bass) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-bass) 40%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-bass) 60%, var(--xp-line));
  }
  .cell.pad:not(.active) {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-pad) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-pad) 40%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-pad) 60%, var(--xp-line));
  }
  .cell.melody:not(.active) {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--cell-melody) 20%, var(--xp-lcd-bg)),
      color-mix(in srgb, var(--cell-melody) 40%, var(--xp-face-dark))
    );
    border-color: color-mix(in srgb, var(--cell-melody) 60%, var(--xp-line));
  }
  .cell.playing {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  /* Case visée par le pad. Trait plein et sombre plutôt que la teinte ambre
     de la tête de lecture : les deux ne se montrent jamais en même temps (le
     curseur du pad ne sert qu'à l'arrêt), mais s'ils se ressemblaient on
     confondrait « là où ça joue » et « là où j'écris ». */
  .cell.padtarget {
    outline: 2px solid var(--xp-text);
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
    background: rgba(0, 0, 0, 0.55);
    color: var(--xp-lcd);
    border-radius: 2px;
    padding: 0 2px;
  }
  .group-panel label {
    font-size: var(--xp-size-body);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin: 2px 0;
  }
  .group-panel select {
    font-family: var(--xp-font);
    font-size: var(--xp-size-body);
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
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
  /* Une seule ligne par ligne synthé (retour de Yann, 2026-08-17). Mesuré
     avant : 324px nécessaires pour 322 disponibles sur Basse/Mélodie — il
     manquait DEUX pixels — et 484px sur la Nappe, qui en porte six.
     Le remplissage horizontal se resserre, la HAUTEUR de cible reste à 28px
     (audit A3). Les libellés raccourcis font le reste : « Oscillateur » ->
     « Timbre » (le nom qu'utilisent déjà les lignes de batterie pour le même
     panneau), « Filtre & espace » -> « Filtre », « Arpégiateur » ->
     « Arpège ». Les titres des panneaux, eux, gardent leur nom complet. */
  .chip {
    font-family: inherit;
    font-size: var(--xp-size-tag);
    font-weight: 700;
    letter-spacing: var(--xp-ls-tag);
    line-height: 1;
    min-height: 28px;
    padding: 6px 7px;
    border: 1px solid color-mix(in srgb, var(--xp-accent-violet) 40%, var(--xp-line));
    border-radius: 13px;
    background: var(--xp-btn-face);
    color: var(--xp-accent-violet);
    cursor: pointer;
    box-shadow: var(--xp-bevel-out);
  }
  /* Sous 340px, la Nappe (cinq pastilles) repassait à deux lignes : un cran
     de resserrement horizontal de plus, la hauteur de cible ne bougeant
     toujours pas. */
  @media (max-width: 339px) {
    .chip {
      padding-left: 4px;
      padding-right: 4px;
    }
  }
  .chip.on {
    background: var(--xp-accent-violet);
    border-color: var(--xp-accent-violet);
    color: var(--xp-lcd-bg);
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
  }
  /* Sous-titre à l'intérieur d'un panneau fusionné : sépare arpège et
     bourdon sans réintroduire deux replis. */
  .sub {
    margin: 6px 0 2px;
    font-size: var(--xp-size-small);
    font-weight: 700;
    letter-spacing: 0.02em;
    color: var(--xp-accent-violet);
    grid-column: 1 / -1;
  }
  .sub:first-child {
    margin-top: 0;
  }
  .hint {
    font-size: 9px;
    color: var(--xp-muted);
    margin: 4px 0 0;
  }
  /* Chantier tactile — même rythme que les lignes de batterie (voir
     DrumRowView et styles/global.css). */
  @media (pointer: coarse) {
    .synth-row {
      margin-bottom: 24px;
    }
    .row-head {
      margin-bottom: 15px;
      gap: 16px;
    }
    .group-bar {
      margin-top: 16px;
    }
    .chk {
      margin: 10px 0;
    }
  }
  /* La diode des lignes de synthé — même dessin que DrumRowView. Le bouton
     garde son biseau de poussoir, c'est ce qu'il montre qui a changé. */
  .led-btn {
    display: grid;
    place-items: center;
    padding: 0;
    /* Même gabarit que la diode des lignes de batterie : sans l'émoji qui la
       remplissait, la boîte se serait rétrécie sur les 7px de la diode — et
       la cible avec elle. */
    min-width: 32px;
  }
  .led {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--led-color);
    box-shadow: 0 0 5px var(--led-color);
  }
  .led-btn.on .led {
    background: var(--xp-led-off);
    box-shadow: none;
  }
  .led-btn.vide:not(.on) .led {
    background: transparent;
    box-shadow: inset 0 0 0 1px var(--xp-led-off);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
