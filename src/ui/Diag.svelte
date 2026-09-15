<script lang="ts">
  /* ÉCRAN DE DIAGNOSTIC — `#diag`. Hors de l'appli, jamais atteint par hasard.
   *
   * POURQUOI IL EXISTE (2026-09-15). Sur Firefox, « on appuie sur lecture et il
   * ne se passe rien » : pas de son, pas de tête de lecture, et — après le
   * capteur de pannes — pas de message non plus. Donc la cause ne LÈVE pas, et
   * aucun des deux instruments précédents ne pouvait la voir. Il n'y a pas de
   * console sur un téléphone : l'état doit s'AFFICHER.
   *
   * Trois essais, du plus nu au plus complet, pour couper le problème en deux à
   * chaque étape :
   *   1. un bip sur un `AudioContext` NU — c'est le chemin des sons du récit
   *      (`ui/xp/systemSounds.ts`), celui dont on sait déjà qu'il marche ;
   *   2. un APERÇU du moteur — construit le graphe complet, sans scheduler ;
   *   3. la LECTURE — graphe + scheduler.
   * Le premier qui échoue nomme l'étage.
   *
   * Tout est enveloppé : ce qui lève s'écrit, et ce qui dort se lit dans le
   * tableau d'état, rafraîchi cinq fois par seconde.
   */
  import { onDestroy } from 'svelte';
  import { AudioEngine } from '../engine/AudioEngine';
  import { defaultState } from '../model/defaults';

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

  /* 1. Le chemin NU : pas de latencyHint, pas de graphe, deux nœuds. Si celui-ci
        échoue, ce n'est pas l'appli, c'est Web Audio sur cet appareil. */
  function bipNu(): void {
    const ctx = new AudioContext();
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
    noter(`   (contexte nu : ${ctx.state}, horloge ${ctx.currentTime.toFixed(3)})`);
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
    await essai('3. LECTURE (graphe + scheduler)', () => engine.start());
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
  <h1>Diagnostic audio</h1>
  <p class="aide">
    Appuie sur les trois essais <strong>dans l’ordre</strong>. Le premier qui échoue nomme
    l’étage en cause. Envoie une capture de cet écran.
  </p>

  <div class="essais">
    <button class="tap44" onclick={() => essai('1. BIP NU (sans le moteur)', bipNu)}
      >1 · BIP NU</button
    >
    <button class="tap44" onclick={() => essai('2. APERÇU (graphe, sans scheduler)', () => engine.preview('kick', 1))}
      >2 · APERÇU KICK</button
    >
    <button class="tap44" onclick={lecture}>3 · LECTURE</button>
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
