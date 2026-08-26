// Store central — l'état v2 en runes Svelte 5. Remplace les ~60 globales et
// les 3 couches de sync sliders↔état de l'original : l'UI lit et écrit
// directement `pattern.state`, le moteur lit un snapshot à chaque tick.
import { defaultState } from '../model/defaults';
import { serializeState, deserializeState } from '../model/serialize';
import { empreinteEtat } from '../model/commande';
import type { PatternStateV2 } from '../model/types';

class PatternStore {
  state = $state<PatternStateV2>(defaultState());

  /* La PROVENANCE — d'où vient ce qu'il y a à l'écran.
   *
   * Sciemment hors du format v2 : c'est de l'état d'interface, il ne se
   * sérialise pas, ne passe pas dans l'historique et le moteur ne le lit
   * jamais (même domicile que `paramHints` ou `lastTouched`).
   *
   * Il n'y a pas de méthode de mutation à intercepter — l'UI écrit
   * directement dans `state` — donc la provenance ne peut pas être « effacée
   * au premier changement ». On garde à la place l'empreinte du moment du
   * chargement : tant qu'elle correspond, c'est le preset intact ; à la
   * première modification, elle ne correspond plus. Un morceau tapé à la main
   * qui tomberait sur la même grille n'a, lui, aucune empreinte enregistrée —
   * il n'est donc jamais pris pour un preset. */
  #charge: { id: string; empreinte: string } | null = null;

  /** À appeler quand un preset est chargé depuis le menu. */
  marquerPreset(id: string): void {
    this.#charge = { id, empreinte: empreinteEtat(this.state) };
  }

  /** L'identifiant du preset affiché TEL QUEL, ou `null` dès qu'on y touche. */
  get presetCharge(): string | null {
    const c = this.#charge;
    if (!c) return null;
    return empreinteEtat(this.state) === c.empreinte ? c.id : null;
  }

  // Snapshot plain-object pour le moteur (pas de proxy réactif côté audio).
  snapshot(): PatternStateV2 {
    return $state.snapshot(this.state) as PatternStateV2;
  }

  replace(next: PatternStateV2): void {
    this.state = next;
  }

  reset(): void {
    this.state = defaultState();
    this.#charge = null;
  }

  toJson(): string {
    return serializeState(this.snapshot());
  }

  loadJson(json: string | object): void {
    this.state = deserializeState(json);
    this.#charge = null;
  }
}

export const pattern = new PatternStore();
