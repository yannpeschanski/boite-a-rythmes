// Store central — l'état v2 en runes Svelte 5. Remplace les ~60 globales et
// les 3 couches de sync sliders↔état de l'original : l'UI lit et écrit
// directement `pattern.state`, le moteur lit un snapshot à chaque tick.
import { defaultState } from '../model/defaults';
import { serializeState, deserializeState } from '../model/serialize';
import type { PatternStateV2 } from '../model/types';

class PatternStore {
  state = $state<PatternStateV2>(defaultState());

  // Snapshot plain-object pour le moteur (pas de proxy réactif côté audio).
  snapshot(): PatternStateV2 {
    return $state.snapshot(this.state) as PatternStateV2;
  }

  replace(next: PatternStateV2): void {
    this.state = next;
  }

  reset(): void {
    this.state = defaultState();
  }

  toJson(): string {
    return serializeState(this.snapshot());
  }

  loadJson(json: string | object): void {
    this.state = deserializeState(json);
  }
}

export const pattern = new PatternStore();
