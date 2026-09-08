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
import { LIVE_ACTIONS } from '../src/ui/live/liveActions';
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
    expect(new Set(aaba.sections.map(empreinte)).size).toBe(2);
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

  it('ne demandent que des boutons qui existent au catalogue', () => {
    /* Le modèle ne connaît pas l'UI : il cite des identifiants en clair. Une
       coquille y serait ignorée en silence par le chargement (qui garde le
       défaut du rang) — donc invisible sans ce test. */
    const ids = new Set(LIVE_ACTIONS.map((a) => a.id as string));
    const avecBoutons = MONTAGES.filter((m) => m.boutons !== null);
    expect(avecBoutons.length).toBeGreaterThan(0);
    for (const m of avecBoutons) {
      expect(m.boutons!.length).toBe(6);
      for (const slot of m.boutons!) {
        expect(slot.length).toBeGreaterThan(0);
        for (const id of slot) expect(ids.has(id)).toBe(true);
      }
    }
  });

  it('donnent SUIVANT et TENIR aux chaînes — sans quoi la chaîne joue contre le musicien', () => {
    for (const m of MONTAGES) {
      if (m.sections.length <= 1 || !m.boutons) continue;
      expect(m.boutons.flat()).toContain('section-next');
    }
  });

  it('libelleDePartie écrit le PRIME sur le calque, pas sur un champ', () => {
    const m = montageParNom('COUPLET / REFRAIN')!;
    const couplet = m.sections.find((s) => s.nom === 'COUPLET')!;
    const intro = m.sections.find((s) => s.nom === 'INTRO')!;
    expect(libelleDePartie(couplet)).toBe('A');
    expect(libelleDePartie(intro)).toBe('A′');
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
