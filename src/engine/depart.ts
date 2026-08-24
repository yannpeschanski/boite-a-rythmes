/* Un instant de départ qui existe encore.
 *
 * POURQUOI CE FICHIER EXISTE. Toutes les voix ouvrent sur la même paire :
 *
 *     g.gain.setValueAtTime(0.0001, time);
 *     g.gain.exponentialRampToValueAtTime(gain, time + 0.004);
 *
 * Si `time` est déjà PASSÉ quand le fil audio lit ces deux lignes, Web Audio
 * applique les deux événements immédiatement : la rampe est sautée, le gain
 * saute de 0,0001 à sa valeur d'un coup — un clic. C'est la régression de
 * production du 2026-08-21 (« ça marche très bien mais le son est devenu
 * moche »), et c'est la raison pour laquelle `AVANCE_DECLENCHEMENT` avait été
 * remonté à 20 ms : l'avance servait de marge pour que ce cas n'arrive pas.
 *
 * CE QUE ÇA CHANGE. Une marge protège tant qu'elle est plus grande que le
 * retard ; elle ne protège plus dès qu'une tâche du fil principal la dépasse.
 * Caler le départ sur « maintenant » protège dans TOUS les cas : la note part
 * en retard de ce que le retard valait, mais son attaque se déroule
 * entièrement — 4 ms plus tard, jamais sautée. C'est le chantier que
 * `AudioEngine.ts` annonçait comme la vraie sortie (« rendre les enveloppes
 * robustes à un démarrage tardif, pas raccourcir cette constante »), et c'est
 * lui qui autorise l'avance courte des frappes directes (`AVANCE_FRAPPE`).
 *
 * Fonction PURE, qui prend un nombre et pas un contexte : elle se teste sans
 * Web Audio (`tests/depart.test.ts`), et le calcul reste au même endroit pour
 * les dix-sept enveloppes du banc de voix.
 *
 * ⚠️ Hors ligne (export MP3), `currentTime` vaut 0 pendant toute la
 * programmation : tout est déjà dans le futur, la borne ne se déclenche
 * jamais et le rendu reste identique à l'octet près.
 */
export function departSur(currentTime: number, time: number): number {
  return time > currentTime ? time : currentTime;
}
