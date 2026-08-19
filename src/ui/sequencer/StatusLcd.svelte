<script lang="ts">
  /* Le bandeau LCD en bas de la fenêtre du séquenceur.
   *
   * La maquette de référence (maquettes/atelier/winamp-modes.html) le remplit
   * avec les réglages de la ligne qu'on vient de manipuler — « KICK · TON 42 ·
   * DÉCLIN 220 » à gauche, « RÉV 12 % » à droite. C'est l'afficheur d'un
   * appareil : il ne commande rien, il dit où on en est.
   *
   * Il ne lit QUE l'état, jamais de props de ligne : brancher un composant de
   * plus sur chaque DrumRowView aurait fait remonter l'information par huit
   * chemins pour un seul afficheur.
   */
  import { pattern } from '../../stores/pattern.svelte';
  import { lastTouched } from '../atelier/lastTouched.svelte';

  const NOMS: Record<string, string> = {
    kick: 'KICK', snare: 'SNARE', hat: 'HAT', clap: 'CLAP', shaker: 'SHAKER',
    bass: 'BASSE', pad: 'NAPPE', melody: 'MÉLODIE',
  };

  const st = $derived(pattern.state);

  /* Trois segments à gauche, une valeur à droite — la forme de la maquette.
     Tant qu'on n'a touché aucune ligne, l'afficheur ne ment pas : il annonce
     le morceau plutôt que d'inventer une ligne courante. */
  const gauche = $derived.by(() => {
    const t = lastTouched.current;
    if (!t) {
      const vivantes = (Object.keys(st.rows) as (keyof typeof st.rows)[]).filter(
        (n) => !st.rows[n].muted && st.rows[n].pattern.some((v) => v > 0),
      ).length;
      return `${st.tempo} BPM · ${vivantes} LIGNE${vivantes > 1 ? 'S' : ''} EN JEU`;
    }
    if (t.kind === 'drum') {
      const r = st.rows[t.name];
      return `${NOMS[t.name]} · TON ${r.tone} · DÉCLIN ${r.decay} · PAS ${r.subdiv}`;
    }
    const r = st.synthRows[t.name];
    return `${NOMS[t.name]} · ${(r.voice.type ?? 'sine').toUpperCase()} · ${r.subdivisions} PAS`;
  });

  const droite = $derived.by(() => {
    const t = lastTouched.current;
    if (!t) return '';
    const r = t.kind === 'drum' ? st.rows[t.name] : st.synthRows[t.name];
    return `RÉV ${Math.round(r.reverbSend * 100)} %`;
  });
</script>

<div class="lcd" aria-hidden="true">
  <span>{gauche}</span>
  <span class="dim">{droite}</span>
</div>

<style>
  /* Le verre du LCD : même fond que les cases vides, même vert que les
     afficheurs. L'interlettrage de 0,06em est ce qui l'empêche de se lire
     comme du texte courant à 9px — c'est un cadran, pas une phrase. */
  .lcd {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 7px;
    padding: 5px 7px;
    background: var(--xp-lcd-bg);
    color: var(--xp-lcd);
    border: 1px solid var(--xp-line);
    box-shadow: var(--xp-bevel-in);
    border-radius: 3px;
    font-size: var(--xp-size-lcd);
    letter-spacing: 0.06em;
    white-space: nowrap;
    overflow: hidden;
  }
  .lcd span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* La valeur de droite est en retrait : sur un vrai afficheur, tout n'a pas
     la même intensité. */
  .dim {
    color: var(--xp-lcd-dim);
    flex: none;
  }
</style>
