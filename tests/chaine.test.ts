/* LIRE UNE CHAÎNE — le CÂBLAGE, pas le calcul.
 *
 * `ui/chaine.ts` est né le 2026-09-17, quand le panneau de montage a gagné un
 * bouton ÉCOUTER : deux écrans lisent désormais la même chaîne, et deux copies
 * de « appliquer une scène » auraient divergé au premier réglage.
 *
 * Ce qui se teste ici est ce que le MOTEUR reçoit — sur un moteur feint qui
 * n'enregistre que les appels, comme `graphe-boucles.test.ts` le fait du
 * graphe. Aucun son, aucun navigateur : ce qui casse dans ce genre de code,
 * c'est le câblage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { appliquerSectionAuMoteur, relacherCalque, sectionSuivante, doitBasculer } from '../src/ui/chaine';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../src/model/types';
import { parties } from '../src/stores/parties.svelte';
import { pattern } from '../src/stores/pattern.svelte';
import type { Section } from '../src/model/architecture';

/** Un moteur qui ne fait rien d'autre que noter ce qu'on lui demande. */
function moteurFeint() {
  const mutes: Record<string, boolean | null> = {};
  let mix = 0;
  let relaches = 0;
  return {
    faux: {
      liveSetMute: (n: string, v: boolean | null) => void (mutes[n] = v),
      liveSetSynthMute: (n: string, v: boolean | null) => void (mutes[n] = v),
      refreshMixSettings: () => void mix++,
      relacherReglagesLive: () => void relaches++,
      barDansSection: 0,
    },
    mutes,
    compte: () => ({ mix, relaches }),
  };
}

const scene = (partie: 'A' | 'B' | 'C', lignes: Section['lignes'] = null): Section =>
  ({ id: 's', nom: 'x', partie, cycles: 2, lignes }) as Section;

beforeEach(() => {
  parties.toutVider();
  parties.poser('A', pattern.toJson(), 'A');
});

describe('appliquer une scène pose son CALQUE', () => {
  it('coupe exactement les lignes que la scène ne cite pas', () => {
    const m = moteurFeint();
    const gardees = ['kick', 'snare'] as const;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliquerSectionAuMoteur(m.faux as any, scene('A', [...gardees] as never));
    for (const n of [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES]) {
      expect(m.mutes[n], `« ${n} »`).toBe(!(gardees as readonly string[]).includes(n));
    }
  });

  /* ⚠️ `null` VEUT DIRE TOUTES, DONC RELÂCHER — pas « forcer ouvert », pas
   * « ne rien toucher ». Trouvé en jouant le modèle ARC : la MONTÉE coupait
   * quatre lignes et le CLIMAX, qui doit tout rouvrir, les laissait coupées.
   * Et relâcher n'est pas ouvrir : une ligne coupée dans l'Atelier reste
   * coupée, parce que `null` rend la main au MOTIF. */
  it('⚠️ une scène PLEINE relâche le calque — elle ne force pas ouvert', () => {
    const m = moteurFeint();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliquerSectionAuMoteur(m.faux as any, scene('A', ['kick'] as never));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliquerSectionAuMoteur(m.faux as any, scene('A', null));
    for (const n of [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES]) {
      expect(m.mutes[n], `« ${n} » : forcé au lieu d’être relâché`).toBeNull();
    }
  });

  /* ⚠️ LE MIX SUIT LA BASCULE — « on passe du temps à chercher un son, il ne
   * faut pas l'écraser » : une lettre porte un SON complet. Sans cet appel, le
   * refrain jouait ses notes avec le son du couplet. */
  it('⚠️ le mix suit la scène, et les réglages en direct rendent la main', () => {
    const m = moteurFeint();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliquerSectionAuMoteur(m.faux as any, scene('A'));
    expect(m.compte()).toEqual({ mix: 1, relaches: 1 });
  });

  /* ⚠️ RELÂCHER À L'ARRÊT. Sans ça, les lignes qu'une scène avait coupées le
   * restent sur un écran qui n'enchaîne plus rien — l'Atelier devient
   * partiellement muet et rien ne dit pourquoi. C'est le défaut que le bouton
   * ÉCOUTER pouvait introduire, et il ne s'entend qu'après coup. */
  it('⚠️ `relacherCalque` rend TOUTES les lignes au motif', () => {
    const m = moteurFeint();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliquerSectionAuMoteur(m.faux as any, scene('A', ['hat'] as never));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    relacherCalque(m.faux as any);
    for (const n of [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES]) expect(m.mutes[n], n).toBeNull();
  });

  /* ⚠️ REPLI SUR A, jamais sur « le motif courant » : une lettre vide est le
   * cas normal quand on vient de charger un montage. Garder le motif courant
   * ferait jouer ce que la bascule précédente avait laissé. */
  it('⚠️ une lettre VIDE se replie sur A', () => {
    const m = moteurFeint();
    expect(parties.remplie('C')).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appliquerSectionAuMoteur(m.faux as any, scene('C'));
    // A est rangée : le repli l'a chargée, donc rien n'a levé et le mix a suivi.
    expect(m.compte().mix).toBe(1);
  });
});

describe('avancer dans la chaîne', () => {
  /* ⚠️ LE MODULE PARTAGÉ BOUCLE, ET IL DOIT LE RESTER. L'écoute de l'Atelier
   * s'arrête à la fin du morceau depuis le 2026-09-17 — mais c'est SA décision,
   * prise dans sa boucle de frames, pas celle du module : le Mode Live est une
   * surface de JEU, on y enchaîne sans fin, et SUIVANT boucle aussi. Déplacer
   * la règle ici ferait s'arrêter le concert au bout de sa dernière scène,
   * c'est-à-dire au milieu du set. */
  it('⚠️ la scène suivante BOUCLE — l’arrêt en fin de morceau n’est PAS ici', () => {
    expect(sectionSuivante(0, 3)).toBe(1);
    expect(sectionSuivante(2, 3)).toBe(0);
    // Une chaîne vide ne renvoie jamais -1 ni NaN : le montage vient d'être effacé.
    expect(sectionSuivante(0, 0)).toBe(0);
    // Et une chaîne d'UNE scène boucle sur elle-même, elle ne rend pas -1.
    expect(sectionSuivante(0, 1)).toBe(0);
  });

  /* ⚠️ On bascule pendant la DERNIÈRE mesure, pas après : le moteur applique
   * au début de la suivante, qui est exactement la frontière. Basculer « après
   * la dernière » ferait jouer une mesure de trop à chaque scène. */
  it('⚠️ bascule pendant la DERNIÈRE mesure de la scène', () => {
    const m = moteurFeint();
    for (const [bar, attendu] of [[0, false], [1, false], [2, true], [3, true]] as const) {
      m.faux.barDansSection = bar;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(doitBasculer(m.faux as any, 3), `mesure ${bar}`).toBe(attendu);
    }
  });

  it('une scène sans durée ne bascule jamais — sinon on tourne à vide', () => {
    const m = moteurFeint();
    m.faux.barDansSection = 99;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(doitBasculer(m.faux as any, 0)).toBe(false);
  });
});
