/* Grille partagée par les dix maquettes d'architecture. Contenu identique
   partout — mêmes lignes, mêmes pas, même motif que l'écran réel — pour que
   la seule variable soit l'endroit où vivent les commandes.
   <div data-grid></div>            → les 5 lignes de batterie
   <div data-grid="8"></div>        → les 8 lignes (batterie + synthé)
   data-sel="KICK"                  → une ligne mise en évidence
   data-rows="KICK,SNARE"           → sous-ensemble (paliers de progression) */
(function () {
  const ROWS = [
    ['KICK', 'kick', 4, [1, 0, 1, 0]],
    ['SNARE', 'snare', 4, [0, 1, 0, 1]],
    ['HAT', 'hat', 8, [1, 1, 1, 1, 1, 1, 1, 1]],
    ['CLAP', 'clap', 4, [0, 0, 0, 0]],
    ['SHAKER', 'shaker', 8, [0, 0, 0, 0, 0, 0, 0, 0]],
    ['BASSE', 'bass', 4, [1, 0, 0, 1]],
    ['NAPPE', 'pad', 4, [1, 0, 1, 0]],
    ['MÉLODIE', 'melody', 8, [0, 1, 0, 0, 1, 0, 1, 0]],
  ];

  function render(host) {
    const n = parseInt(host.dataset.grid, 10) || 5;
    const only = host.dataset.rows ? host.dataset.rows.split(',') : null;
    const sel = host.dataset.sel || '';
    const list = ROWS.slice(0, n).filter((r) => !only || only.includes(r[0]));

    let html = '<div class="ruler"><span>1</span><span>2</span><span>3</span><span>4</span></div>';
    for (const [name, key, , pat] of list) {
      const live = pat.some(Boolean);
      const on = name === sel ? ' style="outline:1px solid var(--amber);outline-offset:3px"' : '';
      html += `<div class="row"${on}>
        <span class="tag" style="color:var(--${key})"><i class="led${live ? '' : ' off'}"></i>${name}</span>
        <span class="cells" style="color:var(--${key})">${pat
          .map((v) => `<i class="${v ? 'on' : ''}"></i>`)
          .join('')}</span></div>`;
    }
    host.innerHTML = html;
  }

  document.querySelectorAll('[data-grid]').forEach(render);
})();
