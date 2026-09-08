<script lang="ts">
  /* LA BANQUE — le MATÉRIEL, à côté des PARTIES qui sont le morceau monté.
   *
   * ⚠️ CE QUE CE PANNEAU RÉPARE. Yann : « il faut faire du rangement entre la
   * banque des séquences et les assemblages de morceau ». Les deux listes
   * coexistaient sans que rien ne dise à quoi sert laquelle, ni comment passer
   * de l'une à l'autre — et le jeu, lui, remplit les deux à la scène de
   * l'acte 6 (neuf boucles en banque, trois montées en lettres).
   *
   * La distinction est simple et elle est maintenant ÉCRITE : la banque est
   * tout ce qu'on a composé, les lettres sont ce qui est monté MAINTENANT. Un
   * seul geste les relie — « → A », qui tire du matériel vers une lettre — au
   * lieu de deux listes qui s'ignorent.
   */
  import { sequenceBank } from '../../stores/bank.svelte';
  import { parties } from '../../stores/parties.svelte';
  import { PARTIES, type PartieId } from '../../model/parties';

  let selectedId = $state('');
  const selected = $derived(sequenceBank.entries.find((e) => e.id === selectedId) ?? null);
  let compteRendu = $state('');

  function save() {
    const name = prompt('Nom de la séquence :', `Séquence ${sequenceBank.entries.length + 1}`);
    if (name === null) return; // annulé
    sequenceBank.save(name);
  }

  function rename() {
    if (!selected) return;
    const name = prompt('Renommer la séquence :', selected.name);
    if (name === null) return;
    sequenceBank.rename(selected.id, name);
  }

  function remove() {
    if (!selected) return;
    if (!confirm(`Supprimer « ${selected.name} » de la banque ?`)) return;
    sequenceBank.remove(selected.id);
    selectedId = '';
  }

  /* LE GESTE QUI RELIE LES DEUX. Écraser une lettre pleine demande
     confirmation — même règle que le panneau des parties. */
  function versLettre(id: PartieId) {
    if (!selected) return;
    const dejaLa = parties.get(id);
    if (dejaLa && !confirm(`Remplacer la partie ${id}${dejaLa.nom ? ` (${dejaLa.nom})` : ''} par « ${selected.name} » ?`)) return;
    parties.poser(id, selected.json, selected.name);
    compteRendu = `« ${selected.name} » rangée sous ${id}.`;
  }
</script>

<p class="hint">
  La banque est <strong>le matériel</strong> : tout ce que tu as composé, sous des noms libres, sans
  limite de nombre. Les <strong>parties A / B / C</strong>, juste au-dessus, sont le morceau monté
  <em>maintenant</em> — trois emplacements que le Mode Live enchaîne. Le bouton
  <strong>→ A</strong> tire du matériel vers une lettre.
</p>

<div class="picker">
  <select bind:value={selectedId} aria-label="Séquence à renommer ou supprimer">
    <option value="">— {sequenceBank.entries.length ? 'choisir une séquence…' : 'banque vide'}</option>
    {#each sequenceBank.entries as e (e.id)}
      <option value={e.id}>{e.name}</option>
    {/each}
  </select>
  <button class="xp-btn" onclick={save} title="Enregistrer le pattern actuel dans la banque">➕ Enregistrer</button>
  <button class="xp-btn" disabled={!selected} onclick={rename} title="Renommer la séquence choisie">✏️</button>
  <button class="xp-btn" disabled={!selected} onclick={remove} title="Supprimer la séquence choisie">🗑</button>
</div>

{#if selected}
  <div class="vers">
    <span class="titre">Ranger « {selected.name} » sous</span>
    {#each PARTIES as id (id)}
      <button class="xp-btn" onclick={() => versLettre(id)} title="Ranger cette séquence sous la partie {id}">
        → {id}{parties.remplie(id) ? ' ⟲' : ''}
      </button>
    {/each}
  </div>
{/if}
{#if compteRendu}<p class="rendu">{compteRendu}</p>{/if}

<p class="where">Pour charger une séquence dans l’Atelier : menu <strong>Fichier</strong>, tout en bas de la liste.</p>

<style>
  .hint,
  .where {
    font-size: 9px;
    color: var(--xp-muted);
    line-height: 1.5;
    margin: 0 0 6px;
    max-width: 70ch;
  }
  .where {
    margin: 6px 0 0;
  }
  /* `flex-wrap` : sans lui, le select et les boutons ne tenaient pas sur une
     ligne sous 390px et les derniers SORTAIENT du cadre — 17px de
     débordement à 360px, jusqu'à 57px à 320px (repéré sur une capture de
     Yann ; le balayage automatique ne l'avait pas vu parce qu'il testait le
     débordement du viewport, pas celui des conteneurs). Le panneau est
     désormais en pleine largeur dans l'onglet Production, ce qui laisse de
     toute façon la place aux quatre contrôles. */
  .vers {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--xp-line);
  }
  .vers .titre {
    font-size: 8.5px;
    color: var(--xp-muted);
  }
  /* « ⟲ » signale une lettre DÉJÀ pleine : le geste demandera confirmation. */
  .rendu {
    font-size: 9px;
    color: var(--xp-lcd);
    margin: 6px 0 0;
  }
  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .picker select {
    flex: 1 1 160px;
    min-width: 0;
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 3px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  /* Apparence dans styles/global.css ; ici, la taille seule. */
  .xp-btn {
    padding: 6px 10px;
    min-height: 28px;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
  /* Chantier tactile (cf. styles/global.css) : `<select>` est un élément
     REMPLACÉ, Chromium n'y rend aucun `::after` — d'où `min-height` plutôt
     que `.tap44`. Et ce bloc reste en FIN de `<style>` : posé plus haut, les
     règles écrites après l'écrasent. */
  @media (pointer: coarse) {
    .picker,
    .vers {
      gap: 12px;
    }
    .picker select {
      min-height: 44px;
    }
    .picker .xp-btn,
    .vers .xp-btn {
      min-height: 44px;
    }
  }
</style>
