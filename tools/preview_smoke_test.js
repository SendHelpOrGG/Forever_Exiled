#!/usr/bin/env node
/**
 * Smoke test for the browser preview (preview/).
 *
 * Loads preview/index.html in jsdom, feeds it the bundled snapshot and drives the UI:
 * skill selection, size switch, search, the four tabs, ladder filter/sort, the
 * popularity floor and the busy overlay. Fails loudly if any screen renders nothing.
 *
 *     npm install jsdom          # once, anywhere on the PATH
 *     node tools/preview_smoke_test.js
 *
 * The preview is not the shipped app, but it shares its layout contract and the
 * aggregation rules, so this catches the errors a compiler would in the C# UI layer:
 * missing ids, unbound handlers, empty lists, broken number formatting.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..', 'preview');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
virtualConsole.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

const html = read('index.html').replace('<script src="app.js"></script>', '');
const dom = new JSDOM(html, { runScripts: 'outside-only', virtualConsole, pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

const snapshot = JSON.parse(read('data/demo-snapshot.json'));
const gemIndex = JSON.parse(read('assets/gems/index.json'));
const notables = JSON.parse(read('assets/notables.json'));
const weights = JSON.parse(read('assets/notable_weights.json'));
const costs = JSON.parse(read('assets/currency_costs.json'));
const tagColors = JSON.parse(read('assets/tag_colors.json'));
window.fetch = (url) => Promise.resolve({
  ok: true,
  json: async () => {
    const target = String(url);
    if (target.includes('gems/index.json')) return gemIndex;
    if (target.includes('notable_weights.json')) return weights;
    if (target.includes('currency_costs.json')) return costs;
    if (target.includes('tag_colors.json')) return tagColors;
    if (target.includes('notables.json')) return notables;
    return snapshot;
  },
});
window.eval(read('app.js'));

const q = (s) => document.querySelector(s);
const qa = (s) => [...document.querySelectorAll(s)];
const txt = (s) => (q(s) ? q(s).textContent.replace(/\s+/g, ' ').trim() : '<missing>');
const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const type = (node, value) => {
  node.value = value;
  node.dispatchEvent(new window.Event('input', { bubbles: true }));
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const results = [];
const check = (label, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);

setTimeout(async () => {
  /* ── the snapshot must announce itself as synthetic ── */
  check('synthetic banner visible', !q('#notice').hidden, txt('#noticeText').slice(0, 60) + '…');
  check('banner says the data is not the ladder',
    /Synthetic demo data/i.test(txt('#noticeText')) && /not/i.test(txt('#noticeText')));
  check('header badge says SYNTHETIC SAMPLE', txt('#sourceTag .src-label').trim() === 'SYNTHETIC SAMPLE',
    txt('#sourceTag .src-label').trim());
  check('league labelled as demo', txt('#leagueName').includes('demo'), txt('#leagueName'));
  check('ladder-builds tile is marked as a demo figure',
    txt('#metaTiles .tile .sub').includes('demo'), txt('#metaTiles .tile .sub'));

  /* ── cluster lab ── */
  const skills = qa('#skillList .skill');
  check('skill rail populated', skills.length === snapshot.skills.length, skills.length + ' skills');
  check('rail sorted by DPS', txt('#skillList .skill .skill-name') === 'Molten Strike of the Zenith',
    txt('#skillList .skill .skill-name'));
  const railIcons = qa('#skillList .skill .asc-slot img');
  check('skill rail shows ascendancy portraits', railIcons.length === skills.length,
    railIcons.length + ' of ' + skills.length + ' rows');
  check('ascendancy art exists on disk',
    railIcons.length > 0 && railIcons.every((img) => fs.existsSync(path.join(root, img.getAttribute('src')))),
    railIcons.length + ' portraits under assets/asc');
  check('class art and gem art share a tile size',
    qa('#skillList .skill .gem-slot').length === qa('#skillList .skill .asc-slot').length,
    qa('#skillList .skill .gem-slot').length + ' gem tiles · ' + qa('#skillList .skill .asc-slot').length + ' class tiles');
  check('every class in the snapshot has art',
    [...new Set(snapshot.skills.flatMap((s) => s.classes.map((c) => c.name.toLowerCase())))].every((name) =>
      fs.existsSync(path.join(root, 'assets', 'asc', name + '.jpg'))),
    [...new Set(snapshot.skills.flatMap((s) => s.classes.map((c) => c.name)))].join(', '));
  check('hero card', txt('#hero .hero-stats').includes('AVG DPS'), txt('#hero .hero-name') + ' · ' + txt('#hero .hero-stats'));
  check('hero shows the skill gem', !!q('#hero .slot.xl img') &&
    String(q('#hero .slot.xl img').getAttribute('src')).includes('assets/gems/'),
    (q('#hero .slot.xl img') || {}).getAttribute ? q('#hero .slot.xl img').getAttribute('src') : 'missing');
  check('hero shows the ascendancy portrait as a tile', !!q('#hero .slot.portrait img'),
    (q('#hero .slot.portrait img') || {}).src || 'missing');
  check('three size pills', qa('#sizePills .pill').length === 3);

  /* ── gem art: the visual anchor of every skill row ── */
  const railGems = qa('#skillList .skill .gem-slot img');
  check('skill rail shows gem art', railGems.length === skills.length,
    railGems.length + ' of ' + skills.length + ' rows');
  check('gem art files exist on disk',
    railGems.length > 0 && railGems.every((img) => fs.existsSync(path.join(root, img.getAttribute('src')))),
    railGems.length + ' icons under assets/gems');
  check('every demo skill resolves to gem art',
    snapshot.skills.every((s) => {
      const slug = String(s.name).toLowerCase().replace(/['\u2019,.]/g, '').replace(/_/g, ' ')
        .replace(/[^a-z0-9 ]+/g, '').trim().replace(/\s+/g, '_');
      return gemIndex.slugs.some((candidate) => candidate === slug || candidate.startsWith(slug + '_'));
    }),
    snapshot.skills.map((s) => s.name).filter((n) => {
      const slug = String(n).toLowerCase().replace(/['\u2019,.]/g, '').replace(/_/g, ' ')
        .replace(/[^a-z0-9 ]+/g, '').trim().replace(/\s+/g, '_');
      return !gemIndex.slugs.some((candidate) => candidate === slug || candidate.startsWith(slug + '_'));
    }).join(', ') || 'all 18 mapped');
  check('the rail shows a peak and an average for every skill',
    qa('#skillList .skill .skill-dps').length === qa('#skillList .skill').length &&
      qa('#skillList .skill .skill-avg').length === qa('#skillList .skill').length,
    qa('#skillList .skill').length + ' skills · ' +
      (qa('#skillList .skill .skill-avg')[0] || {}).textContent);
  check('combo cards', qa('#comboList .combo').length > 0,
    qa('#comboList .combo').length + ' cards · ' + txt('#comboList .combo .combo-pct'));
  /* ── hover card: the cluster jewel as an item, like the site ── */
  const jewelTile = q('#comboList .combo-art');
  jewelTile.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: false, clientX: 120, clientY: 160 }));
  const tip = document.querySelector('.item-tip');
  check('hovering a cluster jewel shows the item card', !!tip && !tip.hidden,
    tip ? tip.textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : 'missing');
  check('item card names the jewel base type', !!tip && /Cluster Jewel/.test(tip.textContent));
  check('item card lists the notables as item mods',
    !!tip && /1 Added Passive Skill is /.test(tip.textContent),
    tip ? (tip.textContent.match(/1 Added Passive Skill is [^0-9]+/) || ['none'])[0] : 'missing');
  check('the card opens with the gold name band',
    !!tip && qa('.item-tip .tip-head').length === 1 && !!q('.item-tip .tip-base'),
    txt('.item-tip .tip-titles'));
  check('the band prints the base type under the name',
    /Cluster Jewel$/.test(txt('.item-tip .tip-base').trim()),
    txt('.item-tip .tip-base'));
  const goldLines = qa('.item-tip .tip-line.gold');
  check('notable affixes are printed in gold, one per notable',
    goldLines.length >= 2 && goldLines.every((n) => /^1 Added Passive Skill is \S/.test(n.textContent.trim())),
    goldLines.map((n) => n.textContent.trim()).join(' | '));
  const notablesOnCard = qa('.item-tip .tip-notable');
  check('every notable is then spelled out with its own modifiers',
    notablesOnCard.length > 0 && qa('.item-tip .tip-line.blue').length > notablesOnCard.length,
    `${notablesOnCard.length} notable blocks · ${qa('.item-tip .tip-line.blue').length} blue lines`);
  check('the card ends with the jewel art, no socket instructions',
    qa('.item-tip .tip-foot img').length === 1 && !/Place into an allocated/.test(tip.textContent),
    qa('.item-tip .tip-foot img').length + ' art · flavour text: ' +
      (/Place into an allocated/.test(tip.textContent) ? 'still there' : 'removed'));
  const tagHues = (nodes) => nodes.map((n) => (n.getAttribute('style') || '').toLowerCase());
  const cardTags = qa('.item-tip .tip-tags .tagchip');
  check('each notable carries its coloured mod tags on the card',
    cardTags.length > 0 && tagHues(cardTags).every((style) => /color:#[0-9a-f]{6}/.test(style)),
    cardTags.map((n) => n.textContent).join(', '));
  check('the card draws the hairlines between blocks',
    qa('.item-tip .tip-sep').length >= 3,
    qa('.item-tip .tip-sep').length + ' separators');
  const itemTagNodes = qa('#metaCraftCard .craft-tags .tagchip');
  const itemHues = tagHues(itemTagNodes);
  check('mod tags are coloured, not one neutral grey',
    itemTagNodes.length > 0 && itemHues.every((style) => /color:#[0-9a-f]{6}/.test(style))
      && new Set(itemHues.map((style) => (/color:#[0-9a-f]{6}/.exec(style) || [])[0])).size > 1,
    itemTagNodes.map((n) => `${n.textContent}=${(/color:#[0-9a-f]{6}/.exec(n.getAttribute('style')) || [])[0]}`).join(' '));
  check('each tag uses its own hue from the palette',
    itemTagNodes.every((n) => {
      const tag = n.textContent.trim().replace(/ /g, '_').toLowerCase();
      const expected = tagColors.tags[tag];
      return !expected || (n.getAttribute('style') || '').toLowerCase().includes(expected);
    }),
    itemTagNodes.map((n) => n.textContent).join(', '));
  // the site lists leaf tags, not the composite ones a mod-tag query uses
  const compositeTags = ['elemental_damage', 'chaos_damage', 'physical_damage', 'caster_damage', 'resource'];
  const taggedNotables = Object.values(weights.notables).filter((n) => (n.tags || []).length > 0);
  check('no notable carries a composite tag the site does not show',
    taggedNotables.every((n) => n.tags.every((t) => !compositeTags.includes(t))),
    taggedNotables.filter((n) => n.tags.some((t) => compositeTags.includes(t)))
      .map((n) => n.name).join(', ') || `${taggedNotables.length} notables clean`);
  check("Doryani's Lesson shows life, damage and elemental",
    (weights.notables["doryani's lesson"].tags || []).join(',') === 'life,damage,elemental',
    (weights.notables["doryani's lesson"].tags || []).join(', '));

  const dataTags = new Set(Object.values(weights.notables).flatMap((n) => n.tags || []));
  const unpainted = [...dataTags].filter((tag) => !tagColors.tags[tag]);
  check('every mod tag in the data has a colour', unpainted.length === 0,
    unpainted.length ? unpainted.join(', ') : `${dataTags.size} tags painted`);
  check('item card carries no analysis and no crafting figures',
    !!tip && !/Share of sample|Average DPS|% of pool|weight|pool ·/.test(tip.textContent),
    tip ? tip.textContent.replace(/\s+/g, ' ').slice(0, 110) : 'missing');
  const snapshotNotables = [...new Set(snapshot.characters.flatMap((c) =>
    (c.clusterJewels || []).flatMap((j) => j.notables || [])))];
  const undocumented = snapshotNotables.filter((n) => !notables.notables[String(n).toLowerCase()]);
  check('every notable in the snapshot has its description', undocumented.length === 0,
    (undocumented.length ? undocumented.join(', ') : snapshotNotables.length + ' notables documented'));
  jewelTile.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: false }));
  check('leaving the jewel hides the item card', !!tip && tip.hidden);

  check('global leader names an anchor build',
    txt('#globalLeader .leader-anchor').includes('·'),
    txt('#globalLeader .leader-name') + ' / ' + txt('#globalLeader .leader-anchor'));
  check('the lab no longer carries the cluster sizes card', !q('#mixCard'),
    q('#mixCard') ? 'still there' : 'removed');
  check('the lab still lists combinations for the selected size', qa('#comboList .combo').length > 0,
    qa('#comboList .combo').length + ' cards · ' + txt('#comboHeader'));
  check('peak characters', qa('#dpsCard .mini-row').length === 5);

  /* ── size switch + skill selection ── */
  click(qa('#sizePills .pill').find((p) => p.textContent.includes('LARGE')));
  check('size switch to Large', txt('#comboHeader').includes('LARGE'), txt('#comboHeader'));

  click(qa('#skillList .skill').find((s) => s.dataset.skill === 'Winter Orb'));
  check('select Winter Orb', txt('#hero .hero-name') === 'Winter Orb');
  check('Winter Orb large top combo', txt('#comboList .combo .combo-chips').includes('Blanketed Snow'),
    txt('#comboList .combo .combo-chips') + ' ' + txt('#comboList .combo .combo-pct'));

  click(qa('#sizePills .pill').find((p) => p.textContent.includes('MEDIUM')));
  const mediumTop = txt('#comboList .combo .combo-chips');
  check('Winter Orb medium top combo', mediumTop.includes('Eye to Eye') && mediumTop.includes('Repeater'),
    mediumTop + ' ' + txt('#comboList .combo .combo-pct'));

  /* ── crafting: expected tries and currency per route ── */
  const craftCard = q('#craftCard');
  const routeRows = qa('#craftCard .craft-route');
  check('crafting card prices the selected jewel', routeRows.length > 0,
    txt('#craftCard .craft-target'));
  check('every route states the number of tries',
    routeRows.every((r) => /1 in [\d,]+ (tries|cycles)/.test(r.textContent)),
    routeRows.map((r) => (r.querySelector('.craft-tries') || {}).textContent).join(' | '));
  check('the alt to regal route counts cycles, not magic rolls',
    routeRows.filter((r) => /Alt → Regal/.test(r.textContent)).every((r) => /1 in [\d,]+ cycles/.test(r.textContent)),
    routeRows.map((r) => (r.querySelector('.craft-tries') || {}).textContent).join(' | '));
  check('alt to regal only appears when a magic jewel can hold all but one target',
    routeRows.filter((r) => /Alt → Regal/.test(r.textContent))
      .every((r) => /Scour/.test(r.textContent) && /Transmute/.test(r.textContent)),
    routeRows.filter((r) => /Alt → Regal/.test(r.textContent)).map((r) => r.textContent.replace(/\s+/g, ' ').slice(0, 80)).join(' | ') || 'no alt to regal route on this combo');
  check('every route lists the currency it spends',
    routeRows.every((r) => /\d[\d,]* (Chaos|Alt|Aug|Regal|Reforge|Resonator|Fossil)/.test(r.textContent)),
    routeRows.map((r) => (r.querySelector('.craft-list') || {}).textContent).join(' | '));
  const routeCosts = routeRows.map((r) => parseFloat(r.querySelector('.craft-cost b').textContent.replace(/[^\d.]/g, '')));
  check('routes are ranked cheapest first', routeCosts.every((c, i) => i === 0 || c >= routeCosts[i - 1]),
    routeCosts.join(' <= '));
  check('at most the three best routes are shown', routeRows.length <= 3, routeRows.length + ' routes');

  const selectedComboLabel = txt('#craftCard .craft-target');
  const comboNotables = selectedComboLabel.split(' + ');
  const expectedLevel = comboNotables.reduce((level, name) => {
    const entry = weights.notables[name.toLowerCase()];
    return Math.max(level, entry ? entry.level || 1 : 1);
  }, 1);
  const statedLevel = /needs iLvl (\d+)/.exec(txt('#craftCard .craft-ilvl'));
  check('crafting names the minimum item level', !!statedLevel, txt('#craftCard .craft-ilvl'));
  const craftTags = qa('#craftCard .craft-tags .tagchip');
  check('crafting card colours the tags the targets are gated by',
    craftTags.length > 0 && craftTags.every((n) => /color:#[0-9a-f]{6}/.test((n.getAttribute('style') || '').toLowerCase())),
    craftTags.map((n) => n.textContent).join(', '));
  check('the minimum item level is the highest notable level',
    !!statedLevel && Number(statedLevel[1]) === expectedLevel,
    `stated ${statedLevel ? statedLevel[1] : '?'} · expected ${expectedLevel}`);

  // every pool carries cumulative weight per item level
  const levelTables = Object.values(weights.categories).flatMap((c) => Object.values(c.pools || {})
    .flatMap((slot) => Object.entries(slot.levels || {})));
  check('pools record their weight per item level', levelTables.length > 0,
    levelTables.length + ' level tables');
  check('level tables rise with the item level and end at the pool total',
    levelTables.every(([, points]) =>
      points.length > 0 && points.every((p, i) => i === 0 || (p[0] > points[i - 1][0] && p[1] >= points[i - 1][1]))),
    levelTables.length + ' tables checked');

  // an iLvl 68 base cannot roll the notables that need 75, so the pool is smaller
  const gatedPool = Object.values(weights.categories)
    .flatMap((c) => Object.values(c.pools || {}).map((slot) => ({ slot, cat: c })))
    .find(({ slot }) => Object.values(slot.levels || {}).some((points) => points[points.length - 1][0] > 70));
  const gatedPoints = gatedPool && Object.values(gatedPool.slot.levels)[0];
  check('a lower item level shrinks the pool', !!gatedPoints && gatedPoints.length > 1
      && gatedPoints[0][1] < gatedPoints[gatedPoints.length - 1][1],
    gatedPoints ? `${gatedPoints[0][1]} at iLvl ${gatedPoints[0][0]} → ${gatedPoints[gatedPoints.length - 1][1]} at iLvl ${gatedPoints[gatedPoints.length - 1][0]}` : 'missing');

  // the pool must count the generic small-passive mods, not just the notables: without them
  // a specific notable looks ~2.4x more likely than craftofexile.com says it is
  const pooledSlots = Object.values(weights.categories)
    .flatMap((c) => Object.values(c.pools || {}).map((slot) => ({ slot, cat: c })));
  const withGenerics = pooledSlots.filter(({ slot }) => Object.values(slot.total.generic || {}).some((w) => w > 0));
  check('pools include the generic small-passive mods that share the affix slot',
    withGenerics.length > 0, `${withGenerics.length} of ${pooledSlots.length} pools carry generic weight`);
  check('the pool total is the tag weight plus the generic weight',
    pooledSlots.every(({ slot }) => Object.entries(slot.total)
      .filter(([size, value]) => size !== 'tag' && size !== 'generic' && typeof value === 'number')
      .every(([size, value]) => value === (slot.total.tag[size] || 0) + (slot.total.generic[size] || 0))),
    pooledSlots.length + ' pools checked');
  check('a notable is well under 2% of its own pool at endgame item level',
    (() => {
      const sample = weights.categories['affliction_fire_damage_over_time_multiplier'];
      const points = sample.pools.Prefix.levels.Medium;
      const total = points[points.length - 1][1];
      return 137 / total < 0.02 && total > 12000;
    })(),
    (() => {
      const sample = weights.categories['affliction_fire_damage_over_time_multiplier'];
      const points = sample.pools.Prefix.levels.Medium;
      return `137 of ${points[points.length - 1][1]} prefix weight = ${(137 / points[points.length - 1][1] * 100).toFixed(2)}%`;
    })());

  const firstTries = parseInt(qa('#craftCard .craft-tries')[0].textContent.replace(/[^\d]/g, ''), 10);
  const firstChaos = parseFloat(qa('#craftCard .craft-cost b')[0].textContent.replace(/[^\d.]/g, ''));
  check('cost follows the price table, not a guess',
    firstChaos > 0 && firstTries > 0 && firstChaos <= firstTries * 100,
    `${firstTries} tries → ${firstChaos}c`);

  const otherCombo = qa('#comboList .combo')[1];
  const beforeTarget = txt('#craftCard .craft-target');
  click(otherCombo);
  check('selecting another combination re-prices the card',
    txt('#craftCard .craft-target') !== beforeTarget,
    beforeTarget + ' → ' + txt('#craftCard .craft-target'));
  check('the selected combination is highlighted',
    qa('#comboList .combo.on').length === 1 && q('#comboList .combo.on').dataset.index === '1',
    qa('#comboList .combo.on').length + ' highlighted');
  click(qa('#comboList .combo')[0]);

  /* ── weights must be complete: every demo jewel rolls a real pool ── */
  const norm = (t) => String(t).toLowerCase().replace(/[\d.]+%?/g, ' ').replace(/\s+/g, ' ').trim();
  const poolFor = (j) => {
    const grant = String(j.grantType || '').trim().toLowerCase();
    const size = String(j.size || '').toLowerCase();
    if (!grant) return null;
    return weights.grants[`${size}|${grant}`] || weights.grants[`any|${grant}`]
      || weights.grants[`${size}~${norm(grant)}`] || weights.grants[`any~${norm(grant)}`] || null;
  };
  const weightOf = (name, tag) => {
    const entry = weights.notables[String(name).toLowerCase()];
    return entry && tag ? entry.weights[tag] : undefined;
  };

  const allJewels = snapshot.characters.flatMap((c) => c.clusterJewels || []);
  // uniques are fixed items: they roll from no pool, so they are not expected to resolve
  const pooledJewels = allJewels.filter((j) => j.rarity !== 'unique');
  const poolMisses = pooledJewels.filter((j) => !poolFor(j));
  check('every jewel base resolves to a cluster pool', poolMisses.length === 0,
    poolMisses.length
      ? poolMisses.slice(0, 3).map((j) => j.size + ' / ' + j.grantType).join(', ')
      : `${pooledJewels.length} jewels mapped, ${allJewels.length - pooledJewels.length} unique`);
  const orphans = pooledJewels.flatMap((j) => {
    const tag = poolFor(j);
    return (j.notables || []).filter((n) => !weightOf(n, tag)).map((n) => `${n} (${j.grantType})`);
  });
  check("every notable is weighted inside its jewel's pool", orphans.length === 0,
    orphans.length ? orphans.slice(0, 3).join(', ') : 'all weighted');
  // a handful of legacy bases still exist in the jewel data but have no notables this league,
  // so only pools that actually have weight are expected to look like the game's ~6000
  const totals = Object.values(weights.categories).flatMap((c) => Object.values(c.totals)).filter((t) => t > 0);
  check('pool weights look like the game\'s ~6000 pools',
    totals.length > 0 && totals.every((t) => t >= 1000 && t <= 8000),
    totals.length + ' pools, ' + Math.min(...totals) + '–' + Math.max(...totals) + ' weight');

  /* ── search ── */
  type(q('#skillSearch'), 'cold');
  check('search filters the rail', qa('#skillList .skill').length > 0 && qa('#skillList .skill').length < skills.length,
    qa('#skillList .skill').length + ' rows for "cold"');
  type(q('#skillSearch'), 'zzzz');
  check('empty search state', txt('#comboList').includes('Nothing matches'));
  type(q('#skillSearch'), '');

  /* ── meta ── */
  click(qa('.nav-tile').find((t) => t.dataset.tab === 'meta'));
  check('meta tab switches', !q('#view-meta').hidden && q('#view-lab').hidden);
  check('meta stat tiles', qa('#metaTiles .tile').length === 6, qa('#metaTiles .v').map((e) => e.textContent).join(' / '));
  check('meta combination list', qa('#metaComboList .meta-combo').length === 12, txt('#metaComboList .mc-title'));

  /* ── the unique cluster jewels: Voices, Megalomaniac ── */
  const uniquesShown = /Voices|Megalomaniac/.test(txt('#metaComboList'));
  check('the list carries the unique cluster jewels', uniquesShown,
    (txt('#metaComboList').match(/(Voices|Megalomaniac)[^A-Za-z]*\(\d+%\)/) || ['missing'])[0]);
  click(q('#uniquePill'));
  check('hiding uniques takes them out of the lists',
    !/Voices|Megalomaniac/.test(txt('#metaComboList')) && !q('#uniquePill').classList.contains('on'),
    txt('#metaComboList .mc-title'));
  click(q('#uniquePill'));
  check('showing uniques puts them back',
    /Voices|Megalomaniac/.test(txt('#metaComboList')) && q('#uniquePill').classList.contains('on'));
  // the demo snapshot is synthetic, so the banner is the demo notice - never the
  // "ladder unreadable" variant that a live snapshot with no rows would show
  check('demo notice is the synthetic one',
    !q('#notice').hidden && /Synthetic demo data/.test(txt('#noticeText')));

  check('notables card rows', qa('#notablesCard .notable-row').length === 14);
  // the card is height-capped and scrolls instead of pushing the page down
  check('notables card scrolls', qa('#notablesCard .notable-scroll').length === 1);
  check('notables card capped', /\.notable-scroll\s*\{[^}]*max-height:\s*252px[^}]*overflow-y:\s*auto/.test(read('styles.css')));
  check('the meta tab drops the DPS cards', !q('#skillLeadersCard') && !q('#topBuildsCard'),
    'DPS leaders and highest DPS builds removed');
  check('the meta tab carries the crafting card',
    q('#metaCraftCard') && qa('#metaCraftCard .craft-route').length > 0,
    txt('#metaCraftCard .craft-target'));
  check('the meta crafting card prices the most popular combination',
    txt('#metaCraftCard .craft-target') === q('#metaComboList .mc-title').textContent,
    txt('#metaCraftCard .craft-target') + ' vs ' + q('#metaComboList .mc-title').textContent);
  check('the meta crafting card names the item level it prices',
    /needs iLvl \d+/.test(txt('#metaCraftCard .craft-ilvl')), txt('#metaCraftCard .craft-ilvl'));
  const secondCombo = qa('#metaComboList .meta-combo')[2];
  click(secondCombo);
  check('tapping a meta combination re-prices the crafting card',
    txt('#metaCraftCard .craft-target') === secondCombo.querySelector('.mc-title').textContent,
    txt('#metaCraftCard .craft-target'));
  check('the priced combination is highlighted in the list',
    qa('#metaComboList .meta-combo.on').length === 1,
    qa('#metaComboList .meta-combo.on .mc-title').map((n) => n.textContent).join(', ') || 'none');
  click(qa('#metaSizeFilter button').find((b) => b.dataset.size === 'Large'));
  check('meta Large filter', qa('#metaComboList .size-tag').every((e) => e.textContent === 'LARGE'),
    qa('#metaComboList .meta-combo').length + ' large combinations');

  /* ── ladder ── */
  click(qa('.nav-tile').find((t) => t.dataset.tab === 'ladder'));
  check('ladder skill cells carry gem art',
    qa('#ladderBody .trow .skl .gem-slot img').length === qa('#ladderBody .trow').length,
    qa('#ladderBody .trow .skl .gem-slot img').length + ' gems');
  check('ladder class cells carry portraits',
    qa('#ladderBody .trow .cls img.asc').length === qa('#ladderBody .trow').length,
    qa('#ladderBody .trow .cls img.asc').length + ' portraits');
  check('ladder rows', qa('#ladderBody .trow').length === snapshot.characters.length,
    qa('#ladderBody .trow').length + ' rows');
  type(q('#ladderSearch'), 'occultist');
  await wait(220); // the search is debounced: typing should not re-render per keystroke
  check('ladder filter', qa('#ladderBody .trow').length > 0 && qa('#ladderBody .trow').length < snapshot.characters.length,
    qa('#ladderBody .trow').length + ' rows');
  type(q('#ladderSearch'), '');
  await wait(220);
  click(qa('.th').find((t) => t.dataset.key === 'name'));
  check('ladder sorting', qa('#ladderBody .trow .nm b')[0].textContent.length > 0,
    qa('#ladderBody .trow .nm b')[0].textContent);

  /* ── settings + live floor ── */
  click(qa('.nav-tile').find((t) => t.dataset.tab === 'settings'));
  check('settings defaults', txt('#floorVal') === '1.0%', txt('#floorHint'));
  type(q('#floorRange'), '6');
  check('popularity floor re-runs the analysis', txt('#floorHint').includes('of 18') && !txt('#floorHint').includes('18 of 18'),
    txt('#floorHint'));
  check('tiles follow the floor', qa('#metaTiles .v')[1].textContent !== String(snapshot.skills.length),
    'skills tracked → ' + qa('#metaTiles .v')[1].textContent);
  type(q('#floorRange'), '1');

  /* ── busy overlay ── */
  click(qa('.nav-tile').find((t) => t.dataset.tab === 'lab'));
  click(q('#analyzeBtn'));
  check('analyze shows the busy overlay', !q('#busy').hidden, txt('#busyTitle'));

  console.log(results.join('\n'));
  console.log('\npage errors: ' + (errors.length ? '\n  ' + errors.join('\n  ') : 'none'));

  const failures = results.filter((line) => line.startsWith('FAIL'));
  console.log(`\n${results.length - failures.length}/${results.length} checks passed`);

  process.exit(failures.length > 0 ? 1 : 0);
}, 250);
