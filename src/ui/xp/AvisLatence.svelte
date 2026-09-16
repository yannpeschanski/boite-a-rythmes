<script module lang="ts">
  /* ⚠️ ÉCARTÉ AU NIVEAU DU MODULE, pas de l'instance : « une fois par session »
     ne veut rien dire si le drapeau se réarme à chaque montage, et ce composant
     est monté par plusieurs vues qu'on traverse en jouant. */
  let ecarte = $state(false);
</script>

<script lang="ts">
  /* L'avis de latence — là où on DÉCLENCHE un son, et nulle part ailleurs.
   *
   * POURQUOI IL EXISTE (2026-09-15). Mesuré sur un téléphone : Chrome y met
   * 115 à 190 ms entre le doigt et le son, sur le haut-parleur, sans Bluetooth.
   * Firefox, même appareil, même minute : zéro. Un joueur qui arrive par Chrome
   * touche un pad et entend sa note un huitième de seconde plus tard — et il en
   * conclut que l'appli traîne. Elle ne traîne pas, et elle est la seule à
   * pouvoir le dire.
   *
   * ⚠️ OÙ IL N'APPARAÎT PAS, et c'est la moitié de la règle. Écouter une boucle
   * n'est PAS impacté : un retard constant ne s'entend que quand on déclenche.
   * Et ce qui se MESURE (les niveaux de frappe, le pad d'écriture) est déjà
   * corrigé par le calibrage — y afficher « change de navigateur » serait faux.
   * Cet avis ne va donc que sur les surfaces d'INSTRUMENT.
   *
   * ⚠️ IL NE CONSEILLE JAMAIS UNE SORTIE QUAND LA CAUSE EST LE NAVIGATEUR :
   * sur cet appareil le haut-parleur est déjà à 190 ms, débrancher son casque
   * ne donnerait rien. La distinction vit dans `latenceVerdict.ts`.
   *
   * Une fois par session : un avis qu'on revoit à chaque écran devient un
   * décor, et un décor ne se lit plus.
   */
  import { sortie } from '../sortie.svelte';
  import { latence } from '../latence.svelte';
  import { verdictLatence, messageLatence, messageLatenceCourt } from '../latenceVerdict';

  /* ⚠️ `flottant` existe pour le Mode Live, et c'est une contrainte de MISE EN
     PAGE, pas de style : la surface du Live est une grille dont les rangées sont
     mesurées au pixel en 844 × 390 (bandeau 6→22, transport 26→80, bande
     84→128), et son propre commentaire prévient qu'« un enfant en plus décale
     l'auto-placement des rangées suivantes ». L'avis y vit donc hors du flux,
     dans `.live-root`, et ne déplace rien. */
  let { flottant = false }: { flottant?: boolean } = $props();

  const verdict = $derived(verdictLatence(sortie.baseMs, latence.ms || null));
  const message = $derived(
    flottant ? messageLatenceCourt(verdict) : messageLatence(verdict),
  );
</script>

{#if message && !ecarte}
  <p
    class="avis"
    class:lourde={verdict.palier === 'lourde'}
    class:flottant
    role="status"
  >
    <span>⚠ {message}</span>
    <button class="tap44" onclick={() => (ecarte = true)} aria-label="Masquer l’avis">✕</button>
  </p>
{/if}

<style>
  /* Ambre, jamais le vert : le vert dit « allumé / fait » (CLAUDE.md). */
  .avis {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 0 0 6px;
    padding: 5px 8px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-accent-amber-soft);
    color: var(--xp-accent-amber);
    font-size: var(--xp-size-small);
    line-height: 1.35;
  }
  .avis.flottant {
    position: absolute;
    top: calc(4px + env(safe-area-inset-top, 0px));
    left: 50%;
    translate: -50%;
    width: max-content;
    max-width: min(92%, 620px);
    /* Serré pour tenir SUR UNE LIGNE au-dessus du seul bandeau (6→22) : plus
       bas, l'avis recouvrirait le transport, qui commence à 26. */
    padding: 2px 6px;
    white-space: nowrap;
    margin: 0;
    z-index: 20;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
  }
  .avis.lourde {
    border-color: var(--xp-accent-amber);
  }
  .avis span {
    flex: 1 1 auto;
  }
  .avis button {
    flex: 0 0 auto;
    padding: 0 6px;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: var(--xp-btn-face);
    color: var(--xp-text);
    font-family: inherit;
    font-size: var(--xp-size-small);
    line-height: 1.6;
  }
</style>
