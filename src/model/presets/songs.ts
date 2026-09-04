// Presets de morceaux — données portées VERBATIM depuis l'original
// (boite-a-rythme-69.html, l. 5230–6126 : helpers + constante PRESETS).
//
// ÉCART DE FORME vs `SongPreset` (src/model/types.ts) — assumé et documenté :
// l'interface SongPreset de types.ts décrit { id, label, category, history?,
// demo?, state: Partial<PatternStateV2>, noteSeed? }, c'est-à-dire un preset
// DÉJÀ converti au format d'état v2. Les données d'origine ci-dessous n'ont
// pas cette forme : elles sont À PLAT (pas de champ `state`), avec :
//   - `cat` au lieu de `category` ;
//   - une ligne drum par champ (`kick`/`snare`/`hat`) portant subdiv/pattern/
//     shift/volume + timbre (pitch/attack/decay/tone), avec des patterns en
//     boolean[] (via b()) ou en number[] 0/1/2 (rim shot / hat ouvert), et
//     `rolls` seulement quand h() en produit — pas la forme DrumRowState ;
//   - `synthVoice` avec les noms de champs d'origine (type/cutoff/subGain/
//     detuneCents/detuneGain/chorusMix/filterEnvAmount/filterEnvRelease/
//     vibratoDepth…), pas la forme SynthVoice (wave/filterCutoff/sub/detune…) ;
//   - `harmony` en { rootOffset, scaleId, chordCount } (rootOffset relatif,
//     pas rootMidi absolu) ;
//   - `synthGrid`, `synthFillRate`, `ghostRow`, et un `sidechain` compact
//     { trigger, target, depth, release } (pas les booléens éclatés de
//     SynthGlobalState) — autant de champs sans équivalent 1:1 dans
//     Partial<PatternStateV2>.
// Conformément à la consigne, les données ne sont PAS adaptées : elles sont
// exportées dans leur forme d'origine, décrite par le type structurel local
// `SongPresetData` ci-dessous. La conversion vers SongPreset/PatternStateV2
// relève d'un adaptateur séparé, pas de ce module de données.
//
// Note : le helper `escapeHtml` de l'original (juste avant `pad` dans le
// HTML) n'est pas porté ici — il dépend de `document` (DOM) et ne sert pas
// aux données de presets ; ce module doit rester autonome et sans DOM.

// ---------- Types structurels locaux (forme d'origine, fidèle) ----------

/** Formes d'onde utilisées par les voix (sous-ensemble d'OscillatorType, sans dépendre du lib DOM). */
export type VoiceWave = 'sine' | 'triangle' | 'square' | 'sawtooth';

/** Rafales par pas : clés = index de pas (en chaîne, comme dans l'original), valeurs = x1..x4. */
export type RollMap = Record<string, number>;

/** Une ligne drum d'un preset (kick/snare/hat), forme d'origine à plat. */
export interface DrumLinePresetData {
  subdiv: number;
  /** boolean[] via b() (kick, la plupart des snares) ou number[] 0/1/2 (rim shot, hat ouvert). */
  pattern: Array<boolean | number>;
  /** Présent seulement quand la ligne est construite via h() (hat). */
  rolls?: number[];
  shift: number;
  volume: number;
  pitch: number;
  attack: number;
  decay: number;
  tone: number;
}

/** Une voix synthé d'un preset, noms de champs d'origine. */
export interface VoicePresetData {
  type: VoiceWave;
  cutoff: number;
  attack?: number;
  release?: number;
  subGain?: number;
  vibratoDepth?: number;
  tone?: number;
  detuneCents?: number;
  detuneGain?: number;
  chorusMix?: number;
  filterEnvAmount?: number;
  filterEnvRelease?: number;
}

export interface HarmonyPresetData {
  rootOffset: number;
  scaleId: string;
  chordCount: number;
}

export interface SynthGridPresetData {
  padCycleBars: number;
  padSubdiv: number;
  bassSubdiv: number;
  melodySubdiv: number;
}

export interface SynthFxLinePresetData {
  reverbSend: number;
  delaySend: number;
  glide?: number;
  strum?: number;
  rollRate?: number;
}

export interface SidechainPresetData {
  trigger: 'kick' | 'snare' | 'none';
  target: 'all' | 'bass' | 'pad' | 'melody';
  depth: number;
  release: number;
}

/** Forme d'origine d'un preset de morceau (voir l'en-tête pour l'écart vs SongPreset). */
export interface SongPresetData {
  id: string;
  cat: string;
  label: string;
  tempo: number;
  swing: number;
  drag: number;
  globalSaturation: number;
  globalCompression: number;
  globalBitcrush: number;
  spontRoll?: number;
  fillEvery?: number;
  ghostDensity?: number;
  ghostRow?: string;
  demo: string;
  history: string;
  kick: DrumLinePresetData;
  snare: DrumLinePresetData;
  hat: DrumLinePresetData;
  // Clap/shaker (PLAN.md §6) : absents de la plupart des presets d'origine
  // (voix ajoutées après coup) — optionnels, appliqués seulement quand le
  // genre s'y prête (voir presetAdapter.ts, qui les laisse silencieux sinon).
  clap?: DrumLinePresetData;
  shaker?: DrumLinePresetData;
  synthVoice: { bass: VoicePresetData; pad: VoicePresetData; melody: VoicePresetData };
  harmony: HarmonyPresetData;
  synthGrid: SynthGridPresetData;
  noteSeed: number;
  synthFillRate: number;
  synthFx: { bass: SynthFxLinePresetData; pad: SynthFxLinePresetData; melody: SynthFxLinePresetData };
  sidechain: SidechainPresetData;
}

// ---------- Helpers (portés tels quels depuis l'original, typés) ----------

function pad<T>(arr: readonly T[], len: number, fill: T): T[] {
  const out: T[] = new Array(len).fill(fill);
  for(let i=0;i<arr.length && i<len;i++) out[i] = arr[i];
  return out;
}
// `pad` n'est pas utilisé par les données PRESETS elles-mêmes mais faisait
// partie des helpers de la section ; conservé pour fidélité et usage futur.
void pad;

function b(indices: number[], len: number): boolean[] { const a: boolean[] = new Array(len).fill(false); indices.forEach(i=>a[i]=true); return a; }

function h(closedIdx: number[] | null, len: number, openIdx?: number[] | null, rollMap?: RollMap): { pattern: number[]; rolls: number[] } {
  const a: number[] = new Array(len).fill(0);
  (closedIdx||[]).forEach(i=>a[i]=1);
  (openIdx||[]).forEach(i=>a[i]=2);
  const r: number[] = new Array(len).fill(1);
  if(rollMap){
    const m = rollMap; // alias const : préserve le narrowing dans la callback (TS strict)
    Object.keys(m).forEach(k=>{ r[Number(k)] = m[k]; });
  }
  return { pattern: a, rolls: r };
}

// ---------- Données (34 presets, verbatim) ----------

/* ⚠️ LES QUATRE GENRES QUI N'EXISTENT PAS ENCORE EN 2005.
 *
 * Le récit se passe en 2005 (`ANNEE`, carriere.ts) : c'est la seule année où
 * le postulat tient — les sonneries sont encore un marché dont un petit label
 * peut vivre. Or le verbe `style` tirait dans les 34 presets, donc il
 * proposait « Trap moderne », « Drill », « Amapiano » et « Gqom » comme
 * réponses possibles à un stagiaire de 2005. Mesuré sur 400 tirages avant
 * correctif : **39 % des parties affichaient au moins un de ces quatre
 * genres**, et **10 % du temps c'était la bonne réponse**.
 *
 * ⚠️ La règle vaut pour ce que le JEU propose, pas pour ce que l'Atelier
 * contient : le menu Morceaux garde les 34, parce que c'est un outil et non le
 * récit. Quelqu'un qui compose aujourd'hui a le droit de charger un amapiano ;
 * personne, en 2005, n'a le droit de le reconnaître à l'oreille.
 *
 * Les dates : trap moderne et drill au tournant des années 2010, gqom vers
 * 2011, amapiano vers 2016. Tout le reste du catalogue est antérieur à 2005 —
 * l'UK garage culmine en 1997-2001, la French touch dans les années 90, le
 * dembow explose en 2004.
 */
export const HORS_EPOQUE = ['trapmodern', 'drill', 'amapiano', 'gqom'];

export const PRESETS: SongPresetData[] = [
  { id:'boombap', cat:'Hip-hop / trap', label:'Boom bap 90s', tempo:93, swing:8, drag:0,
    globalSaturation:15, globalCompression:25, globalBitcrush:10,
    ghostDensity:6, ghostRow:'kick',
    demo:'Kick sur les 1e/4e/6e croches, snare sur 2 et 4, hat droit + pickup avant le temps 3 ; ghost kicks (pas ghost snare) pour la variation',
    history:"Né à New York au tournant des années 90 (Pete Rock, DJ Premier), porté par le sampling MPC et un swing subtil sur les drums.",
    kick:{subdiv:8, pattern:b([0,3,5],8), shift:0, volume:100, pitch:-3, attack:0, decay:8, tone:12},
    snare:{subdiv:8, pattern:b([2,6],8), shift:0, volume:90, pitch:0, attack:0, decay:-5, tone:-10},
    hat:{subdiv:16, ...h([0,2,4,6,7,8,10,12,14],16), shift:0, volume:60, pitch:2, attack:0, decay:-5, tone:8},
    // Clap qui double la snare (même pas) à volume réduit : la couche
    // classique boom bap qui épaissit le "crack" sans changer le rythme.
    clap:{subdiv:8, pattern:b([2,6],8), shift:0, volume:55, pitch:0, attack:0, decay:-5, tone:-8},
    synthVoice: {
      bass:   { type:'sine', cutoff:500, attack:0.01, release:0.18, subGain:0.5, vibratoDepth:0.15, tone:15 },
      pad:    { type:'triangle', cutoff:700, attack:0.15, release:0.5, detuneCents:8, detuneGain:0.5, chorusMix:0.4, tone:10 },
      melody: { type:'triangle', cutoff:1400, attack:0.02, release:0.2, vibratoDepth:0.2 },
    },
    // D dorien : couleur jazzy/soulful typique du sample-based boom bap (Pete
    // Rock, Dilla) — le 6e degré majeur du dorien (par rapport au mineur
    // naturel) donne cette teinte "suspendue", moins sombre qu'un mineur pur.
    harmony: { rootOffset: 2, scaleId: 'dorian', chordCount: 4 },
    // Graine fixe : remplissage toujours identique au rechargement de ce
    // preset (pas un tirage différent à chaque fois). Densité modérée,
    // cohérente avec le côté soulful/samplé plutôt que dense du boom bap.
    // Nappe sur 4 mesures (tenue, laisse le temps aux accords de respirer),
    // subdivisions 4/8/8 : accords en noires, basse/mélodie en croches —
    // cohérent avec le côté samplé/pas trop dense du boom bap.
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4001, synthFillRate: 60,
    // Réverbe chaude sur la Nappe (ambiance "salle" façon sample), basse
    // sèche (fondation, pas de flou). Glide léger sur la basse pour un feel
    // joué à la main plutôt que quantifié au sample près. Quelques rafales
    // sur la mélodie pour casser la mécanique, sans excès.
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.15 },
      pad:    { reverbSend: 0.3,  delaySend: 0.1,   strum: 0.15 },
      melody: { reverbSend: 0.2,  delaySend: 0.15,  glide: 0.1, rollRate: 0.1 },
    },
    // Pas de sidechain : le boom bap ne pompe pas, c'est un feel posé/organique.
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 } },
  { id:'trapmodern', cat:'Hip-hop / trap', label:'Trap moderne', tempo:70, swing:0, drag:0,
    globalSaturation:10, globalCompression:30, globalBitcrush:0,
    spontRoll:15,
    demo:'Polyrythmie 8:4:16 + rafales de hat + un hat ouvert en fin de mesure',
    history:"Émergé dans le sud des États-Unis (Atlanta) au début des années 2010, généralisé par la 808 et les hi-hats roulés.",
    kick:{subdiv:8, pattern:b([0,3,5],8), shift:0, volume:100, pitch:-8, attack:0, decay:35, tone:20},
    snare:{subdiv:4, pattern:b([2],4), shift:0, volume:95, pitch:3, attack:0, decay:-10, tone:15},
    hat:{subdiv:16, ...h([0,1,2,3,4,5,7,8,9,10,11,12,13],16,[15],{'6':3,'14':2}), shift:0, volume:65, pitch:5, attack:0, decay:-10, tone:25},
    // Clap qui double la snare : couche standard du trap moderne, en plus
    // des hi-hats roulés.
    clap:{subdiv:4, pattern:b([2],4), shift:0, volume:70, pitch:1, attack:0, decay:-10, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:350, attack:0.008, release:0.4, subGain:0.9, tone:25 },
      pad:    { type:'sawtooth', cutoff:500, attack:0.05, release:0.25 },
      melody: { type:'square', cutoff:1200, filterEnvAmount:2500, filterEnvRelease:0.12, attack:0.003, release:0.08, tone:10 },
    },
    // A mineur naturel : sonorité sombre et tendue, cohérente avec le trap
    // moderne (souvent construit sur des gammes mineures, parfois harmonique,
    // mais le naturel reste le point de départ le plus courant et le plus sûr).
    harmony: { rootOffset: 9, scaleId: 'minor', chordCount: 4 },
    // Plus clairsemé que boombap : le trap moderne laisse plus d'espace,
    // la 808 (basse) porte l'essentiel, pas besoin de tout remplir.
    // Basse/mélodie en doubles-croches (16) : le côté saccadé/roulé typique
    // du trap (808 slides, hi-hats roulés) se retrouve dans des lignes
    // synthé denses, la Nappe reste plus posée en noires.
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 16, melodySubdiv: 16 },
    noteSeed: 4002, synthFillRate: 55,
    // Basse sèche et saturée (808, pas de flou spatial), Nappe sombre et
    // noyée de réverbe/delay pour l'atmosphère. Glide prononcé sur la basse :
    // le "slide" de 808 est LA signature sonore du trap moderne. Rafales
    // fréquentes sur la mélodie (arpèges/plucks roulés, très caractéristique).
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.3 },
      pad:    { reverbSend: 0.4,  delaySend: 0.2 },
      melody: { reverbSend: 0.25, delaySend: 0.3,  rollRate: 0.25 },
    },
    // Pompe subtile sur l'ensemble du synthé au kick — courant dans le trap
    // moderne pour donner de l'air au mix sans être aussi marqué qu'en house.
    sidechain: { trigger: 'kick', target: 'all', depth: 40, release: 120 } },
  { id:'drill', cat:'Hip-hop / trap', label:'Drill (UK/Chicago)', tempo:140, swing:0, drag:0,
    globalSaturation:8, globalCompression:25, globalBitcrush:0,
    spontRoll:15,
    demo:'Snare décalée de 18% (le \u00ab glisse \u00bb typique du drill) + rafales',
    history:"Apparu à Chicago vers 2012, puis réinventé à Londres avec des lignes de basse glissées et un tempo plus rapide.",
    kick:{subdiv:8, pattern:b([0,2,6],8), shift:0, volume:100, pitch:-6, attack:0, decay:20, tone:15},
    snare:{subdiv:4, pattern:b([2],4), shift:18, volume:95, pitch:4, attack:0, decay:-15, tone:18},
    hat:{subdiv:16, ...h([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],16,[],{'5':3,'13':3}), shift:0, volume:60, pitch:4, attack:0, decay:-8, tone:22} ,
    // Clap qui double la snare décalée (même shift) : renforce le "glisse"
    // signature du drill au lieu de le contrarier avec un pas droit.
    clap:{subdiv:4, pattern:b([2],4), shift:18, volume:75, pitch:2, attack:0, decay:-10, tone:8},
    synthVoice: {
      bass:   { type:'sine', cutoff:300, attack:0.006, release:0.35, subGain:0.85, tone:22 },
      pad:    { type:'sawtooth', cutoff:450, attack:0.06, release:0.3 },
      melody: { type:'square', cutoff:1300, filterEnvAmount:2200, filterEnvRelease:0.1, attack:0.003, release:0.09, tone:8 },
    },
    // E phrygien : tension/noirceur typique du drill (proche du mineur mais
    // le 2nd degré abaissé accentue le côté menaçant).
    harmony: { rootOffset: 4, scaleId: 'phrygian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 16, melodySubdiv: 16 },
    noteSeed: 4005, synthFillRate: 50,
    // Glide marqué sur la basse : le "slide" de 808 est aussi central au
    // drill qu'au trap. Rafales fréquentes sur la mélodie (arpèges tendus).
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.3 },
      pad:    { reverbSend: 0.3,  delaySend: 0.15 },
      melody: { reverbSend: 0.2,  delaySend: 0.2,  rollRate: 0.2 },
    },
    sidechain: { trigger: 'kick', target: 'all', depth: 35, release: 130 }
    },
  { id:'dilla', cat:'Hip-hop / trap', label:"J Dilla \u00ab drunk beat \u00bb", tempo:88, swing:10, drag:15,
    globalSaturation:12, globalCompression:15, globalBitcrush:15,
    ghostDensity:12,
    demo:'Traîne 15% + swing 10% : le duo qui crée le feel \u00ab ivre \u00bb',
    history:"Signature de J Dilla (Detroit, fin 90s/2000s) : quantification volontairement imprécise sur MPC3000.",
    kick:{subdiv:8, pattern:b([0,3,5],8), shift:0, volume:100, pitch:-2, attack:5, decay:10, tone:8},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:90, pitch:-2, attack:8, decay:0, tone:-12},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:55, pitch:-1, attack:4, decay:0, tone:0} ,
    // Clap discret qui double la snare, volume bas : un peu de corps en plus
    // sans dénaturer le feel posé/organique du "drunk beat".
    clap:{subdiv:4, pattern:b([1,3],4), shift:0, volume:45, pitch:-1, attack:5, decay:-5, tone:-10},
    synthVoice: {
      bass:   { type:'sine', cutoff:550, attack:0.012, release:0.2, subGain:0.4, tone:10 },
      pad:    { type:'triangle', cutoff:750, attack:0.12, release:0.45, chorusMix:0.3 },
      melody: { type:'triangle', cutoff:1300, attack:0.025, release:0.18, vibratoDepth:0.1 },
    },
    // A dorien : même famille jazzy/soulful que le boom bap, racine différente
    // pour varier — cohérent avec le sample-based (Dilla samplait souvent du
    // jazz/soul).
    harmony: { rootOffset: 9, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4006, synthFillRate: 55,
    // Glide sur la basse pour le côté "ivre"/pas quantifié — cohérent avec le
    // swing 10% + traîne 15% déjà réglés sur ce preset. Rafales rares.
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.2 },
      pad:    { reverbSend: 0.3,  delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1,  glide: 0.1, rollRate: 0.05 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'dembow', cat:'Hip-hop / trap', label:'Dembow / reggaeton', tempo:95, swing:0, drag:0,
    globalSaturation:5, globalCompression:20, globalBitcrush:0,
    demo:'Kick = tresillo (1 + contretemps du 2, le \u00ab boom\u2026boom \u00bb) ; snare/rimshot en \u00ab ch\u2026chick \u00bb sur les pas 4 et 7 (sur 16) \u2014 cette syncopation tombe entre deux croches et ne pouvait pas être placée avec seulement 8 pas ; hat ouvert sur les contretemps, choke à chaque coup',
    history:"Rythme panaméen des années 80 (issu du reggae en español), devenu la colonne vertébrale du reggaeton dans les années 90-2000. Les sources ne s'accordent pas toutes sur la position exacte de chaque frappe (variantes selon les régions et les productions) ; ceci reprend la version la plus citée.",
    kick:{subdiv:16, pattern:b([0,6],16), shift:0, volume:100, pitch:-2, attack:0, decay:5, tone:10},
    snare:{subdiv:16, pattern:[0,0,0,0,2,0,0,2,0,0,0,0,0,0,0,0], shift:0, volume:90, pitch:2, attack:0, decay:-10, tone:10},
    hat:{subdiv:8, ...h([0,2,4,6],8,[1,3,5,7]), shift:0, volume:55, pitch:2, attack:0, decay:-5, tone:15} ,
    // Clap qui accentue le même "ch...chick" que le rimshot (pas 4 et 7 sur
    // 16), plus dur/sec — épaissit la syncopation caractéristique du dembow.
    // Shaker en croches continues : le güira/maraca qui porte le groove en
    // continu sous le tresillo, très caractéristique du reggaeton.
    clap:{subdiv:16, pattern:b([4,7],16), shift:0, volume:70, pitch:0, attack:0, decay:-8, tone:0},
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:35, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.006, release:0.15, subGain:0.5 },
      pad:    { type:'square', cutoff:850, attack:0.02, release:0.35, chorusMix:0.2 },
      melody: { type:'square', cutoff:1500, attack:0.008, release:0.15 },
    },
    // G mineur naturel : tonalité fréquente dans le reggaeton.
    harmony: { rootOffset: 7, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4007, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.2,  delaySend: 0.15 },
      melody: { reverbSend: 0.15, delaySend: 0.25, rollRate: 0.15 },
    },
    sidechain: { trigger: 'kick', target: 'pad', depth: 40, release: 150 }
    },

  { id:'house', cat:'Électronique / club', label:'House four-on-the-floor', tempo:125, swing:0, drag:0,
    globalSaturation:5, globalCompression:20, globalBitcrush:0,
    demo:'Hat ouvert/fermé en alternance stricte : démonstration directe du choke',
    history:"Née à Chicago au début des années 80 dans des clubs comme le Warehouse, avec des boîtes à rythmes Roland TR-909/808.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:100, pitch:-4, attack:0, decay:0, tone:8},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:80, pitch:0, attack:0, decay:-8, tone:5},
    hat:{subdiv:8, ...h([0,2,4,6],8,[1,3,5,7]), shift:0, volume:60, pitch:0, attack:0, decay:0, tone:10},
    // Le "house clap" classique double la snare sur l'offbeat — aussi
    // signature du genre que le pompage sidechain.
    clap:{subdiv:4, pattern:b([1,3],4), shift:0, volume:75, pitch:0, attack:0, decay:-5, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:700, attack:0.004, release:0.1, subGain:0.4 },
      pad:    { type:'sawtooth', cutoff:600, filterEnvAmount:3200, filterEnvRelease:0.35, detuneCents:12, detuneGain:0.7, tone:15 },
      melody: { type:'square', cutoff:1800, filterEnvAmount:1800, filterEnvRelease:0.15, attack:0.005, release:0.1 },
    },
    // C majeur : couleur lumineuse/euphorique typique de la house classique
    // (accords majeurs, souvent add9/maj7 dans le genre — le majeur simple
    // reste la base la plus proche avec les 5 gammes disponibles ici).
    harmony: { rootOffset: 0, scaleId: 'major', chordCount: 4 },
    // Plus dense : la house carbure aux accords qui tournent en continu
    // (stabs/chords sur (presque) chaque pas), pas aux silences.
    // Boucle plus courte (2 mesures) : les accords tournent plus vite,
    // typique du groove four-on-the-floor. Nappe en noires (4 subdivisions
    // — ramené de 8, qui donnait trop d'accords collés/superposés à
    // l'oreille), mélodie en doubles-croches pour un mouvement plus vif.
    synthGrid: { padCycleBars: 2, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 16 },
    noteSeed: 4003, synthFillRate: 75,
    // Basse sèche (porte le groove, pas d'espace flou dessus). Delay marqué
    // sur la mélodie : les échos rythmiques en 1/8 sont une signature de la
    // house classique. Pas de glide ni de rafales ici : c'est un groove net,
    // pas glissé.
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.2,  delaySend: 0.1 },
      melody: { reverbSend: 0.3,  delaySend: 0.35 },
    },
    // LE pompage sidechain kick->tout, la signature sonore de la house.
    // Depth franc (65%) : c'est un effet qu'on doit clairement entendre.
    sidechain: { trigger: 'kick', target: 'all', depth: 65, release: 150 } },
  { id:'housefrenchtouch', cat:'Électronique / club', label:'French touch', tempo:122, swing:10, drag:0,
    globalSaturation:20, globalCompression:15, globalBitcrush:5,
    spontRoll:10, fillEvery:4, ghostDensity:15,
    demo:'Kick 4/4 stable + clap 2/4 + hat filtré vers le sourd (Tone -20%) avec swing (10%) qui shuffle vraiment + le trait signature du genre : la Nappe s\u2019ouvre en filtre à chaque accord (Ouv. filtre marqué, fermeture lente) façon boucle disco filtrée, portée par une pompe kick nettement audible',
    history:"Mouvement français de la fin des années 90 et 2000 (Daft Punk, Cassius, Stardust), samples disco filtrés et groove syncopé ; prolongé plus tard par le label Ed Banger.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:95, pitch:-3, attack:3, decay:5, tone:5},
    snare:{subdiv:4, pattern:b([1,3],4), shift:4, volume:80, pitch:-1, attack:3, decay:-5, tone:-8},
    hat:{subdiv:16, ...h([2,3,10,11],16,[6,14]), shift:8, volume:55, pitch:-1, attack:2, decay:0, tone:-20} ,
    // Le "clap 2/4" mentionné dans la démo, désormais une vraie ligne clap
    // (même pas/décalage que la snare) plutôt qu'implicite dans son timbre.
    clap:{subdiv:4, pattern:b([1,3],4), shift:4, volume:70, pitch:-1, attack:3, decay:-5, tone:-8},
    synthVoice: {
      bass:   { type:'sine', cutoff:650, attack:0.005, release:0.12, subGain:0.35 },
      // Filtre bas au repos + ouverture forte et lente : c'est ce sweep qui
      // porte le genre (la boucle disco filtrée qui "s'ouvre" à chaque
      // accord), plutôt qu'un simple detune statique.
      pad:    { type:'sawtooth', cutoff:450, filterEnvAmount:3800, filterEnvRelease:0.45, detuneCents:10, detuneGain:0.6, tone:20 },
      melody: { type:'square', cutoff:2000, filterEnvAmount:1500, filterEnvRelease:0.12, attack:0.004, release:0.09 },
    },
    // F majeur : chaud, cohérent avec le côté disco filtré du genre.
    harmony: { rootOffset: 5, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 2, padSubdiv: 8, bassSubdiv: 8, melodySubdiv: 16 },
    noteSeed: 4008, synthFillRate: 70,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.25, delaySend: 0.15 },
      melody: { reverbSend: 0.2,  delaySend: 0.3 },
    },
    // Pompe nettement audible sur tout le synthé — c'est elle qui fait
    // "respirer" la boucle filtrée au rythme du kick, trait aussi
    // caractéristique que le filtre lui-même dans ce genre.
    sidechain: { trigger: 'kick', target: 'all', depth: 70, release: 160 }
    },
  { id:'hardhouse', cat:'Électronique / club', label:'Hard house / Hands up', tempo:145, swing:0, drag:0,
    globalSaturation:15, globalCompression:35, globalBitcrush:0,
    demo:'Kick 4/4 plus dur et rapide (145 BPM) que la house classique + hat dense et ouvert pour l\u2019énergie \u00ab hands up \u00bb',
    history:"Popularisé en Europe (Pays-Bas, Allemagne, Royaume-Uni) à la fin des années 90, version plus dure et rapide de la house.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:100, pitch:-2, attack:0, decay:-5, tone:25},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:90, pitch:3, attack:0, decay:-15, tone:20},
    hat:{subdiv:16, ...h([0,1,3,4,5,7,8,9,11,12,13,15],16,[2,6,10,14],{'14':2}), shift:0, volume:60, pitch:3, attack:0, decay:-5, tone:20},
    // Clap qui double la snare, franc — l'énergie "hands up" carbure aussi
    // au layering des percussions.
    clap:{subdiv:4, pattern:b([1,3],4), shift:0, volume:80, pitch:3, attack:0, decay:-10, tone:15},
    synthVoice: {
      bass:   { type:'sine', cutoff:650, attack:0.004, release:0.1, subGain:0.4 },
      pad:    { type:'sawtooth', cutoff:700, filterEnvAmount:3500, filterEnvRelease:0.3, detuneCents:15, detuneGain:0.75, tone:20 },
      melody: { type:'square', cutoff:2000, filterEnvAmount:2000, filterEnvRelease:0.1, attack:0.004, release:0.08 },
    },
    // A majeur : brillant/euphorique, plus tendu que la house classique.
    harmony: { rootOffset: 9, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 2, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 16 },
    // Très dense : l'énergie "hands up" carbure au remplissage.
    noteSeed: 4034, synthFillRate: 80,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.3,  delaySend: 0.2 },
      melody: { reverbSend: 0.25, delaySend: 0.3,  rollRate: 0.2 },
    },
    // La pompe la plus appuyée de tous les presets — cohérent avec l'énergie
    // "hands up" du genre.
    sidechain: { trigger: 'kick', target: 'all', depth: 70, release: 130 } },
  { id:'techno', cat:'Électronique / club', label:'Techno minimale', tempo:130, swing:0, drag:0,
    globalSaturation:5, globalCompression:15, globalBitcrush:0,
    spontRoll:10,
    demo:'Snare à volume 0 (coupée sans être effacée) + rafales d\u2019accent sur le hat',
    history:"Née à Détroit au milieu des années 80 (Juan Atkins, Derrick May), pensée pour les machines plutôt que les samples.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:100, pitch:-5, attack:0, decay:-10, tone:10},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:0, pitch:0, attack:0, decay:-10, tone:0},
    hat:{subdiv:16, ...h([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],16,[],{'3':3,'11':3}), shift:0, volume:55, pitch:-2, attack:0, decay:-10, tone:15} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:500, attack:0.004, release:0.1, subGain:0.5 },
      pad:    { type:'sawtooth', cutoff:600, attack:0.1, release:0.6, detuneCents:6, detuneGain:0.4 },
      melody: { type:'square', cutoff:1400, filterEnvAmount:2000, filterEnvRelease:0.2, attack:0.005, release:0.15 },
    },
    // D mineur : sonorité froide/hypnotique, typique de la techno minimale.
    harmony: { rootOffset: 2, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 16 },
    // Très clairsemé : le minimalisme est le principe même du genre, pas un
    // manque de contenu.
    noteSeed: 4009, synthFillRate: 30,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.4,  delaySend: 0.3 },
      melody: { reverbSend: 0.3,  delaySend: 0.4,  rollRate: 0.1 },
    },
    sidechain: { trigger: 'kick', target: 'all', depth: 50, release: 140 }
    },
  { id:'garage', cat:'Électronique / club', label:'UK Garage / 2-step', tempo:130, swing:45, drag:0,
    globalSaturation:8, globalCompression:20, globalBitcrush:0,
    demo:'Swing très marqué (45%) sur un hat syncopé (pas dense à saturation) pour que le shuffle ait la place de s\u2019entendre',
    history:"Le UK Garage émerge à Londres au milieu des années 90, héritier du garage américain avec un swing prononcé.",
    kick:{subdiv:8, pattern:b([0,3,5],8), shift:0, volume:100, pitch:-2, attack:0, decay:0, tone:8},
    snare:{subdiv:8, pattern:b([2,6],8), shift:0, volume:90, pitch:2, attack:0, decay:-5, tone:12},
    hat:{subdiv:16, ...h([2,4,6,9,10,12,14],16), shift:0, volume:55, pitch:3, attack:0, decay:-5, tone:15} ,
    // Clap qui double la snare : couche classique du garage pour épaissir
    // le "snap" sous le shuffle marqué du hat.
    clap:{subdiv:8, pattern:b([2,6],8), shift:0, volume:65, pitch:2, attack:0, decay:-5, tone:10},
    synthVoice: {
      bass:   { type:'sine', cutoff:550, attack:0.006, release:0.15, subGain:0.45 },
      pad:    { type:'sawtooth', cutoff:800, attack:0.05, release:0.3, chorusMix:0.3 },
      melody: { type:'square', cutoff:1800, filterEnvAmount:1600, filterEnvRelease:0.12, attack:0.005, release:0.1 },
    },
    // G majeur : lumineux, cohérent avec le côté vocal/soulful du UK garage.
    harmony: { rootOffset: 7, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 2, padSubdiv: 8, bassSubdiv: 16, melodySubdiv: 16 },
    noteSeed: 4010, synthFillRate: 65,
    // Basse syncopée (doubles-croches) avec un léger glide — signature du
    // garage.
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.15 },
      pad:    { reverbSend: 0.3,  delaySend: 0.2 },
      melody: { reverbSend: 0.2,  delaySend: 0.35, rollRate: 0.15 },
    },
    sidechain: { trigger: 'kick', target: 'bass', depth: 30, release: 150 }
    },
  { id:'jungle', cat:'Électronique / club', label:'Jungle / DnB (break)', tempo:170, swing:8, drag:0,
    globalSaturation:15, globalCompression:20, globalBitcrush:10,
    demo:'Snare ancrée sur le backbeat (2 et 4) + kick syncopé + hat ouvert pour le côté haché',
    history:"Né au Royaume-Uni au début des années 90, à partir de breaks samplés (dont l'Amen Break) accélérés.",
    kick:{subdiv:8, pattern:b([0,2,5],8), shift:0, volume:100, pitch:-3, attack:0, decay:-10, tone:12},
    snare:{subdiv:8, pattern:b([2,6],8), shift:0, volume:90, pitch:3, attack:0, decay:-15, tone:10},
    hat:{subdiv:16, ...h([0,1,3,4,5,6,7,8,9,11,12,13,14,15],16,[10],{'2':3}), shift:0, volume:55, pitch:2, attack:0, decay:-10, tone:10} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:400, attack:0.004, release:0.2, subGain:0.6, tone:12 },
      pad:    { type:'sawtooth', cutoff:550, attack:0.08, release:0.4, detuneCents:10, detuneGain:0.5 },
      melody: { type:'square', cutoff:1600, filterEnvAmount:1800, filterEnvRelease:0.1, attack:0.004, release:0.1 },
    },
    // E mineur : sombre, cohérent avec le côté sound-system/jungle.
    harmony: { rootOffset: 4, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 16, melodySubdiv: 16 },
    noteSeed: 4011, synthFillRate: 50,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.2 },
      pad:    { reverbSend: 0.35, delaySend: 0.25 },
      melody: { reverbSend: 0.2,  delaySend: 0.2,  rollRate: 0.2 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'dubstep', cat:'Électronique / club', label:'Dubstep half-time', tempo:140, swing:0, drag:5,
    globalSaturation:20, globalCompression:25, globalBitcrush:5,
    demo:'Traîne 5% + hat décalé + une rafale finale façon \u00ab skitter \u00bb',
    history:"Émergé à Croydon (sud de Londres) au début des années 2000, autour de labels comme Big Apple/Tempa.",
    kick:{subdiv:8, pattern:b([0,4],8), shift:0, volume:100, pitch:-10, attack:0, decay:40, tone:30},
    snare:{subdiv:4, pattern:b([2],4), shift:0, volume:95, pitch:2, attack:0, decay:10, tone:15},
    hat:{subdiv:8, ...h([0,3,6],8,[],{'6':3}), shift:12, volume:55, pitch:0, attack:0, decay:5, tone:10} ,
    // Clap qui double le gros snare half-time (le seul coup fort de la
    // mesure) — l'épaissir en couche est une pratique courante en dubstep.
    clap:{subdiv:4, pattern:b([2],4), shift:0, volume:65, pitch:1, attack:0, decay:0, tone:10},
    synthVoice: {
      bass:   { type:'sawtooth', cutoff:250, attack:0.008, release:0.3, subGain:0.7, tone:30 },
      pad:    { type:'sawtooth', cutoff:500, attack:0.1, release:0.5 },
      melody: { type:'square', cutoff:900, attack:0.01, release:0.2, tone:15 },
    },
    // F mineur : lourd/sombre, cohérent avec le half-time dubstep.
    harmony: { rootOffset: 5, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    // Sparse et lourd plutôt que dense : le poids prime sur le remplissage.
    // Graine choisie explicitement (4012 laissait la Nappe totalement vide —
    // un tirage à zéro accord sur seulement 4 pas, statistiquement possible
    // à 40% de remplissage).
    noteSeed: 5000, synthFillRate: 40,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.4,  delaySend: 0.2 },
      melody: { reverbSend: 0.25, delaySend: 0.15 },
    },
    // Pompe lourde et lente — cohérent avec le poids du half-time.
    sidechain: { trigger: 'kick', target: 'all', depth: 50, release: 200 }
    },

  { id:'funk', cat:'Funk / soul / jazz', label:'Funk (James Brown)', tempo:108, swing:10, drag:0,
    globalSaturation:10, globalCompression:15, globalBitcrush:0,
    ghostDensity:18,
    demo:'Polyrythmie 16:4:16 + un hat ouvert isolé pour l\u2019accent \u00ab skreek \u00bb',
    history:"Style codifié par James Brown et ses batteurs (Clyde Stubblefield, Jabo Starks) à la fin des années 60.",
    kick:{subdiv:16, pattern:b([0,3,6,10],16), shift:0, volume:100, pitch:-2, attack:0, decay:-5, tone:5},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:90, pitch:1, attack:0, decay:-10, tone:5},
    hat:{subdiv:16, ...h([0,1,2,3,4,5,6,7,9,10,11,12,13,14,15],16,[8]), shift:0, volume:55, pitch:0, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues : le tambourin/shaker qui porte le groove
    // funk en continu sous le backbeat, très caractéristique du genre.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:30, pitch:0, attack:0, decay:0, tone:8},
    synthVoice: {
      bass:   { type:'sine', cutoff:650, attack:0.005, release:0.12, subGain:0.3, tone:8 },
      pad:    { type:'square', cutoff:900, attack:0.02, release:0.3, chorusMix:0.2 },
      melody: { type:'sawtooth', cutoff:1800, attack:0.006, release:0.12, tone:10 },
    },
    // E mixolydien : couleur dominante/groovy typique du funk.
    harmony: { rootOffset: 4, scaleId: 'mixolydian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4013, synthFillRate: 65,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.2,  delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1,  rollRate: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'motown', cat:'Funk / soul / jazz', label:'Motown / soul', tempo:100, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Témoin \u00ab carré \u00bb : swing/traîne à zéro, pour comparer',
    history:"Son de la Motown à Detroit dans les années 60, pensé pour la radio AM avec un groove simple et carré.",
    kick:{subdiv:4, pattern:b([0,2],4), shift:0, volume:100, pitch:0, attack:0, decay:0, tone:0},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:90, pitch:0, attack:0, decay:0, tone:0},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:55, pitch:0, attack:0, decay:0, tone:0} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.008, release:0.15, subGain:0.3 },
      pad:    { type:'triangle', cutoff:800, attack:0.1, release:0.4, chorusMix:0.25 },
      melody: { type:'triangle', cutoff:1400, attack:0.015, release:0.2, vibratoDepth:0.1 },
    },
    // C majeur : chaud/classique, cohérent avec la soul Motown.
    harmony: { rootOffset: 0, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4014, synthFillRate: 60,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.3,  delaySend: 0.1 },
      melody: { reverbSend: 0.2,  delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'swingjazz', cat:'Funk / soul / jazz', label:'Swing jazz (ride)', tempo:120, swing:0, drag:5,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Vrai motif de ride swing : triolet par temps (12 pas), \u00ab ding-ding-a-ding \u00bb + traîne',
    history:"Hérité du jazz swing des années 30-40, où la batterie migre du charleston vers la cymbale ride.",
    kick:{subdiv:4, pattern:b([0],4), shift:0, volume:85, pitch:2, attack:10, decay:-15, tone:0},
    snare:{subdiv:4, pattern:b([2],4), shift:6, volume:60, pitch:-3, attack:15, decay:-10, tone:-15},
    hat:{subdiv:12, ...h([0,2,3,5,6,8,9,11],12), shift:0, volume:65, pitch:-4, attack:8, decay:10, tone:0} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:550, attack:0.01, release:0.18, subGain:0.35 },
      pad:    { type:'triangle', cutoff:750, attack:0.12, release:0.45, chorusMix:0.3 },
      melody: { type:'sine', cutoff:1100, attack:0.02, release:0.22, vibratoDepth:0.18 },
    },
    // Bb dorien : couleur jazzy classique.
    harmony: { rootOffset: 10, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4015, synthFillRate: 60,
    // Réverbe de salle marquée sur la Nappe (ambiance club de jazz), glide
    // sur la basse (walking bass jouée, pas quantifiée).
    synthFx: {
      bass:   { reverbSend: 0.1,  delaySend: 0,    glide: 0.15 },
      pad:    { reverbSend: 0.35, delaySend: 0.1 },
      melody: { reverbSend: 0.2,  delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },

  { id:'clave', cat:'Latin / Afro / Caribbean', label:'Clave son 3-2 (latin)', tempo:95, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'La cellule clave complète (5 frappes réelles) jouée en rim shot sur la snare — plus proche du timbre sec et clair des baguettes de clavé — contre le bombo (kick) et une pulsation régulière (hat en 4)',
    history:"Cellule rythmique afro-cubaine, fondement de la musique son cubaine puis de la salsa.",
    kick:{subdiv:8, pattern:b([3,7],8), shift:0, volume:90, pitch:-4, attack:0, decay:5, tone:0},
    snare:{subdiv:16, pattern:[2,0,0,2,0,0,2,0,0,0,2,0,2,0,0,0], shift:0, volume:80, pitch:3, attack:0, decay:-10, tone:12},
    hat:{subdiv:4, ...h([0,1,2,3],4), shift:0, volume:45, pitch:2, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues : les maracas qui tiennent le pouls
    // régulier sous la cellule clave, omniprésentes dans le son cubain.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:30, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.4 },
      pad:    { type:'triangle', cutoff:800, attack:0.05, release:0.3, chorusMix:0.2 },
      melody: { type:'triangle', cutoff:1400, attack:0.012, release:0.16 },
    },
    // A mineur : tonalité latine courante.
    harmony: { rootOffset: 9, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    // Graine choisie explicitement (4016 laissait la Nappe vide).
    noteSeed: 5000, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.05 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'afrobeat', cat:'Latin / Afro / Caribbean', label:'Afrobeat (Fela Kuti)', tempo:110, swing:0, drag:0,
    globalSaturation:5, globalCompression:10, globalBitcrush:0,
    demo:'Kick calqué sur un motif documenté (1 et 1e, 3 et 3e) + hat en croche+2 doubles-croches par temps',
    history:"Créé par Fela Kuti et son batteur Tony Allen à Lagos dans les années 70, fusion de highlife, jazz et funk.",
    kick:{subdiv:16, pattern:b([0,1,8,9],16), shift:0, volume:100, pitch:3, attack:0, decay:-5, tone:0},
    snare:{subdiv:16, pattern:b([4,12],16), shift:0, volume:80, pitch:1, attack:0, decay:-10, tone:5},
    hat:{subdiv:16, ...h([0,2,3,4,6,7,8,10,11,12,14,15],16), shift:0, volume:55, pitch:1, attack:0, decay:0, tone:8} ,
    // Shaker en croches continues : le shekere qui porte le groove afrobeat
    // en continu, sous les polyrythmies de Tony Allen.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:28, pitch:0, attack:0, decay:0, tone:8},
    synthVoice: {
      bass:   { type:'sine', cutoff:650, attack:0.006, release:0.15, subGain:0.35 },
      pad:    { type:'triangle', cutoff:850, attack:0.06, release:0.35, chorusMix:0.25 },
      melody: { type:'sawtooth', cutoff:1500, attack:0.01, release:0.15 },
    },
    // D dorien : couleur jazzy/modale typique de l'afrobeat (Fela Kuti).
    harmony: { rootOffset: 2, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4017, synthFillRate: 65,
    // La ligne de basse est centrale à l'afrobeat : glide léger pour le
    // groove joué, pas quantifié.
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.2,  delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1,  rollRate: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'amapiano', cat:'Latin / Afro / Caribbean', label:'Amapiano', tempo:112, swing:20, drag:5,
    globalSaturation:8, globalCompression:15, globalBitcrush:0,
    demo:'Kick four-on-the-floor (documenté) + clap sur 2 et 4 + hat ouvert sur les contretemps',
    history:"Apparu autour de Pretoria (Afrique du Sud) au milieu des années 2010, mélange de house, jazz et kwaito.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:100, pitch:-6, attack:5, decay:15, tone:10},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:85, pitch:0, attack:0, decay:-5, tone:0},
    hat:{subdiv:16, ...h([0,1,3,4,5,7,8,9,11,12,13,15],16,[2,6,10,14],{'9':2}), shift:0, volume:55, pitch:1, attack:3, decay:0, tone:5} ,
    // Le "clap sur 2 et 4" mentionné dans la démo, désormais une vraie ligne
    // clap plutôt qu'implicite dans le timbre de la snare.
    clap:{subdiv:4, pattern:b([1,3],4), shift:0, volume:80, pitch:0, attack:3, decay:-5, tone:5},
    // Shaker sur les mêmes contretemps que le hat ouvert : renforce la
    // texture syncopée très caractéristique de l'amapiano.
    shaker:{subdiv:16, pattern:b([2,6,10,14],16), shift:0, volume:35, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:400, attack:0.01, release:0.3, subGain:0.6, tone:10 },
      pad:    { type:'triangle', cutoff:900, attack:0.1, release:0.5, chorusMix:0.35 },
      melody: { type:'triangle', cutoff:1700, attack:0.015, release:0.2, vibratoDepth:0.1 },
    },
    // G dorien : couleur soulful/jazzy typique des accords piano amapiano.
    harmony: { rootOffset: 7, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 8, bassSubdiv: 8, melodySubdiv: 16 },
    noteSeed: 4018, synthFillRate: 65,
    // Glide marqué sur la basse : le "log drum" glissé est central au genre.
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.2 },
      pad:    { reverbSend: 0.35, delaySend: 0.2 },
      melody: { reverbSend: 0.25, delaySend: 0.2,  rollRate: 0.15 },
    },
    sidechain: { trigger: 'kick', target: 'bass', depth: 40, release: 200 }
    },
  { id:'gqom', cat:'Latin / Afro / Caribbean', label:'Gqom (Afrique du Sud)', tempo:130, swing:0, drag:12,
    globalSaturation:15, globalCompression:10, globalBitcrush:8,
    demo:'Kick sur le temps 3 seulement — le \u00ab déni du temps 1 \u00bb typique du gqom, + traîne marquée',
    history:"Né à Durban (Afrique du Sud) au début des années 2010, son minimal et sombre issu de la scène house locale.",
    kick:{subdiv:4, pattern:b([2],4), shift:0, volume:100, pitch:-10, attack:0, decay:25, tone:20},
    snare:{subdiv:4, pattern:b([2],4), shift:0, volume:90, pitch:-4, attack:0, decay:10, tone:-10},
    hat:{subdiv:8, ...h([0,4],8,[],{'4':2}), shift:0, volume:45, pitch:-8, attack:0, decay:15, tone:35} ,
    synthVoice: {
      bass:   { type:'sawtooth', cutoff:300, attack:0.01, release:0.35, subGain:0.6, tone:20 },
      pad:    { type:'sawtooth', cutoff:500, attack:0.1, release:0.5 },
      melody: { type:'sawtooth', cutoff:1000, attack:0.012, release:0.25, tone:10 },
    },
    // F mineur : sombre/minimal, cohérent avec le gqom.
    harmony: { rootOffset: 5, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    // Minimal/sombre : peu d'éléments, beaucoup d'espace.
    noteSeed: 4019, synthFillRate: 35,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.4,  delaySend: 0.3 },
      melody: { reverbSend: 0.25, delaySend: 0.2 },
    },
    sidechain: { trigger: 'kick', target: 'all', depth: 45, release: 180 }
    },
  { id:'dancehall', cat:'Latin / Afro / Caribbean', label:'Dancehall (steppers)', tempo:96, swing:0, drag:0,
    globalSaturation:8, globalCompression:15, globalBitcrush:0,
    demo:'Kick \u00ab steppers \u00bb (chaque temps) — un riddim antérieur au dembow, qui définit plutôt le dancehall numérique depuis les années 80 ; snare en rim shot/cross-stick pour le \u00ab pop \u00bb sec, + hat ouvert en skank',
    history:"Évolution numérique du reggae jamaïcain à partir des années 80, portée par des riddims réutilisés par différents artistes. Le riddim \u00ab steppers \u00bb (kick à chaque temps) a précédé le dembow, qui domine le dancehall depuis le milieu des années 80 et n'est pas modélisé ici.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:95, pitch:-2, attack:0, decay:0, tone:8},
    snare:{subdiv:8, pattern:[0,0,2,0,0,0,2,0], shift:0, volume:90, pitch:2, attack:0, decay:-10, tone:10},
    hat:{subdiv:8, ...h([],8,[1,3,5,7]), shift:0, volume:55, pitch:3, attack:0, decay:0, tone:15},
    // Clap qui double le rim shot/cross-stick de la snare : épaissit le
    // "pop" sec caractéristique du dancehall numérique.
    clap:{subdiv:8, pattern:b([2,6],8), shift:0, volume:60, pitch:1, attack:0, decay:-5, tone:8},
    synthVoice: {
      bass:   { type:'triangle', cutoff:450, attack:0.015, release:0.3, subGain:0.6 },
      pad:    { type:'square', cutoff:800, attack:0.02, release:0.6, chorusMix:0.5, tone:5 },
      melody: { type:'square', cutoff:1600, attack:0.01, release:0.25 },
    },
    // G dorien : teinte reggae/dancehall classique — mineur mais moins sombre
    // qu'un naturel pur, cohérent avec le groove "steppers" plutôt joyeux
    // malgré la tonalité mineure.
    harmony: { rootOffset: 7, scaleId: 'dorian', chordCount: 4 },
    // Densité moyenne, cohérente avec le côté skank posé du riddim steppers.
    // Chords posés en noires, basse/mélodie en croches — cohérent avec le
    // groove steppers, plus posé que le dembow/dancehall numérique moderne.
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4004, synthFillRate: 60,
    // Delay marqué sur la Nappe : l'écho dub sur le skank est LA signature
    // sonore du reggae/dancehall. Glide léger partout pour le côté "joué",
    // pas quantifié à la sample près.
    synthFx: {
      bass:   { reverbSend: 0.1,  delaySend: 0.1,  glide: 0.1 },
      pad:    { reverbSend: 0.35, delaySend: 0.3,  strum: 0.2 },
      melody: { reverbSend: 0.25, delaySend: 0.3,  glide: 0.15, rollRate: 0.1 },
    },
    // Pompe douce, discrète — pas l'effet appuyé de la house, juste un peu
    // d'air derrière le kick steppers.
    sidechain: { trigger: 'kick', target: 'pad', depth: 30, release: 200 } },
  { id:'bailefunk', cat:'Latin / Afro / Caribbean', label:'Baile funk (Brésil)', tempo:130, swing:0, drag:0,
    globalSaturation:15, globalCompression:20, globalBitcrush:12,
    demo:'Kick = motif syncopé du tamborzão (deux cellules 3+3+2 sur 16 pas), décalé de -10% pour pousser le rythme en avant',
    history:"Né dans les favelas de Rio de Janeiro dans les années 90, à partir de breaks Miami bass samplés.",
    kick:{subdiv:16, pattern:b([0,3,6,8,11,14],16), shift:-6, volume:100, pitch:-4, attack:0, decay:-10, tone:20},
    snare:{subdiv:8, pattern:b([2,6],8), shift:0, volume:90, pitch:2, attack:0, decay:-10, tone:12},
    hat:{subdiv:16, ...h([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],16), shift:0, volume:55, pitch:3, attack:0, decay:-5, tone:18} ,
    // Clap qui double la snare : la couche "clap" est un élément central du
    // tamborzão, aussi identifiable que le kick syncopé.
    clap:{subdiv:8, pattern:b([2,6],8), shift:0, volume:75, pitch:2, attack:0, decay:-8, tone:15},
    synthVoice: {
      bass:   { type:'square', cutoff:500, attack:0.006, release:0.15, subGain:0.45, tone:15 },
      pad:    { type:'sawtooth', cutoff:700, attack:0.03, release:0.25 },
      melody: { type:'square', cutoff:1700, filterEnvAmount:1800, filterEnvRelease:0.1, attack:0.004, release:0.09 },
    },
    // A mineur : énergique/tendu, cohérent avec le baile funk.
    harmony: { rootOffset: 9, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 16, melodySubdiv: 16 },
    noteSeed: 4020, synthFillRate: 60,
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0,    glide: 0.15 },
      pad:    { reverbSend: 0.2,  delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.15, rollRate: 0.2 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },

  { id:'motorik', cat:'Autre', label:'Motorik / Krautrock (Neu!)', tempo:120, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Autre témoin \u00ab carré \u00bb : régularité mécanique volontaire',
    history:"Battement popularisé par Klaus Dinger (Neu!) en Allemagne au début des années 70, courant krautrock.",
    kick:{subdiv:4, pattern:b([0,1,2,3],4), shift:0, volume:100, pitch:0, attack:0, decay:-5, tone:0},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:85, pitch:0, attack:0, decay:-5, tone:0},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:55, pitch:0, attack:0, decay:0, tone:0} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:550, attack:0.005, release:0.1, subGain:0.4 },
      pad:    { type:'sawtooth', cutoff:700, attack:0.05, release:0.3, detuneCents:5, detuneGain:0.3 },
      melody: { type:'sawtooth', cutoff:1300, attack:0.008, release:0.12 },
    },
    // D majeur : lumineux/hypnotique, cohérent avec le krautrock (Neu!).
    harmony: { rootOffset: 2, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    // Répétitif plutôt que dense : l'hypnose motorik vient de la régularité,
    // pas du remplissage.
    noteSeed: 4021, synthFillRate: 50,
    // Delay marqué sur la Nappe : le tape delay est une signature krautrock.
    synthFx: {
      bass:   { reverbSend: 0,    delaySend: 0 },
      pad:    { reverbSend: 0.3,  delaySend: 0.3 },
      melody: { reverbSend: 0.2,  delaySend: 0.25 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },

  { id:'tresillo', cat:'Latin / Afro / Caribbean', label:'Tresillo (3 notes)', tempo:100, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Kick = cellule 3+3+2 (la ligne de basse) ; snare = backbeat 2 et 4 qui l\u2019accompagne',
    history:"Cellule de base afro-cubaine (3+3+2 croches), présente dans la habanera, le tango, le ragtime et une grande partie des musiques populaires américaines et caribéennes.",
    kick:{subdiv:8, pattern:b([0,3,6],8), shift:0, volume:100, pitch:4, attack:0, decay:-5, tone:0},
    snare:{subdiv:8, pattern:b([2,6],8), shift:0, volume:80, pitch:1, attack:0, decay:-10, tone:8},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:50, pitch:1, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues : les maracas qui accompagnent
    // traditionnellement la cellule tresillo.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:30, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.4 },
      pad:    { type:'triangle', cutoff:800, attack:0.05, release:0.3 },
      melody: { type:'sine', cutoff:1100, attack:0.015, release:0.18, vibratoDepth:0.1 },
    },
    harmony: { rootOffset: 4, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4022, synthFillRate: 50,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.2,  delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'habanera', cat:'Latin / Afro / Caribbean', label:'Habanera', tempo:100, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Kick = tresillo pur (0,3,6, la basse) ; snare ajoute l\u2019accent du temps 3 \u2014 c\u2019est ce \u00ab plus \u00bb par rapport au tresillo nu qui définit l\u2019habanera',
    history:"Rythme cubain du 19e siècle exporté vers l'Europe et les Amériques, popularisé par Bizet (l'air \u00ab Habanera \u00bb de Carmen) et à la base du tango argentin.",
    kick:{subdiv:8, pattern:b([0,3,6],8), shift:0, volume:100, pitch:5, attack:0, decay:-5, tone:0},
    snare:{subdiv:8, pattern:b([4],8), shift:0, volume:75, pitch:2, attack:0, decay:-10, tone:8},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:50, pitch:1, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues : maracas habanera, complément historique
    // du tresillo.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:28, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.008, release:0.18, subGain:0.4 },
      pad:    { type:'triangle', cutoff:800, attack:0.06, release:0.3 },
      melody: { type:'triangle', cutoff:1450, attack:0.012, release:0.15 },
    },
    harmony: { rootOffset: 2, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4023, synthFillRate: 50,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'clave23', cat:'Latin / Afro / Caribbean', label:'Clave son 2-3', tempo:95, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Miroir de la clave 3-2 : cellule clave (2 puis 3) en rim shot sur la snare ; bombo (kick) = accents symétriques',
    history:"Version miroir de la clave son : le côté \u00ab 2 \u00bb ouvre la mesure, le côté \u00ab 3 \u00bb la referme — le sens dépend du morceau, pas d'une règle fixe.",
    kick:{subdiv:8, pattern:b([1,5],8), shift:0, volume:90, pitch:-4, attack:0, decay:5, tone:0},
    snare:{subdiv:16, pattern:[0,0,2,0,2,0,0,0,2,0,0,2,0,0,2,0], shift:0, volume:80, pitch:3, attack:0, decay:-10, tone:12},
    hat:{subdiv:4, ...h([0,1,2,3],4), shift:0, volume:45, pitch:2, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues, symétrique de la clave son 3-2.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:30, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.4 },
      pad:    { type:'triangle', cutoff:800, attack:0.05, release:0.3 },
      melody: { type:'square', cutoff:1700, attack:0.006, release:0.12 },
    },
    harmony: { rootOffset: 7, scaleId: 'minor', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4024, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'claverumba', cat:'Latin / Afro / Caribbean', label:'Clave rumba', tempo:105, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Clave rumba (3e frappe retardée) en rim shot sur la snare ; bombo (kick) = mêmes accents que la clave son',
    history:"Variante afro-cubaine de la clave, utilisée dans la rumba (guaguancó, yambú) ; la 3e frappe du côté 3 est retardée par rapport à la clave son.",
    kick:{subdiv:8, pattern:b([3,7],8), shift:0, volume:90, pitch:-4, attack:0, decay:5, tone:0},
    snare:{subdiv:16, pattern:[2,0,0,2,0,0,0,2,0,0,2,0,2,0,0,0], shift:0, volume:80, pitch:3, attack:0, decay:-8, tone:12},
    hat:{subdiv:4, ...h([0,1,2,3],4), shift:0, volume:45, pitch:1, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues : le chekere qui accompagne la rumba.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:30, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.4 },
      pad:    { type:'triangle', cutoff:800, attack:0.05, release:0.3, chorusMix:0.2 },
      melody: { type:'triangle', cutoff:1900, attack:0.008, release:0.14, detuneCents:6, detuneGain:0.3 },
    },
    harmony: { rootOffset: 9, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4025, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.05 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'cinquillo', cat:'Latin / Afro / Caribbean', label:'Cinquillo cubain', tempo:100, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Les 5 frappes du cinquillo jouées en rim shot (léger et clair, pas une ligne de basse) ; kick pose juste les temps 1 et 3',
    history:"Motif à 5 frappes originaire de Cuba (danzón, comparsa), dérivé du tresillo en subdivisant ses deux notes finales.",
    kick:{subdiv:4, pattern:b([0,2],4), shift:0, volume:95, pitch:3, attack:0, decay:-5, tone:0},
    snare:{subdiv:16, pattern:[2,0,2,2,0,2,2,0,2,0,2,2,0,2,2,0], shift:0, volume:80, pitch:3, attack:0, decay:-10, tone:10},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:45, pitch:1, attack:0, decay:0, tone:5} ,
    // Shaker en croches continues : les maracas qui portent le cinquillo.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:28, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.4 },
      pad:    { type:'triangle', cutoff:800, attack:0.05, release:0.3 },
      melody: { type:'sawtooth', cutoff:1300, attack:0.01, release:0.13, tone:8 },
    },
    harmony: { rootOffset: 0, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4026, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1, rollRate: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'bodiddley', cat:'Latin / Afro / Caribbean', label:'Bo Diddley beat', tempo:140, swing:0, drag:0,
    globalSaturation:10, globalCompression:10, globalBitcrush:0,
    demo:'Kick et snare jouent le tresillo en unisson — \u00ab tout le groupe \u00bb accentue ensemble',
    history:"Popularisé par Bo Diddley dès 1955 (\u00ab Bo Diddley \u00bb), reprise directe du tresillo/clave par tout l'orchestre en une seule frappe rythmique commune.",
    kick:{subdiv:8, pattern:b([0,3,6],8), shift:0, volume:100, pitch:0, attack:0, decay:-5, tone:10},
    snare:{subdiv:8, pattern:b([0,3,6],8), shift:0, volume:75, pitch:0, attack:0, decay:-10, tone:10},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:55, pitch:0, attack:0, decay:0, tone:10} ,
    // Shaker calqué sur le même tresillo que kick/snare : les maracas de
    // Jerome Green jouaient littéralement la même figure, pas un remplissage
    // à part — c'est LA signature de ce beat.
    shaker:{subdiv:8, pattern:b([0,3,6],8), shift:0, volume:55, pitch:0, attack:0, decay:0, tone:10},
    synthVoice: {
      bass:   { type:'square', cutoff:550, attack:0.006, release:0.15, subGain:0.3, tone:18 },
      pad:    { type:'square', cutoff:850, attack:0.02, release:0.3, tone:12 },
      melody: { type:'sawtooth', cutoff:1600, attack:0.008, release:0.15 },
    },
    // E mixolydien : couleur blues/rock'n'roll, cohérente avec le riff Bo Diddley.
    harmony: { rootOffset: 4, scaleId: 'mixolydian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4027, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.2,  delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'shuffle', cat:'Funk / soul / jazz', label:'Shuffle', tempo:120, swing:15, drag:0,
    globalSaturation:5, globalCompression:5, globalBitcrush:0,
    ghostDensity:10,
    demo:'Backbeat kick/snare classique ; hat en triolets (12 pas, \u00ab longue-courte \u00bb par temps)',
    history:"Feel triolet du blues et du rock'n'roll, où chaque temps est subdivisé en \u00ab longue-courte \u00bb plutôt qu'en croches égales.",
    kick:{subdiv:4, pattern:b([0,2],4), shift:0, volume:95, pitch:-2, attack:0, decay:0, tone:8},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:85, pitch:0, attack:0, decay:-5, tone:5},
    hat:{subdiv:12, ...h([0,2,3,5,6,8,9,11],12), shift:0, volume:60, pitch:-1, attack:3, decay:0, tone:0} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.35 },
      pad:    { type:'triangle', cutoff:800, attack:0.06, release:0.3, chorusMix:0.2 },
      melody: { type:'square', cutoff:1600, attack:0.008, release:0.14 },
    },
    harmony: { rootOffset: 7, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4028, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.15, delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  /* ⚠️ SWING 33 ET NON 60 — corrigé le 2026-09-04, sur l'oreille de Yann :
     « le swing à 60, je n'arrive pas à voir à quel style ça se réfère, mais ça
     ressemble pas à grand-chose ».

     Le scheduler retarde le pas impair de `swing %` d'un pas : la paire de
     croches vaut donc (100+s) : (100−s). À 60 ça fait 4:1 — la croche faible
     arrive à 80 % du chemin vers le temps suivant, l'oreille ne l'entend plus
     balancer, elle l'entend collée au temps d'après. Le triolet du jazz, celui
     que la notice de ce preset décrit elle-même, c'est 2:1, donc 33.

     La valeur 60 vient de l'original (l. 6007), et c'est la seule de ce fichier
     qui contredise sa propre notice : elle démontrait le CURSEUR (« poussé
     fort »), pas le genre qui donne son nom au preset. Le catalogue garde
     l'extrême ailleurs — le garage est à 45, soit 2,6:1. */
  { id:'swing', cat:'Funk / soul / jazz', label:'Swing', tempo:130, swing:33, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Backbeat kick/snare simple pour laisser entendre le swing triolet (33%, deux croches pour une)',
    history:"Le retard caractéristique des croches paires, base du jazz swing des années 30-40 et de tout ce qui s'en inspire.",
    kick:{subdiv:4, pattern:b([0,2],4), shift:0, volume:85, pitch:0, attack:8, decay:-10, tone:0},
    snare:{subdiv:4, pattern:b([1,3],4), shift:0, volume:80, pitch:-2, attack:10, decay:-10, tone:-10},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:55, pitch:-3, attack:5, decay:5, tone:0} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:550, attack:0.01, release:0.18, subGain:0.35 },
      pad:    { type:'triangle', cutoff:750, attack:0.1, release:0.4, chorusMix:0.25 },
      melody: { type:'triangle', cutoff:1600, attack:0.015, release:0.18, vibratoDepth:0.15 },
    },
    // Bb majeur : tonalité classique du grand orchestre swing.
    harmony: { rootOffset: 10, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4029, synthFillRate: 60,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.3,  delaySend: 0.1 },
      melody: { reverbSend: 0.2,  delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'charleston', cat:'Funk / soul / jazz', label:'Charleston', tempo:110, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Kick = figure Charleston (temps 1, et du temps 2) ; snare pose un backbeat léger en 2 et 4',
    history:"Figure syncopée popularisée par la danse du même nom dans les années 1920, anticipant le 3e temps d'une croche.",
    kick:{subdiv:8, pattern:b([0,3],8), shift:0, volume:100, pitch:3, attack:0, decay:-10, tone:0},
    snare:{subdiv:8, pattern:b([2,6],8), shift:0, volume:65, pitch:0, attack:5, decay:-15, tone:-5},
    hat:{subdiv:4, ...h([0,1,2,3],4), shift:0, volume:50, pitch:0, attack:3, decay:0, tone:0} ,
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.008, release:0.15, subGain:0.3 },
      pad:    { type:'triangle', cutoff:800, attack:0.08, release:0.35, chorusMix:0.2 },
      melody: { type:'sawtooth', cutoff:1450, attack:0.01, release:0.13, tone:6 },
    },
    harmony: { rootOffset: 5, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4030, synthFillRate: 55,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.3,  delaySend: 0.1 },
      melody: { reverbSend: 0.2,  delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'bossanova', cat:'Latin / Afro / Caribbean', label:'Bossa nova', tempo:120, swing:0, drag:0,
    globalSaturation:0, globalCompression:0, globalBitcrush:0,
    demo:'Kick sur 1 et 3 ; caixa jouée presque entièrement au rim click (0,3,10), avec deux accents pleins (6,12)',
    history:"Née à Rio de Janeiro à la fin des années 50 (João Gilberto), adaptant la clave afro-cubaine à la guitare et une frappe de caisse claire feutrée — le rim click est la technique de caixa la plus caractéristique du style.",
    kick:{subdiv:4, pattern:b([0,2],4), shift:0, volume:90, pitch:1, attack:8, decay:-10, tone:0},
    snare:{subdiv:16, pattern:[2,0,0,2,0,0,1,0,0,0,2,0,1,0,0,0], shift:0, volume:75, pitch:-3, attack:10, decay:-15, tone:-15},
    hat:{subdiv:8, ...h([0,1,2,3,4,5,6,7],8), shift:0, volume:45, pitch:-2, attack:5, decay:0, tone:0} ,
    // Shaker discret, chocalho feutré — texture continue, jamais au premier
    // plan dans la bossa.
    shaker:{subdiv:8, pattern:b([0,1,2,3,4,5,6,7],8), shift:0, volume:20, pitch:0, attack:5, decay:0, tone:-5},
    synthVoice: {
      bass:   { type:'sine', cutoff:580, attack:0.01, release:0.18, subGain:0.3 },
      pad:    { type:'triangle', cutoff:850, attack:0.1, release:0.4, chorusMix:0.3 },
      melody: { type:'sine', cutoff:1250, attack:0.02, release:0.25, vibratoDepth:0.12 },
    },
    // D majeur : chaud/intime, cohérent avec la bossa nova.
    harmony: { rootOffset: 2, scaleId: 'major', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4031, synthFillRate: 55,
    // Réverbe de salle intime sur la Nappe, glide léger sur la basse (jouée
    // à la main, pas quantifiée).
    synthFx: {
      bass:   { reverbSend: 0.1,  delaySend: 0,    glide: 0.1 },
      pad:    { reverbSend: 0.3,  delaySend: 0.1 },
      melody: { reverbSend: 0.2,  delaySend: 0.1 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'samba', cat:'Latin / Afro / Caribbean', label:'Samba', tempo:105, swing:0, drag:0,
    globalSaturation:0, globalCompression:5, globalBitcrush:0,
    spontRoll:10,
    demo:'Kick (surdo) sur 2 et 4 — pas le 1er temps ; snare (caixa) dense et syncopée par-dessus',
    history:"Rythme brésilien du carnaval de Rio, où la grosse caisse (surdo) marque les temps 2 et 4 au lieu du 1er temps habituel.",
    kick:{subdiv:4, pattern:b([1,3],4), shift:0, volume:100, pitch:-3, attack:0, decay:10, tone:0},
    snare:{subdiv:16, pattern:b([1,3,5,6,8,9,11,13,15],16), shift:0, volume:75, pitch:2, attack:0, decay:-5, tone:8},
    hat:{subdiv:16, ...h([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],16), shift:0, volume:55, pitch:1, attack:0, decay:0, tone:5} ,
    // Shaker dense en doubles-croches : le chocalho, moteur percussif de la
    // batucada, aussi présent que la caixa elle-même.
    shaker:{subdiv:16, pattern:b([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],16), shift:0, volume:40, pitch:0, attack:0, decay:0, tone:10},
    synthVoice: {
      bass:   { type:'sine', cutoff:600, attack:0.007, release:0.15, subGain:0.35 },
      pad:    { type:'triangle', cutoff:850, attack:0.06, release:0.3, chorusMix:0.25 },
      melody: { type:'square', cutoff:1700, attack:0.008, release:0.13 },
    },
    // G mixolydien : couleur vive/dominante, cohérente avec la samba.
    harmony: { rootOffset: 7, scaleId: 'mixolydian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 16 },
    noteSeed: 4032, synthFillRate: 65,
    synthFx: {
      bass:   { reverbSend: 0.05, delaySend: 0 },
      pad:    { reverbSend: 0.25, delaySend: 0.1 },
      melody: { reverbSend: 0.2,  delaySend: 0.15, rollRate: 0.15 },
    },
    sidechain: { trigger: 'none', target: 'all', depth: 60, release: 180 }
    },
  { id:'reggaeonedrop', cat:'Latin / Afro / Caribbean', label:'Reggae one drop', tempo:75, swing:0, drag:0,
    globalSaturation:8, globalCompression:10, globalBitcrush:0,
    demo:'Kick ET snare (en rim shot/cross-stick, signature de Sly Dunbar) ensemble sur le temps 3 seulement — le temps 1 est \u00ab omis \u00bb (d\u2019où \u00ab one drop \u00bb)',
    history:"Rythme jamaïcain popularisé par Sly Dunbar dans les années 70 : la grosse caisse \u00ab omet \u00bb le premier temps pour ne tomber qu'au 3e temps, avec la caisse claire jouée en cross-stick.",
    kick:{subdiv:4, pattern:b([2],4), shift:0, volume:100, pitch:-4, attack:3, decay:15, tone:5},
    snare:{subdiv:4, pattern:[0,0,2,0], shift:0, volume:90, pitch:-1, attack:3, decay:5, tone:0},
    hat:{subdiv:8, ...h([1,3,5,7],8), shift:0, volume:55, pitch:0, attack:3, decay:5, tone:0} ,
    // Shaker sur les mêmes contretemps que le hat (le skank reggae).
    shaker:{subdiv:8, pattern:b([1,3,5,7],8), shift:0, volume:28, pitch:0, attack:0, decay:0, tone:5},
    synthVoice: {
      bass:   { type:'triangle', cutoff:450, attack:0.015, release:0.3, subGain:0.6 },
      pad:    { type:'square', cutoff:800, attack:0.02, release:0.6, chorusMix:0.5 },
      melody: { type:'triangle', cutoff:1300, attack:0.02, release:0.3, vibratoDepth:0.15 },
    },
    // A dorien : couleur reggae/roots classique.
    harmony: { rootOffset: 9, scaleId: 'dorian', chordCount: 4 },
    synthGrid: { padCycleBars: 4, padSubdiv: 4, bassSubdiv: 8, melodySubdiv: 8 },
    noteSeed: 4033, synthFillRate: 50,
    // Écho dub marqué sur la Nappe — même signature que dancehall (genre
    // proche), glide sur la basse pour le côté roots joué.
    synthFx: {
      bass:   { reverbSend: 0.1,  delaySend: 0.1,  glide: 0.15 },
      pad:    { reverbSend: 0.35, delaySend: 0.3 },
      melody: { reverbSend: 0.25, delaySend: 0.3,  glide: 0.1 },
    },
    sidechain: { trigger: 'kick', target: 'pad', depth: 25, release: 220 }
    },
];

// ---------- Catégories ----------
// Dans l'original, les optgroups du <select> de presets sont construits par
// buildPresetSelect() en groupant PRESETS par `cat` dans l'ordre d'apparition
// (boite-a-rythme-69.html l. 6128–6142). On exporte la même liste, dérivée
// des données elles-mêmes — pas de liste dupliquée à maintenir à la main.
export const PRESET_CATEGORIES: string[] = PRESETS
  .map((p) => p.cat)
  .filter((cat, i, all) => all.indexOf(cat) === i);
