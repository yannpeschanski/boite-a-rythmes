// Banque de séquences (PLAN.md §6, retour de Yann : « mettre en banque
// plusieurs séquences dans l'Atelier et pouvoir basculer de l'une à
// l'autre depuis le Mode Live »). Sous-brique volontairement plus simple
// que le Mode Song prévu : une bibliothèque de patterns nommés, pas de
// timeline auto-enchaînée — juste sauvegarder/rappeler, comme changer de
// pattern sur une vraie boîte à rythmes. Même sérialisation v2 que
// l'autosave (stores/share.ts), un JSON par entrée plutôt qu'un format dédié.
import { pattern } from './pattern.svelte';

export interface BankEntry {
  id: string;
  name: string;
  json: string; // pattern sérialisé (format v2), voir model/serialize
  savedAt: number;
}

const KEY = 'boite-a-rythme:sequence-bank';

function readBank(): BankEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBank(entries: BankEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota plein ou stockage refusé : la banque reste utilisable pour la session, sans persister */
  }
}

class SequenceBankStore {
  entries = $state<BankEntry[]>(readBank());

  // Sauvegarde le pattern ACTUEL (Atelier ou Live, même store `pattern`
  // partagé) sous un nouveau nom — jamais d'écrasement silencieux d'une
  // entrée existante, toujours une nouvelle entrée (renommer/supprimer sont
  // des actions séparées, délibérées).
  save(name: string): void {
    const entry: BankEntry = {
      id: crypto.randomUUID(),
      name: name.trim() || `Séquence ${this.entries.length + 1}`,
      json: pattern.toJson(),
      savedAt: Date.now(),
    };
    this.entries = [...this.entries, entry];
    writeBank(this.entries);
  }

  /* Ranger une séquence sous un NOM, en remplaçant celle qui le porte déjà.
   *
   * ⚠️ `save` ajoute toujours une entrée — c'est le bon défaut quand un humain
   * clique « enregistrer ». Ici c'est le JEU qui range les boucles livrées à
   * un acte : refaire l'acte doit remplacer les siennes, pas en empiler un
   * troisième jeu sous le même nom. Même raison que la clé (acte, série) de la
   * discographie. Rend l'identifiant, dont l'architecture a besoin. */
  poser(nom: string, json: string): string {
    const existante = this.entries.find((e) => e.name === nom);
    const entry: BankEntry = {
      id: existante?.id ?? crypto.randomUUID(),
      name: nom,
      json,
      savedAt: Date.now(),
    };
    this.entries = existante
      ? this.entries.map((e) => (e.id === entry.id ? entry : e))
      : [...this.entries, entry];
    writeBank(this.entries);
    return entry.id;
  }

  load(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (entry) pattern.loadJson(entry.json);
  }

  /* Charge une séquence SANS emporter son tempo — pour la bande d'architecture
     du Mode Live.
     ⚠️ `loadJson` remplace tout l'état, tempo compris : une section rangée à
     90 BPM ferait décrocher le set au refrain. Le tempo appartient au
     TRANSPORT, la section apporte tout le reste — le feel compris (swing,
     traîne, décalage), qui fait partie de l'identité d'une section. */
  loadGardantTempo(id: string): void {
    const entry = this.entries.find((e) => e.id === id);
    if (!entry) return;
    const tempo = pattern.state.tempo;
    pattern.loadJson(entry.json);
    pattern.state.tempo = tempo;
  }

  rename(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    this.entries = this.entries.map((e) => (e.id === id ? { ...e, name: trimmed } : e));
    writeBank(this.entries);
  }

  remove(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    writeBank(this.entries);
  }
}

export const sequenceBank = new SequenceBankStore();
