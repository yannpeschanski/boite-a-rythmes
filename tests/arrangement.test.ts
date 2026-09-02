/* L'ARRANGEMENT — le verbe qui repose PLUSIEURS lignes de deux natures.
 *
 * Demande de Yann (2026-09-02) : *« des exercices de reproduction de synthé
 * avec en même temps plusieurs lignes »*, et, pour les actes suivants, *« des
 * reproductions à 6 voire 8 lignes (drum + synthé) »*.
 *
 * Ce fichier ne teste pas les DONNÉES des niveaux — `tests/carriere.test.ts`
 * s'en charge — mais le CÂBLAGE, qui est là où ce verbe peut mentir sans que
 * rien ne le montre : une ligne AFFICHÉE mais muette, ou une ligne qui SONNE
 * sans être affichée. Les deux donnent un exercice impossible et un écran qui
 * a l'air juste. On ne les voit qu'en confrontant `buildState` à ce que le
 * scheduler produit vraiment (harnais `helpers/rejeu.ts`).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { game, LEVELS } from '../src/stores/game.svelte';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../src/model/types';
import { mesuresDeLArrangement } from '../src/model/presets/levels';
import { renderEvents } from './helpers/rejeu';

const INDICES = LEVELS.flatMap((l, i) => (l.exercise === 'arrangement' ? [i] : []));

describe('l’arrangement — le câblage des N lignes', () => {
  beforeEach(() => {
    game.pseudo = 'test';
  });

  it('il y a bien des niveaux d’arrangement à tester', () => {
    // Garde-fou : le jour où le verbe quitte le tableau, ce fichier doit
    // échouer bruyamment, pas devenir décoratif (CLAUDE.md).
    expect(INDICES.length).toBeGreaterThanOrEqual(3);
  });

  it('⚠️ la cible est celle du niveau, case pour case', () => {
    for (const i of INDICES) {
      game.startLevel(i);
      const a = LEVELS[i].arrangement!;
      expect(game.arrLignes.map((l) => l.nom)).toEqual(a.lignes.map((l) => l.nom));
      for (const ligne of a.lignes) {
        expect(game.arrCible[ligne.nom], `niveau ${LEVELS[i].id}, ${ligne.nom}`).toEqual(ligne.pas);
      }
    }
  });

  it('⚠️ la tonique du premier pas est DONNÉE et verrouillée, sur chaque ligne de synthé', () => {
    /* Sans elle, le joueur devait retrouver une note que la conception
     * considère acquise (même règle qu'à l'exercice de mélodie). Et ce qui est
     * donné doit être VERROUILLÉ : posé mais effaçable, il redevient une
     * question. */
    for (const i of INDICES) {
      game.startLevel(i);
      for (const l of game.arrLignes) {
        const n = game.arrCible[l.nom].length;
        if (l.nature === 'degres') {
          expect(game.arrGuess[l.nom][0], `niveau ${LEVELS[i].id}, ${l.nom}`).toBe(game.arrCible[l.nom][0]);
          expect(game.arrLocked[l.nom][0], `niveau ${LEVELS[i].id}, ${l.nom}`).toBe(true);
        } else {
          expect(game.arrGuess[l.nom][0]).toBe(0);
        }
        // Tout le reste est à trouver : une case posée d'avance est un exercice
        // en moins, et personne ne le verrait.
        for (let c = 1; c < n; c++) expect(game.arrGuess[l.nom][c], `${l.nom} pas ${c}`).toBe(0);
      }
    }
  });

  it('⚠️ TOUTE ligne non citée est muette — les cinq de batterie, les trois de synthé', () => {
    /* Le balayage ne peut pas se limiter aux trois lignes du jeu : un
     * arrangement qui cite le clap ouvre une ligne que `GAME_DRUM_ROWS` ne
     * connaît pas, et une ligne ouverte par l'état de départ sonnerait sans
     * jamais s'afficher. */
    for (const i of INDICES) {
      game.startLevel(i);
      const noms = new Set(game.arrLignes.map((l) => l.nom));
      const s = game.buildState('target');
      for (const n of DRUM_ROW_NAMES) {
        expect(s.rows[n].muted, `niveau ${LEVELS[i].id}, ${n}`).toBe(!noms.has(n));
      }
      for (const n of SYNTH_ROW_NAMES) {
        expect(s.synthRows[n].muted, `niveau ${LEVELS[i].id}, ${n}`).toBe(!noms.has(n));
      }
    }
  });

  it('⚠️ chaque ligne affichée S’ENTEND, et rien d’autre ne s’entend', () => {
    /* La mesure, pas l'intention : on rejoue le scheduler sur l'état de la
     * cible et on compte les événements par voie. Une ligne affichée qui ne
     * produit aucun son est un exercice impossible ; une voie qui produit du
     * son sans ligne à l'écran est une réponse qu'on ne peut pas poser. */
    const VOIE: Record<string, RegExp> = {
      kick: /^kick /, snare: /^(snare|rim) /, clap: /^clap /,
      hat: /^hat[CO] /, shaker: /^shaker /,
      bass: /^bass /, melody: /^melody /, pad: /^(pad|arp|drone) /,
    };
    for (const i of INDICES) {
      game.startLevel(i);
      const noms = new Set(game.arrLignes.map((l) => l.nom));
      const evs = renderEvents(game.buildState('target'), 2, 7);
      for (const [voie, re] of Object.entries(VOIE)) {
        const n = evs.filter((e) => re.test(e)).length;
        if (noms.has(voie)) {
          expect(n, `niveau ${LEVELS[i].id} : la ligne ${voie} est affichée mais muette`).toBeGreaterThan(0);
        } else {
          expect(n, `niveau ${LEVELS[i].id} : la voie ${voie} sonne sans être affichée`).toBe(0);
        }
      }
    }
  });

  it('⚠️ la vérification refuse une grille vide et accepte la cible', () => {
    // Le tour complet par le VRAI comparateur : c'est le seul point où l'on
    // sait que les N lignes sont bien toutes notées, et aucune oubliée.
    for (const i of INDICES) {
      game.startLevel(i);
      expect(game.verify(), `niveau ${LEVELS[i].id} : une grille vide passe`).toBe(false);
      for (const l of game.arrLignes) {
        game.arrCible[l.nom].forEach((v, c) => (game.arrGuess[l.nom][c] = v));
      }
      expect(game.verify(), `niveau ${LEVELS[i].id} : la cible exacte est refusée`).toBe(true);
      expect(game.solved).toBe(true);
    }
  });

  it('⚠️ une case juste se verrouille, même sur une réponse fausse', () => {
    /* C'est ce qui rend l'exercice à six lignes jouable : on ne redemande pas
     * ce qui est déjà posé. Sans verrouillage, une seule erreur oblige à
     * relire les six lignes. */
    const i = INDICES[INDICES.length - 1];
    game.startLevel(i);
    const l = game.arrLignes.find((x) => x.nature === 'drum')!;
    const c = game.arrCible[l.nom].findIndex((v, k) => v > 0 && k > 0);
    game.arrGuess[l.nom][c] = game.arrCible[l.nom][c];
    expect(game.verify()).toBe(false);
    expect(game.arrLocked[l.nom][c]).toBe(true);
  });

  /* ------------------------------------------------------------------ */
  /* L'ÉCOUTE — couper une ligne pour s'y retrouver.                      */
  /* ------------------------------------------------------------------ */

  it('⚠️ couper une ligne la rend MUETTE sans rien changer à ce qui est demandé', () => {
    /* La demande de Yann est un outil d'écoute : *« pouvoir muter des lignes
     * quand on écoute pour s'y retrouver »*. Le risque, et c'est son doute —
     * *« je me demande si ça rend pas le jeu trop facile »* — serait qu'une
     * ligne coupée cesse aussi d'être demandée. Ce test dit que non : elle est
     * toujours comparée, et une grille incomplète reste refusée. */
    for (const i of INDICES) {
      game.startLevel(i);
      const l = game.arrLignes[0];
      game.arrBasculerEcoute(l.nom);
      const s = game.buildState('target');
      const muette = l.nature === 'drum'
        ? s.rows[l.nom as 'kick'].muted
        : s.synthRows[l.nom as 'bass'].muted;
      expect(muette, `niveau ${LEVELS[i].id} : « ${l.nom} » coupée s’entend encore`).toBe(true);

      // On repose TOUT sauf la ligne coupée : ça doit être refusé.
      for (const x of game.arrLignes) {
        if (x.nom === l.nom) continue;
        game.arrCible[x.nom].forEach((v, c) => (game.arrGuess[x.nom][c] = v));
      }
      const aTrouver = game.arrCible[l.nom].some((v, c) => v > 0 && !game.arrLocked[l.nom][c]);
      if (aTrouver) {
        expect(game.verify(), `niveau ${LEVELS[i].id} : une ligne coupée n’est plus notée`).toBe(false);
      }
      // Et une fois la ligne posée elle aussi, ça passe — coupée ou non.
      game.arrCible[l.nom].forEach((v, c) => (game.arrGuess[l.nom][c] = v));
      expect(game.verify(), `niveau ${LEVELS[i].id} : refusé alors que tout est juste`).toBe(true);
    }
  });

  it('⚠️ l’écoute revient à neuf à chaque niveau, et « tout réentendre » rend tout', () => {
    // Une ligne coupée qui le resterait au niveau suivant ferait un exercice
    // silencieux que rien n'explique.
    const i = INDICES[0];
    game.startLevel(i);
    game.arrBasculerEcoute(game.arrLignes[0].nom);
    expect(game.arrDesLignesCoupees).toBe(true);
    game.startLevel(i);
    expect(game.arrDesLignesCoupees, 'une coupure a survécu au redémarrage').toBe(false);

    for (const l of game.arrLignes) game.arrBasculerEcoute(l.nom);
    expect(game.arrDesLignesCoupees).toBe(true);
    game.arrToutEntendre();
    expect(game.arrDesLignesCoupees).toBe(false);
  });

  /* ------------------------------------------------------------------ */
  /* LES CYCLES — des lignes qui n'ont pas la même durée.                 */
  /* ------------------------------------------------------------------ */

  it('⚠️ une ligne de deux mesures JOUE bien sa seconde mesure', () => {
    /* Le piège : `subdivisions` laissé à `subdiv` avec `cycleBars` à 2 donne
     * une ligne qui affiche seize cases et n'en joue que huit — la seconde
     * moitié serait éditable, notée, et inaudible. On compte donc les
     * événements sur deux mesures et on vérifie qu'ils correspondent aux cases
     * posées sur TOUTE la longueur. */
    const avecCycles = INDICES.filter((i) => mesuresDeLArrangement(LEVELS[i].arrangement!) > 1);
    expect(avecCycles.length, 'aucun arrangement ne dépasse une mesure').toBeGreaterThan(0);
    for (const i of avecCycles) {
      game.startLevel(i);
      const a = LEVELS[i].arrangement!;
      const mesures = mesuresDeLArrangement(a);
      const evs = renderEvents(game.buildState('target'), mesures, 7);
      for (const l of game.arrLignes) {
        if (l.nature !== 'degres') continue;
        const attendus = game.arrCible[l.nom].filter((v) => v > 0).length;
        const re = l.nom === 'pad' ? /^(pad|arp|drone) / : new RegExp(`^${l.nom} `);
        const joues = evs.filter((e) => re.test(e)).length;
        expect(joues, `niveau ${LEVELS[i].id}, ${l.nom} : ${joues} événements pour ${attendus} cases`).toBe(attendus);
      }
    }
  });

  it('⚠️ une ligne d’une mesure se RÉPÈTE en face des suivantes', () => {
    // C'est ce que l'écran montre en pâle, et il ne doit pas mentir : la
    // batterie rejoue sa mesure pendant que le synthé continue sa phrase.
    const i = INDICES.find((k) => mesuresDeLArrangement(LEVELS[k].arrangement!) > 1)!;
    game.startLevel(i);
    const mesures = mesuresDeLArrangement(LEVELS[i].arrangement!);
    const evs = renderEvents(game.buildState('target'), mesures, 7);
    const kick = game.arrCible.kick.filter((v) => v > 0).length;
    expect(evs.filter((e) => /^kick /.test(e)).length, 'la batterie ne reboucle pas').toBe(kick * mesures);
  });
});
