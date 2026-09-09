/* GÉNÈRE `docs/relecture/parametres-live.html` — la fiche à cocher.
 *
 * ⚠️ POURQUOI ELLE EXISTE. Yann, 2026-09-09 : « Je propose une idée, je te
 * laisse la rendre pertinente. Tu me fais un petit fichier html avec la liste
 * des paramètres de l'atelier. Pour chaque paramètre de l'atelier, tu proposes
 * plusieurs manières de les intégrer au mode live. Je n'ai plus qu'à cocher
 * ceux que je trouve pertinents. »
 *
 * Le tableau ci-dessous est l'INVENTAIRE RÉEL des commandes de l'Atelier, relevé
 * dans le code (`model/types.ts`, `atelier/AtelierView.svelte`,
 * `sequencer/DrumRowView.svelte`, `sequencer/SynthRowView.svelte`,
 * `atelier/SynthModule.svelte`) — pas une liste de mémoire. La colonne
 * « actuel » dit ce que le Mode Live en fait AUJOURD'HUI, relevé dans
 * `ui/live/liveActions.ts` : c'est ce qui rend le delta lisible.
 *
 * Usage : node scripts/relecture-parametres-live.cjs
 */
const fs = require('fs');
const path = require('path');

/* ---- LE VOCABULAIRE DES INTÉGRATIONS ----
   Dix façons d'amener un paramètre sur la surface de scène. Elles ne sont pas
   exclusives : un même paramètre peut mériter deux domiciles (le filtre est un
   curseur ET un maintenu sur toutes les machines). */
const MODES = {
  CURSEUR: 'Un des six boutons devient un curseur : on glisse dessus, la position donne la valeur.',
  PAD: 'Assignable à un axe du pad XY ou à l’inclinaison du téléphone.',
  MAINTENU: 'Appui = la valeur extrême, relâché = retour à ce que dit le morceau.',
  'MAINT+DOSE': 'Le momentané des machines : l’appui engage, la position du doigt dose, le relâché rend le morceau.',
  PAS: 'Un bouton qui avance d’un palier à chaque appui, en bouclant.',
  BASCULE: 'Un interrupteur : allumé / éteint.',
  COUP: 'Un déclencheur ponctuel, pris en compte à la prochaine mesure.',
  'PAR LIGNE': 'Une commande par ligne, comme la rangée de knobs d’une table de mixage.',
  SÉQUENCEUR: 'Dans la petite grille déjà présente à l’écran du Live.',
  ATELIER: 'Reste de la PRÉPARATION : ne descend pas sur scène.',
};

// deja: déjà en place dans le Mode Live · reco: ce que je recommande.
const P = (nom, ou, quoi, actuel, options) => ({ nom, ou, quoi, actuel, options });

const GROUPES = [
  {
    titre: 'Transport et général',
    chapo: 'Ce qui vaut pour tout le morceau, à portée immédiate dans l’Atelier.',
    params: [
      P('Tempo', 'Bandeau', '40 à 200 BPM.', 'DÉJÀ — stepper ±1 BPM dans le bandeau (maintien = défilement)', [
        ['PAS', 'Garder le stepper ±1 : précis, et sans risque de dérailler d’un geste imprécis.', 'deja'],
        ['CURSEUR', 'Un curseur de tempo : rapide, mais un glissement de 2 mm = 10 BPM.'],
        ['COUP', 'Un TAP TEMPO : on tape le tempo au doigt, comme dans l’Atelier.', 'reco'],
        ['PAD', 'Sur un axe du pad — à éviter : le tempo dérive au moindre frôlement.'],
      ]),
      P('Volume général', 'Production', '50 à 150 %.', 'DÉJÀ — mini-fader du bandeau + axe « VOLUME »', [
        ['CURSEUR', 'Aussi sur un bouton, pour l’avoir sous le pouce.', 'deja'],
        ['PAD', 'Sur un axe du pad.', 'deja'],
        ['MAINT+DOSE', 'Un fondu tenu : on baisse le temps d’un break, on lâche, ça revient.'],
      ]),
    ],
  },
  {
    titre: 'Groove de la batterie',
    chapo: 'Onglet Rythme, bloc « Groove ». C’est ce qui fait qu’un motif identique sonne différemment.',
    params: [
      P('Swing', 'Groove', 'Retarde les pas impairs, 0 à 75 %.', 'DÉJÀ — axe « SWING » + bouton PAS (0→25→50→66)', [
        ['CURSEUR', 'Le balayage continu : on entend le groove glisser du droit au chaloupé.', 'reco'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['PAS', 'Les quatre paliers.', 'deja'],
        ['MAINT+DOSE', 'Swinguer deux mesures puis revenir.'],
      ]),
      P('Traîne', 'Groove', 'Retard fixe de TOUS les pas, 0 à 30 %.', 'DÉJÀ — axe « TRAÎNE »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['ATELIER', 'Elle est GLOBALE et uniforme : sans point fixe contre quoi s’entendre, elle est presque inaudible en boucle (c’est déjà pour ça qu’elle est hors du catalogue d’exercices).', 'reco'],
      ]),
      P('Rafales spontanées', 'Groove', 'Probabilité qu’un pas de charley parte en rafale, 0 à 100 %.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Doser le désordre du charley en direct.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['MAINT+DOSE', 'Ouvrir les vannes le temps d’une transition, puis revenir au propre.', 'reco'],
        ['PAS', 'Trois paliers (0 / 20 / 50 %).'],
      ]),
      P('Ghost notes', 'Groove', 'Densité des frappes fantômes, 0 à 40 %.', 'DÉJÀ — axe « GHOST NOTES » + bouton PAS (0→15→30)', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['PAS', 'Les trois paliers.', 'deja'],
        ['MAINT+DOSE', 'Épaissir le groove le temps d’un couplet.'],
      ]),
      P('Ligne des ghost notes', 'Groove', 'Quelle ligne reçoit les fantômes (caisse par défaut).', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton qui fait tourner kick → caisse → charley.'],
        ['ATELIER', 'C’est un choix d’arrangement, pas un geste.', 'reco'],
      ]),
      P('Vélocité aléatoire', 'Groove', 'Dispersion des gains, 0 à 100 % — l’humanisation.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'De la machine parfaite au batteur fatigué, en continu.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['MAINT+DOSE', 'Débrider deux mesures.'],
      ]),
      P('Intensité du fill', 'Groove', 'Dose la montée de fin de mesure, 0 à 100 %.', 'DÉJÀ — axe « INT. FILL » + bouton PAS (0→50→100)', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['PAS', 'Trois paliers.', 'deja'],
      ]),
      P('Fill toutes les N mesures', 'Groove', 'Fill automatique : jamais, 2, 4 ou 8 mesures.', 'ABSENT — seul le fill MANUEL existe en Live', [
        ['PAS', 'Un bouton qui fait tourner jamais → 8 → 4 → 2 : le morceau respire tout seul pendant qu’on fait autre chose.', 'reco'],
        ['BASCULE', 'Fill auto activé / coupé, sans choisir la période.'],
        ['ATELIER', 'Un réglage de morceau, pas un geste.'],
      ]),
    ],
  },
  {
    titre: 'Production — le bus batterie',
    chapo: 'Onglet Production. Trois traitements sur toute la batterie, plus les limiteurs.',
    params: [
      P('Saturation', 'Production', 'Drive sur le bus batterie, 0 à 100 %.', 'DÉJÀ — axe « SATUR. BATT. » + maintenu « SATURE »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['MAINTENU', 'Le maintenu binaire actuel.', 'deja'],
        ['MAINT+DOSE', 'Le même maintenu, mais dosé par la position — c’est ce que fait le ruban de Maschine.', 'reco'],
      ]),
      P('Compression', 'Production', 'Colle le bus batterie, 0 à 100 %.', 'DÉJÀ — axe « COMP. BATT. »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['MAINT+DOSE', 'Écraser le temps d’un passage.'],
      ]),
      P('Bitcrush', 'Production', 'Réduction de résolution, 0 à 100 %.', 'DÉJÀ — axe « CRUSH BATT. » + maintenu « BITCRUSH »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['MAINTENU', 'Le maintenu binaire actuel.', 'deja'],
        ['MAINT+DOSE', 'Dosé par la position.', 'reco'],
      ]),
      P('Limiteurs', 'Production', 'Protection par ligne et sur la sortie.', 'DÉJÀ — bascule « BYPASS LIM. »', [
        ['BASCULE', 'Le bypass actuel.', 'deja'],
        ['ATELIER', 'Un garde-fou, pas un geste de scène : le retirer en public est le meilleur moyen de saturer.'],
      ]),
    ],
  },
  {
    titre: 'Chaque ligne de batterie',
    chapo:
      'Les trois pastilles sous une ligne dans l’Atelier — Séquence, Timbre, Filtre & espace. Cinq lignes (kick, caisse, charley, clap, shaker) partagent les mêmes réglages, d’où « PAR LIGNE » : une commande qui existe une fois par ligne, comme la rangée de knobs d’une table de mixage.',
    params: [
      P('Pas (subdivision)', 'Séquence', 'De 1 à 32 pas pour la ligne — c’est ce qui fait les polyrythmies.', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton qui fait tourner 8 → 12 → 16 sur une ligne : le motif se déforme sans qu’on touche une case.'],
        ['PAR LIGNE', 'Un par ligne.'],
        ['ATELIER', 'Changer la subdivision, c’est réécrire le motif — plus une décision qu’un geste.', 'reco'],
      ]),
      P('Décalage', 'Séquence', 'Avance ou retarde toute la ligne, −50 à +50 % d’un pas.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Faire glisser le charley contre le kick, en direct : un vrai geste de groove.', 'reco'],
        ['PAR LIGNE', 'Un par ligne, sinon il n’a rien contre quoi s’entendre.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['MAINT+DOSE', 'Décaler le temps d’un passage.'],
      ]),
      P('Volume de la ligne', 'Séquence', '0 à 100 % — le vrai mélangeur.', 'ABSENT en continu (seules les COUPURES existent)', [
        ['CURSEUR', 'Cinq curseurs de volume = une table de mixage. C’est le geste de scène le plus universel qui soit.', 'reco'],
        ['PAR LIGNE', 'Un par ligne.', 'reco'],
        ['MAINT+DOSE', 'Baisser une ligne le temps d’un break plutôt que la couper net.'],
      ]),
      P('Coups euclidiens', 'Séquence', 'Répartit N coups sur les pas de la ligne, automatiquement.', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton qui ajoute un coup à chaque appui : le motif se densifie tout seul.'],
        ['PAR LIGNE', 'Un par ligne.'],
        ['ATELIER', 'Il ÉCRASE le motif écrit à la main — dangereux en plein set.', 'reco'],
      ]),
      P('Muet', 'Séquence', 'Coupe la ligne.', 'DÉJÀ — séquenceur du Live, « COUPER BATT. », « SANS KICK » (maintenu)', [
        ['SÉQUENCEUR', 'On coupe une ligne là où on la voit.', 'deja'],
        ['MAINTENU', 'Retirer une ligne quatre temps, puis la rendre.', 'deja'],
        ['PAR LIGNE', 'Un maintenu par ligne, pas seulement pour le kick.'],
      ]),
      P('Pitch', 'Timbre', '±24 demi-tons sur la voix de la ligne.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Monter la caisse claire d’une octave en direct : un classique.', 'reco'],
        ['PAR LIGNE', 'Un par ligne.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['MAINT+DOSE', 'Un « riser » tenu : la caisse monte tant qu’on tient.', 'reco'],
      ]),
      P('Attaque', 'Timbre', '0 à 100 → +0 à 80 ms sur l’attaque.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAR LIGNE', 'Un par ligne.'],
        ['ATELIER', 'Un réglage de son, qu’on trouve une fois pour toutes.', 'reco'],
      ]),
      P('Decay', 'Timbre', '−50 à +50 → durée de la queue.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Raccourcir le kick pour un passage sec, l’allonger pour un drop.', 'reco'],
        ['PAR LIGNE', 'Un par ligne.', 'reco'],
        ['MAINT+DOSE', 'Tenu.'],
      ]),
      P('Tone', 'Timbre', '−100 à +100, drive doux (surtout le kick).', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAR LIGNE', 'Un par ligne.'],
        ['ATELIER', 'Le jeu enseigne lui-même que son effet ne s’entend presque pas en studio (verbe « laverie ») : mauvais candidat pour la scène.', 'reco'],
      ]),
      P('Filtre passe-bas', 'Filtre & espace', '200 Hz à 20 kHz, PAR LIGNE.', 'ABSENT par ligne — le filtre du Live est global', [
        ['PAR LIGNE', 'Un filtre par ligne, c’est la rangée Sound Color FX d’une table Pioneer. Ça permet de filtrer la basse en gardant le kick net — ce que le filtre global ne peut pas faire.', 'reco'],
        ['CURSEUR', 'Sur un bouton.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['MAINT+DOSE', 'Fermer le filtre d’une ligne le temps d’un break.', 'reco'],
      ]),
      P('Envoi réverbe', 'Filtre & espace', '0 à 100 %, PAR LIGNE.', 'ABSENT par ligne — la réverbe du Live est globale', [
        ['PAR LIGNE', 'Noyer la caisse seule, pas tout le morceau.', 'reco'],
        ['CURSEUR', 'Sur un bouton.'],
        ['MAINT+DOSE', 'Le « throw » de réverbe : on noie une frappe, on lâche.', 'reco'],
      ]),
      P('Envoi delay', 'Filtre & espace', '0 à 100 %, PAR LIGNE.', 'ABSENT par ligne', [
        ['PAR LIGNE', 'Un par ligne.', 'reco'],
        ['CURSEUR', 'Sur un bouton.'],
        ['MAINT+DOSE', 'Le « delay throw », le geste de dub par excellence.', 'reco'],
      ]),
    ],
  },
  {
    titre: 'Synthé — les réglages globaux',
    chapo: 'Module Synthé, bloc du haut. Ils valent pour les trois lignes à la fois.',
    params: [
      P('Tonalité', 'Synthé', 'Les 12 notes.', 'DÉJÀ — boutons PAS « TON +1 » et « TON −1 »', [
        ['PAS', 'Les deux boutons ±1 demi-ton.', 'deja'],
        ['CURSEUR', 'Un curseur de transposition, avec cran central.'],
        ['MAINT+DOSE', 'Transposer tant qu’on tient, revenir au relâché : une modulation qu’on ne peut pas oublier de défaire.', 'reco'],
      ]),
      P('Gamme', 'Synthé', 'Cinq modes.', 'DÉJÀ — boutons PAS « GAMME → » et « GAMME ← »', [
        ['PAS', 'Les deux boutons.', 'deja'],
        ['MAINTENU', 'Basculer en mineur le temps d’un pont.'],
      ]),
      P('Nombre d’accords', 'Synthé', '4 à 7 triades diatoniques.', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton 4 → 5 → 6 → 7.'],
        ['ATELIER', 'Change la grille harmonique du morceau : c’est de l’écriture.', 'reco'],
      ]),
      P('Taux de remplissage', 'Synthé', 'Densité du remplissage automatique des lignes de synthé.', 'ABSENT du Mode Live', [
        ['COUP', 'Un bouton « regénère les lignes de synthé » : hasard maîtrisé, à la mesure.'],
        ['ATELIER', 'Il RÉÉCRIT les notes — irréversible en plein morceau, et l’annulation n’existe pas dans le Live.', 'reco'],
      ]),
      P('Swing synthé', 'Synthé', '0 à 75 %, indépendant de celui de la batterie.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Décaler le synthé contre une batterie droite : c’est exactement ce qui fait le feel.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['PAS', 'Quatre paliers, comme le swing batterie.'],
      ]),
      P('Traîne synthé', 'Synthé', '0 à 30 %.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Sur un bouton.'],
        ['ATELIER', 'Même raison que la traîne batterie : globale, donc sans repère.', 'reco'],
      ]),
      P('Taille de la réverbe', 'Synthé', '0 à 100 % → impulsion de 0,5 à 3,5 s.', 'ABSENT du Mode Live', [
        ['PAS', 'Trois tailles (petite / salle / cathédrale) : un pas, pas un balayage.', 'reco'],
        ['CURSEUR', '⚠️ Chaque changement RECONSTRUIT l’impulsion — la seule opération coûteuse du moteur. En continu, elle craquerait.'],
        ['ATELIER', 'Laisser la taille en préparation, ne piloter que le DOSAGE en scène.'],
      ]),
      P('Feedback du delay', 'Synthé', '0 à 90 %.', 'DÉJÀ — axe « DELAY FB »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['MAINT+DOSE', 'Pousser le feedback jusqu’à l’auto-oscillation puis lâcher : le geste de dub.', 'reco'],
      ]),
      P('Division du delay', 'Synthé', 'Croche, croche pointée, noire, double.', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton qui fait tourner les quatre divisions : ça change complètement le rebond.', 'reco'],
        ['ATELIER', 'Un réglage de son.'],
      ]),
    ],
  },
  {
    titre: 'Le sidechain',
    chapo: 'Module Synthé, bloc « Sidechain ». Qui déclenche, qui est ducké, de combien.',
    params: [
      P('Déclencheurs (kick, caisse)', 'Sidechain', 'Quelles frappes font respirer le synthé.', 'ABSENT du Mode Live', [
        ['BASCULE', 'Deux interrupteurs.'],
        ['ATELIER', 'Un câblage, pas un geste.', 'reco'],
      ]),
      P('Cibles (basse, nappe, mélodie)', 'Sidechain', 'Quelles lignes sont duckées.', 'ABSENT du Mode Live', [
        ['BASCULE', 'Trois interrupteurs — mettre la nappe dans la pompe le temps d’un refrain a du sens.'],
        ['ATELIER', 'Un câblage.', 'reco'],
      ]),
      P('Profondeur du sidechain', 'Sidechain', '0 à 100 % — l’ampleur de la pompe.', 'DÉJÀ — axe « SIDECHAIN » + bouton PAS (0→50→100)', [
        ['CURSEUR', 'Sur un bouton.', 'reco'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['PAS', 'Trois paliers.', 'deja'],
        ['MAINT+DOSE', 'Pomper à fond le temps d’un drop.'],
      ]),
      P('Retour du sidechain', 'Sidechain', '20 à 600 ms — la vitesse de remontée.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'C’est lui qui fait la différence entre « ça respire » et « ça pompe » — plus expressif que la profondeur.', 'reco'],
        ['PAD', 'Sur un axe.'],
      ]),
    ],
  },
  {
    titre: 'Chaque ligne de synthé',
    chapo:
      'Basse, nappe, mélodie. Le catalogue du Live en contient déjà quatorze par ligne — 43 axes sur 55 — et c’est précisément ce qui rend le tirage 🎲 illisible : quatre chances sur cinq de tomber sur un réglage de voix. La question posée ici n’est donc pas « faut-il les ajouter » mais « lesquels méritent de RESTER ».',
    params: [
      P('Cycles (mesures)', 'Séquence synthé', '1 à 16 mesures pour la ligne.', 'ABSENT du Mode Live', [
        ['PAS', 'Doubler ou diviser la longueur d’une ligne en direct.'],
        ['ATELIER', 'Réécrit la structure de la ligne.', 'reco'],
      ]),
      P('Notes du cycle', 'Séquence synthé', '1 à 128 notes réparties sur le cycle.', 'ABSENT du Mode Live', [
        ['PAS', 'Densifier la ligne d’un cran.'],
        ['ATELIER', 'Redimensionne le motif.', 'reco'],
      ]),
      P('Décalage', 'Séquence synthé', '−50 à +50 % d’un pas.', 'ABSENT du Mode Live', [
        ['CURSEUR', 'Faire traîner la basse derrière le kick.', 'reco'],
        ['PAR LIGNE', 'Un par ligne.'],
      ]),
      P('Volume de la ligne', 'Séquence synthé', '0 à 150 %.', 'ABSENT en continu', [
        ['CURSEUR', 'La suite de la table de mixage : huit lignes, huit volumes.', 'reco'],
        ['PAR LIGNE', 'Un par ligne.', 'reco'],
        ['MAINT+DOSE', 'Retirer la nappe deux mesures.'],
      ]),
      P('Glide', 'Séquence synthé', 'Portamento entre deux notes, 0 à 100 %.', 'DÉJÀ — axe « GLIDE » par ligne', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['MAINT+DOSE', 'Rendre la basse liquide le temps d’un passage.', 'reco'],
      ]),
      P('Étalement (nappe)', 'Séquence synthé', 'Arpège les notes de l’accord, 0 à 100 %.', 'DÉJÀ — axe « ÉTALEMENT »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
      ]),
      P('Voix (preset de la ligne)', 'Timbre synthé', 'Choisir une voix dans le catalogue.', 'RETIRÉ le 2026-09-02 — « de la préparation, pas un geste de scène »', [
        ['ATELIER', 'Maintenir l’arbitrage : on ne feuillette pas des presets en plein morceau.', 'reco'],
        ['PAS', 'Le faire revenir, avec deux ou trois voix seulement au lieu de tout le catalogue.'],
      ]),
      P('Forme d’onde', 'Timbre synthé', 'Sinus, triangle, dent de scie, carré.', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton qui fait tourner les quatre : c’est le changement de couleur le plus franc du synthé, et il est instantané.', 'reco'],
        ['ATELIER', 'Un réglage de son.'],
      ]),
      P('Brillance', 'Timbre synthé', 'MACRO déjà nommée dans l’Atelier : elle pilote le cutoff en échelle log.', 'DÉJÀ, mais en pièces détachées — axe « CUTOFF » par ligne', [
        ['CURSEUR', 'Porter la MACRO telle quelle, sous son nom, plutôt que le paramètre brut : c’est exactement la macro nommée de Circuit et d’Ableton, et l’Atelier l’a déjà écrite.', 'reco'],
        ['PAD', 'Sur un axe.'],
        ['MAINT+DOSE', 'Fermer une ligne le temps d’un break.', 'reco'],
      ]),
      P('Mouvement', 'Timbre synthé', 'MACRO déjà nommée : ampleur ET temps de fermeture de l’enveloppe de filtre, ensemble.', 'DÉJÀ, mais en pièces détachées — axes « ENV. FILTRE » et « FERM. FILTRE »', [
        ['CURSEUR', 'Porter la macro sous son nom, et retirer les deux axes bruts qu’elle remplace.', 'reco'],
        ['PAD', 'Sur un axe.'],
      ]),
      P('Attaque / Release', 'Timbre synthé', '0 à 200 ms et 0 à 4 s.', 'DÉJÀ — axes « ATTACK » et « RELEASE » par ligne', [
        ['CURSEUR', 'Sur un bouton.'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['ATELIER', 'Deux réglages qu’on trouve une fois, et qu’on ne rejoue pas.'],
      ]),
      P('Courbes d’attaque et de release', 'Timbre synthé', 'Linéaire ou exponentielle.', 'ABSENT du Mode Live', [
        ['BASCULE', 'Deux interrupteurs.'],
        ['ATELIER', 'Trop fin pour la scène.', 'reco'],
      ]),
      P('Sub', 'Timbre synthé', 'Octave grave ajoutée, 0 à 100 %.', 'DÉJÀ — axe « SUB » par ligne', [
        ['CURSEUR', 'Ajouter du grave sur un drop : franc et immédiat.', 'reco'],
        ['PAD', 'Sur un axe.', 'deja'],
        ['MAINT+DOSE', 'Tenu.'],
      ]),
      P('Saturation de la voix', 'Timbre synthé', '0 à 100 % sur la ligne (champ `tone`).', 'DÉJÀ — axe « TONE » par ligne', [
        ['CURSEUR', 'Sur un bouton.'],
        ['MAINT+DOSE', 'Salir une ligne deux mesures.', 'reco'],
      ]),
      P('Détune et mix de détune', 'Timbre synthé', 'Désaccord de la seconde voix, 0 à 30 cents, et son dosage.', 'DÉJÀ — axes « DÉTUNE » et « MIX DÉT. »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['ATELIER', 'Un réglage de son ; deux axes pour une seule idée.', 'reco'],
      ]),
      P('Chorus', 'Timbre synthé', '0 à 100 %.', 'DÉJÀ — axe « CHORUS » par ligne', [
        ['CURSEUR', 'Sur un bouton.'],
        ['MAINT+DOSE', 'Élargir le temps d’un refrain.'],
        ['ATELIER', 'Un réglage de son.'],
      ]),
      P('Vibrato (profondeur et vitesse)', 'Timbre synthé', 'Deux curseurs.', 'DÉJÀ — axes « VIBRATO » et « VIB. RATE »', [
        ['CURSEUR', 'Sur un bouton.'],
        ['ATELIER', 'Deux axes pour un détail — candidats au retrait.', 'reco'],
      ]),
      P('Envois réverbe et delay', 'Filtre & espace synthé', '0 à 100 % chacun, PAR LIGNE.', 'ABSENT par ligne', [
        ['PAR LIGNE', 'Noyer la mélodie seule.', 'reco'],
        ['MAINT+DOSE', 'Le throw de réverbe ou de delay sur une ligne choisie.', 'reco'],
        ['CURSEUR', 'Sur un bouton.'],
      ]),
      P('Muet (ligne de synthé)', 'Séquence synthé', 'Coupe la ligne.', 'DÉJÀ — « COUPER SYNTHÉ », « BATT. SEULE », « SOLO MÉLO »', [
        ['SÉQUENCEUR', 'Le séquenceur du Live ne montre que trois lignes de batterie : y ajouter les lignes de synthé les rendrait coupables là où on les voit.', 'reco'],
        ['MAINTENU', 'Un maintenu par ligne.', 'deja'],
      ]),
    ],
  },
  {
    titre: 'La nappe — ses trois modes',
    chapo: 'Module Synthé, ligne Nappe. Normal, arpège, bourdon — exclusifs dans le moteur.',
    params: [
      P('Mode de la nappe', 'Nappe', 'Normal → arpège → bourdon.', 'DÉJÀ — bouton PAS « MODE NAPPE »', [
        ['PAS', 'Les trois états sur un bouton.', 'deja'],
        ['MAINTENU', 'Passer en bourdon tant qu’on tient : une pédale de tension.', 'reco'],
      ]),
      P('Motif de l’arpège', 'Nappe', 'Montant, descendant, aller-retour, aléatoire.', 'ABSENT du Mode Live', [
        ['PAS', 'Un bouton qui fait tourner les quatre.', 'reco'],
        ['ATELIER', 'Un réglage de son.'],
      ]),
      P('Débit de l’arpège', 'Nappe', '2, 4 ou 8 notes par pas.', 'ABSENT du Mode Live', [
        ['PAS', 'Trois débits : c’est un geste de montée évident.', 'reco'],
        ['ATELIER', 'Un réglage de son.'],
      ]),
    ],
  },
  {
    titre: 'La séquence elle-même',
    chapo: 'Les cases, pas les curseurs. C’est là que le Mode Live est déjà le plus complet — et là que la mesure a trouvé le plus de défauts.',
    params: [
      P('Allumer / éteindre un pas', 'Grille', 'Le geste de base de l’Atelier.', 'DÉJÀ — séquenceur 3 lignes du Live', [
        ['SÉQUENCEUR', 'Les trois lignes actuelles.', 'deja'],
        ['PAR LIGNE', 'Étendre aux cinq lignes de batterie, pas seulement trois.'],
      ]),
      P('Variantes d’un pas', 'Grille', 'Rim shot sur la caisse, charley ouvert.', 'ABSENT du Mode Live', [
        ['SÉQUENCEUR', 'Un appui long sur une case du séquenceur du Live.'],
        ['MAINTENU', 'Un bouton « OUVERT » tenu : tous les charleys s’ouvrent tant qu’on tient — ça, c’est un vrai geste de scène.', 'reco'],
      ]),
      P('Rafale d’un pas (×1 à ×4)', 'Grille', 'Écrite case par case dans l’Atelier.', 'DÉJÀ, mais en maintien global sur une ligne entière', [
        ['MAINTENU', 'Le maintien actuel — ⚠️ il remplit TOUTE la ligne, il escalade tout seul ×2→×3→×4, il ignore le plancher anti-bouillie du moteur et il empile deux frappes au même instant dès qu’il y a du swing.', 'deja'],
        ['PAS', 'Choisir la DIVISION (1/8, 1/16, 1/32, triolets) au lieu d’un multiplicateur qui monte tout seul — c’est le Note Repeat des MPC, et il ne peut pas déborder.', 'reco'],
        ['SÉQUENCEUR', 'Poser la rafale sur une case précise, comme dans l’Atelier.'],
      ]),
      P('Frapper une ligne à la main', 'Pad de saisie', 'Jouer un coup au doigt.', 'DÉJÀ — cinq boutons de ligne', [
        ['SÉQUENCEUR', 'Les cinq boutons actuels — ⚠️ la frappe n’est aimantée par aucune grille (±81 à ±334 ms selon le motif) et ne déclenche pas le sidechain.', 'deja'],
        ['PAS', 'Un aimant vers le pas le plus proche, réglable (aucun / au pas / au temps) — c’est le Timing Correct des MPC.', 'reco'],
      ]),
      P('Écrire une note de synthé', 'Pad de saisie', 'Le clavier de degrés de l’Atelier.', 'PARTIEL — « SOLO MÉLO » joue la mélodie au pad, en maintenu', [
        ['SÉQUENCEUR', 'Un vrai clavier de degrés sur la surface du Live.'],
        ['MAINTENU', 'Le solo actuel.', 'deja'],
      ]),
    ],
  },
  {
    titre: 'Le morceau et les outils',
    chapo: 'Ce qui n’est pas un paramètre mais qu’on trouve dans l’Atelier, et qui pose la même question.',
    params: [
      P('Charger un preset (34 morceaux)', 'Menu Morceaux', 'Remplace tout l’état.', 'ABSENT du Mode Live', [
        ['COUP', 'Un bouton qui charge un morceau au prochain début de mesure.'],
        ['ATELIER', 'Les LETTRES A/B/C font déjà ce travail, et mieux : elles portent le morceau qu’on a préparé.', 'reco'],
      ]),
      P('Banque de séquences', 'Menu Morceaux', 'Les motifs rangés.', 'DÉJÀ — la banque et les lettres A/B/C', [
        ['SÉQUENCEUR', 'La bande de scènes actuelle.', 'deja'],
      ]),
      P('Annuler / Rétablir', 'Barre d’outils', 'L’historique.', 'ABSENT du Mode Live', [
        ['COUP', 'Un bouton ANNULER sur la surface : ce serait le filet de tout ce qui précède.'],
        ['ATELIER', '⚠️ Mais rien de ce que fait le Live n’entre dans l’historique : ce bouton annulerait la dernière action de l’ATELIER, pas le geste qu’on vient de faire. À ne pas poser tel quel.', 'reco'],
      ]),
    ],
  },
];

/* ---------- Rendu ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

let nb = 0;
const sections = GROUPES.map((g, gi) => {
  const cartes = g.params
    .map((p, pi) => {
      const ref = `g${gi + 1}.${pi + 1}`;
      const absent = /^ABSENT/.test(p.actuel);
      const opts = p.options
        .map(([code, texte, flag], oi) => {
          nb++;
          const id = `${ref}.${oi + 1}`;
          const cls = ['opt', flag === 'deja' ? 'deja' : '', flag === 'reco' ? 'reco' : ''].filter(Boolean).join(' ');
          return `<label class="${cls}" data-id="${id}"><input type="checkbox" data-id="${id}">
<span class="code" title="${esc(MODES[code] || '')}">${esc(code)}</span>${flag === 'reco' ? '<span class="etoile" title="ce que je recommande">★</span>' : ''}${flag === 'deja' ? '<span class="badge">déjà</span>' : ''}
<span class="txt">${esc(texte)}</span></label>`;
        })
        .join('\n');
      return `<article class="fiche${absent ? ' absent' : ''}" data-ref="${ref}">
<header><span class="ref">${ref}</span><h3>${esc(p.nom)}</h3><span class="ou">${esc(p.ou)}</span></header>
<p class="quoi">${esc(p.quoi)}</p>
<p class="actuel ${absent ? 'ko' : 'ok'}">${esc(p.actuel)}</p>
<div class="opts">${opts}</div>
<textarea data-note="${ref}" rows="1" placeholder="note libre…"></textarea>
</article>`;
    })
    .join('\n');
  return `<section class="grp"><h2>${esc(g.titre)}</h2><p class="chapo">${esc(g.chapo)}</p>${cartes}</section>`;
}).join('\n');

const legende = Object.entries(MODES)
  .map(([k, v]) => `<li><span class="code">${esc(k)}</span> ${esc(v)}</li>`)
  .join('');

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Les paramètres de l'Atelier au Mode Live — à cocher</title>
<style>
:root{--sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--mono:ui-monospace,"SFMono-Regular",Menlo,monospace;
--bg:#0e0e13;--carte:#17171f;--carte2:#1e1e28;--bord:#2c2c3a;--text:#e6e6ef;--doux:#9a9ab0;
--violet:#7c6cf0;--vert:#39c26a;--ambre:#e8a33d;--rouge:#e2585f;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 var(--sans)}
header.top{position:sticky;top:0;z-index:5;background:#12121a;border-bottom:1px solid var(--bord);
padding:10px 18px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
header.top h1{font-size:15px;margin:0;font-weight:650;flex:1 1 240px}
header.top button{font:13px var(--sans);background:var(--carte2);color:var(--text);
border:1px solid var(--bord);border-radius:6px;padding:6px 10px;cursor:pointer}
header.top button.on{background:var(--violet);border-color:var(--violet);color:#fff}
#compteur{font:12px var(--mono);color:var(--doux)}
main{max-width:920px;margin:0 auto;padding:20px 18px 90px}
.intro{background:var(--carte);border:1px solid var(--bord);border-left:3px solid var(--violet);
border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:14px}
.intro p{margin:0 0 8px}.intro p:last-child{margin:0}
details.leg{background:var(--carte);border:1px solid var(--bord);border-radius:10px;padding:10px 16px;margin:0 0 26px;font-size:13.5px}
details.leg summary{cursor:pointer;color:var(--doux);font-weight:600}
details.leg ul{margin:10px 0 2px;padding-left:0;list-style:none}
details.leg li{margin:0 0 7px}
section.grp{margin:0 0 30px}
section.grp>h2{font-size:13px;letter-spacing:.09em;text-transform:uppercase;color:var(--doux);
margin:0 0 6px;border-bottom:1px solid var(--bord);padding-bottom:6px}
section.grp>.chapo{color:var(--doux);font-size:13.5px;margin:0 0 14px}
.fiche{background:var(--carte);border:1px solid var(--bord);border-radius:10px;margin:0 0 12px;padding:11px 14px 12px}
.fiche.hide{display:none}
.fiche.coche{border-color:var(--vert)}
.fiche>header{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap}
.fiche .ref{font:11px var(--mono);color:var(--doux);flex:none}
.fiche h3{margin:0;font-size:15px;font-weight:650}
.fiche .ou{font-size:11.5px;color:var(--doux);border:1px solid var(--bord);border-radius:20px;padding:1px 8px}
.quoi{margin:5px 0 4px;font-size:13.5px;color:var(--text)}
.actuel{margin:0 0 9px;font:12px var(--mono)}
.actuel.ok{color:var(--vert)}.actuel.ko{color:var(--ambre)}
.opts{display:flex;flex-direction:column;gap:5px}
label.opt{display:flex;gap:8px;align-items:flex-start;background:#101018;border:1px solid var(--bord);
border-radius:7px;padding:7px 9px;cursor:pointer;font-size:13.5px;min-height:44px}
label.opt:hover{border-color:#3d3d50}
label.opt.checked{background:#12241a;border-color:var(--vert)}
label.opt input{margin:3px 0 0;width:17px;height:17px;flex:none;accent-color:var(--vert)}
.code{font:11px var(--mono);letter-spacing:.05em;background:var(--carte2);border:1px solid var(--bord);
border-radius:4px;padding:2px 6px;flex:none;color:#c9c9dd;white-space:nowrap;cursor:help}
.etoile{color:var(--vert);flex:none;font-size:13px}
.badge{font:10px var(--mono);background:#2a2a38;color:var(--doux);border-radius:4px;padding:2px 5px;flex:none}
.txt{flex:1 1 auto;min-width:0}
.fiche textarea{width:100%;margin-top:7px;font:13.5px/1.4 var(--sans);color:var(--text);
background:#101018;border:1px solid var(--bord);border-radius:6px;padding:6px 8px;resize:vertical}
.fiche textarea:focus{outline:1px solid var(--violet)}
dialog{background:var(--carte);color:var(--text);border:1px solid var(--bord);border-radius:10px;
max-width:820px;width:92vw;padding:16px}
dialog::backdrop{background:rgba(0,0,0,.7)}
dialog textarea{width:100%;height:56vh;font:12px/1.5 var(--mono);background:#101018;color:var(--text);
border:1px solid var(--bord);border-radius:6px;padding:9px}
dialog .actions{display:flex;gap:8px;margin-top:10px}
dialog button{font:13px var(--sans);background:var(--carte2);color:var(--text);border:1px solid var(--bord);
border-radius:6px;padding:7px 12px;cursor:pointer}
</style></head><body>
<header class="top">
<h1>Les paramètres de l'Atelier — comment les amener au Mode Live</h1>
<span id="compteur"></span>
<button id="f-absents">Seulement ce qui manque</button>
<button id="f-coches">Seulement mes coches</button>
<button id="export">Exporter mes coches</button>
</header>
<main>
<div class="intro">
<p><b>Comment ça marche.</b> Un bloc par paramètre de l'Atelier — les ${GROUPES.reduce((n, g) => n + g.params.length, 0)} qu'il contient vraiment, relevés dans le code. Sous chacun, plusieurs façons de l'amener sur la surface de scène. <b>Coche celles qui te parlent, autant que tu veux ; ne rien cocher veut dire « ça reste dans l'Atelier ».</b> Puis « Exporter mes coches » et recolle le résultat.</p>
<p>Le <span class="etoile">★</span> est ce que je recommande, la pastille « déjà » est ce que le Mode Live fait aujourd'hui — coche-la quand même si tu veux la garder, décoche-la (laisse-la vide) si tu veux qu'elle disparaisse. La ligne verte ou ambre sous le nom dit l'état actuel.</p>
<p>Tes coches restent dans ce navigateur, rien ne part sur le réseau. Exporter avant de vider tes données.</p>
</div>
<details class="leg"><summary>Les dix façons d'intégrer un paramètre — la légende</summary><ul>${legende}</ul></details>
${sections}
</main>
<dialog id="dlg"><p style="margin:0 0 8px;font-weight:650">Mes coches</p>
<textarea id="out" readonly></textarea>
<div class="actions"><button id="copier">Copier</button><button id="fermer">Fermer</button></div></dialog>
<script>
const CLE = 'params-live-v1';
const etat = JSON.parse(localStorage.getItem(CLE) || '{}');
const cases = [...document.querySelectorAll('input[type=checkbox]')];
const notes = [...document.querySelectorAll('textarea[data-note]')];
function sauver(){ localStorage.setItem(CLE, JSON.stringify(etat)); }
function peindre(){
  let n = 0;
  for (const c of cases){
    const on = !!etat[c.dataset.id];
    c.checked = on; c.closest('label').classList.toggle('checked', on); if (on) n++;
  }
  for (const f of document.querySelectorAll('.fiche'))
    f.classList.toggle('coche', !!f.querySelector('input:checked'));
  document.getElementById('compteur').textContent = n + ' / ' + cases.length + ' cochées';
}
for (const c of cases) c.addEventListener('change', () => { if (c.checked) etat[c.dataset.id] = 1; else delete etat[c.dataset.id]; sauver(); peindre(); });
for (const t of notes){ t.value = etat['n:' + t.dataset.note] || '';
  t.addEventListener('input', () => { if (t.value.trim()) etat['n:' + t.dataset.note] = t.value; else delete etat['n:' + t.dataset.note]; sauver(); }); }
let fA = false, fC = false;
function filtrer(){
  document.getElementById('f-absents').classList.toggle('on', fA);
  document.getElementById('f-coches').classList.toggle('on', fC);
  for (const f of document.querySelectorAll('.fiche')){
    const ok = (!fA || f.classList.contains('absent')) && (!fC || f.classList.contains('coche'));
    f.classList.toggle('hide', !ok);
  }
  for (const s of document.querySelectorAll('section.grp'))
    s.style.display = s.querySelector('.fiche:not(.hide)') ? '' : 'none';
}
document.getElementById('f-absents').onclick = () => { fA = !fA; filtrer(); };
document.getElementById('f-coches').onclick = () => { fC = !fC; filtrer(); };
document.getElementById('export').onclick = () => {
  const l = ['# Paramètres de l’Atelier -> Mode Live — ce que je retiens', ''];
  for (const s of document.querySelectorAll('section.grp')){
    const dedans = [];
    for (const f of s.querySelectorAll('.fiche')){
      const ch = [...f.querySelectorAll('input:checked')];
      const note = (f.querySelector('textarea').value || '').trim();
      if (!ch.length && !note) continue;
      const nom = f.querySelector('h3').textContent;
      dedans.push('- **' + nom + '**' + (ch.length ? '' : ' — (rien de coché)'));
      for (const c of ch){
        const lab = c.closest('label');
        dedans.push('    - \`' + lab.querySelector('.code').textContent + '\` ' + lab.querySelector('.txt').textContent);
      }
      if (note) dedans.push('    - _note :_ ' + note);
    }
    if (dedans.length){ l.push('## ' + s.querySelector('h2').textContent, ''); l.push(...dedans, ''); }
  }
  const vides = [...document.querySelectorAll('.fiche')].filter((f) => !f.querySelector('input:checked')).map((f) => f.querySelector('h3').textContent);
  if (vides.length) l.push('## Rien de coché — reste dans l’Atelier', '', vides.map((v) => '- ' + v).join('\\n'), '');
  document.getElementById('out').value = l.join('\\n');
  document.getElementById('dlg').showModal();
};
document.getElementById('copier').onclick = () => { const o = document.getElementById('out'); o.select(); document.execCommand('copy'); };
document.getElementById('fermer').onclick = () => document.getElementById('dlg').close();
peindre();
</script></body></html>`;

const dest = path.join(__dirname, '..', 'docs', 'relecture', 'parametres-live.html');
fs.writeFileSync(dest, html);
const nbP = GROUPES.reduce((n, g) => n + g.params.length, 0);
console.log(`${dest} — ${GROUPES.length} groupes, ${nbP} paramètres, ${nb} propositions à cocher.`);
