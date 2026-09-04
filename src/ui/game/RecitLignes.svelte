<script lang="ts">
  /* LE RÉCIT QUI SE TAPE — les lignes d'un écran d'histoire, révélées signe à
   * signe, avec le nom de qui parle et sa voix.
   *
   * Retour de Yann (2026-09-03) : *« il faut faire défiler les textes et bien
   * indiquer qui parle »*. Les deux moitiés tiennent ensemble et c'est pour ça
   * qu'elles vivent dans le même composant : le nom dit qui parle à l'œil, le
   * timbre le dit à l'oreille, et c'est le défilement qui donne au timbre le
   * temps de sonner. Affiché d'un bloc, un écran n'a pas de voix.
   *
   * ⚠️ QUI PARLE se lit dans la donnée, jamais deviné — `model/locuteurs.ts`.
   *
   * ⚠️ Le texte est TOUJOURS entièrement présent dans le DOM : la partie non
   * encore tapée est un fantôme invisible qui occupe sa place. Sans lui, chaque
   * ligne qui apparaît pousserait les boutons vers le bas — on cliquerait
   * « Suite » là où était « Retour » une demi-seconde plus tôt. C'est aussi ce
   * qui garantit que les retours à la ligne ne bougent pas en cours de route.
   */
  import { analyserRecit, timbreDe } from '../../model/locuteurs';
  import { frapper } from './voix';

  let {
    lignes,
    cle,
    ton = 'normal',
    transformer,
  }: {
    lignes: string[];
    /** L'identité de l'écran : elle change, le texte repart de zéro. */
    cle: string;
    /** La surface qui l'affiche — l'afficheur vert, le fax, le reste. */
    ton?: 'normal' | 'lcd' | 'fax';
    /* ⚠️ Appliqué APRÈS la lecture du nom, jamais avant : le pseudo du joueur
     * passe par là (`{pseudo}`), et un pseudo qui commence par « SOL: » ne doit
     * pas pouvoir se faire passer pour Sol. */
    transformer?: (t: string) => string;
  } = $props();

  /* Une soixantaine de signes par seconde : un écran de récit (~300 signes) se
   * lit en cinq secondes, et le budget de lecture du prologue — qui est testé —
   * ne bouge pas d'un écran. La pause de fin de ligne est ce qui fait entendre
   * qu'une idée s'arrête ; sans elle, sept lignes font une seule phrase. */
  const VITESSE = 62;
  const PAUSE = 9;

  const dites = $derived(analyserRecit(lignes));
  const plan = $derived.by(() => {
    let n = 0;
    return dites.map((d) => {
      const texte = transformer ? transformer(d.texte) : d.texte;
      const debut = n;
      n += texte.length + PAUSE;
      return { ...d, texte, debut };
    });
  });
  const total = $derived(plan.reduce((n, l) => Math.max(n, l.debut + l.texte.length), 0));

  let revele = $state(0);
  const fini = $derived(revele >= total);
  const courante = $derived(plan.findIndex((l) => revele < l.debut + l.texte.length));

  /* ⚠️ `annuler` n'est PAS une rune : le bouton « tout afficher » doit pouvoir
   * arrêter la boucle sans relancer l'effet qui la tient. */
  let annuler: (() => void) | null = null;

  function sonner(p: typeof plan, i: number): void {
    const l = p.find((x) => i >= x.debut && i < x.debut + x.texte.length);
    if (!l) return; // dans la pause entre deux lignes
    const k = i - l.debut;
    if (l.texte[k] === ' ') return;
    /* Un personnage sonne une fois par MOT — c'est le rythme d'une parole.
     * Le texte off sonne une fois sur deux signes : c'est celui d'une machine
     * à écrire, et c'est exactement ce qu'on veut entendre d'une narration. */
    if (l.qui) {
      if (k === 0 || l.texte[k - 1] === ' ') frapper(timbreDe(l));
    } else if (k % 2 === 0) {
      frapper('machine');
    }
  }

  const anime =
    typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  $effect(() => {
    const p = plan;
    const t = total;
    void cle; // l'écran change : on repart du début
    if (!anime) {
      revele = t;
      return;
    }
    revele = 0;
    let n = 0;
    let depart = 0;
    let img = 0;
    const pas = (ms: number) => {
      if (!depart) depart = ms;
      const vise = Math.min(t, Math.floor(((ms - depart) / 1000) * VITESSE));
      for (let i = n; i < vise; i++) sonner(p, i);
      n = vise;
      revele = n;
      if (n < t) img = requestAnimationFrame(pas);
    };
    img = requestAnimationFrame(pas);
    annuler = () => cancelAnimationFrame(img);
    return () => {
      cancelAnimationFrame(img);
      annuler = null;
    };
  });

  /** Tout afficher tout de suite. Un texte qui se tape doit toujours pouvoir
   *  être coupé : on relit un acte plus vite qu'on ne le découvre. */
  function sauter(): void {
    annuler?.();
    annuler = null;
    revele = total;
  }

  /* Le défilement suit la ligne en cours — le fantôme donne au bloc sa hauteur
     définitive dès le premier signe, donc la tête de lecture peut sortir de la
     zone visible sans que rien ne grandisse. */
  let zone = $state<HTMLDivElement | null>(null);
  let paras = $state<(HTMLParagraphElement | null)[]>([]);
  $effect(() => {
    void revele;
    const el = paras[courante];
    if (!zone || !el) return;
    if (zone.scrollHeight <= zone.clientHeight + 2) return;
    const bas = el.offsetTop + el.offsetHeight;
    if (bas > zone.scrollTop + zone.clientHeight) zone.scrollTop = bas - zone.clientHeight + 4;
  });
</script>

<div
  class="zone ton-{ton}"
  bind:this={zone}
  role="button"
  tabindex="0"
  aria-label="Afficher tout le texte"
  onclick={sauter}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sauter();
    }
  }}
>
  {#each plan as l, i (i)}
    {@const vu = Math.max(0, Math.min(l.texte.length, revele - l.debut))}
    {#if l.montrerNom && l.qui}
      <p class="qui" class:cache={revele < l.debut}>{l.qui.nom}</p>
    {/if}
    <p class="ligne" class:dite={!!l.qui} class:attend={revele < l.debut} bind:this={paras[i]}>
      <span class="dit">{l.texte.slice(0, vu)}</span
      >{#if !fini && i === courante && vu > 0}<span class="curseur">▮</span>{/if}<span
        class="fantome">{l.texte.slice(vu)}</span
      >
    </p>
  {/each}
</div>

<style>
  .zone {
    position: relative;
    /* ⚠️ La zone déborde de huit pixels SUR LA GAUCHE, dans la bordure
       intérieure du panneau, et se les redonne en `padding`. Pourquoi : le rail
       des répliques vit dans cette marge, et `overflow-y: auto` rend
       `overflow-x` défilant aussi — posé en marge négative sur la ligne, le
       rail était simplement rogné. Il existait, il ne se voyait pas. */
    margin-left: -8px;
    width: calc(100% + 8px);
    padding-left: 8px;
    /* Un écran de récit tient en dessous ; au-delà, il défile plutôt que de
       pousser les boutons hors de l'écran (mesuré en 390 × 844). */
    max-height: 46vh;
    overflow-y: auto;
    /* C'est un bouton pour le clavier (« tout afficher »), pas à l'œil : le
       relief d'un pixel dirait « appuie ici » à la place du texte. */
    background: none;
    border: none;
    text-align: left;
    cursor: default;
    color: inherit;
    font: inherit;
  }
  .zone:focus-visible {
    outline: 1px dotted var(--xp-lcd);
    outline-offset: 2px;
  }
  .ligne {
    margin: 0 0 4px;
    font-size: var(--xp-size-body);
    line-height: 1.5;
    color: var(--xp-text);
  }
  .ton-lcd .ligne {
    color: var(--xp-lcd);
  }
  /* Le fax parle en capitales parce que les fax parlaient en capitales. */
  .ton-fax .ligne {
    letter-spacing: 0.05em;
  }
  /* ⚠️ Une RÉPLIQUE se voit avant d'être lue : un rail d'un pixel à gauche, et
     le nom en ambre au-dessus. Le rail court aussi le long des lignes de suite,
     qui ne répètent pas le nom — c'est lui qui dit qu'elles appartiennent
     encore à la même personne. Le vert est réservé à ce qui est allumé
     (CLAUDE.md), un nom n'est pas un état.

     ⚠️ Le rail ne coûte AUCUNE largeur : la marge négative le pose dans la
     bordure intérieure du panneau, donc une réplique se replie exactement là où
     la même phrase en narration se replierait. Mesuré : posé dans le flux, il
     ajoutait des replis à des lignes écrites pour tenir sur une seule. */
  .ligne.dite {
    /* Ambre comme le nom au-dessus : le rail et le nom sont le MÊME objet —
       « ceci est encore la même personne ». En `--xp-line`, le rail existait
       et ne se voyait pas (mesuré à la capture), ce qui revenait à ne pas
       l'avoir. */
    border-left: 1px solid var(--xp-accent-amber);
    padding-left: 7px;
    margin-left: -8px;
  }
  /* ⚠️ Le nom sur sa PROPRE ligne, et c'est une mesure qui l'a décidé : en tête
     de phrase il mangeait jusqu'à douze signes, et sept lignes du récit —
     écrites à ~55 signes pour tenir sur une seule — se repliaient. Une ligne
     qui se replie se lit comme du texte courant (CLAUDE.md) ; un nom au-dessus
     ne coûte que de la hauteur, et l'écran défile. */
  .qui {
    margin: 3px 0 1px;
    font-size: var(--xp-size-tag);
    letter-spacing: var(--xp-ls-tag);
    color: var(--xp-accent-amber);
  }
  /* Le nom attend son tour, sans laisser sa place à personne : caché, pas
     retiré — sinon tout ce qui suit remonterait en arrivant. Le rail attend
     avec lui : sans ça, une colonne de traits ambre annonçait sous le curseur
     combien de répliques restaient à venir, et de qui. */
  .qui.cache {
    visibility: hidden;
  }
  .ligne.dite.attend {
    border-left-color: transparent;
  }
  .fantome {
    visibility: hidden;
  }
  /* ⚠️ Le curseur ne prend AUCUNE place : posé dans le flux, son signe
     pousserait la suite fantôme d'un signe et pourrait, en fin de ligne,
     déplacer un retour à la ligne pendant la frappe. */
  .curseur {
    display: inline-block;
    width: 0;
    overflow: visible;
    color: var(--xp-lcd);
    animation: clignote 0.9s steps(1) infinite;
  }
  @keyframes clignote {
    50% {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .curseur {
      animation: none;
    }
  }
</style>
