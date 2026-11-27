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

  1. The room is one of the existing paintings, blurred to a smear and pulled down to 20 % — it is
     texture and depth, not a subject (nothing in it is legible at that blur). A pool of light, a
     fine grain and a vignette are added at full resolution, so the field itself is sharp everywhere
     the art is not.
  2. The artefact is upscaled in two steps (2x, sharpen, then the last resize) instead of one, which
     keeps painted edges from turning to mush; its alpha is thresholded first, because GGG's icons
     carry a near-invisible dark margin that reads as a box once the icon is brightened.
  3. It gets a contact shadow, a soft light under it, a blurred halo of itself and a faint
     reflection, so it sits in the room instead of floating in front of it.
  4. The artefact is centred on the point the frame's mask is centred on (52 % / 40 %), which is the
     open band — no card, no panel.

Sizes are chosen per source: never more than about 3x the original, so nothing is soft.

Sources are Grinding Gear Games' inventory art (item icons) and the Path of Exile wordmark;
`bleed_graveyard.jpg` is the room. It is a local design proposal, the same standing as the
paintings in assets/splash.

    /path/to/python tools/make_tab_plates.py

Needs Pillow. Writes five 1440 x 810 JPEGs into preview/assets/splash/.
"""

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'

W, H = 1440, 810
# where the frame's mask is centred — an artefact anywhere else is a smudge behind the cards
CX, CY = int(W * 0.52), int(H * 0.40)
CORNER = (4, 3, 6)

PLATES = [
    # tab                         source                       height  contrast  brightness
    ('tab_watchers_eye.jpg',      SRC / 'watchers_eye.png',      250,   1.22, 1.32),
    ('tab_rare_items.jpg',        SRC / 'two_stone_ring.webp',  250,   1.06, 1.00),
    ('tab_flasks.jpg',            SRC / 'divine_life_flask.webp', 300, 1.06, 1.02),
    ('tab_economy.jpg',           SRC / 'exalted_orb.png',      300,   1.03, 1.00),
    ('tab_settings.jpg',          SPLASH / 'logo_real.png',     360,   1.00, 0.92),
]


def clean(art, floor=14):
    """GGG's icons carry a near-invisible dark margin; once brightened it reads as a box."""
    art.putalpha(art.split()[3].point(lambda v: 0 if v < floor else v))
    return art


def room():
    """One of the paintings, blurred past legibility: texture and depth, no subject."""
    im = Image.open(SPLASH / 'bleed_graveyard.jpg').convert('RGB').resize((W, H), Image.LANCZOS)
    im = im.filter(ImageFilter.GaussianBlur(34))
    im = ImageEnhance.Brightness(im).enhance(0.20)
    im = ImageEnhance.Color(im).enhance(0.5)

    pool = Image.new('L', (W, H), 0)
    ImageDraw.Draw(pool).ellipse([CX - 620, CY - 330, CX + 620, CY + 330], fill=255)
    pool = pool.filter(ImageFilter.GaussianBlur(200)).point(lambda v: int(v * 0.45))
    im = Image.composite(Image.new('RGB', (W, H), (46, 38, 52)), im, pool)

    random.seed(9)
    grain = Image.new('L', (W // 3, H // 3))
    grain.putdata([random.randint(0, 255) for _ in range((W // 3) * (H // 3))])
    grain = grain.resize((W, H), Image.BILINEAR).point(lambda v: 128 + int((v - 128) * 0.07))
    im = Image.composite(Image.new('RGB', (W, H), (255, 255, 255)), im, grain)

    vignette = Image.new('L', (W, H), 0)
    ImageDraw.Draw(vignette).ellipse([-W * .2, -H * .3, W * 1.2, H * 1.3], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(140))
    return Image.composite(im, Image.new('RGB', (W, H), CORNER), vignette)


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
        [CX - height * 0.75, CY + height * 0.42, CX + height * 0.75, CY + height * 0.78], fill=110)
    light = light.filter(ImageFilter.GaussianBlur(height * 0.18))
    canvas = Image.composite(Image.new('RGB', (W, H), (60, 50, 64)), canvas, light)

    shadow = hero.split()[3].point(lambda v: int(v * 0.55)).filter(ImageFilter.GaussianBlur(height * 0.05))
    canvas.paste(Image.new('RGB', hero.size, (0, 0, 0)),
                 (x + int(height * 0.04), y + int(height * 0.06)), shadow)

    halo = art.resize((int(hero.width * 1.4), int(hero.height * 1.4)), Image.LANCZOS)
    halo = halo.filter(ImageFilter.GaussianBlur(height * 0.10))
    halo.putalpha(halo.split()[3].point(lambda v: int(v * 0.85)))
    canvas.paste(halo, (CX - halo.width // 2, CY - halo.height // 2), halo)

    reflection = hero.transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(8))
    reflection.putalpha(reflection.split()[3].point(lambda v: int(v * 0.13)))
    canvas.paste(reflection, (x, CY + hero.height // 2 + 6), reflection)

    canvas.paste(hero, (x, y), hero)
    canvas.save(out, quality=88, optimize=True)
    return out


def main():
    for name, src, height, contrast, brightness in PLATES:
        if not Path(src).exists():
            raise SystemExit(f'missing source art: {src}')
        out = build(SPLASH / name, src, height, contrast, brightness)
        size = Image.open(out).size
        print(f'{name}  {size[0]}x{size[1]}  {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
