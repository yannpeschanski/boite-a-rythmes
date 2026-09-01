# Audits de design et arbitrages de Yann

> Archive détachée de `PLAN.md` le 2026-09-01, **sans une ligne
> réécrite ni réordonnée**. Le journal vivant est resté dans `PLAN.md`.

L'audit de design complet du 15 août, les deux premiers lots de remarques de
Yann, le plan d'action consolidé, et les arbitrages D1 à D4 — dont **D2**, qui a
fait du Mode jeu la colonne vertébrale du projet, et **D4**, qui a réduit le
périmètre au téléphone.

C'est ici que se lisent les *raisons* des décisions que `CLAUDE.md` énonce comme
des règles.

---

## Compléments d'action — 2026-08-14 (retours de Yann sur le palier 1)

Quatre retours sur des features livrées la veille, plus trois sur le Mode Live en cours de route — traités dans la foulée, sans repasser par une confirmation de périmètre (Yann : « arrête de me demander ça »).

- ✅ **Bourdon (drone) v2 — vrai maintien qui change de pitch** (« le bourdon
  ne marche pas très bien, je souhaiterais que ça maintienne le son... dans
  l'idée de faire du synthwave »). La v1 (retrigger toutes les 8 mesures sur
  l'accord du 1er pas) ne correspondait pas à l'intention : Yann voulait un
  **vrai legato** — les mêmes oscillateurs tenus en continu, jamais
  ré-attaqués, qui glissent de fréquence quand l'accord change plutôt que de
  rejouer une nouvelle note. Nouveau mécanisme dans `SynthKit`
  (`engine/voices/synth.ts`) : `startDrone`/`updateDrone`/`stopDrone` —
  3 voix tenues (les accords de `buildChordsForScale` sont toujours des
  triades), attaque une seule fois, puis seule `osc.frequency` est
  reprogrammée (`exponentialRampToValueAtTime`) à chaque nouvel accord
  rencontré. Le scheduler (`scheduleSynthWindow`) suit maintenant le VRAI
  motif de la Nappe (cycle/pas/pattern, plus ignorés comme en v1) : un pas
  actif retune le drone, un pas vide ne fait rien (le drone continue de
  tenir le dernier accord — c'est le principe même d'un bourdon), muted/break
  coupe avec un release. `SynthKit.syncDroneMode` détecte la bascule ON->OFF
  du réglage en cours de lecture pour couper proprement. Nouveau champ `now`
  sur `SynthScheduleContext` (l'horloge réelle de l'appelant, distincte de
  `horizon`) pour programmer cette coupure au bon moment ; `AudioEngine.tick`
  et `render-offline.ts` le fournissent tous les deux. `AudioEngine.stop()`
  coupe déjà tout net via `synth.stopAll()` (les oscillateurs du drone sont
  trackés comme les autres). Limite assumée inchangée : pas un maintien
  littéralement indéfini (retune à chaque pas actif, pas un unique
  oscillateur immortel) — texte d'aide de `SynthModule.svelte` mis à jour en
  conséquence.
- ✅ **34 presets adaptés pour clap/shaker, quand le genre s'y prête** (« il
  faut adapter tous les presets pour intégrer ces nouvelles lignes si
  nécessaire »). Nouveaux champs optionnels `clap?`/`shaker?` sur
  `SongPresetData` (`model/presets/songs.ts`), appliqués par
  `presetAdapter.ts` seulement quand présents (sinon `defaultState()` garde
  ces lignes silencieuses, comme avant). **25 des 34 presets modifiés**,
  jugement musical par genre plutôt qu'un ajout systématique :
  - Hip-hop/trap (5/5) : clap qui double la snare partout (boombap,
    trapmodern, drill, dilla à volume réduit), + shaker continu pour dembow
    (güira du reggaeton).
  - Électronique/club (5/7) : le "house clap" classique (house,
    housefrenchtouch — dont la démo mentionnait déjà "clap 2/4" sans ligne
    dédiée avant ça —, hardhouse, garage), clap sous le gros snare half-time
    du dubstep. Techno minimale et jungle explicitement épargnées (aussi
    délibéré que le reste : l'esthétique minimale/breakbeat n'appelle pas
    une couche en plus).
  - Funk/soul/jazz (1/6) : shaker continu pour funk (tambourin). Motown
    (témoin "carré" pédagogique, swing/traîne à 0 — ajouter une couche
    casserait son rôle de référence), swing jazz, shuffle, swing, charleston
    laissés tels quels (genres acoustiques batterie/cymbale, pas
    percussion additionnelle).
  - Latin/Afro/Caribbean (14/15) : la catégorie où shaker/clap sont quasiment
    partout à leur place (maracas/chekere/chocalho omniprésents dans ces
    répertoires) — clave, afrobeat, tresillo, habanera, clave23, claverumba,
    cinquillo, bossanova, samba (shaker), amapiano (clap 2/4 + shaker,
    démo déjà explicite), dancehall, bailefunk (clap), bodiddley (shaker qui
    calque le MÊME tresillo que kick/snare — c'est historiquement le motif
    exact des maracas de Jerome Green), reggaeonedrop (shaker sur le skank).
    Gqom seul épargné (esthétique sombre/minimale délibérée, comme techno).
  - "Autre" (motorik) épargné : hypnotique/minimal par principe.
  Vérifié par script Playwright : preset Dembow chargé, lignes Clap et
  Shaker visibles et peuplées dans le séquenceur.
- ✅ **Explications par paramètre : couverture exhaustive + langage simple**
  (« j'ai l'impression que ce n'est pas exhaustif et que ça ne parle pas un
  langage assez simple »). Recherche exhaustive de TOUS les libellés
  `XpSlider` réellement utilisés dans l'appli (43 au total) plutôt qu'un
  ajout au jugé — 10 manquaient (Delay, Durée, Cycles (mesures), Nb
  d'accords, Notes du cycle, Pas, Pitch, Réverbe, Tempo, Volume), désormais
  tous couverts dans `ui/xp/paramHints.svelte.ts`. Toutes les entrées
  existantes reformulées pour éviter le jargon (portamento, sidechain, curve
  exponentielle…) au profit d'une description de l'effet entendu. Piège
  repéré en vérifiant : le libellé "Nb d'accords" utilise une apostrophe
  DROITE dans `SynthModule.svelte` (contrairement aux apostrophes
  typographiques du reste du fichier) — la clé de la table doit matcher
  exactement, sinon la bulle n'apparaît jamais silencieusement.
- ✅ **Banque de séquences : explication ajoutée** (« il faut une
  explication »). Un `<p class="hint">` au-dessus du picker dans l'Atelier
  (`SequenceBank.svelte`) expliquant à quoi ça sert et comment ça s'articule
  avec le Mode Live ; même principe dans l'overlay ⚙ du Live
  (`picker-caption`, affiché uniquement pour l'entrée BANQUE DE SÉQUENCES).
- ✅ **Mode Live — 3 retours traités dans la foulée** :
  - **Icônes de coin agrandies** (« les petits boutons sont un peu trop
    petit ») : `.corner-icon` passe de 15px/8px à 22px/12px (police) — reste
    hors de la zone d'appui naturelle du bouton (diagnostic ergonomie déjà
    posé), mais devient une vraie cible tactile.
  - **Mêmes icônes sur le pad** (« il faudrait avoir les mêmes options sur
    le pad ») : 🔒/🎲/✏️ ajoutées sur le pad XY, symétriques de celles des 6
    boutons. Nouveau champ `LiveAssignments.padLocked: boolean` (un seul
    verrou pour X ET Y ensemble — le pad est UN geste physique, pas deux
    comme slotLocked qui est par bouton) respecté par 🔀 brasser ;
    `randomizePad()` retire un nouveau réglage pour X et Y d'un coup ; ✏️
    ouvre l'overlay complet (les lignes X/Y y sont déjà séparées, pas besoin
    d'un picker dédié à un seul axe).
  - **Curseur vert mystère → bandeau de séquences fonctionnel** (« un
    curseur vert que je ne comprends pas entre le bandeau du haut et les
    boutons » / « pouvoir basculer de séquence directement... sans passer
    par le menu de réglage » — deux retours réglés d'un coup). La "seekbar"
    était purement décorative (esthétique Winamp, `width:38%` figé, ne
    pilotait rien) — remplacée par un vrai contrôle `.seq-bar` : LCD verte
    affichant la séquence courante de la banque, `‹`/`›` pour avancer/
    reculer et charger immédiatement, zéro overlay à ouvrir. `bankIndex`
    (nouvel état local à `LiveView`, pas dans le store partagé) suit
    uniquement ce bandeau — un chargement depuis l'Atelier ou l'overlay ⚙
    reste indépendant.
  Vérifié par script Playwright (capture d'écran Mode Live) : icônes de
  coin visibles sur les 6 boutons ET le pad, bandeau "🗄 Aucune séquence"
  avec `‹`/`›` à la place de l'ancienne seekbar.
- ✅ **Arpège/Bourdon rangés en sous-catégories de la Nappe** (retour de
  Yann, 2026-08-14 : « les options d'arpeggiator et de bourdon devraient
  être en sous catégorie de nappe »). Les deux fieldsets vivaient à part
  dans `SynthModule.svelte`, après les 3 lignes (Basse/Nappe/Mélodie),
  toujours visibles quelle que soit la ligne concernée — alors qu'ils ne
  s'appliquent qu'à la Nappe. Déplacés dans `SynthRowView.svelte` (le
  composant de ligne, déjà instancié 3×), comme deux nouveaux groupes
  dépliables `{#if isPad}` après « Espace » — même mécanique que les 5
  groupes déjà là (`openGroups.arpege`/`.drone`, repliés par défaut comme
  les autres). Ils portent sur `synthGlobal` (padArpEnabled/padDroneEnabled…)
  et pas sur `row`, mais `SynthRowView` dérive déjà `pattern.state` — un
  simple `sg = $derived(pattern.state.synthGlobal)` suffit, pas besoin de
  props supplémentaires. `translatePadArpToMelody` (bouton "Traduire
  l'arpège en Mélodie") suit dans le même fichier. N'apparaissent plus du
  tout sur Basse/Mélodie. Vérifié par script Playwright : capture d'écran
  Synthé avec tous les groupes dépliés — Arpégiateur/Bourdon visibles
  seulement entre l'Espace de la Nappe et la Séquence de la Mélodie.
- ✅ **Bourdon : les réglages de voix de la Nappe s'appliquent enfin**
  (retour de Yann, 2026-08-14 : « pourquoi les paramètres de nappe ne
  s'appliquent pas au bourdon ? »). Trou réel dans la v2 du bourdon (la
  passe précédente) : `SynthKit.startDrone` ne reprenait que type/cutoff/
  attack/résonance/détune/sub de la voix — Tone (drive), Chorus, Vibrato,
  l'enveloppe de filtre (Ouv./Ferm. filtre) et la FORME de l'attaque/du
  release (linéaire vs naturelle) n'étaient tout simplement pas branchés,
  contrairement à `playSynthNote` (le chemin normal des autres lignes) qui
  les gère tous. Corrigé dans `engine/voices/synth.ts` :
  - **Tone/drive** : même `WaveShaperNode` statique que `playSynthNote`,
    uniquement sur l'oscillateur principal (avant le filtre), comme
    l'original.
  - **Chorus/Vibrato** : mêmes LFO que `playSynthNote`, mais qui ne
    s'arrêtent JAMAIS tant que le bourdon tient (au lieu d'un aller simple
    borné par la durée de la note) — le vibrato recalcule sa profondeur en
    Hz à chaque retune (`updateDrone`), sinon un accord grave suivi d'un
    accord aigu garderait la largeur de vibrato de l'ancien pitch.
  - **Enveloppe de filtre** : appliquée UNE SEULE FOIS, à l'attaque
    initiale — **jamais rejouée à un retune** (décision de portée assumée :
    la rejouer à chaque nouvel accord réintroduirait exactement l'effet de
    ré-attaque que le bourdon doit justement éviter).
  - **Forme d'attaque/release** (`attackCurve`/`releaseCurve`) : appliquées
    via le même helper `rampGain` que `playSynthNote`, au lieu d'un
    `exponentialRampToValueAtTime` toujours codé en dur. La forme de release
    est mémorisée au démarrage du bourdon (`droneReleaseCurve`) — `stopDrone`
    est appelé depuis plusieurs points (mute, bascule du réglage, Stop) qui
    ne reçoivent pas la voix.
  - Volume de ligne, Réverbe et Delay n'avaient PAS besoin de correctif :
    ils s'appliquent au bus (`synthLineGain.pad`/ses envois), en aval de
    toutes les voix de la ligne y compris le bourdon — déjà correct avant ce
    correctif, juste vérifié.
  - **Glide** n'avait pas non plus besoin de correctif : déjà passé à
    `updateDrone` (`glideTime`), c'est lui qui règle la vitesse du glissé
    entre deux accords — juste vérifié.
  - **Étalement (strum)** manquait bien (retour de Yann, suite immédiate :
    « et glide + étalement + section espace ? ») : `scheduler.ts` calculait
    `strumSpread` uniquement dans la branche non-bourdon, jamais transmis à
    `updateDrone`. Ajouté en 5e paramètre (`strumSpread = 0`) : même formule
    de décalage par voix que `playPadChord`
    (`perNoteOffset = strumSpread / (nbVoix - 1)`), appliquée à l'attaque
    initiale (`startDrone`) ET à chaque retune — sur un retune, ça étale
    légèrement le DÉBUT DU GLISSÉ de chaque voix plutôt qu'une attaque (il
    n'y en a plus une fois le bourdon lancé).
  Vérifié par script Playwright : Tone/Chorus/Vibrato/Détune/Sub/Ouv. et
  Ferm. filtre poussés à des valeurs franches sur la Nappe, bourdon activé,
  lecture 5s sans erreur console.

---

## Audit de design complet — 2026-08-15

Demandé par Yann (« j'ai des doutes sur le visuel et sur l'ergonomie »).
Méthode : lecture du code + application réellement lancée et mesurée au
script Playwright (1280×900 desktop, 390×844 et 360×780 tactile, 844×390
paysage pour le Live), captures de chaque mode et de chaque onglet, tous
les dépliables ouverts pour observer la densité réelle. Aucune erreur
console sur aucun écran. **Constats classés par gravité, rien n'est encore
codé** — c'est un état des lieux, pas un journal de travaux.

### Constat de fond

Trois modes, trois langages visuels — et **c'est le Mode Live qui est le
plus abouti**. Fond sombre, LCD verte, gros pavés tactiles, chaque zone a
un rôle lisible : ça ressemble à un instrument. L'Atelier, lui, ressemble à
la boîte de dialogue *Propriétés d'affichage* : des rangées de curseurs
étiquetés, des `<fieldset>`, des menus déroulants. Le design XP n'est pas
le problème et ne doit pas bouger — le problème est qu'on en a repris la
grammaire des **panneaux de configuration** pour l'Atelier, alors que le
Mode Live a repris celle des **lecteurs multimédia** de la même époque
(Winamp), qui est la bonne référence pour un instrument. XP avait les deux
grammaires. L'Atelier gagnerait à emprunter à la seconde sans rien perdre
de l'identité Luna.

### A. Ergonomie — structurel

1. **Le chrome mange l'écran avant le premier pas jouable.** Mesuré : la
   première case du séquenceur commence à 538px sur un 390×844, soit
   **64 % du premier écran occupé par de la chrome** ; 56 % sur
   1280×900. Quatre barres empilées avant le moindre contenu : `nav.switcher`
   (3 modes, alors que le splash vient de poser ce choix), la menubar
   Fichier/Édition/Affichage/Aide, la `.sticky-bar` (transport + 2 lignes
   d'aide + onglets) et la `.preset-row`. La barre sticky à elle seule fait
   130px = **15 % du viewport, en permanence, sur les trois onglets**. Deux
   gros contributeurs évitables : le paragraphe explicatif de la Banque de
   séquences (4 lignes pleines sur mobile, affiché en permanence) et le tip
   💡 production — le rappel clavier, lui, est déjà masqué en
   `@media (pointer: coarse)`.
2. **`XpSlider` n'a aucune largeur de piste sensée : de 40px à 818px sur la
   même page.** Mesuré sur les 62 curseurs de l'onglet Rythme déplié —
   mobile min 40px / max 228px, desktop min 58px / max 818px. Deux causes
   opposées qui se croisent : `.two-col { minmax(148px, 1fr) }` laisse
   148 − 72 (label) − 36 (valeur) − gaps = **40px de piste** (Swing, Traîne,
   Rafales, Ghost notes, Vélocité, Intensité du fill) ; à l'inverse, un
   curseur seul dans un fieldset de ligne reçoit **804px de piste pour un
   « Pas » qui va de 1 à 32** (25px par cran). 40px pour un 0-100 % : chaque
   pixel vaut 2,5 %, le réglage fin est impossible en mode rapide. C'est le
   défaut le plus visible, le plus mesurable, et le moins cher à corriger —
   un seul fichier pour 62 curseurs.
3. **Les 15 dépliables sont à la fois le seul chemin d'accès et la plus
   petite cible de la page.** `.group-toggle` = **61×17px**, ×15 sur le seul
   onglet Rythme (3 groupes × 5 lignes), ~19 sur Synthé. C'est la navigation
   principale de l'Atelier depuis la passe « tout replié par défaut », en
   cible tactile de 17px de haut. Dans le même registre : `.mute` 29×18px,
   `.wbtn` 22×22px, la barre d'outils 19px. **184 cibles interactives sous
   32px** au total. À rapprocher du diagnostic ergonomie du Live déjà
   retenu (« tout ce qui est interactif en live reste large ») : la règle
   n'a jamais été appliquée à l'Atelier.
4. **Repliés, les 15 fieldsets forment un mur de rayures identiques.** Un
   `<fieldset>` vide dessine un rectangle pleine largeur pour ne contenir
   qu'un mot de `<legend>`. Entre deux lignes de batterie, on traverse 3
   bandes vides ; les 40px de cases coloriées se perdent au milieu. C'est
   la cause visuelle directe de « l'Atelier a l'air d'un formulaire ».
5. **La grille ne dit rien du temps musical.** Aucun repère : pas d'accent
   tous les 4 pas, pas de numérotation, pas de séparation de mesure. Comme
   les subdivisions diffèrent par ligne (kick 4, snare 4, hat 3 par défaut),
   **les colonnes ne s'alignent pas verticalement** d'une ligne à l'autre —
   c'est le principe polyrythmique assumé du projet, mais sans repère commun
   on ne peut pas lire la relation entre les lignes. Manque le plus coûteux
   musicalement ; la vue circulaire répond bien à ça, la vue linéaire pas
   du tout.
6. **Mêmes commandes à trois endroits.** Sauver/Charger : menu Fichier
   *et* boutons `.preset-row`. Vue linéaire/circulaire : menu Affichage
   *et* bouton `.preset-row`. Partager : menu Fichier *et* barre d'outils.
   Undo/redo : menu Édition *et* barre d'outils *et* Ctrl+Z. Trois surfaces
   à maintenir, et de la hauteur consommée au point le plus cher de la page
   (cf. A1).

### B. Visuel — défauts précis

1. **6 boîtes de valeur débordent sur deux lignes** (colonne figée à 36px) :
   « 120 BPM » — visible dès le premier écran — et « 20000 Hz » sur les
   5 lignes de batterie.
2. **12 libellés tronqués, y compris quand 800px de piste restent vides à
   côté** : « Coups euclid… », « Filtre passe-… », « Vélocité aléa… »,
   « Volume géné… », « Rafales spon… », « Taux de rem… », « Feedback
   de… ». Colonne de label figée à 72px quelle que soit la largeur
   disponible.
3. **Cases de proportions extrêmes.** À 4 pas sur 980px : 230×34px, des
   barres écrasées. La hauteur est fixe (34px), la largeur n'est bornée par
   rien.
4. **Vue circulaire : 340px au centre d'une fenêtre de 980px**
   (`.circle-holder { max-width: 340px }`), entourée de beige vide sur
   530px de haut. Bien calibré sur mobile, perdu sur desktop. À noter
   aussi : la limitation volontaire à kick/snare/hat (PLAN §6) est un choix
   documenté, mais le titre de la fenêtre annonce toujours « Kick / Snare /
   Hat / Clap / Shaker » et rien n'indique que 2 lignes sur 5 deviennent
   inéditables en basculant de vue.
5. **L'anneau synthé du transport est quasi invisible** : couleurs synthé
   délavées sur un canvas de 50px, fond beige — un halo rose pâle, alors
   que l'anneau batterie juste à côté est franc.
6. **Splash et Mode jeu : contenu collé en haut, ~70 % de vide.** Rien
   n'est centré verticalement nulle part. Le fond Bliss n'a par ailleurs
   ses collines qu'à 108-112 % de hauteur : sur un écran haut on ne voit
   qu'un dégradé bleu-vert, jamais la colline qui fait l'identité du fond.
7. **La menubar se casse en deux lignes sur mobile**, séparant ↶ de ↷.
8. **Les cases synthé n'affichent qu'un point** : une ligne vide = 4
   rectangles gris avec un « · » centré, qui ont l'air désactivés à côté
   des cases batterie franchement colorées.
9. **Le canvas `FilterCurve` flotte à droite du header de ligne**, ses
   graduations « 100 / 1k / 10k » chevauchant la courbe, avec un grand vide
   à sa gauche.

### C. Priorités proposées

**Palier 1 — fort impact, coût faible, zéro risque pour l'identité XP :**
A2 (plancher/plafond de piste + colonnes label/valeur élastiques dans
`XpSlider` — corrige du même coup B1 et B2), A1 (dégonfler la chrome :
explication Banque derrière un ⓘ, tip production repliable, fusion
nav+menubar), A3 (cibles tactiles des dépliables).

**Palier 2 — demande un vrai parti pris :** A5 (repères de mesure dans la
grille linéaire), A4 (alléger les fieldsets repliés), A6 (dédoublonner les
commandes).

**Palier 3 — finitions :** B6 (centrage vertical splash/jeu, collines
Bliss), B4 (cercle desktop), B5 (anneau synthé), B8 (cases synthé), B3,
B7, B9.

> **État au 2026-08-16** — ces trois paliers ne sont plus à jour, ils sont
> conservés tels quels comme trace de l'arbitrage d'origine. Palier 1 livré
> en entier ; du palier 2, A4 et A5 sont livrés, **seul A6 reste** ; du
> palier 3, B7/B5/B9 sont réglés (les deux derniers par suppression),
> **B3/B4/B6/B8 restent**. Le plan à jour, croisé avec les remarques de
> Yann, est en fin de document :
> [plan d'action consolidé](#plan-daction-consolidé--2026-08-16).

### C. Remise en cause de ce document (demandée par Yann le même jour)

**C1 — Trois constats de l'audit sont le prix d'une décision cochée ✅.**
La passe « Réduire tous les paramètres » (§7.2.1) a posé trois nombres :
colonnes `72px/1fr/36px` au lieu de `110/1fr/56`, seuil des grilles
`auto-fit` à 148px au lieu de 190-260. Ce sont exactement les valeurs
présentes aujourd'hui dans `XpSlider.svelte` et `AtelierView.svelte`, et
exactement les causes de A2, B1 et B2. Le marché passé : une colonne de
curseurs utilisables (~166px de piste sur téléphone) contre deux colonnes
serrées (40px). Et l'échange n'a pas produit ce qu'il visait — l'onglet
Rythme déplié fait toujours 3,3 écrans. Suggestion : pas d'annuler la
passe, mais que **✅ ne veuille pas dire définitif** — cette entrée mérite
un ⚠️ « à rouvrir » avec son coût mesuré à côté.

**C2 — Ce document n'enlève jamais rien.** Sur ~1 270 lignes, la
quasi-totalité des entrées ajoutent ; presque aucune ne supprime, ne
fusionne, ni ne rend son espace. A6 (mêmes commandes à trois endroits) et
A1 (quatre barres avant la première case) en sont le résultat mécanique.
Deux garde-fous : une section permanente **dette d'interface** au même
rang que le backlog de features ; et la règle que **tout nouvel élément
d'UI permanent nomme ce qu'il remplace, ou d'où vient sa place**.
Corollaire : chaque ✅ gagnerait une ligne « ce que ça coûte à l'écran »,
à côté du « pourquoi » déjà très bien tenu.

**C3 — Une partie du backlog XP aggraverait A1.** §2 « Pousser le look XP
plus loin » et §6 « Grosses » proposent barre des tâches + menu Démarrer,
fenêtres déplaçables, curseurs souris XP, écran de boot, écran de veille :
toutes du chrome en plus, alors que le chrome occupe déjà 64 % du premier
écran mobile. À conditionner explicitement (desktop uniquement, et
*après* rétablissement du budget d'écran) plutôt qu'à laisser en l'état —
sinon elles seront codées un jour « parce qu'elles étaient dans le plan ».

**C4 — L'invariant le plus critique du projet n'est protégé que par un
commentaire.** `CLAUDE.md` interdit de changer l'ordre d'itération des
lignes du scheduler parce qu'il détermine la reproductibilité de l'export
à l'octet près. §4 avait prévu le test qui le verrouille — snapshot JSON
de la liste d'événements schedulés à seed fixe, décrit comme attrapant
« 95 % des régressions pour presque rien » — **jamais écrit**. État réel
de `tests/` : un fichier, 131 lignes, trois tests moteur sur des briques
pures (PRNG, helpers de groove, euclidien) ; zéro sur le scheduler, le
rendu ou l'UI. Meilleur rapport valeur/effort de tout le document. Dans
la même veine, les scripts Playwright de vérification sont jetés à chaque
passe alors qu'ils feraient une suite de fumée engagée pour presque rien.

**C5 — L'accessibilité de §4 n'a jamais été faite et rien ne le signale.**
Promis : `role="grid"`/`gridcell`, `aria-pressed`, libellé par pas,
`prefers-reduced-motion`. Compté dans le code : 0, 0, 0, 0 (seul
`XpSlider` a son `role="slider"`). Le problème n'est pas que ce ne soit
pas fait, c'est que ce soit écrit au passé dans une liste d'améliorations
acquises — donc invisible comme reste-à-faire. À promouvoir en entrée de
backlog, ou à rayer franchement.

**C6 — L'arborescence §1 décrit un dépôt qui n'existe pas.** 26 fichiers
planifiés n'ont jamais été écrits (`clock.ts`, `sidechain.ts`,
`theory.ts` → `harmony.ts`, `transport/session/ui.svelte.ts`,
`XpButton/XpCheckbox/XpSelect/XpBalloon/XpMenuBar`, `StepGrid/StepCell`,
les 7 modules d'atelier, les 5 composants de jeu, les 2 fichiers de
thème…). À l'inverse `ui/live/` — ~4 000 lignes, la plus grosse surface
d'UI du projet — n'y figure pas. Le code a mieux tourné que le plan ; le
souci est que le bloc s'intitule « Architecture cible » et fait autorité.
Les trois unifications qui comptent sont déjà dans `CLAUDE.md` : cette
arborescence peut simplement disparaître.

**C7 — Le cadre « iso-fonctionnalité » a expiré, deux blocages sont
enterrés dans la prose.** §3 découpe encore le travail en phases avec des
pourcentages alors que la migration est finie : à archiver. L'original
reste décrit comme « source unique de vérité » sans borne — c'est vrai
pour les constantes audio (`CLAUDE.md` le formule bien) mais c'est aussi
de lui que vient la grammaire « panneau de configuration » critiquée
ci-dessus : à restreindre explicitement au moteur. Enfin deux vrais
blocages ne se voient pas : le **capteur d'inclinaison du Mode Live n'a
jamais été testé sur un téléphone réel** (pour un mode conçu pour le
paysage sur téléphone), et le **bouton de retour utilisateur attend un
arbitrage** (formulaire tiers vs fonction serverless) depuis le 13/08.
Les blocages méritent d'être en tête de document.

---

## Remarques de Yann — 2026-08-15 (2e lot) : analyse et cadrage

Sept remarques livrées en vrac, analysées ici **contre le code** avant d'être
rangées dans le backlog. Chacune est datée du constat mesuré qui la fonde :
sans ça, une remarque devient un item de liste qu'on relit dans six mois sans
savoir ce qu'elle voulait dire. Ordre ci-dessous = ordre de la note de Yann,
PAS ordre de priorité (proposé en fin de section).

### R1 — « Les mélodies des presets ne sont pas très bien réglées et prennent souvent trop de place »

**Ce n'est pas un réglage à corriger preset par preset : aucun preset ne
contient de mélodie.** Les 34 presets n'embarquent qu'une graine (`noteSeed`)
et un taux de remplissage (`synthFillRate`) ; les notes sont tirées au
chargement par `randomizeSynth` (`src/engine/generators.ts:70`), appelé depuis
`presetAdapter.ts:105`. « Mal réglé » désigne donc le générateur, pas les
données.

Trois causes, mesurées sur les 34 presets (script jetable, densité après
`presetToState`) :

1. **La mélodie est la ligne la plus dense, par construction.** Dans
   `randomizeSynth`, la basse reçoit `fillRate * 0.75` et la mélodie
   `fillRate` **plein pot** — au moment où c'est justement elle qui a la
   subdivision la plus fine (`melodySubdiv` vaut 8 sur 23 presets et 16 sur
   11, contre 4 pour la nappe). Résultat moyen : **1,9 note/mesure pour la
   mélodie contre 1,2 pour la basse et 0,9 pour la nappe** — la mélodie est
   la ligne la plus chargée dans **21 presets sur 34**. Pires cas : Garage 7
   notes/mesure, House 6, Hard house 6, French touch 5.
2. **Il n'y a pas de phrase, seulement une densité.** Chaque pas est un
   tirage indépendant (`if (rng() > density) return null`), sans motif, sans
   répétition, sans reprise de souffle, sans ancrage sur les temps forts. Une
   suite de notes justes tirées indépendamment ne fait pas une mélodie, elle
   fait une texture — c'est exactement l'impression de « pas très bien
   réglé ». Les notes ne sont jamais *fausses* (gamme fixe, 70 % de notes
   d'accord), elles sont *sans intention*.
3. **Le silence n'est pas un matériau.** `randomizePitchedLine` ne sait pas
   produire de repos structuré : à 55 % de remplissage, une mesure sur deux
   n'a aucun trou de plus de deux pas.

**Piège écarté en vérifiant** (hypothèse à ne pas rejouer) : `PITCHED_LINE_CONFIG`
donne `defaultOctave: 0` à la basse ET à la mélodie, ce qui donne l'impression
qu'elles se marchent dessus. Faux : le registre est décidé plus loin, dans le
scheduler (`scheduler.ts:461`, `-24` demi-tons pour la basse). La config à deux
entrées identiques est du poids mort, pas un bug.

**Piste recommandée**, dans l'ordre de rapport effet/risque :
- (a) **Redescendre la densité de la mélodie sous celle de la basse** — un
  facteur `0.5` là où il y a `fillRate` aujourd'hui. Une ligne, effet
  immédiat sur les 34 presets.
- (b) **Générer un motif court puis le répéter** (2 ou 4 temps tirés, réutilisés
  sur le cycle avec une variation en fin de phrase) plutôt qu'un tirage par
  pas. C'est le vrai correctif ; ça rend la mélodie *mémorisable*.
- (c) N'ouvrir la question « et si les presets portaient de vraies mélodies
  écrites à la main ? » qu'après (a) et (b) : c'est 34 × N notes à saisir, et
  ça fait perdre la propriété « un preset = une graine » qui garde
  `songs.ts` lisible.

⚠️ **Contrainte de déterminisme, à lire avant de coder.** Toute modification
du NOMBRE ou de l'ORDRE des tirages dans `randomizeSynth` change les notes de
**tous** les presets et de toutes les sauvegardes qui rejouent une graine.
Ce n'est pas interdit (ce n'est pas le scheduler, `tests/scheduler.test.ts`
ne le couvre pas), mais c'est un changement **visible et irréversible** pour
qui a sauvegardé un morceau : à assumer explicitement, pas à découvrir après
coup. Une modification qui ne change que les *arguments* (piste (a)) reste sans
risque pour l'ordre de consommation.

### R2 — « Il faut travailler le mode jeu »

Constat après lecture (`src/stores/game.svelte.ts` 342 l.,
`src/model/presets/levels.ts` 505 l., `GameView.svelte` 482 l.) : **le contenu
n'est pas le point faible.** Les 34 niveaux forment une vraie progression
pensée (rounds thématiques, preset d'ancrage après chaque notion abstraite,
arc 4:3 étiré sur les niveaux 28-31, préambules écrits). Ce qui est mince est
ailleurs :

- **Un seul verbe : reproduire.** Les 34 niveaux font varier les *paramètres*
  (subdivision, swing, traîne, polyrythmie) mais jamais la *tâche*. `verify()`
  est une comparaison case à case, binaire. Rien ne teste l'oreille autrement
  (reconnaître un genre, repérer l'intrus, compléter une mesure manquante,
  poser un contre-temps), ni le geste (jouer en rythme, tenir un tempo).
- **La moitié de l'appli n'est pas enseignée.** Le jeu est volontairement
  limité à kick/snare/hat (`GameDrumRowName`, décision §6) : ni clap/shaker,
  ni synthé, ni harmonie, ni mix. Un joueur qui finit la campagne n'a jamais
  rencontré la Nappe.
- **La campagne se termine.** Après le niveau 34, plus rien : pas de mode
  sans fin, pas de rejeu noté, pas de défi quotidien. Les étoiles et la
  besace récompensent la première traversée seulement.

⚠️ **Arbitrage nécessaire avant tout code** : « travailler le mode jeu » peut
vouloir dire trois chantiers très différents (nouveaux types d'exercices /
extension au synthé / rejouabilité après le 34). À faire trancher — la
recommandation par défaut est **un deuxième type d'exercice** (le plus faible
coût pour le plus gros changement de perception : la campagne cesse d'être une
même épreuve répétée 34 fois).

### R3 — Login/mot de passe, base de données, commentaires et signalements, profils admin, monitoring des usages

**C'est le seul item du lot qui change la nature du projet, pas son contenu.**
État réel aujourd'hui : **une seule dépendance runtime** (`lamejs` pour
l'export MP3), aucun dossier `api/`, aucune fonction serverless, tout l'état
persistant en `localStorage` (progression du jeu, banque de séquences,
autosave, réglages). Le site est un tas de fichiers statiques sur Vercel.

Conséquence à poser franchement : **`npm run build:singlefile` et les comptes
utilisateurs sont incompatibles.** Le fichier HTML autonome — qui marche sans
serveur, hors ligne, et qu'on peut s'envoyer par mail — ne peut pas
authentifier qui que ce soit. Ce n'est pas un détail d'implémentation, c'est
une propriété du produit qui est dans le `README`, dans la CI et dans
CLAUDE.md. Deux issues :

- **Option 1 — dégradation gracieuse (recommandée).** Le noyau reste 100 %
  local et le compte est *optionnel* : sans connexion, l'appli est exactement
  celle d'aujourd'hui ; connecté, on synchronise sa banque de séquences et sa
  progression, et on peut publier/commenter. Le build autonome continue de
  passer, avec le module réseau simplement absent. C'est la seule option qui
  ne détruit rien.
- **Option 2 — l'appli devient un service.** Comptes obligatoires, la banque
  vit côté serveur. Le build autonome perd son sens et doit être retiré de la
  CI. À n'envisager que si Yann le décide *explicitement*, en connaissance de
  ce qu'on jette.

Sous l'option 1, le lot se découpe en quatre briques **indépendantes**, à ne
surtout pas traiter comme un bloc :
1. **Monitoring des usages** — brique isolée, aucun compte requis. Un simple
   comptage anonyme (pages, presets chargés, exports) via l'analytique Vercel
   ou un endpoint minimal. **De loin le meilleur rapport valeur/effort du
   lot**, et le seul qui informe les six autres remarques : on saurait enfin
   si le mode jeu est joué et jusqu'où.
2. **Auth** — à ne pas écrire soi-même. Un fournisseur (Vercel + Supabase /
   Auth.js) et rien d'autre ; toute session maison sur ce projet serait une
   régression de sécurité.
3. **Base + banque partagée** — dépend de 2. C'est ici que vit la vraie
   valeur (publier une séquence, la retrouver ailleurs).
4. **Commentaires + signalements + rôle admin** — dépend de 1, 2 et 3, et
   ouvre la **modération**, c'est-à-dire un engagement de temps humain
   permanent, pas une fonctionnalité qu'on livre et qu'on oublie. À traiter en
   dernier, ou pas.

⚠️ **Arbitrage nécessaire** : option 1 vs option 2, et est-ce qu'on veut de la
modération. Recommandation : livrer la brique 1 seule, tout de suite, et
attendre ses chiffres avant d'engager 2-3-4.

### R4 — « Pour les claps : il faudrait proposer un fill de clap »

Petit en surface, avec un piège précis dessous. Aujourd'hui le clap partage
la fonction de déclenchement du kick et de la snare
(`triggerKickSnareStep`), mais la zone de fill est explicitement réservée :
`const fillZone = name === 'snare' && fillNow && …` (`scheduler.ts:91`). Le
clap traverse donc les mesures de fill sans rien faire de particulier.

⚠️ **Le piège est le déterminisme, pas le son.** Un fill fait sonner des pas
aujourd'hui silencieux ; chaque frappe ajoutée appelle `randomizeGain(…, rng)`.
Des tirages en plus **décalent tout ce qui suit** — c'est exactement
l'interdit de CLAUDE.md, et `tests/scheduler.test.ts` tombera (ce qui est son
rôle). Les anciens exports MP3 cesseraient d'être reproductibles.

**Solution propre, à retenir** : laisser intact le nombre de tirages pris sur
le flux principal (une frappe programmée = un tirage, comme aujourd'hui) et
alimenter les **frappes supplémentaires du fill** depuis un second générateur
dédié, dérivé de la même graine. Le flux principal ne bouge pas, donc les
patterns existants sonnent identiques ; seul le clap gagne quelque chose. À
valider en rejouant l'instantané de référence du test, qui doit rester vert
**sans être mis à jour** — s'il faut le modifier, c'est que la solution est
ratée.

### R5 — Cycles en fraction de mesure (1/2, 1/3, 1/4) — « poser la question à Claude de la meilleure manière de travailler »

Réponse demandée, donc voici l'analyse et une recommandation ferme.

**Où on en est.** Les deux familles de lignes n'ont pas le même modèle de
grille : une ligne **synthé** a déjà `cycleBars` (1..16 mesures) +
`subdivisions`, alors qu'une ligne **batterie** n'a que `subdiv` et boucle
**toujours sur exactement une mesure** (`stepDurationFor = barDuration /
subdiv`, `groove.ts:9`, curseur qui repasse à zéro à `subdiv`). La demande
porte donc sur les lignes batterie, et elle demande l'inverse de `cycleBars` :
une boucle **plus courte** qu'une mesure.

**Trois manières de le faire, par coût croissant :**

- **B — un multiplicateur de répétition** (`repeat: 1|2|3|4`) : la ligne garde
  sa grille d'une mesure, on n'écrit que `subdiv/repeat` cases et le moteur les
  répète. 1/2, 1/3, 1/4 sont exactement ça. **Zéro changement de timing, zéro
  tirage aléatoire en plus, zéro risque sur le déterminisme**, un entier de
  plus dans l'état. Ne permet pas les périodes qui ne divisent pas la mesure.
- **A — `cycleBars` rationnel sur les lignes batterie** : unifie les deux
  modèles de grille, ce qui est séduisant sur le papier. **C'est le piège du
  lot.** Le fill (`isFillBar`, `isLastSteps`), le break, le mode jeu, la règle
  du swing (`col % 2`), la grille CSS `--bars`, l'anneau de transport
  (`totalBars` deviendrait un PPCM de fractions) et la sérialisation supposent
  tous qu'une ligne batterie dure une mesure. « Quel est le dernier quart
  d'une mesure de fill quand la ligne boucle en 1/3 de mesure ? » n'a pas de
  réponse évidente — et c'est une question qu'il faut résoudre *avant* la
  première ligne de code, pas pendant.
- **C — période libre en pas** (`periodSteps`, la ligne se décale d'une mesure
  à l'autre) : le seul qui donne du vrai déphasage façon Steve Reich, et celui
  qui casse le plus (la ligne n'est plus alignée sur la mesure du tout).

**Recommandation : B d'abord**, livré comme fonctionnalité d'écriture (« motif
de 4 cases, répété 3 fois dans la mesure »), et **C plus tard** si Yann veut du
déphasage réel. **Ne pas partir sur A** : il coûte le prix de C en donnant le
résultat de B.

À savoir avant de choisir : `subdiv` monte déjà à 32, donc 1/3 est *déjà*
jouable à la main aujourd'hui (subdiv 12, motif de 4 cases recopié trois fois).
B ne débloque donc pas un son nouveau — il supprime la recopie et rend le
motif modifiable en un seul endroit. C'est un gain d'écriture, à assumer comme
tel dans l'arbitrage : ça change ce qu'on peut *faire vite*, pas ce qu'on peut
faire.

### R6 — « Et pk pas un système de pad à déployer pour enregistrer en direct les lignes de synthé ? »

**Bonne nouvelle : c'est déjà à 80 % construit, et ça ne se voit pas.** Le
Mode Live (`LiveView.svelte`, 2 729 l.) a un pad XY, et le mode « SOLO MÉLO »
(maintenu) fait déjà **jouer la mélodie au doigt** sur ce pad, via
`AudioEngine.playLiveMelodyNote()` et `liveMelodyFreqForDegree()`.

Ce qui manque est précisément une chose : **rien n'écrit ce qu'on joue dans la
grille.** Le bouton ⏺ REC du Mode Live capture de l'**audio**
(`engine.startCapture()` → WAV téléchargé) ; aucun code ne pose de note dans
`synthRows.*.pattern`. On peut jouer une ligne au doigt et l'entendre, mais pas
la garder.

Le chantier est donc « enregistrement de notes, quantifié » : horodater les
appuis, les ramener au pas le plus proche de la ligne cible, écrire dans le
motif. **Aucun risque de déterminisme** (on écrit de l'état, on n'ajoute pas de
tirage dans le scheduler), et le geste existe déjà. C'est le meilleur rapport
effet/effort des sept remarques après le monitoring.

Question ouverte à trancher au moment de le faire : est-ce que ça s'enregistre
depuis le Mode Live (où le pad vit) ou est-ce qu'on amène un pad dans
l'Atelier (où vit la grille) ? Le premier réutilise tout, le second évite un
aller-retour entre deux modes. Recommandation : **le Mode Live**, en ajoutant
« garder ce que je viens de jouer » à côté du REC audio — un élément d'UI de
plus, mais dans un mode qui a de la place, pas dans l'Atelier qui n'en a plus
(règle n°1 du §7.5).

### Priorité proposée pour ce lot

1. **R1(a)** — densité de la mélodie divisée : une ligne, effet sur les 34
   presets, c'est la remarque la plus concrète du lot.
2. **R3 brique 1** — monitoring anonyme seul : le seul item qui *informe* les
   autres, et sans compte à gérer.
3. **R6** — enregistrer les notes jouées au pad : le geste existe déjà.
4. **R4** — fill de clap, avec le second générateur.
5. **R1(b)** — mélodie par motif répété : le vrai correctif musical.
6. **R5 (option B)** — répétition de motif dans la mesure.
7. **R2** — mode jeu : demande un arbitrage avant tout code.
8. **R3 briques 2-4** — comptes, base, modération : après les chiffres de la
   brique 1, jamais avant.

Trois items attendent un arbitrage de Yann et ne doivent pas être commencés
sans : **R2** (quel chantier), **R3** (option 1 vs 2, et modération ou non),
**R5** (B tout de suite, ou C visé d'emblée).

---

## Plan d'action consolidé — 2026-08-16

Demande de Yann : « remets en perspective mes actions proposées et les
propositions de ton audit pour voir un plan d'action cohérent ». Ce qui suit
**remplace** les priorités de l'audit de design (§ « C. Priorités proposées »,
paliers 1-3) et l'ordre proposé en fin de « Remarques de Yann — 2e lot ». Les
deux sections restent en place comme trace des arbitrages d'origine ; c'est
ici qu'on lit ce qu'on fait ensuite.

### Ce que le croisement change

Les deux listes ne parlaient pas de la même chose : **l'audit porte sur la
façon dont l'appli présente ce qu'elle fait déjà**, les remarques de Yann sur
**ce qu'elle fait et pour qui**. Elles ne se concurrencent pas sur le fond —
elles se concurrencent sur l'écran et sur le temps. Trois conséquences en
sortent, qu'aucune des deux listes ne pouvait donner seule.

**1. Le reste-à-faire de l'audit est deux fois plus petit qu'annoncé.** En
vérifiant chaque constat dans le code plutôt qu'en relisant les listes :
palier 1 livré en entier ; A4 et A5 livrés (A5 figurait encore en ⚠️ « à
trancher » à côté de son propre ✅) ; **B5 et B9 n'existent plus, résolus par
suppression** — un seul anneau de transport au lieu de deux, `FilterCurve`
supprimé. Il reste **A6 · B3 · B4 · B6 · B8 · accessibilité**, soit six items
sur les quinze du 15/08.

**2. Trois des remarques de Yann fusionnent avec des constats de l'audit.**
Ce ne sont pas des travaux voisins, ce sont les deux faces d'un même défaut :

| Remarque de Yann | Constat d'audit | Ce que ça donne fusionné |
|---|---|---|
| **R1** mélodies trop denses | **B8** cases synthé qui ont l'air désactivées | « la partie synthé est opaque » — illisible à l'œil ET à l'oreille. À juger ensemble, sinon on corrige une moitié et le problème persiste. |
| **R6** pad pour enregistrer | **A6** mêmes commandes à trois endroits | A6 est la *règle* qui répond à « où vit le pad ». Réponse : dans le Mode Live, qui a de la place — pas une 3ᵉ surface dans l'Atelier. |
| **R2** travailler le mode jeu | **B6** splash/jeu collés en haut, 70 % de vide | Le même écran. Si on ouvre le mode jeu, on fait les deux dans la même passe, pas deux fois. |

**3. R5 est débloqué par du travail déjà livré, et personne ne le savait.**
Les cycles fractionnaires demandent qu'on voie la mesure ; les repères de temps
(A5, livré le 15/08, utilitaire `.beat-grid` piloté par `--bars`/`--beats`)
sont exactement ça. Un multiplicateur de répétition s'y branche sans nouveau
travail visuel. Proposer des cycles en 1/3 de mesure dans une grille sans
mesure visible aurait été incompréhensible ; ça ne l'est plus.

### Le vrai goulot : quatre décisions, pas du code

> ✅ **Tranchées le 2026-08-16** — les quatre réponses de Yann, et ce qu'elles
> changent (dont deux recommandations corrigées), sont dans
> [Arbitrages D1-D4](#arbitrages-de-yann-sur-d1-d4--2026-08-16). Ce qui suit
> reste la formulation des questions telles qu'elles étaient posées.

Constat qui surprend et qui organise tout le reste : **ce qui reste des deux
listes est majoritairement bloqué sur des arbitrages, pas sur de la
difficulté technique.** Tant qu'ils ne sont pas tranchés, s'y mettre c'est
risquer de jeter le travail.

- **D1 — Est-ce que la boîte à rythmes devient un service ?** (gouverne R3)
  Comptes optionnels avec noyau 100 % local, ou appli serveur. Décide aussi du
  sort de `build:singlefile` : un HTML autonome ne peut authentifier personne.
  *Recommandation : comptes optionnels (option 1 de R3), le build autonome
  survit.*
- **D2 — Le mode jeu, dans quelle direction ?** (gouverne R2 + B6) Un
  deuxième type d'exercice / une extension au synthé / de la rejouabilité
  après le niveau 34. *Recommandation : un deuxième type d'exercice — c'est ce
  qui change le plus la perception pour le moins de code (la campagne cesse
  d'être une même épreuve répétée 34 fois).*
- **D3 — Les cycles fractionnaires, jusqu'où ?** (gouverne R5) Multiplicateur
  de répétition (sûr, gain d'écriture) ou période libre (déphasage réel,
  casse l'alignement à la mesure). *Recommandation : le multiplicateur
  d'abord.*
- **D4 — L'accessibilité est-elle un objectif ?** (gouverne §4/§7.5) Toujours
  à **0 partout** : pas de `role="grid"`, pas d'`aria-pressed`, pas de libellé
  par pas, pas de `prefers-reduced-motion`. *Recommandation : la déclarer
  objectif et lui donner un créneau, OU la déclarer non-objectif assumé — mais
  décider. La laisser ouverte sans échéance est le scénario que la règle n°3
  du §7.5 décrit exactement.*

**A6 n'est pas une 5ᵉ décision** mais une règle à appliquer : elle a déjà sa
réponse par défaut (le §7.5 règle n°1 — tout nouvel élément permanent nomme ce
qu'il remplace), et c'est elle qui arbitre où atterrissent R4, R5 et R6.

### La tension à ne pas escamoter

Le §7.5 a été créé parce que **le backlog n'avait quasiment jamais rien
enlevé**, et que la chrome mesurée à 64 % de l'écran en était le résultat
mécanique. Or les sept remarques du 2ᵉ lot sont **presque toutes des
ajouts** : un fill de clap, un réglage de cycle, un pad d'enregistrement, des
comptes, du contenu de jeu.

Ce n'est pas une objection — c'est la raison pour laquelle chacun passe par le
filtre de la règle n°1 avant d'être codé, et pourquoi le plan ci-dessous
précise **où** chaque chose atterrit :

- **R4** (fill de clap) → aucun élément permanent : le fill existe déjà comme
  notion globale (`fillEvery`), le clap s'y branche. Coût écran **nul**.
- **R5** (cycles) → un curseur de plus dans un panneau **déjà replié**, pas
  une barre. Coût écran nul au repos.
- **R6** (pad) → dans le Mode Live, à côté du ⏺ REC existant. **Aucun ajout
  dans l'Atelier**, qui est la surface saturée.
- **R1** (mélodies) → zéro UI, c'est du générateur.
- **R3** (comptes) → nouvelle surface assumée, et c'est précisément pour ça
  que D1 est une décision et pas une tâche.

### Ce qui peut être fait maintenant, sans aucune décision

Dans l'ordre. C'est la file de travail ; tout le reste attend D1-D4.

1. **R1(a) — densité de la mélodie divisée.** Une ligne dans
   `generators.ts` (la mélodie reçoit `fillRate` plein pot là où la basse
   reçoit `fillRate * 0.75`). Effet immédiat sur les 34 presets, où la
   mélodie est aujourd'hui la ligne la plus dense dans 21 cas sur 34.
   *Ne change que des arguments : aucun risque sur l'ordre de consommation
   du générateur.*
2. **R3 brique 1 — monitoring anonyme seul.** Aucun compte, aucune base :
   un comptage de pages/presets/exports. **C'est le seul item qui informe
   les autres** — notamment D2, qu'on tranche aujourd'hui sans savoir si le
   mode jeu est joué et jusqu'où.
3. **R6 — enregistrer les notes jouées au pad.** Le geste existe déjà
   (`playLiveMelodyNote`, mode SOLO MÉLO) ; il manque l'écriture dans la
   grille. Aucun risque de déterminisme (on écrit de l'état, on n'ajoute pas
   de tirage). Meilleur rapport effet/effort du lot après le monitoring.
4. **B8 — cases synthé vides.** Finition visuelle pure, aucun parti pris, et
   elle fait partie du même problème perçu que R1 (voir tableau ci-dessus) :
   à faire dans la foulée de R1 pour juger le résultat d'un bloc.
5. **R4 — fill de clap**, avec le second générateur dérivé de la même graine.
   Critère de réussite : `tests/scheduler.test.ts` reste vert **sans être mis
   à jour**.
6. **R1(b) — mélodie par motif court répété.** Le vrai correctif musical, et
   le premier item de la file qui change les notes de tous les presets : à
   annoncer comme tel.
7. **B3 · B4** — proportions des cases, vue circulaire perdue au milieu du
   desktop. Finitions sans arbitrage.

### Ce qui attend une décision

| Attend | Chantier | Ce qui tombe avec |
|---|---|---|
| **D1** | R3 briques 2-4 : auth, base, banque partagée, commentaires, modération, rôle admin | le sort de `build:singlefile` |
| **D2** | R2 mode jeu | **B6** (splash/jeu, collines Bliss) — même écran, même passe |
| **D3** | R5 cycles fractionnaires | rien d'autre (A5 l'a déjà débloqué) |
| **D4** | accessibilité (§4) | rien d'autre, mais c'est transverse à tout ce qu'on écrira après |

### Ce qui n'est pas dans ce plan, et pourquoi

- **A1** (budget d'écran) est passé de 64 % à **32 %** de chrome sur le
  premier écran mobile. Objectif atteint pour l'instant ; il redeviendra un
  sujet le jour où on ajoute une surface permanente — ce que D1 propose
  justement de faire.
- **§7.2.1** (passe de densité) reste rouverte, mais son coût a été payé par
  A2 : plus aucune valeur ne passe à la ligne, plus aucun libellé tronqué.
- Le **nit du `select()` au focus** des champs de valeur : trois lignes, à
  prendre en passant dans n'importe quel chantier qui touche `XpSlider`, pas à
  planifier.
- **Étage (2) des tests de déterminisme** (hash du rendu offline sous
  Playwright) : toujours pas fait, et moins urgent depuis que l'étage (1)
  existe. À ressortir si R1(b) ou R4 se révèlent scabreux.

---

## Arbitrages de Yann sur D1-D4 — 2026-08-16

Réponses de Yann aux quatre décisions du plan consolidé, et ce qu'elles
changent. Deux d'entre elles **corrigent une recommandation que j'avais
faite** : c'est noté explicitement plutôt que réécrit en douce.

### D2 — Le mode jeu : validé, et il devient la colonne vertébrale

> « ok avec la direction. le mode jeu doit permettre d'apprendre et de
> débloquer l'atelier puis les modules puis le mode live, etc. »

C'est plus qu'un accord sur le 2ᵉ type d'exercice : **le mode jeu cesse
d'être un des trois modes pour devenir la porte d'entrée qui ouvre les
autres.** Trois conséquences.

**1. Cette fonctionnalité existait dans l'original, et ce port l'a jetée.**
`original/boite-a-rythme-69.html` l. 3593-3611 contient
`MODULE_UNLOCK_LEVEL = { drum: 1, synth: 13, general: 27 }`,
`moduleUnlocked()`, `refreshModuleLocks()` et deux overlays de verrouillage
(`#synthLockedOverlay`, `#generalLockedOverlay`). Le tout **désactivé par un
`return true`**, sous ce commentaire :

> « TEMPORAIRE : rien n'est bloqué pour le moment, le temps de décider comment
> relier réellement les modules à la progression du Mode jeu. Les seuils
> ci-dessus et la vraie condition sont prêts, à remettre en route quand ce
> sera tranché. »

**La décision que Yann vient de prendre est exactement celle que l'original
attendait.** Nos « Décisions fermes » en tête de ce document listent pourtant
« abandon du code dormant (ambiance splash, **verrouillage des modules**) » —
on a supprimé une fonctionnalité en attente d'arbitrage en la prenant pour du
code mort. À corriger dans cette ligne, et leçon à garder : *dormant* et
*abandonné* ne sont pas synonymes ; un `return true` avec un commentaire
d'attente est une question ouverte, pas un déchet.

**2. Les seuils de l'original ne couvrent pas l'échelle demandée.** L'original
verrouillait des **modules à l'intérieur de l'Atelier** (batterie dès le
niveau 1, synthé au 13, effets au 27). Yann demande une échelle plus large —
Atelier, puis modules, puis Mode Live — et **le Mode Live n'existait pas dans
l'original**, donc aucun seuil n'a jamais été pensé pour lui. La grille est à
reprendre, pas à porter telle quelle.

**3. Le verrouillage ne demande AUCUN compte.** Point important parce que la
question est arrivée dans D1 : la progression vit déjà en `localStorage`
(`game.load()` est appelé au montage de `App.svelte`, `progress.level` est
disponible partout). Le portail se code avec ce qu'il y a — `App.svelte` fait
117 lignes et concentre déjà toute la bascule de mode. **Les comptes ne
servent qu'à faire suivre la progression d'un appareil à l'autre**, ce qui est
une autre question, et une question ultérieure.

⚠️ **Reste à trancher avant de coder** : la grille de déverrouillage
elle-même (quel niveau ouvre quoi), et surtout **ce que voit quelqu'un qui
arrive et ne veut pas jouer**. Un verrou dur sur l'Atelier transforme un
bac à sable en couloir : à décider si le verrou est réellement bloquant ou
seulement « à découvrir » (grisé, ouvrable d'un clic « je sais déjà »). La
version d'origine avait choisi le verrou dur — et ne l'a jamais activé.

### D3 — Cycles fractionnaires : synthé seulement, et c'était l'inverse du problème

> « le cycle fractionné permet de faire des gimmicks de mélodie au sein d'une
> mesure. ça ne concerne que le synthé. »

**Correction de ma recommandation.** Mon analyse (R5) portait sur les lignes
**batterie**, et concluait « surtout pas `cycleBars`, ça coûte trop cher ».
Le périmètre réel étant le **synthé**, cette conclusion tombe : les lignes
synthé **ont déjà `cycleBars`**, et une valeur fractionnaire y est presque
gratuite. Le chantier est nettement moins cher que je ne l'ai écrit.

**Pourquoi ça marche déjà.** La boucle synthé du scheduler
(`scheduler.ts:358-400`) est entièrement générique et **libre** : elle calcule
`stepDur = stepDurForLine(row, barDur)`, avance `nextStepTime += stepDur` et
boucle sur `stepIndex % totalSteps`. Contrairement aux lignes batterie, **elle
ne suppose nulle part qu'une ligne dure une mesure**. Un `cycleBars` de 1/2
donnerait donc naturellement deux tours de motif par mesure.

**Ce qui bloque, très précisément : deux `Math.round()`.**

| Endroit | Code actuel | Effet sur 1/2 |
|---|---|---|
| `model/defaults.ts:57` | `row.cycleBars = Math.max(1, Math.round(cycleBars))` | 0,5 → 0 → **1** |
| `engine/harmony.ts:47` | `(Math.max(1, Math.round(row.cycleBars)) * barDur) / …` | idem, la durée du pas retombe à une mesure |

Le reste de la surface (cartographiée exhaustivement, conformément à
`CLAUDE.md`) est de l'arithmétique qui accepte les fractions telle quelle :
`barPositionForStep` (`stepIdx * cycleBars / subdivisions`),
`padChordAtBarPosition`, le curseur du scheduler, et la sérialisation — qui
**ne clampe pas** les lignes synthé (simple fusion d'objet,
`serialize.ts:95`), donc rien à migrer.

Restent trois points d'UI, tous petits :
- le curseur « Cycles (mesures) » est `min=1 max=16` entier
  (`SynthRowView.svelte:281`) → il lui faut les crans fractionnaires ;
- `beatLines` et `--bars` (`SynthRowView.svelte:68`, `227`) supposent
  `4 × cycleBars` temps ≥ 1 — à 1/4 de mesure, ça fait **1 temps**, il faut
  décider quoi dessiner (proposition : plus de repère de temps du tout sous
  1 mesure, comme en affichage par paquets — « mieux vaut aucun repère qu'un
  repère qui ment ») ;
- `TransportRings.svelte:92` prend `Math.max(1, row.cycleBars)` pour le calcul
  du plus grand cycle : correct par accident (une ligne plus courte qu'une
  mesure ne doit effectivement pas agrandir l'anneau), mais à commenter comme
  volontaire.

**Recommandation de périmètre : Basse et Mélodie seulement, pas la Nappe.**
La Nappe est la source harmonique — `padChordAtBarPosition` lit son motif pour
décider quel accord tourne. Lui donner un cycle d'1/3 de mesure ferait changer
l'accord trois fois par mesure, ce qui n'est pas un gimmick mélodique mais un
autre morceau. Les gimmicks demandés vivent sur Mélodie (et éventuellement
Basse) ; laisser la Nappe à ≥ 1 mesure évite entièrement de toucher au moteur
d'harmonie.

### D1 — Trois questions, trois réponses

Yann n'a pas tranché « service ou pas » directement, mais a posé trois
questions qui la découpent mieux que ma formulation.

#### « Comment simplifier les commentaires / signalement ? »

**En supprimant le texte libre.** Le coût des commentaires n'est pas le code,
c'est la **modération** — un engagement de temps humain permanent, et la seule
raison pour laquelle il faut ensuite des signalements, des rôles admin et une
file de traitement. Un système sans texte libre n'a aucun de ces besoins.

Version simple recommandée, par ordre de sobriété :
1. **Des réactions, pas des commentaires** (👍 / 🔥 / 🎧 sur une séquence
   partagée). Rien à modérer, rien à signaler, pas de rôle admin. Couvre le
   vrai besoin (« est-ce que ça plaît ») sans en ouvrir un second.
2. **Un seul lien « Signaler »** qui ouvre un mail ou un formulaire tiers.
   Zéro backend, zéro file.
3. Le texte libre **seulement si** l'usage mesuré le réclame — et à ce
   moment-là c'est un choix assumé de tenir une modération, pas un effet de
   bord d'avoir livré une zone de saisie.

À savoir sur l'ancrage : une séquence partagée **est déjà une URL
autoportante** (`share.ts` : pattern v2 compressé dans le `#`). Il n'y a pas
d'identifiant serveur auquel accrocher une réaction — il faudrait le créer
(par exemple une empreinte du motif). C'est le vrai coût caché de l'étape 1,
pas le bouton lui-même.

#### « Comment centraliser sur le mode jeu pour débloquer les modules ? »

Voir D2 ci-dessus. Réponse courte : **ça ne relève pas de D1** — la
progression est déjà locale, le portail se code sans compte ni base. Les
comptes ne deviennent nécessaires que le jour où la progression doit suivre
d'un appareil à l'autre.

#### « Comment monitorer les usages ? »

Le plus sobre qui réponde vraiment aux questions qu'on se pose : **Vercel Web
Analytics** (`@vercel/analytics`), sans cookie, sans identifiant persistant, à
brancher en une ligne dans `App.svelte` — le projet est déjà déployé sur
Vercel, il n'y a ni serveur ni base à ajouter.

⚠️ **Piège spécifique à ce projet : le build autonome ne doit pas téléphoner.**
`build:singlefile` produit un HTML qu'on ouvre hors ligne, qu'on s'envoie par
mail — y embarquer une balise de mesure enverrait des données depuis la
machine de quelqu'un qui a explicitement pris la version hors-ligne. **Import
conditionné au build site**, jamais dans le singlefile. À vérifier par un
`grep` sur `dist-singlefile/index.html` après build, pas au jugé.

Ce qu'il faut mesurer, formulé en questions plutôt qu'en compteurs — sinon on
collecte des chiffres qu'on ne relit jamais :
- **Le mode jeu est-il joué, et jusqu'où ?** (niveau atteint) — c'est ce qui
  décide si l'investissement de D2 est justifié.
- **Combien de gens passent le splash, et vers quel mode ?**
- **Le Mode Live est-il ouvert sur un vrai téléphone ?** — son capteur
  d'inclinaison n'a **jamais** été testé sur un appareil réel (blocage connu,
  §7.3) ; savoir si quelqu'un l'utilise change la priorité de ce test.
- **Quels presets sont chargés** (les 34 ne se valent sûrement pas), et
  **est-ce que les gens exportent** ?

Deux réserves à lever avant de brancher quoi que ce soit : les événements
personnalisés (au-delà des pages vues) ne sont pas tous inclus selon le plan
Vercel — à vérifier ; et une mesure d'audience strictement anonyme est
généralement dispensée de bandeau de consentement, mais **c'est à confirmer,
pas à supposer**.

### D4 — Ce qu'est vraiment le problème d'accessibilité

> « je n'ai pas compris ton point, il faut m'expliquer le pb »

Ma formulation était mauvaise : j'ai listé des attributs manquants
(`role="grid"`, `aria-pressed`…), ce qui décrit une **solution absente**, pas
un problème. Le problème, mesuré dans l'appli le 2026-08-16 plutôt que déduit
du code :

**1. La grille du séquenceur ne répond pas au clavier. Du tout.**
Les cases sont des `<button>` qui n'écoutent que `onpointerdown` /
`onpointerup` (`DrumRowView.svelte:109-112`). On peut donc atteindre une case
au Tab, mais :

| Touche | Ce qui devrait arriver | Ce qui arrive vraiment |
|---|---|---|
| `Entrée` | activer/désactiver la case | **rien** |
| `Espace` | activer/désactiver la case | **le morceau démarre** (raccourci global de lecture) |
| clic souris | activer/désactiver la case | ça marche |

Autrement dit : **sans souris ni écran tactile, on ne peut pas composer une
seule note.** Ça ne concerne pas que les lecteurs d'écran — ça concerne aussi
quiconque a une souris cassée, un trackpad qui lâche, ou l'habitude de tout
faire au clavier.

**2. Un lecteur d'écran n'entend rien d'exploitable.** Une case n'a aucun
texte, aucun `aria-label`, et son état (allumée/éteinte) n'est porté que par
une **classe CSS**, donc par une couleur. Compté sur l'onglet Rythme :
**0 case sur 23** a un libellé, **0 sur 23** annonce son état. Ce qu'entend
quelqu'un qui parcourt la grille : « bouton, bouton, bouton, bouton… », sans
jamais savoir laquelle est active. Le `title` (« Clic : activer/changer… ») est
le seul texte présent, il est identique partout et ne dit pas l'état.

**La décision à prendre n'est pas technique, elle est de périmètre** : est-ce
que « composer un rythme sans souris » fait partie de ce que l'appli promet ?
- **Si oui**, le minimum utile est petit — un `onclick` sur la case (qui
  récupère Entrée gratuitement), un `aria-label` du genre « Kick, pas 5,
  actif, rafale ×2 », `aria-pressed`, et régler le conflit d'Espace. C'est de
  loin le meilleur rapport effet/effort du sujet, et ça ne touche à rien
  d'autre.
- **Si non**, c'est un choix légitime pour un projet personnel — mais il doit
  être **écrit** ici, une fois, pour cesser de réapparaître comme une dette à
  chaque audit.

⚠️ **En attente** : cette réponse-là, uniquement. Il n'y a rien d'autre à
décider sur D4.

---

## Arbitrages (suite) et 3e lot de sujets — 2026-08-16

### D2 (suite) — « accès illimité pour vérifier mes modifications »

**Ça existe déjà, et c'est porté.** Le pseudo **`master`** (insensible à la
casse) donne tous les niveaux à 3★ et ne sauvegarde pas la progression —
`game.svelte.ts:124-128` et `:299`. L'original l'avait conçu exactement pour
ce besoin, en prenant soin de le faire retomber sur le déblocage des modules
« sans cas particulier à gérer ailleurs » : niveau au maximum ⇒ tout ouvert.
Il n'y a donc **rien à construire** pour le contournement, seulement à ne pas
l'oublier en posant le portail.

⚠️ **Un détail à ne pas rater** : le pseudo se saisit *dans le mode jeu*. Si
l'Atelier est masqué au départ, le chemin vers `master` doit rester
atteignable **avant** le verrou — sinon le contournement est lui-même
verrouillé. À prévoir dès la première ligne de code du portail.

### D2 (suite) — proposition de mécanique de déblocage

Demande : « le mode jeu pourrait permettre de découvrir un module sur un
niveau et d'en disposer dans l'atelier une fois le niveau complété. […] une
autre idée est d'utiliser les objets gagnés dans la besace pour acheter les
modules ? »

#### Sur la besace comme monnaie : je déconseille

Trois raisons, dont une qui tient au contenu déjà écrit :

1. **Ça tue la blague.** Les 31 objets sont drôles *parce qu'ils ne valent
   rien* : « une chaussette dépareillée », « un seau percé », « un ticket de
   caisse illisible pour un article inconnu » (lot de consolation). Leur
   donner un taux de change les transforme en jetons : une chaussette qui
   vaut 3 crédits n'est plus une chaussette inutile, c'est de la monnaie. Le
   seul contenu purement gratuit du jeu deviendrait utilitaire.
2. **Mécaniquement, c'est le même compteur avec une couche en plus.** Les
   objets sont distribués à la complétion (`grantItems`, `game.svelte.ts:288`)
   — leur nombre est donc une fonction du nombre de niveaux réussis.
   « Acheter avec des objets » et « débloquer au niveau N » expriment
   exactement la même chose ; la version monnaie coûte en plus une monnaie,
   une grille de prix et une boutique.
3. **Trois éléments d'UI permanents pour zéro information nouvelle** —
   l'inverse de la règle n°1 du §7.5.

**Ce qu'on peut garder de l'idée** : la besace comme **inventaire**, pas comme
porte-monnaie. Un écran qui montre à la fois les souvenirs absurdes et les
vrais acquis (« Swing », « Module synthé ») donne le sentiment de collection
recherché, sans prix ni transaction.

#### Proposition : débloquer des CONTRÔLES, pas seulement des modules

L'idée d'origine (celle du fichier de 2024) verrouillait trois gros blocs :
`{ drum: 1, synth: 13, general: 27 }`. Je propose plus fin, **parce que le
contenu existe déjà** : les 34 niveaux enseignent des notions nommées, et
l'Atelier a un contrôle pour presque chacune.

| Niveau | Ce qu'il enseigne | Ce qu'il ouvre dans l'Atelier |
|---|---|---|
| 1 | poser un rythme | l'Atelier lui-même (kick/snare/hat, lecture, tempo) |
| 2-10 | subdivisions, polyrythmie douce | le réglage « Pas » par ligne |
| 11 | **Rafale** | la rafale sur les cases |
| 12-13 | presets réels | **module Synthé** *(seuil de l'original)* |
| 14-18 | **Swing**, **Traîne** | les deux curseurs de groove |
| 20 | **Ghost notes** | le curseur ghost |
| 21 | **Fill** | fill + intensité |
| 23 | **Décalage par ligne** | le décalage |
| 24-32 | polyrythmie | subdivisions libres par ligne |
| 27 | — | **module Production/effets** *(seuil de l'original)* |
| 34 | tout combiné | **Mode Live** |

Trois raisons de préférer cette granularité :

- **Chaque déverrouillage est motivé.** On vient d'entendre ce que fait le
  swing ; on récupère le curseur qui le règle. Un module entier qui apparaît
  d'un coup n'a pas ce lien de cause à effet.
- **Ça ne demande aucun contenu nouveau** : le découpage est déjà écrit dans
  les titres et préambules des niveaux. C'est du câblage, pas de la création.
- **C'est aussi une réponse à la densité de l'interface** — et c'est le point
  le plus important. L'Atelier est chargé parce qu'il montre *tout à tout le
  monde, tout le temps*. Un débutant n'y verrait qu'une grille, un tempo et
  un bouton lecture. **Le déblocage progressif fait le travail que le §7.5
  réclame, sans rien supprimer pour ceux qui savent déjà.** Il recoupe
  directement le sujet « faire de la place dans le synthé » ci-dessous.

⚠️ **Ce qui reste à trancher** : est-ce que le verrou est *dur* (le contrôle
n'existe pas) ou *visible* (grisé avec « niveau 14 »)? Le grisé enseigne qu'il
y a une suite et donne envie ; le masquage tient la promesse « interface
simple ». Recommandation : **grisé pour les contrôles, masqué pour les
modules entiers** — un curseur grisé au milieu d'un panneau est une promesse,
une fenêtre entière grisée est une frustration.

### D4 — clos : périmètre téléphone

> « l'App est pour le moment testée uniquement sur téléphone, le mode
> ordinateur est en friche actuellement, on pourra y réfléchir plus tard. »

**Décision enregistrée.** Le clavier ne concerne que l'ordinateur : le sujet
part avec le chantier « desktop », pas avant. Il **sort de la dette ouverte**
et cesse de compter comme un item d'audit non traité.

Deux précisions honnêtes pour que la décision soit prise en connaissance de
cause, sans rouvrir le débat :

- **Une partie du problème n'est pas desktop.** VoiceOver (iOS) et TalkBack
  (Android) sont des lecteurs d'écran *de téléphone* : les 0 libellés sur 23
  cases les concernent aussi. Un `aria-label` par case reste utile sur la
  plateforme réellement visée — c'est trois lignes, à prendre en passant si
  on touche `DrumRowView`, pas un chantier.
- **L'état n'est pas uniformément nul** : `XpSlider` gère déjà les flèches
  (± un cran, ± dix crans) et porte `role="slider"`. C'est la grille qui est
  muette, pas l'appli entière.

### N1 — Choix des notes : le vrai coût, mesuré

> « simplifier grandement le choix des notes »

**Le choix d'une note se fait en tapant plusieurs fois sur la case.**
`cycleCell` (`SynthRowView.svelte:70-85`) fait défiler *silence → degré 1 → 2
→ … → 7 → silence*. Donc :

- poser un **degré 5** = **5 appuis** ; un degré 7 = 7 appuis ;
- **corriger** coûte plus cher que poser : passer du degré 6 au degré 3
  demande de traverser 7, silence, 1, 2 — **5 appuis de plus** ;
- une petite mélodie de 4 notes (3, 5, 1, 6) = **15 appuis**, sans compter les
  octaves ;
- l'octave se règle sur **deux boutons ▲▼ minuscules** qui n'apparaissent que
  sur les cases actives ;
- et la Nappe a le même défaut sur les accords.

C'est un choix **itératif** là où l'utilisateur pense **direct** : il ne veut
pas « avancer d'un degré », il veut « mettre un sol ». Toute correction repasse
par le silence.

**Proposition** : au lieu de faire défiler, ouvrir un **sélecteur** au contact
de la case — les 7 degrés en gros, l'octave, et le silence. Deux appuis
(ouvrir, choisir) au lieu de quatre en moyenne, et surtout **aucun coût de
correction**. C'est le motif « petit clavier de référence » qu'utilisent les
apps tactiles de référence (Auxy est la plus citée pour l'entrée de notes au
doigt), adapté à une grille de degrés plutôt qu'à un piano.

> « pouvoir ouvrir un pad depuis l'atelier pour jouer/enregistrer une mélodie
> qui s'inscrit dans la grille »

**Décision de Yann, qui remplace ma recommandation.** J'avais proposé de
loger le pad d'enregistrement dans le Mode Live (au motif que l'Atelier est la
surface saturée, règle A6). Yann tranche l'inverse : **le pad s'ouvre depuis
l'Atelier**. C'est cohérent avec son besoin — la grille est là, l'aller-retour
entre deux modes n'a pas de sens pour écrire une mélodie. La règle du §7.5
reste satisfaite si le pad est **un panneau qu'on ouvre**, pas une surface
permanente de plus.

> « sélectionner des notes, les dupliquer, les faire monter en même temps
> mais je ne vois pas du tout comment […] sur portable »

L'inquiétude est fondée : la multi-sélection tactile coûte cher (mode de
sélection, poignées, annulation) et c'est exactement le genre d'ajout qui
regonfle l'interface. **Il y a un raccourci qui donne 80 % du bénéfice pour
0 % du problème : les opérations sur la LIGNE ENTIÈRE**, sans sélection du
tout —

- **Transposer** la ligne de ±1 degré / ±1 octave ;
- **Dupliquer** la première moitié du cycle sur la seconde (le geste qui sert
  vraiment à faire un gimmick) ;
- **Décaler** le motif d'un pas, **inverser**, **vider**.

Aucune sélection, aucune poignée : des boutons dans le panneau « Séquence » de
la ligne. La vraie multi-sélection reste possible plus tard, si l'usage montre
qu'elle manque.

> « on peut questionner la pertinence du mode rafale »

**Défaut concret trouvé en vérifiant** : sur les lignes synthé, la rafale
n'est accessible que par `oncontextmenu` (clic droit) —
`SynthRowView.svelte:241`. Les lignes de batterie, elles, ont un appui long
(`pressStart`/`pressEnd`, `DrumRowView.svelte:110-112`). **Sur téléphone — la
seule plateforme testée — la rafale du synthé est donc de fait inatteignable**,
là où celle de la batterie fonctionne.

Recommandation nuancée plutôt qu'un oui/non : **garder la rafale sur la
batterie** (elle y est jouable, elle est enseignée au niveau 11, et elle fait
partie du vocabulaire rythmique), **et la retirer des lignes synthé** — ou la
ranger dans le futur sélecteur de note comme choix secondaire. Ça supprime un
état par case sur trois lignes, donc de la complexité dans chaque interaction.

### N2 — Bourdon et release : une seule question, « comment finit la note »

> « il faudrait que bourdon soit une des options du réglage de release. Revoir
> le release, on ne comprend pas les modes. »

État actuel, qui explique la confusion : la fin d'une note se règle à **trois
endroits différents** —
1. le curseur **Release** (0-4000 ms) ;
2. un menu **« Forme release »** avec deux options, *Naturelle* / *Linéaire*
   (`SynthRowView.svelte:319-324`) — ce sont ces « modes » qu'on ne comprend
   pas, et pour cause : c'est le choix entre deux courbes de rampe, une
   distinction de synthétiseur dont l'effet audible est ténu ;
3. et, pour la seule Nappe, une **pastille « Bourdon »** avec son panneau et sa
   case à cocher.

L'idée de Yann est juste : ces trois choses répondent à **une seule question**.
Proposition — un contrôle unique, « Fin de la note », à crans nommés :
**Sec · Court · Long · Très long · Tenu (bourdon)**. Le bourdon devient le
dernier cran, la pastille « Bourdon » et son panneau disparaissent (une
pastille de moins sur la Nappe, un panneau de moins), et les menus de forme
quittent l'interface.

⚠️ **À savoir avant de coder : ça unifie l'UI, pas le moteur.** Le bourdon
n'est pas un release long, c'est un **chemin de code distinct** —
`syncDroneMode` / `updateDrone` / `stopDrone` (`scheduler.ts`, `voices/synth.ts`)
tiennent UNE voix qui *glisse* d'un accord à l'autre sans jamais réattaquer.
Le dernier cran bascule donc de chemin ; il ne pousse pas un curseur au
maximum. Les champs v2 (`release`, `releaseCurve`, `padDroneEnabled`) restent
tous, comme pour Brillance/Mouvement.

### N3 — Tempo : la cause est un seul caractère

> « on le règle un peu partout, c'est bizarre et pas cohérent. Il faudrait
> qu'on puisse le régler à l'unité »

**Pourquoi on ne peut pas le régler à l'unité** : le curseur de l'Atelier est
déclaré `step={10}` (`AtelierView.svelte:453`), et `XpSlider` **arrondit toute
valeur au cran**, y compris une valeur tapée au clavier
(`XpSlider.svelte:72`). Taper « 123 » donne donc 120. Correctif : `step={1}`.

**Pourquoi ça semble incohérent** : le tempo se règle en réalité à deux
endroits seulement (le bandeau de l'Atelier, et le Mode Live), plus le Tap.
Mais **les deux ne se comportent pas pareil** : le Mode Live fait déjà ±1 BPM
à l'unité (`LiveView.svelte:420`). Ce n'est donc pas le nombre d'endroits qui
gêne, c'est que le même réglage n'obéisse pas aux mêmes règles selon l'écran.
Les aligner sur l'unité règle les deux griefs d'un coup.

### N4 — Audit des DAW comparables

Demande : « quelles sont daw similaires ? quelles sont leurs visuels ? »

⚠️ **Recadrage à acter avant de lancer l'audit.** `CLAUDE.md` pose que le
design XP est l'identité du projet, pas un héritage à moderniser. Un audit qui
revient avec « voilà à quoi ça ressemble ailleurs » produira des références
inutilisables. **Ce qu'on peut emprunter, ce sont les INTERACTIONS**, pas les
visuels : comment on saisit une note au doigt, comment on choisit un son,
comment on navigue entre les pistes sur un écran de téléphone.

Premières références, à confirmer par l'audit :
- **Dans le navigateur, proches du projet** : orDrumbox, drumbit, Shuffle
  Drummer, BAP Studio, SEQ-16, ButtonBass Beat Maker. Utiles surtout pour
  comparer *l'entrée dans l'outil* (que voit-on à la première seconde).
- **Tactile, pour l'écriture de notes** : Auxy est la référence citée pour un
  piano roll pensé pour le doigt plutôt que porté de l'ordinateur ; les motifs
  qui reviennent sont le petit clavier de référence jouable à côté de la
  grille, et l'appui-glissé pour poser puis ajuster la hauteur.
- **Grooveboxes matérielles** (pour la logique de pas et de pattern) : la
  famille Pocket Operator / EP-133, Novation Circuit.

Contrainte à garder en tête pendant l'audit : **il n'y a pas de clic droit ni
de survol sur téléphone**, et c'est déjà ce qui coûte la rafale du synthé
(N1). Toute solution empruntée à un logiciel de bureau doit passer ce test.

### N5 — Synthé : faire de la place, comme sur la batterie

> « il faut faire de la place comme pour la drum »

Le travail équivalent sur la batterie (audit A4 : pastilles au lieu de
`<fieldset>`) est déjà fait sur le synthé — mais le synthé garde **plus de
panneaux** (Séquence, Oscillateur, Détune, Filtre & espace, plus Arpégiateur
et Bourdon sur la Nappe) et un **bloc global** au-dessus. Les trois pistes de
Yann, avec mon avis :

> « questions de l'intérêt des presets de ligne de synthé ? »

**Je recommande de les garder** — 16 voix au total (5 basse, 6 nappe, 5
mélodie : « 808 profond », « Rhodes chaud », « Pluck trap »…). Ce sont
l'inverse d'un encombrement : **un seul menu qui remplace trois panneaux de
curseurs**. Pour quelqu'un qui découvre, choisir « Rhodes chaud » est
exactement ce qu'on veut qu'il fasse plutôt que d'ouvrir Oscillateur.

Leur vrai défaut est ailleurs : **c'est un contrôle qui écrit sans jamais
lire.** Une fois un curseur touché, le menu continue d'afficher la voix
choisie alors que le son a changé — il ne dit jamais où on en est. C'est ça
qu'il faut corriger, pas les supprimer. (Et ils se marient bien avec le
déblocage progressif : tant qu'Oscillateur/Détune ne sont pas ouverts, la voix
est le seul réglage de timbre — l'interface simple sort toute seule.)

> « choix de la tonalité et du nombre d'accord à descendre ? »
> « remplissage aléatoire : à descendre ligne par ligne uniquement dans la
> sous-section séquence »

Les deux vont dans le même sens et sont cohérents avec A6 (chaque commande
sur une seule surface) : le bloc global du haut (`SynthModule.svelte`) porte
aujourd'hui Tonalité, Nb d'accords, Taux de remplissage, un 🎲 global **et**
un 🎲 par ligne (l. 47-69). Faire descendre le 🎲 dans le panneau « Séquence »
de chaque ligne supprime la duplication (le 🎲 par ligne existe déjà en haut,
loin de la ligne qu'il remplit) et rapproche la commande de son effet.

> ⛔ **Abandonné par Yann le 2026-08-19**, demande jugée obsolète. Le 🎲 par
> ligne reste dans « Harmonie & remplissage ». L'analyse ci-dessus est conservée
> parce qu'elle documente le raisonnement A6 (chaque commande sur une seule
> surface) qui vaut toujours pour d'autres commandes — mais ce cas-là est clos.

⚠️ **Une nuance sur la tonalité et le nombre d'accords** : contrairement au
remplissage, ce ne sont **pas** des réglages de ligne — ils gouvernent
l'harmonie des **trois** lignes à la fois (`chordsFor`, `padChordAtBarPosition`).
Les descendre *dans* une ligne serait mentir sur leur portée. Ce qu'on peut
faire : les descendre **sous** le séquenceur (comme le tempo, déplacé sous la
grille au 2ᵉ lot) plutôt que dans une ligne — ils restent globaux, mais ils
cessent d'occuper le haut de l'écran.

### Où ça se range dans la file

Ces sujets ne rentrent pas tous au même endroit :

- **Rejoint la file exécutable** (aucune décision requise) : `step={1}` sur le
  tempo (une ligne) ; les 🎲 descendus dans les panneaux Séquence ; la
  correction du menu de voix qui n'affiche pas l'état réel.
- **Rejoint le chantier « synthé lisible »** (déjà en file avec R1 + B8) : le
  sélecteur de note, le retrait de la rafale synthé, « Fin de la note ».
- **Dépend de D2** : tout le déblocage progressif — et c'est lui qui rend les
  deux points précédents plus faciles, pas l'inverse.
- **Chantier neuf à cadrer** : l'audit DAW (recadré sur les interactions), et
  le pad d'enregistrement dans l'Atelier.
- ⚠️ **Attend encore un arbitrage** : verrou dur ou grisé (D2), et la grille
  de déverrouillage proposée ci-dessus — à valider ou corriger.

---
