# Boîte à rythmes — réécriture Svelte 5 + TypeScript

Réécriture du fichier unique `boite-a-rythme-69.html` (9 289 lignes) en projet moderne,
en gardant le design rétro Windows XP. Voir [PLAN.md](PLAN.md) pour l'architecture
et [ANALYSE-ORIGINAL.md](ANALYSE-ORIGINAL.md) pour l'analyse du code d'origine.

## Démarrer

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # site déployable        -> dist/
npm run build:singlefile # fichier HTML autonome  -> dist-singlefile/index.html
npm test                 # Vitest (modèle + moteur)
npm run check            # svelte-check
```

## Ce qui a été porté (iso-fonctionnalité)

**Atelier — batterie.** 3 pistes kick/snare/hat, polyrythmie 1–32 pas par ligne,
rim shot, hat ouvert/fermé avec choke, rafales ×1–4, vues linéaire **et** circulaire.
Groove : swing, traîne, décalage par ligne. Variation humaine : ghost notes, fills,
rafales spontanées, vélocité aléatoire. Bouton Break. Timbre par ligne
(pitch/attaque/decay/tone), filtre passe-bas, envois réverbe/delay.

**Atelier — synthé.** Basse / Nappe / Mélodie par degrés de gamme, grilles
indépendantes (cycles × notes, jusqu'à 128), harmonie générative (12 tonalités,
5 modes, triades diatoniques 4–7 accords), indicateur de justesse, arpégiateur de
nappe, sidechain kick/snare → basse/nappe/mélodie, glide, étalement, presets de voix,
remplissage aléatoire harmonieux déterministe.

**Audio.** 100 % synthèse Web Audio, formules identiques à l'original (kick sinus
pitch-drop, snare bruit + triangle, rimshot, hat = banc de 6 oscillateurs 808/909,
réverbe à impulsion générée). Scheduler lookahead 25 ms / 0,25 s, curseur visuel
découplé sur l'horloge audio, budget de 40 voix synthé.

**Export.** MP3 (lamejs) et WAV, tous deux via le **même** rendu offline déterministe.
Sauvegarde/chargement JSON versionné, compatible v1 et v2 de l'original.

**Mode jeu.** Campagne de 34 niveaux (Motus rythmique), cases verrouillées quand
exactes, étoiles 1–3, roasting, besace d'objets, carte des niveaux, timbres aléatoires
par palier, « Sauvegarder dans l'Atelier ». Mêmes clés localStorage que l'original
(`boite-a-rythme:progression`, `boite-a-rythme:besaces`) : une progression existante
est relue telle quelle.

**Les 34 presets** de morceaux avec leurs textes historiques et pédagogiques.

## Ce qui a été ajouté

- **Partage par lien** — le rythme entier encodé dans l'URL, sans serveur.
- **Undo / redo** (Ctrl+Z / Ctrl+Y) et **sauvegarde automatique** du pattern :
  l'original ne persistait que la progression du jeu, un rechargement perdait tout.
- **Tap tempo**, **raccourcis clavier** (Espace, B, 1/2/3).
- **Barre de menus XP** Fichier / Édition / Affichage.
- Curseurs avec **loupe flottante et mode précis** (portés de l'original) + support
  clavier et ARIA.
- **`AudioWorklet`-free** : le `ScriptProcessorNode` déprécié de l'enregistrement WAV
  est remplacé par le rendu offline — plus rapide que le temps réel et reproductible.

## Architecture

```
src/
  model/     état v2 typé, sérialisation, presets (morceaux, niveaux, gammes, voix)
  engine/    moteur audio TS pur — aucune dépendance Svelte, aucun accès au DOM
  stores/    runes Svelte 5 (pattern, jeu, historique, partage)
  ui/        design system XP + vues Atelier et Mode jeu
```

Les trois unifications structurantes par rapport à l'original : **un seul** builder de
graphe audio (`buildGraph(ctx, state)`, live et offline), **un seul** scheduler, et
**un seul** modèle d'état sérialisable dont l'UI dérive — ce qui supprime les
3 schedulers dupliqués, le graphe construit deux fois avec 18 globales
sauvegardées/restaurées à la main, et les trois couches de synchronisation
sliders ↔ état.
