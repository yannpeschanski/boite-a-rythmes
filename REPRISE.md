# Reprise — brief de session

> À lire en premier, avant `PLAN.md` (le journal des livraisons du Mode jeu ;
> ceci en est la carte, et `docs/plan/` porte les archives d'avant). `CLAUDE.md` reste la source des règles.
>
> Dernière mise à jour : 2026-09-17 — ✅ **Abandonner fait passer à la suite.**
> Yann : *« on n'est pas censé passer à la suite, on doit persévérer… mais pour
> tester, ça facilite énormément de parcourir les niveaux, donc il faut conserver
> cette fonctionnalité — et ça vaut pour les exercices en atelier »*. C'est un
> **renversement assumé** de son arbitrage de la veille (carte A5). Le Mode jeu
> le faisait déjà (`giveUp` puis « Continuer ▸ ») ; le cahier de l'Atelier non —
> encore une règle à deux domiciles. `abandonnerCommande` avance donc le récit,
> **sauf en répétition** (même carve-out que `livrerCommande`), et le bouton le
> DIT : « Laisser tomber (0★) ▸ ».
> ⚠️ **Le prix est écrit et testé** : ni étoile, ni production — donc un cahier de
> CHAÎNE qui repart d'une livraison manquante s'ouvre sur un Atelier VIDE et peut
> devenir insatisfaisable. Pas un mur (l'abandon reste la sortie à chaque étape),
> mais c'est ce qui fait qu'abandonner ne remplace pas de travailler.
> ⚠️ `tests/abandon-passe.test.ts` porte la RAISON du choix, pour qu'un
> renversement futur sache quoi réécrire. **A5 est répondue : plus aucune carte
> ouverte dans `docs/relecture/retour-carriere.html`.**
>
> Avant cela, le même jour : ✅ **Le triolet est à 33, pas à 50.**
> Yann : *« un swing entre 30 et 55, ça me semble toujours très élevé »* — il
> avait raison, et `CLAUDE.md` portait le faux chiffre (que je venais de lui
> répéter). Mesuré en rejouant le scheduler : le contretemps tombe à
> `(1 + swing/100) / 2` de sa paire, donc 33 = triolet (1,99:1), 45 = 2,63:1,
> 50 = 3:1, 75 = 7:1. Toute la fourchette du garage était bâtie sur l'erreur :
> **25-40** maintenant (et non 30-55), preset **33** (et non 45).
> ⚠️ **Personne ne pouvait le voir : aucun test ne regardait OÙ tombe le
> contretemps** — `feel-ecrit` vérifie seulement QUE les pas impairs bougent,
> vrai à n'importe quelle échelle. `tests/swing-echelle.test.ts` verrouille
> maintenant le triolet, la monotonie, et qu'aucun des 34 presets ne le dépasse.
> ⚠️ Deux autres chiffres faux au même endroit : le preset `swing` est à 33 (pas
> 60). Et le test « le libellé dit la fourchette » recopiait 30 et 55 en dur —
> il balaie désormais la course pour trouver les bornes réelles.
> ⚠️ **A4 est donc RÉPONDUE par la mesure** : borner l'outil reste inutile, mais
> c'est la FICHE qui était mal réglée, pas l'intuition de Yann.
>
> Avant cela, le même jour : ✅ **Sauter à une scène, et s'arrêter à
> la fin du morceau.** Les deux frictions que j'avais signalées en livrant le
> bouton ÉCOUTER. Le saut est sur le **NUMÉRO** de la scène (la rangée porte
> déjà six interactifs — un clic dessus ferait un interactif dans un
> interactif), et un seul chemin sert « partir de là » et « sauter là ».
> ⚠️ **L'arrêt vit dans l'Atelier, pas dans `ui/chaine.ts`** : le Mode Live
> BOUCLE toujours, et y mettre la règle couperait le concert au milieu du set.
> Un test garde l'invariant avec sa raison. ⚠️ Et l'arrêt ne se fait pas dans la
> file du moteur (le tick continue après `apply()`) : un drapeau, et la frame
> suivante coupe.
> ⚠️ **La mesure m'a évité une exception que j'allais revendiquer** : le numéro
> faisait 10,8 × 12 px, et j'étais prêt à l'écrire comme quatrième exception au
> 44 px. La rangée fait 312 px et le champ est plafonné à 24ch — les 44 × 44 ne
> coûtaient rien. Ma sonde était aussi trop indulgente (`e.contains(el)` rendait
> vrai sur le PARENT) ; resserrée, elle accuse.
>
> Avant cela, le même jour : ✅ **Une chaîne s'écoute depuis
> l'Atelier.** Bouton ▶ ÉCOUTER dans le panneau de montage : c'était l'option
> que j'avais chiffrée comme du code neuf, et le seul geste musical du jeu sans
> retour immédiat. ⚠️ **Ce qu'on entend a désormais UNE définition**
> (`src/ui/chaine.ts`) que le Live et l'Atelier partagent — la frontière est
> audible / visible, le Live garde ses voyants. ⚠️ Il n'y a qu'un motif dans
> l'appli, donc lire la chaîne charge les lettres par-dessus l'établi : le
> travail en cours est mis de côté et **rendu à l'arrêt par les trois chemins**
> (bouton, ⏹, sortie de vue), et le calque est relâché — sinon l'Atelier reste
> muet sans rien dire. Mesuré dans le navigateur : la chaîne avance vraiment, la
> bonne lettre joue, le motif revient intact.
>
> Avant cela, le même jour : ✅ **L'acte 6 apprivoise le module de
> montage.** Sixième type d'étape (`EtapeMontage`) : un montage par morceau —
> COUPLET / REFRAIN, A B B′, RONDO — le même crescendo que les boucles, parce
> que le rondo est le seul modèle qui demande trois matières. Le jeu RANGE les
> lettres, le joueur MONTE, et **on monte sans entendre** (une chaîne ne se joue
> que dans le Mode Live, fermé jusqu'au concert) : les deux ont été posés en
> question avant de coder. Le rappel du 14 juin passe de BOUCLE à **CLUB**, seul
> montage à relief qui tienne sur une lettre.
> ⚠️ Trois défauts trouvés en MESURANT : le nom du modèle était vert (le vert dit
> « fait »), on atterrissait sur le mauvais onglet, et **trois textes de l'onglet
> Production nommaient le Mode Live** alors qu'il est fermé — l'étape y envoie
> désormais à coup sûr.
> ⚠️ Et `verrous-masques.cjs` avait deux angles morts : il ne relisait que
> l'onglet ouvert (d'où les trois fuites), et son garde-fou de productions était
> périmé **et muet** (alertes indentées, filtre en `startsWith`). Corrigés, plus
> la ligne fautive désormais rapportée.
>
> Avant cela, le même jour : ✅ **Le disque de l'acte 6 va crescendo :
> 2, 2, 3.** Il livrait neuf boucles, trois par morceau — la même forme trois
> fois. Les deux premiers morceaux s'arrêtent maintenant au REFRAIN, seul « celui
> que personne n'attend » monte jusqu'au pont : **sept boucles**. Un couplet
> suivi d'un refrain est déjà un morceau, et le récit le dit. Deux pièges payés :
> la LEÇON du pont a dû descendre avec lui (sinon on explique un geste que plus
> rien ne demande pendant deux morceaux), et le commentaire qui justifiait la
> PHRASE du premier couplet citait son pont — sans pont c'est son refrain qui la
> porte, la contrainte ne bouge pas mais sa raison écrite devait suivre. Le test
> du crescendo n'affirme pas « 2, 2, 3 » : il vérifie que la courbe ne redescend
> jamais et que le maximum est le DERNIER morceau, sinon « 3, 2, 2 » passerait.
> Rejoué en entier : 19 étapes à l'acte 6, 7/7 boucles au set de l'acte 7,
> 15 productions, aucune fuite de verrou.
>
> Avant cela, le 16 : ✅ **Les actes 6 et 7 échangent leurs
> rôles.** L'acte 6 PRÉPARE ses neuf boucles sans jamais montrer le Mode Live (sa
> scène est devenue un écran de récit, au passé), et c'est l'acte 7 qui OUVRE le
> mode : son set joue les trois morceaux, son rappel le jingle. Ça défait
> l'arbitrage du 2026-09-14 (« on ne découvre pas sa console sur scène ») et Yann
> a tranché pour — mesuré, l'ancienne scène de l'acte 6 ne montait qu'UN des
> trois morceaux, et le set de l'acte 7 relançait celui qu'on venait de jouer.
> Deux autres cartes appliquées avec : `moinsFourniQue` est **retirée** (le pont
> se dit par ce qui SORT, jamais par un compte qui descend — il pouvait coincer
> un couplet déjà maigre), et le dernier morceau exige **trois réglages
> spéciaux** (`unePolyrythmie`, `unDetuneFranc`, `duGrain`), la version large que
> Yann a choisie contre ma reco. Les trois lisent `ctx.depart` : un réglage
> d'usine ne coche rien.
>
> ⚠️ **RESTENT OUVERTES, `docs/relecture/retour-carriere.html` section 2 : deux
> cartes.** A4 (la course du curseur Swing — reco : ne rien changer, c'est le
> critère de la fiche qui borne, pas l'outil) et A5 (ce qui coince en abandonnant
> un cahier — reco : une option « pose-moi à l'acte N étape M » dans
> `scripts/parcours-carriere.cjs`, zéro surface joueur). **Ni l'une ni l'autre
> n'est codée.**
>
> Avant cela, le même jour : ✅ **Un rechargement ne coûte plus la
> session.** `stores/session.svelte.ts` retient la VUE, l'onglet de l'Atelier,
> l'écran du Mode jeu et la COMMANDE ouverte ; le travail de l'Atelier se
> réapplique tout seul. Une PÉREMPTION de deux heures fait la différence entre
> un rechargement et une visite du lendemain — sans elle personne ne reverrait
> l'accueil. Ne se restaurent PAS : un module fermé, un Live emprunté par une
> scène (on revient à la carrière, qui réaffiche la scène), et la grille d'un
> exercice (la cible est tirée au sort). Un cas d'intégrité fermé au passage :
> `ouvrirCommande` écrit le départ dans l'autosave tout de suite, sinon un
> rechargement dans la seconde cochait des cases sans le moindre geste.
>
> Avant cela, le même jour : ✅ **Retour de jeu : dix défauts corrigés,
> cinq choix en fiche.** Une partie complète de Yann, dix-sept points. Trois ne
> se voyaient qu'en JOUANT : la **discographie ne s'ouvrait plus** (liste keyée
> sur l'acte seul alors que la clé est `(acte, série)` — 17 productions en fin de
> carrière, donc `each_key_duplicate`), **recharger la page renvoyait au premier
> écran du jeu** (le curseur volatil était posé par le formulaire de pseudo, que
> le rechargement ne repasse pas), et la **conclusion était inatteignable après
> une relecture** (`enRelecture` ne s'éteignait jamais, donc l'acte 7 tournait en
> boucle). Plus : le carnet reprend à l'étape, la banque de séquences est rangée
> par profil, un profil se supprime, le panneau Groove attend la commande de
> Kelvin, les arrangements 75-76 ne redescendent plus au backbeat plat, le
> shuffle du garage a un plafond (30-55 : à 75 le contretemps se colle à la
> frappe suivante), et les claviers du Mode jeu sonnent et parlent la langue de
> l'Atelier.
>
> *(Répondu depuis — A1, A2 et A3 sont livrées ; A4 et A5 restent.)*
> **`docs/relecture/retour-carriere.html`, section 2 — cinq cartes.** La plus lourde est **A1, les actes 6 et 7** : Yann
> propose que l'acte 6 prépare sans montrer le Mode Live et que l'acte 7 joue les
> trois morceaux puis le jingle, le mode s'ouvrant à la sortie. **Ça défait
> l'arbitrage du 2026-09-14** (« réponse A », le Live s'ouvre à l'acte 6, « on ne
> découvre pas sa console sur scène ») — la carte le dit, avec l'argument qu'on
> perd et celui qu'on gagne, et je la recommande quand même : mesuré, la scène de
> l'acte 6 monte UN seul des trois morceaux, et le set de l'acte 7 démarre sur
> deux scènes de A, donc relance le morceau qu'on vient de jouer. Les quatre
> autres cartes : les contraintes « plus fourni / moins fourni » (A2, reco :
> retirer le compte), les réglages spéciaux du dernier morceau — la polyrythmie
> 16/12 (A3, reco : l'exiger sur « celui que personne n'attend »), la course du
> curseur Swing (A4, reco : ne rien changer), et ce qui coince en abandonnant un
> cahier (A5, reco : un outil hors du jeu).
>
> ⚠️ *(Historique)* ✅ **TROUVÉ : une boucle audio interdite
> (`mixBus → liveReverbSend → reverb → mixBus`) rendait l'appli entièrement muette
> sous Firefox.** Gecko coupe un cycle sans `DelayNode` en entier, Chrome coupe
> la seule arête fautive. Correctif d'une ligne, sans effet à l'oreille (mesuré),
> et `tests/graphe-boucles.test.ts` interdit le retour. **Reste à confirmer sur
> le téléphone de Yann.** Ce qui suit décrit l'enquête, gardé pour la méthode.
>
> ⚠️ *(Historique)* **Firefox ne jouait pas, et on attendait un message d'erreur.** Une première cause a été corrigée (#194, reprise
> hors de la tâche du geste) — elle était réelle et prouvée au banc, mais elle
> n'était pas la seule. Ce qu'on sait depuis : les voix du récit sonnent (elles
> ont leur propre `AudioContext`, sans `buildGraph`), la lecture ne démarre pas,
> le visuel reste vide. Le moteur casse donc quelque part, en silence — d'où le
> capteur de pannes livré ensuite. **Prochain pas : lire le message affiché sur
> le téléphone de Yann**, et savoir si un aperçu (clic sur une case de la grille)
> sonne, ce qui sépare `buildGraph` du scheduler.** Vérifié ce jour : **0 erreur de types sur 289 fichiers, 750 tests,
> les deux builds** (l'autonome fait 876 ko, 293 ko gzip).
>
> ⚠️ **CE QUI EST EN COURS, ET CE QUI EST EN PAUSE.**
>
> **Corrigé (PLAN.md, première entrée) :** une reprise de sortie était posée hors
> de la tâche du geste — `start()` reprenait le contexte après avoir attendu
> `close()`. Chrome l'acceptait (activation collante), Firefox la refusait
> (activation transitoire), et un refus d'autoplay ne rejette pas : il laisse la
> promesse pendante. L'appli restait muette, sans une erreur. Le chemin ne
> s'emprunte que sur une sortie LENTE, donc **au casque Bluetooth seulement**.
>
> **En pause : l'enquête sur la latence Bluetooth.** Ce qui est MESURÉ, sur le
> téléphone de Yann :
>
> | configuration | ressenti |
> |---|---|
> | appli native (« Piano Lite »), casque BT | instantané |
> | piano web dans Chrome, haut-parleur du téléphone | instantané |
> | piano web dans Chrome, casque BT | **~70 ms** |
>
> Le haut-parleur disculpe donc le navigateur : le plancher de Web Audio est bon
> sur cet appareil, tout le retard vit sur la route Bluetooth. Reste à décomposer
> les 70 ms (`baseLatency` = ce que Chrome s'accorde, `outputLatency` = le total
> déclaré), et à trancher l'arbitrage du 2026-08-26 : **on ajoute délibérément
> ~40 ms en Bluetooth** (`engine/tampon.ts` bascule sur `'playback'`) pour tuer
> les crachotements, et c'est exactement ce dont Yann se plaint aujourd'hui. Le
> réglage manuel qui l'annule (`🎧 Sortie audio : Réactif`) existe déjà, mais il
> est enterré dans le menu de la barre d'outils de l'Atelier — absent du Mode
> Live et du Mode jeu, là où on joue. Deux livrables prévus, non commencés : une
> page de mesure autonome (`public/latence.html`) et la remontée du réglage.
>
> ⚠️ **Le chantier du Mode Live est CLOS** — treize livraisons de #169 à #181, et
> ses deux derniers points sont tombés **en jouant**, le 2026-09-14 : le
> **loquet 🎲 est validé**, et le mode a **tourné sur un vrai téléphone en
> paysage**. C'était le dernier angle mort de MESURE du projet (tout le reste
> était émulé en 844 × 390). Plus rien n'attend une écoute.
>
> ⚠️ **Et les deux « creux de courbe » ont été re-mesurés le 2026-09-14 : ils
> décrivaient un jeu qui n'existe plus.** L'acte 5 ne compte plus dix exercices
> mais DEUX, et le trou de « neuf d'affilée sans grille » est retombé à trois
> (les `melodie` de l'acte 3), suivi des quatre arrangements 75-78. Même chose
> pour « étendre les grilles écrites » : **17 des 27 exercices portent une cible
> écrite**, 5 des 10 restants ne peuvent pas en avoir par construction. Voir
> « La COURBE de difficulté ».
>
> **Ce qui reste donc, et qui se code** : une question d'arbitrage (faut-il une
> cible écrite à la FIN du jeu ? les trois derniers exercices sont `style`, un
> preset et une frappe), cinq niveaux générés qui pourraient s'écrire, puis les
> chantiers non engagés — les roasts d'exercice, les besaces, le code de reprise
> entre appareils.
>
> ✅ **Les trois questions de `masquer-le-verrouille.html` sont tranchées et
> appliquées** (2026-09-14) : le Mode Live s'ouvre à l'acte 6 et n'y revient
> plus (réponse A), le catalogue des 34 morceaux est fermé jusqu'à la fin de
> l'acte 5 (d'une pierre deux coups : les lignes de synthé qu'on entend sans
> les voir, et le genre offert tout fait à l'acte des styles), et deux barres
> tombées à une entrée disparaissent. Détail dans `PLAN.md`, première entrée.
> **Reste ouverte, posée par Yann : qu'est-ce qu'on gagne à finir l'acte 7 ?**
> Il n'ouvre plus aucun module — sa récompense est le concert et l'épilogue.
>
> Les deux dernières livraisons : **#180** retire les préversions par pull
> request (le coût n'était pas le déploiement mais la notification) et **#181**
> retire du moteur le chemin de forçage des rafales de ligne (*« à supprimer »*),
> avec l'empreinte du `rng` prouvée inchangée sur 25 010 événements.
>
> Avant cela, le 2026-09-10 : **une scène dit ce qu'on y fait**. Retour
> de jeu sur le dernier acte (*« je n'ai pas compris ce qu'il se passait »*,
> *« en quoi consiste le niveau ? »*) : une scène est le seul écran sans cahier
> ni cible, donc le seul où rien ne porte la consigne à sa place — on sortait du
> récit pour atterrir sur le Mode Live générique, afficheur sur ARRÊT, sortie
> réduite aux trois points du coin. D'où `EtapeScene.surScene`, le bandeau
> « ACTE 7 · LE SET », la sortie écrite **◂ REDESCENDRE**, et une carte de départ
> qui porte **▶ LANCER**. La surface de jeu ne bouge pas. Détail dans `PLAN.md`,
> première entrée.
>
> Avant cela, le même jour : **le morceau se monte à la main**. Le
> panneau Montage (Atelier, onglet Production) est devenu l'ÉDITEUR de la
> chaîne : partir d'un modèle ou d'une page blanche, et par scène la lettre, les
> tours, le nom, les lignes qui sonnent, plus monter / descendre / dupliquer /
> retirer. Et les BOUTONS sortent du montage **et** du fichier de morceau
> (« ça ne fait pas ses preuves ») : plus rien ne remplace les assignations
> réglées à la main, donc plus de loquet « CONSERVER MES BOUTONS » dans ⚙ ni de
> coche à l'ouverture. Détail dans `PLAN.md`, première entrée — dont trois
> défauts que seule la mesure a vus (enveloppes `.tap44` qui se recouvrent,
> débordement de 12 px, et neuf cibles de 44 px impossibles sur 312).
>
> Avant cela : **l'acte 7 se joue en Mode Live** : le
> concert monte le DISQUE (les trois morceaux de l'acte 6, un par lettre, sur
> « A B C · A B′ C′ »), le rappel pose le jingle sur BOUCLE, et l'exercice
> devient la BALANCE. Il corrige au passage un bug que rien ne mesurait : le
> rappel faisait entendre le set de l'acte 6, parce que sa chaîne était restée
> chargée. Règle neuve : **une scène pose tout ce qu'elle fait jouer — le motif
> ET la chaîne**. Détail dans `PLAN.md`, première entrée.
>
> Avant cela : **chantier du MODE LIVE : 25 cartes
> arbitrées, tout ce qui est tranché est appliqué**, plus les trois chantiers
> de la relance (le catalogue de boutons et le relief des montages ; le fichier
> de morceau, le rangement banque ↔ lettres, le magnétophone). Deux audits
> ([07](docs/plan/07-audit-assemblage-de-morceau.md),
> [08](docs/plan/08-etat-de-lart-structures.md)) et deux fiches
> (`docs/relecture/assemblage.html`, `assemblage-2.html`).
>
> ✅ **Le loquet 🎲 est VALIDÉ** (2026-09-14, en jouant sur le site) — c'était la
> dernière des 25 cartes, et la seule qui attendait un essai plutôt qu'un
> arbitrage.
>
> ⚠️ **Les préversions par PR sont RETIRÉES** (2026-09-11, « arrête avec
> les préversions ») : elles commentaient chaque PR, donc envoyaient un mail à
> chaque fois. Rien ne doit plus écrire sur une pull request.
>
> ⚠️ **Tour d'horizon des verrous (2026-09-08 — ses trois questions ouvertes
> sont tranchées depuis, voir ci-dessus)** — « masquer ce qui est
> verrouillé » : quatre écrans nommaient encore un module fermé (le dernier 🔒
> du jeu dans le menu Mode, le conseil « passe au Synthé », la banque de
> séquences, et « huit actes · 78 niveaux » sur l'accueil). Corrigés et
> **mesurés** par `scripts/verrous-masques.cjs`, qui joue la carrière et relit
> neuf écrans par acte. Trois questions restent à trancher dans
> `docs/relecture/masquer-le-verrouille.html` — dont **le Mode Live qui s'ouvre
> pour la scène de l'acte 6 puis se referme jusqu'à l'épilogue** (le jeu compte
> maintenant TROIS scènes — une à l'acte 6, deux à l'acte 7 : la question est
> plus visible, toujours pas tranchée).
>
> ✅ **Le NOM est tranché : on garde « Mode Live »** (2026-09-14, *« gardons
> mode live »*), après fiche — `docs/relecture/nom-du-mode-live.html`. La
> question avait été posée deux fois et close deux fois sur « on verra plus
> tard » ; elle est désormais **fermée**, pas ajournée. Les sous-titres de
> l'accueil (carte Q2) sont réglés le même jour, puis **tous retirés** le
> lendemain — l'horizontale se dit à la porte, pas avant. Le contournement par
> URL `#boss` est retiré lui aussi : il ne reste que le pseudo « master ». Ce
> Le Mode Live n'a plus rien d'ouvert : son dernier point, l'essai sur un vrai
> téléphone en paysage, est fait (2026-09-14) — et le loquet 🎲 est validé.

## Où en est le projet

**Face B** — séquenceur web en Svelte 5, skin Winamp 2.x, déployé sur
<https://boite-a-rythmes.vercel.app>. Quatre modules : **Atelier** (composition),
**Synthé**, **Production**, **Mode Live**, plus le **Mode jeu**.

`main` est vert, 741 tests, 0 erreur de types (288 fichiers), les deux builds
passent.

Le gros du travail récent porte sur le **Mode jeu**, dont le Mode carrière est
devenu l'écran d'entrée : les huit actes de `HISTOIRE.md` sont écrits, plus
l'épilogue. Le récit est **entièrement porté** — il n'y a plus de texte en
attente dans `HISTOIRE.md`.

| | |
|---|---|
| Actes jouables | 8 sur 8, plus l'épilogue |
| Verbes d'exercice | 12 (`ExerciseKind`) |
| Niveaux | 78 (38 de campagne + le reste du réservoir) |
| Commandes (production à livrer) | 22, aux actes 2 à 6 (l'acte 6 en compte neuf : trois morceaux de trois boucles, l'acte 5 six pour quatre genres) |
| Productions rangées en fin de carrière | 17 (une par acte-et-série) |

## Le déverrouillage — tranché le 2026-08-26

**C'était LA décision en attente ; elle est prise et livrée.** Les quatre
modules se déverrouillaient tous à la fin de l'acte 0, ce qui vidait le
déverrouillage narratif — le principe même du Mode carrière — de son rôle.

**Arbitrage de Yann : le plancher gelé** (sortie 1 des trois proposées).

`PlayerProgress.plancher` est le `level` d'AVANT la carrière, gelé une fois pour
toutes dans `load()`, et c'est LUI que lisent les seuils de `moduleUnlocked` —
plus jamais `level`, que la carrière fait monter en citant des niveaux du
réservoir. Un joueur neuf gèle `1` : le récit gouverne seul. Un vétéran gèle ce
qu'il avait : il ne perd aucun module. La règle qui en découle, inscrite dans
`CLAUDE.md` : **une porte déjà ouverte ne se referme jamais.**

Vérifié par `scripts/parcours-carriere.cjs` depuis un joueur neuf — les modules
s'ouvrent un par un (Atelier à la livraison de l'acte 1, Synthé à l'acte 4,
Production à l'acte 5, Live à l'épilogue), là où tout tombait d'un coup avant.

**Sur la sauvegarde, qui était la vraie question :** rien n'était à écrire.
La reprise existait et était juste — curseur `{ acte, etape }` persisté par
étape franchie, jamais reculant, restauré par `setPseudo` → `load()`, et les
modules **dérivés** de l'acte plutôt que stockés (une seule source de vérité).
Deux limites connues et non traitées, par choix : rien ne traverse les appareils
(il faudrait un code de reprise, `share.ts` saurait le porter), et la
granularité est l'étape, pas l'exercice — un exercice abandonné reprend à son
début.

## ⚠️ Le chantier du MODE LIVE — arbitré et appliqué, une carte restante

⚠️ **Leçon de méthode, à ne pas répéter.** Une première passe a répondu au
diagnostic de Yann par une implémentation directe — *« trop focalisé dans
l'exécution directe »*. Un constat sur ce que le produit EST s'audite avant de
se coder. La règle est dans `CLAUDE.md`, le format qui marche est la fiche
annotable (25 cartes, 25 réponses).

### Le cadrage — tranché, et c'est la norme de la catégorie

Yann refusait le choix binaire scène / établi, **et il avait raison** : beaucoup
de grooveboxes n'ont pas de mode morceau, par choix, parce qu'elles sont faites
pour être JOUÉES en temps réel. Le Song Mode d'Elektron est arrivé par mise à
jour, des années après. **On prépare de la matière, on joue la structure.** Le
mot juste est **SCÈNE**, pas « section ».

### Appliqué

| | |
|---|---|
| Trois lettres A, B, C | et les modèles RONDO / « A B C · A B′ C′ » les citent |
| Le mix SUIT la bascule, le tempo JAMAIS | « on passe du temps à chercher un son » |
| La durée juste | chaque section avec le cycle de SA lettre |
| Les pastilles du Live ne rangent plus | ranger est de la préparation → onglet Production |
| ~~Option « conserver mes boutons »~~ | **retirée** — un montage ne touche plus aux boutons du tout (2026-09-09) |
| SONNERIE retiré, AABA ajouté | la forme de 32 mesures tombe pile sur nos tours |
| ❌ Export hors ligne d'un morceau | **annulé** — sans automation il serait mort |
| ~~Préversion Vercel par pull request~~ | **retirée le 2026-09-11** — elle commentait chaque PR, donc un mail à chaque fois |

### Jugé sur la préversion (2026-09-07)

Yann a essayé : *« le random marche très bien »*. Deux suites immédiates,
livrées : un second loquet **ASSIGNER** (le tirage plaisait, mais la liste
n'était accessible que par appui long — donc trouvée par personne), et un
panneau **Montage** dans l'Atelier qui écrit ce qu'un montage fait
(*« il faudrait qu'on puisse comprendre ce qui est fait quelque part »*).

### Retour de jeu du 2026-09-08, livré

Yann a joué la préversion. *« Le random marche très bien »* ; le reste a produit
trois corrections : un second loquet **ASSIGNER** (la liste n'était qu'en appui
long, donc trouvée par personne), un panneau **Montage** qui écrit ce qu'un
montage fait, puis — après un second essai — **le catalogue élargi de 20 à 30
boutons** (il n'avait que 2 gestes maintenus sur 20), **les montages en relief**
(13 scènes sur 38 portaient un calque, AABA et RONDO aucun) et **⏺ REC qui lance
le morceau depuis son début**.

### Ce qui reste

⚠️ **Plus rien de technique.** Les trois points qui restaient sont livrés par
**#169** : le morceau se sauvegarde en JSON, « → A » relie enfin la banque aux
lettres, et le magnétophone accumule de l'Int16 par paliers de 30 s — dix
minutes de prise passent de 256 Mo de pic à ~57 Mo, plafonnées par
`MINUTES_MAX_CAPTURE`. La question « les boutons font-ils partie du morceau ? »
a été tranchée deux fois : oui d'abord, puis **non** le 2026-09-09, à l'usage —
c'est ce « non » qui tient, et plus rien ne touche aux assignations réglées à la
main.

✅ **Et ce qui restait à écouter a été écouté** (2026-09-14) : le loquet 🎲 est
validé, le mode a tourné sur un vrai téléphone en paysage. Le chantier est clos.

### Ce qui suit ensuite

L'écoute a eu lieu et n'a rien réclamé. Reste donc en réserve, et rien avant
qu'on l'entende manquer : **l'automation d'axe par section**,
délibérément remplacée par un escalier de sections tant que personne n'a entendu
que ça manque. (Le fill recalé sur la section est fait — première tranche de
l'audit du Mode Live.)

---

## Le chantier des CAHIERS DES CHARGES — **terminé**

⚠️ Toutes ses tranches sont livrées — les deux tableaux ci-dessous sont verts
de bout en bout. La section est gardée pour le *pourquoi* et pour la trace des
arbitrages ; ce n'est plus un chantier en cours.

Relecture complète de Yann le 2026-09-01 (75 cases annotées, une par exercice et
par acte). Elle dit une seule chose : **« il faut que tout soit en atelier avec
des cahiers des charges assez complexes »**. Sa nuance sur les 56 % de
`reproduire` le confirme en creux — *« les autres verbes ne sont pas forcément
tous intéressants : lequel, régler et nommer »*. Remplacer du recopiage par des
quiz n'aurait rien réglé.

| | tranche | état |
|---|---|---|
| 1 | l'outillage des cahiers + **l'acte 4 refait** en trois envois | ✅ livré |
| 2a | **l'acte 3**, les exercices : `melodie` gagne sa ligne, mélodie → basse | ✅ livré |
| 2b | **l'acte 3**, les cahiers : mélodie → + basse → + nappe, plus les textures | ✅ livré |
| 3 | **l'acte 2** : grilles différentes, `régler` en premier, l'aléa dans le cahier | ✅ livré |
| 4 | **l'acte 1** fusionné 12 → 6-7, le niveau 2 retiré, plus une polyrythmie | ✅ livré |
| 5a | **l'acte 5** : quatre commandes de style, une par case du fax | ✅ livré |
| 5b | **l'acte 6** en cahier, le plus complet du jeu | ✅ livré |
| 6 | **l'acte 7** en Mode Live jouable + l'épilogue (« pas assez d'émotion ») | ✅ livré |
| — | **l'arrangement** : reposer plusieurs lignes à la fois (acte 3, niveaux 75-77) | ✅ livré |
| — | **la nappe** dans l'arrangement + le **son** d'un niveau (`model/sons.ts`) | ✅ livré |
| — | **couper une ligne à l'écoute** + des **cycles** de durées différentes (niveau 78) | ✅ livré |
| — | **relire un acte** rendu visible dans le carnet + le récit qui annonce le 78 | ✅ livré |
| — | enterrer le réservoir, fusionner carte/salle, renuméroter par acte | ✅ livré (renumérotation à l'AFFICHAGE) |

**Relecture annotée du 2026-09-04** (21 cases, `docs/relecture/mode-jeu.html`) :

| | tranche | état |
|---|---|---|
| 1 | l'outillage synthé (mixage + harmonie) + **l'acte 5** refait + **l'acte 4** | ✅ livré — les 9 prioritaires |
| — | le **shuffle** nomme son bouton, le riddim dit ses deux coups, le preset `swing` à 33 | ✅ livré (retours en jouant) |
| — | **refaire un cahier** depuis la salle, l'abandonner, 3★ / 0★ | ✅ livré |
| — | les **roasts par verbe**, le 67 retiré, le `silence` durci, l'acte 7 à un pilote | ✅ livré |
| 2 | **l'acte 6 en trois boucles** — FB-015 en couplet / refrain / pont, montés en set | ✅ livré |
| 3 | **trois MORCEAUX** + la MÉLODIE dans les cahiers du refrain et du pont | ✅ livré |

⚠️ **Ce qui distingue les trois morceaux est une INTENTION, pas un brief**
(arbitré avec Yann le 2026-09-05) : « celui qui passe », « celui qu'on écoute
seul », « celui que personne n'attend » sont trois répliques de Sol. Une
intention pèse sur ce que la boucle doit FAIRE — un tempo, un plafond de voix, un
geste rare — jamais sur ce qu'elle doit RESSEMBLER. La phrase de l'acte (« aucun
brief, aucun client, aucun style imposé ») tient donc, et aucun des neuf cahiers
ne convoque une fiche de style.

⚠️ La polyrythmie (niveaux 29 et 24) a quitté l'acte 5 (« hors sujet ») et
attend l'acte 6, où Yann propose de l'expliquer par le récit — « peut-être que
c'est une piste pour développer son style ». Elle est au réservoir en attendant.

**Ce que la tranche 2 a tranché en passant** (détail dans `PLAN.md`, « L'acte 3
empile ses couches ») :

- **les trois exercices de mélodie RESTENT** — contrairement à l'acte 4, ce ne
  sont pas des quiz : on y écrit des notes au clavier de l'Atelier, donc le geste
  même que les envois demandent, et ils enseignent le mot « tonique » qu'un
  cahier emploie ensuite ;
- **une couche livrée se protège par ce qu'on AJOUTE**, jamais par une
  interdiction — `basseQuiTient` compare la basse à la mélodie, effacer celle-ci
  rend celle-là insatisfiable ;
- le bouton de livraison nomme enfin **le client** et non Sol (défaut noté à la
  tranche 1).

**Ce que la tranche 3 a tranché en passant** (détail dans `PLAN.md`, « L'acte 2
règle d'abord ») :

- **le trio 14/17/23 est dissous** et les grilles de l'acte sont toutes
  différentes — comparer deux balancements passe par `regler`, pas par trois
  reproductions ;
- **`lequel` quitte la carrière** (45, 46, 62 au réservoir) : désigner A ou B est
  le même jugement que viser un curseur, en moins engageant. `nommer` reste une
  fois, le seul écran qui mette les deux mots côte à côte ;
- **l'aléa est une exigence du cahier**, plus un quiz — et son seuil (`ALEA_MINI`)
  est mesuré en rejouant le scheduler, pas choisi ;
- ⚠️ un garde-fou de test est devenu **vide** quand `lequel` a quitté la
  carrière ; il ne l'a dit que parce qu'il comptait sa population. Réancrer, ne
  jamais retirer le compte.

**Ce que la tranche 4 a tranché en passant** (détail dans `PLAN.md`, « L'acte 1
fusionne ») :

- **« un sujet, deux exercices » est RÉVOQUÉ** — la règle datait du 2026-08-31 ;
  sur chaque paire c'est désormais le plus DENSE qui reste (67, 68, 69, 74, 60,
  8, 61), l'autre retourne au réservoir ;
- ce qui la remplace est plus fort : **une nouveauté n'est demandée qu'après
  avoir été montrée à l'écran** — le test regarde le récit, pas le compte ;
- **la polyrythmie de l'acte 1 est ÉCRITE** (niveau 74) : les cinq du réservoir
  sont soit déjà jouées à l'acte 5, soit générées.

**Ce que la tranche 5a a tranché en passant** (détail dans `PLAN.md`, « L'acte 5
produit au lieu de recopier ») :

- **une fiche ne peut pas décrire un genre dont le voisin partage tout sauf un
  nombre** — la fiche du boom bap acceptait le drunk beat, celle de la house
  acceptait le hard house. On décrit celui des deux qui porte une propriété
  POSITIVE que l'autre n'a pas, jamais en rabotant une borne ;
- **la discographie est rangée par (acte, SÉRIE)** : sans ça, l'acte 5 faisait
  produire quatre genres pour n'en rendre qu'un ;
- deux harnais (le test et le parcours) construisaient un genre en perdant son
  FEEL — ils partent désormais de `presetToState`.

**Ce que le CARNET a tranché en passant** (détail dans `PLAN.md`, « Relire un
acte se voit ») :

- **une capacité qu'aucun mot ne nomme n'existe pas** — relire un acte marchait
  et était testé ; le carnet n'avait ni titre, ni relief, ni verbe, et la seule
  phrase sous lui nommait la salle de répétition ;
- **une nouveauté s'annonce avant de se demander** : le 78 était le cinquième
  exercice d'affilée de l'acte 3 et n'expliquait son idée que dans son propre
  préambule ;
- ⚠️ **`progresCarriere` est un GETTER** : lui affecter une valeur dans un
  `page.evaluate` ne fait rien, en silence. Trois scripts de mesure s'y sont
  fait prendre dans la même session.

**Ce que l'ÉCOUTE et les CYCLES ont tranché en passant** (détail dans `PLAN.md`,
« Couper une ligne à l'écoute, et des cycles de durées différentes ») :

- **couper une ligne enlève de la difficulté d'ÉCOUTE, pas d'exercice** — c'est
  la réponse au doute « ça rend pas le jeu trop facile ? » : toutes les lignes
  restent comparées, et l'écran le dit ;
- **des durées différentes, oui ; des subdivisions différentes, non** — une
  colonne reste un instant, sinon c'est une polyrythmie et six lignes deviennent
  illisibles. Une ligne courte se répète en pâle en face des suivantes ;
- ⚠️ **les cycles sont réservés au SYNTHÉ** : `DrumRowState` n'a pas de
  `cycleBars` ;
- ⚠️ **la tête de lecture doit se recaler** : le moteur donne le pas DE LA LIGNE,
  donc une batterie d'une mesure restait bloquée sur la moitié gauche de l'écran ;
- **la règle de progression a été élargie, pas contournée** : un arrangement ne
  recule pas sur les DEUX axes à la fois (voix, mesures) — le niveau qui
  introduit les cycles pose moins de voix, exprès.

**Ce que la NAPPE et les SONS ont tranché en passant** (détail dans `PLAN.md`,
« La nappe et le son d'un niveau ») :

- **la nappe entre sans troisième nature de case** : sa case porte un degré, le
  moteur reçoit un index d'accord. Lui passer un `{ degree, octave }` donne une
  ligne affichée, éditable, notée et **muette** — c'est le test « chaque ligne
  affichée s'entend » qui l'attrape, pas l'oreille ;
- **un clavier suit la LIGNE visée**, pas le niveau : la nappe s'arrête à quatre
  accords ;
- **le SON d'un niveau est un décor** (`model/sons.ts`) — cible et version du
  joueur le reçoivent à l'identique, il se pose AVANT la consigne d'un verbe de
  paramètre, et les voix se citent au catalogue plutôt que de se réinventer ;
- ⚠️ **un test à valeur sentinelle est instable par construction** : « attack »
  est tombé sur la sentinelle et le test a échoué sur une réussite. Comparer le
  même tirage AVEC et SANS, jamais contre une valeur choisie.

**Ce que l'ARRANGEMENT a tranché en passant** (détail dans `PLAN.md`,
« L'arrangement — reposer plusieurs lignes à la fois ») :

- **un seul verbe pour les deux demandes** — l'acte 3 et les reproductions à 6-8
  lignes des actes suivants sont le même mécanisme, bâti d'emblée sur N lignes de
  deux natures. Deux verbes auraient divergé ;
- **six lignes tiennent sans défiler en 390 × 844, huit font défiler la page** et
  rien n'est jamais coupé. Mesuré, y compris un huit-lignes monté à la main : les
  actes suivants n'ont pas de travail de mise en page à prévoir ;
- ⚠️ **`GAME_DRUM_ROWS` n'est pas la liste des lignes de batterie** — il s'arrête
  aux trois du jeu, `defaultState()` en ouvre cinq. Toute coupure « tout le reste
  au repos » doit balayer `DRUM_ROW_NAMES` ;
- **le niveau 77 s'appelait « Six lignes » et en avait cinq** : c'est le clap qui
  a été ajouté, pas le titre qui a été changé.

**Ce que la tranche 5b a tranché en passant** (détail dans `PLAN.md`, « FB-015
récapitule les cinq mois ») :

- **COMPLET n'est pas SÉVÈRE** : le cahier de FB-015 est le plus long du jeu
  (onze lignes, quatre sections) et n'exige aucun goût — pas de fiche, pas de
  verrou de provenance, pas de chapeau de genre. Il récapitule, une section par
  acte traversé ;
- ⚠️ une capture semblait montrer un cul-de-sac (l'onglet Synthé absent d'un
  cahier qui réclame trois lignes de synthé) : c'était la FIXTURE qui ne
  progressait pas, pas le jeu. Le parcours, lui, accepte la commande. Une
  fixture ne joue pas le jeu.

⚠️ **Les fiches de style sont cinq** (dancehall, techno, drunk beat, garage,
dembow) et chacune est calibrée : son preset la satisfait entièrement, les 33
autres échouent, et le plus proche reste à deux critères. En écrire une sixième
coûte une mesure, pas une opinion.

**Quatre arbitrages pris**, à ne pas rouvrir sans raison :

- **le trio 14/17/23 perd sa grille unique** — Yann écrit cinq fois « les rythmes
  se ressemblent trop » ; la comparaison de deux balancements passera par
  `régler`, pas par trois reproductions ;
- **`laverie` sort de la carrière, son étage de moteur reste** — outil d'écoute,
  plus exercice noté ;
- **le bouton abandon ne bouge pas** — *« en version de développement, ce bouton
  est pratique pour balayer les niveaux »* ;
- ⚠️ **renuméroter les niveaux vient EN DERNIER** — `PlayerProgress.level`,
  `niveauxRencontres`, `partirDu` et toutes les sauvegardes citent les ids.
  Renuméroter avant que le contenu soit stable coûterait deux fois.

**Ce que Yann demande et qui n'est pas encore planifié** : retrouver ses propres
morceaux d'Atelier (aujourd'hui seule la discographie de carrière est gardée), et
fusionner la carte et la salle de répétition en un seul écran.

## Le chantier précédent — revoir les niveaux en profondeur

Retours de Yann (2026-08-26) sur la difficulté et l'amusement : *« bizarre les
exercices pour la production »*, *« il faut pousser les exercices à faire en
atelier »*, *« les livraisons en atelier, c'est vraiment bien, il faut pousser
le jeu dans cette direction à fond »*.

Diagnostic : le jeu enseigne en faisant RETROUVER, et la seule chose qui
l'intéresse — produire — n'apparaît qu'à la fin de chaque acte, sans lien avec
les exercices qui précèdent.

**Tranche 1 — LIVRÉE.** Les fiches de style (`src/model/styles.ts`) :
description, validation par part de critères avec seuil réglable, verrou de
provenance sur les presets, basse exigée. Calibrée et testée sur **un** genre,
dancehall. Voir `PLAN.md`, « Les fiches de style ».

**Tranche 2 — LIVRÉE.** L'acte 4 en deux temps : produire un morceau techno
(fiche `techno`), puis le régler pour qu'il tienne à la laverie. L'arbitrage
« qu'est-ce qui compte comme mieux mixé » a été délégué et tranché ainsi : on
mesure l'ÉTAT et non l'audio rendu (sinon le cahier vivant devient asynchrone),
trois critères et pas dix, et **chacun exige un geste** — un critère coché sans
rien toucher est du théâtre. Le seuil du drive vient de la mesure du petit
haut-parleur. Voir `PLAN.md`, « L'acte 4 en deux temps ».

**Tranche 3 — LIVRÉE (2026-09-01, tranche 5a).** Les niveaux `reproduire`
4/12/13/27/32 sont sortis de l'acte 5 vers le réservoir, remplacés par trois
commandes de style (une fiche par genre) qui s'ajoutent à celle du dancehall.
Les verbes de paramètre 54-57 de l'acte 4 avaient été traités avant, par la
tranche 1 du chantier des cahiers.

## Le retour de partie de Yann (2026-08-27) — ce qui est fait, ce qui reste

Une partie complète jouée à la main. **12 points sur 19 sont traités** ; le
reste est là, dans l'ordre où je propose de le prendre.

### Fait

| | |
|---|---|
| L'acte 3 était un cul-de-sac | `modulesRequis` — la commande ouvre le Synthé qu'elle exige |
| La check-list déjà cochée | `etatVierge()` — une commande part d'un Atelier vide |
| Le jeu s'appelle **Face B** | et l'entrée s'appelle **Jouer**, plus « Mode jeu » |
| Le verrouillé est masqué | plus aucun cadenas à l'écran |
| Les dates | 2005, une seule date écrite, le reste déduit |
| La mélodie | cases + clavier comme l'Atelier, tonique donnée |
| Les promesses de l'acte 1 | le forçage variante/rafale enfin porté |
| L'export de la sonnerie | sorti de l'onglet verrouillé |
| L'acte 1 monte en difficulté | huit rythmes ÉCRITS, une nouveauté chacun (`GrilleEcrite`) |
| Le jeu réagit à ce qu'on livre | réaction calculée sur l'état, calibrée sur les 34 presets |
| Les productions restent | discographie par pseudo — réécouter, reprendre dans l'Atelier |

### Reste — plus aucun bug signalé en attente

1. ~~**Acte 3, « bug sur la basse à deviner »**~~ — traité au mieux de ce qui
   était reproductible. La logique était saine (poser exactement la cible est
   accepté, vérifié aux niveaux 42 et 43) ; ce qui ne l'était pas : la tonique
   annoncée comme repère n'était pas posée, et l'interface était un rouleau de
   quarante cases. Refondue en cases + clavier, tonique donnée. **Si le défaut
   persiste, il est dans le SON — c'est la piste qui reste.**
2. ~~**Acte 1, les promesses non tenues**~~ — corrigé. `forceVariantCount` /
   `forceRollCount` n'étaient lus par personne : 0 variante et 0 rafale sur 60
   tirages aux niveaux 5, 8 et 9. Le forçage est porté, y compris sur les
   niveaux preset. Les gestes, eux, existaient bien (clic pour la variante,
   clic droit pour la rafale) et le préambule les explique.
3. ~~**Acte 1, exporter sa sonnerie**~~ — corrigé. L'export a quitté l'onglet
   Production : il vit hors des onglets, toujours atteignable. Exporter n'est
   pas un réglage de production, c'est finir.

### Reste — forme du récit

4. **Indiquer qui parle**, à chaque réplique.
5. **Faire défiler le texte** (révélation progressive).

Les deux touchent les 44 écrans de récit et demandent la même passe : attribuer
chaque ligne à un locuteur. À faire ensemble.

### ~~Reste — l'acte 0, qui ne marche pas~~ — refait le 2026-08-31

6. ~~« En l'état ça marche pas, c'est pas fun, trop dur à comprendre. »~~ Refait
   sur une demande plus tardive et plus précise : *« il faut enlever les
   questions "lequel", mettre les questions de tap qu'on voit dans l'acte 8 »*.
   L'acte 0 enchaîne maintenant **trois exercices de frappe écrits** (les quatre
   temps → un contretemps → le kick muet, à lire) puis le `silence` ; plus une
   seule question à choix multiples. Le fond : `lequel` demande un JUGEMENT à
   quelqu'un qui n'a rien touché, `jouer` demande un GESTE que tout le monde a
   déjà. Les niveaux 49-51 restent au réservoir, leurs trois mots (hauteur,
   durée, intensité) sont enseignés à l'acte 2 où les boutons existent.
   ⚠️ **Ce qui n'a PAS été fait de la trame proposée en août** : « faire un
   tempo → le tempo désigne un style → deviner le style parmi quatre
   séquences », le tout sur une seule séquence. C'est un autre chantier — il
   demande un verbe qui n'existe pas (poser un tempo) et le verbe `style` est à
   l'acte 5. À rouvrir si l'acte 0 ne convainc toujours pas.

### Reste — la courbe et le contenu

7. ~~**Acte 2** : remplacer les quiz « lequel » par des réglages.~~ — fait le
   2026-09-01 (tranche 3) : chaque sujet s'ouvre sur son réglage, les trois
   `lequel` sont rendus au réservoir.
8. **Acte 2** : la commande en plusieurs étapes (« fais d'abord un poom check
   poom poom chack », puis le reste du cahier). ⚠️ Non fait : le cahier de Kelvin
   est passé à six lignes d'un bloc, pas en sections successives. L'outillage
   existe pourtant (`Contrainte.section`, `partirDeLaLivraison`).
9. ~~**Monter la difficulté de l'acte 1**~~ — fait deux fois. D'abord cinq
   exercices → huit, tous à **grille écrite**. Puis, sur *« la progression est
   trop lente, tu peux rendre le jeu nettement plus difficile »* (2026-08-31) :
   la suite des cases faisait une **SCIE** (12, 16, 20, 16, 16, 24, 16, 24),
   parce que chaque nouveauté était montrée sur un backbeat remis au propre.
   Elle monte désormais sans reculer et l'acte 2 ouvre à son sommet. Puis une
   seconde passe le même jour — *« ça n'a pas assez changé […] on ne doit pas
   simplement changer une note en une rafale pour introduire rafale »* : une
   nouveauté se pose désormais au PLURIEL et un sujet vaut DEUX exercices.
   L'acte 1 passe à douze exercices (12 → 48 cases, 4 → 26 notes), l'acte 2 à
   douze. Voir `PLAN.md`, « Un sujet, deux exercices ».
   **Reste l'acte 2** : beaucoup d'exercices d'atelier.
10. ~~**Étendre les grilles écrites au-delà de l'acte 1**~~ — **largement FAIT,
    re-mesuré le 2026-09-14.** Le « ~28 exercices générés » datait d'avant la
    refonte de l'acte 2 (grilles écrites), les arrangements 75-78 de l'acte 3,
    et le remplacement des exercices de l'acte 4 par la chaîne d'envois. Compté
    dans l'ordre où la carrière joue : **17 des 27 exercices portent une cible
    écrite** (3 à l'acte 0, 6 à l'acte 1, 4 à l'acte 2, 4 arrangements à
    l'acte 3). Sur les 10 restants, **5 ne peuvent pas en avoir** — les trois
    verbes de paramètre (48, 71, 47) tirent leur bouton, `style` (58) tire son
    preset, et le 16 EST un preset. **Reste réellement ouvert : 5 niveaux** —
    les trois `melodie` (42, 43, 44), le `silence` (52) et le `jouer` « à vue »
    (38), qui est probablement très bien généré.
11. **Les roasts d'EXERCICE** (`gameData.ts`) : tous les textes à revoir. Ceux
    de LIVRAISON sont faits (`reactions.ts`) — la différence compte : les
    premiers commentent la façon de jouer, les seconds le morceau produit.
12. **Les besaces** : introduire le concept (aujourd'hui on en gagne sans
    savoir ce que c'est), et leur donner un usage à la fin. Piste retenue par
    Yann : une fin alternative, un EP si on a tous les objets.

⚠️ Le retour s'arrêtait sur « Acte 4 » sans contenu — il manque peut-être la
fin de la liste.

## Ce qui est vérifié, et ce qui ne l'est pas

**Vérifié** — types (288 fichiers, 0 erreur), **741 tests** (les tests aléatoires
affirment ce qui est vrai à chaque tirage et répètent 60 fois), les deux builds,
et un parcours Playwright par acte en 390×840. Les huit grilles écrites de
l'acte 1 ont en plus été mesurées dans l'appli en marche : elles sont posées au
bit près, rafales comprises.

**La chaîne des actes est saine.** `scripts/parcours-carriere.cjs` joue la
carrière entière depuis un joueur neuf : les huit actes s'enchaînent, les cinq
commandes sont acceptées, l'épilogue est atteint, aucune erreur console, et les
modules s'ouvrent désormais un par un. Il ne trouve plus rien.

**Angle mort à ne pas repayer :** chaque acte avait été vérifié isolément avec
une fixture `localStorage` où `level` était posé à la main. C'est ce qui a caché
le défaut du déverrouillage pendant sept PR — une fixture ne joue pas le jeu.
**Relancer `scripts/parcours-carriere.cjs` après toute modification du
déverrouillage, de la progression ou de la chaîne des actes** (`npm run dev`
dans un terminal, puis `node scripts/parcours-carriere.cjs`). Même raison pour
`tests/plancher.test.ts`, qui monte un vrai `localStorage` en mémoire plutôt que
de poser l'objet attendu.

**Pas encore vérifié :** un vrai parcours à la souris/au doigt de bout en bout
(le script pilote le store, il ne clique pas) — c'est le seul angle mort de
mesure qui subsiste. ✅ Le Mode Live, lui, a **tourné sur un vrai téléphone en
paysage** le 2026-09-14 : l'émulation 844 × 390 disait vrai, et le loquet 🎲 a
été validé dans le même essai.

⚠️ Le paragraphe qui suit est **historique** : il date de l'audit du 2026-09-02
([`docs/plan/05-audit-mode-live.md`](docs/plan/05-audit-mode-live.md), cinq
tranches proposées) et ses constats ont été traités depuis. Le garder pour le
*pourquoi* ; pour l'état réel, lire l'en-tête.

Puis un second audit le même jour, sur le **macro-séquenceur** demandé par
Yann (« 8 cycles de A puis 8 cycles de B ») :
[`docs/plan/06-audit-architectures-de-morceau.md`](docs/plan/06-audit-architectures-de-morceau.md).
Ce qu'il faut en retenir avant de coder quoi que ce soit sur le sujet :

- ⚠️ **ce que le chantier apporte est de rendre la bascule JOUABLE, pas
  possible.** Deux entrées de banque portent déjà deux batteries différentes et
  `cycleBankSequence` bascule de l'une à l'autre — la première version de
  l'audit affirmait le contraire et se trompait (relevé par Yann). Ce qui
  manque : la bascule est manuelle et tombe au milieu de la mesure ;
- **le motif a déjà un cycle propre, et il vaut 4 mesures** (la nappe :
  30 presets sur 34) — « mono-cycle par défaut » décrit ce qu'on croit voir,
  pas ce que l'appli joue. Le macro-séquenceur doit donc **calculer** le cycle
  (ppcm des lignes non muettes), jamais le supposer ;
- **la nappe porte une progression d'accords** : un blues 12 mesures tient
  dans un seul motif, sans macro-séquenceur ;
- ⚠️ **`isFillBar` lit le compteur ABSOLU de mesures** : les fills tomberaient
  au milieu des sections. Défaut à corriger, indépendant du chantier ;
- la limite des 10 min ne concerne pas le morceau (quelques centaines
  d'octets) mais la **capture** : 10 min de ⏺ REC font 256 Mo de pic mémoire.

**LES QUATRE TRANCHES SONT LIVRÉES** (2026-09-02, branche
`claude/audit-mode-live-sr1ai3`) : les réparations (bascule quantisée à la
mesure dans le moteur, fill recalé sur la section, sélection de texte), le
séquenceur qui porte les mutes et dit l'état réel, le catalogue trié
(31 → 20 entrées, 19 variantes → 2), et la bande d'architecture avec ses trois
modèles. 521 tests.

⚠️ **Ce qui restait sur le Mode Live est fait.** L'éditeur d'architecture existe
(`MontagePanel`, Atelier → Production, #173) : ajouter, dupliquer, déplacer,
retirer une scène, changer sa lettre, ses tours et les lignes qui sonnent, ou
partir d'une page blanche. L'essai sur un vrai téléphone en paysage a eu lieu
(2026-09-14) et le loquet 🎲 est validé. Reste en RÉSERVE, hors chantier :
**l'automation d'axe par section**, délibérément remplacée par un escalier de
sections tant que personne n'a entendu que ça manque.

## Les pièges qui ont coûté du temps

- **Le squash-merge.** La branche de travail garde l'ancien historique (déjà
  mergé) et entre en conflit avec `main`. Avant tout nouveau commit :
  `git fetch origin main && git checkout -B <branche> origin/main`, puis
  cherry-pick. Ça a mis la PR #112 en conflit — zéro check lancé, `dirty`.
- **Un étage « neutre » en série dans la chaîne audio ne l'est jamais.** Un
  passe-haut à 10 Hz changeait 41 176 échantillons sur 44 100 (phase, pas
  amplitude). Tout nouvel étage va dans une **branche parallèle à gain nul**.
- **`defaultState()` n'est pas une grille vide, c'est du Motown** —
  `rankPresets` lui donne 100 %. Toute commande doit exiger qu'on y ait touché.
- **Le HMR de Vite fait mentir `parcours-carriere.cjs`.** Après une
  modification, le script reçoit une SECONDE instance de `game` pendant que le
  store `unlocks` garde la première : la colonne « modules » affiche « — » sur
  les huit actes, ce qui ressemble trait pour trait à une régression du
  déverrouillage. Redémarrer `npm run dev` avant de conclure — d'un script comme
  d'une capture Playwright.
- **Les tests qui expirent en série complète** ne sont pas fragiles : ils
  prennent 440-580 ms pour un budget de 5 s, et échouent quand un serveur de dev
  et des builds tournent en même temps. Arrêter le reste avant de conclure.

## Décisions actées, à ne pas rouvrir

- **L'export n'est pas reproductible à l'octet près, et c'est un choix**
  (Yann, 2026-08-25). Le bruit blanc partagé et l'impulsion de réverbe sont
  tirés hors du `rng` injecté. Ce que le `rng` garantit, ce sont les **notes**.
- **La skin Winamp 2.x est un choix, pas un héritage.** Le biseau d'un pixel est
  la grammaire.
- **Un acte cite des niveaux du réservoir, il n'en fabrique jamais.**
- **Une porte déjà ouverte ne se referme jamais** (Yann, 2026-08-26) — d'où le
  plancher gelé, et son repli sur `level` pour les sauvegardes d'avant.
- **Une commande vérifie un cahier des charges, jamais une cible.**
- **Le mode s'appelle « Mode Live », et ça ne se rouvre pas** (Yann,
  2026-09-14). La fiche a montré que le nom est exact sur le fond — le mode
  n'existe qu'en temps réel, sa seule sortie est une prise — et que son défaut
  n'est que de grammaire. L'argument qui l'emporte est la **familiarité** :
  « Live » est compris d'emblée dans cette catégorie. Les onze chaînes et la
  piste « LE DIRECT » restent décrites dans
  `docs/relecture/nom-du-mode-live.html` si la question devait un jour se
  reposer — mais c'est une réponse, pas un ajournement.

## Où lire quoi

| Fichier | Ce qu'il porte |
|---|---|
| `CLAUDE.md` | les règles, les pièges, les invariants — **fait autorité** |
| `PLAN.md` | le journal du Mode jeu, une entrée ✅ par livraison |
| `docs/plan/` | les quatre archives détachées de `PLAN.md` (migration, audits, maquettes) |
| `HISTOIRE.md` | le récit source (entièrement porté) |
| `src/model/carriere.ts` | les huit actes + l'épilogue |
| `src/model/exercises.ts` | les 11 verbes, et la notation pure |
| `src/model/parametres.ts` | le catalogue des boutons enseignables |
| `src/model/commande.ts` | ce que Sol vérifie en recevant un morceau |
| `original/boite-a-rythme-69.html` | la source de vérité pour l'audio |

## L'audit du 27 août — ce qu'il a trouvé

Mesuré sur le code, pas de mémoire (`main de2eaa4`) :

- **29 niveaux sur 61 ne sont cités par aucun acte**, dont 19 des 21 niveaux de
  la plage 14 à 34 : swing, traîne, ghost notes, fill, décalage, polyrythmie,
  mesure longue. C'est la moitié du jeu qui n'existe que dans le tableau (seuls
  les presets 27 et 32 sont rattrapés par l'acte 5).
- **La carrière dure 60 à 125 min**, la cible de Yann est 120 au minimum. La
  passe de difficulté du 31 août ne change pas le NOMBRE d'exercices (43) : elle
  monte les marches, elle n'en ajoute pas — allonger les actes aurait aggravé
  « la progression est trop lente ».
- ~~10 boutons enseignés sur 155 réglages~~ → **14 depuis le 2026-08-31** :
  ghost notes, vélocité aléatoire, rafales spontanées et saturation, tous mesurés
  en rejouant le scheduler. Deux candidats **écartés par la mesure** (compression
  et bitcrush, effet non monotone). Toujours **aucun du synthé** : la
  cartographie est faite, c'est un chantier à part (le machinery des verbes de
  paramètre construit une grille de batterie, pas une ligne de synthé).
- Un verbe porte 13 des 32 exercices ; `completer` et `intrus` ne sont jamais
  cités ; l'acte 6 n'a aucun exercice.

**Chantier A — tranche 1 FAITE.** Les niveaux 14, 17 et 23 (balancement léger,
balancement franc, décalage du charley) sont réécrits en grilles écrites et
cités par l'acte 2, qui passe de 9 à 12 étapes. Il a fallu d'abord que
`GrilleEcrite` porte le FEEL : le décalage était **forcé à zéro** sur toute
grille écrite, donc le niveau 23 n'en jouait aucun.

Deux décisions prises au passage, mesurées et non supposées :

- **la traîne n'est pas un exercice** — `drag` est global, il décale tout du
  même montant, donc rien relativement. Les niveaux 15 et 18 restent orphelins
  par décision (`tests/feel-ecrit.test.ts` en fait la preuve) ;
- **`GameLevel.ghost` et `GameLevel.fill` ne sont lus par personne** — même
  famille que `forceVariantCount`. Les niveaux 20 et 21 promettent ce que le
  code ne pose pas. Une ghost note est une affaire de vélocité, qu'une grille
  ne dessine pas : leur place est dans un cahier de commande, pas dans
  `reproduire`.

**Chantier A — tranche 2 FAITE.** Quatre presets de l'époque rendus à l'acte 5
(UK Garage, French touch, Tresillo, Clave), qui passe de 12 à 16 étapes. Et
l'anachronisme trouvé en route, corrigé (voir ci-dessus).

**Chantier A — tranche 3 FAITE.** Cinq polyrythmies enseignaient deux idées
(leurs propres préambules le disaient : « le même rapport 4:3 qu'au niveau
précédent », « le vrai défi de lecture »). Deux restent, réécrites : 24 (trois
cycles premiers entre eux) et 29 (le 4:3 afro-cubain), citées à l'acte 5 juste
après la clave — la polyrythmie est l'idée dont le tresillo et la clave
descendent. L'acte passe à 18 étapes.

⚠️ **Une fragilité corrigée au passage** : `demarrerEtape` faisait
`startLevel(niveau - 1)`, une recherche POSITIONNELLE à partir d'un id. Un
niveau inséré au milieu aurait décalé tous les exercices de tous les actes, en
silence. La recherche se fait par id ; « poser en fin de tableau » reste une
bonne pratique mais n'est plus load-bearing. Et **un niveau ne se supprime
jamais** — il cesse d'être cité.

**CHANTIER A TERMINÉ. Compteur d'orphelins : 29 → 20**, 41 niveaux joués sur 61
contre 32 à l'audit, sans qu'un seul niveau ait été écrit de zéro. Les 20 qui
restent le sont chacun pour une raison écrite (voir PLAN.md, tranche 3) — plus
aucun par accident.

**Chantier B — tranche 1 FAITE (2026-08-28).** L'acte 2 est la première commande
qui TRANSFORME : l'Atelier s'ouvre sur le rythme du niveau 17 que le joueur
vient de reproduire, et le cahier de Kelvin a été réécrit contre ce rythme —
check-list à **0/4** à l'ouverture, mesuré dans l'appli.

⚠️ **Le conflit à ne pas rouvrir.** Deux règles écrites disaient « une commande
part d'un Atelier vide ». Elles ne sont pas annulées : ce qu'elles interdisent
est une case cochée d'avance, pas un Atelier non vide. Partir d'un rythme est
permis **à condition que le cahier exige ce que ce rythme n'a pas**, et
`tests/transformer.test.ts` est cette condition. Deux corollaires trouvés en
route : `Contrainte.interdit` (une interdiction est légitimement cochée au
départ) et le fait qu'un état « qui satisfait tous les cahiers » n'existe pas —
la fiche techno veut un charley plein, Kelvin veut un charley troué.

**Les ghost notes existent enfin.** Les niveaux 20 et 21 les annonçaient sans
que le code les pose ; le niveau 62 (« Ce qui bouge tout seul ») les fait
entendre pour de bon, cité par l'acte 2. Piège trouvé au passage : enrichir la
famille `groove` aurait fait du niveau 47 (« Swing ou décalage ? ») une question
à quatre choix dont le titre en annonce deux — sa liste est explicite désormais.

**Reste du chantier B** : les cinq autres commandes partent encore d'une table
rase. Chacune demande le même travail — choisir le rythme de départ, puis
réécrire son cahier contre ce rythme. C'est la moitié coûteuse et elle ne se
délègue pas à un test. Les ghost notes et les fills (niveaux 20, 21) attendent
toujours leur maison : un cahier sait demander « ajoute des ghost notes », une
grille ne sait pas les dessiner.

## La COURBE de difficulté — retour de testeur, 2026-08-31

> « Le jeu reste trop longtemps trop facile. »

Mesuré dans l'ordre où la carrière joue ses 42 exercices : **le premier
exercice plus dur que la fin de l'acte 1 arrivait au 33e sur 42**, et l'acte 2
était même un cran EN ARRIÈRE (24 cases sans variante contre 24 avec deux).
Chaque acte était cohérent avec lui-même ; c'est l'**enchaînement** qui ne
l'était pas, et aucun test ne le regardait.

Le niveau 63 (seize cases par ligne) donne son palier à l'acte 2 : le seuil
passe au **21e exercice**, de 79 % à 49 % du parcours. Un test empêche
désormais l'acte 2 de repasser sous l'acte 1.

⚠️ **Les « deux creux » étaient datés du 2026-08-31 et ne décrivent plus le jeu
— re-mesurés le 2026-09-14**, après la refonte de l'acte 2, les arrangements
75-78 et le remplacement des exercices de l'acte 4 par la chaîne d'envois.

- ~~« Exercices 22 à 30 : neuf d'affilée sans aucune grille »~~ — le plus long
  trou est maintenant de **trois** (les trois `melodie` de l'acte 3, 42-43-44),
  aussitôt suivi des quatre arrangements 75-78 (9, 14, 26 puis 30 coups). Ce que
  ça laisse : une **fin de parcours** sans cible écrite — `style` (58), le
  preset garage (16) et le `jouer` « à vue » (38), les trois derniers exercices
  du jeu. C'est cohérent avec les actes qu'ils servent (reconnaître, jouer),
  mais ça reste le seul endroit où la courbe ne monte plus.
- ~~« L'acte 5 repart à 16 cases puis serpente : 16, 16, 20, 40, 36, 32, 24, 24,
  28, 22 »~~ — **l'acte 5 ne compte plus que DEUX exercices** (58 et 16). La
  liste décrivait dix exercices qui n'existent plus : le serpentement a disparu
  avec eux.

**La courbe réelle, en coups par exercice, dans l'ordre joué** (un tiret = pas
de cible écrite : verbe de paramètre, mélodie, style ou frappe) : 4, 5, 13, —,
22, 23, 25, 25, 24, 26, —, 26, —, 24, —, 26, 26, —, —, —, 9, 14, 26, 30, —, —,
—. Ce qui reste à arbitrer tient en une question : **faut-il une cible écrite à
la fin du jeu**, ou la fin doit-elle se jouer plutôt que se relever ?

## Pistes ouvertes, si rien d'autre n'est demandé

Aucune n'est engagée — demander avant de plonger.

- Le découpage en ~130 exercices évoqué dans `HISTOIRE.md` (les actes en citent
  aujourd'hui bien moins).
- ~~Les quatre presets hors époque ne sont jamais commandés~~ — **c'était faux.**
  Mesuré : le verbe `style` les tirait, 39 % des parties en affichaient un et
  10 % du temps c'était la bonne réponse. Corrigé (`HORS_EPOQUE`), et le test
  existe maintenant. À retenir : « voulu mais jamais vérifié » veut dire « pas
  fait ».
- ~~L'arbitrage design A/B/C~~ (`docs/plan/04-maquettes-et-moodboards.md`) —
  **fermé le 2026-09-14 : la question a été réglée par la migration Winamp 2.x**
  du 18 août, qui est postérieure aux trois maquettes. Bliss, les barres Luna et
  le thème `noir` sont retirés, l'appli ne parle plus qu'une langue visuelle :
  l'énoncé A/B/C décrit un écran qui n'existe plus. **Ce qui en survit est A1′**,
  re-mesuré dans l'appli en marche le 2026-09-14 (390 × 844) : une ligne de
  batterie fait **121 px au DOIGT dont 34 pour les cases** — 28 % — et 99 px à
  la souris (mêmes 34), la différence étant l'écartement `coarse` du tactile.
  ⚠️ Le « 99 px » d'août était donc la mesure SOURIS ; sur un téléphone, c'est
  pire. Découpage constant : en-tête 28, cases 34, barre de pastilles 28, le
  reste en marges. L'onglet Rythme fait **1 792 px de haut au doigt** (2,1
  écrans) et les cases y pèsent **9 %**. Les chips *Séquence / Timbre / Filtre &
  espace* sont encore là, une barre par ligne (`DrumRowView.svelte`,
  `SynthRowView.svelte`) ; l'antidote nommé par l'audit est le panneau
  sérigraphié — étiquettes à même la surface, réglages en surcouches.
- ~~**Le Mode Live reste à l'acte 7**, jamais essayé en paysage~~ — **traité.**
  Le concert s'y joue maintenant (`EtapeScene`), et le mode a été mesuré en
  844 × 390 avec pointeur tactile : une seule commande sous 44 px de zone
  touchable, aucun débordement. ✅ **Et essayé sur un VRAI téléphone en paysage
  le 2026-09-14 — rien à redire.** La mesure émulée disait vrai.
- **Rien ne traverse les appareils** : téléphone et ordinateur sont deux joueurs
  distincts. Un « code de reprise » encodant la progression comme `share.ts`
  encode un rythme réglerait ça — chantier à part, non engagé.
