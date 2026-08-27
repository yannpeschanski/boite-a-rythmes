# Boîte à rythmes — contexte du projet

Séquenceur / boîte à rythmes web, habillé en skin Winamp 2.x. Réécriture d'un
fichier HTML unique de 9 289 lignes vers Svelte 5 + TypeScript + Vite.

⚠️ Les dossiers et les tokens s'appellent encore `xp` (`src/ui/xp/`,
`--xp-*`) : **les noms ont été conservés, les valeurs remplacées.** Renommer
n'aurait touché que des étiquettes, au prix d'un diff illisible sur toute
l'appli. Ne pas en déduire que le design est resté XP — lire la règle
ci-dessous.

## Commandes

```bash
npm run dev              # serveur de dev (http://localhost:5173)
npm test                 # Vitest — modèle et moteur audio
npm run check            # svelte-check (types) — doit rester à 0 erreur
npm run build            # site déployable        -> dist/
npm run build:singlefile # fichier HTML autonome  -> dist-singlefile/index.html
```

## Règles importantes

**Le design est une skin Winamp 2.x, et c'est un choix, pas un héritage.**
Chrome gris-violet biseauté d'un pixel, bandeau de fenêtre indigo, afficheurs LCD
verts, chasse fixe en petites capitales espacées. **L'échelle vit dans les tokens
`--xp-size-*` / `--xp-ls-*` (`src/ui/xp/tokens.css`)** : 8,5-9px pour le chrome,
9,5px pour le texte courant, et `--xp-font` est un alias sur `--xp-mono` — la
chasse fixe est la moitié de la grammaire, le biseau est l'autre. Retenu par Yann en août 2026 au
terme d'un audit de 29 directions maquettées (voir PLAN.md, « audit design × DAW »
et les séries suivantes). Ne propose pas de l'« aplatir » ou de le « moderniser » :
**le biseau d'un pixel EST la grammaire**, c'est lui qui dit ce qui est en relief,
creusé, ou allumé.

Le fond Bliss, les barres de titre Luna et le thème `noir` du Mode jeu sont
retirés : l'appli parlait **trois langues visuelles** (Atelier en Luna, Mode jeu
en `noir`, Mode Live avec ses tokens `--amp-*`), elle n'en parle plus qu'une.
C'est l'argument principal du choix, et il n'est pas esthétique.

**Le tactile passe par `.tap44` / `.tap44-y`** (`src/styles/global.css`).
Capitales de 8,5 px et reliefs d'un pixel sont dessinés pour une souris : une zone
touchable monte à 44 px **sans que le dessin grandisse**, grâce à un pseudo-élément
transparent centré sur le bouton, sous `@media (pointer: coarse)` seulement. Deux
règles qui coûtent cher si on les oublie : ces enveloppes **débordent et se marchent
dessus** (d'où l'écartement du rythme vertical dans les mêmes blocs `coarse`), et un
bloc `@media` posé au milieu d'un `<style>` Svelte est **écrasé par les règles écrites
plus bas** — les mettre en fin de `<style>`. `getBoundingClientRect()` ne voit pas le
pseudo-élément : mesurer avec `elementFromPoint`, après un `scrollIntoView` —
sinon tout ce qui est sous la ligne de flottaison renvoie `null`. Trois exceptions
revendiquées (largeur des cases, libellés d'aide, Mode Live) sont documentées dans
PLAN.md, étape 6.

`<select>` et `<input type="text">` sont des **éléments remplacés** : Chromium
n'y rend aucun `::after`, l'astuce ne marche pas. Eux passent par
`min-height: 44px` — ils n'ont ni biseau ni petites capitales à préserver. Et
`color-scheme: dark` sur `body` aligne tout ce que le navigateur dessine à notre
place (cases à cocher, listes déroulantes, ascenseurs) : sans ce mot, les seules
zones claires de l'écran étaient des widgets natifs au milieu du verre noir.

⚠️ **Les maquettes de référence sont dans `maquettes/atelier/`** — `build_modes.py`
produit les six écrans (accueil, Rythme, Synthé, Production, Mode jeu, Mode Live
en paysage) dans la langue retenue. S'y référer avant de dessiner un écran neuf.

**`original/boite-a-rythme-69.html` est la source de vérité.** Ses commentaires
expliquent le *pourquoi* de chaque choix audio — ratios 808/909 du banc
d'oscillateurs du hat, plafonds de release, seuils des limiteurs, valeurs de decay
resserrées. Avant de modifier une constante audio, va lire le commentaire d'origine :
il y a presque toujours une raison, souvent une impasse déjà explorée. Ces
commentaires ont été portés dans le code, les conserver.

**Le moteur audio (`src/engine/`) ne doit jamais importer Svelte ni toucher au DOM.**
C'est ce qui lui permet de servir à la fois la lecture en direct, le rendu hors
ligne de l'export et le mode jeu. Il reçoit un `BaseAudioContext` en paramètre
(`AudioContext` en direct, `OfflineAudioContext` à l'export) et un instantané d'état.

**L'aléatoire passe toujours par un `rng` injecté**, jamais `Math.random()` en dur :
c'est ce qui rend les NOTES d'un export reproductibles — **et c'est là que
s'arrête la promesse.** ⚠️ Pas les octets, et la nuance a été mesurée le
2026-08-25 : deux rendus du même état donnent 0 échantillon d'écart sur un kick
seul, et 8 465 sur une caisse claire. Deux tampons sont remplis hors du `rng` —
le bruit blanc partagé (`graph.ts`) et l'impulsion de réverbe (`fx.ts`),
reconstruits à chaque `buildGraph`, donc à chaque export.

**Arbitré par Yann le 2026-08-25 : « c'est pas important qu'un export ne soit
pas reproductible à l'octet près ». On ne sème donc PAS ces deux tampons** —
ce n'est pas une dette, c'est un choix. Ne pas le « corriger » en croyant
nettoyer : le semer changerait les octets de tous les exports futurs pour une
propriété dont personne n'a besoin. Ce qui reste vrai et qui, lui, compte : le
`rng` injecté gouverne les NOTES — quelles cases sonnent, avec quelle vélocité,
quelles rafales — et un même état doit toujours donner le même morceau. Ne pas changer l'ordre
d'itération des lignes dans le scheduler — réel aujourd'hui : kick → snare → clap →
hat → shaker → bass → pad → melody (clap partage la boucle de kick/snare, shaker suit
le hat) — il détermine l'ordre de consommation du générateur. Ne pas non plus insérer
un appel à `rng()` avant un autre : un tirage de plus, même sans effet audible, décale
tout ce qui suit. `tests/scheduler.test.ts` verrouille les deux (rejeu du scheduler
avec de faux kits, sans Web Audio) — si son instantané de référence tombe, la question
n'est pas « comment le mettre à jour » mais « est-ce que je viens de rendre les
anciens exports non reproductibles ? ».

⚠️ **Un objet muté doit être `$state`, sinon le prop qui en dérive est figé.**
`synthStepAt` (AtelierView) était un `const` : le muter ne redéclenchait rien, donc
`stepStartedAt` arrivait toujours à 0 dans le pad, et `quantizeToStep` prenait
systématiquement son repli « écrire sur le pas en cours » — le défaut même que ce
module pur et testé existe pour éviter. Ni les tests ni l'écran ne pouvaient le dire.
Quand un module pur est testé et que le comportement reste faux, **suspecter le
câblage, pas le calcul**.

**Le format d'état v2 (`src/model/types.ts`) est le contrat central.** Stores, moteur,
sérialisation, presets et undo/redo parlent tous cette forme. Elle est compatible avec
les fichiers de sauvegarde de la version d'origine (v1 et v2) — ne pas casser
`deserialize`.

## Architecture

```
src/model/    état v2 typé, sérialisation, données (34 presets, 34 niveaux, gammes, voix)
src/engine/   moteur audio TypeScript pur — aucune dépendance UI
src/stores/   état réactif en runes Svelte 5 (pattern, jeu, historique, partage)
src/ui/       design system (dossier `xp/`) + vues Atelier, Mode jeu et Mode Live
```

⚠️ **Le jeu s'appelle FACE B** (arbitrage de Yann, 2026-08-27) — c'est le nom
du label, pas celui de l'outil. « Boîte à rythmes » décrivait le séquenceur ;
le produit, lui, est une carrière dans un label qui a cinq mois pour ne pas
fermer. Le nom vit dans `index.html`, le splash et le titre de fenêtre du Mode
jeu ; les occurrences en commentaire parlent de l'objet « boîte à rythmes » en
général et restent.

⚠️ **Ce qui est VERROUILLÉ ne s'affiche pas.** Renverse la décision de
2026-08-16, qui gardait les entrées cadenassées visibles pour qu'elles se
lisent « comme une suite » plutôt que « comme une panne ». Verdict d'un joueur
réel après une partie complète : un accueil où deux entrées sur trois sont
barrées présente le jeu par ce qu'on ne peut PAS faire. Splash, barre de
navigation et onglets de l'Atelier masquent donc ce qui n'est pas ouvert.

⚠️ **Le récit se passe en 2005, et une SEULE date est écrite.** `ANNEE` et
`dateDeLActe` (`carriere.ts`) : le concert est le 14 juin 2005, tout le reste
se déduit de `JOURS`. 2005 parce que c'est la seule année où le postulat tient
— les sonneries sont encore un marché dont un petit label peut vivre, le fax
et le répondeur sont des outils, MSN est le chemin normal vers un commercial ;
en 2006 le marché s'effondre et le récit n'a plus de sol. Le calendrier était
déjà dans `JOURS` sans être affiché : les quatre premiers actes tombent
exactement le 14 de leur mois, les trois derniers à six, quatre et deux
semaines. Quatre tests le tiennent — un ajustement du compte à rebours
casserait la coïncidence en silence.

**Le Mode jeu s'ouvre sur le Mode carrière, et c'est le RÉCIT qui ouvre les
modules.** `src/model/carriere.ts` porte les huit actes de `HISTOIRE.md` ;
`PlayerProgress.carriere = { acte, etape }` est un **second axe**, délibérément
séparé de `level`/`stars` — le récit dit ce qui est OUVERT, le réservoir des 41
niveaux (la « salle de répétition ») dit ce qui est MAÎTRISÉ. Trois règles
payées d'avance : un acte **cite** des niveaux du réservoir, il n'en fabrique
jamais (un même exercice, pas une variante qui dériverait) ; le curseur persisté
ne recule **jamais**, sinon relire l'acte 1 refermerait l'Atelier qu'il vient
d'ouvrir ; et `moduleUnlocked` est un **OU** entre l'acte et le seuil de niveau,
ce dernier lu sur le **plancher** et jamais sur `level` (voir la règle du
plancher gelé, plus bas) — retirer le second membre priverait de leurs modules
ceux qui jouent hors carrière.
Une commande d'acte ne doit **promettre que ce que le tirage tient** : les
niveaux de paramètre tirent leur bouton ET leur sens, donc une consigne qui
nomme l'un des deux ment une fois sur deux ou sur quatre. Elle peut poser la
propriété (« là, c'est la durée qui change ») ou offrir la paire (« plus fort
ou plus doux ? ») ; jamais un superlatif, qui désigne un seul extrême. Deux
tests le tiennent, un par chose tirée.

⚠️ **Un exercice n'enseigne que ce que l'écran a DÉJÀ expliqué**, et le verbe
est ce qui décide. `lequel` parle en PROPRIÉTÉS (« laquelle sonne la plus
grave ? ») et se joue partout ; `nommer` et `regler` sont des verbes de
VOCABULAIRE — ils exigent que le mot soit sur un bouton que le joueur a vu,
donc que l'Atelier soit ouvert. Les mettre à l'acte 0 a produit « je ne sais
même pas expliquer ce que c'est decay » : aucun texte ne rattrape un mot qui
n'existe nulle part dans le jeu à ce moment-là. Corollaire : un GESTE
s'enseigne dans l'acte de son objet — variantes et rafales sont des gestes de
grille, donc de l'acte 1, pas de l'acte « groove » où personne ne les
expliquait.

⚠️ **Une COMMANDE ouvre les modules qu'elle exige — `modulesRequis`.** L'acte 3
était un cul-de-sac : sa commande demande une basse, or `moduleUnlocked`
n'ouvre le Synthé qu'une fois l'acte 3 FRANCHI, et la commande est la dernière
étape de l'acte 3. Elle demandait donc l'impossible, et la carrière s'arrêtait
là — **trouvé en jouant, pas par un test**, parce que les tests vérifiaient
qu'un cahier est satisfiable *en mémoire*, ce qui ne dit rien de ce que l'écran
laisse faire. Le grant est de la même famille que `sharedPattern` : une
intention explicite ouvre ce qu'il faut pour l'honorer, et rien de plus.
`tests/commande.test.ts` croise désormais le cahier ET le verrou à l'instant où
la commande se joue.

⚠️ **Une commande part d'un Atelier VIDE — `etatVierge()`.** `defaultState()`
est le motif d'accueil, et ce motif est du Motown : ouvrir une commande dessus
cochait des cases du cahier avant que le joueur ait touché quoi que ce soit
(« la check-list est déjà remplie quand on ouvre l'exercice »). Corollaire à ne
pas oublier : le `DEPART` de `pasLeMotifDeDepart` doit être **la même** table
rase, sinon « il faut y avoir touché » se coche tout seul à l'ouverture.

⚠️ **Une étape qui envoie dans un module doit d'abord FRANCHIR son étape.**
`moduleUnlocked` lit l'acte ATTEINT (`acte > 1` pour l'Atelier) : la livraison
de l'acte 1 (`EtapeLivraison`, le troisième `kind`) ouvre l'Atelier sur le
rythme qu'on vient de faire — partir sans avoir avancé le curseur donnerait un
module **ouvert à l'aller et cadenassé au retour**. `livrer()` avance, absorbe
l'annonce de fin d'acte (la livraison EST cette annonce), puis navigue.

⚠️ **Un bouton de GROOVE ne s'entend que dans un contexte, et ça se mesure.**
`contexte` (`parametres.ts`) existe parce que le swing ne retarde que les pas
IMPAIRS : le motif par défaut des exercices de paramètre posait ses notes sur
`[0, 2, 4, 6]`, tous pairs — aucun effet audible. Et un décalage ne s'entend
que CONTRE un point fixe, d'où `repere` (le kick, seule ligne non coupée en
plus de la ligne visée). La traîne (`drag`) est délibérément **hors du
catalogue** : globale et uniforme, elle n'a rien contre quoi s'entendre. Vérifié
par rejeu du scheduler avec un faux kit, pas à l'oreille.

⚠️ **Ce qui n'a pas été porté n'existe pas.** `HISTOIRE.md` consacre cent
quarante lignes à la mise en place AVANT l'acte 0 ; la première version du Mode
carrière n'en portait aucune et s'ouvrait sur la première péripétie — verdict de
Yann : « on comprend rien ». Un récit écrit dans un document et *cité* par le
code n'est pas dans le jeu : celui qui a lu le document comprend l'écran, le
joueur juge sur ce qui s'affiche. Corollaire de mise en scène : **un élément
n'apparaît qu'à l'écran qui l'explique** — le compte à rebours se lève sur
l'écran « LE 14 JUIN », le carnet des actes après le prologue, et le premier
écran ne montre qu'un appareil, un message, un bouton.

⚠️ **Un PERSONNAGE se présente comme un décor : avant de parler.** Sol porte
presque toutes les répliques et n'avait qu'une demi-phrase, dans l'écran qui
parlait du joueur (« on ne présente pas Sol ? »). Son écran passe donc avant
celui des sonneries, qui porte déjà une de ses répliques — `tests/carriere.test.ts`
verrouille l'ordre. Et le récit s'écrit **une idée par ligne** : une ligne qui se
replie se lit comme du texte courant. Ça ne se voit pas, ça se **mesure** (hauteur
de chaque `.ligne` contre une hauteur de ligne), et ça se corrige en COUPANT la
ligne, pas en réécrivant le texte.

⚠️ **Le budget de LECTURE avant le premier son est un réglage, et il est
testé.** Le prologue avait mis sept écrans de texte avant le premier exercice
(« ça fait beaucoup de texte avant le 1er jeu »). La sortie n'est jamais de
raccourcir le prologue — il est ce qui rend le reste lisible — mais de
l'ENTRELACER : le strict nécessaire devant, le reste de l'exposition ENTRE les
exercices, où il est en plus motivé. Deux tests le tiennent : jamais plus de
cinq écrans avant le premier exercice, jamais deux lectures empilées entre deux
exercices. Le nom complet de Sol (**Solange**) n'existe pas dans `HISTOIRE.md` :
c'est une proposition, à un seul endroit du code.

⚠️ **L'exercice de mélodie s'écrit comme dans l'Atelier : CASES + CLAVIER.**
C'était un rouleau (degrés en ordonnée, pas en abscisse) : quarante boutons
pour poser trois notes, et rien qui ressemble au Synthé que l'acte 3 est censé
préparer. Une ligne de cases porte les degrés, un clavier les écrit, la
sélection avance toute seule — le geste du pad de notes. ⚠️ Et la **tonique du
premier pas est DONNÉE, verrouillée** : la cible commence toujours par elle et
l'écran l'annonce comme le repère, mais elle n'était pas posée — le joueur
devait retrouver une note que la conception considère comme acquise, et
l'exercice se lisait comme cassé. Corollaire de câblage : un `$effect` qui
recale la sélection doit se garder du **premier rendu**, où la cible n'est pas
encore tirée — sans quoi il la ramène sur le pas verrouillé et le clavier
n'écrit nulle part, ce qui se lit exactement comme un bouton mort.

⚠️ **`melodie` est le huitième verbe, et le seul qui sorte de la batterie.**
Une ligne de basse monophonique, une note par pas, des DEGRÉS (0 = silence,
1-7). Il n'étend pas `GameDrumRowName` — ce qui aurait touché 46 endroits plus
`LevelDensity`/`rowsActive`/`SubdivSpec`, nommés champ par champ. À la place :
`comparerGrilles` a été **généralisé** (`Grille<N>` sur `number[]`, il ne faisait
que des `===`), la mélodie a son propre état, et on reste sur **une octave, sans
accord** — deux hauteurs à l'octave seraient la même note à l'oreille et deux
réponses à l'écran. La tonique tombe toujours sur le premier pas : sans point de
départ, aucun degré ne se situe.

⚠️ **Un exercice qui se joue UNE fois ne se tire pas au sort — `GrilleEcrite`.**
Arbitrage de Yann (2026-08-27) : « chaque personne ne les ferait qu'une seule
fois ». Un niveau généré tire une densité dans une fourchette, donc il ne sait
pas ce qu'il vient d'enseigner : c'est ce qui rendait une **courbe** impossible
à dessiner, et c'est la source de la famille « 0 variante sur 60 tirages » — un
préambule qui annonce ce que le tirage ne pose pas. L'acte 1 est donc écrit à la
main, huit rythmes dont chacun n'ajoute qu'UNE chose. Trois règles à garder :
la grille écrite prime sur le preset et sur la génération dans `startLevel` et
**ne reçoit aucun forçage** (c'est elle la vérité, seuls tempo et swing restent
tirés) ; ce qu'elle contient, le niveau doit le **déclarer** (`variant`,
`rollMax`), sinon la cible est impossible à poser et l'écran ne dit pas pourquoi ;
et un niveau ajouté se pose **en fin de tableau**, jamais au milieu — carrière et
salle de répétition citent les niveaux par leur `id`. `tests/grilles-ecrites.test.ts`
confronte chaque grille à son propre préambule, une promesse par test : c'est la
moitié que la grille écrite ne corrige pas toute seule.

**Le Mode jeu a plusieurs VERBES, pas un.** `ExerciseKind` (`src/model/exercises.ts`)
discrimine ce qu'on demande au joueur — quatre verbes de grille : `reproduire`
(les 34 niveaux de la campagne), `completer`, `intrus`, `jouer` — là où les
niveaux, eux, ne font varier que les *paramètres* du rythme. S'y ajoutent
`melodie` (le seul qui sorte de la batterie, voir plus haut) et `silence`, dont
la bonne réponse est ce qu'on n'entend PAS : une pulsation régulière, un pas
creusé, un index à désigner. Deux pièges y sont payés d'avance et testés — le
trou n'est jamais sur le premier pas (sans départ entendu, il n'y a rien à
manquer) et le kick ne tient que ce premier temps, sans quoi il boucherait
exactement ce qu'on demande d'entendre. La partie PURE de la notation vit dans ce fichier :
`comparerGrilles` (une case est exacte si son état **et** sa rafale coïncident),
`colonnesDeTranche`, `justesseDesFrappes`, `ecartAuCoup`. Elle s'y teste sans
navigateur, sans Web Audio et sans runes ; le store n'en garde que l'aiguillage.
Le paramètre `colonnes` de `comparerGrilles` est le point de conception : il
permet à « compléter » de réutiliser *exactement* la vérification de
« reproduire » en ne notant qu'une zone — **ne pas écrire un second
comparateur**, deux comparateurs qui doivent rester d'accord finissent toujours
par ne plus l'être. Deux pièges déjà payés, documentés dans PLAN.md étape 17 :
le Mode jeu tient sur **une mesure** par ligne (un quart de boucle est un *temps*,
pas une mesure), et « jouer » mesure l'écart au dernier pas **actif** du kick —
l'ancrer sur la grille donnait 100 % à une frappe posée sur un silence.

⚠️ **L'EXPORT vit hors des onglets.** Il était dans l'onglet Production, donc
verrouillé jusqu'à l'acte 4 — alors que la livraison de l'acte 1 dit mot pour
mot *« Exporte-le en MP3, mets-le sur ton téléphone : c'est ta sonnerie »*. Le
jeu ordonnait ce qu'il interdisait. Exporter n'est pas un réglage de
production, c'est FINIR : on emporte ce qu'on vient de faire, quel que soit
l'onglet ouvert et quels que soient les modules déverrouillés.

⚠️ **Un niveau ne promet pas ce qu'il ne pose pas.** `forceVariantCount` et
`forceRollCount` étaient déclarés dans `GameLevel`, remplis par les niveaux, et
lus par **personne** — le forçage n'avait jamais été porté. Les niveaux 5
(« une seule variante ») et 8 (« une seule rafale ») posent `variantChance: 0`
/ `rollChance: 0` JUSTEMENT parce qu'ils comptaient dessus : mesuré, 0 variante
et 0 rafale sur 60 tirages, donc une consigne qui annonçait un rim shot que la
cible ne contenait jamais. Le forçage passe APRÈS le tirage probabiliste,
compte ce qui est déjà là, et s'applique **aussi aux niveaux preset** (le
tresillo promet « variante et rafale ajoutées pour l'occasion », or le preset
n'en a aucune). Deux tests génériques le tiennent, sur tout niveau qui déclare
un forçage — ceux à venir compris.

⚠️ **Une question dont la réponse est inaudible n'est pas une question.** Le
kick balaie jusqu'à `max(20, 38 × mult)` : sous −10 demi-tons, toute la moitié
basse du curseur finit sur le même plancher de 20 Hz, et trois versions tirées
là-dedans sont indiscernables (mesuré en RMS > 200 Hz dans un
`OfflineAudioContext`). D'où `plageParLigne` dans `parametres.ts` — `lignes` dit
**où** un bouton s'entend, `plageParLigne` dit **jusqu'où** — et `pourLigne()`,
dont découlent les versions, la cible ET le curseur affiché. Corriger ça dans le
MOTEUR serait une erreur : le plancher vient de l'original et protège
l'enveloppe. Et `paramsAutorises` restreint le tirage d'un niveau à des boutons
déjà rencontrés : à l'acte 0 l'Atelier est fermé, on ne peut pas faire nommer un
réglage que le joueur n'a jamais vu.

⚠️ **Le récit se lit dans les DEUX sens.** `reculerCarriere()` / `peutReculer`
(« il faut pouvoir revenir sur un texte précédent ») : reculer est gratuit
parce que le curseur enregistré ne bouge pas — même invariant que la relecture
d'un acte. Corollaire : une étape d'exercice revisitée doit pouvoir être
re-dépassée SANS être rejouée (`etapeDejaFranchie`), sinon un retour d'un cran
obligerait à refaire l'exercice d'avant pour repartir.

⚠️ **La salle de répétition liste ce qui a été RENCONTRÉ, pas ce qui a été
réussi** (`niveauxRencontres`). Le seuil `id <= PlayerProgress.level` ne
convenait plus : la carrière cite les niveaux 39-41 avant le niveau 1, et un
exercice abandonné n'avance pas `level` — après tout l'acte 0, la carte
verrouillait 40 niveaux sur 41, dont les trois joués. Corollaire de mise en
scène : **rien de non atteint ne s'affiche** — ni les actes suivants du carnet,
ni leurs titres, ni un total de niveaux.

⚠️ **Un test instable est un bug, pas un test à recalibrer.** `« régler » ne
place pas le curseur déjà sur la cible` échouait une fois sur quatre : il
comptait les tirages gagnants d'avance et exigeait « moins de la moitié ». La
cause n'était pas le seuil — « régler » tirait sa cible sans jamais l'éloigner
du MILIEU de l'étendue, où le curseur commence, donc le niveau était parfois
déjà gagné. `tirerCible(p, depart)` tire désormais la **distance** et le
**côté**, jamais une valeur qu'on espère lointaine. Règle générale : quand un
test aléatoire est à la frontière, **c'est ce qu'il mesure qui est cassé**.

⚠️ **« Jouer » note la MEILLEURE fenêtre consécutive, pas la moyenne du tour.** La
boucle tourne en rond : moyenner tout ce qui a été frappé rend les tâtonnements du
début définitifs, et plus on joue plus la note baisse — on ne peut jamais réussir
UNE mesure. La fenêtre doit rester *consécutive* : prendre « les meilleures où
qu'elles soient » récompenserait le martèlement. Et tout écran qui MESURE une
frappe (calibrage compris) ne doit **jamais** en ignorer une en silence : dire
pourquoi, sinon l'utilisateur conclut que la fonction est cassée — c'est
exactement ce qui est arrivé au calibrage, dont le métronome ne durait que 7 s.

**Le Mode jeu a aussi trois verbes de PARAMÈTRE**, à côté des verbes de
grille : `lequel` (entendre la direction d'un bouton), `nommer` (mettre un nom sur
ce qui a changé), `regler` (viser un son, pas un chiffre). Ils sont **paramétrés
par le bouton visé** — trente et un boutons, un jeu par bouton serait ingérable.
Le catalogue est `src/model/parametres.ts`, et c'est lui le vrai travail : chaque
entrée porte deux jugements MUSICAUX que le code ne devine pas — `tolerance` (en
deçà de quel écart deux réglages s'entendent pareil) et `ecartMini` (au-delà de
quel écart la différence est franche). Trois règles y sont payées d'avance :
le filtre se compare en **octaves** (`echelle: 'log'`) parce que 500 Hz à 800 Hz
ne pèsent pas comme 500 Hz à 12 kHz ; l'`id` doit être le **vrai champ** de
`DrumRowState` (un `lowpass` inventé règle un champ mort, donc deux sons
identiques et un niveau impossible et muet) ; et `lignes` dit **où le bouton
s'entend** — `tone` ne fait rien sous zéro sur le kick. `tirerVersions` garantit
l'écart **par construction**, jamais par des marges : une version à 14 points
pour une tolérance de 15 est une question dont la réponse est un tirage au sort.

⚠️ **Un refus du stockage ne doit jamais être silencieux.** `writeJson` avalait
l'erreur de quota — le jeu restait jouable, mais rien n'était retenu et les
modules se **reverrouillaient à chaque visite** sans que rien ne l'explique. Un
verrou qui revient sans raison se lit comme une panne du jeu, pas comme un
réglage du navigateur. D'où `game.persistanceRefusee`, posé au chargement par
une écriture-sonde : `localStorage` EXISTE en navigation privée stricte, il lève
à l'écriture — vérifier sa présence ne dit donc rien.

**Tout état réactif n'est pas de l'état de morceau.** Deux modules d'interface
vivent délibérément **hors** du format v2 : `ui/xp/paramHints.svelte.ts` et
`ui/atelier/lastTouched.svelte.ts` (la dernière ligne manipulée, qui alimente le
bandeau LCD du séquenceur). Ils ne se sérialisent pas, ne passent pas dans
l'historique d'annulation, et le moteur audio ne les lit jamais. C'est le bon
domicile pour ce genre d'état — ne pas les faire remonter dans `model/types.ts`.

⚠️ **L'avance de déclenchement est la marge dont l'attaque dépend, pas du
rembourrage.** Toutes les voix ouvrent sur une rampe de 3-4 ms
(`setValueAtTime(0.0001, t)` puis `rampTo(gain, t + 0.004)`). Si
`AVANCE_DECLENCHEMENT` (`engine/AudioEngine.ts`) descend au même ordre, un simple
retard du fil principal fait tomber `setValueAtTime` dans le passé : Web Audio
l'applique aussitôt, la rampe est sautée, **le gain saute — un clic à chaque
note**. Descendu à 5 ms le 2026-08-21 pour gagner de la latence, remonté à 20 ms
le jour même (« le son est devenu moche »). Idem pour `TAMPON_SORTIE` : `0.001`
donne 128 échantillons et 8 ms, et décroche — `'interactive'` est le préréglage
que le navigateur dimensionne pour ça. `tests/latence-audio.test.ts` verrouille
les deux. Pour descendre plus bas il faut rendre les enveloppes robustes à un
démarrage tardif, pas raccourcir la constante.

⚠️ **Le tampon de sortie SUIT la sortie : `'interactive'` est un défaut, pas
une constante.** Le petit tampon défend le budget doigt → son, et ce budget
n'est disputable que sur une sortie rapide. En Bluetooth (100 à 200 ms dans le
casque, hors de portée du navigateur), les 40 ms qu'il fait gagner sont
inaudibles et ce qu'il coûte s'entend : un bloc court à remplir à chaque réveil
d'une route lente, donc un crachotement par bloc manqué (« ça marche assez mal
avec le bluetooth », Yann, 2026-08-26). `engine/tampon.ts` porte la règle —
au-delà de `SEUIL_SORTIE_LENTE` (0,1 s, posé ENTRE les 72 ms du gros tampon
filaire et les 100-150 ms d'un casque A2DP), on repasse sur `'playback'`. La
bascule n'a lieu qu'**à l'arrêt** (à chaud elle ferait un trou dans le morceau)
et jamais pendant une capture (`startLiveRecording` branche son magnétophone
avant `start()` : remplacer le graphe sous lui donnerait un WAV silencieux et
muet d'erreurs). ⚠️ Le réglage manuel (`ui/sortie.svelte.ts`, menu Affichage)
n'est pas un doublon de la détection : `outputLatency` est un **aveu
volontaire** — WebKit ne le déclare pas, un Android peut le sous-déclarer — et
qui ENTEND crachoter en sait plus que le navigateur. Le manuel gagne donc
toujours sur l'observation. Corollaire pour tout second contexte audio : un
`AudioContext` « running » sans rien de branché tient un flux de sortie ouvert,
c'est-à-dire un réveil de plus à servir sur la même route — les sons système
s'endorment pour ça, et leur `chime` **attend** la reprise avant de programmer
(horloge gelée = instants déjà passés = attaque sautée).

⚠️ **Deux latences, deux traitements — ne pas les confondre.** DÉCLENCHER un son
(pads du Mode Live, aperçus, notes jouées) ne se compense pas : on ne peut pas jouer
un son avant la frappe, on ne peut que réduire — d'où `latencyHint: 'interactive'`
et non `'playback'` dans `ensureAudio` (mesuré : 32 ms contre 72 ms d'`outputLatency`
dans Chromium ; l'argument « on programme tout en avance » ne vaut que pour le
séquenceur, dont la robustesse vient du lookahead). MESURER un placement (Mode jeu,
pad d'écriture de l'Atelier) se corrige, lui, avec le décalage calibré.

⚠️ **`outputLatency` n'existe pas dans WebKit.** `AudioEngine.audioTime()` (l'horloge
du son *entendu*, dont dépend toute la notation de « jouer en rythme ») se replie sur
`baseLatency` quand il manque — sans ce repli, iPhone et iPad ne compensaient **rien**,
alors que le contexte s'ouvre en `latencyHint: 'playback'`, donc avec un gros tampon.
Ce que ce repli ne couvre pas (dalle tactile, casque) ne se devine pas : il se **mesure**,
d'où le calibrage du Mode jeu (`ui/game/latence.svelte.ts`, encore un module d'état
d'interface hors format v2 — c'est une propriété de l'APPAREIL, pas du joueur ni du
morceau). Son `affiner` est **additif** : les frappes sont déjà corrigées par le réglage
en place, leur médiane est ce qu'il RESTE à corriger — remplacer ferait osciller le
réglage au lieu de le faire converger.

⚠️ **Un étage « neutre » posé EN SÉRIE dans la chaîne finale ne l'est jamais.**
Le petit haut-parleur de l'acte 4 (`petitHautParleur*`, `graph.ts`) a d'abord
été monté en série, réglé neutre au repos — passe-haut à 10 Hz, bosse à 0 dB.
Un filtre sous l'audible ne s'entend pas : vrai de son AMPLITUDE, faux de sa
PHASE. Mesuré sur un kick contre le même kick sans filtre : **41 176
échantillons différents sur 44 100**, écart maximal supérieur au RMS du signal.
L'étage aurait modifié tous les exports du projet, inaudiblement et pour
toujours, pour un exercice de Mode jeu. Il vit donc dans une BRANCHE PARALLÈLE
à gain nul (`petitHPSec` / `petitHPHumide`), et le repos est un **trajet**, pas
un réglage : 0 échantillon d'écart, vérifié. Le fondu entre les deux évite en
prime le claquement quand on bascule pendant la lecture — ce qui est le geste
même de l'exercice. Même précaution pour tout futur `liveFilter`.

⚠️ **L'ÉPILOGUE n'est pas un neuvième acte.** `EPILOGUE` (`carriere.ts`) est
hors de `ACTES` : ni compétence, ni module, ni exercice, et des mois après le 14
juin — l'y mettre casserait `ActeId`, `JOURS` et le compte à rebours pour ranger
du texte dans une structure qui décrit des épreuves. Il a son curseur à lui,
volatil, et ne touche jamais au curseur enregistré. Sa dernière image est la
PREMIÈRE du jeu : Sol demande « lequel est le plus grave ? » à un nouveau
stagiaire, la question du niveau 49 — ne pas la réécrire, c'est elle qui fait la
boucle. Corollaire du décompte : il disparaît aux DEUX bouts, parce qu'il ne
s'affiche que tant qu'il veut dire quelque chose.

⚠️ **Le seuil de niveau se lit sur le PLANCHER, jamais sur `level`** —
et c'est le principe « une porte déjà ouverte ne se referme jamais » qui le
gouverne. `PlayerProgress.plancher` est le `level` d'AVANT la carrière, gelé une
fois pour toutes dans `load()` (`stores/game.svelte.ts`). Lu sur `level`, le
seuil ouvrait les **quatre** modules à la fin de l'acte 0 : l'acte 0 cite les
niveaux 49 à 52, réussir le 52 écrit `level = 53`, au-dessus des quatre seuils
(2 / 13 / 27 / 34) d'un seul coup — donc quatre actes annonçaient l'ouverture
d'un module déjà ouvert, et le déverrouillage narratif, qui est le principe même
du Mode carrière, ne faisait plus rien. Le fond : `level >= 34` voulait dire
« a joué 34 niveaux de la campagne linéaire », or la carrière a supprimé cet
ordre — elle cite les niveaux dans le désordre et au-delà de 34.
**Gelé dans `load()` et pas à l'entrée dans la carrière** : c'est le seul point
garanti d'être AVANT le premier exercice ; gelé plus tard il enregistrerait un
`level` déjà gonflé, c'est-à-dire le défaut qu'il corrige. Écrit une fois par
joueur, jamais réécrit — un joueur neuf gèle `1` et le récit gouverne seul, un
vétéran gèle ce qu'il a et ne perd aucun module. `tests/plancher.test.ts` tient
le QUAND (avec un vrai `localStorage` en mémoire), `tests/unlocks.test.ts` la
RÈGLE, et `scripts/parcours-carriere.cjs` la trajectoire entière.

⚠️ **Les huit actes sont écrits** (2026-08-25) : `acteAVenir` ne renvoie plus
jamais vrai. Retirer le second membre du OU reste **une décision** (il sert de
plancher à qui joue hors carrière), pas un nettoyage. L'acte 7 ne cite que des niveaux
`jouer`, et c'est délibéré : `justesseDesFrappes` retient la meilleure fenêtre
consécutive, donc la notation pardonne un début raté et récompense la reprise —
mot pour mot ce que Sol répond avant de brancher les enceintes. Un seul jeton de
texte existe dans tout le récit, `{pseudo}`, interpolé par `CarriereView` : Sol
dit le nom du joueur au micro, et c'est ce qui referme cinq mois de « le café ».

⚠️ **Une COMMANDE vérifie un cahier des charges, jamais une cible.**
`src/model/commande.ts` est le seul endroit où le jeu demande de FAIRE plutôt
que de retrouver : le joueur produit dans l'Atelier et livre. Trois façons de
rater ça, toutes évitées explicitement — ne rien vérifier (le bouton est du
théâtre), vérifier une cible (c'est `reproduire` avec des étapes en plus), ou
vérifier trop (une seule réponse juste, donc pas une production). L'état passe
en MÉMOIRE (`pattern.snapshot()`), jamais par un fichier : c'est la même appli
et le même store. Le cahier est **vivant** — les cases se cochent pendant qu'on
travaille et le bouton reste désactivé sinon ; il n'y a donc aucune réplique de
refus, elle serait du code mort. Et l'état de la commande survit à un
changement de vue : il vit dans le store, avec l'acte ET l'étape, parce que le
curseur volatil bouge pendant qu'on travaille.

⚠️ **`defaultState()` n'est PAS une grille vide — c'est du Motown.** Mesuré :
`rankPresets` donne 100 % au motif de départ sur « Motown / soul » et sur
« Swing ». Entrer dans l'Atelier et en ressortir sans rien toucher livrerait
donc un morceau qu'une contrainte de style accepterait. D'où
`pasLeMotifDeDepart`, obligatoire dans toutes les commandes.

⚠️ **« Dans le style de » se juge sur une FICHE, pas sur une ressemblance.**
`src/model/styles.ts` décrit chaque genre par des CRITÈRES nommés — placements
lus en *temps* et non en cases (donc valables quelle que soit la subdivision),
tempo, instrument — et la livraison passe quand la part de critères atteint le
`seuil` de la fiche (0,8 par défaut, **réglable par fiche**). Trois choses en
découlent, et aucune n'est cosmétique :

- **une fiche sert à la fois de description, de juge et de retour.** Le chapeau
  et les libellés sont ce que le joueur lit avant de commencer, ce qui se coche
  pendant qu'il travaille, et ce qui explique un refus. Les écrire séparément,
  ce serait deux vérités qui divergent au premier ajustement ;
- **le pourcentage n'est PAS celui de `rankPresets`.** Ce score-là compte les
  cases identiques, cases vides comprises — 70 % peut vouloir dire « deux
  grilles également vides ». Il ne veut rien dire seul, et c'est toujours vrai.
  Ce qu'on mesure est une part de critères satisfaits ;
- **le seuil ne s'applique jamais à ce qui NOMME le genre.** Un critère
  `essentiel` est exigé quel que soit le total : un dancehall sans kick sur
  chaque temps n'est pas un dancehall à 83 %, c'est autre chose. Deux au plus
  par fiche, sinon le seuil ne veut plus rien dire.

Une fiche décrit ce qu'il FAUT entendre — jamais l'absence d'un instrument
(« pas de caisse claire » punirait un morceau qui sonne juste avec une claire
discrète). Décrire le CARACTÈRE d'une ligne présente est autre chose et reste
permis : « ce charley ne s'ouvre jamais » est, mesuré sur les données, le seul
critère qui sépare vraiment la techno de la house, de la hard house et de
l'amapiano — toutes en four-on-the-floor.

Une fiche se **calibre**, elle ne se devine pas : le preset du genre doit la
satisfaire entièrement, les 33 autres échouer, et le plus proche rester à au
moins **deux critères** (mesuré sur dancehall : 6/6 contre 4/6 pour house,
hardhouse et amapiano). Même exigence que l'`ecartMini` de `parametres.ts`.

⚠️ **Une leçon de PRODUCTION se mesure sur l'ÉTAT, et chaque critère exige un
GESTE.** L'acte 4 se fait en deux temps — produire un morceau techno, puis le
régler pour qu'il tienne sur le petit haut-parleur (`kickQuiPorte`,
`avoirEnleve`, `deLEspaceSansSoupe` dans `commande.ts`). Trois choses y sont
payées d'avance : rendre le morceau dans un `OfflineAudioContext` à chaque
frappe rendrait le cahier vivant asynchrone, donc on mesure l'état et on
calibre le seuil (`tone >= LAVERIE_DRIVES[1]`, la mesure du petit
haut-parleur : 13 % de l'énergie survit à drive 0, ~35 % à 55) ; un critère
satisfait sans rien toucher est du théâtre, d'où « de l'espace **mais pas de
la soupe** » plutôt qu'un simple plafond de réverbe, qui serait coché d'avance ;
et le kick est **exclu** de « tu as enlevé », parce que lui couper les aigus
retirerait exactement ce qui vient de le sauver. `Contrainte.section` porte les
titres d'étape : six lignes à plat ne disent pas qu'il y a deux gestes, ni dans
quel ordre.

⚠️ **Un token de couleur n'est pas transposable d'une surface à l'autre.**
`--xp-lcd-dim` est fait pour un segment sur fond d'afficheur NOIR : posé sur le
chrome d'un panneau il donne **1,5:1**, illisible. Mesuré, pas jugé à l'œil —
et remplacé par `--xp-accent-amber` (4,76:1). Corollaire de grammaire : le vert
dit « allumé / fait », donc un titre d'étape, qui n'est pas un état, ne doit
pas être vert.

⚠️ **Une commande de style sans verrou de presets est un menu déroulant.**
Mesuré avant correctif : charger le preset `dancehall` et livrer suffisait.
Le verrou est double — le menu Morceaux est désactivé pendant une commande, et
`pasUnPresetCharge` refuse un preset chargé TEL QUEL. Ce qu'on refuse est la
**provenance**, jamais la ressemblance : suivre la fiche honnêtement mène tout
droit à la grille du preset, et punir ça reviendrait à punir le joueur d'avoir
bien travaillé. La provenance vit dans `pattern.presetCharge` (état
d'interface, hors format v2) et voyage par `ContexteLivraison`, parce qu'un
`PatternStateV2` ne dit pas d'où il vient.

⚠️ **La sévérité d'une commande DÉCROÎT avec le récit**, et c'est l'acte 6 qui
l'impose : « aucun brief, aucun client, aucun style imposé ». Les clients des
actes 2 à 5 exigent des choses précises parce qu'ils paient ; FB-015 constate
seulement qu'on s'est servi de ce qu'on a appris, et ses libellés sont écrits
du point de vue du joueur. Un cahier vide serait un bouton qui ne juge rien.
Et **jamais de commande avant l'acte 2** : on ne commande pas un travail dans
un module qu'on n'a pas encore ouvert — l'acte 1 garde sa `livraison`, qui est
un cadeau et non une épreuve.

⚠️ **Un verbe qui TIRE dans un catalogue doit tirer ses leurres LOIN.** Le
verbe `style` (acte 5) fait nommer le genre d'une boucle : ses trois leurres
viennent d'autres catégories de presets, jamais de la même. « Boom bap » contre
« Drill » et « Trap moderne » est une question dont la réponse est un tirage au
sort pour tout le monde sauf un spécialiste — même défaut que deux versions
séparées de moins que la tolérance. Et il tire son preset à chaque partie
(`stylePool`, pas `presetId`) : un genre gravé dans les données ferait de la
culture des styles un exercice de mémoire dès la deuxième partie. Le tirage se
pose sur une COPIE de la config du niveau, avant les helpers, pour que la cible
hérite du tempo, du swing et du timbre du morceau réel — un genre reconnu sur
une grille générique n'est pas un genre.

⚠️ **Une leçon de PRODUCTION ne se raconte pas, elle se fait entendre.** L'acte
4 tient sur « ton morceau est bon dans ton ordinateur, ici il est mauvais » :
un écran qui décrit un défaut de mixage n'apprend rien. D'où le verbe `laverie`
et son étage de moteur. Corollaire sur le catalogue : `tone` sur le kick reste
**hors** de `parametres.ts` (en studio il ne s'entend presque pas) et c'est
précisément pour ça qu'il est le sujet de cet exercice-là — un bouton dont
l'effet ne se voit qu'ailleurs est une mauvaise question de timbre et une bonne
question de production. `laverie` n'est donc pas un `VERBES_PARAM` : il POSE
son bouton au lieu de le tirer.

**L'analyseur de spectre** est un `AnalyserNode` maître branché en tap sur
`finalGain` dans `buildGraph` — donc sur ce qu'on entend, limiteur compris. Le
moteur l'expose par `getSpectrum(out)`, qui **remplit un tableau fourni par
l'appelant** plutôt que d'en allouer un : le visualiseur tourne à 60 Hz. La
lecture des bandes est partagée par les deux visualiseurs dans
`ui/xp/spectrumBands.ts` — une seule définition, pas deux copies.

Trois unifications structurantes par rapport à l'original, à préserver : **un seul**
builder de graphe audio (`buildGraph(ctx, state)`, direct et hors ligne), **un seul**
scheduler, **un seul** modèle d'état dont l'UI dérive. L'original avait 3 schedulers
dupliqués et construisait son graphe deux fois — ne pas réintroduire de variantes.

## Mise en ligne

Un `git push` sur `main` déclenche : types, tests, les deux builds, puis déploiement
sur Vercel **seulement si tout passe**. Une pull request lance les tests sans
déployer — c'est la voie sûre pour une modification à valider avant mise en ligne.
Site : <https://boite-a-rythmes.vercel.app>

## Conventions de session (Claude Code)

**Piège git à chaque nouvelle session.** Le squash-merge d'une PR crée un SHA
différent sur `main` — la branche de travail locale garde l'ancien historique
(déjà mergé) en plus des nouveaux commits. Avant tout nouveau commit :
`git fetch origin main && git checkout -B <branche-de-travail> origin/main`,
puis cherry-pick/rebase le travail en cours dessus. Un `push --force-with-lease`
qui en résulte est attendu, pas une erreur.

**Workflow PR, sans redemander permission à chaque fois (politique actée par
Yann) :** ouvrir la PR → `subscribe_pr_activity` → attendre la CI (poll via
les tools GitHub, jamais de `sleep`) → merger en squash si vert → `unsubscribe_pr_activity`.

⚠️ **Interroger la CI passe par les outils GitHub MCP, JAMAIS par `curl`.**
L'API GitHub non authentifiée est bloquée dans cette session : elle répond un
JSON d'erreur sans la clé attendue, donc une boucle `until [ -n "$(curl … )" ]`
**ne se termine jamais**. Deux d'entre elles ont tourné 45 minutes à vide le
2026-08-19 avant que Yann ne le remarque. Penser aussi à arrêter les tâches de
fond dès que la PR est mergée.

⚠️ **Vert sur la PR ne veut pas dire vert sur `main`.** La génération des niveaux
passe par `Math.random()` : un test qui n'en regarde qu'un tirage est une pièce
lancée. Le 2026-08-20, une assertion à un seul tirage est passée en local et sur
la PR, puis a échoué sur `main` — **build non produit, déploiement sauté, PR
mergée mais site inchangé**. Un test qui dépend du hasard doit affirmer ce qui est
vrai à CHAQUE tirage et répéter (60 fois) pour que le hasard devienne de la
couverture. Et **après un merge, vérifier le run de `main`**, pas seulement celui
de la PR : c'est celui-là qui déploie.

**Avant chaque commit :** `npm run check` (0 erreur), `npm test`, `npm run build`
+ `npm run build:singlefile`. Pour un changement d'UI : lancer le serveur de dev
et vérifier visuellement au moins une fois avec Playwright (headless, Chromium à
`/opt/pw-browsers/chromium`, driver global importé en CommonJS depuis
`/opt/node22/lib/node_modules/playwright/index.js`) avant de considérer le
changement terminé. **Vérifier visuellement ne suffit pas pour une mise en page :
mesurer.** Les scripts de mesure de cette session (débordement de page, zones
tactiles réelles, contraste) ont trouvé des défauts invisibles à l'œil — une
barre de 78px au lieu de 32, un analyseur qui dessinait 104 barres pour 74
bandes utiles.

⚠️ **`scripts/parcours-carriere.cjs` exige un serveur de dev FRAÎCHEMENT
démarré.** Le HMR de Vite ré-exécute un module modifié : le script obtient
alors une seconde instance de `game`, pendant que le store `unlocks` garde la
première. La colonne « modules » affiche « — » du début à la fin et **ressemble
trait pour trait à une régression du déverrouillage** — une heure perdue le
2026-08-26 avant de mesurer que `moduleUnlocked` répondait juste et que seul le
contexte du store était périmé. Redémarrer `npm run dev` après toute
modification, avant de conclure quoi que ce soit du script ou d'une capture.

⚠️ **Une fixture ne joue pas le jeu.** Les huit actes du Mode carrière ont été
vérifiés un par un avec un `localStorage` posé à la main — ce qui a caché
pendant sept PR que les quatre modules se déverrouillaient tous à la fin de
l'acte 0. `scripts/parcours-carriere.cjs` joue la carrière entière depuis un
joueur neuf et l'a trouvé du premier coup : **le relancer après toute
modification du déverrouillage, de la progression ou de la chaîne des actes.**

**`REPRISE.md` est le brief de reprise** — à lire en PREMIER en arrivant sur le
projet : où en est le travail, la décision en attente, les pièges qui ont coûté
du temps, et ce qui est vérifié ou non. `PLAN.md` reste le journal détaillé
(7 000 lignes), `REPRISE.md` en est la carte. Le mettre à jour quand l'état
général change — pas à chaque livraison.

**Toujours mettre à jour `PLAN.md`** avec un ✅ détaillé (fichiers touchés,
rationale, écarts de portée assumés) à chaque feature livrée — c'est la mémoire
du projet d'une session à l'autre, à lire en premier en reprenant le travail.

**Style de travail avec Yann :** instructions courtes (« go », « pars sur… »),
il attend qu'on avance sans reposer trop de questions. Exceptions : demande
explicite d'analyser avant de coder, ou fourche à choix multiples sans défaut
évident (poser la question, recommandation en premier). Quand une demande a une
portée ambiguë ou plus grosse que prévu, présenter un périmètre scopé et le
faire confirmer avant de plonger — mais une fois qu'il a dit d'arrêter de
demander, arrêter.

**Piège Svelte 5 :** `structuredClone()` casse sur un proxy `$state` — utiliser
`$state.snapshot()`.

**Avant d'étendre un type central** (ex. `DrumRowName`, `SynthRowName`) qui
touche plusieurs sous-systèmes, faire cartographier tous les points de contact
(agent Explore ou recherche exhaustive) avant de coder — la surface réelle
dépasse presque toujours l'estimation initiale.
