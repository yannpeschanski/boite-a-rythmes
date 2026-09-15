/* Le graphe audio ne doit contenir AUCUNE boucle sans `DelayNode`.
 *
 * Écrit après le défaut le plus cher de ce projet : l'appli entière muette sous
 * Firefox, trouvée en JOUANT, et invisible partout ailleurs — 0 erreur de types,
 * 750 tests verts, aucune exception, la console vide et Chrome parfaitement
 * normal.
 *
 * LA RÈGLE DE LA SPÉCIFICATION. Un cycle dans un graphe Web Audio n'est légal
 * que s'il traverse au moins un `DelayNode` — le délai est ce qui rend la
 * récursion calculable, bloc par bloc. Sans lui, l'implémentation DOIT couper le
 * cycle. Et c'est là que les navigateurs divergent : Chrome coupe au plus
 * juste, Gecko coupe le cycle entier. Comme le cycle passait par `mixBus`, par
 * où TOUT le son transite, Firefox ne rendait plus rien.
 *
 * LE CYCLE ÉTAIT :  mixBus → liveReverbSend → reverb → mixBus
 * (`liveReverbSend` est l'envoi de réverbe global du Mode Live ; il part du mix
 * et la réverbe y revenait.) La boucle du delay, elle, est légale : elle
 * contient un `DelayNode`.
 *
 * ⚠️ POURQUOI AUCUN TEST NE POUVAIT LE VOIR AVANT. Les tests du moteur jouent
 * des NOTES et comparent des instants ; ils ne regardent jamais la FORME du
 * graphe. Celui-ci construit le vrai graphe sur un contexte feint qui
 * n'enregistre qu'une chose — qui est branché sur qui — et cherche un cycle
 * dedans. Aucun son, aucun navigateur.
 */
import { describe, it, expect } from 'vitest';
import { buildGraph } from '../src/engine/graph';
import { defaultState } from '../src/model/defaults';

interface Arete {
  de: string;
  vers: string;
}

/* Un contexte audio feint : il ne calcule rien, il note les branchements.
 *
 * Tout accès inconnu rend un objet permissif (les `AudioParam` et leurs
 * méthodes), toute écriture est acceptée (`curve`, `type`, `buffer`, `fftSize`…)
 * — le but n'est pas de simuler Web Audio, c'est de laisser `buildGraph`
 * s'exécuter jusqu'au bout sans jamais mentir sur les `connect`. */
function contexteFeint() {
  const aretes: Arete[] = [];
  const types = new Map<string, string>();
  let n = 0;

  const param = (): unknown =>
    new Proxy(
      { value: 0 },
      {
        get: (cible, prop) =>
          prop in cible ? (cible as Record<string | symbol, unknown>)[prop] : () => undefined,
        set: (cible, prop, v) => ((cible as Record<string | symbol, unknown>)[prop] = v) !== null,
      },
    );

  function noeud(type: string): Record<string, unknown> {
    const id = `${type}#${n++}`;
    types.set(id, type);
    const base: Record<string, unknown> = {
      __id: id,
      connect: (autre: { __id?: string } | undefined) => {
        aretes.push({ de: id, vers: autre?.__id ?? 'inconnu' });
        return autre;
      },
      disconnect: () => undefined,
    };
    return new Proxy(base, {
      get(cible, prop) {
        if (!(prop in cible)) cible[prop as string] = param();
        return cible[prop as string];
      },
      set(cible, prop, v) {
        cible[prop as string] = v;
        return true;
      },
    });
  }

  const ctx: Record<string, unknown> = {
    sampleRate: 48000,
    currentTime: 0,
    destination: noeud('destination'),
    createGain: () => noeud('gain'),
    createBiquadFilter: () => noeud('biquad'),
    createDynamicsCompressor: () => noeud('compressor'),
    createWaveShaper: () => noeud('waveshaper'),
    createConvolver: () => noeud('convolver'),
    createAnalyser: () => noeud('analyser'),
    createDelay: () => noeud('delay'),
    createOscillator: () => noeud('oscillator'),
    createBufferSource: () => noeud('buffersource'),
    createStereoPanner: () => noeud('panner'),
    createBuffer: (canaux: number, longueur: number) => ({
      length: longueur,
      numberOfChannels: canaux,
      sampleRate: 48000,
      getChannelData: () => new Float32Array(longueur),
    }),
  };
  return { ctx, aretes, types };
}

/* Tous les cycles du graphe, chacun rendu comme la liste de ses nœuds. */
function cycles(aretes: Arete[]): string[][] {
  const sortants = new Map<string, string[]>();
  for (const { de, vers } of aretes) sortants.set(de, [...(sortants.get(de) ?? []), vers]);

  const trouves: string[][] = [];
  const dansLaPile = new Set<string>();
  const vus = new Set<string>();
  const pile: string[] = [];

  function descendre(id: string): void {
    vus.add(id);
    dansLaPile.add(id);
    pile.push(id);
    for (const suivant of sortants.get(id) ?? []) {
      if (dansLaPile.has(suivant)) {
        trouves.push(pile.slice(pile.indexOf(suivant)));
      } else if (!vus.has(suivant)) {
        descendre(suivant);
      }
    }
    pile.pop();
    dansLaPile.delete(id);
  }

  for (const id of sortants.keys()) if (!vus.has(id)) descendre(id);
  return trouves;
}

describe('le graphe audio ne contient aucune boucle interdite', () => {
  it('tout cycle traverse un DelayNode', () => {
    const { ctx, aretes, types } = contexteFeint();
    buildGraph(ctx as unknown as BaseAudioContext, defaultState());

    const interdits = cycles(aretes)
      .filter((c) => !c.some((id) => types.get(id) === 'delay'))
      .map((c) => c.join(' → '));

    // Le message porte le cycle : sans lui, l'échec dirait « il y en a un »
    // sans dire lequel, et c'est précisément ce qui a coûté une journée.
    expect(interdits, `boucle(s) sans DelayNode : ${interdits.join(' | ')}`).toEqual([]);
  });

  it('la boucle de feedback du delay, elle, existe bien', () => {
    // Garde-fou du garde-fou : si la détection ne trouvait plus AUCUN cycle,
    // le test au-dessus passerait pour une mauvaise raison — un contexte feint
    // qui n'enregistre plus rien, par exemple.
    const { ctx, aretes, types } = contexteFeint();
    buildGraph(ctx as unknown as BaseAudioContext, defaultState());
    const avecDelay = cycles(aretes).filter((c) => c.some((id) => types.get(id) === 'delay'));
    expect(avecDelay.length).toBeGreaterThan(0);
  });
});
