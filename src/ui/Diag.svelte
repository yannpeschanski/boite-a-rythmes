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
      {#each Object.entries(etat) as [cle, valeur] (cle)}
        <tr>
          <th>{LIBELLES[cle] ?? cle}</th>
          <td class:alerte={estAlerte(cle, valeur)}
            >{valeur === null ? 'non déclaré' : String(valeur)}</td
          >
        </tr>
      {/each}
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
