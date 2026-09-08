<script lang="ts">
  /* LES PARTIES A / B / C — l'endroit où on les FABRIQUE.
   *
   * ⚠️ ELLE A DÉMÉNAGÉ DANS L'ONGLET PRODUCTION — arbitrage de Yann : « je le
   * mettrais dans le volet production pour pas prendre une place dans la
   * sticky ». La barre collante porte le transport, le tempo, un conseil et
   * trois onglets ; une rangée de plus y coûtait 61 px sur les trois onglets,
   * en permanence, pour un geste qu'on fait quelques fois par morceau.
   *
   * ⚠️ ET L'APPUI LONG A DISPARU. Il rangeait une lettre — donc écrasait un
   * motif — sans confirmation. Expliqué deux fois à Yann, pas compris deux
   * fois : après deux tentatives ce n'est plus un problème de rédaction, c'est
   * le geste qui est mauvais. Ici il y a la place pour des boutons NOMMÉS, donc
   * plus rien n'est caché dans un maintien.
   *
   * Ce que le chantier supprime, en gestes : avant, composer -> ➕ -> taper un
   * nom dans un `prompt()` -> Mode Live -> ⚙ -> un sélecteur PAR SECTION (huit
   * pour le modèle POP). Maintenant : un clic sur « ranger sous A ».
   * « De A on développe B » n'a pas de verbe à lui, et c'est voulu : on charge
   * A, on le modifie, on le range sous B.
   */
  import { parties } from '../../stores/parties.svelte';
  import { PARTIES, type PartieId } from '../../model/parties';

  let derniere = $state<PartieId | null>(null);

  /* ⚠️ Ranger sur une lettre PLEINE demande confirmation. Ailleurs non : sur
     une lettre vide il n'y a rien à perdre, et une confirmation à chaque geste
     anodin s'apprend à cliquer sans lire. */
  function ranger(id: PartieId) {
    const p = parties.get(id);
    if (p && !confirm(`Remplacer la partie ${id}${p.nom ? ` (${p.nom})` : ''} par le rythme affiché ?`)) return;
    parties.ranger(id, p?.nom ?? '');
    derniere = id;
  }

  function charger(id: PartieId) {
    parties.charger(id);
    derniere = id;
  }

  function vider(id: PartieId) {
    const p = parties.get(id);
    if (!p) return;
    if (!confirm(`Vider la partie ${id}${p.nom ? ` (${p.nom})` : ''} ?`)) return;
    parties.vider(id);
    if (derniere === id) derniere = null;
  }

  function renommer(id: PartieId) {
    const nom = prompt(`Nom de la partie ${id} (facultatif — la lettre reste son identité) :`, parties.get(id)?.nom ?? '');
    if (nom === null) return;
    parties.renommer(id, nom);
  }
</script>

<p class="hint">
  Une <strong>partie</strong> est une des matières du morceau — A, B, C. Le Mode Live les enchaîne
  selon un montage (couplet / refrain, AABA, club…) et tu joues les variations par-dessus.
  Range ici le rythme affiché ; recharge-le pour le retravailler.
</p>

<div class="parties">
  {#each PARTIES as id (id)}
    {@const p = parties.get(id)}
    <div class="partie" class:remplie={!!p} class:courante={derniere === id}>
      <div class="tete">
        <span class="lettre">{id}</span>
        {#if p}
          <button class="nom" onclick={() => renommer(id)} title="Renommer la partie {id}">
            {p.nom || 'sans nom'}
          </button>
        {:else}
          <span class="nom vide">vide</span>
        {/if}
      </div>
      <div class="actions">
        <button class="xp-btn" onclick={() => ranger(id)} title="Ranger le rythme affiché sous {id}">
          {p ? 'Remplacer' : 'Ranger ici'}
        </button>
        <button class="xp-btn" disabled={!p} onclick={() => charger(id)} title="Charger {id} dans l’Atelier">
          Charger
        </button>
        <button class="xp-btn" disabled={!p} onclick={() => vider(id)} title="Vider la partie {id}">🗑</button>
      </div>
    </div>
  {/each}
</div>

{#if parties.persistanceRefusee}
  <!-- ⚠️ Un refus du stockage ne doit jamais être silencieux : `localStorage`
       EXISTE en navigation privée stricte, il lève à l'écriture. Une partie
       rangée qui disparaîtrait au rechargement sans un mot, c'est le morceau
       qu'on croyait tenir. -->
  <p class="refus">⚠ Les parties ne seront pas conservées après fermeture — le stockage est refusé par le navigateur.</p>
{/if}

<style>
  .hint {
    font-size: 9px;
    color: var(--xp-muted);
    line-height: 1.5;
    margin: 0 0 8px;
    max-width: 70ch;
  }
  .parties {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  /* ⚠️ 210 px et non 150 : à 150, deux parties tiennent sur une rangée en
     390 px de large, chaque bouton retombe à ~54 px et « CHARGER » — un seul
     mot, donc insécable — DÉBORDE de sa boîte. Mesuré à la capture, pas
     supposé. Une partie par rangée sur mobile, deux dès qu'il y a la place. */
  .partie {
    flex: 1 1 210px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 6px;
    border: 1px solid var(--xp-line);
    background: var(--xp-face);
    /* Une lettre VIDE reste en creux : le biseau dit ce qui existe. */
    box-shadow: var(--xp-bevel-in);
  }
  .partie.remplie {
    box-shadow: var(--xp-bevel-out);
  }
  .partie.courante {
    outline: 1px solid var(--xp-accent-amber);
  }
  .tete {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }
  .lettre {
    font-size: 14px;
    font-weight: 700;
    color: var(--xp-text);
    flex: none;
  }
  .nom {
    flex: 1;
    min-width: 0;
    font-family: var(--xp-font);
    font-size: 9px;
    text-align: left;
    color: var(--xp-muted);
    background: none;
    border: 0;
    padding: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button.nom {
    cursor: pointer;
    text-decoration: underline dotted;
  }
  .actions {
    display: flex;
    gap: 4px;
  }
  /* Apparence dans styles/global.css ; ici, la taille seule. */
  .xp-btn {
    flex: 1;
    min-width: 0;
    padding: 5px 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    min-height: 28px;
    font-size: 9px;
  }
  .xp-btn:last-child {
    flex: 0 0 34px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  .refus {
    font-size: 9px;
    color: var(--xp-accent-amber);
    margin: 8px 0 0;
  }
  /* ⚠️ En fin de <style> : un bloc @media posé au milieu est écrasé par les
     règles écrites plus bas. */
  @media (pointer: coarse) {
    .xp-btn {
      min-height: 44px;
    }
    .xp-btn:last-child {
      flex: 0 0 44px;
    }
  }
</style>
