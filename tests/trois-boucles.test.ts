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
  uneLigneQuiEntre,
  uneLigneQuiSeTait,
  uneAutrePhrase,
  unePhraseQuiMonte,
  unePhraseQuiSEclaircit,
  uneAutreHarmonie,
  auPlusDeLignes,
  unGesteRare,
  unePolyrythmie,
  unDetuneFranc,
  duGrain,
} from '../src/model/commande';
import { ACTES, SERIE_DU_DISQUE, ACTE_DU_DISQUE } from '../src/model/carriere';
import { defaultState, etatVierge } from '../src/model/defaults';
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

/* ⚠️ UN PONT RETOMBE, MAIS ON NE COMPTE PLUS LES COUPS (2026-09-16).
 *
 * `moinsFourniQue` est retiré : le compte était relatif au couplet que le
 * joueur avait choisi, donc un couplet sobre rendait le pont presque vide et la
 * consigne perdait son sens — tout en restant satisfaisable, ce qu'un test de
 * satisfiabilité ne peut pas voir. Ce qui reste DÉCRIT le geste : une ligne se
 * tait complètement, et la phrase s'éclaircit sans disparaître. */
describe('un pont RETOMBE', () => {
  it('une ligne se tait complètement', () => {
    const depart = couplet();
    const st = couplet();
    st.rows.hat.pattern = new Array(32).fill(0) as never;
    expect(uneLigneQuiSeTait('x').verifie(st, { depart })).toBe(true);
  });

  it('le couplet tel quel n’est pas un pont', () => {
    const depart = couplet();
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

describe('sans départ, aucune des relationnelles ne se coche', () => {
  it('elles répondent faux', () => {
    const st = couplet();
    for (const c of [
      plusFourniQue(1.2, 'x'),
      uneLigneQuiEntre('x'),
      uneLigneQuiSeTait('x'),
    ]) {
      expect(c.verifie(st, undefined), c.id).toBe(false);
      expect(c.verifie(st, {}), c.id).toBe(false);
    }
  });
});

/* DES RÉGLAGES QU'ON N'OSE PAS — le troisième morceau, et lui seul.
 *
 * Demande de Yann (2026-09-16) : *« pour le dernier morceau, demander vraiment
 * des réglages un peu spéciaux. Une polyphonie 16/12 par exemple. »* Il a
 * écarté la version « un geste de plus au choix » : les trois sont exigés.
 *
 * ⚠️ Ce que ce fichier doit empêcher, et c'est le vrai piège : qu'un de ces
 * trois soit satisfait PAR LES VALEURS D'USINE. Le motif d'usine porte déjà un
 * kick en 4 et un charley en 3 — deux subdivisions qui ne se divisent pas.
 * « Un critère satisfait sans rien toucher est du théâtre. »
 */
describe('les réglages spéciaux du dernier morceau EXIGENT un geste', () => {
  it('⚠️ le kick 4 / charley 3 D’USINE ne fait pas une polyrythmie', () => {
    /* La preuve que le piège est réel : sur le motif d'usine, les deux
     * subdivisions ne se divisent effectivement pas. Sans la mesure contre le
     * départ, la case serait cochée à l'ouverture de la commande. */
    const usine = defaultState();
    expect(usine.rows.kick.subdiv).toBe(4);
    expect(usine.rows.hat.subdiv).toBe(3);
    expect(4 % 3 === 0 || 3 % 4 === 0, 'elles se divisent, le piège a disparu').toBe(false);

    const st = defaultState();
    for (const l of ['kick', 'hat'] as const) {
      for (let i = 0; i < 3; i++) (st.rows[l].pattern as number[])[i] = 1;
    }
    expect(unePolyrythmie('x').verifie(st, { depart: defaultState() })).toBe(false);
  });

  it('⚠️ une subdivision RÉGLÉE en fait une — 16 contre 12', () => {
    const st = couplet();
    st.rows.kick.subdiv = 16;
    st.rows.snare.subdiv = 12;
    expect(unePolyrythmie('x').verifie(st, { depart: couplet() })).toBe(true);
  });

  it('… mais seulement si les deux lignes SONNENT', () => {
    const st = couplet();
    st.rows.kick.subdiv = 16;
    st.rows.snare.subdiv = 12;
    st.rows.snare.muted = true;
    // Le charley reste en 8, donc il se divise avec le kick en 16.
    expect(unePolyrythmie('x').verifie(st, { depart: couplet() })).toBe(false);
  });

  it('sans départ, elle répond faux — comme les relationnelles', () => {
    const st = couplet();
    st.rows.kick.subdiv = 16;
    st.rows.snare.subdiv = 12;
    expect(unePolyrythmie('x').verifie(st, undefined)).toBe(false);
  });

  it('⚠️ le détune d’usine est à ZÉRO, donc le seuil vient d’un geste', () => {
    const st = couplet();
    st.synthRows.melody.muted = false;
    st.synthRows.melody.subdivisions = 4;
    st.synthRows.melody.pattern = [{ degree: 1, octave: 0 }, null, null, null];
    expect(st.synthRows.melody.voice.detuneCents ?? 0).toBe(0);
    expect(unDetuneFranc(20, 'x').verifie(st, {})).toBe(false);
    st.synthRows.melody.voice = { ...st.synthRows.melody.voice, detuneCents: 22 };
    expect(unDetuneFranc(20, 'x').verifie(st, {})).toBe(true);
    // Sur une ligne MUETTE, ça ne s'entend pas.
    st.synthRows.melody.muted = true;
    expect(unDetuneFranc(20, 'x').verifie(st, {})).toBe(false);
  });

  it('⚠️ le grain a besoin de quelque chose pour s’entendre', () => {
    const st = couplet();
    st.globalBitcrush = 0.22;
    expect(duGrain(0.2, 'x').verifie(st, {})).toBe(true);
    // Le bus seul, sur un morceau muet : rien ne sort.
    const vide = etatVierge();
    vide.globalBitcrush = 0.22;
    expect(duGrain(0.2, 'x').verifie(vide, {})).toBe(false);
    // Et sous le seuil, non.
    const faible = couplet();
    faible.globalBitcrush = 0.05;
    expect(duGrain(0.2, 'x').verifie(faible, {})).toBe(false);
  });

  /* ⚠️ Ils ne vivent que sur « celui que personne n'attend », et sur son
   * COUPLET : le refrain et le pont repartent de lui, donc les réglages
   * voyagent tout seuls. Les redemander les afficherait cochés d'avance. */
  it('⚠️ et ils ne sont demandés QUE sur le couplet du troisième morceau', () => {
    const ids = ['polyrythmie', 'detune-20', 'grain'];
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'commande') continue;
        const presents = e.cahier.map((l) => l.id).filter((i) => ids.includes(i));
        const attendu = e.serie === 'attend-couplet' ? ids : [];
        expect(presents.sort(), `« ${e.entete} »`).toEqual([...attendu].sort());
      }
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

/* ---------------------------------------------------------------------------
 * ET CE QUI MANQUAIT : LA MÉLODIE
 *
 * ⚠️ Retour de Yann (2026-09-05) : *« le travail n'est pas suffisant pour le
 * refrain et le pont, il faut un cahier des charges plus complet avec un
 * travail sur la mélodie »*. Les quatre contraintes ci-dessus ne comptent que
 * des COUPS : un refrain qui s'ouvre en ajoutant un shaker les satisfaisait
 * toutes, alors que ce n'est pas un refrain — c'est le couplet avec un shaker.
 * ------------------------------------------------------------------------- */

/** Un couplet AVEC une phrase : quatre notes, trois hauteurs, et deux accords. */
function coupletChante(): PatternStateV2 {
  const st = couplet();
  const m = st.synthRows.melody;
  m.muted = false;
  m.subdivisions = 8;
  m.pattern = new Array(8).fill(null);
  m.pattern[0] = { degree: 1, octave: 0 };
  m.pattern[2] = { degree: 3, octave: 0 };
  m.pattern[4] = { degree: 2, octave: 0 };
  m.pattern[6] = { degree: 1, octave: 0 };
  const p = st.synthRows.pad;
  p.muted = false;
  p.subdivisions = 4;
  p.pattern = [0, 1, 0, 1] as never;
  return st;
}

/** Réécrit la mélodie d'un état : `degres` en degrés, `null` pour un silence. */
function poserMelodie(st: PatternStateV2, degres: Array<number | null>, octave = 0) {
  const m = st.synthRows.melody;
  m.muted = false;
  m.subdivisions = degres.length;
  m.pattern = degres.map((d) => (d === null ? null : { degree: d, octave })) as never;
}

describe('⚠️ un refrain, c’est d’abord une AUTRE PHRASE', () => {
  it('la même mélodie ne fait pas un refrain, même jouée plus fort', () => {
    const depart = coupletChante();
    const st = coupletChante();
    // Des coups en plus partout, mais la phrase est identique.
    for (let i = 0; i < 8; i++) (st.rows.clap.pattern as number[])[i] = 1;
    expect(plusFourniQue(1.2, 'x').verifie(st, { depart }), 'plus fourni').toBe(true);
    expect(uneAutrePhrase('melody', 'x').verifie(st, { depart })).toBe(false);
  });

  it('déplacer la phrase suffit à en faire une autre', () => {
    const depart = coupletChante();
    const st = coupletChante();
    // ⚠️ Mêmes notes, autres positions. Une comparaison qui jetterait les
    // silences ne verrait aucune différence — or déplacer une phrase, c'est en
    // écrire une autre.
    poserMelodie(st, [null, 1, null, 3, null, 2, null, 1]);
    expect(uneAutrePhrase('melody', 'x').verifie(st, { depart })).toBe(true);
  });

  it('couper la mélodie n’est pas « une autre phrase »', () => {
    const depart = coupletChante();
    const st = coupletChante();
    st.synthRows.melody.muted = true;
    expect(uneAutrePhrase('melody', 'x').verifie(st, { depart })).toBe(false);
  });

  it('⚠️ ÇA MONTE — et l’octave compte pour sept degrés', () => {
    const depart = coupletChante();
    const meme = coupletChante();
    expect(unePhraseQuiMonte('melody', 1, 'x').verifie(meme, { depart })).toBe(false);
    // La MÊME phrase, une octave au-dessus : c'est le geste le plus courant
    // pour ouvrir un refrain, et sans l'octave la moyenne serait identique.
    const haut = coupletChante();
    poserMelodie(haut, [1, 3, 2, 1], 1);
    expect(unePhraseQuiMonte('melody', 1, 'x').verifie(haut, { depart })).toBe(true);
    // Et une phrase plus BASSE ne passe pas.
    const bas = coupletChante();
    poserMelodie(bas, [1, 3, 2, 1], -1);
    expect(unePhraseQuiMonte('melody', 1, 'x').verifie(bas, { depart })).toBe(false);
  });
});

describe('⚠️ un pont, c’est une phrase qui S’ÉCLAIRCIT et une autre harmonie', () => {
  it('moins de notes, mais il en reste', () => {
    const depart = coupletChante(); // quatre notes
    const st = coupletChante();
    poserMelodie(st, [2, null, null, null, null, null, null, null]);
    expect(unePhraseQuiSEclaircit('melody', 0.7, 'x').verifie(st, { depart })).toBe(true);
  });

  it('⚠️ mais la couper n’est pas l’éclaircir — un pont sans mélodie est un break', () => {
    const depart = coupletChante();
    const st = coupletChante();
    st.synthRows.melody.muted = true;
    expect(unePhraseQuiSEclaircit('melody', 0.7, 'x').verifie(st, { depart })).toBe(false);
  });

  it('l’harmonie bouge quand la suite d’accords change', () => {
    const depart = coupletChante();
    const meme = coupletChante();
    expect(uneAutreHarmonie('x').verifie(meme, { depart })).toBe(false);
    const autre = coupletChante();
    autre.synthRows.pad.pattern = [2, 3, 2, 3] as never;
    expect(uneAutreHarmonie('x').verifie(autre, { depart })).toBe(true);
  });

  it('⚠️ sans nappe au départ, il n’y a pas d’harmonie à quitter', () => {
    const depart = couplet(); // pas de nappe
    const st = coupletChante();
    expect(uneAutreHarmonie('x').verifie(st, { depart })).toBe(false);
  });
});

/* Les quatre nouvelles suivent la règle des autres : sans départ, FAUX. Une
 * case cochée faute d'information est le théâtre que le cahier interdit. */
describe('⚠️ les contraintes mélodiques répondent FAUX sans départ', () => {
  it('aucune ne se coche toute seule', () => {
    const st = coupletChante();
    for (const c of [
      uneAutrePhrase('melody', 'x'),
      unePhraseQuiMonte('melody', 1, 'x'),
      unePhraseQuiSEclaircit('melody', 0.7, 'x'),
      uneAutreHarmonie('x'),
    ]) {
      expect(c.verifie(st, undefined), c.id).toBe(false);
      expect(c.verifie(st, {}), c.id).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------------------
 * TROIS MORCEAUX — ce qui les distingue sans les briefer
 * ------------------------------------------------------------------------- */

describe('⚠️ « pas plein » se compte en VOIX, pas en coups', () => {
  it('le plafond suit le nombre de lignes qui sonnent', () => {
    const st = coupletChante(); // kick, snare, hat, melody, pad = 5
    expect(auPlusDeLignes(4, 'x').verifie(st, {})).toBe(false);
    st.synthRows.pad.muted = true;
    expect(auPlusDeLignes(4, 'x').verifie(st, {})).toBe(true);
  });

  it('⚠️ un état muet ne « tient » pas sous le plafond — il ne sonne pas', () => {
    const st = defaultState();
    for (const l of ['kick', 'snare', 'hat', 'clap', 'shaker'] as const) {
      st.rows[l].pattern = new Array(st.rows[l].pattern.length).fill(0) as never;
    }
    for (const l of ['bass', 'melody', 'pad'] as const) st.synthRows[l].muted = true;
    expect(auPlusDeLignes(4, 'x').verifie(st, {})).toBe(false);
  });
});

describe('⚠️ « un geste que les autres n’ont pas » en propose cinq, sans en imposer un', () => {
  const geste = unGesteRare('x');

  it('rien de rare → faux, et les cinq sont NOMMÉS à l’écran', () => {
    const st = coupletChante();
    st.swing = 0;
    expect(geste.verifie(st, {})).toBe(false);
    const details = geste.details?.(st) ?? [];
    expect(details, 'le joueur ne voit pas ce qu’il peut choisir').toHaveLength(5);
    expect(details.every((d) => !d.ok)).toBe(true);
  });

  it('n’importe lequel des cinq suffit', () => {
    for (const poser of [
      (st: PatternStateV2) => (st.swing = 25),
      (st: PatternStateV2) => (st.rows.hat.shiftPct = 10),
      (st: PatternStateV2) => (st.synthRows.melody.glide = 0.2),
      (st: PatternStateV2) => (st.synthGlobal.padArpEnabled = true),
      (st: PatternStateV2) => (st.synthRows.melody.cycleBars = 2),
    ]) {
      const st = coupletChante();
      st.swing = 0;
      poser(st);
      expect(geste.verifie(st, {})).toBe(true);
    }
  });

  /* ⚠️ Le défaut qui a coûté une garde : la nappe tourne sur QUATRE mesures
   * dans un Atelier vierge, donc « une ligne de synthé sur deux mesures » était
   * vrai avant que le joueur ait touché à quoi que ce soit. C'est la garde
   * « aucune tâche cochée à l'ouverture » qui l'a trouvé, pas une relecture. */
  it('⚠️ rien n’est coché sur un Atelier vierge', () => {
    expect(geste.verifie(etatVierge(), {})).toBe(false);
  });

  /* Un réglage posé sur une ligne muette ne s'entend pas. */
  it('un geste sur une ligne qui ne sonne pas ne compte pas', () => {
    const st = coupletChante();
    st.swing = 0;
    st.synthRows.bass.muted = true;
    st.synthRows.bass.glide = 0.5;
    expect(geste.verifie(st, {})).toBe(false);
  });
});
