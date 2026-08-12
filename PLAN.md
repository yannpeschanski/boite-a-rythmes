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
- ⭐ **Partage par URL** : le pattern (format v2) compressé dans le hash de l'URL → « envoie ton rythme à un pote » sans fichier. Trivial une fois l'état sérialisable, et transforme l'app en objet social.
- ⭐ **Tap tempo** : taper le tempo sur un bouton (ou la barre espace ×4).
- **Métronome + précompte** avant l'enregistrement WAV.
- ⭐ **Sons système XP** synthétisés (démarrage, erreur, « tada » sur 3 étoiles au jeu) — déjà prévu §2, ça mérite d'être une vraie feature désactivable.
- **Générateur euclidien** : bouton « répartir N coups uniformément » par ligne (algorithme de Bjorklund, ~30 lignes) — pédagogique ET utile, très dans l'esprit polyrythmie de l'app.

### Moyennes (une à quelques journées)
- ⭐ **Mode Song / chaînage de patterns** : 4 slots A/B/C/D + une timeline simple (AABA…) — la demande n°1 de toute boîte à rythmes. Le modèle d'état sérialisable rend ça peu coûteux (un slot = un `PatternStateV2`).
- ⭐ **Nouvelles voix drum** : clap 909 (bursts de bruit décalés), tom (sinus pitch-drop plus lent), cowbell 808 (2 oscillateurs carrés 540/800 Hz), shaker — le moteur actuel les accueille sans changement d'architecture (une ligne = une voix + un pattern).
- ⭐ **Défi du jour** : un niveau généré seedé par la date (même rythme pour tout le monde, façon Wordle/Motus quotidien), avec partage du score en emojis 🟩🟨 — prolonge naturellement le mode jeu Motus existant.
- **Visualiseur façon Winamp** dans une fenêtre XP déplaçable (oscilloscope/spectre sur AnalyserNode, très peu de code, très fort en nostalgie).
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
- catalogue de paramètres étendu à 12 nouveaux axes (`liveActions.ts`,
  `LIVE_AXES`) : `saturation`/`bitcrush`/`compression` (bus DRUM
  uniquement), `volume`, `delay-feedback`, `sidechain-depth`, et
  `cutoff`/`resonance` par ligne synthé (bass/pad/melody, une entrée
  chacune) — appliqués directement sur les nœuds du graphe déjà construits
  (`AudioEngine.setLiveSaturation`/`setLiveBitcrush`/`setLiveCompression`/
  `setLiveVolume`/`setLiveDelayFeedback`/`setLiveSidechainDepth`/
  `setLiveSynthCutoff`/`setLiveSynthResonance`), jamais écrits dans le
  pattern sauvegardé ; cutoff/résonance posés par note (chaque voix synthé
  crée son propre filtre au déclenchement) plutôt que sur un nœud permanent,
  donc appliqués via un override par ligne relu à chaque fenêtre de
  scheduling (`withLiveSynthOverrides`) ;
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

**En réserve, pas prioritaire** : vibration (`navigator.vibrate`) à chaque
trigger ; snapshot des assignations rappelable par appui long ; undo léger
sur les triggers en direct ; mode duo (deux téléphones connectés via le
partage par URL existant, `stores/share.ts`).

### 7.2 Atelier

1. **Réduire tous les paramètres** (sliders groove/effets/harmonie) pour
   libérer de la place et mieux voir les séquenceurs — prolonge le
   diagnostic ergonomie déjà fait sur mobile (peu d'espace pour scroller,
   transport sticky). Prêt à coder, pas de décision bloquante.
2. **⚠️ Retirer le "séquenceur kick" de la partie Synthé.** Formulation
   reçue telle quelle de Yann, jamais clarifiée — probablement l'anneau/
   rappel batterie de `TransportRings` (visible dans la barre sticky même
   sur l'onglet Synthé) plutôt qu'un vrai séquenceur dupliqué, mais la
   demande vise spécifiquement le kick. **À confirmer avec Yann avant de
   coder.**

### 7.3 Audit de parité avec l'original — jamais traité

Repérés dans `ANALYSE-ORIGINAL.md`, identifiés il y a longtemps, jamais
portés. Aucune décision bloquante, prêts à coder dans l'ordre :

1. **Son de victoire + flash des cases** en Mode jeu (original `playWinSound`
   l. 8336, flash des cases à la victoire) — absent du port actuel
   (`ResultDialog.svelte`/`GuessGrid.svelte`).
2. **Bouton "Traduire l'arpège en Mélodie"** (original l. 3388–3435) : écrit
   réellement le motif de l'arpégiateur de la nappe dans la ligne Mélodie,
   plutôt que de le laisser sonner seulement en live (`SynthModule.svelte`).
3. **Aide à la production contextuelle** (original l. 1141–1147, 8903–8972) :
   conseil contextuel + liste des modules de réglage jamais touchés dans la
   session (en mémoire, pas persisté) — le plus gros des trois, à cadrer
   avant de coder (où l'afficher dans le nouveau design system XP).

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

---

## Fichiers critiques pour l'implémentation

- `original/boite-a-rythme-69.html` — source unique de vérité pendant toute la migration (notamment l. 3630–4073 voix, 4197+ scheduler, 4583+ export, 6338+ sérialisation)
- `src/model/types.ts` — le format v2 typé, fondation de tout (stores, moteur, sérialisation, undo)
- `src/engine/AudioEngine.ts` — instance possédant contexte + graphe, clé de l'unification live/offline/jeu
- `src/engine/scheduler.ts` — le scheduler unique, cœur du feel et du déterminisme
- `src/stores/pattern.svelte.ts` — le store central qui remplace les ~60 globales et la sync DOM
