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
}

const DEBUT_MS = 10_000;

/** L'instant de contexte qu'on entend VRAIMENT au mur `m` (ms). */
function entenduReel(md: Modele, m: number): number {
  return (m - DEBUT_MS) / 1000 - md.retardReel;
}

/* Les rappels arrivent tous les `marche` (± gigue) : après le k-ième,
   currentTime vaut (k + 1) × marche. Juste avant un rappel, `currentTime −
   retardReel` est exactement ce qu'on entend ; juste après, il est en avance
   d'une marche — c'est la dent de scie que lit la recherche. */
function currentTimeA(md: Modele, m: number): number {
  const ecoule = (m - DEBUT_MS) / 1000;
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
    // Position entendue au dernier rappel, à l'instant de ce rappel.
    const k = Math.floor((m - DEBUT_MS) / (md.marche * 1000));
    const p = DEBUT_MS + k * md.marche * 1000;
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

  it('ne recule jamais, même quand les rappels arrivent en retard', () => {
    const md = { ...CHROME_BT, horodatage: null, gigueMs: 12 };
    const images = rouler(md, 8);
    for (let k = 1; k < images.length; k++) expect(images[k].lu).toBeGreaterThanOrEqual(images[k - 1].lu);
    for (const i of images.filter((x) => x.m > DEBUT_MS + 2500)) {
      expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.025);
    }
  });

  it('suit un changement de sortie (casque branché en cours de route)', () => {
    const h = new HorlogeEntendue();
    rouler(CHROME_BT, 4, h);
    // Le casque ajoute 150 ms : on entend désormais plus tard.
    const casque = { ...CHROME_BT, retardReel: 0.598, outputLatency: 0.598 };
    const images = rouler(casque, 4, h, 4);
    // Le temps de rattraper (l'image reste figée au lieu de reculer)…
    for (let k = 1; k < images.length; k++) expect(images[k].lu).toBeGreaterThanOrEqual(images[k - 1].lu);
    // … puis le nouveau retard, dans la seconde et demie.
    for (const i of images.filter((x) => x.m > DEBUT_MS + 5500)) {
      expect(Math.abs(i.lu - i.vrai)).toBeLessThan(0.003);
    }
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
