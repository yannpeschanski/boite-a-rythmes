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
    const { CHORD_PRIORITY_ORDER: ORDRE_DES_ACCORDS } = await import('/src/model/presets/scales.ts');
    const { sequenceBank } = await import('/src/stores/bank.svelte.ts');
    const { architecture } = await import('/src/stores/architecture.svelte.ts');
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

      /* LA SCÈNE (acte 7) : on monte, on redescend. Il n'y a rien à réussir —
         un concert ne se note pas — mais tout à vérifier : que le Mode Live
         s'ouvre POUR l'étape, et que redescendre fait avancer le récit. */
      if (e.kind === 'scene') {
        game.ouvrirScene();
        const ouvert = unlocks.has('live');
        /* ⚠️ Une scène qui monte un SET : on vérifie que les trois boucles sont
           bien arrivées dans la banque et assignées aux sections. Sans ça,
           l'acte 6 finirait sur trois fichiers que personne n'enchaîne. */
        const set = e.bouclesDeLActe
          ? (() => {
              const noms = e.bouclesDeLActe.map((b) => b.nom);
              const enBanque = noms.filter((n) => sequenceBank.entries.some((x) => x.name === n));
              const sections = architecture.sections;
              const assignees = sections.filter((x) => x.sequenceId).length;
              return ` — set : ${enBanque.length}/${noms.length} boucles en banque, ${assignees}/${sections.length} sections assignées`;
            })()
          : '';
        game.terminerScene();
        log.push(`   scène « ${e.entete} » → Mode Live ${ouvert ? 'ouvert' : '⚠️ CADENASSÉ'}${set}`);
        continue;
      }
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
        /* ⚠️ UNE BOUCLE D'UN MÊME MORCEAU (acte 6) ne se fabrique pas : elle se
           TRANSFORME. Le refrain doit en mettre plus que le couplet et le pont
           moins — mesuré contre le départ, qui EST le couplet. Reconstruire un
           motif générique par-dessus (ce que fait le bloc suivant) effacerait
           justement ce à quoi on se compare, et les deux cahiers deviendraient
           insatisfiables pour une raison invisible. */
        const estUneBoucle = [
          'plus-fourni', 'moins-fourni', 'ligne-entre', 'ligne-sort',
          'autre-phrase:melody', 'phrase-monte:melody', 'phrase-eclaircit:melody',
          'autre-harmonie',
        ].some((id) => e.cahier.some((c) => c.id === id));
        if (!estUneBoucle) {
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
        }
        /* Les TROIS lignes de synthé, et une texture sur chacune : l'acte 3
           les demande toutes depuis le 2026-09-01 (« les additionner »).
           ⚠️ JAMAIS sur une boucle d'un même morceau : elles se jugent CONTRE
           le départ, et réécrire les trois lignes efface justement ce à quoi on
           se compare. Ça se voyait sur la nappe — une case de nappe porte un
           INDEX d'accord, pas un degré, donc ce bloc y écrivait `{degree, octave}`
           par-dessus la progression du couplet et « la nappe ne pose plus les
           mêmes accords » devenait vrai pour la mauvaise raison, puis faux.
           ⚠️ Le bloc est aussi la raison pour laquelle il ne peut pas rester
           inconditionnel : `subdivisions = 8` sur la nappe change sa longueur. */
        for (const l of estUneBoucle ? [] : ['bass', 'melody', 'pad']) {
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
          // Une ligne de synthé n'a ni `tone` ni `pitch` : son volume, si.
          for (const n of ['bass', 'melody', 'pad']) st.synthRows[n].volume = 0.8;
        }
        /* Le filtre du SYNTHÉ se mesure contre le DÉPART (`aBaisseLeFiltre`) :
           sa voix d'usine coupe déjà à 600 Hz, donc un seuil absolu serait
           coché sans rien toucher. */
        if (exige('filtre-geste')) {
          for (const n of ['bass', 'melody']) {
            st.synthRows[n].voice = { ...st.synthRows[n].voice, cutoff: 300 };
          }
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
        /* L'HARMONIE de l'acte 5 (2026-09-04). ⚠️ Une case de nappe porte un
           INDEX d'accord : celui d'index `i` se construit sur le degré
           `CHORD_PRIORITY_ORDER[i]` — l'ordre pop (I, IV, V, vi) et non
           l'ordre de la gamme. Poser `i + 1` jouerait faux. */
        const prog = e.cahier.find((c) => c.id.startsWith('progression-'));
        const nAccords = prog ? Number(prog.id.slice('progression-'.length)) : 0;
        if (exige('nappe-respire') || exige('synth:pad') || exige('basse-accord') || nAccords) {
          const pad = st.synthRows.pad;
          pad.muted = false;
          pad.subdivisions = 4;
          const combien = Math.max(2, nAccords);
          pad.pattern = [0, 1, 2, 3].map((i) => (i < combien ? i : -1));
          st.synthGlobal.padArpEnabled = true;
        }
        if (exige('basse-accord')) {
          const b = st.synthRows.bass;
          b.muted = false;
          b.subdivisions = 8;
          b.pattern = new Array(8).fill(null);
          const poses = [...new Set(st.synthRows.pad.pattern.filter((v) => typeof v === 'number' && v >= 0))];
          poses.forEach((i, k) => {
            b.pattern[k * 2] = { degree: ORDRE_DES_ACCORDS[i], octave: 0 };
          });
        }
        if (exige('glide:bass')) st.synthRows.bass.glide = 0.2;
        /* LES TROIS BOUCLES DE L'ACTE 6 : le refrain s'ouvre, le pont retombe.
           Elles se mesurent CONTRE le départ, donc on part de lui — fabriquer
           une boucle autrement ne prouverait rien. */
        if (exige('plus-fourni') || exige('ligne-entre')) {
          st.rows.clap.subdiv = 8;
          st.rows.clap.pattern = new Array(32).fill(0);
          for (let i = 0; i < 8; i++) st.rows.clap.pattern[i] = 1;
          st.rows.clap.muted = false;
        }
        /* LE REFRAIN : la phrase change et MONTE. `unePhraseQuiMonte` compare
           des hauteurs moyennes où l'octave vaut sept degrés — on réécrit donc
           la mélodie une octave au-dessus, ce qui est le geste réel. */
        if (exige('autre-phrase:melody') && exige('phrase-monte:melody')) {
          const m = st.synthRows.melody;
          m.muted = false;
          m.subdivisions = 8;
          m.pattern = new Array(8).fill(null);
          m.pattern[0] = { degree: 5, octave: 1 };
          m.pattern[2] = { degree: 6, octave: 1 };
          m.pattern[4] = { degree: 3, octave: 1 };
          m.pattern[6] = { degree: 1, octave: 1 };
        }
        if (exige('moins-fourni') || exige('ligne-sort')) {
          // Le pont, c'est le couplet qu'on VIDE : on coupe, on ne redessine pas.
          for (const n of ['hat', 'clap', 'shaker']) {
            st.rows[n].pattern = new Array(st.rows[n].pattern.length).fill(0);
          }
          /* ⚠️ La mélodie RESTE, plus claire et autrement écrite : un pont sans
             mélodie est un break. `unePhraseQuiSEclaircit` exige qu'elle joue
             ENCORE, `uneAutrePhrase` qu'elle soit écrite autrement. */
          const m = st.synthRows.melody;
          m.muted = false;
          m.pattern = m.pattern.map(() => null);
          m.pattern[0] = { degree: 2, octave: -1 };
          /* Et la nappe reste, sur d'AUTRES accords : `uneAutreHarmonie` demande
             qu'elle sonne des deux côtés, sinon il n'y a pas d'harmonie à
             quitter. On renverse la suite posée par le couplet. */
          const pad = st.synthRows.pad;
          const poses = pad.pattern
            .slice(0, pad.subdivisions)
            .map((v) => (typeof v === 'number' && v >= 0 ? v : -1));
          if (poses.some((v) => v >= 0)) {
            pad.muted = false;
            const inverse = [...poses].reverse();
            for (let i = 0; i < pad.subdivisions; i++) pad.pattern[i] = inverse[i];
            if (inverse.join(',') === poses.join(',')) {
              for (let i = 0; i < pad.subdivisions; i++) {
                if (pad.pattern[i] >= 0) pad.pattern[i] = (pad.pattern[i] + 1) % 4;
              }
            }
          }
          /* ⚠️ Et si rien n'a disparu, on coupe une voix : le deuxième morceau
             de l'acte 6 interdit l'abondance (« quatre lignes au plus »), donc
             son couplet n'a ni charley ni clap ni shaker à retirer. */
          const sonneDrum = (e2, n) =>
            !e2.rows[n].muted && e2.rows[n].pattern.slice(0, e2.rows[n].subdiv).some((v) => v > 0);
          const sonneSynth = (e2, n) =>
            !e2.synthRows[n].muted &&
            e2.synthRows[n].pattern
              .slice(0, e2.synthRows[n].subdivisions)
              .some((v) => (n === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
          const avant = game.departCommande();
          const aPerdu =
            !!avant &&
            ['clap', 'shaker', 'hat', 'snare', 'kick'].some(
              (n) => sonneDrum(avant, n) && !sonneDrum(st, n),
            );
          if (!aPerdu) {
            const garde = new Set(['melody', ...(exige('autre-harmonie') ? ['pad'] : [])]);
            const cible = ['clap', 'shaker', 'hat', 'snare', 'kick'].find((n) => sonneDrum(st, n));
            if (cible) st.rows[cible].pattern = new Array(st.rows[cible].pattern.length).fill(0);
            else {
              const s2 = ['bass', 'pad', 'melody'].find((n) => !garde.has(n) && sonneSynth(st, n));
              if (s2) st.synthRows[s2].muted = true;
            }
          }
        }
        /* UN TEMPO DANS UNE FOURCHETTE — l'identifiant porte ses bornes. */
        const bornesTempo = e.cahier.find((c) => c.id.startsWith('tempo:'));
        if (bornesTempo) {
          const [mn, mx] = bornesTempo.id.slice(6).split('-').map(Number);
          st.tempo = Math.round((mn + mx) / 2);
        }
        /* PAS PLEIN — on coupe ce que le cahier ne cite pas jusqu'à tenir. */
        if (exige('au-plus-lignes')) {
          const cite = (n) => e.cahier.some((c) => c.id === `synth:${n}` || c.id.endsWith(`:${n}`) || c.id === n);
          for (const n of ['clap', 'shaker', 'hat', 'snare']) {
            if (!cite(n)) st.rows[n].pattern = new Array(st.rows[n].pattern.length).fill(0);
          }
          for (const n of ['bass', 'pad', 'melody']) {
            if (!cite(n)) st.synthRows[n].muted = true;
          }
        }
        // UN GESTE QUE LES AUTRES N'ONT PAS : le seul des cinq qui n'exige
        // aucune ligne vivante — un balancement franc.
        if (exige('geste-rare')) st.swing = 25;
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
     * actes 2, 3 et 4 — les chaînes d'envois se remplacent, on ne garde que la
     * dernière version — QUATRE pour l'acte 5, un genre par catégorie du fax,
     * et TROIS pour l'acte 6 depuis le 2026-09-04 : couplet, refrain et pont
     * sont les trois moitiés d'un même morceau, elles coexistent parce qu'un
     * morceau dont il manque le refrain ne se joue pas. C'est la seule preuve
     * qu'un morceau livré à l'acte 1 est encore là en septembre, et que ce qui
     * a chacun sa série ne s'écrase pas. */
    log.push(`discographie : ${game.productions.length} morceaux — ${game.productions.map((p) => `${p.acte}:${p.titre}`).join(' · ')}`);
    if (game.productions.length !== 17) log.push('   ⚠️ DIX-SEPT productions attendues');
    if (game.productions.filter((p) => p.acte === 6).length !== 9)
      log.push('   ⚠️ l’acte 6 doit ranger NEUF boucles — trois morceaux de trois');
    if (game.productions.filter((p) => p.acte === 5).length !== 4)
      log.push('   ⚠️ les quatre genres de l’acte 5 devraient coexister');
    return log;
  });

  console.log(journal.join('\n'));
  await page.screenshot({ path: `${OUT}/parcours-fin.png`, fullPage: true });
  await browser.close();
  console.log('\nerreurs console :', errs.length ? errs : 'aucune');
})();
