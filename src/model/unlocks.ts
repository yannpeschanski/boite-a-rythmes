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
import { ACTE_DU_MODULE, acteParId } from './carriere';

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
   * Le PLANCHER — le `level` que le joueur avait AVANT d'entrer dans la
   * carrière, gelé une fois pour toutes (`PlayerProgress.plancher`).
   *
   * Sans lui, le seuil de niveau court-circuitait le récit tout entier :
   * l'acte 0 cite les niveaux 49 à 52, réussir le 52 écrit `level = 53`, et
   * les quatre seuils (2 / 13 / 27 / 34) tombaient **d'un seul coup**. Quatre
   * actes annonçaient ensuite l'ouverture d'un module déjà ouvert — le
   * déverrouillage narratif, qui est le principe même du Mode carrière, ne
   * faisait plus rien.
   *
   * Le fond : `level >= 34` voulait dire « a joué 34 niveaux de la campagne
   * linéaire ». La carrière a supprimé cet ordre — elle cite les niveaux dans
   * le désordre et au-delà de 34 — donc le seuil ne mesurait plus rien. Le
   * geler avant le récit lui rend exactement le sens qu'il avait : ce que le
   * joueur avait acquis en salle de répétition, hors carrière.
   *
   * Absent d'une sauvegarde d'avant ce champ : on retombe alors sur `level`,
   * et le joueur garde tout ce qu'il avait — voir « une porte déjà ouverte ne
   * se referme jamais » dans CLAUDE.md.
   */
  plancher?: number;
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
 * Le récit est la voie PRINCIPALE : c'est un acte qui ouvre un module, parce
 * qu'il vient d'en avoir besoin. Les seuils de niveau restent un plancher pour
 * qui joue hors carrière — un vétéran ne doit pas perdre l'accès à un module
 * qu'il utilisait déjà le jour où la carrière est arrivée.
 *
 * ⚠️ Mais ce plancher se lit sur `plancher`, PAS sur `level` — voir
 * `UnlockContext.plancher`. Lu sur `level`, il ouvrait les quatre modules à la
 * fin de l'acte 0 et vidait le récit de son rôle. Le repli sur `level` ne sert
 * que les sauvegardes d'avant ce champ.
 */
export function moduleUnlocked(name: LockedModule, cx: UnlockContext): boolean {
  if (cx.bypass) return true;
  if (name === 'atelier' && cx.sharedPattern) return true;
  if ((cx.acte ?? 0) > ACTE_DU_MODULE[name]) return true;
  return (cx.plancher ?? cx.level) >= MODULE_UNLOCK_LEVEL[name];
}

/** L'acte qui ouvre le module, pour l'afficher sur le verrou. */
export function unlockActeFor(name: LockedModule): number {
  return ACTE_DU_MODULE[name];
}

/** Niveau à atteindre, pour l'afficher sur le verrou (« Niveau 13 »). */
export function unlockLevelFor(name: LockedModule): number {
  return MODULE_UNLOCK_LEVEL[name];
}

/* Ce que le verrou DIT — ici et nulle part ailleurs.
 *
 * Trois écrans affichent un cadenas : l'accueil (`App.svelte`), les onglets
 * Synthé et Production (`AtelierView`), le bouton Mode Live (`ToolBar`). Les
 * deux derniers annonçaient encore « Se débloque au niveau 13 du Mode jeu »
 * alors que le récit est devenu la voie principale et que l'accueil, lui,
 * disait déjà l'acte : le même verrou nommait deux chemins différents selon
 * l'écran où on le rencontrait.
 *
 * Les deux voies sont dites, parce qu'elles existent toutes les deux — mais
 * dans leur ordre réel, le récit d'abord.
 */
export function libelleVerrou(name: LockedModule): string {
  const a = acteParId(unlockActeFor(name));
  return `S’ouvre à l’acte ${a.id} — ${a.titre} (ou au niveau ${unlockLevelFor(name)} en salle de répétition)`;
}

/** La version courte, pour une pastille ou un sous-titre de bouton. */
export function verrouCourt(name: LockedModule): string {
  return `Acte ${unlockActeFor(name)}`;
}
