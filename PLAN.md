# Plan de réécriture — « Boîte à rythmes » vers Svelte 5 + TypeScript + Vite

> Contexte : réécriture de `original/boite-a-rythme-69.html` (9 289 lignes, fichier unique).
> Analyse détaillée de l'original : voir [ANALYSE-ORIGINAL.md](ANALYSE-ORIGINAL.md).
>
> **Décisions fermes** : Svelte 5 + TS + Vite · distribution double (site + fichier HTML unique via vite-plugin-singlefile) · périmètre complet Atelier + Mode jeu (iso-fonctionnalités puis améliorations) · abandon du code dormant (ambiance splash, ~~verrouillage des modules~~ — voir ci-dessous) · design Windows XP conservé et assumé davantage.
>
> ⚠️ **Correction du 2026-08-16** : le « verrouillage des modules » n'était pas
> du code dormant mais une fonctionnalité **en attente d'arbitrage**, dite
> telle quelle dans l'original (`return true` + « TEMPORAIRE… le temps de
> décider comment relier réellement les modules à la progression du Mode
> jeu »). Yann vient de trancher cette question (D2) : la fonctionnalité
> revient. *Dormant* et *abandonné* ne sont pas synonymes — voir
> [Arbitrages D1-D4](#arbitrages-de-yann-sur-d1-d4--2026-08-16).
>

## 🧭 Brief de reprise — au 2026-08-21

**À lire en premier, en entier. Trois minutes.** Le reste fait 5 000 lignes et
une trentaine de sections datées : n'y descends que pour le détail d'un point,
en suivant les liens en fin de brief.

### Où en est le projet

Site en ligne : <https://boite-a-rythmes.vercel.app> · tout est mergé sur `main`
(`0911ac4`), arbre propre. `npm run check` 0 erreur · **119 tests** · les deux
builds passent · déploiement Vercel vérifié.

L'appli est **testée sur téléphone** (arbitrage D4) : le desktop reste en friche
et assumé. Toute mesure d'interface se fait à **390×844**, vérifiée de 320 à 1280.

⚠️ **La direction visuelle est tranchée et livrée** — skin Winamp 2.x pour tous
les modes, une seule langue visuelle. Ne pas rouvrir : `CLAUDE.md` fait foi.

### La grande affaire de la dernière session : le Mode jeu

Il est passé **d'un seul verbe à sept**, et de 34 niveaux à 41. Neuf PR (#87 →
#95), toutes détaillées en fin de document.

| Verbes de GRILLE | Verbes de PARAMÈTRE |
|---|---|
| `reproduire` (les 34 niveaux d'origine) | `lequel` — entendre la direction d'un bouton |
| `completer` — un temps vidé à retrouver | `nommer` — mettre un nom sur ce qui a changé |
| `intrus` — quatre mesures, une diffère | `regler` — viser un son, pas un chiffre |
| `jouer` — frapper en rythme, noté au placement | |

Les quatre verbes de grille sont **validés par Yann** (« ça a très bien
fonctionné là »). Les trois verbes de paramètre sont livrés en pilotes (niveaux
39-41, famille Timbre) mais **pas encore essayés par lui**.

⚠️ **Cinq symptômes rapportés, cinq causes qui n'étaient pas là où on
regardait** — et aucune n'était un réglage de difficulté. C'est la leçon
principale de la session, détaillée à l'étape « les quatre pilotes sont
validés » : `outputLatency` absent de WebKit, une avance de déclenchement qui
mangeait l'attaque des voix, un métronome de calibrage qui ne durait que 7 s et
jetait les frappes en silence, une note qui moyennait tout le tour au lieu de
retenir la meilleure mesure. Les règles qui en sortent sont dans `CLAUDE.md` —
**les lire avant de toucher à la latence ou à la notation**.

### ✅ ARBITRÉ — le scénario est la colonne vertébrale du Mode jeu

Yann, le 2026-08-23 : *« on part sur le scénario pour le moment pour développer
le mode jeu »*. L'architecture proposée plus bas est donc **tranchée sur ses
deux premières questions**, et la première tranche est livrée.

**L'état d'aujourd'hui, en trois phrases.** Le Mode jeu s'ouvre désormais sur le
**Mode carrière** : les huit actes de [`HISTOIRE.md`](HISTOIRE.md), dont les
trois premiers sont jouables. Les 41 niveaux ne sont plus la campagne, ils sont
la **salle de répétition**, toujours atteignable d'un bouton. Les modules
s'ouvrent parce qu'un acte en a besoin — l'acte 1 « Le rythme » ouvre l'Atelier
— les anciens seuils de niveau restant un plancher pour ne priver personne.

Détail complet, avec ce qui a été fait AUTREMENT que proposé :
[« Mode carrière — la charpente en huit actes »](#-mode-carrière--la-charpente-en-huit-actes-actes-0-à-2-jouables-2026-08-23).

**Ce qui reste à trancher** : les questions 3 (le joueur compose-t-il ou
reconstruit-il ?) et 4 (le public change-t-il le jugement ?) de la proposition.
Elles portent sur les actes 4 et 6, pas encore écrits — rien n'est bloqué par
elles aujourd'hui.

**Le prochain pas le moins cher : l'acte 5, « Les styles ».** Quinze genres à
reconstruire, et les 34 presets existent déjà. Les actes 3, 4 et 6 demandent du
mécanisme neuf (le synthé, le contrôle de mix mesuré, la notation d'une
composition sur son brief) ; le 5 ne demande que du contenu.

### Ce qui attend aussi une décision (ne pas coder sans)

1. **Où poser l'entrée du calibrage de latence dans l'Atelier** — menu
   Affichage, menu Aide, ou onglet Production ? Le réglage vaut désormais pour
   toute l'appli, mais n'est atteignable que depuis les niveaux « jouer ».
2. **La grille de déverrouillage contrôle par contrôle** — proposition écrite et
   retenue par Yann (rafale niv. 11, swing 14, ghost 20, fill 21, décalage 23),
   **prête à appliquer**. Mais elle serait à revoir si l'architecture EP passe.
3. **La famille « Séquence » des jeux de paramètre** — *Pas* et *Coups
   euclidiens* changent la grille, donc font doublon avec « reproduire », et
   *Volume* seul est un mauvais exercice d'oreille. Je propose de la fondre dans
   les verbes existants plutôt que de lui faire des jeux à part.
4. **`ui/xp/systemSounds.ts`** — les sons système XP ne collent plus à la
   direction, mais `AtelierView` et `ToolBar` s'en servent encore.

### Chantiers ouverts, hors décision

- **L'extension du Mode jeu au synthé** — le gros morceau. `GameDrumRowName` ne
  connaît que kick/snare/hat ; `CLAUDE.md` impose de **cartographier tous les
  points de contact avant de coder**.
- **Les familles Filtre & espace, Groove** — la première est déjà décrite dans
  `model/parametres.ts` et ne demande qu'un niveau ; la seconde exige d'étendre
  le catalogue à l'état **global** (swing, traîne…) et non à la ligne.
- **Le Mode Live est à reprendre — APRÈS le Mode jeu**, demandé par Yann avec cet
  ordre explicite. Beaucoup a bougé sans passe d'ensemble.
- **B6** — mise en page du splash et du Mode jeu (contenu collé en haut, ~70 % de
  vide).
- **Le biseau en haute densité** — jamais vérifié sur un vrai appareil.

### Les pièges qui ont coûté le plus cher, et qui reviendront

- **Un module pur et testé peut être branché sur une valeur morte.**
  `synthStepAt` était un objet non réactif : le pad d'écriture n'a **jamais**
  quantifié pendant la lecture. Quand le calcul est juste et le comportement
  faux, **suspecter le câblage**.
- **Un test qui dépend de `Math.random()` doit affirmer ce qui est vrai à CHAQUE
  tirage**, et répéter (60 fois). Une assertion à un tirage est passée en local
  et sur la PR, puis a échoué sur `main` — build non produit, **déploiement
  sauté, site inchangé**.
- **Vert sur la PR ≠ vert sur `main`.** Après un merge, vérifier le run de
  `main` ET le job « Déploiement Vercel » (`success`, pas `skipped`).
- **`npm run check` APRÈS avoir écrit les tests**, pas avant : `svelte-check`
  vérifie aussi `tests/`.
- **Le squash-merge décale le SHA** : `git fetch origin main && git checkout -B
  <branche> origin/main` avant tout nouveau commit.

### Où trouver le détail

- [Architecture du Mode jeu — proposition](#-architecture-du-mode-jeu--proposition-en-attente-darbitrage-2026-08-21)
  — **le sujet en cours**, avec les quatre questions à trancher.
- [Les quatre pilotes sont validés](#-les-quatre-pilotes-du-mode-jeu-sont-validés-2026-08-21)
  — le tableau symptôme/cause réelle, à lire avant de toucher au Mode jeu.
- [Décision Winamp 2.x](#-décision--winamp-2x-pour-tous-les-modes-2026-08-18)
  — l'argument et les douze étapes de mise en œuvre.
- [§7.5 dette d'interface](#75-dette-dinterface--section-permanente-créée-le-2026-08-15-audit-c2)
  — les trois règles d'écriture, dont « un ✅ n'est pas définitif ».

---


## 1. Architecture cible

### Principe directeur

**Le JSON v2 devient le modèle d'état central.** Aujourd'hui, `exportState()` *collecte* l'état depuis le DOM (`el.swing.value`, etc.) ; dans la cible, on inverse : l'état vit dans des stores Svelte typés dont la forme **est** le format v2, l'UI en dérive, et export/import/undo/autosave deviennent triviaux (`JSON.stringify(state)`).

**Le moteur audio est du TS pur, sans import Svelte.** Il reçoit : (a) un `BaseAudioContext` (live `AudioContext` ou `OfflineAudioContext` — même code), (b) un *snapshot* d'état plain-object (via `$state.snapshot()` côté Svelte), (c) un RNG injecté (Math.random en live, seedé en export). Il ne lit jamais le DOM.

### Arborescence — SUPPRIMÉE le 2026-08-15 (audit C6)

> L'arborescence « cible » qui vivait ici décrivait un dépôt qui n'a jamais
> existé : 26 fichiers planifiés jamais écrits (`clock.ts`, `sidechain.ts`,
> `theory.ts` — devenu `harmony.ts` —, `transport/session/ui.svelte.ts`,
> `XpButton/XpCheckbox/XpSelect/XpBalloon/XpMenuBar`, `StepGrid/StepCell`,
> les 7 modules d'atelier, les 5 composants de jeu, les 2 fichiers de
> thème…), et à l'inverse aucune mention de `ui/live/` — ~3 270 lignes, la
> plus grosse surface d'UI du projet. Le code a mieux tourné que le plan ;
> le problème était qu'un bloc intitulé « Architecture cible » fasse
> autorité alors qu'il était faux depuis longtemps.
>
> **La vraie arborescence se lit dans `src/`**, et les trois unifications
> qui comptent vraiment sont dans `CLAUDE.md` (un builder de graphe, un
> scheduler, un modèle d'état) — au bon endroit, celui que tout le monde
> lit avant de coder. Elles restent détaillées ci-dessous pour le
> « pourquoi ».

### Unifications clés (réponses aux duplications)

**Un seul scheduler.** Cœur pur : `scheduleWindow(fromTime, toTime, state, rng, emit)` qui calcule les événements (note, temps, gain, voix, ghost?) et les passe à `emit`. Trois consommateurs :
- *Live atelier* : `clock.ts` tick 25 ms, `emit` → `voices/*` sur l'AudioContext + push dans la file de playhead visuel (rAF, inchangé dans l'esprit).
- *Jeu* : même scheduler avec un état restreint (3 lignes drum + `gameParams` de shift/groove) — `gameScheduler` disparaît. Les offsets spécifiques (`gameRowOffset`) deviennent des paramètres du state.
- *Offline* : boucle `while (t < duration) scheduleWindow(t, t+chunk, …)` — plus de setInterval, plus de duplication de la boucle synthé live/offline.
- Le `splashScheduler` disparaît (code dormant abandonné, décision 4).

**Un seul builder de graphe.** `buildGraph(ctx, state)` retourne un objet `GraphNodes` (finalStage, masterGain, drumLineGain, synthLineGain, limiters, sends, duckGains, sharedReverb/Delay, noiseBuffer…) **possédé par une instance `AudioEngine`**, jamais par des globales. L'export devient : `new AudioEngine(new OfflineAudioContext(...), snapshot)` → adieu le bloc `prev = {…18 globales…}`. C'est aussi ce qui rend le choke du hat sûr : `activeOpenHat` devient un champ d'instance.

**Un seul cercle.** `StepCircle.svelte` avec props `{rows, colors, playhead, editable, onCellTap, dirty}` — `drawCircle`/`drawGameCircle` et `stepFromEvent`/`stepFromEventOnCanvas` fusionnent.

**Une seule couche state↔UI.** Plus aucune fonction `reflectXxxUI`/`setSliderValue`/sync ×3 : `<XpSlider bind:value={pattern.swing}>` et c'est tout. `loadPreset` (170 l.) devient `pattern.replace(presetToState(preset))` ; la réactivité fait le reste. Le HTML synthé triplé devient `{#each ['bass','pad','melody'] as line}<SynthModule {line}/>{/each}`.

**Partage atelier/jeu.** Le jeu manipule deux `PatternStateV2` partiels (cible cachée + proposition du joueur) et instancie le même `AudioEngine`. `saveGameRhythmToAtelier` = merge des 3 lignes drum dans `pattern.svelte.ts`.

**Les commentaires « pourquoi »** migrent avec le code : chaque fonction portée garde son bloc de commentaire d'origine (ratios 808/909, choix du seuil de limiteur, pourquoi ±50 decay resserré, etc.). C'est un critère de revue de chaque phase.

---

## 2. Design system XP

### Tokens (`ui/xp/tokens.css`)

```css
:root[data-theme="luna"] { /* atelier, beige clair */
  --xp-face: #ece9d8; --xp-title-grad: linear-gradient(#0058e6,#3a93ff,#0058e6);
  --xp-border-raised: inset -1px -1px #808080, inset 1px 1px #fff;
  --xp-accent-amber / -violet / -teal   /* les 3 familles de modules */
  --xp-font: "Tahoma", "Pixelated MS Sans Serif", sans-serif; …
}
:root[data-theme="noir"] { /* jeu, chrome sombre existant */ … }
```
Le thème se pose sur le conteneur de vue → le mode jeu garde son identité sans sur-spécificité CSS. Toutes les couleurs/reliefs/espacements du CSS actuel (l. 11–1032) sont convertis en tokens ; les règles deviennent plates.

### Composants

- **XpWindow** (props : `title, icon, accent, collapsible, closable`) avec **XpTitlebar** (_ □ ×) — le « _ » replie réellement (état dans `ui.svelte.ts`), le « × » ferme les fenêtres optionnelles.
- **XpMenuBar/XpMenu** : Fichier/Édition/Affichage actuels + entrées nouvelles (Édition → Annuler/Rétablir, Affichage → thème, raccourcis).
- **XpSlider** : port fidèle des ~170 lignes maison (loupe flottante, mode précis vertical, tap = saisie clavier) en un composant + une action ; ajouté : flèches clavier, `role="slider"` + `aria-valuenow`.
- **XpButton, XpCheckbox, XpSelect, XpTabs, XpBalloon**, `actions/longpress.ts` (port du long-press générique).

### Pousser le look XP plus loin — ⚠️ SOUS CONDITION depuis le 2026-08-15 (audit C3)

> **Condition d'entrée, à vérifier avant de coder l'une de ces idées.** Elles
> ajoutent TOUTES du chrome permanent, alors que l'audit de design a mesuré
> que le chrome occupe déjà **64 % du premier écran mobile** avant la
> première case jouable (constat A1). Tant que ce budget n'est pas rétabli,
> aucune n'est à prendre : ce ne sont pas des idées mortes, ce sont des
> idées **bloquées derrière A1**. Et quand elles reviendront : desktop
> uniquement, jamais sur la vue tactile.
>
> Sans cette condition écrite, elles finiront codées un jour « parce
> qu'elles étaient dans le plan » — et l'écran mobile empirera d'autant.

- ⚠️ **Fenêtres déplaçables sur desktop uniquement** (`actions/draggable.ts`, activé par media query pointer:fine ; en mobile les fenêtres restent en flux vertical comme aujourd'hui). Bonus faible coût, grand effet.
- ✅ **Sons système synthétisés** — fait (`ui/xp/systemSounds.ts`, voir §6). Seule entrée de cette liste qui n'ajoutait aucun pixel : c'est aussi pour ça qu'elle a pu passer sans arbitrage.
- ⚠️ **Curseurs souris XP** (curseurs CSS inline SVG, desktop uniquement), **bulles d'aide XpBalloon** pour remplacer les tooltips natifs — noter que les explications par paramètre (§7.4) ont finalement été rendues *dans* `XpSlider` plutôt que via un composant `XpBalloon` dédié, qui n'existe pas ; **écran de démarrage** façon boot pour le splash, éventuellement une **barre des tâches** en bas sur desktop montrant les fenêtres réduites.
- Police : Tahoma avec fallback ; via fontsource, une pixel-font d'appoint pour les titres si souhaité (auto-hébergée). *(Neutre en chrome — pas concerné par la condition.)*

---

## 3. Ordre de migration — ARCHIVÉ le 2026-08-15 (audit C7)

> Le découpage en 6 phases avec pourcentages (« Phase 0 — Socle ≈5 % »…)
> et le ratio port/réécriture 55/45 ont piloté la migration jusqu'à son
> terme. **La migration est finie** : ces repères ne décrivent plus aucun
> travail à venir et fausseraient toute lecture du reste du document.
> Conservé en une ligne pour mémoire : les phases 0 à 6 ont toutes été
> livrées, et le projet est depuis longtemps allé au-delà (Mode Live,
> clap/shaker, bourdon, banque de séquences, euclidien, explications par
> paramètre, sons système).
>
> **Conséquence sur la « source unique de vérité ».**
> `original/boite-a-rythme-69.html` reste la référence **pour les
> constantes et les choix audio uniquement** (ratios 808/909 du banc du
> hat, plafonds de release, seuils des limiteurs, valeurs de decay
> resserrées) — c'est ainsi que `CLAUDE.md` le formule, et c'est la bonne
> portée. Ce n'est **pas** une référence d'interface : la grammaire
> « panneau de configuration » critiquée dans l'audit de design du
> 2026-08-15 vient précisément de là. Ne plus s'y référer pour l'UI.

---

## 4. Améliorations au-delà de l'iso-fonctionnalité

- **ScriptProcessorNode → AudioWorklet** (recommandé plutôt que MediaRecorder : WAV sans perte, pas de dépendance codec navigateur, latence maîtrisée ; MediaRecorder produirait du webm/opus, changement de fonctionnalité). Worklet inline (`?worker&inline`-équivalent via Blob URL) pour rester compatible singlefile.
- **lamejs** : `@breezystack/lamejs` en dépendance npm, importée **dynamiquement dans un Worker** au premier clic export — plus de script CDN bloquant, plus de `typeof lamejs === 'undefined'`. En build singlefile, le worker est inliné.
- **Polices auto-hébergées** via fontsource (plus de Google Fonts CDN).
- **Raccourcis clavier** : Espace lecture/stop, B break, Ctrl+Z/Y, 1/2/3 mute lignes, flèches sur cellule focusée, ? = aide-mémoire dans une XpWindow.
- ❌ **Accessibilité — JAMAIS FAITE, sorti des acquis le 2026-08-15 (audit C5).**
  Cette ligne était écrite au passé au milieu d'améliorations livrées, donc
  invisible comme reste-à-faire. Compté dans le code le 15/08 :
  `role="grid"`/`gridcell` → **0**, `aria-pressed` → **0**, label par pas
  (« Kick, pas 5, actif, roll ×2 ») → **0**, `prefers-reduced-motion` →
  **0**. Seul `XpSlider` a bien reçu son `role="slider"` + `aria-valuenow`
  (§2). Le reste est à faire ou à assumer comme non-objectif — mais plus à
  laisser passer pour acquis. Promu en entrée de backlog : voir §7.5.
- **Autosave** : snapshot du pattern (format v2) debouncé 1 s dans localStorage + proposition « Restaurer la session précédente ? » au démarrage — sans casser la philosophie actuelle (pas d'écrasement silencieux).
- **Undo/redo** quasi gratuit : `history.svelte.ts` empile `$state.snapshot(pattern)` (≤100 entrées, coalescence des drags de slider).
- **Robustesse** : `unhandledrejection` en plus de `onerror`, plus d'`escapeHtml` nécessaire (Svelte échappe par défaut), scheduler optionnellement piloté par un Worker-clock (immunisé au throttling arrière-plan ; on garde la pause sur `visibilitychange` en réglage).
- **Tests** : Vitest sur `model/` et `engine/` (théorie musicale, buildChordsForScale, générateur de niveaux avec seed, similarité, sérialisation/migration, groove). **Déterminisme d'export en 2 étages** : (1) rapide, en CI — snapshot JSON de la liste d'événements schedulés à seed fixe (pur, sans Web Audio) ; (2) profond, Playwright — rendu OfflineAudioContext réel dans Chromium, hash SHA du Float32Array (stable pour une même version de navigateur, épinglée en CI). Le (1) attrape 95 % des régressions pour presque rien.
  - ✅ **Étage (1) fait le 2026-08-15** (audit C4 — prévu ici dès le départ,
    jamais écrit pendant trois semaines alors que c'était le seul filet sous
    l'invariant le plus dur de `CLAUDE.md`). `tests/scheduler.test.ts` :
    faux `DrumKit`/`SynthKit` qui enregistrent les appels au lieu de produire
    du son, rejouant EXACTEMENT la boucle de `renderPattern` (mesure par
    mesure, drum puis synthé, mêmes curseurs, même RNG seedé) — donc aucun
    Web Audio, ~13 ms en CI. Cinq tests : reproductibilité à graine égale,
    divergence à graine différente (sinon le premier serait vide de sens),
    **ordre d'itération figé**, instantané de référence de la séquence
    complète, et « une ligne au motif vide ne consomme aucun tirage quel que
    soit son nombre de pas » (la propriété sur laquelle reposait l'ajout de
    clap/shaker, §6 — vérifiée en faisant varier les pas de 4 à 32 plutôt
    qu'en comparant à un code disparu). **Validé par régressions
    simulées** : réordonner deux lignes fait tomber 2 tests, et ajouter un
    `rng()` sans effet audible en fait tomber 1 — c'est exactement le
    scénario silencieux que rien n'attrapait. Au passage, `CLAUDE.md` citait
    encore l'ordre à six lignes d'avant clap/shaker : corrigé.
  - Étage (2) (hash du rendu offline réel sous Playwright) : toujours pas
    fait. Moins urgent maintenant que (1) existe.
- **CI** : lint + tests + build site + build singlefile + budget de taille du fichier unique (échec si > seuil).
- **PWA optionnelle** (vite-plugin-pwa, build site uniquement) — la version singlefile EST déjà l'offline de secours.
- **Incohérence MAXSTEPS 32 vs 128** : ne pas unifier les modèles pendant la migration (risque de régression) ; documenter dans `types.ts` deux types distincts `DrumRow`/`SynthRow`, et traiter l'unification comme amélioration post-v1 si souhaitée.

---

## 5. Risques et pièges

- **Autoplay policies** : conserver le rôle du splash comme geste de déverrouillage (`unlockAudioBuffer` l. 8809) ; `AudioEngine` doit `resume()` sur chaque geste de lecture et exposer l'état `suspended` à l'UI.
- **Déterminisme de l'export après refactor** : le PRNG seedé est consommé dans un ordre précis ; si le nouveau scheduler réordonne les appels (ex. itérer les lignes dans un autre ordre), le rendu change. Parade : figer l'ordre d'itération (kick→snare→hat→bass→pad→melody, colonnes croissantes), et le test de snapshot d'événements de la phase 2 le verrouille. Comparer aussi un MP3 ancien/nouveau à seed égale à l'oreille.
- **OfflineAudioContext** : pas de `setInterval` pendant le rendu (déjà géré, à préserver dans `clock.ts`) ; attention aux nœuds au comportement légèrement différent offline (DynamicsCompressor a un état interne — le graphe neuf par rendu, comme aujourd'hui, est la bonne approche) ; garder le `maybeYield` (l. 4400) pour ne pas geler l'UI pendant l'encodage.
- **iOS Safari** : sampleRate imposé par le matériel (ne jamais supposer 44100 en live ; l'offline peut le fixer), interruptions d'appel (`statechange` → resume), préfixe `webkitOfflineAudioContext`, AudioWorklet OK depuis iOS 14.5 mais tester le recorder en vrai ; la loupe des sliders utilise des événements pointeur — retester le `touch-action`.
- **Bundle singlefile** : lamejs en import dynamique s'oppose à l'inlining — solution : worker inliné + `build.rollupOptions` sans code-splitting en mode singlefile ; viser < 1,5 Mo (l'original fait ~450 Ko, Svelte compile petit, lamejs ~150 Ko) ; le budget CI le surveille.
- **Régressions de feel** — les points chauds identifiés : timing lookahead (garder 25 ms/0,25 s), **choke du hat** (état `activeOpenHat` par instance, testé : ouvert puis fermé sur le même pas → choke), **sidechain** (le duck doit s'appliquer au temps schedulé, pas au temps courant), enveloppes de decay resserrées (commentaire l. 3646 — à préserver), budget 40 voix, limiteurs par ligne présents dans l'export.
- **Checklist A/B iso-fonctionnalité** (à dérouler en fin de phases 3/4/5, original ouvert dans un onglet voisin) : charger le même JSON v2 dans les deux, écouter à l'aveugle 5 presets contrastés ; exporter le même pattern en MP3 à seed égale et comparer ; vérifier : polyrythmie 3/4/5 pas, rolls ×4, rim, hat ouvert→choke, Break, fills toutes les N mesures, ghost notes, sidechain audible, arpégiateur, glide/strum, justesse affichée, similarité « morceau le plus proche », niveau 1 et niveau 34 du jeu, étoiles/roast/besace, import d'un fichier v1, comportement en arrière-plan, mobile (long-press, loupe slider, cercle tactile).

---

## 6. Features en plus — idées au-delà de l'iso-fonctionnalité

Classées par rapport effort/effet. Les ⭐ sont celles qui collent le mieux à l'esprit de l'app (XP + pédagogie + fun).

### Petites (quelques heures chacune, gros effet)
- ✅⭐ **Partage par URL** — fait (`stores/share.ts`), pas marqué à l'époque : le pattern compressé dans le hash de l'URL.
- ✅⭐ **Tap tempo** — fait (`ToolBar.svelte`, bouton 👆 Tap tempo), pas marqué à l'époque.
- ✅ **Métronome + précompte** avant l'enregistrement WAV (palier 1 du
  backlog priorisé du 13/08, item 4/5). Une mesure 4/4 de clics au tempo
  courant (`AudioEngine.countIn`, premier temps accentué) avant que
  `startLiveRecording` ne commence à capturer — le précompte standard de
  n'importe quel logiciel d'enregistrement, qui manquait complètement.
  Nouveau `engine/metronome.ts` (`scheduleClick`) : connecté DIRECTEMENT à
  `ctx.destination`, jamais au graphe de mixage (`finalGain`, le point de
  capture de `LiveRecorder`) — audible au performer, jamais dans le WAV
  capturé, même si précompte et début d'enregistrement se chevauchaient
  d'une frame. `doRecordLive()` (`ExportBar.svelte`) affiche le décompte
  dans son `status` existant (« Précompte… 1 » → 2 → 3 → 4) via le
  callback `onTick` de `countIn`, sans dupliquer le calcul du tempo — le
  prop `engine` élargi d'une méthode plutôt qu'un nouveau prop dédié.
  Scope volontairement limité à l'enregistrement du DIRECT (capture
  réelle) : l'export MP3/WAV classique est un rendu offline déterministe,
  pas une prise à préparer. Vérifié par script Playwright : séquence de
  statuts observée = Précompte… → 1 → 2 → 3 → 4 → Enregistrement en cours.
- ✅⭐ **Sons système XP** synthétisés (retour de Yann : « sons système XP
  maintenant »). Nouveau module `ui/xp/systemSounds.ts` — chirps Web Audio
  courts, contexte audio dédié séparé de toute instance `AudioEngine`
  (`XpWindow`, composant générique réutilisé partout, ne doit dépendre
  d'aucun graphe audio précis). Portée précisée par rapport au libellé §2 :
  « étoile gagnée » est en réalité déjà couverte par `playWinChime` (Mode
  jeu, §7.3 — tier 1/3 essais = exactement le cas 3 étoiles) et reste un
  son de *gameplay* propre à son moteur, pas rattaché à ce nouveau réglage ;
  ce qui restait vraiment à faire — repli/dépliage de fenêtre et erreur —
  est fait : chirp montant/descendant sur `XpWindow` replier/déplier
  (gardé derrière un test d'état pour qu'un clic répété sur le même bouton
  ne le rejoue pas), chirp grave (carré, plus dur) sur fichier illisible à
  l'import (`AtelierView.importJson`). Désactivable — persisté en
  localStorage, activé par défaut — bascule dans Affichage ▸ Sons système
  de la barre de menus (`ToolBar.svelte`).
- ✅ **Générateur euclidien** (retour de Yann : « next ! », choisi parmi les
  idées §6 restantes). Bouton « répartir N coups uniformément » par ligne —
  `euclideanRhythm(steps, pulses)` (nouveau, `engine/generators.ts`),
  algorithme de Bjorklund par bissection de groupes homogènes (pas la
  récursion originale, même résultat, plus lisible) ; testé contre le motif
  canonique E(3,8) (tresillo cubain) et des cas limites (0 coup, autant de
  coups que de pas), voir `tests/model.test.ts`. `applyEuclideanRhythm`
  remplace tout le contenu de la ligne (état simple, pas d'accent/rim) et
  réinitialise les rafales. UI : slider « Coups euclidiens » + bouton
  🔵 Répartir dans le fieldset Séquence de chaque ligne drum
  (`DrumRowView.svelte`) — nombre de coups gardé en état de composant
  local (pas un champ du pattern), même logique que `fillRate` côté
  Synthé (`SynthModule.svelte`).

### Moyennes (une à quelques journées)
- ⭐ **Mode Song / chaînage de patterns** : 4 slots A/B/C/D + une timeline simple (AABA…) — la demande n°1 de toute boîte à rythmes. Le modèle d'état sérialisable rend ça peu coûteux (un slot = un `PatternStateV2`).
  - ✅ **Sous-brique plus simple, retour de Yann 2026-08-13, faite le jour
    même (« pars sur les niveaux 1 »)** : « mettre en banque plusieurs
    séquences dans l'Atelier et pouvoir basculer de l'une à l'autre depuis
    le Mode Live ». C'est le Mode Song SANS la timeline auto-enchaînée
    (AABA…) — juste une bibliothèque de patterns nommés. Nouveau store
    partagé `stores/bank.svelte.ts` (`sequenceBank`, classe `$state`
    minimale : `entries`, `save`/`load`/`rename`/`remove`) réutilisant TEL
    QUEL la sérialisation existante (`pattern.toJson()`/`loadJson()`, même
    mécanique que l'autosave de `stores/share.ts`) — chaque entrée est un
    JSON v2 nommé, persistée dans `localStorage`
    (`boite-a-rythme:sequence-bank`), pas de format dédié ni de cap
    arbitraire sur le nombre d'entrées.
    - **Atelier** : nouveau composant `SequenceBank.svelte`, même charte
      que `PresetPicker.svelte` juste au-dessus (select + Charger) plutôt
      qu'une fenêtre XP dédiée — même interaction (choisir dans une liste,
      charger), pas besoin de plus. `➕` sauvegarde le pattern actuel sous
      un nom (`prompt()`, comme l'erreur d'import illisible utilise déjà
      `alert()` — dialogues natifs acceptés dans ce fichier), `✏️`
      renomme, `🗑` supprime (`confirm()`) ; jamais d'écrasement silencieux,
      toujours une nouvelle entrée à la sauvegarde.
    - **Live** : nouvelle entrée « BANQUE DE SÉQUENCES » dans la liste de
      l'overlay ⚙ (à côté de VISUALISEUR), ouvre le même `picker-card` que
      les autres catalogues mais un tap CHARGE et ferme immédiatement
      (`commitBankLoad`, comme `commitViz` mais sur `sequenceBank.load(id)`
      plutôt que sur `assignments` — ce n'est pas une assignation
      persistée, rien à retenir dans `LiveAssignments`, juste un
      `pattern.replace` en direct que le scheduler relit au tick suivant).
      État vide géré (message plutôt qu'une liste blanche) plutôt que de
      cacher l'entrée tant que la banque n'a rien.
    - **Vérifié bout en bout** (script Playwright) : tempo réglé à 140 dans
      l'Atelier, sauvegardé sous « Séquence 140 », page rechargée (le
      Live démarre à 120 par défaut), rappel depuis l'overlay ⚙ du Mode
      Live → le LCD affiche bien 140 BPM immédiatement.
    - Bon point de départ pour Mode Song en deux temps : cette brique
      d'abord (banque + bascule manuelle), la timeline AABA ensuite si le
      besoin se confirme à l'usage. Pas encore fait : bouton catalogue
      dédié pour changer de séquence sans repasser par ⚙ (piste v2 si la
      liste dans l'overlay se révèle trop lente en plein set).
- ✅⭐ **Nouvelles voix drum : clap et shaker** (retour de Yann 2026-08-13 — tom
  et cowbell laissés de côté, choix explicite de Yann). Cartographie
  exhaustive faite avant de coder (25 fichiers touchés) — le moteur
  n'accueille PAS ces voix « sans changement d'architecture » comme espéré
  au départ : `DrumRowName` est un contrat central dont dépendent le
  scheduler (ordre de consommation du générateur aléatoire, contrainte
  CLAUDE.md), le Mode jeu (34 niveaux câblés en dur sur 3 lignes), le Mode
  Live (catalogue d'actions, visualiseurs), la vue circulaire et
  l'indicateur de similarité.
  - **Modèle** : `DrumRowName` étendu à `'kick'|'snare'|'hat'|'clap'|'shaker'`
    (`model/types.ts`), binaires (pas d'état 2, contrairement à snare/hat).
    Motif vide par défaut (`defaults.ts`) — ce sont des voix à découvrir, pas
    une base attendue au premier chargement. `serialize.ts` était déjà
    tolérant à l'absence d'une ligne (`if (!src) return`, repli sur
    `defaultState()`) : un vieux fichier de sauvegarde sans clap/shaker
    importe donc proprement sans rien à changer côté désérialisation —
    vérifié par un nouveau test dédié (`tests/model.test.ts`).
  - **Synthèse** (`engine/voices/drums.ts`) : `playClap` — plusieurs
    impulsions de bruit bandpass très rapprochées (les « mains » qui ne
    tombent jamais exactement ensemble sur une vraie 909) suivies d'une
    traîne plus longue pour le corps ; `playShaker` — bruit passe-haut large
    bande, pas de banc d'oscillateurs (contrairement au hat) ni de
    passe-bande étroit (contrairement au clap), enveloppe courte. Les deux
    reprennent `resolveVoice`/`pitchMult`/`decayMult`/`attackAdd`/
    `filterDest` comme kick/snare/hat, timbre réglable à l'identique.
  - **Scheduler** (`engine/scheduler.ts`) : clap suit le modèle kick/snare
    (`triggerKickSnareStep` élargie à `'kick'|'snare'|'clap'` — candidat aux
    ghost notes/fills/breaks, PAS le fill de fin de mesure réservé à la
    snare) ; shaker suit une version simplifiée du modèle hat
    (`triggerShakerStep`/`scheduleShakerRows`, nouvelles fonctions —
    binaire, pas de choke ni de rafales spontanées/fill/break, texture en
    continu plutôt qu'un élément qui « explose » avec le reste : portée
    réduite volontairement, à revoir si le besoin s'en fait sentir). Clap
    ajoutée à la boucle kick/snare existante (après, jamais entre elles) ;
    shaker programmée après le hat. Motif vide par défaut = zéro tirage
    aléatoire consommé tant qu'on n'y programme rien (le early-return sur
    pas inactif précède tout appel à `rng()`), donc les patterns déjà
    sauvegardés/exportés ne sont pas affectés par ce changement.
  - **Atelier** : deux nouvelles lignes dans le séquenceur linéaire
    (`DrumRowView`, fenêtre renommée « Kick / Snare / Hat / Clap / Shaker »),
    raccourcis clavier Mute étendus à 1-5. Bug latent corrigé au passage :
    `maxState` (nombre d'états par pas) et le switch de `AudioEngine.preview`
    présumaient tous deux « tout ce qui n'est ni kick ni snare est le hat » —
    aurait fait jouer/afficher le hat à la place de clap/shaker sans le
    correctif explicite. Couleurs dédiées `--cell-clap` (vert) et
    `--cell-shaker` (cyan) dans `tokens.css` — les deux teintes encore
    libres entre les 3 couleurs batterie et les 3 couleurs synthé
    existantes.
  - **Portée volontairement exclue de cette passe** (à reprendre plus tard
    si besoin, PAS un oubli) :
    - **Mode jeu** : les 34 niveaux restent figés à kick/snare/hat — nouveau
      type local `GameDrumRowName` (`presets/levels.ts`) utilisé par
      `GameVoice`/`LevelRhythm`/`Grid`/`Rolls` à la place du `DrumRowName`
      global élargi, pour que le jeu n'ait pas à gérer 2 lignes qu'il ne
      connaît pas. `game.svelte.ts`/`GameView.svelte` suivent.
    - **Vue circulaire** (StepCircle, Atelier) : reste à 3 anneaux — 5
      anneaux concentriques tasseraient l'anneau intérieur au point d'être
      illisible au doigt (type local `CircleRowName`, même principe).
    - **Anneau batterie compact** (TransportRings, barre de transport) :
      même raisonnement sur un canvas de 50px (type local `RING_DRUM_ROWS`).
    - **Indicateur « le plus proche »** (`similarity.ts`) : reste sur
      kick/snare/hat — avec 5 lignes le nombre de permutations testées
      passerait de 6 (3!) à 120 (5!) ; clap/shaker n'existent de toute façon
      pas dans les 34 presets.
    - **Mode Live — actions** : pas de mute/roll clap/shaker dans le
      catalogue (`liveActions.ts` inchangé) — `rollHeld`/`muted` gardent des
      entrées clap/shaker inertes juste pour satisfaire le type élargi.
    - **Mode Live — visualisation** : à l'inverse, PAS exclue : l'égaliseur
      (viz①, `LINE_EQ_POS`/`DRUM_COLOR`) et le séquenceur linéaire du Live
      affichent bien clap/shaker (ces lignes sonnent réellement en Live
      puisque le pattern est partagé avec l'Atelier — les exclure aurait
      été un vrai manque, pas juste une réduction de portée).
    - **Contenu des 34 presets** (`songs.ts`) : clap/shaker restent vides
      par défaut dans tous les presets existants — `presetAdapter.ts` ne
      les touche pas du tout, aucun changement nécessaire, `defaultState()`
      fournit déjà des lignes silencieuses.
  - Vérifié : `npm run check`/`test`/`build`/`build:singlefile` verts,
    script Playwright (clic sur une case clap/shaker + lecture 1,5s sans
    erreur console, capture des états vide/rempli) et fumée Mode Live
    (play/stop sans erreur).

- ✅⭐ **Bourdon (drone) sur la Nappe** (retour de Yann, dans la foulée de
  clap/shaker : « on peut aussi imaginer un drone dans le synthé aussi »).
  Deux approches possibles, Yann a choisi celle recommandée : un mode sur la
  ligne Nappe existante plutôt qu'une 4ᵉ ligne synthé dédiée (pas de
  changement de `SynthRowName`, `MAXSTEPS`, ni de la sérialisation des
  lignes — juste un booléen `synthGlobal.padDroneEnabled`, même
  emplacement/esprit que `padArpEnabled`).
  - **Scheduler** (`engine/scheduler.ts`) : en mode bourdon, la Nappe ignore
    `cycleBars`/`subdivisions`/`row.pattern` (inchangés, juste pas lus) —
    une seule position tenue `DRONE_BAR_SPAN` (8) mesures avant retrigger,
    sur l'accord du 1er pas (accord I si ce pas est vide, plutôt qu'un
    bourdon silencieux). Pas de rafale (`roll` forcé à 1, y compris pendant
    l'explosion d'un Break) — une rafale sur une note tenue romprait le
    principe.
  - **Pas de nouveau code de synthèse** : réutilise `SynthKit.playPadChord`/
    `playPadArp` tel quel avec une durée longue plutôt qu'un nouveau
    mécanisme de maintien indéfini — l'enveloppe existante
    (`playSynthNote`, `engine/voices/synth.ts`) tient déjà le gain au
    plateau jusqu'à `time + dur` puis relâche sur `release` : un `dur` de
    plusieurs mesures produit directement un maintien long, sans changement
    d'architecture audio. **Limite assumée** : pas un maintien VRAIMENT
    indéfini (aucun nœud audio à durée de vie découplée du scheduler dans
    ce moteur) — de longues notes retriggées toutes les 8 mesures,
    perceptivement continues sur le même accord (le retrigger est quasi
    imperceptible), pas un unique oscillateur qui tournerait sans fin. À
    revisiter si Yann trouve la coupure audible à l'usage.
  - **Atelier** : nouveau fieldset « Bourdon de nappe » dans
    `SynthModule.svelte`, juste après l'Arpégiateur — une case à cocher +
    une phrase d'avertissement (cycle/pas de la Nappe sans effet tant que
    c'est actif, pour éviter la confusion si un pas édité ne change rien
    au son).
  - **Hors scope** (comme clap/shaker, cohérence de portée) : pas de
    contrôle dédié en Mode Live pour l'instant — le champ est un `Pick`
    partiel dans `liveSynthGlobalOverride`, l'ajouter est trivial plus
    tard si le besoin se confirme.
  - Vérifié : `npm run check`/`test`/`build`/`build:singlefile` verts,
    script Playwright (bascule de la case, lecture 2,5s avec bourdon actif
    sans erreur console, capture du fieldset).
- ⭐ **Défi du jour** : un niveau généré seedé par la date (même rythme pour tout le monde, façon Wordle/Motus quotidien), avec partage du score en emojis 🟩🟨 — prolonge naturellement le mode jeu Motus existant.
- ❌ **Visualiseur façon Winamp** dans une fenêtre XP déplaçable (oscilloscope/spectre sur AnalyserNode) — abandonné, retour de Yann 2026-08-13. Ne pas reproposer.
- **Finger drumming** : jouer kick/snare/hat au clavier (A/Z/E), avec enregistrement quantifié dans la grille pendant la lecture.
- **Export MIDI** du pattern (writer MIDI ~100 lignes, aucune dépendance) — ouvre l'app vers les vrais DAW.

### Grosses (projets en soi, à décider plus tard)
- **Clippy « Rythmy »** 📎 : l'aide à la production existante (conseils contextuels) incarnée dans un assistant animé façon Clippy, avec les roasts du mode jeu — c'est LE mariage parfait design XP × contenu existant.
- **Barre des tâches + menu Démarrer** sur desktop : les fenêtres réduites s'y rangent, le menu Démarrer navigue entre Atelier/Jeu/options — pousse le délire XP au bout.
- **Écran de veille** après inactivité (logo qui rebondit, réactif au beat si lecture en cours).
- **WebMIDI out** : piloter du vrai matériel avec le séquenceur.
- **Mode radio** : enchaîne les 34 presets avec crossfade + affichage des textes historiques, façon Windows Media Player — valorise les ~880 lignes de contenu pédagogique déjà écrites.
- **Succès/achievements** branchés sur la besace existante (« 3★ sur 10 niveaux », « premier export MP3 », « 32 pas sur les 3 lignes »…).

---

## 7. Idées pas mûres (à creuser plus tard, pas encore planifiées)

Pas encore assez cadrées pour aller dans la section 6 (pas d'estimation d'effort,
parfois plusieurs pistes concurrentes). Plan d'action remis en ordre le
2026-08-12 : tout ce qui reste ouvert est listé en 7.1–7.3 par ordre suggéré,
⚠️ marque ce qui a besoin d'un arbitrage de Yann avant de coder.

### 7.1 Mode Live

Manette paysage (pavé XY + boutons assignables), esthétique Winamp (skin
violet/bleu nuit + LCD verte + accents ambre, grip pointillé sur la titlebar,
seekbar décorative). Code dans `src/ui/live/` (`LiveView.svelte`,
`liveActions.ts`). Accessible depuis la navigation normale (bouton
"🎛 Mode Live" sur le splash et le switcher).

**✅ Fait** :
- squelette + verrouillage d'orientation + flux de permission
  `DeviceOrientationEvent` (jamais testé en vrai sur téléphone — à demander
  si pas déjà fait) ;
- câblage réel : BREAK/FILL (`requestBreak`/`liveRequestFill`), MUTE K/S/H et
  ROLL×2 (overrides du scheduler `liveMute`/`forceHatRoll`, jamais écrits
  dans le pattern sauvegardé), pad XY → filtre passe-bas + envoi réverbe
  (`liveFilter`/`liveReverbSend`, neutres partout ailleurs), séquenceur
  linéaire sur le vrai pattern, viz sur vrais niveaux (`getLineLevels()`,
  un `AnalyserNode` par ligne) ;
- overlay ⚙ d'assignation : chaque bouton/axe pointe vers une définition d'un
  catalogue (`liveActions.ts`, 8 actions + 2 axes) plutôt que codé en dur,
  persisté en localStorage ;
- inclinaison assignable comme le pad (`axisTilt`), calibrée au premier
  échantillon reçu après activation (pas un zéro absolu), plage large ±35° ;
  pad et inclinaison peuvent viser le même paramètre, l'affichage reflète la
  dernière source qui a écrit ; repli tactile pur déjà garanti si le capteur
  est refusé (`tiltDenied`, mode toujours jouable) ;
- viz②/③ (arty, défilement) choisissables depuis l'overlay (`LIVE_VIZ`) ;
- bouton ⏺ REC — enregistrement WAV du live take réellement joué
  (triggers/pad/inclinaison compris), `AudioEngine.startCapture`/
  `stopCapture` (tap sur `finalGain`, start/stop au bouton plutôt qu'une
  durée fixée en mesures comme l'Atelier) ;
- viz① refaite en égaliseur : `EQ_BAR_COUNT` (22) barres façon spectre,
  chacune composée de petits segments empilés des 6 éléments (`drawVizBars`),
  pas une barre = une ligne comme avant ;
- viz③ refaite en lapin (`drawVizRunner`) : mange la carotte la plus proche
  au kick, gros saut au snare, sautille (oreilles qui frétillent) au hat —
  un déclencheur par ligne (front montant sur `getLineLevels()`) plutôt que
  le seul niveau de kick ;
- catalogue de paramètres étendu à **55 axes** (`liveActions.ts`,
  `LIVE_AXES`), largement au-delà des 12 premiers ajoutés — Yann : « il faut
  qu'on puisse assigner beaucoup plus de paramètres ». Regroupés par
  catégorie (`AXIS_GROUPS`) : GROOVE (swing, traîne, ghost notes, intensité
  de fill), BUS BATTERIE (saturation/bitcrush/compression, bus drum
  uniquement), MIX (volume, delay feedback, sidechain), et BASSE/NAPPE/
  MÉLODIE — quasi tous les réglages de voix de `SynthRowView.svelte`
  (cutoff, résonance, attack, release, sub, détune ×2, chorus, vibrato ×2,
  tone, enveloppe de filtre ×2, glide, + étalement pour la nappe). Chaque
  entrée du catalogue porte directement sa fonction d'application
  (`apply(engine, value01)`) plutôt qu'un switch dans `LiveView.svelte` :
  `LiveAxisId` est devenu une simple chaîne (catalogue trop large pour un
  union littéral géant à maintenir à la main), validée à l'exécution comme
  la persistance localStorage. Les 6 paramètres globaux restent appliqués
  directement sur les nœuds du graphe déjà construits (jamais écrits dans le
  pattern) ; groove et voix synthé sont des champs d'état simples, appliqués
  via un override relu à chaque fenêtre de scheduling
  (`AudioEngine.withLiveOverrides`, `setLiveGrooveParam`/
  `setLiveSynthVoiceParam`/`setLiveSynthRowParam` génériques plutôt qu'une
  méthode par champ) ;
- **sélection dans une liste** plutôt que le cycle pas-à-pas d'origine —
  Yann : « j'imaginais qu'on puisse choisir dans une liste assez longue ».
  Taper une ligne d'assignation ouvre un panneau scrollable par-dessus la
  carte (actions : liste plate avec couleur+description ; axes : groupés par
  catégorie) plutôt que de cycler sur place, devenu inutilisable à 55
  entrées ;
- randomisation : les deux pistes envisagées, implémentées ensemble plutôt
  que l'une ou l'autre — **CHAOS** est une entrée du catalogue d'actions
  (assignable à un bouton comme les autres) qui tire un paramètre du
  catalogue d'axes au hasard et lui donne une valeur aléatoire à chaque
  appui ; **🔀 brasser** est un bouton séparé du topbar (à côté de ⚙) qui
  réassigne tout le catalogue (6 boutons + 2 axes + inclinaison) d'un coup.

**Diagnostic ergonomie retenu** (à respecter pour tout ajout futur) : ne
jamais copier la taille des contrôles du vrai skin Winamp (pensés souris de
bureau, 10-18px) — tout ce qui est interactif en live reste large (déjà le
cas), seul le décoratif (grip, seekbar, bandes ambrées) peut rester petit.
Le bouton ⚙ est éloigné du pad (mistap en plein set), le toggle inclinaison
est sorti de la zone de drag du pad, plancher de luminosité LCD prévu pour
la lisibilité en extérieur.

**✅ Catalogue d'actions étendu de 9 à 19** (`liveActions.ts`, `LIVE_ACTIONS`),
groupées par catégorie dans le même panneau de sélection que les axes
(`ACTION_GROUPS`, même fonction `groupByCategory` réutilisée) : TRANSPORT
(break/fill/chaos), MUTES BATTERIE (déjà là), **MUTES SYNTHÉ** — nouveau,
basse/nappe/mélodie via `AudioEngine.liveSetSynthMute` (même garde-fou que
les mutes batterie : n'ajoute jamais qu'une coupure, ne démute jamais un
mute posé dans l'Atelier), **ROLL KICK** et **ROLL SNARE** — nouveau,
symétrique du roll hat déjà là (`scheduler.ts` : `forceKickRoll`/
`forceSnareRoll` sur `ScheduleContext`, même principe qu'un pas vide qui se
met à sonner tant que le bouton est maintenu), ROLL HAT (déjà là), et MIX
— nouveau, **BYPASS LIMITEURS** (`AudioEngine.setLiveLimiters`, mêmes
valeurs enabled/disabled que `buildGraph`). Pistes encore en réserve, pas
faites cette passe : snapshot d'assignation, randomize-la-ligne-synthé-
courante (écrirait dans le pattern réel, contraire au principe des
overlays Live — pas tranché).

**✅ Assignation multiple par contrôleur** (retour de Yann : « on peut
assigner plusieurs paramètres à un même contrôleur »). `LiveAssignments`
passe de valeurs uniques à des tableaux (`slots: LiveActionId[][]`,
`axisX/axisY/axisTilt: LiveAxisId[]`, jamais vides) — un bouton peut
déclencher plusieurs actions d'un coup, un axe peut piloter plusieurs
paramètres ensemble (macro, même valeur 0..1 appliquée à chacun via
`applyAxisValue`). Le panneau de sélection bascule chaque entrée au lieu de
committer-et-fermer (`toggleActionInSlot`/`toggleAxisInSlot`), retirer la
dernière entrée d'un slot est un no-op silencieux plutôt qu'un slot vide.
`liveActions.ts` : helpers pluriels `actionsFor`/`axesFor`, et
`structuredClone` pour cloner les valeurs par défaut (les tableaux sont des
références, un simple spread aurait partagé les slots entre deux sessions).
🔀 brasser continue de tirer une seule entrée par slot/axe (le multi est un
choix délibéré via le panneau, pas une surprise du hasard).

**✅ Bouton SOLO MÉLO** (retour de Yann : « un bouton 'solo' qui permet de
modifier la mélodie en faisant glisser son doigt ou tapotant » — analysé
avant implémentation à sa demande explicite, deux points confirmés : geste
sur le pad XY existant, fonctionnement maintenu/hold). Nouvelle catégorie de
catalogue PERFORMANCE (`liveActions.ts`, `LIVE_ACTIONS`) : tant que le bouton
assigné est tenu, le pad ne pilote plus ses axes habituels (X/Y) — il joue la
mélodie au doigt à la place, et la mélodie programmée est coupée en direct
(`AudioEngine.liveSetSynthMute('melody', true)`, même garde-fou que les
autres mutes synthé) pour ne pas se télescoper avec ce qui est joué à la
main. Mapping du pad : X quantisé en 7 zones = degré de la gamme courante
(1-7), Y en tiers = octave (-1/0/+1, même inversion haut-du-pad=plus-haut que
pour les axes normaux) ; fréquence via `degreeFreq` (`engine/harmony.ts`),
jouée par `AudioEngine.playLiveMelodyNote` — nouvelle méthode ponctuelle,
jamais écrite dans le pattern, qui relit `withLiveOverrides` (un
cutoff/résonance mélodie réglé en direct sur un autre axe s'entend aussi
ici) et applique le même calcul de portamento que le scheduler
(`glideTime = glide * 0.12`, `scheduler.ts`) : sans axe glide assigné sur la
mélodie, chaque zone déclenche une note franche ; avec, glisser d'une zone à
l'autre glisse la note comme un pas à pas. Un tap (down+up sans changer de
zone) joue une note ; un doigt qui glisse ne redéclenche qu'au changement de
zone (pas de répétition sur un doigt immobile). Relâcher le bouton restaure
le pad normal et démute la mélodie.

**✅ 3 types de contrôleurs par bouton** (retour de Yann : « il faut encore
plus de paramètres ! Je propose d'agencer les boutons selon 3 types :
l'interrupteur, le bouton pas, contrôle fader » — clarifié avant
implémentation : le bouton PAS avance de **nouveaux paramètres discrets**,
pas des paliers sur les axes déjà là). Chaque bouton porte désormais un mode
(`LiveAssignments.slotModes: SlotMode[]`, `'actions' | 'fader'`, bascule
`⏻ ACTIONS`/`≈ FADER` au-dessus de sa ligne dans l'overlay ⚙) :
- **Interrupteur** = le `kind: 'toggle'` déjà là (mutes, bypass limiteurs) —
  rien de nouveau côté mécanique, juste formalisé comme l'un des 3 types ;
  nouvel exemple : **ARPÈGE NAPPE** (`toggle-pad-arp`, bascule
  `synthGlobal.padArpEnabled` en direct).
- **Bouton pas** (`kind: 'step'`, nouveau) — un coup au pointerdown avance un
  paramètre discret d'un cran, rien au relâché. Chaque entrée porte
  directement son geste (`step: (engine) => …`, même principe que `apply()`
  côté axes) plutôt qu'un cas par paramètre dans `runAction` — un `default:`
  générique dans le switch les dispatche toutes. 10 nouvelles entrées :
  **TON +1/−1** (`liveStepTranspose`, ±1 demi-ton, borné à ±1 octave autour
  de la tonalité de l'Atelier), **GAMME →/←** (`liveStepScale`, cycle
  circulaire dans les 5 modes de `SCALE_LIBRARY`), **VOIX
  BASSE/NAPPE/MÉLODIE →/←** par ligne (`liveStepVoicePreset`, cycle
  circulaire dans `SYNTH_VOICE_PRESETS[name]`, remplace le `voice` complet
  comme le ferait un vrai changement de preset). Tonalité/gamme vivent dans
  un nouvel override `liveSynthGlobalOverride` (même mécanisme relu à chaque
  fenêtre que le groove), et `AudioEngine.liveMelodyFreqForDegree` relit cet
  override pour que SOLO MÉLO (ci-dessus) entende un pas de
  transposition/gamme donné en direct, pas seulement le séquenceur.
- **Fader** (nouveau) — réutilise TEL QUEL le catalogue des 55 axes
  (`LiveAssignments.slotFaders: LiveAxisId[][]`, un axe/bouton ou plusieurs
  en macro comme le pad) : glisser verticalement sur le bouton pilote la
  valeur, position = valeur (même convention que le pad, haut = 100%,
  `faderPointerDown/Move`, `setFader`). Rendu comme `.abtn` avec un
  remplissage (`.fader-fill`) qui monte/descend avec la valeur — même
  `axisValues`/`applyAxisValue` que le pad, donc un fader et le pad peuvent
  viser le même paramètre et rester synchronisés (dernière source qui a
  écrit fait foi, comme pad/inclinaison).
Actions et faders restent deux catalogues séparés par bouton plutôt que
mélangés dans un seul tableau : les gestes (tap/hold pour les actions,
glisser continu pour le fader) sont incompatibles sur la même surface en
même temps. 🔀 brasser respecte le mode courant de chaque bouton (rebrasse
`slots[i]` s'il est en ACTIONS, `slotFaders[i]` s'il est en FADER, jamais
les deux).

**✅ Vibration au trigger + snapshots d'assignation rappelables par appui
long** (les deux items de la réserve regroupés dans une même passe, retour
de Yann : « poursuis sur les travaux du mode live »).
- **Vibration** — `hapticTick()` (`navigator.vibrate?.(12)`, optional
  chaining plutôt qu'un guard `'vibrate' in navigator` : Safari iOS n'a pas
  l'API, ça doit rester un no-op silencieux) appelé dans `onSlotDown`, donc
  sur tout appui d'un bouton en mode ACTIONS (trigger/toggle/hold/pas) —
  jamais sur le pad/fader, gestes continus où ça spammerait.
- **Snapshots** — 3 emplacements fixes A/B/C (`SNAPSHOT_COUNT`,
  `liveActions.ts`), persistés à part (`loadLiveSnapshots`/
  `saveLiveSnapshots`, clé localStorage dédiée, réutilisent `isValid` pour
  ignorer un snapshot corrompu/obsolète). Nouvelle rangée dans l'overlay ⚙,
  sous la liste d'assignation. **Appui court = sauvegarder** l'assignation
  courante dans l'emplacement (geste anodin, jamais destructeur) ; **appui
  long (550 ms) = rappeler** (geste délibéré qui écrase toute l'assignation
  courante en plein set — protégé comme le reste des gestes à risque de
  mistap déjà identifiés dans le diagnostic ergonomie : bouton ⚙ éloigné du
  pad, toggle inclinaison sorti de la zone de drag). `$state.snapshot()` des
  deux côtés (pas `structuredClone`, qui lève une `DataCloneError` sur un
  proxy `$state` — piège repéré et corrigé en vérification Playwright avant
  merge, pas en production) : un snapshot est une copie figée plain-objet,
  jamais une référence vivante vers `assignments`.

**En réserve, pas prioritaire** : undo léger sur les triggers en direct
(sémantique pas encore claire — annuler quoi, pour un mute qu'un second
appui annule déjà ?) ; mode duo (deux téléphones connectés via le partage
par URL existant, `stores/share.ts`).

**Nouveau, retour de Yann 2026-08-13 — pas encore fait :**
- ✅ **Fader horizontal** (retour de Yann 2026-08-13, fait le jour même) :
  « il faudrait qu'il y ait un type de bouton où c'est un fader
  gauche-droite au sein du bouton, où haut-bas, à voir le plus simple ».
  Nouveau champ `LiveAssignments.faderOrientation: FaderOrientation[]`
  (`liveActions.ts`, `'vertical' | 'horizontal'`, longueur SLOT_COUNT,
  `'vertical'` par défaut — comportement inchangé tant qu'on n'y touche
  pas), validé comme `slotLocked`. `setFader` (`LiveView.svelte`) prend
  désormais `clientX` ET `clientY` et choisit l'axe/la dimension
  (`clientX`/`rect.width` ou `clientY`/`rect.height`) selon l'orientation du
  bouton ; convention distincte par orientation plutôt qu'unifiée : vertical
  garde haut = 100 % (frac inversée, comme le pad), horizontal suit le sens
  de lecture (gauche = 0 %, frac directe) — inverser l'horizontal aurait été
  plus déroutant qu'utile. Toggle ↕/↔ dans l'overlay ⚙, quatrième icône du
  `.toggle-row`, affiché SEULEMENT quand le bouton est en mode FADER
  (l'orientation ne veut rien dire en mode ACTIONS). Rendu : `.fader-fill`
  passe de `style:height` à `style:width` et d'un dégradé vertical à
  horizontal quand `.horizontal` est posée sur `.fader-btn`, curseur
  `ew-resize` plutôt que `ns-resize`. Vérifié par script Playwright :
  glisser à 20 %/80 % depuis la gauche d'un fader horizontal lit
  20 %/80 %.
- ✅ **Verrouiller un bouton avant brassage** (retour de Yann 2026-08-13,
  fait le jour même) : « il faudrait qu'on puisse verrouiller un bouton
  qu'on veut garder avant le brassage pour le conserver ». Nouveau champ
  `LiveAssignments.slotLocked: boolean[]` (`liveActions.ts`, longueur
  SLOT_COUNT, `false` par défaut, validé comme les autres champs dans
  `isValid`) — n'affecte que les 6 boutons, pas le pad ni l'inclinaison
  (Yann a dit « un bouton », pas un axe). `toggleSlotLock` (`LiveView.svelte`)
  bascule et persiste ; `shuffleAssignments` saute désormais tout slot
  verrouillé et garde ses DEUX tableaux (`slots[i]` ET `slotFaders[i]`,
  quel que soit le mode ACTIONS/FADER courant — un bouton verrouillé en
  fader ne doit pas se faire rebrasser ses actions au prochain passage en
  ACTIONS). Cadenas 🔒/🔓 dans l'overlay ⚙, à côté du toggle
  ACTIONS/FADER existant (même gabarit `.mode-toggle`, accent ambre une
  fois verrouillé — même code couleur que les emplacements de snapshot
  remplis). Vérifié par script Playwright : bouton verrouillé inchangé
  après 5 brassages consécutifs, bouton non verrouillé changé à chaque
  fois.
- ✅ **🎲 Random par bouton** (retour de Yann, dans la foulée du verrou :
  « autant proposer un bouton d'assignement et un bouton random à côté de
  chacun »). L'assignement existait déjà — taper la ligne BOUTON i ouvre le
  panneau de sélection, inchangé ; ce qui manquait était un tirage direct
  sans ouvrir ce panneau. `randomizeSlot(i)` (`LiveView.svelte`) tire un
  seul nouveau réglage dans le catalogue du mode courant du bouton
  (`pickAction`/`pickAxis`, désormais hissées en portée du composant et
  partagées avec `shuffleAssignments` plutôt que redéfinies localement).
  Troisième icône 🎲 dans le même `.toggle-row` que ⏻/🔒. Agit même sur un
  bouton verrouillé — le verrou protège du brassage global accidentel par
  🔀, pas d'un geste posé délibérément sur sa propre ligne ; vérifié par
  script Playwright (🎲 change un bouton verrouillé, 🔀 ensuite ne le
  touche pas).
- ✅ **Paramètres de base toujours accessibles dans le bandeau du haut**
  (audit demandé par Yann, fait le 2026-08-13 ; codé le même jour, « pars
  sur les niveaux 1 ») : le `topbar` n'exposait **aucun contrôle direct** —
  tout ce qui est réglable en direct passait par le catalogue d'assignation
  (boutons/pad/fader), donc rien n'était garanti accessible sans
  configuration préalable. Deux manques comblés :
  - **Tempo** — stepper ±1 BPM (`tempoPointerDown`/`Up`, `LiveView.svelte`)
    de part et d'autre du LCD, défilement automatique au maintien (400 ms
    puis un cran/120 ms, même charte qu'un vrai stepper matériel) plutôt
    que le glisser sur le LCD envisagé au départ — plus précis, aucun
    risque de dérailler le tempo d'un geste imprécis sur une zone
    minuscule. Écrit directement dans `pattern.state.tempo`, comme
    `tapTempo()` de l'Atelier (`ToolBar.svelte`) — le tempo n'a jamais fait
    partie du catalogue d'axes Live.
  - **Volume master** — mini-fader horizontal dans le bandeau
    (`vol-slider`, même mécanique que `.fader-btn.horizontal` mais hors
    catalogue d'assignation), écrit via `applyAxisValue(['volume'], …)` —
    reste donc synchronisé si 'volume' est *aussi* assigné à un bouton/axe
    ailleurs (dernière source qui écrit fait foi, même convention que
    pad/fader/inclinaison).
  Piège de mise en page rencontré et corrigé : `.lcd-block` est un enfant
  `flex:1` d'une colonne flex sans `align-items` explicite, donc `stretch`
  par défaut — le groupe stepper+LCD+stepper héritait cette largeur totale
  (~594px) et le bouton "+" se retrouvait collé à l'autre bout du bandeau,
  loin du "−" et du nombre. `align-self: flex-start` sur `.lcd-tempo`
  règle ça (repéré et corrigé en vérification Playwright avant commit, pas
  après).
- ✅ **Assigner/verrouiller/brasser directement autour de chaque bouton, sans
  passer par ⚙** (retour de Yann 2026-08-13, « pars sur les niveaux 1 »,
  fait le jour même) — avec demande explicite d'analyse d'ergonomie avant
  de coder (« peux-tu analyser pour faire la meilleure ergonomie ?? »), et
  une piste proposée par lui : un joystick circulaire sur le bouton du
  milieu. Analyse faite le jour même :
  - Un geste (appui long → menu radial/joystick) est **incompatible avec
    deux des états qu'un bouton peut déjà porter** : les actions
    `kind: 'hold'` (rolls) utilisent l'appui long comme LE geste live
    (tenir = actif) — un menu radial déclenché au même seuil (550 ms,
    convention snapshots) percuterait le roll en plein set ; et un bouton
    en mode FADER utilise déjà le glisser comme geste live
    (`faderPointerDown/Move`). Le même geste ferait donc des choses
    différentes selon ce qui est actuellement assigné au bouton —
    comportement imprévisible plutôt qu'ergonomique.
  - Piste retenue : pas un geste, des **icônes persistantes minuscules dans
    un coin de chaque bouton** (même esprit que 🔒/🎲 déjà dans l'overlay ⚙,
    simplement déplacées sur la grille elle-même) — 🔒 et 🎲, toujours
    visibles mais petites (~14px, coin haut-droit, hors de la zone d'appui
    naturel du pouce), le reste du bouton garde exactement son comportement
    live actuel (trigger/toggle/hold/fader). Une 3ᵉ icône ✏️ ouvrirait le
    panneau de sélection DIRECTEMENT pour ce bouton (au lieu de
    ⚙ → trouver la ligne → taper la ligne → panneau — un vrai raccourci
    même si le panneau reste le même). Le toggle ACTIONS/FADER resterait
    dans ⚙ seul — moins utile en plein set, et un mistap dessus change le
    comportement du bouton au pire moment.
  - Le joystick circulaire reste une bonne idée pour un *v2* limité aux
    boutons `trigger`/`toggle`/`step` (où l'appui long est aujourd'hui un
    vrai no-op), mais introduirait deux modèles d'interaction différents
    selon ce qui est assigné — la cohérence l'emporte : icônes de coin
    recommandées, joystick mis en réserve.
  - **Implémenté** : nouveau conteneur `.abtn-wrap` par bouton de la grille
    (`LiveView.svelte`), SIBLING du `.abtn`/`.fader-btn` plutôt qu'un
    parent — un `<button>` ne peut pas contenir un autre `<button>`, et
    être siblings (pas ancêtre/descendant) évite tout souci de bubbling :
    taper une icône ne touche jamais le bouton en dessous, aucune
    désambiguïation de geste à faire. `.corner-icons` en position absolue,
    coin haut-droit, 3 icônes ~15px (🔒/🔓, 🎲, ✏️) réutilisant
    `toggleSlotLock`/`randomizeSlot` déjà existants ; ✏️ ouvre le panneau de
    sélection directement (`assignOpen = true` + `picker = …` — le picker
    n'était rendu que sous l'overlay ⚙, il fallait aussi l'ouvrir, pas
    seulement poser `picker`). Le toggle ACTIONS/FADER n'a PAS été ajouté
    aux icônes de coin, comme prévu dans l'analyse. Vérifié par script
    Playwright : taper le corps du bouton déclenche toujours l'action live
    normale (mute qui s'active, fader qui glisse), taper une icône ne
    déclenche jamais l'action du dessous.

### 7.2 Atelier

1. **✅ Réduire tous les paramètres — ⚠️ ROUVERT le 2026-08-15 (audit C1).**

   > **Ce que cette passe a coûté**, mesuré trois semaines après :
   > les trois nombres qu'elle a posés (`72px/1fr/36px` et le seuil
   > `auto-fit` à 148px) sont les causes exactes des constats **A2**
   > (pistes de curseur de 40px à 818px sur la même page, facteur 20),
   > **B1** (6 boîtes de valeur qui débordent sur deux lignes, dont
   > « 120 BPM » dès le premier écran) et **B2** (12 libellés tronqués, y
   > compris quand 800px de piste restent vides à côté).
   >
   > Le marché passé était : une colonne de curseurs utilisables (~166px
   > de piste sur téléphone) contre deux colonnes serrées (40px). **Et il
   > n'a pas produit ce qu'il visait** — l'onglet Rythme déplié fait
   > toujours 3,3 écrans de haut sur téléphone : la hauteur gagnée sur les
   > curseurs a été reprise ailleurs.
   >
   > Corrigé le 2026-08-15 sans annuler l'intention (la densité mobile
   > reste un objectif légitime) : voir §7.5. **Leçon à retenir au-delà de
   > ce cas — un ✅ n'est pas définitif.** Une décision de design a un coût
   > qui ne se voit qu'à l'usage ; ce document doit pouvoir la rouvrir.

   Passe de densité sur `XpSlider`
   (colonnes 72px/1fr/36px au lieu de 110/1fr/56, piste plus fine, marges
   resserrées) + seuil des grilles `auto-fit` abaissé (148px au lieu de
   190-260 selon les fichiers) dans `AtelierView`, `SynthModule`,
   `DrumRowView` et `SynthRowView` — les groupes de curseurs (groove,
   effets, harmonie, sidechain, réglages par ligne) passent officiellement
   à 2 colonnes sur un écran de téléphone réel (mesuré : ~322px de large
   utile à 390px de viewport, contre ~260-300px requis avant pour
   déclencher 2 colonnes). Les labels longs tronqués un peu plus
   agressivement (déjà le comportement existant, juste plus fréquent).
   Complété ensuite (deux retours de Yann le jour même) : (a) les réglages
   « toujours visibles » (Pas/Décalage/Volume en drum, Cycles/Notes/
   Décalage/Volume/Glide/… en synthé) fusionnés dans le même dépliable
   `▸ ⚙️ Réglages` que Timbre/filtre/espace, un seul repli par ligne, tout
   caché par défaut ; (b) une fois déployé, un paramètre par ligne plutôt
   que 2 colonnes (plus de pression d'espace une fois masqué par défaut) et
   regroupé en encarts `<fieldset>` cohérents plutôt qu'une liste plate —
   drum : Séquence / Timbre / Filtre & espace ; synthé : Séquence /
   Oscillateur & enveloppe / Détune & modulation / Filtre / Espace
   (`DrumRowView.svelte`, `SynthRowView.svelte`) ; (c) chaque encart se
   déploie désormais indépendamment plutôt qu'un seul repli général —
   `<legend>` cliquable par `<fieldset>` (`openGroups` par nom de groupe,
   remplace le booléen unique `showSettings`). Réglages avancés en 2e
   niveau de dépliable : pas encore fait, à voir à l'usage si le besoin se
   confirme.
2. **✅ Retirer le séquenceur kick/snare/hat de l'onglet Synthé, et le
   remplacer sur Effets par un aperçu combiné des 6 lignes.** En relisant
   `AtelierView.svelte` : ce n'était pas `TransportRings` (simple rappel
   non éditable dans la barre sticky) mais le vrai séquenceur pas-à-pas
   complet (`XpWindow "Séquenceur — Kick / Snare / Hat"`), rendu sans
   condition d'onglet depuis une passe ergonomie précédente ("reste au même
   endroit quel que soit l'onglet actif") — donc dupliqué sur Synthé ET sur
   Effets, sans rapport avec le sujet de ces deux onglets. Repéré
   directement dans le code plutôt que redemandé à Yann. Retiré de Synthé ;
   sur Effets, remplacé (retour de Yann le jour même) par
   `GeneralSequencer.svelte` — un aperçu en bandes colorées des 6 lignes
   (batterie + synthé), même philosophie que `TransportRings` (lecture
   seule, pas un second éditeur), en DOM plutôt qu'en canvas pour rester
   cohérent avec le reste de l'Atelier.

### 7.3 Audit de parité avec l'original

Repérés dans `ANALYSE-ORIGINAL.md`, identifiés il y a longtemps.

1. **✅ Son de victoire + flash des cases** en Mode jeu (original
   `playChime`/`playWinSound` l. 8321-8340, `showGameResult` l. 8558-8564,
   jamais portés). `AudioEngine.playWinChime(tier)` : mêmes fréquences/
   durées/gains que l'original (tier 1 = arpège éclatant qui monte, tier 2 =
   simple et positif, tier 3 = petite descente tiède), connecté à
   `finalGain` plutôt qu'au « masterGain » de l'original — qui, malgré son
   nom, est en réalité le bus batterie (passe par saturation/bitcrush/
   compression), un hasard de nommage plutôt qu'un choix documenté ; le Mode
   jeu part toujours d'un état neutre sur ces réglages donc le résultat est
   identique à l'oreille. Flash : classe CSS `.win-flash` (même animation
   `cellFlash`, 3 pulsations de luminosité) posée sur toutes les cases de
   `GameView.svelte` pendant 1100ms, déclenchée dans `verify()` dès que
   `game.solved` passe à `true` (le bouton ✓ Vérifier étant désactivé une
   fois résolu, cette transition ne peut se produire que sur CET appel).
   `tierForAttempts` (nouveau, `game.svelte.ts`) distinct de
   `starsForAttempts` déjà là : à 3 essais tier vaut 3 alors que stars vaut
   encore 2, l'original les calcule séparément.
2. **✅ Bouton "Traduire l'arpège en Mélodie"** (original l. 3388–3435,
   jamais porté). `translatePadArpToMelody(state, rng)` (nouveau,
   `engine/generators.ts`, aux côtés de `randomizePad`/
   `randomizePitchedLine`) : redimensionne la Mélodie à `pas Nappe × vitesse
   d'arpège` (plafonné à 128), calée sur les mêmes mesures que la Nappe
   (`resizeSynthLine`, déjà porté), puis rejoue `arpNoteOrder` (déjà exporté
   par `voices/synth.ts`, injecté en `rng`) pour chaque pas de nappe ayant un
   accord — un pas sans accord reste silencieux en Mélodie aussi. Octave
   repliée dans [-1,1] avec le même décalage de -1 que l'original (la Nappe
   joue -12 demi-tons plus bas que le registre par défaut de la Mélodie).
   Remplace tout le contenu existant de la ligne — instantané figé, pas un
   lien live. Bouton dans le fieldset "Arpégiateur de nappe"
   (`SynthModule.svelte`), `rng = Math.random` comme les autres boutons 🎲
   de remplissage aléatoire du même fichier (édition Atelier ponctuelle, pas
   le rendu déterministe de l'export).
3. **✅ Aide à la production contextuelle** (original `renderProductionHelp`
   l. 8903–8972, jamais portée — cadrage fait ici plutôt que redemandé à
   Yann : la seule vraie question ouverte était OÙ l'afficher dans le
   nouveau design). Placée **au-dessus des onglets** (`AtelierView.svelte`,
   juste sous le rappel de raccourcis clavier) plutôt que dans un seul
   onglet : le conseil peut justement suggérer de CHANGER d'onglet
   ("passe au Synthé"), il doit rester visible quel que soit celui actif —
   et contrairement à ce rappel clavier, visible aussi sur tactile (pas
   masqué par `@media (pointer: coarse)`), l'aide profite justement le plus
   aux nouveaux venus. Même progression que l'original (pose le Kick → la
   Snare → le Hat → passe au Synthé → explore les réglages avancés → liste
   des modules pas encore touchés) et même mécanique de détection : `input`/
   `change` délégués au niveau fenêtre (`markProductionTouched`,
   `AtelierView.svelte`) plutôt qu'un handler par curseur — un attribut
   `data-group` posé sur chaque `<fieldset>`/conteneur existant (13 groupes,
   pas les 14 originaux 1:1 : ce port n'a pas le même découpage de DOM) fait
   remonter le "touché" sans câblage supplémentaire, et comme
   `DrumRowView`/`SynthRowView` sont un seul composant instancié 3× (une
   fois par ligne), le même `data-group` sur leurs fieldsets agrège
   naturellement les 3 lignes sous un groupe, exactement comme l'original.
   Liste des modules non touchés repliée dans la même phrase (bande fine,
   pas de second bloc séparé comme l'original) plutôt qu'affichée à part.
   En mémoire seulement (pas de localStorage) : reflète l'exploration de
   CETTE session, pas un score à conserver — recharger la page repart avec
   des suggestions fraîches, comme l'original.

### 7.4 Idées en réserve, pas prioritaires

- **Cycles de fraction de mesure** pour les lignes synthé : 1/2, 1/3, 1/4 en
  plus du cycle entier actuel.
- **Débloquer des modules via le mode jeu** — progression du jeu qui ouvre
  des contenus dans l'Atelier (voix, presets, effets ?), pas encore défini
  quoi exactement ni comment articuler jeu ↔ atelier.
- **Utiliser les gains de la besace** (actuellement juste comptés, pas
  dépensés) :
  - les échanger contre des modules (déblocage payant plutôt qu'automatique) ;
  - personnaliser un EP après les 4 premiers enregistrements WAV.
- **Améliorer l'entrée en jeu** pour la rendre plus intuitive au démarrage —
  piste : ne proposer que le mode jeu au premier lancement (pas l'Atelier
  tout de suite), et être très explicatif à chaque nouveauté introduite.
- ✅ **Explications légères par paramètre** (retour de Yann, 2026-08-13 ;
  codé le jour même, palier 1 du backlog priorisé, item 5/5) : une
  micro-explication disponible pour chaque réglage, sans surcharger l'écran
  ni noyer un nouvel arrivant. Nouveau `ui/xp/paramHints.svelte.ts` :
  table `PARAM_HINTS: Record<string, string>` indexée sur le LIBELLÉ du
  curseur (`XpSlider.label`) plutôt qu'un identifiant dédié à passer à
  chaque appel — un même libellé ("Swing", "Attaque"…) revient sur
  plusieurs lignes/pages avec le même sens, une seule entrée couvre toutes
  ses occurrences, ajouter une ligne à la table suffit à faire apparaître
  la bulle partout sans toucher aux dizaines de call sites. Contenu
  volontiers incomplet (~30 entrées, les paramètres de groove/effets/synth
  les plus chargés en jargon) plutôt que deviné — mieux vaut aucune bulle
  qu'une explication approximative ; chaque phrase vérifiée contre le
  comportement réel du scheduler/de la voix avant d'être écrite (ex.
  Traîne ≠ Swing : la traîne retarde TOUS les pas, le swing un sur deux).
  `XpSlider.svelte` cherche son propre hint (`hintFor(label)`) et bascule
  son libellé en `<button class="lab has-hint">` (souligné en pointillés,
  `cursor: help`) uniquement si un hint existe ET que le réglage est
  activé — sinon `<span class="lab">` inchangé. Bulle jaune classique des
  tooltips Windows (`#ffffe1`, bordure noire) plutôt qu'un composant
  générique repeint, cohérent avec le design XP assumé. Affordance
  choisie : le libellé LUI-MÊME est le déclencheur (survol/focus) — pas
  d'icône ⓘ séparée, la colonne de libellé ne fait que 72px, une icône en
  plus l'aurait surchargée pour rien. Déclenchement au survol/tap plutôt
  qu'à l'appui long envisagé au départ : un appui long est un geste caché
  qu'un nouvel arrivant ne découvre jamais tout seul, contraire à l'objectif
  de prise en main — un libellé souligné en pointillés se découvre au
  premier coup d'œil.
  - **Réglage persistant** (Affichage ▸ Aide contextuelle, `ToolBar.svelte`,
    activé par défaut) : même emplacement que Sons système, mais PAS le
    même mécanisme de state — `systemSounds.ts` garde une variable de
    module simple (suffisant, un son ne se déclenche qu'au prochain
    événement) alors que `paramHintsSettings.enabled` est un `$state` de
    classe (`ParamHintsSettings`) : ici la réactivité doit atteindre tous
    les `XpSlider` déjà montés à l'écran dès qu'on bascule le réglage, pas
    seulement influencer un futur appel. Vérifié par script Playwright :
    désactiver le réglage fait disparaître l'affordance sur un `XpSlider`
    déjà affiché, sans re-rendu manuel ni rechargement de page.
- **Bouton retour utilisateur, v2** (bug / correction / idée) — le mailto:
  du 2026-08-13 (menu Aide de l'Atelier) est réévalué le jour même : Yann ne
  veut plus qu'il ouvre le client mail, veut un accès identique depuis les
  trois modes (pas seulement l'Atelier — un bouton fixe, ex. bas-droite),
  une saisie rapide du problème dans la page elle-même, et **l'envoi par
  mail ne doit pas se voir depuis le site** (ni adresse en clair dans le
  code source, ni app mail qui s'ouvre). Ça ne se fait plus sans un
  intermédiaire côté serveur : le site est un SPA statique (`dist/` sur
  Vercel), rien ne peut poster un e-mail sans exposer une clé quelque part.
  Deux pistes :
  - **Service de formulaire tiers** (type Formspree) : la page poste en
    `fetch` vers un endpoint public propre au formulaire, le service
    relaie par mail — zéro code serveur, zéro secret dans le bundle
    (l'ID de formulaire n'est pas une clé sensible). Recommandé : le plus
    rapide, cohérent avec « site statique déployé sur Vercel ».
  - **Fonction serverless Vercel** (`api/feedback.ts`) qui appelle une API
    d'e-mail transactionnel (ex. Resend) avec une clé en variable
    d'environnement Vercel — plus de contrôle, mais introduit un vrai
    backend au projet (rien de tel aujourd'hui) et une clé à provisionner.
  Bloqué sur un choix de Yann (+ créer le compte/formulaire côté service
  choisi, je ne peux pas le faire à sa place) avant de coder quoi que ce
  soit. Bouton flottant (position à trancher, bas-droite proposé) + petit
  formulaire inline (texte libre, pas de sujet/destinataire visibles)
  remplacerait le menu Aide actuel, partagé entre Atelier/Jeu/Live plutôt
  que spécifique à `ToolBar.svelte`.
- **Fredonner une mélodie au micro → grille Mélodie** (retour de Yann,
  2026-08-13). Détection de hauteur en direct (`getFloatTimeDomainData` +
  autocorrélation ou YIN, pas de lib externe si évitable), quantification de
  la fréquence détectée sur la gamme/tonalité courante puis sur la grille de
  pas. Projet en soi (DSP temps réel + UX d'enregistrement) — à faire
  descendre en section 6 « grosses » une fois cadré.
- ✅ **Viz③ Mode Live (lapin coureur) : lien musique trop faible** (retour de
  Yann, 2026-08-13, corrigé le jour même). Diagnostic (`LiveView.svelte`,
  `drawVizRunner`) : le défilement (`scroll = now * 70`) tournait à vitesse
  réelle fixe, indépendante du tempo et de l'état lecture/arrêt, et les
  carottes étaient semées à un espacement pixel aléatoire (130–150 px + aléa)
  plutôt qu'aux positions réelles des pas du pattern. Trois correctifs :
  (1) horloge de course dédiée (`runnerClock`) qui n'avance que pendant la
  lecture (`playing`) — le lapin s'immobilise net à l'arrêt au lieu de
  continuer sur l'horloge murale, vérifié par capture d'écran (deux frames à
  1,2 s d'écart à l'arrêt strictement identiques) ; (2) vitesse de défilement
  dérivée du tempo réel (`runnerScrollSpeed`, `RUNNER_STEP_PX / stepDur`,
  `stepDur = barDuration(tempo) / kick.subdiv` de `engine/groove.ts`),
  calibrée pour retrouver ~70px/s au réglage par défaut (120 BPM, kick à
  4 pas) ; (3) carottes semées sur le pattern réel de la ligne kick
  (`runnerRefillCarrots`, un curseur de pas qui avance en boucle sur
  `kick.pattern`/`kick.subdiv`, une carotte par pas actif, pas silencieux
  comptés dans l'espacement) au lieu d'un espacement aléatoire — manger une
  carotte correspond maintenant à un coup de kick effectivement programmé.
  Le cycle de jambes (`run`) suit la même horloge et le même ratio de
  vitesse pour rester visuellement cohérent avec le sol qui défile. La
  détection de morsure (front montant sur `getLineLevels()`) reste sur
  l'horloge murale réelle — c'est le seul repère fiable de ce qui sonne
  vraiment.

### 7.5 Dette d'interface — section permanente (créée le 2026-08-15, audit C2)

> **Pourquoi cette section existe.** Sur ses 1 270 premières lignes, ce
> document n'a quasiment jamais rien enlevé : chaque entrée ajoute une
> voix, un mode, un catalogue, un réglage, une bulle. Les constats **A6**
> (les mêmes commandes à trois endroits) et **A1** (quatre barres avant la
> première case jouable) en sont le résultat mécanique, pas des accidents.
> Un backlog qui ne fait que grossir produit exactement l'interface qu'on
> a mesurée. Cette section est au même rang que le backlog de features, et
> se lit avant lui.

**Trois règles d'écriture, à appliquer aux prochaines entrées :**

1. **Tout nouvel élément d'UI permanent nomme ce qu'il remplace, ou d'où
   vient sa place.** Pas de réponse = l'élément n'est pas permanent (il
   va dans un repli, un menu, une bulle) ou il ne se fait pas.
2. **Chaque ✅ porte une ligne « ce que ça coûte à l'écran »**, à côté du
   « pourquoi » déjà très bien tenu. Le coût ne se voit qu'à l'usage :
   sans cette ligne, il n'est jamais relu (cas d'école : §7.2.1).
3. **Un ✅ n'est pas définitif.** Une entrée livrée peut être rouverte
   avec son coût mesuré, sans que ce soit un échec — c'est le seul moyen
   qu'une décision de design vieillisse correctement.

**Dette ouverte, par ordre de priorité** (issue de l'audit du 2026-08-15,
détail des constats plus bas dans ce document) :

- ✅ **A2 · B1 · B2 — proportions du curseur** (fait le 2026-08-15, voir
  plus bas). Rouvre §7.2.1 sans annuler son intention.
- ✅ **A3 — cibles tactiles** des dépliables, des mutes et de la barre
  d'outils (fait le 2026-08-15, voir plus bas). **Ce que ça a coûté à
  l'écran** (règle n°2 ci-dessus, première application) : le chrome du
  premier écran mobile passe de 64 % à 69 %, les barres de menus et
  d'outils ayant grandi. Assumé et à reprendre par A1 — la menubar est
  justement l'un des blocs qu'il propose de fondre.
- 🟡 **A1 — budget d'écran : premier passage fait le 2026-08-15**, sur les
  trois coupes arbitrées par Yann. **69 % → 60 %** du premier écran mobile
  (585px → 510px avant la première case ; le Kick est désormais visible
  sans défiler, ce qui n'était pas le cas). Quatre barres empilées → trois.
  - nav des 3 modes fondue dans un menu « Mode » de la barre de menus. La
    barre de navigation ne subsiste que pour le Mode jeu, qui n'a pas de
    barre de menus et dispose de toute la hauteur.
  - explication de la Banque de séquences derrière un ⓘ (4 lignes pleines
    affichées en permanence → 0 par défaut, le texte reste à un tap).
  - conseil 💡 production ramené à une ligne tronquée, dépliable au tap :
    il reste visible et découvrable — l'objectif de §7.3 — sans occuper la
    moitié du bandeau en continu.
- ✅ **A1 — 2ᵉ passage, le même jour** (Yann : « allons-y, testons ») :
  `.preset-row` descendu SOUS le séquenceur. Il était coincé entre les
  onglets et le contenu que les onglets commutent — taper « Synthé »
  obligeait à traverser tempo + morceau + banque avant d'atteindre le
  synthé. Pur réordonnancement, **rien n'est retiré** : ce qu'on joue
  vient en premier, ce qu'on charge et ce qu'on règle vient après.
  Lecture/Break/onglets n'ont pas bougé (barre sticky, joignables de
  partout) et le tempo reste immédiatement sous le séquenceur.

  **60 % → 34 %** du premier écran mobile, **56 % → 31 %** sur desktop.
  Bilan complet de A1 : **64 % → 34 %** (585px → 288px avant la première
  case). Trois lignes de batterie entières sont désormais visibles sans
  défiler, là où on n'en voyait aucune.

  Vérifié par script Playwright : ordre du DOM, Vue circulaire qui pilote
  bien le séquenceur situé au-dessus d'elle, retour en vue linéaire,
  tempo éditable au clavier ET au glissé, chargement d'un morceau depuis
  sa nouvelle place, lecture audio réelle, bascule des 3 onglets. Zéro
  erreur console.

- ✅ **B7 + A6 (barre d'outils) — 3ᵉ passage, le même jour.** La barre de
  menus tenait sur deux lignes sous ~460px et coupait ↶ de ↷. Elle tient
  désormais sur **une seule ligne de 360px à 1280px** (34px au lieu de
  ~70px). **34 % → 31 %** du premier écran mobile.

  Le cadrage initial (« replier Tap tempo / ↶ / ↷ / Partager dans les
  menus qui les contiennent déjà ») s'est révélé faux à la lecture, et a
  été corrigé avant de coder :
  - **🔗 Partager retiré** — celui-là était bien un doublon exact du menu
    Fichier, et partager n'est pas un geste qu'on répète. [A6]
  - **👆 Tap tempo déplacé, pas replié** — il n'était dans AUCUN menu, et
    un menu lui serait de toute façon interdit : on ne peut pas taper un
    rythme dans un menu qui se referme. Remonté contre le curseur Tempo
    (bloc preset), c'est-à-dire contre le contrôle qu'il pilote — on voit
    maintenant la valeur bouger à chaque frappe. Libellé raccourci en
    « 👆 Tap ». `tapTempo()` a migré de `ToolBar.svelte` vers
    `AtelierView.svelte` avec son bouton ; l'import `pattern` devenu mort
    dans ToolBar a été retiré.
  - **↶ / ↷ conservés** malgré leur doublon dans le menu Édition : sur
    téléphone il n'y a pas de Ctrl+Z, ce sont les seuls accès à un clic.
    Les retirer aurait été appliquer A6 mécaniquement contre l'ergonomie.
    Groupés dans un conteneur `nowrap` pour ne plus jamais être séparés.
  - Remplissage **horizontal** des menus resserré sous 460px — la hauteur
    de cible reste à 28px, A3 n'est pas défait.

  Vérifié par script Playwright : barre sur 1 ligne à 360/390/414/1280px,
  tap tempo fonctionnel à sa nouvelle place (5 frappes à ~500ms → 110 BPM,
  arrondi au pas de 10 comme prévu), Partager toujours opérant depuis le
  menu Fichier, Annuler toujours à un clic. Zéro erreur console.

- ✅ **A6 — le bloc preset supprimé** (2026-08-15, sur cadrage de Yann :
  « à voir comment réorganiser ce point ? […] audit et propose »). Il
  pesait 203 à 296px selon la largeur et, sur ses huit éléments, trois
  n'étaient que des doublons des menus. Chaque famille a rejoint l'endroit
  qui lui correspond :
  - **Vue circulaire / Sauver / Charger** : supprimés, ils existaient déjà
    à l'identique dans Affichage et Fichier.
  - **Morceaux et banque** : passés dans le menu **Fichier**, en sections
    après les entrées classiques. Un `<select>` de 34 entrées EST déjà une
    liste déroulante — la passer en menu ne change rien à l'interaction et
    coûte zéro pixel. *Essayé et abandonné* : un menu « Morceaux » de
    premier niveau, qui refaisait passer la barre à deux lignes sur
    téléphone (30px de chrome permanent) — et « charger un morceau » est
    de toute façon un « ouvrir ».
  - **Tempo + Tap** : sous le séquenceur (idée de Yann). Les trois
    emplacements ont été mesurés : dans la barre sticky = +66px
    PERMANENTS (il n'y tient pas sur la ligne de Lecture/Break à 390px,
    donc il y prend sa propre rangée, présente sur les trois onglets) ;
    juste sous la barre sticky = +46px au-dessus de la ligne de
    flottaison ; sous le séquenceur = zéro coût sur les deux. Ce n'est pas
    un contrôle qu'on chevauche comme Lecture ou Break.
  - **Textes pédagogiques du morceau** : d'abord un `PresetNotes.svelte`
    montrant le morceau CHARGÉ, remplacé le jour même par l'analyseur
    ci-dessous. C'est la raison pour laquelle le choix du morceau n'a pas
    été *seulement* basculé en menu : un menu porte 34 noms, pas ~880
    lignes de contenu pédagogique, et ce contenu est un atout du projet.
    Partage retenu : le menu CHARGE (gratuit en hauteur), l'onglet RACONTE
    (a besoin de place).
  - **Gestion de la banque** : dans l'onglet Production, en pleine
    largeur — un CRUD (enregistrer/renommer/supprimer) tient mal dans un
    menu. Le *chargement*, lui, est dans Fichier : le garder aux deux
    endroits aurait recréé le doublon qu'on venait d'enlever.
  - **Onglet « Effets » renommé « Production »** : il ne contient plus
    seulement les effets de bus mais tout ce qui n'est pas l'édition des
    notes.

- ✅ **Analyseur de rythme** (2026-08-15, idée de Yann : « un analyseur de
  son à la place de la section morceau chargé : il indique quel morceau se
  rapproche le plus et explique le contexte »). Remplace `PresetNotes` —
  et c'est mieux pour deux raisons : « Le morceau chargé » n'avait rien à
  dire tant qu'on n'en avait pas chargé un, et devenait carrément FAUX dès
  qu'on modifiait le pattern (il continuait d'afficher l'histoire d'un
  morceau qu'on ne jouait plus). Le plus proche, lui, a toujours quelque
  chose à raconter, y compris sur un rythme parti de rien.
  - `similarity.ts` gagne `rankPresets()` (classement complet) à côté de
    `findClosestPreset()`, qui en devient un simple appelant. Un seul
    parcours des 34 presets × 6 permutations, en gardant le meilleur score
    PAR preset — sinon un même morceau reviendrait plusieurs fois dans le
    classement, une fois par permutation.
  - Le panneau montre : le verdict avec son score, les textes historiques,
    **les deux suivants avec leurs scores** (62 % contre 58 %, ce n'est pas
    la même chose que 88 % contre 41 % — n'afficher que le premier
    laisserait croire à une certitude qu'on n'a pas), une fiche technique
    du rythme (tempo, signature, lignes qui sonnent, swing), les écarts
    actionnables avec le style (tempo/swing, seuils larges pour ne
    signaler que ce qui s'entend), et la **mention honnête** que le score
    ne porte que sur kick/snare/hat.
  - **Libère la ligne « le plus proche » du bandeau sticky**, où elle était
    masquée sur mobile (`@media (pointer: coarse)`) : l'information devient
    accessible au doigt, ce qu'elle n'était pas, et gagne le contexte qui
    lui donnait un intérêt.
  - Effet de bord : le calcul ne tourne plus QUE quand l'onglet Production
    est ouvert. Avant, 34 presets × 6 permutations toutes les 300ms
    pendant qu'on tapait sur la grille, pour alimenter une ligne de texte
    invisible sur mobile.

- ✅ **Aiguille de l'anneau au tempo** (retour de Yann : « la barre du
  nouveau cercle devrait défiler au rythme du tempo »). Elle était calée sur
  `pos`, l'INDEX du pas en cours : à 4 pas par mesure elle sautait par quarts
  de tour. Elle interpole désormais entre deux pas.
  Le repère de temps reste l'arrivée du pas lui-même, pas une horloge partie
  de zéro : `pos` vient de `consumePlayhead()`, qui ne relâche un événement
  que lorsque l'horloge AUDIO l'a atteint. On se recale donc sur le son à
  chaque pas et on n'interpole qu'À L'INTÉRIEUR d'un pas — la dérive de
  l'horloge murale sur ~0,5 s (120 BPM, 4 pas) ne se voit pas et repart de
  zéro au pas suivant. Pas d'horloge parallèle au son, donc.
  Piège rencontré : la prop du composant s'appelle `state`, ce qui entre en
  conflit avec la rune `$state` (le compilateur lit `$state` comme
  l'abonnement à un store nommé `state`). `needlePhase` est une variable
  simple — `draw()` est appelé à la main depuis la boucle d'animation, rien
  n'a besoin d'y réagir.
  Vérifié en comptant les images distinctes du canvas pendant la lecture :
  14/14 sur ~1,1 s (≈2 pas), là où un défilement pas-à-pas en aurait donné
  2 ou 3.
- ✅ **Bandeau des lignes synthé allégé** (retour de Yann : « un dessin de
  filtre qui n'apporte pas grand chose, pas besoin de tester d'ailleurs »).
  La courbe de filtre (`FilterCurve.svelte`, supprimé — plus aucun appelant)
  et le bouton ▶ Tester quittent le bandeau ; il ne reste que le libellé, le
  mute, le choix de voix et le 🎲. C'est le constat **B9** de l'audit (canvas
  qui flottait à droite, graduations chevauchant la courbe, grand vide à sa
  gauche), réglé par la suppression plutôt que par le replacement.
  `AudioEngine.previewSynth()` n'a plus d'appelant côté UI : laissé en place,
  c'est une capacité légitime du moteur, mais à noter comme non utilisée.

  Résultat mesuré : page par défaut **1 369px → 1 203px** sur téléphone
  (1,6 → 1,4 écran), chrome du premier écran **32 %** sur mobile ET sur
  desktop (288px, contre 292 avant), barre sticky inchangée à 122px,
  barre de menus toujours sur une ligne de 360 à 1280px.

  - **Reste ouvert** : nit repéré en testant : taper la valeur d'un
    curseur pré-remplit le champ sans le sélectionner — il faut effacer à
    la main avant de saisir. Un `select()` au focus suffirait.
- ✅ **Filtre du synthé résumé en deux macros, fusionné avec Espace**
  (retour de Yann : « filtre on comprend rien, on peut pas résumer en un ou
  deux paramètres les filtres du synthé, de manière à fusionner avec
  espace ? »). Le panneau exposait quatre réglages en unités techniques —
  Tone %, Filtre Hz, Ouv. filtre Hz, Ferm. filtre ms — et en mélangeait deux
  choses sans rapport : **`voice.tone` n'est pas un filtre du tout**, c'est
  un drive de waveshaper (`driveCurve`, `voices/synth.ts` l. 121-124), rangé
  là par accident. Il rejoint « Oscillateur & enveloppe » sous son vrai nom,
  **Saturation** — dont l'explication existante (« un ampli qu'on pousse un
  peu fort ») le décrit correctement, contrairement à l'ancienne entrée
  `Tone`, écrite pour le Tone de la BATTERIE, qui est un vrai réglage de
  timbre grave/aigu. Une explication juste pour le mauvais paramètre : une
  raison de plus pour laquelle le panneau ne voulait rien dire.
  Restent deux macros nommées d'après ce qu'on ENTEND :
  - **Brillance** → `voice.cutoff`, mappé exponentiellement sur 100-4000 Hz
    (l'oreille perçoit les fréquences en ratios ; en linéaire tout le haut
    de la course aurait sonné pareil).
  - **Mouvement** → `filterEnvAmount` ET `filterEnvRelease` ensemble : à
    faible ampleur une fermeture longue ne s'entend pas, à forte ampleur
    une fermeture instantanée fait un clic. Les deux n'ont d'intérêt
    séparément que pour qui sait déjà ce qu'est une enveloppe de filtre.

  **Aucun champ d'état n'est supprimé** : le format v2 est le contrat central
  (CLAUDE.md), seule l'UI est résumée. Un preset qui règle finement
  `filterEnvRelease` continue de sonner à l'identique tant qu'on ne touche
  pas à la macro. Vérifié que les valeurs des 34 presets tiennent dans les
  bornes des macros (cutoff 600-3200, filterEnvAmount 1200-3200) : aucune
  n'est écrasée par un aller-retour d'affichage.

  **Ce que ça coûte à l'écran** (règle n°2) : ça en rend. Sur l'onglet
  Synthé à 360px, les surfaces Filtre + Espace des 3 lignes ouvertes passent
  de **1 110px à 723px (−35 %)**, 6 curseurs → 4, et une pastille de moins
  par ligne (5 → 4 sur basse/mélodie). Page repliée inchangée (1 519px).
  Les 43 libellés de curseur de l'appli ont toujours une explication
  (vérifié en ouvrant tous les replis des 3 onglets, pas au jugé).
- ⚠️ **A6 — dédoublonner les commandes** entre menus, barre d'outils et
  bloc preset. À trancher : laquelle des trois surfaces garde quoi.
  *(A5 était listé ici en ⚠️ « à trancher » alors qu'il a été livré le
  même jour — son ✅ est juste en dessous. Ligne supprimée le 2026-08-16 :
  une entrée ouverte qui décrit du travail fait est pire qu'absente, elle
  fait rouvrir un débat déjà tranché.)*
- ✅ **A4 — le mur d'encarts repliés** (2026-08-15). Replié, un
  `<fieldset>` dessinait quand même un rectangle pleine largeur pour ne
  contenir qu'un mot de `<legend>` : trois bandes vides par ligne de
  batterie (quinze sur l'onglet Rythme), cinq à sept par ligne synthé
  (une vingtaine sur l'onglet Synthé). Remplacés par **une rangée de
  pastilles** par ligne, le panneau n'occupant de la place que lorsqu'il
  est réellement ouvert. `data-group` reste sur le conteneur des
  curseurs — l'aide à la production le retrouve par `closest()` comme
  avant (vérifié). Accent ambre côté batterie, violet côté synthé, cible
  tactile maintenue à 28px (A3).
  **Hauteur de page par défaut : 2,1 → 1,6 écrans** sur téléphone
  (1 751px → 1 369px) — les cinq lignes du séquenceur tiennent désormais
  en un écran et demi au lieu de deux et des poussières.
- ✅ **A5 — repères de temps dans la grille linéaire** (2026-08-15). Ce
  qui rend la solution simple, et qui a été vérifié dans le moteur avant
  de coder : `stepDuration = barDuration / subdiv` (`engine/groove.ts`),
  donc **toute ligne couvre exactement une mesure**, quel que soit son
  nombre de pas. Une mesure vaut 4 temps → les repères tombent à
  0/25/50/75 % de la LARGEUR de chaque ligne, et s'alignent donc
  parfaitement entre lignes **même quand les cases, elles, ne s'alignent
  pas**. C'est précisément ce qui rend la polyrythmie lisible : on voit
  contre quoi chaque case tombe. Plus une règle numérotée 1·2·3·4,
  affichée une seule fois en tête plutôt que sur chaque ligne.
  Utilitaire `.beat-grid` dans `styles/global.css` plutôt que dupliqué
  dans les deux composants (le CSS Svelte est scopé, et le projet souffre
  déjà d'un `.xp-btn` recopié six fois — audit C6). Lignes synthé :
  `4 × cycleBars` temps, et repères **désactivés en affichage par
  paquets** — un paquet commence à une fraction quelconque de la mesure,
  les traits seraient déphasés, mieux vaut aucun repère qu'un repère qui
  ment.
  - ⚠️ **Correctif le jour même** (Yann : « et dans synthé, on peut en
    faire de même non ? » — en allant vérifier, le défaut était chez moi).
    Un temps ne mérite un trait que s'il reste plus espacé que les cases,
    sinon on ne marque plus le rythme, on RAYE les cases. Cas qui l'a
    révélé : la Nappe part à `cycleBars: 4` pour 4 cases
    (`defaults.ts`), donc 16 temps sur 4 cases — trois traits au travers
    de chaque case. Au-delà de 8 temps on retombe sur les seules barres
    de mesure (les deux périodes du dégradé sont rendues égales, la
    couche « mesure », plus marquée et dessinée par-dessus, recouvre
    celle des temps). Seuil volontairement haut pour préserver LE cas qui
    compte — hat à 3 pas contre 4 temps, la polyrythmie qu'on cherche
    justement à rendre lisible.
  - **Pas de règle de temps numérotée sur l'onglet Synthé**, contrairement
    à Rythme, et c'est délibéré : sur Rythme toutes les lignes couvrent
    une mesure, un « 1·2·3·4 » partagé est donc vrai pour toutes. Sur
    Synthé les lignes ont des portées différentes (Basse/Mélodie 1
    mesure, Nappe 4 par défaut) — une règle unique mentirait pour au
    moins une ligne. À la place, la portée du cycle est accolée au
    libellé de la ligne (« NAPPE · 4 mes. ») quand elle dépasse une
    mesure : sans ça, deux grilles d'apparence identique ne représentent
    pas du tout la même durée. Porté par le libellé existant plutôt que
    par un badge séparé — aucun élément permanent de plus, aucune hauteur
    gagnée (règle du §7.5).
- **B3 · B4 · B6** (finitions) — voir le palier 3 de l'audit. **B8 fait le 2026-08-17** (voir plus bas).
  **Mis à jour le 2026-08-16** : B7 (menubar sur deux lignes) est fait ;
  **B5** (anneau synthé délavé) et **B9** (canvas `FilterCurve` qui flotte)
  n'existent plus — les deux ont été résolus par *suppression* (un seul
  anneau au lieu de deux, `FilterCurve.svelte` supprimé), pas par
  correction. Quatre constats restants sur neuf.
- 🅿️ **Accessibilité — SORTIE de la dette ouverte le 2026-08-16** (arbitrage
  D4 de Yann : « l'App est pour le moment testée uniquement sur téléphone, le
  mode ordinateur est en friche »). Le clavier est un sujet d'ordinateur, il
  repart avec le chantier desktop. Ne plus la compter comme un item d'audit
  non traité. Deux restes minuscules, à prendre en passant et pas à
  planifier : un `aria-label` par case (les lecteurs d'écran de TÉLÉPHONE,
  VoiceOver et TalkBack, sont concernés eux aussi) et le conflit de la barre
  d'espace. Détail : voir « Arbitrages (suite) et 3e lot ». Ancien contenu de
  l'entrée, conservé pour mémoire : `role="grid"`/
  `gridcell`, `aria-pressed`, un libellé par pas (« Kick, pas 5, actif,
  roll ×2 »), `prefers-reduced-motion` sur la loupe et les animations.
  Tout est à 0 aujourd'hui. À faire, ou à assumer explicitement comme
  non-objectif du projet — mais plus à laisser passer pour acquis.

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

## ✅ Verrou dur des modules + accès `#boss` — 2026-08-16

> « je suis plutôt pour le verrou dur / je propose également que tu crées un
> url pour que je puisse accéder directement à tout, par exemple
> https://boite-a-rythmes.vercel.app/#boss »

**Livré.** Premier morceau réel du chantier D2 : la colonne vertébrale du
déblocage. Le `#boss` ne pouvait pas être livré seul — c'est le contournement
d'une serrure qui n'existait pas encore.

### Périmètre volontairement réduit aux MODULES

Verrouillés : **Atelier, Synthé, Production, Mode Live**. Le déblocage
contrôle par contrôle (rafale au 11, swing au 14…) proposé dans le 3ᵉ lot
**n'est pas fait** : cette grille-là n'a pas encore été validée, et la câbler
sur une trentaine de contrôles avant validation, c'est du travail à refaire.
Les seuils posés ici sont ceux qui étaient **déjà décidés**.

| Module | Seuil | D'où il vient |
|---|---|---|
| Atelier | 2 | réussir le niveau 1 — arbitrage D2 de Yann |
| Synthé | 13 | **verbatim de l'original** |
| Production | 27 | **verbatim de l'original** |
| Mode Live | 34 | dernier niveau — arbitrage D2 (l'original n'avait pas ce mode) |

### Trois pièges rencontrés, dont deux invisibles à la relecture

**1. Le seuil de l'Atelier ne pouvait pas être 1.** `PlayerProgress.level` est
le niveau ATTEINT, et un joueur tout neuf démarre déjà à `{ level: 1 }` ; c'est
réussir le niveau N qui écrit `N + 1`. Un seuil à 1 aurait donc ouvert
l'Atelier à tout le monde dès la première visite — un verrou qui ne verrouille
rien, et qui aurait eu l'air de marcher. (L'original portait bien `drum: 1`,
mais chez lui ça voulait dire « jamais verrouillé », cohérent avec son
`return true`.) Le seuil est à **2**, et un test tombe si quelqu'un remet 1.

**2. Un seuil au-dessus de `LEVELS.length` casserait « master » en silence.**
Le pseudo de test renvoie `level = LEVELS.length` (34), et l'original comptait
là-dessus pour n'avoir « aucun cas particulier à gérer » sur les modules.
Mettre `live: 35` (« campagne finie ») aurait donc rendu le Mode Live
inaccessible **au contournement lui-même**, et à quiconque a tout terminé.
D'où `live: 34`, plus une assertion au chargement du module ET un test.

**3. Le pseudo n'était jamais mémorisé — et ça rendait le verrou absurde.**
Trouvé **en testant**, pas en relisant : `pseudo = $state('')`, redemandé à
chaque visite. Or la progression est rangée PAR pseudo. Donc au moindre
rechargement, `playerProgress` retombait à `{ level: 1 }` et **l'Atelier se
reverrouillait pour quelqu'un qui l'avait ouvert vingt niveaux plus tôt.**
Le défaut existait avant (il fallait déjà retaper son nom à l'identique pour
retrouver ses étoiles), mais il était sans conséquence tant que rien ne
dépendait de la progression. Corrigé : `boite-a-rythme:pseudo` persiste le
dernier pseudo.
- **Conséquence à assumer** : le formulaire de pseudo ne réapparaît plus à
  chaque visite — or c'est lui qui servait, de fait, à changer de joueur. Le
  `👤 pseudo` de l'en-tête du jeu est donc devenu cliquable (`clearPseudo()`),
  souligné en pointillés plutôt que transformé en troisième bouton. La
  progression et les besaces ne sont pas touchées : elles reviennent en
  retapant le nom.

### `#boss` — les détails qui comptent

- `#boss` ouvre tout, **`#boss=off`** revient à la vue d'un vrai visiteur.
  Sans issue, un contournement permanent empêcherait de jamais revoir ce que
  voit quelqu'un d'autre — c'est-à-dire de tester le verrou qu'on vient
  d'écrire.
- **Mémorisé** (`boite-a-rythme:boss`) : une visite suffit, pas besoin de
  remettre le hash à chaque fois.
- **Écouteur `hashchange`** : taper `#boss` dans la barre d'adresse d'une page
  DÉJÀ ouverte ne la recharge pas. Sans ça la bascule n'aurait pris effet
  qu'au rechargement suivant, et aurait eu l'air cassée. Trouvé en testant
  `#boss=off`. Couper l'accès depuis un module désormais verrouillé renvoie à
  l'accueil plutôt que d'y laisser l'utilisateur.
- Un bandeau discret sur l'accueil rappelle qu'on est en accès total —
  sinon on teste sans le savoir une appli qui n'est pas celle des autres.
- Le pseudo **« master »** reste valable et n'est pas remplacé : il sert
  toujours dans le jeu. `#boss` existe parce que le pseudo se saisit *dans le
  Mode jeu*, or c'est précisément le chemin qu'un verrou dur sur l'Atelier
  coupe.

### Un lien de partage continue de fonctionner

`#r=…` ouvre l'Atelier **même verrouillé**, pour cette session et sans rien
débloquer d'autre. Sinon un lien envoyé à quelqu'un qui n'a jamais joué serait
tombé sur un écran de verrou : le partage, déjà livré, aurait cessé de
marcher du jour au lendemain. Le lien EST l'intention d'ouvrir l'Atelier.

### « Dur » porte sur l'accès, pas sur la visibilité

Les entrées verrouillées restent **affichées**, éteintes, avec 🔒 et le niveau
qui les ouvre. C'est ce que faisait l'original (un overlay de verrouillage, pas
un module escamoté) : une entrée qui disparaît se lit comme une panne, une
entrée cadenassée se lit comme une suite. Si Yann veut l'invisibilité totale,
c'est un `{#if}` à ajouter, pas une reprise.

### Vérifications

- `npm run check` 0 erreur · **21 tests** (7 nouveaux) · les deux builds.
- **Tests validés par régressions simulées**, comme pour le scheduler : remettre
  `atelier: 1` fait tomber le test du verrou initial ; passer `live` à 35 fait
  échouer le chargement du module avec le message attendu. Un test vert sur un
  verrou qu'on vient d'écrire ne prouve rien tant qu'on ne l'a pas vu rougir.
- **Parcours réels vérifiés au navigateur** (390×844) : visiteur neuf (Atelier
  et Live cadenassés, clic sans effet) ; `#boss` (tout ouvert) ; `#boss=off` à
  chaud sans rechargement ; éjection vers l'accueil quand l'accès est coupé
  depuis l'Atelier ; joueur « yann » niveau 14 **après rechargement** (Atelier
  et Synthé ouverts, Production et Live fermés) ; lien de partage reçu par
  quelqu'un qui n'a jamais joué (Atelier ouvert, Synthé et Production fermés).

### Reste à faire sur D2

- La **grille contrôle par contrôle** du 3ᵉ lot, à valider avant câblage.
- Le **2ᵉ type d'exercice** (l'accord de fond de D2), pas commencé.
- Une **explication dans le Mode jeu** de ce que le prochain palier va ouvrir :
  aujourd'hui le verrou dit « niveau 13 » sans dire ce qu'on y gagne.

---

## Correctif — « master » ne doit pas être mémorisé (2026-08-16)

Signalé par Yann (« le boss mode est toujours activé j'ai l'impression »),
puis « c'est compris, j'avais mal lu » : le cas qu'il voyait était bien
`#boss` persisté, annoncé par sa bannière. **Mais la reproduction a mis au
jour un vrai défaut, introduit la veille en persistant le pseudo.**

`playerProgress` renvoie le niveau MAXIMUM pour le pseudo « master ». Tant
que le pseudo n'était pas mémorisé, c'était un contournement de session.
Depuis qu'il l'est, taper « master » une fois débloquait tout **à chaque
visite ensuite**, avec deux aggravations :
- **rien à l'écran ne l'expliquait** (la bannière ne couvrait que `#boss`) ;
- **`#boss=off` n'y pouvait rien**, puisque ça ne passe pas par `#boss`.

Autrement dit, le seul moyen d'en sortir était de vider le stockage local.
Vérifié en reproduisant : pseudo `master` mémorisé → Atelier ouvert, aucune
bannière, aucune sortie.

**Correctif :** « master » n'est plus jamais écrit dans
`boite-a-rythme:pseudo`, et une valeur héritée est **effacée au chargement**
— sans ce nettoyage, quiconque avait tapé « master » avant le correctif
resterait bloqué en accès total.

**Et l'accès total devient visible partout** : `unlocks.totalAccess` dit
*pourquoi* c'est ouvert (`#boss` ou pseudo master) et comment en sortir ; la
bannière d'accueil le reprend, et un marqueur `🔓 accès total` apparaît dans
la barre d'outils de l'Atelier. Il n'existe QUE pendant un contournement :
zéro pixel pour un visiteur normal, donc rien à échanger au titre de la
règle n°1 du §7.5. Il est là parce que l'accueil n'est pas l'endroit où le
doute survient — on est dans l'Atelier quand on se demande si ce qu'on voit
est ce que voient les autres. À retirer sans regret si c'est de trop.

**Vérifié** (390×844, six parcours) : visiteur neuf verrouillé · `#boss`
ouvert avec sa bannière · `master`/`Master` hérités **nettoyés
automatiquement**, Atelier de nouveau verrouillé · joueur normal niveau 14
ouvert par sa vraie progression, sans marqueur · « master » tapé en session
marche mais **ne survit pas au rechargement** · marqueur présent en `#boss`,
absent pour un joueur normal.

---

## ✅ Tempo à l'unité + densité des mélodies (R1a) — 2026-08-17

Deux premiers items de la file exécutable du plan consolidé.

### Tempo réglable à l'unité

Le curseur de l'Atelier était déclaré `step={10}`, et `XpSlider` arrondit
**aussi la valeur tapée au clavier** (`XpSlider.svelte:72`) : taper « 123 »
donnait 120, le réglage à l'unité était littéralement impossible. Passé à
`step={1}`.

L'impression d'incohérence de Yann (« on le règle un peu partout ») venait
de là plus que du nombre d'endroits : il n'y en a que deux (bandeau de
l'Atelier, Mode Live) plus le Tap — mais le Mode Live faisait **déjà** ±1 BPM
(`LiveView.svelte:420`). Le même réglage n'obéissait pas aux mêmes règles
selon l'écran. Vérifié au navigateur : saisie « 123 » → 123, ↑ → 124,
Page↑ → 134 (le geste « par dizaines » ne se perd pas).

### Densité de la mélodie : facteur 0.6

La mélodie recevait `fillRate` **plein pot** là où la basse reçoit
`fillRate * 0.75`, au moment précis où c'est elle qui a la subdivision la
plus fine. Elle finissait la ligne la plus dense dans **21 presets sur 34**.

**Correction d'un chiffre déjà écrit ici** : les analyses précédentes
disaient « 31 presets sur 34 ». C'était un comptage fait à l'œil sur un
tableau ; le script dit **21**. Corrigé aux deux endroits du document.
L'argument tient toujours (la mélodie reste la plus dense en moyenne), mais
le chiffre était faux et il avait déjà été répété.

Facteur choisi **par mesure sur les 34 presets**, pas au jugé :

| facteur | mélodie | pire cas | ligne la plus dense |
|---|---|---|---|
| 1.00 (avant) | 1,86 note/mes. | 7,0 | 21/34 |
| **0.60** | **1,12** | **4,5** | **10/34** |
| 0.50 | 0,99 | 4,5 | 8/34 |

0.6 est le point où la mélodie repasse **sous la basse** (1,12 < 1,15),
c'est-à-dire où elle cesse d'être la ligne la plus chargée. Descendre à 0.5
ne gagne plus rien sur les pires cas et creuse l'écart sans raison — le plus
petit changement qui règle le problème.

### Le filet qui a manqué de sortir en silence

Avec le facteur seul, **`clave23` se chargeait avec une mélodie entièrement
vide**. Une ligne vide n'a pas l'air aérée, elle a l'air cassée. Un plafond
au lieu d'un facteur ne réglait rien (mesuré : le vide réapparaît dès 0,40) —
parce que ce n'est pas une question de courbe mais **un accident de graine** :
chaque pas étant un tirage indépendant, une ligne à 8 pas peut sortir vide.

D'où un filet dans `randomizePitchedLine` : si la ligne ressort entièrement
vide, une note est posée **sur le premier pas**, à la **fondamentale de
l'accord actif** — l'endroit et la note qui ne peuvent pas sonner faux. Et
**aucun tirage supplémentaire** (`degrees[0]`, pas `randomChordToneDegree`),
donc le flux du générateur n'est pas décalé.

### Ce que ça change, et ce que ça ne change pas

- Les **34 presets** sonnent avec une mélodie plus aérée. C'est le but.
- Les **morceaux sauvegardés ne bougent pas** : la sérialisation stocke les
  notes, pas la graine.
- Le **déterminisme est intact** : à graine égale le rendu reste
  reproductible. C'est le résultat qui change, pas sa stabilité — un test le
  vérifie sur les 34 presets.

### Vérifications

`npm run check` 0 erreur · **24 tests** (3 nouveaux, `tests/generators.test.ts`)
· les deux builds. **Tests validés par régressions simulées** : retirer le
filet fait tomber le test des lignes vides ; remettre la mélodie à plein pot
fait tomber celui de la densité.

Piège TypeScript à connaître : `pattern.every(v => v == null)` fait inférer
un prédicat de type et réduit le tableau à `null[]`, ce qui interdit d'y
écrire ensuite. `!pattern.some(v => v != null)` ne narrow pas.

### Reste de R1

**R1(b)** — la mélodie par motif court répété — n'est pas fait. C'est le vrai
correctif musical : aujourd'hui chaque pas reste un tirage indépendant, donc
une texture plus aérée, mais toujours pas une phrase.

---

## ✅ B8 — les cases synthé vides n'ont plus l'air désactivées (2026-08-17)

Dernier constat visuel de l'audit qui restait sur les lignes synthé : « une
ligne vide = des rectangles gris avec un « · » centré, qui ont l'air
désactivés à côté des cases batterie franchement colorées ».

**Vérifié avant de coder** (deux constats de l'audit s'étaient déjà révélés
périmés) : celui-ci est réel, mais **pas pour la raison écrite**. La teinte
des cases vides n'était pas absente — le port l'avait bien faite, avec la
MÊME recette que la batterie (10 % / 26-28 %, bordure à 45 %). Deux autres
causes, trouvées en comparant les deux grilles au pixel :

1. **Le « · ».** C'est un signe : il dit « il y a quelque chose ici, en tout
   petit ». Le vide, lui, se lit très bien tout seul — c'est exactement ce
   que font les cases de batterie éteintes, qui ne portent rien. Supprimé.
2. **La même recette ne donne pas le même résultat selon la teinte.** À
   10 %, l'orange du kick reste franc ; l'indigo, le violet et le rose des
   lignes synthé virent au lavande pâle. Une formule identique produisait donc
   une grille prête d'un côté et éteinte de l'autre. Relevé à **18 % / 40 %,
   bordure 60 %** sur les trois lignes synthé — on égalise **ce qu'on voit**,
   pas ce qu'on écrit.

**Ce que ça ne change pas** : aucune hauteur, aucun élément ajouté ou retiré
de l'écran (un glyphe en moins, deux pourcentages changés). Aucun coût.

**Reste ouvert sur ces cases**, et qui relève du chantier « choix des notes »
(N1) plutôt que de B8 : les deux boutons d'octave ▲▼ n'apparaissent que sous
les cases actives, ce qui donne une seconde rangée en dents de scie.

---

## ✅ Pad d'écriture des notes dans l'Atelier (R6 + N1) — 2026-08-17

> « pouvoir ouvrir un pad depuis l'atelier pour jouer/enregistrer une mélodie
> qui s'inscrit dans la grille » — et, au-dessus, « simplifier grandement le
> choix des notes ».

`src/ui/sequencer/NotePad.svelte`, ouvert par un 🎹 dans l'en-tête des lignes
**Basse** et **Mélodie**.

### Ce que ça remplace (§7.5, règle n°1)

Le choix d'une note se faisait en **tapant plusieurs fois sur la case** :
`cycleCell` fait défiler silence → 1 → 2 … → 7 → silence. Mesuré : poser un
degré 5 coûtait **5 appuis**, corriger un 6 en 3 en coûtait **5 de plus** (il
faut retraverser le silence), une mélodie de 4 notes ≈ **15 appuis**. Avec le
pad, **une note = un appui**. Le défilement par la case reste là pour les
retouches ponctuelles — on n'enlève rien, on ajoute le chemin direct.

**Coût écran : zéro tant qu'il est fermé.** C'est un panneau, pas une barre —
la condition posée en acceptant que le pad vive dans l'Atelier plutôt que
dans le Mode Live (surface déjà saturée).

### Deux comportements, aucun bouton de mode

- **À l'arrêt** : écriture pas-à-pas, le curseur avance tout seul et l'en-tête
  affiche « pas 3 / 8 ». C'est ce qui répond à « simplifier le choix des
  notes ».
- **En lecture** : enregistrement en direct, chaque appui écrit sur le pas le
  plus proche.

La situation dit déjà lequel s'applique ; un troisième bouton à comprendre
n'apporterait rien. C'est aussi ce que fait n'importe quelle boîte à rythmes.

### Sept touches, pas un piano

Le modèle d'état n'est pas fait de notes fixes mais de **degrés de gamme 1-7**
(+ octave). Un clavier de piano obligerait à traduire dans les deux sens et
laisserait poser des notes hors gamme, que le reste de l'appli s'interdit.
Sept touches, c'est exactement le modèle — et sur un téléphone, sept cibles de
48px valent mieux que douze étroites dont cinq noires.

Les degrés qui appartiennent à **l'accord en cours sur le pas visé** sont
teintés : la même information que le point de justesse des cases, mais donnée
**avant** de poser la note plutôt qu'après. Une aide, pas une contrainte — les
autres degrés restent jouables.

### La quantification, et le défaut qu'elle évite

Un doigt tombe toujours un peu après le temps. Écrire sur le pas **en cours**
rangerait une note jouée juste avant le pas suivant sur le précédent, et tout
ce qu'on enregistre sonnerait **en retard d'un pas** — un défaut qui ne se
voit pas, qui s'entend. On arrondit donc au pas le plus proche.

Ça demandait de savoir non pas quel pas joue, mais **depuis combien de temps**.
`AtelierView` horodate désormais l'arrivée de chaque pas synthé
(`performance.now()` au moment où le moteur relâche l'événement, donc calé sur
l'horloge AUDIO comme l'aiguille de l'anneau). Volontairement **pas** un
`$state` : personne n'a besoin de réagir à cette valeur, elle n'est lue qu'au
moment d'un appui — en faire un état réactif déclencherait un rendu à chaque
pas de chaque ligne.

La règle elle-même est sortie du composant dans **`engine/quantize.ts`**, pur
et testé : c'est le genre de décalage d'un pas qui reste invisible tant que
personne n'a enregistré une vraie mélodie.

### Moteur

Une méthode ajoutée, `AudioEngine.playDegreePreview(name, degree, octave)` :
`previewSynth` ne savait jouer que le degré 1, et `playLiveMelodyNote` ne sert
que la Mélodie et veut une fréquence déjà calculée. Elle reste le seul endroit
qui connaît le registre de chaque ligne — les −24 demi-tons de la basse sont
les **mêmes** que ceux du scheduler, pour que le pad sonne comme la grille
jouera.

### Vérifications

`npm run check` 0 erreur · **31 tests** (7 nouveaux) · les deux builds.

- **Tests de quantification validés par régressions simulées** : écrire
  toujours sur le pas en cours fait tomber 3 tests ; passer l'inégalité de
  stricte à large en fait tomber 1 (celui de la frontière exacte).
- **Parcours réels au navigateur** (390×844). À l'arrêt : 5, 3, 7, silence →
  motif `5 3 7 ·`, curseur qui avance et se replie, octave +1 appliquée.
  En lecture (200 BPM, 8 pas) : quatre notes jouées, **écart maximum 1 pas**
  entre la tête de lecture et le pas écrit — c'est l'arrondi au plus proche,
  pas une dérive.

### Reste ouvert

- La **Nappe n'a pas de pad** : elle pose des accords, pas des degrés — un pad
  à 7 touches n'y voudrait rien dire. À traiter séparément si le besoin vient.
- Les opérations **sur la ligne entière** (transposer, dupliquer la première
  moitié, décaler, inverser) — le raccourci proposé pour éviter la
  multi-sélection tactile — ne sont pas faites.
- Le nit d'octave des cases (les ▲▼ en dents de scie sous les cases actives)
  reste ouvert ; le pad le contourne sans le supprimer.

---

## ✅ Fill de clap (R4) — 2026-08-17

> « Pour les claps : il faudrait proposer un fill de clap »

Le clap traversait les mesures de fill sans rien faire : la zone de fill était
réservée à la snare (`fillZone = name === 'snare' && …`).

### Le piège, et comment il est évité

Un fill fait sonner des pas aujourd'hui silencieux, donc **des tirages
aléatoires en plus** — et un tirage de plus, même inaudible, décale tout ce
qui suit. C'est l'interdit de `CLAUDE.md`, et les anciens exports MP3
cesseraient d'être reproductibles.

Solution retenue : un **second générateur**, `fillRng`, réservé aux frappes
ajoutées. Le flux principal consomme exactement ce qu'il consommait avant.

Deux choix qui font que ça tient :

1. **Le fill de clap AJOUTE, il ne remplace pas.** Celui de la snare détourne
   le chemin normal et fait sonner tous les pas de la zone. Ici on laisse le
   chemin normal se dérouler intact et on ne garnit **que les pas vides** —
   d'où l'absence totale de contact avec le flux principal. C'est aussi le
   bon choix musical : un clap qui double la fin de mesure, pas un clap qui
   écrase ce qu'on a programmé.
2. **`fillRng` est OBLIGATOIRE dans le contexte**, pas optionnel avec repli
   sur `rng` : un repli réintroduirait silencieusement le décalage qu'on
   cherche à éviter. Le compilateur a d'ailleurs trouvé les trois appelants
   tout seul (AudioEngine, render-offline, le test).

À l'export, le second flux est dérivé de la **même graine** (`seed ^
0x9e3779b9`) : reproductible à l'octet près, mais décorrélé du premier —
sinon les deux avanceraient de concert et le clap suivrait la vélocité des
autres lignes. En direct, c'est `Math.random` des deux côtés, rien n'y est
reproductible de toute façon.

### Le critère annoncé est tenu

« `tests/scheduler.test.ts` reste vert **sans être mis à jour** — s'il faut le
modifier, c'est que la solution est ratée. » L'instantané de référence **n'a
pas bougé** : le fixture du test a `fillEvery: 0`, aucun fill ne s'y déclenche,
et surtout le flux principal est intact.

Deux tests ajoutés (33 au total) :
- un fill de clap garnit bien la fin de la mesure de fill ;
- **le fill ne consomme rien sur le flux principal** — prouvé en faisant
  varier UNIQUEMENT la graine du second flux : toutes les autres lignes
  doivent rester rigoureusement identiques, seuls les claps bougent. Avec son
  jumeau (deux graines différentes donnent des claps différents), sans quoi le
  test serait vide de sens.

**Validés par régressions simulées** : faire puiser le fill dans `rng` fait
tomber le test de non-interférence ; retirer le fill en fait tomber deux.

### Un fixture qui ne prouvait rien, corrigé

Premier jet des tests : ils échouaient. Cause trouvée — `busyState` donne 4
pas au clap, la zone de fill se réduit donc au **dernier pas seul**, qui porte
déjà une note ; le fill ne garnissant que les pas vides, il ne se déclenchait
jamais. C'était le fixture qui était faux, pas la règle. Les tests ont
désormais leur propre état (clap à 8 pas, deux derniers libres).

---

## ✅ Pad — reprise en main (2026-08-17)

> « le pad : difficile à prendre en main, on peut mieux faire »

Retour volontairement vague, donc diagnostic avant redesign. Quatre points de
friction **mesurés dans l'appli**, pas devinés — trois d'entre eux étaient
invisibles à la relecture du code parce qu'ils tiennent à ce qu'on VOIT, pas à
ce que le composant fait.

### 1. On écrivait à l'aveugle — c'était le problème principal

Constaté en listant les classes des huit cases de la Mélodie, pad ouvert :
elles étaient **rigoureusement identiques**. Rien, dans la grille, n'indiquait
où la prochaine note allait tomber. Le seul repère était un « pas 3 / 8 » en
petit gris dans l'en-tête du pad — il fallait donc compter les cases pour le
traduire.

Cause structurelle : le curseur vivait **dans** le pad, la grille ne pouvait
pas le connaître. Il est remonté dans `SynthRowView` et partagé
(`bind:cursor`) ; la case visée porte désormais un contour net.

Trait **plein et sombre**, pas la teinte ambre de la tête de lecture : les
deux ne s'affichent jamais en même temps (le curseur ne sert qu'à l'arrêt),
mais s'ils se ressemblaient on confondrait « là où ça joue » et « là où
j'écris ».

### 2. On ne pouvait pas viser un pas

Pour écrire sur le pas 5 en partant du pas 1, il fallait **quatre appuis sur
« ← »** — et « ← » est désactivé pendant la lecture. Désormais, pad ouvert et
lecture à l'arrêt, **un appui sur une case y amène le curseur**.

C'est un changement de comportement de la case, assumé : tant que le pad est
ouvert, la grille sert à viser ; refermé, elle refait défiler les notes comme
avant. Ce qui rend le mode acceptable, c'est qu'il est **visible** — le pad
est ouvert à l'écran et la case visée est entourée.

### 3. Les touches étaient des chiffres abstraits

`1 2 3 4 5 6 7`. Un degré de gamme ne dit rien à qui ne pense pas en degrés —
or l'appli **connaît** la tonalité et le mode, et savait déjà nommer les notes
(`noteNameForScaleDegree`, qui sert aux libellés d'accords). Les touches
affichent maintenant **Do Ré Mi Fa Sol La Si**, avec le degré en petit
dessous : c'est lui qui figure dans la case de la grille, les deux doivent
pouvoir se raccorder. Les noms suivent la tonalité choisie.

### 4. Le pad s'ouvrait hors écran

Mesuré à 390×900 : le pad de la Mélodie s'ouvrait **sous la ligne de
flottaison**. On appuyait sur 🎹 et il ne se passait rien de visible. Il
défile maintenant dans la vue à l'ouverture.

Piège rencontré : `queueMicrotask` ne suffit pas. Svelte 5 groupe ses mises à
jour du DOM, le microtask s'exécute **avant** que le panneau existe et on
faisait défiler vers un élément absent — le pad restait coupé de 30px, et ça
ne se voyait qu'en mesurant. `await tick()` règle le cas.

### Deux mesures qui ont corrigé mes propres réglages

- **Débordement à 320px** : les sept touches sortaient de 14px. Les pistes de
  grille ont un minimum `auto`, donc elles refusent de descendre sous la
  largeur de leur contenu — `minmax(0, 1fr)`, le même piège que celui corrigé
  sur `XpSlider` (audit A2), côté grille plutôt que flexbox.
- **Seuil de resserrement à 400px et non 360** : à 360 pile, « Sol »
  débordait encore de 3px. Vérifié ensuite sur **320 / 360 / 390 / 430 /
  768** — aucun débordement, hauteur de cible tenue à 48px partout.

### Vérifications

`npm run check` 0 erreur · 33 tests · les deux builds. Parcours au navigateur :
case visée entourée dès l'ouverture · un appui sur la 5ᵉ case donne « pas
5 / 8 » · une touche écrit le degré et la visée avance · touches lues
« Do Ré Mi Fa Sol La Si ».

### Ce que je n'ai pas touché, et pourquoi

Le **double comportement** (pas-à-pas à l'arrêt, direct en lecture) est
conservé : les quatre défauts ci-dessus expliquent la difficulté sans qu'il
soit en cause, et avec le curseur visible il devient lisible. À rouvrir si la
gêne persiste — c'est le prochain suspect.

---

## ✅ Audit design de l'onglet Synthé — 2026-08-17

> « il faut faire un audit design du synthé ! il y a trop d'espace entre le
> haut et la partie Séquenceurs. / tempo : est-ce nécessaire de le régler
> ici ? / tonalité, nb de notes, ça peut descendre dans une partie plus bas /
> sous sections des lignes de synthé : il faut que ça rentre dans une seule
> ligne »

### Le constat, chiffré

L'onglet Rythme avait été ramené à **32 %** de chrome sur le premier écran
(audit A1). **L'onglet Synthé n'avait jamais été mesuré : il était à 66 %.**
561px avant la première case jouable à 390×844, soit deux tiers de l'écran
d'un téléphone consommés avant de pouvoir poser une note.

Trois blocs se partageaient ces 561px, et aucun n'avait à être là :

| Bloc | Hauteur | Sort |
|---|---|---|
| Bandeau tempo | 66px | retiré de cet onglet |
| Tonalité / Mode / Nb d'accords | 82px | descendu sous les lignes |
| Taux de remplissage + 🎲 global | 64px | descendu sous les lignes |

### Tempo : non, il n'a rien à faire ici

Il tombait juste sous la barre sticky **par accident de mise en page** : il
est placé sous le séquenceur batterie, et sur Synthé il n'y a pas de
séquenceur batterie au-dessus de lui. Réservé à l'onglet Rythme — on pose un
tempo avec le rythme, on n'y revient pas en écrivant une mélodie. Il reste
réglable là-bas, et dans le Mode Live.

### Harmonie et remplissage : descendus, pas déplacés dans une ligne

Ils restent **globaux** — `chordsFor` gouverne les trois lignes à la fois. Les
mettre *dans* une ligne mentirait sur leur portée. Ils passent donc **sous**
le séquenceur, exactement comme le tempo au 2ᵉ lot.

### Pastilles sur une seule ligne

Mesuré avant : **324px nécessaires pour 322 disponibles** sur Basse et
Mélodie — il manquait **deux pixels** — et **484px** sur la Nappe, qui en
portait six.

- Remplissage horizontal resserré (10px → 7px), hauteur de cible inchangée à
  28px (audit A3).
- Libellés raccourcis : « Oscillateur » → **Timbre** (le nom qu'utilisent
  déjà les lignes de batterie pour le même panneau), « Filtre & espace » →
  **Filtre**, « Arpégiateur » → **Arpège**. Les titres des panneaux gardent
  leur nom complet.
- Ça suffisait pour Basse et Mélodie (229px), **pas pour la Nappe** (352px
  pour 322). D'où une fusion : **Arpège et Bourdon deviennent une pastille
  « Jeu »** — les deux répondent à la même question, comment la Nappe joue
  l'accord, égrené ou tenu. Le panneau les sépare par deux sous-titres au
  lieu de deux replis. Nappe : **268px, une ligne**.

### Résultat mesuré

| | Avant | Après |
|---|---|---|
| Avant la 1re case jouable (390px) | **561px — 66 %** du 1er écran | **323px — 38 %** |
| Hauteur de page | 1 312px (1,55 écran) | **1 134px (1,34)** |
| Pastilles par ligne | 2 lignes partout | **1 ligne**, de 320 à 768px |

Vérifié sur **320 / 360 / 390 / 768**. À 320px il a fallu un cran de
resserrement supplémentaire pour que la Nappe tienne encore sur une ligne.

Les débordements de **+2px** relevés sur `.xp-slider` / `.two-col` sont
**antérieurs** à cette passe (artefact sous-pixel du `input[type=range]`, déjà
présent dans les relevés précédents) — ni introduits, ni corrigés ici.

### Reste ouvert

Le **🎲 par ligne** flotte toujours à droite de l'en-tête de ligne ; Yann
l'avait demandé « dans la sous-section séquence ». Pas fait dans cette passe,
qui portait sur la hauteur du haut de page.

> ⛔ **Périmé — 2026-08-19.** Yann a abandonné cette demande, jugée obsolète.
> Le 🎲 reste dans « Harmonie & remplissage ».

---

## ✅ Pad : délai d'attaque et suppression · bloc du bas rangé — 2026-08-17

### « un petit délai entre la touche et la note qui se joue »

**Cause trouvée, et ce n'était pas l'audio.** Les touches du pad écoutaient
`onclick`. Sur mobile, un `click` ne part qu'au **relâchement** du doigt : la
note attendait qu'on lève la main. Le délai ressenti n'était pas une latence
de moteur, c'était la durée de l'appui.

L'écart était propre au pad : les cases de batterie écoutaient déjà
`onpointerdown` (`DrumRowView.svelte:109`). Aligné. `preventDefault` empêche
le click fantôme qui suivrait et rejouerait la note.

*Ce que ce n'était pas*, vérifié avant de conclure : l'aperçu est programmé à
`currentTime + 0.02` et les attaques des voix vont de 5 à 80ms — de quoi
expliquer quelques millisecondes, pas un délai perceptible.

### « difficile de supprimer une note »

Le silence était un petit bouton relégué en bas à droite, à côté de « ← ».
Effacer est pourtant un geste aussi fréquent que poser. Il devient une
**huitième touche**, au même format que les sept degrés, dans la même rangée :
`∅ vide`. Supprimer coûte maintenant deux gestes — viser la case, appuyer sur
∅ — tous deux sur des cibles de 48px.

Vérifié de 320 à 768px : huit touches, aucun débordement, hauteur de cible
maintenue à 48px.

### « il faudrait aussi que ce soit mieux rangé sous le synthé »

En descendant l'harmonie et le remplissage sous les lignes (passe
précédente), je les avais laissés **nus** : deux rangées de contrôles
flottant entre le séquenceur et le cadre « Sidechain », sans titre, alors que
tout ce qui les entoure en a un. Ils sont désormais dans un
`<fieldset>` **« Harmonie & remplissage »**, comme Sidechain et Groove — le
bas de l'onglet redevient une suite de blocs nommés plutôt qu'un ruban.

### ⚠️ Le vrai désordre restant : la ligne à 128 pas

Visible sur la capture de Yann : une Mélodie réglée sur 128 notes affiche
**seize boutons de paquets sur trois rangées** (1-8, 9-16, … 121-128) avant
même la grille. C'est de loin le plus gros bloc de l'onglet, et ce n'est pas
traité ici. Ça relève de la question ci-dessous.

---

## ⚠️ « du fait du clavier, on peut se poser la question du design des lignes de synthé »

Question ouverte par Yann, à trancher — pas de code écrit dessus.

Le pad change la donne : il est désormais le chemin direct pour écrire une
note (un appui contre jusqu'à sept), et il rend visible ce que la grille
faisait porter à la case. Trois éléments de la ligne deviennent discutables :

1. **Le défilement au clic sur la case** (`cycleCell`). Sa seule qualité
   était d'être le SEUL moyen de poser une note. Il reste utile pour une
   retouche d'un cran, mais ce n'est plus le chemin principal. Pad ouvert, il
   est d'ailleurs déjà remplacé par « viser ce pas ».
2. **Les deux boutons d'octave ▲▼ sous chaque case active.** Ils créent une
   seconde rangée en dents de scie (ils n'existent que sous les cases
   pleines), et le pad a déjà un réglage d'octave. Candidats sérieux à la
   suppression.
3. **Les seize boutons de paquets** d'une ligne longue. Le pad, lui, se
   déplace pas à pas sans pagination — il n'a pas besoin de voir les 128
   cases pour en remplir une.

**Ce que je propose de trancher**, dans l'ordre de gain :
- retirer les ▲▼ des cases (l'octave vit dans le pad) ;
- remplacer la pagination par paquets par un défilement horizontal de la
  grille, ou par un affichage compressé quand la ligne dépasse ~32 pas ;
- garder le défilement au clic, mais comme geste secondaire assumé.

Rien de tout ça n'est fait : ce sont des choix de conception, et le premier
retire une capacité (régler l'octave case par case) qu'il faut accepter de
perdre.

---

## ✅ Design des lignes de synthé, après le pad — 2026-08-17

> « oui, tu peux lâcher » (les boutons d'octave par case)

Arbitrage rendu, les trois nettoyages proposés sont faits.

### Les ▲▼ d'octave quittent les cases

Deux boutons apparaissaient sous **chaque case pleine**, donc une seconde
rangée en dents de scie qui n'existait qu'à moitié. L'octave se règle
désormais au pad, et `shiftOctave` (plus aucun appelant) est supprimé, avec
ses styles.

**Retirer le contrôle ne devait pas retirer l'information.** Sans rien, une
note à l'octave supérieure serait devenue indistinguable d'une note normale —
et plus rien nulle part ne l'aurait dit. Les cases portent donc une marque
discrète **▴ / ▾** quand l'octave n'est pas neutre.

### Les seize boutons de paquets disparaissent

Une ligne à 128 pas affichait **seize boutons « 1-8 · 9-16 … 121-128 » sur
trois rangées**, pour ne montrer que huit cases à la fois. Remplacés par un
**défilement horizontal** de la grille complète, au-delà de 16 pas.

**Et ça rend les repères de temps, que la pagination interdisait.** Un paquet
commençait à une fraction quelconque de la mesure : les traits auraient été
déphasés, donc faux, et ils étaient désactivés dès qu'une ligne dépassait huit
pas (audit A5 : « mieux vaut aucun repère qu'un repère qui ment »). Une grille
complète garde la mesure entière sous les yeux.

⚠️ **Piège rencontré, qui aurait rendu ma propre affirmation fausse.** Les
repères sont dessinés par un `::after` en `position: absolute` : il se cale
sur la zone **visible** d'un élément qui défile. Posé tel quel, les traits
seraient restés **fixes pendant que les cases glissent dessous** — exactement
le repère menteur qu'A5 refusait. D'où un conteneur de défilement séparé de la
grille, celle-ci prenant la largeur de son contenu (`max-content`) pour que
ses repères couvrent le cycle entier et défilent avec lui. Vérifié sur le
`::after`, pas sur l'élément.

### Le défilement au clic reste

Geste secondaire assumé : il sert à retoucher d'un cran sans ouvrir le pad.
Pad ouvert, il est déjà remplacé par « viser ce pas ».

### Résultat mesuré (390px)

| | Avant | Après |
|---|---|---|
| Ligne Mélodie à 128 pas | 221px | **101px** (−54 %) |
| Ligne Basse, notes actives | 127px | **97px** (−24 %) |
| Page de l'onglet Synthé | 1 314px | **1 164px** |
| Boutons de paquets | 16 sur 3 rangées | **0** |
| Boutons ▲▼ | 2 par case pleine | **0** |

Repères de temps actifs sur une ligne à 128 pas : **oui** (ils ne l'étaient
plus au-delà de 8). Pastilles toujours sur une ligne de 320 à 768px.

### Reste ouvert

Le **🎲 par ligne** flotte encore à droite de l'en-tête, au lieu d'être dans
la sous-section Séquence comme demandé au 3ᵉ lot.

> ⛔ **Périmé — 2026-08-19.** Demande abandonnée par Yann.

---

---

## Audit design × DAW comparables — 2026-08-17

> « il me semblait avoir demandé un audit sur le design pour voir les autres
> types de daw. je souhaite remettre en cause le design XP »

**Rapport visuel complet :** <https://claude.ai/code/artifact/397c1f0b-c76e-4af5-bdc9-36831375ef3c>
(mesures, planche contact des trois langues visuelles, cinq familles du marché,
trois directions chiffrées). Ce qui suit en est le résumé exécutable.

### Pourquoi il n'avait pas été fait

Yann avait raison de le chercher : la demande est bien dans ce document, au
point **N4 — « Audit des DAW comparables »** (2026-08-16), avec sa question
d'origine citée. Mais N4 **recadre** l'audit avant de l'exécuter : puisque
`CLAUDE.md` pose que le design XP est l'identité du projet et pas un héritage
à moderniser, la partie *visuelle* a été retirée du périmètre (« ce qu'on peut
emprunter, ce sont les INTERACTIONS ») et le reste classé « chantier neuf à
cadrer ». L'audit n'a donc jamais tourné.

⚠️ **La demande du 2026-08-17 lève cette contrainte.** Si la direction B ou C
ci-dessous est retenue, `CLAUDE.md` doit être réécrit : en l'état il interdit
exactement ce qui vient d'être demandé.

### La mesure retourne la question (390×844, lu dans le DOM rendu)

⚠️ **Chiffre corrigé le jour même.** La première version de cette section
annonçait « 31 à 34 % de pastilles ». **Faux d'un facteur trois** : j'avais
sommé la hauteur de *chaque* pastille alors que trois d'entre elles partagent
une même ligne. L'emprise verticale réelle est de 11 % (Rythme) et 7 %
(Synthé). Le piège est exactement celui que ce document nomme déjà — « ne
jamais conclure sans mesurer » — sauf qu'ici la mesure elle-même était mal
posée. Comptabilité complète refaite ci-dessous, poste par poste.

**Onglet Rythme, page = 1 253px :**

| Poste | Hauteur | Part |
|---|---|---|
| Barre de menus | 64px | 5 % |
| Transport + astuce + onglets | 142px | 11 % |
| **Barres de titre XP** (2) | **64px** | **5 %** |
| **Cases du séquenceur** (5 rangs) | **170px** | **14 %** |
| **Pastilles** (5 bandes) | **140px** | **11 %** |
| En-têtes de ligne (5) | 140px | 11 % |
| Bandeau tempo + panneau du bas | 353px | 28 % |

**Anatomie d'une ligne de batterie — 99px :** `row-head` 28px (nom + 🔊) ·
`cells` **34px** · `group-bar` 28px (les 3 pastilles) · 9px de marges.

**Le look XP coûte 5 % de la page (10 % sur Production, qui empile cinq
fenêtres). Chaque ligne fait 99px et n'en consacre que 34 à la musique.**
Jeter XP ne rendrait donc pas l'écran plus utilisable ; le poste de dépense
est que chaque ligne dépense deux fois plus de hauteur à se présenter qu'à se
laisser jouer.

Corollaire pour §7.5 : le constat A1 (« 64 % de chrome ») est **éteint**, le
travail a été fait. Il est remplacé par un constat neuf, **A1′ — 65px de tour
de taille par ligne, pour 34px de cases**.

### Les cinq familles du marché (ce qu'on en prend)

1. **Grille sombre à LED** (Ableton Note, drumbit, SEQ-16, Shuffle Drummer,
   orDrumbox, BandLab) — le consensus, devenu indifférencié. *On prend le
   contraste allumé/éteint, pas le look.*
2. **Panneau sérigraphié** (TE EP-133 K.O. II, Pocket Operator, Novation
   Circuit, Polyend Play) — « futurisme cassette × brutalisme », étiquettes au
   pochoir à même la surface, aucun panneau à ouvrir. *L'antidote direct aux
   34 %.*
3. **Anti-tableur tactile** (Auxy) — conçu contre le « spreadsheet
   music-making ». *Petit clavier de référence à côté de la grille,
   appui-glissé pour poser puis ajuster — terrain du pad déjà livré.*
4. **Rack de pads** (Koala Sampler / SP-404) — la surface de jeu est
   permanente, les réglages sont des surcouches temporaires. *Aujourd'hui
   c'est l'inverse ici.*
5. **Rétro assumé** (là où le projet est déjà) — le revival Y2K est un courant
   actif en 2026. Conseil récurrent : *évoquer l'époque, pas rejouer son
   ergonomie cassée*.

### Quatre charges contre XP qui tiennent

1. **Le contraste est à l'envers.** Fond beige + ciel Bliss clair, case vide en
   dégradé pâle. Déjà remonté comme bug (B8), corrigé une fois, sur un terrain
   qui le reproduira.
2. **La barre de titre promet ce que le téléphone ne tient pas.** `×` est un
   gag, `_`/`□` sont un interrupteur en deux boutons : 3 cibles de 24px par
   fenêtre, **15 sur l'onglet Production**, pour un repli.
3. **La nostalgie ne pointe pas vers la musique.** 808/909 dans le moteur, un
   OS à l'écran. XP habille le contenant ; la nostalgie du contenu serait
   TR-808 / SP-404 / Pocket Operator. Seule charge que la mesure ne tranche pas.
4. **L'identité n'est déjà pas appliquée** — voir ci-dessous.

Trois charges **tombent** : « le chrome mange l'écran » (mesuré 3-10 %),
« c'est daté » (2026 : c'est de la différenciation face à huit concurrents
sombres identiques), « ça coûte trop cher » (à moitié : les reliefs tiennent en
3 tokens et `data-theme="noir"` existe déjà — ce qui coûte, ce sont les **225
couleurs en dur dans 18 `.svelte`**, dette indépendante de la direction choisie).

### Le vrai résultat : l'appli parle déjà trois langues

- **Atelier** — Luna beige + Bliss + fenêtres à barre de titre.
- **Mode jeu** — même grammaire XP, palette `noir` (`GameView.svelte:98`).
- **Mode Live** — bleu nuit, étiquettes monospace en capitales posées à même la
  surface, LED de couleur, faders ambre. **Aucune trace de Luna** — et c'est
  déjà, livré et en ligne, la direction « panneau sérigraphié » de la famille 2.

La question n'est donc pas « faut-il quitter XP ? » mais **« laquelle des trois
langues déjà présentes gagne ? »**.

## 🏁 DÉCISION — Winamp 2.x pour tous les modes (2026-08-18)

> « on va partir sur winamp 2.x pour tous les modes »

Planche des six écrans + plan d'implémentation :
<https://claude.ai/code/artifact/65d53f3f-00b0-4baa-8327-3eeed181b72e>
Maquettes : `maquettes/atelier/build_modes.py` -> `winamp-modes.html`.

**L'audit de design est clos.** `CLAUDE.md` a été réécrit : la règle qui posait
le design XP comme identité intouchable est remplacée par la règle Winamp 2.x.

### Le gain principal n'est pas esthétique

L'audit avait relevé dès le premier jour que l'appli parlait **trois langues
visuelles** — Atelier en Luna beige, Mode jeu en `data-theme="noir"`, Mode Live
avec ses propres tokens `--amp-*`. C'était le 4e reproche, et le seul non chiffré.

| | |
|---|---|
| Langues visuelles | **3 → 1** |
| Thèmes à maintenir | **−1** (`data-theme="noir"` n'a plus de raison d'être) |
| Tokens propres au Live | **−12** (`--amp-*` fusionnent) |

Les deux écrans les plus éloignés de l'Atelier étaient **déjà sombres**, chacun
dans son coin : une langue sombre unique ne leur demande aucun sacrifice, elle
leur retire une exception.

### Ce que la déclinaison sur les six écrans a appris

- **Accueil** : le fond Bliss disparaît, la fenêtre flotte sur du noir pur. C'est
  littéralement l'écran d'accueil de Winamp, rien à inventer.
- **Production** : c'est là que la langue gagne le plus contre Luna. Trois
  bandeaux indigo sombres s'empilent bien mieux que trois bandeaux bleu vif —
  **l'écran le plus chargé devient le plus calme des six**.
- **Mode jeu** : rejoint la langue commune sans rien perdre ; carte de
  progression et bandeau d'essais deviennent des afficheurs.
- **Mode Live (paysage)** : le vrai test. Pads biseautés, afficheurs verts,
  faders ambre — tout était déjà du vocabulaire Winamp. Le pad XY et sa bille
  verte n'ont pas eu besoin d'être retouchés.

### Plan d'implémentation, dans l'ordre

1. ✅ **La fonte — FAIT le 2026-08-18.** Voir ci-dessous.
   ~~chasse fixe auto-hébergée (fontsource)~~
2. ✅ **Les tokens — FAIT le 2026-08-18.** Voir ci-dessous.
3. ✅ **Les composants de base — FAIT le 2026-08-18.** Voir ci-dessous.
4. **Les 225 couleurs en dur** (18 `.svelte`) en tokens, fichier par fichier.
5. **Fusion des thèmes** : retirer `data-theme="noir"` et les `--amp-*` du Live.
   C'est ce qui transforme le choix esthétique en simplification réelle.
6. **Les cibles tactiles**, en dernier, une fois le dessin stabilisé.

### ✅ Étape 1 — fonte auto-hébergée (2026-08-18)

**Fichiers :** `src/styles/fonts.css` (nouveau), `src/styles/global.css`,
`src/ui/xp/tokens.css`, `package.json`.

**Découverte en ouvrant le chantier :** `--xp-mono: 'JetBrains Mono', monospace`
était déclaré dans `tokens.css` et utilisé à **11 endroits** (`DrumRowView`,
`SynthRowView`, `NotePad`, `GameView` ×2, `RhythmAnalyser` ×3, `SynthModule`,
`ToolBar`, `.beat-ruler`)… mais **la fonte n'a jamais été installée**. Elle
retombait silencieusement sur le monospace générique du navigateur depuis le
début du projet. L'étape 1 corrige donc un bug dormant en plus d'installer la
fonte.

**Choix : `@fontsource/jetbrains-mono`, sous-ensemble latin, graisses 400 et 700.**
JetBrains Mono était déjà le nom déclaré dans le projet ; c'est aussi la chasse
fixe la mieux dessinée pour les petites tailles (grande hauteur d'x, contreformes
ouvertes), ce dont la direction Winamp a besoin — elle lit à 8,5-9 px.

⚠️ **`@font-face` écrits à la main plutôt que d'importer la CSS de fontsource.**
Celle-ci référence aussi un `.woff` de repli, inutile pour les navigateurs visés
(Web Audio, Svelte 5) — et surtout **le build monofichier inline les binaires en
base64**, donc chaque octet inutile y compte double. Vite résout les chemins de
paquet dans `url()`, donc pas besoin de copier les binaires dans le dépôt.

**Coût mesuré** (c'est le poste que le plan annonçait comme le seul à alourdir
le fichier livré) :

| | avant | après | écart |
|---|---|---|---|
| `dist/` (assets) | 532 676 o | 575 566 o | **+42 890 o (+8,1 %)** |
| monofichier | 534 975 o | 592 756 o | **+57 781 o (+10,8 %)** |

Soit 522 Ko → 578 Ko pour le monofichier. Les deux woff2 pèsent 21,2 et 21,9 Ko.

**Vérifications faites :**
- le woff2 400 est bien téléchargé au chargement (200), et la face 700 se charge
  **à la demande** — normal, aucun texte mono en gras sur l'écran d'accueil ;
  vérifié explicitement via `document.fonts.load('700 12px …')` → `loaded`.
- `getComputedStyle` sur `.beat-ruler span` renvoie bien `"JetBrains Mono"` en tête.
- comparaison de pixels avant/après sur la règle de temps : **captures différentes**,
  donc le dessin des glyphes a réellement changé.
- ⚠️ *Piège de mesure* : comparer la largeur d'un `.beat-ruler span` ne prouve rien,
  c'est une cellule de grille dont la largeur est imposée par la grille. Et comparer
  la chasse ne prouve pas grand-chose non plus — JetBrains Mono et DejaVu Sans Mono
  ont toutes deux une approche de ~0,6 em, donc 0,36 px d'écart sur 15 caractères.
  **La seule preuve solide est la comparaison de pixels.**

**Pile de repli conservée** : `'JetBrains Mono', ui-monospace, SFMono-Regular,
Menlo, Consolas, 'DejaVu Sans Mono', monospace` — si la fonte tarde ou échoue, on
retombe sur une chasse fixe correcte et pas sur le monospace par défaut.

`font-display: swap` : la fonte est légère et auto-hébergée, le clignotement est
bref, et `optional` risquerait de ne jamais l'afficher — or toute l'identité
repose dessus.

**Non fait à cette étape, volontairement** : `--xp-font` (le corps de texte)
reste en Tahoma. Le basculement général appartient à l'étape 2, pour que chaque
étape reste vérifiable seule.

### ✅ Étapes 2 et 3 — tokens et composants (2026-08-18)

**Étape 2 — `src/ui/xp/tokens.css` réécrit.** Les valeurs changent, les noms
restent : toute l'appli bascule d'un seul commit sans qu'un composant soit
touché.

Trois vérifications ont guidé l'écriture, et chacune a évité une casse :

- `--xp-white` et `--xp-shadow` ne servent **que** dans les deux formules de
  biseau (2 usages chacun, tous les deux dans le fichier). Leurs noms sont
  hérités de XP, leur rôle réel est « la lumière » et « l'ombre » du relief.
  **`--xp-white` n'est donc plus du blanc**, et c'est voulu.
- **`--xp-face` doit rester une couleur UNIE** : elle termine trois dégradés de
  module (`linear-gradient(…, var(--xp-accent-X-soft), var(--xp-face) 60px)`) et
  un dégradé ne s'imbrique pas. Le dégradé vertical des panneaux appartient donc
  au composant, pas au token.
- `--xp-select-blue` est toujours accompagné d'un `color: #fff` côté composant
  (3 usages vérifiés) : n'importe quel fond sombre convient.

Les variantes `-soft` des accents de module deviennent des teintes **sombres** :
elles servent de haut de dégradé aux corps de fenêtre ; en pastel elles se
seraient allumées sur un chrome sombre.

`[data-theme='noir']` est **vidé de ses valeurs** plutôt que supprimé, pour que
l'attribut encore posé par `GameView` retombe sur `:root`. Le retrait de
l'attribut appartient à l'étape 5.

**Étape 3 — les composants, et le constat C6 enfin fermé.**

⚠️ **`.xp-btn` était recopié dans SEPT fichiers**, à l'identique à la taille
près : même bordure `#003c74`, même dégradé clair, même biseau. C'était le
constat **C6** de l'audit de design, et c'est ce qui a fait que l'étape 2 a
laissé sept séries de boutons clairs sur un chrome sombre. Une **définition
unique** vit désormais dans `styles/global.css` ; les composants ne gardent que
leurs surcharges de *taille* (padding, min-height, font-size).

Deux autres classes portaient le même relief sans partager de classe
(`.tool` dans ToolBar, `.restore button` dans AtelierView) : d'où un token
**`--xp-btn-face`**, une seule source de vérité pour la face de bouton.

`XpWindow` : bordure `#0831d9` → `--xp-line`, corps en dégradé vertical Winamp,
boutons de fenêtre débarrassés de leur liseré blanc et de leur bleu Luna, écran
d'extinction passé au noir verdâtre de l'afficheur. **Plus une seule couleur
Luna en dur dans le fichier.**

**Deux bugs réels trouvés par la vérification, pas à l'œil :**

1. **`XpTabs` — régression de contraste.** `.tab` avait
   `linear-gradient(180deg, #fff, var(--xp-face-dark))` : un dégradé blanc →
   presque noir, avec du texte gris dessus. Les onglets inactifs étaient
   illisibles après l'étape 2.
2. **`--xp-muted` était calibré pour le fond clair de Luna.** À `#75758a` il
   tombait à **2,49:1** sur la face de bouton sombre. Remonté à `#a5a5b8` :
   **4,63:1** sur le bouton, **5,08:1** sur `--xp-face`, tout en restant
   nettement en retrait de `--xp-text`.

**Une correction de grammaire :** le liseré de module utilisait le vert LCD
`#2ee23c`, alors que **ce vert doit rester réservé à l'ÉTAT** — c'est exactement
le reproche fait à la direction « Néon ». Les trois accents de module sont du
*chrome* : ils sont désaturés (`#d9931c`, `#8a7cc0`, `#3f9c96`) pour rester plus
calmes que les couleurs de contenu.

**Mesure de contraste : 13 éléments sous 3:1 après l'étape 2 → 1 après
l'étape 3** (un bouton d'emoji, faux positif : la couleur du texte ne s'applique
pas à un emoji).

⚠️ **Angle mort de la sonde de contraste, à connaître** : elle lit
`backgroundColor`, qui est **transparent quand le fond est un dégradé** — elle
remonte alors au parent et sur-signale. Les `.xp-btn` étaient des faux positifs.
Pour les cas réels, calculer le ratio sur les valeurs de tokens plutôt que sur
le DOM.

⚠️ **`npm run check` ne suffit pas.** Un commentaire CSS mal refermé dans
`tokens.css` passait `svelte-check` sans un mot et cassait `npm run build`
(postcss). **Toujours lancer les deux builds**, comme le dit la convention.

**Reste visible après l'étape 3, et c'est le périmètre de l'étape 4** : les
cases vides sont encore des dégradés pâles (`#fff` → teinte claire) dans
`DrumRowView`/`SynthRowView` — or « un pas éteint est un trou » est le cœur de
la direction ; et les champs numériques et menus déroulants natifs restent
blancs (10 `background: #fff` codés en dur).

### ✅ Étapes 4 et 5 — les couleurs en dur, puis la fusion des trois langues (2026-08-18)

**Étape 4** — 182 → 113 couleurs codées en dur. Deux prises qui comptent :

- `DrumRowView` : les cases vides ne sont plus des dégradés pâles mais du verre
  (`--xp-lcd-bg`) teinté à 20 % de la couleur de la ligne via
  `color-mix()`. C'est là que le **biseau s'inverse** : `.cell` est creusé
  (`--xp-bevel-in`), `.cell.state-1/2` est bombé (`--xp-bevel-out`). L'ancienne
  lecture XP (« actif = bouton enfoncé ») est retournée : **un pas actif émet,
  donc il est en relief**. C'est le reproche n°1 de l'audit, et le cœur de la
  direction.
- `TransportRings` et `StepCircle` sont des canvas : ils ne peuvent pas lire une
  variable CSS. Ils recopiaient donc les couleurs de lignes en constantes JS —
  restées en Luna après l'étape 2. Ils les lisent maintenant au montage
  (`getComputedStyle(el).getPropertyValue('--cell-' + name)`), les constantes ne
  servant plus que de repli.

**Étape 5** — les 11 déclarations `--amp-*` du Mode Live deviennent des **alias**
sur les tokens partagés (`--amp-lcd-fg: var(--xp-lcd)`, `--amp-amber:
var(--xp-playhead)`…). Choix délibéré : les 82 points d'appel ne bougent pas.
La palette fusionne, le risque de régression est nul. `GameView` perd son
attribut `data-theme="noir"`. **L'appli ne parle plus qu'une langue visuelle** —
c'était l'argument principal de la décision, et il n'était pas esthétique.

### ✅ Étape 6 — le tactile, 44px de zone et 0px de dessin (2026-08-18)

> ⚠️ C'était **le** chantier ouvert de la direction, celui que `CLAUDE.md`
> énonce littéralement : « toute zone touchable doit monter à 44px **sans que
> le dessin grandisse** ».

**Le mécanisme.** Un pseudo-élément transparent, centré sur le bouton
(`styles/global.css`, classes `.tap44`, `.tap44-y`, `.tap44-d`) :

```css
.tap44::after { position: absolute; top: 50%; left: 50%; translate: -50% -50%;
                height: max(100%, 44px); width: max(100%, 44px); }
```

Le test de collision d'un pseudo-élément **renvoie son élément d'origine** : le
doigt qui tombe dans la marge invisible clique bien le bouton, alors que le
bouton n'a pas bougé d'un pixel. Un `padding` aurait poussé le dessin, un
`transform: scale` l'aurait déformé. Le tout sous `@media (pointer: coarse)`
uniquement — à la souris, la densité de l'écran est un acquis de la direction,
pas un défaut à corriger.

**Deux variantes, parce que les deux axes ne se valent pas :**

| classe | ce qu'elle fait | pour quoi |
|---|---|---|
| `.tap44` | les deux axes | boutons isolés (transport, outils, pastilles) |
| `.tap44-y` | la hauteur seule | ce qui vit dans une grille dont la largeur est dictée par le nombre de pas |

> Une troisième variante `.tap44-d` (l'enveloppe descend au lieu de s'étaler) a
> existé le temps de l'étape 6 : elle servait uniquement aux trois boutons de
> fenêtre, coincés sous un bord qui les recadrait. Elle est partie avec eux à
> l'étape 7.

**Le piège qui a coûté trois itérations.** Les enveloppes invisibles débordent,
donc elles **se marchent dessus** dès que deux commandes sont voisines à 2px — et
en cas de recouvrement c'est la **dernière du DOM** qui gagne le point, pas la
plus probable. Le pseudo-élément seul faisait donc passer `.cell` de 34 à 40px,
pas à 44 : la pastille « Séquence » juste en dessous lui volait le bas. La
seconde moitié de l'étape est donc un **écartement du rythme vertical** sous
pointeur grossier (`.row-head`, `.drum-row`, `.group-bar`, `.menubar`,
`.transport`, `.btns`, `.chk-row`, `.buttons`, `.body`…). L'espace n'est pas du
dessin, et sur un téléphone il ne coûte rien puisque la page défile.

**Second piège, plus bête :** un bloc `@media (pointer: coarse)` posé au milieu
d'un `<style>` Svelte est **écrasé par les règles de même spécificité écrites
plus bas** dans le même fichier. Trois réglages n'ont rien fait tant que les
blocs n'ont pas été déplacés en **fin** de `<style>`. Ils y sont tous.

**Éléments remplacés.** `<select>` et `<input type="text">` ne rendent aucun
`::after` dans Chromium : l'astuce ne marche pas. Écart assumé, le seul de la
passe — c'est la boîte elle-même qui passe à `min-height: 44px`. Elle n'a ni
biseau ni petites capitales à préserver, la grammaire de la skin ne se joue pas
là. Même logique pour `.production-hint`, dont l'`overflow: hidden` (l'ellipse
d'une seule ligne) recadre le pseudo-élément : remplissage vertical compensé par
une marge négative.

**Mesure — la seule qui compte.** `getBoundingClientRect()` **ne voit pas** le
pseudo-élément : il fallait sonder la zone réellement touchée avec
`elementFromPoint` autour de chaque contrôle. Deux pièges dans le script de
mesure lui-même : un élément sous la ligne de flottaison renvoie `null` (d'où le
`scrollIntoView` avant chaque sonde), et une case à cocher est un élément
remplacé dont le doigt vise en réalité le `<label>`.

| écran (390×844, `hasTouch`) | avant | après |
|---|---|---|
| Atelier · Rythme | 93 | **15** |
| Atelier · Synthé | — | **8** |
| Atelier · Production | — | **5** |
| Mode jeu | 4 | **0** |
| Mode Live (paysage 844×390) | 33 | **28** |

**Ce qui reste, et pourquoi ça reste** — trois exceptions revendiquées, aucune
subie :

1. **La largeur des cases (8 × 41px).** 16 pas × 44px = 704px sur un écran de
   390. La contrainte est *physiquement* insoluble en largeur. La hauteur, elle,
   est à nous : elle est prise, les cases font 45px de zone pour 34px de dessin.
2. **Les libellés d'aide (20 × 30px de haut).** `.lab.has-hint` n'est pas une
   commande : il annote le curseur d'à côté et son appui n'ouvre qu'une bulle.
   Lui donner 44px, ce serait les prendre à la piste qu'il annote — un doigt qui
   vise le réglage tomberait sur l'explication. Bande doublée (13 → 30px), on
   s'arrête là.
3. **Le Mode Live (21 `.corner-icon` + 7 commandes de 22px).** Les icônes de coin
   sont **posées sur** les pads : les agrandir revient à voler la surface du pad,
   c'est-à-dire de l'instrument. Et en paysage la largeur est le seul luxe — elle
   a été prise (`.topbar`, `.seq-bar`), la hauteur des barres de 22px est ce qui
   reste après les pads. C'est le seul écran où le chantier n'est pas clos.

**Fichiers touchés :** `styles/global.css` (l'utilitaire + `.xp-btn` + `select` /
`input`), `App.svelte`, `ui/xp/{XpWindow,XpTabs,XpSlider}.svelte`,
`ui/sequencer/{DrumRowView,SynthRowView,NotePad}.svelte`,
`ui/atelier/{ToolBar,AtelierView,ExportBar,SynthModule}.svelte`,
`ui/live/LiveView.svelte`, `ui/game/GameView.svelte`.

**Vérifié :** `npm run check` 0 erreur · 33 tests · les deux builds · captures
Playwright à 1280 (souris — densité **inchangée**) et 390 (doigt).

### ✅ Étape 7 — la barre de titre perd son chrome XP (2026-08-18)

> « cette barre n'est plus utile, on n'a plus besoin de faire référence à XP
> ici comme ça »

Le triplet `_ □ ×` est **la** citation Windows de l'appli : minimiser, agrandir,
fermer. Il part, avec ce qui pendait au bout — le gag « Extinction en cours… »
derrière la croix, et les deux appels à `playSystemSound` sur le repli/dépliage.
Le bandeau indigo garde son icône et son titre : c'est la seule zone colorée du
chrome dans le moodboard, elle n'est pas en cause.

**Ce que ça emporte, et c'est voulu :** le repli des fenêtres disparaît (`_` le
faisait réellement, ce n'était pas qu'un décor) — état `collapsed`, état
`shutdown`, et les trois fonctions qui allaient avec. `XpWindow` passe de 8 à 0
ligne de logique : c'est un conteneur, plus un composant.

**Deux orphelins débusqués et retirés dans la foulée :** le token
`--xp-close-grad` (le rouge de la croix, plus aucun consommateur) et la variante
tactile `.tap44-d`, créée à l'étape 6 pour ces seuls trois boutons.
`ui/xp/systemSounds.ts` **reste** — `AtelierView` et `ToolBar` s'en servent
encore (son d'erreur, réglage) ; son sort est une décision à part, toujours dans
les chantiers ouverts.

**Effet de bord agréable :** les 90px libérés rendent le titre entier — l'écran
Rythme affichait « Séquenceur — Kick / Snare / Hat / … », il affiche maintenant
« Séquenceur — Kick / Snare / Hat / Clap / Shaker ».

**Vérifié :** `check` 0 erreur (aucun sélecteur CSS orphelin signalé) · 33 tests ·
les deux builds · cibles tactiles inchangées (Rythme 15, Mode jeu 0) · capture.

### ✅ Étape 8 — la typographie, l'autre moitié de la grammaire (2026-08-18)

> Née d'une question de Yann : « j'espère que ça colle exactement au moodboard ».
> Vérification faite plutôt qu'espérée — et non, ça ne collait pas.

**Le constat.** La palette était juste : 12 des 13 valeurs du moodboard reprises
telles quelles (seule dérive assumée, `--xp-muted`, remonté pour le contraste).
La typographie, elle, n'avait pas bougé :

| | maquette | avant l'étape 8 |
|---|---|---|
| menu | 700 **9px** CAPS, ls .1em | 12px 400, bas de casse |
| onglet | 700 **9px** CAPS, ls .12em | 11px 700, bas de casse |
| bouton | 700 **9px** CAPS, ls .12em | 13px 700, bas de casse |
| barre de titre | 700 **8,5px** CAPS, ls .22em | 14px 700, bas de casse |
| pastille | 700 **8,5px**, ls .14em | 11px 700 |

**Et surtout, la famille.** `--xp-font` valait encore
`Tahoma, 'Noto Sans', Verdana…` — l'étape 1 avait auto-hébergé JetBrains Mono
mais ne l'avait câblée que sur `--xp-mono`, c'est-à-dire sur les douze
afficheurs LCD. **L'interface entière était restée en Tahoma, donc en XP.** La
chasse fixe est la moitié de la grammaire, l'autre étant le biseau ; on n'en
avait posé qu'une. `--xp-font` devient un alias sur `--xp-mono` — le nom du
token est conservé, une dizaine de composants le lisent.

**Ce que ça change en pratique.** Onze tokens d'échelle (`--xp-size-menu`,
`--xp-ls-menu`, … `--xp-size-body`, `--xp-size-small`) posés dans `tokens.css`,
appliqués aux six familles de chrome : menu, onglets, boutons, barre de titre,
pastilles, noms de ligne — plus le sélecteur de mode du Mode jeu, qui remplit la
même fonction que les onglets. Taille et interlettrage séparés plutôt qu'un
raccourci `font` : celui-ci réinitialise `line-height`, dont plusieurs boutons
dépendent.

Les **68 déclarations `font-size` restantes** (texte courant, sous-titres,
aides, verdicts de l'analyseur) sont passées par le rapport de 1,3 que le
moodboard nomme lui-même — 14→11, 13→10, 12→9,5, 11→9, 10→8,5. La hiérarchie
relative est conservée : un titre reste plus gros qu'un sous-titre, tout descend
du même facteur. Le splash garde son gros titre, c'est un moment délibéré.

**Un ajout hors périmètre, assumé :** `color-scheme: dark` sur `body`. Les cases
à cocher, les listes déroulantes et les ascenseurs sont dessinés par le
navigateur, pas par nous — sans ce mot, il les peignait en clair, et les seules
zones claires de l'écran devenaient des widgets natifs au milieu du verre noir.
Un mot pour aligner tout ce qu'on ne dessine pas.

**Piège évité de justesse :** quatre `.xp-btn.tiny` étaient figés à 11px. Le
bouton de base passant à 9px, « tiny » serait devenu **plus gros** que la base.
Même chose pour l'`.xp-btn` à 13px d'`ExportBar` et celui à 10px d'`AtelierView`
(Lecture/Break). Tous ramenés sur les tokens ; ce qui distingue Lecture et Break,
c'est leur remplissage et leur hauteur minimale, pas un corps plus gros.

**Vérifié** — et c'était le vrai risque, une chasse fixe étant plus large par
caractère :

- **débordement horizontal : 0px** sur les trois onglets, à 390 comme à 1280.
  Seul texte tronqué : `.production-hint`, dont c'est le comportement voulu
  (une ligne, déplié au tap).
- **contraste** : plus aucun texte ne bénéficie de l'exemption « grand texte »
  à cette échelle, le seuil passe donc à 4,5:1 partout. Un seul cas sous le
  seuil, et c'est le faux positif connu (l'émoji 🔊 du bouton muet, dont la
  couleur calculée ne s'applique pas au glyphe).
- **cibles tactiles inchangées** : Rythme 15, Synthé 8, Production 5, Mode jeu 0,
  Live 28. Le remplissage des boutons est monté de 5 à 9px pour compenser le
  corps plus petit — la cible ne rétrécit pas avec le mot.
- `check` 0 erreur · 33 tests · les deux builds · captures des six écrans.

**Ce qui reste hors de cette étape, et qui est la vraie suite :** la *structure*
de la maquette. Le grand afficheur BPM vert du transport, le bandeau LCD d'état
en bas de fenêtre (`KICK · TON 42 · DÉCLIN 220 · REV 12 %`), et les LED rondes
devant chaque nom de ligne (l'appli a un bouton 🔊 à la place). Ça touche le
balisage, pas seulement le CSS — c'est une étape à part entière.

### ✅ Étape 9 — la structure de la maquette (2026-08-19)

Ce qui restait après l'étape 8 : trois éléments que la maquette de référence
montre et que l'appli n'avait pas. Ça touche le balisage, pas seulement le CSS —
d'où une étape à part.

**1. L'afficheur BPM du transport.** 22px, vert LCD, l'unité en retrait et
alignée sur la ligne de base. C'est la seule grande typographie de l'Atelier, et
c'est voulu : un ampli a un cadran, et c'est le nombre qu'on lit de loin. C'est
un **afficheur, pas un réglage** — la glissière sous le séquenceur reste la
commande, il n'y a donc rien à désambiguïser entre les deux.

**2. La diode devant le nom de ligne, et c'est elle l'interrupteur.** L'émoji 🔊
tenait ce rôle : il disait l'action, pas l'état, et c'était le dernier glyphe de
couleur du chrome. La diode fait 7px, elle est teintée de la ligne et elle
**rayonne** (`box-shadow: 0 0 5px`) — c'est le halo qui la fait lire comme
allumée plutôt que comme une pastille peinte, et c'est lui qu'on retire pour
l'éteindre. Trois états, là où le bouton n'en montrait que deux :

| état | dessin | ce que ça dit |
|---|---|---|
| allumée | couleur de la ligne + halo | la ligne sonne |
| éteinte | gris ardoise `--xp-led-off`, sans halo | la ligne est coupée |
| creuse | contour seul | la ligne est vide |

Le moodboard le disait déjà : « la diode s'éteint et passe au gris ardoise, le
nom garde sa couleur — c'est la piste, pas son état ». Le bouton reste un
poussoir biseauté : une diode nue qui commande quelque chose serait une
affordance invisible, et le biseau est justement ce qui dit « ceci s'appuie ».
Le libellé d'état part dans un `.sr` visuellement masqué : la diode ne dit rien
à qui ne la voit pas.

**3. Le bandeau LCD en bas de la fenêtre du séquenceur** (`StatusLcd.svelte`).
Verre noir, vert LCD, 9px avec 0,06em d'interlettrage — c'est ce dernier qui
l'empêche de se lire comme du texte courant : un cadran, pas une phrase. Il
affiche la ligne qu'on vient de manipuler et ses réglages à gauche, la réverbe
en retrait à droite, exactement la forme de la maquette
(« KICK · TON 42 · DÉCLIN 220 » / « RÉV 12 % »).

**Ce que ça a demandé :** un `$state` de plus, `ui/atelier/lastTouched.svelte.ts`
— la dernière ligne touchée, et rien d'autre. Volontairement **hors du modèle
v2** : ce n'est pas de l'état de morceau, ça ne se sérialise pas, ça ne passe
pas dans l'historique d'annulation et le moteur audio ne doit jamais le lire.
Même esprit que `ui/xp/paramHints.svelte.ts`. Il est marqué là où
l'utilisateur agit vraiment sur la ligne — dans `cycleCell` et sur la diode,
pas sur le `pointerdown` : un appui long qui ne modifie rien n'a pas « touché »
la ligne. Tant qu'on n'a touché à rien, l'afficheur n'invente pas de ligne
courante : il annonce le morceau (`120 BPM · 3 LIGNES EN JEU`).

**Vérifié :**

- **comportement** : scénario Playwright — au départ le résumé global, après un
  clic sur une case `SNARE · TON 0 · DÉCLIN 0 · PAS 4 / RÉV 0 %`, après une
  coupure `KICK · …`, et les cinq diodes rendent bien `coupée / allumée /
  allumée / vide / vide`.
- **contraste : plus aucun cas sous le seuil.** Le seul faux positif qui
  traînait depuis l'étape 6 (l'émoji 🔊, dont la couleur calculée ne s'applique
  pas au glyphe) a disparu avec l'émoji lui-même.
- **cibles tactiles inchangées** — après un correctif : sans l'émoji qui la
  remplissait, la boîte du bouton de coupure du Synthé s'était rétrécie sur les
  7px de la diode, et la cible avec elle (34px). `min-width: 32px`, comme les
  lignes de batterie.
- débordement horizontal 0px à 390 et 1280 · `check` 0 erreur · 33 tests · les
  deux builds · captures des six écrans.

**Piège du détecteur de troncature :** il signalait les `.sr` comme « tronqués ».
Un texte réservé aux lecteurs d'écran EST recadré exprès — c'est la technique,
pas un défaut. Le détecteur ignore désormais ce qui porte un `clip-path`.

### ✅ Étape 10 — la barre de menus (2026-08-19)

> « pas fan de cette barre : manque de cohérence / indication "accès total" un
> peu superflue / prend trop de place, ça doit tenir en 1 ligne »

**Trois langues dans une barre de sept éléments.** Les menus étaient du texte
plat, le marqueur d'accès un cadre pointillé, et Annuler/Rétablir des poussoirs
biseautés avec leur dégradé. Une barre de menus n'a qu'un seul registre : du
libellé posé sur la face du chrome, qui s'allume au survol. ↶ et ↷ le
rejoignent — même famille, même corps de 9px, même surlignage bleu. **Le biseau
reste réservé à ce qui est vraiment un bouton ailleurs sur l'écran** ; dans une
barre de menus, il faisait du bruit.

**« Accès total » déménage dans le menu Aide.** Le raisonnement qui le mettait
dans l'Atelier plutôt que sur l'accueil tient toujours — c'est ici qu'on se
demande si ce qu'on voit est bien ce que voient les autres — mais il occupait
une **rangée entière de chrome permanent** pour une information qu'on consulte
une fois. Un menu est le bon domicile de ce qu'on va *chercher*.

**Une ligne, garantie par `nowrap`.** La barre passait à deux rangées dès que la
place manquait. Elle ne se replie plus ; c'est le remplissage horizontal qui
absorbe l'étroitesse, en deux crans : 5px de part et d'autre des libellés sous
460px, 3px sous 360px. Mesuré à six largeurs :

| | avant | après |
|---|---|---|
| hauteur de la barre | 64px (deux rangées) | **36px, à toutes les largeurs** |
| débordement de page | — | **0px de 320 à 1280** |

Le « débordement de barre » résiduel de 5px que rapporte la sonde est
l'enveloppe tactile invisible du dernier bouton, pas du dessin : aucun élément
ne dépasse le bord (vérifié élément par élément).

**Défaut débusqué en chemin :** la liste du menu Aide, ancrée à gauche de son
libellé avec 190px de large, partait **au-delà du bord de l'écran** sur
téléphone et se faisait couper. Le défaut préexistait ; il est devenu visible en
ajoutant une entrée à ce menu-là. Le dernier menu s'ancre désormais à droite.

**Le prix, dit clairement.** Deux cibles tactiles passent sous 44px, **en
largeur seulement** : un `.menu-btn` à 40×45 et un `.tool` à 38×44, sous 460px.
C'est le coût direct de la ligne unique — les libellés sont côte à côte sans
blanc, donc leurs enveloppes se recouvrent et c'est la dernière du DOM qui
gagne le point. Arbitrage assumé : entre deux libellés de menu, une frappe qui
dérape ouvre le mauvais menu, on le referme et il ne s'est rien passé. C'est
pour ça que le seul écart qui subsiste dans la barre est **entre Annuler et
Rétablir** (8px) : ce sont les deux seules commandes dont l'erreur coûte
quelque chose.

**Vérifié :** `check` 0 erreur · 33 tests · les deux builds · contraste **aucun
cas** sous le seuil · débordement de page 0px sur les trois onglets à 390 et
1280 · captures de la barre à 390 et 1280, et du menu Aide ouvert.

### ✅ Étape 11 — l'analyseur de spectre (2026-08-19)

> « il faut en effet l'analyseur de spectre winamp / mode atelier : à droite de
> "break", on peut supprimer la vision circulaire / dans le mode live, s'il y a
> une place toute indiquée, allons y »

**Un vrai analyseur, pas une animation.** `graph.ts` gagne un `AnalyserNode`
maître branché en tap sur `finalGain` — donc sur **ce qu'on entend**, après le
limiteur, l'écrêteur doux et le volume général. C'est ce qui le distingue des
`lineAnalyser` existants : ceux-là mesurent un niveau par ligne (fftSize 32, un
chiffre par frame), celui-ci rend un spectre du mix. Tap seulement, jamais
connecté en aval : aucun effet sur le son, ni en direct ni au rendu hors ligne.

`AudioEngine` expose `getSpectrum(out)` — il **remplit** un tableau fourni par
l'appelant au lieu d'en renvoyer un : le visualiseur tourne à 60 Hz, allouer
256 octets par frame ferait travailler le ramasse-miettes pour rien.

**Les anneaux de transport disparaissent** (`TransportRings.svelte` supprimé).
Ils redisaient la position de lecture, que la tête de lecture montre déjà sur
chaque grille, ligne par ligne et au pas près. L'analyseur, lui, montre ce
qu'aucun autre élément de l'écran ne montre : le son qui sort.

**Le Mode Live y gagne aussi**, et c'est là que le remplacement est le plus
net. Son mode « BARRES » répartissait les six niveaux de ligne sur 22 barres
via une cloche centrée sur la position *supposée* de chaque élément dans le
spectre. Joli relief, mais construit sur un **classement arbitraire** : un kick
filtré en aigu s'y affichait toujours dans les graves. C'est maintenant une
mesure.

**Trois réglages qui font la différence entre « ça marche » et « ça ressemble à
Winamp »**, tous trouvés à l'œil sur captures successives :

1. **Répartition géométrique des bandes**, plafonnée à 30 % des bins (≈7 kHz).
   La première version montait à 78 % : la moitié droite de l'afficheur restait
   vide en permanence, et un afficheur à moitié vide se lit comme cassé.
2. **Pente croissante vers l'aigu** (×1 à ×2,5). Un spectre musical décroît
   d'environ 3 dB par octave ; sans compensation le hat s'entend mais ne se voit
   pas. Correction d'affichage assumée — un analyseur d'ampli n'a jamais été un
   instrument de mesure.
3. **Fenêtre de décibels resserrée** (-72 à -18 au lieu de -84 à -12) : c'est la
   plage utile d'un mix, pas la plage théorique du format.

Plus le **capuchon** qui monte d'un coup et retombe en ~0,75 s. C'est ce
détail-là qui fait « analyseur » plutôt que « barres animées » : sans lui on ne
voit que le présent, avec lui on voit le maximum récent.

Le dégradé est peint sur la **colonne** et non sur la barre — vert en bas, ambre
au milieu, rouge en haut. Une barre haute traverse donc les trois zones, et
c'est ce qui fait qu'on lit un niveau et pas une teinte.

**Facteur commun extrait** (`ui/xp/spectrumBands.ts`) : la lecture d'une barre
sert à deux dessins différents — le composant de l'Atelier et le canvas du Live.
Le projet s'est déjà fait avoir par un `.xp-btn` recopié dans six fichiers
(constat C6), on ne recommence pas avec la répartition des bandes.

**Vérifié :** l'analyseur **bouge vraiment** — scénario Playwright qui compare
la signature du canvas à l'arrêt puis en lecture, puis deux frames consécutives
en lecture (une capture unique ne distingue pas un visualiseur figé d'un
visualiseur vivant). `check` 0 erreur · 33 tests, **instantané du scheduler
compris** : aucun tirage aléatoire n'a été ajouté, les exports restent
reproductibles · les deux builds · captures Atelier et Live en lecture.

### ✅ Étape 12 — la barre de transport, répartition et dimensionnement (2026-08-19)

> « répartition/dimensionnement des espaces à revoir »

Mesuré avant de toucher quoi que ce soit, et le diagnostic était pire que ce
que la capture laissait voir. **Deux défauts, une seule cause** — un
`.spacer { flex: 1 }` qui poussait tout à droite pendant que `.transport`
était en `flex-wrap: wrap` :

| largeur | avant | après |
|---|---|---|
| 360-430px | barre **78px**, Lecture et Break **empilés** | 32px, sur une ligne |
| 768px | 301px de vide au milieu | 90px, en une seule coupure |
| 1280px | **492px** de vide au milieu | 302px, en une seule coupure |

**1. Lecture et Break ne se séparent plus jamais** (`flex-wrap: nowrap`). Sous
500px ils passaient l'un sous l'autre : la barre doublait de hauteur, sur les
écrans où la hauteur est justement comptée, et pour les deux boutons les plus
utilisés de l'application.

**2. L'analyseur absorbe la place libre** au lieu qu'un `.spacer` la laisse
vide : `flex: 1 1 0` à la place d'une largeur figée. Le vide disparaît par
construction — c'est aussi ce que fait la fenêtre de Winamp, le visualiseur
occupe ce qui reste.

**3. Le reste de l'espace se regroupe en UNE coupure**, via `margin-left: auto`
sur l'afficheur BPM. La barre se lit désormais en deux blocs — transport à
gauche, afficheur + analyseur à droite — au lieu de trois îlots séparés par des
trous de tailles arbitraires.

**Le nombre de barres suit la largeur, pas l'inverse.** Le composant reçoit une
largeur de barre visée (8px) et en déduit le nombre : à 1280 la boîte fait
380px, sur un téléphone une soixantaine. Un nombre fixe aurait donné des barres
de 26px d'un côté et de 2px de l'autre.

**Défaut débusqué en le faisant :** l'analyseur paraissait à moitié vide à
1280px. Ce n'était pas le contenu — c'était **104 barres pour 74 bandes utiles**,
donc trente barres qui répétaient la dernière valeur, silencieuse. D'où
`barresMax()` : le nombre de barres est plafonné par le nombre de bandes
réellement distinctes du spectre. Et `max-width: 380px`, parce que le spectre
d'une boîte à rythmes vit dans les graves — étalé sur 520px il restait clairsemé
en permanence, et 380 est de toute façon l'ordre de grandeur du visualiseur de
Winamp, qui était une petite fenêtre à côté de l'afficheur, pas un bandeau.

**Un renoncement assumé :** sous 400px, ce qui reste après Lecture/Break et
l'afficheur fait une quarantaine de pixels. À cette largeur un analyseur ne dit
plus rien, il ressemble à un rectangle noir oublié — il s'efface, et l'afficheur
BPM se cale à droite.

**Vérifié :** `check` 0 erreur · 33 tests · les deux builds · contraste aucun cas
sous le seuil · débordement de page 0px sur les trois onglets à 390 et 1280 ·
cibles tactiles inchangées · captures à 390, 430 et 1280 en lecture.

### ✅ Étape 13 — Mode Live : 28 cibles tactiles, il n'en reste aucune (2026-08-19)

**Deux mouvements, et le premier corrige une conclusion trop rapide de l'étape 6.**

Les **21 icônes de coin** (verrou, 🎲, assignation) faisaient 22px, posées SUR
les pads. Mesuré : 3 × 44 = 132px pour un bouton large de 128 — elles ne
pouvaient pas atteindre la cible sans manger la surface qu'on frappe en jouant.
Mais l'overlay ⚙ **portait déjà les trois, en pleine taille** : c'était un
doublon, pas un raccourci indispensable. Elles partent, une seule surface de
réglage reste (règle A6), et le pad redevient entièrement jouable. Verrouiller
ou rebrasser un bouton est un geste de préparation, pas un geste de scène.

⚠️ Le verrou et le 🎲 **du pad XY**, eux, n'existaient nulle part ailleurs : ils
descendent dans l'overlay AVANT la suppression, sinon on perdait deux fonctions.

**Second mouvement.** L'étape 6 avait conclu que la hauteur ne se prenait nulle
part parce que « les pads SONT l'instrument ». C'était faux, et c'est la mesure
qui le dit : les deux barres coûtent 44px sur 390, les pads passent de 94 à
**81px** de haut — presque le double de la cible minimale. **PLAY, lui, était à
34px.** Le bouton le plus important de l'écran ne peut pas être celui qu'on rate.

| | avant | après |
|---|---|---|
| Mode Live | 28 cibles sous 44×44 | **0** |
| hauteur d'un pad | 94px | 81px |

Le Mode jeu était déjà à 0 ; l'Atelier n'a plus que ses deux exceptions
revendiquées (largeur des cases, libellés d'aide). **L'application entière est
tactile.**

### ✅ Étape 14 — R1(b) : la mélodie devient un motif (2026-08-19)

> Le vrai correctif musical, ouvert depuis l'audit et repoussé parce qu'il
> change les notes des 34 presets.

**Le diagnostic tenait en une mesure, faite avant d'écrire une ligne :** sur les
34 presets, **aucune** mesure de mélodie n'était identique à une autre — 0 sur
94, silences exclus. Chaque pas était un tirage indépendant. Une mélodie se
reconnaît parce qu'elle revient ; celle-ci ne revenait jamais.

On tire donc **un motif d'une mesure et on le répète**. Le piège qui distingue
une vraie répétition d'un copier-coller : la nappe change d'accord d'une mesure
à l'autre, des degrés recopiés sonneraient faux dès le deuxième accord. Le motif
mémorise donc des **rôles** (« la n-ième note de l'accord en cours ») et non des
degrés ; un rôle se résout contre l'accord en vigueur à l'endroit où il tombe.
Le motif garde sa forme et suit l'harmonie — ce que fait n'importe quel thème
transposé. La dernière mesure varie : une phrase qui se répète à l'identique
jusqu'au bout est une boucle.

**Deux défauts trouvés en mesurant, pas en relisant :**

1. **Un motif court sort vide bien plus souvent qu'une ligne entière** — une
   fois sur trois à 2 pas — et le filet ne posait alors qu'UNE note pour tout le
   morceau. `boombap` et `trapmodern` étaient exactement dans ce cas, constaté
   sur la sortie du générateur. La tête du motif porte donc toujours une note :
   le cas disparaît par construction, et la phrase se pose sur le temps fort.
2. **Avec cette note garantie, le facteur 0.6 hérité du tirage pas à pas
   remontait la mélodie à 1,40 note/mesure**, au-dessus de la basse (1,15) —
   très exactement le défaut que 0.6 avait corrigé en août. Re-balayé sur les
   34 presets :
   `0.35 → 1,14 (pire 3,0)` · `0.40 → 1,22 (pire 3,5)` · `0.60 → 1,40 (pire 5,0)`.

| | avant | après |
|---|---|---|
| périodicité de la mélodie | **0 %** | **100 %** |
| densité | 1,13 note/mesure | 1,08 (sous la basse, 1,15) |
| pire cas | 4,5 | 4,0 |

Trois tests permanents (`tests/melody-motif.test.ts`) verrouillent la
périodicité, le fait que la mélodie reste sous la basse, et le filet
anti-ligne-vide.

**Portée assumée, dite explicitement :** les mélodies des 34 presets changent,
et **les rafales des trois lignes de synthé avec elles** — `applyRandomRolls`
poursuit le même générateur après le remplissage. La basse et la nappe gardent
leurs notes (elles sont tirées avant la mélodie). Les morceaux **sauvegardés ne
bougent pas** : la sérialisation stocke les notes, pas la graine.

### ✅ Étape 15 — le menu de voix synthé (2026-08-19)

Deux défauts, **et le second était plus grave que celui qui était noté au plan**.

1. Le menu n'avait aucune liaison de valeur : il retombait toujours sur
   « — Voix… » et n'a jamais dit quelle voix était en place. Il affiche
   maintenant le preset en place, ou « — Voix modifiée » quand les curseurs ont
   écarté la voix de tout preset. Ce troisième cas est celui qui manquait : sans
   lui, afficher encore « Rhodes chaud » après un tour de curseur aurait été un
   mensonge de plus, dans l'autre sens.
2. **Le patch d'un preset était fusionné sur la voix COURANTE** au lieu de la
   voix par défaut de la ligne. La bibliothèque dit pourtant noir sur blanc « un
   champ non précisé revient au défaut » : choisir « Pincée » (filterEnvAmount
   1200) puis « 808 profond » (qui n'y touche pas) laissait l'enveloppe de
   filtre de Pincée sur un son censé être rond. `resolveVoicePreset` faisait
   déjà le bon calcul — il n'était appelé que par le moteur, jamais par l'UI.

Six tests ajoutés sur ces deux contrats.

**Piège rencontré en vérifiant :** `XpSlider` ignore les événements du
`<input type=range>`, qui est purement visuel (`pointer-events: none`) — c'est
l'enveloppe `.wrap` qui capte le geste. Un `dispatchEvent` sur le range ne change
rien, il faut glisser pour de vrai. Une vérification qui passait « sans rien
changer » ne prouvait donc rien.

### ✅ Étape 16 — plus de verrou, plus de brassage total : un dé par chose (2026-08-19)

> « je pense que le dé par touche permet de se passer d'un brassage total. dans
> ce cas, on peut faire sauter le principe de verrou par bouton. par conséquent,
> il faut un dé pour le pad aussi. »

**La chaîne se tient, et elle enlève trois concepts pour en garder un.** Le dé
par bouton rend le brassage total (🔀) inutile ; or le verrou n'existait QUE
pour protéger du brassage ; sans brassage, il ne protège de rien. Ce qui reste
s'explique en une phrase : **un dé par chose assignable, et rien d'autre.**

Partent : le bouton 🔀 de la barre supérieure, `shuffleAssignments`,
`slotLocked`, `padLocked`, `toggleSlotLock`, `togglePadLock`, et les huit
boutons de verrou de l'overlay.

**Ce que la demande ne couvrait pas, et qu'il fallait voir :** l'inclinaison
n'était rebrassée **que** par 🔀 — elle n'a jamais eu de dé. Sans correctif,
elle serait devenue la seule assignation qu'on ne peut plus tirer au hasard.
Elle reçoit le sien (`randomizeTilt`). Le pad avait déjà le sien, descendu dans
l'overlay à l'étape 13.

Total : **8 dés** — six boutons, le pad (X+Y ensemble), l'inclinaison.

**Compatibilité des réglages enregistrés.** `LiveAssignments` est persisté en
`localStorage` et le validateur RÉCLAMAIT `slotLocked` et `padLocked` : les
retirer du type sans les retirer du validateur aurait rejeté chaque réglage
existant, donc réinitialisé l'assignation de tout le monde. Ils sortent des deux
ensemble ; les clés en trop d'un ancien enregistrement sont simplement ignorées.
Vérifié en semant un réglage à l'ancien format dans le navigateur avant de
charger : il se recharge intact, sans erreur.

**Vérifié :** `check` 0 erreur · 42 tests · les deux builds · Mode Live toujours
à 0 cible sous 44×44 · scénario Playwright — 🔀 absent, 0 verrou, 8 dés, un tir
qui change bien l'assignation (BREAK → ROLL K×3), aucune erreur console.

### ✅ Étape 17 — Mode jeu : la charpente des exercices, et un pilote de chacun (2026-08-19)

> « attaquons maintenant le mode jeu, as tu un plan précis sur le sujet ? » →
> « je pense qu'on peut tous les faire » (les trois nouveaux types) →
> **« Fais moi un test de chaque exercice stp »**

**Le constat de départ.** Les 34 niveaux font varier les PARAMÈTRES — subdivision,
swing, traîne, polyrythmie, rafales — mais jamais la TÂCHE. Le seul verbe est
« reproduire », et `verify()` était une comparaison case à case câblée en dur
dans le store. Ajouter un exercice sans charpente aurait donné un `if` de plus
dans la vue, puis un deuxième, puis un troisième.

**Ce qui a été fait, en deux temps.** D'abord la charpente (`src/model/exercises.ts`,
neuf, pur, testable sans navigateur) : le discriminant `ExerciseKind`, la
comparaison `comparerGrilles` **déplacée sans être changée**, et le découpage
`colonnesDeTranche`. Puis **un niveau jouable de chacun** des trois nouveaux
verbes, posés en 35/36/37 après la campagne — la progression existante n'est pas
touchée, et le joueur qui finit le 34 les trouve en bonus (accessibles tout de
suite avec le pseudo « master » ou `#boss`).

| Verbe | Ce qu'il demande | Ce qui est noté |
|---|---|---|
| `reproduire` | écouter, reposer la grille (les 34 niveaux) | chaque case, état **et** rafale |
| `completer` | un quart de la boucle est vidé, le reste est donné | les mêmes cases, **restreintes à la zone** |
| `intrus` | quatre mesures s'enchaînent, une seule diffère | un index, aucune grille |
| `jouer` | frapper le pad (ou l'espace) sur chaque coup de kick | le PLACEMENT, en millisecondes |

**Le point de conception, c'est le paramètre `colonnes` de `comparerGrilles`.**
Il permet à « compléter » de réutiliser **exactement** la même vérification que
« reproduire » en ne notant que la zone à remplir. Sans lui il aurait fallu un
second comparateur presque identique — et deux comparateurs qui doivent rester
d'accord finissent toujours par ne plus l'être.

**Trois choses que seule la mesure a montrées** (voir la règle « vérifier
visuellement ne suffit pas ») :

1. **« Compléter » vidait un trou, pas un temps.** À 8 pas et quatre tranches,
   le quart vidé faisait deux doubles-croches par ligne — **6 cases sur 24**,
   comptées à l'écran. La subdivision du pilote passe à 16 (12 cases sur 48), et
   le vocabulaire suit : le Mode jeu tient sur **une mesure** par ligne, donc un
   quart de boucle est un **temps** et pas une mesure. `colonnesDeMesure` devient
   `colonnesDeTranche` — générique, parce que « l'intrus » raisonne lui sur de
   vraies mesures mises bout à bout, et qu'un nom qui ment à un de ses deux
   appelants est un piège à retardement.
2. **« Jouer » notait la grille, pas le coup.** L'écart était mesuré contre le
   pas courant *quel qu'il soit*. Sur une boucle de 8 pas qui en porte 3 actifs,
   cinq pas sur huit sont silencieux : **frapper sur un silence bien aligné
   donnait 100 %**. L'ancre devient le dernier pas ACTIF du kick, et l'intervalle
   celui qui le sépare du prochain pas actif — pas la durée d'un pas. Vérifié
   dans le navigateur par un rAF qui frappe sur `.pas.playing:not(.actif)` :
   0 %, aucune victoire (contre 100 % en frappant sur `.pas.actif.playing`).
   Le pilote 37 passe aussi de 4 pas à 8 : à `kickMin/Max = 1`, la boucle sortait
   **deux** frappes — on ne joue pas en rythme sur deux frappes, on appuie deux fois.
3. **Les enveloppes tactiles se marchaient dessus, et volaient du bouton VISIBLE.**
   Les quatre boutons « Mesure 1..4 » ne répondaient que sur 22px de leurs 30px
   dessinés : l'enveloppe 44px de « Donner la réponse », plus bas dans le DOM,
   passait au-dessus. Diagnostiqué en faisant dire à la sonde *quel* élément elle
   touchait — `elementFromPoint` renvoyait bien le bouton du dessous. Écartements
   posés en fin de `<style>` dans le bloc `coarse` (16px minimum = deux
   débordements). Après : plus aucune cible sous 44 hors les deux exceptions déjà
   documentées (les cases de grille, le bouton `.player`).

**Ce que la charpente a fait tomber au passage.** `LevelDef` de `model/types.ts`
est **retiré** : déclaré, jamais lu, et son champ `kind: 'generated' | 'preset'`
décrivait la SOURCE d'un niveau, pas sa tâche. Le laisser à côté d'un vrai
discriminant en aurait fait un faux ami pour le prochain qui cherche où brancher
un exercice.

**La partie pure vit dans le modèle, pas dans le store.** `justesseDesFrappes`
et `ecartAuCoup` sont sortis de `game.svelte.ts` vers `model/exercises.ts` pour la
même raison que `comparerGrilles` : c'est de l'arithmétique, elle se teste sans
navigateur, sans Web Audio et sans runes. Le store n'en garde que le branchement.

**Fichiers touchés :** `src/model/exercises.ts` (neuf), `src/model/types.ts`
(`LevelDef` retiré), `src/model/presets/levels.ts` (champ `exercise` + 3 pilotes),
`src/stores/game.svelte.ts` (`preparerExercice`, `verify` aiguillé, frappes,
grille de l'intrus), `src/ui/game/GameView.svelte` (transport et corps par verbe,
pad, jauge, choix, zone), `src/App.svelte` (« 34 niveaux » devenu dynamique),
`tests/exercises.test.ts` (17 tests), `tests/model.test.ts`.

**Écarts de portée assumés.** Les pilotes sont des **pilotes** : un niveau de
chaque, pour comparer avant d'en écrire une campagne. La progression des 34
n'est pas retouchée, et aucun des trois verbes n'est encore intégré à la courbe
de difficulté — c'est la décision suivante, et elle appartient à Yann.

**Vérifié :** `check` 0 erreur · **59 tests** · les deux builds · scénario
Playwright de bout en bout sur les trois pilotes (intrus gagné en 3 essais avec
2★ et la bonne mesure marquée ; « jouer » gagné à 100 % de justesse en frappant
sur le curseur, 0 % en frappant sur les silences ; « compléter » verrouille les
cases justes et laisse les cases données inertes au clic) · barre d'espace
fonctionnelle · aucune erreur console · aucun débordement de page à 390px ·
cibles tactiles remesurées.

### ✅ Étape 18 — « Joue en rythme » repris sur les retours d'essai (2026-08-20)

> « le 1er type est plus simple que "reproduire" / le 2eme fonctionne en l'état
> tant que c'est un peu complexe / le 3eme peut être très sympa, plus choses à
> changer : soit ne pas voir où sont les temps à reproduire soit uniquement les
> voir mais ne pas entendre à quoi ça doit ressembler · avoir un petit décompte ·
> doute sur le temps de réponse entre le toucher et la remontée dans le système ·
> attention à avoir un bon niveau de tolérance · voir ce qu'on joue comme séquence »

**Deux verdicts à garder pour le placement dans la campagne**, sans code associé :

- **« compléter » est PLUS FACILE que « reproduire »** — l'oreille travaille sur
  un contexte au lieu du vide. Sa place est donc **avant**, pas après : c'est un
  échauffement, pas un examen.
- **« l'intrus » tient en l'état** à condition que le rythme soit un peu
  complexe. Sur une boucle pauvre, la variante d'un pas s'entend trop vite. À
  cadrer par la densité du niveau, pas par du code.

**Les cinq points sur « jouer », un par un.**

1. **Voir OU entendre, jamais les deux.** C'était le défaut de fond : montrer la
   grille pendant que le kick sonne ne demande que de suivre un point lumineux.
   Nouveau champ `GameLevel.jouerIndice` et **deux pilotes** au lieu d'un —
   37 « à l'oreille » (le kick sonne, la grille reste vide) et 38 « à vue » (la
   grille montre le motif, le kick est MUET, un hat en croches donne la
   pulsation). Le kick est coupé par `row.muted` dans `buildState`, honoré par le
   scheduler.
   ⚠️ **Le secret fuyait par où on ne l'attendait pas** : la bande de séquence
   (point 5) affichait les repères des coups attendus, donc la réponse, en
   « à l'oreille ». Trouvé en scriptant le pilote — le robot, qui n'entend rien,
   les lisait pour savoir où frapper et gagnait à 100 %. Les repères ne
   s'affichent plus qu'à vue, ou une fois le niveau fini.
2. **Précompte.** Quatre clics au tempo du niveau avant que ça compte, affichés
   en gros sur le pad. `engine.countIn`, écrit pour l'enregistrement du direct,
   réutilisé tel quel — le pad affiche le chiffre et refuse les frappes tant
   qu'il tourne. Un Stop pendant le précompte reste un Stop (sans le test, la
   boucle démarrait quand même quatre temps plus tard).
3. **Le temps de réponse — le doute était fondé, et il y avait DEUX fautes.**
   - Le coup de référence était daté par `performance.now()` au moment où la
     frame rAF consommait l'événement. rAF ne tourne qu'à 60 Hz et ne tombe
     jamais pile sur le coup : **jusqu'à 16 ms d'erreur ajoutés à chaque
     mesure**. On prend maintenant `ev.time`, le temps AUDIO programmé, via un
     `engine.audioTime()` neuf (compensé par `outputLatency`, comme
     `consumePlayhead`).
   - La frappe était datée au moment où le gestionnaire s'exécutait, pas quand
     l'événement est arrivé. `event.timeStamp` porte l'instant de réception ; la
     différence avec `performance.now()` est exactement le retard de remontée,
     et il est retranché.
   Reste ce qu'aucun code ne peut voir : la latence de la dalle tactile
   elle-même. D'où le point 4.
4. **Tolérance.** 25/90 ms → **40/130 ms**. Pas par gentillesse : la chaîne
   d'entrée d'un écran tactile ajoute ses propres dizaines de millisecondes avant
   que le geste n'arrive au code, et un joueur parfaitement en place peut être
   mesuré systématiquement en retard. Surtout, `medianeDesEcarts` est affiché à
   côté de la note — **« écart médian +60 ms (tu traînes) »**. La justesse prend
   la valeur absolue, donc « tout le monde en retard de 60 ms » et « la moitié en
   avance, l'autre en retard » lui donnent la même note : la médiane signée les
   sépare, et c'est ce qui dit si on regarde de la latence ou de l'imprécision.
   Médiane et non moyenne — une frappe complètement à côté ne doit pas déplacer
   le diagnostic de toutes les autres.
5. **Voir ce qu'on joue.** Une bande de séquence sous le guide : chaque frappe à
   sa **place réelle** dans la mesure (jamais quantifiée — c'est tout l'intérêt,
   une frappe posée juste après le repère se VOIT en retard), colorée par le même
   seuil que la note. Une frappe garde donc deux choses au lieu d'une : son écart
   signé et sa phase. Un pourcentage seul ne dit pas *où* ça déraille.

**Un test de store, le premier du projet.** `tests/jouer.test.ts` vérifie que le
kick est bien MUET à vue et bien AUDIBLE à l'oreille. Ce n'est pas un détail
d'implémentation : si le kick redevient audible au 38, l'exercice devient trivial
et **rien à l'écran ne le signalerait**. Vitest compile les runes sans réglage
supplémentaire (le plugin Svelte de `vite.config.ts` traite les `.svelte.ts`) —
vérifié avant d'écrire le fichier.

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`audioTime()`),
`src/model/exercises.ts` (seuils, `medianeDesEcarts`), `src/model/presets/levels.ts`
(`jouerIndice`, niveaux 37/38), `src/stores/game.svelte.ts` (`frappes` avec phase,
`decalageMedian`, kick muet), `src/ui/game/GameView.svelte` (précompte, horloge
audio, bande de séquence, légende), `tests/exercises.test.ts`, `tests/jouer.test.ts`
(neuf).

**Vérifié :** `check` 0 erreur · **69 tests** · les deux builds · Playwright sur
les deux sens (à vue : 10 frappes, 100 %, écart médian +7 ms ; à l'oreille : le
guide et les repères restent vides pendant le jeu et n'apparaissent qu'à
l'abandon) · frappes ignorées pendant le précompte · aucune erreur console ·
aucun débordement à 390px · cibles tactiles : aucune sous 44×44 hors les deux
exceptions documentées, sur les quatre pilotes.

### ✅ Étape 19 — le test instable qui a rendu `main` rouge, et ce qu'il cachait (2026-08-20)

**Ce qui s'est passé.** Le test de store écrit à l'étape 18 affirmait « le hat a
8 pas sur 8 ». Vert en local, vert sur la PR #88 — **rouge sur `main` avec 7**,
donc build non produit et **déploiement Vercel sauté**. La PR était mergée, le
site ne l'était pas.

**La cause immédiate : un test qui tirait au sort.** La génération d'un niveau
passe par `Math.random()`. Un test qui n'en regarde qu'un tirage n'est pas un
test, c'est une pièce lancée. Et le remplissage du hat (`genLevelRow`, branche
`fillRatio`) tire des positions au hasard avec un garde-fou à `steps * 4` :
remplir la DERNIÈRE case sur huit est un problème du collectionneur de vignettes,
32 tirages n'y suffisent pas toujours. `fillRatio: 1` ne garantit donc pas le
plein — il n'a jamais prétendu le faire, c'est l'assertion qui mentait.

**Ce que l'instabilité cachait, et qui valait bien plus que le test.** En
mesurant la vraie distribution plutôt qu'en relâchant l'assertion : le générateur
pose une ancre puis 2 ou 3 « extras » à des positions **tirées indépendamment**,
qui peuvent retomber sur l'ancre. Sur 200 000 tirages :

| Coups de kick | Part |
|---|---|
| **1** | **0,86 %** |
| 2 | 21,2 % |
| 3 | 57,5 % |
| 4 | 20,5 % |

Un niveau « jouer » sur cent sortait avec **un seul coup à jouer** — on ne joue
pas un rythme sur une frappe, on appuie une fois. Assez rare pour ne jamais se
voir en essayant, assez fréquent pour tomber sur un joueur. Un plancher de deux
coups est posé dans `preparerExercice`, **pas dans le générateur** : `genLevelRow`
sert les 34 niveaux de la campagne et y toucher changerait l'ordre de consommation
du hasard pour tout le monde. Le complément se prend sur les positions fortes,
sans tirage — il n'ajoute donc aucun appel au générateur.

**La règle à retenir.** Un test qui dépend de `Math.random()` doit affirmer ce qui
est vrai à **chaque** tirage, et répéter (60 fois ici) pour que le hasard devienne
de la couverture au lieu d'une pièce lancée. Le hat est donc noté « au moins 75 %
des pas », ce qui est la propriété qui compte — un trou occasionnel s'entend comme
une syncope, pas comme une absence de tempo.

**Et la règle de session.** Vert sur la PR ne veut pas dire vert sur `main` quand
un test est aléatoire. Vérifier le run de `main` après le merge, pas seulement
celui de la PR — c'est lui qui déploie.

**Vérifié :** `check` 0 erreur · **70 tests** · 12 exécutions consécutives du
fichier instable, toutes vertes (≈3 600 tirages par assertion) · les deux builds.

### ✅ Étape 20 — la latence se mesure, elle ne se devine pas (2026-08-21)

> « 37 trop dur, il y a clairement une latence »

**Deux problèmes distincts sous une seule phrase**, et le second n'est pas une
question de millisecondes.

#### 1. Une latence bel et bien NON compensée — et c'est un bug, pas une fatalité

`audioTime()` faisait `ctx.currentTime - (ctx.outputLatency || 0)`.
⚠️ **`outputLatency` n'est pas implémenté par WebKit** : sur iPhone et iPad il
vaut `undefined`, donc `|| 0` ne compensait **rien**. Et le projet ouvre son
contexte en `latencyHint: 'playback'` (choix de robustesse Bluetooth, voir
`ensureAudio`), c'est-à-dire avec un gros tampon de sortie. Sur un téléphone, le
Mode jeu mesurait donc les frappes contre une horloge en avance de plusieurs
dizaines de millisecondes sur ce qu'on entend. Repli posé sur `baseLatency`
(largement supporté) : c'est un plancher, pas la vérité, mais infiniment mieux
que zéro.

#### 2. Ce qui reste ne se devine pas

La dalle tactile, le système, le casque : aucune API ne les déclare. **Un
calibrage** est donc ajouté — un métronome nu, douze clics, le joueur tape
dessus, et la médiane de ses écarts EST son décalage. Le réglage est persisté
sous sa propre clé (`ui/game/latence.svelte.ts`) : ce n'est ni de l'état de
morceau ni de la progression, c'est une propriété de **l'appareil** — un même
joueur sur deux appareils n'a pas le même décalage, un même appareil partagé par
deux joueurs a le même. Il vit donc hors du format v2, comme `paramHints` et
`lastTouched`.

**Le point de conception : `affiner` est ADDITIF, pas remplaçant.** Les frappes
d'une partie sont déjà corrigées par le réglage en place ; leur médiane est donc
ce qu'il RESTE à corriger. Remplacer effacerait la correction précédente et
ferait **osciller** le réglage d'une partie à l'autre au lieu de le faire
converger — un bug invisible à la lecture, visible seulement en jouant deux fois
de suite. `tests/latence.test.ts` le verrouille.

D'où aussi le raccourci après une partie : si l'écart médian dépasse 25 ms, un
bouton **« Compenser ce décalage »** propose de l'appliquer — la partie qui vient
d'être jouée est une mesure, autant s'en servir. Il efface les frappes affichées
au passage : elles ont été mesurées avec l'ANCIEN réglage, les garder montrerait
un biais qui n'existe déjà plus.

#### 3. « Trop dur » n'était pas qu'une affaire de latence

Le niveau 37 demandait de reproduire **à l'oreille** un rythme **jamais
entendu**, dès la première mesure. Écouter, retenir, placer : trois choses, pas
une. Le transport sépare donc désormais **« 🔊 Écouter la boucle »** (autant de
fois qu'on veut, les frappes ne comptent pas) de **« ⏺ Jouer (précompte) »**.
C'est ce que fait n'importe qui devant un instrument, et ça change plus le niveau
que n'importe quel réglage de tolérance. Tempo abaissé en complément : 84/92 →
72/80.

#### Ce que la vérification a coûté, et appris

Deux robots Playwright successifs ont donné des mesures **fausses** avant qu'un
troisième ne serve à quelque chose :

- le premier tapait sur sa propre horloge, pas sur les clics du métronome : sa
  phase dérivait de 70 ms par temps, la médiane d'une phase qui balaie ne veut
  rien dire ;
- le second tapait sur tous les pas en mode « à l'oreille » — puisque les repères
  y sont **cachés par conception**, `cibles` était vide et il frappait aussi les
  silences.

Le troisième est un test **différentiel** : même niveau, même robot, une fois à
0 ms et une fois à +80 ms de réglage. **Différence mesurée : −79 ms pour un
réglage de +80.** Signe et amplitude justes, sans dépendre de la précision
absolue du robot. Et le calcul lui-même (`ecartAuClic`) est sorti dans
`model/exercises.ts` et testé unitairement : c'est le seul endroit où une erreur
de signe rendrait le calibrage **pire** que pas de calibrage, en corrigeant à
l'envers.

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`latenceSortie` avec repli,
`latenceSortieMs`, `metronome`), `src/model/exercises.ts` (`ecartAuClic`),
`src/ui/game/latence.svelte.ts` (neuf), `src/ui/game/GameView.svelte` (écoute vs
jeu, panneau de calibrage, correction appliquée, bouton rouge d'enregistrement),
`src/model/presets/levels.ts` (tempo du 37, préambules), `tests/latence.test.ts`
(neuf), `tests/exercises.test.ts`.

**Vérifié :** `check` 0 erreur · **81 tests** · les deux builds · scénario
différentiel Playwright (−79 ms attendu −80) · calibrage complet dans le
navigateur (12 clics, médiane, application, persistance, relecture après
rechargement) · les frappes ne comptent pas pendant l'écoute ni pendant le
précompte · aucune erreur console · cibles tactiles : aucune sous 44×44 sur les
quatre pilotes, transport à cinq boutons compris.

### ✅ Étape 21 — la latence hors du Mode jeu, et un pad qui ne quantifiait pas (2026-08-21)

> « (parenthèse, c'est un pb qu'on a aussi lorsqu'on joue au pad dans les autres modes) »

**Deux problèmes différents sous le mot « latence », et il faut les séparer** —
c'est le point de fond de cette étape :

- **Déclencher un son** (pads du Mode Live, aperçu d'une ligne, note jouée au
  clavier) : la latence **ne se compense pas**. On ne peut pas jouer un son avant
  la frappe. La seule réponse est de la RÉDUIRE.
- **Mesurer un placement** (Mode jeu, et le pad d'écriture de l'Atelier qui range
  ce qu'on joue dans une case) : là, un décalage mesuré se retranche.

#### 1. Réduire — `latencyHint` de 'playback' à 'interactive'

La justification d'origine (« on programme tout en avance de toute façon ») est
juste pour le séquenceur — sa robustesse vient du lookahead de 0,25 s
(`SCHEDULE_AHEAD`), pas du tampon de sortie — et **fausse pour tout ce qu'on
frappe**. Mesuré dans Chromium :

| `latencyHint` | `baseLatency` | `outputLatency` |
|---|---|---|
| `playback` | 23,2 ms | **72 ms** |
| `interactive` | 10 ms | **32 ms** |

**40 ms rendus à chaque frappe**, dans tous les modes, avant la dalle tactile et
le Bluetooth.

#### 2. Compenser — le réglage devient commun à toute l'appli

`ui/game/latence.svelte.ts` → `ui/latence.svelte.ts`, chargé une fois au
démarrage (`App.svelte`) et non plus dans l'écran qui s'en sert en premier. Le
pad d'écriture de l'Atelier le retranche comme le fait le Mode jeu, et son repère
de pas passe de `performance.now()` (au moment où la frame rAF consomme
l'événement) à `ev.time`, le temps AUDIO programmé — la même faute que celle
corrigée à l'étape 18, au même endroit du raisonnement.

#### 3. Deux bugs trouvés en VÉRIFIANT, dont un antérieur et sérieux

**(a) `quantizeToStep` avalait silencieusement toute correction positive.** Son
garde-fou `elapsedMs < 0 → pas courant` datait d'un temps où un écoulement
négatif ne pouvait être qu'une absence de repère. Depuis qu'on retranche un
décalage, un écoulement négatif veut dire « la frappe appartient au pas
PRÉCÉDENT » — et c'est le cas qu'on cherche à traiter. Mesuré au navigateur : un
réglage de 400 ms écrivait **exactement les mêmes colonnes** que 0 ms. La
fonction arrondit désormais au plus proche dans les deux sens, en conservant le
contrat d'origine — **pile à la moitié on reste sur le pas courant** (`Math.round`
arrondit 0,5 vers le haut et cassait un test existant ; d'où un arrondi dont les
égalités vont vers zéro).

**(b) Le pad d'écriture n'a JAMAIS quantifié pendant la lecture.**
`synthStepAt` était un `const` — un objet **non réactif**. Le muter ne
redéclenche rien en Svelte 5 : l'expression `stepStartedAt={stepAt?.[name] ?? 0}`
était évaluée une fois, au premier rendu, quand la valeur valait encore 0, et ne
bougeait plus jamais. `quantizedCol()` prenait donc systématiquement son repli
`if (!stepStartedAt) return playheadCol` — **il écrivait sur le pas EN COURS**,
c'est-à-dire précisément le défaut que `engine/quantize.ts` a été écrit pour
éviter. Un module pur, correctement testé, branché sur une valeur morte. Ni les
tests ni l'écran ne pouvaient le dire.

#### Ce que la vérification a coûté

Six sondes Playwright successives avant d'obtenir une mesure exploitable, et à
chaque fois **c'est la sonde qui était fausse** : sélecteur attrapant la tuile
d'aide au lieu de l'onglet, `startsWith('🎹')` attrapant l'onglet au lieu du
bouton du pad, `page.goto` vers la même URL à ancre identique qui **ne recharge
pas** (donc le réglage n'était jamais relu), deux `replace` Python sans `assert`
qui n'ont rien remplacé en silence. La leçon est celle du projet, encore : une
sonde qui ne montre rien ne prouve rien tant qu'on n'a pas vérifié qu'elle
regarde au bon endroit.

Preuve finale, différentielle et instrumentée :

| Réglage | `ecoule` vu par le pad | Colonnes écrites |
|---|---|---|
| 0 ms | +276 ms | 1, 2, 3 |
| 400 ms | **−126 ms** | **0, 1, 2** |

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`latencyHint`),
`src/engine/quantize.ts` (arrondi bidirectionnel), `src/ui/latence.svelte.ts`
(déplacé depuis `ui/game/`), `src/App.svelte` (chargement au démarrage),
`src/ui/atelier/AtelierView.svelte` (`$state`, `ev.time`, `horloge`),
`src/ui/atelier/SynthModule.svelte` + `src/ui/sequencer/SynthRowView.svelte`
(transmission), `src/ui/sequencer/NotePad.svelte` (horloge audio + décalage),
`src/ui/game/GameView.svelte`, `tests/quantize.test.ts`, `tests/latence.test.ts`.

**Vérifié :** `check` 0 erreur · **87 tests** · les deux builds · essai
différentiel instrumenté ci-dessus · sondes retirées du code livré (0 `console.log`
dans `NotePad.svelte`).

#### 4. Le budget complet de latence d'un pad, chiffré

> « l'idée de pad, c'est de pouvoir jouer en direct donc s'il y a un décalage,
> il faut le réduire, ma question : est-ce possible ? »

Oui, et il y a **trois maillons** — dont deux réductibles :

| Maillon | Avant | Après | Réductible ? |
|---|---|---|---|
| Avance de déclenchement (code) | 20 à **50 ms** | **5 ms** | ✅ gratuit |
| Tampon de sortie (`latencyHint`) | 72 ms | 32 ms | ✅ fait, et encore possible |
| Dalle tactile / OS / Bluetooth | 20-200 ms | — | ❌ hors de portée |

**L'avance de déclenchement était le pire, et le plus bête.** Les sons joués à la
demande étaient programmés à `currentTime + 0,02` (`preview`), `+ 0,02`
(`playDegreePreview`), `+ 0,01` (SOLO du Mode Live) et **`+ 0,05` pour
`previewSynth`** — 50 ms de retard ajoutés au geste, empilés SUR la latence de
sortie. Constante unique `AVANCE_DECLENCHEMENT = 0,005 s` : Web Audio traite par
blocs de 128 échantillons (≈2,9 ms), deux blocs d'avance suffisent à garantir que
l'enveloppe démarre à sa première valeur au lieu d'être rattrapée en cours de
rampe — ce qui claque. C'est la seule raison d'être de cette avance.

Total d'un appui sur le pad synthé, hors matériel : **~122 ms → ~37 ms**.

**Le maillon qui reste, et son prix.** `latencyHint` accepte aussi un NOMBRE de
secondes. Mesuré dans Chromium :

| `latencyHint` | tampon | `outputLatency` |
|---|---|---|
| `'playback'` (l'ancien) | 1024 éch. | 72 ms |
| `'interactive'` (l'actuel) | 441 éch. | 32 ms |
| `0.001` | **128 éch.** | **8 ms** |

**Tranché : `0.001`.** La question posée par Yann est celle du SEUIL, pas du
réglage — « je veux juste pouvoir jouer sur le pad une mélodie […] sans me rendre
compte de la latence ». Or il existe, et c'est lui qui commande :

| Latence geste → son | Ressenti |
|---|---|
| **< 10 ms** | imperceptible |
| 10-20 ms | acceptable, on joue sans y penser |
| 20-30 ms | sensible sur les attaques franches |
| **> 30 ms** | on entend le décalage et on ralentit pour compenser |

(Wessel & Wright, *Problems and Prospects for Intimate Musical Control of
Computers*, 2002, et la pratique des studios. Deux nuances : les attaques
percussives — un pad, un piano — sont les plus sensibles, une nappe pardonne
bien plus ; et la GIGUE gêne davantage qu'un retard constant, parce qu'on
s'adapte à un retard fixe et jamais à un retard qui varie.)

`'interactive'` laissait le budget logiciel à 37 ms : **au-dessus du seuil**,
donc à côté de la demande. Seul `0.001` passe dessous. Vérifié dans l'appli
réelle, pas seulement sur un contexte témoin : `latencyHint: 0.001` → 128
échantillons, `outputLatency` 8 ms, contexte `running` et stable après cinq
secondes de lecture avec l'analyseur à 60 Hz, zéro erreur console.

**Budget logiciel final : ~122 ms → 13 ms** (5 ms d'avance + 8 ms de tampon).

⚠️ **Le prix, assumé et réversible en une constante.** À 128 échantillons le fil
audio n'a plus que ~2,9 ms pour remplir chaque bloc : sur un appareil faible ou
chargé, un dépassement s'entend comme un CLIC, pendant le jeu comme pendant la
lecture. Le lookahead (0,25 s) ne protège pas de ça — il garantit le PLACEMENT
des notes, pas le remplissage du tampon. `TAMPON_SORTIE` est la seule chose à
changer si des craquements apparaissent ; revenir à `'interactive'` rend 24 ms
et la robustesse avec.

⚠️ **Ce que ça ne règle pas.** Le Bluetooth : 100 à 200 ms qu'aucun code ne
touche.

⚠️ **Et une erreur à ne pas refaire, commise ici puis corrigée** (Yann :
« l'écran tactile induit une latence de 40 ms a minima ?? »). Les chiffres
publiés sur la « latence tactile » — 50 à 100 ms — mesurent presque toujours le
**touch-to-display** : doigt, digitaliseur, système, application, rendu,
composition, vsync, réponse de dalle. **La moitié de ce budget est le pipeline
graphique, que le pad ne traverse pas** : il va du doigt au son, sans passer par
l'écran. Ce qui compte ici est le **touch-to-event**, dominé par la fréquence
d'échantillonnage du digitaliseur (60 à 120 Hz, soit 8 à 16 ms de granularité)
plus la pile d'entrée : **plutôt 10 à 30 ms**.

Conclusion révisée : avec 13 ms côté logiciel, **un téléphone récent peut très
bien tomber dans la zone jouable**. Affirmer le contraire était une extrapolation
à partir du mauvais chiffre. Et il n'y a pas à en débattre : **ça se mesure**,
appareil par appareil, et le calibrage du Mode jeu mesure exactement ce
trajet-là. Depuis que la sortie est compensée à 8 ms près, l'écart médian qu'il
affiche est essentiellement la latence d'ENTRÉE de l'appareil plus le biais de
jeu du joueur.

**Reste aussi, et c'est une question de placement :** le calibrage n'est
atteignable que depuis les niveaux « jouer » du Mode jeu. Le réglage, lui, vaut
pour toute l'appli. Où poser l'entrée dans l'Atelier — menu Affichage, menu Aide,
onglet Production ?

### ⚠️ Étape 22 — la latence gagnée au prix du son, et le retour en arrière (2026-08-21)

> « ça marche très bien mais le son est devenu moche ! »

**Régression mise en ligne, corrigée dans la foulée.** L'étape 21 avait descendu
les deux réglages de latence au minimum : avance de déclenchement à 5 ms, tampon
de sortie à 128 échantillons. La latence est effectivement tombée à 13 ms — et le
son avec.

**Le mécanisme, et c'est le raisonnement qui était faux, pas le chiffre.** Toutes
les voix ouvrent sur une attaque de 3 à 4 ms :

```
g.gain.setValueAtTime(0.0001, time);
g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
```

Avec 5 ms d'avance, **l'attaque entière tient dans la marge**. Il suffit que le fil
principal prenne quelques millisecondes de retard entre la lecture de
`currentTime` et le rendu pour que `setValueAtTime` tombe dans le **passé** : Web
Audio l'applique alors immédiatement, la rampe est sautée, le gain saute d'un
coup — **un clic à chaque note**. Le tampon de 128 échantillons (2,9 ms pour
remplir chaque bloc) ne faisait qu'aggraver.

L'avance n'est donc pas du rembourrage de confort : **c'est la marge dont
l'enveloppe dépend pour exister**. La raccourcir revenait à supprimer l'attaque.

**Valeurs retenues :** avance **20 ms** (celle que `preview` portait déjà, et dont
on sait qu'elle sonne juste) et tampon **`'interactive'`** (441 échantillons,
32 ms mesurés — le préréglage que le navigateur dimensionne POUR l'audio
interactif). Budget logiciel **~122 ms → ~52 ms**. Moins bien que les 13 ms visés,
mais **13 ms qui claquent ne valent rien**.

**Verrouillé par un test.** `tests/latence-audio.test.ts` importe les deux
constantes (désormais exportées) et vérifie leur RAPPORT à l'attaque la plus
courte du banc de voix — au moins cinq fois sa durée — plus le fait que le tampon
reste un préréglage nommé et jamais `'playback'`. La prochaine tentative
d'optimisation butera sur une assertion au lieu d'aller s'entendre en production.

⚠️ **Et une bourde de méthode, à ne pas refaire.** La première version de ce test
grattait `AudioEngine.ts` avec une expression régulière et `node:fs`. Elle passait
`npm test` en local et a fait **échouer la CI** : `svelte-check` vérifie aussi les
fichiers de `tests/`, et les types Node ne sont pas installés. Cause réelle :
`npm run check` avait été lancé AVANT d'écrire le test, pas après — c'est
exactement ce que la règle « avant chaque commit » existe pour empêcher. Importer
les constantes plutôt que gratter la source supprime au passage deux fragilités
(le regex et la dépendance au chemin).

**Ce qu'il faudrait pour descendre plus bas — et c'est un chantier, pas un
réglage.** Rendre les enveloppes robustes à un démarrage tardif : caler chaque
départ sur `max(time, ctx.currentTime)` et recalculer la rampe depuis la valeur
courante du paramètre plutôt que depuis zéro. Tant que ce n'est pas fait, l'avance
de 20 ms est le prix du son, et il n'est pas négociable par une constante.

**Vérifié :** `check` 0 erreur · **92 tests** · les deux builds · contexte relu
dans l'appli réelle (441 échantillons, `outputLatency` 32 ms, `running` stable).

### ✅ Étape 23 — le calibrage inutilisable, et la note qui punissait l'apprentissage (2026-08-21)

> « les niveaux 37 et 38 sont tj trop compliqués, je n'arrive pas à faire
> fonctionner le réglage de latence »

Deux défauts, et **aucun des deux n'était un réglage de difficulté**.

#### 1. Le calibrage jetait les frappes en silence

Le métronome était une salve UNIQUE de douze clics (7,2 s), lancée à l'ouverture
du panneau, et `frapperCalibrage` **abandonnait sans rien dire** toute frappe hors
de cette fenêtre. Le temps de lire la consigne, la fenêtre était passée : le
compteur restait à zéro, et rien à l'écran n'expliquait pourquoi. Reproduit au
navigateur en attendant 10 secondes avant de taper — exactement le geste de
quelqu'un qui découvre l'écran.

Trois correctifs :
- **le métronome CONTINUE** — les salves s'enchaînent bout à bout (`apresQuoi`),
  sans rupture de phase, tant que le panneau est ouvert. La grille
  `debut + n × intervalle` reste vraie du début à la fin ;
- **plus aucune frappe jetée en silence** : avant le premier clic, le pad affiche
  « le métronome démarre… » au lieu d'ignorer ;
- **`await ctx.resume()`** au lieu de `void`. Un AudioContext fraîchement créé
  démarre suspendu : `currentTime` n'avance pas, et une salve programmée avant la
  reprise part sur une horloge figée.

Vérifié : ouverture du panneau, **10 s d'attente**, puis frappes → comptées ; et à
22 s le métronome tourne toujours. Avant, tout était perdu.

#### 2. La note moyennait TOUT le tour — on ne pouvait jamais réussir une mesure

`justesseDesFrappes` moyennait chaque frappe du tour, divisée par le plus grand du
nombre attendu et du nombre joué. Or **la boucle tourne en rond** : les
tâtonnements des premières mesures plombaient la note définitivement, et plus on
jouait, plus c'était dur. Il n'existait aucun moyen de « réussir une mesure », on
ne pouvait que diluer ses erreurs. **C'était la vraie difficulté**, bien avant les
seuils de tolérance ou le tempo.

La note est désormais celle de la **meilleure fenêtre de `attendues` frappes
CONSÉCUTIVES**. Une mesure propre suffit — ce qu'un joueur cherche précisément à
faire.

⚠️ **Règle changée en connaissance de cause.** Un test affirmait « marteler le pad
fait BAISSER la note » ; il est remplacé par deux assertions qui disent la
nouvelle intention : des tâtonnements suivis d'une mesure propre donnent 100 %, et
la fenêtre est **consécutive** — des bonnes frappes éparpillées ne suffisent pas,
sans quoi le martèlement serait récompensé.

#### 3. Le tempo, en complément — et un oubli

37 : 84/92 → 72/80 → **64/72**. Et surtout **38 était resté à 84/92** : le pilote
le plus RAPIDE des trois, alors qu'il demande de lire un motif *et* de le jouer.
Passé à **68/76**. C'est un oubli de l'étape 21, pas une décision.

**Fichiers touchés :** `src/engine/AudioEngine.ts` (`metronome` asynchrone,
enchaînable), `src/model/exercises.ts` (`justesseDesFrappes` par fenêtre),
`src/model/presets/levels.ts` (tempos), `src/ui/game/GameView.svelte` (métronome
continu, état visible, jauge de progression), `tests/exercises.test.ts`.

**Vérifié :** `check` 0 erreur · **92 tests** · les deux builds · scénario
« j'attends 10 s puis je tape » au navigateur · niveau 38 gagné après des
tâtonnements suivis d'une mesure propre · aucune erreur console.

### ✅ Les quatre pilotes du Mode jeu sont VALIDÉS (2026-08-21)

> « ça a très bien fonctionné là »

Après la mise en ligne de l'étape 23 (calibrage continu + note à la meilleure
mesure). Les quatre pilotes — 35 « compléter », 36 « intrus », 37 « jouer à
l'oreille », 38 « jouer à vue » — sont jouables et jugés bons par Yann.

**Ce qu'il aura fallu, et l'ordre dans lequel c'est tombé** — utile parce que
trois de ces quatre causes n'étaient PAS ce qu'on regardait au départ :

| Symptôme rapporté | Cause réelle |
|---|---|
| « 37 trop dur » | on demandait de reproduire à l'oreille un rythme **jamais entendu** — il manquait « écouter » séparé de « jouer » |
| « il y a clairement une latence » | `outputLatency` **non implémenté par WebKit**, donc `\|\| 0` ne compensait rien |
| « le son est devenu moche » | l'avance de déclenchement descendue à 5 ms **mangeait l'attaque de 4 ms** des voix |
| « je n'arrive pas à faire fonctionner le réglage de latence » | le métronome ne durait que **7 s** et jetait les frappes suivantes en silence |
| « toujours trop compliqués » | la note moyennait **tout le tour** : impossible de réussir une seule mesure |

Aucune de ces cinq n'était un réglage de difficulté. La leçon de la série est
dans `CLAUDE.md` : quand un module pur et testé se comporte mal, **suspecter le
câblage** ; et ne jamais ignorer en silence un geste qu'on mesure.

**Ce qui reste sur le Mode jeu est désormais du CONTENU et des ARBITRAGES**, plus
de la mécanique — voir les chantiers ouverts ci-dessous.

### ✅ Étape 24 — trois verbes de PARAMÈTRE, pilotes en famille Timbre (2026-08-21)

> « il faut inventer des jeux séquence, timbre et filtre& espace, groove &
> variation humaine puis la même pour tout le synthé en friche encore »

**Trente et un boutons. Un jeu par bouton est ingérable** — et ce n'est pas ce
qu'il faut. Les quatre verbes existants comparent des GRILLES (juste ou faux) ;
ces familles sont des VALEURS CONTINUES. D'où une seconde famille de verbes,
**paramétrés par le bouton visé**, et la même progression rejouée dans chaque
panneau :

| Verbe | Ce qu'on demande | Ce que ça enseigne |
|---|---|---|
| `lequel` | trois versions, laquelle est « la plus … » | entendre la **direction** d'un bouton |
| `nommer` | deux sons, un seul réglage diffère — lequel ? | mettre un **nom** dessus |
| `regler` | un son cible, un curseur, retrouve la valeur | viser un **son**, pas un chiffre |

#### Le catalogue est le vrai travail — `src/model/parametres.ts`

Chaque bouton y porte ses bornes, son unité, et surtout **deux jugements
musicaux que le code ne peut pas deviner** : `tolerance` (en deçà de quel écart
deux réglages s'entendent pareil) et `ecartMini` (au-delà de quel écart la
différence est franche). Les changer change le jeu.

Trois pièges rencontrés, tous vérifiés avant d'écrire une ligne d'interface :

1. **Le filtre se compare en OCTAVES, pas en hertz.** 500 Hz d'écart à 800 Hz
   change tout ; les mêmes 500 Hz à 12 kHz sont inaudibles. Une tolérance en
   hertz serait fausse à un bout ou à l'autre. D'où `echelle: 'log'` et
   `ecartPercu`.
2. **Les identifiants doivent être les VRAIS champs de l'état.** J'avais écrit
   `lowpass` : le champ s'appelle `filterCutoff`. Un identifiant inventé règle un
   champ que personne ne lit — deux sons identiques, niveau impossible, et rien
   ne le dit. Un test parcourt le catalogue et vérifie chaque clé contre
   `defaultState()`.
3. **Un bouton ne s'entend pas sur toutes les lignes.** `tone` ne pilote qu'une
   saturation sur le kick, morte sous zéro (`if (tone > 0.03)`) ; sur snare et
   hat il déplace un filtre de ±1 octave, franc dans les deux sens. D'où le champ
   `lignes`, sans quoi le tirage pourrait poser un exercice sur un bouton inerte.
   Réverbe et Delay ont, eux, un `facteurEtat` : stockés en 0..1, montrés en
   pourcents.

#### Le tirage des versions, repris après échec du test

`tirerVersions` découpait d'abord l'étendue en tranches avec une marge de 15 %.
Le test l'a attrapé au premier essai : **deux versions à 14 points d'écart pour
une tolérance de 15**, donc une question dont la bonne réponse est un tirage au
sort. Remplacé par un espacement **garanti par construction** — valeurs posées à
intervalle exact, seule leur position d'ensemble est tirée au hasard. Le hasard
décide où, jamais si c'est audible.

Et l'arrondi : un paramètre logarithmique s'arrondit **au hertz**, pas au pas du
curseur. Près de 200 Hz, le pas de 100 Hz fait des sauts de 0,35 octave — toute
la tolérance d'un coup, ce qui pouvait à lui seul rapprocher deux versions en
deçà du discernable.

#### Ce que ça ajoute côté code

`ExerciseKind` gagne trois entrées (le compilateur a immédiatement réclamé les
messages d'échec manquants — l'exhaustivité fait son travail), `GameLevel` gagne
`familleParam`, le store gagne `preparerParametre` et une branche de
vérification, `buildState` un mode `'param'` qui ne fait sonner QUE la ligne
visée. Trois pilotes : 39, 40, 41.

**Écart de portée assumé :** seule la famille **Timbre** est servie. Filtre &
espace est déjà décrit dans le catalogue et ne demandera qu'un niveau de plus ;
Groove et Séquence demanderont d'étendre le catalogue à l'état global (swing,
traîne…) plutôt qu'à la ligne ; **le synthé est un autre type de ligne** et reste
le gros morceau — `CLAUDE.md` impose d'en cartographier les points de contact
avant d'y toucher.

**Remarque sur « Séquence », à trancher :** *Pas* et *Coups euclidiens* changent
la GRILLE — c'est déjà ce que « reproduire » enseigne, et un jeu de plus ferait
doublon. *Volume* seul est un mauvais exercice d'oreille. Il ne reste vraiment
que *Décalage*. La famille mériterait d'être fondue dans les verbes existants
plutôt que servie à part.

**Vérifié :** `check` 0 erreur · **119 tests** (dont 21 neufs sur le catalogue et
le câblage) · les deux builds · les trois écrans au navigateur, niveau 39 gagné ·
aucune cible tactile sous 44×44, aucun débordement à 390px · aucune erreur console.

## ⏳ Architecture du Mode jeu — proposition (EN ATTENTE D'ARBITRAGE, 2026-08-21)

> « il faut mettre tout à plat : on a plusieurs façons de jouer, des modules à
> débloquer, ça permet d'apprendre la MAO. on a des presets à reconstruire et
> comprendre et pourquoi pas jouer avec. on peut imaginer un jeu avec une
> histoire. un jeu où on devient le meilleur producteur ! on doit pouvoir créer
> un EP. et pourquoi pas le marketer ? »

⚠️ **Partiellement arbitré le 2026-08-23** — Yann : *« on part sur le scénario
pour le moment pour développer le mode jeu »*. Les questions **1 et 2** sont
donc tranchées (l'histoire est le contenant ; la fiction, c'est `HISTOIRE.md`
en entier) et la première tranche est livrée : voir
[« Mode carrière — la charpente en huit actes »](#-mode-carrière--la-charpente-en-huit-actes-actes-0-à-2-jouables-2026-08-23).
Les questions **3 et 4** restent ouvertes — elles portent sur les actes 4 et 6,
qui ne sont pas encore écrits. Le reste de cette section garde sa valeur
d'analyse ; ce qui a été fait AUTREMENT que proposé (deux axes et non trois, pas
de migration depuis `level`) est expliqué dans l'entrée ✅.

> 📖 **L'HISTOIRE est écrite, et elle vit dans [`HISTOIRE.md`](HISTOIRE.md)**
> (2026-08-22). Elle répond à la question 2 ci-dessous (« combien de fiction ? »)
> par un décor, quatre personnages et huit actes, sans inventer un seul mécanisme
> qui n'existe pas déjà ici. Les deux documents se lisent ensemble : celui-ci dit
> ce que le jeu FAIT, l'autre ce qu'il RACONTE.

### Le vrai blocage n'est pas le contenu, c'est un entier

`PlayerProgress.level` est **un seul nombre**, et il porte trois choses qui n'ont
rien à voir :

| Axe | Ce que c'est | Aujourd'hui |
|---|---|---|
| **Compétences** | 7 verbes × 5 familles de paramètres | fondu dans le numéro de niveau |
| **Accès** | Atelier, Synthé, Production, Live | seuil arbitraire sur ce numéro |
| **Motivation** | pourquoi continuer | étoiles, besace, piques |

Tant qu'il n'y avait qu'un verbe et une ligne droite, ça tenait. Ça ne tient
plus : un seul entier ne peut pas dire « il entend un filtre mais il n'a jamais
joué en rythme ».

### L'EP comme colonne vertébrale — et ici ce n'est pas décoratif

**L'appli fabrique déjà l'objet réel** : export MP3 reproductible à l'octet près,
partage par URL. « Tu as sorti un EP » n'est donc pas une métaphore — le joueur
repart avec de vrais fichiers et de vrais liens. Un jeu sur « devenir
producteur » qui ne produit rien serait creux ; celui-là n'a pas à l'être.

La campagne devient **la production d'un EP de 4 ou 5 titres**. Chaque titre est
un projet exigeant certaines compétences ; les exercices sont comment on les
acquiert ; les modules s'ouvrent **parce que le titre en a besoin**.

Ça règle le verrou d'un coup : « le niveau 12 ouvre le Synthé » est arbitraire ;
« ton morceau a besoin d'une basse, voilà le Synthé » est un moment de récit.
Même mécanisme, plus aucun nombre à justifier.

### L'arc, et une coïncidence qui n'en est pas une

| Titre | Ce qu'il enseigne | Ce qu'il ouvre |
|---|---|---|
| 1 · Le beat | rythme seul, kick/snare/hat | **Atelier** |
| 2 · La basse | tonalité, gamme, lignes tenues | **Synthé** |
| 3 · L'espace | filtre, réverbe, delay + check de mix | **Production** |
| 4 · Le groove | swing, traîne, ghost, humanisation | — |
| 5 · La sortie | jouer son morceau devant quelqu'un | **Mode Live** |

**Les cinq étapes tombent exactement sur les quatre modules verrouillés.** Ce
n'est pas un hasard heureux : le découpage modulaire de l'appli EST déjà une
progression pédagogique, et le verrou actuel essayait de dire ça avec des numéros
de niveau, faute de récit pour le porter.

### Les 34 presets sont l'actif le plus sous-employé

Chacun porte `label`, `cat` et un **paragraphe `history`**. Ils ne servent
aujourd'hui qu'à deux choses : cible de niveau, et indice « le plus proche ».

Ils peuvent être la **couche culture** : le brief du label, la discothèque de
référence, le vocabulaire. « Reconstruire un preset » cesse d'être un exercice
pour devenir une commande, et l'enchaînement par titre devient : *écoute ce
qu'est ce style* → *reconstruis-le* → *maintenant fais le tien*.

### Le problème le plus dur : noter la création

On ne peut pas noter une composition sur la ressemblance. Réponse proposée :
**on ne note pas le goût, on note le respect du BRIEF** — vérifiable
objectivement : tempo dans la fourchette, lignes exigées actives, densité
minimale, module fraîchement ouvert effectivement utilisé, durée. La voix des
roasts commente le reste sans que ça compte en étoiles. Et **c'est le joueur qui
choisit son single**, donc l'auto-évaluation remplace le jugement de la machine
là où la machine n'a rien à dire.

### Le marketing : la version qui marche, et celle qui tue le jeu

**Celle qui tue :** streams, argent, abonnés — une couche d'idle game dont les
chiffres montent sans rapport avec ce qu'on a fait. Ça transforme un jeu sur
l'oreille en tableur.

**Celle qui marche :** que chaque décision reste **musicale ou éditoriale**.

- **Choisir le single** — écouter son propre travail d'un point de vue critique,
  ce qu'aucun exercice ne fait faire.
- **Titre, pochette, nom d'artiste** — l'identité, peu coûteuse et mémorable.
- **Le public visé** — et il **change le retour reçu**. Un public club ne juge
  pas le kick comme un public casque.
- **La sortie** — le Mode Live devient la release party, usage narratif qu'il
  attend.

⚠️ **Le check de mix est réellement faisable.** L'analyseur est déjà branché sur
`finalGain`, et l'export produit déjà un buffer hors ligne : on peut **mesurer**
l'énergie par bande et la dynamique du rendu final. Le jeu dit alors « ton kick
est enterré » avec une mesure, pas avec une opinion.

### Ce que je refuserais

- **La monnaie.** Elle ajoute de la comptabilité, invite au grind, et remplace
  « j'ai fait un truc bien » par « j'ai assez farmé ». La besace couvre déjà la
  récompense, avec le bon ton et à coût nul.
- **Le scénario qui enferme l'outil.** L'Atelier est le but, pas la récompense.
  Le mode carrière est le chemin par défaut ; un **studio libre reste toujours
  atteignable**. Sinon on perd exactement les gens venus faire des beats.

### Le modèle qui remplace l'entier unique

```
competences : Record<CompetenceId, 0|1|2|3>   // verbe × famille, en étoiles
modules     : LockedModule[]                   // ouverts par le RÉCIT
carriere    : { titres: TitreEtat[], etape }
```

Les anciennes sauvegardes se dérivent de `level` — même exigence de
compatibilité que `deserialize` pour les fichiers v1/v2.

### Ce que deviennent les 41 niveaux existants

Rien ne se jette. Ils cessent d'être *la campagne* pour devenir **le réservoir** :
chaque titre exige des compétences, les exercices servent à les obtenir ou les
prouver. Un joueur qui sait déjà entendre un filtre passe au titre ; un autre va
s'entraîner. C'est ce que le modèle par compétences permet et que l'entier unique
interdisait.

### La première tranche livrable

Une refonte qui ne se livre pas par morceaux est un piège. Première tranche
proposée : **l'écran Projet et le titre 1 seulement** —

- le modèle de compétences + la migration des sauvegardes,
- un écran « EP en cours » listant les titres, verrouillés sauf le premier,
- titre 1 : brief → étude (un preset à reconstruire, ça existe déjà) →
  composition libre dans l'Atelier → vérification du brief → validation,
- l'Atelier s'ouvre **parce que le titre l'exige**.

Le reste — les quatre autres titres, le check de mix, le single, la pochette, le
public — vient après sans rien casser.

### ⏳ Les quatre questions à trancher (mes réponses recommandées en italique)

1. **L'EP est-il le contenant de toute la campagne, ou un mode à côté ?**
   *Contenant, avec les niveaux gardés en salle de répétition : l'EP donne le
   pourquoi, les exercices le comment.*
2. **Combien de fiction ?** *Minimale : un label pour le cadre, et la voix des
   roasts — qui existe déjà et qui est bonne — comme personnage. Pas de
   distribution ni de dialogues à embranchements, ce serait des semaines
   d'écriture et ça diluerait le ton.*
3. **Le joueur compose-t-il, ou reconstruit-il des presets imposés ?**
   *Il compose ; la reconstruction devient l'étude qui précède. Et la notation
   porte sur le brief, jamais sur le goût.*
4. **Le public/contexte change-t-il le jugement ?** *Oui, comme contrainte de
   MIX mesurée sur le rendu, pas comme jugement de goût. C'est l'idée la plus
   riche de la partie marketing, et la plus technique.*

---

### ✅ L'histoire du Mode carrière — `HISTOIRE.md` (2026-08-22)

Demande de Yann : *« un label a perdu tous ses artistes / le perso est
l'assistant qui fait uniquement le café / le label ne sait pas vers qui se
tourner / le perso doit apprendre puis faire la batterie, pareil pour les autres
modules / il doit faire des commandes spécifiques (ex. boom bap) / il y a des
accomplissements : faire son EP, faire un live. »*

**Fichier touché : `HISTOIRE.md`. Aucun code.** La section ⏳ ci-dessus reste en
attente d'arbitrage.

**Le texte final est de Yann.** Après plusieurs versions écartées (voir plus
bas), il a écrit lui-même le déroulé en huit actes ; mon travail a été une
relecture de continuité, **dix-sept corrections**, listées et justifiées dans
l'annexe de `HISTOIRE.md`. Style à préserver : lignes courtes, une idée par
ligne, beaucoup de dialogue, aucune description.

**Face B**, label fondé en 1989, quatorze artistes au catalogue, zéro en
activité. Trois pièces au-dessus d'une laverie. Le label vit de **sonneries de
téléphone** — onze centimes sur trois euros. Une grosse maison veut racheter le
catalogue ; Sol a jusqu'au **14 juin** pour signer, et elle a l'intention de le
faire. Le stagiaire fait le café jusqu'au jour où le sous-traitant des sonneries
s'en va en laissant un mot de passe qui ne marche pas.

#### ⚠️ Trois écarts payés, à ne pas refaire

1. **Version « film français »** (décor physique, escaliers, visages) — écartée :
   *« l'histoire ne colle pas avec l'esthétique winamp »*. Le défaut n'était pas
   l'époque mais la **densité**.
2. **Version transposée dans la culture technique de 2001** (netlabel, canaux de
   discussion, débits d'encodage) — écartée : *« trop geek, j'adhère pas »*.
   Corrigeait la mauvaise variable.
3. **Version « propre »**, obtenue en répondant à trois demandes successives de
   clarté — écartée : *« une histoire creuse, pas vraiment drôle, on ne parle pas
   du contexte des années 2000 »*. ⚠️ **C'est l'écart le plus instructif : à
   chaque « rends-le plus clair », une couche de texture partait.** Clarifier
   n'est pas retirer.

#### Les décisions qui tiennent

- ⚠️ **L'époque est le gagne-pain, pas le décor.** Le label vit des sonneries,
  donc le stagiaire fait de la musique **parce qu'il y a une livraison lundi** —
  pas par vocation ni par talent caché. L'arc est une échelle de dignité :
  percussions à trois euros → jingle de laverie → morceau refusé par une salle →
  quinze styles au catalogue → un disque signé de son nom.
- ⚠️ **La peau est le mobilier, pas le sujet.** Le chrome biseauté est le langage
  d'un appareil gris à boutons, pas d'un ordinateur : on ne montre jamais le
  décor, on montre les appareils du décor (afficheur LCD et compte à rebours,
  répondeur, playlist, étiquettes de cassette, analyseur). Corollaire et budget :
  si ça ne tient pas sur un afficheur, ce n'est pas dans le jeu. Et **le biseau
  gris n'est pas un parti pris graphique, c'est le budget du label.**
- **Objets ordinaires, jamais objets de niche** — un CD gravé au marqueur, tout
  le monde ; un ratio sur un serveur, personne. Aucune année ne s'affiche jamais.
- **Huit actes, quatre modules.** Atelier (acte 1), Synthé (acte 3), Production
  (acte 4), Mode Live (acte 7) ; les actes 0, 2, 5 et 6 n'ouvrent rien et sont
  donc bon marché. ⚠️ **Le synthé arrive APRÈS le groove de la batterie**
  (arbitrage de Yann) : on finit un instrument avant d'en ajouter un autre.
- **L'acte 5 « Les styles » est l'endroit où les 34 presets servent enfin** —
  commande de quinze genres pour un revendeur de sonneries, chaque genre écouté
  puis reconstruit. Il tombe après le mix et avant l'EP : on apprend le
  vocabulaire une fois qu'on sait faire, juste avant d'avoir à être personnel.
- **Le retournement se montre, il ne se raconte pas.** Sol maintient qu'elle
  vend jusqu'au bout ; ce qui la fait changer d'avis est la salle qui chante par
  cœur un jingle de lessive refusé par l'agence qui l'avait commandé.
- **Le client a toujours tort sur les mots et raison sur la musique.** Le
  commercial ne sait pas dire « dancehall », mais il le fredonne juste.

**Écarts de portée assumés :** rien n'est codé, et `PlayerProgress.level` n'est
pas touché. Restent ouverts : le découpage en ~130 exercices avec leurs axes de
difficulté, et le contrôle de mix mesuré de l'acte 4 (seul mécanisme réellement
neuf).

### ✅ Mode carrière — la charpente en huit actes, actes 0 à 2 jouables (2026-08-23)

Arbitrage de Yann, en une phrase : *« on part sur le scénario pour le moment
pour développer le mode jeu »*. Ça tranche les deux premières des quatre
questions de la section ⏳ ci-dessus — l'histoire est le CONTENANT de la
campagne, et la fiction n'est pas minimale : c'est `HISTOIRE.md`, ses huit
actes, ses quatre personnages. Les questions 3 (composer ou reconstruire) et 4
(le public change-t-il le jugement) portent sur les actes 4 et 6, elles restent
ouvertes et ne bloquaient pas cette tranche.

**Fichiers touchés :** `src/model/carriere.ts` (neuf), `src/model/unlocks.ts`,
`src/stores/game.svelte.ts`, `src/stores/unlocks.svelte.ts`,
`src/ui/game/CarriereView.svelte` (neuf), `src/ui/game/GameView.svelte`,
`src/App.svelte`, `tests/carriere.test.ts` (neuf).

#### Ce que ça change, en une image

Le Mode jeu a désormais **deux écrans** et la carrière est celui d'entrée. Le
récit donne le *pourquoi*, les 41 niveaux donnent le *comment* et deviennent la
**salle de répétition**, atteignable d'un bouton depuis la carrière — « pas de
scénario qui enferme l'outil » (`HISTOIRE.md`).

#### L'entier unique, découpé en deux — et pas en trois

Le blocage identifié dans la proposition était que `PlayerProgress.level`
portait trois choses : ce que le joueur sait, ce qui lui est ouvert, où il en
est. La proposition suggérait un `Record<CompetenceId, 0|1|2|3>`. **Ce n'est pas
ce qui a été fait, et c'est délibéré** : deux axes suffisent, parce que le
récit sait déjà répondre à la question d'accès.

| Axe | Où il vit | Ce qu'il décide |
|---|---|---|
| **Récit** | `PlayerProgress.carriere = { acte, etape }` | ce qui est ouvert |
| **Réservoir** | `level` + `stars`, inchangés | ce qui est maîtrisé |

Un troisième axe « compétences » aurait été un modèle de plus à tenir d'accord
avec les deux autres, sans rien décider que ceux-là ne décident déjà. Il
reviendra le jour où un exercice devra *vérifier* une compétence plutôt que la
décerner.

#### Un acte CITE des niveaux, il n'en fabrique pas

`Etape` est soit un `recit` (quelques lignes courtes + l'appareil qui les
affiche), soit un `exercice` qui ne porte qu'un **`niveau` du réservoir**. Ça
rend le contenu bon marché à écrire, et surtout ça garantit qu'un niveau joué
dans la carrière est *exactement* le même qu'en répétition — pas une variante
qui dériverait de son original. Le mapping actuel :

| Acte | Compétence | Niveaux cités | Ouvre |
|---|---|---|---|
| 0 · Le café | ÉCOUTE | 39, 40, 41 (les trois verbes de paramètre) | — |
| 1 · Le rythme | RYTHME | 1, 2, 3, 7 | **Atelier** |
| 2 · Le groove | GROOVE | 4, 14, 15, 20, 23 | — |

⚠️ **Les pilotes 39-41 ne sont plus un bonus de fin de campagne, ils sont le
tout premier écran du jeu.** C'est le texte qui l'a décidé, pas moi :
« Elle te fait écouter deux sons. — Lequel est le plus grave ? » EST le verbe
`lequel`. Effet de bord heureux : les trois verbes que Yann n'avait pas encore
essayés sont maintenant les trois premiers exercices qu'on rencontre.

⚠️ **Une commande ne doit promettre que ce que le tirage tient.** Première
version de l'acte 0 : la commande disait « — Lequel est le plus grave ? » et
l'écran demandait « laquelle est la plus courte ? ». Les niveaux 39-41 tirent
leur bouton au hasard dans la famille Timbre : une consigne qui NOMME le
réglage ment une fois sur quatre. Trouvé à la capture d'écran, pas au test.

#### Deux curseurs, parce qu'un seul reverrouille l'Atelier

`progresCarriere` (persisté, ne recule jamais) et `acteActif`/`etapeActive`
(volatil, ce qu'on regarde). Sans le second, **relire l'acte 1 refermerait
l'Atelier que l'acte 1 vient d'ouvrir** : le curseur reculerait, et le verrou
lit le curseur. C'est le genre de régression qui ne se voit pas en écrivant le
code — `tests/carriere.test.ts` la verrouille par le seul scénario qui la
produit.

#### Le déblocage : le récit d'abord, les niveaux en plancher

`moduleUnlocked` gagne un `acte` et devient un OU. Le récit est la voie
principale (« ton morceau a besoin d'une basse, voilà le Synthé »), mais **seuls
les actes 0 à 2 ont leurs exercices écrits** : si l'acte était la seule voie, le
Synthé (acte 3), la Production (4) et le Mode Live (7) deviendraient
inatteignables du jour où la carrière arrive — régression pour tous ceux qui les
avaient ouverts, mur pour les autres. Les seuils de niveau restent donc un
plancher. Retirer ce second membre le jour où les huit actes sont écrits sera un
changement d'une ligne, et une décision, pas un nettoyage.

**Corollaire assumé : il n'y a PAS de migration depuis `level`.** La tentation
était d'y placer un vétéran à l'acte correspondant. Elle ne marche pas :
l'acte 0 cite 39-41, des bonus posés *après* la campagne d'origine, qu'un joueur
fini au niveau 34 n'a jamais joués. Aucune dérivation ne peut le déclarer
« acte 0 acquis » sans mentir sur ce qu'il a entendu. La carrière est du contenu
neuf : tout le monde la commence au début, et personne ne perd d'accès en
chemin.

#### L'écran, et la règle qui l'a dessiné

`CarriereView.svelte` applique littéralement « on montre les appareils, pas le
décor » : jamais un visage ni une pièce, **quatre surfaces** et pas une de plus
— l'afficheur LCD (les mots de Sol, et le compte à rebours `14 JUIN · J−151`
affiché en permanence), le répondeur, le fax, l'étiquette de cassette. Les huit
actes forment un **carnet** vert sur noir, lu comme une playlist. Un seul cadre
creusé pour les quatre appareils : la variante porte sur ce qui est ÉCRIT
dessus, pas sur une forme de plus.

Les actes 3 à 7 disent « À venir » et ne s'ouvrent pas : un acte qui s'ouvre sur
du vide se lit comme une panne.

**Vérifié :** `npm run check` 0 erreur · **133 tests** · les deux builds ·
parcours Playwright à 390×844 en `pointer: coarse` — les trois actes joués bout
à bout (37 clics), l'Atelier passe de verrouillé à ouvert **pendant** le
parcours à la fin de l'acte 1, 0 px de débordement horizontal sur les deux
écrans, 0 erreur console. Zones tactiles mesurées à `elementFromPoint` (le
pseudo-élément `.tap44` est invisible à `getBoundingClientRect`) : toutes ≥ 44 px
après deux correctifs — `.player` de `GameView` n'avait jamais eu son `tap44-y`
(24 px), et les lignes du carnet tombaient à 43 px avec un `padding` de 9.

**Écarts de portée assumés :**

- **Les actes 3 à 7 ne sont pas jouables.** Leur récit est écrit, leurs
  exercices non — et trois d'entre eux demandent du mécanisme neuf (le synthé
  pour l'acte 3, le contrôle de mix mesuré pour le 4, la composition libre
  notée sur le brief pour le 6). L'acte 5 « Les styles », lui, ne demande que du
  contenu : quinze presets à reconstruire, tout existe déjà. **C'est le prochain
  acte à écrire, et de loin le moins cher.**
- **Aucun système de compétences mesurées** — voir plus haut, deux axes
  suffisent tant qu'un acte décerne au lieu de vérifier.
- **La grille de déverrouillage contrôle par contrôle** (rafale niv. 11, swing
  14, ghost 20, fill 21, décalage 23) n'est toujours pas appliquée. Elle reste
  valable : elle porte sur les contrôles de l'Atelier, pas sur les modules.
- **B6 — la mise en page** : l'écran de carrière tient sur la hauteur d'un
  téléphone sans déborder, mais l'écran d'exercice garde son bas de page vide.
  Même chantier qu'avant, pas rouvert ici.

### ✅ Le prologue — « on comprend rien », et pourquoi (2026-08-23)

Première impression de Yann sur le Mode carrière livré une heure plus tôt :
*« 1ère impression : on comprend rien. »*

**La cause n'était ni l'interface ni les exercices.** Relu écran par écran comme
quelqu'un qui arrive dessus, le premier écran du jeu disait, mot pour mot :

> Le sous-traitant qui fabrique les sonneries arrête. Il a trouvé mieux. Il
> laisse un dossier et un mot de passe.

C'est-à-dire **la première péripétie d'une histoire dont la mise en place
n'avait jamais été montrée**. Le joueur ne pouvait pas savoir où il était, qui
il était, qui était Sol, ce qu'était Face B, ni ce qu'était le 14 juin.

⚠️ **Et tout ça était écrit.** `HISTOIRE.md` consacre **cent quarante lignes**
à la mise en place avant l'acte 0 — FACE B, « Ce qui fait vivre Face B »,
« Toi », « Le 14 juin ». Je n'en avais porté **aucune ligne** : j'avais lu le
document, donc je comprenais l'écran. Le joueur, non.

**La règle à ne pas repayer : ce qui n'a pas été porté n'existe pas.** Un récit
écrit dans un document et *cité* par le code n'est pas dans le jeu. Le lecteur
du document comprend ; le joueur juge sur ce qui s'affiche.

**Fichiers touchés :** `src/model/carriere.ts`, `src/ui/game/CarriereView.svelte`,
`src/ui/game/GameView.svelte`, `tests/carriere.test.ts`.

#### Ce qui change

1. **Un prologue de quatre écrans**, porté de `HISTOIRE.md` : le label, son
   gagne-pain, toi, l'échéance. Il vit dans les étapes de l'acte 0 plutôt que
   dans une structure à part — curseur, persistance et relecture marchent alors
   sans un seul cas particulier.
2. ⚠️ **Le compte à rebours n'apparaît qu'à l'écran qui l'explique.** `J−151`
   vers une date inconnue n'est pas une tension, c'est un nombre. Il se lève
   exactement sur l'écran « LE 14 JUIN », et un test lie les deux
   (`ETAPE_DU_COMPTE_A_REBOURS`) pour qu'ils ne se désynchronisent pas.
3. **Le carnet des huit actes et les boutons d'en-tête sortent du prologue.**
   Ils ajoutaient huit titres verrouillés et deux mots non expliqués
   (« salle de répétition ») à un écran qui n'avait encore rien situé. Le
   premier écran ne montre plus que ce qu'il peut expliquer : un appareil, un
   message, un bouton.
4. **L'écran de pseudo dit enfin ce qu'on va faire** — « apprendre à fabriquer
   des rythmes à l'oreille » — au lieu de « commencer la campagne ».
5. **« ✓ Vérifier » est descendu sous la question.** Sur les verbes de
   paramètre, le transport ne portait que lui : on lisait donc le bouton de
   validation AVANT la question à laquelle il répond.
6. **Une consigne annonçait « deux sons » quand l'écran en propose trois.**
   Corrigée, et un test interdit désormais à toute consigne d'annoncer un
   nombre de versions — les niveaux 39-41 le tirent.

**Vérifié :** `check` 0 erreur · **137 tests** · les deux builds · parcours
Playwright à 390×844 : les onze étapes de l'acte 0 lues d'affilée, le décompte
apparaît bien à l'écran 4 et pas avant, le carnet à l'écran 5, 0 px de
débordement, 0 erreur console.

**Reste à faire, non traité ici :** l'acte 0 fait maintenant onze étapes, dont
quatre de lecture d'affilée. Si c'est trop long avant le premier son, la sortie
est d'intercaler un exercice plus tôt, pas de raccourcir le prologue — c'est lui
qui rendait le reste lisible.

### ✅ Sol a un écran — et un test a fait tomber un vrai défaut de jeu (2026-08-24)

Deuxième retour de Yann, en cinq mots : *« on ne présente pas Sol ? »*

**Non.** Elle porte presque toutes les répliques du jeu et n'avait qu'une
demi-phrase — « Sol dirige le label » — glissée dans l'écran qui parle du
JOUEUR. Et cette demi-phrase, je l'avais ajoutée moi-même : `HISTOIRE.md` ne la
présente pas davantage, parce qu'un lecteur arrivé là a lu les trente lignes
précédentes. **Même défaut que le prologue manquant, un cran plus fin** —
cette fois ce n'était pas le décor qui manquait, c'était le personnage.

**Fichiers touchés :** `src/model/carriere.ts`, `src/model/parametres.ts`,
`src/stores/game.svelte.ts`, `tests/carriere.test.ts`,
`tests/parametres.test.ts`.

#### L'écran de Sol, et sa place

Elle se présente par ce qu'elle FAIT — les autocollants
« LE PIRATAGE TUE LA MUSIQUE » du syndicat, dont elle se sert pour caler la
fenêtre ; la sonnerie de grenouille qui s'est mieux vendue que tout le
catalogue, et dont elle refuse de parler. Matière prise dans `HISTOIRE.md`, où
elle dormait.

⚠️ **Et elle passe AVANT l'écran des sonneries, pas après** — parce que cet
écran-là porte déjà une de ses répliques (« — Sur les trois euros, il nous en
revient onze centimes »). Placée après, elle parlait avant d'exister. **C'est le
test qui l'a trouvé**, pas la relecture : écrit pour vérifier qu'elle est
présentée avant de parler, il a échoué au premier passage et désigné l'écran
fautif.

#### Trois lignes se repliaient, et ça se mesure

Le récit est écrit en **une idée par ligne** ; une ligne qui se replie casse ce
rythme et se lit comme du texte courant. Invisible à la lecture, visible en
mesurant : un script compare la hauteur de chaque `<p class="ligne">` à celle
d'une ligne seule. **43 lignes mesurées, 3 se repliaient** — corrigées en
COUPANT plutôt qu'en réécrivant, le texte étant de Yann.

#### ⚠️ Le test instable qui cachait un défaut de jeu

En vérifiant, `npm test` a échoué une fois, puis passé la fois suivante.
Coupable : `« régler » ne place pas le curseur déjà sur la cible`
(`tests/parametres.test.ts`, livré avec les verbes de paramètre) — **il échouait
une fois sur quatre environ**, y compris sur `main`, où un échec veut dire build
non produit et **déploiement sauté**.

**Ce n'était pas un test à recalibrer, c'était un bug.** « Régler » tirait sa
cible par `tirerVersions(p, 2).slice(0, 1)` : deux valeurs bien séparées **l'une
de l'autre**, mais rien ne les séparait du MILIEU de l'étendue, là où le curseur
du joueur commence. Le niveau était donc parfois **déjà gagné sans toucher au
curseur**. Le commentaire du store disait pourtant « sinon il serait déjà
juste » : l'intention était là, la garantie non.

Corrigé par une fonction pure, `tirerCible(p, depart)`, qui applique le principe
déjà posé pour `tirerVersions` : on tire la **distance** au départ dans
`[ecartMini, étendue/2]` et le **côté**, au lieu de tirer une valeur et
d'espérer. Le catalogue le permet toujours — tous les paramètres ont
`étendue ≥ 2,2 × ecartMini` et `ecartMini > 2 × tolerance`.

Et le test devient ce que `CLAUDE.md` exige : **une assertion par tirage**
(« la cible n'est JAMAIS dans la tolérance du départ ») au lieu d'une moyenne
posée à la frontière. Plus un test pur de `tirerCible` sur trois départs — le
milieu et les deux bords, là où un seul côté est disponible.

**Vérifié :** `check` 0 erreur · **140 tests**, la suite passée **dix fois de
suite** sans un échec (c'était le point) · les deux builds · parcours Playwright
à 390×844 : les douze étapes de l'acte 0, 43 lignes de récit mesurées, **0 repli**,
0 erreur console.

**Écart de portée assumé :** le prologue passe à cinq écrans. La question posée
à Yann — quatre lectures avant le premier son, est-ce trop ? — devient donc
cinq. La réponse reste la même si elle est oui : intercaler un exercice plus
tôt, pas raccourcir le prologue.

### ✅ Solange, et le prologue entrelacé au jeu (2026-08-24)

Deux retours de Yann, dans le même message : *« sol, il faut rappeler son nom
bien franchouillard ! »* et *« ça fait en effet beaucoup de texte avant le 1er
jeu. »*

**Fichiers touchés :** `src/model/carriere.ts`, `src/ui/game/GameView.svelte`,
`tests/carriere.test.ts`.

#### Le nom

⚠️ **`HISTOIRE.md` ne donne aucun nom complet à Sol** — trente-six occurrences,
toutes « Sol ». **Solange est donc une proposition, pas une reprise**, retenue
parce que c'est le franchouillard par excellence et le diminutif dont « Sol »
sort naturellement. Elle apparaît à **un seul endroit**, et un test dit lequel :
un mot à changer si un autre est préféré.

> Sur les statuts, c'est Solange.
> Sur les pochettes, ç'a toujours été Sol.

#### Le texte avant le premier jeu : sept écrans → **cinq**

⚠️ **La sortie n'était pas de raccourcir le prologue** — c'est lui qui rend le
reste lisible, et le couper aurait ramené le « on comprend rien ». C'est de
l'**entrelacer** : quatre écrans posent le strict nécessaire, puis on joue, et
ce qui reste d'exposition revient ENTRE les exercices.

| Avant | Après |
|---|---|
| Face B · Sol · les sonneries · toi · le 14 juin · le répondeur · Sol | Face B · Sol · le 14 juin · le répondeur |
| **puis** exercice (8e écran) | **puis** exercice (5e écran) |
| | l'économie des sonneries · exercice · exercice · … |

Trois choses ont permis la coupe, et aucune n'est une perte :

1. **L'écran « TOI » disparaît en tant qu'écran** — « tu es stagiaire, tu fais
   le café » tient en deux lignes et prépare directement la réplique qui ouvre
   le premier exercice. Il rejoint l'écran du répondeur.
2. **La réplique de bascule vit dans la `commande` de l'exercice**
   (« — Tu fais quoi exactement ici ? — Le café. — Je sais. Écoute ça. ») au
   lieu d'un écran à elle : un écran pour quatre lignes de dialogue, c'était une
   lecture de plus avant le premier son.
3. **L'économie des sonneries passe APRÈS le premier exercice**, et elle y
   gagne : on explique les onze centimes à quelqu'un qui vient d'écouter des
   sons. Une seule ligne reste devant (« le label vit des sonneries »), parce
   que le message du répondeur parle du sous-traitant « qui fabrique les
   sonneries » — l'incident ne peut pas tomber dans un métier qu'on n'a pas
   nommé.

**Deux tests verrouillent le rythme**, parce qu'une propriété de rythme ne se
voit pas en relisant un fichier : *jamais plus de cinq écrans avant le premier
exercice*, et *jamais deux lectures empilées entre deux exercices*.

#### Au passage : une faute d'accord sur les sept boutons

« Trois versions du même son. Laquelle **est** *le plus rond* ? » — les libellés
du catalogue portent un article masculin (« le plus sec », « le plus sourd »)
tandis que le sujet, *une version*, est féminin. **« Laquelle sonne le plus
rond »** prend l'adjectif en adverbe, accorde tout seul sur les sept entrées, et
dit mieux ce qu'on écoute.

**Vérifié :** `check` 0 erreur · **142 tests**, la suite passée cinq fois de
suite · les deux builds · parcours Playwright à 390×844 : le premier exercice au
**5e écran**, 27 lignes de récit mesurées et **0 repli**, 0 px de débordement,
0 erreur console.

### ✅ Salle de répétition, no spoil, et un kick inaudible (2026-08-24)

Cinq retours de Yann après essai. Trois étaient des bugs, deux des choix de
mise en scène — et l'un des bugs ne se voyait qu'à la mesure.

**Fichiers touchés :** `src/model/carriere.ts`, `src/model/parametres.ts`,
`src/model/presets/levels.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `src/ui/game/CarriereView.svelte`,
`tests/carriere.test.ts`, `tests/parametres.test.ts`.

#### 1. « Il faut pouvoir refaire les niveaux » — la carte en verrouillait 40 sur 41

Mesuré : après avoir joué **tout l'acte 0**, la carte affichait **40 niveaux
verrouillés sur 41**, dont les trois qu'on venait de jouer. Deux causes
cumulées, toutes deux dans `isUnlocked(id) = id <= PlayerProgress.level` :

- l'acte 0 cite les niveaux **39-41**, qui portent des numéros de FIN de liste.
  Le seuil, hérité de la campagne linéaire, les gardait fermés ;
- un exercice **abandonné** n'avance pas `level` du tout — il ne s'ouvrait donc
  jamais, alors que c'est précisément celui qu'on veut refaire.

La salle de répétition liste désormais `niveauxRencontres(acte, etape)` : les
niveaux **rencontrés dans le récit**, tous rejouables. Rencontré, pas réussi —
les étoiles restent la mesure de la réussite.

#### 2 et 3. No spoil

- **La carte** ne montre plus que ces niveaux-là. Plus de cadenas, plus de
  numéros d'actes non écrits.
- **Le carnet** listait les HUIT actes, titres et résumés compris — « Kelvin a
  seize ans, il vient le mardi », « La salle chante un jingle de lessive ». Le
  récit se racontait lui-même cinq actes à l'avance. Il ne montre plus que les
  actes **atteints** ; ce qui suit n'est pas annoncé, pas même son titre.
- **Le titre de fenêtre** hors carrière perd son « / 41 » : un total qui
  comptait des niveaux que le joueur n'a pas vus.

#### 4. ⚠️ « On n'arrive pas à dire si c'est plus aigu ou plus grave »

**Le kick n'était pas audible, et ça se mesure.** `playKick` balaie de
`140 × mult` à `Math.max(20, 38 × mult)` : ce plancher de 20 Hz écrase toute la
moitié basse du curseur. Rendu dans un `OfflineAudioContext` réel, en RMS
au-dessus de 200 Hz — à peu près ce qu'un haut-parleur de téléphone restitue :

| pitch | −24 | −17 | −10 | 0 | +11 | +24 |
|---|---|---|---|---|---|---|
| attaque | 35 Hz | 52 Hz | 79 Hz | 140 Hz | 264 Hz | 560 Hz |
| queue | **20** | **20** | 21 | 38 | 72 | 152 |
| RMS > 200 Hz | 0,011 | 0,015 | 0,018 | 0,027 | 0,064 | 0,064 |

`tirerVersions(pitch, 3)` pouvait sortir exactement **−24 / −17 / −10** : trois
kicks indiscernables, et la question était alors un tirage au sort.

⚠️ **Corrigé dans le JEU, pas dans le moteur.** Le plancher de 20 Hz vient de
l'original et protège l'enveloppe ; c'est au jeu de ne pas poser une question
dont la réponse est inaudible. D'où `plageParLigne` sur `DescripteurParam` :
`lignes` dit OÙ un bouton s'entend, `plageParLigne` dit JUSQU'OÙ. Le pitch du
kick est borné à `[0, 24]` — 24 demi-tons, largement de quoi poser trois
versions à 7 d'écart, ce qu'un test vérifie pour chaque ligne de chaque bouton.

`pourLigne(p, ligne)` renvoie le descripteur resserré, et **tout** en découle :
les versions tirées, la cible de « régler », et le curseur affiché. Un curseur
plus large que la plage où le son bouge inviterait à chercher là où il n'y a
rien.

#### 5. Des boutons auxquels on n'a pas encore accès

À l'acte 0 l'Atelier est fermé : on demandait de **nommer** des réglages que le
joueur n'a jamais vus. Deux réponses, les deux nécessaires :

- `GameLevel.paramsAutorises` restreint le tirage à l'intérieur d'une famille.
  Les niveaux 39-41 sont limités à **pitch, decay, attack** — `tone` en sort,
  c'est le mot le plus opaque de la famille, et sur snare comme sur hat il
  déplace un filtre plutôt qu'il ne change une note.
- **Ce qu'on va écouter est nommé AVANT qu'on le demande.** La ligne « la
  hauteur, la durée, l'attaque » vivait *après* les trois exercices ; elle passe
  sur l'écran du répondeur, juste avant le premier.

**Vérifié :** `check` 0 erreur · **152 tests**, la suite passée **cinq fois de
suite** · les deux builds · parcours Playwright à 390×844 : après l'acte 0 la
salle de répétition affiche **3 exercices, 0 verrouillé**, un clic recharge bien
le niveau ; le carnet n'affiche que les actes atteints ; 28 lignes de récit
mesurées, **0 repli** ; 0 erreur console.

**Écart de portée assumé :** `PlayerProgress.level` continue d'être écrit par
`saveProgress` et sert encore de plancher aux verrous de modules
(`moduleUnlocked`). Il n'ouvre simplement plus la salle de répétition. Le jour
où les huit actes sont écrits, ce plancher disparaît et `level` avec lui.

### ✅ Le clavier du pad montre ses trois octaves (2026-08-24)

Retour de Yann : *« il faut montrer les 3 rangées de notes dans le clavier de
sélection des notes. »*

**Fichier touché :** `src/ui/sequencer/NotePad.svelte` (le seul clavier de
notes de l'appli — le pad XY du Mode Live découpe déjà son axe Y en trois
octaves, le Mode jeu n'a pas de clavier).

**Ce qui n'allait pas.** L'octave fait PARTIE de la note (`SynthNote =
{ degree, octave }`), mais le clavier n'en montrait qu'une : sept touches, et
un sélecteur −1/0/+1 rangé sous la barre. Ce sélecteur en faisait un **mode** —
on posait une note à l'octave où on avait laissé le bouton, et **rien dans la
touche ne disait laquelle**. Poser une octave grave puis une centrale coûtait
deux gestes de plus que les notes elles-mêmes.

**Ce qui a été fait.** Les trois octaves du modèle sont les trois rangées du
clavier, aiguë en haut (même sens que le pad XY du Mode Live). Une note reste
**un appui**, mais l'appui dit maintenant aussi l'octave, et le sélecteur
disparaît — il n'aurait plus rien à régler.

- Chaque touche porte, sous le nom, **l'étiquette exacte de la case qu'elle va
  écrire** : « 5 », « 5▴ », « 5▾ ». La marque est celle que la grille affiche
  déjà (`SynthRowView.octaveMark`) — le clavier montre ce qu'il écrit, vérifié
  bout en bout au navigateur (trois appuis sur trois rangées → `5▴ 5 2▾` dans
  la grille).
- **Le silence garde une seule touche**, en 8e colonne sur les trois rangées
  (`grid-row: 1 / -1`) : effacer un pas ne dépend pas de l'octave, et la cible
  reste la plus grande du pad. Placement explicite (`grid-column` /
  `grid-row` sur chaque touche) plutôt qu'auto : sinon la première rangée
  déborde dans la case que le silence laisse libre.
- Touches à **44px** de haut et non 48 : la hauteur totale est désormais
  triple, et 44 est la cible tactile de référence du projet (`.tap44`), donc
  le plancher — pas un rognage.

⚠️ **`color-mix()` sur `--xp-btn-face` détruit le biseau.** Pour distinguer les
rangées au premier coup d'œil, la première version teintait la face d'un cran
avec `color-mix(in srgb, var(--xp-btn-face) 88%, #000)`. Or `--xp-btn-face`
est un **dégradé** — le biseau lui-même — et `color-mix` n'accepte que des
couleurs : la règle tombait invalide, la touche perdait son relief et
s'aplatissait sur la face du panneau. Invisible en lisant le CSS, flagrant sur
la capture : **seule la rangée du milieu**, la seule sans teinte, avait encore
son biseau. Corrigé par un **voile superposé** (`background-image:
linear-gradient(...), var(--xp-btn-face)`), qui garde le dégradé dessous. Et un
seul cran de clarté, pas une couleur : la teinte est déjà prise par « dans
l'accord en cours », qui reste prioritaire sur les trois rangées.

**Vérifié :** `check` 0 erreur (le sélecteur `.mini.on` devenu mort a été
retiré) · 142 tests · les deux builds · Playwright à 1280, 390, 360 et 320px :
22 touches sur 3 rangées de 44px, silence à 138-140px de haut, **0 px de
débordement** de la grille comme de chaque libellé (mesuré span par span, y
compris « vide » à 23px dans une touche de 27px à 320px).

### ✅ Revenir sur un texte précédent (2026-08-24)

Retour de Yann : *« il faut pouvoir revenir sur un texte précédent. »* Le récit
n'avait qu'un sens de marche — un « Suite ▸ » et rien d'autre. Un écran passé
trop vite était perdu, et le seul moyen de le relire était de recommencer
l'acte entier depuis le carnet.

**Fichiers touchés :** `src/stores/game.svelte.ts`,
`src/ui/game/CarriereView.svelte`, `tests/carriere.test.ts`.

**Le double curseur l'offrait déjà — il ne restait qu'à le brancher.**
`acteActif`/`etapeActive` sont volatils ; seul `progresCarriere` est enregistré,
et il ne recule jamais. Reculer ne coûte donc **aucune progression** et ne
referme **aucun module** : c'est exactement l'invariant posé au moment de la
relecture d'un acte, réutilisé tel quel.

- `reculerCarriere()` recule d'un écran, **frontières d'actes comprises** : au
  début d'un acte, on revient à la dernière étape du précédent, s'il est
  atteint. `peutReculer` grise le bouton au tout premier écran.
- **Une étape d'exercice revisitée peut être re-dépassée sans être rejouée**
  (`etapeDejaFranchie`). Sans ça, reculer d'un cran depuis un récit obligerait à
  refaire l'exercice d'avant pour repartir — le retour arrière aurait coûté un
  aller-retour.

**Vérifié :** `check` 0 erreur · **156 tests**, la suite passée trois fois de
suite · les deux builds · parcours Playwright à 390×844 : « Retour » désactivé
au premier écran, deux retours ramènent bien de l'écran 4 à l'écran 2, la marche
avant repart de là, les deux boutons mesurent 44 px, 0 px de débordement, 0
erreur console.

**Note de rebase :** cette tranche a été rebasée sur `main` après l'arrivée de
la PR #104 (« Pad de notes »). Seul `PLAN.md` entrait en conflit — deux sections
ajoutées au même endroit — résolu en gardant les deux.

### ✅ Acte 3, « La mélodie » — le premier verbe qui sort de la batterie (2026-08-24)

Deux consignes de Yann : *« Solange : ok, ajoute un nom de famille »* et
*« poursuis sur la suite chronologique »* — donc l'acte 3, et pas l'acte 5.

**Fichiers touchés :** `src/model/exercises.ts`, `src/model/presets/levels.ts`,
`src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/carriere.test.ts`,
`tests/exercises.test.ts`.

**Solange Vasseur.** Toujours une proposition, toujours à un seul endroit.

#### Ce que l'acte exige, et pourquoi les boutons ne suffisaient pas

`HISTOIRE.md` est explicite : *« Tu travailles sur : les hauteurs ; les gammes ;
la basse ; les motifs ; la répétition. »* Le raccourci envisagé dans la
cartographie — ouvrir les trois verbes de PARAMÈTRE au synthé — aurait enseigné
des boutons de filtre, pas une mélodie. Il est écarté.

#### Le verbe `melodie`, et la traversée à coût réduit

Un huitième verbe : une ligne de **basse monophonique**, une note par pas, à
reposer degré par degré sur un rouleau (hauteurs en ordonnée, pas en abscisse).

⚠️ **Le coût annoncé par la cartographie a été évité, exactement là où elle le
disait.** Étendre `GameDrumRowName` aurait touché 46 endroits *plus* les formes
nommées à la main (`LevelDensity`, `rowsActive`, `SubdivSpec`, et les 41 niveaux
déjà écrits). Trois décisions l'ont contourné :

1. **Une case porte un NOMBRE.** `comparerGrilles` a été *généralisé*
   (`Grille<N>` sur `number[]`) au lieu d'être dupliqué : il ne faisait que des
   `===`, il n'a jamais eu besoin de savoir si le nombre était un coup ou un
   degré. La règle du projet — « ne pas écrire un second comparateur » — tient
   ici plus qu'ailleurs.
2. **La mélodie a son propre état** (`melodieCible`, `melodieGuess`,
   `melodieLocked`), pas une `Grid` de batterie élargie. Ni la même forme (une
   ligne), ni la même sémantique (une hauteur).
3. **Une seule octave, jamais d'accord.** Deux hauteurs à l'octave seraient « la
   même note » à l'oreille et deux réponses différentes à l'écran.

#### Trois choix de conception, pas d'arithmétique

- **La tonique tombe toujours sur le premier pas.** Sans point de départ, aucun
  degré ne se situe à l'oreille : on entendrait des intervalles sans savoir par
  rapport à quoi.
- **Le motif** (niveau 43) recopie la première moitié dans la seconde : la
  phrase à trouver est deux fois plus courte, et ce qu'on apprend est qu'une
  mélodie REVIENT.
- **La difficulté est le degré maximum**, pas le nombre de notes : 5 degrés
  (42, 43) puis les 7 de la gamme (44).

#### Ce que l'acte ouvre

Le **Synthé**, une fois l'acte 3 derrière soi — parce que le récit en a eu
besoin, pas parce qu'un compteur a atteint un seuil.

#### Au passage

`✓ Vérifier` s'affichait **au-dessus** du rouleau : le transport est en haut de
l'écran. Même défaut que sur les verbes de paramètre, même correction — le
bouton descend sous ce qu'il valide. Et « 1/3 notes posée » accordait sur le
mauvais nom.

**Vérifié :** `check` 0 erreur · **162 tests**, la suite passée trois fois de
suite · les deux builds · parcours Playwright à 390×844 jusqu'à l'acte 3 :
rouleau de 5 × 8 cases de 39 px, une note s'allume au clic, 0 px de
débordement, 0 erreur console.

**Écarts de portée assumés :**

- **Le Synthé s'ouvre, mais le Mode jeu n'y touche toujours pas.** Les exercices
  de l'acte 3 jouent une ligne de basse, ils ne font pas manipuler les boutons
  du synthé. C'est cohérent avec le récit (l'acte enseigne les hauteurs) mais ça
  laisse la famille de paramètres du synthé pour plus tard.
- **La gamme est celle par défaut** (do majeur). L'acte parle des gammes ; en
  faire varier une demanderait de l'annoncer à l'écran, sinon le joueur
  chercherait des degrés dans une échelle qu'il ne sait pas avoir changé.
- **Les actes 4 à 7 restent « à venir ».**

### ✅ Pad de la Nappe, et 12 ms rendues sur chaque frappe (2026-08-24)

Deux demandes de Yann dans le même message : *« il faut un pad pour les nappes
aussi »* et *« il y a un peu trop de délai aux écouteurs bluetooth, il faudrait
que ce soit un peu plus réactif. idée si ça nécessite une baisse de qualité de
l'audio : baisser la qualité de l'audio quand on enregistre au clavier et
remonter la qualité ensuite. »*

**Fichiers touchés :** `src/ui/sequencer/NotePad.svelte`,
`src/ui/sequencer/SynthRowView.svelte`, `src/ui/atelier/SynthModule.svelte`,
`src/ui/atelier/AtelierView.svelte`, `src/ui/xp/CalibrageLatence.svelte`
(nouveau), `src/ui/game/GameView.svelte`, `src/engine/AudioEngine.ts`,
`src/engine/depart.ts` (nouveau), `src/engine/voices/drums.ts`,
`src/engine/voices/synth.ts`, `tests/depart.test.ts` (nouveau),
`tests/latence-audio.test.ts`.

#### 1. Le pad de la Nappe — dans le MÊME composant

Ce que la Nappe pose n'est pas un degré mais un **index d'accord** (`-1` pour le
silence) : le clavier change entièrement — quatre à sept touches selon
`chordCount`, une seule rangée, pas d'octave. Tout ce qui l'entoure est
identique au millimètre : curseur pas-à-pas, enregistrement en direct,
quantification au pas le plus proche avec la latence mesurée, silence qui efface
et avance. **Un second composant aurait dupliqué exactement la partie
difficile** — celle qui a déjà coûté deux corrections de câblage (`synthStepAt`,
`latence.ms`) — pour ne varier que la partie facile. Même arbitrage que
`comparerGrilles(colonnes)` côté Mode jeu.

- Chaque touche porte le **nom réel** de la fondamentale en gros (« Do »,
  « Fa ») et le **chiffrage de la grille** en petit (« I », « IV », « vi ») :
  le clavier montre ce qu'il écrit, comme les trois rangées de degrés.
- La touche de l'accord **déjà posé sur le pas visé** est teintée : on regarde
  le clavier au moment d'appuyer, pas la grille — sans ce repère on ne sait pas
  si on pose ou si on remplace.
- Le silence écrit **-1 et non `null`** : c'est ce que dit le format v2 et ce
  qu'écrit déjà `cycleCell`. `null` marcherait à la lecture (le scheduler teste
  `>= 0`) mais ferait deux représentations du même silence dans les fichiers.
- `playChordPreview(idx)` dans le moteur, à côté de `playDegreePreview` :
  `previewSynth('pad')` ne sait jouer que l'accord 0 (c'est un test de TIMBRE).
  Les fréquences passent par `chordFreqs`, donc par le même ancrage de -12
  demi-tons que le scheduler — sinon le pad sonnerait une octave au-dessus de
  ce que la grille jouera.

#### 2. Réactivité : ce qui était possible, et ce qui ne l'est pas

⚠️ **La proposition de troquer de la qualité contre de la latence n'achète
rien, et c'est déjà documenté dans le code.** Le bouton qu'elle vise est le
tampon de sortie : `latencyHint: 0.001` donne 128 échantillons et 8 ms au lieu
de 32 — il a été essayé en production le 2026-08-21 et le verdict est dans
`AudioEngine.ts` : « ça marche très bien mais le son est devenu moche ». Et
surtout, **ce n'est pas là qu'est le délai du Bluetooth** : un casque A2DP met
100 à 200 ms à jouer ce qu'on lui envoie, dans son propre tampon, hors de portée
du navigateur. Baisser la qualité de notre côté ne touche pas ce tampon-là.

**Ce qui a été fait, et qui vaut pour tout le monde : `src/engine/depart.ts`.**
Toutes les voix ouvrent sur `setValueAtTime(0.0001, time)` puis une rampe de
4 ms. Si `time` est déjà passé, Web Audio applique les deux d'un coup : la rampe
est sautée, le gain saute — **un clic à chaque note**. C'est la régression du
2026-08-21, et l'`AVANCE_DECLENCHEMENT` de 20 ms n'était qu'une MARGE pour la
rendre rare. `departSur(currentTime, time)` traite la cause : une voix dont
l'instant est passé repart de maintenant, avec son attaque entière. C'était
explicitement le chantier annoncé dans le commentaire de la constante (« rendre
les enveloppes robustes à un démarrage tardif, pas raccourcir cette
constante ») — il est fait, donc l'avance descend à **8 ms : 12 ms rendues sur
chaque frappe**, sans rien devoir à la chance.

⚠️ **`AVANCE_DECLENCHEMENT` ne servait QU'aux frappes** — vérifié avant de la
toucher : le séquenceur programme ses pas depuis l'horloge audio avec 250 ms de
lookahead et ne la lit jamais. D'où une seule constante corrigée, pas une
seconde ajoutée à côté.

`tests/depart.test.ts` verrouille l'invariant sur les VOIX, pas sur le chiffre :
un contexte factice (Proxy) collecte tous les instants passés à Web Audio, et
aucun n'est antérieur à `currentTime` — sur les sept voix de batterie comme sur
note/basse/mélodie/accord. **Vérifié en sabotant `departSur` : trois tests
tombent.** `latence-audio.test.ts` est réécrit en conséquence — il verrouillait
l'avance comme protection de l'attaque, il verrouille maintenant qu'elle ne
REDEVIENNE pas une marge (≤ 10 ms), et cite la borne qui la remplace.

#### 3. Le calibrage sort du Mode jeu

Ce qui se sent vraiment en Bluetooth n'est pas le déclenchement — on ne peut pas
jouer un son avant la frappe, seulement réduire — mais le **placement** de ce
qu'on enregistre : on joue en place avec ce qu'on entend, et les notes tombent
un pas plus loin. Ça, le calibrage le corrige entièrement… sauf qu'il ne vivait
que dans `GameView`, alors que `ui/latence.svelte.ts` est une propriété de
l'APPAREIL, partagée par tous les écrans qui datent une frappe.

Extrait dans `ui/xp/CalibrageLatence.svelte` (métronome continu, frappes,
médiane additive) et ouvert **depuis le pad d'écriture**, là où le problème se
sent — le bouton affiche le réglage en place (`🎚 +34`). Une seule mesure
appelée de deux endroits : deux mesures qui doivent rester d'accord finissent
toujours par ne plus l'être, et celle-ci a déjà coûté une correction de signe et
une refonte du métronome.

⚠️ **Deux auditeurs pour une même barre d'espace.** Le panneau écoute Espace
pour frapper ; l'écran qui l'héberge aussi (frappe de jeu dans le Mode jeu,
lancement de la lecture dans l'Atelier). Sans garde, un appui faisait les deux —
on calibrerait le retard de l'appareil par-dessus un morceau démarré sans le
vouloir. Les deux écrans rendent la main au panneau tant qu'il est ouvert
(Échap ferme, dans l'Atelier). Mesuré au navigateur : un appui = **une** frappe,
et la lecture reste à l'arrêt.

⚠️ **`stop()` tout court passe le typecheck et n'est pas ce qu'on croit** :
c'est `window.stop()`, qui interrompt le chargement de la page. Le transport de
l'Atelier est `togglePlay` — corrigé avant que ça n'aille en ligne.

**Vérifié :** `check` 0 erreur · **165 tests** (8 nouveaux) · les deux builds ·
Playwright à 1280/390/320 px : pad de la Nappe (4 accords + silence, 0 px de
débordement, écriture `V` / `I` / vide dans la grille), calibrage ouvert depuis
l'Atelier (métronome lancé, frappes comptées, Échap), et **non-régression du
calibrage du Mode jeu** au niveau 37 (métronome, 3 clics + Espace = 4 frappes,
retour au pad de jeu). 0 erreur console.
### ✅ Actes 0, 1 et 2 refondus sur trois retours de jeu (2026-08-24)

Trois commentaires de Yann après avoir joué les trois premiers actes, et ils
disent tous la même chose sous trois formes : **un exercice n'enseigne que ce
que l'écran a déjà expliqué.**

> *acte 0 : je ne sais même pas expliquer ce que c'est decay, pourquoi c'est
> dès le début ce concept ?? l'acte 0, ça va pas, il faut proposer d'autres
> niveaux*
> *acte 1 : niveau 1 à supprimer, on peut passer au niveau 2 directement.*
> *acte 2 : pour le groove, on ne comprend pas pourquoi il y a les rafales et
> les charleys ouverts, rim shot, personne n'explique, ce n'est pas lié au
> groove. le groove, ce sont des paramètres qu'on doit pouvoir régler. Il faut
> compléter le niveau 1 avec les rafales & rim shots éventuellement, et sortir
> une vraie sonnerie de téléphone avec. ce qui peut être drôle, c'est de
> l'exporter et de proposer d'en faire la sonnerie de son téléphone/réveil
> matin.*

**Fichiers touchés :** `src/model/carriere.ts`, `src/model/parametres.ts`,
`src/model/presets/levels.ts`, `src/model/exercises.ts`,
`src/stores/game.svelte.ts`, `src/ui/game/CarriereView.svelte`,
`src/ui/game/GameView.svelte`, `tests/carriere.test.ts`,
`tests/parametres.test.ts`, `tests/exercises.test.ts`.

#### Acte 0 — les quatre mots de l'écoute, et rien d'autre

Le défaut n'était pas le mot *decay* : c'était le VERBE. L'acte citait les
niveaux 39-41, c'est-à-dire `lequel`, **`nommer` et `regler`** — deux verbes de
VOCABULAIRE, dans l'acte où l'Atelier est fermé. On demandait de mettre un nom
sur un curseur jamais vu, et de viser une valeur sur une échelle jamais
montrée. Aucun texte ne pouvait rattraper ça : le mot n'existe nulle part dans
le jeu à ce moment-là.

`HISTOIRE.md` donnait déjà la réponse, mot pour mot : *« Tu travailles sur : la
hauteur ; la durée ; l'intensité ; le silence. »* Quatre niveaux neufs, un par
mot, tous en `lequel` sauf le dernier :

| Niveau | Verbe | Bouton | Ce qui s'entend |
|---|---|---|---|
| 49 · La hauteur | `lequel` | `pitch` | plus aigu / plus grave |
| 50 · La durée | `lequel` | `decay` | traîne / s'arrête net |
| 51 · L'intensité | `lequel` | `volume` (neuf au catalogue) | plus fort / plus doux |
| 52 · Le silence | `silence` (verbe neuf) | — | le coup qui manque |

`lequel` parle en PROPRIÉTÉS et jamais en étiquettes : « laquelle sonne la plus
grave ? » ne demande pas de savoir qu'un bouton s'appelle Pitch. `nommer` et
`regler` déménagent à l'acte 2, où les mots sont enfin sur des boutons
rencontrés. Un test l'interdit désormais : aucun niveau de l'acte 0 ne peut
employer un verbe de vocabulaire.

**Le verbe `silence`** est le seul dont la bonne réponse est ce qu'on n'entend
pas. Une pulsation régulière sur le hat, un pas creusé, huit boutons. Deux
pièges payés d'avance et verrouillés par test : le trou n'est **jamais sur le
premier pas** (sans départ entendu, il n'y a rien à manquer) et le kick ne tient
que ce premier temps — posé sur le trou, il boucherait exactement ce qu'on
demande d'entendre. Et l'écran n'offre pas « écouter ma version » : on ne pose
rien, on désigne. Un bouton qui ne joue que du vide se lit comme une panne.

**`volume` entre au catalogue** avec une `plageJeu: [30, 100]` : tiré près de
zéro, la version à comparer est un silence, et « laquelle est la plus forte ? »
se répond sans écouter — même famille de défaut que le kick inaudible de la
veille.

#### Acte 1 — la grille, ses deux gestes, et on repart avec l'objet

- **Le niveau 1 saute** (Yann). Il ne faisait poser que des kicks sur une grille
  dont les deux autres lignes étaient explicitement vides : un écran sans rien à
  arbitrer. Il reste au réservoir, la carrière ne le cite plus. L'acte part
  donc du 2.
- **Les variantes et les rafales déménagent ici**, depuis l'acte 2 : ce sont
  deux gestes de GRILLE — un second clic, un appui long — donc deux gestes de
  l'acte qui enseigne la grille. Niveaux 5 (variante unique) et 8 (rafale
  unique), et **quelqu'un les explique** : Sol les fait à l'écran, avant qu'on
  les demande. Un test tient l'ordre (l'écran qui dit « rim shot » précède
  l'exercice qui en demande un).
- **L'acte ouvrait sur deux écrans de lecture** — le brief, puis « Sol
  t'apprend la grille », quatre mots sur un afficheur. Les trois mots tiennent
  dans le brief, où ils sont en plus motivés. Même règle que l'entrelacement du
  prologue.
- **La LIVRAISON** (`EtapeLivraison`, un troisième `kind` d'étape) clôt l'acte :
  *« sortir une vraie sonnerie de téléphone avec […] l'exporter et en faire la
  sonnerie de son téléphone/réveil matin »*. Elle ouvre l'Atelier sur
  `toAtelierState()` — le rythme qu'on vient de réussir, pas une grille vide —
  et l'export MP3, qui existe depuis toujours, trouve enfin son moment.

⚠️ **L'ordre dans `livrer()` est le sujet, pas un détail.** `moduleUnlocked`
lit l'acte ATTEINT (`acte > 1` pour l'Atelier). Partir de la dernière étape de
l'acte 1 sans l'avoir franchie enverrait le joueur dans un module que l'écran
d'accueil affiche encore cadenassé : **ouvert à l'aller, verrouillé au retour.**
On avance donc le curseur d'abord, et l'annonce de fin d'acte est absorbée — la
livraison EST cette annonce. Vérifié à l'écran : après « Emporter ma sonnerie »,
l'Atelier est ouvert et le Synthé et la Production restent cadenassés.

Un test vérifie ce que la livraison emporte, parce que c'est là qu'elle peut
mentir sans que rien ne le dise : les deux dernières étapes de l'acte sont du
récit puis la livraison, et un rechargement de niveau en chemin donnerait une
grille vide sous la promesse « ton rythme s'y ouvre tel quel ».

#### Acte 2 — le groove se RÈGLE, il ne se reproduit pas

L'acte citait cinq grilles à reproduire (Motown, swing, traîne, ghost notes,
décalage). Il ne cite plus que les trois verbes de PARAMÈTRE sur la famille
`groove`, dans l'ordre qui EST le contenu de l'acte : **entendre → nommer →
viser** (45, 46, 47, 48). On ne fait pas nommer ce qu'on n'a pas entendu.

C'est aussi le premier endroit où `nommer` et `regler` ont un sens : l'Atelier
est ouvert depuis l'acte 1, donc « Swing » et « Décalage » sont sur des curseurs
que le joueur a vus.

**La famille `groove` était déclarée et VIDE.** La remplir a demandé trois
choses au catalogue :

- **`cible: 'global'`** — le swing ne vit pas dans `DrumRowState` mais sur
  `PatternStateV2`. Sans cette distinction, l'exercice écrivait dans un champ
  inexistant et faisait entendre deux fois le même son. Le test de contrat suit
  désormais la cible déclarée, sinon il laissait passer exactement l'erreur
  qu'il existe pour attraper.
- **`contexte: { pas, repere }`** — et c'est mesuré, pas supposé. Le swing ne
  retarde que les pas **impairs** (`col % 2 === 1`) ; le motif par défaut des
  exercices de paramètre pose ses notes sur `[0, 2, 4, 6]`, tous pairs : le
  swing n'aurait eu **strictement aucun effet audible**. D'où des croches. Et le
  décalage ne s'entend que CONTRE un point fixe — d'où le kick en repère, seule
  ligne non coupée en plus de la ligne visée. Prouvé par rejeu du scheduler avec
  un faux kit, sans Web Audio : les trois versions produisent trois suites
  d'instants différentes, et le kick, lui, ne bouge pas.
- **La traîne (`drag`) n'y est PAS**, et l'absente est instructive : elle est
  globale et décale tout uniformément. Deux boucles séparées d'un retard
  constant sont indiscernables — il n'y a rien contre quoi l'entendre. Un test
  vérifie qu'elle reste hors du catalogue.

#### Trois défauts trouvés en mesurant, pas en relisant

1. **« Trois versions du même SON »** était écrit en dur dans la consigne. Juste
   tant que les verbes de paramètre ne servaient que le timbre ; faux pour le
   groove, qui ne change aucun son mais QUAND ils tombent. La question envoyait
   écouter la mauvaise chose.
2. **Deux libellés au féminin** (« la plus forte », « la plus en avance ») dans
   une phrase qui les prend en adverbe : « Laquelle sonne la plus en avance ? ».
   Ça ne se voit qu'en jouant le bon niveau — un test le voit toujours.
3. **Une commande promettait un SENS que le tirage ne tient pas.** « Et là,
   lequel dure le plus ? » se retrouvait une fois sur deux au-dessus d'un écran
   demandant le plus court. Même famille que le défaut déjà corrigé sur le
   BOUTON tiré ; le test interdit maintenant le superlatif dans une commande de
   `lequel` — la propriété peut être nommée, l'extrême non.

Le test de câblage des verbes de paramètre bouclait sur
`L.findIndex((l) => l.exercise === verbe)`, donc toujours sur un niveau de la
famille `timbre` — au point de l'affirmer. La famille `groove` et tout son
câblage neuf seraient passés dessous. Il boucle désormais sur **tous** les
niveaux de chaque verbe et vérifie la famille que le niveau demande.

**Vérification :** `npm run check` (0 erreur), **189 tests** (24 neufs, trois
passages consécutifs pour les tirages aléatoires), les deux builds, et un
parcours Playwright écran par écran des actes 0, 1 et 2 en 390×844 (aucune
erreur console, aucun débordement, aucune ligne de récit repliée).

### ✅ Le retard connu bat le retard court — et le pad le dit (2026-08-24)

Retour de Yann sur ma réponse à sa proposition (« baisser la qualité pendant
l'enregistrement, la remonter ensuite ») : *« l'idée était de réduire la qualité
juste pour que le délai puisse permettre d'enregistrer en rythme avec la
musique. une fois que c'est inscrit, le son doit être remis en bonne
qualité. »* — donc une dégradation TEMPORAIRE et assumée, pas un compromis
permanent. La réponse change de forme : elle devient chiffrée et exécutable.

**Fichiers touchés :** `tests/quantize.test.ts`,
`src/ui/sequencer/NotePad.svelte`, `src/ui/sequencer/SynthRowView.svelte`,
`src/ui/atelier/SynthModule.svelte`, `src/ui/atelier/AtelierView.svelte`.

#### Le raisonnement, mis en test plutôt qu'en argument

`tests/quantize.test.ts` porte cinq cas sur le cadre exact : 120 bpm, ligne de
8 pas, un pas = 250 ms, casque A2DP à 150 ms, joueur qui joue **en mesure avec
ce qu'il entend**.

- Sans correction, la note tombe sur **le pas suivant** : tout le motif sonne
  en retard d'un cran.
- **En dépensant tout ce qu'une dégradation peut rendre** — les 32 ms de tampon
  de sortie ramenées à 8, soit le réglage exact qui avait donné « le son est
  devenu moche » le 2026-08-21 — la note tombe **toujours** sur le pas suivant.
  24 ms gagnées sur 150 ne franchissent pas le demi-pas de 125 ms.
- Le retard **connu**, lui, s'annule complètement : `elapsedMs - latence.ms`
  ramène la note sur le pas visé, avec ±40 ms de jeu humain autour, et **quelle
  que soit la taille du retard** (300 ms s'annulent aussi bien que 150).

⚠️ **Ce n'est donc pas la taille du délai qui décide si on enregistre en
rythme, c'est le fait de le connaître.** Un retard uniforme ne gêne pas le jeu —
la boucle, l'aperçu et le métronome sont décalés du même montant, on joue
dessus sans y penser ; ce qui se casse, c'est l'ÉCRITURE, et elle se corrige par
soustraction. C'est aussi ce que font les DAW en monitoring à forte latence :
ils décalent la prise, ils ne dégradent pas le son.

#### Ce que ça change dans l'appli : le pad le dit, avec le chiffre

Le calibrage ne sert que si on sait qu'il faut le faire — et justement, un
retard uniforme s'entend comme « juste » puisque tout est décalé pareil. Le pad
affiche donc un mot quand `latence.ms === 0` **et** que le navigateur déclare
≥ 60 ms : « Ton appareil annonce 180 ms de retard… ça s'écrit un pas trop
loin », avec un lien qui ouvre la mesure. Seuil à 60 ms parce qu'en filaire on
mesure 32 ms — au-dessous, calibrer ne changerait presque rien. Rien ne
s'affiche dès qu'un réglage est posé, y compris remis à zéro sciemment.

⚠️ **Encore le piège de câblage de CLAUDE.md, et il a mordu.** `retardDeclare`
était un `$derived` appelant `engine.latenceSortieMs()` : cette fonction ne lit
aucune rune, donc le dérivé se calcule **une fois** — à un instant où le
contexte audio n'existe pas encore, puisqu'il naît au premier son — et ne se
recalcule jamais. Avec `outputLatency` forcé à 180 ms dans Chromium,
l'avertissement ne s'affichait pas. Devenu un `$state` rafraîchi à l'ouverture
du pad et après chaque aperçu — l'aperçu étant précisément ce qui crée le
contexte. *Le module était juste, le câblage était faux : troisième fois.*

**Vérifié :** `check` 0 erreur · **194 tests** (5 nouveaux) · les deux builds ·
Playwright avec `outputLatency` forcé : rien en filaire (32 ms), avertissement à
180 ms, le lien ouvre le calibrage, et l'avertissement disparaît une fois le
réglage posé.
### ✅ Acte 4, « La production » — le premier acte qui a demandé un étage de moteur (2026-08-25)

« Poursuis » : après la mélodie vient la production. C'est le premier acte dont
la leçon n'est **pas un son mais un endroit**, et c'est ce qui a décidé de tout
le reste.

**Fichiers touchés :** `src/engine/graph.ts`, `src/engine/AudioEngine.ts`,
`src/model/exercises.ts`, `src/model/presets/levels.ts`,
`src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/latence-audio.test.ts`,
`tests/exercises.test.ts`, `tests/carriere.test.ts`.

#### Ce que l'acte exige, et pourquoi les boutons ne suffisaient pas

`HISTOIRE.md` fait apprendre six choses ici — EQ, compression, filtre,
réverbération, delay, espace entre les instruments. Trois sont des boutons du
modèle et forment déjà la famille `filtre` : elles donnent les niveaux 54 à 57
(entendre le filtre, entendre l'espace, nommer réverbe/delay, régler l'espace),
sur le patron désormais rodé de l'acte 2.

L'EQ et la compression **ne sont pas citées**. Elles sont globales dans le
format v2 : aucune version par ligne à faire entendre. Citées à moitié, elles
auraient reproduit exactement le défaut de l'acte 0 — un mot sans bouton
derrière.

Mais le cœur de l'acte n'est aucune des six. C'est :

> — Ton morceau est bon dans ton ordinateur.
> — Ici, il est mauvais.

Et **ça ne se raconte pas**. Un écran qui décrit un défaut de mixage n'apprend
rien : c'est la leçon de « ce qui n'a pas été porté n'existe pas », appliquée
non plus à du récit mais à du son. D'où un étage de moteur, et un verbe.

#### Le petit haut-parleur (`graph.ts`)

Un passe-haut à 450 Hz et une bosse de présence à 3 kHz — les graves qu'un
boîtier de huit centimètres ne peut pas produire, et le sifflement du texte.
Mesuré dans un `OfflineAudioContext`, à travers le vrai graphe, sur un kick :

| | grave 40-200 Hz | RMS total | survie |
|---|---|---|---|
| studio | 0,00168 | 0,046 | — |
| laverie | 0,00011 | 0,0061 | 13 % |

Soit **14,8× d'énergie grave en moins**. Et en bout de chaîne, sur l'analyseur
maître d'un `AudioEngine` en marche : le grave perd plus de 20 dB à la bascule,
puis revient quand on repasse au studio.

⚠️ **Il est monté EN PARALLÈLE, et c'est une correction payée par la mesure.**
La première version mettait les deux filtres **en série**, réglés « neutres »
au repos (coupure à 10 Hz, bosse à 0 dB) — un passe-haut sous l'audible ne
s'entend pas, donc il ne fait rien. C'est vrai de son AMPLITUDE et faux de sa
PHASE : un biquad déplace le signal même là où il ne l'atténue pas. Mesuré sur
un kick, contre le même kick sans filtre :

```
41 176 échantillons différents sur 44 100 — écart maximal 6,4e-2 pour un RMS de 5,1e-2
```

L'étage aurait modifié **tous les exports du projet**, inaudiblement et pour
toujours, pour les besoins d'un exercice de Mode jeu. Le repos n'est donc plus
un réglage mais un **trajet** : les filtres vivent dans une branche parallèle à
gain nul, et `petitHPSec` / `petitHPHumide` font la bascule en fondu. Vérifié :
**0 échantillon d'écart sur 44 100** entre le trajet au repos et le trajet
d'avant. Le fondu a un second mérite — changer de haut-parleur pendant que la
boucle tourne est le geste même de l'exercice, et un saut de filtre claquerait.

Le monitoring **n'entre pas dans le format v2** : c'est une façon d'écouter, pas
un réglage de morceau — rien à sérialiser, rien à annuler, rien à exporter.
Même domicile que le décalage de latence, qui est une propriété de l'appareil.

#### Le verbe `laverie` (niveau 53)

Trois versions du même kick, séparées par le **drive**. Sur le moniteur de
studio elles se ressemblent ; sur le petit haut-parleur, une seule tient encore.
Mesuré, toujours à travers le vrai graphe :

| drive | RMS studio | RMS laverie | survie |
|---|---|---|---|
| 0 | 0,046 | 0,0061 | **13 %** |
| 55 | 0,061 | 0,0225 | **37 %** |
| 100 | 0,062 | 0,0252 | **40 %** |

Trois choix de conception en découlent :

- **les paliers sont posés, pas tirés.** Ce qu'il faut garantir n'est pas un
  écart de curseur mais un écart de SURVIE, que `tirerVersions` ne sait pas
  mesurer. Un palier intermédiaire à 30 aurait donné 30 % — trop près de 37 pour
  qu'on tranche sur un haut-parleur de téléphone ;
- **l'exercice arrive sur le petit haut-parleur.** Le drive monte aussi le
  niveau en studio (0,046 → 0,062) : posée là-bas, la question aurait une
  réponse — « la plus forte » — qui n'est pas celle qu'on enseigne ;
- **`tone` sur le kick reste hors du catalogue.** En studio il ne s'entend
  presque pas, ce qui en fait une mauvaise question de timbre — et une bonne
  question de production. Un bouton dont l'effet ne se voit qu'ailleurs est
  exactement le sujet de l'acte. Le niveau le pose donc lui-même, et `laverie`
  n'est délibérément pas un `VERBES_PARAM` : l'y mettre ferait tirer un bouton
  de la famille par `preparerParametre`, et l'exercice n'aurait plus de sujet.

Le sélecteur 🖥 / 📻 est **au-dessus de la question**, pas rangé dans un coin :
c'est en passant de l'un à l'autre qu'on entend que le problème n'est pas dans
le son mais dans l'endroit. Et on repart toujours en studio — sans cette remise
à zéro, l'exercice suivant se serait joué sans grave, muet sur la raison.

#### ⚠️ Trouvé en mesurant : l'export n'est PAS reproductible à l'octet près

En vérifiant que le nouvel étage ne changeait rien, deux rendus du **même** état
se sont révélés différents. Ce n'est pas le nouvel étage (prouvé à 0 échantillon
d'écart) — c'est antérieur, et `CLAUDE.md` l'affirme pourtant depuis toujours.

Isolé, effets coupés, deux exports du même état :

```
kick seul (aucune voix à bruit) :      0 / 286 650 échantillons différents
snare seule (voix à bruit)      :  8 465 / 286 650, écart maximal 0,531
```

La règle du `rng` injecté **tient parfaitement** : les notes, les vélocités et
les rafales sont identiques d'un rendu à l'autre. Ce qui ne l'est pas, ce sont
deux TAMPONS remplis hors de ce `rng` :

- `graph.ts` — le bruit blanc partagé (`data[i] = Math.random() * 2 - 1`),
  reconstruit à chaque `buildGraph`, donc à chaque export. Il sert la caisse
  claire, le hat, le clap et le shaker ;
- `fx.ts` — l'impulsion de réverbe, même chose.

**Non corrigé, et c'est désormais arbitré.** Le correctif (semer les deux
tampons depuis `EXPORT_SEED`) tient en deux lignes mais change les octets de
tous les exports futurs — donc une décision, pas un nettoyage. Verdict de Yann,
le jour même :

> *« pour moi, c'est pas important qu'un export ne soit pas reproductible à
> l'octet près »*

**On ne sème donc pas.** `CLAUDE.md` cesse de promettre l'octet et promet ce qui
est vrai — la reproductibilité des NOTES — et dit explicitement que les deux
tampons restent non semés par choix, pour qu'une prochaine session ne les
« corrige » pas en croyant nettoyer une dette.

Ce que l'épisode laisse quand même : la mesure elle-même. Un kick seul rend
0 échantillon d'écart sur 286 650, ce qui prouve que la règle du `rng` injecté
tient exactement ce qu'elle dit — l'ordre d'itération du scheduler, les
vélocités et les rafales sont bien déterministes. C'est cette partie-là qui
compte, et elle est intacte.

**Vérification :** `npm run check` 0 erreur · **206 tests** (12 neufs, trois
passages consécutifs) · les deux builds · parcours Playwright de l'acte 4 en
390×844 (aucune erreur console, aucun débordement, une ligne repliée trouvée et
coupée) · quatre scripts de mesure dans un `OfflineAudioContext` et sur
l'analyseur maître d'un moteur en marche.

### ✅ Acte 5, « Les styles » — l'acte qui avait l'air d'être une liste (2026-08-25)

« Poursuis ». Quinze genres à produire : la lecture évidente était quinze
niveaux de reproduction, c'est-à-dire **le même exercice quinze fois**. Ce
n'est pas ce que l'acte raconte.

**Fichiers touchés :** `src/model/exercises.ts`, `src/model/presets/levels.ts`,
`src/model/carriere.ts`, `src/stores/game.svelte.ts`,
`src/ui/game/GameView.svelte`, `tests/exercises.test.ts`,
`tests/carriere.test.ts`.

#### La scène, et le verbe qui en sort

`HISTOIRE.md` met la leçon dans une conversation MSN, pas dans le pack livré :

> « Festif mais urbain, vous voyez :) »
> Il finit par fredonner. C'est du dancehall.
> **Tu comprends immédiatement. Il ne savait simplement pas le dire.**

Ce qui s'apprend là n'est pas de refaire un genre, c'est de **mettre un nom
dessus** — c'est précisément ce qui manquait à l'autre bout du fil. D'où le
verbe `style` : une boucle, quatre genres, aucun réglage à mesurer.

C'est le seul verbe qui interroge une **culture** plutôt qu'une oreille, et
c'est aussi le moins cher jamais ajouté : les 34 presets portaient déjà leur
`label`, leur `cat`, leur tempo, leur swing et leur timbre. Il n'a fallu que
les rendre visibles depuis `GamePresetLike` — deux champs optionnels.

#### Trois décisions de conception

- **Les leurres viennent d'AUTRES catégories.** « Boom bap » contre « Drill »
  et « Trap moderne » poserait une question dont la réponse est un tirage au
  sort pour tout le monde sauf un spécialiste — exactement le défaut que
  `tirerVersions` évite par construction pour les paramètres. On reconnaît une
  **famille**, comme dans la scène. Un test le vérifie à chaque tirage : les
  quatre propositions sont de quatre catégories distinctes.
- **Le genre est tiré à chaque partie**, jamais figé dans les données (d'où
  `stylePool` et non `presetId`). Un preset gravé aurait fait de la culture des
  styles un exercice de mémoire dès la deuxième partie.
- **La cible EST le preset**, pas seulement son nom. Le tirage se fait avant
  les trois helpers de niveau, en posant le `presetId` sur une **copie** de la
  config : le niveau hérite ainsi de la grille, de la subdivision, du tempo, du
  swing, de la traîne et du timbre du morceau réel. Un genre reconnu sur une
  grille générique à 100 BPM ne serait pas un genre — et rien à l'écran ne
  l'aurait dit. Un test compare tempo, swing, subdivision et nombre de coups au
  preset tiré, 60 fois.

#### Les reconstructions sont citées, pas fabriquées

« Tu écoutes. Tu reconstruis. Tu compares. » Ces niveaux-là existent depuis la
campagne d'origine : l'acte cite 4 (Motown), 12 (House), 13 (Dancehall), 27
(Dembow) et 32 (Funk) — une par famille du fax. Zéro ligne de données neuve, et
la règle du fichier est tenue : **un acte cite, il ne fabrique jamais.**

Détail qui n'en est pas un : les quatre catégories des presets *sont* les
quatre lignes du fax de Zik'Mobile (hip-hop, club, latino, funk/soul). Le brief
du récit et le classement du code disaient déjà la même chose.

**Vérification :** `npm run check` 0 erreur · **216 tests** (10 neufs, trois
passages consécutifs — le verbe est entièrement aléatoire, donc chaque
assertion porte sur ce qui doit être vrai à chaque tirage, répété 60 fois) ·
les deux builds · parcours Playwright de l'acte en 390×844 (aucune erreur
console, aucun débordement, aucune ligne repliée — un libellé de genre long
se replie proprement dans son bouton).

### 🗺️ Cartographie — étendre le Mode jeu au synthé (2026-08-23, avant tout code)

`CLAUDE.md` impose de cartographier tous les points de contact avant d'étendre
un type central. Fait, et le résultat change le plan : **le comptage
d'occurrences sous-estime le coût d'un côté et le surestime de l'autre.**

`GameDrumRowName` / `GAME_DRUM_ROWS` : **46 occurrences, 5 fichiers** —
`stores/game.svelte.ts` (23), `ui/game/GameView.svelte` (8),
`model/exercises.ts` (7), `model/presets/levels.ts` (6),
`model/parametres.ts` (2).

#### Ce qui est déjà là, et gratuit

- **Générer une mélodie cible** : `randomizeMelodyMotif` et
  `randomizePitchedLine` (`engine/generators.ts`) existent, prennent un `rng`
  injecté, et sont testées (`tests/melody-motif.test.ts`). C'est la partie qu'on
  croyait chère.
- **La faire sonner** : `buildGraph` sait déjà rendre une ligne de synthé, en
  direct comme hors ligne. Rien à écrire.
- **L'harmonie** : `engine/harmony.ts` (gamme, degrés, accords, `justesseForStep`).
- **La saisie de notes** : `ui/sequencer/NotePad.svelte`, déjà écrit pour l'Atelier.

#### Ce qui est un renommage mécanique

L'union `GameDrumRowName | SynthRowName` et les `Record<…>` qui la suivent.
Ennuyeux, sans risque.

#### Le vrai coût — trois choses que le renommage ne touche pas

1. **La case porte une HAUTEUR.** `DrumStep = 0 | 1 | 2` contre
   `SynthStep = SynthNote | number | null`. `comparerGrilles` compare par `===` :
   ça marche pour un **degré numérique**, pas pour un objet `SynthNote`. Et
   `cycleCell` (0→1→2→0) n'a aucun sens sur une note — il faut une seconde
   interaction de grille dans `GameView`, avec le pad de saisie.
2. **Une ligne de synthé n'a pas la même FORME.** `DrumRowState.subdiv` contre
   `SynthRowState.cycleBars` + `subdivisions` ; `buildState` écrit dans
   `state.rows[…]` et devrait savoir écrire dans `state.synthRows[…]`. Cinq
   états du store (`target`, `guess`, `locked`, `shift`, `zoneACompleter`)
   supposent une forme unique.
3. ⚠️ **Les formes nommées à la main — le coût caché.** `LevelDensity` s'appelle
   `kickMin`/`kickMax`/`snareMin`/… , `rowsActive` est `{ kick, snare, hat }`,
   `SubdivSpec` pareil. Ce ne sont **pas** des `Record<Name, …>` : ajouter une
   ligne s'y fait champ par champ, dans la génération comme dans les 41 niveaux
   déjà écrits. C'est ce qu'un `grep` sur le nom du type ne montre pas.

#### Ce que ça implique pour l'acte 3, « La mélodie »

Le raccourci existe et il est réel : **les trois verbes de PARAMÈTRE ne
touchent aucun des trois points ci-dessus** — ils ne comparent pas de grille.
Ouvrir `parametres.ts` au synthé demande trois choses : `id` accepte aussi une
clé de `SynthVoice`, `lignes` accepte `SynthRowName`, et `buildState('param')`
branche sur `state.synthRows`. Petit, et ça se teste sans écran.

Mais un acte « La mélodie » qui n'enseignerait que des boutons de filtre
n'enseignerait pas la mélodie. D'où la proposition, **en deux temps** :

1. **Les verbes de paramètre sur le synthé** — la moitié bon marché, et elle
   ouvre le Synthé pour une raison honnête : on a entendu ce que ses boutons
   font.
2. **`reproduire` sur une ligne de BASSE monophonique**, dont les cases sont des
   **degrés numériques** — ce qui laisse `comparerGrilles` intact (le point 1
   disparaît), n'ajoute qu'une seule ligne (le point 2 se réduit à un
   aiguillage), et évite la polyphonie de la nappe. La mélodie proprement dite
   viendra après, sur le même chemin.

#### ⚠️ La contrainte d'ordre, à ne pas oublier

`acteOuvert` exige que l'acte précédent soit franchi. **L'acte 5 « Les styles »
est le moins cher à écrire — et il est inatteignable tant que les actes 3 et 4
n'existent pas.** Écrire 5 avant 3 produirait du contenu que personne ne peut
ouvrir. Trois sorties possibles, à trancher : écrire 3 puis 4 dans l'ordre ;
autoriser à SAUTER un acte non écrit (le récit reste lisible, son module reste
fermé) ; ou déplacer l'acte 5 plus tôt, ce que le récit interdit — c'est là que
les 34 presets servent, « après avoir appris à mixer, avant d'avoir à faire
quelque chose de personnel ».

### Chantiers ouverts

*Tenu à jour : ce qui est fait sort de cette liste, avec le numéro de l'étape
qui l'a fermé.*

- ~~Le tactile en Mode Live~~ — **clos à l'étape 13** : 28 → 0.
- 🔜 **Mode jeu, la suite — trois chantiers, dans cet ordre.** L'étape 17 a posé
  la charpente et un pilote de chaque verbe ; ce qui reste est du contenu et de
  l'intégration, pas de l'architecture.
  1. **Intégrer les trois verbes à la campagne** — *le prochain pas naturel, les
     pilotes étant validés.* Les pilotes 35-38 sont hors courbe. Deux verdicts d'essai de Yann (2026-08-20) à respecter :
     **« compléter » est plus facile que « reproduire »** — donc AVANT, comme
     échauffement, pas après ; et **« l'intrus » exige un rythme un peu complexe**
     pour que la variante d'un pas ne s'entende pas immédiatement. Reste à
     décider si la campagne s'allonge ou si des niveaux existants changent de
     verbe, et lequel des deux sens de « jouer » (à l'oreille / à vue) entre en
     premier. **Arbitrage de Yann**, pas une décision technique.
  2. **La grille de déverrouillage** — proposition écrite et retenue par Yann :
     rafale au niv. 11, swing 14, ghost 20, fill 21, décalage 23. À appliquer.
  3. **L'extension au synthé.** La plus grosse. ⚠️ `GameDrumRowName` touche le
     store, la génération, les presets, le moteur et la vue : **cartographier tous
     les points de contact avant de coder** (règle `CLAUDE.md`) — la surface réelle
     dépasse presque toujours l'estimation.
- 🔜 **B6 — la mise en page du splash et du Mode jeu** (contenu collé en haut,
  ~70 % de vide, constat 6 de l'audit du 2026-08-15). À traiter dans la même
  passe que le point 1 ci-dessus : c'est le même écran.
- **Le biseau en haute densité** — 1px logique = 2 ou 3 physiques. Toujours pas
  vérifié sur un vrai appareil ; toutes les mesures de cette session sont des
  mesures Playwright à `devicePixelRatio` 1 à 3.
- **Les sons système** — `ui/xp/systemSounds.ts` synthétise des sons XP. Ils ne
  collent plus à la direction, mais `AtelierView` (son d'erreur) et `ToolBar`
  (réglage dans le menu Affichage) s'en servent encore : les retirer sans les
  remplacer enlève un retour à l'utilisateur. C'est une décision, pas un détail.
- 🔜 **Le Mode Live est à reprendre — APRÈS le Mode jeu.** Demandé par Yann le
  2026-08-19, avec cet ordre explicite. Le périmètre n'est pas défini : c'est à
  lui de le donner. Ce qui est connu et qui pèsera dans la reprise :

  - **beaucoup a bougé en une session, sans passe d'ensemble.** Les icônes de
    coin ont disparu (étape 13), les barres du haut et de séquence sont montées
    à 44px et les pads sont descendus de 94 à 81px, le verrou et le brassage
    total ont été retirés au profit d'un dé par chose (étape 16), et le
    visualiseur « BARRES » est passé d'un faux spectre à une vraie mesure
    (étape 11). Chaque changement a été vérifié seul ; **l'écran entier ne l'a
    pas été**.
  - **l'overlay ⚙ est devenu la seule surface de réglage** et il s'allonge :
    six boutons, le pad, l'inclinaison, le visualiseur, la banque, les
    snapshots. C'est là que se posera la question de l'organisation.
  - **le panneau du visualiseur est bien plus haut que ce que le spectre
    remplit** — l'analyseur y dessine dans le bas du cadre. Jamais retouché
    depuis que le contenu a changé de nature.
  - **rien n'a été essayé sur un vrai téléphone en paysage**, qui est pourtant
    le seul contexte d'usage de ce mode.

- **La densité face à la maquette** — la maquette tient cinq lignes de batterie
  plus le bandeau d'état en 430px là où l'appli en prend 844. L'écart vient
  **entièrement** des pastilles « Séquence / Timbre / Filtre & espace » sous
  chaque ligne, que la maquette n'a pas. C'est de l'organisation de
  fonctionnalités, donc l'arbitrage de Yann.

**Fermés depuis :** le visualiseur (étape 11 — le panneau « Barres » du Live
affichait un faux spectre construit sur un classement supposé du registre de
chaque son ; c'est une mesure maintenant, et l'analyseur sert aussi l'Atelier).

⚠️ **Bug corrigé dans les maquettes :** `.slider` n'était stylé que sous
`.tempo`, donc **toutes les glissières des écrans Synthé, Production et Live
étaient invisibles** depuis leur création. Règle rendue générique dans
`base.py` ; le moodboard a été republié avec les images corrigées.

---

### ⭐ Moodboard des deux finalistes — Cassette et Winamp 2.x (2026-08-18)

> « fais moi un moodboard détaillé des deux finalistes »
> « les deux finalistes, ce sont cassette et winamp 2.x sans croisement »

Moodboard : <https://claude.ai/code/artifact/51cc5fb9-e9b6-4b98-a343-0dbab615de12>
Sources `maquettes/atelier/build_moodboard.py` + `mood.tpl.html`.

⚠️ **Les 4 croisements de la 7e série sont écartés.** Yann a tranché : les deux
finalistes sont les **originales**, sans hybridation. H1-H4 restent consultables
mais ne sont plus dans la course.

**Le moodboard contient, pour chacune :** palette complète (fonds / encres /
traits / accent, chaque valeur avec son rôle), les 8 teintes de lignes, l'échelle
typographique en 10 rôles (taille, graisse, approche, casse), les états d'un pas,
une planche de composants (barre de titre, bouton, menu déroulant, champ, pastille,
cadre + légende, case à cocher, curseur, bandeau d'état, cases), les références
culturelles et les risques. **Les spécimens sont du CSS vivant**, rendus dans les
tokens réels lus dans `variants_b.py` / `variants_c.py` — pas des captures.

**Ce que le moodboard établit :** ces deux-là ne sont pas deux variantes d'une même
idée, ce sont **deux objets différents — un imprimé et un logiciel**. Cassette se
fabrique et se tient dans la main ; Winamp se télécharge et n'a jamais existé
qu'à l'écran. Elles partagent la chasse fixe et rien d'autre.

| | Cassette | Winamp 2.x |
|---|---|---|
| Fond | papier #f4f1e8 | verre noir #050806 sur bureau #000 |
| Relief | aucun — ombres portées dures | biseau d'1 px, partout |
| Échelle | 11-12 px | 8,5-9 px (rapport 1,3) |
| Accent | vermillon #c94f2e | vert LCD #2ee23c |
| Teintes de lignes | désaturées vers l'encre | saturées, couleurs d'écran |
| Contraste allumé/éteint | réglé à 80 % | réglé à 100 % |
| Écran Synthé | 744px | **657px** |

**Risques principaux.** *Cassette* : le Mode Live est un écran de scène et un plan
clair éblouit en pénombre ; c'est aussi la plus haute des cinq ; et son vermillon
est **aussi la teinte du kick** (risque de confusion « piste » / « actif »).
*Winamp* : cibles de 1998 (capitales 8,5px, reliefs d'1px) à agrandir sans
agrandir le dessin ; le biseau d'1px s'épaissit sur écran haute densité, à
vérifier tôt sur un vrai appareil ; et c'est une citation littérale qu'une partie
du public ne reconnaîtra pas.

**Coût en code — ce qui les distingue :**
1. **La police** : les deux exigent une chasse fixe auto-hébergée (fontsource) —
   Courier New n'existe pas partout et le rendu change du tout au tout selon la
   plateforme. **Seul poste qui alourdit le fichier livré**, identique pour les deux.
2. **Le thème sombre existe déjà** (`data-theme="noir"`, utilisé par le Mode jeu) :
   Winamp s'y branche presque directement, Cassette demande un 3e thème clair.
3. **Le relief** : Cassette *supprime* les 3 tokens de biseau au profit d'un filet
   (simplification) ; Winamp les garde mais en fait la grammaire unique, appliquée
   partout — un peu plus de travail, mieux balisé.
4. Le poste principal est le même dans les deux cas : les **225 couleurs en dur**
   dans 18 `.svelte` à passer en tokens.

### 7e série — 4 croisements des finalistes (2026-08-17) — ⛔ ÉCARTÉE

Planche : <https://claude.ai/code/artifact/98863af1-a8a5-4b0f-8836-4a1e4f1769e0>
Fichiers `maquettes/atelier/variants_d.py` + `build_hybrides.py` -> `hybrides.html`.

Yann n'ayant pas de préférence sur la suite, j'ai pris ma recommandation :
croiser les cinq. **Chaque hybride règle un défaut précis relevé au test sur
écran dense**, pas un mélange de goûts. Tous gardent la chasse fixe, seul point
commun avéré de la shortlist.

| | Croisement | Défaut visé | Synthé |
|---|---|---|---|
| **H1** Skin dense | Winamp 2.x × Skin de nuit × Néon | le halo du Néon partout → **une seule chose brille : le pas actif** | 687px |
| **H2** Terminal bleu | Turbo × Winamp 2.x × Cassette | les 16 couleurs DOS sans ton intermédiaire → **une vraie échelle de bleus**, le fond signature conservé | 709px |
| **H3** Papier machine | Cassette × Winamp 2.x | cassette la plus haute (744) → **684px**, et le filet rouge ne marque plus que l'actif | 684px |
| **H4** Nuit imprimée | Cassette × Skin de nuit | *pas un compromis, une question* | 684px |

**H4 est le vrai instrument de cette série.** H3 et H4 sont rigoureusement le
même dessin à la couleur de fond près. La cassette est dans la shortlist pour
son **papier** ou pour sa **typographie** ? Si H4 plaît autant que H3, c'était
la typo — et toute la branche claire peut être abandonnée. Si H4 plaît moins,
c'était bien le papier, et il faut garder une direction claire dans la course.

Repères : Winamp 2.x tenait le Synthé en **657px** (record), Cassette en **744**.
Les quatre croisements atterrissent entre 684 et 709.

**Prochaine étape utile**, une fois réduit à un ou deux : décliner le vainqueur
sur les écrans qui ne se ressemblent pas — splash, Mode jeu, et surtout **Mode
Live en paysage**. C'est là qu'une identité casse, pas sur l'Atelier.

### ⭐ Shortlist de Yann + test sur écran dense (2026-08-17)

> « pour le moment, voici celles que j'aime bien : winamp 2.x, skin de nuit,
> neon, turbo et cassette »

Planche : <https://claude.ai/code/artifact/47334e5f-201b-41b2-9c4b-21d34036ec7a>
Fichier `maquettes/atelier/build_synth.py` -> `finalistes.html` (5 directions ×
2 écrans).

**🔑 Ce que la sélection révèle — à retenir pour toute la suite du projet.**
Les 29 écrans se répartissent en deux moitiés selon la typographie des menus :
**12 en chasse fixe, 17 en proportionnelle**. Les cinq choix de Yann sont
**5/5 en chasse fixe, 0/17 en proportionnelle** (vérifié par comptage, pas à
l'œil). Et **aucune des cinq n'est une machine** : ni TR-808, ni rack, ni
eurorack, ni console, ni OP-1 — ce sont quatre *écrans* et un *imprimé*.

**La piste du projet est donc : écran + chasse fixe.** La couleur vient après.

⚠️ **Mes trois recommandations successives sont toutes éliminées** : Amp
(« la direction B complète »), Console (« la plus intéressante des vingt »),
HUD (« la plus solide des neuf »). Je jugeais sur la cohérence de l'état et la
justesse de la métaphore instrumentale — ce n'est pas le critère de Yann. Amp
avait pourtant ses menus en chasse fixe, mais son *cadre* restait Luna, ce qui
suffit à la sortir.

**Le test que les 29 premières maquettes ne faisaient pas.** Elles montraient
toutes l'onglet Rythme : cinq lignes, des cases, **aucun menu déroulant, aucune
case à cocher, aucun cadre de réglages**. L'écran Synthé a donc été construit
(`base.py` → `screen_synth()` + `SYNTH_CSS`) : 3 lignes avec sélecteur de voix,
4-5 pastilles chacune, cadre « Harmonie & remplissage » (2 menus, 2 curseurs
numérotés, bouton pleine largeur), cadre « Sidechain » avec cases à cocher.

| | Écran Synthé | Tenue sous charge |
|---|---|---|
| **Winamp 2.x** | **657px** | Tient très bien ; champs et boutons tombent dans la grammaire de skin. Défaut tactile (capitales 9px, cibles de 1998), réparable via Winamp 5. |
| **Skin de nuit** | 710px | Tient. Le halo se multiplie sur l'écran dense : il faudra décider *une seule* chose qui a le droit de briller. |
| **Néon** | 724px | Tient, mais le magenta est partout : le bouton « Remplissage aléatoire » rayonne comme une action principale alors qu'il n'en est pas une. Problème de hiérarchie. |
| **Turbo** | 740px | ⚠️ **A cassé** — libellés secondaires en gris foncé sur le bleu, illisibles. La palette DOS a 16 couleurs et **aucun ton intermédiaire**. Réparé (gris clair sur bleu, champs gris moyen) mais chaque nouvel élément demandera une assignation explicite. |
| **Cassette** | 744px | **C'est elle que l'écran dense avantage** : pas de halo, et menus/cases/cadres se lisent nativement — ce sont des objets imprimés. Mais la plus haute, et elle perd le contraste allumé/éteint gratuit du fond noir. |

**Bug corrigé au passage :** `--c-bass/--c-pad/--c-melody` n'étaient définis
nulle part — les lignes synthé sortaient invisibles. Défauts ajoutés dans
`base.py` pour que ça ne puisse plus passer inaperçu, plus des teintes propres
par variante.

**Reste à trancher avant de coder :** une seule direction, ou un croisement ?
Les cinq partagent déjà la chasse fixe ; ce qui les sépare est la couleur de
fond et le traitement des bords. Un croisement est réaliste (densité de Winamp
2.x + noir de Skin de nuit + hiérarchie de couleur de Cassette) mais c'est un
choix, pas une évidence.

### 5e série — 9 écrans sans aucune trace de XP (2026-08-17)

> « peux tu ajouter 3 propositions de chaque idée suivante : winamp totale
> (aucun XP) / analogique-mécanique / cyberpunk »

Planche : <https://claude.ai/code/artifact/5c400f39-5990-43bb-994e-c4bbc5069a19>
Fichier `maquettes/atelier/variants_c.py` — même système de tokens, `build.py`
assemble maintenant **29 écrans**.

| | Écran | Référence | Barre | 1re case |
|---|---|---|---|---|
| W1 | Winamp 2.x | la skin d'origine, poignée à points | 53 | **204** |
| W2 | Skin de nuit | custom de skins.winamp.com | 59 | 225 |
| W3 | Winamp 5 | « modern skin », brossée et ronde | 64 | 243 |
| A1 | Bakélite | magnétophone à lampes, vumètre à aiguille | 68 | 258 |
| A2 | Mécanique | palettes de tableau d'affichage | 58 | 233 |
| A3 | Eurorack | modulaire, jacks ronds, sérigraphie | 64 | 232 |
| C1 | Néon | ruelle de Kowloon, magenta/cyan | 63 | 238 |
| C2 | Phosphore | terminal cathodique vert | 65 | 239 |
| C3 | HUD | surcouche tactique cyan + ambre | 63 | 235 |

**Le fil qui relie les trois pistes, non cherché :** elles cessent toutes de
faire porter l'état d'un pas par sa *couleur*. La palette mécanique le fait par
la **position**, le phosphore par l'**intensité**, le jack eurorack par la
**lumière**. C'est la réponse la plus solide à la charge n°1 de l'audit (le
contraste à l'envers) — et elle vient de contraintes physiques, pas d'un choix
graphique. À rapprocher de System 7, qui faisait la même chose par la trame.

**Retenues :**
1. **C3 · HUD** — une seule couleur d'état (l'ambre), un seul niveau de halo,
   des équerres qui cadrent la zone de travail au lieu de l'entourer d'un cadre.
   Le cyberpunk le plus lisible à 390px et celui qui vieillira le mieux.
2. **A2 · Mécanique** — la plus originale : règle le contraste sans couleur ni
   lumière, et promet un mouvement (le retournement de la palette au pas
   suivant) qu'aucune autre n'a.
3. **W1 · Winamp 2.x** — record de densité des 29 (1re case à **204px** contre
   318 aujourd'hui). Prix : des cibles de 1998, il faudrait W3 pour le tactile.

⚠️ **Deux réserves :** C2 Phosphore perd les 8 couleurs de lignes, qui sont du
*contenu* et pas de l'habillage. A1 Bakélite est la seule des 29 qui engage du
**code d'animation** — une aiguille de vumètre qui ne bouge pas n'est pas un
vumètre, c'est un dessin de vumètre.

**Deux pièges CSS à retenir** (les deux ont produit un rendu faux avant
correction) : `.s-c2 .screen` ne matche rien, l'écran **est** `.screen.s-c2` et
pas un descendant — les lignes de balayage n'apparaissaient jamais. Et
`border-radius: 50%` sur un élément flex étiré donne une **ellipse**, pas un
cercle : les jacks eurorack ont dû passer en taille fixe + `space-around`.

### 4e série — 20 écrans d'Atelier complets (2026-08-17)

> « mais il faut me montrer pas seulement la barre fichier mais aussi l'atelier »

Planche : <https://claude.ai/code/artifact/181e852c-3818-4d8d-b474-20f1a41a714c>
Fichiers `maquettes/atelier/` (`base.py` + `variants_a/b.py` -> `build.py`).

Les vingt habillages de la 3e série, appliqués à **l'écran entier** : barre,
transport, onglets, fenêtre du séquenceur, tempo. Organisation inchangée.

**Architecture des maquettes à réutiliser :** `base.py` porte la structure et
un CSS **sans une seule couleur** — tout passe par des tokens. Chaque variante
tient alors en ~30 lignes, plus quelques extras quand sa langue a une
particularité structurelle (vis du rack, trame de points de l'afficheur, filet
de la jaquette, LED de la console, coloration par groupe de temps de la 808).
C'est ce qui a rendu 20 écrans complets réalisables.

**Périmètre du cadre :** barre + transport + onglets + séquenceur + tempo. **Pas**
le bandeau d'astuce ni le panneau du bas (banque, analyseur), soit 353px de plus
en réel. La comparaison honnête est donc la hauteur de la 1re case jouable :
**318px aujourd'hui**, 224 à 261 dans les vingt — dont une part vient du bandeau
d'astuce absent, pas seulement de la barre.

| Écran | Barre | 1re case | | Écran | Barre | 1re case |
|---|---|---|---|---|---|---|
| Luna (actuelle) | 70 | 255 | | Rhythm Composer | 66 | 244 |
| **Luna resserrée** | **41** | **225** | | Pocket | 67 | 242 |
| Aqua | 67 | 248 | | Rack 19″ | 71 | 247 |
| System 7 | 57 | 237 | | Afficheur | 68 | 244 |
| Workbench | 58 | 237 | | **Console** | **50** | **226** |
| Motif | 56 | 228 | | Bloc | 80 | 261 |
| Turbo | 61 | 237 | | Cahier | 71 | 249 |
| Amp | 65 | 247 | | Cassette | 66 | 245 |
| **Skin** | 56 | **224** | | Étiqueteuse | 65 | 239 |
| | | | | Tracker | 63 | 241 |
| | | | | Plat (témoin) | 73 | 258 |

**Ce que l'écran entier apprend, et que la barre seule ne disait pas :**

1. **Amp est enfin cohérente.** La 3e série laissait une barre Luna sur un plan
   de travail sombre ; ici barre et corps parlent la même langue, et la fenêtre
   cesse d'avoir une tête et un corps dissociés. C'est ça, la direction B
   complète.
2. **Console devient la plus intéressante des vingt.** La LED au-dessus du menu
   ouvert *et* l'onglet actif au même vert font que tout l'écran signale l'état
   de la même façon. 50px de barre. À instruire en premier si on quitte Luna
   sans vouloir de pastiche.
3. **Rhythm Composer est réparée.** Le problème de lisibilité de la 1re série
   (couleur prise par le repère de temps) est réglé en colorant les pas **par
   groupe de temps** et en faisant porter l'état par la matière (mat/creux vs
   plein/brillant). C'est devenu une vraie candidate.
4. **System 7 démontre qu'on peut se passer de couleur** : chaque ligne est
   distinguée par sa **trame** (plein / hachures / rayures) et le motif reste
   lisible. Utile à garder en tête pour l'accessibilité.

⚠️ **Deux chantiers que l'habillage ne touche pas**, quelle que soit la
direction : le menu Fichier mélange toujours 4 commandes et 34 morceaux, et
l'anatomie de la ligne (99px dont 34 de musique) n'est traitée dans aucune de
ces maquettes, qui affichent une ligne simplifiée. Ce sont les deux vrais
chantiers mesurés de l'audit.

### 3e série — 20 habillages de la barre de menus (2026-08-17)

> « je ne souhaite pas remettre en cause l'organisation de fonctionnalités. je
> pense qu'il faut garder la barre fichier mais adapter son design à chaque
> fois. peux tu me montrer 20 propositions ? »

Planche : <https://claude.ai/code/artifact/a576f1e1-86e9-4e07-aa0d-9b722c58eb6a>
Fichiers `maquettes/barre/` (`build.py` génère `index.html`).

**Arbitrage acté : l'organisation des fonctionnalités ne bouge pas.** La 2e
série (architecture des commandes) est donc classée — elle reste consultable,
mais aucune de ses dix propositions n'est à instruire. La barre de menus est
conservée telle quelle ; c'est son habillage qui s'adapte à chaque direction
visuelle.

⚠️ **Chiffre corrigé (2e fois sur cet audit).** J'ai écrit deux fois que la
barre range 49 entrées dans **28px**. C'est la hauteur d'*un* rang de menus. La
barre complète fait **64px** : à 390px, les cinq mots + le drapeau « accès
total » + annuler/rétablir ne tiennent pas sur une ligne et se replient sur deux
rangs. Chaque variante de cette série se replie comme la vraie, et sa hauteur
est mesurée dans le DOM.

**Résultat le plus actionnable, indépendant de toute direction :**
**« Luna resserrée » passe de 72 à 40px sans changer de langue visuelle** — en
rendant les zones cliquables jointives comme dans un vrai menu Windows au lieu
d'espacer des mots. ~24px repris sur la barre réelle, sur tous les écrans.

| Famille | Variantes (hauteur en px) |
|---|---|
| Nostalgies d'interface | Luna 72 · **Luna resserrée 40** · Aqua 74 · System 7 53 · Workbench 56 · Motif 48 · Turbo 53 |
| Nostalgies de matériel | Amp 64 · Skin 53 · Rhythm Composer 66 · Pocket 66 · Rack 19″ 65 · Afficheur 64 · **Console 49** |
| Ailleurs | Bloc 83 · Cahier 73 · Cassette 62 · Étiqueteuse 65 · Tracker 61 · Plat 74 |

**À retenir :**

1. **Luna resserrée** — à faire quoi qu'il arrive, aucun débat à ouvrir.
2. **Amp** — la barre qui va avec la direction B ; si le plan de travail devient
   un instrument, la barre doit suivre sous peine d'une fenêtre à tête et corps
   dissociés.
3. **Console** — trouvaille de la série : une LED au-dessus du menu ouvert
   remplace le fond bleu de sélection. Plus juste pour un produit musical, tient
   en 49px, et donne à la barre un rôle d'afficheur.
4. **Skin** et **Workbench** — gardent le rétro sans garder Windows ; Workbench
   a l'argument que les autres n'ont pas (la machine où la musique à motifs est
   née).

⚠️ **Défaut partagé par les vingt, qu'aucun habillage ne répare** : le menu
Fichier mélange 4 commandes et 34 morceaux. Sur chacune des vingt images, la
moitié basse du déroulant est un catalogue coincé dans une liste de commandes.
Le problème est dans le contenu, pas dans le style — c'est le seul point de la
2e série qui survit à l'arbitrage.

**Limite de rendu à connaître :** la machine n'a ni Tahoma, ni Helvetica Neue,
ni Georgia ; les polices retombent sur DejaVu/Liberation. Structures et couleurs
justes, personnalité typographique aplatie sur les captures.

### 2e série — architecture des commandes (2026-08-17) — ⛔ CLASSÉE le 2026-08-17

> « prends bien en compte comment rentrer toutes les fonctionnalités, notamment
> celles qu'on a mises dans la barre du haut. en ça, XP nous a aidé… »
> « Credo important : accueillant pour les non initiés, capacité pour aller loin »

Planche : <https://claude.ai/code/artifact/aca306d0-d787-47bc-9e2f-2ee7f0a83845>
Fichiers `maquettes/arch/k.html` … `t.html`.

⚠️ **Reproche fondé sur la 1re série.** Les dix premières maquettes montraient
le séquenceur et escamotaient la barre de menus — c'est-à-dire précisément
l'endroit où XP fait le travail. Cette série ne porte que là-dessus, et toutes
les maquettes gardent la même peau pour que la seule variable soit
l'architecture.

**La taille réelle du problème (mesurée) :**

| | |
|---|---|
| Barre de menus | **49 entrées** (34 morceaux, 14 commandes, 1 option) en **28px** |
| Onglet Rythme, replié | **63 commandes** visibles |
| Onglet Rythme, tout déplié | **288 commandes** sur **3 388px** (4 écrans) |

**Les trois propriétés de la barre de menus à ne pas perdre :** son coût en
pixels ne dépend pas du nombre d'entrées ; le rangement est stable et nommé
donc mémorisable ; on peut l'ouvrir pour regarder sans rien déclencher — c'est
ce qui la rend explorable par quelqu'un qui ne sait pas encore. **Cette
troisième propriété est la plus facile à perdre** : P (recherche) et Q (roue au
pouce) sont excellents pour qui sait déjà et ne montrent rien à qui découvre.

| | Architecture | Accueil | Profondeur | Découverte | Tactile |
|---|---|---|---|---|---|
| — | *aujourd'hui* | *63* | 4 écrans | bonne | moyen |
| K | Menus assumés | 11 | illimitée | bonne | **faible** |
| L | Interface qui pousse | **4** | totale | **excellente** | bon |
| M | Établi et tiroir | 13 | bonne | bonne | excellent |
| N | Inspecteur | 11 | constante | bonne | bon |
| O | Simple / Studio | 5 | totale | **faible** | moyen |
| P | Palette | 12 | maximale | **nulle** | moyen |
| Q | Roue au pouce | 11 | 6 par objet | **nulle** | excellent |
| R | Une chose à la fois | **3** | correcte | excellente | excellent |
| S | Boutons de mode | 7 | bonne | excellente | excellent |
| T | Le guide qui parle | 6 | entière | excellente | bon |

**Résultat de la série : aucune ne tient les deux moitiés du credo seule.**
Celles qui accueillent le mieux (R, L, T) coûtent cher ou imposent un parcours ;
celles qui vont loin pour rien (P, Q) ne montrent rien. Le credo demande des
**couches**, pas un choix.

**Empilement recommandé, dans cet ordre :**

1. **S · Boutons de mode** comme squelette — c'est la barre de menus retournée :
   mêmes trois propriétés, mais tactiles. Quatre mots permanents en bas
   remplacent cinq mots en haut faits pour une souris.
2. **N · Inspecteur** dans le mode « Son » — absorbe les 288 réglages de ligne
   sans jamais faire grandir l'écran.
3. **L · Interface qui pousse** comme calendrier d'ouverture — les contrôles
   arrivent un par un, chacun avec l'exercice qui l'explique. Le Mode jeu
   finance déjà cette moitié du credo.
4. **P · Palette** en filet de sécurité — une pastille, coût quasi nul, seule
   réponse au « j'ai oublié où est ce réglage ».

⚠️ **Et une chose à sortir des menus quelle que soit la décision : les 34
morceaux.** Ils occupent 34 des 49 entrées. Ce n'est pas une liste de commandes
mais un catalogue à parcourir (noms, familles, envie d'écouter avant de choisir)
— un menu déroulant est le pire endroit pour ça, sur n'importe laquelle des dix
architectures.

**R est écartée malgré son meilleur score d'accueil** : elle perd la vue
d'ensemble, or un rythme s'entend *par* la superposition des lignes. Voir le
kick sans la snare, c'est ne pas voir le rythme.

### 1re série — dix peaux (2026-08-17, « je souhaite que tu fasses 10 propositions »)

Planche complète : <https://claude.ai/code/artifact/e0aa9107-85d0-49f3-a157-6b70de8b3c42>
Fichiers `maquettes/a.html` … `j.html`.

Les sept ajoutées après les trois premières, chacune ancrée sur une famille
réelle plutôt qu'une déclinaison de sombre :

| | Direction | Référence | Résout | Coût |
|---|---|---|---|---|
| D | Rhythm Composer | Roland TR-808/909 | 2·3·4 | élevé |
| E | Pocket | Pocket Operator, EP-133 | 1·2·3·4 | très élevé |
| F | Skin | Winamp | 1·2·3·4 | **moyen** |
| G | Bloc | Teenage Engineering OP-1 | 1·2·4 | élevé |
| H | Cahier de rythme | papier réglé, portée | 1·2·3·4 | élevé |
| I | Aqua | revival Y2K 2026 | 1·4 | moyen |
| J | Tracker | Polyend Tracker, Renoise | 1·2·3·4 + le format | très élevé |

(Charges de l'audit : 1 contraste allumé/éteint · 2 barre de titre inerte ·
3 nostalgie du contenant · 4 identité pas appliquée.)

**Trois enseignements que les images ajoutent :**

1. **F · Skin est la découverte de la série.** C'est le cousin *musical* de la
   nostalgie XP — même époque, même bureau, mais vocabulaire d'appareil audio.
   Elle garde l'atout de XP (rétro reconnaissable en une seconde) et remplace
   son argument faible (le bureau Windows). Le Mode Live prouve qu'elle tient
   déjà. F est B poussé d'un cran ; le choix entre les deux revient à décider
   si le cadre Luna doit survivre.
2. **D bute sur un problème réel, visible sur l'image.** La couleur y est déjà
   prise pour marquer le temps (les quatre groupes de la 808), donc l'état
   allumé/éteint doit passer par la matière. Sur la vraie machine c'est une LED
   qui tranche ; à l'écran il faut inventer cet équivalent. Première version
   illisible, corrigée en creux mat contre plein brillant — ça reste le point
   dur de cette direction.
3. **J · Tracker est la seule à remettre en cause le FORMAT et pas la peau.**
   Le temps descend au lieu d'aller à droite : un écran haut et étroit devient
   le bon format, et le téléphone cesse d'être une contrainte. Même non
   retenue, l'idée mérite d'être gardée — c'est la seule réponse structurelle à
   l'arbitrage D4 (test mobile uniquement).

### Les trois premières maquettes

Fichiers : `maquettes/a.html`, `b.html`, `c.html` — **jetables, hors de
`src/`**, rien n'est branché sur le vrai code. Même écran (onglet Rythme),
contenu tenu constant : mêmes 5 lignes, mêmes nombres de pas, même motif
(kick 1&3, snare 2&4, hat plein, clap et shaker vides). Seule la langue
visuelle change.

| | Page | Part des cases |
|---|---|---|
| Aujourd'hui | 1 253px (1,5 écran) | 14 % |
| A · XP resserré | **844px** (1 écran) | 26 % |
| B · Cadre XP + instrument | **844px** | 24 % |
| C · Rupture | **844px** | 25 % |

⚠️ **Le gain d'écran est commun aux trois et ne vient d'aucune des trois
identités** — il vient du traitement de la ligne, identique partout. C'est la
démonstration visuelle du résultat de mesure : la question du look et la
question de la place sont deux sujets distincts.

Ce que les images apprennent en plus :

- **A** — l'écran respire, mais la charge n°1 est intacte : sur fond beige, une
  case vide reste un rectangle pâle en relief, indiscernable d'un contrôle
  désactivé. A règle un problème de place, pas un problème de lecture.
- **B** — cadre strictement identique à aujourd'hui (Bliss, panneaux Luna,
  barre de titre, onglets) ; seul le corps de la fenêtre bascule sur les
  tokens `--amp-*` de `LiveView.svelte:1842-1852`. Pas éteint = creux noir, pas
  actif = émission dans la couleur de la ligne, bandeau LCD vert à la place des
  trois pastilles. Le clap et le shaker vides se lisent enfin « rien ici » et
  non « interdit ».
- **C** — propre, compétent, et **anonyme**. Retire le titre en haut à gauche
  et c'est n'importe laquelle des sept boîtes à rythmes en ligne gratuites de
  la revue. Le coût de C ne se voit pas dans ce qu'elle ajoute, il se voit dans
  ce qu'elle efface.

### Trois directions

- **A — Garder XP, resserrer.** On n'attaque que les 34 %. Plus gros gain
  d'écran mesurable, aucun risque d'identité, mais ne répond pas à la question
  posée.
- **B — Deux couches : cadre XP, plan de travail instrument. ★ recommandée.**
  XP reste le cadre (splash, menus, fenêtres, dialogues, Mode jeu) ;
  l'intérieur du séquenceur devient un panneau sombre à la Mode Live. Répond
  aux charges 1, 3 et 4, rend la nostalgie plus juste (matériel là où l'on
  joue, système là où l'on range), et **coûte peu parce que le vocabulaire
  existe déjà en prod**.
- **C — Sortir de XP.** Cohérence immédiate, mais 225 couleurs, tout
  `src/ui/xp/`, le splash, le Mode jeu, les sons système — et on dépense
  l'unique trait distinctif du projet pour ressembler à sept concurrents
  gratuits.

**Recommandation : B, avec une condition d'ordre.** La première pierre n'est
pas le thème, c'est les 34 %. Repeindre en sombre sans traiter les pastilles
donnerait une version sombre du même écran encombré. Ordre proposé :
(1) pastilles → étiquettes sérigraphiées, panneaux → surcouches ;
(2) corps du séquenceur sur la palette Live, cases éteintes creusées, cases
actives émettrices ; (3) barre de titre réduite à un chevron de repli, le gag
`×` retiré ; (4) `CLAUDE.md` réécrit sur la règle réelle — *XP est le cadre,
l'instrument est sombre*.

**Rien n'est engagé tant que Yann n'a pas tranché entre A, B et C.**

---

## Fichiers critiques pour l'implémentation

- `original/boite-a-rythme-69.html` — source unique de vérité pendant toute la migration (notamment l. 3630–4073 voix, 4197+ scheduler, 4583+ export, 6338+ sérialisation)
- `src/model/types.ts` — le format v2 typé, fondation de tout (stores, moteur, sérialisation, undo)
- `src/engine/AudioEngine.ts` — instance possédant contexte + graphe, clé de l'unification live/offline/jeu
- `src/engine/scheduler.ts` — le scheduler unique, cœur du feel et du déterminisme
- `src/stores/pattern.svelte.ts` — le store central qui remplace les ~60 globales et la sync DOM
