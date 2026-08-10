// Partage d'un rythme par URL — le pattern (format v2) compressé dans le
// fragment de l'URL. Aucun serveur : le lien contient le morceau.
// Le fragment n'est jamais envoyé au serveur par le navigateur, et il n'y a
// pas de limite de taille imposée comme sur une query string.
import { pattern } from './pattern.svelte';
import { serializeState, deserializeState } from '../model/serialize';

// Compression maison suffisante ici : JSON -> UTF-8 -> base64url. Les
// patterns sérialisés font quelques ko, largement dans ce que les
// navigateurs acceptent dans un fragment.
function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function buildShareUrl(): string {
  const encoded = toBase64Url(serializeState(pattern.snapshot()));
  return `${location.origin}${location.pathname}#r=${encoded}`;
}

// Charge le rythme présent dans l'URL, s'il y en a un. Renvoie true si un
// rythme a été appliqué (l'appelant bascule alors sur l'Atelier).
export function loadFromHash(): boolean {
  const m = /[#&]r=([A-Za-z0-9\-_]+)/.exec(location.hash);
  if (!m) return false;
  try {
    pattern.replace(deserializeState(fromBase64Url(m[1])));
    return true;
  } catch {
    return false;
  }
}

// Sauvegarde automatique — l'original ne persistait QUE la progression du jeu
// et la besace, jamais le pattern de l'Atelier : un rechargement perdait tout.
const KEY_AUTOSAVE = 'boite-a-rythme:atelier-autosave';
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutosave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY_AUTOSAVE, pattern.toJson());
    } catch {
      /* quota plein : on continue sans persistance */
    }
  }, 1000);
}

export function hasAutosave(): boolean {
  try {
    return !!localStorage.getItem(KEY_AUTOSAVE);
  } catch {
    return false;
  }
}

export function restoreAutosave(): boolean {
  try {
    const raw = localStorage.getItem(KEY_AUTOSAVE);
    if (!raw) return false;
    pattern.loadJson(raw);
    return true;
  } catch {
    return false;
  }
}
