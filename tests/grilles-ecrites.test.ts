import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/model/presets/levels';
import { ACTES } from '../src/model/carriere';
import type { GameLevel } from '../src/model/presets/levels';

/* Les trois lignes du Mode jeu. Recopiées plutôt qu'importées : leur
 * définition vit dans `stores/game.svelte.ts`, et tirer le store entier dans
 * un test de DONNÉES lui ferait exiger un `localStorage` pour vérifier un
 * tableau de nombres. */
const LIGNES = ['kick', 'snare', 'hat'] as const;

/* Les rythmes ÉCRITS — et le seul défaut qu'ils peuvent encore avoir.
 *
 * Ces niveaux existent parce qu'un exercice se joue une fois : le tirer au
 * sort ne rend service à personne et empêche de dessiner une courbe (« il
 * n'est pas nécessaire de randomiser les exercices dans la mesure où chaque
 * personne ne les ferait qu'une seule fois », Yann, 2026-08-27). Une grille
 * posée à la main enlève d'un coup toute la famille de bugs mesurée en
 * probabilité — « 0 variante sur 60 tirages » pour un préambule qui en
 * annonce une.
 *
 * Reste l'autre moitié du même défaut, celui qui a coûté le plus cher dans ce
 * projet : L'ÉCRAN PROMET CE QUE LES DONNÉES NE TIENNENT PAS. Le préambule du
 * niveau 5 dit « une seule des deux claires en porte une, c'est la dernière ».
 * Rien dans le type ne l'oblige. C'est ce que ce fichier vérifie — la grille
 * contre sa propre annonce, une par une.
 */

const ECRITS = LEVELS.filter((l) => l.grille);

function ligne(l: GameLevel, n: 'kick' | 'snare' | 'hat'): number[] {
  return l.grille![n].slice(0, l.grille!.subdiv[n]);
}
function rafales(l: GameLevel, n: 'kick' | 'snare' | 'hat'): number[] {
  const r = l.grille!.rolls?.[n];
  return Array.from({ length: l.grille!.subdiv[n] }, (_, i) => r?.[i] ?? 1);
}

describe('une grille écrite est bien formée', () => {
  it('il y en a', () => {
    // Une régression silencieuse possible : quelqu'un retire `grille` et tout
    // le reste de ce fichier passe en ne vérifiant rien.
    expect(ECRITS.length).toBeGreaterThanOrEqual(8);
  });

  for (const l of ECRITS) {
    it(`niveau ${l.id} — « ${l.teach} »`, () => {
      for (const n of LIGNES) {
        const pas = l.grille!.subdiv[n];
        expect(pas, `${n} : subdivision`).toBeGreaterThan(0);
        // Écrire moins de cases que la subdivision n'est pas une erreur de
        // type — `startLevel` complète à zéro. C'en est une de LECTURE : la
        // grille cesse de se lire d'un coup d'œil, ce pour quoi elle existe.
        expect(l.grille![n].length, `${n} : longueur`).toBe(pas);
        for (const v of ligne(l, n)) expect([0, 1, 2], `${n} : valeur`).toContain(v);
        rafales(l, n).forEach((r, i) => {
          expect(r, `${n}[${i}] : rafale`).toBeGreaterThanOrEqual(1);
          // Une rafale sur une case éteinte ne s'entend pas : elle se lit
          // comme une intention, et se recopie comme une faute.
          if (r > 1) expect(ligne(l, n)[i], `${n}[${i}] : rafale sur case vide`).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe('ce que la grille contient, le niveau le DÉCLARE', () => {
  // Sinon l'écran d'édition ne laisse pas produire la cible : une variante
  // qu'on ne peut pas poser rend le niveau impossible, et muet sur la raison.
  for (const l of ECRITS) {
    it(`niveau ${l.id}`, () => {
      for (const n of ['snare', 'hat'] as const) {
        if (ligne(l, n).includes(2)) expect(l.variant[n], `${n} : variante non déclarée`).toBe(true);
      }
      expect(ligne(l, 'kick'), 'le kick n’a pas de variante').not.toContain(2);
      for (const n of LIGNES) {
        const max = Math.max(...rafales(l, n));
        if (max > 1) expect(l.rollMax, `${n} : rollMax trop bas`).toBeGreaterThanOrEqual(max);
      }
    });
  }
});

/* ---- LE PRÉAMBULE CONTRE LA GRILLE ------------------------------------
 *
 * Un test par promesse, écrit à la main comme la grille : ce sont deux
 * énoncés du même rythme, et c'est exactement pour ça qu'ils doivent être
 * confrontés. Ajouter un niveau écrit sans ajouter sa ligne ici ne casse
 * rien — c'est assumé : on ne peut pas vérifier automatiquement une phrase
 * en français, on peut seulement refuser de la laisser seule.
 */
function niveau(id: number): GameLevel {
  const l = LEVELS.find((x) => x.id === id);
  expect(l, `niveau ${id} introuvable`).toBeTruthy();
  return l!;
}
const compte = (a: number[], v: number) => a.filter((x) => x === v).length;

describe('chaque niveau écrit tient ce que son préambule annonce', () => {
  it('2 — « le kick sur 1 et 3, la claire répond sur 2 et 4 »', () => {
    const l = niveau(2);
    expect(ligne(l, 'kick')).toEqual([1, 0, 1, 0]);
    expect(ligne(l, 'snare')).toEqual([0, 1, 0, 1]);
    expect(ligne(l, 'hat').every((v) => v === 0), 'le charley n’est pas encore là').toBe(true);
  });

  it('3 — « le charleston joue en croches, deux fois par temps »', () => {
    const l = niveau(3);
    expect(l.grille!.subdiv.hat).toBe(2 * l.grille!.subdiv.kick);
    expect(ligne(l, 'hat').every((v) => v === 1)).toBe(true);
  });

  it('7 — « le kick tombe ENTRE deux temps » (une fois, et une seule)', () => {
    const l = niveau(7);
    const k = ligne(l, 'kick');
    expect(l.grille!.subdiv.kick, 'la mesure se découpe en huit cases').toBe(8);
    const horsTemps = k.map((v, i) => (v && i % 2 === 1 ? i : -1)).filter((i) => i >= 0);
    expect(horsTemps, 'une syncope, pas deux').toHaveLength(1);
  });

  it('5 — « une seule des deux claires en porte une. C’est la dernière »', () => {
    const l = niveau(5);
    const s = ligne(l, 'snare');
    expect(compte(s, 2), 'un seul rim shot').toBe(1);
    expect(s.lastIndexOf(2), 'sur la DERNIÈRE claire').toBe(s.map((v) => (v ? 1 : 0)).lastIndexOf(1));
    expect(compte(ligne(l, 'hat'), 2), 'et rien sur le charley').toBe(0);
  });

  it('59 — « un seul charley ouvert, sur la toute dernière croche »', () => {
    const l = niveau(59);
    const h = ligne(l, 'hat');
    expect(compte(h, 2)).toBe(1);
    expect(h[h.length - 1]).toBe(2);
    expect(compte(ligne(l, 'snare'), 2), 'la claire est au repos').toBe(0);
  });

  it('60 — « rim shot ET charley ouvert, sur un kick syncopé »', () => {
    const l = niveau(60);
    expect(compte(ligne(l, 'snare'), 2), 'le rim shot').toBe(1);
    expect(compte(ligne(l, 'hat'), 2), 'l’ouverture').toBe(1);
    expect(ligne(l, 'kick')[3], 'le kick sur le « et » de 2').toBe(1);
    expect(Math.max(...rafales(l, 'hat')), 'rien de neuf : pas encore de rafale').toBe(1);
  });

  it('8 — « une seule rafale, sur le tout dernier charley »', () => {
    const l = niveau(8);
    const r = rafales(l, 'hat');
    expect(r.filter((v) => v > 1), 'une seule').toHaveLength(1);
    expect(r[r.length - 1], 'la dernière').toBeGreaterThan(1);
    expect(compte(ligne(l, 'snare'), 2), 'et aucune variante à côté').toBe(0);
    expect(compte(ligne(l, 'hat'), 2)).toBe(0);
  });

  it('61 — « la syncope, le rim shot, l’ouverture, et une rafale »', () => {
    const l = niveau(61);
    expect(ligne(l, 'kick')[3], 'la syncope').toBe(1);
    expect(compte(ligne(l, 'snare'), 2), 'le rim shot').toBe(1);
    expect(compte(ligne(l, 'hat'), 2), 'l’ouverture').toBe(1);
    const r = rafales(l, 'hat');
    expect(r.filter((v) => v > 1), 'une rafale, une seule').toHaveLength(1);
    // « sur le « et » du troisième temps » : huit croches, le 3e temps
    // commence à l'index 4, son « et » est le 5.
    expect(r[5], 'sur le « et » du 3e temps').toBeGreaterThan(1);
  });
});

describe('l’acte 1 est une COURBE, donc rien n’y est tiré au sort', () => {
  it('chacun de ses exercices cite un niveau à la grille écrite', () => {
    // C'est l'invariant de fond : une progression où chaque niveau ajoute
    // exactement une chose ne survit pas à un tirage, qui peut poser deux
    // nouveautés d'un coup ou aucune.
    const acte1 = ACTES.find((a) => a.id === 1)!;
    const cites = acte1.etapes.filter((e) => e.kind === 'exercice').map((e) => (e as { niveau: number }).niveau);
    expect(cites.length, 'la série a été allongée à huit').toBe(8);
    for (const id of cites) expect(niveau(id).grille, `niveau ${id} : tiré au sort`).toBeTruthy();
  });

  it('et la série n’ajoute jamais deux nouveautés d’un coup', () => {
    // Lu sur les données : le nombre de CHOSES nouvelles (variante de claire,
    // ouverture de charley, rafale) ne monte que d'un cran à la fois.
    const acte1 = ACTES.find((a) => a.id === 1)!;
    const cites = acte1.etapes.filter((e) => e.kind === 'exercice').map((e) => (e as { niveau: number }).niveau);
    let precedent = 0;
    for (const id of cites) {
      const l = niveau(id);
      const n =
        (compte(ligne(l, 'snare'), 2) > 0 ? 1 : 0) +
        (compte(ligne(l, 'hat'), 2) > 0 ? 1 : 0) +
        (LIGNES.some((r) => Math.max(...rafales(l, r)) > 1) ? 1 : 0);
      expect(n, `niveau ${id} : ${n} nouveautés après ${precedent}`).toBeLessThanOrEqual(precedent + 1);
      precedent = Math.max(precedent, n);
    }
  });
});
