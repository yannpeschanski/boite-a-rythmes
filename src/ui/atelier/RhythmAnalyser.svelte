<script lang="ts">
  // Analyseur de rythme — onglet Production (idée de Yann : « un analyseur de
  // son à la place de la section morceau chargé : il indique quel morceau se
  // rapproche le plus et explique le contexte »).
  //
  // Pourquoi c'est mieux que le panneau qu'il remplace : « Le morceau chargé »
  // n'avait rien à dire tant qu'on n'en avait pas chargé un, et devenait faux
  // dès qu'on modifiait le pattern — il continuait d'afficher l'histoire d'un
  // morceau qu'on n'était plus en train de jouer. Le plus proche, lui, a
  // toujours quelque chose à raconter, y compris sur un rythme parti de rien.
  // Les textes historiques (~880 lignes de contenu) restent le cœur du
  // panneau, ils changent juste de déclencheur.
  //
  // Ça libère aussi la ligne « le plus proche » du bandeau sticky, qui était
  // masquée sur mobile (`@media (pointer: coarse)`) : l'information devient
  // donc accessible au doigt, ce qu'elle n'était pas.
  import type { PatternStateV2 } from '../../model/types';
  import type { ClosestMatch } from '../../engine/similarity';

  let { state, ranking }: { state: PatternStateV2; ranking: ClosestMatch[] } = $props();

  const best = $derived(ranking[0] ?? null);
  const runnersUp = $derived(ranking.slice(1, 3));

  // Fiche technique de ce qu'on joue. Volontairement descriptive : on montre
  // ce que le rythme EST, on ne note pas l'utilisateur.
  const signature = $derived(
    [state.rows.kick.subdiv, state.rows.snare.subdiv, state.rows.hat.subdiv].join(':'),
  );
  const polyrythmique = $derived(
    new Set([state.rows.kick.subdiv, state.rows.snare.subdiv, state.rows.hat.subdiv]).size > 1,
  );
  const activeLines = $derived.by(() => {
    const names: string[] = [];
    const drum = { kick: 'Kick', snare: 'Snare', hat: 'Hat', clap: 'Clap', shaker: 'Shaker' } as const;
    for (const [k, label] of Object.entries(drum)) {
      const r = state.rows[k as keyof typeof drum];
      if (!r.muted && r.pattern.slice(0, r.subdiv).some((v) => v > 0)) names.push(label);
    }
    const synth = { bass: 'Basse', pad: 'Nappe', melody: 'Mélodie' } as const;
    for (const [k, label] of Object.entries(synth)) {
      const r = state.synthRows[k as keyof typeof synth];
      const has = r.pattern
        .slice(0, r.subdivisions)
        .some((v) => (k === 'pad' ? typeof v === 'number' && v >= 0 : v != null));
      if (!r.muted && has) names.push(label);
    }
    return names;
  });

  // Écarts avec le style le plus proche — la partie réellement actionnable.
  // Seuils volontairement larges : on ne signale que ce qui s'entend.
  const tempoGap = $derived(best ? state.tempo - best.preset.tempo : 0);
  const swingGap = $derived(best ? state.swing - best.preset.swing : 0);
</script>

{#if !best}
  <p class="empty">Pose quelques pas sur la batterie : l’analyse arrive dès qu’il y a un rythme.</p>
{:else}
  <div class="analyser">
    <p class="verdict">
      Ce que tu joues ressemble le plus à
      <strong>{best.preset.label}</strong>
      <span class="cat">{best.preset.cat}</span>
      <span class="score">{Math.round(best.score * 100)} %</span>
    </p>

    <p class="history">{best.preset.history}</p>
    <p class="demo">💡 {best.preset.demo}</p>

    {#if runnersUp.length}
      <p class="also">
        Ensuite :
        {#each runnersUp as r, i (r.preset.id)}{i > 0 ? ' · ' : ' '}<span class="alt"
            >{r.preset.label} ({Math.round(r.score * 100)} %)</span
          >{/each}
      </p>
    {/if}

    <dl class="facts">
      <div><dt>Tempo</dt><dd>{state.tempo} BPM</dd></div>
      <div>
        <dt>Signature</dt>
        <dd>{signature}{polyrythmique ? ' · polyrythmique' : ''}</dd>
      </div>
      <div><dt>Lignes qui sonnent</dt><dd>{activeLines.length ? activeLines.join(', ') : 'aucune'}</dd></div>
      <div><dt>Swing</dt><dd>{state.swing} %</dd></div>
    </dl>

    {#if Math.abs(tempoGap) >= 15 || Math.abs(swingGap) >= 15}
      <p class="gaps">
        Pour coller davantage à ce style :
        {#if Math.abs(tempoGap) >= 15}
          il tourne plutôt autour de <strong>{best.preset.tempo} BPM</strong> (tu es à {state.tempo}){/if}{#if Math.abs(tempoGap) >= 15 && Math.abs(swingGap) >= 15}, et{/if}{#if Math.abs(swingGap) >= 15}
          son swing est plutôt à <strong>{best.preset.swing} %</strong> (tu es à {state.swing}){/if}.
      </p>
    {/if}

    <p class="caveat">
      La comparaison ne porte que sur <strong>kick, snare et hat</strong>, et teste les six
      permutations de ces trois lignes — un même rythme joué sur d’autres lignes reste reconnu. Le
      synthé, le clap et le shaker n’entrent pas dans le score.
    </p>
  </div>
{/if}

<style>
  .analyser {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .verdict {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--xp-text);
  }
  .verdict strong {
    font-size: 14px;
  }
  .cat {
    color: var(--xp-muted);
    font-size: 11px;
    margin-left: 4px;
  }
  .score {
    display: inline-block;
    margin-left: 6px;
    padding: 1px 7px;
    border-radius: 10px;
    background: var(--xp-accent-teal);
    color: #fff;
    font-family: var(--xp-mono);
    font-size: 11px;
    font-weight: 700;
  }
  .history,
  .demo,
  .also,
  .gaps,
  .caveat,
  .empty {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    max-width: 70ch;
  }
  .demo,
  .also,
  .caveat,
  .empty {
    color: var(--xp-muted);
  }
  .caveat {
    font-size: 11px;
    border-top: 1px solid var(--xp-line);
    padding-top: 6px;
  }
  .alt {
    font-family: var(--xp-mono);
    font-size: 11px;
  }
  .gaps {
    background: color-mix(in srgb, var(--xp-accent-teal) 10%, transparent);
    border-left: 3px solid var(--xp-accent-teal);
    padding: 6px 8px;
  }
  /* Fiche technique : colonnes qui se replient d'elles-mêmes, pas de largeur
     figée — le contenu (« Kick, Snare, Hat, Basse… ») varie beaucoup. */
  .facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 6px 14px;
    margin: 2px 0;
  }
  .facts div {
    min-width: 0;
  }
  .facts dt {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--xp-muted);
  }
  .facts dd {
    margin: 1px 0 0;
    font-size: 12px;
    font-family: var(--xp-mono);
    color: var(--xp-text);
  }
</style>
