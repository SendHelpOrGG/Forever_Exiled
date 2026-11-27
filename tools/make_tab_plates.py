#!/usr/bin/env python3
"""
Build the per-tab plates for the design gallery (preview/designs/).

The gallery's frame gives every destination its own background, and the picture answers to the
tab's name: "Watcher's Eyes" is a unique jewel in Path of Exile, so the plate is that jewel — not a
painting of a monster.

Why the plates are composed rather than cropped. GGG's inventory art tops out at 78 px (jewels,
rings) and 156-300 px (flasks, currency); the frame is 1280 x 720, so thrown up whole it is a blur —
which is exactly what the first version of these plates looked like. So each plate is built like a
photograph of an object in a room:

  1. The field is the gallery's own painting (`bleed_grove.jpg`'s companion `bleed_graveyard.jpg`),
     blurred past legibility and graded to the measured darkness of the painting the frame already
     uses: mean luminance ~34 against 30 for `bleed_grove.jpg`, ~51 in the middle band. It is the
     same night, one room further in — not a lit room of its own. Nothing in it is legible: it is a
     gradient with the painting's texture. A vignette closes the corners to near black.
  2. The artefact is upscaled in two steps (2x, sharpen, then the last resize) instead of one, which
     keeps painted edges from turning to mush; its alpha is thresholded first, because GGG's icons
     carry a near-invisible dark margin that reads as a box once the icon is brightened.
  3. It gets a contact shadow, a soft light under it and a blurred halo of itself, so it sits in
     the field instead of floating in front of it.
  4. The artefact is centred on the point the frame's mask is centred on (52 % / 40 %), which is the
     open band — no card, no panel.

Sizes are chosen per source: never more than about 3x the original, so nothing is soft.

The field is checked against `bleed_grove.jpg` on every build: a plate whose mean luminance drifts
away from the painting the gallery is built around is rejected before it is written, because that is
what made the earlier plates look like grey haze.

Sources are Grinding Gear Games' inventory art (item icons) and the Path of Exile wordmark;
`bleed_graveyard.jpg` is the field. It is a local design proposal, the same standing as the
paintings in assets/splash.

    /path/to/python tools/make_tab_plates.py

Needs Pillow. Writes five 1440 x 810 JPEGs into preview/assets/splash/.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'

W, H = 1440, 810
# where the frame's mask is centred — an artefact anywhere else is a smudge behind the cards
CX, CY = int(W * 0.52), int(H * 0.40)
CORNER = (4, 3, 6)

PLATES = [
    # tab                         source                       height  contrast  brightness
    ('tab_watchers_eye.jpg',      SRC / 'watchers_eye.png',      250,   1.22, 1.44),
    ('tab_rare_items.jpg',        SRC / 'two_stone_ring.webp',  250,   1.14, 1.20),
    ('tab_flasks.jpg',            SRC / 'divine_life_flask.webp', 300, 1.10, 1.20),
    ('tab_economy.jpg',           SRC / 'exalted_orb.png',      300,   1.06, 1.14),
    ('tab_settings.jpg',          SPLASH / 'logo_real.png',     360,   1.00, 0.92),
]


def clean(art, floor=14):
    """GGG's icons carry a near-invisible dark margin; once brightened it reads as a box."""
    art.putalpha(art.split()[3].point(lambda v: 0 if v < floor else v))
    return art


def room():
    """The gallery's night, one room further in — graded to bleed_grove.jpg's measured darkness.

    The field was the thing that went wrong before: a bright blur over a mid grey pool lifted the
    whole 1440 x 810 frame to a mean luminance of ~130, against ~30 for the painting the frame is
    built around, so the plates read as grey haze instead of a dark stage. It is now graded by
    measurement, not by eye: mean ~34, centre ~51 (bleed_grove.jpg: 30 / 52), no full-frame grain,
    corners closed to near black.
    """
    im = Image.open(SPLASH / 'bleed_graveyard.jpg').convert('RGB').resize((W, H), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(34))
    im = ImageEnhance.Brightness(im).enhance(0.40)
    im = ImageEnhance.Color(im).enhance(0.5)

    # a shallow pool of light where the artefact sits, so it is not floating on a flat wall
    pool = Image.new('L', (W, H), 0)
    ImageDraw.Draw(pool).ellipse([CX - 620, CY - 330, CX + 620, CY + 330], fill=255)
    pool = pool.filter(ImageFilter.GaussianBlur(200))
    im = Image.composite(Image.new('RGB', (W, H), (62, 52, 72)), im, pool)

    vignette = Image.new('L', (W, H), 0)
    ImageDraw.Draw(vignette).ellipse([-W * .2, -H * .3, W * 1.2, H * 1.3], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(140))
    return Image.composite(im, Image.new('RGB', (W, H), (9, 7, 12)), vignette)


def upscale(art, height):
    """2x, sharpen, 2x, sharpen… then the last resize: one big jump is what makes icons mush."""
    while art.height < height * 0.55:
        art = art.resize((art.width * 2, art.height * 2), Image.LANCZOS)
        art = art.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    art = art.resize((max(1, round(art.width * height / art.height)), height), Image.LANCZOS)
    return art.filter(ImageFilter.UnsharpMask(radius=1.5, percent=60, threshold=2))


def build(out, src, height, contrast, brightness):
    art = Image.open(src).convert('RGBA')
    art = clean(art)
    art = ImageEnhance.Contrast(art).enhance(contrast)
    art = ImageEnhance.Brightness(art).enhance(brightness)
    hero = upscale(art, height)
    x, y = CX - hero.width // 2, CY - hero.height // 2

    canvas = room()

    light = Image.new('L', (W, H), 0)
    ImageDraw.Draw(light).ellipse(
        [CX - height * 0.75, CY + height * 0.42, CX + height * 0.75, CY + height * 0.78], fill=70)
    light = light.filter(ImageFilter.GaussianBlur(height * 0.18))
    canvas = Image.composite(Image.new('RGB', (W, H), (58, 48, 66)), canvas, light)

    shadow = hero.split()[3].point(lambda v: int(v * 0.55)).filter(ImageFilter.GaussianBlur(height * 0.05))
    canvas.paste(Image.new('RGB', hero.size, (0, 0, 0)),
                 (x + int(height * 0.04), y + int(height * 0.06)), shadow)

    halo = art.resize((int(hero.width * 1.4), int(hero.height * 1.4)), Image.LANCZOS)
    halo = halo.filter(ImageFilter.GaussianBlur(height * 0.10))
    halo.putalpha(halo.split()[3].point(lambda v: int(v * 0.70)))
    canvas.paste(halo, (CX - halo.width // 2, CY - halo.height // 2), halo)

    canvas.paste(hero, (x, y), hero)
    canvas.save(out, quality=88, optimize=True)
    return out


def luminance(path):
    return ImageStat.Stat(Image.open(path).convert('L')).mean[0]


def main():
    reference = luminance(SPLASH / 'bleed_grove.jpg')
    for name, src, height, contrast, brightness in PLATES:
        if not Path(src).exists():
            raise SystemExit(f'missing source art: {src}')
        out = build(SPLASH / name, src, height, contrast, brightness)
        mean = luminance(out)
        if not 0.6 * reference <= mean <= 1.6 * reference:
            out.unlink()
            raise SystemExit(
                f'{name}: mean luminance {mean:.0f} is not in the same night as bleed_grove.jpg '
                f'({reference:.0f}); the field is too bright or too black (0.6x-1.6x allowed)')
        size = Image.open(out).size
        print(f'{name}  {size[0]}x{size[1]}  mean {mean:.0f} (grove {reference:.0f})  '
              f'{out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
