/* LE PARCOURS COMPLET DE LA CARRIÈRE, depuis un joueur neuf.
 *
 * ⚠️ POURQUOI CE SCRIPT EXISTE — et pourquoi il faut le relancer après toute
 * modification du déverrouillage, de la progression ou de la chaîne des actes.
 *
 * Les huit actes ont été écrits un par un, et chacun vérifié isolément avec une
 * fixture `localStorage` où `level` était posé à la main. Sept PR de suite ont
 * ainsi laissé passer un défaut que ce script a trouvé du premier coup : les
 * quatre modules se déverrouillaient TOUS à la fin de l'acte 0, parce que
 * `saveProgress` fait `level = max(level, id + 1)` et que l'acte 0 cite les
 * niveaux 49-52. Une fixture ne joue pas le jeu ; celui-ci le joue.
 *
 * Il pilote le store plutôt que de cliquer : ce qu'on teste ici n'est pas
 * l'interface de chaque exercice (vérifiée ailleurs, à la capture) mais le
 * CHEMIN — frontières d'actes, déverrouillages au bon moment, commandes
 * atteintes naturellement, épilogue au bout.
 *
 * Usage : `npm run dev` dans un terminal, puis
 *   node scripts/parcours-carriere.cjs
 *
 * Ce qu'il faut lire dans la sortie :
 *   - la colonne « modules » à chaque frontière d'acte : elle doit se remplir
 *     AU FUR ET À MESURE (atelier à l'acte 2, synth à l'acte 4, etc.), jamais
 *     d'un coup ;
 *   - « ÉPILOGUE atteint » à la fin : sinon le parcours est bloqué quelque part ;
 *   - toute ligne commençant par ⚠️.
 */
/* Playwright est fourni par l'environnement (voir CLAUDE.md) : driver global en
   CommonJS, Chromium préinstallé. On retombe sur une résolution normale si le
   chemin n'existe pas, pour que le script serve aussi ailleurs. */
let chromium;
try {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright/index.js'));
} catch {
  ({ chromium } = require('playwright'));
}
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium';
const OUT = process.env.PARCOURS_OUT || require('node:os').tmpdir();

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  const journal = await page.evaluate(async () => {
    const { game } = await import('/src/stores/game.svelte.ts');
    const { pattern } = await import('/src/stores/pattern.svelte.ts');
    const { unlocks } = await import('/src/stores/unlocks.svelte.ts');
    const { PRESETS } = await import('/src/model/presets/songs.ts');
    const log = [];
    const modules = () => ['atelier', 'synth', 'production', 'live'].filter((m) => unlocks.has(m)).join(',') || '—';

    game.setPseudo('parcours');
    game.acteActif = 0; game.etapeActive = 0; game.demarrerEtape();

    let garde = 0;
    let acteVu = -1;
    while (garde++ < 400) {
      if (game.enEpilogue) { log.push(`ÉPILOGUE atteint — modules: ${modules()}`); break; }
      const a = game.acteCourant, e = game.etapeCourante;
      if (a.id !== acteVu) { log.push(`── ACTE ${a.id} « ${a.titre} » (${a.etapes.length} étapes) — modules: ${modules()}`); acteVu = a.id; }
      if (!e) { log.push(`⚠️ acte ${a.id} étape ${game.etapeActive} : AUCUNE ÉTAPE`); break; }

      if (e.kind === 'recit') { game.avancerCarriere(); game.acteTermineAAnnoncer = null; continue; }

      if (e.kind === 'livraison') {
        log.push(`   livraison — l'Atelier ouvert ? ${unlocks.has('atelier')}`);
        // ⚠️ `livrerSonnerie`, pas `avancerCarriere` : c'est le vrai chemin de
        // la vue, et c'est lui qui ARCHIVE la sonnerie. En avançant à la main,
        // le script sautait l'archivage et n'aurait jamais vu une régression
        // de la discographie — une fixture qui ne joue pas le jeu, encore.
        game.livrerSonnerie();
        log.push(`   après livraison — modules: ${modules()}`);
        continue;
      }

      if (e.kind === 'commande') {
        // On produit ce que le cahier demande, puis on livre.
        game.ouvrirCommande();
        if (!unlocks.has('atelier')) log.push(`   ⚠️ COMMANDE dans un Atelier VERROUILLÉ (acte ${a.id})`);
        const st = pattern.state;
        st.swing = 30;
        /* ⚠️ Une commande de STYLE ne se satisfait pas avec un motif générique :
           la fiche (`model/styles.ts`) exige des placements précis. On REJOUE
           donc la grille du genre à la main — ce que fait un joueur qui suit la
           description, et ce que le verrou de provenance autorise justement
           (on refuse un preset CHARGÉ, pas une grille ressemblante). Sans ça le
           parcours s'arrête à l'acte 5 et ne dit rien de la suite. */
        const ficheId = (e.cahier.find((c) => c.id.startsWith('fiche:')) || {}).id;
        const preset = ficheId ? PRESETS.find((x) => x.id === ficheId.slice(6)) : null;
        // Le tempo fait partie du genre : sans lui il manquerait un critère.
        if (preset) st.tempo = preset.tempo;
        for (const n of ['kick', 'snare', 'hat']) {
          st.rows[n].muted = false;
          if (preset) {
            st.rows[n].subdiv = preset[n].subdiv;
            st.rows[n].pattern = new Array(32)
              .fill(0)
              .map((_, i) => (preset[n].pattern[i] === 2 ? 2 : preset[n].pattern[i] ? 1 : 0));
          } else {
            st.rows[n].subdiv = 8;
            st.rows[n].pattern = new Array(32).fill(0).map((_, i) => (i % 2 === 0 ? 1 : 0));
          }
        }
        st.rows.snare.pattern[4] = 2;
        st.rows.kick.rolls = new Array(32).fill(1); st.rows.kick.rolls[0] = 3;
        st.synthRows.bass.muted = false;
        st.synthRows.bass.subdivisions = 8;
        st.synthRows.bass.pattern = new Array(8).fill(null);
        st.synthRows.bass.pattern[0] = { degree: 1, octave: 0 };
        /* Le MIXAGE de l'acte 4 : la commande du Tunnel se fait en deux temps
           depuis le 2026-08-26 (voir `kickQuiPorte` / `avoirEnleve` /
           `deLEspaceSansSoupe`). On fait les trois gestes, comme un joueur qui
           sort de l'exercice de la laverie. */
        st.rows.kick.tone = 60;
        st.rows.hat.filterCutoff = 6000;
        st.rows.snare.reverbSend = 0.2;
        // Une rafale d'accent sur le charley — la techno en demande une.
        st.rows.hat.rolls = new Array(32).fill(1);
        st.rows.hat.rolls[3] = 3;
        const v = game.livrerCommande(pattern.snapshot());
        const manque = v.lignes.filter((l) => !l.ok).map((l) => l.contrainte.libelle);
        log.push(`   commande « ${e.entete} » → ${v.accepte ? 'ACCEPTÉE' : 'refusée : ' + manque.join(' / ')}`);
        if (!v.accepte) {
          // On ne peut pas continuer : c'est un blocage réel du parcours.
          log.push(`⚠️ PARCOURS BLOQUÉ à l'acte ${a.id}`);
          break;
        }
        game.acteTermineAAnnoncer = null;
        continue;
      }

      // Exercice : on le résout selon son verbe, puis on avance.
      const l = game.level;
      if (l.exercise === 'melodie') game.melodieCible.forEach((d, i) => (game.melodieGuess[i] = d));
      else if (l.exercise === 'silence') game.silenceChoix = game.silenceReponse;
      else if (l.exercise === 'style') game.styleChoix = game.styleReponse;
      else if (l.exercise === 'laverie') game.paramChoix = game.paramReponse;
      else if (l.exercise === 'regler') game.paramValeur = game.paramVersions[0];
      else if (l.exercise === 'lequel' || l.exercise === 'nommer') game.paramChoix = game.paramReponse;
      else if (l.exercise === 'intrus') game.intrusChoix = game.intrusReponse;
      else if (l.exercise === 'jouer') { game.frappes = []; game.solved = true; }
      else {
        for (const n of ['kick', 'snare', 'hat']) {
          game.guess[n] = [...game.target[n]];
          game.guessRolls[n] = [...game.targetRolls[n]];
        }
      }
      const ok = l.exercise === 'jouer' ? true : game.verify();
      if (!ok) { log.push(`⚠️ acte ${a.id} niveau ${l.id} (${l.exercise}) : verify() a refusé une réponse exacte`); break; }
      game.avancerCarriere();
      game.acteTermineAAnnoncer = null;
    }
    if (garde >= 400) log.push('⚠️ BOUCLE INFINIE — le parcours ne se termine pas');
    log.push(`état final : acte enregistré ${game.progresCarriere.acte}, modules ${modules()}`);
    /* La DISCOGRAPHIE au bout du parcours. Elle doit contenir les six
     * productions du récit (la sonnerie de l'acte 1 + les cinq commandes) :
     * c'est la seule preuve qu'un morceau livré à l'acte 1 est encore là au
     * mois de septembre. */
    log.push(`discographie : ${game.productions.length} morceaux — ${game.productions.map((p) => `${p.acte}:${p.titre}`).join(' · ')}`);
    if (game.productions.length !== 6) log.push('   ⚠️ SIX productions attendues');
    return log;
  });

  console.log(journal.join('\n'));
  await page.screenshot({ path: `${OUT}/parcours-fin.png`, fullPage: true });
  await browser.close();
  console.log('\nerreurs console :', errs.length ? errs : 'aucune');
})();
