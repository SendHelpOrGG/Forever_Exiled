#!/usr/bin/env node
/**
 * Structural check for the design gallery (preview/designs/).
 *
 * There is now one layout — Atrium, the merged 04 + 05 direction — and five palettes of it. That
 * makes the page much easier to get wrong in a different way, so the check guarantees:
 *
 *   1. five variants, each with its own head and palette, all of them the same layout;
 *   2. the palettes really differ: five distinct accents and five distinct fields;
 *   3. every mock shows the whole cluster-jewel surface (notables, modifiers, socketing, uniques,
 *      the ranking, three routes with tries and cost, all-builds totals) — no palette is allowed
 *      to drop a feature;
 *   4. every class the layout invents is styled, the hover language is preserved, and the click
 *      contract still works in every copy;
 *   5. every palette is dark, and none of them is brown or green.
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
  'Atrium · Crimson', 'Atrium · Violet', 'Atrium · Azure', 'Atrium · Cyan', 'Atrium · Slate',
];

/* one layout, five palettes: the id is the theme, the class namespace is shared */
const THEMES = [
  { id: 'crimson', prefix: 'a' },
  { id: 'violet', prefix: 'a' },
  { id: 'azure', prefix: 'a' },
  { id: 'cyan', prefix: 'a' },
  { id: 'slate', prefix: 'a' },
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
check('five variants rendered', sections.length === 5, sections.length + ' sections');

const names = sections.map((s) => {
  const h = s.querySelector('h2');
  return text(h).replace(text(h.querySelector('.v-tag')), '').replace(/\s+/g, ' ').trim();
});
check('they are the five palettes asked for', names.join(' | ') === EXPECTED.join(' | '), names.join(' · '));
check('the index lists all five', qa('.gal-index a').length === 5);
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

/* ── five mocks, one structure, five palettes ───────────────────────────── */

check('five mock sheets', qa('.mock').length === 5, qa('.mock').length + ' mocks');

check('every mock is the same layout', qa('.mock').every((m) => m.classList.contains('m-atrium')));

check('every mock carries its own palette class',
  THEMES.every((t) => mockOf(t.id).classList.contains('t-' + t.id)),
  THEMES.map((t) => [...mockOf(t.id).classList].filter((c) => c.startsWith('t-')).join('')).join(' '));

const shape = (id) => [...mockOf(id).children]
  .map((n) => n.tagName.toLowerCase() + (n.classList.length ? '.' + [...n.classList][0].replace(/^a-/, '') : ''))
  .join('>');
const shapes = THEMES.map((t) => shape(t.id));
check('the five are the same DOM, not five diverging layouts', new Set(shapes).size === 1, shapes[0]);

check('no mock invents a second layout namespace',
  qa('.mock [class]').every((n) => [...n.classList].every((c) =>
    !/^[b-z]-/.test(c) || /^(t|m)-/.test(c) || ['fx-notables', 'fx-notable', 'fx-mods', 'fx-mod', 'fx-gear',
      'fx-uniques', 'fx-un', 'fx-routes', 'fx-route', 'fx-tag', 'fx-craft', 'fx-notarow', 'bar', 'stat', 'num', 'val', 'sz'].includes(c))),
  [...new Set(qa('.mock [class]').flatMap((n) => [...n.classList]).filter((c) => /^[b-z]-/.test(c) && !/^(t-|m-|fx-)/.test(c)))].slice(0, 6).join(', ') || 'none');

/* ── the same content in all five ───────────────────────────────────────── */

check('every mock names Winter Orb',
  THEMES.every((t) => text(section(t.id).querySelector(HERO)) === 'Winter Orb'),
  THEMES.map((t) => text(section(t.id).querySelector(HERO))).join(' · '));

check('every mock shows an average and a peak',
  THEMES.every((t) => {
    const nums = [...section(t.id).querySelectorAll(STATS)].map(text);
    return nums.length === 2 && nums[0] === '34.5M' && nums[1] === '145M';
  }),
  THEMES.map((t) => [...section(t.id).querySelectorAll(STATS)].map(text).join('/')).join(' · '));

const CANON = [
  'Prism Weave + Snowstorm + Sadist',
  'Blanketed Snow + Cold to the Core',
  'Eye to Eye + Repeater',
];
check('every mock lists the three combinations from the same data',
  THEMES.every((t) => {
    const labels = [...section(t.id).querySelectorAll(COMBOS)].map((c) => c.dataset.label);
    return CANON.every((c) => labels.includes(c));
  }),
  THEMES.map((t) => section(t.id).querySelectorAll(COMBOS).length + ' rows').join(' '));

check('every mock has a craft target',
  THEMES.every((t) => {
    const el = section(t.id).querySelector(CRAFT);
    return el && text(el).length > 3;
  }));

check('every mock has a status line that agrees on 234 characters',
  THEMES.every((t) => /234/.test(text(section(t.id).querySelector(STATUS)))));

check('every mock has the five-tab navigation',
  THEMES.every((t) => section(t.id).querySelectorAll(NAV).length >= 5),
  THEMES.map((t) => section(t.id).querySelectorAll(NAV).length).join(' '));

check('every mock can switch skill',
  THEMES.every((t) => section(t.id).querySelectorAll(PICKS).length >= 3),
  THEMES.map((t) => section(t.id).querySelectorAll(PICKS).length).join(' '));

/* ── it answers when you click ──────────────────────────────────────────── */

const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

for (const t of THEMES) {
  const picks = [...section(t.id).querySelectorAll(PICKS)];
  const combos = [...section(t.id).querySelectorAll(COMBOS)];

  const pick = picks[1] || picks[0];
  click(pick);
  const heroAfter = text(section(t.id).querySelector(HERO));
  const heroOk = heroAfter === pick.dataset.label && pick.classList.contains('on')
    && picks.filter((p) => p.classList.contains('on')).length === 1;

  click(combos[2]);
  const craftAfter = text(section(t.id).querySelector(CRAFT));
  const craftOk = craftAfter === combos[2].dataset.label
    && combos.filter((c) => c.classList.contains('on')).length === 1;

  check(`${t.id}: picking a skill rewrites the hero`, heroOk, `${pick.dataset.label} → ${heroAfter}`);
  check(`${t.id}: picking a combination rewrites the craft target`, craftOk, `${combos[2].dataset.label} → ${craftAfter}`);
}

check('every clickable carries an explicit label',
  qa('.mock [data-pick], .mock [data-combo]').every((el) => (el.dataset.label || '').trim().length > 2),
  qa('.mock [data-pick], .mock [data-combo]').length + ' targets');

check('nothing errors while being used', errors.length === 0, errors.join(' | ') || 'none');

/* ── the CSS actually styles what the layout invented ───────────────────── */

const unstyled = [];
for (const cls of new Set(classesOf(mockOf('crimson')))) {
  if (['on', 'off', 'bar', 'num', 'val', 'stat', 'sz', 'lit'].includes(cls)) continue;
  if (!css.includes('.' + cls)) unstyled.push(cls);
}
check('every class the layout uses is styled', unstyled.length === 0,
  unstyled.length ? unstyled.slice(0, 8).join(', ') : 'all styled');

const hoverRules = css.match(/:hover/g) || [];
const activeRules = css.match(/:active/g) || [];
check('the interface reacts to the pointer', hoverRules.length >= 20, hoverRules.length + ':hover rules');
check('pressing a control is acknowledged', activeRules.length >= 1, activeRules.length + ':active rules');
check('clickable things change more than colour',
  /:hover[^{]*\{[^}]*box-shadow/.test(css.replace(/\n/g, ' ')));
check('keyboard focus is visible', /:focus-visible\s*\{[^}]*box-shadow/.test(css.replace(/\n/g, ' ')));
check('bars animate when a mock comes into view',
  /\.mock\.lit \.bar i\s*\{\s*width:\s*var\(--pct\)/.test(css));

const blockOf = (sel) => {
  const start = css.indexOf(sel + ' {');
  return start === -1 ? '' : css.slice(start, css.indexOf('}', start));
};
const token = (sel, name) => {
  const m = blockOf(sel).match(new RegExp('--' + name + ':\\s*([^;]+)', 'i'));
  return m ? m[1].trim() : null;
};

check('the layout is written in palette tokens',
  ['accent', 'bg', 'line', 'note', 'mod', 'text', 'muted'].every((n) => token('.m-atrium', n) !== null),
  ['accent', 'bg', 'line', 'note', 'mod', 'text', 'muted'].filter((n) => !token('.m-atrium', n)).join(', ') || 'all present');

const accents = THEMES.map((t) => [t.id, token(`.m-atrium.t-${t.id}`, 'accent')]);
check('each palette declares its own accent',
  accents.every(([, hex]) => hex !== null), accents.map(([id, hex]) => `${id}:${hex}`).join(' '));
check('the five accents are five different colours',
  new Set(accents.map(([, hex]) => hex)).size === 5, accents.map(([, hex]) => hex).join(' '));

const fields = THEMES.map((t) => [t.id, token(`.m-atrium.t-${t.id}`, 'bg')]);
check('the five fields are five different colours',
  new Set(fields.map(([, hex]) => hex)).size === 5, fields.map(([id, hex]) => `${id}:${hex}`).join(' '));

check('each palette keeps the notables / modifiers split',
  THEMES.every((t) => token(`.m-atrium.t-${t.id}`, 'note') && token(`.m-atrium.t-${t.id}`, 'mod')
    && token(`.m-atrium.t-${t.id}`, 'note') !== token(`.m-atrium.t-${t.id}`, 'mod')));

/* ── one interaction language, kept ─────────────────────────────────────── */

const hoverInLayout = (css.match(/\.m-atrium[^{},]*:hover/g) || []).length;
check('the layout has bespoke hover states', hoverInLayout >= 6, hoverInLayout + ' states');

/* the sheets are drawn at 1280×720 and scaled; nothing may claim to be bigger */
check('the mock sheets are 1280×720',
  /\.mock\s*\{\s*[^}]*width:\s*1280px[^}]*height:\s*720px/.test(css.replace(/\n/g, ' ')));

/* ── art ────────────────────────────────────────────────────────────────── */

const sources = qa('.mock img').map((img) => img.getAttribute('src'));
const missingArt = [...new Set(sources)].filter((src) => !fs.existsSync(path.join(dir, src)));
check('mock art resolves from preview/designs', missingArt.length === 0,
  missingArt.length ? missingArt.join(', ') : `${sources.length} images, ${new Set(sources).size} unique`);

check('every mock shows the app art, not just text',
  THEMES.every((t) => mockOf(t.id).querySelectorAll('img').length >= 3),
  THEMES.map((t) => `${t.id}:${mockOf(t.id).querySelectorAll('img').length}`).join(' '));

/* ── the cluster-jewel surface: nothing may be dropped for looks ─────────── */

const perMock = (sel) => THEMES.map((t) => [t.id, section(t.id).querySelectorAll(sel).length]);

const notables = perMock('.fx-notable');
check('every mock names the notables of its combinations',
  notables.every(([, n]) => n >= 3), notables.map(([id, n]) => `${id}:${n}`).join(' '));

const mods = perMock('.fx-mod');
check('every mock names the cluster modifiers, not just the notables',
  mods.every(([, n]) => n >= 2), mods.map(([id, n]) => `${id}:${n}`).join(' '));

const gear = perMock('.fx-gear');
check('every mock states size, passives, iLvl floor and price',
  gear.every(([, n]) => n >= 1)
  && THEMES.every((t) => /12 passives/.test(text(section(t.id).querySelector('.fx-gear')))
    && /iLvl \d+\+/.test(text(section(t.id).querySelector('.fx-gear')))
    && /div/.test(text(section(t.id).querySelector('.fx-gear')))),
  gear.map(([id, n]) => `${id}:${n}`).join(' '));

const uniques = perMock('.fx-un');
check('every mock counts the unique cluster jewels',
  uniques.every(([, n]) => n >= 2)
  && THEMES.every((t) => /Voices/.test(text(section(t.id))) && /Megalomaniac/.test(text(section(t.id)))
    && /21/.test(text(section(t.id).querySelector('.fx-uniques'))) && /34/.test(text(section(t.id).querySelector('.fx-uniques')))),
  uniques.map(([id, n]) => `${id}:${n}`).join(' '));

const routes = perMock('.fx-route');
check('every mock lists all three crafting routes with tries and cost',
  routes.every(([, n]) => n === 3)
  && THEMES.every((t) => {
    const r = section(t.id).querySelectorAll('.fx-route');
    return [...r].every((row) => /in \d+/.test(text(row)) && /div/.test(text(row)));
  }),
  routes.map(([id, n]) => `${id}:${n}`).join(' '));

check('the best route is marked in every mock',
  THEMES.every((t) => section(t.id).querySelectorAll('.fx-route.best').length === 1));

check('every mock carries the all-builds totals',
  THEMES.every((t) => /124,363/.test(text(section(t.id)))
    && /592/.test(text(section(t.id))) && /234/.test(text(section(t.id)))));

check('every mock ranks the most-used notables',
  THEMES.every((t) => /68%/.test(text(section(t.id)))));

check('every mock keeps the share percentages',
  THEMES.every((t) => ['68%', '44%', '31%'].every((p) => text(section(t.id)).includes(p))));

/* ── and none of the five may be bright ─────────────────────────────────── */

const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

check('every palette is dark — no light variant survives',
  fields.every(([, hex]) => hex && luminance(hex) < 0.2),
  fields.map(([id, hex]) => `${id}:${hex} L=${luminance(hex).toFixed(3)}`).join(' '));

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

/* and every palette's accent has to survive the same test on its own */
const accentHues = accents.map(([id, hex]) => [id, hex
  ? hslOf(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16))
  : null]);
check('no palette is accented in brown or green',
  accentHues.every(([, c]) => c && !brownOrGreen(c)),
  accentHues.map(([id, c]) => `${id}:h${c ? Math.round(c.h) : '?'}`).join(' '));

/* ── report ─────────────────────────────────────────────────────────────── */

/* the bars light on the next animation frame, so the last checks wait for one */
setTimeout(() => {
  check('every mock lit its bars on first paint',
    THEMES.every((t) => mockOf(t.id).classList.contains('lit')),
    THEMES.filter((t) => !mockOf(t.id).classList.contains('lit')).map((t) => t.id).join(', ') || 'all five');

  check('nothing errors after a frame', errors.length === 0, errors.join(' | ') || 'none');

  console.log(results.join('\n'));
  const failures = results.filter((line) => line.startsWith('FAIL'));
  console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
  process.exit(failures.length ? 1 : 0);
}, 120);
