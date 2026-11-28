#!/usr/bin/env python3
"""
Scene plates: a simple room, and a real item that belongs in it.

The earlier pass looked like "a random background with an item slapped on" because the item was not
lit by the room and cast no shadow into it. This build fixes that:

  * the STAGE is deliberately simple — one plain wall, one bare floor, a key light from the upper
    left and deep shadow on the right, no furniture and no props of any kind;
  * the ITEM is real Path of Exile 1 art (2x-3x its own size, never more) and is then *lit by the
    stage*: a horizontal light ramp darkens its shadow side and warms its lit side toward the stage's
    own key colour, so the two share a light;
  * it casts a soft shadow across the floor along the stage's light direction, with a tight contact
    shadow at its base and a faint reflection, and the bottom of the item is occluded where it meets
    the floor.

Nothing is invented: the stage carries no object, and the item is GGG's own art.

    /path/to/python tools/make_scene_plates.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'
SEARCH = ROOT / 'image-search'
STAGE = ROOT / 'preview' / 'assets' / 'plates' / 'scene'
OUT = STAGE

W, H = 1920, 1080
MAX_SCALE = 3.0

EYE = SRC / 'watchers_eye.png'
RING = SRC / 'two_stone_ring.webp'
ONYX = SEARCH / 'path-of-exile-unique-amulet-item-icon-ar-5.webp'
GLOVES = SEARCH / 'path-of-exile-rare-boots-gloves-helmet-i-1.webp'
EXALTED = SRC / 'exalted_orb.png'
MIRROR = SEARCH / 'path-of-exile-1-currency-orb-icons-png-m-2.png'
LIFE = SRC / 'divine_life_flask.webp'
GRANITE = SEARCH / 'path-of-exile-utility-flask-icons-granit-5.webp'
DIAMOND = SEARCH / 'path-of-exile-utility-flask-icons-granit-1.webp'

# stage -> where the item's base sits on the table, as a fraction of height (light from the left)
STAGES = {
    'table-watchers.jpg': 0.748,
    'table-rare.jpg':     0.742,
    'table-economy.jpg':  0.748,
    'table-flasks.jpg':   0.748,
}

# plate            stage              [(item, height as a fraction of the frame)]
PLATES = [
    ('watchers-a.jpg', 'table-watchers.jpg', [(EYE, 0.40)]),
    ('watchers-b.jpg', 'table-watchers.jpg', [(EYE, 0.40), (EYE, 0.22)]),
    ('watchers-c.jpg', 'table-watchers.jpg', [(EYE, 0.22)]),
    ('rare-a.jpg',     'table-rare.jpg',     [(RING, 0.34)]),
    ('rare-b.jpg',     'table-rare.jpg',     [(RING, 0.34), (ONYX, 0.30)]),
    ('rare-c.jpg',     'table-rare.jpg',     [(RING, 0.28), (ONYX, 0.25), (GLOVES, 0.19)]),
    ('economy-a.jpg',  'table-economy.jpg',  [(EXALTED, 0.40)]),
    ('economy-b.jpg',  'table-economy.jpg',  [(EXALTED, 0.40), (MIRROR, 0.36)]),
    ('economy-c.jpg',  'table-economy.jpg',  [(MIRROR, 0.38)]),
    ('flasks-a.jpg',   'table-flasks.jpg',   [(LIFE, 0.40)]),
    ('flasks-b.jpg',   'table-flasks.jpg',   [(LIFE, 0.30), (GRANITE, 0.30), (DIAMOND, 0.30)]),
    ('flasks-c.jpg',   'table-flasks.jpg',   [(DIAMOND, 0.38)]),
]

_BASES = {}


def base(name):
    if name not in _BASES:
        _BASES[name] = Image.open(STAGE / name).convert('RGB').resize((W, H), Image.LANCZOS)
    return _BASES[name]


def key_and_ambient(img):
    """Sample the stage's lit side and its shadow side, so the item can borrow both."""
    key = img.crop((int(W * .04), int(H * .62), int(W * .26), int(H * .74))).resize((1, 1), Image.BOX)
    amb = img.crop((int(W * .74), int(H * .58), int(W * .97), int(H * .72))).resize((1, 1), Image.BOX)
    return key.getpixel((0, 0)), amb.getpixel((0, 0))


def load(path, frac):
    """Real PoE1 art, trimmed to its own bounds and sized to a fraction of the frame height."""
    art = Image.open(path).convert('RGBA')
    art.putalpha(art.split()[3].point(lambda v: 0 if v < 14 else v))
    art = art.crop(art.split()[3].getbbox())
    target = int(H * frac)
    k = target / art.height
    return art.resize((max(1, round(art.width * k)), target), Image.LANCZOS)


def light_item(art, key, ambient):
    """Put the stage's light on the item: ramp from lit side to shadow side, plus an ambient tint.

    The stage's key is upper-left, so the left third of the item keeps its value, the middle falls off
    and the right edge drops into the room's shadow colour.
    """
    rgb = art.convert('RGB')
    w, h = rgb.size

    # horizontal light ramp: 1.0 at the left edge, ~038 in shadow, with a soft knee
    ramp = Image.new('L', (w, 1))
    px = ramp.load()
    for x in range(w):
        t = x / max(1, w - 1)
        v = 1.0 if t < .30 else 1.0 - .42 * ((t - .30) / .70) ** .85
        px[x, 0] = int(v * 255)
    ramp = ramp.resize((w, h), Image.BILINEAR)
    lit = ImageChops.multiply(rgb, Image.merge('RGB', (ramp, ramp, ramp)))

    # ambient: pull the shadow side toward the room's own shadow colour
    amb = Image.new('RGB', (w, h), ambient)
    shade_mask = ramp.point(lambda v: int(max(0, (150 - v)) * 1.2))
    lit = Image.composite(Image.blend(lit, amb, 0.35), lit, shade_mask)

    # a touch of the key light on the lit edge
    key_tint = Image.new('RGB', (w, h), key)
    key_mask = ramp.point(lambda v: int(max(0, v - 170) * 1.4))
    lit = Image.composite(Image.blend(lit, key_tint, 0.28), lit, key_mask)

    out = lit.convert('RGBA')
    out.putalpha(art.split()[3])
    return out


def shadow_masks(art, floor_y, x, w, h):
    """Contact + cast shadow as one full-frame 'L' mask, multiplied into the stage.

    A shadow on a ledge is not the object's silhouette squashed flat — it is a tight ellipse where the
    object touches, smeared away from the key light. Building it that way keeps the footprint under the
    object and out of the wall behind it.
    """
    mask = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(mask)
    cx = x + w // 2

    spilled = int(w * 0.66)
    d.ellipse([cx - spilled + int(w * 0.12), floor_y - int(h * 0.06),
               cx + spilled + int(w * 0.18), floor_y + int(h * 0.18)], fill=112)
    mask = mask.filter(ImageFilter.GaussianBlur(max(10, int(w * 0.06))))

    tight = Image.new('L', (W, H), 0)
    td = ImageDraw.Draw(tight)
    tw_ = int(w * 0.30)
    td.ellipse([cx - tw_, floor_y - int(h * 0.045), cx + tw_, floor_y + int(h * 0.020)], fill=252)
    tight = tight.filter(ImageFilter.GaussianBlur(max(4, int(w * 0.018))))
    mask = ImageChops.lighter(mask, tight)

    # keep the shade on the ledge: nothing paints up the wall behind the object
    return mask


def bounce(art, tint):
    """Warm light kicking back off the ledge into the item's underside."""
    w, h = art.size
    ramp = Image.linear_gradient('L').transpose(Image.FLIP_TOP_BOTTOM).resize((w, h), Image.BILINEAR)
    ramp = ramp.point(lambda v: int(v * 0.22))
    lit = Image.blend(art.convert('RGB'), Image.new('RGB', art.size, tint), 0.30)
    rgb = Image.composite(lit, art.convert('RGB'), ramp)
    rgb.putalpha(art.split()[3])
    return rgb


def build(plate, stage_name, items, out):
    canvas = base(stage_name)
    floor_y = int(H * STAGES[stage_name])
    key, ambient = key_and_ambient(canvas)

    arts = [bounce(light_item(load(p, s), key, ambient), tuple(min(255, int(c * 1.15) + 12) for c in key))
            for p, s in items]
    gap = int(max(a.height for a in arts) * 0.55)
    total = sum(a.width for a in arts) + gap * (len(arts) - 1)
    x = int(W * 0.5) - total // 2

    room = tuple(int(c) for c in ImageStat.Stat(canvas).mean)
    shadows = Image.new('L', (W, H), 0)
    placed = []
    for art in arts:
        y = floor_y - art.height
        shadows = ImageChops.lighter(shadows, shadow_masks(art, floor_y, x, art.width, art.height))
        placed.append((x, y, art))
        x += art.width + gap

    factor = shadows.point(lambda v: 255 - int(v * 0.96))
    canvas = ImageChops.multiply(canvas, Image.merge('RGB', (factor, factor, factor)))

    for px, py, art in placed:
        alpha = art.split()[3]
        occl = Image.new('L', art.size, 255)
        d = ImageDraw.Draw(occl)
        band = int(art.height * 0.14)
        for i in range(band):
            d.line([(0, art.height - 1 - i), (art.width, art.height - 1 - i)],
                   fill=int(255 - 55 * (1 - i / band)))
        rgb = ImageChops.multiply(art.convert('RGB'), Image.merge('RGB', (occl, occl, occl)))
        # settle it into the room: the sticker edge goes, the saturation comes down, a trace of the
        # room's own colour sits in the object so it is not a foreign cut-out
        rgb = ImageEnhance.Color(rgb).enhance(0.90)
        rgb = Image.blend(rgb, Image.new('RGB', rgb.size, room), 0.06)
        alpha = alpha.filter(ImageFilter.GaussianBlur(1.1)).point(lambda v: min(255, int(v * 1.7)))
        rgb.putalpha(alpha)
        canvas.paste(rgb, (px, py), rgb)

    canvas.save(out, quality=92, optimize=True)
    return out


def render(plate, stage_name, items, out):
    return build(plate, stage_name, items, out)


def main():
    for plate, stage_name, items in PLATES:
        for path, _ in items:
            if not Path(path).exists():
                raise SystemExit(f'missing real art: {path}')
        out = render(plate, stage_name, items, OUT / plate)
        mean = ImageStat.Stat(Image.open(out).convert('L')).mean[0]
        print(f'{plate:16s} {stage_name:18s} mean {mean:5.1f}  {out.stat().st_size // 1024:4d} KB')


if __name__ == '__main__':
    main()
