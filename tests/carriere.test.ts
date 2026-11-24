import { describe, it, expect } from 'vitest';
import { analyserLigne } from '../src/model/locuteurs';
import {
  ACTES,
  NB_ACTES,
  ACTE_DU_MODULE,
  ETAPE_DU_MODULE,
  OBJECTIF,
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
  type Etape,
} from '../src/model/carriere';
import {
  LEVELS,
  degreMaxDeLigne,
  longueurDeLigne,
  mesuresDeLArrangement,
} from '../src/model/presets/levels';
import { parametre } from '../src/model/parametres';
import { montageParNom } from '../src/model/architecture';
import { PRESETS } from '../src/model/presets/songs';
import { moduleUnlocked, LOCKED_MODULES, MODULE_UNLOCK_LEVEL } from '../src/model/unlocks';
import { game } from '../src/stores/game.svelte';

describe('Mode carrière — la charpente en sept actes', () => {
  /* ⚠️ SEPT depuis le 2026-11-24 : LE RYTHME et LE GROOVE sont fusionnés
   * (« trop de niveaux avec swing et décalage, pas intéressant et trop
   * difficile » — Yann, après des testeurs qui n'avaient pas dépassé l'acte du
   * rythme). HISTOIRE.md en compte huit ; le jeu en joue sept. */
  it('a les actes de HISTOIRE.md, le rythme et le groove réunis, dans l’ordre', () => {
    expect(NB_ACTES).toBe(7);
    expect(ACTES.map((a) => a.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(ACTES.map((a) => a.titre)).toEqual([
      'LE CAFÉ',
      'LE RYTHME',
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
    /* HISTOIRE.md, « Ce que le récit ouvre, acte par acte » — sauf le Mode
     * Live, passé de 7 à 6 le 2026-09-14 : sa scène l'empruntait à l'acte 6
     * puis le rendait, si bien que l'entrée apparaissait, servait deux fois et
     * disparaissait jusqu'à l'épilogue. « Une porte déjà ouverte ne se referme
     * jamais » — et on ne découvre pas sa console sur scène. */
    /* ⚠️ `live: 7` depuis le 2026-09-16, et c'est un RENVERSEMENT de
     * l'arbitrage du 2026-09-14 qui l'avait mis à 6. Ce que le jeu a montré :
     * l'acte 6 faisait découvrir la console pour n'y jouer qu'un morceau, et
     * l'acte 7 recommençait avec le même. On prépare à l'acte 6, on joue à
     * l'acte 7, et le module s'ouvre là — à l'ÉTAPE qui le prête. */
    expect(ACTE_DU_MODULE).toEqual({ atelier: 1, synth: 2, production: 3, live: 6 });
    // Et chaque module verrouillé est bien ouvert par un acte : un module qui
    // n'apparaîtrait nulle part dans le récit ne s'ouvrirait plus jamais par lui.
    for (const m of LOCKED_MODULES) expect(ACTE_DU_MODULE[m]).toBeTypeOf('number');
  });

  it('déclare « à venir » exactement les actes dont les exercices ne sont pas écrits', () => {
    expect(ACTES.filter((a) => !acteAVenir(a)).map((a) => a.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
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
    expect(acteParId(99).id).toBe(6);
    expect(acteParId(2).titre).toBe('LA MÉLODIE');
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
    /* La première réplique de Sol vient après, dans l'acte proprement dit.
     * ⚠️ Cherchée par son NOM depuis que les répliques sont attribuées
     * (`model/locuteurs.ts`) : le tiret cadratin ne disait pas qui parlait,
     * donc ce test acceptait la première réplique de n'importe qui. */
    const premiereReplique = ACTES[0].etapes.findIndex(
      (e) => e.kind === 'recit' && e.lignes.some((l) => analyserLigne(l).qui?.nom === 'SOL'),
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

/* L'acte 2 — le premier acte qui sorte de la batterie.
 *
 * « poursuis sur la suite chronologique » : après le groove vient la mélodie,
 * et c'est elle qui ouvre le Synthé.
 */
describe('L’acte 2 enseigne ce que le récit annonce', () => {
  it('est jouable, et ouvre le Synthé', () => {
    const acte3 = ACTES[2];
    expect(acteAVenir(acte3)).toBe(false);
    expect(acte3.module).toBe('synth');
    // Le Synthé s'ouvre une fois l'acte 2 DERRIÈRE soi, donc à l'acte 3.
    expect(moduleUnlocked('synth', { level: 1, acte: 2 })).toBe(false);
    expect(moduleUnlocked('synth', { level: 1, acte: 3 })).toBe(true);
  });

  /* ⚠️ UN SEUL VERBE depuis le 2026-11-24 — *« les 3 premiers sont trop
   * différents des 4 derniers, mais la difficulté est plutôt correcte »*
   * (Yann). L'acte posait d'abord des mélodies TIRÉES, seules (`melodie`),
   * puis des arrangements ÉCRITS (`arrangement`) : deux écrans, deux façons
   * de faire, au milieu de l'acte. Tout est maintenant `arrangement`, et ce qui
   * monte est le nombre de VOIX — le test des deux axes, plus bas, le tient.
   * Les 42-44 restent au réservoir. */
  it('ne cite qu’un verbe, l’arrangement ÉCRIT, du premier exercice au dernier', () => {
    const niveaux = niveauxDeLActe(ACTES[2]);
    expect(niveaux.length).toBe(7);
    for (const retire of [42, 43, 44]) expect(niveaux, `niveau ${retire}`).not.toContain(retire);
    for (const n of niveaux) {
      const l = LEVELS.find((x) => x.id === n)!;
      expect(l.exercise, `niveau ${n}`).toBe('arrangement');
      expect(l.arrangement, `niveau ${n} : tiré au sort`).toBeTruthy();
    }
    // Les voix montent en commençant petit : la phrase seule sur un kick.
    const voix = niveaux.map((n) => LEVELS.find((x) => x.id === n)!.arrangement!.lignes.length);
    expect(voix[0]).toBe(2);
    expect(Math.max(...voix)).toBe(7);
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
      niveauxDeLActe(ACTES[2])
        .map((n) => LEVELS.find((x) => x.id === n)!)
        .filter((l) => l.exercise === 'arrangement');

    it('sont tous ÉCRITS, jamais tirés', () => {
      expect(arrs().length).toBeGreaterThanOrEqual(3);
      for (const l of arrs()) {
        expect(l.arrangement, `niveau ${l.id}`).toBeTruthy();
        // Deux lignes au moins — une batterie et un synthé : c'est la demande.
        expect(l.arrangement!.lignes.length, `niveau ${l.id}`).toBeGreaterThanOrEqual(2);
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

/* ⚠️ L'ACTE 2 EMPILE TROIS ENVOIS — refait le 2026-09-01.
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
describe('L’acte 2 empile trois envois du même jingle', () => {
  const envois = ACTES[2].etapes.filter((e) => e.kind === 'commande');
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
    // Le Synthé ne s'ouvre qu'une fois l'acte 2 FRANCHI : c'est `modulesRequis`
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

  /* ⚠️ Les mains, mais plus la frappe (2026-10-14) : au casque Bluetooth,
   * taper en rythme donnait « l'impression de faire n'importe quoi ». On
   * écoute, puis on POSE — aucun instant n'est mesuré, l'appareil ne compte
   * plus. La frappe reste à l'acte 7. */
  it('met les mains sur la grille, puis fait entendre l’absence', () => {
    const verbes = niveauxDeLActe(ACTES[0]).map((n) => LEVELS.find((x) => x.id === n)!.exercise);
    expect(verbes).toEqual(['reproduire', 'reproduire', 'reproduire', 'silence']);
  });

  it('ne mesure aucun instant : pas un seul exercice de frappe', () => {
    for (const n of niveauxDeLActe(ACTES[0])) {
      expect(LEVELS.find((x) => x.id === n)!.exercise, `niveau ${n}`).not.toBe('jouer');
    }
  });

  /* Les trois grilles sont une COURBE, donc écrites : la deuxième ajoute un
   * coup hors des temps, la troisième une deuxième ligne et le contretemps
   * ailleurs. Un générateur de densité ne sait pas ce qu'il vient d'ajouter. */
  it('écrit ses trois grilles, et n’en tire aucune', () => {
    const grilles = niveauxDeLActe(ACTES[0])
      .map((n) => LEVELS.find((x) => x.id === n)!)
      .filter((l) => l.exercise === 'reproduire');
    expect(grilles.length).toBe(3);
    for (const l of grilles) {
      expect(l.grille, `niveau ${l.id} : tiré au sort`).toBeTruthy();
      const k = l.grille!.kick.slice(0, l.grille!.subdiv.kick);
      expect(k.filter((v) => v > 0).length, `niveau ${l.id}`).toBeGreaterThanOrEqual(2);
    }
    const horsTemps = (l: (typeof grilles)[number]) =>
      l.grille!.kick.slice(0, l.grille!.subdiv.kick).filter((v, i) => v > 0 && i % 2 === 1).length;
    expect(horsTemps(grilles[0]), 'le premier ne pose que les temps').toBe(0);
    expect(horsTemps(grilles[1]), 'le deuxième pose un contretemps').toBe(1);
    expect(horsTemps(grilles[2]), 'le troisième aussi, ailleurs').toBe(1);
    const place = (l: (typeof grilles)[number]) =>
      l.grille!.kick.findIndex((v, i) => v > 0 && i % 2 === 1);
    expect(place(grilles[2])).not.toBe(place(grilles[1]));
    // Une seule ligne aux deux premiers, une deuxième au troisième.
    const lignes = (l: (typeof grilles)[number]) =>
      (['kick', 'snare', 'hat'] as const).filter((r) => l.grille![r].some((v) => v > 0)).length;
    expect(grilles.map(lignes)).toEqual([1, 1, 2]);
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
   * — ⚠️ « Supprimer : trop facile » (2026-09-04, en jouant) : le 67 à son
   *   tour. Deux lignes, huit cases, le backbeat le plus répandu du monde —
   *   après un acte 0 où l'on a déjà TAPÉ trois rythmes à la main, la première
   *   marche de l'acte descendait au lieu de monter.
   *
   * Les trois restent au réservoir : un niveau ne se supprime jamais. */
  /* ⚠️ Et il ouvre sur le 3 depuis la fusion des actes 1 et 2 (2026-11-24) :
   * le 68, qui ouvrait, ajoutait d'un coup la claire, la double-croche et une
   * troisième ligne. Le 3 n'ajoute que la claire à la fin de l'acte 0 — le 67
   * reste au réservoir, il serait une marche vers le BAS (deux lignes, l'acte 0
   * en posant déjà deux). */
  it('ne cite plus les niveaux 1, 2 ni 67 — il ouvre sur UNE nouveauté', () => {
    for (const retire of [1, 2, 67]) {
      expect(niveauxDeLActe(ACTES[1]), `niveau ${retire}`).not.toContain(retire);
    }
    const premier = LEVELS.find((l) => l.id === niveauxDeLActe(ACTES[1])[0])!.grille!;
    const finActe0 = LEVELS.find((l) => l.id === niveauxDeLActe(ACTES[0]).filter((n) => LEVELS.find((x) => x.id === n)!.grille).at(-1))!.grille!;
    // Même résolution, même charley : seule la claire entre.
    expect(premier.subdiv).toEqual(finActe0.subdiv);
    expect(premier.hat).toEqual(finActe0.hat);
    expect(finActe0.snare.some((v) => v > 0)).toBe(false);
    expect(premier.snare.some((v) => v > 0)).toBe(true);
  });

  /* ⚠️ Les variantes (rim shot, charley ouvert) et les rafales ont déménagé de
   * l'acte 2 vers ici : « on ne comprend pas pourquoi il y a les rafales et
   * les charleys ouverts, rim shot, personne n'explique, ce n'est pas lié au
   * groove ». Ce sont deux gestes de GRILLE, donc de l'acte qui l'enseigne —
   * et ils sont montrés à l'écran avant d'être demandés. */
  /* ⚠️ La RAFALE a quitté la carrière avec les niveaux 8 et 61 (2026-11-24) :
   * un geste caché (appui long) de plus, sur des grilles de 48 cases, dans
   * l'acte où les testeurs décrochaient. Le cahier de FB-015 ne l'exige plus. */
  it('enseigne la variante, l’explique avant de la demander, et ne demande plus de rafale', () => {
    const e = ACTES[1].etapes;
    const niveaux = niveauxDeLActe(ACTES[1]);
    expect(niveaux).toContain(60);
    for (const retire of [8, 61]) expect(niveaux).not.toContain(retire);
    const premierAvecVariante = e.findIndex((x) => x.kind === 'exercice' && x.niveau === 60);
    const explication = e.findIndex(
      (x) => x.kind === 'recit' && x.lignes.join(' ').includes('rim shot'),
    );
    expect(explication).toBeGreaterThanOrEqual(0);
    expect(explication).toBeLessThan(premierAvecVariante);
    for (const n of niveaux) {
      const g = LEVELS.find((l) => l.id === n)!.grille;
      const rafales = g?.rolls ? Object.values(g.rolls).flat().filter((x) => (x as number) > 1) : [];
      expect(rafales, `niveau ${n}`).toEqual([]);
    }
  });

  /* La livraison — « sortir une vraie sonnerie de téléphone avec […] ce qui
   * peut être drôle, c'est de l'exporter et de proposer d'en faire la sonnerie
   * de son téléphone/réveil matin ». Elle clôt l'acte qui ouvre l'Atelier :
   * placée ailleurs, elle enverrait dans un module encore cadenassé. */
  /* ⚠️ Depuis la fusion, la livraison n'est plus la DERNIÈRE étape : Kelvin
   * arrive juste après, et sa commande a besoin de l'Atelier. C'est donc la
   * livraison elle-même qui l'ouvre (`ETAPE_DU_MODULE`), et elle précède la
   * commande — sinon le joueur serait envoyé dans un module cadenassé. */
  it('livre la sonnerie, ouvre l’Atelier à cette étape, puis passe à Kelvin', () => {
    const e = ACTES[1].etapes;
    const iLivraison = e.findIndex((x) => x.kind === 'livraison');
    const iCommande = e.findIndex((x) => x.kind === 'commande');
    expect(ACTES[1].module).toBe('atelier');
    expect(iLivraison).toBeGreaterThan(0);
    expect(iCommande).toBeGreaterThan(iLivraison);
    expect(ETAPE_DU_MODULE.atelier).toBe(iLivraison);
    expect(moduleUnlocked('atelier', { level: 1, acte: 1, etape: iLivraison - 1 })).toBe(false);
    expect(moduleUnlocked('atelier', { level: 1, acte: 1, etape: iLivraison })).toBe(true);
    const l = e[iLivraison];
    if (l.kind !== 'livraison') return;
    expect(l.bouton.length).toBeGreaterThan(0);
    expect(l.lignes.join(' ')).toMatch(/sonnerie|réveil/i);
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
    const iLivraison = e.findIndex((x) => x.kind === 'livraison');
    const dernierExo = e.slice(0, iLivraison).map((x) => x.kind).lastIndexOf('exercice');
    game.etapeActive = dernierExo;
    game.demarrerEtape();
    // On réussit l'exercice, puis on lit ce qui reste avant la livraison.
    // (Les mêmes tableaux des deux côtés : `comparerGrilles` compare des
    // valeurs, la proposition est donc exacte.)
    game.guess = { ...game.target };
    game.guessRolls = { ...game.targetRolls };
    expect(game.verify()).toBe(true);
    for (let i = dernierExo; i < iLivraison; i++) game.avancerCarriere();
    expect(game.etapeCourante?.kind).toBe('livraison');

    const st = game.toAtelierState();
    const coups = (['kick', 'snare', 'hat'] as const).reduce(
      (n, r) => n + st.rows[r].pattern.filter((v) => v > 0).length,
      0,
    );
    expect(coups).toBeGreaterThan(0);
    /* ⚠️ Et RIEN d'autre (2026-11-24) : la sonnerie arrivait dans l'Atelier
     * avec le synthé et le clap du motif d'accueil, que personne n'avait
     * posés. */
    for (const r of ['clap', 'shaker'] as const) {
      expect(st.rows[r].pattern.some((v) => v > 0), `ligne ${r}`).toBe(false);
    }
    for (const r of ['bass', 'melody'] as const) {
      expect(st.synthRows[r].pattern.some((v) => v !== null), `synthé ${r}`).toBe(false);
    }
    expect(st.synthRows.pad.pattern.some((v) => v !== null && v !== -1), 'nappe').toBe(false);
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

/* ⚠️ LE GROOVE N'A PLUS SON ACTE — fusionné dans celui du rythme le 2026-11-24.
 *
 * *« Fusionner les actes 1 & 2. Trop de niveaux avec swing et décalage, pas
 * intéressant et trop difficile »* (Yann), après des testeurs qui n'avaient
 * jamais dépassé l'acte du rythme. Ce qui en reste, et que ces tests tiennent :
 *
 * - le balancement s'apprend d'abord ÉCRIT (le charley en triolets, niveau 82),
 *   puis par UN réglage au curseur (48) — plus de reproduction à feel ;
 * - le DÉCALAGE sort entièrement de la carrière, exercices ET cahier : on ne
 *   demande pas un geste qu'aucun écran n'enseigne ;
 * - le charley « commence à 8, passe à 16 et finit à 12 », puis la polyrythmie
 *   ferme la partie grille de l'acte ;
 * - l'aléa reste dans le cahier de Kelvin, jamais en exercice.
 *
 * Les trois arbitrages de l'ancien acte 2 (grilles sans variante, grilles
 * toutes différentes, régler avant reposer) s'éteignent avec ses grilles :
 * 14, 23, 72, 63, 71 et 47 sont au réservoir. */
describe('Le groove, dans l’acte du rythme', () => {
  const e = () => ACTES[1].etapes;
  const ou = (pred: (x: ReturnType<typeof e>[number]) => boolean) => e().findIndex(pred);
  const exo = (n: number) => ou((x) => x.kind === 'exercice' && x.niveau === n);

  it('le charley passe de 8 à 16 puis à 12, et la polyrythmie vient en dernier', () => {
    const grilles = niveauxDeLActe(ACTES[1])
      .map((n) => LEVELS.find((x) => x.id === n)!)
      .filter((l) => l.grille);
    const charley = grilles.map((l) => l.grille!.subdiv.hat);
    const premiere = (v: number) => charley.indexOf(v);
    expect(premiere(8), 'le charley commence à 8').toBe(0);
    expect(premiere(16)).toBeGreaterThan(premiere(8));
    const triolets = grilles.findIndex((l) => Object.values(l.grille!.subdiv).every((v) => v === 12));
    expect(triolets, 'une grille entièrement en triolets').toBeGreaterThan(premiere(16));
    // Une POLYRYTHMIE : une ligne en douze contre une en seize, sur la même mesure.
    const poly = grilles.findIndex((l) => {
      const v = Object.values(l.grille!.subdiv);
      return v.includes(12) && v.includes(16);
    });
    expect(poly, 'la polyrythmie après les triolets').toBeGreaterThan(triolets);
    expect(poly, 'et elle ferme la partie grille').toBe(grilles.length - 1);
  });

  it('82 — trois coups par temps sur les trois lignes, et la syncope acquise reste', () => {
    const g = LEVELS.find((x) => x.id === 82)!.grille!;
    expect(g.subdiv).toEqual({ kick: 12, snare: 12, hat: 12 });
    expect(g.hat.every((v) => v === 1), 'le charley joue ses douze coups').toBe(true);
    expect(g.kick.some((v, i) => v > 0 && i % 3 !== 0), 'le kick sort du temps').toBe(true);
    expect(g.swing ?? 0, 'le balancement est ÉCRIT, pas réglé').toBe(0);
  });

  it('ÉCRIT d’abord, RÉGLÉ ensuite — un seul réglage, et l’Atelier est déjà ouvert', () => {
    const iLivraison = ou((x) => x.kind === 'livraison');
    expect(exo(82)).toBeGreaterThan(iLivraison);
    expect(exo(48)).toBeGreaterThan(exo(82));
    expect(exo(74)).toBeGreaterThan(exo(48));
    expect(ou((x) => x.kind === 'commande')).toBeGreaterThan(exo(74));
    const params = niveauxDeLActe(ACTES[1])
      .map((n) => LEVELS.find((x) => x.id === n)!)
      .filter((l) => l.exercise !== 'reproduire');
    expect(params.map((l) => l.id), 'un seul exercice de paramètre').toEqual([48]);
    expect(params[0].exercise).toBe('regler');
    expect(params[0].paramsAutorises).toEqual(['swing']);
  });

  it('⚠️ le DÉCALAGE n’est demandé nulle part dans la carrière', () => {
    for (const a of ACTES) {
      for (const n of niveauxDeLActe(a)) {
        const l = LEVELS.find((x) => x.id === n)!;
        expect(l.paramsAutorises ?? [], `acte ${a.id}, niveau ${n}`).not.toContain('shiftPct');
        const shift = l.grille?.shift ?? {};
        expect(Object.values(shift).every((v) => v === 0), `acte ${a.id}, niveau ${n} : décalage écrit`).toBe(true);
      }
      for (const x of a.etapes) {
        if (x.kind !== 'commande') continue;
        expect(x.cahier.map((c) => c.id), `acte ${a.id}, ${x.entete}`).not.toContain('ligne-glisse');
      }
    }
  });

  /* L'aléa reste où l'ancien acte 2 l'avait mis : dans le cahier de Kelvin,
   * jamais en exercice — on ne reconnaît pas des ghost notes, on en pose. */
  it('demande l’aléa dans la LIVRAISON de Kelvin, pas dans un exercice', () => {
    const cmd = e().find((x) => x.kind === 'commande');
    if (cmd?.kind !== 'commande') throw new Error('pas de commande');
    expect(cmd.client).toBe('KELVIN');
    expect(cmd.cahier.map((c) => c.id)).toContain('alea');
    for (const n of niveauxDeLActe(ACTES[1])) {
      const l = LEVELS.find((x) => x.id === n)!;
      for (const p of l.paramsAutorises ?? []) {
        expect(['ghostDensity', 'randomVelocity', 'spontRoll'], `niveau ${n}`).not.toContain(p);
      }
    }
  });
});

/* L'acte 4 — le premier acte dont la leçon n'est pas un son mais un ENDROIT.
 *
 * « Poursuis » : après la mélodie vient la production, et c'est elle qui ouvre
 * le module Production.
 */
describe('L’acte 3 fait entendre ce qu’aucun texte ne peut dire', () => {
  it('est jouable, et ouvre la Production', () => {
    const acte4 = ACTES[3];
    expect(acteAVenir(acte4)).toBe(false);
    expect(acte4.module).toBe('production');
    expect(moduleUnlocked('production', { level: 1, acte: 3 })).toBe(false);
    expect(moduleUnlocked('production', { level: 1, acte: 4 })).toBe(true);
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
    expect(niveauxDeLActe(ACTES[3])).toEqual([]);
  });

  it('enchaîne trois envois du même morceau, et le premier ne juge que le morceau', () => {
    const cmds = ACTES[3].etapes.filter((e) => e.kind === 'commande') as Array<{
      entete: string;
      cahier: Array<{ id: string }>;
      partirDeLaLivraison?: boolean;
    }>;
    expect(cmds).toHaveLength(3);
    // Le premier : rien de mixage, il ne demande QUE d'avoir fait le morceau.
    /* ⚠️ `filtre-geste` depuis le 2026-09-04 : le filtre du SYNTHÉ se mesure
     * contre le départ et non par un seuil absolu (voir `aBaisseLeFiltre`).
     * Sans lui dans cette liste, le deuxième envoi « ne serait plus que du
     * mixage » aux yeux du test alors qu'il l'est resté. */
    const mix = [
      'filtre-9000', 'filtre-geste', 'contraste', 'kick-porte',
      'reverb-dosee', 'delay', 'retouchees',
    ];
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
    const cmds = ACTES[3].etapes.filter((e) => e.kind === 'commande') as Array<{
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
    const e = ACTES[3].etapes;
    const i = e.findIndex((x) => x.kind === 'commande' && /DEUXIÈME/.test(x.entete));
    const avant = e
      .slice(0, i)
      .flatMap((x) => (x.kind === 'recit' ? x.lignes : []))
      .join(' ');
    expect(avant).toMatch(/laverie/i);
    expect(avant).toMatch(/haut-parleur/i);
  });
});

/* L'acte 4 — celui qui avait l'air d'être une liste.
 *
 * Quinze genres à produire : la tentation était quinze niveaux de
 * reproduction, c'est-à-dire le même exercice quinze fois. Sa vraie scène est
 * ailleurs — le commercial qui n'arrive pas à dire ce qu'il veut et finit par
 * le fredonner.
 */
/* Les contraintes qui portent sur une ligne de SYNTHÉ — présence, phrase,
 * harmonie, texture. Une seule définition : deux listes qui doivent rester
 * d'accord finissent par ne plus l'être. */
function estContrainteDeSynthe(id: string): boolean {
  return (
    id.startsWith('synth:') ||
    id.startsWith('phrase:') ||
    id.startsWith('tonique:') ||
    id.startsWith('voix:') ||
    id.startsWith('glide:') ||
    id.startsWith('progression-') ||
    id === 'basse-tient' ||
    id === 'basse-accord' ||
    id === 'nappe-respire'
  );
}

describe('L’acte 4 fait NOMMER les genres avant de les refaire', () => {
  it('est jouable, et n’ouvre aucun module', () => {
    expect(acteAVenir(ACTES[4])).toBe(false);
    // Rien à déverrouiller : l'acte ne paie aucune dette mécanique, ce qui est
    // précisément ce qui le rend bon marché à écrire.
    expect(ACTES[4].module).toBeNull();
  });

  it('commence par reconnaître, puis reconstruit', () => {
    const verbes = niveauxDeLActe(ACTES[4]).map(
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
   * **aucun rythme de l'acte 4 n'est TIRÉ**. Un genre reconnu sur une grille
   * générique n'est pas un genre, et une polyrythmie tirée au sort n'apprend
   * pas ce qu'est une polyrythmie. Chaque exercice est donc soit le verbe
   * `style`, soit un preset réel, soit une grille écrite. */
  it('ne joue aucun rythme tiré au sort', () => {
    for (const n of niveauxDeLActe(ACTES[4])) {
      const l = LEVELS.find((x) => x.id === n)!;
      if (l.exercise === 'style') continue;
      expect(
        Boolean(l.presetId) || Boolean(l.grille),
        `niveau ${n} : ni preset, ni grille écrite — il serait généré`,
      ).toBe(true);
    }
  });

  /* ⚠️ RÉANCRÉ le 2026-09-04. Le test comptait les FAMILLES de presets
   * reproduits dans l'acte — il en exigeait deux. Depuis que les
   * reconstructions sont passées en Atelier (*« à faire en atelier en
   * intégrant le synthé »*, Yann), il n'en reste qu'une, et le test tombait
   * sur une population d'un seul élément : exactement le garde-fou vide déjà
   * payé quand `lequel` a quitté la carrière.
   *
   * Ce qu'il tient maintenant est ce que l'acte promet vraiment : QUATRE cases
   * de fax, quatre séries, et jamais deux fois le même genre. */
  it('couvre les quatre cases du fax, et jamais deux fois le même genre', () => {
    const cmds = ACTES[4].etapes.filter((e) => e.kind === 'commande') as Array<{
      serie?: string;
      cahier: Array<{ id: string }>;
    }>;
    const series = [...new Set(cmds.map((c) => c.serie))];
    expect(series, 'une case du fax = une série').toHaveLength(4);
    for (const s of series) expect(s, 'une série vide se ferait écraser').toBeTruthy();
    const fiches = cmds.flatMap((c) =>
      c.cahier.flatMap((l) => (l.id.startsWith('fiche:') ? [l.id.slice(6)] : [])),
    );
    expect(new Set(fiches).size, 'deux commandes sur le même genre').toBe(fiches.length);
    expect(fiches.length, 'plus aucun genre jugé').toBeGreaterThanOrEqual(3);
  });

  /* ⚠️ LA CASE QUI NE JUGE PAS DE GENRE, et pourquoi c'en est une bonne.
   *
   * *« On vient déjà de travailler le hip-hop avec Kelvin. Autant dire qu'on
   * reprend le travail déjà fait avec Kelvin et on centre l'exercice sur le
   * travail du synthé »* (Yann). Son rythme a donc DÉJÀ été accepté à l'acte 2 :
   * lui redemander une fiche de style ferait repasser un examen réussi, et le
   * morceau de Kelvin pourrait même la cocher à l'ouverture. Ce qui la tient
   * honnête à la place : elle repart de cette livraison-là, et n'exige que ce
   * que l'acte 2 ne demande pas. */
  it('⚠️ la case hip-hop reprend le morceau de Kelvin au lieu de rejuger le genre', () => {
    const hh = ACTES[4].etapes.find(
      (e) => e.kind === 'commande' && e.serie === 'hip-hop',
    ) as unknown as { partirDuMorceauDeLActe?: number; serieDuMorceau?: string; cahier: Array<{ id: string }> };
    expect(hh.partirDuMorceauDeLActe, 'elle doit repartir de l’acte de Kelvin').toBe(1);
    // ⚠️ Et par sa SÉRIE : l'acte 1 livre aussi la sonnerie depuis la fusion.
    expect(hh.serieDuMorceau).toBe('kelvin');
    expect(hh.cahier.some((c) => c.id.startsWith('fiche:'))).toBe(false);
    // L'acte 2 n'exige aucune ligne de synthé : c'est donc là qu'est le travail.
    expect(hh.cahier.some((c) => estContrainteDeSynthe(c.id))).toBe(true);
  });

  /* ⚠️ LE SYNTHÉ EST LE SUJET DE L'ACTE, et son exigence MONTE.
   *
   * C'est le cœur de la relecture du 2026-09-04 : l'acte des styles jugeait
   * quatre grilles de batterie et laissait la mélodie, la basse et la nappe
   * hors du cahier — *« il faut intégrer un cahier des charges pour le synthé
   * adapté à la difficulté du niveau dans l'acte »*. Chaque case en demande
   * donc, et chaque case en demande au moins autant que la précédente.
   *
   * ⚠️ Le compte se fait sur la CASE ENTIÈRE (la série), pas sur son dernier
   * envoi : trois des quatre cases se jouent en deux temps — le squelette,
   * puis le son — et lire le seul dernier envoi dirait que le club exige moins
   * que le hip-hop alors qu'il exige la basse en plus, un envoi plus tôt.
   * Mesurer une chaîne sur son dernier maillon, c'est mesurer la moitié du
   * travail. Un test qui ne regarderait que la présence, lui, laisserait
   * l'acte redescendre à une ligne de basse partout. */
  it('⚠️ chaque case du fax exige le synthé, et l’exigence ne redescend jamais', () => {
    const cmds = ACTES[4].etapes.filter((e) => e.kind === 'commande') as Array<{
      serie?: string;
      cahier: Array<{ id: string }>;
    }>;
    const parCase = new Map<string, number>();
    for (const c of cmds) {
      const n = c.cahier.filter((l) => estContrainteDeSynthe(l.id)).length;
      parCase.set(c.serie!, (parCase.get(c.serie!) ?? 0) + n);
    }
    let precedent = 0;
    for (const [serie, n] of parCase) {
      expect(n, `la case « ${serie} » n’exige rien du synthé`).toBeGreaterThan(0);
      expect(n, `la case « ${serie} » en demande moins que la précédente`).toBeGreaterThanOrEqual(
        precedent,
      );
      precedent = n;
    }
  });

  // Le mot du récit et le verbe de l'écran sont le même : si le texte fait
  // fredonner un genre, l'exercice doit demander de le nommer.
  it('pose la scène du genre qu’on ne sait pas nommer', () => {
    const avant = ACTES[4].etapes
      .slice(0, ACTES[4].etapes.findIndex((e) => e.kind === 'exercice'))
      .flatMap((e) => (e.kind === 'recit' ? e.lignes : []))
      .join(' ');
    expect(avant).toMatch(/fredonn/i);
    expect(avant).toMatch(/dancehall/i);
  });
});

/* L'acte 5 — celui où le cahier des charges devait presque disparaître.
 *
 * « Aucun brief. Aucun client. Aucun style imposé. […] Cette fois, personne ne
 * te dit si c'est bon. » C'est ce texte qui donne sa forme à toute la
 * mécanique de commande : la sévérité DÉCROÎT avec le récit.
 */
describe('L’acte 5 ne commande rien, il demande de faire', () => {
  const acte6 = () => ACTES[5];

  /* ⚠️ SEPT commandes depuis le crescendo du 2026-09-17 : deux morceaux de
   * DEUX boucles, puis un de TROIS (*« il faut y aller crescendo dans les
   * morceaux »*). Elles étaient neuf depuis le 2026-09-05, quand l'acte est
   * passé d'un morceau à trois (*« J'imaginais 3 morceaux, il n'y en a qu'un
   * seul »*). Ce qui ne change pas — et c'est le fond de l'acte — c'est
   * qu'aucune d'elles n'exige un GOÛT : elles demandent un couplet, puis qu'il
   * s'ouvre, et une seule fois qu'il retombe. */
  const boucles6 = () =>
    acte6().etapes.filter((e) => e.kind === 'commande') as Array<{
      entete: string;
      serie?: string;
      partirDeLaSerie?: string;
      cahier: Array<{ id: string }>;
    }>;

  /** Les boucles groupées par morceau, dans l'ordre du récit — deux, deux,
   *  trois. Le morceau est le préfixe de la série (« passe », « seul »,
   *  « attend »). */
  const parMorceau6 = () => {
    const m = new Map<string, ReturnType<typeof boucles6>>();
    for (const c of boucles6()) {
      const cle = (c.serie ?? '').split('-')[0];
      m.set(cle, [...(m.get(cle) ?? []), c]);
    }
    return m;
  };

  it('est jouable, et ne travaille qu’à l’Atelier — trois morceaux, sept boucles', () => {
    expect(acteAVenir(acte6())).toBe(false);
    expect(acte6().etapes.some((e) => e.kind === 'exercice')).toBe(false);
    const cmds = boucles6();
    expect(cmds).toHaveLength(7);
    // Une série par boucle, sinon la discographie n'en garderait qu'une.
    const series = cmds.map((c) => c.serie);
    expect(new Set(series).size, 'deux boucles sous la même série').toBe(7);
    for (const se of series) expect(se, 'une boucle sans série').toBeTruthy();
    expect(parMorceau6().size, 'il ne reste pas trois morceaux').toBe(3);
  });

  /* ⚠️ LE CRESCENDO, et c'est une demande : *« il faut y aller crescendo dans
   * les morceaux, faire d'abord deux morceaux nécessitant que 2 boucles puis un
   * dernier morceau avec 3 boucles »* (Yann, 2026-09-17).
   *
   * Ce que le test tient, et qui est plus que le compte : la courbe ne
   * REDESCEND jamais, et la troisième boucle est la DERNIÈRE du disque. Écrit
   * comme « 2, 2, 3 » en dur, il passerait aussi sur « 3, 2, 2 », qui est
   * l'inverse de ce qui est demandé. */
  it('⚠️ va CRESCENDO — deux boucles, deux boucles, puis trois', () => {
    const tailles = [...parMorceau6().values()].map((b) => b.length);
    expect(tailles, 'ce n’est plus deux, deux, trois').toEqual([2, 2, 3]);
    for (let i = 1; i < tailles.length; i++)
      expect(tailles[i], `le morceau ${i + 1} en demande moins que le précédent`)
        .toBeGreaterThanOrEqual(tailles[i - 1]);
    // Et le plus long est le dernier : un disque ne finit pas sur sa boucle facile.
    expect(Math.max(...tailles)).toBe(tailles[tailles.length - 1]);
  });

  /* ⚠️ Les deux boucles qui suivent le couplet se jugent CONTRE lui, jamais
   * dans l'absolu : un refrain n'a pas de définition, il s'ouvre par rapport au
   * couplet. Elles repartent donc de sa série — celle de LEUR morceau, et pas
   * « de la dernière livrée », qui ferait écrire le pont contre le refrain et,
   * depuis qu'il y a trois morceaux, contre la boucle d'un autre morceau. */
  it('⚠️ le refrain et le pont repartent du COUPLET de LEUR morceau', () => {
    for (const [nom, b] of parMorceau6()) {
      expect(b[0].partirDeLaSerie, `« ${nom} » : le couplet part de rien`).toBeUndefined();
      for (const c of b.slice(1)) {
        expect(c.partirDeLaSerie, `« ${c.serie} »`).toBe(b[0].serie);
        // Et son cahier mesure bien un ÉCART, sinon « repartir de » ne sert à rien.
        expect(
          c.cahier.some((l) =>
            ['plus-fourni', 'moins-fourni', 'ligne-entre', 'ligne-sort'].includes(l.id),
          ),
          `« ${c.serie} » ne se compare à rien`,
        ).toBe(true);
      }
    }
  });

  /* ⚠️ CE QUI MANQUAIT, et le retour qui l'a trouvé : *« le travail n'est pas
   * suffisant pour le refrain et le pont, il faut un cahier des charges plus
   * complet avec un travail sur la mélodie »* (Yann, 2026-09-05). Les quatre
   * contraintes de la première version ne comptaient que des COUPS — un refrain
   * qui s'ouvre en ajoutant un shaker passait. Chaque refrain et chaque pont
   * doit donc demander une AUTRE PHRASE, et dire dans quel sens elle bouge. */
  it('⚠️ chaque refrain et chaque pont travaille la MÉLODIE, pas que les coups', () => {
    const manquent: string[] = [];
    for (const [, b] of parMorceau6()) {
      for (const c of b.slice(1)) {
        const ids = c.cahier.map((l) => l.id);
        if (!ids.includes('autre-phrase:melody')) manquent.push(`${c.serie} : pas d’autre phrase`);
        const sens = ids.some(
          (i) => i === 'phrase-monte:melody' || i === 'phrase-eclaircit:melody',
        );
        if (!sens) manquent.push(`${c.serie} : la phrase ne bouge dans aucun sens`);
      }
    }
    expect(manquent, manquent.join(' · ')).toEqual([]);
  });

  /* ⚠️ Un refrain MONTE, un pont S'ÉCLAIRCIT — et jamais l'inverse. C'est ce
   * qui distingue les deux sections ; les intervertir donnerait deux ponts. */
  it('⚠️ le refrain monte, le pont s’éclaircit', () => {
    /* ⚠️ UN SEUL PONT depuis le crescendo — et le test l'exige au lieu de le
     * tolérer : écrit avec un `if (pont)` silencieux, il passerait aussi le
     * jour où plus aucun morceau n'en aurait, c'est-à-dire là où la leçon du
     * pont ne s'appliquerait à rien. */
    const ponts = [...parMorceau6().values()].filter((b) => b.length > 2);
    expect(ponts, 'il n’y a plus exactement un pont dans l’acte').toHaveLength(1);
    for (const [nom, b] of parMorceau6()) {
      const [, refrain, pont] = b;
      const ids = (c: (typeof b)[number]) => c.cahier.map((l) => l.id);
      expect(ids(refrain), `« ${nom} » refrain`).toContain('phrase-monte:melody');
      expect(ids(refrain), `« ${nom} » refrain`).toContain('plus-fourni');
      if (!pont) continue;
      expect(ids(pont), `« ${nom} » pont`).toContain('phrase-eclaircit:melody');
      /* ⚠️ ET SURTOUT PAS `moins-fourni` : retiré le 2026-09-16. Le compte
       * était relatif au couplet que le joueur avait choisi, donc un couplet
       * sobre rendait le pont presque vide — la consigne restait satisfaisable
       * et n'avait plus de sens musical. Ce qui décrit le geste reste : une
       * ligne se tait, la phrase s'éclaircit. */
      expect(ids(pont), `« ${nom} » pont`).not.toContain('moins-fourni');
      expect(ids(pont), `« ${nom} » pont`).toContain('ligne-sort');
    }
  });

  /* ⚠️ Les trois morceaux ne se distinguent NI par un client NI par un genre —
   * la phrase de l'acte est « aucun brief, aucun client, aucun style imposé ».
   * Ils se distinguent par une INTENTION, et une intention se lit dans ce que le
   * cahier demande de FAIRE : deux morceaux dont les neuf cahiers seraient
   * identiques ne seraient qu'un morceau écrit trois fois. */
  it('⚠️ les trois morceaux ont des cahiers DIFFÉRENTS, sans client ni genre', () => {
    const empreintes = [...parMorceau6().values()].map((b) =>
      b.map((c) => c.cahier.map((l) => l.id).join('+')).join('|'),
    );
    expect(new Set(empreintes).size, 'deux morceaux demandent exactement la même chose').toBe(3);
    // Et aucun ne convoque un style ni un verrou de provenance.
    for (const c of boucles6()) {
      const ids = c.cahier.map((l) => l.id);
      expect(ids.some((i) => i.startsWith('style')), `« ${c.serie} »`).toBe(false);
      expect(ids, `« ${c.serie} »`).not.toContain('pas-un-preset');
    }
  });

  /* ⚠️ L'ACTE 5 PRÉPARE, IL NE MONTRE PAS LA CONSOLE — 2026-09-16, et ça
   * renverse l'arbitrage du 2026-09-14 que ce test gardait.
   *
   * Ce que le jeu a montré : *« fin de l'acte 5 : on découvre le mode live et
   * on ne joue qu'un seul des morceaux »*, puis *« acte 6 : on a le mode live
   * pour le premier morceau (de nouveau) »*. Un seul défaut, vu deux fois — la
   * scène d'ici montait UN morceau (une architecture décrit un morceau), donc
   * le concert recommençait avec lui. On prépare ici, on joue là-bas.
   *
   * Ce que le test garde, et qui est l'essentiel : les sept boucles ne se
   * perdent pas. Elles n'ont jamais eu besoin d'une scène pour exister — c'est
   * le SET de l'acte 6 qui les range toutes en banque (`depuisLActe: 5`), et
   * c'est là qu'on les joue. Voir « monte le DISQUE en set » plus bas. */
  it('⚠️ ne monte AUCUNE scène — la console est pour le 14 juin', () => {
    expect(acte6().etapes.some((e) => e.kind === 'scene'), 'une scène est revenue').toBe(false);
    expect(acte6().module, 'l’acte 5 n’ouvre plus le Mode Live').toBeNull();
    /* ⚠️ Et il ne le NOMME pas non plus : un module fermé ne se nomme pas, pas
     * même dans une réplique. C'est la règle qui a fait masquer les cadenas. */
    const texte = acte6()
      .etapes.flatMap((e) => (e.kind === 'recit' ? [e.entete, ...e.lignes] : []))
      .join(' ')
      .toLowerCase();
    expect(texte, 'l’acte 5 nomme le Mode Live').not.toContain('mode live');
  });

  /* ⚠️ …mais les sept boucles doivent toutes ATTERRIR quelque part, et c'est
   * l'acte 6 qui les reprend. Ce test croise les deux actes : une série livrée
   * ici et oubliée là-bas serait un morceau produit que personne ne rejoue. */
  it('⚠️ et ses sept séries sont TOUTES reprises par le concert', () => {
    const series = acte6().etapes.flatMap((e) => (e.kind === 'commande' ? [e.serie] : []));
    expect(series).toHaveLength(7);
    const set = ACTES[6].etapes.find(
      (e) => e.kind === 'scene' && e.depuisLActe === 5,
    ) as Extract<Etape, { kind: 'scene' }> | undefined;
    expect(set, 'aucune scène de l’acte 6 ne reprend l’acte 5').toBeTruthy();
    expect(set?.bouclesDeLActe?.map((b) => b.serie)).toEqual(series);
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
   * Demande de Yann (2026-09-01) : *« l'acte 5, le plus complet du jeu »*. Elle
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
      a.id === 5 ? [] : a.etapes.flatMap((e) => (e.kind === 'commande' ? [e.cahier.length] : [])),
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
   * encore ouvert. L'acte 1 est celui qui donne la clé : sa LIVRAISON (un
   * cadeau, pas une épreuve) ouvre l'Atelier, et la première vraie commande ne
   * peut arriver qu'après — depuis la fusion, dans le même acte. */
  it('jamais avant l’étape qui ouvre l’Atelier', () => {
    for (const a of ACTES) {
      a.etapes.forEach((e, i) => {
        if (e.kind !== 'commande') return;
        expect(a.id, `acte ${a.id}`).toBeGreaterThanOrEqual(1);
        expect(moduleUnlocked('atelier', { level: 1, acte: a.id, etape: i }), `acte ${a.id}, étape ${i}`).toBe(true);
        if (a.id === 1) expect(i).toBeGreaterThan(ETAPE_DU_MODULE.atelier);
      });
    }
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
   * d'un acte, il ne reste plus rien à PRODUIRE. Sinon la livraison cesse
   * d'être une fin et devient une étape parmi d'autres.
   *
   * ⚠️ Le test disait « que du récit », et il a fallu le préciser le
   * 2026-09-04 : l'acte 6 finit par une SCÈNE, qui monte ses trois boucles en
   * set et les fait jouer. Une scène ne produit rien — elle ne se note pas, ne
   * range rien dans la discographie et n'a pas de cahier. Ce que la règle
   * interdit après la dernière livraison, ce sont les COMMANDES et les
   * LIVRAISONS ; interdire aussi de jouer ce qu'on vient de faire était un
   * effet de bord de la formulation, pas la règle.
   *
   * ⚠️ Et un MONTAGE non plus (2026-09-17) : il ne se note pas, ne range rien
   * dans la discographie et n'a pas de cahier — il ORDONNE ce qui vient d'être
   * produit. Même raison que la scène, à laquelle il sert de moitié
   * « préparation ». */
  it('la dernière d’un acte n’est suivie de rien à PRODUIRE', () => {
    for (const a of ACTES) {
      const idx = a.etapes.flatMap((e, i) => (e.kind === 'commande' ? [i] : []));
      if (!idx.length) continue;
      for (const e of a.etapes.slice(idx[idx.length - 1] + 1)) {
        expect(['recit', 'scene', 'montage'], `acte ${a.id} : une étape « ${e.kind} »`).toContain(
          e.kind,
        );
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
    expect(avecCommande).toEqual([1, 2, 3, 4, 5]);
  });
});

/* L'acte 7 — le dernier, et le seul où l'on ne produit pas : on joue.
 *
 * Il ferme aussi la boucle du récit : Sol dit le nom du joueur au micro.
 */
describe('L’acte 6 joue, et n’ouvre plus rien', () => {
  const acte7 = () => ACTES[6];

  it('⚠️ est jouable, et c’est LUI qui ouvre le Mode Live', () => {
    expect(acteAVenir(acte7())).toBe(false);
    /* ⚠️ Renversé le 2026-09-16 : l'acte 5 l'ouvrait depuis le 2026-09-14, et
     * ça faisait découvrir la console pour un seul morceau, que l'acte 6
     * rejouait. *« Le mode live serait offert à l'issue »* — donc ici. */
    expect(acte7().module).toBe('live');
    /* ⚠️ « À l'issue » se lit sur l'ÉTAPE, pas sur la frontière : il s'ouvre à
     * la première scène qui le prête et ne se referme plus. Attendre la
     * frontière le refermerait entre le rappel et la dernière réplique —
     * l'entrée qui apparaît, sert, disparaît puis revient. */
    const etapeDuSet = acte7().etapes.findIndex(
      (e) => e.kind === 'scene' && e.modulesRequis?.includes('live'),
    );
    expect(etapeDuSet).toBeGreaterThanOrEqual(0);
    expect(ETAPE_DU_MODULE.live).toBe(etapeDuSet);
    expect(moduleUnlocked('live', { level: 1, acte: 6, etape: etapeDuSet })).toBe(true);
    // Et il le reste : jusqu'à la fin de l'acte, et après.
    expect(moduleUnlocked('live', { level: 1, acte: 6, etape: acte7().etapes.length - 1 })).toBe(true);
    expect(moduleUnlocked('live', { level: 1, acte: NB_ACTES })).toBe(true);
    /* Avant la scène, il est fermé — c'est le sens de « on prépare à l'acte 5,
       on joue au 7 » : la console n'existe pas avant le concert. */
    expect(moduleUnlocked('live', { level: 1, acte: 6, etape: 0 })).toBe(false);
    expect(moduleUnlocked('live', { level: 1, acte: 5, etape: 99 })).toBe(false);
  });

  /* ⚠️ Il ne cite QUE des niveaux « jouer », et c'est le fond de l'acte :
   * `justesseDuRythme` retient la meilleure fenêtre consécutive et non la
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
    const ailleurs = ACTES.filter((a) => a.id !== 6).flatMap((a) =>
      a.etapes.flatMap((e) => (e.kind === 'recit' ? e.lignes : [])),
    );
    for (const l of ailleurs) expect(l).not.toContain('{pseudo}');
  });

  /* ⚠️ LE CONCERT SE JOUE EN MODE LIVE — l'acte refait le 2026-09-09.
   *
   * Avant, l'acte n'y montait que pour le RAPPEL : le concert lui-même était un
   * exercice au clavier du Mode jeu, si bien que la répétition de l'acte 5
   * (« sept boucles, un disque ») était plus riche que le concert de l'acte 6.
   * Les deux scènes se distinguent, et ce test garde la distinction : le SET
   * monte le disque, un MORCEAU par lettre ; le RAPPEL pose une boucle. */
  it('⚠️ monte le DISQUE en set — un morceau par lettre', () => {
    const scenes = acte7().etapes.filter((e) => e.kind === 'scene');
    expect(scenes, 'le concert et le rappel').toHaveLength(2);
    const [set, rappel] = scenes as Extract<Etape, { kind: 'scene' }>[];

    // Le SET rejoue ce que l'acte 5 a livré — l'acte 6 ne produit rien.
    expect(set.depuisLActe).toBe(5);
    const series6 = ACTES[5].etapes.flatMap((e) => (e.kind === 'commande' ? [e.serie] : []));
    expect(set.bouclesDeLActe?.map((b) => b.serie), 'les sept boucles vont en banque').toEqual(
      series6,
    );
    /* ⚠️ TROIS MORCEAUX, TROIS LETTRES — pas trois sections d'un morceau. Ce
     * qui distingue le concert de la répétition : à l'acte 5 A/B/C sont le
     * couplet, le refrain et le pont d'un même morceau ; ici ce sont trois
     * morceaux différents, et c'est ce que « un set » veut dire. */
    const montees = (set.bouclesDeLActe ?? []).filter((b) => b.partie);
    expect(montees.map((b) => b.partie)).toEqual(['A', 'B', 'C']);
    expect(new Set(montees.map((b) => b.serie.split('-')[0])).size, 'trois morceaux').toBe(3);
    for (const b of montees) expect(b.serie).toMatch(/-couplet$/);
    expect(set.montage).toBe('A B C · A B′ C′');

    /* ⚠️ LE RAPPEL EST MONTÉ EN CLUB depuis le 2026-09-17. Le jingle ne fait
     * qu'UNE boucle, donc son montage ne peut citer qu'une lettre — et ce
     * n'est pas une propriété du nom, c'est une propriété de la FORME. Le test
     * la lit dans le catalogue plutôt que de faire confiance à la chaîne
     * « CLUB » : un modèle à deux lettres poserait ici une scène sur B, c'est-
     * à-dire une lettre vide, qui se replie sur A et joue la même chose sans
     * qu'aucune erreur ne le dise. */
    expect(rappel.morceauDeLActe).toBe(2);
    expect(rappel.montage).toBe('CLUB');
    const club = montageParNom(rappel.montage!);
    expect(club, 'le modèle du rappel n’existe pas').toBeTruthy();
    expect(
      new Set(club!.sections.map((x) => x.partie)),
      'le rappel monte un morceau d’UNE boucle : son modèle ne peut citer qu’une lettre',
    ).toEqual(new Set(['A']));
  });

  /* ⚠️ CE QUI N'A PAS ÉTÉ PORTÉ N'EXISTE PAS. `HISTOIRE.md` écrit ce que le
   * concert demande — « lancer les morceaux ; compter les départs ; enchaîner ;
   * gérer les silences ; rattraper une erreur ; tenir le tempo ; écouter le
   * public » — et cette liste n'était nulle part dans le jeu. L'écran qui
   * envoie sur scène est le seul endroit où elle a un sens : après, on joue. */
  it('⚠️ dit ce qu’on va faire sur scène, avant d’y envoyer', () => {
    const set = acte7().etapes.find((e) => e.kind === 'scene');
    if (set?.kind !== 'scene') throw new Error('pas de scène');
    const texte = set.lignes.join(' ').toLowerCase();
    for (const mot of ['lances', 'enchaînes', 'départs', 'tempo', 'silence', 'rattrapes', 'écoutes']) {
      expect(texte, `« ${mot} » n’est dit nulle part`).toContain(mot);
    }
    /* ⚠️ Et la SORTIE AUDIO se nomme. Depuis que l'export hors ligne d'un
     * morceau est écarté, ⏺ REC est la seule façon de garder ce qu'on joue —
     * une capacité qu'aucun mot ne nomme n'existe pas, et c'est ici qu'elle a
     * un sens : après, on est sur scène. */
    expect(texte).toContain('rec');
    /* ⚠️ « tourne ton téléphone » n'est PAS dans la donnée : la vue le dit sous
     * TOUTE scène. L'écrire aussi ici l'affichait deux fois à trois lignes
     * d'écart — une règle à deux domiciles, et les deux visibles. */
    expect(texte, 'la vue le dit déjà, sous toutes les scènes').not.toContain('horizontale');
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
    expect(NB_ACTES).toBe(7);
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
    // Et le niveau que ce geste désigne est bien celui où l'on pose les coups.
    const premier = LEVELS.find((l) => l.id === niveauxDeLActe(ACTES[0])[0])!;
    expect(premier.exercise).toBe('reproduire');
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
    // ⚠️ `enRelecture` est de l'ÉTAT DE VUE (volatil) et le store est un
    // singleton : un `ouvrirActe` d'un test précédent laisserait le joueur en
    // relecture, ce qui masque l'épilogue à dessein. On part d'une vue neuve.
    game.enRelecture = false;
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
      'pas-fini': { level: 1, stars: {}, carriere: { acte: NB_ACTES - 1, etape: 0 } },
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
describe('l’objectif nommé au premier écran', () => {
  /* ⚠️ La promesse affichée dès le premier écran doit être TENUE par la fin :
   * « passer de stagiaire à artiste » n'est vrai que parce que Sol présente
   * le joueur sous son nom au concert. Si cette réplique disparaît, l'objectif
   * ment — et ce test le dit avant le joueur. */
  it('est tenu : au dernier acte, Sol présente le joueur', () => {
    expect(OBJECTIF).toMatch(/stagiaire/);
    expect(OBJECTIF).toMatch(/artiste/);
    const dernier = ACTES[NB_ACTES - 1].etapes.flatMap((e) => (e.kind === 'recit' ? e.lignes : []));
    expect(dernier.some((l) => /Je vous présente.*\{pseudo\}/.test(l))).toBe(true);
  });

  it('ne gâche rien : ni la vente, ni le concert, ni une date', () => {
    expect(OBJECTIF).not.toMatch(/vend|concert|juin|FB-015|\d/i);
  });
});

describe('le calendrier du récit', () => {
  it('pose le concert le 14 juin 2005', () => {
    expect(ANNEE).toBe(2005);
    expect(dateDeLActe(6)).toBe('14 juin 2005');
  });

  /* ⚠️ Sept actes depuis la fusion du rythme et du groove (2026-11-24) : le
   * 14 mars, qui était l'acte du groove, n'a plus d'acte — les suivants gardent
   * leur date, l'histoire ne se resserre pas. */
  it('fait tomber les trois premiers actes le 14 de leur mois', () => {
    expect(dateDeLActe(0)).toBe('14 janvier 2005');
    expect(dateDeLActe(1)).toBe('14 février 2005');
    expect(dateDeLActe(2)).toBe('14 avril 2005');
  });

  it('place les trois derniers à six, quatre et deux semaines', () => {
    expect(dateDeLActe(3)).toBe('3 mai 2005');
    expect(dateDeLActe(4)).toBe('17 mai 2005');
    expect(dateDeLActe(5)).toBe('31 mai 2005');
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

  it('⚠️ après la dernière commande, plus rien ne se PRODUIT', () => {
    /* Règle déjà tenue ailleurs, redite ici parce que l'épilogue en dépend : le
     * disque qu'il joue est le dernier livré, donc rien ne doit se produire
     * après lui.
     *
     * ⚠️ Une SCÈNE le peut, elle : elle ne range rien dans la discographie —
     * l'acte 6 finit en montant ses trois boucles en set, ce qui fait ENTENDRE
     * le disque au lieu d'en fabriquer un autre. ⚠️ Un MONTAGE aussi, et pour
     * la même raison : il met en forme ce qui est déjà livré. */
    const acte = ACTES.find((a) => a.id === ACTE_DU_DISQUE)!;
    const derniere = acte.etapes.map((e) => e.kind).lastIndexOf('commande');
    for (const e of acte.etapes.slice(derniere + 1)) {
      expect(
        ['recit', 'scene', 'montage'],
        `une étape « ${e.kind} » suit la dernière commande`,
      ).toContain(e.kind);
    }
  });
});

/* ⚠️ LA SCÈNE — l'acte 7 se joue en Mode Live (seconde moitié de la tranche 6).
 *
 * Le concert se jouait au clavier du Mode jeu, et le Mode Live s'ouvrait APRÈS,
 * en récompense : on décrivait au joueur ce qu'il aurait pu faire. Ces tests
 * tiennent les trois chaînons qui peuvent se rompre en silence — le module
 * fermé, le morceau absent, et une scène qui ne rendrait pas la main.
 */
describe('la scène — le seul endroit où l’on joue', () => {
  const scenes = ACTES.flatMap((a) =>
    a.etapes.flatMap((e, i) => (e.kind === 'scene' ? [{ acte: a, etape: e, i }] : [])),
  );

  it('il y a bien une scène — sinon ce fichier ne garde rien', () => {
    expect(scenes.length).toBeGreaterThan(0);
  });

  it('⚠️ elle OUVRE le Mode Live, sinon elle envoie dans un module cadenassé', () => {
    // Le cul-de-sac déjà payé à l'acte 3 : la commande réclamait une basse que
    // le Synthé verrouillé ne laissait pas écrire.
    for (const { etape } of scenes) {
      expect(etape.modulesRequis, `scène « ${etape.entete} »`).toContain('live');
    }
  });

  /* ⚠️ UNE SCÈNE EMPORTE L'UN OU L'AUTRE, jamais rien.
   *
   * Deux formes depuis le 2026-09-04 : un MORCEAU entier d'un acte précédent
   * (le rappel de l'acte 7), ou les BOUCLES livrées dans son propre acte,
   * montées en set (l'acte 6). Aucune des deux, et le Mode Live s'ouvrirait sur
   * ce que l'Atelier avait sous la main — une démo à la place de son propre
   * morceau, sans rien à l'écran pour le dire. */
  it('⚠️ ce qu’elle emporte EXISTE — un morceau produit, ou ses propres boucles', () => {
    for (const { acte, etape } of scenes) {
      const boucles = etape.bouclesDeLActe ?? [];
      expect(
        etape.morceauDeLActe !== undefined || boucles.length > 0,
        `scène « ${etape.entete} » : ni morceau ni boucles`,
      ).toBe(true);
      if (etape.morceauDeLActe !== undefined) {
        const source = ACTES.find((a) => a.id === etape.morceauDeLActe);
        expect(source, `l’acte ${etape.morceauDeLActe} n’existe pas`).toBeTruthy();
        expect(
          source!.etapes.some((e) => e.kind === 'commande' || e.kind === 'livraison'),
          `l’acte ${etape.morceauDeLActe} ne produit rien — la scène n’aurait aucun morceau`,
        ).toBe(true);
      }
      /* Les boucles citées sont livrées AVANT la scène — par son propre acte,
       * ou par celui que `depuisLActe` nomme. Le concert de l'acte 7 rejoue le
       * disque de l'acte 6 : sans ce second cas, le dernier acte — celui qui
       * ne produit rien, par décision — n'aurait jamais rien à jouer. */
      const source = etape.depuisLActe ?? acte.id;
      expect(source, `scène « ${etape.entete} » : boucles d’un acte à venir`).toBeLessThanOrEqual(
        acte.id,
      );
      const acteSource = ACTES.find((a) => a.id === source)!;
      const avant =
        source === acte.id ? acteSource.etapes.slice(0, acte.etapes.indexOf(etape)) : acteSource.etapes;
      for (const b of boucles) {
        expect(
          avant.some((e) => e.kind === 'commande' && e.serie === b.serie),
          `la boucle « ${b.serie} » n’est livrée nulle part avant la scène`,
        ).toBe(true);
      }
    }
  });

  it('⚠️ elle se joue APRÈS ce qu’elle fait entendre', () => {
    // Jouer à l'acte 7 un jingle qu'on n'a pas encore fait donnerait un morceau
    // vide — et le récit dit « celui que tu as fait ».
    for (const { acte, etape } of scenes) {
      if (etape.morceauDeLActe === undefined) continue;
      expect(etape.morceauDeLActe, `scène de l’acte ${acte.id}`).toBeLessThan(acte.id);
    }
  });

  /* ⚠️ APRÈS UNE SCÈNE, PLUS RIEN QUI SE NOTE NI QUI SE PRODUISE.
   *
   * La règle disait « il ne reste que du récit », et elle a été assouplie le
   * 2026-09-09 pour la seule raison qui la justifiait : une scène ne PRODUIT
   * rien (c'est déjà pourquoi elle peut suivre la dernière commande d'un acte),
   * donc deux scènes séparées par du récit ne se marchent pas dessus — l'acte 7
   * joue son set, puis son rappel. Ce qui reste interdit est ce que la règle
   * visait vraiment : redescendre de scène pour retourner à l'établi. */
  it('⚠️ après la scène, on ne produit plus et on n’est plus noté', () => {
    for (const { acte, i } of scenes) {
      for (const e of acte.etapes.slice(i + 1)) {
        expect(
          ['recit', 'scene'],
          `une étape « ${e.kind} » suit la scène de l’acte ${acte.id}`,
        ).toContain(e.kind);
      }
    }
  });

  /* ⚠️ UNE SCÈNE DIT CE QU'ON Y FAIT — c'est le seul écran qui n'a ni cahier
   * ni cible, donc le seul où rien ne porte la consigne à sa place.
   *
   * Retour du 2026-09-10 sur le dernier acte : *« je n'ai pas compris ce qu'il
   * se passait »*, puis *« en quoi consiste le niveau ? »*. On sortait du récit
   * pour atterrir sur le Mode Live générique, afficheur sur ARRÊT. `surScene`
   * est donc OBLIGATOIRE — le type le tient, ce test tient le reste : qu'elle
   * ne soit pas vide, et qu'elle ne recopie pas le bouton (le bouton est sur
   * l'écran d'AVANT, il ne dit rien à qui est déjà sur scène). */
  it('⚠️ dit ce qu’on y fait, une fois dessus', () => {
    for (const { etape } of scenes) {
      expect(etape.surScene.trim().length, `scène « ${etape.entete} »`).toBeGreaterThan(20);
      expect(etape.surScene, `scène « ${etape.entete} »`).not.toBe(etape.bouton);
      // Une consigne se lit d'un coup d'œil sur une surface de jeu.
      expect(etape.surScene.length, `scène « ${etape.entete} » : trop long`).toBeLessThanOrEqual(120);
    }
  });

  /* ⚠️ UNE SCÈNE POSE TOUT CE QU'ELLE FAIT JOUER — le motif ET la chaîne.
   *
   * Mesuré le 2026-09-09 : le rappel de l'acte 7 chargeait le jingle dans
   * l'Atelier et s'arrêtait là. La chaîne montée à la scène précédente était
   * encore en place, et `appliquerSection(0)` — que le Mode Live appelle au
   * démarrage de la lecture — rechargeait la lettre A. Le seul écran du jeu qui
   * dit « celui que tu as fait » faisait donc entendre autre chose dès la
   * première mesure. Le test regarde la DONNÉE, parce que c'est là que le trou
   * était : une scène qui cite un montage doit remplir chaque lettre qu'il
   * cite. */
  it('⚠️ remplit toutes les LETTRES que son montage cite', () => {
    for (const { etape } of scenes) {
      if (!etape.montage) continue;
      const m = montageParNom(etape.montage);
      expect(m, `« ${etape.montage} » n’est pas un montage`).toBeTruthy();
      // Un morceau seul se range sous A ; un set range les lettres qu'il cite.
      const posees = new Set<string>(
        etape.morceauDeLActe !== undefined
          ? ['A']
          : (etape.bouclesDeLActe ?? []).flatMap((b) => (b.partie ? [b.partie] : [])),
      );
      for (const s of m!.sections) {
        expect(
          posees.has(s.partie),
          `scène « ${etape.entete} » : la lettre ${s.partie} du montage « ${m!.nom} » n’est posée par personne`,
        ).toBe(true);
      }
    }
  });
});

/* ⚠️ RELIRE UN ACTE QUAND LE JEU EST FINI — bug rapporté en jouant : « les
 * boutons relire ne fonctionnent pas ».
 *
 * `enEpilogue` se lit sur le curseur PERSISTÉ, qui ne recule jamais : une fois
 * les huit actes derrière, il est vrai pour toujours. L'écran de l'épilogue
 * passant avant tout le reste, cliquer « RELIRE » changeait bien `acteActif` et
 * n'affichait rien. Le bouton marchait, la vue l'ignorait.
 *
 * ⚠️ Le pseudo « master » rend `{ acte: NB_ACTES }` : c'est le seul moyen
 * d'obtenir un joueur qui a fini sans rejouer la carrière dans un test.
 */
describe('relire un acte une fois le jeu fini', () => {
  it('⚠️ ouvrir un acte SORT de l’épilogue — sinon le clic ne montre rien', () => {
    game.enRelecture = false;
    game.pseudo = 'master';
    expect(game.enEpilogue, 'le joueur devrait avoir fini').toBe(true);
    expect(game.ecranEpilogue, 'l’épilogue devrait s’afficher au départ').toBeTruthy();

    game.ouvrirActe(1);
    expect(game.acteActif).toBe(1);
    expect(game.etapeActive).toBe(0);
    expect(game.ecranEpilogue, 'l’épilogue masque encore l’acte relu').toBe(null);
    expect(game.enRelecture).toBe(true);
  });

  it('⚠️ et « reprendre » rend la fin — une relecture sans retour est un piège', () => {
    game.enRelecture = false;
    game.pseudo = 'master';
    game.ouvrirActe(2);
    expect(game.ecranEpilogue).toBe(null);

    game.reprendreCarriere();
    expect(game.enRelecture).toBe(false);
    expect(game.ecranEpilogue, 'on ne revient pas à l’épilogue').toBeTruthy();
  });

  it('⚠️ avec « master », les HUIT actes s’ouvrent — c’est le compte de test', () => {
    /* Rapporté en jouant : « avec le compte master, je n'arrive pas à refaire
     * les actes ». `progresCarriere` rend `{ acte: NB_ACTES }` pour ce pseudo,
     * donc TOUT est derrière lui : chaque acte doit s'ouvrir, et l'épilogue
     * doit se laisser quitter puis retrouver. C'est le parcours d'un testeur,
     * et rien d'autre ne le vérifie. */
    game.enRelecture = false;
    game.pseudo = 'master';
    for (const a of ACTES) {
      expect(game.acteOuvert(a.id), `l’acte ${a.id} est fermé pour master`).toBe(true);
      game.ouvrirActe(a.id);
      expect(game.acteActif, `l’acte ${a.id} ne s’ouvre pas`).toBe(a.id);
      expect(game.etapeActive, `l’acte ${a.id} ne s’ouvre pas à son début`).toBe(0);
      expect(game.ecranEpilogue, `l’épilogue masque l’acte ${a.id}`).toBe(null);
      // …et on revient à la fin, comme le bouton le propose.
      game.reprendreCarriere();
      expect(game.ecranEpilogue, `pas de retour à la fin après l’acte ${a.id}`).toBeTruthy();
    }
  });

  it('⚠️ relire ne fait pas reculer le curseur enregistré', () => {
    // La règle de fond, redite ici : une porte déjà ouverte ne se referme
    // jamais, et relire l'acte 1 ne referme pas l'Atelier.
    game.enRelecture = false;
    game.pseudo = 'master';
    const avant = { ...game.progresCarriere };
    game.ouvrirActe(0);
    expect(game.progresCarriere).toEqual(avant);
    game.reprendreCarriere();
    expect(game.progresCarriere).toEqual(avant);
  });
});
