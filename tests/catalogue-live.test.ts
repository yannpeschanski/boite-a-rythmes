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

  /* ⚠️ DEUX DÉMÉNAGEMENTS DE SUITE SUR LE MÊME IDENTIFIANT. Les rafales étaient
     devenues l'entrée fusionnée de leur ligne (2026-09-02) ; les frappes de
     ligne sont parties à leur tour (2026-09-09, fiche à cocher). Une
     correspondance qui pointe vers une entrée elle-même disparue ne migre
     rien : elle refait échouer `isValid`. Le slot doit donc reprendre le
     défaut de son rang, comme n'importe quel retrait. */
  it('ne laisse pas une rafale pointer vers une ligne elle aussi disparue', async () => {
    const { loadLiveAssignments, DEFAUTS_SLOTS } = await catalogue();
    stockage.setItem(
      KEY,
      JSON.stringify({
        ...ANCIENNE,
        slots: [['roll-kick-x2'], ['roll-snare-x3'], ['ligne-hat'], ['break'], ['fill'], ['chaos']],
      }),
    );
    const a = loadLiveAssignments();
    expect(a.slots[0]).toEqual(DEFAUTS_SLOTS[0]);
    expect(a.slots[1]).toEqual(DEFAUTS_SLOTS[1]);
    expect(a.slots[2]).toEqual(DEFAUTS_SLOTS[2]);
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

  it('ne cite jamais deux fois la même action dans un slot', async () => {
    const { loadLiveAssignments } = await catalogue();
    stockage.setItem(
      KEY,
      JSON.stringify({ ...ANCIENNE, slots: [['break', 'break', 'chaos'], ['fill'], ['break'], ['chaos'], ['break'], ['fill']] }),
    );
    expect(loadLiveAssignments().slots[0]).toEqual(['break', 'chaos']);
  });

  it('fait de l’ancien interrupteur d’arpège le bouton MODE NAPPE', async () => {
    const { loadLiveAssignments } = await catalogue();
    stockage.setItem(KEY, JSON.stringify({ ...ANCIENNE, slots: [['toggle-pad-arp'], ['fill'], ['break'], ['chaos'], ['break'], ['fill']] }));
    expect(loadLiveAssignments().slots[0]).toEqual(['step-pad-mode']);
  });
});

/* ⚠️ LA MIGRATION DES AXES — elle n'existait pas, et la révision du 2026-09-09
 * la rendait indispensable : `migrer` ne réécrivait que les ACTIONS, alors que
 * treize AXES viennent de disparaître. Une assignation citant `swing` ou
 * `cutoff-bass` aurait fait échouer `isValid` en bloc — six boutons et trois
 * snapshots perdus sans un mot, exactement le défaut que ce fichier existe pour
 * empêcher, à un tableau près. */
describe('migration des AXES', () => {
  beforeEach(() => stockage.map.clear());

  it('renomme un paramètre brut en la macro qui le remplace', async () => {
    const { loadLiveAssignments } = await catalogue();
    stockage.setItem(
      KEY,
      JSON.stringify({ ...ANCIENNE, slotFaders: [['cutoff-bass'], ['filter-env-pad'], ['vibrato-melody'], ['reverb'], ['filter'], ['reverb']] }),
    );
    const a = loadLiveAssignments();
    // Ce n'est pas un réglage neuf : `brillance` reprend la courbe exacte de
    // l'ancien `cutoff`. On ne perd pas l'assignation, on la renomme.
    expect(a.slotFaders[0]).toEqual(['brillance-bass']);
    expect(a.slotFaders[1]).toEqual(['mouvement-pad']);
    expect(a.slotFaders[2]).toEqual(['vibrato-synthe']);
  });

  it('ne renvoie PAS les défauts quand un axe cité a disparu', async () => {
    const { loadLiveAssignments } = await catalogue();
    const temoin = 'solo-melody';
    stockage.setItem(
      KEY,
      JSON.stringify({
        ...ANCIENNE,
        slots: [[temoin], ...ANCIENNE.slots.slice(1)],
        axisX: ['swing'],
        slotFaders: [['volume'], ['reverb'], ['filter'], ['reverb'], ['filter'], ['reverb']],
      }),
    );
    const a = loadLiveAssignments();
    // Le slot témoin survit : c'est la preuve qu'on n'est pas retombé sur les
    // défauts en bloc à cause de `swing` et `volume`.
    expect(a.slots[0]).toEqual([temoin]);
    // Et les axes disparus reprennent un défaut plutôt que de rester vides.
    expect(a.axisX.length).toBeGreaterThan(0);
    expect(a.slotFaders[0].length).toBeGreaterThan(0);
  });

  it('remplit le champ AJOUTÉ que les assignations enregistrées n’ont pas', async () => {
    const { loadLiveAssignments } = await catalogue();
    // `faderMomentane` n'existe dans aucun enregistrement d'avant : sans
    // remplissage, `isValid` le trouverait absent et rendrait les défauts —
    // le même tout-ou-rien, par l'autre bout.
    stockage.setItem(KEY, JSON.stringify(ANCIENNE));
    const a = loadLiveAssignments();
    expect(a.faderMomentane).toHaveLength(6);
    expect(a.faderMomentane.every((m) => typeof m === 'boolean')).toBe(true);
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

  /* ⚠️ LA POPULATION DES MIROIRS EST DEVENUE VIDE, ET C'EST ÉCRIT ICI.
     Les deux seules entrées `tirable: false` étaient TON −1 et GAMME ← ; ton
     et gamme sont sortis du catalogue le 2026-09-09. Un garde-fou dont la
     population se vide passe en silence (CLAUDE.md) — on l'affirme donc
     explicitement au lieu de le laisser vrai par vacuité, et la règle qu'il
     protégeait (un miroir ne se tire pas au hasard) reste vérifiée si un
     miroir revient. */
  it('n’a plus aucune entrée miroir — et sortirait du tirage celle qui reviendrait', async () => {
    const { LIVE_ACTIONS, ACTIONS_TIRABLES } = await catalogue();
    const miroirs = LIVE_ACTIONS.filter((a) => a.tirable === false).map((a) => a.id);
    expect(miroirs).toEqual([]);
    for (const id of miroirs) expect(ACTIONS_TIRABLES.some((a) => a.id === id)).toBe(false);
    expect(ACTIONS_TIRABLES.length).toBe(LIVE_ACTIONS.length - miroirs.length);
  });

  /* ⚠️ Les frappes de ligne sont parties le 2026-09-09 : mesurées hors grille
     de ±81 à ±334 ms, et leur rafale ignorait le plancher anti-bouillie du
     moteur (`docs/plan/09-etat-de-lart-controles-live.md`). Le test ne
     disparaît pas avec elles — il DIT qu'elles sont parties, sinon leur retour
     par recopie passerait inaperçu. Elles reviendront quantifiées, ou pas. */
  it('ne rejoue plus une frappe de ligne non quantifiée', async () => {
    const { LIVE_ACTIONS } = await catalogue();
    expect(LIVE_ACTIONS.map((a) => a.kind)).not.toContain('ligne');
    expect(LIVE_ACTIONS.filter((a) => a.id.startsWith('ligne-'))).toEqual([]);
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
