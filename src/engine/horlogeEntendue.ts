/* L'horloge du son ENTENDU — celle que la case allumée doit suivre.
 *
 * POURQUOI CE FICHIER EXISTE (2026-10-15, « il s'agit avant tout de bien
 * synchroniser le son à l'image et que le tempo soit propre — ce n'est pas le
 * premier site internet qui synchronise l'image et le son »).
 *
 * Une vidéo se synchronise seule parce que son lecteur asservit l'image à
 * l'instant où le son SORT, que le système lui donne à chaque rappel, et qu'il
 * INTERPOLE entre deux rappels avec l'horloge murale. On faisait autre chose :
 * `ctx.currentTime − un retard`. Deux défauts, mesurés sur le téléphone de
 * Yann et lus dans le code des deux navigateurs :
 *
 *   1. `currentTime` avance par MARCHES. Chrome Android rend par rafales d'un
 *      tampon entier (171 ms sur ce téléphone) : l'horloge saute de 171 ms d'un
 *      coup, plusieurs pas arrivent dans la même image, la case saute ou
 *      bégaie — un tempo visuel faux même quand le retard est juste. Firefox
 *      avance par rappel, ~24 fois par seconde.
 *   2. Le retard était mal lu. La norme dit que `currentTime − contextTime`
 *      n'est PAS une estimation fiable, à cause des marches ; c'est pourtant ce
 *      qu'on en faisait, et on prenait ensuite le PLUS GRAND de deux chiffres,
 *      c'est-à-dire toujours la plus grosse erreur.
 *
 * CE QUI LE REMPLACE — deux sources, la meilleure d'abord :
 *
 *   - l'HORODATAGE de sortie (`getOutputTimestamp()`) : « l'instant de
 *     contexte qui sort maintenant », à l'instant `performanceTime`. C'est la
 *     même source que le lecteur vidéo de Chrome (le retard d'AAudio, Bluetooth
 *     compris si le système le déclare). On en garde le DÉCALAGE entre les deux
 *     horloges, `contextTime − performanceTime`, constant à la dérive près ;
 *     sa médiane sur deux secondes lisse le bruit. Entendu = mur + décalage :
 *     une droite, donc aucune marche.
 *   - à défaut, le retard DÉCLARÉ (`outputLatency`), mais retranché d'une
 *     horloge sans marches : juste avant qu'il ne saute, `currentTime − retard`
 *     vaut ce qu'on entend ; entre deux sauts il est EN AVANCE, d'au plus une
 *     marche. Le décalage `currentTime − mur` relevé à la VEILLE de chaque
 *     saut est donc la vérité, à une image près ; on en garde la médiane sur
 *     deux secondes — pas le minimum, qu'un seul rappel en retard tirerait
 *     vers le bas pour toute la fenêtre.
 *
 * ⚠️ FIREFOX N'A PAS D'HORODATAGE À LUI. Gecko calcule `getOutputTimestamp()`
 * à partir d'`outputLatency` et le retranche des DEUX champs : l'extrapolation
 * de la norme y retombe sur `currentTime`, c'est-à-dire un retard nul. On le
 * reconnaît sans lire le nom du navigateur — `baseLatency` y vaut 0, écrit en
 * dur, ou `performanceTime` y est pile `maintenant − outputLatency` — et on
 * passe alors au retard déclaré.
 *
 * Ce module est PUR : il reçoit des relevés, il ne touche ni au contexte ni au
 * DOM. `tests/horloge-entendue.test.ts` le fait tourner sur des horloges
 * feintes — une à marches de 171 ms, une façon Gecko — et exige qu'une case
 * n'avance jamais de plus d'une colonne par image et qu'aucun pas ne soit
 * sauté.
 */

export interface Horodatage {
  contextTime: number;
  performanceTime: number;
}

/** Ce qu'on lit du contexte, à un instant donné. */
export interface Releve {
  /** `performance.now()` au moment du relevé, en millisecondes. */
  murMs: number;
  currentTime: number;
  /** `ctx.baseLatency`, en secondes — absent si non déclaré. */
  baseLatency?: number;
  /** `ctx.outputLatency`, en secondes — absent tant qu'il n'est pas lisible.
   *  ⚠️ 0 veut dire INCONNU (Firefox avant le premier rappel), pas « aucun
   *  retard ». */
  outputLatency?: number;
  /** `ctx.getOutputTimestamp()`, absent si le navigateur ne l'a pas. */
  horodatage?: Horodatage | null;
}

export type SourceHorloge = 'horodatage' | 'declare';

/* Fenêtre de lissage, en millisecondes. Deux secondes : assez pour couvrir
   une dizaine de marches de 171 ms et la dent de scie des horodatages AAudio,
   assez court pour suivre un changement de sortie en une seconde. */
const FENETRE_MS = 2000;
/* Un horodatage par 20 ms au plus : le relevé tombe à chaque image ET à
   chaque tick de l'ordonnanceur, inutile de garder des doublons. */
const ECHANTILLON_MIN_MS = 20;
/* Au moins trois horodatages récents avant de les croire. */
const HORODATAGES_MIN = 3;
/* Un écart plus grand que ça entre deux images n'est pas une correction mais
   une horloge neuve : on ne bloque pas la sortie pour « ne jamais reculer ». */
const RECUL_MAX = 1;
/* Tolérance de lecture : un horodatage qui annonce un instant AU-DELÀ de ce qui
   est rendu, ou plus de deux secondes en arrière, n'est pas une sortie audio. */
const MARGE_RENDU = 0.005;
const RETARD_MAX = 2;

interface Echantillon {
  murMs: number;
  valeur: number;
}

/** Médiane d'une liste non vide. */
function mediane(xs: number[]): number {
  const tri = [...xs].sort((a, b) => a - b);
  const m = tri.length >> 1;
  return tri.length % 2 ? tri[m] : (tri[m - 1] + tri[m]) / 2;
}

/** Le retard déclaré, en secondes. `outputLatency` s'il dit quelque chose ;
 *  sinon deux tampons (WebKit ne déclare pas `outputLatency`). */
export function retardDeclare(r: Releve): number {
  if (typeof r.outputLatency === 'number' && r.outputLatency > 0) return r.outputLatency;
  return (r.baseLatency || 0) * 2;
}

/** L'horodatage de ce relevé dit-il quelque chose que `currentTime` ne dit
 *  pas ? Rend le décalage `contextTime − performanceTime` (s), ou null. */
export function decalageHorodate(r: Releve): number | null {
  const ts = r.horodatage;
  if (!ts || !(ts.contextTime > 0) || !(ts.performanceTime > 0)) return null;
  // Gecko : `baseLatency` est écrit à 0 et l'horodatage est déduit
  // d'`outputLatency` — l'extrapoler redonnerait `currentTime`.
  if (r.baseLatency === 0) return null;
  const ol = r.outputLatency;
  if (typeof ol === 'number' && ol > 0 && Math.abs(r.murMs - ts.performanceTime - ol * 1000) < 2) {
    return null;
  }
  const decalage = ts.contextTime - ts.performanceTime / 1000;
  const entendu = r.murMs / 1000 + decalage;
  if (entendu > r.currentTime + MARGE_RENDU || entendu < r.currentTime - RETARD_MAX) return null;
  return decalage;
}

export class HorlogeEntendue {
  private horodates: Echantillon[] = [];
  private dernierHorodateMs = -Infinity;
  /* Le décalage `currentTime − mur` relevé À LA VEILLE de chaque marche. */
  private veilles: Echantillon[] = [];
  private dernier: Releve | null = null;
  private sauts: number[] = [];
  private derniereMarcheMs: number | null = null;
  private derniereSortie: number | null = null;

  /** Contexte neuf : rien de l'ancien ne vaut pour lui. */
  oublier(): void {
    this.horodates = [];
    this.dernierHorodateMs = -Infinity;
    this.veilles = [];
    this.dernier = null;
    this.sauts = [];
    this.derniereMarcheMs = null;
    this.derniereSortie = null;
  }

  noter(r: Releve): void {
    const avant = this.dernier;
    if (avant && r.currentTime < avant.currentTime) {
      // L'horloge a reculé : ce n'est plus le même contexte.
      this.oublier();
    } else if (avant && r.currentTime > avant.currentTime) {
      /* Une MARCHE. Le relevé d'avant était le dernier coup d'œil sur
         l'ancienne valeur, donc le plus proche de ce qu'on entendait : c'est
         lui qui dit l'heure. */
      const pas = this.pasMarche();
      if (this.derniereMarcheMs !== null && r.murMs - this.derniereMarcheMs > 4000 * pas + 100) {
        /* L'horloge était ARRÊTÉE (rendu interrompu), pas entre deux marches :
           le décalage d'avant ne vaut plus, et sa médiane mettrait une
           seconde à l'oublier. */
        this.veilles = [];
      }
      this.derniereMarcheMs = r.murMs;
      this.veilles.push({ murMs: r.murMs, valeur: avant.currentTime - avant.murMs / 1000 });
      this.sauts.push(r.currentTime - avant.currentTime);
      if (this.sauts.length > 16) this.sauts.shift();
    }
    this.dernier = r;
    this.purger(this.veilles, r.murMs);

    const d = decalageHorodate(r);
    if (d !== null && r.murMs - this.dernierHorodateMs >= ECHANTILLON_MIN_MS) {
      this.dernierHorodateMs = r.murMs;
      this.horodates.push({ murMs: r.murMs, valeur: d });
    }
    this.purger(this.horodates, r.murMs);
  }

  /* Garde la fenêtre — et toujours le dernier échantillon, pour qu'une page
     restée sans relevé quelques secondes ne retombe pas à vide. */
  private purger(xs: Echantillon[], murMs: number): void {
    while (xs.length > 1 && murMs - xs[0].murMs > FENETRE_MS) xs.shift();
  }

  /** D'où vient l'heure, ou null tant qu'aucun relevé n'est arrivé. */
  source(): SourceHorloge | null {
    if (!this.dernier) return null;
    return this.horodatesFrais() ? 'horodatage' : 'declare';
  }

  private horodatesFrais(): boolean {
    const r = this.dernier;
    if (!r || this.horodates.length < HORODATAGES_MIN) return false;
    // Un horodatage vieux de plus d'une fenêtre ne dit plus rien de la sortie
    // (Chrome rend des zéros quand elle change).
    return r.murMs - this.horodates[this.horodates.length - 1].murMs <= FENETRE_MS;
  }

  /** La hauteur d'une marche de `currentTime`, en secondes (médiane des
   *  dernières) — 0 tant qu'on n'en a pas vu. */
  pasMarche(): number {
    return this.sauts.length ? mediane(this.sauts) : 0;
  }

  /** L'instant de contexte qu'on ENTEND à l'instant mural `murMs` — y compris
   *  dans le passé récent (la date d'une frappe). Null sans relevé. */
  entenduA(murMs: number): number | null {
    const r = this.dernier;
    if (!r) return null;
    if (this.horodatesFrais()) {
      return murMs / 1000 + mediane(this.horodates.map((e) => e.valeur));
    }
    /* Le `currentTime − mur` des veilles de marche. Sans marche encore vue,
       le relevé courant, qui est en avance de zéro à une marche : on retranche
       la moitié du tampon déclaré, le temps que la première arrive. */
    const decalage = this.veilles.length
      ? mediane(this.veilles.map((e) => e.valeur))
      : r.currentTime - r.murMs / 1000 - (r.baseLatency || 0) / 2;
    return murMs / 1000 + decalage - retardDeclare(r);
  }

  /** L'heure entendue MAINTENANT (au relevé `r`) : ne recule jamais, et ne
   *  dépasse jamais ce qui est rendu. */
  maintenant(r: Releve): number | null {
    this.noter(r);
    let t = this.entenduA(r.murMs);
    if (t === null) return null;
    if (t > r.currentTime) t = r.currentTime;
    const avant = this.derniereSortie;
    if (avant !== null && t < avant && avant - t < RECUL_MAX) t = avant;
    this.derniereSortie = t;
    return t;
  }
}
