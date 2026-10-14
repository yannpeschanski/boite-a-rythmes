<script lang="ts">
  /* Aligner l'IMAGE sur le SON, à l'œil — le réglage « audio/vidéo » des jeux
   * de rythme.
   *
   * Une case s'allume au rythme d'un clic ; on déplace le curseur jusqu'à ce
   * que la lumière et le clic tombent ensemble. Rien n'est frappé, donc la
   * dalle tactile n'entre pas dans la mesure (voir `ui/synchroImage.svelte.ts`
   * pour la différence avec le calibrage d'entrée).
   *
   * ⚠️ Le métronome CONTINUE tant que le panneau est ouvert, comme celui de
   * `CalibrageLatence` : un réglage à l'œil demande d'observer plusieurs
   * coups après chaque geste, pas une salve qu'on rate en lisant.
   */
  import { onDestroy } from 'svelte';
  import type { AudioEngine } from '../../engine/AudioEngine';
  import { synchroImage, IMAGE_MIN_MS, IMAGE_MAX_MS } from '../synchroImage.svelte';
  import XpSlider from './XpSlider.svelte';

  let { engine, onClose }: { engine: AudioEngine; onClose?: () => void } = $props();

  const CLICS_PAR_SALVE = 8;
  const BPM = 80;
  /* Durée pendant laquelle la case reste allumée après le coup : assez pour
     être vue à 60 Hz, assez court pour qu'on juge un DÉBUT, pas une durée. */
  const ALLUME_S = 0.09;

  let ouvert = true;
  let programme = 0;
  let intervalle = 0;
  let fin = 0;
  let relance = 0;
  let raf = 0;
  let allume = $state(false);
  let valeur = $state(synchroImage.ms);

  async function demarrer() {
    const m = await engine.metronome(CLICS_PAR_SALVE, BPM);
    if (!ouvert) return;
    programme = m.programme;
    intervalle = m.intervalle;
    fin = m.fin;
    relance = setInterval(async () => {
      const t = engine.audioTime();
      if (!ouvert || t === null) return;
      if (t > fin - 2 * intervalle) {
        const suite = await engine.metronome(CLICS_PAR_SALVE, BPM, fin);
        if (ouvert) fin = suite.fin;
      }
    }, 300) as unknown as number;
    boucle();
  }

  /* La case suit EXACTEMENT l'horloge des grilles (`consumePlayhead`) : le
     son déclaré, moins le décalage réglé. Si elle colle au clic ici, elle
     colle aux coups partout. */
  function boucle() {
    const t = engine.audioTime();
    if (t !== null && intervalle > 0) {
      const phase = (t - synchroImage.ms / 1000 - programme) / intervalle;
      allume = phase >= 0 && phase - Math.floor(phase) < ALLUME_S / intervalle;
    }
    raf = requestAnimationFrame(boucle);
  }

  function regler(ms: number) {
    valeur = Math.max(IMAGE_MIN_MS, Math.min(IMAGE_MAX_MS, Math.round(ms)));
    synchroImage.regler(valeur);
  }

  function fermer() {
    ouvert = false;
    clearInterval(relance);
    cancelAnimationFrame(raf);
    onClose?.();
  }

  demarrer();
  onDestroy(() => {
    ouvert = false;
    clearInterval(relance);
    cancelAnimationFrame(raf);
  });
</script>

<div class="synchro">
  <p class="consigne">
    La case doit s’allumer <strong>en même temps</strong> que le clic. Si elle
    s’allume avant, pousse vers la droite ; après, vers la gauche. Le réglage
    vaut pour toutes les grilles du jeu, sur cet appareil.
  </p>
  <div class="case" class:allume aria-hidden="true"></div>
  <XpSlider
    label="Image retardée de"
    min={IMAGE_MIN_MS}
    max={IMAGE_MAX_MS}
    step={10}
    unit="ms"
    bind:value={valeur}
    onchange={regler}
  />
  <div class="pas">
    <button class="xp-btn tap44" onclick={() => regler(valeur - 10)}>◂ −10 ms</button>
    <button class="xp-btn tap44" onclick={() => regler(0)}>Remettre à 0</button>
    <button class="xp-btn tap44" onclick={() => regler(valeur + 10)}>+10 ms ▸</button>
  </div>
  <button class="xp-btn primary tap44" onclick={fermer}>✓ C’est aligné</button>
</div>

<style>
  .synchro {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .consigne {
    font-size: var(--xp-size-body);
    margin: 0;
  }
  /* Une case de grille, en grand : on juge le moment où elle s'ALLUME. */
  .case {
    align-self: center;
    width: 72px;
    height: 72px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-lcd-bg);
    box-shadow: var(--xp-bevel-in);
  }
  .case.allume {
    background: var(--xp-playhead);
  }
  .pas {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  @media (pointer: coarse) {
    .synchro {
      gap: 14px;
    }
  }
</style>
