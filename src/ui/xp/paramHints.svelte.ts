// Explications légères par paramètre (PLAN.md §7, retour de Yann : « une
// micro-explication disponible pour chaque réglage, sans surcharger l'écran
// ni noyer un nouvel arrivant »). Table id -> phrase courte, indexée sur le
// LIBELLÉ du curseur (`XpSlider.label`) plutôt qu'un identifiant dédié à
// ajouter à chaque appel : un même libellé ("Swing", "Attaque"…) revient
// sur plusieurs lignes/pages avec le même sens, une seule entrée suffit
// pour toutes ses occurrences. Contenu volontiers incomplet plutôt que
// deviné — mieux vaut aucune bulle qu'une explication approximative.
export const PARAM_HINTS: Record<string, string> = {
  // Groove (Atelier > Rythme, SynthModule > Groove synthé)
  Swing: 'Décale légèrement les pas pairs, pour un groove chaloupé façon shuffle plutôt que carré.',
  'Swing synthé': 'Même décalage que le Swing de la batterie, appliqué aux lignes basse/nappe/mélodie.',
  Traîne: 'Retarde légèrement TOUS les pas, contrairement au Swing qui n’en décale qu’un sur deux — un groove qui traîne derrière le tempo.',
  'Traîne synthé': 'Même retard que la Traîne de la batterie, appliqué aux lignes basse/nappe/mélodie.',
  'Ghost notes': 'Ajoute de petits coups discrets (volume réduit) entre les temps forts, pour un rythme moins figé.',
  'Rafales spontanées': 'Probabilité qu’un pas normal se transforme tout seul en rafale (roll) pendant la lecture.',
  'Vélocité aléatoire': 'Fait varier légèrement le volume de chaque coup, pour un jeu moins mécanique.',
  'Intensité du fill': 'Détermine à quel point les fills (relances rythmiques automatiques) sont chargés en coups.',
  Décalage: 'Avance ou retarde tous les coups de cette ligne par rapport au reste du morceau.',

  // Bus & effets (Atelier > Effets)
  Saturation: 'Ajoute du grain et une légère distorsion, comme un ampli qu’on pousse un peu.',
  Compression: 'Resserre l’écart entre sons forts et faibles, pour un mix plus « collé ».',
  Bitcrush: 'Réduit la résolution du son pour un effet lo-fi, façon vieille console de jeu.',
  'Volume général': 'Volume de sortie de tout le morceau, après tous les effets de bus.',
  Profondeur: 'Sidechain : à quel point le synthé se coupe quand la batterie frappe.',
  Retour: 'Sidechain : le temps que met le synthé à retrouver son volume après une frappe.',
  'Taille réverbe': 'Sensation de grandeur de la pièce simulée — petite pièce ou grande salle.',
  'Feedback delay': 'Combien de fois l’écho du delay se répète avant de s’éteindre.',

  // Synthé — voix (SynthRowView, une entrée par ligne basse/nappe/mélodie)
  'Filtre passe-bas': 'Coupe les aigus au-dessus de ce seuil, pour un son plus doux ou plus étouffé.',
  Filtre: 'Coupe les aigus au-dessus de ce seuil, pour un son plus doux ou plus étouffé.',
  Attaque: 'Temps que met le son à atteindre son volume maximum après avoir été joué.',
  Decay: 'Temps de chute du son juste après l’attaque, avant de se stabiliser.',
  Release: 'Temps que met le son à s’éteindre une fois la note relâchée.',
  Sub: 'Ajoute un oscillateur grave, une octave en dessous, pour épaissir le bas du son.',
  Détune: 'Désaccorde légèrement un second oscillateur par rapport au premier, pour épaissir le son.',
  'Mix détune': 'Doses la présence de cet oscillateur désaccordé dans le mélange.',
  Chorus: 'Duplique et désaccorde subtilement le son, pour un effet plus large et plus riche.',
  Vibrato: 'Fait légèrement osciller la hauteur du son, de façon régulière.',
  Tone: 'Équilibre entre les graves et les aigus du timbre.',
  Glide: 'Le son glisse d’une note à l’autre au lieu de sauter net (portamento).',
  'Ouv. filtre': 'À quel point le filtre s’ouvre (laisse passer d’aigus) au moment où la note est jouée.',
  'Ferm. filtre': 'Temps que met le filtre à se refermer après l’ouverture du début de note.',
  Étalement: 'Les notes de l’accord sont jouées légèrement décalées plutôt que toutes en même temps.',

  // Générateurs
  'Taux de remplissage': 'Densité des notes générées par 🎲 Remplissage aléatoire — plus haut, plus de pas remplis.',
  'Coups euclidiens': 'Nombre de coups à répartir le plus uniformément possible sur les pas de la ligne.',
};

export function hintFor(label: string): string | undefined {
  return PARAM_HINTS[label];
}

// Réglage persistant (Affichage ▸ Aide contextuelle, ToolBar.svelte), même
// esprit que systemSounds.ts pour les sons système — mais un `$state` de
// classe plutôt qu'une variable de module : ici la réactivité doit
// atteindre tous les XpSlider déjà montés à l'écran dès qu'on bascule le
// réglage, pas seulement influencer un futur appel (contrairement au son,
// qui ne se déclenche qu'au prochain événement).
const KEY = 'boite-a-rythme:param-hints-enabled';

function readEnabled(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? true : raw === '1'; // activé par défaut
  } catch {
    return true;
  }
}

class ParamHintsSettings {
  enabled = $state(readEnabled());

  toggle(): void {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(KEY, this.enabled ? '1' : '0');
    } catch {
      /* stockage refusé : le réglage reste actif pour la session, sans persister */
    }
  }
}

export const paramHintsSettings = new ParamHintsSettings();
