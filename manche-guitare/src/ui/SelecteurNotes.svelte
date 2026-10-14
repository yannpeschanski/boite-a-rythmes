<script lang="ts">
  import Manche from './Manche.svelte';
  import type { CelluleManche } from './types';
  import { ACCORDAGE_STANDARD, NB_CASES } from '../model/accordage';
  import { nomNote, accentDuDegre } from '../model/notes';
  import {
    notesDuManche,
    grouperParCorde,
    degreDansGamme,
    gammesCorrespondantes,
    fretDeNote,
    fenetrePosition,
  } from '../engine/manche';
  import { selectionManche, basculerNote, reinitialiserSelection, afficherGamme } from '../stores/selection.svelte';

  const grilleNotes = grouperParCorde(notesDuManche(ACCORDAGE_STANDARD, NB_CASES), ACCORDAGE_STANDARD.length);

  // Numérotation habituelle des cordes : 6 = la plus grave, 1 = la plus aiguë.
  const cordesPourPosition = ACCORDAGE_STANDARD.map((classeCorde, corde) => ({
    corde,
    numero: ACCORDAGE_STANDARD.length - corde,
    nom: nomNote(classeCorde),
  }));

  let correspondances = $derived(
    gammesCorrespondantes(selectionManche.notes, undefined, selectionManche.fondamentale),
  );

  let fenetre = $derived(
    selectionManche.gammeAffichee && selectionManche.position !== null
      ? fenetrePosition(
          fretDeNote(ACCORDAGE_STANDARD, selectionManche.position, selectionManche.gammeAffichee.tonique),
          NB_CASES,
        )
      : null,
  );

  let cellules: CelluleManche[][] = $derived(
    grilleNotes.map((corde) =>
      corde.map((note) => {
        const affichage = selectionManche.gammeAffichee;
        if (affichage) {
          const degre = degreDansGamme(note.classe, affichage.tonique, affichage.gamme);
          return {
            classe: note.classe,
            visible: degre !== null,
            libelle: degre !== null ? nomNote(note.classe) : '',
            accent: degre !== null ? accentDuDegre(degre) : null,
            dansFenetre: fenetre === null || (note.case >= fenetre.debut && note.case <= fenetre.fin),
          };
        }
        const selectionnee = selectionManche.notes.includes(note.classe);
        const estFondamentale = selectionManche.fondamentale === note.classe;
        return {
          classe: note.classe,
          visible: selectionnee,
          libelle: selectionnee ? nomNote(note.classe) : '',
          accent: selectionnee ? (estFondamentale ? 'fondamentale' : ('selection' as const)) : null,
        };
      }),
    ),
  );
</script>

<div class="selecteur">
  <p>Clique sur le manche pour poser des notes — toutes leurs octaves s'allument.</p>

  <Manche accordage={ACCORDAGE_STANDARD} nbCases={NB_CASES} {cellules} onCliqueCellule={basculerNote} />

  <button type="button" onclick={reinitialiserSelection}>Effacer</button>

  {#if selectionManche.notes.length > 0}
    <label class="fondamentale">
      Fondamentale (optionnel)
      <select bind:value={selectionManche.fondamentale}>
        <option value={null}>Libre — toutes les toniques</option>
        {#each selectionManche.notes as classe (classe)}
          <option value={classe}>{nomNote(classe)}</option>
        {/each}
      </select>
    </label>

    <h3>Gammes correspondantes</h3>
    {#if correspondances.length === 0}
      <p>Aucune gamme du catalogue ne contient exactement ces notes.</p>
    {:else}
      <ul class="correspondances">
        {#each correspondances as { gamme, tonique } (gamme.id + '-' + tonique)}
          <li>
            <button type="button" onclick={() => afficherGamme(gamme, tonique)}>
              {nomNote(tonique)} {gamme.nom}
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if selectionManche.gammeAffichee}
      <label class="fondamentale">
        Position (fondamentale sur la corde…)
        <select bind:value={selectionManche.position}>
          <option value={null}>Toute la touche</option>
          {#each cordesPourPosition as { corde, numero, nom } (corde)}
            <option value={corde}>Corde {numero} ({nom})</option>
          {/each}
        </select>
      </label>
    {/if}
  {/if}
</div>
