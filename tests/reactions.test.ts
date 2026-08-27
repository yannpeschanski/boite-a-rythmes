import { describe, it, expect } from 'vitest';
import { defaultState, etatVierge } from '../src/model/defaults';
import { reactionA, OBSERVATIONS, lignesAudibles } from '../src/model/reactions';
import { PRESETS } from '../src/model/presets/songs';
import { presetToState } from '../src/model/presetAdapter';
import type { PatternStateV2, SynthStep } from '../src/model/types';

/* Ce que le jeu dit du morceau livré — et les quatre règles de `reactions.ts`.
 *
 * ⚠️ Le vrai sujet de ce fichier est la CALIBRATION, pas le câblage. Une
 * observation qui se déclenche sur du travail correct n'est pas un détail de
 * ton : c'est le jeu qui a tort, à voix haute, au moment précis où le joueur
 * attend qu'on écoute ce qu'il a fait. Deux ont déjà été prises en flagrant
 * délit avant d'exister — « ta basse fait deux notes » tombait sur 12 presets
 * sur 34, « ton charley ne respire jamais » sur 11. Les 34 presets servent donc
 * d'étalon : ce sont des morceaux faits par des gens qui savent.
 */

/** Une basse qui joue `n` hauteurs distinctes, sur un morceau qui sonne. */
function avecBasse(n: number): PatternStateV2 {
  const e = defaultState();
  const r = e.synthRows.bass;
  r.muted = false;
  r.subdivisions = 8;
  const pas: SynthStep[] = [];
  for (let i = 0; i < 8; i++) pas.push(i % 2 === 0 ? ((i / 2) % n) + 1 : null);
  r.pattern = pas;
  return e;
}

describe('règle 4 — rien à dire, on ne dit rien', () => {
  it('un Atelier vide ne reçoit AUCUNE réplique', () => {
    /* Le défaut trouvé à la sonde, et le pire cas possible : une pique sur un
     * morceau qui n'existe pas prouve en une phrase que le jeu ne regarde pas.
     * (Avant la garde globale, `etatVierge()` recevait « c'est trop fort ».) */
    expect(lignesAudibles(etatVierge())).toHaveLength(0);
    expect(reactionA(etatVierge())).toBeNull();
  });

  it('et la garde ne dépend pas d’une observation particulière', () => {
    // Aucune des observations ne doit tenir sur le vide : la garde globale est
    // une ceinture, pas la seule bretelle.
    const vide = etatVierge();
    for (const o of OBSERVATIONS) expect(o.tient(vide), o.id).toBe(false);
  });
});

describe('règle 2 — on ne commente que ce qui est AUDIBLE', () => {
  it('une basse coupée n’est jamais commentée', () => {
    const e = avecBasse(1);
    e.synthRows.bass.muted = true;
    expect(reactionA(e)?.id).not.toBe('basse-service-minimum');
  });

  it('une ligne vide ne compte pas dans les lignes audibles', () => {
    const e = defaultState();
    const avant = lignesAudibles(e).length;
    e.rows.hat.pattern = e.rows.hat.pattern.map(() => 0);
    expect(lignesAudibles(e).length).toBe(avant - 1);
  });
});

describe('la réplique de Yann, et ce qu’elle ne doit PAS punir', () => {
  it('une basse d’UNE seule hauteur → « service minimum »', () => {
    expect(reactionA(avecBasse(1))?.id).toBe('basse-service-minimum');
  });

  it('⚠️ une basse de DEUX hauteurs n’est pas punie', () => {
    // C'est la calibration qui a été corrigée : 9 presets sur 34 tiennent sur
    // deux hauteurs. Punir ça, c'est punir un tiers du catalogue.
    const r = reactionA(avecBasse(2));
    expect(r?.id).not.toBe('basse-service-minimum');
  });

  it('une basse de quatre hauteurs est complimentée', () => {
    const r = reactionA(avecBasse(4));
    expect(r?.ton).toBe('compliment');
  });
});

describe('règle 3 — le poids est la SPÉCIFICITÉ', () => {
  it('la remarque la plus précise gagne, même contre un compliment', () => {
    // `avecBasse(1)` satisfait aussi « un arrangement » (quatre lignes) : la
    // basse à une note est plus précise, elle passe devant.
    const e = avecBasse(1);
    expect(lignesAudibles(e).length).toBeGreaterThanOrEqual(4);
    expect(reactionA(e)?.id).toBe('basse-service-minimum');
  });

  it('et un compliment précis gagne contre une pique vague', () => {
    // Basse mobile (6) contre « droit comme un rail » (4).
    const e = avecBasse(4);
    e.swing = 0;
    e.drag = 0;
    expect(reactionA(e)?.id).toBe('basse-qui-bouge');
  });

  it('le choix de l’observation est DÉTERMINISTE', () => {
    // Seule la formulation varie. Un tirage sur toute la liste rendrait la
    // réaction indépendante du morceau — le défaut même qu'on corrige.
    const e = avecBasse(1);
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(reactionA(e, () => i / 50)!.id);
    expect([...ids]).toEqual(['basse-service-minimum']);
  });

  it('mais la formulation, elle, varie', () => {
    const e = avecBasse(1);
    const lignes = new Set<string>();
    for (let i = 0; i < 50; i++) lignes.add(reactionA(e, () => i / 50)!.ligne);
    expect(lignes.size).toBeGreaterThan(1);
  });
});

describe('les échelles sont les VRAIES échelles', () => {
  it('« tout au rouge » ne se déclenche pas sur les réglages par défaut', () => {
    /* ⚠️ `finalVolume` va de 50 à 150 et `globalSaturation` de 0 à 100 —
     * `serialize.ts` et `engine/graph.ts` font foi, pas le commentaire de
     * `types.ts` qui annonce 0,5-1,5 et 0-1. Écrite sur ces échelles-là, la
     * pique était vraie de TOUS les états. */
    const e = defaultState();
    expect(e.finalVolume).toBe(100);
    const o = OBSERVATIONS.find((x) => x.id === 'tout-au-rouge')!;
    expect(o.tient(e)).toBe(false);
    e.finalVolume = 140;
    expect(o.tient(e)).toBe(true);
    e.finalVolume = 100;
    e.globalSaturation = 80;
    expect(o.tient(e)).toBe(true);
  });
});

/* ---- LE CALIBRAGE, sur les 34 morceaux du catalogue ------------------- */
describe('le catalogue ne punit pas du travail correct', () => {
  const etats = PRESETS.map((p) => ({ id: p.id, e: presetToState(p, undefined, false) }));

  it('au plus 5 presets sur 34 reçoivent une pique', () => {
    const piques = etats.filter(({ e }) => reactionA(e)?.ton === 'pique');
    expect(piques.length, piques.map((x) => x.id).join(', ')).toBeLessThanOrEqual(5);
  });

  it('aucun preset ne reçoit le silence — il y a toujours quelque chose à dire d’un vrai morceau', () => {
    for (const { id, e } of etats) expect(reactionA(e), id).not.toBeNull();
  });

  it('les observations « d’excès » ne se déclenchent sur aucun preset', () => {
    // Réverbe noyée, tout au rouge, rafales partout, une seule ligne : ce sont
    // des gestes de JOUEUR. Si l'une tombait sur un morceau du catalogue, son
    // seuil serait faux.
    const exces = ['une-seule-ligne', 'reverbe-noyee', 'tout-au-rouge', 'rafales-partout'];
    for (const id of exces) {
      const o = OBSERVATIONS.find((x) => x.id === id)!;
      const touches = etats.filter(({ e }) => o.tient(e)).map((x) => x.id);
      expect(touches, `${id} touche ${touches.join(', ')}`).toEqual([]);
    }
  });

  it('« tout sur les temps » reste rare — au plus 3 presets', () => {
    // Mesuré à 1 (gqom). Le seuil de 3 laisse de la place à un preset ajouté
    // sans laisser la pique devenir automatique.
    const o = OBSERVATIONS.find((x) => x.id === 'tout-sur-les-temps')!;
    expect(etats.filter(({ e }) => o.tient(e)).length).toBeLessThanOrEqual(3);
  });
});

describe('le catalogue est bien formé', () => {
  it('des identifiants uniques, et au moins une formulation chacun', () => {
    const ids = OBSERVATIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of OBSERVATIONS) {
      expect(o.lignes.length, o.id).toBeGreaterThanOrEqual(1);
      for (const l of o.lignes) expect(l.startsWith('—'), `${o.id} : « ${l} »`).toBe(true);
    }
  });

  it('il y a des deux côtés — sinon le jeu ne fait que se moquer', () => {
    expect(OBSERVATIONS.some((o) => o.ton === 'pique')).toBe(true);
    expect(OBSERVATIONS.filter((o) => o.ton === 'compliment').length).toBeGreaterThanOrEqual(4);
  });
});
