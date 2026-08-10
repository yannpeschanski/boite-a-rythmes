// Données du Mode jeu — besace, lots de consolation, roasts. Portées
// VERBATIM depuis l'original (l. 7524–7618).

export interface BagItem { emoji: string; name: string }

export const BAG_ITEMS: BagItem[] = [
  { emoji:'🧦', name:'une chaussette dépareillée' },
  { emoji:'🎩', name:'un chapeau trois tailles trop grand' },
  { emoji:'🪄', name:'une baguette magique en carton' },
  { emoji:'🔮', name:'une boule de cristal fissurée' },
  { emoji:'📻', name:'une radio qui ne capte qu\'une station fantôme' },
  { emoji:'🥁', name:'un tambour un peu bosselé' },
  { emoji:'🎺', name:'une trompette sans embouchure' },
  { emoji:'🪠', name:'une ventouse mystérieusement collante' },
  { emoji:'🧹', name:'un balai qui perd ses poils' },
  { emoji:'🪣', name:'un seau percé' },
  { emoji:'🧽', name:'une éponge déjà toute sèche' },
  { emoji:'🔧', name:'une clé à molette rouillée' },
  { emoji:'🔨', name:'un marteau à tête branlante' },
  { emoji:'🪛', name:'un tournevis qui ne sert à rien' },
  { emoji:'🧲', name:'un aimant qui n\'attire plus grand-chose' },
  { emoji:'🔭', name:'une lunette astronomique en plastique' },
  { emoji:'🧪', name:'une éprouvette d\'origine douteuse' },
  { emoji:'🔑', name:'une clé qui n\'ouvre rien de connu' },
  { emoji:'📦', name:'un carton mystère' },
  { emoji:'✂️', name:'une paire de ciseaux émoussés' },
  { emoji:'🥔', name:'une patate à l\'air suspicieusement intelligente' },
  { emoji:'🐸', name:'un crapaud légèrement électrique' },
  { emoji:'🦴', name:'un os mystère' },
  { emoji:'🧀', name:'un bout de gruyère porte-bonheur' },
  { emoji:'🪀', name:'un yoyo qui ne remonte plus' },
  { emoji:'🐙', name:'une pieuvre en plastique gluant' },
  { emoji:'🧃', name:'une brique de jus limite périmée' },
  { emoji:'🪶', name:'une plume de pigeon des villes' },
  { emoji:'🍌', name:'une banane légèrement inquiétante' },
  { emoji:'🧊', name:'un glaçon qui refuse de fondre' },
  { emoji:'🪅', name:'une piñata déjà vide' },
];

// Lots de consolation : quand on abandonne un rythme (ex. "Nouveau rythme" sans
// avoir trouvé), on récolte quand même quelque chose — mais un objet franchement nul.
export const CONSOLATION_ITEM: BagItem = { emoji:'🧾', name:'un ticket de caisse illisible pour un article inconnu' };
export const ABANDON_LINES: string[] = [
  "Abandon en rase campagne. Le rythme te regarde partir sans un mot.",
  "T'as jeté l'éponge — enfin, façon de parler, y'avait pas d'éponge.",
  "Nouveau rythme demandé sans finir le précédent. Fuite stratégique ou pure lâcheté ? Va savoir.",
  "Capitulation en direct. Le tempo continue sans toi, imperturbable.",
  "T'as tourné les talons avant la fin. Ça arrive aux meilleurs, paraît-il — mais surtout à toi, là.",
  "Retraite anticipée. Le hi-hat n'en revient toujours pas.",
];

// Trois axes de commentaire "roasting", combinés à chaque victoire :
// la difficulté choisie, si la version du joueur a été réécoutée, et le
// nombre de fois où la boucle du rythme cible a tourné avant de trouver.
export const ROAST_DIFFICULTY: Record<string, string[]> = {
  easy: [
    "Mode Facile, sérieusement ? Le chat aurait pu le faire en ronronnant.",
    "Facile... on va appeler ça un échauffement, par gentillesse.",
    "Mode Facile validé. Le hi-hat n'a même pas eu le temps de se réveiller.",
  ],
  medium: [
    "Mode Moyen : le juste milieu entre « je gère » et « je bluffe ».",
    "Niveau Moyen dompté, ni trop chaud ni trop tiède, comme une victoire à température ambiante.",
    "Moyen, mais avec un minimum de panache, on te l'accorde.",
  ],
  hard: [
    "DIFFICILE, avec de la polyrythmie. T'as dompté un 3 contre 4 comme un dresseur de fauves.",
    "Mode Difficile explosé. Le hat comptait en 3 pendant que tout le reste comptait en 4, et t'as pas cillé.",
    "Niveau Difficile plié. Respect, la polyrythmie fait tourner des têtes plus solides que la tienne d'habitude.",
  ],
};
export const ROAST_GUESS: Record<string, string[]> = {
  yes: [
    "Et en plus t'as réécouté ta propre version avant de valider, comme un pro un peu parano.",
    "Auto-contrôle qualité activé : t'as réécouté ta version comme un ingé son sous stress.",
    "Tu as même vérifié ta propre version. La confiance, ça se mérite, apparemment pas tout de suite.",
  ],
  no: [
    "Et tout ça sans même réécouter ta propre version. Soit t'es un génie, soit un inconscient.",
    "Zéro coup d'œil sur ta propre version avant de valider. L'instinct pur, ou l'inconscience pure.",
    "T'as foncé sans réécouter ta version. Le courage ou l'inconscience, difficile à trancher.",
  ],
};
export const ROAST_LOOP: Record<string, string[]> = {
  1: [
    "Une seule écoute de la boucle. Une oreille bionique, ou beaucoup de chance.",
    "Écouté une fois, une seule fois. Soit t'es un métronome humain, soit t'as deviné.",
    "Une écoute et basta. Le rythme n'a rien vu venir.",
  ],
  2: [
    "Deux écoutes de la boucle, le minimum syndical du perfectionniste raisonnable.",
    "Deux passages en boucle, la rigueur normale des gens qui doutent un minimum.",
    "Deux écoutes. On respecte la méthode.",
  ],
  3: [
    "La boucle a tourné un paquet de fois avant que ça rentre. Le rythme a fini par abandonner et se laisser deviner.",
    "Boucle écoutée en boucle en boucle... la patience a fini par payer, à défaut de l'oreille.",
    "Tellement d'écoutes que le hi-hat a demandé une pause.",
  ],
};
