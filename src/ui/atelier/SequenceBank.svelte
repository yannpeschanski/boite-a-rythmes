<script lang="ts">
  // Banque de séquences (PLAN.md §6) : sauvegarder/rappeler plusieurs
  // patterns nommés, même liste que celle proposée depuis le Mode Live
  // (stores/bank.svelte.ts, store partagé). Même charte que PresetPicker
  // (select + Charger) plutôt qu'une fenêtre XP dédiée — c'est la même
  // interaction (choisir dans une liste, charger), pas besoin de plus.
  import { sequenceBank } from '../../stores/bank.svelte';

  let { onApplied }: { onApplied?: () => void } = $props();

  let selectedId = $state('');
  const selected = $derived(sequenceBank.entries.find((e) => e.id === selectedId) ?? null);

  function save() {
    const name = prompt('Nom de la séquence :', `Séquence ${sequenceBank.entries.length + 1}`);
    if (name === null) return; // annulé
    sequenceBank.save(name);
  }

  function load() {
    if (!selected) return;
    sequenceBank.load(selected.id);
    onApplied?.();
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

<div class="picker">
  <select bind:value={selectedId}>
    <option value="">— Banque : {sequenceBank.entries.length ? 'choisir une séquence…' : 'vide'}</option>
    {#each sequenceBank.entries as e (e.id)}
      <option value={e.id}>{e.name}</option>
    {/each}
  </select>
  <button class="xp-btn" disabled={!selected} onclick={load}>Charger</button>
  <button class="xp-btn" onclick={save} title="Enregistrer le pattern actuel dans la banque">➕</button>
  <button class="xp-btn" disabled={!selected} onclick={rename} title="Renommer">✏️</button>
  <button class="xp-btn" disabled={!selected} onclick={remove} title="Supprimer">🗑</button>
</div>

<style>
  .picker {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
  }
  select {
    flex: 1;
    font-family: var(--xp-font);
    font-size: 13px;
    padding: 3px;
    border: 1px solid var(--xp-line);
    background: #fff;
  }
  .xp-btn {
    padding: 4px 10px;
    border: 1px solid #003c74;
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    cursor: pointer;
  }
  .xp-btn:active {
    box-shadow: var(--xp-bevel-in);
  }
  .xp-btn:disabled {
    color: var(--xp-muted);
    cursor: default;
  }
</style>
