// État réactif du déblocage : le contournement développeur, et la lecture
// des verrous depuis la progression du Mode jeu.
//
// La règle de déblocage elle-même vit dans `model/unlocks.ts` (pur, testé) ;
// ce module n'ajoute que la réactivité et la persistance.
import { game } from './game.svelte';
import { moduleUnlocked, type LockedModule, type UnlockContext } from '../model/unlocks';

const KEY = 'boite-a-rythme:boss';

// Contournement demandé par Yann le 2026-08-16 : « je propose également que
// tu crées un url pour que je puisse accéder directement à tout, par exemple
// https://boite-a-rythmes.vercel.app/#boss ».
//
// Il existe déjà un contournement — le pseudo « master » (game.svelte.ts) —
// mais il ne suffit pas ici : le pseudo se saisit DANS le Mode jeu, or avec
// un verrou dur sur l'Atelier, c'est précisément le chemin qu'on veut
// court-circuiter sans passer par le jeu. D'où une porte par URL.
//
// `#boss=off` le coupe : sans issue, un contournement persistant empêcherait
// de revoir ce que voit un vrai visiteur — c'est-à-dire de tester le verrou
// qu'on vient d'écrire.
const ON = /[#&]boss(?:$|[&=])/;
const OFF = /[#&]boss=off\b/;

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function write(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* stockage refusé : le contournement vaut pour la session, sans persister */
  }
}

class Unlocks {
  /** Tout ouvert (URL #boss, mémorisé). */
  boss = $state(false);
  /** Un rythme partagé a été chargé au démarrage — ouvre l'Atelier, rien d'autre. */
  sharedPattern = $state(false);

  /**
   * À appeler une fois au démarrage, AVANT le premier rendu qui lit un
   * verrou. Renvoie l'état pour permettre au reste du montage de s'y fier.
   */
  init(hash: string): boolean {
    if (OFF.test(hash)) {
      this.boss = false;
      write(false);
    } else if (ON.test(hash)) {
      this.boss = true;
      write(true);
    } else {
      this.boss = read();
    }
    return this.boss;
  }

  private get context(): UnlockContext {
    return { level: game.playerProgress.level, bypass: this.boss, sharedPattern: this.sharedPattern };
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
   * quoi s'en apercevoir (« le boss mode est toujours activé j'ai
   * l'impression »). Un doute sur l'état d'un contournement coûte plus cher
   * que le contournement lui-même.
   */
  get totalAccess(): '' | 'url' | 'master' {
    if (this.boss) return 'url';
    if (game.pseudo.toLowerCase() === 'master') return 'master';
    return '';
  }

  /** Comment en sortir, à afficher tel quel. */
  get totalAccessHint(): string {
    if (this.totalAccess === 'url') return '#boss=off pour revoir l’appli comme un visiteur';
    if (this.totalAccess === 'master') return 'pseudo « master » — change de joueur dans le Mode jeu pour en sortir';
    return '';
  }
}

export const unlocks = new Unlocks();
