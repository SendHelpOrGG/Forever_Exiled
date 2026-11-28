#!/usr/bin/env python3
"""
Economy tab composite: the three golden faces lifted off their black field and set over the supplied
room photograph.

The faces are the only saturated thing in their frame — the smoke behind them is grey — so the cut is
made on saturation, not brightness, and the smoke is left behind instead of being carried over as a grey
cloud. Their own dark crevices are gold-tinted, so they survive the same test and the faces stay solid.

The background is small: 246×166. It is upscaled hard and left soft on purpose rather than being
sharpened into halo artefacts — at the size the tab shows it, through a mask and at 70 % opacity, it
reads as a dim room behind the faces.

    /path/to/python tools/make_economy_tab.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
TABS = ROOT / 'preview' / 'assets' / 'tabs'
SRC = TABS / 'src'
OUT = TABS / 'economy.jpg'

W, H = 1920, 1080
TARGET_W = 1150
CENTRE = (int(W * 0.52), int(H * 0.40))


def fill_holes(mask):
    """Anything the silhouette encloses is part of it — gold is not uniformly saturated: its speculars
    are near-white and its deepest shadows are dark bronze, and both would otherwise come out as holes
    with the photograph showing through the faces."""
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


def keyed_faces():
    img = Image.open(SRC / 'economy-faces.png').convert('RGB')
    r, g, b = img.split()
    top = ImageChops.lighter(ImageChops.lighter(r, g), b)
    low = ImageChops.darker(ImageChops.darker(r, g), b)
    sat = ImageChops.subtract(top, low)                       # 0 for the grey smoke and the black field

    # gold *or* bright: a polished face throws white speculars that carry almost no saturation at all,
    # and cutting on colour alone leaves them as holes
    gold = sat.point(lambda v: 255 if v > 22 else 0)
    bright = img.convert('L').point(lambda v: 255 if v > 68 else 0)
    mask = ImageChops.lighter(gold, bright)
    mask = mask.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))   # drop the speckles
    mask = fill_holes(mask)
    mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))    # close the rim
    mask = mask.filter(ImageFilter.GaussianBlur(1.3))

    out = img.convert('RGBA')
    out.putalpha(mask)
    return out.crop(mask.getbbox())


def scene():
    img = Image.open(SRC / 'economy-scene.png').convert('RGB')
    # 246×166 is far from 16:9: match the width, then keep the upper part of the frame so the head sits
    # where it should rather than sliding into the middle band
    k = W / img.width
    img = img.resize((W, int(img.height * k)), Image.LANCZOS)
    top = int((img.height - H) * 0.35) if img.height > H else 0
    img = img.crop((0, top, W, top + H))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    return ImageEnhance.Brightness(img).enhance(0.9)


def build():
    bg = scene()
    art = keyed_faces()
    k = TARGET_W / art.width
    art = art.resize((TARGET_W, int(art.height * k)), Image.LANCZOS)
    x = CENTRE[0] - art.width // 2
    y = CENTRE[1] - art.height // 2

    glow = Image.new('L', (W, H), 0)
    glow.paste(art.split()[3], (x, y))
    glow = glow.filter(ImageFilter.GaussianBlur(120)).point(lambda v: int(v * 0.40))
    gold = Image.new('RGB', (W, H), (150, 108, 40))
    bg = ImageChops.screen(bg, Image.composite(gold, Image.new('RGB', (W, H), (0, 0, 0)), glow))

    frame = bg.convert('RGBA')
    frame.alpha_composite(art, (x, y))
    return frame.convert('RGB')


def main():
    img = build()
    img.save(OUT, quality=92, optimize=True)
    print(f'{OUT} {img.size} {OUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
