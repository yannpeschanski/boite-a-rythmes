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
 * - `completer`  : la grille est donnée sauf une mesure, à remplir. Même geste,
 *   mais l'oreille travaille sur un contexte au lieu du vide.
 * - `intrus`     : quatre mesures jouées, une seule diffère — laquelle ? Aucune
 *   grille à manipuler : c'est l'oreille seule.
 * - `jouer`      : taper en rythme sur la boucle, noté sur le placement. Le
 *   seul qui teste le geste plutôt que l'analyse.
 */
export type ExerciseKind = 'reproduire' | 'completer' | 'intrus' | 'jouer';

export const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  reproduire: 'Reproduis la boucle',
  completer: 'Complète la mesure',
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
 * même vérification que « reproduire », en ne notant que la mesure à remplir.
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

/* Les colonnes d'UNE mesure d'une ligne.
 *
 * Le Mode jeu travaille sur une boucle d'une mesure par ligne, mais chaque
 * ligne a sa propre subdivision (c'est tout l'objet des niveaux de
 * polyrythmie : 4 contre 6). Le nombre de colonnes d'une « mesure » n'est donc
 * pas le même d'une ligne à l'autre, et découper au même index partout
 * découperait au mauvais endroit.
 */
export function colonnesDeMesure(subdiv: number, mesure: number, mesures: number): number[] {
  const parMesure = Math.max(1, Math.round(subdiv / Math.max(1, mesures)));
  const debut = Math.min(subdiv - 1, mesure * parMesure);
  const fin = Math.min(subdiv, debut + parMesure);
  const out: number[] = [];
  for (let i = debut; i < fin; i++) out.push(i);
  return out;
}
