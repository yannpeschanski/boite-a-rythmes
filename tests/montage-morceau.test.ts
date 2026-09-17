/* MONTER LE MORCEAU — l'acte 6 apprivoise le module de montage.
 *
 * Demande de Yann (2026-09-17) : *« 1er morceau : modèle couplet/refrain ;
 * 2ème morceau : ABB' ABB' A' outro ; 3ème morceau : Rondo. C'est le moment
 * dans le jeu où on apprivoise le module de montage de morceau. »*
 *
 * Deux arbitrages pris avec, et tenus ici : le jeu RANGE les lettres et le
 * joueur MONTE (il ne refait pas à la main ce qu'il vient de livrer), et on
 * monte SANS ENTENDRE — une chaîne ne se joue que dans le Mode Live, fermé
 * jusqu'au concert. Monter est un geste de préparation.
 */
import { describe, it, expect } from 'vitest';
import { ACTES, type Etape, type EtapeMontage } from '../src/model/carriere';
import { montageParNom, MONTAGES } from '../src/model/architecture';

const acte6 = () => ACTES.find((a) => a.id === 6)!;
const montages = (): EtapeMontage[] =>
  ACTES.flatMap((a) => a.etapes.filter((e): e is EtapeMontage => e.kind === 'montage'));

describe('l’acte 6 monte ses trois morceaux', () => {
  it('⚠️ un montage par morceau, et les trois modèles demandés', () => {
    expect(montages().map((m) => m.modele)).toEqual(['COUPLET / REFRAIN', 'A B B′', 'RONDO']);
  });

  it('chaque modèle cité EXISTE dans le catalogue', () => {
    /* ⚠️ Un modèle introuvable ne lève rien : `montageFrais` rend `null` et le
     * joueur cherche dans le sélecteur un nom qui n'y est pas. Une coquille se
     * paierait donc en jeu, sur le seul écran qui n'a rien à vérifier. */
    for (const m of montages()) expect(montageParNom(m.modele), `« ${m.modele} »`).toBeTruthy();
  });

  /* ⚠️ LE TEST QUI COMPTE. Une section cite une LETTRE, et une lettre vide se
   * replie sur A (`appliquerSection`) : un modèle qui demande trois matières
   * posé sur deux lettres rangées jouerait la première à la place de la
   * troisième, sans erreur, sans voyant, et en sonnant presque juste. C'est le
   * défaut le plus cher du montage et il ne se voit qu'en écoutant. */
  it('⚠️ un modèle ne réclame jamais plus de lettres que l’étape n’en range', () => {
    for (const m of montages()) {
      const modele = montageParNom(m.modele)!;
      const demandees = new Set(modele.sections.map((s) => s.partie));
      const rangees = new Set(m.boucles.map((b) => b.partie));
      for (const l of demandees)
        expect(rangees, `« ${m.entete} » : le modèle joue ${l}, que rien ne range`).toContain(l);
    }
  });

  it('⚠️ et il va CRESCENDO : le rondo arrive avec la troisième boucle', () => {
    /* Le crescendo des formes est le même que celui des boucles — 2, 2, 3. Le
     * rondo est le seul montage du catalogue qui demande TROIS matières, donc
     * le seul qu'un morceau à deux boucles ne pourrait pas remplir : l'ordre
     * n'est pas un goût, il est une contrainte. */
    const tailles = montages().map((m) => new Set(m.boucles.map((b) => b.partie)).size);
    expect(tailles).toEqual([2, 2, 3]);
    for (let i = 1; i < tailles.length; i++)
      expect(tailles[i], `le montage ${i + 1} demande moins que le précédent`).toBeGreaterThanOrEqual(
        tailles[i - 1],
      );
  });

  it('les boucles rangées ont été LIVRÉES avant, dans le même acte', () => {
    /* Une série qui n'existe pas est sautée en silence par `ouvrirMontage` : la
     * lettre reste vide, et le modèle s'y replie sur A. Même piège que
     * ci-dessus, par l'autre bout. */
    for (const a of ACTES) {
      const livrees: string[] = [];
      for (const e of a.etapes) {
        if (e.kind === 'commande' && e.serie) livrees.push(e.serie);
        if (e.kind !== 'montage') continue;
        expect(e.depuisLActe ?? a.id, `« ${e.entete} » : un montage d’un autre acte`).toBe(a.id);
        for (const b of e.boucles)
          expect(livrees, `« ${e.entete} » : « ${b.serie} » n’est pas encore livrée`).toContain(
            b.serie,
          );
        // Deux boucles sous la même lettre : la seconde écrase la première.
        const lettres = e.boucles.map((b) => b.partie);
        expect(new Set(lettres).size, `« ${e.entete} » : deux boucles sous la même lettre`).toBe(
          lettres.length,
        );
      }
    }
  });

  it('⚠️ un montage suit la DERNIÈRE boucle de son morceau', () => {
    /* Posé au milieu, il monterait un morceau dont une boucle n'existe pas
     * encore — et la règle du dessus le laisserait passer, puisqu'elle ne
     * regarde que les séries qu'il cite. */
    const etapes = acte6().etapes;
    for (let i = 0; i < etapes.length; i++) {
      const e = etapes[i];
      if (e.kind !== 'montage') continue;
      const morceau = e.boucles[0].serie.split('-')[0];
      const suivantes = etapes.slice(i + 1);
      const oubliee = suivantes.find(
        (x: Etape) => x.kind === 'commande' && (x.serie ?? '').startsWith(`${morceau}-`),
      );
      expect(oubliee, `« ${e.entete} » monte avant la fin de son morceau`).toBeUndefined();
    }
  });

  /* ⚠️ C'EST LE JOUEUR QUI CHARGE LE MODÈLE, donc l'écran doit le NOMMER.
   * Le modèle vit dans un sélecteur à l'autre bout de l'onglet Production : un
   * nom lu une seule fois sur l'écran précédent ne se retrouve pas. Même règle
   * que « sur cette surface, ce qui n'est pas écrit n'existe pas ». */
  it('⚠️ la consigne de l’Atelier NOMME le modèle à charger', () => {
    for (const m of montages()) {
      expect(m.dansLAtelier.trim(), `« ${m.entete} »`).not.toBe('');
      expect(m.dansLAtelier, `« ${m.entete} » ne dit pas quel modèle prendre`).toContain(m.modele);
    }
  });

  it('⚠️ n’ouvre AUCUN module — monter est un geste de préparation', () => {
    /* Le Mode Live reste fermé jusqu'au concert (arbitrage du 2026-09-16), et
     * l'Atelier comme la Production sont ouverts depuis l'acte 4. Un montage
     * qui prêterait le Live rendrait à l'acte 6 la console qu'on vient de lui
     * retirer — par la porte de service. */
    for (const m of montages())
      expect(Object.keys(m), `« ${m.entete} »`).not.toContain('modulesRequis');
  });

  it('⚠️ et l’acte 6 ne NOMME toujours pas le Mode Live', () => {
    const texte = montages()
      .map((m) => [m.entete, m.bouton, m.dansLAtelier, ...m.lignes].join(' '))
      .join(' ')
      .toLowerCase();
    expect(texte, 'un montage nomme le Mode Live').not.toContain('mode live');
  });
});

/* ⚠️ LE RAPPEL DE L'ACTE 7 EST MONTÉ EN CLUB — *« lorsqu'on demande le jingle,
 * il faut appliquer le modèle Club »* (2026-09-17). Il tenait sur BOUCLE, ce
 * qui était vrai du texte et faux de la soirée : une salle qui reprend douze
 * secondes en choeur demande une montée, un break et une relance. */
describe('⚠️ le jingle du rappel se monte en CLUB', () => {
  it('le modèle tient sur UNE lettre — c’est ce qui le rend jouable ici', () => {
    const club = montageParNom('CLUB')!;
    expect(club).toBeTruthy();
    expect(new Set(club.sections.map((s) => s.partie))).toEqual(new Set(['A']));
    /* Et il a du relief : sept scènes sur une seule matière, tout venant des
     * calques. Sans ça « monter en club » ne serait qu'une boucle plus longue. */
    expect(club.sections.length).toBeGreaterThan(4);
    expect(club.sections.filter((s) => s.lignes).length, 'aucun calque').toBeGreaterThan(2);
  });

  it('c’est bien lui que la scène pose', () => {
    const rappel = ACTES.find((a) => a.id === 7)!.etapes.filter((e) => e.kind === 'scene')[1];
    expect(rappel.kind === 'scene' && rappel.montage).toBe('CLUB');
  });

  it('⚠️ et sur un morceau d’UNE boucle, il n’y avait que deux candidats', () => {
    /* Deux modèles du catalogue ne citent qu'une lettre, et c'est ce qui rend
     * l'arbitrage lisible : BOUCLE (une scène, aucun relief) et CLUB (sept
     * scènes, tout le relief venant des calques). Le choix n'était pas entre
     * « plat » et « mieux », il était entre « ça tourne » et « ça se conduit ».
     * Si un troisième apparaît, la question mérite d'être reposée. */
    const uneLettre = MONTAGES.filter((m) => new Set(m.sections.map((s) => s.partie)).size === 1);
    expect(uneLettre.map((m) => m.nom).sort()).toEqual(['BOUCLE', 'CLUB']);
    expect(montageParNom('BOUCLE')!.sections.length, 'BOUCLE a gagné du relief').toBe(1);
  });
});
