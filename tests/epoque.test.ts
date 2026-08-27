import { describe, it, expect } from 'vitest';
import { PRESETS, HORS_EPOQUE } from '../src/model/presets/songs';
import { LEVELS } from '../src/model/presets/levels';
import { ACTES } from '../src/model/carriere';
import { ANNEE } from '../src/model/carriere';

/* 2005, et ce que le jeu a le droit de proposer.
 *
 * ⚠️ Cette règle était écrite dans `REPRISE.md` comme « voulue, mais jamais
 * vérifiée par un test » — et elle était FAUSSE. Le verbe `style` tirait dans
 * les 34 presets : mesuré sur 400 tirages, **39 % des parties affichaient au
 * moins un genre postérieur à 2005** (trap moderne, drill, amapiano, gqom) et
 * **10 % du temps c'était la bonne réponse**. « Voulu mais non vérifié » veut
 * dire « pas fait », toujours.
 */

class FauxStockage {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
(globalThis as unknown as { localStorage: FauxStockage }).localStorage = new FauxStockage();

describe('la liste des genres hors époque est réelle', () => {
  it('⚠️ chaque identifiant existe vraiment dans le catalogue', () => {
    /* Le mode de panne classique d'une liste d'exclusion : une coquille dans
     * un identifiant, et le filtre ne filtre plus rien — en silence, puisque
     * `includes` renvoie simplement `false`. */
    for (const id of HORS_EPOQUE) {
      expect(PRESETS.some((p) => p.id === id), `« ${id} » n’est pas un preset`).toBe(true);
    }
  });

  it('et le récit se passe bien avant tous ces genres', () => {
    expect(ANNEE).toBe(2005);
    expect(HORS_EPOQUE.length).toBe(4);
  });

  it('le catalogue de l’Atelier, lui, les garde', () => {
    // La règle porte sur ce que le JEU propose, pas sur ce que l'outil
    // contient : quelqu'un qui compose aujourd'hui a le droit de charger un
    // amapiano. Personne, en 2005, n'a le droit de le reconnaître à l'oreille.
    expect(PRESETS).toHaveLength(34);
  });
});

describe('le verbe « style » ne propose jamais un genre d’après 2005', () => {
  it('sur 120 tirages, aucun genre hors époque — ni en réponse, ni en leurre', async () => {
    /* Un test aléatoire doit affirmer ce qui est vrai à CHAQUE tirage et
     * répéter, sinon c'est une pièce lancée (CLAUDE.md). Avant correctif, ce
     * test tombait en quelques tirages : 39 % des parties étaient touchées. */
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = '';
    game.setPseudo('epoque');
    const i = LEVELS.findIndex((l) => l.exercise === 'style');
    expect(i, 'aucun niveau « style »').toBeGreaterThanOrEqual(0);
    for (let k = 0; k < 120; k++) {
      game.startLevel(i);
      for (const id of game.styleCandidats) {
        expect(HORS_EPOQUE, `tirage ${k} : « ${id} » proposé`).not.toContain(id);
      }
      expect(game.styleCandidats).toHaveLength(4);
      expect(game.styleCandidats[game.styleReponse]).toBeTruthy();
    }
  });
});

describe('aucun acte ne fait reproduire un genre d’après 2005', () => {
  it('les niveaux cités par la carrière restent dans l’époque', () => {
    // Un niveau « Reproduire un preset (Trap moderne) » NOMME le genre dans son
    // titre : le citer casserait la fiction aussi sûrement qu'un leurre.
    const cites = ACTES.flatMap((a) =>
      a.etapes.filter((e) => e.kind === 'exercice').map((e) => (e as { niveau: number }).niveau),
    );
    for (const id of cites) {
      const l = LEVELS.find((x) => x.id === id)!;
      if (!l.presetId) continue;
      expect(HORS_EPOQUE, `acte cite le niveau ${id} (${l.presetId})`).not.toContain(l.presetId);
    }
  });
});
