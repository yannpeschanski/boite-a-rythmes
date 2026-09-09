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
import {
  montageFrais,
  migrerArchitecture,
  nouvelleSection,
  chaineVierge,
  nomEdite,
  basculerLigne as calqueSans,
  deplacerSection,
} from '../model/architecture';
import type { LineName } from '../model/types';
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

  /* ⚠️ PLUS DE BOUTONS ICI. Un montage en portait six, consommés par un effet
     du Mode Live ; c'est retiré (2026-09-09, « ça ne fait pas ses preuves »).
     Ce que ça achète : les boutons déjà réglés ne sont plus JAMAIS remplacés,
     donc le loquet « conserver mes boutons » et la coche d'ouverture d'un
     fichier n'ont plus de raison d'être — deux commandes en moins à lire. */

  chargerMontage(nom: string): void {
    const a = montageFrais(nom);
    if (!a) return;
    this.courante = a;
    ecrire(a);
  }

  /** Partir d'une page blanche — une seule scène, à étendre. */
  nouvelle(): void {
    const a = chaineVierge();
    this.courante = a;
    ecrire(a);
  }

  /** Poser une chaîne venue d'ailleurs — un fichier de morceau. */
  remplacer(a: Architecture): void {
    this.courante = a;
    ecrire(a);
  }

  effacer(): void {
    this.courante = null;
    ecrire(null);
  }

  #ecrireCourante(): void {
    ecrire($state.snapshot(this.courante) as Architecture);
  }

  /* ---- MONTER LA CHAÎNE SOI-MÊME ----
   *
   * ⚠️ CE QUI CHANGE LA FORME MARQUE LE NOM. Une chaîne dont on a retiré trois
   * scènes, ou dont le refrain joue maintenant C, ne s'appelle plus « RONDO » :
   * c'est le seul mot que la bande du Live affiche en grand, et il ne doit pas
   * mentir. `nomEdite` ne marque qu'une fois — un nom déjà libre reste tel quel.
   * Seul RENOMMER une scène y échappe : ça ne change pas ce qu'on entend, et le
   * nom du montage clignoterait à chaque touche tapée.
   */
  #modifie(sections: Section[]): void {
    const a = this.courante;
    if (!a) return;
    a.sections = sections;
    a.nom = nomEdite(a.nom);
    this.#ecrireCourante();
  }

  /** Change la LETTRE que joue une section — le geste central de la chaîne. */
  poserPartie(index: number, partie: PartieId): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    const s = [...a.sections];
    s[index] = { ...s[index], partie };
    this.#modifie(s);
  }

  /** Change le nombre de tours d'une section — borné pour rester lisible. */
  poserCycles(index: number, cycles: number): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    const s = [...a.sections];
    s[index] = { ...s[index], cycles: Math.max(1, Math.min(32, Math.round(cycles))) };
    this.#modifie(s);
  }

  /** Le nom de la chaîne, tapé à la main — c'est celui du morceau qu'on monte. */
  renommer(nom: string): void {
    const a = this.courante;
    if (!a) return;
    a.nom = nom.trim() || 'MON MORCEAU';
    this.#ecrireCourante();
  }

  /** Le nom d'une scène — « COUPLET », « MONTÉE ». */
  poserNomScene(index: number, nom: string): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    a.sections[index] = { ...a.sections[index], nom: nom.slice(0, 16) };
    /* Renommer une scène ne change pas la FORME : le nom du montage n'est donc
       pas marqué ici, sans quoi taper une lettre suffirait à le faire. */
    this.#ecrireCourante();
  }

  /**
   * Les lignes qui sonnent dans une scène. `null` = toutes.
   *
   * C'est la troisième demande de Yann — « qu'on puisse choisir quelles lignes
   * sont mutées » — et c'est aussi ce qui écrit le PRIME : une scène qui perd
   * une ligne s'affiche A′ sans qu'aucun champ ne le dise.
   */
  poserLignes(index: number, lignes: LineName[] | null): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    const s = [...a.sections];
    s[index] = { ...s[index], lignes: lignes ? [...lignes] : null };
    this.#modifie(s);
  }

  basculerLigne(index: number, ligne: LineName): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    this.poserLignes(index, calqueSans($state.snapshot(a.sections[index].lignes), ligne));
  }

  /** Une scène de plus, juste après celle-ci — pleine, sur la même lettre. */
  ajouterScene(apres: number): void {
    const a = this.courante;
    if (!a) return;
    const i = Math.max(-1, Math.min(a.sections.length - 1, Math.round(apres)));
    const modele = a.sections[i];
    const s = [...a.sections];
    s.splice(i + 1, 0, nouvelleSection(`SCÈNE ${a.sections.length + 1}`, modele?.partie ?? 'A', 2));
    this.#modifie(s);
  }

  /** La même scène en double — le geste qui monte « A A B A » en trois taps. */
  dupliquerScene(index: number): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    const src = a.sections[index];
    const s = [...a.sections];
    s.splice(index + 1, 0, nouvelleSection(src.nom, src.partie, src.cycles, src.lignes));
    this.#modifie(s);
  }

  /**
   * Retirer une scène.
   *
   * ⚠️ LA DERNIÈRE SCÈNE RETIRÉE EFFACE LA CHAÎNE. Une architecture à zéro
   * section ne passe pas `valide()` : gardée en mémoire, elle disparaîtrait au
   * rechargement suivant sans un mot. Mieux vaut dire tout de suite qu'il n'y a
   * plus de montage — un seul motif qui tourne, l'état de départ.
   */
  supprimerScene(index: number): void {
    const a = this.courante;
    if (!a || !a.sections[index]) return;
    if (a.sections.length === 1) {
      this.effacer();
      return;
    }
    this.#modifie(a.sections.filter((_, i) => i !== index));
  }

  /** Monter ou descendre une scène d'un cran. */
  deplacerScene(index: number, delta: number): void {
    const a = this.courante;
    if (!a) return;
    const avant = [...a.sections];
    const apres = deplacerSection(avant, index, delta);
    if (apres === avant) return; // hors bornes : rien ne bouge, et le nom non plus
    this.#modifie(apres);
  }

  get sections(): Section[] {
    return this.courante?.sections ?? [];
  }
}

export const architecture = new ArchitectureStore();
