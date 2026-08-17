import { describe, it, expect } from 'vitest';
import { PRESETS } from '../src/model/presets/songs';
import { presetToState } from '../src/model/presetAdapter';
import type { PatternStateV2, SynthNote } from '../src/model/types';

// Densité des lignes synthé des 34 presets (retour de Yann, 2026-08-17 :
// « les mélodies des presets ne sont pas très bien réglées et prennent
// souvent trop de place »). Les presets ne CONTIENNENT pas de mélodie : ils
// portent une graine, et les notes sont tirées au chargement par
// `randomizeSynth`. Ces tests verrouillent donc le générateur, pas des
// données — c'est lui qui peut repartir en silence.

function notesParMesure(state: PatternStateV2, name: 'bass' | 'pad' | 'melody'): number {
  const row = state.synthRows[name];
  const actives = row.pattern.filter((v) =>
    name === 'pad' ? typeof v === 'number' && v >= 0 : (v as SynthNote | null) != null,
  ).length;
  return actives / Math.max(1, row.cycleBars);
}

const ETATS = (PRESETS as unknown as { id: string }[]).map((p) => ({
  id: p.id,
  state: presetToState(p as never) as PatternStateV2,
}));

describe('génération des lignes synthé des presets', () => {
  it('ne charge jamais un preset avec une ligne mélodie vide', () => {
    // Une ligne vide a l'air cassée, pas aérée. Le cas est arrivé pour de
    // vrai sur `clave23` en baissant la densité : chaque pas étant un tirage
    // indépendant, une ligne à peu de pas peut sortir vide par accident de
    // graine. D'où le filet dans `randomizePitchedLine`.
    const vides = ETATS.filter((e) => notesParMesure(e.state, 'melody') === 0).map((e) => e.id);
    expect(vides, `presets à mélodie vide : ${vides.join(', ')}`).toEqual([]);
  });

  it("n'a plus la mélodie comme ligne la plus dense en moyenne", () => {
    // Le défaut d'origine : la mélodie recevait `fillRate` plein pot là où la
    // basse reçoit `fillRate * 0.75`, ET avec la subdivision la plus fine.
    const moy = (name: 'bass' | 'pad' | 'melody') =>
      ETATS.reduce((s, e) => s + notesParMesure(e.state, name), 0) / ETATS.length;
    const melodie = moy('melody');
    expect(melodie).toBeLessThanOrEqual(moy('bass'));
    expect(melodie).toBeGreaterThan(0.5); // ni la ligne la plus dense, ni un désert
  });

  it('reste reproductible : le même preset donne deux fois le même motif', () => {
    // La propriété qui compte pour l'export MP3. Baisser une densité change
    // le RÉSULTAT ; ça ne doit pas changer sa stabilité.
    for (const p of PRESETS as unknown as { id: string }[]) {
      const a = presetToState(p as never) as PatternStateV2;
      const b = presetToState(p as never) as PatternStateV2;
      expect(JSON.stringify(a.synthRows), `preset ${p.id}`).toBe(JSON.stringify(b.synthRows));
    }
  });
});
