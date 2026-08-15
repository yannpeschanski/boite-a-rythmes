# Boîte à rythmes — contexte du projet

Séquenceur / boîte à rythmes web, au design rétro Windows XP. Réécriture d'un
fichier HTML unique de 9 289 lignes vers Svelte 5 + TypeScript + Vite.

## Commandes

```bash
npm run dev              # serveur de dev (http://localhost:5173)
npm test                 # Vitest — modèle et moteur audio
npm run check            # svelte-check (types) — doit rester à 0 erreur
npm run build            # site déployable        -> dist/
npm run build:singlefile # fichier HTML autonome  -> dist-singlefile/index.html
```

## Règles importantes

**Le design Windows XP est voulu, pas un héritage à moderniser.** Barres de titre
Luna, reliefs, fond « Bliss » : c'est l'identité du projet. Ne propose pas de le
« rafraîchir ».

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
d'itération des lignes dans le scheduler (kick → snare → hat → bass → pad → melody),
il détermine l'ordre de consommation du générateur.

**Le format d'état v2 (`src/model/types.ts`) est le contrat central.** Stores, moteur,
sérialisation, presets et undo/redo parlent tous cette forme. Elle est compatible avec
les fichiers de sauvegarde de la version d'origine (v1 et v2) — ne pas casser
`deserialize`.

## Architecture

```
src/model/    état v2 typé, sérialisation, données (34 presets, 34 niveaux, gammes, voix)
src/engine/   moteur audio TypeScript pur — aucune dépendance UI
src/stores/   état réactif en runes Svelte 5 (pattern, jeu, historique, partage)
src/ui/       design system XP + vues Atelier et Mode jeu
```

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

**Avant chaque commit :** `npm run check` (0 erreur), `npm test`, `npm run build`
+ `npm run build:singlefile`. Pour un changement d'UI : lancer le serveur de dev
et vérifier visuellement au moins une fois avec Playwright (headless, Chromium à
`/opt/pw-browsers/chromium`, driver global à `/opt/node22/lib/node_modules/playwright`)
avant de considérer le changement terminé.

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
