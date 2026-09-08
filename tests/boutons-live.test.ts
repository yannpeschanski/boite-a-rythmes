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
import { LIVE_ACTIONS, ACTIONS_TIRABLES, palierSuivant } from '../src/ui/live/liveActions';

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
      if (a.kind === 'ligne') expect(a.ligne, a.id).toBeTruthy();
      /* Les deux maintenus historiques (TENIR, SOLO MÉLO) sont câblés à la main
         dans `runAction` parce qu'ils touchent l'état de la VUE, pas seulement
         le moteur. Tous les autres portent leur geste. */
      if (a.kind === 'hold' && !['section-hold', 'solo-melody'].includes(a.id)) {
        expect(a.hold, a.id).toBeTypeOf('function');
      }
    }
  });

  /* ⚠️ LE VRAI TROU QUE L'EXTENSION COMBLE, et il se comptait : un pupitre de
     scène est fait de gestes MOMENTANÉS — on ferme un filtre le temps d'un
     break, on coupe le kick quatre temps. Le catalogue à 20 entrées n'avait
     que DEUX maintenus sur vingt. */
  it('offre assez de gestes MOMENTANÉS pour un pupitre de scène', () => {
    const maintenus = LIVE_ACTIONS.filter((a) => a.kind === 'hold');
    expect(maintenus.length).toBeGreaterThanOrEqual(8);
    expect(maintenus.length / LIVE_ACTIONS.length).toBeGreaterThan(0.2);
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
