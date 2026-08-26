/* Le tampon de sortie SUIT la sortie — court en filaire, large en Bluetooth.
 *
 * POURQUOI CE FICHIER EXISTE (2026-08-26, « ça marche assez mal avec le
 * bluetooth » — crachotements pendant la lecture, Android/Chrome).
 *
 * `TAMPON_SORTIE` valait `'interactive'` pour tout le monde, et c'était le bon
 * choix POUR LA RAISON QUI L'AVAIT DICTÉ : l'appli est un instrument, un pad
 * qui répond en 72 ms au lieu de 32 ne se joue pas. Ce raisonnement tient un
 * budget — doigt → son — et il suppose que ce budget est encore disputable.
 *
 * EN BLUETOOTH IL NE L'EST PLUS. Un casque A2DP joue ce qu'on lui envoie 100 à
 * 200 ms plus tard, dans son propre tampon, hors de portée du navigateur. Les
 * 40 ms que le petit tampon fait gagner sont 40 ms sur 250 : inaudibles. Ce
 * qui reste audible, en revanche, c'est ce que le petit tampon COÛTE — le fil
 * audio doit remplir un bloc court à chaque réveil d'une route lente et
 * irrégulière, et tout dépassement s'entend, une fois par bloc manqué. C'est
 * le crachotement.
 *
 * D'où la règle, qui n'est pas un compromis mais une constatation : **quand la
 * sortie est déjà lente, le petit tampon n'achète plus rien et continue de
 * tout coûter.** On repasse alors sur `'playback'` — le préréglage que le
 * navigateur dimensionne pour ne pas décrocher.
 *
 * ⚠️ NE PAS confondre avec l'arbitrage du 2026-08-21 (voir `TAMPON_SORTIE`
 * dans AudioEngine.ts, et `tests/latence-audio.test.ts`). Le défaut reste
 * `'interactive'`, et il n'est pas question d'y revenir : ce fichier ne change
 * de tampon QUE là où la latence de sortie est déjà perdue.
 *
 * CE QUI DÉCLENCHE LA BASCULE, et pourquoi il y a deux chemins.
 *
 *  1. `'auto'` — la latence de sortie DÉCLARÉE par le navigateur. Chrome sur
 *     Android renseigne `outputLatency` et y fait figurer le retard de la
 *     route A2DP : au-delà du seuil, la sortie est lente, quelle qu'en soit la
 *     raison (Bluetooth, HDMI, moniteur USB). On ne cherche pas « est-ce du
 *     Bluetooth » — la question n'est pas la nature de la sortie mais sa
 *     lenteur, et c'est elle qui se mesure.
 *  2. Le RÉGLAGE MANUEL, parce que le point 1 dépend d'un chiffre que le
 *     navigateur n'est pas obligé de donner : WebKit ne déclare pas
 *     `outputLatency` du tout, et un Android peut le sous-déclarer. Un
 *     utilisateur qui entend crachoter doit pouvoir forcer le gros tampon sans
 *     dépendre de ce que sa plateforme veut bien avouer.
 *
 * La détection ne se persiste pas : elle vaut pour la sortie du MOMENT, et un
 * casque se débranche. Le réglage manuel, lui, se persiste (voir
 * `ui/sortie.svelte.ts`) — c'est une propriété de l'appareil, comme le
 * calibrage du décalage d'entrée.
 *
 * Ce module est PUR (aucun DOM, aucun Svelte, aucun `localStorage`) : le
 * moteur le lit, l'interface l'écrit. `tests/tampon.test.ts` tient la règle.
 */

export type PreferenceTampon = 'auto' | 'large' | 'court';

/* Au-delà de quoi une sortie est « lente », en secondes.
 *
 * 100 ms. Repères mesurés dans Chromium (2026-08-21, voir AudioEngine.ts) :
 * 32 ms de latence déclarée en `'interactive'`, 72 ms en `'playback'` — donc
 * même le GROS tampon d'une sortie filaire reste sous le seuil, et une sortie
 * filaire ne bascule jamais. Un casque A2DP commence, lui, vers 100-150 ms.
 * Le seuil sépare les deux mondes sans avoir à nommer le second. */
export const SEUIL_SORTIE_LENTE = 0.1; // s

/* La latence déclarée dit-elle une sortie lente ?
 *
 * `undefined` (WebKit) n'est PAS « lente » : c'est « on ne sait pas ». Basculer
 * sur un silence rendrait tous les iPhone lents d'office, y compris ceux qui
 * jouent dans leur haut-parleur — et le réglage manuel est précisément la
 * réponse à ce cas-là. */
export function sortieDeclareeLente(outputLatency: number | undefined): boolean {
  return typeof outputLatency === 'number' && outputLatency >= SEUIL_SORTIE_LENTE;
}

/* La décision, pure : préférence + ce qu'on a observé de la sortie.
 *
 * Le manuel gagne toujours sur l'observation — c'est ce qui rend le réglage
 * utile là où l'observation est aveugle. */
export function tamponPourSortie(
  preference: PreferenceTampon,
  lente: boolean,
): AudioContextLatencyCategory {
  if (preference === 'large') return 'playback';
  if (preference === 'court') return 'interactive';
  return lente ? 'playback' : 'interactive';
}

let preference: PreferenceTampon = 'auto';
/* Observation de la SESSION, jamais persistée : un casque se débranche. */
let lente = false;

export function setPreferenceTampon(p: PreferenceTampon): void {
  preference = p;
}

export function getPreferenceTampon(): PreferenceTampon {
  return preference;
}

/* Ce que le moteur a vu de sa sortie. Appelé au démarrage de la lecture ET à
 * chaque tick : `outputLatency` vaut souvent 0 juste après la création du
 * contexte (le flux n'est pas encore ouvert), donc une seule lecture, au pire
 * moment, raterait la bascule. Une fois vue, la lenteur reste vue pour la
 * session — elle ne se rétracte pas au premier zéro passager. */
export function noterSortie(outputLatency: number | undefined): void {
  if (sortieDeclareeLente(outputLatency)) lente = true;
}

export function sortieLente(): boolean {
  return lente;
}

/* Ce que le prochain `AudioContext` doit demander. */
export function tamponCourant(): AudioContextLatencyCategory {
  return tamponPourSortie(preference, lente);
}

/* Pour les tests : remet l'observation à zéro (elle n'a pas d'autre écriture). */
export function oublierSortie(): void {
  lente = false;
}
