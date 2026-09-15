/* La reprise de la sortie, et la tâche du geste qui la porte.
 *
 * Écrit après un défaut TROUVÉ EN JOUANT, et sur un seul navigateur :
 * « l'appli ne fonctionne pas sur firefox » (Yann, 2026-09-15). Le son ne
 * sortait pas, aucune erreur n'apparaissait, et Chrome — le seul navigateur de
 * nos mesures et de l'intégration continue — n'a jamais rien montré.
 *
 * LA CAUSE, en une phrase : `start()` reprenait le contexte APRÈS avoir attendu
 * `close()`. Chrome juge l'autoplay sur l'activation COLLANTE (une fois la page
 * touchée, `resume()` passe pour toujours), Firefox et WebKit sur l'activation
 * TRANSITOIRE, perdue dès qu'on sort de la tâche du geste. Refusée, la reprise
 * ne REJETTE pas : sa promesse reste pendante. Tout ce qui suivait — le
 * scheduler — n'était jamais atteint.
 *
 * Deux invariants en découlent, et ce fichier ne tient qu'eux :
 *
 *  1. la bascule de tampon reste SYNCHRONE, pour que la reprise puisse être le
 *     premier `await` de la tâche du geste ;
 *  2. une reprise refusée ne fige RIEN, et elle se DIT.
 *
 * ⚠️ Le second ne peut pas se vérifier dans un navigateur de test : aucun
 * n'expose « refuse cette reprise ». C'est pour ça que `reprendreSortie` prend
 * une forme minimale plutôt qu'un `AudioContext` — la règle est testable sans
 * navigateur, et c'est la seule façon qu'elle avait d'être testée du tout.
 */
import { describe, it, expect, vi } from 'vitest';
import { AudioEngine, reprendreSortie, DELAI_REPRISE } from '../src/engine/AudioEngine';

/* Une sortie dont la reprise ne revient JAMAIS — le refus d'autoplay tel que
   Firefox le sert, et qu'aucun `catch` n'attrape. */
function sortieQuiNeRevientPas() {
  return { state: 'suspended', resume: () => new Promise<void>(() => {}) };
}

describe('la bascule de tampon reste synchrone', () => {
  it('`adapterTampon` n’est pas une fonction async', () => {
    // Si elle le redevient, la reprise de `start()` repasse derrière un `await`
    // et le défaut du 2026-09-15 revient — muet, et invisible sous Chrome.
    const methode = (AudioEngine.prototype as unknown as Record<string, () => void>)
      .adapterTampon;
    expect(typeof methode).toBe('function');
    expect(methode.constructor.name).toBe('Function');
    expect(methode.constructor.name).not.toBe('AsyncFunction');
  });
});

describe('une reprise refusée ne fige pas la lecture', () => {
  it('rend la main même si la promesse ne revient jamais', async () => {
    vi.useFakeTimers();
    try {
      const promesse = reprendreSortie(sortieQuiNeRevientPas(), 1500);
      await vi.advanceTimersByTimeAsync(1500);
      // Le point du test : cette ligne est atteinte. Sans la montre, elle ne
      // l'était pas — et dans le moteur, c'est le scheduler qui restait
      // derrière.
      await expect(promesse).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('dit la vérité quand la sortie joue', async () => {
    const ctx = {
      state: 'suspended',
      resume() {
        (this as { state: string }).state = 'running';
        return Promise.resolve();
      },
    };
    await expect(reprendreSortie(ctx)).resolves.toBe(true);
  });

  it('traite un rejet explicite comme un refus, pas comme un plantage', async () => {
    // Chrome, lui, REJETTE. Les deux comportements existent ; un seul chemin.
    const ctx = { state: 'suspended', resume: () => Promise.reject(new Error('blocked')) };
    await expect(reprendreSortie(ctx)).resolves.toBe(false);
  });

  it('n’attend jamais plus que son délai de garde', () => {
    // Assez long pour qu'une reprise réelle passe (quelques dizaines de ms,
    // Bluetooth compris), assez court pour qu'un joueur ne fixe pas un ▶ inerte.
    expect(DELAI_REPRISE).toBeGreaterThanOrEqual(0.5);
    expect(DELAI_REPRISE).toBeLessThanOrEqual(3);
  });
});
