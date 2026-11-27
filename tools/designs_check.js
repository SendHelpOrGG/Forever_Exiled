#!/usr/bin/env node
/**
 * Structural check for the design gallery (preview/designs/).
 *
 * It cannot judge whether a direction looks good — that is the whole point of asking — but it
 * can guarantee the ten mocks are actually there, all show the same content, and every image
 * they reference exists.
 *
 *     NODE_PATH=... node tools/designs_check.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..', 'preview');
const dir = path.join(root, 'designs');
const read = (p) => fs.readFileSync(p, 'utf8');

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
virtualConsole.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));

const html = read(path.join(dir, 'index.html')).replace('<script src="designs.js"></script>', '');
const dom = new JSDOM(html, { runScripts: 'outside-only', virtualConsole, pretendToBeVisual: true });
const { window } = dom;
const { document } = window;

window.eval(read(path.join(dir, 'designs.js')));

const q = (s) => document.querySelector(s);
const qa = (s) => [...document.querySelectorAll(s)];
const txt = (s) => (q(s) ? q(s).textContent.replace(/\s+/g, ' ').trim() : '');

const results = [];
const check = (label, ok, detail = '') =>
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);

const EXPECTED = [
  'Obsidian Glass', 'Codex', 'Terminal', 'Sanctum', 'Ember',
  'Atlas', 'Brutalist', 'Prism', 'Ledger', 'Trophy',
];

const sections = qa('.variant');
check('ten directions rendered', sections.length === 10, sections.length + ' sections');
check('they are the ten asked for',
  sections.map((s) => txt('#' + s.id + ' h2')).join(' | ') === EXPECTED.join(' | '),
  sections.map((s) => txt('#' + s.id + ' h2')).join(' · '));
check('the index lists all ten', qa('.gal-index a').length === 10, qa('.gal-index a').length + ' links');
check('every section has a numbered head',
  sections.every((s) => /^\d\d$/.test(txt('#' + s.id + ' .v-num'))),
  sections.map((s) => txt('#' + s.id + ' .v-num')).join(' '));

/* every mock must carry the same screen, or the comparison is not a comparison */
const shared = [
  ['.mk-side .mk-brand', 'brand'],
  ['.mk-nav a', 'navigation'],
  ['.mk-hero h2', 'hero name'],
  ['.mk-hero .mk-chips span', 'chips'],
  ['.mk-stats > div', 'peak and average'],
  ['.mk-sizes button', 'size pills'],
  ['.mk-list .mk-combo', 'combination rows'],
  ['.mk-right .mk-card', 'right rail cards'],
  ['.mk-status', 'status bar'],
];

for (const [selector, label] of shared) {
  const counts = sections.map((s) => s.querySelectorAll(selector).length);
  check(`all ten mocks carry the ${label}`, counts.every((n) => n === counts[0]) && counts[0] > 0,
    counts.join(' '));
}

check('the hero shows a peak and an average in every mock',
  sections.every((s) => s.querySelectorAll('.mk-stats b').length === 2));
check('styling notes are written for every variant',
  sections.every((s) => s.querySelectorAll('.v-notes > div').length === 2),
  txt('#v1 .v-notes b'));
check('every variant has a palette', sections.every((s) => s.querySelectorAll('.v-swatches i').length === 5));

/* the mocks borrow the app's own art, so the paths must resolve from this folder */
const sources = qa('.mock img').map((img) => img.getAttribute('src'));
const missing = [...new Set(sources)].filter((src) => !fs.existsSync(path.join(dir, src)));
check('mock art resolves from preview/designs', missing.length === 0,
  missing.length ? missing.join(', ') : sources.length + ' images, ' + new Set(sources).size + ' unique');

check('a variant that needs the KPI strip has it', q('#v6 .mk-tiles > div') !== null);
check('a variant that needs the art wall has it', q('#v10 .mk-artwall .mk-tile') !== null);
check('the top-nav variants drop the sidebar in CSS',
  /\.mock\.nav-top \.mk-side\s*\{\s*display:\s*none/.test(read(path.join(dir, 'designs.css'))));

check('no page errors', errors.length === 0, errors.join(' | ') || 'none');

console.log(results.join('\n'));
const failures = results.filter((line) => line.startsWith('FAIL'));
console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
process.exit(failures.length ? 1 : 0);
