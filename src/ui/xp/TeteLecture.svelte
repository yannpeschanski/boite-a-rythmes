<!--
  La TÊTE DE LECTURE continue — une seule définition pour le Mode jeu et
  l'Atelier (2026-11-24, « il faut que le visuel défile pareil »).

  ⚠️ Pourquoi une barre et pas seulement la case allumée : une case ne peut
  changer qu'à une IMAGE (16,7 ms). Mesuré sur un pas de 178,6 ms : la case
  changeait toutes les 166 à 184 ms — un boitement d'une image, alors que le son
  est régulier. La barre, elle, est placée à chaque image depuis l'horloge
  ENTENDUE (`AudioEngine.mesureEntendue()`), donc elle glisse sans à-coup. La
  case allumée reste : elle dit QUELLE case, la barre dit OÙ on en est.

  `position` : fraction de la LIGNE parcourue (0..1) ; négative = à l'arrêt.
  Le parent doit être `position: relative`. Aucun clic ne s'y arrête.
-->
<script lang="ts">
  let { position }: { position: number } = $props();
</script>

{#if position >= 0}
  <span class="tete" style:left="{position * 100}%" aria-hidden="true"></span>
{/if}

<style>
  .tete {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    margin-left: -1px;
    background: var(--xp-playhead);
    box-shadow: 0 0 4px var(--xp-playhead);
    pointer-events: none;
    z-index: 2;
  }
</style>
