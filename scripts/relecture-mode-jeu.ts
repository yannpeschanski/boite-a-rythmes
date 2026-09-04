/* La FICHE DE RELECTURE du Mode jeu — un fichier HTML autonome, à annoter.
 *
 * Pourquoi ce script existe
 * -------------------------
 * La relecture complète du 2026-09-01 (75 cases annotées, une par exercice et
 * par acte) a produit tout le chantier des cahiers des charges. Elle s'était
 * faite hors du dépôt, donc elle n'était pas re-générable : à chaque fois que
 * le récit bouge, la fiche est périmée et il faut la refaire à la main.
 *
 * Ici la fiche est DÉRIVÉE des données — `ACTES`, `EPILOGUE`, `LEVELS`. Ce que
 * Yann annote est donc exactement ce que le jeu contient au moment où on la
 * régénère, y compris les grilles écrites (dessinées case par case) et les
 * cahiers des charges (ligne à ligne, sections comprises).
 *
 * Ce qu'elle N'EST PAS : une maquette. Aucune règle de `CLAUDE.md` sur le skin
 * ne s'y applique — c'est un outil de travail, pas un écran du jeu. Le texte
 * y est donc lisible avant d'être Winamp, et la chasse fixe reste au chrome.
 *
 *     npx vite-node scripts/relecture-mode-jeu.ts   ->  docs/relecture/mode-jeu.html
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { ACTES, EPILOGUE, dateDeLActe, repereDeNiveau, type Acte, type Etape } from '../src/model/carriere';
import {
  LEVELS,
  colonnesDeLArrangement,
  longueurDeLigne,
  type GameLevel,
  type GrilleArrangement,
  type GrilleEcrite,
} from '../src/model/presets/levels';
import type { ExerciseKind } from '../src/model/exercises';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Les verbes, en français et dans l'ordre où ils se lisent. */
const VERBES: Record<ExerciseKind, string> = {
  reproduire: 'reproduire',
  completer: 'compléter',
  intrus: 'intrus',
  jouer: 'jouer',
  lequel: 'lequel',
  nommer: 'nommer',
  regler: 'régler',
  melodie: 'mélodie',
  arrangement: 'arrangement',
  silence: 'silence',
  laverie: 'laverie',
  style: 'style',
};

const SOURCES: Record<string, string> = {
  repondeur: 'répondeur',
  lcd: 'afficheur',
  fax: 'fax',
  cassette: 'cassette',
};

const LIGNES_FR: Record<string, string> = {
  kick: 'kick', snare: 'claire', hat: 'charley',
  bass: 'basse', melody: 'mélodie', pad: 'nappe',
};

const niveau = (id: number): GameLevel | undefined => LEVELS.find((l) => l.id === id);

/* ---------- les dessins de grille ---------- */

/* ⚠️ Une case n'a pas une largeur, elle a une DURÉE. Dessinées toutes à la
 * même taille, une ligne en croches et une ligne en doubles-croches se lisent
 * comme deux mesures de longueurs différentes — et la polyrythmie du niveau 74
 * (12 contre 16) devient illisible. Toutes les lignes d'une grille couvrent la
 * même durée : leur `.cells` a donc la MÊME largeur (CSS) et ce sont les cases
 * qui se partagent la place. */
function cellules(pas: number[], subdiv: number, rolls?: number[]): string {
  const parTemps = subdiv % 4 === 0 ? subdiv / 4 : 0;
  return pas
    .map((v, i) => {
      const cls = ['c'];
      if (v === 1) cls.push('on');
      if (v >= 2) cls.push('var');
      if (i % subdiv === 0 && i > 0) cls.push('mesure');
      if (parTemps && i % parTemps === 0) cls.push('temps');
      const roll = rolls && rolls[i] ? `<i>${rolls[i]}</i>` : '';
      return `<span class="${cls.join(' ')}">${roll}</span>`;
    })
    .join('');
}

function dessinGrille(g: GrilleEcrite): string {
  const lignes = (['kick', 'snare', 'hat'] as const)
    .map((nom) => {
      const pas = g[nom];
      if (!pas.some((v) => v)) return '';
      const sub = g.subdiv[nom];
      const shift = g.shift?.[nom];
      const dec = shift ? `<span class="feel">décalage ${shift}</span>` : '';
      return `<div class="ligne"><span class="nom">${LIGNES_FR[nom]}</span>
        <span class="cells">${cellules(pas, sub, g.rolls?.[nom])}</span>
        <span class="sub">×${sub}</span>${dec}</div>`;
    })
    .join('');
  const feel: string[] = [];
  if (g.swing) feel.push(`swing ${g.swing} %`);
  if (g.drag) feel.push(`traîne ${g.drag}`);
  return `<div class="grille">${lignes}${
    feel.length ? `<div class="ligne feel-ligne">${esc(feel.join(' · '))}</div>` : ''
  }</div>`;
}

function dessinArrangement(a: GrilleArrangement): string {
  const cols = colonnesDeLArrangement(a);
  const lignes = a.lignes
    .map((l) => {
      const long = longueurDeLigne(a, l);
      const cases = Array.from({ length: cols }, (_, i) => {
        const v = l.pas[i % long] ?? 0;
        const repete = i >= long;
        const cls = ['c'];
        if (repete) cls.push('pale');
        if (i % a.subdiv === 0 && i > 0) cls.push('mesure');
        if (l.nature === 'drum') {
          if (v === 1) cls.push('on');
          if (v >= 2) cls.push('var');
          return `<span class="${cls.join(' ')}"></span>`;
        }
        cls.push('deg');
        if (v > 0) cls.push('on');
        return `<span class="${cls.join(' ')}">${v > 0 ? v : ''}</span>`;
      }).join('');
      const cyc = (l.cycles ?? 1) > 1 ? `<span class="feel">${l.cycles} mesures</span>` : '';
      return `<div class="ligne"><span class="nom">${esc(LIGNES_FR[l.nom] ?? l.nom)}</span>
        <span class="cells">${cases}</span><span class="sub">${l.nature === 'drum' ? 'coups' : 'degrés'}</span>${cyc}</div>`;
    })
    .join('');
  const feel = a.swing ? `<div class="ligne feel-ligne">swing ${a.swing} %</div>` : '';
  return `<div class="grille">${lignes}${feel}<div class="ligne feel-ligne">subdivision ${a.subdiv} · ${cols} colonnes</div></div>`;
}

/* ---------- la carte annotable ---------- */

interface Carte {
  id: string;
  kind: string;
  badge: string;
  ref: string;
  titre: string;
  corps: string;
}

function carte(c: Carte): string {
  return `<article class="fiche" id="${c.id}" data-id="${c.id}" data-kind="${c.kind}">
  <header class="fiche-h">
    <span class="badge b-${c.kind}">${esc(c.badge)}</span>
    <span class="ref">${esc(c.ref)}</span>
    <h3>${esc(c.titre)}</h3>
  </header>
  <div class="fiche-b">${c.corps}</div>
  <footer class="annot">
    <div class="prios" role="group" aria-label="priorité">
      <button type="button" class="p p1" data-p="1">PRIORITAIRE</button>
      <button type="button" class="p p2" data-p="2">À REVOIR</button>
      <button type="button" class="p p3" data-p="3">OK</button>
      <button type="button" class="p px" data-p="0" title="effacer">✕</button>
    </div>
    <textarea rows="1" placeholder="ce que tu en penses…"></textarea>
  </footer>
</article>`;
}

/* ---------- les étapes ---------- */

function corpsRecit(e: Extract<Etape, { kind: 'recit' }>): string {
  return `<ul class="recit">${e.lignes.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`;
}

function corpsExercice(e: Extract<Etape, { kind: 'exercice' }>): string {
  const n = niveau(e.niveau);
  if (!n) return `<p class="alerte">niveau ${e.niveau} introuvable</p>`;
  const brief = e.commande
    ? `<p class="brief">« ${esc(e.commande)} »</p>`
    : `<p class="brief muted">— pas de brief propre à l'acte : c'est le préambule du niveau qui s'affiche —</p>`;
  const grille = n.grille ? dessinGrille(n.grille) : n.arrangement ? dessinArrangement(n.arrangement) : '';
  const source = n.grille
    ? 'grille écrite'
    : n.arrangement
      ? 'arrangement écrit'
      : n.presetId
        ? `preset « ${n.presetId} »`
        : 'grille générée';
  const chips = [
    `verbe : ${VERBES[n.exercise]}`,
    source,
    `tempo ${n.tempoOptions.join(' / ')}`,
    n.melodie.pas ? `${n.melodie.pas} pas de ${LIGNES_FR[n.melodie.ligne] ?? n.melodie.ligne}` : '',
    n.stylePool.length ? `styles : ${n.stylePool.join(', ')}` : '',
    n.paramsAutorises.length ? `boutons : ${n.paramsAutorises.join(', ')}` : '',
    n.sons ? 'son écrit' : '',
  ].filter(Boolean);
  return `${brief}${grille}
    <p class="chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</p>
    <details><summary>le préambule du niveau (salle de répétition)</summary><p>${esc(n.preamble)}</p></details>`;
}

function corpsCommande(e: Extract<Etape, { kind: 'commande' }>): string {
  const chapeau = e.chapeau?.length
    ? `<div class="chapeau"><b>Le genre demandé</b><ul>${e.chapeau.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`
    : '';
  let section = '';
  const lignes = e.cahier
    .map((c) => {
      let tete = '';
      if (c.section && c.section !== section) {
        section = c.section;
        tete = `<li class="section">${esc(section)}</li>`;
      }
      return `${tete}<li class="tache${c.interdit ? ' interdit' : ''}"><span class="case"></span>${esc(c.libelle)}</li>`;
    })
    .join('');
  const depart = e.partirDeLaLivraison
    ? 'part de la production déjà livrée dans cet acte'
    : e.partirDu
      ? `part du rythme du niveau ${e.partirDu}`
      : 'part d’un Atelier vide';
  const chips = [
    `client : ${e.client}`,
    `titre : ${e.titre}`,
    depart,
    e.modulesRequis?.length ? `ouvre : ${e.modulesRequis.join(', ')}` : '',
    e.serie ? `série : ${e.serie}` : '',
    `${e.cahier.length} lignes de cahier`,
  ].filter(Boolean);
  return `<ul class="recit">${e.lignes.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    ${chapeau}
    <div class="cahier"><b>LE CAHIER DES CHARGES</b><ul>${lignes}</ul></div>
    <p class="quand-ok">À l’acceptation : « ${esc(e.accepte)} »</p>
    <p class="chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</p>
    <p class="bouton">bouton : ${esc(e.bouton)}</p>`;
}

function corpsLivraison(e: Extract<Etape, { kind: 'livraison' }>): string {
  return `<ul class="recit">${e.lignes.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="chips"><span>${esc(`titre : ${e.titre}`)}</span><span>${esc(`pour : ${e.client}`)}</span></p>
    <p class="bouton">bouton : ${esc(e.bouton)}</p>`;
}

function corpsScene(e: Extract<Etape, { kind: 'scene' }>): string {
  return `<ul class="recit">${e.lignes.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="chips"><span>${esc(`on y joue la production de l’acte ${e.morceauDeLActe}`)}</span>${
      e.modulesRequis?.length ? `<span>${esc(`ouvre : ${e.modulesRequis.join(', ')}`)}</span>` : ''
    }</p>
    <p class="bouton">bouton : ${esc(e.bouton)}</p>`;
}

function carteEtape(a: Acte, e: Etape, i: number): string {
  const id = `a${a.id}-e${i}`;
  const rang = `acte ${a.id} · étape ${i + 1}`;
  if (e.kind === 'recit')
    return carte({ id, kind: 'recit', badge: `RÉCIT — ${SOURCES[e.source] ?? e.source}`, ref: rang, titre: e.entete, corps: corpsRecit(e) });
  if (e.kind === 'exercice') {
    const n = niveau(e.niveau);
    const rep = repereDeNiveau(e.niveau);
    const nom = rep ? `acte ${rep.acte} · ${rep.rang}` : 'réservoir';
    return carte({
      id,
      kind: 'exercice',
      badge: `EXERCICE — ${n ? VERBES[n.exercise] : '?'}`,
      ref: `${rang} — ${nom} (niveau ${e.niveau})`,
      titre: n ? n.teach : `niveau ${e.niveau}`,
      corps: corpsExercice(e),
    });
  }
  if (e.kind === 'commande')
    return carte({ id, kind: 'commande', badge: 'COMMANDE', ref: `${rang} — ${e.client}`, titre: e.entete, corps: corpsCommande(e) });
  if (e.kind === 'livraison')
    return carte({ id, kind: 'livraison', badge: 'LIVRAISON', ref: rang, titre: e.entete, corps: corpsLivraison(e) });
  return carte({ id, kind: 'scene', badge: 'SCÈNE — Mode Live', ref: rang, titre: e.entete, corps: corpsScene(e) });
}

/* ---------- les écrans qui ne sont pas dans les données ---------- */

const ECRANS: Array<{ id: string; titre: string; texte: string }> = [
  { id: 'ecr-splash', titre: 'L’entrée du Mode jeu — pseudo et splash', texte: 'Un appareil, un message, un bouton. Le splash masque ce qui est verrouillé ; le pseudo alimente le jeton {pseudo} du récit.' },
  { id: 'ecr-calibrage', titre: 'Le calibrage de la latence', texte: 'Un bouton, pas une porte : proposé à l’acte 0, additif (« affiner » corrige ce qu’il RESTE à corriger). Aucune frappe ignorée en silence.' },
  { id: 'ecr-compte', titre: 'Le compte à rebours « LE 14 JUIN »', texte: 'Bandeau permanent une fois le prologue passé ; disparaît aux deux bouts (prologue, épilogue).' },
  { id: 'ecr-carnet', titre: 'Le carnet — la liste des actes et « relire un acte »', texte: 'N’affiche que ce qui est atteint. Porte le verbe RELIRE (récit ET exercices) ; sans titre ni relief, personne ne l’avait vu.' },
  { id: 'ecr-repet', titre: 'La salle de répétition', texte: 'Les niveaux RENCONTRÉS, nommés en actes (« acte 3 · 3 »). Rien de non atteint ne s’affiche.' },
  { id: 'ecr-resultat', titre: 'L’écran de résultat d’un exercice — étoiles et roasts', texte: 'La note d’un exercice, les commentaires sur la FAÇON de jouer (gameData.ts).' },
  { id: 'ecr-finacte', titre: 'La fin d’un acte — compétence décernée, module ouvert', texte: 'L’annonce absorbée par livrer() avant navigation, sinon le module serait cadenassé au retour.' },
  { id: 'ecr-cahier', titre: 'Le cahier des charges vivant, dans l’Atelier', texte: 'Les cases se cochent pendant qu’on travaille. Aucune réplique de refus. Survit à un changement de vue.' },
  { id: 'ecr-reaction', titre: 'La réaction à la livraison', texte: 'Une observation qui cite un fait du MORCEAU (reactions.ts) — ou rien du tout si rien n’est remarquable.' },
  { id: 'ecr-disco', titre: 'La discographie', texte: 'Une production par (acte, série), sérialisée en v2, rangée par le récit.' },
  { id: 'ecr-voix', titre: 'Le récit qui se tape — voix, réglage 🔊, noms des locuteurs', texte: 'Six percussions synthétisées, le nom AU-DESSUS de la réplique, le réglage dès le premier écran.' },
  { id: 'ecr-reprise', titre: 'La reprise — sauvegarde et curseur d’étape', texte: 'Curseur { acte, étape } persisté, jamais reculant. Granularité l’étape, pas l’exercice. Rien ne traverse les appareils.' },
  { id: 'ecr-live', titre: 'Le Mode Live pour la scène de l’acte 7', texte: 'Horizontal seulement (« tourne ton téléphone »). Aucune note, aucune condition de sortie.' },
];

/* ---------- les statistiques ---------- */

function stats(): string {
  const parKind: Record<string, number> = {};
  const parVerbe: Record<string, number> = {};
  let nEtapes = 0;
  for (const a of ACTES) {
    for (const e of a.etapes) {
      nEtapes += 1;
      parKind[e.kind] = (parKind[e.kind] ?? 0) + 1;
      if (e.kind === 'exercice') {
        const n = niveau(e.niveau);
        if (n) parVerbe[VERBES[n.exercise]] = (parVerbe[VERBES[n.exercise]] ?? 0) + 1;
      }
    }
  }
  const nExos = parKind.exercice ?? 0;
  const verbes = Object.entries(parVerbe)
    .sort((x, y) => y[1] - x[1])
    .map(([v, n]) => `<span>${esc(v)} : ${n} (${Math.round((n / nExos) * 100)} %)</span>`)
    .join('');
  const kinds = Object.entries(parKind)
    .sort((x, y) => y[1] - x[1])
    .map(([k, n]) => `<span>${esc(k)} : ${n}</span>`)
    .join('');
  return `<p class="chips">${kinds}<span>épilogue : ${EPILOGUE.length} écrans</span></p>
    <p class="chips">${verbes}</p>`;
}

/* ---------- le document ---------- */

const nav = [
  ...ACTES.map((a) => `<a href="#acte-${a.id}">${a.id}</a>`),
  '<a href="#epilogue">épi.</a>',
  '<a href="#ecrans">écrans</a>',
  '<a href="#reservoir">réservoir</a>',
].join('');

const actes = ACTES.map((a) => {
  const exos = a.etapes.filter((e) => e.kind === 'exercice').length;
  const cmds = a.etapes.filter((e) => e.kind === 'commande').length;
  const enTete = carte({
    id: `a${a.id}`,
    kind: 'acte',
    badge: `ACTE ${a.id}`,
    ref: `${a.quand} — ${dateDeLActe(a.id)} · J−${a.jours}`,
    titre: a.titre,
    corps: `<p class="brief">${esc(a.resume)}</p>
      <p class="chips"><span>compétence : ${esc(a.competenceLabel)}</span>
        <span>module ouvert : ${a.module ? esc(a.module) : 'aucun'}</span>
        <span>${a.etapes.length} étapes</span><span>${exos} exercices</span><span>${cmds} commandes</span></p>`,
  });
  return `<section class="acte" id="acte-${a.id}">
    <h2>ACTE ${a.id} — ${esc(a.titre)}</h2>
    ${enTete}
    ${a.etapes.map((e, i) => carteEtape(a, e, i)).join('\n')}
  </section>`;
}).join('\n');

const epilogue = `<section class="acte" id="epilogue">
  <h2>ÉPILOGUE</h2>
  ${EPILOGUE.map((e, i) =>
    carte({
      id: `epi-${i}`,
      kind: 'recit',
      badge: `ÉPILOGUE — ${SOURCES[e.source] ?? e.source}`,
      ref: `écran ${i + 1} sur ${EPILOGUE.length}`,
      titre: e.entete,
      corps: corpsRecit(e),
    }),
  ).join('\n')}
</section>`;

const ecrans = `<section class="acte" id="ecrans">
  <h2>LES ÉCRANS — ce qui n’est pas une étape du récit</h2>
  <p class="intro">Ceux-là ne vivent pas dans <code>carriere.ts</code> : ils encadrent tout le reste. Écrits à la main, donc à vérifier à l’écran.</p>
  ${ECRANS.map((e) =>
    carte({ id: e.id, kind: 'ecran', badge: 'ÉCRAN', ref: 'hors récit', titre: e.titre, corps: `<p class="brief">${esc(e.texte)}</p>` }),
  ).join('\n')}
</section>`;

const cites = new Set<number>();
for (const a of ACTES) for (const e of a.etapes) if (e.kind === 'exercice') cites.add(e.niveau);
const reservoir = LEVELS.filter((l) => !cites.has(l.id));

const sectionReservoir = `<section class="acte" id="reservoir">
  <h2>LE RÉSERVOIR — ${reservoir.length} niveaux qu’aucun acte ne cite</h2>
  <p class="intro">Jouables en salle de répétition seulement. Un niveau ne se supprime jamais : il cesse d’être cité. À annoter si l’un d’eux mérite de revenir dans la carrière.</p>
  ${reservoir
    .map((l) =>
      carte({
        id: `res-${l.id}`,
        kind: 'reservoir',
        badge: `RÉSERVOIR — ${VERBES[l.exercise]}`,
        ref: `niveau ${l.id}`,
        titre: l.teach,
        corps: `${l.grille ? dessinGrille(l.grille) : l.arrangement ? dessinArrangement(l.arrangement) : ''}
          <details><summary>le préambule</summary><p>${esc(l.preamble)}</p></details>`,
      }),
    )
    .join('\n')}
</section>`;

const total =
  ACTES.length +
  ACTES.reduce((n, a) => n + a.etapes.length, 0) +
  EPILOGUE.length +
  ECRANS.length +
  reservoir.length +
  1;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Face B — relecture du Mode jeu</title>
<style>
:root {
  --face: #34343f; --face-dark: #24242c; --line: #0a0a10; --text: #e6e6f0;
  --muted: #a5a5b8; --white: #7d7d92; --lcd: #2ee23c; --lcd-bg: #050806;
  --amber: #d9931c; --violet: #8a7cc0; --teal: #3f9c96; --rouge: #e0574f;
  --bevel-out: inset -1px -1px 0 var(--line), inset 1px 1px 0 var(--white);
  --bevel-in: inset 1px 1px 0 var(--line), inset -1px -1px 0 var(--white);
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: #1b1b22; color: var(--text); font: 15px/1.5 var(--sans); }
code { font-family: var(--mono); font-size: .9em; color: var(--amber); }

/* la barre du haut */
header.top {
  position: sticky; top: 0; z-index: 10; background: var(--face); box-shadow: var(--bevel-out);
  border-bottom: 1px solid var(--line); padding: 8px 12px;
}
.titre { font-family: var(--mono); font-size: 11px; letter-spacing: .22em; text-transform: uppercase;
  color: #b8b8e8; margin: 0 0 6px; }
.barre { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.barre button, .barre select, nav a {
  font-family: var(--mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  background: linear-gradient(180deg, #5c5c6a, #3a3a46 52%, #2b2b34); color: var(--text);
  border: 0; box-shadow: var(--bevel-out); padding: 6px 10px; cursor: pointer; text-decoration: none;
}
.barre button:active { box-shadow: var(--bevel-in); }
nav { display: flex; gap: 4px; flex-wrap: wrap; margin-left: auto; }
nav a { padding: 5px 8px; }
.compteur { font-family: var(--mono); font-size: 11px; color: var(--lcd); background: var(--lcd-bg);
  box-shadow: var(--bevel-in); padding: 6px 10px; }

main { max-width: 900px; margin: 0 auto; padding: 18px 12px 120px; }
.intro { color: var(--muted); font-size: 14px; }
h2 { font-family: var(--mono); font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
  color: var(--amber); border-bottom: 1px solid #3a3a46; padding-bottom: 6px; margin: 34px 0 14px; }

/* une fiche */
.fiche { background: var(--face-dark); box-shadow: var(--bevel-out); margin: 0 0 12px; padding: 10px 12px 8px; scroll-margin-top: 110px; }
.fiche.p1 { border-left: 4px solid var(--rouge); }
.fiche.p2 { border-left: 4px solid var(--amber); }
.fiche.p3 { border-left: 4px solid var(--teal); }
.fiche-h { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.fiche-h h3 { flex: 1 1 100%; margin: 4px 0 8px; font-size: 16px; font-weight: 600; }
.badge { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
  padding: 3px 6px; background: #2c2840; color: var(--violet); }
.b-exercice { background: #14301a; color: var(--lcd); }
.b-commande { background: #38301c; color: var(--amber); }
.b-livraison, .b-scene { background: #12302e; color: var(--teal); }
.b-acte { background: #2a2a66; color: #b8b8e8; }
.b-reservoir, .b-ecran { background: #2b2b34; color: var(--muted); }
.ref { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.fiche-b > :first-child { margin-top: 0; }
.brief { font-size: 15px; }
.brief.muted, .muted { color: var(--muted); font-style: italic; }
ul.recit { list-style: none; margin: 0 0 10px; padding: 0 0 0 10px; border-left: 2px solid #3a3a46; }
ul.recit li { padding: 1px 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 4px; }
.chips span { font-family: var(--mono); font-size: 11px; color: var(--muted); background: #2b2b34; padding: 3px 7px; }
.bouton { font-family: var(--mono); font-size: 11px; color: var(--violet); margin: 4px 0 0; }
details { margin: 6px 0 0; }
summary { font-family: var(--mono); font-size: 11px; color: var(--muted); cursor: pointer; }
details p { margin: 6px 0 0; color: var(--muted); font-size: 14px; }
.alerte { color: var(--rouge); }

/* le cahier des charges */
.cahier, .chapeau { background: #101016; box-shadow: var(--bevel-in); padding: 8px 10px; margin: 8px 0; }
.cahier b, .chapeau b { font-family: var(--mono); font-size: 10px; letter-spacing: .14em; color: var(--muted); }
.cahier ul, .chapeau ul { list-style: none; margin: 6px 0 0; padding: 0; }
.cahier li.tache { display: flex; gap: 8px; padding: 2px 0; font-size: 14px; }
.cahier li.section { font-family: var(--mono); font-size: 11px; color: var(--amber); margin: 8px 0 4px; letter-spacing: .06em; }
.cahier li.section:first-child { margin-top: 0; }
.case { flex: 0 0 12px; height: 12px; margin-top: 4px; box-shadow: var(--bevel-in); background: #05070a; }
.tache.interdit .case { background: #38301c; }
.chapeau li { font-size: 14px; padding: 1px 0; color: var(--muted); }
.quand-ok { color: var(--lcd); font-size: 14px; margin: 6px 0 0; }

/* les grilles */
.grille { margin: 8px 0; font-family: var(--mono); font-size: 11px; }
.grille .ligne { display: flex; align-items: center; gap: 6px; margin: 2px 0; flex-wrap: wrap; }
.grille .nom { flex: 0 0 62px; color: var(--muted); text-align: right; }
.grille .cells { display: flex; gap: 1px; width: min(256px, calc(100vw - 150px)); }
.grille .c { flex: 1 1 0; min-width: 0; height: 15px; background: #12121a; box-shadow: inset 0 0 0 1px #2b2b34;
  display: flex; align-items: center; justify-content: center; font-size: 9px; color: var(--lcd-bg); }
.grille .c.temps { box-shadow: inset 0 0 0 1px #3f3f4e; }
.grille .c.mesure { margin-left: 5px; }
.grille .c.on { background: var(--lcd); }
.grille .c.var { background: var(--amber); }
.grille .c.deg { color: var(--muted); background: #12121a; }
.grille .c.deg.on { background: var(--violet); color: #101016; }
.grille .c.pale { opacity: .35; }
.grille .c i { font-style: normal; color: #05070a; font-size: 8px; }
.grille .sub, .grille .feel { color: var(--muted); }
.grille .feel { color: var(--amber); }
.grille .feel-ligne { color: var(--amber); padding-left: 68px; }

/* l'annotation */
.annot { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; margin-top: 10px;
  border-top: 1px solid #3a3a46; padding-top: 8px; }
.prios { display: flex; gap: 4px; }
.p { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; padding: 6px 8px; cursor: pointer;
  border: 0; background: #2b2b34; color: var(--muted); box-shadow: var(--bevel-out); }
.p:hover { color: var(--text); }
.fiche.p1 .p1 { background: var(--rouge); color: #150404; box-shadow: var(--bevel-in); }
.fiche.p2 .p2 { background: var(--amber); color: #1a1204; box-shadow: var(--bevel-in); }
.fiche.p3 .p3 { background: var(--teal); color: #04150f; box-shadow: var(--bevel-in); }
.annot textarea { flex: 1 1 260px; min-height: 34px; font: 14px/1.4 var(--sans); color: var(--text);
  background: #101016; border: 0; box-shadow: var(--bevel-in); padding: 7px 8px; resize: vertical; }
.annot textarea:focus { outline: 1px solid var(--violet); }

/* l'export */
dialog { background: var(--face-dark); color: var(--text); border: 0; box-shadow: var(--bevel-out);
  width: min(820px, 94vw); padding: 14px; }
dialog::backdrop { background: rgba(0,0,0,.7); }
dialog textarea { width: 100%; height: 52vh; font: 12px/1.5 var(--mono); background: #101016;
  color: var(--text); border: 0; box-shadow: var(--bevel-in); padding: 10px; }
.hide { display: none !important; }
@media (max-width: 620px) { .grille .nom { flex-basis: 100%; text-align: left; }
  .grille .feel-ligne { padding-left: 0; }
  .grille .cells { width: min(256px, calc(100vw - 56px)); } }
</style>
</head>
<body>
<header class="top">
  <p class="titre">Face B — relecture du Mode jeu · ${new Date().toISOString().slice(0, 10)}</p>
  <div class="barre">
    <button type="button" id="btn-export">Exporter mes notes</button>
    <select id="filtre">
      <option value="tout">tout afficher</option>
      <option value="annote">seulement mes annotations</option>
      <option value="1">seulement PRIORITAIRE</option>
      <option value="2">seulement À REVOIR</option>
      <option value="0">seulement ce qui reste à voir</option>
    </select>
    <span class="compteur" id="compteur">0 / ${total}</span>
    <button type="button" id="btn-reset">Tout effacer</button>
    <nav>${nav}</nav>
  </div>
</header>
<main>
  <p class="intro">Une carte par acte, par étape, par écran et par niveau du réservoir — <b>${total} au total</b>,
  dérivées des données du jeu. Trois boutons et un champ libre par carte ; tout est gardé dans ce navigateur
  (aucun envoi) et <b>« Exporter mes notes »</b> produit un texte à me recoller tel quel.</p>
  ${carte({
    id: 'global',
    kind: 'acte',
    badge: 'D’ABORD',
    ref: 'impression générale',
    titre: 'Ce qui te semble le plus urgent, tous écrans confondus',
    corps: `<p class="brief">À remplir en dernier si tu préfères. ${stats()}</p>`,
  })}
  ${actes}
  ${epilogue}
  ${ecrans}
  ${sectionReservoir}
</main>
<dialog id="dlg">
  <p class="titre">Mes notes — à copier</p>
  <textarea id="sortie" readonly></textarea>
  <div class="barre" style="margin-top:10px">
    <button type="button" id="btn-copier">Copier</button>
    <button type="button" id="btn-fichier">Télécharger</button>
    <button type="button" id="btn-fermer">Fermer</button>
  </div>
</dialog>
<script>
(function () {
  var CLE = 'faceb-relecture-mode-jeu-v1';
  var etat = {};
  try { etat = JSON.parse(localStorage.getItem(CLE) || '{}') || {}; } catch (e) { etat = {}; }
  function garder() { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) {} }

  var fiches = Array.prototype.slice.call(document.querySelectorAll('.fiche'));
  var compteur = document.getElementById('compteur');

  function peindre(f) {
    var e = etat[f.dataset.id] || {};
    f.classList.remove('p1', 'p2', 'p3');
    if (e.p) f.classList.add('p' + e.p);
    var ta = f.querySelector('textarea');
    if (ta.value !== (e.note || '')) ta.value = e.note || '';
    auto(ta);
  }
  function auto(ta) { ta.style.height = 'auto'; ta.style.height = Math.max(34, ta.scrollHeight) + 'px'; }
  function annote(id) { var e = etat[id]; return !!(e && (e.p || (e.note || '').trim())); }
  function compter() {
    var n = 0;
    for (var i = 0; i < fiches.length; i++) if (annote(fiches[i].dataset.id)) n++;
    compteur.textContent = n + ' / ' + fiches.length;
  }

  document.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('.p') : null;
    if (!b) return;
    var f = b.closest('.fiche');
    var id = f.dataset.id;
    var p = b.dataset.p;
    var e = etat[id] || (etat[id] = {});
    if (p === '0') { delete e.p; delete e.note; f.querySelector('textarea').value = ''; }
    else e.p = e.p === p ? undefined : p;
    if (!e.p && !(e.note || '').trim()) delete etat[id];
    garder(); peindre(f); compter(); filtrer();
  });

  document.addEventListener('input', function (ev) {
    var ta = ev.target;
    if (ta.tagName !== 'TEXTAREA' || !ta.closest('.fiche')) return;
    var f = ta.closest('.fiche');
    var id = f.dataset.id;
    var e = etat[id] || (etat[id] = {});
    e.note = ta.value;
    if (!e.p && !e.note.trim()) delete etat[id];
    auto(ta); garder(); compter();
  });

  var filtre = document.getElementById('filtre');
  function filtrer() {
    var v = filtre.value;
    fiches.forEach(function (f) {
      var e = etat[f.dataset.id] || {};
      var ok = v === 'tout' || (v === 'annote' && annote(f.dataset.id))
        || (v === '0' && !annote(f.dataset.id)) || (v === e.p);
      f.classList.toggle('hide', !ok);
    });
    document.querySelectorAll('section.acte').forEach(function (s) {
      var reste = s.querySelectorAll('.fiche:not(.hide)').length;
      s.classList.toggle('hide', reste === 0 && v !== 'tout');
    });
  }
  filtre.addEventListener('change', filtrer);

  var TITRES = { '1': 'PRIORITAIRE', '2': 'À REVOIR', '3': 'OK' };
  function texte() {
    var lignes = ['# Relecture du Mode jeu — ' + new Date().toLocaleDateString('fr-FR'), ''];
    ['1', '2', '3'].forEach(function (p) {
      var dedans = fiches.filter(function (f) { return (etat[f.dataset.id] || {}).p === p; });
      if (!dedans.length) return;
      lignes.push('## ' + TITRES[p] + ' (' + dedans.length + ')', '');
      dedans.forEach(function (f) { lignes.push(entree(f)); });
      lignes.push('');
    });
    var sansP = fiches.filter(function (f) {
      var e = etat[f.dataset.id] || {};
      return !e.p && (e.note || '').trim();
    });
    if (sansP.length) {
      lignes.push('## Notes sans priorité (' + sansP.length + ')', '');
      sansP.forEach(function (f) { lignes.push(entree(f)); });
    }
    if (lignes.length <= 2) lignes.push('(rien d’annoté)');
    return lignes.join('\\n');
  }
  function entree(f) {
    var e = etat[f.dataset.id] || {};
    var ref = (f.querySelector('.ref') || {}).textContent || '';
    var titre = (f.querySelector('h3') || {}).textContent || '';
    var l = '- [' + f.dataset.id + '] ' + ref + ' — ' + titre;
    if ((e.note || '').trim()) l += '\\n      > ' + e.note.trim().replace(/\\n/g, '\\n      > ');
    return l;
  }

  var dlg = document.getElementById('dlg');
  var sortie = document.getElementById('sortie');
  document.getElementById('btn-export').addEventListener('click', function () {
    sortie.value = texte();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    sortie.focus(); sortie.select();
  });
  document.getElementById('btn-fermer').addEventListener('click', function () {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  });
  document.getElementById('btn-copier').addEventListener('click', function () {
    sortie.select();
    if (navigator.clipboard) navigator.clipboard.writeText(sortie.value).catch(function () {});
    else document.execCommand('copy');
  });
  document.getElementById('btn-fichier').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([sortie.value], { type: 'text/markdown' }));
    a.download = 'relecture-mode-jeu.md';
    a.click();
  });
  document.getElementById('btn-reset').addEventListener('click', function () {
    if (!confirm('Effacer toutes les annotations ?')) return;
    etat = {}; garder(); fiches.forEach(peindre); compter(); filtrer();
  });

  fiches.forEach(peindre); compter();
})();
</script>
</body>
</html>
`;

mkdirSync('docs/relecture', { recursive: true });
writeFileSync('docs/relecture/mode-jeu.html', html);
console.log(`docs/relecture/mode-jeu.html — ${total} cartes, ${(html.length / 1024).toFixed(0)} Ko`);
