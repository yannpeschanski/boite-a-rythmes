/* La migration des sauvegardes après la fusion des actes 1 et 2 (2026-11-24).
 *
 * Trois choses portent un numéro d'acte dans le stockage — le curseur, les
 * étoiles des commandes, la discographie — et elles doivent bouger ENSEMBLE.
 * Ces tests tiennent la table à la main (`model/migrationActes.ts`) contre les
 * données d'aujourd'hui : un index qui pointerait sur la mauvaise étape
 * enverrait un joueur sur un écran qu'il n'a jamais vu, sans erreur. */
import { describe, it, expect } from 'vitest';
import { ACTES, NB_ACTES } from '../src/model/carriere';
import { migrerCurseur, migrerEtoiles, migrerProduction } from '../src/model/migrationActes';

const etape = (acte: number, i: number) => ACTES[acte].etapes[i];

describe('le curseur passe dans la numérotation à sept actes', () => {
  it('l’acte 0 ne bouge pas', () => {
    expect(migrerCurseur({ acte: 0, etape: 7 })).toEqual({ acte: 0, etape: 7 });
  });

  it('l’ancien acte 1 retombe sur la MÊME étape quand elle existe encore', () => {
    // Ancien index 1 = le 68, ancien 2 = le 69, ancien 5 = le 60.
    for (const [ancien, niveau] of [[1, 68], [2, 69], [5, 60]] as const) {
      const n = migrerCurseur({ acte: 1, etape: ancien });
      const e = etape(n.acte, n.etape);
      expect(e.kind === 'exercice' && e.niveau, `ancienne étape ${ancien}`).toBe(niveau);
    }
    const l = migrerCurseur({ acte: 1, etape: 9 });
    expect(etape(l.acte, l.etape).kind, 'la livraison de la sonnerie').toBe('livraison');
  });

  it('l’ancien acte 2 tombe DANS l’acte 1, après la sonnerie', () => {
    const iLivraison = ACTES[1].etapes.findIndex((e) => e.kind === 'livraison');
    for (let i = 0; i < 13; i++) {
      const n = migrerCurseur({ acte: 2, etape: i });
      expect(n.acte).toBe(1);
      expect(n.etape, `ancienne étape ${i}`).toBeGreaterThan(iLivraison);
    }
    const cmd = migrerCurseur({ acte: 2, etape: 11 });
    expect(etape(1, cmd.etape).kind, 'la commande de Kelvin').toBe('commande');
    const fin = migrerCurseur({ acte: 2, etape: 12 });
    expect(fin.etape).toBe(ACTES[1].etapes.length - 1);
  });

  it('les actes suivants reculent d’un numéro, l’étape ne bouge pas', () => {
    expect(migrerCurseur({ acte: 3, etape: 4 })).toEqual({ acte: 2, etape: 4 });
    expect(migrerCurseur({ acte: 7, etape: 2 })).toEqual({ acte: 6, etape: 2 });
    // Une carrière FINIE (curseur après le dernier acte) reste finie.
    expect(migrerCurseur({ acte: 8, etape: 0 }).acte).toBe(NB_ACTES);
  });
});

describe('les étoiles et la discographie suivent le curseur', () => {
  it('seules les clés de COMMANDE changent', () => {
    const avant = { '7': 3, '61': 2, 'c2.11': 3, 'c4.3': 1 };
    const apres = migrerEtoiles(avant);
    expect(apres['7']).toBe(3);
    expect(apres['61']).toBe(2);
    const kelvin = migrerCurseur({ acte: 2, etape: 11 });
    expect(apres[`c1.${kelvin.etape}`]).toBe(3);
    expect(apres['c3.3']).toBe(1);
    expect(Object.keys(apres)).toHaveLength(4);
  });

  it('Kelvin reçoit sa SÉRIE — sinon la sonnerie l’écraserait dans l’acte 1', () => {
    const cmd = ACTES[1].etapes.find((e) => e.kind === 'commande');
    expect(cmd?.kind === 'commande' && cmd.serie).toBe('kelvin');
    expect(migrerProduction({ acte: 2, titre: 'SANS TITRE' })).toEqual({ acte: 1, serie: 'kelvin', titre: 'SANS TITRE' });
    expect(migrerProduction({ acte: 1, titre: 'TA SONNERIE' })).toEqual({ acte: 1, titre: 'TA SONNERIE' });
    expect(migrerProduction({ acte: 5, serie: 'club', titre: 'X' })).toEqual({ acte: 4, serie: 'club', titre: 'X' });
  });
});
