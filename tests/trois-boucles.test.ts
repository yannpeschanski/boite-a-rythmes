/* TROIS BOUCLES, UN MORCEAU — l'acte 6 en couplet / refrain / pont.
 *
 * Demande de Yann (2026-09-04) : *« pour chacun de ces morceaux, on travaille 3
 * boucles qui permettront de faire ensuite couplet/refrain/pont pour le mode
 * live ! »*
 *
 * ⚠️ Ce que ces contraintes ont de particulier : elles ne jugent pas la boucle
 * livrée, elles jugent l'ÉCART entre elle et celle d'avant. « Un refrain » n'a
 * pas de définition absolue — ce qui en fait un refrain, c'est qu'il s'ouvre
 * par rapport au couplet. C'est aussi ce qui les rend faciles à écrire à
 * l'envers, d'où ce fichier.
 */
import { describe, it, expect } from 'vitest';
import {
  plusFourniQue,
  moinsFourniQue,
  uneLigneQuiEntre,
  uneLigneQuiSeTait,
} from '../src/model/commande';
import { ACTES, SERIE_DU_DISQUE, ACTE_DU_DISQUE } from '../src/model/carriere';
import { defaultState } from '../src/model/defaults';
import type { PatternStateV2 } from '../src/model/types';

/** Un couplet : trois lignes de batterie, quelques coups chacune. */
function couplet(): PatternStateV2 {
  const st = defaultState();
  for (const l of ['kick', 'snare', 'hat', 'clap', 'shaker'] as const) {
    st.rows[l].subdiv = 8;
    st.rows[l].pattern = new Array(32).fill(0) as never;
  }
  for (const l of ['kick', 'snare', 'hat'] as const) {
    for (let i = 0; i < 4; i++) (st.rows[l].pattern as number[])[i * 2] = 1;
  }
  return st;
}

describe('un refrain S’OUVRE par rapport au couplet', () => {
  it('le couplet lui-même ne suffit pas', () => {
    const depart = couplet();
    const c = plusFourniQue(1.2, 'x');
    expect(c.verifie(couplet(), { depart }), 'la même boucle passe pour un refrain').toBe(false);
  });

  it('des coups en plus suffisent', () => {
    const depart = couplet();
    const st = couplet();
    for (let i = 0; i < 8; i++) (st.rows.hat.pattern as number[])[i] = 1;
    expect(plusFourniQue(1.2, 'x').verifie(st, { depart })).toBe(true);
  });

  /* ⚠️ Ajouter des coups sur les mêmes lignes fait une VARIATION ; faire entrer
   * une voix fait un refrain. Les deux contraintes disent des choses
   * différentes, et le cahier demande les deux. */
  it('⚠️ mais « une ligne qui entre » demande autre chose', () => {
    const depart = couplet();
    const plusDeCoups = couplet();
    for (let i = 0; i < 8; i++) (plusDeCoups.rows.hat.pattern as number[])[i] = 1;
    expect(uneLigneQuiEntre('x').verifie(plusDeCoups, { depart }), 'aucune voix neuve').toBe(false);

    const avecClap = couplet();
    (avecClap.rows.clap.pattern as number[])[0] = 1;
    expect(uneLigneQuiEntre('x').verifie(avecClap, { depart })).toBe(true);
  });
});

describe('un pont RETOMBE', () => {
  it('il en met moins, et une ligne se tait', () => {
    const depart = couplet();
    const st = couplet();
    st.rows.hat.pattern = new Array(32).fill(0) as never;
    expect(moinsFourniQue(0.8, 'x').verifie(st, { depart })).toBe(true);
    expect(uneLigneQuiSeTait('x').verifie(st, { depart })).toBe(true);
  });

  it('le couplet tel quel n’est pas un pont', () => {
    const depart = couplet();
    expect(moinsFourniQue(0.8, 'x').verifie(couplet(), { depart })).toBe(false);
    expect(uneLigneQuiSeTait('x').verifie(couplet(), { depart })).toBe(false);
  });

  /* Couper une ligne à l'ÉCOUTE (`muted`) suffit : c'est un geste de studio, et
   * ce qu'on demande est qu'on ne l'entende plus. */
  it('couper la ligne compte autant que l’effacer', () => {
    const depart = couplet();
    const st = couplet();
    st.rows.hat.muted = true;
    expect(uneLigneQuiSeTait('x').verifie(st, { depart })).toBe(true);
  });
});

describe('sans départ, aucune des quatre ne se coche', () => {
  it('elles répondent faux', () => {
    const st = couplet();
    for (const c of [
      plusFourniQue(1.2, 'x'),
      moinsFourniQue(0.8, 'x'),
      uneLigneQuiEntre('x'),
      uneLigneQuiSeTait('x'),
    ]) {
      expect(c.verifie(st, undefined), c.id).toBe(false);
      expect(c.verifie(st, {}), c.id).toBe(false);
    }
  });
});

/* ⚠️ LE DISQUE DE L'ÉPILOGUE. Il joue « la production de l'acte du disque » —
 * et cet acte en livre trois depuis qu'il se fait en boucles. Lue comme « la
 * dernière rangée », ce serait le PONT, c'est-à-dire la boucle qu'on vient de
 * demander de vider : l'épilogue annoncerait « FB-015 est sorti » et ferait
 * entendre le moment le plus creux du morceau. */
describe('⚠️ l’épilogue fait entendre la boucle qui PORTE le morceau', () => {
  it('la série du disque est celle de la première commande de son acte', () => {
    const acte = ACTES.find((a) => a.id === ACTE_DU_DISQUE)!;
    const commandes = acte.etapes.filter((e) => e.kind === 'commande');
    expect(commandes.length, 'l’acte du disque ne commande rien').toBeGreaterThan(0);
    expect(SERIE_DU_DISQUE).toBe((commandes[0] as { serie?: string }).serie ?? '');
    // Et ce n'est PAS la dernière, sinon la déduction ne servirait à rien.
    if (commandes.length > 1) {
      expect(SERIE_DU_DISQUE).not.toBe(
        (commandes[commandes.length - 1] as { serie?: string }).serie ?? '',
      );
    }
  });
});
