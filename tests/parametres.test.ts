/* Le catalogue des paramètres sonores, et la mesure d'un réglage.
 *
 * Deux choses s'y vérifient, et ce ne sont pas les mêmes :
 *   - des CONTRATS mécaniques (les identifiants existent vraiment, les bornes
 *     sont cohérentes) — une erreur y serait silencieuse, le jeu réglerait un
 *     champ que personne ne lit ;
 *   - des JUGEMENTS musicaux (tolérance, écart minimal) — on ne peut pas les
 *     prouver, mais on peut verrouiller leurs RAPPORTS, pour qu'un réglage
 *     futur ne rende pas un exercice impossible ou trivial sans qu'on le voie.
 */
import { describe, it, expect } from 'vitest';
import {
  PARAMETRES,
  parametre,
  parametresDe,
  ecartPercu,
  justesseDuReglage,
  appliquerParam,
  lireParam,
  FACTEUR_ZERO,
  tirerVersions,
  tirerCible,
  pourLigne,
  versionQuiRepond,
} from '../src/model/parametres';
import { defaultState } from '../src/model/defaults';

describe('le catalogue — des contrats, pas des intentions', () => {
  it('chaque identifiant existe vraiment dans l’état d’une ligne', () => {
    // Le piège que ce test existe pour attraper : un `lowpass` inventé au lieu
    // de `filterCutoff`. Le jeu réglerait un champ fantôme, tirerait deux sons
    // identiques, et le niveau serait impossible sans rien dire.
    const ligne = defaultState().rows.kick as unknown as Record<string, unknown>;
    for (const p of PARAMETRES) {
      expect(Object.prototype.hasOwnProperty.call(ligne, p.id), p.id).toBe(true);
      expect(typeof ligne[p.id], p.id).toBe('number');
    }
  });

  it('les bornes se tiennent, et l’écart minimal entre dans l’étendue', () => {
    for (const p of PARAMETRES) {
      expect(p.min, p.label).toBeLessThan(p.max);
      expect(p.step, p.label).toBeGreaterThan(0);
      expect(p.tolerance, p.label).toBeGreaterThan(0);
      // Sans quoi on ne pourrait jamais poser deux versions assez distinctes.
      const etendue = p.echelle === 'log' ? Math.log2(p.max / p.min) : p.max - p.min;
      expect(p.ecartMini, p.label).toBeLessThan(etendue);
    }
  });

  it('l’écart minimal dépasse franchement la tolérance', () => {
    // Sinon « Lequel est le plus… ? » poserait deux sons que l'oreille déclare
    // identiques : la bonne réponse serait un tirage au sort.
    for (const p of PARAMETRES) {
      expect(p.ecartMini / p.tolerance, p.label).toBeGreaterThanOrEqual(2.5);
    }
  });

  it('chaque paramètre nomme au moins une ligne où il s’entend', () => {
    for (const p of PARAMETRES) expect(p.lignes.length, p.label).toBeGreaterThan(0);
    // `tone` ne pilote qu'une saturation sur le kick, morte sous zéro : il n'y
    // a rien à entendre dans la moitié basse de son étendue.
    expect(parametre('tone')!.lignes).not.toContain('kick');
  });

  it('les deux familles servies sont peuplées', () => {
    expect(parametresDe('timbre').length).toBeGreaterThanOrEqual(3);
    expect(parametresDe('filtre').length).toBeGreaterThanOrEqual(3);
    expect(parametre('ceci-nexiste-pas' as never)).toBeNull();
  });
});

describe('ecartPercu — le filtre se compare en octaves, pas en hertz', () => {
  const filtre = parametre('filterCutoff')!;

  it('la même différence en hertz ne pèse pas pareil selon la hauteur', () => {
    // 500 Hz à 800 Hz change tout ; les mêmes 500 Hz à 12 kHz sont inaudibles.
    const bas = ecartPercu(800, 1300, filtre);
    const haut = ecartPercu(12000, 12500, filtre);
    expect(bas).toBeGreaterThan(haut * 5);
  });

  it('une octave vaut 1, deux octaves valent 2', () => {
    expect(ecartPercu(400, 800, filtre)).toBeCloseTo(1, 6);
    expect(ecartPercu(400, 1600, filtre)).toBeCloseTo(2, 6);
  });

  it('ne renvoie jamais l’infini sur une valeur nulle', () => {
    expect(Number.isFinite(ecartPercu(0, 800, filtre))).toBe(true);
  });

  it('reste la différence brute sur un paramètre linéaire', () => {
    expect(ecartPercu(10, 25, parametre('decay')!)).toBe(15);
  });
});

describe('justesseDuReglage — on cherche le SON, pas le chiffre', () => {
  const decay = parametre('decay')!;

  it('100 partout dans la tolérance : deux réglages indiscernables sont la même réponse', () => {
    expect(justesseDuReglage(0, 0, decay)).toBe(100);
    expect(justesseDuReglage(decay.tolerance, 0, decay)).toBe(100);
    expect(justesseDuReglage(-decay.tolerance, 0, decay)).toBe(100);
  });

  it('0 au-delà de quatre fois la tolérance, et pas de note négative', () => {
    expect(justesseDuReglage(decay.tolerance * FACTEUR_ZERO, 0, decay)).toBe(0);
    expect(justesseDuReglage(decay.max, decay.min, decay)).toBe(0);
  });

  it('décroît entre les deux, pour laisser une pente où progresser', () => {
    const proche = justesseDuReglage(15, 0, decay);
    const loin = justesseDuReglage(30, 0, decay);
    expect(proche).toBeGreaterThan(loin);
    expect(proche).toBeLessThan(100);
    expect(loin).toBeGreaterThanOrEqual(0);
  });

  it('vaut aussi pour le filtre, en octaves', () => {
    const f = parametre('filterCutoff')!;
    expect(justesseDuReglage(1000, 1000, f)).toBe(100);
    // Un quart d'octave : dans la tolérance de 0,35.
    expect(justesseDuReglage(1000 * Math.pow(2, 0.25), 1000, f)).toBe(100);
    // Deux octaves : très au-delà.
    expect(justesseDuReglage(4000, 1000, f)).toBe(0);
  });
});

describe('appliquer / lire — la conversion vers l’état', () => {
  it('réverbe et delay : le curseur montre des pourcents, l’état garde 0..1', () => {
    const row = defaultState().rows.kick;
    const rev = parametre('reverbSend')!;
    appliquerParam(row, rev, 40);
    expect(row.reverbSend).toBeCloseTo(0.4, 6);
    expect(lireParam(row, rev)).toBeCloseTo(40, 6);
  });

  it('un paramètre sans conversion passe tel quel', () => {
    const row = defaultState().rows.snare;
    const pitch = parametre('pitch')!;
    appliquerParam(row, pitch, -7);
    expect(row.pitch).toBe(-7);
    expect(lireParam(row, pitch)).toBe(-7);
  });
});

describe('tirerVersions — jamais deux sons qu’on ne peut pas départager', () => {
  /* ⚠️ La génération passe par Math.random : on affirme ce qui doit être vrai à
   * CHAQUE tirage, et on répète. Une assertion à un seul tirage serait une
   * pièce lancée — la leçon de l'étape 19. */
  const TIRAGES = 60;

  it('deux versions sont toujours séparées de l’écart PROMIS, pas seulement audibles', () => {
    // La promesse du code est plus forte que « au-dessus de la tolérance » :
    // c'est `ecartMini`, ou ce que l'étendue permet quand on demande beaucoup
    // de versions. On vérifie la promesse, pas un minimum confortable.
    for (const p of PARAMETRES) {
      const etendue =
        p.echelle === 'log' ? Math.log2(Math.max(2, p.max) / Math.max(1, p.min)) : p.max - p.min;
      for (const combien of [2, 3]) {
        const promis = Math.min(p.ecartMini, etendue / (combien - 1));
        for (let n = 0; n < TIRAGES; n++) {
          const v = tirerVersions(p, combien);
          for (let i = 0; i < v.length; i++) {
            for (let j = i + 1; j < v.length; j++) {
              const d = ecartPercu(v[i], v[j], p);
              // Tolérance de rebond de l'arrondi au pas du curseur.
              expect(d, `${p.label} ${v[i]}/${v[j]}`).toBeGreaterThanOrEqual(promis - p.step);
              expect(d, `${p.label} ${v[i]}/${v[j]}`).toBeGreaterThanOrEqual(p.tolerance);
            }
          }
        }
      }
    }
  });

  it('reste toujours dans les bornes du curseur', () => {
    for (const p of PARAMETRES) {
      for (let n = 0; n < TIRAGES; n++) {
        for (const v of tirerVersions(p, 3)) {
          expect(v, p.label).toBeGreaterThanOrEqual(p.min);
          expect(v, p.label).toBeLessThanOrEqual(p.max);
        }
      }
    }
  });

  it('ne rend pas toujours le même ordre — sinon la réponse serait devinable', () => {
    // Sans mélange, « le plus … » serait systématiquement la dernière version.
    const p = parametre('decay')!;
    const positions = new Set<number>();
    for (let n = 0; n < TIRAGES; n++) {
      positions.add(versionQuiRepond(tirerVersions(p, 3), 'plus'));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('en demande toujours au moins deux', () => {
    expect(tirerVersions(parametre('pitch')!, 1)).toHaveLength(2);
  });
});

describe('versionQuiRepond', () => {
  it('trouve le plus grand et le plus petit', () => {
    expect(versionQuiRepond([3, 9, 5], 'plus')).toBe(1);
    expect(versionQuiRepond([3, 9, 5], 'moins')).toBe(0);
  });

  it('garde le premier en cas d’égalité, sans jamais sortir des bornes', () => {
    expect(versionQuiRepond([7, 7], 'plus')).toBe(0);
    expect(versionQuiRepond([-4], 'moins')).toBe(0);
  });
});

describe('les verbes de paramètre, câblés dans le store', () => {
  /* Test de store, comme pour « jouer » : ce qui peut casser ici n'est pas le
   * calcul (verrouillé plus haut) mais le CÂBLAGE — un identifiant qui ne
   * correspond à rien, une ligne où le bouton ne s'entend pas, deux versions
   * identiques. Aucun de ces défauts ne se verrait à l'écran. */
  const TIRAGES = 40;

  it('chaque tirage donne un bouton audible sur la ligne choisie', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    game.pseudo = 'test';
    for (const verbe of ['lequel', 'nommer', 'regler'] as const) {
      const i = L.findIndex((l) => l.exercise === verbe);
      expect(i, verbe).toBeGreaterThanOrEqual(0);
      for (let n = 0; n < TIRAGES; n++) {
        game.startLevel(i);
        const p = parametre(game.paramId);
        expect(p, `${verbe} ${game.paramId}`).not.toBeNull();
        // `tone` sur le kick ne ferait rien : deux sons identiques, niveau
        // impossible et muet sur la raison.
        expect(p!.lignes, `${verbe} ${p!.label}`).toContain(game.paramLigne);
        expect(p!.famille).toBe('timbre');
      }
    }
  });

  it('« lequel » pose trois versions distinctes et une réponse cohérente', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'lequel');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const p = parametre(game.paramId)!;
      expect(game.paramVersions).toHaveLength(3);
      expect(game.paramReponse).toBe(versionQuiRepond(game.paramVersions, game.paramSens));
      for (let a = 0; a < 3; a++) {
        for (let b = a + 1; b < 3; b++) {
          expect(ecartPercu(game.paramVersions[a], game.paramVersions[b], p)).toBeGreaterThanOrEqual(
            p.tolerance,
          );
        }
      }
    }
  });

  it('« nommer » propose la bonne réponse parmi ses leurres', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'nommer');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      expect(game.paramCandidats.length).toBeGreaterThanOrEqual(2);
      expect(new Set(game.paramCandidats).size).toBe(game.paramCandidats.length);
      expect(game.paramCandidats[game.paramReponse]).toBe(game.paramId);
    }
  });

  /* ⚠️ Assertion par TIRAGE, et non plus par moyenne — et c'est la correction
   * la plus importante de ce test.
   *
   * L'ancienne version comptait les tirages déjà gagnants et exigeait « moins
   * de la moitié ». Une assertion d'ensemble, posée à la frontière : elle
   * échouait une fois sur quatre environ, au hasard, y compris sur `main` (où
   * un échec veut dire build non produit et déploiement sauté). Et elle
   * décrivait le vrai défaut sans le dire : la cible pouvait tomber sur le
   * point de départ du curseur, parce que rien ne l'en éloignait.
   *
   * `tirerCible` garantit désormais l'écart par construction, donc le test
   * peut affirmer ce qui est vrai à CHAQUE tirage — ce que `CLAUDE.md` exige
   * de tout test qui dépend du hasard. */
  it('« régler » ne place JAMAIS le curseur déjà sur la cible', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'regler');
    for (let n = 0; n < TIRAGES; n++) {
      game.startLevel(i);
      const p = parametre(game.paramId)!;
      expect(game.paramVersions).toHaveLength(1);
      // Pas seulement « pas encore gagné » : franchement à côté. L'écart posé
      // vaut au moins `ecartMini`, qui est plus du double de la tolérance.
      expect(justesseDuReglage(game.paramValeur, game.paramVersions[0], p), p.id).toBeLessThan(70);
      expect(ecartPercu(game.paramValeur, game.paramVersions[0], p), p.id).toBeGreaterThan(
        p.tolerance,
      );
      // Et la cible reste atteignable : jamais hors de l'étendue du curseur.
      expect(game.paramVersions[0]).toBeGreaterThanOrEqual(p.min);
      expect(game.paramVersions[0]).toBeLessThanOrEqual(p.max);
    }
  });

  it('la version jouée est bien celle qu’on demande, et la ligne est seule à sonner', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.exercise === 'lequel');
    game.startLevel(i);
    const p = parametre(game.paramId)!;
    for (let v = 0; v < game.paramVersions.length; v++) {
      game.paramVersionJouee = v;
      const st = game.buildState('param');
      expect(lireParam(st.rows[game.paramLigne], p)).toBeCloseTo(game.paramVersions[v], 6);
      for (const autre of ['kick', 'snare', 'hat'] as const) {
        if (autre !== game.paramLigne) expect(st.rows[autre].muted, autre).toBe(true);
      }
      expect(st.rows[game.paramLigne].muted).toBe(false);
    }
  });
});

/* `tirerCible` — l'écart au point de départ, garanti par construction.
 *
 * Testé ici en PUR, en plus du test à travers le store : c'est de
 * l'arithmétique, et une erreur de côté ou de borne s'y verrait tout de suite,
 * alors qu'à travers le store elle se noierait dans le reste du niveau.
 */
describe('tirerCible — la cible ne tombe jamais sur le départ', () => {
  const TIRAGES = 60;

  it('se pose au moins à `ecartMini` du départ, où qu’il soit', () => {
    for (const p of PARAMETRES) {
      const etendue =
        p.echelle === 'log' ? Math.log2(Math.max(2, p.max) / Math.max(1, p.min)) : p.max - p.min;
      // Trois départs : le milieu (le cas réel), et les deux bords, où un seul
      // côté est disponible — c'est là qu'un code qui tire le côté au hasard
      // sans vérifier la place se ferait prendre.
      for (const depart of [Math.round((p.min + p.max) / 2), p.min, p.max]) {
        for (let n = 0; n < TIRAGES; n++) {
          const c = tirerCible(p, depart);
          expect(c, p.label).toBeGreaterThanOrEqual(p.min);
          expect(c, p.label).toBeLessThanOrEqual(p.max);
          const d = ecartPercu(c, depart, p);
          expect(d, `${p.label} départ=${depart} cible=${c}`).toBeGreaterThanOrEqual(
            Math.min(p.ecartMini, etendue) - p.step,
          );
          // Et donc, toujours, franchement au-delà du discernable.
          expect(d, `${p.label} départ=${depart}`).toBeGreaterThan(p.tolerance);
        }
      }
    }
  });

  it('visite les deux côtés quand les deux tiennent', () => {
    // Sinon la cible serait toujours au-dessus, et le jeu s'apprendrait par
    // cœur au lieu de s'écouter.
    const p = parametre('decay')!;
    const milieu = Math.round((p.min + p.max) / 2);
    const cotes = new Set<string>();
    for (let n = 0; n < TIRAGES; n++) cotes.add(tirerCible(p, milieu) < milieu ? 'bas' : 'haut');
    expect(cotes.size).toBe(2);
  });
});

/* La plage jouable par ligne — un bouton peut être audible « sur une ligne »
 * sans l'être sur toute son étendue.
 */
describe('pourLigne — ne poser que des questions audibles', () => {
  it('resserre le pitch du kick, et laisse les autres lignes intactes', () => {
    const pitch = parametre('pitch')!;
    // ⚠️ Mesuré dans un OfflineAudioContext : `playKick` balaie jusqu'à
    // `max(20, 38 × mult)`, donc toute la moitié basse du curseur finit sur le
    // même plancher de 20 Hz. Trois versions tirées là-dedans sont
    // indiscernables — c'est ce que Yann a rencontré au premier niveau.
    expect(pourLigne(pitch, 'kick').min).toBe(0);
    expect(pourLigne(pitch, 'kick').max).toBe(pitch.max);
    expect(pourLigne(pitch, 'snare').min).toBe(pitch.min);
    expect(pourLigne(pitch, 'hat').min).toBe(pitch.min);
  });

  it('laisse un paramètre sans sous-plage strictement identique', () => {
    const decay = parametre('decay')!;
    expect(pourLigne(decay, 'kick')).toEqual(decay);
  });

  // La sous-plage doit rester assez large pour poser trois versions distinctes,
  // sinon on aurait échangé un exercice inaudible contre un exercice impossible.
  it('garde de quoi tirer trois versions dans chaque sous-plage', () => {
    for (const p of PARAMETRES) {
      for (const ligne of p.lignes) {
        const q = pourLigne(p, ligne);
        const etendue = q.echelle === 'log' ? Math.log2(q.max / q.min) : q.max - q.min;
        expect(etendue, `${p.label} / ${ligne}`).toBeGreaterThanOrEqual(2 * p.ecartMini);
      }
    }
  });
});

/* Ce que l'acte 0 a le droit de demander.
 *
 * Retour de Yann : « les paramètres à régler font intervenir des paramètres
 * auxquels on n'a pas encore accès ». Au premier acte l'Atelier est fermé : on
 * ne peut pas demander de NOMMER un bouton que le joueur n'a jamais vu.
 */
describe('Les trois premiers exercices ne tirent que des boutons annoncés', () => {
  it('n’utilise jamais un bouton hors de la liste du niveau', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    for (const id of [39, 40, 41]) {
      const i = L.findIndex((l) => l.id === id);
      const autorises = L[i].paramsAutorises;
      expect(autorises.length, `niveau ${id}`).toBeGreaterThan(0);
      for (let n = 0; n < 40; n++) {
        game.startLevel(i);
        expect(autorises, `niveau ${id}`).toContain(game.paramId);
      }
    }
  });

  // Et le pitch tiré sur un kick reste dans la plage où le kick s'entend.
  it('ne descend jamais le kick sous son réglage par défaut', async () => {
    const { game, LEVELS: L } = await import('../src/stores/game.svelte');
    const i = L.findIndex((l) => l.id === 39);
    for (let n = 0; n < 80; n++) {
      game.startLevel(i);
      if (game.paramId !== 'pitch' || game.paramLigne !== 'kick') continue;
      for (const v of game.paramVersions) expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});
