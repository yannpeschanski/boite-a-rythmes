/* QUI PARLE — le catalogue des voix du récit, et la lecture d'une ligne.
 *
 * Pourquoi ce fichier existe
 * --------------------------
 * Le récit s'écrit en lignes courtes, une idée par ligne (`carriere.ts`), et
 * les répliques étaient marquées par un simple tiret cadratin :
 *
 *     '— Je vais vendre.',
 *     '— Alors pourquoi on travaille encore ?',
 *
 * Deux personnes, un seul signe, aucun nom : le lecteur devait déduire
 * l'alternance — et se tromper dès qu'une réplique tenait sur deux lignes ou
 * qu'un troisième personnage entrait. Retour de Yann (2026-09-03) : *« il faut
 * faire défiler les textes et bien indiquer qui parle »*.
 *
 * ⚠️ Une réplique porte donc son NOM, dans la donnée : `'SOL: Je vais vendre.'`
 * Le tiret disparaît de la donnée parce que le nom fait son travail — c'est
 * l'affichage qui le remet, derrière le nom. Ce qui n'est pas préfixé est du
 * texte OFF : la narration, le fax, le répondeur.
 *
 * ⚠️ Et un nom n'est pas qu'une étiquette : il porte un TIMBRE. Chaque
 * personnage a une voix percussive pendant que son texte se tape — Sol un
 * charley, Kelvin un rim shot, le texte off une machine à écrire (idée de
 * Yann). Le timbre vit ici, avec le nom, parce que c'est la même décision ;
 * sa synthèse vit dans `engine/voixRecit.ts`, qui ne connaît que des timbres.
 *
 * Module PUR : ni rune, ni DOM, ni audio.
 */

/** Les six timbres du récit. Un de plus se paie dans `engine/voixRecit.ts`. */
export type TimbreVoix = 'machine' | 'charley' | 'rimshot' | 'tom' | 'clave' | 'telephone';

export interface Locuteur {
  /** Ce qui est écrit dans la donnée ET affiché à l'écran. Une seule vérité. */
  nom: string;
  timbre: TimbreVoix;
}

/* ⚠️ Le catalogue est FERMÉ : un préfixe qui n'est pas là-dedans n'est pas une
 * attribution, c'est du texte. Sans ça, « FACE B — FB-015 » ou « HIP-HOP
 * AUTHENTIQUE — CLUB ÉNERGIE » deviendraient des répliques d'un personnage
 * nommé « FACE » ou « HIP-HOP », en silence. */
export const LOCUTEURS: Locuteur[] = [
  /* Sol porte presque toutes les répliques du jeu. Le charley est l'exemple
   * donné par Yann, et il tombe juste : c'est le son le plus sec du kit, celui
   * qui compte le temps sans jamais prendre la place. */
  { nom: 'SOL', timbre: 'charley' },
  /* Le joueur. Un tom grave, discret : il répond, il n'explique pas. */
  { nom: 'TOI', timbre: 'tom' },
  /* Kelvin tape du doigt sur la table dès sa première scène — c'est
   * littéralement un rim shot : le bord, pas la peau. */
  { nom: 'KELVIN', timbre: 'rimshot' },
  /* Rachid, la laverie du bas : un bois chaud, rond, qui ne coupe pas. */
  { nom: 'RACHID', timbre: 'clave' },
  /* Le Tunnel ne parle qu'au téléphone — deux fréquences dans une bande
   * étroite, exactement ce qu'on entend d'un combiné. */
  { nom: 'LE TUNNEL', timbre: 'telephone' },
  /* ⚠️ Le nouveau stagiaire a la voix DU JOUEUR, exprès : la dernière image de
   * l'épilogue est la première du jeu, et c'est elle qui fait la boucle
   * (CLAUDE.md). Deux noms, un timbre — ce n'est pas un oubli. */
  { nom: 'LE STAGIAIRE', timbre: 'tom' },
];

/** Les plus longs d'abord : « LE TUNNEL » avant « LE STAGIAIRE » n'a pas
 *  d'importance ici, mais un nom qui en préfixe un autre en aurait. */
const PAR_LONGUEUR = [...LOCUTEURS].sort((a, b) => b.nom.length - a.nom.length);

const SEPARATEUR = ': ';

export interface LigneDite {
  /** `null` = texte off : la narration, le fax, le répondeur. */
  qui: Locuteur | null;
  /** Ce qui s'affiche, sans le préfixe. */
  texte: string;
}

/** Lit une ligne de récit : `'SOL: Je vais vendre.'` → Sol, « Je vais vendre. » */
export function analyserLigne(ligne: string): LigneDite {
  for (const qui of PAR_LONGUEUR) {
    const prefixe = qui.nom + SEPARATEUR;
    if (ligne.startsWith(prefixe)) return { qui, texte: ligne.slice(prefixe.length) };
  }
  return { qui: null, texte: ligne };
}

export interface LigneAffichee extends LigneDite {
  /* ⚠️ Le nom ne se répète PAS d'une ligne à l'autre.
   *
   * Une réplique de Sol tient souvent sur deux ou trois lignes (le récit est
   * écrit à ~55 signes) : chacune porte son nom dans la donnée — c'est ce qui
   * rend l'attribution vérifiable ligne par ligne, sans heuristique sur la
   * casse ou la ponctuation — mais l'afficher trois fois de suite ferait une
   * colonne de bruit. On le montre quand il CHANGE. */
  montrerNom: boolean;
}

/** Découpe un écran de récit, et décide où le nom s'affiche. */
export function analyserRecit(lignes: string[]): LigneAffichee[] {
  let precedent: Locuteur | null = null;
  return lignes.map((l) => {
    const d = analyserLigne(l);
    const montrerNom = d.qui !== null && d.qui !== precedent;
    precedent = d.qui;
    return { ...d, montrerNom };
  });
}

/** Le timbre d'une ligne — le texte off a le sien, la machine à écrire. */
export function timbreDe(d: LigneDite): TimbreVoix {
  return d.qui ? d.qui.timbre : 'machine';
}
