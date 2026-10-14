/* La charpente des exercices du Mode jeu.
 *
 * Le premier bloc verrouille l'ÉQUIVALENCE : la comparaison extraite du store
 * doit noter exactement comme l'ancienne boucle câblée en dur. C'est le test
 * qui rend l'extraction sûre — sans lui, « ça compile » est tout ce qu'on
 * saurait.
 */
import { describe, it, expect } from 'vitest';
import {
  comparerGrilles,
  colonnesDeTranche,
  ecartAuClic,
  jouerGagne,
  coupsPourValider,
  SEUIL_JUSTESSE,
  COUPS_POUR_VALIDER,
  medianeDesEcarts,
  justesseDuRythme,
  DECALAGE_MAX_MS,
  PARFAIT_MS,
  TOLERANCE_MS,
  LAVERIE_DRIVES,
  VERBES_PARAM,
  estVerbeParam,
  type Grille,
  type Rafales,
} from '../src/model/exercises';
import { LEVELS } from '../src/model/presets/levels';
import { parametre } from '../src/model/parametres';
import { PRESETS } from '../src/model/presets/songs';
import type { GameDrumRowName } from '../src/model/presets/levels';
import type { DrumStep } from '../src/model/types';

const LIGNES: GameDrumRowName[] = ['kick', 'snare', 'hat'];

function grille(kick: number[], snare: number[], hat: number[]): Grille {
  return { kick: kick as DrumStep[], snare: snare as DrumStep[], hat: hat as DrumStep[] };
}
function rafales(n: number): Rafales {
  return { kick: Array(n).fill(1), snare: Array(n).fill(1), hat: Array(n).fill(1) };
}

describe('comparerGrilles — la règle d’origine, déplacée sans être changée', () => {
  it('exact quand tout coïncide, et verrouille les cases actives justes', () => {
    const c = grille([1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 1]);
    const r = comparerGrilles(c, rafales(4), c, rafales(4), LIGNES);
    expect(r.exact).toBe(true);
    // 2 kick + 2 snare + 4 hat actifs = 8 cases à verrouiller ; les cases
    // vides justes ne se verrouillent pas (rien à protéger).
    expect(r.aVerrouiller).toHaveLength(8);
  });

  it('une seule case fausse suffit à invalider', () => {
    const c = grille([1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 1]);
    const p = grille([1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 0]);
    expect(comparerGrilles(c, rafales(4), p, rafales(4), LIGNES).exact).toBe(false);
  });

  it('la rafale compte autant que l’état — même grille, rafales différentes', () => {
    const c = grille([1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]);
    const rc = rafales(4);
    const rp = rafales(4);
    rp.kick[0] = 3;
    expect(comparerGrilles(c, rc, c, rp, LIGNES).exact).toBe(false);
  });
});

describe('comparerGrilles — la restriction par colonnes', () => {
  it('ne note que les colonnes demandées : une erreur hors zone ne compte pas', () => {
    const c = grille([1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]);
    const p = grille([9 as unknown as number, 9 as unknown as number, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]);
    // Les deux premières colonnes du kick sont fausses, mais hors zone notée.
    const zone = { kick: [2, 3], snare: [0, 1, 2, 3], hat: [0, 1, 2, 3] };
    expect(comparerGrilles(c, rafales(4), p, rafales(4), LIGNES, zone).exact).toBe(true);
    // Sans restriction, les mêmes grilles échouent — c'est bien la zone qui agit.
    expect(comparerGrilles(c, rafales(4), p, rafales(4), LIGNES).exact).toBe(false);
  });
});

describe('colonnesDeTranche — chaque ligne a sa propre subdivision', () => {
  it('découpe une ligne à 8 pas en 2 tranches de 4', () => {
    expect(colonnesDeTranche(8, 0, 2)).toEqual([0, 1, 2, 3]);
    expect(colonnesDeTranche(8, 1, 2)).toEqual([4, 5, 6, 7]);
  });

  it('découpe une ligne à 6 pas (polyrythmie) sans déborder', () => {
    // 6 pas en 2 tranches : 3 par tranche, et surtout aucun index hors bornes —
    // c'est le cas que découper « au même index partout » casserait.
    expect(colonnesDeTranche(6, 0, 2)).toEqual([0, 1, 2]);
    expect(colonnesDeTranche(6, 1, 2)).toEqual([3, 4, 5]);
  });

  it('ne renvoie jamais d’index hors de la ligne', () => {
    for (const subdiv of [1, 3, 4, 5, 6, 8, 12, 16]) {
      for (const tranches of [1, 2, 4]) {
        for (let m = 0; m < tranches; m++) {
          for (const col of colonnesDeTranche(subdiv, m, tranches)) {
            expect(col).toBeGreaterThanOrEqual(0);
            expect(col).toBeLessThan(subdiv);
          }
        }
      }
    }
  });
});

describe('la fenêtre de la note — une mesure propre suffit, d’affilée', () => {
  const CYCLE = 3000;
  const QUATRE = [0, 0.25, 0.5, 0.75];
  const frappes = (ecarts: number[]) =>
    ecarts.map((e, i) => ((((QUATRE[i % 4] * CYCLE + e) / CYCLE) % 1) + 1) % 1);

  it('parfait sous le seuil d’indiscernable', () => {
    expect(justesseDuRythme(frappes([0, PARFAIT_MS, -PARFAIT_MS, 0]), QUATRE, CYCLE, 4).justesse).toBe(100);
  });

  /* ⚠️ Règle CHANGÉE le 2026-08-21 : la note moyennait tout le tour, et les
   * tâtonnements des premières mesures la plombaient pour toujours. */
  it('les tâtonnements d’avant ne plombent pas une mesure propre', () => {
    const n = justesseDuRythme(frappes([200, -200, 200, -200, 0, 0, 0, 0]), QUATRE, CYCLE, 4);
    expect(n.justesse).toBe(100);
  });

  it('la fenêtre est CONSÉCUTIVE : des bonnes frappes éparpillées ne suffisent pas', () => {
    const eparpille = justesseDuRythme(frappes([0, 200, 0, -200, 0, 200, 0, -200]), QUATRE, CYCLE, 4);
    expect(eparpille.justesse).toBeLessThan(SEUIL_JUSTESSE);
  });

  it('au-delà de la tolérance, une frappe ne vaut rien', () => {
    const milieu = justesseDuRythme(frappes([0, 0, 0, TOLERANCE_MS + 50]), QUATRE, CYCLE, 4).justesse;
    expect(milieu).toBeLessThanOrEqual(75);
  });

  it('renvoie 0 si rien n’est attendu — jamais une division par zéro', () => {
    expect(justesseDuRythme([0, 0], QUATRE, CYCLE, 0).justesse).toBe(0);
  });
});

describe('jouerGagne — la validation se déclenche toute seule, et elle ne durcit rien', () => {
  it('une mesure propre ne valide pas : il faut la TENIR dix frappes', () => {
    // C'est ce qui rend l'automatisme honnête : sans ce compte, le niveau se
    // boucle quatre frappes après le précompte et la victoire ressemble à un
    // accident.
    expect(jouerGagne(100, 4, 4)).toBe(false);
    expect(jouerGagne(100, 9, 4)).toBe(false);
    expect(jouerGagne(100, COUPS_POUR_VALIDER, 4)).toBe(true);
  });

  it('le seuil est celui que l’écran annonce, et il est franc', () => {
    // Relevé de 70 à 80 le 2026-09-19 (« il faut plutôt arriver à plus de
    // 80 % ») : l'écart moyen toléré passe de 67 ms à 58 ms.
    expect(SEUIL_JUSTESSE).toBe(80);
    expect(jouerGagne(SEUIL_JUSTESSE - 1, 20, 4)).toBe(false);
    expect(jouerGagne(SEUIL_JUSTESSE, 20, 4)).toBe(true);
  });

  it('un motif plus long que dix coups se juge sur SON compte', () => {
    // `coupsPourValider` ne descend jamais sous ce que la boucle demande :
    // valider un motif de douze coups sur dix laisserait deux coups hors de
    // toute mesure.
    expect(coupsPourValider(12)).toBe(12);
    expect(jouerGagne(100, 10, 12)).toBe(false);
    expect(jouerGagne(100, 12, 12)).toBe(true);
  });

  it('rien d’attendu ne valide jamais — un niveau pas encore monté n’est pas gagné', () => {
    expect(jouerGagne(100, 50, 0)).toBe(false);
  });

  /* ⚠️ LE test de cette famille : c'est lui qui dit que le compte de dix
   * RETARDE la victoire sans jamais l'interdire. `justesseDuRythme` retient
   * la MEILLEURE fenêtre, donc elle ne peut que monter quand on ajoute une
   * frappe — une mesure propre jouée au quatrième coup est encore là au
   * dixième. Si cette propriété tombait, le compte deviendrait un durcissement
   * silencieux des niveaux 37 et 38, dont l'histoire dit qu'ils étaient « tj
   * trop compliqués ».
   *
   * Aléatoire, donc répété : une assertion à un seul tirage est un tirage au
   * sort (CLAUDE.md).
   */
  it('ajouter une frappe ne fait JAMAIS baisser la justesse', () => {
    for (let n = 0; n < 60; n++) {
      const attendues = 2 + Math.floor(Math.random() * 6);
      const coups = Array.from({ length: attendues }, (_, i) => i / attendues);
      const phases: number[] = [];
      let avant = justesseDuRythme(phases, coups, 3000, attendues).justesse;
      for (let i = 0; i < 24; i++) {
        // N'importe où dans la mesure : des frappes justes aux frappes perdues.
        phases.push(Math.random());
        const apres = justesseDuRythme(phases, coups, 3000, attendues).justesse;
        expect(apres, `${attendues} attendues, ${phases.length} frappes`).toBeGreaterThanOrEqual(avant);
        avant = apres;
      }
    }
  });
});

describe('ecartAuClic — le calibrage, là où une erreur de signe corrigerait à l’envers', () => {
  const debut = 10;
  const pas = 0.6; // 100 bpm

  it('taper APRÈS le clic donne un écart positif', () => {
    expect(ecartAuClic(debut + 0.07, debut, pas)).toBeCloseTo(70, 6);
    // Et sur un clic plus loin dans la série, pas seulement le premier.
    expect(ecartAuClic(debut + 5 * pas + 0.07, debut, pas)).toBeCloseTo(70, 6);
  });

  it('taper AVANT le clic donne un écart négatif', () => {
    expect(ecartAuClic(debut + 3 * pas - 0.05, debut, pas)).toBeCloseTo(-50, 6);
  });

  it('pile sur le clic vaut zéro, à n’importe quel rang', () => {
    for (const n of [0, 1, 7, 11]) expect(ecartAuClic(debut + n * pas, debut, pas)).toBeCloseTo(0, 6);
  });

  it('se rattache toujours au clic le PLUS PROCHE, jamais au précédent', () => {
    // À 80 % de l’intervalle, la frappe est en avance sur le clic suivant —
    // pas en retard de 480 ms sur le précédent, ce qui la ferait passer pour
    // une aberration et fausserait la médiane.
    expect(ecartAuClic(debut + 0.8 * pas, debut, pas)).toBeCloseTo(-0.2 * pas * 1000, 6);
  });

  it('un intervalle nul ne divise pas par zéro', () => {
    expect(ecartAuClic(debut, debut, 0)).toBe(0);
  });
});

describe('medianeDesEcarts — le diagnostic que la justesse ne donne pas', () => {
  it('sépare « tout le monde en retard » de « à côté dans les deux sens »', () => {
    // Même justesse pour les deux séries, deux problèmes différents : le
    // premier est de la latence, le second de l’imprécision.
    const traine = [60, 62, 58, 61];
    const disperse = [60, -62, 58, -61];
    expect(medianeDesEcarts(traine)).toBeGreaterThan(50);
    expect(Math.abs(medianeDesEcarts(disperse))).toBeLessThan(10);
  });

  it('une frappe complètement à côté ne déplace pas le diagnostic', () => {
    // C’est la raison d’être de la médiane : la moyenne des mêmes valeurs
    // vaudrait 205.
    expect(medianeDesEcarts([10, 12, 14, 1000])).toBe(13);
  });

  it('série vide : 0, jamais NaN', () => {
    expect(medianeDesEcarts([])).toBe(0);
  });
});

describe('les niveaux', () => {
  it('la campagne reste 34 « reproduire » — ni la charpente ni les pilotes n’y touchent', () => {
    const campagne = LEVELS.slice(0, 34);
    expect(campagne).toHaveLength(34);
    for (const l of campagne) expect(l.exercise).toBe('reproduire');
  });

  /* ⚠️ Le compte était gravé (« exactement un de chaque ») ; il ne l'est plus,
   * et c'est le point : l'acte 0 a été refait avec trois exercices de frappe
   * (« enlever les questions "lequel", mettre les questions de tap »). Ce qui
   * doit rester vrai n'est pas un nombre, c'est que les DEUX sens existent —
   * un niveau `jouer` qui n'aurait plus que l'un des deux voudrait dire qu'une
   * moitié du verbe n'est jouée nulle part. */
  it('« jouer » existe dans ses deux sens, et le champ ne fuit pas ailleurs', () => {
    const jouer = LEVELS.filter((l) => l.exercise === 'jouer');
    const sens = new Set(jouer.map((l) => l.jouerIndice));
    expect([...sens].sort()).toEqual(['ecoute', 'lecture']);
    // Le défaut ne doit pas fuiter sur les autres verbes : le champ existe
    // partout mais n'a de sens que pour « jouer ».
    for (const l of LEVELS.filter((x) => x.exercise !== 'jouer')) {
      expect(l.jouerIndice).toBe('ecoute');
    }
  });

  it('un pilote de chacun des trois verbes de PARAMÈTRE existe, en Timbre', () => {
    for (const verbe of ['lequel', 'nommer', 'regler'] as const) {
      const l = LEVELS.find((x) => x.exercise === verbe);
      expect(l, verbe).toBeDefined();
      expect(l!.familleParam, verbe).toBe('timbre');
    }
  });

  it('un pilote de chaque nouveau verbe existe', () => {
    const verbes = new Set(LEVELS.map((l) => l.exercise));
    expect(verbes.has('completer')).toBe(true);
    expect(verbes.has('intrus')).toBe(true);
    expect(verbes.has('jouer')).toBe(true);
  });
});

/* Le verbe `melodie` — une ligne de basse tirée puis comparée.
 *
 * ⚠️ La génération passe par `Math.random()` : on affirme ce qui doit être vrai
 * à CHAQUE tirage, et on répète.
 */
describe('melodie — la basse tirée tient ses promesses', () => {
  const TIRAGES = 60;

  it('commence toujours sur la tonique, et ne sort jamais de la gamme', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    for (const id of [42, 43, 44]) {
      const i = L.findIndex((l) => l.id === id);
      const m = L[i].melodie;
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        expect(game.melodieCible.length, `niveau ${id}`).toBe(m.pas);
        // Sans point de départ, aucun degré ne se situe à l'oreille.
        expect(game.melodieCible[0], `niveau ${id}`).toBe(1);
        for (const d of game.melodieCible) {
          expect(d, `niveau ${id}`).toBeGreaterThanOrEqual(0);
          expect(d, `niveau ${id}`).toBeLessThanOrEqual(m.degreMax);
        }
        // Et il y a toujours quelque chose à trouver au-delà de la tonique.
        expect(game.melodieCible.filter((d) => d > 0).length, `niveau ${id}`).toBeGreaterThan(1);
      }
    }
  });

  it('répète vraiment la première moitié quand le niveau le promet', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.id === 43);
    const moitie = L[i].melodie.pas / 2;
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const c = game.melodieCible;
      expect(c.slice(moitie)).toEqual(c.slice(0, moitie));
    }
  });

  // La grille de proposition part vide, et seul le comparateur la verrouille.
  /* ⚠️ La TONIQUE est donnée d'entrée (2026-08-27). Elle ne l'était pas, alors
   * que la cible commence toujours par elle et que l'écran l'annonce comme le
   * repère : le joueur devait retrouver une note que la conception considère
   * comme acquise, et l'exercice se lisait comme cassé. */
  it('donne la tonique, verrouillée, et laisse le reste à trouver', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.id === 42));
    expect(game.melodieGuess[0], 'la tonique doit être posée').toBe(game.melodieCible[0]);
    expect(game.melodieLocked[0], 'et ne pas pouvoir être retirée').toBe(true);
    expect(game.melodieGuess.slice(1).every((v) => v === 0), 'le reste est vide').toBe(true);
    expect(game.melodieLocked.slice(1).every((v) => !v)).toBe(true);

    // Le verrou tient : recliquer la tonique ne l'efface pas.
    game.poserNote(0, game.melodieCible[0]);
    expect(game.melodieGuess[0]).toBe(game.melodieCible[0]);

    // Une seule note juste au-delà : la vérification échoue mais verrouille
    // la case — c'est ce qui rend l'exercice progressif.
    const suivant = game.melodieCible.findIndex((d, i) => i > 0 && d > 0);
    game.poserNote(suivant, game.melodieCible[suivant]);
    expect(game.verify()).toBe(false);
    expect(game.melodieLocked[suivant]).toBe(true);

    // Toutes les notes : c'est gagné.
    game.melodieCible.forEach((d, i) => d > 0 && game.poserNote(i, d));
    expect(game.verify()).toBe(true);
  });

  it('reclique un degré déjà posé pour l’effacer, et respecte le verrou', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.id === 44));
    game.poserNote(3, 4);
    expect(game.melodieGuess[3]).toBe(4);
    game.poserNote(3, 4);
    expect(game.melodieGuess[3]).toBe(0);
    // Monophonique : poser un autre degré remplace, il n'y a jamais d'accord.
    game.poserNote(3, 2);
    game.poserNote(3, 6);
    expect(game.melodieGuess[3]).toBe(6);
  });
});

/* « Le silence » — le quatrième mot de l'écoute, et le seul verbe dont la
 * bonne réponse est ce qu'on n'entend PAS.
 *
 * `HISTOIRE.md` le met sur le même plan que la hauteur, la durée et
 * l'intensité ; c'est aussi celui qui casse le plus facilement en silence, au
 * sens propre : un trou masqué par une autre ligne, ou tiré sur le premier pas
 * (où il n'y a rien à manquer, la boucle n'a pas encore commencé) donne un
 * niveau sans réponse — et rien à l'écran ne le dirait.
 */
describe('silence — le trou est audible, et il en existe un', () => {
  const TIRAGES = 60;

  it('creuse toujours un trou, jamais sur le premier pas, jamais masqué', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.pseudo = 'test';
    const i = L.findIndex((l) => l.exercise === 'silence');
    expect(i).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const pas = game.subdiv.hat;
      // La pulsation est régulière : tous les pas sauf un.
      expect(game.target.hat.filter((v) => v > 0)).toHaveLength(pas - 1);
      expect(game.target.hat[game.silenceReponse]).toBe(0);
      // ⚠️ Jamais le premier pas : sans point de départ entendu, il n'y a rien
      // à manquer — on n'entend pas un trou avant le début.
      expect(game.silenceReponse).toBeGreaterThan(0);
      expect(game.silenceReponse).toBeLessThan(pas);
      // ⚠️ Et le kick ne tient que le premier temps : posé sur le trou, il
      // boucherait exactement ce qu'on demande d'entendre.
      expect(game.target.kick[game.silenceReponse]).toBe(0);
      expect(game.target.snare.every((v) => v === 0)).toBe(true);
    }
  });

  it('ne se gagne que sur le bon pas, et la réponse repart à vide', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'silence');
    game.startLevel(i);
    expect(game.silenceChoix).toBeNull();
    const faux = game.silenceReponse === 1 ? 2 : 1;
    game.silenceChoix = faux;
    expect(game.verify()).toBe(false);
    game.silenceChoix = game.silenceReponse;
    expect(game.verify()).toBe(true);
    expect(game.solved).toBe(true);
  });
});

/* « La laverie » — l'acte 4, et le seul verbe dont la question porte sur
 * l'ENDROIT où l'on écoute plutôt que sur le son.
 *
 * Ce qui peut casser ici n'est pas le filtre (mesuré dans un
 * `OfflineAudioContext`, et ses constantes sont verrouillées ailleurs) mais le
 * CÂBLAGE : un exercice qui oublierait d'allumer le petit haut-parleur poserait
 * une question dont la réponse ne s'entend pas, et un exercice qui oublierait
 * de l'éteindre en partant priverait de grave tout ce qui suit.
 */
describe('laverie — trois versions, un seul haut-parleur qui compte', () => {
  const TIRAGES = 40;

  it('pose ses trois paliers de drive, sans jamais les tirer au hasard', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.pseudo = 'test';
    const i = L.findIndex((l) => l.exercise === 'laverie');
    expect(i).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      // Les mêmes trois valeurs à chaque partie — ce qui doit être garanti
      // n'est pas un écart de curseur mais un écart de SURVIE au passe-haut,
      // que `tirerVersions` ne sait pas mesurer.
      expect([...game.paramVersions].sort((a, b) => a - b)).toEqual([...LAVERIE_DRIVES].sort((a, b) => a - b));
      // La bonne réponse est toujours le plus driven — et jamais toujours au
      // même endroit, sinon on répondrait sans écouter.
      expect(game.paramVersions[game.paramReponse]).toBe(Math.max(...LAVERIE_DRIVES));
    }
    const positions = new Set<number>();
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      positions.add(game.paramReponse);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('arrive sur le petit haut-parleur, et le rend en partant', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const laverie = L.findIndex((l) => l.exercise === 'laverie');
    game.startLevel(laverie);
    // ⚠️ On ARRIVE à la laverie : c'est là que la question se pose. Poser la
    // question en studio la rendrait fausse — le drive y monte aussi le
    // niveau, donc « la plus forte » gagnerait sans rien enseigner.
    expect(game.ecoutePetite).toBe(true);
    // ⚠️ Et on repart en studio. Sans cette remise à zéro, l'exercice suivant
    // se jouerait sans grave, en silence sur la raison.
    const autre = L.findIndex((l) => l.exercise === 'reproduire');
    game.startLevel(autre);
    expect(game.ecoutePetite).toBe(false);
  });

  it('sonne le kick seul, avec le drive de la version écoutée', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.exercise === 'laverie'));
    for (let v = 0; v < game.paramVersions.length; v++) {
      game.paramVersionJouee = v;
      const st = game.buildState('param');
      expect(st.rows.kick.muted).toBe(false);
      expect(st.rows.snare.muted).toBe(true);
      expect(st.rows.hat.muted).toBe(true);
      expect(st.rows.kick.tone).toBeCloseTo(game.paramVersions[v], 6);
    }
  });

  it('ne se gagne que sur la version qui tient', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.exercise === 'laverie'));
    game.paramChoix = (game.paramReponse + 1) % game.paramVersions.length;
    expect(game.verify()).toBe(false);
    game.paramChoix = game.paramReponse;
    expect(game.verify()).toBe(true);
    expect(game.solved).toBe(true);
  });

  /* ⚠️ `laverie` POSE son bouton au lieu de le tirer, donc il ne doit pas
   * entrer dans `VERBES_PARAM` : `preparerParametre` lui tirerait un bouton de
   * la famille et l'exercice n'aurait plus de sujet. Et `tone` sur le kick doit
   * rester hors du catalogue — en studio il ne s'entend presque pas, ce qui en
   * fait une mauvaise question de timbre et une bonne question de production. */
  it('reste hors du catalogue et hors des verbes de paramètre', () => {
    expect(VERBES_PARAM).not.toContain('laverie');
    expect(estVerbeParam('laverie')).toBe(false);
    expect(parametre('tone')!.lignes).not.toContain('kick');
  });
});

/* « Le style » — le seul verbe qui interroge une CULTURE plutôt qu'une oreille.
 *
 * Rien à mesurer dans le son : tout à reconnaître. Ce qui peut casser ici sans
 * qu'on le voie, c'est le TIRAGE — un genre figé d'une partie à l'autre (et
 * l'exercice devient de la mémoire), ou des leurres pris dans la même famille
 * (et la réponse devient un tirage au sort).
 */
describe('style — reconnaître une famille, pas deviner un sous-genre', () => {
  const TIRAGES = 60;

  it('propose quatre genres dont le bon, jamais deux fois le même', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.pseudo = 'test';
    const i = L.findIndex((l) => l.exercise === 'style');
    expect(i).toBeGreaterThanOrEqual(0);
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      expect(game.styleCandidats).toHaveLength(4);
      expect(new Set(game.styleCandidats).size).toBe(4);
      expect(game.styleCandidats[game.styleReponse]).toBe(game.stylePresetId);
      expect(game.styleChoix).toBeNull();
    }
  });

  /* ⚠️ Le point de conception, et il est testé à CHAQUE tirage.
   *
   * Les leurres viennent d'autres catégories : on reconnaît une famille
   * (« c'est du dancehall »), pas un sous-genre. « Boom bap » contre « Drill »
   * et « Trap moderne » poserait une question dont la réponse est un tirage au
   * sort pour tout le monde sauf un spécialiste — le défaut même que
   * `tirerVersions` évite par construction pour les paramètres. */
  it('ne pose jamais deux genres de la même catégorie', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'style');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const cats = game.styleCandidats.map(
        (id) => PRESETS.find((p) => p.id === id)!.cat,
      );
      expect(new Set(cats).size, cats.join(' / ')).toBe(4);
    }
  });

  // Un genre figé serait de la mémoire dès la deuxième partie.
  it('tire un genre différent d’une partie à l’autre', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'style');
    const vus = new Set<string>();
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      vus.add(game.stylePresetId);
    }
    expect(vus.size).toBeGreaterThan(3);
  });

  /* ⚠️ Et la cible SONNE comme le genre. Un genre reconnu sur une grille sans
   * son tempo ni son timbre ne serait pas un genre : le niveau emprunte au
   * preset tiré sa grille, sa subdivision, son tempo, son swing et sa traîne.
   * C'est le `presetId` posé sur une copie de la config qui le donne — s'il
   * sautait, l'exercice se jouerait sur un rythme générique à 100 BPM et
   * personne ne le verrait. */
  it('emprunte au preset tiré son tempo et sa grille, pas seulement son nom', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'style');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const p = PRESETS.find((x) => x.id === game.stylePresetId)!;
      expect(game.tempo, p.label).toBe(p.tempo);
      expect(game.swing, p.label).toBe(p.swing);
      expect(game.subdiv.kick, p.label).toBe(p.kick.subdiv);
      // La grille jouée est bien celle du morceau, pas un tirage.
      const coups = game.target.kick.filter((v) => v > 0).length;
      expect(coups, p.label).toBe(p.kick.pattern.filter((v) => !!v).length);
    }
  });

  it('ne se gagne que sur le bon genre', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.startLevel(L.findIndex((l) => l.exercise === 'style'));
    game.styleChoix = (game.styleReponse + 1) % 4;
    expect(game.verify()).toBe(false);
    game.styleChoix = game.styleReponse;
    expect(game.verify()).toBe(true);
    expect(game.solved).toBe(true);
  });
});

/* ⚠️ UN NIVEAU NE PROMET PAS CE QU'IL NE POSE PAS.
 *
 * `forceVariantCount` et `forceRollCount` étaient déclarés dans le type,
 * remplis par les niveaux… et lus par PERSONNE : le forçage n'avait jamais été
 * porté. Mesuré avant correctif, sur 60 tirages :
 *
 *   niveau 5, « Variante (une seule) » →  0 variante sur 60
 *   niveau 8, « Rafale (une seule) »   →  0 rafale   sur 60
 *   niveau 9, tresillo « avec variante et rafale » → ni l'une ni l'autre
 *
 * Ces niveaux posent `variantChance: 0` / `rollChance: 0` JUSTEMENT parce
 * qu'ils comptaient sur le forçage. Sans lui, la consigne annonçait un rim
 * shot ou une rafale que la cible ne contenait jamais — trouvé par Yann en
 * jouant, pas par un test.
 *
 * Le test est générique : il vaut pour tout niveau qui déclare un forçage,
 * ceux à venir compris. Et il répète, parce qu'une seule vérification sur un
 * tirage est une pièce lancée (CLAUDE.md).
 */
describe('les niveaux tiennent ce que leur consigne annonce', () => {
  const TIRAGES = 60;

  it('pose bien le nombre de variantes qu’ils forcent', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const concernes = L.filter((l) => l.forceVariantCount > 0);
    expect(concernes.length, 'aucun niveau ne force de variante ?').toBeGreaterThan(0);
    for (const lvl of concernes) {
      const i = L.findIndex((l) => l.id === lvl.id);
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        const t = game.target as Record<string, number[]>;
        const variantes = (['snare', 'hat'] as const).reduce(
          (a, r) => a + (t[r] ?? []).filter((c) => c === 2).length,
          0,
        );
        expect(
          variantes,
          `niveau ${lvl.id} : ${variantes} variante(s) alors qu'il en promet ${lvl.forceVariantCount}`,
        ).toBeGreaterThanOrEqual(lvl.forceVariantCount);
      }
    }
  });

  it('pose bien le nombre de rafales qu’ils forcent', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const concernes = L.filter((l) => l.forceRollCount > 0 && l.rollMax > 1);
    expect(concernes.length, 'aucun niveau ne force de rafale ?').toBeGreaterThan(0);
    for (const lvl of concernes) {
      const i = L.findIndex((l) => l.id === lvl.id);
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        const t = game.target as Record<string, number[]>;
        const r = game.targetRolls as Record<string, number[]>;
        // Une rafale ne compte que sur une case ACTIVE : un `roll` posé sur
        // une case vide ne s'entend pas, et ne s'apprend donc pas.
        const rafales = (['kick', 'snare', 'hat'] as const).reduce(
          (a, ligne) =>
            a + (r[ligne] ?? []).filter((v, k) => v > 1 && (t[ligne]?.[k] ?? 0) > 0).length,
          0,
        );
        expect(
          rafales,
          `niveau ${lvl.id} : ${rafales} rafale(s) alors qu'il en promet ${lvl.forceRollCount}`,
        ).toBeGreaterThanOrEqual(lvl.forceRollCount);
      }
    }
  });
});

/* Le rythme se note SANS l'heure du son : un retard constant d'appareil
   (casque Bluetooth, dalle tactile) ne doit rien coûter, et rien d'autre ne
   doit passer pour lui. */
describe('justesseDuRythme — la place des frappes les unes par rapport aux autres', () => {
  const CYCLE = 3000; // une mesure à 80 bpm
  const QUATRE = [0, 0.25, 0.5, 0.75];
  const CONTRETEMPS = [0, 0.25, 0.375, 0.5, 0.75]; // le niveau 65
  const jouer = (coups: number[], tours: number, retardMs: number, bruit: (i: number) => number = () => 0) => {
    const out: number[] = [];
    for (let t = 0; t < tours; t++)
      for (const c of coups) out.push(((((c * CYCLE + retardMs + bruit(out.length)) / CYCLE) % 1) + 1) % 1);
    return out;
  };

  it('pile dans le temps : 100 %', () => {
    expect(justesseDuRythme(jouer(QUATRE, 3, 0), QUATRE, CYCLE, 4).justesse).toBe(100);
  });

  it('un casque Bluetooth (180 ms constants) ne coûte rien, et le décalage est retrouvé', () => {
    const n = justesseDuRythme(jouer(QUATRE, 3, 180), QUATRE, CYCLE, 4);
    expect(n.justesse).toBe(100);
    expect(n.decalageMs).toBe(180);
    expect(n.ecarts.every((e) => Math.abs(e) < 1)).toBe(true);
  });

  it('le contretemps aussi, avec un retard plus grand que la moitié de son plus petit écart', () => {
    // 375 ms entre le 2e temps et son « et » : comparé à l'heure du son, un
    // retard de 250 ms faisait attribuer la frappe au mauvais coup.
    expect(justesseDuRythme(jouer(CONTRETEMPS, 3, 250), CONTRETEMPS, CYCLE, 5).justesse).toBe(100);
  });

  it('oublier le contretemps coûte une note sur cinq : le motif se lit DANS L’ORDRE', () => {
    // L'ancienne notation (« le coup le plus proche ») donnait 100 % aux
    // quatre temps seuls. Lu dans l'ordre, le coup oublié vaut zéro.
    // ⚠️ Limite connue, hors de cette règle : 4/5 = 80 %, pile le seuil.
    const n = justesseDuRythme(jouer(QUATRE, 4, 0), CONTRETEMPS, CYCLE, 5);
    expect(n.justesse).toBeLessThanOrEqual(80);
  });

  it('taper toujours le même coup ne passe pas', () => {
    expect(justesseDuRythme(Array(12).fill(0.1), QUATRE, CYCLE, 4).justesse).toBeLessThan(SEUIL_JUSTESSE);
  });

  it('des frappes éparpillées restent mal notées : le décalage ne rattrape qu’une constante', () => {
    const alterne = jouer(QUATRE, 3, 0, (i) => (i % 2 ? 200 : -200));
    expect(justesseDuRythme(alterne, QUATRE, CYCLE, 4).justesse).toBeLessThan(SEUIL_JUSTESSE);
  });

  it('un contretemps systématique (un demi-temps) n’est pas un retard d’appareil', () => {
    expect(CYCLE / 8).toBeGreaterThan(DECALAGE_MAX_MS);
    const aContreTemps = jouer(QUATRE, 3, CYCLE / 8);
    expect(justesseDuRythme(aContreTemps, QUATRE, CYCLE, 4).justesse).toBeLessThan(SEUIL_JUSTESSE);
  });

  it('ajouter une frappe ne fait jamais baisser la note', () => {
    const frappes = jouer(QUATRE, 6, 120, (i) => ((i * 37) % 160) - 80);
    let avant = 0;
    for (let k = 1; k <= frappes.length; k++) {
      const n = justesseDuRythme(frappes.slice(0, k), QUATRE, CYCLE, 4).justesse;
      expect(n).toBeGreaterThanOrEqual(avant);
      avant = n;
    }
  });

  it('une seule frappe juste ne vaut pas 100 %', () => {
    expect(justesseDuRythme([0], QUATRE, CYCLE, 4).justesse).toBe(25);
  });
});
