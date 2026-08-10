// Undo / redo — quasi gratuit une fois l'état sérialisable : on empile des
// snapshots. Absent de l'original (aucun moyen d'annuler une fausse
// manœuvre). Les rafales de modifications rapprochées (glissé de curseur)
// sont fusionnées pour ne pas saturer la pile d'états intermédiaires.
import { pattern } from './pattern.svelte';
import type { PatternStateV2 } from '../model/types';

const MAX_ENTRIES = 100;
const COALESCE_MS = 400;

class HistoryStore {
  private past: PatternStateV2[] = [];
  private future: PatternStateV2[] = [];
  private lastPush = 0;
  private applying = false;

  canUndo = $state(false);
  canRedo = $state(false);

  private sync(): void {
    this.canUndo = this.past.length > 0;
    this.canRedo = this.future.length > 0;
  }

  // À appeler AVANT une modification.
  push(): void {
    if (this.applying) return;
    const now = performance.now();
    if (now - this.lastPush < COALESCE_MS && this.past.length) {
      this.lastPush = now;
      return;
    }
    this.lastPush = now;
    this.past.push(pattern.snapshot());
    if (this.past.length > MAX_ENTRIES) this.past.shift();
    this.future = [];
    this.sync();
  }

  undo(): void {
    const prev = this.past.pop();
    if (!prev) return;
    this.applying = true;
    this.future.push(pattern.snapshot());
    pattern.replace(prev);
    this.applying = false;
    this.sync();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    this.applying = true;
    this.past.push(pattern.snapshot());
    pattern.replace(next);
    this.applying = false;
    this.sync();
  }

  reset(): void {
    this.past = [];
    this.future = [];
    this.sync();
  }
}

export const history = new HistoryStore();
