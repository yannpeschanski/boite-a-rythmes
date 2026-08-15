// Explications légères par paramètre (PLAN.md §7, retour de Yann : « une
// micro-explication disponible pour chaque réglage, sans surcharger l'écran
// ni noyer un nouvel arrivant »). Table id -> phrase courte, indexée sur le
// LIBELLÉ du curseur (`XpSlider.label`) plutôt qu'un identifiant dédié à
// ajouter à chaque appel : un même libellé ("Swing", "Attaque"…) revient
// sur plusieurs lignes/pages avec le même sens, une seule entrée suffit
// pour toutes ses occurrences.
//
// Révisé (retour de Yann, 2026-08-14 : « c'est bien mais j'ai l'impression
// que ce n'est pas exhaustif et que ça ne parle pas un langage assez
// simple ») : couvre désormais TOUS les libellés de XpSlider présents dans
// l'appli (vérifié par recherche exhaustive, pas au jugé), et chaque phrase
// est reformulée pour éviter le jargon technique (pas de "portamento",
// "sidechain", "curve exponentielle"…) au profit d'une description de
// l'EFFET entendu, comme si on l'expliquait à quelqu'un qui découvre.
export const PARAM_HINTS: Record<string, string> = {
  // Groove (Atelier > Rythme, SynthModule > Groove synthé)
  Swing: 'Retarde légèrement un pas sur deux, pour un rythme qui balance au lieu d’être bien carré.',
  'Swing synthé': 'Le même effet que le Swing de la batterie, mais appliqué à la basse/nappe/mélodie.',
  Traîne: 'Retarde légèrement TOUS les pas (pas un sur deux comme le Swing) — donne l’impression que le rythme traîne un peu derrière le tempo.',
  'Traîne synthé': 'Le même effet que la Traîne de la batterie, mais appliqué à la basse/nappe/mélodie.',
  'Ghost notes': 'Ajoute de petits coups discrets, plus doux, entre les temps forts — un rythme moins figé, plus vivant.',
  'Rafales spontanées': 'Fait que des pas normaux se transforment de temps en temps, tout seuls, en petite rafale de coups rapides pendant que ça joue.',
  'Vélocité aléatoire': 'Fait légèrement varier le volume de chaque coup, pour que ce soit moins joué à la machine.',
  'Intensité du fill': 'Plus c’est haut, plus les fills (les petites relances rythmiques automatiques) sont chargés en coups.',
  Décalage: 'Avance ou retarde tous les coups de cette ligne par rapport aux autres.',

  // Bus & effets (Atelier > Effets)
  Saturation: 'Ajoute un peu de grain et de distorsion, comme un ampli qu’on pousse un peu fort.',
  Compression: 'Resserre l’écart entre les sons forts et les sons faibles, pour un mix plus compact, plus « collé ».',
  Bitcrush: 'Dégrade la qualité du son exprès, pour un effet rétro, façon vieille console de jeu.',
  'Volume général': 'Le volume final de tout le morceau, une fois que tous les effets sont appliqués.',
  Profondeur: 'À quel point le son du synthé baisse à chaque coup de batterie — l’effet « pompe » très utilisé en électro.',
  Retour: 'Le temps que met le synthé à retrouver son volume normal après chaque coup de batterie.',
  'Taille réverbe': 'La taille de la pièce simulée par la réverbération — petit local ou grande salle qui résonne.',
  'Feedback delay': 'Le nombre de fois où l’écho (delay) se répète avant de disparaître.',

  // Synthé — voix (SynthRowView, une entrée par ligne basse/nappe/mélodie)
  'Filtre passe-bas': 'Adoucit le son en coupant les fréquences aiguës au-dessus de ce réglage.',
  Attaque: 'Le temps que met le son à monter à son volume maximum, dès qu’il est joué.',
  Decay: 'Le temps que met le son à redescendre juste après l’attaque, avant de se stabiliser.',
  Release: 'Le temps que met le son à s’éteindre une fois la note relâchée.',
  Sub: 'Ajoute un son grave, une octave en dessous, pour épaissir le bas du son.',
  Détune: 'Désaccorde très légèrement un second oscillateur, pour un son plus épais, plus large.',
  'Mix détune': 'Dose la présence de cet oscillateur désaccordé dans le son final.',
  Chorus: 'Duplique et désaccorde très légèrement le son, pour un effet plus large — comme plusieurs voix ensemble.',
  Vibrato: 'Fait légèrement onduler la hauteur du son, de façon régulière — comme un chant vibré.',
  Tone: 'Équilibre entre les graves et les aigus du timbre, en un seul réglage.',
  Glide: 'La note glisse vers la suivante au lieu de changer net, comme un doigt qui glisse sur une corde.',
  // Deux macros qui remplacent les 4 réglages de filtre d'origine (coupure,
  // résonance, ouverture d'enveloppe, temps de fermeture) — retour de Yann :
  // « filtre on comprend rien ». Le libellé décrit ce qu'on ENTEND, pas le
  // paramètre technique qu'il pilote.
  Brillance: 'Du plus sourd, comme un son derrière une porte, au plus brillant et présent.',
  Mouvement: 'Fait s’ouvrir le son au début de chaque note puis se refermer — l’effet « wah » caractéristique des synthés.',
  Étalement: 'Les notes de l’accord ne sont pas jouées pile en même temps, mais très légèrement décalées les unes après les autres.',

  // Synthé — séquence (SynthRowView > Séquence)
  'Cycles (mesures)': 'Le nombre de mesures avant que le motif de cette ligne ne recommence depuis le début.',
  'Notes du cycle': 'Le nombre de pas (de notes possibles) dans le motif de cette ligne.',

  // Drum — séquence/timbre (DrumRowView)
  Pas: 'Le nombre de cases dans la grille de cette ligne — plus il y en a, plus le motif peut être détaillé.',
  Pitch: 'Change la hauteur du son de cette ligne, en demi-tons — plus grave ou plus aigu.',
  Réverbe: 'La quantité de réverbération (écho de pièce) envoyée sur cette ligne.',
  Delay: 'La quantité d’écho répété (delay) envoyée sur cette ligne.',
  Volume: 'Le volume de cette ligne dans le mix.',

  // Harmonie (SynthModule) — apostrophe DROITE dans le libellé lui-même
  // (voir SynthModule.svelte), contrairement aux autres apostrophes
  // typographiques de ce fichier : la clé doit matcher EXACTEMENT.
  "Nb d'accords": 'Le nombre d’accords différents utilisés par la progression harmonique du morceau.',

  // Transport / export
  Tempo: 'La vitesse du morceau, en battements par minute (BPM) — plus le nombre est haut, plus ça va vite.',
  Durée: 'La durée du morceau à exporter, en secondes.',

  // Générateurs
  'Taux de remplissage': 'Densité des notes générées par 🎲 Remplissage aléatoire — plus haut, plus de pas remplis.',
  'Coups euclidiens': 'Le nombre de coups à répartir le plus régulièrement possible sur les pas de la ligne.',
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
