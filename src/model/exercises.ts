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

/** Les verbes où le joueur POSE quelque chose, donc où « ma version » existe.
 *
 * ⚠️ UNE SEULE DÉFINITION, parce que deux écrans la lisent : le transport de
 * `GameView` (qui affiche ou non le bouton « 🎧 Écouter ma version ») et le
 * roast de fin (`composerRoast`). Elle était vraie dans la vue et devinée dans
 * le roast, qui reprochait à un `silence`, à un `style` et à un « jouer »
 * d'avoir validé « sans même réécouter ta propre version » — un bouton qu'on
 * avait délibérément retiré de leur écran, faute de version à jouer.
 *
 * Les verbes de PARAMÈTRE et `laverie` n'en sont pas non plus : leur écran ne
 * propose que des versions à comparer (`ecouterVersion`), et `regler` appelle
 * « ma version » son réglage courant, qui n'est pas une grille reposée. */
export const VERBES_AVEC_VERSION: ExerciseKind[] = [
  'reproduire',
  'completer',
  'melodie',
  'arrangement',
];

export function aUneVersion(v: ExerciseKind): boolean {
  return VERBES_AVEC_VERSION.includes(v);
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

/* ---- Ce qui VALIDE un « jouer » ----
 *
 * ⚠️ Retour de jeu (2026-09-17) : *« pour les niveaux 1, 2 et 3 où on joue, ce
 * n'est pas clair qu'il suffit de dépasser [le seuil] pour valider le
 * niveau »*. Le seuil était écrit deux fois — en dur dans `verify()` et en dur
 * dans un libellé — et il fallait DEVINER qu'un bouton posé tout en haut du
 * transport, loin du pad et de la jauge, était celui qui jugeait. D'où deux
 * choses : une seule définition du seuil, et plus de bouton du tout. **Un
 * « jouer » se valide TOUT SEUL**, au moment où le joueur tient le rythme.
 *
 * ⚠️ **Le seuil est passé de 70 à 80 le 2026-09-19**, après essai (« il faut
 * plutôt arriver à plus de 80 % »). Ce que ça change se lit en millisecondes,
 * pas en points : la note d'une frappe décroît linéairement de `PARFAIT_MS` à
 * `TOLERANCE_MS`, donc l'écart MOYEN toléré sur la fenêtre passe de 67 ms à
 * **58 ms**. C'est la seule valeur à bouger si on veut ouvrir ou resserrer —
 * jamais `TOLERANCE_MS`, qui dit ce qui S'ENTEND et non ce qui est demandé.
 *
 * `COUPS_POUR_VALIDER` est la demande de Yann (« dès que la justesse dépasse
 * [le seuil] pendant 10 coups d'affilée ») et c'est ce qui rend l'automatisme
 * honnête : sans lui le niveau se boucle sur la première mesure propre, quatre
 * frappes après le précompte, et la victoire ressemble à un accident.
 *
 * ⚠️ Ce compte ne durcit PAS l'exercice, et c'est `justesseDuRythme` qui le
 * garantit : elle retient la MEILLEURE fenêtre, donc elle ne peut que monter
 * quand on ajoute une frappe. Une mesure propre jouée au quatrième coup reste
 * acquise au dixième — le compte retarde la victoire de quelques secondes, il
 * ne peut jamais l'interdire. C'est ce qui permet de la donner au VERBE (les
 * niveaux 37 et 38 de l'acte 7 comme les trois de l'acte 0) sans revenir sur
 * « les niveaux 37 et 38 sont tj trop compliqués ».
 */
export const SEUIL_JUSTESSE = 80;
export const COUPS_POUR_VALIDER = 10;

/** Combien de frappes il faut avoir posées pour que la validation se déclenche.
 *  Jamais moins que la boucle n'en demande — un motif de douze coups ne se
 *  juge pas sur dix. */
export function coupsPourValider(attendues: number): number {
  return Math.max(attendues, COUPS_POUR_VALIDER);
}

/** Le verdict d'un « jouer », en un seul endroit : le store le rend, l'écran
 *  l'annonce. */
export function jouerGagne(justesse: number, frappes: number, attendues: number): boolean {
  if (attendues <= 0) return false;
  return frappes >= coupsPourValider(attendues) && justesse >= SEUIL_JUSTESSE;
}

/** Note d'une frappe : 100 sous le seuil d'indiscernable, 0 au-delà de la
 *  tolérance, décroissance linéaire entre les deux. */
function noteDUneFrappe(ecartMs: number): number {
  const a = Math.abs(ecartMs);
  if (a <= PARFAIT_MS) return 100;
  if (a >= TOLERANCE_MS) return 0;
  return 100 * (1 - (a - PARFAIT_MS) / (TOLERANCE_MS - PARFAIT_MS));
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

/* ---- Le RYTHME se note sans l'heure du son ----
 *
 * ⚠️ Arbitré le 2026-10-14 (« le problème de latence, ça goûte la merde, je
 * me sens empêtré dans cette problématique » — puis « je suis tes
 * recommandations »). On comparait chaque frappe à l'instant où le son était
 * CENSÉ arriver à l'oreille : un chiffre que le navigateur connaît mal
 * (Firefox + Bluetooth annonce 22 ms pour ~180 réels), que la dalle tactile
 * et le casque allongent, et qu'on rattrapait par un calibrage, puis un bouton,
 * puis une correction automatique — trois PR, et chaque appareil pouvait
 * encore tomber à côté autrement.
 *
 * Le retard d'un appareil est CONSTANT : il décale toutes les frappes de la
 * même quantité. Ce qui fait un rythme, c'est la place des frappes LES UNES
 * PAR RAPPORT AUX AUTRES. Donc, pour chaque fenêtre de frappes, on cherche le
 * décalage constant (jusqu'à `DECALAGE_MAX_MS`) qui les cale le mieux sur le
 * motif, et on ne note que ce qui reste. Il n'y a plus rien à calibrer, et le
 * jeu se joue pareil sur Chrome, Firefox, iPhone, en Bluetooth ou en filaire.
 *
 * Ce qu'on accepte de perdre : le bon motif joué décalé de moins de
 * `DECALAGE_MAX_MS` passe. Au-delà (un demi-temps à ces tempos), il ne passe
 * pas — un contretemps systématique n'est pas un retard d'appareil.
 *
 * La fenêtre reste CONSÉCUTIVE et la meilleure est retenue (voir
 * l'ancienne `justesseDesFrappes`, qu'elle remplace) : chaque fenêtre est
 * jugée seule, donc ajouter une frappe ne peut que faire monter la note. */
export const DECALAGE_MAX_MS = 300;
const PAS_DECALAGE_MS = 5;

/** Le coup le plus proche d'une position du cycle, en bouclant (le dernier
 *  coup enchaîne sur le premier) : son indice et l'écart signé, en ms. */
export function coupLePlusProche(
  posMs: number,
  coupsMs: number[],
  cycleMs: number,
): { indice: number; ecart: number } {
  let indice = -1;
  let ecart = Infinity;
  coupsMs.forEach((c, i) => {
    let d = (((posMs - c) % cycleMs) + cycleMs) % cycleMs;
    if (d > cycleMs / 2) d -= cycleMs;
    if (Math.abs(d) < Math.abs(ecart)) {
      ecart = d;
      indice = i;
    }
  });
  return { indice, ecart };
}

export interface NoteDuRythme {
  justesse: number;
  /** Le décalage constant retiré, en ms (positif : le joueur entend en retard). */
  decalageMs: number;
  /** L'écart de CHAQUE frappe au coup le plus proche, décalage retiré. */
  ecarts: number[];
}

/**
 * @param phases   position de chaque frappe dans le cycle, de 0 à 1
 * @param coups    position de chaque coup du motif dans le cycle, de 0 à 1
 * @param cycleMs  durée du cycle
 * @param attendues taille de la fenêtre (les coups d'un cycle)
 */
export function justesseDuRythme(
  phases: number[],
  coups: number[],
  cycleMs: number,
  attendues: number,
): NoteDuRythme {
  const vide = { justesse: 0, decalageMs: 0, ecarts: phases.map(() => 0) };
  if (attendues <= 0 || coups.length === 0 || cycleMs <= 0 || phases.length === 0) return vide;
  const coupsMs = coups.map((c) => c * cycleMs);
  const posMs = phases.map((p) => p * cycleMs);
  let meilleureSomme = -1;
  let meilleureDispersion = Infinity;
  let meilleurDecalage = 0;
  /* Toute fenêtre CONSÉCUTIVE d'au plus un cycle de frappes, divisée par le
     cycle entier : ajouter une frappe ne fait qu'AJOUTER des fenêtres, donc la
     note ne peut que monter, y compris avant le premier cycle complet.
     Et une fenêtre se lit DANS L'ORDRE du motif : la frappe k vise le coup
     `depart + k`, pas « le coup le plus proche ». Sans ça, jouer les quatre
     temps passait le niveau du contretemps — chaque frappe tombait bien sur
     « un » coup du motif, et le coup oublié ne manquait à personne. */
  const m = coupsMs.length;
  for (let debut = 0; debut < phases.length; debut++) {
    const fin = Math.min(debut + attendues, phases.length);
    for (let depart = 0; depart < m; depart++) {
      for (let o = -DECALAGE_MAX_MS; o <= DECALAGE_MAX_MS; o += PAS_DECALAGE_MS) {
        let somme = 0;
        let dispersion = 0;
        for (let k = debut; k < fin; k++) {
          const vise = coupsMs[(depart + k - debut) % m];
          let d = (((posMs[k] - o - vise) % cycleMs) + cycleMs) % cycleMs;
          if (d > cycleMs / 2) d -= cycleMs;
          somme += noteDUneFrappe(d);
          dispersion += Math.abs(d);
          // À note égale, le décalage qui CENTRE les frappes : c'est lui qui
          // dit le vrai retard, et l'affichage le lit.
          if (somme > meilleureSomme || (somme === meilleureSomme && dispersion < meilleureDispersion)) {
            meilleureSomme = somme;
            meilleureDispersion = dispersion;
            meilleurDecalage = o;
          }
        }
      }
    }
  }
  return {
    // Tant qu'il n'y a pas assez de frappes, le diviseur reste le nombre
    // ATTENDU : une seule frappe juste ne vaut pas 100 %.
    justesse: Math.round(meilleureSomme / attendues),
    decalageMs: meilleurDecalage,
    ecarts: posMs.map((p) => coupLePlusProche(p - meilleurDecalage, coupsMs, cycleMs).ecart),
  };
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
