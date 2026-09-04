// Sons système XP synthétisés (PLAN.md §2/§6) — pas de fichiers, des chirps
// Web Audio courts « à la XP » sur repli/dépliage de fenêtre et erreur, dans
// l'esprit des sons système Windows (démarrage, alerte). Contrairement à
// AudioEngine.playWinChime (Mode jeu, déjà porté depuis l'original), ceci
// n'a RIEN de l'original — nouvelle idée, sans référence à porter — et n'est
// pas rattaché à une instance AudioEngine particulière : XpWindow (composant
// générique réutilisé partout) ne doit dépendre d'aucun graphe audio précis,
// donc un contexte dédié, minimal, créé à la demande. Désactivable, persisté
// en localStorage, activé par défaut.
let ctx: AudioContext | null = null;
let sieste = 0;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/* ⚠️ Ce contexte s'ENDORT dès qu'il a fini de sonner (2026-08-26, « ça marche
 * assez mal avec le bluetooth »).
 *
 * Un AudioContext « running » sans rien de branché n'est pas gratuit : il tient
 * un FLUX DE SORTIE ouvert et le fait remplir à son rythme. Sur une sortie
 * lente et irrégulière — une route A2DP — deux flux vers le même appareil, ce
 * sont deux réveils à servir au lieu d'un, et chaque bloc manqué s'entend dans
 * le morceau, pas dans le chirp. Le contexte des sons système est de très loin
 * le moins utile des deux : il sert deux notes toutes les quelques minutes.
 *
 * Suspendu, il ne coûte plus rien et se réveille au son suivant (`chime`
 * attend la reprise avant de programmer, sinon les instants calculés sur une
 * horloge gelée tomberaient dans le passé — l'attaque serait sautée, et un son
 * de fenêtre claquerait). On ne le FERME pas : rouvrir un contexte est plus
 * cher, et un contexte fermé ne se rouvre pas du tout.
 *
 * Le délai laisse passer la note en cours et une éventuelle rafale de clics de
 * fenêtre sans rendormir/réveiller entre chaque. */
const SIESTE_MS = 1500;

function programmerSieste(): void {
  clearTimeout(sieste);
  sieste = setTimeout(() => {
    if (ctx && ctx.state === 'running') void ctx.suspend();
  }, SIESTE_MS) as unknown as number;
}

/* Le contexte des sons d'interface, réveillé et rendormi — partagé.
 *
 * ⚠️ Exporté depuis que les VOIX DU RÉCIT (`ui/game/voix.ts`) en ont eu besoin.
 * Un second contexte pour elles aurait rouvert exactement le flux de sortie que
 * la sieste ci-dessus sert à refermer : deux réveils à servir sur la même route
 * Bluetooth au lieu d'un. Un seul domicile pour cette mécanique, comme pour
 * toute règle qui doit rester d'accord avec elle-même.
 *
 * AWAIT, pas `void` : tant que le contexte est suspendu (autoplay, ou la sieste)
 * `currentTime` est gelé, et les instants calculés juste après seraient déjà
 * passés à la reprise — l'attaque serait sautée, et le son claquerait. */
export async function contexteReveille(): Promise<AudioContext | null> {
  const c = ensureCtx();
  if (!c) return null;
  if (c.state !== 'running') await c.resume();
  programmerSieste();
  return c;
}

// Même forme d'enveloppe que playChime/playWinChime (attaque/chute
// exponentielles courtes) — juste des durées/fréquences plus discrètes,
// pensées pour un retour de chrome de fenêtre plutôt qu'une fanfare.
async function chime(freqs: number[], dur: number, gain: number, type: OscillatorType): Promise<void> {
  const c = await contexteReveille();
  if (!c) return;
  freqs.forEach((f, i) => {
    const t = c.currentTime + i * dur;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + dur);
  });
}

const KEY = 'boite-a-rythme:system-sounds-enabled';

export function systemSoundsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function setSystemSoundsEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* quota plein ou stockage refusé : le réglage reste actif pour la session, sans persister */
  }
}

export type SystemSoundId = 'open' | 'close' | 'error';

// 'open'/'close' : deux notes sinus, montantes/descendantes — repli et
// dépliage de fenêtre (XpWindow). 'error' : deux notes carrées graves,
// timbre plus dur — fichier illisible à l'import (AtelierView.importJson).
export function playSystemSound(id: SystemSoundId): void {
  if (!systemSoundsEnabled()) return;
  if (id === 'open') void chime([660, 880], 0.05, 0.12, 'sine');
  else if (id === 'close') void chime([880, 660], 0.05, 0.12, 'sine');
  else void chime([220, 196], 0.09, 0.14, 'square');
}
