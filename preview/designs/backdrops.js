'use strict';

/**
 * Background study for Atrium — see backdrops.html.
 *
 * This pass stops drawing Path of Exile and uses it: real key art and the real logo, pulled in as
 * images and graded per palette. Every direction is the same DOM — one `.a-photo` layer holding an
 * <img> and a palette tint — so the only thing that changes between them is framing and crop.
 *
 * Everything lives inside one IIFE on purpose: designs.js is a classic script too, and two classic
 * scripts share one global lexical scope, so redeclaring `L`, `wireMock` or `fitFrames` at this
 * level would kill the page with “Identifier has already been declared”.
 */

(() => {
  'use strict';

  /* ── helpers ───────────────────────────────────────────────────────────────── */

  const { L, wireMock, fitFrames } = window.FE;

  /**
   * One art layer. `cls` decides the framing (full bleed, splash, framed plate, logo); the <i> is
   * the palette tint — it blends `--accent` into the desaturated art with mix-blend-mode: color,
   * so the picture wears the palette instead of fighting it.
   */
  const art = (d) => `<div class="a-photo ${d.cls || ''}" aria-hidden="true">
        <img src="../assets/splash/${d.file}" alt="">
        <i></i>
        <b></b>
      </div>`;

  /* ── the directions ───────────────────────────────────────────────────────── */

  const DIRECTIONS = [
    {
      id: 'bg-art-bleed', group: 'Actual art', name: 'Key art, full bleed', tag: 'the colossus', kind: 'photo',
      cls: 'is-bleed', file: 'splash_colossus.jpg',
      note: 'The real thing: official Path of Exile key art, cover-cropped to the frame, desaturated and tinted to the palette accent, with the bottom third scrimmed back to the field. No drawing and no imitation — the pixels are the game’s. Loudest of the set, and the one that most obviously is not a texture.',
      tags: ['key art', 'cover', 'duotone'],
    },
    {
      id: 'bg-art-splash', group: 'Actual art', name: 'The splash', tag: 'right edge', kind: 'photo',
      cls: 'is-splash', file: 'splash_heroine.jpg',
      note: 'A Path of Exile 2 loading screen — the heroine, the cape, the statue in the arch — held to the right 56 % of the frame and feathered where it meets the type column. The art reads as a splash panel behind the list instead of a wallpaper under the whole thing, and the left side stays pure field and pure type.',
      tags: ['loading screen', 'right 56 %', 'feathered'],
    },
    {
      id: 'bg-art-logo', group: 'Actual art', name: 'The logo', tag: 'the real asset', kind: 'photo',
      cls: 'is-logo', file: 'logo_real.png',
      note: 'The actual wordmark — painted plate, three bust medallions, blades, laurel, the blood on the vellum — background keyed out to real alpha and sat in the corner at 540 px, under 1×, with its own colour left alone. The only direction where nothing is graded at all.',
      tags: ['wordmark', 'unfiltered', 'keyed'],
    },
    {
      id: 'bg-art-izaro', group: 'Actual art', name: 'Izaro', tag: 'the Labyrinth', kind: 'photo',
      cls: 'is-splash is-izaro', file: 'splash_izaro.jpg',
      note: 'Emperor Izaro — skull, burning crown, cloak, the ribcage strapped to the breastplate — cropped to his shoulder at the right edge. The painting is green and green is not allowed in this palette, so it goes all the way to grey; losing the green also makes the armour read as brass.',
      tags: ['Izaro', 'grayscale', 'right edge'],
    },
    {
      id: 'bg-art-figure', group: 'Actual art', name: 'The dark figure', tag: 'near-black plate', kind: 'photo',
      cls: 'is-figure', file: 'splash_figure.jpg',
      note: 'A near-black character plate from the game, mirrored so the figure stands over the panel, and lifted — brightness and contrast up — because the source is 90 % black and would otherwise disappear entirely. Still the calmest of the set.',
      tags: ['silhouette', 'lifted', 'calm'],
    },
    {
      id: 'bg-art-plate', group: 'Actual art', name: 'The plate', tag: 'framed', kind: 'photo',
      cls: 'is-plate', file: 'splash_volcano.jpg',
      note: 'Key art clipped into a rectangle at the right, with an inset shadow and a 1 px gold rule around it — the way the game frames its own splash screens. The sharpest edge of the eight and the most deliberate composition: the art is a panel, not an atmosphere.',
      tags: ['framed', 'hairline', 'clipped'],
    },
    {
      id: 'bg-art-quiet', group: 'Actual art', name: 'The quiet field', tag: 'environment', kind: 'photo',
      cls: 'is-quiet', file: 'splash_graveyard.jpg',
      note: 'An environment plate — the cemetery at dusk, statues and iron — pushed right down: heavy desaturation, low brightness, a light tint. Nothing in it competes with a number, which makes it the safest of the eight to actually ship, and the least of a statement.',
      tags: ['environment', 'low', 'safest'],
    },
    {
      id: 'bg-portrait', group: 'Baseline', name: 'Portrait wash', tag: 'what ships today', kind: 'portrait',
      note: 'The ascendancy portrait at 127–152 px scaled to the frame, held at 50 % and buried under the gradient. Kept as the baseline the seven above are judged against.',
      tags: ['jpeg', 'soft', 'baseline'],
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

  /* subtle / medium / strong: the art has to lose to the text, this is where to prove it */
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

    /* the art goes over the gradient wash, not under it: under it, a 1600 px painting dies at 4 %
       and the whole study looks empty. It carries its own scrim and its own fade instead, and the
       panel (z-index 1) and the layout (z-index 2) still paint above it. */
    [...list.querySelectorAll('.bg-sec')].forEach((sec) => {
      const d = DIRECTIONS.find((x) => x.id === sec.id);
      const mock = sec.querySelector('.mock');
      if (d.kind === 'photo') {
        const img = mock.querySelector('.a-backdrop');
        if (img) img.remove();
        const shade = mock.querySelector('.a-shade');
        if (shade) shade.insertAdjacentHTML('afterend', art(d));
      }
      wireMock(mock);
    });

    fitFrames();
    wireStrength();
  }

  paint();
  window.addEventListener('resize', () => fitFrames());

})();
