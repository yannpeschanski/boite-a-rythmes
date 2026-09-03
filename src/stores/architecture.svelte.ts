/* L'architecture COURANTE — la chaîne de sections que la bande du Mode Live
 * joue. Voir `src/model/architecture.ts` pour le modèle et docs/plan/06 pour
 * l'étude.
 *
 * ⚠️ Ce n'est PAS de l'état de morceau : une architecture est une SET LIST,
 * pas un morceau. Elle ne rentre donc pas dans le format v2 — même domicile
 * que la banque de séquences (`localStorage`), et le contrat central n'est pas
 * touché. Le tempo non plus n'y est pas : il appartient au transport.
 */
import type { Architecture, Section } from '../model/architecture';
import { modeleFrais } from '../model/architecture';

const KEY = 'boite-a-rythme:mode-live-architecture';

function valide(v: unknown): v is Architecture {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<Architecture>;
  return (
    typeof a.nom === 'string' &&
    Array.isArray(a.sections) &&
    a.sections.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.nom === 'string' &&
        typeof s.cycles === 'number' &&
        s.cycles > 0 &&
        (s.sequenceId === null || typeof s.sequenceId === 'string') &&
        (s.lignes === null || Array.isArray(s.lignes)),
    )
  );
}

function lire(): Architecture | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return valide(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function ecrire(a: Architecture | null): void {
  try {
    if (a === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* quota plein ou stockage refusé : l'architecture reste active pour la session */
  }
}

class ArchitectureStore {
  /* `null` = MONO-CYCLE, c'est-à-dire le comportement d'avant la bande : un
     seul motif qui tourne. C'est le défaut, et il ne migre rien — aucune
     sauvegarde existante ne change. */
  courante = $state<Architecture | null>(lire());

  chargerModele(nom: string): void {
    const a = modeleFrais(nom);
    if (!a) return;
    this.courante = a;
    ecrire(a);
  }

  effacer(): void {
    this.courante = null;
    ecrire(null);
  }

  /** Assigne une séquence de banque à une section (ou `null` : garder le motif). */
  poserSequence(index: number, sequenceId: string | null): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    a.sections[index] = { ...a.sections[index], sequenceId };
    ecrire($state.snapshot(a) as Architecture);
  }

  /** Change le nombre de tours d'une section — borné pour rester lisible. */
  poserCycles(index: number, cycles: number): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    a.sections[index] = { ...a.sections[index], cycles: Math.max(1, Math.min(32, Math.round(cycles))) };
    ecrire($state.snapshot(a) as Architecture);
  }

  get sections(): Section[] {
    return this.courante?.sections ?? [];
  }
}

export const architecture = new ArchitectureStore();
