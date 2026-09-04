<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { game } from '../../stores/game.svelte';
  import { evaluerCommande } from '../../model/commande';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { DrumRowName, DrumStep, SynthRowName } from '../../model/types';
  import XpWindow from '../xp/XpWindow.svelte';
  import CalibrageLatence from '../xp/CalibrageLatence.svelte';
  import XpSlider from '../xp/XpSlider.svelte';
  import XpTabs from '../xp/XpTabs.svelte';
  import DrumRowView from '../sequencer/DrumRowView.svelte';
  import StepCircle from '../sequencer/StepCircle.svelte';
  import SpectrumAnalyser from '../xp/SpectrumAnalyser.svelte';
  import StatusLcd from '../sequencer/StatusLcd.svelte';
  import GeneralSequencer from '../sequencer/GeneralSequencer.svelte';
  import SynthModule from './SynthModule.svelte';
  import RhythmAnalyser from './RhythmAnalyser.svelte';
  import SequenceBank from './SequenceBank.svelte';
  import { presetToState } from '../../model/presetAdapter';
  import { sequenceBank } from '../../stores/bank.svelte';
  import type { SongPresetData } from '../../model/presets/songs';
  import ExportBar from './ExportBar.svelte';
  import ToolBar from './ToolBar.svelte';
  import { history } from '../../stores/history.svelte';
  import { scheduleAutosave, hasAutosave, restoreAutosave } from '../../stores/share';
  import { rankPresets, type ClosestMatch } from '../../engine/similarity';
  import { unlocks } from '../../stores/unlocks.svelte';
  import { playSystemSound } from '../xp/systemSounds';

  // Bascule d'écran remontée à App.svelte : depuis l'audit A1, l'Atelier n'a
  // plus de barre de navigation au-dessus de lui, c'est le menu « Mode » de
  // la ToolBar qui en tient lieu.
  let { onSwitchView }: { onSwitchView?: (v: 'atelier' | 'game' | 'live') => void } = $props();

  /* ---- La commande en cours -------------------------------------------
   *
   * ⚠️ Le cahier des charges est évalué EN DIRECT, à chaque modification, et
   * pas au moment de livrer. Un verdict rendu seulement à la livraison
   * transformerait la commande en devinette : on cliquerait, on se ferait
   * refuser, sans savoir laquelle des quatre lignes bloque ni ce qu'on vient
   * de casser. Les cases se cochent pendant qu'on travaille — c'est ce qui
   * fait de l'Atelier un outil et pas une salle d'examen.
   *
   * Le coût est nul à l'échelle : quelques tableaux de 32 cases relus quand le
   * motif change, et `rankPresets` (34 presets × 6 permutations) seulement
   * pour les commandes qui demandent un genre. */
  const commande = $derived(game.commande);
  /* La provenance ne vit pas dans l'état livré (voir `pattern.presetCharge`) :
     elle voyage à côté, et le cahier la reçoit ici — en direct comme à la
     livraison, sinon la case se cocherait à l'écran et refuserait au clic. */
  /* ⚠️ Le DÉPART voyage avec la livraison, comme la provenance du preset.
     Une contrainte qui mesure un geste (« chaque ligne a été regardée ») doit
     comparer à l'état sur lequel l'Atelier s'est ouvert — et depuis
     `partirDeLaLivraison`, ce n'est plus une donnée figée dans le cahier mais
     le morceau que le joueur a livré à l'étape d'avant. */
  const contexteLivraison = () => ({
    presetCharge: pattern.presetCharge,
    depart: game.departCommande(),
  });
  const verdict = $derived(
    commande ? evaluerCommande(pattern.snapshot(), commande.cahier, contexteLivraison()) : null,
  );

  /* ⚠️ Pas de branche « refus » ici, et c'est délibéré : le bouton est
     désactivé tant que le cahier n'est pas satisfait, donc une livraison
     refusée est INATTEIGNABLE. Une réplique de refus aurait été du code mort
     qui fait croire qu'un cas est traité. La liste au-dessus DIT déjà ce qui
     manque, en direct — c'est un meilleur refus qu'une phrase après coup. */
  function livrer() {
    if (game.livrerCommande(pattern.snapshot(), contexteLivraison())?.accepte) onSwitchView?.('game');
  }

  /* Rendre la main sans livrer — *« abandonner en cours de route »* (Yann,
     2026-09-04). Il n'y avait aucune sortie : le cahier restait ouvert tant
     qu'il n'était pas satisfait, et le seul moyen de partir était la barre de
     navigation, qui laissait la commande ouverte derrière elle.
     ⚠️ L'Atelier GARDE le travail : on abandonne la livraison, pas le morceau.
     Et aucune étoile n'est posée — un cahier abandonné n'est pas un cahier
     fait, mais il ne retire pas non plus celles d'une réussite précédente. */
  function abandonner() {
    game.abandonnerCommande();
    onSwitchView?.('game');
  }


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
  // Horodatage de l'arrivée du pas courant, par ligne synthé (voir `loop`).
  // Volontairement PAS un `$state` : personne n'a besoin de réagir à sa
  // valeur, elle n'est lue qu'au moment d'un appui sur le pad. En faire un
  // état réactif déclencherait un rendu à chaque pas de chaque ligne.
  /* ⚠️ `$state`, et pas un objet simple.
   *
   * Écrit à l'origine en `const synthStepAt: Record<...> = {...}` : muter un
   * objet non réactif ne redéclenche rien en Svelte 5, donc l'expression
   * `stepStartedAt={stepAt?.[name] ?? 0}` était évaluée UNE fois, au premier
   * rendu, alors que la valeur valait encore 0 — et ne bougeait plus jamais.
   * Conséquence : `quantizedCol()` prenait systématiquement son repli
   * `if (!stepStartedAt) return playheadCol`, c'est-à-dire qu'il écrivait sur
   * le pas EN COURS. Exactement le défaut que `engine/quantize.ts` a été écrit
   * pour éviter, module pur et testé branché sur une valeur morte. Trouvé en
   * instrumentant le pad, pas en relisant le code : rien à l'écran ne le
   * disait, et les tests du module passaient. */
  let synthStepAt = $state<Record<SynthRowName, number>>({ bass: 0, pad: 0, melody: 0 });

  /* L'horloge du son ENTENDU, en millisecondes — la même que `synthStepAt`.
   * Passée en fonction jusqu'au pad : elle doit être lue au moment de la
   * FRAPPE, pas au moment du rendu. Repli sur l'horloge murale tant qu'aucun
   * contexte audio n'existe (avant le premier ▶). */
  function horlogeAudioMs(): number {
    const t = engine.audioTime();
    return t === null ? performance.now() : t * 1000;
  }
  let fileInput: HTMLInputElement;

  // Curseur visuel : consommé à chaque frame contre l'horloge audio.
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as DrumRowName] = ev.col;
      else {
        synthPlayhead[ev.name as SynthRowName] = ev.col;
        // Instant d'arrivée du pas, pour quantifier ce qu'on joue au pad :
        // savoir QUEL pas joue ne suffit pas, il faut savoir depuis combien
        // de temps pour décider si un appui est « en retard sur celui-ci » ou
        // « en avance sur le suivant ».
        //
        // ⚠️ `ev.time` (temps AUDIO programmé du pas), pas `performance.now()`
        // au moment où cette frame consomme l'événement. L'ancien commentaire
        // affirmait que c'était « calé sur l'horloge audio » — ça ne l'était
        // pas : rAF ne tourne qu'à 60 Hz et ne passe jamais pile sur le pas,
        // ce qui ajoutait jusqu'à 16 ms d'erreur à chaque note écrite pendant
        // la lecture. Même faute que celle corrigée dans le Mode jeu.
        synthStepAt[ev.name as SynthRowName] = ev.time * 1000;
      }
    }
    breakArmed = engine.breakPending;
    raf = requestAnimationFrame(loop);
  }
  // Indicateur « le plus proche de ce que tu joues » — throttlé (le calcul
  // teste les 34 presets × 6 permutations de lignes).
  // Débouncé, pas throttlé : un throttle à early-return abandonnerait la
  // dernière modification d'une rafale (ex. le chargement d'un preset juste
  // après un clic) et laisserait un résultat périmé à l'écran.
  // Alimente l'analyseur de l'onglet Production. Calculé UNIQUEMENT quand cet
  // onglet est ouvert : c'est 34 presets x 6 permutations, et depuis que la
  // mention a quitté le bandeau sticky plus personne d'autre ne le lit — le
  // faire tourner toutes les 300ms pendant qu'on tape sur la grille serait du
  // travail jeté.
  let ranking = $state<ClosestMatch[]>([]);
  $effect(() => {
    if (activeTab !== 'effets') return;
    void pattern.state.rows.kick.pattern;
    void pattern.state.rows.snare.pattern;
    void pattern.state.rows.hat.pattern;
    void pattern.state.rows.kick.subdiv;
    void pattern.state.rows.snare.subdiv;
    void pattern.state.rows.hat.subdiv;
    const snapshot = pattern.snapshot();
    const t = setTimeout(() => (ranking = rankPresets(snapshot)), 300);
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
    { id: 'synth-filtre', label: 'Filtre & espace (Synthé)' },
    { id: 'synth-arpege', label: 'Jeu de la nappe (arpège & bourdon)' },
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
    /* Calibrage ouvert : l'écran ne répond plus qu'à lui.
     * Sans ça, la barre d'espace ferait DEUX choses — une frappe de mesure
     * (le panneau l'écoute) et un lancement de lecture (ce raccourci) : on
     * calibrerait le retard de l'appareil par-dessus le morceau qu'on vient
     * de démarrer sans le vouloir. Échap ferme, comme partout. */
    if (calibrage) {
      if (e.key === 'Escape') calibrage = false;
      return;
    }
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

  // Chargements déclenchés depuis le menu « Fichier » de la barre XP (audit
  // A6). L'état reste ici : `ToolBar` ne fait que déclencher, il n'écrit
  // jamais dans `pattern`. Rien n'est mémorisé sur le morceau chargé —
  // l'onglet Production n'affiche plus le morceau CHARGÉ mais le plus PROCHE,
  // qui se recalcule tout seul depuis le pattern.
  function loadPreset(p: SongPresetData, keepSynthAndTempo: boolean) {
    history.push();
    pattern.replace(presetToState(p, keepSynthAndTempo ? pattern.snapshot() : undefined, keepSynthAndTempo));
    // La provenance, pour le verrou des presets des commandes de style — voir
    // `pasUnPresetCharge`. Posée APRÈS le remplacement : elle enregistre
    // l'empreinte de ce qui vient d'être chargé.
    pattern.marquerPreset(p.id);
    refreshFx();
  }
  function loadBankEntry(id: string) {
    history.push();
    sequenceBank.load(id);
    refreshFx();
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

  /* Calibrage du décalage d'entrée, ouvert depuis le pad d'écriture.
   *
   * La lecture s'ARRÊTE d'abord : on ne mesure pas un métronome sous un
   * morceau — c'est la même précaution que dans le Mode jeu, et sans elle la
   * mesure serait faite sur des frappes calées à l'oreille sur autre chose.
   */
  let calibrage = $state(false);
  function ouvrirCalibrage() {
    // ⚠️ `stop()` tout court passe le typecheck et ne fait PAS ce qu'on croit :
    // c'est `window.stop()`, qui interrompt le chargement de la page. Le
    // transport de cet écran est `togglePlay`.
    if (playing) void togglePlay();
    calibrage = true;
  }
</script>

<div class="atelier" data-theme="luna">
  {#if calibrage}
    <!-- En SURCOUCHE et pas en panneau déroulant sous la ligne : le calibrage
         demande une douzaine de frappes régulières, et l'Atelier est un écran
         chargé. C'est aussi ce qui garantit que le pad de mesure fait la
         largeur qu'il lui faut, quel que soit l'onglet ouvert dessous. -->
    <div class="modale" role="dialog" aria-modal="true" aria-label="Calibrage du décalage">
      <div class="modale-corps">
        <XpWindow title="Calibrage du décalage" icon="🎚" accent="teal">
          <CalibrageLatence {engine} onClose={() => (calibrage = false)} />
        </XpWindow>
      </div>
    </div>
  {/if}

  {#if commande}
    <!-- La commande reste sous les yeux tant qu'elle n'est pas livrée : sans
         ça, on entre dans l'Atelier et on oublie ce qu'on venait y faire. -->
    <div class="commande">
      <div class="commande-tete">
        <span>📠 {commande.entete}</span>
        <span class="compte">{verdict?.lignes.filter((l) => l.ok).length ?? 0}/{commande.cahier.length}</span>
      </div>
      {#if commande.chapeau}
        <!-- La DESCRIPTION du genre. Elle vient de la fiche de style, celle-là
             même qui juge la livraison : décrire le style d'un côté et le
             mesurer de l'autre donnerait deux vérités qui divergent au premier
             ajustement (voir `model/styles.ts`). -->
        <p class="chapeau">{#each commande.chapeau as ligne (ligne)}{ligne}<br />{/each}</p>
      {/if}
      <ul>
        {#each verdict?.lignes ?? [] as l, i (l.contrainte.id)}
          <!-- Le titre d'étape, quand la commande se fait en plusieurs temps :
               un cahier à plat ne dit pas qu'il y a deux gestes différents à
               faire, ni dans quel ordre. Affiché au CHANGEMENT de section,
               donc jamais deux fois de suite. -->
          {#if l.contrainte.section && l.contrainte.section !== verdict?.lignes[i - 1]?.contrainte.section}
            <li class="etape">{l.contrainte.section}</li>
          {/if}
          <li class:ok={l.ok}>{l.ok ? '☑' : '☐'} {l.contrainte.libelle}</li>
          {#if l.contrainte.details}
            <!-- Le détail d'une contrainte de style : sans lui, un refus dit
                 « pas assez dancehall », ce qui n'est pas un retour — on ne
                 sait pas quoi changer. -->
            <ul class="critères">
              {#each l.contrainte.details(pattern.state, contexteLivraison()) as d (d.id)}
                <li class:ok={d.ok}>{d.ok ? '✓' : '·'} {d.libelle}</li>
              {/each}
            </ul>
          {/if}
        {/each}
      </ul>
      <!-- ⚠️ Le bouton nomme le CLIENT de la commande, pas Sol. Défaut noté en
           livrant l'acte 4 (« LIVRER À SOL » alors que le client est Le
           Tunnel) et corrigé ici, l'acte 3 en ayant fait le troisième cas :
           Sol n'est pas la destinataire, elle est la patronne. -->
      <div class="commande-actions">
        <button class="xp-btn primary tap44-y" disabled={!verdict?.accepte} onclick={livrer}>
          Livrer à {commande.client} ▸
        </button>
        <button class="xp-btn tap44-y" onclick={abandonner}>Laisser tomber</button>
      </div>
    </div>
  {/if}

  <ToolBar
    bind:circleView
    {onSwitchView}
    onLoadPreset={loadPreset}
    onLoadBank={loadBankEntry}
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
       l'accès à Rythme/Synthé/Effets. L'anneau rappelle le rythme en
       couleur sans reproduire tout le séquenceur éditable — un aperçu, pas
       un second éditeur. Le texte (raccourcis clavier, « le plus proche »)
       n'a pas sa place sur mobile : masqué au toucher, gardé sur desktop où
       la largeur ne manque pas.
       Le TEMPO y a rejoint Lecture/Break (audit A6) : c'est le seul réglage
       du bloc preset supprimé qu'on touche PENDANT que ça joue, donc sa
       place est ici et pas dans un menu. Il tient dans les 64px rendus par
       le passage à un seul anneau — un échange, pas un ajout. -->
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
      <!-- L'afficheur de la maquette : le tempo se lit d'un coup d'œil pendant
           qu'on joue, sans aller chercher la glissière sous le séquenceur.
           C'est un AFFICHEUR, pas un réglage — la glissière reste la commande,
           et il n'y a donc rien à désambiguïser entre les deux. -->
      <span class="bpm" aria-hidden="true">{st.tempo}<small>BPM</small></span>
      <!-- Les anneaux de transport occupaient cette place : ils redisaient la
           position de lecture, que la tête de lecture montre déjà sur chaque
           grille, ligne par ligne et au pas près. L'analyseur, lui, montre ce
           qu'AUCUN autre élément de l'écran ne montre — le son qui sort. Et
           c'est le visualiseur de Winamp, donc il est chez lui. -->
      <div class="viz">
        <SpectrumAnalyser
          getSpectrum={(out) => engine.getSpectrum(out)}
          size={engine.spectrumSize}
          height={32}
        />
      </div>
    </div>
    <!-- « Le plus proche » a quitté ce bandeau pour l'analyseur de l'onglet
         Production (idée de Yann) : ici il était masqué sur mobile faute de
         place, donc invisible pour la moitié des usages, et réduit à un nom
         plus un pourcentage — sans le contexte qui lui donnait un intérêt. -->
    <p class="hint desktop-hint">Espace : lecture/stop · B : break · Ctrl+Z : annuler</p>
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
    <!-- « Effets » renommé « Production » (audit A6) : l'onglet ne contient
         plus seulement les effets de bus mais tout ce qui n'est pas l'édition
         des notes — mix, export, banque de séquences, et les textes du
         morceau chargé. -->
    <!-- Un onglet verrouillé n'est plus affiché du tout (arbitrage de Yann
         après une partie complète). L'onglet Rythme reste seul tant que le
         récit n'a rien ouvert d'autre : moins d'écran, et rien qui présente le
         jeu par ce qu'on ne peut pas faire. -->
    <XpTabs
      tabs={[
        { id: 'rythme', label: '🥁 Rythme' },
        ...(unlocks.has('synth') ? [{ id: 'synthe', label: '🎹 Synthé' }] : []),
        ...(unlocks.has('production') ? [{ id: 'effets', label: '🎚 Production' }] : []),
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
        <!-- Règle de temps (audit A5) : affichée UNE fois en tête plutôt que
             sur chaque ligne — les repères eux-mêmes sont dessinés sur chaque
             grille par `.beat-grid`, ici on ne fait que les nommer. Elle
             s'aligne naturellement sur les grilles : `.cells` et cette règle
             occupent la même largeur dans le corps de la fenêtre. -->
        <div class="beat-ruler" aria-hidden="true">
          <span>1</span><span>2</span><span>3</span><span>4</span>
        </div>
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
        <StatusLcd />
      {/if}
    </XpWindow>
  {:else if activeTab === 'effets'}
    <XpWindow title="Séquenceur général" icon="🎼" accent="teal">
      <GeneralSequencer state={st} {playhead} {synthPlayhead} />
    </XpWindow>
  {/if}

  <!-- Le bloc preset a DISPARU (audit A6). Il pesait 203 à 296px selon la
       largeur, et sur ses huit éléments trois n'étaient que des doublons des
       menus (Vue circulaire → Affichage, Sauver/Charger → Fichier). Les
       autres ont trouvé un domicile qui leur correspond : le tempo dans la
       barre de transport (on le touche en jouant), le choix du morceau et le
       rappel de séquence dans le menu « Fichier » (une liste déroulante
       reste une liste déroulante, mais gratuite en hauteur), les textes du
       morceau et la gestion de la banque dans l'onglet Production (ils
       demandent de la place, un menu ne peut pas les porter).
       Le champ de fichier reste ici : invisible, il n'appartient à aucune
       zone, et c'est `onImport` du menu Fichier qui le déclenche. -->
  <input type="file" accept="application/json" hidden bind:this={fileInput} onchange={importJson} />

  <!-- Le tempo est SOUS le séquenceur (idée de Yann : « une section tempo
       sous le séquenceur drum »), et mesuré comme le meilleur des trois
       emplacements essayés :
        - dans la barre sticky : +66px PERMANENTS sur téléphone, il n'y tient
          pas sur la ligne de Lecture/Break à 390px donc il y prend sa propre
          rangée, qui reste à l'écran sur les trois onglets ;
        - juste sous la barre sticky : +46px au-dessus de la ligne de
          flottaison, le séquenceur redescend d'autant ;
        - ici : zéro coût sur les deux, et il reste à un pouce du contenu
          qu'on est en train d'éditer.
       Ce n'est pas un contrôle qu'on « chevauche » comme Lecture ou Break :
       on pose un tempo, on le retouche, on n'y revient pas à chaque mesure. -->
  <!-- Réservé à l'onglet Rythme (retour de Yann, 2026-08-17 : « tempo :
       est-ce nécessaire de le régler ici ? » — non). Sur Synthé, il tombait
       juste sous la barre sticky, faute de séquenceur batterie au-dessus de
       lui : 66px de chrome en tête d'un onglet qui en comptait déjà 561
       avant la première case jouable. Le tempo se pose avec le rythme, on
       n'y revient pas en écrivant une mélodie. -->
  {#if activeTab === 'rythme'}
  <div class="tempo-strip">
    <!-- `step` à 1 et non 10 (retour de Yann : « on le règle un peu partout,
         c'est bizarre et pas cohérent. Il faudrait qu'on puisse le régler à
         l'unité »). Avec un cran de 10, `XpSlider` arrondissait AUSSI la
         valeur tapée au clavier — taper « 123 » donnait 120, ce qui rendait
         le réglage à l'unité littéralement impossible. Et le Mode Live, lui,
         faisait déjà ±1 BPM : ce n'est donc pas le nombre d'endroits qui
         gênait, c'est que le même réglage n'obéisse pas aux mêmes règles
         selon l'écran. Les flèches ↑/↓ font ±1, Page↑/↓ ±10 (XpSlider) —
         le geste « par dizaines » ne se perd pas. -->
    <XpSlider label="Tempo" min={40} max={200} step={1} unit=" BPM" bind:value={st.tempo} />
    <button class="xp-btn tap" onclick={tapTempo} title="Tape le tempo en rythme, au moins deux fois">
      👆 Tap
    </button>
  </div>
  {/if}

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
      <SynthModule
        playhead={synthPlayhead}
        {playing}
        stepAt={synthStepAt}
        horloge={horlogeAudioMs}
        onPreviewDegree={(n, d, o) => engine.playDegreePreview(n, d, o)}
        onPreviewChord={(i) => engine.playChordPreview(i)}
        onCalibrer={ouvrirCalibrage}
        latenceSortieMs={() => engine.latenceSortieMs()}
        onFxChanged={refreshFx}
      />
    {:else}
      <XpWindow title="Effets de bus & mix" icon="🔊" accent="teal">
        <div class="two-col" data-group="effets-bus">
          <XpSlider label="Saturation" min={0} max={100} unit="%" bind:value={st.globalSaturation} onchange={refreshFx} />
          <XpSlider label="Compression" min={0} max={100} unit="%" bind:value={st.globalCompression} onchange={refreshFx} />
          <XpSlider label="Bitcrush" min={0} max={100} unit="%" bind:value={st.globalBitcrush} onchange={refreshFx} />
          <XpSlider label="Volume général" min={50} max={150} unit="%" bind:value={st.finalVolume} onchange={refreshFx} />
        </div>
        <label class="chk tap44-y" data-group="effets-bus">
          <input type="checkbox" bind:checked={st.synthGlobal.limitersEnabled} onchange={refreshFx} />
          Limiteurs de sécurité
        </label>
      </XpWindow>

      <!-- Ce que le bloc preset supprimé (audit A6) a légué à cet onglet :
           les deux choses qui demandent de la place et qu'un menu ne peut
           pas porter. La gestion de la banque (enregistrer, renommer,
           supprimer) est un petit CRUD — en pleine largeur ici, ses quatre
           boutons ne débordent plus comme dans l'ancien bloc étroit. -->
      <XpWindow title="Banque de séquences" icon="🗄" accent="teal">
        <SequenceBank />
      </XpWindow>

      <XpWindow title="Analyseur de rythme" icon="🔍" accent="teal">
        <RhythmAnalyser state={st} {ranking} />
      </XpWindow>
    {/if}
  </div>

  <!-- ⚠️ L'EXPORT VIT HORS DES ONGLETS, et c'est un correctif, pas un choix de
       mise en page. Il était dans l'onglet Production — donc verrouillé
       jusqu'à l'acte 4 — alors que la livraison de l'acte 1 dit mot pour mot
       « Exporte-le en MP3, mets-le sur ton téléphone : c'est ta sonnerie ».
       Le jeu ordonnait ce qu'il interdisait (retour de Yann : « l'atelier de
       prod est fermé, on ne peut pas exporter sa sonnerie »).

       Sa place est ici parce qu'exporter n'est pas un réglage de production :
       c'est FINIR. On emporte ce qu'on vient de faire, quel que soit l'onglet
       ouvert et quels que soient les modules déverrouillés. -->
  <ExportBar {engine} {playing} {recordLive} />
</div>

<style>
  /* La commande en cours — un fax épinglé en haut de l'établi. Le compteur
     et les cases se mettent à jour pendant qu'on travaille : c'est ce qui
     évite d'avoir à deviner ce qui bloque au moment de livrer. */
  .commande {
    margin: 0 0 8px;
    padding: 8px 10px;
    background: var(--xp-face);
    box-shadow: inset 1px 1px 0 var(--xp-light), inset -1px -1px 0 var(--xp-shadow);
  }
  .commande-tete {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: var(--xp-size-xs, 8.5px);
    letter-spacing: var(--xp-ls-xs, 0.08em);
    text-transform: uppercase;
    color: var(--xp-ink-dim, #9aa);
  }
  .commande-tete .compte {
    color: var(--xp-lcd);
  }
  /* Livrer et laisser tomber côte à côte : la sortie doit être aussi visible
     que l'entrée, sinon elle n'existe pas. Elles s'empilent sous 320 px. */
  .commande-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .commande ul {
    margin: 6px 0;
    padding: 0;
    list-style: none;
  }
  /* Ambre et pas vert : dans cette grammaire le vert dit « allumé / fait »,
     or un titre d'étape n'est pas un état. Et surtout pas `--xp-lcd-dim`, qui
     est fait pour un segment sur fond d'afficheur noir — mesuré à 1,5:1 sur le
     chrome du panneau, donc illisible. */
  .commande li.etape {
    margin: 10px 0 3px;
    color: var(--xp-accent-amber);
    letter-spacing: var(--xp-ls-tag);
    font-size: var(--xp-size-tag);
  }
  .commande .chapeau {
    margin: 0 0 8px;
    font-size: var(--xp-size-small);
    line-height: 1.5;
    color: var(--xp-muted);
  }
  .commande ul.critères {
    margin: 2px 0 6px 14px;
    padding: 0;
  }
  .commande ul.critères li {
    font-size: var(--xp-size-small);
    color: var(--xp-muted);
  }
  .commande ul.critères li.ok {
    color: var(--xp-lcd);
  }
  .commande li {
    font-size: var(--xp-size-sm, 9.5px);
    letter-spacing: var(--xp-ls-sm, 0.04em);
    padding: 2px 0;
    color: var(--xp-ink-dim, #9aa);
  }
  .commande li.ok {
    color: var(--xp-lcd);
  }

  /* Surcouche du calibrage. `position: fixed` et non `absolute` : l'Atelier
     défile, et une mesure au métronome ne doit pas pouvoir sortir de l'écran
     pendant qu'on tape. */
  .modale {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px;
    background: rgb(0 0 0 / 0.55);
    overflow: auto;
  }
  .modale-corps {
    width: min(560px, 100%);
  }

  .transport-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }
  /* `nowrap` : Lecture et Break ne se séparent JAMAIS. En `wrap`, sous 500px,
     ils passaient l'un sous l'autre et la barre doublait de hauteur — 78px au
     lieu de 34, exactement là où la hauteur est comptée. Ce sont les deux
     boutons les plus utilisés de l'application ; les empiler pour gagner de la
     largeur, c'est payer au mauvais endroit. */
  .transport {
    display: flex;
    flex-wrap: nowrap;
    flex: none;
    gap: 6px;
  }
  /* 22px : la seule grande typographie de l'Atelier, et c'est voulu — un ampli
     a un afficheur, et c'est le nombre qu'on lit de loin. Vert LCD, l'unité en
     retrait, alignés sur la ligne de base comme sur un vrai cadran. */
  .bpm {
    /* L'espace libre se regroupe ICI, en une seule coupure entre le transport
       à gauche et le bloc afficheur+analyseur à droite. Avant, il était
       réparti au hasard : 492px de trou entre les boutons et un analyseur
       collé au bord droit. Une barre d'appareil se lit en deux blocs, pas en
       trois îlots. */
    margin-left: auto;
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: var(--xp-lcd);
  }
  .bpm small {
    font-size: var(--xp-size-small);
    font-weight: 400;
    color: var(--xp-muted);
  }
  /* L'analyseur ABSORBE la place libre au lieu qu'un `.spacer` la laisse vide.
     Un `flex: 1` à la place d'une largeur figée, et le vide disparaît par
     construction : il valait 32px sur téléphone et jusqu'à 492px à 1280, ce
     qui coupait la barre en deux îlots séparés par rien. C'est aussi ce que
     fait la fenêtre de Winamp — le visualiseur occupe ce qui reste.
     `min-width: 0` est indispensable : un élément flex refuse par défaut de
     descendre sous sa taille de contenu, et pousserait la barre au lieu de
     rétrécir. Le nombre de barres, lui, s'adapte à la largeur obtenue (voir
     SpectrumAnalyser). */
  .viz {
    flex: 1 1 0;
    min-width: 0;
    /* Borné, et pas seulement pour la mesure : le spectre d'une boîte à
       rythmes vit dans les graves, les barres du haut du registre ne
       s'allument qu'aux coups de hat. Étalé sur 520px, l'afficheur paraissait
       à moitié vide en permanence. À 380 il est dense — et c'est aussi
       l'ordre de grandeur du visualiseur de Winamp, qui était une petite
       fenêtre à côté de l'afficheur, pas un bandeau. */
    max-width: 380px;
  }
  /* Sous 400px, ce qui reste après Lecture/Break et l'afficheur fait une
     quarantaine de pixels : à cette largeur un analyseur ne dit plus rien, il
     ressemble à un rectangle noir oublié. Il s'efface, et l'afficheur BPM se
     cale à droite — la barre reste lisible au lieu d'être encombrée par un
     élément décoratif. C'est le seul écran où on renonce au visualiseur. */
  @media (max-width: 400px) {
    .viz {
      display: none;
    }
  }
  .hint {
    font-size: 9px;
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
    font-size: 9px;
    color: var(--xp-muted);
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Chantier tactile : `overflow: hidden` (l'ellipse d'une seule ligne)
     recadre le pseudo-élément de `.tap44-y`, qui ne sert donc à rien ici. Le
     remplissage, lui, vit DANS la boîte recadrée. Compensé par une marge
     négative : la bande passe à 45px, le bandeau ne bouge pas d'un pixel. */
  @media (pointer: coarse) {
    .production-hint {
      padding: 16px 0;
      margin: -16px 0;
    }
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
  .restore {
    font-size: var(--xp-size-body);
    background: var(--xp-lcd-bg);
    color: var(--xp-accent-amber);
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
  /* Bandeau tempo, juste sous la barre sticky. Bordé comme les autres blocs
     de l'Atelier ; le bouton Tap ne s'étire pas. */
  .tempo-strip {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--xp-face);
    border: 1px solid var(--xp-line);
    border-radius: 8px;
    padding: 4px 10px;
    margin: 8px 0;
    box-shadow: 0 2px 6px rgba(0, 0, 30, 0.12);
  }
  .tempo-strip :global(.xp-slider-outer) {
    flex: 1;
    min-width: 0;
  }
  .tempo-strip .xp-btn.tap {
    white-space: nowrap;
    padding: 8px 10px;
    flex: none;
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
    font-size: 9px;
    padding: 6px 10px;
    min-height: 28px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    cursor: pointer;
  }
  /* Cible tactile (audit A3) : 21px de haut avant — pour Lecture et Break,
     les deux boutons les plus utilisés de toute l'application. */
  /* Apparence dans styles/global.css ; ici, la taille seule. */
  .xp-btn {
    padding: 8px 16px;
    min-height: 32px;
    /* Lecture et Break gardent la taille de la maquette comme les autres :
       c'est le remplissage et la hauteur minimale qui les distinguent, pas
       un corps plus gros. */
    font-size: var(--xp-size-btn);
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.primary {
    font-weight: 700;
  }
  .xp-btn.armed {
    background: linear-gradient(180deg, #e0a52b, #a86f10);
    color: var(--xp-lcd-bg);
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
    font-size: var(--xp-size-body);
  }
  select {
    font-family: var(--xp-font);
    font-size: var(--xp-size-body);
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  /* Chantier tactile (cf. styles/global.css) : les enveloppes invisibles de
     `.tap44` se marchent dessus dès que deux commandes sont voisines à
     quelques pixels. On écarte sous pointeur grossier — l'espace n'est pas
     du dessin, et sur un téléphone la page défile de toute façon. */
  @media (pointer: coarse) {
    .transport-row {
      gap: 16px;
      margin-bottom: 10px;
    }
    .transport {
      gap: 10px;
    }
  }
</style>
