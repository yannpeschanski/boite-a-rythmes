/* Ce que le joueur a PRODUIT, et que le jeu garde.
 *
 * ⚠️ Jusqu'ici, livrer jetait le morceau. `livrerCommande` évaluait le cahier,
 * avançait le curseur, et l'état partait à la poubelle — y compris pour la
 * sonnerie de l'acte 1, dont le récit dit pourtant qu'elle est « à toi », et
 * pour le jingle de la laverie, dont l'acte 3 raconte deux écrans plus loin
 * que les clients le fredonnent.
 *
 * Retour de Yann (2026-08-27) : *« si on produit la musique de la laverie et
 * que le jeu nous dit ensuite que tout le monde l'adore, ce serait beaucoup
 * plus intéressant si on pouvait réellement la ressortir plus tard […]. Les
 * productions deviendraient de véritables éléments de notre progression, et
 * pas simplement des exercices que l'on abandonne une fois terminés. »*
 *
 * TROIS CHOIX, payés d'avance :
 *
 * 1. **L'état est SÉRIALISÉ, pas gardé en mémoire.** C'est le format v2, le
 *    même contrat que les fichiers de sauvegarde — donc une production
 *    survit au rechargement, et `deserializeState` la relira même si le
 *    format bouge. Garder un `PatternStateV2` vivant l'exposerait en plus aux
 *    mutations de l'Atelier, qui continue de travailler sur le sien.
 *
 * 2. **Une production par SÉRIE, remplacée et jamais empilée.** Relire un acte
 *    et re-livrer est gratuit (voir `reculerCarriere`) : si chaque passage
 *    ajoutait une entrée, la discographie deviendrait un journal de
 *    tentatives, où le morceau qu'on cherche est noyé dans ses brouillons.
 *
 *    ⚠️ La clé était l'ACTE seul jusqu'au 2026-09-01, et ça a tenu tant qu'un
 *    acte ne livrait qu'un morceau — la chaîne d'envois de l'acte 4 comprise,
 *    puisque ses trois versions SONT le même morceau (« les livraisons
 *    intermédiaires doivent être remplacées par les nouvelles », Yann). L'acte
 *    5 livre désormais quatre genres DIFFÉRENTS : sur une clé d'acte, le
 *    joueur en produisait quatre et n'en retrouvait qu'un. La clé est donc
 *    (acte, série), la série étant vide par défaut — une chaîne d'envois garde
 *    la sienne et continue de se remplacer, deux genres ont chacun la leur.
 *
 * 3. **Elle est rangée par le RÉCIT, pas par une date de fichier.** Le titre
 *    et le client viennent de l'étape qui l'a commandée : c'est ce qui fait
 *    d'une liste de morceaux une discographie plutôt qu'un dossier.
 */
export interface Production {
  /** L'acte dont c'est la livraison — première moitié de la clé (choix 2). */
  acte: number;
  /* Ce qu'elle remplace DANS son acte. Vide pour un acte qui ne livre qu'un
   * morceau (ou une chaîne d'envois du même morceau) ; distincte par genre
   * quand un acte en livre plusieurs. Voir le choix 2. */
  serie?: string;
  /** Le titre sous lequel le label la range. Écrit dans la commande. */
  titre: string;
  /** Qui l'a reçue — « KELVIN », « LE TUNNEL »… */
  client: string;
  /** L'état au format v2, sérialisé (choix 1). */
  etat: string;
  /** Le repère temporel de l'acte, tel qu'il s'affiche (« Quatre mois avant »). */
  quand: string;
}

/** La clé d'unicité : l'acte, et la série à l'intérieur de l'acte. */
const cle = (p: Production) => `${p.acte}:${p.serie ?? ''}`;

/**
 * Ranger une production. Remplace celle de la même SÉRIE s'il y en a une, et
 * garde la liste triée par acte — l'ordre du récit est le seul qui ait un sens
 * ici, et il est stable quel que soit l'ordre dans lequel on relit les actes.
 */
export function ranger(liste: Production[], p: Production): Production[] {
  return [...liste.filter((x) => cle(x) !== cle(p)), p].sort((a, b) => a.acte - b.acte);
}

/* La production d'un acte, si elle existe.
 *
 * ⚠️ Rend la DERNIÈRE de l'acte quand il en compte plusieurs : son seul
 * appelant est `departCommande`, pour une chaîne d'envois qui reprend « le
 * morceau qu'on vient de livrer ». Une chaîne partage sa série, donc l'acte
 * n'en garde qu'une — mais un acte qui mêlerait une chaîne et des morceaux
 * séparés doit reprendre le dernier livré, pas le premier rangé. */
export function productionDeLActe(liste: Production[], acte: number): Production | undefined {
  const dans = liste.filter((p) => p.acte === acte);
  return dans[dans.length - 1];
}
