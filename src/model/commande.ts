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
import { rankPresets } from '../engine/similarity';
import { PRESETS } from './presets/songs';

export interface Contrainte {
  /** Identifiant stable — sert aux tests et aux clés d'affichage. */
  id: string;
  /** La demande du client, en une ligne, affichée comme une case à cocher.
   *  Écrite du point de vue de CE QU'IL VEUT, jamais du champ qu'on lit. */
  libelle: string;
  /** Vrai si le morceau livré satisfait la demande. */
  verifie: (etat: PatternStateV2) => boolean;
}

/** Le verdict d'une livraison : une case par ligne du cahier, et le total. */
export interface Verdict {
  lignes: Array<{ contrainte: Contrainte; ok: boolean }>;
  accepte: boolean;
}

export function evaluerCommande(etat: PatternStateV2, cahier: Contrainte[]): Verdict {
  const lignes = cahier.map((c) => ({ contrainte: c, ok: c.verifie(etat) }));
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

/* ⚠️ « Dans le style de », et c'est la contrainte qui a demandé une mesure.
 *
 * `rankPresets` compare les CASES IDENTIQUES entre le morceau et chacun des 34
 * presets, en testant les six permutations de lignes. Deux enseignements du
 * banc d'essai, tous deux dimensionnants :
 *
 *   - un morceau modifié reste reconnaissable : quatre cases de charleston
 *     inversées laissent son preset d'origine au rang 1 ou 2 (mesuré sur boom
 *     bap, house, Motown et jungle). Un rang ≤ 3 dit donc « dans le style »
 *     sans exiger « à l'identique » — c'est exactement ce qu'on veut d'une
 *     commande ;
 *   - le SCORE, lui, ne veut rien dire seul : il compte les cases identiques,
 *     y compris les cases vides. C'est pour ça qu'on regarde un RANG et pas un
 *     pourcentage.
 */
export const RANG_STYLE_MAX = 3;

export function dansLeStyle(presetId: string, libelle?: string): Contrainte {
  const p = PRESETS.find((x) => x.id === presetId);
  return {
    id: `style:${presetId}`,
    libelle: libelle ?? `Ça doit sonner ${p?.label ?? presetId}`,
    verifie: (e) => {
      const rang = rankPresets(e).findIndex((m) => m.preset.id === presetId);
      return rang >= 0 && rang < RANG_STYLE_MAX;
    },
  };
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
