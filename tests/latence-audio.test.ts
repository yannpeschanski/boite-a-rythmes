/* Les deux constantes de latence du moteur, et ce qui les tient.
 *
 * Écrit après une régression MISE EN LIGNE : l'avance de déclenchement avait été
 * ramenée à 5 ms pour gagner de la latence, et le son s'est dégradé — « ça marche
 * très bien mais le son est devenu moche » (Yann, 2026-08-21).
 *
 * La raison tient en deux lignes, celles que TOUTES les voix exécutent :
 *
 *     g.gain.setValueAtTime(0.0001, time);
 *     g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
 *
 * L'attaque dure 3 à 4 ms. Si `time` est déjà passé quand le fil audio lit ces
 * deux lignes, Web Audio les applique ensemble : la rampe est sautée, le gain
 * saute — un clic à chaque note.
 *
 * ⚠️ CE FICHIER A CHANGÉ D'AVIS LE 2026-08-24, ET C'EST LE POINT.
 * Sa première version verrouillait l'AVANCE comme protection : « au moins cinq
 * fois la durée de l'attaque ». C'était traiter le symptôme — une marge rend le
 * clic rare, elle ne l'interdit pas, et une tâche de 30 ms sur le fil principal
 * passe au travers de n'importe quelle avance raisonnable. La cause est traitée
 * depuis dans `depart.ts` (une voix dont l'instant est passé repart de
 * maintenant, avec son attaque), et l'invariant qui compte est vérifié sur les
 * voix elles-mêmes dans `tests/depart.test.ts`.
 *
 * Ce qui reste ici : l'avance ne doit pas REDEVENIR une marge de sécurité. Si
 * elle remonte, c'est que quelqu'un a repris l'ancien raisonnement — et il
 * paiera en latence ce que la borne donne gratuitement.
 *
 * Les constantes sont IMPORTÉES, pas lues dans le fichier source. La première
 * version grattait `AudioEngine.ts` avec une expression régulière et
 * `node:fs` — deux fragilités pour rien, et `svelte-check` a refusé les types
 * Node en intégration continue.
 */
import { describe, it, expect } from 'vitest';
import { AVANCE_DECLENCHEMENT, TAMPON_SORTIE } from '../src/engine/AudioEngine';
import { departSur } from '../src/engine/depart';

describe('avance de déclenchement — de la latence pure, plus une marge', () => {
  it('reste petite : c’est le grain de l’ordonnanceur, pas la durée d’une attaque', () => {
    // Une frappe se programme DANS son gestionnaire d'événement : `currentTime`
    // est lu et les nœuds créés dans la même tâche. 8 ms couvrent le grain de
    // l'ordonnanceur ; 20 ms étaient la marge d'attaque d'avant `depart.ts`.
    expect(AVANCE_DECLENCHEMENT).toBeLessThanOrEqual(0.01);
  });

  it('ne tombe pas à zéro — un instant strictement futur reste préférable', () => {
    // La borne est un filet, pas une méthode : programmer exactement sur
    // `currentTime` ferait dépendre chaque note du filet à chaque frappe.
    expect(AVANCE_DECLENCHEMENT).toBeGreaterThan(0);
  });

  it('n’est plus ce qui protège l’attaque — c’est la borne qui le fait', () => {
    // Le lien est explicite : si cette borne disparaît, l'avance courte
    // redevient la régression du 2026-08-21.
    expect(departSur(10, 10 - AVANCE_DECLENCHEMENT)).toBe(10);
  });
});

describe('tampon de sortie — un préréglage sûr, pas le minimum matériel', () => {
  it('n’est pas revenu à « playback » : 72 ms mesurés, hors budget', () => {
    expect(TAMPON_SORTIE).not.toBe('playback');
  });

  it('reste un préréglage nommé, jamais une valeur numérique agressive', () => {
    // `latencyHint: 0.001` donne 128 échantillons et 8 ms — essayé en
    // production, le son s'est dégradé. Le préréglage 'interactive' est
    // dimensionné par le navigateur pour ne pas décrocher.
    expect(typeof TAMPON_SORTIE).toBe('string');
    expect(TAMPON_SORTIE).toBe('interactive');
  });
});
