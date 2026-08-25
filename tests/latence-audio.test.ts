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
import {
  PETIT_HP_COUPURE_HZ,
  PETIT_HP_PRESENCE_HZ,
  PETIT_HP_PRESENCE_DB,
} from '../src/engine/graph';
import { AVANCE_DECLENCHEMENT, TAMPON_SORTIE, AudioEngine } from '../src/engine/AudioEngine';
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

/* Le PETIT HAUT-PARLEUR — ses constantes, et le fait qu'il ne fasse rien au repos.
 *
 * L'acte 4 tient sur une phrase qu'aucun texte ne peut faire passer : « ton
 * morceau est bon dans ton ordinateur, ici il est mauvais ». Il a donc fallu un
 * étage de moteur — deux nœuds dans la chaîne finale, comme le `liveFilter` du
 * Mode Live.
 *
 * ⚠️ Le risque n'est PAS que le filtre marche mal, c'est qu'il marche TOUT LE
 * TEMPS : ces nœuds sont sur le trajet de l'Atelier et de l'export MP3. Ce que
 * ce fichier verrouille, c'est leur neutralité au repos ; l'effet, lui, se
 * mesure dans un `OfflineAudioContext` (voir plus bas), pas ici.
 */
describe('Le petit haut-parleur ne coûte rien tant qu’on ne l’allume pas', () => {
  /* ⚠️ Ce test remplace « la coupure au repos est sous l'audible », et le
   * remplacement EST la leçon. La première version montait les deux filtres EN
   * SÉRIE, réglés neutres au repos — en se disant qu'un passe-haut à 10 Hz ne
   * s'entend pas. C'est vrai de son amplitude et faux de sa PHASE : mesuré sur
   * un kick, 41 176 échantillons sur 44 100 changeaient, d'un écart maximal
   * supérieur au RMS du signal. L'étage aurait modifié tous les exports du
   * projet, inaudiblement et pour toujours.
   *
   * Le repos n'est donc plus un RÉGLAGE mais un TRAJET : les filtres vivent
   * dans une branche parallèle à gain nul, et le signal au repos passe par la
   * branche sèche — celle d'avant, échantillon pour échantillon. Ce qui se
   * vérifie ici est que la bascule ne touche QUE ces deux gains. */
  it('laisse le trajet d’origine intact au repos', () => {
    const nul = { value: -1 } as unknown as AudioParam;
    const cible: Record<string, number> = {};
    const param = (nom: string) =>
      ({
        setTargetAtTime: (v: number) => {
          cible[nom] = v;
        },
      }) as unknown as AudioParam;
    const engine = Object.create(AudioEngine.prototype) as AudioEngine;
    Object.assign(engine, {
      ctx: { currentTime: 0 },
      graph: {
        petitHPSec: { gain: param('sec') },
        petitHPHumide: { gain: param('humide') },
        petitHautParleur: { frequency: nul },
        petitHautParleurPresence: { gain: nul },
      },
    });

    engine.setPetitHautParleur(false);
    expect(cible).toEqual({ sec: 1, humide: 0 });
    engine.setPetitHautParleur(true);
    expect(cible).toEqual({ sec: 0, humide: 1 });
    // Les filtres eux-mêmes ne bougent JAMAIS : s'ils bougeaient, ils seraient
    // en série, et on repaierait la régression ci-dessus.
    expect(nul.value).toBe(-1);
  });

  it('coupe franchement une fois allumé, et pas à moitié', () => {
    // 450 Hz : un boîtier de radio-réveil. Mesuré à travers le vrai graphe dans
    // un OfflineAudioContext, sur un kick : l'énergie 40-200 Hz tombe d'un
    // facteur 14,8, et il reste 13 % du RMS total. Sur l'analyseur maître d'un
    // AudioEngine en marche, le grave perd plus de 20 dB — puis revient quand
    // on repasse au studio.
    expect(PETIT_HP_COUPURE_HZ).toBeGreaterThan(300);
    // Au-delà de 800 Hz on ne simule plus un petit haut-parleur mais un
    // téléphone à cadran : la caisse claire y passerait aussi.
    expect(PETIT_HP_COUPURE_HZ).toBeLessThan(800);
  });

  it('a une bosse de présence, parce que ce n’est pas juste « moins de son »', () => {
    // Le « sifflement » du texte. Sans elle, le petit haut-parleur passerait
    // pour une baisse de volume, et l'exercice se répondrait au vu-mètre.
    expect(PETIT_HP_PRESENCE_DB).toBeGreaterThan(0);
    expect(PETIT_HP_PRESENCE_HZ).toBeGreaterThan(PETIT_HP_COUPURE_HZ * 2);
  });
});
