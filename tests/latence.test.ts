/* Le décalage d'entrée, mesuré et conservé.
 *
 * Le piège de ce module tient en un mot : ADDITIF. Les frappes d'une partie
 * sont déjà corrigées par le réglage en place, donc leur médiane est ce qu'il
 * RESTE à corriger. Remplacer au lieu d'ajouter effacerait la correction
 * précédente et ferait osciller le réglage d'une partie à l'autre au lieu de le
 * faire converger — un bug qu'on ne verrait pas en lisant le code, seulement en
 * jouant deux fois de suite.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { latence } from '../src/ui/game/latence.svelte';

/* Vitest tourne sous Node : pas de `localStorage`. Le module s'en accommode
 * (tous ses accès sont sous `try`), mais la persistance est justement l'une des
 * choses à vérifier — d'où ce stub minimal plutôt qu'un environnement `jsdom`
 * pour toute la suite. */
const magasin = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => magasin.get(k) ?? null,
  setItem: (k: string, v: string) => void magasin.set(k, v),
  removeItem: (k: string) => void magasin.delete(k),
  clear: () => magasin.clear(),
  key: (i: number) => [...magasin.keys()][i] ?? null,
  get length() {
    return magasin.size;
  },
} as Storage;

describe('latence — le réglage converge au lieu d’osciller', () => {
  beforeEach(() => {
    magasin.clear();
    latence.regler(0);
  });

  it('affiner ajoute, il ne remplace pas', () => {
    latence.affiner(60);
    expect(latence.ms).toBe(60);
    // Deuxième partie : il reste 20 ms de biais APRÈS la correction de 60.
    // Le réglage doit donc valoir 80, pas 20.
    latence.affiner(20);
    expect(latence.ms).toBe(80);
  });

  it('un joueur déjà bien réglé ne bouge plus', () => {
    latence.regler(75);
    latence.affiner(0);
    expect(latence.ms).toBe(75);
  });

  it('sait revenir en arrière quand on sur-corrige', () => {
    latence.regler(120);
    latence.affiner(-40);
    expect(latence.ms).toBe(80);
  });

  it('borne les valeurs aberrantes dans les deux sens', () => {
    // Un calibrage raté ne doit pas rendre le jeu impossible sans qu'on
    // comprenne pourquoi : au-delà d'une demi-seconde ce n'est plus une
    // latence, c'est une frappe manquée.
    latence.regler(10000);
    expect(latence.ms).toBeLessThanOrEqual(400);
    latence.regler(-10000);
    expect(latence.ms).toBeGreaterThanOrEqual(-400);
  });

  it('se relit d’une session à l’autre', () => {
    latence.regler(65);
    latence.ms = 0; // comme au rechargement de la page
    latence.charger();
    expect(latence.ms).toBe(65);
  });

  it('une valeur illisible en stockage ne casse rien', () => {
    magasin.set('boite-a-rythme:latence-entree', 'ceci-nest-pas-un-nombre');
    latence.charger();
    expect(latence.ms).toBe(0);
  });
});
