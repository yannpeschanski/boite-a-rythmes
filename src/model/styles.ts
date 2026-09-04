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

/** Une ligne bien remplie — « le charley en doubles-croches », qu'on ne peut
 *  pas dire en temps précis parce que c'est une DENSITÉ qu'on entend, pas un
 *  placement. `part` est une fraction des pas de la ligne. */
export function densiteAuMoins(
  id: string,
  ligne: DrumRowName,
  part: number,
  libelle: string,
  opts: { essentiel?: boolean; subdivMini?: number } = {},
): CritereStyle {
  return {
    id,
    libelle,
    essentiel: opts.essentiel,
    verifie: (e) => {
      const r = e.rows[ligne];
      if (r.muted) return false;
      // Le DÉBIT autant que le remplissage : un charley plein en croches et un
      // charley plein en doubles-croches ne sonnent pas pareil, et c'est ce
      // qui sépare la house de la techno.
      if (opts.subdivMini !== undefined && r.subdiv < opts.subdivMini) return false;
      const pas = r.pattern.slice(0, r.subdiv);
      return pas.filter((v) => (v as number) > 0).length >= part * r.subdiv;
    },
  };
}

/* Une ligne DENSE MAIS TROUÉE — et c'est une description, pas une absence.
 *
 * ⚠️ Écrit pour le garage, et pour une raison mesurée : avec un simple
 * plancher de densité, sa fiche acceptait le baile funk à un critère près (même
 * tempo, même kick syncopé, même backbeat — mais charley PLEIN). Or le charley
 * troué n'est pas un détail du garage, c'est une condition : la notice du
 * preset le dit elle-même, il est clairsemé « pour que le shuffle ait la place
 * de s'entendre ».
 *
 * Un plafond de densité reste une description de ce qu'on ENTEND (une ligne qui
 * respire), pas l'exigence d'une absence — la règle qu'il ne faut pas casser
 * est « une fiche ne demande jamais qu'un instrument se taise ». */
export function densiteEntre(
  id: string,
  ligne: DrumRowName,
  min: number,
  max: number,
  libelle: string,
  opts: { subdivMini?: number } = {},
): CritereStyle {
  return {
    id,
    libelle,
    verifie: (e) => {
      const r = e.rows[ligne];
      if (r.muted) return false;
      if (opts.subdivMini !== undefined && r.subdiv < opts.subdivMini) return false;
      const part = r.pattern.slice(0, r.subdiv).filter((v) => (v as number) > 0).length / r.subdiv;
      return part >= min && part <= max;
    },
  };
}

/* Toutes les frappes de la ligne sont FERMÉES — aucune variante ouverte.
 *
 * C'est un critère de caractère, pas une absence : la ligne est là et on
 * décrit comment elle sonne. Le charley qui ne s'ouvre jamais est ce qui rend
 * la techno mécanique là où la house respire — mesuré sur les données, c'est
 * même le seul critère qui sépare vraiment les quatre genres en
 * four-on-the-floor. Une fiche ne doit pas exiger l'ABSENCE d'un instrument
 * (« pas de caisse claire ») ; décrire le timbre d'une ligne présente est une
 * autre chose. */
export function sansOuverture(ligne: DrumRowName, libelle: string): CritereStyle {
  return {
    id: `ferme:${ligne}`,
    libelle,
    verifie: (e) => {
      const r = e.rows[ligne];
      if (r.muted) return false;
      const pas = r.pattern.slice(0, r.subdiv);
      return pas.some((v) => (v as number) > 0) && !pas.some((v) => (v as number) === 2);
    },
  };
}

/** Au moins une rafale sur la ligne — l'accent des musiques de machine. */
export function rafaleSur(ligne: DrumRowName, libelle: string): CritereStyle {
  return {
    id: `rafale:${ligne}`,
    libelle,
    verifie: (e) => {
      const r = e.rows[ligne];
      if (r.muted) return false;
      return r.rolls.slice(0, r.subdiv).some((n, i) => n > 1 && (r.pattern[i] as number) > 0);
    },
  };
}

/** Les quatre contretemps d'une mesure — le « et » de un-et-deux-et. */
export const CONTRETEMPS = [0.5, 1.5, 2.5, 3.5];

export function tempoEntre(min: number, max: number, libelle: string): CritereStyle {
  return { id: 'tempo', libelle, verifie: (e) => e.tempo >= min && e.tempo <= max };
}

/* La boucle BALANCE — le swing écrit dans l'état, pas une impression.
 *
 * ⚠️ Il vaut comme critère de genre pour une raison mesurée : c'est ce qui
 * sépare le boom bap de tout le reste du hip-hop dans le catalogue. Son preset
 * est le seul de sa catégorie à porter un swing non nul (8), et un hip-hop
 * carré n'est pas du boom bap — c'est de la trap. */
export function avecSwing(
  min: number,
  libelle: string,
  opts: { essentiel?: boolean } = {},
): CritereStyle {
  return { id: 'swing', libelle, essentiel: opts.essentiel, verifie: (e) => e.swing >= min };
}

/* La boucle TRAÎNE — tout arrive un peu après le temps.
 *
 * `drag` est GLOBAL (il retarde tout du même montant), ce qui le rend
 * inutilisable comme exercice : dans une boucle, retarder tout ne s'entend
 * contre rien (voir `tests/feel-ecrit.test.ts`). Mais comme critère de GENRE
 * il dit quelque chose de vrai et d'audible à la première écoute — le morceau
 * est en retard sur lui-même. C'est la moitié du « drunk beat ». */
export function avecTraine(min: number, libelle: string): CritereStyle {
  return { id: 'traine', libelle, verifie: (e) => e.drag >= min };
}

/** Des coups en plus, joués faible — l'autre moitié du drunk beat. */
export function avecGhostNotes(min: number, libelle: string): CritereStyle {
  return { id: 'ghost', libelle, verifie: (e) => e.ghostDensity >= min };
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

/* TECHNO MINIMALE — la fiche de l'acte 4, celle du morceau commandé par Le
 * Tunnel. Relevée sur le preset `techno` : kick subdiv 4 sur les quatre temps
 * (le four-on-the-floor), tempo 130, charley en doubles-croches sur les seize
 * pas avec deux rafales d'accent (« snare à volume 0 + rafales d'accent sur le
 * hat », dit sa propre notice), et une basse.
 *
 * ⚠️ Le kick « sur chaque temps » est le MÊME critère que celui du dancehall,
 * et c'est normal : deux genres peuvent partager une fondation. Ce qui les
 * sépare, ce sont les quatre autres — le calibrage le vérifie plutôt que de le
 * supposer (`tests/styles.test.ts` exige deux critères d'écart au genre le
 * plus proche).
 *
 * Pas de critère « pas de caisse claire » : une fiche dit ce qu'il FAUT
 * entendre, jamais ce qu'il faut retirer. Une absence ne s'enseigne pas, et
 * elle punirait un morceau qui sonne juste avec une claire discrète.
 */
const TECHNO: FicheStyle = {
  id: 'techno',
  label: 'Techno minimale',
  chapeau: [
    'Détroit, milieu des années 80 : pensée pour les machines.',
    'Le kick sur les quatre temps, sans faiblir — le « four on',
    'the floor ». Au-dessus, un charley en doubles-croches qui',
    'ne s’ouvre jamais : c’est ce qui la rend mécanique, là où',
    'la house respire. Des rafales pour accentuer, et une basse.',
  ],
  seuil: 0.8,
  criteres: [
    surLesTemps('kick-4x4', ['kick'], [0, 1, 2, 3], 'Le kick sur les quatre temps', {
      essentiel: true,
    }),
    tempoEntre(124, 136, 'Entre 124 et 136 — le tempo du club'),
    densiteAuMoins('hat-16', 'hat', 0.75, 'Un charley en doubles-croches, qui ne s’arrête pas', {
      subdivMini: 16,
    }),
    sansOuverture('hat', 'Ce charley ne s’ouvre jamais — mécanique, pas dansant'),
    rafaleSur('hat', 'Au moins une rafale d’accent sur le charley'),
    synthQuiJoue('bass', 'Une basse qui joue', { essentiel: true }),
  ],
};

/* LE DRUNK BEAT — « HIP-HOP AUTHENTIQUE », première catégorie du fax.
 *
 * ⚠️ POURQUOI CETTE FICHE ET PAS CELLE DU BOOM BAP, qui était le premier
 * choix. Mesuré : la fiche du boom bap acceptait le preset `dilla` (5 critères
 * sur 6), et c'est musicalement JUSTE — le drunk beat est un boom bap dont la
 * quantification a été déréglée. Une fiche qui accepte le genre voisin ne
 * décrit plus rien, et le calibrage exige deux critères d'écart.
 *
 * La sortie n'est pas de rétrécir le boom bap jusqu'à ce que son cousin
 * tombe : c'est de décrire le cousin, dont les deux traits distinctifs sont
 * POSITIFS et s'entendent — la TRAÎNE et les GHOST NOTES. Le boom bap échoue
 * les deux (drag 0, ghostDensity 0), donc l'écart est de deux, par
 * construction et non par rabotage.
 *
 * Relevé sur le preset `dilla` : kick subdiv 8 sur [0, 3, 5] (le 1 puis entre
 * les temps), claire sur 2 et 4, tempo 88, swing 10, drag 15, ghostDensity 12.
 */
const DILLA: FicheStyle = {
  id: 'dilla',
  label: 'J Dilla « drunk beat »',
  chapeau: [
    'Detroit, fin des années 90, sur une MPC dont on a désactivé',
    'la quantification. Le kick sort des temps comme dans le boom',
    'bap — mais tout arrive un peu APRÈS, et des coups fantômes se',
    'glissent entre les autres. Ça balance, ça traîne, c’est vivant.',
  ],
  seuil: 0.8,
  criteres: [
    surLesTemps('kick-hors-temps', ['kick'], [0, 1.5], 'Le kick sur le 1, puis ENTRE les temps', {
      essentiel: true,
    }),
    surLesTemps('backbeat-24', ['snare', 'clap'], [1, 3], 'La claire répond sur 2 et 4'),
    avecSwing(5, 'Ça balance — la boucle n’est pas carrée'),
    avecTraine(10, 'Et ça TRAÎNE : tout arrive un peu après le temps'),
    avecGhostNotes(8, 'Des coups fantômes, joués faible, entre les autres'),
    tempoEntre(84, 96, 'Entre 84 et 96 — le tempo d’un break ralenti'),
  ],
};

/* UK GARAGE — « CLUB ÉNERGIE », deuxième catégorie du fax.
 *
 * ⚠️ POURQUOI PAS LA HOUSE, qui était le premier choix. Mesuré : sa fiche
 * acceptait `hardhouse` (5 critères sur 6 — le hard house EST de la house, en
 * plus rapide), et aucun critère POSITIF ne les sépare : la seule différence
 * lisible dans l'état est le tempo, et une fiche qui tient sur un seul nombre
 * ne décrit pas un genre. Même famille, même impasse que le boom bap et le
 * drunk beat.
 *
 * Le garage, lui, se nomme par son SHUFFLE : swing 45 quand 25 des 34 presets
 * sont à 0 et que le reste plafonne à 20. Relevé sur le preset `garage` :
 * tempo 130, swing 45, kick subdiv 8 sur [0, 3, 5], claire sur les temps 2 et
 * 4, charley en doubles-croches clairsemé (7 sur 16) — troué exprès, « pour
 * que le shuffle ait la place de s'entendre », dit sa notice.
 *
 * ⚠️ Corrigé le 2026-09-04 : ce commentaire disait « là où le catalogue
 * plafonne à 10 », et c'était faux — le preset `swing` (Funk/soul/jazz) est à
 * 60. Le garage n'est donc PAS seul à balancer fort, et la fiche ne tient pas
 * sur ce seul critère : c'est leur conjonction qui isole le genre (le preset
 * `swing` a le bon tempo, mais son kick tombe sur les temps et son charley
 * joue les huit croches — il échoue sur deux critères, la marge que le
 * calibrage exige).
 *
 * Il a en plus un mérite de récit : l'acte vient de le faire reproduire
 * (niveau 16, « Londres, 2001 »). On commande un genre qu'on vient d'entendre.
 */
const GARAGE: FicheStyle = {
  id: 'garage',
  label: 'UK Garage / 2-step',
  chapeau: [
    'Londres, fin des années 90. Le tempo du club, mais rien n’y',
    'tombe droit : le shuffle — le curseur Swing — est ÉNORME,',
    'les croches boitent, et le charley laisse des trous pour',
    'qu’on l’entende boiter. Le kick sort des temps,',
    'la claire tient bon sur 2 et 4.',
  ],
  seuil: 0.8,
  criteres: [
    /* ⚠️ LE CRITÈRE NOMME SON BOUTON, et il a fallu qu'on le demande pour s'en
     * apercevoir (Yann, 2026-09-04 : *« on parle d'un Shuffle énorme, c'est
     * quoi ? »*). « Shuffle » n'existait nulle part ailleurs dans le jeu : le
     * curseur s'appelle « Swing », son aide parle de « balancement », et le
     * catalogue contient même un preset « Shuffle » qui, lui, est à 15. Un
     * critère ESSENTIEL — donc bloquant — désignait ainsi un geste qu'aucun
     * écran ne reliait à un bouton. */
    avecSwing(30, 'Un shuffle ÉNORME — le curseur Swing, poussé loin', { essentiel: true }),
    surLesTemps('kick-garage', ['kick'], [0, 1.5], 'Le kick sur le 1, puis entre les temps'),
    surLesTemps('backbeat-24', ['snare', 'clap'], [1, 3], 'La claire tient les temps 2 et 4'),
    tempoEntre(124, 136, 'Entre 124 et 136 — le tempo du club'),
    densiteEntre('hat-troue', 'hat', 0.35, 0.65, 'Un charley en doubles-croches, mais TROUÉ', {
      subdivMini: 16,
    }),
    synthQuiJoue('bass', 'Une basse qui joue', { essentiel: true }),
  ],
};

/* DEMBOW — « AMBIANCE LATINO », troisième catégorie du fax.
 *
 * Relevé sur le preset `dembow` : kick subdiv 16 sur [0, 6] — le 1 et le
 * « et » du deuxième temps, c'est-à-dire la cellule 3+3+2 que l'acte vient de
 * faire jouer au tresillo ; claire et clap en RIM SHOT sur les pas 4 et 7,
 * soit le temps 2 et le seizième qui le suit ; shaker en croches pleines ;
 * tempo 95.
 *
 * ⚠️ Le SHAKER est un critère à part entière, et c'est ce qui rend la fiche
 * discriminante : deux presets sur trente-quatre en ont un qui joue. Le
 * placement de la claire (temps 1,75) demande en plus une ligne en
 * doubles-croches — on ne peut pas le poser par accident. */
const DEMBOW: FicheStyle = {
  id: 'dembow',
  label: 'Dembow / reggaeton',
  chapeau: [
    'Panamá puis Porto Rico : le riddim qui a tout envahi.',
    'Le kick pose le 1 et le « et » du deux — la cellule 3+3+2,',
    'celle du tresillo. La claire répond juste après le temps 2,',
    'sèche, en rim shot. Et un shaker tient la croche, sans arrêt.',
  ],
  seuil: 0.8,
  criteres: [
    surLesTemps('dembow-kick', ['kick'], [0, 1.5], 'Le kick sur le 1 et sur le « et » du 2', {
      essentiel: true,
    }),
    surLesTemps('dembow-reponse', ['snare', 'clap'], [1, 1.75], 'La réponse juste après le temps 2'),
    surLesTemps('dembow-rim', ['snare'], [1, 1.75], 'Cette réponse est sèche — en rim shot', {
      variante: true,
    }),
    densiteAuMoins('shaker-8', 'shaker', 0.9, 'Un shaker qui tient la croche sans s’arrêter'),
    tempoEntre(88, 102, 'Entre 88 et 102 — le tempo du riddim'),
    synthQuiJoue('bass', 'Une basse qui joue', { essentiel: true }),
  ],
};

export const FICHES: FicheStyle[] = [DANCEHALL, TECHNO, DILLA, GARAGE, DEMBOW];

export function ficheStyle(id: string): FicheStyle | null {
  return FICHES.find((f) => f.id === id) ?? null;
}
