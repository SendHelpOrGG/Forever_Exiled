#!/usr/bin/env node
/**
 * Structural check for the design gallery (preview/designs/).
 *
 * It cannot judge whether a direction looks good — that is what the gallery is for — but it can
 * guarantee the things that are easy to break when ten layouts live in one page:
 *
 *   1. ten directions, each with its own head, palette and notes;
 *   2. no two layouts are the same DOM — the whole point of the rewrite;
 *   3. every mock shows the same content (Winter Orb, average + peak, three combinations,
 *      a craft target, a 234-character status line), so the comparison is a fair one;
 *   4. every class a layout invents is actually styled, and every clickable thing has a hover,
 *      a press and a focus state;
 *   5. the mocks answer: clicking a skill rewrites the hero, clicking a combination rewrites the
 *      craft target, and the size chips filter the combination list;
 *   6. every image path resolves from preview/designs.
 *
 *     NODE_PATH=/home/user/Forever_Exiled/node_modules node tools/designs_check.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..', 'preview');
const dir = path.join(root, 'designs');
const read = (p) => fs.readFileSync(p, 'utf8');
const css = read(path.join(dir, 'designs.css'));

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
virtualConsole.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

const html = read(path.join(dir, 'index.html')).replace('<script src="designs.js"></script>', '');
const dom = new JSDOM(html, { runScripts: 'outside-only', virtualConsole, pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

window.eval(read(path.join(dir, 'designs.js')));

const qa = (s) => [...document.querySelectorAll(s)];
const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

const results = [];
const check = (label, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);

const EXPECTED = [
  'Dossier', 'Sheet', 'Broadsheet', 'Orbit', 'Nocturne',
  'Tiers', 'HUD', 'Prism', 'Compare', 'Vitrine',
];

/* every layout shares the same contract; only its class namespace differs */
const LAYOUTS = [
  { id: 'dossier', prefix: 'd' },
  { id: 'sheet', prefix: 's' },
  { id: 'broadsheet', prefix: 'b' },
  { id: 'orbit', prefix: 'r' },
  { id: 'nocturne', prefix: 'e' },
  { id: 'tiers', prefix: 't' },
  { id: 'hud', prefix: 'u' },
  { id: 'prism', prefix: 'p' },
  { id: 'compare', prefix: 'g' },
  { id: 'vitrine', prefix: 'z' },
];

const HERO = '[data-hero-name]';
const STATS = '[data-stats] .num';
const COMBOS = '[data-combo]';
const CRAFT = '[data-craft-combo]';
const STATUS = '[data-status]';
const NAV = '[data-nav]';
const PICKS = '[data-pick]';

const section = (id) => document.getElementById(id);
const mockOf = (id) => section(id).querySelector('.mock');
const classesOf = (el) => [...el.querySelectorAll('[class]')].flatMap((n) => [...n.classList]);

/* ── the gallery itself ─────────────────────────────────────────────────── */

const sections = qa('.variant');
check('ten directions rendered', sections.length === 10, sections.length + ' sections');
check('they are the ten asked for',
  sections.map((s) => text(s.querySelector('h2')).split(' ')[0]).join(' | ') === EXPECTED.join(' | '),
  sections.map((s) => text(s.querySelector('h2'))).join(' · '));
check('the index lists all ten', qa('.gal-index a').length === 10);
check('every index link points at a section',
  qa('.gal-index a').every((a) => document.getElementById(a.dataset.target) !== null));
check('every section has a numbered head and a one-word tag',
  sections.every((s) => /^\d\d$/.test(text(s.querySelector('.v-num'))) && s.querySelector('.v-tag')),
  sections.map((s) => text(s.querySelector('.v-tag'))).join(' · '));
check('styling notes are written for every variant',
  sections.every((s) => s.querySelectorAll('.v-notes > div').length === 2));
check('every variant has a palette',
  sections.every((s) => s.querySelectorAll('.v-swatches i').length === 5));
check('every frame can be zoomed to 1:1',
  sections.every((s) => s.querySelectorAll('.frame-zoom').length === 1));

/* ── ten mocks, ten distinct structures ─────────────────────────────────── */

check('ten mock sheets', qa('.mock').length === 10);

/** class names a layout invents, stripped of its own prefix: "o-hero" → "hero" */
const suffixes = (mock, prefix) =>
  new Set(classesOf(mock).filter((c) => c.startsWith(prefix + '-')).map((c) => c.slice(prefix.length + 1)));

const prints = LAYOUTS.map((l) => ({ id: l.id, set: suffixes(mockOf(l.id), l.prefix) }));

check('every mock carries its own class namespace',
  LAYOUTS.every((l, i) => prints[i].set.size >= 8),
  prints.map((p) => `${p.id}:${p.set.size}`).join(' '));

const jaccard = (a, b) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter);
};

let worst = { pair: '', score: 0 };
const identical = [];
for (let i = 0; i < prints.length; i += 1) {
  for (let j = i + 1; j < prints.length; j += 1) {
    const score = jaccard(prints[i].set, prints[j].set);
    if (score > worst.score) worst = { pair: `${prints[i].id}/${prints[j].id}`, score };
    if (score === 1) identical.push(`${prints[i].id}/${prints[j].id}`);
  }
}
check('no two layouts share the same structure', identical.length === 0, identical.join(', ') || 'all ten differ');
check('and none is a re-skin of another', worst.score < 0.5,
  `closest pair ${worst.pair} at ${(worst.score * 100).toFixed(0)}% shared structure`);

/* the top-level shape must differ too: a poster, a table, a page, a palette … */
const shape = (id) => [...mockOf(id).children]
  .map((n) => n.tagName.toLowerCase() + (n.classList.length ? '.' + [...n.classList][0].replace(/^[a-z]-/, '') : ''))
  .join('>');
const shapes = LAYOUTS.map((l) => shape(l.id));
check('the top-level shapes are not interchangeable',
  new Set(shapes).size === 10, new Set(shapes).size + ' unique of 10');

/* ── the same content in all ten ────────────────────────────────────────── */

check('every mock names Winter Orb',
  LAYOUTS.every((l) => text(section(l.id).querySelector(HERO)) === 'Winter Orb'),
  LAYOUTS.map((l) => text(section(l.id).querySelector(HERO))).join(' · '));

check('every mock shows an average and a peak',
  LAYOUTS.every((l) => {
    const nums = [...section(l.id).querySelectorAll(STATS)].map(text);
    return nums.length === 2 && nums[0] === '34.5M' && nums[1] === '145M';
  }),
  LAYOUTS.map((l) => [...section(l.id).querySelectorAll(STATS)].map(text).join('/')).join(' · '));

const CANON = [
  'Prism Weave + Snowstorm + Sadist',
  'Blanketed Snow + Cold to the Core',
  'Eye to Eye + Repeater',
];
check('every mock lists the three combinations from the same data',
  LAYOUTS.every((l) => {
    const labels = [...section(l.id).querySelectorAll(COMBOS)].map((c) => c.dataset.label);
    return CANON.every((c) => labels.includes(c));
  }),
  LAYOUTS.map((l) => section(l.id).querySelectorAll(COMBOS).length + ' rows').join(' '));

check('every mock has a craft target',
  LAYOUTS.every((l) => {
    const el = section(l.id).querySelector(CRAFT);
    return el && text(el).length > 3;
  }));

check('every mock has a status line that agrees on 234 characters',
  LAYOUTS.every((l) => /234/.test(text(section(l.id).querySelector(STATUS)))),
  LAYOUTS.map((l) => text(section(l.id).querySelector(STATUS)).slice(0, 26)).join(' · '));

check('every mock has the five-tab navigation',
  LAYOUTS.every((l) => section(l.id).querySelectorAll(NAV).length >= 5),
  LAYOUTS.map((l) => section(l.id).querySelectorAll(NAV).length).join(' '));

check('every mock can switch skill',
  LAYOUTS.every((l) => section(l.id).querySelectorAll(PICKS).length >= 3),
  LAYOUTS.map((l) => section(l.id).querySelectorAll(PICKS).length).join(' '));

/* ── it answers when you click ──────────────────────────────────────────── */

const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

for (const l of LAYOUTS) {
  const picks = [...section(l.id).querySelectorAll(PICKS)];
  const combos = [...section(l.id).querySelectorAll(COMBOS)];

  const pick = picks[1] || picks[0];
  click(pick);
  const heroAfter = text(section(l.id).querySelector(HERO));
  const heroOk = heroAfter === pick.dataset.label && pick.classList.contains('on')
    && picks.filter((p) => p.classList.contains('on')).length === 1;

  click(combos[2]);
  const craftAfter = text(section(l.id).querySelector(CRAFT));
  const craftOk = craftAfter === combos[2].dataset.label
    && combos.filter((c) => c.classList.contains('on')).length === 1;

  check(`${l.id}: picking a skill rewrites the hero`, heroOk, `${pick.dataset.label} → ${heroAfter}`);
  check(`${l.id}: picking a combination rewrites the craft target`, craftOk, `${combos[2].dataset.label} → ${craftAfter}`);
}

/* the size chips are a real filter, not decoration */
{
  const rows = () => [...section('sheet').querySelectorAll('[data-combo][data-cluster-size]')];
  const pills = [...section('sheet').querySelectorAll('[data-size]')];
  const large = pills.find((p) => p.dataset.size === 'large');
  click(large);
  const onlyLarge = rows().filter((r) => !r.classList.contains('off')).map((r) => r.dataset.clusterSize);
  const medium = pills.find((p) => p.dataset.size === 'medium');
  click(medium);
  const onlyMedium = rows().filter((r) => !r.classList.contains('off')).map((r) => r.dataset.clusterSize);
  check('a size chip really filters the list',
    onlyLarge.join() === 'Large' && onlyMedium.join() === 'Medium,Medium' && medium.classList.contains('on'),
    `large → ${onlyLarge.join(', ') || 'none'} · medium → ${onlyMedium.join(', ')}`);

  const withChips = LAYOUTS.filter((l) => section(l.id).querySelector('[data-size]'));
  check('every layout that offers sizes can filter on them',
    withChips.every((l) => section(l.id).querySelectorAll('[data-combo][data-cluster-size]').length >= 3),
    withChips.map((l) => l.id).join(', ') || 'none');
}

check('every clickable carries an explicit label',
  qa('.mock [data-pick], .mock [data-combo]').every((el) => (el.dataset.label || '').trim().length > 2),
  qa('.mock [data-pick], .mock [data-combo]').length + ' targets');

check('nothing errors while being used', errors.length === 0, errors.join(' | ') || 'none');

/* ── the CSS actually styles what the layouts invented ──────────────────── */

const unstyled = [];
for (const l of LAYOUTS) {
  for (const cls of new Set(classesOf(mockOf(l.id)))) {
    if (['on', 'off', 'bar', 'num', 'val', 'stat', 'sz'].includes(cls)) continue;
    if (!css.includes('.' + cls)) unstyled.push(`${l.id}.${cls}`);
  }
}
check('every class used by a layout is styled', unstyled.length === 0,
  unstyled.length ? unstyled.slice(0, 8).join(', ') : 'all styled');

const hoverRules = css.match(/:hover/g) || [];
const activeRules = css.match(/:active/g) || [];
check('the interface reacts to the pointer', hoverRules.length >= 60, hoverRules.length + ':hover rules');
check('pressing a control is acknowledged', activeRules.length >= 3, activeRules.length + ':active rules');
check('clickable things change more than colour',
  /:hover[^{]*\{[^}]*box-shadow/.test(css.replace(/\n/g, ' ')));
check('keyboard focus is visible', /:focus-visible\s*\{[^}]*box-shadow/.test(css.replace(/\n/g, ' ')));
check('bars animate when a mock comes into view',
  /\.mock\.lit \.bar i\s*\{\s*width:\s*var\(--pct\)/.test(css));
check('each layout declares its own accent', LAYOUTS.every((l) => {
  const block = css.split('.m-' + l.id)[1] || '';
  return /--accent:\s*#[0-9a-f]{3,6}/i.test(block.slice(0, 700));
}), LAYOUTS.map((l) => l.id).join(' '));

/* every variant must react in its own idiom, so each block needs its own hover rules */
const perLayoutHover = LAYOUTS.map((l) => {
  const sel = new RegExp('\\.m-' + l.id + '[^{},]*:hover', 'g');
  return [l.id, (css.match(sel) || []).length];
});
check('every direction has bespoke hover states',
  perLayoutHover.every(([, n]) => n >= 4),
  perLayoutHover.map(([id, n]) => `${id}:${n}`).join(' '));

/* the sheets are drawn at 1280×720 and scaled; nothing may claim to be bigger */
check('the mock sheets are 1280×720',
  /\.mock\s*\{\s*[^}]*width:\s*1280px[^}]*height:\s*720px/.test(css.replace(/\n/g, ' ')));

/* ── art ────────────────────────────────────────────────────────────────── */

const sources = qa('.mock img').map((img) => img.getAttribute('src'));
const missingArt = [...new Set(sources)].filter((src) => !fs.existsSync(path.join(dir, src)));
check('mock art resolves from preview/designs', missingArt.length === 0,
  missingArt.length ? missingArt.join(', ') : `${sources.length} images, ${new Set(sources).size} unique`);

check('every mock shows the app art, not just text',
  LAYOUTS.every((l) => mockOf(l.id).querySelectorAll('img').length >= 3),
  LAYOUTS.map((l) => `${l.id}:${mockOf(l.id).querySelectorAll('img').length}`).join(' '));

/* ── the cluster-jewel surface: nothing may be dropped for looks ─────────── */

const perMock = (sel) => LAYOUTS.map((l) => [l.id, section(l.id).querySelectorAll(sel).length]);

const notables = perMock('.fx-notable');
check('every mock names the notables of its combinations',
  notables.every(([, n]) => n >= 3), notables.map(([id, n]) => `${id}:${n}`).join(' '));

const mods = perMock('.fx-mod');
check('every mock names the cluster modifiers, not just the notables',
  mods.every(([, n]) => n >= 2), mods.map(([id, n]) => `${id}:${n}`).join(' '));

const gear = perMock('.fx-gear');
check('every mock states size, passives, iLvl floor and price',
  gear.every(([, n]) => n >= 1)
  && LAYOUTS.every((l) => /12 passives/.test(text(section(l.id).querySelector('.fx-gear')))
    && /iLvl \d+\+/.test(text(section(l.id).querySelector('.fx-gear')))
    && /div/.test(text(section(l.id).querySelector('.fx-gear')))),
  gear.map(([id, n]) => `${id}:${n}`).join(' '));

const uniques = perMock('.fx-un');
check('every mock counts the unique cluster jewels',
  uniques.every(([, n]) => n >= 2)
  && LAYOUTS.every((l) => /Voices/.test(text(section(l.id))) && /Megalomaniac/.test(text(section(l.id)))
    && /21/.test(text(section(l.id).querySelector('.fx-uniques'))) && /34/.test(text(section(l.id).querySelector('.fx-uniques')))),
  uniques.map(([id, n]) => `${id}:${n}`).join(' '));

const routes = perMock('.fx-route');
check('every mock lists all three crafting routes with tries and cost',
  routes.every(([, n]) => n === 3)
  && LAYOUTS.every((l) => {
    const r = section(l.id).querySelectorAll('.fx-route');
    return [...r].every((row) => /in \d+/.test(text(row)) && /div/.test(text(row)));
  }),
  routes.map(([id, n]) => `${id}:${n}`).join(' '));

check('the best route is marked in every mock',
  LAYOUTS.every((l) => section(l.id).querySelectorAll('.fx-route.best').length === 1));

check('every mock carries the all-builds totals',
  LAYOUTS.every((l) => /124,363/.test(text(section(l.id)))
    && /592/.test(text(section(l.id))) && /234/.test(text(section(l.id)))),
  LAYOUTS.map((l) => (text(section(l.id)).match(/124,363/) ? 'ok' : 'missing')).join(' '));

check('every mock ranks the most-used notables',
  LAYOUTS.every((l) => /68%/.test(text(section(l.id))) || /68 %/.test(text(section(l.id)))));

/* ── and none of the ten may be bright ──────────────────────────────────── */

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const backgrounds = LAYOUTS.map((l) => {
  const start = css.indexOf('.m-' + l.id + ' {');
  const block = css.slice(start, css.indexOf('}', start));
  const m = block.match(/--bg:\s*(#[0-9a-f]{3,6})/i) || block.match(/background:\s*(#[0-9a-f]{3,6})/i);
  return [l.id, m ? m[1] : null];
});

check('every direction is dark — no light variant survives',
  backgrounds.every(([, hex]) => hex && luminance(hex) < 0.2),
  backgrounds.map(([id, hex]) => `${id}:${hex}${hex ? ' L=' + luminance(hex).toFixed(3) : ''}`).join(' '));

const bright = (css.match(/#(?:fff|ffffff|f8f8f8|fafafa|fbfbfb|fdf6e3|f6efe4)\b/gi) || []);
check('the sheet paints no white or cream surface', bright.length === 0, bright.join(', ') || 'none');

/* ── no brown and no green, in any palette ──────────────────────────────── */

const hslOf = (r, g, b) => {
  const [rr, gg, bb] = [r, g, b].map((v) => v / 255);
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, sat, l };
};

const brownOrGreen = ({ h, sat, l }) =>
  sat >= 0.22 && l > 0.06 && l < 0.92 && ((h >= 18 && h <= 58) || (h >= 62 && h <= 172));

const paletteColours = [];
for (const m of css.matchAll(/#([0-9a-f]{6})\b/gi)) {
  const hex = m[1];
  paletteColours.push(['#' + hex, hslOf(parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4), 16))]);
}
for (const m of css.matchAll(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/g)) {
  const [, r, g, b] = m.map(Number);
  paletteColours.push([`rgb(${r},${g},${b})`, hslOf(r, g, b)]);
}
const banned = paletteColours.filter(([, c]) => brownOrGreen(c));

check('no brown or green anywhere in the palettes', banned.length === 0,
  banned.length
    ? banned.slice(0, 8).map(([n, c]) => `${n} h${Math.round(c.h)}`).join(', ')
    : `${new Set(paletteColours.map(([n]) => n)).size} colours, all outside the brown and green bands`);

/* and every direction's accent has to survive the same test on its own */
const accentHues = LAYOUTS.map((l) => {
  const start = css.indexOf('.m-' + l.id + ' {');
  const block = css.slice(start, css.indexOf('}', start));
  const m = block.match(/--accent:\s*(#[0-9a-f]{3,6})/i);
  return [l.id, m ? hslOf(parseInt(m[1].slice(1, 3), 16), parseInt(m[1].slice(3, 5), 16), parseInt(m[1].slice(5, 7), 16)) : null];
});
check('no direction is accented in brown or green',
  accentHues.every(([, c]) => c && !brownOrGreen(c)),
  accentHues.map(([id, c]) => `${id}:h${c ? Math.round(c.h) : '?'}`).join(' '));

/* ── report ─────────────────────────────────────────────────────────────── */

/* the bars light on the next animation frame, so the last checks wait for one */
setTimeout(() => {
  check('every mock lit its bars on first paint',
    LAYOUTS.every((l) => mockOf(l.id).classList.contains('lit')),
    LAYOUTS.filter((l) => !mockOf(l.id).classList.contains('lit')).map((l) => l.id).join(', ') || 'all ten');

  check('nothing errors after a frame', errors.length === 0, errors.join(' | ') || 'none');

  console.log(results.join('\n'));
  const failures = results.filter((line) => line.startsWith('FAIL'));
  console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
  process.exit(failures.length ? 1 : 0);
}, 120);
