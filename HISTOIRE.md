# HISTOIRE — Mode carrière « Personne d'autre »

> Bible narrative du Mode jeu. Écrite le 2026-08-22 à partir des idées de Yann :
> *« un label a perdu tous ses artistes / le perso est l'assistant qui fait
> uniquement le café / le label ne sait pas vers qui se tourner / le perso doit
> apprendre puis faire la batterie, pareil pour les autres modules / il doit
> faire des commandes spécifiques (ex. boom bap) / il y a des accomplissements :
> faire son EP, faire un live. »*

⚠️ **Rien n'est codé, rien n'est arbitré.** Ce document dit ce que le jeu
RACONTE ; `PLAN.md` § « Architecture du Mode jeu » dit ce qu'il FAIT. Les deux
se répondent volontairement : l'histoire ci-dessous n'invente aucun mécanisme
qui n'existe pas déjà ou qui n'était pas déjà proposé là-bas. Elle sert à
répondre à la question 2 restée ouverte — *combien de fiction ?*

---

## 1. Le pitch, en cinq lignes

Rossignol Records a signé quatorze artistes en trente ans. Il en reste zéro.

Au troisième étage, au-dessus d'une laverie, il reste une patronne qui n'a plus
personne à enregistrer, une console qui marche encore, une date de sortie déjà
imprimée sur une affiche — et toi, embauché pour faire le café.

Il n'y a personne d'autre.

**Le thème, en une phrase :** *« il n'y a personne d'autre »* n'est pas une
plainte, c'est une distribution des rôles. Le label ne cherche plus un sauveur,
il en fabrique un.

---

## 2. Pourquoi le café — le pont entre la fiction et la mécanique

C'est le point qui fait tenir tout le reste, et il vaut la peine d'être écrit
avant les personnages.

Un assistant qui ne sait « rien faire » ne peut pas devenir producteur dans un
jeu qui prétend enseigner l'oreille : ce serait un tour de magie. Sauf que le
café n'est pas rien. **C'est un dosage et une durée** — 18 grammes, 25 secondes.
Le personnage sait déjà mesurer le temps sans regarder l'horloge, il ne sait
simplement pas que ça porte un nom.

> **Sol** — « Tu comptes vingt-cinq secondes sans montre, dix fois par jour,
> depuis six mois. Ça a un nom, ce que tu fais. Monte. »

Tout le jeu tient dans ce déplacement : le geste est déjà là, on lui met un
nom, puis un haut-parleur au bout. C'est aussi exactement ce que font les trois
verbes de paramètre (`lequel` → `nommer` → `regler`, `src/model/exercises.ts`) :
entendre une direction, la nommer, la viser. **La fiction ne décore pas la
pédagogie, elle la répète.**

---

## 3. Le décor

### Rossignol Records — troisième étage

Le nom est une blague que personne au label ne trouve drôle : un rossignol
chante, et un *rossignol* est aussi un stock invendu qui dort en réserve. Les
deux sens ont servi, dans cet ordre.

Un couloir, un bureau, deux studios. Le studio A marche. Le studio B est fermé
depuis le départ d'Ambre et sert de débarras. Sur le mur du bureau, des cadres —
c'est là que se pendent les accomplissements (§ 7).

### La laverie Lav'Azur — rez-de-chaussée

Le meilleur outil du jeu est en bas, et il n'appartient pas au label. La laverie
sert **trois fois**, et jamais en décor :

1. **L'essorage à 1 200 tours est le premier métronome.** L'acte 0 s'y déroule :
   on apprend la pulsation sur une pulsation qui existe déjà dans le bâtiment,
   pas sur un clic sorti de nulle part.
2. **Le haut-parleur de plafond est le test de mix.** C'est la « voiture » du
   pauvre : un boomer de huit centimètres, saturé, dans une pièce carrelée. Si
   ça marche là, ça marche partout. L'acte 3 s'y joue, et il est **mesurable** —
   l'analyseur est déjà branché sur `finalGain`, l'export produit déjà un buffer
   hors ligne (voir PLAN.md, « le check de mix est réellement faisable »).
3. **L'arrière-salle est la salle de concert.** Trente personnes, deux
   enceintes, Rachid qui coupe les machines pour l'occasion. C'est la release
   party de l'acte 6, et le Mode Live y trouve enfin l'usage narratif qu'il
   attendait.

---

## 4. Les personnages — trois, et c'est un plafond

Le risque identifié dans PLAN.md est réel : une distribution large, ce sont des
semaines d'écriture et un ton qui se dilue. **Trois personnages nommés, un
absent, et le joueur.** Pas de quatrième.

### Solange Barrault, dite « Sol » — la patronne

Fondatrice, ex-ingénieure du son, la soixantaine. Elle ne fait plus de musique :
elle écoute. C'est **la voix des roasts, qui existe déjà** (`presets/gameData.ts`)
et qui est bonne — on ne l'invente pas, on lui donne un visage. Tutoiement,
ironie sèche, jamais de méchanceté gratuite.

⚠️ **Règle de ton, la plus importante du document : Sol ne félicite pas, elle
confie.** « Bravo » est gratuit et ne veut rien dire au bout de trois fois. La
récompense, chez elle, c'est du travail plus sérieux : elle te laisse toucher la
console, elle te passe une commande d'un client, elle te donne la clé du studio
B. Le joueur mesure sa progression à ce qu'on lui confie, pas à ce qu'on lui
dit. Ça coûte zéro ligne d'écriture supplémentaire et ça règle le problème de
tous les jeux qui applaudissent tout.

**Le seul geste sentimental du jeu, et il est gratuit :** Sol t'appelle « le
café ». Pendant trois actes. Puis un jour elle t'appelle par ton nom d'artiste
— celui que le joueur a choisi. Il n'y a rien à écrire pour ça : c'est une
variable qui change de valeur.

### Rachid Bouzid — la laverie, l'oreille du dehors

Patron de Lav'Azur. Aucune compétence musicale, aucun vocabulaire, et c'est
précisément sa fonction : **il ne dit jamais si c'est bien, il dit ce que ça
fait.** « On entend rien. » « Ta caisse claire, elle pique. » « Ça fait vibrer
la vitrine. » Un retour physique, jamais un jugement de goût — ce qui le rend
mesurable, donc notable, sans que la machine ait à avoir un avis.

Il est aussi le premier client (l'acte 2 est une commande de sa part) et le
premier public.

### Ambre — celle qui est partie, et qui ne revient pas

La dernière artiste du label. **Elle n'apparaît jamais.** Il reste ses affaires
dans le studio B : des cassettes, des post-its, des boucles inachevées. C'est le
professeur fantôme — l'acte 4 (le groove) s'apprend sur ses bandes, parce que
c'est là qu'on entend *pourquoi* ce qu'elle jouait respire et pourquoi ce que tu
poses est carré.

⚠️ **Elle ne revient pas au dernier acte.** C'est une tentation évidente et
c'est le mauvais ending : il rendrait toute la campagne provisoire, un
remplacement en attendant le retour du titulaire. Le jeu dit l'inverse.

### Toi — l'assistant

Sans réplique, sans visage, sans genre assigné. Le joueur choisit un pseudo
(**le champ existe déjà** dans le Mode jeu) et, à l'acte 5, un nom d'artiste.
Le personnage ne parle jamais : il joue, et c'est sa seule façon de répondre.

---

## 5. La règle d'écriture — l'afficheur LCD est le budget

Ce n'est pas une contrainte esthétique, c'est ce qui rend l'histoire livrable.

> **Si ça ne tient pas sur un afficheur LCD ou sur un post-it, ce n'est pas dans
> le jeu.**

La skin Winamp donne des bandeaux verts d'une ligne, en petites capitales
espacées : une quarantaine de signes (à mesurer sur l'écran réel, pas à
supposer). Sol communique par post-it collés sur la machine et par le bandeau.
Aucune cinématique, aucun pavé de texte, aucun dialogue à embranchements.

**Budget total visé : ~130 lignes**, et il est chiffré acte par acte au § 6.
Une bible qui ne chiffre pas son coût d'écriture est une bible qui ne sera
jamais écrite.

---

## 6. L'arc — sept actes, quatre modules

Les quatre modules verrouillés s'ouvrent **parce qu'un acte en a besoin**, pas
parce qu'un compteur atteint un seuil. Les trois autres actes n'ouvrent rien —
c'est ce qui les rend bon marché : ils n'ont aucune dette mécanique à payer.

| Acte | Titre | Ce qu'on apprend | Verbes | Ouvre |
|---|---|---|---|---|
| 0 | **Le café** | la pulsation, et ton oreille dans cette pièce | `jouer`, `lequel` | — |
| 1 | **Le beat** | kick / snare / hat, la grille | `reproduire`, `completer` | **Atelier** |
| 2 | **La commande** | il faut une ligne, pas qu'un rythme | `regler`, `nommer` | **Synthé** |
| 3 | **Le bas de l'immeuble** | filtre, espace, et un mix qui sort du studio | `nommer`, `regler` | **Production** |
| 4 | **Les bandes d'Ambre** | swing, traîne, ghost, humanisation | `intrus`, `completer` | — |
| 5 | **L'EP** | choisir, finir, assumer | (composition) | — |
| 6 | **La sortie** | jouer devant quelqu'un | `jouer` | **Mode Live** |

### Acte 0 — Le café *(≈ 12 lignes)*

Rien n'est ouvert. La laverie tourne. Sol te fait taper sur la table en même
temps que l'essorage.

⚠️ **C'est le calibrage de latence qui devient une scène** (`ui/game/latence.svelte.ts`).
Aujourd'hui c'est un réglage technique que personne n'ouvre ; là, c'est
diégétique : *on règle ton oreille sur la pièce*. Le jeu gagne un prologue, et
le calibrage gagne 100 % de taux de passage. C'est la meilleure affaire du
document — et le point à valider en premier (§ 10, question 2).

Fin de l'acte : tu poses deux mesures justes. Sol : « Bon. Tu montes. »

### Acte 1 — Le beat *(≈ 25 lignes)*

Sol sort un disque de l'étagère. **Les 34 presets sont l'étagère** — chacun
porte déjà un paragraphe `history` (`presets/songs.ts`) qui n'a jamais servi
qu'à deux choses. Ils deviennent la couche culture : *écoute ce qu'est ce
style* → *repique-le* → *maintenant fais le tien*.

C'est là que la campagne des 34 niveaux existants trouve sa place : **la salle
de répétition**, pas le chemin obligé. Un joueur qui entend déjà passe au brief ;
un autre va s'entraîner.

Fin : ton premier beat validé sur un brief. Cassette n°1 sur le mur. L'**Atelier**
s'ouvre parce que tu en as besoin pour le faire, pas en récompense.

### Acte 2 — La commande *(≈ 20 lignes)*

Rachid veut un jingle pour la laverie. Douze secondes. « Un truc qui reste dans
la tête. » Un rythme ne reste pas dans la tête — **il faut des notes**, donc le
**Synthé**.

Le motif est celui de tout le milieu de jeu : *le module s'ouvre parce que la
commande est impossible sans lui.* Plus aucun nombre à justifier.

### Acte 3 — Le bas de l'immeuble *(≈ 20 lignes)*

Le morceau est parfait au studio A. En bas, sur le plafonnier, il n'existe pas.
« On entend rien. » Filtre, réverbe, delay, et un **check de mix mesuré** sur le
rendu final (bandes d'énergie, dynamique) — pas une opinion. La **Production**
s'ouvre ici.

C'est aussi l'acte où l'idée la plus riche de la partie « marketing » atterrit
sans devenir un tableur : **le public change la contrainte de mix, jamais le
jugement de goût.** Un club ne juge pas le kick comme un casque.

### Acte 4 — Les bandes d'Ambre *(≈ 20 lignes)*

Studio B, la clé, les cassettes. Ce qu'elle jouait n'est pas sur la grille, et
c'est ça qui manque à ce que tu poses. Swing, traîne, ghost notes, fills.

⚠️ **`intrus` trouve ici son cadre diégétique** : une des quatre mesures du
master est fausse, laquelle ? Le contrôle qualité, pas une devinette. Et le
verdict d'essai de Yann est respecté — l'intrus exige un rythme un peu complexe,
les bandes d'Ambre en sont l'excuse parfaite.

Rien ne s'ouvre. C'est l'acte le plus court à écrire et probablement le plus
beau : tu apprends de quelqu'un qui n'est plus là.

### Acte 5 — L'EP *(≈ 20 lignes)*

Quatre titres, dont trois sur commande et un libre. **L'appli fabrique l'objet
réel** — export MP3 reproductible, partage par URL — donc « tu as sorti un EP »
n'est pas une métaphore.

Ici et seulement ici : le titre, la pochette, le nom d'artiste, et **le choix du
single par le joueur**. C'est de l'auto-évaluation, pas un jugement de machine :
écouter son propre travail d'un point de vue critique est la seule chose qu'aucun
exercice ne fait faire.

**La notation porte sur le brief, jamais sur le goût** : tempo dans la fourchette,
lignes exigées actives, densité minimale, module récemment ouvert effectivement
utilisé, durée. Sol commente le reste — elle n'en tire aucune étoile.

### Acte 6 — La sortie *(≈ 15 lignes)*

Arrière-salle de la laverie. Rachid coupe les machines. Trente personnes. Tu
joues ton morceau en **Mode Live**, en entier, sans décrocher.

**Épilogue :** le lendemain, quelqu'un de nouveau est embauché. Il ne sait rien
faire. Il fait le café. Tu le regardes doser dix-huit grammes en vingt-cinq
secondes sans regarder l'horloge.

C'est la fin, et c'est aussi la porte du studio libre : le jeu se termine sur le
geste par lequel il a commencé.

---

## 7. Les accomplissements — le mur du bureau

⚠️ **La besace et le mur ne sont pas la même chose, et il ne faut surtout pas
les fusionner.** La besace (`BAG_ITEMS`, 31 objets absurdes) est du *bruit* :
elle récompense la présence, elle est drôle, elle ne veut rien dire — c'est son
métier. Le mur est de la *mémoire* : il ne se remplit que de choses qui ont
demandé quelque chose. Un jeu qui met la chaussette dépareillée et le premier EP
dans la même vitrine n'a plus ni l'un ni l'autre.

Les cadres du bureau, dans l'ordre où ils se remplissent :

| | Cadre | Comment |
|---|---|---|
| ☕ | **Vingt-cinq secondes** | acte 0 terminé — ton oreille est réglée sur la pièce |
| 🎞️ | **La première cassette** | premier beat validé sur un brief |
| 📼 | **Le repiquage** | cinq disques de l'étagère repiqués |
| 🧾 | **Dans les clous** | une commande livrée sans rien rater du brief |
| 🔊 | **Le test de la laverie** | un mix qui passe sur le plafonnier |
| 🎚️ | **La main sur la console** | les cinq familles de paramètres à 3 étoiles |
| 👻 | **Ce qu'elle jouait** | l'acte 4, en entier |
| 💿 | **L'EP** | quatre titres exportés |
| 🎤 | **La release** | un live joué en entier sans décrocher |
| 🐦 | **Le rossignol** | les 34 disques de l'étagère repiqués |
| 🪑 | **Personne d'autre** | la campagne terminée |
| ☕ | **Le nouveau** | l'épilogue |

Chaque cadre porte **une ligne de Sol**, dans le ton des roasts existants — soit
douze lignes en tout. Exemples :

> 🎞️ *« Première cassette. Elle est moche. Elles sont toutes moches, les
> premières. Garde-la. »*
>
> 🔊 *« Ça passe sur un haut-parleur de huit centimètres dans une pièce
> carrelée. C'est plus dur que ça en a l'air, et non, je ne te félicite pas. »*
>
> 🪑 *« Trente ans que je fais ça. T'es le quinzième. Assieds-toi. »*

---

## 8. Les commandes — le cœur du milieu de jeu

Une commande, c'est **un client, une contrainte vérifiable, et une contrainte de
goût qui ne compte pas**. Les 34 presets fournissent la matière ; le
`history` de chacun fournit le brief.

| Client | Commande | Vérifiable | Non noté (Sol commente) |
|---|---|---|---|
| Rachid | jingle Lav'Azur | ≤ 12 s, une ligne mélodique active | « ça reste dans la tête ou pas » |
| Un pote DJ | boom bap 90s | 88-95 BPM, swing 6-12, kick sur 1 et 3, rien sous la double-croche | le choix des sons |
| Un mariage | amapiano | 108-115 BPM, traîne marquée, basse tenue | l'énergie |
| Une salle | techno minimale | 128-132, four-on-the-floor, densité mini | l'hypnose |
| Une pub locale | dembow | 92-98, motif tresillo présent | — |
| Le studio B | « comme Ambre » | swing > 0, ghost notes actives, humanisation | tout le reste |

**Pourquoi ça marche :** le joueur compose (il ne recopie pas), et la machine
n'a d'avis que là où elle peut mesurer. La reconstruction du preset devient
l'*étude* qui précède la commande, pas la commande elle-même.

---

## 9. Ce que l'histoire refuse

Chacun de ces refus a une raison, et la raison n'est pas le goût.

- **Pas de monnaie, pas de streams, pas d'abonnés.** Des chiffres qui montent
  sans rapport avec ce qu'on a fait transforment un jeu sur l'oreille en
  tableur. La besace couvre déjà la récompense, à coût nul et avec le bon ton.
- **Pas de dialogues à embranchements.** Des semaines d'écriture, un ton dilué,
  et une combinatoire à tester.
- **Pas de game over, pas de renvoi.** On ne peut pas te virer : il n'y a
  personne d'autre. Seule la voix de Sol change.
- **Pas de retour d'Ambre.** § 4.
- **Pas de voix enregistrée.** L'appli n'a pas de moteur de dialogue, et le seul
  son qu'elle produit est celui que le joueur fabrique.
- **Pas de scénario qui enferme l'outil.** L'Atelier est le but, pas la
  récompense. Le mode carrière est le chemin *par défaut* ; un studio libre
  reste toujours atteignable, sinon on perd exactement les gens venus faire des
  beats.

---

## 10. Ce que ça engage côté code — et ce qui n'est PAS décidé

Aucune ligne n'est écrite. Points de contact identifiés, pour la session qui
implémentera :

- `src/model/unlocks.ts` — les quatre seuils numériques (`atelier: 2`,
  `synth: 13`, `production: 27`, `live: 34`) deviennent quatre actes. ⚠️ La
  sémantique du seuil et le cas `master` sont documentés et testés là-bas : les
  lire avant d'y toucher.
- `src/model/presets/gameData.ts` — **les roasts ne se jettent pas**, ils
  deviennent la voix de Sol. C'est un personnage déjà écrit et déjà bon.
- `src/model/presets/songs.ts` — le champ `history` devient la fiche de
  l'étagère. Aucune donnée à ajouter, juste à afficher.
- `src/ui/game/latence.svelte.ts` — le calibrage devient l'acte 0.
- `src/stores/game.svelte.ts` — `PlayerProgress.level`, l'entier unique, reste
  le vrai blocage technique (PLAN.md : compétences / accès / motivation dans un
  seul nombre). L'histoire ne le règle pas, elle explique juste pourquoi il faut
  le casser.

### Les questions qui restent, avec ma recommandation

1. **Le décor et les noms** — Rossignol Records, Sol, Rachid, Ambre, Lav'Azur.
   *Recommandation : les garder, ils sont écrits pour être remplaçables par un
   chercher/remplacer si un seul ne te plaît pas.*
2. **Le calibrage devient l'acte 0** — ⚠️ le vrai risque : un joueur qui
   entre par le studio libre n'a jamais fait le prologue, donc n'est pas
   calibré. *Recommandation : oui pour l'acte 0 diégétique, et le calibrage
   reste accessible seul depuis les réglages — la scène est une porte
   supplémentaire, pas la seule.*
3. **Sept actes au lieu des cinq titres de PLAN.md** — les quatre déblocages
   tombent toujours sur quatre actes, j'ai ajouté un prologue et deux actes qui
   n'ouvrent rien. *Recommandation : oui, ce sont les deux moins chers à écrire
   et les deux plus utiles au ton.*
4. **La première tranche livrable** — inchangée par rapport à PLAN.md : acte 0
   + acte 1 seulement (le modèle de compétences, la migration des sauvegardes,
   l'écran « EP en cours », le premier brief, l'Atelier ouvert par le récit).
   *Recommandation : oui, et rien de plus tant que ça n'a pas été joué.*
