/* L'horloge du son ENTENDU — celle que la case allumée suit.
 *
 * ⚠️ « Il s'agit avant tout de bien synchroniser le son à l'image et que le
 * tempo soit propre » (2026-10-15). Ces tests font tourner l'horloge sur des
 * contextes FEINTS, modelés sur ce que le code des navigateurs fait vraiment
 * (voir `engine/horlogeEntendue.ts`) :
 *
 *   - Chrome Android, téléphone de Yann : `currentTime` monte par MARCHES de
 *     171 ms (8192 trames à 48 kHz, rendues d'une rafale), `outputLatency`
 *     déclare 448 ms, et l'horodatage de sortie avance, lui, sans à-coups ;
 *   - Firefox : `baseLatency` à 0 écrit en dur, un rappel tous les ~42 ms, et
 *     un horodatage déduit d'`outputLatency` — qui ne dit rien de plus.
 *
 * Ce qui compte, et qu'aucun test de notes ne regardait : à 60 images par
 * seconde, une case n'avance jamais de plus d'une colonne d'une image à la
 * suivante, et aucun pas n'est sauté. L'ancienne horloge (`currentTime −
 * retard`) échoue à ce test sur le premier modèle — on le vérifie aussi, sinon
 * le test ne prouverait pas qu'il voit les marches.
 */
import { describe, it, expect } from 'vitest';
import { HorlogeEntendue, decalageHorodate, type Releve } from '../src/engine/horlogeEntendue';

interface Modele {
  /** Hauteur d'une marche de currentTime (s). */
  marche: number;
  /** Ce que le navigateur déclare (s) — `undefined` = rien. */
  outputLatency?: number;
  baseLatency?: number;
  /** Le vrai retard entre « fin du dernier bloc rendu, juste avant le
   *  suivant » et l'oreille (s). */
  retardReel: number;
  /** 'chrome' : horodatage vrai ; 'gecko' : déduit d'outputLatency ; null : absent. */
  horodatage: 'chrome' | 'gecko' | null;
  /** Gigue des rappels (ms), déterministe. */
  gigueMs?: number;
  /** Le rendu s'ARRÊTE à `aS` (s écoulées) pendant `dureeS`. `trou` : la sortie
   *  a manqué des blocs, donc on entend un silence et tout ce qui suit arrive
   *  d'autant plus tard. Sans trou, le tampon a couvert l'arrêt : le rendu
   *  rattrape d'une rafale et l'oreille ne s'aperçoit de rien. */
  arret?: { aS: number; dureeS: number; trou: boolean };
}

const DEBUT_MS = 10_000;

/* Le temps « utile » écoulé — ce que le rendu (ou l'oreille) a avancé. */
function ecouleRendu(md: Modele, e: number): number {
  const a = md.arret;
  if (!a || e < a.aS) return e;
  if (e < a.aS + a.dureeS) return a.aS;
  return a.trou ? e - a.dureeS : e;
}
function ecouleEntendu(md: Modele, e: number): number {
  const a = md.arret;
  if (!a || !a.trou || e < a.aS) return e;
  return e < a.aS + a.dureeS ? a.aS : e - a.dureeS;
}

/** L'instant de contexte qu'on entend VRAIMENT au mur `m` (ms). */
function entenduReel(md: Modele, m: number): number {
  return ecouleEntendu(md, (m - DEBUT_MS) / 1000) - md.retardReel;
}

/* Les rappels arrivent tous les `marche` (± gigue) : après le k-ième,
   currentTime vaut (k + 1) × marche. Juste avant un rappel, `currentTime −
   retardReel` est exactement ce qu'on entend ; juste après, il est en avance
   d'une marche — c'est la dent de scie que lit la recherche. */
function currentTimeA(md: Modele, m: number): number {
  const ecoule = ecouleRendu(md, (m - DEBUT_MS) / 1000);
  if (ecoule < 0) return 0;
  const k = Math.floor(ecoule / md.marche);
  // Gigue : un rappel sur trois arrive en retard de `gigueMs`.
  const g = md.gigueMs ?? 0;
  const debutK = DEBUT_MS + k * md.marche * 1000;
  const enRetard = k % 3 === 1 && m < debutK + g;
  return (enRetard ? k : k + 1) * md.marche;
}

function releve(md: Modele, m: number): Releve {
  const currentTime = currentTimeA(md, m);
  let horodatage: Releve['horodatage'] = null;
  if (md.horodatage === 'chrome') {
    // Position entendue au dernier rappel, à l'instant de ce rappel. Avec un
    // arrêt : un rappel toutes les 20 ms, AUCUN pendant l'arrêt — l'horodatage
    // reste alors celui du dernier rappel, comme dans Chrome.
    const k = Math.floor((m - DEBUT_MS) / (md.marche * 1000));
    let p = DEBUT_MS + k * md.marche * 1000;
    if (md.arret) {
      const a0 = DEBUT_MS + md.arret.aS * 1000;
      const a1 = a0 + md.arret.dureeS * 1000;
      p = m >= a0 && m < a1 ? a0 : m - ((m - DEBUT_MS) % 20);
    }
    const contextTime = entenduReel(md, p);
    horodatage = contextTime > 0 ? { contextTime, performanceTime: p } : { contextTime: 0, performanceTime: 0 };
  } else if (md.horodatage === 'gecko') {
    const ol = md.outputLatency ?? 0;
    horodatage = { contextTime: Math.max(0, currentTime - ol), performanceTime: m - ol * 1000 };
  }
  return {
    murMs: m,
    currentTime,
    baseLatency: md.baseLatency,
    outputLatency: md.outputLatency,
    horodatage,
  };
}

/** Fait tourner l'horloge à 60 images/s, plus un tick d'ordonnanceur toutes
 *  les 25 ms — les deux relèvent. Rend, par image, l'heure lue et l'heure vraie. */
function rouler(md: Modele, secondes: number, h = new HorlogeEntendue(), depuisS = 0) {
  const images: Array<{ m: number; lu: number; vrai: number }> = [];
  let prochaineImage = DEBUT_MS + depuisS * 1000;
  let prochainTick = prochaineImage + 3;
  const fin = prochaineImage + secondes * 1000;
  while (prochaineImage < fin) {
    if (prochainTick < prochaineImage) {
      h.noter(releve(md, prochainTick));
      prochainTick += 25;
      continue;
    }
    const lu = h.maintenant(releve(md, prochaineImage));
    if (lu !== null) images.push({ m: prochaineImage, lu, vrai: entenduReel(md, prochaineImage) });
    prochaineImage += 1000 / 60;
  }
  return images;
}

/** La plus longue suite d'images où l'heure lue NE BOUGE PAS — une case
 *  figée. C'est le prix du « ne jamais reculer », et c'est lui qu'on borne :
 *  une assertion « lu ne décroît pas » ne peut pas échouer, puisque le code
 *  l'impose. */
function plusLongGel(images: Array<{ lu: number }>): number {
  let max = 0;
  let courant = 0;
  for (let k = 1; k < images.length; k++) {
    courant = images[k].lu <= images[k - 1].lu ? courant + 1 : 0;
    if (courant > max) max = courant;
  }
  return max;
}

/** Les colonnes allumées image par image, pour des doubles croches à 120 BPM. */
function colonnes(heures: number[], pas = 0.125): number[] {
  return heures.filter((t) => t >= 0).map((t) => Math.floor(t / pas));
}

const CHROME_BT: Modele = {
  marche: 0.171,
  baseLatency: 0.171,
  outputLatency: 0.448,
  retardReel: 0.448,
  horodatage: 'chrome',
};

describe("l'horloge entendue — Chrome Android, marches de 171 ms", () => {
  it("suit le son à quelques millisecondes près, d'après l'horodatage", () => {
    const h = new HorlogeEntendue();
    const images = rouler(CHROME_BT, 8, h).filter((i) => i.m > DEBUT_MS + 1500);
    expect(h.source()).toBe('horodatage');
    for (const i of images) expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.003);
  });

  it("n'avance jamais de plus d'une case par image, et n'en saute aucune", () => {
    const cols = colonnes(rouler(CHROME_BT, 8).map((i) => i.lu));
    for (let k = 1; k < cols.length; k++) {
      const d = cols[k] - cols[k - 1];
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });

  it("l'ANCIENNE horloge (currentTime − retard déclaré) saute des cases sur ce modèle", () => {
    // Le témoin : sans lui, le test précédent pourrait passer sur une horloge
    // qui n'a jamais eu de marches.
    const heures: number[] = [];
    for (let m = DEBUT_MS; m < DEBUT_MS + 8000; m += 1000 / 60) {
      heures.push(currentTimeA(CHROME_BT, m) - 0.448);
    }
    const cols = colonnes(heures);
    const sauts = cols.slice(1).filter((c, k) => c - cols[k] > 1).length;
    expect(sauts).toBeGreaterThan(10);
  });

  it("sans horodatage, le retard déclaré suffit — retranché d'une horloge sans marches", () => {
    const md = { ...CHROME_BT, horodatage: null };
    const h = new HorlogeEntendue();
    const images = rouler(md, 8, h).filter((i) => i.m > DEBUT_MS + 2500);
    expect(h.source()).toBe('declare');
    // En avance d'au plus une image : la veille d'une marche est vue au plus
    // tard une image avant elle. Jamais en retard.
    for (const i of images) {
      expect(i.lu - i.vrai).toBeGreaterThan(-0.002);
      expect(i.lu - i.vrai).toBeLessThan(0.02);
    }
    const cols = colonnes(images.map((i) => i.lu));
    for (let k = 1; k < cols.length; k++) expect(cols[k] - cols[k - 1]).toBeLessThanOrEqual(1);
  });

  it('ne se fige pas quand les rappels arrivent en retard', () => {
    const md = { ...CHROME_BT, horodatage: null, gigueMs: 12 };
    const images = rouler(md, 8).filter((x) => x.m > DEBUT_MS + 2500);
    expect(plusLongGel(images)).toBe(0);
    for (const i of images) expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.025);
  });

  it('suit un changement de sortie (casque branché en cours de route)', () => {
    const h = new HorlogeEntendue();
    rouler(CHROME_BT, 4, h);
    // Le casque ajoute 150 ms : on entend désormais plus tard.
    const casque = { ...CHROME_BT, retardReel: 0.598, outputLatency: 0.598 };
    const images = rouler(casque, 4, h, 4);
    // L'image RALENTIT pour se laisser rejoindre — elle ne se fige jamais…
    expect(plusLongGel(images)).toBe(0);
    // … et le nouveau retard est suivi en moins d'une demi-seconde : le
    // changement de régime se voit à ce que tous les relevés récents
    // s'écartent du même côté, il n'attend pas que la médiane bascule.
    for (const i of images.filter((x) => x.m > DEBUT_MS + 4500)) {
      expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.003);
    }
  });
});

describe("l'horloge entendue — un rendu qui s'arrête", () => {
  /* ⚠️ Trouvé par la revue du 2026-10-16 : un seul rappel en retard qui
     affame la sortie décalait l'oreille, et la médiane sur deux secondes mettait
     une seconde à le suivre — image en avance de tout l'arrêt, puis figée. */
  const GECKO_ARRET = (trou: boolean, dureeS = 0.1): Modele => ({
    marche: 0.042,
    baseLatency: 0,
    outputLatency: 0.2,
    retardReel: 0.2,
    horodatage: 'gecko',
    arret: { aS: 4, dureeS, trou },
  });

  it('un TROU dans le son (rappel en retard de 100 ms) est suivi en moins de 300 ms', () => {
    const images = rouler(GECKO_ARRET(true), 7);
    for (const i of images.filter((x) => x.m > DEBUT_MS + 4400)) {
      expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.02);
    }
    expect(plusLongGel(images.filter((x) => x.m > DEBUT_MS + 2500 && x.m < DEBUT_MS + 3900))).toBe(0);
  });

  it('un rappel en retard SANS trou ne déplace rien', () => {
    // Le tampon a couvert l'arrêt : l'oreille n'a rien perdu, l'image non plus.
    const images = rouler(GECKO_ARRET(false, 0.03), 7).filter((x) => x.m > DEBUT_MS + 2500);
    for (const i of images) expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.02);
  });

  it('Chrome, arrêt de 400 ms avec trou : rattrapé sans gel dès que le son revient', () => {
    /* Pendant le trou, aucune page ne peut savoir que le son s'est tu — aucun
       rappel, donc aucun horodatage neuf. Ce qui se juge est l'APRÈS : le
       changement est vu en ~120 ms (six horodatages qui s'écartent du même
       côté), et l'image le rattrape à mi-vitesse, 400 ms en 800 ms, sans
       jamais se figer. */
    const md: Modele = { ...CHROME_BT, arret: { aS: 4, dureeS: 0.4, trou: true } };
    const images = rouler(md, 7);
    expect(plusLongGel(images.filter((x) => x.m > DEBUT_MS + 1500))).toBe(0);
    for (const i of images.filter((x) => x.m > DEBUT_MS + 4400 + 120 + 800 + 50)) {
      expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.005);
    }
  });

  it('un fil principal BLOQUÉ (aucun relevé pendant 300 ms) ne fausse pas l’heure', () => {
    // Le rendu, lui, n'a pas arrêté : rien n'a changé pour l'oreille.
    const GECKO: Modele = { marche: 0.042, baseLatency: 0, outputLatency: 0.2, retardReel: 0.2, horodatage: 'gecko' };
    const h = new HorlogeEntendue();
    rouler(GECKO, 4, h);
    const apres = rouler(GECKO, 3, h, 4.3);
    for (const i of apres) expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.02);
  });
});

describe("l'horloge entendue — Firefox", () => {
  const GECKO: Modele = {
    marche: 0.042,
    baseLatency: 0,
    outputLatency: 0.2,
    retardReel: 0.2,
    horodatage: 'gecko',
  };

  it("reconnaît l'horodatage de Gecko pour ce qu'il est : rien de plus que outputLatency", () => {
    const r = releve(GECKO, DEBUT_MS + 3000);
    expect(decalageHorodate(r)).toBeNull();
    // Même sans `baseLatency` à 0 : `performanceTime` pile à maintenant − OL.
    expect(decalageHorodate({ ...r, baseLatency: undefined })).toBeNull();
  });

  it('suit le son sur le retard déclaré, sans marches', () => {
    const h = new HorlogeEntendue();
    const images = rouler(GECKO, 6, h).filter((i) => i.m > DEBUT_MS + 2500);
    expect(h.source()).toBe('declare');
    for (const i of images) {
      expect(i.lu - i.vrai).toBeGreaterThan(-0.002);
      expect(i.lu - i.vrai).toBeLessThan(0.02);
    }
    const cols = colonnes(images.map((i) => i.lu));
    for (let k = 1; k < cols.length; k++) expect(cols[k] - cols[k - 1]).toBeLessThanOrEqual(1);
  });
});

describe("l'horloge entendue — ce qui n'est pas une sortie audio", () => {
  it('un horodatage à zéro (horloge pas démarrée) est ignoré', () => {
    expect(
      decalageHorodate({ murMs: 1000, currentTime: 1, baseLatency: 0.01, horodatage: { contextTime: 0, performanceTime: 0 } }),
    ).toBeNull();
  });

  it("un horodatage AU-DELÀ de ce qui est rendu est ignoré — on n'entend pas l'avenir", () => {
    expect(
      decalageHorodate({
        murMs: 1000,
        currentTime: 1,
        baseLatency: 0.01,
        horodatage: { contextTime: 1.2, performanceTime: 1000 },
      }),
    ).toBeNull();
  });

  it('dater une frappe dans le passé récent tombe sur la même droite', () => {
    const h = new HorlogeEntendue();
    rouler(CHROME_BT, 4, h);
    const m = DEBUT_MS + 4000;
    const avant = h.entenduA(m - 30)!;
    expect(Math.abs(avant - entenduReel(CHROME_BT, m - 30))).toBeLessThan(0.003);
  });

  it("oublie tout d'un contexte à l'autre", () => {
    const h = new HorlogeEntendue();
    rouler(CHROME_BT, 3, h);
    h.oublier();
    expect(h.source()).toBeNull();
    expect(h.entenduA(DEBUT_MS)).toBeNull();
  });
});
