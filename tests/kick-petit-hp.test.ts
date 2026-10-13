/* Le kick du Mode jeu doit s'entendre SANS ÉCOUTEURS.
 *
 * Retour de Martin : des kicks inaudibles sur le haut-parleur du téléphone,
 * donc des grilles impossibles à compléter. Le kick nu est une sinusoïde
 * 140 → 38 Hz qu'un petit haut-parleur ne reproduit pas ; un peu de drive lui
 * donne des harmoniques là où il les entend (mesure dans `TONE_KICK_JEU`).
 *
 * Ce test tient le CÂBLAGE — le plancher posé sur chaque chemin qui fabrique
 * le timbre d'un exercice de grille —, la mesure elle-même demande Web Audio.
 */
import { describe, it, expect } from 'vitest';
import {
  TONE_KICK_JEU,
  VOICE_TIERS,
  randomVoice,
  voiceForLevel,
  mkLevel,
  type GamePresetLike,
} from '../src/model/presets/levels';

describe('le kick du Mode jeu porte toujours un peu de grain', () => {
  it('sur chaque palier de timbre tiré, à chaque tirage', () => {
    for (const tier of Object.values(VOICE_TIERS)) {
      for (let i = 0; i < 60; i++) {
        expect(randomVoice(tier).kick.tone).toBeGreaterThanOrEqual(TONE_KICK_JEU);
      }
    }
  });

  it('sur un niveau qui cite un preset, sans écraser un preset plus granuleux', () => {
    const preset = (tone: number): GamePresetLike => ({
      id: 'p',
      kick: { subdiv: 8, tone },
      snare: { subdiv: 8 },
      hat: { subdiv: 8 },
    });
    const niveau = mkLevel(9999, 'test', { presetId: 'p' });
    expect(voiceForLevel(niveau, [preset(0)]).kick.tone).toBe(TONE_KICK_JEU);
    expect(voiceForLevel(niveau, [preset(60)]).kick.tone).toBe(60);
  });

  it('ne touche pas la claire ni le charley', () => {
    const niveau = mkLevel(9999, 'test', { presetId: 'p' });
    const v = voiceForLevel(niveau, [
      { id: 'p', kick: { subdiv: 8 }, snare: { subdiv: 8 }, hat: { subdiv: 8 } },
    ]);
    expect(v.snare.tone).toBe(0);
    expect(v.hat.tone).toBe(0);
  });
});
