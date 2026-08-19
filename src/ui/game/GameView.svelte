<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { game, LEVELS, tierForAttempts, GAME_DRUM_ROWS } from '../../stores/game.svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import { AudioEngine } from '../../engine/AudioEngine';
  import type { GameDrumRowName } from '../../model/presets/levels';
  import type { ExerciseKind } from '../../model/exercises';
  import XpWindow from '../xp/XpWindow.svelte';

  let { onGoAtelier }: { onGoAtelier?: () => void } = $props();

  // État lu EN DIRECT par le moteur à chaque tick (comme pattern.snapshot()
  // pour l'Atelier), pas figé une fois pour toutes au clic sur ▶ — sinon,
  // modifier sa proposition PENDANT « Écouter ma version » continuerait de
  // jouer l'ancien état : le son se décale de ce qui est affiché sur la
  // grille. buildState() est bon marché (quelques tableaux de 32 cases), pas
  // de souci à le reconstruire à chaque tick (25 ms).
  let playingWhat = $state<'' | 'target' | 'guess' | 'intrus'>('');
  const engine = new AudioEngine(() => game.buildState(playingWhat || 'target'));
  let showMap = $state(false);
  let showBag = $state(false);

  // Curseur visuel : consommé à chaque frame contre l'horloge audio, comme
  // dans l'Atelier (AtelierView.svelte) — sans cette boucle, aucune case ne
  // s'illumine pendant la lecture et il est impossible de suivre le rythme.
  let playhead = $state<Record<GameDrumRowName, number>>({ kick: -1, snare: -1, hat: -1 });
  let raf = 0;
  function loop() {
    for (const ev of engine.consumePlayhead()) {
      if (ev.name in playhead) playhead[ev.name as GameDrumRowName] = ev.col;
      // Repère temporel du pas courant du kick : c'est contre lui que se
      // mesure l'écart d'une frappe.
      if (ev.name === 'kick' && ev.col !== dernierKickVu && game.target.kick[ev.col] > 0) {
        dernierKickVu = ev.col;
        dernierKickMs = performance.now();
      }
    }
    raf = requestAnimationFrame(loop);
  }
  function resetPlayhead() {
    playhead = { kick: -1, snare: -1, hat: -1 };
    // Oublier l'ancre avec le curseur : sans ça, la première frappe du tour
    // suivant se mesurerait contre un repère vieux de plusieurs secondes.
    dernierKickVu = -1;
  }

  /* « Jouer en rythme » — mesurer l'écart au COUP, pas à la grille.
   *
   * Deux façons de se tromper, écartées ici :
   *
   * 1. Quantifier puis comparer les cases. Une frappe posée 80 ms trop tard
   *    tombe encore dans le bon pas : elle serait déclarée parfaite, alors
   *    qu'elle s'entend en retard. On garde donc la DISTANCE, pas la case.
   * 2. Mesurer contre le pas courant quel qu'il soit. Sur une boucle à 8 pas
   *    qui porte 3 kicks, cinq pas sur huit sont silencieux : frapper sur un
   *    silence bien aligné aurait donné 100 %. L'ancre est donc le dernier pas
   *    ACTIF du kick, et l'intervalle est celui qui le sépare du prochain pas
   *    actif — pas la durée d'un pas.
   */
  let dernierKickVu = $state(-1);
  let dernierKickMs = 0;
  function dureeDunPas(): number {
    return (60000 / game.tempo) / Math.max(1, game.subdiv.kick / 4);
  }
  function frapper() {
    if (playingWhat !== 'target' || dernierKickVu < 0) return;
    const n = game.subdiv.kick;
    // Combien de pas jusqu'au prochain kick (en tournant : le dernier kick de
    // la boucle enchaîne sur le premier).
    let pas = 1;
    while (pas <= n && game.target.kick[(dernierKickVu + pas) % n] === 0) pas++;
    const intervalle = pas * dureeDunPas();
    const ecoule = performance.now() - dernierKickMs;
    // Écart signé au kick le plus proche : en retard (positif) ou en avance sur
    // le suivant (négatif). `enregistrerFrappe` n'en garde que la valeur absolue.
    game.enregistrerFrappe(ecoule > intervalle / 2 ? ecoule - intervalle : ecoule);
  }

  onMount(() => {
    raf = requestAnimationFrame(loop);
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    engine.stop();
  });

  async function play(which: 'target' | 'guess' | 'intrus') {
    if (playingWhat === which) {
      engine.stop();
      playingWhat = '';
      resetPlayhead();
      return;
    }
    engine.stop();
    resetPlayhead();
    if (which === 'target') game.loopPlays++;
    else game.guessPlays++;
    // Avant start() : le tout premier tick doit déjà lire la bonne cible via
    // le getState() ci-dessus, sinon la toute première fenêtre programmée
    // (jusqu'à 0.25s) jouerait encore l'ancienne.
    playingWhat = which;
    await engine.start();
  }

  function stopAll() {
    engine.stop();
    playingWhat = '';
    resetPlayhead();
  }

  // Son de victoire + flash des cases (original showGameResult, l. 8558-8564,
  // jamais porté — PLAN.md §7.3). `game.solved` ne peut passer à true QUE
  // par CET appel : le bouton ✓ Vérifier est désactivé dès que solved (voir
  // plus bas), donc pas besoin de retenir l'état "avant" pour détecter la
  // victoire.
  let winFlash = $state(false);
  function triggerWinFlash() {
    winFlash = true;
    setTimeout(() => (winFlash = false), 1100);
  }

  // Un raté ne laisse AUCUNE trace pour « intrus » et « jouer » : il n'y a pas
  // de case à verrouiller, donc rien à l'écran ne dirait que la réponse a été
  // examinée. Sans ce drapeau, cliquer sur ✓ Vérifier semble ne rien faire.
  let echec = $state(false);
  const MSG_ECHEC: Record<ExerciseKind, string> = {
    reproduire: 'Pas encore. Les cases justes sont verrouillées ✓ — reprends les autres.',
    completer: 'Pas encore. Les cases justes du temps manquant sont verrouillées ✓.',
    intrus: 'Ce n’est pas celle-là. Réécoute les quatre mesures.',
    jouer: 'Trop loin du temps. Relance la boucle et repose tes frappes.',
  };

  function verify() {
    stopAll();
    const ok = game.verify();
    echec = !ok;
    if (game.solved) {
      engine.playWinChime(tierForAttempts(game.attempts));
      triggerWinFlash();
    }
  }

  /* « Jouer » — relancer la boucle repart de zéro frappe.
   *
   * Sans ça, les frappes du tour précédent s'additionnent à celles du nouveau
   * et la justesse cesse de vouloir dire quoi que ce soit. Arrêter, en
   * revanche, ne les efface pas : on veut pouvoir stopper puis vérifier.
   */
  function toggleJouer() {
    if (playingWhat === 'target') {
      play('target');
      return;
    }
    game.reinitialiserFrappes();
    echec = false;
    play('target');
  }

  // Un seul point d'entrée vers un niveau : le drapeau d'échec est local à la
  // vue, il ne se remettrait pas à zéro tout seul en changeant de niveau.
  function allerAuNiveau(index: number) {
    stopAll();
    echec = false;
    game.startLevel(index);
  }

  /* La barre d'espace frappe aussi : sur un clavier, viser un pad à la souris
   * ajoute une latence de visée à ce qu'on mesure — et ce qu'on mesure ici est
   * précisément une latence. */
  function surTouche(e: KeyboardEvent) {
    if (ex !== 'jouer' || playingWhat !== 'target' || e.code !== 'Space' || e.repeat) return;
    e.preventDefault();
    frapper();
  }

  function saveToAtelier() {
    pattern.replace(game.toAtelierState());
    onGoAtelier?.();
  }

  const lvl = $derived(game.level);
  const ex = $derived(lvl.exercise);
  const rowLabels: Record<GameDrumRowName, string> = { kick: 'Kick', snare: 'Snare', hat: 'Hat' };

  // La mesure à remplir, en Set : la grille interroge l'appartenance à chaque
  // case, et un `includes` sur un tableau le referait à chaque rendu.
  const zone = $derived.by(() => {
    const out: Record<GameDrumRowName, Set<number>> = { kick: new Set(), snare: new Set(), hat: new Set() };
    for (const n of GAME_DRUM_ROWS) for (const c of game.zoneACompleter[n] ?? []) out[n].add(c);
    return out;
  });

  /* Quelle mesure passe, pendant la lecture des quatre de « l'intrus ».
   * Le curseur court sur la grille fabriquée (4 mesures mises bout à bout) :
   * une division par la longueur d'UNE mesure suffit à la retrouver. */
  const mesureEnCours = $derived(
    playingWhat === 'intrus' && playhead.kick >= 0
      ? Math.floor(playhead.kick / Math.max(1, game.subdiv.kick))
      : -1,
  );
</script>

<!-- ÉTAPE 5 : data-theme="noir" retiré. Le Mode jeu avait son propre
     thème sombre ; il parle désormais la langue commune. -->
<svelte:window onkeydown={surTouche} />

<div class="game">
  {#if !game.pseudo}
    <XpWindow title="Boîte à rythmes — Mode jeu" icon="🎮" accent="none">
      <p class="lead">Choisis ton pseudo pour commencer la campagne.</p>
      <form
        class="pseudo-form"
        onsubmit={(e) => {
          e.preventDefault();
          const input = (e.currentTarget as HTMLFormElement).elements.namedItem('pseudo') as HTMLInputElement;
          game.setPseudo(input.value);
        }}
      >
        <input name="pseudo" placeholder="Ton pseudo…" autocomplete="off" />
        <button class="xp-btn">C’est parti</button>
      </form>
    </XpWindow>
  {:else}
    <XpWindow title="Niveau {lvl.id} / {LEVELS.length} — {lvl.teach}" icon="🎮" accent="none">
      <div class="head">
        <button class="player" onclick={() => game.clearPseudo()} title="Changer de joueur">
          👤 {game.pseudo}
        </button>
        <button class="xp-btn tiny" onclick={() => (showMap = !showMap)}>🗺️ Carte</button>
        <button class="xp-btn tiny" onclick={() => (showBag = !showBag)}>🎒 Besace ({game.bag.length})</button>
      </div>
      {#if lvl.preamble}<p class="preamble">{lvl.preamble}</p>{/if}

      {#if showMap}
        <div class="map">
          {#each LEVELS as l (l.id)}
            {@const unlocked = game.isUnlocked(l.id)}
            {@const stars = game.playerProgress.stars[String(l.id)] ?? 0}
            <button
              class="map-cell"
              class:locked={!unlocked}
              class:current={l.id === lvl.id}
              disabled={!unlocked}
              title={l.teach}
              onclick={() => {
                allerAuNiveau(l.id - 1);
                showMap = false;
              }}
            >
              <span class="num">{unlocked ? l.id : '🔒'}</span>
              <span class="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
            </button>
          {/each}
        </div>
      {/if}

      {#if showBag}
        <div class="bag">
          {#if game.bag.length === 0}
            <p class="muted">Besace vide. Gagne des niveaux pour la remplir de trucs discutables.</p>
          {:else}
            {#each Object.entries(game.bag.reduce((acc: Record<string, { item: (typeof game.bag)[0]; n: number }>, it) => { const k = it.emoji + it.name; acc[k] = acc[k] ? { item: it, n: acc[k].n + 1 } : { item: it, n: 1 }; return acc; }, {})) as [key, entry] (key)}
              <div class="bag-item">
                <span class="emoji">{entry.item.emoji}</span>
                {entry.item.name}{entry.n > 1 ? ` ×${entry.n}` : ''}
              </div>
            {/each}
            <p class="muted">{new Set(game.bag.map((i) => i.name)).size}/{31} objets découverts</p>
          {/if}
        </div>
      {/if}

      <!-- Le transport dit ce que le VERBE demande d'écouter : les quatre
           mesures pour l'intrus, la boucle à suivre pour « jouer », la cible et
           sa propre version pour les deux exercices de grille. -->
      <div class="transport">
        {#if ex === 'intrus'}
          <button class="xp-btn" onclick={() => play('intrus')}>
            {playingWhat === 'intrus' ? '■ Stop' : '🔊 Écouter les 4 mesures'}
          </button>
        {:else if ex === 'jouer'}
          <button class="xp-btn" onclick={toggleJouer}>
            {playingWhat === 'target' ? '■ Stop' : '▶ Lancer la boucle'}
          </button>
          <button class="xp-btn" disabled={game.ecarts.length === 0} onclick={() => game.reinitialiserFrappes()}>
            ↺ Effacer mes frappes
          </button>
        {:else}
          <button class="xp-btn" onclick={() => play('target')}>
            {playingWhat === 'target'
              ? '■ Stop'
              : ex === 'completer'
                ? '🔊 Écouter la boucle entière'
                : '🔊 Écouter le rythme à trouver'}
          </button>
          <button class="xp-btn" onclick={() => play('guess')}>
            {playingWhat === 'guess' ? '■ Stop' : '🎧 Écouter ma version'}
          </button>
        {/if}
        <button
          class="xp-btn primary"
          disabled={game.solved || game.revealed || (ex === 'intrus' && game.intrusChoix === null)}
          onclick={verify}
        >
          ✓ Vérifier
        </button>
      </div>

      {#if echec && !game.solved && !game.revealed}
        <p class="echec">✗ {MSG_ECHEC[ex]}</p>
      {/if}

      {#if ex === 'intrus'}
        <!-- Aucune grille : l'exercice n'a rien à manipuler. Quatre boutons,
             et le curseur de lecture qui dit où on en est — sans lui, compter
             les mesures à l'oreille devient l'exercice, ce qui n'est pas la
             question posée. -->
        <div class="intrus">
          <p class="consigne">Laquelle des quatre mesures est différente&nbsp;?</p>
          <div class="choix">
            {#each { length: 4 } as _, m (m)}
              <button
                class="xp-btn choix-btn tap44-y"
                class:actif={game.intrusChoix === m}
                class:en-cours={mesureEnCours === m}
                class:bonne={(game.solved || game.revealed) && game.intrusReponse === m}
                disabled={game.solved || game.revealed}
                onclick={() => {
                  game.intrusChoix = m;
                  echec = false;
                }}
              >
                Mesure {m + 1}
              </button>
            {/each}
          </div>
        </div>
      {:else if ex === 'jouer'}
        <!-- Le guide montre le kick parce qu'on l'ENTEND de toute façon : rien
             n'y est caché. Ce qui est noté, c'est le placement de la frappe,
             pas la connaissance de la grille. -->
        <div class="jouer">
          <div class="guide" style:--cols={game.subdiv.kick}>
            {#each { length: game.subdiv.kick } as _, col (col)}
              <span
                class="pas"
                class:actif={game.target.kick[col] > 0}
                class:playing={playhead.kick === col}
              ></span>
            {/each}
          </div>
          <button
            class="pad"
            disabled={playingWhat !== 'target'}
            onpointerdown={frapper}
            aria-label="Frapper"
          >
            {playingWhat === 'target' ? 'FRAPPE' : 'Lance la boucle'}
          </button>
          <div class="jauge" role="meter" aria-valuenow={game.justesse()} aria-valuemin="0" aria-valuemax="100">
            <div class="barre" style:width="{game.justesse()}%"></div>
          </div>
          <!-- « 4/2 frappes » se lisait comme une erreur : la boucle tourne, les
               frappes s'accumulent d'un tour à l'autre, dépasser le compte est
               normal. On dit donc combien il en faut, pas une fraction. -->
          <p class="chiffres">
            {game.ecarts.length} frappe{game.ecarts.length > 1 ? 's' : ''} — il en faut au moins
            {game.frappesAttendues} — justesse {game.justesse()}&nbsp;%
            <span class="muted">(70&nbsp;% suffisent)</span>
          </p>
        </div>
      {:else}
        {#each GAME_DRUM_ROWS as name (name)}
          {#if game.target[name].some((v) => v > 0) || game.guess[name].some((v) => v > 0)}
            {@const c = game.counts(name)}
            <div class="row">
              <div class="row-head">
                <span class="row-label">{rowLabels[name]}</span>
                <span class="count" class:ok={c.placed === c.expected}>{c.placed}/{c.expected}</span>
                {#if game.shift[name] !== 0}
                  <span class="badge" title="Cette ligne est décalée">{game.shift[name] < 0 ? '◀' : '▶'}</span>
                {/if}
              </div>
              <div class="cells" style:--cols={game.subdiv[name]}>
                {#each { length: game.subdiv[name] } as _, col (col)}
                  {@const st = game.guess[name][col]}
                  {@const locked = game.locked[name][col]}
                  <button
                    class="cell state-{st}"
                    class:locked
                    class:revealed={game.revealed && game.target[name][col] > 0 && !locked}
                    class:playing={playhead[name] === col}
                    class:donne={ex === 'completer' && !zone[name].has(col)}
                    class:a-remplir={ex === 'completer' && zone[name].has(col)}
                    class:win-flash={winFlash}
                    onclick={() => game.cycleCell(name, col)}
                    oncontextmenu={(e) => {
                      e.preventDefault();
                      game.cycleRoll(name, col);
                    }}
                  >
                    {#if locked}<span class="mark">{ex === 'completer' && !zone[name].has(col) ? '·' : '✓'}</span>
                    {:else if game.revealed && game.target[name][col] > 0}<span class="mark">○</span>{/if}
                    {#if game.guessRolls[name][col] > 1}<span class="roll">×{game.guessRolls[name][col]}</span>{/if}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      {/if}

      {#if game.lastResult}
        <div class="result" class:won={game.solved}>
          <p class="stars-big">{'★'.repeat(game.lastResult.stars)}{'☆'.repeat(3 - game.lastResult.stars)}</p>
          <p class="roast">{game.lastResult.roast}</p>
          {#if game.lastResult.presetLabel}
            <p class="context">🎵 Le plus proche : <strong>{game.lastResult.presetLabel}</strong>{#if game.lastResult.history} — {game.lastResult.history}{/if}</p>
          {/if}
          {#if game.lastResult.items.length}
            <p class="loot">
              Tu récoltes : {#each game.lastResult.items as it, i (i)}<span>{it.emoji} {it.name}</span>{#if i < game.lastResult.items.length - 1}, {/if}{/each}
            </p>
          {/if}
          <div class="result-btns">
            {#if game.solved && game.levelIndex < LEVELS.length - 1}
              <button class="xp-btn primary" onclick={() => allerAuNiveau(game.levelIndex + 1)}>
                Niveau suivant →
              </button>
            {/if}
            {#if ex === 'reproduire' || ex === 'completer'}
              <!-- Rien à sauvegarder pour « intrus » et « jouer » : leur grille
                   de proposition est vide par construction, le bouton
                   n'enverrait dans l'Atelier qu'un rythme muet. -->
              <button class="xp-btn" onclick={saveToAtelier}>💾 Sauvegarder dans l’Atelier</button>
            {/if}
          </div>
        </div>
      {:else}
        <div class="footer-btns">
          <button class="xp-btn tiny" onclick={() => { stopAll(); game.revealSolution(); game.giveUp(); }}>
            {ex === 'intrus' ? 'Donner la réponse (0★)' : ex === 'jouer' ? 'Abandonner (0★)' : 'Voir la solution (0★)'}
          </button>
          <button class="xp-btn tiny" onclick={() => { game.giveUp(); allerAuNiveau(game.levelIndex); }}>
            Nouveau rythme
          </button>
        </div>
      {/if}
    </XpWindow>
  {/if}
</div>

<style>
  .game {
    color: var(--xp-text);
  }
  .lead {
    font-size: 10px;
  }
  .pseudo-form {
    display: flex;
    gap: 6px;
  }
  input {
    flex: 1;
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 4px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  /* Devenu cliquable (changer de joueur) sans devenir un bouton à l'œil :
     l'en-tête en compte déjà deux, un troisième relief brouillerait la
     hiérarchie. Cible tactile tenue à 24px (audit A3). */
  .player {
    font-size: var(--xp-size-body);
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .preamble {
    font-size: var(--xp-size-body);
    background: rgba(255, 255, 255, 0.06);
    border-left: 3px solid var(--xp-accent-teal);
    padding: 6px 8px;
    margin: 0 0 8px;
  }
  .map {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    margin-bottom: 10px;
  }
  .map-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    color: var(--xp-text);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    font-size: var(--xp-size-body);
  }
  .map-cell.locked {
    opacity: 0.45;
    cursor: default;
  }
  .map-cell.current {
    outline: 2px solid var(--xp-playhead);
  }
  .stars {
    font-size: 9px;
    color: var(--xp-playhead);
  }
  .bag {
    max-height: 180px;
    overflow-y: auto;
    font-size: var(--xp-size-body);
    margin-bottom: 10px;
    background: rgba(0, 0, 0, 0.15);
    padding: 6px;
  }
  .bag-item {
    padding: 1px 0;
  }
  .emoji {
    margin-right: 4px;
  }
  .muted {
    color: var(--xp-muted);
    font-size: 9px;
  }
  .transport {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn.primary {
    font-weight: 700;
    background: linear-gradient(180deg, #2f8a3c, #1c5a24 50%, #123f18);
  }
  .xp-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .xp-btn.tiny {
    font-size: var(--xp-size-small);
    padding: 2px 8px;
  }
  .row {
    margin-bottom: 10px;
  }
  .row-head {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9px;
    margin-bottom: 3px;
  }
  .row-label {
    font-weight: 700;
    text-transform: uppercase;
  }
  .count {
    font-family: var(--xp-mono);
    color: var(--xp-muted);
  }
  .count.ok {
    color: var(--xp-lcd);
  }
  .badge {
    color: var(--xp-playhead);
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
    background: var(--xp-btn-face);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    padding: 0;
    touch-action: manipulation;
  }
  .cell.state-1 {
    background: #2f7fd0;
    box-shadow: var(--xp-bevel-in);
  }
  .cell.state-2 {
    background: #7fb6ea;
    box-shadow: var(--xp-bevel-in);
  }
  .cell.locked {
    background: #2f8a4f;
    cursor: default;
  }
  .cell.revealed {
    outline: 2px dashed var(--xp-playhead);
  }
  .cell.playing {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  /* Flash de victoire (original, l. 441-442) : 3 pulsations de luminosité,
     déclenché sur toutes les cases à la résolution (triggerWinFlash). */
  @keyframes cellFlash {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.6);
    }
  }
  .cell.win-flash {
    animation: cellFlash 0.35s ease 3;
  }
  .mark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-weight: 800;
    color: var(--xp-title-text);
  }
  .roll {
    position: absolute;
    right: 2px;
    bottom: 0;
    font-size: 9px;
    font-family: var(--xp-mono);
    color: var(--xp-title-text);
  }
  .result {
    border: 1px solid var(--xp-line);
    background: rgba(0, 0, 0, 0.25);
    padding: 10px;
    margin-top: 10px;
  }
  .result.won {
    border-color: var(--xp-lcd-dim);
  }
  .stars-big {
    font-size: 24px;
    color: var(--xp-playhead);
    margin: 0 0 4px;
  }
  .roast,
  .context,
  .loot {
    font-size: var(--xp-size-body);
    margin: 4px 0;
  }
  .context {
    color: var(--xp-muted);
  }
  .result-btns,
  .footer-btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .echec {
    font-size: var(--xp-size-body);
    color: var(--cell-kick);
    background: rgba(0, 0, 0, 0.25);
    border-left: 3px solid var(--cell-kick);
    padding: 5px 8px;
    margin: -4px 0 10px;
  }

  /* « Compléter » : deux états de plus sur la même case.
     Le donné est en creux et éteint — présent, mais hors jeu. La mesure à
     remplir garde le relief : c'est là que la main travaille, et le biseau est
     ce qui dit « cliquable » dans cette skin. */
  .cell.donne {
    background: var(--xp-face);
    box-shadow: var(--xp-bevel-in);
    opacity: 0.55;
  }
  .cell.donne.state-1,
  .cell.donne.state-2 {
    background: #2b4c68;
    opacity: 0.7;
  }
  .cell.a-remplir {
    outline: 1px solid var(--xp-accent-teal);
    outline-offset: 1px;
  }

  /* --- « Trouve l'intrus » --- */
  .consigne {
    font-size: var(--xp-size-body);
    margin: 0 0 6px;
  }
  .choix {
    display: grid;
    /* minmax(0, …) et non 1fr seul : `1fr` vaut `minmax(auto, 1fr)`, le
       min-content de chaque bouton s'impose et les quatre colonnes divergent —
       mesuré à l'écran avant correction. */
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 10px;
  }
  .choix-btn {
    padding: 8px 4px;
  }
  .choix-btn.actif {
    background: linear-gradient(180deg, #2f7fd0, #1d5590);
    box-shadow: var(--xp-bevel-in);
    font-weight: 700;
  }
  /* Le curseur de lecture, sur un bouton : c'est le même vocabulaire que la
     case en cours de la grille, et il rend le comptage des mesures inutile. */
  .choix-btn.en-cours {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  .choix-btn.bonne {
    background: #2f8a4f;
    opacity: 1;
  }

  /* --- « Joue en rythme » --- */
  .guide {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 3px;
    margin-bottom: 8px;
  }
  .pas {
    height: 10px;
    border: 1px solid var(--xp-line);
    border-radius: 2px;
    background: var(--xp-btn-face);
    box-shadow: var(--xp-bevel-in);
  }
  .pas.actif {
    background: var(--xp-lcd-dim);
  }
  .pas.playing {
    outline: 2px solid var(--xp-playhead);
    outline-offset: -1px;
  }
  .pad {
    display: block;
    width: 100%;
    height: 96px;
    font-family: var(--xp-font);
    font-size: var(--xp-size-title);
    letter-spacing: var(--xp-ls-title);
    text-transform: uppercase;
    color: var(--xp-lcd);
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
    /* Frapper vite, c'est frapper deux fois au même endroit : sans ça, le
       navigateur y voit un double-tap et zoome au lieu de laisser jouer. */
    touch-action: manipulation;
    user-select: none;
  }
  .pad:active {
    box-shadow: var(--xp-bevel-in);
    background: #0d1a0e;
  }
  .pad:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  .jauge {
    height: 8px;
    margin-top: 8px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-lcd-bg);
  }
  .barre {
    height: 100%;
    background: var(--xp-lcd);
    transition: width 0.12s linear;
  }
  .chiffres {
    font-family: var(--xp-mono);
    font-size: var(--xp-size-lcd);
    margin: 4px 0 10px;
  }
  .chiffres .muted {
    font-size: var(--xp-size-lcd);
  }

  /* Chantier tactile (cf. styles/global.css) — EN FIN DE BLOC, sans quoi les
     règles écrites plus bas l'écraseraient à specificité égale.
     ⚠️ Les enveloppes 44px débordent des boutons (30-32px de haut ici, donc
     ~7px de débordement en haut et en bas) et se marchent dessus : la rangée
     du dessous, plus tard dans le DOM, passe AU-DESSUS et vole les derniers
     pixels de celle du dessus. Mesuré : les boutons « Mesure 1..3 » ne
     répondaient plus que sur 22px de leurs 30px visibles, mangés par l'enveloppe
     de « Donner la réponse ». D'où ces écartements — 16px au minimum, soit deux
     débordements. */
  @media (pointer: coarse) {
    .pseudo-form {
      gap: 14px;
    }
    .head {
      gap: 16px;
      margin-bottom: 14px;
    }
    .transport {
      gap: 16px;
      margin-bottom: 18px;
    }
    .echec {
      margin: 0 0 18px;
    }
    .choix {
      gap: 10px;
      margin-bottom: 20px;
    }
    .chiffres {
      margin-bottom: 18px;
    }
    .map {
      gap: 12px;
      margin-bottom: 18px;
    }
    .result-btns,
    .footer-btns {
      gap: 16px;
      margin-top: 18px;
    }
  }
</style>
