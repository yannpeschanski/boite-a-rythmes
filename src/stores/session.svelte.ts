/* OÙ ON EN ÉTAIT — ce qu'un rechargement de page ne doit plus coûter.
 *
 * Demande de Yann (2026-09-16) : *« lorsqu'on réactualise la page, ce qui
 * arrive par erreur parfois, on puisse tester sur la même page et ne pas
 * perdre tout ce qu'on était en train de faire »*.
 *
 * Ce qui survivait déjà : la progression, la besace, la discographie, la
 * banque, les parties A/B/C, la chaîne du Live, les boutons de scène, le
 * calibrage, le tampon de sortie. Ce qui ne survivait pas, et qui EST « ce
 * qu'on était en train de faire » :
 *
 *   - **la VUE** — on repartait de l'accueil, donc deux clics pour revenir ;
 *   - **le travail de l'Atelier** — il était bien enregistré (`share.ts`),
 *     mais derrière un bandeau « Restaurer » qu'il fallait cliquer ;
 *   - **la COMMANDE ouverte** — on revenait dans un Atelier sans cahier et
 *     sans bouton de livraison, donc sans savoir quoi faire du morceau.
 *
 * ⚠️ UNE PÉREMPTION, et c'est le cœur du réglage. Un RECHARGEMENT est récent
 * par définition ; une visite du lendemain n'en est pas un. Sans délai, le jeu
 * rouvrirait silencieusement une composition d'il y a un mois et personne ne
 * reverrait jamais l'accueil — qui est un écran de CHOIX, et le geste par
 * lequel le navigateur nous accorde le son. Au-delà du délai, tout revient
 * comme avant : l'accueil, et le bandeau « Restaurer » qui PROPOSE.
 *
 * ⚠️ LA LECTURE A LIEU AU CHARGEMENT DU MODULE, une fois, et se garde en
 * mémoire — même leçon que `lireAutosave` : dès le premier geste, le
 * stockage porte la session EN COURS, donc une relecture tardive ne
 * retrouverait plus celle d'avant. Les trois vues qui en ont besoin
 * (`App`, `AtelierView`, `GameView`) montent à des moments différents.
 */

const CLE = 'boite-a-rythme:session';

/** Deux heures : la durée d'une séance de travail, pas celle d'une absence. */
export const PEREMPTION_MS = 2 * 60 * 60 * 1000;

export type VueOuverte = 'atelier' | 'game' | 'live';

export interface Session {
  /** La vue où l'on était. `diag` n'en fait pas partie : c'est un banc qu'on
   *  atteint en tapant son adresse, pas un endroit où l'on travaille. */
  vue?: VueOuverte;
  /** L'onglet de l'Atelier. Vérifié contre les verrous à la restauration. */
  onglet?: string;
  /** L'écran du Mode jeu — la carrière, ou un exercice en cours. */
  ecranJeu?: string;
  /** La commande ouverte, s'il y en avait une. `null` l'efface. */
  commande?: { acte: number; etape: number; repetition: boolean } | null;
  /** Quand ça a été noté — c'est ce qui distingue un rechargement d'une visite. */
  quand?: number;
}

function lireDuStockage(): Session | null {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return null;
    const s = JSON.parse(brut) as Session;
    if (!s || typeof s !== 'object') return null;
    if (typeof s.quand !== 'number' || Date.now() - s.quand > PEREMPTION_MS) return null;
    return s;
  } catch {
    return null;
  }
}

/* L'état lu UNE fois, au chargement du module — voir l'en-tête. Non réactif
   exprès : c'est un instantané du passé, pas un état vivant. */
const reprise: Session | null = lireDuStockage();

/** Ce qu'il y avait à l'écran au dernier passage, ou `null` — périmé compris. */
export function sessionReprise(): Session | null {
  return reprise;
}

/* Noter un morceau de la session. Fusionne avec ce qui est déjà écrit : chaque
 * vue est responsable de SON champ et ne connaît pas les autres, sinon la
 * dernière à écrire effacerait le reste. */
export function noterSession(part: Session): void {
  try {
    let courant: Session = {};
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const s = JSON.parse(brut) as Session;
      if (s && typeof s === 'object') courant = s;
    }
    localStorage.setItem(CLE, JSON.stringify({ ...courant, ...part, quand: Date.now() }));
  } catch {
    /* stockage refusé ou plein : on perd la reprise, pas le travail. C'est
       `game.persistanceRefusee` qui porte l'aveu à l'écran. */
  }
}

/** Repartir de l'accueil au prochain chargement — changer de joueur, par exemple. */
export function oublierSession(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    /* rien à retirer */
  }
}
