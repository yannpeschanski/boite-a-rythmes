/* Les commandes — ce que Sol vérifie en recevant un morceau.
 *
 * Ce fichier existe parce qu'une contrainte qui renvoie toujours `true` ne se
 * voit pas : l'écran affiche une coche verte, le joueur passe, et la commande
 * est du théâtre. Chaque contrainte est donc testée dans les DEUX sens — un
 * état qui la satisfait, un état qui ne la satisfait pas.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluerCommande,
  lignesPresentes,
  auMoinsUneVariante,
  auMoinsUneRafale,
  swingAuMoins,
  ligneSynthPresente,
  tempoEntre,
  pasLeMotifDeDepart,
} from '../src/model/commande';
import { defaultState } from '../src/model/defaults';
import { PRESETS } from '../src/model/presets/songs';
import { rankPresets } from '../src/engine/similarity';
import type { PatternStateV2 } from '../src/model/types';

/** Un état qui reprend les trois lignes d'un preset — le morceau « livré ». */
function etatDuPreset(id: string): PatternStateV2 {
  const p = PRESETS.find((x) => x.id === id)!;
  const st = defaultState();
  for (const n of ['kick', 'snare', 'hat'] as const) {
    const src = p[n];
    st.rows[n].subdiv = src.subdiv;
    st.rows[n].pattern = new Array(32)
      .fill(0)
      .map((_, i) =>
        src.pattern[i] === true ? 1 : src.pattern[i] === 2 ? 2 : src.pattern[i] ? 1 : 0,
      ) as never;
  }
  return st;
}

describe('chaque contrainte sait dire NON', () => {
  it('les lignes demandées doivent sonner — ni vides, ni coupées', () => {
    const c = lignesPresentes(['kick', 'snare', 'hat'], 'Kick, snare et hi-hat');
    const bon = etatDuPreset('boombap');
    expect(c.verifie(bon)).toBe(true);
    // Vidée : refusée.
    const vide = etatDuPreset('boombap');
    vide.rows.hat.pattern = new Array(32).fill(0) as never;
    expect(c.verifie(vide)).toBe(false);
    // ⚠️ Coupée : refusée aussi. Une ligne muette est un piège évident — la
    // grille est pleine, l'écran est vert, et on n'entend rien.
    const muette = etatDuPreset('boombap');
    muette.rows.hat.muted = true;
    expect(c.verifie(muette)).toBe(false);
  });

  it('la variante veut un 2 dans la grille, pas seulement une case allumée', () => {
    const c = auMoinsUneVariante();
    const st = etatDuPreset('boombap');
    st.rows.snare.pattern = new Array(32).fill(0) as never;
    st.rows.snare.pattern[4] = 1 as never;
    expect(c.verifie(st)).toBe(false);
    st.rows.snare.pattern[4] = 2 as never;
    expect(c.verifie(st)).toBe(true);
  });

  it('la rafale veut un multiplicateur SUR une case active', () => {
    const c = auMoinsUneRafale();
    const st = etatDuPreset('boombap');
    st.rows.kick.rolls = new Array(32).fill(1);
    expect(c.verifie(st)).toBe(false);
    // ⚠️ Une rafale posée sur une case ÉTEINTE ne s'entend pas : elle ne doit
    // pas compter. C'est le genre de case qu'on laisse traîner en éditant.
    const eteinte = st.rows.kick.pattern.findIndex((v) => !v);
    st.rows.kick.rolls[eteinte] = 3;
    expect(c.verifie(st)).toBe(false);
    const allumee = st.rows.kick.pattern.findIndex((v) => (v as number) > 0);
    st.rows.kick.rolls[allumee] = 3;
    expect(c.verifie(st)).toBe(true);
  });

  it('le swing se compare à un seuil', () => {
    const c = swingAuMoins(8);
    const st = defaultState();
    st.swing = 0;
    expect(c.verifie(st)).toBe(false);
    st.swing = 7;
    expect(c.verifie(st)).toBe(false);
    st.swing = 8;
    expect(c.verifie(st)).toBe(true);
  });

  it('une ligne de synthé doit avoir des notes ET ne pas être coupée', () => {
    const c = ligneSynthPresente('bass', 'Une basse');
    const st = defaultState();
    st.synthRows.bass.muted = false;
    st.synthRows.bass.subdivisions = 8;
    st.synthRows.bass.pattern = new Array(8).fill(null);
    expect(c.verifie(st)).toBe(false);
    st.synthRows.bass.pattern[0] = { degree: 1, octave: 0 };
    expect(c.verifie(st)).toBe(true);
    st.synthRows.bass.muted = true;
    expect(c.verifie(st)).toBe(false);
  });

  it('le tempo est un intervalle, bornes comprises', () => {
    const c = tempoEntre(88, 96, 'Entre 88 et 96');
    const st = defaultState();
    st.tempo = 87;
    expect(c.verifie(st)).toBe(false);
    st.tempo = 88;
    expect(c.verifie(st)).toBe(true);
    st.tempo = 96;
    expect(c.verifie(st)).toBe(true);
    st.tempo = 97;
    expect(c.verifie(st)).toBe(false);
  });
});

/* ⚠️ Le piège mesuré, et la contrainte qui existe pour lui.
 *
 * `defaultState()` ne démarre pas sur une grille vide : son motif de départ est
 * exactement celui de Motown. `rankPresets` lui donne 100 % sur « Motown /
 * soul » ET sur « Swing ». Sans garde-fou, entrer dans l'Atelier et en
 * ressortir sans rien toucher livrerait un morceau accepté par une commande de
 * style.
 */
describe('livrer sans rien faire ne passe jamais', () => {
  it('le motif de départ EST du Motown aux yeux du classement', () => {
    // Mesuré : `rankPresets` donne 100 % au motif de départ sur « Motown /
    // soul » ET sur « Swing » — il sort donc en tête ou juste derrière.
    const rang = rankPresets(defaultState()).findIndex((m) => m.preset.id === 'motown');
    expect(rang).toBeGreaterThanOrEqual(0);
    expect(rang, 'le départ ressemble à Motown — d’où `pasLeMotifDeDepart`').toBeLessThan(2);
  });

  it('mais la commande le refuse quand même', () => {
    const c = pasLeMotifDeDepart(defaultState());
    expect(c.verifie(defaultState())).toBe(false);
    const touche = defaultState();
    touche.rows.kick.pattern[1] = 1 as never;
    expect(c.verifie(touche)).toBe(true);
  });

  it('et le verdict complet refuse, en disant laquelle bloque', () => {
    const cahier = [
      pasLeMotifDeDepart(defaultState()),
      lignesPresentes(['kick', 'snare', 'hat'], 'Les trois lignes'),
    ];
    const v = evaluerCommande(defaultState(), cahier);
    expect(v.accepte).toBe(false);
    expect(v.lignes.map((l) => l.ok)).toEqual([false, true]);
  });
});

/* Le CÂBLAGE — ce qui ne se voit pas à l'écran mais casse la mécanique.
 *
 * Une commande traverse un changement de vue : on quitte le Mode jeu, on
 * travaille dans l'Atelier, on revient. Trois choses peuvent s'y perdre en
 * silence, et aucune n'apparaîtrait dans une capture d'écran.
 */
describe('la commande survit au voyage jusqu’à l’Atelier', () => {
  async function poserSurUneCommande() {
    const { game } = await import('../src/stores/game.svelte');
    const { ACTES } = await import('../src/model/carriere');
    game.pseudo = 'commande-test';
    const acte = ACTES.findIndex((a) => a.etapes.some((e) => e.kind === 'commande'));
    const etape = ACTES[acte].etapes.findIndex((e) => e.kind === 'commande');
    game.acteActif = acte;
    game.etapeActive = etape;
    return { game, acte, etape };
  }

  it('retient QUELLE étape attend une livraison', async () => {
    const { game, acte, etape } = await poserSurUneCommande();
    expect(game.commandeEnCours).toBeNull();
    game.ouvrirCommande();
    expect(game.commandeEnCours).toEqual({ acte, etape });
    expect(game.commande?.kind).toBe('commande');
  });

  /* ⚠️ Le cas qui justifie de retenir l'acte ET l'étape : reculer ou relire un
   * autre acte pendant qu'une commande est en cours ne doit pas faire valider
   * la mauvaise étape au retour. Le curseur volatil bouge, la commande non. */
  it('valide l’étape livrée, pas celle qu’on regardait en revenant', async () => {
    const { game, acte, etape } = await poserSurUneCommande();
    game.ouvrirCommande();
    // On part flâner ailleurs pendant qu'on travaille.
    game.acteActif = 0;
    game.etapeActive = 0;
    const bon = await etatQuiSatisfait(game.commande!.cahier);
    game.livrerCommande(bon);
    // Le curseur est revenu sur la commande, puis a avancé d'une étape.
    expect(game.acteActif).toBe(acte);
    expect(game.etapeActive).toBe(etape + 1);
    expect(game.commandeEnCours).toBeNull();
  });

  it('n’avance PAS le curseur quand le cahier n’est pas satisfait', async () => {
    const { game, acte, etape } = await poserSurUneCommande();
    game.ouvrirCommande();
    const v = game.livrerCommande(defaultState());
    expect(v?.accepte).toBe(false);
    expect(game.acteActif).toBe(acte);
    expect(game.etapeActive).toBe(etape);
    // Et la commande reste en cours : on retourne travailler.
    expect(game.commandeEnCours).toEqual({ acte, etape });
  });

  it('ne livre rien s’il n’y a pas de commande ouverte', async () => {
    const { game } = await import('../src/stores/game.svelte');
    game.commandeEnCours = null;
    expect(game.livrerCommande(defaultState())).toBeNull();
  });
});

/** Fabrique un état qui satisfait un cahier — en posant ce qu'il demande.
 *
 * Il LIT le cahier plutôt que de poser un morceau générique : depuis que les
 * commandes exigent un genre précis (`fiche:<id>`), partir toujours du même
 * preset ferait échouer toutes les autres. On rejoue donc la grille du genre
 * demandé — ce qu'un joueur fait à la main, et ce que le verrou de provenance
 * autorise (il refuse un preset CHARGÉ, pas une grille ressemblante). */
async function etatQuiSatisfait(cahier: { id: string }[]): Promise<PatternStateV2> {
  const fiche = cahier.find((c) => c.id.startsWith('fiche:'))?.id.slice(6);
  const st = etatDuPreset(fiche ?? 'dancehall');
  st.swing = 30;
  st.rows.snare.pattern[4] = 2 as never;
  const actif = st.rows.kick.pattern.findIndex((v) => (v as number) > 0);
  st.rows.kick.rolls[actif] = 3;
  // Une rafale d'accent sur le charley — la fiche techno en demande une.
  const hatActif = st.rows.hat.pattern.findIndex((v) => (v as number) > 0);
  if (hatActif >= 0) st.rows.hat.rolls[hatActif] = 3;
  /* Les TROIS lignes de synthé jouent : l'acte 3 les demande toutes depuis le
   * 2026-09-01 (« les additionner »). Les poser inconditionnellement est sans
   * effet sur les cahiers qui n'en demandent qu'une — `ligneSynthPresente`
   * vérifie une présence, pas une absence. */
  for (const l of ['bass', 'melody', 'pad'] as const) {
    st.synthRows[l].muted = false;
    st.synthRows[l].subdivisions = 8;
    st.synthRows[l].pattern = new Array(8).fill(null);
    st.synthRows[l].pattern[0] = { degree: 1, octave: 0 };
  }
  /* Et une TEXTURE choisie sur chacune. `voixChoisie` compare à
   * `defaultSynthVoice` : n'importe quel écart suffit, ici l'attaque. */
  if (demandeVoix(cahier)) {
    for (const l of ['bass', 'melody', 'pad'] as const) {
      st.synthRows[l].voice = { ...st.synthRows[l].voice, attack: 0.42 };
    }
  }
  // Les trois gestes de mixage de l'acte 4 (voir tests/mixage.test.ts). Sans
  // effet sur les cahiers qui ne les demandent pas.
  st.rows.kick.tone = 60;
  st.rows.hat.filterCutoff = 6000;
  st.rows.snare.reverbSend = 0.2;
  /* ⚠️ Les gestes d'une commande qui TRANSFORME (acte 2) sont appliqués
   * SEULEMENT si le cahier les demande, et jamais sur une commande de genre.
   *
   * Posés inconditionnellement, ils cassaient la fiche techno de l'acte 4 : un
   * charley troué contredit un charley en doubles-croches, et redessiner le
   * kick efface le four-on-the-floor. Un état « qui satisfait tout » n'existe
   * pas — deux clients peuvent demander l'inverse l'un de l'autre, et c'est
   * même le signe que les cahiers disent quelque chose. */
  const demande = (id: string) => cahier.some((c) => c.id === id);
  /* ⚠️ Les gestes de MIXAGE de l'acte 4 (2026-09-01). Mêmes règles que
   * ci-dessus : appliqués seulement s'ils sont demandés, parce qu'un filtre à
   * 6 000 Hz sur trois lignes contredirait une fiche de style qui exige des
   * aigus. On les pose au plus juste au-dessus du seuil, pas à fond : un test
   * qui satisfait un cahier en poussant tout au maximum ne prouve pas que le
   * cahier est atteignable, il prouve que ses bornes hautes sont absentes. */
  if (demande('filtre-9000')) {
    st.rows.kick.filterCutoff = 8000;
    st.rows.hat.filterCutoff = 7000;
  }
  if (demande('contraste')) {
    st.rows.kick.volume = 0.9;
    st.rows.hat.volume = 0.5;
  }
  if (demande('reverb-dosee')) {
    for (const l of ['kick', 'snare', 'hat', 'clap', 'shaker'] as const) st.rows[l].reverbSend = 0.3;
  }
  if (demande('delay')) {
    st.rows.snare.delaySend = 0.25;
    st.synthGlobal.delayFeedback = 0.3;
  }
  if (demande('retouchees')) {
    for (const l of ['kick', 'snare', 'hat'] as const) st.rows[l].tone = 42;
  }
  if (demande('kick-syncope')) {
    st.rows.kick.subdiv = 8;
    st.rows.kick.pattern = [1, 0, 0, 1, 1, 0, 0, 0] as never;
    st.rows.kick.rolls = [3, 1, 1, 1, 1, 1, 1, 1];
  }
  if (demande('place-voix')) {
    st.rows.hat.subdiv = 8;
    st.rows.hat.pattern = [1, 1, 1, 0, 1, 1, 1, 2] as never;
    st.rows.hat.rolls = [1, 1, 1, 1, 1, 1, 1, 1];
  }
  return st;
}

const demandeVoix = (cahier: Array<{ id: string }>) => cahier.some((c) => c.id === 'voix');

/* Toutes les commandes du récit doivent être SATISFIABLES — une commande dont
 * le cahier ne peut pas être rempli est un cul-de-sac que seul un joueur
 * découvrirait, après avoir cherché. */
describe('aucune commande du récit n’est un cul-de-sac', () => {
  it('chaque cahier admet au moins une livraison acceptée', async () => {
    const { ACTES } = await import('../src/model/carriere');
    const commandes = ACTES.flatMap((a) =>
      a.etapes.flatMap((e) => (e.kind === 'commande' ? [{ acte: a.id, e }] : [])),
    );
    expect(commandes.length).toBeGreaterThan(0);
    for (const { acte, e } of commandes) {
      /* Le départ voyage par le contexte depuis que l'acte 4 enchaîne des
       * envois : sans lui, « chaque ligne a été regardée » ne peut rien
       * conclure et répond FAUX — ce qui est le bon défaut, mais rendrait ce
       * test-ci ininterprétable. */
      const v = evaluerCommande(await etatQuiSatisfait(e.cahier), e.cahier, {
        depart: (await import('../src/model/defaults')).etatVierge(),
      });
      const manquantes = v.lignes.filter((l) => !l.ok).map((l) => l.contrainte.libelle);
      expect(manquantes, `acte ${acte} — « ${e.entete} »`).toEqual([]);
    }
  });

  it('et refuse une livraison qu’on n’a pas touchée — depuis SON point de départ', async () => {
    /* ⚠️ L'état réel au moment où la commande s'ouvre n'est plus toujours la
     * table rase : depuis `partirDu`, une commande peut s'ouvrir sur le rythme
     * qu'on vient de reproduire (acte 2). Tester `etatVierge()` pour toutes
     * ne dirait plus rien de ce que le joueur a sous les yeux — et laisserait
     * passer exactement le défaut qu'on veut éviter, une check-list cochée à
     * l'ouverture.
     *
     * On compare donc chaque commande à SON propre départ. */
    const { ACTES } = await import('../src/model/carriere');
    const { etatVierge, etatDepuisGrille } = await import('../src/model/defaults');
    const { LEVELS } = await import('../src/model/presets/levels');
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'commande') continue;
        let depart = etatVierge();
        if (e.partirDu !== undefined) {
          const l = LEVELS.find((x) => x.id === e.partirDu);
          expect(l?.grille, `acte ${a.id} : partirDu ${e.partirDu} sans grille écrite`).toBeTruthy();
          depart = etatDepuisGrille(l!.grille!, l!.tempoOptions[0]);
        }
        const v = evaluerCommande(depart, e.cahier, { depart });
        expect(v.accepte, `acte ${a.id} — « ${e.entete} »`).toBe(false);
        /* Et « il faut y avoir touché » doit être DÉCOCHÉ : une case cochée à
         * l'ouverture est ce qui a fait dire « la check-list est déjà remplie ».
         *
         * ⚠️ Toutes les commandes ne portent pas cette ligne : celles qui
         * REPRENNENT une livraison (acte 4) n'ont rien à exiger du morceau, il
         * est déjà accepté — ce sont leurs contraintes de mixage qui jouent ce
         * rôle, et le `expect` ci-dessus les couvre déjà. */
        const produit = v.lignes.find((l) => l.contrainte.id === 'produit');
        if (produit) expect(produit.ok, `acte ${a.id} — « ${e.entete} » : déjà coché`).toBe(false);
      }
    }
  });
});

/* ⚠️ LE CUL-DE-SAC QU'AUCUN TEST NE VOYAIT — trouvé par Yann en JOUANT.
 *
 * La commande de l'acte 3 exige une ligne de basse. Or le Synthé ne s'ouvre
 * qu'une fois l'acte 3 FRANCHI (`moduleUnlocked` : `acte > 3`), et la commande
 * est la dernière étape de l'acte 3 : elle demandait donc quelque chose que le
 * joueur ne pouvait pas produire, et la carrière s'arrêtait là.
 *
 * Les tests précédents ne pouvaient pas le voir : ils vérifient qu'un cahier
 * est SATISFIABLE par un état construit en mémoire, ce qui ne dit rien de ce
 * que l'écran laisse faire. Celui-ci croise les deux — le cahier et le verrou,
 * à l'instant où la commande se joue.
 */
describe('aucune commande n’exige un module verrouillé', () => {
  it('le Synthé est ouvert partout où un cahier demande une ligne de synthé', async () => {
    const { ACTES } = await import('../src/model/carriere');
    const { moduleUnlocked } = await import('../src/model/unlocks');
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'commande') continue;
        const demandeDuSynthe = e.cahier.some((c) => c.id.startsWith('synth:'));
        if (!demandeDuSynthe) continue;
        // Le contexte du joueur AU MOMENT de cette commande : il a atteint
        // l'acte `a.id`, sans l'avoir franchi, et son plancher est celui d'un
        // joueur neuf.
        const ouvert = moduleUnlocked('synth', {
          level: 1,
          plancher: 1,
          acte: a.id,
          modulesRequis: e.modulesRequis,
        });
        expect(ouvert, `acte ${a.id} — « ${e.entete} » demande une basse dans un Synthé fermé`).toBe(
          true,
        );
      }
    }
  });

  it('et une fiche de style qui exige une basse compte comme telle', async () => {
    // Les critères d'une fiche sont cachés dans la contrainte de style : si
    // une commande future demandait un genre à basse dans un module fermé, ce
    // test-ci ne la verrait pas. On vérifie donc aussi par les détails.
    const { ACTES } = await import('../src/model/carriere');
    const { moduleUnlocked } = await import('../src/model/unlocks');
    for (const a of ACTES) {
      for (const e of a.etapes) {
        if (e.kind !== 'commande') continue;
        const parFiche = e.cahier.some((c) =>
          c.details?.(defaultState()).some((d) => d.id.startsWith('synth:')),
        );
        if (!parFiche) continue;
        expect(
          moduleUnlocked('synth', {
            level: 1,
            plancher: 1,
            acte: a.id,
            modulesRequis: e.modulesRequis,
          }),
          `acte ${a.id} — « ${e.entete} » : sa fiche exige une basse, Synthé fermé`,
        ).toBe(true);
      }
    }
  });
});
