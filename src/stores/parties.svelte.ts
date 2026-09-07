/* LES PARTIES A / B / C / D — les quatre emplacements dont une architecture
 * est faite. Voir `src/model/parties.ts` pour le pourquoi.
 *
 * ⚠️ Ce n'est PAS de l'état de morceau : quatre motifs et une chaîne sont une
 * SET LIST, pas un morceau. Même domicile que la banque de séquences
 * (`localStorage`), le format v2 n'est pas touché.
 *
 * ⚠️ LES PARTIES ET LA BANQUE NE SE CONFONDENT PAS, et la distinction est déjà
 * écrite dans le jeu : « toutes les boucles vont dans la banque de séquences,
 * seules celles qui portent une section entrent dans l'architecture ». La
 * banque est le MATÉRIEL (l'acte 6 en livre neuf), les parties sont le MORCEAU
 * qu'on monte. Ranger un motif sous A ne le retire pas de la banque et
 * n'y ajoute rien.
 */
import { pattern } from './pattern.svelte';
import { deserializeState } from '../model/serialize';
import { cycleDuMotif } from '../model/architecture';
import { PARTIES, estPartieId, type Partie, type PartieId } from '../model/parties';

const KEY = 'boite-a-rythme:parties';

type Table = Record<PartieId, Partie | null>;

function vide(): Table {
  return { A: null, B: null, C: null };
}

function valide(v: unknown): v is Table {
  if (!v || typeof v !== 'object') return false;
  return PARTIES.every((id) => {
    const p = (v as Record<string, unknown>)[id];
    if (p === null || p === undefined) return true;
    const q = p as Partial<Partie>;
    return typeof q.json === 'string' && typeof q.nom === 'string';
  });
}

function lire(): Table {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return vide();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!valide(parsed)) return vide();
    const t = vide();
    for (const id of PARTIES) {
      const p = parsed[id] as Partie | null | undefined;
      t[id] = p ? { json: p.json, nom: p.nom ?? '', rangeeLe: p.rangeeLe ?? 0 } : null;
    }
    return t;
  } catch {
    return vide();
  }
}

class PartiesStore {
  table = $state<Table>(lire());

  /* ⚠️ Un refus du stockage ne doit jamais être silencieux — même règle que
     `game.persistanceRefusee` : `localStorage` EXISTE en navigation privée
     stricte, il lève à l'ÉCRITURE. Une partie rangée qui disparaîtrait au
     rechargement sans un mot, c'est le morceau qu'on croyait tenir. */
  persistanceRefusee = $state(false);

  #ecrire(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify($state.snapshot(this.table)));
      this.persistanceRefusee = false;
    } catch {
      this.persistanceRefusee = true;
    }
  }

  get(id: PartieId): Partie | null {
    return this.table[id];
  }

  remplie(id: PartieId): boolean {
    return this.table[id] !== null;
  }

  get premiereRemplie(): PartieId | null {
    return PARTIES.find((id) => this.table[id] !== null) ?? null;
  }

  get nombreRemplies(): number {
    return PARTIES.filter((id) => this.table[id] !== null).length;
  }

  /* ---- LE CYCLE PROPRE DE CHAQUE LETTRE ----
   *
   * ⚠️ Il n'y a PAS un cycle unique pour toute une chaîne : c'est une propriété
   * du motif. Une lettre dont la nappe s'étale sur quatre mesures vaut 4, une
   * autre en batterie seule vaut 1. Compter toute la chaîne avec le cycle du
   * motif COURANT donnait, pour la même chaîne, « 1 min 44 » ou « 26 s » selon
   * la partie chargée au moment où on regarde — la vraie durée étant 1 min 02.
   *
   * Mémoïsé sur `rangeeLe` : désérialiser trois motifs à chaque rendu du Mode
   * Live (60 fois par seconde) serait absurde. Une lettre rangée change son
   * horodatage, donc le cache se périme tout seul. */
  #cycles = new Map<PartieId, { le: number; cycle: number }>();

  cycle(id: PartieId): number {
    const p = this.table[id];
    if (!p) return 1;
    const cache = this.#cycles.get(id);
    if (cache && cache.le === p.rangeeLe) return cache.cycle;
    let cycle = 1;
    try {
      cycle = cycleDuMotif(deserializeState(p.json));
    } catch {
      /* une entrée illisible ne doit pas casser l'affichage d'une durée */
    }
    this.#cycles.set(id, { le: p.rangeeLe, cycle });
    return cycle;
  }

  /** À passer tel quel à `dureeSecondes` / `mesuresTotales`. */
  get cycleDe(): (id: PartieId) => number {
    return (id) => this.cycle(id);
  }

  /* RANGER le motif courant sous une lettre. C'est LE geste du chantier : un
     clic, pas un nom à taper puis un sélecteur à ouvrir. Et « de A on
     développe B » n'a pas de verbe à lui — c'est ce même clic sur B après
     avoir modifié A. */
  ranger(id: PartieId, nom = ''): void {
    this.table[id] = { json: pattern.toJson(), nom: nom.trim(), rangeeLe: Date.now() };
    this.#ecrire();
  }

  /** Recopier une lettre dans une autre — dériver B de A sans passer par l'Atelier. */
  copier(source: PartieId, cible: PartieId): void {
    const p = this.table[source];
    if (!p) return;
    this.table[cible] = { ...p, rangeeLe: Date.now() };
    this.#ecrire();
  }

  vider(id: PartieId): void {
    this.table[id] = null;
    this.#ecrire();
  }

  renommer(id: PartieId, nom: string): void {
    const p = this.table[id];
    if (!p) return;
    this.table[id] = { ...p, nom: nom.trim() };
    this.#ecrire();
  }

  /** Ranger un motif venu d'ailleurs (le jeu, qui monte un set livré). */
  poser(id: PartieId, json: string, nom: string): void {
    this.table[id] = { json, nom, rangeeLe: Date.now() };
    this.#ecrire();
  }

  /** Charger une partie dans l'Atelier — tempo compris, on vient l'éditer. */
  charger(id: PartieId): void {
    const p = this.table[id];
    if (p) pattern.loadJson(p.json);
  }

  /* Charger une partie SANS emporter son tempo — pour la chaîne du Mode Live.
     ⚠️ `loadJson` remplace tout l'état, tempo compris : une partie rangée à
     90 BPM ferait décrocher le set au refrain. Le tempo appartient au
     TRANSPORT, la partie apporte tout le reste — le feel compris (swing,
     traîne, décalage), qui fait partie de l'identité d'une section. */
  chargerGardantTempo(id: PartieId): boolean {
    const p = this.table[id];
    if (!p) return false;
    const tempo = pattern.state.tempo;
    pattern.loadJson(p.json);
    pattern.state.tempo = tempo;
    return true;
  }

  /** Tout effacer — la porte de sortie d'un montage. */
  toutVider(): void {
    this.table = vide();
    this.#ecrire();
  }
}

export const parties = new PartiesStore();
export { PARTIES, estPartieId };
export type { Partie, PartieId };
