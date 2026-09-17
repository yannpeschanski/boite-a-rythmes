/* LIRE UNE CHAÎNE — la part AUDIBLE, partagée par les DEUX écrans qui la lisent.
 *
 * ⚠️ POURQUOI CE MODULE EXISTE. Le Mode Live savait enchaîner des scènes ; le
 * panneau de montage de l'Atelier a gagné un bouton ÉCOUTER le 2026-09-17. Deux
 * écrans qui lisent la même chaîne, ce sont deux façons de l'entendre — et
 * elles auraient divergé au premier réglage (le projet tient déjà « un seul
 * builder de graphe, un seul scheduler, un seul modèle d'état » pour cette
 * raison exacte).
 *
 * Ce qui est ICI est ce qu'on ENTEND ; ce qui reste dans chaque vue est ce
 * qu'on VOIT (les voyants du Live, sa pastille allumée, ses curseurs rendus au
 * morceau). La frontière est celle-là et pas une autre.
 */
import type { AudioEngine } from '../engine/AudioEngine';
import type { Section } from '../model/architecture';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES, type DrumRowName, type SynthRowName } from '../model/types';
import { parties } from '../stores/parties.svelte';

export type Calque = Partial<Record<DrumRowName | SynthRowName, boolean>>;

/** Poser (ou relâcher) une coupure sur toutes les lignes, d'un seul endroit. */
function poserCalque(engine: AudioEngine, actives: Set<string> | null): Calque {
  const vu: Calque = {};
  for (const name of [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES]) {
    /* ⚠️ `null` veut dire TOUTES, donc RELÂCHER le calque — pas « forcer
       ouvert », pas « ne rien toucher ». Une ligne coupée dans l'Atelier reste
       coupée, et une scène qui rouvre tout doit défaire ce que la précédente a
       coupé (trouvé en jouant le modèle ARC : le CLIMAX gardait les lignes que
       la MONTÉE avait fermées). */
    const valeur = actives === null ? null : !actives.has(name);
    if (valeur !== null) vu[name] = valeur;
    if (DRUM_ROW_NAMES.includes(name as DrumRowName))
      engine.liveSetMute(name as DrumRowName, valeur);
    else engine.liveSetSynthMute(name as SynthRowName, valeur);
  }
  return vu;
}

/* APPLIQUER UNE SCÈNE — charge son motif (SANS son tempo) et pose son calque.
 *
 * Appelée DANS la file du moteur, donc exactement au début de la mesure. Rend
 * le calque posé, pour que l'appelant puisse en tenir un miroir d'affichage.
 *
 * ⚠️ REPLI SUR A, jamais sur « le motif courant ». Une lettre encore vide est
 * le cas normal quand on vient de charger un montage et qu'on n'a rangé que A :
 * garder le motif courant ferait jouer ce que la bascule précédente avait
 * laissé, c'est-à-dire n'importe quoi.
 *
 * ⚠️ LE MIX SUIT LA BASCULE (une lettre porte un SON complet) mais PAS le
 * tempo, qui appartient au transport — et pas non plus `liveFilter` /
 * `liveReverbSend`, qui sont des nœuds séparés qu'`applyMixSettings` n'écrit
 * jamais : le pad garde la main pendant qu'une scène passe. */
export function appliquerSectionAuMoteur(engine: AudioEngine, section: Section): Calque {
  if (!parties.chargerGardantTempo(section.partie)) {
    if (section.partie !== 'A') parties.chargerGardantTempo('A');
  }
  engine.refreshMixSettings();
  engine.relacherReglagesLive();
  return poserCalque(engine, section.lignes ? new Set<string>(section.lignes) : null);
}

/** Rendre la main : plus aucune coupure imposée par la chaîne. À appeler quand
 *  on ARRÊTE de lire, sinon les lignes qu'une scène avait coupées le restent
 *  sur un écran qui n'enchaîne plus rien. */
export function relacherCalque(engine: AudioEngine): void {
  poserCalque(engine, null);
}

/** La scène suivante, en bouclant. Un seul endroit pour le modulo. */
export function sectionSuivante(index: number, total: number): number {
  return total ? (index + 1) % total : 0;
}

/* Faut-il basculer MAINTENANT ? On programme la bascule pendant la DERNIÈRE
 * mesure de la scène : `queueSwapAtNextBar` l'applique au début de la suivante,
 * qui est exactement la frontière. */
export function doitBasculer(engine: AudioEngine, mesuresDeLaScene: number): boolean {
  if (mesuresDeLaScene <= 0) return false;
  return engine.barDansSection >= mesuresDeLaScene - 1;
}
