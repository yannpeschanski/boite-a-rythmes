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
  // POURQUOI TROIS RANGÉES (2026-08-24, « il faut montrer les 3 rangées de
  // notes dans le clavier de sélection des notes »). L'octave fait PARTIE de
  // la note (`SynthNote = { degree, octave }`) : la cacher derrière un
  // sélecteur −1/0/+1 en dessous du clavier en faisait un MODE — on posait une
  // note à l'octave où on avait laissé le bouton, et rien dans la touche ne
  // disait laquelle. Les trois octaves du modèle sont donc les trois rangées
  // du clavier, aigu en haut comme sur le pad XY du Mode Live : une note
  // reste un appui, mais l'appui dit désormais aussi l'octave, et le
  // sélecteur disparaît (il n'aurait plus rien à régler).
  //
  // La rangée du milieu n'est pas la même touche répétée trois fois : chaque
  // touche porte, sous le nom, l'étiquette EXACTE de la case qu'elle va
  // écrire — « 5 », « 5▴ », « 5▾ » — la marque d'octave étant celle que la
  // grille affiche déjà (`octaveMark`, SynthRowView). Le clavier montre ce
  // qu'il écrit.
  //
  // POURQUOI LA NAPPE EST DANS CE COMPOSANT ET PAS DANS UN SECOND PAD
  // (2026-08-24, « il faut un pad pour les nappes aussi »). Ce que la Nappe
  // pose n'est pas un degré mais un INDEX D'ACCORD (`-1` pour le silence) —
  // le clavier change donc entièrement : quatre à sept touches d'accords, une
  // seule rangée, pas d'octave. Mais tout ce qui l'entoure est identique au
  // millimètre : le curseur pas-à-pas, l'enregistrement en direct, la
  // quantification au pas le plus proche avec la latence mesurée, le silence
  // qui efface et avance. Un second composant aurait dupliqué exactement la
  // partie difficile — celle qui a coûté deux corrections de câblage
  // (`synthStepAt`, `latence.ms`) — pour ne varier que la partie facile.
  // C'est le même arbitrage que `comparerGrilles(colonnes)` côté Mode jeu :
  // un seul chemin, paramétré, plutôt que deux qui doivent rester d'accord.
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
  import type { ChordDef } from '../../model/presets/scales';
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
    onPreviewChord,
    onChanged,
    onClose,
    onCalibrer,
    latenceSortieMs,
  }: {
    name: SynthRowName;
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
    /** Basse/Mélodie : faire entendre un degré avant qu'il ne s'écrive. */
    onPreview?: (degree: number, octave: number) => void;
    /** Nappe : faire entendre un accord. Deux rappels et non un seul à valeur
        union — chacun descend vers une méthode du moteur qui porte son nom. */
    onPreviewChord?: (chordIdx: number) => void;
    onChanged?: () => void;
    onClose?: () => void;
    /** Ouvrir le calibrage du décalage d'entrée (remonte jusqu'à l'Atelier,
        qui possède le moteur audio). */
    onCalibrer?: () => void;
    /** Retard de sortie DÉCLARÉ par le navigateur, en ms. Sert uniquement à
        dire au joueur quand le calibrage devient utile. */
    latenceSortieMs?: () => number;
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

  // La Nappe pose des accords : son clavier est la liste des accords
  // disponibles, qui suit `chordCount` (4 à 7) et la tonalité — pas une liste
  // en dur. Changer de gamme dans le module Synthé rebaptise les touches.
  const isPad = $derived(name === 'pad');
  const accords = $derived<ChordDef[]>(isPad ? chords : []);
  // Nom réel de la fondamentale de l'accord, même service que `noms` pour les
  // degrés : « I » ne dit rien à qui ne lit pas le chiffrage, « Do » si.
  const nomsAccords = $derived(
    accords.map((c) => noteNameForScaleDegree(scaleFor(pattern.state), pattern.state.synthGlobal.rootMidi, c.root)),
  );

  // Ce qui est DÉJÀ écrit sur le pas visé. La grille l'affiche, mais on
  // regarde le clavier au moment d'appuyer : sans ce repère on ne sait pas si
  // on pose ou si on remplace. Réservé à la Nappe — sur Basse/Mélodie la
  // teinte est déjà prise par « dans l'accord en cours ».
  const accordPose = $derived.by(() => {
    if (!isPad) return -1;
    const v = row.pattern[target];
    return typeof v === 'number' ? v : -1;
  });

  function write(col: number, note: SynthNote | number | null) {
    if (col < 0 || col >= steps) return;
    row.pattern[col] = note;
    if (note === null || note === -1) row.rolls[col] = 1;
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

  function tap(degree: number, octave: number) {
    onPreview?.(degree, octave);
    rafraichirRetard();
    const col = quantizedCol();
    write(col, { degree, octave });
    if (!playing) cursor = (safeCursor + 1) % steps;
  }

  function tapAccord(idx: number) {
    onPreviewChord?.(idx);
    rafraichirRetard();
    const col = quantizedCol();
    write(col, idx);
    if (!playing) cursor = (safeCursor + 1) % steps;
  }

  /* Le silence de la Nappe s'écrit -1 et non `null` : c'est le format v2 qui
     le dit (types.ts, « pad : index d'accord (0..chordCount-1) ou -1/null »),
     et c'est ce que `cycleCell` écrit déjà. Écrire `null` marcherait à la
     lecture — le scheduler teste `>= 0` — mais ferait deux représentations du
     même silence dans les fichiers de sauvegarde. */
  function silence() {
    const col = quantizedCol();
    write(col, isPad ? -1 : null);
    if (!playing) cursor = (safeCursor + 1) % steps;
  }

  // Même signe que la case de la grille (SynthRowView.octaveMark) : le pad
  // annonce littéralement ce qui s'écrira.
  function marque(o: number): string {
    return o > 0 ? '\u25b4' : o < 0 ? '\u25be' : '';
  }

  const nomOctave = (o: number): string => (o > 0 ? 'octave aiguë' : o < 0 ? 'octave grave' : 'octave centrale');

  /* Quand le calibrage cesse d'être une option et devient nécessaire.
   *
   * Un casque Bluetooth déclare couramment 100 à 200 ms ; au-delà d'un
   * demi-pas, une note jouée EN MESURE avec ce qu'on entend s'écrit sur le pas
   * suivant — le motif entier sonne en retard d'un cran. Ça ne se voit pas en
   * jouant : on entend son propre décalage comme « juste », puisque tout est
   * décalé pareil. D'où ce mot, avec LE CHIFFRE : « ton appareil déclare
   * 180 ms » est vérifiable, « pense à calibrer » est du bruit.
   *
   * Seuil à 60 ms : au-dessous, c'est un tampon de sortie ordinaire (32 ms
   * mesurés en filaire) et le calibrage ne changerait presque rien. Et rien ne
   * s'affiche dès que le réglage est posé, quel qu'il soit — y compris remis à
   * zéro sciemment.
   */
  const SEUIL_ALERTE_MS = 60;
  /* ⚠️ `$state` et non `$derived` — et c'est le piège de câblage habituel du
   * projet (CLAUDE.md, « suspecter le câblage, pas le calcul »). Un dérivé qui
   * appelle `latenceSortieMs()` ne dépend d'AUCUNE rune : il se calcule une
   * fois, à un moment où le contexte audio n'existe même pas encore (il naît au
   * premier son), et ne se recalcule plus jamais. Mesuré au navigateur avec un
   * `outputLatency` forcé à 180 ms : l'avertissement ne s'affichait pas.
   *
   * On rafraîchit donc explicitement là où la valeur peut CHANGER : à
   * l'ouverture du pad, et après chaque aperçu — c'est l'aperçu qui crée le
   * contexte audio, donc la première frappe est exactement le moment où le
   * chiffre passe de 0 à sa vraie valeur. */
  let retardDeclare = $state(0);
  const casqueLent = $derived(latence.ms === 0 && retardDeclare >= SEUIL_ALERTE_MS);

  function rafraichirRetard(): void {
    retardDeclare = latenceSortieMs?.() ?? 0;
  }
  rafraichirRetard();

  function back() {
    cursor = (safeCursor - 1 + steps) % steps;
  }
</script>

<div class="note-pad" data-group="synth-pad">
  <div class="note-pad-head">
    <strong>Pad — {name === 'bass' ? 'Basse' : name === 'pad' ? 'Nappe' : 'Mélodie'}</strong>
    <span class="where">
      {#if playing}
        enregistre en direct
      {:else}
        pas {target + 1} / {steps}
      {/if}
    </span>
    <!-- Le calibrage s'ouvre DEPUIS le pad, parce que c'est ici qu'on sent le
         problème : ce qu'on joue en Bluetooth s'entend 100 à 200 ms trop tard,
         donc s'écrit un pas plus loin. Il vivait dans le Mode jeu, où
         personne n'allait le chercher en composant. -->
    <button class="mini tap44" onclick={onCalibrer} title="Calibrer le décalage de l’appareil (casque Bluetooth, dalle tactile)">
      🎚{latence.ms ? ` ${latence.ms > 0 ? '+' : ''}${latence.ms}` : ''}
    </button>
    <button class="mini tap44" onclick={onClose} title="Fermer le pad">✕</button>
  </div>

  <!-- `onpointerdown` et non `onclick` (retour de Yann, 2026-08-17 : « il y a
       un petit délai entre la touche de la case et la note qui se joue »).
       Sur mobile, un `click` ne part qu'au RELÂCHEMENT du doigt : la note
       attendait qu'on lève la main. Les cases de batterie écoutaient déjà
       `onpointerdown` — l'écart était chez le pad. `preventDefault` empêche
       le click fantôme qui suivrait et jouerait la note une seconde fois. -->
  {#if isPad}
    <!-- Clavier d'ACCORDS. Une seule rangée : un accord n'a pas d'octave dans
         le format v2, et les quatre à sept touches sont larges d'office. -->
    <div class="keys accords" style:--cols={accords.length + 1}>
      {#each accords as c, i (c.id)}
        <button
          class="key"
          class:pose={accordPose === i}
          onpointerdown={(e) => {
            e.preventDefault();
            tapAccord(i);
          }}
          title={`${c.label}${accordPose === i ? ' — déjà posé sur le pas visé' : ''}`}
        >
          <span class="nom">{nomsAccords[i]}</span>
          <span class="deg">{c.roman}</span>
        </button>
      {/each}
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
  {:else}
  <div class="keys">
    <!-- Placement explicite plutôt qu'auto : la touche de silence occupe la
         8e colonne sur les trois rangées, et une grille auto-placée ferait
         déborder la première rangée dans la case qu'elle laisse libre. -->
    {#each [1, 0, -1] as o (o)}
      {#each [1, 2, 3, 4, 5, 6, 7] as d (d)}
        <button
          class="key"
          class:inchord={chordDegrees.has(d)}
          class:aigu={o > 0}
          class:grave={o < 0}
          style:grid-column={d}
          style:grid-row={2 - o}
          onpointerdown={(e) => {
            e.preventDefault();
            tap(d, o);
          }}
          title={`${noms[d - 1]} (degré ${d}, ${nomOctave(o)})${chordDegrees.has(d) ? ' — dans l’accord en cours' : ''}`}
        >
          <span class="nom">{noms[d - 1]}</span>
          <span class="deg">{d}{marque(o)}</span>
        </button>
      {/each}
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
  {/if}

  <div class="bar">
    <span class="lab">
      {#if isPad}
        Chaque touche est un accord de la tonalité — le chiffrage est celui de la grille
      {:else}
        Rangée du haut = octave aiguë ▴, du bas = grave ▾
      {/if}
    </span>
    <div class="acts">
      <button class="mini tap44" onclick={back} disabled={playing} title="Reculer d’un pas">← pas précédent</button>
    </div>
  </div>

  {#if casqueLent}
    <p class="alerte">
      Ton appareil annonce <strong>{retardDeclare}&nbsp;ms</strong> de retard (un casque
      Bluetooth en ajoute 100 à 200). Joué en mesure avec ce que tu entends, ça s’écrit
      un pas trop loin — <button class="lien" onclick={onCalibrer}>mesure-le une fois</button>
      et les notes retombent juste.
    </p>
  {/if}

  <p class="hint">
    {#if playing}
      Chaque appui écrit la note sur le pas le plus proche.
    {:else}
      Chaque appui écrit {isPad ? 'un accord' : 'une note'} et avance d’un pas. Lance la lecture pour jouer en direct.
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
  /* Sept touches larges plutôt qu'un clavier, sur les trois rangées d'octave
     du modèle : sur 390px chacune fait ~48px de large pour 44 de haut. 44 et
     non 48 parce que la hauteur totale est désormais triple — c'est la cible
     tactile de référence du projet (`.tap44`), donc le plancher, pas un
     rognage : bien au-delà du minimum de 24px de l'audit A3. */
  .keys {
    display: grid;
    /* minmax(0, 1fr) et non 1fr : une piste de grille a un minimum
       `auto`, donc elle refuse de descendre sous la largeur de son
       contenu — « Sol » plus son remplissage. À 320px les sept touches
       débordaient de 14px. Même piège que celui corrigé sur XpSlider
       (audit A2), côté grille plutôt que flexbox. */
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-template-rows: repeat(3, auto);
    gap: 4px;
  }
  /* Le clavier d'accords compte ses colonnes lui-même : 4 à 7 accords selon
     `chordCount`, plus le silence. Pas de rangées, donc des touches un peu
     plus hautes — c'est la même surface totale que les trois rangées de
     degrés, et un accord se vise moins vite qu'une note. */
  .keys.accords {
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    grid-template-rows: auto;
  }
  .keys.accords .key {
    min-height: 56px;
  }
  .keys.accords .key.silence {
    grid-column: auto;
    grid-row: auto;
  }
  /* Accord déjà en place sur le pas visé : on regarde le clavier au moment
     d'appuyer, pas la grille — sans ce repère, on ne sait pas si on pose ou
     si on remplace. Même teinte que « dans l'accord en cours » côté degrés :
     dans les deux cas elle dit « c'est celui-là qui est juste ici ». */
  .key.pose {
    background: color-mix(in srgb, var(--cell-pad) 34%, var(--xp-face));
    border-color: color-mix(in srgb, var(--cell-pad) 60%, var(--xp-line));
  }
  .key {
    min-height: 44px;
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
    /* Une seule touche pour les trois rangées : effacer un pas ne dépend pas
       de l'octave, et la cible reste la plus grande du pad — c'est un geste
       aussi fréquent que poser une note. */
    grid-column: 8;
    grid-row: 1 / -1;
  }
  /* Les rangées se distinguent AUSSI sans lire la marque : un voile d'un cran,
     grave plus sombre, aigu plus clair. Un cran, pas une couleur — la teinte
     est déjà prise par « dans l'accord en cours », et deux signaux de couleur
     superposés n'en font plus aucun.
     Voile SUPERPOSÉ et non `color-mix` : `--xp-btn-face` est un dégradé (le
     biseau lui-même), et `color-mix` n'accepte que des couleurs — la règle
     tombait invalide, la touche perdait son relief et se retrouvait à plat
     sur la face du panneau. Mesuré à l'écran : seule la rangée du milieu,
     celle qui ne portait pas de voile, gardait son biseau. */
  .key.grave {
    background-image: linear-gradient(rgb(0 0 0 / 0.16), rgb(0 0 0 / 0.16)), var(--xp-btn-face);
  }
  .key.aigu {
    background-image: linear-gradient(rgb(255 255 255 / 0.09), rgb(255 255 255 / 0.09)), var(--xp-btn-face);
  }
  .key.inchord,
  .key.inchord.grave,
  .key.inchord.aigu {
    background: color-mix(in srgb, var(--cell-melody) 34%, var(--xp-face));
    border-color: color-mix(in srgb, var(--cell-melody) 60%, var(--xp-line));
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
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
  .bar .lab {
    flex: 1;
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
  .mini:disabled {
    color: var(--xp-muted);
    cursor: not-allowed;
  }
  /* Un avertissement, pas une erreur : c'est le même vert d'afficheur que le
     reste du chrome, pas un rouge d'alarme — rien n'est cassé, il manque une
     mesure. */
  .alerte {
    margin: 0;
    padding: 5px 7px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd);
    font-size: var(--xp-size-small);
    line-height: 1.35;
  }
  .alerte strong {
    font-variant-numeric: tabular-nums;
  }
  .lien {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    color: var(--xp-lcd);
    text-decoration: underline;
    cursor: pointer;
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
