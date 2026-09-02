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
/* Les verbes de GRILLE ci-dessus, puis les verbes de PARAMÈTRE.
 *
 * Les quatre premiers comparent des cases : juste ou faux. Les trois suivants
 * portent sur des valeurs continues — les panneaux Timbre, Filtre & espace,
 * Groove, et tout le synthé, soit une trentaine de boutons. Un jeu par bouton
 * serait ingérable : ce sont trois verbes PARAMÉTRÉS par le bouton visé (voir
 * `model/parametres.ts`), et la même progression se rejoue dans chaque famille.
 *
 * - `lequel` : deux ou trois versions, laquelle a le plus de ce qu'on demande ?
 *   Entendre la DIRECTION d'un bouton. Le plus facile, donc le premier.
 * - `nommer` : deux sons, un seul paramètre diffère — lequel ? Mettre un NOM
 *   sur ce qu'on entend, ce qui est ce qui permet ensuite d'y penser.
 * - `regler` : un son cible, un curseur, retrouve la valeur. Viser un SON, pas
 *   un chiffre — d'où une tolérance par bouton plutôt qu'une égalité.
 */
export type ExerciseKind =
  | 'reproduire'
  | 'completer'
  | 'intrus'
  | 'jouer'
  | 'lequel'
  | 'nommer'
  | 'regler'
  /* Le verbe de HAUTEUR : reposer une ligne de basse à l'oreille, degré par
   * degré. C'est le seul qui sorte de la batterie — voir `melodie` dans
   * `GameLevel` et la grille de `GameView`. */
  | 'melodie'
  /* ⚠️ Le verbe de l'ARRANGEMENT : reposer PLUSIEURS lignes à la fois, de deux
   * natures — la batterie en coups (0/1/2) et le synthé en DEGRÉS.
   *
   * Demande de Yann (2026-09-02) : *« des exercices de reproduction de synthé
   * avec en même temps plusieurs lignes »*, et *« on peut imaginer dans les
   * actes suivants des reproductions à 6 voire 8 lignes (drum + synthé) »*.
   *
   * Il n'étend NI `reproduire` (trois lignes de batterie en dur) NI `melodie`
   * (monophonique par conception, une seule ligne) : les deux gardent leurs
   * niveaux et leurs tests. Ce qui est partagé, et qui rend ce verbe bon
   * marché, c'est `comparerGrilles` — générique sur le nom de ligne depuis la
   * mélodie, donc comparer huit lignes ne demande rien de neuf ici. Un seul
   * comparateur, comme toujours : deux qui doivent rester d'accord finissent
   * par ne plus l'être. */
  | 'arrangement'
  /* Le verbe du SILENCE : une pulsation régulière, un coup manquant, lequel ?
   * Aucun vocabulaire, aucune grille — c'est le quatrième mot de l'acte 0. */
  | 'silence'
  /* « La laverie » — le seul verbe où la question n'est pas le son mais
   * l'ENDROIT où on l'écoute. Trois versions du même kick, séparées par le
   * drive ; sur le moniteur de studio elles se valent, sur le petit
   * haut-parleur une seule tient encore. C'est l'acte 4 en un exercice :
   * *« Ton morceau est bon dans ton ordinateur. Ici, il est mauvais. »*
   *
   * Il réutilise entièrement l'état des verbes de paramètre (versions, choix,
   * réponse) : ce qui change est le monitoring, pas la mécanique. */
  | 'laverie'
  /* « Le style » — écouter une boucle et NOMMER son genre. Le seul verbe qui
   * interroge une culture plutôt qu'une oreille : rien à mesurer dans le son,
   * tout à reconnaître.
   *
   * C'est l'acte 5, et il vient d'une scène précise : le commercial de
   * Zik'Mobile n'arrive pas à dire ce qu'il veut, il finit par le fredonner —
   * « c'est du dancehall. Tu comprends immédiatement. Il ne savait simplement
   * pas le dire. » Mettre le nom sur le genre est exactement ce qui manquait à
   * l'autre bout du fil. */
  | 'style';

/** Les verbes qui portent sur un paramètre continu plutôt que sur la grille. */
/* ⚠️ `laverie` n'en fait PAS partie, bien qu'il porte lui aussi sur un
 * paramètre : ces trois-là tirent leur bouton dans le catalogue, lui pose le
 * sien (voir `preparerLaverie`). L'y ajouter enverrait `preparerParametre` lui
 * tirer un bouton de la famille — et l'exercice n'aurait plus de sujet. */
export const VERBES_PARAM: ExerciseKind[] = ['lequel', 'nommer', 'regler'];

export function estVerbeParam(v: ExerciseKind): boolean {
  return VERBES_PARAM.includes(v);
}

/* Les trois paliers de drive de « la laverie », MESURÉS et non choisis à vue.
 *
 * Rendu du vrai graphe dans un `OfflineAudioContext`, kick seul, RMS après le
 * passe-haut du petit haut-parleur rapporté au RMS en studio :
 *
 *     drive   0 → 13 %      drive 60 → 37 %      drive 100 → 40 %
 *
 * D'où ces trois-là : ils ne sont pas régulièrement espacés sur le curseur
 * (0, 55, 100) parce que ce n'est pas le curseur qu'on veut espacer, c'est ce
 * qui SURVIT. Un palier intermédiaire à 30 aurait donné 30 % — trop proche de
 * 37 pour qu'on tranche à l'oreille sur un haut-parleur de téléphone.
 *
 * ⚠️ Le drive monte AUSSI le niveau en studio (0,046 → 0,062 de RMS). C'est
 * pour ça que l'exercice arrive sur le petit haut-parleur et propose d'aller
 * comparer : posée en studio, la question aurait une réponse — « la plus
 * forte » — qui n'est pas celle qu'on enseigne. */
export const LAVERIE_DRIVES: number[] = [0, 55, 100];

export const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  laverie: 'Écoute-le à la laverie',
  style: 'Reconnais le genre',
  reproduire: 'Reproduis la boucle',
  completer: 'Complète le temps manquant',
  intrus: 'Trouve l’intrus',
  jouer: 'Joue en rythme',
  lequel: 'Lequel est le plus… ?',
  nommer: 'Qu’est-ce qui a changé ?',
  regler: 'Règle-le à l’oreille',
  melodie: 'Repose la mélodie',
  arrangement: 'Repose l’arrangement',
  silence: 'Trouve le silence',
};

/* ⚠️ Les cases portent un NOMBRE, pas un `DrumStep`.
 *
 * Une case de batterie vaut 0, 1 ou 2 (vide, coup, variante) ; une case de
 * mélodie porte un DEGRÉ de la gamme, 0 pour le silence et 1 à 7 pour les
 * notes. Le comparateur, lui, ne fait que des `===` : il n'a jamais eu besoin
 * de savoir ce que le nombre veut dire.
 *
 * Généraliser le type plutôt qu'écrire un second comparateur est une règle du
 * projet, et elle vaut ici plus qu'ailleurs : deux comparateurs qui doivent
 * rester d'accord finissent toujours par ne plus l'être. Le paramètre de nom de
 * ligne suit la même logique — la mélodie a sa propre ligne, `bass`. */
export type Grille<N extends string = GameDrumRowName> = Record<N, number[]>;
export type Rafales<N extends string = GameDrumRowName> = Record<N, number[]>;

export interface ResultatComparaison<N extends string = GameDrumRowName> {
  /** Vrai si chaque case comparée est exacte. */
  exact: boolean;
  /** Les cases exactes ET actives, à verrouiller côté store. */
  aVerrouiller: Array<{ row: N; col: number }>;
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
export function comparerGrilles<N extends string = GameDrumRowName>(
  cible: Grille<N>,
  cibleRafales: Rafales<N>,
  proposition: Grille<N>,
  propositionRafales: Rafales<N>,
  lignes: N[],
  colonnes?: Partial<Record<N, number[]>>,
): ResultatComparaison<N> {
  let exact = true;
  const aVerrouiller: Array<{ row: N; col: number }> = [];
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
