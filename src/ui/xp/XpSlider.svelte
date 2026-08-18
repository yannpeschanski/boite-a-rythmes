<script lang="ts">
  // Curseur XP « ergonomique » — port du curseur maison de l'original
  // (loupe + glissé de précision + saisie clavier).
  //
  // Choix validé après prototypage séparé (voir fichiers de test de
  // l'original) : la loupe suit le point de contact réel du doigt,
  // horizontalement ET verticalement, toujours un cran au-dessus pour rester
  // lisible malgré le doigt. Glisser plus bas pendant le geste réduit la
  // sensibilité (mode précis, bulle violette) — utile sur les curseurs à
  // grande plage (ex. Subdivision 1-32). Tap sur la valeur = saisie exacte
  // au clavier, en plus du glissé.
  //
  // Le <input type=range> natif est rendu purement visuel
  // (pointer-events:none) et enveloppé dans un span qui capte TOUT le geste
  // à sa place — le natif, malgré touch-action:none et preventDefault,
  // pouvait quand même continuer à se repositionner tout seul sur certains
  // navigateurs (comportement interne du <input type=range>, pas toujours
  // annulable via les event listeners standards) : la valeur réellement
  // retenue se calait alors sur SA position à lui plutôt que sur la loupe.
  // En le rendant purement visuel, il ne peut plus jamais capter le moindre
  // geste — tout passe exclusivement par cette enveloppe, qu'on contrôle
  // intégralement.
  import { paramHintsSettings, hintFor } from './paramHints.svelte';

  let {
    label,
    min = 0,
    max = 100,
    step = 1,
    unit = '',
    value = $bindable(0),
    onchange,
  }: {
    label: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    value?: number;
    onchange?: (v: number) => void;
  } = $props();

  // Explication légère (PLAN.md §7) : cherchée sur le libellé plutôt que
  // passée en prop par chaque appelant — ajouter une entrée à
  // paramHints.svelte.ts suffit à faire apparaître la bulle partout où ce
  // libellé est utilisé, sans toucher aux dizaines de call sites.
  const hint = $derived(paramHintsSettings.enabled ? hintFor(label) : undefined);

  let editing = $state(false);
  let editValue = $state('');

  // État du geste. Seuls dragging/precise/bubbleX/bubbleY pilotent le rendu ;
  // le reste est de la mécanique interne qui n'a pas besoin d'être réactive.
  let dragging = $state(false);
  let precise = $state(false);
  let bubbleX = $state(0);
  let bubbleY = $state(0);
  let wrapEl: HTMLSpanElement;

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let runningVal = 0;
  let lastCommitted = 0;

  // Clamp + arrondi au pas natif du curseur (même grille que l'original :
  // Math.round(v / step) * step), avec un nettoyage des résidus flottants
  // (0.1 + 0.2…) pour que la valeur affichée reste propre.
  function snap(v: number): number {
    const clamped = Math.max(min, Math.min(max, v));
    const snapped = parseFloat((Math.round(clamped / step) * step).toFixed(6));
    return Math.max(min, Math.min(max, snapped));
  }

  function applyValue(v: number) {
    value = v;
    onchange?.(value);
    lastCommitted = v;
  }

  function positionBubble(e: PointerEvent) {
    bubbleX = e.clientX;
    bubbleY = e.clientY - 44; // toujours au-dessus du doigt, jamais dessous
  }

  function onPointerDown(e: PointerEvent) {
    dragging = true;
    precise = false;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    runningVal = value;
    lastCommitted = value;
    try {
      wrapEl.setPointerCapture(e.pointerId);
    } catch {
      /* capture indisponible (vieux navigateur) : le drag marche quand même */
    }
    positionBubble(e);
    wrapEl.focus(); // le clavier prend le relais dès la fin du geste
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    // Distance parcourue depuis le DÉBUT DU GESTE (pas depuis le centre de
    // la piste, dont la hauteur — 6-8px — ne correspond pas à celle du pouce
    // visuel et faussait le seuil selon l'endroit exact où le doigt touchait
    // le pouce).
    const vertOffset = Math.max(0, e.clientY - startY);
    const horizOffset = Math.abs(e.clientX - startX);
    const stepCount = Math.max(1, (max - min) / step);
    // Un pouce qui « balaye horizontalement » dérive naturellement un peu à
    // la verticale (anatomie du pouce, mouvement en arc) — un seuil purement
    // vertical (l'ancien : >15px) se déclenchait donc par erreur au moindre
    // balayage rapide. Le mode précis n'est retenu que si le vertical DOMINE
    // clairement l'horizontal, pas juste s'il dépasse un petit seuil absolu.
    // Une fois enclenché, le mode précis reste actif jusqu'à la fin du geste
    // (relâché seulement au prochain pointerdown) — sinon un artefact
    // classique du tactile (le point de contact dérive quand le doigt
    // décolle de l'écran, la zone de contact change de forme) peut faire
    // retomber le calcul en mode rapide juste avant le relâchement, et le dx
    // horizontal de cet instant-là provoque un saut non voulu.
    if (!precise) precise = vertOffset > 40 && vertOffset > horizOffset * 1.2;
    // Plancher de largeur VIRTUELLE pour le calcul (pas d'effet visuel) :
    // sur un curseur étroit (~40-70px réels), un tout petit mouvement du
    // doigt représentait déjà une grosse fraction de la piste, donc un grand
    // saut de valeur — imprécis même en mode rapide. En comptant comme si la
    // piste faisait au moins 180px, il faut un geste plus ample et déterminé
    // pour parcourir toute la plage, quelle que soit la largeur réelle.
    const trackWidth = Math.max(wrapEl.offsetWidth || 1, 180);
    let deltaVal: number;
    if (!precise) {
      // Mode rapide : glissé horizontal classique, mappé sur toute la
      // largeur de la piste (comme un curseur natif).
      const dxStep = e.clientX - lastX;
      deltaVal = (dxStep / trackWidth) * (max - min);
    } else {
      // Mode précis : l'axe de contrôle bascule sur la VERTICALE — monter
      // AUGMENTE la valeur, descendre la DIMINUE (comme un fader), plus
      // c'est fin qu'on descend le doigt loin de la piste. La sensibilité
      // minimale s'adapte au nombre de crans du curseur : ~15 crans pour
      // toute la course verticale utile, quel que soit le curseur.
      const targetStepsAtMaxPrecision = 15;
      const minSensitivity = Math.min(1, targetStepsAtMaxPrecision / stepCount);
      const sensitivity = (1 - (1 - minSensitivity) * Math.min(vertOffset, 130) / 130);
      const dyStep = e.clientY - lastY; // positif = doigt vers le bas
      deltaVal = -(dyStep / trackWidth) * (max - min) * sensitivity;
    }
    lastX = e.clientX;
    lastY = e.clientY;
    // Accumulateur INCRÉMENTAL : chaque petit déplacement depuis la dernière
    // frame est ajouté à la valeur déjà atteinte — jamais recalculé depuis
    // le point de départ du geste, pour ne jamais faire sauter la valeur au
    // changement de mode.
    runningVal = Math.max(min, Math.min(max, runningVal + deltaVal));
    applyValue(snap(runningVal));
    positionBubble(e);
    e.preventDefault();
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    // Re-synchronisation explicite au relâchement : le curseur (purement
    // visuel désormais) reprend exactement la dernière valeur affichée par
    // la loupe — jamais une position qui lui serait propre.
    applyValue(lastCommitted);
  }

  // Accessibilité : le wrapper porte role="slider" et réagit aux flèches,
  // puisque le range natif (aria-hidden, tabindex -1) est purement visuel.
  function onKeydown(e: KeyboardEvent) {
    let v: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        v = value + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        v = value - step;
        break;
      case 'PageUp':
        v = value + step * 10;
        break;
      case 'PageDown':
        v = value - step * 10;
        break;
      case 'Home':
        v = min;
        break;
      case 'End':
        v = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    applyValue(snap(v));
  }

  function commitEdit() {
    const v = parseFloat(editValue.replace(',', '.'));
    if (Number.isFinite(v)) {
      // Même pas natif que le curseur (comme le commit de l'original).
      applyValue(snap(v));
    }
    editing = false;
  }
</script>

<!-- Enveloppe de requête de conteneur : c'est ELLE qui porte
     `container-type`, pas `.xp-slider` — un élément ne peut pas interroger
     sa propre taille pour décider de sa propre grille (référence
     circulaire). Le curseur s'adapte donc à la largeur de son CONTENEUR
     (colonne de `.two-col`, fieldset de ligne, barre de preset…) et non à
     celle de la fenêtre : c'est exactement la variable qui manquait, le
     même composant vivant dans des boîtes de 148px à 940px. -->
<div class="xp-slider-outer">
<div class="xp-slider">
  {#if hint}
    <button type="button" class="lab has-hint">{label}</button>
    <span class="hint-bubble" role="tooltip">{hint}</span>
  {:else}
    <span class="lab">{label}</span>
  {/if}
  <!-- Enveloppe qui capte tout le geste à la place du range natif (voir
       commentaire d'en-tête). touch-action:none : c'est elle qui gère le
       tactile, le navigateur ne doit ni scroller ni zoomer pendant. -->
  <span
    class="wrap"
    bind:this={wrapEl}
    role="slider"
    tabindex="0"
    aria-label={label}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-valuetext="{value}{unit}"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={endDrag}
    onpointercancel={endDrag}
    onkeydown={onKeydown}
  >
    <input type="range" {min} {max} {step} bind:value tabindex="-1" aria-hidden="true" />
  </span>
  {#if editing}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      class="val edit"
      autofocus
      bind:value={editValue}
      onblur={commitEdit}
      onkeydown={(e) => e.key === 'Enter' && commitEdit()}
    />
  {:else}
    <button
      class="val tap44"
      title="Cliquer pour saisir une valeur"
      onclick={() => {
        editValue = String(value);
        editing = true;
      }}>{value}{unit}</button
    >
  {/if}
  <!-- Loupe flottante : position:fixed, positionnée directement sur le doigt
       donc jamais recadrée par un ancêtre avec overflow. L'élément reste
       monté en permanence (opacité pilotée) pour garder le fondu de
       disparition de l'original. -->
  <div
    class="magnifier"
    class:visible={dragging}
    class:precise
    style:left="{bubbleX}px"
    style:top="{bubbleY}px"
    aria-hidden="true"
  >
    {value}{unit}
  </div>
</div>
</div>

<style>
  .xp-slider-outer {
    container-type: inline-size;
    /* `min-width: 0` est indispensable depuis que la grille interne a des
       colonnes bornées (104 + 110 + 52 + gaps ≈ 274px de min-content) : un
       élément flex a `min-width: auto` par défaut, donc il REFUSE de
       descendre sous sa taille de contenu et déborde son conteneur au lieu
       de rétrécir. C'est ce qui a fait sortir « Nb d'accords » de la fenêtre
       Synthé. Posé ici, sur la racine du composant, plutôt que répété dans
       chaque parent flex qui accueille un curseur — sinon le prochain call
       site oubliera. Une fois rétréci, la requête de conteneur ci-dessous
       bascule proprement sur deux lignes. */
    min-width: 0;
  }
  /* Proportions (audit A2/B1/B2 du 2026-08-15, rouvre la passe de densité
     §7.2.1). Trois bornes remplacent les trois largeurs figées :
     - libellé 104px au lieu de 72 — assez pour « Filtre passe-bas »,
       « Coups euclidiens », « Vélocité aléatoire », les libellés que la
       passe précédente tronquait (B2). Fixe, pas `max-content` : c'est ce
       qui aligne les pistes entre curseurs voisins d'un même encart.
     - piste bornée des DEUX côtés, 110px minimum et 260px maximum — avant,
       la même piste allait de 40px (illisible, 2,5 % par pixel) à 818px
       (25px par cran) selon la boîte qui l'accueillait (A2).
     - valeur `minmax(52px, max-content)` + `nowrap` : « 20000 Hz » et
       « 120 BPM » tenaient sur deux lignes dans 36px (B1).
     `justify-content: start` : l'espace en trop se pose APRÈS la valeur,
     jamais entre le libellé et sa piste — sinon un curseur dans un
     fieldset de 940px verrait son libellé à 600px de son contrôle. */
  .xp-slider {
    position: relative;
    display: grid;
    grid-template-columns: 104px minmax(110px, 260px) minmax(52px, max-content);
    justify-content: start;
    align-items: center;
    gap: 4px;
    margin: 1px 0;
    font-size: var(--xp-size-small);
  }
  /* Conteneur trop étroit pour une seule ligne (274px minimum) : au lieu
     d'écraser la piste comme avant, le curseur passe sur DEUX lignes —
     libellé et valeur en haut, piste sur toute la largeur en dessous. La
     densité à 2 colonnes voulue par §7.2.1 est donc préservée, mais la
     piste y gagne toute la largeur de la colonne (~155px) au lieu de 40. */
  @container (max-width: 300px) {
    .xp-slider {
      grid-template-columns: minmax(0, 1fr) auto;
      justify-content: stretch;
      column-gap: 6px;
      row-gap: 0;
    }
    .lab,
    button.lab.has-hint {
      grid-column: 1;
      grid-row: 1;
    }
    .val {
      grid-column: 2;
      grid-row: 1;
      width: auto;
      min-width: 46px;
    }
    .wrap {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
  .lab {
    color: var(--xp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* Explication légère (PLAN.md §7) : le libellé lui-même devient le
     déclencheur (survol/focus) plutôt qu'une icône séparée — pas de place
     dans une colonne de 72px, et ça évite d'ajouter un élément visuel de
     plus. Bulle jaune classique des tooltips Windows, cohérente avec le
     reste du design XP assumé (pas un composant générique repeint). */
  button.lab.has-hint {
    font: inherit;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    border-bottom: 1px dotted var(--xp-muted);
    cursor: help;
  }
  /* Chantier tactile — le seul reste assumé de la passe, avec la largeur des
     cases. Ce libellé n'est pas une commande : il annote le curseur d'à côté
     et son appui n'ouvre qu'une bulle d'aide. Lui donner 44px de haut, ce
     serait les prendre à la piste qu'il annote — un doigt qui vise le réglage
     tomberait sur l'explication. On double la bande sans déplacer le texte
     (remplissage compensé par une marge négative), et on s'arrête là. */
  @media (pointer: coarse) {
    button.lab.has-hint {
      padding: 8px 0;
      margin: -8px 0;
    }
  }
  .hint-bubble {
    display: none;
    position: absolute;
    left: 0;
    bottom: 100%;
    margin-bottom: 4px;
    z-index: 50;
    max-width: 220px;
    width: max-content;
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd);
    border: 1px solid var(--xp-lcd-dim);
    box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.35);
    padding: 4px 6px;
    font-size: var(--xp-size-small);
    line-height: 1.4;
    white-space: normal;
  }
  .lab.has-hint:hover + .hint-bubble,
  .lab.has-hint:focus + .hint-bubble {
    display: block;
  }
  .wrap {
    display: block;
    width: 100%;
    min-width: 0;
    position: relative;
    touch-action: none;
    cursor: pointer;
    /* La piste ne fait que 4px de haut et l'`<input>` 16px : la zone
       réellement saisissable au doigt passe à 26px sans épaissir le trait,
       puisque c'est cette enveloppe qui capte tout le geste (cf. en-tête).
       Compensé par `margin: 1px` au lieu de 2 sur `.xp-slider`. */
    padding: 5px 0;
  }
  /* Chantier tactile (cf. styles/global.css) : la piste ne peut pas recevoir
     le pseudo-élément de `.tap44` — c'est elle qui capte le geste de glissé,
     et deux curseurs empilés verraient leurs enveloppes invisibles se
     recouvrir. On épaissit donc la vraie enveloppe, qui ne dessine rien :
     16px d'`<input>` + 2 × 14px = 44. Le trait de 4px, lui, ne bouge pas. */
  @media (pointer: coarse) {
    .wrap {
      padding: 14px 0;
    }
  }
  .wrap:focus-visible {
    outline: 1px dotted var(--xp-text);
    outline-offset: 2px;
  }
  /* Le range est purement visuel : plus jamais de geste capté par lui. */
  .wrap input[type='range'] {
    display: block;
    width: 100%;
    pointer-events: none;
    appearance: none;
    -webkit-appearance: none;
    height: 16px;
    background: transparent;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    background: var(--xp-face-dark);
    border: 1px solid var(--xp-line);
    border-radius: 2px;
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 16px;
    margin-top: -6px;
    border-radius: 3px;
    background: var(--xp-btn-face);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
  }
  input[type='range']::-moz-range-track {
    height: 4px;
    background: var(--xp-face-dark);
    border: 1px solid var(--xp-line);
    border-radius: 2px;
  }
  input[type='range']::-moz-range-thumb {
    width: 11px;
    height: 16px;
    border-radius: 3px;
    background: var(--xp-btn-face);
    border: 1px solid var(--xp-line);
    cursor: pointer;
  }
  .val {
    font-family: var(--xp-mono);
    font-size: var(--xp-size-small);
    text-align: right;
    background: var(--xp-field-bg);
    color: var(--xp-lcd);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    padding: 1px 3px;
    cursor: text;
    width: 100%;
    /* Ceinture et bretelles avec la colonne `max-content` ci-dessus : même
       si la place venait à manquer, « 20000 Hz » débordera plutôt que de
       se replier sur deux lignes (B1). */
    white-space: nowrap;
    /* Cible tactile (audit A3) : taper la valeur ouvre la saisie clavier,
       c'est une vraie action et elle ne faisait que 15px de haut. Gratuit
       en hauteur de page — la ligne du curseur fait déjà 26px à cause de
       la zone de préhension de la piste, cette boîte s'y contentait d'être
       centrée. */
    min-height: 24px;
  }
  /* Loupe (mêmes cotes et couleurs que l'original : bleu Luna en mode
     rapide, violet en mode précis, petite flèche vers le doigt). */
  .magnifier {
    position: fixed;
    z-index: 999;
    pointer-events: none;
    opacity: 0;
    transition:
      opacity 0.1s ease,
      background 0.15s ease;
    background: var(--xp-select-blue);
    color: var(--xp-title-text);
    font-size: 11px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 5px;
    white-space: nowrap;
    transform: translate(-50%, -100%);
    font-family: var(--xp-font);
  }
  .magnifier.visible {
    opacity: 1;
  }
  .magnifier.precise {
    background: var(--xp-accent-violet);
  }
  .magnifier::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--xp-select-blue);
  }
  .magnifier.precise::after {
    border-top-color: var(--xp-accent-violet);
  }
</style>
