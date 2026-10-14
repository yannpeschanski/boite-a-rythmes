<script lang="ts">
  import Manche from './Manche.svelte';
  import type { CelluleManche } from './types';
  import { ACCORDAGE_STANDARD, NB_CASES } from '../model/accordage';
  import { GAMMES, FAMILLES_GAMMES } from '../model/gammes';
  import { nomNote, libelleDegre, accentDuDegre } from '../model/notes';
  import { notesDuManche, grouperParCorde, degreDansGamme, fretDeNote, fenetrePosition } from '../engine/manche';
  import { choixGamme } from '../stores/selection.svelte';

  const toniques = Array.from({ length: 12 }, (_, i) => i);
  const grilleNotes = grouperParCorde(notesDuManche(ACCORDAGE_STANDARD, NB_CASES), ACCORDAGE_STANDARD.length);
  const gammesParFamille = FAMILLES_GAMMES.map((famille) => ({
    famille,
    gammes: GAMMES.filter((g) => g.famille === famille),
  }));

  // Numérotation habituelle des cordes : 6 = la plus grave, 1 = la plus aiguë.
  const cordesPourPosition = ACCORDAGE_STANDARD.map((classeCorde, corde) => ({
    corde,
    numero: ACCORDAGE_STANDARD.length - corde,
    nom: nomNote(classeCorde),
  }));

  let fenetre = $derived(
    choixGamme.position === null
      ? null
      : fenetrePosition(fretDeNote(ACCORDAGE_STANDARD, choixGamme.position, choixGamme.tonique), NB_CASES),
  );

  let cellules: CelluleManche[][] = $derived(
    grilleNotes.map((corde) =>
      corde.map((note) => {
        const degre = degreDansGamme(note.classe, choixGamme.tonique, choixGamme.gamme);
        return {
          classe: note.classe,
          visible: degre !== null,
          libelle: degre !== null ? nomNote(note.classe) : '',
          accent: degre !== null ? accentDuDegre(degre) : null,
          dansFenetre: fenetre === null || (note.case >= fenetre.debut && note.case <= fenetre.fin),
        };
      }),
    ),
  );
</script>

<div class="selecteur">
  <label>
    Tonique
    <select bind:value={choixGamme.tonique}>
      {#each toniques as t (t)}
        <option value={t}>{nomNote(t)}</option>
      {/each}
    </select>
  </label>

  <label>
    Gamme
    <select bind:value={choixGamme.gamme}>
      {#each gammesParFamille as { famille, gammes } (famille)}
        <optgroup label={famille}>
          {#each gammes as gamme (gamme.id)}
            <option value={gamme}>{gamme.nom}</option>
          {/each}
        </optgroup>
      {/each}
    </select>
  </label>

  <label>
    Position (fondamentale sur la corde…)
    <select bind:value={choixGamme.position}>
      <option value={null}>Toute la touche</option>
      {#each cordesPourPosition as { corde, numero, nom } (corde)}
        <option value={corde}>Corde {numero} ({nom})</option>
      {/each}
    </select>
  </label>

  <Manche accordage={ACCORDAGE_STANDARD} nbCases={NB_CASES} {cellules} />

  <ul class="legende">
    {#each choixGamme.gamme.intervalles as demiTons (demiTons)}
      <li class="accent-{accentDuDegre(demiTons)}">
        {nomNote(choixGamme.tonique + demiTons)} — {libelleDegre(demiTons)}
      </li>
    {/each}
  </ul>
</div>
