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
 * ⚠️ LA COLONNE « RAFALE » A DISPARU LE 2026-09-13, et il fallait la retirer
 * plutôt que la laisser. Ce banc a condamné les rafales de ligne ; elles ont
 * été retirées du catalogue, puis leur chemin de forçage (`forceKickRoll` /
 * `forceSnareRoll` / `forceHatRoll`) du moteur. Passer ces clés à un
 * ordonnanceur qui ne les lit plus ne lève RIEN : le banc aurait imprimé
 * « 0,0 dB » avec l'aplomb d'une mesure, et conclu que la rafale est inaudible
 * — la bonne réponse pour la mauvaise raison. Les chiffres qui ont motivé le
 * retrait restent écrits dans `docs/plan/09-etat-de-lart-controles-live.md`.
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
      out.push({ nom, tempo: st.tempo, fillIntensity: st.fillIntensity, fillDb, frappes });
    }
    return out;
  });

  const l = (s, n) => String(s).padEnd(n);
  console.log('\n===== §A — CE QUI ARRIVE JUSQU’À L’OREILLE (niveau) =====');
  console.log('\n=== FILL (dernier quart de mesure), en dB ===');
  console.log(l('motif', 22) + 'FILL');
  for (const c of res) {
    console.log(l(c.nom, 22) + (c.fillDb >= 0 ? '+' : '') + c.fillDb);
  }
  console.log('\n=== FRAPPE À LA MAIN, hors grille — dB de la frappe SEULE contre le mix au même instant ===');
  console.log(l('motif', 22) + ['kick', 'snare', 'hat', 'clap', 'shaker'].map((x) => l(x, 10)).join(''));
  for (const c of res) {
    console.log(l(c.nom, 22) + ['kick','snare','hat','clap','shaker']
      .map((k) => l((c.frappes[k].contreLeMix >= 0 ? '+' : '') + c.frappes[k].contreLeMix, 10)).join(''));
  }
  console.log('\n(≈1 dB = seuil de perception, ≈3 dB = nettement, ≈6 dB = franc)');

  /* ⚠️ §B A ÉTÉ RETIRÉ LE 2026-09-13, avec ce qu'il mesurait.
     Il portait quatre mesures — bouillie, empilement sous swing, accent
     retourné, hors-grille — et toutes les quatre décrivaient la RAFALE FORCÉE
     de ligne. Elles ont fait leur travail : les rafales sont parties du
     catalogue le 2026-09-09, puis leur chemin de forçage du moteur le
     2026-09-13 (« à supprimer »). Les garder aurait été pire que les perdre —
     `scheduleDrumWindow` ne lit plus `forceKickRoll` & co., donc les quatre
     auraient rendu les chiffres du motif NU en les présentant comme ceux
     d'une rafale, c'est-à-dire une mesure qui ne mesure rien et qui l'annonce
     en vert. Les chiffres sont archivés dans
     `docs/plan/09-etat-de-lart-controles-live.md`, §1.B.

     Ce qui RESTE au-dessus est vivant : le FILL est une figure du morceau, et
     la frappe à la main pesée contre le mix est la mesure qu'il faudra refaire
     le jour où un note repeat QUANTIFIÉ se présentera. */
  await browser.close();

})();
