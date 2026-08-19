// Presets de voix synthé — portés VERBATIM de boite-a-rythme-69.html
// (defaultSynthVoice l. 2151, SYNTH_VOICE_PRESETS l. 2184, NEUTRAL_VOICE l. 3643).
//
// ÉCART DE FORME constaté (données NON adaptées) : la forme réelle d'une voix
// dans l'original NE correspond PAS à l'interface SynthVoice de ../types.
// L'original utilise : { type, cutoff, attack, release, attackCurve,
// releaseCurve, filterEnvAmount, filterEnvRelease, subGain, detuneCents,
// detuneGain, chorusMix, vibratoDepth, tone } — alors que SynthVoice attend
// { wave, filterCutoff, filterQ, envShape, filterEnv, sub, detune, detuneMix,
// chorus, vibrato, … }. Les données sont donc typées ici structurellement dans
// leur forme d'origine (RawSynthVoice) ; la conversion vers SynthVoice (si
// souhaitée) relève d'un adaptateur séparé, pas de ce fichier.

import type { SynthRowName } from '../types';

// Forme d'origine d'une voix synthé complète (telle que portée par
// synthRows[name].voice dans le fichier HTML).
export interface RawSynthVoice {
  // Index signature : rend la forme compatible avec `SynthVoice` du modèle
  // d'état (qui tolère des champs additionnels portés tels quels).
  [k: string]: unknown;
  type: OscillatorType;
  cutoff: number;
  attack: number;
  release: number;
  attackCurve: 'linear' | 'exponential';
  releaseCurve: 'linear' | 'exponential';
  filterEnvAmount: number;
  filterEnvRelease: number;
  subGain: number;
  detuneCents: number;
  detuneGain: number;
  chorusMix: number;
  vibratoDepth: number;
  tone: number;
}

export interface SynthVoicePreset {
  id: string;
  label: string;
  voice: Partial<RawSynthVoice>;
}

// Voix par défaut d'une ligne synthé (avant tout preset/réglage manuel) —
// mêmes valeurs qu'avant, mais maintenant portées directement par la ligne
// (synthRows[name].voice) plutôt que recalculées à la volée à chaque note,
// pour pouvoir les éditer en direct comme pitch/attack/decay/tone côté rythme.
export function defaultSynthVoice(name: SynthRowName): RawSynthVoice {
  if (name === 'bass') {
    // tone:18 (au lieu de 0) : une légère saturation ajoute des harmoniques
    // AU-DESSUS de la fondamentale grave (~65Hz par défaut) — c'est ce que
    // l'oreille utilise pour "reconstruire" perceptivement un grave qu'un
    // petit haut-parleur ne reproduit pas directement. Aide l'audibilité par
    // défaut, y compris sur les presets qui ne réglaient rien d'autre.
    return { type: 'sine', cutoff: 600, attack: 0.005, release: 0.08,
      attackCurve: 'exponential', releaseCurve: 'exponential',
      filterEnvAmount: 0, filterEnvRelease: 0.15, subGain: 0, detuneCents: 0, detuneGain: 0,
      chorusMix: 0, vibratoDepth: 0, tone: 18 };
  }
  if (name === 'pad') {
    return { type: 'sawtooth', cutoff: 900, attack: 0.08, release: 0.3,
      attackCurve: 'exponential', releaseCurve: 'exponential',
      filterEnvAmount: 0, filterEnvRelease: 0.3, subGain: 0, detuneCents: 0, detuneGain: 0,
      chorusMix: 0, vibratoDepth: 0, tone: 0 };
  }
  // cutoff:1600 (ramené de 2600) : la mélodie sonnait trop brillante par
  // défaut — plusieurs presets ajoutent en plus filterEnvAmount (ouverture
  // du filtre à l'attaque) et tone (saturation), qui empilés sur un filtre
  // déjà très ouvert pouvaient rendre l'attaque agressive/perçante.
  return { type: 'sawtooth', cutoff: 1600, attack: 0.01, release: 0.1, // melody
    attackCurve: 'exponential', releaseCurve: 'exponential',
    filterEnvAmount: 0, filterEnvRelease: 0.15, subGain: 0, detuneCents: 0, detuneGain: 0,
    chorusMix: 0, vibratoDepth: 0, tone: 0 };
}

// ---------- Bibliothèque de presets de voix, PAR LIGNE ----------
// Indépendante des 34 presets de morceau (rythme+voix ensemble) : ici, un
// preset ne concerne qu'UNE ligne (juste sa voix), pour pouvoir composer
// librement — ex. la basse d'un preset avec la nappe d'un autre — sans
// toucher au rythme ni aux 2 autres lignes. Chaque voix est fusionnée avec
// defaultSynthVoice(name), donc un champ non précisé revient au défaut.
export const SYNTH_VOICE_PRESETS: Record<SynthRowName, SynthVoicePreset[]> = {
  bass: [
    { id: 'default', label: 'Défaut', voice: {} },
    { id: 'sub808',  label: '808 profond',      voice: { type: 'sine', cutoff: 350, attack: 0.008, release: 0.4, subGain: 0.9 } },
    { id: 'round',   label: 'Ronde (boom bap)', voice: { type: 'sine', cutoff: 500, attack: 0.01, release: 0.18, subGain: 0.5, vibratoDepth: 0.15 } },
    { id: 'reggae',  label: 'Ronde (reggae)',   voice: { type: 'triangle', cutoff: 450, attack: 0.015, release: 0.3, subGain: 0.6 } },
    { id: 'pluck',   label: 'Pincée',           voice: { type: 'square', cutoff: 900, filterEnvAmount: 1200, filterEnvRelease: 0.08, attack: 0.003, release: 0.05 } },
  ],
  pad: [
    { id: 'default', label: 'Défaut', voice: {} },
    { id: 'stab',    label: 'Stab house',       voice: { type: 'sawtooth', cutoff: 600, filterEnvAmount: 3200, filterEnvRelease: 0.35, detuneCents: 12, detuneGain: 0.7 } },
    { id: 'rhodes',  label: 'Rhodes chaud',     voice: { type: 'triangle', cutoff: 700, attack: 0.15, release: 0.5, detuneCents: 8, detuneGain: 0.5, chorusMix: 0.4 } },
    { id: 'organ',   label: 'Orgue skank',      voice: { type: 'square', cutoff: 800, attack: 0.02, release: 0.6, chorusMix: 0.5 } },
    { id: 'wide',    label: 'Large (détune)',   voice: { type: 'sawtooth', cutoff: 1000, detuneCents: 20, detuneGain: 0.8, release: 0.4 } },
    { id: 'dark',    label: 'Sombre (trap)',    voice: { type: 'sawtooth', cutoff: 500, attack: 0.05, release: 0.25 } },
  ],
  melody: [
    { id: 'default',    label: 'Défaut', voice: {} },
    { id: 'trappluck',  label: 'Pluck trap',       voice: { type: 'square', cutoff: 1200, filterEnvAmount: 2500, filterEnvRelease: 0.12, attack: 0.003, release: 0.08 } },
    { id: 'housepluck', label: 'Pluck house',      voice: { type: 'square', cutoff: 1800, filterEnvAmount: 1800, filterEnvRelease: 0.15, attack: 0.005, release: 0.1 } },
    { id: 'soft',       label: 'Douce (boom bap)', voice: { type: 'triangle', cutoff: 1400, attack: 0.02, release: 0.2, vibratoDepth: 0.2 } },
    { id: 'bright',     label: 'Brillante',        voice: { type: 'sawtooth', cutoff: 3200, attack: 0.005, release: 0.12 } },
  ],
};

// Résolution d'un preset de voix pour UNE ligne (partie pure de
// applyVoicePreset de l'original : le merge avec la voix par défaut, sans
// l'écriture dans synthRows ni le reflet UI). Un champ non précisé revient
// au défaut.
export function resolveVoicePreset(name: SynthRowName, presetId: string): RawSynthVoice | null {
  const list = SYNTH_VOICE_PRESETS[name] || [];
  const p = list.find(x => x.id === presetId);
  if (!p) return null;
  return Object.assign(defaultSynthVoice(name), p.voice);
}

/* Quel preset la voix courante représente-t-elle — ou aucun ?
 *
 * Le menu de voix n'avait aucune liaison de valeur : il retombait toujours sur
 * « — Voix… » et n'a donc jamais dit quelle voix était en place. Un contrôle
 * qui écrit sans jamais lire. Pour qu'il puisse lire, il faut répondre à cette
 * question — et la réponse honnête a trois cas, pas deux : un preset, un autre
 * preset, ou **une voix que les curseurs ont écartée de tout preset**. C'est le
 * troisième qui manquait, et c'est celui qui rendait le menu menteur : après un
 * tour de curseur, afficher encore « Rhodes chaud » aurait été un mensonge de
 * plus, dans l'autre sens.
 *
 * Comparaison sur les champs de `RawSynthVoice` seulement : `voice` est typé
 * avec une signature d'index et peut porter des champs additionnels, qui ne
 * relèvent pas du preset.
 */
export function matchVoicePreset(
  name: SynthRowName,
  voice: Record<string, unknown>,
): string | null {
  for (const p of SYNTH_VOICE_PRESETS[name] || []) {
    const resolu = resolveVoicePreset(name, p.id);
    if (!resolu) continue;
    let identique = true;
    for (const cle of Object.keys(resolu)) {
      if (voice[cle] !== resolu[cle]) {
        identique = false;
        break;
      }
    }
    if (identique) return p.id;
  }
  return null;
}

// ---------- Module Timbre (pitch / attack / decay / tone) ----------
// Un `voice` neutre (toutes valeurs à 0) reproduit EXACTEMENT le son fixe
// d'origine — donc tout appel existant qui ne passe pas de `voice` (Mode jeu,
// anciens appels) sonne rigoureusement comme avant. Seul l'Atelier, via
// rows[name] (qui porte maintenant pitch/attack/decay/tone), active le module.
export const NEUTRAL_VOICE = { pitch: 0, attack: 0, decay: 0, tone: 0, filterCutoff: 20000 } as const;
