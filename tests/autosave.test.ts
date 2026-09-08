/* La session précédente de l'Atelier — le bandeau « Restaurer / Ignorer ».
 *
 * Ce qui a cassé (mesuré au navigateur) : l'autosave de la visite EN COURS
 * écrit dans la même clé, une seconde après l'entrée dans l'Atelier. Un
 * « Restaurer » qui relisait `localStorage` au moment du clic rechargeait donc
 * l'écran sur lui-même, sans rien dire. D'où la lecture UNE FOIS, gardée en
 * mémoire, que ce fichier verrouille.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/* Vitest tourne sous Node : pas de `localStorage`. Même stub minimal que
 * `tests/latence.test.ts` — la persistance est justement ce qu'on vérifie. */
const magasin = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => magasin.get(k) ?? null,
  setItem: (k: string, v: string) => void magasin.set(k, v),
  removeItem: (k: string) => void magasin.delete(k),
  clear: () => magasin.clear(),
  key: () => null,
  length: 0,
} as unknown as Storage;

const CLE = 'boite-a-rythme:atelier-autosave';

async function modules() {
  const share = await import('../src/stores/share');
  const { pattern } = await import('../src/stores/pattern.svelte');
  return { ...share, pattern };
}

beforeEach(() => {
  magasin.clear();
  vi.useRealTimers();
});

describe('lire la session précédente', () => {
  it('rien d’enregistré, rien à proposer', async () => {
    const { lireAutosave } = await modules();
    expect(lireAutosave()).toBeNull();
  });

  it('un JSON enregistré se relit tel quel', async () => {
    const { lireAutosave } = await modules();
    magasin.set(CLE, '{"version":2}');
    expect(lireAutosave()).toBe('{"version":2}');
  });
});

describe('autosaveDiffere — un bandeau ne propose que ce qui change', () => {
  it('la session identique à l’écran ne se propose pas', async () => {
    const { autosaveDiffere, pattern } = await modules();
    expect(autosaveDiffere(pattern.toJson())).toBe(false);
  });

  it('une session qui diffère se propose', async () => {
    const { autosaveDiffere, pattern } = await modules();
    const autre = JSON.parse(pattern.toJson());
    autre.tempo = autre.tempo === 90 ? 140 : 90;
    expect(autosaveDiffere(JSON.stringify(autre))).toBe(true);
  });

  it('un JSON illisible ne fait pas apparaître de bandeau', async () => {
    const { autosaveDiffere } = await modules();
    expect(autosaveDiffere('pas du json')).toBe(false);
  });
});

describe('⚠️ la copie en mémoire survit à l’autosave de la visite en cours', () => {
  it('restaurer marche encore APRÈS que l’autosave a écrasé la clé', async () => {
    const { lireAutosave, appliquerAutosave, scheduleAutosave, pattern } = await modules();

    // Une session précédente, reconnaissable à son tempo.
    const precedente = JSON.parse(pattern.toJson());
    precedente.tempo = 143;
    magasin.set(CLE, JSON.stringify(precedente));

    // L'Atelier s'ouvre : il lit la session UNE fois, puis la visite en cours
    // finit par enregistrer autre chose sous la même clé.
    const copie = lireAutosave();
    expect(copie).not.toBeNull();

    vi.useFakeTimers();
    pattern.state.tempo = 96;
    scheduleAutosave();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
    expect(JSON.parse(magasin.get(CLE)!).tempo).toBe(96); // la clé a bien changé

    // Le clic sur « Restaurer » arrive après : il doit rendre la session lue à
    // l'ouverture, pas ce que la visite en cours vient d'écrire.
    expect(appliquerAutosave(copie!)).toBe(true);
    expect(pattern.state.tempo).toBe(143);

    pattern.reset();
  });
});
