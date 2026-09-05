// Mode jeu — boucle « Motus rythmique » : écouter la cible, poser sa version,
// Vérifier. Les cases exactes (état ET rafale) se verrouillent avec ✓.
// Port de la logique de l. 7467–8734, sans la couche DOM.
import type { DrumStep, PatternStateV2 } from '../model/types';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES, type DrumRowName, type SynthRowName } from '../model/types';
import { defaultState } from '../model/defaults';
import {
  LEVELS,
  genLevelRhythm,
  forcerVariantesEtRafales,
  subdivForLevel,
  voiceForLevel,
  presetForLevel,
  pick,
  strongPositions,
  degreMaxDeLigne,
  longueurDeLigne,
  colonnesDeLArrangement,
  type GameLevel,
  type GameVoice,
  type SubdivSpec,
  type GamePresetLike,
  type GameDrumRowName,
  type LigneArrangement,
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
import { PRESETS, HORS_EPOQUE } from '../model/presets/songs';
import {
  NB_ACTES,
  acteParId,
  acteAVenir,
  niveauxRencontres,
  commandesRencontrees,
  ACTES as ACTES_POUR_MASTER,
  type Acte,
  type Etape,
  type EtapeCommande,
  type EtapeScene,
  type EtapeRecit,
  EPILOGUE,
  LONGUEUR_EPILOGUE,
} from '../model/carriere';
import {
  evaluerCommande,
  reglagesEnPlus,
  etoilesDeLivraison,
  type Verdict,
  type ContexteLivraison,
} from '../model/commande';
import { etatVierge, etatDepuisGrille } from '../model/defaults';
import { appliquerSons } from '../model/sons';
import type { LockedModule } from '../model/unlocks';
import { pattern } from './pattern.svelte';
import { sequenceBank } from './bank.svelte';
import { architecture } from './architecture.svelte';
import { history } from './history.svelte';
import {
  BAG_ITEMS,
  CONSOLATION_ITEM,
  ABANDON_LINES,
  composerRoast,
  composerRoastLivraison,
  type BagItem,
} from '../model/presets/gameData';
import {
  ranger,
  productionDeLActe,
  productionDeLaSerie,
  type Production,
} from '../model/discographie';
import { reactionA, type Reaction } from '../model/reactions';
import { serializeState, deserializeState } from '../model/serialize';

// Mode jeu limité à kick/snare/hat (PLAN.md §6, voir GameDrumRowName dans
// presets/levels.ts) — PAS `DRUM_ROW_NAMES` du modèle (désormais élargi à
// clap/shaker) pour les boucles ci-dessous : les états construits ici
// (Grid/Rolls/shift) n'ont que ces 3 clés.
export const GAME_DRUM_ROWS: GameDrumRowName[] = ['kick', 'snare', 'hat'];

const KEY_BAG = 'boite-a-rythme:besaces';
/* La DISCOGRAPHIE — ce que le joueur a produit et livré, gardé par pseudo
 * comme la besace et la progression. Clé à part plutôt qu'un champ de
 * `PlayerProgress` : une production est un morceau sérialisé (quelques ko),
 * et `progress` est relu et réécrit à chaque niveau réussi. Les faire voyager
 * ensemble ferait payer le poids des morceaux à chaque étoile gagnée. */
const KEY_PROD = 'boite-a-rythme:productions';
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
   * (docs/plan/03-journal-migration.md, « Architecture du Mode jeu ») — d'où deux champs, et pas un
   * numéro de niveau plus gros.
   *
   * Facultatif : une sauvegarde d'avant la carrière n'en a pas. Elle démarre
   * alors la carrière au début, sans rien perdre — voir `carriere.ts`,
   * « Pourquoi il n'y a PAS de migration ». */
  carriere?: { acte: number; etape: number };
  /* Le PLANCHER — le `level` d'AVANT la carrière, gelé une fois pour toutes
   * (`gelerPlancher`, plus bas). C'est lui, et non `level`, que lisent les
   * seuils de `model/unlocks.ts`.
   *
   * Pourquoi un troisième champ plutôt qu'une lecture de `level` : la carrière
   * fait monter `level` en citant des niveaux du réservoir (l'acte 0 cite les
   * niveaux 49 à 52), donc `level` mesure désormais « ce que le récit a fait
   * jouer » autant que « ce que le joueur a acquis seul ». Les deux tenaient
   * dans un seul entier tant que la campagne était linéaire ; elles n'y
   * tiennent plus. Voir `UnlockContext.plancher`.
   *
   * Facultatif, et jamais réécrit une fois posé. */
  plancher?: number;
}

// 3★ du 1er coup, 2★ en 2-3 essais, 1★ au-delà, 0★ si abandon.
/* La clé des étoiles d'un CAHIER dans `PlayerProgress.stars`.
 *
 * ⚠️ Les niveaux y rangent leur `id` en chaîne (« 67 ») : une commande n'a pas
 * d'id, et lui en inventer un aurait tôt ou tard croisé celui d'un niveau. Le
 * préfixe rend la collision impossible par construction, et une sauvegarde
 * ancienne reste lisible — une clé inconnue est simplement une clé de plus. */
export function cleCommande(acte: number, etape: number): string {
  return `c${acte}.${etape}`;
}

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
/* Renvoie `false` si l'écriture n'a pas eu lieu — quota plein, ou stockage
 * refusé (navigation privée, réglage du navigateur). Le jeu reste jouable dans
 * ce cas, mais SANS persistance : c'est un aveu qu'il faut faire à l'écran
 * plutôt qu'avaler. Un joueur dont les modules se reverrouillent à chaque
 * visite conclut que le jeu l'a oublié, pas que son navigateur refuse
 * d'écrire — voir `persistanceRefusee`. */
function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* Le stockage est-il seulement disponible ? Testé par une écriture réelle :
 * `localStorage` EXISTE en navigation privée stricte, il lève à l'écriture.
 * Vérifier sa présence ne dirait donc rien. */
function stockageEcrivable(): boolean {
  try {
    const sonde = 'boite-a-rythme:sonde';
    localStorage.setItem(sonde, '1');
    localStorage.removeItem(sonde);
    return true;
  } catch {
    return false;
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
  /* ⚠️ Les écoutes des VERSIONS (verbes de paramètre, laverie). Elles
   * n'étaient comptées nulle part : `ecouterVersion` ne touchait aucun
   * compteur, et le roast affirmait quand même « une seule écoute de la
   * boucle » à quelqu'un qui venait d'en comparer deux dix fois. */
  paramEcoutes = $state(0);
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
  /* ⚠️ L'ARRANGEMENT — l'état GÉNÉRIQUE, sur N lignes nommées.
   *
   * Les trois autres grilles du jeu sont figées : `target`/`guess`/`locked`
   * portent exactement kick/snare/hat, et la mélodie a son propre état à une
   * ligne. Celui-ci ne suppose ni le nombre ni la nature des lignes — il les
   * lit dans le niveau — parce que la demande va jusqu'à huit (« drum +
   * synthé »). Le jour où `reproduire` déménagera ici, ce sera un déplacement,
   * pas une réécriture ; en attendant les deux coexistent, et c'est assumé :
   * réécrire dix-sept niveaux testés pour trois niveaux neufs aurait été le
   * mauvais ordre. */
  arrLignes = $state<LigneArrangement[]>([]);
  arrCible = $state<Record<string, number[]>>({});
  arrGuess = $state<Record<string, number[]>>({});
  arrLocked = $state<Record<string, boolean[]>>({});
  /** La case visée par le clavier : (ligne de synthé, pas). */
  arrSel = $state<{ ligne: string; pas: number } | null>(null);
  /* Quelles lignes s'ENTENDENT — l'écoute seulement, jamais la réponse.
   *
   * ⚠️ Demande de Yann (2026-09-02) : *« ce qui aiderait, ce serait de pouvoir
   * muter des lignes quand on écoute pour s'y retrouver, je me demande si ça
   * rend pas le jeu trop facile… à voir mais là, ça le rend inutilement
   * difficile »*. Isoler une ligne pour l'entendre est le geste de n'importe
   * quel studio ; ce qui reste demandé, lui, ne bouge pas d'une case — toutes
   * les lignes sont comparées, coupées ou non. Ça enlève de la difficulté
   * D'ÉCOUTE, pas de la difficulté de l'exercice. */
  arrEcoute = $state<Record<string, boolean>>({});

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

  /* ---- État du verbe `style` --------------------------------------------
   * Le preset tiré pour cette partie, les genres proposés (des `id` de
   * preset), et la réponse. Le preset tiré sert AUSSI de cible : c'est lui qui
   * donne la grille, le tempo, le swing et le timbre — un genre reconnu sur
   * une grille sans son tempo ni son timbre ne serait pas un genre. */
  /* ---- La COMMANDE en cours -------------------------------------------
   *
   * ⚠️ Cet état survit à un CHANGEMENT DE VUE : on quitte le Mode jeu pour
   * l'Atelier, on y travaille, on revient. Il ne peut donc pas vivre dans
   * `GameView`, qui est démonté entre-temps. Il n'entre pas non plus dans le
   * format v2 : ce n'est pas une propriété du morceau mais du travail en
   * cours.
   *
   * Il porte l'acte ET l'étape parce que le curseur volatil bouge : revenir
   * livrer alors qu'on a relu un autre acte entre-temps ne doit pas valider la
   * mauvaise étape. */
  commandeEnCours = $state<{ acte: number; etape: number } | null>(null);
  /* ⚠️ VOLATIL, comme `enRelecture` : refaire un cahier depuis la salle de
   * répétition ne se persiste pas. Il dit une seule chose — cette livraison-ci
   * ne fait pas avancer le récit. Rangé dans le curseur, il survivrait au
   * rechargement et bloquerait la carrière sur place. */
  repetitionCommande = $state(false);
  /* ⚠️ Combien de fois la boucle a tourné EN ENTIER pendant qu'on travaillait —
   * l'un des deux axes de la note (voir `etoilesDeLivraison`). Compté par
   * l'Atelier, qui est le seul à savoir qu'on écoute, et remis à zéro à
   * l'ouverture du cahier : c'est l'écoute de CE travail qu'on mesure.
   *
   * Un CYCLE, pas une mesure : `cycleDuMotif` tient compte d'une nappe qui
   * boucle sur quatre mesures. « Écouter son morceau » veut dire l'entendre
   * revenir, pas entendre son premier quart. */
  cyclesEcoutes = $state(0);
  /** Les étoiles de la dernière livraison — l'écran d'acceptation les montre. */
  etoilesLivraison = $state(0);
  /* La remarque qui va avec, composée sur les MÊMES deux mesures que les
   * étoiles : elle explique celle qui manque sans avoir à la nommer. Écrite
   * ici plutôt que dans la vue — c'est le store qui tient les compteurs, et une
   * remarque tirée à chaque rendu changerait de phrase à chaque frame. */
  roastLivraison = $state('');
  /* La SCÈNE en cours — même forme que la commande, et pour la même raison :
   * l'étape doit survivre à un changement de vue (on part dans le Mode Live,
   * qui n'est pas le Mode jeu). */
  sceneEnCours = $state<{ acte: number; etape: number } | null>(null);
  /** Le verdict du dernier refus, pour que l'écran dise ce qui manque. */
  commandeVerdict = $state<Verdict | null>(null);
  /* Ce que le client dit en acceptant, à afficher UNE fois au retour.
   * Sans ça, livrer renverrait à la carrière sans réaction : on aurait
   * travaillé pour un écran qui passe à la suite comme si de rien n'était. */
  commandeAcceptee = $state<string | null>(null);

  stylePresetId = $state('');
  styleCandidats = $state<string[]>([]);
  styleReponse = $state(0);
  styleChoix = $state<number | null>(null);

  progress = $state<Record<string, PlayerProgress>>({});
  bags = $state<Record<string, BagItem[]>>({});

  /* Le navigateur refuse d'écrire (navigation privée stricte, stockage
   * désactivé, quota plein). Le jeu reste entièrement jouable — mais rien
   * n'est retenu, donc les modules se REVERROUILLENT à chaque visite.
   *
   * Existe parce que ce cas était silencieux : `writeJson` avalait l'erreur,
   * et le joueur n'avait aucun moyen de distinguer « le jeu m'a oublié » de
   * « mon navigateur ne le laisse pas se souvenir ». Un verrou qui revient
   * sans explication se lit comme une panne. */
  persistanceRefusee = $state(false);

  get level(): GameLevel {
    return LEVELS[this.levelIndex] ?? LEVELS[0];
  }

  // Pseudo « master » (insensible à la casse) : tout débloqué, 3★ partout.
  get playerProgress(): PlayerProgress {
    if (this.pseudo.toLowerCase() === 'master') {
      const stars: Record<string, number> = {};
      LEVELS.forEach((l) => (stars[String(l.id)] = 3));
      // Les CAHIERS aussi : « master » sert à regarder des écrans, et une
      // salle de répétition où les exercices sont à 3★ et les cahiers à 0
      // donnerait à vérifier un affichage que personne ne verra jamais.
      for (const a of ACTES_POUR_MASTER) {
        a.etapes.forEach((e, i) => {
          if (e.kind === 'commande') stars[cleCommande(a.id, i)] = 3;
        });
      }
      return { level: LEVELS.length, stars };
    }
    return this.progress[this.pseudo] ?? { level: 1, stars: {} };
  }

  get bag(): BagItem[] {
    return this.bags[this.pseudo] ?? [];
  }

  /* ---- La discographie — voir `model/discographie.ts` ---------------- */

  private disques = $state<Record<string, Production[]>>({});

  /** Ce que ce joueur a produit et livré, dans l'ordre du récit. */
  get productions(): Production[] {
    return this.disques[this.pseudo] ?? [];
  }

  /* Ce que le client ajoute après avoir accepté — calculé sur le morceau qu'on
   * vient de livrer, `null` s'il n'y a rien de remarquable à dire.
   *
   * ⚠️ Volatile, jamais persisté : c'est une réplique, pas un acquis. La
   * relire au rechargement la ferait arriver hors de son moment, c'est-à-dire
   * sans le morceau qui la justifie. */
  reactionLivraison = $state<Reaction | null>(null);

  /**
   * Ranger une production et calculer ce que le client en dit.
   *
   * Appelé aux DEUX endroits qui produisent un morceau : la livraison de
   * l'acte 1 (un cadeau) et les cinq commandes (des épreuves). Les traiter
   * séparément aurait donné deux discographies dont une seule marche.
   */
  archiverProduction(etat: PatternStateV2, meta: Omit<Production, 'etat'>): void {
    const p: Production = { ...meta, etat: serializeState(etat) };
    this.disques = { ...this.disques, [this.pseudo]: ranger(this.productions, p) };
    if (!writeJson(KEY_PROD, this.disques)) this.persistanceRefusee = true;
    this.reactionLivraison = reactionA(etat);
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

  /* ---- L'ÉPILOGUE -------------------------------------------------------
   *
   * Les huit actes sont derrière : septembre. Son curseur est SÉPARÉ de celui
   * de la carrière et volatil comme lui — l'épilogue ne débloque rien, ne se
   * réussit pas, et doit pouvoir se relire autant qu'on veut. Le lier à
   * `progresCarriere` aurait demandé un neuvième acte dans un type qui décrit
   * des épreuves. */
  etapeEpilogue = $state(0);

  /** La carrière est finie : c'est l'épilogue qui s'affiche. */
  get enEpilogue(): boolean {
    return this.progresCarriere.acte >= NB_ACTES;
  }

  /* ⚠️ RELIRE UN ACTE QUAND LE JEU EST FINI — le bug rapporté par Yann
   * (« les boutons relire ne fonctionnent pas »).
   *
   * `enEpilogue` se lit sur le curseur PERSISTÉ, qui ne recule jamais : une
   * fois les huit actes derrière, il est vrai pour toujours. L'écran de
   * l'épilogue passant avant tout le reste dans le rendu, cliquer « RELIRE »
   * changeait bien `acteActif`… et n'affichait rien. Le bouton marchait, la
   * vue l'ignorait — exactement le contraire du diagnostic précédent, où la
   * capacité existait et où c'est le MOT qui manquait.
   *
   * D'où ce drapeau : VOLATIL comme `acteActif`/`etapeActive`, jamais persisté.
   * Il dit « le joueur regarde un acte, pas la fin ». Le curseur, lui, ne bouge
   * toujours pas — relire ne referme rien. */
  enRelecture = $state(false);

  get ecranEpilogue(): EtapeRecit | null {
    if (this.enRelecture) return null;
    return this.enEpilogue ? (EPILOGUE[this.etapeEpilogue] ?? null) : null;
  }

  /** Avance dans l'épilogue ; s'arrête sur le dernier écran, qui est la fin. */
  avancerEpilogue(): void {
    if (this.etapeEpilogue + 1 < LONGUEUR_EPILOGUE) this.etapeEpilogue += 1;
  }

  reculerEpilogue(): void {
    if (this.etapeEpilogue > 0) this.etapeEpilogue -= 1;
  }

  /** Le tout dernier écran du jeu. */
  get finDuJeu(): boolean {
    return this.enEpilogue && this.etapeEpilogue >= LONGUEUR_EPILOGUE - 1;
  }

  /** Reprendre là où on s'était arrêté. */
  reprendreCarriere(): void {
    /* ⚠️ Pour un joueur qui a FINI, « reprendre » veut dire revenir à
     * l'épilogue — il n'y a pas d'étape après. Sans ce cas, on rechargeait un
     * niveau de l'acte 7 pour afficher quand même l'épilogue par-dessus. */
    this.enRelecture = false;
    if (this.enEpilogue) {
      this.acteTermineAAnnoncer = null;
      return;
    }
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

  /* La commande de l'étape courante, ou `null`. La vue de l'Atelier s'en sert
   * pour afficher le cahier des charges en direct pendant qu'on travaille —
   * voir plus bas pourquoi il est VIVANT et pas rendu à la livraison. */
  get commande(): EtapeCommande | null {
    const c = this.commandeEnCours;
    if (!c) return null;
    const e = acteParId(c.acte).etapes[c.etape];
    return e && e.kind === 'commande' ? e : null;
  }

  /** La scène de l'étape courante, ou `null`. */
  get scene(): EtapeScene | null {
    const c = this.sceneEnCours;
    if (!c) return null;
    const e = acteParId(c.acte).etapes[c.etape];
    return e && e.kind === 'scene' ? e : null;
  }

  /* ⚠️ Les modules ouverts par l'ÉTAPE en cours — commande OU scène.
   *
   * `unlocks` ne lisait que la commande. Une scène qui envoie dans le Mode Live
   * sans l'ouvrir enverrait dans un module cadenassé : le cul-de-sac déjà payé
   * à l'acte 3, où la commande réclamait une basse que le Synthé verrouillé ne
   * laissait pas écrire. Une seule source pour les deux, sinon la règle vit à
   * deux endroits et n'est appliquée qu'à un. */
  get modulesRequis(): LockedModule[] | undefined {
    const m = [...(this.commande?.modulesRequis ?? []), ...(this.scene?.modulesRequis ?? [])];
    return m.length ? m : undefined;
  }

  /* Monter sur scène : on retient l'étape, et on emporte LE MORCEAU DU JOUEUR.
   *
   * ⚠️ Pas de `history.push()` ni de garde-fou sur l'Atelier : c'est le même
   * geste que « Reprendre » dans la discographie, qui remplace déjà le contenu
   * de l'Atelier par une production. Si le morceau manque (une partie qui
   * n'aurait pas livré cet acte-là), on part avec ce qu'il y a : une scène ne
   * doit jamais bloquer. */
  ouvrirScene(): void {
    const e = this.etapeCourante;
    if (e?.kind !== 'scene') return;
    this.sceneEnCours = { acte: this.acteActif, etape: this.etapeActive };
    if (e.bouclesDeLActe?.length) {
      this.monterLeSet(this.acteActif, e.bouclesDeLActe);
      return;
    }
    if (e.morceauDeLActe === undefined) return;
    const p = productionDeLActe(this.productions, e.morceauDeLActe);
    if (p) pattern.replace(deserializeState(p.etat));
  }

  /* MONTER LE SET — les boucles livrées deviennent des séquences, et le modèle
   * POP les enchaîne en couplet / refrain / pont.
   *
   * ⚠️ Le Mode Live faisait déjà tout ça À LA MAIN : ranger une séquence,
   * charger un modèle, assigner une séquence à chaque section. Ce qui manquait
   * était le pont entre ce que le joueur a LIVRÉ et ce que la bande joue — et
   * sans lui, un acte qui fait produire trois boucles se termine sur trois
   * fichiers que personne n'enchaîne.
   *
   * Les sections non citées par le récit (intro, outro) retombent sur la
   * PREMIÈRE boucle : une section sans séquence garderait le motif courant,
   * c'est-à-dire n'importe lequel, et le set commencerait au hasard.
   *
   * Rien de livré → on ne monte rien et on ne casse rien : la scène s'ouvre sur
   * ce qu'il y a, comme le rappel de l'acte 7. */
  private monterLeSet(
    acte: number,
    boucles: Array<{ serie: string; nom: string; section: string }>,
  ): void {
    const parSection = new Map<string, string>();
    for (const b of boucles) {
      const p = productionDeLaSerie(this.productions, acte, b.serie);
      if (p) parSection.set(b.section, sequenceBank.poser(b.nom, p.etat));
    }
    if (parSection.size === 0) return;
    const defaut = parSection.get(boucles[0].section) ?? null;
    architecture.chargerModele('POP');
    architecture.sections.forEach((s, i) => {
      architecture.poserSequence(i, parSection.get(s.nom) ?? defaut);
    });
    // On entre sur la première section, sinon la bande démarre sur le motif
    // que l'Atelier avait sous la main.
    if (defaut) sequenceBank.load(defaut);
  }

  /* Redescendre. ⚠️ On AVANCE : le rappel a eu lieu, l'écran suivant le
   * raconte. Un concert ne se note pas — il n'y a donc rien à vérifier, et
   * revenir sans avancer ferait rejouer le même écran indéfiniment. */
  terminerScene(): void {
    const c = this.sceneEnCours;
    this.sceneEnCours = null;
    if (!c) return;
    this.acteActif = c.acte;
    this.etapeActive = c.etape;
    this.avancerCarriere();
    this.acteTermineAAnnoncer = null;
  }

  /** Partir travailler : on retient QUELLE étape attend une livraison. */
  ouvrirCommande(): void {
    if (this.etapeCourante?.kind !== 'commande') return;
    this.commandeEnCours = { acte: this.acteActif, etape: this.etapeActive };
    this.cyclesEcoutes = 0;
    /* ⚠️ D'où part l'Atelier, et pourquoi il y a DEUX réponses.
     *
     * Par défaut : de RIEN. `defaultState()` est le motif d'accueil, et ce
     * motif est du Motown — ouvrir une commande dessus cochait des cases du
     * cahier avant que le joueur ait touché quoi que ce soit.
     *
     * Mais une commande peut aussi partir du rythme qu'on vient de reproduire
     * (`partirDu`), et le travail devient alors une TRANSFORMATION. Ce n'est
     * pas un retour en arrière sur la règle : ce qu'elle interdit, c'est une
     * check-list cochée d'avance, pas un Atelier non vide. La condition est
     * donc reportée sur le CAHIER, qui doit exiger ce que le rythme de départ
     * n'a pas — et c'est vérifié par un test, pas par la vigilance. */
    history.push();
    pattern.replace(this.departCommande());
    this.commandeVerdict = null;
    this.commandeAcceptee = null;
  }

  /* L'état sur lequel s'ouvre l'Atelier pour la commande courante.
   *
   * Table rase par défaut ; le rythme d'un niveau ÉCRIT si l'étape le demande.
   * Un `partirDu` qui pointe vers un niveau sans grille écrite retombe sur la
   * table rase plutôt que de partir d'un rythme tiré au sort — mais c'est un
   * défaut de données, et `tests/transformer.test.ts` le refuse. */
  departCommande(): PatternStateV2 {
    /* ⚠️ On lit la commande OUVERTE (`commandeEnCours`), pas le curseur de
     * carrière. Les deux coïncident tant qu'on joue le récit dans l'ordre ;
     * ils divergent dès qu'on refait un cahier depuis la salle de répétition,
     * et le départ serait alors celui d'une tout autre étape. */
    const e = this.commande;
    const acteDeLaCommande = this.commandeEnCours?.acte ?? this.acteActif;
    if (!e) return etatVierge();
    /* La chaîne d'envois d'un même acte : on reprend le morceau qu'on vient de
     * livrer, pas une table rase — « les livraisons intermédiaires doivent être
     * remplacées par les nouvelles jusqu'à la fin de l'acte » (Yann). */
    if (e.partirDeLaLivraison) {
      const p = productionDeLActe(this.productions, acteDeLaCommande);
      return p ? deserializeState(p.etat) : etatVierge();
    }
    /* Reprendre le morceau d'un acte PRÉCÉDENT — « on reprend le travail déjà
     * fait avec Kelvin » (Yann, 2026-09-04). Même filet : rien de livré
     * là-bas, on repart de la table rase plutôt que de bloquer. */
    /* Une BOUCLE précise de l'acte courant — l'acte 6 en fait trois, et le
     * refrain repart du couplet, jamais « du dernier livré ». */
    if (e.partirDeLaSerie !== undefined) {
      const p = productionDeLaSerie(this.productions, acteDeLaCommande, e.partirDeLaSerie);
      return p ? deserializeState(p.etat) : etatVierge();
    }
    if (e.partirDuMorceauDeLActe !== undefined) {
      const p = productionDeLActe(this.productions, e.partirDuMorceauDeLActe);
      return p ? deserializeState(p.etat) : etatVierge();
    }
    if (e.partirDu === undefined) return etatVierge();
    const l = LEVELS.find((x) => x.id === e.partirDu);
    if (!l?.grille) return etatVierge();
    return etatDepuisGrille(l.grille, l.tempoOptions[0]);
  }

  /* REFAIRE un cahier déjà traversé, depuis la salle de répétition.
   *
   * ⚠️ Demande de Yann (2026-09-04) : *« les exercices en ateliers, on doit
   * pouvoir y retourner dans la salle de répétition et abandonner en cours de
   * route »*. Trois choses le distinguent d'une commande de carrière, et les
   * trois tiennent dans `repetitionCommande` :
   *
   * - le curseur du récit ne bouge PAS (on ne rejoue pas l'acte pour autant) ;
   * - la production livrée REMPLACE quand même celle de sa série : refaire
   *   mieux, c'est garder le meilleur, et la discographie range par (acte,
   *   série) exactement pour ça ;
   * - les modules dont le cahier a besoin s'ouvrent le temps de la répétition,
   *   par le même chemin que pendant la carrière (`modulesRequis` dérive de la
   *   commande OUVERTE).
   *
   * Renvoie `false` si l'étape n'est pas une commande déjà rencontrée : on ne
   * répète pas ce qu'on n'a pas encore joué. */
  repeterCommande(acte: number, etape: number): boolean {
    const e = acteParId(acte).etapes[etape];
    if (!e || e.kind !== 'commande') return false;
    if (!this.commandesDeRepetition.some((c) => c.acte === acte && c.etape === etape)) return false;
    this.commandeEnCours = { acte, etape };
    this.repetitionCommande = true;
    this.cyclesEcoutes = 0;
    history.push();
    pattern.replace(this.departCommande());
    this.commandeVerdict = null;
    this.commandeAcceptee = null;
    return true;
  }

  /* Rendre la main sans livrer.
   *
   * ⚠️ AUCUNE étoile : une commande abandonnée n'est pas une commande faite, et
   * `saveEtoilesCommande` ne prend que le maximum — un abandon ne peut donc pas
   * non plus effacer les étoiles d'une réussite précédente.
   *
   * L'Atelier garde ce qu'on y a fait : c'est un abandon de la LIVRAISON, pas
   * du travail. Le curseur ne bouge pas, donc la carrière repropose l'étape. */
  abandonnerCommande(): void {
    this.commandeEnCours = null;
    this.repetitionCommande = false;
    this.commandeVerdict = null;
  }

  /* Livrer le morceau qu'on vient de faire.
   *
   * ⚠️ Le curseur n'avance QUE si le cahier est satisfait — c'est toute la
   * différence avec la livraison de l'acte 1, qui est un cadeau et non une
   * épreuve. Un refus n'est jamais muet : le verdict garde la ligne qui bloque,
   * et l'écran la montre. Un « non » sans raison est ce qui fait abandonner.
   */
  livrerCommande(etat: PatternStateV2, ctx: ContexteLivraison = {}): Verdict | null {
    const c = this.commande;
    if (!c) return null;
    const v = evaluerCommande(etat, c.cahier, ctx);
    this.commandeVerdict = v;
    if (!v.accepte) return v;
    // On se replace sur l'étape livrée avant d'avancer : le joueur a pu relire
    // un autre acte entre-temps, et c'est CETTE étape-là qu'il vient de finir.
    const cible = this.commandeEnCours!;
    const repetition = this.repetitionCommande;
    this.commandeEnCours = null;
    this.repetitionCommande = false;
    this.commandeAcceptee = c.accepte;
    /* ⚠️ L'acte est lu par son ID, jamais par le curseur. Le code se plaçait
     * sur l'étape livrée AVANT d'archiver, pour que `acteCourant` désigne le
     * bon acte — un ordre à respecter, donc un piège. En répétition ce détour
     * serait carrément faux : le curseur ne doit pas bouger du tout. */
    const acte = acteParId(cible.acte);
    this.archiverProduction(etat, {
      acte: cible.acte,
      serie: c.serie,
      titre: c.titre,
      client: c.client,
      quand: acte.quand,
    });
    /* ⚠️ La note, et elle a changé le 2026-09-04 : elle était binaire (livré
     * 3★), elle mesure maintenant l'effort FAIT EN PLUS du cahier — les
     * réglages qu'on a cherchés, et le fait d'avoir écouté son travail.
     * Idée de Yann : « on salue l'effort de rechercher un produit ». */
    const enPlus = reglagesEnPlus(etat, c.cahier, ctx);
    this.etoilesLivraison = etoilesDeLivraison(enPlus.length, this.cyclesEcoutes);
    this.roastLivraison = composerRoastLivraison(enPlus.length, this.cyclesEcoutes);
    this.saveEtoilesCommande(cible.acte, cible.etape, this.etoilesLivraison);
    // Une répétition ne fait pas avancer le récit — elle le refait.
    if (repetition) return v;
    this.acteActif = cible.acte;
    this.etapeActive = cible.etape;
    this.avancerCarriere();
    return v;
  }

  /* Livrer la sonnerie de l'acte 1 — un cadeau, pas une épreuve : aucun
   * cahier à satisfaire, on repart avec le rythme qu'on vient de faire.
   *
   * ⚠️ Vit ICI et non dans la vue, à côté de `livrerCommande` : ce sont les
   * deux seuls chemins qui produisent un morceau, et une règle qui a deux
   * domiciles finit par n'être appliquée qu'à un seul. La vue n'avait pas non
   * plus de raison de connaître l'ordre (archiver AVANT d'avancer, tant que le
   * curseur désigne encore l'acte livré).
   *
   * Renvoie `false` si l'étape courante n'est pas une livraison — la vue
   * n'appelle jamais dans ce cas, mais le store ne le suppose pas. */
  livrerSonnerie(): boolean {
    const e = this.etapeCourante;
    if (!e || e.kind !== 'livraison') return false;
    const acte = this.acteCourant;
    this.archiverProduction(this.toAtelierState(), {
      acte: acte.id,
      titre: e.titre,
      client: e.client,
      quand: acte.quand,
    });
    this.avancerCarriere();
    /* La livraison EST l'annonce de fin d'acte : la revoir au retour de
     * l'Atelier ferait deux fois la même nouvelle. */
    this.acteTermineAAnnoncer = null;
    return true;
  }

  /** Ouvrir (ou relire) un acte depuis son début. */
  ouvrirActe(id: number): void {
    if (!this.acteOuvert(id)) return;
    // Le joueur regarde un acte : ce qu'il voit n'est plus la fin du jeu.
    this.enRelecture = true;
    this.acteActif = id;
    this.etapeActive = 0;
    this.demarrerEtape();
  }

  /** Charge ce que l'étape courante demande. Une étape de récit n'a rien à
   *  charger : c'est du texte, la vue s'en occupe. */
  demarrerEtape(): void {
    this.enCarriere = true;
    const e = this.etapeCourante;
    /* ⚠️ On cherche par IDENTIFIANT, pas par position.
     *
     * C'était `startLevel(e.niveau - 1)` : une recherche positionnelle à
     * partir d'un id, qui ne marche que tant que `id === index + 1`. Rien ne
     * l'imposait. Un niveau inséré au milieu du tableau — ou un id sauté —
     * aurait décalé TOUS les exercices de TOUS les actes, en silence : chaque
     * étape aurait lancé le niveau du voisin, sans qu'aucun type ni aucun test
     * ne bronche.
     *
     * La règle « un niveau ajouté se pose en fin de tableau » (CLAUDE.md)
     * existait précisément pour éviter ça. Elle reste une bonne pratique, mais
     * elle n'est plus ce qui tient le jeu debout. */
    if (e && e.kind === 'exercice') {
      const i = LEVELS.findIndex((l) => l.id === e.niveau);
      if (i >= 0) this.startLevel(i);
    }
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
    this.ecrireProgression();
  }

  /* ---- Le PLANCHER ------------------------------------------------------
   *
   * Gelé ICI, au chargement du joueur, et pas à l'entrée dans la carrière :
   * c'est le seul endroit qui soit garanti d'être AVANT le premier exercice.
   * Gelé plus tard — au premier `memoriserCarriere`, par exemple — il aurait
   * enregistré un `level` déjà gonflé par l'exercice qui venait d'être réussi,
   * c'est-à-dire exactement le défaut qu'il existe pour corriger.
   *
   * Écrit UNE fois par joueur, jamais réécrit : « une porte déjà ouverte ne se
   * referme jamais » (CLAUDE.md). D'où le double effet, voulu :
   *
   *   - un joueur neuf gèle `1`, donc aucun seuil de niveau n'est franchi et
   *     le récit gouverne seul le déverrouillage ;
   *   - un joueur déjà en cours — vétéran de la campagne linéaire, ou testeur
   *     à mi-carrière — gèle ce qu'il a MAINTENANT et ne perd aucun module.
   *
   * Le second point est le prix du premier, et il est assumé : on préfère
   * qu'une poignée de sauvegardes existantes gardent un accès déjà donné
   * plutôt que de refermer une porte au nez de quelqu'un.
   */
  private gelerPlancher(): void {
    if (!this.pseudo || this.pseudo.toLowerCase() === 'master') return;
    const prev = this.progress[this.pseudo];
    if (prev?.plancher !== undefined) return;
    const base = prev ?? { level: 1, stars: {} };
    this.progress = { ...this.progress, [this.pseudo]: { ...base, plancher: base.level } };
    this.ecrireProgression();
  }

  /** Écrit la progression, et retient un refus du stockage — voir
   *  `persistanceRefusee`. */
  private ecrireProgression(): void {
    if (!writeJson(KEY_PROGRESS, this.progress)) this.persistanceRefusee = true;
  }

  load(): void {
    // Changer de joueur sort de toute relecture : c'est une vue, pas un état
    // de partie.
    this.enRelecture = false;
    this.progress = readJson<Record<string, PlayerProgress>>(KEY_PROGRESS, {});
    this.bags = readJson<Record<string, BagItem[]>>(KEY_BAG, {});
    this.disques = readJson<Record<string, Production[]>>(KEY_PROD, {});
    this.persistanceRefusee = !stockageEcrivable();
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
    // En dernier : `gelerPlancher` a besoin du pseudo, qui vient d'être
    // restauré ci-dessus (ou posé par `setPseudo`, qui appelle `load`).
    this.gelerPlancher();
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
    /* ⚠️ Par ID, pas par position — même raison que `startLevelById`. Le repli
     * sur le premier niveau vaut pour une progression qui cite un id disparu. */
    const iNiveau = LEVELS.findIndex((l) => l.id === prog.level);
    this.startLevel(iNiveau >= 0 ? iNiveau : 0);
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

  /* Ouvrir un niveau par son IDENTIFIANT.
   *
   * ⚠️ Le tableau `LEVELS` n'est PAS trié par id, et rien ne l'impose : un
   * niveau s'ajoute en fin de tableau, et l'un d'eux (73) s'est retrouvé APRÈS
   * les 74-78 le jour où le 78 a été inséré avant lui. `id === index + 1` est
   * donc faux pour huit niveaux — et la salle de répétition, qui appelait
   * `startLevel(id - 1)`, ouvrait pour eux l'exercice du VOISIN. En silence :
   * l'écran affiche le numéro cliqué, le préambule est celui d'à côté.
   *
   * C'est exactement la faute déjà payée par `demarrerEtape` (« on cherche par
   * IDENTIFIANT, pas par position »). Elle est ici rendue impossible : la vue
   * n'a plus d'index à manipuler. */
  startLevelById(id: number): void {
    const i = LEVELS.findIndex((l) => l.id === id);
    if (i >= 0) this.startLevel(i);
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
    /* ⚠️ Le verbe `style` tire son preset ICI, avant tout le reste, et le
     * passe aux trois helpers par un `presetId` posé sur une COPIE de la
     * config. C'est ce qui lui donne gratuitement la grille, la subdivision,
     * le tempo, le swing, la traîne ET le timbre du morceau réel — or c'est
     * exactement ça, un genre. Un `presetId` figé dans les données aurait fait
     * de la reconnaissance un exercice de mémoire dès la deuxième partie. */
    const cfgEffectif =
      cfg.exercise === 'style' ? { ...cfg, presetId: this.tirerStyle(presets) } : cfg;
    this.subdiv = subdivForLevel(cfgEffectif, presets);
    const preset = presetForLevel(cfgEffectif, presets);
    if (cfgEffectif.grille) {
      /* ⚠️ GRILLE ÉCRITE — elle prime sur tout le reste, et c'est le point.
       *
       * Arbitrage de Yann : un exercice se joue une fois, le tirer au sort
       * n'apporte rien et coûte cher. Ici la cible est POSÉE : ce que le
       * niveau enseigne se lit dans les données au lieu de se vérifier en
       * probabilité, et une courbe de difficulté devient dessinable.
       *
       * Aucun forçage n'est appliqué : la grille contient déjà, ou non, ses
       * variantes et ses rafales — c'est elle la vérité. */
      const g = cfgEffectif.grille;
      this.subdiv = { ...g.subdiv };
      const grid = emptyGrid(this.subdiv);
      const rolls = emptyRolls(this.subdiv);
      GAME_DRUM_ROWS.forEach((n) => {
        const ligne = g[n];
        for (let i = 0; i < this.subdiv[n]; i++) grid[n][i] = (ligne[i] ?? 0) as DrumStep;
        const r = g.rolls?.[n];
        if (r) for (let i = 0; i < this.subdiv[n]; i++) rolls[n][i] = r[i] ?? 1;
      });
      this.target = grid;
      this.targetRolls = rolls;
      this.tempo = pick(cfgEffectif.tempoOptions);
      /* Le FEEL suit la même règle que la grille : posé s'il est écrit, tiré
       * sinon. ⚠️ Le décalage n'avait pas de repli du tout — il était forcé à
       * zéro, donc un niveau écrit qui l'enseigne n'en aurait joué aucun. */
      this.swing = g.swing ?? pick(cfgEffectif.swingOptions);
      this.drag = g.drag ?? pick(cfgEffectif.dragOptions);
      this.shift = {
        kick: g.shift?.kick ?? 0,
        snare: g.shift?.snare ?? 0,
        hat: g.shift?.hat ?? 0,
      };
    } else if (preset) {
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
      /* ⚠️ Le forçage s'applique AUSSI aux niveaux preset, et c'est ce qui
       * manquait au tresillo : son préambule promet « variante et rafale y
       * sont ajoutées pour l'occasion », or le preset d'origine n'en contient
       * aucune — mesuré, 0 sur 60 tirages. Le commentaire de `mkLevel` le
       * disait déjà : le forçage sert aussi à « garantir qu'un concept déjà
       * enseigné est bien présent dans la cible, même si le preset original
       * n'en contenait pas assez ». */
      const rythmePreset = { target: grid, roll: emptyRolls(this.subdiv) };
      forcerVariantesEtRafales(rythmePreset, cfgEffectif, Math.random);
      this.target = rythmePreset.target;
      this.targetRolls = rythmePreset.roll;
      const pp = preset as unknown as { tempo: number; swing: number; drag: number };
      this.tempo = pp.tempo;
      this.swing = pp.swing;
      this.drag = pp.drag;
      this.shift = cfgEffectif.presetForceShift
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
    this.voice = voiceForLevel(cfgEffectif, presets);
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
    this.paramEcoutes = 0;
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

    if (this.level.exercise === 'arrangement') {
      this.preparerArrangement();
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
    /* ⚠️ La TONIQUE est DONNÉE, pas à redeviner.
     *
     * La cible commence toujours par le degré 1 — « sans point de départ,
     * aucun degré ne se situe » — et l'écran l'annonce (« le degré 1 est la
     * tonique, celui sur lequel la phrase se repose »). Elle n'était pourtant
     * pas posée : le joueur devait retrouver une note que la conception
     * considère comme acquise, et l'exercice se lisait comme cassé. Elle est
     * donc posée ET verrouillée d'entrée : c'est le repère contre lequel tous
     * les autres degrés s'entendent, exactement comme le kick est la seule
     * ligne laissée en place dans les exercices de groove. */
    const guess = new Array<number>(pas).fill(0);
    const locked = new Array<boolean>(pas).fill(false);
    guess[0] = cible[0];
    locked[0] = true;
    this.melodieGuess = guess;
    this.melodieLocked = locked;
  }

  /* L'ARRANGEMENT : on recopie la cible écrite, ligne par ligne.
   *
   * Rien n'est tiré au sort — c'est la règle des grilles écrites, et elle vaut
   * d'autant plus ici : un arrangement tiré ne saurait pas ce qu'il enseigne,
   * et « qui joue en même temps que qui » est précisément ce qu'on ne peut pas
   * obtenir d'un tirage de densité.
   *
   * ⚠️ Le PREMIER PAS de chaque ligne de synthé est donné et verrouillé, comme
   * la tonique de la mélodie : sans point de départ, aucun degré ne se situe.
   * Sur la batterie, rien n'est donné — un coup se situe tout seul. */
  private preparerArrangement(): void {
    const a = this.level.arrangement;
    if (!a) return;
    this.arrLignes = a.lignes;
    const cible: Record<string, number[]> = {};
    const guess: Record<string, number[]> = {};
    const locked: Record<string, boolean[]> = {};
    const ecoute: Record<string, boolean> = {};
    for (const l of a.lignes) {
      // ⚠️ Chaque ligne a SA longueur (`subdiv × cycles`) : une ligne de deux
      // mesures porte deux fois plus de cases et se lit en face des mêmes
      // colonnes. Découper tout le monde à `subdiv` amputait la seconde mesure.
      const n = longueurDeLigne(a, l);
      cible[l.nom] = l.pas.slice(0, n);
      guess[l.nom] = new Array(n).fill(0);
      locked[l.nom] = new Array(n).fill(false);
      // Toutes les lignes s'entendent au départ : le bouton d'écoute est un
      // outil qu'on prend, pas un état à défaire.
      ecoute[l.nom] = true;
      if (l.nature === 'degres' && cible[l.nom][0] > 0) {
        guess[l.nom][0] = cible[l.nom][0];
        locked[l.nom][0] = true;
      }
    }
    this.arrCible = cible;
    this.arrGuess = guess;
    this.arrLocked = locked;
    this.arrEcoute = ecoute;
    // La première case libre d'une ligne de synthé : le clavier vise toujours
    // quelque chose, sinon sa première frappe ne va nulle part.
    const synth = a.lignes.find((l) => l.nature === 'degres');
    this.arrSel = synth ? { ligne: synth.nom, pas: locked[synth.nom][0] ? 1 : 0 } : null;
    this.subdiv = { kick: a.subdiv, snare: a.subdiv, hat: a.subdiv };
    this.swing = a.swing ?? 0;
    this.drag = 0;
    this.shift = { kick: 0, snare: 0, hat: 0 };
  }

  /** Poser un coup sur une ligne de BATTERIE de l'arrangement. */
  arrCycler(ligne: string, pas: number): void {
    if (this.solved || this.revealed || this.arrLocked[ligne]?.[pas]) return;
    const max = ligne === 'kick' ? 1 : 2;
    this.arrGuess[ligne][pas] = (this.arrGuess[ligne][pas] + 1) % (max + 1);
  }

  /** Viser une case de SYNTHÉ (c'est elle que le clavier écrira). */
  arrViser(ligne: string, pas: number): void {
    if (this.solved || this.revealed) return;
    this.arrSel = { ligne, pas };
  }

  /** Écrire un degré sur la case visée. Le reposer l'efface, comme une case
   *  de batterie qu'on reclique. */
  arrPoserNote(degre: number): void {
    const sel = this.arrSel;
    if (!sel || this.solved || this.revealed || this.arrLocked[sel.ligne]?.[sel.pas]) return;
    // Un degré hors du clavier de CETTE ligne n'existe pas : sur la nappe, la
    // cinquième touche ne correspond à aucun accord.
    if (degre > this.arrDegreMax(sel.ligne)) return;
    const ligne = this.arrGuess[sel.ligne];
    ligne[sel.pas] = ligne[sel.pas] === degre ? 0 : degre;
  }

  /** Combien de COLONNES l'écran affiche : la boucle entière. Une ligne plus
   *  courte s'y répète — c'est ce qu'on entend. */
  get arrColonnes(): number {
    const a = this.level.arrangement;
    return a ? colonnesDeLArrangement(a) : 0;
  }

  /** Couper ou rendre une ligne à l'écoute. Sans effet sur ce qui est noté. */
  arrBasculerEcoute(ligne: string): void {
    this.arrEcoute[ligne] = this.arrEcoute[ligne] === false;
  }

  /** Toutes les lignes reviennent — le geste de sortie, en un bouton. */
  arrToutEntendre(): void {
    for (const l of this.arrLignes) this.arrEcoute[l.nom] = true;
  }

  /** Y a-t-il au moins une ligne coupée ? (l'écran doit le dire) */
  get arrDesLignesCoupees(): boolean {
    return this.arrLignes.some((l) => this.arrEcoute[l.nom] === false);
  }

  /** Jusqu'où monte le clavier de la ligne visée — la nappe s'arrête aux
   * accords disponibles (voir `degreMaxDeLigne`). */
  arrDegreMax(ligne: string): number {
    const a = this.level.arrangement;
    return a ? degreMaxDeLigne(a, ligne) : 5;
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
  /* Tire le genre à reconnaître, et les trois leurres.
   *
   * ⚠️ Les leurres viennent d'AUTRES catégories, jamais de la même, et c'est le
   * point de conception de l'exercice. La scène qui le motive est celle du
   * commercial qui fredonne : *« C'est du dancehall. Tu comprends
   * immédiatement. »* — on reconnaît une famille, pas un sous-genre. Proposer
   * « Boom bap » contre « Drill » et « Trap moderne » poserait une question
   * dont la réponse est un tirage au sort pour tout le monde sauf un
   * spécialiste, ce qui est exactement le défaut qu'on refuse ailleurs (voir
   * `tirerVersions` et son écart garanti par construction).
   *
   * Les quatre catégories des données SONT les quatre lignes du fax de
   * Zik'Mobile — hip-hop, club, latin, funk/soul : le brief du récit et le
   * classement du code disent la même chose, ce n'est pas une coïncidence
   * qu'on a arrangée après coup.
   *
   * Renvoie l'`id` du preset tiré ; le reste de l'état est posé dans la
   * foulée par `preparerStyle`, une fois la cible construite.
   */
  private tirerStyle(presets: GamePresetLike[]): string {
    const autorises = this.level.stylePool;
    /* ⚠️ Le filtre d'ÉPOQUE est ici, dans le tirage, et pas dans le
     * `stylePool` d'un niveau : c'est une règle du RÉCIT (on est en 2005), pas
     * une propriété d'un exercice. Posée sur un niveau, le prochain verbe qui
     * tire un genre l'oublierait — et c'est exactement comme ça que le niveau
     * 58 proposait « Trap moderne » à un stagiaire de 2005, 39 % du temps.
     * Voir `HORS_EPOQUE` (presets/songs.ts). */
    const pool = presets.filter(
      (p) =>
        p.cat &&
        p.label &&
        !HORS_EPOQUE.includes(p.id) &&
        (autorises.length === 0 || autorises.includes(p.id)),
    );
    const bon = pick(pool);
    this.stylePresetId = bon.id;
    // Un leurre par autre catégorie, pris au hasard dans chacune.
    const parCategorie = new Map<string, GamePresetLike[]>();
    for (const p of pool) {
      if (p.cat === bon.cat) continue;
      const l = parCategorie.get(p.cat as string) ?? [];
      l.push(p);
      parCategorie.set(p.cat as string, l);
    }
    const cats = [...parCategorie.keys()];
    for (let i = cats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cats[i], cats[j]] = [cats[j], cats[i]];
    }
    const choix = [bon.id, ...cats.slice(0, 3).map((c) => pick(parCategorie.get(c)!).id)];
    for (let i = choix.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choix[i], choix[j]] = [choix[j], choix[i]];
    }
    this.styleCandidats = choix;
    this.styleReponse = choix.indexOf(bon.id);
    this.styleChoix = null;
    return bon.id;
  }

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

    // « Le style » : la réponse est un genre désigné, pas une grille reposée.
    // La cible reste jouable telle quelle — c'est le morceau réel.
    if (this.level.exercise === 'style') {
      const juste = this.styleChoix === this.styleReponse;
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

    /* L'arrangement compare N lignes — le MÊME comparateur, une clé par ligne.
     * Aucune rafale : ce que l'exercice demande est qui joue et quoi, pas
     * combien de coups rapprochés. */
    if (this.level.exercise === 'arrangement') {
      const noms = this.arrLignes.map((l) => l.nom);
      const uns: Record<string, number[]> = {};
      for (const n of noms) uns[n] = new Array(this.arrCible[n].length).fill(1);
      const r = comparerGrilles<string>(this.arrCible, uns, this.arrGuess, uns, noms);
      r.aVerrouiller.forEach(({ row, col }) => (this.arrLocked[row][col] = true));
      if (r.exact) this.win();
      return r.exact;
    }

    /* La mélodie compare UNE ligne, avec le même comparateur que la batterie —
     * seul le sens des nombres change (un degré au lieu d'un coup). */
    if (this.level.exercise === 'melodie') {
      const rafales = this.melodieRafales;
      /* La comparaison ne dépend pas de la ligne — c'est `comparerGrilles`
       * généralisé sur `number[]`. On garde donc la clé `bass` comme simple
       * étiquette locale : changer de ligne ne change rien à ce qui est
       * comparé, seulement à ce qui SONNE (voir `etatPour`). */
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
  /* ⚠️ Le roast commente le VERBE joué, et ne cite que ce qui a été mesuré —
   * voir `composerRoast`. L'ancien lisait `voiceTier` pour parler de
   * difficulté (« avec de la polyrythmie ») sur douze verbes qui n'en ont
   * pas, et parlait d'écoutes que les verbes de paramètre ne comptaient pas.
   * Tout le calcul est PUR et vit dans les données ; le store ne fournit que
   * ses compteurs. */
  private composeRoast(): string {
    return composerRoast(this.level.exercise, {
      attempts: this.attempts,
      loopPlays: this.loopPlays,
      guessPlays: this.guessPlays,
      paramEcoutes: this.paramEcoutes,
    });
  }

  private grantItems(count: number, consolation = false): BagItem[] {
    const items: BagItem[] = consolation
      ? [CONSOLATION_ITEM]
      : Array.from({ length: count }, () => pick(BAG_ITEMS));
    const bag = [...(this.bags[this.pseudo] ?? []), ...items];
    this.bags = { ...this.bags, [this.pseudo]: bag };
    if (!writeJson(KEY_BAG, this.bags)) this.persistanceRefusee = true;
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
    this.ecrireProgression();
  }

  /* Ce que la salle de répétition propose : les niveaux déjà rencontrés dans le
   * récit, tous rejouables. Voir `niveauxRencontres` — le seuil `id <= level`
   * ne convenait pas, la carrière citant les niveaux dans un autre ordre que
   * leur numérotation.
   *
   * « master » et le contournement voient tout : ce sont des outils de test. */
  /* Les cahiers que la salle de répétition propose de refaire : ceux qu'on a
   * traversés, dans l'ordre du récit. Voir `commandesRencontrees` — même règle
   * que pour les niveaux, rencontré et non réussi, et l'étape en cours exclue.
   *
   * « master » voit tout : c'est un outil de test. */
  get commandesDeRepetition(): Array<{ acte: number; etape: number; entete: string; client: string }> {
    const refs =
      this.pseudo.toLowerCase() === 'master'
        ? commandesRencontrees(NB_ACTES, Number.MAX_SAFE_INTEGER)
        : (() => {
            const p = this.progresCarriere;
            return commandesRencontrees(p.acte, p.etape);
          })();
    return refs.flatMap((r) => {
      const e = acteParId(r.acte).etapes[r.etape];
      return e && e.kind === 'commande'
        ? [{ acte: r.acte, etape: r.etape, entete: e.entete, client: e.client }]
        : [];
    });
  }

  /** Les étoiles d'un cahier : 3 s'il a été livré, 0 sinon. */
  etoilesDeCommande(acte: number, etape: number): number {
    return this.playerProgress.stars[cleCommande(acte, etape)] ?? 0;
  }

  /* ⚠️ Une commande ne touche PAS `level`. Les étoiles d'un cahier vivent dans
   * le même enregistrement que celles des niveaux — c'est la même question
   * (« qu'est-ce qui est réussi ? ») — mais sous une clé qui ne peut pas
   * collisionner avec un `id` de niveau, et sans faire avancer le réservoir :
   * livrer un cahier n'est pas réussir le niveau suivant. */
  private saveEtoilesCommande(acte: number, etape: number, stars: number): void {
    if (this.pseudo.toLowerCase() === 'master') return;
    const prev = this.progress[this.pseudo] ?? { level: 1, stars: {} };
    const id = cleCommande(acte, etape);
    const next: PlayerProgress = {
      ...prev,
      stars: { ...prev.stars, [id]: Math.max(prev.stars[id] ?? 0, stars) },
    };
    this.progress = { ...this.progress, [this.pseudo]: next };
    this.ecrireProgression();
  }

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
    /* ⚠️ Le SON du niveau se pose ICI, avant tout le reste — décor, pas
     * consigne (voir `model/sons.ts`). Un exercice qui règle lui-même un
     * bouton (les verbes de paramètre) ou qui tire un timbre de palier doit
     * gagner sur lui, jamais l'inverse ; et la cible comme la version du
     * joueur le reçoivent, sinon une grille juste ne sonnerait pas comme le
     * modèle. */
    appliquerSons(state, this.level.sons);
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
    /* L'ARRANGEMENT sonne comme un morceau : les lignes de batterie sur leurs
     * voies, les lignes de synthé sur les leurs, tout le reste au repos. C'est
     * le seul exercice où l'on entend plusieurs natures ensemble — c'est même
     * sa définition. */
    if (this.level.exercise === 'arrangement') {
      const grille = which === 'guess' ? this.arrGuess : this.arrCible;
      const n = this.level.arrangement?.subdiv ?? 16;
      const nommees = new Set(this.arrLignes.map((l) => l.nom));
      /* ⚠️ La coupure balaie les CINQ lignes de batterie, pas les trois du jeu.
       * `GAME_DRUM_ROWS` s'arrête à kick/snare/hat ; un arrangement peut citer
       * le clap ou le shaker, et surtout : une ligne que l'arrangement NE cite
       * PAS doit se taire, même si le jeu ne l'utilise nulle part ailleurs.
       * Avec les trois seules, le clap du niveau 77 sonnait sans être coupé
       * ailleurs — ce qui marche par accident et casse au premier état de
       * départ qui l'ouvre. */
      DRUM_ROW_NAMES.forEach((r) => (state.rows[r].muted = !nommees.has(r)));
      for (const nom of SYNTH_ROW_NAMES) state.synthRows[nom].muted = !nommees.has(nom);
      for (const l of this.arrLignes) {
        /* ⚠️ L'ÉCOUTE coupe le son, jamais la réponse : une ligne coupée reste
         * comparée par `verify()`. C'est un outil de studio posé sur la
         * lecture, pas une réduction de ce qui est demandé. */
        const entendue = this.arrEcoute[l.nom] !== false;
        if (l.nature === 'drum') {
          const row = state.rows[l.nom as DrumRowName];
          row.muted = !entendue;
          row.subdiv = n;
          row.pattern = new Array(32).fill(0).map((z, i) => (grille[l.nom][i] ?? z) as DrumStep);
          row.rolls = new Array(32).fill(1);
          row.shiftPct = 0;
        } else {
          const row = state.synthRows[l.nom as SynthRowName];
          row.muted = !entendue;
          /* ⚠️ Une ligne de synthé peut tourner sur PLUSIEURS mesures — c'est
           * `cycleBars`, et c'est ce qui distingue un morceau d'une sonnerie.
           * Les lignes de batterie n'en ont pas : elles rebouclent sur leur
           * mesure, ce qui est exactement l'effet voulu quand la nappe, elle,
           * met deux mesures à revenir. */
          const mesures = Math.max(1, l.cycles ?? 1);
          row.cycleBars = mesures;
          row.subdivisions = n * mesures;
          /* ⚠️ La NAPPE ne joue pas des notes mais des ACCORDS : son pas est un
           * INDEX dans la liste des accords (0-based, `-1` pour le silence),
           * là où basse et mélodie portent un `{ degree, octave }`. Le jeu, lui,
           * n'affiche qu'un nombre : le degré 1 est l'accord 0. Sans cette
           * traduction, la nappe recevait un objet là où `scheduler.ts` attend
           * un nombre — donc `chordIdx = -1`, donc une ligne affichée, éditable,
           * notée, et parfaitement muette. */
          row.pattern =
            l.nom === 'pad'
              ? grille[l.nom].map((d) => (d > 0 ? d - 1 : -1))
              : grille[l.nom].map((d) => (d > 0 ? { degree: d, octave: 0 } : null));
          row.rolls = new Array(n * mesures).fill(1);
        }
      }
      return state;
    }

    if (this.level.exercise === 'melodie') {
      const degres = which === 'guess' ? this.melodieGuess : this.melodieCible;
      GAME_DRUM_ROWS.forEach((n) => (state.rows[n].muted = true));
      // La ligne du niveau sonne, les deux autres se taisent : un exercice
      // monophonique qui laisserait deux lignes ouvertes ferait entendre autre
      // chose que ce qu'il demande de reposer.
      const ligne = this.level.melodie.ligne;
      for (const n of SYNTH_ROW_NAMES) state.synthRows[n].muted = n !== ligne;
      const row = state.synthRows[ligne];
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
