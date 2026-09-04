/* QUI PARLE — le contrat entre le récit et ses voix.
 *
 * Le récit marquait ses répliques d'un tiret cadratin et de rien d'autre : deux
 * personnes, un seul signe, et le lecteur qui déduit l'alternance. Ce fichier
 * tient la règle qui remplace la déduction — *une réplique porte son nom* — et
 * les deux façons de la perdre en silence : un nom qui n'est pas au catalogue
 * (la ligne redevient de la narration, sans erreur), et un texte en capitales
 * qu'on prendrait pour un nom.
 */
import { describe, it, expect } from 'vitest';
import { ACTES, EPILOGUE, type Etape } from '../src/model/carriere';
import { LOCUTEURS, analyserLigne, analyserRecit, timbreDe } from '../src/model/locuteurs';

/** Toutes les lignes de texte du récit, épilogue compris. */
function toutesLesLignes(): string[] {
  const etapes: Etape[] = [...ACTES.flatMap((a) => a.etapes), ...EPILOGUE];
  return etapes.flatMap((e) => {
    if (e.kind === 'exercice') return e.commande ? [e.commande] : [];
    const l = [...e.lignes];
    if (e.kind === 'commande') l.push(e.accepte);
    return l;
  });
}

describe('les locuteurs — la lecture d’une ligne', () => {
  it('lit le nom, et rend le texte sans son préfixe', () => {
    const d = analyserLigne('SOL: Je vais vendre.');
    expect(d.qui?.nom).toBe('SOL');
    expect(d.texte).toBe('Je vais vendre.');
  });

  it('laisse la narration en texte off', () => {
    const d = analyserLigne('Sol essaie trois fois. Il ne répond plus.');
    expect(d.qui).toBeNull();
    expect(timbreDe(d)).toBe('machine');
  });

  /* ⚠️ Le catalogue est FERMÉ. Sans ça, « FACE B — FB-015 » ou le fax de
   * Zik'Mobile deviendraient les répliques d'un personnage nommé « FACE » ou
   * « HIP-HOP », et personne ne le verrait : ça s'afficherait. */
  it('ne prend pas un texte en capitales pour un nom', () => {
    for (const l of ['FACE B — FB-015', 'HIP-HOP AUTHENTIQUE — CLUB ÉNERGIE', 'TAPEZ FACEB AU 61000.']) {
      expect(analyserLigne(l).qui, l).toBeNull();
    }
  });

  /* ⚠️ Le nom ne se répète pas d'une ligne à l'autre : une réplique de Sol
   * tient souvent sur trois lignes, et trois « SOL » d'affilée font une colonne
   * de bruit. Il revient dès que quelqu'un d'autre — la narration comprise — a
   * pris la parole entre-temps. */
  it('n’affiche le nom que quand il change', () => {
    const vus = analyserRecit([
      'SOL: Parce que je ne vais quand même pas',
      'SOL: ne rien faire jusqu’en juin.',
      'Elle range le chèque.',
      'SOL: C’est pas beaucoup, mais ça compte.',
    ]).map((l) => l.montrerNom);
    expect(vus).toEqual([true, false, false, true]);
  });
});

describe('les locuteurs — le récit', () => {
  /* ⚠️ LA règle : une réplique porte son nom. Une ligne qui commence encore par
   * un tiret est une réplique que le jeu affichera sans dire qui parle — c'est
   * exactement le défaut qu'on vient de corriger, et il se réintroduirait en
   * écrivant un écran de plus à l'ancienne. */
  it('aucune réplique ne reste anonyme', () => {
    const orphelines = toutesLesLignes().filter((l) => l.startsWith('—'));
    expect(orphelines).toEqual([]);
  });

  it('chaque ligne attribuée nomme un locuteur du catalogue', () => {
    // Un préfixe en capitales suivi de « : » qui ne serait pas au catalogue
    // s'afficherait tel quel, en clair, dans le texte de l'écran.
    const suspectes = toutesLesLignes().filter(
      (l) => /^[A-ZÀ-Ý][A-ZÀ-Ý' ’]{1,14}: /.test(l) && analyserLigne(l).qui === null,
    );
    expect(suspectes).toEqual([]);
  });

  /* ⚠️ Une voix que personne n'a n'existe pas. Le catalogue porte un timbre par
   * personnage ; un personnage qui ne parle nulle part est un son qu'on
   * entretient pour rien — et le signe qu'une réplique a changé de main. */
  it('chaque locuteur du catalogue parle au moins une fois', () => {
    const dits = new Set(toutesLesLignes().map((l) => analyserLigne(l).qui?.nom));
    for (const q of LOCUTEURS) expect(dits.has(q.nom), q.nom).toBe(true);
  });

  /* Sol porte presque tout le récit : si elle cessait d'être majoritaire, c'est
   * qu'une attribution en masse serait partie chez quelqu'un d'autre. */
  it('Sol porte la majorité des répliques', () => {
    const repliques = toutesLesLignes().map((l) => analyserLigne(l).qui).filter((q) => q !== null);
    const sol = repliques.filter((q) => q!.nom === 'SOL');
    expect(repliques.length).toBeGreaterThan(100);
    expect(sol.length / repliques.length).toBeGreaterThan(0.5);
  });
});
