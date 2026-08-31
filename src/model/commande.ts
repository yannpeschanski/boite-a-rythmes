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
import type { PatternStateV2, DrumRowName, SynthRowName } from './types';
import { evaluerStyle, type FicheStyle } from './styles';
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
  details?: (etat: PatternStateV2) => Array<{ id: string; libelle: string; ok: boolean }>;
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

export function tempoEntre(min: number, max: number, libelle: string): Contrainte {
  return { id: 'tempo', libelle, verifie: (e) => e.tempo >= min && e.tempo <= max };
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
