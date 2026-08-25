<script lang="ts">
  /* L'écran d'entrée du Mode jeu : le Mode carrière.
   *
   * ⚠️ Règle d'affichage de `HISTOIRE.md`, et c'est elle qui a dessiné cet
   * écran : « on montre les appareils, pas le décor ». Le joueur ne voit jamais
   * un visage ni une pièce — il voit le panneau de commande de ce qu'il
   * utilise. D'où quatre surfaces et pas une de plus : l'afficheur LCD pour les
   * mots de Sol et le compte à rebours, le répondeur pour les messages, le fax
   * pour les briefs, l'étiquette de cassette pour les maquettes. Toutes les
   * quatre se dessinent avec le design system existant, sans une image.
   *
   * Corollaire et budget : si ça ne tient pas sur un afficheur, ce n'est pas
   * dans le jeu. C'est pour ça que le récit est en lignes courtes — une idée
   * par ligne, jamais de description.
   *
   * Et le retournement : le biseau gris n'est pas un parti pris graphique,
   * c'est le budget du label. Face B n'a rien racheté depuis les bonnes années.
   */
  import { game } from '../../stores/game.svelte';
  import {
    ACTES,
    acteAVenir,
    LONGUEUR_PROLOGUE,
    ETAPE_DU_COMPTE_A_REBOURS,
    type Acte,
  } from '../../model/carriere';
  import XpWindow from '../xp/XpWindow.svelte';

  let {
    onExercice,
    onRepetition,
    onLivraison,
    onCommande,
  }: {
    /** Une étape d'exercice commence : la vue de jeu prend la main. */
    onExercice: () => void;
    /** Sortir de la carrière pour la salle de répétition (les 41 niveaux). */
    onRepetition: () => void;
    /** Emporter le rythme qu'on vient de faire dans l'Atelier. */
    onLivraison: () => void;
    /** Partir travailler sur une commande — l'Atelier devient l'outil. */
    onCommande: () => void;
  } = $props();

  const acte = $derived(game.acteCourant);
  const etape = $derived(game.etapeCourante);
  const fini = $derived(game.acteTermineAAnnoncer);

  /* L'en-tête des appareils. `source` porte le nom de l'objet, pas un style :
     c'est ce qui garantit qu'on ne se retrouve pas avec six variantes de
     cadres pour trois objets. */
  const APPAREILS: Record<string, { icone: string; nom: string }> = {
    repondeur: { icone: '📼', nom: 'RÉPONDEUR' },
    lcd: { icone: '▮', nom: 'AFFICHEUR' },
    fax: { icone: '📠', nom: 'FAX' },
    cassette: { icone: '🎞', nom: 'CASSETTE' },
  };

  function suite() {
    game.commandeAcceptee = null;
    game.avancerCarriere();
    if (!game.acteTermineAAnnoncer) enchainer();
  }

  /** Fin d'acte lue : on reprend le fil là où `avancerCarriere` l'a laissé. */
  function accuser() {
    game.acteTermineAAnnoncer = null;
    enchainer();
  }

  function enchainer() {
    if (game.etapeCourante?.kind === 'exercice') onExercice();
  }

  /* ⚠️ La livraison FRANCHIT l'étape avant d'ouvrir l'Atelier, et l'ordre est
   * le sujet. `moduleUnlocked` lit l'acte ATTEINT (`acte > 1` pour l'Atelier) :
   * partir de la dernière étape de l'acte 1 sans l'avoir franchie enverrait le
   * joueur dans un module que l'écran d'accueil affiche encore cadenassé —
   * verrouillé au retour, ouvert à l'aller. On avance donc d'abord, et
   * l'annonce de fin d'acte est absorbée : la livraison EST cette annonce, la
   * revoir au retour ferait deux fois la même nouvelle. */
  function livrer() {
    game.avancerCarriere();
    game.acteTermineAAnnoncer = null;
    onLivraison();
  }

  /* Partir travailler. On retient l'étape AVANT de naviguer : au retour c'est
     elle qu'on validera, même si le joueur a relu un autre acte entre-temps. */
  function travailler() {
    game.ouvrirCommande();
    onCommande();
  }

  function ouvrir(a: Acte) {
    if (!game.acteOuvert(a.id)) return;
    game.ouvrirActe(a.id);
    game.acteTermineAAnnoncer = null;
    enchainer();
  }

  /* Le module ouvert par l'acte qui vient de finir, en clair. La carrière
     l'annonce ; l'écran d'accueil, lui, le montre déverrouillé. */
  const NOM_MODULE: Record<string, string> = {
    atelier: 'L’ATELIER',
    synth: 'LE SYNTHÉ',
    production: 'LA PRODUCTION',
    live: 'LE MODE LIVE',
  };

  /* Numéro d'étape affiché : le joueur doit pouvoir voir qu'il avance à
     l'intérieur d'un acte, sinon un acte de sept étapes se lit comme une
     boucle. */
  const position = $derived(`${game.etapeActive + 1}/${acte.etapes.length}`);

  /* ⚠️ Le premier écran ne doit montrer QUE ce qu'il peut expliquer.
   *
   * Première version : le carnet des huit actes et le compte à rebours
   * s'affichaient dès l'arrivée, sous un message de répondeur qui n'avait
   * encore rien situé. Huit titres verrouillés, un « J−151 » vers une date
   * inconnue, et une colonne de mots (ÉCOUTE, RYTHME, GROOVE…) dont rien ne
   * disait ce qu'ils étaient. Trois inconnues de plus à la première seconde.
   *
   * Ils reviennent au moment où ils veulent dire quelque chose : le décompte
   * quand le 14 juin est expliqué, le carnet quand le prologue est passé. */
  const enPrologue = $derived(
    game.progresCarriere.acte === 0 && game.progresCarriere.etape < LONGUEUR_PROLOGUE,
  );
  const montrerCompteARebours = $derived(
    !enPrologue || game.etapeActive >= ETAPE_DU_COMPTE_A_REBOURS || game.acteActif > 0,
  );
  const montrerCarnet = $derived(!enPrologue);

  /* ⚠️ « Tout ce qui n'est pas encore accessible devrait être masqué : no
   * spoil. » Le carnet listait les HUIT actes, titres et résumés compris —
   * « Kelvin a seize ans, il vient le mardi », « La salle chante un jingle de
   * lessive » : le récit se racontait lui-même, cinq actes à l'avance.
   *
   * Il ne montre donc plus que les actes ATTEINTS. Ce qui suit n'est pas
   * annoncé — pas même son titre. */
  const actesVisibles = $derived(
    ACTES.filter((a) => a.id <= game.progresCarriere.acte && !acteAVenir(a)),
  );
</script>

<XpWindow title="Face B — Mode carrière" icon="📼" accent="none">
  <div class="head">
    <button class="player tap44-y" onclick={() => game.clearPseudo()} title="Changer de joueur">
      👤 {game.pseudo}
    </button>
    {#if !enPrologue}
      <button class="xp-btn tiny tap44-y" onclick={onRepetition}>🗺️ Salle de répétition</button>
      <button class="xp-btn tiny tap44-y" onclick={() => game.reprendreCarriere()} disabled={game.carriereEnAttente}>
        ↺ Reprendre
      </button>
    {/if}
  </div>

  <!-- Le compte à rebours est affiché en permanence, du premier écran au
       dernier : c'est lui qui donne une échéance à tout le reste. Aucune année
       ne s'affiche jamais — les objets datent l'histoire, pas un millésime. -->
  {#if montrerCompteARebours}
    <div class="lcd">
      <span>14 JUIN</span>
      <span class="gros">J−{acte.jours}</span>
      <span class="dim">{acte.quand}</span>
    </div>
  {/if}

  <!-- La réaction du client à la livraison qu'on vient de faire, une fois. On
       revient de l'Atelier avec un morceau : l'écran doit accuser réception,
       sinon on a travaillé pour un enchaînement qui passe à la suite. -->
  {#if game.commandeAcceptee}
    <p class="accepte">{game.commandeAcceptee}</p>
  {/if}

  {#if fini}
    <!-- Fin d'acte : la compétence, et le module que le récit vient d'ouvrir.
         « Chaque module s'ouvre parce qu'un acte en a besoin, jamais parce
         qu'un compteur atteint un seuil. » -->
    <div class="appareil fin">
      <div class="entete">ACTE {fini.id} — {fini.titre}</div>
      <p class="competence">COMPÉTENCE : {fini.competenceLabel}</p>
      {#if fini.module}
        <p class="module">🔓 {NOM_MODULE[fini.module]} EST OUVERT</p>
      {/if}
    </div>
    <div class="actions">
      <button class="xp-btn primary tap44-y" onclick={accuser}>Continuer ▸</button>
    </div>
  {:else if acteAVenir(acte)}
    <!-- Le récit de cet acte est écrit (HISTOIRE.md), pas ses exercices. On le
         dit : un acte qui s'ouvre sur du vide se lit comme une panne. -->
    <div class="appareil avenir">
      <div class="entete">ACTE {acte.id} — {acte.titre}</div>
      <p class="ligne">{acte.resume}</p>
      <p class="ligne dim">La suite du récit est écrite. Ses exercices arrivent.</p>
    </div>
    <div class="actions">
      <button class="xp-btn tap44-y" onclick={onRepetition}>🗺️ Salle de répétition</button>
    </div>
  {:else if etape && etape.kind === 'recit'}
    {@const app = APPAREILS[etape.source]}
    <div class="appareil source-{etape.source}">
      <div class="entete">
        <span class="icone">{app.icone}</span>
        <span>{app.nom}</span>
        <span class="tag">{etape.entete}</span>
      </div>
      {#each etape.lignes as l, i (i)}
        <p class="ligne">{l}</p>
      {/each}
    </div>
    <div class="actions">
      <!-- ⚠️ « Il faut pouvoir revenir sur un texte précédent. » Le récit
           n'avait qu'un sens de marche : un écran passé était perdu. Reculer
           est gratuit ici — seul le curseur ENREGISTRÉ compte pour la
           progression, et lui ne recule jamais (voir le store). -->
      <button
        class="xp-btn tap44-y"
        disabled={!game.peutReculer}
        onclick={() => { game.commandeAcceptee = null; game.reculerCarriere(); }}
      >
        ◂ Retour
      </button>
      <span class="position">{enPrologue ? position : `Acte ${acte.id} · ${position}`}</span>
      <button class="xp-btn primary tap44-y" onclick={suite}>Suite ▸</button>
    </div>
  {:else if etape && etape.kind === 'commande'}
    <!-- ⚠️ Le cahier des charges est montré AVANT de partir, jamais découvert
         au retour : une commande dont on n'apprend les exigences qu'en se les
         voyant refuser est une devinette. Il est réaffiché en direct dans
         l'Atelier pendant qu'on travaille. -->
    <div class="appareil source-fax">
      <div class="entete">
        <span class="icone">📠</span>
        <span>COMMANDE</span>
        <span class="tag">{etape.entete}</span>
      </div>
      {#each etape.lignes as l, i (i)}
        <p class="ligne">{l}</p>
      {/each}
      <ul class="cahier">
        {#each etape.cahier as c (c.id)}
          <li>☐ {c.libelle}</li>
        {/each}
      </ul>
    </div>
    <div class="actions">
      <button class="xp-btn tap44-y" disabled={!game.peutReculer} onclick={() => game.reculerCarriere()}>
        ◂ Retour
      </button>
      <span class="position">Acte {acte.id} · {position}</span>
      <button class="xp-btn primary tap44-y" onclick={travailler}>{etape.bouton}</button>
    </div>
  {:else if etape && etape.kind === 'livraison'}
    <!-- On repart avec l'objet, pas avec un score : le rythme qu'on vient de
         faire s'ouvre dans l'Atelier, d'où il s'exporte en MP3. -->
    <div class="appareil source-cassette">
      <div class="entete">
        <span class="icone">🎞</span>
        <span>CASSETTE</span>
        <span class="tag">{etape.entete}</span>
      </div>
      {#each etape.lignes as l, i (i)}
        <p class="ligne">{l}</p>
      {/each}
    </div>
    <div class="actions">
      <button class="xp-btn tap44-y" disabled={!game.peutReculer} onclick={() => game.reculerCarriere()}>
        ◂ Retour
      </button>
      <span class="position">Acte {acte.id} · {position}</span>
      <button class="xp-btn primary tap44-y" onclick={livrer}>{etape.bouton}</button>
    </div>
  {:else if etape && etape.kind === 'exercice'}
    <!-- Étape d'exercice atteinte sans être passée par `enchainer` (retour
         arrière du navigateur, relecture) : on ne saute pas dedans tout seul. -->
    <div class="appareil">
      <div class="entete">ACTE {acte.id} — {acte.titre}</div>
      <p class="ligne">{etape.commande ?? 'Au travail.'}</p>
    </div>
    <div class="actions">
      <button class="xp-btn tap44-y" disabled={!game.peutReculer} onclick={() => game.reculerCarriere()}>
        ◂ Retour
      </button>
      <span class="position">Acte {acte.id} · {position}</span>
      {#if game.etapeDejaFranchie}
        <!-- Exercice déjà fait, revisité en reculant : on doit pouvoir le
             re-dépasser sans le refaire, sinon un retour d'un cran obligerait à
             rejouer pour repartir. -->
        <button class="xp-btn tap44-y" onclick={suite}>Suite ▸</button>
      {/if}
      <button class="xp-btn primary tap44-y" onclick={onExercice}>Au travail ▸</button>
    </div>
  {/if}

  <!-- Le carnet : les huit actes, comme une playlist. Un acte terminé se
       relit ; le curseur enregistré, lui, ne recule jamais (voir le store) —
       relire l'acte 1 ne referme pas l'Atelier. -->
  {#if montrerCarnet}
    <ol class="carnet">
      {#each actesVisibles as a (a.id)}
        {@const fait = game.acteFait(a.id)}
        <li>
          <button class="acte tap44-y" class:courant={a.id === acte.id} class:fait onclick={() => ouvrir(a)}>
            <span class="num">{fait ? '✓' : a.id}</span>
            <span class="titre">{a.titre}</span>
            <span class="resume">{a.resume}</span>
            <span class="comp">{fait ? a.competenceLabel : 'EN COURS'}</span>
          </button>
        </li>
      {/each}
    </ol>
    <p class="pied">
      La <strong>salle de répétition</strong> rassemble les exercices déjà rencontrés&nbsp;: on peut
      tous les refaire, autant de fois qu’on veut.
    </p>
  {/if}
</XpWindow>

<style>
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }
  .player {
    background: var(--xp-btn-face);
    box-shadow: var(--xp-bevel-out);
    border: 1px solid var(--xp-line);
    color: var(--xp-text);
    font: inherit;
    font-size: var(--xp-size-btn);
    letter-spacing: var(--xp-ls-btn);
    padding: 4px 8px;
    border-radius: 2px;
    cursor: pointer;
  }

  /* L'afficheur : même verre que le bandeau du séquenceur (StatusLcd), même
     vert. Le compte à rebours EST un cadran, pas une phrase — d'où
     l'interlettrage. */
  .lcd {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 8px;
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    border-radius: 3px;
    font-size: var(--xp-size-lcd);
    letter-spacing: 0.12em;
    white-space: nowrap;
    overflow: hidden;
  }
  .lcd .gros {
    font-size: 15px;
    letter-spacing: 0.06em;
  }
  .lcd .dim,
  .ligne.dim {
    color: var(--xp-lcd-dim);
  }

  /* Les appareils. Un seul cadre creusé, quatre en-têtes : la variante porte
     sur ce qui est ÉCRIT dessus, pas sur une forme de plus. */
  .appareil {
    margin-top: 8px;
    padding: 8px;
    background: var(--xp-face-dark);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    border-radius: 2px;
  }
  .entete {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--xp-size-tag);
    letter-spacing: var(--xp-ls-tag);
    color: var(--xp-muted);
    text-transform: uppercase;
    border-bottom: 1px solid var(--xp-line);
    padding-bottom: 5px;
    margin-bottom: 7px;
  }
  /* Le SUJET du message (« FACE B », « LE 14 JUIN ») est ce qu'on doit lire en
     premier ; le nom de l'appareil n'est que le meuble. La première version
     avait l'inverse — l'étiquette utile en vert éteint, à droite. */
  .entete .tag {
    margin-left: auto;
    color: var(--xp-lcd);
  }
  .entete .icone + span {
    color: var(--xp-lcd-dim);
  }
  .ligne {
    margin: 0 0 4px;
    font-size: var(--xp-size-body);
    line-height: 1.5;
    color: var(--xp-text);
  }
  /* Le fax parle en capitales parce que les fax parlaient en capitales : le
     brief du client n'est pas de la narration, c'est un document. */
  .source-fax .ligne {
    letter-spacing: 0.05em;
  }
  .source-lcd .ligne {
    color: var(--xp-lcd);
  }

  .fin {
    text-align: center;
  }
  .competence {
    margin: 6px 0;
    font-size: 13px;
    letter-spacing: 0.16em;
    color: var(--xp-lcd);
  }
  .module {
    margin: 4px 0 2px;
    font-size: var(--xp-size-body);
    letter-spacing: 0.12em;
    color: var(--xp-accent-amber);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  .position {
    font-size: var(--xp-size-small);
    letter-spacing: var(--xp-ls-tag);
    color: var(--xp-muted);
  }
  /* Le premier bouton reste à gauche (le retour), le dernier à droite (la
     suite) : la position de l'étape s'intercale et pousse le reste. */
  .actions .xp-btn:last-child {
    margin-left: auto;
  }
  .actions .position {
    margin-left: auto;
  }
  .actions .position + .xp-btn {
    margin-left: 8px;
  }

  /* Le carnet. Une ligne par acte, comme une playlist : numéro, titre, une
     phrase, et le titre que l'acte décerne. */
  /* La réponse du client, en vert d'afficheur : c'est une réplique, pas un
     score. Elle disparaît dès qu'on avance. */
  .accepte {
    margin: 0 0 8px;
    padding: 6px 8px;
    font-size: var(--xp-size-sm, 9.5px);
    color: var(--xp-lcd);
    background: var(--xp-lcd-bg, #0d1a12);
    box-shadow: inset 1px 1px 0 var(--xp-shadow), inset -1px -1px 0 var(--xp-light);
  }

  /* Le cahier des charges : des cases à cocher, pas de la prose. Ce que le
     client demande doit se compter d'un coup d'œil. */
  .cahier {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }
  .cahier li {
    font-size: var(--xp-size-sm, 9.5px);
    letter-spacing: var(--xp-ls-sm, 0.04em);
    color: var(--xp-lcd);
    padding: 2px 0;
  }
  .carnet {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    background: var(--xp-lcd-bg);
    border-radius: 2px;
  }
  .acte {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    grid-template-areas: 'num titre comp' 'num resume comp';
    gap: 0 8px;
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    border-bottom: 1px solid #0d160f;
    padding: 6px 8px;
    color: var(--xp-lcd);
    font: inherit;
    font-size: var(--xp-size-small);
    cursor: pointer;
  }
  .acte.courant {
    background: #0c1a0e;
  }
  .acte.fait .titre {
    color: var(--xp-lcd-dim);
  }
  .num {
    grid-area: num;
    align-self: center;
    text-align: center;
  }
  .titre {
    grid-area: titre;
    letter-spacing: 0.12em;
  }
  .resume {
    grid-area: resume;
    color: var(--xp-lcd-dim);
    letter-spacing: 0.02em;
  }
  .comp {
    grid-area: comp;
    align-self: center;
    font-size: var(--xp-size-tag);
    letter-spacing: var(--xp-ls-tag);
    color: var(--xp-lcd-dim);
  }
  .pied {
    margin: 8px 0 0;
    font-size: var(--xp-size-small);
    color: var(--xp-muted);
  }

  /* ⚠️ En fin de <style> : un bloc @media posé au milieu se ferait écraser par
     les règles écrites plus bas (CLAUDE.md). Les enveloppes de `.tap44-y`
     débordent, d'où le rythme vertical desserré ici et nulle part ailleurs. */
  @media (pointer: coarse) {
    .head {
      gap: 10px;
    }
    .carnet {
      margin-top: 16px;
    }
    /* 10px et non 9 : mesuré à 43px de zone réelle à 9 (le liseré du bas
       appartient à la ligne suivante), et 44 est un seuil, pas une cible. */
    .acte {
      padding: 10px 8px;
    }
  }
</style>
