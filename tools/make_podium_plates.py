#!/usr/bin/env python3
"""
Podium plates: a painted stage, with real Path of Exile 1 item art standing on it.

The split the review settled on:

  * the STAGE may be painted — an empty stone plinth in a dark room, the framing that reads best;
  * the ITEM is never painted — it is GGG's own art, used at 2x-3x its own size and no further, so
    nothing is invented and nothing is redrawn.

Each background arrives with an anchor: the fraction of the painting where the plinth's top surface
sits. The stage is cropped so that anchor lands in the open band, and the item is stood on it with a
contact shadow. Nothing else is added — no glow, no embers, no light of our own.

    /path/to/python tools/make_podium_plates.py

Needs Pillow. Writes 1920 x 1080 JPEGs into preview/assets/plates/podium/.
"""

from pathlib import Path

from PIL import Image, ImageFilter, ImageEnhance, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SPLASH = ROOT / 'preview' / 'assets' / 'splash'
SRC = SPLASH / 'src'
SEARCH = ROOT / 'image-search'
STAGE = ROOT / 'preview' / 'assets' / 'plates' / 'podium'

W, H = 1920, 1080
ANCHOR_Y = 0.62          # where the plinth top sits in the finished plate
SINK = 0.022             # the item's base sits this far below the plinth's back edge, so it rests on the surface
MAX_SCALE = 3.0

# real PoE1 item art
EYE = SRC / 'watchers_eye.png'
RING = SRC / 'two_stone_ring.webp'
ONYX = SEARCH / 'path-of-exile-unique-amulet-item-icon-ar-5.webp'
GLOVES = SEARCH / 'path-of-exile-rare-boots-gloves-helmet-i-1.webp'
EXALTED = SRC / 'exalted_orb.png'
MIRROR = SEARCH / 'path-of-exile-1-currency-orb-icons-png-m-2.png'
LIFE = SRC / 'divine_life_flask.webp'
GRANITE = SEARCH / 'path-of-exile-utility-flask-icons-granit-5.webp'
DIAMOND = SEARCH / 'path-of-exile-utility-flask-icons-granit-1.webp'

# background -> (anchor x, anchor y) of the plinth's top surface, as fractions of the painting
STAGES = {
    'bg-watchers-1.jpg': (0.440, 0.520),
    'bg-watchers-2.jpg': (0.470, 0.545),
    'bg-rare-1.jpg':     (0.330, 0.575),
    'bg-rare-2.jpg':     (0.450, 0.570),
    'bg-economy-1.jpg':  (0.300, 0.555),
    'bg-economy-2.jpg':  (0.680, 0.520),
    'bg-flasks-1.jpg':   (0.320, 0.600),
    'bg-flasks-2.jpg':   (0.470, 0.615),
}

# plate            stage                 zoom  [(item, scale)]
PLATES = [
    ('watchers-a.jpg', 'bg-watchers-1.jpg', 1.35, [(EYE, 3.0)]),
    ('watchers-b.jpg', 'bg-watchers-2.jpg', 1.30, [(EYE, 3.0)]),
    ('watchers-c.jpg', 'bg-watchers-1.jpg', 1.15, [(EYE, 2.0)]),
    ('rare-a.jpg',     'bg-rare-1.jpg',     1.35, [(RING, 3.0)]),
    ('rare-b.jpg',     'bg-rare-2.jpg',     1.30, [(RING, 3.0), (ONYX, 3.0)]),
    ('rare-c.jpg',     'bg-rare-1.jpg',     1.15, [(RING, 2.0), (ONYX, 2.0), (GLOVES, 1.5)]),
    ('economy-a.jpg',  'bg-economy-1.jpg',  1.35, [(EXALTED, 2.0)]),
    ('economy-b.jpg',  'bg-economy-2.jpg',  1.30, [(MIRROR, 2.0)]),
    ('economy-c.jpg',  'bg-economy-1.jpg',  1.15, [(EXALTED, 1.5), (MIRROR, 1.5)]),
    ('flasks-a.jpg',   'bg-flasks-1.jpg',   1.35, [(LIFE, 2.0)]),
    ('flasks-b.jpg',   'bg-flasks-2.jpg',   1.30, [(LIFE, 2.0), (GRANITE, 2.0), (DIAMOND, 2.0)]),
    ('flasks-c.jpg',   'bg-flasks-1.jpg',   1.15, [(LIFE, 2.5), (GRANITE, 2.5), (DIAMOND, 2.5)]),
]

_BASES = {}


def stage(name, zoom):
    """Crop the stage so its plinth anchor lands in the open band, centred horizontally if it can."""
    if name not in _BASES:
        _BASES[name] = Image.open(STAGE / name).convert('RGB').resize((W, H), Image.LANCZOS)
    im = _BASES[name]
    ax, ay = STAGES[name]
    w, h = round(W / zoom), round(H / zoom)
    left = min(max(round(ax * W - w / 2), 0), W - w)
    top = min(max(round(ay * H - ANCHOR_Y * h), 0), H - h)
    return im.crop((left, top, left + w, top + h)).resize((W, H), Image.LANCZOS), ax, ay, left, top, w, h


def load(path, scale):
    if scale > MAX_SCALE:
        raise SystemExit(f'{path.name}: {scale}x is past the {MAX_SCALE}x cap')
    art = Image.open(path).convert('RGBA')
    art.putalpha(art.split()[3].point(lambda v: 0 if v < 14 else v))
    if scale != 1.0:
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))),
                         Image.LANCZOS)
    return art


def build(plate, stage_name, zoom, items, out):
    canvas, ax, ay, left, top, w, h = stage(stage_name, zoom)
    # where the anchor ended up in the finished plate
    x0 = (ax * W - left) * (W / w)
    y0 = (ay * H - top) * (H / h)

    arts = [load(p, s) for p, s in items]
    gap = int(max(a.height for a in arts) * 0.55)
    total = sum(a.width for a in arts) + gap * (len(arts) - 1)
    x = int(x0) - total // 2
    for art in arts:
        y = int(y0 + SINK * H) - art.height
        pad = max(4, int(art.height * 0.06))
        shadow = Image.new('L', (art.width + pad * 2, art.height + pad * 2), 0)
        shadow.paste(art.split()[3], (pad, pad))
        shadow = (shadow.filter(ImageFilter.GaussianBlur(max(4, art.height * 0.045)))
                        .point(lambda v: int(v * .55)))
        canvas.paste(Image.new('RGB', shadow.size, (0, 0, 0)), (x - pad, y - pad + 3), shadow)
        canvas.paste(art, (x, y), art)
        x += art.width + gap

    canvas.save(out, quality=92, optimize=True)
    return out


def main():
    for plate, stage_name, zoom, items in PLATES:
        for path, _ in items:
            if not Path(path).exists():
                raise SystemExit(f'missing real art: {path}')
        out = build(plate, stage_name, zoom, items, STAGE / plate)
        mean = ImageStat.Stat(Image.open(out).convert('L')).mean[0]
        print(f'{plate:16s} {stage_name:18s} {zoom:.2f}x  mean {mean:5.1f}  '
              f'{out.stat().st_size // 1024:4d} KB')


if __name__ == '__main__':
    main()
