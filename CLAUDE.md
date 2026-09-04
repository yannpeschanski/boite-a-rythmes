# Boîte à rythmes — contexte du projet

Séquenceur / boîte à rythmes web, habillé en skin Winamp 2.x. Réécriture d'un
fichier HTML unique de 9 289 lignes vers Svelte 5 + TypeScript + Vite.

> **Ce fichier ne porte que des RÈGLES et leur raison en une phrase.** Les
> démonstrations, les mesures, les dates d'arbitrage et le récit de ce qui a
> cassé sont dans `PLAN.md` — cherchez-y le titre de la règle. Ce fichier-ci est
> relu à chaque tour ; `PLAN.md` ne l'est qu'à la demande.

⚠️ Les dossiers et les tokens s'appellent encore `xp` (`src/ui/xp/`, `--xp-*`) :
**les noms ont été conservés, les valeurs remplacées.** Renommer n'aurait touché
que des étiquettes, au prix d'un diff illisible.

## Commandes

```bash
npm run dev              # serveur de dev (http://localhost:5173)
npm test                 # Vitest — modèle et moteur audio
npm run check            # svelte-check (types) — doit rester à 0 erreur
npm run build            # site déployable        -> dist/
npm run build:singlefile # fichier HTML autonome  -> dist-singlefile/index.html
```

## Architecture

```
src/model/    état v2 typé, sérialisation, données (34 presets, 78 niveaux, gammes, voix)
src/engine/   moteur audio TypeScript pur — aucune dépendance UI
src/stores/   état réactif en runes Svelte 5 (pattern, jeu, historique, partage)
src/ui/       design system (dossier `xp/`) + vues Atelier, Mode jeu et Mode Live
```

**Trois unifications structurantes, à préserver :** un seul builder de graphe
(`buildGraph(ctx, state)`, direct et hors ligne), un seul scheduler, un seul
modèle d'état dont l'UI dérive. L'original avait 3 schedulers dupliqués.

---

## Le design

**La skin Winamp 2.x est un choix, pas un héritage.** Chrome gris-violet biseauté
d'un pixel, bandeau indigo, afficheurs LCD verts, chasse fixe en petites
capitales espacées. L'échelle vit dans `--xp-size-*` / `--xp-ls-*`
(`src/ui/xp/tokens.css`) ; `--xp-font` est un alias sur `--xp-mono`. **Le biseau
d'un pixel EST la grammaire** — c'est lui qui dit ce qui est en relief, creusé ou
allumé, et la chasse fixe en est l'autre moitié. Ne pas proposer d'« aplatir » ou
de « moderniser ». Le fond Bliss, les barres Luna et le thème `noir` du Mode jeu
sont retirés : l'appli parlait **trois langues visuelles**, elle n'en parle plus
qu'une. C'est l'argument principal, et il n'est pas esthétique.

**Le tactile passe par `.tap44` / `.tap44-y`** (`src/styles/global.css`) : une
zone touchable monte à 44 px **sans que le dessin grandisse**, via un
pseudo-élément sous `@media (pointer: coarse)`. Trois pièges :

- ces enveloppes **débordent et se marchent dessus** — d'où l'écartement du
  rythme vertical dans les mêmes blocs `coarse` ;
- un bloc `@media` posé au milieu d'un `<style>` Svelte est **écrasé par les
  règles écrites plus bas** : les mettre en fin de `<style>` ;
- `getBoundingClientRect()` ne voit pas le pseudo-élément — mesurer avec
  `elementFromPoint` après un `scrollIntoView`, **et dans un contexte tactile**
  (`hasTouch`), sinon la règle `coarse` ne s'applique pas et la mesure accuse à
  tort (10 « boutons trop petits » du Mode Live, en réalité un seul).

Trois exceptions revendiquées (largeur des cases, libellés d'aide, Mode Live)
sont documentées dans `docs/plan/03-journal-migration.md`, étape 6.

**`<select>` et `<input type="text">` sont des éléments remplacés** : Chromium
n'y rend aucun `::after`. Eux passent par `min-height: 44px`. Et
`color-scheme: dark` sur `body` aligne ce que le navigateur dessine à notre place
— sans ce mot, les seules zones claires de l'écran étaient des widgets natifs.

⚠️ **Un token de couleur n'est pas transposable d'une surface à l'autre.**
`--xp-lcd-dim` est fait pour un segment sur fond d'afficheur NOIR ; posé sur le
chrome d'un panneau il donne 1,5:1. Utiliser `--xp-accent-amber` (4,76:1).
Corollaire : le vert dit « allumé / fait », donc un titre d'étape — qui n'est pas
un état — ne doit pas être vert.

⚠️ **Les maquettes de référence sont dans `maquettes/atelier/`** — `build_modes.py`
produit les six écrans. S'y référer avant de dessiner un écran neuf.

---

## L'audio

**`original/boite-a-rythme-69.html` est la source de vérité.** Ses commentaires
expliquent le *pourquoi* de chaque choix audio — ratios 808/909 du banc
d'oscillateurs, plafonds de release, seuils des limiteurs, valeurs de decay.
Avant de modifier une constante audio, lire le commentaire d'origine : il y a
presque toujours une raison, souvent une impasse déjà explorée. Ces commentaires
ont été portés dans le code, les conserver.

**Le moteur (`src/engine/`) ne doit jamais importer Svelte ni toucher au DOM.**
C'est ce qui lui permet de servir la lecture en direct, le rendu hors ligne de
l'export et le mode jeu. Il reçoit un `BaseAudioContext` et un instantané d'état.

**L'aléatoire passe toujours par un `rng` injecté**, jamais `Math.random()` en
dur : c'est ce qui rend les NOTES d'un export reproductibles. ⚠️ **Pas les
octets** — le bruit blanc partagé (`graph.ts`) et l'impulsion de réverbe
(`fx.ts`) sont reconstruits hors du `rng` à chaque `buildGraph`. **Arbitré : on ne
sème PAS ces deux tampons**, ce n'est pas une dette mais un choix ; les semer
changerait les octets de tous les exports futurs pour une propriété dont personne
n'a besoin. Ce qui compte et reste vrai : un même état donne le même morceau.
**Ne pas changer l'ordre d'itération des lignes du scheduler** — kick → snare →
clap → hat → shaker → bass → pad → melody — ni insérer un appel à `rng()` avant
un autre : un tirage de plus décale tout ce qui suit.
`tests/scheduler.test.ts` verrouille les deux ; si son instantané tombe, la
question est « viens-je de rendre les anciens exports non reproductibles ? ».

⚠️ **L'avance de déclenchement est la marge dont l'attaque dépend.** Toutes les
voix ouvrent sur une rampe de 3-4 ms. Si `AVANCE_DECLENCHEMENT`
(`engine/AudioEngine.ts`) descend au même ordre, un retard du fil principal fait
tomber `setValueAtTime` dans le passé, la rampe est sautée, **le gain saute — un
clic par note**. 20 ms, pas moins. Idem `TAMPON_SORTIE` : `'interactive'` est le
préréglage dimensionné pour ça. `tests/latence-audio.test.ts` verrouille les deux.
Pour descendre plus bas il faut rendre les enveloppes robustes à un démarrage
tardif, pas raccourcir la constante.

⚠️ **Le tampon de sortie SUIT la sortie : `'interactive'` est un défaut, pas une
constante.** En Bluetooth (100-200 ms hors de portée du navigateur), les 40 ms
qu'il fait gagner sont inaudibles et son coût s'entend — un crachotement par bloc
manqué. `engine/tampon.ts` : au-delà de `SEUIL_SORTIE_LENTE` (0,1 s), on repasse
sur `'playback'`. La bascule n'a lieu qu'**à l'arrêt** et **jamais pendant une
capture** (`startLiveRecording` branche son magnétophone avant `start()`).
⚠️ Le réglage manuel (`ui/sortie.svelte.ts`) n'est pas un doublon de la détection :
`outputLatency` est un **aveu volontaire**, et qui ENTEND crachoter en sait plus
que le navigateur — le manuel gagne toujours. Corollaire : un `AudioContext`
« running » sans rien de branché tient un flux ouvert, donc un réveil de plus sur
la même route ; les sons système s'endorment pour ça, et leur `chime` **attend**
la reprise avant de programmer.

⚠️ **Deux latences, deux traitements.** DÉCLENCHER un son (pads du Mode Live,
aperçus, notes jouées) ne se compense pas, seulement se réduit — d'où
`latencyHint: 'interactive'` dans `ensureAudio`. MESURER un placement (Mode jeu,
pad d'écriture) se corrige, lui, avec le décalage calibré.

⚠️ **`outputLatency` n'existe pas dans WebKit.** `AudioEngine.audioTime()` se
replie sur `baseLatency` — sans ce repli, iPhone et iPad ne compensaient rien.
Ce que le repli ne couvre pas (dalle tactile, casque) se **mesure** : calibrage du
Mode jeu (`ui/game/latence.svelte.ts`, propriété de l'APPAREIL, hors format v2).
Son `affiner` est **additif** — les frappes sont déjà corrigées, leur médiane est
ce qu'il RESTE à corriger ; remplacer ferait osciller au lieu de converger.

⚠️ **Un étage « neutre » posé EN SÉRIE dans la chaîne finale ne l'est jamais.**
Un passe-haut sous l'audible ne s'entend pas en AMPLITUDE, mais en PHASE : le
petit haut-parleur de l'acte 4 changeait 41 176 échantillons sur 44 100. Il vit
donc dans une BRANCHE PARALLÈLE à gain nul (`petitHPSec` / `petitHPHumide`), et
le repos est un **trajet**, pas un réglage : 0 échantillon d'écart. Le fondu évite
en prime le claquement quand on bascule en lecture. Même précaution pour tout
futur `liveFilter`.

**L'analyseur de spectre** est un `AnalyserNode` branché en tap sur `finalGain`
dans `buildGraph`, donc sur ce qu'on entend, limiteur compris. `getSpectrum(out)`
**remplit un tableau fourni par l'appelant** — le visualiseur tourne à 60 Hz. La
lecture des bandes est partagée dans `ui/xp/spectrumBands.ts`, une seule
définition.

---

## L'état

**Le format v2 (`src/model/types.ts`) est le contrat central.** Stores, moteur,
sérialisation, presets et undo/redo parlent tous cette forme, compatible avec les
sauvegardes v1 et v2 — ne pas casser `deserializeState` (`serialize.ts`).

⚠️ **Les échelles de `types.ts` MENTENT sur trois champs — `serialize.ts` et
`engine/graph.ts` font foi.** `finalVolume` va de **50 à 150** (défaut 100),
`globalSaturation` de **0 à 100**, `swing` de **0 à 75**. Vérifier la borne dans
`serialize.ts` (qui `clamp`) avant d'écrire un seuil, jamais dans le commentaire
du type.

⚠️ **Un objet muté doit être `$state`, sinon le prop qui en dérive est figé.**
Quand un module pur est testé et que le comportement reste faux, **suspecter le
câblage, pas le calcul**.

**Tout état réactif n'est pas de l'état de morceau.** `ui/xp/paramHints.svelte.ts`
et `ui/atelier/lastTouched.svelte.ts` vivent délibérément **hors** du format v2 :
ni sérialisés, ni dans l'historique, jamais lus par le moteur. C'est le bon
domicile — ne pas les faire remonter dans `model/types.ts`.

⚠️ **Un refus du stockage ne doit jamais être silencieux.** `writeJson` avalait
l'erreur de quota : les modules se reverrouillaient à chaque visite sans que rien
ne l'explique. D'où `game.persistanceRefusee` (`stores/game.svelte.ts`), posé par une
écriture-sonde —
`localStorage` EXISTE en navigation privée stricte, il lève à l'écriture.

⚠️ **Le seuil de niveau se lit sur le PLANCHER, jamais sur `level`.**
`PlayerProgress.plancher` est le `level` d'AVANT la carrière, gelé une fois pour
toutes dans `load()` — le seul point garanti d'être avant le premier exercice.
Principe : **une porte déjà ouverte ne se referme jamais.** Lu sur `level`, le
seuil ouvrait les quatre modules d'un coup à la fin de l'acte 0, ce qui vidait le
déverrouillage narratif de son rôle. Un joueur neuf gèle `1`, un vétéran garde ses
modules. `tests/plancher.test.ts` tient le QUAND, `tests/unlocks.test.ts` la
RÈGLE, `scripts/parcours-carriere.cjs` la trajectoire.

---

## Le récit

⚠️ **Le jeu s'appelle FACE B** — le nom du label, pas celui de l'outil. Il vit
dans `index.html`, le splash et le titre de fenêtre du Mode jeu ; les occurrences
en commentaire parlent de l'objet « boîte à rythmes » et restent.

⚠️ **Le récit se passe en 2005, et une SEULE date est écrite.** `ANNEE` et
`dateDeLActe` (`carriere.ts`) : le concert est le 14 juin 2005, tout le reste se
déduit de `JOURS`. 2005 parce que c'est la seule année où le postulat tient — les
sonneries sont encore un marché, le fax et le répondeur sont des outils, MSN est
le chemin vers un commercial. Le calendrier était déjà dans `JOURS` : les quatre
premiers actes tombent le 14 de leur mois, les trois derniers à six, quatre et
deux semaines. Quatre tests le tiennent.

⚠️ **Ce qui n'a pas été porté n'existe pas.** Un récit écrit dans un document et
*cité* par le code n'est pas dans le jeu : celui qui a lu le document comprend
l'écran, le joueur juge sur ce qui s'affiche. Corollaire de mise en scène : **un
élément n'apparaît qu'à l'écran qui l'explique** — le compte à rebours sur
« LE 14 JUIN », le carnet après le prologue, et le premier écran ne montre qu'un
appareil, un message, un bouton.

⚠️ **Ce qui est VERROUILLÉ ne s'affiche pas.** Un accueil où deux entrées sur
trois sont barrées présente le jeu par ce qu'on ne peut PAS faire. Splash, barre
de navigation et onglets de l'Atelier masquent ce qui n'est pas ouvert.

⚠️ **Un PERSONNAGE se présente comme un décor : avant de parler.** Sol porte
presque toutes les répliques ; son écran passe donc avant celui des sonneries, et
`tests/carriere.test.ts` verrouille l'ordre. Le récit s'écrit **une idée par
ligne** : une ligne qui se replie se lit comme du texte courant. Ça ne se voit
pas, ça se **mesure** (hauteur de chaque `.ligne`), et ça se corrige en COUPANT la
ligne, pas en réécrivant le texte.

⚠️ **Le budget de LECTURE avant le premier son est un réglage, et il est testé.**
La sortie n'est jamais de raccourcir le prologue — il est ce qui rend le reste
lisible — mais de l'ENTRELACER : le strict nécessaire devant, le reste ENTRE les
exercices. Deux tests : jamais plus de cinq écrans avant le premier exercice,
jamais deux lectures empilées entre deux exercices. Le nom complet de Sol
(**Solange**) n'existe pas dans `HISTOIRE.md` : c'est une proposition, à un seul
endroit du code.

⚠️ **`LEVELS` n'est PAS trié par id — chercher par IDENTIFIANT, jamais par
position.** `startLevel` prend un index ; tout appelant qui part d'un id passe
par `startLevelById`. La salle de répétition faisait `startLevel(id - 1)` et
ouvrait le voisin pour huit niveaux, en silence.

⚠️ **La salle de répétition parle en ACTES** (`repereDeNiveau`) : un exercice s'y
nomme « acte 3 · 3 », pas « 44 ». Les ids restent des identifiants — les
renuméroter toucherait `PlayerProgress.level`, les clés de `stars`, `partirDu` et
les sauvegardes, pour un bénéfice visuel. Corollaire : un niveau qu'aucun acte ne
cite n'a pas de repère, donc pas de nom dans le jeu — c'est ça, le réservoir — et
tout compte affiché doit compter ce qui est AFFICHÉ.

⚠️ **Un curseur qui ne recule jamais ne doit pas décider de ce qu'on AFFICHE.**
`enEpilogue` se lit sur le curseur persisté : une fois le jeu fini il est vrai
pour toujours, et l'écran de l'épilogue passant avant tout le reste, relire un
acte changeait `acteActif` sans rien montrer. D'où `enRelecture`, volatil comme
`acteActif` — et son retour (« Revenir à la fin »), sans quoi la relecture est
sans issue.

⚠️ **Une capacité qu'aucun mot ne nomme n'existe pas.** Relire un acte entier
(récit ET exercices) marchait depuis toujours — `ouvrirActe`, testé — mais le
carnet n'avait ni titre, ni relief, ni verbe : trois lignes vertes sur fond
d'afficheur se lisent comme un résumé, et la seule phrase sous lui nommait la
salle de répétition. Un joueur a donc rapporté que « on ne peut pas refaire les
actes ». Corollaire du « ce qui n'a pas été porté n'existe pas » : une capacité
non nommée à l'écran est à refaire, pas à documenter.

⚠️ **Le récit se lit dans les DEUX sens.** `reculerCarriere()` / `peutReculer` :
reculer est gratuit parce que le curseur enregistré ne bouge pas. Corollaire : une
étape d'exercice revisitée doit pouvoir être re-dépassée SANS être rejouée
(`etapeDejaFranchie`).

⚠️ **La SCÈNE est le cinquième type d'étape — on n'y retrouve rien, on JOUE.**
`EtapeScene` (acte 7, le rappel) emmène dans le Mode Live avec la production que
le joueur a livrée à l'acte cité, jamais un motif de démonstration ; elle OUVRE
le module (`modulesRequis`, fusionné avec celui de la commande dans
`game.modulesRequis` — lu sur la seule commande, la scène restait dehors) ; et
elle ne se NOTE pas : on redescend quand on veut, le récit avance.
⚠️ Le Mode Live n'existe qu'à l'HORIZONTALE (« tourne ton téléphone » sinon) —
l'écran qui y envoie doit le dire. Mesuré en 844 × 390, pointeur grossier : une
seule commande sous 44 px de zone touchable, aucun débordement.

⚠️ **L'épilogue FAIT ENTENDRE le disque du joueur** — la production de
`ACTE_DU_DISQUE` (déduit : l'acte de la dernière commande, jamais écrit en dur,
sinon l'épilogue se tait en silence le jour où elle déménage). Il démarre au
deuxième écran (le premier finit sur « FB-015 est sorti »), se nomme, et
s'arrête : une fin de jeu n'impose pas sa bande-son.

⚠️ **L'ÉPILOGUE n'est pas un neuvième acte.** `EPILOGUE` (`carriere.ts`) est hors
de `ACTES` : ni compétence, ni module, ni exercice, et des mois après le 14 juin —
l'y mettre casserait `ActeId`, `JOURS` et le compte à rebours. Il a son curseur à
lui, volatil. Sa dernière image est la PREMIÈRE du jeu : Sol demande « lequel est
le plus grave ? » à un nouveau stagiaire — ne pas la réécrire, c'est elle qui fait
la boucle. Le décompte disparaît aux DEUX bouts, parce qu'il ne s'affiche que tant
qu'il veut dire quelque chose.

⚠️ **Une réplique porte SON NOM, et le nom vit dans la donnée** —
`'SOL: Je vais vendre.'`, lu par `model/locuteurs.ts` dont le catalogue est
**fermé** (un préfixe inconnu reste du texte, sinon « FACE B — FB-015 » devient
une réplique). Le tiret cadratin seul ne dit pas qui parle : il était faux dès
qu'une réplique tenait sur deux lignes ou qu'un troisième personnage entrait.
Corollaire mesuré : le nom s'affiche **au-dessus** de la réplique, jamais devant
— devant, il mangeait jusqu'à douze signes et repliait sept lignes écrites pour
tenir sur une seule.

⚠️ **Le récit se TAPE, et chaque personnage a une voix** (`RecitLignes.svelte`,
`engine/voixRecit.ts`) : six percussions synthétisées — charley pour Sol,
machine à écrire pour le texte off. Trois choses à ne pas défaire : le texte non
encore tapé reste dans le DOM en **fantôme invisible** (sinon les boutons
descendent à chaque ligne qui arrive), le pseudo est interpolé **après** la
lecture du nom (sinon un pseudo peut se faire passer pour Sol), et le réglage
🔊 s'affiche **dès le premier écran** — un son qu'on ne peut pas couper là où il
commence n'est pas un réglage.

⚠️ **Les huit actes sont écrits** : `acteAVenir` ne renvoie plus jamais vrai.
L'acte 7 ne cite que des niveaux `jouer`, et c'est délibéré — `justesseDesFrappes`
retient la meilleure fenêtre consécutive, donc la notation pardonne un début raté
et récompense la reprise, mot pour mot ce que Sol répond avant de brancher les
enceintes. Un seul jeton de texte existe dans tout le récit, `{pseudo}`.

---

## Le Mode carrière

**Le Mode jeu s'ouvre sur le Mode carrière, et c'est le RÉCIT qui ouvre les
modules.** `src/model/carriere.ts` porte les huit actes ;
`PlayerProgress.carriere = { acte, etape }` est un **second axe**, séparé de
`level`/`stars` — le récit dit ce qui est OUVERT, le réservoir de niveaux (la
« salle de répétition ») dit ce qui est MAÎTRISÉ. Trois règles :

- un acte **cite** des niveaux du réservoir, il n'en fabrique jamais ;
- le curseur persisté ne recule **jamais** ;
- `moduleUnlocked` est un **OU** entre l'acte et le seuil de niveau, ce dernier lu
  sur le **plancher** — retirer le second membre priverait de leurs modules ceux
  qui jouent hors carrière.

Une commande d'acte ne doit **promettre que ce que le tirage tient** : les niveaux
de paramètre tirent leur bouton ET leur sens, donc une consigne qui nomme l'un des
deux ment. Elle peut poser la propriété ou offrir la paire ; jamais un superlatif.

⚠️ **Une étape qui envoie dans un module doit d'abord FRANCHIR son étape.**
`moduleUnlocked` lit l'acte ATTEINT : `livrer()` avance, absorbe l'annonce de fin
d'acte, puis navigue — sinon le module serait ouvert à l'aller et cadenassé au
retour.

⚠️ **La salle de répétition liste ce qui a été RENCONTRÉ, pas ce qui a été
réussi** (`niveauxRencontres`). Le seuil `id <= level` ne convenait pas : la
carrière cite les niveaux dans le désordre et un exercice abandonné n'avance pas
`level`. Corollaire : **rien de non atteint ne s'affiche** — ni les actes suivants
du carnet, ni leurs titres, ni un total de niveaux.

⚠️ **Une production LIVRÉE est gardée — `model/discographie.ts`.** L'état est
**sérialisé** au format v2 (il survit au rechargement, l'Atelier ne peut plus le
muter) ; **une production par ACTE**, remplacée et jamais empilée ; et elle est
rangée par le RÉCIT — `titre` et `client` viennent de l'étape. Les **deux** chemins
qui produisent un morceau vivent côte à côte dans le store (`livrerSonnerie` et
`livrerCommande`) : une règle à deux domiciles n'est appliquée qu'à un seul.

---

## Les exercices

**Le Mode jeu a plusieurs VERBES, pas un.** `ExerciseKind`
(`src/model/exercises.ts`) discrimine ce qu'on demande. Quatre verbes de grille :
`reproduire`, `completer`, `intrus`, `jouer`. Trois de paramètre : `lequel`,
`nommer`, `regler`. Plus `melodie`, `arrangement`, `silence`, `style`, `laverie`.

La partie PURE de la notation vit dans `exercises.ts` — `comparerGrilles` (une
case est exacte si son état **et** sa rafale coïncident), `colonnesDeTranche`,
`justesseDesFrappes`, `ecartAuCoup` — et s'y teste sans navigateur ni Web Audio.
Le paramètre `colonnes` de `comparerGrilles` est le point de conception : il
permet à « compléter » de réutiliser *exactement* la vérification de
« reproduire ». **Ne pas écrire un second comparateur** — deux comparateurs qui
doivent rester d'accord finissent par ne plus l'être. Deux pièges payés
(`docs/plan/03-journal-migration.md`, étape 17) : le Mode jeu tient sur **une mesure** par ligne, et
« jouer » mesure l'écart au dernier pas **actif** du kick.

⚠️ **Un exercice n'enseigne que ce que l'écran a DÉJÀ expliqué**, et le verbe
décide. `lequel` parle en PROPRIÉTÉS et se joue partout ; `nommer` et `regler`
sont des verbes de VOCABULAIRE — ils exigent que le mot soit sur un bouton déjà
vu, donc que l'Atelier soit ouvert. Corollaire : un GESTE s'enseigne dans l'acte
de son objet — variantes et rafales sont des gestes de grille, donc de l'acte 1.

⚠️ **L'acte 0 se joue avec les MAINS — `lequel` demande un jugement, `jouer`
demande un GESTE.** Quatre QCM à quelqu'un qui n'a rien touché, c'est un test
d'entrée. L'acte enchaîne trois exercices de frappe ÉCRITS (64, 65, 66) puis le
`silence`, qui reste parce qu'il n'exige aucun vocabulaire. Trois choses payées :
les niveaux 49-51 restent au RÉSERVOIR (leurs trois mots sont enseignés à l'acte 2,
où les boutons existent) ; les niveaux 37/38 restent à l'acte 7 ; et le
contretemps du 66 est ailleurs que celui du 65, sinon « à vue » se rejoue de
mémoire. ⚠️ C'est le premier écran qui expose la LATENCE de l'appareil, et le
calibrage reste **un bouton, pas une porte**. ⚠️ La dernière image de l'épilogue
cite le premier exercice de l'acte 0 : son test la **dérive** au lieu de la graver.

⚠️ **Un exercice qui se joue UNE fois ne se tire pas au sort — `GrilleEcrite`.**
Un niveau généré tire une densité, donc il ne sait pas ce qu'il vient d'enseigner :
c'est ce qui rendait une **courbe** impossible, et la source de la famille
« 0 variante sur 60 tirages ». Trois règles : la grille écrite prime sur le preset
et sur la génération dans `startLevel` et **ne reçoit aucun forçage** (seuls tempo
et swing restent tirés) ; ce qu'elle contient, le niveau doit le **déclarer**
(`variant`, `rollMax`) ; et un niveau ajouté se pose **en fin de tableau** (bonne
pratique — la recherche se fait par id depuis que `demarrerEtape` a cessé d'être
positionnelle). **Un niveau ne se supprime jamais** — il cesse d'être cité.
`tests/grilles-ecrites.test.ts` confronte chaque grille à son propre préambule.

⚠️ **Un niveau ne promet pas ce qu'il ne pose pas.** `forceVariantCount` et
`forceRollCount` étaient déclarés et lus par **personne** : les niveaux 5 et 8
annonçaient un rim shot que la cible ne contenait jamais. Le forçage passe APRÈS
le tirage, compte ce qui est déjà là, et s'applique **aussi aux niveaux preset**.
Deux tests génériques le tiennent, sur tout niveau qui déclare un forçage.

⚠️ **Le FEEL fait partie de la grille écrite.** `GrilleEcrite` porte `swing`,
`drag` et `shift` : ils changent ce qu'on ENTEND sans changer une case. Tirés dans
`swingOptions`, ils rendaient au niveau le défaut que la grille écrite supprime ;
et `startLevel` forçait le décalage à `0` sur toute grille écrite, donc le niveau
23 n'en jouait **aucun**. Trois choses à garder : un motif de swing doit occuper
les pas **impairs** (seuls retardés) ; un décalage ne s'entend que **contre** des
lignes fixes ; la **traîne est globale**, donc inaudible dans une boucle — les
niveaux 15 et 18 restent orphelins **par décision**. `tests/feel-ecrit.test.ts`
mesure les trois en rejouant le scheduler (harnais `tests/helpers/rejeu.ts`).

⚠️ **`melodie` est le huitième verbe, et le seul qui sorte de la batterie.** Une
ligne de synthé monophonique, une note par pas, des DEGRÉS (0 = silence, 1-7).
⚠️ **Le niveau déclare SA ligne** (`melodie.ligne`) : l'acte 3 va de la mélodie à
la basse, et le verbe avait la basse en dur. La NAPPE reste hors de ce verbe —
il est monophonique par conception, elle joue des accords ; elle s'ajoute par un
cahier. Il n'étend pas `GameDrumRowName` : à la place `comparerGrilles` a été **généralisé**
(`Grille<N>` sur `number[]`), la mélodie a son propre état, et on reste sur **une
octave, sans accord**. La tonique tombe toujours sur le premier pas.

⚠️ **L'exercice de mélodie s'écrit comme dans l'Atelier : CASES + CLAVIER.** Une
ligne de cases porte les degrés, un clavier les écrit, la sélection avance seule.
⚠️ **Huit cases par rangée, cases et numéros ENTRELACÉS par mesure.** À seize pas
sur une rangée, la grille déborde de son conteneur et se fait COUPER — six pas
injoignables, l'exercice impossible, et la PAGE ne déborde pas : une mesure qui
ne regarde que `document.documentElement` ne le voit pas. Mesurer aussi les
conteneurs (`scrollWidth > clientWidth`). Et deux grilles empilées séparément
mettent les numéros 1-8 sous la seconde rangée de cases.
⚠️ La **tonique du premier pas est DONNÉE, verrouillée** : sans quoi le joueur
devait retrouver une note que la conception considère acquise. Corollaire de
câblage : un `$effect` qui recale la sélection doit se garder du **premier
rendu**, sinon il la ramène sur le pas verrouillé et le clavier n'écrit nulle part.

⚠️ **`arrangement` repose PLUSIEURS lignes de deux natures à la fois** — une
batterie qu'on allume au clic, un synthé en degrés qu'un clavier écrit, sur la
même colonne. Un seul verbe couvre l'acte 3 et les grosses reproductions des
actes suivants ; son axe de difficulté est le **nombre de voix**, pas de cases
(huit partout). ⚠️ **Six lignes est le plafond qui tient sans défiler** en
390 × 844 (mesuré) ; sept en font défiler 42 px et huit 88, rien n'est coupé.
⚠️ Toute ligne NON citée doit être coupée, et le balayage passe par
`DRUM_ROW_NAMES`, pas `GAME_DRUM_ROWS` — `defaultState()` ouvre les cinq lignes
de batterie, pas les trois du jeu.

⚠️ **Couper une ligne coupe l'ÉCOUTE, jamais la notation** (`arrEcoute`). Isoler
une ligne est un geste de studio ; ce qui est demandé ne bouge pas d'une case,
donc l'écran le dit (« elles restent à reposer ») et l'état repart neuf à chaque
niveau.

⚠️ **Des lignes de durées différentes, oui ; des subdivisions différentes, non.**
`LigneArrangement.cycles` déploie une ligne sur plusieurs MESURES — une colonne
reste un instant, sinon c'est une polyrythmie (niveau 74) et six lignes
deviennent illisibles. Une ligne plus courte se **répète** en pâle en face des
suivantes, et un trait de mesure toutes les `subdiv` colonnes empêche de lire
seize cases comme une mesure de seize. ⚠️ Réservé au SYNTHÉ : `DrumRowState` n'a
pas de `cycleBars`, donc `cycles: 2` sur une batterie afficherait une mesure
qu'elle ne joue pas. ⚠️ Et le pas remonté par le moteur est celui DE LA LIGNE :
la mesure courante se lit sur la ligne la plus longue, sinon la tête de lecture
reste bloquée sur la première moitié de l'écran. Progression : un arrangement ne
recule pas sur les **deux** axes à la fois (voix, mesures).

⚠️ **La NAPPE joue des ACCORDS : sa case porte un degré, le moteur reçoit un
index** (`degré − 1`, `buildState`). Lui passer le `{ degree, octave }` des deux
autres lignes donne `chordIdx = -1` — une ligne affichée, éditable, notée et
muette. Et son clavier s'arrête à `chordCount` (4) quand les autres montent à
5 : `degreMaxDeLigne` décide des deux, l'affichage et ce qu'`arrPoserNote`
accepte.

⚠️ **Le SON d'un niveau est un DÉCOR, pas une réponse — `model/sons.ts`.** Un
niveau écrit décide de ses timbres comme de son feel : envois, volume, module
Timbre, et pour le synthé une voix **citée** dans `SYNTH_VOICE_PRESETS` (jamais
réinventée) plus des `retouches`. Trois invariants testés : la cible et la
version du joueur reçoivent **le même son** (sinon une grille juste sonne faux) ;
`appliquerSons` passe **en premier** dans `buildState`, pour qu'un verbe de
paramètre garde la main sur le bouton qu'il fait entendre ; une voix hors
catalogue ne doit pas retomber en silence sur le défaut.

⚠️ **`silence` a sa bonne réponse dans ce qu'on n'entend PAS.** Deux pièges payés
et testés : le trou n'est jamais sur le premier pas, et le kick ne tient que ce
premier temps — sans quoi il boucherait ce qu'on demande d'entendre.

⚠️ **Un roast ne commente que ce qui a été MESURÉ.** `composerRoast`
(`presets/gameData.ts`, pur et testé) tire deux axes toujours vrais — le VERBE
joué et les ESSAIS, comptés dans `verify()` pour tous les verbes — plus un
troisième seulement si un compteur l'a vu passer, et rien sinon. L'ancien lisait
`voiceTier` pour annoncer « avec de la polyrythmie » sur les 51 niveaux `hard`
de douze verbes, et parlait d'écoutes que les verbes de paramètre ne comptaient
pas (`ecouterVersion` alimente maintenant `paramEcoutes`).

⚠️ **« Jouer » note la MEILLEURE fenêtre consécutive, pas la moyenne du tour.** La
boucle tourne en rond : moyenner rend les tâtonnements définitifs. La fenêtre doit
rester *consécutive* — « les meilleures où qu'elles soient » récompenserait le
martèlement. Et tout écran qui MESURE une frappe (calibrage compris) ne doit
**jamais** en ignorer une en silence : dire pourquoi.

---

## Les verbes de PARAMÈTRE

**Trois verbes** (`VERBES_PARAM`, `exercises.ts`) — `lequel` (entendre la
direction d'un bouton), `nommer` (mettre un nom dessus), `regler` (viser un son,
pas un chiffre) — **paramétrés par le bouton visé**. Le catalogue est `src/model/parametres.ts`, et c'est lui le vrai
travail : chaque entrée porte deux jugements MUSICAUX que le code ne devine pas —
`tolerance` (en deçà de quel écart deux réglages s'entendent pareil) et
`ecartMini` (au-delà de quel écart la différence est franche). Trois règles :

- le filtre se compare en **octaves** (`echelle: 'log'`) ;
- l'`id` doit être le **vrai champ** de `DrumRowState` — un `lowpass` inventé
  règle un champ mort, donc un niveau impossible et muet ;
- `lignes` dit **où le bouton s'entend** (`tone` ne fait rien sous zéro sur le
  kick).

`tirerVersions` garantit l'écart **par construction**, jamais par des marges.

⚠️ **Une question dont la réponse est inaudible n'est pas une question.** Le kick
balaie jusqu'à `max(20, 38 × mult)` : sous −10 demi-tons, toute la moitié basse du
curseur finit sur le même plancher de 20 Hz. D'où `plageParLigne` — `lignes` dit
**où**, `plageParLigne` dit **jusqu'où** — et `pourLigne()`, dont découlent les
versions, la cible ET le curseur affiché. Corriger ça dans le MOTEUR serait une
erreur : le plancher vient de l'original et protège l'enveloppe. Et
`paramsAutorises` restreint le tirage à des boutons déjà rencontrés.

⚠️ **Un niveau dont le TITRE nomme ses choix ne doit pas en gagner en silence.**
`nommer` prend ses leurres dans toute la famille : la famille `groove` passant de
deux boutons à cinq, le niveau 47 (« Swing ou décalage ? ») serait devenu une
question à quatre choix dont le titre en annonce deux. Sa liste `paramsAutorises`
est donc explicite. Enrichir un catalogue peut casser un niveau écrit des mois
plus tôt.

⚠️ **Un bouton de GROOVE ne s'entend que dans un contexte, et ça se mesure.**
`contexte` (`parametres.ts`) existe parce que le swing ne retarde que les pas
IMPAIRS : sur un motif posé sur `[0, 2, 4, 6]`, aucun effet audible. Et un décalage
ne s'entend que CONTRE un point fixe, d'où `repere` (le kick). La traîne est
délibérément **hors du catalogue** : globale et uniforme, elle n'a rien contre quoi
s'entendre.

⚠️ **Un bouton d'ALÉA se mesure en ÉVÉNEMENTS, pas en RMS.** Comparer deux rendus
au RMS mesure la différence entre deux tirages du hasard, pas l'effet du bouton —
il donnait à `spontRoll` un effet franc sur la caisse claire alors que
`scheduler.ts` ne le consulte que dans la voie du charley. Ce qui se mesure : le
**nombre d'événements** et la **dispersion des gains**, en rejouant le scheduler
(`tests/params-alea.test.ts`). Les trois boutons enseignés sont `ghostDensity`,
`randomVelocity` et `spontRoll`. Trois conséquences : `spontRoll` ne se déclare
que sur `['hat']`, `ghostDensity` que sur `['snare']`, et deux candidats ont été
**écartés par la mesure** — `globalCompression` et `globalBitcrush`, dont l'effet
n'est pas monotone. Un bouton non monotone ne peut pas porter « le plus… ».

⚠️ **Un verbe qui TIRE dans un catalogue doit tirer ses leurres LOIN.** Le verbe
`style` prend ses trois leurres dans d'autres catégories de presets, jamais la
même : « Boom bap » contre « Drill » et « Trap moderne » est un tirage au sort pour
tout le monde sauf un spécialiste. Il tire son preset à chaque partie
(`stylePool`, pas `presetId`), sur une COPIE de la config du niveau, avant les
helpers — un genre reconnu sur une grille générique n'est pas un genre.

⚠️ **Le jeu ne propose que des genres de 2005 — `HORS_EPOQUE`.** Mesuré avant
correctif : 39 % des parties affichaient au moins un genre postérieur, et 10 % du
temps c'était la bonne réponse. Trois choses : le filtre vit dans le TIRAGE
(`tirerStyle`), pas dans le `stylePool` d'un niveau, parce que c'est une règle du
récit ; l'**Atelier garde les 34**, parce que c'est un outil (composer un amapiano
est permis, le reconnaître en 2005 ne l'est pas) ; et un niveau `reproduire` dont
le titre NOMME un de ces genres ne se cite pas non plus. Le test vérifie aussi que
chaque identifiant de la liste existe — une coquille dans une liste d'exclusion ne
filtre plus rien, en silence.

⚠️ **Une leçon de PRODUCTION ne se raconte pas, elle se fait entendre.** D'où le
verbe `laverie` et son étage de moteur. Corollaire : `tone` sur le kick reste
**hors** de `parametres.ts` (en studio il ne s'entend presque pas) et c'est
précisément pour ça qu'il est le sujet de cet exercice — un bouton dont l'effet ne
se voit qu'ailleurs est une mauvaise question de timbre et une bonne question de
production. `laverie` POSE son bouton au lieu de le tirer.

---

## La courbe de difficulté

⚠️ **La COURBE se mesure dans l'ordre où la carrière joue, pas acte par acte.**
Chaque acte était cohérent avec lui-même ; c'est l'ENCHAÎNEMENT qui ne l'était
pas, et aucun test ne le regardait.

⚠️ **Une nouveauté se montre sur ce qu'on sait déjà faire — pas sur une grille
remise au propre.** Chaque niveau de l'acte 1 réécrivait le backbeat le plus
simple pour isoler ce qu'il enseignait : la suite des cases faisait une SCIE, et
six exercices sur huit se jouaient au niveau du deuxième. La série part désormais
du kick syncopé du niveau 7 et n'en redescend jamais. ⚠️ Ce qui rend un niveau plus
dur ici n'est pas un empilement de nouveautés mais la **RÉSOLUTION**.

⚠️ **Une nouveauté se pose au PLURIEL.** Une occurrence unique se trouve par
ÉLIMINATION — une seule variante sur une ligne qui en compte deux, une seule
rafale au dernier pas : le joueur apprend le geste sans jamais entendre ce qu'il
produit. Les niveaux posent donc deux à quatre occurrences, **de longueurs et de
timbres différents**, et les variantes ne sont **ni la première ni la dernière**
case de la ligne.

⚠️ **Mais un sujet ne vaut qu'UN exercice — le plus dense.** La règle inverse
(« un exercice pose, le suivant applique ») a tenu du 2026-08-31 au 2026-09-01 et
a été révoquée : *« l'acte 1 fusionné 12 → 6-7, le niveau 2 retiré, plus une
polyrythmie »*. Deux lectures de seize cases pour une seule idée neuve font de la
longueur, pas de la difficulté. Sur chaque paire, **c'est le plus dense qui
reste** (67, 68, 69, 74, 60, 8, 61) ; l'autre retourne au réservoir. Ce qui
remplace l'ancienne règle : **une nouveauté n'est demandée qu'après avoir été
MONTRÉE à l'écran** — Sol fait le rim shot et la rafale avant que le niveau 60 les
exige ensemble. `tests/grilles-ecrites.test.ts` tient l'ordre, pas le compte.

⚠️ **La polyrythmie de l'acte 1 (niveau 74) est écrite, pas citée.** Les cinq du
réservoir sont soit déjà jouées à l'acte 5, soit GÉNÉRÉES. Elle vaut par une
propriété qui ne se lit pas dans la grille et se mesure : **aucun de ses coups de
claire (12 cases) ne coïncide avec une case des deux autres lignes (16)** — posés
sur 0/3/6/9, ils retomberaient sur les temps et l'exercice n'enseignerait rien.

⚠️ **Seize cases par ligne est le plafond, et il est mesuré** — 18,7 px la case en
390 px de large ; trente-deux donneraient 9 px. Au-delà de l'acte 1, la difficulté
change donc d'AXE : **toutes** les grilles de l'acte 2 portent un feel, aucune de
l'acte 1 n'en porte. C'est ce que vérifie `tests/carriere.test.ts`, à la place de
l'ancien « strictement plus de cases ».

`tests/grilles-ecrites.test.ts` et `tests/carriere.test.ts` tiennent : la
résolution ne recule jamais dans l'acte 1, chaque niveau après le 7 garde une
syncope, chaque nouveauté y est posée au moins deux fois, chaque sujet a son
exercice d'application juste après sa découverte, et l'acte 2 démarre au niveau où
l'acte 1 s'arrête, feel en plus. ⚠️ Le poids mesuré est la RÉSOLUTION SEULE : un
niveau qui isole une nouveauté en retire délibérément d'autres (le 8 repose la
claire pour qu'on n'entende que la rafale), donc compter les variantes ferait
échouer le test sur une décision juste.

⚠️ **L'acte 2 porte TROIS arbitrages successifs — ne pas restaurer l'un en
croyant corriger l'autre.** Ses cinq grilles générées ont été retirées (elles
posaient des rafales et des rim shots sans rapport avec le groove) ; puis les
grilles sont revenues, **écrites**, sans variante ni rafale (« les quiz sont
moins intéressants que les exercices de reproduction ») ; puis le TRIO
comparatif — 14, 17 et 23 sur une seule grille — a été **dissous** (« les rythmes
se ressemblent trop »). Comparer deux balancements ne demande pas trois
reproductions : un curseur visé contre une cible le dit en un geste, et c'est
`regler`. D'où l'ordre de l'acte, **régler puis reproduire**, des grilles
**toutes différentes**, et l'ALÉA dans le cahier de Kelvin plutôt qu'en quiz.
Les niveaux 17, 45, 46, 62 et 73 restent au réservoir.
⚠️ **Le kick d'une grille de cet acte reste sur des pas PAIRS** — les seuls que
le swing ne retarde pas, donc « le kick tient le temps » est vrai au bit près et
un décalage a un point fixe contre quoi s'entendre ; `tests/feel-ecrit.test.ts`
et `tests/grilles-ecrites.test.ts` le mesurent. Le niveau 63 est la CLAIRE, la
seule ligne que le cahier de Kelvin laisse libre.

⚠️ **Un garde-fou dont la population devient vide passe en silence.** Le test
« une commande de `lequel` ne promet jamais un superlatif » s'ouvrait sur
`expect(commandes.length).toBeGreaterThan(0)` — la seule chose qui l'a empêché de
devenir décoratif le jour où `lequel` a quitté la carrière. Réancrer sur une
population plus large (les trois verbes de paramètre), jamais retirer le
compte.

⚠️ **Un test instable est un bug, pas un test à recalibrer.** « `régler` ne place
pas le curseur déjà sur la cible » échouait une fois sur quatre : la cause n'était
pas le seuil mais que « régler » tirait sa cible sans jamais l'éloigner du MILIEU,
où le curseur commence. `tirerCible(p, depart)` tire désormais la **distance** et
le **côté**. Règle générale : quand un test aléatoire est à la frontière, **c'est
ce qu'il mesure qui est cassé**.

---

## Les commandes

⚠️ **Une COMMANDE vérifie un cahier des charges, jamais une cible.**
`src/model/commande.ts` est le seul endroit où le jeu demande de FAIRE plutôt que
de retrouver. Trois façons de rater ça, évitées explicitement : ne rien vérifier
(le bouton est du théâtre), vérifier une cible (c'est `reproduire` avec des étapes
en plus), ou vérifier trop (une seule réponse juste, donc pas une production).
L'état passe en MÉMOIRE (`pattern.snapshot()`), jamais par un fichier. Le cahier
est **vivant** — les cases se cochent pendant qu'on travaille ; il n'y a donc
aucune réplique de refus, elle serait du code mort. Et l'état de la commande
survit à un changement de vue : il vit dans le store, avec l'acte ET l'étape.

⚠️ **Une COMMANDE ouvre les modules qu'elle exige — `modulesRequis`.** L'acte 3
était un cul-de-sac : sa commande demande une basse, or `moduleUnlocked` n'ouvre le
Synthé qu'une fois l'acte 3 FRANCHI. **Trouvé en jouant, pas par un test** — les
tests vérifiaient qu'un cahier est satisfiable *en mémoire*, ce qui ne dit rien de
ce que l'écran laisse faire. `tests/commande.test.ts` croise désormais le cahier ET
le verrou à l'instant où la commande se joue.

⚠️ **Une commande part d'un Atelier VIDE — `etatVierge()`.** `defaultState()` est
le motif d'accueil, et ⚠️ **ce motif est du MOTOWN** : `rankPresets` lui donne
100 % sur « Motown / soul » et sur « Swing ». Ouvrir une commande dessus cochait
des cases avant que le joueur ait touché à quoi que ce soit. D'où
`pasLeMotifDeDepart`, obligatoire dans toutes les commandes — et son `DEPART` doit
être **la même** table rase.

⚠️ **Une commande peut aussi TRANSFORMER — `partirDu`, et sa condition.** Ce qui
est interdit n'est pas un Atelier non vide, c'est **une case cochée avant qu'on
ait touché à quoi que ce soit**. Partir d'un rythme est donc permis à une condition
et une seule : le cahier doit exiger ce que ce rythme n'a PAS. Trois choses tenues
par `tests/transformer.test.ts` : aucune TÂCHE cochée à l'ouverture (pour toutes
les commandes) ; `partirDu` ne cite qu'un niveau à **grille écrite** ; et ce niveau
doit être joué **dans le même acte**. Le test confronte aussi les données au
CÂBLAGE (`departCommande()`).

⚠️ **Une INTERDICTION n'est pas une tâche — `Contrainte.interdit`.** « Ton morceau,
pas le preset chargé » est satisfaite tant qu'on ne triche pas et se DÉcoche si on
triche : l'exiger décochée à l'ouverture voudrait dire « commence par tricher ».
Elle est marquée dans les données plutôt que nommée à la main dans un test — une
exception qu'on ne voit qu'en lisant un test est une exception que personne ne voit.

⚠️ **La sévérité d'une commande DÉCROÎT avec le récit**, et c'est l'acte 6 qui
l'impose : « aucun brief, aucun client, aucun style imposé ». Les clients des actes
2 à 5 exigent des choses précises parce qu'ils paient ; FB-015 constate seulement
qu'on s'est servi de ce qu'on a appris. Et **jamais de commande avant l'acte 2** :
l'acte 1 garde sa `livraison`, qui est un cadeau et non une épreuve.

⚠️ **COMPLET n'est pas SÉVÈRE — le cahier de FB-015 est le plus long du jeu
(onze lignes) et n'exige aucun goût.** Il RÉCAPITULE : une section par acte
traversé, un geste par leçon, des libellés écrits du point de vue du joueur.
Aucune fiche de style, aucun verrou de provenance, aucun chapeau de genre — les
trois se réintroduiraient facilement en croyant « compléter ».
`tests/carriere.test.ts` tient les deux moitiés ensemble.

⚠️ **« Dans le style de » se juge sur une FICHE, pas sur une ressemblance.**
`src/model/styles.ts` décrit chaque genre par des CRITÈRES nommés — placements lus
en *temps* et non en cases, tempo, instrument — et la livraison passe quand la part
de critères atteint le `seuil` de la fiche (0,8 par défaut, réglable par fiche).
Trois conséquences :

- **une fiche sert à la fois de description, de juge et de retour** — les écrire
  séparément, ce serait deux vérités qui divergent au premier ajustement ;
- **le pourcentage n'est PAS celui de `rankPresets`**, qui compte les cases
  identiques, cases vides comprises — 70 % peut vouloir dire « deux grilles
  également vides » ;
- **le seuil ne s'applique jamais à ce qui NOMME le genre** : un critère
  `essentiel` est exigé quel que soit le total. Deux au plus par fiche.

Une fiche décrit ce qu'il FAUT entendre — jamais l'absence d'un instrument.
Décrire le CARACTÈRE d'une ligne présente reste permis (« ce charley ne s'ouvre
jamais » est le seul critère qui sépare la techno de la house). Une fiche se
**calibre** : le preset du genre doit la satisfaire entièrement, les 33 autres
échouer, et le plus proche rester à au moins **deux critères**.

⚠️ **Une fiche ne peut pas décrire un genre dont le voisin partage tout sauf un
nombre.** Mesuré deux fois de suite : la fiche du boom bap acceptait le drunk
beat, celle de la house acceptait le hard house — un seul critère les séparait
(le tempo). La sortie n'est pas de raboter une borne jusqu'à ce que le voisin
tombe : c'est de décrire le membre de la famille qui a une propriété POSITIVE
que les autres n'ont pas — la traîne et les ghost notes du drunk beat, le
shuffle à 45 % du garage, le shaker du dembow. Un plafond de densité reste
permis (le charley TROUÉ du garage) : c'est la description d'une ligne
présente, pas l'exigence d'une absence.

⚠️ **La discographie est rangée par (acte, SÉRIE), pas par acte.** Une chaîne
d'envois garde une série et se remplace (« les livraisons intermédiaires sont
remplacées », actes 3 et 4) ; deux genres différents dans un même acte ont
chacun la leur et coexistent — sinon l'acte 5 fait produire quatre morceaux pour
n'en rendre qu'un. `EtapeCommande.serie`, vide par défaut.

⚠️ **Une commande de style sans verrou de presets est un menu déroulant.** Le
verrou est double : le menu Morceaux est désactivé pendant une commande, et
`pasUnPresetCharge` refuse un preset chargé TEL QUEL. Ce qu'on refuse est la
**provenance**, jamais la ressemblance — suivre la fiche honnêtement mène à la
grille du preset, et punir ça punirait le joueur d'avoir bien travaillé. La
provenance vit dans `pattern.presetCharge` (hors format v2) et voyage par
`ContexteLivraison`.

⚠️ **Un acte de production est une CHAÎNE D'ENVOIS, pas une suite d'exercices.**
L'acte 4 enchaîne trois commandes sur le MÊME morceau : la première ne juge que
le morceau, les deux suivantes ne demandent que du mixage et repartent de ce qui
vient d'être livré (`partirDeLaLivraison`, lu dans la discographie par
`departCommande`). C'est ce qui remplace les cinq exercices de l'acte, tous
déclarés « NOK » en jeu : on ne nomme plus un filtre, on s'en sert parce que le
client renvoie le morceau sans lui. ⚠️ Le verbe `laverie` et son étage de moteur
RESTENT — le petit haut-parleur garde sa valeur d'outil d'écoute, il perd son
rôle d'exercice noté ; et les niveaux 53-57 restent au réservoir.

⚠️ **Une contrainte qui mesure un GESTE lit le départ dans le CONTEXTE.**
`ContexteLivraison.depart` porte l'état sur lequel l'Atelier s'est ouvert :
depuis la chaîne d'envois, ce n'est plus une donnée figée dans le cahier. Absent,
ces contraintes répondent **faux** — une case cochée faute d'information est le
théâtre que le cahier interdit. Corollaire : toute borne d'un cahier de mixage a
un **plafond** (`reverbDosee`, `filtreQuiCoupe`), sinon elle se satisfait en
poussant un curseur à fond, ce que l'acte enseigne justement à ne pas faire.

⚠️ **Le mixage ne s'arrête pas à la batterie.** `LIGNES_MIX` ne contenait qu'elle,
donc un cahier qui citait la nappe ne vérifiait rien : les cinq contraintes
prennent maintenant leurs lignes en paramètre (`LIGNES_TOUTES`). ⚠️ **Le filtre
d'une ligne de synthé se mesure en GESTE** (`aBaisseLeFiltre`, contre
`ctx.depart`), jamais par un seuil absolu — sa voix d'usine coupe déjà à 600 Hz,
donc « au-dessous de 9 000 » serait coché sans rien toucher.

⚠️ **Un critère satisfait par les valeurs d'USINE est du théâtre.** Les volumes
par défaut diffèrent déjà (kick 1,0 / claire 0,9 / charley 0,7) : « range les
plans » était vrai à l'ouverture de tout morceau qui sonne. `contrasteDeVolume`
exige donc en plus un curseur bougé. La garde « aucune case cochée à
l'ouverture » ne pouvait pas le voir — elle mesure sur un Atelier VIDE, où
aucune ligne n'est vivante.

⚠️ **Une case de nappe porte un INDEX d'accord, jamais un degré.** L'accord `1`
est le IV : `CHORD_PRIORITY_ORDER` range les accords dans l'ordre pop
(I, IV, V, vi). Lire l'index comme un degré (`laBasseDitLAccord`) demanderait une
basse en II sous un accord de IV — une question fausse, et fausse en silence.

⚠️ **Une case du fax de l'acte 5 se joue en DEUX temps** — le squelette (le
rythme, jugé par la fiche de style) puis le SON (les couches, jugées par le
cahier) — et l'exigence de synthé ne redescend jamais d'une case à l'autre
(`tests/carriere.test.ts`, mesurée sur la case entière : lire le seul dernier
envoi mesure la moitié du travail). Corollaire de `partirDuMorceauDeLActe` : un
cahier qui repart d'une livraison n'exige QUE ce que cette livraison n'a pas —
la garde des cases décochées ne peut pas le vérifier, elle mesure sur une
discographie vide.

⚠️ **Une leçon de PRODUCTION se mesure sur l'ÉTAT, et chaque critère exige un
GESTE.** (`kickQuiPorte`, `contrasteDeVolume`, `filtreQuiCoupe`, `reverbDosee`,
`delayEngage`, `chaqueLigneRetouchee`.) Trois choses payées : rendre le morceau dans un
`OfflineAudioContext` à chaque frappe rendrait le cahier vivant asynchrone, donc on
mesure l'état et on calibre le seuil (`tone >= LAVERIE_DRIVES[1]`) ; un critère
satisfait sans rien toucher est du théâtre, d'où « de l'espace **mais pas de la
soupe** » plutôt qu'un simple plafond de réverbe ; et le kick est **exclu** de « tu
as enlevé », parce que lui couper les aigus retirerait ce qui vient de le sauver.
`Contrainte.section` porte les titres d'étape : six lignes à plat ne disent pas
qu'il y a deux gestes, ni dans quel ordre.

⚠️ **Un cahier se REFAIT, s'abandonne, et vaut trois étoiles — ou zéro.** La
salle de répétition liste les commandes traversées (`commandesRencontrees`) à
côté des niveaux ; `repeterCommande` rouvre le cahier **sans bouger le curseur
du récit** (`repetitionCommande`, volatil) et sa livraison remplace quand même
la production de sa série. Leur clé
(`cleCommande`, `c<acte>.<étape>`) ne peut pas collisionner avec un id de
niveau, et une commande ne fait jamais avancer `level`.

⚠️ **La note d'une livraison mesure ce qu'on a fait EN PLUS du cahier** —
`etoilesDeLivraison(enPlus, cycles)` : 3★ pour trois réglages cherchés et deux
cycles écoutés, 2★ pour deux et un, 1★ sinon, 0★ à l'abandon. Une livraison
acceptée ne vaut jamais zéro (le bouton est verrouillé tant que le cahier n'est
pas satisfait). ⚠️ **« En plus » se CALCULE, il ne se déclare pas** :
`reglagesEnPlus` remet chaque réglage changé à sa valeur de départ et réévalue
le cahier — s'il passe encore, le réglage était gratuit. Sans ça, un cahier de
mixage (qui EXIGE six retouches) donnerait 3★ d'office et la note mesurerait le
type de cahier, pas l'effort. On compte un RÉGLAGE, jamais une case ni le tempo,
et une voix choisie compte pour un.

⚠️ **`departCommande()` lit la commande OUVERTE, jamais le curseur de
carrière.** Les deux coïncident tant qu'on joue dans l'ordre et divergent dès
qu'on refait un cahier depuis la salle — le départ serait alors celui d'une
autre étape.

⚠️ **Une seule commande par acte n'est PLUS la règle.** Elle l'était tant qu'un
acte enseignait par des exercices et concluait par une livraison. Ce qui reste
tenu : après la DERNIÈRE commande d'un acte il ne reste que du récit, et dans une
chaîne, seule la première part d'autre chose qu'une livraison.

⚠️ **Une couche déjà livrée se protège par ce qu'on AJOUTE, pas par une
interdiction.** Les trois envois de l'acte 3 (mélodie → basse → nappe) ne
défendent jamais d'y toucher : `basseQuiTient` compare la basse à la mélodie, si
bien qu'effacer celle-ci rend celle-là insatisfiable. Une interdiction punirait
l'essai, ce que l'Atelier n'a pas à faire. Corollaire d'écriture : un envoi
n'exige QUE la couche qu'il ajoute — redemander la précédente l'afficherait
comme une case cochée d'avance.

⚠️ **Une RÉACTION à la livraison cite un fait de l'état, et son seuil se calibre
sur les 34 presets.** `src/model/reactions.ts` lit le MORCEAU, là où les roasts de
`gameData.ts` commentent la FAÇON DE JOUER. Quatre règles : une observation cite
une propriété vérifiable de `PatternStateV2` ; on ne commente que ce qui est
AUDIBLE (et si rien ne sonne, `reactionA` rend `null`) ; le poids est la
**spécificité**, jamais la sévérité ; et rien de remarquable → **aucune** réplique.
⚠️ Le calibrage n'est pas un avis : « ta basse fait deux notes » tombait sur 12
presets sur 34 et « ton charley ne respire jamais » sur 11 — une remarque qui tombe
une fois sur trois est un reproche automatique. `tests/reactions.test.ts` tient les
seuils contre le catalogue.

⚠️ **L'EXPORT vit hors des onglets.** Il était dans l'onglet Production, donc
verrouillé jusqu'à l'acte 4 — alors que la livraison de l'acte 1 dit « exporte-le
en MP3, c'est ta sonnerie ». Exporter n'est pas un réglage de production, c'est
FINIR.

---

## Mise en ligne

Un `git push` sur `main` déclenche : types, tests, les deux builds, puis
déploiement sur Vercel **seulement si tout passe**. Une pull request lance les
tests sans déployer. Site : <https://boite-a-rythmes.vercel.app>

## Conventions de session (Claude Code)

**Piège git à chaque nouvelle session.** Le squash-merge d'une PR crée un SHA
différent sur `main` : la branche locale garde l'ancien historique en plus des
nouveaux commits. Avant tout nouveau commit :
`git fetch origin main && git checkout -B <branche> origin/main`, puis
cherry-pick. Un `push --force-with-lease` qui en résulte est attendu.

**Workflow PR, sans redemander permission (politique actée par Yann) :** ouvrir la
PR → `subscribe_pr_activity` → attendre la CI (poll via les tools GitHub, jamais de
`sleep`) → merger en squash si vert → `unsubscribe_pr_activity`.

⚠️ **Interroger la CI passe par les outils GitHub MCP, JAMAIS par `curl`.** L'API
non authentifiée est bloquée : elle répond un JSON d'erreur sans la clé attendue,
donc une boucle `until [ -n "$(curl … )" ]` **ne se termine jamais**. Penser aussi
à arrêter les tâches de fond dès que la PR est mergée.

⚠️ **Lire un statut de CI : deux chemins, et seulement deux.**

- **Sur une PR** → `pull_request_read method=get_check_runs`. Direct, quelques
  centaines d'octets. C'est le seul à utiliser tant qu'on est sur une PR.
- **Sur `main` après un merge** → il n'y a **pas** de raccourci, et deux fausses
  pistes coûtent du temps : `get_commit` n'expose pas les check runs, et deviner
  un id de run répond 404. La méthode est donc `actions_list
  method=list_workflow_runs` (filtre `branch: main`), **une fois** : son résultat
  fait ~93 Ko, le harness le déverse dans un fichier et ne rend qu'une erreur —
  ce n'est donc **pas** un gouffre à tokens, mais il faut savoir que c'est
  attendu. Parser le fichier en `python3` (`json.load` → `workflow_runs[0]`) pour
  en tirer l'id, puis `actions_list method=list_workflow_jobs` sur cet id, qui
  donne les deux jobs (« Tests & build » et « Déploiement Vercel »).

⚠️ Ne jamais relire un fichier déversé en entier : le parser.

⚠️ **Vert sur la PR ne veut pas dire vert sur `main`.** Un test qui dépend du
hasard doit affirmer ce qui est vrai à CHAQUE tirage et répéter (60 fois). Une
assertion à un seul tirage est passée en local et sur la PR, puis a échoué sur
`main` — build non produit, déploiement sauté, PR mergée mais site inchangé.
**Après un merge, vérifier le run de `main`**, pas seulement celui de la PR.

**Avant chaque commit :** `npm run check` (0 erreur), `npm test`, `npm run build`
+ `npm run build:singlefile`. Pour un changement d'UI : serveur de dev et
vérification visuelle avec Playwright (headless, Chromium à `/opt/pw-browsers/chromium`,
driver global en CommonJS depuis `/opt/node22/lib/node_modules/playwright/index.js`).
**Vérifier visuellement ne suffit pas pour une mise en page : mesurer.** Les
scripts de mesure ont trouvé des défauts invisibles à l'œil.

⚠️ **`progresCarriere` est un GETTER : lui affecter une valeur ne fait RIEN, en
silence.** Dans un script de mesure, `game.progresCarriere = {...}` est avalé
(le code de `page.evaluate` n'est pas en mode strict) — c'est ce qui a fait
croire à un cul-de-sac à l'acte 6, et ça a resservi depuis. Poser
`acteActif`/`etapeActive` (eux sont du `$state`) puis `demarrerEtape()`, ou
jouer la carrière.

⚠️ **`scripts/parcours-carriere.cjs` exige un serveur de dev FRAÎCHEMENT démarré.**
Le HMR de Vite ré-exécute un module modifié : le script obtient une seconde
instance de `game` pendant que `unlocks` garde la première, la colonne « modules »
affiche « — » du début à la fin, et ça ressemble trait pour trait à une régression
du déverrouillage. Redémarrer `npm run dev` avant de conclure quoi que ce soit.

⚠️ **Une fixture ne joue pas le jeu.** Les huit actes ont été vérifiés un par un
avec un `localStorage` posé à la main — ce qui a caché pendant sept PR que les
quatre modules se déverrouillaient à la fin de l'acte 0.
`scripts/parcours-carriere.cjs` joue la carrière entière depuis un joueur neuf :
**le relancer après toute modification du déverrouillage, de la progression ou de
la chaîne des actes.**

**Piège Svelte 5 :** `structuredClone()` casse sur un proxy `$state` — utiliser
`$state.snapshot()`.

**Avant d'étendre un type central** (ex. `DrumRowName`, `SynthRowName`), faire
cartographier tous les points de contact avant de coder — la surface réelle
dépasse presque toujours l'estimation.

### Les documents

- **`REPRISE.md`** — le brief de reprise, à lire en PREMIER : où en est le travail,
  la décision en attente, les pièges, ce qui est vérifié ou non.
- **`PLAN.md`** — le journal détaillé, une entrée ✅ par livraison (fichiers
  touchés, rationale, écarts de portée assumés). C'est là que vivent les
  démonstrations et les mesures que ce fichier-ci résume. **Le tenir à jour**, et
  y garder les entrées courtes.
- **`HISTOIRE.md`** — le récit source, entièrement porté.

**Style de travail avec Yann :** instructions courtes (« go », « pars sur… »), il
attend qu'on avance sans reposer trop de questions. Exceptions : demande explicite
d'analyser avant de coder, ou fourche à choix multiples sans défaut évident (poser
la question, recommandation en premier). Quand une demande a une portée ambiguë ou
plus grosse que prévu, présenter un périmètre scopé et le faire confirmer — mais
une fois qu'il a dit d'arrêter de demander, arrêter.

⚠️ **Ce fichier est relu à chaque tour : le garder court.** Une règle neuve
s'ajoute en une à trois phrases — l'invariant, et sa raison. La démonstration
(mesures, dates, ce qui a cassé) va dans `PLAN.md`.
