'use strict';

/**
 * Background study for Atrium — see backdrops.html.
 *
 * Everything here lives inside one IIFE on purpose: designs.js is a classic script too, and two
 * classic scripts share one global lexical scope, so redeclaring `L`, `wireMock` or `fitFrames`
 * at this level would kill the page with “Identifier has already been declared”. The template and
 * the wiring are borrowed through `window.FE`.
 */

(() => {
  'use strict';

  /* ── helpers ───────────────────────────────────────────────────────────────── */

  const { L, wireMock, fitFrames } = window.FE;

  const rnd = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const veil = (inner) => `<svg class="a-veil" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`;

  /* a mask that dissolves the drawing over the text column, so nothing fights the cards */
  const fadeMask = (id, from = 0.3, to = 0.78) => `
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0"/>
        <stop offset="${from}" stop-color="#fff" stop-opacity="0"/>
        <stop offset="${to}" stop-color="#fff" stop-opacity=".9"/>
        <stop offset="1" stop-color="#fff" stop-opacity="1"/>
      </linearGradient>
      <mask id="${id}-m"><rect width="1280" height="720" fill="url(#${id})"/></mask>`;

  const deg = (a) => a * 180 / Math.PI;

  /* ── 02 · the passive tree ─────────────────────────────────────────────────── */

  function treeSvg() {
    const cx = 1060;
    const cy = 214;
    const rings = [[148, 9], [220, 13], [294, 17], [370, 21], [450, 25]];
    const nodes = rings.map(([r, n], ri) => Array.from({ length: n }, (_, i) => {
      const a = ri * 0.24 + (i / n) * Math.PI * 2;
      return { r, ri, i, a, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    }));

    /* every node keeps its ring neighbours; each ring reaches outward to the nearest node */
    const links = [];
    nodes.forEach((ring) => ring.forEach((n, i) => links.push([n, ring[(i + 1) % ring.length]])));
    for (let r = 0; r < nodes.length - 1; r++) {
      nodes[r].forEach((n) => {
        let best = null;
        let d = 9;
        nodes[r + 1].forEach((m) => {
          const gap = Math.abs(((m.a - n.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
          if (gap < d) { d = gap; best = m; }
        });
        if (best) links.push([n, best]);
      });
    }

    /* one allocated path: straight out from the socket, plus the neighbour it passes through */
    const path = [];
    let from = 0;
    nodes.forEach((ring) => {
      let best = ring[0];
      let d = 9;
      ring.forEach((m) => {
        const gap = Math.abs(((m.a - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (gap < d) { d = gap; best = m; }
      });
      path.push(best);
      from = best.a;
    });
    const lit = new Set(path);
    path.forEach((n, i) => {
      if (i < path.length - 1) lit.add(nodes[n.ri][(n.i + 1) % nodes[n.ri].length]);
    });

    const isLit = (n) => lit.has(n);
    const edges = links.map(([a, b]) =>
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}"/>`).join('');
    const dots = nodes.flat().map((n) => {
      const big = n.i % 3 === 0 && n.ri > 0;
      const r = big ? 3.6 : 2.1;
      const halo = big ? `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r + 3.4}" fill="none"/>` : '';
      return `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${r}"/>${halo}`;
    }).join('');
    const litEdges = path.slice(0, -1).map((n, i) => {
      const m = path[i + 1];
      return `<line x1="${n.x.toFixed(1)}" y1="${n.y.toFixed(1)}" x2="${m.x.toFixed(1)}" y2="${m.y.toFixed(1)}"/>`;
    }).join('');
    const litDots = path.map((n) => `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="3.2"/>`).join('');

    /* the socket the path starts from */
    const socket = `<circle cx="${cx}" cy="${cy}" r="17" fill="none" stroke-width="1.4"/>
      <circle cx="${cx}" cy="${cy}" r="6.5"/>`;

    return veil(`
    <defs>${fadeMask('veilTree')}</defs>
    <g mask="url(#veilTree-m)">
      <g stroke="var(--faint)" stroke-width="1" opacity=".55">${edges}</g>
      <g fill="var(--faint)" opacity=".8">${dots}</g>
      <g stroke="var(--accent)" stroke-width="1.6" opacity=".9">${litEdges}</g>
      <g fill="var(--accent)" opacity=".95">${litDots}${socket}</g>
    </g>`);
  }

  /* ── 03 · the cluster jewel's own radius ───────────────────────────────────── */

  function clusterSvg() {
    const cx = 1040;
    const cy = 330;
    const R = 296;
    const spokes = [];
    const dots = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      const big = i % 3 === 0;
      spokes.push(`<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
      dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${big ? 4.6 : 2.6}"${big ? ` fill="var(--accent)"` : ''}/>`);
      if (big) dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8.4" fill="none"/>`);
    }

    return veil(`
    <defs>${fadeMask('veilCluster', 0.32, 0.8)}</defs>
    <g mask="url(#veilCluster-m)">
      <image href="../assets/cluster_large.png" x="${cx - 170}" y="${cy - 170}" width="340" height="340"
             opacity=".18" preserveAspectRatio="xMidYMid meet"/>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke-width="1.2" stroke-dasharray="2 8" stroke="var(--faint)"/>
      <circle cx="${cx}" cy="${cy}" r="${R * 0.62}" fill="none" stroke-width="1" stroke-dasharray="4 11" stroke="var(--faint)" opacity=".8"/>
      <circle cx="${cx}" cy="${cy}" r="${R * 0.3}" fill="none" stroke-width="1" stroke="var(--faint)" opacity=".55"/>
      <g stroke="var(--faint)" stroke-width=".9" opacity=".5">${spokes.join('')}</g>
      <g fill="var(--faint)" stroke="var(--faint)" stroke-width=".9" opacity=".8">${dots.join('')}</g>
      <circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".9"/>
      <circle cx="${cx}" cy="${cy}" r="3.4" fill="var(--accent)" opacity=".95"/>
    </g>`);
  }

  /* ── 04 · the atlas / map-device wheel ─────────────────────────────────────── */

  function glyphSvg() {
    const cx = 1010;
    const cy = 300;
    const rings = [176, 252, 330];
    const ticks = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const long = i % 10 === 0;
      const inner = (long ? 330 : 330) - (long ? 20 : 9);
      const outer = 330;
      ticks.push(`<line x1="${(cx + Math.cos(a) * inner).toFixed(1)}" y1="${(cy + Math.sin(a) * inner).toFixed(1)}"
        x2="${(cx + Math.cos(a) * outer).toFixed(1)}" y2="${(cy + Math.sin(a) * outer).toFixed(1)}"/>`);
    }
    const runes = [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * 252;
      const y = cy + Math.sin(a) * 252;
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${deg(a).toFixed(1)})" fill="none" stroke-width="1.4">
        <path d="M0 -13 L11 8 L-11 8 Z"/><path d="M0 8 L0 19"/></g>`;
    }).join('');

    return veil(`
    <defs>${fadeMask('veilGlyph', 0.34, 0.82)}</defs>
    <g mask="url(#veilGlyph-m)">
      <g class="spin" style="transform-origin:${cx}px ${cy}px">
        <circle cx="${cx}" cy="${cy}" r="330" fill="none" stroke="var(--faint)" stroke-width="1.1"/>
        <g stroke="var(--faint)" stroke-width=".9" opacity=".6">${ticks.join('')}</g>
      </g>
      <circle cx="${cx}" cy="${cy}" r="252" fill="none" stroke="var(--faint)" stroke-width="1.1" stroke-dasharray="6 10"/>
      <circle cx="${cx}" cy="${cy}" r="176" fill="none" stroke="var(--faint)" stroke-width="1" opacity=".7"/>
      <g stroke="var(--accent)" opacity=".85">${runes}</g>
      <circle cx="${cx}" cy="${cy}" r="112" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity=".5" stroke-dasharray="1 7"/>
      <circle cx="${cx}" cy="${cy}" r="5" fill="var(--accent)" opacity=".9"/>
    </g>`);
  }

  /* ── 05 · the tree with a cluster socket at its heart ──────────────────────── */

  function comboSvg() {
    const cx = 1060;
    const cy = 236;
    const tree = treeSvg();
    /* lift the drawing out of its wrapper and drop the jewel wheel into the nexus */
    const inner = tree.slice(tree.indexOf('>') + 1, tree.lastIndexOf('</svg>'));
    const wheel = `
      <circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="var(--faint)" stroke-width="1" stroke-dasharray="2 7" opacity=".8"/>
      <image href="../assets/cluster_large.png" x="${cx - 54}" y="${cy - 54}" width="108" height="108" opacity=".22" preserveAspectRatio="xMidYMid meet"/>
      <circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="var(--accent)" stroke-width="1.3" opacity=".8"/>`;
    return veil(inner.replace('<g mask="url(#veilTree-m)">', wheel + `<g mask="url(#veilTree-m)">`));
  }

  /* ── PoE iconography ──────────────────────────────────────────────────────── */

  /* Four references drawn to their parts, not to the impression of them: the title cartouche, the
     shield from the Lord's Labyrinth, the Sacred Grove, and the kit Einhar carries. Everything is
     strokes and simple fills on the palette tokens; the veil strength control sets how loudly they
     speak. */

  const GOLD = 'var(--gold)';
  const ACC = 'var(--accent)';
  const NOTE = 'var(--note)';
  const MOD = 'var(--mod)';

  const atmosphereDefs = (id) => `
      <radialGradient id="${id}-vig" cx=".63" cy=".26" r=".82">
        <stop offset=".28" style="stop-color:var(--bg);stop-opacity:0"/>
        <stop offset="1" style="stop-color:var(--bg);stop-opacity:.92"/>
      </radialGradient>
      <filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>`;

  const atmosphere = (id) => `
      <rect width="1280" height="720" fill="url(#${id}-vig)"/>
      <rect width="1280" height="720" filter="url(#${id}-grain)" opacity=".1"/>`;

  /* one feather: a leaf that tapers to a point, length along +x, s flips it */
  const feather = (len, wid, s = 1) =>
    `M0 0 Q${(s * len * 0.42).toFixed(1)} ${(-wid).toFixed(1)} ${(s * len).toFixed(1)} 0 Q${(s * len * 0.42).toFixed(1)} ${(wid * 0.62).toFixed(1)} 0 0 Z`;

  const fan = (x, y, side, opts = {}) => {
    const count = opts.count || 5;
    const len0 = opts.len || 104;
    const wid0 = opts.wid || 16;
    const out = [];
    for (let i = 0; i < count; i++) {
      const len = len0 - i * (len0 / (count + 1.4));
      const wid = wid0 - i * (wid0 / (count + 2));
      const rot = side * (10 + i * 13);
      out.push(`<g transform="rotate(${rot.toFixed(1)})"><path d="${feather(len, wid, side)}" fill="${GOLD}" fill-opacity="${(0.3 - i * 0.042).toFixed(2)}"/></g>`);
    }
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${out.join('')}</g>`;
  };

  /* 01 — the title cartouche: domed shield, three bust medallions on the rim, a fan of feathers
     each side, laurel under the title, five pendants beneath, wordmark engraved in gold. */
  const cartoucheSvg = () => {
    /* kept clear of both the frame edge and the text column: the plate is 392 wide and the
       feather fans stop 40px short of the right edge */
    const cx = 918;
    const cy = 330;
    const w = 196;
    const dome = 132;
    const plate = (dx = 0, dy = 0) =>
      `M${cx - w + dx} ${cy - 20 + dy} A${w - dx} ${dome - dy} 0 0 1 ${cx + w - dx} ${cy - 20 + dy} ` +
      `L${cx + w - dx} ${cy + 146 + dy} Q${cx} ${cy + 244 + dy * 1.4} ${cx - w + dx} ${cy + 146 + dy} Z`;

    const medallion = (t) => {
      const x = cx + (w - 16) * Math.cos(t);
      const y = cy - 20 - (dome - 16) * Math.sin(t);
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})" fill="none" stroke="${GOLD}">
          <circle r="28" stroke-opacity=".55" stroke-width="1.6"/>
          <circle r="22" stroke-opacity=".3"/>
          <circle cx="0" cy="-6" r="7" fill="${GOLD}" fill-opacity=".42" stroke="none"/>
          <path d="M-13 14 Q0 2 13 14" stroke-opacity=".4"/>
        </g>`;
    };

    const pendants = [-38, -19, 0, 19, 38].map((dx, i) => {
      const len = i === 2 ? 46 : i === 1 || i === 3 ? 30 : 20;
      const x = cx + dx;
      const y = cy + 232;
      return `<g stroke="${GOLD}" stroke-opacity=".45" fill="none">
          <line x1="${x}" y1="${y}" x2="${x}" y2="${y + len}"/>
          <path d="M${x} ${y + len} L${x + 3.4} ${y + len + 5} L${x} ${y + len + 10} L${x - 3.4} ${y + len + 5} Z" fill="${GOLD}" fill-opacity=".4" stroke="none"/>
        </g>`;
    }).join('');

    const text = (y, size, ls, str, op) =>
      `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="${size}" letter-spacing="${ls}" fill="${GOLD}" fill-opacity="${op}">${str}</text>`;

    return veil(`
      <defs>${atmosphereDefs('veilCart')}</defs>
      <g>
        ${fan(cx - w + 4, cy + 6, -1, { len: 108, wid: 16 })}
        ${fan(cx + w - 4, cy + 6, 1, { len: 108, wid: 16 })}
        <path d="${plate(0, 0)}" fill="${GOLD}" fill-opacity=".05"/>
        <path d="${plate(0, 0)}" fill="var(--bg)" fill-opacity=".6" stroke="${GOLD}" stroke-opacity=".55" stroke-width="1.8"/>
        <path d="${plate(12, 12)}" fill="none" stroke="${GOLD}" stroke-opacity=".26"/>
        <path d="${plate(23, 23)}" fill="none" stroke="${GOLD}" stroke-opacity=".16"/>
        <g fill="none" stroke="${GOLD}" stroke-opacity=".18">
          <path d="M${cx - 168} ${cy - 16} L${cx - 128} ${cy + 26} L${cx - 150} ${cy + 74}"/>
          <path d="M${cx + 150} ${cy + 34} L${cx + 108} ${cy + 66} L${cx + 128} ${cy + 118}"/>
          <path d="M${cx - 44} ${cy - 104} L${cx + 12} ${cy - 72} L${cx - 4} ${cy - 34}"/>
        </g>
        ${(() => {
          const R = rnd(77);
          return Array.from({ length: 26 }, () => {
            const t = R();
            const x = cx - 190 + t * 400;
            const y = cy + 96 + Math.sin(t * 5.2) * 46 + (R() - 0.5) * 34;
            const r = 1.4 + R() * R() * 9;
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${ACC}" fill-opacity="${(0.08 + R() * 0.14).toFixed(2)}"/>`;
          }).join('');
        })()}
        ${medallion(Math.PI * 0.5)}${medallion(Math.PI * 0.78)}${medallion(Math.PI * 0.22)}
        <g stroke="${GOLD}" fill="none">
          <path d="M${cx - 130} ${cy + 138} Q${cx} ${cy + 152} ${cx + 130} ${cy + 138}" stroke-opacity=".42" stroke-width="1.6"/>
          <path d="M${cx - 108} ${cy + 148} Q${cx} ${cy + 161} ${cx + 108} ${cy + 148}" stroke-opacity=".2"/>
          <path d="M${cx} ${cy + 144} l8 10 l-8 10 l-8 -10 Z" fill="${GOLD}" fill-opacity=".34" stroke-opacity=".5"/>
          <circle cx="${cx - 96} " cy="${cy + 166}" r="2.6" fill="${GOLD}" fill-opacity=".35" stroke="none"/>
        </g>
        ${pendants}
        ${text(cy - 44, 20, 9, 'PATH OF', 0.5)}
        ${text(cy + 64, 76, 10, 'EXILE', 0.44)}
        <path d="M${cx + 70} ${cy + 64} Q${cx + 88} ${cy + 52} ${cx + 102} ${cy + 26}"
          fill="none" stroke="${GOLD}" stroke-opacity=".34" stroke-width="2.4"/>
      </g>
      ${atmosphere('veilCart')}`);
  };

  /* 02 — the Lord's Labyrinth: the oval shield with its winged emblem and gem boss, the brass
     scrollwork that frames the trial halls, a maze floor under it. */
  const izaroSvg = () => {
    const cx = 1032;
    const cy = 300;
    const rx = 150;
    const ry = 208;

    const curls = [-1, 1].map((s) => `<g transform="translate(${cx + s * (rx + 44)} ${cy}) scale(${s} 1)"
        fill="none" stroke="${GOLD}" stroke-opacity=".34" stroke-width="1.5">
        <path d="M0 -164 Q-64 -128 -64 -70 Q-64 -18 -8 -14 Q30 -11 30 -46 Q30 -74 -2 -74"/>
        <path d="M6 164 Q-58 128 -58 70 Q-58 22 -6 18 Q30 15 30 46"/>
        <circle cx="-50" cy="-116" r="5.5" stroke-opacity=".26"/>
        <circle cx="-44" cy="110" r="5.5" stroke-opacity=".26"/>
      </g>`).join('');

    const maze = (() => {
      const out = [];
      for (let i = 0; i < 10; i++) {
        const x = 600 + i * 66;
        const lift = (i % 3) * 20;
        out.push(`<path d="M${x} 720 L${x} ${612 + lift} L${x + 46} ${612 + lift} L${x + 46} ${674 + ((i + 1) % 3) * 14}"/>`);
      }
      return `<g fill="none" stroke="${GOLD}" stroke-opacity=".22" stroke-width="1.2">${out.join('')}</g>`;
    })();

    return veil(`
      <defs>${fadeMask('veilIzar', 0.26, 0.72)}${atmosphereDefs('veilIzar')}</defs>
      <g mask="url(#veilIzar-m)">
        ${maze}
        ${curls}
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="var(--bg)" fill-opacity=".7" stroke="${GOLD}" stroke-opacity=".55" stroke-width="2"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${GOLD}" fill-opacity=".045"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx - 15}" ry="${ry - 15}" fill="none" stroke="${GOLD}" stroke-opacity=".28"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${rx - 28}" ry="${ry - 28}" fill="none" stroke="${GOLD}" stroke-opacity=".14"/>
        ${fan(cx - 18, cy - 6, -1, { len: 104, wid: 15, count: 5 })}
        ${fan(cx + 18, cy - 6, 1, { len: 104, wid: 15, count: 5 })}
        <path d="M${cx} ${cy - 118} L${cx} ${cy + 128}" stroke="${GOLD}" stroke-opacity=".34" stroke-width="1.4"/>
        <path d="M${cx - 54} ${cy + 56} Q${cx} ${cy - 46} ${cx + 54} ${cy + 56}" fill="none" stroke="${GOLD}" stroke-opacity=".3"/>
        <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="${GOLD}" stroke-opacity=".6" stroke-width="1.8"/>
        <circle cx="${cx}" cy="${cy}" r="21" fill="none" stroke="${GOLD}" stroke-opacity=".34"/>
        <circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${ACC}" stroke-opacity=".2" stroke-width="8"/>
        <circle cx="${cx}" cy="${cy}" r="14" fill="${ACC}" fill-opacity=".72"/>
        <circle cx="${cx}" cy="${cy}" r="7" fill="${GOLD}" fill-opacity=".35"/>
        ${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${cx} ${cy + 22}) rotate(${90 + (i - 2) * 15})">
            <path d="${feather(62 - Math.abs(i - 2) * 10, 12, 1)}" fill="${GOLD}" fill-opacity="${(0.24 - Math.abs(i - 2) * 0.035).toFixed(2)}"/>
          </g>`).join('')}
        <g stroke="${GOLD}" stroke-opacity=".44" fill="none">
          <path d="M${cx - 33} ${cy - 63} L${cx - 33} ${cy - 75} L${cx + 33} ${cy - 75} L${cx + 33} ${cy - 63} Z" fill="${GOLD}" fill-opacity=".1"/>
          <path d="M${cx - 33} ${cy - 71} L${cx + 33} ${cy - 71}" stroke-opacity=".24"/>
          <path d="M${cx - 30} ${cy - 75} L${cx - 23} ${cy - 99} L${cx - 12} ${cy - 81} L${cx} ${cy - 106}
                   L${cx + 12} ${cy - 81} L${cx + 23} ${cy - 99} L${cx + 30} ${cy - 75}"/>
        </g>
        <g fill="${GOLD}" fill-opacity=".5">
          <circle cx="${cx - 22}" cy="${cy - 99}" r="2.4"/><circle cx="${cx}" cy="${cy - 105}" r="2.8"/>
          <circle cx="${cx + 22}" cy="${cy - 99}" r="2.4"/><circle cx="${cx}" cy="${cy - 69}" r="2.6" fill="${ACC}" fill-opacity=".7"/>
        </g>
      </g>
      ${atmosphere('veilIzar')}`);
  };

  /* 03 — the Sacred Grove: the ring and its paving, the branch arch and its lanterns, the heart
     tree, and the three seed colours of the league as the accent, the notable and the modifier. */
  const groveSvg = () => {
    const cx = 966;
    const cy = 368;
    const R = 250;
    const paving = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2;
      const r1 = i % 2 ? 88 : 138;
      return `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1 * 0.84).toFixed(1)}"
        x2="${(cx + Math.cos(a) * R).toFixed(1)}" y2="${(cy + Math.sin(a) * R * 0.84).toFixed(1)}"/>`;
    }).join('');

    const lantern = (x, y) => `
      <g stroke="${GOLD}" stroke-opacity=".5" fill="none">
        <line x1="${x}" y1="${y - 30}" x2="${x}" y2="${y - 11}"/>
        <path d="M${x - 6} ${y - 11} L${x + 6} ${y - 11} L${x + 4.4} ${y + 6} L${x - 4.4} ${y + 6} Z" fill="${NOTE}" fill-opacity=".3"/>
        <circle cx="${x}" cy="${y - 2}" r="15" fill="${NOTE}" fill-opacity=".1" stroke="none"/>
      </g>`;

    const bed = (x, y, colour, n = 10) => {
      const R2 = rnd(x + y);
      const dots = Array.from({ length: n }, () => {
        const a = R2() * Math.PI * 2;
        const d = R2() * 32;
        return `<circle cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(y + Math.sin(a) * d * 0.72).toFixed(1)}" r="${(1.8 + R2() * 3).toFixed(1)}" fill="${colour}" fill-opacity=".68"/>`;
      }).join('');
      return `<g>${dots}<circle cx="${x}" cy="${y}" r="44" fill="${colour}" fill-opacity=".07"/></g>`;
    };

    /* the heart: a trunk and three canopy lobes, under everything else */
    const heart = `
      <circle cx="${cx}" cy="${cy - 42}" r="62" fill="${NOTE}" fill-opacity=".05"/>
      <g stroke="${GOLD}" stroke-opacity=".36" fill="none">
        <path d="M${cx} ${cy + 70} C${cx - 4} ${cy + 28} ${cx + 5} ${cy - 2} ${cx} ${cy - 28}
                 M${cx + 1} ${cy + 18} C${cx - 16} ${cy - 4} ${cx - 26} ${cy - 22} ${cx - 31} ${cy - 42}
                 M${cx + 1} ${cy + 6} C${cx + 18} ${cy - 14} ${cx + 27} ${cy - 32} ${cx + 32} ${cy - 48}"
              stroke-width="1.8"/>
        <circle cx="${cx}" cy="${cy - 62}" r="27"/>
        <circle cx="${cx - 29}" cy="${cy - 42}" r="19"/>
        <circle cx="${cx + 31}" cy="${cy - 46}" r="20"/>
        <circle cx="${cx - 12}" cy="${cy - 82}" r="15"/>
        <circle cx="${cx + 15}" cy="${cy - 80}" r="14"/>
      </g>`;

    /* a cubic that springs off the ring on the left and lands on it again on the right */
    const p0 = [cx - 236, cy + 62];
    const p1 = [cx - 168, cy - 250];
    const p2 = [cx + 118, cy - 268];
    const p3 = [cx + 242, cy + 46];
    const cub = (t) => {
      const u = 1 - t;
      return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
    };
    const archHang = [0.2, 0.36, 0.52, 0.68, 0.84].map((t) => {
      const [x, y] = cub(t);
      return `<g stroke="${GOLD}" stroke-opacity=".4" fill="none">
          <line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y + 26).toFixed(1)}"/>
          <path d="M${(x - 5.5).toFixed(1)} ${(y + 26).toFixed(1)} L${(x + 5.5).toFixed(1)} ${(y + 26).toFixed(1)}
                   L${(x + 4).toFixed(1)} ${(y + 42).toFixed(1)} L${(x - 4).toFixed(1)} ${(y + 42).toFixed(1)} Z"
                fill="${NOTE}" fill-opacity=".26"/>
          <circle cx="${x.toFixed(1)}" cy="${(y + 34).toFixed(1)}" r="16" fill="${NOTE}" fill-opacity=".09" stroke="none"/>
        </g>`;
    }).join('');
    const arch = `
      <path d="M${p0[0]} ${p0[1]} C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}"
        fill="none" stroke="${GOLD}" stroke-opacity=".46" stroke-width="2.4"/>
      <path d="M${cub(0.12)[0].toFixed(1)} ${cub(0.12)[1].toFixed(1)} q-26 -18 -34 -44
               M${cub(0.46)[0].toFixed(1)} ${cub(0.46)[1].toFixed(1)} q14 -24 -4 -40
               M${cub(0.78)[0].toFixed(1)} ${cub(0.78)[1].toFixed(1)} q24 -16 27 -38"
        fill="none" stroke="${GOLD}" stroke-opacity=".26"/>`;

    return veil(`
      <defs>${fadeMask('veilGrove', 0.22, 0.72)}${atmosphereDefs('veilGrove')}</defs>
      <g mask="url(#veilGrove-m)">
        ${arch}
        <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R * 0.84}" fill="none" stroke="${GOLD}" stroke-opacity=".4" stroke-width="1.8"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${R - 20}" ry="${(R - 20) * 0.84}" fill="none" stroke="${GOLD}" stroke-opacity=".2"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${88}" ry="${88 * 0.84}" fill="none" stroke="${GOLD}" stroke-opacity=".24" stroke-dasharray="2 8"/>
        <g stroke="${GOLD}" stroke-opacity=".16">${paving}</g>
        ${heart}
        ${bed(cx - 132, cy + 40, ACC)}${bed(cx + 104, cy - 46, NOTE)}${bed(cx + 44, cy + 118, MOD)}
        ${archHang}
      </g>
      ${atmosphere('veilGrove')}`);
  };

  /* 04 — Einhar's cages: three of them with the scroll top and a hook, a net across the corner,
     paw prints crossing the floor and the capture tally scratched beside them. */
  const bestiarySvg = () => {
    const cage = (x, y, w, h) => {
      const bars = Array.from({ length: 7 }, (_, i) =>
        `<line x1="${(x + 12 + (i * (w - 24)) / 6).toFixed(1)}" y1="${y + 30}" x2="${(x + 12 + (i * (w - 24)) / 6).toFixed(1)}" y2="${y + h - 12}"/>`).join('');
      return `<g fill="none" stroke="${GOLD}" stroke-opacity=".42">
          <path d="M${x} ${y + h} L${x} ${y + 32} Q${x + w / 2} ${y - 24} ${x + w} ${y + 32} L${x + w} ${y + h}"/>
          <path d="M${x + 7} ${y + h - 4} L${x + 7} ${y + 36} Q${x + w / 2} ${y - 12} ${x + w - 7} ${y + 36} L${x + w - 7} ${y + h - 4}" stroke-opacity=".18"/>
          <line x1="${x - 12}" y1="${y + h}" x2="${x + w + 12}" y2="${y + h}" stroke-opacity=".5"/>
          ${bars}
          <path d="M${x + 4} ${y + 32} Q${x - 14} ${y + 20} ${x - 6} ${y + 6}" stroke-opacity=".26"/>
          <path d="M${x + w - 4} ${y + 32} Q${x + w + 14} ${y + 20} ${x + w + 6} ${y + 6}" stroke-opacity=".26"/>
          <circle cx="${x + w / 2}" cy="${y - 6}" r="4.6" stroke-opacity=".5"/>
          <line x1="${x + w / 2}" y1="${y - 10}" x2="${x + w / 2}" y2="${y - 30}" stroke-opacity=".3"/>
        </g>`;
    };
    const paw = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="${GOLD}" fill-opacity=".32">
        <ellipse cx="0" cy="6" rx="9" ry="7"/>
        <ellipse cx="-8.4" cy="-8" rx="3.6" ry="5"/><ellipse cx="-3" cy="-12.4" rx="3.4" ry="5.2"/>
        <ellipse cx="3" cy="-12.4" rx="3.4" ry="5.2"/><ellipse cx="8.4" cy="-8" rx="3.6" ry="5"/>
      </g>`;
    const skull = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" fill="none"
        stroke="${GOLD}" stroke-opacity=".34" stroke-width="1.6">
        <path d="M-17 2 Q-19 -19 0 -20 Q19 -19 17 2 Q16 12 12 15 L12 22 L4 22 L4 15 L-4 15 L-4 22 L-12 22 L-12 15 Q-16 12 -17 2 Z"/>
        <ellipse cx="-6.4" cy="-4" rx="4.6" ry="5.4" fill="${GOLD}" fill-opacity=".26" stroke="none"/>
        <ellipse cx="6.4" cy="-4" rx="4.6" ry="5.4" fill="${GOLD}" fill-opacity=".26" stroke="none"/>
        <path d="M0 6 l-2.6 5 l5.2 0 Z" fill="${GOLD}" fill-opacity=".26" stroke="none"/>
        <path d="M-8 -14 Q-11 -18 -14 -17 M8 -14 Q11 -18 14 -17" stroke-opacity=".22"/>
      </g>`;
    const bone = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"
        stroke="${GOLD}" stroke-opacity=".34" stroke-width="1.6" fill="none" stroke-linecap="round">
        <path d="M-20 0 L20 0" stroke-width="3.4"/>
        <circle cx="-23" cy="-3.6" r="4.4"/><circle cx="-23" cy="3.6" r="4.4"/>
        <circle cx="23" cy="-3.6" r="4.4"/><circle cx="23" cy="3.6" r="4.4"/>
      </g>`;
    const lamp = `<g stroke="${GOLD}" stroke-opacity=".4" fill="none">
        <line x1="1000" y1="196" x2="1000" y2="236"/>
        <path d="M992 236 L1008 236 L1005 258 L995 258 Z" fill="${NOTE}" fill-opacity=".3"/>
        <circle cx="1000" cy="247" r="19" fill="${NOTE}" fill-opacity=".08" stroke="none"/>
      </g>`;
    const net = (() => {
      const lines = [];
      for (let i = 0; i < 12; i++) {
        lines.push(`<line x1="${660 + i * 54}" y1="24" x2="${660 + i * 54 - 250}" y2="248"/>`);
        lines.push(`<line x1="${660 + i * 54 - 250}" y1="24" x2="${660 + i * 54}" y2="248"/>`);
      }
      return `<g stroke="${GOLD}" stroke-opacity=".13" stroke-width="1">${lines.join('')}</g>`;
    })();
    const tally = Array.from({ length: 2 }, (_, g) => {
      const x = 982 + g * 74;
      const y = 500;
      return `<g stroke="${GOLD}" stroke-opacity=".4" stroke-width="1.3">
          ${[0, 1, 2, 3].map((i) => `<line x1="${x + i * 7}" y1="${y}" x2="${x + i * 7}" y2="${y + 26}"/>`).join('')}
          <line x1="${x - 5}" y1="${y + 31}" x2="${x + 33}" y2="${y - 5}"/>
        </g>`;
    }).join('');

    return veil(`
      <defs>${fadeMask('veilEinh', 0.24, 0.7)}${atmosphereDefs('veilEinh')}</defs>
      <g mask="url(#veilEinh-m)">
        ${net}
        ${cage(972, 166, 104, 258)}${cage(1096, 140, 104, 284)}${cage(872, 202, 84, 222)}
        ${paw(724, 636, 1.9, 12)}${paw(838, 570, 1.5, -8)}${paw(930, 646, 2.1, 20)}
        ${paw(668, 540, 1.4, -18)}${paw(1046, 616, 1.8, 6)}
        ${paw(596, 634, 1.6, -6)}${paw(1166, 588, 1.3, 24)}
        ${skull(818, 596, 1.5, -12)}${bone(924, 556, 1.6, 26)}${lamp}
        ${tally}
      </g>
      ${atmosphere('veilEinh')}`);
  };

  /* ── kept from the second pass ─────────────────────────────────────────────── */

  const pnode = (x, y, r, opts = {}) => {
    const bright = !!opts.bright;
    const glyph = opts.glyph === false ? '' : `<path d="M0 ${(-r * 0.44).toFixed(1)} L${(r * 0.38).toFixed(1)} 0 L0 ${(r * 0.44).toFixed(1)} L${(-r * 0.38).toFixed(1)} 0 Z" fill="${GOLD}" fill-opacity="${bright ? 0.62 : 0.3}"/>`;
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
        <circle r="${r}" fill="var(--bg)" fill-opacity=".8" stroke="${GOLD}" stroke-opacity="${bright ? 0.8 : 0.44}" stroke-width="${bright ? 1.6 : 1.1}"/>
        <circle r="${(r * 0.67).toFixed(1)}" fill="none" stroke="${GOLD}" stroke-opacity="${bright ? 0.46 : 0.22}" stroke-width=".8"/>
        ${glyph}
      </g>`;
  };

  /* a link that sags like the game's: quadratic, bowed off the straight line */
  const curve = (a, b, bow = 0.12) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const mx = (a[0] + b[0]) / 2 - dy * bow;
    const my = (a[1] + b[1]) / 2 + dx * bow;
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  };

  /* 06 — the tree the way the game draws it: notables with a minor cluster around each, clusters
     chained together through a waypoint node, every link bowed, every disc rimmed in bronze. */
  const treeGameSvg = () => {
    const R = rnd(137);
    const centres = [[962, 138], [858, 274], [1104, 300], [992, 424], [1178, 520], [872, 566], [1218, 190]];
    const nodes = [];
    const links = [];
    centres.forEach(([cx, cy]) => {
      const count = 4 + Math.floor(R() * 3);
      const base = R() * Math.PI * 2;
      const minors = [];
      nodes.push([cx, cy, 11.8, true]);
      for (let i = 0; i < count; i++) {
        const a = base + (i / count) * Math.PI * 2 + (R() - 0.5) * 0.3;
        const d = 36 + R() * 20;
        const p = [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.92];
        minors.push(p);
        nodes.push([p[0], p[1], 6.2 + R() * 1.6, false]);
        links.push([[cx, cy], p, (R() - 0.5) * 0.32]);
      }
      for (let i = 0; i < minors.length; i++) {
        links.push([minors[i], minors[(i + 1) % minors.length], 0.08 + R() * 0.12]);
      }
    });
    for (let i = 0; i < centres.length - 1; i++) {
      const a = centres[i];
      const b = centres[i + 1];
      const mid = [(a[0] + b[0]) / 2 + (R() - 0.5) * 34, (a[1] + b[1]) / 2 + (R() - 0.5) * 34];
      nodes.push([mid[0], mid[1], 5.4, false]);
      links.push([a, mid, (R() - 0.5) * 0.3], [mid, b, (R() - 0.5) * 0.3]);
    }

    const paths = links.map(([a, b, bow]) => `<path d="${curve(a, b, bow)}"/>`).join('');
    const discs = nodes.map(([x, y, r, bright]) => pnode(x, y, r, { bright })).join('');

    return veil(`
      <defs>${fadeMask('veilTree3', 0.3, 0.8)}${atmosphereDefs('veilTree3')}</defs>
      <g mask="url(#veilTree3-m)">
        <g fill="none" stroke="${GOLD}" stroke-opacity=".26" stroke-width=".9">${paths}</g>
        ${discs}
      </g>
      ${atmosphere('veilTree3')}`);
  };

  /* 07 — the game's window chrome rather than its art: double bronze hairline, a scrollwork
     bracket in each corner, a crest at the top, diamond studs down the edges, grain over it all. */
  const filigreeSvg = () => {
    const corner = (x, y, sx, sy) => `
      <g transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="${GOLD}" stroke-linecap="round">
        <path d="M2 46 L2 2 L46 2" stroke-opacity=".42" stroke-width="1.3"/>
        <path d="M9 9 Q9 27 27 27 Q9 27 9 41" stroke-opacity=".2"/>
        <path d="M9 9 Q27 9 27 27 Q27 9 41 9" stroke-opacity=".2"/>
        <path d="M17 17 L25 25 M25 17 L17 25" stroke-opacity=".13" stroke-width=".9"/>
        <path d="M2 64 L2 54 M64 2 L54 2" stroke-opacity=".26" stroke-width="1.1"/>
      </g>`;
    const stud = (x, y) => `<path d="M${x} ${y - 3.6} L${x + 3.6} ${y} L${x} ${y + 3.6} L${x - 3.6} ${y} Z" fill="${GOLD}" fill-opacity=".26"/>`;
    const studs = [320, 640, 960].flatMap((x) => [stud(x, 13), stud(x, 707)])
      .concat([200, 480, 760].flatMap((y) => [stud(13, y), stud(1267, y)])).join('');
    const crest = `
      <g transform="translate(640 0)" fill="none" stroke="${GOLD}" stroke-linecap="round">
        <path d="M-52 10 Q-52 27 -34 27 Q-16 27 -16 10" stroke-opacity=".2"/>
        <path d="M52 10 Q52 27 34 27 Q16 27 16 10" stroke-opacity=".2"/>
        <path d="M-16 10 L0 27 L16 10" stroke-opacity=".34" stroke-width="1.2"/>
        <path d="M0 27 L0 40" stroke-opacity=".22"/>
        <path d="M-9 40 L9 40" stroke-opacity=".22"/>
      </g>`;
    return veil(`
      <defs>${atmosphereDefs('veilFil')}</defs>
      <rect x="9" y="9" width="1262" height="702" fill="none" stroke="${GOLD}" stroke-opacity=".3" stroke-width="1.2"/>
      <rect x="17" y="17" width="1246" height="686" fill="none" stroke="${GOLD}" stroke-opacity=".13"/>
      ${corner(9, 9, 1, 1)}${corner(1271, 9, -1, 1)}${corner(9, 711, 1, -1)}${corner(1271, 711, -1, -1)}
      ${studs}${crest}
      ${atmosphere('veilFil')}`);
  };

  /* 08 — a jewel socket the size of the frame: bronze ring, claw prongs, tick collar, and the
     real cluster-jewel art sitting in the cup. */
  const socketSvg = () => {
    const cx = 1012;
    const cy = 334;
    const claw = (a) => {
      const p = (r, off) => `${(cx + Math.cos(a + off) * r).toFixed(1)} ${(cy + Math.sin(a + off) * r).toFixed(1)}`;
      return `<path d="M${p(196, 0)} L${p(238, -0.08)} L${p(238, 0.08)} Z" fill="${GOLD}" fill-opacity=".2" stroke="${GOLD}" stroke-opacity=".4"/>`;
    };
    const claws = [0, 1, 2, 3].map((i) => claw(-Math.PI / 2 + (i * Math.PI) / 2)).join('');
    const ticks = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const r1 = 208;
      const r2 = i % 4 === 0 ? 222 : 216;
      return `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}"/>`;
    }).join('');
    return veil(`
      <defs>${fadeMask('veilSock', 0.3, 0.82)}${atmosphereDefs('veilSock')}</defs>
      <g mask="url(#veilSock-m)">
        <circle cx="${cx}" cy="${cy}" r="196" fill="none" stroke="${GOLD}" stroke-opacity=".38" stroke-width="1.3"/>
        <circle cx="${cx}" cy="${cy}" r="186" fill="none" stroke="${GOLD}" stroke-opacity=".15"/>
        <circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="${GOLD}" stroke-opacity=".2" stroke-dasharray="1 9"/>
        <g stroke="${GOLD}" stroke-opacity=".24">${ticks}</g>
        ${claws}
        <image href="../assets/cluster_large.png" x="${cx - 96}" y="${cy - 96}" width="192" height="192" opacity=".22" preserveAspectRatio="xMidYMid meet"/>
        <circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="${GOLD}" stroke-opacity=".5" stroke-width="1.2"/>
      </g>
      ${atmosphere('veilSock')}`);
  };

  /* ── the directions ───────────────────────────────────────────────────────── */

  const DIRECTIONS = [
    {
      id: 'bg-cartouche', group: 'From the game', name: 'The logo', tag: 'cartouche',
      note: 'The title cartouche, drawn to its actual parts: a domed shield, three bust medallions on the rim, five feathers fanning off each side, an engraved rule with its diamond under the title and the five pendants that hang beneath. The wordmark is set in gold rather than knocked out white, and the blood on the plate becomes scattered accent droplets.',
      tags: ['cartouche', 'wings', 'wordmark'],
      kind: 'svg', draw: cartoucheSvg,
    },
    {
      id: 'bg-izaro', group: 'From the game', name: 'Izaro', tag: 'the Labyrinth',
      note: 'Emperor Izaro’s shield as it hangs in the Lord’s Labyrinth: the oval crest with the winged emblem, its tail feathers, the crown threaded on the staff above and the gem boss below, framed by the brass scrollwork of the trial halls, over a maze floor. The gem is the only saturated thing in the frame.',
      tags: ['crest', 'crown', 'maze'],
      kind: 'svg', draw: izaroSvg,
    },
    {
      id: 'bg-grove', group: 'From the game', name: 'Sacred Grove', tag: 'Harvest',
      note: 'The grove’s ring, its radial paving, the heart tree standing in the clearing and the branch arch that springs off the ring and lands on it again, lanterns hung along the limb — and the three seed colours the league is built on, primal, vivid and wild, carried as the accent, the notable and the modifier hues.',
      tags: ['ring', 'heart tree', 'three seeds'],
      kind: 'svg', draw: groveSvg,
    },
    {
      id: 'bg-bestiary', group: 'From the game', name: 'Einhar', tag: 'Bestiary',
      note: 'Einhar’s bestiary: three cages with the ornate scroll top and one lantern burning inside them, a net thrown across the corner, paw prints crossing the floor, a skull and a bone left out, and the capture tally scratched beside them. No figure — just the kit he carries.',
      tags: ['cages', 'skull', 'tally'],
      kind: 'svg', draw: bestiarySvg,
    },
    {
      id: 'bg-tree3', group: 'Earlier attempt', name: 'Passive tree', tag: 'clusters + rims',
      note: 'The game’s tree language without a subject: clusters, bowed links, bronze rims, grain. Closest of the earlier pass, and the one to keep if a plain texture is wanted instead of a reference.',
      tags: ['texture', 'clusters'],
      kind: 'svg', draw: treeGameSvg,
    },
    {
      id: 'bg-portrait', group: 'Earlier attempt', name: 'Portrait wash', tag: 'what ships today',
      note: 'The ascendancy portrait at 152 px, scaled to the frame, held at 50 % and buried under the gradient. The baseline.',
      tags: ['jpeg', 'soft', 'baseline'],
      kind: 'portrait',
    },
    {
      id: 'bg-filigree', group: 'Earlier attempt', name: 'Filigree frame', tag: 'window chrome',
      note: 'The game’s window chrome — double hairline, scrollwork corners, crest, studs. Still the cheapest of everything here if a frame is wanted and no subject.',
      tags: ['chrome', 'cheap'],
      kind: 'svg', draw: filigreeSvg,
    },
    {
      id: 'bg-glyph', group: 'Earlier attempt', name: 'Atlas wheel', tag: 'first pass',
      note: 'Concentric rings, 120 ticks, three runes. Kept as the example of the note that started the second pass: it reads as a science-fiction HUD.',
      tags: ['mechanical', 'first pass'],
      kind: 'svg', draw: glyphSvg,
    },
    {
      id: 'bg-socket', group: 'Earlier attempt', name: 'Jewel socket', tag: 'cluster jewel',
      note: 'A socket the size of the frame with the real cluster-jewel art in the cup — on topic, but ornament without a character.',
      tags: ['socket', 'jewel art'],
      kind: 'svg', draw: socketSvg,
    },
  ];
  /* ── build ─────────────────────────────────────────────────────────────────── */

  function section(d, index) {
    const mock = L.atrium();
    const n = String(index + 1).padStart(2, '0');
    return `
      <section class="bg-sec" id="${d.id}">
        <div class="v-head">
          <div class="v-num">${n}</div>
          <div class="v-copy">
            <h2>${d.name} <span class="v-tag">${d.tag}</span></h2>
            <p>${d.note}</p>
            <div class="v-tags">${d.tags.map((t) => `<span>${t}</span>`).join('')}</div>
          </div>
        </div>
        <div class="v-frame" data-bg="${d.kind}"><div class="mock m-atrium t-crimson">${mock}</div></div>
      </section>`;
  }

  /* subtle / medium / strong: the veil has to lose to the text, this is where to prove it */
  function wireStrength() {
    const bar = document.querySelector('.bg-controls');
    if (!bar) return;
    bar.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-strength]');
      if (!btn) return;
      document.body.dataset.strength = btn.dataset.strength;
      [...bar.querySelectorAll('[data-strength]')].forEach((b) => b.classList.toggle('on', b === btn));
    });
  }

  function paint() {
    const list = document.getElementById('bgList');
    let group = null;
    list.innerHTML = DIRECTIONS.map((d, i) => {
      const head = d.group !== group ? `<p class="bg-group">${d.group}</p>` : '';
      group = d.group;
      return head + section(d, i);
    }).join('');

    /* swap the portrait for the drawing the direction asks for */
    [...list.querySelectorAll('.bg-sec')].forEach((sec) => {
      const d = DIRECTIONS.find((x) => x.id === sec.id);
      const mock = sec.querySelector('.mock');
      if (d.kind === 'svg') {
        const img = mock.querySelector('.a-backdrop');
        if (img) img.remove();
        const shade = mock.querySelector('.a-shade');
        if (shade) shade.insertAdjacentHTML('afterend', d.draw());
      }
      wireMock(mock);
    });

    fitFrames();
    wireStrength();
  }

  paint();
  window.addEventListener('resize', () => fitFrames());

})();
