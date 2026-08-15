<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { DrumRowName, DrumStep, SynthRowName } from '../../model/types';
  import XpWindow from '../xp/XpWindow.svelte';
  import XpSlider from '../xp/XpSlider.svelte';
  import XpTabs from '../xp/XpTabs.svelte';
  import DrumRowView from '../sequencer/DrumRowView.svelte';
  import StepCircle from '../sequencer/StepCircle.svelte';
  import TransportRings from '../sequencer/TransportRings.svelte';
  import GeneralSequencer from '../sequencer/GeneralSequencer.svelte';
  import SynthModule from './SynthModule.svelte';
  import PresetPicker from './PresetPicker.svelte';
  import SequenceBank from './SequenceBank.svelte';
  import ExportBar from './ExportBar.svelte';
  import ToolBar from './ToolBar.svelte';
  import { history } from '../../stores/history.svelte';
  import { scheduleAutosave, hasAutosave, restoreAutosave } from '../../stores/share';
  import { findClosestPreset } from '../../engine/similarity';
  import { playSystemSound } from '../xp/systemSounds';

  // Bascule d'écran remontée à App.svelte : depuis l'audit A1, l'Atelier n'a
  // plus de barre de navigation au-dessus de lui, c'est le menu « Mode » de
  // la ToolBar qui en tient lieu.
  let { onSwitchView }: { onSwitchView?: (v: 'atelier' | 'game' | 'live') => void } = $props();

  const engine = new AudioEngine(() => pattern.snapshot());

  let playing = $state(false);
  let recording = $state(false);
  let breakArmed = $state(false);
  let circleView = $state(false);
  // Onglets Rythme/Synthé/Effets : chaque page redevient courte (plus besoin
  // de traverser les réglages des deux autres pour retrouver le séquenceur),
  // pendant que Lecture/Stop/Break restent dans la barre sticky au-dessus,
  // donc joignables quel que soit l'onglet actif.
  let activeTab = $state<'rythme' | 'synthe' | 'effets'>('rythme');
  let tipExpanded = $state(false);
  let playhead = $state<Record<DrumRowName, number>>({ kick: -1, snare: -1, hat: -1, clap: -1, shaker: -1 });
  let synthPlayhead = $state<Record<SynthRowName, number>>({ bass: -1, pad: -1, melody: -1 });
  let fileInput: HTMLInputElement;

  // Curseur visuel : consommé à chaque frame contre l'horloge audio.
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as DrumRowName] = ev.col;
      else synthPlayhead[ev.name as SynthRowName] = ev.col;
    }
    breakArmed = engine.breakPending;
    raf = requestAnimationFrame(loop);
  }
  // Indicateur « le plus proche de ce que tu joues » — throttlé (le calcul
  // teste les 34 presets × 6 permutations de lignes).
  // Débouncé, pas throttlé : un throttle à early-return abandonnerait la
  // dernière modification d'une rafale (ex. le chargement d'un preset juste
  // après un clic) et laisserait un résultat périmé à l'écran.
  let closest = $state<{ label: string; score: number } | null>(null);
  $effect(() => {
    void pattern.state.rows.kick.pattern;
    void pattern.state.rows.snare.pattern;
    void pattern.state.rows.hat.pattern;
    void pattern.state.rows.kick.subdiv;
    void pattern.state.rows.snare.subdiv;
    void pattern.state.rows.hat.subdiv;
    const snapshot = pattern.snapshot();
    const t = setTimeout(() => {
      const m = findClosestPreset(snapshot);
      closest = m ? { label: m.preset.label, score: m.score } : null;
    }, 300);
    return () => clearTimeout(t);
  });

  // Sauvegarde automatique du pattern — l'original ne persistait que la
  // progression du jeu : un rechargement perdait toute la composition.
  $effect(() => {
    void JSON.stringify(pattern.state);
    scheduleAutosave();
  });

  let canRestore = $state(false);

  onMount(() => {
    raf = requestAnimationFrame(loop);
    window.addEventListener('keydown', onKey);
    window.addEventListener('input', markProductionTouched);
    window.addEventListener('change', markProductionTouched);
    canRestore = hasAutosave();
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('input', markProductionTouched);
    window.removeEventListener('change', markProductionTouched);
    engine.stop();
  });

  // Aide à la production contextuelle (original renderProductionHelp,
  // l. 8903-8972, jamais portée avant — dernier item de l'audit de parité,
  // PLAN.md §7.3). Placée au-dessus des onglets (pas dans un seul) : le
  // conseil peut justement suggérer de CHANGER d'onglet ("passe au
  // Synthé"). Groupes alignés sur les fieldsets/fenêtres déjà visibles dans
  // ce port (13, pas les 14 originaux 1:1 — ce port n'a pas le même
  // découpage de DOM) ; délégation d'événement sur `data-group` comme
  // l'original plutôt qu'un handler par curseur (markProductionTouched
  // ci-dessus) : ajouter un curseur à un fieldset existant le fait suivre
  // automatiquement, sans câblage supplémentaire — et un fieldset partagé
  // par les 3 instances de DrumRowView/SynthRowView (une par ligne) agrège
  // naturellement les 3 lignes sous un seul groupe, comme l'original.
  // En mémoire seulement (pas de localStorage) : reflète l'exploration de
  // CETTE session, pas un score à conserver.
  const PRODUCTION_GROUPS = [
    { id: 'drum-groove', label: 'Groove batterie' },
    { id: 'drum-sequence', label: 'Séquence (Drum)' },
    { id: 'drum-timbre', label: 'Timbre (Drum)' },
    { id: 'drum-filtre', label: 'Filtre & espace (Drum)' },
    { id: 'synth-harmonie', label: 'Gamme & harmonie' },
    { id: 'synth-sequence', label: 'Séquence (Synthé)' },
    { id: 'synth-oscillateur', label: 'Oscillateur & enveloppe' },
    { id: 'synth-detune', label: 'Détune & modulation' },
    { id: 'synth-filtre', label: 'Filtre (Synthé)' },
    { id: 'synth-espace', label: 'Espace (Synthé)' },
    { id: 'synth-arpege', label: 'Arpégiateur de nappe' },
    { id: 'synth-sidechain', label: 'Sidechain' },
    { id: 'synth-groove', label: 'Groove synthé & espace' },
    { id: 'effets-bus', label: 'Effets de bus & mix' },
  ];
  let productionTouched = $state(new Set<string>());
  function markProductionTouched(e: Event) {
    const target = e.target as HTMLElement | null;
    const grp = target?.closest<HTMLElement>('[data-group]');
    const id = grp?.dataset.group;
    if (id && !productionTouched.has(id)) productionTouched = new Set(productionTouched).add(id);
  }
  // hasNotes : kick/snare/hat (0/1/2, 0 = vide) et bass/melody (objet note
  // ou null) partagent la même logique !!v. La Nappe est différente : sa
  // case vide vaut -1, "truthy" en JS — il lui faut le test >= 0.
  function hasNotes(row: { pattern: unknown[] }, isPad = false): boolean {
    return isPad ? row.pattern.some((v) => typeof v === 'number' && v >= 0) : row.pattern.some((v) => !!v);
  }
  const productionUntouched = $derived(PRODUCTION_GROUPS.filter((g) => !productionTouched.has(g.id)));
  const productionTip = $derived.by(() => {
    if (!hasNotes(pattern.state.rows.kick)) return "Commence par poser un rythme sur le Kick — c'est la base de tout le morceau.";
    if (!hasNotes(pattern.state.rows.snare)) return 'Ajoute la Snare pour marquer le contretemps.';
    if (!hasNotes(pattern.state.rows.hat))
      return 'Le Hat apporte du mouvement — pose quelques pas, ou tente une rafale (clic droit / appui long).';
    if (
      !hasNotes(pattern.state.synthRows.bass) &&
      !hasNotes(pattern.state.synthRows.pad, true) &&
      !hasNotes(pattern.state.synthRows.melody)
    ) {
      return 'Passe au Synthé : le 🎲 sur la Nappe pose vite un fond harmonique pour démarrer.';
    }
    if (productionTouched.size === 0) {
      return 'Le rythme de base est posé — explore les réglages avancés (Groove, Filtres, Effets...) pour le personnaliser.';
    }
    if (productionUntouched.length === 0) return "Tu as touché à tous les modules — libre à toi d'affiner le rythme !";
    return `Tu peux continuer à affiner, ou explorer : ${productionUntouched.map((g) => g.label).join(' · ')}`;
  });

  // Raccourcis clavier (absents de l'original) : Espace = lecture/stop,
  // B = break, 1/2/3 = mute des lignes drum.
  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? history.redo() : history.undo();
      refreshFx();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      history.redo();
      refreshFx();
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    if (e.code === 'Space') {
      e.preventDefault();
      void togglePlay();
    } else if (e.key.toLowerCase() === 'b') {
      engine.requestBreak();
    } else if (e.key >= '1' && e.key <= '5') {
      const name = (['kick', 'snare', 'hat', 'clap', 'shaker'] as DrumRowName[])[Number(e.key) - 1];
      pattern.state.rows[name].muted = !pattern.state.rows[name].muted;
    }
  }

  // Tap tempo : on garde les intervalles récents et on en prend la moyenne.
  // Absent de l'original, alors que régler un tempo « à l'oreille » sur un
  // morceau existant est le cas d'usage le plus courant. Vivait dans
  // `ToolBar.svelte` jusqu'à l'audit A6/B7 — déplacé ici avec son bouton,
  // contre le curseur Tempo.
  let taps: number[] = [];
  function tapTempo() {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = []; // trop long : nouvelle série
    taps.push(now);
    if (taps.length > 5) taps.shift();
    if (taps.length < 2) return;
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avg / 10) * 10; // le tempo va par pas de 10
    pattern.state.tempo = Math.max(40, Math.min(200, bpm));
  }

  async function togglePlay() {
    if (playing) {
      engine.stop();
      playing = false;
      playhead = { kick: -1, snare: -1, hat: -1, clap: -1, shaker: -1 };
      synthPlayhead = { bass: -1, pad: -1, melody: -1 };
    } else {
      await engine.start();
      playing = true;
    }
  }

  // Les réglages de bus (fx, delay, sends, volumes de ligne, limiteurs)
  // s'appliquent en direct, sans reconstruire le graphe.
  function refreshFx() {
    engine.refreshMixSettings();
  }

  // Enregistrement du direct (WAV) : contrairement à l'export (rendu offline
  // déterministe), ceci capture vraiment ce qui joue — curseurs bougés
  // pendant la lecture inclus. `playing`/`recording` pilotent l'affichage du
  // transport pendant toute la durée, gérée par AudioEngine.startLiveRecording.
  async function recordLive(bars: number) {
    recording = true;
    playing = true;
    try {
      return await engine.startLiveRecording(bars);
    } finally {
      playing = false;
      recording = false;
      playhead = { kick: -1, snare: -1, hat: -1, clap: -1, shaker: -1 };
      synthPlayhead = { bass: -1, pad: -1, melody: -1 };
    }
  }

  function exportJson() {
    const blob = new Blob([pattern.toJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rythme-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      pattern.loadJson(await file.text());
      refreshFx();
    } catch {
      playSystemSound('error');
      alert('Fichier illisible — ce n’est pas une sauvegarde de rythme valide.');
    }
    fileInput.value = '';
  }

  // Édition depuis le cercle — mêmes règles que la grille linéaire.
  function tapCell(name: DrumRowName, col: number) {
    const row = pattern.state.rows[name];
    const maxState = name === 'snare' || name === 'hat' ? 2 : 1;
    const next = (((row.pattern[col] ?? 0) + 1) % (maxState + 1)) as DrumStep;
    row.pattern[col] = next;
    if (next === 0) row.rolls[col] = 1;
    else if (!playing) engine.preview(name, next);
  }
  function rollCell(name: DrumRowName, col: number) {
    const row = pattern.state.rows[name];
    if ((row.pattern[col] ?? 0) > 0) row.rolls[col] = (row.rolls[col] % 4) + 1;
  }

  const st = $derived(pattern.state);
</script>

<div class="atelier" data-theme="luna">
  <ToolBar
    bind:circleView
    {onSwitchView}
    onExport={exportJson}
    onImport={() => fileInput.click()}
    onReset={() => {
      history.push();
      pattern.reset();
      refreshFx();
    }}
  />
  {#if canRestore}
    <p class="restore">
      Une session précédente a été retrouvée.
      <button onclick={() => { history.push(); restoreAutosave(); refreshFx(); canRestore = false; }}>Restaurer</button>
      <button onclick={() => (canRestore = false)}>Ignorer</button>
    </p>
  {/if}
  <!-- Bloc sticky unique : transport ET onglets restent joignables SANS
       remonter en haut de page, quel que soit l'onglet actif ou la
       position de scroll — comme la barre de transport fixe de l'original
       (#drumTransportBar), étendue aux onglets pour ne jamais perdre
       l'accès à Rythme/Synthé/Effets. Les anneaux (batterie + synthé)
       rappellent le rythme en couleur sans reproduire tout le séquenceur
       éditable — un aperçu, pas un second éditeur. Le texte (raccourcis
       clavier, « le plus proche ») n'a pas sa place sur mobile : masqué au
       toucher, gardé sur desktop où la largeur ne manque pas. -->
  <div class="sticky-bar">
    <div class="transport-row">
      <div class="transport">
        <button class="xp-btn primary" disabled={recording} onclick={togglePlay}>
          {playing ? '■ Stop' : '▶ Lecture'}
        </button>
        <button
          class="xp-btn"
          class:armed={breakArmed}
          disabled={recording}
          title="À la prochaine mesure : dépouillé puis explosion"
          onclick={() => engine.requestBreak()}>🫨 Break</button
        >
      </div>
      <div class="spacer"></div>
      <TransportRings state={st} {playhead} {synthPlayhead} />
    </div>
    <p class="hint desktop-hint">
      Espace : lecture/stop · B : break · Ctrl+Z : annuler
      {#if closest}
        — le plus proche : <strong class="closest">{closest.label}</strong> ({Math.round(closest.score * 100)} %)
      {/if}
    </p>
    <!-- Le conseil prenait deux à trois lignes pleines dans la barre sticky,
         donc en permanence sur les trois onglets (audit A1). Ramené à UNE
         ligne tronquée, dépliable au tap : il reste visible et découvrable
         — c'était le point de PLAN §7.3, ne pas le cacher aux nouveaux
         venus — sans occuper la moitié du bandeau à chaque instant. -->
    <button
      class="hint production-hint"
      class:expanded={tipExpanded}
      aria-expanded={tipExpanded}
      title={tipExpanded ? 'Réduire le conseil' : 'Lire le conseil en entier'}
      onclick={() => (tipExpanded = !tipExpanded)}>💡 {productionTip}</button
    >
    <XpTabs
      tabs={[
        { id: 'rythme', label: '🥁 Rythme' },
        { id: 'synthe', label: '🎹 Synthé' },
        { id: 'effets', label: '🔊 Effets' },
      ]}
      bind:active={activeTab}
    />
  </div>

  <!-- Le séquenceur pas-à-pas éditable reste sur Rythme, hors de l'onglet
       exprès (pas besoin d'y revenir pour l'éditer pendant qu'on ajuste
       autre chose). Retiré du Synthé (PLAN.md §7, retour de Yann) : cette
       page ne travaille que sur basse/nappe/mélodie. Sur Effets, remplacé
       par un aperçu combiné des 6 lignes plutôt que dupliquer juste la
       batterie — les effets de bus touchent tout le mix (retour de Yann). -->
  {#if activeTab === 'rythme'}
    <XpWindow title="Séquenceur — Kick / Snare / Hat / Clap / Shaker" icon="🥁" accent="amber">
      {#if circleView}
        <div class="circle-holder">
          <StepCircle rows={st.rows} {playhead} onCellTap={tapCell} onCellRoll={rollCell} />
        </div>
      {:else}
        <DrumRowView name="kick" label="Kick" playheadCol={playhead.kick}
          onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
        <DrumRowView name="snare" label="Snare" playheadCol={playhead.snare}
          onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
        <DrumRowView name="hat" label="Hat" playheadCol={playhead.hat}
          onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
        <DrumRowView name="clap" label="Clap" playheadCol={playhead.clap}
          onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
        <DrumRowView name="shaker" label="Shaker" playheadCol={playhead.shaker}
          onPreview={(n, s) => !playing && engine.preview(n, s)} onFxChanged={refreshFx} />
      {/if}
    </XpWindow>
  {:else if activeTab === 'effets'}
    <XpWindow title="Séquenceur général" icon="🎼" accent="teal">
      <GeneralSequencer state={st} {playhead} {synthPlayhead} />
    </XpWindow>
  {/if}

  <!-- Descendu SOUS le séquenceur (audit A1, 2ᵉ passage). Il était coincé
       entre les onglets et le contenu que les onglets commutent : taper
       « Synthé » obligeait à traverser tempo + morceau + banque avant
       d'atteindre le synthé. Rien n'est retiré, c'est un pur
       réordonnancement — ce qu'on joue vient en premier, ce qu'on charge et
       ce qu'on règle vient après. Le tempo reste à portée immédiate du
       séquenceur, et Lecture/Break/onglets n'ont jamais bougé : ils sont
       dans la barre sticky, joignables de partout. -->
  <div class="preset-row">
    <div class="secondary">
      <button class="xp-btn" onclick={() => (circleView = !circleView)}>
        {circleView ? '▤ Vue linéaire' : '◎ Vue circulaire'}
      </button>
      <button class="xp-btn" onclick={exportJson}>💾 Sauver</button>
      <button class="xp-btn" onclick={() => fileInput.click()}>📂 Charger</button>
      <input type="file" accept="application/json" hidden bind:this={fileInput} onchange={importJson} />
    </div>
    <!-- Tap tempo remonté de la barre d'outils (audit A6/B7) : il RÈGLE le
         tempo, donc sa place est contre le curseur qu'il pilote — on voit
         désormais la valeur bouger à chaque frappe, ce qui n'était pas le
         cas quand le bouton vivait trois blocs plus haut. -->
    <div class="tempo-row">
      <XpSlider label="Tempo" min={40} max={200} step={10} unit=" BPM" bind:value={st.tempo} />
      <button class="xp-btn" onclick={tapTempo} title="Tape le tempo en rythme, au moins deux fois">
        👆 Tap
      </button>
    </div>
    <PresetPicker onApplied={refreshFx} />
    <SequenceBank onApplied={refreshFx} />
  </div>

  <div class="tab-panel">
    {#if activeTab === 'rythme'}
      <XpWindow title="Groove & variation humaine" icon="🎛️" accent="teal">
        <div class="two-col" data-group="drum-groove">
          <XpSlider label="Swing" min={0} max={75} unit="%" bind:value={st.swing} />
          <XpSlider label="Traîne" min={0} max={30} unit="%" bind:value={st.drag} />
          <XpSlider label="Rafales spontanées" min={0} max={100} unit="%" bind:value={st.spontRoll} />
          <XpSlider label="Ghost notes" min={0} max={40} unit="%" bind:value={st.ghostDensity} />
          <XpSlider label="Vélocité aléatoire" min={0} max={100} unit="%" bind:value={st.randomVelocity} />
          <XpSlider label="Intensité du fill" min={0} max={100} unit="%" bind:value={st.fillIntensity} />
        </div>
        <div class="inline-row" data-group="drum-groove">
          <label>
            Fill toutes les
            <select bind:value={st.fillEvery}>
              <option value={0}>— jamais</option>
              <option value={2}>2 mesures</option>
              <option value={4}>4 mesures</option>
              <option value={8}>8 mesures</option>
            </select>
          </label>
          <label>
            Ghost notes sur
            <select bind:value={st.ghostRow}>
              <option value="kick">Kick</option>
              <option value="snare">Snare</option>
            </select>
          </label>
        </div>
      </XpWindow>
    {:else if activeTab === 'synthe'}
      <SynthModule playhead={synthPlayhead} onFxChanged={refreshFx}
        onTest={(n) => !playing && engine.previewSynth(n)} />
    {:else}
      <XpWindow title="Effets de bus & mix" icon="🔊" accent="teal">
        <div class="two-col" data-group="effets-bus">
          <XpSlider label="Saturation" min={0} max={100} unit="%" bind:value={st.globalSaturation} onchange={refreshFx} />
          <XpSlider label="Compression" min={0} max={100} unit="%" bind:value={st.globalCompression} onchange={refreshFx} />
          <XpSlider label="Bitcrush" min={0} max={100} unit="%" bind:value={st.globalBitcrush} onchange={refreshFx} />
          <XpSlider label="Volume général" min={50} max={150} unit="%" bind:value={st.finalVolume} onchange={refreshFx} />
        </div>
        <label class="chk" data-group="effets-bus">
          <input type="checkbox" bind:checked={st.synthGlobal.limitersEnabled} onchange={refreshFx} />
          Limiteurs de sécurité
        </label>
      </XpWindow>

      <ExportBar {engine} {playing} {recordLive} />
    {/if}
  </div>
</div>

<style>
  .transport-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  .transport {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .spacer {
    flex: 1;
  }
  .hint {
    font-size: 11px;
    color: var(--xp-muted);
    margin: 0 0 8px;
  }
  /* Une ligne par défaut, tout le texte au tap. Le <button> reprend
     l'apparence du <p> qu'il remplace — c'est bien une action, mais elle ne
     doit pas se déguiser en contrôle de plus dans un bandeau déjà chargé. */
  .production-hint {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 11px;
    color: var(--xp-muted);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .production-hint.expanded {
    white-space: normal;
    overflow: visible;
  }
  /* Raccourcis clavier + « le plus proche » : texte qui n'a pas sa place sur
     mobile (pas de clavier physique, peu de largeur pour du texte à côté des
     anneaux) — masqué sur les appareils tactiles. Sur desktop, où la largeur
     ne manque pas, on garde les deux. */
  @media (pointer: coarse) {
    .desktop-hint {
      display: none;
    }
  }
  .closest {
    color: var(--xp-accent-amber);
  }
  .restore {
    font-size: 12px;
    background: #fffbe6;
    border: 1px solid var(--xp-accent-amber);
    padding: 5px 8px;
    margin: 0 0 8px;
    display: flex;
    gap: 6px;
    align-items: center;
  }
  /* Toujours joignable pendant qu'on défile dans un onglet — c'est le point
     du diagnostic ergonomie : Lecture/Stop/Break ne doivent plus disparaître
     en scrollant, comme la barre de transport fixe de l'original
     (#drumTransportBar, ANALYSE-ORIGINAL.md §3.3). */
  .sticky-bar {
    position: sticky;
    top: 0;
    z-index: 15;
    background: var(--xp-face);
    border: 1px solid var(--xp-line);
    border-radius: 8px;
    box-shadow: 0 3px 10px rgba(0, 0, 30, 0.25);
    padding: 8px 10px 10px;
    margin-bottom: 0;
  }
  .preset-row {
    background: var(--xp-face);
    border: 1px solid var(--xp-line);
    border-radius: 8px;
    padding: 8px 10px;
    margin: 10px 0;
    box-shadow: 0 2px 6px rgba(0, 0, 30, 0.12);
  }
  .secondary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }
  .tempo-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /* L'enveloppe de requête de conteneur est la racine de XpSlider : c'est
     elle l'enfant flex ici (même chose que dans .euclid-row). */
  .tempo-row :global(.xp-slider-outer) {
    flex: 1;
    min-width: 0;
  }
  .tempo-row .xp-btn {
    white-space: nowrap;
    padding: 8px 12px;
  }
  .tab-panel {
    background: var(--xp-face);
    border: 1px solid var(--xp-line);
    border-radius: 8px;
    padding: 12px 10px 10px;
    margin-bottom: 14px;
    box-shadow: 0 4px 14px rgba(0, 0, 30, 0.2);
  }
  .restore button {
    font-family: inherit;
    font-size: 11px;
    padding: 6px 10px;
    min-height: 28px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    cursor: pointer;
  }
  /* Cible tactile (audit A3) : 21px de haut avant — pour Lecture et Break,
     les deux boutons les plus utilisés de toute l'application. */
  .xp-btn {
    padding: 8px 16px;
    min-height: 32px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-size: 13px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.primary {
    font-weight: 700;
  }
  .xp-btn.armed {
    background: linear-gradient(180deg, #ffe9a8, #f4c542);
  }
  .circle-holder {
    max-width: 340px;
    margin: 0 auto;
  }
  .two-col {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    gap: 0 10px;
  }
  .inline-row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 6px;
  }
  label,
  .chk {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  select {
    font-family: var(--xp-font);
    font-size: 12px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
</style>
