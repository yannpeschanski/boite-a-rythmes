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
    const { resolveVoicePreset } = await import('/src/model/presets/voices.ts');
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
        /* Le tempo fait partie du genre — et depuis les fiches du 2026-09-01,
           le FEEL aussi : la fiche du drunk beat demande une traîne et des
           ghost notes, celle du garage un shuffle. Les recopier depuis le
           preset, c'est ce que fait un joueur qui suit la description. */
        if (preset) {
          st.tempo = preset.tempo;
          st.swing = preset.swing ?? 0;
          st.drag = preset.drag ?? 0;
          st.ghostDensity = preset.ghostDensity ?? 0;
          for (const n of ['clap', 'shaker']) {
            const src = preset[n];
            st.rows[n].muted = false;
            st.rows[n].subdiv = src ? src.subdiv : 8;
            st.rows[n].pattern = new Array(32)
              .fill(0)
              .map((_, i) => (src && src.pattern[i] ? 1 : 0));
          }
        }
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
        /* Les TROIS lignes de synthé, et une texture sur chacune : l'acte 3
           les demande toutes depuis le 2026-09-01 (« les additionner »). */
        for (const l of ['bass', 'melody', 'pad']) {
          st.synthRows[l].muted = false;
          st.synthRows[l].subdivisions = 8;
          st.synthRows[l].pattern = new Array(8).fill(null);
          st.synthRows[l].pattern[0] = { degree: 1, octave: 0 };
          if (e.cahier.some((c) => c.id === 'voix')) {
            st.synthRows[l].voice = { ...st.synthRows[l].voice, attack: 0.42 };
          }
        }
        /* Le MIXAGE de l'acte 4 : le Tunnel renvoie le morceau deux fois
           depuis le 2026-09-01. Les gestes de base restent inconditionnels —
           ils ne contredisent aucune fiche — et les gestes BORNÉS sont posés
           au coup par coup plus bas, parce qu'un filtre à 6 000 Hz sur trois
           lignes contredirait un genre qui a besoin d'aigus. */
        st.rows.kick.tone = 60;
        st.rows.hat.filterCutoff = 6000;
        st.rows.snare.reverbSend = 0.2;
        /* Les gestes d'une commande qui TRANSFORME (acte 2 depuis le
           2026-08-28) : le joueur part du rythme qu'il vient de reproduire et
           doit le changer. On applique donc les deux gestes demandés — mais
           SEULEMENT si le cahier les réclame, jamais sur une commande de
           genre : un charley troué contredirait la fiche techno, et redessiner
           le kick effacerait le four-on-the-floor. Un état « qui satisfait
           tout » n'existe pas, et c'est le signe que les cahiers disent
           quelque chose. */
        const exige = (id) => e.cahier.some((c) => c.id === id);
        if (exige('kick-syncope')) {
          st.rows.kick.subdiv = 8;
          st.rows.kick.pattern = new Array(32).fill(0);
          [0, 3, 4].forEach((i) => (st.rows.kick.pattern[i] = 1));
        }
        if (exige('place-voix')) {
          st.rows.hat.subdiv = 8;
          st.rows.hat.pattern = new Array(32).fill(0);
          [0, 1, 2, 4, 5, 6].forEach((i) => (st.rows.hat.pattern[i] = 1));
          st.rows.hat.pattern[7] = 2;
        }
        // Une rafale d'accent sur le charley — la techno en demande une.
        st.rows.hat.rolls = new Array(32).fill(1);
        st.rows.hat.rolls[3] = 3;
        /* Les gestes de MIXAGE de la chaîne d'envois (acte 4, 2026-09-01).
           Posés au plus juste au-dessus du seuil : un parcours qui pousse tout
           à fond ne prouverait pas qu'un cahier est atteignable. */
        if (exige('filtre-9000')) {
          st.rows.kick.filterCutoff = 8000;
          st.rows.hat.filterCutoff = 7000;
        }
        if (exige('contraste')) {
          st.rows.kick.volume = 0.9;
          st.rows.hat.volume = 0.5;
        }
        if (exige('reverb-dosee')) {
          for (const n of ['kick', 'snare', 'hat', 'clap', 'shaker']) st.rows[n].reverbSend = 0.3;
        }
        if (exige('delay')) {
          st.rows.snare.delaySend = 0.25;
          st.synthGlobal.delayFeedback = 0.3;
        }
        if (exige('retouchees')) {
          for (const n of ['kick', 'snare', 'hat']) st.rows[n].tone = 42;
        }
        /* Le GROOVE exigé par le cahier de Kelvin (acte 2, 2026-09-01) : un
           décalage sur UNE ligne — les autres restent en place, c'est contre
           elles qu'il s'entend — et un des trois boutons d'aléa, au seuil
           mesuré (`ALEA_MINI`) et pas à fond. */
        if (exige('ligne-glisse')) {
          st.rows.hat.shiftPct = 10;
          st.rows.kick.shiftPct = 0;
          st.rows.snare.shiftPct = 0;
        }
        if (exige('alea')) st.ghostDensity = 8;
        /* Les COUCHES DU SYNTHÉ de la chaîne de l'acte 3 (2026-09-01) : la
           mélodie, puis la basse, puis la nappe et les textures. La mélodie
           est posée aussi quand `basse-tient` est exigée — c'est une contrainte
           RELATIONNELLE, elle compare la basse à la mélodie livrée. */
        if (exige('phrase:melody') || exige('tonique:melody') || exige('basse-tient')) {
          const m = st.synthRows.melody;
          m.muted = false;
          m.cycleBars = 1;
          m.subdivisions = 8;
          m.pattern = new Array(8).fill(null);
          m.pattern[0] = { degree: 5, octave: 0 };
          m.pattern[2] = { degree: 3, octave: 0 };
          m.pattern[4] = { degree: 2, octave: 0 };
          // Elle se repose sur la tonique : c'est la dernière note entendue.
          m.pattern[6] = { degree: 1, octave: 0 };
        }
        if (exige('nappe-respire') || exige('synth:pad')) {
          const pad = st.synthRows.pad;
          pad.muted = false;
          pad.subdivisions = 4;
          pad.pattern = [0, -1, 3, -1];
          st.synthGlobal.padArpEnabled = true;
        }
        if (exige('glide:bass')) st.synthRows.bass.glide = 0.2;
        // « Une note n'est pas un son » : une voix choisie sur chaque ligne
        // citée, n'importe laquelle sauf celle d'usine.
        const VOIX = { bass: 'round', pad: 'rhodes', melody: 'soft' };
        for (const c of e.cahier) {
          if (!c.id.startsWith('voix:')) continue;
          for (const l of c.id.slice(5).split('+')) {
            st.synthRows[l].voice = resolveVoicePreset(l, VOIX[l]);
          }
        }
        /* ⚠️ Le CONTEXTE, sans quoi deux contraintes ne peuvent rien conclure :
           la provenance du preset, et le DÉPART sur lequel l'Atelier s'est
           ouvert — c'est contre lui que « chaque ligne a été regardée » se
           mesure. Livrer sans contexte, c'est ce que faisait ce script, et
           `retouchees` répondait faux à juste titre. */
        const ctx = { presetCharge: pattern.presetCharge, depart: game.departCommande() };
        const v = game.livrerCommande(pattern.snapshot(), ctx);
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
      else if (l.exercise === 'arrangement') {
        // Plusieurs lignes de deux natures : on recopie chaque ligne de la cible.
        for (const ligne of game.arrLignes) {
          game.arrCible[ligne.nom].forEach((v, i) => (game.arrGuess[ligne.nom][i] = v));
        }
      }
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
    /* La DISCOGRAPHIE au bout du parcours. Elle doit contenir les NEUF
     * productions du récit : la sonnerie de l'acte 1, une par acte pour les
     * actes 2, 3, 4 et 6 — les chaînes d'envois se remplacent, on ne garde que
     * la dernière version — et QUATRE pour l'acte 5, un genre par catégorie du
     * fax, qui coexistent parce qu'elles ont chacune leur série. C'est la seule
     * preuve qu'un morceau livré à l'acte 1 est encore là en septembre, et que
     * quatre genres produits ne s'écrasent pas l'un l'autre. */
    log.push(`discographie : ${game.productions.length} morceaux — ${game.productions.map((p) => `${p.acte}:${p.titre}`).join(' · ')}`);
    if (game.productions.length !== 9) log.push('   ⚠️ NEUF productions attendues');
    if (game.productions.filter((p) => p.acte === 5).length !== 4)
      log.push('   ⚠️ les quatre genres de l’acte 5 devraient coexister');
    return log;
  });

  console.log(journal.join('\n'));
  await page.screenshot({ path: `${OUT}/parcours-fin.png`, fullPage: true });
  await browser.close();
  console.log('\nerreurs console :', errs.length ? errs : 'aucune');
})();
