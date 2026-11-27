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
      <g stroke="var(--line2)" stroke-width=".9" opacity=".5">${edges}</g>
      <g fill="var(--line2)" opacity=".72">${dots}</g>
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
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke-width="1.2" stroke-dasharray="2 8" stroke="var(--line2)"/>
      <circle cx="${cx}" cy="${cy}" r="${R * 0.62}" fill="none" stroke-width="1" stroke-dasharray="4 11" stroke="var(--line2)" opacity=".8"/>
      <circle cx="${cx}" cy="${cy}" r="${R * 0.3}" fill="none" stroke-width="1" stroke="var(--line2)" opacity=".55"/>
      <g stroke="var(--line2)" stroke-width=".8" opacity=".45">${spokes.join('')}</g>
      <g fill="var(--line2)" stroke="var(--line2)" stroke-width=".9" opacity=".8">${dots.join('')}</g>
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
        <circle cx="${cx}" cy="${cy}" r="330" fill="none" stroke="var(--line2)" stroke-width="1.1"/>
        <g stroke="var(--line2)" stroke-width=".8" opacity=".6">${ticks.join('')}</g>
      </g>
      <circle cx="${cx}" cy="${cy}" r="252" fill="none" stroke="var(--line2)" stroke-width="1.1" stroke-dasharray="6 10"/>
      <circle cx="${cx}" cy="${cy}" r="176" fill="none" stroke="var(--line2)" stroke-width="1" opacity=".7"/>
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
      <circle cx="${cx}" cy="${cy}" r="96" fill="none" stroke="var(--line2)" stroke-width="1" stroke-dasharray="2 7" opacity=".8"/>
      <image href="../assets/cluster_large.png" x="${cx - 54}" y="${cy - 54}" width="108" height="108" opacity=".22" preserveAspectRatio="xMidYMid meet"/>
      <circle cx="${cx}" cy="${cy}" r="26" fill="none" stroke="var(--accent)" stroke-width="1.3" opacity=".8"/>`;
    return veil(inner.replace('<g mask="url(#veilTree-m)">', wheel + `<g mask="url(#veilTree-m)">`));
  }

  /* ── the five directions ───────────────────────────────────────────────────── */

  const DIRECTIONS = [
    {
      id: 'bg-portrait',
      name: 'Portrait wash', tag: 'what ships today',
      note: 'The ascendancy portrait at 152 px, scaled to the frame, held at 50 % and buried under the gradient. It is atmosphere and it is soft — this is the baseline, not a proposal.',
      tags: ['jpeg', 'soft', 'baseline'],
      kind: 'portrait',
    },
    {
      id: 'bg-tree',
      name: 'Passive tree', tag: 'vector',
      note: 'The tree behind everything: five rings of nodes, every link, and one allocated path lit in the accent, starting from a socket. Drawn in SVG from palette tokens, so it is sharp at any size and re-tints with each of the ten palettes.',
      tags: ['svg', 'crisp', 'recognisable'],
      kind: 'svg', draw: treeSvg,
    },
    {
      id: 'bg-cluster',
      name: 'Cluster wheel', tag: 'vector + jewel art',
      note: 'The product itself as the backdrop: the jewel radius as a dashed ring, its sockets and notables around it, and the real cluster-jewel art at the centre. The most on-topic of the five, and the one that reads as a tool rather than a game.',
      tags: ['svg', 'on-topic', 'jewel art'],
      kind: 'svg', draw: clusterSvg,
    },
    {
      id: 'bg-glyph',
      name: 'Atlas wheel', tag: 'vector',
      note: 'Concentric rings, 120 ticks and three runes: the map device read as an astrolabe. The outer ring turns once every seventy seconds unless the system asks for reduced motion. Cold, mechanical, nothing decorative about it.',
      tags: ['svg', 'mechanical', 'slow spin'],
      kind: 'svg', draw: glyphSvg,
    },
    {
      id: 'bg-combo',
      name: 'Tree + socket', tag: 'recommended',
      note: 'The two PoE ideas that actually belong to this screen, fused: the tree, and at its heart the cluster jewel the tree is being planned around. One drawing, one accent, and the jewel art is already in the repo.',
      tags: ['svg', 'product-specific', 'recommended'],
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
    list.innerHTML = DIRECTIONS.map(section).join('');

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
