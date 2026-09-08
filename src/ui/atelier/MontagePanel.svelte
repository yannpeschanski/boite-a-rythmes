<script lang="ts">
  /* LE MONTAGE, EN TOUTES LETTRES — « il faudrait qu'on puisse comprendre ce
   * qui est fait quelque part » (Yann, après avoir joué la préversion).
   *
   * ⚠️ CE QUE CE PANNEAU RÉPARE. Un montage se charge d'un tap et fait alors
   * TROIS choses d'un coup : il pose une chaîne, il coupe des lignes par
   * section, et il remplace les six boutons. Sur la bande du Live, tout ça tient
   * dans des cases de 60 × 44 px qui affichent « A′ ×1 » — c'est-à-dire le
   * résultat, jamais ce qui a été fait. On subissait le montage sans pouvoir le
   * lire.
   *
   * Ici il est écrit : chaque scène, sa lettre, CE QU'ON ENTEND (le calque en
   * clair, pas un nombre de lignes), sa longueur, et le cumul. Plus les boutons
   * que le montage demande, qui sont la moitié invisible de l'affaire.
   *
   * ⚠️ Le mot est SCÈNE et non « section » — vocabulaire de la catégorie
   * (groovebox, Session View) : une chaîne est un ordre SUGGÉRÉ, pas une
   * timeline. Voir docs/plan/08.
   */
  import { architecture } from '../../stores/architecture.svelte';
  import { parties } from '../../stores/parties.svelte';
  import { pattern } from '../../stores/pattern.svelte';
  import {
    MONTAGES,
    libelleDePartie,
    libelleCalque,
    mesuresDeSection,
    mesuresTotales,
    dureeSecondes,
    formaterDuree,
    montageParNom,
  } from '../../model/architecture';
  import { actionById } from '../live/liveActions';
  import type { LiveActionId } from '../live/liveActions';

  const sections = $derived(architecture.sections);
  const cycleDe = $derived((id: 'A' | 'B' | 'C') => parties.cycle(id));

  /* Le cumul : à quelle mesure chaque scène commence. C'est ce qu'on lit quand
     on veut savoir « où j'en suis » — un numéro de scène ne le dit pas. */
  const lignes = $derived(
    sections.map((s, i) => {
      const debut = sections.slice(0, i).reduce((t, x) => t + mesuresDeSection(x, cycleDe(x.partie)), 0);
      return { s, i, mesures: mesuresDeSection(s, cycleDe(s.partie)), debut };
    }),
  );

  const total = $derived(mesuresTotales(sections, cycleDe));
  const duree = $derived(formaterDuree(dureeSecondes(sections, cycleDe, pattern.state.tempo)));
  const courant = $derived(architecture.courante ? montageParNom(architecture.courante.nom) : null);
  const boutons = $derived(
    (courant?.boutons ?? []).map((slot) =>
      slot
        .map((id) => {
          try {
            return actionById(id as LiveActionId)?.label ?? null;
          } catch {
            return null;
          }
        })
        .filter((x): x is string => x !== null)
        .join(' + '),
    ),
  );

  /* Les lettres que la chaîne CITE mais qui sont encore vides : c'est la seule
     chose qui puisse rendre un montage inaudible, et elle se voit ici. */
  const manquantes = $derived(
    [...new Set(sections.map((s) => s.partie))].filter((id) => !parties.remplie(id)),
  );
</script>

{#if !architecture.courante}
  <p class="hint">
    Aucun montage : un seul motif tourne, et tes mains font tout. Un montage pose une
    <strong>chaîne de scènes</strong>, les <strong>lignes</strong> que chacune laisse sonner, et les
    <strong>six boutons</strong> du Mode Live — les trois d'un coup.
  </p>
{:else}
  <p class="hint">
    Ce que le montage <strong>{architecture.courante.nom}</strong> fait jouer, scène par scène.
    <em>A′</em> se lit « A avec des lignes en moins » — ce n'est pas un motif de plus à composer.
  </p>

  {#if manquantes.length}
    <p class="manque">
      ⚠ La chaîne cite {manquantes.length > 1 ? 'les lettres' : 'la lettre'}
      <strong>{manquantes.join(', ')}</strong>, encore vide{manquantes.length > 1 ? 's' : ''} — {manquantes.length > 1
        ? 'ces scènes'
        : 'ces scènes'} joueront A. Range un rythme dessus pour les entendre.
    </p>
  {/if}

  <table class="chaine">
    <thead>
      <tr><th>Scène</th><th>Joue</th><th>On entend</th><th class="n">Mesures</th><th class="n">Départ</th></tr>
    </thead>
    <tbody>
      {#each lignes as { s, i, mesures, debut } (s.id)}
        <tr class:prime={s.lignes !== null}>
          <td class="nom">{i + 1}. {s.nom}</td>
          <td class="lettre">{libelleDePartie(s)}</td>
          <td class="calque">{libelleCalque(s.lignes)}</td>
          <td class="n">{mesures}</td>
          <td class="n mes">{debut + 1}</td>
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3">{sections.length} scènes · {duree} à {Math.round(pattern.state.tempo)} BPM</td>
        <td class="n">{total}</td>
        <td class="n"></td>
      </tr>
    </tfoot>
  </table>

  {#if boutons.length}
    <p class="boutons">
      <span class="titre">Les six boutons du Live :</span>
      {#each boutons as b, i (i)}<span class="b">{b}</span>{/each}
      <span class="note">— sauf si « conserver mes boutons » est coché dans ⚙.</span>
    </p>
  {/if}
{/if}

<div class="choix">
  <label for="montage-select">Montage</label>
  <select
    id="montage-select"
    value={architecture.courante?.nom ?? ''}
    onchange={(e) => {
      const nom = (e.currentTarget as HTMLSelectElement).value;
      if (nom) architecture.chargerMontage(nom);
      else architecture.effacer();
    }}
  >
    <option value="">— aucun (un seul motif qui tourne)</option>
    {#each MONTAGES as m (m.nom)}
      <option value={m.nom}>{m.nom} — {m.desc}</option>
    {/each}
  </select>
</div>

<style>
  .hint,
  .manque,
  .boutons {
    font-size: 9px;
    color: var(--xp-muted);
    line-height: 1.5;
    margin: 0 0 8px;
    max-width: 78ch;
  }
  .manque {
    color: var(--xp-accent-amber);
  }
  .chaine {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
    margin: 0 0 8px;
  }
  .chaine th,
  .chaine td {
    border: 1px solid var(--xp-line);
    padding: 4px 6px;
    text-align: left;
  }
  .chaine th {
    color: var(--xp-muted);
    font-weight: 700;
    letter-spacing: var(--xp-ls-wide, 0.06em);
  }
  .chaine .n {
    text-align: right;
    width: 7ch;
  }
  .chaine .nom {
    color: var(--xp-text);
  }
  .chaine .lettre {
    font-weight: 700;
    width: 5ch;
  }
  /* Une scène en PRIME est un calque : elle se lit en retrait, comme dans une
     partition où la variation n'est pas un thème neuf. */
  .chaine tr.prime .lettre,
  .chaine tr.prime .calque {
    color: var(--xp-accent-amber);
  }
  .chaine tfoot td {
    color: var(--xp-muted);
    font-weight: 700;
  }
  .boutons .titre {
    color: var(--xp-muted);
  }
  .boutons .b {
    display: inline-block;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    padding: 1px 5px;
    margin: 0 3px 3px 0;
    color: var(--xp-text);
  }
  .boutons .note {
    display: block;
    margin-top: 3px;
  }
  .choix {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .choix label {
    font-size: 9px;
    color: var(--xp-muted);
  }
  .choix select {
    flex: 1 1 220px;
    min-width: 0;
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 3px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  /* ⚠️ En fin de <style> : un bloc @media posé au milieu est écrasé par les
     règles écrites plus bas. Et un <select> est un élément REMPLACÉ : pas de
     pseudo-élément possible, c'est sa propre boîte qui monte. */
  @media (pointer: coarse) {
    .choix select {
      min-height: 44px;
    }
  }
</style>
