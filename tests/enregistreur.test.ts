/* L'ENREGISTREUR — devenu la seule sortie audio d'un morceau.
 *
 * ⚠️ POURQUOI CE FICHIER EXISTE. Tant que ⏺ était une commodité, son coût
 * mémoire n'intéressait personne. Depuis que l'export hors ligne d'un morceau
 * est écarté (arbitrage de Yann : sans automation, un rendu produirait une
 * version morte), c'est le SEUL moyen de sortir un morceau de l'appli — et il
 * accumulait des `Float32Array` puis les fusionnait, soit 256 Mo de pic pour
 * dix minutes, sur le fil principal d'un téléphone.
 *
 * Ce qu'on vérifie ici est l'écriture WAV, qui est la partie pure. Le tampon
 * qui grandit par paliers vit dans `LiveRecorder`, qui a besoin d'un
 * AudioWorklet — mesuré dans le navigateur, pas ici.
 */
import { describe, it, expect } from 'vitest';
import { versInt16, enteteWav, wavDepuisInt16 } from '../src/engine/render-offline';

describe('versInt16 — la conversion vers le format du fichier', () => {
  it('mappe la plage SIGNÉE, qui est asymétrique', () => {
    // −32768 d'un côté, +32767 de l'autre : utiliser 0x7fff des deux côtés
    // perdrait un demi-bit en bas, utiliser 0x8000 des deux écrêterait en haut.
    expect(versInt16(-1)).toBe(-32768);
    expect(versInt16(1)).toBe(32767);
    expect(versInt16(0)).toBe(0);
  });

  it('écrête au lieu de replier — un dépassement ne doit pas changer de signe', () => {
    expect(versInt16(2)).toBe(32767);
    expect(versInt16(-2)).toBe(-32768);
  });
});

describe('l’en-tête WAV — une seule définition pour les deux chemins', () => {
  const lire = (b: ArrayBuffer) => {
    const v = new DataView(b);
    const str = (o: number, n: number) =>
      String.fromCharCode(...Array.from({ length: n }, (_, i) => v.getUint8(o + i)));
    return {
      riff: str(0, 4),
      wave: str(8, 4),
      fmt: str(12, 4),
      data: str(36, 4),
      canaux: v.getUint16(22, true),
      bits: v.getUint16(34, true),
      sampleRate: v.getUint32(24, true),
      tailleDonnees: v.getUint32(40, true),
      tailleRiff: v.getUint32(4, true),
    };
  };

  it('décrit bien un PCM 16 bits mono', () => {
    const h = lire(enteteWav(1000, 48000));
    expect(h.riff).toBe('RIFF');
    expect(h.wave).toBe('WAVE');
    expect(h.fmt).toBe('fmt ');
    expect(h.data).toBe('data');
    expect(h.canaux).toBe(1);
    expect(h.bits).toBe(16);
    expect(h.sampleRate).toBe(48000);
  });

  it('annonce des tailles cohérentes avec le contenu', () => {
    /* Une taille fausse dans l'en-tête donne un fichier que la moitié des
       lecteurs ouvre quand même, tronqué — le genre de défaut qu'on ne voit
       qu'en écoutant la fin. */
    const h = lire(enteteWav(1000, 44100));
    expect(h.tailleDonnees).toBe(2000);
    expect(h.tailleRiff).toBe(36 + 2000);
  });

  it('fait 44 octets — ni plus, ni moins', () => {
    expect(enteteWav(0, 44100).byteLength).toBe(44);
  });
});

describe('wavDepuisInt16 — le WAV se pose sur ce qui est déjà écrit', () => {
  it('rend un blob de la bonne taille', async () => {
    const pcm = new Int16Array([0, 1000, -1000, 32767]);
    const blob = wavDepuisInt16(pcm, 44100);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 4 * 2);
  });

  /* ⚠️ LE PIÈGE QUE CE TEST GARDE. L'enregistreur passe une SOUS-VUE de son
     tampon (`subarray`), parce que le tampon est alloué par paliers et donc
     plus grand que ce qui est écrit. Emporter le tampon entier livrerait
     jusqu'à trente secondes de silence à la fin de chaque prise. */
  it('n’emporte que la portion écrite d’une sous-vue', async () => {
    const tampon = new Int16Array(1000); // alloué large, 4 échantillons écrits
    tampon.set([0, 1000, -1000, 32767], 0);
    const blob = wavDepuisInt16(tampon.subarray(0, 4), 44100);
    expect(blob.size).toBe(44 + 4 * 2);
    const octets = new Int16Array(await blob.arrayBuffer(), 44);
    expect(Array.from(octets)).toEqual([0, 1000, -1000, 32767]);
  });
});
