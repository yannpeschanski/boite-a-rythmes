/* UN MORCEAU — ce qui se sauvegarde et se rouvre.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. L'appli savait partager un RYTHME par URL
 * depuis toujours, mais un morceau monté — les lettres, la chaîne qui les
 * enchaîne, les boutons qui la pilotent — n'existait que dans le
 * `localStorage` du navigateur qui l'avait fabriqué. Yann : « il faudrait
 * pouvoir sauvegarder des morceaux montés en JSON avant le wav ».
 *
 * ⚠️ LES BOUTONS EN FONT PARTIE, et c'est un arbitrage explicite : « oui, les
 * boutons font partie, c'est un des intérêts ». Un morceau ne dit pas seulement
 * ce qui joue, il dit ce que les mains peuvent en faire — une chaîne sans
 * SUIVANT ni TENIR sous le pouce se joue contre le musicien. Ils sont donc dans
 * le fichier ; l'option « conserver mes boutons » du Mode Live reste le moyen
 * de ne pas se les faire écraser à l'ouverture.
 *
 * ⚠️ CE N'EST PAS LE FORMAT V2, et ça ne le touche pas. Un morceau CONTIENT des
 * états v2 (un par lettre, sérialisés tels quels) ; le contrat central n'est ni
 * étendu ni versionné à cause de lui.
 */
import { PARTIES, estPartieId, type PartieId } from './parties';
import type { Architecture, Section } from './architecture';

/** Le format du fichier. Un entier, pas une chaîne : il se compare. */
export const VERSION_MORCEAU = 1;

export interface MorceauFichier {
  format: 'boite-a-rythmes/morceau';
  version: number;
  nom: string;
  enregistreLe: number;
  /** Un état v2 sérialisé par lettre remplie. Une lettre absente est vide. */
  parties: Partial<Record<PartieId, { nom: string; json: string }>>;
  /** La chaîne, ou `null` si le morceau est un simple motif qui tourne. */
  chaine: Architecture | null;
  /** Les six boutons du Mode Live — voir l'en-tête. `null` = ne rien imposer. */
  boutons: string[][] | null;
}

export interface MorceauVivant {
  nom: string;
  parties: Partial<Record<PartieId, { nom: string; json: string }>>;
  chaine: Architecture | null;
  boutons: string[][] | null;
}

export function construireMorceau(m: MorceauVivant): MorceauFichier {
  return {
    format: 'boite-a-rythmes/morceau',
    version: VERSION_MORCEAU,
    nom: m.nom.trim() || 'Morceau',
    enregistreLe: Date.now(),
    parties: m.parties,
    chaine: m.chaine,
    boutons: m.boutons,
  };
}

function sectionValide(s: unknown): s is Section {
  if (!s || typeof s !== 'object') return false;
  const x = s as Partial<Section>;
  return (
    typeof x.id === 'string' &&
    typeof x.nom === 'string' &&
    typeof x.cycles === 'number' &&
    x.cycles > 0 &&
    estPartieId(x.partie) &&
    (x.lignes === null || Array.isArray(x.lignes))
  );
}

/**
 * Relit un fichier de morceau. Rend `null` si ce n'en est pas un.
 *
 * ⚠️ ON RÉPARE CE QU'ON PEUT, ON NE REFUSE QU'EN DERNIER RECOURS. Une lettre
 * illisible est ignorée, une chaîne abîmée devient `null`, des boutons inconnus
 * disparaissent — mais un fichier qui porte ne serait-ce qu'une lettre valable
 * s'ouvre. C'est la leçon déjà payée deux fois ici : une validation tout ou
 * rien rend les défauts et perd tout, en silence.
 */
export function lireMorceau(v: unknown): MorceauFichier | null {
  if (!v || typeof v !== 'object') return null;
  const m = v as Partial<MorceauFichier>;
  if (m.format !== 'boite-a-rythmes/morceau') return null;

  const parties: MorceauFichier['parties'] = {};
  const brutes = (m.parties ?? {}) as Record<string, unknown>;
  for (const id of PARTIES) {
    const p = brutes[id] as { nom?: unknown; json?: unknown } | undefined;
    if (p && typeof p.json === 'string' && p.json.length) {
      parties[id] = { nom: typeof p.nom === 'string' ? p.nom : '', json: p.json };
    }
  }

  let chaine: Architecture | null = null;
  const c = m.chaine as Partial<Architecture> | null | undefined;
  if (c && typeof c.nom === 'string' && Array.isArray(c.sections)) {
    const sections = c.sections.filter(sectionValide);
    if (sections.length) chaine = { nom: c.nom, sections };
  }

  const boutons = Array.isArray(m.boutons)
    ? m.boutons
        .map((slot) => (Array.isArray(slot) ? slot.filter((x): x is string => typeof x === 'string') : []))
        .filter((slot) => slot.length > 0)
    : null;

  // Un fichier sans une seule lettre ni chaîne n'ouvrirait rien : autant le dire.
  if (!Object.keys(parties).length && !chaine) return null;

  return {
    format: 'boite-a-rythmes/morceau',
    version: typeof m.version === 'number' ? m.version : VERSION_MORCEAU,
    nom: typeof m.nom === 'string' && m.nom.trim() ? m.nom : 'Morceau',
    enregistreLe: typeof m.enregistreLe === 'number' ? m.enregistreLe : Date.now(),
    parties,
    chaine,
    boutons: boutons && boutons.length ? boutons : null,
  };
}

/** Un nom de fichier lisible et sans piège pour un système de fichiers. */
export function nomDeFichier(nom: string): string {
  const propre = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${propre || 'morceau'}.json`;
}
