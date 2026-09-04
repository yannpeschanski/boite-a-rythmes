// Niveaux du mode jeu — portés VERBATIM de boite-a-rythme-69.html (l. 7116–7463).
//
// ÉCARTS DE FORME constatés (données NON adaptées, typées dans leur forme d'origine) :
// 1. La forme réelle d'un niveau (sortie de mkLevel) ne correspond PAS à
//    une interface LevelDef de ../types, retirée depuis (jamais lue) : l'original
//    est un objet plat riche (teach, preamble, subdivOptions, rowsActive,
//    tempoOptions, swingOptions, dragOptions, shiftOptions, variant,
//    variantChance, rollMax, rollChance, ghost, fill, density,
//    forceVariantCount, forceRollCount, presetForceShift, presetGhostDensity,
//    presetGhostRow, presetFillEvery, voiceTier). On le type ici structurellement
//    (GameLevel) sans rien renommer.
// 2. Dans l'original, presetForLevel/subdivForLevel/voiceForLevel lisent la
//    globale PRESETS avec une forme PLATE (preset.kick.subdiv, preset.kick.pitch…),
//    différente de SongPreset de ../types (où le fragment vit dans
//    state.rows.kick). Faute de module presets de morceau ici, la liste est
//    passée en paramètre, typée structurellement dans la forme consommée
//    (GamePresetLike).
// 3. Les fonctions qui utilisaient Math.random reçoivent un paramètre
//    `rng: () => number` (défaut Math.random), logique inchangée.

import type { DrumStep, SynthRowName } from '../types';

// Mode jeu volontairement limité à kick/snare/hat (PLAN.md §6, clap/shaker
// ajoutées à l'Atelier mais pas ici) — type LOCAL plutôt que le `DrumRowName`
// global (désormais élargi), pour que les 34 niveaux continuent de raisonner
// sur exactement 3 lignes sans qu'une extension du modèle ne les force à
// gérer 2 lignes qu'ils ne connaissent pas.
import type { ExerciseKind } from '../exercises';
import type { FamilleParam } from '../parametres';
import type { SonsDeNiveau } from '../sons';

export type GameDrumRowName = 'kick' | 'snare' | 'hat';

// ---------- Types structurels (forme d'origine) ----------

// Subdivision d'un niveau : soit un nombre (même subdivision sur les 3 lignes),
// soit un objet {kick,snare,hat} (polyrythmie) — voir pickSubdiv.
export type SubdivSpec = { kick: number; snare: number; hat: number };
export type SubdivOption = number | SubdivSpec;

export interface LevelDensity {
  kickMin: number;
  kickMax: number;
  snareMin: number;
  snareMax: number;
  hatMin: number;
  hatMax: number;
}

export type VoiceTierName = 'easy' | 'medium' | 'hard';

export interface GameLevel {
  id: number;
  teach: string;
  /* Le VERBE du niveau — ce qu'on demande au joueur, pas ce qu'on lui fait
     varier. Les 34 niveaux écrits jusqu'ici sont tous « reproduire », et
     `mkLevel` pose ce défaut : aucun d'eux n'a besoin d'être touché. */
  exercise: ExerciseKind;
  preamble: string;
  presetId: string | null;
  /** Cible à plusieurs lignes, écrite à la main (voir `GrilleArrangement`). */
  arrangement?: GrilleArrangement;
  /** Le SON du niveau — décor, jamais réponse (voir `model/sons.ts`). */
  sons?: SonsDeNiveau;
  /** Cible écrite à la main : elle remplace le tirage (voir `GrilleEcrite`). */
  grille: GrilleEcrite | null;
  subdivOptions: SubdivOption[];
  rowsActive: { kick: boolean; snare: boolean; hat: boolean };
  tempoOptions: number[];
  swingOptions: number[];
  dragOptions: number[];
  shiftOptions: number[];
  variant: { snare: boolean; hat: boolean };
  variantChance: number;
  rollMax: number;
  rollChance: number;
  ghost: boolean;
  fill: boolean;
  density: LevelDensity;
  forceVariantCount: number;
  forceRollCount: number;
  presetForceShift: boolean;
  presetGhostDensity: number;
  presetGhostRow: GameDrumRowName;
  presetFillEvery: number;
  voiceTier: VoiceTierName;
  /* « Jouer en rythme » : par quel sens on donne le rythme à reproduire.
   *
   * Montrer la grille ET faire sonner le kick rend l'exercice trivial — il ne
   * reste qu'à suivre un point lumineux. Un seul des deux canaux à la fois :
   *   - `ecoute`  : le kick sonne, la grille ne montre RIEN. On place à l'oreille.
   *   - `lecture` : la grille montre le motif, le kick est MUET ; un hat en
   *                 croches donne la pulsation. On place à vue.
   * Sans objet pour les autres verbes. */
  jouerIndice: 'ecoute' | 'lecture';
  /* Pour les verbes de PARAMÈTRE (`lequel`, `nommer`, `regler`) : dans quelle
     famille de boutons puiser. Sans objet pour les verbes de grille. */
  familleParam: FamilleParam;
  /* ⚠️ Restreint le tirage à ces boutons-là, à l'intérieur de la famille.
   *
   * Retour de Yann sur l'acte 0 : « les paramètres à régler font intervenir des
   * paramètres auxquels on n'a pas encore accès ». Au tout premier acte
   * l'Atelier n'est pas ouvert : on demandait au joueur de NOMMER des boutons
   * qu'il n'a jamais vus. La famille entière est trop large pour un début —
   * d'où une liste explicite, vide par défaut (= toute la famille). */
  paramsAutorises: string[];
  /* Le verbe `melodie` : une ligne de BASSE à reposer, degré par degré.
   *
   * Regroupé plutôt qu'éclaté en cinq champs — c'est un bloc qui n'a de sens
   * que pour ce verbe-là, et `pas: 0` dit « ce niveau n'est pas mélodique »
   * sans avoir à consulter `exercise`. */
  melodie: {
    /* ⚠️ SUR QUELLE LIGNE de synthé on écrit — `bass` par défaut.
     *
     * Le verbe est né sur la basse et l'y avait codée en dur. Retour de Yann
     * (2026-09-01) sur l'acte 3 : *« il faut compléter avec les autres
     * composantes du synthé. Commencer par la ligne de mélodie puis la basse
     * puis la nappe, les additionner »* — l'acte enseigne trois lignes, pas
     * une, et il n'y a aucune raison que l'exercice n'en connaisse qu'une.
     *
     * ⚠️ La NAPPE reste hors de ce verbe : `melodie` est monophonique par
     * conception (« une octave, sans accord »), et la nappe joue des accords.
     * On l'ajoute par un CAHIER, pas par un exercice qui mentirait sur ce
     * qu'elle fait. */
    ligne: SynthRowName;
    /** Nombre de pas de la boucle. 0 = niveau non mélodique. */
    pas: number;
    /** Degré le plus haut tiré. 5 pour rester dans le pentatonique du bas de
     *  gamme, 7 pour toute la gamme — c'est la difficulté principale. */
    degreMax: number;
    notesMin: number;
    notesMax: number;
    /** La seconde moitié REPRÈND la première. C'est « les motifs, la
     *  répétition » de l'acte 3 : la moitié à retrouver est deux fois plus
     *  courte, et l'oreille apprend à entendre qu'une phrase revient. */
    motif: boolean;
  };
  /** Le verbe `silence` : une pulsation régulière avec UN coup manquant.
   *  0 = niveau non concerné. */
  silencePas: number;
  /* Le verbe `style` : dans quels presets puiser le morceau à reconnaître.
   *
   * ⚠️ Une LISTE et pas un `presetId`, parce que le niveau doit tirer un genre
   * DIFFÉRENT à chaque partie — sans quoi le refaire ne serait plus de la
   * culture des styles mais de la mémoire. Vide = les 34 presets. */
  stylePool: string[];
}

// Options passées à mkLevel — tout est facultatif, mkLevel pose les défauts.
/* ⚠️ UNE GRILLE ÉCRITE — une cible posée à la main plutôt que tirée au sort.
 *
 * Arbitrage de Yann (2026-08-27) : *« il n'est pas nécessaire de randomiser
 * les exercices dans la mesure où chaque personne ne les ferait qu'une seule
 * fois »*. L'argument suffit, mais il y a plus fort : **tous les bugs
 * d'exercice du retour de partie venaient de la génération** — le rim shot
 * annoncé et jamais posé, le tresillo sans rafale, « 0 variante sur 60
 * tirages ». Un rythme tiré est un rythme que personne n'a conçu : on ne peut
 * en vérifier les propriétés qu'EN PROBABILITÉ, d'où des tests qui rejouent
 * 60 fois pour approcher ce qu'une grille écrite dit d'un coup d'œil.
 *
 * Et surtout, ça rend possible ce qu'un tirage interdit : une COURBE de
 * difficulté. On ne dessine pas une progression avec des tirages, on la
 * dessine avec une liste.
 *
 * Chaque ligne est un tableau de la longueur de sa subdivision : 0 vide,
 * 1 coup, 2 variante (rim shot sur la claire, charley ouvert). `rolls` est
 * facultatif et ne porte que sur les pas actifs. */
export interface GrilleEcrite {
  subdiv: { kick: number; snare: number; hat: number };
  kick: number[];
  snare: number[];
  hat: number[];
  rolls?: Partial<Record<GameDrumRowName, number[]>>;
  /* ⚠️ LE FEEL FAIT PARTIE DU RYTHME, et une grille écrite doit pouvoir le
   * poser — sinon un niveau qui enseigne le groove enseigne au hasard.
   *
   * Le swing, la traîne et le décalage par ligne changent ce qu'on ENTEND
   * sans changer une seule case : deux niveaux avec la même grille et deux
   * swings différents sont deux exercices différents. Tirés dans
   * `swingOptions` / `dragOptions`, ils redonnaient au niveau le défaut que la
   * grille écrite existe pour supprimer — il ne sait pas ce qu'il vient
   * d'enseigner.
   *
   * Le décalage est pire encore : `startLevel` le forçait à `0` sur toute
   * grille écrite. Un niveau « décalage par ligne » écrit sans ce champ
   * n'aurait eu AUCUN décalage — il aurait demandé d'entendre ce qui n'est pas
   * joué. Même famille que le rim shot annoncé et jamais posé (PLAN.md,
   * « les promesses de l'acte 1 »).
   *
   * Facultatifs : une grille qui ne s'en occupe pas laisse le tirage faire,
   * comme avant. */
  swing?: number;
  drag?: number;
  shift?: Partial<Record<GameDrumRowName, number>>;
}

/* ⚠️ L'ARRANGEMENT — une cible écrite sur PLUSIEURS lignes de deux natures.
 *
 * Demande de Yann (2026-09-02) : *« des exercices de reproduction de synthé
 * avec en même temps plusieurs lignes »*, puis *« des reproductions à 6 voire
 * 8 lignes (drum + synthé) »*. C'est donc écrit d'emblée pour N lignes : le
 * premier niveau en pose quatre, rien dans la forme n'empêche d'en poser huit.
 *
 * ⚠️ UNE SEULE SUBDIVISION pour tout l'arrangement, et c'est un choix. Des
 * lignes à des subdivisions différentes seraient une polyrythmie — un autre
 * sujet, déjà enseigné (niveau 74) — et rendraient la lecture croisée de huit
 * lignes illisible sur un téléphone. Ici, toutes les lignes se lisent dans la
 * même colonne : c'est ce qui permet de voir QUI joue AU MÊME MOMENT, et c'est
 * le sujet de l'arrangement.
 *
 * ⚠️ La NAPPE est DEDANS depuis le 2026-09-02 (*« il manque la nappe ! »*), et
 * sans troisième nature de case : sa case porte un DEGRÉ comme les autres, et
 * c'est `buildState` qui le traduit en index d'accord (`degré − 1`). Le joueur
 * écrit « 3 », la nappe joue l'accord du troisième degré. Une seule chose la
 * distingue et elle est bornée par le moteur : ses degrés ne vont que jusqu'à
 * `chordCount` (4 par défaut), là où basse et mélodie montent au clavier du
 * niveau — d'où `degreMaxDeLigne`, qui décide aussi du clavier affiché. */
export type NatureLigne = 'drum' | 'degres';

export interface LigneArrangement {
  /** `kick`/`snare`/`hat` pour la batterie, `bass`/`melody` pour le synthé. */
  nom: string;
  nature: NatureLigne;
  /* La cible, de longueur `subdiv × cycles`. Batterie : 0 vide, 1 coup, 2
   * variante. Synthé : 0 silence, 1..7 le DEGRÉ dans la gamme. */
  pas: number[];
  /* Sur combien de MESURES la ligne se déploie avant de se répéter (1 par
   * défaut).
   *
   * ⚠️ Demande de Yann (2026-09-02) : *« on doit pouvoir explorer toutes les
   * composantes, à savoir, des durées différentes de cycles par exemple. […]
   * ce niveau à 8 cases est une bonne intro, d'ailleurs ça fait très sonnerie
   * polyphonique… mais pour un morceau, il faut des cycles différents. »*
   *
   * ⚠️ Réservé aux lignes de SYNTHÉ, et ce n'est pas un oubli : `DrumRowState`
   * n'a pas de `cycleBars` — une ligne de batterie boucle sur sa mesure, point.
   * Lui écrire `cycles: 2` produirait une ligne qui s'affiche sur deux mesures
   * et n'en joue qu'une : la moitié des cases seraient inaudibles. C'est
   * `tests/arrangement.test.ts` qui le refuse.
   *
   * Ce n'est PAS une polyrythmie : la subdivision reste commune, donc une
   * colonne reste un instant. Une ligne plus courte se RÉPÈTE en face des
   * mesures suivantes — c'est exactement ce qu'on entend. */
  cycles?: number;
}

export interface GrilleArrangement {
  /** La même pour toutes les lignes — voir le commentaire ci-dessus. */
  subdiv: number;
  lignes: LigneArrangement[];
  /** Le clavier des lignes de synthé (nombre de touches). */
  degreMax?: number;
  swing?: number;
}

/* Jusqu'où monte le clavier d'UNE ligne de synthé.
 *
 * ⚠️ La nappe ne joue pas des notes mais des ACCORDS, et il n'y en a que
 * `chordCount` (4 par défaut). Un clavier à cinq touches sur la nappe
 * proposerait donc une cinquième touche qui ne joue rien : une case
 * impossible à remplir, et un exercice bloqué sans rien à l'écran pour le
 * dire. Le clavier suit la ligne visée. */
export const ACCORDS_DE_LA_NAPPE = 4;
export function degreMaxDeLigne(a: GrilleArrangement, nom: string): number {
  const max = a.degreMax ?? 5;
  return nom === 'pad' ? Math.min(max, ACCORDS_DE_LA_NAPPE) : max;
}

/** Combien de cases une ligne porte vraiment : `subdiv × cycles`. */
export function longueurDeLigne(a: GrilleArrangement, l: LigneArrangement): number {
  return a.subdiv * Math.max(1, l.cycles ?? 1);
}

/** Sur combien de mesures tourne l'arrangement entier — la ligne la plus
 *  longue décide, les autres se répètent en face. */
export function mesuresDeLArrangement(a: GrilleArrangement): number {
  return Math.max(1, ...a.lignes.map((l) => Math.max(1, l.cycles ?? 1)));
}

/** Le nombre de COLONNES affichées : la boucle entière, une colonne par
 *  instant. */
export function colonnesDeLArrangement(a: GrilleArrangement): number {
  return a.subdiv * mesuresDeLArrangement(a);
}

export interface MkLevelOptions {
  /** Une cible écrite à la main — voir `GrilleEcrite`. */
  grille?: GrilleEcrite;
  /** Une cible à PLUSIEURS lignes — voir `GrilleArrangement`. */
  arrangement?: GrilleArrangement;
  /** Le SON du niveau — voir `model/sons.ts`. */
  sons?: SonsDeNiveau;
  exercise?: ExerciseKind;
  preamble?: string;
  presetId?: string;
  subdivOptions?: SubdivOption[];
  rowsActive?: { kick?: boolean; snare?: boolean; hat?: boolean };
  tempoOptions?: number[];
  swingOptions?: number[];
  dragOptions?: number[];
  shiftOptions?: number[];
  variant?: { snare?: boolean; hat?: boolean };
  variantChance?: number;
  rollMax?: number;
  rollChance?: number;
  ghost?: boolean;
  fill?: boolean;
  density?: LevelDensity;
  forceVariantCount?: number;
  forceRollCount?: number;
  presetForceShift?: boolean;
  presetGhostDensity?: number;
  presetGhostRow?: GameDrumRowName;
  presetFillEvery?: number;
  jouerIndice?: 'ecoute' | 'lecture';
  familleParam?: FamilleParam;
  paramsAutorises?: string[];
  melodie?: {
    ligne?: SynthRowName;
    pas?: number; degreMax?: number; notesMin?: number; notesMax?: number; motif?: boolean;
  };
  silencePas?: number;
  stylePool?: string[];
}

// Options du générateur de ligne (voir genLevelRow).
export interface GenRowOpts {
  forceIndices?: number[];
  fillRatio?: number | null;
  minExtra?: number;
  maxExtra?: number;
  variantEnabled: boolean;
  variantChance: number;
  rollMax: number;
  rollChance: number;
}

export interface GenRowResult {
  state: DrumStep[];
  roll: number[];
}

export interface LevelRhythm {
  target: Record<GameDrumRowName, DrumStep[]>;
  roll: Record<GameDrumRowName, number[]>;
}

// Timbre par ligne tel que tiré/copié par le mode jeu (sous-ensemble du timbre drum).
export interface RowTimbre {
  pitch: number;
  attack: number;
  decay: number;
  tone: number;
}
export type GameVoice = Record<GameDrumRowName, RowTimbre>;

// Forme PLATE d'un preset de morceau telle que consommée par le mode jeu dans
// l'original (preset.kick.subdiv, preset.kick.pitch…) — écart vs SongPreset,
// voir commentaire de tête.
export interface GamePresetRow {
  subdiv: number;
  pitch?: number;
  attack?: number;
  decay?: number;
  tone?: number;
}
export interface GamePresetLike {
  id: string;
  /* ⚠️ Le genre et son nom, ajoutés pour le verbe `style` (acte 5) — ils
   * existaient déjà dans les données (`SongPresetData.cat` / `.label`), ils
   * n'étaient simplement pas visibles d'ici. Optionnels parce que ce type
   * décrit ce dont le Mode jeu a BESOIN d'un preset, et que les trois lignes
   * de batterie suffisent à tous les autres verbes. */
  cat?: string;
  label?: string;
  kick: GamePresetRow;
  snare: GamePresetRow;
  hat: GamePresetRow;
}

export interface VoiceTierRange {
  pitch: number;
  attack: number;
  decay: number;
  toneKick: number;
  toneSnare: number;
  toneHat: number;
}

// ---------- Niveaux de difficulté ----------
// "subdiv" donne le nombre de pas par ligne : en difficile, kick/snare sont en 4
// et le hat en 3 -> polyrythmie (3 contre 4) dans la même mesure.
export function pick<T>(arr: T[], rng: () => number = Math.random): T {
  return arr[Math.floor(rng() * arr.length)];
}

// Positions "fortes" d'une mesure divisée en `steps` pas, en la subdivisant par
// 2, 3 et 4 — sert de réservoir de points d'ancrage variés (au lieu de toujours
// caler kick/snare sur les mêmes cases, ce qui donnait toujours le même feeling
// afrobeat/four-on-the-floor).
export function strongPositions(steps: number): number[] {
  const set = new Set<number>([0, steps - 1]);
  [2, 3, 4].forEach(divisions => {
    if (divisions <= steps) {
      for (let k = 1; k < divisions; k++) set.add(Math.floor(k * steps / divisions));
    }
  });
  return Array.from(set).filter(i => i < steps && i >= 0).sort((a, b) => a - b);
}

// Générateur de motif niveau : renvoie un état (0 vide / 1 normal / 2 variante)
// et une rafale (1 à 4) par pas. Remplace l'ancien genGameRhythm : la variante
// (rim shot / hat ouvert) et la rafale sont désormais devinables comme le reste,
// mais seulement quand le niveau les autorise (level.variant / level.rollMax).
export function genLevelRow(steps: number, opts: GenRowOpts, rng: () => number = Math.random): GenRowResult {
  const state: DrumStep[] = new Array(steps).fill(0);
  const roll: number[] = new Array(steps).fill(1);
  (opts.forceIndices || []).forEach(i => { if (i < steps) state[i] = 1; });
  if (opts.fillRatio != null) {
    const target = Math.max(state.filter(Boolean).length, Math.round(steps * opts.fillRatio));
    let guard = 0;
    while (state.filter(Boolean).length < target && guard < steps * 4) {
      const i = Math.floor(rng() * steps);
      if (!state[i]) state[i] = 1;
      guard++;
    }
  } else {
    const minExtra = opts.minExtra || 0, maxExtra = opts.maxExtra != null ? opts.maxExtra : minExtra;
    const extra = minExtra + Math.floor(rng() * (maxExtra - minExtra + 1));
    for (let n = 0; n < extra; n++) state[Math.floor(rng() * steps)] = 1;
  }
  for (let i = 0; i < steps; i++) {
    if (!state[i]) continue;
    if (opts.variantEnabled && rng() < opts.variantChance) state[i] = 2;
    if (opts.rollMax > 1 && rng() < opts.rollChance) {
      roll[i] = 2 + Math.floor(rng() * (opts.rollMax - 1));
    }
  }
  return { state, roll };
}

export function genLevelRhythm(subdiv: SubdivSpec, level: GameLevel, rng: () => number = Math.random): LevelRhythm {
  const active = level.rowsActive || { kick: true, snare: true, hat: true };
  const kickAnchors = strongPositions(subdiv.kick);
  const kick = active.kick ? genLevelRow(subdiv.kick, {
    forceIndices: [pick(kickAnchors, rng)],
    minExtra: level.density.kickMin, maxExtra: level.density.kickMax,
    variantEnabled: false, variantChance: 0,
    rollMax: level.rollMax, rollChance: level.rollChance,
  }, rng) : { state: new Array<DrumStep>(subdiv.kick).fill(0), roll: new Array<number>(subdiv.kick).fill(1) };
  const snareAnchors = strongPositions(subdiv.snare);
  const snare = active.snare ? genLevelRow(subdiv.snare, {
    forceIndices: [pick(snareAnchors, rng)],
    minExtra: level.density.snareMin, maxExtra: level.density.snareMax,
    variantEnabled: level.variant.snare, variantChance: level.variantChance,
    rollMax: level.rollMax, rollChance: level.rollChance,
  }, rng) : { state: new Array<DrumStep>(subdiv.snare).fill(0), roll: new Array<number>(subdiv.snare).fill(1) };
  const hat = active.hat ? genLevelRow(subdiv.hat, {
    fillRatio: level.density.hatMin + rng() * (level.density.hatMax - level.density.hatMin),
    variantEnabled: level.variant.hat, variantChance: level.variantChance,
    rollMax: level.rollMax, rollChance: level.rollChance,
  }, rng) : { state: new Array<DrumStep>(subdiv.hat).fill(0), roll: new Array<number>(subdiv.hat).fill(1) };
  const rythme: LevelRhythm = {
    target: { kick: kick.state, snare: snare.state, hat: hat.state },
    roll: { kick: kick.roll, snare: snare.roll, hat: hat.roll },
  };
  forcerVariantesEtRafales(rythme, level, rng);
  return rythme;
}

/* ⚠️ LE FORÇAGE — déclaré depuis le début, jamais porté.
 *
 * `forceVariantCount` et `forceRollCount` existaient dans le type, étaient
 * remplis par les niveaux… et lus par PERSONNE. Le commentaire de `mkLevel`
 * décrit pourtant leur rôle exact : « utilisé pour les niveaux "une seule
 * variante/rafale" ». Conséquence, mesurée sur 60 tirages avant correctif :
 *
 *   niveau 5, « Variante (une seule) » →  0 variante sur 60
 *   niveau 8, « Rafale (une seule) »   →  0 rafale   sur 60
 *
 * Ces deux niveaux posent `variantChance: 0` / `rollChance: 0` justement parce
 * qu'ils comptaient sur le forçage : sans lui, la consigne annonce un rim shot
 * ou une rafale que la cible ne contient jamais. Trouvé par Yann en jouant —
 * « on dit qu'on introduit rim shot ou hat ouvert, ce n'est pas le cas ».
 *
 * Le forçage passe APRÈS le tirage probabiliste et compte ce qui est déjà là :
 * un niveau qui en veut une et qui en a déjà tiré une n'en ajoute pas.
 * L'ordre d'itération des lignes est fixe (kick → snare → hat) — comme partout
 * ailleurs, il gouverne la consommation du `rng`.
 */
export function forcerVariantesEtRafales(r: LevelRhythm, level: GameLevel, rng: () => number): void {
  const lignes: GameDrumRowName[] = ['kick', 'snare', 'hat'];

  if (level.forceVariantCount > 0) {
    /* Seules la caisse claire et le charley ACCEPTENT une variante — c'est
       pour ça que `level.variant` n'a pas de champ `kick` : la grosse caisse
       n'a ni rim shot ni ouverture, forcer un 2 dessus écrirait un état que la
       ligne ne sait pas jouer. */
    const candidates: Array<['snare' | 'hat', number]> = [];
    for (const l of ['snare', 'hat'] as const) {
      if (!level.variant[l]) continue;
      r.target[l].forEach((v, i) => {
        if (v === 1) candidates.push([l, i]);
      });
    }
    const deja = lignes.reduce((n, l) => n + r.target[l].filter((v) => v === 2).length, 0);
    for (let k = deja; k < level.forceVariantCount && candidates.length > 0; k++) {
      const [l, i] = candidates.splice(Math.floor(rng() * candidates.length), 1)[0];
      r.target[l][i] = 2;
    }
  }

  if (level.forceRollCount > 0 && level.rollMax > 1) {
    const candidates: Array<[GameDrumRowName, number]> = [];
    for (const l of lignes) {
      r.target[l].forEach((v, i) => {
        if (v > 0 && r.roll[l][i] <= 1) candidates.push([l, i]);
      });
    }
    const deja = lignes.reduce((n, l) => n + r.roll[l].filter((v) => v > 1).length, 0);
    for (let k = deja; k < level.forceRollCount && candidates.length > 0; k++) {
      const [l, i] = candidates.splice(Math.floor(rng() * candidates.length), 1)[0];
      r.roll[l][i] = 2 + Math.floor(rng() * (level.rollMax - 1));
    }
  }
}

// subdivOptions peut mélanger des nombres (même subdivision sur les 3 lignes) et
// des objets {kick,snare,hat} (polyrythmie) — pickSubdiv gère les deux formes.
export function pickSubdiv(options: SubdivOption[], rng: () => number = Math.random): SubdivSpec {
  const choice = pick(options, rng);
  return (typeof choice === 'number') ? { kick: choice, snare: choice, hat: choice } : choice;
}

// ---------- Niveaux "preset" : reproduire un rythme réel de l'Atelier ----------
// Plutôt qu'un rythme généré, la cible est directement le pattern d'un preset
// existant (même subdivision par ligne, mêmes shift/tempo/swing/drag, même
// timbre) — le format pattern (0/1/2 par pas) est déjà identique à celui du jeu.
// Volontairement ignorés : ghostDensity/spontRoll/fillEvery du preset (le ghost
// et le fill n'ont pas encore leur propre leçon à ce stade de la campagne) et
// toute rafale (roll toujours 1 — la rafale n'est jamais l'objet noté ici).
// (Portage : la globale PRESETS de l'original est ici passée en paramètre.)
export function presetForLevel(cfg: GameLevel, presets: GamePresetLike[]): GamePresetLike | null {
  return cfg.presetId ? (presets.find(p => p.id === cfg.presetId) || null) : null;
}
export function subdivForLevel(cfg: GameLevel, presets: GamePresetLike[], rng: () => number = Math.random): SubdivSpec {
  const preset = presetForLevel(cfg, presets);
  return preset
    ? { kick: preset.kick.subdiv, snare: preset.snare.subdiv, hat: preset.hat.subdiv }
    : pickSubdiv(cfg.subdivOptions, rng);
}
export function voiceForLevel(cfg: GameLevel, presets: GamePresetLike[], rng: () => number = Math.random): GameVoice {
  const preset = presetForLevel(cfg, presets);
  if (!preset) return randomVoice(VOICE_TIERS[cfg.voiceTier], rng);
  const v = (row: GamePresetRow): RowTimbre => ({ pitch: row.pitch || 0, attack: row.attack || 0, decay: row.decay || 0, tone: row.tone || 0 });
  return { kick: v(preset.kick), snare: v(preset.snare), hat: v(preset.hat) };
}

// ---------- Timbre aléatoire par palier (Mode jeu) ----------
// Pure couleur sonore, jamais montrée ni devinée — n'affecte que playKick/
// playSnare/playHatClosed/playHatOpen, jamais gameTarget/gameGuess. Trois paliers
// d'intensité (comme les anciens easy/medium/hard), choisis selon le niveau.
export function randBetween(min: number, max: number, rng: () => number = Math.random): number {
  return Math.round(min + rng() * (max - min));
}
export function randomVoice(range: VoiceTierRange, rng: () => number = Math.random): GameVoice {
  return {
    kick:  { pitch: randBetween(-range.pitch, range.pitch, rng), attack: randBetween(0, range.attack, rng), decay: randBetween(-range.decay, range.decay, rng), tone: randBetween(0, range.toneKick, rng) },
    snare: { pitch: randBetween(-range.pitch, range.pitch, rng), attack: randBetween(0, range.attack, rng), decay: randBetween(-range.decay, range.decay, rng), tone: randBetween(-range.toneSnare, range.toneSnare, rng) },
    hat:   { pitch: randBetween(-range.pitch, range.pitch, rng), attack: randBetween(0, range.attack, rng), decay: randBetween(-range.decay, range.decay, rng), tone: randBetween(0, range.toneHat, rng) },
  };
}
export const VOICE_TIERS: Record<VoiceTierName, VoiceTierRange> = {
  easy:   { pitch: 2, attack: 6,  decay: 5,  toneKick: 0, toneSnare: 6,  toneHat: 6  },
  medium: { pitch: 4, attack: 10, decay: 8,  toneKick: 0, toneSnare: 10, toneHat: 10 },
  hard:   { pitch: 6, attack: 15, decay: 12, toneKick: 0, toneSnare: 15, toneHat: 15 },
};
export function voiceTierForLevel(id: number): VoiceTierName {
  return id <= 12 ? 'easy' : (id <= 26 ? 'medium' : 'hard');
}

// ---------- Campagne à 34 niveaux, une seule séquence continue ----------
// Chaque niveau n'introduit qu'UN concept nouveau à la fois (sauf 16-17, qui
// combinent tout) : placement, variante, rafale, subdivision, swing, traîne,
// décalage, polyrythmie, ghost/fill, puis tout combiné. Une fois une mécanique
// introduite elle reste active sur les niveaux suivants, mais son intensité
// (rollMax/variantChance) redescend d'abord pour laisser la place au nouvel
// axe avant de remonter crescendo. "preamble" (seulement sur le premier niveau
// de chaque concept) est affiché au joueur pour expliquer ce qui change.
export function mkLevel(id: number, teach: string, o: MkLevelOptions): GameLevel {
  return {
    id, teach, exercise: o.exercise || 'reproduire', jouerIndice: o.jouerIndice || 'ecoute',
    arrangement: o.arrangement,
    sons: o.sons,
    familleParam: o.familleParam || 'timbre',
    paramsAutorises: o.paramsAutorises ?? [],
    melodie: {
      ligne: o.melodie?.ligne ?? 'bass',
      pas: o.melodie?.pas ?? 0,
      degreMax: o.melodie?.degreMax ?? 5,
      notesMin: o.melodie?.notesMin ?? 3,
      notesMax: o.melodie?.notesMax ?? 4,
      motif: o.melodie?.motif ?? false,
    },
    silencePas: o.silencePas ?? 0,
    stylePool: o.stylePool ?? [],
    preamble: o.preamble || '',
    presetId: o.presetId || null,
    subdivOptions: o.subdivOptions || [4],
    rowsActive: {
      kick: o.rowsActive ? !!o.rowsActive.kick : true,
      snare: o.rowsActive ? !!o.rowsActive.snare : true,
      hat: o.rowsActive ? !!o.rowsActive.hat : true,
    },
    tempoOptions: o.tempoOptions || [84, 92, 100, 108],
    swingOptions: o.swingOptions || [0],
    dragOptions: o.dragOptions || [0],
    shiftOptions: o.shiftOptions || [0],
    variant: { snare: !!(o.variant && o.variant.snare), hat: !!(o.variant && o.variant.hat) },
    variantChance: o.variantChance != null ? o.variantChance : 0.4,
    rollMax: o.rollMax || 1,
    rollChance: o.rollChance != null ? o.rollChance : 0.3,
    ghost: !!o.ghost,
    fill: !!o.fill,
    density: o.density || { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 },
    // Force EXACTEMENT N notes actives en variante/rafale, en plus (ou à la
    // place) de la génération probabiliste habituelle — utilisé pour les
    // niveaux "une seule variante/rafale" ET pour les niveaux preset (garantir
    // qu'un concept déjà enseigné est bien présent dans la cible, même si le
    // preset original n'en contenait pas assez).
    grille: o.grille || null,
    forceVariantCount: o.forceVariantCount || 0,
    forceRollCount: o.forceRollCount || 0,
    // Preset "modifié pour l'occasion" : décalage aléatoire forcé par ligne
    // (la plupart des presets ont un shift naturel nul) et ghost/fill activés
    // dans la cible jouée (au lieu du silence habituel sur les niveaux preset).
    presetForceShift: !!o.presetForceShift,
    presetGhostDensity: o.presetGhostDensity || 0,
    presetGhostRow: o.presetGhostRow || 'snare',
    presetFillEvery: o.presetFillEvery || 0,
    voiceTier: voiceTierForLevel(id),
  };
}

export const LEVELS: GameLevel[] = [
  mkLevel(1, 'Poser une note (kick)', {
    preamble: "Un rythme secret joue en boucle : reproduis-le à l'oreille, comme au Motus — seules les notes bien placées se valident avec un ✓. Pour l'instant, seul le kick (la grosse caisse) compte : les deux autres lignes restent vides, rien à y faire.",
    subdivOptions: [4], tempoOptions: [84, 92],
    rowsActive: { kick: true, snare: false, hat: false },
    density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  /* ---------- Acte 1 : les huit rythmes ÉCRITS ----------
   *
   * Grilles posées à la main plutôt que tirées (voir `GrilleEcrite`). Chaque
   * niveau ajoute EXACTEMENT une chose à celui d'avant — c'est ça, une courbe,
   * et c'est ce qu'un tirage ne sait pas faire. */
  mkLevel(2, 'Le kick et la claire', {
    preamble: "Le rythme le plus répandu au monde : le kick sur les temps 1 et 3, la caisse claire qui répond sur 2 et 4. On l'appelle le backbeat, et tu l'as déjà entendu dix mille fois.",
    tempoOptions: [84, 92],
    rowsActive: { kick: true, snare: true, hat: false },
    grille: {
      subdiv: { kick: 4, snare: 4, hat: 4 },
      kick:  [1, 0, 1, 0],
      snare: [0, 1, 0, 1],
      hat:   [0, 0, 0, 0],
    } }),
  mkLevel(3, 'Le trio', {
    preamble: "Le charleston complète la base : il joue en croches, deux fois par temps, et c'est lui qui donne le débit. Le kick garde ses quatre temps, la claire répond sur 2 et 4. Kick, claire, charley — avec ces trois-là tu peux déjà tout faire.",
    tempoOptions: [84, 92],
    grille: {
      // Les trois lignes en croches : le charley remplit les huit cases, le
      // kick et la claire gardent les placements du niveau 67.
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 1, 0, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
    } }),
  mkLevel(4, 'Reproduire un preset (Motown)', {
    preamble: "Ces niveaux ne sont plus générés au hasard : ce sont de vrais rythmes de l'Atelier, à replacer dans leur contexte. Motown/soul, le plus simple qui soit — aucune variante, aucune rafale.",
    presetId: 'motown' }),
  // ---------- Variante (2 niveaux : une seule, puis complète) ----------
  mkLevel(5, 'Les rim shots', {
    preamble: "Une case active peut porter une VARIANTE : reclique-la et la caisse claire passe en rim shot — le bord du fût, pas la peau, un claquement sec. La claire joue quatre fois ici, et DEUX de ces quatre sont des rim shots. À toi de dire lesquelles : c'est le timbre qui les sépare, pas la place.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true },
    grille: {
      /* ⚠️ DEUX rim shots sur QUATRE claires, pas un sur deux.
       *
       * Retour de Yann (2026-08-31) : « on ne doit pas simplement changer une
       * note en une rafale pour introduire rafale, il faut que ce soit bien
       * plus difficile ». Une seule variante sur une ligne qui n'en compte que
       * deux se trouve par élimination, sans jamais l'entendre. Quatre coups
       * dont deux variés, et il faut vraiment comparer les timbres. */
      subdiv: { kick: 8, snare: 8, hat: 16 },
      kick:  [1, 0, 0, 1, 1, 0, 1, 0],
      snare: [0, 0, 2, 1, 0, 1, 2, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    } }),
  mkLevel(6, 'Variante (complète)', {
    preamble: "Cette fois, plusieurs notes peuvent être en variante — sur la snare comme sur le hat.",
    subdivOptions: [4], tempoOptions: [84, 92],
    variant: { snare: true, hat: true }, variantChance: 0.6, rollMax: 1,
    density: { kickMin: 0, kickMax: 0, snareMin: 1, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  // ---------- Round 1 : Subdivision + Rafale, entrelacés, avec presets ----------
  mkLevel(7, 'Le kick qui sort du temps', {
    preamble: "Le kick peut tomber ENTRE deux temps. Ici il quitte la grille une fois, sur le « et » du deuxième temps — et il garde ses quatre coups par ailleurs. Ce décalage-là a un nom, la syncope, et c'est ce qui sépare un rythme qui marche d'un rythme qui groove. Le charley reste en doubles-croches.",
    tempoOptions: [88, 96],
    grille: {
      /* ⚠️ UNE seule syncope, et c'est la promesse du niveau : le kick sort du
       * temps à l'index 3 et nulle part ailleurs. Le reste (quatre coups de
       * kick, la claire sur 2 et 4, le charley aux seize cases) est acquis aux
       * niveaux 67, 3 et 68 — on n'ajoute qu'une chose, mais on ne redescend
       * jamais : les cinq niveaux qui suivent partent de cette grille-ci. */
      subdiv: { kick: 8, snare: 8, hat: 16 },
      kick:  [1, 0, 0, 1, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    } }),
  mkLevel(8, 'Les rafales', {
    preamble: "Clic droit (ou appui long) sur une case active : elle part en RAFALE, plusieurs coups rapprochés au lieu d'un seul. QUATRE ici, et elles ne sont pas toutes pareilles — deux coups ou trois, sur le charley comme sur la claire. Ce qu'il faut entendre n'est pas « où », c'est « combien ». Aucune variante à côté : c'est la rafale qu'on écoute.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true }, rollMax: 4,
    grille: {
      /* ⚠️ QUATRE rafales, DEUX longueurs, DEUX lignes — pas une case changée
       * en rafale au bout de la mesure.
       *
       * « On ne doit pas simplement changer une note en une rafale pour
       * introduire rafale » (Yann, 2026-08-31). Une rafale unique et finale se
       * repère à sa POSITION ; le geste ne demande alors aucune écoute. En
       * multipliant et en variant la longueur, la seule façon de reposer la
       * grille est de compter les coups de chacune. */
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      rolls: {
        hat:   [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3],
        snare: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 2],
      },
    } }),
  mkLevel(9, 'Reproduire un preset (Tresillo)', {
    preamble: "La cellule tresillo (3+3+2), toute simple à l'origine — variante et rafale y sont ajoutées pour l'occasion, histoire de vérifier que ça reste acquis.",
    variant: { snare: true, hat: true }, rollMax: 2, presetId: 'tresillo', forceVariantCount: 1, forceRollCount: 1 }),
  mkLevel(10, 'Subdivision plus fine', {
    preamble: "Subdivision encore plus fine — l'oreille doit suivre davantage de pas.",
    subdivOptions: [{ kick: 10, snare: 5, hat: 10 }],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 2, rollChance: 0.15,
    density: { kickMin: 0, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  mkLevel(11, 'Rafale (complète)', {
    preamble: "Plusieurs rafales possibles maintenant, sur n'importe quelle ligne.",
    subdivOptions: [6, 7],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 2, rollChance: 0.5,
    density: { kickMin: 0, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  mkLevel(12, 'Reproduire un preset (House)', {
    variant: { snare: true, hat: true }, rollMax: 2, presetId: 'house', forceVariantCount: 1, forceRollCount: 1 }),
  mkLevel(13, 'Reproduire un preset (Dancehall)', {
    variant: { snare: true, hat: true }, rollMax: 2, presetId: 'dancehall', forceVariantCount: 1, forceRollCount: 1 }),
  // ---------- Round 2 : Swing + Traîne, entrelacés, avec presets ----------
  /* ---------- Acte 2 : le groove, ÉCRIT ----------
   *
   * ⚠️ Ces trois-là (14, 17, 23) partagent EXACTEMENT la même grille, et c'est
   * tout l'exercice : ce qui change d'un niveau à l'autre ne se voit pas dans
   * les cases, il s'entend. Un tirage de densité rendait la comparaison
   * impossible — on ne pouvait pas savoir si ce qu'on entendait venait du
   * balancement ou d'un motif différent.
   *
   * Le charley couvre les seize cases, donc tous les pas IMPAIRS, seuls
   * retardés par le swing (voir `contexte` dans parametres.ts). Sur un motif
   * posé uniquement sur les pas pairs, le swing n'aurait aucun effet audible.
   *
   * ⚠️ LA GRILLE EST EN DOUBLES-CROCHES depuis le 2026-08-31, et ce n'est pas
   * cosmétique. Retour de Yann : « acte 1 : la progression est trop lente, tu
   * peux rendre le jeu nettement plus difficile ; acte 2 : idem ». Mesuré dans
   * l'ordre réel de la carrière, le trio valait 24 cases et 12 notes — soit
   * moins que le 6e exercice de l'acte 1, joué huit exercices plus tôt. Il en
   * vaut 48 et 23. Ce qui monte est la RÉSOLUTION, pas le nombre d'idées : le
   * kick et la claire restent sur des pas PAIRS (donc jamais retardés par le
   * swing), ce qui laisse « le kick tient le temps » exactement vrai. */
  /* ⚠️ LE BALANCEMENT, seul de son espèce depuis le 2026-09-01.
   *
   * Ce niveau ouvrait un TRIO (14, 17, 23) qui partageait une seule grille,
   * pour que deux balancements soient comparables. Retour de Yann, cinq fois
   * dans la même relecture : *« les rythmes se ressemblent trop »*. La
   * comparaison passe désormais par `regler` — un curseur qu'on vise contre une
   * cible dit la même chose qu'une seconde reproduction, en un geste et sans
   * refaire seize cases. Les grilles de l'acte 2 sont donc toutes différentes.
   *
   * Son balancement monte de 12 à 26 : « léger » n'avait de sens que face au
   * « franc » du niveau 17. Seul, il doit s'entendre. */
  mkLevel(14, 'Le balancement', {
    preamble: "Seize cases par ligne, et un rythme qui ne tombe plus là où tu l'attends : le kick sort du temps trois fois, la claire aussi. Par-dessus, le charley « balance » — les doubles-croches arrivent un peu en retard, et la boucle cesse d'être carrée. Tu viens de le régler au curseur ; là, il faut le tenir.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      swing: 26,
    } }),
  mkLevel(15, 'Traîne (drag)', {
    preamble: "Une ligne entière peut traîner légèrement derrière le tempo (drag) — un décalage collectif et constant, pas note par note.",
    subdivOptions: [6, 7], dragOptions: [5], swingOptions: [0, 10],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 2, rollChance: 0.3,
    density: { kickMin: 1, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  mkLevel(16, 'Reproduire un preset (UK Garage)', {
    preamble: "Le swing de ce preset est très marqué (45%) — pas un hasard, c'est ce chapitre qu'il illustre.",
    variant: { snare: true, hat: true }, rollMax: 2, presetId: 'garage', forceVariantCount: 1, forceRollCount: 1 }),
  /* ⚠️ Au RÉSERVOIR depuis le 2026-09-01 : il était la seconde moitié du trio
   * comparatif (« la même grille, exactement »), et le trio est dissous. Un
   * niveau ne se supprime jamais, il cesse d'être cité — mais son préambule ne
   * peut plus parler d'une grille voisine, sinon il ment en salle de
   * répétition, où on le joue seul. */
  mkLevel(17, 'Le balancement, prononcé', {
    preamble: "Un balancement franc, celui qu'on ne peut pas rater : un temps sur deux arrive nettement en retard. Le kick, lui, ne bouge pas — c'est contre lui que tout se mesure.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      swing: 30,
    } }),
  mkLevel(18, 'Traîne (drag)', {
    preamble: "La traîne s'accentue.",
    subdivOptions: [7, 8], dragOptions: [5, 10, 15], swingOptions: [0, 10, 20],
    variant: { snare: true, hat: true }, variantChance: 0.35, rollMax: 3, rollChance: 0.3,
    density: { kickMin: 1, kickMax: 2, snareMin: 0, snareMax: 1, hatMin: 0.5, hatMax: 0.65 } }),
  mkLevel(19, 'Reproduire un preset (Gqom)', {
    preamble: "Ce preset a une vraie traîne naturelle (12%) — un kick minimaliste (un seul temps) pour bien l'entendre sans bruit parasite.",
    variant: { snare: true, hat: true }, rollMax: 3, presetId: 'gqom', forceVariantCount: 1, forceRollCount: 1 }),
  // ---------- Round 3 : Ghost + Fill, un niveau chacun, puis preset dédié ----------
  mkLevel(20, 'Ghost notes', {
    preamble: "Des ghost notes (discrètes, en arrière-plan) peuvent apparaître dans ce que tu écoutes — elles ne se devinent pas comme les autres notes, elles s'entendent.",
    subdivOptions: [6, 7, 8], swingOptions: [0, 10], dragOptions: [0, 10],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 2, rollChance: 0.3,
    ghost: true,
    density: { kickMin: 1, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.5, hatMax: 0.65 } }),
  mkLevel(21, 'Fill', {
    preamble: "Et des fills (petites relances en fin de mesure), qui reviennent régulièrement casser la boucle.",
    subdivOptions: [7, 8, 9], swingOptions: [0, 10, 20], dragOptions: [0, 10, 15],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 2, rollChance: 0.3,
    ghost: true, fill: true,
    density: { kickMin: 1, kickMax: 2, snareMin: 0, snareMax: 1, hatMin: 0.55, hatMax: 0.7 } }),
  mkLevel(22, 'Reproduire un preset (House French touch)', {
    preamble: "Ghost notes et fill sont activés pour l'occasion sur ce preset qui les a naturellement (fill toutes les 4 mesures) — écoute-les en contexte.",
    variant: { snare: true, hat: true }, rollMax: 3, presetId: 'housefrenchtouch',
    forceVariantCount: 1, forceRollCount: 1,
    presetGhostDensity: 15, presetGhostRow: 'snare', presetFillEvery: 4 }),
  // ---------- Round 4 : Décalage (seul) + Polyrythmie, avec presets ----------
  /* ⚠️ GRILLE NEUVE (2026-09-01) — elle reprenait celle du 14 case pour case,
   * au titre du trio comparatif dissous. Ce qu'elle garde du trio : aucune
   * variante, aucune rafale, et le kick sur des pas PAIRS, les seuls que le
   * swing ne retarde pas — le point fixe reste fixe, ce qui est la condition
   * pour qu'un décalage s'entende. */
  mkLevel(23, 'Une ligne en retard', {
    preamble: "Une autre grille, sans balancement du tout — mais le charley traîne derrière les deux autres. Une ligne peut être décalée toute seule, en avance ou en retard : c'est ce qui fait qu'un batteur ne sonne pas comme une machine. Le kick et la claire, eux, ne bougent pas.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      swing: 0,
      /* Le charley seul, et en RETARD : décalé contre deux lignes qui, elles,
       * ne bougent pas. Un décalage n'existe que par rapport à un point fixe —
       * tout décaler ensemble ne s'entendrait pas (c'est exactement ce qui
       * rend la traîne globale inutilisable comme exercice). */
      shift: { hat: 12 },
    } }),
    /* ---------- Les deux polyrythmies qui restent ----------
   *
   * ⚠️ Il y en avait CINQ (24, 26, 29, 30, 31), et elles enseignaient deux
   * choses. Les préambules le disaient eux-mêmes : le 30 annonce « le même
   * rapport 4:3 qu'au niveau précédent », le 31 « le vrai défi de lecture ».
   * Trois niveaux pour un seul rapport, dont un qui admet ne mesurer que
   * l'endurance de lecture ; et le 26 est « une nouvelle combinaison » du 24,
   * c'est-à-dire le même exercice retiré au sort.
   *
   * Deux restent, parce qu'elles enseignent deux idées différentes :
   *   - 24 : trois cycles PREMIERS entre eux (3, 4, 5) qui ne retombent
   *     ensemble qu'au bout de la mesure ;
   *   - 29 : un vrai cross-rhythm 4:3, celui de l'afro-cubain.
   *
   * Les trois autres restent au réservoir, jamais cités — un niveau ne se
   * supprime pas (voir la recherche par id dans `demarrerEtape`), il cesse
   * d'être cité. */
  /* ⚠️ 3/4/5 et six notes jusqu'au 2026-08-31 : DOUZE cases, la grille la plus
   * légère du jeu après le tout premier backbeat — et c'était le DERNIER
   * exercice de l'acte 5, joué en 41e position sur 43. Un acte ne finit pas
   * sur son exercice le plus facile. Les cycles restent premiers entre eux
   * (c'est ça, la leçon), ils sont simplement assez longs pour qu'on ne les
   * compte plus d'un coup d'œil : 5, 7 et 9. */
  mkLevel(24, 'Trois cycles à la fois', {
    preamble: "Chaque ligne peut avoir sa propre longueur de cycle. Ici le kick boucle en 5, la claire en 7, le charley en 9 : aucune des trois ne partage un pas avec une autre ailleurs qu'au tout début, et elles ne retombent ensemble qu'à la fin de la mesure. C'est ça, une polyrythmie.",
    tempoOptions: [96, 104],
    grille: {
      subdiv: { kick: 5, snare: 7, hat: 9 },
      kick:  [1, 0, 1, 0, 0],
      snare: [1, 0, 0, 1, 0, 1, 0],
      hat:   [1, 0, 1, 1, 0, 1, 0, 1, 0],
    } }),
mkLevel(25, 'Reproduire un preset (Clave)', {
    preamble: "Kick, snare et hat n'ont déjà plus du tout la même subdivision entre eux dans ce preset — la meilleure passerelle vers la polyrythmie.",
    variant: { snare: true, hat: true }, rollMax: 3, presetId: 'clave', forceVariantCount: 1, forceRollCount: 1 }),
  mkLevel(26, 'Polyrythmie', {
    preamble: "Une nouvelle combinaison de subdivisions à croiser.",
    subdivOptions: [{ kick: 4, snare: 5, hat: 3 }, { kick: 5, snare: 3, hat: 4 }, { kick: 3, snare: 5, hat: 4 }],
    swingOptions: [0, 10], dragOptions: [0, 10], shiftOptions: [-5, 5],
    variant: { snare: true, hat: true }, variantChance: 0.35, rollMax: 3, rollChance: 0.3,
    density: { kickMin: 0, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.5, hatMax: 0.65 } }),
  mkLevel(27, 'Reproduire un preset (Dembow)', {
    preamble: "Subdivisions très différentes par ligne, syncopation serrée sur la snare — un vrai test de polyrythmie en conditions réelles.",
    variant: { snare: true, hat: true }, rollMax: 3, presetId: 'dembow', forceVariantCount: 1, forceRollCount: 1 }),
  // ---------- Mesure longue, puis polyrythmie étirée sur le même rapport 4:3 ----------
  mkLevel(28, 'Mesure longue', {
    preamble: "La mesure s'étire à 16 pas sur les 3 lignes — aucune nouvelle notion, juste une mesure bien plus longue à tenir avec précision.",
    subdivOptions: [{ kick: 16, snare: 16, hat: 16 }],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 3, rollChance: 0.3,
    density: { kickMin: 1, kickMax: 2, snareMin: 0, snareMax: 1, hatMin: 0.5, hatMax: 0.65 } }),
    mkLevel(29, 'Quatre contre trois', {
    preamble: "Le cross-rhythm le plus répandu au monde : le kick et le charley en 8, la caisse claire en 6. Quatre coups d'un côté, trois de l'autre, sur la même durée — l'ossature de presque tout l'afro-cubain.",
    tempoOptions: [92, 100],
    grille: {
      subdiv: { kick: 8, snare: 6, hat: 8 },
      kick:  [1, 0, 1, 0, 1, 0, 1, 0],
      snare: [1, 0, 1, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
    } }),
mkLevel(30, 'Polyrythmie — 16 contre 12', {
    preamble: "Le même rapport 4:3 qu'au niveau précédent, mais étiré sur une mesure deux fois plus longue.",
    subdivOptions: [{ kick: 16, snare: 12, hat: 16 }],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 3, rollChance: 0.3,
    density: { kickMin: 0, kickMax: 2, snareMin: 0, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  mkLevel(31, 'Polyrythmie — 32 contre 24', {
    preamble: "Le vrai défi de lecture : kick à 32 pas contre snare à 24 (toujours 4:3) — le hat reste volontairement plus simple pour ne pas surcharger l'écran. Le reste (variante, rafale, densité) redescend volontairement : la difficulté ici, c'est la lecture, pas autre chose en plus.",
    subdivOptions: [{ kick: 32, snare: 24, hat: 8 }],
    tempoOptions: [72, 80], variant: { snare: true, hat: true }, variantChance: 0.2, rollMax: 2, rollChance: 0.15,
    density: { kickMin: 0, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.4, hatMax: 0.5 } }),
  // ---------- Ancrage : preset polyrythmique réel après l'arc abstrait 28-31 ----------
  mkLevel(32, 'Reproduire un preset (Funk James Brown)', {
    preamble: "Après quatre niveaux de polyrythmie abstraite, retour à un vrai morceau qui l'utilise nativement : kick en 16, snare en 4, hat en 16 — le même principe, mais dans un groove reconnaissable.",
    variant: { snare: true, hat: true }, rollMax: 3, presetId: 'funk', forceVariantCount: 1, forceRollCount: 1 }),
  // ---------- Finale ----------
  mkLevel(33, 'Tout combiné', {
    preamble: "Dernière ligne droite : tous les principes précédents peuvent se combiner en même temps.",
    subdivOptions: [{ kick: 4, snare: 5, hat: 6 }, { kick: 5, snare: 6, hat: 4 }, { kick: 6, snare: 4, hat: 5 }],
    tempoOptions: [76, 84, 132, 140], swingOptions: [10, 20, 30], dragOptions: [10, 15, 20],
    shiftOptions: [-10, -5, 5, 10], variant: { snare: true, hat: true }, variantChance: 0.4,
    rollMax: 3, rollChance: 0.35, ghost: true, fill: true,
    density: { kickMin: 1, kickMax: 2, snareMin: 0, snareMax: 1, hatMin: 0.55, hatMax: 0.75 } }),
  mkLevel(34, 'Reproduire un preset (Trap moderne)', {
    preamble: "Le vrai défi final : Trap moderne a déjà une polyrythmie naturelle (kick/8, snare/4, hat/16) — variante, rafale, décalage, ghost et fill y sont tous ajoutés pour l'occasion. Tout ce que la campagne a enseigné, dans un seul rythme.",
    variant: { snare: true, hat: true }, rollMax: 4, presetId: 'trapmodern',
    forceVariantCount: 2, forceRollCount: 2, presetForceShift: true,
    shiftOptions: [-15, -10, -5, 5, 10, 15],
    // fillEvery abaissé de 4 à 2 : purement décoratif (jamais dans la cible
    // vérifiée), donc toutes les 4 mesures était trop rare pour être remarqué
    // pendant une session de test normale — 2 mesures le rend audible plus vite
    // sans changer ce qui est noté.
    presetGhostDensity: 12, presetGhostRow: 'kick', presetFillEvery: 2 }),

  /* ---------- Pilotes des trois nouveaux verbes ----------
   *
   * Un niveau de chacun, pour les essayer et les comparer avant d'en écrire
   * une campagne. Ils sont posés APRÈS le 34 : la progression existante n'est
   * pas touchée, et le joueur qui finit la campagne les trouve en bonus.
   * Accessibles tout de suite avec le pseudo « master » ou #boss.
   */
  // Subdivision 16 et non 8 : « compléter » vide un quart de la boucle, et un
  // quart de 8 pas fait deux doubles-croches par ligne — six cases en tout,
  // mesurées à l'écran. Ce n'est pas un temps à retrouver, c'est un trou. À 16,
  // le temps vidé fait quatre cases par ligne : assez pour qu'il y ait quelque
  // chose à entendre et à reposer.
  mkLevel(35, 'Complète le temps manquant', {
    exercise: 'completer',
    preamble: "Trois temps sur quatre te sont donnés, le quatrième manque — c'est celui qu'encadre le liseré turquoise, et il n'est pas toujours au même endroit. Écoute la boucle entière, puis retrouve ce qui y manque : c'est plus facile que de partir de rien, et c'est comme ça qu'on écrit vraiment.",
    subdivOptions: [16], rowsActive: { kick: true, snare: true, hat: true },
    tempoOptions: [92, 100],
    density: { kickMin: 2, kickMax: 3, snareMin: 1, snareMax: 2, hatMin: 0.4, hatMax: 0.6 } }),
  mkLevel(36, 'Trouve l’intrus', {
    exercise: 'intrus',
    preamble: "Quatre mesures s'enchaînent. Trois sont identiques, une seule diffère. Aucune grille à remplir : rien que l'oreille.",
    subdivOptions: [8], rowsActive: { kick: true, snare: true, hat: true },
    density: { kickMin: 1, kickMax: 2, snareMin: 0.5, snareMax: 1, hatMin: 0.4, hatMax: 0.7 } }),
  // Kick seul, et assez fourni pour qu'il y ait un motif à jouer : à 4 pas avec
  // kickMin/Max à 1, la boucle sortait DEUX frappes — on ne joue pas en rythme
  // sur deux frappes, on appuie deux fois.
  //
  // 37 et 38 sont le MÊME exercice par deux sens différents (voir jouerIndice) :
  // montrer la grille ET faire sonner le kick ne demanderait que de suivre un
  // point lumineux. À l'oreille, la grille reste vide ; à vue, le kick se tait
  // et le hat en croches donne la pulsation.
  // Tempo abaissé (84/92 → 72/80) après essai : « 37 trop dur ». Reproduire à
  // l'oreille demande d'entendre, de retenir, puis de placer — trois choses,
  // pas une. Le vrai correctif est ailleurs (on peut désormais ÉCOUTER autant
  // qu'on veut avant d'armer, et calibrer sa latence), mais un tempo plus lent
  // laisse le temps de faire les trois.
  mkLevel(37, 'Joue en rythme — à l’oreille', {
    exercise: 'jouer', jouerIndice: 'ecoute',
    preamble: "La boucle tourne, la grille reste vide : c'est à l'oreille. Écoute-la autant de fois qu'il faut, puis « ⏺ Jouer » — un précompte de quatre clics te donne le tempo avant que ça compte. Si tes frappes tombent toutes du même côté, le bouton 🎚 Latence règle le retard de ton appareil une fois pour toutes.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    // 84/92 → 72/80 → 64/72 : deux passes après essai. Le tempo n'était pas la
    // cause principale (voir justesseDesFrappes, qui moyennait tout le tour au
    // lieu de retenir la meilleure mesure), mais à l'oreille il faut entendre,
    // retenir PUIS placer — trois choses, et chacune prend du temps.
    // ⚠️ Le TEMPO reste bas — il a été baissé deux fois après essai, et ce
    // n'est pas lui qu'on remonte. Ce qui monte est le nombre de coups à
    // retenir : 2-3 → 3-4, sur les mêmes huit cases.
    tempoOptions: [64, 72], density: { kickMin: 3, kickMax: 4, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(38, 'Joue en rythme — à vue', {
    exercise: 'jouer', jouerIndice: 'lecture',
    preamble: "Cette fois le kick est muet : tu vois le motif, tu ne l'entends pas. Le hat te donne la pulsation, à toi de poser les coups au bon endroit. Écoute d'abord si tu veux, puis « ⏺ Jouer ».",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: true },
    // ⚠️ Jamais abaissé jusqu'ici : le 38 était resté le plus RAPIDE des trois
    // pilotes alors qu'il demande de lire un motif ET de le jouer.
    tempoOptions: [68, 76],
    // Hat sur toutes les croches : c'est la pulsation, pas un motif. Sans elle,
    // « à vue » se jouerait dans le silence — donc au hasard.
    // 2-3 → 4-5 coups en plus de l'ancre : « à vue » est le plus dur des deux
    // pilotes, il doit aussi être le plus chargé.
    density: { kickMin: 4, kickMax: 5, snareMin: 0, snareMax: 0, hatMin: 1, hatMax: 1 } }),

  /* ---------- Pilotes des trois verbes de PARAMÈTRE (famille Timbre) ----------
   *
   * Même méthode que pour les verbes de grille : un niveau de chacun, pour les
   * essayer avant d'en écrire une progression. La difficulté monte dans l'ordre
   * — entendre la direction, puis nommer, puis viser une valeur.
   *
   * Timbre en premier parce que ses quatre boutons s'entendent franchement et
   * n'interagissent pas avec le séquenceur : ce qu'on teste est bien l'oreille,
   * pas la lecture d'une grille.
   */
  mkLevel(39, 'Lequel est le plus… ?', {
    exercise: 'lequel', familleParam: 'timbre',
    // ⚠️ Ces trois niveaux sont les trois premiers exercices du JEU (acte 0,
    // « Le café ») : l'Atelier n'y est pas encore ouvert, et le récit annonce
    // exactement ce qu'on va écouter — la hauteur, la durée, l'attaque.
    // `tone` en est exclu : c'est le mot le plus opaque de la famille pour qui
    // n'a jamais vu un curseur, et sur la snare comme sur le hat il déplace un
    // filtre plutôt qu'il ne change une note.
    paramsAutorises: ['pitch', 'decay', 'attack'],
    preamble: "Trois versions du même son, un seul réglage change. Écoute-les et désigne celle qu'on te demande. Ici on n'attend pas de chiffre : juste d'entendre dans quel SENS un bouton pousse le son.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    tempoOptions: [90], density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(40, 'Qu’est-ce qui a changé ?', {
    exercise: 'nommer', familleParam: 'timbre',
    // ⚠️ Ces trois niveaux sont les trois premiers exercices du JEU (acte 0,
    // « Le café ») : l'Atelier n'y est pas encore ouvert, et le récit annonce
    // exactement ce qu'on va écouter — la hauteur, la durée, l'attaque.
    // `tone` en est exclu : c'est le mot le plus opaque de la famille pour qui
    // n'a jamais vu un curseur, et sur la snare comme sur le hat il déplace un
    // filtre plutôt qu'il ne change une note.
    paramsAutorises: ['pitch', 'decay', 'attack'],
    preamble: "Deux sons, un seul réglage les sépare. Lequel ? C'est l'exercice le plus utile des trois : tant qu'on n'a pas de NOM pour ce qu'on entend, on ne peut pas le régler.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    tempoOptions: [90], density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(41, 'Règle-le à l’oreille', {
    exercise: 'regler', familleParam: 'timbre',
    // ⚠️ Ces trois niveaux sont les trois premiers exercices du JEU (acte 0,
    // « Le café ») : l'Atelier n'y est pas encore ouvert, et le récit annonce
    // exactement ce qu'on va écouter — la hauteur, la durée, l'attaque.
    // `tone` en est exclu : c'est le mot le plus opaque de la famille pour qui
    // n'a jamais vu un curseur, et sur la snare comme sur le hat il déplace un
    // filtre plutôt qu'il ne change une note.
    paramsAutorises: ['pitch', 'decay', 'attack'],
    preamble: "Un son cible, un curseur, et rien d'affiché. Retrouve le réglage. On ne te demande pas le chiffre exact — deux réglages qu'on ne distingue pas sont la même réponse.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    tempoOptions: [90], density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),

  /* ---------- Acte 3, « La mélodie » : le verbe de HAUTEUR ----------
   *
   * Les trois exercices que le récit demande, dans son ordre :
   * « les hauteurs ; les gammes ; la basse ; les motifs ; la répétition ».
   *
   * On reste sur la BASSE et sur une seule octave : monophonique, une note par
   * pas, degrés d'une gamme. C'est ce qui permet de réutiliser `comparerGrilles`
   * tel quel (une case porte un nombre, le comparateur ne fait que des `===`)
   * au lieu d'un second comparateur qui finirait par diverger.
   */
  /* ---------- L'acte 3 : mélodie, PUIS basse ----------
   *
   * ⚠️ L'ordre vient de Yann (2026-09-01) : *« commencer par la ligne de
   * mélodie puis la basse puis la nappe, les additionner »*. Il n'est pas
   * décoratif — une phrase se chante, une basse se sent ; on retrouve plus
   * facilement à l'oreille ce qu'on saurait fredonner. La basse vient ensuite
   * parce qu'elle se pose SOUS quelque chose.
   *
   * ⚠️ La NAPPE n'a pas d'exercice : `melodie` est monophonique par conception
   * et la nappe joue des accords. Elle s'ajoute par un cahier — un exercice
   * mentirait sur ce qu'elle fait. */
  mkLevel(42, 'Reposer une phrase', {
    exercise: 'melodie',
    preamble: "Une phrase de mélodie joue en boucle. Repose-la : choisis une case, appuie sur le degré entendu, la case suivante se sélectionne toute seule. La tonique du premier pas t'est donnée — c'est le repère. Les cinq premiers degrés seulement, de quoi entendre monter et descendre sans se perdre.",
    tempoOptions: [86, 92],
    // 3-4 notes → 5-6 : une phrase de trois notes se retient sans l'entendre,
    // c'est de la chance autant que de l'oreille.
    melodie: { ligne: 'melody', pas: 8, degreMax: 5, notesMin: 5, notesMax: 6 } }),
  mkLevel(43, 'La basse, sous la phrase', {
    exercise: 'melodie',
    preamble: "On descend d'un étage : la basse. Elle se répète — la seconde moitié reprend la première, note pour note — et c'est ce qui la rend tenable : une basse qui change tout le temps ne porte rien. Seize pas, huit à trouver. Le ⌫ efface la case choisie.",
    tempoOptions: [86, 92],
    /* « Trop facile » (Yann, 2026-09-01), et il avait raison sur les chiffres :
     * huit pas dont un motif de quatre, c'était trois notes à retrouver. Seize
     * pas dont un motif de huit, sur toute la gamme, en fait sept. */
    melodie: { ligne: 'bass', pas: 16, degreMax: 7, notesMin: 6, notesMax: 8, motif: true } }),
  mkLevel(44, 'Toute la gamme', {
    exercise: 'melodie',
    preamble: "Les sept degrés, seize pas, et aucune répétition pour t'aider : la phrase ne revient pas sur elle-même. Les degrés hauts sont les plus durs à situer — compte depuis la tonique si tu te perds, c'est le degré 1, et c'est là que la phrase se repose.",
    tempoOptions: [80, 88],
    /* Le sommet de l'acte : toute la gamme, seize pas, et le motif RETIRÉ —
     * c'est lui qui divisait le travail par deux au niveau d'avant. */
    melodie: { ligne: 'melody', pas: 16, degreMax: 7, notesMin: 9, notesMax: 11 } }),

  /* ---------- Acte 2, « Le groove » : des paramètres qu'on RÈGLE ----------
   *
   * ⚠️ Retour de Yann : « pour le groove, on ne comprend pas pourquoi il y a
   * les rafales et les charleys ouverts, rim shot, personne n'explique, ce
   * n'est pas lié au groove. le groove, ce sont des paramètres qu'on doit
   * pouvoir régler. » L'acte citait des grilles à reproduire ; il cite
   * désormais les trois verbes de PARAMÈTRE sur la famille `groove`.
   *
   * Et c'est ici que `nommer` et `regler` trouvent enfin leur place : l'Atelier
   * est ouvert depuis l'acte 1, donc les mots « Swing » et « Décalage » sont
   * sur des curseurs que le joueur a déjà vus. À l'acte 0 ils ne renvoyaient à
   * rien.
   */
  mkLevel(45, 'Le swing, à l’oreille', {
    exercise: 'lequel', familleParam: 'groove', paramsAutorises: ['swing'],
    preamble: "Le kick tient le temps ; ce sont les croches du hat qui bougent — c'est ça, le swing : les temps faibles reculent un peu, et la boucle cesse d'être carrée.",
    subdivOptions: [8], tempoOptions: [92] }),
  mkLevel(46, 'Le décalage, à l’oreille', {
    exercise: 'lequel', familleParam: 'groove', paramsAutorises: ['shiftPct'],
    preamble: "Cette fois c'est la ligne entière qui glisse, en avance ou en retard sur le kick. Un décalage ne s'entend que par rapport à quelque chose : écoute le kick, il ne bouge pas.",
    subdivOptions: [8], tempoOptions: [92] }),
  /* ⚠️ La liste est EXPLICITE, et c'est le titre qui l'impose : « Swing ou
   * décalage ? » nomme deux réglages. `nommer` prend ses leurres dans toute la
   * famille — la famille `groove` en comptant cinq depuis 2026-08-31, ce niveau
   * serait devenu une question à quatre choix dont le titre annonce deux, sans
   * qu'aucun test ne bronche. Un niveau qui gagne des leurres en silence parce
   * qu'on a enrichi un catalogue est la version discrète du préambule qui ment. */
  mkLevel(47, 'Swing ou décalage ?', {
    exercise: 'nommer', familleParam: 'groove', paramsAutorises: ['swing', 'shiftPct'],
    preamble: "Deux boucles, un seul réglage les sépare. Le swing ne touche qu'un temps sur deux ; le décalage pousse toute la ligne. Mettre un nom sur ce qu'on entend, c'est ce qui permet ensuite d'aller le régler.",
    subdivOptions: [8], tempoOptions: [92] }),
  mkLevel(48, 'Règle le swing', {
    exercise: 'regler', familleParam: 'groove', paramsAutorises: ['swing'],
    preamble: "Une boucle cible, un curseur. Retrouve son balancement. On ne cherche pas le chiffre : deux swings qu'on ne distingue pas sont la même réponse.",
    subdivOptions: [8], tempoOptions: [92] }),

  /* ---------- Acte 0, « Le café » : les quatre mots de l'écoute ----------
   *
   * ⚠️ Retour de Yann : « je ne sais même pas expliquer ce que c'est decay,
   * pourquoi c'est dès le début ce concept ?? » — et il avait raison plus
   * largement que le mot. L'acte 0 utilisait `nommer` et `regler`, deux verbes
   * de VOCABULAIRE, alors que l'Atelier est fermé : on demandait de nommer des
   * curseurs jamais vus.
   *
   * Il ne reste donc que `lequel`, qui parle en PROPRIÉTÉS et jamais en
   * étiquettes (« laquelle sonne la plus grave ? »), et un verbe neuf pour le
   * silence. Les quatre exercices sont les quatre mots de `HISTOIRE.md` :
   * « la hauteur ; la durée ; l'intensité ; le silence ».
   */
  mkLevel(49, 'La hauteur', {
    exercise: 'lequel', familleParam: 'timbre', paramsAutorises: ['pitch'],
    preamble: "Une seule chose change d'une version à l'autre : la hauteur. Aucun chiffre à trouver, aucun réglage à nommer — on désigne juste celle qu'on te demande.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    tempoOptions: [90], density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(50, 'La durée', {
    exercise: 'lequel', familleParam: 'timbre', paramsAutorises: ['decay'],
    preamble: "Même exercice, autre propriété : cette fois c'est la durée du son qui change. Certains s'arrêtent net, d'autres traînent.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    tempoOptions: [90], density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(51, 'L’intensité', {
    exercise: 'lequel', familleParam: 'timbre', paramsAutorises: ['volume'],
    preamble: "Et la troisième : l'intensité. C'est la plus facile à entendre et la plus facile à mal juger — un son plus aigu paraît souvent plus fort qu'il ne l'est.",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: false },
    tempoOptions: [90], density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  /* ⚠️ SEIZE PAS depuis le 2026-09-04 — *« trouver un moyen pour que ce soit
     plus complexe »* (Yann, en jouant l'acte 0). À huit, la pulsation est en
     croches : sept trous possibles, chacun long d'une croche, et l'exercice se
     résolvait en comptant. À seize, c'est la double-croche — quinze positions,
     et un trou deux fois plus court, donc entendu au lieu d'être compté.

     Ce n'est pas devenu un `intrus` (l'autre piste évoquée) : le verbe
     n'exige aucun vocabulaire, et c'est précisément ce qui lui donne sa place
     à l'acte 0, où le joueur n'a encore aucun mot. Le rendre plus dur ne
     demandait donc pas d'en changer.

     ⚠️ Le tempo NE monte pas avec la résolution : une double-croche à 96
     dure déjà 156 ms, et ce qu'on veut faire entendre est un trou, pas une
     course. */
  mkLevel(52, 'Le silence', {
    exercise: 'silence',
    preamble: "Une pulsation régulière en doubles-croches, et un coup qui manque. Lequel ? C'est la quatrième chose qu'on apprend à entendre, et la moins évidente : le silence fait partie du rythme, il ne l'interrompt pas.",
    tempoOptions: [88, 96], silencePas: 16 }),

  /* ---------- Acte 4, « La production » : ça sonne où ? ----------
   *
   * `HISTOIRE.md` fait apprendre six choses ici — EQ, compression, filtre,
   * réverbération, delay, espace entre les instruments. Trois d'entre elles
   * sont des boutons du modèle et forment déjà la famille `filtre` (filtre
   * passe-bas, réverbe, delay) ; l'EQ et la compression sont GLOBALES et n'ont
   * pas de version par ligne, donc rien à faire entendre ligne contre ligne.
   * Elles ne sont pas citées plutôt que citées à moitié.
   *
   * Mais le cœur de l'acte n'est aucune des six : c'est *« ton morceau est bon
   * dans ton ordinateur, ici il est mauvais »*. D'où le niveau 53 et son verbe
   * à lui — voir `laverie` dans `exercises.ts`. Il ouvre l'acte, parce que
   * c'est lui qui donne une raison aux trois autres.
   */
  mkLevel(53, 'Le petit haut-parleur', {
    exercise: 'laverie',
    preamble: "Trois versions du même kick, sur le haut-parleur de la laverie. Une seule tient encore. Tu peux repasser sur le moniteur du studio quand tu veux — c'est en comparant les deux qu'on entend le problème, jamais sur un seul.",
    subdivOptions: [8], tempoOptions: [92],
    rowsActive: { kick: true, snare: false, hat: false },
    density: { kickMin: 0, kickMax: 0, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(54, 'Ce qu’on enlève en haut', {
    exercise: 'lequel', familleParam: 'filtre', paramsAutorises: ['filterCutoff'],
    preamble: "Le filtre passe-bas coupe les aigus. C'est le premier geste de mixage : on enlève plutôt qu'on ajoute, parce que deux instruments qui occupent la même bande s'effacent l'un l'autre.",
    subdivOptions: [8], tempoOptions: [92] }),
  mkLevel(55, 'L’espace', {
    exercise: 'lequel', familleParam: 'filtre', paramsAutorises: ['reverbSend'],
    preamble: "La réverbe éloigne. C'est ce qui place un son au fond de la pièce plutôt que contre l'oreille — et ce qui, en trop, transforme une boucle en bouillie sur un petit haut-parleur.",
    subdivOptions: [8], tempoOptions: [92] }),
  mkLevel(56, 'Réverbe ou delay ?', {
    exercise: 'nommer', familleParam: 'filtre',
    preamble: "Deux façons de créer de l'espace, et on les confond tout le temps. La réverbe étale ; le delay répète. Écoute si les répétitions se comptent : si oui, c'est un delay.",
    subdivOptions: [8], tempoOptions: [92] }),
  mkLevel(57, 'Règle l’espace', {
    exercise: 'regler', familleParam: 'filtre', paramsAutorises: ['reverbSend'],
    preamble: "Une cible, un curseur. On ne cherche pas le pourcentage : on cherche la même distance.",
    subdivOptions: [8], tempoOptions: [92] }),

  /* ---------- Acte 5, « Les styles » : reconnaître, puis reconstruire ----------
   *
   * L'acte vient d'une scène, pas d'une liste : le commercial de Zik'Mobile
   * n'arrive pas à dire ce qu'il veut, il finit par le fredonner, et c'est du
   * dancehall — *« Tu comprends immédiatement. Il ne savait simplement pas le
   * dire. »* Mettre le NOM sur le genre est ce qui manquait à l'autre bout du
   * fil, et c'est le verbe `style`.
   *
   * ⚠️ Le niveau ne fixe aucun preset : il tire un genre à chaque partie (voir
   * `stylePool` et `tirerStyle`). Un preset figé aurait fait de la culture des
   * styles un exercice de mémoire dès la deuxième partie.
   *
   * Les niveaux de reconstruction, eux, existent déjà dans le réservoir depuis
   * la campagne d'origine — 4 (Motown), 12 (House), 13 (Dancehall), 27
   * (Dembow), 32 (Funk). L'acte les CITE, il n'en fabrique pas : c'est
   * exactement le « tu écoutes, tu reconstruis, tu compares » du texte, et ça
   * ne coûte pas une ligne de données.
   */
  mkLevel(58, 'Le genre, à l’oreille', {
    exercise: 'style',
    preamble: "Une boucle, quatre genres. Aucun réglage à trouver : celui-là ne se mesure pas, il se reconnaît. Écoute le tempo, la place de la caisse claire, ce que fait le hi-hat — c'est là que les familles se séparent.",
    tempoOptions: [100] }),

  /* ---------- Acte 1, la suite : trois rythmes écrits de plus ----------
   *
   * Ajoutés à la FIN pour ne déplacer aucun identifiant existant — la carrière
   * cite les niveaux par leur `id`, et la salle de répétition les retient de
   * la même façon. Ils prolongent la série de l'acte 1 : après le rim shot
   * (niveau 5) viennent l'ouverture du charley, les deux ensemble, puis tout
   * ensemble. Chacun ajoute UNE chose. */
  mkLevel(59, 'Les charleys ouverts', {
    preamble: "Le charleston aussi a sa variante : reclique-le et il s'OUVRE — un « tss » qui traîne au lieu d'un « tic » sec. TROIS ouvertures ici, réparties dans la mesure, à repérer parmi seize croches fermées. La claire revient au repos : une nouveauté à la fois, mais posée assez de fois pour s'entendre.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true },
    grille: {
      // Trois ouvertures sur seize doubles-croches — chercher UNE case ouverte
      // dans une ligne, c'est de la loterie ; en chercher trois, c'est écouter.
      subdiv: { kick: 8, snare: 8, hat: 16 },
      kick:  [1, 0, 0, 1, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
    } }),
  mkLevel(60, 'Les deux à la fois', {
    preamble: "Les deux gestes que Sol vient de faire, dans le même rythme. Reclique une claire allumée : elle passe en RIM SHOT, le bord du fût et pas la peau. Reclique un charley : il s'OUVRE, un « tss » qui traîne. DEUX rim shots et TROIS ouvertures ici, sur trois lignes descendues à la double-croche — seize cases chacune, et la claire tombe deux fois hors des temps.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true },
    grille: {
      /* ⚠️ Le kick et la claire passent à leur tour en DOUBLES-CROCHES : c'est
       * la seule nouveauté du niveau, les deux variantes étant acquises aux
       * niveaux 5 et 59. Ce qui rend ce niveau plus dur n'est pas un
       * empilement, c'est la RÉSOLUTION — trois fois seize cases à lire, et
       * une claire qui tombe sur des seizièmes (7, 15). */
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 1, 0, 0, 2],
      hat:   [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
    } }),
  mkLevel(61, 'Tout ensemble', {
    preamble: "Le sommet de la série, et il ne contient rien que tu n'aies déjà fait : le kick qui sort du temps trois fois dont une sur un seizième, cinq claires dont deux en rim shot, trois charleys ouverts, et trois rafales de deux longueurs sur deux lignes. Quarante-huit cases, vingt-six coups. C'est ta sonnerie.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true }, rollMax: 4,
    grille: {
      /* Le sommet de l'acte : rien de neuf, tout à la fois, et toujours au
       * PLURIEL — c'est la différence entre « on a vu la rafale » et « on sait
       * poser une rafale ». Le kick sort du temps trois fois : deux fois sur
       * la croche (6, 14) et une fois sur un vrai seizième (3), le seul de
       * tout l'acte. */
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 2, 0, 0, 1],
      hat:   [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
      // Le 3e temps commence à l'index 8, son « et » est le 10.
      rolls: {
        hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 2, 1],
        snare: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3],
      },
    } }),

  /* ---------- Le palier de l'acte 2 ----------
   *
   * ⚠️ Écrit après un retour de testeur : « le jeu reste trop longtemps trop
   * facile ». Mesuré en parcourant les exercices dans l'ordre où la carrière
   * les joue : l'acte 1 finissait à 24 cases avec deux variantes et une
   * rafale (niveau 61), et l'acte 2 n'avait jamais dépassé 24 cases AVEC ZÉRO
   * variante — il était donc un cran EN ARRIÈRE.
   *
   * Les trois grilles identiques de l'acte 2 (14, 23, 17) restent identiques :
   * c'est la seule façon de comparer deux balancements, et ça ne se négocie
   * pas. Le palier s'ajoute APRÈS elles.
   *
   * ⚠️ Depuis le 2026-08-31 le trio est LUI AUSSI en doubles-croches (« acte 2
   * : idem », Yann) : ce niveau ne peut donc plus être « celui qui double la
   * résolution », c'était déjà fait. Ce qui le rend plus dur est ce que le
   * cahier de Kelvin laisse libre — LA CLAIRE. Le kick et le charley sont
   * imposés par la commande ; la claire, elle, se faufile sur six cases dont
   * quatre sont des pas IMPAIRS, ceux que le swing retarde. C'est la seule
   * ligne de tout le jeu qu'il faut placer contre un balancement.
   *
   * ⚠️ Et il est écrit pour ne satisfaire AUCUNE exigence de la commande de
   * Kelvin, dont il est le point de départ (`partirDu`) : kick sur les
   * quatre temps (donc jamais entre deux), charley sur les seize cases (donc
   * aucune place), pas une variante. Le cahier s'ouvre toujours à 0/4. */
  mkLevel(63, 'La claire qui se faufile', {
    preamble: "Le kick tient les quatre temps, le charley couvre les seize cases : ces deux-là ne bougent plus de l'exercice. Toute la difficulté est sur la caisse claire, qui tombe six fois et presque jamais sur un temps — et le balancement la déplace encore. C'est le rythme que Kelvin a en tête.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      swing: 20,
    } }),

  /* ---------- Ce qui bouge tout seul ----------
   *
   * Le premier niveau qui fait entendre les trois boutons d'ALÉA du groove —
   * ghost notes, vélocité aléatoire, rafales spontanées. Ils existaient dans
   * l'Atelier depuis toujours et le jeu n'en enseignait aucun ; les niveaux 20
   * et 21 les ANNONÇAIENT (« Ghost notes », « Fill ») sans que le code les
   * pose jamais, faute de champs lus (`GameLevel.ghost` / `.fill`).
   *
   * Les trois sont mesurés dans le contexte réel de l'exercice, et deux
   * candidats de plus ont été écartés parce que leur effet n'est pas monotone
   * (voir `parametres.ts`). */
  mkLevel(62, 'Ce qui bouge tout seul', {
    exercise: 'lequel', familleParam: 'groove',
    paramsAutorises: ['ghostDensity', 'randomVelocity', 'spontRoll'],
    preamble: "Trois boucles, la même grille. Ce qui change ici n'est écrit dans aucune case : la machine ajoute des coups, ou fait varier leur force, toute seule. C'est ce qui sépare une boîte à rythmes d'un batteur.",
    subdivOptions: [8], tempoOptions: [96] }),
  /* ---------- L'acte 0 se joue avec les MAINS ----------
   *
   * ⚠️ Refonte demandée par Yann : *« l'acte 0 est à refaire à 0, il faut
   * enlever les questions "lequel", mettre les questions de tap qu'on voit
   * dans l'acte 8 [= l'acte 7], bizarrement, elles seraient peut-être plus
   * pertinentes ici »*.
   *
   * Il avait raison, et la raison se dit en une phrase : **`lequel` demande un
   * JUGEMENT, `jouer` demande un GESTE.** Le tout premier écran du jeu
   * proposait trois questions à choix multiples à quelqu'un qui n'a encore
   * touché à rien — c'est un questionnaire d'entrée, pas une prise en main.
   * Taper le temps ne demande aucun mot, aucun bouton, aucune vocabulaire :
   * c'est la seule chose qu'un débutant sait déjà faire, et la seule qui le
   * mette tout de suite dans le rythme plutôt que devant lui. Ça répond aussi
   * au retour de testeur (« le jeu reste trop longtemps trop facile ») par
   * l'autre bout : ce n'est pas plus DUR, c'est plus ENGAGEANT.
   *
   * Les trois niveaux sont ÉCRITS, pas tirés — même raison qu'à l'acte 1 : une
   * courbe de trois exercices ne se dessine pas avec un générateur de densité.
   * Chacun n'ajoute qu'une chose :
   *
   *   64  les quatre temps, rien d'autre        — taper avec ce qu'on entend
   *   65  un coup de plus, hors des temps       — le contretemps
   *   66  le kick devient muet, le charley reste — lire au lieu d'entendre
   *
   * ⚠️ Les niveaux 37 et 38 de l'acte 7 RESTENT à l'acte 7 : ils sont cités
   * là-bas par décision documentée (`justesseDesFrappes` retient la meilleure
   * mesure consécutive, donc la notation pardonne un début raté — mot pour mot
   * ce que Sol répond avant de brancher les enceintes). On ajoute une paire à
   * l'acte 0, on ne déplace pas la leur. La différence est la difficulté : ici
   * la grille est posée et régulière, là-bas elle est tirée.
   *
   * ⚠️ Et c'est le premier écran du jeu qui expose la LATENCE de l'appareil.
   * Le calibrage est un bouton (🎚 Latence) et pas un passage obligé — le forcer
   * ferait commencer le jeu par un réglage. Deux filets existent déjà : le
   * préambule du 64 nomme le bouton, et l'écran propose de lui-même le
   * calibrage dès que quatre frappes tombent du même côté de plus de 25 ms. */
  mkLevel(64, 'Le temps', {
    exercise: 'jouer', jouerIndice: 'ecoute',
    preamble: "Quatre coups, un par temps, rien d'autre. Écoute la boucle autant de fois que tu veux, puis « ⏺ Jouer » : quatre clics de précompte te donnent le tempo, et tu tapes avec le kick. Si toutes tes frappes tombent du même côté, le bouton 🎚 Latence règle le retard de ton appareil une fois pour toutes.",
    // Le tempo reste tiré (deux valeurs) : ce n'est pas lui qu'on enseigne, et
    // la tolérance de placement est absolue (±130 ms), donc il ne change pas la
    // note — seulement le confort. 76-84, l'allure d'un pas.
    tempoOptions: [76, 84],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 1, 0, 1, 0, 1, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0],
      hat:   [0, 0, 0, 0, 0, 0, 0, 0],
    } }),
  mkLevel(65, 'Le contretemps', {
    exercise: 'jouer', jouerIndice: 'ecoute',
    preamble: "Les quatre temps sont toujours là, et il y a un coup de plus — juste après le deuxième. Il ne tombe sur aucun temps : il tombe entre deux. C'est ça, un contretemps, et c'est ce qui sépare un rythme d'un métronome. Écoute-le avant de le jouer.",
    tempoOptions: [80, 88],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      // Les quatre temps (0, 2, 4, 6) + le « et » du 2e temps (3).
      kick:  [1, 0, 1, 1, 1, 0, 1, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0],
      hat:   [0, 0, 0, 0, 0, 0, 0, 0],
    } }),
  mkLevel(66, 'À vue', {
    exercise: 'jouer', jouerIndice: 'lecture',
    preamble: "Cette fois le kick est MUET : tu vois le motif dessiné, tu ne l'entends pas. Le charley te donne la pulsation — huit croches régulières — et le contretemps a changé de place. Écoute d'abord si tu veux, puis « ⏺ Jouer ».",
    // Plus lent que le 65 : lire un motif ET le jouer, ce sont deux choses.
    tempoOptions: [72, 80],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      // Les quatre temps + le « et » du 3e (5), pas celui du 2e : le motif se
      // LIT, il ne se rejoue pas de mémoire depuis l'exercice précédent.
      kick:  [1, 0, 1, 0, 1, 1, 1, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0],
      // ⚠️ Sans cette ligne, « à vue » se jouerait dans le silence, donc au
      // hasard : le kick étant coupé, c'est le charley qui porte la pulsation.
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
    } }),

  /* ---------- L'ACTE 1 PREND SON TEMPS : un SUJET, deux exercices ----------
   *
   * ⚠️ Retour de Yann (2026-08-31), après la première passe de difficulté :
   * *« ça n'a pas assez changé, il faut modifier les niveaux pour que ce soit
   * plus difficile, beaucoup plus difficile. Par exemple : on ne doit pas
   * simplement changer une note en une rafale pour introduire rafale, il faut
   * que ce soit bien plus difficile. Pour chaque niveau, on a le sujet. On
   * peut faire plus d'exercices, prendre plus notre temps… »*
   *
   * Deux choses en découlent, et elles vont ensemble :
   *
   *   1. **Une nouveauté se pose au PLURIEL.** Une variante unique sur une
   *      ligne qui en compte deux se trouve par élimination, sans jamais
   *      l'entendre : le geste est acquis, la leçon ne l'est pas. Les niveaux
   *      5, 59, 8 et 61 posent donc deux à quatre occurrences, de longueurs et
   *      de timbres différents.
   *   2. **Un sujet vaut deux exercices**, pas un — « prendre plus notre
   *      temps ». D'où les quatre niveaux ci-dessous, qui donnent son second
   *      exercice à chacun des sujets qui n'en avait qu'un : la base, le
   *      charley, la syncope, la rafale.
   *
   * ⚠️ Ce n'est pas en contradiction avec « la progression est trop lente » :
   * ce qui était lent, c'était la MONTÉE, pas le nombre d'écrans. On ajoute
   * des marches, on n'en aplatit aucune — la suite des cases reste strictement
   * croissante (`tests/grilles-ecrites.test.ts`, « la courbe ne redescend
   * jamais »).
   *
   * Posés en FIN de tableau, comme tout niveau ajouté : carrière et salle de
   * répétition citent les niveaux par leur `id`. */

  mkLevel(67, 'Les quatre temps', {
    preamble: "Le premier rythme, et il tient en deux lignes : le kick frappe les QUATRE temps, la claire répond sur 2 et 4. Huit cases chacune. C'est le backbeat — la base de presque tout, et le fond de commerce de la maison.",
    tempoOptions: [84, 92],
    rowsActive: { kick: true, snare: true, hat: false },
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 1, 0, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [0, 0, 0, 0, 0, 0, 0, 0],
    } }),

  mkLevel(68, 'Le charley qui double', {
    preamble: "Le charleston complète le trio, et il arrive directement à son débit habituel : SEIZE cases pour lui seul, quatre fois par temps là où le kick en fait un. C'est la double-croche, c'est ce qui donne le tempo à l'oreille. Le kick et la claire, eux, ne bougent pas.",
    tempoOptions: [84, 92],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 16 },
      kick:  [1, 0, 1, 0, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    } }),

  mkLevel(69, 'La claire sort du temps aussi', {
    preamble: "Un coup peut tomber ENTRE deux temps : c'est la syncope, et c'est ce qui sépare un rythme qui marche d'un rythme qui groove. Ici elle est partout — le kick quitte la grille DEUX fois et la caisse claire cesse elle aussi de tomber sur les temps. Plus un seul repère à sa place habituelle, sauf le charley, qui tient la mesure du début à la fin.",
    tempoOptions: [88, 96],
    grille: {
      /* Le kick sur le « et » de 2 et le « et » de 4 ; la claire sur le temps
       * 2, puis sur le « et » de 3 et le « et » de 4 — le backbeat existe
       * encore, mais il ne suffit plus à se repérer. */
      subdiv: { kick: 8, snare: 8, hat: 16 },
      kick:  [1, 0, 0, 1, 1, 0, 0, 1],
      snare: [0, 0, 1, 0, 0, 1, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    } }),

  mkLevel(70, 'La relance', {
    preamble: "À quoi servent les rafales : à casser la boucle avant qu'elle recommence. Le charley s'ARRÊTE sur le dernier temps et la claire prend le relais — quatre coups d'affilée, deux en rafale et deux en rim shot. C'est un fill, et c'est ce qui fait qu'une mesure ne se répète pas bêtement.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true }, rollMax: 4,
    grille: {
      /* ⚠️ Le charley qui S'ARRÊTE est la vraie difficulté : douze cases
       * pleines puis quatre vides, et c'est ce trou qui rend le fill audible.
       * Une rafale posée sous un charley continu s'entend mal — c'est ce qui
       * rendait le niveau 8 d'origine si facile à rater sans le voir. */
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 2, 1, 2, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      rolls: {
        snare: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 3],
      },
    } }),

  /* ---------- L'ACTE 2 PREND SON TEMPS AUSSI ----------
   *
   * Même arbitrage, même date. L'acte enseignait le swing en quatre écrans et
   * le décalage en deux, sans jamais faire RÉGLER le second ni entendre les
   * deux ensemble. Trois niveaux le complètent, sujet par sujet :
   *
   *   71  régler le décalage      — le pendant du 48 (régler le swing)
   *   72  le swing ET le décalage — la seule grille où les deux jouent ensemble
   *   73  nommer ce qui bouge     — le pendant du 62 (l'entendre)
   *
   * ⚠️ Le 72 ne fait PAS partie du trio comparatif (14, 17, 23) : sa grille
   * est différente exprès. Le trio existe pour que seul le feel change ; ce
   * niveau-ci existe pour que les deux feels se cumulent. Confondre les deux
   * casserait l'un et l'autre. */

  mkLevel(71, 'Règle le décalage', {
    exercise: 'regler', familleParam: 'groove', paramsAutorises: ['shiftPct'],
    preamble: "Une boucle cible, un curseur. Le charley y glisse — en avance ou en retard, à toi d'entendre de quel côté et de combien. On ne cherche pas le chiffre : deux décalages qu'on ne distingue pas sont la même réponse.",
    subdivOptions: [8], tempoOptions: [92] }),

  mkLevel(72, 'Le swing ET le décalage', {
    preamble: "Les deux à la fois, sur une grille que tu n'as pas encore vue. Le charley balance ET traîne derrière les autres : deux réglages qui se cumulent sur la même ligne. Le kick, lui, ne bouge toujours pas — c'est contre lui que tout se mesure.",
    tempoOptions: [88, 92],
    grille: {
      /* Kick sur des pas PAIRS uniquement (jamais retardés par le swing), donc
       * le point fixe reste fixe ; la claire, elle, tombe deux fois sur des
       * seizièmes — le swing la déplace, ce qui est exactement ce qu'il faut
       * entendre après l'avoir isolé sur le charley. */
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      swing: 24,
      shift: { hat: 10 },
    } }),

  /* ⚠️ LA POLYRYTHMIE DE L'ACTE 1 — écrite le 2026-09-01, sur la demande de
   * Yann : *« l'acte 1 fusionné 12 → 6-7, le niveau 2 retiré, plus une
   * polyrythmie »*.
   *
   * Pourquoi un niveau NEUF plutôt qu'une citation : les cinq polyrythmies du
   * réservoir sont soit déjà citées par l'acte 5 (24, 29), soit GÉNÉRÉES (26,
   * 30, 31) — un tirage de densité donnerait un point de départ différent à
   * chaque partie, ce que les grilles écrites ont justement supprimé.
   *
   * Pourquoi 16 contre 12, et pourquoi la CLAIRE : c'est le rapport 4:3, le
   * plus répandu au monde (voir le niveau 29), à la résolution où l'acte 1 est
   * rendu. Le charley reste en seize cases pleines — il est le repère fixe,
   * sans lequel un décalage ne s'entend contre rien — et le kick garde ses
   * quatre temps plus la syncope acquise deux exercices plus tôt. La ligne qui
   * sort du compte est donc la claire, seule, et on l'entend glisser contre
   * les deux autres.
   *
   * ⚠️ Ses quatre coups tombent sur les pas 2, 5, 8 et 11 d'un cycle de douze :
   * aucun ne coïncide avec une case de seize, ce qui est la définition même de
   * la polyrythmie et ce que `tests/grilles-ecrites.test.ts` mesure. Posés sur
   * 0, 3, 6, 9 ils seraient retombés sur les temps, et l'exercice n'aurait
   * rien enseigné. */
  mkLevel(74, 'Trois contre quatre', {
    preamble: "Chaque ligne peut avoir sa propre longueur de cycle. Le kick et le charley comptent seize cases ; la claire, elle, n'en compte que DOUZE — trois coups là où les autres en comptent quatre. Aucun de ses coups ne tombe sur une case des deux autres lignes : c'est ça, une polyrythmie, et c'est l'ossature de presque tout ce qui vient d'Afrique. Le charley ne bouge pas : c'est contre lui que tu la situes.",
    tempoOptions: [88, 96],
    grille: {
      subdiv: { kick: 16, snare: 12, hat: 16 },
      kick:  [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    } }),

  /* ---------- Les ARRANGEMENTS de l'acte 3 — batterie ET synthé ----------
   *
   * Demande de Yann (2026-09-02) : *« des exercices de reproduction de synthé
   * avec en même temps plusieurs lignes »*, et sur la question « combien de
   * lignes, et lesquelles » : **batterie + synthé tout de suite**.
   *
   * Les trois montent d'une ligne à chaque fois — quatre, puis cinq, puis six —
   * et la progression n'est pas dans le nombre de cases (huit partout) mais
   * dans le nombre de VOIX à démêler. C'est l'axe de difficulté propre à
   * l'arrangement, comme le feel est celui de l'acte 2.
   *
   * ⚠️ Le kick et la claire restent SIMPLES (les temps, le backbeat) : ce
   * qu'on demande d'entendre est la ligne de synthé CONTRE eux, pas un rythme
   * de plus à lire. Le charley n'arrive qu'au troisième, quand les deux lignes
   * de synthé sont acquises.
   *
   * ⚠️ La basse est plus GRAVE et plus rare que la mélodie — c'est ce que la
   * commande de l'acte demande ensuite (« elle tient, elle ne court pas après
   * la mélodie ») : l'exercice le fait entendre avant que le cahier l'exige. */
  mkLevel(75, 'Deux lignes à la fois', {
    exercise: 'arrangement',
    preamble: "Pour la première fois, une batterie ET une ligne de synthé dans le même exercice. Le kick tient les quatre temps, la claire répond sur 2 et 4 — tu sais faire. Ce qui est neuf, c'est la BASSE par-dessus : quatre notes à retrouver en hauteur, comme aux exercices précédents, mais cette fois il faut les entendre à travers la batterie. Choisis une case de la ligne, appuie sur un degré.",
    tempoOptions: [84, 90],
    /* ⚠️ Le SON fait partie du niveau (voir `model/sons.ts`) : une basse RONDE
     * au release long, parce que c'est elle la nouveauté de l'exercice et
     * qu'une basse sèche par défaut ne se distingue pas du kick. */
    sons: {
      bass: { voix: 'round', retouches: { release: 0.42 }, reverb: 0.08, volume: 1.05 },
      kick: { tone: 22, decay: 6 },
      snare: { reverb: 0.12 },
    },
    arrangement: {
      subdiv: 8,
      degreMax: 5,
      lignes: [
        { nom: 'kick',  nature: 'drum',   pas: [1, 0, 1, 0, 1, 0, 1, 0] },
        { nom: 'snare', nature: 'drum',   pas: [0, 0, 1, 0, 0, 0, 1, 0] },
        { nom: 'bass',  nature: 'degres', pas: [1, 0, 0, 5, 0, 0, 3, 0] },
      ],
    } }),

  mkLevel(76, 'La basse et la mélodie', {
    exercise: 'arrangement',
    preamble: "Deux lignes de synthé maintenant, et elles ne disent pas la même chose : la basse tient le bas, rare et grave ; la mélodie bouge au-dessus, plus dense. Elles se répondent — c'est ce qu'on appelle un arrangement. La tonique du premier pas t'est donnée sur chacune : c'est le repère contre lequel le reste se situe.",
    tempoOptions: [84, 90],
    /* Les deux lignes se SÉPARENT par le son autant que par le registre : la
     * basse tient (release long, pas d'écho), la mélodie pique et s'en va
     * (attaque courte, delay et réverbe). C'est ce qui rend « elles se
     * répondent » audible au lieu d'être une affirmation du préambule. */
    sons: {
      bass: { voix: 'round', retouches: { release: 0.42 }, reverb: 0.08, volume: 1.05 },
      melody: { voix: 'housepluck', retouches: { release: 0.07 }, delay: 0.3, reverb: 0.22 },
      kick: { tone: 22, decay: 6 },
      snare: { reverb: 0.12 },
    },
    arrangement: {
      subdiv: 8,
      degreMax: 5,
      lignes: [
        { nom: 'kick',   nature: 'drum',   pas: [1, 0, 1, 0, 1, 0, 1, 0] },
        { nom: 'snare',  nature: 'drum',   pas: [0, 0, 1, 0, 0, 0, 1, 0] },
        { nom: 'bass',   nature: 'degres', pas: [1, 0, 0, 0, 5, 0, 0, 0] },
        { nom: 'melody', nature: 'degres', pas: [3, 0, 5, 4, 3, 0, 2, 1] },
      ],
    } }),

  mkLevel(77, 'Sept lignes', {
    exercise: 'arrangement',
    preamble: "Sept lignes d'un coup : les quatre de la batterie, et les trois du synthé. La nappe est neuve — sa case ne porte pas une note mais un ACCORD, écrit par son degré comme le reste, et elle n'en a que quatre. Elle tient le fond, la basse marche dessous, la mélodie pique au-dessus. Rien d'autre n'est nouveau : c'est tout ce que tu sais déjà, en même temps. Écoute une ligne à la fois.",
    tempoOptions: [84, 90],
    /* ⚠️ SEPT lignes, pas six — *« top ce niveau 77, il manque la nappe ! »*
     * (Yann, 2026-09-02). Elle vaut son écran ici et nulle part avant : c'est
     * le seul exercice où trois lignes de synthé se répondent, donc le seul où
     * un accord tenu s'entend comme un FOND et non comme une quatrième note.
     *
     * Le son suit la même idée — c'est le contraste des trois qui rend
     * l'empilement lisible : nappe large et lointaine (attaque lente, étalée,
     * beaucoup de réverbe), basse ronde et sèche, mélodie très courte avec
     * delay. Trois registres, trois durées, trois places dans la salle. */
    sons: {
      pad: { voix: 'rhodes', retouches: { attack: 0.35, release: 0.9 }, reverb: 0.45, strum: 0.35, volume: 0.7 },
      bass: { voix: 'round', retouches: { release: 0.42 }, reverb: 0.08, volume: 1.05 },
      melody: { voix: 'housepluck', retouches: { release: 0.06 }, delay: 0.34, reverb: 0.24, volume: 0.9 },
      kick: { tone: 24, decay: 8 },
      snare: { reverb: 0.14 },
      clap: { reverb: 0.3, volume: 0.75 },
      hat: { filtre: 9000, volume: 0.6 },
    },
    arrangement: {
      subdiv: 8,
      degreMax: 5,
      lignes: [
        { nom: 'kick',   nature: 'drum',   pas: [1, 0, 1, 0, 1, 0, 1, 1] },
        { nom: 'snare',  nature: 'drum',   pas: [0, 0, 1, 0, 0, 0, 2, 0] },
        { nom: 'clap',   nature: 'drum',   pas: [0, 0, 1, 0, 0, 0, 0, 0] },
        { nom: 'hat',    nature: 'drum',   pas: [1, 1, 1, 1, 1, 1, 1, 1] },
        { nom: 'bass',   nature: 'degres', pas: [1, 0, 0, 1, 0, 5, 0, 0] },
        { nom: 'melody', nature: 'degres', pas: [5, 0, 4, 0, 3, 0, 2, 1] },
        // La nappe : un accord par demi-mesure, et jamais plus de 4 (voir
        // `degreMaxDeLigne`). Le premier est donné, comme sur les deux autres.
        { nom: 'pad',    nature: 'degres', pas: [1, 0, 0, 0, 4, 0, 0, 0] },
      ],
    } }),

  mkLevel(78, 'Deux mesures', {
    exercise: 'arrangement',
    preamble: "Jusqu'ici tout revenait au bout d'une mesure : huit cases, et ça recommence. C'est très bien pour une sonnerie, ça ne fait pas un morceau. Ici la batterie boucle comme avant, mais la basse et la nappe mettent DEUX mesures à revenir : la deuxième moitié n'est pas la copie de la première. Les cases pâles sont les répétitions de la batterie — elle rejoue la même chose pendant que le synthé continue sa phrase.",
    tempoOptions: [88, 92],
    /* Les trois lignes de synthé se séparent par le son autant que par la
     * durée : la nappe tient le fond sur deux mesures, la basse marche
     * dessous, la mélodie ponctue. */
    sons: {
      pad: { voix: 'rhodes', retouches: { attack: 0.3, release: 1.1 }, reverb: 0.42, strum: 0.3, volume: 0.65 },
      bass: { voix: 'reggae', retouches: { release: 0.32 }, reverb: 0.06, volume: 1.05 },
      melody: { voix: 'soft', retouches: { release: 0.14 }, delay: 0.28, reverb: 0.2, volume: 0.85 },
      kick: { tone: 20, decay: 6 },
      snare: { reverb: 0.16 },
      hat: { filtre: 8500, volume: 0.55 },
    },
    /* ⚠️ Le premier niveau où les lignes n'ont pas la même DURÉE — demande de
     * Yann : *« pour un morceau, il faut des cycles différents »*. La
     * subdivision reste commune (une colonne = un instant) ; ce qui change est
     * le nombre de MESURES avant que la ligne se répète. La batterie reste à
     * une mesure, et c'est ce contraste qui s'entend : c'est elle qui donne le
     * repère contre lequel la phrase de synthé se déploie. */
    arrangement: {
      subdiv: 8,
      degreMax: 5,
      lignes: [
        { nom: 'kick',   nature: 'drum',   pas: [1, 0, 0, 1, 1, 0, 1, 0] },
        { nom: 'snare',  nature: 'drum',   pas: [0, 0, 1, 0, 0, 0, 1, 0] },
        { nom: 'hat',    nature: 'drum',   pas: [1, 0, 1, 1, 1, 0, 1, 1] },
        // Deux mesures : la seconde répond à la première au lieu de la répéter.
        { nom: 'bass',   nature: 'degres', cycles: 2,
          pas: [1, 0, 0, 5, 0, 0, 3, 0,  1, 0, 0, 4, 0, 0, 2, 0] },
        { nom: 'melody', nature: 'degres', cycles: 2,
          pas: [3, 0, 5, 4, 0, 0, 3, 0,  3, 0, 5, 4, 0, 3, 2, 1] },
        { nom: 'pad',    nature: 'degres', cycles: 2,
          pas: [1, 0, 0, 0, 0, 0, 0, 0,  4, 0, 0, 0, 0, 0, 0, 0] },
      ],
    } }),

  mkLevel(73, 'Lequel des trois ?', {
    exercise: 'nommer', familleParam: 'groove',
    paramsAutorises: ['ghostDensity', 'randomVelocity', 'spontRoll'],
    preamble: "Tu les as entendus bouger ; maintenant, mets un nom dessus. Des coups en plus, une force qui varie, des rafales qui partent toutes seules — trois façons pour la machine de ne pas jouer deux fois pareil, et elles ne s'entendent pas au même endroit.",
    subdivOptions: [8], tempoOptions: [96] }),
];
