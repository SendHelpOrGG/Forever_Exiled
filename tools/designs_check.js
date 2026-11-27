#!/usr/bin/env node
/**
 * Structural check for the design gallery (preview/designs/).
 *
 * There is now one layout — Atrium, the merged 04 + 05 direction — and ten palettes of it. That
 * makes the page much easier to get wrong in a different way, so the check guarantees:
 *
 *   1. ten variants, each with its own head and palette, all of them the same layout;
 *   2. the palettes really differ: ten distinct accents and ten distinct fields;
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
  'Atrium · Crimson', 'Atrium · Violet', 'Atrium · Azure', 'Atrium · Cyan', 'Atrium · Noir',
  'Atrium · Neon', 'Atrium · Ember', 'Atrium · Rose Gold', 'Atrium · Honey', 'Atrium · Steel',
];

/* one layout, ten palettes: the id is the theme, the class namespace is shared */
const THEMES = [
  { id: 'crimson', prefix: 'a' },
  { id: 'violet', prefix: 'a' },
  { id: 'azure', prefix: 'a' },
  { id: 'cyan', prefix: 'a' },
  { id: 'noir', prefix: 'a' },
  { id: 'neon', prefix: 'a' },
  { id: 'ember', prefix: 'a' },
  { id: 'rose', prefix: 'a' },
  { id: 'honey', prefix: 'a' },
  { id: 'steel', prefix: 'a' },
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
/* read before any test clicks a tab: the plate every frame opens on */
const openingPlates = THEMES.map((t) => [t.id, mockOf(t.id).getAttribute('data-tab')]);

/* ── the gallery itself ─────────────────────────────────────────────────── */

const sections = qa('.variant');
check('ten variants rendered', sections.length === 10, sections.length + ' sections');

const names = sections.map((s) => {
  const h = s.querySelector('h2');
  return text(h).replace(text(h.querySelector('.v-tag')), '').replace(/\s+/g, ' ').trim();
});
check('they are the ten palettes asked for', names.join(' | ') === EXPECTED.join(' | '), names.join(' · '));
check('the index lists all ten', qa('.gal-index a').length === 10);
check('every index link points at a section',
  qa('.gal-index a').every((a) => document.getElementById(a.dataset.target) !== null));
check('every section has a numbered head and a one-word tag',
  sections.every((s) => /^\d\d$/.test(text(s.querySelector('.v-num'))) && s.querySelector('.v-tag')),
  sections.map((s) => text(s.querySelector('.v-tag'))).join(' · '));
check('styling notes are written for every variant',
  sections.every((s) => s.querySelectorAll('.v-notes > div').length === 2));
check('every variant shows the whole palette — six swatches or more',
  sections.every((s) => s.querySelectorAll('.v-swatches i').length >= 6),
  sections.map((s) => s.querySelectorAll('.v-swatches i').length).join(' '));
check('every frame can be zoomed to 1:1',
  sections.every((s) => s.querySelectorAll('.frame-zoom').length === 1));

/* ── ten mocks, one structure, ten palettes ─────────────────────────────── */

check('ten mock sheets', qa('.mock').length === 10, qa('.mock').length + ' mocks');

check('every mock is the same layout', qa('.mock').every((m) => m.classList.contains('m-atrium')));

check('every mock carries its own palette class',
  THEMES.every((t) => mockOf(t.id).classList.contains('t-' + t.id)),
  THEMES.map((t) => [...mockOf(t.id).classList].filter((c) => c.startsWith('t-')).join('')).join(' '));

const shape = (id) => [...mockOf(id).children]
  .map((n) => n.tagName.toLowerCase() + (n.classList.length ? '.' + [...n.classList][0].replace(/^a-/, '') : ''))
  .join('>');
const shapes = THEMES.map((t) => shape(t.id));
check('the ten are the same DOM, not ten diverging layouts', new Set(shapes).size === 1, shapes[0]);

check('no mock invents a second layout namespace',
  qa('.mock [class]').every((n) => [...n.classList].every((c) =>
    !/^[b-z]-/.test(c) || /^(t|m)-/.test(c) || ['fx-notables', 'fx-notable', 'fx-mods', 'fx-mod', 'fx-gear',
      'fx-uniques', 'fx-un', 'fx-routes', 'fx-route', 'fx-tag', 'fx-craft', 'fx-notarow', 'bar', 'stat', 'num', 'val', 'sz'].includes(c))),
  [...new Set(qa('.mock [class]').flatMap((n) => [...n.classList]).filter((c) => /^[b-z]-/.test(c) && !/^(t-|m-|fx-)/.test(c)))].slice(0, 6).join(', ') || 'none');

/* ── the same content in all ten ────────────────────────────────────────── */

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

check('every mock has a settings tab in the navigation',
  THEMES.every((t) => {
    const tab = section(t.id).querySelector('[data-nav][data-view="settings"]');
    return tab && /Settings/.test(text(tab)) && tab.querySelector('svg');
  }),
  text(section('crimson').querySelector('[data-view="settings"]')));

check('the settings tab answers the pointer and the keyboard',
  /\.m-atrium \.a-tab-set:hover svg \{[^}]*rotate/.test(css.replace(/\n/g, ' '))
  && /\.m-atrium \.a-tab-set:focus-visible \{[^}]*box-shadow/.test(css.replace(/\n/g, ' ')));

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

/* ── the four controls the app needs: size, character, classes, uniques ──── */

check('every mock offers a cluster-size switch',
  THEMES.every((t) => section(t.id).querySelectorAll('[data-size]').length === 4),
  THEMES.map((t) => section(t.id).querySelectorAll('[data-size]').length).join(' '));

{
  const mock = mockOf('crimson');
  const chips = [...mock.querySelectorAll('[data-size]')];
  const shown = () => [...mock.querySelectorAll('[data-combo]')].filter((r) => !r.classList.contains('off'));

  click(chips.find((c) => c.dataset.size === 'small'));
  const small = shown().map((r) => r.dataset.clusterSize);
  const smallOn = chips.find((c) => c.dataset.size === 'small').classList.contains('on');

  click(chips.find((c) => c.dataset.size === 'medium'));
  const medium = shown().map((r) => r.dataset.clusterSize);

  click(chips[0]);
  const all = shown().length;

  check('the size switch really filters the combinations',
    small.join() === 'Small' && smallOn && medium.join() === 'Medium,Medium' && all === 4,
    `small → ${small.join(', ') || 'none'} · medium → ${medium.join(', ') || 'none'} · all → ${all}`);
}

check('every mock shows the class icons, not just the names',
  THEMES.every((t) => {
    const icons = [...section(t.id).querySelectorAll('.a-cls img')];
    return icons.length === 3 && icons.every((i) => fs.existsSync(path.join(dir, i.getAttribute('src'))));
  }),
  THEMES.map((t) => section(t.id).querySelectorAll('.a-cls img').length).join(' '));

check('every mock names the character running the combination',
  THEMES.every((t) => {
    const hero = text(section(t.id).querySelector('.a-char'));
    const line = text(section(t.id).querySelector('.a-charln'));
    const cards = [...section(t.id).querySelectorAll('.a-cardchar')].map(text);
    return /Hazblast/.test(hero) && /Hazblast/.test(line)
      && cards.length === 4 && cards.every((c) => c.length > 2) && cards[0] === 'Hazblast';
  }),
  text(section('crimson').querySelector('.a-char')) + ' · ' + text(section('crimson').querySelector('.a-charln')));

check('the uniques can be switched off and back on',
  (() => {
    const mock = mockOf('crimson');
    const sw = mock.querySelector('[data-toggle="uniques"]');
    const box = mock.querySelector('[data-uniques]');
    if (!sw || !box) return false;
    click(sw);
    const off = box.classList.contains('hidden') && !sw.classList.contains('on')
      && sw.getAttribute('aria-pressed') === 'false';
    click(sw);
    const on = !box.classList.contains('hidden') && sw.classList.contains('on')
      && sw.getAttribute('aria-pressed') === 'true';
    return off && on;
  })(),
  'hides and restores the two unique chips');

check('a hidden block is really hidden',
  /\.a-uniques\.hidden\s*\{[^}]*display:\s*none/.test(css.replace(/\n/g, ' ')));

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
check('the interface reacts to the pointer', hoverRules.length >= 12, hoverRules.length + ':hover rules');
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

/* ── a dotted rule splits the ranking from the unique jewels ─────────────── */

{
  const mock = mockOf('crimson');
  const rule = mock.querySelector('.a-dotrule');
  const above = rule && rule.previousElementSibling;
  const below = rule && rule.nextElementSibling;
  const block = blockOf('.m-atrium .a-dotrule');
  check('a dotted rule separates the ranking from the unique jewels',
    Boolean(rule)
    && Boolean(above) && above.classList.contains('a-notlist')
    && Boolean(below) && below.classList.contains('a-caprow')
    && /border-top:\s*1px\s+dotted\s+var\(--faint\)/.test(block)
    && !/#[0-9a-f]{3,8}/i.test(block),
    block.trim() || 'no rule');
}

/* ── settings is a page of its own, reached from the nav ─────────────────── */

{
  const mock = mockOf('crimson');
  const tab = mock.querySelector('[data-nav][data-view="settings"]');
  const page = mock.querySelector('.a-settings');
  const mainTabs = [...mock.querySelectorAll('[data-nav][data-view="main"]')];

  check('the settings page has groups with real controls',
    Boolean(page)
    && page.querySelectorAll('.a-setcard').length === 3
    && page.querySelectorAll('[data-switch]').length >= 6
    && page.querySelectorAll('[data-seggroup]').length >= 3,
    page ? `${page.querySelectorAll('.a-setcard').length} cards, ${page.querySelectorAll('[data-switch]').length} switches, ${page.querySelectorAll('[data-seg]').length} segments` : 'none');

  // Leave from a tab that is not the first one, so a lazy restore would show up.
  click(mainTabs[mainTabs.length - 1]);
  click(tab);
  const opened = mock.classList.contains('view-settings')
    && tab.classList.contains('on')
    && mainTabs.filter((n) => n.classList.contains('on')).length === 0;

  const sw = page.querySelector('[data-switch]');
  const before = sw.classList.contains('on');
  click(sw);
  const toggled = sw.classList.contains('on') !== before
    && sw.getAttribute('aria-pressed') === String(!before);

  const group = page.querySelector('[data-seggroup]');
  const segs = [...group.querySelectorAll('[data-seg]')];
  click(segs[segs.length - 1]);
  const segOk = segs[segs.length - 1].classList.contains('on')
    && segs.filter((n) => n.classList.contains('on')).length === 1;

  check('the settings tab swaps the whole screen', opened);
  check('the settings switches and segments really change', toggled && segOk,
    `switch ${before ? 'on' : 'off'} → ${!before ? 'on' : 'off'}, ${segs.length} segments kept one selected`);

  click(page.querySelector('[data-return]'));
  const lit = mainTabs.filter((n) => n.classList.contains('on'));
  const returned = !mock.classList.contains('view-settings')
    && lit.length === 1
    && lit[0] === mainTabs[mainTabs.length - 1]
    && !tab.classList.contains('on');
  check('leaving settings restores the tab you came from', returned,
    lit.length ? lit.map((n) => n.textContent.trim()).join(' + ') : 'nothing selected');

  check('the settings page replaces the columns instead of floating over them',
    /\.m-atrium \.a-settings \{[^}]*position:\s*absolute[^}]*top:\s*64px[^}]*bottom:\s*30px/.test(css.replace(/\n/g, ' '))
    && /\.m-atrium\.view-settings \.a-settings \{[^}]*display:\s*flex/.test(css.replace(/\n/g, ' '))
    && /\.m-atrium\.view-settings \.a-body \{[^}]*display:\s*none/.test(css.replace(/\n/g, ' '))
    && /overflow:\s*auto/.test(blockOf('.m-atrium .a-settings')));
}


check('the generic row rule excludes the background layers',
  /\.m-atrium > \*:not\(\.a-backdrop\):not\(\.a-shade\):not\(\.a-veil\)/.test(css));

/* ── the backgrounds: six plates, one per destination ───────────────────── */

const PLATES = [
  ['clusters', 'bleed_grove.jpg'],
  ['watchers', 'tab_watchers_eye.jpg'],
  ['rare', 'tab_rare_items.jpg'],
  ['flasks', 'tab_flasks.jpg'],
  ['economy', 'tab_economy.jpg'],
  ['settings', 'tab_settings.jpg'],
];
const flat = css.replace(/\n/g, ' ');
const artOf = (id) => mockOf(id).querySelector('.a-photo');
const platesOf = (id) => [...mockOf(id).querySelectorAll('.a-photo img[data-plate]')];
const jpegSize = (file) => {
  let buf;
  try { buf = fs.readFileSync(file); } catch (e) { return [0, 0]; }
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return [0, 0];
};

check('every frame hangs six plates, one per destination',
  THEMES.every((t) => {
    const imgs = platesOf(t.id);
    return imgs.length === PLATES.length && PLATES.every(([tab, file]) => imgs.some((img) =>
      img.getAttribute('data-plate') === tab &&
      String(img.getAttribute('src')).endsWith('/assets/splash/' + file)));
  }),
  THEMES.map((t) => platesOf(t.id).length).join(' ') + ' plates each');

check('all six plates are real files at 16:9, so the frame never crops a subject',
  PLATES.every(([, file]) => {
    const [w, h] = jpegSize(path.join(root, 'assets', 'splash', file));
    return w >= 1200 && Math.abs(w / h - 16 / 9) < 0.02;
  }),
  PLATES.map(([, file]) => {
    const [w, h] = jpegSize(path.join(root, 'assets', 'splash', file));
    return file.replace(/\.jpg$/, '') + ' ' + w + '×' + h;
  }).join(' · '));

check('no two destinations share a plate',
  new Set(PLATES.map(([, file]) => file)).size === PLATES.length,
  PLATES.length + ' distinct files');

check('the frame opens on the grove, like the bar does',
  openingPlates.length === THEMES.length && openingPlates.every(([, tab]) => tab === 'clusters'),
  openingPlates.map(([, tab]) => tab).join(' '));

check('the bar names the five main plates and the gear names the sixth', (() => {
  const tabs = [...mockOf('crimson').querySelectorAll('[data-nav]')].map((n) => n.getAttribute('data-tab'));
  return JSON.stringify(tabs) === JSON.stringify(PLATES.map(([tab]) => tab));
})(), [...mockOf('crimson').querySelectorAll('[data-nav]')].map((n) => n.getAttribute('data-tab')).join(' '));

check('picking a destination lights its own plate', (() => {
  const mock = mockOf('violet');
  const links = [...mock.querySelectorAll('[data-nav]')];
  const bad = [];
  for (const [tab] of PLATES) {
    const link = links.find((n) => n.getAttribute('data-tab') === tab);
    if (!link) { bad.push(tab + '→missing'); continue; }
    click(link);
    if (mock.getAttribute('data-tab') !== tab) bad.push(tab + '→' + mock.getAttribute('data-tab'));
  }
  return bad.length === 0;
})(), PLATES.length + ' destinations');

check('cancel brings back the plate of the tab you came from', (() => {
  const mock = mockOf('cyan');
  const main = [...mock.querySelectorAll('[data-nav][data-view="main"]')];
  click(main[2]);
  click(mock.querySelector('[data-nav][data-view="settings"]'));
  const opened = mock.getAttribute('data-tab') === 'settings';
  click(mock.querySelector('[data-return]'));
  return opened && mock.getAttribute('data-tab') === main[2].getAttribute('data-tab');
})(), 'settings → cancel');
check('the art sits above the wash and below the layout',
  THEMES.every((t) => {
    const photo = artOf(t.id);
    const shade = mockOf(t.id).querySelector('.a-shade');
    const bar = mockOf(t.id).querySelector('.a-bar');
    if (!photo || !shade || !bar) return false;
    const follows = (a, b) => !!(a.compareDocumentPosition(b) & 4);
    return follows(shade, photo) && follows(photo, bar);
  }),
  'shade · art · bar');
check('the palette owns the colour and the grade is the subtle step',
  /\.m-atrium \.a-photo \{[^}]*opacity:\s*\.7/.test(css.replace(/\n/g, ' '))
  && /\.m-atrium \.a-photo i \{[^}]*background:\s*var\(--accent\)/.test(css.replace(/\n/g, ' '))
  && /\.m-atrium \.a-photo img \{[^}]*filter:\s*grayscale\(\.86\)/.test(css.replace(/\n/g, ' ')));
check('the art layer is masked away from the type column',
  /\.m-atrium \.a-photo \{[^}]*--plate-mask:\s*radial-gradient/.test(flat)
  && /\.m-atrium \.a-photo img \{[^}]*mask-image:\s*var\(--plate-mask\)/.test(flat)
  && /\.m-atrium \.a-photo i \{[^}]*mask-image:\s*var\(--plate-mask\)/.test(flat),
  'one mask, worn by the picture and the tint');

check('only the plate of the current tab is lit',
  /\.m-atrium \.a-photo img\[data-plate\] \{[^}]*opacity:\s*0/.test(flat)
  && PLATES.every(([tab]) => new RegExp('\\.m-atrium\\[data-tab="' + tab + '"\\] \\.a-photo img\\[data-plate="' + tab + '"\\]').test(flat))
  && /transition:\s*opacity\s+\.45s/.test(flat),
  PLATES.length + ' fades, nothing else showing');

check('the layout is written in palette tokens',
  ['accent', 'bg', 'line', 'note', 'mod', 'text', 'muted'].every((n) => token('.m-atrium', n) !== null),
  ['accent', 'bg', 'line', 'note', 'mod', 'text', 'muted'].filter((n) => !token('.m-atrium', n)).join(', ') || 'all present');

const accents = THEMES.map((t) => [t.id, token(`.m-atrium.t-${t.id}`, 'accent')]);
check('each palette declares its own accent',
  accents.every(([, hex]) => hex !== null), accents.map(([id, hex]) => `${id}:${hex}`).join(' '));
const baseTokens = [...new Set([...blockOf('.m-atrium').matchAll(/--([\w-]+):/g)].map((m) => m[1]))];
const missingTokens = THEMES.map((t) => [t.id, baseTokens.filter((n) => token(`.m-atrium.t-${t.id}`, n) === null)]);
check('every palette defines every token the layout reads',
  missingTokens.every(([, m]) => m.length === 0),
  missingTokens.filter(([, m]) => m.length).map(([id, m]) => `${id}:${m.join(',')}`).join(' ')
    || `${baseTokens.length} tokens in each of ${THEMES.length}`);

check('the ten accents are ten different colours',
  new Set(accents.map(([, hex]) => hex)).size === 10, accents.map(([, hex]) => hex).join(' '));

const fields = THEMES.map((t) => [t.id, token(`.m-atrium.t-${t.id}`, 'bg')]);
check('the ten fields are ten different colours',
  new Set(fields.map(([, hex]) => hex)).size === 10, fields.map(([id, hex]) => `${id}:${hex}`).join(' '));

check('each palette keeps the notables / modifiers split',
  THEMES.every((t) => token(`.m-atrium.t-${t.id}`, 'note') && token(`.m-atrium.t-${t.id}`, 'mod')
    && token(`.m-atrium.t-${t.id}`, 'note') !== token(`.m-atrium.t-${t.id}`, 'mod')));

/* ── one interaction language, kept ─────────────────────────────────────── */

const hoverInLayout = (css.match(/\.m-atrium[^{},]*:hover/g) || []).length;
check('the layout has bespoke hover states', hoverInLayout >= 6, hoverInLayout + ' states');

/* ── geometry: nothing may collide, and every container must space its children ── */

const cssVal = (sel, prop) => {
  const b = blockOf(sel);
  const m = b.match(new RegExp('(?:^|[;{\\s])' + prop.replace(/-/g, '\\-') + ':\s*([^;]+)'));
  return m ? m[1].trim() : '';
};
const cssNum = (sel, prop, fallback) => {
  const m = cssVal(sel, prop).match(/(-?[\d.]+)px/);
  return m ? parseFloat(m[1]) : fallback;
};
const boxNums = (sel, prop, fallback) => {
  const list = (cssVal(sel, prop).match(/-?[\d.]+/g) || []).map(Number);
  return list.length ? list : fallback;
};

const SHEET_H = 720;
const BAR_H = 64;
const STATUS_H = 30;
const bodyPad = boxNums('.m-atrium .a-body', 'padding', [18, 32, 16]);
const padY = bodyPad[0] + (bodyPad[2] !== undefined ? bodyPad[2] : bodyPad[0]);
const padX = bodyPad[1] !== undefined ? bodyPad[1] : bodyPad[0];
const gapBody = cssNum('.m-atrium .a-body', 'gap', 30);
const panelW = (cssVal('.m-atrium .a-body', 'grid-template-columns').match(/(\d+)px/) || [0, 344])[1] * 1;
const available = SHEET_H - BAR_H - STATUS_H - padY;

/* the main column: head row, hero block, then the cards */
const cardPad = boxNums('.m-atrium .a-card', 'padding', [9, 15])[0];
const modsPerRow = /\.a-cardbody \.fx-mods \{[^}]*flex-direction:\s*row/.test(css.replace(/\n/g, ' ')) ? 1 : 2;
const cardH = cardPad * 2 + 2
  + cssNum('.m-atrium .a-cardbody b', 'font-size', 14) * 1.35
  + modsPerRow * (cssNum('.m-atrium .a-cardbody .fx-mod', 'font-size', 11) * 1.35 + 1)
  + cssNum('.m-atrium .a-cardbody .fx-gear', 'font-size', 10.5) * 1.35
  + 7 + 6;
const rows = section('crimson').querySelectorAll('[data-combo]').length;
const listH = rows * cardH + (rows - 1) * cssNum('.m-atrium .a-list', 'gap', 6);
const heroH = 24
  + cssNum('.m-atrium .a-titlerow h1', 'font-size', 46) * 0.95
  + cssNum('.m-atrium .a-sub', 'font-size', 12.5) * 1.5 + 4
  + cssNum('.m-atrium .a-meta', 'margin-top', 8) + 34
  + cssNum('.m-atrium .a-stats', 'margin-top', 12)
  + cssNum('.m-atrium .a-stats .stat em', 'font-size', 11) * 1.35
  + cssNum('.m-atrium .a-stats .num', 'font-size', 40) * 1.25;
const mainSlack = available - (heroH + listH);
check('the main column fits above the status bar, with room to spare',
  mainSlack >= 12, `${(heroH + listH).toFixed(0)} of ${available}px used, ${mainSlack.toFixed(0)}px spare`);

/* the panel: selected block, gem picker, ranking, uniques, routes, totals */
const panelPad = boxNums('.m-atrium .a-panel', 'padding', [12])[0];
const panelGap = cssNum('.m-atrium .a-panel', 'gap', 1);
const capF = cssNum('.m-atrium .a-cap', 'font-size', 9.5);
const capM = boxNums('.m-atrium .a-cap', 'margin', [5, 0, 2]);
const selPad = boxNums('.m-atrium .a-selected', 'padding', [8, 10])[0];
const selH = selPad * 2 + capF * 1.2 + 2
  + 2 * cssNum('.m-atrium .a-selected h2', 'font-size', 16) * 1.3
  + cssNum('.m-atrium .a-charln', 'font-size', 11) * 1.4
  + cssNum('.m-atrium .a-selected .fx-notable', 'font-size', 12) * 1.35
  + 2 * cssNum('.m-atrium .a-selected .fx-mod', 'font-size', 12) * 1.35 + 2
  + cssNum('.m-atrium .a-selected .fx-gear', 'font-size', 11) * 1.35
  + 7 + 12;
const rankH = 5 * cssNum('.m-atrium .a-notrow', 'font-size', 12) * 1.35
  + 4 * cssNum('.m-atrium .a-notlist', 'gap', 2);
const routeH = 3 * (cssNum('.m-atrium .a-routes .fx-route', 'font-size', 11.5) * 1.35
  + 2 * boxNums('.m-atrium .a-routes .fx-route', 'padding', [2, 0])[0]);
const dotM = boxNums('.m-atrium .a-dotrule', 'margin', [8, 0, 7]);
const dotH = dotM[0] + dotM[2] + 1;
const panelH = panelPad * 2 + panelGap * 9 + selH + dotH
  + cssNum('.m-atrium .a-pick', 'width', 34) + 8
  + 3 * (capF * 1.2 + capM[0] + capM[2])
  + rankH + 24
  + cssNum('.m-atrium .a-target', 'font-size', 13) * 1.4
  + routeH
  + (cssNum('.m-atrium .a-totals', 'padding-top', 8) + 3 * cssNum('.m-atrium .a-totals', 'font-size', 12) * 1.4);
const panelSlack = available - panelH;
check('the panel fits inside its own box',
  panelSlack >= 12, `${panelH.toFixed(0)} of ${available}px used, ${panelSlack.toFixed(0)}px spare`);

const mainW = 1280 - padX * 2 - panelW - gapBody;
check('the two columns share the sheet without touching',
  mainW >= 700 && panelW >= 320 && gapBody >= 24,
  `main ${mainW}px · gap ${gapBody}px · panel ${panelW}px`);

check('the hero and the list cannot overlap by construction',
  /\.m-atrium \.a-main \{[^}]*display:\s*grid[^}]*grid-template-rows:\s*auto auto auto minmax\(0, 1fr\)/.test(css.replace(/\n/g, ' ')));

check('the cards keep their height instead of being squeezed',
  /\.m-atrium \.a-list \{[^}]*justify-content:\s*flex-end/.test(css.replace(/\n/g, ' '))
  && /\.m-atrium \.a-panel > \* \{[^}]*flex:\s*0 0 auto/.test(css.replace(/\n/g, ' ')));

check('the mock footer clears the gallery zoom button',
  /\.m-atrium \.a-status \{[^}]*padding:\s*0 96px 0 34px/.test(css.replace(/\n/g, ' ')));

check('no region can spill into its neighbour',
  ['.m-atrium .a-body', '.m-atrium .a-panel']
    .every((sel) => /overflow:\s*hidden/.test(blockOf(sel)) && /min-height:\s*0/.test(blockOf(sel)))
  && /min-height:\s*0/.test(blockOf('.m-atrium .a-main')));

/* ── the hover tooltip: the item card a player reads before socketing ────── */

check('every combination carries an item tooltip',
  THEMES.every((t) => section(t.id).querySelectorAll('.a-card .a-tip').length === 4),
  THEMES.map((t) => section(t.id).querySelectorAll('.a-tip').length).join(' '));

check('the tooltip states name, base type, item level, mods and notables',
  THEMES.every((t) => {
    const tips = [...section(t.id).querySelectorAll('.a-tip')];
    return tips.every((tip) => text(tip.querySelector('.a-tiphead b')).length > 3
      && /Cluster Jewel$/.test(text(tip.querySelector('.a-tiphead em')))
      && /Item Level: \d+/.test(text(tip))
      && /Passive Skills/.test(text(tip))
      && tip.querySelectorAll('.a-tipmods i').length >= 2
      && tip.querySelectorAll('.a-tipnotes i').length >= 1
      && tip.querySelector('.a-tipjewel'));
  }),
  text(section('crimson').querySelector('.a-tiphead')));

check('the tooltip is hidden until the card is hovered',
  /\.m-atrium \.a-tip \{[^}]*opacity:\s*0[^}]*visibility:\s*hidden/.test(css.replace(/\n/g, ' '))
  && /\.m-atrium \.a-card:hover \.a-tip[^{]*\{[^}]*opacity:\s*1[^}]*visibility:\s*visible/.test(css.replace(/\n/g, ' ')));

check('the tooltip floats above the sheet and cannot block the pointer',
  /z-index:\s*\d+/.test(blockOf('.m-atrium .a-tip'))
  && /pointer-events:\s*none/.test(blockOf('.m-atrium .a-tip')));

check('the tooltip paints above the panel it flies over',
  /z-index:\s*2/.test(blockOf('.m-atrium .a-main')) && /z-index:\s*1/.test(blockOf('.m-atrium .a-panel'))
  && /z-index:\s*30/.test(blockOf('.m-atrium .a-tip')));

check('the tooltip is out of flow, so it can never push the layout',
  /position:\s*absolute/.test(blockOf('.m-atrium .a-tip'))
  && /overflow:\s*visible/.test(blockOf('.m-atrium .a-card')));

check('the tooltip is anchored to its card on both sides of the list',
  /\.a-card:nth-child\(1\) \.a-tip/.test(css) && /\.a-card:nth-child\(3\) \.a-tip/.test(css));

const spaced = [
  '.m-atrium .a-headline', '.m-atrium .a-meta', '.m-atrium .a-stats', '.m-atrium .a-list',
  '.m-atrium .a-card', '.m-atrium .a-panel', '.m-atrium .a-picks', '.m-atrium .a-classrow',
  '.m-atrium .a-sizes', '.m-atrium .a-body',
];
const unspaced = spaced.filter((sel) => !/gap:\s*[\d.]+px/.test(blockOf(sel)));
check('every container spaces its children deliberately',
  unspaced.length === 0, unspaced.length ? unspaced.join(', ') : spaced.length + ' containers, all with an explicit gap');

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

/* ── and none of the ten may be bright ──────────────────────────────────── */

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

/* brown is the dark amber band; a bright gold sits above it and is not brown */
const brownOrGreen = ({ h, sat, l }) =>
  sat >= 0.22 && l > 0.06 && l < 0.92 && ((h >= 18 && h <= 58 && l < 0.5) || (h >= 62 && h <= 172));

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
check('the first palette carries a second, warm accent',
  (() => {
    const note = token('.m-atrium.t-crimson', 'note');
    const c = hslOf(parseInt(note.slice(1, 3), 16), parseInt(note.slice(3, 5), 16), parseInt(note.slice(5, 7), 16));
    return c.h >= 34 && c.h <= 60 && c.l > 0.55;
  })(),
  'note ' + token('.m-atrium.t-crimson', 'note'));

check('no palette is accented in brown or green',
  accentHues.every(([, c]) => c && !brownOrGreen(c)),
  accentHues.map(([id, c]) => `${id}:h${c ? Math.round(c.h) : '?'}`).join(' '));


/* every palette carries a third, separate colour for the action — the craft target, the best
   route, the gem ring — so no two jobs are ever asked to share one hue */
const golds = THEMES.map((t) => {
  const hex = token(`.m-atrium.t-${t.id}`, 'gold') || token(`.m-atrium.t-${t.id}`, 'warm');
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return [t.id, hex, false];
  const c = hslOf(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
  const note = token(`.m-atrium.t-${t.id}`, 'note');
  const mod = token(`.m-atrium.t-${t.id}`, 'mod');
  return [t.id, hex, c.l > 0.55 && !brownOrGreen(c) && hex !== note && hex !== mod];
});
check('every palette declares a pale, legal action colour',
  golds.every(([, , ok]) => ok), golds.map(([id, hex]) => `${id}:${hex}`).join(' '));

/* ── the background study (designs/backdrops.html) ──────────────────────── */

/**
 * Loaded the way a browser loads it — real <script> tags, one shared global scope. The eval-based
 * checks above cannot see a name collision between two classic scripts, and that is exactly how
 * the study page first shipped blank: backdrops.js redeclared `L` and the browser killed it with
 * a SyntaxError while jsdom's eval() was happy. So this one runs in a child process.
 */
{
  const { execFileSync } = require('child_process');
  const probe = `
    const path = require('path');
    const { pathToFileURL } = require('url');
    const { JSDOM, VirtualConsole } = require('jsdom');
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
    vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
    const file = path.resolve(${JSON.stringify(path.join(dir, 'backdrops.html'))});
    JSDOM.fromFile(file, { runScripts: 'dangerously', resources: 'usable', virtualConsole: vc, pretendToBeVisual: true, url: pathToFileURL(file).href })
      .then((dom) => new Promise((done) => {
        if (dom.window.document.readyState === 'complete') return done(dom);
        dom.window.addEventListener('load', () => done(dom));
        setTimeout(() => done(dom), 4000);
      }))
      .then((dom) => {
        const d = dom.window.document;
        const photos = [...d.querySelectorAll('.a-photo')];
        process.stdout.write(JSON.stringify({
          sections: [...d.querySelectorAll('.bg-sec')].map((x) => x.id),
          groups: [...d.querySelectorAll('.bg-group')].map((g) => g.textContent.trim()),
          mocks: d.querySelectorAll('.mock').length,
          photos: photos.length,
          portraits: d.querySelectorAll('.a-photo.is-portrait').length,
          strengths: d.querySelectorAll('button[data-strength]').length,
          strengthDefault: d.body.getAttribute('data-strength'),
          srcs: photos.filter((p) => !p.classList.contains('is-portrait')).map((p) => p.querySelector('img').getAttribute('src')),
          photoPosition: photos.map((p) => dom.window.getComputedStyle(p).position),
          masked: photos.filter((p) => {
            const cs = dom.window.getComputedStyle(p.querySelector('img'));
            return /gradient/.test(cs.maskImage || cs.webkitMaskImage || '');
          }).length,
          scrim: photos.filter((p) => p.querySelector('b')).length,
          tinted: photos.filter((p) => {
            const i = p.querySelector('i');
            return i && dom.window.getComputedStyle(i).mixBlendMode === 'color';
          }).length,
          errors,
        }));
      })
      .catch((e) => process.stdout.write(JSON.stringify({ sections: [], errors: ['load: ' + e.message] })));
  `;

  let study = { sections: [], errors: ['probe did not run'] };
  try {
    const raw = execFileSync(process.execPath, ['-e', probe], {
      encoding: 'utf8', env: process.env, timeout: 30000,
    });
    study = JSON.parse(raw);
  } catch (e) {
    study = { sections: [], errors: ['probe failed: ' + e.message.split('\n')[0]] };
  }

  check('the background study loads like a page, not like a snippet',
    study.sections.length === 8 && study.mocks === 8,
    study.sections.join(' ') || 'no sections rendered');
  check('the study separates the real art from the baseline',
    (study.groups || []).join(' |') === 'Actual art |Baseline',
    (study.groups || []).join(' · ') || 'no groups');
  check('seven directions use real art and one keeps the portrait',
    study.photos === 8 && study.portraits === 1,
    `${study.photos} art layers · ${study.portraits} portrait`);
  check('every art layer loads a file that exists, at real resolution',
    (study.srcs || []).length === 7 && (study.srcs || []).every((src) => {
      const file = path.resolve(dir, src);
      try {
        const buf = fs.readFileSync(file);
        if (buf.slice(1, 4).toString() === 'PNG') return buf.readUInt32BE(16) >= 600;
        let i = 2;
        while (i < buf.length - 9) {
          if (buf[i] !== 0xFF) { i++; continue; }
          const m = buf[i + 1];
          if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return buf.readUInt16BE(i + 7) >= 700;
          i += 2 + buf.readUInt16BE(i + 2);
        }
        return false;
      } catch (e) { return false; }
    }),
    (study.srcs || []).map((s) => s.split('/').pop()).join(' ') || 'no sources');
  check('every art layer is masked away from the type column, but the wordmark',
    study.masked === 6, `${study.masked} of ${study.photos} masked`);
  check('every art layer wears the palette, and none of them sits in the mock grid',
    study.tinted === 7 && (study.photoPosition || []).every((p) => p === 'absolute'),
    `${study.tinted} tinted · ${(study.photoPosition || []).join(' ')}`);
  check('every art layer carries its own scrim', study.scrim === 7, `${study.scrim} scrims`);
  check('the study has a three-step strength control',
    study.strengths === 3 && study.strengthDefault === 'medium',
    `${study.strengths} steps · default ${study.strengthDefault}`);
  check('the study page runs without errors', study.errors.length === 0,
    study.errors.slice(0, 3).join(' | ') || 'none');
}

/* ── report ─────────────────────────────────────────────────────────────── */

/* the bars light on the next animation frame, so the last checks wait for one */
setTimeout(() => {
  check('every mock lit its bars on first paint',
    THEMES.every((t) => mockOf(t.id).classList.contains('lit')),
    THEMES.filter((t) => !mockOf(t.id).classList.contains('lit')).map((t) => t.id).join(', ') || 'all ten');

  check('nothing errors after a frame', errors.length === 0, errors.join(' | ') || 'none');

  console.log(results.join('\n'));
  const failures = results.filter((line) => line.startsWith('FAIL'));
  console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
  process.exit(failures.length ? 1 : 0);
}, 120);
