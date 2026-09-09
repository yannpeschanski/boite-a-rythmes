/* LE CURSEUR MOMENTANÉ — et la seule chose qui le rend sûr.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Un maintenu qui ne sait pas revenir laisse le
 * morceau là où le doigt l'a lâché, et un doigt glisse. C'est la règle des
 * MAINTENUS depuis toujours (« chaque entrée porte son ALLER *et* son
 * RETOUR ») ; le curseur momentané du 2026-09-09 l'étend aux AXES, donc à
 * quarante-deux entrées générées, où une faute de frappe ne se voit pas à la
 * relecture.
 *
 * L'invariant tenu ici : **le repos touche EXACTEMENT ce que l'aller a
 * touché.** Un `repos` qui efface le mauvais champ ne se verrait ni au type ni
 * à l'écran — le réglage resterait simplement coincé après le relâché, et on
 * chercherait du côté du geste.
 */
import { describe, it, expect } from 'vitest';
import { LIVE_ACTIONS, LIVE_AXES } from '../src/ui/live/liveActions';
import { defaultState } from '../src/model/defaults';
import type { AudioEngine } from '../src/engine/AudioEngine';

type Appel = { methode: string; args: unknown[] };

/** Un moteur qui n'exécute rien et note tout — aucun contexte audio requis. */
function moteurEspion(): { engine: AudioEngine; appels: Appel[] } {
  const appels: Appel[] = [];
  const engine = new Proxy(
    {},
    {
      get: (_c, methode: string) => (...args: unknown[]) => {
        appels.push({ methode, args });
      },
    },
  ) as unknown as AudioEngine;
  return { engine, appels };
}

/* La CIBLE d'un appel : la méthode, plus ses arguments non numériques (le nom
   de ligne, la clé de champ). On laisse tomber la valeur elle-même — c'est
   justement ce que l'aller et le retour n'ont PAS en commun. */
function cibles(appels: Appel[]): string[] {
  return appels.map((a) => [a.methode.replace(/^(set|clear)Live/, ''), ...a.args.filter((x) => typeof x === 'string')].join(':'));
}

describe('le curseur momentané rend le réglage au morceau', () => {
  it('donne un retour au repos à chaque axe', () => {
    for (const axe of LIVE_AXES) expect(axe.repos, axe.id).toBeTypeOf('function');
  });

  it('ne touche au repos QUE ce que l’aller a touché', () => {
    const base = defaultState();
    for (const axe of LIVE_AXES) {
      const aller = moteurEspion();
      axe.apply(aller.engine, 0.8);
      const retour = moteurEspion();
      axe.repos!(retour.engine, base);

      // Le repos agit : un `repos` muet laisserait le réglage coincé.
      expect(retour.appels.length, `${axe.id} — repos muet`).toBeGreaterThan(0);
      // Et il vise les mêmes champs, sur les mêmes lignes.
      expect(cibles(retour.appels).sort(), axe.id).toEqual(cibles(aller.appels).sort());
    }
  });

  /* ⚠️ LE RETOUR RELIT LE MORCEAU, IL NE GRAVE PAS UNE VALEUR. Là où l'axe
     passe par un override du moteur, le repos l'EFFACE — la couche du dessous
     redevient visible, quelle qu'elle soit. Écrire `base.swing` marcherait
     aujourd'hui et serait faux au premier changement de scène, qui réécrit le
     mix sous le doigt. */
  it('efface l’override plutôt que d’y réécrire une valeur', () => {
    const base = defaultState();
    for (const axe of LIVE_AXES) {
      const aller = moteurEspion();
      axe.apply(aller.engine, 0.8);
      const parOverride = aller.appels.every((a) => /^setLive(Groove|Drum|SynthVoice|SynthRow)Param$/.test(a.methode));
      if (!parOverride) continue;
      const retour = moteurEspion();
      axe.repos!(retour.engine, base);
      for (const a of retour.appels) expect(a.methode, axe.id).toMatch(/^clearLive/);
    }
  });

  /* ⚠️ LES ENVOIS NE REVIENNENT PAS À ZÉRO, ILS REVIENNENT AU MORCEAU.
     Un envoi de réverbe est un NŒUD du graphe, pas un override : son repos ne
     peut pas « effacer une couche », il doit relire ce que la ligne envoyait.
     Le lâcher à zéro assécherait une ligne que le morceau voulait mouillée —
     c'est la même faute que rouvrir un filtre « à 20 kHz ». */
  it('rend un envoi de ligne à ce que le morceau envoyait', () => {
    const base = defaultState();
    base.rows.kick.reverbSend = 0.35;
    base.synthRows.pad.delaySend = 0.6;
    const lire = (id: string) => {
      const e = moteurEspion();
      LIVE_AXES.find((a) => a.id === id)!.repos!(e.engine, base);
      return e.appels[0].args;
    };
    expect(lire('reverb-kick')).toEqual(['kick', 'reverb', 0.35]);
    expect(lire('delay-pad')).toEqual(['pad', 'delay', 0.6]);
  });

  /* Les deux macros historiques n'ont pas d'override : leurs nœuds (liveFilter,
     liveReverbSend) sont toujours neutres ailleurs, donc leur repos EST le
     neutre — exactement ce que faisaient déjà les maintenus FILTRE et RÉVERBE.
     Les traitements de bus, eux, relisent le morceau. */
  it('rend les nœuds dédiés au neutre et les bus au morceau', () => {
    const base = defaultState();
    base.globalSaturation = 42;
    const lire = (id: string) => {
      const e = moteurEspion();
      LIVE_AXES.find((a) => a.id === id)!.repos!(e.engine, base);
      return e.appels[0];
    };
    expect(lire('filter').args[0]).toBe(20000);
    expect(lire('reverb').args[0]).toBe(0);
    expect(lire('saturation').args[0]).toBeCloseTo(0.42, 5);
  });
});

/* ---- LE RETOUR DES ACTIONS QUI LATCHENT ----
 *
 * ⚠️ Yann, après test : « quand on bascule un paramètre — exemple :
 * arpégiateur — il faut qu'on puisse revenir comme c'était avant d'une manière
 * ou d'une autre. » Un `hold` sait revenir : son relâché EST son retour. Une
 * BASCULE ou un PAS, non — ils laissent le morceau dans l'état où le dernier
 * appui l'a mis, et réassigner le bouton abandonnait ce réglage sans plus
 * aucune commande pour le défaire. Un cul-de-sac qu'on ne voit qu'en jouant.
 */
describe('une action qui latche sait revenir au morceau', () => {
  const LATCHENT = ['toggle', 'step'];

  it('donne un retour à toute bascule et à tout pas', () => {
    for (const a of LIVE_ACTIONS) {
      if (!LATCHENT.includes(a.kind)) continue;
      expect(a.repos, `${a.id} latche et ne sait pas revenir`).toBeTypeOf('function');
    }
  });

  /* ⚠️ Et l'inverse : un DÉCLENCHEUR ou un MAINTENU n'a pas à en porter. Un
     `repos` sur un `hold` voudrait dire deux chemins de retour pour le même
     geste — celui du relâché et celui-ci — donc deux vérités à garder
     d'accord. Le compte est là exprès : si la population des `latchent`
     devenait vide, ce test passerait sans plus rien protéger. */
  it('n’en donne pas à ce qui ne latche rien, et la population n’est pas vide', () => {
    const latchent = LIVE_ACTIONS.filter((a) => LATCHENT.includes(a.kind));
    expect(latchent.length).toBeGreaterThan(0);
    for (const a of LIVE_ACTIONS) {
      if (LATCHENT.includes(a.kind)) continue;
      expect(a.repos, `${a.id} ne latche rien mais porte un repos`).toBeUndefined();
    }
  });

  it('rend le MODE NAPPE au morceau plutôt qu’au « normal » du moteur', () => {
    const e = moteurEspion();
    LIVE_ACTIONS.find((a) => a.id === 'step-pad-mode')!.repos!(e.engine, defaultState());
    /* ⚠️ Le cycle boucle, mais il ne ramène pas au morceau : il ramène au
       « normal » du moteur, faux si la lettre chargée jouait un arpège.
       Effacer l'override est le seul retour qui relise le morceau. */
    expect(e.appels.map((a) => a.methode)).toEqual(['clearLivePadMode']);
  });

  it('rend les coupures au motif, jamais forcées ouvertes', () => {
    for (const id of ['mute-drums', 'mute-synth']) {
      const e = moteurEspion();
      LIVE_ACTIONS.find((a) => a.id === id)!.repos!(e.engine, defaultState());
      expect(e.appels.length, id).toBeGreaterThan(0);
      // `null` = suivre le motif : une ligne coupée dans l'Atelier le reste.
      for (const a of e.appels) expect(a.args[1], id).toBeNull();
    }
  });
});
