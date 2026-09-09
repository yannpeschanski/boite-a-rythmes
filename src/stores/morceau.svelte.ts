/* ENREGISTRER ET ROUVRIR UN MORCEAU.
 *
 * Le morceau vit sur deux stores — les lettres (`parties`) et la chaîne
 * (`architecture`) — parce que chacun a sa durée de vie propre. Ce module est le
 * seul endroit qui les rassemble, et c'est voulu : une règle à deux domiciles
 * n'est appliquée qu'à un seul.
 *
 * ⚠️ LES BOUTONS DU LIVE N'EN FONT PAS PARTIE (2026-09-09). Ils y étaient ;
 * « ça ne fait pas ses preuves ». Ce qu'un fichier ne porte plus, il ne peut
 * plus l'écraser — d'où la disparition de la coche « garder mes boutons à
 * l'ouverture », qui n'existait que pour s'en protéger.
 */
import { parties } from './parties.svelte';
import { architecture } from './architecture.svelte';
import { PARTIES } from '../model/parties';
import { construireMorceau, lireMorceau, nomDeFichier, type MorceauFichier } from '../model/morceau';

/** Rassemble l'état courant en un fichier. */
export function morceauCourant(nom: string): MorceauFichier {
  const p: MorceauFichier['parties'] = {};
  for (const id of PARTIES) {
    const part = parties.get(id);
    if (part) p[id] = { nom: part.nom, json: part.json };
  }
  return construireMorceau({
    nom,
    parties: p,
    chaine: architecture.courante ? ($state.snapshot(architecture.courante) as MorceauFichier['chaine']) : null,
  });
}

export function telechargerMorceau(nom: string): void {
  const fichier = morceauCourant(nom);
  const blob = new Blob([JSON.stringify(fichier, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nomDeFichier(fichier.nom);
  a.click();
  URL.revokeObjectURL(a.href);
}

export interface RapportOuverture {
  nom: string;
  lettres: number;
  scenes: number;
}

/**
 * Applique un fichier. Rend un compte rendu de ce qui a été posé, ou `null` si
 * le fichier n'en est pas un.
 *
 * ⚠️ IL NE TOUCHE JAMAIS AUX BOUTONS DU LIVE. Ce sont une habitude de jeu, pas
 * un morceau : un fichier ouvert pour écouter ne doit pas les remplacer.
 */
export function appliquerMorceau(brut: unknown): RapportOuverture | null {
  const m = lireMorceau(brut);
  if (!m) return null;

  parties.toutVider();
  let lettres = 0;
  for (const id of PARTIES) {
    const p = m.parties[id];
    if (!p) continue;
    parties.poser(id, p.json, p.nom);
    lettres++;
  }

  if (m.chaine) architecture.remplacer(m.chaine);
  else architecture.effacer();

  /* La première lettre est CHARGÉE dans l'Atelier : ouvrir un morceau et
     continuer d'entendre le rythme d'avant serait déroutant. */
  const premiere = parties.premiereRemplie;
  if (premiere) parties.charger(premiere);

  return { nom: m.nom, lettres, scenes: m.chaine?.sections.length ?? 0 };
}

/** Lit un fichier choisi par l'utilisateur. */
export async function ouvrirFichierMorceau(f: File): Promise<RapportOuverture | null> {
  try {
    return appliquerMorceau(JSON.parse(await f.text()));
  } catch {
    return null;
  }
}
