#!/usr/bin/env node
/**
 * Structural check for preview/designs/plates.html.
 *
 * The page is generated in pieces by tools/make_black_podium_plates.py and by hand edits, which has
 * already bitten twice: once with asset paths that pointed at the wrong folder, and once when the tab
 * bar was spliced out of the page, leaving only the first tab's three plates reachable. So this check
 * keeps to what a reader actually needs to be true:
 *
 *   1. the tab bar exists and names one tab per set;
 *   2. every set exists and holds three plates;
 *   3. every image the page references is a real file at 1920×1080;
 *   4. clicking each tab reveals exactly that set, in jsdom, as a reader would.
 *
 *     NODE_PATH=/home/user/Forever_Exiled/node_modules node tools/plates_check.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'preview', 'designs', 'plates.html');
const TABS = ['watchers', 'rare', 'economy', 'flasks'];
const PER_SET = 3;

let failed = 0;
const check = (name, fn) => {
  try {
    const detail = fn();
    console.log('PASS  ' + name + (detail ? '  — ' + detail : ''));
  } catch (e) {
    failed++;
    console.log('FAIL  ' + name + '  — ' + e.message);
  }
};

const html = fs.readFileSync(PAGE, 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { if (!/not implemented/i.test(e.message)) errors.push(e.message); });
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  virtualConsole: vc,
  url: 'http://localhost:8081/designs/plates.html',
});
const doc = dom.window.document;

check('the page has a <main> and a tab bar', () => {
  if (!doc.querySelector('main')) throw new Error('no <main>');
  const bar = doc.querySelector('.bar [role="tablist"]');
  if (!bar) throw new Error('no tab bar — only the first set would be reachable');
  return doc.querySelectorAll('.bar .tab').length + ' tabs';
});

check('one tab per set, in order', () => {
  const got = [...doc.querySelectorAll('.bar .tab')].map((t) => t.dataset.set);
  if (got.join() !== TABS.join()) throw new Error('tabs are ' + got.join(',') + ', expected ' + TABS.join(','));
  return got.join(' · ');
});

check('every set exists with ' + PER_SET + ' plates, and every plate is a real 1920×1080 file', () => {
  const sizes = [];
  for (const tab of TABS) {
    const set = doc.getElementById('set-' + tab);
    if (!set) throw new Error('missing #set-' + tab);
    const cards = set.querySelectorAll('.card .shot img');
    if (cards.length !== PER_SET) throw new Error(tab + ' has ' + cards.length + ' plates, expected ' + PER_SET);
    for (const img of cards) {
      const rel = img.getAttribute('src');
      const abs = path.join(ROOT, 'preview', 'designs', rel);
      if (!fs.existsSync(abs)) throw new Error('missing file ' + rel);
      const buf = fs.readFileSync(abs);
      if (buf.slice(0, 2).toString('hex') !== 'ffd8') throw new Error('not a jpeg: ' + rel);
      // SOF0/SOF2 carries the frame size: read it rather than trusting the filename
      let i = 2, w = 0, h = 0;
      while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xc3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; }
        i += 2 + len;
      }
      if (w !== 1920 || h !== 1080) throw new Error(rel + ' is ' + w + '×' + h);
      sizes.push(w + '×' + h);
    }
  }
  return (TABS.length * PER_SET) + ' plates, all ' + sizes[0];
});

check('clicking a tab reveals exactly that set', () => {
  for (const tab of TABS) {
    const button = doc.querySelector('.bar .tab[data-set="' + tab + '"]');
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    const on = [...doc.querySelectorAll('.set.on')].map((s) => s.id);
    if (on.length !== 1 || on[0] !== 'set-' + tab) throw new Error(tab + ' left open: ' + (on.join(',') || 'nothing'));
  }
  return TABS.length + ' sets switch cleanly';
});

check('nothing errors while the page runs', () => {
  if (errors.length) throw new Error(errors[0].slice(0, 160));
  return 'no script errors';
});

console.log('');
if (failed) {
  console.log(failed + ' check' + (failed === 1 ? '' : 's') + ' failed');
  process.exit(1);
}
console.log('all plates checks passed');
