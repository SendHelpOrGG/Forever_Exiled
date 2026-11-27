#!/usr/bin/env python3
"""
Build the per-tab plates for the design gallery (preview/designs/).

The gallery's frame gives every destination its own background, and the picture has to answer to the
tab's name: "Watcher's Eyes" is a unique jewel in Path of Exile, so the plate is that jewel — not a
painting of a monster. Four of the destinations are an item, and each plate is that item, enlarged
and graded; the fifth has no in-game artefact, so it carries the path of exile wordmark.

Each plate is composed here rather than cropped, because the source art is small:

  * the field is the study's field (#0a080d), the same dark the paintings sit on;
  * the artefact is upscaled with LANCZOS and an unsharp pass, then centred on the point the
    frame's mask is centred on (52 % / 40 %) so it lands in the open band, not under a card;
  * a blurred, oversized copy of the same art sits behind it at a third of the alpha, and a wide
    soft glow sits behind that — an icon scaled 4x needs depth, not just sharpness;
  * a vignette pulls the corners back to near-black so the layer never has an edge.

Sources are Grinding Gear Games' inventory art (item icons) and the Path of Exile wordmark; the
plates are a local design proposal, the same standing as the paintings in assets/splash.

    /path/to/python tools/make_tab_plates.py

Needs Pillow. Writes five 1440 x 810 JPEGs into preview/assets/splash/.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'

W, H = 1440, 810
# where the frame's mask is centred — an artefact anywhere else is a smudge behind the cards
CX, CY = int(W * 0.52), int(H * 0.40)
FIELD = (10, 8, 13)
CORNER = (4, 3, 6)

PLATES = [
    # tab                    source                     size  glow (rgb)       contrast / brightness
    ('tab_watchers_eye.jpg', SRC / 'watchers_eye.png',   400, (96, 74, 86), 1.18, 1.22),
    ('tab_rare_items.jpg',   SRC / 'two_stone_ring.webp', 300, (104, 78, 48), 1.08, 1.06),
    ('tab_flasks.jpg',       SRC / 'divine_life_flask.webp', 340, (96, 52, 52), 1.06, 1.05),
    ('tab_economy.jpg',      SRC / 'exalted_orb.png',    300, (104, 84, 44), 1.04, 1.00),
    ('tab_settings.jpg',     SPLASH / 'logo_real.png',   340, (78, 74, 88), 1.00, 0.80),
]


def scaled(art, height):
    factor = height / art.height
    return art.resize((max(1, round(art.width * factor)), height), Image.LANCZOS)


def build(out, src, height, glow, contrast, brightness):
    canvas = Image.new('RGB', (W, H), FIELD)
    art = Image.open(src).convert('RGBA')

    hero = scaled(art, height)
    hero = ImageEnhance.Contrast(hero).enhance(contrast)
    hero = ImageEnhance.Brightness(hero).enhance(brightness)
    hero = hero.filter(ImageFilter.UnsharpMask(radius=2.2, percent=80, threshold=2))

    halo = scaled(art, int(height * 1.75)).filter(ImageFilter.GaussianBlur(height * 0.08))
    halo.putalpha(halo.split()[3].point(lambda v: int(v * 0.34)))

    light = Image.new('L', (W, H), 0)
    ImageDraw.Draw(light).ellipse(
        [CX - height * 1.5, CY - height * 1.5, CX + height * 1.5, CY + height * 1.5], fill=92)
    light = light.filter(ImageFilter.GaussianBlur(height * 0.5))
    canvas = Image.composite(Image.new('RGB', (W, H), glow), canvas, light)

    canvas.paste(halo, (CX - halo.width // 2, CY - halo.height // 2), halo)
    canvas.paste(hero, (CX - hero.width // 2, CY - hero.height // 2), hero)

    vignette = Image.new('L', (W, H), 0)
    ImageDraw.Draw(vignette).ellipse([-W * .25, -H * .35, W * 1.25, H * 1.35], fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(120))
    canvas = Image.composite(canvas, Image.new('RGB', (W, H), CORNER), vignette)

    canvas.save(out, quality=90, optimize=True)
    return out


def main():
    for name, src, height, glow, contrast, brightness in PLATES:
        out = SPLASH / name
        if not Path(src).exists():
            raise SystemExit(f'missing source art: {src}')
        build(out, src, height, glow, contrast, brightness)
        print(f'{name}  {Image.open(out).size[0]}x{Image.open(out).size[1]}  {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
