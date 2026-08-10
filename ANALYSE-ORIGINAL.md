J'ai lu l'intégralité du fichier. Voici le rapport.

---

# Rapport d'analyse — `original/boite-a-rythme-69.html`

**Chiffres clés** : 9 289 lignes, 497 Ko, un seul fichier. CSS `11–1032` (≈1020 l.), HTML `1034–2026` (≈990 l.), JS `2028–9287` (≈7250 l., dont **~880 l. de données de presets** et **~170 l. de données de niveaux**).

Attention : ce n'est **pas seulement** une boîte à rythme. C'est une **appli à deux modes** — un **Atelier** (séquenceur drum + synthé complet) et un **Mode jeu** (campagne de 34 niveaux type Motus rythmique, avec progression, étoiles et inventaire), plus un **écran d'accueil** (splash).

---

## 1. Fonctionnalités (exhaustif)

### 1.1 Structure générale de l'app
- **3 écrans** : splash `#splashScreen` (1036), Atelier `#view-drum` (1097), Mode jeu `#view-game` (1922). Bascule par `switchMode()` (9066). Vue par défaut = **jeu** (`currentView = 'game'`, 9064).
- Splash : saisie d'un **pseudo** (1052) qui devient l'identité du joueur (besace + progression), 2 boutons d'entrée, visualiseur canvas + ambiance DnB.
- **L'ambiance sonore du splash est désactivée** : `SPLASH_AMBIENCE_ENABLED = false` (8821) → tout le bloc `8737–8886` (pattern amen break 16 pas @174 BPM, `splashScheduler`, `drawSplashViz`, analyser FFT) est du **code mort actif**.
- Bannière d'erreur fatale globale sur `window.onerror` (2032–2038).
- `visibilitychange` → coupe toute lecture quand l'onglet passe en arrière-plan (9100).

### 1.2 Séquenceur batterie (Atelier)
- **3 pistes** : kick / snare / hat (`rows`, 2127–2131).
- **Polyrythmie par ligne** : chaque ligne a sa propre subdivision, slider **1 → 32 pas** (1205–1216), `MAXSTEPS = 32` (2125). Défauts 4/4/3.
- **États par pas** : kick = booléen ; snare = 0/1(normal)/**2 = rim shot** ; hat = 0/1(fermé)/**2 = ouvert** (avec **choke** automatique, `chokeOpenHat` 3996).
- **Rafales (rolls) x1→x4** par pas, sur les 3 lignes (clic droit ou appui long, `cycleRollDebounced` 3038).
- **Deux représentations éditables** :
  - **linéaire** (grille de cases, `buildLinearRow` 3058),
  - **circulaire** (canvas 3 anneaux concentriques, `drawCircle` 5102, clic/clic-droit/long-press pour éditer, `stepFromEvent` 5150).
- **Tempo** 40–200 BPM par pas de 10 (1191). `barDuration() = 240/BPM` → mesure = 4 temps.
- **Groove batterie** : **Swing** 0–75 % (retarde les pas impairs), **Traîne/drag** 0–30 % (retard fixe de tous les pas), **Décalage (shift)** par ligne −50→+50 % (1223–1248).
- **Variation humaine** (1253–1294) : **Rafales spontanées** 0–100 %, **Fill toutes les N mesures** (désactivé/2/4/8), **Intensité du fill** 0–100 %, **Ghost notes** 0–40 % (sur une ligne cible `ghostTargetRow`), **Vélocité aléatoire** 0–100 %.
- **Bouton 🫨 Break** (2024) : à la prochaine mesure, 75 % dépouillé (seul le hat continue) + 25 % explosion (fill + rafales forcées). `BREAK_STRIP_RATIO` 2115, `breakPhaseFor` 2396.
- **Timbre par ligne** : Pitch (±24 demi-tons), Attack (0–100), Decay (±50), Tone (1310–1332) → `pitchMult`/`decayMult`/`attackAdd` (3645–3647).
- **Filtre passe-bas par ligne** 200–20000 Hz (1345–1358, `drumFilterDest` 3902).
- **Effets drum de bus** : Saturation (waveshaper tanh), Compression (1 curseur qui pilote tous les params du DynamicsCompressor + makeup gain), Bitcrush (quantification par courbe en escalier) (1362–1385, 3652–3709).
- **Envois réverbe/delay par ligne** drum (1388–1425).
- **Mix général** : volume + mute par ligne (6 lignes), **volume général** 50–150 %, case **Limiteurs de sécurité** (1877–1908).
- **Indicateur « le plus proche de ce que tu joues »** : compare en continu le pattern courant aux 34 presets, **y compris en testant les 6 permutations de lignes** (`similarityScore` 6598, `updateClosestMatch` 6628, throttlé 300 ms).
- **Aide à la production** (1141–1147, 8903–8972) : conseil contextuel + liste des modules de réglage jamais touchés dans la session (en mémoire, pas persisté).

### 1.3 Atelier Synthé (3 lignes mélodiques)
- **3 lignes** : Basse / Nappe (pad) / Mélodie (`synthRows` 2231).
- Modèle **par degrés de gamme**, pas par notes fixes : basse/mélodie = `{degree:1-7, octave:-1/0/+1}` ; nappe = index d'accord ou −1.
- **Grille indépendante par ligne** : « cycles (mesures) » 1–16 et « notes sur le cycle » 1–**128** (1459–1497). `stepsForLine`/`stepDurForLine` (6781/6786).
- **Regroupement par paquets de 8** au-delà de 8 pas, avec bouton de repli (`renderPacketizedRow` 3147, `PACKET_SIZE`/`PACKET_THRESHOLD` 3145).
- **Gamme & harmonie réglables** : tonalité (12), 5 modes (`SCALE_LIBRARY` 6661 : majeur, mineur naturel, dorien, phrygien, mixolydien), **nombre d'accords 4→7** ; accords **générés dynamiquement** en triades diatoniques avec chiffrage romain et qualité déduite (`buildChordsForScale` 6726, `chordQualityAt` 6709). Ordre de priorité I-IV-V-vi puis ii-iii-vii° (6700).
- **Indicateur de justesse** par note : point vert = note de l'accord en cours, ambre = note de passage (`justesseForStep` 3457).
- **Moteur de voix** (`playSynthNote` 6839) par ligne : onde (sine/tri/square/saw), attaque + release avec **forme linéaire ou exponentielle**, filtre passe-bas + résonance, **enveloppe de filtre** (ouverture/fermeture, « pluck »), **sub-oscillateur**, **détune + mix**, **chorus** (delay modulé par LFO), **vibrato** (LFO), **tone** (drive waveshaper).
- **Bibliothèque de presets de voix par ligne** : `SYNTH_VOICE_PRESETS` (2184) — 5 basses, 6 nappes, 5 mélodies.
- **Aperçus canvas** : forme d'onde animée statique (`drawSynthVoicePreview` 2740) et **courbe de réponse du filtre calculée analytiquement** (`biquadLowpassResponseDb` 2634, `drawFilterCurve` 2651).
- Bouton **▶ Tester** la voix par ligne (`testSynthVoice` 2586).
- **Groove synthé indépendant** : swing / traîne propres au synthé, décalage par ligne, **glide** (portamento) par ligne, **étalement (strum)** sur la nappe (1719–1780).
- **Arpégiateur de nappe** : actif/motif (montant/descendant/montant-descendant/aléatoire)/vitesse (2/4/8 notes par pas) — `playPadArp` 7036, `arpNoteOrder` 7017 ; plus un bouton **« Traduire l'arpège en notes sur la Mélodie »** qui écrit réellement l'arpège dans la ligne mélodie (3388–3435).
- **Sidechain** : déclencheurs kick et/ou snare, cibles basse/nappe/mélodie (cases à cocher), profondeur + vitesse de retour (1677–1711, `triggerSidechainDuck` 3825).
- **Remplissage aléatoire harmonieux** : global (`randomizeSynth` 3531) ou par ligne (bouton 🎲 par ligne, `randomizeLineOnly` 3556), piloté par « Taux de remplissage », avec **progressions d'accords prédéfinies** (`CHORD_PROGRESSIONS` 3469) et choix de notes d'accord vs notes de passage.
- **Envois réverbe/delay par ligne** synthé (1783–1820).
- **Réglages globaux réverbe/delay** : taille de réverbe (impulsion synthétisée, durée 0,5→3,5 s), division du delay synchronisée au tempo (1/16, 1/8, croche pointée, 1/4), feedback (1847–1874).

### 1.4 Audio, sons
- **100 % synthèse Web Audio, aucun sample, aucun fichier audio externe.**
  - **Kick** : oscillateur sinus avec pitch-drop exponentiel 140→38 Hz (3911).
  - **Snare** : bruit blanc (buffer généré, `ensureNoiseBuffer` 3630) filtré en bande passante + oscillateur triangle 190 Hz (3935).
  - **Rimshot** : bruit bandpass 3200 Hz Q=3.5 très court + square 900 Hz (3964).
  - **Hat** : **banc de 6 oscillateurs carrés désaccordés** (ratios 808/909 `HAT_OSC_RATIOS` 4010, fondamentale 40 Hz) → bandpass → highpass (4012–4064). Versions fermée et ouverte.
  - **Synthé** : oscillateurs + biquad + enveloppes (voir ci-dessus).
  - **Réverbe** : convolver avec impulsion **générée** (bruit × décroissance exponentielle, `buildSynthReverbImpulse` 3738).

### 1.5 Export / enregistrement / sauvegarde
- **Export MP3** via **lamejs** (CDN) : rendu **OfflineAudioContext** mono 44,1 kHz, durée cible ~20 s (`barsForMp3Export` 4318), PRNG à graine fixe → **déterministe**, encodage par blocs de 1152 avec yield et **progression affichée**, téléchargement automatique (`AudioExport.exportPatternAsMp3` 4583).
- **Enregistrement en direct WAV** : `LiveRecorder` (4761) — tap `ScriptProcessorNode` sur la sortie finale pendant une lecture réelle, ~60 s cible, écriture d'un en-tête RIFF/PCM 16 bits mono (`audioBufferToWavBlob` 4537).
- **Sauvegarde / chargement de patterns en JSON** : `exportState` (6338) / `importState` (6423), **format versionné (`version: 2`)** avec rétrocompatibilité v1 (drum seul), snare booléen → 0/1/2, ancien format de sidechain string → cases à cocher.
- **localStorage** (2 clés seulement) :
  - `boite-a-rythme:besaces` (7502) — inventaire par joueur,
  - `boite-a-rythme:progression` (8172) — `{ pseudo: { level, stars:{} } }`.
  - **Aucune sauvegarde automatique du pattern de l'Atelier** en localStorage.

### 1.6 Presets
- **34 presets de morceau** (`PRESETS` 5252–6126), rangés en 4 catégories (`optgroup`) : Hip-hop/trap, Électronique/club, Funk/soul/jazz, Latin/Afro/Caribbean, Autre.
- Chaque preset porte : tempo, swing, drag, effets globaux, ghost/spontRoll/fill, les 3 patterns drum avec subdiv/shift/volume/timbre, **une voix synthé par ligne**, une **harmonie** (tonalité + mode + nb d'accords), une **grille synthé**, un **`noteSeed`** (remplissage synthé déterministe), des **`synthFx`** (envois, glide, strum, rollRate), un **sidechain**, et deux textes éditoriaux (`history` = contexte historique, `demo` = modules illustrés).
- Case **« Garder le synthé actuel »** au chargement d'un preset (1154).

### 1.7 Mode jeu (campagne)
- **34 niveaux** (`LEVELS` 7295–7463), une seule séquence continue, chaque niveau introduisant **un** concept : placement kick → +snare → +hat → preset → variante → subdivision → rafale → swing → traîne → ghost → fill → décalage → polyrythmie → mesure longue → cross-rhythms 4:3 (8v6, 16v12, 32v24) → tout combiné.
- **Deux types de niveaux** : rythme **généré** (`genLevelRhythm` 7172, ancrages sur positions fortes `strongPositions` 7131) ou **reproduction d'un preset réel** (`presetForLevel` 7213), éventuellement « modifié pour l'occasion » (shift forcé, ghost/fill ajoutés).
- **Boucle Motus** : écouter la cible / poser sa version / **Vérifier** → les cases exactes (état **et** rafale) se **verrouillent** avec ✓ ; compteur « placées/attendues » par ligne ; badges ◀/▶ pour le décalage ; **Voir la solution** (révèle en ○, 0★).
- **Étoiles** : 3★ du 1er coup, 2★ en 2–3, 1★ au-delà, 0★ si abandon (`starsForAttempts` 8370). Déblocage du niveau suivant à ≥1★.
- **Carte des niveaux** (grille 5 colonnes, cadenas + étoiles, `renderGameMap` 8250).
- **Besace** : 30+ objets absurdes (`BAG_ITEMS` 7524), 2 objets pour un sans-faute, lot de consolation en cas d'abandon ; panneau avec regroupement des doublons et compteur « X/N découverts ».
- **Roasting** : messages moqueurs combinés sur 3 axes (difficulté, a-t-on réécouté sa version, nombre d'écoutes de la boucle) — `ROAST_DIFFICULTY`/`ROAST_GUESS`/`ROAST_LOOP` 7573–7618, `composeRoast` 8350.
- **Sons de victoire** (arpèges, `playWinSound` 8336), flash des cases.
- **Timbre aléatoire par palier** appliqué à la cible, jamais deviné (`randomVoice` 7234, `VOICE_TIERS` 7241).
- **Contexte musical** après victoire : preset le plus proche + son histoire (`gameFindClosestPreset` 7795).
- **« Sauvegarde-le dans l'Atelier »** : transfère le rythme trouvé dans l'Atelier et bascule de vue (`saveGameRhythmToAtelier` 8488).
- **Pseudo « master »** (insensible à la casse) = tous les niveaux à 3★ (8201).
- **Déblocage progressif des modules de l'Atelier** (Drum n.1 / Synthé n.13 / Général n.27) — **codé mais désactivé** : `moduleUnlocked()` renvoie `true` en dur (3598–3601).

### 1.8 Interactions / ergonomie
- **Pas de raccourcis clavier de jeu** (aucun mapping touche→son). Seules touches gérées : Entrée sur le pseudo splash (8899) et Entrée dans la saisie numérique d'un curseur (9279).
- **Curseurs « ergonomiques » maison** (9115–9285) : le `<input type=range>` natif est rendu `pointer-events:none` et enveloppé dans un `<span>` qui capte tout le geste ; **loupe flottante** au-dessus du doigt, **mode précis** en glissant vers le bas (l'axe bascule à la verticale, sensibilité progressive), **tap sur la valeur = saisie clavier**. Environ 170 lignes très commentées.
- **Long-press** générique (`attachLongPress` 2996, 480 ms, tolérance 10 px) + `contextmenu`, avec debounce anti-double-déclenchement (3037, 7950).
- **Quicknav sticky** Drum/Synthé/Général (1135) + menu « Affichage ».

---

## 2. Architecture JS

### 2.1 Organisation générale
- **Deux `<script>`** : le premier (2028–2039) ne fait qu'installer le handler `window.onerror` ; le second (2040–9287) est **une seule IIFE `(function(){ 'use strict'; ... })()`** de ~7 250 lignes.
- **Aucune classe. Aucun module. Aucun framework.** Uniquement des fonctions globales (au sens du closure) + deux objets-namespace littéraux : `AudioExport` (4387) et `LiveRecorder` (4761).
- **État global** : ~60 variables `let` au niveau du closure (2043–2125) + les gros objets d'état `rows` (2127), `synthRows` (2231), et les globales du jeu (`gameTarget`, `gameGuess`, `gameLocked`, `gameRevealed`, `gameParams`, `gameFlavor`, `gameVoice`, `gameSubdiv`, … 7467–7496).
- **Cache DOM** : objet `el` (2249, ~50 entrées, Atelier) et objet `gEl` (7620, ~25 entrées, jeu). Le reste passe par des `document.querySelector('.classe[data-row="..."]')` **partout**, à chaque événement.
- **Listeners** : quasi tous attachés directement au chargement via `document.querySelectorAll('.xxx').forEach(...)`, un par curseur ; les cases de grille reçoivent leurs listeners **à chaque reconstruction** de ligne (`buildLinearRow`, `buildGameRow`) — pas de délégation d'événements. Deux exceptions en délégation : `document.addEventListener('input', ...)` pour l'aide à la production (8932) et le clic global qui ferme les menus XP (8987).

### 2.2 Grandes sections du script (dans l'ordre)
| Lignes | Contenu |
|---|---|
| 2043–2135 | État audio global + `rows` |
| 2136–2247 | Voix synthé par défaut, presets de voix, `synthRows` |
| 2249–2402 | Cache `el`, ~40 accesseurs de réglages (`swingAmount()`, `dragAmount()`…) |
| 2404–2600 | Listeners drum (tempo, subdiv, shift, vol, mute, timbre, filtre) |
| 2601–2890 | Aperçus canvas (onde + courbe de filtre), listeners voix synthé |
| 2890–2994 | Effets drum, mix final, réverbe/delay partagés, sidechain, harmonie |
| 2996–3130 | Long-press, vue linéaire drum |
| 3131–3435 | Rendu des lignes synthé, paquets, cycles/subdivisions, arpège→mélodie |
| 3437–3612 | Justesse, remplissage aléatoire harmonieux, verrous de modules |
| 3629–4065 | **Synthèse audio drum** (kick/snare/rim/hat) |
| 4067–4169 | Logique de déclenchement **partagée live/offline** |
| 4171–4364 | **Scheduler** |
| 4366–4750 | `AudioExport` (rendu offline, MP3, WAV) |
| 4752–4883 | `LiveRecorder` |
| 4885–5076 | `stopPlayback`, `ensureAudio` (construction du graphe), transport |
| 5078–5218 | Éditeur circulaire + boucle `requestAnimationFrame` |
| 5230–6335 | **Données des 34 presets** + chargement |
| 6337–6581 | Sauvegarde/chargement JSON |
| 6583–6642 | Indicateur du preset le plus proche |
| 6644–7114 | **Théorie musicale + moteur de voix synthé** |
| 7116–7463 | Générateur de niveaux + **données des 34 niveaux** |
| 7467–8734 | **Mode jeu** (état, scheduler, grille, cercle, progression, récompenses, vérification) |
| 8737–8901 | Splash (désactivé) |
| 8903–8972 | Aide à la production |
| 8974–9061 | Chrome Windows XP (menus, boutons de fenêtre) |
| 9063–9113 | Bascule de vue + init finale |
| 9115–9285 | Curseurs ergonomiques (IIFE imbriquée) |

### 2.3 Gestion du timing audio
Modèle **lookahead classique (Chris Wilson)**, correctement implémenté :
- `setInterval(scheduler, LOOKAHEAD)` avec **`LOOKAHEAD = 25 ms`** (2123) et **`SCHEDULE_AHEAD = 0.25 s`** (2124, élargi depuis 0.12 pour tolérer les à-coups du thread principal).
- Chaque ligne a son propre curseur `nextStepTime` / `stepIndex` ; boucle `while(row.nextStepTime < now + SCHEDULE_AHEAD)`. Tout est programmé sur l'horloge `audioCtx.currentTime`, jamais via `setTimeout`.
- **Trois schedulers distincts et dupliqués** : `scheduler()` (4197, Atelier), `gameScheduler()` (7863, Mode jeu), `splashScheduler()` (8758, splash).
- **Curseur visuel découplé** : les événements sont poussés dans une file (`playheadQueue` / `gamePlayheadQueue`) puis consommés à chaque frame `requestAnimationFrame` **en comparant à l'horloge audio** (`processPlayheadQueue` 4180). Bien pensé.
- Boucle rAF unique `loop()` (5200) qui, selon la vue active, dessine le cercle **seulement si `isPlaying` ou si un flag `dirty` est levé** (`atelierCircleDirty` 2408, `gameCircleDirty` 7926).
- `latencyHint: 'playback'` (4934) choisi explicitement pour la robustesse Bluetooth, avec un long commentaire.
- **Budget de voix** : `MAX_SYNTH_VOICES = 40` (6821) ; au-delà, chorus et sub sont sautés sur les nouvelles notes. **Plafond de release** relatif à la durée de note (6848). Registre `activeSynthOscillators` (Set) pour couper réellement au Stop (6829–6838).

### 2.4 Graphe audio (`ensureAudio` 4916)
```
[note kick/snare/hat] → (filtre LP optionnel) → drumLineGain[x] ─┬→ masterGain(0.7) → sat → crush → comp → makeup ─┐
                                                                 ├→ lineReverbSend[x] → convolver ───────────────┤
                                                                 └→ lineDelaySend[x]  → delay(+feedback) ────────┤
                                                                                                                  ├→ finalMixBus
[note bass/pad/melody] → synthLineGain[x] → limiteur ligne → softClip ─┬→ duckGain (sidechain) → synthGain(0.7) ──┤
                                                                        ├→ reverbSend → convolver ────────────────┤
                                                                        └→ delaySend  → delay ───────────────────┘
finalMixBus → limiteur final → softClip(tanh, 4x) → finalGainNode → destination
```
Le même graphe est **reconstruit à l'identique, à la main**, dans `exportPatternAsMp3` (4629–4700).

---

## 3. UI / design

### 3.1 Le look Windows XP
- **Scopé à `#view-drum`** uniquement (commentaire explicite 564–572) : l'Atelier redéfinit les variables CSS `--panel/--line/--text/--muted` (573–584) pour reteinter d'un coup tous les composants existants, passe en police Tahoma/Noto Sans et casse normale (588–593).
- **Fond de page** : dégradé « colline Bliss » — 2 radial-gradients verts + 1 linear-gradient ciel bleu, `background-attachment: fixed` (19–29).
- **Barre de titre XP** `.xp-atelier-titlebar` (600–622) : dégradé bleu Luna en 5 stops, icône dégradée, texte blanc avec ombre, boutons `_ □ ×` en dégradé avec le × rouge.
- **Barre de menu** `.xp-atelier-menubar` (623–639) : Fichier / Édition / Affichage / `?`, avec `.xp-dropdown` en `position:absolute`, surlignage bleu `#3169d4` au survol.
- **Boîte « À propos »** modale style XP (642–651) et **faux écran d'extinction** au clic sur × (654–659).
- **Les 3 modules deviennent chacun une petite fenêtre** : le bandeau `.zone-divider` coloré sert de barre de titre (coins arrondis en haut) et le `.module-section` qui suit devient le corps bordé de la même couleur (672–719). Ambre = Drum, violet = Synthé, teal = Général.
- **Cases de séquenceur en boutons XP** (relief in/out), **curseurs** avec pouce 3D custom (`::-webkit-slider-thumb` 792, `::-moz-range-thumb` 804), **cases à cocher** custom (842–853).
- **Mode jeu** : chrome XP purement décoratif et **plus sombre** (`#view-game` 915–1031, `.xp-titlebar-deco`), il **ne reprend pas** la palette beige.

### 3.2 Fenêtres déplaçables ?
**Non.** Aucune fenêtre n'est déplaçable ni redimensionnable — pas de `mousedown`+`drag` de fenêtre dans le fichier. Les boutons de fenêtre sont détournés :
- Atelier : `_` = replier tous les `<details>`, `□` = tout déplier (9009–9014), `×` = gag « Extinction en cours… » qui se referme après 1,8 s (9019).
- Jeu : `_` = remonter en haut, `□` = scroller au bouton Lancer, `×` = même gag (9051–9061).

### 3.3 Autres composants
- Tout le panneau de réglages est en **`<details class="section">` imbriqués** (parents « Rythme » / « Son » / « Structure » / « Groove & espace » contenant des sous-sections `data-group`).
- **Barre de transport fixe en bas** `#drumTransportBar` (2022), affichée seulement en mode Atelier.
- **4 canvas** : cercle Atelier, cercle Jeu, aperçus d'onde (3×64×22), courbes de filtre (3×260×40), + visualiseur splash. Tous gérés en `devicePixelRatio`.
- **Overlays de verrouillage** de module `.synth-locked-overlay` (231, avec cadenas) — jamais affichés puisque le verrouillage est désactivé.
- Responsive : un seul `@media (min-width:900px)` (31) et un `@media (max-width:480px)` (262). L'app est clairement **pensée mobile d'abord** (loupe, long-press, pince-zoom mentionné dans l'aide 1185).

---

## 4. Qualité du code

### Points forts
- Commentaires **exceptionnellement denses et explicatifs** (le « pourquoi », pas le « quoi ») — souvent le raisonnement complet derrière un choix, y compris les impasses. C'est une mine d'or pour une réécriture : ne pas les jeter.
- Le timing audio est fait correctement (lookahead + horloge audio pour le visuel).
- La logique de déclenchement est **factorisée entre live et export** (`triggerKickSnareStep` / `triggerHatStep`, 4067–4169) — commentaire explicite sur l'intention.
- Rétrocompatibilité soignée sur le format de sauvegarde et sur les presets.
- Optimisations réelles : caches de courbes (`driveCurveCache`, `bitcrushCurveCache`), cache des cellules DOM, flags `dirty`, throttle du closest-match, yields pendant l'export.

### Duplication évidente
1. **Construction du graphe audio × 2** : `ensureAudio` (4940–5034) vs `exportPatternAsMp3` (4629–4700) — ~70 lignes quasi identiques, à maintenir en parallèle.
2. **Boucle de séquençage synthé × 2** : `scheduler` (4266–4363) vs `renderPatternOffline` (4449–4493) — même logique pad/bass/melody, rolls, glide, strum, réécrite. Le commentaire 4442 avoue que le synthé avait été **oublié** dans l'export.
3. **Scheduler drum × 3** : Atelier / Jeu / Splash, avec des variantes de swing/drag/shift recodées (`gameRowOffset` 7818 refait ce que fait la boucle 4226–4229).
4. **Cercle × 2** : `drawCircle` (5102) vs `drawGameCircle` (8052) ; `resizeCanvas`/`resizeGameCanvas` ; `stepFromEvent` (5150) vs `stepFromEventOnCanvas` (8104) — **identiques à un paramètre près**.
5. **File de playhead × 2** : `processPlayheadQueue` (4180) vs `processGamePlayheadQueue` (7836).
6. **Synchronisation des sliders depuis un état × 3** : `loadPreset` (6169), `importState` (6423), `saveGameRhythmToAtelier` (8488) — chacun refait à la main des dizaines de `setSliderValue(document.querySelector(...))`.
7. **Bloc « preset le plus proche » dupliqué** dans `showGameResult` (8547–8556) et le handler d'abandon (8724–8733).
8. `playHatClosed`/`playHatOpen` (4021/4047) diffèrent de 3 constantes ; `playSnare`/`playRimshot` idem.
9. Les blocs HTML de la section « Sons du synthé » sont **triplés à la main** pour bass/pad/melody (1566–1639), ~24 lignes chacun quasi identiques ; idem Filtres, Groove, Envois.

### Fonctions trop longues
| Fonction | Ligne | Taille approx. |
|---|---|---|
| `loadPreset` | 6169 | ~157 l. |
| `importState` | 6423 | ~152 l. |
| `AudioExport.exportPatternAsMp3` | 4583 | ~164 l. |
| `scheduler` | 4197 | ~168 l. |
| `playSynthNote` | 6839 | ~148 l. |
| `ensureAudio` | 4916 | ~129 l. |
| Handler `gEl.newBtn` (click) | 8567 | ~64 l. |
| `attachSlider` (curseurs ergo) | 9143 | ~140 l. |
| `AudioExport.renderPatternOffline` | 4389 | ~107 l. |

### Variables globales
- ~60 `let` au niveau du closure, dont **18 nœuds audio** que `exportPatternAsMp3` **sauvegarde puis restaure manuellement** dans un objet `prev` (4604–4614 / 4726–4744). C'est le point le plus fragile du fichier : pendant l'export, `audioCtx` global **pointe sur l'OfflineAudioContext** ; toute interaction utilisateur (bouger un curseur, qui fait `setValueAtTime(..., audioCtx.currentTime)`) touche le mauvais contexte. Un `finally` protège la restauration, mais l'ajout d'un seul nœud global futur cassera silencieusement la symétrie.
- Effets de bord assumés : `randomGamePattern()` renseigne aussi `gameTargetRoll` (commenté 8573).

### Code mort / vestiges
- `enhanceRangeInputs()` : no-op conservé volontairement (5227).
- `moduleUnlocked()` : `return true` en dur, la vraie condition est en commentaire (3598–3601) → tout le système de verrouillage + les 2 overlays HTML + `MODULE_UNLOCK_LEVEL` sont inertes.
- `SPLASH_AMBIENCE_ENABLED = false` (8821) → ~150 lignes de splash audio + visualiseur + `splashAnalyser` inertes.
- `stepsForLine(cycleBars, subdivisions)` **ignore son 1er paramètre** (6781) — signature vestigiale appelée partout avec 2 arguments.
- `void variantAllowed;` (8012) — variable calculée puis explicitement jetée.
- `ROW_NAMES` (6595) et `ROW_NAMES3` (7120) : deux constantes identiques.
- `roastTierForLevel` (8348) et `voiceTierForLevel` (7246) : mêmes seuils 12/26, deux fonctions.
- `.zone-coral` (681) : classe CSS définie, jamais utilisée dans le HTML.
- `isOfflineRender` n'existe que pour désactiver le budget de voix (2049).

### Points fragiles
- **`ScriptProcessorNode`** (4793) : API dépréciée, tourne sur le thread principal ; `AudioWorklet` ou `MediaRecorder` serait le remplacement.
- **`setInterval` throttlé** en arrière-plan : contourné par un `visibilitychange` qui coupe la lecture (9100) plutôt que par un Worker.
- **Shadowing du helper global `pad(arr,len,fill)`** (5237) par `const pad = synthRows.pad` (3388, 4443…) et par la ligne « pad » partout — nom à trois sens dans le même fichier.
- Helpers globaux à **une lettre** : `b()` (5242), `h()` (5243) — utilisés dans les données de presets.
- `innerHTML` utilisé massivement pour l'UI dynamique (carte des niveaux, besace, résultats) ; `escapeHtml` (5232) n'est appliqué qu'**au nom du joueur dans `renderGameBag`** (8405) — le même nom n'est pas échappé ailleurs, mais il n'est de toute façon jamais réinjecté dans un autre `innerHTML`, donc pas de faille exploitable en pratique. À reprendre proprement quand même.
- `MAXSTEPS = 32` en dur pour les tableaux drum, alors que les lignes synthé vont à 128 pas — deux modèles de longueur incohérents.
- Reconstruction DOM complète (`container.innerHTML = ''` + recréation de toutes les cases **et de tous les listeners**) à **chaque** clic sur une case (`buildLinearRow` 3058, `buildGameRow` 7978). Sur une ligne à 32 pas, ça reste supportable, mais c'est le pattern le plus coûteux du fichier.
- CSS : bataille de spécificité assumée entre `#view-drum .cell:not(.active)` et `.cell.active.kick`, documentée en commentaire (734–739). Symptôme du thème XP plaqué par-dessus le thème sombre au lieu d'un vrai système de tokens.
- `window.onerror` seul : pas de `unhandledrejection`, alors que l'export MP3 et le WAV sont `async`.
- Le splash tente `startSplashAmbience()` **au chargement** (8886) — désactivé, mais l'intention (autoplay) reste dans le code.

---

## 5. Dépendances externes

| Dépendance | Ligne | Nature |
|---|---|---|
| **lamejs 1.2.1** (`cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js`) | 7 | Encodeur MP3 JS. Chargé en `<script>` **bloquant dans le `<head>`**, sans `defer` ni fallback local. Vérifié à l'usage par `typeof lamejs === 'undefined'` (4596) avec message d'erreur en français. |
| **Google Fonts** — JetBrains Mono (400/500/700/800) + Noto Sans (400/600/700/800) | 8–10 | Avec `preconnect` sur `fonts.googleapis.com` et `fonts.gstatic.com`. Fallbacks CSS : `monospace`, `Tahoma, Verdana, 'Segoe UI', sans-serif`. |

**Rien d'autre.** Pas de framework, pas de build, pas de bundler, pas de service worker, pas d'appel réseau à l'exécution, pas de fichier audio, aucune image (tout est en dégradés CSS et emojis). L'app fonctionne hors ligne **sauf** l'export MP3 et le rendu typographique exact.

---

## Recommandations pour la réécriture

1. **Extraire d'abord les données** : les 34 presets (~880 l.) et les 34 niveaux (~170 l.) sont du JSON déguisé → fichiers de données séparés. Ça retire 15 % du fichier immédiatement.
2. **Un seul moteur de séquençage paramétrable** (source de pattern + voix + params de groove) au lieu de 3 schedulers ; un seul module de rendu de cercle ; un seul module de file de playhead.
3. **Un objet `AudioEngine`** qui possède son contexte, avec une méthode `buildGraph(ctx)` unique appelée pour le live **et** pour l'offline → supprime les 18 globales sauvegardées/restaurées et le bug latent du contexte partagé.
4. **Un état unique sérialisable** (drum + synth + globals) avec une couche `bindControl(state, path, element)` générique → `loadPreset`, `importState` et `saveGameRhythmToAtelier` se réduisent à `applyState(obj)`.
5. **Générer le HTML des blocs répétés** (3 lignes drum × 4 sections, 3 lignes synthé × 4 sections) plutôt que de le tripler à la main.
6. **Remplacer `ScriptProcessorNode`** par `MediaStreamDestination + MediaRecorder` ou un `AudioWorklet`.
7. **Design system XP en tokens** dès le départ (une seule palette par vue), pas un thème plaqué par sur-spécificité.
8. **Trancher les fonctionnalités inertes** avant de coder : ambiance splash, verrouillage des modules — soit on les active, soit on ne les réécrit pas.