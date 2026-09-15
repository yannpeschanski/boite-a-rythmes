/* Le verdict de latence, et surtout la CAUSE qu'il désigne.
 *
 * Ce qui est en jeu n'est pas un seuil mais un conseil : dire « débranche ton
 * casque » à quelqu'un dont le retard vient du tampon de son navigateur, c'est
 * l'envoyer débrancher pour rien — son haut-parleur est déjà aussi lent. Les
 * deux cas réels mesurés le 2026-09-15 sont donc testés tels quels.
 */
import { describe, it, expect } from 'vitest';
import {
  verdictLatence,
  messageLatence,
  SEUIL_SENSIBLE,
  SEUIL_LOURD,
} from '../src/ui/latenceVerdict';

describe('les deux cas mesurés sur le téléphone', () => {
  it('Chrome — tampon 128 ms, mesuré 115 : le NAVIGATEUR est en cause', () => {
    const v = verdictLatence(128, 115);
    expect(v.palier).toBe('lourde');
    expect(v.cause).toBe('navigateur');
    // Le conseil ne doit surtout pas parler de sortie : le haut-parleur de cet
    // appareil mesure 190 ms, débrancher le casque n'y changerait rien.
    expect(messageLatence(v)).toMatch(/navigateur/i);
    expect(messageLatence(v)).not.toMatch(/filaire|haut-parleur|bluetooth/i);
  });

  it('Firefox + Bluetooth — tampon 0 ms, mesuré 180 : la SORTIE est en cause', () => {
    const v = verdictLatence(0, 180);
    expect(v.palier).toBe('lourde');
    expect(v.cause).toBe('sortie');
    expect(messageLatence(v)).toMatch(/bluetooth|filaire/i);
    expect(messageLatence(v)).not.toMatch(/essaie-en un autre/i);
  });

  it('Firefox sur haut-parleur — rien à signaler', () => {
    // −32 ms : le joueur ANTICIPE le métronome, ce n'est pas un retard. La
    // valeur absolue évite de lire une anticipation comme une avance magique.
    const v = verdictLatence(0, -32);
    expect(v.palier).toBe('jouable');
    expect(messageLatence(v)).toBeNull();
  });
});

describe('ce que le verdict refuse de faire', () => {
  it('ne désigne aucun coupable quand le retard ne compte pas', () => {
    // Sur un appareil rapide, nommer une cause serait du bruit.
    expect(verdictLatence(10, 5).cause).toBe('inconnue');
  });

  it('ne devine pas quand le navigateur ne dit rien de son tampon', () => {
    // WebKit ne déclare pas `baseLatency`. Un mauvais conseil coûte plus cher
    // qu'une absence de conseil.
    const v = verdictLatence(null, 150);
    expect(v.palier).toBe('lourde');
    expect(v.cause).toBe('inconnue');
    expect(messageLatence(v)).toMatch(/autre navigateur ou une autre sortie/i);
  });

  it('se tait complètement quand on ne sait rien', () => {
    const v = verdictLatence(null, null);
    expect(v.ms).toBe(0);
    expect(v.palier).toBe('jouable');
    expect(messageLatence(v)).toBeNull();
  });
});

describe('les paliers', () => {
  it('retient le PIRE des deux sources', () => {
    // Le navigateur peut sous-déclarer (Firefox, 0 pour 180 réels) : la mesure
    // doit pouvoir le contredire, et l'inverse aussi tant qu'elle manque.
    expect(verdictLatence(128, null).ms).toBe(128);
    expect(verdictLatence(0, 180).ms).toBe(180);
  });

  it('place la frontière du sensible là où la littérature la place', () => {
    // Wessel & Wright : au-delà de 30 ms on entend le décalage. 40 est la
    // première borne ronde au-dessus, pas 100 — à 100 on laisserait passer sans
    // un mot des appareils où jouer au doigt est déjà faux.
    expect(SEUIL_SENSIBLE).toBeLessThanOrEqual(50);
    expect(SEUIL_SENSIBLE).toBeGreaterThan(30);
    expect(SEUIL_LOURD).toBeGreaterThan(SEUIL_SENSIBLE);
    expect(verdictLatence(SEUIL_SENSIBLE, null).palier).toBe('sensible');
    expect(verdictLatence(SEUIL_SENSIBLE - 1, null).palier).toBe('jouable');
    expect(verdictLatence(SEUIL_LOURD, null).palier).toBe('lourde');
  });
});
