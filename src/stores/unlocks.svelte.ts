// État réactif du déblocage : la lecture des verrous depuis la progression du
// Mode jeu.
//
// ⚠️ Le contournement par URL (#boss) a été RETIRÉ le 2026-09-14 : « j'utilise
// le pseudo master pour vérifier que tout fonctionne ». Deux portes dérobées
// pour le même besoin, c'est une de trop — et celle-ci était la seule à
// persister dans le stockage, donc la seule à pouvoir rester allumée sans
// qu'on s'en aperçoive. `master` est explicite et se voit dans le Mode jeu.
//
// La règle de déblocage elle-même vit dans `model/unlocks.ts` (pur, testé) ;
// ce module n'ajoute que la réactivité et la persistance.
import { game } from './game.svelte';
import { moduleUnlocked, type LockedModule, type UnlockContext } from '../model/unlocks';

class Unlocks {
  /** Un rythme partagé a été chargé au démarrage — ouvre l'Atelier, rien d'autre. */
  sharedPattern = $state(false);

  private get context(): UnlockContext {
    return {
      level: game.playerProgress.level,
      // Le plancher, PAS `level` : la carrière fait monter `level` en citant
      // des niveaux du réservoir, donc `level` ouvrait les quatre modules dès
      // la fin de l'acte 0 (voir `UnlockContext.plancher`). `level` reste
      // transmis pour les sauvegardes d'avant ce champ, où il sert de repli.
      plancher: game.playerProgress.plancher,
      // Voie principale : c'est le RÉCIT qui ouvre les modules (model/carriere.ts).
      acte: game.progresCarriere.acte,
      sharedPattern: this.sharedPattern,
      /* Ce que l'ÉTAPE ouverte réclame — commande ou scène (`game.modulesRequis`).
         Une seule source pour les deux : lu ici sur la seule commande, une
         scène qui envoie dans le Mode Live l'aurait trouvé cadenassé. */
      modulesRequis: game.modulesRequis,
    };
  }

  has(name: LockedModule): boolean {
    return moduleUnlocked(name, this.context);
  }

  /**
   * Pourquoi tout est ouvert, quand ça l'est autrement que par la
   * progression — `''` si on voit l'appli comme un vrai visiteur.
   *
   * Existe parce que l'accès total était INVISIBLE hors de l'accueil : on
   * testait une appli qui n'était celle de personne d'autre sans avoir de
   * quoi s'en apercevoir. Un doute sur l'état d'un contournement coûte plus
   * cher que le contournement lui-même — et c'est ce qui reste vrai du seul
   * qui subsiste, le pseudo `master`.
   */
  get totalAccess(): '' | 'master' {
    if (game.pseudo.toLowerCase() === 'master') return 'master';
    return '';
  }

  /** Comment en sortir, à afficher tel quel. */
  get totalAccessHint(): string {
    if (this.totalAccess === 'master') return 'pseudo « master » — change de joueur dans le Mode jeu pour en sortir';
    return '';
  }
}

export const unlocks = new Unlocks();
