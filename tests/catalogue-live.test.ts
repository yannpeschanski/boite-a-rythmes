/* Le catalogue du Mode Live, et surtout SA MIGRATION.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. `isValid` (liveActions.ts) est TOUT OU RIEN :
 * une assignation enregistrée qui cite un identifiant disparu la fait échouer
 * en bloc, et `loadLiveAssignments` rend alors les défauts — les six boutons
 * ET les trois snapshots perdus d'un coup, sans un mot. C'est le genre de
 * défaut qu'on ne découvre qu'en production, sur la configuration de
 * quelqu'un d'autre, et jamais sur la sienne.
 *
 * La révision du catalogue (31 -> 18) a fait disparaître seize identifiants :
 * les neuf rafales, les six mutes par ligne, les six pas de preset de voix.
 * Ce fichier vérifie que rien ne se perd en silence.
 */
import { describe, it, expect, beforeEach } from 'vitest';

const KEY = 'boite-a-rythme:mode-live-assign';

class FauxStockage {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}
const stockage = new FauxStockage();
(globalThis as unknown as { localStorage: FauxStockage }).localStorage = stockage;

async function catalogue() {
  return await import('../src/ui/live/liveActions');
}

/** Une assignation telle qu'elle était ENREGISTRÉE avant la révision. */
const ANCIENNE = {
  slots: [['break'], ['fill'], ['mute-kick'], ['mute-snare'], ['mute-hat'], ['roll-hat-x2']],
  slotModes: ['actions', 'actions', 'actions', 'actions', 'actions', 'actions'],
  slotFaders: [['filter'], ['reverb'], ['filter'], ['reverb'], ['filter'], ['reverb']],
  faderOrientation: ['vertical', 'vertical', 'vertical', 'vertical', 'vertical', 'vertical'],
  axisX: ['filter'],
  axisY: ['reverb'],
  axisTilt: ['filter'],
  viz: 'bars',
};

describe('migration des assignations enregistrées', () => {
  beforeEach(() => stockage.map.clear());

  it('ne renvoie PAS les défauts sur une assignation d’avant la révision', async () => {
    const { loadLiveAssignments, DEFAUTS_SLOTS } = await catalogue();
    /* ⚠️ Le slot témoin doit DIFFÉRER du défaut de son rang, sinon le test ne
       distingue rien : écrit d'abord avec `break` en slot 0 — le défaut aussi
       — il passait même sans migration. On prend une entrée qui a survécu à
       la révision et que le défaut ne cite pas. */
    const temoin = 'solo-melody';
    expect(DEFAUTS_SLOTS[0]).not.toContain(temoin);
    stockage.setItem(KEY, JSON.stringify({ ...ANCIENNE, slots: [[temoin], ...ANCIENNE.slots.slice(1)] }));
    expect(loadLiveAssignments().slots[0]).toEqual([temoin]);
  });

  it('fait des rafales ×2/×3/×4 l’entrée fusionnée de leur ligne', async () => {
    const { loadLiveAssignments } = await catalogue();
    stockage.setItem(
      KEY,
      JSON.stringify({
        ...ANCIENNE,
        slots: [['roll-kick-x2'], ['roll-snare-x3'], ['roll-hat-x4'], ['break'], ['fill'], ['chaos']],
      }),
    );
    const a = loadLiveAssignments();
    expect(a.slots[0]).toEqual(['ligne-kick']);
    expect(a.slots[1]).toEqual(['ligne-snare']);
    expect(a.slots[2]).toEqual(['ligne-hat']);
  });

  it('retire les entrées qui ont changé de domicile sans vider le slot', async () => {
    const { loadLiveAssignments, DEFAUTS_SLOTS } = await catalogue();
    stockage.setItem(KEY, JSON.stringify(ANCIENNE));
    const a = loadLiveAssignments();
    // `mute-kick` est parti dans le séquenceur : le slot reprend le défaut de
    // son rang plutôt que de rester vide (un slot vide ferait perdre au
    // panneau de sélection toute trace de ce qui est assigné).
    expect(a.slots[2].length).toBeGreaterThan(0);
    expect(a.slots[2]).toEqual(DEFAUTS_SLOTS[2]);
  });

  it('déduplique une ligne citée deux fois par la fusion des rafales', async () => {
    const { loadLiveAssignments } = await catalogue();
    stockage.setItem(
      KEY,
      JSON.stringify({ ...ANCIENNE, slots: [['roll-hat-x2', 'roll-hat-x4'], ['fill'], ['break'], ['chaos'], ['break'], ['fill']] }),
    );
    const a = loadLiveAssignments();
    expect(a.slots[0]).toEqual(['ligne-hat']);
  });

  it('fait de l’ancien interrupteur d’arpège le bouton MODE NAPPE', async () => {
    const { loadLiveAssignments } = await catalogue();
    stockage.setItem(KEY, JSON.stringify({ ...ANCIENNE, slots: [['toggle-pad-arp'], ['fill'], ['break'], ['chaos'], ['break'], ['fill']] }));
    expect(loadLiveAssignments().slots[0]).toEqual(['step-pad-mode']);
  });
});

describe('le catalogue lui-même', () => {
  it('ne porte plus aucune famille de variantes', async () => {
    const { LIVE_ACTIONS } = await catalogue();
    // Une « famille de variantes » = plusieurs entrées qui ne diffèrent que
    // par un nombre. C'est ce qui faisait 19 entrées sur 31.
    const variantes = LIVE_ACTIONS.filter((a) => /-x\d$/.test(a.id));
    expect(variantes).toEqual([]);
  });

  it('garde les entrées miroir mais les sort du tirage', async () => {
    const { LIVE_ACTIONS, ACTIONS_TIRABLES } = await catalogue();
    const miroirs = LIVE_ACTIONS.filter((a) => a.tirable === false).map((a) => a.id);
    // ⚠️ Le compte est là exprès : un garde-fou dont la population devient
    // vide passe en silence (CLAUDE.md). Si plus rien n'est marqué
    // `tirable: false`, c'est le drapeau qui a disparu, pas le problème.
    expect(miroirs.length).toBeGreaterThan(0);
    for (const id of miroirs) expect(ACTIONS_TIRABLES.some((a) => a.id === id)).toBe(false);
    expect(ACTIONS_TIRABLES.length).toBe(LIVE_ACTIONS.length - miroirs.length);
  });

  it('donne une ligne de batterie réelle à chaque entrée « ligne »', async () => {
    const { LIVE_ACTIONS } = await catalogue();
    const { DRUM_ROW_NAMES } = await import('../src/model/types');
    const lignes = LIVE_ACTIONS.filter((a) => a.kind === 'ligne');
    expect(lignes.length).toBe(DRUM_ROW_NAMES.length);
    for (const a of lignes) {
      // Un `ligne` sans `ligne` frapperait dans le vide — même famille de
      // défaut que `forceVariantCount`, déclaré et lu par personne.
      expect(a.ligne).toBeDefined();
      expect(DRUM_ROW_NAMES).toContain(a.ligne!);
    }
  });

  it('donne un geste à chaque entrée « pas »', async () => {
    const { LIVE_ACTIONS } = await catalogue();
    for (const a of LIVE_ACTIONS.filter((x) => x.kind === 'step')) expect(a.step).toBeTypeOf('function');
  });

  it('n’assigne par défaut que des entrées qui existent', async () => {
    const { DEFAUTS_SLOTS, LIVE_ACTIONS } = await catalogue();
    const ids = new Set(LIVE_ACTIONS.map((a) => a.id));
    for (const slot of DEFAUTS_SLOTS) {
      expect(slot.length).toBeGreaterThan(0);
      for (const id of slot) expect(ids.has(id)).toBe(true);
    }
  });
});
