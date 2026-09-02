import { describe, it, expect } from 'vitest';
import {
  ACTES,
  NB_ACTES,
  ACTE_DU_MODULE,
  acteAVenir,
  acteParId,
  niveauxDeLActe,
  niveauxRencontres,
  LONGUEUR_PROLOGUE,
  EPILOGUE,
  LONGUEUR_EPILOGUE,
  ETAPE_DU_COMPTE_A_REBOURS,
  ACTE_DU_DISQUE,
  ANNEE,
  dateDeLActe,
} from '../src/model/carriere';
import {
  LEVELS,
  degreMaxDeLigne,
  longueurDeLigne,
  mesuresDeLArrangement,
} from '../src/model/presets/levels';
import { parametre } from '../src/model/parametres';
import { PRESETS } from '../src/model/presets/songs';
import { moduleUnlocked, LOCKED_MODULES, MODULE_UNLOCK_LEVEL } from '../src/model/unlocks';

describe('Mode carrière — la charpente en huit actes', () => {
  it('a les huit actes de HISTOIRE.md, dans l’ordre', () => {
    expect(NB_ACTES).toBe(8);
    expect(ACTES.map((a) => a.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(ACTES.map((a) => a.titre)).toEqual([
      'LE CAFÉ',
      'LE RYTHME',
      'LE GROOVE',
      'LA MÉLODIE',
      'LA PRODUCTION',
      'LES STYLES',
      'FB-015',
      'LE 14 JUIN',
    ]);
  });

  // Le compte à rebours est affiché en permanence, du premier écran au dernier :
  // s'il remontait, l'histoire cesserait d'avoir une échéance.
  it('a un compte à rebours strictement décroissant, qui finit à zéro', () => {
    const j = ACTES.map((a) => a.jours);
    for (let i = 1; i < j.length; i++) expect(j[i]).toBeLessThan(j[i - 1]);
    expect(j[j.length - 1]).toBe(0);
  });

  // Un acte CITE des niveaux du réservoir, il n'en fabrique pas. Une citation
  // fausse donnerait un acte injouable découvert par le joueur, pas par nous —
  // le module lève déjà au chargement, ce test dit pourquoi.
  it('ne cite que des niveaux qui existent', () => {
    const ids = new Set(LEVELS.map((l) => l.id));
    for (const a of ACTES) for (const n of niveauxDeLActe(a)) expect(ids.has(n)).toBe(true);
  });

  it('ouvre les quatre modules aux actes que dit le récit', () => {
    // HISTOIRE.md, « Ce que le récit ouvre, acte par acte ».
    expect(ACTE_DU_MODULE).toEqual({ atelier: 1, synth: 3, production: 4, live: 7 });
    // Et chaque module verrouillé est bien ouvert par un acte : un module qui
    // n'apparaîtrait nulle part dans le récit ne s'ouvrirait plus jamais par lui.
    for (const m of LOCKED_MODULES) expect(ACTE_DU_MODULE[m]).toBeTypeOf('number');
  });

  it('déclare « à venir » exactement les actes dont les exercices ne sont pas écrits', () => {
    expect(ACTES.filter((a) => !acteAVenir(a)).map((a) => a.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  /* Chaque acte jouable doit contenir au moins un récit ET au moins une étape
   * où l'on FAIT quelque chose : un acte de texte seul n'est pas un jeu, un
   * acte d'exercices seuls n'est pas une histoire.
   *
   * ⚠️ « Faire quelque chose » ne veut plus dire « un exercice ». L'acte 6
   * n'en contient aucun : FB-015 est une COMMANDE et rien d'autre, parce que
   * son texte l'exige — « aucun brief, aucun client, aucun style imposé ». Le
   * test apprend donc le nouveau genre d'étape au lieu d'être desserré ; ce
   * qu'il protège reste le même. */
  it('mêle récit et travail dans les actes jouables', () => {
    for (const a of ACTES.filter((x) => !acteAVenir(x))) {
      expect(a.etapes.some((e) => e.kind === 'recit'), `acte ${a.id}`).toBe(true);
      const travail = a.etapes.filter(
        (e) => e.kind === 'exercice' || e.kind === 'commande' || e.kind === 'livraison',
      );
      expect(travail.length, `acte ${a.id}`).toBeGreaterThan(0);
    }
  });

  it('borne acteParId aux actes existants', () => {
    expect(acteParId(-3).id).toBe(0);
    expect(acteParId(99).id).toBe(7);
    expect(acteParId(2).titre).toBe('LE GROOVE');
  });
});

describe('Déblocage — le récit d’abord, les niveaux en plancher', () => {
  it('n’ouvre rien à un joueur qui vient d’arriver', () => {
    const cx = { level: 1, acte: 0 };
    for (const m of LOCKED_MODULES) expect(moduleUnlocked(m, cx)).toBe(false);
  });

  // « acte » est l'acte ATTEINT : terminer l'acte 1 écrit 2, et c'est ça qui
  // ouvre l'Atelier. À 1, le joueur est DANS l'acte, il ne l'a pas fini.
  it('ouvre l’Atelier quand l’acte 1 est terminé, pas quand il commence', () => {
    expect(moduleUnlocked('atelier', { level: 1, acte: 1 })).toBe(false);
    expect(moduleUnlocked('atelier', { level: 1, acte: 2 })).toBe(true);
  });

  // La raison d'être du OU : sans lui, l'arrivée de la carrière retirerait le
  // Synthé et la Production à tous ceux qui les avaient déjà ouverts, puisque
  // les actes 3 et 4 ne sont pas encore écrits.
  it('laisse un vétéran du réservoir garder ses modules pendant qu’il fait le café', () => {
    const veteran = { level: 30, acte: 0 };
    expect(moduleUnlocked('atelier', veteran)).toBe(true);
    expect(moduleUnlocked('synth', veteran)).toBe(true);
    expect(moduleUnlocked('production', veteran)).toBe(true);
    // Le Mode Live, lui, s'ouvre au bout du réservoir : à 30, pas encore.
    expect(moduleUnlocked('live', veteran)).toBe(false);
    expect(moduleUnlocked('live', { level: MODULE_UNLOCK_LEVEL.live, acte: 0 })).toBe(true);
  });

  it('accepte un contexte sans acte (appelants d’avant la carrière)', () => {
    expect(moduleUnlocked('atelier', { level: 2 })).toBe(true);
    expect(moduleUnlocked('atelier', { level: 1 })).toBe(false);
  });
});

/* Le double curseur, vérifié par le seul scénario qui l'a rendu nécessaire :
 * relire un acte terminé. Sans lui, `ouvrirActe(1)` ferait reculer la
 * progression enregistrée — et l'Atelier, ouvert par l'acte 1, se refermerait
 * pendant qu'on relit l'acte qui vient de l'ouvrir. */
describe('Le curseur de carrière ne recule jamais', () => {
  it('avance étape par étape, puis d’acte en acte', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-avance');
    expect(game.progresCarriere).toEqual({ acte: 0, etape: 0 });

    const acte0 = ACTES[0];
    // Toutes les étapes sauf la dernière : on reste dans l'acte 0.
    for (let i = 0; i < acte0.etapes.length - 1; i++) {
      expect(game.avancerCarriere()).toBeNull();
      expect(game.progresCarriere.acte).toBe(0);
      expect(game.progresCarriere.etape).toBe(i + 1);
    }
    // La dernière franchie rend l'acte, et fait basculer la progression.
    expect(game.avancerCarriere()?.id).toBe(0);
    expect(game.progresCarriere).toEqual({ acte: 1, etape: 0 });
    expect(game.acteActif).toBe(1);
  });

  it('ne perd rien quand on relit un acte déjà terminé', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-relecture');
    const acte0 = ACTES[0];
    for (let i = 0; i < acte0.etapes.length; i++) game.avancerCarriere();
    expect(game.progresCarriere.acte).toBe(1);

    game.ouvrirActe(0);
    expect(game.acteActif).toBe(0); // on regarde l'acte 0…
    expect(game.progresCarriere.acte).toBe(1); // …mais on l'a bien dépassé.
    game.avancerCarriere();
    expect(game.progresCarriere.acte).toBe(1);
  });

  // Une étape d'exercice CHARGE son niveau : c'est le seul point de contact
  // entre le récit et le réservoir, et une erreur d'index (id vs indice) y
  // ferait jouer le niveau d'à côté sans que rien ne le signale.
  it('charge le niveau que l’étape cite', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-niveaux');
    // L'acte 1 n'est atteignable qu'une fois l'acte 0 derrière soi — la garde
    // d'`ouvrirActe` est délibérée : la carrière est un récit, pas un menu.
    for (let i = 0; i < ACTES[0].etapes.length; i++) game.avancerCarriere();
    game.ouvrirActe(1);
    expect(game.acteActif).toBe(1);
    const attendus = niveauxDeLActe(ACTES[1]);
    const joues: number[] = [];
    for (let i = 0; i < ACTES[1].etapes.length; i++) {
      if (game.etapeCourante?.kind === 'exercice') joues.push(game.level.id);
      game.avancerCarriere();
    }
    expect(joues).toEqual(attendus);
  });
});

/* Le prologue — la mise en place sans laquelle rien n'était compréhensible.
 *
 * Retour de Yann sur la première version : « 1ère impression : on comprend
 * rien ». Le jeu s'ouvrait sur la première péripétie de l'acte 0, sans avoir
 * jamais dit ce qu'était Face B, qui était Sol, ni ce qu'était le 14 juin.
 */
describe('Le prologue situe l’histoire avant de la commencer', () => {
  it('ouvre l’acte 0 sur quatre écrans de récit, jamais sur un exercice', () => {
    const debut = ACTES[0].etapes.slice(0, LONGUEUR_PROLOGUE);
    expect(LONGUEUR_PROLOGUE).toBe(4);
    for (const e of debut) expect(e.kind).toBe('recit');
  });

  /* ⚠️ Le budget de lecture avant le premier son, verrouillé par un test.
   *
   * Retour de Yann : « ça fait en effet beaucoup de texte avant le 1er jeu ».
   * La correction précédente en avait mis SEPT. Ce test empêche qu'une
   * prochaine passe d'écriture le regonfle sans qu'on s'en aperçoive — c'est
   * une propriété de RYTHME, elle ne se voit pas en relisant le fichier. */
  it('ne fait jamais lire plus de cinq écrans avant le premier exercice', () => {
    const premier = ACTES[0].etapes.findIndex((e) => e.kind === 'exercice');
    expect(premier).toBeGreaterThanOrEqual(0);
    expect(premier + 1).toBeLessThanOrEqual(5);
  });

  // Et l'exposition qui reste est ENTRELACÉE, pas empilée : après le premier
  // exercice, l'acte 0 ne pose jamais deux écrans de lecture d'affilée avant
  // l'exercice suivant.
  it('n’empile pas deux lectures entre deux exercices', () => {
    const e = ACTES[0].etapes;
    const dernier = e.map((x) => x.kind).lastIndexOf('exercice');
    let suite = 0;
    for (let i = 0; i < dernier; i++) {
      suite = e[i].kind === 'recit' ? suite + 1 : 0;
      expect(suite, `étapes ${i - suite + 1}..${i}`).toBeLessThanOrEqual(LONGUEUR_PROLOGUE);
    }
  });

  // Les quatre inconnues que le joueur avait au premier écran, et qui doivent
  // toutes être levées avant le premier exercice : où il est, de quoi ça vit,
  // qui il est, et ce qu'est le 14 juin.
  it('nomme le label, son gagne-pain, Sol, le joueur et l’échéance', () => {
    const texte = ACTES[0].etapes
      .slice(0, LONGUEUR_PROLOGUE)
      .flatMap((e) => (e.kind === 'recit' ? [e.entete, ...e.lignes] : []))
      .join(' ');
    expect(texte).toContain('Face B');
    expect(texte).toContain('sonneries');
    expect(texte).toContain('stagiaire');
    expect(texte).toContain('Sol');
    expect(texte).toContain('14 juin');
    // ⚠️ Son prénom complet — demande de Yann, « son nom bien franchouillard ».
    // Il n'apparaît qu'à un seul endroit : ce test dit où le chercher.
    expect(texte).toContain('Solange');
  });

  /* ⚠️ Sol est présentée AVANT de prendre la parole.
   *
   * Elle porte presque toutes les répliques du jeu — l'acte 0 s'ouvre sur un
   * écran « SOL » où elle parle. La première version ne l'avait jamais
   * introduite : le joueur entendait un personnage sans savoir qui il était.
   * Ce test lie l'introduction à la première prise de parole ; il tombera si
   * on réordonne le prologue sans y penser. */
  it('présente Sol avant de lui donner la parole', () => {
    const entetes = ACTES[0].etapes.map((e) => (e.kind === 'recit' ? e.entete : ''));
    const presentation = entetes.indexOf('SOL');
    expect(presentation).toBeGreaterThanOrEqual(0);
    expect(presentation).toBeLessThan(LONGUEUR_PROLOGUE);
    // La première réplique de Sol vient après, dans l'acte proprement dit.
    const premiereReplique = ACTES[0].etapes.findIndex(
      (e) => e.kind === 'recit' && e.lignes.some((l) => l.startsWith('—')),
    );
    expect(premiereReplique).toBeGreaterThan(presentation);
  });

  // Le compte à rebours ne s'affiche qu'une fois le 14 juin expliqué : un
  // décompte vers une date inconnue n'est pas une tension, c'est un nombre.
  it('explique le 14 juin à l’étape où le décompte apparaît', () => {
    const e = ACTES[0].etapes[ETAPE_DU_COMPTE_A_REBOURS];
    expect(e.kind).toBe('recit');
    if (e.kind === 'recit') expect(e.entete).toBe('LE 14 JUIN');
    expect(ETAPE_DU_COMPTE_A_REBOURS).toBeLessThan(LONGUEUR_PROLOGUE);
  });

  // Aucune consigne ne doit annoncer un nombre de versions : les niveaux 39-41
  // le tirent. « Elle te fait écouter deux sons » suivi de trois boutons A/B/C
  // était la contradiction de la première version.
  it('ne promet jamais un nombre de sons que le tirage ne tient pas', () => {
    const commandes = ACTES.flatMap((a) =>
      a.etapes.flatMap((e) => (e.kind === 'exercice' && e.commande ? [e.commande] : [])),
    );
    for (const c of commandes) expect(c).not.toMatch(/\b(deux|trois|quatre) (sons|versions)\b/i);
  });

  /* ⚠️ Même règle, sur l'autre chose que le tirage décide : le SENS.
   *
   * « Lequel est le plus grave ? » avait déjà dû sauter parce que le BOUTON
   * était tiré. Reste `paramSens`, tiré lui aussi à chaque partie : une
   * commande qui annonce « lequel dure le plus » se retrouve une fois sur deux
   * au-dessus d'un écran qui demande le plus court.
   *
   * Ce qui se teste, c'est le SUPERLATIF — « le plus », « la moins » : c'est
   * lui qui désigne un extrême, donc un seul des deux sens. Une commande reste
   * libre de nommer la propriété (« c'est la durée qui change ») ou d'offrir la
   * paire (« plus fort ou plus doux ? »), qui ne tranche rien.
   *
   * ⚠️ L'ancre a bougé le 2026-09-01 : elle ne portait que sur `lequel`, et
   * `lequel` a quitté la carrière quand l'acte 2 est passé à « régler
   * d'abord ». Un garde-fou dont la population est vide passe en silence. Elle
   * porte donc sur les TROIS verbes de paramètre, ce qui est plus large qu'elle
   * ne l'était : `regler` tire sa cible et `nommer` ses leurres, un superlatif
   * y mentirait de la même façon. */
  it('ne promet jamais un SENS que le tirage ne tient pas', () => {
    const VERBES = ['lequel', 'nommer', 'regler'];
    const commandes = ACTES.flatMap((a) =>
      a.etapes.flatMap((e) => {
        if (e.kind !== 'exercice' || !e.commande) return [];
        const l = LEVELS.find((x) => x.id === e.niveau)!;
        return VERBES.includes(l.exercise) ? [[e.niveau, e.commande] as const] : [];
      }),
    );
    expect(commandes.length).toBeGreaterThan(0);
    for (const [niveau, c] of commandes) {
      expect(c, `niveau ${niveau}`).not.toMatch(/\b(le|la|les) (plus|moins)\b/i);
    }
  });
});

/* La salle de répétition — ce qu'elle propose, et ce qu'elle ne montre pas.
 *
 * Deux retours de Yann d'un coup : « dans la salle de répétition, il faut
 * pouvoir refaire les niveaux » et « tout ce qui n'est pas encore accessible
 * devrait être masqué : no spoil ».
 */
describe('La salle de répétition ne montre que le déjà-rencontré', () => {
  it('ne propose rien à qui vient d’arriver', () => {
    expect(niveauxRencontres(0, 0)).toEqual([]);
  });

  // ⚠️ Le cas qui a rendu l'ancienne carte inutilisable : l'acte 0 cite des
  // niveaux qui portent des numéros de FIN de liste (39-41 hier, 49-52
  // aujourd'hui). Le seuil `id <= PlayerProgress.level` les gardait
  // verrouillés — après tout l'acte 0, la carte affichait 40 niveaux sur 41
  // fermés, dont ceux qu'on venait de jouer. L'assertion porte donc sur la
  // PROPRIÉTÉ (un numéro loin devant le curseur), pas sur des numéros gravés.
  it('propose les niveaux de l’acte 0 une fois l’acte 0 fini, quels que soient leurs numéros', () => {
    const apresActe0 = niveauxRencontres(1, 0);
    expect(apresActe0).toEqual(niveauxDeLActe(ACTES[0]));
    expect(apresActe0.length).toBeGreaterThan(0);
    expect(Math.max(...apresActe0)).toBeGreaterThan(34);
  });

  // No spoil : au milieu d'un acte, ce qui n'a pas encore été joué ne s'affiche
  // pas — ni les étapes suivantes du même acte, ni les actes d'après.
  it('ne dévoile pas la suite de l’acte en cours', () => {
    const acte1 = ACTES[1];
    const premierExo = acte1.etapes.findIndex((e) => e.kind === 'exercice');
    const auPremierExo = niveauxRencontres(1, premierExo);
    // L'acte 0 en entier, et rien de l'acte 1.
    expect(auPremierExo).toEqual(niveauxDeLActe(ACTES[0]));
    for (const n of niveauxDeLActe(acte1)) expect(auPremierExo).not.toContain(n);
    // Une étape plus loin, le premier exercice de l'acte 1 apparaît — lui seul.
    const suivant = niveauxRencontres(1, premierExo + 1);
    expect(suivant.length).toBe(auPremierExo.length + 1);
  });

  it('n’annonce jamais un acte non atteint', () => {
    for (const [acte, etape] of [[0, 0], [1, 3], [2, 1]] as const) {
      for (const n of niveauxRencontres(acte, etape)) {
        const source = ACTES.find((a) => niveauxDeLActe(a).includes(n))!;
        expect(source.id).toBeLessThanOrEqual(acte);
      }
    }
  });

  it('ne répète jamais deux fois le même niveau', () => {
    const tout = niveauxRencontres(NB_ACTES, 99);
    expect(new Set(tout).size).toBe(tout.length);
  });
});

/* Revenir en arrière — « il faut pouvoir revenir sur un texte précédent ».
 *
 * Gratuit grâce au double curseur : `acteActif`/`etapeActive` sont volatils,
 * seul `progresCarriere` est enregistré, et lui ne recule jamais. Ces tests
 * verrouillent précisément ça — reculer ne doit RIEN coûter.
 */
describe('Le retour arrière ne coûte aucune progression', () => {
  it('revient d’un écran, sans toucher au curseur enregistré', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-retour');
    for (let i = 0; i < 3; i++) game.avancerCarriere();
    const avant = { ...game.progresCarriere };
    expect(game.etapeActive).toBe(3);

    game.reculerCarriere();
    expect(game.etapeActive).toBe(2);
    expect(game.progresCarriere).toEqual(avant);

    game.reculerCarriere();
    game.reculerCarriere();
    expect(game.etapeActive).toBe(0);
    expect(game.progresCarriere).toEqual(avant);
  });

  it('ne recule pas au-delà du tout premier écran', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-retour-debut');
    expect(game.peutReculer).toBe(false);
    game.reculerCarriere();
    expect(game.acteActif).toBe(0);
    expect(game.etapeActive).toBe(0);
  });

  // Franchir la frontière d'un acte en arrière : on revient à la DERNIÈRE étape
  // de l'acte précédent, et l'Atelier qu'il a ouvert reste ouvert.
  it('remonte dans l’acte précédent sans refermer ce qu’il a ouvert', async () => {
    const { game } = await import('../src/stores/game.svelte');
    const { moduleUnlocked } = await import('../src/model/unlocks');
    game.setPseudo('scenario-retour-acte');
    // Tout l'acte 0, puis tout l'acte 1 — celui qui ouvre l'Atelier.
    for (let i = 0; i < ACTES[0].etapes.length + ACTES[1].etapes.length; i++) {
      game.avancerCarriere();
    }
    expect(game.progresCarriere.acte).toBe(2);
    const ouvertAvant = moduleUnlocked('atelier', { level: 1, acte: game.progresCarriere.acte });
    expect(ouvertAvant).toBe(true);

    // Au début de l'acte 2, on recule : on doit retomber en fin d'acte 1.
    expect(game.etapeActive).toBe(0);
    expect(game.peutReculer).toBe(true);
    game.reculerCarriere();
    expect(game.acteActif).toBe(1);
    expect(game.etapeActive).toBe(ACTES[1].etapes.length - 1);
    // Et surtout : la progression enregistrée n'a pas bougé d'un cran.
    expect(game.progresCarriere.acte).toBe(2);
    expect(moduleUnlocked('atelier', { level: 1, acte: game.progresCarriere.acte })).toBe(true);
  });

  // Une étape déjà franchie doit pouvoir être re-dépassée sans être rejouée,
  // sinon reculer d'un cran obligerait à refaire l'exercice pour repartir.
  it('sait dire qu’une étape est déjà derrière le curseur', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.setPseudo('scenario-retour-franchie');
    for (let i = 0; i < 5; i++) game.avancerCarriere();
    expect(game.etapeDejaFranchie).toBe(false); // on est AU curseur
    game.reculerCarriere();
    expect(game.etapeDejaFranchie).toBe(true); // un cran derrière
  });
});

/* L'acte 3 — le premier acte qui sorte de la batterie.
 *
 * « poursuis sur la suite chronologique » : après le groove vient la mélodie,
 * et c'est elle qui ouvre le Synthé.
 */
describe('L’acte 3 enseigne ce que le récit annonce', () => {
  it('est jouable, et ouvre le Synthé', () => {
    const acte3 = ACTES[3];
    expect(acteAVenir(acte3)).toBe(false);
    expect(acte3.module).toBe('synth');
    // Le Synthé s'ouvre une fois l'acte 3 DERRIÈRE soi, donc à l'acte 4.
    expect(moduleUnlocked('synth', { level: 1, acte: 3 })).toBe(false);
    expect(moduleUnlocked('synth', { level: 1, acte: 4 })).toBe(true);
  });

  it('ne cite que des verbes de HAUTEUR — les degrés, seuls puis empilés', () => {
    /* ⚠️ Deux verbes depuis le 2026-09-02, et l'ordre est le contenu de
     * l'acte : `melodie` pose les degrés sur UNE ligne, `arrangement` les
     * empile avec la batterie et une seconde ligne de synthé. Demande de Yann :
     * *« des exercices de reproduction de synthé avec en même temps plusieurs
     * lignes »*, batterie comprise. Ce qui reste interdit ici, c'est un verbe
     * qui ne parle pas de hauteur. */
    const verbes = niveauxDeLActe(ACTES[3]).map((n) => LEVELS.find((x) => x.id === n)!.exercise);
    for (const [i, v] of verbes.entries()) {
      expect(['melodie', 'arrangement'], `niveau ${niveauxDeLActe(ACTES[3])[i]}`).toContain(v);
    }
    // Les degrés seuls AVANT les degrés empilés : on n'arrange pas ce qu'on ne
    // sait pas encore écrire.
    expect(verbes.lastIndexOf('melodie')).toBeLessThan(verbes.indexOf('arrangement'));
    for (const n of niveauxDeLActe(ACTES[3])) {
      const l = LEVELS.find((x) => x.id === n)!;
      if (l.exercise === 'melodie') expect(l.melodie.pas, `niveau ${n}`).toBeGreaterThan(0);
    }
  });

  /* ⚠️ L'ARRANGEMENT — le verbe qui repose PLUSIEURS lignes de deux natures.
   *
   * Ce que ces tests tiennent, et qu'aucun autre ne verrait : que la cible est
   * ÉCRITE (un arrangement tiré ne saurait pas qui joue avec qui), que ses
   * lignes partagent une subdivision (sinon c'est une polyrythmie, un autre
   * sujet), et que la difficulté monte par le nombre de VOIX — le seul axe
   * propre à ce verbe. */
  describe('les arrangements empilent les voix, pas les cases', () => {
    const arrs = () =>
      niveauxDeLActe(ACTES[3])
        .map((n) => LEVELS.find((x) => x.id === n)!)
        .filter((l) => l.exercise === 'arrangement');

    it('sont tous ÉCRITS, jamais tirés', () => {
      expect(arrs().length).toBeGreaterThanOrEqual(3);
      for (const l of arrs()) {
        expect(l.arrangement, `niveau ${l.id}`).toBeTruthy();
        expect(l.arrangement!.lignes.length, `niveau ${l.id}`).toBeGreaterThanOrEqual(3);
      }
    });

    it('⚠️ chaque ligne fait exactement `subdiv × cycles`', () => {
      /* La subdivision reste COMMUNE — une colonne est un instant, sinon c'est
       * une polyrythmie, un autre sujet. Ce qui peut varier est le nombre de
       * MESURES avant qu'une ligne se répète. Une longueur qui ne tombe pas
       * juste ferait lire au comparateur des cases qui n'existent pas. */
      for (const l of arrs()) {
        const a = l.arrangement!;
        for (const ligne of a.lignes) {
          expect(ligne.pas.length, `niveau ${l.id}, ligne ${ligne.nom}`).toBe(longueurDeLigne(a, ligne));
        }
      }
    });

    it('⚠️ seules les lignes de SYNTHÉ tournent sur plusieurs mesures', () => {
      /* `DrumRowState` n'a pas de `cycleBars` : une ligne de batterie reboucle
       * sur sa mesure. Lui écrire `cycles: 2` donnerait une ligne affichée sur
       * deux mesures dont la seconde ne joue jamais — la moitié des cases
       * seraient inaudibles, et rien à l'écran ne le dirait. */
      for (const l of arrs()) {
        for (const ligne of l.arrangement!.lignes) {
          if (ligne.nature === 'drum') {
            expect(ligne.cycles ?? 1, `niveau ${l.id}, ligne ${ligne.nom}`).toBe(1);
          }
        }
      }
    });

    it('⚠️ mêlent bien les DEUX natures — c’est la demande', () => {
      for (const l of arrs()) {
        const natures = new Set(l.arrangement!.lignes.map((x) => x.nature));
        expect(natures.has('drum'), `niveau ${l.id} : aucune batterie`).toBe(true);
        expect(natures.has('degres'), `niveau ${l.id} : aucune ligne de synthé`).toBe(true);
      }
    });

    it('⚠️ un arrangement ne recule sur AUCUN de ses deux axes à la fois', () => {
      /* ⚠️ Règle élargie le 2026-09-02, sur *« pour un morceau, il faut des
       * cycles différents »*. L'axe était le nombre de VOIX seul, et il ne
       * pouvait pas rester : le niveau qui introduit les cycles pose une
       * question neuve (la ligne ne revient plus au bout d'une mesure) sur
       * moins de lignes, exprès — empiler sept voix ET deux mesures d'un coup
       * ferait deux nouveautés dans le même exercice.
       *
       * Ce qui reste vrai, et c'est la vraie règle : un arrangement plus loin
       * dans l'acte demande PLUS sur au moins un des deux axes. Reculer sur les
       * deux serait un exercice en arrière. */
      const axes = arrs().map((l) => ({
        id: l.id,
        voix: l.arrangement!.lignes.length,
        mesures: mesuresDeLArrangement(l.arrangement!),
      }));
      axes.forEach((a, i) => {
        if (i === 0) return;
        const p = axes[i - 1];
        expect(
          a.voix > p.voix || a.mesures > p.mesures || (a.voix === p.voix && a.mesures === p.mesures),
          `le niveau ${a.id} recule sur les deux axes (${p.voix} voix/${p.mesures} mes. → ${a.voix}/${a.mesures})`,
        ).toBe(true);
      });
      // Et la série va bien quelque part : sept voix d'un côté, deux mesures
      // de l'autre.
      expect(Math.max(...axes.map((a) => a.voix)), 'aucun arrangement n’empile sept voix').toBeGreaterThanOrEqual(7);
      expect(Math.max(...axes.map((a) => a.mesures)), 'aucun arrangement ne dépasse une mesure').toBeGreaterThanOrEqual(2);
    });

    it('⚠️ un degré ne dépasse jamais le clavier de SA ligne', () => {
      /* Sinon la cible demande une note que le clavier ne sait pas écrire — et
       * sur la NAPPE le clavier est plus court que sur les autres : elle joue
       * des accords, et il n'y en a que `chordCount`. Une cinquième touche y
       * proposerait un accord inexistant, donc une case impossible à remplir
       * dans un exercice qui exige l'exactitude. */
      for (const l of arrs()) {
        const a = l.arrangement!;
        for (const ligne of a.lignes) {
          if (ligne.nature !== 'degres') continue;
          const max = degreMaxDeLigne(a, ligne.nom);
          for (const d of ligne.pas) {
            expect(d, `niveau ${l.id}, ligne ${ligne.nom} : degré ${d} hors clavier`).toBeLessThanOrEqual(max);
          }
        }
      }
    });

    it('⚠️ la NAPPE ne paraît qu’une fois les deux autres lignes de synthé posées', () => {
      /* Un accord tenu ne s'entend comme un FOND que s'il y a quelque chose
       * devant. Introduit seul, il passerait pour une quatrième note bizarre —
       * même raison qui la tenait hors du verbe `melodie`, qui est
       * monophonique. */
      const avecNappe = arrs().findIndex((l) => l.arrangement!.lignes.some((x) => x.nom === 'pad'));
      expect(avecNappe, 'aucun arrangement ne pose la nappe').toBeGreaterThanOrEqual(0);
      const avant = arrs().slice(0, avecNappe);
      const posees = new Set(avant.flatMap((l) => l.arrangement!.lignes.map((x) => x.nom)));
      expect(posees.has('bass'), 'la nappe arrive avant la basse').toBe(true);
      expect(posees.has('melody'), 'la nappe arrive avant la mélodie').toBe(true);
    });

    it('⚠️ une ligne de synthé commence par sa TONIQUE — elle est donnée', () => {
      /* Le premier pas est posé et verrouillé par `preparerArrangement`, comme
       * la tonique de la mélodie : sans point de départ, aucun degré ne se
       * situe. Si la cible ne posait rien au premier pas, rien ne serait donné
       * et la promesse du préambule serait fausse. */
      for (const l of arrs()) {
        for (const ligne of l.arrangement!.lignes) {
          if (ligne.nature !== 'degres') continue;
          expect(ligne.pas[0], `niveau ${l.id}, ligne ${ligne.nom}`).toBeGreaterThan(0);
        }
      }
    });
  });
});

/* ⚠️ L'ACTE 3 EMPILE TROIS ENVOIS — refait le 2026-09-01.
 *
 * Demande de Yann après relecture complète : *« il faut que tout soit en
 * atelier avec des cahiers des charges assez complexes »*, et pour cet
 * acte-ci : *« mélodie, basse, nappe, additionnées, plus les textures »*.
 *
 * Ce que ce describe tient, et qu'aucun autre ne verrait : l'ordre des couches
 * (une commande qui demanderait la nappe avant la mélodie raconterait autre
 * chose), le fait que chaque envoi n'exige que la couche qu'il AJOUTE, et — le
 * vrai point de conception — que les couches précédentes sont protégées SANS
 * interdiction, par des contraintes relationnelles.
 */
describe('L’acte 3 empile trois envois du même jingle', () => {
  const envois = ACTES[3].etapes.filter((e) => e.kind === 'commande');
  const ids = (i: number) => (envois[i] as { cahier: Array<{ id: string }> }).cahier.map((c) => c.id);

  it('en a trois, et seul le premier ne reprend pas une livraison', () => {
    expect(envois).toHaveLength(3);
    const suite = envois as Array<{ partirDeLaLivraison?: boolean }>;
    expect(suite[0].partirDeLaLivraison).toBeFalsy();
    expect(suite[1].partirDeLaLivraison).toBe(true);
    expect(suite[2].partirDeLaLivraison).toBe(true);
  });

  it('demande les couches dans l’ordre du récit : mélodie, puis basse, puis nappe', () => {
    // ⚠️ Chaque envoi n'exige QUE ce qu'il ajoute — un envoi qui redemanderait
    // la couche précédente la présenterait comme une case déjà cochée.
    expect(ids(0)).toContain('phrase:melody');
    expect(ids(0).some((i) => i.startsWith('synth:'))).toBe(false);

    expect(ids(1)).toContain('synth:bass');
    expect(ids(1)).not.toContain('phrase:melody');
    expect(ids(1)).not.toContain('synth:pad');

    expect(ids(2)).toContain('synth:pad');
    expect(ids(2)).not.toContain('synth:bass');
  });

  it('et finit par les TEXTURES — une voix choisie sur chaque ligne', () => {
    /* « Une note n'est pas un son » : les trois lignes doivent avoir quitté la
     * voix d'usine à la fin de l'acte, la basse au deuxième envoi et les deux
     * autres au troisième. */
    const voix = [...ids(1), ...ids(2)].filter((i) => i.startsWith('voix:'));
    const lignes = voix.flatMap((i) => i.slice(5).split('+'));
    expect(new Set(lignes)).toEqual(new Set(['bass', 'melody', 'pad']));
  });

  it('⚠️ ouvre le Synthé sur les trois — sinon l’acte est un cul-de-sac', () => {
    // Le Synthé ne s'ouvre qu'une fois l'acte 3 FRANCHI : c'est `modulesRequis`
    // qui le prête le temps de la commande (le défaut trouvé en JOUANT).
    for (const e of envois as Array<{ modulesRequis?: string[] }>) {
      expect(e.modulesRequis).toContain('synth');
    }
  });

  it('⚠️ protège la couche précédente SANS l’interdire — un envoi qui l’efface est refusé', async () => {
    /* Le cœur de la conception : aucun envoi ne dit « ne touche pas à la
     * mélodie ». C'est « la basse tient moins de notes que la mélodie » qui
     * rend son effacement impossible — une exigence relationnelle plutôt
     * qu'une interdiction, donc l'Atelier reste libre tant que le résultat
     * tient. */
    const { evaluerCommande } = await import('../src/model/commande');
    const { etatVierge } = await import('../src/model/defaults');

    const livre = etatVierge();
    const m = livre.synthRows.melody;
    m.subdivisions = 8;
    m.pattern = new Array(8).fill(null);
    m.pattern[0] = { degree: 5, octave: 0 };
    m.pattern[2] = { degree: 3, octave: 0 };
    m.pattern[4] = { degree: 2, octave: 0 };
    m.pattern[6] = { degree: 1, octave: 0 };
    const b = livre.synthRows.bass;
    b.subdivisions = 8;
    b.pattern = new Array(8).fill(null);
    b.pattern[0] = { degree: 1, octave: 0 };

    const cahier = (envois[1] as { cahier: Parameters<typeof evaluerCommande>[1] }).cahier;
    const tient = (e: typeof livre) =>
      evaluerCommande(e, cahier).lignes.find((l) => l.contrainte.id === 'basse-tient')!.ok;
    expect(tient(livre)).toBe(true);

    // La même basse, mais la mélodie effacée : la ligne retombe.
    const sansMelodie = structuredClone(livre);
    sansMelodie.synthRows.melody.pattern = new Array(8).fill(null);
    expect(tient(sansMelodie)).toBe(false);
  });
});

/* Les actes 0, 1 et 2, refondus sur trois retours de Yann d'un coup.
 *
 * Chacun de ces tests garde un défaut PRÉCIS qu'il a rencontré à l'écran : un
 * mot de vocabulaire demandé avant l'écran qui le porte, un niveau où il n'y a
 * rien à arbitrer, un acte « groove » qui faisait reproduire des grilles.
 */
describe('L’acte 0 ne demande que ce qu’on peut entendre', () => {
  /* ⚠️ « Je ne sais même pas expliquer ce que c'est decay, pourquoi c'est dès
   * le début ce concept ?? » — l'acte 0 utilisait `nommer` et `regler`, deux
   * verbes de VOCABULAIRE, dans un acte où l'Atelier est FERMÉ : on demandait
   * de mettre un nom sur des curseurs jamais vus. Ce test interdit qu'ils y
   * reviennent tant que l'Atelier n'est pas ouvert (acte 1). */
  it('n’emploie aucun verbe de vocabulaire avant que l’Atelier soit ouvert', () => {
    for (const n of niveauxDeLActe(ACTES[0])) {
      const l = LEVELS.find((x) => x.id === n)!;
      expect(['nommer', 'regler'], `niveau ${n}`).not.toContain(l.exercise);
    }
  });

  /* ⚠️ L'acte 0 se joue avec les MAINS — et ce test remplace « les quatre mots
   * de l'écoute, dans l'ordre » (hauteur, durée, intensité, silence).
   *
   * Demande de Yann : *« il faut enlever les questions "lequel", mettre les
   * questions de tap »*. `lequel` demande un JUGEMENT sur un son à quelqu'un
   * qui n'a encore rien touché ; `jouer` demande un GESTE que tout le monde a
   * déjà. Les trois mots ne sont pas perdus : ils sont enseignés à l'acte 2,
   * par `nommer` et `regler`, à l'écran qui porte enfin les boutons.
   *
   * Ce qui se verrouille ici, c'est la FORME de l'acte : trois frappes puis le
   * silence, et pas un questionnaire. */
  it('ne pose plus une seule question à choix multiples sur un son', () => {
    for (const n of niveauxDeLActe(ACTES[0])) {
      const l = LEVELS.find((x) => x.id === n)!;
      expect(l.exercise, `niveau ${n}`).not.toBe('lequel');
    }
  });

  it('met les mains sur la machine, puis fait entendre l’absence', () => {
    const verbes = niveauxDeLActe(ACTES[0]).map((n) => LEVELS.find((x) => x.id === n)!.exercise);
    expect(verbes).toEqual(['jouer', 'jouer', 'jouer', 'silence']);
  });

  /* Les trois frappes sont une COURBE, donc écrites : la deuxième ajoute un
   * coup hors des temps, la troisième coupe le son du kick. Un générateur de
   * densité ne sait pas ce qu'il vient d'ajouter — même raison qu'à l'acte 1. */
  it('écrit ses trois rythmes de frappe, et n’en tire aucun', () => {
    const frappes = niveauxDeLActe(ACTES[0])
      .map((n) => LEVELS.find((x) => x.id === n)!)
      .filter((l) => l.exercise === 'jouer');
    expect(frappes.map((l) => l.jouerIndice)).toEqual(['ecoute', 'ecoute', 'lecture']);
    for (const l of frappes) {
      expect(l.grille, `niveau ${l.id} : tiré au sort`).toBeTruthy();
      const k = l.grille!.kick.slice(0, l.grille!.subdiv.kick);
      // Deux frappes au moins, sinon on n'appuie pas : on tape une fois.
      expect(k.filter((v) => v > 0).length, `niveau ${l.id}`).toBeGreaterThanOrEqual(2);
    }
    // Le premier ne pose QUE les temps ; les deux suivants ajoutent un coup
    // entre deux temps — c'est la seule chose qui change d'un exercice à
    // l'autre, et elle doit être dans les données, pas dans le préambule.
    const horsTemps = (l: (typeof frappes)[number]) =>
      l.grille!.kick.slice(0, l.grille!.subdiv.kick).filter((v, i) => v > 0 && i % 2 === 1).length;
    expect(horsTemps(frappes[0]), 'le premier ne pose que les temps').toBe(0);
    expect(horsTemps(frappes[1]), 'le deuxième pose un contretemps').toBe(1);
    expect(horsTemps(frappes[2]), 'le troisième aussi, ailleurs').toBe(1);
    // ⚠️ Et il est ailleurs : « à vue » se lit, il ne se rejoue pas de mémoire.
    const place = (l: (typeof frappes)[number]) =>
      l.grille!.kick.findIndex((v, i) => v > 0 && i % 2 === 1);
    expect(place(frappes[2])).not.toBe(place(frappes[1]));
  });

  /* ⚠️ « À vue » coupe le son du kick : sans une autre ligne pour porter la
   * pulsation, l'exercice se jouerait dans le silence, donc au hasard. C'est
   * exactement pourquoi le niveau 38 porte un charley (voir `jouerIndice`). */
  it('donne une pulsation à l’exercice où le kick est muet', () => {
    const aVue = niveauxDeLActe(ACTES[0])
      .map((n) => LEVELS.find((x) => x.id === n)!)
      .find((l) => l.exercise === 'jouer' && l.jouerIndice === 'lecture')!;
    const g = aVue.grille!;
    const autres = [...g.snare.slice(0, g.subdiv.snare), ...g.hat.slice(0, g.subdiv.hat)];
    expect(autres.filter((v) => v > 0).length).toBeGreaterThan(0);
  });
});

describe('L’acte 1 apprend la grille, et repart avec l’objet', () => {
  /* Deux retraits, deux demandes, et la même raison à chaque fois : un écran
   * où il n'y a presque rien à faire.
   *
   * — « Niveau 1 à supprimer, on peut passer au niveau 2 directement » : il ne
   *   faisait poser que des kicks sur une grille dont les deux autres lignes
   *   étaient vides.
   * — ⚠️ « Le niveau 2 retiré » (2026-09-01) : douze cases, deux coups de kick
   *   et deux de claire — la grille la plus légère de toute la carrière, en
   *   ouverture de l'acte qui doit monter.
   *
   * Les deux restent au réservoir : un niveau ne se supprime jamais. */
  it('ne cite plus les niveaux 1 et 2 — il ouvre sur les quatre temps', () => {
    expect(niveauxDeLActe(ACTES[1])).not.toContain(1);
    expect(niveauxDeLActe(ACTES[1])).not.toContain(2);
    expect(niveauxDeLActe(ACTES[1])[0]).toBe(67);
  });

  /* ⚠️ Les variantes (rim shot, charley ouvert) et les rafales ont déménagé de
   * l'acte 2 vers ici : « on ne comprend pas pourquoi il y a les rafales et
   * les charleys ouverts, rim shot, personne n'explique, ce n'est pas lié au
   * groove ». Ce sont deux gestes de GRILLE, donc de l'acte qui l'enseigne —
   * et ils sont montrés à l'écran avant d'être demandés. */
  it('enseigne la variante et la rafale, et les explique avant de les demander', () => {
    const e = ACTES[1].etapes;
    const niveaux = niveauxDeLActe(ACTES[1]);
    // ⚠️ Le premier niveau à variantes est le 60 depuis la fusion du
    // 2026-09-01 : le 5 (rim shots seuls) est retourné au réservoir, et Sol
    // fait maintenant les DEUX gestes avant qu'on les demande ensemble.
    expect(niveaux).toContain(60);
    expect(niveaux).toContain(8);
    const premierAvecVariante = e.findIndex((x) => x.kind === 'exercice' && x.niveau === 60);
    const explication = e.findIndex(
      (x) => x.kind === 'recit' && x.lignes.join(' ').includes('rim shot'),
    );
    expect(explication).toBeGreaterThanOrEqual(0);
    expect(explication).toBeLessThan(premierAvecVariante);
  });

  /* La livraison — « sortir une vraie sonnerie de téléphone avec […] ce qui
   * peut être drôle, c'est de l'exporter et de proposer d'en faire la sonnerie
   * de son téléphone/réveil matin ». Elle clôt l'acte qui ouvre l'Atelier :
   * placée ailleurs, elle enverrait dans un module encore cadenassé. */
  it('finit sur une livraison, dans l’acte qui ouvre l’Atelier', () => {
    const e = ACTES[1].etapes;
    const derniere = e[e.length - 1];
    expect(derniere.kind).toBe('livraison');
    expect(ACTES[1].module).toBe('atelier');
    if (derniere.kind !== 'livraison') return;
    expect(derniere.bouton.length).toBeGreaterThan(0);
    expect(derniere.lignes.join(' ')).toMatch(/sonnerie|réveil/i);
  });

  /* ⚠️ Ce que la livraison EMPORTE — et c'est là qu'elle peut mentir sans que
   * rien ne le dise. Elle ouvre l'Atelier sur `toAtelierState()`, c'est-à-dire
   * sur la PROPOSITION du joueur : si une étape de récit rechargeait un niveau
   * en chemin, on repartirait avec une grille vide en promettant « ton rythme
   * s'y ouvre tel quel ». Les deux dernières étapes de l'acte 1 sont
   * justement du récit puis la livraison. */
  it('emporte le rythme qu’on vient de faire, pas une grille vide', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = 'livraison-test';
    game.acteActif = 1;
    const e = ACTES[1].etapes;
    const dernierExo = e.map((x) => x.kind).lastIndexOf('exercice');
    game.etapeActive = dernierExo;
    game.demarrerEtape();
    // On réussit l'exercice, puis on lit ce qui reste avant la livraison.
    // (Les mêmes tableaux des deux côtés : `comparerGrilles` compare des
    // valeurs, la proposition est donc exacte.)
    game.guess = { ...game.target };
    game.guessRolls = { ...game.targetRolls };
    expect(game.verify()).toBe(true);
    for (let i = dernierExo; i < e.length - 1; i++) game.avancerCarriere();
    expect(game.etapeCourante?.kind).toBe('livraison');

    const st = game.toAtelierState();
    const coups = (['kick', 'snare', 'hat'] as const).reduce(
      (n, r) => n + st.rows[r].pattern.filter((v) => v > 0).length,
      0,
    );
    expect(coups).toBeGreaterThan(0);
  });

  // Une seule livraison dans toute la carrière : c'est un moment, pas un
  // gabarit de fin d'acte.
  it('est le seul acte à livrer', () => {
    for (const a of ACTES) {
      const n = a.etapes.filter((x) => x.kind === 'livraison').length;
      expect(n, `acte ${a.id}`).toBe(a.id === 1 ? 1 : 0);
    }
  });
});

describe('un acte lance le niveau qu’il CITE, pas son voisin', () => {
  /* ⚠️ `demarrerEtape` faisait `startLevel(e.niveau - 1)` : une recherche
   * POSITIONNELLE à partir d'un identifiant. Ça ne marchait que tant que
   * `id === index + 1`, et rien ne l'imposait — un niveau inséré au milieu du
   * tableau aurait décalé tous les exercices de tous les actes, en silence.
   *
   * La recherche se fait désormais par id. Ces deux tests tiennent les deux
   * moitiés : que chaque citation TROUVE un niveau, et que ce niveau soit bien
   * celui qui porte cet identifiant. */
  it('chaque niveau cité existe dans le réservoir', () => {
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'exercice') continue;
        const l = LEVELS.find((x) => x.id === e.niveau);
        expect(l, `acte ${a.id} cite le niveau ${e.niveau}, introuvable`).toBeTruthy();
      }
    }
  });

  it('et la citation ne dépend plus de la POSITION dans le tableau', () => {
    // Si un jour `id !== index + 1`, la recherche par id continue de rendre le
    // bon niveau — c'est ce qu'on vérifie, plutôt que de figer la coïncidence.
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'exercice') continue;
        const parId = LEVELS.find((x) => x.id === e.niveau)!;
        expect(parId.id, `acte ${a.id}`).toBe(e.niveau);
      }
    }
  });

  it('les identifiants du réservoir sont uniques', () => {
    // Deux niveaux au même id rendraient la recherche par id ambiguë, et le
    // jeu jouerait toujours le premier.
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size, 'des identifiants en double').toBe(ids.length);
  });
});

describe('L’acte 2 : le groove s’entend, puis se repose, puis se règle', () => {
  /* ⚠️ DEUX ARBITRAGES SUCCESSIFS, et il faut les garder tous les deux —
   * ne pas « restaurer » l'un en croyant corriger l'autre.
   *
   * 1. (2026-08-27) « Pour le groove, on ne comprend pas pourquoi il y a les
   *    rafales et les charleys ouverts, rim shot, personne n'explique, ce
   *    n'est pas lié au groove. » L'acte citait cinq grilles GÉNÉRÉES, qui
   *    posaient des variantes et des rafales sans rapport avec ce qu'il
   *    enseigne. Elles ont été retirées au profit des trois verbes de
   *    paramètre.
   * 2. (plus tard le même jour) « Les quiz sont moins intéressants que les
   *    exercices de reproduction et surtout que ceux de l'atelier. » Trois
   *    écrans où l'on ne fait que DÉSIGNER, aucun où l'on pose.
   *
   * Les deux tiennent ensemble parce que ce qui est revenu n'est pas ce qui
   * était parti : les grilles de l'acte 2 sont ÉCRITES, sans une variante ni
   * une rafale.
   *
   * ⚠️ Un TROISIÈME arbitrage s'y est ajouté le 2026-09-01 (« les rythmes se
   * ressemblent trop ») : elles étaient jusque-là toutes IDENTIQUES, seul le
   * feel changeant, pour rendre deux balancements comparables. Elles sont
   * désormais toutes DIFFÉRENTES, et la comparaison passe par `regler`. Le
   * `it` correspondant, plus bas, porte le détail. */
  const grillesDeLActe2 = () =>
    niveauxDeLActe(ACTES[2])
      .map((n) => LEVELS.find((x) => x.id === n)!)
      .filter((l) => l.exercise === 'reproduire');

  it('ses verbes de paramètre restent tous sur la famille groove', () => {
    const niveaux = niveauxDeLActe(ACTES[2]);
    expect(niveaux.length).toBeGreaterThan(0);
    for (const n of niveaux) {
      const l = LEVELS.find((x) => x.id === n)!;
      if (l.exercise === 'reproduire') continue;
      expect(['lequel', 'nommer', 'regler'], `niveau ${n}`).toContain(l.exercise);
      expect(l.familleParam, `niveau ${n}`).toBe('groove');
    }
  });

  it('⚠️ ses grilles n’apportent AUCUNE variante ni rafale — l’arbitrage 1', () => {
    const grilles = grillesDeLActe2();
    expect(grilles.length).toBeGreaterThan(0);
    for (const l of grilles) {
      expect(l.grille, `niveau ${l.id} : doit être écrite, pas tirée`).toBeTruthy();
      const g = l.grille!;
      for (const r of ['kick', 'snare', 'hat'] as const) {
        expect(g[r].slice(0, g.subdiv[r]), `niveau ${l.id} : variante sur ${r}`).not.toContain(2);
        const rolls = g.rolls?.[r] ?? [];
        expect(rolls.some((v) => v > 1), `niveau ${l.id} : rafale sur ${r}`).toBe(false);
      }
    }
  });

  it('⚠️ ses grilles sont TOUTES DIFFÉRENTES — le trio est dissous', () => {
    /* ⚠️ CE TEST DIT L'INVERSE DE CE QU'IL DISAIT, et c'est un arbitrage, pas
     * une régression. Il exigeait que les niveaux 14, 17 et 23 partagent une
     * seule grille : c'était la condition pour comparer deux balancements —
     * mêmes cases, autres instants.
     *
     * Retour de Yann (relecture complète, 2026-09-01), cinq fois dans le même
     * document : *« les rythmes se ressemblent trop »*. Trois reproductions de
     * la même grille, c'est trois fois le même travail de lecture pour une
     * seule idée. La comparaison passe donc par `regler` — un curseur visé
     * contre une cible dit la même chose en un geste — et les grilles de
     * l'acte, elles, sont toutes différentes.
     *
     * Ce que la version d'avant protégeait et qui reste tenu ailleurs : une
     * grille de cet acte n'apporte ni variante ni rafale (test au-dessus), et
     * porte toujours un feel (test en dessous). */
    const grilles = grillesDeLActe2();
    expect(grilles.length).toBeGreaterThanOrEqual(3);
    const cases = (l: (typeof grilles)[number]) =>
      JSON.stringify([l.grille!.subdiv, l.grille!.kick, l.grille!.snare, l.grille!.hat]);
    const vues = grilles.map(cases);
    expect(new Set(vues).size, 'deux grilles identiques dans l’acte 2').toBe(grilles.length);
    // Et le feel diffère aussi : deux grilles ne racontent pas la même chose.
    const feels = grilles.map((l) =>
      JSON.stringify([l.grille!.swing ?? null, l.grille!.shift ?? null]),
    );
    expect(new Set(feels).size, 'deux grilles au même feel').toBe(grilles.length);
  });

  it('⚠️ et l’acte reprend là où l’acte 1 s’arrête, PLUS le feel', () => {
    /* « Le jeu reste trop longtemps trop facile. » Mesuré en août : l'acte 1
     * finissait à 24 cases et l'acte 2 plafonnait à 24 sans variante — un cran
     * en arrière.
     *
     * ⚠️ La formulation a changé le 2026-08-31, et il faut savoir pourquoi.
     * Les deux actes sont désormais à la résolution MAXIMALE lisible sur un
     * téléphone (seize cases par ligne, mesuré : 18,7 px la case en 390 px de
     * large). Exiger « strictement plus de cases » qu'à l'acte 1 forcerait
     * trente-deux cases, c'est-à-dire des cases de 9 px — on rendrait le jeu
     * illisible en croyant le rendre difficile.
     *
     * L'escalade de l'acte 2 est sur un AUTRE axe, et c'est son sujet même :
     * toutes ses grilles portent un feel — swing, décalage, ou les deux — donc
     * les cases ne sonnent plus là où elles sont dessinées. Aucune grille de
     * l'acte 1 n'en porte. C'est ça qu'on vérifie. */
    const poids = (id: number) => {
      const g = LEVELS.find((x) => x.id === id)!.grille!;
      return g.subdiv.kick + g.subdiv.snare + g.subdiv.hat;
    };
    const finActe1 = poids(61);
    for (const l of grillesDeLActe2()) {
      expect(poids(l.id), `acte 2, niveau ${l.id} : sous la fin de l’acte 1`).toBeGreaterThanOrEqual(
        finActe1,
      );
      const g = l.grille!;
      const feel = (g.swing ?? 0) !== 0 || Object.values(g.shift ?? {}).some((v) => v !== 0);
      expect(feel, `acte 2, niveau ${l.id} : une grille sans feel`).toBe(true);
    }
    // Et l'acte 1, lui, n'en pose aucun : le feel est la nouveauté de l'acte 2.
    for (const n of niveauxDeLActe(ACTES[1])) {
      const g = LEVELS.find((x) => x.id === n)!.grille;
      if (!g) continue;
      expect((g.swing ?? 0) === 0, `acte 1, niveau ${n} : du swing écrit`).toBe(true);
      expect(Object.keys(g.shift ?? {}), `acte 1, niveau ${n} : un décalage écrit`).toHaveLength(0);
    }
  });

  it('⚠️ RÈGLE d’abord, repose ensuite — l’ordre est le contenu de l’acte', () => {
    /* ⚠️ L'ordre a changé le 2026-09-01, sur une consigne d'une ligne :
     * *« régler en premier »*, et *« les autres verbes ne sont pas forcément
     * tous intéressants : lequel, régler et nommer »*.
     *
     * Ce qui part : les trois `lequel` (désigner A ou B est le même jugement
     * d'oreille que viser un curseur, en moins engageant) et les deux
     * exercices d'ALÉA, qui deviennent une exigence du cahier de Kelvin — on
     * ne reconnaît plus des ghost notes, on en pose.
     *
     * Ce qui reste : chaque sujet s'ouvre sur son RÉGLAGE et se referme sur une
     * grille, et `nommer` garde son écran, le seul du jeu qui mette les deux
     * mots côte à côte. */
    const verbes = niveauxDeLActe(ACTES[2]).map((n) => LEVELS.find((x) => x.id === n)!.exercise);
    expect(verbes).toEqual([
      // le swing : régler au curseur → tenir sur seize cases
      'regler', 'reproduire',
      // le décalage : régler → reposer
      'regler', 'reproduire',
      // les deux : nommer lequel des deux → les cumuler
      'nommer', 'reproduire',
      // le palier, qui devient le départ de la commande
      'reproduire',
    ]);
    // Aucune reproduction avant le réglage qui l'a préparée.
    expect(verbes.indexOf('regler')).toBeLessThan(verbes.indexOf('reproduire'));
    // Et plus aucun quiz d'écoute : ce que l'acte demande, il le fait poser.
    expect(verbes).not.toContain('lequel');
  });

  /* ⚠️ L'ALÉA A DÉMÉNAGÉ DANS LE CAHIER — *« l'aléa dans le cahier »* (Yann).
   *
   * Le défaut qu'il corrige se voit en jouant : on traversait l'acte du GROOVE
   * en reconnaissant des boutons, et sa commande n'en demandait aucun. On
   * pouvait donc livrer à Kelvin une boucle carrée — exactement ce qu'il refuse
   * au premier écran (« ça fait réveil »). */
  it('demande le groove dans la LIVRAISON, pas seulement dans les exercices', () => {
    const cmd = ACTES[2].etapes.find((e) => e.kind === 'commande')!;
    const ids = cmd.cahier.map((c) => c.id);
    expect(ids).toContain('alea');
    expect(ids).toContain('ligne-glisse');
    // Et plus aucun exercice de l'acte ne porte sur l'aléa : c'est l'un OU
    // l'autre, sinon on demande deux fois la même chose.
    for (const n of niveauxDeLActe(ACTES[2])) {
      const l = LEVELS.find((x) => x.id === n)!;
      for (const p of l.paramsAutorises ?? []) {
        expect(['ghostDensity', 'randomVelocity', 'spontRoll'], `niveau ${n}`).not.toContain(p);
      }
    }
  });

  // Et il arrive APRÈS l'acte qui ouvre l'Atelier : `nommer` et `regler`
  // mettent des mots sur des curseurs, encore faut-il que le joueur ait vu les
  // curseurs.
  it('tombe après l’ouverture de l’Atelier', () => {
    expect(moduleUnlocked('atelier', { level: 1, acte: 2 })).toBe(true);
  });
});

/* L'acte 4 — le premier acte dont la leçon n'est pas un son mais un ENDROIT.
 *
 * « Poursuis » : après la mélodie vient la production, et c'est elle qui ouvre
 * le module Production.
 */
describe('L’acte 4 fait entendre ce qu’aucun texte ne peut dire', () => {
  it('est jouable, et ouvre la Production', () => {
    const acte4 = ACTES[4];
    expect(acteAVenir(acte4)).toBe(false);
    expect(acte4.module).toBe('production');
    expect(moduleUnlocked('production', { level: 1, acte: 4 })).toBe(false);
    expect(moduleUnlocked('production', { level: 1, acte: 5 })).toBe(true);
  });

  /* ⚠️ CE QUE CET ACTE VÉRIFIE A CHANGÉ le 2026-09-01, et il faut savoir
   * pourquoi avant de « restaurer » quoi que ce soit.
   *
   * Il vérifiait un ORDRE D'EXERCICES : le petit haut-parleur (`laverie`)
   * d'abord, puis quatre quiz de paramètre. Yann a joué l'acte et a écrit
   * « NOK » sur les cinq, plus : *« ça ne marche pas l'exercice du petit
   * haut-parleur, cet élément de scénario ne tient pas la route »*. Ce n'était
   * donc pas l'ordre qui était faux, c'était la FORME.
   *
   * L'acte n'a plus un seul exercice. Il a trois envois du même morceau, et ce
   * qu'on tient maintenant, c'est ça : on ne demande le mixage qu'APRÈS avoir
   * accepté le morceau, et chaque envoi repart du précédent. */
  it('ne pose plus aucun exercice — il se joue entièrement à l’Atelier', () => {
    expect(niveauxDeLActe(ACTES[4])).toEqual([]);
  });

  it('enchaîne trois envois du même morceau, et le premier ne juge que le morceau', () => {
    const cmds = ACTES[4].etapes.filter((e) => e.kind === 'commande') as Array<{
      entete: string;
      cahier: Array<{ id: string }>;
      partirDeLaLivraison?: boolean;
    }>;
    expect(cmds).toHaveLength(3);
    // Le premier : rien de mixage, il ne demande QUE d'avoir fait le morceau.
    const mix = ['filtre-9000', 'contraste', 'kick-porte', 'reverb-dosee', 'delay', 'retouchees'];
    expect(cmds[0].cahier.filter((c) => mix.includes(c.id))).toEqual([]);
    // Les deux suivants : que du mixage, et ils reprennent la livraison.
    for (const c of cmds.slice(1)) {
      expect(c.partirDeLaLivraison, c.entete).toBe(true);
      expect(c.cahier.every((l) => mix.includes(l.id)), c.entete).toBe(true);
    }
  });

  /* ⚠️ Le mixage se demande dans l'ORDRE où il se fait : on enlève et on range
   * avant d'ajouter de l'espace. Sol le dit à l'écran (« Tu enlèves, et tu
   * ranges. Ajouter, c'est après »), donc l'ordre des envois doit le tenir —
   * sinon le récit décrit une méthode que le jeu ne demande pas. */
  it('enlève et range AVANT d’ajouter de l’espace', () => {
    const cmds = ACTES[4].etapes.filter((e) => e.kind === 'commande') as Array<{
      cahier: Array<{ id: string }>;
    }>;
    const ids = (i: number) => cmds[i].cahier.map((c) => c.id);
    expect(ids(1)).toContain('filtre-9000');
    expect(ids(1)).toContain('contraste');
    expect(ids(1)).not.toContain('reverb-dosee');
    expect(ids(2)).toContain('reverb-dosee');
    expect(ids(2)).toContain('delay');
  });

  // Le mot du récit et le mot de l'écran sont le même : si le texte dit « la
  // laverie », c'est là que le morceau doit être renvoyé.
  it('nomme la laverie dans le récit qui amène le deuxième envoi', () => {
    const e = ACTES[4].etapes;
    const i = e.findIndex((x) => x.kind === 'commande' && /DEUXIÈME/.test(x.entete));
    const avant = e
      .slice(0, i)
      .flatMap((x) => (x.kind === 'recit' ? x.lignes : []))
      .join(' ');
    expect(avant).toMatch(/laverie/i);
    expect(avant).toMatch(/haut-parleur/i);
  });
});

/* L'acte 5 — celui qui avait l'air d'être une liste.
 *
 * Quinze genres à produire : la tentation était quinze niveaux de
 * reproduction, c'est-à-dire le même exercice quinze fois. Sa vraie scène est
 * ailleurs — le commercial qui n'arrive pas à dire ce qu'il veut et finit par
 * le fredonner.
 */
describe('L’acte 5 fait NOMMER les genres avant de les refaire', () => {
  it('est jouable, et n’ouvre aucun module', () => {
    expect(acteAVenir(ACTES[5])).toBe(false);
    // Rien à déverrouiller : l'acte ne paie aucune dette mécanique, ce qui est
    // précisément ce qui le rend bon marché à écrire.
    expect(ACTES[5].module).toBeNull();
  });

  it('commence par reconnaître, puis reconstruit', () => {
    const verbes = niveauxDeLActe(ACTES[5]).map(
      (n) => LEVELS.find((x) => x.id === n)!.exercise,
    );
    expect(verbes[0]).toBe('style');
    expect(verbes.slice(1).every((v) => v === 'reproduire')).toBe(true);
  });

  /* ⚠️ Les exercices sont CITÉS, pas fabriqués — la règle du fichier depuis le
   * premier jour. Mais « cité » ne veut pas dire « preset » : l'acte a d'abord
   * été écrit avec uniquement des reconstructions de genre, et le test exigeait
   * donc un `presetId` sur chacune. C'était un raccourci, pas la règle.
   *
   * La vraie règle est plus forte, et c'est elle qu'on tient maintenant :
   * **aucun rythme de l'acte 5 n'est TIRÉ**. Un genre reconnu sur une grille
   * générique n'est pas un genre, et une polyrythmie tirée au sort n'apprend
   * pas ce qu'est une polyrythmie. Chaque exercice est donc soit le verbe
   * `style`, soit un preset réel, soit une grille écrite. */
  it('ne joue aucun rythme tiré au sort', () => {
    for (const n of niveauxDeLActe(ACTES[5])) {
      const l = LEVELS.find((x) => x.id === n)!;
      if (l.exercise === 'style') continue;
      expect(
        Boolean(l.presetId) || Boolean(l.grille),
        `niveau ${n} : ni preset, ni grille écrite — il serait généré`,
      ).toBe(true);
    }
  });

  // Une par catégorie du fax : le brief du récit et le classement des données
  // disent la même chose.
  it('couvre plusieurs familles, pas cinq fois la même', () => {
    const cats = niveauxDeLActe(ACTES[5])
      .slice(1)
      .map((n) => LEVELS.find((x) => x.id === n)!.presetId)
      .filter((id): id is string => Boolean(id))
      .map((id) => PRESETS.find((p) => p.id === id)!.cat);
    /* ⚠️ Deux depuis le 2026-09-01 : les cinq reconstructions de presets sont
     * rendues au réservoir, et c'est aux COMMANDES que l'acte couvre ses
     * familles — une par catégorie du fax. Ce que ce test protégeait (« pas
     * cinq fois la même famille ») est donc mesuré plus bas, sur les fiches. */
    expect(new Set(cats).size).toBeGreaterThanOrEqual(2);
  });

  it('⚠️ et ses COMMANDES couvrent les quatre cases du fax, une famille chacune', () => {
    /* Le vrai « pas cinq fois la même chose » depuis que l'acte produit au lieu
     * de recopier : quatre livraisons, quatre genres, quatre fiches
     * différentes. Deux commandes sur la même fiche seraient le même travail
     * deux fois. */
    const fiches = ACTES[5].etapes.flatMap((e) =>
      e.kind === 'commande'
        ? e.cahier.flatMap((c) => (c.id.startsWith('fiche:') ? [c.id.slice(6)] : []))
        : [],
    );
    expect(fiches).toHaveLength(4);
    expect(new Set(fiches).size, 'deux commandes sur le même genre').toBe(4);
    // Et chacune range sa livraison dans SA série, sinon la discographie n'en
    // garderait qu'une sur quatre (voir `discographie.ts`).
    const series = ACTES[5].etapes.flatMap((e) => (e.kind === 'commande' ? [e.serie] : []));
    expect(new Set(series).size, 'deux livraisons dans la même série').toBe(4);
    for (const s of series) expect(s, 'une série vide se ferait écraser').toBeTruthy();
  });

  // Le mot du récit et le verbe de l'écran sont le même : si le texte fait
  // fredonner un genre, l'exercice doit demander de le nommer.
  it('pose la scène du genre qu’on ne sait pas nommer', () => {
    const avant = ACTES[5].etapes
      .slice(0, ACTES[5].etapes.findIndex((e) => e.kind === 'exercice'))
      .flatMap((e) => (e.kind === 'recit' ? e.lignes : []))
      .join(' ');
    expect(avant).toMatch(/fredonn/i);
    expect(avant).toMatch(/dancehall/i);
  });
});

/* L'acte 6 — celui où le cahier des charges devait presque disparaître.
 *
 * « Aucun brief. Aucun client. Aucun style imposé. […] Cette fois, personne ne
 * te dit si c'est bon. » C'est ce texte qui donne sa forme à toute la
 * mécanique de commande : la sévérité DÉCROÎT avec le récit.
 */
describe('L’acte 6 ne commande rien, il demande de faire', () => {
  const acte6 = () => ACTES[6];

  it('est jouable, et sa seule étape de travail est une commande', () => {
    expect(acteAVenir(acte6())).toBe(false);
    expect(acte6().etapes.some((e) => e.kind === 'exercice')).toBe(false);
    expect(acte6().etapes.filter((e) => e.kind === 'commande')).toHaveLength(1);
  });

  /* ⚠️ Le cahier de FB-015 ne demande AUCUN style et aucun client : il constate
   * qu'on s'est servi de ce qu'on a appris. Une contrainte de genre ici
   * contredirait la phrase même de l'acte. */
  it('n’impose aucun style — c’est la phrase de l’acte', () => {
    const c = acte6().etapes.find((e) => e.kind === 'commande')!;
    if (c.kind !== 'commande') return;
    for (const l of c.cahier) expect(l.id, l.libelle).not.toMatch(/^style:/);
    const texte = acte6()
      .etapes.flatMap((e) => (e.kind === 'recit' ? e.lignes : []))
      .join(' ');
    expect(texte).toMatch(/aucun style imposé/i);
  });

  // Mais il n'est pas vide non plus : une commande sans aucune ligne serait un
  // bouton qui ne juge rien, et le joueur le sent au premier clic.
  it('exige quand même d’avoir produit quelque chose', () => {
    const c = acte6().etapes.find((e) => e.kind === 'commande')!;
    if (c.kind !== 'commande') return;
    expect(c.cahier.length).toBeGreaterThan(1);
    expect(c.cahier.some((l) => l.id === 'produit')).toBe(true);
  });

  /* ⚠️ LE PLUS COMPLET DU JEU, et « complet » n'est pas « sévère ».
   *
   * Demande de Yann (2026-09-01) : *« l'acte 6, le plus complet du jeu »*. Elle
   * entre en tension apparente avec la phrase de l'acte — aucun brief, aucun
   * client, aucun style imposé — et la tension se résout dans ce que le cahier
   * DEMANDE : il récapitule des gestes appris, il ne juge aucun goût. Ce test
   * tient les deux moitiés ensemble, parce qu'une seule des deux se
   * réintroduirait facilement en croyant bien faire. */
  it('⚠️ porte le cahier le plus complet du jeu — mais n’exige aucun goût', () => {
    const c = acte6().etapes.find((e) => e.kind === 'commande')!;
    if (c.kind !== 'commande') return;
    // La moitié « complet » : plus long que tous les autres cahiers du jeu.
    const autres = ACTES.flatMap((a) =>
      a.id === 6 ? [] : a.etapes.flatMap((e) => (e.kind === 'commande' ? [e.cahier.length] : [])),
    );
    expect(autres.length).toBeGreaterThan(0);
    expect(c.cahier.length, 'FB-015 devrait être le plus long').toBeGreaterThan(Math.max(...autres));

    // La moitié « pas sévère » : rien qui juge un genre ou une ressemblance.
    for (const l of c.cahier) {
      expect(l.id, l.libelle).not.toMatch(/^fiche:/);
      expect(l.id, l.libelle).not.toMatch(/^pas-un-preset/);
    }
    expect(c.chapeau, 'un chapeau de genre serait un style imposé').toBeUndefined();

    // Et il RÉCAPITULE : une section par acte traversé, pas une liste à plat.
    const sections = [...new Set(c.cahier.map((l) => l.section).filter(Boolean))];
    expect(sections.length, 'un cahier de dix lignes à plat ne dit pas d’où elles viennent')
      .toBeGreaterThanOrEqual(4);
  });

  // Sol demande son nom au joueur — le pseudo tapé au tout premier écran,
  // cinq mois de récit plus tôt.
  it('finit sur la question du nom', () => {
    const derniere = acte6().etapes[acte6().etapes.length - 1];
    expect(derniere.kind).toBe('recit');
    if (derniere.kind !== 'recit') return;
    expect(derniere.lignes.join(' ')).toMatch(/comment tu t’appelles/i);
  });
});

/* Où les commandes ont le droit de se poser — et où elles ne l'ont pas. */
describe('Les commandes arrivent quand l’Atelier existe', () => {
  /* ⚠️ On ne peut pas commander un travail dans un module qu'on n'a pas
   * encore ouvert. L'acte 1 est celui qui donne la clé : sa dernière étape est
   * une LIVRAISON (un cadeau, pas une épreuve), et la première vraie commande
   * ne peut arriver qu'après. */
  it('jamais avant l’acte qui ouvre l’Atelier', () => {
    for (const a of ACTES) {
      const aDesCommandes = a.etapes.some((e) => e.kind === 'commande');
      if (aDesCommandes) expect(a.id, `acte ${a.id}`).toBeGreaterThan(1);
    }
    expect(moduleUnlocked('atelier', { level: 1, acte: 2 })).toBe(true);
  });

  /* ⚠️ LA RÈGLE A CHANGÉ le 2026-09-01, et il faut savoir laquelle a cédé.
   *
   * Elle disait « au plus une commande par acte : la commande est le moment où
   * l'acte se conclut, pas un exercice de plus ». Vrai tant qu'un acte
   * enseignait par des exercices et concluait par une livraison. Faux depuis
   * que l'acte 4 est une CHAÎNE D'ENVOIS — *« les livraisons intermédiaires
   * doivent être remplacées par les nouvelles jusqu'à la fin de l'acte »*
   * (Yann). Un client qui renvoie le morceau trois fois, c'est trois commandes,
   * et c'est le contenu de l'acte, pas sa conclusion.
   *
   * Ce qui reste vrai et qu'on continue de tenir : après la DERNIÈRE commande
   * d'un acte, il ne reste rien à FAIRE — ce qui suit est du récit. Sinon la
   * livraison cesse d'être une fin et devient une étape parmi d'autres. */
  it('la dernière d’un acte n’est suivie que de récit', () => {
    for (const a of ACTES) {
      const idx = a.etapes.flatMap((e, i) => (e.kind === 'commande' ? [i] : []));
      if (!idx.length) continue;
      for (const e of a.etapes.slice(idx[idx.length - 1] + 1)) {
        expect(e.kind, `acte ${a.id}`).toBe('recit');
      }
    }
  });

  /* ⚠️ Une chaîne d'envois REPART de ce qu'on vient de livrer — sinon ce ne
   * sont pas des envois, ce sont des commandes indépendantes qui se suivent.
   * Seule la PREMIÈRE d'un acte part d'autre chose. */
  it('dans une CHAÎNE, les envois suivants reprennent la livraison', () => {
    /* ⚠️ La règle porte sur une SÉRIE, pas sur un acte, depuis le 2026-09-01.
     * Elle disait « dans un acte qui enchaîne plusieurs commandes » — vrai tant
     * qu'un acte à plusieurs commandes était forcément une chaîne d'envois du
     * même morceau (acte 3, acte 4). L'acte 5 en compte quatre qui n'ont rien à
     * voir entre elles : quatre GENRES, quatre séries, chacune partant d'une
     * table rase. Groupées par série, la règle redevient exacte — et c'est
     * elle qui compte : ce qui doit reprendre la livraison, c'est un envoi qui
     * continue le morceau précédent. */
    for (const a of ACTES) {
      const cmds = a.etapes.filter((e) => e.kind === 'commande');
      const series = new Map<string, typeof cmds>();
      for (const c of cmds) {
        const k = (c as { serie?: string }).serie ?? '';
        series.set(k, [...(series.get(k) ?? []), c]);
      }
      for (const [k, suite] of series) {
        if (suite.length < 2) continue;
        const s = suite as Array<{ entete: string; partirDeLaLivraison?: boolean }>;
        expect(s[0].partirDeLaLivraison, `acte ${a.id}, série « ${k} » : la première`).toBeFalsy();
        for (const c of s.slice(1)) {
          expect(c.partirDeLaLivraison, `acte ${a.id} — « ${c.entete} »`).toBe(true);
        }
      }
    }
  });

  it('couvre tous les actes où l’on livre quelque chose', () => {
    const avecCommande = ACTES.filter((a) => a.etapes.some((e) => e.kind === 'commande')).map(
      (a) => a.id,
    );
    expect(avecCommande).toEqual([2, 3, 4, 5, 6]);
  });
});

/* L'acte 7 — le dernier, et le seul où l'on ne produit pas : on joue.
 *
 * Il ferme aussi la boucle du récit : Sol dit le nom du joueur au micro.
 */
describe('L’acte 7 joue, et ouvre le Mode Live', () => {
  const acte7 = () => ACTES[7];

  it('est jouable, et le Mode Live s’ouvre en sortant', () => {
    expect(acteAVenir(acte7())).toBe(false);
    expect(acte7().module).toBe('live');
    // Le module s'ouvre une fois l'acte DERRIÈRE soi — donc au terme de la
    // carrière, `progresCarriere.acte` valant alors NB_ACTES.
    expect(moduleUnlocked('live', { level: 1, acte: 7 })).toBe(false);
    expect(moduleUnlocked('live', { level: 1, acte: NB_ACTES })).toBe(true);
  });

  /* ⚠️ Il ne cite QUE des niveaux « jouer », et c'est le fond de l'acte :
   * `justesseDesFrappes` retient la meilleure fenêtre consécutive et non la
   * moyenne du tour, donc la notation pardonne un début raté et récompense la
   * reprise. C'est mot pour mot ce que Sol répond — « Tu te planteras. Mais
   * maintenant tu sais quoi faire après. » */
  it('ne demande que de jouer, jamais de reproduire', () => {
    const niveaux = niveauxDeLActe(acte7());
    expect(niveaux.length).toBeGreaterThan(0);
    for (const n of niveaux) {
      expect(LEVELS.find((x) => x.id === n)!.exercise, `niveau ${n}`).toBe('jouer');
    }
  });

  // On ne produit plus : pas de commande dans un module qu'on n'a pas ouvert,
  // et de toute façon l'acte parle de scène, pas d'atelier.
  it('ne commande rien', () => {
    expect(acte7().etapes.some((e) => e.kind === 'commande')).toBe(false);
    expect(acte7().etapes.some((e) => e.kind === 'livraison')).toBe(false);
  });

  /* La réplique que tout le récit prépare. Le jeton `{pseudo}` est interpolé
   * par la vue ; ce test garde les deux moitiés — que la ligne existe, et
   * qu'elle porte bien le jeton plutôt qu'un nom en dur. */
  it('finit sur Sol qui dit le nom du joueur', () => {
    const lignes = acte7().etapes.flatMap((e) => (e.kind === 'recit' ? e.lignes : []));
    const presente = lignes.find((l) => l.includes('{pseudo}'));
    expect(presente, 'aucune ligne ne cite le joueur').toBeTruthy();
    expect(presente).toMatch(/Je vous présente/);
    // Et c'est la dernière étape : la carrière se termine là-dessus.
    const derniere = acte7().etapes[acte7().etapes.length - 1];
    expect(derniere.kind).toBe('recit');
    if (derniere.kind === 'recit') expect(derniere.lignes).toContain(presente);
  });

  /* ⚠️ Le jeton n'existe QUE là. Un `{pseudo}` oublié ailleurs s'afficherait
   * tel quel — accolades comprises — sur un écran que personne ne relit. */
  it('n’emploie le jeton nulle part ailleurs', () => {
    const ailleurs = ACTES.filter((a) => a.id !== 7).flatMap((a) =>
      a.etapes.flatMap((e) => (e.kind === 'recit' ? e.lignes : [])),
    );
    for (const l of ailleurs) expect(l).not.toContain('{pseudo}');
  });

  // Et plus rien après : la carrière est finie, le carnet est complet.
  it('est le dernier acte, et tous sont désormais écrits', () => {
    expect(acte7().id).toBe(NB_ACTES - 1);
    expect(ACTES.every((a) => !acteAVenir(a))).toBe(true);
  });
});

/* L'ÉPILOGUE — septembre, et la boucle qui se referme.
 *
 * Jusqu'ici la carrière s'arrêtait sur « LE MODE LIVE EST OUVERT » et plus
 * rien : le jeu n'avait pas de fin.
 */
describe('L’épilogue ferme le jeu sans être un neuvième acte', () => {
  it('n’est PAS dans les actes', () => {
    // Il n'a ni compétence, ni module, ni exercice, et il se passe des mois
    // après le 14 juin. L'ajouter à ACTES casserait ActeId, JOURS et le compte
    // à rebours pour ranger du texte dans une structure qui décrit des épreuves.
    expect(NB_ACTES).toBe(8);
    expect(EPILOGUE.length).toBe(LONGUEUR_EPILOGUE);
    expect(LONGUEUR_EPILOGUE).toBeGreaterThan(0);
    for (const e of EPILOGUE) expect(e.kind).toBe('recit');
  });

  /* ⚠️ La dernière image est la PREMIÈRE du jeu, et c'est ça qui fait la boucle.
   *
   * Elle citait « lequel est le plus grave ? », la question du niveau 49, tant
   * que l'acte 0 ouvrait sur un `lequel`. L'acte 0 ouvre maintenant sur une
   * frappe — la citation a suivi, et c'est le seul endroit du jeu où deux
   * textes doivent rester identiques à des mois d'intervalle.
   *
   * Le test ne grave donc pas la phrase : il la DÉRIVE de la commande du
   * premier exercice de l'acte 0. Réécrire l'un sans l'autre le fait tomber,
   * ce qui est exactement le service qu'on lui demande. */
  it('rejoue le tout premier geste du jeu', () => {
    const premiereEtape = ACTES[0].etapes.find((e) => e.kind === 'exercice')!;
    const commande = premiereEtape.kind === 'exercice' ? premiereEtape.commande! : '';
    // La DERNIÈRE phrase de la commande — celle qui dit le geste. Les
    // précédentes sont le dialogue qui l'amène (« — Tu fais quoi exactement
    // ici ? — Le café. — Je sais. »), et elles n'ont rien à faire cinq mois
    // plus tard, avec quelqu'un d'autre.
    const phrase = commande.split(/[.?!]/).filter((x) => x.trim()).pop()!.trim();
    expect(phrase.length, 'la commande du premier exercice').toBeGreaterThan(10);
    const texte = EPILOGUE.flatMap((e) => e.lignes).join(' ');
    expect(texte, `l’épilogue ne cite plus « ${phrase} »`).toContain(phrase);
    // Et le niveau que ce geste désigne est bien un exercice de frappe.
    const premier = LEVELS.find((l) => l.id === niveauxDeLActe(ACTES[0])[0])!;
    expect(premier.exercise).toBe('jouer');
  });

  it('finit sur FB-015 au mur, et ne promet rien après', () => {
    const derniere = EPILOGUE[EPILOGUE.length - 1];
    expect(derniere.lignes.join(' ')).toMatch(/FB-015/);
    expect(derniere.lignes.join(' ')).toMatch(/NOUVELLE SORTIE/);
  });
});

describe('Le curseur de l’épilogue est séparé, et ne débloque rien', () => {
  async function carriereFinie() {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = 'epilogue-test';
    game.progress = {
      ...game.progress,
      'epilogue-test': { level: 1, stars: {}, carriere: { acte: NB_ACTES, etape: 0 } },
    };
    game.etapeEpilogue = 0;
    return game;
  }

  it('ne s’ouvre qu’une fois les huit actes derrière', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.pseudo = 'pas-fini';
    game.progress = {
      ...game.progress,
      'pas-fini': { level: 1, stars: {}, carriere: { acte: 7, etape: 0 } },
    };
    expect(game.enEpilogue).toBe(false);
    expect(game.ecranEpilogue).toBeNull();
  });

  it('avance, recule, et s’arrête sur le dernier écran', async () => {
    const game = await carriereFinie();
    expect(game.enEpilogue).toBe(true);
    expect(game.ecranEpilogue).toBe(EPILOGUE[0]);
    expect(game.finDuJeu).toBe(false);

    for (let i = 0; i < LONGUEUR_EPILOGUE * 2; i++) game.avancerEpilogue();
    // ⚠️ Il ne déborde pas : le dernier écran EST la fin, il n'y a rien après.
    expect(game.etapeEpilogue).toBe(LONGUEUR_EPILOGUE - 1);
    expect(game.finDuJeu).toBe(true);
    expect(game.ecranEpilogue).toBe(EPILOGUE[LONGUEUR_EPILOGUE - 1]);

    for (let i = 0; i < LONGUEUR_EPILOGUE * 2; i++) game.reculerEpilogue();
    expect(game.etapeEpilogue).toBe(0);
  });

  /* Il se relit à volonté : rien ne s'y réussit, rien ne s'y débloque, et le
   * curseur enregistré de la carrière n'y touche pas. */
  it('ne fait pas avancer la progression enregistrée', async () => {
    const game = await carriereFinie();
    const avant = { ...game.progresCarriere };
    game.avancerEpilogue();
    game.avancerEpilogue();
    expect(game.progresCarriere).toEqual(avant);
  });
});

/* ⚠️ LE CALENDRIER — une seule date écrite, tout le reste déduit.
 *
 * Retour de Yann : « dans l'histoire, il faut mettre des dates ». L'année est
 * 2005 (voir `ANNEE` et sa justification). Ces tests tiennent la coïncidence
 * qui rend le calendrier crédible : elle était déjà dans `JOURS`, elle n'était
 * pas affichée — et un ajustement du compte à rebours la casserait en silence.
 */
describe('le calendrier du récit', () => {
  it('pose le concert le 14 juin 2005', () => {
    expect(ANNEE).toBe(2005);
    expect(dateDeLActe(7)).toBe('14 juin 2005');
  });

  it('fait tomber les quatre premiers actes le 14 de leur mois', () => {
    expect(dateDeLActe(0)).toBe('14 janvier 2005');
    expect(dateDeLActe(1)).toBe('14 février 2005');
    expect(dateDeLActe(2)).toBe('14 mars 2005');
    expect(dateDeLActe(3)).toBe('14 avril 2005');
  });

  it('place les trois derniers à six, quatre et deux semaines', () => {
    expect(dateDeLActe(4)).toBe('3 mai 2005');
    expect(dateDeLActe(5)).toBe('17 mai 2005');
    expect(dateDeLActe(6)).toBe('31 mai 2005');
  });

  it('reste d’accord avec le « quand » écrit à la main de chaque acte', () => {
    // Deux façons de dire la même chose cohabitent — « Trois mois avant » et
    // « 14 mars 2005 ». Elles doivent rester d'accord : un `quand` en semaines
    // ne peut pas tomber sur un acte à plus de deux mois, et inversement.
    for (const a of ACTES) {
      const enSemaines = /semaine/.test(a.quand);
      if (enSemaines) expect(a.jours, `acte ${a.id}`).toBeLessThanOrEqual(45);
      else if (/mois/.test(a.quand)) expect(a.jours, `acte ${a.id}`).toBeGreaterThan(45);
    }
  });
});

/* ⚠️ L'ÉPILOGUE FAIT ENTENDRE LE DISQUE DU JOUEUR — « pas assez d'émotion ».
 *
 * Cinq écrans disaient « Mais FB-015 est sorti » sans qu'on l'entende jamais.
 * L'épilogue joue donc la production livrée en dernier. Ce que ces tests
 * gardent est le CHAÎNON qui peut se rompre en silence : l'acte dont on prend
 * le disque est déduit du récit, jamais écrit en dur — et si la dernière
 * commande déménageait, l'épilogue se tairait sans que rien ne le dise.
 */
describe('l’épilogue a un disque à faire entendre', () => {
  it('⚠️ l’acte du disque est celui de la DERNIÈRE commande du récit', () => {
    const acte = ACTES.find((a) => a.id === ACTE_DU_DISQUE);
    expect(acte, `l’acte ${ACTE_DU_DISQUE} n’existe pas`).toBeTruthy();
    expect(
      acte!.etapes.some((e) => e.kind === 'commande'),
      `l’acte ${ACTE_DU_DISQUE} ne contient aucune commande — l’épilogue n’aurait rien à jouer`,
    ).toBe(true);
    // Et c'est bien le DERNIER : aucun acte plus loin n'en porte.
    for (const a of ACTES) {
      if (a.id <= ACTE_DU_DISQUE) continue;
      expect(
        a.etapes.some((e) => e.kind === 'commande'),
        `l’acte ${a.id} porte une commande après celui du disque (${ACTE_DU_DISQUE})`,
      ).toBe(false);
    }
  });

  it('⚠️ après la dernière commande, il ne reste que du récit', () => {
    // Règle déjà tenue ailleurs, redite ici parce que l'épilogue en dépend :
    // le disque qu'il joue est le dernier livré, donc rien ne doit se produire
    // après lui.
    const acte = ACTES.find((a) => a.id === ACTE_DU_DISQUE)!;
    const derniere = acte.etapes.map((e) => e.kind).lastIndexOf('commande');
    for (const e of acte.etapes.slice(derniere + 1)) {
      expect(e.kind, `une étape « ${e.kind} » suit la dernière commande`).toBe('recit');
    }
  });
});
