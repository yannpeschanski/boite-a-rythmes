import { describe, it, expect } from 'vitest';
import { PRESETS } from '../src/model/presets/songs';
import { presetToState } from '../src/model/presetAdapter';
import { defaultState } from '../src/model/defaults';
import {
  kickQuiPorte,
  avoirEnleve,
  deLEspaceSansSoupe,
  COUPE_AUDIBLE_HZ,
  REVERBE_PLANCHER,
  REVERBE_PLAFOND,
} from '../src/model/commande';
import { LAVERIE_DRIVES } from '../src/model/exercises';
import { evaluerStyle, ficheStyle } from '../src/model/styles';
import type { PatternStateV2 } from '../src/model/types';

const MIXAGE = [kickQuiPorte(), avoirEnleve(), deLEspaceSansSoupe()];

function etatDuPreset(id: string): PatternStateV2 {
  return presetToState(PRESETS.find((p) => p.id === id)!, undefined, false);
}

/** Un morceau techno correct, mais pas encore mixé pour la laverie. */
function technoNonMixee(): PatternStateV2 {
  return etatDuPreset('techno');
}

/** Le même, une fois les trois gestes faits. */
function technoMixee(): PatternStateV2 {
  const st = technoNonMixee();
  st.rows.kick.tone = 60; // le kick porte hors du grave
  st.rows.hat.filterCutoff = 6000; // on a enlevé
  st.rows.snare.reverbSend = 0.2; // de l'espace, sans noyer
  return st;
}

/* ---- LE POINT DE CONCEPTION -------------------------------------------
 *
 * L'acte 4 se fait en deux temps : produire un morceau techno, puis le régler
 * pour qu'il tienne sur le petit haut-parleur. Si un morceau techno correct
 * satisfaisait déjà le mixage, le second temps serait décoratif — c'est
 * exactement le défaut qu'on vient de corriger (l'ancienne commande ne
 * vérifiait aucun mixage). Ce test-ci est donc le plus important du fichier.
 */
describe('le mixage est un SECOND geste, pas un bonus du premier', () => {
  it('un morceau techno correct ne passe PAS le mixage', () => {
    const st = technoNonMixee();
    expect(evaluerStyle(st, ficheStyle('techno')!).atteint, 'le morceau doit être bon').toBe(true);
    expect(MIXAGE.every((c) => c.verifie(st)), 'mais le mixage ne doit pas suivre').toBe(false);
  });

  it('et le même morceau passe une fois les trois gestes faits', () => {
    const st = technoMixee();
    for (const c of MIXAGE) expect(c.verifie(st), c.id).toBe(true);
  });

  it('aucun des trois n’est satisfait par l’état de départ', () => {
    // Une case cochée sans rien toucher est du théâtre : le joueur le sent et
    // cesse d'écouter le cahier.
    for (const c of MIXAGE) expect(c.verifie(defaultState()), c.id).toBe(false);
  });
});

describe('le kick doit porter hors du grave', () => {
  it('exige le palier de drive que la laverie a fait entendre', () => {
    // Le seuil n'est pas choisi à vue : c'est `LAVERIE_DRIVES[1]`, mesuré dans
    // un OfflineAudioContext (13 % de l'énergie survit à drive 0, ~35 % à 55).
    const st = defaultState();
    st.rows.kick.tone = LAVERIE_DRIVES[1] - 1;
    expect(kickQuiPorte().verifie(st)).toBe(false);
    st.rows.kick.tone = LAVERIE_DRIVES[1];
    expect(kickQuiPorte().verifie(st)).toBe(true);
  });
});

describe('« tu enlèves, ensuite seulement tu ajoutes »', () => {
  it('accepte une ligne réellement filtrée', () => {
    const st = defaultState();
    st.rows.hat.filterCutoff = COUPE_AUDIBLE_HZ;
    expect(avoirEnleve().verifie(st)).toBe(true);
  });

  it('refuse un curseur à peine bougé', () => {
    const st = defaultState();
    st.rows.hat.filterCutoff = COUPE_AUDIBLE_HZ + 1000;
    expect(avoirEnleve().verifie(st)).toBe(false);
  });

  it('⚠️ ne compte PAS le kick — le filtrer défait ce qu’on vient de gagner', () => {
    // Couper les aigus du kick retirerait exactement ce qui lui permet de
    // survivre au petit haut-parleur. Une contrainte qui l'accepterait
    // enseignerait le contraire de l'acte.
    const st = defaultState();
    st.rows.kick.filterCutoff = 400;
    expect(avoirEnleve().verifie(st)).toBe(false);
  });

  it('ne compte pas une ligne coupée', () => {
    const st = defaultState();
    st.rows.hat.filterCutoff = 3000;
    st.rows.hat.muted = true;
    expect(avoirEnleve().verifie(st)).toBe(false);
  });
});

describe('de l’espace, sans soupe', () => {
  it('refuse zéro réverbe — la case ne doit pas être cochée d’avance', () => {
    expect(deLEspaceSansSoupe().verifie(defaultState())).toBe(false);
  });

  it('accepte un envoi dans la fourchette', () => {
    const st = defaultState();
    st.rows.snare.reverbSend = REVERBE_PLANCHER;
    expect(deLEspaceSansSoupe().verifie(st)).toBe(true);
  });

  it('refuse dès qu’UNE ligne dépasse le plafond, même si une autre est juste', () => {
    // C'est la moitié « sans noyer » : en trop, la réverbe transforme une
    // boucle en bouillie sur un petit haut-parleur.
    const st = defaultState();
    st.rows.snare.reverbSend = 0.2;
    st.rows.hat.reverbSend = REVERBE_PLAFOND + 0.05;
    expect(deLEspaceSansSoupe().verifie(st)).toBe(false);
  });

  it('ignore une ligne coupée, qu’on n’entend pas', () => {
    const st = defaultState();
    st.rows.snare.reverbSend = 0.2;
    st.rows.hat.reverbSend = 1;
    st.rows.hat.muted = true;
    expect(deLEspaceSansSoupe().verifie(st)).toBe(true);
  });
});

/* ---- LE CALIBRAGE ------------------------------------------------------ */
describe('aucun preset n’arrive déjà mixé pour la laverie', () => {
  it('les 34 presets échouent tous sur au moins un des trois', () => {
    // Les presets sont des mixages de STUDIO — c'est le sujet même de l'acte.
    // Si l'un d'eux passait, un joueur pourrait le reproduire et sauter la
    // leçon entière.
    for (const p of PRESETS) {
      const st = etatDuPreset(p.id);
      expect(MIXAGE.every((c) => c.verifie(st)), `${p.id} arrive déjà mixé`).toBe(false);
    }
  });
});
