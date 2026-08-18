<script lang="ts">
  // Banque de séquences (PLAN.md §6) : plusieurs patterns nommés, partagés
  // avec le Mode Live via `stores/bank.svelte.ts`.
  //
  // Depuis l'audit A6, ce composant ne fait plus que la GESTION. Le
  // chargement est passé dans le menu « Fichier » de la barre du haut — le
  // garder ici AUSSI aurait recréé exactement le doublon qu'on venait
  // d'enlever ailleurs. Le partage est le même que pour les 34 morceaux :
  // le menu charge (gratuit en hauteur), le panneau gère (ce qu'un menu
  // porte mal — enregistrer, renommer, supprimer).
  import { sequenceBank } from '../../stores/bank.svelte';

  let selectedId = $state('');
  const selected = $derived(sequenceBank.entries.find((e) => e.id === selectedId) ?? null);

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
</script>

<p class="hint">
  Enregistre plusieurs versions du pattern actuel sous un nom, pour les rappeler d’un clic —
  pratique pour préparer plusieurs séquences à l’avance, puis basculer de l’une à l’autre en Mode
  Live sans repasser par l’Atelier.
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

<p class="where">Pour rappeler une séquence : menu <strong>Fichier</strong>, tout en bas de la liste.</p>

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
</style>
