# Plan de réécriture — « Boîte à rythmes » vers Svelte 5 + TypeScript + Vite

> Contexte : réécriture de `original/boite-a-rythme-69.html` (9 289 lignes, fichier unique).
> Analyse détaillée de l'original : voir [ANALYSE-ORIGINAL.md](ANALYSE-ORIGINAL.md).
>
> **Décisions fermes** : Svelte 5 + TS + Vite · distribution double (site + fichier HTML unique via vite-plugin-singlefile) · périmètre complet Atelier + Mode jeu (iso-fonctionnalités puis améliorations) · abandon du code dormant (ambiance splash, verrouillage des modules) · design Windows XP conservé et assumé davantage.

---

## 1. Architecture cible

### Principe directeur

**Le JSON v2 devient le modèle d'état central.** Aujourd'hui, `exportState()` *collecte* l'état depuis le DOM (`el.swing.value`, etc.) ; dans la cible, on inverse : l'état vit dans des stores Svelte typés dont la forme **est** le format v2, l'UI en dérive, et export/import/undo/autosave deviennent triviaux (`JSON.stringify(state)`).

**Le moteur audio est du TS pur, sans import Svelte.** Il reçoit : (a) un `BaseAudioContext` (live `AudioContext` ou `OfflineAudioContext` — même code), (b) un *snapshot* d'état plain-object (via `$state.snapshot()` côté Svelte), (c) un RNG injecté (Math.random en live, seedé en export). Il ne lit jamais le DOM.

### Arborescence

```
boite-a-rythmes/
├─ index.html
├─ vite.config.ts              # 2 modes de build (site / singlefile)
├─ package.json
├─ src/
│  ├─ main.ts
│  ├─ App.svelte               # routing splash / atelier / jeu (switchMode)
│  │
│  ├─ model/                   # ---- ÉTAT (types + sérialisation, zéro audio, zéro DOM)
│  │  ├─ types.ts              # PatternStateV2, DrumRow, SynthRow, SynthGlobal, Voice, GameParams…
│  │  ├─ defaults.ts           # état initial, NEUTRAL_VOICE, MAXSTEPS=32, bornes
│  │  ├─ serialize.ts          # exportState/importState : parse, validation, migration v1→v2
│  │  └─ presets/
│  │     ├─ songs.ts           # les 34 presets (~880 lignes) + textes pédagogiques
│  │     ├─ levels.ts          # les 34 définitions de niveaux + mkLevel
│  │     ├─ voices.ts          # presets de voix synthé (defaultSynthVoice, applyVoicePreset)
│  │     └─ scales.ts          # SCALE_LIBRARY, 12 tonalités, 5 modes
│  │
│  ├─ engine/                  # ---- MOTEUR AUDIO TS PUR (testable, aucun import Svelte/DOM)
│  │  ├─ AudioEngine.ts        # classe : possède ctx + graphe + état runtime (activeOpenHat, voix)
│  │  ├─ graph.ts              # buildGraph(ctx, state) → GraphNodes  (UN SEUL builder live+offline)
│  │  ├─ scheduler.ts          # UN SEUL scheduler : scheduleWindow(from, to, state, rng, emit)
│  │  ├─ clock.ts              # tick live (setInterval ou Worker) vs boucle offline
│  │  ├─ voices/
│  │  │  ├─ drums.ts           # playKick/Snare/Rimshot/Hat + choke + banc 6 osc (l. 3911–4073)
│  │  │  └─ synth.ts           # playSynthNote/PadChord/PadArp/Bass/Melody, glide, strum, budget 40 voix
│  │  ├─ fx.ts                 # driveCurve, bitcrushCurve, softClip, compresseur, limiteurs, impulse réverbe
│  │  ├─ sidechain.ts          # triggerSidechainDuck + ciblage
│  │  ├─ groove.ts             # swing/drag/shift, breakPhase, isFillBar, ghost/fills/rafales
│  │  ├─ theory.ts             # midiToFreq, scaleDegreeFreq, buildChordsForScale, justesse, noms de notes
│  │  ├─ generators.ts         # randomizeSynth/Pad/PitchedLine, progressions, applyRandomRolls
│  │  ├─ rng.ts                # makeSeededRng + interface Rng injectable
│  │  ├─ recorder.ts           # enregistrement live (AudioWorklet, remplace ScriptProcessorNode)
│  │  ├─ render-offline.ts     # renderPattern(state, bars, seed) → AudioBuffer (remplace le hack des 18 globales)
│  │  └─ encode-mp3.worker.ts  # lamejs en Web Worker
│  │
│  ├─ stores/                  # ---- ÉTAT RÉACTIF (runes Svelte 5, fichiers .svelte.ts)
│  │  ├─ pattern.svelte.ts     # $state<PatternStateV2> — LE store central (drum+synth+fx+mix)
│  │  ├─ transport.svelte.ts   # isPlaying, currentBar, playhead par ligne, tempo runtime
│  │  ├─ history.svelte.ts     # undo/redo (pile de snapshots du pattern)
│  │  ├─ game.svelte.ts        # niveau courant, target, essais, verrous, étoiles, besace, progression
│  │  ├─ session.svelte.ts     # autosave localStorage + pseudo joueur
│  │  └─ ui.svelte.ts          # mode (atelier/jeu/splash), fenêtres réduites, vue lin/circulaire
│  │
│  ├─ ui/
│  │  ├─ xp/                   # ---- DESIGN SYSTEM XP (voir §2)
│  │  │  ├─ tokens.css
│  │  │  ├─ XpWindow.svelte, XpTitlebar.svelte, XpMenuBar.svelte, XpMenu.svelte
│  │  │  ├─ XpButton.svelte, XpCheckbox.svelte, XpSelect.svelte, XpTabs.svelte
│  │  │  ├─ XpSlider.svelte    # port du curseur ergonomique maison (~170 l.)
│  │  │  ├─ XpBalloon.svelte   # tooltip bulle XP
│  │  │  └─ actions/longpress.ts, actions/draggable.ts
│  │  ├─ sequencer/
│  │  │  ├─ StepGrid.svelte    # grille générique (délégation d'événements, 1 listener/grille)
│  │  │  ├─ StepCell.svelte / rendu paquets (renderPacketizedRow)
│  │  │  ├─ StepCircle.svelte  # UN SEUL composant cercle canvas (atelier + jeu, props couleurs/édition)
│  │  │  ├─ DrumRow.svelte, SynthRow.svelte, PadRow.svelte
│  │  │  └─ FilterCurve.svelte, VoicePreview.svelte  # les 2 canvas de preview
│  │  ├─ atelier/
│  │  │  ├─ AtelierView.svelte, TransportBar.svelte, GrooveModule.svelte,
│  │  │  ├─ TimbreModule.svelte, FxModule.svelte, SynthModule.svelte (×1, instancié 3 fois !),
│  │  │  ├─ HarmonyModule.svelte, MixModule.svelte, ExportModule.svelte, PresetPicker.svelte
│  │  ├─ game/
│  │  │  ├─ GameView.svelte, GameMap.svelte, LevelBar.svelte, GuessGrid.svelte,
│  │  │  ├─ ResultDialog.svelte (roasting), BagWindow.svelte
│  │  └─ splash/SplashView.svelte   # sans l'ambiance dormante — juste déverrouillage audio + choix de mode
│  └─ styles/ (fonts fontsource, global.css, theme-luna.css, theme-noir.css)
└─ tests/  (miroir de engine/ et model/)
```

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

### Pousser le look XP plus loin (sans casser le mobile)

- **Fenêtres déplaçables sur desktop uniquement** (`actions/draggable.ts`, activé par media query pointer:fine ; en mobile les fenêtres restent en flux vertical comme aujourd'hui). Bonus faible coût, grand effet.
- **Sons système synthétisés** (pas de fichiers : petits chirps Web Audio « à la XP » sur ouverture/erreur/étoile gagnée — réutilise `playChime`), désactivables.
- **Curseurs souris XP** (curseurs CSS inline SVG, desktop uniquement), **bulles d'aide XpBalloon** pour remplacer les tooltips natifs, **écran de démarrage** façon boot pour le splash, éventuellement une **barre des tâches** en bas sur desktop montrant les fenêtres réduites.
- Police : Tahoma avec fallback ; via fontsource, une pixel-font d'appoint pour les titres si souhaité (auto-hébergée).

---

## 3. Ordre de migration (chaque phase laisse un état qui tourne)

Tailles relatives sur un total 100 %.

**Phase 0 — Socle (≈5 %).** Scaffold Vite + Svelte 5 + TS strict. `vite.config.ts` à deux modes : `build` (site) et `build --mode singlefile` (vite-plugin-singlefile, workers en `?worker&inline`). Fontsource, ESLint/Prettier, Vitest, CI GitHub Actions (lint + test + 2 builds). *Livrable : page vide XP-beige déployée, les deux builds passent.*

**Phase 1 — Données + modèle (≈12 %).** Extraction **quasi telle quelle** : `songs.ts`, `levels.ts`, `scales.ts`, `voices.ts` (copier-coller typé depuis l. 5252+, 7295+ ; garder les textes historiques). Écriture de `model/types.ts` (la forme v2 exacte de l. 6338–6410), `defaults.ts`, `serialize.ts` avec migration v1→v2 (reprendre la logique d'`importState` l. 6423+ : tolérance aux champs manquants, clamp). *Livrable : tests Vitest — round-trip export/import, chargement des 34 presets, migration d'un fichier v1 réel.* C'est la phase qui sécurise tout le reste.

**Phase 2 — Moteur audio pur (≈25 %, la plus grosse).** Port des voix (l. 3630–4073 : quasi tel quel, ce code est bon), fx/courbes (l. 3653–3910), théorie (l. 6668–6786), synthé (l. 6805–7078), groove, générateurs, RNG. Réécriture : `graph.ts` (fusion de `ensureAudio` + du corps d'`exportPatternAsMp3`), `scheduler.ts` (fusion des 3 schedulers), `AudioEngine.ts`. *Livrable : une page de dev « bench » minimaliste (hors design system) qui joue un preset via le moteur ; tests Vitest sur théorie/générateurs/groove ; test de déterminisme : `scheduleWindow` sur tout un pattern avec seed fixe → snapshot de la liste d'événements.*

**Phase 3 — Atelier UI + design system (≈25 %).** Tokens + composants XP, puis les modules atelier branchés sur `pattern.svelte.ts`. Réécriture complète de la couche DOM (fin de l'innerHTML massif et de la reconstruction totale par clic : Svelte ne re-rend que la cellule touchée ; délégation d'événements par grille). `StepCircle.svelte` unifié, previews canvas. *Livrable : Atelier iso-fonctionnel jouable, comparaison A/B possible avec l'original.*

**Phase 4 — Export / import / enregistrement (≈12 %).** `render-offline.ts` (OfflineAudioContext + `buildGraph` partagé + seed), `encode-mp3.worker.ts` (lamejs npm), `recorder.ts` (AudioWorklet), import/export JSON branché sur `serialize.ts`. *Livrable : MP3 identique à l'oreille à l'original ; test de déterminisme par hash de buffer (voir §4) ; export WAV live fonctionnel.*

**Phase 5 — Mode jeu (≈13 %).** Générateur de niveaux (l. 7125–7466, quasi tel quel), similarité (l. 6584+), carte, besace/progression localStorage, roasts, thème noir. Réutilise StepGrid/StepCircle/AudioEngine. *Livrable : campagne 34 niveaux iso-fonctionnelle, progression existante relue (mêmes clés localStorage).*

**Phase 6 — Améliorations (≈8 %).** Undo/redo, autosave, raccourcis, ARIA, fenêtres déplaçables, sons système, PWA optionnelle (détail §4).

**Ratio port/réécriture :** ~55 % du JS se porte quasi tel quel (données, voix, courbes, théorie, générateurs, similarité, textes) ; ~45 % est réécrit (tout le DOM/sync, schedulers, construction de graphe, export).

---

## 4. Améliorations au-delà de l'iso-fonctionnalité

- **ScriptProcessorNode → AudioWorklet** (recommandé plutôt que MediaRecorder : WAV sans perte, pas de dépendance codec navigateur, latence maîtrisée ; MediaRecorder produirait du webm/opus, changement de fonctionnalité). Worklet inline (`?worker&inline`-équivalent via Blob URL) pour rester compatible singlefile.
- **lamejs** : `@breezystack/lamejs` en dépendance npm, importée **dynamiquement dans un Worker** au premier clic export — plus de script CDN bloquant, plus de `typeof lamejs === 'undefined'`. En build singlefile, le worker est inliné.
- **Polices auto-hébergées** via fontsource (plus de Google Fonts CDN).
- **Raccourcis clavier** : Espace lecture/stop, B break, Ctrl+Z/Y, 1/2/3 mute lignes, flèches sur cellule focusée, ? = aide-mémoire dans une XpWindow.
- **Accessibilité** : grille en `role="grid"`/`gridcell` + `aria-pressed`/labels par pas (« Kick, pas 5, actif, roll ×2 »), focus visible XP (pointillé 1px, très dans le thème), sliders ARIA, `prefers-reduced-motion` pour la loupe et les animations.
- **Autosave** : snapshot du pattern (format v2) debouncé 1 s dans localStorage + proposition « Restaurer la session précédente ? » au démarrage — sans casser la philosophie actuelle (pas d'écrasement silencieux).
- **Undo/redo** quasi gratuit : `history.svelte.ts` empile `$state.snapshot(pattern)` (≤100 entrées, coalescence des drags de slider).
- **Robustesse** : `unhandledrejection` en plus de `onerror`, plus d'`escapeHtml` nécessaire (Svelte échappe par défaut), scheduler optionnellement piloté par un Worker-clock (immunisé au throttling arrière-plan ; on garde la pause sur `visibilitychange` en réglage).
- **Tests** : Vitest sur `model/` et `engine/` (théorie musicale, buildChordsForScale, générateur de niveaux avec seed, similarité, sérialisation/migration, groove). **Déterminisme d'export en 2 étages** : (1) rapide, en CI — snapshot JSON de la liste d'événements schedulés à seed fixe (pur, sans Web Audio) ; (2) profond, Playwright — rendu OfflineAudioContext réel dans Chromium, hash SHA du Float32Array (stable pour une même version de navigateur, épinglée en CI). Le (1) attrape 95 % des régressions pour presque rien.
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

1. **✅ Réduire tous les paramètres.** Passe de densité sur `XpSlider`
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
  Vérifié par script Playwright : Tone/Chorus/Vibrato/Détune/Sub/Ouv. et
  Ferm. filtre poussés à des valeurs franches sur la Nappe, bourdon activé,
  lecture 5s sans erreur console.

---

## Fichiers critiques pour l'implémentation

- `original/boite-a-rythme-69.html` — source unique de vérité pendant toute la migration (notamment l. 3630–4073 voix, 4197+ scheduler, 4583+ export, 6338+ sérialisation)
- `src/model/types.ts` — le format v2 typé, fondation de tout (stores, moteur, sérialisation, undo)
- `src/engine/AudioEngine.ts` — instance possédant contexte + graphe, clé de l'unification live/offline/jeu
- `src/engine/scheduler.ts` — le scheduler unique, cœur du feel et du déterminisme
- `src/stores/pattern.svelte.ts` — le store central qui remplace les ~60 globales et la sync DOM
