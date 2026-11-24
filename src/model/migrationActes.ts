/* La migration des sauvegardes après la FUSION des actes 1 et 2 (2026-11-24).
 *
 * Huit actes sont devenus sept : l'ancien acte 1 (LE RYTHME) et l'ancien
 * acte 2 (LE GROOVE) n'en font plus qu'un, et les actes 3 à 7 reculent d'un
 * numéro. Trois choses portent un numéro d'acte dans le stockage, et les trois
 * doivent bouger ENSEMBLE — n'en migrer qu'une laisserait un joueur à l'acte 3
 * avec la discographie de l'acte 4 :
 *
 * - le curseur de carrière `{ acte, etape }` ;
 * - les étoiles des commandes, clé `c<acte>.<étape>` ;
 * - les productions de la discographie (`acte`, et la SÉRIE de Kelvin, qui
 *   n'en avait pas : il était seul dans son acte, il partage maintenant le sien
 *   avec la sonnerie).
 *
 * ⚠️ Pur et idempotent par construction : la progression porte `schema` une
 * fois migrée, et la vue n'appelle la migration que si ce champ manque. Une
 * sauvegarde neuve naît migrée (`SCHEMA_ACTES`).
 *
 * Les tables d'étapes sont écrites À LA MAIN, depuis les données d'avant la
 * fusion : on ne peut plus les dériver, les anciens actes n'existent plus. Un
 * joueur arrêté sur un exercice qui a quitté la carrière reprend à l'étape
 * nouvelle la plus proche qu'il n'a PAS faite — jamais plus loin. */

/* Les versions du format :
 * - 1 : huit actes (avant le 2026-11-24) ;
 * - 2 : sept actes, le rythme et le groove fusionnés ;
 * - 3 : l'acte 1 gagne deux exercices (87 à 91 au lieu de 68, 7, 69) — ses
 *   étapes à partir de la cinquième se décalent de deux. */
export const SCHEMA_ACTES = 3;

/** Ancien acte 1 (10 étapes) → index dans le nouvel acte 1. */
const ANCIEN_1 = [
  0, // BRIEF
  2, // 68
  4, // 69
  5, // 74 (déplacé en fin d'acte) → le récit des gestes de Sol
  5, // récit SOL
  6, // 60
  7, // 8 (au réservoir) → RELEVÉ DU MOIS
  7, // 61 (au réservoir) → RELEVÉ DU MOIS
  7, // RELEVÉ DU MOIS
  8, // livraison de la sonnerie
];

/** Ancien acte 2 (13 étapes) → index dans le nouvel acte 1. */
const ANCIEN_2 = [
  9, // LE MARDI
  10, // SOL
  11, // 48 → le shuffle écrit (82), qui le précède désormais
  11, // 14
  11, // récit KELVIN (décalage)
  11, // 71
  11, // 23
  11, // 47
  11, // 72
  11, // récit SOL (aléa)
  11, // 63
  17, // la commande de Kelvin
  18, // KELVIN — SANS TITRE
];

/** Schéma 1 → 2 : le curseur d'avant la fusion, dans la numérotation à sept
 *  actes (l'acte 1 tel qu'il était au schéma 2). */
function versSchema2(c: { acte: number; etape: number }): { acte: number; etape: number } {
  if (c.acte <= 0) return c;
  if (c.acte === 1) return { acte: 1, etape: ANCIEN_1[Math.min(c.etape, ANCIEN_1.length - 1)] ?? 0 };
  if (c.acte === 2) return { acte: 1, etape: ANCIEN_2[Math.min(c.etape, ANCIEN_2.length - 1)] ?? 9 };
  return { acte: c.acte - 1, etape: c.etape };
}

/** Schéma 2 → 3 : l'acte 1 au schéma 2 citait 3, 68, 7, 69 (étapes 1 à 4) ;
 *  il cite maintenant 3, 87, 88, 89, 90, 91 (étapes 1 à 6). Les étapes 0 à 4
 *  gardent leur index — le 7 devient le 88 (même syncope), le 69 le 89 ; le
 *  68 devient le 87, que le joueur n'a pas fait —, le reste recule de deux. */
function versSchema3(c: { acte: number; etape: number }): { acte: number; etape: number } {
  if (c.acte !== 1 || c.etape <= 4) return c;
  return { acte: 1, etape: c.etape + 2 };
}

/** Le curseur de carrière d'une sauvegarde au schéma `depuis`, dans la
 *  numérotation courante. */
export function migrerCurseur(
  c: { acte: number; etape: number },
  depuis = 1,
): { acte: number; etape: number } {
  let n = c;
  if (depuis < 2) n = versSchema2(n);
  if (depuis < 3) n = versSchema3(n);
  return n;
}

/** Les étoiles : seules les clés de COMMANDE (`c<acte>.<étape>`) portent un acte. */
export function migrerEtoiles(stars: Record<string, number>, depuis = 1): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(stars)) {
    const m = /^c(\d+)\.(\d+)$/.exec(k);
    if (!m) {
      out[k] = v;
      continue;
    }
    const acte = Number(m[1]);
    const etape = Number(m[2]);
    // Une clé de commande se déplace comme le curseur qui pointe sur la même
    // étape — une seule règle pour les deux.
    const n = migrerCurseur({ acte, etape }, depuis);
    out[`c${n.acte}.${n.etape}`] = v;
  }
  return out;
}

/** Une production de la discographie. Kelvin reçoit la série que sa commande porte. */
export function migrerProduction<P extends { acte: number; serie?: string }>(p: P, depuis = 1): P {
  if (depuis >= 2) return p; // le schéma 3 ne touche que des étapes, pas des actes
  if (p.acte === 2) return { ...p, acte: 1, serie: p.serie || 'kelvin' };
  if (p.acte >= 3) return { ...p, acte: p.acte - 1 };
  return p;
}
