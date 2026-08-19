/* Les presets de voix synthé — le contrat que le menu de voix affiche.
 *
 * Écrit en même temps que le correctif du menu : il verrouille les deux
 * comportements qui étaient faux, pour qu'ils ne repartent pas en silence.
 */
import { describe, it, expect } from 'vitest';
import {
  SYNTH_VOICE_PRESETS,
  defaultSynthVoice,
  resolveVoicePreset,
  matchVoicePreset,
} from '../src/model/presets/voices';
import type { SynthRowName } from '../src/model/types';

const LIGNES: SynthRowName[] = ['bass', 'pad', 'melody'];

describe('resolveVoicePreset — un champ non précisé revient au défaut', () => {
  it('part de la voix par défaut de la ligne, pas de la voix courante', () => {
    // « Pincée » règle filterEnvAmount à 1200 ; « 808 profond » n'y touche
    // pas — il doit donc rendre le défaut (0), et non 1200.
    expect(resolveVoicePreset('bass', 'pluck')!.filterEnvAmount).toBe(1200);
    expect(resolveVoicePreset('bass', 'sub808')!.filterEnvAmount).toBe(
      defaultSynthVoice('bass').filterEnvAmount,
    );
  });

  it('renvoie null pour un identifiant inconnu', () => {
    expect(resolveVoicePreset('bass', 'ceci-nexiste-pas')).toBeNull();
  });

  it('« Défaut » rend exactement la voix par défaut', () => {
    for (const ligne of LIGNES) {
      expect(resolveVoicePreset(ligne, 'default')).toEqual(defaultSynthVoice(ligne));
    }
  });
});

describe('matchVoicePreset — ce que le menu doit afficher', () => {
  it('reconnaît chaque preset de chaque ligne', () => {
    for (const ligne of LIGNES) {
      for (const p of SYNTH_VOICE_PRESETS[ligne]) {
        const voix = resolveVoicePreset(ligne, p.id)!;
        // « Défaut » a un patch vide : il est donc légitimement le premier à
        // correspondre pour une voix par défaut. On vérifie que la voix
        // trouvée est ÉQUIVALENTE, pas que l'identifiant est le même — deux
        // presets peuvent décrire la même voix.
        const trouve = matchVoicePreset(ligne, voix);
        expect(trouve).not.toBeNull();
        expect(resolveVoicePreset(ligne, trouve!)).toEqual(voix);
      }
    }
  });

  it('ne reconnaît plus rien dès qu’un curseur a bougé un seul champ', () => {
    const voix = { ...resolveVoicePreset('melody', 'default')! };
    expect(matchVoicePreset('melody', voix)).not.toBeNull();
    voix.cutoff = (voix.cutoff as number) + 1;
    expect(matchVoicePreset('melody', voix)).toBeNull();
  });

  it('ignore les champs additionnels que la voix peut porter', () => {
    const voix = { ...resolveVoicePreset('pad', 'organ')!, champEnPlus: 42 };
    expect(matchVoicePreset('pad', voix)).toBe('organ');
  });
});
