/*
 * Ten design directions for Forever Exiled.
 *
 * One mock, ten skins. Every variant renders the same content — Winter Orb, its cluster
 * combinations, the crafting card — so the comparison is about the interface and nothing else.
 * Skin differences live in designs.css; this file only decides structure (sidebar or top nav,
 * KPI strip, art wall) and fills in the data.
 */

'use strict';

const A = '../assets';

const SKILLS = [
  { gem: 'winter_orb', asc: 'occultist', name: 'Winter Orb', cls: 'Cold', dps: '145M', pop: '20.5' },
  { gem: 'molten_strike_of_the_zenith', asc: 'pathfinder', name: 'Molten Strike of the Zenith', cls: 'Fire', dps: '128M', pop: '17.8' },
  { gem: 'righteous_fire', asc: 'champion', name: 'Righteous Fire', cls: 'Fire', dps: '96M', pop: '12.3' },
  { gem: 'lightning_strike', asc: 'deadeye', name: 'Lightning Strike', cls: 'Lightning', dps: '88M', pop: '9.6' },
  { gem: 'hexblast', asc: 'occultist', name: 'Hexblast', cls: 'Chaos', dps: '74M', pop: '6.1' },
];

const COMBOS = [
  { art: 'cluster_large', size: 'Large', passives: 12, label: 'Prism Weave + Snowstorm + Sadist', pct: 68, builds: 15, dps: '41.2M' },
  { art: 'cluster_medium', size: 'Medium', passives: 8, label: 'Blanketed Snow + Cold to the Core', pct: 44, builds: 10, dps: '38.7M' },
  { art: 'cluster_medium', size: 'Medium', passives: 6, label: 'Eye to Eye + Repeater', pct: 31, builds: 7, dps: '44.1M' },
];

const NAV = [
  ['Cluster Jewels', true],
  ["Watcher's Eyes", false],
  ['Rare Items', false],
  ['Flasks', false],
  ['Economy', false],
];

const VARIANTS = [
  {
    id: 'v1', name: 'Obsidian Glass',
    intent: 'What we have, tightened: the same sidebar and glass, one accent, more air, less chrome.',
    keeps: 'Continuity — nothing to relearn, and it already sits next to poe.ninja without shouting.',
    costs: 'The least surprising of the ten. Polish, not a statement.',
    tags: ['glass cards', '204px sidebar', 'green accent'],
    sw: ['#080c11', '#141d27', '#3fae7a', '#e8eef4', '#93a3b3'],
    flags: [],
  },
  {
    id: 'v2', name: 'Codex',
    intent: 'The in-game item card becomes the frame: parchment panels, gold hairlines, serif headings, ink text.',
    keeps: 'The cluster jewel tooltip already speaks this language — the app would finally look like the game it reads.',
    costs: 'Warm surfaces are harder to compare against poe.ninja, and serif at 12px needs a bigger base size.',
    tags: ['parchment', 'gold hairline', 'serif'],
    sw: ['#171310', '#241d16', '#c9a227', '#efe4d2', '#9a8a72'],
    flags: [],
  },
  {
    id: 'v3', name: 'Terminal',
    intent: 'Read the ladder like a log: monospace, hairline rules, no cards at all, one amber accent, everything tabular.',
    keeps: 'Density and scanning speed. It reads as a tool, which is what it is.',
    costs: 'Less inviting to open, and the jewel art has to fight the type for attention.',
    tags: ['monospace', 'no cards', 'amber'],
    sw: ['#0a0b0a', '#101210', '#d69a3c', '#d8e0d4', '#7d8b7c'],
    flags: [],
  },
  {
    id: 'v4', name: 'Sanctum',
    intent: 'Daylight: off-white paper, slate ink, jade accent, soft elevation, generous line-height.',
    keeps: 'Reads as professional software rather than a fan tool, and screenshots beautifully.',
    costs: 'PoE art is painted for dark backgrounds; the gem tiles need a dark frame to survive.',
    tags: ['light theme', 'jade', 'soft shadow'],
    sw: ['#f5f7f9', '#ffffff', '#0f7a55', '#1a2430', '#5b6b7c'],
    flags: [],
  },
  {
    id: 'v5', name: 'Ember',
    intent: 'Charcoal and ember: near-black with a warm rust accent, glow spent only on the selected row.',
    keeps: "PoE's own fire palette. Hierarchy comes from colour instead of borders.",
    costs: 'Orange sits close to the unique-item rarity colour, so uniques need a second signal.',
    tags: ['charcoal', 'rust', 'selective glow'],
    sw: ['#0d0a09', '#1a1413', '#c2593a', '#f0e6e0', '#98837a'],
    flags: [],
  },
  {
    id: 'v6', name: 'Atlas',
    intent: 'A dashboard: KPI strip on top, top navigation, combinations as a two-column card grid.',
    keeps: 'Answers "what is the meta right now" without a single click.',
    costs: 'Fewer pictures per screen, and every tile needs a designed empty state.',
    tags: ['top nav', 'KPI strip', 'card grid'],
    sw: ['#08110f', '#0f1c1a', '#2fa27a', '#e6f0ec', '#7f9c93'],
    flags: ['nav-top', 'dash'],
  },
  {
    id: 'v7', name: 'Brutalist',
    intent: 'Vaal brutalism: hard black, 2px rules, zero radius, oversized numerals, no gradients anywhere.',
    keeps: 'Flat, fast and unambiguous. It will still look deliberate in five years.',
    costs: 'Naked next to poe.ninja, and there is no softness for a four-hour session.',
    tags: ['0 radius', '2px rules', 'big numerals'],
    sw: ['#000000', '#0b0b0b', '#e8ff3a', '#ffffff', '#8a8a8a'],
    flags: ['nav-top'],
  },
  {
    id: 'v8', name: 'Prism',
    intent: 'Arcane glass pushed further: coloured light behind frosted panels, layered depth, floating cards.',
    keeps: 'The expensive-game-UI feeling, and painted art sits beautifully on it.',
    costs: 'Blur costs frames on weak GPUs, and contrast has to be checked on every panel.',
    tags: ['frosted', 'bloom', 'layered depth'],
    sw: ['#070b16', '#111a2b', '#6f7bff', '#e9eefb', '#8f9ab5'],
    flags: [],
  },
  {
    id: 'v9', name: 'Ledger',
    intent: "A split view: skills as a dense table on the left, the selected skill's detail on the right, rules instead of cards.",
    keeps: 'The fastest way to compare skills. One selection, one surface, no scrolling.',
    costs: 'Less decorative — the art shrinks to thumbnails and the screen looks like a spreadsheet.',
    tags: ['master/detail', 'rules', 'dense'],
    sw: ['#0b0d10', '#12161b', '#4d9de0', '#e6ebf0', '#8b98a6'],
    flags: ['nav-top'],
  },
  {
    id: 'v10', name: 'Trophy',
    intent: 'Art first: skills and combinations as large painted tiles, the numbers reduced to captions.',
    keeps: 'You can recognise a build from across the room, and the screen is photographs rather than paragraphs.',
    costs: 'Wastes vertical space, and it needs art for every item we will ever show.',
    tags: ['art tiles', 'minimal text', 'gallery'],
    sw: ['#0a0a0c', '#141419', '#d8a24a', '#f2ece2', '#9c8f7c'],
    flags: ['nav-top', 'wall'],
  },
];

/* ------------------------------------------------------------------ markup */

const railRow = (s, i) => `
  <div class="mk-skill${i === 0 ? ' on' : ''}">
    <span class="mk-gem sm"><img src="${A}/gems/${s.gem}.png" alt=""></span>
    <span class="mk-skill-txt"><b>${s.name}</b><em>${s.cls} · ${s.pop}% of ladder</em></span>
    <span class="mk-skill-dps">${s.dps}</span>
  </div>`;

const comboRow = (c) => `
  <div class="mk-combo">
    <span class="mk-cart"><img src="${A}/${c.art}.png" alt=""></span>
    <div class="mk-combo-body">
      <div class="mk-combo-top">
        <b>${c.label}</b>
        <span class="mk-pct">${c.pct}%</span>
      </div>
      <div class="mk-combo-sub">
        <span>${c.size} · ${c.passives} passives</span>
        <span>${c.builds} builds</span>
        <span>${c.dps} avg</span>
      </div>
      <div class="mk-bar"><i style="width:${c.pct}%"></i></div>
    </div>
  </div>`;

const navMarkup = (cls) => NAV.map(([label, on]) => `
  <a class="${on ? 'on' : ''}${cls}"><i class="mk-dot"></i>${label}</a>`).join('');

const mockMarkup = () => `
  <aside class="mk-side">
    <div class="mk-brand"><img src="${A}/logo.png" alt=""><span>forever exiled</span></div>
    <div class="mk-nav">${navMarkup('')}</div>
    <div class="mk-side-foot"><a><i class="mk-dot"></i>Settings</a><em>v1.0.0 · pipeline 9</em></div>
  </aside>

  <div class="mk-main">
    <header class="mk-top">
      <div class="mk-crumb">Cluster Jewels <em>/ Lab</em></div>
      <div class="mk-top-tabs">${navMarkup(' t')}</div>
      <div class="mk-top-right">
        <span class="mk-pill">POE 1</span>
        <span class="mk-pill">Allflame</span>
        <span class="mk-pill mk-src">SAMPLE</span>
        <button class="mk-sync">SYNC</button>
      </div>
    </header>

    <div class="mk-tiles">
      <div><em>Builds tracked</em><b>124,363</b></div>
      <div><em>Skills above 1%</em><b>18</b></div>
      <div><em>Characters sampled</em><b>234</b></div>
      <div><em>Cluster jewels read</em><b>592</b></div>
    </div>

    <div class="mk-grid">
      <section class="mk-panel mk-rail">
        <div class="mk-panel-head"><span>Main skills</span><b>18</b></div>
        <div class="mk-search"><i></i>Search skill, class or damage</div>
        <div class="mk-skills">${SKILLS.map(railRow).join('')}</div>
      </section>

      <section class="mk-centre">
        <div class="mk-hero">
          <span class="mk-gem lg"><img src="${A}/gems/winter_orb.png" alt=""></span>
          <span class="mk-asc"><img src="${A}/asc/occultist.jpg" alt=""></span>
          <div class="mk-hero-txt">
            <div class="mk-eyebrow"><i></i>COLD <em>· Occultist, Elementalist, Assassin</em></div>
            <h2>Winter Orb</h2>
            <div class="mk-chips"><span>1,910 builds</span><span>20.5% of ladder</span><span>21 of 24 sampled</span></div>
          </div>
          <div class="mk-stats">
            <div><em>AVG DPS</em><b>34.5M</b></div>
            <div><em>PEAK</em><b>145M</b></div>
          </div>
        </div>

        <div class="mk-sizes">
          <button class="on">LARGE <b>13</b></button>
          <button>MEDIUM <b>5</b></button>
          <button>SMALL <b>2</b></button>
          <span class="mk-hint">ranked by builds running the combination</span>
        </div>

        <div class="mk-list">${COMBOS.map(comboRow).join('')}</div>
      </section>

      <aside class="mk-panel mk-right">
        <div class="mk-card">
          <div class="mk-card-head"><span>Leading combination</span><b>68%</b></div>
          <div class="mk-leader">
            <span class="mk-cart sm"><img src="${A}/cluster_large.png" alt=""></span>
            <div><b>Prism Weave + Snowstorm</b><em>15 of 22 builds · 41.2M avg</em></div>
          </div>
        </div>
        <div class="mk-card">
          <div class="mk-card-head"><span>Crafting</span><b>best route</b></div>
          <div class="mk-craft">
            <div><b>Alt + Augment</b><em>1 in 12</em></div>
            <div><b>≈ 3.2 div</b><em>ilvl 84</em></div>
          </div>
          <div class="mk-bar thin"><i style="width:42%"></i></div>
          <div class="mk-craft-sub">matches 6 of 7 desired mods</div>
        </div>
        <div class="mk-card">
          <div class="mk-card-head"><span>Coverage</span><b>86%</b></div>
          <div class="mk-cover">
            <span>Large</span><div class="mk-bar thin"><i style="width:78%"></i></div>
          </div>
          <div class="mk-cover">
            <span>Medium</span><div class="mk-bar thin"><i style="width:64%"></i></div>
          </div>
          <div class="mk-cover">
            <span>Small</span><div class="mk-bar thin"><i style="width:22%"></i></div>
          </div>
        </div>
      </aside>
    </div>

    <div class="mk-artwall">
      ${COMBOS.map((c) => `
        <figure class="mk-tile">
          <img src="${A}/${c.art}.png" alt="">
          <figcaption><b>${c.label}</b><em>${c.size} · ${c.builds} builds</em></figcaption>
          <span class="mk-tile-pct">${c.pct}%</span>
        </figure>`).join('')}
      ${SKILLS.slice(0, 3).map((s) => `
        <figure class="mk-tile skill">
          <img src="${A}/gems/${s.gem}.png" alt="">
          <figcaption><b>${s.name}</b><em>${s.pop}% of ladder · ${s.dps} peak</em></figcaption>
        </figure>`).join('')}
    </div>

    <footer class="mk-status"><span>Ready · 234 characters sampled across 18 skills</span><em>DATA · POE.NINJA BUILD API</em></footer>
  </div>`;

/* ------------------------------------------------------------------ gallery */

function variantSection(v, index) {
  const num = String(index + 1).padStart(2, '0');
  return `
    <section class="variant" id="${v.id}">
      <div class="v-head">
        <div class="v-num">${num}</div>
        <div class="v-copy">
          <h2>${v.name}</h2>
          <p>${v.intent}</p>
          <div class="v-tags">${v.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        </div>
        <div class="v-swatches">${v.sw.map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
      </div>

      <div class="v-frame"><div class="mock ${v.id} ${v.flags.join(' ')}">${mockMarkup()}</div></div>

      <div class="v-notes">
        <div><b>Keeps</b><span>${v.keeps}</span></div>
        <div><b>Costs</b><span>${v.costs}</span></div>
      </div>
    </section>`;
}

function build() {
  document.getElementById('galList').innerHTML = VARIANTS.map(variantSection).join('');

  document.getElementById('galIndex').innerHTML = `
    <div class="idx-cap">The ten</div>
    ${VARIANTS.map((v, i) => `
      <a href="#${v.id}" data-target="${v.id}">
        <b>${String(i + 1).padStart(2, '0')}</b><span>${v.name}</span>
      </a>`).join('')}
    <div class="idx-foot">Pick a number and I build it — layout, palette and motion included.</div>`;

  document.querySelectorAll('.gal-index a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(a.dataset.target);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

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

/** Render each mock at its true 1280×720 and scale it down to the column it sits in. */
function fitFrames() {
  document.querySelectorAll('.v-frame').forEach((frame) => {
    const mock = frame.firstElementChild;
    if (!mock || !mock.classList || !frame.clientWidth) return;   // not laid out yet
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
