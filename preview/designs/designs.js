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


/* ══════════════════════════════════════════════════════════ 01 · DOSSIER ════ */

L.dossier = () => `
  <header class="d-bar">
    <span class="d-mark"><img src="${A}/logo.png" alt="">DOSSIER</span>
    <nav class="d-tabs">${navLinks('')}</nav>
    <div class="d-picks">${D.skills.map((s, i) => `<button class="d-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span></button>`).join('')}</div>
    <button class="d-sync" data-press>SYNC</button>
  </header>

  <div class="d-layout">
    <section class="d-portrait">
      <div class="d-frame">
        <img class="d-cluster" src="${art.cluster('cluster_large')}" alt="">
        <img class="d-gem" src="${art.gem(D.skill.gem)}" alt="">
        <span class="d-rarity">${D.combos[0].size} cluster</span>
      </div>
      <h1 data-hero-name>${D.skill.name}</h1>
      <p class="d-sub">${D.skill.damage} · ${D.skill.classes}</p>
      <ul class="d-facts">
        <li><span>Passives</span><b>${D.combos[0].passives}</b></li>
        <li><span>Item level</span><b>${D.combos[0].ilvl}+</b></li>
        <li><span>Price</span><b>${D.combos[0].price}</b></li>
        <li><span>Builds</span><b>${D.skill.builds}</b></li>
      </ul>
      <span class="d-sharebar">${bar(D.combos[0].pct)}</span>
    </section>

    <section class="d-main">
      <div class="d-stats" data-stats>${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK DPS', D.skill.peak)}</div>
      <div class="d-block">
        <p class="d-cap">Notables — this combination</p>
        ${notablesOf(D.combos[0])}
      </div>
      <div class="d-block">
        <p class="d-cap">Cluster modifiers</p>
        ${modsOf(D.combos[0])}
      </div>
      <div class="d-block">
        <p class="d-cap">Socketing</p>
        ${gearOf(D.combos[0])}
        <span class="d-barline">${bar(D.combos[0].pct)}</span>
      </div>
      <p class="d-note">${D.combos[0].builds} builds run this combination · ${D.skill.pop} of the ladder · ${D.skill.sampled} sampled</p>
    </section>

    <aside class="d-side">
      <p class="d-cap">Combinations · 3 of ${D.totals.combos}</p>
      ${D.combos.map((c) => `
        <button class="d-combo" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}">
          <img src="${art.cluster(c.art)}" alt="">
          <span class="d-combobody"><b>${c.notables.join(' + ')}</b><em>${c.size} · ${c.builds} builds · ${c.avg}</em></span>
          <span class="d-combopct">${c.pct}%</span>
        </button>`).join('')}
      <div class="d-craft">
        <p class="d-cap">Crafting — 3 routes</p>
        <b class="d-target" data-craft-combo>Prism Weave + Snowstorm</b>
        ${routesOf('d-routes')}
        <button class="d-plan" data-press>Open crafting</button>
      </div>
      <p class="d-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <dl class="d-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd><dt>Jewels</dt><dd>${D.totals.jewels}</dd>
      </dl>
    </aside>
  </div>

  <footer class="d-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>inspect · demo-2026-11-07</span></footer>
`;

/* ════════════════════════════════════════════════════════════ 02 · SHEET ═══ */

L.sheet = () => `
  <header class="s-bar">
    <span class="s-mark"><img src="${A}/logo.png" alt="">SHEET</span>
    <nav class="s-tabs">${navLinks('')}</nav>
    <span class="s-find"><i></i>Filter skills, jewels, modifiers</span>
    <span class="s-sizes">${sizeChips()}</span>
    <button class="s-sync" data-press>SYNC</button>
  </header>

  <div class="s-grid">
    <div class="s-head"><span>#</span><span>Skill</span><span>Share</span><span>Avg DPS</span><span>Peak</span><span>Combos</span></div>
    ${D.skills.map((s, i) => `
      <button class="s-row${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}">
        <span class="s-i">${String(i + 1).padStart(2, '0')}</span>
        <span class="s-name"><img src="${art.gem(s.gem)}" alt="">${s.name}</span>
        <span class="s-share">${s.pop}%</span>
        <span>${s.avg}</span>
        <span class="s-peak">${s.dps}</span>
        <span class="s-dim">${i === 0 ? D.combos.length : '—'}</span>
      </button>`).join('')}

    <div class="s-head s-chead"><span></span><span>Combination</span><span>Size</span><span>Builds</span><span>Share</span><span>Avg DPS</span></div>
    ${D.combos.map((c) => `
      <button class="s-row s-crow" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}">
        <span class="s-i"><img class="s-thumb" src="${art.cluster(c.art)}" alt=""></span>
        <span class="s-cname"><b>${c.notables.join(' + ')}</b>${modsOf(c)}${gearOf(c)}</span>
        <span>${c.size}</span>
        <span>${c.builds}</span>
        <span class="s-cshare">${c.pct}%</span>
        <span>${c.avg}</span>
      </button>`).join('')}
  </div>

  <div class="s-band">
    <div class="s-picked">
      <span class="s-cap">Selected build</span>
      <b class="s-pickedname" data-hero-name>${D.skill.name}</b>
      <div class="s-pickedstats" data-stats>${stat('AVG', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
    </div>
    <div class="s-craft">
      <span class="s-cap">Craft target</span>
      <b class="s-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('s-routes')}
    </div>
    <div class="s-uniques">
      <span class="s-cap">Unique cluster jewels</span>
      ${uniquesOf()}
      ${notablesOf(D.combos[0])}
    </div>
    <dl class="s-totals">
      <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
      <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Combinations</dt><dd>${D.totals.combos}</dd>
    </dl>
  </div>

  <footer class="s-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>5 of 18 skills · 3 of 34 combinations</span></footer>
`;

/* ════════════════════════════════════════════════════════ 03 · BROADSHEET ═══ */

L.broadsheet = () => `
  <header class="b-mast">
    <div class="b-word">Forever Exiled</div>
    <nav class="b-tabs">${navLinks('')}</nav>
    <span class="b-date">Allflame · 07 Nov 2026</span>
    <button class="b-sync" data-press>SYNC</button>
  </header>

  <div class="b-spread">
    <article class="b-story">
      <p class="b-kicker">Cluster jewels · the winter league</p>
      <h1 data-hero-name>${D.skill.name}</h1>
      <p class="b-deck">${D.skill.damage} damage across ${D.skill.classes.toLowerCase()} — ${D.skill.pop} of every ladder we sample.</p>
      <p class="b-lead"><span class="b-dropcap">T</span>he build is not one jewel but three, and the ledger says the same thing every week: a large cluster carrying ${D.combos[0].notables.join(', ')} is what ${D.combos[0].builds} characters socket first. The modifiers underneath — ${D.combos[0].mods.join('; ')} — are what make the small passives pay.</p>

      <div class="b-pull" data-stats>
        <span class="b-pullnum">${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK DPS', D.skill.peak)}</span>
        <em>Both numbers read off ${D.skill.sampled} sampled builds.</em>
      </div>

      <p class="b-runin"><span>Notables.</span> ${notablesOf(D.combos[0])}</p>
      <p class="b-runin"><span>Socketing.</span> ${gearOf(D.combos[0])}</p>

      <div class="b-entries">
        ${D.combos.map((c) => `
          <button class="b-entry" data-combo data-label="${c.notables.join(' + ')}">
            <span class="b-entryhead"><b>${c.notables.join(' + ')}</b><i>${c.pct}%</i></span>
            ${notablesOf(c)}
            ${modsOf(c)}
            ${bar(c.pct)}
          </button>`).join('')}
      </div>
    </article>

    <aside class="b-rail">
      <p class="b-cap">The ladder</p>
      <div class="b-picks">${D.skills.map((s, i) => `<button class="b-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}"><img src="${art.gem(s.gem)}" alt=""><span>${s.short}</span><b>${s.pop}%</b></button>`).join('')}</div>
      <p class="b-cap">Crafting — 3 routes</p>
      <b class="b-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('b-routes')}
      <p class="b-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <dl class="b-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
        <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Combinations</dt><dd>${D.totals.combos}</dd>
      </dl>
    </aside>
  </div>

  <footer class="b-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>compiled from the poe.ninja build API · synthetic sample</span></footer>
`;

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
    <li><span>Socketing</span><div>${gearOf(c)}</div></li>`;
  return `
  <header class="t-bar">
    <span class="t-mark"><img src="${A}/logo.png" alt="">TIERS</span>
    <nav class="t-tabs">${navLinks('')}</nav>
    <span class="t-scope">${D.skills.map((s, i) => `<button class="t-scopegem${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</span>
    <button class="t-sync" data-press>SYNC</button>
  </header>

  <section class="t-head">
    <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.classes}</p></div>
    <div class="t-headstats" data-stats>${stat('AVERAGE', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
  </section>

  <div class="t-plans">
    ${D.combos.map((c, i) => `
      <article class="t-plan${i === 1 ? ' feat' : ''}">
        ${i === 1 ? '<span class="t-ribbon">Most built</span>' : ''}
        <p class="t-tier">${c.size} cluster · ${c.passives} passives · iLvl ${c.ilvl}+</p>
        <h2>${c.notables.join(' + ')}</h2>
        <p class="t-price">${c.price}<em>${c.pct}% of builds · ${c.builds} builds · ${c.avg} avg</em></p>
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

/* ═══════════════════════════════════════════════════════════════ 07 · HUD ═══ */

L.hud = () => `
  <div class="u-field"></div>
  <div class="u-frame"><i class="u-c tl"></i><i class="u-c tr"></i><i class="u-c bl"></i><i class="u-c br"></i></div>

  <header class="u-topleft">
    <span class="u-mark"><img src="${A}/logo.png" alt="">SCAN</span>
    <div class="u-skill">
      <img src="${art.gem(D.skill.gem)}" alt="">
      <div><h1 data-hero-name>${D.skill.name}</h1><p>${D.skill.damage} · ${D.skill.pop} of the ladder</p></div>
    </div>
    <div class="u-picks">${D.skills.map((s, i) => `<button class="u-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</div>
  </header>

  <section class="u-topright">
    <nav class="u-tabs">${navLinks('')}</nav>
    <div class="u-stats" data-stats>${stat('AVERAGE', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
  </section>

  <section class="u-centre">
    <img class="u-jewel" src="${art.cluster('cluster_large')}" alt="">
    <img class="u-core" src="${art.gem(D.skill.gem)}" alt="">
    <span class="u-gearline">${gearOf(D.combos[0])}</span>
  </section>

  <section class="u-tabsrow">
    ${D.combos.map((c) => `<button class="u-combo" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}"><b>${c.notables.join(' + ')}</b><span>${c.pct}%</span></button>`).join('')}
  </section>

  <section class="u-bottomleft">
    <p class="u-cap">Notables in play</p>
    ${notablesOf(D.combos[0])}
    <p class="u-cap">Cluster modifiers</p>
    ${modsOf(D.combos[0])}
  </section>

  <section class="u-bottomright">
    <p class="u-cap">Crafting — 3 routes</p>
    <b class="u-target" data-craft-combo>Prism Weave + Snowstorm</b>
    ${routesOf('u-routes')}
    <p class="u-cap">Unique cluster jewels</p>
    ${uniquesOf()}
  </section>

  <footer class="u-strip" data-status>
    <span>124,363 builds</span><span>234 characters</span><span>592 jewels</span><span>34 combinations</span>
    <span class="u-stripend">snapshot demo-2026-11-07</span>
  </footer>
`;

/* ═══════════════════════════════════════════════════════════ 09 · COMPARE ═══ */

L.compare = () => {
  const [CA, CB] = D.combos;
  const rows = [
    ['Notables', CA.notables.join(', '), CB.notables.join(', ')],
    ['Modifiers', CA.mods.join(' · '), CB.mods.join(' · ')],
    ['Socketing', `${CA.size} · ${CA.passives} passives · iLvl ${CA.ilvl}+`, `${CB.size} · ${CB.passives} passives · iLvl ${CB.ilvl}+`],
    ['Price', CA.price, CB.price],
    ['Builds running it', CA.builds, CB.builds],
    ['Share of builds', `${CA.pct}%`, `${CB.pct}%`],
    ['Average DPS', CA.avg, CB.avg],
  ];
  return `
  <header class="g-bar">
    <span class="g-mark"><img src="${A}" alt="">COMPARE</span>
    <nav class="g-tabs">${navLinks('')}</nav>
    <span class="g-hint">socketing the same skill two ways</span>
    <button class="g-sync" data-press>SYNC</button>
  </header>

  <div class="g-panes">
    <aside class="g-rail">
      <p class="g-cap">Skill</p>
      <div class="g-switch">${D.skills.map((s, i) => `<button class="g-switchgem${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</div>
      <p class="g-cap">Pick a combination</p>
      ${D.combos.map((c, i) => `
        <button class="g-pick${i === 0 ? ' on' : ''}" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}">
          <img src="${art.cluster(c.art)}" alt="">
          <span class="g-pickbody"><b>${c.notables.join(' + ')}</b><em>${c.size} · ${c.passives} passives · ${c.pct}%</em></span>
        </button>`).join('')}
      <p class="g-cap">Craft target</p>
      <b class="g-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('g-routes')}
    </aside>

    <section class="g-table">
      <div class="g-selected">
        <div>
          <p class="g-cap">Skill</p>
          <h1 data-hero-name>${D.skill.name}</h1>
          <span class="g-colpct">${D.skill.pop} of the ladder · ${D.skill.builds} builds</span>
        </div>
        <div class="g-selstats" data-stats>${stat('AVERAGE', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
      </div>
      <div class="g-cols">
        <div class="g-col">
          <p class="g-colcap">Option A · socketed now</p>
          <h2>${CA.notables.join(' + ')}</h2>
          <span class="g-colpct">${CA.pct}% of builds</span>
        </div>
        <div class="g-col g-colb">
          <p class="g-colcap">Option B · the alternative</p>
          <h2>${CB.notables.join(' + ')}</h2>
          <span class="g-colpct">${CB.pct}% of builds</span>
        </div>
      </div>

      <div class="g-rows">
        ${rows.map(([label, av, bv]) => `
          <div class="g-row"><span class="g-label">${label}</span><span>${av}</span><span class="g-b">${bv}</span></div>`).join('')}
      </div>

      <div class="g-pairs">
        <div class="g-block"><p class="g-cap">Notables — A</p>${notablesOf(CA)}</div>
        <div class="g-block"><p class="g-cap">Modifiers — A</p>${modsOf(CA)}</div>
        <div class="g-block"><p class="g-cap">Socketing — A</p>${gearOf(CA)}<span class="g-barline">${bar(CA.pct)}</span></div>
      </div>

      <div class="g-bottom">
        <div class="g-uniques"><p class="g-cap">Unique cluster jewels</p>${uniquesOf()}</div>
        <dl class="g-totals">
          <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd>
          <dt>Jewels</dt><dd>${D.totals.jewels}</dd><dt>Combinations</dt><dd>${D.totals.combos}</dd>
        </dl>
      </div>
    </section>
  </div>

  <footer class="g-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>A: ${CA.builds} builds · B: ${CB.builds} builds</span></footer>
`;
};

/* ═══════════════════════════════════════════════════════════ 10 · VITRINE ══ */

L.vitrine = () => `
  <header class="z-bar">
    <span class="z-mark"><img src="${A}/logo.png" alt="">VITRINE</span>
    <nav class="z-tabs">${navLinks('')}</nav>
    <span class="z-case">CASE 01 / 03 · LARGE</span>
    <button class="z-sync" data-press>SYNC</button>
  </header>

  <div class="z-hall">
    <aside class="z-tags">
      <p class="z-cap">In this case</p>
      ${D.combos.map((c) => `
        <button class="z-tag" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}">
          <img src="${art.cluster(c.art)}" alt="">
          <span><b>${c.notables.join(' + ')}</b><em>${c.size} · ${c.pct}%</em></span>
        </button>`).join('')}
      <p class="z-cap">Ladder</p>
      <div class="z-picks">${D.skills.map((s, i) => `<button class="z-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</div>
    </aside>

    <section class="z-stage">
      <div class="z-spot"></div>
      <figure class="z-casebox">
        <div class="z-glass">
          <img class="z-jewel" src="${art.cluster('cluster_large')}" alt="">
          <img class="z-gem" src="${art.gem(D.skill.gem)}" alt="">
        </div>
        <span class="z-plinth"></span>
        <figcaption>
          <p class="z-kicker" data-hero-name>${D.skill.name}</p>
          <p class="z-line">${D.skill.damage} · ${D.skill.classes}</p>
        </figcaption>
      </figure>
    </section>

    <aside class="z-plaque">
      <p class="z-cap">Plaque</p>
      <h1>${D.combos[0].notables.join(' + ')}</h1>
      <p class="z-socket">${gearOf(D.combos[0])}</p>
      <div class="z-rows">
        <p class="z-cap">Notables</p>
        ${notablesOf(D.combos[0])}
        <p class="z-cap">Modifiers</p>
        ${modsOf(D.combos[0])}
      </div>
      <div class="z-scores" data-stats>${stat('AVERAGE', D.skill.avg)}${stat('PEAK', D.skill.peak)}</div>
      <div class="z-craft">
        <p class="z-cap">Crafting — 3 routes</p>
        <b class="z-target" data-craft-combo>Prism Weave + Snowstorm</b>
        ${routesOf('z-routes')}
      </div>
      <p class="z-cap">Unique cluster jewels</p>
      ${uniquesOf()}
      <dl class="z-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd><dt>Characters</dt><dd>${D.totals.chars}</dd><dt>Jewels</dt><dd>${D.totals.jewels}</dd>
      </dl>
    </aside>
  </div>

  <footer class="z-status" data-status><span>124,363 builds · 234 characters · 592 jewels</span><span>case 1 of 3 · snapshot demo-2026-11-07</span></footer>
`;


const VARIANTS = [
  {
    id: 'dossier', name: 'Dossier', tag: 'Item inspection',
    intent: 'A game item screen: the jewel on a framed plate with its socketed gem, the stat block and the notables and modifiers read down the middle, and the three combinations plus the crafting routes and the uniques down the right.',
    keeps: 'The closest to how an ARPG actually presents an item — you inspect one thing, everything about it is in view.',
    costs: 'One combination at a time; the other two are only a line each.',
    tags: ['inspection', 'item frame', 'three panes'],
    sw: ['#0c0d11', '#15171d', '#ff3b3b', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'sheet', name: 'Sheet', tag: 'Data grid',
    intent: 'A spreadsheet: a toolbar with the filter and the size chips, five skill rows, then the three combinations as dense rows carrying their modifiers and socketing in the cell, with the craft target and the totals pinned underneath.',
    keeps: 'The most information per pixel, and sorting and scanning are natural.',
    costs: 'Text-forward; the art is limited to 20px thumbnails.',
    tags: ['grid', 'rows', 'dense'],
    sw: ['#0a0c10', '#12151b', '#38bdf8', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'broadsheet', name: 'Broadsheet', tag: 'Editorial',
    intent: 'A newspaper spread: serif masthead, a headline set large with a drop cap, the analysis written as prose with the notables and socketing as run-in notes, a pull quote carrying the two DPS numbers, three short entries, and a rail with the ladder, the routes and the uniques.',
    keeps: 'Reads like a build guide, and the prose carries the relationships between the numbers.',
    costs: 'Typographic; no interaction density.',
    tags: ['editorial', 'serif', 'prose'],
    sw: ['#0c0c0d', '#141416', '#a78bfa', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'orbit', name: 'Orbit', tag: 'Radial graph',
    intent: 'A radial graph: the skill sits at the core, concentric rings carry the share arcs, the tick band turns it into an instrument, and each combination is a node on the orbit; the panel beside it holds the selected node, the ranking, the uniques and the routes.',
    keeps: 'Relationships are spatial — three combinations around one skill at once.',
    costs: 'Long notable names have to wrap inside a node.',
    tags: ['radial', 'nodes', 'spatial'],
    sw: ['#07060f', '#100c1e', '#dd5ce0', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'nocturne', name: 'Nocturne', tag: 'Cinematic hero',
    intent: 'Full-bleed splash art, a 64px title starting at the top edge, the notables under it, the numbers on the baseline above the strip, a glass card with the three routes, and three cards carrying each combination, its modifiers and its price.',
    keeps: 'The largest art of any direction here.',
    costs: 'The least dense screen; deep links land on a picture.',
    tags: ['full-bleed', 'glass', 'poster'],
    sw: ['#0b0812', '#1d1630', '#ff6b9d', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'tiers', name: 'Tiers', tag: 'Comparison plans',
    intent: 'Three plans side by side, one per combination: price, share and the socketing line, then three feature rows — notables, modifiers, socketing — with the recommended plan lifted; underneath, the notables ranking, the routes and the totals.',
    keeps: 'The fastest way to answer "which jewel do I socket".',
    costs: 'Reads as a pricing page, which is deliberate here.',
    tags: ['plans', 'features', 'compare'],
    sw: ['#080b12', '#101828', '#58a6ff', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'hud', name: 'HUD', tag: 'Heads-up display',
    intent: 'A game HUD: corner clusters over a scanlined field — the skill and the ladder at top left, the numbers at top right, the jewel under brackets in the centre, the three combinations as a tab row under it, the notables bottom left and the routes and uniques bottom right.',
    keeps: 'Everything anchored to an edge, the object in the middle — a cockpit, not a page.',
    costs: 'Corner panels cap how much text each one can hold.',
    tags: ['hud', 'corners', 'in-game'],
    sw: ['#05070a', '#0b1016', '#22d3ee', '#f08fae', '#7fb3f5'],
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
    id: 'compare', name: 'Compare', tag: 'A / B diff',
    intent: 'A two-way diff: pick a combination on the left, and its notables, modifiers, socketing, price, builds, share and average DPS line up against the alternative, row by row; the craft target, the uniques and the totals sit underneath.',
    keeps: 'The decision is the point — two jewels, attribute by attribute.',
    costs: 'Shows two combinations, so the third waits in the rail.',
    tags: ['diff', 'a/b', 'decision'],
    sw: ['#0a0b0e', '#131519', '#cfd8e6', '#f08fae', '#7fb3f5'],
  },
  {
    id: 'vitrine', name: 'Vitrine', tag: 'Museum case',
    intent: 'A museum hall: the jewel spotlit inside a glass case on a plinth, specimen tags for the other combinations on the left, and a plaque on the right engraved with the notables, the modifiers, the socketing, the two numbers, the routes and the uniques.',
    keeps: 'The object is the hero, and the plaque does the reading.',
    costs: 'Ceremonial; it will not scale past a handful of cases.',
    tags: ['museum', 'spotlight', 'plaque'],
    sw: ['#0d0b0e', '#171318', '#efe3ea', '#f08fae', '#7fb3f5'],
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
