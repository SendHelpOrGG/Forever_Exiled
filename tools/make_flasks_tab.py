#!/usr/bin/env python3
"""
Flasks tab plate: the three supplied flasks set into the illustrated scene, then graded like every
other tab plate.

The flasks arrive on a black field with smoke and a floor shadow. They are not keyed by brightness
alone, because the smoke above them is as bright as the darker parts of the glass. The background is
instead defined by what it is made of — dark *and* colourless — and flood-filled in from the frame edge,
so the smoke, the floor and the shadows all go, while anything enclosed by the flasks (the dark green
inside a bottle) stays. A silver cap is kept because it is bright, not because it is green.

    /path/to/python tools/make_flasks_tab.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
TABS = ROOT / 'preview' / 'assets' / 'tabs'
SRC = TABS / 'src'
OUT = TABS / 'flasks.jpg'

W, H = 1920, 1080
DARK = 72          # luma at or below this is a candidate background
FLAT = 26          # ...if it is also this close to grey; saturated green is glass, not backdrop
BOTTLE_HEIGHT = 600
CENTRE = (960, 470)


def keyed_flasks():
    """The three bottles as RGBA.

    Three passes, because one is not enough:
      1. the glass is the only saturated thing in frame, so its green gives the body of each bottle;
      2. the metal caps are grey, so they are found by brightness, but only in the strip directly above
         a bottle — the mask is smeared upward and intersected with "bright", which takes the stopper
         and leaves the smoke alone;
      3. the silhouette is then made solid in the middle and feathered only at its rim by brightness,
         so the dark inside of a bottle is opaque instead of letting the painting show through.
    """
    img = Image.open(SRC / 'flasks.png').convert('RGB')
    w, h = img.size
    r, g, b = img.split()
    luma = img.convert('L')

    green = ImageChops.subtract(g, ImageChops.lighter(r, b)).point(lambda v: 255 if v > 16 else 0)
    q = 4
    body_q = green.resize((w // q, h // q), Image.BILINEAR)
    body_q = body_q.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))   # close the seams
    body = body_q.filter(ImageFilter.GaussianBlur(2)).resize((w, h), Image.BILINEAR)

    # the strip above each bottle: smear the body upward *and* widen it, because a stopper is wider
    # than the neck it sits on; the bright test then keeps the metal and drops the smoke
    reach = Image.new('L', body_q.size, 0)
    for dy in range(0, 58):
        reach.paste(body_q, (0, -dy), body_q)
    reach = reach.filter(ImageFilter.MaxFilter(11))

    luma_q = luma.resize(body_q.size, Image.BILINEAR)
    bright = luma_q.point(lambda v: 255 if v > 78 else 0).filter(ImageFilter.GaussianBlur(2))
    caps = ImageChops.multiply(reach, bright).resize((w, h), Image.BILINEAR)

    solid = ImageChops.lighter(body, caps).point(lambda v: 255 if v > 120 else 0)
    solid = fill_holes(solid)
    solid = solid.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    core = solid.filter(ImageFilter.MinFilter(7))   # keep thin parts: the stoppers are ~20 px
    edge = ImageChops.subtract(solid, core)
    ramp = luma.point(lambda v: 0 if v <= 12 else (255 if v >= 42 else int((v - 12) * 255 / 30)))
    alpha = ImageChops.lighter(core, ImageChops.multiply(edge, ramp))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.9))

    out = img.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(alpha.getbbox())


def fill_holes(mask):
    """Anything the silhouette encloses is part of it.

    Each bottle is a ring of green liquid around a metal emblem, and the emblem is neither green nor
    bright, so without this the middle of every bottle would be punched out and the painting would show
    through it.
    """
    w, h = mask.size
    q = 4
    small = mask.resize((w // q, h // q), Image.BILINEAR).point(lambda v: 255 if v > 128 else 0)
    sw, sh = small.size
    px = small.load()
    outside = Image.new('L', (sw, sh), 0)
    opx = outside.load()
    stack = [(x, 0) for x in range(sw)] + [(x, sh - 1) for x in range(sw)]
    stack += [(0, y) for y in range(sh)] + [(sw - 1, y) for y in range(sh)]
    while stack:
        sx, sy = stack.pop()
        if sx < 0 or sy < 0 or sx >= sw or sy >= sh or px[sx, sy] == 255 or opx[sx, sy] == 255:
            continue
        opx[sx, sy] = 255
        stack += [(sx + 1, sy), (sx - 1, sy), (sx, sy + 1), (sx, sy - 1)]
    holes = ImageChops.invert(ImageChops.lighter(outside, small))
    holes = holes.filter(ImageFilter.GaussianBlur(1)).resize((w, h), Image.BILINEAR)
    return ImageChops.lighter(mask, holes)


def scene():
    img = Image.open(SRC / 'flasks-scene.png').convert('RGB')
    # 1635×991 is a hair wider than 16:9: trim the height, not the width, so nothing is squeezed
    want = round(img.width * 9 / 16)
    if want <= img.height:
        top = (img.height - want) // 2
        img = img.crop((0, top, img.width, top + want))
    return img.resize((W, H), Image.LANCZOS)


def build():
    bg = scene()
    art = keyed_flasks()
    k = BOTTLE_HEIGHT / art.height
    art = art.resize((int(art.width * k), BOTTLE_HEIGHT), Image.LANCZOS)
    x = CENTRE[0] - art.width // 2
    y = CENTRE[1] - art.height // 2

    # the bottles are the only lit thing here, so they throw green onto the ink behind them first
    glow = Image.new('L', (W, H), 0)
    glow.paste(art.split()[3], (x, y))
    glow = glow.filter(ImageFilter.GaussianBlur(110)).point(lambda v: int(v * 0.42))
    green = Image.new('RGB', (W, H), (46, 132, 74))
    bg = ImageChops.screen(bg, Image.composite(green, Image.new('RGB', (W, H), (0, 0, 0)), glow))

    # and a little shade under them so they are not hanging in the air
    pad = int(art.width * 0.10)
    shadow = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(shadow)
    d.ellipse([x - pad, y + art.height - 34, x + art.width + pad, y + art.height + 52], fill=120)
    shadow = shadow.filter(ImageFilter.GaussianBlur(46))
    factor = shadow.point(lambda v: 255 - int(v * 0.85))
    bg = ImageChops.multiply(bg, Image.merge('RGB', (factor, factor, factor)))

    frame = bg.convert('RGBA')
    frame.alpha_composite(art, (x, y))
    return frame.convert('RGB')


def main():
    img = build()
    img.save(OUT, quality=92, optimize=True)
    print(f'{OUT} {img.size} {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
