/* Le VERDICT de latence : jouable, sensible, lourde — et surtout, POURQUOI.
 *
 * Écrit le 2026-09-15, après une journée de mesures sur un seul téléphone. Ce
 * qu'elles ont montré, et qui commande tout ce fichier :
 *
 *   sortie          | baseLatency déclaré | doigt→oreille mesuré
 *   Chrome, HP      | 128 ms              | 115-190 ms
 *   Firefox, HP     | 0 ms                | ~0 ms
 *   Firefox, casque | 0 ms                | ~180 ms
 *
 * Deux enseignements. `baseLatency` dit à peu près vrai quand il parle — c'est
 * le tampon du NAVIGATEUR, et Chrome sur Android n'obtient pas le chemin basse
 * latence d'AAudio quand la taille de rafale de l'appareil ne tombe pas juste
 * avec le quantum de rendu de 128 échantillons (ticket Chromium 40103372) ;
 * aucune valeur de `latencyHint` n'y change quoi que ce soit, mesuré sur sept
 * configurations. Et il se TAIT sur la route : Firefox déclare 0 pour 180 ms de
 * Bluetooth bien réels.
 *
 * ⚠️ D'OÙ LA DISTINCTION QUE CE MODULE EXISTE POUR FAIRE. Un retard n'appelle
 * pas le même conseil selon sa cause :
 *   - tampon du navigateur élevé  → changer de SORTIE ne sert à rien, le
 *     haut-parleur est déjà lent. Le seul remède est un autre navigateur.
 *   - tampon bas, mesure haute    → c'est la route (Bluetooth). Là, et là
 *     seulement, le filaire ou le haut-parleur règlent le problème.
 * Donner le mauvais des deux, c'est envoyer quelqu'un débrancher son casque
 * pour rien — ce que la mesure du jour interdit.
 *
 * ⚠️ ET LE SEUIL N'EST PAS ROND PAR HASARD. Wessel & Wright (2002), déjà cité
 * dans `AudioEngine.ts` : sous 10 ms c'est imperceptible, 10-20 ms se joue sans
 * y penser, au-delà de 30 ms on entend le décalage et on ralentit pour
 * compenser. `SENSIBLE` est donc à 40 et non à 100 : à 100, on aurait laissé
 * passer sans un mot des appareils où jouer au doigt est déjà faux.
 *
 * Module PUR : aucune rune, aucun DOM. `tests/latence-verdict.test.ts` le tient.
 */

export type PalierLatence = 'jouable' | 'sensible' | 'lourde';
export type CauseLatence = 'navigateur' | 'sortie' | 'inconnue';

export interface VerdictLatence {
  palier: PalierLatence;
  cause: CauseLatence;
  /** Le retard retenu, en millisecondes — le pire des deux sources. */
  ms: number;
}

/** Au-delà, le décalage s'entend quand on joue au doigt. */
export const SEUIL_SENSIBLE = 40; // ms
/** Au-delà, jouer au doigt n'a plus de sens sur cet appareil. */
export const SEUIL_LOURD = 100; // ms

/* Le tampon du navigateur à partir duquel il est LUI-MÊME en cause.
 *
 * Sous ce seuil, un retard important vient forcément d'ailleurs (la route) :
 * c'est le cas de Firefox en Bluetooth, 0 ms déclaré pour 180 mesurés. */
const TAMPON_COUPABLE = 30; // ms

/**
 * Le verdict, à partir de ce qu'on sait — l'un des deux peut manquer.
 *
 * @param baseMs   tampon déclaré par le navigateur (`baseLatency`), ou `null`
 *                 s'il ne le dit pas (WebKit, Firefox Android).
 * @param mesureMs retard mesuré à l'oreille par le calibrage, ou `null` tant
 *                 que le joueur ne l'a pas fait.
 */
export function verdictLatence(
  baseMs: number | null,
  mesureMs: number | null,
): VerdictLatence {
  // La mesure à l'oreille prime quand elle existe : c'est la seule qui contient
  // toute la chaîne. Sinon on se rabat sur ce que le navigateur avoue — mieux
  // vaut un verdict partiel que pas de verdict, puisque le tampon déclaré s'est
  // vérifié exact là où il parlait.
  const base = baseMs !== null && Number.isFinite(baseMs) ? Math.max(0, baseMs) : null;
  const mesure = mesureMs !== null && Number.isFinite(mesureMs) ? Math.abs(mesureMs) : null;
  const ms = Math.round(Math.max(base ?? 0, mesure ?? 0));

  const palier: PalierLatence =
    ms >= SEUIL_LOURD ? 'lourde' : ms >= SEUIL_SENSIBLE ? 'sensible' : 'jouable';

  /* La cause ne se prononce que si le retard compte : sur un appareil rapide,
     désigner un coupable serait du bruit. */
  let cause: CauseLatence = 'inconnue';
  if (palier !== 'jouable') {
    if (base !== null && base >= TAMPON_COUPABLE) cause = 'navigateur';
    else if (base !== null) cause = 'sortie';
    // `base === null` : le navigateur ne dit rien de son tampon, on ne peut pas
    // trancher. On le dit plutôt que de deviner — un mauvais conseil coûte plus
    // qu'une absence de conseil.
  }
  return { palier, cause, ms };
}

/* La forme COURTE, pour le Mode Live.
 *
 * ⚠️ Elle existe par contrainte de place, et la contrainte est mesurée : la
 * surface du Live tient en 844 × 390 avec son bandeau à 6→22 et son transport à
 * 26→80. Le message long y fait trois lignes et mord sur le transport ; celui-ci
 * tient sur une, au-dessus du seul bandeau. Même verdict, même cause, moins de
 * mots — jamais un conseil différent. */
export function messageLatenceCourt(v: VerdictLatence): string | null {
  if (v.palier === 'jouable') return null;
  // « sur cet appareil » est tombé à la mesure : il portait la phrase à 63
  // signes, soit deux lignes et le transport recouvert. La forme courte dit le
  // chiffre et le remède, rien d'autre.
  const constat = `Retard de ${v.ms} ms`;
  if (v.cause === 'navigateur') return `${constat} — essaie un autre navigateur.`;
  if (v.cause === 'sortie') return `${constat} — c'est le Bluetooth.`;
  return `${constat} sur cet appareil.`;
}

/** Ce qu'on écrit à l'écran. Une phrase, jamais un chiffre nu. */
export function messageLatence(v: VerdictLatence): string | null {
  if (v.palier === 'jouable') return null;
  const constat = `Cet appareil ajoute ${v.ms} ms entre ton doigt et le son`;
  if (v.cause === 'navigateur') {
    // ⚠️ AUCUN conseil de sortie ici : le retard est dans le tampon du
    // navigateur, donc le haut-parleur est déjà aussi lent que le casque.
    // Mesuré : 190 ms sur le haut-parleur (Yann, 2026-09-15).
    return `${constat}. C’est ce navigateur : essaie-en un autre, le même morceau peut y être instantané.`;
  }
  if (v.cause === 'sortie') {
    return `${constat}. C’est ta sortie audio : le Bluetooth met toujours ce retard — le haut-parleur ou un casque filaire le suppriment.`;
  }
  return `${constat}. Pour jouer au doigt, essaie un autre navigateur ou une autre sortie audio.`;
}
