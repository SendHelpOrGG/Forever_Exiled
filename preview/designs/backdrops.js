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

  /* ── the game's own language ──────────────────────────────────────────────── */

  /* The first pass drew geometry: even rings, ticks, uniform dots. PoE does not look like that.
     Its passive tree is clusters of small round nodes with bronze rims joined by gently bowed
     links, sitting on a vignetted near-black field with grain over it. Everything below is built
     from those three things — clusters, bows, rims — plus the vignette and the grain. */

  const GOLD = 'var(--gold)';

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

  /* the ground the game sits on: vignette in the field colour, plus film grain */
  const atmosphereDefs = (id) => `
      <radialGradient id="${id}-vig" cx=".63" cy=".26" r=".82">
        <stop offset=".28" style="stop-color:var(--bg);stop-opacity:0"/>
        <stop offset="1" style="stop-color:var(--bg);stop-opacity:.94"/>
      </radialGradient>
      <filter id="${id}-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>`;

  const atmosphere = (id) => `
      <rect width="1280" height="720" fill="url(#${id}-vig)"/>
      <rect width="1280" height="720" filter="url(#${id}-grain)" opacity=".09"/>`;

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

  /* 09 — the Atlas: constellations, not a grid. Stars, a few bronze nodes, bowed links and a
     soft nebula under it all. */
  const atlasSvg = () => {
    const R = rnd(4242);
    const pts = Array.from({ length: 15 }, () => [720 + R() * 520, 40 + R() * 640]);
    const links = [];
    pts.forEach((p, i) => {
      const near = pts
        .filter((q) => q !== p)
        .map((q) => [q, (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2])
        .sort((a, b) => a[1] - b[1])
        .slice(0, i % 2 ? 2 : 3);
      near.forEach(([q]) => links.push([p, q, (R() - 0.5) * 0.22]));
    });
    const paths = links.map(([a, b, bow]) => `<path d="${curve(a, b, bow)}"/>`).join('');
    const bodies = pts.map(([x, y], i) => {
      const stars = Array.from({ length: 3 }, () => {
        const a = R() * Math.PI * 2;
        const d = 16 + R() * 16;
        return `<circle cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(y + Math.sin(a) * d).toFixed(1)}" r="${(0.9 + R() * 0.9).toFixed(1)}" fill="${GOLD}" fill-opacity=".3"/>`;
      }).join('');
      return i % 3 === 0 ? pnode(x, y, 7.4, { bright: i % 6 === 0 }) + stars : stars + pnode(x, y, 4.4, { glyph: false });
    }).join('');

    return veil(`
      <defs>${fadeMask('veilAtlas', 0.28, 0.8)}${atmosphereDefs('veilAtlas')}
        <radialGradient id="veilAtlas-neb" cx=".72" cy=".34" r=".6">
          <stop offset="0" style="stop-color:var(--accent);stop-opacity:.14"/>
          <stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/>
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#veilAtlas-neb)"/>
      <g mask="url(#veilAtlas-m)">
        <g fill="none" stroke="${GOLD}" stroke-opacity=".2" stroke-width=".85">${paths}</g>
        ${bodies}
      </g>
      ${atmosphere('veilAtlas')}`);
  };

  /* ── the directions ───────────────────────────────────────────────────────── */

  const DIRECTIONS = [
    {
      id: 'bg-tree3', group: 'Closer to the game', name: 'Passive tree', tag: 'clusters + bronze rims',
      note: 'Redrawn from the game rather than from geometry: notables with a cluster of minor nodes around each, the clusters chained through waypoint nodes, every link bowed instead of straight, every disc a dark cup with a bronze rim and a glyph. Vignette and film grain on top, which is half of why PoE looks like PoE.',
      tags: ['clusters', 'bowed links', 'grain'],
      kind: 'svg', draw: treeGameSvg,
    },
    {
      id: 'bg-filigree', group: 'Closer to the game', name: 'Filigree frame', tag: 'window chrome',
      note: 'The game’s frame language instead of its art: double bronze hairline, a scrollwork bracket in each corner, a crest at the top and diamond studs down the edges, with grain over the field. The content stops floating and starts sitting in a window.',
      tags: ['window chrome', 'corners', 'cheap'],
      kind: 'svg', draw: filigreeSvg,
    },
    {
      id: 'bg-socket', group: 'Closer to the game', name: 'Jewel socket', tag: 'cluster jewel',
      note: 'A jewel socket the size of the frame: bronze ring, four claw prongs, a tick collar, and the real cluster-jewel art sitting in the cup. Half artwork, half product — the socket is what the whole screen is about.',
      tags: ['socket', 'jewel art', 'on-topic'],
      kind: 'svg', draw: socketSvg,
    },
    {
      id: 'bg-atlas', group: 'Closer to the game', name: 'Atlas', tag: 'constellation',
      note: 'Constellations rather than a wheel: fifteen star groups joined by bowed links, a few bronze nodes, a nebula in the accent under it. The one that says “endgame map” without drawing a single UI element.',
      tags: ['constellation', 'nebula', 'quiet'],
      kind: 'svg', draw: atlasSvg,
    },
    {
      id: 'bg-portrait', group: 'Earlier attempt', name: 'Portrait wash', tag: 'what ships today',
      note: 'The ascendancy portrait at 152 px, scaled to the frame, held at 50 % and buried under the gradient. It is atmosphere and it is soft — this is the baseline, not a proposal.',
      tags: ['jpeg', 'soft', 'baseline'],
      kind: 'portrait',
    },
    {
      id: 'bg-tree', group: 'Earlier attempt', name: 'Rings of nodes', tag: 'first pass',
      note: 'The first attempt: five even rings of dots around a socket, straight links, one allocated path lit. Read as a diagram, not as the game — kept here only so the difference is visible.',
      tags: ['geometric', 'first pass'],
      kind: 'svg', draw: treeSvg,
    },
    {
      id: 'bg-cluster', group: 'Earlier attempt', name: 'Cluster wheel', tag: 'first pass',
      note: 'Dashed rings and sockets around the jewel art: on topic, but drawn as a schematic. The socket in 04 is the same idea with the game’s ornament instead of ours.',
      tags: ['schematic', 'first pass'],
      kind: 'svg', draw: clusterSvg,
    },
    {
      id: 'bg-glyph', group: 'Earlier attempt', name: 'Atlas wheel', tag: 'first pass',
      note: 'Concentric rings, 120 ticks, three runes. It reads as an astrolabe from a science-fiction HUD, which is exactly the note that made this pass happen.',
      tags: ['mechanical', 'first pass'],
      kind: 'svg', draw: glyphSvg,
    },
    {
      id: 'bg-combo', group: 'Earlier attempt', name: 'Tree + socket', tag: 'first pass',
      note: 'The rings and the jewel fused at the centre. Superseded by the passive tree and the socket above, which do the same two ideas properly.',
      tags: ['fused', 'first pass'],
      kind: 'svg', draw: comboSvg,
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
