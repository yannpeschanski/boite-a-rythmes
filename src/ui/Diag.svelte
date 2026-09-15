<script lang="ts">
  /* ÉCRAN DE DIAGNOSTIC — `#diag`. Hors de l'appli, jamais atteint par hasard.
   *
   * POURQUOI IL EXISTE (2026-09-15). Sur Firefox, « on appuie sur lecture et il
   * ne se passe rien » : pas de son, pas de tête de lecture, et — après le
   * capteur de pannes — pas de message non plus. Donc la cause ne LÈVE pas, et
   * aucun des deux instruments précédents ne pouvait la voir. Il n'y a pas de
   * console sur un téléphone : l'état doit s'AFFICHER.
   *
   * Une SUITE d'essais, du plus nu au plus complet : le premier qui se tait
   * nomme l'étage. Mesuré le 2026-09-15 — 1 et 2 s'entendent, 3 et 4 non — donc
   * le `latencyHint` est hors de cause et le son se perd dans le moteur. D'où
   * les sondes 3 à 5, qui injectent le MÊME bip à trois points du graphe et en
   * font une recherche dichotomique.
   *
   * Tout est enveloppé : ce qui lève s'écrit, et ce qui dort se lit dans le
   * tableau d'état, rafraîchi cinq fois par seconde.
   */
  import { onDestroy } from 'svelte';
  import { AudioEngine } from '../engine/AudioEngine';
  import { defaultState } from '../model/defaults';
  import { medianeDesEcarts } from '../model/exercises';
  import { latence } from './latence.svelte';
  import CalibrageLatence from './xp/CalibrageLatence.svelte';

  /* ⚠️ Une sortie ÉCRITE, obligatoire depuis que l'écran s'ouvre par le menu
     Aide : atteint par l'adresse, le bouton « précédent » du navigateur
     suffisait ; atteint depuis l'appli, il n'y a plus rien pour revenir. Même
     règle que le « ◂ REDESCENDRE » des scènes du récit. */
  let { onExit }: { onExit?: () => void } = $props();

  const engine = new AudioEngine(() => defaultState());

  let journal = $state<string[]>([]);
  let etat = $state<Record<string, string | number | boolean | null>>(engine.diagnostic());

  const noter = (ligne: string) => (journal = [...journal, ligne]);

  /* Une seule façon d'exécuter un essai : tout ce qui lève est CAPTURÉ et
     écrit, y compris un rejet — sinon l'essai raté est aussi muet que le
     défaut qu'on cherche. */
  async function essai(nom: string, quoi: () => void | Promise<void>): Promise<void> {
    try {
      await quoi();
      noter(`✅ ${nom} — sans erreur`);
    } catch (e) {
      const err = e as { name?: string; message?: string };
      noter(`❌ ${nom} — ${err?.name ?? 'Erreur'}: ${err?.message ?? String(e)}`);
    }
    etat = engine.diagnostic();
  }

  /* Un bip de deux nœuds sur un contexte NEUF, avec ou sans `latencyHint`.
   *
   * ⚠️ LES DEUX VARIANTES EXISTENT POUR SÉPARER DEUX CAUSES (2026-09-15).
   * Sur Firefox, le moteur tourne — horloge qui avance, tête de lecture qui
   * défile, aucune erreur — et ne sort aucun son. C'est la signature d'un flux
   * de sortie qui n'a pas pu s'ouvrir : Gecko fait alors tourner le graphe sur
   * une horloge SYSTÈME, et tout paraît normal.
   *
   * Deux raisons possibles, et une seule différence entre le chemin qui sonne
   * (les sons du récit) et celui qui ne sonne pas (le moteur) :
   *   - le `latencyHint`, que les sons système ne demandent pas ;
   *   - le fait d'être le DEUXIÈME contexte ouvert de la page.
   * Le bouton nu et le bouton « interactif » tranchent le premier point ;
   * l'ordre dans lequel on les appuie tranche le second. */
  function bip(hint: AudioContextLatencyCategory | null): void {
    const ctx = hint ? new AudioContext({ latencyHint: hint }) : new AudioContext();
    void ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = 440;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
    noter(
      `   (contexte ${hint ?? 'nu'} : ${ctx.state}, échantillonnage ${ctx.sampleRate}, ` +
        `baseLatency ${ctx.baseLatency != null ? Math.round(ctx.baseLatency * 1000) + ' ms' : 'non déclaré'})`,
    );
  }

  let minuterie: ReturnType<typeof setInterval> | null = null;
  function suivre(): void {
    minuterie ??= setInterval(() => (etat = engine.diagnostic()), 200);
  }
  onDestroy(() => {
    if (minuterie) clearInterval(minuterie);
    engine.stop();
  });

  async function lecture(): Promise<void> {
    await essai('7. LECTURE (graphe + scheduler)', () => engine.start());
    suivre();
  }

  /* ⚠️ L'alerte se décide LIGNE PAR LIGNE : « faux » n'est pas mauvais partout.
     `sortieRefusee: false` est la BONNE valeur, et un `outputLatency` non
     déclaré est normal sur WebKit. Une règle unique (« faux = alerte ») peignait
     en ambre ce qui va bien — sur un écran dont le seul travail est de dire où
     ça casse, c'est le pire des défauts. */
  function estAlerte(cle: string, valeur: string | number | boolean | null): boolean {
    if (cle === 'sortieRefusee') return valeur === true;
    if (cle === 'contexte') return valeur !== 'running';
    // Une horloge à l'arrêt PENDANT une lecture est exactement le symptôme
    // qu'on traque : le scheduler tourne, le temps audio n'avance pas.
    if (cle === 'horloge') return etat.joue === true && valeur === 0;
    if (cle === 'baseLatencyMs' || cle === 'outputLatencyMs') return false;
    return valeur === false;
  }

  /* ── LA CHAÎNE DOIGT → OREILLE ─────────────────────────────────────────────
   *
   * Demandé après une journée passée sur des chiffres DÉCLARÉS qui se
   * contredisent : sur le même téléphone, à la même minute, Chrome annonce
   * 171 ms de tampon et 416 ms au total, Firefox annonce 0 et 22 — et le
   * ressenti est du même ordre dans les deux. Un chiffre déclaré ne prouve
   * rien ; il faut la chaîne entière, étage par étage, et le total mesuré À
   * L'OREILLE à côté.
   *
   * Ce qu'on peut voir depuis une page, et ce qu'on ne peut pas :
   *   - le doigt → la dalle → le système : INVISIBLE, aucune API ne l'expose ;
   *   - la file d'événements → notre code : mesurable, et jamais mesuré jusqu'ici
   *     (`performance.now() - event.timeStamp`) ;
   *   - l'avance de programmation : une constante du moteur ;
   *   - le tampon du navigateur et la route : déclarés, donc à prendre avec des
   *     pincettes — c'est tout le sujet ;
   *   - le total réel : seulement à l'oreille, par le calibrage.
   *
   * L'écart entre le total avoué et le total mesuré est le chiffre le plus
   * utile de cet écran : c'est ce que le navigateur ne dit pas. */
  let retards = $state<number[]>([]);
  const retardMedian = $derived(medianeDesEcarts(retards));

  function taper(e: PointerEvent): void {
    // `timeStamp` est l'instant où le système a produit l'événement, sur la même
    // horloge que `performance.now()` : leur écart est le temps que l'événement
    // a passé dans la file avant que notre gestionnaire ne tourne.
    if (!(e.timeStamp > 0)) return;
    retards = [...retards, Math.round(Math.max(0, performance.now() - e.timeStamp))];
  }

  let calibrage = $state(false);

  /* ── SONDAGE DES TAMPONS ───────────────────────────────────────────────────
   *
   * ⚠️ `latencyHint` est un VŒU, pas une garantie : le navigateur peut l'ignorer,
   * et sur Android Chrome l'ignore quand la taille de rafale de l'appareil ne
   * tombe pas juste avec le quantum de rendu de 128 échantillons de Web Audio —
   * il retombe alors sur le mode sans basse latence (ticket Chromium 40103372).
   * Mesuré sur le téléphone de Yann : 171 ms de tampon, contexte nu comme
   * contexte `interactive`.
   *
   * Restent deux boutons qu'une page peut tourner, et qu'on n'avait pas
   * essayés : un hint NUMÉRIQUE (plus précis qu'une catégorie) et un taux
   * d'échantillonnage IMPOSÉ (hors du taux natif, le navigateur doit
   * rééchantillonner, ce qui interdit le chemin rapide). Une seule pression les
   * essaie tous et rend le tampon obtenu — aucun son, juste des chiffres.
   *
   * Chaque contexte est refermé aussitôt lu : en laisser six ouverts changerait
   * ce qu'on mesure. */
  const CONFIGS: { nom: string; opts?: AudioContextOptions }[] = [
    { nom: 'par défaut', opts: undefined },
    { nom: "categorie 'interactive'", opts: { latencyHint: 'interactive' } },
    { nom: 'hint 0,02 s', opts: { latencyHint: 0.02 } },
    { nom: 'hint 0,01 s', opts: { latencyHint: 0.01 } },
    { nom: 'hint 0,005 s', opts: { latencyHint: 0.005 } },
    { nom: 'hint 0,005 s + 48 kHz', opts: { latencyHint: 0.005, sampleRate: 48000 } },
    { nom: 'hint 0,005 s + 44,1 kHz', opts: { latencyHint: 0.005, sampleRate: 44100 } },
  ];

  let tampons = $state<string[]>([]);

  async function sonderTampons(): Promise<void> {
    tampons = [];
    for (const { nom, opts } of CONFIGS) {
      try {
        const c = opts ? new AudioContext(opts) : new AudioContext();
        const base = typeof c.baseLatency === 'number' ? Math.round(c.baseLatency * 1000) : null;
        const sortie = typeof c.outputLatency === 'number' ? Math.round(c.outputLatency * 1000) : null;
        tampons = [
          ...tampons,
          `${nom} — ${c.sampleRate} Hz, tampon ${base === null ? 'non déclaré' : base + ' ms'}` +
            (sortie ? `, sortie ${sortie} ms` : ''),
        ];
        await c.close();
      } catch (e) {
        const err = e as { name?: string; message?: string };
        tampons = [...tampons, `${nom} — refusé : ${err?.name ?? ''} ${err?.message ?? String(e)}`];
      }
    }
  }

  const nb = (v: string | number | boolean | null): number => (typeof v === 'number' ? v : 0);
  /* Ce que le navigateur AVOUE : la file d'événements mesurée ici, plus
     l'avance de programmation, plus la latence de sortie qu'il déclare
     (`outputLatency` contient déjà `baseLatency`). */
  const totalAvoue = $derived(
    retardMedian + nb(etat.avanceDeclenchementMs) + nb(etat.outputLatencyMs),
  );

  /* ⚠️ Les lignes du premier tableau sont ÉNUMÉRÉES, pas déduites de l'objet.
     Déduites, les compteurs ajoutés pour les sections d'après y apparaissaient
     aussi — en double, et sous leur nom de code. Un écran de diagnostic qui
     affiche deux fois la même chose rend le diagnostic moins lisible, ce qui est
     exactement son contraire. */
  const LIGNES_ETAT = [
    'contexte',
    'horloge',
    'echantillonnage',
    'baseLatencyMs',
    'outputLatencyMs',
    'tamponDemande',
    'graphe',
    'kit',
    'joue',
    'minuterie',
    'sortieRefusee',
  ];

  const LIBELLES: Record<string, string> = {
    contexte: 'état du contexte',
    horloge: 'horloge audio',
    echantillonnage: 'échantillonnage',
    baseLatencyMs: 'baseLatency (ms)',
    outputLatencyMs: 'outputLatency (ms)',
    tamponDemande: 'tampon demandé',
    graphe: 'graphe construit',
    kit: 'kit construit',
    joue: 'lecture en cours',
    minuterie: 'scheduler armé',
    sortieRefusee: 'sortie refusée',
  };
</script>

<div class="diag">
  {#if onExit}
    <button class="retour tap44" onclick={() => { engine.stop(); onExit?.(); }}>◂ Retour</button>
  {/if}
  <h1>Diagnostic audio</h1>
  <p class="aide">
    Appuie sur les essais <strong>dans l’ordre</strong>, et note lesquels tu
    ENTENDS — un essai peut réussir sans erreur et rester muet, c’est justement ce
    qu’on cherche. Les essais 3 à 5 jouent le <em>même</em> bip, injecté de plus en
    plus loin dans le moteur : le premier qui se tait nomme l’étage fautif.
  </p>

  <div class="essais">
    <button class="tap44" onclick={() => essai('1. BIP NU (contexte sans latencyHint)', () => bip(null))}
      >1 · BIP NU</button
    >
    <button class="tap44" onclick={() => essai('2. BIP INTERACTIF (contexte avec latencyHint)', () => bip('interactive'))}
      >2 · BIP INTERACTIF</button
    >
    <button class="tap44" onclick={() => essai('3. SONDE — sortie directe (hors graphe)', () => engine.sondeSortie('destination'))}
      >3 · SONDE SORTIE</button
    >
    <button class="tap44" onclick={() => essai('4. SONDE — entrée du mix (chaîne finale)', () => engine.sondeSortie('mixBus'))}
      >4 · SONDE MIX</button
    >
    <button class="tap44" onclick={() => essai('5. SONDE — bus de la ligne kick (effets globaux compris)', () => engine.sondeSortie('kick'))}
      >5 · SONDE LIGNE</button
    >
    <button class="tap44" onclick={() => essai('6. APERÇU KICK (la voix complète)', () => engine.preview('kick', 1))}
      >6 · APERÇU KICK</button
    >
    <button class="tap44" onclick={lecture}>7 · LECTURE</button>
    <button class="tap44" onclick={() => essai('STOP', () => engine.stop())}>■ STOP</button>
  </div>

  <h2>Ce que le moteur voit</h2>
  <table>
    <tbody>
      {#each LIGNES_ETAT.map((c) => [c, etat[c]] as const) as [cle, valeur] (cle)}
        <tr>
          <th>{LIBELLES[cle] ?? cle}</th>
          <td class:alerte={estAlerte(cle, valeur)}
            >{valeur === null ? 'non déclaré' : String(valeur)}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>

  <h2>Tampons disponibles</h2>
  <p class="aide">
    Ce que le navigateur accorde vraiment selon ce qu’on lui demande.
    <code>latencyHint</code> est un vœu, pas une garantie : si toutes les lignes
    affichent le même tampon, aucune demande ne sert à rien sur cet appareil.
  </p>
  <div class="essais">
    <button class="tap44" onclick={sonderTampons}>Sonder les tampons</button>
  </div>
  {#if tampons.length}
    <ol class="journal">
      {#each tampons as ligne, i (i)}
        <li>{ligne}</li>
      {/each}
    </ol>
  {/if}

  <h2>Chaîne doigt → oreille</h2>
  <p class="aide">
    Tape une dizaine de fois sur la zone ci-dessous, puis lance la mesure à
    l’oreille. Un chiffre déclaré par le navigateur ne prouve rien — c’est
    l’écart entre les deux totaux qui compte.
  </p>
  <button class="pad" onpointerdown={taper} aria-label="Zone de frappe">
    {retards.length === 0 ? 'TAPE ICI' : `${retards.length} frappe${retards.length > 1 ? 's' : ''}`}
  </button>
  <div class="essais">
    <button class="tap44" onclick={() => (retards = [])}>Remettre à zéro</button>
    <button class="tap44" onclick={() => (calibrage = true)}>🎧 Mesurer à l’oreille</button>
  </div>
  <table>
    <tbody>
      <tr><th>doigt → dalle → système</th><td class="inconnu">invisible depuis une page</td></tr>
      <tr>
        <th>file d’événements → notre code</th>
        <td class:alerte={retards.length > 0 && retardMedian > 30}
          >{retards.length ? `${retardMedian} ms` : '—'}</td
        >
      </tr>
      <tr><th>avance de programmation</th><td>{nb(etat.avanceDeclenchementMs)} ms</td></tr>
      <tr><th>tampon du navigateur (déclaré)</th><td>{etat.baseLatencyMs ?? 'non déclaré'} ms</td></tr>
      <tr><th>sortie totale (déclarée)</th><td>{etat.outputLatencyMs ?? 'non déclaré'} ms</td></tr>
      <tr><th>total AVOUÉ</th><td>{totalAvoue} ms</td></tr>
      <tr>
        <th>mesuré à l’oreille (calibrage)</th>
        <td class:alerte={latence.ms > 50}>{latence.ms === 0 ? 'non mesuré' : `${latence.ms} ms`}</td>
      </tr>
      <tr>
        <th>ce que le navigateur n’avoue pas</th>
        <td class:alerte={latence.ms !== 0 && latence.ms - totalAvoue > 30}
          >{latence.ms === 0 ? '—' : `${latence.ms - totalAvoue} ms`}</td
        >
      </tr>
    </tbody>
  </table>

  <h2>Régularité du scheduler</h2>
  <p class="aide">
    Mesurée pendant la lecture (essai 7), et remise à zéro à chaque départ. Un
    « ça rame » se lit ici, jamais dans un chiffre de latence : tant que le retard
    du fil principal reste sous l’horizon de programmation (250 ms), rien ne
    s’entend.
  </p>
  <table>
    <tbody>
      <tr><th>réveils du scheduler</th><td>{nb(etat.ticks)}</td></tr>
      <tr>
        <th>retard maximal d’un réveil</th>
        <td class:alerte={nb(etat.retardTickMaxMs) > 100}>{nb(etat.retardTickMaxMs)} ms</td>
      </tr>
      <tr>
        <th>réveils au-delà de l’horizon</th>
        <td class:alerte={nb(etat.ticksHorsHorizon) > 0}>{nb(etat.ticksHorsHorizon)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Journal</h2>
  {#if journal.length === 0}
    <p class="aide">Aucun essai lancé.</p>
  {:else}
    <ol class="journal">
      {#each journal as ligne, i (i)}
        <li>{ligne}</li>
      {/each}
    </ol>
  {/if}

  <p class="aide">
    Navigateur : <code>{navigator.userAgent}</code>
  </p>

  <!-- ⚠️ RÉUTILISÉ, jamais réécrit : ce panneau est la seule mesure
       doigt → oreille du projet, et il a déjà coûté une correction de signe et
       une refonte du métronome. Deux mesures qui doivent rester d'accord
       finissent par ne plus l'être (CLAUDE.md). -->
  {#if calibrage}
    <CalibrageLatence {engine} onClose={() => (calibrage = false)} />
  {/if}
</div>

<style>
  .diag {
    padding: 14px;
    max-width: 640px;
    margin: 0 auto;
    font-size: var(--xp-size-body);
  }
  h1,
  h2 {
    font-size: var(--xp-size-title);
    letter-spacing: var(--xp-ls-title);
    text-transform: uppercase;
    color: var(--xp-accent-amber);
    margin: 14px 0 6px;
  }
  .pad {
    display: block;
    width: 100%;
    min-height: 88px;
    margin-bottom: 8px;
    border: 1px solid var(--xp-line);
    border-radius: 4px;
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd);
    box-shadow: var(--xp-bevel-in);
    font-family: inherit;
    font-size: var(--xp-size-btn);
    letter-spacing: var(--xp-ls-btn);
    text-transform: uppercase;
    /* Un pad de mesure ne doit pas déclencher le zoom ou le défilement sous le
       doigt : ça décalerait l'instant qu'on mesure. */
    touch-action: none;
  }
  td.inconnu {
    color: var(--xp-muted);
  }
  .retour {
    padding: 8px 12px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    box-shadow: var(--xp-bevel-out);
    font-family: inherit;
    font-size: var(--xp-size-btn);
    letter-spacing: var(--xp-ls-btn);
    text-transform: uppercase;
    font-weight: 700;
  }
  .aide {
    margin: 0 0 10px;
    opacity: 0.9;
  }
  .essais {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .essais button {
    flex: 1 1 auto;
    padding: 10px 12px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    box-shadow: var(--xp-bevel-out);
    font-family: inherit;
    font-size: var(--xp-size-btn);
    letter-spacing: var(--xp-ls-btn);
    text-transform: uppercase;
    font-weight: 700;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--xp-lcd-bg);
  }
  th,
  td {
    text-align: left;
    padding: 4px 8px;
    border-bottom: 1px solid var(--xp-line);
    font-weight: 400;
  }
  th {
    color: var(--xp-muted);
    white-space: nowrap;
  }
  td {
    color: var(--xp-lcd);
    text-align: right;
  }
  /* Amber pour ce qui cloche — jamais le vert, qui dit « allumé / fait ». */
  td.alerte {
    color: var(--xp-accent-amber);
  }
  .journal {
    margin: 0;
    padding-left: 18px;
  }
  .journal li {
    margin-bottom: 4px;
    word-break: break-word;
  }
  code {
    word-break: break-all;
    opacity: 0.8;
  }
</style>
