// Catalogue des actions/axes assignables du Mode Live (phase 3, PLAN.md §7)
// — un bouton/axe ne code plus en dur "ce qu'il fait", il pointe vers une de
// ces définitions, et l'association est modifiable depuis l'overlay ⚙ (liste
// scrollable groupée par catégorie plutôt qu'un cycle pas à pas — le
// catalogue est trop large pour ça depuis l'extension PLAN.md §7) puis
// persistée. Type-only import d'AudioEngine (érasé à la compilation) : le
// catalogue reste des données pures, testable sans monter le composant ni
// instancier de contexte audio.
import type { AudioEngine } from '../../engine/AudioEngine';
import type {
  ArpPattern,
  DrumRowName,
  DrumRowState,
  SynthRowName,
  SynthVoice,
  PatternStateV2,
} from '../../model/types';
import { DRUM_ROW_NAMES, SYNTH_ROW_NAMES } from '../../model/types';

/* Le catalogue d'ACTIONS — révisé le 2026-09-02 (docs/plan/05-audit-mode-live).
 *
 * LE PRINCIPE QUI MANQUAIT : un bouton du Mode Live est un GESTE DE SCÈNE,
 * quelque chose qu'on fait PENDANT qu'on joue, d'un pouce, sans regarder. Ce
 * qu'on fait AVANT de jouer — choisir un preset de voix de synthé — est de la
 * préparation, et sa place est dans l'Atelier. L'ancien catalogue mélangeait
 * les deux, et c'est ce qui faisait « des boutons pas très utiles » : six
 * entrées faisaient défiler des presets de voix, ce qu'on ne fait jamais en
 * plein morceau.
 *
 * ⚠️ Le principe ne vaut QUE pour les boutons, pas pour les axes. Un réglage
 * de voix est de la préparation quand il saute d'un cran, et du jeu quand il
 * balaie en continu — un balayage de cutoff sur la basse EST un geste de
 * scène. C'est pour ça que les deux catalogues restent séparés et que
 * `LIVE_AXES` n'a pas bougé.
 *
 * Ce qui est parti, et où : les six MUTE sont dans le séquenceur (on coupe une
 * ligne là où on la voit) ; les six pas de voix sont de la préparation ; les
 * neuf rafales ont fusionné avec les frappes (voir `kind: 'ligne'`).
 *
 * Mesuré : 31 entrées dont 19 variantes (61 %) -> 20 entrées dont 2 (10 %),
 * et le nombre de gestes réellement distincts MONTE.
 */
/* Les identifiants d'ACTION — RÉVISÉS le 2026-09-09 d'après la fiche à cocher
 * (`docs/relecture/parametres-live.html`), en lecture littérale : sur cette
 * fiche, NE RIEN COCHER voulait dire « ce paramètre reste dans l'Atelier ».
 *
 * ⚠️ CE QUI EST PARTI, ET CE N'EST PAS UN OUBLI — dix-huit entrées.
 *  · les cinq FRAPPES DE LIGNE et leur rafale : mesurées d'abord inutiles puis
 *    fausses (une frappe à la main tombe à ±81 à ±334 ms de la grille ; la
 *    rafale ignore le plancher anti-bouillie du moteur, empile deux frappes au
 *    même instant dès qu'il y a du swing, et retourne l'accent de 9 dB —
 *    `docs/plan/09-etat-de-lart-controles-live.md`). Elles reviendront
 *    quantifiées, ou pas du tout ;
 *  · les quatre PAS de groove (swing, ghosts, fills, sidechain) : leur
 *    paramètre est demandé en CURSEUR, pas en paliers ;
 *  · les quatre PAS d'harmonie (ton ±1, gamme ←/→) : rien de coché. Ce sont
 *    aussi les deux dernières entrées `tirable: false` — le drapeau reste, sa
 *    population est vide, et le test le dit plutôt que de se taire ;
 *  · BYPASS LIM. : « un garde-fou, pas un geste de scène » ;
 *  · SATURE et BITCRUSH maintenus : remplacés par le curseur MOMENTANÉ, qui
 *    est le même geste en mieux (il DOSE au lieu de sauter à une valeur) ;
 *  · SANS KICK et BATT. SEULE : les coupures sont demandées dans le mini
 *    séquenceur, là où on voit les lignes.
 *
 * ⚠️ MODE NAPPE est parti le 2026-09-09 avec le lot des GESTES NOMMÉS, et il
 * est REMPLACÉ, pas retiré : ses trois états se sont séparés en les deux
 * commandes que la fiche demandait — BOURDON (« un bouton bourdon qui tient
 * jusqu'à la fin de la partie en cours ») et le curseur ARPÈGE à treize crans.
 * Un cycle à trois états était le seul moyen de tenir leur exclusivité tant
 * qu'ils partageaient un bouton ; séparés, elle se tient dans le moteur, où
 * `setLiveArpege` éteint le bourdon (voir son commentaire). La migration
 * envoie l'ancien identifiant sur BOURDON — c'en est la moitié qui est un
 * BOUTON, l'autre étant devenue un axe. */
export type LiveActionId =
  | 'break'
  | 'fill'
  | 'chaos'
  | 'section-next'
  | 'section-hold'
  | 'mute-drums'
  | 'mute-synth'
  | 'step-fill-auto'
  | 'bourdon'
  | 'petit-hp'
  | 'solo-melody'
  | 'solo-pad'
  | 'solo-bass'
  | 'hold-ouvert'
  | 'hold-filtre'
  | 'hold-reverb';

export interface LiveActionDef {
  id: LiveActionId;
  label: string;
  color: string;
  desc: string;
  /* trigger : un coup au pointerdown · toggle : bascule au pointerdown ·
     hold : actif tant que maintenu · step : avance un paramètre discret d'un
     cran.
     ⚠️ `ligne` (TAP = une frappe à la main, MAINTENU = la rafale) est parti le
     2026-09-09 : mesuré hors grille de ±81 à ±334 ms, et sa rafale ignorait le
     plancher anti-bouillie du moteur. Le geste reviendra quantifié, pas tel
     quel. */
  kind: 'trigger' | 'toggle' | 'hold' | 'step';
  category: string;
  /* Retiré du tirage 🎲 sans être retiré du catalogue : les entrées MIROIR
     (TON −1, GAMME ←) servent quand on les assigne à la main, mais les tirer
     au hasard revenait à poser deux fois le même bouton. Le tirage
     uniforme d'avant posait deux rafales côte à côte 56 % du temps. */
  tirable?: boolean;
  // Uniquement pour kind:'step' — l'entrée porte directement son geste.
  step?: (engine: AudioEngine) => void;
  /* Uniquement pour kind:'hold' — appelé à l'appui (on = true) ET au relâché
     (on = false). L'entrée porte donc son geste ET son retour au repos : c'est
     ce qui rend un maintien sûr, un doigt qui glisse hors du bouton relâche. */
  hold?: (engine: AudioEngine, on: boolean, base: PatternStateV2) => void;

  /* ⚠️ CE MAINTENU EST CÂBLÉ DANS LA VUE, pas ici — il touche l'état de
     l'écran (quelle ligne le pad joue, la boucle de scène) et pas seulement le
     moteur, donc il ne peut pas tenir dans une fonction qui ne reçoit que le
     moteur. Le drapeau vit dans la DONNÉE et non dans une liste d'exceptions
     écrite au milieu d'un test : une exception qu'on ne voit qu'en lisant un
     test est une exception que personne ne voit (CLAUDE.md) — et cette liste-là
     aurait été à rallonger à chaque solo ajouté, en silence. */
  dansLaVue?: true;

  /* ⚠️ LE RETOUR D'UNE ACTION QUI LATCHE (2026-09-09, retour de Yann après
   * test : « quand on bascule un paramètre — exemple : arpégiateur — il faut
   * qu'on puisse revenir comme c'était avant d'une manière ou d'une autre »).
   *
   * Un `hold` sait revenir : son relâché EST son retour. Une BASCULE ou un PAS,
   * non — ils laissent le morceau dans l'état où le dernier appui l'a mis, et
   * plus rien ne le défait. Les entrées concernées portent donc `repos`, appelé
   * quand le bouton CHANGE d'assignation et à chaque bascule de scène.
   * Déclencheurs et maintenus n'en ont pas besoin : ils ne latchent rien. */
  repos?: (engine: AudioEngine, base: PatternStateV2) => void;
}

/* Le prochain palier au-dessus de `v`, en bouclant sur le premier.
 *
 * ⚠️ La première version faisait `paliers[(findIndex(x => x > v - 1) + 1) % n]`,
 * et elle ne marchait que si `v` tombait PILE sur un palier — ce qui était le
 * cas du swing, des ghosts et des fills par défaut, donc trois tests verts sur
 * quatre. Le sidechain part à 0,6 : le bouton renvoyait 0 au lieu de 1, soit un
 * cran EN ARRIÈRE au premier appui. Mesuré, pas relu. */
/* Les crans du bouton FILLS, dans l'ordre où il les fait défiler — de rien
   vers le plus fourni, comme la note le demande. Ce sont AUSSI, à l'ordre
   près, les seules valeurs que `serialize.ts` accepte pour `fillEvery` : la
   liste n'invente pas de paliers, elle range ceux du modèle. */
export const CRANS_FILL = [0, 8, 4, 2];

export function palierSuivant(paliers: number[], v: number): number {
  const eps = (paliers[paliers.length - 1] - paliers[0]) / 1000;
  const i = paliers.findIndex((x) => x > v + eps);
  return i === -1 ? paliers[0] : paliers[i];
}

export const LIVE_ACTIONS: LiveActionDef[] = [
  { id: 'break', label: 'BREAK', color: 'var(--cell-kick)', desc: 'Break (déclencheur)', kind: 'trigger', category: 'SCÈNE' },
  { id: 'fill', label: 'FILL', color: 'var(--cell-snare)', desc: 'Fill forcé (déclencheur)', kind: 'trigger', category: 'SCÈNE' },
  // Un paramètre du catalogue d'axes tiré au hasard, valeur aléatoire, à
  // chaque appui — pas de nouveau bouton dédié, juste une entrée du même
  // catalogue assignable comme les autres.
  { id: 'chaos', label: 'CHAOS', color: '#ffb020', desc: 'Chaos — 1 paramètre au hasard', kind: 'trigger', category: 'SCÈNE' },
  /* Les deux gestes de la bande d'architecture, sous le pouce plutôt qu'à
     l'autre bout de l'écran. Sans architecture chargée ils ne font rien —
     c'est le seul cas où une action est inerte, et il est visible : la bande
     n'est pas là. */
  { id: 'section-next', label: 'SUIVANT ▸', color: 'var(--cell-clap)', desc: 'Scène suivante (à la mesure)', kind: 'trigger', category: 'SCÈNE' },
  { id: 'section-hold', label: 'TENIR', color: 'var(--cell-clap)', desc: 'Boucler la scène (maintenu)', kind: 'hold', category: 'SCÈNE', dansLaVue: true },


  /* Le geste du DROP. Le séquenceur coupe ligne par ligne ; couper tout un
     groupe d'un coup n'y est pas faisable en un tap, et c'est le geste le
     plus courant d'un set. */
  {
    id: 'mute-drums', label: 'COUPER BATT.', color: 'var(--cell-kick)',
    desc: 'Couper toute la batterie (bascule)', kind: 'toggle', category: 'COUPURES',
    // `null` = suivre le motif : une ligne coupée dans l'Atelier le reste.
    repos: (e) => DRUM_ROW_NAMES.forEach((n) => e.liveSetMute(n, null)),
  },
  {
    id: 'mute-synth', label: 'COUPER SYNTHÉ', color: 'var(--cell-bass)',
    desc: 'Couper tout le synthé (bascule)', kind: 'toggle', category: 'COUPURES',
    repos: (e) => SYNTH_ROW_NAMES.forEach((n) => e.liveSetSynthMute(n, null)),
  },


  /* BOURDON — la note tenue, et le seul bouton du mode dont l'extinction est
     une DATE plutôt qu'un second appui : « un bouton bourdon qui tient jusqu'à
     la fin de la partie en cours ». Rien ici ne compte les mesures — c'est
     `relacherReglagesLive()` que la bascule de scène appelle déjà qui l'éteint,
     et `repos` fait le même travail à la réassignation. Le bouton reste une
     BASCULE : on peut le couper avant la fin de la partie, sinon un geste
     lancé par erreur dure jusqu'à la frontière. */
  {
    id: 'bourdon', label: 'BOURDON', color: 'var(--cell-pad)',
    desc: 'La nappe tient jusqu’à la fin de la partie', kind: 'toggle', category: 'NAPPE',
    repos: (e) => e.clearLiveBourdon(),
  },

  /* LE FILL AUTOMATIQUE — « un PAS avec 8 4 2 mais aussi PAS DE FILL si on
     souhaite le retirer » (fiche à cocher). L'ordre suit la note : de plus en
     plus fourni, en partant de rien.

     ⚠️ Il avance par INDEX, contrairement à ce que `palierSuivant` impose
     ailleurs — et c'est légitime ici pour une raison qui se vérifie :
     `serialize.ts` n'accepte QUE [0, 2, 4, 8] pour ce champ et rabat tout le
     reste sur 0, donc la valeur de départ tombe TOUJOURS pile sur un cran,
     ce qui était exactement la condition que le sidechain ne remplissait pas.
     `palierSuivant` ferait d'ailleurs le contraire du geste demandé : il
     monterait 0 → 2 → 4 → 8, c'est-à-dire du plus fourni au plus rare. */
  {
    id: 'step-fill-auto', label: 'FILLS', color: 'var(--cell-snare)',
    desc: 'Aucun → toutes les 8 → 4 → 2 mesures', kind: 'step', category: 'GROOVE',
    step: (e) => {
      const i = CRANS_FILL.indexOf(e.grooveValeur('fillEvery'));
      e.setLiveGrooveParam('fillEvery', CRANS_FILL[(i + 1) % CRANS_FILL.length]);
    },
    repos: (e) => e.clearLiveGrooveParam('fillEvery'),
  },

  // Le petit haut-parleur de l'acte 4 : il existait dans le moteur et n'avait
  // jamais été exposé au Live, où il est un outil d'écoute évident.
  {
    id: 'petit-hp', label: 'PETIT HP', color: '#8fa1b3',
    desc: 'Écoute petit haut-parleur (bascule)', kind: 'toggle', category: 'MIX',
    // Une façon d'ÉCOUTER, pas un réglage de morceau : le repos est le grand HP.
    repos: (e) => e.setPetitHautParleur(false),
  },

  // Maintenu : le temps de l'appui, le pad joue la mélodie au doigt (glisser =
  // degré de gamme + octave), et la mélodie programmée est coupée pour ne pas
  // se télescoper avec ce qui est joué à la main.
  { id: 'solo-melody', label: 'SOLO MÉLO', color: 'var(--cell-melody)', desc: 'Jouer la mélodie au pad (maintenu)', kind: 'hold', category: 'PERFORMANCE', dansLaVue: true },
  /* « Il faut également SOLO NAPPE » — et sa voisine sur la fiche, « à faire
     sur l'ensemble des lignes de synthé ». Mêmes maintenus que SOLO MÉLO,
     donc même lecture du mot SOLO : JOUER la ligne au pad, pas l'isoler.
     C'est ce que fait le bouton qui portait déjà ce nom, et deux boutons qui
     commencent par le même mot doivent faire la même chose.
     ⚠️ La nappe balaie des ACCORDS (un index dans `chordsFor`), pas des
     degrés — c'est la règle du modèle, et c'est aussi ce qui la rend jouable
     au doigt : quatre accords sur une largeur de pad se visent, sept degrés
     × trois octaves non. */
  { id: 'solo-pad', label: 'SOLO NAPPE', color: 'var(--cell-pad)', desc: 'Jouer les accords au pad (maintenu)', kind: 'hold', category: 'PERFORMANCE', dansLaVue: true },
  { id: 'solo-bass', label: 'SOLO BASSE', color: 'var(--cell-bass)', desc: 'Jouer la basse au pad (maintenu)', kind: 'hold', category: 'PERFORMANCE', dansLaVue: true },

  /* ---- LES MAINTENUS ----
   *
   * ⚠️ Chaque entrée porte son ALLER *et* son RETOUR. Un maintien qui ne sait
   * pas revenir au repos laisse le morceau dans l'état où le doigt l'a lâché —
   * et un doigt glisse. Le retour relit `base` (le morceau), jamais une valeur
   * gravée : rouvrir le filtre à 20 kHz serait faux si le morceau le ferme.
   *
   * ⚠️ Filtre et réverbe écrivent les MÊMES nœuds que le pad et l'inclinaison
   * (`liveFilter`, `liveReverbSend`). C'est voulu et c'est la convention du
   * mode depuis toujours : la dernière source qui écrit fait foi. */
  {
    id: 'hold-filtre', label: 'FILTRE', color: '#7fd4ff',
    desc: 'Ferme le passe-bas tant qu’on tient', kind: 'hold', category: 'MAINTENUS',
    hold: (e, on) => e.setLiveFilterCutoff(on ? 320 : 20000),
  },
  {
    id: 'hold-reverb', label: 'RÉVERBE', color: '#7fd4ff',
    desc: 'Noie dans la réverbe tant qu’on tient', kind: 'hold', category: 'MAINTENUS',
    hold: (e, on) => e.setLiveReverbWet(on ? 0.85 : 0),
  },
  /* OUVERT — le charley s'ouvre tant qu'on tient. Il n'allume aucun pas :
     ouvrir ce qui sonne déjà est un geste de TIMBRE, allumer un pas serait un
     geste d'écriture, et c'est celui que la mesure a fait retirer du mode. */
  {
    id: 'hold-ouvert', label: 'OUVERT', color: 'var(--cell-hat)',
    desc: 'Ouvre le charley tant qu’on tient', kind: 'hold', category: 'MAINTENUS',
    hold: (e, on) => e.liveSetHatOuvert(on),
  },

];

// Catalogue d'axes — étendu très largement (PLAN.md §7, demande explicite de
// Yann : « une liste assez longue ») : groove, bus batterie, mix, et la quasi
// totalité des réglages de voix synthé par ligne, plutôt qu'un sous-ensemble
// choisi pour nous. `id` reste une chaîne simple (pas un union littéral géant
// à maintenir à la main) : les entrées par ligne synthé sont générées, et la
// validité est de toute façon vérifiée à l'exécution (AXIS_IDS) — même
// principe que pour la persistance localStorage plus bas.
export type LiveAxisId = string;

export interface LiveAxisDef {
  id: LiveAxisId;
  label: string;
  // Regroupement dans le panneau de sélection (voir AssignPicker côté UI) —
  // pas de catégorie = liste plate (utilisé pour les macros historiques).
  category?: string;
  // Le catalogue sait lui-même quoi faire de la valeur 0..1 (courbe, plage,
  // quel setter d'AudioEngine appeler) — LiveView n'a plus qu'à appeler
  // axisById(id).apply(engine, value01).
  apply: (engine: AudioEngine, value01: number) => void;
  /* ⚠️ LE RETOUR AU MORCEAU — ce qui rend un curseur MOMENTANÉ possible.
   *
   * Même rôle que la seconde moitié d'un `hold` : le doigt lâche, et le
   * réglage revient à ce que dit le MORCEAU. Là où l'axe passe par un override
   * du moteur, le retour est de l'EFFACER — la couche du dessous redevient
   * visible, quelle qu'elle soit ; écrire `base.swing` marcherait aujourd'hui
   * et serait faux au premier changement de scène. Les deux macros historiques
   * (filtre, réverbe) ont des nœuds à elles, toujours neutres ailleurs : leur
   * repos est le neutre, exactement ce que faisaient déjà HOLD FILTRE et HOLD
   * RÉVERBE.
   *
   * Un axe SANS `repos` ne peut pas être momentané, et le sélecteur refuse de
   * le proposer — un maintien qui ne sait pas revenir laisse le morceau là où
   * le doigt l'a lâché, et un doigt glisse. */
  repos?: (engine: AudioEngine, base: PatternStateV2) => void;

  /* ⚠️ UN AXE CRANTÉ DIT SON CRAN, JAMAIS UN POURCENTAGE (2026-09-09, fiche à
   * cocher : « je ferais un curseur avec (3 × 4 + 1) = 13 options d'arpège
   * différentes »).
   *
   * Un curseur continu peut s'afficher en % : 40 % de brillance veut dire
   * quelque chose. Un curseur qui CHOISIT dans une liste, non — « 38 % »
   * d'arpège ne nomme rien, et sur cette surface ce qui n'est pas ÉCRIT
   * n'existe pas (troisième fois que ça se paie). `crans` quantifie la course
   * et `libelle` donne le mot que le bouton affiche à la place du chiffre.
   *
   * Les deux vont ENSEMBLE : un axe cranté sans libellé montrerait des
   * pourcentages qui sautent, ce qui est pire que les deux. */
  crans?: number;
  libelle?: (value01: number) => string;
}

/* Le cran d'un axe cranté, et le seul endroit qui fait cette division —
   `apply`, `libelle` et l'affichage doivent tomber sur le MÊME entier, sinon
   le bouton nomme un cran et en joue un autre. Le `min` borne le 1,0 du bout
   de course, qui sinon donnerait un index hors liste. */
export function cranDe(value01: number, crans: number): number {
  return Math.min(crans - 1, Math.floor(value01 * crans));
}

const linMap = (min: number, max: number, value01: number) => min + (max - min) * value01;
const expMap = (min: number, max: number, value01: number) => min * Math.pow(max / min, value01);

const LINE_LABEL: Record<SynthRowName, string> = { bass: 'BASSE', pad: 'NAPPE', melody: 'MÉLODIE' };
const LINE_SHORT: Record<SynthRowName, string> = { bass: 'BASSE', pad: 'NAPPE', melody: 'MÉLO' };

/* Les réglages de voix par ligne — RÉVISÉ le 2026-09-09 sur la fiche à cocher
 * (`docs/relecture/parametres-live.html`).
 *
 * ⚠️ LES MACROS DE L'ATELIER GAGNENT CONTRE LES PARAMÈTRES BRUTS. L'Atelier
 * n'expose pas `cutoff`, `filterEnvAmount` et `filterEnvRelease` : il expose
 * BRILLANCE et MOUVEMENT, deux macros nommées qui les pilotent (SynthRowView).
 * Le Live montrait les trois champs bruts — trois entrées de catalogue pour
 * deux idées, sous des noms qu'aucun écran n'emploie. On porte les macros
 * telles quelles, sous leur nom, et les bruts s'en vont : c'est mot pour mot ce
 * que font Circuit et Ableton, et l'Atelier avait déjà fait le travail.
 * `brillance` reprend d'ailleurs EXACTEMENT la courbe de l'ancien `cutoff`
 * (100→4000 Hz en log, CUT_MIN/CUT_MAX de SynthRowView) : c'est un
 * renommage, pas un nouveau réglage — d'où la correspondance de migration.
 *
 * Sont aussi partis : `resonance` (aucun curseur de l'Atelier ne l'expose) et
 * le vibrato par ligne, remplacé par UN axe d'ensemble (« pourquoi pas tester
 * un pad sur l'ensemble ? »). 15 entrées par ligne -> 10. */
function synthAxesFor(name: SynthRowName): LiveAxisDef[] {
  const category = LINE_LABEL[name];
  const s = LINE_SHORT[name];
  const voix = (key: keyof SynthVoice, valeur: (v: number) => unknown) => ({
    apply: (e: AudioEngine, v: number) => e.setLiveSynthVoiceParam(name, key, valeur(v) as never),
    repos: (e: AudioEngine) => e.clearLiveSynthVoiceParam(name, key),
  });
  const defs: LiveAxisDef[] = [
    // La macro de l'Atelier, sous son nom : 100 -> 4000 Hz en log.
    { id: `brillance-${name}`, label: `BRILLANCE ${s}`, category, ...voix('cutoff', (v) => expMap(100, 4000, v)) },
    /* MOUVEMENT pilote DEUX champs ensemble, et c'est tout l'intérêt : « à
       faible mouvement une fermeture longue ne s'entend pas, à fort mouvement
       une fermeture instantanée fait un clic » (SynthRowView). Les mêmes deux
       formules, pas une troisième inventée pour le direct. */
    {
      id: `mouvement-${name}`,
      label: `MOUVEMENT ${s}`,
      category,
      apply: (e, v) => {
        e.setLiveSynthVoiceParam(name, 'filterEnvAmount', linMap(0, 4000, v));
        e.setLiveSynthVoiceParam(name, 'filterEnvRelease', linMap(0.05, 0.6, v));
      },
      repos: (e) => {
        e.clearLiveSynthVoiceParam(name, 'filterEnvAmount');
        e.clearLiveSynthVoiceParam(name, 'filterEnvRelease');
      },
    },
    { id: `attack-${name}`, label: `ATTACK ${s}`, category, ...voix('attack', (v) => linMap(0, 0.2, v)) },
    { id: `release-${name}`, label: `RELEASE ${s}`, category, ...voix('release', (v) => linMap(0, 4, v)) },
    { id: `subgain-${name}`, label: `SUB ${s}`, category, ...voix('subGain', (v) => v) },
    { id: `detune-${name}`, label: `DÉTUNE ${s}`, category, ...voix('detuneCents', (v) => linMap(0, 30, v)) },
    { id: `detune-mix-${name}`, label: `MIX DÉT. ${s}`, category, ...voix('detuneGain', (v) => v) },
    { id: `chorus-${name}`, label: `CHORUS ${s}`, category, ...voix('chorusMix', (v) => v) },
    { id: `tone-${name}`, label: `SATURATION ${s}`, category, ...voix('tone', (v) => linMap(0, 100, v)) },
    {
      id: `glide-${name}`,
      label: `GLIDE ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthRowParam(name, 'glide', v),
      repos: (e) => e.clearLiveSynthRowParam(name, 'glide'),
    },
  ];
  if (name === 'pad') {
    defs.push({
      id: 'strum-pad',
      label: 'ÉTALEMENT',
      category,
      apply: (e, v) => e.setLiveSynthRowParam('pad', 'strum', v),
      repos: (e) => e.clearLiveSynthRowParam('pad', 'strum'),
    });
  }
  return defs;
}

/* ---- LES RÉGLAGES PAR LIGNE (2026-09-09) ----
 *
 * ⚠️ C'est la rangée de knobs d'une table de mixage, et c'est ce que la fiche
 * demande le plus fort : « un filtre par ligne, ça permet de filtrer la basse
 * en gardant le kick net — ce que le filtre global ne peut pas faire ». Les
 * tables Pioneer posent un Color FX par voie ; le TR-8S un knob CTRL par
 * instrument. Nous n'avions que du global.
 *
 * ⚠️ TROIS LIGNES, PAS CINQ — « en curseur par ligne ? pas forcément toutes les
 * lignes ». On prend celles que la surface MONTRE déjà (le mini séquenceur du
 * Live affiche kick, caisse, charley) : un réglage qu'on ne voit pas se régler
 * est un réglage qu'on ne trouve pas. Six réglages × trois lignes font
 * dix-huit entrées ; les cinq lignes en auraient fait trente, sur un catalogue
 * qu'on vient justement de dégraisser.
 *
 * ⚠️ L'ATTAQUE est absente ALORS QU'ELLE EST COCHÉE — elle porte deux coches
 * qui se contredisent (PAR LIGNE *et* ATELIER), et seule la seconde porte un
 * argument : « un réglage de son, qu'on trouve une fois pour toutes ». On suit
 * l'argument plutôt que le compte ; elle rentrera d'un mot. */
const DRUM_LABEL: Record<DrumRowName, string> = {
  kick: 'KICK',
  snare: 'CAISSE',
  hat: 'CHARLEY',
  clap: 'CLAP',
  shaker: 'SHAKER',
};

/* Les lignes qui reçoivent des réglages en direct. Clap et shaker en sont
   dehors : la surface ne les montre pas. */
export const LIGNES_REGLABLES: DrumRowName[] = ['kick', 'snare', 'hat'];

function drumAxesFor(name: DrumRowName): LiveAxisDef[] {
  const category = `LIGNE ${DRUM_LABEL[name]}`;
  const s = DRUM_LABEL[name];
  /* Mêmes champs, mêmes bornes et mêmes unités que les pastilles Séquence et
     Timbre de l'Atelier (DrumRowView.svelte) — le Live n'invente pas une
     seconde échelle pour le même bouton. */
  const champ = (key: keyof DrumRowState, valeur: (v: number) => number) => ({
    apply: (e: AudioEngine, v: number) => e.setLiveDrumParam(name, key, valeur(v) as never),
    repos: (e: AudioEngine) => e.clearLiveDrumParam(name, key),
  });
  /* Les envois passent par le NŒUD, pas par l'override : leur repos relit donc
     le morceau au lieu d'effacer une couche. C'est ce qui rend le « throw » de
     réverbe juste — on noie une frappe, on lâche, la ligne revient à son
     envoi d'origine. */
  const envoi = (quoi: 'reverb' | 'delay') => ({
    apply: (e: AudioEngine, v: number) => e.setLiveLineSend(name, quoi, v),
    repos: (e: AudioEngine, base: PatternStateV2) =>
      e.setLiveLineSend(name, quoi, (quoi === 'reverb' ? base.rows[name].reverbSend : base.rows[name].delaySend) || 0),
  });
  return [
    // 0 à 1 comme le curseur de l'Atelier (qui l'affiche en 0-100 %).
    { id: `volume-${name}`, label: `VOLUME ${s}`, category, ...champ('volume', (v) => v) },
    { id: `filtre-${name}`, label: `FILTRE ${s}`, category, ...champ('filterCutoff', (v) => expMap(200, 20000, v)) },
    { id: `reverb-${name}`, label: `RÉVERBE ${s}`, category, ...envoi('reverb') },
    { id: `delay-${name}`, label: `DELAY ${s}`, category, ...envoi('delay') },
    // ±24 demi-tons, cran central : le milieu du curseur rend la hauteur d'origine.
    { id: `pitch-${name}`, label: `PITCH ${s}`, category, ...champ('pitch', (v) => Math.round(linMap(-24, 24, v))) },
    { id: `decay-${name}`, label: `DECAY ${s}`, category, ...champ('decay', (v) => Math.round(linMap(-50, 50, v))) },
    // Le décalage ne s'entend que CONTRE un point fixe : c'est tout l'intérêt
    // de l'avoir par ligne (« faire glisser le charley contre le kick »).
    { id: `decalage-${name}`, label: `DÉCALAGE ${s}`, category, ...champ('shiftPct', (v) => Math.round(linMap(-50, 50, v))) },
  ];
}

/** Les envois d'une ligne de SYNTHÉ — mêmes nœuds, même repos. */
function synthSendsFor(name: SynthRowName): LiveAxisDef[] {
  const category = LINE_LABEL[name];
  const s = LINE_SHORT[name];
  const envoi = (quoi: 'reverb' | 'delay') => ({
    apply: (e: AudioEngine, v: number) => e.setLiveLineSend(name, quoi, v),
    repos: (e: AudioEngine, base: PatternStateV2) =>
      e.setLiveLineSend(
        name,
        quoi,
        (quoi === 'reverb' ? base.synthRows[name].reverbSend : base.synthRows[name].delaySend) || 0,
      ),
  });
  return [
    /* 0 à 1,5 comme le curseur de l'Atelier — le synthé monte au-dessus de 1,
       pas la batterie. Le repos relit le morceau : c'est un nœud, pas un
       override. */
    {
      id: `volume-${name}`,
      label: `VOLUME ${s}`,
      category,
      apply: (e, v) => e.setLiveSynthLineVolume(name, v * 1.5),
      repos: (e, base) => e.setLiveSynthLineVolume(name, base.synthRows[name].volume),
    },
    { id: `reverb-${name}`, label: `RÉVERBE ${s}`, category, ...envoi('reverb') },
    { id: `delay-${name}`, label: `DELAY ${s}`, category, ...envoi('delay') },
  ];
}

/** Le même réglage de voix sur LES TROIS lignes de synthé à la fois. */
function ensembleSynthe(
  id: string,
  label: string,
  key: keyof SynthVoice,
  valeur: (v: number) => unknown,
): LiveAxisDef {
  return {
    id,
    label,
    category: 'SYNTHÉ (ENSEMBLE)',
    apply: (e, v) => SYNTH_ROW_NAMES.forEach((n) => e.setLiveSynthVoiceParam(n, key, valeur(v) as never)),
    repos: (e) => SYNTH_ROW_NAMES.forEach((n) => e.clearLiveSynthVoiceParam(n, key)),
  };
}

/* Le catalogue d'AXES — révisé le 2026-09-09 d'après la fiche à cocher.
 *
 * ⚠️ CE QUI EST PARTI, ET POURQUOI CE N'EST PAS UN OUBLI. Sept entrées n'ont
 * rien de coché sur la fiche, et « ne rien cocher » y était une réponse : le
 * paramètre reste dans l'Atelier. Sont donc sortis SWING, TRAÎNE, INT. FILL,
 * COMP. BATT., VOLUME et SIDECHAIN — plus les paramètres bruts que BRILLANCE
 * et MOUVEMENT remplacent. Le catalogue passe de 55 à 42 entrées, et la part
 * des réglages de voix de 78 % à 74 % : c'est ce qui rend le tirage 🎲 moins
 * absurde, puisqu'il tire là-dedans.
 *
 * ⚠️ Le FILTRE et la RÉVERBE globaux restent, et ce n'est pas une entorse : la
 * fiche ne les posait pas (ses cartes « filtre passe-bas » et « envoi réverbe »
 * parlent des réglages PAR LIGNE, à venir). Ce sont les deux nœuds dédiés du
 * Live, et le filtre est le seul paramètre que Yann dit utiliser.
 *
 * ⚠️ Un axe coché CURSEUR reste assignable au PAD, et inversement : les deux
 * lisent le même catalogue. Ne pas cocher PAD veut dire « pas par défaut »,
 * pas « rendu impossible » — séparer les deux listes demanderait deux
 * catalogues qui devraient rester d'accord, ce que ce fichier passe déjà son
 * temps à éviter. */
/* LES TREIZE CRANS DE L'ARPÈGE — « aucun arpège, 2/4/8 notes & montant,
 * descendant, aller-retour, aléatoire » (fiche à cocher, note de Yann sur
 * g8.2/g8.3, qui demandait DEUX boutons PAS et devient UN curseur).
 *
 * ⚠️ L'ORDRE EST LE DÉBIT D'ABORD, et c'est ce qui fait du curseur un GESTE.
 * La fiche vendait le débit comme « un geste de montée évident » : rangé
 * ainsi, pousser le curseur vers la droite accélère la nappe (2 → 4 → 8), et
 * les quatre motifs se promènent à l'intérieur de chaque palier. Rangé par
 * motif, la même course aurait fait trois montées en dents de scie.
 *
 * AUCUN est en PREMIER, au repos du curseur, parce que c'est l'état d'un
 * morceau qui n'a rien demandé — un curseur d'effet dont le bout gauche
 * allume déjà l'effet n'a pas de position neutre. */
export const CRANS_ARPEGE: { rate: number | null; pattern: ArpPattern; label: string }[] = [
  { rate: null, pattern: 'up', label: 'AUCUN' },
  { rate: 2, pattern: 'up', label: '2 ▲' },
  { rate: 2, pattern: 'down', label: '2 ▼' },
  { rate: 2, pattern: 'updown', label: '2 ▲▼' },
  { rate: 2, pattern: 'random', label: '2 ⁇' },
  { rate: 4, pattern: 'up', label: '4 ▲' },
  { rate: 4, pattern: 'down', label: '4 ▼' },
  { rate: 4, pattern: 'updown', label: '4 ▲▼' },
  { rate: 4, pattern: 'random', label: '4 ⁇' },
  { rate: 8, pattern: 'up', label: '8 ▲' },
  { rate: 8, pattern: 'down', label: '8 ▼' },
  { rate: 8, pattern: 'updown', label: '8 ▲▼' },
  { rate: 8, pattern: 'random', label: '8 ⁇' },
];

export const LIVE_AXES: LiveAxisDef[] = [
  /* L'ARPÈGE DE LA NAPPE — le seul axe CRANTÉ du catalogue. Il choisit dans
     une liste au lieu de doser une valeur, donc il affiche son cran. */
  {
    id: 'arp-nappe',
    label: 'ARPÈGE',
    category: 'NAPPE',
    crans: CRANS_ARPEGE.length,
    libelle: (v) => CRANS_ARPEGE[cranDe(v, CRANS_ARPEGE.length)].label,
    apply: (e, v) => e.setLiveArpege(CRANS_ARPEGE[cranDe(v, CRANS_ARPEGE.length)]),
    repos: (e) => e.clearLiveArpege(),
  },

  // Macros live historiques (phase 2) — nœuds de graphe dédiés
  // (liveFilter/liveReverbSend, graph.ts), toujours neutres ailleurs. Leur
  // repos EST le neutre : c'est ce que faisaient déjà les maintenus.
  {
    id: 'filter',
    label: 'FILTRE',
    apply: (e, v) => e.setLiveFilterCutoff(expMap(200, 20000, v)),
    repos: (e) => e.setLiveFilterCutoff(20000),
  },
  { id: 'reverb', label: 'REVERB', apply: (e, v) => e.setLiveReverbWet(v), repos: (e) => e.setLiveReverbWet(0) },

  /* Groove — mêmes champs et mêmes unités que les curseurs Groove de
     l'Atelier. RAFALES SPONT., VÉLOCITÉ ALÉA. et SWING SYNTHÉ sont entrés le
     2026-09-09 : trois curseurs demandés, trois champs qui existaient déjà
     dans `PatternStateV2` et que `withLiveOverrides` applique sans une ligne
     de moteur en plus. */
  {
    id: 'ghost-density',
    label: 'GHOST NOTES',
    category: 'GROOVE',
    apply: (e, v) => e.setLiveGrooveParam('ghostDensity', linMap(0, 40, v)),
    repos: (e) => e.clearLiveGrooveParam('ghostDensity'),
  },
  {
    id: 'spont-roll',
    label: 'RAFALES SPONT.',
    category: 'GROOVE',
    apply: (e, v) => e.setLiveGrooveParam('spontRoll', linMap(0, 100, v)),
    repos: (e) => e.clearLiveGrooveParam('spontRoll'),
  },
  {
    id: 'random-velocity',
    label: 'VÉLOCITÉ ALÉA.',
    category: 'GROOVE',
    apply: (e, v) => e.setLiveGrooveParam('randomVelocity', linMap(0, 100, v)),
    repos: (e) => e.clearLiveGrooveParam('randomVelocity'),
  },
  {
    id: 'synth-swing',
    label: 'SWING SYNTHÉ',
    category: 'GROOVE',
    apply: (e, v) => e.setLiveGrooveParam('synthSwing', linMap(0, 75, v)),
    repos: (e) => e.clearLiveGrooveParam('synthSwing'),
  },

  // Bus DRUM uniquement (globalSaturation/globalBitcrush, model/types.ts) —
  // pas le mix entier. Pas d'override : on écrit le nœud, donc le repos relit
  // le morceau.
  {
    id: 'saturation',
    label: 'SATUR. BATT.',
    category: 'BUS BATTERIE',
    apply: (e, v) => e.setLiveSaturation(v),
    repos: (e, base) => e.setLiveSaturation(base.globalSaturation / 100),
  },
  {
    id: 'bitcrush',
    label: 'CRUSH BATT.',
    category: 'BUS BATTERIE',
    apply: (e, v) => e.setLiveBitcrush(v),
    repos: (e, base) => e.setLiveBitcrush(base.globalBitcrush / 100),
  },

  {
    id: 'delay-feedback',
    label: 'DELAY FB',
    category: 'MIX',
    apply: (e, v) => e.setLiveDelayFeedback(v),
    repos: (e, base) => e.setLiveDelayFeedback(base.synthGlobal.delayFeedback / 100),
  },

  // Les deux réglages de voix demandés « sur l'ensemble des lignes de synthé ».
  ensembleSynthe('tone-synthe', 'SATURATION SYNTHÉ', 'tone', (v) => linMap(0, 100, v)),
  ensembleSynthe('vibrato-synthe', 'VIBRATO SYNTHÉ', 'vibratoDepth', (v) => v),

  // Les réglages PAR LIGNE — la rangée de knobs. Avant les voix de synthé
  // dans la liste, parce que ce sont des gestes de scène et pas des réglages
  // de son : le sélecteur se lit du plus jouable au plus fin.
  ...LIGNES_REGLABLES.flatMap(drumAxesFor),

  // Voix synthé, une catégorie par ligne — envois d'abord, pour la même raison.
  ...synthSendsFor('bass'),
  ...synthAxesFor('bass'),
  ...synthSendsFor('pad'),
  ...synthAxesFor('pad'),
  ...synthSendsFor('melody'),
  ...synthAxesFor('melody'),
];

// Regroupe une liste d'entrées de catalogue par catégorie, dans l'ordre
// d'apparition — pour le panneau de sélection (trop d'entrées pour une liste
// plate lisible, aussi bien côté axes que côté actions depuis leur extension
// respective, PLAN.md §7).
function groupByCategory<T extends { category?: string }>(items: T[], fallback: string): { name: string; items: T[] }[] {
  const order: string[] = [];
  const byName = new Map<string, T[]>();
  for (const item of items) {
    const name = item.category ?? fallback;
    if (!byName.has(name)) {
      byName.set(name, []);
      order.push(name);
    }
    byName.get(name)!.push(item);
  }
  return order.map((name) => ({ name, items: byName.get(name)! }));
}

export interface LiveAxisGroup {
  name: string;
  items: LiveAxisDef[];
}

// Les deux macros historiques (filtre/reverb, sans catégorie) forment un
// groupe "MACRO" implicite en tête de liste.
export const AXIS_GROUPS: LiveAxisGroup[] = groupByCategory(LIVE_AXES, 'MACRO');

export interface LiveActionGroup {
  name: string;
  items: LiveActionDef[];
}

export const ACTION_GROUPS: LiveActionGroup[] = groupByCategory(LIVE_ACTIONS, 'AUTRE');

// Les 3 visualiseurs explorés dans la maquette (proposition-Mode-Live) — un
// seul retenu au départ (①, phase 2), les deux autres ajoutés en option ici
// plutôt qu'abandonnés (PLAN.md §7).
export type LiveVizId = 'bars' | 'arty' | 'runner';

export interface LiveVizDef {
  id: LiveVizId;
  label: string;
}

export const LIVE_VIZ: LiveVizDef[] = [
  { id: 'bars', label: 'BARRES' },
  { id: 'arty', label: 'ARTY' },
  { id: 'runner', label: 'RUN' },
];

export const SLOT_COUNT = 6;

// Chaque bouton peut fonctionner en mode ACTIONS (catalogue LIVE_ACTIONS —
// interrupteur/pas/déclencheur/maintenu) ou en mode FADER (catalogue
// LIVE_AXES, comme le pad/l'inclinaison, mais piloté par un glisser vertical
// sur le bouton lui-même — PLAN.md §7, retour de Yann : « j'agence les
// boutons selon 3 types »). Les deux catalogues restent SÉPARÉS par bouton
// plutôt que mélangés dans un seul tableau : les gestes (tap/hold pour les
// actions, glisser continu pour le fader) sont incompatibles sur la même
// surface au même moment.
export type SlotMode = 'actions' | 'fader';

// Orientation du glisser en mode FADER (PLAN.md §7, retour de Yann : « un
// type de bouton où c'est un fader gauche-droite au sein du bouton, où
// haut-bas, à voir le plus simple ») — un champ par bouton, à côté de
// slotModes, ignoré tant que le bouton n'est pas en mode fader (même
// convention que slotFaders).
export type FaderOrientation = 'vertical' | 'horizontal';

// Chaque bouton/axe peut désormais porter PLUSIEURS entrées du catalogue à la
// fois (PLAN.md §7, retour de Yann : « on peut assigner plusieurs paramètres
// à un même contrôleur ») — un bouton peut déclencher plusieurs actions d'un
// coup, un axe peut piloter plusieurs paramètres ensemble (macro). Toujours
// au moins une entrée par slot/axe : jamais de tableau vide, sinon le
// panneau de sélection perdrait toute trace de ce qui est assigné.
export interface LiveAssignments {
  /* Il n'y a plus de verrou, ni par bouton ni pour le pad — et plus de
     brassage total non plus (arbitrage de Yann, 2026-08-19).
     Le raisonnement, dans cet ordre : le dé PAR bouton rend le brassage total
     inutile, or le verrou n'existait QUE pour protéger du brassage total ;
     sans lui, il ne protège de rien. Restent des dés, un par chose
     assignable — les six boutons, le pad, l'inclinaison.
     Les assignations déjà enregistrées qui portent encore `slotLocked` et
     `padLocked` se rechargent sans broncher : le validateur ne les réclame
     plus, et les clés en trop sont simplement ignorées. */
  slots: LiveActionId[][]; // longueur SLOT_COUNT, chaque slot = 1+ actions
  slotModes: SlotMode[]; // longueur SLOT_COUNT — ignoré (mode 'actions') si le bouton n'a jamais été basculé en fader
  slotFaders: LiveAxisId[][]; // longueur SLOT_COUNT, 1+ axes — utilisé seulement si slotModes[i] === 'fader'
  faderOrientation: FaderOrientation[]; // longueur SLOT_COUNT — utilisé seulement si slotModes[i] === 'fader'
  /* Le curseur MOMENTANÉ (2026-09-09) — longueur SLOT_COUNT, utilisé seulement
     en mode fader. Le doigt se pose : le curseur prend la main ET dose ; le
     doigt lâche : `LiveAxisDef.repos` rend le réglage au morceau.
     ⚠️ C'est le geste le plus demandé de la fiche à cocher (six coches sur
     MAINT+DOSE), et c'est celui des machines : « par défaut les Perform FX sont
     en mode Touch Enable — on entre, on ajoute un intérêt momentané, on lâche,
     et on revient au signal propre ». Il remplace les maintenus binaires
     SATURE et BITCRUSH, qui sautaient à une valeur gravée au lieu de doser. */
  faderMomentane: boolean[];
  axisX: LiveAxisId[];
  axisY: LiveAxisId[];
  // Inclinaison (phase 4) : optionnelle, jamais requise — n'agit sur rien
  // tant que le bouton TILT n'est pas activé côté capteur.
  axisTilt: LiveAxisId[];
  viz: LiveVizId;
}

/* Le défaut par rang de bouton — exporté parce que la migration s'en sert pour
   remplir un slot vidé par un déménagement, et que le test le vérifie.

   ⚠️ TROIS GESTES ET TROIS CURSEURS, et c'est le cœur du lot. L'ancien défaut
   mettait les six boutons en mode ACTIONS : personne ne rencontrait jamais un
   curseur sans aller le chercher dans ⚙, d'où « ça manque de boutons où on
   règle un curseur, je ne comprends pas pourquoi ils ont disparu ». La
   catégorie en pose huit ou neuf, toujours visibles (Circuit, Ableton,
   Maschine) ; on en pose trois, plus les deux axes du pad.

   Les rangs 3 et 4 portent deux curseurs qu'aucun chemin n'atteignait
   (RAFALES SPONT. et GHOST NOTES), le rang 5 un curseur MOMENTANÉ sur la
   saturation — le geste que la fiche demande le plus. Un slot en mode fader
   garde quand même une action derrière lui : basculer le mode ne doit pas
   laisser le bouton vide. */
export const DEFAUTS_SLOTS: LiveActionId[][] = [
  ['break'],
  ['fill'],
  ['mute-drums'],
  ['chaos'],
  ['hold-filtre'],
  ['mute-synth'],
];

/* Le mode de chaque rang, et son axe si c'est un curseur. Les trois tableaux
   restent alignés sur DEFAUTS_SLOTS — un slot porte TOUJOURS les deux
   assignations, seule `slotModes` dit laquelle joue. */
const DEFAUTS_MODES: SlotMode[] = ['actions', 'actions', 'fader', 'fader', 'fader', 'actions'];
const DEFAUTS_FADERS: LiveAxisId[][] = [
  ['filter'],
  ['reverb'],
  ['spont-roll'],
  ['ghost-density'],
  ['saturation'],
  ['delay-feedback'],
];
const DEFAUTS_MOMENTANE: boolean[] = [false, false, false, false, true, false];

const DEFAULT_ASSIGNMENTS: LiveAssignments = {
  slots: DEFAUTS_SLOTS.map((s) => [...s]),
  slotModes: [...DEFAUTS_MODES],
  slotFaders: DEFAUTS_FADERS.map((f) => [...f]),
  faderOrientation: ['vertical', 'vertical', 'vertical', 'vertical', 'vertical', 'vertical'],
  faderMomentane: [...DEFAUTS_MOMENTANE],
  axisX: ['filter'],
  axisY: ['reverb'],
  axisTilt: ['filter'],
  viz: 'bars',
};

const KEY = 'boite-a-rythme:mode-live-assign';
const ACTION_IDS = new Set(LIVE_ACTIONS.map((a) => a.id));

/* ⚠️ LE TIRAGE PORTE AUSSI SUR LE TYPE DU BOUTON (2026-09-09, retour de Yann
 * après test : « il ne faut pas choisir entre un bouton et un curseur ou un
 * autre type de bouton — quand ça randomise, ça peut transformer un bouton en
 * fader »).
 *
 * Le 🎲 ne tirait que DANS le mode courant : un bouton d'actions le restait à
 * vie, et rencontrer un curseur demandait d'aller le choisir exprès. Le mode
 * fait donc partie du tirage. Trois issues ÉQUIPROBABLES — pondérer reviendrait
 * à décider à la place du hasard ce qu'on lui demande justement de trouver.
 *
 * Vit ici et non dans la vue pour être testable : une fonction de tirage
 * recopiée dans un test ne teste que la copie. */
export function tirerMode(alea = Math.random()): { mode: SlotMode; momentane: boolean } {
  const n = Math.floor(alea * 3);
  return { mode: n === 0 ? 'actions' : 'fader', momentane: n === 2 };
}

/* Les entrées que le 🎲 a le droit de tirer — voir `tirable`. */
export const ACTIONS_TIRABLES: LiveActionDef[] = LIVE_ACTIONS.filter((a) => a.tirable !== false);

/* ⚠️ MIGRATION — à appliquer AVANT la validation, jamais après.
 *
 * `isValid` est TOUT OU RIEN : une assignation enregistrée qui cite un
 * identifiant disparu la fait échouer en bloc, et `loadLiveAssignments` rend
 * alors les défauts — les six boutons ET les trois snapshots perdus d'un coup,
 * sans un mot. C'est le piège qu'on ne découvre qu'en production, sur la
 * configuration de quelqu'un d'autre.
 *
 * Les rafales ×2/×3/×4 deviennent l'entrée fusionnée de leur ligne ; les mutes
 * par ligne et les pas de preset de voix ont changé de domicile (séquenceur,
 * Atelier) et sont simplement retirés du slot. Un slot vidé par ces retraits
 * reprend le défaut de son rang plutôt que de rester vide.
 */
const CORRESPONDANCES: Record<string, LiveActionId | null> = {
  /* Les rafales avaient fusionné avec les frappes de ligne en 2026-09-02 ;
     les frappes de ligne sont parties à leur tour en 2026-09-09. Deux
     déménagements de suite sur le même identifiant : la correspondance vise
     donc `null`, pas une entrée intermédiaire qui n'existe plus non plus. */
  'roll-kick-x2': null,
  'roll-kick-x3': null,
  'roll-kick-x4': null,
  'roll-snare-x2': null,
  'roll-snare-x3': null,
  'roll-snare-x4': null,
  'roll-hat-x2': null,
  'roll-hat-x3': null,
  'roll-hat-x4': null,
  'ligne-kick': null,
  'ligne-snare': null,
  'ligne-hat': null,
  'ligne-clap': null,
  'ligne-shaker': null,
  // Leur paramètre est demandé en CURSEUR, pas en paliers.
  'step-swing': null,
  'step-ghosts': null,
  'step-fills': null,
  'step-sidechain': null,
  // Rien de coché sur la fiche : ton et gamme restent dans l'Atelier.
  'step-transpose-up': null,
  'step-transpose-down': null,
  'step-scale-next': null,
  'step-scale-prev': null,
  // « Un garde-fou, pas un geste de scène. »
  'bypass-limiters': null,
  // Remplacés par le curseur MOMENTANÉ, qui dose au lieu de sauter.
  'hold-sature': null,
  'hold-crush': null,
  // Les coupures sont demandées dans le mini séquenceur.
  'hold-sans-kick': null,
  'hold-batterie-seule': null,
  // Déménagés dans le séquenceur : on coupe une ligne là où on la voit.
  'mute-kick': null,
  'mute-snare': null,
  'mute-hat': null,
  'mute-bass': null,
  'mute-pad': null,
  'mute-melody': null,
  // De la préparation, pas un geste de scène.
  'step-voice-bass-next': null,
  'step-voice-bass-prev': null,
  'step-voice-pad-next': null,
  'step-voice-pad-prev': null,
  'step-voice-melody-next': null,
  'step-voice-melody-prev': null,
  /* L'arpège avait déjà migré une fois, vers l'état ARPÈGE de MODE NAPPE.
     Celui-ci part à son tour : la chaîne se raccourcit d'un maillon plutôt que
     de garder un cran mort, sinon `isValid` rendrait les défauts. Les deux
     tombent sur BOURDON, la moitié de MODE NAPPE qui est restée un BOUTON —
     l'autre moitié est devenue le curseur ARPÈGE, et un bouton ne peut pas
     migrer vers un axe : les deux tableaux d'assignation sont distincts. */
  'toggle-pad-arp': 'bourdon',
  'step-pad-mode': 'bourdon',
};

/* ⚠️ LA MIGRATION DES AXES — elle n'existait pas, et il la fallait.
 *
 * `migrer` ne réécrivait que les ACTIONS. Or la révision du 2026-09-09 retire
 * treize AXES : une assignation enregistrée qui cite `swing` ou `cutoff-bass`
 * aurait fait échouer `isValid` en bloc, donc rendu les défauts — les six
 * boutons ET les trois snapshots perdus d'un coup, sans un mot. Exactement le
 * défaut que `catalogue-live.test.ts` existe pour empêcher, à un tableau près.
 *
 * BRILLANCE et MOUVEMENT ne sont pas des réglages neufs : ce sont les macros
 * que l'Atelier expose déjà, et `brillance` reprend la courbe exacte de l'ancien
 * `cutoff`. Les anciens identifiants pointent donc vers eux plutôt que vers
 * `null` — on ne perd pas l'assignation, on la renomme.
 */
const CORRESPONDANCES_AXES: Record<string, LiveAxisId | null> = {
  // Le même réglage, sous le nom que l'écran emploie.
  'cutoff-bass': 'brillance-bass',
  'cutoff-pad': 'brillance-pad',
  'cutoff-melody': 'brillance-melody',
  'filter-env-bass': 'mouvement-bass',
  'filter-env-pad': 'mouvement-pad',
  'filter-env-melody': 'mouvement-melody',
  'filter-env-release-bass': 'mouvement-bass',
  'filter-env-release-pad': 'mouvement-pad',
  'filter-env-release-melody': 'mouvement-melody',
  // Le vibrato par ligne devient un seul axe d'ensemble.
  'vibrato-bass': 'vibrato-synthe',
  'vibrato-pad': 'vibrato-synthe',
  'vibrato-melody': 'vibrato-synthe',
  'vibrato-rate-bass': null,
  'vibrato-rate-pad': null,
  'vibrato-rate-melody': null,
  // Aucun curseur de l'Atelier n'expose la résonance.
  'resonance-bass': null,
  'resonance-pad': null,
  'resonance-melody': null,
  // Rien de coché sur la fiche : ils restent dans l'Atelier.
  swing: null,
  drag: null,
  'fill-intensity': null,
  compression: null,
  volume: null,
  'sidechain-depth': null,
};

/* Réécrit une liste d'axes. Un slot/axe vidé par les retraits reprend son
   défaut plutôt que de rester vide — même règle que pour les actions, et pour
   la même raison : un tableau vide ferait perdre au sélecteur toute trace de
   ce qui est assigné. */
function migrerListeAxes(v: unknown, defaut: LiveAxisId[]): LiveAxisId[] {
  if (!Array.isArray(v)) return defaut;
  const sortie: LiveAxisId[] = [];
  for (const brut of v) {
    if (typeof brut !== 'string') continue;
    const id = brut in CORRESPONDANCES_AXES ? CORRESPONDANCES_AXES[brut] : brut;
    if (id && AXIS_IDS.has(id) && !sortie.includes(id)) sortie.push(id);
  }
  return sortie.length ? sortie : defaut;
}

function migrerListeActions(v: unknown, defaut: LiveActionId[]): LiveActionId[] {
  if (!Array.isArray(v)) return defaut;
  const sortie: LiveActionId[] = [];
  for (const brut of v) {
    if (typeof brut !== 'string') continue;
    const id = brut in CORRESPONDANCES ? CORRESPONDANCES[brut] : (brut as LiveActionId);
    if (id && ACTION_IDS.has(id) && !sortie.includes(id)) sortie.push(id);
  }
  return sortie.length ? sortie : defaut;
}

/** Réécrit une assignation enregistrée dans le vocabulaire courant. */
function migrer(v: unknown): unknown {
  if (!v || typeof v !== 'object') return v;
  const a = v as { slots?: unknown };
  if (!Array.isArray(a.slots)) return v;
  const v2 = v as Partial<LiveAssignments>;
  const rang = <T>(t: T[] | undefined, i: number, d: T) => (Array.isArray(t) && t[i] !== undefined ? t[i] : d);
  return {
    ...a,
    slots: a.slots.map((slot, i) => migrerListeActions(slot, DEFAUTS_SLOTS[i] ?? DEFAUTS_SLOTS[0])),
    slotFaders: a.slots.map((_, i) =>
      migrerListeAxes(v2.slotFaders?.[i], DEFAUTS_FADERS[i] ?? DEFAUTS_FADERS[0]),
    ),
    /* ⚠️ Un champ AJOUTÉ se migre aussi. `faderMomentane` n'existe dans aucune
       assignation enregistrée : sans ce remplissage, `isValid` le trouverait
       absent et rendrait les défauts — le même tout-ou-rien, par l'autre bout. */
    faderMomentane: a.slots.map((_, i) => rang(v2.faderMomentane, i, DEFAUTS_MOMENTANE[i] ?? false)),
    axisX: migrerListeAxes(v2.axisX, DEFAULT_ASSIGNMENTS.axisX),
    axisY: migrerListeAxes(v2.axisY, DEFAULT_ASSIGNMENTS.axisY),
    axisTilt: migrerListeAxes(v2.axisTilt, DEFAULT_ASSIGNMENTS.axisTilt),
  };
}
const AXIS_IDS = new Set(LIVE_AXES.map((a) => a.id));
const VIZ_IDS = new Set(LIVE_VIZ.map((v) => v.id));
const SLOT_MODES: SlotMode[] = ['actions', 'fader'];
const FADER_ORIENTATIONS: FaderOrientation[] = ['vertical', 'horizontal'];

function isValidAxisList(v: unknown): v is LiveAxisId[] {
  return Array.isArray(v) && v.length > 0 && v.every((id) => AXIS_IDS.has(id));
}

function isValid(v: unknown): v is LiveAssignments {
  if (!v || typeof v !== 'object') return false;
  const a = v as Partial<LiveAssignments>;
  return (
    Array.isArray(a.slots) &&
    a.slots.length === SLOT_COUNT &&
    a.slots.every((s) => Array.isArray(s) && s.length > 0 && s.every((id) => ACTION_IDS.has(id as LiveActionId))) &&
    Array.isArray(a.slotModes) &&
    a.slotModes.length === SLOT_COUNT &&
    a.slotModes.every((m) => SLOT_MODES.includes(m as SlotMode)) &&
    Array.isArray(a.slotFaders) &&
    a.slotFaders.length === SLOT_COUNT &&
    a.slotFaders.every((f) => isValidAxisList(f)) &&
    Array.isArray(a.faderOrientation) &&
    a.faderOrientation.length === SLOT_COUNT &&
    a.faderOrientation.every((o) => FADER_ORIENTATIONS.includes(o as FaderOrientation)) &&
    Array.isArray(a.faderMomentane) &&
    a.faderMomentane.length === SLOT_COUNT &&
    a.faderMomentane.every((m) => typeof m === 'boolean') &&
    isValidAxisList(a.axisX) &&
    isValidAxisList(a.axisY) &&
    isValidAxisList(a.axisTilt) &&
    !!a.viz &&
    VIZ_IDS.has(a.viz)
  );
}

// Chaque slot/axe contient désormais des tableaux (référence, pas valeur) —
// un simple spread ne suffit plus à isoler une copie de DEFAULT_ASSIGNMENTS,
// muter assignments.slots[0] muterait le tableau par défaut partagé.
function freshDefaults(): LiveAssignments {
  return structuredClone(DEFAULT_ASSIGNMENTS);
}

export function loadLiveAssignments(): LiveAssignments {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshDefaults();
    const parsed = migrer(JSON.parse(raw));
    return isValid(parsed) ? parsed : freshDefaults();
  } catch {
    return freshDefaults();
  }
}

export function saveLiveAssignments(a: LiveAssignments): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* quota plein ou stockage refusé : l'assignation reste active pour la session, sans persister */
  }
}

// Snapshots d'assignation (PLAN.md §7, réserve : « snapshot des assignations
// rappelable par appui long ») — 3 emplacements fixes (A/B/C), même principe
// borné que SLOT_COUNT/SNAPSHOT_COUNT plutôt qu'une liste ouverte à gérer.
// Un appui court sur un emplacement SAUVEGARDE l'assignation courante dedans
// (geste anodin, jamais destructeur) ; un appui long la RAPPELLE (geste
// délibéré — écrase toute l'assignation courante en plein set, donc protégé
// comme le reste des gestes à risque de mistap déjà identifiés, PLAN.md §7 :
// bouton ⚙ éloigné du pad, toggle inclinaison sorti de la zone de drag).
export const SNAPSHOT_COUNT = 3;
const SNAPSHOT_KEY = 'boite-a-rythme:mode-live-snapshots';

export function loadLiveSnapshots(): (LiveAssignments | null)[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return Array(SNAPSHOT_COUNT).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== SNAPSHOT_COUNT) return Array(SNAPSHOT_COUNT).fill(null);
    return parsed.map((p) => {
      const m = migrer(p);
      return isValid(m) ? m : null;
    });
  } catch {
    return Array(SNAPSHOT_COUNT).fill(null);
  }
}

export function saveLiveSnapshots(snapshots: (LiveAssignments | null)[]): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
  } catch {
    /* quota plein ou stockage refusé : les snapshots restent actifs pour la session, sans persister */
  }
}

export function actionById(id: LiveActionId): LiveActionDef {
  return LIVE_ACTIONS.find((a) => a.id === id)!;
}

export function axisById(id: LiveAxisId): LiveAxisDef {
  return LIVE_AXES.find((a) => a.id === id)!;
}

// Helpers pluriels — un slot/axe porte désormais 1+ entrées du catalogue.
export function actionsFor(ids: LiveActionId[]): LiveActionDef[] {
  return ids.map((id) => actionById(id));
}

export function axesFor(ids: LiveAxisId[]): LiveAxisDef[] {
  return ids.map((id) => axisById(id));
}

export function vizById(id: LiveVizId): LiveVizDef {
  return LIVE_VIZ.find((v) => v.id === id)!;
}
