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

/* ══════════════════════════════════════════════════════ ATRIUM — the one ═══
   The merged 04 + 05 direction: cinematic cover, inspector panel, combinations
   stacked top-down. The five gallery entries below are palettes of this DOM.  */

L.atrium = () => `
  <img class="a-backdrop" src="${art.asc(D.skill.asc)}" alt="">
  <div class="a-shade"></div>

  <header class="a-bar">
    <span class="a-brand"><img src="${A}/logo.png" alt="">forever exiled</span>
    <nav class="a-tabs">${navLinks('')}</nav>
    <button class="a-sync" data-press>Sync ladder</button>
  </header>

  <div class="a-body">
    <section class="a-main">
      <p class="a-kicker">Cluster Jewels · ${D.combos[0].size} · iLvl ${D.combos[0].ilvl}+</p>
      <div class="a-titlerow">
        <img class="a-gem" src="${art.gem(D.skill.gem)}" alt="">
        <div>
          <h1 data-hero-name>${D.skill.name}</h1>
          <p class="a-sub">${D.skill.damage} damage · ${D.skill.classes}</p>
        </div>
      </div>
      <p class="a-notarow">${notablesOf(D.combos[0])}</p>
      <div class="a-stats" data-stats>
        ${stat('AVERAGE DPS', D.skill.avg)}${stat('PEAK DPS', D.skill.peak)}
        <div class="stat"><em>BUILDS</em><b class="val">${D.skill.builds}</b></div>
      </div>

      <div class="a-list">
        ${D.combos.map((c) => `
          <button class="a-card" data-combo data-label="${c.notables.join(' + ')}" data-cluster-size="${c.size}">
            <img class="a-cardart" src="${art.cluster(c.art)}" alt="">
            <span class="a-cardbody">
              <b>${c.notables.join(' + ')}</b>
              ${notablesOf(c)}
              ${modsOf(c)}
              ${gearOf(c)}
              ${bar(c.pct)}
            </span>
            <span class="a-cardpct">${c.pct}%</span>
          </button>`).join('')}
      </div>
    </section>

    <aside class="a-panel">
      <div class="a-selected">
        <p class="a-cap">Selected combination</p>
        <h2>${D.combos[0].notables.join(' + ')}</h2>
        ${notablesOf(D.combos[0])}
        ${modsOf(D.combos[0])}
        <span class="a-selgear">${gearOf(D.combos[0])}</span>
        <span class="a-selbar">${bar(D.combos[0].pct)}</span>
      </div>

      <div class="a-picks">${D.skills.map((s, i) => `<button class="a-pick${i === 0 ? ' on' : ''}" data-pick data-label="${s.name}" title="${s.name}"><img src="${art.gem(s.gem)}" alt=""></button>`).join('')}</div>

      <p class="a-cap">Most used notables</p>
      <div class="a-notlist">${D.notables.map(([n, p]) => `<div class="a-notrow"><span>${n}</span><i style="--p:${p}%"></i><b>${p}%</b></div>`).join('')}</div>

      <p class="a-cap">Unique cluster jewels</p>
      ${uniquesOf()}

      <p class="a-cap">Crafting — 3 routes</p>
      <b class="a-target" data-craft-combo>Prism Weave + Snowstorm</b>
      ${routesOf('a-routes')}

      <dl class="a-totals">
        <dt>Builds</dt><dd>${D.totals.builds}</dd>
        <dt>Characters</dt><dd>${D.totals.chars}</dd>
        <dt>Jewels</dt><dd>${D.totals.jewels}</dd>
      </dl>
    </aside>
  </div>

  <footer class="a-status" data-status><span>124,363 builds · 234 characters · 592 jewels · 34 combinations</span><span>snapshot demo-2026-11-07</span></footer>
`;


const VARIANTS = [
  {
    id: 'crimson', layout: 'atrium', theme: 'crimson', name: 'Atrium · Crimson', tag: 'Red',
    intent: 'The original direction with the pink taken out: a vivid red accent on a near-neutral warm black, red-tinted hairlines, and the same glass panel. Notables sit in light red, cluster modifiers stay steel blue, so the screen reads red-and-blue rather than pink.',
    keeps: 'The atmosphere of the first pass — the halo, the art washing into the field — without the candy tint.',
    costs: 'Red carries more urgency than pink did; the panel is a little less soft.',
    tags: ['crimson', 'warm', 'high contrast'],
    sw: ['#0b080d', '#191320', '#ff4d5e', '#ff9aa4', '#86b6ff'],
  },
  {
    id: 'violet', layout: 'atrium', theme: 'violet', name: 'Atrium · Violet', tag: 'Violet',
    intent: 'A saturated violet accent on a violet-black field: the halo, the glass and the hairlines all take the hue, the numbers go lavender, and the modifiers move to cyan so they still read as a second category.',
    keeps: 'The most theatrical of the five — closest to the splash art in the backdrop.',
    costs: 'Violet on violet is the lowest contrast pairing here; small caps lose a little weight.',
    tags: ['violet', 'theatrical', 'cool'],
    sw: ['#0a0817', '#191233', '#a06bff', '#c9a9ff', '#6fd6ff'],
  },
  {
    id: 'azure', layout: 'atrium', theme: 'azure', name: 'Atrium · Azure', tag: 'Blue',
    intent: 'A clear azure accent on a navy-black field, pale blue text and pale blue notables, with the modifiers pushed to violet. The most conventional of the five: the colour stays out of the way of the data.',
    keeps: 'The easiest to read for long — nothing in the palette asks for attention.',
    costs: 'The safest and the least distinctive; blue is what every tool already uses.',
    tags: ['azure', 'legible', 'tooling'],
    sw: ['#070c18', '#131c33', '#4b8dff', '#9dc0ff', '#c8a6ff'],
  },
  {
    id: 'cyan', layout: 'atrium', theme: 'cyan', name: 'Atrium · Cyan', tag: 'Cyan',
    intent: 'A cyan accent on a deep teal-black field that matches the cold damage of the build, pale cyan numbers, and violet reserved for the cluster modifiers so the two feature categories never blur.',
    keeps: 'The accent and the content agree — a cold skill in a cold palette.',
    costs: 'Cyan glows, so the frame feels brighter than the others even at the same darkness.',
    tags: ['cyan', 'cold', 'atmospheric'],
    sw: ['#061318', '#0f242c', '#2ad4e6', '#8fe9f5', '#b58cff'],
  },
  {
    id: 'noir', layout: 'atrium', theme: 'noir', name: 'Atrium · Noir', tag: 'Black & white',
    intent: 'The same screen with no hue left in it: pure black field, white accent, white hairlines, white notables and a single cool grey for the cluster modifiers. Nothing about the layout, the type or the controls changes — only the colour, plus the desaturated splash art behind it.',
    keeps: 'The most neutral reading of the screen — the data is the only thing with contrast.',
    costs: 'Without a hue the panel and the art flatten into one another more than in the coloured palettes.',
    tags: ['noir', 'monochrome', 'neutral'],
    sw: ['#000000', '#0c0c0e', '#f4f6f8', '#eef0f3', '#9fa8b6'],
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
      <div class="v-frame"><div class="mock m-${v.layout || v.id} t-${v.theme || v.id}" data-layout="${v.id}">${L[v.layout || v.id]()}</div></div>
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
    <div class="idx-cap">The five</div>
    ${VARIANTS.map((v, i) => `
      <a href="#${v.id}" data-target="${v.id}">
        <b>${String(i + 1).padStart(2, '0')}</b><span>${v.name}</span>
      </a>`).join('')}
    <div class="idx-foot">One layout, five palettes. Hover and click inside any frame: skills and combinations all answer.</div>`;

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
