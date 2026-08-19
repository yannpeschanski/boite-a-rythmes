// Mode jeu — boucle « Motus rythmique » : écouter la cible, poser sa version,
// Vérifier. Les cases exactes (état ET rafale) se verrouillent avec ✓.
// Port de la logique de l. 7467–8734, sans la couche DOM.
import type { DrumStep, PatternStateV2 } from '../model/types';
import { defaultState } from '../model/defaults';
import {
  LEVELS,
  genLevelRhythm,
  subdivForLevel,
  voiceForLevel,
  presetForLevel,
  pick,
  type GameLevel,
  type GameVoice,
  type SubdivSpec,
  type GamePresetLike,
  type GameDrumRowName,
} from '../model/presets/levels';
import { comparerGrilles, colonnesDeTranche, justesseDesFrappes } from '../model/exercises';
import { PRESETS } from '../model/presets/songs';
import {
  BAG_ITEMS,
  CONSOLATION_ITEM,
  ABANDON_LINES,
  ROAST_DIFFICULTY,
  ROAST_GUESS,
  ROAST_LOOP,
  type BagItem,
} from '../model/presets/gameData';

// Mode jeu limité à kick/snare/hat (PLAN.md §6, voir GameDrumRowName dans
// presets/levels.ts) — PAS `DRUM_ROW_NAMES` du modèle (désormais élargi à
// clap/shaker) pour les boucles ci-dessous : les états construits ici
// (Grid/Rolls/shift) n'ont que ces 3 clés.
export const GAME_DRUM_ROWS: GameDrumRowName[] = ['kick', 'snare', 'hat'];

const KEY_BAG = 'boite-a-rythme:besaces';
const KEY_PROGRESS = 'boite-a-rythme:progression';
// Dernier pseudo utilisé (2026-08-16). La progression et la besace étaient
// déjà persistées PAR PSEUDO, mais le pseudo actif ne l'était pas : à chaque
// visite on repartait de `pseudo = ''`, donc d'une progression vide, et il
// fallait retaper son nom à l'identique pour retrouver ses étoiles.
// Invisible tant que rien ne dépendait de la progression ; depuis le verrou
// des modules (model/unlocks.ts), ça reverrouillait l'Atelier à chaque
// rechargement pour quelqu'un qui l'avait ouvert. Trouvé en testant le
// verrou, pas en relisant le code.
const KEY_PSEUDO = 'boite-a-rythme:pseudo';

export interface PlayerProgress {
  level: number;
  stars: Record<string, number>;
}

// 3★ du 1er coup, 2★ en 2-3 essais, 1★ au-delà, 0★ si abandon.
export function starsForAttempts(attempts: number): number {
  if (attempts <= 1) return 3;
  if (attempts <= 3) return 2;
  return 1;
}

// Palier du son de victoire (original composeRoast, l. 8351) — distinct de
// starsForAttempts ci-dessus : à 3 essais tier vaut 3 (tandis que stars vaut
// encore 2), l'original les calcule séparément et ce port fait pareil plutôt
// que de réutiliser starsForAttempts pour les deux usages.
export function tierForAttempts(attempts: number): 1 | 2 | 3 {
  if (attempts === 1) return 1;
  if (attempts === 2) return 2;
  return 3;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota plein ou stockage refusé : le jeu reste jouable, sans persistance */
  }
}

type Grid = Record<GameDrumRowName, DrumStep[]>;
type Rolls = Record<GameDrumRowName, number[]>;

function emptyGrid(subdiv: SubdivSpec): Grid {
  return {
    kick: new Array<DrumStep>(subdiv.kick).fill(0),
    snare: new Array<DrumStep>(subdiv.snare).fill(0),
    hat: new Array<DrumStep>(subdiv.hat).fill(0),
  };
}
function emptyRolls(subdiv: SubdivSpec): Rolls {
  return {
    kick: new Array<number>(subdiv.kick).fill(1),
    snare: new Array<number>(subdiv.snare).fill(1),
    hat: new Array<number>(subdiv.hat).fill(1),
  };
}

/* « Compléter » coupe la boucle en QUATRE TEMPS et en vide un.
 *
 * Pas « quatre mesures » : le Mode jeu tient sur une mesure par ligne, un quart
 * de boucle est donc un temps. Le nom compte — la première version parlait de
 * mesures, et « complète la mesure » sur deux doubles-croches ne veut rien
 * dire. C'est ce que la mesure d'écran a montré : 6 cases à remplir sur 24. */
const TEMPS_COMPLETER = 4;

/* « L'intrus », lui, fabrique une vraie phrase de quatre mesures en répétant la
   boucle : c'est la plus courte longueur où « une mesure sur quatre » veuille
   dire quelque chose. */
const MESURES_INTRUS = 4;

class GameStore {
  pseudo = $state('');
  levelIndex = $state(0);
  subdiv = $state<SubdivSpec>({ kick: 4, snare: 4, hat: 4 });
  target = $state<Grid>(emptyGrid({ kick: 4, snare: 4, hat: 4 }));
  targetRolls = $state<Rolls>(emptyRolls({ kick: 4, snare: 4, hat: 4 }));
  guess = $state<Grid>(emptyGrid({ kick: 4, snare: 4, hat: 4 }));
  guessRolls = $state<Rolls>(emptyRolls({ kick: 4, snare: 4, hat: 4 }));
  // Cases déjà validées comme exactes : verrouillées, plus modifiables.
  locked = $state<Record<GameDrumRowName, boolean[]>>({ kick: [], snare: [], hat: [] });
  revealed = $state(false);
  attempts = $state(0);
  loopPlays = $state(0);
  guessPlays = $state(0);
  solved = $state(false);
  voice = $state<GameVoice | null>(null);
  tempo = $state(100);
  swing = $state(0);
  drag = $state(0);
  shift = $state<Record<GameDrumRowName, number>>({ kick: 0, snare: 0, hat: 0 });
  lastResult = $state<{ stars: number; roast: string; items: BagItem[]; presetLabel?: string; history?: string } | null>(null);

  /* ---- État propre aux exercices autres que « reproduire » ----
   * Tous nuls/vides pour un niveau « reproduire » : rien de ce qui suit n'est
   * lu dans ce cas, et `startLevel` les remet à zéro à chaque entrée. */

  // « Compléter » : l'index du temps laissé vide, et les colonnes qu'il occupe
  // ligne par ligne (chaque ligne a sa propre subdivision — d'où un découpage
  // par ligne et non un index global).
  tempsACompleter = $state(0);
  zoneACompleter = $state<Partial<Record<GameDrumRowName, number[]>>>({});

  // « Intrus » : laquelle des quatre mesures diffère, et ce que le joueur a
  // désigné. `null` = pas encore répondu.
  intrusReponse = $state(0);
  intrusChoix = $state<number | null>(null);

  // « Jouer » : les écarts en millisecondes de chaque frappe par rapport au pas
  // le plus proche, et le nombre de pas attendus sur un tour de boucle.
  ecarts = $state<number[]>([]);
  frappesAttendues = $state(0);

  progress = $state<Record<string, PlayerProgress>>({});
  bags = $state<Record<string, BagItem[]>>({});

  get level(): GameLevel {
    return LEVELS[this.levelIndex] ?? LEVELS[0];
  }

  // Pseudo « master » (insensible à la casse) : tout débloqué, 3★ partout.
  get playerProgress(): PlayerProgress {
    if (this.pseudo.toLowerCase() === 'master') {
      const stars: Record<string, number> = {};
      LEVELS.forEach((l) => (stars[String(l.id)] = 3));
      return { level: LEVELS.length, stars };
    }
    return this.progress[this.pseudo] ?? { level: 1, stars: {} };
  }

  get bag(): BagItem[] {
    return this.bags[this.pseudo] ?? [];
  }

  load(): void {
    this.progress = readJson<Record<string, PlayerProgress>>(KEY_PROGRESS, {});
    this.bags = readJson<Record<string, BagItem[]>>(KEY_BAG, {});
    // Seulement si aucun pseudo n'est actif : `setPseudo` appelle `load()`
    // APRÈS avoir posé le sien, il ne faut pas l'écraser avec l'ancien.
    if (!this.pseudo) {
      try {
        const saved = localStorage.getItem(KEY_PSEUDO) ?? '';
        // « master » n'est jamais restauré, et une valeur héritée est
        // effacée — voir setPseudo ci-dessous. Sans ce nettoyage, quiconque
        // a tapé « master » une fois avant le correctif resterait bloqué en
        // accès total sans rien pour en sortir.
        if (saved.toLowerCase() === 'master') localStorage.removeItem(KEY_PSEUDO);
        else this.pseudo = saved;
      } catch {
        /* stockage refusé : on redemandera le pseudo, comme avant */
      }
    }
  }

  setPseudo(name: string): void {
    this.pseudo = name.trim() || 'anonyme';
    try {
      // « master » débloque TOUT (playerProgress renvoie le niveau maximum,
      // donc tous les modules). Le mémoriser en ferait un accès total
      // permanent et INVISIBLE : rien à l'écran ne l'expliquerait, et
      // `#boss=off` n'y changerait rien puisque ça ne passe pas par #boss.
      // C'est exactement ce qui est arrivé le 2026-08-16 en persistant le
      // pseudo (retour de Yann : « le boss mode est toujours activé »).
      // Il redevient donc ce qu'il était : un contournement de SESSION.
      if (this.pseudo.toLowerCase() === 'master') localStorage.removeItem(KEY_PSEUDO);
      else localStorage.setItem(KEY_PSEUDO, this.pseudo);
    } catch {
      /* stockage refusé : le pseudo vaut pour la session */
    }
    this.load();
    const prog = this.playerProgress;
    this.startLevel(Math.max(0, Math.min(LEVELS.length - 1, prog.level - 1)));
  }

  // Repasser par le formulaire de pseudo. Nécessaire depuis que le pseudo est
  // mémorisé : avant, l'oubli à chaque visite FAISAIT office de changement de
  // joueur. Ne touche ni à la progression ni aux besaces — elles restent
  // rangées sous leur pseudo et reviennent en le retapant.
  clearPseudo(): void {
    this.pseudo = '';
    try {
      localStorage.removeItem(KEY_PSEUDO);
    } catch {
      /* rien à retirer */
    }
  }

  startLevel(index: number): void {
    this.levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    const cfg = this.level;
    const presets = PRESETS as unknown as GamePresetLike[];
    this.subdiv = subdivForLevel(cfg, presets);
    const preset = presetForLevel(cfg, presets);
    if (preset) {
      // Niveau « preset » : la cible EST le pattern d'un morceau réel (même
      // subdivision, mêmes shift/tempo/swing/drag, même timbre). Rafales
      // volontairement ignorées — jamais l'objet noté ici.
      const p = preset as unknown as Record<string, { pattern: Array<boolean | number>; subdiv: number; shift: number }>;
      const grid = emptyGrid(this.subdiv);
      GAME_DRUM_ROWS.forEach((name) => {
        const src = p[name];
        grid[name] = new Array<DrumStep>(src.subdiv)
          .fill(0)
          .map((_, i) => {
            const v = src.pattern[i];
            return (v === true ? 1 : v === 2 ? 2 : v ? 1 : 0) as DrumStep;
          });
      });
      this.target = grid;
      this.targetRolls = emptyRolls(this.subdiv);
      const pp = preset as unknown as { tempo: number; swing: number; drag: number };
      this.tempo = pp.tempo;
      this.swing = pp.swing;
      this.drag = pp.drag;
      this.shift = cfg.presetForceShift
        ? { kick: 0, snare: 0, hat: p.hat.shift || 0 }
        : { kick: 0, snare: 0, hat: 0 };
    } else {
      const r = genLevelRhythm(this.subdiv, cfg);
      this.target = r.target;
      this.targetRolls = r.roll;
      this.tempo = pick(cfg.tempoOptions);
      this.swing = pick(cfg.swingOptions);
      this.drag = pick(cfg.dragOptions);
      const s = pick(cfg.shiftOptions);
      // Le décalage ne porte que sur le hat : c'est lui que la leçon isole.
      this.shift = { kick: 0, snare: 0, hat: s };
    }
    // Timbre aléatoire par palier — pure couleur sonore, jamais devinée.
    this.voice = voiceForLevel(cfg, presets);
    this.guess = emptyGrid(this.subdiv);
    this.guessRolls = emptyRolls(this.subdiv);
    this.locked = {
      kick: new Array(this.subdiv.kick).fill(false),
      snare: new Array(this.subdiv.snare).fill(false),
      hat: new Array(this.subdiv.hat).fill(false),
    };
    this.revealed = false;
    this.attempts = 0;
    this.loopPlays = 0;
    this.guessPlays = 0;
    this.solved = false;
    this.lastResult = null;
    this.preparerExercice();
  }

  /* Met en place ce que le verbe du niveau demande, une fois la cible tirée.
   *
   * Chaque branche part de la MÊME cible générée : les exercices ne sont pas
   * des générateurs concurrents, ce sont des façons différentes d'interroger
   * un rythme. C'est ce qui permet de poser n'importe quel verbe sur n'importe
   * quel niveau existant sans réécrire sa génération.
   */
  private preparerExercice(): void {
    this.tempsACompleter = 0;
    this.zoneACompleter = {};
    this.intrusReponse = 0;
    this.intrusChoix = null;
    this.ecarts = [];
    this.frappesAttendues = 0;

    if (this.level.exercise === 'completer') {
      // La cible d'un niveau tient sur une boucle ; on la coupe ici en
      // TEMPS_COMPLETER temps, et on en vide un seul. Jamais le premier : sans
      // un début posé, il n'y a pas de contexte à écouter, et l'exercice
      // redevient « reproduire ».
      const temps = 1 + Math.floor(Math.random() * (TEMPS_COMPLETER - 1));
      this.tempsACompleter = temps;
      const zone: Partial<Record<GameDrumRowName, number[]>> = {};
      GAME_DRUM_ROWS.forEach((name) => {
        zone[name] = colonnesDeTranche(this.subdiv[name], temps, TEMPS_COMPLETER);
      });
      this.zoneACompleter = zone;
      // Tout ce qui est HORS du temps vidé est donné, et verrouillé : le joueur
      // ne peut ni le modifier ni le perdre, et la vérification ne le note pas.
      GAME_DRUM_ROWS.forEach((name) => {
        const dansLaZone = new Set(zone[name]);
        this.target[name].forEach((t, i) => {
          if (dansLaZone.has(i)) return;
          this.guess[name][i] = t;
          this.guessRolls[name][i] = this.targetRolls[name][i];
          this.locked[name][i] = true;
        });
      });
    }

    if (this.level.exercise === 'intrus') {
      this.intrusReponse = Math.floor(Math.random() * MESURES_INTRUS);
    }

    if (this.level.exercise === 'jouer') {
      this.frappesAttendues = this.target.kick.filter((v) => v > 0).length;
    }
  }

  // Combien de cases actives la ligne attend, et combien sont posées.
  counts(name: GameDrumRowName): { placed: number; expected: number } {
    return {
      placed: this.guess[name].filter((v) => v > 0).length,
      expected: this.target[name].filter((v) => v > 0).length,
    };
  }

  cycleCell(name: GameDrumRowName, col: number): void {
    if (this.locked[name][col] || this.solved || this.revealed) return;
    const maxState = name === 'kick' ? 1 : 2;
    const next = ((this.guess[name][col] + 1) % (maxState + 1)) as DrumStep;
    this.guess[name][col] = next;
    if (next === 0) this.guessRolls[name][col] = 1;
  }

  cycleRoll(name: GameDrumRowName, col: number): void {
    if (this.locked[name][col] || this.solved || this.revealed) return;
    if (this.guess[name][col] > 0) this.guessRolls[name][col] = (this.guessRolls[name][col] % 4) + 1;
  }

  /* Vérification — un aiguillage, plus une comparaison câblée en dur.
   *
   * La règle « une case est exacte si son état ET sa rafale coïncident » n'a
   * pas changé : elle a seulement déménagé dans `model/exercises.ts`, où elle
   * est pure et testable. Ce qui change ici, c'est que le store demande
   * COMMENT vérifier au lieu de le supposer.
   *
   * Tant qu'un seul verbe existe, l'aiguillage n'a qu'une branche — c'est
   * voulu : la charpente arrive avant les exercices, pas avec eux, pour que
   * chacun soit une addition et non une chirurgie.
   */
  verify(): boolean {
    if (this.solved || this.revealed) return this.solved;
    this.attempts++;

    // « Intrus » ne compare pas de grille : la réponse est un index.
    if (this.level.exercise === 'intrus') {
      const juste = this.intrusChoix === this.intrusReponse;
      if (juste) this.win();
      return juste;
    }

    // « Jouer » ne note pas ce qui est posé mais ce qui a été JOUÉ : il faut
    // avoir frappé le bon nombre de fois, et assez juste.
    if (this.level.exercise === 'jouer') {
      const juste =
        this.ecarts.length >= this.frappesAttendues &&
        this.frappesAttendues > 0 &&
        this.justesse() >= 70;
      if (juste) this.win();
      return juste;
    }

    const { exact, aVerrouiller } = comparerGrilles(
      this.target,
      this.targetRolls,
      this.guess,
      this.guessRolls,
      GAME_DRUM_ROWS,
      this.colonnesNotees(),
    );
    aVerrouiller.forEach(({ row, col }) => (this.locked[row][col] = true));
    if (exact) this.win();
    return exact;
  }

  /* Quelles colonnes sont notées, selon le verbe du niveau.
   *
   * `undefined` = toutes, c'est-à-dire « reproduire ». Les autres exercices
   * restreindront ICI plutôt que dans une seconde comparaison : deux
   * comparateurs qui doivent rester d'accord finissent toujours par ne plus
   * l'être.
   */
  private colonnesNotees(): Partial<Record<GameDrumRowName, number[]>> | undefined {
    return this.level.exercise === 'completer' ? this.zoneACompleter : undefined;
  }

  /* ---- « Jouer en rythme » ----
   *
   * Une frappe est enregistrée par son ÉCART au pas le plus proche, pas par le
   * pas qu'elle vise. C'est la seule mesure qui distingue « au bon endroit » de
   * « au bon moment » : quantifier d'abord puis comparer les cases rendrait
   * parfaite une frappe posée 80 ms trop tard.
   */
  enregistrerFrappe(ecartMs: number): void {
    if (this.solved || this.revealed) return;
    this.ecarts = [...this.ecarts, Math.abs(ecartMs)];
  }

  // La note elle-même est pure et testée dans model/exercises.ts ; le store ne
  // fait que lui passer ce qu'il a.
  justesse(): number {
    return justesseDesFrappes(this.ecarts, this.frappesAttendues);
  }

  reinitialiserFrappes(): void {
    this.ecarts = [];
  }

  /* ---- « Intrus » ----
   * La grille jouée fait MESURES_INTRUS mesures : la mesure `intrusReponse`
   * porte une variante, les autres répètent la cible. On la fabrique à la
   * demande plutôt que de la stocker — elle ne sert qu'à la lecture.
   */
  grilleIntrus(): { grid: Grid; rolls: Rolls; subdiv: SubdivSpec } {
    const grid = {} as Grid;
    const rolls = {} as Rolls;
    const subdiv = {} as SubdivSpec;
    GAME_DRUM_ROWS.forEach((name) => {
      const base = this.target[name];
      const n = base.length;
      subdiv[name] = Math.min(32, n * MESURES_INTRUS);
      const g: DrumStep[] = [];
      const r: number[] = [];
      for (let m = 0; m < MESURES_INTRUS; m++) {
        for (let i = 0; i < n; i++) {
          if (g.length >= 32) break;
          g.push(base[i]);
          r.push(this.targetRolls[name][i]);
        }
      }
      // La variante : sur la ligne du snare, on déplace une frappe d'un pas.
      // Une seule ligne et un seul pas — l'exercice doit rester une question
      // d'oreille fine, pas un contraste évident.
      if (name === 'snare') {
        const debut = this.intrusReponse * n;
        const idx = base.findIndex((v) => v > 0);
        if (idx >= 0 && debut + idx < g.length) {
          const cible = debut + ((idx + 1) % n);
          g[debut + idx] = 0;
          if (cible < g.length) g[cible] = base[idx];
        }
      }
      grid[name] = g;
      rolls[name] = r;
    });
    return { grid, rolls, subdiv };
  }

  private win(): void {
    this.solved = true;
    const stars = starsForAttempts(this.attempts);
    const items = this.grantItems(this.attempts === 1 ? 2 : 1);
    const closest = presetForLevel(this.level, PRESETS as unknown as GamePresetLike[]) as unknown as
      | { label: string; history: string }
      | null;
    this.lastResult = {
      stars,
      roast: this.composeRoast(),
      items,
      presetLabel: closest?.label,
      history: closest?.history,
    };
    this.saveProgress(stars);
  }

  // Abandon : lot de consolation, 0★, et une pique.
  giveUp(): void {
    if (this.solved) return;
    this.revealed = true;
    const items = this.grantItems(1, true);
    this.lastResult = { stars: 0, roast: pick(ABANDON_LINES), items };
  }

  revealSolution(): void {
    this.revealed = true;
    this.guess = structuredClone($state.snapshot(this.target)) as Grid;
    this.guessRolls = structuredClone($state.snapshot(this.targetRolls)) as Rolls;
  }

  // Roasting : trois axes combinés — difficulté du palier, a-t-on réécouté sa
  // propre version, et combien de fois la boucle cible a tourné.
  private composeRoast(): string {
    const tier = this.level.voiceTier;
    const loopKey = this.loopPlays <= 1 ? '1' : this.loopPlays <= 2 ? '2' : '3';
    return [
      pick(ROAST_DIFFICULTY[tier] ?? ROAST_DIFFICULTY.easy),
      pick(this.guessPlays > 0 ? ROAST_GUESS.yes : ROAST_GUESS.no),
      pick(ROAST_LOOP[loopKey]),
    ].join(' ');
  }

  private grantItems(count: number, consolation = false): BagItem[] {
    const items: BagItem[] = consolation
      ? [CONSOLATION_ITEM]
      : Array.from({ length: count }, () => pick(BAG_ITEMS));
    const bag = [...(this.bags[this.pseudo] ?? []), ...items];
    this.bags = { ...this.bags, [this.pseudo]: bag };
    writeJson(KEY_BAG, this.bags);
    return items;
  }

  private saveProgress(stars: number): void {
    if (this.pseudo.toLowerCase() === 'master') return;
    const prev = this.progress[this.pseudo] ?? { level: 1, stars: {} };
    const id = String(this.level.id);
    const next: PlayerProgress = {
      // Déblocage du niveau suivant dès 1★.
      level: stars >= 1 ? Math.max(prev.level, this.level.id + 1) : prev.level,
      stars: { ...prev.stars, [id]: Math.max(prev.stars[id] ?? 0, stars) },
    };
    this.progress = { ...this.progress, [this.pseudo]: next };
    writeJson(KEY_PROGRESS, this.progress);
  }

  isUnlocked(levelId: number): boolean {
    return levelId <= this.playerProgress.level;
  }

  // Construit un état jouable par le moteur pour la cible ou la proposition.
  buildState(which: 'target' | 'guess' | 'intrus'): PatternStateV2 {
    const state = defaultState();
    state.tempo = this.tempo;
    state.swing = this.swing;
    state.drag = this.drag;
    // « Intrus » joue une grille fabriquée de quatre mesures, avec sa propre
    // subdivision : c'est la seule lecture qui ne montre pas une grille éditable.
    const intrus = which === 'intrus' ? this.grilleIntrus() : null;
    const grid = intrus ? intrus.grid : which === 'target' ? this.target : this.guess;
    const rolls = intrus ? intrus.rolls : which === 'target' ? this.targetRolls : this.guessRolls;
    GAME_DRUM_ROWS.forEach((name) => {
      const row = state.rows[name];
      row.subdiv = intrus ? intrus.subdiv[name] : this.subdiv[name];
      row.pattern = new Array(32).fill(0).map((z, i) => grid[name][i] ?? z);
      row.rolls = new Array(32).fill(1).map((one, i) => rolls[name][i] ?? one);
      row.shiftPct = this.shift[name];
      // Timbre du palier : pure couleur, jamais montrée ni devinée.
      if (this.voice) Object.assign(row, this.voice[name]);
    });
    return state;
  }

  // « Sauvegarde-le dans l'Atelier » : transfère les 3 lignes trouvées.
  toAtelierState(): PatternStateV2 {
    return this.buildState('guess');
  }
}

export const game = new GameStore();
export { LEVELS };
