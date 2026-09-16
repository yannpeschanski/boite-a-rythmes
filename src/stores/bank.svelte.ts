// Banque de séquences (PLAN.md §6, retour de Yann : « mettre en banque
// plusieurs séquences dans l'Atelier et pouvoir basculer de l'une à
// l'autre depuis le Mode Live »). Sous-brique volontairement plus simple
// que le Mode Song prévu : une bibliothèque de patterns nommés, pas de
// timeline auto-enchaînée — juste sauvegarder/rappeler, comme changer de
// pattern sur une vraie boîte à rythmes. Même sérialisation v2 que
// l'autosave (stores/share.ts), un JSON par entrée plutôt qu'un format dédié.
//
// ⚠️ RANGÉE PAR PROFIL depuis le 2026-09-16 — *« les séquences sauvegardées
// doivent être associées au nom du profil »* (Yann). La progression, la besace
// et la discographie l'étaient déjà (`Record<pseudo, …>`, voir
// `stores/game.svelte.ts`) ; la banque, non : deux joueurs sur le même
// navigateur voyaient la même liste, et les neuf boucles que l'acte 6 y range
// (`poser`) débordaient d'une partie sur l'autre. Une seule des quatre données
// du joueur ignorait le joueur.
//
// ⚠️ LE PROFIL ARRIVE PAR UN SETTER, pas par un import de `game`. `game`
// importe ce module (il y range les boucles livrées) : le lire d'ici ferait un
// cycle d'imports. C'est donc `game` qui pousse le profil — au chargement
// (`load`), au choix d'un joueur (`setPseudo`) et à sa sortie (`clearPseudo`).
import { pattern } from './pattern.svelte';

export interface BankEntry {
  id: string;
  name: string;
  json: string; // pattern sérialisé (format v2), voir model/serialize
  savedAt: number;
}

const KEY = 'boite-a-rythme:sequence-bank';

/* Le seau de celui qui n'a pas de profil : l'Atelier s'utilise sans passer par
   le Mode jeu, et une séquence enregistrée là ne doit pas disparaître parce
   qu'aucun pseudo n'est actif. */
const SANS_PROFIL = '';

type Banques = Record<string, BankEntry[]>;

function estEntree(v: unknown): v is BankEntry {
  const e = v as BankEntry | null;
  return !!e && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.json === 'string';
}

/* Lecture tolérante, et la MIGRATION du format plat.
 *
 * ⚠️ Avant les profils, la clé portait un tableau. Le relire comme un
 * dictionnaire donnerait une banque vide sans un mot — et les séquences
 * existantes seraient perdues alors qu'elles sont encore là. Un tableau trouvé
 * ici est donc rangé « sans profil », d'où le premier joueur qui ouvre le jeu
 * l'ADOPTE (voir `setProfil`) : la banque d'avant les profils appartient à qui
 * s'en servait, et elle ne se duplique pas. */
function readBanques(): Banques {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { [SANS_PROFIL]: parsed.filter(estEntree) };
    if (parsed && typeof parsed === 'object') {
      const out: Banques = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(v)) out[k] = v.filter(estEntree);
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function writeBanques(b: Banques): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* quota plein ou stockage refusé : la banque reste utilisable pour la session, sans persister */
  }
}

class SequenceBankStore {
  private banques = $state<Banques>(readBanques());
  /** Le profil dont on voit la banque — `''` quand personne n'est connecté. */
  profil = $state(SANS_PROFIL);

  get entries(): BankEntry[] {
    return this.banques[this.profil] ?? [];
  }

  private ecrire(liste: BankEntry[]): void {
    this.banques = { ...this.banques, [this.profil]: liste };
    writeBanques(this.banques);
  }

  /* Changer de joueur change de banque.
   *
   * ⚠️ L'ADOPTION de la banque d'avant les profils a lieu ici, et une seule
   * fois : un profil qui n'a pas encore de banque hérite du seau « sans
   * profil » s'il en existe un. Sans elle, la première visite après la mise à
   * jour aurait présenté une banque vide à quelqu'un dont les séquences sont
   * pourtant toujours dans le stockage. Le seau est DÉPLACÉ, pas copié : deux
   * profils ne peuvent pas hériter deux fois du même travail. */
  setProfil(nom: string): void {
    const p = nom.trim();
    if (p && !this.banques[p] && (this.banques[SANS_PROFIL]?.length ?? 0) > 0) {
      const { [SANS_PROFIL]: heritage, ...reste } = this.banques;
      this.banques = { ...reste, [p]: heritage };
      writeBanques(this.banques);
    }
    this.profil = p;
  }

  /** Effacer la banque d'un profil supprimé — voir `game.supprimerJoueur`. */
  supprimerProfil(nom: string): void {
    if (!(nom in this.banques)) return;
    const { [nom]: _retire, ...reste } = this.banques;
    this.banques = reste;
    writeBanques(this.banques);
  }

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
    this.ecrire([...this.entries, entry]);
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
    this.ecrire(
      existante
        ? this.entries.map((e) => (e.id === entry.id ? entry : e))
        : [...this.entries, entry],
    );
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
    this.ecrire(this.entries.map((e) => (e.id === id ? { ...e, name: trimmed } : e)));
  }

  remove(id: string): void {
    this.ecrire(this.entries.filter((e) => e.id !== id));
  }
}

export const sequenceBank = new SequenceBankStore();
