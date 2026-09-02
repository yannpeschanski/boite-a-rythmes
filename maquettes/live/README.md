# Mode Live — la bande d'architecture (2026-09-02)

> « fais la maquette de la bande » — Yann, après
> [`docs/plan/06-audit-architectures-de-morceau.md`](../../docs/plan/06-audit-architectures-de-morceau.md).

`bande-architecture.html` — trois propositions, chacune dans l'écran réel en
**844 × 390** (le paysage cible), à la place de l'actuel bandeau « banque de
séquences ». Tokens et couleurs repris tels quels de `src/ui/xp/tokens.css` et
de `LiveView.svelte` : aucune nouvelle langue visuelle.

Le morceau montré est le même dans les trois :
`INTRO ×2 · COUPLET ×4 · REFRAIN ×4 · COUPLET ×4 · REFRAIN ×4 · PONT ×2 ·
REFRAIN ×8 · OUTRO ×2` — 30 cycles, 2 min à 120 BPM.

## Les trois

| | | Mesuré |
|---|---|---|
| **①** | **Cases à largeur égale** — le « séquenceur-ception » : une case = une section, comme un pas est un pas | 8 cases à **85 px** |
| **②** | **Cases proportionnelles à leur durée** — une vraie ligne de temps, on voit la forme du morceau d'un coup d'œil | INTRO/PONT/OUTRO à **46 px**, REFRAIN ×8 à **180 px** |
| **③** | **① + masque de lignes** — 8 points par case : les lignes qui jouent dans cette section | 8 cases à **85 px** |

## Ce que la maquette a tranché

**② est écartée par la mesure.** La lecture est plus belle — la forme du
morceau se lit sans lire un chiffre — mais les cases courtes tombent à 46 px
pour un seuil tactile de 44, et **une section d'UN cycle tomberait à 22 px**.
Une bande dont certaines cases ne sont pas frappables n'est pas une bande de
scène. La durée se dit dans le `×N` et dans le LCD, elle n'a pas besoin d'être
dessinée.

**③ est ① plus une information, pas une variante concurrente.** Les huit
points montrent qu'ici l'intro, le couplet et le refrain sont la **même
séquence** : seules les lignes allumées changent. Une entrée de banque au lieu
de trois. C'est le masque de lignes de l'audit, rendu visible.

⚠️ **Les points sont un TÉMOIN, pas une cible** — 3 px. On les lit, on ne les
tape pas ; le masque s'édite dans la bande de mutes (`05-audit-mode-live.md`,
§3), jamais ici.

## Ce que la maquette ne dit pas

- Elle est **statique** : le remplissage ambre de la case en cours et son filet
  de tête de lecture sont figés à 50 %.
- Elle n'a **pas tourné sur un vrai téléphone**, comme le reste du Mode Live.
- Les huit cases sont un cas favorable ; le plafond sans défilement reste
  **18 cases à 46 px** (mesuré dans l'audit).
