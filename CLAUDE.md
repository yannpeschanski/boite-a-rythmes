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
c'est ce qui rend l'export MP3 reproductible à l'octet près. Ne pas changer l'ordre
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

**Le Mode jeu a quatre VERBES, pas un.** `ExerciseKind` (`src/model/exercises.ts`)
discrimine ce qu'on demande au joueur — `reproduire` (les 34 niveaux de la
campagne), `completer`, `intrus`, `jouer` — là où les niveaux, eux, ne font varier
que les *paramètres* du rythme. La partie PURE de la notation vit dans ce fichier :
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

**Tout état réactif n'est pas de l'état de morceau.** Deux modules d'interface
vivent délibérément **hors** du format v2 : `ui/xp/paramHints.svelte.ts` et
`ui/atelier/lastTouched.svelte.ts` (la dernière ligne manipulée, qui alimente le
bandeau LCD du séquenceur). Ils ne se sérialisent pas, ne passent pas dans
l'historique d'annulation, et le moteur audio ne les lit jamais. C'est le bon
domicile pour ce genre d'état — ne pas les faire remonter dans `model/types.ts`.

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
