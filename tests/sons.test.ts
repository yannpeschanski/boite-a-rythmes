/* LE SON D'UN NIVEAU — décor, jamais réponse.
 *
 * Demande de Yann (2026-09-02) : *« il faut jouer avec tous les paramètres même
 * si on ne les bouge pas, ça peut rendre les son plus sympas. Par exemple dans
 * ce niveau 77 : on aurait pu avoir delay et reverb sur la mélodie avec un son
 * très court, une basse bien ronde au release élevé »*.
 *
 * Trois façons de rater ça, et ce sont elles que ce fichier tient :
 *
 * 1. **un son qui ne s'applique qu'à la cible.** Le joueur repose la grille
 *    juste, elle sonne autrement, il croit s'être trompé. La cible et sa
 *    version doivent recevoir EXACTEMENT le même son.
 * 2. **une voix citée qui n'existe pas.** `resolveVoicePreset` rend `null` et
 *    la ligne retombe sur le défaut, sans rien dire — un mensonge qui ne se
 *    voit qu'en connaissant le son attendu.
 * 3. **un son qui écrase la CONSIGNE.** Un verbe de paramètre règle le bouton
 *    qu'il fait entendre ; si le décor du niveau passait après, il le
 *    remplacerait et l'exercice deviendrait insoluble.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { game, LEVELS } from '../src/stores/game.svelte';
import { appliquerSons, type SonsDeNiveau } from '../src/model/sons';
import { defaultState } from '../src/model/defaults';
import { SYNTH_VOICE_PRESETS, resolveVoicePreset } from '../src/model/presets/voices';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES, type SynthRowName } from '../src/model/types';

const AVEC_SONS = LEVELS.filter((l) => l.sons);

describe('le son d’un niveau', () => {
  beforeEach(() => {
    game.pseudo = 'test';
  });

  it('des niveaux en portent — sinon ce fichier ne garde rien', () => {
    expect(AVEC_SONS.length).toBeGreaterThan(0);
  });

  it('⚠️ toute voix citée existe au catalogue de SA ligne', () => {
    /* Un identifiant inconnu ne lève pas : la ligne garde la voix par défaut et
     * le niveau sonne « presque bien ». C'est le genre de faute qu'une écoute
     * ne rattrape pas. */
    for (const l of AVEC_SONS) {
      for (const nom of SYNTH_ROW_NAMES) {
        const voix = l.sons![nom]?.voix;
        if (!voix) continue;
        const ids = SYNTH_VOICE_PRESETS[nom].map((p) => p.id);
        expect(ids, `niveau ${l.id}, ligne ${nom} : voix « ${voix} » inconnue`).toContain(voix);
      }
    }
  });

  it('⚠️ un son ne se pose que sur une ligne qui existe dans l’état', () => {
    for (const l of AVEC_SONS) {
      for (const nom of Object.keys(l.sons!)) {
        expect(
          [...DRUM_ROW_NAMES, ...SYNTH_ROW_NAMES],
          `niveau ${l.id} : la ligne « ${nom} » n’existe pas`,
        ).toContain(nom);
      }
    }
  });

  it('⚠️ la CIBLE et la VERSION DU JOUEUR sonnent pareil', () => {
    // Ce qui diffère entre les deux doit être le contenu, jamais le son.
    for (const l of AVEC_SONS) {
      const i = LEVELS.indexOf(l);
      game.startLevel(i);
      const cible = game.buildState('target');
      const mienne = game.buildState('guess');
      for (const n of DRUM_ROW_NAMES) {
        for (const champ of ['pitch', 'attack', 'decay', 'tone', 'filterCutoff', 'reverbSend', 'delaySend', 'volume'] as const) {
          expect(mienne.rows[n][champ], `niveau ${l.id}, ${n}.${champ}`).toBe(cible.rows[n][champ]);
        }
      }
      for (const n of SYNTH_ROW_NAMES) {
        expect(mienne.synthRows[n].voice, `niveau ${l.id}, ${n}.voice`).toEqual(cible.synthRows[n].voice);
        for (const champ of ['reverbSend', 'delaySend', 'volume', 'glide'] as const) {
          expect(mienne.synthRows[n][champ], `niveau ${l.id}, ${n}.${champ}`).toBe(cible.synthRows[n][champ]);
        }
      }
    }
  });

  it('⚠️ le son demandé arrive vraiment dans l’état', () => {
    // Le câblage, pas l'intention : un champ posé dans les données doit se
    // retrouver dans ce que le moteur reçoit.
    for (const l of AVEC_SONS) {
      const i = LEVELS.indexOf(l);
      game.startLevel(i);
      const s = game.buildState('target');
      for (const [nom, son] of Object.entries(l.sons!)) {
        if (SYNTH_ROW_NAMES.includes(nom as SynthRowName)) {
          const row = s.synthRows[nom as SynthRowName];
          if (son!.reverb !== undefined) expect(row.reverbSend, `${l.id} ${nom}`).toBe(son!.reverb);
          if (son!.delay !== undefined) expect(row.delaySend, `${l.id} ${nom}`).toBe(son!.delay);
          if (son!.retouches) {
            for (const [k, v] of Object.entries(son!.retouches)) {
              expect(row.voice[k], `niveau ${l.id}, ${nom}.voice.${k}`).toBe(v);
            }
          }
        }
      }
    }
  });

  it('⚠️ une retouche s’ajoute à la voix citée, elle ne la remplace pas', () => {
    const s = defaultState();
    const sons: SonsDeNiveau = { bass: { voix: 'round', retouches: { release: 0.42 } } };
    appliquerSons(s, sons);
    const attendu = resolveVoicePreset('bass', 'round')!;
    expect(s.synthRows.bass.voice.release).toBe(0.42);
    // Tout le reste du preset survit à la retouche.
    expect(s.synthRows.bass.voice.type).toBe(attendu.type);
    expect(s.synthRows.bass.voice.cutoff).toBe(attendu.cutoff);
    expect(s.synthRows.bass.voice.subGain).toBe(attendu.subGain);
  });

  it('⚠️ le décor du niveau passe AVANT la consigne d’un verbe de paramètre', () => {
    /* L'ordre est la règle : si le son se posait après, il écraserait le bouton
     * que l'exercice fait entendre et la question deviendrait insoluble.
     *
     * ⚠️ Pas de valeur SENTINELLE ici, et c'est une correction : une sentinelle
     * finit par coïncider avec la valeur tirée (« attack » est tombé sur 3 au
     * bout de quelques tours) et le test échoue sur une réussite. On compare
     * donc le même tirage AVEC et SANS le son : le champ visé doit être
     * identique, c'est la seule formulation qui ne dépend d'aucun hasard. */
    const CHAMP: Record<string, string> = {
      pitch: 'pitch', attack: 'attack', decay: 'decay', tone: 'tone',
      volume: 'volume', filterCutoff: 'filtre', reverbSend: 'reverb', delaySend: 'delay',
    };
    const i = LEVELS.findIndex((l) => l.exercise === 'regler');
    expect(i).toBeGreaterThanOrEqual(0);
    const niveau = LEVELS[i];
    const sauvegarde = niveau.sons;
    // ⚠️ Le tirage décide du bouton : sans ce compte, le jour où « régler »
    // cesse de tirer un champ de ligne, le test passerait sans rien vérifier
    // (CLAUDE.md — un garde-fou dont la population devient vide).
    let vus = 0;
    try {
      for (let n = 0; n < 60; n++) {
        niveau.sons = undefined;
        game.startLevel(i);
        const p = game.paramDescripteur;
        const champ = p ? CHAMP[p.id] : undefined;
        if (!p || p.cible === 'global' || !champ) continue;
        const sans = game.buildState('param').rows[game.paramLigne][p.id as 'tone'];
        // Un son qui vise EXACTEMENT le champ tiré, avec une valeur franche.
        niveau.sons = { [game.paramLigne]: { [champ]: 7 } };
        const avec = game.buildState('param').rows[game.paramLigne][p.id as 'tone'];
        expect(avec, `le son du niveau a écrasé « ${p.id} »`).toBe(sans);
        vus++;
      }
    } finally {
      niveau.sons = sauvegarde;
    }
    expect(vus, 'aucun tirage n’a posé un bouton de ligne — le test ne garde plus rien').toBeGreaterThan(0);
  });
});
