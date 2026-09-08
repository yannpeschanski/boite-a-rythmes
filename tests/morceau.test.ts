/* LE FICHIER DE MORCEAU — ce qui survit au navigateur qui l'a fabriqué.
 *
 * ⚠️ CE QUE CES TESTS TIENNENT. Un morceau n'est pas un rythme : il porte les
 * LETTRES, la CHAÎNE qui les enchaîne et les BOUTONS qui la pilotent. Les
 * trois doivent faire l'aller-retour sans perte — c'est la seule raison d'être
 * du format.
 *
 * Et surtout : `lireMorceau` RÉPARE au lieu de refuser. Une validation tout ou
 * rien rend les défauts (une section abîmée) et perd tout le reste, en
 * silence — la leçon a déjà été payée deux fois ici.
 */
import { describe, it, expect } from 'vitest';
import {
  construireMorceau,
  lireMorceau,
  nomDeFichier,
  VERSION_MORCEAU,
  type MorceauVivant,
} from '../src/model/morceau';
import { MONTAGES, montageFrais } from '../src/model/architecture';
import { serializeState } from '../src/model/serialize';
import { defaultState } from '../src/model/defaults';

function morceauType(): MorceauVivant {
  const json = serializeState(defaultState());
  return {
    nom: 'Mon morceau',
    parties: { A: { nom: 'couplet', json }, B: { nom: 'refrain', json } },
    chaine: montageFrais(MONTAGES[1].nom),
    boutons: [['live-mute-kick'], ['live-filtre-ferme']],
  };
}

describe('le fichier de morceau', () => {
  it('fait l’aller-retour sans rien perdre — lettres, chaîne ET boutons', () => {
    const avant = morceauType();
    const fichier = construireMorceau(avant);
    const relu = lireMorceau(JSON.parse(JSON.stringify(fichier)));
    expect(relu).not.toBeNull();
    expect(relu!.version).toBe(VERSION_MORCEAU);
    expect(relu!.nom).toBe('Mon morceau');
    expect(Object.keys(relu!.parties).sort()).toEqual(['A', 'B']);
    expect(relu!.parties.A!.nom).toBe('couplet');
    expect(relu!.parties.A!.json).toBe(avant.parties.A!.json);
    expect(relu!.chaine!.sections.map((s) => s.partie)).toEqual(
      avant.chaine!.sections.map((s) => s.partie),
    );
    expect(relu!.boutons).toEqual(avant.boutons);
  });

  it('refuse ce qui n’est pas un morceau, jamais autre chose', () => {
    expect(lireMorceau(null)).toBeNull();
    expect(lireMorceau('{}')).toBeNull();
    expect(lireMorceau({})).toBeNull();
    // Un rythme partagé n'est pas un morceau : il n'a pas le marqueur.
    expect(lireMorceau({ version: 2, tempo: 120 })).toBeNull();
    // Le marqueur seul ne suffit pas : sans lettre ni chaîne, rien à ouvrir.
    expect(lireMorceau({ format: 'boite-a-rythmes/morceau', version: 1 })).toBeNull();
  });

  it('répare : une lettre illisible est ignorée, les autres s’ouvrent', () => {
    const f = construireMorceau(morceauType()) as unknown as Record<string, unknown>;
    (f.parties as Record<string, unknown>).B = { nom: 'refrain' }; // json manquant
    (f.parties as Record<string, unknown>).Z = { nom: 'x', json: 'y' }; // pas une lettre
    const relu = lireMorceau(f);
    expect(Object.keys(relu!.parties)).toEqual(['A']);
  });

  it('répare : une section abîmée tombe, la chaîne garde les autres', () => {
    const f = construireMorceau(morceauType());
    const sections = [...f.chaine!.sections];
    const bonnes = sections.length;
    sections.splice(1, 0, { id: 'x', nom: 'cassée', cycles: 0, partie: 'A', lignes: null } as never);
    sections.push({ id: 'y', nom: 'sans lettre', cycles: 2 } as never);
    const relu = lireMorceau({ ...f, chaine: { ...f.chaine!, sections } });
    expect(relu!.chaine!.sections).toHaveLength(bonnes);
  });

  it('répare : une chaîne entièrement abîmée devient null sans perdre les lettres', () => {
    const f = construireMorceau(morceauType());
    const relu = lireMorceau({ ...f, chaine: { nom: 'x', sections: [{ nope: true }] } });
    expect(relu!.chaine).toBeNull();
    expect(Object.keys(relu!.parties).sort()).toEqual(['A', 'B']);
  });

  it('des boutons absents ou vides valent « ne rien imposer », pas un tableau vide', () => {
    const f = construireMorceau({ ...morceauType(), boutons: null });
    expect(lireMorceau(f)!.boutons).toBeNull();
    expect(lireMorceau({ ...f, boutons: [[], []] })!.boutons).toBeNull();
    expect(lireMorceau({ ...f, boutons: 'oui' })!.boutons).toBeNull();
  });

  it('un nom de fichier reste ouvrable partout', () => {
    expect(nomDeFichier('Été / là-bas')).toBe('Ete-la-bas.json');
    expect(nomDeFichier('   ')).toBe('morceau.json');
    expect(nomDeFichier('***')).toBe('morceau.json');
    expect(nomDeFichier('a'.repeat(200))).toBe(`${'a'.repeat(60)}.json`);
  });

  it('un morceau sans nom en reçoit un — un fichier anonyme ne se retrouve pas', () => {
    expect(construireMorceau({ ...morceauType(), nom: '   ' }).nom).toBe('Morceau');
    const f = construireMorceau(morceauType());
    expect(lireMorceau({ ...f, nom: 42 })!.nom).toBe('Morceau');
  });
});
