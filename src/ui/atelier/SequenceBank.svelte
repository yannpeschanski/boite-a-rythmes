<script lang="ts">
  // Banque de séquences (PLAN.md §6) : sauvegarder/rappeler plusieurs
  // patterns nommés, même liste que celle proposée depuis le Mode Live
  // (stores/bank.svelte.ts, store partagé). Même charte que PresetPicker
  // (select + Charger) plutôt qu'une fenêtre XP dédiée — c'est la même
  // interaction (choisir dans une liste, charger), pas besoin de plus.
  import { sequenceBank } from '../../stores/bank.svelte';

  let { onApplied }: { onApplied?: () => void } = $props();

  let selectedId = $state('');
  let showHelp = $state(false);
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

<!-- L'explication était affichée en permanence : quatre lignes pleines sur
     un téléphone, définitivement, pour un texte qu'on lit une fois (audit
     A1 — c'était l'un des deux gros contributeurs évitables au chrome).
     Repliée derrière un ⓘ : le texte reste à un tap, il ne coûte plus une
     demi-page à ceux qui l'ont déjà lu. -->
<div class="bank-head">
  <span class="bank-title">🗄 Banque de séquences</span>
  <button
    class="info"
    class:on={showHelp}
    aria-expanded={showHelp}
    title="À quoi sert la banque de séquences ?"
    onclick={() => (showHelp = !showHelp)}>ⓘ</button
  >
</div>
{#if showHelp}
  <p class="hint">
    Enregistre plusieurs versions du pattern actuel sous un nom, pour les rappeler d’un clic —
    pratique pour préparer plusieurs séquences à l’avance, puis basculer de l’une à l’autre en Mode
    Live sans repasser par l’Atelier.
  </p>
{/if}
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
  .bank-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .bank-title {
    font-size: 11px;
    color: var(--xp-muted);
  }
  .info {
    font-family: inherit;
    font-size: 12px;
    line-height: 1;
    min-width: 26px;
    min-height: 26px;
    padding: 0;
    border: 1px solid var(--xp-line);
    border-radius: 3px;
    background: linear-gradient(180deg, #fff, #ece9d8 45%, #d6d2c2);
    box-shadow: var(--xp-bevel-out);
    color: var(--xp-accent-teal);
    cursor: pointer;
  }
  .info.on {
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-face-dark);
  }
  .hint {
    font-size: 11px;
    color: var(--xp-muted);
    margin: 4px 0;
  }
  /* `flex-wrap` manquant : le select et les quatre boutons ne tiennent pas
     sur une ligne sous 390px, et les derniers SORTAIENT du cadre — 17px de
     débordement à 360px, jusqu'à 57px à 320px (repéré sur une capture de
     Yann ; le balayage automatique ne l'avait pas vu parce qu'il testait le
     débordement du viewport, pas celui des conteneurs). */
  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
  }
  .picker select {
    flex: 1 1 160px;
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
