<script lang="ts">
  // Textes historiques et conseil d'écoute du morceau chargé.
  //
  // Vivaient sous le sélecteur de presets, dans le bloc supprimé par l'audit
  // A6. C'est la raison pour laquelle le choix du morceau n'a pas été
  // simplement basculé en menu et rien d'autre : un menu peut porter une
  // liste de 34 noms, pas ~880 lignes de contenu pédagogique — et ce contenu
  // est un des atouts du projet, pas un détail à sacrifier au gain de place.
  // Le partage retenu : le menu CHARGE (action, gratuite en hauteur), cet
  // onglet RACONTE (contenu, qui a besoin de place).
  //
  // Différence de comportement assumée par rapport au sélecteur : on lisait
  // le texte en SÉLECTIONNANT, avant de charger ; on le lit maintenant APRÈS
  // avoir chargé. Le choix se fait donc au nom, comme dans le sélecteur — un
  // `<option>` n'affichait rien de plus.
  import type { SongPresetData } from '../../model/presets/songs';

  let { preset }: { preset: SongPresetData | null } = $props();
</script>

{#if preset}
  <div class="notes">
    <p class="name">{preset.label}<span class="cat"> · {preset.cat}</span></p>
    <p class="history">{preset.history}</p>
    <p class="demo">💡 {preset.demo}</p>
  </div>
{:else}
  <p class="empty">
    Aucun morceau chargé pour l’instant. Ouvre le menu <strong>Fichier</strong> de la barre du
    haut : les 34 morceaux y sont rangés par style, et leur histoire s’affiche ici une fois chargés.
  </p>
{/if}

<style>
  .notes {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .name {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: var(--xp-text);
  }
  .cat {
    font-weight: 400;
    color: var(--xp-muted);
  }
  .history,
  .demo {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--xp-text);
    max-width: 70ch;
  }
  .demo {
    color: var(--xp-muted);
  }
  .empty {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--xp-muted);
    max-width: 70ch;
  }
</style>
