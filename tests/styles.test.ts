import { describe, it, expect } from 'vitest';
import { PRESETS } from '../src/model/presets/songs';
import { presetToState } from '../src/model/presetAdapter';
import { defaultState } from '../src/model/defaults';
import { evaluerStyle, ficheStyle, FICHES, type FicheStyle } from '../src/model/styles';
import { evaluerCommande, dansLeStyleFiche, pasUnPresetCharge } from '../src/model/commande';
import type { PatternStateV2 } from '../src/model/types';

function etatDuPreset(id: string): PatternStateV2 {
  return presetToState(PRESETS.find((p) => p.id === id)!, undefined, false);
}

/* ---- LE CALIBRAGE ------------------------------------------------------
 *
 * Une fiche de style n'est pas défendable parce qu'elle a l'air juste : elle
 * l'est parce qu'elle reconnaît son propre genre et refuse les autres, avec
 * une MARGE. Même exigence que `ecartMini` dans `parametres.ts` — une
 * question dont la réponse se joue à un critère près est un tirage au sort.
 */
describe('la fiche de style reconnaît son genre, et pas les autres', () => {
  it('accepte le preset du genre, sur tous ses critères', () => {
    for (const f of FICHES) {
      const v = evaluerStyle(etatDuPreset(f.id), f);
      expect(v.faits, `${f.id} ne satisfait pas sa propre fiche`).toBe(v.total);
      expect(v.atteint).toBe(true);
    }
  });

  it('refuse les 33 autres presets, avec au moins deux critères d’écart', () => {
    for (const f of FICHES) {
      const autres = PRESETS.filter((p) => p.id !== f.id).map((p) => ({
        id: p.id,
        v: evaluerStyle(etatDuPreset(p.id), f),
      }));
      for (const a of autres) {
        expect(a.v.atteint, `${a.id} passe pour du ${f.id}`).toBe(false);
      }
      // La marge : le meilleur des autres genres doit rester nettement en
      // dessous. Mesuré le 2026-08-26 sur dancehall — 6/6 contre 4/6 pour le
      // suivant (house, hardhouse, amapiano, tous en four-on-the-floor, ce
      // qui explique qu'ils soient les plus proches).
      const meilleurAutre = Math.max(...autres.map((a) => a.v.faits));
      expect(
        f.criteres.length - meilleurAutre,
        `${f.id} : le genre le plus proche n’est qu’à ${f.criteres.length - meilleurAutre} critère(s)`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('refuse le motif de départ de l’Atelier', () => {
    // `defaultState()` est du Motown (voir `pasLeMotifDeDepart`) : si une
    // fiche l'acceptait, entrer dans l'Atelier et en ressortir suffirait.
    for (const f of FICHES) {
      expect(evaluerStyle(defaultState(), f).atteint, f.id).toBe(false);
    }
  });
});

/* ---- LA TOLÉRANCE ------------------------------------------------------ */
describe('le seuil laisse de la place, mais pas n’importe où', () => {
  const dancehall = ficheStyle('dancehall')!;

  it('accepte un morceau à qui il manque un critère non essentiel', () => {
    // Le tempo est le plus facile à rater sans cesser de sonner dancehall.
    const st = etatDuPreset('dancehall');
    st.tempo = 120;
    const v = evaluerStyle(st, dancehall);
    expect(v.faits).toBe(v.total - 1);
    expect(v.atteint, 'un critère manquant sur six devrait passer').toBe(true);
  });

  it('refuse dès qu’il en manque deux', () => {
    // Deux critères NON essentiels : c'est bien le seuil qui refuse, pas la
    // garde des essentiels — sinon ce test ne mesurerait pas ce qu'il croit.
    const st = etatDuPreset('dancehall');
    st.tempo = 120;
    st.rows.snare.pattern[2] = 1 as never; // le pop est là, mais plus en rim shot
    const v = evaluerStyle(st, dancehall);
    expect(v.essentielManquant).toBeNull();
    expect(v.atteint).toBe(false);
  });

  it('refuse toujours quand c’est l’ESSENTIEL qui manque, même au-dessus du seuil', () => {
    // Le kick « steppers » est ce qui donne son nom au riddim : un dancehall
    // sans lui n'est pas un dancehall à 83 %, c'est autre chose. Sans le
    // champ `essentiel`, ce morceau passerait — 5 critères sur 6.
    const st = etatDuPreset('dancehall');
    st.rows.kick.pattern[2] = 0 as never;
    const v = evaluerStyle(st, dancehall);
    expect(v.part).toBeGreaterThanOrEqual(dancehall.seuil);
    expect(v.essentielManquant?.id).toBe('kick-steppers');
    expect(v.atteint).toBe(false);
  });

  it('vaut quelle que soit la subdivision choisie par le joueur', () => {
    // Un critère se lit en TEMPS, pas en cases : « sur chaque temps » doit
    // valoir en subdiv 4 comme en subdiv 16, sinon il faudrait l'écrire trois
    // fois et le joueur serait puni d'avoir choisi une grille plus fine.
    const st = etatDuPreset('dancehall');
    const k = st.rows.kick;
    k.subdiv = 16;
    k.pattern = new Array(16).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)) as never;
    expect(evaluerStyle(st, dancehall).lignes.find((l) => l.critere.id === 'kick-steppers')?.ok).toBe(
      true,
    );
  });
});

/* ---- LE VERROU DES PRESETS --------------------------------------------- */
describe('le verrou des presets', () => {
  const dancehall = ficheStyle('dancehall')!;
  const cahier = [pasUnPresetCharge(), dansLeStyleFiche(dancehall)];

  it('refuse le preset chargé tel quel — le défaut mesuré du 2026-08-26', () => {
    // Avant ce verrou : ouvrir le menu, charger « Dancehall », livrer, accepté.
    const v = evaluerCommande(etatDuPreset('dancehall'), cahier, { presetCharge: 'dancehall' });
    expect(v.accepte).toBe(false);
    expect(v.lignes.find((l) => l.contrainte.id === 'pas-un-preset')?.ok).toBe(false);
  });

  it('accepte le MÊME morceau s’il a été fait à la main', () => {
    // C'est la nuance qui compte : on refuse une PROVENANCE, pas une
    // ressemblance. Suivre la fiche honnêtement — kick sur chaque temps, rim
    // shot sur 2 et 4, skank au charley — mène tout droit à cette grille-là.
    // La punir reviendrait à punir le joueur d'avoir bien travaillé.
    const v = evaluerCommande(etatDuPreset('dancehall'), cahier, { presetCharge: null });
    expect(v.accepte).toBe(true);
  });
});

/* ---- CE QUE LE JOUEUR LIT ---------------------------------------------- */
describe('la fiche se lit autant qu’elle juge', () => {
  it('donne le détail critère par critère, pour savoir quoi changer', () => {
    const f = ficheStyle('dancehall')!;
    const c = dansLeStyleFiche(f);
    const details = c.details!(defaultState());
    expect(details).toHaveLength(f.criteres.length);
    expect(details.every((d) => d.libelle.length > 0)).toBe(true);
    // L'essentiel se signale dans son libellé : le joueur doit savoir que
    // celui-là ne se rattrape pas.
    expect(details.find((d) => d.id === 'kick-steppers')?.libelle).toContain('sans ça');
  });

  it('a un chapeau qui décrit le genre avant qu’on commence', () => {
    for (const f of FICHES) {
      expect(f.chapeau.length, `${f.id} n’a pas de description`).toBeGreaterThan(0);
      expect(f.chapeau.join(' ').length).toBeGreaterThan(60);
    }
  });

  it('décrit un genre qui a un preset — la fiche ne s’invente pas un style', () => {
    for (const f of FICHES) {
      expect(PRESETS.some((p) => p.id === f.id), `${f.id} n’existe pas dans les presets`).toBe(true);
    }
  });

  it('garde un seuil qui laisse passer exactement un oubli', () => {
    // Un seuil réglable par fiche, mais qui doit rester interprétable : au
    // moins un critère de marge, jamais au point d'en pardonner la moitié.
    for (const f of FICHES as FicheStyle[]) {
      const manquesTolérés = f.criteres.length - Math.ceil(f.seuil * f.criteres.length);
      expect(manquesTolérés, `${f.id} : aucune tolérance`).toBeGreaterThanOrEqual(1);
      expect(manquesTolérés, `${f.id} : trop permissif`).toBeLessThanOrEqual(2);
    }
  });
});

/* ---------------------------------------------------------------------------
 * UN CRITÈRE DE PLACEMENT DOIT ÊTRE JOUABLE À LA LECTURE
 *
 * ⚠️ Trouvé par un joueur, pas par un test (Yann, 2026-09-04) : *« "La réponse
 * juste après le temps 2" dans le riddim, je ne trouve pas la soluce »*. Deux
 * défauts mécaniques derrière cette phrase — donc tenables ici plutôt qu'à la
 * relecture, où ils ne se voient pas : un libellé se relit très bien en croyant
 * qu'il décrit ce qu'il exige.
 *
 * ⚠️ Les deux tests RASSEMBLENT leurs infractions avant d'affirmer. Écrits avec
 * un `expect` dans la boucle, ils s'arrêtaient à la première et cachaient les
 * suivantes : c'est comme ça que le critère du skank est passé inaperçu au
 * premier jet.
 * ------------------------------------------------------------------------- */
describe('un critère de placement dit tout ce qu’il exige', () => {
  /* Un critère COMPAGNON reprend les temps de celui qui le précède — « Ce
   * pop-là est sec — en rim shot » ne redécrit pas où tombe le pop, il ajoute
   * une exigence sur les mêmes frappes. Sa description est la ligne du dessus,
   * et l'exiger complet ferait écrire deux fois la même phrase à l'écran. */
  const placements = FICHES.flatMap((f) =>
    f.criteres.map((c, i) => {
      const avant = f.criteres[i - 1];
      const compagnon =
        c.temps !== undefined &&
        avant?.temps !== undefined &&
        JSON.stringify(avant.temps) === JSON.stringify(c.temps);
      return { fiche: f.id, c, compagnon };
    }).filter((x) => x.c.temps !== undefined),
  );

  it('il y en a, et le compte n’est pas vide', () => {
    // Le garde-fou qui empêche les deux suivants de devenir décoratifs le jour
    // où les fiches changeraient de primitive.
    expect(placements.length).toBeGreaterThan(8);
    expect(placements.filter((p) => !p.compagnon).length).toBeGreaterThan(5);
  });

  /* ⚠️ La vérification est un `every` : un critère écrit `[1, 1.75]` exige DEUX
   * frappes. Un libellé au singulier en annonce une — le joueur pose celle
   * qu'il lit, et la case reste vide sans rien dire de plus. */
  it('un critère qui demande plusieurs frappes ne les annonce pas au singulier', () => {
    const fautifs = placements
      .filter(({ c, compagnon }) => !compagnon && c.temps!.length >= 2)
      .filter(({ c }) => !/\b(les|deux|trois|quatre|chaque|tous|toutes|et|puis)\b/i.test(c.libelle))
      .map(({ fiche, c }) => `${fiche} — « ${c.libelle} » (${c.temps!.length} frappes)`);
    expect(fautifs, 'un libellé au singulier pour plusieurs frappes').toEqual([]);
  });

  /* ⚠️ ET LE PIÈGE QUI A COÛTÉ LA PARTIE : `pasDuTemps` rend `null` quand
   * `temps × subdiv / 4` n'est pas entier. Le temps 1,75 n'existe donc QUE sur
   * une ligne en doubles-croches — à la subdivision par défaut, la case n'est
   * pas à l'écran et le critère est IMPOSSIBLE, en silence. Un critère qui
   * réclame une résolution doit la nommer. */
  it('⚠️ un placement hors de la croche annonce sa résolution', () => {
    const surLaCroche = (t: number) => Number.isInteger((t * 8) / 4);
    const fautifs = placements
      .filter(({ c, compagnon }) => !compagnon && !c.temps!.every(surLaCroche))
      .filter(({ c }) => !/double|seizi|16/i.test(c.libelle))
      .map(({ fiche, c }) => `${fiche} — « ${c.libelle} »`);
    expect(fautifs, 'un placement entre les croches sans dire qu’il en faut').toEqual([]);
  });
});
