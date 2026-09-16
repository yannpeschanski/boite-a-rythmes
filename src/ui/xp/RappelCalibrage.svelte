<script lang="ts">
  /* Le rappel de calibrage — là où une frappe est MESURÉE, jamais ailleurs.
   *
   * ⚠️ CE N'EST PAS LE MÊME AVIS QUE `AvisLatence`, et les confondre donnerait
   * un conseil faux. Sur une surface d'instrument, le retard ne se rattrape pas
   * et le remède est de changer de navigateur ou de sortie. Ici, on ne joue pas
   * pour entendre : on joue pour être NOTÉ — et le retard se corrige
   * entièrement, puisque la frappe est datée sur l'horloge du son entendu moins
   * le décalage calibré. Un appareil à 128 ms ne fait donc pas rater le joueur…
   * À CONDITION QU'IL AIT CALIBRÉ. Tant qu'il ne l'a pas fait, il est noté avec
   * le retard de son téléphone dans les jambes, sans que rien ne le dise.
   *
   * ⚠️ UN BOUTON, PAS UNE PORTE (CLAUDE.md). On n'interrompt rien, on n'exige
   * rien : la ligne apparaît, le joueur calibre s'il veut. Elle disparaît dès
   * qu'un calibrage existe — un rappel qui survit à ce qu'il demande devient un
   * décor.
   */
  import { sortie } from '../sortie.svelte';
  import { latence } from '../latence.svelte';
  import { verdictLatence } from '../latenceVerdict';

  let { onCalibrer }: { onCalibrer: () => void } = $props();

  /* Le verdict se lit sur le seul tampon déclaré : ici, par construction, la
     mesure à l'oreille n'existe pas encore — c'est précisément ce qu'on propose
     d'aller chercher. */
  const verdict = $derived(verdictLatence(sortie.baseMs, null));
  const utile = $derived(latence.ms === 0 && verdict.palier !== 'jouable');
</script>

{#if utile}
  <p class="rappel">
    <span>
      ⚠ Cet appareil ajoute environ {verdict.ms}&nbsp;ms entre ton doigt et le son.
      Tes frappes seront notées justes une fois le décalage mesuré.
    </span>
    <button class="xp-btn tap44" onclick={onCalibrer}>🎚 Calibrer</button>
  </p>
{/if}

<style>
  /* Ambre : ce n'est pas un état « allumé / fait », c'est un avertissement. */
  .rappel {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 8px;
    padding: 6px 8px;
    border: 1px solid var(--xp-accent-amber);
    border-radius: 3px;
    background: var(--xp-accent-amber-soft);
    color: var(--xp-accent-amber);
    font-size: var(--xp-size-small);
    line-height: 1.35;
  }
  .rappel span {
    flex: 1 1 14ch;
  }
</style>
