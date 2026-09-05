/* Les COMMANDES — ce que le client demande, et ce que Sol vérifie en recevant.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Les onze verbes du Mode jeu demandent tous au joueur de RETROUVER quelque
 * chose : une grille, un pas, un réglage, un genre. Aucun ne lui demande de
 * FAIRE quelque chose. Or le récit ne parle que de ça — on y livre des
 * sonneries, un jingle, un morceau pour Le Tunnel, un pack de quinze styles.
 * L'Atelier existait comme récompense ; il devient un outil de travail.
 *
 * Idée de Yann : *« à la fin de chaque acte où il est question d'une production
 * à livrer, on pourrait devoir produire quelque chose dans l'Atelier et le
 * présenter au Mode carrière pour qu'il valide l'acte »*.
 *
 * ⚠️ La difficulté n'est pas de transporter l'état — c'est le même store — mais
 * de décider CE QUI EST VÉRIFIÉ. Trois façons de rater ça :
 *
 *   - ne rien vérifier : le bouton est du théâtre, le joueur le sent au
 *     deuxième acte et clique sans écouter ;
 *   - vérifier une cible : ce n'est plus une commande, c'est `reproduire` avec
 *     des étapes en plus, et la liberté de l'Atelier ne sert à rien ;
 *   - vérifier trop : une seule réponse juste, donc pas une production.
 *
 * Ce qu'on vérifie est donc le CAHIER DES CHARGES : des propriétés mesurables
 * tirées du brief du client. Beaucoup de morceaux les satisfont — c'est le but.
 * Et le refus est motivé ligne par ligne : un « non » sans raison est ce qui
 * fait abandonner.
 *
 * Module PUR : ni rune, ni DOM, ni audio. Il ne lit qu'un `PatternStateV2`.
 */
import type { PatternStateV2, DrumRowName, SynthRowName, SynthNote } from './types';
import { evaluerStyle, type FicheStyle } from './styles';
import { matchVoicePreset } from './presets/voices';
import { CHORD_PRIORITY_ORDER, buildChordsForScale, currentScale } from './presets/scales';
import { LAVERIE_DRIVES } from './exercises';

/* Ce qu'une contrainte peut avoir besoin de savoir EN PLUS du morceau livré.
 *
 * Le morceau ne dit pas tout : deux grilles identiques peuvent avoir été
 * tapées à la main ou chargées depuis le menu Presets, et ce n'est pas le même
 * travail. La provenance vit dans le store (`pattern.presetCharge`), pas dans
 * le format v2 — c'est de l'état d'interface, il ne se sérialise pas et le
 * moteur ne le lit jamais. Elle arrive donc par ici. */
export interface ContexteLivraison {
  /** L'identifiant du preset chargé TEL QUEL, `null` dès la première
   *  modification. Voir `pattern.presetCharge`. */
  presetCharge?: string | null;
  /* ⚠️ L'état sur lequel l'Atelier s'est OUVERT pour cette commande.
   *
   * Une contrainte qui mesure un GESTE doit comparer à quelque chose, et ce
   * quelque chose n'est pas connu quand le cahier est construit : depuis
   * `partirDeLaLivraison`, le départ est ce que le joueur a livré à l'étape
   * précédente. Il voyage donc par le contexte, comme la provenance du preset.
   *
   * Absent = on ne peut rien conclure sur un geste : les contraintes qui en
   * dépendent répondent FAUX plutôt que vrai. Une case cochée faute
   * d'information est exactement le théâtre que le cahier interdit. */
  depart?: PatternStateV2;
}

export interface Contrainte {
  /** Identifiant stable — sert aux tests et aux clés d'affichage. */
  id: string;
  /** La demande du client, en une ligne, affichée comme une case à cocher.
   *  Écrite du point de vue de CE QU'IL VEUT, jamais du champ qu'on lit. */
  libelle: string;
  /* Le titre de l'étape à laquelle cette ligne appartient, quand la commande
   * en a plusieurs. L'acte 4 se fait EN DEUX TEMPS — « d'abord remplir le
   * séquenceur avec un morceau techno, puis ensuite régler les paramètres pour
   * avoir un meilleur son » — et un cahier de neuf lignes à plat ne dit pas
   * qu'il y a deux gestes différents à faire, dans cet ordre. */
  section?: string;
  /** Vrai si le morceau livré satisfait la demande. */
  verifie: (etat: PatternStateV2, ctx?: ContexteLivraison) => boolean;
  /* Le détail d'une contrainte qui en contient plusieurs — aujourd'hui la
   * seule qui s'en serve est « dans le style de », dont les critères sont ce
   * que le joueur doit LIRE pour savoir quoi changer. Une contrainte de style
   * qui n'afficherait que son verdict global dirait « pas assez dancehall »,
   * ce qui n'est pas un retour. */
  details?: (
    etat: PatternStateV2,
    ctx?: ContexteLivraison,
  ) => Array<{ id: string; libelle: string; ok: boolean }>;
  /* ⚠️ Une INTERDICTION, pas une tâche — et la distinction n'est pas cosmétique.
   *
   * Presque toutes les lignes d'un cahier décrivent quelque chose à FAIRE, donc
   * décoché à l'ouverture et coché quand c'est fait. « Ton morceau, pas le
   * preset chargé depuis le menu » est l'inverse : elle est satisfaite tant
   * qu'on ne triche pas, et elle se DÉcoche si on triche.
   *
   * Sans ce champ, la règle « aucune case n'est cochée à l'ouverture » —
   * celle qui garantit qu'un cahier n'est pas du théâtre — devrait faire une
   * exception nommée à la main dans un test, c'est-à-dire une exception que
   * personne ne verrait en lisant les données. `tests/transformer.test.ts`
   * s'en sert pour ne mesurer que ce qui est une tâche. */
  interdit?: boolean;
}

/** Le verdict d'une livraison : une case par ligne du cahier, et le total. */
export interface Verdict {
  lignes: Array<{ contrainte: Contrainte; ok: boolean }>;
  accepte: boolean;
}

export function evaluerCommande(
  etat: PatternStateV2,
  cahier: Contrainte[],
  ctx: ContexteLivraison = {},
): Verdict {
  const lignes = cahier.map((c) => ({ contrainte: c, ok: c.verifie(etat, ctx) }));
  return { lignes, accepte: lignes.every((l) => l.ok) };
}

// ---------- Le catalogue de contraintes ----------

function coups(etat: PatternStateV2, ligne: DrumRowName): number {
  const r = etat.rows[ligne];
  return r.pattern.slice(0, r.subdiv).filter((v) => (v as number) > 0).length;
}

/** Ces lignes-là sonnent vraiment : au moins un coup, et pas coupées. */
export function lignesPresentes(lignes: DrumRowName[], libelle: string): Contrainte {
  return {
    id: `lignes:${lignes.join('+')}`,
    libelle,
    verifie: (e) => lignes.every((l) => !e.rows[l].muted && coups(e, l) > 0),
  };
}

/** Au moins une variante — rim shot sur la caisse claire, charley ouvert. */
export function auMoinsUneVariante(libelle = 'Au moins un rim shot ou un charley ouvert'): Contrainte {
  return {
    id: 'variante',
    libelle,
    verifie: (e) =>
      (['snare', 'hat'] as DrumRowName[]).some((l) =>
        e.rows[l].pattern.slice(0, e.rows[l].subdiv).some((v) => v === 2),
      ),
  };
}

/** Au moins une rafale, sur n'importe quelle ligne de batterie. */
export function auMoinsUneRafale(libelle = 'Au moins une rafale'): Contrainte {
  return {
    id: 'rafale',
    libelle,
    verifie: (e) =>
      (['kick', 'snare', 'hat', 'clap', 'shaker'] as DrumRowName[]).some((l) => {
        const r = e.rows[l];
        return r.rolls.slice(0, r.subdiv).some((n, i) => n > 1 && (r.pattern[i] as number) > 0);
      }),
  };
}

/** Ça ne doit pas être carré : du swing, au moins tant. */
export function swingAuMoins(pct: number, libelle = 'Ça ne doit pas être carré'): Contrainte {
  return { id: 'swing', libelle, verifie: (e) => e.swing >= pct };
}

/** Une ligne de synthé qui joue vraiment. */
export function ligneSynthPresente(ligne: SynthRowName, libelle: string): Contrainte {
  return {
    id: `synth:${ligne}`,
    libelle,
    verifie: (e) => {
      const r = e.synthRows[ligne];
      return !r.muted && r.pattern.slice(0, r.subdivisions).some((n) => n !== null && n !== -1);
    },
  };
}

/* ⚠️ L'identifiant PORTE les bornes (`tempo:60-92`). Elles n'y étaient pas, et
 * c'est la seule contrainte du jeu dont le test de satisfiabilité ne pouvait
 * pas fabriquer la réponse : un `id` qui ne dit que « tempo » oblige à lire le
 * libellé, c'est-à-dire du français. Même forme que `phrase:melody`. */
export function tempoEntre(min: number, max: number, libelle: string): Contrainte {
  return { id: `tempo:${min}-${max}`, libelle, verifie: (e) => e.tempo >= min && e.tempo <= max };
}

/* ⚠️ « Dans le style de » — par FICHE de style, et c'est la contrainte qui a
 * demandé le plus de mesures.
 *
 * Elle remplace une version qui demandait un RANG ≤ 3 dans `rankPresets`.
 * Celle-là a été RETIRÉE plutôt que gardée en réserve : deux juges de style
 * qui doivent rester d'accord finissent toujours par ne plus l'être (même
 * raison que le comparateur unique de `comparerGrilles`). Ses trois défauts,
 * tous mesurés le 2026-08-26 :
 *
 *   - **elle était contournable** : charger le preset `dancehall` depuis le
 *     menu et livrer suffisait à la satisfaire. D'où `pasUnPresetCharge`,
 *     obligatoire à côté de celle-ci ;
 *   - **elle ne disait rien** : un rang ne se traduit pas en geste. Ici,
 *     `details` rend les critères visibles un par un, et ils se cochent
 *     pendant qu'on travaille comme le reste du cahier ;
 *   - **elle ne voyait pas le synthé** : `rankPresets` ne compare que
 *     kick/snare/hat. Une fiche peut exiger une basse, et le dancehall le
 *     fait — un riddim sans basse n'est pas un riddim.
 *
 * Le libellé porte le compte (« 5/6 »), parce qu'une tolérance qu'on ne voit
 * pas est indistinguable d'un refus arbitraire.
 */
export function dansLeStyleFiche(fiche: FicheStyle, libelle?: string): Contrainte {
  return {
    id: `fiche:${fiche.id}`,
    libelle: libelle ?? `Ça doit sonner ${fiche.label}`,
    verifie: (e) => evaluerStyle(e, fiche).atteint,
    details: (e) =>
      evaluerStyle(e, fiche).lignes.map((l) => ({
        id: l.critere.id,
        libelle: l.critere.essentiel ? `${l.critere.libelle} (sans ça, non)` : l.critere.libelle,
        ok: l.ok,
      })),
  };
}

/* L'empreinte d'un morceau — ce qui change dès qu'on y touche vraiment.
 *
 * Sert à la PROVENANCE (`pattern.presetCharge`) : un preset chargé puis laissé
 * tel quel garde son empreinte, la moindre modification la casse. Plus riche
 * que celle de `pasLeMotifDeDepart`, qui ne regarde que les trois grilles de
 * batterie et doit le rester — elle répond à une autre question (« a-t-on
 * produit quelque chose ? »), et l'élargir ferait passer un simple changement
 * de tempo pour une production.
 */
export function empreinteEtat(e: PatternStateV2): string {
  const drums = (['kick', 'snare', 'hat', 'clap', 'shaker'] as DrumRowName[])
    .map((l) => {
      const r = e.rows[l];
      const n = r.subdiv;
      return `${l}${n}:${r.pattern.slice(0, n).join('')}:${r.rolls.slice(0, n).join('')}:${r.muted ? 'm' : ''}`;
    })
    .join('|');
  const synth = (['bass', 'pad', 'melody'] as SynthRowName[])
    .map((l) => {
      const r = e.synthRows[l];
      return `${l}:${r.pattern.slice(0, r.subdivisions).map((v) => (v === null ? '.' : v)).join(',')}`;
    })
    .join('|');
  return `${e.tempo}/${e.swing}/${drums}/${synth}`;
}

/* ---- LE MIXAGE : ce qui compte comme « mieux », et pourquoi ----------
 *
 * L'acte 4 tient sur une phrase qui ne peut pas être racontée : *« Ton morceau
 * est bon dans ton ordinateur. Ici, il est mauvais. »* Le verbe `laverie` la
 * fait ENTENDRE ; ces trois contraintes-là la font FAIRE.
 *
 * ⚠️ Elles se mesurent sur l'ÉTAT, pas sur l'audio rendu. Rendre le morceau
 * dans un `OfflineAudioContext` à chaque frappe serait asynchrone et lent : le
 * cahier vivant — qui se coche pendant qu'on travaille et qui est la moitié de
 * l'intérêt d'une commande — deviendrait un verdict rendu au clic. Ce qu'on y
 * perd en fidélité, on le récupère par le CALIBRAGE : le seuil du drive vient
 * d'une mesure réelle (voir juste en dessous).
 *
 * Trois, pas dix — et chacune exige un GESTE. Un critère satisfait sans rien
 * toucher est du théâtre : c'est pour ça que « pas trop de réverbe » seul
 * n'existe pas ici (la réverbe est à zéro par défaut, la ligne serait cochée
 * d'avance), et qu'il est devenu « de l'espace, mais pas de la soupe ».
 */

/* Le kick doit exister AILLEURS que dans le grave.
 *
 * Seuil repris de `LAVERIE_DRIVES`, et donc d'une mesure : rendu du vrai graphe
 * dans un `OfflineAudioContext`, kick seul, RMS après le passe-haut du petit
 * haut-parleur rapporté au RMS en studio — drive 0 → 13 %, drive 55 → ~35 %,
 * drive 100 → 40 %. On demande le palier du milieu, celui que l'exercice de la
 * laverie vient de faire entendre. Un chiffre choisi à vue aurait été une
 * exigence arbitraire ; celui-là est la moitié de l'énergie perdue, récupérée.
 */
export function kickQuiPorte(
  libelle = 'Le kick doit s’entendre hors du grave — monte son drive',
): Contrainte {
  return {
    id: 'kick-porte',
    libelle,
    verifie: (e) => e.rows.kick.tone >= LAVERIE_DRIVES[1],
  };
}

/* « Tu enlèves. Ensuite seulement, tu ajoutes. » — Sol, acte 4.
 *
 * Le filtre passe-bas est le geste qui enlève, et le premier du mixage : deux
 * instruments qui occupent la même bande s'effacent l'un l'autre.
 *
 * ⚠️ Le kick est EXCLU du décompte, et ce n'est pas un détail : lui couper les
 * aigus retirerait exactement ce qui vient de lui permettre de survivre au
 * petit haut-parleur. Une contrainte qui accepterait ça enseignerait le
 * contraire de l'acte.
 */
export const COUPE_AUDIBLE_HZ = 8000;

export function avoirEnleve(
  libelle = 'Enlève avant d’ajouter : filtre une ligne qui encombre',
): Contrainte {
  return {
    id: 'enleve',
    libelle,
    verifie: (e) =>
      (['snare', 'hat', 'clap', 'shaker'] as DrumRowName[]).some(
        (l) => !e.rows[l].muted && e.rows[l].filterCutoff <= COUPE_AUDIBLE_HZ,
      ),
  };
}

/* L'espace, et sa mesure — les deux moitiés d'une seule leçon.
 *
 * La réverbe éloigne, c'est ce qui place un son au fond de la pièce ; en trop,
 * elle transforme une boucle en bouillie sur un petit haut-parleur. Exiger
 * seulement le plafond donnerait une case cochée d'avance (la réverbe part à
 * zéro) ; exiger seulement le plancher apprendrait à en mettre sans apprendre
 * à s'arrêter. Les deux ensemble décrivent le geste réel.
 */
export const REVERBE_PLANCHER = 0.1;
export const REVERBE_PLAFOND = 0.4;

export function deLEspaceSansSoupe(
  libelle = 'De l’espace, sans noyer : un peu de réverbe, pas trop',
): Contrainte {
  const lignes: DrumRowName[] = ['kick', 'snare', 'hat', 'clap', 'shaker'];
  return {
    id: 'espace',
    libelle,
    verifie: (e) => {
      const envois = lignes.filter((l) => !e.rows[l].muted).map((l) => e.rows[l].reverbSend);
      return (
        envois.some((v) => v >= REVERBE_PLANCHER) && envois.every((v) => v <= REVERBE_PLAFOND)
      );
    },
  };
}

/* ⚠️ Le verrou des presets — sans lui, l'acte 5 est un menu déroulant.
 *
 * Retour de Yann : *« les reproductions de style, ça doit être fait en
 * atelier, les presets doivent être verrouillés avant »*. Mesuré avant de
 * coder : charger `dancehall` et livrer donnait `produit=true`,
 * `style:dancehall=true`, **accepté**.
 *
 * Ce qu'on refuse est la PROVENANCE, pas la ressemblance — et la nuance est
 * tout le sujet. Refuser une grille identique à celle d'un preset punirait le
 * joueur qui suit honnêtement la fiche : « kick sur chaque temps, rim shot sur
 * 2 et 4, charley ouvert sur les contretemps » mène tout droit à la grille du
 * preset, et c'est justement ce qu'on lui demande de faire. Un morceau tapé à
 * la main passe donc, même s'il tombe juste ; un preset chargé et laissé tel
 * quel ne passe pas.
 *
 * Le menu Presets est en plus désactivé pendant une commande (`ToolBar`) :
 * celui-ci tient le cas où le preset a été chargé AVANT de l'ouvrir.
 */
export function pasUnPresetCharge(
  libelle = 'Ton morceau, pas un preset chargé',
): Contrainte {
  // Une INTERDICTION : satisfaite tant qu'on ne triche pas, décochée si on
  // triche. Voir `Contrainte.interdit`.
  return { id: 'pas-un-preset', libelle, interdit: true, verifie: (_e, ctx) => !ctx?.presetCharge };
}

/* ⚠️ La contrainte qui doit être dans TOUTES les commandes, et qui n'a rien
 * d'une formalité.
 *
 * `defaultState()` ne démarre PAS sur une grille vide : il pose un motif de
 * départ, et ce motif est *exactement* celui de Motown — mesuré,
 * `rankPresets` lui donne 100 % sur « Motown / soul » et sur « Swing ». Un
 * joueur qui entrerait dans l'Atelier et repartirait sans rien toucher
 * livrerait donc un morceau que la moitié des contraintes de style
 * accepteraient.
 *
 * Une commande doit constater qu'on a PRODUIT quelque chose. On compare aux
 * grilles de départ, pas à une cible : n'importe quelle modification suffit.
 */
/* ---- Ce qu'un client demande quand il part d'un rythme existant --------
 *
 * ⚠️ Ces deux contraintes existent pour une raison précise : une commande qui
 * TRANSFORME (voir `etatDepuisGrille`) doit exiger ce que son point de départ
 * n'a pas. Sinon la check-list se coche à l'ouverture — le défaut que
 * `etatVierge()` avait corrigé, et qu'on réintroduirait par la porte de
 * derrière en repartant d'un rythme.
 */

/** Au moins un coup de kick ENTRE deux temps — la syncope de l'acte 1. */
export function kickQuiSortDuTemps(
  libelle = 'Le kick sort du temps au moins une fois',
): Contrainte {
  return {
    id: 'kick-syncope',
    libelle,
    verifie: (e) => {
      const r = e.rows.kick;
      if (r.muted) return false;
      const parTemps = r.subdiv / 4;
      // Une subdivision qui ne se divise pas en quatre temps n'a pas de
      // « entre deux temps » définissable : on ne prétend pas la juger.
      if (!Number.isInteger(parTemps) || parTemps < 2) return false;
      return r.pattern.slice(0, r.subdiv).some((v, i) => v > 0 && i % parTemps !== 0);
    },
  };
}

/** Le charley laisse des trous — de la place pour ce qui se pose dessus. */
export function dePlacePourLaVoix(
  libelle = 'Le charley laisse de la place',
): Contrainte {
  return {
    id: 'place-voix',
    libelle,
    verifie: (e) => {
      const r = e.rows.hat;
      if (r.muted) return false;
      const pas = r.pattern.slice(0, r.subdiv);
      const joues = pas.filter((v) => v > 0).length;
      /* Il faut que le charley SONNE (un charley coupé n'est pas « de la
       * place », c'est une ligne en moins) et qu'il laisse au moins un trou.
       * Un charley plein n'est pas une faute en soi — mesuré, 18 presets sur
       * 34 en ont un — mais c'est ce que CE client demande de changer. */
      return joues > 0 && joues < r.subdiv;
    },
  };
}

/* ---------------------------------------------------------------------------
 * LES GESTES DE PRODUCTION — le vocabulaire de l'acte 4 refait
 *
 * ⚠️ Retour de Yann après relecture complète (2026-09-01) : les cinq exercices
 * de l'acte 4 sont *« NOK »*, verbe `laverie` compris, et le remède est nommé —
 * *« démarrer par l'atelier avec un cahier des charges progressif et au niveau
 * de difficulté poussé, toucher à beaucoup de composantes dont la reverb, le
 * delay, les filtres »*. Un quiz sur un bouton n'apprend pas à mixer ; un
 * cahier qui refuse un morceau tant qu'il n'a pas été mixé, si.
 *
 * Chaque contrainte ci-dessous exige un GESTE, jamais un état par défaut :
 * c'est la règle déjà écrite pour l'acte 4 (« un critère satisfait sans rien
 * toucher est du théâtre »), et elle vaut pour tout ce vocabulaire.
 * ------------------------------------------------------------------------- */

/** Les lignes de batterie dont la production est réglable une par une. */
const LIGNES_MIX: DrumRowName[] = ['kick', 'snare', 'hat', 'clap', 'shaker'];

/** Une ligne qui SONNE : présente, non coupée, et qui joue au moins un pas. */
function ligneVivante(e: PatternStateV2, l: DrumRowName): boolean {
  const r = e.rows[l];
  return !r.muted && r.pattern.slice(0, r.subdiv).some((v) => v > 0);
}

/* ---------------------------------------------------------------------------
 * LE MIXAGE NE S'ARRÊTE PAS À LA BATTERIE
 *
 * ⚠️ Relecture de Yann (2026-09-04), sur les deux premiers envois de l'acte 4 :
 * *« il manque les autres lignes de synthé »*, *« il manque le travail sur les
 * autres lignes de synthé »*. Ce n'était pas un oubli d'écriture du cahier :
 * `LIGNES_MIX` ne contient que la batterie, donc les cinq contraintes de
 * mixage étaient AVEUGLES à la mélodie, à la basse et à la nappe. Un cahier
 * qui les citait n'aurait rien vérifié.
 *
 * Les trois champs qui comptent existent des deux côtés (volume, reverbSend,
 * delaySend) ; le filtre, lui, ne se lit pas au même endroit — `filterCutoff`
 * sur une ligne de batterie, `voice.cutoff` sur une ligne de synthé.
 * ------------------------------------------------------------------------- */

/** Une ligne de MIXAGE : batterie ou synthé. */
export type LigneMix = DrumRowName | SynthRowName;

const LIGNES_SYNTH: SynthRowName[] = ['bass', 'melody', 'pad'];
/** Tout ce qui sort du haut-parleur, dans l'ordre où l'Atelier l'affiche. */
export const LIGNES_TOUTES: LigneMix[] = [...LIGNES_MIX, ...LIGNES_SYNTH];

function estSynth(l: LigneMix): l is SynthRowName {
  return (LIGNES_SYNTH as string[]).includes(l);
}

/* Une ligne de SYNTHÉ qui sonne. La nappe porte des index d'accord (`-1` =
 * silence), les deux autres des notes (`null` = silence) : le même test ne
 * marche pas sur les deux. */
function synthVivante(e: PatternStateV2, l: SynthRowName): boolean {
  const r = e.synthRows[l];
  if (r.muted) return false;
  return r.pattern
    .slice(0, r.subdivisions)
    .some((v) => (l === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
}

function vivante(e: PatternStateV2, l: LigneMix): boolean {
  return estSynth(l) ? synthVivante(e, l) : ligneVivante(e, l);
}

function volumeDe(e: PatternStateV2, l: LigneMix): number {
  return estSynth(l) ? e.synthRows[l].volume : e.rows[l].volume;
}
function reverbDe(e: PatternStateV2, l: LigneMix): number {
  return estSynth(l) ? e.synthRows[l].reverbSend : e.rows[l].reverbSend;
}
function delayDe(e: PatternStateV2, l: LigneMix): number {
  return estSynth(l) ? e.synthRows[l].delaySend : e.rows[l].delaySend;
}
/* ⚠️ La coupure d'une ligne de synthé vit dans SA VOIX, et elle est basse
 * d'usine : 600 Hz sur la basse, 1 600 sur la mélodie. Un seuil ABSOLU du
 * genre « au moins deux lignes sous 9 000 Hz » serait donc satisfait par
 * n'importe quel synthé sans toucher à rien — d'où `aBaisseLeFiltre`, qui
 * mesure un GESTE, plutôt qu'un élargissement de `filtreQuiCoupe`. */
function coupureDe(e: PatternStateV2, l: LigneMix): number {
  if (!estSynth(l)) return e.rows[l].filterCutoff;
  const c = e.synthRows[l].voice.cutoff;
  return typeof c === 'number' ? c : 20000;
}

const NOM_MIX: Record<LigneMix, string> = {
  kick: 'kick',
  snare: 'claire',
  hat: 'charley',
  clap: 'clap',
  shaker: 'shaker',
  bass: 'basse',
  melody: 'mélodie',
  pad: 'nappe',
};

/* ---------------------------------------------------------------------------
 * TROIS BOUCLES D'UN MÊME MORCEAU — couplet, refrain, pont
 *
 * ⚠️ Demande de Yann (2026-09-04) : *« on peut aller plus loin dans l'atelier
 * […] pour chacun de ces morceaux, on travaille 3 boucles qui permettront de
 * faire ensuite couplet/refrain/pont pour le mode live »*.
 *
 * Ce que ces contraintes ont de particulier : elles sont RELATIONNELLES au sens
 * fort — elles ne jugent pas la boucle livrée, elles jugent l'ÉCART entre elle
 * et celle d'avant. « Un refrain » n'a pas de définition absolue ; ce qui en
 * fait un refrain, c'est qu'il s'ouvre par rapport au couplet. Et un pont
 * retombe. Le point de comparaison est `ctx.depart`, c'est-à-dire la boucle sur
 * laquelle l'Atelier s'est ouvert (voir `partirDeLaSerie`).
 *
 * ⚠️ Sans départ, elles répondent FAUX — comme toutes les contraintes de geste.
 * Une case cochée faute d'information est le théâtre que le cahier interdit.
 * ------------------------------------------------------------------------- */

/** Combien de coups sonnent, toutes lignes confondues — la « densité » d'une
 *  boucle. Les cases de nappe comptent comme les autres : un accord est un
 *  événement, et c'est ce qu'on entend. */
function coupsDe(e: PatternStateV2): number {
  const drums = LIGNES_MIX.reduce(
    (n, l) => n + (e.rows[l].muted ? 0 : e.rows[l].pattern.slice(0, e.rows[l].subdiv).filter((v) => v > 0).length),
    0,
  );
  const synth = LIGNES_SYNTH.reduce((n, l) => {
    const r = e.synthRows[l];
    if (r.muted) return n;
    return (
      n +
      r.pattern
        .slice(0, r.subdivisions)
        .filter((v) => (l === 'pad' ? typeof v === 'number' && v >= 0 : v != null)).length
    );
  }, 0);
  return drums + synth;
}

/** Les lignes qui SONNENT dans un état — batterie et synthé mêlées. */
function lignesQuiSonnent(e: PatternStateV2): Set<LigneMix> {
  return new Set(LIGNES_TOUTES.filter((l) => vivante(e, l)));
}

/* Le REFRAIN s'ouvre : il en met plus que le couplet. */
export function plusFourniQue(part: number, libelle: string): Contrainte {
  return {
    id: 'plus-fourni',
    libelle,
    verifie: (e, ctx) => !!ctx?.depart && coupsDe(e) >= Math.ceil(coupsDe(ctx.depart) * part),
  };
}

/* Le PONT retombe : il en met moins. */
export function moinsFourniQue(part: number, libelle: string): Contrainte {
  return {
    id: 'moins-fourni',
    libelle,
    verifie: (e, ctx) => !!ctx?.depart && coupsDe(e) <= Math.floor(coupsDe(ctx.depart) * part),
  };
}

/* Une ligne ENTRE — elle sonne ici et se taisait avant.
 *
 * ⚠️ C'est ce qui distingue un refrain d'un couplet joué plus fort : ajouter
 * des coups sur les mêmes lignes fait une variation, faire entrer une voix fait
 * un refrain. Le détail nomme ce qui est déjà là, sinon « fais entrer quelque
 * chose » ne dit pas quoi. */
export function uneLigneQuiEntre(libelle: string): Contrainte {
  return {
    id: 'ligne-entre',
    libelle,
    verifie: (e, ctx) => {
      if (!ctx?.depart) return false;
      const avant = lignesQuiSonnent(ctx.depart);
      return [...lignesQuiSonnent(e)].some((l) => !avant.has(l));
    },
  };
}

/* Une ligne SE TAIT — elle sonnait avant et plus maintenant. */
export function uneLigneQuiSeTait(libelle: string): Contrainte {
  return {
    id: 'ligne-sort',
    libelle,
    verifie: (e, ctx) => {
      if (!ctx?.depart) return false;
      const maintenant = lignesQuiSonnent(e);
      return [...lignesQuiSonnent(ctx.depart)].some((l) => !maintenant.has(l));
    },
  };
}

/* PAS PLEIN — au plus tant de lignes qui sonnent.
 *
 * ⚠️ Le seul plafond ABSOLU du jeu, et il ne compte pas des coups mais des
 * VOIX : un plafond de coups dépend de la subdivision (seize pas sur trois
 * lignes en autorisent quarante-huit, huit pas n'en autorisent que vingt-quatre),
 * donc le même chiffre veut dire deux choses. « Pas plein » se mesure au nombre
 * de choses qui parlent en même temps, et ça, c'est stable. */
export function auPlusDeLignes(max: number, libelle: string): Contrainte {
  return {
    id: 'au-plus-lignes',
    libelle,
    verifie: (e) => {
      const n = lignesQuiSonnent(e).size;
      return n > 0 && n <= max;
    },
  };
}

/* UN GESTE QUE LES AUTRES N'ONT PAS.
 *
 * ⚠️ La seule façon de demander de l'ORIGINALITÉ sans la dicter. Le troisième
 * morceau de l'acte 6 doit « ne ressembler à rien » ; une contrainte qui
 * nommerait le geste transformerait ça en consigne, c'est-à-dire exactement le
 * brief que l'acte s'interdit. On en exige donc UN parmi cinq, et le détail les
 * liste tous — même forme que `deLAlea`, pour la même raison : on en demande un,
 * et dire lequel serait choisir à la place du joueur.
 *
 * Les cinq sont des gestes DÉJÀ ENSEIGNÉS et qu'aucun autre cahier n'exige : le
 * décalage (acte 2), le glissando et la nappe qui bouge (acte 3), un balancement
 * franc (acte 2), une ligne de synthé qui tourne sur deux mesures (acte 5). Une
 * commande n'enseigne rien de neuf. */
export function unGesteRare(libelle: string): Contrainte {
  /* ⚠️ Chaque geste exige que sa ligne SONNE, pas seulement qu'elle ne soit pas
   * coupée : un réglage posé sur une ligne muette ne s'entend pas, et une case
   * cochée pour un son inaudible est le théâtre que le cahier interdit.
   *
   * ⚠️ Et « deux mesures » ne regarde QUE la mélodie et la basse : la nappe
   * tourne sur quatre mesures par défaut (`etatVierge`), donc l'y inclure
   * cochait la case sur un Atelier vide — trouvé par la garde « aucune tâche
   * cochée à l'ouverture », pas en relisant le code. */
  const gestes = (e: PatternStateV2) => ({
    decalage: LIGNES_MIX.some((l) => ligneVivante(e, l) && Math.abs(e.rows[l].shiftPct) >= 6),
    glide: (['melody', 'bass'] as const).some(
      (l) => synthVivante(e, l) && e.synthRows[l].glide >= 0.05,
    ),
    nappe:
      synthVivante(e, 'pad') && (e.synthGlobal.padArpEnabled || e.synthGlobal.padDroneEnabled),
    balancement: e.swing >= 25,
    deuxMesures: (['melody', 'bass'] as const).some(
      (l) => synthVivante(e, l) && e.synthRows[l].cycleBars >= 2,
    ),
  });
  const NOMS: Record<keyof ReturnType<typeof gestes>, string> = {
    decalage: 'une ligne décalée contre les autres',
    glide: 'un glissando sur la mélodie ou la basse',
    nappe: 'la nappe en arpège ou en bourdon',
    balancement: 'un balancement franc (swing 25 ou plus)',
    deuxMesures: 'une ligne de synthé qui tourne sur deux mesures',
  };
  return {
    id: 'geste-rare',
    libelle,
    verifie: (e) => Object.values(gestes(e)).some(Boolean),
    details: (e) => {
      const etat = gestes(e);
      return (Object.keys(NOMS) as Array<keyof typeof NOMS>).map((k) => ({
        id: `rare-${k}`,
        libelle: NOMS[k],
        ok: etat[k],
      }));
    },
  };
}

/* ---------------------------------------------------------------------------
 * ET CE QUI MANQUAIT : LA MÉLODIE
 *
 * ⚠️ Retour de Yann (2026-09-05), sur la première version de l'acte 6 :
 * *« le travail n'est pas suffisant pour le refrain et le pont, il faut un
 * cahier des charges plus complet avec un travail sur la mélodie. »*
 *
 * Il a raison, et le défaut se voit dans les identifiants : `plus-fourni`,
 * `moins-fourni`, `ligne-entre`, `ligne-sort` comptent tous des COUPS. Un
 * refrain qui s'ouvre en ajoutant un shaker satisfaisait le cahier — or ce
 * n'est pas un refrain, c'est le couplet avec un shaker. Ce qui fait qu'on
 * reconnaît un refrain à la seconde où il arrive, c'est que **la phrase
 * change**, et le plus souvent qu'elle MONTE.
 *
 * Les quatre contraintes qui suivent sont donc relationnelles comme les
 * précédentes, mais sur la ligne mélodique et sur l'harmonie. Même règle
 * qu'elles : sans `ctx.depart`, elles répondent FAUX.
 * ------------------------------------------------------------------------- */

/* La phrase telle qu'elle est ÉCRITE — positions comprises.
 *
 * ⚠️ `notesDe` jette les silences, donc deux phrases faites des mêmes notes
 * placées ailleurs lui paraissent identiques. Or déplacer une phrase, c'est
 * précisément en écrire une autre. On sérialise donc le motif tranché à sa
 * subdivision, silences inclus. */
function phraseDe(e: PatternStateV2, ligne: 'bass' | 'melody'): string {
  const r = e.synthRows[ligne];
  if (r.muted) return '';
  return r.pattern
    .slice(0, r.subdivisions)
    .map((v) => (v && typeof v === 'object' ? `${v.degree}.${v.octave}` : '-'))
    .join(',');
}

/* La hauteur MOYENNE de la ligne, en degrés d'échelle.
 *
 * ⚠️ L'octave compte pour sept degrés : sans elle, la même phrase montée d'une
 * octave — le geste le plus courant pour ouvrir un refrain — donnerait la même
 * moyenne, et « ça monte » serait faux au moment exact où c'est vrai. Rend
 * `null` quand rien ne joue : une ligne muette n'a pas de hauteur, et c'est à
 * l'appelant de décider ce que ça veut dire. */
function hauteurMoyenne(e: PatternStateV2, ligne: 'bass' | 'melody'): number | null {
  const n = notesDe(e, ligne);
  if (!n.length) return null;
  return n.reduce((t, x) => t + x.degree + 7 * x.octave, 0) / n.length;
}

/* Les accords de la nappe, dans l'ordre où ils tombent. Une case de nappe
 * porte un INDEX d'accord (voir `laBasseDitLAccord`) — on compare donc des
 * index, jamais des degrés. */
function suiteDAccords(e: PatternStateV2): string {
  const r = e.synthRows.pad;
  if (r.muted) return '';
  return r.pattern
    .slice(0, r.subdivisions)
    .map((v) => (typeof v === 'number' && v >= 0 ? String(v) : '-'))
    .join(',');
}

/* UNE AUTRE PHRASE — pas celle d'avant.
 *
 * La contrainte la plus élémentaire des trois boucles, et celle qui manquait :
 * un refrain qui rejoue la mélodie du couplet n'est pas un refrain. Elle exige
 * en plus que la ligne SONNE : « je l'ai coupée » est une autre phrase au sens
 * strict, et ce n'est pas ce qu'on demande. */
export function uneAutrePhrase(ligne: 'bass' | 'melody', libelle: string): Contrainte {
  return {
    id: `autre-phrase:${ligne}`,
    libelle,
    verifie: (e, ctx) => {
      if (!ctx?.depart) return false;
      const ici = phraseDe(e, ligne);
      return ici !== '' && notesDe(e, ligne).length > 0 && ici !== phraseDe(ctx.depart, ligne);
    },
  };
}

/* ÇA MONTE — la phrase va chercher plus haut que celle d'avant.
 *
 * ⚠️ `ecart` est en DEGRÉS d'échelle, pas en demi-tons : c'est l'unité dans
 * laquelle la case de l'Atelier est écrite, donc la seule que le joueur puisse
 * viser à l'œil. Un degré de moyenne, c'est peu — mais c'est ce qui sépare
 * « la même phrase » de « la même phrase montée » ; exiger davantage
 * pousserait à sauter d'une octave, ce qui est un effet et pas une écriture. */
export function unePhraseQuiMonte(ligne: 'bass' | 'melody', ecart: number, libelle: string): Contrainte {
  return {
    id: `phrase-monte:${ligne}`,
    libelle,
    verifie: (e, ctx) => {
      if (!ctx?.depart) return false;
      const ici = hauteurMoyenne(e, ligne);
      const avant = hauteurMoyenne(ctx.depart, ligne);
      return ici !== null && avant !== null && ici >= avant + ecart;
    },
  };
}

/* ÇA S'ÉCLAIRCIT — la phrase joue moins de notes par mesure qu'avant.
 *
 * Le geste du pont, et son piège : la couper entièrement satisferait « moins
 * de notes » à zéro. On exige donc qu'elle joue encore — un pont sans mélodie
 * est un break, et le break est un geste du Mode Live, pas de l'Atelier. */
export function unePhraseQuiSEclaircit(
  ligne: 'bass' | 'melody',
  part: number,
  libelle: string,
): Contrainte {
  return {
    id: `phrase-eclaircit:${ligne}`,
    libelle,
    verifie: (e, ctx) => {
      if (!ctx?.depart) return false;
      const ici = parMesure(e, ligne);
      const avant = parMesure(ctx.depart, ligne);
      return ici > 0 && avant > 0 && ici <= avant * part;
    },
  };
}

/* L'HARMONIE BOUGE — la suite d'accords n'est pas celle d'avant.
 *
 * ⚠️ C'est le geste du PONT, et la raison pour laquelle un pont n'est pas
 * « le couplet en moins plein » : on y change d'accords. Elle exige que la
 * nappe sonne des deux côtés — sans accords avant, il n'y a pas d'harmonie à
 * quitter, et la case se cocherait pour la mauvaise raison. */
export function uneAutreHarmonie(libelle: string): Contrainte {
  return {
    id: 'autre-harmonie',
    libelle,
    verifie: (e, ctx) => {
      if (!ctx?.depart) return false;
      const ici = suiteDAccords(e);
      const avant = suiteDAccords(ctx.depart);
      const joue = (s: string) => s !== '' && s.split(',').some((x) => x !== '-');
      return joue(ici) && joue(avant) && ici !== avant;
    },
  };
}

/* ---------------------------------------------------------------------------
 * LES ÉTOILES D'UNE LIVRAISON — ce qu'on a fait EN PLUS du cahier
 *
 * ⚠️ Idée de Yann (2026-09-04), qui révoque le « livré ou pas » de la veille :
 * *« si la personne n'a même pas écouté son travail, une seule étoile ; si elle
 * n'a fait que le cahier des charges, ou qu'elle n'a pas changé au moins deux
 * autres paramètres : 1 étoile ; au moins 2 paramètres et une écoute : 2
 * étoiles ; au moins 3 paramètres et deux cycles : 3 étoiles. On salue l'effort
 * de rechercher un produit. »*
 *
 * ⚠️ ET LE POINT QUI NE TENAIT PAS TEL QUEL. « N'a fait que le cahier » et
 * « a changé deux paramètres » se contredisent sur un cahier de MIXAGE :
 * le troisième envoi du Tunnel EXIGE d'avoir retouché six lignes, donc le
 * satisfaire donne six paramètres changés — trois étoiles d'office, là où la
 * première phrase en veut une. Noter l'effort demande donc de savoir ce que le
 * cahier RÉCLAMAIT, et aucune contrainte ne le déclare.
 *
 * La sortie n'est pas d'annoter les trente contraintes à la main (long, et faux
 * au premier oubli) : **on remet chaque réglage changé à sa valeur de départ et
 * on réévalue le cahier.** S'il passe encore, le réglage était GRATUIT — fait
 * en plus. S'il tombe, il était exigé. C'est exact pour tous les cahiers, y
 * compris ceux qui n'existent pas encore, et ça ne demande rien à personne.
 *
 * ⚠️ Ce qu'on compte est un RÉGLAGE, jamais une case : la grille est le travail
 * que le cahier juge déjà. Le tempo non plus — c'est une propriété du morceau,
 * et plusieurs fiches de style l'exigent.
 * ------------------------------------------------------------------------- */

/** Un bouton du studio : de quoi le lire, et de quoi le remettre où il était. */
interface Reglage {
  id: string;
  lire: (e: PatternStateV2) => number | boolean | string;
  poser: (e: PatternStateV2, v: number | boolean | string) => void;
}

const CHAMPS_BATTERIE = [
  'volume', 'filterCutoff', 'reverbSend', 'delaySend', 'tone', 'pitch', 'attack', 'decay', 'shiftPct',
] as const;
const CHAMPS_SYNTH = ['volume', 'reverbSend', 'delaySend', 'glide', 'shiftPct'] as const;
/* Les boutons GLOBAUX qui changent le son. `tempo` en est absent (voir plus
 * haut), `fillEvery` et `fillIntensity` y sont : ce sont des gestes de studio. */
const CHAMPS_GLOBAUX = [
  'swing', 'drag', 'synthSwing', 'synthDrag', 'randomVelocity', 'spontRoll',
  'fillEvery', 'fillIntensity', 'ghostDensity', 'globalSaturation',
  'globalCompression', 'globalBitcrush', 'finalVolume',
] as const;
const CHAMPS_SYNTH_GLOBAL = [
  'reverbSize', 'delayDivision', 'delayFeedback', 'sidechainDepth', 'rootMidi', 'scaleId',
] as const;

const REGLAGES: Reglage[] = [
  ...LIGNES_MIX.flatMap((l) =>
    CHAMPS_BATTERIE.map((c) => ({
      id: `${l}.${c}`,
      lire: (e: PatternStateV2) => e.rows[l][c],
      poser: (e: PatternStateV2, v: number | boolean | string) => {
        (e.rows[l] as unknown as Record<string, unknown>)[c] = v;
      },
    })),
  ),
  ...LIGNES_SYNTH.flatMap((l) => [
    ...CHAMPS_SYNTH.map((c) => ({
      id: `${l}.${c}`,
      lire: (e: PatternStateV2) => e.synthRows[l][c] ?? 0,
      poser: (e: PatternStateV2, v: number | boolean | string) => {
        (e.synthRows[l] as unknown as Record<string, unknown>)[c] = v;
      },
    })),
    /* La VOIX compte pour un seul réglage : choisir « Rhodes » est un geste,
     * pas six. On la compare par sa coupure et son type, les deux champs que
     * tout preset de voix pose. */
    {
      id: `${l}.voix`,
      lire: (e: PatternStateV2) => `${e.synthRows[l].voice.type ?? ''}/${coupureDe(e, l)}`,
      poser: (e: PatternStateV2, v: number | boolean | string) => {
        const [type, cut] = String(v).split('/');
        e.synthRows[l].voice = { ...e.synthRows[l].voice, type: (type || undefined) as never, cutoff: Number(cut) };
      },
    },
  ]),
  ...CHAMPS_GLOBAUX.map((c) => ({
    id: c,
    lire: (e: PatternStateV2) => e[c],
    poser: (e: PatternStateV2, v: number | boolean | string) => {
      (e as unknown as Record<string, unknown>)[c] = v;
    },
  })),
  ...CHAMPS_SYNTH_GLOBAL.map((c) => ({
    id: `synth.${c}`,
    lire: (e: PatternStateV2) => e.synthGlobal[c],
    poser: (e: PatternStateV2, v: number | boolean | string) => {
      (e.synthGlobal as unknown as Record<string, unknown>)[c] = v;
    },
  })),
  ...(['padArpEnabled', 'padDroneEnabled'] as const).map((c) => ({
    id: `synth.${c}`,
    lire: (e: PatternStateV2) => e.synthGlobal[c] ?? false,
    poser: (e: PatternStateV2, v: number | boolean | string) => {
      (e.synthGlobal as unknown as Record<string, unknown>)[c] = v;
    },
  })),
];

/* ⚠️ Copie profonde par JSON et NON `structuredClone` : l'état livré vient d'un
 * `$state.snapshot()`, mais rien n'interdit à un appelant de passer un proxy —
 * et `structuredClone` casse dessus (piège maison, voir CLAUDE.md). Le
 * round-trip de sérialisation ne convient pas non plus ici : il CLAMPE, donc il
 * pourrait effacer tout seul l'écart qu'on cherche à mesurer. */
const copie = (e: PatternStateV2): PatternStateV2 => JSON.parse(JSON.stringify(e)) as PatternStateV2;

/**
 * Les réglages changés depuis le départ que le cahier n'exigeait PAS.
 *
 * Renvoie leurs identifiants — le compte suffit à noter, la liste sert au test
 * et rend le refus explicable si on décide un jour de l'afficher.
 */
export function reglagesEnPlus(
  livre: PatternStateV2,
  cahier: Contrainte[],
  ctx: ContexteLivraison,
): string[] {
  const depart = ctx.depart;
  if (!depart) return [];
  return REGLAGES.filter((r) => r.lire(livre) !== r.lire(depart)).filter((r) => {
    const sans = copie(livre);
    r.poser(sans, r.lire(depart));
    // Le cahier tient encore sans ce réglage : il n'était donc pas exigé.
    return evaluerCommande(sans, cahier, ctx).accepte;
  }).map((r) => r.id);
}

/* La note d'une livraison, telle que Yann l'a posée.
 *
 * ⚠️ Aucune de ces bornes n'est un jugement de goût : ce sont deux gestes de
 * studio qu'on ne peut pas faire par accident — chercher un son, et écouter ce
 * qu'on a fait. Une livraison complète vaut toujours au moins une étoile : le
 * bouton reste verrouillé tant que le cahier n'est pas satisfait, donc arriver
 * là veut déjà dire qu'on a tout fait. */
export function etoilesDeLivraison(enPlus: number, cycles: number): 1 | 2 | 3 {
  if (enPlus >= 3 && cycles >= 2) return 3;
  if (enPlus >= 2 && cycles >= 1) return 2;
  return 1;
}


/* Le filtre passe-bas COUPE vraiment.
 *
 * `filterCutoff` va jusqu'à 20 000 Hz, c'est-à-dire au-dessus de l'audible :
 * la valeur par défaut ne coupe rien. Exiger « un filtre » sans seuil serait
 * donc satisfait d'entrée — le théâtre que la règle interdit. */
export function filtreQuiCoupe(
  maxHz: number,
  combien: number,
  libelle: string,
): Contrainte {
  return {
    id: `filtre-${maxHz}`,
    libelle,
    verifie: (e) =>
      LIGNES_MIX.filter((l) => ligneVivante(e, l) && e.rows[l].filterCutoff <= maxHz).length >= combien,
  };
}

/* AVOIR FILTRÉ — le même geste, mesuré contre le départ.
 *
 * ⚠️ Pourquoi une seconde contrainte plutôt qu'un paramètre de plus sur
 * `filtreQuiCoupe` : les deux ne mesurent pas la même chose. Un seuil ABSOLU
 * dit « cette ligne ne monte pas au-dessus de 9 000 Hz », ce qui est vrai
 * d'une ligne de batterie qu'on a filtrée — et vrai d'usine de toute ligne de
 * synthé, dont la voix coupe déjà à 600 ou 1 600 Hz. Sur le synthé, la seule
 * chose qui veuille dire quelque chose est le GESTE : la coupure est plus
 * basse qu'au départ. Deux sémantiques dans une seule fonction, ce sont deux
 * cahiers qui croient demander la même chose. */
export function aBaisseLeFiltre(
  lignes: LigneMix[],
  combien: number,
  libelle: string,
): Contrainte {
  const baissee = (e: PatternStateV2, d: PatternStateV2, l: LigneMix) =>
    vivante(e, l) && coupureDe(e, l) < coupureDe(d, l);
  return {
    id: 'filtre-geste',
    libelle,
    verifie: (e, ctx) =>
      !!ctx?.depart && lignes.filter((l) => baissee(e, ctx.depart!, l)).length >= combien,
    details: (e, ctx) =>
      lignes.map((l) => ({
        id: `filtre-${l}`,
        libelle: NOM_MIX[l],
        ok: !!ctx?.depart && baissee(e, ctx.depart, l),
      })),
  };
}

/* Le delay est ENGAGÉ, et il se compte.
 *
 * ⚠️ Un envoi de delay sans retour audible ne s'entend pas : `delayFeedback`
 * doit être non nul, sinon la répétition ne revient qu'une fois et le joueur
 * a coché une case sans rien changer à ce qu'il entend. Ce champ est GLOBAL
 * (`synthGlobal`) et non par ligne, malgré son voisinage avec `delaySend`. */
export function delayEngage(
  min: number,
  libelle: string,
  lignes: LigneMix[] = LIGNES_MIX,
): Contrainte {
  return {
    id: 'delay',
    libelle,
    verifie: (e) =>
      e.synthGlobal.delayFeedback > 0 &&
      lignes.some((l) => vivante(e, l) && delayDe(e, l) >= min),
  };
}

/* De la réverbe DOSÉE : au moins une ligne dedans, aucune au-delà.
 *
 * C'est la forme généralisée de `deLEspaceSansSoupe` : « de l'espace » seul se
 * satisfait en poussant tout à fond, ce qui est précisément le défaut que
 * l'acte enseigne à éviter. Une borne haute rend la ligne infalsifiable. */
export function reverbDosee(
  min: number,
  max: number,
  libelle: string,
  lignes: LigneMix[] = LIGNES_MIX,
): Contrainte {
  return {
    id: 'reverb-dosee',
    libelle,
    verifie: (e) => {
      const envois = lignes.filter((l) => vivante(e, l)).map((l) => reverbDe(e, l));
      return envois.some((v) => v >= min) && envois.every((v) => v <= max);
    },
  };
}

/* Faire de la PLACE : toutes les lignes ne sont pas au même volume.
 *
 * Le geste de mixage le plus élémentaire, et le seul qui ne demande aucun
 * effet — c'est pour ça qu'il ouvre le cahier. L'écart se mesure entre la
 * ligne la plus forte et la plus faible de celles qui sonnent. */
export function contrasteDeVolume(
  ecart: number,
  libelle: string,
  lignes: LigneMix[] = LIGNES_MIX,
): Contrainte {
  return {
    id: 'contraste',
    libelle,
    verifie: (e, ctx) => {
      const vivantes = lignes.filter((l) => vivante(e, l));
      const v = vivantes.map((l) => volumeDe(e, l));
      if (v.length < 2 || Math.max(...v) - Math.min(...v) < ecart) return false;
      /* ⚠️ ET IL FAUT AVOIR BOUGÉ UN CURSEUR. Les volumes d'usine ne sont pas
       * égaux — kick 1,0 / claire 0,9 / charley 0,7 (`defaults.ts`) — donc
       * l'écart de 0,18 était atteint sans toucher à rien : la case « range
       * les plans » se cochait à l'ouverture de tout morceau qui sonne.
       * Trouvé en généralisant la contrainte au synthé, pas par un test : la
       * garde « aucune case cochée à l'ouverture » mesure sur un Atelier VIDE,
       * où aucune ligne n'est vivante. Un critère satisfait sans rien toucher
       * est du théâtre, quelle que soit la ligne qu'il regarde. */
      return !!ctx?.depart && vivantes.some((l) => volumeDe(e, l) !== volumeDe(ctx.depart!, l));
    },
  };
}

/* Chaque ligne citée a été RETOUCHÉE depuis le point de départ.
 *
 * ⚠️ La contrainte qui rend un cahier de mixage honnête. Les autres se
 * satisfont en poussant un seul curseur très fort ; celle-ci demande d'avoir
 * regardé chaque ligne. Elle compare à l'état de DÉPART, donc elle ne peut pas
 * être vraie à l'ouverture — c'est la même mécanique que
 * `pasLeMotifDeDepart`, appliquée à la production plutôt qu'aux cases. */
export function chaqueLigneRetouchee(lignes: LigneMix[], libelle: string): Contrainte {
  const champs = ['volume', 'filterCutoff', 'reverbSend', 'delaySend', 'tone', 'pitch'] as const;
  /* ⚠️ Une ligne de synthé n'a ni `tone` ni `pitch` ni `filterCutoff` : ce
   * qu'on peut lui retoucher est son volume, ses deux envois, son glide et la
   * coupure de sa VOIX. Comparer les mêmes six champs des deux côtés aurait
   * rendu la ligne intouchable — donc le cahier impossible. */
  const bougeeSynth = (e: PatternStateV2, d: PatternStateV2, l: SynthRowName) =>
    e.synthRows[l].volume !== d.synthRows[l].volume ||
    e.synthRows[l].reverbSend !== d.synthRows[l].reverbSend ||
    e.synthRows[l].delaySend !== d.synthRows[l].delaySend ||
    e.synthRows[l].glide !== d.synthRows[l].glide ||
    coupureDe(e, l) !== coupureDe(d, l);
  const bougee = (e: PatternStateV2, d: PatternStateV2, l: LigneMix) =>
    estSynth(l) ? bougeeSynth(e, d, l) : champs.some((c) => e.rows[l][c] !== d.rows[l][c]);
  return {
    id: 'retouchees',
    libelle,
    verifie: (e, ctx) => !!ctx?.depart && lignes.every((l) => bougee(e, ctx.depart!, l)),
    /* Le détail nomme les lignes restées intactes : « chaque ligne a été
     * regardée » sans dire LAQUELLE manque n'est pas un retour, c'est un
     * refus. */
    details: (e, ctx) =>
      lignes.map((l) => ({
        id: `retouche-${l}`,
        libelle: NOM_MIX[l],
        ok: !!ctx?.depart && bougee(e, ctx.depart, l),
      })),
  };
}

export function pasLeMotifDeDepart(
  depart: PatternStateV2,
  libelle = 'Il faut y avoir touché',
): Contrainte {
  const empreinte = (e: PatternStateV2) =>
    (['kick', 'snare', 'hat'] as DrumRowName[])
      .map((l) => `${e.rows[l].subdiv}:${e.rows[l].pattern.slice(0, e.rows[l].subdiv).join('')}`)
      .join('|');
  const avant = empreinte(depart);
  return { id: 'produit', libelle, verifie: (e) => empreinte(e) !== avant };
}

/* « Il faut y avoir touché » — quand le DÉPART n'est pas connu d'avance.
 *
 * ⚠️ `pasLeMotifDeDepart` compare à un état FIGÉ dans le cahier, ce qui suppose
 * de savoir en l'écrivant sur quoi l'Atelier va s'ouvrir. C'est vrai d'une
 * commande qui part d'une table rase ou d'un niveau écrit ; ce n'est plus vrai
 * d'une commande qui reprend une LIVRAISON — le départ est alors ce que le
 * joueur a livré, et personne ne peut l'écrire à l'avance.
 *
 * Elle lit donc le départ dans le CONTEXTE, comme `chaqueLigneRetouchee`, et
 * répond FAUX en son absence : une case cochée faute d'information est le
 * théâtre que le cahier interdit.
 *
 * ⚠️ Et elle regarde le SON en plus des grilles. `empreinteEtat` ne hache que
 * les cases, le tempo et le swing — ce qui suffit à `pasLeMotifDeDepart`, dont
 * les commandes partent d'un rythme à transformer. Un envoi qui ne demande que
 * du mixage ne change AUCUNE case : sur la seule empreinte des grilles, « il
 * faut y avoir touché » serait resté décoché après une heure de travail. */
export function avoirTouche(libelle = 'Il faut y avoir touché'): Contrainte {
  const signature = (e: PatternStateV2) =>
    `${empreinteEtat(e)}/${LIGNES_TOUTES.map(
      (l) => `${volumeDe(e, l)}:${reverbDe(e, l)}:${delayDe(e, l)}:${coupureDe(e, l)}`,
    ).join('|')}`;
  return {
    id: 'touche',
    libelle,
    verifie: (e, ctx) => !!ctx?.depart && signature(e) !== signature(ctx.depart),
  };
}

/* ---------------------------------------------------------------------------
 * LES COUCHES DU SYNTHÉ — le vocabulaire de l'acte 3 refait
 *
 * ⚠️ Même remède que l'acte 4, sur la demande de Yann après relecture
 * complète : *« il faut que tout soit en atelier avec des cahiers des charges
 * assez complexes »*. L'acte 3 concluait sur une commande de trois lignes
 * (« une basse », « de quoi tenir le temps ») qu'un morceau quelconque
 * satisfaisait ; il enchaîne désormais trois envois du MÊME jingle, une couche
 * à la fois — la mélodie, puis la basse, puis la nappe et les textures.
 *
 * Ce que ces contraintes-là ont de particulier : elles sont RELATIONNELLES.
 * « La basse tient » n'a pas de sens toute seule — elle se mesure contre la
 * mélodie qui est déjà là. C'est ce qui protège les couches précédentes sans
 * avoir à interdire d'y toucher : un envoi qui détruirait la mélodie ne
 * pourrait plus satisfaire la basse qu'on lui demande.
 * ------------------------------------------------------------------------- */

/** Les notes réellement jouées par une ligne mélodique (basse ou mélodie). */
function notesDe(e: PatternStateV2, ligne: 'bass' | 'melody'): SynthNote[] {
  const r = e.synthRows[ligne];
  if (r.muted) return [];
  return r.pattern
    .slice(0, r.subdivisions)
    .filter(
      (v): v is SynthNote =>
        v !== null && typeof v === 'object' && typeof v.degree === 'number' && v.degree > 0,
    );
}

/** Combien la ligne joue de notes PAR MESURE — une ligne peut boucler sur
 *  plusieurs mesures, comparer des totaux bruts comparerait des durées. */
function parMesure(e: PatternStateV2, ligne: 'bass' | 'melody'): number {
  return notesDe(e, ligne).length / Math.max(1, e.synthRows[ligne].cycleBars);
}

/* Une PHRASE, pas une note répétée.
 *
 * Le premier envoi ne demande qu'une mélodie : sans seuil, une seule case
 * allumée la satisferait, et `ligneSynthPresente` fait déjà ça. Ce qu'on veut
 * ici est ce que les niveaux 42-44 viennent d'enseigner — plusieurs notes, et
 * plusieurs HAUTEURS différentes : une même note répétée quatre fois est un
 * rythme, pas une mélodie. */
export function unePhrase(
  ligne: 'bass' | 'melody',
  notesMin: number,
  hauteursMin: number,
  libelle: string,
): Contrainte {
  return {
    id: `phrase:${ligne}`,
    libelle,
    verifie: (e) => {
      const n = notesDe(e, ligne);
      const hauteurs = new Set(n.map((x) => `${x.degree}/${x.octave}`));
      return n.length >= notesMin && hauteurs.size >= hauteursMin;
    },
  };
}

/* Elle se REPOSE : la dernière note est la tonique.
 *
 * ⚠️ C'est le seul jugement musical de l'acte, et il est repris mot pour mot du
 * préambule du niveau 44 (« c'est le degré 1, et c'est là que la phrase se
 * repose »). Une commande n'enseigne rien de neuf : elle exige ce qu'un écran
 * a déjà expliqué. Le degré s'affiche en clair dans la case de l'Atelier, donc
 * la ligne se vérifie à l'œil autant qu'à l'oreille. */
export function seReposeSurLaTonique(ligne: 'bass' | 'melody', libelle: string): Contrainte {
  return {
    id: `tonique:${ligne}`,
    libelle,
    verifie: (e) => {
      const n = notesDe(e, ligne);
      return n.length > 0 && n[n.length - 1].degree === 1;
    },
  };
}

/** La ligne pose le PREMIER pas — le repère sur lequel tout le reste se cale. */
export function poseLePremierTemps(ligne: 'bass' | 'melody', libelle: string): Contrainte {
  return {
    id: `premier-temps:${ligne}`,
    libelle,
    verifie: (e) => {
      const r = e.synthRows[ligne];
      const v = r.pattern[0];
      return !r.muted && v !== null && typeof v === 'object' && v.degree > 0;
    },
  };
}

/* La basse TIENT — elle ne court pas après la mélodie.
 *
 * ⚠️ Relationnelle, et c'est le point : elle exige que la mélodie soit encore
 * là (sinon « moins que la mélodie » se satisfait de zéro contre zéro) et que
 * la basse joue vraiment. Un envoi qui effacerait la couche précédente ne
 * pourrait donc pas passer, sans qu'on ait eu besoin d'interdire quoi que ce
 * soit. */
export function basseQuiTient(libelle: string): Contrainte {
  return {
    id: 'basse-tient',
    libelle,
    verifie: (e) => {
      const basse = parMesure(e, 'bass');
      const melodie = parMesure(e, 'melody');
      return basse > 0 && melodie > 0 && basse < melodie;
    },
  };
}

/* La nappe ne reste pas un BLOC.
 *
 * Trois façons de la faire bouger, toutes à un clic dans la ligne Nappe :
 * l'arpège (elle égrène l'accord), le bourdon (elle tient une seule note
 * longue) et l'étalement (les notes de l'accord arrivent l'une après l'autre).
 * On en demande une, pas une en particulier — un cahier qui nommerait le
 * bouton serait `nommer` déguisé en commande. */
/* ---------------------------------------------------------------------------
 * L'HARMONIE — le vocabulaire que l'Atelier affiche et que le jeu n'exigeait
 * nulle part.
 *
 * ⚠️ Relecture de Yann (2026-09-04) sur la commande « CLUB ÉNERGIE » : *« il
 * faut intégrer un cahier des charges pour le synthé adapté à la difficulté du
 * niveau dans l'acte. Pourquoi pas travailler sur l'harmonie ? »*
 *
 * Tout était déjà là et n'avait jamais servi : `presets/scales.ts` construit
 * les triades diatoniques de la gamme choisie, et l'Atelier les nomme en
 * chiffres romains sur les cases de la nappe comme sur son clavier
 * (`SynthRowView`, `NotePad`). Le mot est donc à l'écran avant d'être exigé —
 * la règle du fichier.
 *
 * ⚠️ Une case de nappe porte un INDEX d'accord, jamais un degré : l'accord `0`
 * est le I, le `1` est le IV, le `2` le V, le `3` le vi (`CHORD_PRIORITY_ORDER`
 * — l'ordre pop, pas l'ordre de la gamme). Lire l'index comme un degré
 * demanderait au joueur une basse en II sous un accord de IV : la question
 * serait fausse, et elle serait fausse en silence.
 * ------------------------------------------------------------------------- */

/** Les index d'accords réellement posés par la nappe, dans l'ordre. */
function accordsDe(e: PatternStateV2): number[] {
  const r = e.synthRows.pad;
  if (r.muted) return [];
  return r.pattern
    .slice(0, r.subdivisions)
    .filter((v): v is number => typeof v === 'number' && v >= 0);
}

/** Le degré de la gamme sur lequel se construit l'accord d'index `i`. */
function degreDeLAccord(i: number): number {
  return CHORD_PRIORITY_ORDER[i] ?? 1;
}

function romanDeLAccord(e: PatternStateV2, i: number): string {
  const chords = buildChordsForScale(
    currentScale(e.synthGlobal.scaleId),
    e.synthGlobal.rootMidi,
    e.synthGlobal.chordCount,
  );
  return chords[i]?.roman ?? '?';
}

/* Une PROGRESSION, pas un accord tenu.
 *
 * `nappeQuiRespire` demande que la nappe BOUGE (arpège, bourdon, étalement) —
 * c'est une texture. Ici on demande qu'elle CHANGE d'accord : deux choses
 * différentes, et c'est la seconde qui fait une harmonie. Un seul accord
 * répété est une pédale ; le jeu n'a rien contre, mais ce n'est pas ce que le
 * client demande. */
export function uneProgression(combien: number, libelle: string): Contrainte {
  return {
    id: `progression-${combien}`,
    libelle,
    verifie: (e) => new Set(accordsDe(e)).size >= combien,
  };
}

/* La basse DIT l'accord.
 *
 * ⚠️ Relationnelle, comme toute l'écriture de l'acte 3 : elle exige que la
 * nappe soit encore là (sinon « la basse suit les accords » se satisfait de
 * zéro accord) et que la basse joue la FONDAMENTALE de chacun d'eux quelque
 * part dans la boucle. C'est la leçon d'harmonie la plus courte qui existe, et
 * la seule qu'on puisse vérifier sans juger un goût : sous un IV, une basse en
 * I n'est pas une couleur, c'est un accroc.
 *
 * On ne demande PAS qu'elle tombe en même temps que l'accord : la nappe et la
 * basse n'ont pas la même subdivision ni le même nombre de mesures, et exiger
 * une coïncidence de pas ferait échouer une basse juste pour une raison de
 * grille. */
export function laBasseDitLAccord(libelle: string): Contrainte {
  const manquants = (e: PatternStateV2): number[] => {
    const accords = [...new Set(accordsDe(e))];
    if (accords.length === 0) return [];
    const degres = new Set(notesDe(e, 'bass').map((n) => n.degree));
    return accords.filter((i) => !degres.has(degreDeLAccord(i)));
  };
  return {
    id: 'basse-accord',
    libelle,
    verifie: (e) => {
      const accords = new Set(accordsDe(e));
      return accords.size > 0 && notesDe(e, 'bass').length > 0 && manquants(e).length === 0;
    },
    /* Le détail nomme les accords que la basse ne dit pas — « ta basse ne suit
     * pas » sans dire lequel n'est pas un retour, c'est un refus. */
    details: (e) => {
      const accords = [...new Set(accordsDe(e))];
      const absents = manquants(e);
      return accords.map((i) => ({
        id: `accord-${i}`,
        libelle: romanDeLAccord(e, i),
        ok: !absents.includes(i),
      }));
    },
  };
}

export function nappeQuiRespire(libelle: string): Contrainte {
  return {
    id: 'nappe-respire',
    libelle,
    verifie: (e) => {
      const r = e.synthRows.pad;
      const accords = r.pattern
        .slice(0, r.subdivisions)
        .some((v) => typeof v === 'number' && v >= 0);
      if (r.muted || !accords) return false;
      return e.synthGlobal.padArpEnabled || e.synthGlobal.padDroneEnabled || (r.strum ?? 0) > 0;
    },
  };
}

/* Chaque ligne citée a une VOIX choisie — pas celle d'usine.
 *
 * ⚠️ « Une note n'est pas un son » : c'est la leçon de texture de l'acte, et
 * elle se mesure en comparant la voix de la ligne aux presets de
 * `presets/voices.ts`. Trois cas, pas deux — un preset (choisi), aucun preset
 * (les curseurs ont écarté la voix, donc touchée aussi), ou `default`, le seul
 * qui ne compte pas. Le détail nomme les lignes restées d'usine : un refus qui
 * ne dit pas laquelle n'est pas un retour. */
export function voixChoisie(lignes: SynthRowName[], libelle: string): Contrainte {
  const choisie = (e: PatternStateV2, l: SynthRowName) =>
    matchVoicePreset(l, e.synthRows[l].voice as Record<string, unknown>) !== 'default';
  return {
    id: `voix:${lignes.join('+')}`,
    libelle,
    verifie: (e) => lignes.every((l) => choisie(e, l)),
    /* ⚠️ Le détail n'existe QUE s'il y a plusieurs lignes à distinguer : sur
     * une seule, il répète le libellé sous le libellé (mesuré à l'écran —
     * « ☐ Choisis-lui une voix » suivi de « · basse »). Un retour qui ne dit
     * rien de plus que la ligne au-dessus est du bruit. */
    details:
      lignes.length > 1
        ? (e) => lignes.map((l) => ({ id: `voix-${l}`, libelle: NOM_MIX[l], ok: choisie(e, l) }))
        : undefined,
  };
}

/* Le GLIDE — la note glisse jusqu'à la suivante au lieu de la remplacer.
 *
 * Le portamento est la texture qui s'entend le mieux sur une basse, et c'est
 * un curseur à zéro par défaut : la ligne ne peut pas se cocher toute seule. */
export function duGlide(ligne: SynthRowName, min: number, libelle: string): Contrainte {
  return {
    id: `glide:${ligne}`,
    libelle,
    verifie: (e) => !e.synthRows[ligne].muted && e.synthRows[ligne].glide >= min,
  };
}

/* ---------------------------------------------------------------------------
 * LE GROOVE DANS LE MORCEAU LIVRÉ — l'acte 2 refait
 *
 * ⚠️ Retour de Yann (relecture complète, 2026-09-01) : l'acte du groove
 * enseignait le balancement, le décalage et l'aléa par des QUIZ, et sa commande
 * n'en demandait aucun. On pouvait donc traverser l'acte du groove et livrer
 * une boucle carrée — « ça fait réveil », exactement ce que Kelvin refuse au
 * premier écran. Ces deux contraintes-là font passer la leçon dans le cahier.
 * ------------------------------------------------------------------------- */

/* Une ligne GLISSE contre les autres — et il en faut une qui ne glisse pas.
 *
 * ⚠️ La seconde moitié n'est pas un raffinement : un décalage ne s'entend que
 * CONTRE un point fixe (c'est déjà la raison pour laquelle la traîne, globale,
 * est hors du catalogue de `parametres.ts` et n'a jamais fait un exercice).
 * Tout décaler du même montant ne s'entend contre rien ; une contrainte qui
 * l'accepterait enseignerait le contraire de l'acte. */
export function uneLigneQuiGlisse(min: number, libelle: string): Contrainte {
  return {
    id: 'ligne-glisse',
    libelle,
    verifie: (e) => {
      const vivantes = LIGNES_MIX.filter((l) => ligneVivante(e, l));
      return (
        vivantes.some((l) => Math.abs(e.rows[l].shiftPct) >= min) &&
        vivantes.some((l) => Math.abs(e.rows[l].shiftPct) < min)
      );
    },
  };
}

/* Les trois boutons qui jouent tout seuls, et leur seuil MESURÉ.
 *
 * ⚠️ Les valeurs viennent du rejeu du scheduler (même harnais que
 * `tests/params-alea.test.ts`, 40 graines, deux mesures), pas d'un avis : au
 * seuil, `ghostDensity` double la dispersion des gains (0,048 → 0,101),
 * `spontRoll` ajoute 16 % d'événements, `randomVelocity` — qui n'ajoute jamais
 * un coup, par construction — atteint une dispersion de 0,063, du même ordre.
 * Trois échelles différentes, donc trois nombres différents : un seuil unique
 * aurait voulu dire trois choses (`serialize.ts` clamp 0-40 le premier, 0-100
 * les deux autres). */
export const ALEA_MINI = { ghostDensity: 8, randomVelocity: 40, spontRoll: 10 };

/* ⚠️ Un bouton d'aléa ne compte que si SA ligne sonne. `spontRoll` n'est
 * consulté que dans la voie du charley et `ghostDensity` que sur la ligne des
 * ghost notes (`ghostRow`, la claire par défaut) — les compter sur un morceau
 * qui n'a pas cette ligne cocherait une case pour quelque chose d'inaudible,
 * ce que le cahier interdit. */
export function deLAlea(libelle: string): Contrainte {
  const engage = (e: PatternStateV2) => ({
    ghostDensity:
      e.ghostDensity >= ALEA_MINI.ghostDensity && ligneVivante(e, e.ghostRow ?? 'snare'),
    randomVelocity:
      e.randomVelocity >= ALEA_MINI.randomVelocity && LIGNES_MIX.some((l) => ligneVivante(e, l)),
    spontRoll: e.spontRoll >= ALEA_MINI.spontRoll && ligneVivante(e, 'hat'),
  });
  const NOMS: Record<keyof ReturnType<typeof engage>, string> = {
    ghostDensity: 'ghost notes',
    randomVelocity: 'vélocité aléatoire',
    spontRoll: 'rafales spontanées',
  };
  return {
    id: 'alea',
    libelle,
    verifie: (e) => Object.values(engage(e)).some(Boolean),
    /* Le détail liste les trois boutons plutôt qu'un seul : on en demande UN,
     * et dire lequel serait choisir à la place du joueur. */
    details: (e) => {
      const etat = engage(e);
      return (Object.keys(NOMS) as Array<keyof typeof NOMS>).map((k) => ({
        id: `alea-${k}`,
        libelle: NOMS[k],
        ok: etat[k],
      }));
    },
  };
}
