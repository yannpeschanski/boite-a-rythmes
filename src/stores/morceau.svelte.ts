/* ENREGISTRER ET ROUVRIR UN MORCEAU.
 *
 * Le morceau est éparpillé sur trois stores — les lettres (`parties`), la
 * chaîne (`architecture`) et les boutons (`ui/live/liveActions`) — parce que
 * chacun a sa durée de vie propre. Ce module est le seul endroit qui les
 * rassemble, et c'est voulu : une règle à deux domiciles n'est appliquée qu'à
 * un seul.
 */
import { parties } from './parties.svelte';
import { architecture } from './architecture.svelte';
import { PARTIES } from '../model/parties';
import { construireMorceau, lireMorceau, nomDeFichier, type MorceauFichier } from '../model/morceau';
import { loadLiveAssignments, saveLiveAssignments, LIVE_ACTIONS, DEFAUTS_SLOTS } from '../ui/live/liveActions';
import type { LiveActionId } from '../ui/live/liveActions';

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
    boutons: loadLiveAssignments().slots.map((s) => [...s]),
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
  boutons: boolean;
}

/**
 * Applique un fichier. Rend un compte rendu de ce qui a été posé, ou `null` si
 * le fichier n'en est pas un.
 *
 * ⚠️ `conserverBoutons` existe pour la même raison que l'option du Mode Live :
 * les boutons SONT dans le morceau (arbitrage de Yann), mais ce sont aussi une
 * habitude de jeu, et un fichier qu'on ouvre pour écouter ne doit pas
 * forcément la remplacer.
 */
export function appliquerMorceau(brut: unknown, conserverBoutons = false): RapportOuverture | null {
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

  let boutonsPoses = false;
  if (m.boutons && !conserverBoutons) {
    /* Ce que le catalogue ne reconnaît pas est ignoré, jamais refusé en bloc —
       et un slot vidé reprend le défaut de son rang plutôt que de rester vide. */
    const connu = new Set(LIVE_ACTIONS.map((a) => a.id as string));
    const courant = loadLiveAssignments();
    const slots = courant.slots.map((defaut, i) => {
      const ids = (m.boutons![i] ?? []).filter((x): x is LiveActionId => connu.has(x));
      return ids.length ? ids : (DEFAUTS_SLOTS[i] ?? defaut);
    });
    saveLiveAssignments({ ...courant, slots, slotModes: slots.map(() => 'actions' as const) });
    boutonsPoses = true;
  }

  /* La première lettre est CHARGÉE dans l'Atelier : ouvrir un morceau et
     continuer d'entendre le rythme d'avant serait déroutant. */
  const premiere = parties.premiereRemplie;
  if (premiere) parties.charger(premiere);

  return { nom: m.nom, lettres, scenes: m.chaine?.sections.length ?? 0, boutons: boutonsPoses };
}

/** Lit un fichier choisi par l'utilisateur. */
export async function ouvrirFichierMorceau(f: File, conserverBoutons = false): Promise<RapportOuverture | null> {
  try {
    return appliquerMorceau(JSON.parse(await f.text()), conserverBoutons);
  } catch {
    return null;
  }
}
