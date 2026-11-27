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

/* the feature kit — notables are gold, modifiers are blue, uniques are toggles */
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
        <div class="o-chips">
          ${D.skills.map((s, i) => `<button class="o-chip${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}
        </div>
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
        <span class="o-metricsub">${D.uniques.map((u) => `${u.count} ${u.name}`).join(' · ')}</span>
        ${uniquesOf()}
      </div>
    </div>

    <section class="o-combos">
      <header class="o-sechead">
        <h2>Combinations</h2>
        <div class="o-sizes">${sizeChips()}</div>
      </header>
      <div class="o-cards">
        ${D.combos.map((c) => `
          <button class="o-combo" data-combo data-label="${c.label || c.notables.join(' + ')}" data-cluster-size="${c.size}">
            <img src="${art.cluster(c.art)}" alt="">
            <span class="o-combobody">
              <span class="o-combotop"><b>${c.notables.join(' + ')}</b><i>${c.pct}%</i></span>
              ${notablesOf(c)}
              ${modsOf(c)}
              <span class="o-combogear">${gearOf(c)}</span>
            </span>
            <span class="o-combobar">${bar(c.pct)}</span>
          </button>`).join('')}
      </div>
    </section>

    <section class="o-notables">
      <header class="o-sechead"><h2>Most used notables</h2><span>share of builds</span></header>
      <div class="o-notlist">
        ${D.notables.map(([n, p]) => `
          <div class="o-notrow"><span class="o-notname">${n}</span>${bar(p)}<span class="o-notpct">${p}%</span></div>`).join('')}
      </div>
      <div class="o-uniquebox">
        <em>Unique cluster jewels</em>
        ${uniquesOf()}
      </div>
    </section>

    <section class="o-craft">
      <header class="o-sechead"><h2>Crafting routes</h2><span>3 tried</span></header>
      <p class="o-target" data-craft-combo>Prism Weave + Snowstorm</p>
      ${routesOf('o-routes')}
      <button class="o-plan" data-press>Open crafting →</button>
    </section>
  </div>

  <footer class="o-status" data-status><span>124,363 builds · 234 characters · 592 jewels · 34 combinations</span><span>DATA · POE.NINJA BUILD API</span></footer>`;

/* ── 02 · BLUEPRINT — technical schematic ─────────────────────────────────── */
L.blueprint = () => `
  <header class="g-bar">
    <span class="g-mark"><img src="${A}/logo.png" alt=""><span>FOREVER EXILED</span></span>
    <nav class="g-tabs">${navLinks('')}</nav>
    <span class="g-sheetno">SHEET 01 / 04 · REV 9</span>
    <button class="g-sync" data-press>SYNC</button>
  </header>

  <div class="g-body">
    <aside class="g-sheets">
      <p class="g-cap">Sheets</p>
      ${D.skills.map((s, i) => `
        <button class="g-sheet${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
          <span class="g-sheetidx">${String(i + 1).padStart(2, '0')}</span>
          <span class="g-sheetname">${s.short}</span>
        </button>`).join('')}
      <p class="g-cap">Variants</p>
      ${uniquesOf()}
    </aside>

    <section class="g-drawing">
      <div class="g-grid"></div>
      <div class="g-drawhead">
        <h1 data-hero-name>${D.skill.name}</h1>
        <p>Assembly of a ${D.combos[0].passives}-passive Large cluster jewel, ${D.skill.damage} spec</p>
        <div class="g-drawstats" data-stats>
          ${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK', D.skill.peak)}
        </div>
      </div>

      <div class="g-assembly">
        <img class="g-part" src="${art.cluster('cluster_large')}" alt="">
        <img class="g-core" src="${art.gem(D.skill.gem)}" alt="">
        <span class="g-dim g-dim-top"><i></i>12 passives<i></i></span>
        <span class="g-dim g-dim-side"><i></i>iLvl 75+<i></i></span>
        <div class="g-callout g-call-a">
          <b>Notables</b>
          ${notablesOf(D.combos[0])}
        </div>
        <div class="g-callout g-call-b">
          <b>Modifiers</b>
          ${modsOf(D.combos[0])}
        </div>
        <div class="g-callout g-call-c">
          <b>Socketing</b>
          <span class="fx-gear">${D.combos[0].size} · ${D.combos[0].passives} passives · iLvl ${D.combos[0].ilvl}+ · ${D.combos[0].price}</span>
        </div>
      </div>

      <div class="g-routes">
        <p class="g-cap">Crafting routes — three tried</p>
        <p class="g-target" data-craft-combo>Prism Weave + Snowstorm</p>
        ${routesOf('g-routegrid')}
      </div>
    </section>

    <section class="g-spec">
      <p class="g-cap">Combinations · ${D.totals.combos} found, ${D.combos.length} shown</p>
      <div class="g-specrows">
        ${D.combos.map((c) => `
          <button class="g-specrow" data-combo data-label="${c.notables.join(' + ')}">
            <span class="g-specname"><img src="${art.cluster(c.art)}" alt="">${c.notables.join(' + ')}</span>
            ${tagsOf(c)}
            <span class="g-specgear">${gearOf(c)}</span>
            <span class="g-specpct">${c.pct}%</span>
            ${bar(c.pct)}
          </button>`).join('')}
      </div>
      <div class="g-totals">
        <div><em>Builds tracked</em><b>${D.totals.builds}</b></div>
        <div><em>Characters</em><b>${D.totals.chars}</b></div>
        <div><em>Jewels</em><b>${D.totals.jewels}</b></div>
        <div><em>Skills</em><b>${D.totals.skills}</b></div>
      </div>
    </section>
  </div>

  <footer class="g-foot" data-status><span>Ready · 234 characters · 592 jewels · 34 combinations</span><span>poe.ninja · synthetic sample</span></footer>`;

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
      <div class="t-mods">
        <p class="t-cap">SELECTED COMBINATION — NOTABLES &amp; MODS</p>
        <p class="t-notarow">${notablesOf(D.combos[0])}</p>
        <p class="t-modrow">${modsOf(D.combos[0])}</p>
        <p class="t-gearrow">${gearOf(D.combos[0])}</p>
      </div>
      <div class="t-summary">
        <span>5 of 18 skills · floor 1.0%</span>
        <span>share total <b>66.3%</b></span>
        <span>sampled <b>234</b> of ${D.totals.builds} builds</span>
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
        <p class="t-cap">COMBINATIONS · 3 OF 34</p>
        ${D.combos.map((c) => `
          <button class="t-combo" data-combo data-label="${c.notables.join(' + ')}">
            <span class="t-cname">${c.notables.join(' + ')}</span><span class="t-cpct">${c.pct}%</span>${bar(c.pct)}
          </button>`).join('')}
      </div>

      <div class="t-ticket">
        <p class="t-cap">CRAFT TICKET — 3 ROUTES</p>
        <p class="t-target" data-craft-combo>Prism Weave + Snowstorm</p>
        ${routesOf('t-routes')}
        <div class="t-unique">${uniquesOf()}</div>
      </div>
    </aside>
  </div>

  <footer class="t-tape" data-status>
    <span class="t-tapelabel">TAPE</span>
    <div class="t-tapebody">
      <span>WINTER ORB 20.5% ▲2.4</span><span>MOLTEN STRIKE 17.8% ▼0.8</span><span>RIGHTEOUS FIRE 12.3% ▲0.3</span>
      <span>LIGHTNING STRIKE 9.6% ▲1.1</span><span>HEXBLAST 6.1% ▼0.2</span>
      <span>234 CHARACTERS · 592 JEWELS · 21 VOICES · 34 MEGALOMANIAC</span>
    </div>
  </footer>`;

/* ── 04 · STUDIO — creative tool ──────────────────────────────────────────── */
L.studio = () => `
  <header class="u-bar">
    <span class="u-mark"><img src="${A}/logo.png" alt=""><span>forever exiled</span></span>
    <nav class="u-tabs">${navLinks('')}</nav>
    <span class="u-file">cluster-large.json</span>
    <button class="u-sync" data-press>Sync</button>
  </header>

  <aside class="u-tools">
    <span class="u-tool on"></span><span class="u-tool"></span><span class="u-tool"></span>
    <span class="u-tool"></span><span class="u-tool"></span><span class="u-tool"></span>
    <span class="u-tool u-tool-last"></span>
  </aside>

  <section class="u-canvas">
    <div class="u-art">
      <img class="u-artbg" src="${art.asc(D.skill.asc)}" alt="">
      <div class="u-frame">
        <img src="${art.cluster('cluster_large')}" alt="">
        <img class="u-core" src="${art.gem(D.skill.gem)}" alt="">
        <span class="u-handle tl"></span><span class="u-handle tr"></span>
        <span class="u-handle bl"></span><span class="u-handle br"></span>
        <span class="u-size">1280 × 720</span>
      </div>
      <div class="u-canvasfoot">
        <span>${D.combos[0].size} cluster · ${D.combos[0].passives} passives</span>
        <span>iLvl ${D.combos[0].ilvl}+</span>
        <span>${D.combos[0].price}</span>
        <span class="u-zoom">72%</span>
      </div>
    </div>
    <div class="u-skillbar">
      ${D.skills.map((s, i) => `<button class="u-skill${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}
    </div>
  </section>

  <aside class="u-inspector">
    <div class="u-insphead">
      <h1 data-hero-name>${D.skill.name}</h1>
      <p>${D.skill.damage} · ${D.skill.builds} builds</p>
      <div class="u-inspstats" data-stats>
        ${stat('AVG', D.skill.avg)}${stat('PEAK', D.skill.peak)}
      </div>
    </div>

    <section class="u-sec">
      <p class="u-cap">Notables <span>3</span></p>
      ${notablesOf(D.combos[0])}
      <p class="u-cap">Modifiers <span>2</span></p>
      ${modsOf(D.combos[0])}
      <p class="u-cap">Socketing</p>
      <p class="u-gear">${gearOf(D.combos[0])}</p>
    </section>

    <section class="u-sec u-layers">
      <p class="u-cap">Layers — combinations <span>${D.combos.length}</span></p>
      ${D.combos.map((c, i) => `
        <button class="u-layer${i === 0 ? ' on' : ''}" data-combo data-label="${c.notables.join(' + ')}">
          <span class="u-eye"></span>
          <img src="${art.cluster(c.art)}" alt="">
          <span class="u-layername">${c.notables.join(' + ')}</span>
          <span class="u-layerpct">${c.pct}%</span>
        </button>`).join('')}
    </section>

    <section class="u-sec">
      <p class="u-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <p class="u-cap">Crafting routes</p>
      ${routesOf('u-routes')}
      <p class="u-target" data-craft-combo>Prism Weave + Snowstorm</p>
    </section>
  </aside>

  <footer class="u-status" data-status><span>124,363 builds · 234 characters · 592 jewels · 34 combinations</span><span>poe.ninja build API</span></footer>`;

/* ── 05 · EMBER — cinematic hero ──────────────────────────────────────────── */
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
        <p>area = share of the ladder · 18 skills above 1% · 34 combinations</p>
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
      <div class="a-uniquerow">
        <span class="a-cap">UNIQUE CLUSTER JEWELS</span>
        ${uniquesOf()}
        <span class="a-totals">124,363 builds · 592 jewels · 21 Voices · 34 Megalomaniac</span>
      </div>
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
          <button class="a-combo" data-combo data-label="${c.notables.join(' + ')}">
            <span class="a-comboline">
              <img src="${art.cluster(c.art)}" alt="">
              <span class="a-comboname">${c.notables.join(' + ')}</span>
              <span class="a-combodots"><i class="${c.size === 'Large' ? 'lg' : 'md'}"></i>${c.size} · ${c.passives}p</span>
              <span class="a-combopct">${c.pct}%</span>
            </span>
            <span class="a-combonot">${notablesOf(c)}</span>
            <span class="a-combomods">${modsOf(c)}</span>
            <span class="a-combogear">${gearOf(c)}</span>
            ${bar(c.pct)}
          </button>`).join('')}
      </div>

      <div class="a-craft">
        <p class="a-cap">CRAFTING — 3 ROUTES</p>
        <p class="a-target" data-craft-combo>Prism Weave + Snowstorm</p>
        ${routesOf('a-routes')}
        <button class="a-plan" data-press>Plan the craft</button>
      </div>
    </aside>
  </div>

  <footer class="a-status" data-status><span>Ready · 234 characters · 592 jewels · 34 combinations</span><span>POE.NINJA</span></footer>`;

/* ── 07 · SWITCHBOARD — control room console ──────────────────────────────── */
L.switchboard = () => `
  <header class="h-bar">
    <span class="h-mark">FOREVER EXILED</span>
    <nav class="h-tabs">${navLinks('')}</nav>
    <span class="h-status"><i></i>LIVE · 234 CHARACTERS</span>
    <button class="h-sync" data-press>SYNC</button>
  </header>

  <div class="h-deck">
    <section class="h-channels">
      ${D.skills.map((s, i) => `
        <button class="h-channel${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
          <span class="h-chan-head"><img src="${art.gem(s.gem)}" alt=""><b>${String(i + 1).padStart(2, '0')}</b></span>
          <span class="h-chan-name">${s.short}</span>
          <span class="h-chan-share">${s.pop}<em>%</em></span>
          <span class="h-fader">
            <i class="h-fader-track"></i>
            <i class="h-fader-fill" style="--v:${Number(s.pop) * 4}%"></i>
            <i class="h-fader-knob" style="--v:${Number(s.pop) * 4}%"></i>
          </span>
          <span class="h-meter">${[62, 48, 74, 55, 80].map((h) => `<i style="height:${h}%"></i>`).join('')}</span>
          <span class="h-chan-dps">${s.dps}</span>
        </button>`).join('')}
    </section>

    <section class="h-master">
      <div class="h-masterhead">
        <img src="${art.cluster('cluster_large')}" alt="">
        <div>
          <p class="h-kicker">MASTER · SELECTED BUILD</p>
          <h1 data-hero-name>${D.skill.name}</h1>
          <p class="h-sub">${D.skill.damage} · ${D.skill.classes}</p>
        </div>
        <div class="h-masterstats" data-stats>
          ${stat('AVG', D.skill.avg)}${stat('PEAK', D.skill.peak)}
        </div>
      </div>

      <div class="h-module">
        <p class="h-cap">Combinations — patch bay</p>
        ${D.combos.map((c) => `
          <button class="h-combo" data-combo data-label="${c.notables.join(' + ')}">
            <span class="h-jack"></span>
            <span class="h-combobody">
              <b>${c.notables.join(' + ')}</b>
              ${notablesOf(c)}
              ${modsOf(c)}
              <span class="fx-gear">${gearOf(c)}</span>
            </span>
            <span class="h-combopct">${c.pct}%</span>
            ${bar(c.pct)}
          </button>`).join('')}
      </div>

      <div class="h-module h-routemodule">
        <p class="h-cap">Crafting — 3 routes, best first</p>
        <p class="h-target" data-craft-combo>Prism Weave + Snowstorm</p>
        ${routesOf('h-routes')}
      </div>
    </section>

    <aside class="h-rack">
      <p class="h-cap">Notables — most used</p>
      <div class="h-notrack">
        ${D.notables.map(([n, p]) => `
          <div class="h-notrow"><span>${n}</span><i style="--p:${p}%"></i><b>${p}%</b></div>`).join('')}
      </div>
      <p class="h-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <p class="h-cap">All builds</p>
      <dl class="h-totals">
        <dt>Builds tracked</dt><dd>${D.totals.builds}</dd>
        <dt>Characters</dt><dd>${D.totals.chars}</dd>
        <dt>Jewels</dt><dd>${D.totals.jewels}</dd>
        <dt>Combinations</dt><dd>${D.totals.combos}</dd>
      </dl>
    </aside>
  </div>

  <footer class="h-foot" data-status><span>Ready · 234 characters · 592 jewels · 34 combinations</span><span>CH 01–05 · MASTER ARMED</span></footer>`;

/* ── 08 · PRISM — palette ─────────────────────────────────────────────────── */
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
L.ledger = () => `
  <header class="l-bar">
    <span class="l-mark"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav class="l-tabs">${navLinks('')}</nav>
    <div class="l-search"><i></i>Filter skills, jewels, mods</div>
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
      <div class="l-uniquebox">
        <p class="l-cap">Unique cluster jewels</p>
        ${uniquesOf()}
      </div>
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
          <button class="l-crow" data-combo data-label="${c.notables.join(' + ')}">
            <span class="l-cname"><img src="${art.cluster(c.art)}" alt="">${c.notables.join(' + ')}<em>${gearOf(c)}</em></span>
            <span class="l-csize">${c.size}</span>
            <span>${c.builds}</span>
            <span class="l-cshare">${c.pct}%</span>
            <span>${c.avg}</span>
          </button>`).join('')}
        <div class="l-tablefoot">3 of 34 combinations · ranked by builds running them</div>
      </div>

      <div class="l-mods">
        <div class="l-modcol">
          <p class="l-cap">Notables — selected combination</p>
          ${notablesOf(D.combos[0])}
        </div>
        <div class="l-modcol">
          <p class="l-cap">Modifiers</p>
          ${modsOf(D.combos[0])}
        </div>
        <div class="l-modcol">
          <p class="l-cap">Builds by cluster size</p>
          <div class="l-bars">
            <div><span>Large</span><i style="--w:78%"></i><b>13</b></div>
            <div><span>Medium</span><i style="--w:64%"></i><b>5</b></div>
            <div><span>Small</span><i style="--w:22%"></i><b>2</b></div>
          </div>
        </div>
      </div>
    </section>

    <aside class="l-side">
      <div class="l-craft">
        <p class="l-cap">Crafting — 3 routes</p>
        <p class="l-target" data-craft-combo>Prism Weave + Snowstorm</p>
        ${routesOf('l-routes')}
        <button class="l-plan" data-press>Plan</button>
      </div>
      <div class="l-sample">
        <p class="l-cap">All builds</p>
        <dl>
          <dt>Tracked</dt><dd>${D.totals.builds}</dd>
          <dt>Characters</dt><dd>234</dd>
          <dt>Jewels</dt><dd>592</dd>
          <dt>Combinations</dt><dd>34</dd>
          <dt>Snapshot</dt><dd>2026-11-07</dd>
        </dl>
      </div>
    </aside>
  </div>

  <footer class="l-status" data-status><span>Ready · 234 characters · 592 jewels</span><span>↑↓ select · ⌘K search · ⌘R sync</span></footer>`;

/* ── 10 · TROPHY — art wall ───────────────────────────────────────────────── */
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
    id: 'obsidian', name: 'Obsidian', tag: 'Bento cockpit',
    intent: 'A twelve-column bento: an art-led hero tile with the skill chips inside it, two metric tiles, then combinations with their notables and mods, the notables ranking and the crafting routes.',
    keeps: 'The most familiar of the ten, but with a focal point instead of a wall of equal panels.',
    costs: 'Tiles fix the proportions; long notable names have to truncate.',
    tags: ['bento', 'art hero', 'dense'],
    sw: ['#080b10', '#101822', '#3ddc97', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'blueprint', name: 'Blueprint', tag: 'Technical drawing',
    intent: 'A schematic sheet on dark drafting paper: the jewel drawn large with dimension lines, callouts pointing at its notables, its modifiers and its socketing, a specification list of combinations, and the three routes as a bill of materials.',
    keeps: 'Explains the item the way an engineer would, and every number has a leader line to what it describes.',
    costs: 'Annotation-heavy; the drawing needs room, so text is small by design.',
    tags: ['schematic', 'callouts', 'drafting'],
    sw: ['#071018', '#0b1a26', '#4fb8e8', '#c9a227', '#7fa8bd'],
  },
  {
    id: 'terminal', name: 'Terminal', tag: 'Market terminal',
    intent: 'A trading terminal: the skills as a tape with deltas, a quote panel with the sparkline, the selected combination with its gold notables and blue modifiers, a three-route craft ticket, and a ticker carrying the totals and the uniques.',
    keeps: 'The fastest way to compare skills down a column.',
    costs: 'Monospace everywhere, so art is reduced to 20px icons.',
    tags: ['tape', 'sparkline', 'monospace'],
    sw: ['#070b0a', '#0c1211', '#26d07c', '#d7a44a', '#5f8fdc'],
  },
  {
    id: 'studio', name: 'Studio', tag: 'Creative tool',
    intent: 'An editor: a tool rail, the jewel on a canvas with a selection frame and handles, the skills as a switcher under it, and an inspector that lists the notables, the modifiers, the combinations as layers, the uniques and the routes.',
    keeps: 'Feels like professional software, and the layer list is a natural home for combinations.',
    costs: 'Chrome costs pixels — the canvas has to stay large to justify it.',
    tags: ['editor', 'inspector', 'layers'],
    sw: ['#0b0c0f', '#14161b', '#8b7cff', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'ember', name: 'Ember', tag: 'Cinematic hero',
    intent: 'Full-bleed splash art, a 64px title over the grade, the notables under it, big numbers on hairlines, a glass card with the three routes, and three cards carrying each combination and its price.',
    keeps: "PoE's own palette and the largest art of any direction here.",
    costs: 'The least dense screen; deep links land on a picture.',
    tags: ['full-bleed', 'glass', 'big type'],
    sw: ['#120a06', '#2a1610', '#e0763f', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'atlas', name: 'Atlas', tag: 'Treemap',
    intent: 'The meta as a map: skills are rectangles whose width is their share, beside a detail column with the combinations, their socketing, the three routes and a strip of the unique jewels.',
    keeps: 'Answers "what is the meta" in one glance.',
    costs: 'Area comparisons are approximate; small skills get a sliver.',
    tags: ['treemap', 'area', 'meta'],
    sw: ['#04100f', '#0a2320', '#34d3a6', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'switchboard', name: 'Switchboard', tag: 'Control room',
    intent: 'Five channel strips with faders and meters, a master section with the selected build, a patch bay of combinations showing notables and modifiers, the routes as a module, and a rack of notables and totals.',
    keeps: 'Everything is a physical control, so nothing is decoration.',
    costs: 'The metaphor does not scale past five or six skills on screen.',
    tags: ['channels', 'faders', 'meters'],
    sw: ['#0c0a08', '#171310', '#e8a33d', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'prism', name: 'Prism', tag: 'Command palette',
    intent: 'A palette over blurred art: each result carries its combinations, socketing and its first modifier; the preview carries the art, the two DPS numbers, the notables and all three routes.',
    keeps: 'Keyboard-first, and it feels like a game overlay.',
    costs: 'Hides the rest of the app; the blur costs frames.',
    tags: ['palette', 'overlay', 'keyboard'],
    sw: ['#060a16', '#121a2e', '#7c8bff', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'ledger', name: 'Ledger', tag: 'Master / detail',
    intent: 'Three panes: the skills master with the unique jewels under it, a detail pane with the combinations table, the notables and modifiers of the selected one and the size distribution, and the three routes pinned right.',
    keeps: 'The fastest way to compare skills; one selection, one surface.',
    costs: 'Less decorative — the art becomes thumbnails.',
    tags: ['tables', 'three panes', 'dense'],
    sw: ['#0a0d11', '#11161c', '#5b9cf5', '#c9a227', '#6f9fe8'],
  },
  {
    id: 'trophy', name: 'Trophy', tag: 'Art wall',
    intent: 'A gallery: the build hung as a framed plate with its notables set under the title, painted tiles for each combination with its socketing and price, and a side column with the notables ranking, the uniques and the routes.',
    keeps: 'You can recognise a build from across the room.',
    costs: 'Needs art for everything, and it is the least dense of the ten.',
    tags: ['gallery', 'framed plate', 'minimal text'],
    sw: ['#0b0a08', '#17140f', '#e0a94a', '#c9a227', '#6f9fe8'],
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
