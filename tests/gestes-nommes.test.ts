/* LES GESTES NOMMÉS DU MODE LIVE — et ce qui ne se relit pas.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Ce lot ajoute cinq commandes dont deux ne
 * peuvent PAS se vérifier à la relecture :
 *
 *  · le charley OUVERT change l'ÉTAT D'UN PAS, donc la voix appelée. Un
 *    drapeau posé une ligne trop haut dans `triggerHatStep` allumerait les pas
 *    muets au lieu d'ouvrir ceux qui sonnent — deux comportements que le type
 *    ne distingue pas et que l'écran ne montre pas ;
 *  · l'ARPÈGE et le BOURDON sont EXCLUSIFS dans le moteur, et l'exclusivité
 *    est SILENCIEUSE : la branche du bourdon fait `continue` avant celle de
 *    l'arpège. Bourdon allumé, le curseur d'arpège serait inaudible sur toute
 *    sa course, sans une erreur ni un voyant.
 *
 * On mesure donc les ÉVÉNEMENTS produits, jamais l'état déclaré.
 */
import { describe, it, expect } from 'vitest';
import { renderEvents } from './helpers/rejeu';
import { defaultState } from '../src/model/defaults';
import { CRANS_ARPEGE, CRANS_FILL, LIVE_AXES, cranDe, actionById } from '../src/ui/live/liveActions';
import { AudioEngine } from '../src/engine/AudioEngine';
import type { PatternStateV2 } from '../src/model/types';

function motif(): PatternStateV2 {
  const st = defaultState();
  st.tempo = 120;
  // Un charley qui ALTERNE : des pas qui sonnent et des pas muets, sans quoi
  // « il n'allume rien » ne se mesurerait pas.
  st.rows.hat.subdiv = 8;
  st.rows.hat.pattern = [1, 0, 1, 0, 1, 0, 1, 0];
  st.rows.hat.rolls = [1, 1, 1, 1, 1, 1, 1, 1];
  st.fillEvery = 0;
  st.spontRoll = 0;
  st.randomVelocity = 0;
  return st;
}

const compte = (evs: string[], quoi: string) => evs.filter((e) => e.startsWith(quoi + ' ')).length;

describe('OUVERT — le charley s’ouvre sans rien allumer', () => {
  it('ouvre les pas qui sonnent', () => {
    const st = motif();
    const repos = renderEvents(st, 1, 7);
    const tenu = renderEvents(st, 1, 7, 999, { forceHatOpen: true });

    expect(compte(repos, 'hatO'), 'au repos, aucun charley ouvert').toBe(0);
    expect(compte(repos, 'hatC')).toBe(4);
    expect(compte(tenu, 'hatO'), 'tenu, les quatre s’ouvrent').toBe(4);
    expect(compte(tenu, 'hatC')).toBe(0);
  });

  /* ⚠️ L'INVARIANT QUI SÉPARE UN GESTE DE TIMBRE D'UN GESTE D'ÉCRITURE, et
     celui que le drapeau posé une ligne trop haut casserait : le nombre de
     frappes ne bouge pas. Poser une frappe à la main est justement ce que la
     mesure a fait retirer du mode (±81 à ±334 ms de la grille). */
  it('n’allume aucun pas muet — le compte de frappes ne bouge pas', () => {
    const st = motif();
    const repos = renderEvents(st, 1, 7);
    const tenu = renderEvents(st, 1, 7, 999, { forceHatOpen: true });
    const frappes = (evs: string[]) => compte(evs, 'hatO') + compte(evs, 'hatC');
    expect(frappes(tenu)).toBe(frappes(repos));
  });

  /* Et il ne touche QUE le charley : un drapeau de contexte est lu par toutes
     les lignes qui veulent bien le lire. */
  it('ne touche à aucune autre ligne', () => {
    const st = motif();
    const sansHat = (evs: string[]) => evs.filter((e) => !e.startsWith('hat'));
    expect(sansHat(renderEvents(st, 1, 7, 999, { forceHatOpen: true }))).toEqual(sansHat(renderEvents(st, 1, 7)));
  });
});

describe('les treize crans de l’arpège', () => {
  const axe = LIVE_AXES.find((a) => a.id === 'arp-nappe')!;

  it('en a bien treize — un « aucun » plus 3 débits × 4 motifs', () => {
    expect(CRANS_ARPEGE).toHaveLength(13);
    expect(axe.crans).toBe(13);
    const combinaisons = CRANS_ARPEGE.filter((c) => c.rate !== null);
    expect(new Set(combinaisons.map((c) => `${c.rate}${c.pattern}`)).size).toBe(12);
    expect(new Set(CRANS_ARPEGE.map((c) => c.label)).size, 'deux crans ne peuvent pas porter le même nom').toBe(13);
  });

  /* ⚠️ AUCUN EST AU REPOS DU CURSEUR. Un curseur d'effet dont le bout gauche
     allume déjà l'effet n'a pas de position neutre — et le morceau qui n'a
     rien demandé doit pouvoir être rendu tel quel. */
  it('met AUCUN au bout gauche, et rien d’autre', () => {
    expect(CRANS_ARPEGE[0].rate).toBeNull();
    expect(CRANS_ARPEGE.filter((c) => c.rate === null)).toHaveLength(1);
  });

  /* ⚠️ LE DÉBIT MONTE DE GAUCHE À DROITE, c'est ce qui fait du curseur un
     GESTE et pas une liste. Rangé par motif, la même course aurait fait trois
     montées en dents de scie. */
  it('accélère de gauche à droite', () => {
    const debits = CRANS_ARPEGE.slice(1).map((c) => c.rate!);
    expect([...debits].sort((a, b) => a - b)).toEqual(debits);
  });

  /* La division est faite à UN endroit : `apply`, `libelle` et l'affichage
     doivent tomber sur le même entier, sinon le bouton nomme un cran et en
     joue un autre. */
  it('couvre les treize crans sur la course, bornes comprises', () => {
    const vus = new Set<string>();
    for (let i = 0; i <= 1000; i++) vus.add(axe.libelle!(i / 1000));
    expect(vus.size).toBe(13);
    expect(axe.libelle!(0)).toBe('AUCUN');
    expect(axe.libelle!(1), 'le bout de course ne doit pas sortir de la liste').toBe(CRANS_ARPEGE[12].label);
  });

  it('cranDe ne sort jamais de la liste', () => {
    expect(cranDe(0, 13)).toBe(0);
    expect(cranDe(1, 13)).toBe(12);
    expect(cranDe(0.9999, 13)).toBe(12);
  });
});

/* ⚠️ L'EXCLUSIVITÉ ARPÈGE / BOURDON, MESURÉE SUR LE SON.
 *
 * Le scheduler traite le bourdon AVANT l'arpège et fait `continue` : un
 * curseur d'arpège poussé pendant que le bourdon tient serait inaudible sur
 * toute sa course. C'est le piège que l'ancien bouton MODE NAPPE évitait en
 * n'offrant qu'un cycle à trois états ; séparés en deux commandes, ce sont
 * `setLiveArpege` et le moteur qui doivent le tenir. On le vérifie sur les
 * ÉVÉNEMENTS — `arp …` contre `drone …` — parce qu'un état déclaré ne dit pas
 * ce que la nappe joue.
 */
describe('l’arpège et le bourdon ne peuvent pas s’annuler en silence', () => {
  /* ⚠️ LA NAPPE DOIT VRAIMENT JOUER, sinon « 0 arpège » est vrai pour la
     mauvaise raison — le motif d'accueil laisse la nappe VIDE (`-1` partout,
     defaults.ts), donc la première version de ce test mesurait deux silences
     et l'aurait dit ✅. D'où le contrôle POSITIF juste en dessous : arpège
     seul DOIT sonner. */
  function nappe(arp: boolean, drone: boolean): string[] {
    const st = motif();
    st.synthGlobal.padArpEnabled = arp;
    st.synthGlobal.padDroneEnabled = drone;
    const pad = st.synthRows.pad;
    pad.muted = false;
    pad.pattern = new Array(pad.subdivisions).fill(0);
    return renderEvents(st, 2, 7);
  }

  it('le bourdon COUVRE l’arpège dans le moteur — c’est le piège', () => {
    const lesDeux = nappe(true, true);
    expect(compte(lesDeux, 'arp'), 'bourdon allumé, l’arpège ne sonne pas').toBe(0);
    expect(compte(nappe(true, false), 'arp')).toBeGreaterThan(0);
  });

  /* Donc poser un arpège doit ÉTEINDRE le bourdon, sinon le curseur est inerte
     sur toute sa course.

     ⚠️ SUR UN VRAI MOTEUR, pas sur un espion. Ma première version passait un
     faux `setLiveArpege` qui refaisait le calcul dans le test : retirer
     l'extinction du bourdon dans `AudioEngine` ne la faisait PAS tomber — elle
     mesurait sa propre copie. `new AudioEngine(etat)` fait tourner tous les
     initialiseurs sans toucher à l'audio (CLAUDE.md), et on lit l'état
     EFFECTIF, celui que le scheduler lira. */
  function moteurSurNappe() {
    const st = motif();
    st.synthGlobal.padArpEnabled = false;
    st.synthGlobal.padDroneEnabled = true; // le MORCEAU demande un bourdon
    const engine = new AudioEngine(() => st);
    const effectif = () =>
      (engine as unknown as { withLiveOverrides(x: PatternStateV2): PatternStateV2 }).withLiveOverrides(st).synthGlobal;
    return { engine, effectif, st };
  }

  it('poser un arpège éteint le bourdon', () => {
    const { engine, effectif } = moteurSurNappe();
    expect(effectif().padDroneEnabled, 'départ : le morceau tient un bourdon').toBe(true);

    LIVE_AXES.find((a) => a.id === 'arp-nappe')!.apply(engine, 0.5);
    expect(effectif().padArpEnabled).toBe(true);
    expect(effectif().padDroneEnabled, 'un arpège posé sous un bourdon serait muet').toBe(false);
    expect(engine.padMode).toBe('arpege');
  });

  /* ⚠️ ET LE REPOS REND LES DEUX. Le repos doit toucher exactement ce que
     l'aller a touché : n'effacer que l'arpège laisserait la nappe sans le
     bourdon que la lettre demande — un réglage éteint par un geste qu'on a
     déjà relâché. */
  it('le repos du curseur rend AUSSI le bourdon du morceau', () => {
    const { engine, effectif, st } = moteurSurNappe();
    const axe = LIVE_AXES.find((a) => a.id === 'arp-nappe')!;
    axe.apply(engine, 0.5);
    axe.repos!(engine, st);
    expect(effectif().padArpEnabled).toBe(false);
    expect(effectif().padDroneEnabled, 'le bourdon du morceau doit revenir').toBe(true);
    expect(engine.padMode).toBe('bourdon');
  });

  /* Le cran AUCUN n'est pas un repos : il ÉTEINT l'arpège pour de bon, contre
     le morceau s'il le faut. Les confondre ferait un curseur dont le bout
     gauche rend la main au lieu de dire « pas d'arpège ». */
  it('le cran AUCUN éteint l’arpège, il ne rend pas la main', () => {
    const st = motif();
    st.synthGlobal.padArpEnabled = true; // le MORCEAU demande un arpège
    st.synthGlobal.padDroneEnabled = false;
    const engine = new AudioEngine(() => st);
    LIVE_AXES.find((a) => a.id === 'arp-nappe')!.apply(engine, 0);
    expect(engine.padMode).toBe('normal');
  });
});

/* ⚠️ LE CÂBLAGE, PAS LE CALCUL — c'est lui qui casse (CLAUDE.md). Le
 * scheduler honore `forceHatOpen` (mesuré plus haut) ; ce qui reste à prouver
 * est que le BOUTON l'atteint, dans les deux sens. Un maintenu dont l'aller
 * marche et dont le retour appelle la mauvaise méthode laisse le charley
 * ouvert pour le reste du set, sans un mot.
 */
describe('OUVERT est branché sur le moteur, dans les deux sens', () => {
  it('appelle le moteur à l’appui ET au relâché', () => {
    const appels: { methode: string; args: unknown[] }[] = [];
    const espion = new Proxy(
      {},
      { get: (_c, methode: string) => (...args: unknown[]) => appels.push({ methode, args }) },
    ) as never;
    const ouvert = actionById('hold-ouvert');
    ouvert.hold!(espion, true, defaultState());
    ouvert.hold!(espion, false, defaultState());
    expect(appels.map((a) => a.methode)).toEqual(['liveSetHatOuvert', 'liveSetHatOuvert']);
    expect(appels.map((a) => a.args[0])).toEqual([true, false]);
  });

  /* Et il n'a PAS de `repos` : son relâché EST son retour. Deux chemins de
     retour pour un même geste feraient deux vérités à garder d'accord. */
  it('n’a pas de second chemin de retour', () => {
    expect(actionById('hold-ouvert').repos).toBeUndefined();
  });
});

describe('FILLS — le pas qui va de rien au plus fourni', () => {
  const fills = actionById('step-fill-auto');

  /* ⚠️ « AUCUN » EST DANS LA LISTE, et c'est ce que la note demandait
     explicitement : « 8 4 2 mais aussi pas de fill si on souhaite le
     retirer ». Sans lui, le bouton ne sait plus rendre le silence. */
  it('part de rien et va vers le plus fourni', () => {
    expect(CRANS_FILL[0]).toBe(0);
    const apres = CRANS_FILL.slice(1);
    // `fillEvery` compte des MESURES : plus petit = plus souvent.
    expect([...apres].sort((a, b) => b - a)).toEqual(apres);
  });

  /* Les crans ne sont pas inventés : ce sont ceux que `serialize.ts` accepte.
     Un cran hors de cette liste serait rabattu sur 0 au premier
     enregistrement — un bouton qui s'éteint tout seul. */
  it('ne cite que des valeurs que le modèle accepte', () => {
    expect([...CRANS_FILL].sort((a, b) => a - b)).toEqual([0, 2, 4, 8]);
  });

  /* ⚠️ LE PAS AVANCE DEPUIS CE QU'ON ENTEND, pas depuis zéro. Il lit la valeur
     EFFECTIVE (override par-dessus le morceau) : partir du morceau seul ferait
     reculer le bouton d'un cran au second appui — le défaut exact que le
     sidechain a payé sur `palierSuivant`. */
  it('boucle sur les quatre crans depuis n’importe lequel', () => {
    for (const depart of CRANS_FILL) {
      let valeur = depart;
      const espion = {
        grooveValeur: () => valeur,
        setLiveGrooveParam: (_k: string, v: number) => {
          valeur = v;
        },
      };
      const vus: number[] = [];
      for (let i = 0; i < 4; i++) {
        fills.step!(espion as never);
        vus.push(valeur);
      }
      expect(new Set(vus).size, `depuis ${depart}, les quatre crans`).toBe(4);
      expect(valeur, `depuis ${depart}, on revient au départ`).toBe(depart);
    }
  });
});
