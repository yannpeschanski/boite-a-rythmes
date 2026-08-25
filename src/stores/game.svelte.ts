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
  strongPositions,
  type GameLevel,
  type GameVoice,
  type SubdivSpec,
  type GamePresetLike,
  type GameDrumRowName,
} from '../model/presets/levels';
import {
  comparerGrilles,
  colonnesDeTranche,
  justesseDesFrappes,
  medianeDesEcarts,
  estVerbeParam,
  LAVERIE_DRIVES,
} from '../model/exercises';
import {
  parametresDe,
  parametre,
  pourLigne,
  appliquerParamGlobal,
  tirerVersions,
  tirerCible,
  versionQuiRepond,
  justesseDuReglage,
  appliquerParam,
  type DescripteurParam,
} from '../model/parametres';
import { PRESETS } from '../model/presets/songs';
import {
  NB_ACTES,
  acteParId,
  acteAVenir,
  niveauxRencontres,
  type Acte,
  type Etape,
} from '../model/carriere';
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
  /* Où en est le joueur dans le RÉCIT (`model/carriere.ts`) — le second axe,
   * délibérément séparé de `level`.
   *
   * `level` et `stars` décrivent le RÉSERVOIR : ce que le joueur a réussi en
   * salle de répétition. `carriere` décrit l'HISTOIRE : ce qu'il a vécu, et
   * donc ce qui lui est ouvert. Un seul entier ne pouvait pas dire les deux
   * (PLAN.md, « Architecture du Mode jeu ») — d'où deux champs, et pas un
   * numéro de niveau plus gros.
   *
   * Facultatif : une sauvegarde d'avant la carrière n'en a pas. Elle démarre
   * alors la carrière au début, sans rien perdre — voir `carriere.ts`,
   * « Pourquoi il n'y a PAS de migration ». */
  carriere?: { acte: number; etape: number };
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

  /* « Jouer » : les frappes jouées, et le nombre de coups attendus sur un tour
   * de boucle.
   *
   * Une frappe garde DEUX choses : son écart signé au coup le plus proche (la
   * note) et sa position dans la mesure (l'affichage). Le second n'est pas du
   * décor : sans lui on annonce un pourcentage sans jamais montrer ce qui a été
   * joué, et le joueur ne peut pas voir qu'il traîne toujours sur le même
   * temps. */
  frappes = $state<Array<{ ecartMs: number; phase01: number }>>([]);
  frappesAttendues = $state(0);

  /* ---- État propre aux verbes de PARAMÈTRE (lequel / nommer / regler) ----
   * Tous nuls pour un verbe de grille, et remis à zéro à chaque `startLevel`. */

  // Le bouton visé, la ligne sur laquelle il s'entend, et les versions à
  // comparer — en unité AFFICHÉE (celle du curseur de l'Atelier).
  paramId = $state('');
  paramLigne = $state<GameDrumRowName>('kick');
  /* La ligne REPÈRE : elle sonne, mais elle n'est pas visée.
   *
   * ⚠️ Sans elle, tous les boutons de groove sont muets. Un décalage est un
   * écart, et un écart n'existe que par rapport à quelque chose : une ligne
   * décalée toute seule sonne exactement comme une ligne à l'heure. C'est le
   * `contexte.repere` du catalogue. */
  paramRepere = $state<GameDrumRowName | null>(null);
  paramVersions = $state<number[]>([]);
  // « Lequel ? » : dans quel sens la question est posée, et quelle version y
  // répond. « Nommer » : quels boutons sont proposés, et lequel est le bon.
  paramSens = $state<'plus' | 'moins'>('plus');
  paramCandidats = $state<string[]>([]);
  paramReponse = $state(0);
  paramChoix = $state<number | null>(null);
  // « Régler » : la position du curseur du joueur.
  paramValeur = $state(0);
  /* Quelle version `buildState('param')` doit faire sonner. -1 = le réglage du
     JOUEUR, pour qu'il puisse comparer sa version à la cible. */
  paramVersionJouee = $state(0);

  /* Le descripteur tel qu'il vaut SUR LA LIGNE VISÉE — bornes resserrées si
   * cette ligne a une sous-plage jouable. La vue s'en sert pour le curseur de
   * « régler » : plus large que la plage où le son bouge, il inviterait à
   * chercher là où il n'y a rien. */
  get paramDescripteur(): DescripteurParam | null {
    const p = parametre(this.paramId);
    return p ? pourLigne(p, this.paramLigne) : null;
  }

  /* ---- État du verbe `melodie` ----------------------------------------
   *
   * Une ligne de BASSE monophonique : une case par pas, portant un DEGRÉ de la
   * gamme — 0 pour le silence, 1 à 7 pour les notes. Volontairement pas une
   * `Grid` de batterie : ce n'est ni la même forme (une seule ligne), ni la
   * même sémantique (une hauteur, pas un coup). Le COMPARATEUR, lui, est le
   * même — il ne fait que des `===`. */
  melodieCible = $state<number[]>([]);
  melodieGuess = $state<number[]>([]);
  melodieLocked = $state<boolean[]>([]);
  /** Rafales factices : la mélodie n'en a pas, mais `comparerGrilles` en attend
   *  des deux côtés. Le même tableau sert aux deux, donc elles coïncident
   *  toujours et ne pèsent jamais sur la comparaison. */
  private get melodieRafales(): number[] {
    return new Array(this.melodieCible.length).fill(1);
  }

  /* ---- État du verbe `silence` -----------------------------------------
   * Une pulsation régulière sur le hat, un coup manquant, et le kick au
   * premier pas comme point de départ. La réponse est un index. */
  silenceReponse = $state(0);
  silenceChoix = $state<number | null>(null);

  /* ---- État du verbe `laverie` ------------------------------------------
   * Sur quel haut-parleur on écoute. ⚠️ Ce n'est PAS de l'état de morceau :
   * rien à sérialiser, rien à annuler, rien à exporter — c'est une façon
   * d'écouter, au même titre que le décalage de latence est une propriété de
   * l'appareil. Il vit donc ici et pas dans le format v2. */
  ecoutePetite = $state(false);

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

  /* ---- Mode carrière — le curseur du récit ----------------------------
   *
   * DEUX curseurs, et c'est voulu :
   *
   *   - `progresCarriere` — jusqu'où le joueur est ALLÉ. Persisté, ne recule
   *     jamais. C'est lui qui ouvre les actes et les modules.
   *   - `acteActif` / `etapeActive` — ce qu'il REGARDE en ce moment. Volatil.
   *
   * Sans le second, relire un acte terminé ferait reculer le premier — et donc
   * REVERROUILLER un module déjà ouvert. Un joueur qui relit l'acte 1 se
   * retrouverait sans Atelier ; ce genre de régression ne se voit pas en
   * écrivant le code, seulement en jouant.
   */
  acteActif = $state(0);
  etapeActive = $state(0);
  /** Le niveau en cours a été lancé depuis la carrière (et non depuis la salle
   *  de répétition) : c'est ce qui décide où l'on retourne en le réussissant. */
  enCarriere = $state(false);
  /* L'acte qui vient de se terminer et dont la fin n'a pas encore été annoncée.
   * Ici plutôt que dans la vue parce que `avancerCarriere` est appelée depuis
   * DEUX écrans (la lecture d'un récit, la fin d'un exercice) : deux vues qui
   * devraient chacune se souvenir d'annoncer la compétence finiraient par ne
   * plus être d'accord. La vue le lit, puis le remet à `null`. */
  acteTermineAAnnoncer = $state<Acte | null>(null);

  /** Jusqu'où le joueur est allé — acte ATTEINT, donc `2` = actes 0 et 1 faits.
   *
   *  Aucune dérivation depuis `level` : voir `carriere.ts`. Un vétéran commence
   *  la carrière au début sans rien perdre, les seuils de niveau restant un
   *  plancher pour ses modules. */
  get progresCarriere(): { acte: number; etape: number } {
    if (this.pseudo.toLowerCase() === 'master') return { acte: NB_ACTES, etape: 0 };
    return this.progress[this.pseudo]?.carriere ?? { acte: 0, etape: 0 };
  }

  get acteCourant(): Acte {
    return acteParId(this.acteActif);
  }

  get etapeCourante(): Etape | null {
    return this.acteCourant.etapes[this.etapeActive] ?? null;
  }

  /** Un acte est ouvert dès qu'on l'a atteint — et jamais s'il est « à venir »
   *  (récit écrit, exercices pas encore : voir `carriere.ts`). */
  acteOuvert(id: number): boolean {
    return id <= this.progresCarriere.acte && !acteAVenir(acteParId(id));
  }

  acteFait(id: number): boolean {
    return id < this.progresCarriere.acte;
  }

  /** Tous les actes écrits sont derrière : il n'y a plus rien à continuer. */
  get carriereEnAttente(): boolean {
    const p = this.progresCarriere.acte;
    return p >= NB_ACTES || acteAVenir(acteParId(p));
  }

  /** Reprendre là où on s'était arrêté. */
  reprendreCarriere(): void {
    const p = this.progresCarriere;
    this.acteActif = Math.min(p.acte, NB_ACTES - 1);
    this.etapeActive = acteAVenir(this.acteCourant) ? 0 : p.etape;
    this.acteTermineAAnnoncer = null;
    this.demarrerEtape();
  }

  /* Revenir sur l'écran précédent — « il faut pouvoir revenir sur un texte
   * précédent ».
   *
   * Le récit n'avait qu'un « Suite ▸ » : un écran passé était perdu, et une
   * ligne relue trop vite ne se rattrapait pas. C'est exactement le genre de
   * chose que le DOUBLE CURSEUR permet gratuitement — `acteActif`/`etapeActive`
   * sont volatils, seul `progresCarriere` est enregistré et lui ne recule
   * jamais. Reculer ne coûte donc aucune progression, et ne referme aucun
   * module.
   *
   * On recule d'un écran, en franchissant les frontières d'actes : au début
   * d'un acte, on revient à la dernière étape du précédent, s'il est atteint.
   */
  reculerCarriere(): void {
    this.acteTermineAAnnoncer = null;
    if (this.etapeActive > 0) {
      this.etapeActive -= 1;
      this.demarrerEtape();
      return;
    }
    const precedent = this.acteActif - 1;
    if (precedent < 0 || !this.acteOuvert(precedent)) return;
    this.acteActif = precedent;
    this.etapeActive = Math.max(0, acteParId(precedent).etapes.length - 1);
    this.demarrerEtape();
  }

  /** Y a-t-il un écran avant celui-ci ? */
  get peutReculer(): boolean {
    if (this.etapeActive > 0) return true;
    return this.acteActif > 0 && this.acteOuvert(this.acteActif - 1);
  }

  /* L'étape courante est-elle DÉJÀ derrière le curseur enregistré ?
   *
   * Sert au seul écran où la question se pose : une étape d'exercice qu'on
   * revisite en reculant. On peut alors la re-jouer, mais aussi la re-dépasser
   * sans la rejouer — sinon reculer d'un cran obligerait à refaire l'exercice
   * pour repartir. */
  get etapeDejaFranchie(): boolean {
    const p = this.progresCarriere;
    return this.acteActif < p.acte || (this.acteActif === p.acte && this.etapeActive < p.etape);
  }

  /** Ouvrir (ou relire) un acte depuis son début. */
  ouvrirActe(id: number): void {
    if (!this.acteOuvert(id)) return;
    this.acteActif = id;
    this.etapeActive = 0;
    this.demarrerEtape();
  }

  /** Charge ce que l'étape courante demande. Une étape de récit n'a rien à
   *  charger : c'est du texte, la vue s'en occupe. */
  demarrerEtape(): void {
    this.enCarriere = true;
    const e = this.etapeCourante;
    if (e && e.kind === 'exercice') this.startLevel(e.niveau - 1);
  }

  /* Passer à l'étape suivante — appelée après avoir lu un récit ou terminé un
   * exercice. Rien ici ne vérifie la réussite : c'est la vue qui décide quand
   * une étape est finie, comme c'est elle qui décide quand un niveau l'est.
   *
   * Renvoie l'acte qui vient de se TERMINER, ou `null` — ce qui permet à la vue
   * d'annoncer la compétence et le module ouvert au bon moment, sans avoir à
   * comparer des curseurs avant et après. */
  avancerCarriere(): Acte | null {
    const acte = this.acteCourant;
    if (this.etapeActive + 1 < acte.etapes.length) {
      this.etapeActive += 1;
      this.memoriserCarriere(acte.id, this.etapeActive);
      this.demarrerEtape();
      return null;
    }
    this.acteActif = Math.min(NB_ACTES - 1, acte.id + 1);
    this.etapeActive = 0;
    this.memoriserCarriere(acte.id + 1, 0);
    this.demarrerEtape();
    this.acteTermineAAnnoncer = acte;
    return acte;
  }

  /* Le curseur persisté ne recule JAMAIS — c'est ce qui rend la relecture d'un
   * acte inoffensive : sans cette garde, relire l'acte 1 reverrouillerait
   * l'Atelier. */
  private memoriserCarriere(acte: number, etape: number): void {
    if (this.pseudo.toLowerCase() === 'master') return;
    const prev = this.progress[this.pseudo] ?? { level: 1, stars: {} };
    const cur = prev.carriere ?? { acte: 0, etape: 0 };
    if (acte < cur.acte || (acte === cur.acte && etape <= cur.etape)) return;
    this.progress = { ...this.progress, [this.pseudo]: { ...prev, carriere: { acte, etape } } };
    writeJson(KEY_PROGRESS, this.progress);
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
    // Le niveau du réservoir reste chargé — la salle de répétition s'ouvre
    // dessus — mais l'écran d'entrée du Mode jeu est désormais la carrière :
    // c'est elle qui donne le pourquoi, les niveaux donnent le comment.
    this.startLevel(Math.max(0, Math.min(LEVELS.length - 1, prog.level - 1)));
    const p = this.progresCarriere;
    this.acteActif = Math.min(p.acte, NB_ACTES - 1);
    this.etapeActive = acteAVenir(this.acteCourant) ? 0 : p.etape;
    this.acteTermineAAnnoncer = null;
    this.enCarriere = false;
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
    /* ⚠️ On revient TOUJOURS au moniteur de studio en changeant de niveau.
     * `preparerLaverie` le rebasculera aussitôt si c'est son exercice ; sans
     * cette remise à zéro, quitter la laverie laisserait le passe-haut engagé
     * et l'exercice SUIVANT se jouerait sans grave, sans que rien ne le dise.
     * Un état d'écoute qui déborde de son écran est un défaut muet. */
    this.ecoutePetite = false;
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
    this.frappes = [];
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

    if (estVerbeParam(this.level.exercise)) {
      this.preparerParametre();
      return;
    }

    if (this.level.exercise === 'melodie') {
      this.preparerMelodie();
      return;
    }

    if (this.level.exercise === 'silence') {
      this.preparerSilence();
      return;
    }

    if (this.level.exercise === 'laverie') {
      this.preparerLaverie();
      return;
    }

    if (this.level.exercise === 'jouer') {
      /* Plancher de deux coups.
       *
       * Le générateur pose une ancre puis 2 ou 3 « extras » à des positions
       * TIRÉES INDÉPENDAMMENT : elles peuvent retomber sur l'ancre. Mesuré sur
       * 200 000 tirages, il sort un seul coup dans 0,86 % des cas — et on ne
       * joue pas un rythme sur une frappe, on appuie une fois. Assez rare pour
       * ne jamais se voir en essayant, assez fréquent pour tomber sur un
       * joueur ; c'est la CI qui l'a fait remonter, via un test devenu instable.
       *
       * Corrigé ICI et pas dans le générateur : `genLevelRow` sert les 34
       * niveaux de la campagne, et y toucher changerait l'ordre de consommation
       * du hasard pour tout le monde. Le complément se prend sur les positions
       * fortes, sans tirage — il n'ajoute donc aucun appel au générateur.
       */
      const kick = this.target.kick;
      if (kick.filter((v) => v > 0).length < 2) {
        for (const i of strongPositions(this.subdiv.kick)) {
          if (kick.filter((v) => v > 0).length >= 2) break;
          if (!kick[i]) kick[i] = 1;
        }
      }
      this.frappesAttendues = kick.filter((v) => v > 0).length;
    }
  }

  /* Met en place un exercice de paramètre.
   *
   * Le rythme n'est PAS l'objet : on pose une frappe régulière et identique
   * pour toutes les versions, pour que la seule différence audible soit le
   * bouton visé. Un motif tiré au hasard rendrait la comparaison impossible —
   * on ne saurait plus si ce qu'on entend vient du réglage ou de la grille.
   */
  /* Tire la ligne de basse à retrouver.
   *
   * Trois choix qui sont de la conception, pas de l'arithmétique :
   *
   * - **la tonique tombe toujours sur le premier pas.** Sans point de départ,
   *   aucun degré ne peut être situé à l'oreille : on entendrait des intervalles
   *   sans savoir par rapport à quoi. C'est le degré 1, et c'est ce que le
   *   préambule du niveau 44 dit au joueur.
   * - **une note par pas au plus**, jamais d'accord : monophonique, donc une
   *   case = une hauteur, donc `comparerGrilles` s'applique tel quel.
   * - **le motif** (niveau 43) recopie la première moitié dans la seconde. La
   *   phrase à trouver est deux fois plus courte, et ce qu'on apprend est
   *   qu'une mélodie REVIENT — « les motifs, la répétition » de l'acte 3.
   */
  private preparerMelodie(): void {
    const m = this.level.melodie;
    const pas = Math.max(2, m.pas);
    const utiles = m.motif ? Math.max(1, Math.floor(pas / 2)) : pas;
    const cible = new Array<number>(pas).fill(0);
    cible[0] = 1;
    const voulu = m.notesMin + Math.floor(Math.random() * (m.notesMax - m.notesMin + 1));
    // Jamais plus de notes que de pas disponibles : sinon la boucle de tirage
    // ci-dessous n'aurait plus de case libre à trouver.
    const combien = Math.min(Math.max(1, voulu), utiles);
    let posees = 1;
    let garde = 0;
    while (posees < combien && garde++ < 500) {
      const i = 1 + Math.floor(Math.random() * (utiles - 1 || 1));
      if (i >= utiles || cible[i]) continue;
      cible[i] = 1 + Math.floor(Math.random() * m.degreMax);
      posees++;
    }
    if (m.motif) for (let i = utiles; i < pas; i++) cible[i] = cible[i - utiles];
    this.melodieCible = cible;
    this.melodieGuess = new Array<number>(pas).fill(0);
    this.melodieLocked = new Array<boolean>(pas).fill(false);
  }

  /* Une pulsation régulière avec UN trou.
   *
   * Deux décisions de conception :
   *
   * - **le trou n'est jamais au premier pas.** Le début de boucle est ce qui
   *   permet de compter ; l'y retirer rendrait la question insoluble autrement
   *   qu'au hasard, puisqu'on ne saurait plus où la mesure commence.
   * - **le kick tient le premier temps**, et lui seul. Sur deux ancres, un trou
   *   tombant sur la seconde resterait masqué par le kick — on entendrait un
   *   coup là où on demande d'entendre un silence.
   */
  private preparerSilence(): void {
    const pas = Math.max(4, this.level.silencePas);
    this.subdiv = { kick: pas, snare: pas, hat: pas };
    const grille = emptyGrid(this.subdiv);
    for (let i = 0; i < pas; i++) grille.hat[i] = 1;
    grille.kick[0] = 1;
    this.silenceReponse = 1 + Math.floor(Math.random() * (pas - 1));
    grille.hat[this.silenceReponse] = 0;
    this.silenceChoix = null;
    this.target = grille;
    this.targetRolls = emptyRolls(this.subdiv);
    this.guess = emptyGrid(this.subdiv);
    this.guessRolls = emptyRolls(this.subdiv);
    this.shift = { kick: 0, snare: 0, hat: 0 };
    this.swing = 0;
    this.drag = 0;
  }

  /** Poser (ou retirer) une note. Cliquer le degré déjà posé l'efface : c'est
   *  le même geste que la case de batterie, qui s'éteint en la recliquant. */
  poserNote(pas: number, degre: number): void {
    if (this.solved || this.revealed || this.melodieLocked[pas]) return;
    this.melodieGuess[pas] = this.melodieGuess[pas] === degre ? 0 : degre;
  }

  /* « La laverie » — l'acte 4, et le seul exercice où ce qui compte n'est pas
   * le son mais l'ENDROIT où on l'écoute.
   *
   * `HISTOIRE.md` : *« Ton morceau est bon dans ton ordinateur. Ici, il est
   * mauvais. »* Trois versions du même kick, séparées par le DRIVE. Sur le
   * moniteur de studio elles se ressemblent ; sur le petit haut-parleur, une
   * seule tient encore — mesuré dans un `OfflineAudioContext`, à travers le
   * vrai graphe : 13 % de l'énergie survit au repos, 40 % à fond de drive.
   *
   * ⚠️ Pourquoi `tone` sur le kick n'est PAS pris dans le catalogue, alors
   * qu'il est le sujet ici : parce qu'en studio il ne s'entend presque pas
   * (RMS 0,046 → 0,062 sur toute l'étendue, contre un triplement de ce qui
   * survit au passe-haut). Un bouton dont l'effet ne se voit qu'ailleurs est
   * une mauvaise question de timbre et une bonne question de production —
   * c'est exactement ce que l'acte enseigne. Le niveau le pose donc lui-même
   * plutôt que de le tirer, et `parametre('tone').lignes` continue d'exclure
   * le kick pour tous les autres verbes. */
  private preparerLaverie(): void {
    this.paramId = 'tone';
    this.paramLigne = 'kick';
    this.paramRepere = null;
    this.subdiv = { kick: 8, snare: 8, hat: 8 };
    const grille = emptyGrid(this.subdiv);
    [0, 2, 4, 6].forEach((i) => (grille.kick[i] = 1));
    this.target = grille;
    this.targetRolls = emptyRolls(this.subdiv);
    this.guess = emptyGrid(this.subdiv);
    this.guessRolls = emptyRolls(this.subdiv);
    this.shift = { kick: 0, snare: 0, hat: 0 };
    this.swing = 0;
    this.drag = 0;
    this.paramChoix = null;
    this.paramVersionJouee = 0;
    /* Les trois valeurs sont POSÉES, pas tirées, et c'est délibéré : ce qui
     * doit être garanti n'est pas un écart de curseur mais un écart de SURVIE
     * au passe-haut, que `tirerVersions` ne sait pas mesurer. Trois paliers
     * mesurés, mélangés pour que la bonne réponse ne soit jamais au même
     * endroit. */
    const paliers = [...LAVERIE_DRIVES];
    for (let i = paliers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [paliers[i], paliers[j]] = [paliers[j], paliers[i]];
    }
    this.paramVersions = paliers;
    // Toujours « celle qui tient » : la question ne se retourne pas. Un petit
    // haut-parleur n'a pas de sens inverse — rien ne « disparaît le mieux ».
    this.paramSens = 'plus';
    this.paramReponse = versionQuiRepond(paliers, 'plus');
    // On arrive TOUJOURS sur le petit haut-parleur : c'est là que la question
    // se pose. Le studio est ce qu'on va chercher pour comparer.
    this.ecoutePetite = true;
  }

  private preparerParametre(): void {
    const famille = this.level.familleParam;
    // Seuls les boutons qui s'entendent sur au moins une ligne du Mode jeu.
    // Les boutons qui s'entendent sur au moins une ligne du Mode jeu, ET que le
    // niveau autorise — un acte peut restreindre la famille à ce que le joueur
    // a déjà rencontré (voir `paramsAutorises`).
    const autorises = this.level.paramsAutorises;
    const candidats = parametresDe(famille).filter(
      (p) =>
        p.lignes.some((l) => GAME_DRUM_ROWS.includes(l)) &&
        (autorises.length === 0 || autorises.includes(p.id)),
    );
    const brut = pick(candidats);
    this.paramId = brut.id;
    this.paramLigne = pick(brut.lignes.filter((l) => GAME_DRUM_ROWS.includes(l)));
    // ⚠️ À partir d'ici on travaille sur le descripteur RESSERRÉ à la ligne :
    // les versions, la cible et le curseur doivent parler des mêmes bornes.
    const p = pourLigne(brut, this.paramLigne);

    /* Une noire sur quatre temps : assez pour entendre l'attaque et la chute,
     * assez court pour comparer sans attendre.
     *
     * ⚠️ Sauf si le bouton demande autre chose. Le swing ne retarde que les pas
     * IMPAIRS (`col % 2 === 1` dans le scheduler) : sur [0, 2, 4, 6], tous
     * pairs, il n'aurait strictement aucun effet — l'exercice aurait posé trois
     * versions identiques. C'est le `contexte` du catalogue qui le dit. */
    this.subdiv = { kick: 8, snare: 8, hat: 8 };
    const grille = emptyGrid(this.subdiv);
    const pas = p.contexte?.pas ?? [0, 2, 4, 6];
    pas.forEach((i) => (grille[this.paramLigne][i] = 1));
    // Le repère tient le temps pendant que la ligne visée bouge autour.
    this.paramRepere = p.contexte?.repere ?? null;
    if (this.paramRepere && this.paramRepere !== this.paramLigne) {
      [0, 4].forEach((i) => (grille[this.paramRepere as GameDrumRowName][i] = 1));
    } else {
      this.paramRepere = null;
    }
    this.target = grille;
    this.targetRolls = emptyRolls(this.subdiv);
    this.guess = emptyGrid(this.subdiv);
    this.guessRolls = emptyRolls(this.subdiv);
    this.shift = { kick: 0, snare: 0, hat: 0 };
    this.swing = 0;
    this.drag = 0;

    this.paramChoix = null;
    this.paramVersionJouee = 0;

    if (this.level.exercise === 'lequel') {
      this.paramVersions = tirerVersions(p, 3);
      this.paramSens = Math.random() < 0.5 ? 'plus' : 'moins';
      this.paramReponse = versionQuiRepond(this.paramVersions, this.paramSens);
      return;
    }

    if (this.level.exercise === 'nommer') {
      // Deux sons qui ne diffèrent QUE par ce bouton : l'un au repos, l'autre
      // franchement déplacé. Les autres boutons de la famille sont proposés en
      // leurres — c'est le vocabulaire qu'on entraîne.
      this.paramVersions = tirerVersions(p, 2);
      const leurres = candidats.filter((c) => c.id !== p.id).map((c) => c.id);
      const choix = [p.id, ...leurres].slice(0, 4);
      for (let i = choix.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choix[i], choix[j]] = [choix[j], choix[i]];
      }
      this.paramCandidats = choix;
      this.paramReponse = choix.indexOf(p.id);
      return;
    }

    // « Régler » : une seule version, la cible. Le curseur part du MILIEU de
    // l'étendue, et la cible est tirée LOIN de ce milieu — par construction,
    // pas en espérant (voir `tirerCible`). L'ancienne version tirait deux
    // valeurs bien séparées entre elles et gardait la première : rien ne la
    // séparait du départ, et le niveau était parfois déjà gagné.
    this.paramValeur = Math.round((p.min + p.max) / 2);
    this.paramVersions = [tirerCible(p, this.paramValeur)];
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

    // Les verbes de paramètre : soit un index désigné, soit un curseur placé.
    if (estVerbeParam(this.level.exercise)) {
      const p = this.paramDescripteur;
      let juste = false;
      if (!p) juste = false;
      else if (this.level.exercise === 'regler') {
        juste = justesseDuReglage(this.paramValeur, this.paramVersions[0], p) >= 70;
      } else {
        juste = this.paramChoix === this.paramReponse;
      }
      if (juste) this.win();
      return juste;
    }

    /* « La laverie » désigne un index, comme `lequel` — mais elle a sa branche
     * parce qu'elle n'est délibérément pas un `VERBES_PARAM` : elle POSE son
     * bouton au lieu de le tirer du catalogue (voir `preparerLaverie`). Elle
     * partage l'état, pas l'aiguillage. */
    if (this.level.exercise === 'laverie') {
      const juste = this.paramChoix === this.paramReponse;
      if (juste) this.win();
      return juste;
    }

    // « Le silence » ne compare pas de grille : la réponse est un index, comme
    // pour « l'intrus ».
    if (this.level.exercise === 'silence') {
      const juste = this.silenceChoix === this.silenceReponse;
      if (juste) this.win();
      return juste;
    }

    /* La mélodie compare UNE ligne, avec le même comparateur que la batterie —
     * seul le sens des nombres change (un degré au lieu d'un coup). */
    if (this.level.exercise === 'melodie') {
      const rafales = this.melodieRafales;
      const r = comparerGrilles<'bass'>(
        { bass: this.melodieCible },
        { bass: rafales },
        { bass: this.melodieGuess },
        { bass: rafales },
        ['bass'],
      );
      r.aVerrouiller.forEach(({ col }) => (this.melodieLocked[col] = true));
      if (r.exact) this.win();
      return r.exact;
    }

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
        this.frappes.length >= this.frappesAttendues &&
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
  enregistrerFrappe(ecartMs: number, phase01: number): void {
    if (this.solved || this.revealed) return;
    // L'écart reste SIGNÉ ici : `justesseDesFrappes` prend la valeur absolue,
    // mais `decalageMedian` a besoin du signe — c'est lui qui dit si le joueur
    // traîne ou si c'est la chaîne d'entrée qui retarde.
    this.frappes = [...this.frappes, { ecartMs, phase01 }];
  }

  // La note elle-même est pure et testée dans model/exercises.ts ; le store ne
  // fait que lui passer ce qu'il a.
  justesse(): number {
    return justesseDesFrappes(
      this.frappes.map((f) => f.ecartMs),
      this.frappesAttendues,
    );
  }

  /* Le biais du joueur, en millisecondes signées. Diagnostic, jamais noté :
   * « tu joues 60 ms en retard, toujours » n'est pas la même faute que « tu es
   * à ±60 ms dans les deux sens ». */
  decalageMedian(): number {
    return medianeDesEcarts(this.frappes.map((f) => f.ecartMs));
  }

  reinitialiserFrappes(): void {
    this.frappes = [];
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
      // `...prev` d'abord : sans lui, réussir un niveau effacerait le curseur
      // de carrière, qui vit dans le même enregistrement.
      ...prev,
      // Déblocage du niveau suivant dès 1★.
      level: stars >= 1 ? Math.max(prev.level, this.level.id + 1) : prev.level,
      stars: { ...prev.stars, [id]: Math.max(prev.stars[id] ?? 0, stars) },
    };
    this.progress = { ...this.progress, [this.pseudo]: next };
    writeJson(KEY_PROGRESS, this.progress);
  }

  /* Ce que la salle de répétition propose : les niveaux déjà rencontrés dans le
   * récit, tous rejouables. Voir `niveauxRencontres` — le seuil `id <= level`
   * ne convenait pas, la carrière citant les niveaux dans un autre ordre que
   * leur numérotation.
   *
   * « master » et le contournement voient tout : ce sont des outils de test. */
  get niveauxDeRepetition(): number[] {
    if (this.pseudo.toLowerCase() === 'master') return LEVELS.map((l) => l.id);
    const p = this.progresCarriere;
    return niveauxRencontres(p.acte, p.etape);
  }

  isUnlocked(levelId: number): boolean {
    return this.niveauxDeRepetition.includes(levelId);
  }

  // Construit un état jouable par le moteur pour la cible ou la proposition.
  buildState(which: 'target' | 'guess' | 'intrus' | 'param'): PatternStateV2 {
    const state = defaultState();
    state.tempo = this.tempo;
    state.swing = this.swing;
    state.drag = this.drag;
    // « Intrus » joue une grille fabriquée de quatre mesures, avec sa propre
    // subdivision : c'est la seule lecture qui ne montre pas une grille éditable.
    // Un exercice de paramètre fait sonner UNE version : la ligne visée seule,
    // avec le bouton posé à la valeur demandée. Tout le reste est au repos pour
    // que la seule différence entre deux écoutes soit ce bouton-là.
    if (which === 'param') {
      const p = this.paramDescripteur;
      GAME_DRUM_ROWS.forEach((name) => {
        const row = state.rows[name];
        row.subdiv = this.subdiv[name];
        row.pattern = new Array(32).fill(0).map((z, i) => this.target[name][i] ?? z);
        row.rolls = new Array(32).fill(1);
        // La ligne visée sonne, et le repère aussi quand il y en a un — sans
        // lui, un décalage ou un swing n'a rien contre quoi s'entendre.
        row.muted = name !== this.paramLigne && name !== this.paramRepere;
      });
      if (p) {
        const valeur =
          this.paramVersionJouee < 0
            ? this.paramValeur
            : (this.paramVersions[this.paramVersionJouee] ?? this.paramVersions[0]);
        // ⚠️ Deux cibles : un bouton de groove n'est pas un champ de ligne.
        if (p.cible === 'global') appliquerParamGlobal(state, p, valeur);
        else appliquerParam(state.rows[this.paramLigne], p, valeur);
      }
      return state;
    }

    /* La mélodie ne sonne pas sur la batterie : une seule ligne de BASSE, tout
     * le reste au repos. Les degrés deviennent ici des `SynthNote` — c'est le
     * seul endroit où la traduction a lieu, le jeu ne manipule que des
     * nombres. L'octave est fixée à 0 : monophonique et sur un seul registre,
     * sans quoi deux hauteurs à l'octave seraient « la même note » à l'oreille
     * et deux réponses différentes à l'écran. */
    if (this.level.exercise === 'melodie') {
      const degres = which === 'guess' ? this.melodieGuess : this.melodieCible;
      GAME_DRUM_ROWS.forEach((n) => (state.rows[n].muted = true));
      state.synthRows.pad.muted = true;
      state.synthRows.melody.muted = true;
      const row = state.synthRows.bass;
      row.muted = false;
      row.cycleBars = 1;
      row.subdivisions = Math.max(1, degres.length);
      row.pattern = degres.map((d) => (d > 0 ? { degree: d, octave: 0 } : null));
      row.rolls = new Array(degres.length).fill(1);
      return state;
    }

    const intrus = which === 'intrus' ? this.grilleIntrus() : null;
    const grid = intrus ? intrus.grid : which === 'target' ? this.target : this.guess;
    const rolls = intrus ? intrus.rolls : which === 'target' ? this.targetRolls : this.guessRolls;
    // « Jouer » à vue : le kick est MUET. On voit le motif, on ne l'entend pas —
    // sans quoi voir et entendre ensemble ne demanderait que de suivre un point
    // lumineux. Le hat de la ligne donne la pulsation (voir le niveau 38).
    const kickMuet = this.level.exercise === 'jouer' && this.level.jouerIndice === 'lecture';
    GAME_DRUM_ROWS.forEach((name) => {
      const row = state.rows[name];
      if (name === 'kick' && kickMuet && which === 'target') row.muted = true;
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
