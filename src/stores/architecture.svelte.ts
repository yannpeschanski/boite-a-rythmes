/* L'ARCHITECTURE COURANTE — la chaîne de sections que la bande du Mode Live
 * joue. Voir `src/model/architecture.ts` pour le modèle et docs/plan/06 pour
 * l'étude.
 *
 * ⚠️ Ce n'est PAS de l'état de morceau : une architecture est une SET LIST,
 * pas un morceau. Elle ne rentre donc pas dans le format v2 — même domicile
 * que les parties (`localStorage`), et le contrat central n'est pas touché.
 * Le tempo non plus n'y est pas : il appartient au transport.
 */
import type { Architecture, Section } from '../model/architecture';
import { montageFrais, montageParNom, migrerArchitecture } from '../model/architecture';
import type { MigrationArchitecture } from '../model/architecture';
import { estPartieId, type PartieId } from '../model/parties';
import { parties } from './parties.svelte';
import { sequenceBank } from './bank.svelte';

const KEY = 'boite-a-rythme:mode-live-architecture';

function valide(v: unknown): v is Architecture {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<Architecture>;
  return (
    typeof a.nom === 'string' &&
    Array.isArray(a.sections) &&
    a.sections.length > 0 &&
    a.sections.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.nom === 'string' &&
        typeof s.cycles === 'number' &&
        s.cycles > 0 &&
        estPartieId(s.partie) &&
        (s.lignes === null || Array.isArray(s.lignes)),
    )
  );
}

/* La MIGRATION elle-même est pure et vit dans `model/architecture.ts`, où elle
 * est testée : ce qui reste ici est le seul effet de bord qu'elle ne peut pas
 * faire — aller chercher les motifs cités dans la banque pour les ranger sous
 * leur nouvelle lettre. Migrer AVANT de valider, jamais après : valider d'abord
 * rendrait le mono-cycle sans un mot. */
function appliquerMigration(m: MigrationArchitecture): Architecture {
  for (const [sequenceId, lettre] of m.lettres) {
    const entree = sequenceBank.entries.find((e) => e.id === sequenceId);
    if (entree && !parties.remplie(lettre)) parties.poser(lettre, entree.json, entree.name);
  }
  return m.architecture;
}

function lire(): Architecture | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const brut = JSON.parse(raw);
    const migre = migrerArchitecture(brut);
    const parsed = migre ? appliquerMigration(migre) : brut;
    if (!valide(parsed)) return null;
    /* ⚠️ RÉÉCRIRE TOUT DE SUITE la forme migrée. Sans ça l'ancienne reste sur
       le disque et la migration se rejoue à CHAQUE chargement : une lettre que
       l'utilisateur vient de vider se remplirait toute seule au rechargement
       suivant, et il chercherait la panne. Une migration se joue une fois. */
    if (migre) ecrire(parsed);
    return parsed;
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
  /* `null` = pas de chaîne : un seul motif qui tourne, le comportement d'avant
     la bande. C'est le défaut, et il ne migre rien. */
  courante = $state<Architecture | null>(lire());

  /* Les six boutons que le dernier montage chargé demande, ou `null`. Lu UNE
     FOIS par le Mode Live au chargement puis remis à zéro : le store des
     assignations vit dans `ui/live/liveActions`, et deux domiciles pour la même
     règle n'en appliquent qu'un. */
  boutonsDemandes = $state<string[][] | null>(null);

  chargerMontage(nom: string): void {
    const a = montageFrais(nom);
    if (!a) return;
    this.courante = a;
    this.boutonsDemandes = montageParNom(nom)?.boutons ?? null;
    ecrire(a);
  }

  boutonsConsommes(): void {
    this.boutonsDemandes = null;
  }

  /** Poser une chaîne venue d'ailleurs — un fichier de morceau. */
  remplacer(a: Architecture): void {
    this.courante = a;
    this.boutonsDemandes = null;
    ecrire(a);
  }

  effacer(): void {
    this.courante = null;
    this.boutonsDemandes = null;
    ecrire(null);
  }

  #ecrireCourante(): void {
    ecrire($state.snapshot(this.courante) as Architecture);
  }

  /** Change la LETTRE que joue une section — le geste central de la chaîne. */
  poserPartie(index: number, partie: PartieId): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    a.sections[index] = { ...a.sections[index], partie };
    this.#ecrireCourante();
  }

  /** Change le nombre de tours d'une section — borné pour rester lisible. */
  poserCycles(index: number, cycles: number): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    a.sections[index] = {
      ...a.sections[index],
      cycles: Math.max(1, Math.min(32, Math.round(cycles))),
    };
    this.#ecrireCourante();
  }

  get sections(): Section[] {
    return this.courante?.sections ?? [];
  }
}

export const architecture = new ArchitectureStore();
