// Déblocage progressif des modules par la progression du Mode jeu.
//
// Reprise de `MODULE_UNLOCK_LEVEL` / `moduleUnlocked()` de l'original
// (boite-a-rythme-69.html l. 3593-3611), qui étaient écrits, testés à la main
// et désactivés par un `return true` sous ce commentaire : « TEMPORAIRE :
// rien n'est bloqué pour le moment, le temps de décider comment relier
// réellement les modules à la progression du Mode jeu. » Yann a tranché le
// 2026-08-16 (PLAN.md, arbitrage D2) : verrou DUR, et le Mode jeu devient la
// porte d'entrée qui ouvre les autres modes.
//
// Module PUR (aucune rune, aucun DOM) pour la même raison que `engine/` :
// c'est ce qui permet de le tester sans monter l'appli — voir
// tests/unlocks.test.ts, qui vérifie notamment le piège du seuil de
// l'Atelier ci-dessous.
import { LEVELS } from './presets/levels';
import { ACTE_DU_MODULE } from './carriere';

export type LockedModule = 'atelier' | 'synth' | 'production' | 'live';

export const LOCKED_MODULES: LockedModule[] = ['atelier', 'synth', 'production', 'live'];

// SÉMANTIQUE DU SEUIL — à lire avant d'y toucher. `PlayerProgress.level` est
// le niveau ATTEINT, pas le dernier réussi : un joueur tout neuf démarre déjà
// à 1 (`{ level: 1, stars: {} }`), et réussir le niveau N écrit `N + 1`
// (game.svelte.ts, saveProgress). Un seuil de N se lit donc « le niveau N-1
// est réussi ».
//
// D'où `atelier: 2` et non 1 : à 1, le verrou serait ouvert pour tout le
// monde dès la première visite, c'est-à-dire pas un verrou. C'est exactement
// la valeur que portait l'original (`drum: 1`) — mais chez lui elle voulait
// dire « jamais verrouillé », ce qui était cohérent avec son `return true`.
//
// `synth: 13` et `production: 27` sont repris VERBATIM de l'original : ces
// deux seuils avaient déjà été choisis, ils tombent après les niveaux qui
// enseignent ce qu'il faut pour s'en servir.
//
// `live: 34` (et non 35, qui dirait « campagne finie ») pour préserver un
// invariant de l'original : le pseudo de test « master » renvoie
// `level = LEVELS.length`, ce qui doit suffire à tout ouvrir « sans cas
// particulier à gérer ailleurs ». Un seuil au-dessus de LEVELS.length
// casserait master en silence. L'assertion ci-dessous le verrouille.
export const MODULE_UNLOCK_LEVEL: Record<LockedModule, number> = {
  atelier: 2,
  synth: 13,
  production: 27,
  live: 34,
};

// Aucun seuil ne doit dépasser le niveau maximum atteignable, sinon « master »
// (et un joueur qui a tout fini) resterait bloqué. Vérifié aussi par un test,
// mais autant que le module refuse de se charger plutôt que de mentir.
const MAX_LEVEL = LEVELS.length;
for (const m of LOCKED_MODULES) {
  if (MODULE_UNLOCK_LEVEL[m] > MAX_LEVEL) {
    throw new Error(`Seuil de déblocage impossible pour « ${m} » : ${MODULE_UNLOCK_LEVEL[m]} > ${MAX_LEVEL}`);
  }
}

export interface UnlockContext {
  /** `PlayerProgress.level` — niveau atteint (voir la sémantique ci-dessus). */
  level: number;
  /**
   * L'acte du Mode carrière où en est le joueur — 0 s'il vient d'arriver.
   * Même sémantique que `level` : c'est l'acte ATTEINT, donc `acte = 2` veut
   * dire « les actes 0 et 1 sont terminés ».
   *
   * C'est désormais la voie PRINCIPALE d'ouverture d'un module : « ton morceau
   * a besoin d'une basse, voilà le Synthé » est un moment de récit, là où « le
   * niveau 13 ouvre le Synthé » est un nombre à justifier (PLAN.md,
   * « Architecture du Mode jeu » ; HISTOIRE.md, « Ce que le récit ouvre »).
   */
  acte?: number;
  /** Contournement développeur (#boss) : tout est ouvert. */
  bypass?: boolean;
  /**
   * Un rythme partagé est en cours de chargement (`#r=…`). Ouvre l'Atelier
   * pour CETTE session, sans rien débloquer d'autre : sinon un lien de
   * partage envoyé à quelqu'un qui n'a jamais joué tomberait sur un écran de
   * verrou, ce qui tuerait une fonctionnalité déjà livrée. Le lien EST
   * l'intention d'ouvrir l'Atelier.
   */
  sharedPattern?: boolean;
}

/* Deux voies, jamais une seule — et le OU est délibéré.
 *
 * Le récit est la voie principale, mais seuls les actes 0 à 2 ont leurs
 * exercices écrits : si l'acte était la SEULE voie, le Synthé (acte 3), la
 * Production (acte 4) et le Mode Live (acte 7) deviendraient inatteignables du
 * jour où la carrière est arrivée — une régression pour tous ceux qui les
 * avaient déjà ouverts, et un mur pour les autres. Les seuils de niveau
 * restent donc un plancher, en salle de répétition.
 *
 * Le jour où les huit actes sont écrits, retirer le second membre est un
 * changement d'une ligne — et une décision, pas un nettoyage.
 */
export function moduleUnlocked(name: LockedModule, cx: UnlockContext): boolean {
  if (cx.bypass) return true;
  if (name === 'atelier' && cx.sharedPattern) return true;
  if ((cx.acte ?? 0) > ACTE_DU_MODULE[name]) return true;
  return cx.level >= MODULE_UNLOCK_LEVEL[name];
}

/** L'acte qui ouvre le module, pour l'afficher sur le verrou. */
export function unlockActeFor(name: LockedModule): number {
  return ACTE_DU_MODULE[name];
}

/** Niveau à atteindre, pour l'afficher sur le verrou (« Niveau 13 »). */
export function unlockLevelFor(name: LockedModule): number {
  return MODULE_UNLOCK_LEVEL[name];
}
