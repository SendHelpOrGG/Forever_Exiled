/*
 * Ten design directions for Forever Exiled — ten layouts, not ten skins.
 *
 * Every mock shows the same content (Winter Orb, its combinations, the crafting card) so the
 * comparison is fair, but each one is built from its own markup: a sidebar shell, a printed
 * page, a table, a magazine, a banner, a dashboard, a poster, a command palette, a ledger and
 * an art wall. They are also alive — pick a skill, switch a size, choose a combination, and
 * the mock answers.
 */

'use strict';

const A = '../assets';

const art = {
  gem: (n) => `${A}/gems/${n}.png`,
  asc: (n) => `${A}/asc/${n}.jpg`,
  cluster: (n) => `${A}/${n}.png`,
};

const D = {
  skill: {
    name: 'Winter Orb', gem: 'winter_orb', asc: 'occultist', damage: 'Cold',
    classes: 'Occultist, Elementalist, Assassin',
    builds: '1,910', pop: '20.5%', avg: '34.5M', peak: '145M', sampled: '21 of 24',
  },
  skills: [
    { gem: 'winter_orb', asc: 'occultist', name: 'Winter Orb', dmg: 'Cold', dps: '145M', pop: '20.5' },
    { gem: 'molten_strike_of_the_zenith', asc: 'pathfinder', name: 'Molten Strike of the Zenith', dmg: 'Fire', dps: '128M', pop: '17.8' },
    { gem: 'righteous_fire', asc: 'champion', name: 'Righteous Fire', dmg: 'Fire', dps: '96M', pop: '12.3' },
    { gem: 'lightning_strike', asc: 'deadeye', name: 'Lightning Strike', dmg: 'Lightning', dps: '88M', pop: '9.6' },
    { gem: 'hexblast', asc: 'occultist', name: 'Hexblast', dmg: 'Chaos', dps: '74M', pop: '6.1' },
  ],
  combos: [
    { art: 'cluster_large', size: 'Large', passives: 12, label: 'Prism Weave + Snowstorm', pct: 68, builds: 15, avg: '41.2M' },
    { art: 'cluster_medium', size: 'Medium', passives: 8, label: 'Blanketed Snow + Cold to the Core', pct: 44, builds: 10, avg: '38.7M' },
    { art: 'cluster_medium', size: 'Medium', passives: 6, label: 'Eye to Eye + Repeater', pct: 31, builds: 7, avg: '44.1M' },
  ],
  craft: { route: 'Alt + Augment', tries: '1 in 12', cost: '3.2 div', match: '6 of 7 mods' },
  kpis: [['Builds tracked', '124,363'], ['Skills above 1%', '18'], ['Characters sampled', '234'], ['Cluster jewels', '592']],
  nav: ['Cluster Jewels', "Watcher's Eyes", 'Rare Items', 'Flasks', 'Economy'],
};

const bar = (pct) => `<span class="bar" data-bar style="--pct:${pct}%"><i></i></span>`;
const num = (v) => `<b class="num">${v}</b>`;

/* ============================================================== the layouts */

const L = {};

/* 01 — the shell we have, with depth and light */
L.obsidian = () => `
  <aside class="o-side" data-block="nav">
    <div class="o-brand"><img src="${A}/logo.png" alt=""><span>forever exiled</span></div>
    ${D.nav.map((n, i) => `<a class="navrow${i === 0 ? ' on' : ''}" data-nav><i></i>${n}</a>`).join('')}
    <div class="o-sidefoot"><a class="navrow" data-nav><i></i>Settings</a><em>v1.0.0 · pipeline 9</em></div>
  </aside>
  <div class="o-main">
    <header class="o-top">
      <span class="crumb">Cluster Jewels <em>/ Lab</em></span>
      <div class="o-topright">
        <span class="tag">POE 1</span><span class="tag">Allflame</span>
        <button class="btn sync" data-press>SYNC</button>
      </div>
    </header>
    <div class="o-grid">
      <section class="card o-rail">
        <div class="o-railhead"><span>Main skills</span><b>18</b></div>
        <div class="o-search">Search skill, class or damage</div>
        ${D.skills.map((s, i) => `
          <div class="o-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
            <img class="gem s" src="${art.gem(s.gem)}" alt="">
            <span class="o-skilltxt"><b>${s.name}</b><em>${s.dmg} · ${s.pop}% of ladder</em></span>
            <b class="o-skilldps">${s.dps}</b>
          </div>`).join('')}
      </section>

      <section class="o-centre">
        <div class="card o-hero" data-block="hero">
          <img class="gem l" src="${art.gem(D.skill.gem)}" alt="">
          <img class="asc" src="${art.asc(D.skill.asc)}" alt="">
          <div class="o-herotxt">
            <div class="eyebrow"><i></i>${D.skill.damage}<em>· ${D.skill.classes}</em></div>
            <h2 data-hero-name>${D.skill.name}</h2>
            <div class="chips"><span>${D.skill.builds} builds</span><span>${D.skill.pop} of ladder</span><span>${D.skill.sampled} sampled</span></div>
          </div>
          <div class="o-stats" data-block="stats">
            <div><em>AVG DPS</em>${num(D.skill.avg)}</div>
            <div><em>PEAK</em>${num(D.skill.peak)}</div>
          </div>
        </div>
        <div class="o-sizes">${sizes()}<span class="hint">ranked by builds running the combination</span></div>
        <div class="o-list" data-block="combos">${D.combos.map(comboCard).join('')}</div>
      </section>

      <aside class="o-right" data-block="craft">${railCards()}</aside>
    </div>
    <footer class="o-status" data-block="status"><span>Ready · 234 characters sampled</span><em>DATA · POE.NINJA BUILD API</em></footer>
  </div>`;

/* 02 — a printed page: ribbon, contents, entries with leaders, marginalia */
L.codex = () => `
  <header class="c-ribbon" data-block="nav">
    <span class="c-word">forever exiled</span>
    <nav class="c-tabs">${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}</nav>
    <button class="c-sync" data-press>Sync the ladder</button>
  </header>
  <div class="c-page">
    <div class="c-contents">
      <span class="c-cap">Contents</span>
      ${D.skills.map((s, i) => `<a class="c-line${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><b>${s.name}</b><i></i>${s.dps}</a>`).join('')}
    </div>
    <article class="c-sheet">
      <header class="c-head" data-block="hero">
        <div class="c-emblem">
          <img class="c-jewel" src="${art.cluster('cluster_medium')}" alt="">
          <img class="c-gem" src="${art.gem(D.skill.gem)}" alt="">
        </div>
        <div>
          <p class="c-kicker">Chapter I · ${D.skill.damage}</p>
          <h1 data-hero-name>${D.skill.name}</h1>
          <p class="c-lede">${D.skill.builds} builds on the ladder · ${D.skill.pop} share · ${D.skill.classes}</p>
          <div class="c-stats" data-block="stats">
            <span><em>average</em>${num(D.skill.avg)}</span>
            <span><em>peak</em>${num(D.skill.peak)}</span>
            <span><em>sampled</em><b class="plain">${D.skill.sampled}</b></span>
          </div>
        </div>
      </header>
      <div class="c-body">
        <div class="c-entries" data-block="combos">
          <h3>Combinations worth rolling</h3>
          ${D.combos.map((c) => `
            <div class="c-entry" data-combo data-label="${c.label}">
              <img src="${art.cluster(c.art)}" alt="">
              <b>${c.label}</b><i class="leader"></i><span>${c.pct}%</span>
            </div>`).join('')}
        </div>
        <aside class="c-margin" data-block="craft">
          <h4>Marginalia</h4>
          <p><em>Crafting</em><b data-craft-combo>Prism Weave + Snowstorm</b></p>
          <p><em>Route</em><b>${D.craft.route}</b></p>
          <p><em>Tries</em><b>${D.craft.tries}</b></p>
          <p><em>Cost</em><b>${D.craft.cost}</b></p>
        </aside>
      </div>
    </article>
  </div>
  <footer class="c-status" data-block="status"><span>Ready · 234 characters read across 18 skills</span><em>poe.ninja</em></footer>`;

/* 03 — a terminal: one table, one inspector, one command line */
L.terminal = () => `
  <header class="t-bar" data-block="nav">
    <span class="t-prompt">forever-exiled</span>
    <nav class="t-tabs">${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n.toLowerCase()}</a>`).join('')}</nav>
    <button class="t-run" data-press>[ sync ]</button>
  </header>
  <div class="t-body">
    <section class="t-table">
      <div class="t-thead"><span>#</span><span>skill</span><span>builds</span><span>share</span><span>avg</span><span>peak</span></div>
      ${D.skills.map((s, i) => `
        <div class="t-row${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
          <span class="t-idx">${String(i + 1).padStart(2, '0')}</span>
          <span class="t-name"><img src="${art.gem(s.gem)}" alt="">${s.name}</span>
          <span>${s.pop}</span><span>${s.pop}%</span><span>${s.dps}</span><span class="t-peak">${s.dps}</span>
        </div>`).join('')}
      <div class="t-log">
        <div class="t-logline"><em>12:04</em> fetched 18 skill pages above the 1% floor</div>
        <div class="t-logline"><em>12:06</em> parsed 234 characters, 592 cluster jewels indexed</div>
        <div class="t-logline"><em>12:07</em> 34 combinations matched to craft routes</div>
        <div class="t-logline"><em>12:07</em> snapshot demo-2026-11-07 ready</div>
      </div>
    </section>

    <aside class="t-inspect">
      <div class="t-hero" data-block="hero">
        <img class="gem l" src="${art.gem(D.skill.gem)}" alt="">
        <div><h2 data-hero-name>${D.skill.name}</h2><p>${D.skill.damage} · ${D.skill.classes}</p></div>
      </div>
      <div class="t-stats" data-block="stats">
        <div><em>avg</em>${num(D.skill.avg)}</div><div><em>peak</em>${num(D.skill.peak)}</div>
      </div>
      <div class="t-combos" data-block="combos">${D.combos.map((c) => `
        <div class="t-combo" data-combo data-label="${c.label}">
          <span class="t-cname">${c.label}</span><span class="t-cpct">${c.pct}%</span>${bar(c.pct)}
        </div>`).join('')}</div>
      <div class="t-craft" data-block="craft">
        <div><em>craft</em><b data-craft-combo>Prism Weave + Snowstorm</b></div>
        <div><em>tries</em><b>${D.craft.tries}</b></div>
        <div><em>cost</em><b>${D.craft.cost}</b></div>
      </div>
    </aside>
  </div>
  <footer class="t-status" data-block="status"><span class="t-prompt">&gt;</span><span>234 characters sampled · 592 jewels read</span><span class="t-caret"></span></footer>`;

/* 04 — a light magazine: big picture, cards, quiet type */
L.sanctum = () => `
  <aside class="s-rail" data-block="nav">
    <img class="s-mark" src="${A}/logo.png" alt="">
    ${D.nav.map((n, i) => `<a class="s-nav${i === 0 ? ' on' : ''}" data-nav title="${n}"><i></i><span>${n}</span></a>`).join('')}
  </aside>
  <div class="s-main">
    <header class="s-top">
      <div class="s-search">Search builds, skills, items</div>
      <button class="s-ghost" data-press>Export</button>
      <button class="s-cta" data-press>Sync ladder</button>
    </header>
    <div class="s-strip">
      ${D.skills.map((s, i) => `<button class="s-chip${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.name.split(' ')[0]}</span></button>`).join('')}
    </div>
    <div class="s-grid">
      <section class="s-hero" data-block="hero">
        <img class="s-art" src="${art.asc(D.skill.asc)}" alt="">
        <div class="s-hero-copy">
          <p class="s-eyebrow">${D.skill.damage} · ${D.skill.classes}</p>
          <h2 data-hero-name>${D.skill.name}</h2>
          <p class="s-meta">${D.skill.builds} builds · ${D.skill.pop} of the ladder · ${D.skill.sampled} sampled</p>
          <div class="s-stats" data-block="stats">
            <div><em>Average</em>${num(D.skill.avg)}</div>
            <div><em>Peak</em>${num(D.skill.peak)}</div>
          </div>
        </div>
      </section>
      <section class="s-list" data-block="combos">
        ${D.combos.map((c) => `
          <article class="s-card" data-combo data-label="${c.label}">
            <img src="${art.cluster(c.art)}" alt="">
            <h4>${c.label}</h4>
            <p>${c.size} · ${c.passives} passives · ${c.builds} builds</p>
            <div class="s-cardfoot"><span class="s-pct">${c.pct}%</span>${bar(c.pct)}</div>
          </article>`).join('')}
      </section>
      <aside class="s-side" data-block="craft">
        <div class="s-panel">
          <h5>Crafting</h5>
          <p class="s-target" data-craft-combo>Prism Weave + Snowstorm</p>
          <dl><dt>${D.craft.route}</dt><dd>${D.craft.tries}</dd><dt>Cost</dt><dd>${D.craft.cost}</dd><dt>Match</dt><dd>${D.craft.match}</dd></dl>
          <button class="s-cta wide" data-press>Open crafting</button>
        </div>
        <div class="s-panel soft">
          <h5>Coverage</h5>
          <dl><dt>Large</dt><dd>78%</dd><dt>Medium</dt><dd>64%</dd><dt>Small</dt><dd>22%</dd></dl>
        </div>
        <div class="s-panel soft">
          <h5>Snapshot</h5>
          <dl><dt>Sample</dt><dd>234</dd><dt>Jewels</dt><dd>592</dd><dt>League</dt><dd>Allflame</dd></dl>
        </div>
      </aside>
    </div>
    <footer class="s-status" data-block="status"><span>Ready · 234 characters sampled</span><span>poe.ninja build API</span></footer>
  </div>`;

/* 05 — a cinematic banner with a filmstrip of skills */
L.ember = () => `
  <header class="e-top" data-block="nav">
    <span class="e-brand"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav>${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}</nav>
    <button class="e-btn sync" data-press>Sync</button>
  </header>

  <section class="e-banner" data-block="hero">
    <img class="e-glow" src="${art.cluster('cluster_large')}" alt="">
    <div class="e-banner-copy">
      <p class="e-kicker">${D.skill.damage} · tier 16 maps</p>
      <h1 data-hero-name>${D.skill.name}</h1>
      <p class="e-sub">${D.skill.builds} builds · ${D.skill.pop} of the ladder · ${D.skill.sampled} sampled</p>
    </div>
    <div class="e-stats" data-block="stats">
      <div><em>Average DPS</em>${num(D.skill.avg)}</div>
      <div><em>Peak</em>${num(D.skill.peak)}</div>
    </div>
  </section>

  <div class="e-strip">
    ${D.skills.map((s, i) => `
      <button class="e-chip${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
        <img src="${art.asc(s.asc)}" alt=""><span class="e-chipgem"><img src="${art.gem(s.gem)}" alt=""></span>
        <b>${s.name}</b><em>${s.dps}</em>
      </button>`).join('')}
  </div>

  <div class="e-body">
    <section class="e-rows" data-block="combos">
      ${D.combos.map((c) => `
        <article class="e-row" data-combo data-label="${c.label}">
          <img src="${art.cluster(c.art)}" alt="">
          <div><b>${c.label}</b><em>${c.size} · ${c.passives} passives · ${c.builds} builds · ${c.avg} avg</em></div>
          <span class="e-pct">${c.pct}%</span>${bar(c.pct)}
        </article>`).join('')}
    </section>
    <aside class="e-craft" data-block="craft">
      <h5>Crafting</h5>
      <p class="e-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <div class="e-line"><em>${D.craft.route}</em><b>${D.craft.tries}</b></div>
      <div class="e-line"><em>cost</em><b>${D.craft.cost}</b></div>
      <button class="e-btn wide" data-press>Plan the craft</button>
    </aside>
  </div>
  <footer class="e-status" data-block="status"><span>Ready · 234 characters sampled</span><em>poe.ninja</em></footer>`;

/* 06 — a dashboard: KPI strip, widgets, no hero picture */
L.atlas = () => `
  <header class="a-top" data-block="nav">
    <span class="a-brand">forever exiled</span>
    <nav class="a-tabs">${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}</nav>
    <span class="a-league">Allflame</span>
    <button class="a-sync" data-press>Sync</button>
  </header>

  <div class="a-kpis">
    ${D.kpis.map(([k, v], i) => `<div class="a-kpi"><em>${k}</em>${num(v)}${bar([86, 72, 64, 58][i])}</div>`).join('')}
  </div>

  <div class="a-grid">
    <section class="a-widget a-picker" data-block="hero">
      <h5>Main skill <span>18 above the floor</span></h5>
      <div class="a-pickerlist">
        ${D.skills.map((s, i) => `<button class="a-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.name}</span><b>${s.dps}</b></button>`).join('')}
      </div>
      <p class="a-heroname" data-hero-name>Winter Orb</p>
      <div class="a-herostats" data-block="stats">
        <div><em>Average</em>${num(D.skill.avg)}</div><div><em>Peak</em>${num(D.skill.peak)}</div>
      </div>
    </section>

    <section class="a-widget a-combos" data-block="combos">
      <h5>Combinations <span>ranked by builds</span></h5>
      ${D.combos.map((c) => `
        <button class="a-combo" data-combo data-label="${c.label}">
          <img src="${art.cluster(c.art)}" alt="">
          <span class="a-cname">${c.label}<em>${c.size} · ${c.builds} builds</em></span>
          <span class="a-cpct">${c.pct}%</span>${bar(c.pct)}
        </button>`).join('')}
    </section>

    <section class="a-widget a-craft" data-block="craft">
      <h5>Crafting</h5>
      <p class="a-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <div class="a-rows">
        <span>${D.craft.route}</span><b>${D.craft.tries}</b>
        <span>Cost</span><b>${D.craft.cost}</b>
        <span>Match</span><b>${D.craft.match}</b>
      </div>
      <button class="a-sync wide" data-press>Plan it</button>
    </section>

    <section class="a-widget a-mix">
      <h5>Class mix</h5>
      <div class="a-donut"><span>43%<em>Occultist</em></span></div>
      <div class="a-mixlist">
        <span>Occultist <b>43%</b></span><span>Elementalist <b>31%</b></span><span>Assassin <b>26%</b></span>
      </div>
    </section>
  </div>

  <footer class="a-status" data-block="status"><span>Ready · 234 characters sampled across 18 skills</span><em>DATA · POE.NINJA</em></footer>`;

/* 07 — a poster: giant type, strict table, hard rules */
L.brutalist = () => `
  <header class="b-nav" data-block="nav">
    ${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}
    <button class="b-sync" data-press>SYNC</button>
  </header>
  <div class="b-split">
    <section class="b-poster" data-block="hero">
      <img class="b-jewel" src="${art.cluster('cluster_large')}" alt="">
      <p class="b-kicker">${D.skill.damage} / 20.5%</p>
      <h1 data-hero-name>${D.skill.name}</h1>
      <div class="b-stats" data-block="stats">
        <div>${num(D.skill.avg)}<em>avg</em></div>
        <div>${num(D.skill.peak)}<em>peak</em></div>
      </div>
      <div class="b-skills">
        ${D.skills.slice(0, 4).map((s, i) => `<button class="b-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">${s.name.split(' ')[0]}</button>`).join('')}
      </div>
    </section>

    <section class="b-table" data-block="combos">
      <div class="b-thead"><span>combination</span><span>builds</span><span>share</span></div>
      ${D.combos.map((c) => `
        <button class="b-row" data-combo data-label="${c.label}">
          <span class="b-cname">${c.label}</span>
          <span>${c.builds}</span>
          <span class="b-cpct">${c.pct}%</span>
          ${bar(c.pct)}
        </button>`).join('')}
      <div class="b-craft" data-block="craft">
        <div><em data-craft-combo>Prism Weave + Snowstorm</em>
          <b>${D.craft.route} · ${D.craft.tries} · ${D.craft.cost}</b></div>
        <button class="b-sync" data-press>PLAN</button>
      </div>
    </section>
  </div>
  <footer class="b-status" data-block="status"><span>READY — 234 CHARACTERS — 592 JEWELS</span><em>POE.NINJA</em></footer>`;

/* 08 — a command palette floating over the art */
L.prism = () => `
  <div class="p-backdrop">
    <img class="p-blur" src="${art.cluster('cluster_large')}" alt="">
    <img class="p-blur two" src="${art.asc(D.skill.asc)}" alt="">
  </div>
  <nav class="p-nav" data-block="nav">
    ${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}
    <button class="p-sync" data-press>Sync</button>
  </nav>

  <div class="p-palette">
    <div class="p-search"><i></i><span data-hero-name>Winter Orb</span>
      <span class="p-scope">
        ${D.skills.slice(0, 3).map((s, i) => `<button class="p-scopegem${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}
      </span>
      <kbd>⌘K</kbd></div>
    <div class="p-cols">
      <div class="p-results" data-block="combos">
        <p class="p-cap">Combinations</p>
        ${D.combos.map((c, i) => `
          <button class="p-result${i === 0 ? ' on' : ''}" data-combo data-label="${c.label}">
            <img src="${art.cluster(c.art)}" alt="">
            <span class="p-rname">${c.label}<em>${c.size} · ${c.builds} builds</em></span>
            <b>${c.pct}%</b>
          </button>`).join('')}
      </div>
      <div class="p-preview" data-block="hero">
        <div class="p-previewart">
          <img class="p-gem" src="${art.gem(D.skill.gem)}" alt="">
          <img class="p-asc" src="${art.asc(D.skill.asc)}" alt="">
        </div>
        <h3 data-hero-name>${D.skill.name}</h3>
        <p class="p-meta">${D.skill.damage} · ${D.skill.pop} of ladder</p>
        <div class="p-stats" data-block="stats">
          <div><em>avg</em>${num(D.skill.avg)}</div><div><em>peak</em>${num(D.skill.peak)}</div>
        </div>
        <div class="p-craft" data-block="craft">
          <p data-craft-combo>Prism Weave + Snowstorm</p>
          <span>${D.craft.route} · ${D.craft.tries} · ${D.craft.cost}</span>
        </div>
      </div>
    </div>
    <div class="p-hints"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
  </div>
  <footer class="p-status" data-block="status"><span>Ready · 234 characters sampled</span><em>⌘K</em></footer>`;

/* 09 — a ledger: master table, detail pane, crafting column, rules everywhere */
L.ledger = () => `
  <header class="l-top" data-block="nav">
    <span class="l-brand">forever exiled</span>
    <nav>${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}</nav>
    <button class="l-sync" data-press>SYNC</button>
  </header>
  <div class="l-panes">
    <section class="l-skills">
      <div class="l-thead"><span>skill</span><span>share</span><span>dps</span></div>
      ${D.skills.map((s, i) => `
        <button class="l-row${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
          <span class="l-name"><img src="${art.gem(s.gem)}" alt="">${s.name}</span>
          <span>${s.pop}%</span><b>${s.dps}</b>
        </button>`).join('')}
      <div class="l-count">18 skills above the popularity floor</div>
    </section>

    <section class="l-detail">
      <div class="l-hero" data-block="hero">
        <img src="${art.gem(D.skill.gem)}" alt="">
        <div><h2 data-hero-name>${D.skill.name}</h2><p>${D.skill.damage} · ${D.skill.classes}</p></div>
        <div class="l-stats" data-block="stats"><div>${num(D.skill.avg)}<em>avg</em></div><div>${num(D.skill.peak)}<em>peak</em></div></div>
      </div>
      <div class="l-table" data-block="combos">
        <div class="l-chead"><span>combination</span><span>size</span><span>builds</span><span>share</span><span>avg</span></div>
        ${D.combos.map((c) => `
          <button class="l-crow" data-combo data-label="${c.label}">
            <span>${c.label}</span><span>${c.size}</span><span>${c.builds}</span>
            <span class="l-cpct">${c.pct}%</span><span>${c.avg}</span>
          </button>`).join('')}
        <div class="l-tablefoot">34 combinations across 18 skills · ranked by builds</div>
      </div>
    </section>

    <aside class="l-craft" data-block="craft">
      <h5>Crafting</h5>
      <p class="l-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <div class="l-kv"><span>route</span><b>${D.craft.route}</b></div>
      <div class="l-kv"><span>tries</span><b>${D.craft.tries}</b></div>
      <div class="l-kv"><span>cost</span><b>${D.craft.cost}</b></div>
      <div class="l-kv"><span>match</span><b>${D.craft.match}</b></div>
      <button class="l-sync wide" data-press>PLAN</button>
    </aside>
  </div>
  <footer class="l-status" data-block="status"><span>Ready · 234 characters — master/detail</span><em>POE.NINJA</em></footer>`;

/* 10 — an art wall */
L.trophy = () => `
  <nav class="w-nav" data-block="nav">
    <img class="w-logo" src="${A}/logo.png" alt="">
    ${D.nav.map((n, i) => `<a data-nav class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}
    <button class="w-sync" data-press>SYNC</button>
  </nav>
  <div class="w-wall">
    <figure class="w-poster" data-block="hero">
      <img class="w-art" src="${art.cluster('cluster_large')}" alt="">
      <img class="w-gem" src="${art.gem(D.skill.gem)}" alt="">
      <figcaption>
        <em>${D.skill.damage} · ${D.skill.pop} of ladder</em>
        <h1 data-hero-name>${D.skill.name}</h1>
        <div class="w-stats" data-block="stats"><span>${num(D.skill.avg)}<em>avg</em></span><span>${num(D.skill.peak)}<em>peak</em></span></div>
      </figcaption>
    </figure>

    <div class="w-tiles" data-block="combos">
      ${D.combos.map((c) => `
        <button class="w-tile" data-combo data-label="${c.label}">
          <img src="${art.cluster(c.art)}" alt="">
          <b>${c.label}</b><em>${c.size} · ${c.builds} builds</em>
          <span class="w-pct">${c.pct}%</span>
        </button>`).join('')}
      <button class="w-tile small" data-combo data-label="Small clusters">
        <img src="${art.cluster('cluster_small')}" alt="">
        <b>Small clusters</b><em>2 builds · 9%</em><span class="w-pct">9%</span>
      </button>
    </div>

    <aside class="w-side" data-block="craft">
      <div class="w-skills">
        ${D.skills.slice(0, 3).map((s, i) => `<button class="w-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.name.split(' ')[0]}</span></button>`).join('')}
      </div>
      <div class="w-craft">
        <h5>Crafting</h5>
        <p data-craft-combo>Prism Weave + Snowstorm</p>
        <span>${D.craft.route} · ${D.craft.tries} · ${D.craft.cost}</span>
        <button class="w-sync wide" data-press>PLAN</button>
      </div>
    </aside>
  </div>
  <footer class="w-status" data-block="status"><span>Ready · 234 characters sampled</span><em>poe.ninja</em></footer>`;

/* ------------------------------------------------------------------ pieces */

function sizes() {
  return ['LARGE 13', 'MEDIUM 5', 'SMALL 2']
    .map((label) => `<button class="sz" data-size="${label.split(' ')[0].toLowerCase()}">${label}</button>`).join('');
}

function comboCard(c) {
  return `
    <button class="o-combo" data-combo data-label="${c.label}" data-cluster-size="${c.size}">
      <img src="${art.cluster(c.art)}" alt="">
      <span class="o-combody">
        <span class="o-combotop"><b>${c.label}</b><i>${c.pct}%</i></span>
        <em>${c.size} · ${c.passives} passives · ${c.builds} builds · ${c.avg} avg</em>
        ${bar(c.pct)}
      </span>
    </button>`;
}

function railCards() {
  return `
    <div class="o-card">
      <div class="o-cardhead"><span>Leading combination</span><b>68%</b></div>
      <div class="o-leader"><img src="${art.cluster('cluster_large')}" alt=""><div><b>Prism Weave + Snowstorm</b><em>15 of 22 builds · 41.2M avg</em></div></div>
    </div>
    <div class="o-card">
      <div class="o-cardhead"><span>Crafting</span><b>best route</b></div>
      <p class="o-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <div class="o-kv"><span>${D.craft.route}</span><b>${D.craft.tries}</b></div>
      <div class="o-kv"><span>cost</span><b>${D.craft.cost}</b></div>
    </div>
    <div class="o-card">
      <div class="o-cardhead"><span>Coverage</span><b>86%</b></div>
      <div class="o-cover"><span>Large</span>${bar(78)}</div>
      <div class="o-cover"><span>Medium</span>${bar(64)}</div>
      <div class="o-cover"><span>Small</span>${bar(22)}</div>
    </div>`;
}

/* ============================================================== the gallery */

const VARIANTS = [
  {
    id: 'obsidian', layout: 'obsidian', name: 'Obsidian Glass',
    intent: 'The shell we have, with real depth: glass cards, one green accent, light that moves on hover.',
    keeps: 'Continuity — nothing to relearn, and it already sits next to poe.ninja without shouting.',
    costs: 'The least surprising of the ten.',
    tags: ['sidebar', '3 columns', 'glass'],
    sw: ['#080c11', '#141d27', '#3fae7a', '#e8eef4', '#93a3b3'],
  },
  {
    id: 'codex', layout: 'codex', name: 'Codex',
    intent: 'A printed page: chapter ribbon, a contents column, entries with dotted leaders, marginalia for the craft.',
    keeps: 'The cluster jewel card already speaks this language, so the app would look like the game it reads.',
    costs: 'Warm paper fights poe.ninja comparisons; small serif needs a bigger base size.',
    tags: ['no cards', 'contents column', 'serif'],
    sw: ['#171310', '#241d16', '#c9a227', '#efe4d2', '#9a8a72'],
  },
  {
    id: 'terminal', layout: 'terminal', name: 'Terminal',
    intent: 'One table, one inspector, one command line. Monospace, rules, an amber cursor and a sync log.',
    keeps: 'Scans like a log — the fastest of the ten to read down a column.',
    costs: 'Hostile to art, and to anyone who does not live in a shell.',
    tags: ['table-first', 'monospace', 'inspector'],
    sw: ['#0a0b0a', '#101210', '#d69a3c', '#d8e0d4', '#7d8b7c'],
  },
  {
    id: 'sanctum', layout: 'sanctum', name: 'Sanctum',
    intent: 'Daylight: an icon rail, a picture-led hero, quiet cards and a soft accent.',
    keeps: 'Reads as professional software, and screenshots well in a README.',
    costs: 'PoE art is painted for dark backgrounds; every tile needs a dark frame to survive.',
    tags: ['light theme', 'picture-led', 'cards'],
    sw: ['#f5f7f9', '#ffffff', '#0f7a55', '#1a2430', '#5b6b7c'],
  },
  {
    id: 'ember', layout: 'ember', name: 'Ember',
    intent: 'Cinematic: a full-width banner, a filmstrip of builds under it, wide rows, glow only where it matters.',
    keeps: "PoE's own palette, and the biggest art of any direction here.",
    costs: 'Eats vertical space, and orange sits close to the unique-item colour.',
    tags: ['banner', 'filmstrip', 'wide rows'],
    sw: ['#0d0a09', '#1a1413', '#c2593a', '#f0e6e0', '#98837a'],
  },
  {
    id: 'atlas', layout: 'atlas', name: 'Atlas',
    intent: 'A dashboard: KPI strip, four widgets, a skill list that is a control rather than a picture.',
    keeps: 'Answers "what is the meta" without a click.',
    costs: 'No hero image — the art is reduced to icons.',
    tags: ['KPI strip', 'widgets', 'dense'],
    sw: ['#08110f', '#0f1c1a', '#2fa27a', '#e6f0ec', '#7f9c93'],
  },
  {
    id: 'brutalist', layout: 'brutalist', name: 'Brutalist',
    intent: 'A poster beside a strict table: giant type, hard rules, no radius, no gradients.',
    keeps: 'Unmistakable hierarchy, and it will still look deliberate in five years.',
    costs: 'A naked look next to poe.ninja, with no softness for long sessions.',
    tags: ['poster', '0 radius', 'big type'],
    sw: ['#000000', '#111111', '#e8ff3a', '#ffffff', '#8a8a8a'],
  },
  {
    id: 'prism', layout: 'prism', name: 'Prism',
    intent: 'A command palette over blurred art: results on the left, the build preview on the right.',
    keeps: 'Keyboard-first, and it feels like an overlay in a game rather than a website.',
    costs: 'Hides the rest of the app; blur costs frames on weak GPUs.',
    tags: ['palette', 'overlay', 'frosted'],
    sw: ['#070b16', '#111a2b', '#6f7bff', '#e9eefb', '#8f9ab5'],
  },
  {
    id: 'ledger', layout: 'ledger', name: 'Ledger',
    intent: 'Master, detail, craft: a skills table, its detail pane, and the craft pinned right.',
    keeps: 'The fastest way to compare skills; one selection, one surface.',
    costs: 'Less decorative — the art becomes thumbnails.',
    tags: ['master/detail', 'rules', 'tables'],
    sw: ['#0b0d10', '#12161b', '#4d9de0', '#e6ebf0', '#8b98a6'],
  },
  {
    id: 'trophy', layout: 'trophy', name: 'Trophy',
    intent: 'An art wall: a poster of the selected build beside painted tiles, numbers as captions.',
    keeps: 'You can recognise a build from across the room.',
    costs: 'Needs art for everything we will ever show, and wastes space.',
    tags: ['art wall', 'tiles', 'minimal text'],
    sw: ['#0a0a0c', '#141419', '#d8a24a', '#f2ece2', '#9c8f7c'],
  },
];

function variantSection(v, index) {
  const n = String(index + 1).padStart(2, '0');
  return `
    <section class="variant" id="${v.id}">
      <div class="v-head">
        <div class="v-num">${n}</div>
        <div class="v-copy">
          <h2>${v.name}</h2>
          <p>${v.intent}</p>
          <div class="v-tags">${v.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        </div>
        <div class="v-swatches">${v.sw.map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
      </div>
      <div class="v-frame"><div class="mock m-${v.id}" data-layout="${v.layout}">${L[v.layout]()}</div></div>
      <div class="v-notes">
        <div><b>Keeps</b><span>${v.keeps}</span></div>
        <div><b>Costs</b><span>${v.costs}</span></div>
      </div>
    </section>`;
}

/* ============================================================== interactions */

/**
 * The mocks answer: pick a skill, filter a size, choose a combination, walk the nav. Selecting a
 * skill rewrites the hero name, selecting a combination rewrites the crafting target — the same
 * hand-off the real app makes, shown so a direction can be judged by using it.
 */
function wireMock(mock) {
  const pickAll = (sel, el) => mock.querySelectorAll(sel).forEach((n) => n.classList.toggle('on', n === el));

  mock.addEventListener('click', (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    const nav = target.closest('[data-nav]');
    if (nav) { pickAll('[data-nav]', nav); return; }

    const size = target.closest('[data-size]');
    if (size) {
      pickAll('[data-size]', size);
      const want = (size.dataset.size || '').toLowerCase();
      mock.querySelectorAll('[data-combo][data-cluster-size]').forEach((row) => {
        row.classList.toggle('off', Boolean(want) && row.dataset.clusterSize.toLowerCase() !== want);
      });
      return;
    }

    const combo = target.closest('[data-combo]');
    if (combo) {
      pickAll('[data-combo]', combo);
      const name = (combo.dataset.label || '').trim();
      if (name) mock.querySelectorAll('[data-craft-combo]').forEach((el) => { el.textContent = name; });
      return;
    }

    const skill = target.closest('[data-pick]');
    if (skill) {
      pickAll('[data-pick]', skill);
      const name = (skill.dataset.label || '').trim();
      if (name) mock.querySelectorAll('[data-hero-name]').forEach((el) => { el.textContent = name; });
    }
  });
}

/** Bars grow from zero the first time a mock is on screen. */
function animateBars(mock) {
  if (typeof window.requestAnimationFrame !== 'function') { mock.classList.add('lit'); return; }
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => mock.classList.add('lit')));
}

function build() {
  document.getElementById('galList').innerHTML = VARIANTS.map(variantSection).join('');

  document.getElementById('galIndex').innerHTML = `
    <div class="idx-cap">The ten</div>
    ${VARIANTS.map((v, i) => `
      <a href="#${v.id}" data-target="${v.id}">
        <b>${String(i + 1).padStart(2, '0')}</b><span>${v.name}</span>
      </a>`).join('')}
    <div class="idx-foot">Hover and click inside any frame: skills, sizes and combinations all answer.</div>`;

  document.querySelectorAll('.gal-index a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.target);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.querySelectorAll('.mock').forEach((mock) => { wireMock(mock); animateBars(mock); });

  document.querySelectorAll('.v-frame').forEach((frame) => {
    const btn = document.createElement('button');
    btn.className = 'frame-zoom';
    btn.type = 'button';
    btn.textContent = '1:1';
    btn.addEventListener('click', () => {
      const full = frame.classList.toggle('full');
      btn.textContent = full ? 'fit' : '1:1';
      fitFrames();
    });
    frame.appendChild(btn);
  });

  fitFrames();
  window.addEventListener('resize', fitFrames);
  observeSections();
}

function fitFrames() {
  document.querySelectorAll('.v-frame').forEach((frame) => {
    const mock = frame.firstElementChild;
    if (!mock || !mock.classList || !frame.clientWidth) return;
    if (frame.classList.contains('full')) { mock.style.transform = 'none'; return; }
    const scale = Math.min(1, frame.clientWidth / 1280);
    mock.style.transform = `scale(${scale})`;
    frame.style.height = `${Math.round(720 * scale)}px`;
  });
}

function observeSections() {
  if (typeof IntersectionObserver === 'undefined') return;

  const sections = document.querySelectorAll('.variant');
  const links = new Map([...document.querySelectorAll('.gal-index a')].map((a) => [a.dataset.target, a]));

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.remove('on'));
      const link = links.get(entry.target.id);
      if (link) link.classList.add('on');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach((s) => io.observe(s));
}

build();
