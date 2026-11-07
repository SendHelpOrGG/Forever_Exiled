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

const results = [];
const check = (label, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);

setTimeout(() => {
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
  check('item card explains what the notables do',
    !!tip && qa('.item-tip .item-mod-desc').length > 0,
    tip ? (qa('.item-tip .item-mod-desc')[0] || {}).textContent : 'missing');
  check('item card names the cluster base pool',
    /pool · \d+ notables( \+ \d+ small-passive mods)? · [\d,]+ (prefix|suffix)/.test(txt('.item-tip .item-pool')),
    txt('.item-tip .item-pool'));
  check('the pool counts the generic small-passive mods, not just the notables',
    /\+ \d+ small-passive mods/.test(txt('.item-tip .item-pool')),
    txt('.item-tip .item-pool'));
  const notableMods = qa('.item-tip .item-mod').filter((n) => /^1 Added Passive Skill is /.test(n.textContent.trim()));
  const weightBadges = qa('.item-tip .item-weight');
  check('every notable on the card carries its weight',
    notableMods.length > 0 && weightBadges.length === notableMods.length,
    `${weightBadges.length} weights for ${notableMods.length} notables`);
  check('notables list the mod tags the game gates them with',
    qa('.item-tip .item-tag').length > 0 && !/\s/.test(q('.item-tip .item-tag').textContent.trim().split(' ')[0] || ''),
    qa('.item-tip .item-tag').map((n) => n.textContent).join(', '));
  /* colours, not one grey chip: the tag hue comes from assets/tag_colors.json */
  const tagHues = (nodes) => nodes.map((n) => (n.getAttribute('style') || '').toLowerCase());
  const itemTagNodes = qa('.item-tip .item-tag');
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
  check('the weight badge also gives the odds of rolling it',
    weightBadges.every((n) => /\d+\s*\d+(\.\d+)?%/.test(n.textContent.replace(/\s+/g, ' ').trim())),
    weightBadges.map((n) => n.textContent.trim()).join(' | '));
  check('item card no longer repeats the analysis figures',
    !!tip && !/Share of sample|Average DPS/.test(tip.textContent));
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
  check('size card lists the three cluster sizes', qa('#mixCard .size-row').length === 3,
    qa('#mixCard .size-head').map((n) => n.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
  check('size card counts builds instead of bare percentages',
    qa('#mixCard .size-head .cap').every((n) => /\d+ of \d+/.test(n.textContent)),
    qa('#mixCard .size-head .cap').map((n) => n.textContent.trim()).join(' | '));
  check('size card names the top combination for each size',
    qa('#mixCard .size-top').filter((n) => n.textContent.trim().length > 2).length >= 2,
    qa('#mixCard .size-top').map((n) => n.textContent.trim()).join(' | '));
  check('size card explains that the shares overlap',
    /overlap/i.test(txt('#mixCard .size-note')), txt('#mixCard .size-note'));
  check('size card rows are not a fake 100% split',
    qa('#mixCard .size-pct').reduce((n, e) => n + parseFloat(e.textContent), 0) !== 100,
    qa('#mixCard .size-pct').map((n) => n.textContent.trim()).join(' + '));
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

  const largeRow = qa('#mixCard .size-row').find((r) => r.querySelector('b').textContent === 'Large');
  check('size card highlights the selected size',
    qa('#mixCard .size-row.on').length === 1 &&
    q('#mixCard .size-row.on').querySelector('b').textContent === 'Medium',
    q('#mixCard .size-row.on') ? q('#mixCard .size-row.on').querySelector('b').textContent : '<none>');
  click(largeRow);
  check('clicking a size row ranks that size', txt('#comboHeader').includes('LARGE'), txt('#comboHeader'));
  click(qa('#mixCard .size-row').find((r) => r.querySelector('b').textContent === 'Medium'));

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
  const poolMisses = allJewels.filter((j) => !poolFor(j));
  check('every jewel base resolves to a cluster pool', poolMisses.length === 0,
    poolMisses.length
      ? poolMisses.slice(0, 3).map((j) => j.size + ' / ' + j.grantType).join(', ')
      : `${allJewels.length} jewels mapped`);
  const orphans = allJewels.flatMap((j) => {
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
  check('notables card', qa('#notablesCard .notable-row').length === 9);
  check('skill DPS leaders', qa('#skillLeadersCard .mini-row').length === 6);
  check('highest DPS builds', qa('#topBuildsCard .build-row').length === 8);
  check('meta build rows carry gem art', qa('#topBuildsCard .build-row .gem-slot img').length === 8,
    qa('#topBuildsCard .build-row .gem-slot img').length + ' of 8');
  check('meta build rows carry class art', qa('#topBuildsCard .build-sub .asc-slot img').length === 8,
    qa('#topBuildsCard .build-sub .asc-slot img').length + ' of 8');
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
  check('ladder filter', qa('#ladderBody .trow').length > 0 && qa('#ladderBody .trow').length < snapshot.characters.length,
    qa('#ladderBody .trow').length + ' rows');
  type(q('#ladderSearch'), '');
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
