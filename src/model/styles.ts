/* Les FICHES DE STYLE — ce qui fait qu'un morceau appartient à un genre.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * L'acte 5 demandait de RECONNAÎTRE un genre (le verbe `style`), puis de le
 * livrer via une contrainte `dansLeStyle` qui regardait un RANG dans
 * `rankPresets`. Trois défauts, tous mesurés :
 *
 *   - charger le preset depuis le menu et livrer suffisait à valider. La
 *     commande ne demandait donc aucune production ;
 *   - le rang ne dit rien au joueur. « Ça ne sonne pas assez dancehall » n'est
 *     pas un retour : on ne sait pas quoi changer ;
 *   - `rankPresets` ne compare que kick/snare/hat. Une ligne de basse, qui est
 *     la moitié d'un riddim, lui est invisible.
 *
 * ⚠️ ET LE POURCENTAGE. Retour de Yann : *« on doit pouvoir accepter une
 * certaine tolérance, par exemple 80 % de tel style »*. Ce pourcentage NE PEUT
 * PAS être le score de `rankPresets` — celui-ci compte les cases identiques,
 * cases vides comprises, donc 70 % peut vouloir dire « deux grilles également
 * vides ». La règle de CLAUDE.md (« un style se juge sur un rang, jamais sur
 * un score ») reste vraie DE CE SCORE-LÀ. Ce qu'on mesure ici est autre chose :
 * une part de CRITÈRES satisfaits. « 4 critères sur 5 » veut dire quelque
 * chose, et se dit au joueur.
 *
 * Une fiche sert TROIS choses à la fois, et c'est délibéré — les écrire
 * séparément, ce serait deux vérités qui divergent au premier ajustement :
 *
 *   1. la DESCRIPTION lue avant de commencer (le chapeau + les libellés) ;
 *   2. la VALIDATION de la livraison (la part de critères, contre le seuil) ;
 *   3. le RETOUR pendant le travail (quelles cases sont cochées, lesquelles
 *      non), qui se met à jour en direct comme le reste du cahier.
 *
 * Module PUR : ni rune, ni DOM, ni audio. Il ne lit qu'un `PatternStateV2`.
 */
import type { PatternStateV2, DrumRowName, SynthRowName } from './types';
import type { Contrainte } from './commande';

/* Un critère est une contrainte de cahier des charges — même forme, parce que
 * c'est la même chose vue de plus près : une demande vérifiable, écrite du
 * point de vue de ce qu'on veut entendre. Il gagne un seul champ. */
export interface CritereStyle extends Contrainte {
  /* ⚠️ Le seuil laisse de la place — mais jamais sur ce qui DÉFINIT le genre.
   *
   * Sans ce champ, un seuil à 80 % sur cinq critères accepterait un morceau
   * qui rate précisément celui qui donne son nom au riddim : un « dancehall
   * steppers » sans kick sur chaque temps n'est pas un dancehall à 80 %, c'est
   * autre chose. Un critère essentiel est exigé quel que soit le total.
   *
   * À réserver à ce SANS QUOI le genre n'en est plus un : le riddim qui le
   * nomme, et l'instrument sans lequel il n'existe pas. Au-delà de deux dans
   * une fiche de six, le seuil ne veut plus rien dire — c'est la limite, pas
   * un objectif. */
  essentiel?: boolean;
}

export interface FicheStyle {
  /** Même identifiant que le preset du genre : la fiche le DÉCRIT. */
  id: string;
  label: string;
  /** Deux ou trois lignes qui situent le genre, lues avant de commencer.
   *  Le vocabulaire est celui du preset (« steppers », « skank »), pour que
   *  l'onglet Production et la commande ne racontent pas deux histoires. */
  chapeau: string[];
  criteres: CritereStyle[];
  /* Part des critères à satisfaire, RÉGLABLE PAR FICHE et pas une constante
   * globale : un genre très typé (dembow) tolère moins d'écart qu'un genre
   * large (house). 0.8 est le défaut proposé par Yann. */
  seuil: number;
}

// ---------- Lire une grille en TEMPS, pas en cases ----------

/* `subdiv` est un nombre de pas par MESURE, et une mesure fait quatre temps.
 * Un critère doit valoir quelle que soit la subdivision choisie par le joueur :
 * « sur chaque temps » se dit [0,1,2,3] en subdiv 4, [0,2,4,6] en subdiv 8 et
 * [0,4,8,12] en subdiv 16. D'où ce passage par le temps plutôt que par
 * l'index — sans lui, chaque critère devrait être écrit trois fois. */
function pasDuTemps(subdiv: number, temps: number): number | null {
  const i = (temps * subdiv) / 4;
  return Number.isInteger(i) && i >= 0 && i < subdiv ? i : null;
}

/** La ligne frappe-t-elle à ce temps ? `variante` exige en plus le second état
 *  de la case (rim shot sur la caisse claire, charley ouvert sur le hat). */
function frappeAu(
  etat: PatternStateV2,
  ligne: DrumRowName,
  temps: number,
  variante = false,
): boolean {
  const r = etat.rows[ligne];
  if (r.muted) return false;
  const i = pasDuTemps(r.subdiv, temps);
  if (i === null) return false;
  const v = r.pattern[i] as number;
  return variante ? v === 2 : v > 0;
}

// ---------- Les primitives d'écriture d'une fiche ----------

/** Frappé sur TOUS les temps listés (0 = le premier temps de la mesure). */
export function surLesTemps(
  id: string,
  lignes: DrumRowName[],
  temps: number[],
  libelle: string,
  opts: { variante?: boolean; essentiel?: boolean } = {},
): CritereStyle {
  return {
    id,
    libelle,
    essentiel: opts.essentiel,
    // Une seule des lignes proposées suffit : le « pop » de 2 et 4 se joue à
    // la caisse claire ou au clap selon les genres, et exiger la ligne exacte
    // ferait échouer un morceau qui sonne juste.
    verifie: (e) => temps.every((t) => lignes.some((l) => frappeAu(e, l, t, opts.variante))),
  };
}

/** Les quatre contretemps d'une mesure — le « et » de un-et-deux-et. */
export const CONTRETEMPS = [0.5, 1.5, 2.5, 3.5];

export function tempoEntre(min: number, max: number, libelle: string): CritereStyle {
  return { id: 'tempo', libelle, verifie: (e) => e.tempo >= min && e.tempo <= max };
}

export function synthQuiJoue(
  ligne: SynthRowName,
  libelle: string,
  opts: { essentiel?: boolean } = {},
): CritereStyle {
  return {
    id: `synth:${ligne}`,
    libelle,
    essentiel: opts.essentiel,
    verifie: (e) => {
      const r = e.synthRows[ligne];
      return !r.muted && r.pattern.slice(0, r.subdivisions).some((n) => n !== null && n !== -1);
    },
  };
}

// ---------- L'évaluation ----------

export interface VerdictStyle {
  lignes: Array<{ critere: CritereStyle; ok: boolean }>;
  /** Critères satisfaits sur critères totaux, entre 0 et 1. */
  part: number;
  /** Ce qu'on affiche : « 4/5 ». */
  faits: number;
  total: number;
  /** Un essentiel manque — le seuil ne peut pas le rattraper. */
  essentielManquant: CritereStyle | null;
  atteint: boolean;
}

export function evaluerStyle(etat: PatternStateV2, fiche: FicheStyle): VerdictStyle {
  const lignes = fiche.criteres.map((critere) => ({ critere, ok: critere.verifie(etat) }));
  const faits = lignes.filter((l) => l.ok).length;
  const total = lignes.length;
  const part = total === 0 ? 1 : faits / total;
  const essentielManquant = lignes.find((l) => !l.ok && l.critere.essentiel)?.critere ?? null;
  return {
    lignes,
    part,
    faits,
    total,
    essentielManquant,
    atteint: part >= fiche.seuil && essentielManquant === null,
  };
}

// ---------- Le catalogue ----------

/* DANCEHALL (steppers) — la première fiche écrite, et le modèle des suivantes.
 *
 * Les critères sont RELEVÉS sur le preset `dancehall` (presets/songs.ts), pas
 * imaginés : kick subdiv 4 sur [0,1,2,3] — le riddim « steppers » ; caisse
 * claire subdiv 8 en valeur 2 (rim shot) sur les pas 2 et 6, c'est-à-dire les
 * temps 2 et 4 ; charley subdiv 8 en valeur 2 (ouvert) sur [1,3,5,7], les
 * contretemps — le « skank » ; tempo 96 ; et une basse, sans laquelle il n'y a
 * pas de riddim.
 *
 * Le placement et le timbre sont deux critères SÉPARÉS (« sur les temps 2 et
 * 4 » / « en rim shot ») alors qu'ils décrivent la même frappe : réunis, le
 * joueur qui a bien placé mais frappé normalement perdrait tout et ne saurait
 * pas laquelle des deux moitiés est en cause. Séparés, il lit exactement ce
 * qui lui manque.
 */
const DANCEHALL: FicheStyle = {
  id: 'dancehall',
  label: 'Dancehall (steppers)',
  chapeau: [
    'Riddim jamaïcain, années 80. Le kick marque CHAQUE temps —',
    'c’est ce qu’on appelle « steppers », et c’est ce qui le nomme.',
    'Par-dessus : un « pop » sec sur 2 et 4, et le skank au charley',
    'ouvert sur les contretemps. Une basse tient le tout.',
  ],
  seuil: 0.8,
  criteres: [
    surLesTemps('kick-steppers', ['kick'], [0, 1, 2, 3], 'Le kick sur chaque temps', {
      essentiel: true,
    }),
    surLesTemps('pop-24', ['snare', 'clap'], [1, 3], 'Un « pop » sur les temps 2 et 4'),
    surLesTemps('rimshot', ['snare'], [1, 3], 'Ce pop-là est sec — en rim shot', { variante: true }),
    surLesTemps('skank', ['hat'], CONTRETEMPS, 'Le skank : charley OUVERT sur les contretemps', {
      variante: true,
    }),
    tempoEntre(88, 104, 'Entre 88 et 104 — le tempo du riddim'),
    /* Essentiel, et c'est une demande de Yann autant qu'une vérité du genre :
     * *« il faut qu'il y ait du synthé dessus aussi »*. Laissée facultative,
     * elle se serait fait sauter par la tolérance une fois sur deux — un
     * riddim sans basse n'est pas un riddim à 83 %. */
    synthQuiJoue('bass', 'Une basse qui joue', { essentiel: true }),
  ],
};

export const FICHES: FicheStyle[] = [DANCEHALL];

export function ficheStyle(id: string): FicheStyle | null {
  return FICHES.find((f) => f.id === id) ?? null;
}
