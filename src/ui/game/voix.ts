/* Le PILOTE des voix du récit — quand ça sonne, et si ça sonne.
 *
 * La synthèse vit dans `engine/voixRecit.ts` (pure, sans DOM) ; ici vivent les
 * trois choses qui ne peuvent pas y vivre : le contexte audio, le débit, et le
 * réglage activé/désactivé.
 *
 * ⚠️ Le contexte est CELUI DES SONS SYSTÈME (`ui/xp/systemSounds.ts`). Un
 * contexte à part aurait rouvert le flux de sortie que sa sieste sert à
 * refermer — deux réveils à servir sur une route Bluetooth au lieu d'un.
 */
import { jouerVoix } from '../../engine/voixRecit';
import type { TimbreVoix } from '../../model/locuteurs';
import { contexteReveille } from '../xp/systemSounds';

const CLE = 'boite-a-rythme:voix-recit';

/** Activées par défaut : une voix qui ne se déclenche jamais n'existe pas. */
export function voixActives(): boolean {
  try {
    const brut = localStorage.getItem(CLE);
    return brut === null ? true : brut === '1';
  } catch {
    return true;
  }
}

export function setVoixActives(on: boolean): void {
  try {
    localStorage.setItem(CLE, on ? '1' : '0');
  } catch {
    /* stockage refusé : le réglage tient la session, sans persister */
  }
}

/* ⚠️ Le DÉBIT est un réglage de confort, pas un détail.
 *
 * Le texte se tape à une soixantaine de signes par seconde ; une frappe par
 * signe ferait une mitraillette. On garde donc un écart minimum entre deux
 * sons, et les frappes trop rapprochées sont poussées un peu plus loin plutôt
 * qu'empilées — c'est ce qui donne le cliquetis régulier d'une machine à
 * écrire au lieu d'un paquet. Au-delà d'un RETARD accumulé, on saute : mieux
 * vaut une frappe manquante qu'un son qui arrive après sa lettre. */
const ECART_MINI = 0.038;
const RETARD_MAX = 0.12;
let prochain = 0;

/** Une frappe de voix, maintenant (ou juste après, si ça se bouscule). */
export function frapper(timbre: TimbreVoix): void {
  if (!voixActives()) return;
  void (async () => {
    const c = await contexteReveille();
    if (!c) return;
    const t = Math.max(c.currentTime, prochain);
    if (t - c.currentTime > RETARD_MAX) return;
    prochain = t + ECART_MINI;
    jouerVoix(c, c.destination, timbre, t, Math.random);
  })();
}
