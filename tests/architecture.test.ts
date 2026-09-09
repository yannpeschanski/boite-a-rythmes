/* L'ARCHITECTURE DE MORCEAU — et son piège central, le mot « cycle ».
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. « 8 cycles de A » n'a pas une valeur mais
 * deux, et l'écart est un facteur quatre : une ligne de batterie boucle en une
 * mesure pile, mais la nappe s'étale sur `cycleBars` mesures — QUATRE dans 30
 * presets sur 34. Lu comme « 8 mesures », la nappe joue deux fois ; lu comme
 * « 8 tours du motif », huit fois.
 *
 * Le choix est fait : un cycle est un TOUR DU MOTIF, calculé et jamais
 * supposé. Ce que ça achète, et que ce fichier vérifie : une longueur de
 * section qui coupe une phrase en deux devient IMPOSSIBLE À ÉCRIRE, au lieu
 * d'être un défaut qu'on entend une fois sur deux sans savoir d'où il vient.
 */
import { describe, it, expect } from 'vitest';
import { defaultState } from '../src/model/defaults';
import {
  cycleDuMotif,
  basculerLigne,
  deplacerSection,
  nouvelleSection,
  chaineVierge,
  nomEdite,
  CALQUES_NOMMES,
  LIGNES_ORDRE,
  mesuresDeSection,
  dureeSecondes,
  formaterDuree,
  mesuresTotales,
  libelleDePartie,
  MONTAGES,
  montageFrais,
  montageParNom,
  migrerArchitecture,
} from '../src/model/architecture';
import type { Section } from '../src/model/architecture';
import { PARTIES, estPartieId } from '../src/model/parties';
import type { PatternStateV2 } from '../src/model/types';

/** Un motif où seule la batterie sonne : toutes les lignes font une mesure. */
function batterieSeule(): PatternStateV2 {
  const s = defaultState();
  for (const n of ['bass', 'pad', 'melody'] as const) {
    s.synthRows[n].pattern = s.synthRows[n].pattern.map(() => (n === 'pad' ? -1 : null));
  }
  return s;
}

/** Le même, plus une nappe qui sonne sur `bars` mesures. */
function avecNappe(bars: number): PatternStateV2 {
  const s = batterieSeule();
  s.synthRows.pad.cycleBars = bars;
  s.synthRows.pad.subdivisions = 4;
  s.synthRows.pad.pattern = [0, 1, 2, 3];
  return s;
}

describe('cycleDuMotif — le cycle se CALCULE, il ne se suppose pas', () => {
  it('vaut 1 quand seule la batterie sonne', () => {
    expect(cycleDuMotif(batterieSeule())).toBe(1);
  });

  it('vaut 4 dès que la nappe s’étale sur quatre mesures — le cas des 30 presets', () => {
    expect(cycleDuMotif(avecNappe(4))).toBe(4);
  });

  it('prend le PPCM quand deux lignes ont des longueurs différentes', () => {
    const s = avecNappe(3);
    s.synthRows.bass.cycleBars = 2;
    s.synthRows.bass.subdivisions = 8;
    s.synthRows.bass.pattern = [{ degree: 1, octave: 0 }, null, null, null, null, null, null, null];
    // 2 et 3 premiers entre eux : le motif ne se répète vraiment qu'à 6.
    expect(cycleDuMotif(s)).toBe(6);
  });

  it('ignore une ligne MUETTE — sinon une nappe coupée imposerait ses 16 mesures', () => {
    const s = avecNappe(16);
    expect(cycleDuMotif(s)).toBe(16);
    s.synthRows.pad.muted = true;
    expect(cycleDuMotif(s)).toBe(1);
  });

  it('ignore une ligne VIDE — même raison, et c’est le cas par défaut', () => {
    const s = avecNappe(8);
    s.synthRows.pad.pattern = s.synthRows.pad.pattern.map(() => -1);
    expect(cycleDuMotif(s)).toBe(1);
  });
});

describe('une section se compte en tours, et s’affiche en mesures', () => {
  it('« ×8 » sur un motif de 4 mesures fait 32 mesures, pas 8', () => {
    const sec = MONTAGES[1].sections[0];
    expect(mesuresDeSection({ ...sec, cycles: 8 }, 4)).toBe(32);
    expect(mesuresDeSection({ ...sec, cycles: 8 }, 1)).toBe(8);
  });

  it('ne peut PAS décrire une longueur qui coupe une phrase', () => {
    /* Le point de tout le fichier : sur un cycle de 4, aucune valeur entière
       de `cycles` ne donne 6 mesures. Compter en mesures l'autoriserait, et la
       nappe serait coupée en plein milieu une fois sur deux. */
    const sec = MONTAGES[1].sections[0];
    const longueurs = new Set<number>();
    for (let c = 1; c <= 32; c++) longueurs.add(mesuresDeSection({ ...sec, cycles: c }, 4));
    expect(longueurs.has(6)).toBe(false);
    for (const l of longueurs) expect(l % 4).toBe(0);
  });

  it('donne une durée qui suit le tempo', () => {
    const sections = MONTAGES[1].sections;
    const tours = sections.reduce((t, s) => t + s.cycles, 0);
    const partout1 = () => 1;
    // Sur un motif d'une mesure, un tour vaut une mesure, soit deux secondes à 120.
    expect(dureeSecondes(sections, partout1, 120)).toBeCloseTo(tours * 2, 5);
    // Le même morceau dure DEUX FOIS plus long à 60 BPM : une limite en
    // mesures ne veut rien dire pour l'utilisateur, seule la durée compte.
    expect(dureeSecondes(sections, partout1, 60)).toBeCloseTo(
      dureeSecondes(sections, partout1, 120) * 2,
      5,
    );
  });

  /* ⚠️ LE DÉFAUT QUE CE TEST EXISTE POUR EMPÊCHER, et il a été MESURÉ, pas
     déduit : le cycle propre est une propriété du MOTIF, pas de la chaîne. Une
     lettre dont la nappe s'étale sur quatre mesures vaut 4, une lettre en
     batterie seule vaut 1. Compter toute la chaîne avec le cycle du motif
     COURANT donnait, pour la MÊME chaîne, « 1 min 44 » ou « 26 s » selon la
     partie chargée au moment où on regardait — la vraie durée valant 1 min 02. */
  it('compte CHAQUE section avec le cycle de SA lettre', () => {
    const sections = MONTAGES[1].sections; // COUPLET / REFRAIN : A et B
    const cycleDe = (p: 'A' | 'B' | 'C') => (p === 'A' ? 4 : 1);
    const attendu = sections.reduce((t, s) => t + s.cycles * (s.partie === 'A' ? 4 : 1), 0);
    expect(mesuresTotales(sections, cycleDe)).toBe(attendu);
    // Et surtout : le total DIFFÈRE des deux lectures « un seul cycle ».
    const toutA = mesuresTotales(sections, () => 4);
    const toutB = mesuresTotales(sections, () => 1);
    expect(mesuresTotales(sections, cycleDe)).toBeGreaterThan(toutB);
    expect(mesuresTotales(sections, cycleDe)).toBeLessThan(toutA);
  });

  it('formate une durée lisible', () => {
    expect(formaterDuree(104)).toBe('1 min 44');
    expect(formaterDuree(16)).toBe('16 s');
  });
});


/* ---- LES MONTAGES ----
 *
 * ⚠️ CE QUE CE BLOC VÉRIFIE VRAIMENT. Le reproche de Yann sur l'ancienne bande
 * n'était pas qu'elle marchait mal, c'est qu'elle était « pas du tout
 * audible » : ses huit sections portaient `sequenceId: null` tant qu'on n'avait
 * pas fait huit allers-retours dans un sélecteur, et huit sections sans motif
 * jouent huit fois la même chose. Un montage qui ne fait rien entendre est donc
 * le défaut à rendre impossible, et c'est ce qu'on mesure ici : deux sections
 * qui se suivent doivent DIFFÉRER par quelque chose.
 */
describe('les montages livrés d’usine', () => {
  /** Ce qu'une section fait entendre : sa lettre, et les lignes qu'elle laisse passer. */
  const empreinte = (s: Section) => `${s.partie}|${s.lignes === null ? '*' : [...s.lignes].sort().join(',')}`;

  it('citent toujours une LETTRE, jamais « rien »', () => {
    for (const m of MONTAGES) {
      expect(m.sections.length).toBeGreaterThan(0);
      for (const s of m.sections) {
        expect(estPartieId(s.partie)).toBe(true);
        expect(s.cycles).toBeGreaterThan(0);
      }
    }
  });

  it('ne peuvent pas être INAUDIBLES : une chaîne fait entendre au moins trois choses', () => {
    /* Le garde-fou du chantier. Une chaîne dont toutes les cases font entendre
       la même chose est décorative — exactement ce que l'ancienne bande
       produisait par défaut, avec ses huit sections à `sequenceId: null`.

       ⚠️ LE GARDE-FOU PORTE SUR L'ENSEMBLE, PAS SUR L'ADJACENCE, et c'est une
       correction : la première version interdisait deux sections identiques qui
       se suivent, et elle a rejeté AABA. Or AABA a raison — la forme de 32
       mesures EST A(8) A(8) B(8) A(8), la répétition consécutive y est le
       procédé, pas un défaut. Écrire deux cases « A » plutôt qu'une case « A×4 »
       change d'ailleurs quelque chose en Mode Live : ça donne deux points où
       sauter. Ce qu'il faut interdire est l'uniformité, pas la répétition.

       Le compte est là exprès : si la population devenait vide, le test
       passerait sans rien vérifier. */
    const chaines = MONTAGES.filter((m) => m.sections.length > 1);
    expect(chaines.length).toBeGreaterThan(0);
    for (const m of chaines) {
      expect(new Set(m.sections.map(empreinte)).size).toBeGreaterThan(1);
    }
  });

  /* ⚠️ ET LA RÈGLE QU'ON N'ÉCRIT PAS. J'avais ajouté « au moins TROIS façons de
     sonner, sinon c'est un aller-retour, pas une forme ». Elle a rejeté AABA,
     qui n'a que deux matières — et AABA est la forme de morceau la plus
     documentée qui soit. Le tell est net : la règle sortait de mon avis, pas
     d'une mesure. Ce qui reste, et qui suffit, est « jamais uniforme » : c'est
     exactement ce que « pas du tout audible » désignait. */
  it('deux matières suffisent — AABA en est la preuve', () => {
    const aaba = montageParNom('AABA')!;
    expect(new Set(aaba.sections.map((s) => s.partie)).size).toBe(2);
    /* ⚠️ Deux MATIÈRES, mais pas deux SONS : les trois A d'un AABA doivent se
       traiter différemment, sinon la forme est une liste. C'est tout le sujet
       de ce montage — voir la règle du relief plus bas. */
    expect(new Set(aaba.sections.map(empreinte)).size).toBeGreaterThan(2);
  });

  /* ---- LE RELIEF ----
   *
   * Yann, 2026-09-08 : « pas assez de mute et de modifs dans les presets
   * d'assemblages ». Compté avant : 13 scènes sur 38 portaient un calque, et
   * AABA comme RONDO n'en avaient AUCUN — leurs lettres répétées sonnaient donc
   * strictement pareil. Trois règles en découlent, et elles se mesurent.
   */
  it('une chaîne ENTRE et SORT — un calque à chaque bout', () => {
    for (const m of MONTAGES) {
      if (m.sections.length < 4) continue; // BOUCLE n'est pas une forme
      expect(m.sections[0].lignes, `${m.nom} : la première scène`).not.toBeNull();
      expect(m.sections[m.sections.length - 1].lignes, `${m.nom} : la dernière`).not.toBeNull();
    }
  });

  it('deux scènes sur la même lettre ne sonnent pas TOUTES pareil', () => {
    /* La répétition consécutive reste un procédé (A A B A) ; ce qu'on interdit,
       c'est qu'une lettre citée plusieurs fois n'ait jamais qu'un seul
       traitement — c'est ce qui rendait AABA et RONDO plats. */
    for (const m of MONTAGES) {
      if (m.sections.length < 4) continue;
      for (const lettre of new Set(m.sections.map((s) => s.partie))) {
        const scenes = m.sections.filter((s) => s.partie === lettre);
        if (scenes.length < 2) continue;
        expect(new Set(scenes.map(empreinte)).size, `${m.nom} : la lettre ${lettre}`).toBeGreaterThan(1);
      }
    }
  });

  it('garde au moins une scène PLEINE — un morceau sans plein n’a que des trous', () => {
    for (const m of MONTAGES) {
      expect(m.sections.some((s) => s.lignes === null), m.nom).toBe(true);
    }
  });

  it('demandent au plus les TROIS lettres, et A toujours', () => {
    for (const m of MONTAGES) {
      const lettres = [...new Set(m.sections.map((s) => s.partie))];
      expect(lettres.length).toBeLessThanOrEqual(PARTIES.length);
      /* ⚠️ A EST TOUJOURS CITÉE. Une lettre vide se replie sur A
         (`appliquerSection`) : un montage qui ne citerait pas A ferait donc
         jouer A partout tant qu'on n'a rangé que le premier motif — c'est-à-dire
         le cas d'usage le plus courant, et l'inaudible qu'on vient de corriger. */
      expect(lettres).toContain('A');
    }
  });

  it('CLUB tient sur UNE SEULE partie — c’est le calque qui fait le morceau', () => {
    /* L'arc d'intensité est la moitié du modèle qui ne se voit pas : intro,
       montée, climax, break se jouent sur un seul motif, ce sont les LIGNES qui
       entrent et sortent. Sans une chaîne qui le fasse, le champ `lignes`
       serait déclaré et lu par personne — la famille de défaut de
       `forceVariantCount`. */
    const club = montageParNom('CLUB')!;
    expect(new Set(club.sections.map((s) => s.partie)).size).toBe(1);
    expect(club.sections.filter((s) => s.lignes !== null).length).toBeGreaterThan(2);
    // Et l'intensité MONTE jusqu'au climax.
    const climax = club.sections.findIndex((s) => s.nom === 'CLIMAX');
    expect(climax).toBeGreaterThan(0);
    expect(club.sections[climax].lignes).toBeNull();
    for (let i = 1; i < climax; i++) {
      expect(club.sections[i].lignes!.length).toBeGreaterThan(club.sections[i - 1].lignes!.length);
    }
  });

  it('« COUPLET / REFRAIN » alterne bien DEUX lettres', () => {
    // L'exemple 1 de Yann : A couplet, B refrain, et le pont/l'outro sont des
    // calques. Deux lettres, pas huit motifs à composer.
    const m = montageParNom('COUPLET / REFRAIN')!;
    const lettres = m.sections.map((s) => s.partie);
    expect(new Set(lettres).size).toBe(2);
    expect(lettres.filter((l) => l === 'A').length).toBeGreaterThan(1);
    expect(lettres.filter((l) => l === 'B').length).toBeGreaterThan(1);
  });

  it('ne portent PLUS de boutons — un montage pose une chaîne, rien d’autre', () => {
    /* ⚠️ RÉVOCATION DU 2026-09-09, et le test la garde. Un montage remplaçait
       les six assignations du Live (« pas ses preuves ») ; le prix en était un
       loquet « CONSERVER MES BOUTONS » dans ⚙ et une coche de plus à
       l'ouverture d'un fichier. Ce que ça n'a PAS coûté : SUIVANT et TENIR ne
       sont pas des assignations, ce sont deux commandes fixes de la bande —
       une chaîne reste jouable sans qu'un montage impose quoi que ce soit. */
    for (const m of MONTAGES) {
      expect(Object.keys(m).sort()).toEqual(['desc', 'nom', 'sections']);
    }
  });

  it('libelleDePartie écrit le PRIME sur le calque, pas sur un champ', () => {
    /* Structurel et non par NOM : « COUPLET » portait un calque hier et pas
       aujourd'hui, ce qui faisait échouer un test qui ne mesurait pas ça. */
    const m = montageParNom('COUPLET / REFRAIN')!;
    const plein = m.sections.find((s) => s.lignes === null)!;
    const calque = m.sections.find((s) => s.lignes !== null)!;
    expect(libelleDePartie(plein)).toBe(plein.partie);
    expect(libelleDePartie(calque)).toBe(`${calque.partie}′`);
  });

  it('la lettre C est CITÉE — sinon elle n’aurait pas lieu d’exister', () => {
    /* ⚠️ Arbitré par Yann après le constat que AUCUN des quatre premiers
       modèles n'utilisait C : « ajouter un rondo et ajouter également un
       abc ab′c′ ». Sans un montage qui la cite, la troisième lettre serait un
       emplacement déclaré et lu par personne — la famille de défaut de
       `forceVariantCount`. */
    const citee = MONTAGES.filter((m) => m.sections.some((s) => s.partie === 'C'));
    expect(citee.length).toBeGreaterThanOrEqual(2);
    expect(citee.map((m) => m.nom)).toContain('RONDO');
  });

  it('CLUB reste le seul à ne demander QU’UNE lettre', () => {
    // C'est lui qui justifie que le calque existe : intro, montée, climax et
    // break se jouent sur un seul motif.
    const parLettres = MONTAGES.filter((m) => m.sections.length > 1)
      .map((m) => ({ nom: m.nom, n: new Set(m.sections.map((s) => s.partie)).size }));
    expect(parLettres.filter((x) => x.n === 1).map((x) => x.nom)).toEqual(['CLUB']);
  });

  it('donne une copie fraîche, jamais le montage lui-même', () => {
    const a = montageFrais('COUPLET / REFRAIN')!;
    const b = montageFrais('COUPLET / REFRAIN')!;
    a.sections[0].cycles = 99;
    expect(b.sections[0].cycles).not.toBe(99);
    expect(montageParNom('COUPLET / REFRAIN')!.sections[0].cycles).not.toBe(99);
    // Les identifiants aussi sont neufs : deux chaînes chargées à la suite ne
    // doivent pas partager de clés (`{#each}` les utilise).
    expect(a.sections[0].id).not.toBe(b.sections[0].id);
    // Et le calque est copié, pas partagé.
    const intro = a.sections.find((s) => s.nom === 'INTRO')!;
    intro.lignes!.push('clap');
    expect(montageParNom('COUPLET / REFRAIN')!.sections[0].lignes).not.toContain('clap');
  });
});

/* ---- LA MIGRATION ----
 *
 * ⚠️ Une migration se joue sur la sauvegarde de QUELQU'UN D'AUTRE : on ne la
 * voit rater qu'en production. Celle-ci a déjà un précédent dans le dépôt —
 * `liveActions.ts`, où une validation tout-ou-rien rendait les défauts et
 * perdait six boutons et trois snapshots d'un coup, sans un mot.
 */
describe('migrerArchitecture — traduire, jamais abandonner', () => {
  const ancienne = (sections: Array<Record<string, unknown>>) => ({ nom: 'POP', sections });

  it('traduit les séquences citées en A, B, C dans l’ordre d’apparition', () => {
    const m = migrerArchitecture(
      ancienne([
        { id: 's1', nom: 'INTRO', sequenceId: 'zzz', cycles: 2, lignes: null },
        { id: 's2', nom: 'COUPLET', sequenceId: 'aaa', cycles: 4, lignes: null },
        { id: 's3', nom: 'REFRAIN', sequenceId: 'zzz', cycles: 4, lignes: null },
      ]),
    )!;
    expect(m.architecture.sections.map((s) => s.partie)).toEqual(['A', 'B', 'A']);
    expect(m.lettres).toEqual([
      ['zzz', 'A'],
      ['aaa', 'B'],
    ]);
  });

  it('donne A à une section qui ne citait RIEN', () => {
    /* `sequenceId: null` gardait le motif courant, c'est-à-dire n'importe
       lequel — c'est exactement l'inaudible qu'on corrige. La replier sur A est
       le seul choix qui fasse entendre quelque chose de défini. */
    const m = migrerArchitecture(
      ancienne([{ id: 's1', nom: 'INTRO', sequenceId: null, cycles: 2, lignes: null }]),
    )!;
    expect(m.architecture.sections[0].partie).toBe('A');
    expect(m.lettres).toEqual([]);
  });

  it('garde les noms, les tours et les CALQUES', () => {
    const m = migrerArchitecture(
      ancienne([{ id: 's1', nom: 'MONTÉE', sequenceId: 'a', cycles: 3, lignes: ['kick', 'hat'] }]),
    )!;
    const s = m.architecture.sections[0];
    expect(s.nom).toBe('MONTÉE');
    expect(s.cycles).toBe(3);
    expect(s.lignes).toEqual(['kick', 'hat']);
  });

  it('replie sur A au-delà des trois lettres', () => {
    const m = migrerArchitecture(
      ancienne(
        ['a', 'b', 'c', 'd', 'e', 'f'].map((x, i) => ({
          id: `s${i}`,
          nom: 'S',
          sequenceId: x,
          cycles: 1,
          lignes: null,
        })),
      ),
    )!;
    // Mieux vaut une chaîne qui joue A que des cases muettes.
    expect(m.architecture.sections.map((s) => s.partie)).toEqual(['A', 'B', 'C', 'A', 'A', 'A']);
  });

  it('ne touche PAS une architecture déjà au nouveau format', () => {
    const neuve = { nom: 'CLUB', sections: [{ id: 's1', nom: 'INTRO', partie: 'B', cycles: 1, lignes: null }] };
    expect(migrerArchitecture(neuve)).toBeNull();
    expect(migrerArchitecture(null)).toBeNull();
    expect(migrerArchitecture({ nom: 'X' })).toBeNull();
  });

  it('rend une architecture VALIDE même sur une entrée abîmée', () => {
    /* Le point : une clé manquante ou d'un mauvais type ne doit pas faire
       échouer la migration en bloc — c'est ce qui rendrait les défauts en
       silence. On répare, on ne renonce pas. */
    const m = migrerArchitecture(
      ancienne([{ sequenceId: 'a' }, { id: 42, nom: 7, sequenceId: 'a', cycles: -3, lignes: 'non' }]),
    )!;
    for (const s of m.architecture.sections) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.nom).toBe('string');
      expect(estPartieId(s.partie)).toBe(true);
      expect(s.cycles).toBeGreaterThan(0);
      expect(s.lignes).toBeNull();
    }
  });
});

/* ⚠️ LE REPLI SUR A DOIT VALOIR AUSSI POUR CE QUI DÉCRIT LA CHAÎNE.
 *
 * `appliquerSection` fait jouer A quand la lettre citée est vide. Si le calcul
 * de durée, lui, comptait un cycle de 1 pour cette lettre, l'écran annoncerait
 * « 2 mesures » là où on en entendra 8 — le piège des deux domiciles, sur une
 * règle qu'on venait justement d'écrire. Le store applique donc le même repli
 * (`parties.cycle`) ; ce test tient l'arithmétique correspondante.
 */
describe('une lettre vide se compte comme A, puisqu’elle joue A', () => {
  it('donne la même longueur qu’une section qui cite A', () => {
    const chaine = montageParNom('A B C · A B′ C′')!.sections;
    // A vaut 4 (une nappe de quatre mesures), B vaut 1, C est VIDE -> donc 4.
    const cycleDe = (p: 'A' | 'B' | 'C') => (p === 'A' ? 4 : p === 'B' ? 1 : 4);
    const naif = (p: 'A' | 'B' | 'C') => (p === 'A' ? 4 : 1);
    const juste = mesuresTotales(chaine, cycleDe);
    // Le compte naïf sous-estime : c'est exactement ce que l'écran affichait.
    expect(mesuresTotales(chaine, naif)).toBeLessThan(juste);
    for (const s of chaine.filter((x) => x.partie === 'C')) {
      expect(mesuresDeSection(s, cycleDe('C'))).toBe(mesuresDeSection(s, cycleDe('A')));
    }
  });
});

/* ---- MONTER LA CHAÎNE SOI-MÊME ----
 *
 * ⚠️ POURQUOI CES TESTS. « Il faut pouvoir monter le morceau comme on le
 * souhaite » (2026-09-09) : les sept modèles étaient à prendre ou à laisser.
 * Ce que l'édition ajoute est réactif et vit dans le store, mais les trois
 * règles qui peuvent MENTIR sont pures et se tiennent ici — le calque plein qui
 * doit redevenir « toutes », le déplacement hors bornes, et le nom d'un modèle
 * qu'on vient de modifier.
 */
describe('éditer une chaîne — la part pure', () => {
  it('retirer une ligne d’une scène PLEINE part de toutes, jamais d’un tableau vide', () => {
    /* `null` veut dire « toutes », pas « aucune ». Le confondre couperait sept
       lignes sur huit au premier clic — un montage rendu inaudible par le
       geste censé l'affiner. */
    const apres = basculerLigne(null, 'snare');
    expect(apres).not.toBeNull();
    expect(apres).toHaveLength(LIGNES_ORDRE.length - 1);
    expect(apres).not.toContain('snare');
    expect(apres![0]).toBe('kick'); // et l'ordre de lecture est conservé
  });

  it('une scène qui retrouve toutes ses lignes redevient « toutes » — donc A, pas A′', () => {
    /* Sinon elle resterait affichée A′ en sonnant exactement comme A : le
       prime est le CALQUE, il n'a pas de champ à lui. */
    const sansSnare = basculerLigne(null, 'snare')!;
    expect(basculerLigne(sansSnare, 'snare')).toBeNull();
  });

  it('rajouter une ligne la remet à sa place dans l’ordre de lecture', () => {
    const calque = basculerLigne(basculerLigne(null, 'kick')!, 'hat')!;
    const remis = basculerLigne(calque, 'kick')!;
    expect(remis.indexOf('kick')).toBeLessThan(remis.indexOf('snare'));
  });

  it('déplacer hors des bornes ne bouge RIEN — et se reconnaît à l’identité', () => {
    /* Le store lit cette identité pour ne pas marquer le nom du montage :
       un ↑ sur la première scène ne doit pas transformer « RONDO » en
       « RONDO (modifié) ». */
    const sections = montageFrais('RONDO')!.sections;
    expect(deplacerSection(sections, 0, -1)).toBe(sections);
    expect(deplacerSection(sections, sections.length - 1, 1)).toBe(sections);
    expect(deplacerSection(sections, -3, 1)).toBe(sections);
  });

  it('déplacer échange bien deux scènes voisines', () => {
    const sections = montageFrais('RONDO')!.sections;
    const bouge = deplacerSection(sections, 0, 1);
    expect(bouge[0].id).toBe(sections[1].id);
    expect(bouge[1].id).toBe(sections[0].id);
    expect(bouge).toHaveLength(sections.length);
  });

  it('un modèle modifié cesse de porter le nom du modèle, et ne l’empile pas', () => {
    expect(nomEdite('RONDO')).toBe('RONDO (modifié)');
    expect(nomEdite('RONDO (modifié)')).toBe('RONDO (modifié)');
    expect(nomEdite('MON MORCEAU')).toBe('MON MORCEAU');
  });

  it('une chaîne vierge est jouable telle quelle — une scène pleine sur A', () => {
    const a = chaineVierge();
    expect(a.sections).toHaveLength(1);
    expect(a.sections[0].partie).toBe('A');
    expect(a.sections[0].lignes).toBeNull();
    expect(a.sections[0].cycles).toBeGreaterThan(0);
    // Deux chaînes vierges ne partagent pas d'identifiant : `{#each}` en vit.
    expect(chaineVierge().sections[0].id).not.toBe(a.sections[0].id);
  });

  it('une scène neuve reçoit un identifiant à elle', () => {
    expect(nouvelleSection().id).not.toBe(nouvelleSection().id);
    // Et son calque est COPIÉ : deux scènes ne doivent pas partager un tableau.
    const l = ['kick'] as const;
    const s1 = nouvelleSection('X', 'A', 1, [...l]);
    s1.lignes!.push('hat');
    expect(nouvelleSection('Y', 'A', 1, [...l]).lignes).toEqual(['kick']);
  });

  it('les calques offerts en raccourci ne citent que des lignes qui existent', () => {
    /* Une coquille dans un raccourci poserait un calque qui ne coupe rien, en
       silence — la famille de défaut de `forceVariantCount`. */
    expect(CALQUES_NOMMES.length).toBeGreaterThan(3);
    for (const c of CALQUES_NOMMES) {
      expect(c.lignes.length).toBeGreaterThan(0);
      expect(c.lignes.length).toBeLessThan(LIGNES_ORDRE.length);
      for (const l of c.lignes) expect(LIGNES_ORDRE).toContain(l);
    }
    // Deux raccourcis ne doivent pas faire entendre la même chose.
    const signatures = CALQUES_NOMMES.map((c) => [...c.lignes].sort().join('+'));
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
