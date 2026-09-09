/* LES BOUTONS DU MODE LIVE — ce que la donnée seule peut vérifier.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Le catalogue est passé de 20 à 30 entrées le
 * 2026-09-08 (« pas convaincu des paramètres retenus pour les boutons, il faut
 * en ajouter bien d'autres »), et l'extension a introduit deux mécaniques que
 * rien ne surveillait : les MAINTENUS, qui doivent savoir revenir au repos, et
 * les PAS CYCLIQUES, dont la première version ne marchait que si la valeur de
 * départ tombait pile sur un palier.
 */
import { describe, it, expect } from 'vitest';
import {
  LIGNES_REGLABLES,
  LIVE_ACTIONS,
  LIVE_AXES,
  ACTIONS_TIRABLES,
  DEFAUTS_SLOTS,
  palierSuivant,
  tirerMode,
  loadLiveAssignments,
} from '../src/ui/live/liveActions';

describe('palierSuivant — le cycle d’un bouton PAS', () => {
  it('avance d’un palier quand on part PILE dessus', () => {
    expect(palierSuivant([0, 25, 50, 66], 0)).toBe(25);
    expect(palierSuivant([0, 25, 50, 66], 25)).toBe(50);
  });

  it('boucle sur le premier après le dernier', () => {
    expect(palierSuivant([0, 25, 50, 66], 66)).toBe(0);
  });

  /* ⚠️ LE DÉFAUT QUE CE TEST EXISTE POUR EMPÊCHER. La première version marchait
     par accident : le swing, les ghosts et les fills partent tous d'une valeur
     qui EST un palier, donc trois boutons sur quatre semblaient bons. Le
     sidechain part à 0,6 — entre deux paliers — et le bouton renvoyait un cran
     EN ARRIÈRE au premier appui. */
  it('avance aussi quand on part ENTRE deux paliers', () => {
    expect(palierSuivant([0, 0.5, 1], 0.6)).toBe(1);
    expect(palierSuivant([0, 0.5, 1], 0.2)).toBe(0.5);
    expect(palierSuivant([0, 25, 50, 66], 30)).toBe(50);
    /* Juste SOUS le dernier palier, on l'atteint — on ne boucle pas encore :
       « le prochain palier au-dessus » veut dire ça, et mon assertion inverse
       était l'erreur, pas le code. On ne boucle qu'une fois AU (ou au-dessus
       du) dernier. */
    expect(palierSuivant([0, 0.5, 1], 0.99)).toBe(1);
    expect(palierSuivant([0, 0.5, 1], 1)).toBe(0);
    expect(palierSuivant([0, 0.5, 1], 1.5)).toBe(0);
  });
});

describe('le catalogue reste sain après l’extension', () => {
  it('n’a aucun identifiant en double', () => {
    const ids = LIVE_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque entrée porte le geste que son `kind` annonce', () => {
    for (const a of LIVE_ACTIONS) {
      if (a.kind === 'step') expect(a.step, a.id).toBeTypeOf('function');
      /* Certains maintenus sont câblés à la main dans `runAction` parce qu'ils
         touchent l'état de la VUE et pas seulement le moteur. Ils le DISENT
         (`dansLaVue`) au lieu d'être listés ici : une liste d'exceptions dans
         un test se rallonge en silence à chaque entrée ajoutée, et personne ne
         la lit — c'était le cas, et deux solos de plus l'ont fait tomber. */
      if (a.kind === 'hold' && !a.dansLaVue) expect(a.hold, a.id).toBeTypeOf('function');
      // Et l'inverse : le drapeau ne sert qu'aux maintenus, pas de dispense
      // pour un PAS qui aurait oublié son geste.
      if (a.dansLaVue) expect(a.kind, a.id).toBe('hold');
    }
  });

  /* ⚠️ LE GARDE-FOU DES GESTES MOMENTANÉS, RÉANCRÉ — pas retiré.
   *
   * Il comptait les maintenus du seul catalogue d'ACTIONS, et il y en avait
   * huit sur trente. La révision du 2026-09-09 en retire quatre (SATURE,
   * BITCRUSH, SANS KICK, BATT. SEULE) : lu comme avant, le test tomberait, et
   * le baisser à quatre serait le vider de son sens.
   *
   * Or ce qui les remplace est un momentané MEILLEUR — le curseur momentané,
   * qui DOSE au lieu de sauter à une valeur gravée. La population à compter
   * n'est donc plus « les maintenus » mais « ce qui se joue au doigt et revient
   * tout seul » : les maintenus PLUS les axes capables de repos. Retirer le
   * compte serait perdre ce qu'il protège ; le réancrer, c'est le garder vrai.
   * (CLAUDE.md : réancrer sur une population plus large, jamais retirer le
   * compte.) */
  it('offre assez de gestes MOMENTANÉS pour un pupitre de scène', () => {
    const maintenus = LIVE_ACTIONS.filter((a) => a.kind === 'hold');
    const momentanables = LIVE_AXES.filter((a) => typeof a.repos === 'function');
    expect(maintenus.length + momentanables.length).toBeGreaterThanOrEqual(8);
    // Et le geste reste offert des DEUX côtés : un catalogue d'actions sans
    // aucun maintenu voudrait dire que TENIR et SOLO MÉLO sont partis aussi.
    expect(maintenus.length).toBeGreaterThan(0);
    expect(momentanables.length).toBeGreaterThan(0);
  });

  /* ⚠️ UN CURSEUR MOMENTANÉ QUI NE SAIT PAS REVENIR LAISSE LE MORCEAU LÀ OÙ LE
     DOIGT L'A LÂCHÉ — et un doigt glisse. C'est la règle des maintenus, portée
     aux axes : `repos` est ce qui autorise le mode momentané, et l'interface
     désactive le bouton pour un axe qui n'en a pas. Aujourd'hui ils en ont tous
     un ; le jour où on ajoute un axe sans, ce test le dit. */
  it('donne à chaque axe un retour au morceau', () => {
    for (const a of LIVE_AXES) expect(a.repos, a.id).toBeTypeOf('function');
  });

  /* ⚠️ LE DÉFAUT PORTE DES CURSEURS, et c'est tout l'objet du lot. L'ancien
     mettait les six boutons en mode ACTIONS : personne ne rencontrait jamais un
     curseur sans aller le chercher dans ⚙ — « ça manque de boutons où on règle
     un curseur, je ne comprends pas pourquoi ils ont disparu ». */
  it('livre une surface MIXTE : des gestes ET des curseurs', () => {
    const a = loadLiveAssignments();
    const curseurs = a.slotModes.filter((m) => m === 'fader').length;
    expect(curseurs).toBeGreaterThanOrEqual(2);
    expect(curseurs).toBeLessThan(a.slotModes.length);
    // Dont au moins un momentané : c'est le geste le plus demandé de la fiche.
    expect(a.faderMomentane.some((m, i) => m && a.slotModes[i] === 'fader')).toBe(true);
    // Un slot en mode fader garde quand même une action derrière lui —
    // basculer le mode ne doit jamais laisser le bouton vide.
    expect(DEFAUTS_SLOTS.every((slot) => slot.length > 0)).toBe(true);
  });

  /* ⚠️ LE TIRAGE CHANGE AUSSI LE TYPE (2026-09-09, retour de Yann : « il ne
     faut pas choisir entre un bouton et un curseur ou un autre type de bouton
     — quand ça randomise, ça peut transformer un bouton en fader »). Le 🎲 ne
     tirait que DANS le mode courant : un bouton d'actions le restait à vie, et
     découvrir les curseurs demandait de les choisir exprès. Le test dit ce que
     `tirerMode` doit rendre possible — les trois issues, aucune impossible. */
  it('un tirage de mode peut rendre les trois types de bouton', () => {
    // Les trois issues, et aucune impossible : c'est ce que « ça peut
    // transformer un bouton en fader » demande.
    expect(tirerMode(0.0)).toEqual({ mode: 'actions', momentane: false });
    expect(tirerMode(0.5)).toEqual({ mode: 'fader', momentane: false });
    expect(tirerMode(0.9)).toEqual({ mode: 'fader', momentane: true });
    // Sur mille tirages réels, les trois sortent — un mode inatteignable
    // serait exactement le défaut qu'on vient de corriger.
    const vus = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const t = tirerMode();
      vus.add(`${t.mode}${t.momentane ? '-momentane' : ''}`);
    }
    expect([...vus].sort()).toEqual(['actions', 'fader', 'fader-momentane']);
  });

  /* Les sept axes que la fiche laisse à l'Atelier, et les trois qu'elle
     demande. Un catalogue se relit mal ; un test le dit. */
  it('a retiré ce qui reste à l’Atelier et posé les curseurs demandés', () => {
    const ids = new Set(LIVE_AXES.map((a) => a.id));
    for (const parti of ['swing', 'drag', 'fill-intensity', 'compression', 'volume', 'sidechain-depth'])
      expect(ids.has(parti), parti).toBe(false);
    for (const entre of ['spont-roll', 'random-velocity', 'synth-swing'])
      expect(ids.has(entre), entre).toBe(true);
    // Les macros de l'Atelier remplacent les paramètres bruts, sous leur nom.
    for (const brut of ['cutoff-bass', 'resonance-bass', 'filter-env-bass', 'vibrato-bass'])
      expect(ids.has(brut), brut).toBe(false);
    for (const macro of ['brillance-bass', 'mouvement-bass', 'vibrato-synthe'])
      expect(ids.has(macro), macro).toBe(true);
  });

  /* ⚠️ LA RANGÉE DE KNOBS D'UNE TABLE DE MIXAGE — six réglages par ligne, sur
     les TROIS lignes que la surface montre. « Pas forcément toutes les
     lignes » : clap et shaker n'y sont pas, parce que le mini séquenceur ne
     les affiche pas et qu'un réglage qu'on ne voit pas se régler ne se trouve
     pas. Le test dit les deux moitiés — ce qui est là, et ce qui ne l'est
     pas. */
  it('donne six réglages par ligne, aux trois lignes que la surface montre', () => {
    const ids = new Set(LIVE_AXES.map((a) => a.id));
    for (const ligne of LIGNES_REGLABLES)
      for (const quoi of ['filtre', 'reverb', 'delay', 'pitch', 'decay', 'decalage'])
        expect(ids.has(`${quoi}-${ligne}`), `${quoi}-${ligne}`).toBe(true);
    for (const dehors of ['clap', 'shaker']) {
      expect(LIGNES_REGLABLES).not.toContain(dehors);
      expect(ids.has(`filtre-${dehors}`), dehors).toBe(false);
    }
    // L'attaque porte deux coches qui se contredisent (PAR LIGNE et ATELIER) :
    // on a suivi l'argument, pas le compte. Elle rentrera d'un mot.
    expect(ids.has('attaque-kick')).toBe(false);
  });

  /* Les envois par ligne existent des DEUX côtés — batterie et synthé — parce
     que le « throw » de réverbe se fait sur la ligne qu'on veut noyer, pas sur
     celles que le graphe a rendues faciles. */
  it('donne des envois par ligne à la batterie ET au synthé', () => {
    const ids = new Set(LIVE_AXES.map((a) => a.id));
    for (const ligne of [...LIGNES_REGLABLES, 'bass', 'pad', 'melody'])
      for (const quoi of ['reverb', 'delay']) expect(ids.has(`${quoi}-${ligne}`), `${quoi}-${ligne}`).toBe(true);
  });

  /* ⚠️ ET LA CURE DE 2026-09-02 NE DOIT PAS SE DÉFAIRE. Elle avait retiré les
     FAMILLES DE VARIANTES (neuf rafales pour trois lignes, six pas de preset de
     voix). L'extension ajoute des gestes distincts ; si un jour deux entrées ne
     diffèrent plus que par un chiffre ou une direction, c'est le retour du
     défaut — les seuls miroirs tolérés sont marqués `tirable: false`. */
  it('ne réintroduit aucune famille de variantes', () => {
    const miroirs = LIVE_ACTIONS.filter((a) => a.tirable === false);
    expect(miroirs.length).toBeLessThanOrEqual(2);
    expect(ACTIONS_TIRABLES.length).toBe(LIVE_ACTIONS.length - miroirs.length);
    // Aucun identifiant ne se termine par un chiffre : c'est la signature d'une
    // variante (roll-hat-x2, roll-hat-x3…).
    for (const a of LIVE_ACTIONS) expect(a.id, a.id).not.toMatch(/\d$/);
  });
});
