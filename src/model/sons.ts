/* LE SON D'UN NIVEAU — ce qui s'entend sans que l'exercice le demande.
 *
 * Demande de Yann (2026-09-02), en découvrant le niveau 77 : *« il faut jouer
 * avec tous les paramètres même si on ne les bouge pas, ça peut rendre les son
 * plus sympas. Par exemple dans ce niveau 77 : on aurait pu avoir delay et
 * reverb sur la mélodie avec un son très court, une basse bien ronde au release
 * élevé »*.
 *
 * ⚠️ Le SON n'est pas la RÉPONSE. Rien ici n'est comparé, deviné ni noté : un
 * niveau écrit décide de ses timbres comme il décide de son feel (`swing`,
 * `drag`, `shift` — même famille de décisions). Ce qui est jugé reste les cases
 * et les degrés. Corollaire : la cible ET la version du joueur reçoivent
 * EXACTEMENT le même son — sinon reposer une grille juste ne sonnerait pas
 * comme le modèle, et le joueur croirait s'être trompé.
 *
 * ⚠️ Les voix de synthé se CITENT, elles ne se réinventent pas : le catalogue
 * `SYNTH_VOICE_PRESETS` existe déjà et sert l'Atelier. Un second jeu de voix
 * dans les niveaux serait deux vérités qui divergent — même raison que le
 * comparateur unique (CLAUDE.md). D'où `voix`, un identifiant du catalogue,
 * et `retouches` pour l'ajuster à la marge sans le dupliquer.
 */
import type { LineName, PatternStateV2, SynthRowName, SynthVoice } from './types';
import { DRUM_ROW_NAMES } from './types';
import { resolveVoicePreset } from './presets/voices';

export interface SonDeLigne {
  // --- Les deux natures ---
  /** Envoi de réverbe, 0..1. La taille de la salle est globale. */
  reverb?: number;
  /** Envoi de delay, 0..1. La division et le retour sont globaux. */
  delay?: number;
  /** Volume de la ligne, 0..1.5. */
  volume?: number;

  // --- Lignes de SYNTHÉ ---
  /** Identifiant d'un preset de `SYNTH_VOICE_PRESETS` pour cette ligne. */
  voix?: string;
  /** Retouches par-dessus le preset (`release`, `cutoff`, `attack`…). */
  retouches?: Record<string, unknown>;
  /** Portamento, 0..1. */
  glide?: number;
  /** Étalement d'accord (nappe seulement), 0..1. */
  strum?: number;

  // --- Lignes de BATTERIE (module Timbre) ---
  /** ±24 demi-tons. */
  pitch?: number;
  /** 0..100 → +0..80 ms. */
  attack?: number;
  /** −50..+50 → ×0,71..×1,41. */
  decay?: number;
  /** 0..100, drive doux. */
  tone?: number;
  /** Passe-bas de la ligne, 200..20000 Hz. */
  filtre?: number;
}

export type SonsDeNiveau = Partial<Record<LineName, SonDeLigne>>;

const EST_BATTERIE = new Set<string>(DRUM_ROW_NAMES);

/* Poser les sons d'un niveau sur un état.
 *
 * ⚠️ S'applique AVANT tout le reste dans `buildState` : ce qu'un exercice
 * règle lui-même (le bouton visé d'un verbe de paramètre, le timbre tiré d'un
 * palier) doit gagner sur le son du niveau, jamais l'inverse. Un son de niveau
 * est un décor, pas une consigne.
 */
export function appliquerSons(state: PatternStateV2, sons: SonsDeNiveau | undefined): void {
  if (!sons) return;
  for (const [nom, son] of Object.entries(sons) as [LineName, SonDeLigne][]) {
    if (!son) continue;
    if (EST_BATTERIE.has(nom)) {
      const row = state.rows[nom as Exclude<LineName, SynthRowName>];
      if (!row) continue;
      if (son.pitch !== undefined) row.pitch = son.pitch;
      if (son.attack !== undefined) row.attack = son.attack;
      if (son.decay !== undefined) row.decay = son.decay;
      if (son.tone !== undefined) row.tone = son.tone;
      if (son.filtre !== undefined) row.filterCutoff = son.filtre;
      if (son.reverb !== undefined) row.reverbSend = son.reverb;
      if (son.delay !== undefined) row.delaySend = son.delay;
      if (son.volume !== undefined) row.volume = son.volume;
      continue;
    }
    const row = state.synthRows[nom as SynthRowName];
    if (!row) continue;
    if (son.voix) {
      const voix = resolveVoicePreset(nom as SynthRowName, son.voix);
      // Un identifiant inconnu ne doit pas retomber en silence sur le défaut :
      // il se verrait à l'oreille bien après, et seulement si on connaît le son
      // attendu. `tests/sons.test.ts` refuse tout identifiant hors catalogue.
      if (voix) row.voice = voix as SynthVoice;
    }
    if (son.retouches) row.voice = { ...row.voice, ...son.retouches };
    if (son.reverb !== undefined) row.reverbSend = son.reverb;
    if (son.delay !== undefined) row.delaySend = son.delay;
    if (son.volume !== undefined) row.volume = son.volume;
    if (son.glide !== undefined) row.glide = son.glide;
    if (son.strum !== undefined) row.strum = son.strum;
  }
}
