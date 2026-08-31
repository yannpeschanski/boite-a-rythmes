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

import type { DrumStep } from '../types';

// Mode jeu volontairement limité à kick/snare/hat (PLAN.md §6, clap/shaker
// ajoutées à l'Atelier mais pas ici) — type LOCAL plutôt que le `DrumRowName`
// global (désormais élargi), pour que les 34 niveaux continuent de raisonner
// sur exactement 3 lignes sans qu'une extension du modèle ne les force à
// gérer 2 lignes qu'ils ne connaissent pas.
import type { ExerciseKind } from '../exercises';
import type { FamilleParam } from '../parametres';

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

export interface MkLevelOptions {
  /** Une cible écrite à la main — voir `GrilleEcrite`. */
  grille?: GrilleEcrite;
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
  melodie?: { pas?: number; degreMax?: number; notesMin?: number; notesMax?: number; motif?: boolean };
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
    familleParam: o.familleParam || 'timbre',
    paramsAutorises: o.paramsAutorises ?? [],
    melodie: {
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
    preamble: "Le charleston complète la base : il joue en croches, deux fois par temps, et c'est lui qui donne le débit. Kick, claire, charley — avec ces trois-là tu peux déjà tout faire.",
    tempoOptions: [84, 92],
    grille: {
      subdiv: { kick: 4, snare: 4, hat: 8 },
      kick:  [1, 0, 1, 0],
      snare: [0, 1, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
    } }),
  mkLevel(4, 'Reproduire un preset (Motown)', {
    preamble: "Ces niveaux ne sont plus générés au hasard : ce sont de vrais rythmes de l'Atelier, à replacer dans leur contexte. Motown/soul, le plus simple qui soit — aucune variante, aucune rafale.",
    presetId: 'motown' }),
  // ---------- Variante (2 niveaux : une seule, puis complète) ----------
  mkLevel(5, 'Un rim shot', {
    preamble: "Une case active peut porter une VARIANTE : reclique-la et la caisse claire passe en rim shot — le bord du fût, pas la peau, un claquement sec. Ici, une seule des deux claires en porte une. C'est la dernière.",
    tempoOptions: [84, 92],
    variant: { snare: true, hat: true },
    grille: {
      subdiv: { kick: 4, snare: 4, hat: 8 },
      kick:  [1, 0, 1, 0],
      snare: [0, 1, 0, 2],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
    } }),
  mkLevel(6, 'Variante (complète)', {
    preamble: "Cette fois, plusieurs notes peuvent être en variante — sur la snare comme sur le hat.",
    subdivOptions: [4], tempoOptions: [84, 92],
    variant: { snare: true, hat: true }, variantChance: 0.6, rollMax: 1,
    density: { kickMin: 0, kickMax: 0, snareMin: 1, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  // ---------- Round 1 : Subdivision + Rafale, entrelacés, avec presets ----------
  mkLevel(7, 'Le kick qui sort du temps', {
    preamble: "La mesure se découpe en huit cases pour le kick et le charley : il peut maintenant tomber ENTRE deux temps. Ce décalage-là a un nom, la syncope, et c'est ce qui sépare un rythme qui marche d'un rythme qui groove.",
    tempoOptions: [88, 96],
    grille: {
      // kick sur 1, sur le « et » de 2, et sur 3 — il quitte la grille des
      // temps une fois, et c'est tout ce qu'on demande d'entendre ici.
      subdiv: { kick: 8, snare: 4, hat: 8 },
      kick:  [1, 0, 0, 1, 1, 0, 0, 0],
      snare: [0, 1, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
    } }),
  mkLevel(8, 'Une rafale', {
    preamble: "Clic droit (ou appui long) sur une case active : elle part en RAFALE, plusieurs coups rapprochés au lieu d'un seul. Une seule ici, sur le tout dernier charley — c'est elle qui relance la boucle.",
    tempoOptions: [84, 92],
    variant: { snare: true, hat: true }, rollMax: 3,
    grille: {
      subdiv: { kick: 4, snare: 4, hat: 8 },
      kick:  [1, 0, 1, 0],
      snare: [0, 1, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
      rolls: { hat: [1, 1, 1, 1, 1, 1, 1, 3] },
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
   * Le motif est un backbeat en croches : le charley couvre les pas IMPAIRS,
   * seuls retardés par le swing (voir `contexte` dans parametres.ts). Sur un
   * motif posé sur [0, 2, 4, 6], le swing n'aurait aucun effet audible. */
  mkLevel(14, 'Le balancement', {
    preamble: "Le rythme peut « balancer » : les cases entre les temps arrivent un peu en retard, et la boucle cesse d'être carrée. Ici c'est léger. Les cases, elles, sont là où tu les attends — c'est ce qui change entre elles qu'il faut entendre.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
      swing: 12,
    } }),
  mkLevel(15, 'Traîne (drag)', {
    preamble: "Une ligne entière peut traîner légèrement derrière le tempo (drag) — un décalage collectif et constant, pas note par note.",
    subdivOptions: [6, 7], dragOptions: [5], swingOptions: [0, 10],
    variant: { snare: true, hat: true }, variantChance: 0.3, rollMax: 2, rollChance: 0.3,
    density: { kickMin: 1, kickMax: 1, snareMin: 0, snareMax: 1, hatMin: 0.45, hatMax: 0.6 } }),
  mkLevel(16, 'Reproduire un preset (UK Garage)', {
    preamble: "Le swing de ce preset est très marqué (45%) — pas un hasard, c'est ce chapitre qu'il illustre.",
    variant: { snare: true, hat: true }, rollMax: 2, presetId: 'garage', forceVariantCount: 1, forceRollCount: 1 }),
  mkLevel(17, 'Le balancement, prononcé', {
    preamble: "La même grille, exactement. Seul le balancement change, et il est franc cette fois. Compare : ce sont les mêmes cases qui sonnent, elles ne tombent simplement plus au même endroit.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
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
  mkLevel(23, 'Une ligne en retard', {
    preamble: "Toujours la même grille, sans balancement — mais le charley traîne derrière les deux autres. Une ligne peut être décalée toute seule, en avance ou en retard : c'est ce qui fait qu'un batteur ne sonne pas comme une machine.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 1, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 1],
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
  mkLevel(24, 'Trois cycles à la fois', {
    preamble: "Chaque ligne peut avoir sa propre longueur de cycle. Ici le kick boucle en 3, la claire en 4, le charley en 5 : les trois ne retombent ensemble qu'à la fin de la mesure. C'est ça, une polyrythmie.",
    tempoOptions: [96, 104],
    grille: {
      subdiv: { kick: 3, snare: 4, hat: 5 },
      kick:  [1, 0, 0],
      snare: [1, 0, 1, 0],
      hat:   [1, 0, 1, 0, 1],
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
    tempoOptions: [64, 72], density: { kickMin: 2, kickMax: 3, snareMin: 0, snareMax: 0, hatMin: 0, hatMax: 0 } }),
  mkLevel(38, 'Joue en rythme — à vue', {
    exercise: 'jouer', jouerIndice: 'lecture',
    preamble: "Cette fois le kick est muet : tu vois le motif, tu ne l'entends pas. Le hat te donne la pulsation, à toi de poser les coups au bon endroit. Écoute d'abord si tu veux, puis « ⏺ Jouer ».",
    subdivOptions: [8], rowsActive: { kick: true, snare: false, hat: true },
    // ⚠️ Jamais abaissé jusqu'ici : le 38 était resté le plus RAPIDE des trois
    // pilotes alors qu'il demande de lire un motif ET de le jouer.
    tempoOptions: [68, 76],
    // Hat sur toutes les croches : c'est la pulsation, pas un motif. Sans elle,
    // « à vue » se jouerait dans le silence — donc au hasard.
    density: { kickMin: 2, kickMax: 3, snareMin: 0, snareMax: 0, hatMin: 1, hatMax: 1 } }),

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
  mkLevel(42, 'Reposer une basse', {
    exercise: 'melodie',
    preamble: "Une ligne de basse joue en boucle. Repose-la : choisis une case, appuie sur le degré entendu, la case suivante se sélectionne toute seule. La tonique du premier pas t'est donnée — c'est le repère. Les cinq premiers degrés seulement, de quoi entendre monter et descendre sans se perdre.",
    tempoOptions: [86, 92],
    melodie: { pas: 8, degreMax: 5, notesMin: 3, notesMax: 4 } }),
  mkLevel(43, 'Un motif qui se répète', {
    exercise: 'melodie',
    preamble: "Cette fois la phrase se répète : la seconde moitié reprend la première, note pour note. Il n'y a donc que quatre pas à trouver — et une chose à entendre, celle qui fait qu'une mélodie tient : elle revient. Le ⌫ efface la case choisie.",
    tempoOptions: [86, 92],
    melodie: { pas: 8, degreMax: 5, notesMin: 2, notesMax: 3, motif: true } }),
  mkLevel(44, 'Toute la gamme', {
    exercise: 'melodie',
    preamble: "Les sept degrés de la gamme, et une note de plus à placer. Les degrés hauts sont les plus durs à situer : compte depuis la tonique si tu te perds — c'est le degré 1, et c'est là que la phrase se repose.",
    tempoOptions: [80, 88],
    melodie: { pas: 8, degreMax: 7, notesMin: 4, notesMax: 5 } }),

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
  mkLevel(52, 'Le silence', {
    exercise: 'silence',
    preamble: "Une pulsation régulière, et un coup qui manque. Lequel ? C'est la quatrième chose qu'on apprend à entendre, et la moins évidente : le silence fait partie du rythme, il ne l'interrompt pas.",
    tempoOptions: [88, 96], silencePas: 8 }),

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
  mkLevel(59, 'Un charley ouvert', {
    preamble: "Le charleston aussi a sa variante : reclique-le et il s'OUVRE — un « tss » qui traîne au lieu d'un « tic » sec. Un seul ici, sur la toute dernière croche : c'est ce qui fait respirer la mesure avant qu'elle recommence.",
    tempoOptions: [84, 92],
    variant: { snare: true, hat: true },
    grille: {
      subdiv: { kick: 4, snare: 4, hat: 8 },
      kick:  [1, 0, 1, 0],
      snare: [0, 1, 0, 1],
      hat:   [1, 1, 1, 1, 1, 1, 1, 2],
    } }),
  mkLevel(60, 'Les deux à la fois', {
    preamble: "Rim shot ET charley ouvert dans le même rythme, sur un kick syncopé. Rien de neuf : ce sont les trois choses que tu viens d'apprendre, posées ensemble. C'est là qu'on voit si elles sont acquises.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true },
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 0, 1, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 2, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 2],
    } }),
  mkLevel(61, 'Tout ensemble', {
    preamble: "Le dernier de la série, et il ne contient rien que tu n'aies déjà fait : la syncope, le rim shot, l'ouverture, et une rafale sur le « et » du troisième temps. Quatre choses, une mesure. C'est ta sonnerie.",
    tempoOptions: [88, 96],
    variant: { snare: true, hat: true }, rollMax: 3,
    grille: {
      subdiv: { kick: 8, snare: 8, hat: 8 },
      kick:  [1, 0, 0, 1, 1, 0, 0, 0],
      snare: [0, 0, 1, 0, 0, 0, 2, 0],
      hat:   [1, 1, 1, 1, 1, 1, 1, 2],
      rolls: { hat: [1, 1, 1, 1, 1, 3, 1, 1] },
    } }),

  /* ---------- Le palier de l'acte 2 ----------
   *
   * ⚠️ Écrit après un retour de testeur : « le jeu reste trop longtemps trop
   * facile ». Mesuré en parcourant les 42 exercices dans l'ordre où la
   * carrière les joue : l'acte 1 finit à 24 cases avec deux variantes et une
   * rafale (niveau 61), et l'acte 2 n'a jamais dépassé 24 cases AVEC ZÉRO
   * variante — il était donc un cran EN ARRIÈRE. Le premier exercice plus dur
   * que la fin de l'acte 1 n'arrivait qu'au 33e sur 42.
   *
   * Les trois grilles identiques de l'acte 2 (14, 23, 17) restent identiques :
   * c'est la seule façon de comparer deux balancements, et ça ne se négocie
   * pas. Le palier s'ajoute APRÈS elles.
   *
   * Ce qui le rend plus dur n'est pas un empilement de nouveautés — c'est la
   * RÉSOLUTION : seize cases par ligne au lieu de huit, et une caisse claire
   * qui ne tombe plus sur les temps. Rien de neuf à apprendre, tout à
   * entendre plus finement.
   *
   * ⚠️ Et il est écrit pour ne satisfaire AUCUNE exigence de la commande de
   * Kelvin, dont il est devenu le point de départ (`partirDu`) : kick sur les
   * quatre temps (donc jamais entre deux), charley sur les seize cases (donc
   * aucune place), pas une variante. Le cahier s'ouvre toujours à 0/4. */
  mkLevel(63, 'Le double du double', {
    preamble: "Même durée, deux fois plus de cases : on descend à la double-croche. Le kick et le charley ne bougent pas — c'est la caisse claire qu'il faut suivre, et elle ne tombe plus là où tu l'attends.",
    tempoOptions: [88, 92],
    grille: {
      subdiv: { kick: 16, snare: 16, hat: 16 },
      kick:  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      snare: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0],
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
];
