import { describe, it, expect } from 'vitest';
import {
  MODULE_UNLOCK_LEVEL,
  LOCKED_MODULES,
  moduleUnlocked,
  unlockLevelFor,
} from '../src/model/unlocks';
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

  it('ouvre tout avec le contournement #boss', () => {
    for (const m of LOCKED_MODULES) {
      expect(moduleUnlocked(m, { level: 1, bypass: true })).toBe(true);
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
