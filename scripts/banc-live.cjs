/* BANC DU MODE LIVE — ce qu'un geste fait au morceau.
 *
 * ⚠️ POURQUOI CE SCRIPT EXISTE, ET SUR QUEL AXE IL MESURE. Yann, après avoir
 * joué : « Rafale & fill : plutôt inaudible. Jouer à la main : inaudible » —
 * puis, le même jour : « quand je disais inaudible, je voulais dire INUTILE
 * VOIRE DÉSAGRÉABLE aux oreilles, c'était une manière de parler ».
 *
 * La première version de ce banc mesurait le NIVEAU, et elle répondait à côté :
 * un geste peut être parfaitement audible ET musicalement faux. Le niveau reste
 * (§A) parce qu'il dit quand un geste n'arrive pas jusqu'à l'oreille, mais
 * l'essentiel est en §B — ce qui rend un geste DÉSAGRÉABLE : de la bouillie,
 * des frappes empilées, un accent retourné, une frappe hors grille.
 *
 * Compter les ÉVÉNEMENTS ne dit ni l'un ni l'autre (une rafale ×4 sur le
 * charley multiplie les frappes par quatre : au compte, un geste énorme) — même
 * piège que `params-alea.test.ts`, pris par deux bouts différents.
 *
 * Repères de §A : ~1 dB est le seuil de différence perceptible sur un large
 * bande, ~3 dB s'entend nettement, ~6 dB est un geste franc.
 *
 * Usage : `npm run dev` dans un terminal, puis `node scripts/banc-live.cjs`.
 */
let chromium;
try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright/index.js')); }
catch { ({ chromium } = require('playwright')); }
const CHROME = process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('ERR', String(e)));
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });

  const res = await page.evaluate(async () => {
    const { buildGraph } = await import('/src/engine/graph.ts');
    const { DrumKit } = await import('/src/engine/voices/drums.ts');
    const { SynthKit } = await import('/src/engine/voices/synth.ts');
    const { scheduleDrumWindow, scheduleSynthWindow } = await import('/src/engine/scheduler.ts');
    const { barDuration } = await import('/src/engine/groove.ts');
    const { makeSeededRng } = await import('/src/engine/rng.ts');
    const { defaultState } = await import('/src/model/defaults.ts');
    const { PRESETS } = await import('/src/model/presets/songs.ts');
    const { presetToState } = await import('/src/model/presetAdapter.ts');

    const SR = 44100;
    /* opts.solo : ne garde qu'une ligne de batterie (mesure l'effet du bouton
       sur SA ligne). opts.frappe : la frappe à la main, exactement ce que fait
       `AudioEngine.preview()` — même voix, même gain, même absence de
       quantification. opts.seul : la frappe SANS le motif, pour la peser. */
    async function rendre(state0, bars, force = {}, opts = {}) {
      const state = structuredClone(state0);
      if (opts.solo) {
        for (const l of ['kick', 'snare', 'hat', 'clap', 'shaker']) if (l !== opts.solo) state.rows[l].muted = true;
        for (const l of ['bass', 'pad', 'melody']) state.synthRows[l].muted = true;
      }
      const barDur = barDuration(state.tempo);
      const ctx = new OfflineAudioContext(1, Math.ceil((bars * barDur + 1.5) * SR), SR);
      const graph = buildGraph(ctx, state);
      const kit = new DrumKit(graph);
      const synth = new SynthKit(graph, true);
      const rng = makeSeededRng(1337);
      const fillRng = makeSeededRng(999);
      const cur = {}; for (const l of ['kick','snare','hat','clap','shaker']) cur[l] = { stepIndex: 0, nextStepTime: 0 };
      const sc = {}; for (const l of ['bass','pad','melody']) sc[l] = { stepIndex: 0, nextStepTime: 0, lastFreq: null, lastFreqs: null };
      if (!opts.seul) {
        for (let bar = 0; bar < bars; bar++) {
          const h = (bar + 1) * barDur;
          scheduleDrumWindow({ state, kit, cursors: cur, rng, fillRng, barDansSection: bar, breakWindow: null,
            ghostTargetRow: state.ghostRow ?? 'snare', emitPlayhead: () => {}, ...force }, h);
          scheduleSynthWindow({ state, synth, cursors: sc, rng, breakWindow: null, emitPlayhead: () => {}, now: bar * barDur }, h);
        }
      }
      if (opts.frappe) {
        const row = state.rows[opts.frappe], t = opts.t;
        ({ kick: () => kit.playKick(t, row.volume, row),
           snare: () => kit.playSnare(t, row.volume, row),
           hat: () => kit.playHatClosed(t, row.volume, row),
           clap: () => kit.playClap(t, row.volume, row),
           shaker: () => kit.playShaker(t, row.volume, row) })[opts.frappe]();
      }
      return (await ctx.startRendering()).getChannelData(0);
    }
    const rms = (d, t0, t1) => {
      const a = Math.max(0, Math.floor(t0 * SR)), b = Math.min(d.length, Math.floor(t1 * SR));
      let s = 0; for (let i = a; i < b; i++) s += d[i] * d[i];
      return Math.sqrt(s / Math.max(1, b - a));
    };
    const ecart = (x, y) => +(20 * Math.log10(Math.max(x, 1e-9) / Math.max(y, 1e-9))).toFixed(1);

    const cas = [['défaut (Motown)', defaultState()]];
    for (const id of ['boombap', 'house', 'trapmodern', 'dembow']) {
      const p = PRESETS.find((x) => x.id === id);
      if (p) cas.push([p.label, presetToState(p)]);
    }

    const out = [];
    for (const [nom, st] of cas) {
      const barDur = barDuration(st.tempo);
      const sans = await rendre(st, 1);
      const nivBarre = rms(sans, 0, barDur);

      // FILL — sur le dernier quart de mesure, la seule zone qu'il touche.
      const fill = await rendre(st, 1, { forceFill: true });
      const fillDb = ecart(rms(fill, barDur * 0.75, barDur), rms(sans, barDur * 0.75, barDur));

      // RAFALE ×4 — dans le mix ET sur sa propre ligne, isolée.
      const rafales = {};
      for (const [ligne, cle] of [['kick','forceKickRoll'],['snare','forceSnareRoll'],['hat','forceHatRoll']]) {
        const mix = await rendre(st, 1, { [cle]: 4 });
        const soloSans = await rendre(st, 1, {}, { solo: ligne });
        const soloAvec = await rendre(st, 1, { [cle]: 4 }, { solo: ligne });
        rafales[ligne] = {
          mix: ecart(rms(mix, 0, barDur), nivBarre),
          ligne: ecart(rms(soloAvec, 0, barDur), rms(soloSans, 0, barDur)),
        };
      }

      /* FRAPPE À LA MAIN — posée hors grille (3/8 de mesure + 1/32), là où un
         doigt tombe vraiment. On pèse la frappe SEULE contre le mix sur la même
         fenêtre de 150 ms : c'est la marge de masquage. */
      const t = barDur * 0.375 + barDur / 32;
      const frappes = {};
      for (const ligne of ['kick', 'snare', 'hat', 'clap', 'shaker']) {
        const seule = await rendre(st, 1, {}, { frappe: ligne, t, seul: true });
        frappes[ligne] = {
          contreLeMix: ecart(rms(seule, t, t + 0.15), rms(sans, t, t + 0.15)),
          contreLaMesure: ecart(rms(seule, t, t + 0.15), nivBarre),
        };
      }
      out.push({ nom, tempo: st.tempo, fillIntensity: st.fillIntensity, fillDb, rafales, frappes });
    }
    return out;
  });

  const l = (s, n) => String(s).padEnd(n);
  console.log('\n===== §A — CE QUI ARRIVE JUSQU’À L’OREILLE (niveau) =====');
  console.log('\n=== FILL (dernier quart de mesure) et RAFALE ×4, en dB ===');
  console.log(l('motif', 22) + l('FILL', 7) + l('rafale KICK', 22) + l('rafale CAISSE', 22) + 'rafale CHARLEY');
  console.log(l('', 22) + l('', 7) + l('mix / sa ligne', 22) + l('mix / sa ligne', 22) + 'mix / sa ligne');
  for (const c of res) {
    const r = (k) => l(`${c.rafales[k].mix >= 0 ? '+' : ''}${c.rafales[k].mix} / ${c.rafales[k].ligne >= 0 ? '+' : ''}${c.rafales[k].ligne}`, 22);
    console.log(l(c.nom, 22) + l((c.fillDb >= 0 ? '+' : '') + c.fillDb, 7) + r('kick') + r('snare') + r('hat'));
  }
  console.log('\n=== FRAPPE À LA MAIN, hors grille — dB de la frappe SEULE contre le mix au même instant ===');
  console.log(l('motif', 22) + ['kick', 'snare', 'hat', 'clap', 'shaker'].map((x) => l(x, 10)).join(''));
  for (const c of res) {
    console.log(l(c.nom, 22) + ['kick','snare','hat','clap','shaker']
      .map((k) => l((c.frappes[k].contreLeMix >= 0 ? '+' : '') + c.frappes[k].contreLeMix, 10)).join(''));
  }
  console.log('\n(≈1 dB = seuil de perception, ≈3 dB = nettement, ≈6 dB = franc)');

  /* ---- §B — CE QUI REND UN GESTE DÉSAGRÉABLE ----
     Pas de rendu audio ici : ce sont des propriétés de la SÉQUENCE, et elles se
     lisent sur les instants et les gains programmés. Trois défauts, trois
     mesures : la bouillie (deux frappes trop rapprochées pour se distinguer),
     l'empilement (deux frappes au MÊME instant), l'accent retourné (la frappe
     qui tombe sur le temps devient la plus faible). */
  const mus = await page.evaluate(async () => {
    const { scheduleDrumWindow } = await import('/src/engine/scheduler.ts');
    const { barDuration } = await import('/src/engine/groove.ts');
    const { makeSeededRng } = await import('/src/engine/rng.ts');
    const { defaultState } = await import('/src/model/defaults.ts');
    const { PRESETS } = await import('/src/model/presets/songs.ts');
    const { presetToState } = await import('/src/model/presetAdapter.ts');

    // Le plancher que le moteur se donne à lui-même pour le fill
    // (scheduler.ts : « en dessous, deux frappes de snare se confondent »).
    const MIN_ROLL_GAP = 45;

    /* Un enregistreur qui ne garde que l'instant et le gain — le kit factice de
       `tests/helpers/rejeu.ts`, réécrit ici pour ne dépendre d'aucun test. */
    function evenements(state, force) {
      const ev = [];
      const push = (n) => (t, g) => ev.push({ n, t, g });
      const kit = { playKick: push('kick'), playSnare: push('snare'), playRimshot: push('snare'),
        playClap: push('clap'), playShaker: push('shaker'), playHatClosed: push('hat'), playHatOpen: push('hat') };
      const cur = {}; for (const l of ['kick','snare','hat','clap','shaker']) cur[l] = { stepIndex: 0, nextStepTime: 0 };
      scheduleDrumWindow({ state, kit, cursors: cur, rng: makeSeededRng(1337), fillRng: makeSeededRng(999),
        barDansSection: 0, breakWindow: null, ghostTargetRow: state.ghostRow ?? 'snare', emitPlayhead: () => {},
        ...(force || {}) }, barDuration(state.tempo));
      return ev;
    }
    const CLE = { kick: 'forceKickRoll', snare: 'forceSnareRoll', hat: 'forceHatRoll' };
    const ioi = (state, ligne, mult) => {
      const t = evenements(state, { [CLE[ligne]]: mult }).filter((e) => e.n === ligne).map((e) => e.t).sort((a, b) => a - b);
      const d = []; for (let i = 1; i < t.length; i++) d.push((t[i] - t[i - 1]) * 1000);
      return d.sort((a, b) => a - b);
    };

    const cas = [['défaut (Motown)', defaultState()]];
    for (const id of ['boombap', 'house', 'trapmodern', 'dembow']) {
      const p = PRESETS.find((x) => x.id === id); if (p) cas.push([p.label, presetToState(p)]);
    }

    const bouillie = [], accent = [], pas = [];
    for (const [nom, st] of cas) {
      const T = barDuration(st.tempo);
      for (const ligne of ['kick', 'snare', 'hat']) {
        const m = [2, 3, 4].map((n) => { const d = ioi(st, ligne, n); return d.length ? d[Math.floor(d.length / 2)] : null; });
        bouillie.push({ nom, ligne, m });
      }
      // Accent retourné : le gain de la frappe qui tombe sur le temps.
      const base = evenements(st, {}).filter((e) => e.n === 'snare');
      if (base.length) {
        const t0 = base[0].t;
        const raf = evenements(st, { forceSnareRoll: 4 }).filter((e) => e.n === 'snare');
        const proche = raf.reduce((a, b) => (Math.abs(b.t - t0) < Math.abs(a.t - t0) ? b : a));
        accent.push({ nom, avant: base[0].g, apres: proche.g, db: +(20 * Math.log10(proche.g / base[0].g)).toFixed(1) });
      }
      // Frappe à la main : aucune quantification, donc l'écart max est un demi-pas.
      pas.push({ nom, ms: +((T / st.rows.hat.subdiv) * 1000).toFixed(0) });
    }

    // Empilement : la rafale subdivise le pas LINÉAIREMENT alors que le swing
    // en retarde le départ. Écart au pas suivant = pas × (1/N − swing).
    const bb = presetToState(PRESETS.find((p) => p.id === 'boombap'));
    const swing = [];
    for (const sw of [0, 8, 25, 40, 50, 75]) for (const n of [2, 4]) {
      const s2 = structuredClone(bb); s2.swing = sw;
      const d = ioi(s2, 'hat', n);
      swing.push({ sw, n, min: +d[0].toFixed(0), max: +d[d.length - 1].toFixed(0), empilees: d.filter((x) => x < 5).length });
    }
    return { MIN_ROLL_GAP, bouillie, accent, pas, swing };
  });

  console.log('\n\n===== §B — CE QUI REND UN GESTE DÉSAGRÉABLE (séquence) =====');
  console.log(`\n=== B1. BOUILLIE — intervalle médian entre deux frappes de rafale, en ms`);
  console.log(`         (le moteur pose lui-même ${mus.MIN_ROLL_GAP} ms comme plancher pour le FILL ; la rafale l'ignore) ===`);
  console.log(l('motif', 25) + l('ligne', 8) + ['×2', '×3', '×4'].map((x) => l(x, 7)).join(''));
  for (const b of mus.bouillie) {
    console.log(l(b.nom, 25) + l(b.ligne, 8) + b.m.map((v) => l(v == null ? '—' : v.toFixed(0) + (v < mus.MIN_ROLL_GAP ? ' !' : ''), 7)).join(''));
  }
  console.log('\n=== B2. EMPILEMENT — la rafale subdivise le pas linéairement, le swing en retarde le départ ===');
  console.log('         écart au pas suivant = pas × (1/N − swing) : négatif dès que swing ≥ 1/N');
  for (const s of mus.swing) {
    console.log(`   swing ${String(s.sw).padStart(2)} %  rafale ×${s.n} : IOI de ${String(s.min).padStart(3)} à ${String(s.max).padStart(3)} ms` +
      `   frappes EMPILÉES (< 5 ms) : ${s.empilees}${s.empilees ? '  !' : ''}`);
  }
  console.log('\n=== B3. ACCENT RETOURNÉ — le gain de la frappe qui tombe SUR le temps, rafale ×4 tenue ===');
  for (const a of mus.accent) console.log(`   ${l(a.nom, 25)} ${a.avant.toFixed(2)} -> ${a.apres.toFixed(2)}   ${a.db} dB`);
  console.log('\n=== B4. HORS GRILLE — la frappe à la main n’est pas quantifiée ===');
  for (const p of mus.pas) console.log(`   ${l(p.nom, 25)} un pas de charley = ${String(p.ms).padStart(3)} ms  ->  écart max à la grille ±${Math.round(p.ms / 2)} ms`);

  await browser.close();

})();
