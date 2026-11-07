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
window.fetch = () => Promise.resolve({ json: async () => snapshot });
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
  /* ── cluster lab ── */
  const skills = qa('#skillList .skill');
  check('skill rail populated', skills.length === snapshot.skills.length, skills.length + ' skills');
  check('rail sorted by DPS', txt('#skillList .skill .skill-name') === 'Molten Strike of the Zenith',
    txt('#skillList .skill .skill-name'));
  check('hero card', txt('#hero .hero-stats').includes('AVG DPS'), txt('#hero .hero-name') + ' · ' + txt('#hero .hero-stats'));
  check('three size pills', qa('#sizePills .pill').length === 3);
  check('combo cards', qa('#comboList .combo').length > 0,
    qa('#comboList .combo').length + ' cards · ' + txt('#comboList .combo .combo-pct'));
  check('global leader names an anchor build',
    txt('#globalLeader .leader-anchor').includes('·'),
    txt('#globalLeader .leader-name') + ' / ' + txt('#globalLeader .leader-anchor'));
  check('jewel mix', qa('#mixCard .mix-row').length === 3);
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
  click(qa('#metaSizeFilter button').find((b) => b.dataset.size === 'Large'));
  check('meta Large filter', qa('#metaComboList .size-tag').every((e) => e.textContent === 'LARGE'),
    qa('#metaComboList .meta-combo').length + ' large combinations');

  /* ── ladder ── */
  click(qa('.nav-tile').find((t) => t.dataset.tab === 'ladder'));
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
