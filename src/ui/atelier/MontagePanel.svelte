<script lang="ts">
  /* LE MONTAGE — le lire, ET le monter. « Il faut pouvoir monter le morceau
   * comme on le souhaite : choisir la structure parmi des presets ou la créer
   * de toute pièce ; quelle partie A B ou C ; combien de cycles ; qu'on puisse
   * choisir quelles lignes sont mutées » (Yann, 2026-09-09).
   *
   * ⚠️ CE QUE CE PANNEAU RÉPARE, DEUXIÈME COUCHE. Il écrivait déjà ce qu'un
   * montage fait — la bande du Live n'en montre que le résultat, dans des cases
   * de 60 × 44 px. Mais il ne le laissait pas CHANGER : les sept modèles
   * étaient à prendre ou à laisser, et le seul geste d'édition (lettre et
   * tours) vivait derrière un appui long sur la surface de scène. Un modèle est
   * un DÉPART, pas une identité.
   *
   * ⚠️ MONTER EST UN GESTE DE PRÉPARATION, donc ça vit ici. Même règle que
   * « ranger une lettre » : ce qui se fait avant de jouer est dans l'Atelier ;
   * sur la surface de scène, une pastille ne fait qu'une chose — jouer.
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
    CALQUES_NOMMES,
    LIGNES_ORDRE,
    LIGNE_LIBELLE,
    libelleDePartie,
    libelleCalque,
    mesuresDeSection,
    mesuresTotales,
    dureeSecondes,
    formaterDuree,
  } from '../../model/architecture';
  import { PARTIES, type PartieId } from '../../model/parties';
  import { telechargerMorceau, ouvrirFichierMorceau } from '../../stores/morceau.svelte';
  import { unlocks } from '../../stores/unlocks.svelte';

  /* ⚠️ LE PANNEAU DOIT SAVOIR EMMENER AU LIVE. On monte ici et on joue
     là-bas : sans une sortie ÉCRITE au bout, le seul chemin était la barre de
     menus (Mode → Mode Live), c'est-à-dire à l'autre bout de l'écran et sous
     un menu déroulant. « Il faut un bouton plus évident pour nous emmener sur
     le mode live à la fin de cette partie de montage des morceaux. » */
  let { onSwitchView }: { onSwitchView?: (v: 'atelier' | 'game' | 'live') => void } = $props();

  const sections = $derived(architecture.sections);

  /* ---- LE FICHIER ----
   * Un morceau, c'est les lettres + la chaîne. Les deux vivent dans deux
   * stores ; le fichier est le seul endroit où ils se rejoignent. */
  let nomMorceau = $state('');
  let compteRendu = $state('');
  let champFichier: HTMLInputElement;

  function enregistrer() {
    telechargerMorceau(nomMorceau || architecture.courante?.nom || 'Morceau');
    compteRendu = 'Morceau enregistré.';
  }

  async function ouvrir(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = await ouvrirFichierMorceau(f);
    /* ⚠️ Un échec ne doit jamais être silencieux : un fichier illisible qui ne
       fait RIEN laisse croire que l'appli est cassée. */
    compteRendu = r
      ? `« ${r.nom} » ouvert — ${r.lettres} partie${r.lettres > 1 ? 's' : ''}, ${r.scenes} scène${r.scenes > 1 ? 's' : ''}.`
      : '⚠ Ce fichier n’est pas un morceau lisible.';
    if (r) nomMorceau = r.nom;
    champFichier.value = ''; // rouvrir le MÊME fichier doit re-déclencher l'événement
  }

  const cycleDe = $derived((id: PartieId) => parties.cycle(id));

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

  /* Les lettres que la chaîne CITE mais qui sont encore vides : c'est la seule
     chose qui puisse rendre un montage inaudible, et elle se voit ici. */
  const manquantes = $derived(
    [...new Set(sections.map((s) => s.partie))].filter((id) => !parties.remplie(id)),
  );

  /* ---- L'ÉDITION ----
   * Le calque d'une scène demande huit bascules et huit raccourcis : les
   * afficher sur chaque rangée noierait la chaîne, qui doit rester LISIBLE
   * d'un coup d'œil. Une seule scène ouvre son calque à la fois. */
  let calqueOuvert = $state<string | null>(null);
  /* Le sélecteur de modèle ne s'affiche que quand on le demande : un montage
     déjà monté ne doit pas offrir en permanence de quoi l'écraser. */
  let choixModele = $state(false);
  let modele = $state(MONTAGES[1]?.nom ?? MONTAGES[0].nom);

  function partirDuModele() {
    architecture.chargerMontage(modele);
    choixModele = false;
    calqueOuvert = null;
  }

  function supprimerMontage() {
    architecture.effacer();
    choixModele = false;
    calqueOuvert = null;
  }
</script>

{#if !architecture.courante}
  <p class="hint">
    Aucun montage : un seul motif tourne, et tes mains font tout. Un montage pose une
    <strong>chaîne de scènes</strong> et les <strong>lignes</strong> que chacune laisse sonner.
    Pars d'un modèle, ou monte-le toi-même — tout se modifie ensuite.
  </p>
  <div class="depart">
    <select bind:value={modele} aria-label="Modèle de montage">
      {#each MONTAGES as m (m.nom)}
        <option value={m.nom}>{m.nom} — {m.desc}</option>
      {/each}
    </select>
    <button class="xp-btn" onclick={partirDuModele}>Partir de ce modèle</button>
    <button class="xp-btn" onclick={() => architecture.nouvelle()}>Créer de toute pièce</button>
  </div>
{:else}
  <div class="entete">
    <input
      class="nom-montage"
      type="text"
      value={architecture.courante.nom}
      oninput={(e) => architecture.renommer((e.currentTarget as HTMLInputElement).value)}
      aria-label="Nom du montage"
    />
    <button class="xp-btn" onclick={() => (choixModele = !choixModele)}>Modèle…</button>
    <button class="xp-btn" onclick={supprimerMontage} title="Plus de chaîne : un seul motif qui tourne"
      >Supprimer</button
    >
  </div>

  {#if choixModele}
    <div class="depart">
      <select bind:value={modele} aria-label="Modèle de montage">
        {#each MONTAGES as m (m.nom)}
          <option value={m.nom}>{m.nom} — {m.desc}</option>
        {/each}
      </select>
      <button class="xp-btn" onclick={partirDuModele}>Remplacer par ce modèle</button>
    </div>
  {/if}

  <p class="hint">
    Chaque scène dit <strong>quelle lettre</strong> elle joue, <strong>combien de tours</strong> et
    <strong>ce qu'on y entend</strong>. <em>A′</em> se lit « A avec des lignes en moins » — ce n'est
    pas un motif de plus à composer.
  </p>

  {#if manquantes.length}
    <p class="manque">
      ⚠ La chaîne cite {manquantes.length > 1 ? 'les lettres' : 'la lettre'}
      <strong>{manquantes.join(', ')}</strong>, encore vide{manquantes.length > 1 ? 's' : ''} — ces
      scènes joueront A. Range un rythme dessus pour les entendre.
    </p>
  {/if}

  <ol class="chaine">
    {#each lignes as { s, i, mesures, debut } (s.id)}
      <li class="scene" class:prime={s.lignes !== null}>
        <div class="rang nom">
          <span class="num">{i + 1}</span>
          <input
            class="nom-scene"
            type="text"
            value={s.nom}
            oninput={(e) => architecture.poserNomScene(i, (e.currentTarget as HTMLInputElement).value)}
            aria-label="Nom de la scène {i + 1}"
          />
        </div>
        <div class="rang reglages">
          <div class="lettres" role="group" aria-label="Lettre jouée">
            {#each PARTIES as id (id)}
              <button
                class="lettre"
                class:on={s.partie === id}
                class:vide={!parties.remplie(id)}
                onclick={() => architecture.poserPartie(i, id)}
                title={parties.remplie(id) ? parties.get(id)?.nom || `partie ${id}` : `${id} est vide — jouera A`}
              >{id}</button>
            {/each}
          </div>
          <div class="tours">
            <button class="pas" onclick={() => architecture.poserCycles(i, s.cycles - 1)} aria-label="Un tour de moins">−</button>
            <span class="n">×{s.cycles}</span>
            <button class="pas" onclick={() => architecture.poserCycles(i, s.cycles + 1)} aria-label="Un tour de plus">+</button>
          </div>
        </div>
        <!-- ⚠️ LE DÉTAIL PORTE AUSSI L'ORDRE, et ce n'est pas de l'économie de
             place : neuf cibles de 44 px sur une rangée demandent 396 px là où
             le panneau en offre 312 — mesuré. Ce qui reste visible en
             permanence est donc ce qui se LIT (la lettre, la longueur, ce qu'on
             entend) ; ce qui se fait une fois (couper une ligne, déplacer,
             retirer) est derrière un bouton ÉCRIT, jamais un geste caché. -->
        <button
          class="detail"
          aria-expanded={calqueOuvert === s.id}
          onclick={() => (calqueOuvert = calqueOuvert === s.id ? null : s.id)}
        >
          <span class="fleche">{calqueOuvert === s.id ? '▾' : '▸'}</span>
          <span class="quoi">{libelleDePartie(s)}</span>
          <span class="entend">{libelleCalque(s.lignes)}</span>
          <span class="mesure">{mesures} mes · dès {debut + 1}</span>
        </button>
        {#if calqueOuvert === s.id}
          <div class="calque-edit">
            <span class="sous-titre">Ce qui sonne dans cette scène</span>
            <div class="chips">
              {#each LIGNES_ORDRE as l (l)}
                <button
                  class="chip"
                  class:on={s.lignes === null || s.lignes.includes(l)}
                  onclick={() => architecture.basculerLigne(i, l)}
                >{LIGNE_LIBELLE[l]}</button>
              {/each}
            </div>
            <div class="chips">
              <button class="chip raccourci" onclick={() => architecture.poserLignes(i, null)}>TOUTES</button>
              {#each CALQUES_NOMMES as c (c.nom)}
                <button class="chip raccourci" onclick={() => architecture.poserLignes(i, c.lignes)}>{c.nom}</button>
              {/each}
            </div>
            <span class="sous-titre">Cette scène dans la chaîne</span>
            <div class="chips">
              <button class="chip" onclick={() => architecture.deplacerScene(i, -1)} disabled={i === 0}>↑ Monter</button>
              <button class="chip" onclick={() => architecture.deplacerScene(i, 1)} disabled={i === sections.length - 1}>↓ Descendre</button>
              <button class="chip" onclick={() => architecture.dupliquerScene(i)}>⧉ Dupliquer</button>
              <button class="chip" onclick={() => architecture.supprimerScene(i)}>✕ Retirer</button>
            </div>
          </div>
        {/if}
      </li>
    {/each}
  </ol>

  <div class="pied">
    <button class="xp-btn" onclick={() => architecture.ajouterScene(sections.length - 1)}>+ Ajouter une scène</button>
    <span class="total">{sections.length} scènes · {total} mesures · {duree} à {Math.round(pattern.state.tempo)} BPM</span>
  </div>
{/if}

<div class="fichier">
  <span class="titre">Le morceau</span>
  <input
    class="nom-morceau"
    type="text"
    placeholder="Nom du morceau"
    bind:value={nomMorceau}
    aria-label="Nom du morceau"
  />
  <button class="xp-btn" onclick={enregistrer}>💾 Enregistrer</button>
  <button class="xp-btn" onclick={() => champFichier.click()}>📂 Ouvrir…</button>
  <input
    class="cache"
    type="file"
    accept="application/json,.json"
    bind:this={champFichier}
    onchange={ouvrir}
  />
</div>
<p class="hint fichier-aide">
  Le fichier contient les <strong>parties</strong> et la <strong>chaîne</strong>. Les boutons du Mode
  Live n'en font pas partie : ceux que tu as réglés restent les tiens, qu'on ouvre un fichier ou
  qu'on charge un modèle.
  {#if compteRendu}<br /><span class="rendu" class:alerte={compteRendu.startsWith('⚠')}>{compteRendu}</span>{/if}
</p>

<!-- ⚠️ LA SORTIE EST LE DERNIER MOT DU PANNEAU. On PRÉPARE de la matière ici,
     on JOUE la structure là-bas : le montage fini, la seule chose qui reste à
     faire est de monter sur scène. ⚠️ Et ce qui est VERROUILLÉ ne s'affiche
     pas — un joueur qui n'a pas encore le Mode Live ne doit pas lire son nom
     sur un bouton. ⚠️ Le Live n'existe qu'à l'HORIZONTALE : l'écran qui y
     envoie doit le dire, sinon on y arrive sur un mur d'instructions. -->
{#if unlocks.has('live')}
  <button class="vers-live" onclick={() => onSwitchView?.('live')}>
    <span class="titre">🎛 {architecture.courante ? 'Jouer ce montage en Mode Live' : 'Ouvrir le Mode Live'}</span>
    <span class="sous">à l’horizontale — tourne ton téléphone. Tu redescends quand tu veux.</span>
  </button>
{/if}

<style>
  .hint,
  .manque {
    font-size: 9px;
    color: var(--xp-muted);
    line-height: 1.5;
    margin: 0 0 8px;
    max-width: 78ch;
  }
  .manque {
    color: var(--xp-accent-amber);
  }

  /* ---- LE DÉPART : un modèle, ou rien ---- */
  .depart {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 0 0 8px;
  }
  .depart select {
    flex: 1 1 220px;
    min-width: 0;
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 3px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }

  .entete {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 0 0 8px;
  }
  .nom-montage,
  .nom-scene,
  .nom-morceau {
    min-width: 0;
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 4px;
    border: 1px solid var(--xp-line);
    background: var(--xp-field-bg);
    color: var(--xp-text);
  }
  .nom-montage {
    flex: 1 1 160px;
    letter-spacing: var(--xp-ls-wide, 0.06em);
  }

  /* ---- LA CHAÎNE ---- */
  .chaine {
    list-style: none;
    margin: 0 0 8px;
    padding: 0;
  }
  .scene {
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    margin: 0 0 4px;
    padding: 4px;
  }
  .rang {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rang.reglages {
    gap: 10px;
    margin-top: 3px;
  }
  .num {
    font-size: 9px;
    color: var(--xp-muted);
    width: 2ch;
    text-align: right;
  }
  .nom-scene {
    flex: 1 1 auto;
    /* Plafonné : sur un grand écran un champ de 1 500 px pour « REFRAIN »
       n'aide personne et écrase le reste de la rangée. */
    max-width: 24ch;
  }
  .lettres,
  .tours {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  /* ⚠️ PAS DE `.tap44` ICI, ET C'EST MESURÉ. Sur des boutons de 19 px espacés
     de 2, les enveloppes invisibles de 44 px se CHEVAUCHENT : la mesure trouve
     « A » à 21 px et « C » à 44, parce que le pseudo-élément du voisin recouvre
     le premier — et le tap tombe sur le mauvais bouton. Elles débordaient en
     prime le panneau de 12 px. Ces boutons-là ont de la place : c'est leur
     propre boîte qui monte à 44, sous `coarse`, en fin de <style>. */
  .lettre,
  .pas,
  .chip {
    font-family: var(--xp-font);
    font-size: 10px;
    padding: 4px 6px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    background: transparent;
    color: var(--xp-text);
    cursor: pointer;
  }
  .lettre,
  .pas {
    min-width: 22px;
  }
  .lettre.on {
    box-shadow: var(--xp-bevel-in);
    color: var(--xp-lcd);
  }
  /* Une lettre encore vide se dit sur la lettre elle-même : c'est là qu'on
     choisit, donc c'est là que l'avertissement sert. */
  .lettre.vide {
    color: var(--xp-muted);
  }
  .chip:disabled {
    color: var(--xp-muted);
    box-shadow: none;
    cursor: default;
  }
  .tours .n {
    font-size: 10px;
    color: var(--xp-text);
    min-width: 4ch;
    text-align: center;
  }

  /* ---- LE DÉTAIL D'UNE SCÈNE ---- */
  .detail {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    width: 100%;
    margin-top: 3px;
    padding: 5px 3px;
    border: 0;
    background: transparent;
    font-family: var(--xp-font);
    font-size: 9px;
    color: var(--xp-muted);
    text-align: left;
    cursor: pointer;
  }
  .detail .quoi {
    font-weight: 700;
    color: var(--xp-text);
  }
  .detail .entend {
    flex: 1 1 auto;
  }
  .scene.prime .detail .quoi,
  .scene.prime .detail .entend {
    color: var(--xp-accent-amber);
  }
  .calque-edit {
    padding: 4px 3px 2px;
    border-top: 1px solid var(--xp-line);
  }
  .sous-titre {
    display: block;
    margin: 4px 0 3px;
    font-size: 8px;
    letter-spacing: var(--xp-ls-wide, 0.08em);
    color: var(--xp-muted);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  /* Le vert dit « allumé » — ici, « cette ligne sonne dans cette scène ». */
  .chip.on {
    box-shadow: var(--xp-bevel-in);
    color: var(--xp-lcd);
  }
  .chip {
    color: var(--xp-muted);
  }
  .chip.raccourci {
    font-size: 8px;
  }

  .pied {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .total {
    font-size: 9px;
    color: var(--xp-muted);
  }

  /* ---- LE FICHIER ---- */
  .fichier {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin: 10px 0 6px;
    padding-top: 8px;
    border-top: 1px solid var(--xp-line);
  }
  .fichier .titre {
    font-size: 8px;
    letter-spacing: var(--xp-ls-wide, 0.08em);
    color: var(--xp-muted);
  }
  .nom-morceau {
    flex: 1 1 140px;
  }
  .cache {
    display: none;
  }
  .fichier-aide {
    margin-top: 0;
  }
  .rendu {
    color: var(--xp-lcd);
  }

  /* ---- LA SORTIE VERS LE LIVE ----
   * Ambre, comme l'accent de la fenêtre qui l'abrite : ce n'est pas une
   * VALIDATION (le vert du Mode jeu), c'est un départ. Pleine largeur et deux
   * lignes — le seul bouton du panneau qui doive se voir sans être cherché. */
  .vers-live {
    display: block;
    width: 100%;
    margin: 10px 0 2px;
    padding: 10px 12px;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-out);
    background: linear-gradient(180deg, #e0a52b, #a86f10);
    color: var(--xp-lcd-bg);
    font-family: var(--xp-font);
    text-align: left;
    cursor: pointer;
  }
  .vers-live:active {
    box-shadow: var(--xp-bevel-in);
  }
  .vers-live .titre {
    display: block;
    font-size: var(--xp-size-btn);
    font-weight: 700;
    letter-spacing: var(--xp-ls-btn);
    text-transform: uppercase;
  }
  .vers-live .sous {
    display: block;
    margin-top: 3px;
    font-size: 8.5px;
    opacity: 0.85;
  }
  .rendu.alerte {
    color: var(--xp-accent-amber);
  }

  /* ⚠️ En fin de <style> : un bloc @media posé au milieu est écrasé par les
     règles écrites plus bas. */
  @media (pointer: coarse) {
    /* ⚠️ `<select>` et `<input>` sont des éléments REMPLACÉS : Chromium n'y rend
       aucun pseudo-élément, donc pas de `.tap44` possible — c'est leur propre
       boîte qui monte. */
    .depart select,
    .nom-montage,
    .nom-scene,
    .nom-morceau,
    .xp-btn,
    .vers-live {
      min-height: 44px;
    }
    /* Les boutons de scène montent EUX-MÊMES à 44 (voir le commentaire sur
       `.lettre` plus haut : une enveloppe invisible recouvrirait le voisin).
       Budget mesuré : 3 lettres + 3 tours = 6 × 44 + les écarts = 276 px pour
       312 disponibles. Neuf n'y tiendraient pas — d'où l'ordre dans le détail. */
    .lettre,
    .pas,
    .chip {
      min-height: 44px;
      min-width: 44px;
    }
    .detail {
      min-height: 44px;
      align-items: center;
    }
    /* Les cibles de 44 px se touchent : on écarte le rythme vertical dans le
       même bloc `coarse`, comme partout ailleurs. */
    .rang,
    .chips {
      gap: 8px;
    }
    .scene {
      padding: 8px 4px;
    }
  }
</style>
