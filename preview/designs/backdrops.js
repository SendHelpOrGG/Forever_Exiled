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
      id: 'bg-art-colossus', group: 'Actual art', name: 'The colossus', tag: 'key art, full bleed', kind: 'photo',
      cls: 'is-bleed', file: 'bleed_colossus.jpg',
      note: 'Official key art, recut to 16:9 so the demon’s crossed head lands in the open band beside the title — clear of the cards and clear of the panel. Desaturated, tinted to the accent, and masked with a soft core out to a 30 % floor, so the painting is present across the whole frame and strong exactly where nothing is written.',
      tags: ['key art', 'subject in the clear', 'duotone'],
    },
    {
      id: 'bg-art-heroine', group: 'Actual art', name: 'The heroine', tag: 'loading screen', kind: 'photo',
      cls: 'is-bleed is-heroine', file: 'bleed_heroine.jpg',
      note: 'A Path of Exile 2 loading screen, cropped to a bust and parked in the same open band. The cape runs off the right edge under the panel, which is where a background detail should go: behind glass, doing atmosphere, not asking to be read.',
      tags: ['loading screen', 'bust', 'cropped'],
    },
    {
      id: 'bg-art-logo', group: 'Actual art', name: 'The logo', tag: 'the real asset', kind: 'photo',
      cls: 'is-logo', file: 'logo_real.png',
      note: 'The actual wordmark — painted plate, three bust medallions, blades, laurel, blood on the vellum — with its checkerboard background keyed to real alpha and sat in the open band at 330 px. Unfiltered, unmasked, at 0.5× its own resolution. Nothing here is drawn.',
      tags: ['wordmark', 'unfiltered', 'keyed'],
    },
    {
      id: 'bg-art-izaro', group: 'Actual art', name: 'Izaro', tag: 'the Labyrinth', kind: 'photo',
      cls: 'is-patch', file: 'patch_izaro.jpg',
      note: 'Emperor Izaro — skull, burning crown, cloak, the ribcage strapped to the breastplate — cropped to a vignette and stood in the clear band beside the title. The painting is green and green is not allowed, so it goes all the way to grey, which also makes the armour read as brass.',
      tags: ['Izaro', 'vignette', 'grayscale'],
    },
    {
      id: 'bg-art-figure', group: 'Actual art', name: 'The dark figure', tag: 'character plate', kind: 'photo',
      cls: 'is-patch is-figure', file: 'patch_figure.jpg',
      note: 'A near-black character plate, mirrored so the figure turns into the layout, lifted until she reads and then vignetted so the ground just falls away into the field. The quietest of the patches.',
      tags: ['silhouette', 'lifted', 'vignette'],
    },
    {
      id: 'bg-art-beast', group: 'Actual art', name: 'The beast', tag: 'key art', kind: 'photo',
      cls: 'is-bleed is-beast', file: 'bleed_beast.jpg',
      note: 'The second key art, cut around the horns and the spiral emblems and pushed further down than the colossus — this one is nearly monochrome before the palette even touches it, so it survives the heaviest tint of the set.',
      tags: ['key art', 'monochrome', 'heavy tint'],
    },
    {
      id: 'bg-art-quiet', group: 'Actual art', name: 'The quiet field', tag: 'environment', kind: 'photo',
      cls: 'is-bleed is-quiet', file: 'bleed_graveyard.jpg',
      note: 'An environment plate — the cemetery at dusk, statues and iron — the calmest of the seven: heavy desaturation, low brightness, a light tint. The one I would actually ship, because nothing in it competes with a number.',
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
