/* LES ÉTOILES D'UNE LIVRAISON — ce qu'on a fait EN PLUS du cahier.
 *
 * Idée de Yann (2026-09-04) : *« si la personne n'a même pas écouté son
 * travail, une seule étoile ; si elle n'a fait que le cahier des charges, ou
 * qu'elle n'a pas changé au moins deux AUTRES paramètres : 1 étoile ; au moins
 * 2 paramètres et une écoute : 2 étoiles ; au moins 3 et deux cycles : 3
 * étoiles. On salue l'effort de rechercher un produit. »*
 *
 * ⚠️ Tout tient dans le mot « autres ». Un cahier de MIXAGE exige déjà d'avoir
 * bougé six réglages : sans distinguer ce que le cahier réclamait de ce que le
 * joueur a cherché, le satisfaire donnerait trois étoiles d'office, et la
 * première phrase de la règle serait fausse. `reglagesEnPlus` fait cette
 * distinction sans qu'aucune contrainte ait à déclarer ses champs : on remet le
 * réglage à sa valeur de départ, et on regarde si le cahier tient encore.
 */
import { describe, it, expect } from 'vitest';
import {
  reglagesEnPlus,
  etoilesDeLivraison,
  contrasteDeVolume,
  chaqueLigneRetouchee,
  lignesPresentes,
  LIGNES_TOUTES,
  type Contrainte,
} from '../src/model/commande';
import { defaultState } from '../src/model/defaults';
import {
  composerRoastLivraison,
  ROAST_LIVRAISON_REGLAGES,
  ROAST_LIVRAISON_ECOUTE,
} from '../src/model/presets/gameData';
import type { PatternStateV2 } from '../src/model/types';

/** Un morceau qui sonne — les trois lignes de batterie jouent. */
function morceau(): PatternStateV2 {
  const st = defaultState();
  for (const l of ['kick', 'snare', 'hat'] as const) {
    st.rows[l].pattern[0] = 1 as never;
  }
  return st;
}

describe('on ne compte que ce que le cahier ne demandait PAS', () => {
  const cahier: Contrainte[] = [lignesPresentes(['kick', 'snare', 'hat'], 'les trois lignes')];

  it('un morceau livré tel quel n’a rien en plus', () => {
    const depart = morceau();
    expect(reglagesEnPlus(morceau(), cahier, { depart })).toEqual([]);
  });

  it('chaque réglage cherché compte une fois', () => {
    const depart = morceau();
    const st = morceau();
    st.rows.kick.tone = 40;
    st.rows.hat.filterCutoff = 6000;
    st.synthRows.bass.glide = 0.3;
    expect(reglagesEnPlus(st, cahier, { depart }).sort()).toEqual([
      'bass.glide',
      'hat.filterCutoff',
      'kick.tone',
    ]);
  });

  /* ⚠️ LE CŒUR DU CORRECTIF. Le cahier exige ici que le volume varie ; l'avoir
   * fait ne doit RIEN rapporter, sinon la note mesure le type de cahier au lieu
   * de l'effort. La reverbe, elle, n'est demandée nulle part : elle compte. */
  it('⚠️ un réglage EXIGÉ par le cahier ne rapporte rien', () => {
    const depart = morceau();
    const avecMix: Contrainte[] = [contrasteDeVolume(0.18, 'range les plans', LIGNES_TOUTES)];
    const st = morceau();
    st.rows.hat.volume = 0.2; // ce que le cahier demande
    st.rows.snare.reverbSend = 0.3; // ce que personne ne demande
    const enPlus = reglagesEnPlus(st, avecMix, { depart });
    expect(enPlus).toContain('snare.reverbSend');
    expect(enPlus, 'le volume était exigé').not.toContain('hat.volume');
  });

  /* Le cas qui rendait la règle de Yann contradictoire : « chaque ligne a été
   * regardée » exige SIX retouches. Aucune ne doit rapporter d'étoile. */
  it('⚠️ un cahier de mixage complet ne donne aucun réglage « en plus »', () => {
    const depart = morceau();
    const lignes = ['kick', 'snare', 'hat'] as const;
    const avecMix: Contrainte[] = [chaqueLigneRetouchee([...lignes], 'chaque ligne regardée')];
    const st = morceau();
    for (const l of lignes) st.rows[l].tone = 42;
    expect(reglagesEnPlus(st, avecMix, { depart })).toEqual([]);
    // Et un geste de plus, lui, compte.
    st.synthRows.pad.reverbSend = 0.25;
    expect(reglagesEnPlus(st, avecMix, { depart })).toEqual(['pad.reverbSend']);
  });

  it('sans départ connu, on ne conclut rien', () => {
    expect(reglagesEnPlus(morceau(), cahier, {})).toEqual([]);
  });

  /* Une VOIX choisie est UN geste, pas six : la remplacer change son type et sa
   * coupure d'un coup, et compter chaque champ ferait de trois clics une note
   * maximale. */
  it('choisir une voix compte pour un seul réglage', () => {
    const depart = morceau();
    const st = morceau();
    st.synthRows.bass.voice = { ...st.synthRows.bass.voice, type: 'square', cutoff: 320 };
    expect(reglagesEnPlus(st, cahier, { depart })).toEqual(['bass.voix']);
  });
});

describe('la note, telle qu’elle a été posée', () => {
  it('livré sans rien chercher ni écouter : une étoile', () => {
    expect(etoilesDeLivraison(0, 0)).toBe(1);
    expect(etoilesDeLivraison(5, 0), 'cherché mais jamais écouté').toBe(1);
    expect(etoilesDeLivraison(1, 4), 'écouté mais rien cherché').toBe(1);
  });

  it('deux réglages et une écoute : deux étoiles', () => {
    expect(etoilesDeLivraison(2, 1)).toBe(2);
    expect(etoilesDeLivraison(3, 1), 'trois réglages mais un seul cycle').toBe(2);
    expect(etoilesDeLivraison(2, 9), 'deux réglages, beaucoup d’écoute').toBe(2);
  });

  it('trois réglages et deux cycles : trois étoiles', () => {
    expect(etoilesDeLivraison(3, 2)).toBe(3);
    expect(etoilesDeLivraison(8, 6)).toBe(3);
  });

  /* ⚠️ Une livraison ACCEPTÉE ne vaut jamais zéro : le bouton reste verrouillé
   * tant que le cahier n'est pas satisfait, donc arriver là veut déjà dire
   * qu'on a tout fait. Le zéro est réservé à l'abandon, et il ne passe pas par
   * cette fonction. */
  it('⚠️ une livraison vaut toujours au moins une étoile', () => {
    for (let p = 0; p < 6; p++) {
      for (let c = 0; c < 6; c++) expect(etoilesDeLivraison(p, c)).toBeGreaterThanOrEqual(1);
    }
  });
});

/* ---------------------------------------------------------------------------
 * LA REMARQUE QUI VA AVEC — *« du coup, tu peux aussi adapter les roasts en
 * fonction »* (Yann, 2026-09-04).
 *
 * Elle est composée sur les MÊMES deux mesures que les étoiles, donc elle
 * explique celle qui manque sans avoir à la nommer. Ce qui se teste : qu'elle
 * dise ce qui s'est passé, jamais l'inverse.
 * ------------------------------------------------------------------------- */
describe('la remarque d’une livraison suit ce qui a été mesuré', () => {
  /** Toutes les phrases possibles pour un couple (réglages, cycles). */
  const toutes = (r: number, c: number) =>
    Array.from({ length: 6 }, (_, i) => composerRoastLivraison(r, c, (a) => a[i % a.length]));

  it('les trois paliers existent des deux côtés', () => {
    for (const k of ['0', '1', '2']) {
      expect(ROAST_LIVRAISON_REGLAGES[k].length, k).toBeGreaterThanOrEqual(3);
      expect(ROAST_LIVRAISON_ECOUTE[k].length, k).toBeGreaterThanOrEqual(3);
    }
  });

  /* ⚠️ Le cas qui rendait la phrase précédente fausse : elle disait « cherche
   * des réglages » à quelqu'un qui venait d'en chercher cinq. */
  it('⚠️ elle ne reproche pas ce qui a été fait', () => {
    for (const t of toutes(5, 3)) {
      /* ⚠️ Le motif cherche des PHRASES de reproche, pas des mots : « le cahier
       * était le minimum et tu l'as compris » est un compliment qui contient
       * « minimum ». Un test qui lit des mots isolés se trompe de sens. */
      expect(/pas un bouton|zéro réglage|rien touché au-delà|on appelle ça le minimum/i.test(t), t)
        .toBe(false);
      expect(/pas écouté|sans écouter|pas un tour/i.test(t), t).toBe(false);
    }
  });

  it('et elle ne félicite pas ce qui n’a pas été fait', () => {
    for (const t of toutes(0, 0)) {
      // L'apostrophe est DROITE dans les roasts (comme tout `gameData.ts`) : un
      // motif qui n'accepte que la typographique ne trouve jamais rien.
      expect(/exactement ça, produire|le reste, c['’]est toi/i.test(t), t).toBe(false);
      expect(/laissé tourner|plusieurs tours/i.test(t), t).toBe(false);
    }
  });

  it('elle dit les deux moitiés de la note, toujours', () => {
    for (const r of [0, 1, 3, 7]) {
      for (const c of [0, 1, 5]) {
        const t = composerRoastLivraison(r, c, (a) => a[0]);
        expect(t.includes(ROAST_LIVRAISON_REGLAGES[r <= 0 ? '0' : r <= 2 ? '1' : '2'][0])).toBe(true);
        expect(t.includes(ROAST_LIVRAISON_ECOUTE[c <= 0 ? '0' : c <= 1 ? '1' : '2'][0])).toBe(true);
      }
    }
  });

  /* Un joueur à trois étoiles doit lire une phrase qui le dit — sinon la
   * remarque ressemble à un reproche permanent. */
  it('à trois étoiles, les deux moitiés saluent', () => {
    for (const t of toutes(3, 2)) {
      expect(/produire|plaisir|c['’]est toi/i.test(t), t).toBe(true);
    }
  });
});
