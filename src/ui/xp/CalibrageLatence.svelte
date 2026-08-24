<script lang="ts">
  /* Le calibrage du décalage d'entrée — un métronome nu, une douzaine de
   * frappes, et on compare les frappes aux temps PROGRAMMÉS des clics.
   *
   * POURQUOI CE COMPOSANT EXISTE (2026-08-24, « il y a un peu trop de délai
   * aux écouteurs bluetooth »). Cette mesure vivait entièrement dans
   * `GameView`, alors que ce qu'elle règle — `ui/latence.svelte.ts` — est une
   * propriété de l'APPAREIL, partagée par tous les écrans qui datent une
   * frappe. Le pad d'écriture de l'Atelier en dépend depuis qu'il quantifie ce
   * qu'on joue pendant la lecture ; il n'avait aucun moyen d'y accéder. Un
   * casque Bluetooth rend la chose visible : on joue en place avec ce qu'on
   * entend, et les notes tombent un pas plus loin.
   *
   * L'extraction plutôt qu'un second écran de calibrage : deux mesures qui
   * doivent rester d'accord finissent toujours par ne plus l'être, et
   * celle-ci a déjà coûté une correction de signe et une refonte du
   * métronome. Une seule, appelée de deux endroits.
   *
   * ⚠️ Ce que le calibrage NE FAIT PAS : rendre le son plus rapide. Une
   * latence de déclenchement ne se compense pas — on ne peut pas jouer un son
   * avant la frappe. Ce qui se corrige, c'est la MESURE d'un placement : ce
   * qu'on écrit tombe où on l'a joué, même entendu 150 ms plus tard.
   */
  import { onDestroy } from 'svelte';
  import type { AudioEngine } from '../../engine/AudioEngine';
  import { latence } from '../latence.svelte';
  import { ecartAuClic, medianeDesEcarts } from '../../model/exercises';

  let { engine, onClose }: { engine: AudioEngine; onClose?: () => void } = $props();

  /* ⚠️ Le métronome CONTINUE tant que le panneau est ouvert.
   *
   * La première version programmait une salve unique de douze clics à
   * l'ouverture, puis jetait EN SILENCE toute frappe hors de cette fenêtre de
   * 7 secondes. Le temps de lire la consigne, la fenêtre était passée : le
   * compteur restait à zéro et rien à l'écran ne disait pourquoi. Retour de
   * Yann : « je n'arrive pas à faire fonctionner le réglage de latence ».
   *
   * Les salves s'enchaînent donc bout à bout, sans rupture de phase : la
   * grille `debut + n × intervalle` reste vraie du début à la fin, et il n'y a
   * plus de « hors fenêtre » à part avant le tout premier clic — cas qui, lui,
   * est DIT au lieu d'être ignoré.
   */
  const CLICS_PAR_SALVE = 8;
  const BPM_CALIBRAGE = 100;
  const FRAPPES_MINIMUM = 6;

  let ecarts = $state<number[]>([]);
  let attente = $state(true); // le métronome n'a pas encore commencé
  let ouvert = true;
  let debut = 0;
  let intervalle = 0;
  let fin = 0;
  let relance = 0;

  const mediane = $derived(medianeDesEcarts(ecarts));

  async function demarrer() {
    ecarts = [];
    attente = true;
    const m = await engine.metronome(CLICS_PAR_SALVE, BPM_CALIBRAGE);
    if (!ouvert) return; // fermé pendant la reprise du contexte
    debut = m.debut;
    intervalle = m.intervalle;
    fin = m.fin;
    // Réarme une salve avant que la précédente ne s'épuise. Un intervalle
    // d'avance suffit : le scheduling est bon marché et l'horloge audio ne
    // dérive pas.
    clearInterval(relance);
    relance = setInterval(async () => {
      const t = engine.audioTime();
      if (!ouvert || t === null) return;
      if (attente && t >= debut) attente = false;
      if (t > fin - 2 * intervalle) {
        const suite = await engine.metronome(CLICS_PAR_SALVE, BPM_CALIBRAGE, fin);
        if (ouvert) fin = suite.fin;
      }
    }, 300) as unknown as number;
  }

  function fermer() {
    ouvert = false;
    clearInterval(relance);
    onClose?.();
  }

  function frapper(e?: Event) {
    const maintenant = engine.audioTime();
    if (maintenant === null || !ouvert) return;
    const retard = e && e.timeStamp > 0 ? Math.max(0, (performance.now() - e.timeStamp) / 1000) : 0;
    const t = maintenant - retard;
    // Avant le premier clic : on ne jette pas la frappe en silence, on le dit.
    // Tout écran qui MESURE une frappe doit dire pourquoi il en ignore une,
    // sinon l'utilisateur conclut que la fonction est cassée.
    if (t < debut - intervalle / 2) {
      attente = true;
      return;
    }
    attente = false;
    // Écart au clic le plus proche : la frappe est datée, les clics aussi. Le
    // calcul vit dans model/exercises.ts — une erreur de signe ici corrigerait
    // la latence à l'envers, et c'est exactement le genre de faute qu'on ne
    // voit pas en relisant.
    ecarts = [...ecarts, ecartAuClic(t, debut, intervalle)];
  }

  function valider() {
    // Additif : les frappes du calibrage sont déjà corrigées par le réglage en
    // place, leur médiane est donc ce qu'il RESTE à corriger.
    latence.affiner(mediane);
    fermer();
  }

  /* La barre d'espace frappe aussi : sur un clavier, viser un pad à la souris
     ajoute une latence de visée à ce qu'on mesure — et ce qu'on mesure ici est
     précisément une latence. */
  function surTouche(e: KeyboardEvent) {
    if (e.code !== 'Space' || e.repeat) return;
    e.preventDefault();
    frapper(e);
  }

  demarrer();
  onDestroy(() => {
    ouvert = false;
    clearInterval(relance);
  });
</script>

<svelte:window onkeydown={surTouche} />

<div class="calibrage">
  <p class="consigne">
    Le métronome tourne <strong>en continu</strong> : prends ton temps, puis tape sur le
    pad à chaque clic. Ne cherche pas à bien faire — on mesure le retard de ton
    appareil, pas ton sens du rythme. Il faut {FRAPPES_MINIMUM} frappes.
  </p>
  <button class="pad" onpointerdown={frapper} aria-label="Frapper pour calibrer">
    {#if attente}
      le métronome démarre…
    {:else if ecarts.length < FRAPPES_MINIMUM}
      TAPE SUR LES CLICS
    {:else}
      C’EST BON — tu peux appliquer
    {/if}
  </button>
  <div class="jauge" role="meter" aria-valuenow={ecarts.length} aria-valuemin="0" aria-valuemax={FRAPPES_MINIMUM}>
    <div class="barre" style:width="{Math.min(100, (ecarts.length / FRAPPES_MINIMUM) * 100)}%"></div>
  </div>
  <p class="chiffres">
    {ecarts.length} frappe{ecarts.length > 1 ? 's' : ''} — il en faut {FRAPPES_MINIMUM}
    {#if ecarts.length >= FRAPPES_MINIMUM}
      — décalage mesuré {mediane > 0 ? '+' : ''}{mediane}&nbsp;ms
    {/if}
    <br />
    <span class="muted">
      Réglage actuel {latence.ms > 0 ? '+' : ''}{latence.ms}&nbsp;ms · le navigateur en
      déclare {engine.latenceSortieMs()}&nbsp;ms
    </span>
  </p>
  <div class="footer-btns">
    <button class="xp-btn primary" disabled={ecarts.length < FRAPPES_MINIMUM} onclick={valider}>
      ✓ Appliquer {mediane > 0 ? '+' : ''}{mediane}&nbsp;ms
    </button>
    <button class="xp-btn" onclick={() => (ecarts = [])}>↺ Effacer mes frappes</button>
    <button class="xp-btn" onclick={() => { latence.regler(0); fermer(); }}>Remettre à zéro</button>
    <button class="xp-btn" onclick={fermer}>Fermer</button>
  </div>
</div>

<style>
  .consigne {
    font-size: var(--xp-size-body);
    margin: 0 0 6px;
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
  .muted {
    color: var(--xp-muted);
    font-size: var(--xp-size-lcd);
  }
  .footer-btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  /* Chantier tactile (cf. styles/global.css) — EN FIN DE BLOC, sans quoi les
     règles écrites plus bas l'écraseraient à spécificité égale. */
  @media (pointer: coarse) {
    .chiffres {
      margin-bottom: 18px;
    }
    .footer-btns {
      gap: 16px;
      margin-top: 18px;
    }
  }
</style>
