/* La dernière ligne touchée — c'est tout ce que ce module sait faire.
 *
 * Il existe pour le bandeau LCD en bas de la fenêtre du séquenceur, que la
 * maquette de référence remplit avec les réglages de la ligne qu'on vient de
 * manipuler (« KICK · TON 42 · DÉCLIN 220 »). Sans ça, le bandeau ne pourrait
 * afficher qu'un résumé global — la forme de la maquette sans son propos.
 *
 * Volontairement HORS du modèle v2 (`model/types.ts`) : ce n'est pas de l'état
 * de morceau. Ça ne se sérialise pas, ça ne se partage pas par URL, ça ne passe
 * pas dans l'historique d'annulation, et le moteur audio ne doit jamais le
 * lire. Même esprit que `ui/xp/paramHints.svelte.ts` — un `$state` d'interface
 * qui vit à côté du modèle, pas dedans.
 */
import type { DrumRowName, SynthRowName } from '../../model/types';

export type TouchedRow =
  | { kind: 'drum'; name: DrumRowName }
  | { kind: 'synth'; name: SynthRowName }
  | null;

class LastTouched {
  current = $state<TouchedRow>(null);

  drum(name: DrumRowName) {
    this.current = { kind: 'drum', name };
  }
  synth(name: SynthRowName) {
    this.current = { kind: 'synth', name };
  }
}

export const lastTouched = new LastTouched();
