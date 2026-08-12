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

<div class="xp-slider">
  <span class="lab">{label}</span>
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
      class="val"
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

<style>
  .xp-slider {
    display: grid;
    grid-template-columns: 72px 1fr 36px;
    align-items: center;
    gap: 4px;
    margin: 2px 0;
    font-size: 10.5px;
  }
  .lab {
    color: var(--xp-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .wrap {
    display: block;
    width: 100%;
    min-width: 0;
    position: relative;
    touch-action: none;
    cursor: pointer;
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
    background: linear-gradient(180deg, #fefefe, #d6d2c2 45%, #b8b2a0);
    border: 1px solid #7a7768;
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
    background: linear-gradient(180deg, #fefefe, #d6d2c2 45%, #b8b2a0);
    border: 1px solid #7a7768;
    cursor: pointer;
  }
  .val {
    font-family: var(--xp-mono);
    font-size: 10px;
    text-align: right;
    background: #fff;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    padding: 1px 3px;
    cursor: text;
    width: 100%;
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
    background: #0a246a;
    color: #fff;
    font-size: 14px;
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
    background: #8a3fd8;
  }
  .magnifier::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -5px;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #0a246a;
  }
  .magnifier.precise::after {
    border-top-color: #8a3fd8;
  }
</style>
