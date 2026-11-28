#!/usr/bin/env python3
"""
Black podium plates: one simple podium in a black void, one real item standing on it, smoke kept.

Same rule as before — the stage is painted, the item never is — but the room is gone. What is left is
a plinth under a single key light with the smoke that was already drifting round its base, and the item
set down on the plinth's top face.

The plinth's geometry is measured off the painting rather than guessed: on a black field the podium is
the only lit thing, so its top edge and its front lip are easy to find, and the item is seated between
them instead of floating in front of them.

    /path/to/python tools/make_black_podium_plates.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'
SEARCH = ROOT / 'image-search'
STAGE = ROOT / 'preview' / 'assets' / 'plates' / 'black'
OUT = STAGE

W, H = 1920, 1080

EYE = SRC / 'watchers_eye.png'
RING = SRC / 'two_stone_ring.webp'
ONYX = SEARCH / 'path-of-exile-unique-amulet-item-icon-ar-5.webp'
GLOVES = SEARCH / 'path-of-exile-rare-boots-gloves-helmet-i-1.webp'
EXALTED = SRC / 'exalted_orb.png'
MIRROR = SEARCH / 'path-of-exile-1-currency-orb-icons-png-m-2.png'
LIFE = SRC / 'divine_life_flask.webp'
GRANITE = SEARCH / 'path-of-exile-utility-flask-icons-granit-5.webp'
DIAMOND = SEARCH / 'path-of-exile-utility-flask-icons-granit-1.webp'

STAGES = {
    'watchers': 'podium-watchers.jpg',
    'rare': 'podium-rare.jpg',
    'economy': 'podium-economy.jpg',
    'flasks': 'podium-flasks.jpg',
}

# where each podium's top face meets its front lip, as a fraction of frame height (measured off the art)
SEATS = {'watchers': 0.565, 'rare': 0.495, 'economy': 0.478, 'flasks': 0.497}

# plate            tab          [(item, height as a fraction of the frame)]
PLATES = [
    ('watchers-a.jpg', 'watchers', [(EYE, 0.38)]),
    ('watchers-b.jpg', 'watchers', [(EYE, 0.38), (EYE, 0.21)]),
    ('watchers-c.jpg', 'watchers', [(EYE, 0.21)]),
    ('rare-a.jpg',     'rare',     [(RING, 0.32)]),
    ('rare-b.jpg',     'rare',     [(RING, 0.32), (ONYX, 0.28)]),
    ('rare-c.jpg',     'rare',     [(RING, 0.26), (ONYX, 0.23), (GLOVES, 0.18)]),
    ('economy-a.jpg',  'economy',  [(EXALTED, 0.38)]),
    ('economy-b.jpg',  'economy',  [(EXALTED, 0.38), (MIRROR, 0.34)]),
    ('economy-c.jpg',  'economy',  [(MIRROR, 0.36)]),
    ('flasks-a.jpg',   'flasks',   [(LIFE, 0.38)]),
    ('flasks-b.jpg',   'flasks',   [(LIFE, 0.28), (GRANITE, 0.28), (DIAMOND, 0.28)]),
    ('flasks-c.jpg',   'flasks',   [(DIAMOND, 0.36)]),
]

_BASES = {}
_GEOM = {}


def base(tab):
    return centred_base(tab)[0]


def celery_centre(img, seat):
    """The podium's top face is the only lit thing on this row; its run of bright pixels gives the centre."""
    px = img.convert('L').load()
    row = int(seat - 26)
    xs = [x for x in range(W) if px[x, row] > 55]
    if not xs:
        return W // 2, 0, W
    return (min(xs) + max(xs)) // 2, min(xs), max(xs)


def centred_base(tab):
    """Podium stage, shifted on its own black field so the podium stands dead centre."""
    if tab in _BASES:
        return _BASES[tab]
    src = Image.open(STAGE / STAGES[tab]).convert('RGB').resize((W, H), Image.LANCZOS)
    seat = int(H * SEATS[tab])
    cx, x0, x1 = celery_centre(src, seat)
    dx = W // 2 - cx
    out = Image.new('RGB', (W, H), (0, 0, 0))
    out.paste(src, (dx, 0))
    _BASES[tab] = (out, {'seat': seat, 'x0': x0 + dx, 'x1': x1 + dx})
    return _BASES[tab]


def key_and_ambient(img, geo):
    """Sample the podium's own light: the lit part of the top face, and its shadowed side."""
    x0, x1, seat = geo['x0'], geo['x1'], geo['seat']
    span = max(1, x1 - x0)
    top = max(0, seat - 46)
    key = img.crop((x0 + int(span * 0.10), top, x0 + int(span * 0.38), seat)).resize((1, 1), Image.BOX).getpixel((0, 0))
    amb = img.crop((x0 + int(span * 0.70), top, x0 + int(span * 0.95), seat)).resize((1, 1), Image.BOX).getpixel((0, 0))
    return key, amb


def load(path, frac):
    art = Image.open(path).convert('RGBA')
    art.putalpha(art.split()[3].point(lambda v: 0 if v < 14 else v))
    art = art.crop(art.split()[3].getbbox())
    target = int(H * frac)
    k = target / art.height
    return art.resize((max(1, round(art.width * k)), target), Image.LANCZOS)


def light_item(art, key, ambient):
    """Light the object with the podium's key: bright toward the light, cooled on the shadow side."""
    rgb = art.convert('RGB')
    w, h = rgb.size
    ramp = Image.linear_gradient('L').resize((w, h), Image.BILINEAR)
    shade = ramp.point(lambda v: int(v * 0.42))
    warm = Image.blend(rgb, Image.new('RGB', rgb.size, key), 0.26)
    cool = Image.blend(rgb, Image.new('RGB', rgb.size, ambient), 0.34)
    lit = Image.composite(cool, warm, shade)
    lit.putalpha(art.split()[3])
    return lit


def bounce(art, tint):
    w, h = art.size
    ramp = Image.linear_gradient('L').transpose(Image.FLIP_TOP_BOTTOM).resize((w, h), Image.BILINEAR)
    ramp = ramp.point(lambda v: int(v * 0.18))
    lit = Image.blend(art.convert('RGB'), Image.new('RGB', art.size, tint), 0.28)
    rgb = Image.composite(lit, art.convert('RGB'), ramp)
    rgb.putalpha(art.split()[3])
    return rgb


def shadow_masks(art, seat, x, w, h, geo):
    """Contact shadow on the podium's top face, cast shadow falling to the right and to the front."""
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    cx = x + w // 2
    depth = max(30, int(H * 0.05))  # how much of the top face a shadow can spread over

    spilled = int(w * 0.60)
    d.ellipse([cx - spilled + int(w * 0.16), seat - int(depth * 0.35),
               cx + spilled + int(w * 0.22), seat + int(depth * 0.75)], fill=120)
    mask = mask.filter(ImageFilter.GaussianBlur(max(10, int(w * 0.055))))

    tight = Image.new('L', (W, H), 0)
    td = ImageDraw.Draw(tight)
    tw_ = int(w * 0.32)
    td.ellipse([cx - tw_ + int(w * 0.03), seat - int(h * 0.022),
                cx + tw_ + int(w * 0.05), seat + int(h * 0.018)], fill=250)
    tight = tight.filter(ImageFilter.GaussianBlur(max(4, int(w * 0.016))))
    return ImageChops.lighter(mask, tight)


def build(plate, tab, items, out):
    canvas, geo = centred_base(tab)
    key, ambient = key_and_ambient(canvas, geo)
    seat = geo['seat']

    arts = [bounce(light_item(load(p, s), key, ambient),
                  tuple(min(255, int(c * 1.20) + 10) for c in key)) for p, s in items]

    # nothing may hang off the podium: the group has to fit the top face it is standing on
    avail = int((geo['x1'] - geo['x0']) * 0.84)
    for _ in range(12):
        gap = int(max(a.height for a in arts) * 0.55)
        total = sum(a.width for a in arts) + gap * (len(arts) - 1)
        if total <= avail:
            break
        k = avail / total * 0.98
        arts = [a.resize((max(1, int(a.width * k)), max(1, int(a.height * k))), Image.LANCZOS) for a in arts]
    x = int(W * 0.5) - total // 2

    shadows = Image.new('L', (W, H), 0)
    placed = []
    for art in arts:
        shadows = ImageChops.lighter(shadows, shadow_masks(art, seat, x, art.width, art.height, geo))
        placed.append((x, seat - art.height, art))
        x += art.width + gap

    factor = shadows.point(lambda v: 255 - int(v * 0.94))
    canvas = ImageChops.multiply(canvas, Image.merge('RGB', (factor, factor, factor)))

    plinth = tuple(int(c) for c in ImageStat.Stat(canvas.crop((geo['x0'], max(0, seat - 46), geo['x1'], seat))).mean)
    for px_, py_, art in placed:
        alpha = art.split()[3]
        occl = Image.new('L', art.size, 255)
        d = ImageDraw.Draw(occl)
        band = int(art.height * 0.12)
        for i in range(band):
            d.line([(0, art.height - 1 - i), (art.width, art.height - 1 - i)],
                   fill=int(255 - 50 * (1 - i / band)))
        rgb = ImageChops.multiply(art.convert('RGB'), Image.merge('RGB', (occl, occl, occl)))
        rgb = ImageEnhance.Color(rgb).enhance(0.92)
        rgb = Image.blend(rgb, Image.new('RGB', rgb.size, plinth), 0.05)
        alpha = alpha.filter(ImageFilter.GaussianBlur(1.1)).point(lambda v: min(255, int(v * 1.7)))
        rgb.putalpha(alpha)
        canvas.paste(rgb, (px_, py_), rgb)

    canvas.save(out, quality=92, optimize=True)
    return out, geo


def main():
    for plate, tab, items in PLATES:
        out, geo = build(plate, tab, items, OUT / plate)
        img = Image.open(out)
        mean = ImageStat.Stat(img.convert('L')).mean[0]
        print(f'{plate:16s} {STAGES[tab]:22s} seat {geo["seat"]:4d}  mean {mean:5.1f}  {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
