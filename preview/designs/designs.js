/*
 * Ten design directions for Forever Exiled — ten layouts, not ten skins.
 *
 * Every mock shows the same screen (Winter Orb, its three combinations, the crafting card, the
 * same sampling numbers) so the comparison is fair. Each one is built from its own markup:
 *
 *   01 Obsidian   bento cockpit, art-led hero tile
 *   02 Codex      editorial spread, cream paper, serif display
 *   03 Terminal   market terminal: tape, table, instrument panel
 *   04 Sanctum    light product UI: sidebar, page header, toolbar
 *   05 Ember      cinematic full-bleed hero, glass cards
 *   06 Atlas      treemap of the meta, area-encoded
 *   07 Brutalist  Swiss poster on paper, inverted blocks
 *   08 Prism      command palette over blurred art
 *   09 Ledger     dense master/detail tables, sortable-looking
 *   10 Trophy     art wall with a framed plate
 *
 * The mocks answer: pick a skill, filter a size, choose a combination, walk the nav.
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
    { gem: 'winter_orb', asc: 'occultist', name: 'Winter Orb', short: 'Winter Orb', dmg: 'Cold', dps: '145M', pop: '20.5' },
    { gem: 'molten_strike_of_the_zenith', asc: 'pathfinder', name: 'Molten Strike of the Zenith', short: 'Molten Strike', dmg: 'Fire', dps: '128M', pop: '17.8' },
    { gem: 'righteous_fire', asc: 'champion', name: 'Righteous Fire', short: 'Righteous Fire', dmg: 'Fire', dps: '96M', pop: '12.3' },
    { gem: 'lightning_strike', asc: 'deadeye', name: 'Lightning Strike', short: 'Lightning Strike', dmg: 'Lightning', dps: '88M', pop: '9.6' },
    { gem: 'hexblast', asc: 'occultist', name: 'Hexblast', short: 'Hexblast', dmg: 'Chaos', dps: '74M', pop: '6.1' },
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

const bar = (pct) => `<span class="bar" style="--pct:${pct}%"><i></i></span>`;
const stat = (label, value) => `<div class="stat"><em>${label}</em><b class="num">${value}</b></div>`;
const navLinks = (cls) => D.nav.map((n, i) => `<a class="${cls}${i === 0 ? ' on' : ''}" data-nav>${n}</a>`).join('');
const sizeChips = () => ['LARGE 13', 'MEDIUM 5', 'SMALL 2']
  .map((l) => `<button class="sz" data-size="${l.split(' ')[0].toLowerCase()}">${l}</button>`).join('');

/* ============================================================== the layouts */

const L = {};

/* ── 01 · OBSIDIAN — bento cockpit ─────────────────────────────────────────── */
L.obsidian = () => `
  <header class="o-bar">
    <div class="o-logo"><img src="${A}/logo.png" alt=""><span>FOREVER EXILED</span></div>
    <nav class="o-tabs">${navLinks('')}</nav>
    <div class="o-find"><i></i><span>Search skill, class or damage</span><kbd>⌘K</kbd></div>
    <button class="o-sync" data-press>SYNC</button>
  </header>

  <div class="o-bento">
    <section class="o-hero">
      <img class="o-heroart" src="${art.asc(D.skill.asc)}" alt="">
      <div class="o-herobody">
        <p class="o-kicker"><span class="o-dot"></span>Cluster Jewels · Lab</p>
        <div class="o-title">
          <img class="o-gem" src="${art.gem(D.skill.gem)}" alt="">
          <h1 data-hero-name>${D.skill.name}</h1>
        </div>
        <p class="o-sub">${D.skill.damage} · ${D.skill.classes}</p>
        <ul class="o-meta">
          <li>${D.skill.builds} builds</li><li>${D.skill.pop} of ladder</li><li>${D.skill.sampled} sampled</li>
        </ul>
      </div>
      <div class="o-herostats" data-stats>
        ${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}
      </div>
    </section>

    <div class="o-metrics">
      <div class="o-metric">
        <em>LEADING COMBINATION</em>
        <b class="o-big">68<span>%</span></b>
        <span class="o-metricsub">Prism Weave + Snowstorm · 15 of 22 builds</span>
        ${bar(68)}
      </div>
      <div class="o-metric">
        <em>JEWELS INDEXED</em>
        <b class="o-big">592</b>
        <span class="o-metricsub">across 234 characters · 18 skills</span>
        <div class="o-spark">${[32, 48, 40, 62, 55, 74, 68, 88, 80, 96].map((h) => `<i style="height:${h}%"></i>`).join('')}</div>
      </div>
    </div>

    <section class="o-combos">
      <header class="o-sechead">
        <h2>Combinations</h2>
        <div class="o-sizes">${sizeChips()}</div>
      </header>
      <div class="o-cards">
        ${D.combos.map((c) => `
          <button class="o-combo" data-combo data-label="${c.label}" data-cluster-size="${c.size}">
            <img src="${art.cluster(c.art)}" alt="">
            <b>${c.label}</b>
            <em>${c.size} · ${c.passives} passives · ${c.builds} builds</em>
            <span class="o-pct">${c.pct}%</span>
            ${bar(c.pct)}
          </button>`).join('')}
      </div>
    </section>

    <section class="o-craft">
      <header class="o-sechead"><h2>Craft</h2><span>best route</span></header>
      <p class="o-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <dl class="o-kv">
        <dt>Method</dt><dd>${D.craft.route}</dd>
        <dt>Tries</dt><dd>${D.craft.tries}</dd>
        <dt>Cost</dt><dd>${D.craft.cost}</dd>
        <dt>Match</dt><dd>${D.craft.match}</dd>
      </dl>
      <button class="o-plan" data-press>Plan the craft →</button>
    </section>

    <section class="o-rail">
      <header class="o-sechead"><h2>Main skills</h2><span>18 above 1%</span></header>
      <div class="o-skilllist">
        ${D.skills.map((s, i) => `
          <button class="o-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
            <img src="${art.gem(s.gem)}" alt="">
            <span class="o-skilltxt"><b>${s.name}</b><em>${s.dmg} · ${s.pop}% of ladder</em></span>
            <i class="o-dps">${s.dps}</i>
          </button>`).join('')}
      </div>
    </section>
  </div>

  <footer class="o-status" data-status><span>Ready · 234 characters sampled · snapshot demo-2026-11-07</span><span>DATA · POE.NINJA BUILD API</span></footer>`;

/* ── 02 · CODEX — editorial spread ─────────────────────────────────────────── */
L.codex = () => `
  <header class="c-masthead">
    <span class="c-rule"></span>
    <div class="c-mastheadrow">
      <span class="c-word">Forever Exiled</span>
      <span class="c-edition">Catalogue of the ladder · No. 9</span>
      <nav class="c-nav">${navLinks('')}</nav>
    </div>
    <span class="c-rule"></span>
  </header>

  <div class="c-spread">
    <section class="c-plate">
      <figure class="c-figure">
        <img class="c-art" src="${art.cluster('cluster_large')}" alt="">
        <img class="c-gem" src="${art.gem(D.skill.gem)}" alt="">
      </figure>
      <figcaption class="c-caption">Plate I — Winter Orb socketed, Large cluster, 12 passives.</figcaption>
      <dl class="c-facts">
        <dt>Damage</dt><dd>${D.skill.damage}</dd>
        <dt>Classes</dt><dd>${D.skill.classes}</dd>
        <dt>Builds</dt><dd>${D.skill.builds} · ${D.skill.pop}</dd>
        <dt>Sampled</dt><dd>${D.skill.sampled}</dd>
      </dl>
      <div class="c-platestats" data-stats>
        ${stat('Average DPS', D.skill.avg)}${stat('Peak DPS', D.skill.peak)}
      </div>

      <div class="c-also">
        <h4>Also in this chapter</h4>
        ${D.skills.map((s, i) => `
          <button class="c-also-row${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
            <img src="${art.gem(s.gem)}" alt="">
            <span class="c-alsoname">${s.name}</span>
            <span class="c-alsodots"></span>
            <span class="c-alsopop">${s.pop}%</span>
          </button>`).join('')}
      </div>
    </section>

    <section class="c-story">
      <p class="c-kicker">Chapter I · The cold that keeps</p>
      <h1 data-hero-name>${D.skill.name}</h1>
      <p class="c-standfirst">One skill holds a fifth of the ladder, and the jewel that carries it is a
        Large cluster with a very particular three notables.</p>
      <p class="c-body"><span class="c-dropcap">T</span>he ladder is unusually settled this league. Winter
        Orb builds are not chasing a new interaction; they are buying time, and the cluster jewel is
        where that time is bought. Of the ${D.skill.sampled} characters sampled, ${D.skill.builds}
        carry the skill and most of them run the same combination.</p>

      <div class="c-index">
        <h3>Combinations, in order of use</h3>
        ${D.combos.map((c, i) => `
          <button class="c-entry" data-combo data-label="${c.label}">
            <span class="c-numeral">${['I', 'II', 'III'][i]}</span>
            <span class="c-entryname">${c.label}</span>
            <span class="c-dots"></span>
            <span class="c-entrypct">${c.pct}%</span>
            <span class="c-entrysize">${c.size} · ${c.passives}p</span>
          </button>`).join('')}
      </div>

      <div class="c-footnote">
        <span class="c-fnmark">*</span>
        <p>To roll <b data-craft-combo>Prism Weave + Snowstorm</b>: ${D.craft.route}, ${D.craft.tries}
          attempts, ${D.craft.cost} in currency. ${D.craft.match} of the seven desired modifiers.</p>
        <button class="c-action" data-press>Open the recipe</button>
      </div>
    </section>
  </div>

  <footer class="c-folio" data-status><span>Ready · 234 characters read</span><span>9</span><span>poe.ninja · synthetic sample</span></footer>`;

/* ── 03 · TERMINAL — market terminal ───────────────────────────────────────── */
L.terminal = () => `
  <header class="t-bar">
    <span class="t-mark">FE<span>/</span>TERM</span>
    <nav class="t-tabs">${navLinks('')}</nav>
    <span class="t-clock">ALLFLAME · LIVE 12:07</span>
    <button class="t-sync" data-press>SYNC</button>
  </header>

  <div class="t-body">
    <section class="t-market">
      <div class="t-thead">
        <span>#</span><span>SKILL</span><span>SHARE</span><span>AVG DPS</span><span>PEAK</span><span>Δ 7D</span>
      </div>
      ${D.skills.map((s, i) => `
        <button class="t-row${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
          <span class="t-i">${String(i + 1).padStart(2, '0')}</span>
          <span class="t-name"><img src="${art.gem(s.gem)}" alt="">${s.name}</span>
          <span class="t-share">${s.pop}<em>%</em></span>
          <span>${s.dps}</span>
          <span class="t-peak">${s.dps}</span>
          <span class="${i === 0 ? 't-up' : i % 2 ? 't-dn' : 't-flat'}">${i === 0 ? '+2.4' : i % 2 ? '-0.8' : '0.0'}</span>
        </button>`).join('')}
      <div class="t-summary">
        <span>5 of 18 skills · floor 1.0%</span>
        <span>share total <b>66.3%</b></span>
        <span>sampled <b>234</b> characters</span>
      </div>
    </section>

    <aside class="t-panel">
      <div class="t-symbol">
        <img src="${art.gem(D.skill.gem)}" alt="">
        <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.classes}</p></div>
      </div>
      <div class="t-quote" data-stats>
        ${stat('AVG', D.skill.avg)}${stat('PEAK', D.skill.peak)}
      </div>
      <div class="t-chart">${[38, 52, 46, 64, 58, 72, 70, 84, 78, 92, 88, 100].map((h, i) => `<i style="height:${h}%" class="${i > 8 ? 'hot' : ''}"></i>`).join('')}</div>
      <p class="t-chartcap">peak DPS over the last twelve snapshots</p>

      <div class="t-combos">
        <p class="t-cap">COMBINATIONS · 3</p>
        ${D.combos.map((c) => `
          <button class="t-combo" data-combo data-label="${c.label}">
            <span class="t-cname">${c.label}</span><span class="t-cpct">${c.pct}%</span>${bar(c.pct)}
          </button>`).join('')}
      </div>

      <div class="t-ticket">
        <p class="t-cap">CRAFT TICKET</p>
        <p class="t-target" data-craft-combo>Prism Weave + Snowstorm</p>
        <div class="t-kv"><span>method</span><b>${D.craft.route}</b></div>
        <div class="t-kv"><span>tries</span><b>${D.craft.tries}</b></div>
        <div class="t-kv"><span>cost</span><b>${D.craft.cost}</b></div>
      </div>
    </aside>
  </div>

  <footer class="t-tape" data-status>
    <span class="t-tapelabel">TAPE</span>
    <div class="t-tapebody">
      <span>WINTER ORB 20.5% ▲2.4</span><span>MOLTEN STRIKE 17.8% ▼0.8</span><span>RIGHTEOUS FIRE 12.3% ▲0.3</span>
      <span>LIGHTNING STRIKE 9.6% ▲1.1</span><span>HEXBLAST 6.1% ▼0.2</span><span>234 CHARACTERS · 592 JEWELS</span>
    </div>
  </footer>`;

/* ── 04 · SANCTUM — light product UI ───────────────────────────────────────── */
L.sanctum = () => `
  <aside class="s-sidebar">
    <div class="s-work">
      <img src="${A}/logo.png" alt="">
      <span><b>Forever Exiled</b><em>Allflame · PoE 1</em></span>
      <i class="s-caret"></i>
    </div>
    <p class="s-group">Analysis</p>
    ${D.nav.map((n, i) => `
      <a class="s-nav${i === 0 ? ' on' : ''}" data-nav><i class="s-ico"></i><span>${n}</span>${i === 0 ? '<em class="s-count">18</em>' : ''}</a>`).join('')}
    <p class="s-group">Workspace</p>
    <a class="s-nav" data-nav><i class="s-ico"></i><span>Settings</span></a>
    <a class="s-nav" data-nav><i class="s-ico"></i><span>Snapshots</span></a>
    <div class="s-user"><span class="s-avatar">EX</span><span><b>Exile</b><em>demo-2026-11-07</em></span></div>
  </aside>

  <div class="s-page">
    <header class="s-head">
      <div>
        <p class="s-crumb">Cluster Jewels <span>/</span> Lab</p>
        <h1>Cluster Jewels</h1>
        <p class="s-lede">18 skills above the popularity floor, ranked by average DPS.</p>
      </div>
      <div class="s-headactions">
        <div class="s-search"><i></i><span>Search</span></div>
        <button class="s-ghost" data-press>Export</button>
        <button class="s-primary" data-press>Sync ladder</button>
      </div>
    </header>

    <div class="s-toolbar">
      <div class="s-views"><button class="s-view on" data-press>Lab</button><button class="s-view" data-press>Meta</button><button class="s-view" data-press>Ladder</button></div>
      <span class="s-divider"></span>
      <div class="s-sizes">${sizeChips()}</div>
      <span class="s-toolhint">13 of 24 builds sampled</span>
    </div>

    <div class="s-content">
      <section class="s-maincard">
        <div class="s-artstrip">
          <img src="${art.asc(D.skill.asc)}" alt="">
          <div class="s-artcopy">
            <p class="s-badge">${D.skill.damage}</p>
            <div class="s-titlerow">
              <img src="${art.gem(D.skill.gem)}" alt="">
              <h2 data-hero-name>${D.skill.name}</h2>
            </div>
            <p class="s-metarow">${D.skill.builds} builds · ${D.skill.pop} of the ladder · ${D.skill.classes}</p>
          </div>
          <div class="s-cards" data-stats>
            ${stat('Average DPS', D.skill.avg)}${stat('Peak DPS', D.skill.peak)}
          </div>
        </div>
        <div class="s-combos">
          <div class="s-combohead"><span>Combination</span><span>Size</span><span>Builds</span><span>Share</span></div>
          ${D.combos.map((c) => `
            <button class="s-combo" data-combo data-label="${c.label}" data-cluster-size="${c.size}">
              <span class="s-cname"><img src="${art.cluster(c.art)}" alt="">${c.label}</span>
              <span>${c.size}</span><span>${c.builds}</span>
              <span class="s-cpct">${c.pct}%</span>
            </button>`).join('')}
        </div>
      </section>

      <aside class="s-rail">
        <section class="s-panel">
          <header><h3>Crafting</h3><span>best route</span></header>
          <p class="s-target" data-craft-combo>Prism Weave + Snowstorm</p>
          <ul class="s-steps">
            <li><i>1</i><span>${D.craft.route}</span><b>${D.craft.tries}</b></li>
            <li><i>2</i><span>Cost per try</span><b>${D.craft.cost}</b></li>
            <li><i>3</i><span>Mods matched</span><b>${D.craft.match}</b></li>
          </ul>
          <button class="s-primary wide" data-press>Open crafting</button>
        </section>
        <section class="s-panel">
          <header><h3>Skills</h3><span>by share</span></header>
          <div class="s-skills">
            ${D.skills.map((s, i) => `<button class="s-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span><b>${s.pop}%</b></button>`).join('')}
          </div>
        </section>
      </aside>
    </div>

    <footer class="s-status" data-status><span>Ready · 234 characters sampled · 592 jewels</span><span>poe.ninja build API</span></footer>
  </div>`;

/* ── 05 · EMBER — cinematic hero ───────────────────────────────────────────── */
L.ember = () => `
  <img class="e-backdrop" src="${art.asc(D.skill.asc)}" alt="">
  <div class="e-shade"></div>

  <header class="e-nav">
    <span class="e-brand"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav>${navLinks('')}</nav>
    <button class="e-sync" data-press>Sync ladder</button>
  </header>

  <section class="e-hero">
    <div class="e-copy">
      <p class="e-kicker"><span></span>Cluster Jewels · Large</p>
      <div class="e-titlerow">
        <img class="e-gem" src="${art.gem(D.skill.gem)}" alt="">
        <h1 data-hero-name>${D.skill.name}</h1>
      </div>
      <p class="e-sub">${D.skill.damage} damage · ${D.skill.classes}</p>
      <div class="e-stats" data-stats>
        ${stat('Average DPS', D.skill.avg)}${stat('Peak DPS', D.skill.peak)}
        <div class="stat"><em>Builds</em><b class="val">${D.skill.builds}</b></div>
      </div>
    </div>
    <aside class="e-craft">
      <p class="e-craftcap">Crafting route</p>
      <p class="e-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <div class="e-kv"><span>Method</span><b>${D.craft.route}</b></div>
      <div class="e-kv"><span>Tries</span><b>${D.craft.tries}</b></div>
      <div class="e-kv"><span>Cost</span><b>${D.craft.cost}</b></div>
      <button class="e-plan" data-press>Plan it</button>
    </aside>
  </section>

  <section class="e-strip">
    ${D.combos.map((c) => `
      <button class="e-card" data-combo data-label="${c.label}">
        <img src="${art.cluster(c.art)}" alt="">
        <span class="e-cardbody">
          <b>${c.label}</b>
          <em>${c.size} · ${c.passives} passives · ${c.builds} builds · ${c.avg} avg</em>
          ${bar(c.pct)}
        </span>
        <span class="e-cardpct">${c.pct}%</span>
      </button>`).join('')}
    <div class="e-switcher">
      ${D.skills.slice(0, 4).map((s, i) => `<button class="e-pill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}
    </div>
  </section>

  <footer class="e-status" data-status><span>Ready · 234 characters sampled</span><span>snapshot demo-2026-11-07</span></footer>`;

/* ── 06 · ATLAS — treemap of the meta ─────────────────────────────────────── */
L.atlas = () => `
  <header class="a-bar">
    <span class="a-mark">ATLAS</span>
    <nav class="a-tabs">${navLinks('')}</nav>
    <span class="a-legend"><i></i>share of ladder</span>
    <button class="a-sync" data-press>Sync</button>
  </header>

  <div class="a-body">
    <section class="a-map">
      <div class="a-maptop">
        <h2>Meta by popularity</h2>
        <p>area = share of the ladder · 18 skills above 1%</p>
      </div>
      <div class="a-cells">
        ${D.skills.map((s, i) => `
          <button class="a-cell${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" style="--w:${s.pop}">
            <img src="${art.gem(s.gem)}" alt="">
            <span class="a-cellname">${s.short}</span>
            <span class="a-cellpop">${s.pop}%</span>
            <span class="a-cellbar">${bar(Number(s.pop) * 4)}</span>
          </button>`).join('')}
      </div>
      <div class="a-axis"><span>20.5%</span><span>17.8%</span><span>12.3%</span><span>9.6%</span><span>6.1%</span></div>
    </section>

    <aside class="a-detail">
      <div class="a-detailhead">
        <div class="a-title">
          <img src="${art.gem(D.skill.gem)}" alt="">
          <h1 data-hero-name>${D.skill.name}</h1>
        </div>
        <p class="a-sub">${D.skill.damage} · ${D.skill.builds} builds · ${D.skill.sampled} sampled</p>
        <div class="a-stats" data-stats>
          ${stat('AVG DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}
        </div>
      </div>

      <div class="a-clusters">
        <p class="a-cap">COMBINATIONS BY SHARE</p>
        ${D.combos.map((c) => `
          <button class="a-combo" data-combo data-label="${c.label}">
            <span class="a-comboline">
              <img src="${art.cluster(c.art)}" alt="">
              <span class="a-comboname">${c.label}</span>
              <span class="a-combodots"><i class="${c.size === 'Large' ? 'lg' : 'md'}"></i>${c.size} · ${c.passives}p</span>
              <span class="a-combopct">${c.pct}%</span>
            </span>
            ${bar(c.pct)}
          </button>`).join('')}
      </div>

      <div class="a-craft">
        <p class="a-cap">CRAFTING</p>
        <p class="a-target" data-craft-combo>Prism Weave + Snowstorm</p>
        <div class="a-rows">
          <span>${D.craft.route}</span><b>${D.craft.tries}</b>
          <span>Cost</span><b>${D.craft.cost}</b>
          <span>Match</span><b>${D.craft.match}</b>
        </div>
        <button class="a-plan" data-press>Plan the craft</button>
      </div>
    </aside>
  </div>

  <footer class="a-status" data-status><span>Ready · 234 characters · 592 jewels · 34 combinations</span><span>POE.NINJA</span></footer>`;

/* ── 07 · BRUTALIST — Swiss poster ────────────────────────────────────────── */
L.brutalist = () => `
  <header class="b-bar">
    <span class="b-mark">FOREVER EXILED</span>
    <nav class="b-nav">${navLinks('')}</nav>
    <button class="b-sync" data-press>SYNC NOW</button>
  </header>

  <div class="b-grid">
    <section class="b-poster">
      <p class="b-kicker">Cluster Jewels / Lab</p>
      <div class="b-titlerow">
        <img src="${art.gem(D.skill.gem)}" alt="">
        <h1 data-hero-name>${D.skill.name}</h1>
      </div>
      <p class="b-meta">${D.skill.damage} — ${D.skill.classes}<br>${D.skill.builds} builds — ${D.skill.pop} of the ladder</p>
      <div class="b-numbers" data-stats>
        ${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}
      </div>
      <figure class="b-plate"><img src="${art.cluster('cluster_large')}" alt=""></figure>
      <div class="b-skills">
        ${D.skills.map((s, i) => `<button class="b-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><span>${String(i + 1).padStart(2, '0')}</span><img src="${art.gem(s.gem)}" alt="">${s.short}</button>`).join('')}
      </div>
    </section>

    <section class="b-sheet">
      <div class="b-sheethead"><span>Combinations</span><span>Builds</span><span>Share</span></div>
      ${D.combos.map((c, i) => `
        <button class="b-row" data-combo data-label="${c.label}">
          <span class="b-rowname"><i>${i + 1}</i>${c.label}</span>
          <span class="b-rowbuilds">${c.builds}</span>
          <span class="b-rowpct">${c.pct}%</span>
          <span class="b-rowbar">${bar(c.pct)}</span>
        </button>`).join('')}

      <div class="b-invert">
        <p class="b-invertcap">Crafting route</p>
        <p class="b-target" data-craft-combo>Prism Weave + Snowstorm</p>
        <div class="b-invertrow"><span>${D.craft.route}</span><b>${D.craft.tries}</b><b>${D.craft.cost}</b></div>
        <button class="b-plan" data-press>PLAN →</button>
      </div>
    </section>
  </div>

  <footer class="b-foot" data-status><span>READY — 234 CHARACTERS — 592 JEWELS</span><span>SNAPSHOT 2026-11-07</span></footer>`;

/* ── 08 · PRISM — command palette (enhanced) ──────────────────────────────── */
L.prism = () => `
  <div class="p-backdrop">
    <img class="p-blur one" src="${art.cluster('cluster_large')}" alt="">
    <img class="p-blur two" src="${art.asc(D.skill.asc)}" alt="">
  </div>
  <div class="p-bloom"></div>

  <nav class="p-nav">
    ${navLinks('')}
    <button class="p-sync" data-press>Sync</button>
  </nav>

  <div class="p-palette">
    <div class="p-field">
      <svg class="p-glass" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6"></circle><path d="M10.5 10.5 L14 14"></path></svg>
      <span class="p-query" data-hero-name>Winter Orb</span>
      <span class="p-cursor"></span>
      <span class="p-scope">
        ${D.skills.slice(0, 3).map((s, i) => `<button class="p-scopegem${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}
      </span>
      <kbd>⌘K</kbd>
    </div>

    <div class="p-cols">
      <div class="p-results">
        <p class="p-cap">Builds &amp; combinations <span>3 results</span></p>
        ${D.combos.map((c, i) => `
          <button class="p-result${i === 0 ? ' on' : ''}" data-combo data-label="${c.label}">
            <img src="${art.cluster(c.art)}" alt="">
            <span class="p-rname">${c.label}<em>${c.size} cluster · ${c.passives} passives · ${c.builds} builds</em></span>
            <span class="p-rpct">${c.pct}%</span>
            <span class="p-enter">↵</span>
          </button>`).join('')}
        <p class="p-recentcap">Recent</p>
        <div class="p-recent">
          <span>Cluster Jewels · Lab</span><span>Meta · 18 skills</span><span>Ladder · 234 characters</span>
        </div>
      </div>

      <div class="p-preview">
        <div class="p-art">
          <img class="p-artimg" src="${art.asc(D.skill.asc)}" alt="">
          <img class="p-gem" src="${art.gem(D.skill.gem)}" alt="">
          <span class="p-badge">${D.skill.damage}</span>
        </div>
        <h3 data-hero-name>${D.skill.name}</h3>
        <p class="p-meta">${D.skill.classes}</p>
        <div class="p-stats" data-stats>
          ${stat('AVG', D.skill.avg)}${stat('PEAK', D.skill.peak)}
        </div>
        <div class="p-craft">
          <p class="p-craftcap">Crafting</p>
          <p class="p-target" data-craft-combo>Prism Weave + Snowstorm</p>
          <span>${D.craft.route} · ${D.craft.tries} · ${D.craft.cost}</span>
        </div>
      </div>
    </div>

    <div class="p-hints">
      <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
      <span><kbd>↵</kbd> open</span>
      <span><kbd>⇥</kbd> scope</span>
      <span><kbd>esc</kbd> dismiss</span>
      <span class="p-hintright">234 characters · 592 jewels · 34 combinations</span>
    </div>
  </div>

  <footer class="p-status" data-status><span>Ready · 234 characters sampled</span><span>⌘K to search anything</span></footer>`;

/* ── 09 · LEDGER — dense master/detail ────────────────────────────────────── */
L.ledger = () => `
  <header class="l-bar">
    <span class="l-mark"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav class="l-tabs">${navLinks('')}</nav>
    <div class="l-search"><i></i>Filter skills, jewels, mods</div>
    <button class="l-icon" data-press>⋯</button>
    <button class="l-sync" data-press>SYNC</button>
  </header>

  <div class="l-panes">
    <section class="l-master">
      <div class="l-masterhead"><span>Skill</span><span>Share</span><span>DPS</span></div>
      ${D.skills.map((s, i) => `
        <button class="l-row${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
          <span class="l-name"><img src="${art.gem(s.gem)}" alt="">${s.short}</span>
          <span class="l-share">${s.pop}<i>%</i></span>
          <span class="l-dps">${s.dps}</span>
        </button>`).join('')}
      <div class="l-masterfoot"><span>18 skills</span><span>1% floor</span></div>
    </section>

    <section class="l-detail">
      <div class="l-detailhead">
        <div class="l-title">
          <img src="${art.gem(D.skill.gem)}" alt="">
          <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.classes} · ${D.skill.sampled} sampled</p></div>
        </div>
        <div class="l-detailstats" data-stats>
          ${stat('AVERAGE', D.skill.avg)}${stat('PEAK', D.skill.peak)}
        </div>
      </div>

      <div class="l-table">
        <div class="l-thead"><span>Combination</span><span>Size</span><span>Builds</span><span>Share</span><span>Avg DPS</span></div>
        ${D.combos.map((c) => `
          <button class="l-crow" data-combo data-label="${c.label}">
            <span class="l-cname"><img src="${art.cluster(c.art)}" alt="">${c.label}</span>
            <span class="l-csize">${c.size}</span>
            <span>${c.builds}</span>
            <span class="l-cshare">${c.pct}%</span>
            <span>${c.avg}</span>
          </button>`).join('')}
        <div class="l-tablefoot">3 of 34 combinations · ranked by builds running them</div>
      </div>

      <div class="l-dist">
        <p class="l-cap">Builds by cluster size</p>
        <div class="l-bars">
          <div><span>Large</span><i style="--w:78%"></i><b>13</b></div>
          <div><span>Medium</span><i style="--w:64%"></i><b>5</b></div>
          <div><span>Small</span><i style="--w:22%"></i><b>2</b></div>
        </div>
      </div>
    </section>

    <aside class="l-side">
      <div class="l-craft">
        <p class="l-cap">Crafting</p>
        <p class="l-target" data-craft-combo>Prism Weave + Snowstorm</p>
        <ol class="l-steps">
          <li><em>Method</em><b>${D.craft.route}</b></li>
          <li><em>Tries</em><b>${D.craft.tries}</b></li>
          <li><em>Cost</em><b>${D.craft.cost}</b></li>
          <li><em>Match</em><b>${D.craft.match}</b></li>
        </ol>
        <button class="l-plan" data-press>Plan</button>
      </div>
      <div class="l-sample">
        <p class="l-cap">Snapshot</p>
        <dl>
          <dt>Characters</dt><dd>234</dd>
          <dt>Jewels</dt><dd>592</dd>
          <dt>League</dt><dd>Allflame</dd>
          <dt>Built</dt><dd>2026-11-07</dd>
        </dl>
      </div>
    </aside>
  </div>

  <footer class="l-status" data-status><span>Ready · 234 characters · 592 jewels</span><span>↑↓ select · ⌘K search · ⌘R sync</span></footer>`;

/* ── 10 · TROPHY — art wall (enhanced) ────────────────────────────────────── */
L.trophy = () => `
  <nav class="w-nav">
    <span class="w-brand"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav class="w-links">${navLinks('')}</nav>
    <button class="w-sync" data-press>SYNC</button>
  </nav>

  <div class="w-wall">
    <figure class="w-plate">
      <div class="w-frame">
        <img class="w-arte" src="${art.cluster('cluster_large')}" alt="">
        <img class="w-gem" src="${art.gem(D.skill.gem)}" alt="">
      </div>
      <figcaption>
        <p class="w-kicker">${D.skill.damage} · ${D.skill.pop} of the ladder</p>
        <h1 data-hero-name>${D.skill.name}</h1>
        <p class="w-sub">${D.skill.classes}</p>
        <div class="w-platestats" data-stats>
          ${stat('Average', D.skill.avg)}${stat('Peak', D.skill.peak)}
        </div>
      </figcaption>
    </figure>

    <div class="w-tiles">
      ${D.combos.map((c) => `
        <button class="w-tile" data-combo data-label="${c.label}">
          <img src="${art.cluster(c.art)}" alt="">
          <span class="w-tilebody">
            <b>${c.label}</b>
            <em>${c.size} · ${c.passives} passives · ${c.builds} builds</em>
          </span>
          <span class="w-pct">${c.pct}%</span>
        </button>`).join('')}
      <button class="w-tile small" data-combo data-label="Small clusters">
        <img src="${art.cluster('cluster_small')}" alt="">
        <span class="w-tilebody"><b>Small clusters</b><em>2 builds · 9%</em></span>
        <span class="w-pct">9%</span>
      </button>
    </div>

    <aside class="w-side">
      <p class="w-cap">On the wall</p>
      <div class="w-skills">
        ${D.skills.slice(0, 4).map((s, i) => `<button class="w-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}
      </div>
      <div class="w-craft">
        <p class="w-cap">Crafting</p>
        <p class="w-target" data-craft-combo>Prism Weave + Snowstorm</p>
        <span class="w-craftmeta">${D.craft.route} · ${D.craft.tries} · ${D.craft.cost}</span>
        <button class="w-plan" data-press>Plan</button>
      </div>
    </aside>
  </div>

  <footer class="w-status" data-status><span>Ready · 234 characters sampled · 592 jewels on the wall</span><span>poe.ninja</span></footer>`;

/* ============================================================== the gallery */

const VARIANTS = [
  {
    id: 'obsidian', name: 'Obsidian', tag: 'Bento cockpit',
    intent: 'A twelve-column bento: one art-led hero tile, two metric tiles, then combinations, craft and the skill rail. Nothing is a list that could be a tile.',
    keeps: 'The most familiar of the ten — same nav, same numbers — but with a focal point instead of a wall of panels.',
    costs: 'Tiles fix the proportions; a very long combination name has to truncate.',
    tags: ['bento', 'art hero', 'sidebar-less'],
    sw: ['#080b10', '#101822', '#3ddc97', '#e9eff5', '#8b9daf'],
  },
  {
    id: 'codex', name: 'Codex', tag: 'Editorial spread',
    intent: 'A catalogue page: masthead, plate with caption, a serif display headline, a drop cap, combinations as a numbered index and the recipe as a footnote.',
    keeps: 'The cluster jewel card already speaks this language, so the app would look like the game it reads.',
    costs: 'A serif UI is unusual for tooling, and the drop cap has to earn its space.',
    tags: ['paper', 'serif', 'no cards'],
    sw: ['#f4efe4', '#fbf7ee', '#8c2f24', '#1d1a15', '#6b6252'],
  },
  {
    id: 'terminal', name: 'Terminal', tag: 'Market terminal',
    intent: 'A trading terminal: a dense tape-style table, an instrument panel with the quote, a sparkline, a ticket, and a scrolling tape along the bottom.',
    keeps: 'The fastest way to compare skills down a column, and it looks like it means business.',
    costs: 'Monospace everywhere limits how much art can be shown.',
    tags: ['tape', 'sparkline', 'monospace'],
    sw: ['#070b0a', '#0c1211', '#26d07c', '#d7e2dd', '#6f8378'],
  },
  {
    id: 'sanctum', name: 'Sanctum', tag: 'Light product UI',
    intent: 'A real desktop app in daylight: workspace sidebar, page header with actions, a toolbar with tabs, a picture-led card and a detail rail.',
    keeps: 'Reads as professional software at a glance and screenshots well in a README.',
    costs: 'PoE art is painted dark; every picture needs a dark frame to survive on white.',
    tags: ['light', 'sidebar', 'product'],
    sw: ['#f6f7fb', '#ffffff', '#4f46e5', '#101828', '#667085'],
  },
  {
    id: 'ember', name: 'Ember', tag: 'Cinematic hero',
    intent: 'Full-bleed splash art, a huge title over the grade, big numbers on hairlines, a glass craft card and three cards under it.',
    keeps: "PoE's own palette and the largest art of any direction here.",
    costs: 'The least dense of the ten; deep links land on a picture, not a table.',
    tags: ['full-bleed', 'glass', 'big type'],
    sw: ['#120a06', '#2a1610', '#e0763f', '#f6ece4', '#a68a78'],
  },
  {
    id: 'atlas', name: 'Atlas', tag: 'Treemap',
    intent: 'The meta as a map: skills are rectangles whose width is their share of the ladder, beside a detail column with combinations and the craft.',
    keeps: 'Answers "what is the meta" in one glance, without reading a single row.',
    costs: 'Area comparisons are approximate, and small skills get a sliver.',
    tags: ['treemap', 'area', 'meta'],
    sw: ['#04100f', '#0a2320', '#34d3a6', '#dff3ec', '#6e9c8f'],
  },
  {
    id: 'brutalist', name: 'Brutalist', tag: 'Swiss poster',
    intent: 'Paper, ink and one red: a poster column with 64px type over ruled numbers, a strict three-column sheet, and one inverted black block for the recipe.',
    keeps: 'Unmistakable hierarchy, and it will still look deliberate in ten years.',
    costs: 'Hard edges, no softness for long sessions, and almost no art.',
    tags: ['paper', 'rules', 'inversion'],
    sw: ['#f2f0ea', '#ffffff', '#d92b1f', '#111111', '#5c5a54'],
  },
  {
    id: 'prism', name: 'Prism', tag: 'Command palette',
    intent: 'A palette floating over blurred art: a live query field, results with icons and percentages, the build preview on the right, and keys under it.',
    keeps: 'Keyboard-first, and it feels like a game overlay rather than a website.',
    costs: 'Hides the rest of the app; the blur costs frames on weak GPUs.',
    tags: ['palette', 'overlay', 'keyboard'],
    sw: ['#060a16', '#121a2e', '#7c8bff', '#eef1fb', '#8f9ab5'],
  },
  {
    id: 'ledger', name: 'Ledger', tag: 'Master / detail',
    intent: 'Three panes and nothing else: a skills master list, a detail pane with a sortable table and a distribution strip, and a pinned craft column.',
    keeps: 'The fastest way to compare skills; one selection, one surface, no scrolling.',
    costs: 'Less decorative — the art becomes thumbnails.',
    tags: ['tables', 'three panes', 'dense'],
    sw: ['#0a0d11', '#11161c', '#5b9cf5', '#e8edf2', '#8593a1'],
  },
  {
    id: 'trophy', name: 'Trophy', tag: 'Art wall',
    intent: 'A gallery: the selected build hung as a framed plate with its name set large, painted tiles beside it, and the numbers as captions.',
    keeps: 'You can recognise a build from across the room, and it makes the art the interface.',
    costs: 'Needs art for everything, and it is the least dense of the ten.',
    tags: ['gallery', 'framed plate', 'minimal text'],
    sw: ['#0b0a08', '#17140f', '#e0a94a', '#f4ece0', '#9c8d78'],
  },
];

function variantSection(v, index) {
  const n = String(index + 1).padStart(2, '0');
  return `
    <section class="variant" id="${v.id}">
      <div class="v-head">
        <div class="v-num">${n}</div>
        <div class="v-copy">
          <h2>${v.name} <span class="v-tag">${v.tag}</span></h2>
          <p>${v.intent}</p>
          <div class="v-tags">${v.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        </div>
        <div class="v-swatches">${v.sw.map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
      </div>
      <div class="v-frame"><div class="mock m-${v.id}" data-layout="${v.id}">${L[v.id]()}</div></div>
      <div class="v-notes">
        <div><b>Keeps</b><span>${v.keeps}</span></div>
        <div><b>Costs</b><span>${v.costs}</span></div>
      </div>
    </section>`;
}

/* ============================================================== interactions */

/**
 * Selecting a skill rewrites every hero name in the mock; selecting a combination rewrites the
 * crafting target; the size chips filter the combination list. Same hand-off the real app makes,
 * shown so a direction can be judged by using it.
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
