<script lang="ts">
  /* LES PARTIES A / B / C / D, dans l'Atelier — l'endroit où on les FABRIQUE.
   *
   * ⚠️ C'est le geste que le chantier du 2026-09-07 supprime, pas un geste
   * qu'il ajoute. Avant : composer, cliquer ➕, taper un nom dans un `prompt()`,
   * passer en Mode Live, ouvrir ⚙, ouvrir un sélecteur, y retrouver le nom
   * qu'on vient de taper — et recommencer par SECTION. Ici : un appui long sur A.
   *
   * « De A on développe B » n'a pas de verbe à lui, et c'est voulu : on charge
   * A, on le modifie, on le range sous B.
   */
  import { parties } from '../../stores/parties.svelte';
  import { PARTIES, type PartieId } from '../../model/parties';

  let derniere = $state<PartieId | null>(null);

  function ranger(id: PartieId) {
    parties.ranger(id, parties.get(id)?.nom ?? '');
    derniere = id;
  }

  function charger(id: PartieId) {
    parties.charger(id);
    derniere = id;
  }

  /* ⚠️ LE MÊME GESTE QU'EN MODE LIVE : tap = charger, appui long = ranger.
   *
   * Ce n'est pas une commodité, c'est une MESURE. Le petit ↓ tombait à 20,3 px
   * de large en pointeur grossier — sous le seuil tactile —, et l'élargir à 44
   * faisait passer la bande sur deux rangées dans la barre sticky. Le geste
   * long, lui, ne coûte pas un pixel, et il est déjà celui des pastilles du
   * Mode Live : une lettre se range de la même façon des deux côtés. Le ↓
   * reste pour les pointeurs FINS, où un appui long serait bizarre. */
  const APPUI_LONG_MS = 550;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let longue = false;

  function surLettreDown(id: PartieId) {
    longue = false;
    minuteur = setTimeout(() => {
      longue = true;
      ranger(id);
    }, APPUI_LONG_MS);
  }
  function surLettreUp(id: PartieId) {
    if (minuteur) {
      clearTimeout(minuteur);
      minuteur = null;
    }
    if (longue) return;
    // Une lettre vide n'a rien à charger : le tap y range, comme en Mode Live.
    if (parties.remplie(id)) charger(id);
    else ranger(id);
  }
  function surLettreLeave() {
    if (minuteur) {
      clearTimeout(minuteur);
      minuteur = null;
    }
  }

  function renommer(id: PartieId) {
    const nom = prompt(`Nom de la partie ${id} (facultatif — la lettre reste son identité) :`, parties.get(id)?.nom ?? '');
    if (nom === null) return;
    parties.renommer(id, nom);
  }
</script>

<div class="parties-strip">
  <span class="titre">PARTIES</span>
  {#each PARTIES as id (id)}
    {@const p = parties.get(id)}
    <div class="partie" class:remplie={!!p} class:courante={derniere === id}>
      <button
        class="lettre"
        onpointerdown={() => surLettreDown(id)}
        onpointerup={() => surLettreUp(id)}
        onpointerleave={surLettreLeave}
        ondblclick={() => p && renommer(id)}
        title={p
          ? `${id}${p.nom ? ` — ${p.nom}` : ''} · tap : charger dans l’Atelier · appui long : y ranger le rythme affiché (double-clic : renommer)`
          : `${id} est vide · tap : y ranger le rythme affiché`}
      >
        <span class="l">{id}</span>
        <span class="nom">{p ? p.nom || 'rangée' : 'vide'}</span>
      </button>
      <button class="ranger" onclick={() => ranger(id)} title="Ranger le rythme affiché sous {id}">↓</button>
    </div>
  {/each}
  {#if parties.persistanceRefusee}
    <!-- ⚠️ Un refus du stockage ne doit jamais être silencieux : `localStorage`
         EXISTE en navigation privée stricte, il lève à l'écriture. Une partie
         rangée qui disparaîtrait au rechargement sans un mot, c'est le morceau
         qu'on croyait tenir. -->
    <span class="refus">⚠ non conservées après fermeture (stockage refusé)</span>
  {:else}
    <span class="aide">la lettre recharge · appui long pour y ranger le rythme affiché</span>
  {/if}
</div>

<style>
  .parties-strip {
    display: flex;
    align-items: stretch;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .titre {
    align-self: center;
    font-size: 8px;
    letter-spacing: var(--xp-ls-wide, 0.08em);
    color: var(--xp-muted);
    padding-right: 2px;
  }
  .partie {
    display: flex;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    background: var(--xp-face);
  }
  /* Une lettre VIDE reste en creux : le biseau dit ce qui existe. */
  .partie:not(.remplie) {
    box-shadow: var(--xp-bevel-in);
  }
  .partie.courante {
    outline: 1px solid var(--xp-accent-amber);
  }
  .lettre {
    display: flex;
    align-items: baseline;
    gap: 4px;
    padding: 3px 6px;
    min-height: 28px;
    border: 0;
    background: transparent;
    color: var(--xp-text);
    font-family: var(--xp-font);
    cursor: pointer;
  }
  /* Une lettre vide reste lisible mais en retrait : elle n'est pas désactivée,
     un tap y RANGE. */
  .partie:not(.remplie) .lettre {
    color: var(--xp-muted);
  }
  .l {
    font-size: 12px;
    font-weight: 700;
  }
  .nom {
    font-size: 8px;
    color: var(--xp-muted);
    max-width: 9ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ranger {
    border: 0;
    border-left: 1px solid var(--xp-line);
    background: transparent;
    color: var(--xp-accent-amber);
    font-size: 12px;
    padding: 0 7px;
    cursor: pointer;
    font-family: var(--xp-font);
  }
  .ranger:active {
    box-shadow: var(--xp-bevel-in);
  }
  .aide,
  .refus {
    align-self: center;
    font-size: 8px;
    color: var(--xp-muted);
  }
  .refus {
    color: var(--xp-accent-amber);
  }
  /* ⚠️ En fin de <style> : un bloc @media posé au milieu est écrasé par les
     règles écrites plus bas. */
  @media (pointer: coarse) {
    .lettre {
      min-height: 44px;
      /* Mesuré à 42,4 px de large avec le contenu le plus court (« A vide ») :
         1,6 px sous le seuil, donc posé plutôt que supposé. */
      min-width: 44px;
      justify-content: center;
    }
    /* ⚠️ Mesuré à 20,3 px de large : sous le seuil, et l'élargir à 44 poussait
       la bande sur deux rangées de la barre sticky. En tactile c'est l'appui
       long qui range — le même geste qu'en Mode Live. */
    .ranger {
      display: none;
    }
  }
</style>
