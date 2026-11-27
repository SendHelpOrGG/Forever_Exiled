/*
 * Ten design directions for Forever Exiled — ten layouts, not ten skins, all dark.
 *
 * Every mock carries the whole cluster-jewel surface, because that is what the app actually does:
 * the skill (share, average and peak DPS), the combinations with their notables and their mods,
 * cluster size, passives and the iLvl floor, the price, the unique cluster jewels (Voices and
 * Megalomaniac), the most-used notables, three crafting routes with their currency and tries, and
 * the all-builds totals.
 *
 *   01 Obsidian     bento cockpit
 *   02 Blueprint    technical schematic with callouts and dimensions
 *   03 Terminal     market terminal: tape, quote panel, ticket
 *   04 Studio       creative tool: canvas, inspector, layers
 *   05 Ember        cinematic full-bleed hero
 *   06 Atlas        treemap of the meta
 *   07 Switchboard  control room: channel strips, faders, master
 *   08 Prism        command palette over blurred art
 *   09 Ledger       dense master/detail tables
 *   10 Trophy       art wall with a framed plate
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
    classes: 'Occultist, Elementalist, Assassin', tags: ['Cold', 'Spell', 'Duration'],
    builds: '1,910', pop: '20.5%', avg: '34.5M', peak: '145M', sampled: '21 of 24',
  },
  skills: [
    { gem: 'winter_orb', asc: 'occultist', name: 'Winter Orb', short: 'Winter Orb', dmg: 'Cold', dps: '145M', avg: '34.5M', pop: '20.5' },
    { gem: 'molten_strike_of_the_zenith', asc: 'pathfinder', name: 'Molten Strike of the Zenith', short: 'Molten Strike', dmg: 'Fire', dps: '128M', avg: '29.8M', pop: '17.8' },
    { gem: 'righteous_fire', asc: 'champion', name: 'Righteous Fire', short: 'Righteous Fire', dmg: 'Fire', dps: '96M', avg: '22.4M', pop: '12.3' },
    { gem: 'lightning_strike', asc: 'deadeye', name: 'Lightning Strike', short: 'Lightning Strike', dmg: 'Lightning', dps: '88M', avg: '19.6M', pop: '9.6' },
    { gem: 'hexblast', asc: 'occultist', name: 'Hexblast', short: 'Hexblast', dmg: 'Chaos', dps: '74M', avg: '16.2M', pop: '6.1' },
  ],
  combos: [
    {
      art: 'cluster_large', size: 'Large', passives: 12, ilvl: 75, price: '4.2 div', pct: 68, builds: 15, avg: '41.2M',
      notables: ['Prism Weave', 'Snowstorm', 'Sadist'],
      mods: ['+35% increased Effect of Small Passives', '+12% increased Cold Damage'],
      tags: ['Cold', 'Damage'],
    },
    {
      art: 'cluster_medium', size: 'Medium', passives: 8, ilvl: 68, price: '2.6 div', pct: 44, builds: 10, avg: '38.7M',
      notables: ['Blanketed Snow', 'Cold to the Core'],
      mods: ['+25% increased Effect of Small Passives', 'Adds 4 to 6 Cold Damage to Spells'],
      tags: ['Cold', 'Spell'],
    },
    {
      art: 'cluster_medium', size: 'Medium', passives: 6, ilvl: 84, price: '6.8 div', pct: 31, builds: 7, avg: '44.1M',
      notables: ['Eye to Eye', 'Repeater'],
      mods: ['+20% increased Projectile Damage', '+15% increased Attack Speed'],
      tags: ['Projectile', 'Speed'],
    },
  ],
  uniques: [{ name: 'Voices', count: 21 }, { name: 'Megalomaniac', count: 34 }],
  notables: [['Prism Weave', 68], ['Snowstorm', 61], ['Sadist', 44], ['Blanketed Snow', 38], ['Cold to the Core', 27]],
  routes: [
    { name: 'Alt + Augment', tries: '1 in 12', cost: '3.2 div' },
    { name: 'Frigid + Prismatic fossil', tries: '1 in 9', cost: '4.8 div' },
    { name: 'Harvest reforge (Cold)', tries: '1 in 16', cost: '2.4 div' },
  ],
  totals: { builds: '124,363', chars: '234', jewels: '592', combos: '34', skills: '18' },
  nav: ['Cluster Jewels', "Watcher's Eyes", 'Rare Items', 'Flasks', 'Economy'],
};

const bar = (pct) => `<span class="bar" style="--pct:${pct}%"><i></i></span>`;
const stat = (label, value) => `<div class="stat"><em>${label}</em><b class="num">${value}</b></div>`;
const navLinks = (cls) => D.nav.map((n, i) => `<a class="${cls}${i === 0 ? ' on' : ''}" data-nav>${n}</a>`).join('');
const sizeChips = () => ['LARGE 13', 'MEDIUM 5', 'SMALL 2']
  .map((l) => `<button class="sz" data-size="${l.split(' ')[0].toLowerCase()}">${l}</button>`).join('');

/* the feature kit — notables are rose, cluster modifiers are azure, uniques are counted chips */
const notablesOf = (c) => `<span class="fx-notables">${c.notables.map((n) => `<i class="fx-notable">${n}</i>`).join('')}</span>`;
const modsOf = (c) => `<span class="fx-mods">${c.mods.map((m) => `<i class="fx-mod">${m}</i>`).join('')}</span>`;
const tagsOf = (c) => `<span class="fx-tags">${c.tags.map((t) => `<i class="fx-tag">${t}</i>`).join('')}</span>`;
const gearOf = (c) => `<span class="fx-gear">${c.size} · ${c.passives} passives · iLvl ${c.ilvl}+ · ${c.price}</span>`;
const uniquesOf = () => `<span class="fx-uniques">${D.uniques
  .map((u) => `<i class="fx-un"><b>${u.name}</b><span>${u.count}</span></i>`).join('')}</span>`;
const routesOf = (cls) => `<span class="fx-routes ${cls || ''}">${D.routes
  .map((r, i) => `<i class="fx-route${i === 0 ? ' best' : ''}"><b>${r.name}</b><span>${r.tries}</span><span>${r.cost}</span></i>`).join('')}</span>`;

/* ============================================================== the layouts */

const L = {};

/* ═══════════════════════════════════════════════════════════ 01 · WAVEFORM ═══ */

L.waveform = () => `
  <header class="q-bar">
    <span class="q-mark"><img src="${A}/logo.png" alt=""><i class="q-led"></i>WAVEFORM</span>
    <nav class="q-tabs">${navLinks('')}</nav>
    <span class="q-readout">CH1 · 20.5 % · 240 Sa/s</span>
    <button class="q-sync" data-press>ACQUIRE</button>
  </header>

  <div class="q-bench">
    <aside class="q-trace">
      <p class="q-cap">Channels · 5 of 18</p>
      ${D.skills.map((s, i) => `<button class="q-chan${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span class="q-chan-name">${s.short}</span><b>${s.pop}%</b></button>`).join('')}
      <p class="q-cap">Window — cluster size</p>
      <div class="q-window">${sizeChips()}</div>
    </aside>

    <section class="q-scope">
      <div class="q-scope-head">
        <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.classes} · ${D.skill.builds} builds</p></div>
        <div class="q-scope-stats" data-stats>${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
      </div>
      <div class="q-grid">
        <svg class="q-wave" viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true">
          <polyline class="q-trace-a" points="0,120 40,98 80,106 120,74 160,86 200,54 240,68 280,42 320,60 360,36 400,50 440,30 480,46 520,24 560,38 600,20"></polyline>
          <polyline class="q-trace-b" points="0,142 40,134 80,122 120,128 160,112 200,118 240,100 280,106 320,90 360,98 400,80 440,88 480,72 520,80 560,62 600,70"></polyline>
        </svg>
        ${D.combos.map((c, i) => `<button class="q-marker m${i}" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}"><i></i><span>${c.notables.join(' + ')}</span><b>${c.pct}%</b></button>`).join('')}
      </div>
      <div class="q-measure">
        <p class="q-cap">Selected combination — notables, modifiers, socketing</p>
        ${notablesOf(D.combos[0])}
        ${modsOf(D.combos[0])}
        <span class="q-gear">${gearOf(D.combos[0])}</span>
      </div>
    </section>

    <aside class="q-panel">
      <p class="q-cap">Notables — share of builds</p>
      <div class="q-notlist">${D.notables.map(([n, p]) => `<div class="q-notrow"><span>${n}</span><i style="--p:${p}%"></i><b>${p}%</b></div>`).join('')}</div>
      <p class="q-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <p class="q-cap">Crafting — 3 routes</p>
      <p class="q-target" data-craft-combo>Prism Weave + Snowstorm</p>
      ${routesOf('q-routes')}
      <dl class="q-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
        <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Combinations</dt><dd>${D.totals.combos}</dd>
      </dl>
    </aside>
  </div>

  <footer class="q-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>ACQ 12:07 · snapshot demo-2026-11-07</span></footer>
`;

/* ═══════════════════════════════════════════════════════════ 02 · BOARD ══════ */

L.board = () => {
  const COLS = [
    { size: 'Large', meta: '12 passives · iLvl 75+' },
    { size: 'Medium', meta: '8 and 6 passives · iLvl 68+' },
    { size: 'Small', meta: '2 passives · iLvl 68+' },
  ];
  return `
  <header class="k-bar">
    <span class="k-mark"><img src="${A}/logo.png" alt="">BOARD</span>
    <nav class="k-tabs">${navLinks('')}</nav>
    <span class="k-filter">${sizeChips()}</span>
    <button class="k-sync" data-press>REFRESH</button>
  </header>

  <section class="k-head">
    <div class="k-headtitle">
      <img src="${art.gem(D.skill.gem)}" alt="">
      <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.classes} · ${D.skill.builds} builds</p></div>
    </div>
    <div class="k-headpicks">${D.skills.map((s, i) => `<button class="k-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}</div>
    <div class="k-headstats" data-stats>${stat('AVG DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
  </section>

  <div class="k-board">
    ${COLS.map((col) => {
      const rows = D.combos.filter((c) => c.size === col.size);
      return `
      <section class="k-col">
        <header class="k-colhead"><i class="k-dot"></i><b>${col.size}</b><span>${col.meta}</span><em>${rows.length}</em></header>
        <div class="k-tickets">
          ${rows.map((c) => `
            <button class="k-ticket" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}">
              <span class="k-ticktop"><img src="${art.cluster(c.art)}" alt=""><b>${c.notables.join(' + ')}</b><i>${c.pct}%</i></span>
              ${notablesOf(c)}
              ${modsOf(c)}
              ${gearOf(c)}
              <span class="k-tickfoot"><span>${c.builds} builds</span><span>${c.avg}</span></span>
              ${bar(c.pct)}
            </button>`).join('')}
          ${rows.length === 0 ? `<div class="k-empty"><b>No tickets</b><p>Nothing sampled in this column yet — 2 builds sit at iLvl 68+.</p></div>` : ''}
        </div>
      </section>`;
    }).join('')}

    <aside class="k-rail">
      <p class="k-cap">Craft target</p>
      <p class="k-target" data-craft-combo>Prism Weave + Snowstorm</p>
      <p class="k-cap">Most used notables</p>
      <div class="k-notlist">${D.notables.map(([n, p]) => `<div class="k-notrow"><span>${n}</span><i style="--p:${p}%"></i><b>${p}%</b></div>`).join('')}</div>
      <p class="k-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <p class="k-cap">Crafting — 3 routes</p>
      ${routesOf('k-routes')}
      <dl class="k-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
        <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Skills</dt><dd>${D.totals.skills}</dd>
      </dl>
    </aside>
  </div>

  <footer class="k-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>3 columns · 3 tickets · 1 empty</span></footer>
`;
};

/* ════════════════════════════════════════════════════════ 03 · CHRONICLE ═══ */

L.chronicle = () => `
  <header class="c-bar">
    <span class="c-mark"><img src="${A}/logo.png" alt="">CHRONICLE</span>
    <nav class="c-tabs">${navLinks('')}</nav>
    <span class="c-stamp">SNAPSHOT 12 · 2026-11-07</span>
    <button class="c-sync" data-press>SYNC</button>
  </header>

  <section class="c-hero">
    <div class="c-titlerow">
      <img class="c-gem" src="${art.gem(D.skill.gem)}" alt="">
      <div class="c-titlebody">
        <p class="c-kicker">Cluster Jewels · ${D.combos[0].size} · iLvl ${D.combos[0].ilvl}+</p>
        <h1 data-hero-name>${D.skill.name}</h1>
        <p class="c-sub">${D.skill.damage} · ${D.skill.classes}</p>
        <p class="c-notarow">${notablesOf(D.combos[0])}</p>
      </div>
    </div>
    <div class="c-herostats" data-stats>${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK DPS', D.skill.peak)}</div>
    <div class="c-pills">${D.skills.map((s, i) => `<button class="c-pill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}</div>
  </section>

  <section class="c-time">
    <div class="c-axis"><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span class="c-axis-now">NOW</span></div>
    <div class="c-plot">
      <svg class="c-chart" viewBox="0 0 900 150" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="0,128 75,120 150,112 225,96 300,102 375,84 450,88 525,66 600,72 675,50 750,58 825,32 900,26"></polyline>
      </svg>
      ${[0, 1, 2].map((i) => `<button class="c-flag f${i}" data-combo data-label="${D.combos[i].notables.join(' + ')}"><b>${D.combos[i].notables.join(' + ')}</b><span>${D.combos[i].pct}%</span></button>`).join('')}
    </div>
    <div class="c-entries">
      ${D.combos.map((c) => `
        <button class="c-entry" data-combo data-label="${c.notables.join(' + ')}">
          <span class="c-entrytop"><b>${c.notables.join(' + ')}</b><i>${c.pct}%</i></span>
          ${notablesOf(c)}
          ${modsOf(c)}
          ${gearOf(c)}
          ${bar(c.pct)}
        </button>`).join('')}
    </div>
  </section>

  <section class="c-band">
    <div class="c-craftband">
      <p class="c-cap">Crafting — 3 routes</p>
      <b class="c-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('c-routes')}
    </div>
    <div class="c-uniqueband">
      <p class="c-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <p class="c-cap">Most used notables</p>
      <div class="c-notlist">${D.notables.map(([n, p]) => `<div class="c-notrow"><span>${n}</span><b>${p}%</b></div>`).join('')}</div>
    </div>
    <dl class="c-totals">
      <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
      <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Combinations</dt><dd>${D.totals.combos}</dd>
    </dl>
  </section>

  <footer class="c-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>12 snapshots · demo-2026-11-07</span></footer>
`;

/* ════════════════════════════════════════════════════════════ 04 · ORBIT ════ */

L.orbit = () => `
  <header class="r-bar">
    <span class="r-mark"><img src="${A}/logo.png" alt="">ORBIT</span>
    <nav class="r-tabs">${navLinks('')}</nav>
    <span class="r-hint">drag to rotate · click a node</span>
    <button class="r-sync" data-press>SYNC</button>
  </header>

  <div class="r-body">
    <section class="r-stage">
      <svg class="r-rings" viewBox="0 0 400 400" aria-hidden="true">
        <circle cx="200" cy="200" r="186" class="r-ring r1"></circle>
        <circle cx="200" cy="200" r="140" class="r-ring r2"></circle>
        <circle cx="200" cy="200" r="96" class="r-ring r3"></circle>
        <circle cx="200" cy="200" r="120" class="r-arc a1"></circle>
        <circle cx="200" cy="200" r="120" class="r-arc a2"></circle>
        <circle cx="200" cy="200" r="120" class="r-arc a3"></circle>
      </svg>
      <div class="r-core">
        <img class="r-coreart" src="${art.cluster('cluster_large')}" alt="">
        <img class="r-coregem" src="${art.gem(D.skill.gem)}" alt="">
        <h1 data-hero-name>${D.skill.name}</h1>
        <p class="r-coremeta">${D.skill.damage} · ${D.skill.pop} of the ladder</p>
        <div class="r-corestats" data-stats>${stat('AVG', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
      </div>
      ${D.combos.map((c, i) => `<button class="r-node n${i}" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}"><b>${c.notables.join(' + ')}</b><span>${c.pct}%</span><i>${c.size}</i></button>`).join('')}
      <p class="r-passives">Notables on this orbit: ${notablesOf(D.combos[0])}</p>
    </section>

    <aside class="r-panel">
      <div class="r-selected">
        <p class="r-cap">Selected combination</p>
        <h2>${D.combos[0].notables.join(' + ')}</h2>
        ${notablesOf(D.combos[0])}
        ${modsOf(D.combos[0])}
        <span class="r-gear">${gearOf(D.combos[0])}</span>
        <span class="r-selbar">${bar(D.combos[0].pct)}</span>
      </div>
      <div class="r-picks">${D.skills.map((s, i) => `<button class="r-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</div>
      <p class="r-cap">Most used notables</p>
      <div class="r-notlist">${D.notables.map(([n, p]) => `<div class="r-notrow"><span>${n}</span><i style="--p:${p}%"></i><b>${p}%</b></div>`).join('')}</div>
      <p class="r-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <p class="r-cap">Crafting — 3 routes</p>
      <b class="r-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('r-routes')}
      <dl class="r-totals"><dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd><dt>Jewels</dt><dd>${D.totals.jewels}</dd></dl>
    </aside>
  </div>

  <footer class="r-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>orbit radius = share of builds</span></footer>
`;

/* ════════════════════════════════════════════════════════════ 06 · TIERS ════ */

L.tiers = () => {
  const FEATS = (c) => `
    <li><span>Notables</span><div>${notablesOf(c)}</div></li>
    <li><span>Modifiers</span><div>${modsOf(c)}</div></li>
    <li><span>Socketing</span><div>${gearOf(c)}</div></li>
    <li><span>Builds</span><b>${c.builds}</b></li>
    <li><span>Average DPS</span><b>${c.avg}</b></li>`;
  return `
  <header class="t-bar">
    <span class="t-mark"><img src="${A}/logo.png" alt="">TIERS</span>
    <nav class="t-tabs">${navLinks('')}</nav>
    <span class="t-scope">${D.skills.map((s, i) => `<button class="t-scopegem${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</span>
    <button class="t-sync" data-press>SYNC</button>
  </header>

  <section class="t-head">
    <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.classes} · ${D.skill.builds} builds · ${D.skill.sampled} sampled</p></div>
    <div class="t-headstats" data-stats>${stat('AVERAGE', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
    <p class="t-note">Three ways to socket the same skill — pick the one that pays for itself.</p>
  </section>

  <div class="t-plans">
    ${D.combos.map((c, i) => `
      <article class="t-plan${i === 1 ? ' feat' : ''}">
        ${i === 1 ? '<span class="t-ribbon">Most built</span>' : ''}
        <div class="t-planart"><img src="${art.cluster(c.art)}" alt=""></div>
        <p class="t-tier">${c.size} cluster · ${c.passives} passives</p>
        <h2>${c.notables.join(' + ')}</h2>
        <p class="t-price">${c.price}<em>${c.pct}% of builds · iLvl ${c.ilvl}+</em></p>
        <ul class="t-feats">${FEATS(c)}</ul>
        <button class="t-cta" data-combo data-label="${c.notables.join(' + ')}">Socket this jewel</button>
      </article>`).join('')}
  </div>

  <section class="t-below">
    <div class="t-notables">
      <p class="t-cap">Most used notables</p>
      <div class="t-notlist">${D.notables.map(([n, p]) => `<div class="t-notrow"><span>${n}</span><i style="--p:${p}%"></i><b>${p}%</b></div>`).join('')}</div>
    </div>
    <div class="t-craft">
      <p class="t-cap">Crafting — 3 routes</p>
      <b class="t-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('t-routes')}
    </div>
    <div class="t-side">
      <p class="t-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <dl class="t-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
        <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Combinations</dt><dd>${D.totals.combos}</dd>
      </dl>
    </div>
  </section>

  <footer class="t-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>prices in divine · snapshot demo-2026-11-07</span></footer>
`;
};

/* ═════════════════════════════════════════════════════════════ 07 · DECK ═══ */

L.deck = () => `
  <header class="d-bar">
    <span class="d-mark"><img src="${A}/logo.png" alt="">DECK</span>
    <nav class="d-tabs">${navLinks('')}</nav>
    <span class="d-count">card 1 of 3</span>
    <button class="d-sync" data-press>SYNC</button>
  </header>

  <div class="d-layout">
    <section class="d-stage">
      <div class="d-stack">
        <span class="d-sheet s2"></span>
        <span class="d-sheet s1"></span>
        <article class="d-card">
          <img class="d-art" src="${art.cluster('cluster_large')}" alt="">
          <img class="d-gem" src="${art.gem(D.skill.gem)}" alt="">
          <div class="d-cardbody">
            <p class="d-kicker">${D.combos[0].size} · ${D.combos[0].passives} passives · iLvl ${D.combos[0].ilvl}+</p>
            <h1 data-hero-name>${D.skill.name}</h1>
            <p class="d-sub">${D.skill.damage} · ${D.skill.classes}</p>
            <div class="d-stats" data-stats>${stat('AVG DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
            ${notablesOf(D.combos[0])}
            ${modsOf(D.combos[0])}
            ${gearOf(D.combos[0])}
          </div>
        </article>
      </div>
      <div class="d-controls">
        <button class="d-arrow" data-press aria-label="previous">‹</button>
        ${D.combos.map((c, i) => `<button class="d-dot${i === 0 ? ' on' : ''}" data-combo data-label="${c.notables.join(' + ')}" aria-label="${c.notables.join(' + ')}">${i + 1}</button>`).join('')}
        <button class="d-arrow" data-press aria-label="next">›</button>
        <span class="d-dotslabel">3 combinations · 34 total</span>
      </div>
    </section>

    <aside class="d-queue">
      <p class="d-cap">In the deck</p>
      ${D.combos.map((c) => `
        <button class="d-row" data-combo data-label="${c.notables.join(' + ')}">
          <span class="d-rowtop"><b>${c.notables.join(' + ')}</b><i>${c.pct}%</i></span>
          ${notablesOf(c)}
          ${modsOf(c)}
          ${bar(c.pct)}
        </button>`).join('')}
      <p class="d-cap">Crafting — 3 routes</p>
      <b class="d-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('d-routes')}
      <div class="d-picks">${D.skills.map((s, i) => `<button class="d-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</div>
      <p class="d-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <dl class="d-totals"><dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd><dt>Jewels</dt><dd>${D.totals.jewels}</dd></dl>
    </aside>
  </div>

  <footer class="d-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>3 of 34 combinations</span></footer>
`;

/* ════════════════════════════════════════════════════════════ 09 · OUTLINE ═══ */

L.outline = () => `
  <header class="n-bar">
    <span class="n-mark"><img src="${A}/logo.png" alt="">OUTLINE</span>
    <nav class="n-tabs">${navLinks('')}</nav>
    <span class="n-crumbs"><b>Cluster Jewels</b><i>/</i>Combinations<i>/</i>Winter Orb</span>
    <button class="n-sync" data-press>SYNC</button>
  </header>

  <div class="n-panes">
    <aside class="n-tree">
      <p class="n-cap">Tree</p>
      ${D.skills.map((s, i) => `
        <div class="n-branch">
          <button class="n-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
            <i class="n-twist${i === 0 ? ' open' : ''}"></i><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span><b>${s.pop}%</b>
          </button>
          ${i === 0 ? D.combos.map((c) => `<button class="n-leaf" data-combo data-label="${c.notables.join(' + ')}"><i class="n-leafmark"></i><img src="${art.cluster(c.art)}" alt=""><span>${c.notables.join(' + ')}</span><b>${c.pct}%</b></button>`).join('') : ''}
          ${i === 0 ? D.notables.slice(0, 3).map(([n, p]) => `<div class="n-node"><i class="n-leafmark"></i><span>${n}</span><b>${p}%</b></div>`).join('') : ''}
        </div>`).join('')}
      <p class="n-cap">Unique cluster jewels</p>
      ${uniquesOf()}
    </aside>

    <section class="n-detail">
      <div class="n-detailhead">
        <img src="${art.cluster('cluster_large')}" alt="">
        <div>
          <p class="n-kicker">${D.combos[0].size} · ${D.combos[0].passives} passives · iLvl ${D.combos[0].ilvl}+ · ${D.combos[0].price}</p>
          <h1 data-hero-name>${D.skill.name}</h1>
          <p class="n-sub">${D.skill.damage} · ${D.skill.classes} · ${D.skill.builds} builds</p>
        </div>
        <div class="n-detailstats" data-stats>${stat('AVG DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
      </div>

      <div class="n-pairs">
        <div class="n-block">
          <p class="n-cap">Notables — this combination</p>
          ${notablesOf(D.combos[0])}
        </div>
        <div class="n-block">
          <p class="n-cap">Cluster modifiers</p>
          ${modsOf(D.combos[0])}
        </div>
        <div class="n-block">
          <p class="n-cap">Socketing</p>
          <span class="n-gear">${gearOf(D.combos[0])}</span>
          <span class="n-selbar">${bar(D.combos[0].pct)}</span>
        </div>
      </div>

      <div class="n-craftbox">
        <p class="n-cap">Crafting — 3 routes</p>
        <b class="n-target" data-craft-combo>Prism Weave + Snowstorm</b>
        ${routesOf('n-routes')}
      </div>

      <dl class="n-totals">
        <div><dt>Builds</dt><dd>${D.totals.builds}</dd></div>
        <div><dt>Characters</dt><dd>${D.totals.chars}</dd></div>
        <div><dt>Jewels</dt><dd>${D.totals.jewels}</dd></div>
        <div><dt>Notables</dt><dd>${D.notables.length} tracked</dd></div>
      </dl>
    </section>
  </div>

  <footer class="n-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>tree: 5 skills · 3 combinations expanded</span></footer>
`;

L.nocturne = () => `
  <img class="e-backdrop" src="${art.asc(D.skill.asc)}" alt="">
  <div class="e-shade"></div>

  <header class="e-nav">
    <span class="e-brand"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav>${navLinks('')}</nav>
    <button class="e-sync" data-press>Sync ladder</button>
  </header>

  <section class="e-hero">
    <div class="e-copy">
      <p class="e-kicker"><span></span>Cluster Jewels · Large · iLvl 75+</p>
      <div class="e-titlerow">
        <img class="e-gem" src="${art.gem(D.skill.gem)}" alt="">
        <h1 data-hero-name>${D.skill.name}</h1>
      </div>
      <p class="e-sub">${D.skill.damage} damage · ${D.skill.classes}</p>
      <p class="e-notarow">${notablesOf(D.combos[0])}</p>
      <div class="e-stats" data-stats>
        ${stat('Average DPS', D.skill.avg)}${stat('Peak DPS', D.skill.peak)}
        <div class="stat"><em>Builds</em><b class="val">${D.skill.builds}</b></div>
      </div>
    </div>
    <aside class="e-craft">
      <p class="e-craftcap">Crafting routes — 3 tried</p>
      <p class="e-target" data-craft-combo>Prism Weave + Snowstorm</p>
      ${routesOf('e-routes')}
      <div class="e-uniquefoot">${uniquesOf()}</div>
      <button class="e-plan" data-press>Plan it</button>
    </aside>
  </section>

  <section class="e-strip">
    ${D.combos.map((c) => `
      <button class="e-card" data-combo data-label="${c.notables.join(' + ')}">
        <img src="${art.cluster(c.art)}" alt="">
        <span class="e-cardbody">
          <b>${c.notables.join(' + ')}</b>
          ${modsOf(c)}
          <em>${gearOf(c)}</em>
          ${bar(c.pct)}
        </span>
        <span class="e-cardpct">${c.pct}%</span>
      </button>`).join('')}
    <div class="e-switcher">
      ${D.skills.slice(0, 4).map((s, i) => `<button class="e-pill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}
    </div>
  </section>

  <footer class="e-status" data-status><span>124,363 builds · 234 characters · 592 jewels · 34 combinations</span><span>snapshot demo-2026-11-07</span></footer>`;

/* ── 06 · ATLAS — treemap of the meta ─────────────────────────────────────── */

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
        <p class="p-cap">Combinations <span>3 of 34</span></p>
        ${D.combos.map((c, i) => `
          <button class="p-result${i === 0 ? ' on' : ''}" data-combo data-label="${c.notables.join(' + ')}">
            <img src="${art.cluster(c.art)}" alt="">
            <span class="p-rname">${c.notables.join(' + ')}
              <em>${c.size} · ${c.passives}p · iLvl ${c.ilvl}+ · ${c.price}</em>
              <em class="fx-mod p-rmods">${c.mods[0]}</em>
            </span>
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
        <div class="p-facts">
          <span class="fx-gear">${gearOf(D.combos[0])}</span>
          ${notablesOf(D.combos[0])}
          <span class="p-factline">${modsOf(D.combos[0])}</span>
          ${uniquesOf()}
        </div>
        <div class="p-craft">
          <p class="p-craftcap">Crafting — 3 routes</p>
          <p class="p-target" data-craft-combo>Prism Weave + Snowstorm</p>
          ${routesOf('p-routes')}
        </div>
      </div>
    </div>

    <div class="p-hints">
      <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
      <span><kbd>↵</kbd> open</span>
      <span><kbd>⇥</kbd> scope</span>
      <span><kbd>esc</kbd> dismiss</span>
      <span class="p-hintright">124,363 builds · 234 characters · 592 jewels</span>
    </div>
  </div>

  <footer class="p-status" data-status><span>Ready · 234 characters sampled</span><span>⌘K to search anything</span></footer>`;

/* ── 09 · LEDGER — dense master/detail ────────────────────────────────────── */

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
        <span class="w-framelabel">${D.combos[0].size} · ${D.combos[0].passives}p · iLvl ${D.combos[0].ilvl}+</span>
      </div>
      <figcaption>
        <p class="w-kicker">${D.skill.damage} · ${D.skill.pop} of the ladder</p>
        <h1 data-hero-name>${D.skill.name}</h1>
        <p class="w-sub">${D.skill.classes}</p>
        <p class="w-notarow">${notablesOf(D.combos[0])}</p>
        <div class="w-platestats" data-stats>
          ${stat('Average', D.skill.avg)}${stat('Peak', D.skill.peak)}
        </div>
      </figcaption>
    </figure>

    <div class="w-tiles">
      ${D.combos.map((c) => `
        <button class="w-tile" data-combo data-label="${c.notables.join(' + ')}">
          <img src="${art.cluster(c.art)}" alt="">
          <span class="w-tilebody">
            <b>${c.notables.join(' + ')}</b>
            ${gearOf(c)}
            <em class="fx-mod w-tilemod">${c.mods[0]}</em>
          </span>
          <span class="w-pct">${c.pct}%</span>
        </button>`).join('')}
      <button class="w-tile small" data-combo data-label="Small clusters">
        <img src="${art.cluster('cluster_small')}" alt="">
        <span class="w-tilebody"><b>Small clusters</b><em>2 builds · 9% · iLvl 68+</em></span>
        <span class="w-pct">9%</span>
      </button>
    </div>

    <aside class="w-side">
      <p class="w-cap">On the wall</p>
      <div class="w-skills">
        ${D.skills.slice(0, 4).map((s, i) => `<button class="w-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}
      </div>

      <div class="w-notables">
        <p class="w-cap">Most used notables</p>
        ${D.notables.slice(0, 4).map(([n, p]) => `<div class="w-notrow"><span>${n}</span><b>${p}%</b></div>`).join('')}
      </div>

      <div class="w-uniques">
        <p class="w-cap">Unique cluster jewels</p>
        ${uniquesOf()}
      </div>

      <div class="w-craft">
        <p class="w-cap">Crafting — 3 routes</p>
        <p class="w-target" data-craft-combo>Prism Weave + Snowstorm</p>
        ${routesOf('w-routes')}
        <button class="w-plan" data-press>Plan</button>
      </div>
    </aside>
  </div>

  <footer class="w-status" data-status><span>124,363 builds · 234 characters · 592 jewels · 34 combinations</span><span>poe.ninja</span></footer>`;

/* ============================================================== the gallery */


const VARIANTS = [
  {
    id: 'waveform', name: 'Waveform', tag: 'Instrument bench',
    intent: 'An oscilloscope bench: the skills are channels with their own LEDs, the combination markers sit on the trace itself, the selected one is measured out below as notables, modifiers and socketing, and the readout column carries the notables ranking, the uniques, the three routes and the totals.',
    intent2: '',
    keeps: 'Every number is a measurement taken off the trace, so the eye follows one line instead of ten panels.',
    costs: 'The scope owns the screen; text is small outside the readouts.',
    tags: ['scope', 'trace', 'instrument'],
    sw: ['#04070c', '#0a1119', '#22d3ee', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'board', name: 'Board', tag: 'Kanban columns',
    intent: 'A board with one column per cluster size: Large, Medium and Small, each holding the combination tickets that fit it, with the notables and modifiers printed on the ticket itself, an empty state where nothing was sampled, and a rail with the craft target, the ranking, the uniques and the routes.',
    keeps: 'Size is the column, so the filter and the layout are the same gesture.',
    costs: 'Only three tickets fit; a real board would need scrolling columns.',
    tags: ['kanban', 'tickets', 'by size'],
    sw: ['#0a0b12', '#141524', '#b18bff', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'chronicle', name: 'Chronicle', tag: 'Timeline',
    intent: 'A chronicle of the ladder: a hero band with the build and its two numbers, a twelve-snapshot line with three flags marking when each combination entered the meta, the same three combinations written out underneath, and a band with the routes, the uniques, the ranking and the totals.',
    keeps: 'Shows that the meta is a story with dates, not a static ranking.',
    costs: 'The timeline needs width; the entries are the only dense part.',
    tags: ['timeline', 'snapshots', 'flags'],
    sw: ['#0b0a10', '#16141f', '#f43f5e', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'orbit', name: 'Orbit', tag: 'Radial graph',
    intent: 'A radial graph: the skill sits at the core, concentric rings carry the share arcs, and each combination is a node on the orbit with its notables and its share; the panel beside it holds the selected node, the skill switcher, the ranking, the uniques and the routes.',
    keeps: 'Relationships are spatial — you can see three combinations around one skill at once.',
    costs: 'Long notable names have to wrap inside a node.',
    tags: ['radial', 'nodes', 'spatial'],
    sw: ['#07060f', '#151129', '#dd5ce0', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'nocturne', name: 'Nocturne', tag: 'Cinematic hero',
    intent: 'Full-bleed splash art, a 64px title over the grade, the notables under it, big numbers on hairlines, a glass card with the three routes, and three cards carrying each combination, its modifiers and its price.',
    keeps: "The largest art of any direction here, and the palette is now cold rose on black.",
    costs: 'The least dense screen; deep links land on a picture.',
    tags: ['full-bleed', 'glass', 'big type'],
    sw: ['#0b0812', '#1d1630', '#ff6b9d', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'tiers', name: 'Tiers', tag: 'Comparison table',
    intent: 'Three plans side by side, one per combination: price, share, iLvl floor, then a feature list of notables, modifiers and socketing, with the recommended plan lifted; underneath, the notables ranking, the three routes and the totals.',
    keeps: 'The fastest way to answer "which jewel do I socket".',
    costs: 'Reads as a pricing page — playful for a ladder tool, deliberate here.',
    tags: ['plans', 'features', 'compare'],
    sw: ['#080b12', '#101828', '#58a6ff', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'deck', name: 'Deck', tag: 'Card stack',
    intent: 'A deck of cards: the selected combination fills the top card with the art, the build, the two numbers, the notables, the modifiers and the socketing, two sheets behind it promise the rest, dots and arrows page through, and the queue lists the deck with its routes and totals.',
    keeps: 'One combination at a time, at full size — the best home for the art.',
    costs: 'Comparison costs a click; three cards is not a table.',
    tags: ['cards', 'paging', 'one at a time'],
    sw: ['#0a0a0c', '#17181d', '#dbe4f0', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'prism', name: 'Prism', tag: 'Command palette',
    intent: 'A palette over blurred art: each result carries its socketing and its first modifier; the preview carries the art, the two DPS numbers, the notables, all three routes and the unique jewels.',
    keeps: 'Keyboard-first, and it feels like a game overlay.',
    costs: 'Hides the rest of the app; the blur costs frames.',
    tags: ['palette', 'overlay', 'keyboard'],
    sw: ['#060a16', '#121a2e', '#7c8bff', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'outline', name: 'Outline', tag: 'Tree browser',
    intent: 'A file tree of the meta: skills open into their combinations, each combination into the notables it runs, with the unique jewels pinned at the foot; the detail pane prints the selected combination, its modifiers, its socketing and all three routes.',
    keeps: 'Hierarchy is explicit — nothing is hidden behind a hover.',
    costs: 'Only one branch is open at a time, so depth beats breadth.',
    tags: ['tree', 'hierarchy', 'detail pane'],
    sw: ['#0b0d10', '#151a21', '#8fb3d9', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'trophy', name: 'Trophy', tag: 'Art wall',
    intent: 'A gallery: the build hung as a framed plate with its notables set under the title, painted tiles for each combination with its socketing and its modifier, and a side column with the notables ranking, the uniques and the routes.',
    keeps: 'You can recognise a build from across the room.',
    costs: 'Needs art for everything, and it is the least dense of the ten.',
    tags: ['gallery', 'framed plate', 'minimal text'],
    sw: ['#0e0a10', '#1b1220', '#e9b8c4', '#f08fae', '#7fb3f5'],
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
 * crafting target; the size chips filter the combination list. Same hand-off the real app makes.
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
