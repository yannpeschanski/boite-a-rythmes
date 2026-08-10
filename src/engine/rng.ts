// PRNG déterministe (mulberry32) — utilisé par l'export offline pour que deux
// exports du même rythme produisent exactement le même fichier (ghost notes et
// rafales spontanées identiques à chaque export), au lieu de varier à chaque
// clic comme en lecture live.
export type Rng = () => number;

export function makeSeededRng(seed: number): Rng {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
