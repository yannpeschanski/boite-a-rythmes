/* Une frappe finie se DÉBRANCHE du bus — sinon la boucle grésille au bout de
 * quelques minutes (retour de Martin).
 *
 * Les nœuds d'une note morte restent tirés par le bus permanent jusqu'au
 * passage du ramasse-miettes JS, qui ne vient pas : un AudioNode ne pèse rien
 * côté JS. Mesuré dans `DrumKit.liberer`. Ce test tient le CÂBLAGE sur un
 * contexte feint : tout nœud de la frappe branché sur un nœud du GRAPHE doit
 * être débranché une fois toutes ses sources finies — et jamais hors ligne,
 * où l'export doit rester identique à l'octet près.
 */
import { describe, it, expect } from 'vitest';
import { DrumKit } from '../src/engine/voices/drums';
import { SynthKit } from '../src/engine/voices/synth';
import type { GraphNodes } from '../src/engine/graph';

interface Feint {
  cibles: unknown[];
  debranche: boolean;
  ecouteurs: (() => void)[];
  onended: (() => void) | null;
  estSource: boolean;
}

function faireBanc() {
  const noeuds: Feint[] = [];
  const duGraphe = new Set<unknown>();
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
    cancelScheduledValues() {},
  });
  const noeud = (estSource: boolean) => {
    const n: Feint & Record<string, unknown> = {
      cibles: [],
      debranche: false,
      ecouteurs: [],
      onended: null,
      estSource,
      gain: param(),
      frequency: param(),
      detune: param(),
      Q: param(),
      delayTime: param(),
      connect(c: unknown) {
        n.cibles.push(c);
        return c;
      },
      disconnect() {
        n.debranche = true;
      },
      addEventListener(_t: string, f: () => void) {
        n.ecouteurs.push(f);
      },
      start() {},
      stop() {},
    };
    noeuds.push(n);
    return n;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 44100,
    createOscillator: () => noeud(true),
    createBufferSource: () => noeud(true),
    createGain: () => noeud(false),
    createBiquadFilter: () => noeud(false),
    createWaveShaper: () => noeud(false),
    createDelay: () => noeud(false),
  };
  const graphe = new Proxy({ ctx } as Record<string, unknown>, {
    get(cible, prop: string) {
      if (prop in cible) return cible[prop];
      // drumLineGain.kick, synthLineGain.bass… : un bus permanent par nom.
      const bus = new Proxy({} as Record<string, unknown>, {
        get(b, k: string) {
          if (!(k in b)) {
            b[k] = { nom: `${prop}.${k}` };
            duGraphe.add(b[k]);
          }
          return b[k];
        },
      });
      // …et `synthGain`, bus permanent lu directement sur le graphe.
      duGraphe.add(bus);
      cible[prop] = bus;
      return bus;
    },
  }) as unknown as GraphNodes;
  const finir = () => {
    for (const n of noeuds.filter((x) => x.estSource)) {
      n.ecouteurs.forEach((f) => f());
      n.onended?.();
    }
  };
  const branchesAuGraphe = () => noeuds.filter((n) => n.cibles.some((c) => duGraphe.has(c)));
  return { graphe, noeuds, finir, branchesAuGraphe };
}

const FRAPPES: [string, (k: DrumKit) => void][] = [
  ['kick', (k) => k.playKick(0, 1)],
  ['kick saturé et filtré', (k) => k.playKick(0, 1, { tone: 40, filterCutoff: 2000 })],
  ['claire', (k) => k.playSnare(0, 1)],
  ['claire filtrée', (k) => k.playSnare(0, 1, { filterCutoff: 3000 })],
  ['rim', (k) => k.playRimshot(0, 1)],
  ['clap', (k) => k.playClap(0, 1)],
  ['clap filtré', (k) => k.playClap(0, 1, { filterCutoff: 3000 })],
  ['shaker', (k) => k.playShaker(0, 1)],
  ['charley fermé', (k) => k.playHatClosed(0, 1)],
  ['charley ouvert filtré', (k) => k.playHatOpen(0, 1, { filterCutoff: 5000 })],
];

describe('une frappe finie se débranche du bus', () => {
  for (const [nom, jouer] of FRAPPES) {
    it(`${nom} — tout ce qui touche un bus, une fois les sources finies`, () => {
      const banc = faireBanc();
      jouer(new DrumKit(banc.graphe));
      const branches = banc.branchesAuGraphe();
      expect(branches.length).toBeGreaterThan(0);
      expect(branches.some((n) => n.debranche)).toBe(false);
      banc.finir();
      expect(branches.every((n) => n.debranche)).toBe(true);
    });
  }

  it('pas avant la DERNIÈRE source : la claire a deux sources', () => {
    const banc = faireBanc();
    new DrumKit(banc.graphe).playSnare(0, 1);
    const sources = banc.noeuds.filter((n) => n.estSource);
    expect(sources.length).toBe(2);
    sources[0].ecouteurs.forEach((f) => f());
    expect(banc.branchesAuGraphe().some((n) => n.debranche)).toBe(false);
  });

  it('jamais hors ligne — l\'export reste identique à l\'octet', () => {
    const banc = faireBanc();
    const kit = new DrumKit(banc.graphe, true);
    for (const [, jouer] of FRAPPES) jouer(kit);
    banc.finir();
    expect(banc.noeuds.some((n) => n.debranche)).toBe(false);
  });

  it('une note de synthé aussi, toutes couches comprises', () => {
    const opts = { type: 'sawtooth' as const, subGain: 0.5, detuneCents: 8, chorusMix: 0.3, tone: 40 };
    const direct = faireBanc();
    new SynthKit(direct.graphe, false).playSynthNote(110, 0, 0.2, 0.5, opts);
    const branches = direct.branchesAuGraphe();
    expect(branches.length).toBe(4); // principale, chorus, sub, détune
    direct.finir();
    expect(branches.every((n) => n.debranche)).toBe(true);

    const horsLigne = faireBanc();
    new SynthKit(horsLigne.graphe, true).playSynthNote(110, 0, 0.2, 0.5, opts);
    horsLigne.finir();
    expect(horsLigne.noeuds.some((n) => n.debranche)).toBe(false);
  });
});
