/* LE SYNTHÉ DANS LE CAHIER DES CHARGES — mixage et harmonie.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Relecture de Yann (2026-09-04), sur les deux premiers envois de l'acte 4 :
 * *« il manque les autres lignes de synthé »*, *« il manque le travail sur les
 * autres lignes de synthé »* ; et sur la deuxième case du fax de Zik'Mobile :
 * *« il faut intégrer un cahier des charges pour le synthé adapté à la
 * difficulté du niveau dans l'acte. Pourquoi pas travailler sur l'harmonie ? »*
 *
 * Ce n'était pas un oubli d'écriture des cahiers : les cinq contraintes de
 * mixage ne lisaient que `e.rows`, donc un cahier qui aurait cité la nappe
 * n'aurait rien vérifié — il aurait été du théâtre sans que rien ne le dise.
 *
 * Ce fichier tient les trois pièges de la généralisation, tous payés en
 * l'écrivant : le seuil absolu qui se coche tout seul sur une voix de synthé,
 * l'index d'accord lu comme un degré, et l'empreinte qui ne voit pas le son.
 */
import { describe, it, expect } from 'vitest';
import { defaultState, etatVierge } from '../src/model/defaults';
import {
  LIGNES_TOUTES,
  aBaisseLeFiltre,
  avoirTouche,
  chaqueLigneRetouchee,
  contrasteDeVolume,
  laBasseDitLAccord,
  reverbDosee,
  uneProgression,
} from '../src/model/commande';
import { CHORD_PRIORITY_ORDER } from '../src/model/presets/scales';
import type { PatternStateV2 } from '../src/model/types';

/** Un morceau qui sonne : les trois lignes de batterie et les trois de synthé. */
function morceau(): PatternStateV2 {
  const st = defaultState();
  const pad = st.synthRows.pad;
  pad.subdivisions = 4;
  pad.pattern = [0, 1, -1, -1];
  const bass = st.synthRows.bass;
  bass.subdivisions = 8;
  bass.pattern = new Array(8).fill(null);
  bass.pattern[0] = { degree: 1, octave: 0 };
  const mel = st.synthRows.melody;
  mel.subdivisions = 8;
  mel.pattern = new Array(8).fill(null);
  mel.pattern[0] = { degree: 3, octave: 0 };
  return st;
}

describe('le mixage voit les lignes de SYNTHÉ', () => {
  it('la réverbe et le volume se lisent des deux côtés', () => {
    const st = morceau();
    // Aucun envoi nulle part : la ligne « de l'espace » ne peut pas passer.
    expect(reverbDosee(0.18, 0.55, 'x', LIGNES_TOUTES).verifie(st)).toBe(false);
    // Et un envoi posé sur la seule NAPPE suffit — c'est ce qui était aveugle.
    st.synthRows.pad.reverbSend = 0.3;
    expect(reverbDosee(0.18, 0.55, 'x', LIGNES_TOUTES).verifie(st)).toBe(true);
    // Le plafond compte aussi sur une ligne de synthé : pas de soupe.
    st.synthRows.pad.reverbSend = 0.9;
    expect(reverbDosee(0.18, 0.55, 'x', LIGNES_TOUTES).verifie(st)).toBe(false);
  });

  it('« chaque ligne a été regardée » compte une ligne de synthé retouchée', () => {
    const depart = morceau();
    const lignes = ['kick', 'snare', 'hat', 'bass', 'melody', 'pad'] as const;
    const c = chaqueLigneRetouchee([...lignes], 'x');
    const st = morceau();
    for (const l of ['kick', 'snare', 'hat'] as const) st.rows[l].tone = 42;
    expect(c.verifie(st, { depart }), 'le synthé n’a pas été touché').toBe(false);
    for (const l of ['bass', 'melody', 'pad'] as const) st.synthRows[l].volume = 0.8;
    expect(c.verifie(st, { depart })).toBe(true);
  });

  /* ⚠️ LE PIÈGE DU SEUIL ABSOLU, et la raison d'être de `aBaisseLeFiltre`.
   *
   * La voix d'usine d'une basse coupe à 600 Hz, celle d'une mélodie à 1 600 :
   * élargir `filtreQuiCoupe(9000)` aux lignes de synthé aurait coché « enlève
   * en haut » sur tout morceau qui a un synthé, sans toucher à rien. Sur le
   * synthé, seul le GESTE veut dire quelque chose. */
  it('⚠️ filtrer le synthé se mesure contre le DÉPART, jamais par un seuil', () => {
    const depart = morceau();
    const c = aBaisseLeFiltre(['bass', 'melody', 'pad'], 2, 'x');
    // Rien touché : la voix d'usine coupe déjà bas, et pourtant c'est faux.
    expect(c.verifie(morceau(), { depart })).toBe(false);
    const st = morceau();
    st.synthRows.bass.voice = { ...st.synthRows.bass.voice, cutoff: 300 };
    expect(c.verifie(st, { depart }), 'une seule ligne, il en faut deux').toBe(false);
    st.synthRows.melody.voice = { ...st.synthRows.melody.voice, cutoff: 800 };
    expect(c.verifie(st, { depart })).toBe(true);
    // Sans départ, on ne peut rien conclure : faux, jamais vrai par défaut.
    expect(c.verifie(st, {})).toBe(false);
  });

  /* ⚠️ LE THÉÂTRE TROUVÉ EN GÉNÉRALISANT — les volumes d'usine ne sont pas
   * égaux (kick 1,0 / claire 0,9 / charley 0,7), donc « range les plans : tout
   * n'est pas au même volume » était VRAI dès l'ouverture de tout morceau qui
   * sonne. La garde « aucune case cochée à l'ouverture » ne pouvait pas le
   * voir : elle mesure sur un Atelier vide, où aucune ligne n'est vivante. */
  it('⚠️ « range les plans » exige un curseur bougé, pas les volumes d’usine', () => {
    const depart = morceau();
    const c = contrasteDeVolume(0.18, 'x', LIGNES_TOUTES);
    expect(c.verifie(morceau(), { depart }), 'cochée sans rien toucher').toBe(false);
    const st = morceau();
    st.rows.hat.volume = 0.4;
    expect(c.verifie(st, { depart })).toBe(true);
  });

  /* Elle regarde le SON, pas seulement les cases : un envoi de mixage ne
   * change aucune case, et `empreinteEtat` n'en hache pas d'autres. */
  it('« il faut y avoir touché » voit un geste de mixage seul', () => {
    const depart = morceau();
    expect(avoirTouche().verifie(morceau(), { depart })).toBe(false);
    expect(avoirTouche().verifie(morceau(), {}), 'sans départ, faux').toBe(false);
    const st = morceau();
    st.synthRows.pad.reverbSend = 0.3;
    expect(avoirTouche().verifie(st, { depart })).toBe(true);
  });
});

describe('l’HARMONIE — ce que la nappe pose et ce que la basse en dit', () => {
  it('une progression n’est pas un accord tenu', () => {
    const st = morceau();
    st.synthRows.pad.pattern = [2, -1, 2, -1];
    expect(uneProgression(2, 'x').verifie(st), 'le même accord deux fois').toBe(false);
    st.synthRows.pad.pattern = [0, -1, 2, -1];
    expect(uneProgression(2, 'x').verifie(st)).toBe(true);
    expect(uneProgression(3, 'x').verifie(st), 'deux accords ne font pas trois').toBe(false);
  });

  /* ⚠️ LE PIÈGE DE L'INDEX. Une case de nappe porte un index d'accord, et
   * `CHORD_PRIORITY_ORDER` range les accords dans l'ordre POP — I, IV, V, vi —
   * pas dans l'ordre de la gamme. L'accord d'index 1 est donc le IV, sur le
   * degré 4. Lire l'index comme un degré aurait demandé une basse en II sous un
   * accord de IV : la question aurait été fausse, et fausse en silence. */
  it('⚠️ la fondamentale se lit dans l’ordre des ACCORDS, pas dans l’index', () => {
    expect(CHORD_PRIORITY_ORDER.slice(0, 4)).toEqual([1, 4, 5, 6]);
    const st = morceau();
    st.synthRows.pad.pattern = [0, 1, -1, -1]; // I puis IV
    const c = laBasseDitLAccord('x');
    // Une basse en I et II : le II est ce que donnerait « index + 1 ».
    st.synthRows.bass.pattern[0] = { degree: 1, octave: 0 };
    st.synthRows.bass.pattern[4] = { degree: 2, octave: 0 };
    expect(c.verifie(st), 'le degré 2 n’est pas la fondamentale du IV').toBe(false);
    st.synthRows.bass.pattern[4] = { degree: 4, octave: 0 };
    expect(c.verifie(st)).toBe(true);
  });

  it('elle exige que la nappe et la basse soient là — les deux', () => {
    const c = laBasseDitLAccord('x');
    const sansNappe = morceau();
    sansNappe.synthRows.pad.pattern = [-1, -1, -1, -1];
    expect(c.verifie(sansNappe), 'zéro accord ne satisfait pas zéro exigence').toBe(false);
    const sansBasse = morceau();
    sansBasse.synthRows.bass.pattern = new Array(8).fill(null);
    expect(c.verifie(sansBasse)).toBe(false);
  });

  it('le détail nomme les accords que la basse ne dit pas', () => {
    const st = morceau();
    st.synthRows.pad.pattern = [0, 1, -1, -1];
    st.synthRows.bass.pattern[0] = { degree: 1, octave: 0 };
    const detail = laBasseDitLAccord('x').details!(st, {});
    expect(detail.map((d) => d.ok)).toEqual([true, false]);
    // Les chiffrages viennent de la gamme réelle, comme dans l'Atelier.
    expect(detail[0].libelle).toBe('I');
    expect(detail[1].libelle).toBe('IV');
  });

  /* Une ligne de nappe MUETTE ne pose aucun accord : sans ça, un joueur qui
   * coupe la nappe à l'écoute (geste de studio, `arrEcoute`) livrerait une
   * harmonie que personne n'entend. */
  it('une nappe coupée ne compte pas', () => {
    const st = morceau();
    st.synthRows.pad.pattern = [0, 1, 2, -1];
    expect(uneProgression(3, 'x').verifie(st)).toBe(true);
    st.synthRows.pad.muted = true;
    expect(uneProgression(3, 'x').verifie(st)).toBe(false);
  });
});

/* Le filet du câblage : une contrainte de geste sans départ répond FAUX. Une
 * case cochée faute d'information est le théâtre que le cahier interdit. */
describe('sans contexte, aucune contrainte de geste ne se coche', () => {
  it('les quatre répondent faux', () => {
    const st = etatVierge();
    for (const c of [
      avoirTouche(),
      aBaisseLeFiltre(['bass'], 1, 'x'),
      contrasteDeVolume(0.18, 'x', LIGNES_TOUTES),
      chaqueLigneRetouchee(['kick', 'bass'], 'x'),
    ]) {
      expect(c.verifie(st, undefined), c.id).toBe(false);
    }
  });
});
