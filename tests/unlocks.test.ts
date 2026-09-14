import { describe, it, expect } from 'vitest';
import {
  MODULE_UNLOCK_LEVEL,
  LOCKED_MODULES,
  moduleUnlocked,
  unlockLevelFor,
  unlockActeFor,
  libelleVerrou,
  verrouCourt,
  catalogueOuvert,
} from '../src/model/unlocks';
import { ETAPE_DU_MODULE } from '../src/model/carriere';
import { LEVELS } from '../src/model/presets/levels';

// Un joueur qui n'a jamais rien fait : `PlayerProgress` vaut { level: 1 },
// PAS 0 (game.svelte.ts). C'est toute la subtilité de ces seuils.
const NEUF = { level: 1 };

describe('déblocage des modules', () => {
  it("verrouille tout pour un joueur qui vient d'arriver", () => {
    // Le piège central : `atelier` valait 1 dans l'original, ce qui, avec un
    // niveau de départ à 1, n'aurait rien verrouillé du tout. Ce test tombe
    // si quelqu'un remet 1 en pensant « niveau 1 = dès le début ».
    for (const m of LOCKED_MODULES) {
      expect(moduleUnlocked(m, NEUF), `${m} devrait être verrouillé au départ`).toBe(false);
    }
  });

  it("ouvre l'Atelier une fois le premier niveau réussi", () => {
    // Réussir le niveau N écrit `level = N + 1` : réussir le 1 donne 2.
    expect(moduleUnlocked('atelier', { level: 2 })).toBe(true);
    expect(moduleUnlocked('synth', { level: 2 })).toBe(false);
  });

  it('ouvre chaque module pile à son seuil, pas avant', () => {
    for (const m of LOCKED_MODULES) {
      const seuil = unlockLevelFor(m);
      expect(moduleUnlocked(m, { level: seuil - 1 }), `${m} ouvert trop tôt`).toBe(false);
      expect(moduleUnlocked(m, { level: seuil }), `${m} pas ouvert à son seuil`).toBe(true);
    }
  });

  it("ouvre l'Atelier (et rien d'autre) pour un rythme partagé", () => {
    // Sans ça, un lien de partage envoyé à quelqu'un qui n'a jamais joué
    // tomberait sur un écran de verrou — une fonctionnalité déjà livrée qui
    // cesserait de marcher.
    expect(moduleUnlocked('atelier', { level: 1, sharedPattern: true })).toBe(true);
    expect(moduleUnlocked('synth', { level: 1, sharedPattern: true })).toBe(false);
    expect(moduleUnlocked('live', { level: 1, sharedPattern: true })).toBe(false);
  });

  it('reste entièrement ouvert au pseudo « master »', () => {
    // `master` renvoie `level = LEVELS.length` (game.svelte.ts). L'original
    // comptait là-dessus pour n'avoir « aucun cas particulier à gérer » sur
    // les modules — un seuil au-dessus de LEVELS.length le casserait en
    // silence, y compris pour un joueur ayant tout terminé.
    for (const m of LOCKED_MODULES) {
      expect(moduleUnlocked(m, { level: LEVELS.length }), `${m} inaccessible à master`).toBe(true);
    }
  });

  it('garde les deux seuils déjà choisis par la version d’origine', () => {
    expect(MODULE_UNLOCK_LEVEL.synth).toBe(13);
    expect(MODULE_UNLOCK_LEVEL.production).toBe(27);
  });
});

/* ---- LE PLANCHER ------------------------------------------------------
 *
 * Ces tests-ci existent parce que les précédents ne suffisaient pas : ils
 * vérifiaient les seuils un par un, jamais la TRAJECTOIRE réelle d'un joueur.
 * C'est ce qui a laissé passer, pendant sept PR, le défaut où les quatre
 * modules s'ouvraient à la fin de l'acte 0 — l'acte 0 cite les niveaux 49 à
 * 52, réussir le 52 écrit `level = 53`, au-dessus des quatre seuils.
 *
 * La règle vérifiée n'est pas « le seuil vaut N » mais « le récit gouverne ».
 */
describe('le plancher gelé', () => {
  it("n'ouvre RIEN à un joueur neuf que la carrière a fait monter en niveau", () => {
    // La trajectoire exacte : fin de l'acte 0 (donc `acte = 1`, l'acte 0 est
    // franchi), `level` gonflé à 53 par les niveaux 49-52 que l'acte cite,
    // plancher resté à 1. L'acte 0 n'ouvre aucun module — c'est l'acte 1 qui
    // ouvre l'Atelier, et seulement une fois FRANCHI.
    const apresActe0 = { level: 53, plancher: 1, acte: 1 };
    for (const m of LOCKED_MODULES) {
      expect(moduleUnlocked(m, apresActe0), `${m} ouvert par l’acte 0`).toBe(false);
    }
  });

  it('laisse le récit ouvrir les modules un par un, malgré un niveau au plafond', () => {
    // `level` au maximum en permanence : si le plancher ne tenait pas, tout
    // serait ouvert dès le premier acte. Ce qu'on vérifie ici, c'est que
    // chaque module s'ouvre EXACTEMENT quand son acte est franchi, ni avant.
    for (const m of LOCKED_MODULES) {
      const acteQuiOuvre = unlockActeFor(m);
      const veille = { level: LEVELS.length, plancher: 1, acte: acteQuiOuvre };
      const apres = { level: LEVELS.length, plancher: 1, acte: acteQuiOuvre + 1 };
      expect(moduleUnlocked(m, veille), `${m} ouvert avant son acte`).toBe(false);
      expect(moduleUnlocked(m, apres), `${m} pas ouvert par son acte`).toBe(true);
    }
  });

  it('garde ses modules à un vétéran, dont le plancher est haut', () => {
    // L'autre moitié de la décision : quelqu'un qui avait déjà tout ouvert en
    // salle de répétition ne perd rien le jour où le plancher arrive.
    const veteran = { level: LEVELS.length, plancher: LEVELS.length, acte: 0 };
    for (const m of LOCKED_MODULES) {
      expect(moduleUnlocked(m, veteran), `${m} repris à un vétéran`).toBe(true);
    }
  });

  it('retombe sur `level` quand la sauvegarde est d’avant le plancher', () => {
    // Pas de migration : une sauvegarde sans `plancher` se comporte comme
    // avant. C'est ce qui rend le champ gratuit à déployer.
    expect(moduleUnlocked('synth', { level: 13 })).toBe(true);
    expect(moduleUnlocked('synth', { level: 12 })).toBe(false);
  });
});

describe('ce que le verrou dit', () => {
  it('nomme l’acte d’abord, le niveau ensuite — sur les quatre modules', () => {
    // Les onglets Synthé/Production et le bouton Mode Live annonçaient encore
    // « Se débloque au niveau 13 du Mode jeu » alors que l'accueil disait déjà
    // l'acte : le même verrou nommait deux chemins selon l'écran. Une seule
    // définition, et ce test la tient.
    for (const m of LOCKED_MODULES) {
      const texte = libelleVerrou(m);
      expect(texte).toContain(`l’acte ${unlockActeFor(m)}`);
      expect(texte).toContain(`niveau ${unlockLevelFor(m)}`);
      // L'acte est cité AVANT le niveau : c'est la voie principale.
      expect(texte.indexOf('acte')).toBeLessThan(texte.indexOf('niveau'));
      expect(verrouCourt(m)).toBe(`Acte ${unlockActeFor(m)}`);
    }
  });
});

/* ⚠️ LA SCÈNE OUVRE LE MODE LIVE LE TEMPS DE L'ÉTAPE, ET L'ACTE LE GARDE.
 *
 * Une étape qui envoie sur scène pendant son acte trouvait le module cadenassé
 * — le cul-de-sac déjà payé à l'acte 3, où la commande réclamait une basse que
 * le Synthé verrouillé ne laissait pas écrire. Le câblage passe par
 * `game.modulesRequis`, qui fusionne ce que réclament la commande ET la scène.
 *
 * ⚠️ Depuis le 2026-09-14, le prêt n'est plus seul : l'acte 6 OUVRE le Mode
 * Live, et il est ouvert dès l'ÉTAPE qui le prête (`ETAPE_DU_MODULE`) au lieu
 * d'attendre la frontière de l'acte. Sans ça l'entrée disparaissait sur
 * l'écran de récit qui suit la scène — une porte que le récit vient d'ouvrir
 * et qui se referme à l'écran suivant.
 */
describe('la scène ouvre le Mode Live, et l’acte le garde ouvert', () => {
  // L'acte 6 en cours, tout au début : le joueur y est, il n'a rien franchi.
  const DEBUT_ACTE_6 = { level: 1, plancher: 1, acte: 6, etape: 0 };
  const SCENE = ETAPE_DU_MODULE.live;

  it('avant l’étape qui le prête, le Mode Live reste fermé', () => {
    expect(SCENE).toBeGreaterThan(0);
    expect(moduleUnlocked('live', DEBUT_ACTE_6)).toBe(false);
  });

  it('⚠️ la scène ouverte l’ouvre, et rien d’autre', () => {
    const cx = { ...DEBUT_ACTE_6, modulesRequis: ['live' as const] };
    expect(moduleUnlocked('live', cx)).toBe(true);
    // Et pas les autres : ce qu'une étape ouvre, elle l'ouvre seule.
    expect(moduleUnlocked('production', cx)).toBe(true); // ouvert par l'acte 4, franchi
    expect(moduleUnlocked('live', DEBUT_ACTE_6)).toBe(false);
  });

  /* ⚠️ Le défaut que l'arbitrage corrige, dans sa version courte : entre la
   * scène et la fin de l'acte il reste un écran de récit (« LE CATALOGUE »).
   * Sans la règle d'étape, le Mode Live y disparaissait pour revenir juste
   * après — exactement ce qu'on vient de retirer à l'échelle de deux actes. */
  it('⚠️ et il ne se REFERME pas à l’étape suivante', () => {
    const surLaScene = { ...DEBUT_ACTE_6, etape: SCENE };
    const ecranSuivant = { ...DEBUT_ACTE_6, etape: SCENE + 1 };
    // Sans même le prêt : c'est l'acte qui tient, maintenant.
    expect(moduleUnlocked('live', surLaScene)).toBe(true);
    expect(moduleUnlocked('live', ecranSuivant)).toBe(true);
    // Et il reste ouvert pour le concert de l'acte 7, puis pour toujours.
    expect(moduleUnlocked('live', { level: 1, plancher: 1, acte: 7, etape: 0 })).toBe(true);
  });
});

/* ⚠️ LE CATALOGUE DES 34 MORCEAUX — ni un module, ni un son de plus.
 *
 * Fermé jusqu'à la fin de l'acte 5 (2026-09-14). Deux défauts d'un coup : il
 * posait des lignes de synthé AUDIBLES dans un onglet qui n'existe pas encore,
 * et il offrait tout faits les genres que l'acte 5 demande de produire.
 */
describe('le catalogue des morceaux suit le récit', () => {
  const neuf = (acte: number) => ({ level: 1, plancher: 1, acte, etape: 0 });

  it('reste fermé tant que l’acte des styles n’est pas passé', () => {
    for (const a of [0, 1, 2, 3, 4, 5]) expect(catalogueOuvert(neuf(a))).toBe(false);
  });

  it('s’ouvre l’acte 5 franchi, et ne se referme jamais', () => {
    for (const a of [6, 7, 8]) expect(catalogueOuvert(neuf(a))).toBe(true);
  });

  /* ⚠️ Une porte déjà ouverte ne se referme jamais : qui avait les 34 morceaux
   * hors carrière les garde. C'est le seuil de la Production, le module de la
   * même époque du récit — et il se lit sur le PLANCHER, jamais sur `level`,
   * que la carrière fait monter en citant des niveaux du réservoir. */
  it('reste ouvert pour un vétéran, et le plancher seul en décide', () => {
    expect(catalogueOuvert({ level: 1, plancher: MODULE_UNLOCK_LEVEL.production, acte: 0 })).toBe(true);
    expect(catalogueOuvert({ level: LEVELS.length, plancher: 1, acte: 0 })).toBe(false);
  });
});
