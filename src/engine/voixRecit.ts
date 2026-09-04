/* LES VOIX DU RÉCIT — un son par personnage, pendant que son texte se tape.
 *
 * Idée de Yann (2026-09-03) : *« on pourrait donner des voix aux personnages,
 * exemple : Sol fait un bruit de charley. Le texte off fait un bruit de machine
 * à écrire. »*
 *
 * ⚠️ Ce ne sont pas des voix : ce sont des PERCUSSIONS. Le jeu est une boîte à
 * rythmes ; faire parler ses personnages avec les sons de son propre kit coûte
 * six enveloppes et dit qui parle même les yeux fermés. Un échantillon de voix
 * aurait coûté des fichiers, un chargement, et aurait parlé une autre langue
 * que le reste de l'application.
 *
 * ⚠️ Module PUR, comme le reste de `engine/` : il reçoit un `BaseAudioContext`
 * et une destination, il ne connaît ni le DOM, ni Svelte, ni le réglage
 * activé/désactivé (c'est `ui/game/voix.ts` qui tient tout ça). Il ne connaît
 * pas non plus les personnages — seulement des TIMBRES : qui a quelle voix est
 * une décision de récit, elle vit dans `model/locuteurs.ts`.
 *
 * ⚠️ Les HAUTEURS passent par un `rng` injecté (CLAUDE.md) ; les OCTETS du
 * tampon de bruit, non — même exception que `graph.ts`, et pour la même
 * raison : semer un tampon de bruit ne rend rien de reproductible que personne
 * ne regarde.
 */
import type { TimbreVoix } from '../model/locuteurs';

/* Un tampon de bruit blanc par contexte, fabriqué à la demande. Court : ces
 * sons durent quelques dizaines de millisecondes, et on y entre à un décalage
 * tiré au sort pour que deux clics de suite ne soient pas le même. */
const BRUITS = new WeakMap<BaseAudioContext, AudioBuffer>();

function bruit(ctx: BaseAudioContext): AudioBuffer {
  let buf = BRUITS.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    BRUITS.set(ctx, buf);
  }
  return buf;
}

/** Une enveloppe percussive : montée de 2 ms (jamais 0 — un saut de gain
 *  claque), puis chute exponentielle. Même forme que le kit du séquenceur. */
function enveloppe(ctx: BaseAudioContext, t: number, pic: number, duree: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pic, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  return g;
}

function source(ctx: BaseAudioContext, t: number, duree: number, rng: () => number): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = bruit(ctx);
  s.start(t, rng() * 0.3, duree + 0.02);
  s.stop(t + duree + 0.02);
  return s;
}

function filtre(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** ±6 % de hauteur : deux frappes de suite ne sont jamais tout à fait la même. */
function jitter(f: number, rng: () => number): number {
  return f * (0.94 + rng() * 0.12);
}

/* Les six timbres. Les niveaux sont bas et NON négociables à la hausse : ces
 * sons partent jusqu'à vingt fois par seconde sous le texte, ils accompagnent
 * la lecture — ils ne la couvrent pas. */
type Frappe = (ctx: BaseAudioContext, dest: AudioNode, t: number, rng: () => number) => void;

const FRAPPES: Record<TimbreVoix, Frappe> = {
  /* La machine à écrire : un claquement de barre (bruit dans une bande
   * étroite) doublé d'un petit choc de chariot très court dans le bas. */
  machine: (ctx, dest, t, rng) => {
    const g = enveloppe(ctx, t, 0.09, 0.018);
    const f = filtre(ctx, 'bandpass', jitter(2100, rng), 1.4);
    source(ctx, t, 0.018, rng).connect(f).connect(g).connect(dest);
    const bas = ctx.createOscillator();
    bas.type = 'triangle';
    bas.frequency.setValueAtTime(jitter(190, rng), t);
    const gb = enveloppe(ctx, t, 0.03, 0.02);
    bas.connect(gb).connect(dest);
    bas.start(t);
    bas.stop(t + 0.03);
  },
  /* SOL — le charley fermé : bruit très haut, chute immédiate. C'est le son le
   * plus sec du kit, celui qui compte le temps sans prendre la place. */
  charley: (ctx, dest, t, rng) => {
    const g = enveloppe(ctx, t, 0.07, 0.032);
    const hp = filtre(ctx, 'highpass', 7200, 0.8);
    source(ctx, t, 0.032, rng).connect(hp).connect(g).connect(dest);
  },
  /* KELVIN — le rim shot : le bord, pas la peau. Un bois bref avec une pointe
   * de bruit ; c'est exactement le geste qu'il fait sur la table. */
  rimshot: (ctx, dest, t, rng) => {
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(jitter(420, rng), t);
    o.connect(enveloppe(ctx, t, 0.06, 0.025)).connect(dest);
    o.start(t);
    o.stop(t + 0.04);
    const hp = filtre(ctx, 'highpass', 3000, 0.7);
    source(ctx, t, 0.012, rng).connect(hp).connect(enveloppe(ctx, t, 0.05, 0.012)).connect(dest);
  },
  /* TOI (et le nouveau stagiaire) — un tom grave qui descend. On répond, on
   * n'explique pas : c'est la voix la plus courte du récit. */
  tom: (ctx, dest, t, rng) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(jitter(150, rng), t);
    o.frequency.exponentialRampToValueAtTime(jitter(88, rng), t + 0.09);
    o.connect(enveloppe(ctx, t, 0.11, 0.09)).connect(dest);
    o.start(t);
    o.stop(t + 0.12);
  },
  /* RACHID — un bois chaud et rond, qui ne coupe pas. */
  clave: (ctx, dest, t, rng) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(jitter(1250, rng), t);
    o.connect(enveloppe(ctx, t, 0.05, 0.045)).connect(dest);
    o.start(t);
    o.stop(t + 0.06);
  },
  /* LE TUNNEL — il ne parle qu'au téléphone : deux fréquences serrées dans une
   * bande étroite, ce qu'un combiné laisse passer et rien d'autre. */
  telephone: (ctx, dest, t, rng) => {
    const bp = filtre(ctx, 'bandpass', 1100, 3);
    const g = enveloppe(ctx, t, 0.05, 0.035);
    bp.connect(g).connect(dest);
    for (const f of [941, 1336]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(jitter(f, rng), t);
      o.connect(bp);
      o.start(t);
      o.stop(t + 0.05);
    }
  },
};

/** Une frappe de voix, à l'instant `t` du contexte. */
export function jouerVoix(
  ctx: BaseAudioContext,
  dest: AudioNode,
  timbre: TimbreVoix,
  t: number,
  rng: () => number,
): void {
  FRAPPES[timbre](ctx, dest, t, rng);
}
