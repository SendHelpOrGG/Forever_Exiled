/* ============================================================
   Forever Exiled — UI preview
   A browser mirror of the .NET MAUI app: same layout, same copy,
   same aggregation rules as MetaAnalyzer.cs, running on the bundled
   demo snapshot. Nothing here talks to the network.
   ============================================================ */

'use strict';

/* ─────────────────────────── constants ─────────────────────────── */

const SIZES = ['Large', 'Medium', 'Small'];

const SIZE_COLOR = { Large: '#E2794F', Medium: '#59C2CE', Small: '#A98BE8' };
const SIZE_IMG = {
  Large: 'assets/cluster_large.png',
  Medium: 'assets/cluster_medium.png',
  Small: 'assets/cluster_small.png',
};

const DAMAGE_COLOR = {
  Cold: '#69B7E8', Fire: '#E8794A', Lightning: '#E7C55E',
  Chaos: '#AE7BE0', Physical: '#B6BEC8', Minion: '#74C6A2',
};

const KNOWN_DAMAGE = {
  'molten strike of the zenith': 'Fire', 'molten strike': 'Fire', 'hexblast': 'Chaos',
  'ice nova of frostbolts': 'Cold', 'ice nova': 'Cold', 'winter orb': 'Cold',
  'splitting steel': 'Physical', 'lightning strike': 'Lightning',
  'righteous fire': 'Fire', 'fire trap': 'Fire', 'animate guardian': 'Minion',
  'raise spectre': 'Minion', 'summon raging spirit': 'Minion',
  'animate weapon of ranged arms': 'Minion', 'penance brand': 'Lightning',
  'penance brand of dissipation': 'Lightning', 'ethereal knives': 'Physical',
  'cyclone of tumult': 'Physical', 'cyclone': 'Physical', 'void shockwave': 'Physical',
  'earthshatter': 'Physical', 'boneshatter of complex trauma': 'Physical',
  'boneshatter': 'Physical', 'essence drain': 'Chaos', 'blight of contagion': 'Chaos',
  'storm burst of repulsion': 'Lightning', 'toxic rain': 'Chaos', 'soulrend': 'Chaos',
  'arc': 'Lightning', 'spark': 'Lightning', 'ball lightning of orbiting': 'Lightning',
  'venom gyre': 'Chaos', 'detonate dead of chain reaction': 'Fire',
  'explosive arrow': 'Fire', 'burning arrow': 'Fire', 'caustic arrow': 'Chaos',
  'lightning arrow': 'Lightning', 'tornado shot': 'Physical', 'kinetic blast': 'Physical',
  'ice shot': 'Cold', 'spectral helix': 'Physical', 'frost blades': 'Cold',
};

const DAMAGE_KEYWORDS = [
  ['fire', 'Fire'], ['flame', 'Fire'], ['burn', 'Fire'], ['ignite', 'Fire'], ['molten', 'Fire'],
  ['cold', 'Cold'], ['ice', 'Cold'], ['frost', 'Cold'], ['freeze', 'Cold'], ['winter', 'Cold'],
  ['lightning', 'Lightning'], ['storm', 'Lightning'], ['spark', 'Lightning'], ['arc', 'Lightning'],
  ['chaos', 'Chaos'], ['poison', 'Chaos'], ['toxic', 'Chaos'], ['blight', 'Chaos'], ['void', 'Chaos'],
  ['summon', 'Minion'], ['animate', 'Minion'], ['spectre', 'Minion'], ['golem', 'Minion'],
  ['skeleton', 'Minion'], ['raise', 'Minion'],
];

/* ─────────────────────────── formatting (DpsFormatter.cs) ────────── */

function trimNum(v) {
  const t = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  return String(parseFloat(t));
}

const fmt = {
  dps(v) {
    if (!(v > 0)) return '–';
    if (v >= 1e9) return trimNum(v / 1e9) + 'B';
    if (v >= 1e6) return trimNum(v / 1e6) + 'M';
    if (v >= 1e3) return trimNum(v / 1e3) + 'K';
    return String(Math.round(v));
  },
  pct(v, decimals = 1) {
    if (!Number.isFinite(v)) return '–';
    const t = decimals <= 0 ? v.toFixed(0) : String(parseFloat(v.toFixed(decimals)));
    return t + '%';
  },
  count(v) { return Number(v).toLocaleString('en-US'); },
  chaos(v) {
    if (!Number.isFinite(v) || v <= 0) return '–';
    if (v >= 1000) return trimNum(v / 1000) + 'K c';
    return (v >= 100 ? Math.round(v) : parseFloat(v.toFixed(1))) + ' c';
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function damageOf(skillName) {
  const key = String(skillName || '').toLowerCase();
  if (KNOWN_DAMAGE[key]) return KNOWN_DAMAGE[key];
  for (const [word, type] of DAMAGE_KEYWORDS) if (key.includes(word)) return type;
  return 'Physical';
}

/* ─────────────────────────── aggregation (MetaAnalyzer.cs) ───────── */

function comboKey(jewel) {
  const notables = (jewel.notables || []).length
    ? [...jewel.notables].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).join(' + ')
    : (jewel.itemName && jewel.itemName.trim() ? jewel.itemName : '(no notables)');
  return jewel.size + '|' + notables;
}

function comboLabel(jewel) {
  const notables = (jewel.notables || []).slice()
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  if (notables.length) return notables.join(' + ');
  if (jewel.itemName && jewel.itemName.trim()) {
    return jewel.jewelSockets > 0 ? `${jewel.itemName} (${jewel.jewelSockets} sockets)` : jewel.itemName;
  }
  return 'No named notables';
}

function modeOf(bag, fallback) {
  let best = fallback, bestValue = -1;
  for (const [key, value] of Object.entries(bag)) {
    if (value > bestValue) { bestValue = value; best = key; }
  }
  return best;
}

function buildCombos(characters, size, denominator, includeSkills) {
  const groups = new Map();

  for (const build of characters) {
    const seen = new Set();
    for (const jewel of build.clusterJewels || []) {
      const key = comboKey(jewel);
      if (jewel.size !== size || seen.has(key)) continue;
      seen.add(key);

      let acc = groups.get(key);
      if (!acc) {
        acc = {
          sample: jewel, count: 0, dpsSum: 0, peakDps: 0,
          topBuildName: '', topBuildAccount: '', topBuildClass: '',
          passives: {}, grants: {}, effects: {}, skills: {},
        };
        groups.set(key, acc);
      }

      acc.count += 1;
      acc.dpsSum += build.dps || 0;
      if ((build.dps || 0) >= acc.peakDps) {
        acc.peakDps = build.dps || 0;
        acc.topBuildName = build.name;
        acc.topBuildAccount = build.account;
        acc.topBuildClass = build.className;
      }
      const passives = jewel.passives != null ? `${jewel.passives} passives` : 'unknown passives';
      acc.passives[passives] = (acc.passives[passives] || 0) + 1;
      if (jewel.grantType) acc.grants[jewel.grantType] = (acc.grants[jewel.grantType] || 0) + 1;
      if (jewel.effectPercent > 0) acc.effects[jewel.effectPercent] = (acc.effects[jewel.effectPercent] || 0) + 1;
      if (build.mainSkill) acc.skills[build.mainSkill] = (acc.skills[build.mainSkill] || 0) + 1;
    }
  }

  const combos = [...groups.values()].map((acc) => {
    const combo = {
      size,
      notables: (acc.sample.notables || []).slice(),
      label: comboLabel(acc.sample),
      buildCount: acc.count,
      percentOfBuilds: denominator > 0 ? (acc.count * 100) / denominator : 0,
      sampleSize: denominator,
      averageDps: acc.count > 0 ? acc.dpsSum / acc.count : 0,
      peakDps: acc.peakDps,
      topBuildName: acc.topBuildName,
      topBuildAccount: acc.topBuildAccount,
      topBuildClass: acc.topBuildClass,
      representative: acc.sample,
      grantType: Object.keys(acc.grants).length ? modeOf(acc.grants) : acc.sample.grantType || '',
      passivesLabel: Object.keys(acc.passives).length ? modeOf(acc.passives) : 'unknown passives',
      effectPercent: Object.keys(acc.effects).length ? Number(modeOf(acc.effects)) : 0,
      skills: [],
    };
    if (includeSkills) {
      combo.skills = Object.entries(acc.skills)
        .sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
    }
    return combo;
  });

  combos.sort((a, b) =>
    b.buildCount - a.buildCount ||
    b.percentOfBuilds - a.percentOfBuilds ||
    b.averageDps - a.averageDps);

  return combos;
}

function buildProfile(skill, builds) {
  const sampledKeys = new Set(builds.map((b) => `${b.account}/${b.name}`.toLowerCase()));
  const pending = (skill.topBuilds || [])
    .filter((b) => !sampledKeys.has(`${b.account}/${b.name}`.toLowerCase())).length;

  const combosBySize = {
    Large: buildCombos(builds, 'Large', builds.length, false),
    Medium: buildCombos(builds, 'Medium', builds.length, false),
    Small: buildCombos(builds, 'Small', builds.length, false),
  };

  return {
    skill: skill.name,
    sampledBuilds: builds.length,
    pendingBuilds: pending,
    topBuilds: (skill.topBuilds || []).length,
    Large: combosBySize.Large,
    Medium: combosBySize.Medium,
    Small: combosBySize.Small,
    // how many of this skill's builds run at least one jewel of each size,
    // plus the combination that size leads to - the answer to "which size do I take?"
    sizes: SIZES.map((size) => {
      const adopters = builds.filter(
        (b) => (b.clusterJewels || []).some((j) => j.size === size)).length;
      return {
        size,
        adopters,
        total: builds.length,
        percent: builds.length ? (adopters * 100) / builds.length : 0,
        combos: combosBySize[size].length,
        top: combosBySize[size][0] || null,
      };
    }),
  };
}

function notableStats(characters) {
  const counts = new Map();
  for (const build of characters) {
    for (const jewel of build.clusterJewels || []) {
      for (const notable of jewel.notables || []) {
        const key = `${jewel.size}|${notable}`;
        let entry = counts.get(key);
        if (!entry) { entry = { size: jewel.size, name: notable, builds: new Set() }; counts.set(key, entry); }
        entry.builds.add(`${build.account}/${build.name}`);
      }
    }
  }
  return [...counts.values()]
    .map((e) => ({
      name: e.name, size: e.size, count: e.builds.size,
      percent: characters.length ? (e.builds.size * 100) / characters.length : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .slice(0, 24);
}

function sizeMix(characters) {
  return SIZES.map((size) => {
    const count = characters.filter((c) => (c.clusterJewels || []).some((j) => j.size === size)).length;
    return { size, count, percent: characters.length ? (count * 100) / characters.length : 0 };
  });
}

function toBuildRef(c) {
  return {
    name: c.name, account: c.account, className: c.className, mainSkill: c.mainSkill,
    level: c.level, dps: c.dps, league: c.league,
    clusterJewelCount: (c.clusterJewels || []).length,
  };
}

function analyze(snapshot, floor) {
  const skills = snapshot.skills
    .filter((s) => s.popularityPercent >= floor)
    .slice()
    .sort((a, b) => b.averageDps - a.averageDps || b.buildCount - a.buildCount);

  const profiles = new Map();
  for (const skill of skills) {
    const builds = snapshot.characters.filter(
      (c) => String(c.mainSkill || '').toLowerCase() === skill.name.toLowerCase());
    profiles.set(skill.name, buildProfile(skill, builds));
  }

  const characters = snapshot.characters;
  const allKeys = new Set();
  for (const c of characters) for (const j of c.clusterJewels || []) allKeys.add(comboKey(j));

  const large = buildCombos(characters, 'Large', characters.length, true);
  const medium = buildCombos(characters, 'Medium', characters.length, true);
  const combined = [...large, ...medium].sort((a, b) =>
    b.buildCount - a.buildCount ||
    b.percentOfBuilds - a.percentOfBuilds ||
    b.averageDps - a.averageDps);

  let topDpsBuilds = characters.slice()
    .sort((a, b) => b.dps - a.dps).slice(0, 12).map(toBuildRef);

  if (!topDpsBuilds.length) {
    topDpsBuilds = skills.flatMap((s) => s.topBuilds || [])
      .sort((a, b) => b.dps - a.dps).slice(0, 12);
  }

  const ladder = characters.length
    ? characters.slice().sort((a, b) => b.dps - a.dps).map(toBuildRef)
    : skills.flatMap((s) => s.topBuilds || [])
        .filter((b) => b.name)
        .sort((a, b) => b.dps - a.dps);

  const covered = [...profiles.values()].filter((p) => p.sampledBuilds > 0).length;

  return {
    snapshot,
    skills,
    profiles,
    global: {
      totalBuildsInLeague: snapshot.totalBuildsInLeague,
      skillsTracked: skills.length,
      charactersSampled: characters.length,
      jewelsCatalogued: characters.reduce((n, c) => n + (c.clusterJewels || []).length, 0),
      combosFound: allKeys.size,
      topCombos: combined.slice(0, 12),
      largeCombos: large,
      mediumCombos: medium,
      leaderCombo: combined[0] || null,
      topNotables: notableStats(characters),
      sizeMix: sizeMix(characters),
      topDpsBuilds,
      coveragePercent: profiles.size ? (covered * 100) / profiles.size : 0,
      ladder,
    },
  };
}

/* ─────────────────────────── state ─────────────────────────── */

const state = {
  tab: 'lab',
  snapshot: null,
  analysis: null,
  query: '',
  sort: 'dps',
  selectedSkill: null,
  combos: [],
  selectedCombo: 0,
  size: 'Medium',
  floor: 1,
  metaSize: 'all',
  // the combination the Meta tab's crafting card prices (null = the global leader)
  metaCombo: null,
  ladderQuery: '',
  ladderSort: { key: 'dps', dir: -1 },
  settings: { depth: 12, pacing: 5, league: 'Allflame (current)' },
  lastSync: null,
  busy: false,
};

const $ = (id) => document.getElementById(id);
const el = (selector, root = document) => root.querySelector(selector);

/* ─────────────────────────── helpers ─────────────────────────── */

function isSynthetic() {
  const snap = state.snapshot;
  if (!snap) return true;
  return snap.synthetic === true || snap.source === 'sample';
}

const ASC_ART = {
  ascendant: 'ascendant', assassin: 'assassin', berserker: 'berserker', champion: 'champion',
  chieftain: 'chieftain', deadeye: 'deadeye', elementalist: 'elementalist', gladiator: 'gladiator',
  guardian: 'guardian', hierophant: 'hierophant', inquisitor: 'inquisitor', juggernaut: 'juggernaut',
  necromancer: 'necromancer', occultist: 'occultist', pathfinder: 'pathfinder', raider: 'raider',
  saboteur: 'saboteur', slayer: 'slayer', trickster: 'trickster', warden: 'warden',
  duelist: 'duelist', marauder: 'marauder', ranger: 'ranger', scion: 'scion', shadow: 'shadow',
  templar: 'templar', witch: 'witch',
};

function ascIcon(name) {
  const key = String(name || '').trim().toLowerCase();
  return ASC_ART[key] ? `assets/asc/${ASC_ART[key]}.jpg` : '';
}

function ascImg(name, extra = '') {
  const src = ascIcon(name);
  return src ? `<img class="asc ${extra}" src="${src}" alt="" loading="lazy">` : '';
}

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/['\u2019,.]/g, '')
    .replace(/[^a-z0-9 ]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

/** Notable passive text from assets/notables.json (cluster-jewel notables). */
let notableText = {};

async function loadNotableText() {
  try {
    const response = await fetch('assets/notables.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    notableText = data.notables || {};
  } catch {
    notableText = {};
  }
}

let notableWeights = null;
let currencyCosts = null;

async function loadCurrencyCosts() {
  try {
    const response = await fetch('assets/currency_costs.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    currencyCosts = data;
  } catch {
    currencyCosts = null;
  }
}

function priceOf(key) {
  const table = currencyCosts && currencyCosts.currency ? currencyCosts.currency : null;
  return table && typeof table[key] === 'number' ? table[key] : 0;
}

/* ── mod tag colours ──
   Every notable carries the tags the game gates it with (fire, damage, speed...).
   One hue per family so the chips read at a glance instead of all being one grey. */
let tagColors = null;

async function loadTagColors() {
  try {
    const response = await fetch('assets/tag_colors.json', { cache: 'no-store' });
    if (!response.ok) return;
    tagColors = await response.json();
  } catch {
    tagColors = null;
  }
}

function tagColor(tag) {
  const key = String(tag || '').trim().toLowerCase();
  const table = tagColors && tagColors.tags ? tagColors.tags : {};
  return table[key] || (tagColors && tagColors.default) || '#8888ff';
}

/* chip markup: text in the tag's own hue, on a 12% tint of it, with a 30% border */
function tagChip(tag, className = '') {
  const color = tagColor(tag);
  const label = esc(String(tag).replace(/_/g, ' '));
  return `<span class="tagchip ${className}" title="mod tag: ${label}" style="color:${color};`
    + `background:${alpha(color, 0.12)};border-color:${alpha(color, 0.3)}">${label}</span>`;
}

/* "#e06c63" -> "rgba(224,108,99,0.12)"; anything unparseable falls back to the neutral magic blue */
function alpha(hex, value) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!match) return `rgba(136,136,255,${value})`;
  const n = parseInt(match[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${value})`;
}

async function loadNotableWeights() {
  try {
    const response = await fetch('assets/notable_weights.json', { cache: 'no-store' });
    if (!response.ok) return;
    notableWeights = await response.json();
  } catch {
    notableWeights = null;
  }
}

/* The pool a cluster jewel rolls its notables from, keyed by its base enchant. */
function poolFor(jewel) {
  if (!notableWeights || !jewel) return null;
  const grant = String(jewel.grantType || '').trim().toLowerCase();
  if (!grant) return null;

  const size = String(jewel.size || '').toLowerCase();
  const normalised = grant.replace(/[\d.]+%?/g, ' ').replace(/\s+/g, ' ').trim();
  const grants = notableWeights.grants;

  return grants[`${size}|${grant}`] || grants[`any|${grant}`]
    || grants[`${size}~${normalised}`] || grants[`any~${normalised}`] || null;
}

/* A mod only joins the pool once the base's item level reaches its level, so the
   weight behind a notable shrinks with the base: an iLvl 68 jewel cannot roll the
   notables that need 75. */
function poolTotalAt(slot, size, iLvl) {
  if (!slot) return 0;
  const full = slot.total[size] || 0;
  if (!iLvl) return full;

  const points = (slot.levels && slot.levels[size]) || [];
  let total = 0;
  for (const [level, weight] of points) {
    if (level > iLvl) break;
    total = weight;
  }

  return total || full;
}

function poolInfo(tag, size, iLvl) {
  if (!notableWeights || !tag) return null;
  const category = notableWeights.categories[tag];
  if (!category) return null;

  // prefix and suffix slots roll from separate pools, so a notable is weighed
  // against its own affix type
  const totals = {};
  for (const kind of ['Prefix', 'Suffix']) {
    totals[kind] = poolTotalAt(category.pools ? category.pools[kind] : null, size, iLvl);
  }

  // how many mods compete for each slot: the tag's notables plus the generic grants
  const generic = {};
  for (const kind of ['Prefix', 'Suffix']) {
    const slot = category.pools ? category.pools[kind] : null;
    generic[kind] = slot && slot.genericCount ? slot.genericCount : 0;
  }

  return { tag, label: category.label, size, ilvl: iLvl || 0, totals, generic, count: category.notables.length };
}

function notableLevel(name) {
  const entry = notableWeights && notableWeights.notables[String(name || '').trim().toLowerCase()];
  return entry ? entry.level || 1 : 1;
}

function poolTotalFor(pool, name) {
  if (!pool) return 0;
  return pool.totals[notableType(name)] || 0;
}

/* weight of one notable inside a pool, and the chance of rolling it */
function notableWeight(name, tag) {
  if (!notableWeights || !tag) return null;
  const entry = notableWeights.notables[String(name || '').trim().toLowerCase()];
  const weight = entry && entry.weights ? entry.weights[tag] : 0;
  return weight ? weight : null;
}

/* The pool a notable belongs to when we only know its size and name. */
function notablePool(name, size) {
  if (!notableWeights) return null;
  const entry = notableWeights.notables[String(name || '').trim().toLowerCase()];
  if (!entry || !entry.weights) return null;

  let best = null;
  for (const [tag, weight] of Object.entries(entry.weights)) {
    const category = notableWeights.categories[tag];
    if (!category || (size && !category.sizes.includes(size))) continue;
    if (!best || weight > best.weight) best = { tag, weight };
  }

  return best ? poolInfo(best.tag, size) : null;
}

function weightLine(name, pool) {
  if (!pool) return '';
  const weight = notableWeight(name, pool.tag);
  const total = poolTotalFor(pool, name);
  if (!weight || !total) return '';
  const chance = (weight * 100) / total;
  const pct = chance >= 10 ? chance.toFixed(0) : chance.toFixed(1);
  return `<span class="item-weight" title="${esc(pool.label)} pool · ${fmt.count(weight)} of ${fmt.count(total)} weight">${fmt.count(weight)}<i>${pct}%</i></span>`;
}

function notableLines(name) {
  const entry = notableText[String(name || '').trim().toLowerCase()];
  return entry ? entry : null;
}

/** Slug list from assets/gems/index.json — tells us which gems have art. */
let gemIndex = null;

async function loadGemIndex() {
  try {
    const response = await fetch('assets/gems/index.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    gemIndex = new Set(data.slugs || []);
  } catch {
    gemIndex = null; // no index: fall back to optimistic paths
  }
}

function gemIcon(skillName) {
  const slug = slugify(skillName);
  if (!slug) return '';
  if (!gemIndex) return `assets/gems/${slug}.png`;
  if (gemIndex.has(slug)) return `assets/gems/${slug}.png`;

  // transmuted gems share the base skill's art, so try a variant before giving up
  const prefix = `${slug}_`;
  for (const candidate of gemIndex) {
    if (candidate.startsWith(prefix)) return `assets/gems/${candidate}.png`;
  }
  return '';
}

/** Gem art inside a tile; falls back to the gem glyph when we have no art. */
function gemTile(skillName, extra = '') {
  const src = gemIcon(skillName);
  const cls = `gem-slot ${extra}`.trim();
  return src
    ? `<span class="${cls}"><img src="${src}" alt="" loading="lazy" onerror="this.parentNode.classList.add('empty');this.remove()"></span>`
    : `<span class="${cls} empty"><svg class="ic"><use href="#i-gem"/></svg></span>`;
}

/** Class art in a tile of its own — same size as the gem tile next to it. */
function ascTile(name, extra = '') {
  const src = ascIcon(name);
  const cls = `asc-slot ${extra}`.trim();
  return src
    ? `<span class="${cls}"><img src="${src}" alt="" loading="lazy"></span>`
    : `<span class="${cls} empty"><svg class="ic"><use href="#i-user"/></svg></span>`;
}

function topClassOf(skill) {
  const top = (skill.classes || [])[0];
  return top ? top.name : '';
}

function classTextOf(skill) {
  const top = (skill.classes || [])[0];
  if (!top) return '—';
  return top.percent > 0.5 ? `${top.name} · ${fmt.pct(top.percent, 0)}` : top.name;
}

function comboMax(combos) {
  return combos.reduce((m, c) => Math.max(m, c.buildCount), 0);
}

function toast(message) {
  const host = $('toasts');
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<svg class="ic"><use href="#i-bolt"/></svg><span>${esc(message)}</span>`;
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add('out');
    setTimeout(() => node.remove(), 220);
  }, 4200);
}

function setStatus(text) {
  $('statusText').textContent = text;
}

const SIZE_TAG_CLASS = { Large: 'tag-orange', Medium: 'tag-blue', Small: 'tag-purple' };

/* ─────────────────────────── header / shell ─────────────────────────── */

function renderShell() {
  const snap = state.snapshot;
  const synthetic = isSynthetic();
  const g = state.analysis.global;

  $('leagueName').textContent = snap.leagueName;
  $('snapshotText').textContent = synthetic ? 'demo' : snap.snapshotVersion;
  $('setSnapshot').textContent = snap.snapshotVersion;
  $('setSynthetic').textContent = synthetic ? 'yes — generated, not scraped' : 'no — crawled from poe.ninja';

  const sourceTag = $('sourceTag');
  sourceTag.classList.toggle('tag-orange', synthetic);
  sourceTag.classList.toggle('tag-green', !synthetic);
  el('#sourceTag .src-label').textContent = synthetic ? 'SYNTHETIC SAMPLE' : 'LIVE LADDER';
  const setLabel = el('#view-settings .src-tag .src-label');
  if (setLabel) {
    setLabel.textContent = synthetic ? 'SYNTHETIC SAMPLE' : 'LIVE LADDER';
    const setTag = setLabel.closest('.src-tag');
    if (setTag) {
      setTag.classList.toggle('tag-orange', synthetic);
      setTag.classList.toggle('tag-green', !synthetic);
    }
  }

  const notice = $('notice');
  // a live snapshot can arrive with its skills but no ladder rows: say so instead of
  // rendering an empty lab as if the league had no clusters
  // a snapshot written before the warning field existed can still be flagged: skills but
  // no ladder rows means there is nothing to sample
  const ladderEmpty = !synthetic && Array.isArray(snap.skills) && snap.skills.length > 0
    && snap.skills.every((s) => !Array.isArray(s.topBuilds) || s.topBuilds.length === 0);
  const ladderWarning = !synthetic
    ? (typeof snap.ladderWarning === 'string' && snap.ladderWarning.length ? snap.ladderWarning
      : ladderEmpty ? 'poe.ninja listed the skills and their popularity, but returned no ladder rows, '
        + 'so there are no characters to sample. Re-run the capture tool with --diagnose.' : '')
    : '';
  notice.hidden = !synthetic && !ladderWarning;
  if (synthetic) {
    $('noticeText').innerHTML =
      '<b>Synthetic demo data.</b> Skill shares, DPS values and character names in this snapshot ' +
      'are generated to demonstrate the analysis — they are <b>not</b> the Allflame ladder. ' +
      'Real numbers come from Sync in the Windows app.';
  } else if (ladderWarning) {
    $('noticeText').innerHTML = '<b>Ladder unreadable.</b> ' + esc(ladderWarning);
  }

  $('lastSync').textContent = state.lastSync
    ? 'synced ' + state.lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (synthetic ? 'never synced' : 'cached snapshot');

  $('labSub').innerHTML =
    `<b>${esc(snap.leagueName)}</b> · ${state.analysis.skills.length} skills above ` +
    `${esc(state.floor.toFixed(1))}% · ${fmt.count(g.charactersSampled)} characters sampled · ` +
    `${fmt.count(g.jewelsCatalogued)} cluster jewels`;

  $('statusCounts').textContent =
    `${state.analysis.skills.length} skills · ${g.charactersSampled} characters · ${fmt.count(g.jewelsCatalogued)} jewels`;

  $('generatedAt').textContent = 'generated ' + new Date(snap.generatedAt).toLocaleDateString([], {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const cacheKb = Math.round(JSON.stringify(snap).length / 1024);
  $('cacheSize').textContent = `${fmt.count(cacheKb)} KB`;
}

/* ─────────────────────────── skill rail ─────────────────────────── */

function visibleSkills() {
  const query = state.query.trim().toLowerCase();
  const list = state.analysis.skills.slice();

  const filtered = query
    ? list.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        classTextOf(s).toLowerCase().includes(query) ||
        String(s.damageType || '').toLowerCase().includes(query))
    : list;

  if (state.sort === 'popularity') {
    filtered.sort((a, b) => b.popularityPercent - a.popularityPercent || b.averageDps - a.averageDps);
  }
  return filtered;
}

function renderSkillRail() {
  const list = visibleSkills();
  $('skillCount').textContent = list.length;

  const host = $('skillList');
  host.innerHTML = list.map((skill) => {
    const on = state.selectedSkill === skill.name;
    const accent = DAMAGE_COLOR[skill.damageType] || DAMAGE_COLOR.Physical;
    return `
      <button class="skill ${on ? 'on' : ''}" data-skill="${esc(skill.name)}" style="--c:${accent}"
              title="${esc(skill.name)} — ${esc(fmt.count(skill.buildCount))} builds, ${esc(fmt.pct(skill.popularityPercent))} of ladder">
        ${gemTile(skill.name)}
        ${ascTile(topClassOf(skill))}
        <span class="skill-body">
          <div class="skill-name">${esc(skill.name)}</div>
          <div class="skill-sub"><span>${esc(classTextOf(skill))} · ${esc(fmt.pct(skill.popularityPercent))}</span></div>
        </span>
        <span class="skill-side">
          <div class="skill-dps">${esc(fmt.dps(skill.averageDps))}</div>
          <div class="skill-cap">avg dps</div>
        </span>
      </button>`;
  }).join('') || `<div class="empty"><h3>No match</h3><p>Try another skill, class or damage type.</p></div>`;
}

/* ─────────────────────── item tooltip (as on the site) ───────────────────── */

const RARITY_COLOR = { normal: '#c8c8c8', magic: '#8888ff', rare: '#ffff77', unique: '#af6025' };

let tipEl = null;

function ensureTip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'item-tip';
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

/** The item card poe.ninja shows when you hover a cluster jewel. */
function itemTipHtml(combo) {
  const item = combo.representative || {};
  const rarity = String(item.rarity || (item.itemName ? 'rare' : 'magic')).toLowerCase();
  const name = item.itemName || '';
  const base = item.baseType || `${combo.size} Cluster Jewel`;
  const color = RARITY_COLOR[rarity] || RARITY_COLOR.magic;

  const props = [];
  if (item.passives != null) {
    props.push(`Adds ${item.passives} Passive Skill${item.passives === 1 ? '' : 's'}`);
  }
  if (item.jewelSockets > 0) {
    props.push(`${item.jewelSockets} Added Passive Skill${item.jewelSockets === 1 ? ' is a' : 's are'} Jewel Socket${item.jewelSockets === 1 ? '' : 's'}`);
  }

  // each notable is followed by what it actually does, as the game shows it
  const mods = [];
  if (combo.grantType) {
    mods.push(`<div class="item-mod">Added Small Passive Skills grant: ${esc(combo.grantType)}</div>`);
  }
  if (combo.effectPercent > 0) {
    mods.push(`<div class="item-mod">Added Small Passive Skills have ${combo.effectPercent}% increased Effect</div>`);
  }
  const pool = poolInfo(poolFor(item.size ? item : combo), (item.size || combo.size), item.itemLevel);
  if (pool) {
    const split = [pool.totals.Prefix ? `${fmt.count(pool.totals.Prefix)} prefix` : '',
      pool.totals.Suffix ? `${fmt.count(pool.totals.Suffix)} suffix` : ''].filter(Boolean).join(' / ');
    const levelText = item.itemLevel ? ` at iLvl ${item.itemLevel}` : '';
    // the pool is the notables *plus* the generic small-passive grants: both compete for
    // the same affix slot, so leaving the generic mods out doubles every notable's odds
    const generic = (pool.generic.Prefix || 0) + (pool.generic.Suffix || 0);
    const genericText = generic ? ` + ${generic} small-passive mods` : '';
    mods.push(`<div class="item-pool" title="the pools this base rolls from">${esc(pool.label)} pool · ${pool.count} notables${genericText}${split ? ' · ' + split + ' weight' + levelText : ''}</div>`);
  }

  for (const notable of combo.notables || []) {
    mods.push(`<div class="item-mod"><span>1 Added Passive Skill is ${esc(notable)}</span>${weightLine(notable, pool)}</div>`);
    const lines = notableLines(notable);
    if (lines) {
      mods.push(`<div class="item-mod-desc">${(lines.stats || []).map((line) => esc(line)).join('<br>')}</div>`);
      if (lines.reminder && lines.reminder.length) {
        mods.push(`<div class="item-reminder">${lines.reminder.map((line) => esc(line)).join('<br>')}</div>`);
      }
    }

    // the mod tags the game uses to gate this notable (fossils, harvest, influences)
    const tags = notableTags(notable);
    if (tags.length) {
      mods.push(`<div class="item-tags">${tags.map((tag) => tagChip(tag, 'item-tag')).join('')}</div>`);
    }
  }
  for (const small of item.smallGrants || []) mods.push(`<div class="item-mod">${esc(small)}</div>`);

  const flags = [];
  if (item.fractured) flags.push('<span class="item-fractured">Fractured Item</span>');
  if (item.corrupted) flags.push('<span class="item-corrupt">Corrupted</span>');

  return `
    <div class="item-head">
      <span class="item-icon"><img src="${SIZE_IMG[combo.size]}" alt=""></span>
      <span class="item-titles">
        ${name ? `<span class="item-name" style="color:${color}">${esc(name)}</span>` : ''}
        <span class="item-base" style="color:${name ? '#c8c8c8' : color}">${esc(base)}</span>
      </span>
    </div>
    ${props.length ? `<hr><div class="item-props">${props.map((line) => esc(line)).join('<br>')}</div>` : ''}
    ${mods.length ? `<hr><div class="item-mods">${mods.join('')}</div>` : ''}
    ${item.itemLevel ? `<hr><div class="item-props">Item Level: ${item.itemLevel}</div>` : ''}
    ${flags.length ? `<hr><div class="item-props">${flags.join('<br>')}</div>` : ''}`;
}

function placeTip(event) {
  if (!tipEl || tipEl.hidden) return;
  const pad = 14;
  const rect = tipEl.getBoundingClientRect();
  let x = event.clientX + 18;
  let y = event.clientY + 14;
  if (x + rect.width + pad > window.innerWidth) x = Math.max(pad, event.clientX - rect.width - 18);
  if (y + rect.height + pad > window.innerHeight) y = Math.max(pad, window.innerHeight - rect.height - pad);
  tipEl.style.left = `${x}px`;
  tipEl.style.top = `${y}px`;
}

function showTip(event, combo) {
  const tip = ensureTip();
  tip.innerHTML = itemTipHtml(combo);
  tip.hidden = false;
  placeTip(event);
}

function hideTip() {
  if (tipEl) tipEl.hidden = true;
}

/** Hover any cluster jewel to get the item card, exactly like the site. */
function bindItemTips(selector, combos) {
  document.querySelectorAll(selector).forEach((el, index) => {
    const combo = combos[index];
    if (!combo) return;
    el.classList.add('has-tip');
    el.addEventListener('mouseenter', (event) => showTip(event, combo));
    el.addEventListener('mousemove', placeTip);
    el.addEventListener('mouseleave', hideTip);
  });
}

/* ─────────────────────────── cluster lab ─────────────────────────── */

function selectedSkillStat() {
  return state.analysis.skills.find((s) => s.name === state.selectedSkill) || null;
}

function selectedProfile() {
  return state.selectedSkill ? state.analysis.profiles.get(state.selectedSkill) || null : null;
}

function renderHero() {
  const stat = selectedSkillStat();
  const profile = selectedProfile();
  const host = $('hero');

  if (!stat) {
    host.innerHTML = `
      <div class="slot lg"><svg class="ic lg" style="color:var(--text-3)"><use href="#i-gem"/></svg></div>
      <div class="hero-main">
        <div class="hero-eyebrow"><span class="micro">No skill selected</span></div>
        <div class="hero-name">Pick a main skill</div>
        <div class="hero-chips"><span class="chip">Rail sorted by average DPS</span></div>
      </div>`;
    return;
  }

  const accent = DAMAGE_COLOR[stat.damageType] || DAMAGE_COLOR.Physical;
  const sampleText = profile && profile.sampledBuilds > 0
    ? `${profile.sampledBuilds} of ${profile.topBuilds} top builds sampled`
    : profile && profile.topBuilds > 0
      ? `0 of ${profile.topBuilds} top builds sampled`
      : 'no ladder rows';

  host.innerHTML = `
    <div class="slot xl" style="border-color:${SIZE_COLOR[state.size]}55">
      <img src="${gemIcon(stat.name) || SIZE_IMG[state.size]}" alt=""
           onerror="this.src='${SIZE_IMG[state.size]}'">
    </div>
    <div class="slot xl portrait" title="${esc(topClassOf(stat))}">
      ${ascIcon(topClassOf(stat))
        ? `<img src="${ascIcon(topClassOf(stat))}" alt="">`
        : `<svg class="ic lg" style="color:var(--text-3)"><use href="#i-user"/></svg>`}
    </div>
    <div class="hero-main">
      <div class="hero-eyebrow">
        <i style="width:5px;height:5px;border-radius:50%;background:${accent};display:inline-block"></i>
        <span class="micro">${esc(String(stat.damageType || '').toUpperCase())}</span>
        <span class="cap">· ${esc(classTextOf(stat))}</span>
      </div>
      <div class="hero-name">${esc(stat.name)}</div>
      <div class="hero-chips">
        <span class="chip"><svg class="ic sm"><use href="#i-user"/></svg>${esc(fmt.count(stat.buildCount))} builds</span>
        <span class="chip"><svg class="ic sm"><use href="#i-meta"/></svg>${esc(fmt.pct(stat.popularityPercent))} of ladder</span>
        <span class="chip"><svg class="ic sm"><use href="#i-gem"/></svg>${esc(sampleText)}</span>
      </div>
    </div>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="k">AVG DPS</div>
        <div class="v green">${esc(fmt.dps(stat.averageDps))}</div>
      </div>
      <div class="hero-stat">
        <div class="k">PEAK</div>
        <div class="v">${esc(fmt.dps(stat.peakDps))}</div>
      </div>
    </div>`;
}

function renderPills() {
  const profile = selectedProfile();
  $('sizePills').innerHTML = SIZES.map((size) => {
    const count = profile ? profile[size].length : 0;
    return `
      <button class="pill ${size === state.size ? 'on' : ''}" data-size="${size}">
        <img class="art" src="${SIZE_IMG[size]}" alt="">
        ${size.toUpperCase()}
        ${count > 0 ? `<span class="n">${count}</span>` : ''}
      </button>`;
  }).join('');
}

function renderCombos() {
  const stat = selectedSkillStat();
  const profile = selectedProfile();
  const host = $('comboList');

  $('comboHeader').textContent = `${state.size} combinations`.toUpperCase();

  if (!stat) {
    $('comboHint').textContent = '';
    host.innerHTML = emptyState('Nothing matches that filter', 'Try a different skill, class or damage type.', false);
    return;
  }

  const combos = profile ? profile[state.size] : [];
  if (!combos.length) {
    $('comboHint').textContent = '';
    state.combos = [];
    state.selectedCombo = 0;
    renderCraftCard();
    const sampled = profile ? profile.sampledBuilds : 0;
    host.innerHTML = sampled > 0
      ? emptyState(`No ${state.size} clusters`,
          `None of the ${sampled} sampled builds run a ${state.size.toLowerCase()} cluster jewel.`, false)
      : emptyState('Not sampled yet',
          'Analyze this skill to pull its top builds and cluster jewels from poe.ninja.', true);
    return;
  }

  $('comboHint').textContent = `Ranked by how many sampled builds run the combination`;
  const max = comboMax(combos);
  const denominator = profile ? profile.sampledBuilds : 0;

  host.innerHTML = combos.slice(0, 10).map((combo, i) => {
    const rank = i + 1;
    const index = i;
    const share = max > 0 ? (combo.buildCount * 100) / max : 0;
    const notableMarkup = (combo.notables.length ? combo.notables : [combo.label])
      .map((n) => `<span class="notable">${esc(n)}</span>`)
      .join('<span class="cap">+</span>');

    const meta = [
      combo.grantType ? `<span class="grant">${esc(combo.grantType)}</span>` : '',
      combo.passivesLabel ? `<span>${esc(combo.passivesLabel)}</span>` : '',
      combo.effectPercent > 0 ? `<span>${esc(combo.effectPercent)}% effect</span>` : '',
    ].filter(Boolean).join('<span class="dot"></span>');

    return `
      <article class="combo ${rank === 1 ? 'leader' : ''} ${index === state.selectedCombo ? 'on' : ''}"
               data-index="${index}" role="button" tabindex="0">
        <div class="combo-art">
          <img src="${SIZE_IMG[combo.size]}" alt="">
          <span class="rank">${String(rank).padStart(2, '0')}</span>
        </div>
        <div class="combo-body">
          <div class="combo-head">
            <div style="min-width:0">
              <div class="combo-chips">
                ${notableMarkup}
                <span class="chip ${SIZE_TAG_CLASS[combo.size]}">#${combo.size}</span>
              </div>
              <div class="combo-sub">${meta}</div>
            </div>
            <div class="combo-side">
              <div class="combo-pct">${esc(fmt.pct(combo.percentOfBuilds))}</div>
              <span class="cap">${combo.buildCount} of ${denominator}</span>
            </div>
          </div>
          <div class="bar combo-bar"><i style="width:${share.toFixed(1)}%"></i></div>
          <div class="combo-foot">
            <span class="anchor" title="${esc(combo.topBuildAccount)}">
              <svg class="ic sm"><use href="#i-anchor"/></svg>
              <b>${esc(combo.topBuildName || 'unknown')}</b>
              <span style="display:inline-flex;align-items:center;gap:5px">${ascTile(combo.topBuildClass, 'sm')}${esc(combo.topBuildClass || '—')}</span>
            </span>
            <span class="dpsline">
              <svg class="ic sm bolt"><use href="#i-bolt"/></svg>
              <b>${esc(fmt.dps(combo.averageDps))}</b><span class="cap">avg</span>
              <b class="peak">${esc(fmt.dps(combo.peakDps))}</b><span class="cap">peak</span>
            </span>
          </div>
        </div>
      </article>`;
  }).join('');

  state.combos = combos.slice(0, 10);
  if (state.selectedCombo >= state.combos.length) state.selectedCombo = 0;

  bindItemTips('#comboList .combo-art', combos.slice(0, 10));
  renderCraftCard();
}

function emptyState(title, message, withButton) {
  return `
    <div class="card">
      <div class="empty">
        <img src="assets/cluster_medium.png" alt="">
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        ${withButton ? `<button class="btn primary" data-analyze><svg class="ic sm"><use href="#i-bolt"/></svg>ANALYZE BUILDS</button>` : ''}
      </div>
    </div>`;
}

function panel(title, extra = '') {
  return `<div class="panel-head"><span class="section-title">${title}</span>${extra}</div>`;
}

function renderGlobalRail() {
  const g = state.analysis.global;
  const leader = g.leaderCombo;

  $('globalLeader').innerHTML = leader ? `
    ${panel('Global leader', '<svg class="ic sm" style="color:var(--green)"><use href="#i-crown"/></svg>')}
    <div class="panel-body">
      <div class="leader-top">
        <div class="slot"><img src="${SIZE_IMG[leader.size]}" alt=""></div>
        <div style="min-width:0">
          <div class="leader-name">${esc(leader.label)}</div>
          <div class="leader-sub">${leader.size} cluster jewel · ${leader.buildCount} builds · ${esc(fmt.pct(leader.percentOfBuilds))} of sample</div>
        </div>
      </div>
      <div class="bar"><i style="width:${leader.percentOfBuilds.toFixed(1)}%"></i></div>
      <div class="leader-anchor">
        <svg class="ic sm"><use href="#i-anchor"/></svg>
        <b>${esc(leader.topBuildName || 'unknown')}</b>
        <span style="display:inline-flex;align-items:center;gap:5px">· ${ascTile(leader.topBuildClass, 'sm')}${esc(leader.topBuildClass || '—')} · ${esc(fmt.dps(leader.peakDps))} peak</span>
      </div>
    </div>` : `
    ${panel('Global leader')}
    <div class="panel-body"><span class="cap">No cluster jewels in this snapshot.</span></div>`;

  if (leader) bindItemTips('#globalLeader .leader-top .slot', [leader]);


  const top = g.topDpsBuilds.slice(0, 5);
  $('dpsCard').innerHTML = `
    ${panel('Peak characters', `<span class="cap">${esc(fmt.dps(top[0] ? top[0].dps : 0))} best</span>`)}
    <div class="panel-body">
      ${top.map((b, i) => `
        <div class="mini-row">
          <span class="mini-rank">${String(i + 1).padStart(2, '0')}</span>
          ${gemTile(b.mainSkill, 'sm')}
          <span class="mini-name" title="${esc(b.name)} · ${esc(b.mainSkill)}">${esc(b.name)}</span>
          <span class="mini-val">${esc(fmt.dps(b.dps))}</span>
        </div>`).join('')}
    </div>`;

  $('coverageCard').innerHTML = `
    ${panel('Snapshot')}
    <div class="panel-body">
      <div class="stat-row"><span class="k">Coverage</span><span class="v green">${esc(fmt.pct(g.coveragePercent, 0))}</span></div>
      <div class="stat-row"><span class="k">Combinations found</span><span class="v">${fmt.count(g.combosFound)}</span></div>
      <div class="stat-row"><span class="k">Jewels catalogued</span><span class="v">${fmt.count(g.jewelsCatalogued)}</span></div>
      <div class="stat-row"><span class="k">Ladder builds</span><span class="v">${fmt.count(g.totalBuildsInLeague)}</span></div>
    </div>`;
}

/* ─────────────────────── crafting estimates ───────────────────────
   Odds come straight from the spawn weights: a base rolls its affixes from one
   prefix pool and one suffix pool, so the chance of a notable is its weight
   divided by its pool. Costs are those odds times the price of one attempt. */

const MAGIC_SLOTS = 1;   // magic cluster jewel: one prefix + one suffix
const RARE_SLOTS = 2;    // a rare jewel is priced as two prefixes + two suffixes
const RARE_CAP = 3;      // ... and a cluster jewel can hold three of a type if a combo needs it

function notableType(name) {
  const entry = notableWeights && notableWeights.notables[String(name || '').trim().toLowerCase()];
  return entry ? entry.type : '';
}

function notableTags(name) {
  const entry = notableWeights && notableWeights.notables[String(name || '').trim().toLowerCase()];
  return entry && entry.tags ? entry.tags : [];
}

/* Probability that all of `weights` show up within `slots` draws of their pool
   (inclusion-exclusion, draws treated as independent). */
function presenceChance(weights, total, slots) {
  if (!weights.length) return 1;
  if (!total) return 0;
  const q = weights.map((w) => w / total);
  // P(all present) = sum over subsets T of (-1)^|T| * P(none of T present)
  let chance = 1;
  for (let mask = 1; mask < 1 << q.length; mask += 1) {
    let sum = 0;
    let bits = 0;
    for (let i = 0; i < q.length; i += 1) {
      if (mask & (1 << i)) {
        sum += q[i];
        bits += 1;
      }
    }
    const term = Math.pow(Math.max(0, 1 - sum), slots);
    chance += bits % 2 ? -term : term;
  }
  return Math.max(0, Math.min(1, chance));
}

function craftTarget(combo, levelOverride) {
  const tag = poolFor(combo);
  if (!tag) return null;
  const category = notableWeights.categories[tag];
  if (!category) return null;

  const targets = (combo.notables || []).map((name) => ({
    name,
    weight: notableWeight(name, tag) || 0,
    type: notableType(name),
  }));

  // the cheapest base that can still roll every notable in the combination - unless the
  // caller asks for a specific item level (an iLvl 86 base rolls a bigger pool, so it is
  // harder and dearer than the iLvl 68 that just barely fits)
  const minimumLevel = levelOverride
    || targets.reduce((level, target) => Math.max(level, notableLevel(target.name)), 1);
  const unavailable = targets.filter((target) => notableLevel(target.name) > minimumLevel);

  return {
    tag,
    label: category.label,
    size: combo.size,
    targets,
    unavailable,
    minimumLevel,
    prefixTotal: poolTotalAt(category.pools.Prefix, combo.size, minimumLevel),
    suffixTotal: poolTotalAt(category.pools.Suffix, combo.size, minimumLevel),
  };
}

/* The routes craftofexile ranks, each as { tries, unit, currency[], chaos }.

   A magic jewel holds one prefix and one suffix, so it can never carry two notables of
   the same type. A rare one holds up to three of each kind. Every route therefore has to
   say which item it rolls and how many mods it can land, or the odds come out fantasy:
   an alt->regal "cycle" only becomes worthwhile when the regal quietly turns the magic
   jewel into a rare and lands the second mod. */
function craftRoutes(combo, levelOverride) {
  const target = craftTarget(combo, levelOverride);
  if (!target || !target.targets.length) return { target, routes: [] };

  const prefix = target.targets.filter((t) => t.type === 'Prefix');
  const suffix = target.targets.filter((t) => t.type === 'Suffix');
  const unknown = target.targets.filter((t) => !t.weight || !t.type);
  const routes = [];

  const cost = (entries) => entries.reduce((sum, e) => sum + e.qty * priceOf(e.key), 0);
  const currency = (entries) => entries.filter((e) => e.qty > 0).map((e) => ({ ...e, qty: Math.ceil(e.qty) }));

  // 1. Alteration + Augmentation on a magic jewel: one prefix and one suffix slot
  if (!unknown.length && prefix.length <= MAGIC_SLOTS && suffix.length <= MAGIC_SLOTS && target.targets.length >= 1) {
    const p = presenceChance(prefix.map((t) => t.weight), target.prefixTotal, MAGIC_SLOTS)
      * presenceChance(suffix.map((t) => t.weight), target.suffixTotal, MAGIC_SLOTS);
    if (p > 0) {
      const tries = Math.ceil(1 / p);
      const entries = currency([{ key: 'alteration', label: 'Alt', qty: tries },
        { key: 'augmentation', label: 'Aug', qty: tries * 0.45 }]);
      routes.push({ key: 'alt', name: 'Alt + Aug', unit: 'tries',
        note: 'magic jewel, 1 prefix + 1 suffix — no regal needed',
        tries, currency: entries, chaos: cost(entries) });
    }
  }

  // 2-4. anything that rerolls a rare jewel: chaos, harvest, a 3-fossil resonator
  const rarePrefixSlots = Math.min(RARE_CAP, Math.max(RARE_SLOTS, prefix.length));
  const rareSuffixSlots = Math.min(RARE_CAP, Math.max(RARE_SLOTS, suffix.length));
  const rareChance = presenceChance(prefix.map((t) => t.weight), target.prefixTotal, rarePrefixSlots)
    * presenceChance(suffix.map((t) => t.weight), target.suffixTotal, rareSuffixSlots);
  const rareNote = `rare jewel, ${rarePrefixSlots} prefix${rarePrefixSlots === 1 ? '' : 'es'} + ${rareSuffixSlots} suffix${rareSuffixSlots === 1 ? '' : 'es'}`;

  if (rareChance > 0) {
    const tries = Math.ceil(1 / rareChance);

    const chaosEntries = currency([{ key: 'chaos', label: 'Chaos', qty: tries }]);
    routes.push({ key: 'chaos', name: 'Chaos Orb', unit: 'tries', note: rareNote,
      tries, currency: chaosEntries, chaos: cost(chaosEntries) });

    const harvestEntries = currency([{ key: 'harvest_reforge', label: 'Reforge', qty: tries }]);
    routes.push({ key: 'harvest', name: 'Harvest Reforge', unit: 'tries', note: 'reforge rare, same pool odds',
      tries, currency: harvestEntries, chaos: cost(harvestEntries) });

    const fossilEntries = currency([{ key: 'resonator', label: 'Resonator', qty: tries },
      { key: 'fossil', label: 'Fossil', qty: tries * 3 }]);
    routes.push({ key: 'fossil', name: 'Fossil (3-socket)', unit: 'tries', note: 'odds treat fossils as neutral',
      tries, currency: fossilEntries, chaos: cost(fossilEntries) });
  }

  /* 5. Alt -> Regal. The magic jewel chases what fits in one slot of each type; the regal
     then has to add the one target that is left, and the cycle scours back if it misses.
     Only combos where the magic stage can hold all but one target can be crafted this way. */
  if (!unknown.length) {
    const cycle = altRegalCycle(target);
    if (cycle) {
      const { pMagic, pRegal } = cycle;
      // a cycle is one magic-stage hunt plus exactly one regal, so the number of cycles
      // is set by the regal alone; the alt count is how many rolls each hunt needs
      const cycles = Math.ceil(1 / pRegal);
      const alts = cycles * (1 / pMagic);
      const entries = currency([
        { key: 'alteration', label: 'Alt', qty: alts },
        { key: 'augmentation', label: 'Aug', qty: alts * 0.45 },
        { key: 'regal', label: 'Regal', qty: cycles },
        { key: 'scouring', label: 'Scour', qty: cycles },
        { key: 'transmutation', label: 'Transmute', qty: cycles },
      ]);
      routes.push({ key: 'altregal', name: 'Alt → Regal', unit: 'cycles',
        note: `${fmtQty(alts / cycles)} alts per cycle, then 1 regal · ≈ ${fmtQty(alts + alts * 0.45)} orbs rolled`,
        tries: cycles, currency: entries, chaos: cost(entries) });
    }
  }

  routes.sort((a, b) => a.chaos - b.chaos);
  return { target, routes };
}

/* What a magic jewel can hold, and what the regal then has to deliver. */
function altRegalCycle(target) {
  const prefix = target.targets.filter((t) => t.type === 'Prefix');
  const suffix = target.targets.filter((t) => t.type === 'Suffix');
  if (target.targets.length < 2) return null;               // one mod: alt + aug is enough
  if (prefix.length > 2 || suffix.length > 2) return null;  // two mods cannot carry three notables

  // the magic stage takes one placeholder of each type, then the regal adds the last target
  const magicPrefix = prefix.slice(0, 1);
  const magicSuffix = suffix.slice(0, 1);
  const missing = target.targets.filter((t) => !magicPrefix.includes(t) && !magicSuffix.includes(t));
  if (missing.length !== 1) return null;

  const accept = (list, total) => (total > 0 ? list.reduce((sum, t) => sum + t.weight, 0) / total : 0);

  // either prefix may be the one the magic stage lands, so chase both
  const pMagic = (prefix.length ? accept(prefix.length === 2 ? prefix : magicPrefix, target.prefixTotal) : 1)
    * (suffix.length ? accept(magicSuffix, target.suffixTotal) : 1);

  const need = missing[0];
  const pool = need.type === 'Prefix' ? target.prefixTotal : target.suffixTotal;
  const other = need.type === 'Prefix' ? target.suffixTotal : target.prefixTotal;
  // a regal picks a mod of either type, so only its share of the pool can be a prefix
  const typeShare = pool + other > 0 ? pool / (pool + other) : 0.5;
  // if the magic stage landed the other notable, that mod is gone from the pool
  const spent = need.type === 'Prefix' ? magicPrefix.reduce((s, t) => s + t.weight, 0) : magicSuffix.reduce((s, t) => s + t.weight, 0);
  const pRegal = pool > spent ? typeShare * (need.weight / (pool - spent)) : 0;

  return pMagic > 0 && pRegal > 0 ? { pMagic, pRegal } : null;
}

function fmtQty(value) {
  return fmt.count(Math.max(1, Math.round(value)));
}

function renderCraftCard(hostId = 'craftCard', combo = selectedCombo()) {
  const host = $(hostId);
  if (!host) return;

  if (!combo) {
    host.innerHTML = `${panel('Crafting')}
      <div class="panel-body"><span class="cap">Select a combination to price the ways to craft it.</span></div>`;
    return;
  }

  const { target, routes } = craftRoutes(combo);

  // what the same craft costs on the iLvl 86 base most crafters actually buy: a bigger pool
  // means worse odds, so this is the number another calculator will show
  const ENDGAME_LEVEL = 86;
  const endgameRoutes = target && target.minimumLevel < ENDGAME_LEVEL
    ? craftRoutes(combo, ENDGAME_LEVEL).routes
    : [];
  // other calculators price an iLvl 84+ base, and their headline method is alt -> regal,
  // so compare that route on the bigger base when it exists
  const endgameSame = endgameRoutes.find((r) => r.key === 'altregal') || endgameRoutes[0];
  const endgameChaos = endgameSame ? endgameSame.chaos : 0;
  // the tags the target notables are gated by, in the order they appear
  const targetTags = [...new Set((combo.notables || []).flatMap((name) => notableTags(name)))];
  const cheapest = routes.length ? routes[0].chaos : 0;

  host.innerHTML = `
    ${panel('Crafting', '<span class="cap">expected cost</span>')}
    <div class="panel-body">
      <div class="craft-target" title="${esc(combo.label)}">
        <img src="${SIZE_IMG[combo.size]}" alt="">${esc(combo.label)}
      </div>
      <div class="craft-ilvl">needs iLvl <b>${target ? target.minimumLevel : '?'}</b> · priced on an iLvl ${target ? target.minimumLevel : '?'} base</div>
      ${targetTags.length ? `<div class="craft-tags">${targetTags.map((tag) => tagChip(tag)).join('')}</div>` : ''}
      ${routes.length ? routes.slice(0, 3).map((route, i) => `
        <div class="craft-route ${i === 0 ? 'best' : ''}">
          <div class="craft-head">
            <b>${esc(route.name)}</b>
            <span class="craft-tries">1 in ${fmtQty(route.tries)} ${esc(route.unit || 'tries')}</span>
          </div>
          <div class="craft-cost">
            <span class="craft-list">${route.currency.map((e) => `${fmtQty(e.qty)} ${esc(e.label)}`).join(' · ')}</span>
            <b>${esc(fmt.chaos(route.chaos))}</b>
          </div>
          <div class="bar"><i style="width:${cheapest ? (cheapest * 100) / route.chaos : 0}%;background:${i === 0 ? 'var(--green)' : 'var(--text-3)'}"></i></div>
          <div class="craft-sub">${esc(route.note)}</div>
        </div>`).join('') : '<div class="craft-empty">No route modelled: these notables do not all roll from this base’s pool.</div>'}
      <div class="craft-note">
        ${target ? `${esc(target.label)} pool at iLvl ${target.minimumLevel}: ${fmt.count(target.prefixTotal)} prefix / ${fmt.count(target.suffixTotal)} suffix weight` : 'No pool for this base'}
        ${endgameChaos ? `· ${esc(endgameSame.name)} on an iLvl ${ENDGAME_LEVEL} base ≈ ${esc(fmt.chaos(endgameChaos))}` : ''}
        · prices are placeholders in <code>assets/currency_costs.json</code>.
      </div>
    </div>`;
}

function selectedCombo() {
  const combos = state.combos || [];
  return combos[state.selectedCombo] || combos[0] || null;
}

function renderMeta() {
  const g = state.analysis.global;
  const snap = state.snapshot;

  $('metaSub').innerHTML = isSynthetic()
    ? `<b>${esc(snap.leagueName)}</b> · synthetic demo snapshot · ${state.analysis.skills.length} skills above ${state.floor.toFixed(1)}% · numbers illustrate the analysis`
    : `<b>${esc(snap.leagueName)}</b> · snapshot ${esc(snap.snapshotVersion)} · ${state.analysis.skills.length} skills above ${state.floor.toFixed(1)}%`;

  const tiles = [
    ['Ladder builds', fmt.count(g.totalBuildsInLeague), isSynthetic() ? 'demo figure' : `${snap.leagueName} ladder`, ''],
    ['Skills tracked', fmt.count(g.skillsTracked), `above ${state.floor.toFixed(1)}%`, 'green'],
    ['Characters sampled', fmt.count(g.charactersSampled), 'cluster data read', ''],
    ['Jewels catalogued', fmt.count(g.jewelsCatalogued), `${fmt.count(g.combosFound)} distinct combos`, ''],
    ['Coverage', fmt.pct(g.coveragePercent, 0), 'of tracked skills sampled', 'green'],
    ['Top combo', String(g.leaderCombo ? g.leaderCombo.buildCount : 0),
      g.leaderCombo ? `${g.leaderCombo.size} · ${fmt.pct(g.leaderCombo.percentOfBuilds)}` : '—', 'blue'],
  ];

  $('metaTiles').innerHTML = tiles.map(([label, value, sub, tone]) => `
    <div class="tile">
      <span class="micro">${esc(label)}</span>
      <div class="v ${tone}">${esc(value)}</div>
      <div class="sub">${esc(sub)}</div>
    </div>`).join('');

  const combos = (state.metaSize === 'all'
    ? g.topCombos
    : (state.metaSize === 'Large' ? g.largeCombos : g.mediumCombos).slice(0, 12));
  const max = comboMax(combos);

  state.metaCombos = combos;
  const pricedLabel = (state.metaCombo || g.leaderCombo || combos[0] || {}).label;
  $('metaComboList').innerHTML = combos.length ? combos.map((c, i) => `
    <div class="meta-combo ${c.label === pricedLabel ? 'on' : ''}" data-combo="${i}">
      <span class="mc-art">
        <img src="${SIZE_IMG[c.size]}" alt="">
        <span class="mc-rank">${String(i + 1).padStart(2, '0')}</span>
      </span>
      <div class="mc-main">
        <div class="mc-title" title="${esc(c.label)}">${esc(c.label)}</div>
        <div class="mc-sub">
          <span class="size-tag" style="--c:${SIZE_COLOR[c.size]}"><img class="art tiny" src="${SIZE_IMG[c.size]}" alt="">${c.size.toUpperCase()}</span>
          <span>${c.buildCount} builds</span>
          <span>·</span>
          <span class="skills" title="${esc(c.skills.join(', '))}">${esc(c.skills.join(' · ') || '—')}</span>
        </div>
        <div class="bar mc-bar"><i style="width:${max ? (c.buildCount * 100 / max).toFixed(1) : 0}%;background:${SIZE_COLOR[c.size]}"></i></div>
      </div>
      <div class="mc-val">
        <b>${esc(fmt.pct(c.percentOfBuilds))}</b>
        <span>${esc(fmt.dps(c.averageDps))} avg</span>
      </div>
    </div>`).join('') : `<div class="empty"><h3>No combinations</h3><p>Relax the popularity floor in Settings.</p></div>`;

  bindItemTips('#metaComboList .mc-art', combos);

  const notables = g.topNotables.slice(0, 14);
  $('notablesCard').innerHTML = `
    ${panel('Most used notables', '<span class="cap">share of builds</span>')}
    <div class="panel-body notable-scroll">
      ${notables.map((n) => `
        <div class="notable-row">
          <div>
            <div class="notable-name" title="${esc(n.name)} — ${n.size} cluster">
              <i class="dot" style="--c:${SIZE_COLOR[n.size]}"></i>${esc(n.name)}
            </div>
            <div class="bar notable-bar"><i style="width:${n.percent.toFixed(1)}%;background:${SIZE_COLOR[n.size]}"></i></div>
            ${(() => {
              const pool = notablePool(n.name, n.size);
              const weight = pool ? notableWeight(n.name, pool.tag) : null;
              const total = poolTotalFor(pool, n.name);
              if (!weight || !total) return '';
              const chance = (weight * 100) / total;
              return `<div class="notable-meta">${esc(pool.label)} pool · weight ${fmt.count(weight)} · ${chance >= 10 ? chance.toFixed(0) : chance.toFixed(1)}% of pool</div>`;
            })()}
          </div>
          <div class="notable-val">${esc(fmt.pct(n.percent, 0))}</div>
        </div>`).join('')}
    </div>`;

  // ---- crafting: the combination tapped above, or the most popular one overall
  const priced = state.metaCombo || g.leaderCombo || combos[0] || null;
  renderCraftCard('metaCraftCard', priced);
}

/* ─────────────────────────── ladder page ─────────────────────────── */

function renderLadder() {
  const g = state.analysis.global;
  const all = g.ladder;

  const query = state.ladderQuery.trim().toLowerCase();
  let rows = query
    ? all.filter((b) =>
        String(b.name).toLowerCase().includes(query) ||
        String(b.className).toLowerCase().includes(query) ||
        String(b.mainSkill).toLowerCase().includes(query))
    : all.slice();

  const { key, dir } = state.ladderSort;
  rows.sort((a, b) => {
    const av = key === 'rank' ? all.indexOf(a) + 1 : key === 'clusterJewelCount'
      ? (a.clusterJewelCount || 0) : a[key];
    const bv = key === 'rank' ? all.indexOf(b) + 1 : key === 'clusterJewelCount'
      ? (b.clusterJewelCount || 0) : b[key];
    if (typeof av === 'string') return dir * String(av).localeCompare(String(bv));
    return dir * ((av || 0) - (bv || 0));
  });

  $('ladderSub').innerHTML =
    `<b>${fmt.count(rows.length)}</b> of ${fmt.count(all.length)} builds · sorted by ` +
    `${key === 'clusterJewelCount' ? 'cluster count' : key}`;

  $('ladderBody').innerHTML = rows.map((b) => {
    const rank = all.indexOf(b) + 1;
    const accent = DAMAGE_COLOR[damageOf(b.mainSkill)] || DAMAGE_COLOR.Physical;
    return `
      <div class="trow ${rank <= 3 ? 'top' : ''}">
        <span class="rk">${String(rank).padStart(2, '0')}</span>
        <span class="nm"><i class="accent" style="--c:${accent}"></i><b title="${esc(b.account)}">${esc(b.name)}</b></span>
        <span class="cls">${ascImg(b.className, 'lg')}${esc(b.className || '—')}</span>
        <span class="skl" title="${esc(b.mainSkill)}">${gemTile(b.mainSkill, 'sm')}<span>${esc(b.mainSkill || '—')}</span></span>
        <span class="dps">${esc(fmt.dps(b.dps))}</span>
        <span class="cl ${b.clusterJewelCount ? '' : 'zero'}">${b.clusterJewelCount ? b.clusterJewelCount : '—'}</span>
      </div>`;
  }).join('') || `<div class="empty"><h3>No builds</h3><p>Nothing matches that filter.</p></div>`;

  document.querySelectorAll('.th').forEach((th) => {
    const active = th.dataset.key === state.ladderSort.key;
    th.classList.toggle('on', active);
    const existing = th.querySelector('.caret');
    if (existing) existing.remove();
    if (active) {
      const caret = document.createElement('span');
      caret.className = 'caret';
      caret.textContent = state.ladderSort.dir === -1 ? '▼' : '▲';
      th.appendChild(caret);
    }
  });
}

/* ─────────────────────────── settings page ─────────────────────────── */

function renderSettings() {
  $('depthVal').textContent = state.settings.depth;
  $('depthRange').value = state.settings.depth;
  $('floorVal').textContent = state.floor.toFixed(1) + '%';
  $('floorRange').value = state.floor;

  const total = state.snapshot.totalBuildsInLeague;
  const tracked = state.analysis.skills.length;
  const totalSkills = state.snapshot.skills.length;
  $('floorHint').textContent =
    `${fmt.count(total)} builds ${isSynthetic() ? 'in the demo' : 'in league'} · ${tracked} of ${totalSkills} skills above the floor`;

  const err = $('lastError');
  if (err && !err.textContent.trim()) err.textContent = 'none — snapshot loaded cleanly';
}

/* ─────────────────────────── master render ─────────────────────────── */

function renderAll() {
  renderShell();
  renderSkillRail();
  renderHero();
  renderPills();
  renderCombos();
  renderGlobalRail();
  renderMeta();
  renderLadder();
  renderSettings();
}

function setSize(size) {
  if (!SIZES.includes(size)) return;
  state.size = size;
  state.selectedCombo = 0;
  renderPills();
  renderHero();
  renderCombos();
  const stat = selectedSkillStat();
  if (stat) setStatus(`${stat.name} — ${size.toLowerCase()} cluster combinations ranked`);
}

function selectSkill(name) {
  state.selectedSkill = name;
  state.selectedCombo = 0;
  renderSkillRail();
  renderHero();
  renderPills();
  renderCombos();
  const stat = selectedSkillStat();
  if (stat) {
    setStatus(`${stat.name} — ${state.analysis.profiles.get(stat.name).sampledBuilds} sampled builds, ${state.size.toLowerCase()} combinations ranked`);
  }
}

function setTab(tab) {
  state.tab = tab;
  for (const key of ['lab', 'meta', 'ladder', 'settings']) {
    $('view-' + key).hidden = key !== tab;
  }
  document.querySelectorAll('.nav-tile').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
}

/* ─────────────────────────── simulated work ─────────────────────────── */

function runBusy(title, steps, stepLabel, done) {
  if (state.busy) return;
  state.busy = true;
  const scrim = $('busy');
  $('busyTitle').textContent = title;
  $('busyBar').style.width = '0%';
  $('busySub').textContent = stepLabel(0, steps);
  scrim.hidden = false;

  let step = 0;
  let cancelled = false;
  const cancel = () => { cancelled = true; clearInterval(timer); finish(); };
  const finish = () => {
    clearInterval(timer);
    scrim.hidden = true;
    state.busy = false;
    $('busyCancel').removeEventListener('click', cancel);
    if (!cancelled) done();
    else setStatus('Cancelled — nothing was fetched');
  };
  $('busyCancel').addEventListener('click', cancel);

  const timer = setInterval(() => {
    step += 1;
    const ratio = Math.min(1, step / steps);
    $('busyBar').style.width = (ratio * 100).toFixed(0) + '%';
    $('busySub').textContent = stepLabel(Math.min(step, steps), steps);
    if (step >= steps) finish();
  }, 110);
}

function simulateSync() {
  const skill = selectedSkillStat();
  if (state.busy) return;
  runBusy('Sampling builds', 14,
    (i, n) => `${i} / ${n} characters${skill ? ' · ' + skill.name : ''}`,
    () => {
      state.lastSync = new Date();
      renderShell();
      setStatus('Preview build — network calls are disabled, so the bundled sample snapshot was re-analysed.');
      toast('Preview build: live poe.ninja sync is disabled here. The Windows app performs the real crawl.');
    });
}

function simulateAnalyze() {
  const stat = selectedSkillStat();
  if (!stat) return;
  const profile = state.analysis.profiles.get(stat.name);
  runBusy(`Sampling ${stat.name}`, Math.max(6, Math.min(14, profile.topBuilds || 12)),
    (i, n) => `${i} / ${n} top builds`,
    () => {
      setStatus(`${stat.name} — analysis refreshed from the sample (${profile.sampledBuilds} builds)`);
      toast(`Preview build: “${stat.name}” already has ${profile.sampledBuilds} sampled builds in the bundled snapshot.`);
      renderAll();
    });
}

/* ─────────────────────────── wiring ─────────────────────────── */

function wire() {
  document.querySelectorAll('.nav-tile').forEach((tile) => {
    tile.addEventListener('click', () => setTab(tile.dataset.tab));
  });

  $('skillSearch').addEventListener('input', (e) => {
    state.query = e.target.value;
    renderSkillRail();
    if (!visibleSkills().some((s) => s.name === state.selectedSkill)) {
      const first = visibleSkills()[0];
      state.selectedSkill = first ? first.name : null;
      renderHero(); renderPills(); renderCombos();
    }
  });

  document.querySelectorAll('#sortPills button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sort = btn.dataset.sort;
      document.querySelectorAll('#sortPills button').forEach((b) => b.classList.toggle('on', b === btn));
      renderSkillRail();
    });
  });

  $('skillList').addEventListener('click', (e) => {
    const row = e.target.closest('.skill');
    if (row) selectSkill(row.dataset.skill);
  });

  $('sizePills').addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;
    setSize(pill.dataset.size);
  });

  $('comboList').addEventListener('click', (e) => {
    if (e.target.closest('[data-analyze]')) {
      simulateAnalyze();
      return;
    }

    const card = e.target.closest('.combo');
    if (card && card.dataset.index != null) {
      state.selectedCombo = Number(card.dataset.index);
      renderCombos();
    }
  });

  $('analyzeBtn').addEventListener('click', simulateAnalyze);
  $('sampleAllBtn').addEventListener('click', simulateAnalyze);
  $('syncBtn').addEventListener('click', simulateSync);
  $('metaResync').addEventListener('click', simulateSync);

  document.querySelectorAll('[data-sync]').forEach((btn) => btn.addEventListener('click', simulateSync));
  document.querySelectorAll('[data-toast]').forEach((btn) => {
    btn.addEventListener('click', () => toast(btn.dataset.toast));
  });
  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      downloadCsv();
      toast('CSV exported from the snapshot (preview download).');
    });
  });

  $('metaComboList').addEventListener('click', (e) => {
    const row = e.target.closest('.meta-combo');
    if (!row) return;
    const combos = state.metaCombos || [];
    state.metaCombo = combos[Number(row.dataset.combo)] || null;
    renderMeta();
  });

  document.querySelectorAll('#metaSizeFilter button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.metaSize = btn.dataset.size;
      document.querySelectorAll('#metaSizeFilter button').forEach((b) => b.classList.toggle('on', b === btn));
      renderMeta();
    });
  });

  $('ladderSearch').addEventListener('input', (e) => {
    state.ladderQuery = e.target.value;
    renderLadder();
  });

  document.querySelectorAll('.th').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (state.ladderSort.key === key) state.ladderSort.dir *= -1;
      else state.ladderSort = { key, dir: key === 'rank' ? 1 : -1 };
      renderLadder();
    });
  });

  $('depthRange').addEventListener('input', (e) => {
    state.settings.depth = Number(e.target.value);
    $('depthVal').textContent = state.settings.depth;
    setStatus(`Sample depth set to ${state.settings.depth} builds per skill — applies on the next sync`);
  });

  $('floorRange').addEventListener('input', (e) => {
    state.floor = Number(e.target.value);
    $('floorVal').textContent = state.floor.toFixed(1) + '%';
    state.analysis = analyze(state.snapshot, state.floor);
    const stillValid = state.selectedSkill && state.analysis.skills.some((s) => s.name === state.selectedSkill);
    if (!stillValid) {
      const first = visibleSkills()[0];
      state.selectedSkill = first ? first.name : null;
    }
    renderAll();
    setStatus(`Popularity floor ${state.floor.toFixed(1)}% — tracking ${state.analysis.skills.length} skills`);
  });

  $('paceSel').addEventListener('change', (e) => {
    state.settings.pacing = Number(e.target.value);
    setStatus(`Character pacing set to ${state.settings.pacing} s`);
  });

  $('leagueSel').addEventListener('change', (e) => {
    toast('Preview build: only the bundled sample is available locally.');
    e.target.value = 'Allflame (current)';
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    const map = { 1: 'meta', 2: 'lab', 3: 'ladder', 4: 'settings' };
    if (map[e.key]) setTab(map[e.key]);
    if (e.key === '/' && state.tab === 'lab') { e.preventDefault(); $('skillSearch').focus(); }
  });
}

/* ─────────────────────────── CSV export ─────────────────────────── */

function downloadCsv() {
  const rows = [['size', 'combination', 'builds', 'percent', 'avg_dps', 'peak_dps', 'top_build', 'top_class']];
  for (const size of SIZES) {
    const combos = buildCombos(state.snapshot.characters, size, state.snapshot.characters.length, false);
    for (const c of combos) {
      rows.push([size, c.label, c.buildCount, c.percentOfBuilds.toFixed(1),
        Math.round(c.averageDps), Math.round(c.peakDps), c.topBuildName, c.topBuildClass]);
    }
  }
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `forever-exiled-combos-${state.snapshot.leagueUrl}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ─────────────────────────── boot ─────────────────────────── */

async function boot() {
  let snapshot;
  try {
    // A real crawl can be dropped in as data/live-snapshot.json (the app's cache file);
    // the bundled demo is only the fallback. Anything with source !== 'sample' is
    // treated as real data and loses the synthetic banner automatically.
    snapshot = await fetch('data/live-snapshot.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    if (!snapshot) {
      const response = await fetch('data/demo-snapshot.json', { cache: 'no-store' });
      snapshot = await response.json();
    }
  } catch (error) {
    document.querySelector('.stage').innerHTML = `
      <div class="empty" style="height:100%">
        <img src="assets/cluster_medium.png" alt="">
        <h3>Snapshot not loaded</h3>
        <p>Serve this folder over HTTP (for example <code>python3 -m http.server</code>) — browsers block
        local file reads for security. Details: ${esc(error.message)}</p>
      </div>`;
    return;
  }

  // a hover card must never outlive the thing under the cursor
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('resize', hideTip);
  window.addEventListener('blur', hideTip);

  await loadGemIndex();
  await loadNotableText();
  await loadNotableWeights();
  await loadTagColors();
  await loadCurrencyCosts();

  state.snapshot = snapshot;
  state.floor = snapshot.minPopularityPercent || 1;
  state.analysis = analyze(snapshot, state.floor);
  state.selectedSkill = visibleSkills()[0] ? visibleSkills()[0].name : null;

  wire();
  setTab('lab');
  renderAll();
  setStatus(isSynthetic()
    ? `Loaded the bundled demo snapshot — synthetic data, not the live ladder (${state.analysis.skills.length} tracked skills)`
    : `Loaded ${snapshot.leagueName} snapshot ${snapshot.snapshotVersion} — ${state.analysis.skills.length} tracked skills`);
}

boot();
