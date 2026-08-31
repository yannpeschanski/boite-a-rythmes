import { describe, it, expect } from 'vitest';
import { LEVELS } from '../src/model/presets/levels';
import { ACTES } from '../src/model/carriere';
import type { GameLevel } from '../src/model/presets/levels';

/* Les trois lignes du Mode jeu. Recopiées plutôt qu'importées : leur
 * définition vit dans `stores/game.svelte.ts`, et tirer le store entier dans
 * un test de DONNÉES lui ferait exiger un `localStorage` pour vérifier un
 * tableau de nombres. */
const LIGNES = ['kick', 'snare', 'hat'] as const;

/* Les rythmes ÉCRITS — et le seul défaut qu'ils peuvent encore avoir.
 *
 * Ces niveaux existent parce qu'un exercice se joue une fois : le tirer au
 * sort ne rend service à personne et empêche de dessiner une courbe (« il
 * n'est pas nécessaire de randomiser les exercices dans la mesure où chaque
 * personne ne les ferait qu'une seule fois », Yann, 2026-08-27). Une grille
 * posée à la main enlève d'un coup toute la famille de bugs mesurée en
 * probabilité — « 0 variante sur 60 tirages » pour un préambule qui en
 * annonce une.
 *
 * Reste l'autre moitié du même défaut, celui qui a coûté le plus cher dans ce
 * projet : L'ÉCRAN PROMET CE QUE LES DONNÉES NE TIENNENT PAS. Le préambule du
 * niveau 5 dit « une seule des deux claires en porte une, c'est la dernière ».
 * Rien dans le type ne l'oblige. C'est ce que ce fichier vérifie — la grille
 * contre sa propre annonce, une par une.
 */

const ECRITS = LEVELS.filter((l) => l.grille);

function ligne(l: GameLevel, n: 'kick' | 'snare' | 'hat'): number[] {
  return l.grille![n].slice(0, l.grille!.subdiv[n]);
}
function rafales(l: GameLevel, n: 'kick' | 'snare' | 'hat'): number[] {
  const r = l.grille!.rolls?.[n];
  return Array.from({ length: l.grille!.subdiv[n] }, (_, i) => r?.[i] ?? 1);
}

describe('une grille écrite est bien formée', () => {
  it('il y en a', () => {
    // Une régression silencieuse possible : quelqu'un retire `grille` et tout
    // le reste de ce fichier passe en ne vérifiant rien.
    expect(ECRITS.length).toBeGreaterThanOrEqual(8);
  });

  for (const l of ECRITS) {
    it(`niveau ${l.id} — « ${l.teach} »`, () => {
      for (const n of LIGNES) {
        const pas = l.grille!.subdiv[n];
        expect(pas, `${n} : subdivision`).toBeGreaterThan(0);
        // Écrire moins de cases que la subdivision n'est pas une erreur de
        // type — `startLevel` complète à zéro. C'en est une de LECTURE : la
        // grille cesse de se lire d'un coup d'œil, ce pour quoi elle existe.
        expect(l.grille![n].length, `${n} : longueur`).toBe(pas);
        for (const v of ligne(l, n)) expect([0, 1, 2], `${n} : valeur`).toContain(v);
        rafales(l, n).forEach((r, i) => {
          expect(r, `${n}[${i}] : rafale`).toBeGreaterThanOrEqual(1);
          // Une rafale sur une case éteinte ne s'entend pas : elle se lit
          // comme une intention, et se recopie comme une faute.
          if (r > 1) expect(ligne(l, n)[i], `${n}[${i}] : rafale sur case vide`).toBeGreaterThan(0);
        });
      }
    });
  }
});

describe('ce que la grille contient, le niveau le DÉCLARE', () => {
  // Sinon l'écran d'édition ne laisse pas produire la cible : une variante
  // qu'on ne peut pas poser rend le niveau impossible, et muet sur la raison.
  for (const l of ECRITS) {
    it(`niveau ${l.id}`, () => {
      for (const n of ['snare', 'hat'] as const) {
        if (ligne(l, n).includes(2)) expect(l.variant[n], `${n} : variante non déclarée`).toBe(true);
      }
      expect(ligne(l, 'kick'), 'le kick n’a pas de variante').not.toContain(2);
      for (const n of LIGNES) {
        const max = Math.max(...rafales(l, n));
        if (max > 1) expect(l.rollMax, `${n} : rollMax trop bas`).toBeGreaterThanOrEqual(max);
      }
    });
  }
});

/* ---- LE PRÉAMBULE CONTRE LA GRILLE ------------------------------------
 *
 * Un test par promesse, écrit à la main comme la grille : ce sont deux
 * énoncés du même rythme, et c'est exactement pour ça qu'ils doivent être
 * confrontés. Ajouter un niveau écrit sans ajouter sa ligne ici ne casse
 * rien — c'est assumé : on ne peut pas vérifier automatiquement une phrase
 * en français, on peut seulement refuser de la laisser seule.
 */
function niveau(id: number): GameLevel {
  const l = LEVELS.find((x) => x.id === id);
  expect(l, `niveau ${id} introuvable`).toBeTruthy();
  return l!;
}
const compte = (a: number[], v: number) => a.filter((x) => x === v).length;

describe('chaque niveau écrit tient ce que son préambule annonce', () => {
  it('2 — « le kick sur 1 et 3, la claire répond sur 2 et 4 »', () => {
    const l = niveau(2);
    expect(ligne(l, 'kick')).toEqual([1, 0, 1, 0]);
    expect(ligne(l, 'snare')).toEqual([0, 1, 0, 1]);
    expect(ligne(l, 'hat').every((v) => v === 0), 'le charley n’est pas encore là').toBe(true);
  });

  it('3 — « le charleston joue en croches, deux fois par temps »', () => {
    const l = niveau(3);
    // Une mesure, quatre temps : « deux fois par temps » = huit coups pleins.
    expect(l.grille!.subdiv.hat).toBe(8);
    expect(ligne(l, 'hat').every((v) => v === 1)).toBe(true);
    expect(compte(ligne(l, 'hat'), 1) / 4, 'deux coups par temps').toBe(2);
    // « le kick garde ses quatre temps, la claire répond sur 2 et 4 »
    expect(ligne(l, 'kick')).toEqual(ligne(niveau(67), 'kick'));
    expect(ligne(l, 'snare')).toEqual(ligne(niveau(67), 'snare'));
  });

  it('67 — « le kick frappe les QUATRE temps, huit cases par ligne »', () => {
    const l = niveau(67);
    expect(l.grille!.subdiv.kick, 'huit cases').toBe(8);
    expect(ligne(l, 'kick')).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    expect(ligne(l, 'snare'), 'la claire sur 2 et 4').toEqual([0, 0, 1, 0, 0, 0, 1, 0]);
    // « rien de neuf à comprendre » : le charley n'est pas encore là.
    expect(ligne(l, 'hat').every((v) => v === 0)).toBe(true);
  });

  it('68 — « seize cases au lieu de huit, le kick et la claire ne bougent pas »', () => {
    const l = niveau(68);
    expect(l.grille!.subdiv.hat, 'la double-croche').toBe(16);
    expect(ligne(l, 'hat').every((v) => v === 1), 'seize coups pleins').toBe(true);
    // « eux ne bougent pas » : exactement la grille du niveau 3.
    expect(ligne(l, 'kick')).toEqual(ligne(niveau(3), 'kick'));
    expect(ligne(l, 'snare')).toEqual(ligne(niveau(3), 'snare'));
  });

  it('7 — « le kick tombe ENTRE deux temps » (une fois, et une seule)', () => {
    const l = niveau(7);
    const k = ligne(l, 'kick');
    expect(l.grille!.subdiv.kick, 'la mesure se découpe en huit cases').toBe(8);
    const horsTemps = k.map((v, i) => (v && i % 2 === 1 ? i : -1)).filter((i) => i >= 0);
    expect(horsTemps, 'une syncope, pas deux').toHaveLength(1);
  });

  it('5 — « la claire joue quatre fois, DEUX sont des rim shots »', () => {
    const l = niveau(5);
    const s = ligne(l, 'snare');
    expect(s.filter((v) => v > 0), 'quatre claires').toHaveLength(4);
    expect(compte(s, 2), 'deux rim shots').toBe(2);
    /* ⚠️ Et ils ne sont NI le premier NI le dernier coup : une variante posée
     * à un bout se trouve par élimination, sans jamais l'entendre. C'est le
     * défaut que ce niveau corrigeait (« pas simplement changer une note »). */
    const joues = s.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    expect(compte(s, 2), 'pas tous les coups').toBeLessThan(joues.length);
    expect(compte(ligne(l, 'hat'), 2), 'et rien sur le charley').toBe(0);
  });

  it('59 — « TROIS ouvertures, réparties, parmi seize croches fermées »', () => {
    const l = niveau(59);
    const h = ligne(l, 'hat');
    expect(l.grille!.subdiv.hat, 'seize').toBe(16);
    expect(compte(h, 2), 'trois ouvertures').toBe(3);
    // « réparties » : pas trois cases voisines, et pas seulement à la fin.
    const ouvertes = h.map((v, i) => (v === 2 ? i : -1)).filter((i) => i >= 0);
    expect(Math.min(...ouvertes), 'la première tombe tôt').toBeLessThan(8);
    expect(new Set(ouvertes.map((i) => Math.floor(i / 4))).size, 'sur des temps différents').toBe(3);
    expect(compte(ligne(l, 'snare'), 2), 'la claire est au repos').toBe(0);
  });

  it('60 — « rim shots ET charleys ouverts, les trois lignes en doubles-croches »', () => {
    const l = niveau(60);
    const g = l.grille!;
    expect([g.subdiv.kick, g.subdiv.snare, g.subdiv.hat], 'les TROIS lignes').toEqual([16, 16, 16]);
    expect(compte(ligne(l, 'snare'), 2), 'des rim shots, au pluriel').toBeGreaterThanOrEqual(2);
    expect(compte(ligne(l, 'hat'), 2), 'des ouvertures, au pluriel').toBeGreaterThanOrEqual(2);
    // « la claire tombe deux fois hors des temps » : sur des seizièmes.
    const horsTemps = ligne(l, 'snare').map((v, i) => (v > 0 && i % 4 !== 0 ? i : -1)).filter((i) => i >= 0);
    expect(horsTemps.length, 'la claire hors des temps').toBeGreaterThanOrEqual(2);
    expect(
      LIGNES.every((r) => Math.max(...rafales(l, r)) === 1),
      'rien de neuf : pas encore de rafale',
    ).toBe(true);
  });

  it('8 — « QUATRE rafales, deux longueurs, sur le charley comme sur la claire »', () => {
    /* ⚠️ Le test que le retour de Yann a rendu nécessaire : « on ne doit pas
     * simplement changer une note en une rafale pour introduire rafale ». Une
     * rafale unique et finale se repère à sa POSITION — on n'a jamais eu à
     * l'écouter. Ce qui rend le niveau réel, c'est qu'il faut COMPTER les
     * coups de chacune, donc plusieurs, de longueurs différentes. */
    const l = niveau(8);
    const toutes = LIGNES.flatMap((r) => rafales(l, r).filter((v) => v > 1));
    expect(toutes, 'quatre rafales').toHaveLength(4);
    expect(new Set(toutes).size, 'deux longueurs au moins').toBeGreaterThanOrEqual(2);
    const lignesAvec = LIGNES.filter((r) => rafales(l, r).some((v) => v > 1));
    expect(lignesAvec, 'sur deux lignes').toEqual(['snare', 'hat']);
    // « aucune variante à côté : c'est la rafale qu'on écoute »
    expect(compte(ligne(l, 'snare'), 2)).toBe(0);
    expect(compte(ligne(l, 'hat'), 2)).toBe(0);
  });

  it('70 — « le charley s’ARRÊTE, la claire relance »', () => {
    const l = niveau(70);
    const h = ligne(l, 'hat');
    // « douze cases pleines puis quatre vides » — c'est le trou qui fait le fill.
    expect(h.slice(0, 12).every((v) => v > 0), 'le charley tient la première moitié').toBe(true);
    expect(h.slice(12).every((v) => v === 0), 'et s’arrête sur le dernier temps').toBe(true);
    // « quatre coups d'affilée » sur la claire, dans ce même dernier temps.
    expect(ligne(l, 'snare').slice(12).filter((v) => v > 0), 'la relance').toHaveLength(4);
    const r = rafales(l, 'snare').slice(12).filter((v) => v > 1);
    expect(r, 'deux d’entre eux en rafale').toHaveLength(2);
    expect(compte(ligne(l, 'snare'), 2), 'deux en rim shot').toBe(2);
  });

  it('61 — « trois syncopes dont une sur un seizième, cinq claires, trois ouvertures, trois rafales »', () => {
    const l = niveau(61);
    const g = l.grille!;
    expect([g.subdiv.kick, g.subdiv.snare, g.subdiv.hat]).toEqual([16, 16, 16]);
    // Seize cases : les temps sont les multiples de 4, les croches les pairs.
    const k = ligne(l, 'kick');
    const horsTemps = k.map((v, i) => (v > 0 && i % 4 !== 0 ? i : -1)).filter((i) => i >= 0);
    expect(horsTemps, 'trois syncopes').toHaveLength(3);
    expect(horsTemps.filter((i) => i % 2 === 1), 'dont une sur un vrai seizième').toHaveLength(1);
    const sn = ligne(l, 'snare');
    expect(sn.filter((v) => v > 0), 'cinq claires').toHaveLength(5);
    expect(compte(sn, 2), 'dont deux en rim shot').toBe(2);
    expect(compte(ligne(l, 'hat'), 2), 'trois charleys ouverts').toBe(3);
    const toutes = LIGNES.flatMap((r) => rafales(l, r).filter((v) => v > 1));
    expect(toutes, 'trois rafales').toHaveLength(3);
    expect(new Set(toutes).size, 'de deux longueurs').toBeGreaterThanOrEqual(2);
    expect(
      LIGNES.filter((r) => rafales(l, r).some((v) => v > 1)),
      'sur deux lignes',
    ).toEqual(['snare', 'hat']);
    // « le 3e temps commence à l'index 8, son « et » est le 10 »
    expect(rafales(l, 'hat')[10], 'la rafale du « et » du 3e temps').toBeGreaterThan(1);
    // Vingt-six coups, comme l'annonce le préambule.
    expect(
      LIGNES.reduce((n, r) => n + ligne(l, r).filter((v) => v > 0).length, 0),
      'vingt-six coups',
    ).toBe(26);
  });
});

/* Les trois rythmes de FRAPPE de l'acte 0 — même exigence, autre verbe.
 *
 * Ils sont écrits pour la même raison que ceux de l'acte 1 (une courbe de trois
 * exercices ne se dessine pas avec un générateur de densité), et ils ont en
 * plus une contrainte que `reproduire` n'a pas : c'est le KICK qu'on tape, donc
 * c'est lui seul qui décide de ce qu'il y a à faire. Une case posée ailleurs
 * change ce qu'on entend sans changer ce qu'on note.
 */
describe('l’acte 0 tient ce que ses trois frappes annoncent', () => {
  it('64 — « quatre coups, un par temps, rien d’autre »', () => {
    const l = niveau(64);
    expect(ligne(l, 'kick')).toEqual([1, 0, 1, 0, 1, 0, 1, 0]);
    // « rien d'autre » : les deux autres lignes sont muettes, sans quoi le
    // premier exercice du jeu ferait entendre ce qu'il ne demande pas.
    expect(ligne(l, 'snare').every((v) => v === 0)).toBe(true);
    expect(ligne(l, 'hat').every((v) => v === 0)).toBe(true);
  });

  it('65 — « un coup de plus, juste après le deuxième temps »', () => {
    const l = niveau(65);
    const k = ligne(l, 'kick');
    // Les quatre temps sont toujours là…
    for (const i of [0, 2, 4, 6]) expect(k[i], `le temps ${i / 2 + 1}`).toBe(1);
    // …et il y a exactement UN coup entre deux temps, le « et » du deuxième.
    const horsTemps = k.map((v, i) => (v && i % 2 === 1 ? i : -1)).filter((i) => i >= 0);
    expect(horsTemps, 'un contretemps, pas deux').toEqual([3]);
  });

  it('66 — « le kick est muet, le charley donne la pulsation »', () => {
    const l = niveau(66);
    expect(l.jouerIndice, 'c’est ce sens-là qui coupe le kick').toBe('lecture');
    // « huit croches régulières » — la pulsation, pas un motif : le kick étant
    // coupé, c'est la seule chose que le joueur entend.
    expect(ligne(l, 'hat')).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    const k = ligne(l, 'kick');
    for (const i of [0, 2, 4, 6]) expect(k[i]).toBe(1);
    const horsTemps = k.map((v, i) => (v && i % 2 === 1 ? i : -1)).filter((i) => i >= 0);
    // « le contretemps a changé de place » : ailleurs qu'au niveau 65.
    expect(horsTemps).toHaveLength(1);
    const precedent = ligne(niveau(65), 'kick').findIndex((v, i) => v > 0 && i % 2 === 1);
    expect(horsTemps[0], 'sinon il se rejoue de mémoire au lieu de se lire').not.toBe(precedent);
  });
});

/* ---- LA COURBE, DANS L'ORDRE OÙ ELLE SE JOUE --------------------------
 *
 * ⚠️ Retour de Yann (2026-08-31) : « acte 1 : la progression est trop lente,
 * tu peux rendre le jeu nettement plus difficile ; acte 2 : idem ». Mesuré
 * dans l'ordre réel de la carrière, l'acte 1 était une SCIE : 12 cases, 16,
 * 20, puis retour à 16 pour le rim shot, encore 16 pour l'ouverture, 24, de
 * nouveau 16 pour la rafale, 24. Chaque nouveauté repartait du backbeat le
 * plus simple, donc six exercices sur huit se jouaient au niveau du deuxième.
 *
 * Chaque niveau était cohérent avec lui-même ; c'est l'ENCHAÎNEMENT qui ne
 * l'était pas — et c'est exactement ce qu'aucun test ne regardait, déjà la
 * cause du palier de l'acte 2. On mesure donc la suite, pas les niveaux. */
describe('la courbe ne redescend jamais', () => {
  /* ⚠️ Ce qu'on mesure est la RÉSOLUTION — le nombre de cases à lire — et pas
   * un score de difficulté fourre-tout.
   *
   * Un niveau qui ISOLE une nouveauté en retire délibérément d'autres : le
   * niveau 8 (« la rafale ») repose la claire et referme le charley pour
   * qu'on n'écoute que la rafale, donc il porte MOINS de variantes que celui
   * d'avant, exprès. Compter les variantes dans le poids ferait échouer ce
   * test sur une décision pédagogique juste. La résolution, elle, n'a aucune
   * raison de redescendre : elle est ce qui s'ACQUIERT, et c'est très
   * exactement ce qui redescendait. */
  const poids = (l: GameLevel) => {
    const g = l.grille!;
    return g.subdiv.kick + g.subdiv.snare + g.subdiv.hat;
  };

  const suiteEcrite = (acte: number) =>
    ACTES.find((a) => a.id === acte)!
      .etapes.filter((e) => e.kind === 'exercice')
      .map((e) => niveau((e as { niveau: number }).niveau))
      .filter((l) => l.grille);

  it('⚠️ l’acte 1 ne revient jamais à une résolution déjà quittée', () => {
    const suite = suiteEcrite(1);
    // Douze depuis le 2026-08-31 : « on peut faire plus d'exercices, prendre
    // plus notre temps » — un SUJET, deux exercices.
    expect(suite.length, 'les douze rythmes écrits').toBe(12);
    const poidss = suite.map(poids);
    poidss.forEach((p, i) => {
      if (i === 0) return;
      expect(
        p,
        `niveau ${suite[i].id} (${p} cases) redescend sous le niveau ${suite[i - 1].id} (${poidss[i - 1]})`,
      ).toBeGreaterThanOrEqual(poidss[i - 1]);
    });
    // Et elle monte VRAIMENT : le dernier a plus du double des cases du premier.
    expect(poidss[poidss.length - 1]).toBeGreaterThanOrEqual(2 * poidss[0]);
  });

  it('⚠️ et chaque nouveauté de l’acte 1 est POSÉE sur la grille acquise', () => {
    /* L'autre moitié du même défaut : la scie ne venait pas d'un oubli mais
     * d'une habitude — on réécrivait le backbeat le plus simple pour montrer
     * la nouveauté « au propre ». Résultat : le rim shot et la rafale
     * s'apprenaient sur un rythme plus facile que celui d'avant, et le joueur
     * refaisait trois fois le niveau 3. Une nouveauté se montre sur ce qu'on
     * sait déjà faire. */
    const suite = suiteEcrite(1);
    const iSyncope = suite.findIndex((l) => l.id === 7);
    expect(iSyncope, 'le niveau qui enseigne la syncope').toBeGreaterThan(0);
    // Une case est « hors du temps » quand elle ne tombe pas sur un des quatre
    // temps — vrai quelle que soit la subdivision de la ligne.
    const horsTemps = (l: GameLevel) => {
      const pas = l.grille!.subdiv.kick / 4;
      return ligne(l, 'kick').filter((v, i) => v > 0 && i % pas !== 0).length;
    };
    for (const l of suite.slice(iSyncope)) {
      expect(horsTemps(l), `niveau ${l.id} : la syncope acquise au niveau 7 a disparu`).toBeGreaterThanOrEqual(1);
    }
  });

  it('⚠️ et une nouveauté se pose au PLURIEL, jamais une seule fois', () => {
    /* Le cœur du retour de Yann (2026-08-31) : « on ne doit pas simplement
     * changer une note en une rafale pour introduire rafale ». Une occurrence
     * unique se trouve par élimination — le joueur apprend le GESTE sans
     * jamais entendre ce qu'il produit. Chaque niveau de l'acte 1 qui pose une
     * variante ou une rafale en pose donc au moins deux. */
    for (const l of suiteEcrite(1)) {
      for (const r of ['snare', 'hat'] as const) {
        const n = compte(ligne(l, r), 2);
        if (n > 0) expect(n, `niveau ${l.id} : une seule variante sur ${r}`).toBeGreaterThanOrEqual(2);
      }
      const rafs = LIGNES.reduce((n, r) => n + rafales(l, r).filter((v) => v > 1).length, 0);
      if (rafs > 0) expect(rafs, `niveau ${l.id} : une seule rafale`).toBeGreaterThanOrEqual(2);
    }
  });

  it('⚠️ chaque SUJET de l’acte 1 a deux exercices — « prendre plus notre temps »', () => {
    /* Un sujet posé une seule fois est un sujet montré, pas enseigné. La série
     * en compte six, et cinq d'entre eux ont leur exercice d'application :
     * la base (2, 67), le charley (3, 68), la syncope (7, 69), les variantes
     * (5, 59, 60), la rafale (8, 70). Seul « tout ensemble » (61) est unique,
     * et c'est sa nature : il n'enseigne rien, il vérifie tout. */
    const ids = suiteEcrite(1).map((l) => l.id);
    for (const [sujet, paire] of [
      ['la base', [2, 67]],
      ['le charley', [3, 68]],
      ['la syncope', [7, 69]],
      ['la rafale', [8, 70]],
    ] as [string, number[]][]) {
      for (const id of paire) expect(ids, `${sujet} : niveau ${id} absent`).toContain(id);
      const [a, b] = paire.map((id) => ids.indexOf(id));
      expect(b, `${sujet} : l’application ne suit pas la découverte`).toBe(a + 1);
    }
  });

  it('⚠️ et l’acte 2 commence au-dessus de la fin de l’acte 1', () => {
    /* Le défaut mesuré en août : l'acte 2 plafonnait sous la fin de l'acte 1,
     * donc le récit avançait pendant que les exercices reculaient. On exige
     * désormais que sa PREMIÈRE grille soit déjà au niveau de la dernière de
     * l'acte 1 — pas seulement son maximum. */
    const fin1 = poids(suiteEcrite(1).at(-1)!);
    const debut2 = poids(suiteEcrite(2)[0]);
    expect(debut2, `acte 2 démarre à ${debut2}, acte 1 finit à ${fin1}`).toBeGreaterThanOrEqual(fin1);
  });
});

describe('l’acte 1 est une COURBE, donc rien n’y est tiré au sort', () => {
  it('chacun de ses exercices cite un niveau à la grille écrite', () => {
    // C'est l'invariant de fond : une progression où chaque niveau ajoute
    // exactement une chose ne survit pas à un tirage, qui peut poser deux
    // nouveautés d'un coup ou aucune.
    const acte1 = ACTES.find((a) => a.id === 1)!;
    const cites = acte1.etapes.filter((e) => e.kind === 'exercice').map((e) => (e as { niveau: number }).niveau);
    expect(cites.length, 'la série a été allongée à douze').toBe(12);
    for (const id of cites) expect(niveau(id).grille, `niveau ${id} : tiré au sort`).toBeTruthy();
  });

  it('et la série n’ajoute jamais deux nouveautés d’un coup', () => {
    // Lu sur les données : le nombre de CHOSES nouvelles (variante de claire,
    // ouverture de charley, rafale) ne monte que d'un cran à la fois.
    const acte1 = ACTES.find((a) => a.id === 1)!;
    const cites = acte1.etapes.filter((e) => e.kind === 'exercice').map((e) => (e as { niveau: number }).niveau);
    let precedent = 0;
    for (const id of cites) {
      const l = niveau(id);
      const n =
        (compte(ligne(l, 'snare'), 2) > 0 ? 1 : 0) +
        (compte(ligne(l, 'hat'), 2) > 0 ? 1 : 0) +
        (LIGNES.some((r) => Math.max(...rafales(l, r)) > 1) ? 1 : 0);
      expect(n, `niveau ${id} : ${n} nouveautés après ${precedent}`).toBeLessThanOrEqual(precedent + 1);
      precedent = Math.max(precedent, n);
    }
  });
});
