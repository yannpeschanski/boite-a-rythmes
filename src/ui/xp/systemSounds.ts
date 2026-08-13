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

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

// Même forme d'enveloppe que playChime/playWinChime (attaque/chute
// exponentielles courtes) — juste des durées/fréquences plus discrètes,
// pensées pour un retour de chrome de fenêtre plutôt qu'une fanfare.
function chime(freqs: number[], dur: number, gain: number, type: OscillatorType): void {
  const c = ensureCtx();
  if (!c) return;
  void c.resume();
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
  if (id === 'open') chime([660, 880], 0.05, 0.12, 'sine');
  else if (id === 'close') chime([880, 660], 0.05, 0.12, 'sine');
  else chime([220, 196], 0.09, 0.14, 'square');
}
