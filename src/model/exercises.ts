/* Les types d'exercices du Mode jeu, et la comparaison qui les départage.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Les 34 niveaux font varier les PARAMÈTRES (subdivision, swing, traîne,
 * polyrythmie) mais jamais la TÂCHE : le seul verbe est « reproduire », et
 * `verify()` était une comparaison case à case câblée en dur dans le store.
 * Ajouter un second exercice sans charpente aurait donné un `if` de plus dans
 * la vue, puis un troisième, puis un quatrième.
 *
 * Ici vivent : le discriminant, et la partie PURE de la vérification — celle
 * qui ne touche ni au store, ni au DOM, ni à l'audio, et qu'on peut donc
 * tester sans navigateur.
 *
 * ⚠️ Ne pas confondre avec `LevelDef.kind` de `model/types.ts`, qui décrivait
 * la SOURCE d'un niveau (grille générée ou pattern d'un morceau réel) et non
 * la tâche demandée. Ce champ-là était mort — déclaré, jamais lu — il a été
 * retiré en même temps que ce fichier était écrit, pour qu'il ne serve pas de
 * faux ami au prochain qui cherchera un discriminant.
 */
import type { DrumStep } from './types';
import type { GameDrumRowName } from './presets/levels';

/* Les quatre verbes.
 *
 * - `reproduire` : écouter la boucle, reposer la grille à l'identique. Le seul
 *   qui existait, et le défaut de tous les niveaux déjà écrits.
 * - `completer`  : la grille est donnée sauf un temps, à remplir. Même geste,
 *   mais l'oreille travaille sur un contexte au lieu du vide.
 * - `intrus`     : quatre mesures jouées, une seule diffère — laquelle ? Aucune
 *   grille à manipuler : c'est l'oreille seule.
 * - `jouer`      : taper en rythme sur la boucle, noté sur le placement. Le
 *   seul qui teste le geste plutôt que l'analyse.
 */
export type ExerciseKind = 'reproduire' | 'completer' | 'intrus' | 'jouer';

export const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  reproduire: 'Reproduis la boucle',
  completer: 'Complète le temps manquant',
  intrus: 'Trouve l’intrus',
  jouer: 'Joue en rythme',
};

export type Grille = Record<GameDrumRowName, DrumStep[]>;
export type Rafales = Record<GameDrumRowName, number[]>;

export interface ResultatComparaison {
  /** Vrai si chaque case comparée est exacte. */
  exact: boolean;
  /** Les cases exactes ET actives, à verrouiller côté store. */
  aVerrouiller: Array<{ row: GameDrumRowName; col: number }>;
}

/* Compare la proposition à la cible, case à case.
 *
 * Une case est exacte si son état ET sa rafale coïncident — c'est la règle
 * d'origine, conservée telle quelle.
 *
 * `colonnes` restreint la comparaison à un sous-ensemble de colonnes par
 * ligne : c'est ce qui permet à « compléter » de réutiliser exactement la
 * même vérification que « reproduire », en ne notant que le temps à remplir.
 * Sans ce paramètre, il aurait fallu un second comparateur presque identique —
 * et deux comparateurs qui doivent rester d'accord finissent toujours par ne
 * plus l'être.
 */
export function comparerGrilles(
  cible: Grille,
  cibleRafales: Rafales,
  proposition: Grille,
  propositionRafales: Rafales,
  lignes: GameDrumRowName[],
  colonnes?: Partial<Record<GameDrumRowName, number[]>>,
): ResultatComparaison {
  let exact = true;
  const aVerrouiller: Array<{ row: GameDrumRowName; col: number }> = [];
  for (const row of lignes) {
    const indices = colonnes?.[row] ?? cible[row].map((_, i) => i);
    for (const col of indices) {
      const t = cible[row][col];
      const juste = proposition[row][col] === t && propositionRafales[row][col] === cibleRafales[row][col];
      if (juste && t > 0) aVerrouiller.push({ row, col });
      if (!juste) exact = false;
    }
  }
  return { exact, aVerrouiller };
}

/* Les colonnes d'UNE tranche d'une ligne, la ligne étant coupée en `tranches`
 * parts égales.
 *
 * Générique à dessein, et NOMMÉ générique : « compléter » coupe la boucle en
 * quatre TEMPS (le Mode jeu tient sur une mesure par ligne — un quart de boucle
 * est un temps, pas une mesure), tandis que « l'intrus » raisonne, lui, sur de
 * vraies mesures mises bout à bout. Une fonction appelée `colonnesDeMesure`
 * aurait menti à l'un des deux appelants.
 *
 * Chaque ligne a sa propre subdivision (c'est tout l'objet des niveaux de
 * polyrythmie : 4 contre 6). Le nombre de colonnes d'une tranche n'est donc pas
 * le même d'une ligne à l'autre, et couper au même index partout couperait au
 * mauvais endroit.
 */
export function colonnesDeTranche(subdiv: number, tranche: number, tranches: number): number[] {
  const parTranche = Math.max(1, Math.round(subdiv / Math.max(1, tranches)));
  const debut = Math.min(subdiv - 1, tranche * parTranche);
  const fin = Math.min(subdiv, debut + parTranche);
  const out: number[] = [];
  for (let i = debut; i < fin; i++) out.push(i);
  return out;
}

/* ---- « Jouer en rythme » : la notation, extraite et pure ----
 *
 * Elle vit ici et pas dans le store pour la même raison que `comparerGrilles` :
 * c'est de l'arithmétique, elle se teste sans navigateur, sans Web Audio et
 * sans runes. Le store n'en garde que le branchement.
 */

/* Tolérance de placement, en millisecondes.
 *
 * Les seuils portent sur ce qui S'ENTEND : au-delà d'environ 120 ms une frappe
 * cesse d'être perçue comme « sur le temps » et s'entend comme une faute ; en
 * dessous de ~40 ms, personne ne distingue l'écart — exiger mieux noterait la
 * chance, pas l'oreille.
 *
 * ⚠️ Élargis (25/90 → 40/130) après essai réel. La raison n'est pas d'être
 * gentil, c'est que la chaîne d'entrée d'un écran tactile ajoute ses propres
 * dizaines de millisecondes AVANT que le geste n'arrive au code — un joueur
 * parfaitement en place peut être mesuré systématiquement en retard. Deux
 * réponses, toutes deux nécessaires : mesurer sur l'horloge AUDIO et corriger
 * le délai de remontée de l'événement (voir GameView), et laisser une marge
 * qui absorbe le reste. `medianeDesEcarts` sert à voir lequel des deux
 * problèmes on regarde : un biais franc et constant, c'est de la latence, pas
 * de l'imprécision. */
export const TOLERANCE_MS = 130;
export const PARFAIT_MS = 40;

/* Écart signé au coup le plus proche.
 *
 * `ecoule` est le temps depuis le DERNIER coup joué, `intervalle` celui qui
 * sépare ce coup du suivant. Au-delà de la moitié, la frappe n'est plus en
 * retard sur le précédent : elle est en avance sur le suivant, et l'écart
 * devient négatif.
 *
 * L'intervalle est celui de coup à coup, jamais la durée d'un pas : sur une
 * boucle de 8 pas qui porte 3 kicks, cinq pas sur huit sont silencieux, et
 * mesurer contre la grille donnerait 100 % à une frappe posée sur un silence.
 */
export function ecartAuCoup(ecoule: number, intervalle: number): number {
  return ecoule > intervalle / 2 ? ecoule - intervalle : ecoule;
}

/** Note d'une frappe : 100 sous le seuil d'indiscernable, 0 au-delà de la
 *  tolérance, décroissance linéaire entre les deux. */
function noteDUneFrappe(ecartMs: number): number {
  const a = Math.abs(ecartMs);
  if (a <= PARFAIT_MS) return 100;
  if (a >= TOLERANCE_MS) return 0;
  return 100 * (1 - (a - PARFAIT_MS) / (TOLERANCE_MS - PARFAIT_MS));
}

/* Justesse 0-100 : la MEILLEURE mesure jouée, pas la moyenne de tout.
 *
 * ⚠️ Changement délibéré de règle (2026-08-21, « les niveaux 37 et 38 sont tj
 * trop compliqués »). La version précédente moyennait TOUTES les frappes du
 * tour, divisées par le plus grand du nombre attendu et du nombre joué. La
 * boucle tournant en rond, les tâtonnements des premières mesures plombaient la
 * note définitivement : on ne pouvait jamais « réussir une mesure », seulement
 * diluer ses erreurs — et plus on jouait, plus c'était dur. C'était la vraie
 * raison de la difficulté, bien avant les seuils.
 *
 * On note donc la meilleure fenêtre de `attendues` frappes CONSÉCUTIVES : une
 * mesure propre suffit, ce qui est exactement ce qu'un joueur cherche à faire.
 *
 * Consécutives, et pas « les meilleures » : prendre les meilleures où qu'elles
 * soient récompenserait le martèlement, puisqu'il suffirait d'en tirer quelques
 * bonnes au hasard. Une fenêtre consécutive propre, elle, s'obtient en jouant
 * en place.
 *
 * Tant qu'il n'y a pas assez de frappes, le diviseur reste le nombre ATTENDU :
 * frapper une seule fois très juste ne donne pas 100 %.
 */
export function justesseDesFrappes(ecarts: number[], attendues: number): number {
  if (attendues <= 0) return 0;
  const notes = ecarts.map(noteDUneFrappe);
  if (notes.length < attendues) {
    // Les frappes manquantes comptent comme nulles.
    return Math.round(notes.reduce((a, b) => a + b, 0) / attendues);
  }
  let meilleure = 0;
  let courante = notes.slice(0, attendues).reduce((a, b) => a + b, 0);
  meilleure = courante;
  for (let i = attendues; i < notes.length; i++) {
    courante += notes[i] - notes[i - attendues];
    if (courante > meilleure) meilleure = courante;
  }
  return Math.round(meilleure / attendues);
}

/* Écart MÉDIAN signé d'une série de frappes.
 *
 * Le diagnostic que la justesse seule ne donne pas : elle prend la valeur
 * absolue, donc « tout le monde en retard de 60 ms » et « la moitié en avance,
 * l'autre en retard » lui donnent la même note. La médiane signée les sépare.
 * Un biais franc et constant se lit comme de la latence (chaîne d'entrée,
 * casque Bluetooth) et non comme un défaut de placement — et on ne corrige pas
 * la même chose.
 *
 * Médiane et non moyenne : une frappe complètement à côté ne doit pas déplacer
 * le diagnostic de toutes les autres.
 */
export function medianeDesEcarts(ecarts: number[]): number {
  if (ecarts.length === 0) return 0;
  const tri = [...ecarts].sort((a, b) => a - b);
  const m = Math.floor(tri.length / 2);
  return Math.round(tri.length % 2 ? tri[m] : (tri[m - 1] + tri[m]) / 2);
}

/* Écart signé d'une frappe au clic le plus proche d'un métronome régulier.
 *
 * Sert au calibrage : `t`, `debut` et `intervalle` sont en secondes sur
 * l'horloge du son entendu, le résultat est en millisecondes. Contrairement à
 * `ecartAuCoup`, la grille est ici parfaitement régulière — on ne cherche pas
 * le prochain coup actif, tous les clics en sont un.
 *
 * Pur, donc testable : c'est le seul endroit où une erreur de signe rendrait le
 * calibrage pire que pas de calibrage du tout, en corrigeant à l'envers.
 */
export function ecartAuClic(t: number, debut: number, intervalle: number): number {
  if (intervalle <= 0) return 0;
  const n = Math.round((t - debut) / intervalle);
  return (t - debut - n * intervalle) * 1000;
}
