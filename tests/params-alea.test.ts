import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import { PARAMETRES, parametre } from '../src/model/parametres';
import { LEVELS } from '../src/model/presets/levels';
import { ALEA_MINI } from '../src/model/commande';
import { renderEvents } from './helpers/rejeu';
import type { PatternStateV2, DrumRowName } from '../src/model/types';

/* Les boutons qui bougent tout seuls — et la seule chose qui les rend
 * enseignables : leur effet est MONOTONE, et il s'entend sur la ligne déclarée.
 *
 * ⚠️ Ce fichier existe parce que la première mesure a menti. Comparer deux
 * rendus au RMS disait que `spontRoll` avait un effet franc sur la caisse
 * claire (0,41 fois le RMS du morceau) — alors qu'il n'en a AUCUN : le
 * scheduler ne le consulte que dans la voie du charley. Le RMS mesurait la
 * différence entre deux tirages du hasard, pas l'effet du bouton.
 *
 * On mesure donc ce que le bouton fait vraiment, en rejouant le scheduler :
 * le nombre d'événements et la dispersion des gains. Un bouton d'aléa dont ces
 * deux mesures ne bougent pas est un bouton mort — trois versions identiques,
 * un niveau impossible et muet sur la raison.
 */

const ALEA = ['ghostDensity', 'randomVelocity', 'spontRoll'] as const;

/** Le contexte RÉEL d'un exercice de paramètre : une ligne + un repère. */
function contexte(ligne: DrumRowName, repere: DrumRowName): PatternStateV2 {
  const s = defaultState();
  s.tempo = 100;
  for (const l of ['kick', 'snare', 'hat', 'clap', 'shaker'] as const) {
    s.rows[l].pattern = new Array(32).fill(0) as never;
    s.rows[l].rolls = new Array(32).fill(1);
    s.rows[l].muted = false;
    s.rows[l].subdiv = 8;
  }
  [0, 2, 4, 6].forEach((i) => (s.rows[ligne].pattern[i] = 1 as never));
  if (repere !== ligne) [0, 4].forEach((i) => (s.rows[repere].pattern[i] = 1 as never));
  for (const l of ['bass', 'pad', 'melody'] as const) s.synthRows[l].muted = true;
  s.ghostDensity = 0;
  s.randomVelocity = 0;
  s.spontRoll = 0;
  s.fillEvery = 0;
  return s;
}

/** Ce que le bouton fait vraiment, moyenné sur 30 graines. */
function effet(champ: string, v: number, ligne: DrumRowName, repere: DrumRowName) {
  let evts = 0;
  let ecart = 0;
  const N = 30;
  for (let g = 0; g < N; g++) {
    const s = contexte(ligne, repere);
    (s as unknown as Record<string, number>)[champ] = v;
    const ev = renderEvents(s, 2, 100 + g);
    evts += ev.length;
    const gains = ev.map((e) => Number(e.split(' ')[2])).filter((x) => !Number.isNaN(x));
    const moy = gains.reduce((a, b) => a + b, 0) / (gains.length || 1);
    ecart += Math.sqrt(gains.reduce((a, b) => a + (b - moy) ** 2, 0) / (gains.length || 1));
  }
  return { evts: evts / N, ecart: ecart / N };
}

describe('un bouton d’aléa fait quelque chose, et de plus en plus', () => {
  for (const id of ALEA) {
    it(`${id} — l’effet croît sur la ligne déclarée`, () => {
      const p = parametre(id)!;
      expect(p, id).toBeTruthy();
      const ligne = p.lignes[0];
      const repere = p.contexte?.repere ?? 'kick';
      const bas = effet(id, p.min, ligne, repere);
      const haut = effet(id, p.max, ligne, repere);
      /* Un des deux doit croître : soit le bouton ajoute des frappes
       * (ghost notes, rafales), soit il fait varier leur force (vélocité). */
      const plusDEvenements = haut.evts > bas.evts * 1.05;
      const plusDeVariation = haut.ecart > bas.ecart * 1.3;
      expect(
        plusDEvenements || plusDeVariation,
        `${id} : ${bas.evts.toFixed(1)} évts/${bas.ecart.toFixed(3)} → ${haut.evts.toFixed(1)}/${haut.ecart.toFixed(3)}`,
      ).toBe(true);
    });

    it(`${id} — et le milieu tombe entre les deux`, () => {
      // La monotonie est ce qui permet de demander « lequel est le plus… ? ».
      // Sans elle, la question n'a pas de réponse fiable — c'est ce qui a fait
      // écarter `globalCompression`, dont le milieu dépassait le maximum.
      const p = parametre(id)!;
      const ligne = p.lignes[0];
      const repere = p.contexte?.repere ?? 'kick';
      const mi = (p.min + p.max) / 2;
      const [b, m, h] = [p.min, mi, p.max].map((v) => effet(id, v, ligne, repere));
      const croit = (x: number, y: number, z: number) => y >= x * 0.95 && z >= y * 0.95;
      expect(
        croit(b.evts, m.evts, h.evts) || croit(b.ecart, m.ecart, h.ecart),
        `${id} : ${JSON.stringify([b, m, h])}`,
      ).toBe(true);
    });
  }

  it('⚠️ spontRoll ne se déclare QUE sur le charley — mesuré, pas supposé', () => {
    /* Le scheduler ne consulte `spontRoll` que dans la voie du hat. Déclaré
     * sur la caisse claire, ce bouton poserait trois versions rigoureusement
     * identiques. C'est le cas d'école du champ `lignes`, et le test qui
     * l'aurait attrapé. */
    const p = parametre('spontRoll')!;
    expect(p.lignes).toEqual(['hat']);
    const bas = effet('spontRoll', 0, 'snare', 'kick');
    const haut = effet('spontRoll', 100, 'snare', 'kick');
    expect(haut.evts, 'sur la claire, il ne devrait RIEN faire').toBeCloseTo(bas.evts, 5);
    expect(haut.ecart).toBeCloseTo(bas.ecart, 5);
  });
});

describe('le niveau qui les enseigne', () => {
  const niveau = LEVELS.find((l) => l.id === 62)!;

  it('existe et ne tire que dans les boutons d’aléa', () => {
    expect(niveau, 'niveau 62 introuvable').toBeTruthy();
    expect(niveau.exercise).toBe('lequel');
    expect([...niveau.paramsAutorises].sort()).toEqual([...ALEA].sort());
  });

  it('et chacun de ces boutons existe vraiment au catalogue', () => {
    // Une coquille dans une liste d'autorisation ne filtre plus rien, en
    // silence — le même mode de panne que `HORS_EPOQUE`.
    for (const id of niveau.paramsAutorises) {
      expect(PARAMETRES.some((p) => p.id === id), `« ${id} » n’est pas au catalogue`).toBe(true);
    }
  });
});

describe('⚠️ un niveau dont le TITRE nomme ses choix ne doit pas en gagner en silence', () => {
  it('« Swing ou décalage ? » n’en propose que deux', () => {
    /* `nommer` prend ses leurres dans toute la famille. La famille `groove`
     * comptait deux boutons quand ce niveau a été écrit ; elle en compte cinq.
     * Sans liste explicite, le niveau serait devenu une question à quatre
     * choix dont le titre en annonce deux — sans qu'aucun test ne bronche. */
    const n47 = LEVELS.find((l) => l.id === 47)!;
    expect(n47.teach).toContain('Swing ou décalage');
    expect([...n47.paramsAutorises].sort()).toEqual(['shiftPct', 'swing']);
  });

  it('et la famille groove a bien grandi — sinon ce test ne protège rien', () => {
    const groove = PARAMETRES.filter((p) => p.famille === 'groove');
    expect(groove.length).toBeGreaterThanOrEqual(5);
  });
});

/* ⚠️ LE SEUIL DU CAHIER — un nombre écrit dans `commande.ts` doit être mesuré.
 *
 * L'acte 2 ne fait plus RECONNAÎTRE les trois boutons d'aléa (les niveaux 62 et
 * 73 sont retournés au réservoir le 2026-09-01) : sa commande demande d'en
 * POSER un — « l'aléa dans le cahier » (Yann). Un cahier qui exige une valeur
 * exige donc que cette valeur s'entende, sinon il fait cocher une case pour
 * rien, ce que la règle du dépôt interdit.
 *
 * `ALEA_MINI` porte trois nombres différents parce que les trois échelles le
 * sont (`serialize.ts` : 0-40 pour les ghost notes, 0-100 pour les deux
 * autres). Ce test les confronte à la même mesure que le reste du fichier —
 * rejeu du scheduler, ligne déclarée, moyenne sur 30 graines.
 */
describe('le seuil exigé par le cahier de l’acte 2 s’entend', () => {
  for (const id of ALEA) {
    it(`${id} — à ALEA_MINI, la mesure a déjà bougé`, () => {
      const p = parametre(id)!;
      const ligne = p.lignes[0];
      const repere = p.contexte?.repere ?? 'kick';
      const zero = effet(id, 0, ligne, repere);
      const seuil = effet(id, ALEA_MINI[id], ligne, repere);
      /* Les mêmes deux mesures que plus haut, et le même OU : un bouton d'aléa
       * ajoute des frappes ou fait varier leur force. `randomVelocity`, par
       * construction, n'ajoute jamais un coup — il ne peut passer que par la
       * seconde. */
      const plusDEvenements = seuil.evts > zero.evts * 1.05;
      const plusDeVariation = seuil.ecart > zero.ecart + 0.02;
      expect(
        plusDEvenements || plusDeVariation,
        `${id} au seuil ${ALEA_MINI[id]} : ${zero.evts.toFixed(1)} évts/${zero.ecart.toFixed(3)} → ${seuil.evts.toFixed(1)}/${seuil.ecart.toFixed(3)}`,
      ).toBe(true);
    });
  }

  it('et le seuil reste dans les bornes du curseur — sinon il est inatteignable', () => {
    // Une exigence au-dessus du maximum du bouton serait un cul-de-sac muet.
    for (const id of ALEA) {
      const p = parametre(id)!;
      expect(ALEA_MINI[id], `${id} : au-dessus du maximum`).toBeLessThanOrEqual(p.max);
      expect(ALEA_MINI[id], `${id} : un seuil nul n’exige rien`).toBeGreaterThan(0);
    }
  });
});
